/* Scene lesson — la-vecops headless tests (Vitest, node env).

   P1 migration wave 1. Scenes are DATA + PURE PREDICATES; these need no
   GPU. Baseline-cleanliness and reachability are asserted through the
   SHARED quality helpers (CONTRACT v1.4 §6, test/helpers/scene-invariants.mjs
   — copied from origin/ai/p1-quality @ bbb3a2b ahead of integration; the
   chief architect dedupes at merge). The helpers cover baseline + reachability
   but NOT gameability, so every magnitude/determinant goal additionally carries
   a per-goal ANTI-GAMING test in the la-dot style (degenerate strategy stays
   false; legit strategy credits). Tag migration + the reroll seam round it out. */
import { describe, it, expect, beforeAll } from 'vitest';
import { assertBaselineClean, assertReachable } from './helpers/scene-invariants.mjs';

let makeRng, validateScenes;
let scenesForLesson, capstoneFor, validateSceneLessons;

const LESSON = 'la-vecops';
const EXPECTED_IDS = [
  'vecops.addition', 'vecops.scaling', 'vecops.combination',
  'vecops.span', 'vecops.convex', 'vecops.capstone',
];

// pure vec helpers (mirror ./vec-math) for witnesses + anti-gaming states
const mag = (v) => Math.hypot(v.x, v.y);
const dot = (a, b) => a.x * b.x + a.y * b.y;
const det2 = (a, b) => a.x * b.y - a.y * b.x;
const solve2 = (a, b, t) => ({ c1: det2(t, b) / det2(a, b), c2: det2(a, t) / det2(a, b) });
const mapRange = (x, a0, a1, b0, b1) => b0 + ((x - a0) / (a1 - a0)) * (b1 - b0);

// track constants (replicated from la-vecops.js — module-scoped there)
const SC_X = 5.4, C_MIN = -2.5, C_MAX = 2.5;
const yForCS = (c) => mapRange(c, C_MIN, C_MAX, -4, 4);
const C1_X = 5.0, C2_X = 5.9, K_MIN = -3, K_MAX = 3;
const yForK = (k) => mapRange(k, K_MIN, K_MAX, -4, 4);
const CV_X = 5.4, CV_LO = -4, CV_HI = 4;
const VALS = [{ x: -2.4, y: -1.2 }, { x: 2.6, y: -0.8 }, { x: 0.2, y: 2.8 }];
const CAP_C1_X = 5.0, CAP_C2_X = 5.9, CAP_KMIN = -2.6, CAP_KMAX = 2.6;
const capYForK = (k) => mapRange(k, CAP_KMIN, CAP_KMAX, -4, 4);

beforeAll(async () => {
  ({ makeRng, validateScenes } = await import('../lib/scene/index.js'));
  const res = await import('../lib/curriculum/scenes/index.js');   // registers all scene modules
  ({ scenesForLesson, capstoneFor, validateSceneLessons } = res);
});

const sceneAt = (i) => scenesForLesson(LESSON)[i];

