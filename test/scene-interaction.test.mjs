/* interaction.js audit (Vitest) — the contracted runtime (CONTRACT §0/§7/§8).

   Drives attachInteraction/attachGoals against a REAL kit-core mountScene
   (headless null backend, injected rAF) — contract conformance is proven by
   construction: handles are discovered from controller.evaluate()'s display
   list (seams/handle.js shapes), pointers map through controller.space.toWorld
   (canvas-local px), writes go through controller.params atoms, and goals run
   off controller.snapshot() with the baseline + learner-input gate. */
import { describe, it, expect } from 'vitest';
import { mountScene } from '../lib/scene/scene.js';
import { createNullBackend } from '../lib/scene/renderer/backend.js';
import { vec } from '../lib/scene/params.js';
import { point, vector, curve } from '../lib/scene/entities.js';
import { goal, episode, visited } from '../lib/scene/seams/goals.js';
import { attachInteraction, attachGoals } from '../lib/scene/interaction.js';

// ---- fake DOM element for pointer/keyboard (canvas stand-in) ----
function fakeEl() {
  const map = {};
  return {
    tabIndex: -1,
    addEventListener(t, fn) { (map[t] ??= []).push(fn); },
    removeEventListener(t, fn) { const a = map[t]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
    setPointerCapture() {}, releasePointerCapture() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 600, height: 600 }; },
    dispatch(t, ev) { (map[t] || []).forEach((fn) => fn(ev)); },
    count(t) { return (map[t] || []).length; },
  };
}
const fakeRaf = () => { const q = []; let id = 0; return {
  raf: (cb) => { q.push(cb); return ++id; }, caf: () => {},
  tick: (ms = 16) => { const cbs = q.splice(0); cbs.forEach((cb) => cb(ms)); },
}; };

// Mount a spec headlessly and size the space 600x600 so toWorld works.
async function mountFor(spec) {
  const f = fakeRaf();
  const c = await mountScene(spec, null, { backend: createNullBackend(), raf: f.raf, caf: f.caf });
  c.resize(600, 600, 1);
  return { c, f };
}
// world -> client px for a 600x600 plane2 with the spec's extent.
function px(c, w) { const s = c.space.toScreen(w); return { clientX: s.px, clientY: s.py, pointerId: 1, preventDefault() {} }; }

describe('attachInteraction: declarative handle discovery + drag', () => {
  const spec = {
    id: 't.drag', space: 'plane2', extent: 6,
    params: { p: vec(2, 1) },
    entities: (pv) => [point(pv.p, { key: 'pt', handle: 'p' })],
    goals: [],
  };

  it('discovers the .handle entity and a drag writes the bound param', async () => {
    const { c } = await mountFor(spec);
    const el = fakeEl();
    const ix = attachInteraction(c, { el });
    expect(ix.interaction.handles.length).toBe(1);
    el.dispatch('pointerdown', px(c, { x: 2, y: 1 }));       // grab at the point
    el.dispatch('pointermove', px(c, { x: -1, y: 3 }));      // drag to (-1,3)
    const v = c.params.p.get();
    expect(v.x).toBeCloseTo(-1, 4);
    expect(v.y).toBeCloseTo(3, 4);
    ix.dispose(); c.destroy();
  });

  it('descriptor form {bind,snap,keyStep,constrain} flows through', async () => {
    const s2 = { ...spec, id: 't.desc',
      entities: (pv) => [vector(pv.p, { key: 'v', handle: { bind: 'p', snap: 0.5, constrain: 'axis-x' } })] };
    const { c } = await mountFor(s2);
    const el = fakeEl();
    const ix = attachInteraction(c, { el });
    el.dispatch('pointerdown', px(c, { x: 2, y: 1 }));
    el.dispatch('pointermove', px(c, { x: 3.3, y: 4 }));     // y locked to grab value, snapped
    const v = c.params.p.get();
    expect(v.x).toBeCloseTo(3.5, 4);                          // 3.3 → snap 0.5 → 3.5
    expect(v.y).toBeCloseTo(1, 4);                            // axis-x lock
    ix.dispose(); c.destroy();
  });

  it("constrain:'curve' projects the drag onto the display list's curve fn", async () => {
    const s3 = { id: 't.curve', space: 'plane2', extent: 6,
      params: { p: vec(1, 1) },
      entities: (pv) => [
        curve((x) => x * x, { key: 'c' }),
        point(pv.p, { key: 'pt', handle: { bind: 'p', constrain: 'curve' } }),
      ] };
    const { c } = await mountFor(s3);
    const el = fakeEl();
    const ix = attachInteraction(c, { el });
    el.dispatch('pointerdown', px(c, { x: 1, y: 1 }));
    el.dispatch('pointermove', px(c, { x: 2, y: 0 }));       // dragged off the curve
    const v = c.params.p.get();
    expect(v.x).toBeCloseTo(2, 3);
    expect(v.y).toBeCloseTo(4, 3);                            // y = x² re-imposed
    ix.dispose(); c.destroy();
  });

  it('handle binding an unknown param is skipped (logged), not fatal', async () => {
    const s4 = { ...spec, id: 't.unknown',
      entities: (pv) => [point(pv.p, { key: 'pt', handle: 'nope' })] };
    const { c } = await mountFor(s4);
    const el = fakeEl();
    const ix = attachInteraction(c, { el });
    expect(ix.interaction.handles.length).toBe(0);
    ix.dispose(); c.destroy();
  });
});

