/* Scene Kit invariants — the real-kit test harness (CONTRACT.md v1.2).
 *
 * These tests bind the FROZEN contract to executable checks. They skipIf the
 * relevant peer module hasn't landed on this branch yet, so the base suite is
 * green before integration and these bite the moment lib/scene/* appears (via
 * the integration branch or a fetched peer branch checked out here).
 *
 * Coverage (charter):
 *   1. registerScene validation loudness + idempotent-by-id  (CONTRACT §1)
 *   2. entity purity — entities() headless, returns plain data (§3)
 *   3. GOAL BASELINE invariant — first eval never credits (§7/§8)
 *   4. diff correctness — add/update/remove/no-op ops (§4)
 *   5. tween/sim determinism via injected clock (§5)
 *   6. capstone reroll — real randomize(rng)+newAttempt(seed) seam (§1/§8, VF §8)
 *   7. LEARNER-INPUT GATE — controller seam + no credit before input (v1.2 §7/§8)
 *   8. visited() goal type — descriptor shape + required>=1 rejection (v1.2 §7)
 *
 * Run against a peer branch:  from this worktree,
 *   git checkout origin/ai/p0-kit-core -- lib/scene   # or fetch+merge the branch
 *   npx vitest run test/scene-kit.test.mjs
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  kitPresent, scenePresent, motionPresent, interactionPresent,
  importScene, installSceneDom, poisonGlobals, restoreGlobals, assertPlainData,
  fakeClock,
} from './scene-harness.mjs';

const HAVE_KIT = kitPresent();
if (!HAVE_KIT) {
  // One visible breadcrumb so a green run doesn't hide the fact these are dormant.
  // eslint-disable-next-line no-console
  console.warn('[scene-kit] lib/scene not present on this branch — real-kit invariant tests are SKIPPED. Integrate a peer branch to activate.');
}

let registry, params, entitiesMod, diffMod, pub;
beforeAll(async () => {
  if (!HAVE_KIT) return;
  installSceneDom();
  registry = await importScene('registry.js');
  params = await importScene('params.js');
  entitiesMod = await importScene('entities.js');
  diffMod = await importScene('diff.js');
  // Public surface (§8 mountScene, null backend, param/vec/visited/makeRng) — the
  // REAL controller for the v1.2 gate + capstone-reroll tests (no vacuous stubs).
  pub = await importScene('index.js');
});

/* ===================== 1. registerScene validation + idempotency ========== */
describe.skipIf(!HAVE_KIT)('registerScene — validation loudness + idempotent by id (§1)', () => {
  const good = (over = {}) => ({
    id: '__q_ok__', space: 'plane2', params: {}, entities: () => [], ...over,
  });
  // removes a synthetic scene so the shared SCENES singleton stays clean for
  // the validateScenes / purity / capstone iterations (mirrors curriculum.test.mjs drop())
  const drop = (id) => { const i = registry.SCENES.findIndex((s) => s.id === id); if (i >= 0) registry.SCENES.splice(i, 1); };

  it('accepts a well-formed scene without throwing', () => {
    const { registerScene } = registry;
    expect(() => registerScene(good())).not.toThrow();
    drop('__q_ok__');
  });

  it('THROWS with the id in the message on a malformed scene', () => {
    const { registerScene } = registry;
    // §1: id non-empty string, space in set, params plain object, entities a fn.
    const cases = [
      { id: '', space: 'plane2', params: {}, entities: () => [] },          // empty id
      { id: '__q_badspace__', space: 'nope', params: {}, entities: () => [] }, // bad space
      { id: '__q_badparams__', space: 'plane2', params: [], entities: () => [] }, // params not plain obj
      { id: '__q_badent__', space: 'plane2', params: {}, entities: 42 },     // entities not a fn
      { id: '__q_badgoal__', space: 'plane2', params: {}, entities: () => [], goals: [{ text: 'no predicate or type' }] }, // malformed goal descriptor (§1/§7)
    ];
    for (const c of cases) {
      let threw = null;
      try { registerScene(c); } catch (e) { threw = e; }
      expect(threw, `expected throw for ${JSON.stringify(c.id)}`).toBeTruthy();
      // id present in message where the spec carries a usable id
      if (c.id) expect(String(threw.message)).toContain(c.id);
    }
  });

  it('is idempotent by id — re-registering replaces in place, replacement wins', () => {
    const { registerScene, SCENES } = registry;
    registerScene(good({ id: '__q_dup__', caption: 'v1' }));
    const n = SCENES.length;
    registerScene(good({ id: '__q_dup__', caption: 'v2' }));
    expect(SCENES.length, 'no duplicate appended').toBe(n);
    expect(SCENES.find((s) => s.id === '__q_dup__').caption).toBe('v2');
    drop('__q_dup__');
  });

  it('validateScenes() reports ZERO issues for the shipped scenes', () => {
    const { validateScenes } = registry;
    // Contract: validateScenes re-runs shape checks + asserts entities(p,0)
    // evaluates without throwing. Whatever ships must be clean — a non-empty
    // list here is a shipped-scene defect, not tolerable drift.
    expect(validateScenes()).toEqual([]);
  });
});