describe('registration + validation', () => {
  it('registers the six la-vecops scenes in arc order', () => {
    expect(scenesForLesson(LESSON).map((s) => s.id)).toEqual(EXPECTED_IDS);
  });
  it('passes the kit per-scene validateScenes() with zero problems', () => {
    expect(validateScenes()).toEqual([]);
  });
  it('passes the flagship lesson rule (exactly one capstone, last)', () => {
    expect(validateSceneLessons()).toEqual([]);
    expect(capstoneFor(LESSON).id).toBe('vecops.capstone');
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

/* THE GOAL-BASELINE INVARIANT + REACHABILITY — via the shared helpers
   (CONTRACT v1.4 §6). Static scenes: initial params. Capstone: 1000 seeds.
   Tight-tolerance scenes (combination reach, capstone) hand the reachability
   search analytic witnesses a coarse grid would step over. */
describe('baseline-cleanliness (shared helper, capstone ×1000 seeds)', () => {
  for (const id of EXPECTED_IDS) {
    it(id + ' — no goal satisfied at initial params', () => {
      assertBaselineClean(scenesForLesson(LESSON).find((s) => s.id === id));
    });
  }
});

describe('reachability (shared helper — search over handle/param space)', () => {
  it('vecops.addition — free a, b', () => { assertReachable(sceneAt(0)); });
  it('vecops.scaling — scalar track (auto-discovered)', () => { assertReachable(sceneAt(1)); });
  it('vecops.span — free b', () => { assertReachable(sceneAt(3)); });
  it('vecops.convex — query + temperature track', () => { assertReachable(sceneAt(4)); });

  it('vecops.combination — three targets via analytic witnesses', () => {
    const at = (c1, c2) => (base) => ({ ...base, c1k: { x: C1_X, y: yForK(c1) }, c2k: { x: C2_X, y: yForK(c2) } });
    assertReachable(sceneAt(2), {
      witnesses: (base) => [at(2, 1)(base), at(-1, 2)(base), at(2, -1)(base)],
    });
  });
  it('vecops.capstone — every target reachable for every seed (analytic witnesses)', () => {
    assertReachable(capstoneFor(LESSON), {
      seeds: 50,
      witnesses: (base) => {
        const coord = solve2(base.a, base.b, base.T);   // true (c1,c2) of the star
        return [
          { ...base, c1k: { x: CAP_C1_X, y: capYForK(base.sTarget) } },                                  // scalar target
          { ...base, c1k: { x: CAP_C1_X, y: capYForK(1) }, c2k: { x: CAP_C2_X, y: capYForK(1) } },        // plain a+b
          { ...base, c1k: { x: CAP_C1_X, y: capYForK(coord.c1) }, c2k: { x: CAP_C2_X, y: capYForK(coord.c2) } }, // reach star
        ];
      },
    });
  });
});

describe('capstone: weak-area tag migration + the official reroll seam', () => {
  it('carries the old quiz’s three weak-area tags', () => {
    const tags = capstoneFor(LESSON).goals.map((g) => g.tag);
    expect(new Set(tags)).toEqual(new Set(['vector addition', 'scalar multiplication', 'linear combinations']));
    for (const g of capstoneFor(LESSON).goals) expect(typeof g.focus).toBe('string');
  });
  it('randomize(makeRng(seed)) is deterministic per seed, distinct across seeds', () => {
    const cap = capstoneFor(LESSON);
    expect(typeof cap.randomize).toBe('function');
    const draws = [1, 2, 3, 4, 5].map((seed) => JSON.stringify(cap.randomize(makeRng(seed))));
    expect(new Set(draws).size).toBe(draws.length);
    expect(cap.randomize(makeRng(7))).toEqual(cap.randomize(makeRng(7)));
  });
  it('params is the seed-1 draw, so every randomize key has an atom to write through', () => {
    const cap = capstoneFor(LESSON);
    expect(cap.params).toEqual(cap.randomize(makeRng(1)));
  });
  it('every capstone goal has hold>0 (drive-by passes are blocked, exam-wide)', () => {
    expect(capstoneFor(LESSON).goals.every((g) => g.hold > 0)).toBe(true);
  });
  it('the capstone uses a rotated ORTHOGONAL basis (‖c₁a+c₂b‖ bounded away from 0)', () => {
    const cap = capstoneFor(LESSON);
    for (let seed = 1; seed <= 200; seed++) {
      const p = cap.randomize(makeRng(seed));
      expect(Math.abs(dot(p.a, p.b))).toBeLessThan(1e-9);   // a ⟂ b
      expect(mag(p.T)).toBeGreaterThan(1);                  // star never near the origin baseline
    }
  });
});

/* ANTI-GAMING — the helpers prove baseline-clean + reachable but NOT
   ungameable (quality's explicit carve-out). Every magnitude/determinant
   goal: degenerate strategy stays false; legit strategy credits. */
describe('ANTI-GAMING: degenerate strategies must NOT credit', () => {
  it('vecops.addition g2 (cancel to 0): shrinking both arrows to nothing must NOT credit', () => {
    const s = sceneAt(0);
    expect(s.goals[2].predicate({ a: { x: 0, y: 0 }, b: { x: 0, y: 0 } })).toBe(false);
    expect(s.goals[2].predicate({ a: { x: 0.1, y: 0 }, b: { x: -0.1, y: 0 } })).toBe(false); // both < MIN_MAG
    expect(s.goals[2].predicate({ a: { x: 2, y: 1 }, b: { x: -2, y: -1 } })).toBe(true);      // real, opposite
  });
  it('vecops.scaling g2 (shrink): collapsing c toward 0 must NOT credit as "shrunk"', () => {
    const s = sceneAt(1);
    expect(s.goals[2].predicate({ ck: { x: SC_X, y: yForCS(0.05) } })).toBe(false); // c<0.1, near-zero arrow
    expect(s.goals[2].predicate({ ck: { x: SC_X, y: yForCS(0.3) } })).toBe(true);   // a real half-length shrink
  });
  it('vecops.span (collapse): shrinking b to near-zero must NOT credit the parallel goal', () => {
    const s = sceneAt(3);
    expect(s.goals[1].predicate({ b: { x: 0.02, y: 0.01 } })).toBe(false);  // tiny & ~parallel — not a real vector
    expect(s.goals[1].predicate({ b: { x: 2, y: 1 } })).toBe(true);         // real vector genuinely parallel to a
  });
  it('vecops.convex g2 (blend): zeroing the query must NOT credit; raising temperature does', () => {
    const s = sceneAt(4);
    expect(s.goals[2].predicate({ q: { x: 0, y: 0 }, tk: { x: CV_X, y: CV_HI } })).toBe(false);   // zero q flattens for free
    expect(s.goals[2].predicate({ q: { x: 1.6, y: 1.0 }, tk: { x: CV_X, y: CV_LO } })).toBe(false); // real but cool
    expect(s.goals[2].predicate({ q: { x: 1.6, y: 1.0 }, tk: { x: CV_X, y: CV_HI } })).toBe(true);  // real + hot
  });
});
