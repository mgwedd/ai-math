/* Scene lesson — la-projection headless tests (Vitest, node env).

   P2 wave L migration. Scenes are DATA + PURE PREDICATES; these need no
   GPU. Baseline-cleanliness + reachability run through the SHARED quality
   helpers (CONTRACT v1.4 §6, test/helpers/scene-invariants.mjs). The
   signed scene locks a to the unit circle and the line scene mixes a
   scalar `k` slider with a vec handle, so both search reachability via
   analytic witnesses rather than the auto-discovered handle grid alone.
   The helpers don't cover gameability, so every ≈0 / ratio goal (a
   vanishing b — or a vanishing a for b·â — is THE exploit here) carries a
   per-goal ANTI-GAMING test. The capstone's baseline-safety proof (see
   la-projection.js's own comment block) is checked exhaustively here across
   the full finite (angle, sTarget, rTarget) grid — 5×6×3 = 90 combos —
   not just sampled seeds. */
import { describe, it, expect, beforeAll } from 'vitest';
import { assertBaselineClean, assertReachable } from './helpers/scene-invariants.mjs';
import { dot, mag, scale, norm, proj, residVec, rot } from '../lib/curriculum/scenes/vec-math.js';

let makeRng, validateScenes;
let scenesForLesson, capstoneFor, validateSceneLessons;

const LESSON = 'la-projection';
const EXPECTED_IDS = [
  'proj.shadow', 'proj.perp', 'proj.signed', 'proj.line', 'proj.split', 'proj.capstone',
];
// The four migrated quiz tags (exact strings from the retiring quiz).
const QUIZ_TAGS = new Set([
  'residual is orthogonal', 'scalar projection',
  'projection depends on direction, not length', 'Pythagoras for the split',
]);

beforeAll(async () => {
  ({ makeRng, validateScenes } = await import('../lib/scene/index.js'));
  const res = await import('../lib/curriculum/scenes/index.js');   // registers all scene modules
  ({ scenesForLesson, capstoneFor, validateSceneLessons } = res);
});

const sceneAt = (i) => scenesForLesson(LESSON)[i];

