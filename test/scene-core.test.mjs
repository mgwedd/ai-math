/* Scene Kit core — headless tests (Vitest, node env).

   Proves the CONTRACT.md invariants that don't need a GPU:
   - params: one-way flow, equal-write is a no-op, snapshot/view.
   - entities: constructors are PURE (no DOM/GPU) and headless-evaluable.
   - diff: keyed add/update/remove, kind-change -> remove+add.
   - driver: dirty-flag (loop runs only while a source/request lives),
     source-before-render ordering, dt clamp, pause/resume.
   - registry: registerScene shape validation + idempotency; validateScenes
     baseline eval + kind/handle checks.
   - scene runtime: mountScene wires params->entities->diff->backend against
     a headless null backend; a param write drives a re-render. */
import { describe, it, expect, vi } from 'vitest';
import {
  param, vec, view, snapshot, toAtoms, makeRng,
  grid, vector, point, segment, label, polygon, angleArc,
  diff, createFrameDriver, createSpace, createNullBackend,
  registerScene, validateScenes, SCENES, mountScene, goal, visited, handle,
} from '../lib/scene/index.js';
import { arcSweep } from '../lib/scene/renderer/draw.js';

/* ---- a mock 'pixi.js' so the Pixi backend's singleton + context-loss listener
   lifecycle can be exercised in the node env (no real WebGL). Only the surface
   createPixiBackend()/getApp() touch is stubbed; the canvas tracks its own live
   listener count so leak-on-remount is directly observable. ---- */
vi.mock('pixi.js', () => {
  class Graphics {
    clear(){ return this; } moveTo(){ return this; } lineTo(){ return this; }
    arc(){ return this; } stroke(){ return this; } fill(){ return this; }
    circle(){ return this; } rect(){ return this; } poly(){ return this; } destroy(){}
  }
  class Container {
    constructor(){ this.children = []; this.parent = null; }
    addChild(c){ this.children.push(c); if(c) c.parent = this; return c; }
    removeChild(c){ this.children = this.children.filter(x => x !== c); if(c) c.parent = null; return c; }
    destroy(){}
  }
  class Text { constructor(o){ this.text = o && o.text; this.anchor = { set(){} }; this.x = 0; this.y = 0; } destroy(){} }
  class TextStyle { constructor(o){ Object.assign(this, o || {}); } }
  function makeCanvas(){
    const handlers = {};
    return {
      _count: 0, parentNode: null,
      addEventListener(type, fn){ (handlers[type] || (handlers[type] = new Set())).add(fn); this._count++; },
      removeEventListener(type, fn){ if(handlers[type] && handlers[type].delete(fn)) this._count--; },
      _emit(type, e){ if(handlers[type]) for(const fn of [...handlers[type]]) fn(e || { preventDefault(){} }); },
    };
  }
  class Application {
    constructor(){ this.stage = new Container(); this.destroyed = false; }
    async init(){ this.canvas = makeCanvas(); this.renderer = { type: 'webgl', resolution: 1, resize(){} }; }
    destroy(){ this.destroyed = true; this.canvas = null; }
  }
  return { Application, Container, Graphics, Text, TextStyle };
});

/* ---- a controllable rAF so driver tests are deterministic (no real clock) ---- */
function fakeRaf(){
  let q = [], id = 0, now = 0;
  return {
    raf: (cb) => { q.push({ id: ++id, cb }); return id; },
    caf: (x) => { q = q.filter(j => j.id !== x); },
    /** advance by ms and flush exactly one frame's worth of callbacks */
    tick(ms){ now += ms; const due = q; q = []; due.forEach(j => j.cb(now)); },
    pending(){ return q.length; },
  };
}