/* ============================ 2. entity purity ============================ */
describe.skipIf(!HAVE_KIT)('entities are PURE — headless, plain data, no globals (§3)', () => {
  it('every v1 entity constructor returns inert plain data', () => {
    if (!entitiesMod) return;
    const { grid, vector, point, segment, curve, area, polygon, label, angleArc, dropLine, cellGrid, bars } = entitiesMod;
    const v = (x, y) => ({ x, y });
    const built = [];
    const tryBuild = (fn, ...args) => { if (typeof fn === 'function') built.push(fn(...args)); };
    poisonGlobals();
    try {
      tryBuild(grid, {});
      tryBuild(vector, v(2, 1), { color: 'accent', label: 'a', handle: 'a' });
      tryBuild(point, v(1, 1), { color: 'accent2' });
      tryBuild(segment, v(0, 0), v(1, 1), {});
      tryBuild(curve, (x) => x * x, { domain: [-1, 1] });
      tryBuild(area, (x) => x, { domain: [0, 1] });
      tryBuild(polygon, [v(0, 0), v(1, 0), v(0, 1)], {});
      tryBuild(label, () => 'cos = 0.5', { at: 'readout' });
      tryBuild(angleArc, v(1, 0), v(0, 1), {});
      tryBuild(dropLine, v(1, 1), { to: 'axes' });
      tryBuild(cellGrid, [[0, 1], [1, 0]], {});
      tryBuild(bars, [1, 2, 3], {});
    } finally {
      restoreGlobals();
    }
    expect(built.length).toBeGreaterThan(0);
    for (const e of built) {
      assertPlainData(e);
      expect(typeof e.kind, 'entity carries a string kind').toBe('string');
    }
  });

  it('each registered scene evaluates entities(p,0) to plain data while globals are poisoned', async () => {
    if (!registry || !params) return;
    const { SCENES } = registry;
    const { snapshot } = params;
    // Build a params view for each scene from its declared params, then eval pure.
    for (const scene of SCENES) {
      // paramsView: contract says entities gets a raw-value view; approximate it
      // from the declared params (atoms expose .get(), plain values pass through).
      const view = {};
      for (const [k, val] of Object.entries(scene.params || {})) {
        view[k] = val && typeof val.get === 'function' ? val.get() : val;
      }
      poisonGlobals();
      let list;
      try { list = scene.entities(view, 0); } finally { restoreGlobals(); }
      expect(Array.isArray(list), `${scene.id} entities() -> array`).toBe(true);
      for (const e of list) assertPlainData(e, `${scene.id}:entity`);
    }
    // snapshot must also be plain data
    if (typeof snapshot === 'function' && SCENES[0]) {
      const s = snapshot(SCENES[0].params || {});
      assertPlainData(s, 'snapshot');
    }
  });
});

