/* Scene lesson — la-inverse headless tests (Vitest, node env).

   P2 wave K migration. Scenes are DATA + PURE PREDICATES; these need no
   GPU. Baseline-cleanliness + reachability run through the SHARED quality
   helpers (CONTRACT v1.4 §6, test/helpers/scene-invariants.mjs). The recip
   scene is slider-only (exact reciprocal targets a linspace grid can miss)
   and the blowup scene is a single scalar slider, so both search
   reachability via explicit witnesses/dims rather than the auto handle
   grid alone. The helpers don't cover gameability, so every floor-gated /
   band-gated predicate carries a per-goal ANTI-GAMING test — including the
   blowup scene's "det exactly 0 is landable but must fail closed, no
   Infinity" case. The capstone's baseline-safety proof (see la-inverse.js's
   own comment block) is checked exhaustively here across the full finite
   (family matrix × corner-target) grid, not just sampled seeds. */
import { describe, it, expect, beforeAll } from 'vitest';
import { assertBaselineClean, assertReachable } from './helpers/scene-invariants.mjs';
import { mag, sub, det2, matApply, inv2 } from '../lib/curriculum/scenes/vec-math.js';

let makeRng, validateScenes;
let scenesForLesson, capstoneFor, validateSceneLessons;

const LESSON = 'la-inverse';
const EXPECTED_IDS = [
  'inverse.solve', 'inverse.undo', 'inverse.recip',
  'inverse.blowup', 'inverse.singular', 'inverse.capstone',
];
const QUIZ_TAGS = new Set(['invertibility', 'singular systems', 'inverse meaning', 'computing inverses']);

beforeAll(async () => {
  ({ makeRng, validateScenes } = await import('../lib/scene/index.js'));
  const res = await import('../lib/curriculum/scenes/index.js');   // registers all scene modules
  ({ scenesForLesson, capstoneFor, validateSceneLessons } = res);
});

const sceneAt = (i) => scenesForLesson(LESSON)[i];

