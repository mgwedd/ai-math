/* Flagship scene lesson — la-dot headless tests (Vitest, node env).

   Scenes are DATA + PURE PREDICATES; these tests need no GPU. They
   guard the properties the authoring guide (docs/AUTHORING_SCENES.md)
   makes non-negotiable, against the frozen Scene Kit CONTRACT v1:

   - registration + kit validation clean (per-scene shape + baseline eval);
   - flagship lesson rule: exactly one capstone;
   - THE GOAL-BASELINE INVARIANT: no goal is satisfied at a scene's
     initial params (else the learner walks into a completed goal) —
     checked for every scene, and for the randomized capstone across
     many seeds;
   - REACHABILITY: every goal has at least one satisfying state (an
     impossible goal is worse than an auto-completing one);
   - weak-area TAG MIGRATION: the capstone carries the old quiz's three
     tags so the spaced-review loop survives;
   - the OFFICIAL capstone reroll seam (CONTRACT v1.1 §1/§8):
     randomize(makeRng(seed)) determinism/distinctness, and
     controller.newAttempt(seed) rerolling the mounted scene. */
import { describe, it, expect, beforeAll } from 'vitest';
// Platform invariants extracted to the shared helper (CONTRACT v1.4 §6). The
// per-scene baseline/reachability checks below now delegate to it — proving the
// generic helper reproduces (and generalizes) the hand-written checks it replaces.
import { assertBaselineClean, assertReachable } from './helpers/scene-invariants.mjs';

let SCENES, validateScenes, toAtoms, view, snapshot;
let makeRng, mountScene, createNullBackend, registerScene;
let scenesForLesson, capstoneFor, validateSceneLessons;

const LESSON = 'la-dot';
const EXPECTED_IDS = [
  'dot.anatomy', 'dot.alignment', 'dot.threegoals', 'dot.scaleinvariance',
  'dot.search', 'dot.attention', 'dot.capstone',
];

// pure vec helpers for building witness states (mirror ./vec-math)
const dot = (a, b) => a.x * b.x + a.y * b.y;
const scale = (v, k) => ({ x: v.x * k, y: v.y * k });
const fromPolar = (r, th) => ({ x: r * Math.cos(th), y: r * Math.sin(th) });
const angleOf = (v) => Math.atan2(v.y, v.x);

beforeAll(async () => {
  const kit = await import('../lib/scene/index.js');
  ({ SCENES, validateScenes, toAtoms, view, snapshot,
     makeRng, mountScene, createNullBackend, registerScene } = kit);
  const res = await import('../lib/curriculum/scenes/index.js');   // registers la-dot scenes
  ({ scenesForLesson, capstoneFor, validateSceneLessons } = res);
});

const initialSnapshot = (scene) => snapshot(toAtoms(scene.params || {}));

describe('registration + validation', () => {
  it('registers the seven la-dot scenes in arc order', () => {
    const ids = scenesForLesson(LESSON).map((s) => s.id);
    expect(ids).toEqual(EXPECTED_IDS);
  });
  it('passes the kit per-scene validateScenes() with zero problems', () => {
    expect(validateScenes()).toEqual([]);
  });
  it('passes the flagship lesson rule (exactly one capstone)', () => {
    expect(validateSceneLessons()).toEqual([]);
    expect(capstoneFor(LESSON).id).toBe('dot.capstone');
  });
  it('validateSceneLessons rejects an empty-goals capstone (CONTRACT v1.3 §4 mirror)', () => {
    // register a synthetic scene under a synthetic lesson; the kit accepts a
    // goals-less scene (goals is optional at scene level) — the >= 1-goal rule
    // for CAPSTONES is a lesson-level property owned by this validator.
    registerScene({ id: '__test.emptycap', lesson: '__test-lesson__', capstone: true,
      space: 'plane2', params: {}, entities: () => [], goals: [] });
    try {
      const problems = validateSceneLessons().filter((p) => p.includes('__test-lesson__'));
      expect(problems.join(' ')).toContain('declares no goals');
      expect(problems.join(' ')).toContain('__test.emptycap');
    } finally {
      SCENES.splice(SCENES.findIndex((s) => s.id === '__test.emptycap'), 1);
    }
    expect(validateSceneLessons()).toEqual([]);   // registry clean again
  });
  it('every scene is plane2, has a caption ≤ 3 sentences, and 2–5 goals', () => {
    for (const s of scenesForLesson(LESSON)) {
      expect(s.space).toBe('plane2');
      expect(typeof s.caption).toBe('string');
      expect((s.caption.match(/[.!?](\s|$)/g) || []).length).toBeLessThanOrEqual(3);
      expect(s.goals.length).toBeGreaterThanOrEqual(2);
      expect(s.goals.length).toBeLessThanOrEqual(5);
    }
  });
  it('every goal carries text, a predicate, and numeric xp', () => {
    for (const s of scenesForLesson(LESSON)) {
      for (const g of s.goals) {
        expect(g.text.length).toBeGreaterThan(0);
        expect(typeof g.predicate).toBe('function');
        expect(typeof g.xp).toBe('number');
      }
    }
  });
});