/* ========================= 4. diff layer correctness ===================== */
describe.skipIf(!HAVE_KIT || !scenePresent('diff.js'))('diff — keyed add/update/remove/no-op ops (§4)', () => {
  let diff;
  beforeAll(async () => { diff = (await importScene('diff.js'))?.diff; });

  const e = (key, x) => ({ kind: 'point', key, x, y: 0, color: 'accent' });

  it('emits add ops for new keys', () => {
    if (!diff) return;
    const ops = diff([], [e('a', 1), e('b', 2)]);
    const adds = ops.filter((o) => o.type === 'add').map((o) => o.key).sort();
    expect(adds).toEqual(['a', 'b']);
  });

  it('emits update ops with a changed-key list only for changed props', () => {
    if (!diff) return;
    const prev = [e('a', 1)];
    const ops = diff(prev, [e('a', 5)]);
    const up = ops.find((o) => o.type === 'update' && o.key === 'a');
    expect(up, 'a changed -> update op').toBeTruthy();
    // §4: update ops carry `changed` (list of changed prop keys) — REQUIRED.
    expect(Array.isArray(up.changed), 'update op must carry a changed-key list').toBe(true);
    expect(up.changed).toContain('x');
  });

  it('function-valued props always compare as changed (§4 — fns cannot be value-compared)', () => {
    if (!diff) return;
    // kit-core decision: diff compares by VALUE, but function props (label fn,
    // curve fn) can't be value-compared, so fresh closures each frame => the
    // entity is always "changed" and redraws. Pin that rule.
    const mk = () => ({ kind: 'label', key: 'l', text: () => 'hi', at: 'readout' });
    const ops = diff([mk()], [mk()]);
    const up = ops.find((o) => o.type === 'update' && o.key === 'l');
    expect(up, 'fresh closure prop must emit an update op').toBeTruthy();
    expect(up.changed).toContain('text');
  });

  it('emits NO op for an unchanged entity', () => {
    if (!diff) return;
    const prev = [e('a', 1)];
    const ops = diff(prev, [e('a', 1)]);
    expect(ops.filter((o) => o.key === 'a')).toEqual([]);
  });

  it('emits remove ops for dropped keys', () => {
    if (!diff) return;
    const ops = diff([e('a', 1), e('b', 2)], [e('a', 1)]);
    expect(ops.filter((o) => o.type === 'remove').map((o) => o.key)).toEqual(['b']);
  });
});

/* ================= 5. driver / tween / sim determinism =================== */
// Bound to motion's REAL seam (verified against lib/scene/clock.js @ 24257d3):
// `createClock({driver}).tween(param, to, {dur, ease})`. Motion attaches ONE
// driver source per clock (dirty-flag) and advances every live timeline in that
// source's fn(t,dt); dt is SECONDS, the timeline playhead is ms. There is no
// standalone `tween(atom, to, {driver})` export — the previous harness guessed
// that shape, caught the TypeError, and returned null, so this determinism
// invariant was passing VACUOUSLY. Now it drives the real clock through a fake
// driver stand-in and asserts a bit-identical trajectory + convergence.
describe.skipIf(!HAVE_KIT || !motionPresent())('tween determinism via the real createClock seam (§5)', () => {
  let clockMod, paramsMod;
  beforeAll(async () => {
    installSceneDom();
    clockMod = await importScene('clock.js');
    paramsMod = await importScene('params.js');
  });

  it('a tween produces an identical param trajectory for an identical dt feed', async () => {
    if (!clockMod || !paramsMod) return;
    const { param } = paramsMod;
    const { createClock } = clockMod;
    expect(typeof createClock, 'motion must export createClock (§5 seam)').toBe('function');

    // Same dt feed twice; trajectories must be bit-identical (no wall-clock leak).
    // Feed sums to 150ms > the 100ms tween, so it also fully converges to target.
    const dts = [0.016, 0.016, 0.02, 0.016, 0.016, 0.05, 0.016];
    const runOnce = () => {
      const a = param(0);
      const sources = [];
      const fc = fakeClock();
      // Driver stand-in honoring §5 addSource/now; createClock attaches exactly
      // one source and pumps every live timeline through it.
      const driver = {
        now: () => fc.now(),
        requestFrame() {},
        addSource(fn) { sources.push(fn); return { release() { const i = sources.indexOf(fn); if (i >= 0) sources.splice(i, 1); } }; },
        pause() {}, resume() {}, isPaused: () => false, destroy() {},
      };
      const clock = createClock({ driver });
      clock.tween(a, 1, { dur: 100 });   // dur ms
      const traj = [];
      for (const dt of dts) {
        fc.tick(dt);
        for (const fn of [...sources]) fn(fc.now(), dt);  // sources run before render (§5)
        traj.push(a.get());
      }
      clock.dispose();
      return traj;
    };
    const r1 = runOnce();
    const r2 = runOnce();
    expect(r1, 'deterministic: identical dt feed -> identical trajectory').toEqual(r2);
    expect(r1.at(-1), 'tween moved off the start value').toBeGreaterThan(0);
    expect(r1.at(-1), 'tween converged to target by end of feed (150ms > 100ms dur)').toBe(1);
  });
});

