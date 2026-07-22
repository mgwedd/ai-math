/* Scene lesson — la-matrix headless tests (Vitest, node env).

   P1 migration wave 1, lesson 2. Scenes are DATA + PURE PREDICATES; these
   need no GPU. Baseline-cleanliness + reachability run through the SHARED
   quality helpers (CONTRACT v1.4 §6, test/helpers/scene-invariants.mjs).
   The rotation scene's control is a `slider` (a scalar param, not a vec
   handle), so its reachability is searched via an explicit scalar `dims`.
   The helpers don't cover gameability, so the collapse/determinant goals
   carry per-goal ANTI-GAMING tests (degenerate stays false; legit credits).
   Tag migration + the reroll seam round it out. */
import { describe, it, expect, beforeAll } from 'vitest';
import { assertBaselineClean, assertReachable } from './helpers/scene-invariants.mjs';

let makeRng, validateScenes;
let scenesForLesson, capstoneFor, validateSceneLessons;

const LESSON = 'la-matrix';
const EXPECTED_IDS = [
  'matrix.columns', 'matrix.rotation', 'matrix.transform',
  'matrix.zoo', 'matrix.classify', 'matrix.capstone',
];

// pure helpers (mirror ./vec-math) for witnesses + anti-gaming states
const mag = (v) => Math.hypot(v.x, v.y);
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const det2 = (a, b) => a.x * b.y - a.y * b.x;

beforeAll(async () => {
  ({ makeRng, validateScenes } = await import('../lib/scene/index.js'));
  const res = await import('../lib/curriculum/scenes/index.js');   // registers all scene modules
  ({ scenesForLesson, capstoneFor, validateSceneLessons } = res);
});

const sceneAt = (i) => scenesForLesson(LESSON)[i];

describe('registration + validation', () => {
  it('registers the six la-matrix scenes in arc order', () => {
    expect(scenesForLesson(LESSON).map((s) => s.id)).toEqual(EXPECTED_IDS);
  });
  it('passes the kit per-scene validateScenes() with zero problems', () => {
    expect(validateScenes()).toEqual([]);
  });
  it('passes the flagship lesson rule (exactly one capstone, last)', () => {
    expect(validateSceneLessons()).toEqual([]);
    expect(capstoneFor(LESSON).id).toBe('matrix.capstone');
  });
  it('the rotation scene declares a slider control bound to a scalar param', () => {
    const rot = sceneAt(1);
    expect(Array.isArray(rot.controls)).toBe(true);
    expect(rot.controls[0].kind).toBe('slider');
    expect(rot.controls[0].param).toBe('theta');
    expect(typeof rot.params.theta).toBe('number');
  });
  it('every scene is plane2, caption ≤ 3 sentences, 2–5 goals with text/predicate/xp', () => {
    for (const s of scenesForLesson(LESSON)) {
      expect(s.space).toBe('plane2');
      expect(typeof s.caption).toBe('string');
      expect((s.caption.match(/[.!?](\s|$)/g) || []).length).toBeLessThanOrEqual(3);
      expect(s.goals.length).toBeGreaterThanOrEqual(2);
      expect(s.goals.length).toBeLessThanOrEqual(5);
      for (const g of s.goals) {
        expect(g.text.length).toBeGreaterThan(0);
        expect(typeof g.predicate).toBe('function');
        expect(typeof g.xp).toBe('number');
      }
    }
  });
});

describe('baseline-cleanliness (shared helper, capstone ×1000 seeds)', () => {
  for (const id of EXPECTED_IDS) {
    it(id + ' — no goal satisfied at initial params', () => {
      assertBaselineClean(scenesForLesson(LESSON).find((s) => s.id === id));
    });
  }
});

describe('reachability (shared helper — search over handle/param space)', () => {
  it('matrix.columns — free columns (auto-discovered handles)', () => { assertReachable(sceneAt(0)); });
  it('matrix.transform — free input v', () => { assertReachable(sceneAt(2)); });
  it('matrix.zoo — free columns', () => { assertReachable(sceneAt(3)); });

  it('matrix.rotation — angle slider searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(1), { dims: [{ bind: 'theta', range: [-Math.PI, Math.PI], steps: 200 }] });
  });
  it('matrix.classify — separation reachable via analytic witnesses', () => {
    const rotCCW = { col1: { x: 0, y: -1 }, col2: { x: 1, y: 0 } };  // ↻ sends "up"→+x
    const rotCW = { col1: { x: 0, y: 1 }, col2: { x: -1, y: 0 } };   // ↺ sends "up"→−x
    assertReachable(sceneAt(4), { witnesses: () => [rotCCW, rotCW] });
  });
  it('matrix.capstone — every target reachable for every seed (analytic witness)', () => {
    assertReachable(capstoneFor(LESSON), {
      seeds: 50,
      step: 1,   // coarsen the (redundant) auto grid past the combo guard — witnesses do the proving
      witnesses: (base) => [{ ...base, col1: base.tCol1, col2: base.tCol2 }],  // exact reproduction hits all 3
    });
  });
});

