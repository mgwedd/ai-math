/* Scene lesson — la-vectors headless tests (Vitest, node env).

   P2 wave C content: la-vectors is the LA world's INTRO lesson — the
   learner's FIRST scene arc, so this suite pins the gentlest-on-ramp
   invariants just as hard as any later lesson. Baseline-cleanliness +
   reachability run through the SHARED quality helpers (CONTRACT v1.4 §6,
   test/helpers/scene-invariants.mjs). Scenes 4/5/capstone drive scalar
   `slider` params (not vec handles), so their reachability is searched
   via explicit scalar `dims` / analytic witnesses per the helper's docs.

   None of this lesson's goals are scale-invariant ratios (no cosine, no
   determinant, no parallelism) — every predicate is an exact magnitude or
   point-distance target, which a near-zero/degenerate input cannot fake
   (checked by hand per goal below; see the ANTI-GAMING section). */
import { describe, it, expect, beforeAll } from 'vitest';
import { assertBaselineClean, assertReachable } from './helpers/scene-invariants.mjs';

let makeRng, validateScenes;
let scenesForLesson, capstoneFor, validateSceneLessons;

const LESSON = 'la-vectors';
const EXPECTED_IDS = [
  'vectors.anatomy', 'vectors.components', 'vectors.unit', 'vectors.polar',
  'vectors.dims', 'vectors.data', 'vectors.capstone',
];

// pure helpers (mirror ./vec-math) for witnesses + anti-gaming states
const mag = (v) => Math.hypot(v.x, v.y);
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });

beforeAll(async () => {
  ({ makeRng, validateScenes } = await import('../lib/scene/index.js'));
  const res = await import('../lib/curriculum/scenes/index.js');   // registers all scene modules
  ({ scenesForLesson, capstoneFor, validateSceneLessons } = res);
});

const sceneAt = (i) => scenesForLesson(LESSON)[i];

