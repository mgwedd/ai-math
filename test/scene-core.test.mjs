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
  grid, vector, point, label,
  diff, createFrameDriver, createSpace, createNullBackend,
  registerScene, validateScenes, SCENES, mountScene, visited, slider,
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

/* ============================ v1.4 SLIDER CONTROL SEAM ============================ */

describe('v1.4 slider() control descriptor + validation', () => {
  it('builds the frozen descriptor shape', () => {
    const fmt = (v) => v.toFixed(2);
    const s = slider('k', { min: 0, max: 1, step: 0.1, label: 'weight k', format: fmt });
    expect(s).toEqual({ kind: 'slider', param: 'k', min: 0, max: 1, step: 0.1, label: 'weight k', format: fmt });
  });
  it('min/max are the only required opts; step/label/format optional', () => {
    const s = slider('t', { min: -3, max: 3 });
    expect(s).toMatchObject({ kind: 'slider', param: 't', min: -3, max: 3 });
    expect(s.step).toBeUndefined();
  });

  const base = { id: 's14.base', space: 'plane2', params: { k: 0.5 }, entities: () => [] };
  it('registerScene REJECTS malformed controls loudly (with the scene id)', () => {
    expect(() => registerScene({ ...base, id: 's14.notarr', controls: {} })).toThrow(/controls.*array/);
    expect(() => registerScene({ ...base, id: 's14.badkind', controls: [{ kind: 'dial', param: 'k' }] })).toThrow(/unknown control kind/);
    expect(() => registerScene({ ...base, id: 's14.noparam', controls: [slider(5, { min: 0, max: 1 })] })).toThrow(/missing `param`/);
    expect(() => registerScene({ ...base, id: 's14.nomin', controls: [slider('k', { max: 1 })] })).toThrow(/`min` must be a finite number/);
    expect(() => registerScene({ ...base, id: 's14.badrange', controls: [slider('k', { min: 2, max: 1 })] })).toThrow(/`min` must be < `max`/);
    expect(() => registerScene({ ...base, id: 's14.badstep', controls: [slider('k', { min: 0, max: 1, step: -1 })] })).toThrow(/`step` must be a positive number/);
  });
  it('registerScene ACCEPTS a well-formed slider', () => {
    expect(() => registerScene({ ...base, id: 's14.ok', controls: [slider('k', { min: 0, max: 1, step: 0.05 })] })).not.toThrow();
  });
  it('validateScenes rejects a slider bound to a MISSING or NON-NUMERIC param', () => {
    registerScene({ ...base, id: 's14.missing', params: { k: 0.5 }, controls: [slider('nope', { min: 0, max: 1 })] });
    registerScene({ ...base, id: 's14.vecparam', params: { v: vec(1, 0) }, controls: [slider('v', { min: 0, max: 1 })] });
    const problems = validateScenes();
    expect(problems.some(m => m.includes('s14.missing') && /is not a declared param/.test(m))).toBe(true);
    expect(problems.some(m => m.includes('s14.vecparam') && /must be a numeric/.test(m))).toBe(true);
  });
  it('F2: validateScenes rejects an initial param value OUTSIDE [min,max]', () => {
    registerScene({ ...base, id: 's14.oor', params: { k: 5 }, controls: [slider('k', { min: 0, max: 1 })] });
    expect(validateScenes().some(m => m.includes('s14.oor') && /outside \[min,max\]/.test(m))).toBe(true);
  });
  it('LOW: validateScenes flags TWO sliders bound to the same param', () => {
    registerScene({ ...base, id: 's14.dup', params: { k: 0.5 }, controls: [slider('k', { min: 0, max: 1 }), slider('k', { min: 0, max: 2 })] });
    expect(validateScenes().some(m => m.includes('s14.dup') && /duplicate slider on param/.test(m))).toBe(true);
  });
});

