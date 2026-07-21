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

let SCENES, validateScenes, toAtoms, view, snapshot;
let makeRng, mountScene, createNullBackend;
let scenesForLesson, capstoneFor, validateSceneLessons;

const LESSON = 'la-dot';
const EXPECTED_IDS = [
  'dot.anatomy', 'dot.alignment', 'dot.threegoals', 'dot.scaleinvariance',
  'dot.search', 'dot.attention', 'dot.capstone',
];

// pure vec helpers for building witness states (mirror ./vec-math)
const mag = (v) => Math.hypot(v.x, v.y);
const dot = (a, b) => a.x * b.x + a.y * b.y;
const scale = (v, k) => ({ x: v.x * k, y: v.y * k });
const unit = (v) => { const m = mag(v) || 1; return { x: v.x / m, y: v.y / m }; };
const fromPolar = (r, th) => ({ x: r * Math.cos(th), y: r * Math.sin(th) });
const angleOf = (v) => Math.atan2(v.y, v.x);

beforeAll(async () => {
  const kit = await import('../lib/scene/index.js');
  ({ SCENES, validateScenes, toAtoms, view, snapshot,
     makeRng, mountScene, createNullBackend } = kit);
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

describe('THE GOAL-BASELINE INVARIANT: nothing is satisfied at load', () => {
  it('no goal predicate is true at any scene’s initial params', () => {
    const offenders = [];
    for (const s of scenesForLesson(LESSON)) {
      const s0 = initialSnapshot(s);
      s.goals.forEach((g, i) => { if (g.predicate(s0)) offenders.push(s.id + ' #' + i); });
    }
    expect(offenders).toEqual([]);
  });
  it('the randomized capstone is baseline-clean for 200 seeds', () => {
    const cap = capstoneFor(LESSON);
    const offenders = [];
    for (let seed = 1; seed <= 200; seed++) {
      const s0 = cap.randomize(makeRng(seed));
      cap.goals.forEach((g, i) => { if (g.predicate(s0)) offenders.push(seed + '#' + i); });
    }
    expect(offenders).toEqual([]);
  });
});

describe('REACHABILITY: every goal has a satisfying state', () => {
  // Coarse grid over the free vec params of a scene → candidate snapshots.
  function gridReach(scene, freeVecs, lo = -4, hi = 4, step = 0.5) {
    const base = initialSnapshot(scene);
    const axis = [];
    for (let v = lo; v <= hi + 1e-9; v += step) axis.push(+v.toFixed(3));
    const pts = [];
    for (const x of axis) for (const y of axis) pts.push({ x, y });
    const met = scene.goals.map(() => false);
    // nested product over the free vec params
    const rec = (k, s) => {
      if (k === freeVecs.length) {
        scene.goals.forEach((g, i) => { if (!met[i] && g.predicate(s)) met[i] = true; });
        return;
      }
      for (const pt of pts) rec(k + 1, { ...s, [freeVecs[k]]: pt });
    };
    rec(0, { ...base });
    return met;
  }

  it('dot.anatomy — all goals reachable (free a, b)', () => {
    expect(gridReach(scenesForLesson(LESSON)[0], ['a', 'b'])).toEqual([true, true, true]);
  });
  it('dot.threegoals — all goals reachable (free a, b)', () => {
    expect(gridReach(scenesForLesson(LESSON)[2], ['a', 'b'])).toEqual([true, true, true]);
  });
  it('dot.search — all goals reachable (free q)', () => {
    expect(gridReach(scenesForLesson(LESSON)[4], ['q'], -4, 4, 0.25)).toEqual([true, true, true]);
  });

  // Constrained scenes: explicit witnesses respecting the constraint.
  it('dot.alignment — anchors reachable on the circle', () => {
    const s = scenesForLesson(LESSON)[1];
    const A = { x: 2.4, y: 0.8 }, R = mag(A);
    const aligned = scale(unit(A), R);
    const ortho = scale(unit({ x: -A.y, y: A.x }), R);
    const opposed = scale(unit(A), -R);
    expect(s.goals[0].predicate({ b: aligned })).toBe(true);
    expect(s.goals[1].predicate({ b: ortho })).toBe(true);
    expect(s.goals[2].predicate({ b: opposed })).toBe(true);
  });
  it('dot.scaleinvariance — reachable with a on its ray', () => {
    const s = scenesForLesson(LESSON)[3];
    const DIR = { x: 2.0, y: 1.0 };
    expect(s.goals[0].predicate({ a: scale(DIR, 5), b: scale(DIR, 1) })).toBe(true);  // dot>8, cos>0.8
    expect(s.goals[1].predicate({ a: DIR, b: scale(DIR, -1) })).toBe(true);            // dot<0
    expect(s.goals[2].predicate({ a: scale(DIR, 0.08), b: scale(DIR, 1) })).toBe(true);// cos>0.9, dot<1.5
  });
  it('dot.attention — reachable via query + temperature knob', () => {
    const s = scenesForLesson(LESSON)[5];
    const K = [{ x: 2.2, y: 0.5 }, { x: 0.4, y: 2.3 }, { x: -2.0, y: 0.8 }, { x: 0.7, y: -2.1 }];
    const yLo = -4, yHi = 4;                                  // track ends → T_MIN / T_MAX
    expect(s.goals[0].predicate({ q: K[0], tk: { x: 5.2, y: yLo } })).toBe(true);  // concentrate
    expect(s.goals[1].predicate({ q: { x: 1.8, y: 1.2 }, tk: { x: 5.2, y: yHi } })).toBe(true); // flatten
    expect(s.goals[2].predicate({ q: K[2], tk: { x: 5.2, y: yLo } })).toBe(true);  // focus on k3
  });
  it('dot.capstone — every target reachable for many seeds', () => {
    const cap = capstoneFor(LESSON);
    for (let seed = 1; seed <= 50; seed++) {
      const p = cap.randomize(makeRng(seed));
      const bForDot = scale(p.a, p.dotTarget / dot(p.a, p.a));            // dot(a,b)=T
      const bForCos = fromPolar(1, angleOf(p.a) + Math.acos(p.cosTarget)); // cos=C
      const bForAng = fromPolar(1, angleOf(p.a) + (p.angTarget * Math.PI) / 180);
      expect(cap.goals[0].predicate({ ...p, b: bForDot })).toBe(true);
      expect(cap.goals[1].predicate({ ...p, b: bForCos })).toBe(true);
      expect(cap.goals[2].predicate({ ...p, b: bForAng })).toBe(true);
    }
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
  it('has at least one hold>0 goal (drive-by passes are blocked)', () => {
    expect(capstoneFor(LESSON).goals.some((g) => g.hold > 0)).toBe(true);
  });
});