describe('params', () => {
  it('set notifies; equal write is a no-op', () => {
    const a = param(1); let n = 0;
    a.subscribe(() => n++);
    a.set(2); expect(a.get()).toBe(2); expect(n).toBe(1);
    a.set(2); expect(n).toBe(1);                 // equal scalar -> no notify
  });
  it('vec equality is shallow x/y', () => {
    const a = param(vec(1, 2)); let n = 0; a.subscribe(() => n++);
    a.set(vec(1, 2)); expect(n).toBe(0);
    a.set(vec(1, 3)); expect(n).toBe(1);
  });
  it('view yields raw values; snapshot is a plain object', () => {
    const atoms = toAtoms({ a: vec(2, 1), k: 0.5 });
    const p = view(atoms);
    expect(p.a).toEqual({ x: 2, y: 1 }); expect(p.k).toBe(0.5);
    expect(snapshot(atoms)).toEqual({ a: { x: 2, y: 1 }, k: 0.5 });
  });
});

describe('entities are pure descriptors', () => {
  it('return plain data, no DOM/GPU access', () => {
    const v = vector(vec(2, 1), { color: 'accent', label: 'a', handle: 'a' });
    expect(v).toMatchObject({ kind: 'vector', color: 'accent', label: 'a', handle: 'a' });
    expect(grid().kind).toBe('grid');
    expect(point(vec(0, 0)).kind).toBe('point');
    expect(typeof label(() => 'x').text).toBe('function');
  });
});

describe('diff', () => {
  it('emits add / update / remove keyed', () => {
    const A = [vector(vec(1, 0), { key: 'a' })];
    const B = [vector(vec(2, 0), { key: 'a' }), point(vec(0, 0), { key: 'b' })];
    const ops = diff(A, B);
    expect(ops.find(o => o.type === 'add' && o.key === 'b')).toBeTruthy();
    const upd = ops.find(o => o.type === 'update' && o.key === 'a');
    expect(upd.changed).toContain('v');
    expect(diff(B, A).find(o => o.type === 'remove' && o.key === 'b')).toBeTruthy();
  });
  it('unchanged entity emits no op', () => {
    const A = [grid({ key: 'g' })];
    expect(diff(A, [grid({ key: 'g' })])).toEqual([]);
  });
  it('kind change at same key -> remove + add', () => {
    const ops = diff([vector(vec(1, 0), { key: 'x' })], [point(vec(1, 0), { key: 'x' })]);
    expect(ops.map(o => o.type)).toEqual(['remove', 'add']);
  });
});

describe('frame driver (dirty-flag + ordering)', () => {
  it('requestFrame runs exactly one render then stops', () => {
    const f = fakeRaf(); let renders = 0;
    const d = createFrameDriver({ render: () => renders++, raf: f.raf, caf: f.caf });
    expect(f.pending()).toBe(0);                 // idle: no loop
    d.requestFrame(); expect(f.pending()).toBe(1);
    f.tick(16); expect(renders).toBe(1);
    expect(f.pending()).toBe(0);                 // stops (no source, no request)
  });
  it('a source keeps the loop alive and runs BEFORE render; release stops it', () => {
    const f = fakeRaf(); const order = [];
    const d = createFrameDriver({ render: () => order.push('render'), raf: f.raf, caf: f.caf });
    const h = d.addSource(() => order.push('source'));
    f.tick(16); f.tick(16);
    expect(order).toEqual(['source', 'render', 'source', 'render']);
    h.release(); f.tick(16);                      // last queued frame runs, then stops
    expect(f.pending()).toBe(0);
  });
  it('dt is clamped to <= 1/15 s', () => {
    const f = fakeRaf(); let seen = null;
    const d = createFrameDriver({ render: (t, dt) => { seen = dt; }, raf: f.raf, caf: f.caf });
    d.addSource(() => {});
    f.tick(16);                 // first frame dt=0
    f.tick(5000);               // huge stall
    expect(seen).toBeLessThanOrEqual(1 / 15 + 1e-9);
  });
  it('pause halts frames; resume continues', () => {
    const f = fakeRaf(); let renders = 0;
    const d = createFrameDriver({ render: () => renders++, raf: f.raf, caf: f.caf });
    d.addSource(() => {});
    f.tick(16); expect(renders).toBe(1);
    d.pause(); f.tick(16); expect(renders).toBe(1);
    d.resume(); f.tick(16); expect(renders).toBe(2);
  });
});

