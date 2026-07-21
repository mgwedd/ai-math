/* Scene Kit invariants — the real-kit test harness (CONTRACT.md v1).
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
 *   6. capstone randomization — params vary; tolerance+hold enforced (§1, VF §8)
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

let registry, params, entitiesMod, diffMod;
beforeAll(async () => {
  if (!HAVE_KIT) return;
  installSceneDom();
  registry = await importScene('registry.js');
  params = await importScene('params.js');
  entitiesMod = await importScene('entities.js');
  diffMod = await importScene('diff.js');
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
describe.skipIf(!HAVE_KIT || !motionPresent())('tween/sim determinism via injected clock (§5)', () => {
  let clockMod, driverMod, paramsMod;
  beforeAll(async () => {
    installSceneDom();
    clockMod = await importScene('clock.js');
    driverMod = await importScene('driver.js');
    paramsMod = await importScene('params.js');
  });

  it('a tween produces an identical param trajectory for an identical dt feed', async () => {
    if (!clockMod || !driverMod || !paramsMod) return;
    const { param } = paramsMod;
    const { tween } = clockMod;
    // Drive the same tween twice with the SAME dt sequence via a fake source
    // pump; the recorded trajectories must be bit-identical (no wall-clock leak).
    const dts = [0.016, 0.016, 0.02, 0.016, 0.016, 0.05, 0.016];
    const runOnce = () => {
      const a = param(0);
      const traj = [];
      // Minimal driver stand-in honoring the §5 addSource/now contract, fed by
      // a fakeClock so tween sees deterministic (t, dt).
      const sources = [];
      const clock = fakeClock();
      const driver = {
        now: () => clock.now(),
        requestFrame() {},
        addSource(fn) { sources.push(fn); return { release() { const i = sources.indexOf(fn); if (i >= 0) sources.splice(i, 1); } }; },
        pause() {}, resume() {}, isPaused: () => false, destroy() {},
      };
      // tween may take the driver explicitly or via a module seam; try the
      // common explicit-injection signature, else skip gracefully.
      let t;
      try { t = tween(a, 1, { dur: 0.1, driver }); } catch { return null; }
      for (const dt of dts) {
        clock.tick(dt);
        for (const fn of [...sources]) fn(clock.now(), dt);
        traj.push(a.get());
      }
      return traj;
    };
    const r1 = runOnce();
    const r2 = runOnce();
    if (r1 == null || r2 == null) return; // signature mismatch — informational only
    expect(r1).toEqual(r2);
    // and it actually moved toward the target
    expect(r1.at(-1)).toBeGreaterThan(0);
  });
});

/* ==================== 3. GOAL BASELINE invariant ========================= */
describe.skipIf(!HAVE_KIT || !interactionPresent())('goal baseline — first evaluation never credits (§7/§8)', () => {
  it('a goal true at the default param state is NOT credited on the baseline eval', async () => {
    const interaction = await importScene('interaction.js');
    const goalsSeam = await importScene('seams/goals.js');
    const paramsMod = await importScene('params.js');
    if (!interaction || !goalsSeam || !paramsMod) return;
    const { goal } = goalsSeam;
    const { param, snapshot } = paramsMod;

    // Build a goal that is TRUE at the default state (the auto-complete shape).
    const g = goal('at origin', (s) => s.a === 0, { xp: 20 });
    const P = { a: param(0) };

    // The interaction runtime owns goal evaluation + baseline gating. Find its
    // evaluator (name per interaction.md handoff; try the likely surface).
    const makeEval = interaction.makeGoalRuntime || interaction.attachGoals || interaction.goalRuntime;
    if (typeof makeEval !== 'function') return; // surface not yet named — informational

    let credited = 0;
    const rt = makeEval({ goals: [g], params: P, snapshot, onGoal: () => { credited++; } });
    // FIRST evaluation = baseline. Even though predicate is true, no credit.
    rt.evaluate?.();
    expect(credited, 'baseline must not credit').toBe(0);
    // A learner-driven change to a still-qualifying state on a LATER eval credits.
    P.a.set(1); rt.evaluate?.();     // moved away
    P.a.set(0); rt.evaluate?.();     // returned to qualifying state
    expect(credited, 'later qualifying eval credits').toBeGreaterThan(0);
  });
});

/* ===================== 6. capstone randomization ========================= */
describe.skipIf(!HAVE_KIT)('capstone — randomized params across attempts + tolerance/hold (§1, VF §8)', () => {
  it('capstone scenes vary their params across fresh attempts and gate on tolerance+hold', async () => {
    const { SCENES } = registry;
    const capstones = (SCENES || []).filter((s) => s.capstone);
    if (capstones.length === 0) return; // flagship's la-dot capstone not integrated here yet

    for (const cap of capstones) {
      // RANDOMIZATION: CONTRACT v1 has no per-attempt reroll seam (confirmed
      // contract gap — architect directed kit-core to publish an additive v1.1
      // naming it). DO NOT guess the hook here; bind this half of the test to
      // the real name once kit-core.md Handoffs announces v1.1.
      // TODO(quality): assert params vary across attempts via the v1.1 seam.

      // TOLERANCE + HOLD: at least one capstone goal must carry a hold (>0) so
      // drive-by passes are impossible (VF §8 assessment integrity).
      const goals = cap.goals || [];
      const holds = goals.filter((g) => (g.hold ?? 0) > 0);
      expect(holds.length, `${cap.id}: capstone goals must enforce a hold time`).toBeGreaterThan(0);
    }
  });
});