describe('v1.4 F4: inline (unregistered) scene specs are control-validated at mountScene', () => {
  it('an inline spec with min>max throws at mount, naming the control', async () => {
    // engine.js passes inline scene OBJECTS straight to mountScene — they skip
    // registerScene/validateScenes, so mountScene must guard them itself.
    await expect(mountScene(
      { id: 'inline.bad', space: 'plane2', params: { k: 0.5 },
        controls: [slider('k', { min: 2, max: 1 })], entities: () => [] },
      null, { backend: createNullBackend() },
    )).rejects.toThrow(/controls\[0\].*`min` must be < `max`/);
  });
  it('an inline spec with an out-of-range initial value throws at mount', async () => {
    await expect(mountScene(
      { id: 'inline.oor', space: 'plane2', params: { k: 9 },
        controls: [slider('k', { min: 0, max: 1 })], entities: () => [] },
      null, { backend: createNullBackend() },
    )).rejects.toThrow(/outside \[min,max\]/);
  });
  it('a well-formed inline spec mounts fine', async () => {
    const c = await mountScene(
      { id: 'inline.ok', space: 'plane2', params: { k: 0.5 },
        controls: [slider('k', { min: 0, max: 1, step: 0.1 })], entities: () => [] },
      null, { backend: createNullBackend() });
    expect(c).toBeTruthy();
    c.destroy();
  });
});

describe('v1.4 slider headless drive seam (null backend setSliderValue)', () => {
  const specOf = (over) => ({
    id: 'sd.' + (over && over.id || 'x'), space: 'plane2', params: { k: 0.5 },
    controls: [slider('k', { min: 0, max: 1, step: 0.1 })],
    entities: (p) => [point(vec(p.k, 0), { key: 'p' })],
    ...over,
  });

  it('setSliderValue writes THROUGH the atom and OPENS the learner-input gate', async () => {
    const be = createNullBackend(), f = fakeRaf();
    const c = await mountScene(specOf({ id: 'drive' }), null, { backend: be, raf: f.raf, caf: f.caf });
    expect(c.hasLearnerInput()).toBe(false);       // mount alone never opens the gate
    be.setSliderValue('k', 0.7);
    expect(c.params.k.get()).toBeCloseTo(0.7, 9);  // one-way flow: atom updated
    expect(c.hasLearnerInput()).toBe(true);        // a slider move IS learner input
    f.tick(16);
    expect(be._objects.get('p').v.x).toBeCloseTo(0.7, 9);        // re-rendered off the atom
    expect(be._objects.get('p').v.y).toBe(0);
    c.destroy();
  });
  it('clamps to [min,max] and snaps to step', async () => {
    const be = createNullBackend();
    const c = await mountScene(specOf({ id: 'clamp' }), null, { backend: be });
    be.setSliderValue('k', 5);      expect(c.params.k.get()).toBe(1);    // clamped high
    be.setSliderValue('k', -5);     expect(c.params.k.get()).toBe(0);    // clamped low
    be.setSliderValue('k', 0.34);   expect(c.params.k.get()).toBe(0.3);  // snapped to 0.1 step, CLEAN (F3: no float noise)
    c.destroy();
  });
  it('newAttempt RESETS the gate; a raw atom write does NOT open it (only slider moves do)', async () => {
    const be = createNullBackend();
    const c = await mountScene(specOf({ id: 'reset', randomize: (rng) => ({ k: rng() }) }), null, { backend: be });
    be.setSliderValue('k', 0.8);
    expect(c.hasLearnerInput()).toBe(true);
    c.newAttempt(3);
    expect(c.hasLearnerInput()).toBe(false);       // fresh attempt requires fresh input
    c.params.k.set(0.2);                           // a programmatic write is NOT a learner move
    expect(c.hasLearnerInput()).toBe(false);
    c.destroy();
  });
  it('setSliderValue on an unbound param throws loudly', async () => {
    const be = createNullBackend();
    const c = await mountScene(specOf({ id: 'unbound' }), null, { backend: be });
    expect(() => be.setSliderValue('zzz', 1)).toThrow(/no slider bound to param/);
    c.destroy();
  });
});

