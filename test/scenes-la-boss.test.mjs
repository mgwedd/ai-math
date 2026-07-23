/* Scene lesson — la-boss headless tests (Vitest, node env).

   P2 wave F migration. Scenes are DATA + PURE PREDICATES; these need no
   GPU. Baseline-cleanliness + reachability run through the SHARED quality
   helpers (CONTRACT v1.4 §6, test/helpers/scene-invariants.mjs). There
   are NO handles anywhere in la-boss (W is tuned via four sliders, never
   a draggable vector), so reachability is searched via explicit scalar
   `dims` for a,b,c,d on every scene (not auto-discovered). The helpers
   don't cover gameability, so the collapse scene (which has no drag-clamp
   floor to lean on, unlike a handle-bound vec) carries its own
   ANTI-GAMING tests, plus a general "the zero matrix never separates"
   check across every clusters scene. The capstone's baseline-safety proof
   (see la-boss.js's own header comment) is checked exhaustively here
   across the full finite (side, margin, margin2, detMin, detMin2) grid,
   not just sampled seeds. */
import { describe, it, expect, beforeAll } from 'vitest';
import { assertBaselineClean, assertReachable, handleDims } from './helpers/scene-invariants.mjs';

let makeRng, validateScenes;
let scenesForLesson, capstoneFor, validateSceneLessons;

const LESSON = 'la-boss';
const EXPECTED_IDS = [
  'boss.anatomy', 'boss.direction', 'boss.invertible',
  'boss.collapse', 'boss.margin', 'boss.capstone',
];
const QUIZ_TAGS = new Set(['representation learning', 'what training changes', 'information loss']);

// pure helpers (mirror ./vec-math) for anti-gaming states
const detW = (a, b, c, d) => a * d - b * c;

// every scene is tuned entirely through four scalar sliders (no handles) —
// reachability needs an explicit scalar dim per entry on every scene.
const W_DIMS = [
  { bind: 'a', range: [-2, 2], steps: 8 },
  { bind: 'b', range: [-2, 2], steps: 8 },
  { bind: 'c', range: [-2, 2], steps: 8 },
  { bind: 'd', range: [-2, 2], steps: 8 },
];

beforeAll(async () => {
  ({ makeRng, validateScenes } = await import('../lib/scene/index.js'));
  const res = await import('../lib/curriculum/scenes/index.js');   // registers all scene modules
  ({ scenesForLesson, capstoneFor, validateSceneLessons } = res);
});

const sceneAt = (i) => scenesForLesson(LESSON)[i];