describe('registration + validation', () => {
  it('registers the six la-projection scenes in arc order', () => {
    expect(scenesForLesson(LESSON).map((s) => s.id)).toEqual(EXPECTED_IDS);
  });
  it('passes the kit per-scene validateScenes() with zero problems', () => {
    expect(validateScenes()).toEqual([]);
  });
  it('passes the flagship lesson rule (exactly one capstone, last)', () => {
    expect(validateSceneLessons()).toEqual([]);
    expect(capstoneFor(LESSON).id).toBe('proj.capstone');
  });
  it('the line scene declares a slider control bound to the scalar param k', () => {
    const sc = sceneAt(3);
    expect(sc.id).toBe('proj.line');
    expect(Array.isArray(sc.controls)).toBe(true);
    expect(sc.controls[0].kind).toBe('slider');
    expect(sc.controls[0].param).toBe('k');
    expect(typeof sc.params.k).toBe('number');
    expect(sc.params.k).toBeGreaterThanOrEqual(-3);
    expect(sc.params.k).toBeLessThanOrEqual(3);
  });
  it('the signed scene locks a to the unit circle (a handle with a constrain closure)', () => {
    const sc = sceneAt(2);
    expect(sc.id).toBe('proj.signed');
    // a is a circle-constrained handle; the constrain maps any point to ‖·‖ = 1
    const clamped = { x: 3, y: 4 };   // mag 5 → should come back at mag 1
    // reconstruct the constrain via a probe handle in the display list
    const list = sc.entities({ a: { x: 1, y: 0 }, b: { x: 0.5, y: 2 } }, 0);
    const aHandle = list.find((e) => e.handle && e.handle.bind === 'a');
    expect(aHandle).toBeTruthy();
    expect(typeof aHandle.handle.constrain).toBe('function');
    const out = aHandle.handle.constrain(clamped);
    expect(Math.hypot(out.x, out.y)).toBeCloseTo(1, 9);
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
        expect(g.xp).toBeGreaterThanOrEqual(20);
        expect(g.xp).toBeLessThanOrEqual(40);
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
  it('precision goals hold ≥ 400ms (≥ 700ms on the capstone) — drive-by passes blocked', () => {
    for (const s of scenesForLesson(LESSON)) {
      for (const g of s.goals) {
        expect(g.hold, s.id + ' hold').toBeGreaterThanOrEqual(s.capstone ? 700 : 400);
      }
    }
  });
  it('the four migrated tags are ALL covered across the arc (union), capstone honestly carries three', () => {
    const union = new Set();
    for (const s of scenesForLesson(LESSON)) for (const g of s.goals) union.add(g.tag);
    expect(union).toEqual(QUIZ_TAGS);
    const capTags = new Set(capstoneFor(LESSON).goals.map((g) => g.tag));
    expect(capTags).toEqual(new Set(['scalar projection', 'Pythagoras for the split', 'residual is orthogonal']));
    // the fourth tag lives on scene 4 (both goals), per the header's resolution
    expect(sceneAt(3).goals.every((g) => g.tag === 'projection depends on direction, not length')).toBe(true);
  });
  it('R-CONTENT invariant (g): every goal text states a conceptual payoff, not just the mechanical action', () => {
    // Honest proxy (mirrors test/scenes-la-det/eigen). Every goal here uses an
    // explicit ", to see how …" WHY clause adding a payoff beyond the action.
    const WHY_RE = /to see how/i;
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
  const A5 = { x: 2, y: 1 };

  it('proj.shadow — free a and b, tight t≈1 / residual goals via analytic witnesses', () => {
    assertReachable(sceneAt(0), {
      witnesses: () => [
        { a: { x: 2, y: 0 }, b: { x: 2, y: 2 } },   // goal 1: t=1, ‖r‖=2 (b off the line)
        { a: { x: 2, y: 0 }, b: { x: 2, y: 0 } },   // goal 2: b on the line, r=0, ‖b‖=2
      ],
    });
  });

  it('proj.perp — perpendicular from each half-plane via analytic witnesses', () => {
    assertReachable(sceneAt(1), {
      witnesses: () => [
        { a: { x: 2, y: 0 }, b: { x: 0, y: 2 } },    // goal 1: b·â=0, a×b=+4 (left)
        { a: { x: 2, y: 0 }, b: { x: 0, y: -2 } },   // goal 2: b·â=0, a×b=−4 (right)
      ],
    });
  });

  it('proj.signed — a circle-locked, b free: signed targets via analytic witnesses', () => {
    assertReachable(sceneAt(2), {
      witnesses: () => [
        { a: { x: 1, y: 0 }, b: { x: 2, y: 0 } },    // goal 1: b·â = +2
        { a: { x: 1, y: 0 }, b: { x: -2, y: 0 } },   // goal 2: b·â = −2
      ],
    });
  });

  it('proj.line — k is a slider (no handle), b free: invariance + sign-flip via witnesses', () => {
    assertReachable(sceneAt(3), {
      dims: [{ bind: 'k', range: [-3, 3], steps: 120 }],
      witnesses: () => [
        { k: 3, b: { x: 1, y: 2 } },    // goal 1: |k|≥2.5, vector proj unmoved (always true)
        { k: -1, b: { x: 1, y: 2 } },   // goal 2: k≤−0.5, |proj(b,a0)|≥0.3, scalar sign flips
      ],
    });
  });

  it('proj.split — b free, Pythagorean legs via analytic witnesses (45°, ⊥, along)', () => {
    const ah = norm(A5), perp = norm({ x: -1, y: 2 });
    assertReachable(sceneAt(4), {
      witnesses: () => [
        { b: { x: ah.x * 2 + perp.x * 2, y: ah.y * 2 + perp.y * 2 } },   // goal 1: ‖proj‖²=‖r‖² (45°)
        { b: scale(perp, 2) },                                          // goal 2: ‖r‖² all of ‖b‖²
        { b: scale(ah, 2) },                                            // goal 3: ‖proj‖² all of ‖b‖²
      ],
    });
  });

  it('proj.capstone — every target reachable for every seed (analytic witnesses)', () => {
    assertReachable(capstoneFor(LESSON), {
      seeds: 50,
      step: 1,   // coarsen the (redundant) auto grid past the combo guard — witnesses do the proving
      witnesses: (base) => {
        const perp = rot(base.a, Math.PI / 2);
        return [
          { ...base, b: scale(base.a, base.sTarget) },                                 // goal 1: b·â = sTarget
          { ...base, b: { x: perp.x * base.rTarget + base.a.x * 0.5, y: perp.y * base.rTarget + base.a.y * 0.5 } }, // goal 2: ‖r‖ = rTarget, ‖b‖ > 1
          { ...base, b: scale(base.a, 2) },                                            // goal 3: collapse (b on line)
        ];
      },
    });
  });
});

describe('capstone: weak-area tag migration + the official reroll seam', () => {
  it('carries three of the old quiz’s four weak-area tags (the fourth lives on scene 4)', () => {
    const tags = capstoneFor(LESSON).goals.map((g) => g.tag);
    expect(new Set(tags)).toEqual(new Set(['scalar projection', 'Pythagoras for the split', 'residual is orthogonal']));
    for (const g of capstoneFor(LESSON).goals) expect(typeof g.focus).toBe('string');
  });
  it('randomize(makeRng(seed)) is deterministic per seed, distinct across seeds', () => {
    const cap = capstoneFor(LESSON);
    expect(typeof cap.randomize).toBe('function');
    const draws = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => JSON.stringify(cap.randomize(makeRng(seed))));
    expect(new Set(draws).size).toBeGreaterThan(1);
    expect(cap.randomize(makeRng(9))).toEqual(cap.randomize(makeRng(9)));
  });
  it('params is the seed-1 draw, so every randomize key has an atom to write through', () => {
    const cap = capstoneFor(LESSON);
    expect(cap.params).toEqual(cap.randomize(makeRng(1)));
  });
  it('every capstone goal has hold>0 (drive-by passes are blocked, exam-wide)', () => {
    expect(capstoneFor(LESSON).goals.every((g) => g.hold > 0)).toBe(true);
  });
  it('capstone draws stay in the finite sets, b resets exactly ⊥ the unit line at norm 3.2, for every seed', () => {
    const cap = capstoneFor(LESSON);
    const S_TARGETS = [1.5, -1.5, 2, -2, 2.5, -2.5], R_TARGETS = [1, 1.5, 2];
    for (let seed = 1; seed <= 200; seed++) {
      const p = cap.randomize(makeRng(seed));
      expect(S_TARGETS).toContain(p.sTarget);
      expect(R_TARGETS).toContain(p.rTarget);
      expect(mag(p.a)).toBeCloseTo(1, 9);              // a is a UNIT direction
      expect(Math.abs(dot(p.a, p.b))).toBeLessThan(1e-9);  // b0 ⊥ a exactly
      expect(mag(p.b)).toBeCloseTo(3.2, 9);            // b0 norm = 3.2
    }
  });
});

describe('CAPSTONE BASELINE-SAFETY — exhaustive enumeration of the finite parameter space', () => {
  // Mirrors la-projection.js's own proof comment: b resets to b0 ⊥ a at norm
  // 3.2, so at load b·â = 0 and ‖r‖ = 3.2 for EVERY draw. Enumerate all
  // 5×6×3 = 90 (angle, sTarget, rTarget) combos and assert each goal false.
  const ANGLES = [15, 40, 65, 115, 140].map((d) => (d * Math.PI) / 180);
  const S_TARGETS = [1.5, -1.5, 2, -2, 2.5, -2.5];
  const R_TARGETS = [1, 1.5, 2];
  const B0_NORM = 3.2;

  it('no goal is satisfied at load for ANY (angle, sTarget, rTarget) combo', () => {
    let combos = 0;
    const cap = capstoneFor(LESSON);
    for (const phi of ANGLES) {
      const a = rot({ x: 1, y: 0 }, phi);
      const b = scale(rot(a, Math.PI / 2), B0_NORM);
      for (const sTarget of S_TARGETS) {
        for (const rTarget of R_TARGETS) {
          combos++;
          const s = { a, b, sTarget, rTarget };
          for (const g of cap.goals) expect(g.predicate(s), 'combo φ=' + phi + ' s=' + sTarget + ' r=' + rTarget).toBe(false);
        }
      }
    }
    expect(combos).toBe(90);   // sanity: the enumeration actually ran
  });

  it('the baseline margins clear the ±0.15 bands with room, for every combo (analytic)', () => {
    for (const phi of ANGLES) {
      const a = rot({ x: 1, y: 0 }, phi);
      const b = scale(rot(a, Math.PI / 2), B0_NORM);
      for (const sTarget of S_TARGETS) expect(Math.abs(proj(b, a) - sTarget)).toBeGreaterThan(0.15);   // b·â = 0
      for (const rTarget of R_TARGETS) expect(Math.abs(mag(residVec(b, a)) - rTarget)).toBeGreaterThan(0.15);  // ‖r‖ = 3.2
    }
  });
});

describe('ANTI-GAMING: degenerate strategies must NOT credit', () => {
  it('proj.shadow g2 (collapse residual): a shrunk-to-nothing b must NOT credit', () => {
    const s = sceneAt(0);
    expect(s.goals[1].predicate({ a: { x: 2, y: 0 }, b: { x: 0.02, y: 0 } })).toBe(false);   // on the line but ‖b‖ < 1
    expect(s.goals[1].predicate({ a: { x: 2, y: 0 }, b: { x: 2, y: 0 } })).toBe(true);       // real b on the line
  });
  it('proj.perp g1/g2 (scalar ≈ 0): a vanishing b — OR a vanishing a — must NOT fake the zero', () => {
    const s = sceneAt(1);
    // tiny b: b·â ≈ 0 for free
    expect(s.goals[0].predicate({ a: { x: 2, y: 0 }, b: { x: 0, y: 0.05 } })).toBe(false);
    expect(s.goals[1].predicate({ a: { x: 2, y: 0 }, b: { x: 0, y: -0.05 } })).toBe(false);
    // tiny a: proj() returns 0 for a zero-length a — the ‖a‖ > MIN_MAG gate blocks it
    expect(s.goals[0].predicate({ a: { x: 0.01, y: 0 }, b: { x: 0, y: 2 } })).toBe(false);
    // legitimate perpendiculars, one per half-plane
    expect(s.goals[0].predicate({ a: { x: 2, y: 0 }, b: { x: 0, y: 2 } })).toBe(true);
    expect(s.goals[1].predicate({ a: { x: 2, y: 0 }, b: { x: 0, y: -2 } })).toBe(true);
  });
  it('proj.line g1: a huge |k| with the arrow scaled is honest — but k=1 (baseline) never credits', () => {
    const s = sceneAt(3);
    expect(s.goals[0].predicate({ k: 1, b: { x: 1, y: 2 } })).toBe(false);   // |k| < 2.5
    expect(s.goals[0].predicate({ k: 3, b: { x: 1, y: 2 } })).toBe(true);
    // goal 2 needs a genuine sign flip: a perpendicular-parked b (proj≈0) can't fake it
    expect(s.goals[1].predicate({ k: -1, b: { x: -1, y: 2 } })).toBe(false);  // b ⊥ a0 → |proj| < 0.3
    expect(s.goals[1].predicate({ k: -1, b: { x: 1, y: 2 } })).toBe(true);
  });
  it('proj.split g2/g3 (≥90% ratio): a tiny b passes the ratio but is blocked by the ‖b‖ ≥ 1.5 floor', () => {
    const s = sceneAt(4);
    const ah = norm({ x: 2, y: 1 }), perp = norm({ x: -1, y: 2 });
    expect(s.goals[2].predicate({ b: scale(ah, 0.1) })).toBe(false);    // 100% projection but ‖b‖ = 0.1
    expect(s.goals[1].predicate({ b: scale(perp, 0.1) })).toBe(false);  // 100% residual but ‖b‖ = 0.1
    expect(s.goals[2].predicate({ b: scale(ah, 2) })).toBe(true);
    expect(s.goals[1].predicate({ b: scale(perp, 2) })).toBe(true);
  });
  it('proj.capstone g3 (collapse): a near-zero b must NOT credit; a real b on the line does', () => {
    const cap = capstoneFor(LESSON);
    const base = cap.randomize(makeRng(1));
    expect(cap.goals[2].predicate({ ...base, b: scale(base.a, 0.02) })).toBe(false);   // ‖b‖ < 1
    expect(cap.goals[2].predicate({ ...base, b: scale(base.a, 2) })).toBe(true);       // b on the line, ‖b‖ = 2
  });
});