describe('registration + validation', () => {
  it('registers the seven la-vectors scenes in arc order', () => {
    expect(scenesForLesson(LESSON).map((s) => s.id)).toEqual(EXPECTED_IDS);
  });
  it('passes the kit per-scene validateScenes() with zero problems', () => {
    expect(validateScenes()).toEqual([]);
  });
  it('passes the flagship lesson rule (exactly one capstone, last)', () => {
    expect(validateSceneLessons()).toEqual([]);
    expect(capstoneFor(LESSON).id).toBe('vectors.capstone');
  });
  it('polar/dims/capstone scenes declare slider controls bound to numeric params', () => {
    expect(sceneAt(3).controls.map((c) => c.param)).toEqual(['r', 'theta']);
    expect(sceneAt(4).controls.map((c) => c.param)).toEqual(['k1', 'k2', 'k3']);
    expect(capstoneFor(LESSON).controls.map((c) => c.param)).toEqual(['k']);
    for (const s of [sceneAt(3), sceneAt(4), capstoneFor(LESSON)])
      for (const c of s.controls) expect(typeof s.params[c.param]).toBe('number');
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
  it('EVERY goal (not just the capstone) carries a tag and a non-empty focus', () => {
    for (const s of scenesForLesson(LESSON)) {
      s.goals.forEach((g, i) => {
        expect(g.tag, s.id + ' #' + i + ' tag').toBeTruthy();
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
  it('vectors.anatomy — free v; g2 (length 13) reached via analytic witnesses past the default grid box', () => {
    assertReachable(sceneAt(0), {
      witnesses: () => [{ v: { x: 3, y: 4 } }, { v: { x: 4, y: 3 } }, { v: { x: -5, y: 12 } }, { v: { x: -12, y: 5 } }],
    });
  });
  it('vectors.components — both exact targets sit inside the default grid box', () => { assertReachable(sceneAt(1)); });
  it('vectors.unit — both circle points [1,0]/[-1,0] are exact default-grid points', () => { assertReachable(sceneAt(2)); });
  it('vectors.polar — r/θ searched as explicit scalar dims', () => {
    assertReachable(sceneAt(3), {
      dims: [
        { bind: 'r', range: [0, 6], steps: 60 },
        { bind: 'theta', range: [-Math.PI, Math.PI], steps: 200 },
      ],
    });
  });
  it('vectors.dims — k1/k2/k3 searched as explicit scalar dims', () => {
    assertReachable(sceneAt(4), {
      dims: [
        { bind: 'k1', range: [-6, 6], steps: 30 },
        { bind: 'k2', range: [-6, 6], steps: 30 },
        { bind: 'k3', range: [-6, 6], steps: 30 },
      ],
    });
  });
  it('vectors.data — both animals reachable exactly at their own coordinates', () => { assertReachable(sceneAt(5)); });
  it('vectors.capstone — every target reachable for every seed (analytic witnesses)', () => {
    assertReachable(capstoneFor(LESSON), {
      seeds: 50,
      witnesses: (base) => [
        { ...base, v: base.tPoint },
        { ...base, v: base.tUnit },
        { ...base, v: { x: base.extTarget, y: 0 }, k: 0 },
      ],
    });
  });
});

describe('capstone: weak-area tag migration + the official reroll seam', () => {
  it('carries the old quiz’s three weak-area tags', () => {
    const tags = capstoneFor(LESSON).goals.map((g) => g.tag);
    expect(new Set(tags)).toEqual(new Set(['magnitude', 'unit vectors', 'high dimensions']));
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
  it('the magnitude-gap baseline-safety argument holds for every seed (reset v=[1.6,0], k=0)', () => {
    const cap = capstoneFor(LESSON);
    for (let seed = 1; seed <= 1000; seed++) {
      const p = cap.randomize(makeRng(seed));
      expect(p.v).toEqual({ x: 1.6, y: 0 });
      expect(p.k).toBe(0);
      // g1: distance from reset to tPoint (mag in {4,5,6}) is >= mag-1.6 >= 2.4
      expect(mag(sub(p.v, p.tPoint))).toBeGreaterThan(2);
      // g2: distance from reset to tUnit (mag 1) is >= |1.6-1| = 0.6
      expect(mag(sub(p.v, p.tUnit))).toBeGreaterThan(0.3);
      // g3: |fullMag(reset) - extTarget| = |1.6 - extTarget| >= 4.4
      expect(Math.abs(Math.hypot(p.v.x, p.v.y, p.k) - p.extTarget)).toBeGreaterThan(1);
    }
  });
});

describe('ANTI-GAMING: no goal here is a scale-invariant ratio, so a degenerate (near-zero) input cannot fake a pass', () => {
  it('vectors.unit: a near-zero vector is nowhere near the unit circle', () => {
    const s = scenesForLesson(LESSON).find((x) => x.id === 'vectors.unit');
    expect(s.goals[0].predicate({ v: { x: 0.001, y: 0.001 } })).toBe(false);
  });
  it('vectors.dims: all-zero sliders sit at the untouched 2-D baseline, not a credited target', () => {
    const s = scenesForLesson(LESSON).find((x) => x.id === 'vectors.dims');
    expect(s.goals[0].predicate({ k1: 0, k2: 0, k3: 0 })).toBe(false);
    expect(s.goals[1].predicate({ k1: 0, k2: 0, k3: 0 })).toBe(false);
  });
  it('vectors.capstone g3: k=0 with v at the reset point does not fake the extended-length target', () => {
    const cap = capstoneFor(LESSON);
    const base = cap.randomize(makeRng(1));
    expect(cap.goals[2].predicate({ ...base })).toBe(false);
  });
  it('vectors.data: the margin blocks a coin-flip tie from crediting either side', () => {
    const s = scenesForLesson(LESSON).find((x) => x.id === 'vectors.data');
    // equidistant-ish point between cat and dog — neither mouse nor horse goal should fire
    expect(s.goals[0].predicate({ probe: { x: 1.75, y: 1.75 } })).toBe(false);
    expect(s.goals[1].predicate({ probe: { x: 1.75, y: 1.75 } })).toBe(false);
  });
});
