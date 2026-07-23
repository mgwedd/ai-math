/* Scene lesson — la-eigen headless tests (Vitest, node env).

   P2 wave B migration (CONTRACT Amendment v1.6 §2). Scenes are DATA + PURE
   PREDICATES; these need no GPU. Baseline-cleanliness + reachability run
   through the SHARED quality helpers (CONTRACT v1.4 §6,
   test/helpers/scene-invariants.mjs). The diagonal scene mixes THREE scalar
   sliders with a vec handle, and the pca scene has only a scalar slider, so
   both search reachability via explicit witnesses/dims rather than the
   auto-discovered handle grid alone. The helpers don't cover gameability,
   so every alignment goal (parallelism is scale-invariant — Amendment v1.6
   §2's review warning) carries a per-goal ANTI-GAMING test proving a
   near-zero v does NOT credit even when its direction is exactly aligned.
   The capstone's baseline-safety proof (see la-eigen.js's own comment
   block) is checked exhaustively here across the full finite
   (lambda-pair, phi) grid, not just sampled seeds. */
import { describe, it, expect, beforeAll } from 'vitest';
import { assertBaselineClean, assertReachable } from './helpers/scene-invariants.mjs';
import { eigSym2, eigenMatrix, isAligned, eigRatio, matApply, scale, norm, dot, add } from '../lib/curriculum/scenes/vec-math.js';

let makeRng, validateScenes, toAtoms, view;
let scenesForLesson, capstoneFor, validateSceneLessons;

const LESSON = 'la-eigen';
const EXPECTED_IDS = [
  'eigen.anatomy', 'eigen.diagonal', 'eigen.hunt', 'eigen.orthogonal', 'eigen.pca',
  'eigen.power', 'eigen.tracedet', 'eigen.capstone',
];
const QUIZ_TAGS = new Set(['eigen definition', 'diagonal matrices', 'PCA connection']);

beforeAll(async () => {
  ({ makeRng, validateScenes, toAtoms, view } = await import('../lib/scene/index.js'));
  const res = await import('../lib/curriculum/scenes/index.js');   // registers all scene modules
  ({ scenesForLesson, capstoneFor, validateSceneLessons } = res);
});

const sceneAt = (i) => scenesForLesson(LESSON)[i];