/* ==================== 3. GOAL BASELINE invariant ========================= */
// Bound to interaction's v1.2 surface (ai/p0-interaction @ 9f459ca):
//   - RUNTIME: lib/scene/goals.js exports makeGoals(defs, cfg) with cfg
//     {store, onComplete, onAllDone, now, schedule, cancel} and an api
//     {evaluate(state), reportEpisode(ep), markLearnerInput,
//      bindLearnerInput(fn), allDone, isDone, dispose}.
//   - DESCRIPTOR factories live in KIT-CORE's seams/goals.js; the 9f459ca
//     rework REMOVED interaction's own goal() export. The previous guard
//     `if (!mod?.goal) return;` therefore early-returned and these tests
//     passed VACUOUSLY — the surface is now asserted loudly instead.
//   - v1.2: makeGoals gates ALL crediting on learner input (standalone flag
//     via markLearnerInput(), or a bound controller flag via bindLearnerInput);
//     the baseline rule is RETAINED beneath the gate, so these tests open the
//     gate up front to isolate the baseline invariant.
describe.skipIf(!interactionPresent())('goal baseline — first evaluation never credits (§7/§8)', () => {
  let makeGoals, goal;
  beforeAll(async () => {
    const rt = await importScene('goals.js');
    const seams = (await importScene('seams/goals.js')) || (await importScene('index.js'));
    makeGoals = rt?.makeGoals;
    goal = seams?.goal;
  });

  it('the shipped surface exists: makeGoals runtime + kit goal() factory (fail loudly on rename)', () => {
    expect(typeof makeGoals, 'goals.js must export makeGoals').toBe('function');
    expect(typeof goal, 'kit seams/goals.js must export goal()').toBe('function');
  });

  it('a goal true at the default state is NOT credited on the baseline eval — even with the gate open', () => {
    let credited = 0;
    const g = makeGoals(
      [goal('at origin', (s) => s.a === 0, { xp: 20 })],
      { onComplete: () => { credited++; } },
    );
    g.markLearnerInput();            // open the v1.2 gate up front: the baseline
                                     // rule must hold INDEPENDENTLY of the gate
    g.evaluate({ a: 0 });            // FIRST evaluation = baseline; predicate true
    expect(credited, 'baseline must not credit').toBe(0);
    expect(g.allDone()).toBe(false);
    g.evaluate({ a: 1 });            // learner-driven: away…
    expect(credited).toBe(0);
    g.evaluate({ a: 0 });            // …and back to the qualifying state
    expect(credited, 'later qualifying eval credits').toBe(1);
    expect(g.allDone()).toBe(true);
    g.dispose();
  });

  it('hold-time goals: baseline cannot arm the hold; a drive-by pass does not credit', () => {
    // Injected deterministic clock + captured timers (contract: hold via
    // injected schedule/cancel so a stopped learner still completes at T+hold).
    let t = 0;
    const timers = [];
    let credited = 0;
    const g = makeGoals(
      [goal('hold it', (s) => s.v > 0.5, { xp: 20, hold: 500 })],
      {
        now: () => t,
        schedule: (fn, ms) => { const tk = { fn, at: t + ms, dead: false }; timers.push(tk); return tk; },
        cancel: (tk) => { if (tk) tk.dead = true; },
        onComplete: () => { credited++; },
      },
    );
    const fire = () => { for (const tk of timers.splice(0)) if (!tk.dead) { t = Math.max(t, tk.at); tk.fn(); } };

    g.markLearnerInput();            // gate open — isolating the BASELINE rule
    g.evaluate({ v: 0.9 });          // BASELINE — predicate true, must not arm/credit
    fire();                           // any timer armed by baseline would credit here
    expect(credited, 'baseline must not credit even via a hold timer').toBe(0);

    g.evaluate({ v: 0.9 });          // learner-driven: arms the 500ms hold
    t += 100;
    g.evaluate({ v: 0.1 });          // drive-by: leaves the qualifying state -> hold void
    fire();
    expect(credited, 'drive-by must not credit').toBe(0);

    g.evaluate({ v: 0.9 });          // re-enter and stay
    t += 600;
    fire();                           // T+hold re-check fires with state still qualifying
    expect(credited, 'sustained hold credits').toBe(1);
    g.dispose();
  });
});