describe('plane2 space', () => {
  it('toWorld inverts toScreen; origin centered, y-up', () => {
    const s = createSpace('plane2', { extent: 5 }).resize(400, 400, 1);
    const o = s.toScreen(vec(0, 0));
    expect(o).toEqual({ px: 200, py: 200 });
    const up = s.toScreen(vec(0, 1));
    expect(up.py).toBeLessThan(200);             // +y is UP on screen
    const rt = s.toWorld({ px: 240, py: 200 });
    expect(rt.x).toBeCloseTo(1, 6); expect(rt.y).toBeCloseTo(0, 6);
  });
});

describe('registry', () => {
  const mk = (id, over) => Object.assign({
    id, space: 'plane2', params: { a: vec(2, 1) },
    entities: (p) => [grid(), vector(p.a, { handle: 'a' })],
  }, over);

  it('registerScene validates shape and is idempotent by id', () => {
    registerScene(mk('t.one'));
    registerScene(mk('t.one'));                  // replace in place
    expect(SCENES.filter(s => s.id === 't.one').length).toBe(1);
    expect(() => registerScene({ id: 't.bad', space: 'nope', entities: () => [] }))
      .toThrow(/t\.bad/);
  });
  it('validateScenes runs headless baseline eval and flags bad kinds/handles', () => {
    registerScene(mk('t.ok'));
    registerScene(mk('t.badkind', { entities: () => [{ kind: 'nope' }] }));
    registerScene(mk('t.badhandle', { entities: () => [grid({ handle: 'a' })] }));
    const problems = validateScenes();
    expect(problems.some(m => m.includes('t.badkind'))).toBe(true);
    expect(problems.some(m => m.includes('t.badhandle') && m.includes('does not accept'))).toBe(true);
    expect(problems.some(m => m.includes('t.ok'))).toBe(false);
  });
});

describe('scene runtime (headless null backend, injected rAF)', () => {
  it('renders baseline then re-renders on a param write via the real pipeline', async () => {
    const be = createNullBackend(), f = fakeRaf();
    const spec = {
      id: 'rt.demo', space: 'plane2', params: { a: vec(2, 1) },
      entities: (p) => [grid({ key: 'g' }), vector(p.a, { key: 'v', handle: 'a' })],
    };
    const c = await mountScene(spec, null, { backend: be, raf: f.raf, caf: f.caf });
    f.tick(16);                                   // baseline frame (mountScene requested it)
    expect(be._objects.get('v').v).toEqual({ x: 2, y: 1 });
    c.params.a.set(vec(3, 3));                     // one-way flow schedules a frame
    f.tick(16);
    expect(be._objects.get('v').v).toEqual({ x: 3, y: 3 });
    c.destroy();
  });

  it("label(at:'readout') is split to the readout sink, not the backend", async () => {
    const be = createNullBackend(), f = fakeRaf(); const reads = [];
    const spec = {
      id: 'rt.readout', space: 'plane2', params: { k: 2 },
      entities: (p) => [point(vec(0, 0), { key: 'p' }), label(() => 'k=' + p.k, { at: 'readout' })],
    };
    const c = await mountScene(spec, null, { backend: be, raf: f.raf, caf: f.caf, hooks: { onReadout: (xs) => reads.push(xs) } });
    f.tick(16);
    expect([...be._objects.keys()]).toEqual(['p']);       // canvas got only the point
    expect(reads.at(-1)).toEqual(['k=2']);                // readout got the label text
    c.destroy();
  });

  it("space:'free' yields a null space and never needs a Pixi backend", async () => {
    const spec = { id: 'rt.free', space: 'free', params: {}, entities: () => [] };
    const c = await mountScene(spec, null, {});          // no backend injected
    expect(c.space).toBe(null);
    c.destroy();
  });
});

