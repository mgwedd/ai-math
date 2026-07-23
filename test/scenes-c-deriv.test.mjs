/* Scene lesson — c-deriv headless tests (Vitest, node env).

   P2 wave D migration (CONTRACT Amendment v1.8). SECOND calc-world scene
   arc. Scenes are DATA + PURE PREDICATES; these need no GPU.
   Baseline-cleanliness + reachability run through the SHARED quality
   helpers (CONTRACT v1.4 §6, test/helpers/scene-invariants.mjs). As with
   c-limits, every predicate gates on a POSITION or a computed SLOPE
   value — never a scale-invariant ratio — so the "ANTI-GAMING" section
   proves the h/w-shrink gates genuinely require the gap to be small, not
   just present. The capstone's baseline-safety proof (see c-deriv.js's
   own comment block) is checked exhaustively across the full finite
   (c, k) grid. Scene 3's inset (v1.6, no kit changes) is pinned the same
   way the wave-C retrofits were: presence + read-only-ness + routing. */
import { describe, it, expect, beforeAll } from 'vitest';
import { assertBaselineClean, assertReachable } from './helpers/scene-invariants.mjs';

let makeRng, validateScenes, toAtoms, view;
let scenesForLesson, capstoneFor, validateSceneLessons;

const LESSON = 'c-deriv';
const EXPECTED_IDS = [
  'deriv.secant', 'deriv.zoom', 'deriv.trace', 'deriv.flat', 'deriv.sign', 'deriv.capstone',
];
const QUIZ_TAGS = new Set(['derivative meaning', 'computing slopes', 'critical points']);

// Mirrors the constants in lib/curriculum/scenes/c-deriv.js's capstone (not
// exported — hand-copied here, same convention scenes-la-eigen.test.mjs
// uses for its exhaustive baseline-safety enumeration).
const CAP_C = [-1, -0.5, 0.5, 1];
const CAP_K = [0.5, 1, -0.5, -1];
const CAP_OFFSET = 1.5;
const fcapAt = (p, x) => p.k * (x - p.c) * (x - p.c) / 2;

beforeAll(async () => {
  ({ makeRng, validateScenes, toAtoms, view } = await import('../lib/scene/index.js'));
  const res = await import('../lib/curriculum/scenes/index.js');   // registers all scene modules
  ({ scenesForLesson, capstoneFor, validateSceneLessons } = res);
});

const sceneAt = (i) => scenesForLesson(LESSON)[i];

describe('registration + validation', () => {
  it('registers the six c-deriv scenes in arc order', () => {
    expect(scenesForLesson(LESSON).map((s) => s.id)).toEqual(EXPECTED_IDS);
  });
  it('passes the kit per-scene validateScenes() with zero problems', () => {
    expect(validateScenes()).toEqual([]);
  });
  it('passes the flagship lesson rule (exactly one capstone, last)', () => {
    expect(validateSceneLessons()).toEqual([]);
    expect(capstoneFor(LESSON).id).toBe('deriv.capstone');
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
    for (const s of scenesForLesson(LESSON)) {
      s.goals.forEach((g, i) => {
        expect(g.tag, s.id + ' #' + i + ' tag').toBeTruthy();
        expect(QUIZ_TAGS.has(g.tag), s.id + ' #' + i + ' tag "' + g.tag + '" not in migrated quiz set').toBe(true);
        expect(typeof g.focus === 'string' && g.focus.length > 0, s.id + ' #' + i + ' focus').toBe(true);
      });
    }
  });
  it('R-CONTENT invariant (g): every goal text states a conceptual payoff, not just the mechanical action', () => {
    // Captions are NOT required to repeat it — see the matching note in
    // test/scenes-c-limits.test.mjs (content review, 2026-07-22).
    const WHY_RE = /(to see how|proving|confirming|the same|exactly (how|the)|why|gradient|training|loss|autodiff|optimizer|\bmodel\b|network|weight)/i;
    for (const s of scenesForLesson(LESSON)) {
      for (const g of s.goals) expect(WHY_RE.test(g.text), s.id + ' goal missing a WHY clause: ' + g.text).toBe(true);
    }
  });
  it('every scalar-control scene declares the expected sliders', () => {
    expect(sceneAt(0).controls.map((c) => c.param)).toEqual(['a', 'h']);
    expect(sceneAt(1).controls.map((c) => c.param)).toEqual(['w']);
    expect(sceneAt(2).controls.map((c) => c.param)).toEqual(['a']);
    expect(sceneAt(3).controls.map((c) => c.param)).toEqual(['a']);
    expect(sceneAt(4).controls.map((c) => c.param)).toEqual(['a']);
    expect(sceneAt(5).controls.map((c) => c.param)).toEqual(['a', 'h']);
  });
});