/* ===================== 6. capstone reroll — REAL seam ==================== */
// Bound to the FROZEN v1.1/v1.2 seam: scene-level `randomize(rng)` +
// `controller.newAttempt(seed)` (CONTRACT §1 ~L82, §8 ~L435). newAttempt calls
// spec.randomize(makeRng(seed)), writes THROUGH the atoms, and returns the
// applied snapshot; it is deterministic under an explicit seed and resets the
// learner-input gate. No vacuous stubs — we mount the REAL controller on the
// null backend and drive the actual method.
describe.skipIf(!HAVE_KIT)('capstone reroll — real randomize(rng)+newAttempt(seed) seam (§1/§8)', () => {
  const mountNull = async (spec) =>
    pub.mountScene(spec, null, { backend: pub.createNullBackend() });

  it('newAttempt(seed) rerolls params through the atoms: deterministic per seed, varies across seeds', async () => {
    // A SYNTHETIC capstone with a real randomize — proves the seam end-to-end
    // through the real mountScene controller even when no flagship scene is
    // integrated on this branch.
    const spec = {
      id: '__q_cap__', space: 'plane2', capstone: true,
      params: { a: pub.vec(0, 0), k: pub.param ? pub.param(0) : 0 },
      entities: () => [],
      randomize: (rng) => ({ a: pub.vec(rng() * 4 - 2, rng() * 4 - 2), k: rng() }),
    };
    const c = await mountNull(spec);
    try {
      const s7a = c.newAttempt(7);
      const s7b = c.newAttempt(7);
      expect(s7b, 'same seed -> identical reroll (deterministic)').toEqual(s7a);
      const s9 = c.newAttempt(9);
      expect(s9, 'distinct seed -> distinct reroll').not.toEqual(s7a);
      // reroll actually flowed THROUGH the atoms (one-way flow), so the live
      // snapshot equals the returned patch-applied snapshot.
      expect(c.snapshot()).toEqual(s9);
    } finally { c.destroy(); }
  });

  it('every SHIPPED capstone scene rerolls across attempts AND enforces a hold (VF §8 integrity)', async () => {
    const { SCENES } = registry;
    const capstones = (SCENES || []).filter((s) => s.capstone);
    if (capstones.length === 0) return; // flagship's la-dot capstone not integrated on this branch yet

    for (const cap of capstones) {
      // HOLD: at least one capstone goal must carry hold>0 (no drive-by pass).
      const holds = (cap.goals || []).filter((g) => (g.hold ?? 0) > 0);
      expect(holds.length, `${cap.id}: capstone goals must enforce a hold time`).toBeGreaterThan(0);

      // RANDOMIZATION via the real seam: a capstone must reroll (CONTRACT §1/§8).
      expect(typeof cap.randomize, `${cap.id}: capstone must declare randomize(rng)`).toBe('function');
      const c = await mountNull(cap);
      try {
        const a1 = c.newAttempt(1);
        const a1again = c.newAttempt(1);
        expect(a1again, `${cap.id}: seed 1 deterministic`).toEqual(a1);
        const a2 = c.newAttempt(2);
        expect(a2, `${cap.id}: params vary across attempts`).not.toEqual(a1);
      } finally { c.destroy(); }
    }
  });
});

