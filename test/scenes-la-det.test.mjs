/* Scene lesson — la-det headless tests (Vitest, node env).

   P2 migration wave 2, lesson 2. Scenes are DATA + PURE PREDICATES; these
   need no GPU. Baseline-cleanliness + reachability run through the SHARED
   quality helpers (CONTRACT v1.4 §6, test/helpers/scene-invariants.mjs).
   The scale scene's control is a scalar param (not a vec handle), so its
   reachability is searched via an explicit scalar `dims`. The helpers
   don't cover gameability, so every det≈0/magnitude-style goal carries a
   per-goal ANTI-GAMING test. The capstone's baseline-safety proof (see
   la-det.js's own comment block) is checked exhaustively here across the
   full finite (targetMag, targetNeg) grid, not just sampled seeds. */
import { describe, it, expect, beforeAll } from 'vitest';
import { assertBaselineClean, assertReachable } from './helpers/scene-invariants.mjs';

let makeRng, validateScenes;
let scenesForLesson, capstoneFor, validateSceneLessons;

const LESSON = 'la-det';
const EXPECTED_IDS = [
  'det.formula', 'det.collapse', 'det.sign',
  'det.scale', 'det.area', 'det.product', 'det.shear', 'det.capstone',
];

beforeAll(async () => {
  ({ makeRng, validateScenes } = await import('../lib/scene/index.js'));
  const res = await import('../lib/curriculum/scenes/index.js');   // registers all scene modules
  ({ scenesForLesson, capstoneFor, validateSceneLessons } = res);
});

const sceneAt = (i) => scenesForLesson(LESSON)[i];