describe('v1.1 capstone reroll', () => {
  it('vec() returns a PLAIN literal (no class prototype)', () => {
    const v = vec(1, 2);
    expect(Object.getPrototypeOf(v)).toBe(Object.prototype);
  });
  it('newAttempt(seed) is deterministic and flows through the atoms', async () => {
    const be = createNullBackend(), f = fakeRaf();
    const spec = {
      id: 'rt.capstone', space: 'plane2', params: { a: vec(0, 0) },
      randomize: (rng) => ({ a: vec(rng() * 4 - 2, rng() * 4 - 2) }),
      entities: (p) => [vector(p.a, { key: 'v', handle: 'a' })],
    };
    const c1 = await mountScene(spec, null, { backend: be, raf: f.raf, caf: f.caf });
    const s1 = c1.newAttempt(42);
    const c2 = await mountScene(spec, null, { backend: createNullBackend(), raf: f.raf, caf: f.caf });
    const s2 = c2.newAttempt(42);
    expect(s1.a).toEqual(s2.a);                            // same seed -> same reroll
    expect(c2.newAttempt(7).a).not.toEqual(s1.a);          // different seed -> different
    expect(c1.params.a.get()).toEqual(s1.a);               // written through the atom
    c1.destroy(); c2.destroy();
  });
  it('registerScene rejects a non-function randomize', () => {
    expect(() => registerScene({ id: 'rt.badrng', space: 'plane2', entities: () => [], randomize: 5 }))
      .toThrow(/randomize/);
  });
});

describe('v1.2 visited() goal type', () => {
  const base = { id: 'v12.v', space: 'plane2', params: {}, entities: () => [] };
  it('builds the frozen descriptor; required defaults to keys.length', () => {
    const g = visited('Try both modes', s => s.mode, { keys: ['a', 'b'], xp: 20, tag: 'modes' });
    expect(g).toMatchObject({ type: 'visited', required: 2, keys: ['a', 'b'], xp: 20, tag: 'modes' });
  });
  it('REJECTS required=0/undefined (instant-complete bug) at registration', () => {
    // no keys, no required -> required stays undefined -> must throw
    expect(() => registerScene({ ...base, goals: [visited('x', s => s.m, { xp: 10 })] }))
      .toThrow(/required/);
    expect(() => registerScene({ ...base, goals: [visited('x', s => s.m, { xp: 10, required: 0 })] }))
      .toThrow(/required/);
    expect(() => registerScene({ ...base, goals: [visited('x', s => s.m, { xp: 10, required: 3, keys: ['a'] })] }))
      .toThrow(/exceeds/);
  });
  it('accepts a valid visited goal (required explicit or via keys)', () => {
    registerScene({ ...base, id: 'v12.ok', goals: [visited('x', s => s.m, { xp: 10, required: 2 })] });
    registerScene({ ...base, id: 'v12.ok2', goals: [visited('x', s => s.m, { xp: 10, keys: ['a', 'b', 'c'] })] });
  });
});

describe('v1.2 learner-input gate seam', () => {
  it('hasLearnerInput false at mount, true after mark, RESET by newAttempt', async () => {
    const c = await mountScene(
      { id: 'v12.gate', space: 'plane2', params: { a: vec(1, 0) },
        randomize: (rng) => ({ a: vec(rng(), rng()) }),
        entities: (p) => [vector(p.a, { key: 'v' })] },
      null, { backend: createNullBackend() });
    expect(c.hasLearnerInput()).toBe(false);          // mount tween could run here — no credit possible
    c.markLearnerInput();
    expect(c.hasLearnerInput()).toBe(true);
    c.newAttempt(1);
    expect(c.hasLearnerInput()).toBe(false);          // fresh capstone attempt requires fresh input
    c.destroy();
  });
});

/* ============================ RE-RELEASE FIXES ============================ */

describe('makeRng respects an explicit seed 0 (falsy-default bug)', () => {
  it('makeRng(0) is deterministic and DISTINCT from makeRng(1)', () => {
    const a0 = makeRng(0), b0 = makeRng(0);
    const seqA = [a0(), a0(), a0()], seqB = [b0(), b0(), b0()];
    expect(seqA).toEqual(seqB);                        // same explicit seed -> same stream
    expect(makeRng(0)()).not.toBe(makeRng(1)());       // seed 0 honored, not swapped for the constant/seed-1 stream
    expect(seqA.every(x => x >= 0 && x < 1)).toBe(true);
  });
});