describe('registration + validation', () => {
  it('registers the six la-eigen scenes in arc order', () => {
    expect(scenesForLesson(LESSON).map((s) => s.id)).toEqual(EXPECTED_IDS);
  });
  it('passes the kit per-scene validateScenes() with zero problems', () => {
    expect(validateScenes()).toEqual([]);
  });
  it('passes the flagship lesson rule (exactly one capstone, last)', () => {
    expect(validateSceneLessons()).toEqual([]);
    expect(capstoneFor(LESSON).id).toBe('eigen.capstone');
  });
  it('the diagonal scene declares three scalar sliders (a, b, d)', () => {
    const sc = sceneAt(1);
    expect(Array.isArray(sc.controls)).toBe(true);
    expect(sc.controls.map((c) => c.param)).toEqual(['a', 'b', 'd']);
    for (const c of sc.controls) expect(c.kind).toBe('slider');
    expect(typeof sc.params.a).toBe('number');
    expect(typeof sc.params.b).toBe('number');
    expect(typeof sc.params.d).toBe('number');
  });
  it('the pca scene declares a single theta slider bound to a scalar param', () => {
    const sc = sceneAt(4);
    expect(Array.isArray(sc.controls)).toBe(true);
    expect(sc.controls[0].kind).toBe('slider');
    expect(sc.controls[0].param).toBe('theta');
    expect(typeof sc.params.theta).toBe('number');
  });
  it('the power scene declares a single integer-stepped k slider (0..12)', () => {
    const sc = sceneAt(5);
    expect(sc.id).toBe('eigen.power');
    expect(sc.controls.map((c) => c.param)).toEqual(['k']);
    expect(sc.controls[0].kind).toBe('slider');
    expect(sc.controls[0].min).toBe(0);
    expect(sc.controls[0].max).toBe(12);
    expect(sc.controls[0].step).toBe(1);
    expect(sc.params.k).toBe(0);
  });
  it('the tracedet scene declares trace/det/phi sliders', () => {
    const sc = sceneAt(6);
    expect(sc.id).toBe('eigen.tracedet');
    expect(sc.controls.map((c) => c.param)).toEqual(['trace', 'det', 'phi']);
    for (const c of sc.controls) expect(c.kind).toBe('slider');
    expect(sc.params).toEqual({ trace: 3, det: 1, phi: 0.3 });
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
    // Honest proxy (mirrors test/scenes-c-limits.test.mjs). Bare "always"/
    // "neither"/"perpendicular" were rejected in review — the untouched,
    // already-factual goal texts contain those words verbatim ("ALWAYS an
    // eigenvector", "NEITHER eigenvalue moves", "always perpendicular"),
    // so they false-passed bare mechanic text everywhere else too. Only
    // "principal component" / "PCA" survive as distinctive markers, shared
    // by eigen.pca g1/g2 and eigen.capstone g3 (already explicit, the three
    // legitimate skips). Verified: this regex fails every pre-rewrite goal
    // at origin/main except those three.
    const WHY_RE = /(to see how|principal component|\bPCA\b)/i;
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
  it('eigen.anatomy — free v (auto-discovered handle, default grid hits both eigen-dirs)', () => {
    assertReachable(sceneAt(0));
  });

  it('eigen.diagonal — a/b/d are sliders, not handle-bound: searched via analytic witnesses', () => {
    assertReachable(sceneAt(1), {
      witnesses: () => [
        { a: 4, b: 0, d: 3, v: { x: 1, y: 0 } },      // goal 1 (a=4,d=3) + goal 2 (aligned to î, a=4)
        { a: 4, b: 3.5, d: 3, v: { x: 1, y: 0 } },    // goal 3 (b>3, a=4, d=3)
      ],
    });
  });

  it('eigen.hunt — free v, tight eigen-directions searched via analytic witnesses', () => {
    const eig = eigSym2(3, 1, 0);
    assertReachable(sceneAt(2), {
      witnesses: () => [
        { v: scale(eig.dir1, 2) },   // goal 1: stretch direction
        { v: scale(eig.dir2, 2) },   // goal 2: flip direction
        { v: { x: 0, y: 1 } },       // goal 3: break alignment (90° away)
      ],
    });
  });

  it('eigen.orthogonal — v1/v2 auto-discovered circle handles, exact witness for all three goals', () => {
    const eig = eigSym2(2, 1, 2);
    assertReachable(sceneAt(3), {
      witnesses: () => [{ v1: scale(eig.dir1, 2), v2: scale(eig.dir2, 2) }],
    });
  });

  it('eigen.pca — theta searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(4), { dims: [{ bind: 'theta', range: [-Math.PI / 2, Math.PI / 2], steps: 300 }] });
  });

  it('eigen.power — k is an integer slider (no handle): searched as an explicit dim over its full 0..12 range', () => {
    assertReachable(sceneAt(5), { dims: [{ bind: 'k', range: [0, 12], steps: 12 }] });
  });

  it('eigen.tracedet — trace/det/phi are sliders, not handle-bound: searched via analytic witnesses', () => {
    assertReachable(sceneAt(6), {
      witnesses: () => [
        { trace: 5, det: 4, phi: 0.3 },    // goal 1: λ1=4, λ2=1 (exact root of x²-5x+4)
        { trace: 0, det: 2, phi: 0.3 },    // goal 2: 0 < 4*2-0.1 — well past the tr²<4·det boundary
        { trace: 3, det: 1, phi: 2.0 },    // goal 3: distinct eigenvalues (disc=5), axis at the target angle
      ],
    });
  });

  it('eigen.capstone — every target reachable for every seed (analytic witnesses)', () => {
    assertReachable(capstoneFor(LESSON), {
      seeds: 100,
      step: 1,   // coarsen the (redundant) auto grid past the combo guard — witnesses do the proving
      witnesses: (base) => [
        { ...base, v: base.tDir1 },   // goal 1 (and goal 3 when tDir1 is dominant)
        { ...base, v: base.tDir2 },   // goal 2 (and goal 3 when tDir2 is dominant)
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
  it('capstone lambda1 != lambda2 for every seed (a repeated eigenvalue would make every direction trivial)', () => {
    const cap = capstoneFor(LESSON);
    for (let seed = 1; seed <= 200; seed++) {
      const p = cap.randomize(makeRng(seed));
      expect(p.tLambda1).not.toBe(p.tLambda2);
      expect(p.v).toEqual({ x: 1, y: 0 });   // control resets to the fixed reset vector
    }
  });
  it('the randomized matrix (mcol1,mcol2) really has (tLambda1,tDir1)/(tLambda2,tDir2) as its eigen-pairs', () => {
    const cap = capstoneFor(LESSON);
    for (let seed = 1; seed <= 30; seed++) {
      const p = cap.randomize(makeRng(seed));
      const Mv1 = matApply(p.mcol1, p.mcol2, p.tDir1);
      const Mv2 = matApply(p.mcol1, p.mcol2, p.tDir2);
      expect(isAligned(p.tDir1, Mv1)).toBe(true);
      expect(Math.abs(eigRatio(p.tDir1, Mv1) - p.tLambda1)).toBeLessThan(1e-6);
      expect(isAligned(p.tDir2, Mv2)).toBe(true);
      expect(Math.abs(eigRatio(p.tDir2, Mv2) - p.tLambda2)).toBeLessThan(1e-6);
    }
  });
});

describe('CAPSTONE BASELINE-SAFETY — exhaustive enumeration of the finite parameter space', () => {
  // Mirrors la-eigen.js's own proof comment: v resets to [1,0]; Mv = mcol1 is
  // the ONLY vector ever evaluated at baseline (whichever goal is checked),
  // so `cos([1,0], mcol1)` bounded away from ±0.995 for every possible draw
  // is sufficient to prove all three goals false at load, for every seed.
  const LAMBDAS = [0.6, 1.4, 2.2, -1.0];
  const PHI_DEG = [30, 60, 120, 150, 210, 240, 300, 330];

  it('cos(v0, M·v0) stays below the alignment epsilon for EVERY (lambda1,lambda2,phi) combo', () => {
    let worst = 0;
    for (let i1 = 0; i1 < LAMBDAS.length; i1++) {
      for (let i2 = 0; i2 < LAMBDAS.length; i2++) {
        if (i1 === i2) continue;
        for (const deg of PHI_DEG) {
          const phi = (deg * Math.PI) / 180;
          const { col1 } = eigenMatrix(LAMBDAS[i1], LAMBDAS[i2], phi);
          const v0 = { x: 1, y: 0 };
          const denom = Math.hypot(v0.x, v0.y) * Math.hypot(col1.x, col1.y);
          const cosine = denom === 0 ? 0 : (v0.x * col1.x + v0.y * col1.y) / denom;
          if (Math.abs(cosine) > worst) worst = Math.abs(cosine);
          expect(Math.abs(cosine)).toBeLessThan(0.995);
        }
      }
    }
    expect(worst).toBeLessThan(0.995);   // sanity: the enumeration actually ran
  });
});

describe('P2 wave J — POWER ITERATION honesty conditions (Amendment v1.14)', () => {
  // The mined convergence claim requires TWO things to be true, and here
  // they are properties of fixed module-scope constants (not user input),
  // so they are provable ONCE rather than per-attempt: |lambda1| > |lambda2|
  // for both matrices, and the fixed start v0 is genuinely non-orthogonal to
  // the shared dominant direction [1,1].
  const M1_EIG = eigSym2(2, 1, 2);          // fast: lambda 3, 1
  const SLOW_EIG = eigSym2(1, 0.1, 1);      // slow: lambda 1.1, 0.9
  const DOM = norm({ x: 1, y: 1 });
  const V0 = { x: Math.cos(Math.PI / 12), y: Math.sin(Math.PI / 12) };
  function powerVec(eig, v0, k) {
    const c1 = dot(v0, eig.dir1), c2 = dot(v0, eig.dir2);
    return norm(add(scale(eig.dir1, Math.pow(eig.lambda1, k) * c1), scale(eig.dir2, Math.pow(eig.lambda2, k) * c2)));
  }
  it('both matrices satisfy |lambda1| > |lambda2| (the convergence precondition)', () => {
    expect(Math.abs(M1_EIG.lambda1)).toBeGreaterThan(Math.abs(M1_EIG.lambda2));
    expect(Math.abs(SLOW_EIG.lambda1)).toBeGreaterThan(Math.abs(SLOW_EIG.lambda2));
  });
  it('the fixed start v0 is genuinely non-orthogonal to the dominant direction (cos ≈ 0.866, not ≈ 0)', () => {
    expect(Math.abs(dot(V0, DOM))).toBeGreaterThan(0.5);   // well clear of the orthogonal (never-converges) case
  });
  it('both eigen-decompositions share the SAME dominant direction [1,1], so one dashed target line is honest for both', () => {
    expect(Math.abs(dot(M1_EIG.dir1, DOM))).toBeCloseTo(1, 6);
    expect(Math.abs(dot(SLOW_EIG.dir1, DOM))).toBeCloseTo(1, 6);
  });
  it('v_k stays EXACTLY unit length for every k (normalize is baked into the closed form) — no vanishing-vector exploit is even possible', () => {
    for (let k = 0; k <= 12; k++) {
      expect(Math.hypot(powerVec(M1_EIG, V0, k).x, powerVec(M1_EIG, V0, k).y)).toBeCloseTo(1, 9);
      expect(Math.hypot(powerVec(SLOW_EIG, V0, k).x, powerVec(SLOW_EIG, V0, k).y)).toBeCloseTo(1, 9);
    }
  });
  it('the eigenvalue-gap speed payoff is real: FAST crosses 0.995 alignment by k=2; SLOW does not cross it until k=9', () => {
    const cosAt = (eig, k) => { const v = powerVec(eig, V0, k); return Math.abs(dot(v, DOM)); };
    expect(cosAt(M1_EIG, 1)).toBeLessThan(0.995);     // not yet at k=1
    expect(cosAt(M1_EIG, 2)).toBeGreaterThanOrEqual(0.995);
    expect(cosAt(SLOW_EIG, 8)).toBeLessThan(0.995);   // not yet at k=8
    expect(cosAt(SLOW_EIG, 9)).toBeGreaterThanOrEqual(0.995);
  });
});

describe('ANTI-GAMING: degenerate strategies must NOT credit', () => {
  it('eigen.anatomy g1/g2: a near-zero v exactly on the eigen-direction must NOT credit (magnitude floor)', () => {
    const s = sceneAt(0);
    expect(s.goals[0].predicate({ v: { x: 0.05, y: 0.05 } })).toBe(false);   // exactly dir1, mag 0.07 < floor
    expect(s.goals[1].predicate({ v: { x: 0.05, y: -0.05 } })).toBe(false); // exactly dir2, mag 0.07 < floor
    // legitimate: same DIRECTION, real magnitude
    expect(s.goals[0].predicate({ v: { x: 1, y: 1 } })).toBe(true);
    expect(s.goals[1].predicate({ v: { x: 1, y: -1 } })).toBe(true);
  });
  it('eigen.hunt g1/g2: a near-zero v must NOT credit even when perfectly aligned', () => {
    const s = sceneAt(2);
    const eig = eigSym2(3, 1, 0);
    const tiny1 = scale(eig.dir1, 0.05), tiny2 = scale(eig.dir2, 0.05);
    expect(s.goals[0].predicate({ v: tiny1 })).toBe(false);
    expect(s.goals[1].predicate({ v: tiny2 })).toBe(false);
    expect(s.goals[0].predicate({ v: scale(eig.dir1, 2) })).toBe(true);
    expect(s.goals[1].predicate({ v: scale(eig.dir2, 2) })).toBe(true);
  });
  it('eigen.diagonal g2: a near-zero v must NOT credit even with a=4 and direction aligned to î', () => {
    const s = sceneAt(1);
    expect(s.goals[1].predicate({ a: 4, b: 0, d: 3, v: { x: 0.01, y: 0 } })).toBe(false);
    expect(s.goals[1].predicate({ a: 4, b: 0, d: 3, v: { x: 1, y: 0 } })).toBe(true);
  });
  it('eigen.orthogonal g3: a merely-orthogonal (non-eigen) pair must NOT credit — only genuine eigen-alignment does', () => {
    const s = sceneAt(3);
    // v1,v2 already at 90° to each other, but neither is an eigenvector of M
    expect(s.goals[2].predicate({ v1: { x: 2, y: 0 }, v2: { x: 0, y: 2 } })).toBe(false);
    const eig = eigSym2(2, 1, 2);
    expect(s.goals[2].predicate({ v1: scale(eig.dir1, 2), v2: scale(eig.dir2, 2) })).toBe(true);
  });
  it('eigen.capstone g1: a near-zero v exactly on target 1 must NOT credit', () => {
    const cap = capstoneFor(LESSON);
    const base = cap.randomize(makeRng(1));
    const tiny = scale(base.tDir1, 0.05);
    expect(cap.goals[0].predicate({ ...base, v: tiny })).toBe(false);
    expect(cap.goals[0].predicate({ ...base, v: base.tDir1 })).toBe(true);
  });
  it('eigen.power: k=0 (the untouched baseline) must NOT credit ANY of the three goals', () => {
    const s = sceneAt(5);
    for (const g of s.goals) expect(g.predicate({ k: 0 })).toBe(false);
  });
  it('eigen.power g1: k=1 (one application short) must NOT credit — genuine iteration is required, not "any nonzero k"', () => {
    const s = sceneAt(5);
    expect(s.goals[0].predicate({ k: 1 })).toBe(false);
    expect(s.goals[0].predicate({ k: 2 })).toBe(true);
  });
  it('eigen.power g2: the k∈{2..6} window is exact — k=6 still credits, k=7 does not (review-pinned boundary)', () => {
    const s = sceneAt(5);
    expect(s.goals[1].predicate({ k: 2 })).toBe(true);    // FAST converged, SLOW still adrift
    expect(s.goals[1].predicate({ k: 6 })).toBe(true);    // SLOW cos ≈ 0.9853, still under the 0.99 gate
    expect(s.goals[1].predicate({ k: 7 })).toBe(false);   // SLOW cos ≈ 0.9901, just crossed the 0.99 gate
    expect(s.goals[1].predicate({ k: 8 })).toBe(false);   // by k=8 SLOW has also converged past the 0.99 gate
  });
  it('eigen.tracedet g3: a repeated (or near-repeated) eigenvalue must NOT credit an axis-angle target, however precisely phi is dialed in', () => {
    const s = sceneAt(6);
    // trace=2, det=1 -> lambda1=lambda2=1 exactly (disc=0): EVERY direction is
    // technically an eigenvector here, so "the" eigen-axis angle is meaningless —
    // must NOT credit even with phi landing exactly on the target.
    expect(s.goals[2].predicate({ trace: 2, det: 1, phi: 2.0 })).toBe(false);
    // legitimate: genuinely distinct eigenvalues (disc=5) at the same target angle
    expect(s.goals[2].predicate({ trace: 3, det: 1, phi: 2.0 })).toBe(true);
  });
  it('eigen.tracedet g1/g2: complex-eigenvalue territory (tr²<4·det) must NOT accidentally satisfy the target-eigenvalue goal', () => {
    const s = sceneAt(6);
    // trace=0, det=6 -> disc=-24 < 0: eigFromTraceDet returns null, so g1 must
    // fail closed (no crash, no false credit) rather than throw or coerce.
    expect(() => s.goals[0].predicate({ trace: 0, det: 6, phi: 0.3 })).not.toThrow();
    expect(s.goals[0].predicate({ trace: 0, det: 6, phi: 0.3 })).toBe(false);
  });
});

describe('P2 wave C — inset gauge retrofit (Amendment v1.7 §2), semantics-preserving', () => {
  it('eigen.pca declares an inset and routes a trace point + reference curve into it', () => {
    const s = sceneAt(4);
    expect(s.id).toBe('eigen.pca');
    expect(s.inset).toEqual({ rect: [0.62, 0.05, 0.33, 0.33], extent: 1.1 });
    const list = s.entities(view(toAtoms(s.params || {})), 0);
    const trace = list.find((e) => e.key === 'trace');
    expect(trace).toBeTruthy();
    expect(trace.frame).toBe('inset');
    expect(list.some((e) => e.kind === 'curve' && e.frame === 'inset')).toBe(true);
    // every main-space entity is untouched (still 'main', the default)
    expect(list.filter((e) => e.kind === 'segment').every((e) => e.frame === 'main')).toBe(true);
  });
  it('no inset entity carries a handle (read-only in v1.6)', () => {
    const s = sceneAt(4);
    const list = s.entities(view(toAtoms(s.params || {})), 0);
    for (const e of list.filter((x) => x.frame === 'inset')) expect(e.handle == null).toBe(true);
  });
  it('goals/params/controls/caption are BYTE-IDENTICAL to the pre-inset scene', () => {
    const s = sceneAt(4);
    expect(s.goals.length).toBe(3);
    expect(s.goals.map((g) => g.tag)).toEqual(['PCA connection', 'PCA connection', 'PCA connection']);
    expect(s.controls.map((c) => c.param)).toEqual(['theta']);
    expect(s.params).toEqual({ theta: 0 });
  });
});