describe('v1.4 slider DOM overlay lifecycle (real-document path)', () => {
  // Minimal DOM stub: records created nodes + listeners so we can drive an
  // <input> 'input' event and assert the overlay is disposed on destroy().
  function makeNode(tag){
    return {
      tagName: (tag || 'div').toUpperCase(), className: '', type: '', value: '', min: '', max: '', step: '',
      textContent: '', valueAsNumber: 0, children: [], _attrs: {}, _listeners: {}, _removed: false,
      setAttribute(k, v){ this._attrs[k] = v; }, getAttribute(k){ return this._attrs[k]; },
      appendChild(c){ this.children.push(c); return c; }, remove(){ this._removed = true; },
      addEventListener(t, fn){ (this._listeners[t] || (this._listeners[t] = [])).push(fn); },
      dispatch(t){ (this._listeners[t] || []).forEach(fn => fn()); },
    };
  }

  it('renders an accessible <input type=range> per slider, drives the atom on input, and disposes on destroy', async () => {
    const prevDoc = globalThis.document;
    const created = [];
    globalThis.document = { createElement: (t) => { const n = makeNode(t); created.push(n); return n; } };
    try {
      const container = makeNode('div');
      const be = createNullBackend();
      const spec = {
        id: 'sdom.range', space: 'plane2', params: { k: 0.25 },
        controls: [slider('k', { min: 0, max: 1, step: 0.05, label: 'weight k', format: (v) => v.toFixed(2) })],
        entities: (p) => [point(vec(p.k, 0), { key: 'p' })],
      };
      const c = await mountScene(spec, container, { backend: be });

      const input = created.find(n => n.tagName === 'INPUT');
      expect(input).toBeTruthy();
      expect(input.type).toBe('range');
      expect(input.min).toBe('0'); expect(input.max).toBe('1'); expect(input.step).toBe('0.05');
      expect(input.getAttribute('aria-label')).toBe('weight k');   // keyboard/SR accessible
      expect(input.value).toBe('0.25');                            // initial value follows the atom
      const valEl = created.find(n => n.className === 'scene-control-value');
      expect(valEl.textContent).toBe('0.25');                      // readout reflects format(atom)

      // A learner drags the slider: set value + dispatch the input event.
      input.valueAsNumber = 0.6; input.dispatch('input');
      expect(c.params.k.get()).toBeCloseTo(0.6, 9);                // wrote through the atom
      expect(c.hasLearnerInput()).toBe(true);                      // opened the gate
      expect(valEl.textContent).toBe('0.60');                      // readout tracks the move

      // Atom is the source of truth: an external write reflects back into the input.
      c.params.k.set(0.1);
      expect(input.value).toBe('0.1');
      expect(valEl.textContent).toBe('0.10');

      const overlay = created.find(n => n.className === 'scene-controls');
      expect(overlay._removed).toBe(false);
      c.destroy();
      expect(overlay._removed).toBe(true);                         // no leaked DOM across dispose
    } finally {
      if(prevDoc === undefined) delete globalThis.document; else globalThis.document = prevDoc;
    }
  });

  it('a slider without an explicit step declares step="any" (continuous, not the native step=1)', async () => {
    const prevDoc = globalThis.document;
    const created = [];
    globalThis.document = { createElement: (t) => { const n = makeNode(t); created.push(n); return n; } };
    try {
      const container = makeNode('div');
      const c = await mountScene({
        id: 'sdom.cont', space: 'plane2', params: { k: 0.5 },
        controls: [slider('k', { min: 0, max: 1 })], entities: () => [],
      }, container, { backend: createNullBackend() });
      const input = created.find(n => n.tagName === 'INPUT');
      expect(input.step).toBe('any');
      c.destroy();
    } finally {
      if(prevDoc === undefined) delete globalThis.document; else globalThis.document = prevDoc;
    }
  });

  it('F1: a THROWING format aborts the mount with FULL cleanup (no leaked backend/DOM/subscriptions)', async () => {
    const prevDoc = globalThis.document;
    const created = [];
    globalThis.document = { createElement: (t) => { const n = makeNode(t); created.push(n); return n; } };
    try {
      const container = makeNode('div');
      const kAtom = param(0.5), mAtom = param(0.5);     // atoms we HOLD, to assert unsubscription
      let destroyed = false;
      const be = createNullBackend();
      const origDestroy = be.destroy; be.destroy = () => { destroyed = true; origDestroy(); };
      const spec = {
        id: 'sdom.throw', space: 'plane2', params: { k: kAtom, m: mAtom },
        controls: [
          slider('k', { min: 0, max: 1 }),                                  // built OK — its sync sub is added
          slider('m', { min: 0, max: 1, format: () => { throw new Error('boom'); } }),  // throws in initial sync
        ],
        entities: () => [],
      };
      await expect(mountScene(spec, container, { backend: be })).rejects.toThrow('boom');
      // Every subscription armed during mount (per-atom requestFrame + the k sync)
      // was unsubscribed by the aborting teardown:
      expect(kAtom._subCount()).toBe(0);
      expect(mAtom._subCount()).toBe(0);
      expect(container.children.length).toBe(0);         // overlay never appended / removed
      expect(destroyed).toBe(true);                      // backend torn down
    } finally {
      if(prevDoc === undefined) delete globalThis.document; else globalThis.document = prevDoc;
    }
  });

  it('F2: an out-of-range atom value keeps the thumb and the readout in AGREEMENT (both clamped)', async () => {
    const prevDoc = globalThis.document;
    const created = [];
    globalThis.document = { createElement: (t) => { const n = makeNode(t); created.push(n); return n; } };
    try {
      const container = makeNode('div');
      // Inline spec would be rejected for an out-of-range INITIAL value, so start
      // in range and push the atom out of range at runtime (a stray reroll draw).
      const c = await mountScene({
        id: 'sdom.oor', space: 'plane2', params: { k: 0.5 },
        controls: [slider('k', { min: 0, max: 1, format: (v) => v.toFixed(1) })], entities: () => [],
      }, container, { backend: createNullBackend() });
      const input = created.find(n => n.tagName === 'INPUT');
      const valEl = created.find(n => n.className === 'scene-control-value');
      c.params.k.set(5);                                 // out of [0,1]
      expect(input.value).toBe('1');                     // thumb clamped to max
      expect(valEl.textContent).toBe('1.0');             // readout clamped to the SAME value (no divergence)
      c.destroy();
    } finally {
      if(prevDoc === undefined) delete globalThis.document; else globalThis.document = prevDoc;
    }
  });

  it('F3: default (no-format) readout shows a CLEAN snapped value, not float noise', async () => {
    const prevDoc = globalThis.document;
    const created = [];
    globalThis.document = { createElement: (t) => { const n = makeNode(t); created.push(n); return n; } };
    try {
      const container = makeNode('div');
      const c = await mountScene({
        id: 'sdom.f3', space: 'plane2', params: { k: 0 },
        controls: [slider('k', { min: 0, max: 1, step: 0.1 })], entities: () => [],   // no format
      }, container, { backend: createNullBackend() });
      const input = created.find(n => n.tagName === 'INPUT');
      const valEl = created.find(n => n.className === 'scene-control-value');
      input.valueAsNumber = 0.34; input.dispatch('input');
      expect(c.params.k.get()).toBe(0.3);                // ATOM holds exactly 0.3, not 0.30000000000000004
      expect(valEl.textContent).toBe('0.3');             // default String(0.3) readout is presentable
      c.destroy();
    } finally {
      if(prevDoc === undefined) delete globalThis.document; else globalThis.document = prevDoc;
    }
  });
});