describe('attachInteraction: goals wiring (baseline + input gate end-to-end)', () => {
  const mkSpec = () => ({
    id: 't.goals', space: 'plane2', extent: 6,
    params: { p: vec(0, 0) },
    entities: (pv) => [point(pv.p, { key: 'pt', handle: 'p' })],
  });
  const defs = () => [goal('reach y>2', (s) => s.p.y > 2, { xp: 10 })];

  it('baseline at attach + param-change evaluation + pointer input gate', async () => {
    const { c } = await mountFor(mkSpec());
    const el = fakeEl();
    const ix = attachInteraction(c, { el, goalDefs: defs() });
    const g = ix.goals;
    expect(g.allDone()).toBe(false);
    // Param sweep WITHOUT learner input (as a mount tween would): no credit.
    c.params.p.set(vec(0, 3));
    expect(g.allDone()).toBe(false);
    c.params.p.set(vec(0, 0));
    // Learner drags: grab fires the input gate, move satisfies the predicate.
    el.dispatch('pointerdown', px(c, { x: 0, y: 0 }));
    el.dispatch('pointermove', px(c, { x: 0, y: 3 }));
    expect(g.allDone()).toBe(true);
    ix.dispose(); c.destroy();
  });

  it('keyboard nudge also opens the gate', async () => {
    const { c } = await mountFor(mkSpec());
    const el = fakeEl();
    const ix = attachInteraction(c, { el,
      goalDefs: [goal('moved', (s) => s.p.y >= 0.1, { xp: 5 })] });
    el.dispatch('keydown', { key: 'ArrowUp', preventDefault() {} });   // nudge 0.1
    expect(ix.goals.allDone()).toBe(true);
    ix.dispose(); c.destroy();
  });

  it('markLearnerInput() (kit controls seam) + reportEpisode pass through', async () => {
    const { c } = await mountFor(mkSpec());
    const ix = attachInteraction(c, { el: fakeEl(),
      goalDefs: [episode('win', (ep) => ep.win, { xp: 5 })] });
    ix.reportEpisode({ win: true });          // auto-run: gated
    expect(ix.goals.allDone()).toBe(false);
    ix.markLearnerInput();                    // slider/chip change reported
    ix.reportEpisode({ win: true });
    expect(ix.goals.allDone()).toBe(true);
    ix.dispose(); c.destroy();
  });

  it('dispose() detaches param subscriptions and listeners', async () => {
    const { c } = await mountFor(mkSpec());
    const el = fakeEl();
    let goalsFired = 0;
    const ix = attachInteraction(c, { el,
      goalDefs: [goal('y>2', (s) => s.p.y > 2, { xp: 5 })],
      onGoal: () => goalsFired++ });
    ix.markLearnerInput();
    ix.dispose();
    c.params.p.set(vec(0, 5));                // post-dispose write: no evaluation
    expect(goalsFired).toBe(0);
    expect(el.count('pointerdown')).toBe(0);
    c.destroy();
  });

  it("free-space scenes (space:null) skip handle wiring but goals still run", async () => {
    const spec = { id: 't.free', space: 'free', params: { k: 1 }, entities: () => [] };
    const f = fakeRaf();
    const c = await mountScene(spec, null, { backend: createNullBackend(), raf: f.raf, caf: f.caf });
    const ix = attachInteraction(c, { el: fakeEl(),
      goalDefs: [goal('k=2', (s) => s.k === 2, { xp: 5 })] });
    expect(ix.interaction).toBe(null);        // no space → no pointer wiring
    ix.markLearnerInput();                    // DOM control reports input
    c.params.k.set(2);                        // control writes the param
    expect(ix.goals.allDone()).toBe(true);
    ix.dispose(); c.destroy();
  });
});