describe('baseline-cleanliness (shared helper, capstone ×1000 seeds)', () => {
  for (const id of EXPECTED_IDS) {
    it(id + ' — no goal satisfied at initial params', () => {
      assertBaselineClean(scenesForLesson(LESSON).find((s) => s.id === id));
    });
  }
});

describe('reachability (shared helper — search over slider/param space)', () => {
  it('deriv.secant — a × h searched as explicit scalar dims', () => {
    assertReachable(sceneAt(0), {
      dims: [{ bind: 'a', range: [-3, 3], steps: 300 }, { bind: 'h', range: [0.01, 2], steps: 300 }],
    });
  });
  it('deriv.zoom — w searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(1), { dims: [{ bind: 'w', range: [0.02, 2], steps: 300 }] });
  });
  it('deriv.trace — a searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(2), { dims: [{ bind: 'a', range: [-3, 3], steps: 600 }] });
  });
  it('deriv.flat — a searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(3), { dims: [{ bind: 'a', range: [-2, 6], steps: 400 }] });
  });
  it('deriv.sign — a searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(4), { dims: [{ bind: 'a', range: [-2.5, 2.5], steps: 500 }] });
  });
  it('deriv.capstone — every target reachable for every seed (analytic witnesses)', () => {
    assertReachable(capstoneFor(LESSON), {
      seeds: 50,
      witnesses: (base) => [
        { ...base, a: 0.5, h: 0.01 },                          // g1: any a, tiny h
        { ...base, a: base.c + CAP_OFFSET, h: 0.01 },          // g2: exact target offset, tiny h
        { ...base, a: base.c },                                  // g3: exactly at critical point
      ],
    });
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
  it('reset a=0, h=1.5 for every seed; c/k vary within their fixed finite sets', () => {
    const cap = capstoneFor(LESSON);
    for (let seed = 1; seed <= 200; seed++) {
      const p = cap.randomize(makeRng(seed));
      expect(p.a).toBe(0);
      expect(p.h).toBe(1.5);
      expect(CAP_C).toContain(p.c);
      expect(CAP_K).toContain(p.k);
    }
  });
});