describe('entities evaluate to a pure display list at baseline', () => {
  it('every scene returns a non-empty array of descriptors', () => {
    for (const s of scenesForLesson(LESSON)) {
      const list = s.entities(view(toAtoms(s.params || {})), 0);
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const e of list) expect(typeof e.kind).toBe('string');
    }
  });
});

describe('THE GOAL-BASELINE INVARIANT: nothing is satisfied at load (shared helper)', () => {
  // One assertion per scene through the platform helper: a static scene is
  // checked at its initial params; the capstone across 1000 reroll seeds
  // (the helper detects `randomize` and iterates seeds itself).
  for (const id of EXPECTED_IDS) {
    it(id + ' is baseline-clean', () => {
      const s = scenesForLesson(LESSON).find((x) => x.id === id);
      expect(assertBaselineClean(s, { seeds: 1000 })).toBe(true);
    });
  }
  // Belt-and-suspenders: the aggregate check the reference asserted, so a
  // regression that only bites one scene still trips a named offender list.
  it('no goal predicate is true at any scene’s initial params (aggregate)', () => {
    const offenders = [];
    for (const s of scenesForLesson(LESSON)) {
      const s0 = initialSnapshot(s);
      s.goals.forEach((g, i) => { if (g.predicate(s0)) offenders.push(s.id + ' #' + i); });
    }
    expect(offenders).toEqual([]);
  });
});

describe('REACHABILITY: every goal has a satisfying state (shared helper search)', () => {
  // The helper auto-discovers each scene's handle-bound dims from its display
  // list and grids them THROUGH the constraint closures — so the constrained
  // scenes (circle/ray/track) that the reference had to hand-witness are now
  // reached by pure search, no per-scene witnesses. Search cost stays tiny
  // (constrained candidates dedupe onto their manifold).
  const STEP = { 'dot.search': 0.25 };            // single free dim, tight top-k goals
  for (const id of ['dot.anatomy', 'dot.alignment', 'dot.threegoals',
    'dot.scaleinvariance', 'dot.search', 'dot.attention']) {
    it(id + ' — every goal reachable by searching handle space', () => {
      const s = scenesForLesson(LESSON).find((x) => x.id === id);
      expect(assertReachable(s, { step: STEP[id] ?? 0.5 })).toBe(true);
    });
  }

  // Capstone: tolerances (±0.03 cos) are too tight for a coarse grid, so we
  // hand the search analytic witnesses per seed (the intended escape hatch).
  it('dot.capstone — every target reachable for many seeds (analytic witnesses)', () => {
    const cap = capstoneFor(LESSON);
    const witnesses = (p) => [
      { ...p, b: scale(p.a, p.dotTarget / dot(p.a, p.a)) },            // dot(a,b)=T
      { ...p, b: fromPolar(1, angleOf(p.a) + Math.acos(p.cosTarget)) }, // cos=C
      { ...p, b: fromPolar(1, angleOf(p.a) + (p.angTarget * Math.PI) / 180) }, // angle=A
    ];
    expect(assertReachable(cap, { seeds: 50, witnesses })).toBe(true);
  });
});