describe('diff rejects duplicate entity keys (authoring error is loud)', () => {
  it('throws naming the offending key', () => {
    const dup = [point(vec(0, 0), { key: 'p' }), point(vec(1, 1), { key: 'p' })];
    expect(() => diff([], dup)).toThrow(/duplicate entity key `p`/);
  });
  it('distinct keys still diff cleanly', () => {
    const ok = [point(vec(0, 0), { key: 'a' }), point(vec(1, 1), { key: 'b' })];
    expect(diff([], ok).map(o => o.type)).toEqual(['add', 'add']);
  });
});

describe('grid() rejects loop-hanging step/extent', () => {
  it('throws on negative, zero, or non-finite step', () => {
    expect(() => grid({ step: -1 })).toThrow(/step/);
    expect(() => grid({ step: 0 })).toThrow(/step/);
    expect(() => grid({ step: Infinity })).toThrow(/step/);
  });
  it('throws on a non-finite extent', () => {
    expect(() => grid({ extent: Infinity })).toThrow(/extent/);
  });
  it('accepts sane defaults', () => {
    expect(grid().step).toBe(1); expect(grid({ step: 0.5, extent: 4 }).extent).toBe(4);
  });
});

describe('plane2 resize guards degenerate dimensions (no NaN)', () => {
  it('resize(0,0) is a no-op that keeps the last good layout', () => {
    const s = createSpace('plane2', { extent: 5 }).resize(400, 400, 1);
    s.resize(0, 0, 1);                                 // degenerate — must not poison scale
    const o = s.toScreen(vec(0, 0)), w = s.toWorld({ px: 240, py: 200 });
    expect(Number.isFinite(o.px) && Number.isFinite(o.py)).toBe(true);
    expect(Number.isFinite(w.x) && Number.isFinite(w.y)).toBe(true);
    expect(o).toEqual({ px: 200, py: 200 });           // retained 400x400 layout
    const b = s.bounds();
    expect(Object.values(b).every(Number.isFinite)).toBe(true);
  });
});

describe('null backend does not grow op history unbounded (prod free-run)', () => {
  it('records ops only when { record:true }', () => {
    const off = createNullBackend();
    const on = createNullBackend({ record: true });
    const ops = diff([], [point(vec(0, 0), { key: 'p' })]);
    off.apply(ops); on.apply(ops);
    expect(off._applied.length).toBe(0);               // default: no unbounded history
    expect(on._applied.length).toBe(1);                // opt-in introspection still works
    expect(off._objects.get('p')).toBeTruthy();        // display-list mirror is unaffected
  });
});