describe('CAPSTONE BASELINE-SAFETY — exhaustive enumeration of the finite parameter space', () => {
  // Mirrors c-deriv.js's own proof comment: reset a=0, h=1.5 (both fixed,
  // independent of the draw). g1/g2 depend only on h=1.5 (>=0.1 and
  // >=0.15, so always false); g3 depends only on |a-c|=|c| which is
  // >=0.5 for every c in CAP_C (>>0.05). No enumeration is strictly
  // needed, but we still walk the full finite (c, k) grid as an
  // exhaustive, non-probabilistic confirmation, matching the la-eigen
  // precedent for capstone proofs.
  it('every (c, k) combo leaves all three goals false at the reset params', () => {
    let count = 0;
    for (const c of CAP_C) {
      for (const k of CAP_K) {
        const s = { a: 0, h: 1.5, c, k };
        const fa = fcapAt(s, s.a), fb = fcapAt(s, s.a + s.h), slope = (fb - fa) / s.h;
        const trueSlope = s.k * (s.a - s.c);
        const targetSlope = s.k * CAP_OFFSET;
        const g1 = s.h < 0.1 && Math.abs(slope - trueSlope) < 0.1;
        const g2 = s.h < 0.15 && Math.abs(slope - targetSlope) < 0.15;
        const g3 = Math.abs(s.a - s.c) < 0.05;
        expect(g1, 'g1 at c=' + c + ' k=' + k).toBe(false);
        expect(g2, 'g2 at c=' + c + ' k=' + k).toBe(false);
        expect(g3, 'g3 at c=' + c).toBe(false);
        count++;
      }
    }
    expect(count).toBe(CAP_C.length * CAP_K.length);   // sanity: the enumeration actually ran
  });
  it('fcapAt really has a critical point at c with the claimed slope k·(x−c) everywhere else', () => {
    const H = 1e-4;
    for (const c of CAP_C) for (const k of CAP_K) {
      const s = { c, k };
      const slopeAt = (x) => (fcapAt(s, x + H) - fcapAt(s, x - H)) / (2 * H);
      expect(slopeAt(c)).toBeCloseTo(0, 3);
      expect(slopeAt(c + 1)).toBeCloseTo(k, 3);
    }
  });
});

describe('ANTI-GAMING (h/w-shrink honesty — no scale-invariant ratio in this lesson)', () => {
  // No predicate here is scale-invariant (no cosine/determinant/parallelism)
  // — every goal reads a POSITION or a computed slope value directly. What
  // CAN be gamed is an h/w-shrink gate that doesn't actually require
  // shrinking; these tests prove the gap must genuinely be small.
  it('deriv.secant g1 does NOT credit at a large h even though a happens to already be near the target slope', () => {
    const s = sceneAt(0);
    expect(s.goals[0].predicate({ a: 2, h: 2 })).toBe(false);    // secant slope far from f'(2)=2 at h=2
    expect(s.goals[0].predicate({ a: 2, h: 0.01 })).toBe(true);
  });
  it('deriv.zoom g1 does NOT credit at a large window even if the gap happens to be small there', () => {
    const s = sceneAt(1);
    expect(s.goals[0].predicate({ w: 2 })).toBe(false);          // w not < 0.3
    expect(s.goals[0].predicate({ w: 0.1 })).toBe(true);
  });
  it('deriv.capstone g1/g2 do NOT credit at a large h even at the exact target position', () => {
    const cap = capstoneFor(LESSON);
    const base = cap.randomize(makeRng(1));
    expect(cap.goals[0].predicate({ ...base, a: 0.5, h: 1.5 })).toBe(false);
    expect(cap.goals[1].predicate({ ...base, a: base.c + CAP_OFFSET, h: 1.5 })).toBe(false);
    expect(cap.goals[0].predicate({ ...base, a: 0.5, h: 0.01 })).toBe(true);
    expect(cap.goals[1].predicate({ ...base, a: base.c + CAP_OFFSET, h: 0.01 })).toBe(true);
  });
});

describe('P2 wave D — inset trace (v1.6, no kit changes)', () => {
  it('deriv.trace declares an inset and routes a trace point + reference curve into it', () => {
    const s = sceneAt(2);
    expect(s.id).toBe('deriv.trace');
    expect(s.inset).toEqual({ rect: [0.62, 0.05, 0.33, 0.33], extent: 3.3 });
    const list = s.entities(view(toAtoms(s.params || {})), 0);
    const trace = list.find((e) => e.key === 'trace');
    expect(trace).toBeTruthy();
    expect(trace.frame).toBe('inset');
    expect(list.some((e) => e.kind === 'curve' && e.frame === 'inset')).toBe(true);
    expect(list.filter((e) => e.kind === 'segment').every((e) => e.frame === 'main')).toBe(true);
  });
  it('no inset entity carries a handle (read-only in v1.6)', () => {
    const s = sceneAt(2);
    const list = s.entities(view(toAtoms(s.params || {})), 0);
    for (const e of list.filter((x) => x.frame === 'inset')) expect(e.handle == null).toBe(true);
  });
});