describe('capstone: weak-area tag migration + the official reroll seam', () => {
  it('carries the old quiz’s three weak-area tags', () => {
    const tags = capstoneFor(LESSON).goals.map((g) => g.tag);
    expect(new Set(tags)).toEqual(new Set(['columns rule', 'reading transformations', 'matrix-vector multiply']));
    for (const g of capstoneFor(LESSON).goals) expect(typeof g.focus).toBe('string');
  });
  it('randomize(makeRng(seed)) is deterministic per seed, distinct across seeds', () => {
    const cap = capstoneFor(LESSON);
    expect(typeof cap.randomize).toBe('function');
    const draws = [1, 2, 3, 4, 5].map((seed) => JSON.stringify(cap.randomize(makeRng(seed))));
    expect(new Set(draws).size).toBeGreaterThan(1);          // varied across seeds
    expect(cap.randomize(makeRng(7))).toEqual(cap.randomize(makeRng(7)));
  });
  it('params is the seed-1 draw, so every randomize key has an atom to write through', () => {
    const cap = capstoneFor(LESSON);
    expect(cap.params).toEqual(cap.randomize(makeRng(1)));
  });
  it('every capstone goal has hold>0 (drive-by passes are blocked, exam-wide)', () => {
    expect(capstoneFor(LESSON).goals.every((g) => g.hold > 0)).toBe(true);
  });
  it('capstone TARGET columns are non-identity and real for every seed', () => {
    const cap = capstoneFor(LESSON);
    for (let seed = 1; seed <= 200; seed++) {
      const p = cap.randomize(makeRng(seed));
      // the controls (col1/col2) reset to identity; the TARGETS must sit off it.
      expect(p.col1).toEqual({ x: 1, y: 0 });
      expect(p.col2).toEqual({ x: 0, y: 1 });
      expect(mag(sub(p.tCol1, { x: 1, y: 0 }))).toBeGreaterThan(0.2);  // ★₁ off î
      expect(mag(sub(p.tCol2, { x: 0, y: 1 }))).toBeGreaterThan(0.2);  // ★₂ off ĵ
      expect(mag(p.tCol1)).toBeGreaterThan(0.5);                        // reachable past the minMag floor
      expect(mag(p.tCol2)).toBeGreaterThan(0.5);
    }
  });
});

describe('ANTI-GAMING: degenerate strategies must NOT credit', () => {
  it('matrix.columns g2 (collapse): shrinking a column to near-zero must NOT credit', () => {
    const s = sceneAt(0);
    // tiny col1 → det ≈ 0, but col1 is not a real vector
    expect(s.goals[2].predicate({ col1: { x: 0.02, y: 0.01 }, col2: { x: 0, y: 1 } })).toBe(false);
    // legitimate: two real, parallel columns
    expect(s.goals[2].predicate({ col1: { x: 1, y: 0 }, col2: { x: 2, y: 0 } })).toBe(true);
  });
  it('matrix.classify g3 (invertible separation): a det≈0 squash must NOT credit; a rotation does', () => {
    const s = sceneAt(4);
    // a near-rank-1 map that DOES separate by x but collapses space (|det| < 0.5)
    const squash = { col1: { x: 0, y: 0.3 }, col2: { x: 1, y: 0 } };   // det = -0.3
    expect(s.goals[2].predicate(squash)).toBe(false);
    // the zero matrix separates nothing
    expect(s.goals[0].predicate({ col1: { x: 0, y: 0 }, col2: { x: 0, y: 0 } })).toBe(false);
    // legitimate: a full-rank rotation (det = 1) that separates
    const rotCCW = { col1: { x: 0, y: -1 }, col2: { x: 1, y: 0 } };
    expect(s.goals[2].predicate(rotCCW)).toBe(true);
    expect(Math.abs(det2(rotCCW.col1, rotCCW.col2))).toBeGreaterThan(0.5);
  });
});