describe('newAttempt trio — reroll → resetAttempt → baseline re-eval (v1.3 §2)', () => {
  it('in-flight visited keys do not survive a new attempt; the gate re-closes', async () => {
    const spec = {
      id: 't.reroll', space: 'plane2', extent: 6,
      params: { p: vec(0, 0) },
      entities: (pv) => [point(pv.p, { key: 'pt', handle: 'p' })],
      randomize: () => ({ p: vec(0, 0) }),          // deterministic re-center
    };
    const { c } = await mountFor(spec);
    const el = fakeEl();
    const ix = attachInteraction(c, { el, goalDefs: [
      visited('visit up and down', (s) => (s.p.y > 2 ? 'up' : s.p.y < -2 ? 'down' : null),
        { keys: ['up', 'down'], xp: 5 }),
    ] });
    // Attempt 1: learner banks 'up'.
    el.dispatch('pointerdown', px(c, { x: 0, y: 0 }));
    el.dispatch('pointermove', px(c, { x: 0, y: 3 }));
    el.dispatch('pointerup', px(c, { x: 0, y: 3 }));
    expect(ix.goals.allDone()).toBe(false);
    // Attempt boundary: reroll + reset + baseline, gate closed.
    ix.newAttempt(7);
    expect(c.hasLearnerInput()).toBe(false);
    const p0 = c.params.p.get();
    expect(p0.x).toBeCloseTo(0, 6); expect(p0.y).toBeCloseTo(0, 6);   // randomize applied
    // Attempt 2: 'down' alone must NOT complete (attempt-1 'up' must not carry).
    el.dispatch('pointerdown', px(c, { x: 0, y: 0 }));
    el.dispatch('pointermove', px(c, { x: 0, y: -3 }));
    el.dispatch('pointerup', px(c, { x: 0, y: -3 }));
    expect(ix.goals.allDone()).toBe(false);
    // Both variants within attempt 2 → done.
    el.dispatch('pointerdown', px(c, { x: 0, y: -3 }));
    el.dispatch('pointermove', px(c, { x: 0, y: 3 }));
    el.dispatch('pointerup', px(c, { x: 0, y: 3 }));
    expect(ix.goals.allDone()).toBe(true);
    ix.dispose(); c.destroy();
  });

  it('a hold armed in attempt 1 cannot credit in attempt 2', async () => {
    let clock = 0; const timers = [];
    const spec = {
      id: 't.rerollhold', space: 'plane2', extent: 6,
      params: { p: vec(0, 0) },
      entities: (pv) => [point(pv.p, { key: 'pt', handle: 'p' })],
      randomize: () => ({ p: vec(0, 0) }),
    };
    const { c } = await mountFor(spec);
    const el = fakeEl();
    const ix = attachInteraction(c, { el,
      goalDefs: [goal('hold y>2 for 500ms', (s) => s.p.y > 2, { xp: 10, hold: 500 })],
      now: () => clock,
      schedule: (fn, ms) => { const t = { at: clock + ms, fn, dead: false }; timers.push(t); return t; },
      cancel: (t) => { if (t) t.dead = true; },
    });
    const fire = () => timers.splice(0).forEach((t) => { if (!t.dead && t.at <= clock) t.fn(); });
    // Attempt 1: drag into the qualifying region → hold arms at t=0.
    el.dispatch('pointerdown', px(c, { x: 0, y: 0 }));
    el.dispatch('pointermove', px(c, { x: 0, y: 3 }));
    el.dispatch('pointerup', px(c, { x: 0, y: 3 }));
    clock = 200;
    ix.newAttempt(3);                       // boundary at t=200
    clock = 600; fire();                    // attempt-1 timer due at t=500
    expect(ix.goals.allDone()).toBe(false); // must not credit into attempt 2
    ix.dispose(); c.destroy();
  });
});

describe('attachGoals (quality probe surface)', () => {
  it('takes {goals, snapshot, onGoal} and exposes evaluate() with the baseline', () => {
    let state = { v: 0 };
    const fired = [];
    const rt = attachGoals({
      goals: [goal('v=0', (s) => s.v === 0, { xp: 5 })],
      snapshot: () => ({ ...state }),
      onGoal: (d) => fired.push(d.text),
    });
    rt.evaluate();                            // baseline — true at default, no credit
    expect(rt.allDone()).toBe(false);
    rt.markLearnerInput();
    rt.evaluate();                            // later, post-input evaluate → credits
    expect(rt.allDone()).toBe(true);
    expect(fired).toEqual(['v=0']);
    rt.dispose();
  });
});