describe('capstone: weak-area tag migration + the official reroll seam', () => {
  it('carries the old quiz’s three weak-area tags', () => {
    const tags = capstoneFor(LESSON).goals.map((g) => g.tag);
    expect(new Set(tags)).toEqual(new Set(['dot product arithmetic', 'cosine similarity', 'sign vs angle']));
    for (const g of capstoneFor(LESSON).goals) expect(typeof g.focus).toBe('string');
  });
  it('randomize(makeRng(seed)) is deterministic per seed, distinct across seeds', () => {
    const cap = capstoneFor(LESSON);
    expect(typeof cap.randomize).toBe('function');        // CONTRACT v1.1 §1 seam
    const draws = [1, 2, 3, 4, 5].map((seed) => JSON.stringify(cap.randomize(makeRng(seed))));
    expect(new Set(draws).size).toBe(draws.length);       // distinct across seeds
    expect(cap.randomize(makeRng(7))).toEqual(cap.randomize(makeRng(7))); // same seed → same draw
  });
  it('params is the seed-1 draw, so every randomize key has an atom to write through', () => {
    const cap = capstoneFor(LESSON);
    expect(cap.params).toEqual(cap.randomize(makeRng(1)));
  });
  it('controller.newAttempt(seed) rerolls the mounted capstone (CONTRACT §8)', async () => {
    const cap = capstoneFor(LESSON);
    const noRaf = { raf: () => 0, caf: () => {} };        // never tick; we only exercise newAttempt
    const c = await mountScene(cap, null, { backend: createNullBackend(), ...noRaf });
    const s42 = c.newAttempt(42);
    expect(s42).toEqual(cap.randomize(makeRng(42)));      // flows through the atoms, deterministic
    expect(c.snapshot()).toEqual(s42);                    // atoms actually hold the reroll
    cap.goals.forEach((g) => expect(g.predicate(s42)).toBe(false)); // fresh attempt is baseline-clean
    c.destroy();
  });
  it('the learner-input gate (v1.2 §7) arms on input and RESETS on newAttempt', async () => {
    const cap = capstoneFor(LESSON);
    const noRaf = { raf: () => 0, caf: () => {} };
    const c = await mountScene(cap, null, { backend: createNullBackend(), ...noRaf });
    expect(c.hasLearnerInput()).toBe(false);              // mount: nothing can credit yet
    c.markLearnerInput();                                 // input surfaces call this (interaction)
    expect(c.hasLearnerInput()).toBe(true);
    c.newAttempt(7);                                      // each capstone attempt needs FRESH input
    expect(c.hasLearnerInput()).toBe(false);
    c.destroy();
  });
  it('every capstone goal has hold>0 (drive-by passes are blocked, exam-wide)', () => {
    expect(capstoneFor(LESSON).goals.every((g) => g.hold > 0)).toBe(true);
  });
});