describe('registration + validation', () => {
  it('registers the six la-inverse scenes in arc order', () => {
    expect(scenesForLesson(LESSON).map((s) => s.id)).toEqual(EXPECTED_IDS);
  });
  it('passes the kit per-scene validateScenes() with zero problems', () => {
    expect(validateScenes()).toEqual([]);
  });
  it('passes the flagship lesson rule (exactly one capstone, last)', () => {
    expect(validateSceneLessons()).toEqual([]);
    expect(capstoneFor(LESSON).id).toBe('inverse.capstone');
  });
  it('the recip scene declares two scalar sliders (s1, s2)', () => {
    const sc = sceneAt(2);
    expect(Array.isArray(sc.controls)).toBe(true);
    expect(sc.controls.map((c) => c.param)).toEqual(['s1', 's2']);
    for (const c of sc.controls) expect(c.kind).toBe('slider');
    expect(typeof sc.params.s1).toBe('number');
    expect(typeof sc.params.s2).toBe('number');
  });
  it('the blowup scene declares a single t slider bound to a scalar param', () => {
    const sc = sceneAt(3);
    expect(Array.isArray(sc.controls)).toBe(true);
    expect(sc.controls[0].kind).toBe('slider');
    expect(sc.controls[0].param).toBe('t');
    expect(sc.controls[0].min).toBe(-1);
    expect(sc.controls[0].max).toBe(2);
    expect(typeof sc.params.t).toBe('number');
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
  it('the UNION of goal tags across the lesson covers ALL FOUR migrated quiz tags', () => {
    // The review loop survives the quiz's retirement only if every old
    // q.tag lands on at least one goal somewhere in the arc.
    const union = new Set();
    for (const s of scenesForLesson(LESSON)) for (const g of s.goals) union.add(g.tag);
    expect(union).toEqual(QUIZ_TAGS);
  });
  it('R-CONTENT invariant (g): every goal text states a conceptual payoff, not just the mechanical action', () => {
    // Honest proxy (mirrors test/scenes-la-det.test.mjs): every la-inverse
    // goal was authored with an explicit "…, to see how …" payoff clause
    // (none rely on a distinctive-keyword escape hatch, so the regex needs
    // no lesson-specific extra alternatives).
    const WHY_RE = /(to see how|because)/i;
    for (const s of scenesForLesson(LESSON)) {
      for (const g of s.goals) expect(WHY_RE.test(g.text), s.id + ' goal missing a WHY clause: ' + g.text).toBe(true);
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
  it('inverse.solve — free x (auto handle grid) + exact analytic witnesses x = A⁻¹b', () => {
    assertReachable(sceneAt(0), {
      witnesses: () => [
        { x: { x: 1, y: 1 } },     // A·(1,1)  = (3,2) = b   exactly
        { x: { x: -1, y: 3 } },    // A·(−1,3) = (1,2) = b2  exactly
      ],
    });
  });

  it('inverse.undo — free B columns (auto grid) + the exact inverse as a witness for both goals', () => {
    // bCol1 = (1,−1), bCol2 = (−1,2) IS A⁻¹: B·A = I exactly (goal 2) and
    // the round trip is exact (goal 1) — one witness proves both.
    assertReachable(sceneAt(1), {
      witnesses: () => [{ bCol1: { x: 1, y: -1 }, bCol2: { x: -1, y: 2 } }],
    });
  });

  it('inverse.recip — s1/s2 are sliders, not handle-bound: exact reciprocal witnesses', () => {
    assertReachable(sceneAt(2), {
      witnesses: () => [
        { s1: 0.5, s2: 0.25 },   // goal 1: B·A = diag(1,1) exactly (both landable at step 0.05)
        { s1: 1, s2: 0.5 },      // goal 2: B·A = diag(2,2) exactly
      ],
    });
  });

  it('inverse.blowup — t searched as an explicit scalar dim over the full slider range', () => {
    // steps 60 over [−1,2] = the slider's own 0.05 lattice: det hits 0.1
    // multiples, so goal 1's (0.01, 0.25] band contains det = ±0.1, ±0.2.
    assertReachable(sceneAt(3), { dims: [{ bind: 't', range: [-1, 2], steps: 60 }] });
  });

  it('inverse.singular — free x (auto grid) + analytic witnesses (closest point; same output from a far x)', () => {
    assertReachable(sceneAt(4), {
      witnesses: () => [
        { x: { x: 0.7, y: 0 } },     // Ax = (1.4, 2.8) = closest point on y=2x; dist = 4/√5 ≈ 1.789 < 1.9
        { x: { x: 2.7, y: -4 } },    // (0.7,0) + 2·(1,−2): SAME Ax, ‖x‖ ≈ 4.83 > 3 (null direction)
      ],
    });
  });

  it('inverse.capstone — every target reachable for every seed (analytic witnesses)', () => {
    assertReachable(capstoneFor(LESSON), {
      seeds: 50,
      step: 2,   // coarsen the (redundant) 3-vec-dim auto grid past the combo guard — witnesses do the proving
      witnesses: (base) => {
        const inv = inv2(base.aCol1, base.aCol2);   // family is det=±1, never null
        return [
          { ...base, x: matApply(inv.c1, inv.c2, base.b) },    // goal 1: x = A⁻¹b (exact)
          { ...base, bCol1: inv.c1, bCol2: inv.c2 },           // goal 2: B = A⁻¹ (B·A = I exact)
          { ...base, x: matApply(inv.c1, inv.c2, base.b2) },   // goal 3: x = A⁻¹b2 (exact)
        ];
      },
    });
  });
});

describe('capstone: weak-area tag migration + the official reroll seam', () => {
  it('carries three of the four weak-area tags; “singular systems” lives on scene 5 (the capstone’s A is drawn invertible)', () => {
    // Precedent (la-eigen): the capstone carries the tags its goals honestly
    // drill. A 'singular systems' goal on a det=±1 matrix would be dishonest,
    // so that tag's home is inverse.singular (BOTH goals) and the lesson-wide
    // union test above keeps the four-tag review loop complete.
    const tags = capstoneFor(LESSON).goals.map((g) => g.tag);
    expect(new Set(tags)).toEqual(new Set(['inverse meaning', 'computing inverses', 'invertibility']));
    for (const g of capstoneFor(LESSON).goals) expect(typeof g.focus).toBe('string');
    const singular = scenesForLesson(LESSON).find((s) => s.id === 'inverse.singular');
    expect(singular.goals.map((g) => g.tag)).toEqual(['singular systems', 'singular systems']);
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
  it('every capstone goal has hold ≥ 700 (drive-by passes are blocked, exam-wide)', () => {
    expect(capstoneFor(LESSON).goals.every((g) => g.hold >= 700)).toBe(true);
  });
  it('every seed: controls reset to x=0/B=I, A comes from the det=±1 family, both targets are A·corner and distinct', () => {
    const cap = capstoneFor(LESSON);
    const FAMILY = [
      { c1: { x: 2, y: 1 }, c2: { x: 1, y: 1 } },
      { c1: { x: 1, y: 1 }, c2: { x: 1, y: 2 } },
      { c1: { x: 3, y: 2 }, c2: { x: 1, y: 1 } },
      { c1: { x: 1, y: 1 }, c2: { x: 2, y: 3 } },
      { c1: { x: -2, y: -1 }, c2: { x: 1, y: 1 } },
      { c1: { x: 1, y: 1 }, c2: { x: -1, y: -2 } },
    ];
    const XTS = [{ x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 }];
    for (let seed = 1; seed <= 200; seed++) {
      const p = cap.randomize(makeRng(seed));
      expect(p.x).toEqual({ x: 0, y: 0 });
      expect(p.bCol1).toEqual({ x: 1, y: 0 });
      expect(p.bCol2).toEqual({ x: 0, y: 1 });
      const fam = FAMILY.find((f) => f.c1.x === p.aCol1.x && f.c1.y === p.aCol1.y && f.c2.x === p.aCol2.x && f.c2.y === p.aCol2.y);
      expect(fam, 'seed ' + seed + ' drew a matrix outside the family').toBeTruthy();
      expect(Math.abs(det2(p.aCol1, p.aCol2))).toBe(1);
      const targets = XTS.map((xt) => matApply(p.aCol1, p.aCol2, xt));
      expect(targets.some((t) => t.x === p.b.x && t.y === p.b.y), 'seed ' + seed + ' b not A·corner').toBe(true);
      expect(targets.some((t) => t.x === p.b2.x && t.y === p.b2.y), 'seed ' + seed + ' b2 not A·corner').toBe(true);
      expect(p.b.x !== p.b2.x || p.b.y !== p.b2.y, 'seed ' + seed + ' b === b2').toBe(true);
    }
  });
});

describe('CAPSTONE BASELINE-SAFETY — exhaustive enumeration of the finite parameter space', () => {
  // Mirrors la-inverse.js's own proof comment. The reset state is always
  // x = (0,0), B = I, so at load: Ax = 0 (goals 1/3 measure ‖0 − b‖ = ‖b‖)
  // and B·A = A (goal 2 measures A's entrywise distance from I). Enumerate
  // the ENTIRE finite draw space — all 6 family matrices × 4 corners — not
  // just sampled seeds.
  const FAMILY = [
    { c1: { x: 2, y: 1 }, c2: { x: 1, y: 1 } },
    { c1: { x: 1, y: 1 }, c2: { x: 1, y: 2 } },
    { c1: { x: 3, y: 2 }, c2: { x: 1, y: 1 } },
    { c1: { x: 1, y: 1 }, c2: { x: 2, y: 3 } },
    { c1: { x: -2, y: -1 }, c2: { x: 1, y: 1 } },
    { c1: { x: 1, y: 1 }, c2: { x: -1, y: -2 } },
  ];
  const XTS = [{ x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 }];

  it('goals 1/3: ‖A·xt‖ ≥ 1 > 0.15 for ALL 24 family×corner combos — no target is ever pre-hit from x = 0', () => {
    let worst = Infinity;
    for (const A of FAMILY) for (const xt of XTS) {
      const b = matApply(A.c1, A.c2, xt);
      worst = Math.min(worst, mag(b));
      expect(mag(b)).toBeGreaterThan(0.15);
    }
    expect(worst).toBeGreaterThanOrEqual(1);   // the proof's stated margin (F5/F4 corners land at distance exactly 1)
  });
  it('goal 2: every family matrix has an entry ≥ 1 away from I — B·A = A is never within the 0.15 band of I at reset', () => {
    for (const A of FAMILY) {
      const maxDiff = Math.max(
        Math.abs(A.c1.x - 1), Math.abs(A.c1.y),
        Math.abs(A.c2.x), Math.abs(A.c2.y - 1),
      );
      expect(maxDiff).toBeGreaterThanOrEqual(1);
    }
  });
  it('goals 1 and 3 are mutually exclusive for every draw: ‖A·(xt1 − xt2)‖ ≥ 2 > 0.15 + 0.15', () => {
    for (const A of FAMILY) {
      for (let i = 0; i < XTS.length; i++) for (let j = 0; j < XTS.length; j++) {
        if (i === j) continue;
        const d = mag(sub(matApply(A.c1, A.c2, XTS[i]), matApply(A.c1, A.c2, XTS[j])));
        expect(d).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('ANTI-GAMING: degenerate strategies must NOT credit', () => {
  it('inverse.solve: hitting one target must not cross-credit the other (targets ≥ 2 apart, band 0.15)', () => {
    const s = sceneAt(0);
    expect(s.goals[0].predicate({ x: { x: 1, y: 1 } })).toBe(true);      // Ax = b exactly
    expect(s.goals[1].predicate({ x: { x: 1, y: 1 } })).toBe(false);     // …is 2 away from b2
    expect(s.goals[1].predicate({ x: { x: -1, y: 3 } })).toBe(true);     // Ax = b2 exactly
    expect(s.goals[0].predicate({ x: { x: -1, y: 3 } })).toBe(false);
  });
  it('inverse.undo g1: a below-floor B column must NOT credit even when the round trip lands exactly on t', () => {
    const s = sceneAt(1);
    // 3·(0.02,0.01) + 2·(0.47,0.485) = (1,1) EXACTLY — dist 0, but bCol1's
    // magnitude (≈0.022) is under the MIN_MAG floor: the predicate-side
    // re-check (layer 2) must block what the handle clamp (layer 1) missed.
    const shrunk = { bCol1: { x: 0.02, y: 0.01 }, bCol2: { x: 0.47, y: 0.485 } };
    expect(mag(sub(matApply(shrunk.bCol1, shrunk.bCol2, { x: 3, y: 2 }), { x: 1, y: 1 }))).toBeLessThan(0.2);   // the exploit is real…
    expect(s.goals[0].predicate(shrunk)).toBe(false);                                                          // …and blocked
    expect(s.goals[0].predicate({ bCol1: { x: 1, y: -1 }, bCol2: { x: -1, y: 2 } })).toBe(true);               // legit inverse credits
  });
  it('inverse.undo g2: a below-floor column must NOT credit, and a one-entry miss must NOT credit either', () => {
    const s = sceneAt(1);
    expect(s.goals[1].predicate({ bCol1: { x: 0.02, y: 0.01 }, bCol2: { x: -1, y: 2 } })).toBe(false);   // floor
    // three entries of B·A exact, the fourth 0.5 off — ALL FOUR must land
    expect(s.goals[1].predicate({ bCol1: { x: 1, y: -1 }, bCol2: { x: -1, y: 2.5 } })).toBe(false);
    expect(s.goals[1].predicate({ bCol1: { x: 1, y: -1 }, bCol2: { x: -1, y: 2 } })).toBe(true);
  });
  it('inverse.recip g1: the “one shared reciprocal” wrong intuition (s1 = s2 = 0.5) must NOT credit', () => {
    const s = sceneAt(2);
    expect(s.goals[0].predicate({ s1: 0.5, s2: 0.5 })).toBe(false);    // B·A = diag(1, 2) — y-axis not undone
    expect(s.goals[0].predicate({ s1: 0.25, s2: 0.5 })).toBe(false);   // swapped reciprocals — diag(0.5, 2)
    expect(s.goals[0].predicate({ s1: 0.5, s2: 0.25 })).toBe(true);    // per-axis reciprocals — diag(1, 1)
  });
  it('inverse.recip g2: undoing only one axis must NOT credit the uniform-×2 goal', () => {
    const s = sceneAt(2);
    expect(s.goals[1].predicate({ s1: 1, s2: 1 })).toBe(false);        // diag(2, 4) — second axis unmatched
    expect(s.goals[1].predicate({ s1: 0.5, s2: 0.5 })).toBe(false);    // diag(1, 2) — neither product is 2
    expect(s.goals[1].predicate({ s1: 1, s2: 0.5 })).toBe(true);       // diag(2, 2)
  });
  it('inverse.blowup g1: landing EXACTLY on det = 0 (t = 0.5 is on the slider lattice) must fail closed — no credit, no throw, no Infinity', () => {
    const s = sceneAt(3);
    expect(() => s.goals[0].predicate({ t: 0.5 })).not.toThrow();
    expect(s.goals[0].predicate({ t: 0.5 })).toBe(false);    // ON the wall: no inverse exists, ">8" must not credit via Infinity
    expect(s.goals[0].predicate({ t: 0.55 })).toBe(true);    // det = 0.1 → biggest entry 20 > 8, inside the (0.01, 0.25] band
    expect(s.goals[0].predicate({ t: 0.45 })).toBe(true);    // det = −0.1: NEAR the wall on the other side also counts
    expect(s.goals[0].predicate({ t: 0.65 })).toBe(false);   // det = 0.3: outside the band, biggest entry ≈ 6.7 ≤ 8
    expect(s.goals[0].predicate({ t: 2 })).toBe(false);      // healthy det = 3 — nowhere near the wall
  });
  it('inverse.blowup g2: merely-negative-near-the-wall det must NOT credit the “inverse comes back” goal', () => {
    const s = sceneAt(3);
    expect(s.goals[1].predicate({ t: 0.45 })).toBe(false);   // det = −0.1 > −0.5: still in blowup territory
    expect(s.goals[1].predicate({ t: 0.25 })).toBe(true);    // det = −0.5 exactly: tame inverse (biggest entry 4)
    expect(s.goals[1].predicate({ t: 0 })).toBe(true);       // det = −1: comfortably back
    expect(s.goals[1].predicate({ t: 1.5 })).toBe(false);    // positive det never credits the crossing goal
  });
  it('inverse.singular g1: shrinking x to the origin must NOT credit (Ax = 0 is 3.6 from b)', () => {
    const s = sceneAt(4);
    expect(s.goals[0].predicate({ x: { x: 0, y: 0 } })).toBe(false);
    expect(s.goals[0].predicate({ x: { x: 0.7, y: 0 } })).toBe(true);
  });
  it('inverse.singular g2: near-miss with a SMALL x, or a big x with a FAR output, must NOT credit — both gates required', () => {
    const s = sceneAt(4);
    expect(s.goals[1].predicate({ x: { x: 0.7, y: 0 } })).toBe(false);    // closest output but ‖x‖ = 0.7 < 3
    expect(s.goals[1].predicate({ x: { x: 3, y: 3 } })).toBe(false);      // ‖x‖ > 3 but Ax = (9,18) is nowhere near b
    expect(s.goals[1].predicate({ x: { x: 2.7, y: -4 } })).toBe(true);    // same near-miss output, genuinely far input
  });
  it('inverse.capstone g2: a below-floor B column must NOT credit; the exact inverse does', () => {
    const cap = capstoneFor(LESSON);
    const base = cap.randomize(makeRng(1));
    const inv = inv2(base.aCol1, base.aCol2);
    expect(cap.goals[1].predicate({ ...base, bCol1: { x: 0.02, y: 0.01 }, bCol2: inv.c2 })).toBe(false);
    expect(cap.goals[1].predicate({ ...base, bCol1: inv.c1, bCol2: inv.c2 })).toBe(true);
  });
  it('inverse.capstone g1/g3: solving one target must not cross-credit the other (targets ≥ 2 apart for every seed)', () => {
    const cap = capstoneFor(LESSON);
    for (let seed = 1; seed <= 50; seed++) {
      const base = cap.randomize(makeRng(seed));
      const inv = inv2(base.aCol1, base.aCol2);
      const xb = matApply(inv.c1, inv.c2, base.b);
      expect(cap.goals[0].predicate({ ...base, x: xb })).toBe(true);
      expect(cap.goals[2].predicate({ ...base, x: xb })).toBe(false);
    }
  });
});