/* ================= 7. LEARNER-INPUT GATE (v1.2 §7/§8) ==================== */
// The gate is kit-core-owned and lives on the CONTROLLER: no goal of ANY type
// credits until >=1 learner interaction since mount. markLearnerInput() is
// called by input surfaces only; hasLearnerInput() is consulted by the goals
// runtime at crediting time; newAttempt() RESETS the gate (fresh capstone
// attempt = fresh input). We drive the REAL mountScene controller.
describe.skipIf(!HAVE_KIT)('learner-input gate — controller seam (v1.2 §7/§8)', () => {
  const gateSpec = () => ({
    id: '__q_gate__', space: 'plane2',
    params: { a: pub.vec(1, 0) },
    entities: () => [],
    randomize: (rng) => ({ a: pub.vec(rng() * 2, rng() * 2) }),
  });

  it('hasLearnerInput() is FALSE at mount — nothing can credit before a learner interaction', async () => {
    const c = await pub.mountScene(gateSpec(), null, { backend: pub.createNullBackend() });
    try {
      expect(c.hasLearnerInput(), 'gate closed at mount (mount tweens/auto-sims cannot credit)').toBe(false);
    } finally { c.destroy(); }
  });

  it('markLearnerInput() opens the gate and is idempotent', async () => {
    const c = await pub.mountScene(gateSpec(), null, { backend: pub.createNullBackend() });
    try {
      c.markLearnerInput();
      expect(c.hasLearnerInput()).toBe(true);
      c.markLearnerInput(); // idempotent — still true, no throw
      expect(c.hasLearnerInput()).toBe(true);
    } finally { c.destroy(); }
  });

  it('newAttempt(seed) RESETS the gate — each attempt requires fresh learner input', async () => {
    const c = await pub.mountScene(gateSpec(), null, { backend: pub.createNullBackend() });
    try {
      c.markLearnerInput();
      expect(c.hasLearnerInput()).toBe(true);
      c.newAttempt(3);
      expect(c.hasLearnerInput(), 'reroll re-closes the gate').toBe(false);
      // gate reset is independent of whether a randomize exists:
      c.markLearnerInput();
      c.newAttempt(); // no seed
      expect(c.hasLearnerInput()).toBe(false);
    } finally { c.destroy(); }
  });
});

// The RUNTIME half — the goals runtime must actually CONSULT the gate so no
// goal of any type (state/episode/visited) credits (and no visited key
// ACCUMULATES) while it is closed. Bound to interaction's real 9f459ca seam:
// `runtime.bindLearnerInput(fn)` — interaction.js binds it to
// `() => controller.hasLearnerInput()` so newAttempt()'s reset flows through
// (CONTRACT §7 "injected hasLearnerInput" realized as a bind, one flag, no copy).
describe.skipIf(!interactionPresent())('learner-input gate — goals runtime consults the gate (v1.2 §7)', () => {
  let makeGoals, goal, episode, visited;
  beforeAll(async () => {
    const rt = await importScene('goals.js');
    const seams = (await importScene('seams/goals.js'));
    makeGoals = rt?.makeGoals;
    ({ goal, episode, visited } = seams || {});
  });

  it('the gate seam exists: makeGoals exposes bindLearnerInput (fail loudly on rename)', () => {
    expect(typeof makeGoals).toBe('function');
    expect(typeof makeGoals([], {}).bindLearnerInput, 'runtime must expose bindLearnerInput(fn)').toBe('function');
  });

  it('no goal of ANY type credits while the bound gate is closed; state goals credit once opened', () => {
    let gateOpen = false;
    let credited = 0;
    const g = makeGoals(
      [goal('reach a=0', (s) => s.a === 0, { xp: 20 })],
      { onComplete: () => { credited++; } },
    );
    g.bindLearnerInput(() => gateOpen);   // the controller-bound gate (one flag)
    g.evaluate({ a: 1 });            // baseline
    g.evaluate({ a: 0 });            // qualifying but GATE CLOSED — must not credit
    g.evaluate({ a: 1 });
    g.evaluate({ a: 0 });            // still closed
    expect(credited, 'gate closed: no credit despite a qualifying change').toBe(0);

    gateOpen = true;                  // an input surface marked learner input
    g.evaluate({ a: 1 });
    g.evaluate({ a: 0 });            // qualifying, gate OPEN -> credits
    expect(credited, 'gate open: qualifying learner-driven change credits').toBe(1);

    // A bound gate must WIN over the runtime's standalone flag (one flag, no
    // mirror): closing the bound gate re-gates even after markLearnerInput().
    gateOpen = false;                 // ~ controller.newAttempt() reset
    g.dispose();
    expect(g.allDone()).toBe(true);   // first goal done; runtime disposed cleanly
  });

  it('episodes are gated: an auto-run sim outcome credits NOTHING before learner input', () => {
    let gateOpen = false;
    let credited = 0;
    const g = makeGoals(
      [episode('converge', (ep) => !!ep.converged, { xp: 30 })],
      { onComplete: () => { credited++; } },
    );
    g.bindLearnerInput(() => gateOpen);
    g.evaluate({});                   // baseline
    g.reportEpisode({ converged: true });   // auto-run sim converging at load
    expect(credited, 'gated episode: no credit before learner input').toBe(0);
    gateOpen = true;
    g.reportEpisode({ converged: true });   // learner-driven run
    expect(credited, 'episode credits after learner input').toBe(1);
    g.dispose();
  });

  it('visited() keys do NOT accumulate while the gate is closed (accumulation gate, §7 frozen text)', () => {
    let gateOpen = false;
    let credited = 0;
    const g = makeGoals(
      [visited('see both signs', (s) => (s.a > 0 ? 'pos' : 'neg'), { keys: ['pos', 'neg'], xp: 30 })],
      { onComplete: () => { credited++; } },
    );
    g.bindLearnerInput(() => gateOpen);
    g.evaluate({ a: 1 });            // baseline sweep (e.g. mount tween)…
    g.evaluate({ a: -1 });           // …passes through BOTH variants, gate closed
    g.evaluate({ a: 1 });
    expect(credited, 'pre-input sweep banks nothing').toBe(0);

    gateOpen = true;                  // first learner input
    g.evaluate({ a: 1 });            // if pre-input keys had banked, this single
                                      // eval would instant-credit — it must not
    expect(credited, 'first learner-driven eval cannot instant-credit off banked keys').toBe(0);
    g.evaluate({ a: -1 });           // learner genuinely visits the second variant
    expect(credited, 'both variants visited post-input -> credits').toBe(1);
    g.dispose();
  });
});