describe('ANTI-GAMING: degenerate (zero-vector) strategies must NOT credit', () => {
  // Review-confirmed defects: three goals could be "solved" by shrinking a
  // vector to (near-)nothing or zeroing a query, rather than by actually
  // reasoning about angle/temperature. Each case below plays the degenerate
  // strategy first (must stay false) then the legitimate strategy (must
  // credit) — proving the fix blocks the exploit without breaking the goal.

  it('dot.anatomy g2 (fold a ⟂ b): shrinking a to near-zero must NOT credit', () => {
    const s = scenesForLesson(LESSON)[0];
    // exact repro of the confirmed defect: a shrunk to ~0.047 magnitude at
    // 46.7° off perpendicular to b — near-zero projection from magnitude,
    // not from a genuine right angle.
    const b = { x: 1.4, y: 2.4 };
    const th = Math.atan2(b.y, b.x) + Math.PI / 2 - (46.7 * Math.PI) / 180;
    const degenerateA = fromPolar(0.047, th);
    expect(s.goals[1].predicate({ a: degenerateA, b })).toBe(false);
    // legitimate: a real, non-degenerate a actually perpendicular to b
    const legitA = fromPolar(2.5, Math.atan2(b.y, b.x) + Math.PI / 2);
    expect(s.goals[1].predicate({ a: legitA, b })).toBe(true);
  });

  it('dot.threegoals g1 (orthogonal): a zero-length vector must NOT credit', () => {
    const s = scenesForLesson(LESSON)[2];
    const b = { x: 1, y: 2.5 };
    // exact zero (the defensive cos()=>0 fallback) — the previously-exploitable case
    expect(s.goals[0].predicate({ a: { x: 0, y: 0 }, b })).toBe(false);
    // near-zero, off-perpendicular — same exploit shape as the anatomy case
    expect(s.goals[0].predicate({ a: { x: 0.01, y: 0.02 }, b })).toBe(false);
    // legitimate: two real, perpendicular vectors
    const legitA = fromPolar(2.5, Math.atan2(b.y, b.x) + Math.PI / 2);
    expect(s.goals[0].predicate({ a: legitA, b })).toBe(true);
  });

  it('dot.attention g2 (flatten): zeroing the query must NOT credit; raising temperature does', () => {
    const s = scenesForLesson(LESSON)[5];
    const baseQ = { x: 1.8, y: 1.2 };
    const yHi = 4; // TK_HI → T_MAX, the track's hottest end
    const yLo = -4; // TK_LO → T_MIN, baseline-ish temperature
    // exploit: zero query -> every dot(q,k)=0 -> uniform 0.25 softmax under
    // ANY temperature, "flattening" for free without ever raising the heat.
    expect(s.goals[1].predicate({ q: { x: 0, y: 0 }, tk: { x: 5.2, y: yHi } })).toBe(false);
    // a real but untouched (cool) temperature must not credit either — the
    // goal is specifically about RAISING the temperature.
    expect(s.goals[1].predicate({ q: baseQ, tk: { x: 5.2, y: yLo } })).toBe(false);
    // legitimate: real query, temperature genuinely raised
    expect(s.goals[1].predicate({ q: baseQ, tk: { x: 5.2, y: yHi } })).toBe(true);
  });
});

describe('P2 wave C — inset gauge retrofit (Amendment v1.7 §2), semantics-preserving', () => {
  it('dot.alignment declares an inset and routes a trace point + reference curve into it', () => {
    const s = scenesForLesson(LESSON).find((x) => x.id === 'dot.alignment');
    expect(s.inset).toEqual({ rect: [0.62, 0.05, 0.33, 0.33], extent: 1.2 });
    const list = s.entities(view(toAtoms(s.params || {})), 0);
    const trace = list.find((e) => e.key === 'trace');
    expect(trace).toBeTruthy();
    expect(trace.frame).toBe('inset');
    expect(list.some((e) => e.kind === 'curve' && e.frame === 'inset')).toBe(true);
    // every main-space entity is untouched (still 'main', the default)
    expect(list.filter((e) => e.kind === 'vector').every((e) => e.frame === 'main')).toBe(true);
  });
  it('no inset entity carries a handle (read-only in v1.6)', () => {
    const s = scenesForLesson(LESSON).find((x) => x.id === 'dot.alignment');
    const list = s.entities(view(toAtoms(s.params || {})), 0);
    for (const e of list.filter((x) => x.frame === 'inset')) expect(e.handle == null).toBe(true);
  });
  it('goals/params/caption are BYTE-IDENTICAL to the pre-inset scene (still 3 goals, same tags)', () => {
    const s = scenesForLesson(LESSON).find((x) => x.id === 'dot.alignment');
    expect(s.goals.length).toBe(3);
    expect(s.goals.map((g) => g.tag)).toEqual(['cosine similarity', 'cosine similarity', 'cosine similarity']);
    expect(s.caption).toBe('Sweep b around the circle — its length is locked, so only the angle changes. Find where cos θ hits +1, 0, and −1.');
  });
});
