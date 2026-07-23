/* Scene lesson — c-limits headless tests (Vitest, node env).

   P2 wave D migration (CONTRACT Amendment v1.8). FIRST calc-world scene
   arc. Scenes are DATA + PURE PREDICATES; these need no GPU.
   Baseline-cleanliness + reachability run through the SHARED quality
   helpers (CONTRACT v1.4 §6, test/helpers/scene-invariants.mjs). Every
   mid-lesson goal gates on a POSITION (a slider value, or a distance to
   a fixed landmark) — never a scale-invariant ratio like cosine or
   determinant — so there is no near-zero-vector-style gaming surface;
   the "ANTI-GAMING" section below instead proves the ε-shrink gates
   (jump/asymptote/classify/capstone) genuinely require ε to be small,
   not just any value, matching the honesty check every other lesson's
   magnitude-floor tests run. The capstone's baseline-safety proof (see
   c-limits.js's own comment block) is checked exhaustively here across
   the full finite (a, jL, delta) grid, not just sampled seeds. */
import { describe, it, expect, beforeAll } from 'vitest';
import { assertBaselineClean, assertReachable } from './helpers/scene-invariants.mjs';

let makeRng, validateScenes;
let scenesForLesson, capstoneFor, validateSceneLessons;

const LESSON = 'c-limits';
const EXPECTED_IDS = [
  'limits.hole', 'limits.factor', 'limits.jump', 'limits.asymptote',
  'limits.sinc', 'limits.classify', 'limits.capstone',
];
const QUIZ_TAGS = new Set(['indeterminate forms', 'one-sided limits', 'limit vs value']);

// Mirrors the constants in lib/curriculum/scenes/c-limits.js's capstone
// (not exported — hand-copied here, same convention test/scenes-la-eigen.test.mjs
// uses for its exhaustive baseline-safety enumeration).
const CAP_XH = 3, CAP_XJ = -3, CAP_DECOY_HALF = 0.05, CAP_DECOY = 0;
const CAP_A = [2, 3, 4, 5];
const CAP_JL = [0, 1, 2, 3];
const CAP_DELTA = [2, 3, 4, 5];
const capHole = (a) => (x) => (Math.abs(x - CAP_XH) < CAP_DECOY_HALF ? CAP_DECOY : (x - CAP_XH) * (x + a) / (x - CAP_XH));
const capJump = (jL, jR) => (x) => (x < CAP_XJ ? jL : jR);

beforeAll(async () => {
  ({ makeRng, validateScenes } = await import('../lib/scene/index.js'));
  const res = await import('../lib/curriculum/scenes/index.js');   // registers all scene modules
  ({ scenesForLesson, capstoneFor, validateSceneLessons } = res);
});

const sceneAt = (i) => scenesForLesson(LESSON)[i];