describe('registration + validation', () => {
  it('registers the six la-det scenes in arc order', () => {
    expect(scenesForLesson(LESSON).map((s) => s.id)).toEqual(EXPECTED_IDS);
  });
  it('passes the kit per-scene validateScenes() with zero problems', () => {
    expect(validateScenes()).toEqual([]);
  });
  it('passes the flagship lesson rule (exactly one capstone, last)', () => {
    expect(validateSceneLessons()).toEqual([]);
    expect(capstoneFor(LESSON).id).toBe('det.capstone');
  });
  it('the scale scene declares a slider control bound to a scalar param', () => {
    const sc = sceneAt(3);
    expect(Array.isArray(sc.controls)).toBe(true);
    expect(sc.controls[0].kind).toBe('slider');
    expect(sc.controls[0].param).toBe('t');
    expect(typeof sc.params.t).toBe('number');
    expect(sc.params.t).toBeGreaterThanOrEqual(-4);
    expect(sc.params.t).toBeLessThanOrEqual(4);
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
  it('EVERY goal (not just the capstone) carries a tag from the migrated quiz set + non-empty focus', () => {
    const QUIZ_TAGS = new Set(['det formula', 'det = 0 collapse', 'negative det']);
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

describe('reachability (shared helper — search over handle/param space)', () => {
  it('det.formula — free columns (auto-discovered handles)', () => { assertReachable(sceneAt(0)); });
  it('det.collapse — free columns', () => { assertReachable(sceneAt(1)); });
  it('det.sign — free columns', () => { assertReachable(sceneAt(2)); });
  it('det.area — free columns', () => { assertReachable(sceneAt(4)); });

  it('det.scale — t searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(3), { dims: [{ bind: 't', range: [-4, 4], steps: 200 }] });
  });

  it('det.product — reachable via analytic witnesses (compensating chain, sign flip, one-factor collapse)', () => {
    assertReachable(sceneAt(5), {
      dims: [
        { bind: 'aCol1', values: [{ x: 1, y: 0 }] },
        { bind: 'aCol2', values: [{ x: 0, y: 1 }] },
        { bind: 'bCol1', values: [{ x: 1, y: 0 }] },
        { bind: 'bCol2', values: [{ x: 0, y: 1 }] },
      ],
      witnesses: () => [
        // goal 1: det(A)=5/3, det(B)=0.6, product=1 — every column's magnitude stays clear of MIN_MAG (0.5)
        { aCol1: { x: 5 / 3, y: 0 }, aCol2: { x: 0, y: 1 }, bCol1: { x: 1, y: 0 }, bCol2: { x: 0.9, y: 0.6 } },
        { aCol1: { x: 1, y: 0 }, aCol2: { x: 0, y: 1 }, bCol1: { x: -1, y: 0 }, bCol2: { x: 0, y: 1 } },    // goal 2: det(A)=1, det(B)=-1
        { aCol1: { x: 1, y: 0 }, aCol2: { x: 2, y: 0 }, bCol1: { x: 2, y: 0 }, bCol2: { x: 0, y: 2 } },     // goal 3: det(A)=0 (collapsed), det(B)=4 (healthy)
      ],
    });
  });

  it('det.shear — s and k searched as explicit scalar dims', () => {
    assertReachable(sceneAt(6), {
      dims: [
        { bind: 's', range: [0, 3], steps: 60 },
        { bind: 'k', range: [-2.5, 2.5], steps: 60 },
      ],
    });
  });

  it('det.capstone — every target reachable for every seed (analytic witnesses)', () => {
    assertReachable(capstoneFor(LESSON), {
      seeds: 50,
      step: 1,   // coarsen the (redundant) auto grid past the combo guard — witnesses do the proving
      witnesses: (base) => [
        { ...base, col1: { x: base.targetMag, y: 0 }, col2: { x: 0, y: 1 } },       // goal 1: |det| = targetMag
        { ...base, col1: { x: 0, y: 1 }, col2: { x: base.targetNeg, y: 0 } },       // goal 2: det = -targetNeg
        { ...base, col1: { x: 1, y: 0 }, col2: { x: 2, y: 0 } },                    // goal 3: collapse
      ],
    });
  });
});

describe('capstone: weak-area tag migration + the official reroll seam', () => {
  it('carries the old quiz’s three weak-area tags', () => {
    const tags = capstoneFor(LESSON).goals.map((g) => g.tag);
    expect(new Set(tags)).toEqual(new Set(['det formula', 'negative det', 'det = 0 collapse']));
    for (const g of capstoneFor(LESSON).goals) expect(typeof g.focus).toBe('string');
  });
  it('randomize(makeRng(seed)) is deterministic per seed, distinct across seeds', () => {
    const cap = capstoneFor(LESSON);
    expect(typeof cap.randomize).toBe('function');
    const draws = [1, 2, 3, 4, 5].map((seed) => JSON.stringify(cap.randomize(makeRng(seed))));
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
  it('capstone targets stay within the finite draw sets, reset controls are the identity, for every seed', () => {
    const cap = capstoneFor(LESSON);
    const MAGS = [3, 4, 5, 6], NEG_MAGS = [2, 3, 4];
    for (let seed = 1; seed <= 200; seed++) {
      const p = cap.randomize(makeRng(seed));
      expect(p.col1).toEqual({ x: 1, y: 0 });
      expect(p.col2).toEqual({ x: 0, y: 1 });
      expect(MAGS).toContain(p.targetMag);
      expect(NEG_MAGS).toContain(p.targetNeg);
    }
  });
});

describe('CAPSTONE BASELINE-SAFETY — exhaustive enumeration of the finite parameter space', () => {
  const MAGS = [3, 4, 5, 6], NEG_MAGS = [2, 3, 4];
  const BASELINE_DET = 1;   // identity columns

  it('goal 1 (magnitude target) is false at baseline for all 4 possible draws', () => {
    for (const m of MAGS) expect(Math.abs(BASELINE_DET - m)).toBeGreaterThan(0.2);
  });
  it('goal 2 (negative target) is false at baseline for all 3 possible draws', () => {
    for (const n of NEG_MAGS) expect(Math.abs(BASELINE_DET - (-n))).toBeGreaterThan(0.2);
  });
  it('goal 3 (collapse) is false at baseline (det=1 is never within 0.2 of 0)', () => {
    expect(Math.abs(BASELINE_DET)).toBeGreaterThan(0.2);
  });
});

describe('ANTI-GAMING: degenerate strategies must NOT credit', () => {
  it('det.collapse: shrinking a column to near-zero must NOT credit either collapse goal', () => {
    const s = sceneAt(1);
    const shrunk = { col1: { x: 0.02, y: 0.01 }, col2: { x: 3, y: 1.5 } };   // det ≈ 0 but col1 fake
    expect(s.goals[0].predicate(shrunk)).toBe(false);
    expect(s.goals[1].predicate(shrunk)).toBe(false);
    // legitimate: two real, parallel columns
    expect(s.goals[0].predicate({ col1: { x: 1, y: 0 }, col2: { x: 2, y: 0 } })).toBe(true);
    expect(s.goals[1].predicate({ col1: { x: 1, y: 0 }, col2: { x: -2, y: 0 } })).toBe(true);
  });
  it('det.product g1 (compensating chain): near-zero A columns paired with a blown-up B must NOT credit', () => {
    const s = sceneAt(5);
    // aCol shrunk to ~0 (det(A)≈0.0001, "far from 1") + bCol blown up to compensate (det(B)=10000) → product≈1
    const shrunk = { aCol1: { x: 0.01, y: 0 }, aCol2: { x: 0, y: 0.01 }, bCol1: { x: 100, y: 0 }, bCol2: { x: 0, y: 100 } };
    expect(s.goals[0].predicate(shrunk)).toBe(false);   // aCol1/aCol2 below MIN_MAG — real-column floor blocks it
    const legit = { aCol1: { x: 5 / 3, y: 0 }, aCol2: { x: 0, y: 1 }, bCol1: { x: 1, y: 0 }, bCol2: { x: 0.9, y: 0.6 } };
    expect(s.goals[0].predicate(legit)).toBe(true);
  });
  it('det.product g2 (negative): a near-zero A column must NOT credit a fake sign flip', () => {
    const s = sceneAt(5);
    const shrunk = { aCol1: { x: 0.01, y: 0 }, aCol2: { x: 0, y: 0.01 }, bCol1: { x: -3, y: 0 }, bCol2: { x: 0, y: 3 } };
    expect(s.goals[1].predicate(shrunk)).toBe(false);   // aCol1/aCol2 collapsed — real-column floor blocks it
    const legit = { aCol1: { x: 1, y: 0 }, aCol2: { x: 0, y: 1 }, bCol1: { x: -1, y: 0 }, bCol2: { x: 0, y: 1 } };
    expect(s.goals[1].predicate(legit)).toBe(true);
  });
  it('det.product g3 (chain collapse): a near-zero "collapsed" factor must be a REAL parallel pair, not a shrunk one', () => {
    const s = sceneAt(5);
    const fakeCollapse = { aCol1: { x: 0.01, y: 0 }, aCol2: { x: 0, y: 0.01 }, bCol1: { x: 2, y: 0 }, bCol2: { x: 0, y: 2 } };
    expect(s.goals[2].predicate(fakeCollapse)).toBe(false);   // aCol columns shrunk past MIN_MAG, not a genuine collapse
    const legit = { aCol1: { x: 1, y: 0 }, aCol2: { x: 2, y: 0 }, bCol1: { x: 2, y: 0 }, bCol2: { x: 0, y: 2 } };
    expect(s.goals[2].predicate(legit)).toBe(true);
  });
  it('det.shear: k alone can never fake either magnitude goal — only s moves det', () => {
    const s = sceneAt(6);
    expect(s.goals[0].predicate({ s: 1, k: 0 })).toBe(false);       // det=2 but k=0, no shear happened
    expect(s.goals[0].predicate({ s: 1, k: 1.8 })).toBe(true);      // real shear, det still 2
    expect(s.goals[1].predicate({ s: 1, k: 5 })).toBe(false);       // huge k, but det is still 2s=2, not 4
  });
  it('det.capstone g3 (collapse): a near-zero column must NOT credit', () => {
    const cap = capstoneFor(LESSON);
    const base = cap.randomize(makeRng(1));
    expect(cap.goals[2].predicate({ ...base, col1: { x: 0.01, y: 0.02 }, col2: { x: 5, y: 5 } })).toBe(false);
    expect(cap.goals[2].predicate({ ...base, col1: { x: 1, y: 0 }, col2: { x: 2, y: 0 } })).toBe(true);
  });
});