/* ============================ v1.6 INSET SUB-SPACE ============================
   CONTRACT Amendment v1.6 §1: an optional `inset` sub-space, frame:'main'|'inset'
   entity routing, second Pixi container (transform + clip mask + chrome), null-
   backend headless routing seam, read-only validation (no handle on inset), and
   inline-spec parity. */

describe('v1.6 inset — validation (registerScene / validateScenes)', () => {
  const mk = (id, over) => Object.assign({
    id, space: 'plane2', params: { a: vec(1, 1) },
    entities: (p) => [grid(), vector(p.a, { key: 'v' })],
  }, over);

  it('accepts a valid inset; rejects out-of-unit-square and malformed rects at registerScene', () => {
    expect(() => registerScene(mk('in.ok', { inset: { rect: [0.6, 0.05, 0.35, 0.35] } }))).not.toThrow();
    expect(() => registerScene(mk('in.oob', { inset: { rect: [0.8, 0.8, 0.5, 0.5] } }))).toThrow(/in\.oob/);   // x+w>1, y+h>1
    expect(() => registerScene(mk('in.badrect', { inset: { rect: [0, 0, 1] } }))).toThrow(/in\.badrect/);       // not 4 numbers
    expect(() => registerScene(mk('in.negw', { inset: { rect: [0.1, 0.1, 0, 0.2] } }))).toThrow(/in\.negw/);    // w must be >0
  });

  it('rejects a bad extent, a non-boolean yUp, and an inset on a free space', () => {
    expect(() => registerScene(mk('in.ext', { inset: { rect: [0, 0, 0.3, 0.3], extent: -1 } }))).toThrow(/in\.ext/);
    expect(() => registerScene(mk('in.yup', { inset: { rect: [0, 0, 0.3, 0.3], yUp: 'nope' } }))).toThrow(/in\.yup/);
    expect(() => registerScene({ id: 'in.free', space: 'free', params: {}, entities: () => [], inset: { rect: [0, 0, 0.3, 0.3] } })).toThrow(/in\.free/);
  });

  it('validateScenes rejects frame:inset without a declaration, a handle on an inset entity, and an unknown frame', () => {
    registerScene(mk('in.nodecl', { entities: (p) => [vector(p.a, { key: 'v', frame: 'inset' })] }));          // uses inset, none declared
    registerScene(mk('in.hdl', { inset: { rect: [0, 0, 0.3, 0.3] }, entities: (p) => [vector(p.a, { key: 'v', frame: 'inset', handle: 'a' })] }));  // read-only violation
    registerScene(mk('in.badframe', { inset: { rect: [0, 0, 0.3, 0.3] }, entities: (p) => [point(p.a, { key: 'p', frame: 'sideways' })] }));
    registerScene(mk('in.clean', { inset: { rect: [0, 0, 0.3, 0.3] }, entities: (p) => [point(p.a, { key: 'p', frame: 'inset' })] }));
    const problems = validateScenes();
    expect(problems.some(m => m.includes('in.nodecl') && m.includes('declares no `inset`'))).toBe(true);
    expect(problems.some(m => m.includes('in.hdl') && m.includes('read-only'))).toBe(true);
    expect(problems.some(m => m.includes('in.badframe') && m.includes('invalid frame'))).toBe(true);
    expect(problems.some(m => m.includes('in.clean'))).toBe(false);
  });

  it('entity constructors materialize frame:`main` by default and carry `inset` when set (stays a pure prop)', () => {
    expect(vector(vec(1, 0)).frame).toBe('main');
    expect(point(vec(0, 0), { frame: 'inset' }).frame).toBe('inset');
    expect(grid().frame).toBe('main');
  });
});