describe('angleArc draws the MINOR arc, never the reflex one', () => {
  it('arcSweep normalizes to (-pi, pi] so |sweep| <= pi', () => {
    expect(arcSweep(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2, 9);
    expect(Math.abs(arcSweep(0, 1.75 * Math.PI))).toBeLessThanOrEqual(Math.PI + 1e-9); // 315deg -> -45deg
    expect(arcSweep(0, 1.75 * Math.PI)).toBeCloseTo(-Math.PI / 4, 9);
    expect(Math.abs(arcSweep(-3, 3))).toBeLessThanOrEqual(Math.PI + 1e-9);             // wrap across pi
  });
});

describe('mountScene backend detection: factory vs instance (defect 14)', () => {
  // A minimal recording backend + a factory that tracks how many it made.
  function recordingBackend(){
    const objects = new Map(); let space = null, lostCb = null, unmounted = false;
    return {
      mountCanvas(){}, resize(){}, setSpace(s){ space = s; }, clear(){ objects.clear(); },
      apply(list){ for(const op of list){ if(op.type === 'remove') objects.delete(op.key); else objects.set(op.key, op.entity); } },
      onContextLost(fn){ lostCb = fn; }, unmount(){ unmounted = true; }, destroy(){},
      _objects: objects, get _space(){ return space; }, get _unmounted(){ return unmounted; },
      _emitContextLost(){ if(lostCb) lostCb(); },
    };
  }
  const spec = { id: 'rt.detect', space: 'plane2', params: { a: vec(1, 0) }, entities: (p) => [vector(p.a, { key: 'v' })] };
  const flush = () => new Promise(r => setTimeout(r, 0));

  it('a FACTORY passed as backend is resolved and mounted (not mis-taken for an instance)', async () => {
    const made = []; const factory = () => { const b = recordingBackend(); made.push(b); return b; };
    const f = fakeRaf();
    const c = await mountScene(spec, null, { backend: factory, raf: f.raf, caf: f.caf });
    f.tick(16);
    expect(made.length).toBe(1);
    expect(made[0]._space).not.toBe(null);                 // setSpace() succeeded — old code threw here
    expect(made[0]._objects.get('v').v).toEqual({ x: 1, y: 0 });
    c.destroy();
  });

  it('an INSTANCE passed as backend is used as-is', async () => {
    const inst = recordingBackend(); const f = fakeRaf();
    const c = await mountScene(spec, null, { backend: inst, raf: f.raf, caf: f.caf });
    f.tick(16);
    expect(inst._space).not.toBe(null);
    expect(inst._objects.get('v').v).toEqual({ x: 1, y: 0 });
    c.destroy();
  });

  it('context loss unmounts the old backend, rebuilds via the factory, and replays once', async () => {
    const made = []; const factory = () => { const b = recordingBackend(); made.push(b); return b; };
    const f = fakeRaf();
    const c = await mountScene(spec, null, { backend: factory, raf: f.raf, caf: f.caf });
    f.tick(16);
    expect(made.length).toBe(1);
    made[0]._emitContextLost();                            // simulate WebGL context loss
    await flush();
    expect(made.length).toBe(2);                          // rebuilt via the factory
    expect(made[0]._unmounted).toBe(true);                // old backend torn down (no leak)
    f.tick(16);                                            // replay from params
    expect(made[1]._objects.get('v').v).toEqual({ x: 1, y: 0 });
    made[1]._emitContextLost();                            // recovery was RE-ARMED on the new backend
    await flush();
    expect(made.length).toBe(3);
    expect(made[1]._unmounted).toBe(true);
    c.destroy();
  });
});

describe('Pixi backend context-loss listener lifecycle (defects 1-3)', () => {
  it('adds exactly one listener per backend and removes it on unmount (no accumulation)', async () => {
    const { createPixiBackend, destroyPixiSingleton } = await import('../lib/scene/renderer/pixi.js');
    destroyPixiSingleton();                               // clean singleton for a deterministic start
    const b1 = await createPixiBackend();
    const canvas = b1._app.canvas;
    expect(canvas._count).toBe(1);                        // one listener for the first backend
    const b2 = await createPixiBackend();                 // same shared singleton canvas
    expect(canvas._count).toBe(2);                        // each active backend arms exactly one
    b1.unmount();
    expect(canvas._count).toBe(1);                        // removed on unmount — the leak is fixed
    b2.unmount();
    expect(canvas._count).toBe(0);                        // net zero: no listener survives teardown
    destroyPixiSingleton();
  });

  it('destroyPixiSingleton re-creates the Application so a lost context is actually replaced', async () => {
    const { createPixiBackend, destroyPixiSingleton } = await import('../lib/scene/renderer/pixi.js');
    destroyPixiSingleton();
    const b1 = await createPixiBackend();
    const app1 = b1._app;
    b1.unmount();
    destroyPixiSingleton();                               // tear the singleton down (was dead code before the fix)
    const b2 = await createPixiBackend();
    expect(b2._app).not.toBe(app1);                       // getApp() built a FRESH app, not the cached one
    expect(app1.destroyed).toBe(true);
    b2.unmount(); destroyPixiSingleton();
  });
});