describe('registration + validation', () => {
  it('registers the seven c-limits scenes in arc order', () => {
    expect(scenesForLesson(LESSON).map((s) => s.id)).toEqual(EXPECTED_IDS);
  });
  it('passes the kit per-scene validateScenes() with zero problems', () => {
    expect(validateScenes()).toEqual([]);
  });
  it('passes the flagship lesson rule (exactly one capstone, last)', () => {
    expect(validateSceneLessons()).toEqual([]);
    expect(capstoneFor(LESSON).id).toBe('limits.capstone');
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
    // A cheap, honest proxy: every goal text must reference the WHY (an
    // AI-foundations tie or an explicit "why" connective), not stop at the
    // bare mechanical instruction. Every goal in this file was authored
    // with a "— to see how / — proving / — the same X" clause; assert one
    // of those connectives (or an ml-adjacent term) is present. Captions are
    // NOT required to repeat it — content review (2026-07-22) flagged
    // caption/goal near-verbatim duplication on limits.hole/limits.factor;
    // the payoff now lives in the goal text only, captions stay mechanic-
    // focused, per that fix.
    const WHY_RE = /(to see how|proving|confirming|the same|exactly (how|the)|why|gradient|training|loss|autodiff|optimizer|\bmodel\b|network|weight)/i;
    for (const s of scenesForLesson(LESSON)) {
      for (const g of s.goals) expect(WHY_RE.test(g.text), s.id + ' goal missing a WHY clause: ' + g.text).toBe(true);
    }
  });
  it('the diagonal-style scenes (jump/asymptote/classify) declare the expected sliders', () => {
    expect(sceneAt(2).controls.map((c) => c.param)).toEqual(['eps']);
    expect(sceneAt(3).controls.map((c) => c.param)).toEqual(['eps']);
    expect(sceneAt(5).controls.map((c) => c.param)).toEqual(['fi', 'eps']);
    expect(sceneAt(6).controls.map((c) => c.param)).toEqual(['x', 'eps']);
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
  it('limits.hole — x searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(0), { dims: [{ bind: 'x', range: [-1, 3], steps: 400 }] });
  });
  it('limits.factor — x searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(1), { dims: [{ bind: 'x', range: [0, 6], steps: 600 }] });
  });
  it('limits.jump — eps searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(2), { dims: [{ bind: 'eps', range: [0.001, 2], steps: 400 }] });
  });
  it('limits.asymptote — eps searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(3), { dims: [{ bind: 'eps', range: [0.02, 2], steps: 400 }] });
  });
  it('limits.sinc — x searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(4), { dims: [{ bind: 'x', range: [-2, 2], steps: 800 }] });
  });
  it('limits.classify — fi (discrete) × eps searched as explicit dims', () => {
    assertReachable(sceneAt(5), {
      dims: [{ bind: 'fi', values: [0, 1, 2] }, { bind: 'eps', range: [0.01, 2], steps: 400 }],
    });
  });
  it('limits.capstone — every target reachable for every seed (analytic witnesses)', () => {
    assertReachable(capstoneFor(LESSON), {
      seeds: 50,
      witnesses: (base) => [
        { ...base, x: CAP_XH + 0.15 },      // g1: 0.1<=d<0.2 band, independent of a/jL/jR
        { ...base, eps: 0.01 },             // g2: jL/jR diff >= 2 by construction, any small eps
        { ...base, x: CAP_XH + 0.02 },      // g3: inside the 0.05 decoy band
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
  it('jL/jR always differ by >= 2 (delta set floor), for every seed', () => {
    const cap = capstoneFor(LESSON);
    for (let seed = 1; seed <= 200; seed++) {
      const p = cap.randomize(makeRng(seed));
      expect(Math.abs(p.jL - p.jR)).toBeGreaterThanOrEqual(2);
      expect(p.x).toBe(0);
      expect(p.eps).toBe(1);
    }
  });
});

describe('CAPSTONE BASELINE-SAFETY — exhaustive enumeration of the finite parameter space', () => {
  // Mirrors c-limits.js's own proof comment: reset x=0, eps=1 (both fixed,
  // independent of the draw). g1/g3 depend only on |x-CAP_XH|=3, which is
  // >= 0.2 and >= 0.05 for EVERY a; g2 depends only on eps=1 (>=0.05, so
  // always false) — no enumeration is strictly needed, but we still walk
  // the full finite (a, jL, delta) grid as an exhaustive, non-probabilistic
  // confirmation, matching the la-eigen precedent for capstone proofs.
  it('every (a, jL, delta) combo leaves all three goals false at the reset params', () => {
    let count = 0;
    for (const a of CAP_A) {
      for (const jL of CAP_JL) {
        for (const delta of CAP_DELTA) {
          const jR = jL + delta;
          const s = { x: 0, eps: 1, a, jL, jR };
          const d = Math.abs(s.x - CAP_XH);
          const g1 = d >= 0.1 && d < 0.2;
          const g2 = s.eps < 0.05 && Math.abs(s.jL - s.jR) > 1;
          const g3 = d < CAP_DECOY_HALF;
          expect(g1, 'g1 at a=' + a).toBe(false);
          expect(g2, 'g2 at jL=' + jL + ' delta=' + delta).toBe(false);
          expect(g3, 'g3 at a=' + a).toBe(false);
          count++;
        }
      }
    }
    expect(count).toBe(CAP_A.length * CAP_JL.length * CAP_DELTA.length);   // sanity: the enumeration actually ran
  });
  it('capHole/capJump really produce the claimed limit/jump for every (a, jL, jR) draw', () => {
    for (const a of CAP_A) {
      const hf = capHole(a);
      // outside the decoy band the raw expression simplifies to x+a exactly
      expect(hf(CAP_XH + 0.15)).toBeCloseTo(CAP_XH + 0.15 + a, 6);
      expect(hf(CAP_XH - 0.15)).toBeCloseTo(CAP_XH - 0.15 + a, 6);
      expect(hf(CAP_XH + 0.02)).toBe(CAP_DECOY);
    }
    for (const jL of CAP_JL) for (const delta of CAP_DELTA) {
      const jR = jL + delta;
      const jf = capJump(jL, jR);
      expect(jf(CAP_XJ - 0.01)).toBe(jL);
      expect(jf(CAP_XJ + 0.01)).toBe(jR);
    }
  });
});

describe('ANTI-GAMING (position/threshold honesty — no scale-invariant ratio in this lesson)', () => {
  // None of these predicates are scale-invariant (no cosine/determinant/
  // parallelism), so there is no near-zero-input trick to defend against.
  // What CAN be gamed is an ε-gate that doesn't actually require shrinking
  // — these tests prove eps must genuinely be small, not just present.
  it('limits.jump g1 does NOT credit at a large ε even though the sides already disagree', () => {
    const s = sceneAt(2);
    expect(s.goals[0].predicate({ eps: 1 })).toBe(false);     // sides disagree (1 vs 3) but eps=1, not <0.05
    expect(s.goals[0].predicate({ eps: 0.01 })).toBe(true);
  });
  it('limits.asymptote g1 does NOT credit at a large ε even though both sides already exceed 50 eventually', () => {
    const s = sceneAt(3);
    expect(s.goals[0].predicate({ eps: 1 })).toBe(false);      // f(1)=1, not >50, AND eps not <0.1
    expect(s.goals[0].predicate({ eps: 0.05 })).toBe(true);
  });
  it('limits.capstone g2 does NOT credit at a large ε even though jL/jR already disagree by construction', () => {
    const cap = capstoneFor(LESSON);
    const base = cap.randomize(makeRng(1));
    expect(cap.goals[1].predicate({ ...base, eps: 1 })).toBe(false);      // eps not <0.05
    expect(cap.goals[1].predicate({ ...base, eps: 0.01 })).toBe(true);
  });
  it('limits.hole g3 does NOT credit at the hole itself (f undefined there, not "close to 2 by default")', () => {
    const s = sceneAt(0);
    expect(s.goals[2].predicate({ x: 1 })).toBe(false);   // f1(1) = NaN
  });
});