describe('v1.6 inset — null backend frame routing (headless seam)', () => {
  it('records each entity resolved frame; inset entities route to the inset, main to main', async () => {
    const be = createNullBackend(), f = fakeRaf();
    const spec = {
      id: 'inrt.mix', space: 'plane2', params: { a: vec(2, 1), g: 0.5 },
      inset: { rect: [0.6, 0.05, 0.35, 0.35], extent: 1.2 },
      entities: (p) => [
        vector(p.a, { key: 'v' }),                             // main space
        point(vec(p.g, 0), { key: 'trace', frame: 'inset' }),  // inset gauge (params drive it)
      ],
    };
    const c = await mountScene(spec, null, { backend: be, raf: f.raf, caf: f.caf });
    f.tick(16);
    expect(be._inset).toBeTruthy();
    expect(be._inset.rect).toEqual([0.6, 0.05, 0.35, 0.35]);
    expect(be._frameOf('v')).toBe('main');
    expect(be._frameOf('trace')).toBe('inset');
    c.destroy();
  });

  it('a frame:inset entity with NO inset declared resolves to main (graceful fallback, mirrors pixi)', () => {
    const be = createNullBackend();
    be.apply([{ type: 'add', key: 'x', entity: point(vec(0, 0), { key: 'x', frame: 'inset' }) }]);
    expect(be._frameOf('x')).toBe('main');
  });

  it('a frame flip across renders re-records the resolved frame (update op, no diff partitioning)', async () => {
    const be = createNullBackend(), f = fakeRaf();
    const spec = {
      id: 'inrt.flip', space: 'plane2', params: { m: 0 },
      inset: { rect: [0, 0, 0.3, 0.3] },
      entities: (p) => [point(vec(0, 0), { key: 'p', frame: p.m > 0.5 ? 'inset' : 'main' })],
    };
    const c = await mountScene(spec, null, { backend: be, raf: f.raf, caf: f.caf });
    f.tick(16); expect(be._frameOf('p')).toBe('main');
    c.params.m.set(1); f.tick(16); expect(be._frameOf('p')).toBe('inset');
    c.destroy();
  });

  it('an inline scene with a bad inset rect fails LOUD at mountScene (parity with registered specs)', async () => {
    await expect(mountScene({
      id: 'inline.badinset', space: 'plane2', params: {}, entities: () => [],
      inset: { rect: [0.8, 0.8, 0.5, 0.5] },
    }, null, { backend: createNullBackend() })).rejects.toThrow(/inset\.rect/);
  });

  it('mount-throw teardown WITH an inset present clears the inset (no leaked second space)', async () => {
    const prevDoc = globalThis.document;
    const mkNode = (tag) => ({
      tagName: (tag || 'div').toUpperCase(), className: '', type: '', value: '', min: '', max: '', step: '',
      textContent: '', valueAsNumber: 0, children: [], _attrs: {},
      setAttribute(k, v){ this._attrs[k] = v; }, appendChild(c){ this.children.push(c); return c; },
      remove(){}, addEventListener(){},
    });
    globalThis.document = { createElement: (t) => mkNode(t) };
    try {
      const be = createNullBackend();
      const container = mkNode('div');
      const spec = {
        id: 'inrt.throw', space: 'plane2', params: { k: 0.5 },
        inset: { rect: [0, 0, 0.3, 0.3] },
        controls: [slider('k', { min: 0, max: 1, format: () => { throw new Error('boom'); } })],
        entities: () => [],
      };
      await expect(mountScene(spec, container, { backend: be })).rejects.toThrow('boom');
      expect(be._inset).toBe(null);   // backend.destroy() during teardown cleared the inset
    } finally {
      if(prevDoc === undefined) delete globalThis.document; else globalThis.document = prevDoc;
    }
  });

  it('context-loss recovery re-declares the inset on the rebuilt backend', async () => {
    const f = fakeRaf();
    let lost = null; const insetCalls = [];
    const make = () => ({
      setSpace(){}, setInset(s, rect){ insetCalls.push(rect); }, clearInset(){},
      mountCanvas(){}, resize(){}, apply(){}, clear(){},
      onContextLost(fn){ lost = fn; }, unmount(){}, destroy(){},
    });
    const spec = {
      id: 'inrec.factory', space: 'plane2', params: { a: vec(1, 0) },
      inset: { rect: [0.6, 0.05, 0.3, 0.3] },
      entities: (p) => [vector(p.a, { key: 'v' })],
    };
    const c = await mountScene(spec, null, { backend: make, raf: f.raf, caf: f.caf });
    expect(insetCalls.length).toBe(1);        // declared at mount
    await lost();                             // simulate WebGL context loss -> rebuild
    expect(insetCalls.length).toBe(2);        // re-declared on the fresh backend
    c.destroy();
  });
});