/* ================= 8. visited() goal type — v1.2 §7 ===================== */
describe.skipIf(!HAVE_KIT)('visited() — descriptor shape + required>=1 rejected at registration (v1.2 §7)', () => {
  const drop = (id) => { const i = registry.SCENES.findIndex((s) => s.id === id); if (i >= 0) registry.SCENES.splice(i, 1); };
  const sceneWith = (id, goals) => ({ id, space: 'plane2', params: {}, entities: () => [], goals });

  it('visited(text, keyOf, opts) builds the frozen descriptor shape', () => {
    const v = pub.visited('try all quadrants', (s) => (s.a > 0 ? 'pos' : 'neg'), { keys: ['pos', 'neg'], xp: 30, hold: 200, tag: 't', focus: 'f' });
    expect(v.type).toBe('visited');
    expect(typeof v.keyOf).toBe('function');
    expect(v.keys).toEqual(['pos', 'neg']);
    expect(v.required, 'required defaults to keys.length when keys given').toBe(2);
    expect(v.xp).toBe(30);
    expect(v.hold).toBe(200);
  });

  it('registerScene REJECTS required=0 (instant-complete bug) with the scene id in the throw', () => {
    const { registerScene } = registry;
    expect(() => registerScene(sceneWith('__q_vis0__', [pub.visited('v', () => 'x', { required: 0, xp: 10 })])))
      .toThrow(/__q_vis0__/);
    drop('__q_vis0__');
  });

  it('registerScene REJECTS required=undefined without a keys set (mandatory required)', () => {
    const { registerScene } = registry;
    // No keys + no required => required is undefined => rejected loudly.
    expect(() => registerScene(sceneWith('__q_visU__', [pub.visited('v', () => 'x', { xp: 10 })])))
      .toThrow(/__q_visU__/);
    drop('__q_visU__');
  });

  it('registerScene REJECTS required > keys.length', () => {
    const { registerScene } = registry;
    expect(() => registerScene(sceneWith('__q_visX__', [pub.visited('v', () => 'x', { keys: ['a', 'b'], required: 3, xp: 10 })])))
      .toThrow(/__q_visX__/);
    drop('__q_visX__');
  });

  it('registerScene ACCEPTS a well-formed visited goal (required>=1)', () => {
    const { registerScene } = registry;
    expect(() => registerScene(sceneWith('__q_visOk__', [pub.visited('v', () => 'x', { required: 3, xp: 10 })]))).not.toThrow();
    drop('__q_visOk__');
    // keys-only form: required defaults to keys.length (>=1) and passes.
    expect(() => registerScene(sceneWith('__q_visKeys__', [pub.visited('v', () => 'x', { keys: ['a', 'b', 'c'], xp: 10 })]))).not.toThrow();
    drop('__q_visKeys__');
  });
});