describe('registration + validation', () => {
  it('registers the six la-boss scenes in arc order', () => {
    expect(scenesForLesson(LESSON).map((s) => s.id)).toEqual(EXPECTED_IDS);
  });
  it('passes the kit per-scene validateScenes() with zero problems', () => {
    expect(validateScenes()).toEqual([]);
  });
  it('passes the flagship lesson rule (exactly one capstone, last)', () => {
    expect(validateSceneLessons()).toEqual([]);
    expect(capstoneFor(LESSON).id).toBe('boss.capstone');
  });
  it('every scene declares four slider controls (a,b,c,d), no handles', () => {
    for (const s of scenesForLesson(LESSON)) {
      expect(Array.isArray(s.controls)).toBe(true);
      expect(s.controls.length).toBe(4);
      const params = s.controls.map((c) => c.param).sort();
      expect(params).toEqual(['a', 'b', 'c', 'd']);
      for (const c of s.controls) {
        expect(c.kind).toBe('slider');
        expect(s.params[c.param]).toBeGreaterThanOrEqual(-2);
        expect(s.params[c.param]).toBeLessThanOrEqual(2);
      }
      // no entity in the baseline display list carries a handle (v1.10 charter: W
      // is tuned entirely by slider, nothing is draggable in this lesson)
      expect(handleDims(s)).toEqual([]);
    }
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
  it('EVERY goal (not just the capstone) carries a tag from the migrated quiz set + non-empty focus stating the payoff', () => {
    for (const s of scenesForLesson(LESSON)) {
      s.goals.forEach((g, i) => {
        expect(g.tag, s.id + ' #' + i + ' tag').toBeTruthy();
        expect(QUIZ_TAGS.has(g.tag), s.id + ' #' + i + ' tag "' + g.tag + '" not in migrated quiz set').toBe(true);
        expect(typeof g.focus === 'string' && g.focus.length > 0, s.id + ' #' + i + ' focus').toBe(true);
      });
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

describe('reachability (shared helper — explicit scalar dims, no handles in this lesson)', () => {
  it('boss.anatomy — a,b,c,d searched as explicit scalar dims', () => {
    assertReachable(sceneAt(0), { dims: W_DIMS });
  });
  it('boss.direction — a,b,c,d searched as explicit scalar dims', () => {
    assertReachable(sceneAt(1), { dims: W_DIMS });
  });
  it('boss.invertible — a,b,c,d searched as explicit scalar dims', () => {
    assertReachable(sceneAt(2), { dims: W_DIMS });
  });
  it('boss.collapse — a,b,c,d searched as explicit scalar dims', () => {
    assertReachable(sceneAt(3), { dims: W_DIMS });
  });
  it('boss.margin — a,b,c,d searched as explicit scalar dims', () => {
    assertReachable(sceneAt(4), { dims: W_DIMS });
  });
  it('boss.capstone — every target reachable for every seed', () => {
    assertReachable(capstoneFor(LESSON), { dims: W_DIMS, seeds: 20 });
  });
});

describe('capstone: weak-area tag migration + the official reroll seam', () => {
  it('carries the old quiz’s three weak-area tags', () => {
    const tags = capstoneFor(LESSON).goals.map((g) => g.tag);
    expect(new Set(tags)).toEqual(QUIZ_TAGS);
    for (const g of capstoneFor(LESSON).goals) expect(typeof g.focus).toBe('string');
  });
  it('randomize(makeRng(seed)) is deterministic per seed, distinct across seeds', () => {
    const cap = capstoneFor(LESSON);
    expect(typeof cap.randomize).toBe('function');
    const draws = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => JSON.stringify(cap.randomize(makeRng(seed))));
    expect(new Set(draws).size).toBeGreaterThan(1);
    expect(cap.randomize(makeRng(7))).toEqual(cap.randomize(makeRng(7)));
  });
  it('params is the seed-1 draw, so every randomize key has an atom to write through', () => {
    const cap = capstoneFor(LESSON);
    expect(cap.params).toEqual(cap.randomize(makeRng(1)));
  });
  it('every capstone goal has hold>0 (drive-by passes are blocked, exam-wide)', () => {
    expect(capstoneFor(LESSON).goals.every((g) => g.hold > 0)).toBe(true);
  });
  it('capstone draws stay within the finite sets, reset controls are the identity, for every seed', () => {
    const cap = capstoneFor(LESSON);
    const SIDES = [1, -1], MARGINS = [0.2, 0.25, 0.3], MARGINS2 = [0.4, 0.5, 0.6];
    const DETS = [0.3, 0.4, 0.5], DETS2 = [0.5, 0.6, 0.7];
    for (let seed = 1; seed <= 200; seed++) {
      const p = cap.randomize(makeRng(seed));
      expect(p.a).toBe(1); expect(p.b).toBe(0); expect(p.c).toBe(0); expect(p.d).toBe(1);
      expect(SIDES).toContain(p.side);
      expect(MARGINS).toContain(p.margin);
      expect(MARGINS2).toContain(p.margin2);
      expect(DETS).toContain(p.detMin);
      expect(DETS2).toContain(p.detMin2);
    }
  });
});

describe('CAPSTONE BASELINE-SAFETY — exhaustive enumeration of the finite parameter space', () => {
  // Mirrors la-boss.js's header-comment proof: at the reset identity, x' = x
  // for every point, and BOTH clusters have strictly positive x (CLUSTER_A in
  // [0.65,1.35], CLUSTER_B in [1.45,2.15]) — so `sepDir` (and therefore every
  // capstone goal, all of which require it) is false for every one of the
  // 2×3×3×3×3 = 162 possible draws, with no dependency on margin/det values.
  const SIDES = [1, -1], MARGINS = [0.2, 0.25, 0.3], MARGINS2 = [0.4, 0.5, 0.6];
  const DETS = [0.3, 0.4, 0.5], DETS2 = [0.5, 0.6, 0.7];

  it('goal 1 (separation) is false at baseline for all 162 possible draws', () => {
    const cap = capstoneFor(LESSON);
    let n = 0;
    for (const side of SIDES) for (const margin of MARGINS) for (const margin2 of MARGINS2)
      for (const detMin of DETS) for (const detMin2 of DETS2) {
        n++;
        const s = { a: 1, b: 0, c: 0, d: 1, side, margin, margin2, detMin, detMin2 };
        expect(cap.goals[0].predicate(s)).toBe(false);
        expect(cap.goals[1].predicate(s)).toBe(false);
        expect(cap.goals[2].predicate(s)).toBe(false);
      }
    expect(n).toBe(162);
  });
});

describe('ANTI-GAMING: degenerate strategies must NOT credit', () => {
  it('boss.collapse: a near-zero row must NOT credit either collapse goal, even when det ≈ 0', () => {
    const s = sceneAt(3);
    const shrunk = { a: 0.02, b: 0.01, c: 1, d: 1 };   // det = 0.02·1 − 0.01·1 = 0.01 ≈ 0, but row [a,b] is fake
    expect(detW(shrunk.a, shrunk.b, shrunk.c, shrunk.d)).toBeLessThan(0.06);
    expect(s.goals[0].predicate(shrunk)).toBe(false);
    expect(s.goals[1].predicate(shrunk)).toBe(false);
    // legitimate: two real, parallel rows
    expect(s.goals[0].predicate({ a: 1, b: 0, c: 1, d: 0 })).toBe(true);   // same direction
    expect(s.goals[1].predicate({ a: 1, b: 0, c: -1, d: 0 })).toBe(true); // opposite direction
  });
  it('the zero matrix (a=b=c=d=0) never separates anything, in any clusters scene', () => {
    const zero = { a: 0, b: 0, c: 0, d: 0 };
    for (const id of ['boss.direction', 'boss.invertible', 'boss.margin']) {
      const s = scenesForLesson(LESSON).find((sc) => sc.id === id);
      for (const g of s.goals) expect(g.predicate(zero)).toBe(false);
    }
    const cap = capstoneFor(LESSON);
    const base = cap.randomize(makeRng(1));
    for (const g of cap.goals) expect(g.predicate({ ...base, ...zero })).toBe(false);
  });
});