describe('v1.6 inset — Pixi second container (transform, clip mask, chrome, routing, teardown)', () => {
  it('setInset builds a masked, chromed container; resize positions + sizes it to the rect px box', async () => {
    const { createPixiBackend, destroyPixiSingleton } = await import('../lib/scene/renderer/pixi.js');
    destroyPixiSingleton();
    const be = await createPixiBackend();
    be.setSpace(createSpace('plane2', { extent: 6 }));
    be.resize(400, 400, 1);
    const insetSpace = createSpace('plane2', { extent: 1.2 });
    be.setInset(insetSpace, [0.6, 0.05, 0.35, 0.35]);
    expect(be._inset).toBeTruthy();
    expect(be._inset.container.mask).toBe(be._inset.mask);            // clip mask wired
    expect(be._inset.container.x).toBe(240);                          // 0.6 * 400
    expect(be._inset.container.y).toBe(20);                           // 0.05 * 400
    expect(be._inset.container.children.includes(be._inset.chrome)).toBe(true);   // chrome child present
    expect(insetSpace.scale).toBeGreaterThan(0);                     // sub-space sized to the rect box
    be.clearInset();
    expect(be._inset).toBe(null);                                    // clean teardown
    be.destroy(); destroyPixiSingleton();
  });

  it('routes entities to the inset container by frame and re-parents on a frame change', async () => {
    const { createPixiBackend, destroyPixiSingleton } = await import('../lib/scene/renderer/pixi.js');
    destroyPixiSingleton();
    const be = await createPixiBackend();
    be.setSpace(createSpace('plane2', { extent: 6 }));
    be.resize(400, 400, 1);
    be.setInset(createSpace('plane2', { extent: 1.2 }), [0.6, 0.05, 0.35, 0.35]);
    const chromeOnly = be._inset.container.children.length;           // just the chrome so far
    be.apply([{ type: 'add', key: 'g', entity: point(vec(0, 0), { key: 'g', frame: 'inset' }) }]);
    expect(be._nodeFrame('g')).toBe('inset');
    expect(be._inset.container.children.length).toBe(chromeOnly + 1); // node landed in the inset container
    be.apply([{ type: 'update', key: 'g', entity: point(vec(0, 0), { key: 'g', frame: 'main' }), changed: ['frame'] }]);
    expect(be._nodeFrame('g')).toBe('main');
    expect(be._inset.container.children.length).toBe(chromeOnly);     // re-parented out to the main layer
    be.apply([{ type: 'remove', key: 'g' }]);
    expect(be._nodeFrame('g')).toBe(undefined);
    be.destroy(); destroyPixiSingleton();
  });
});

describe('v1.6 plane2 yUp option (inset gauges may want screen-style y-down)', () => {
  it('default is y-up (unchanged transform); yUp:false flips the screen-y sign and round-trips', () => {
    const up = createSpace('plane2', { extent: 5 }).resize(200, 200, 1);
    const down = createSpace('plane2', { extent: 5, yUp: false }).resize(200, 200, 1);
    expect(up.toScreen({ x: 0, y: 1 }).py).toBeLessThan(100);        // world +y is ABOVE center
    expect(down.toScreen({ x: 0, y: 1 }).py).toBeGreaterThan(100);   // world +y is BELOW center
    expect(up.toScreen({ x: 3, y: 2 })).toEqual({ px: 100 + 3 * up.scale, py: 100 - 2 * up.scale });  // byte-identical to prior
    const w = down.toWorld(down.toScreen({ x: 2, y: -3 }));
    expect(w.x).toBeCloseTo(2, 9); expect(w.y).toBeCloseTo(-3, 9);   // round-trip under y-down
  });
});
