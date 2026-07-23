/* Scene lesson — la-matmul headless tests (Vitest, node env).

   P2 migration wave 2, lesson 1. Scenes are DATA + PURE PREDICATES; these
   need no GPU. Baseline-cleanliness + reachability run through the SHARED
   quality helpers (CONTRACT v1.4 §6, test/helpers/scene-invariants.mjs),
   same as la-matrix/la-vecops. The slider scene's control is a scalar
   param (not a vec handle), so its reachability is searched via an
   explicit scalar `dims`. The helpers don't cover gameability, so the
   entry-reading / collapse goals carry per-goal ANTI-GAMING tests. The
   capstone's baseline-safety proof (see la-matmul.js's own comment block)
   is checked EXHAUSTIVELY here — all 27 (φA, φB, sA1) combinations that
   feed capstone goal 3, not just sampled seeds — in addition to the
   shared ×1000-seed helper. */
import { describe, it, expect, beforeAll } from 'vitest';
import { assertBaselineClean, assertReachable } from './helpers/scene-invariants.mjs';

let makeRng, validateScenes;
let scenesForLesson, capstoneFor, validateSceneLessons;

const LESSON = 'la-matmul';
const EXPECTED_IDS = [
  'matmul.compose', 'matmul.order', 'matmul.entries',
  'matmul.slider', 'matmul.collapse', 'matmul.commute', 'matmul.capstone',
];

// pure helpers (mirror ./vec-math) for witnesses + anti-gaming states
const mag = (v) => Math.hypot(v.x, v.y);
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const matApply = (c1, c2, v) => ({ x: c1.x * v.x + c2.x * v.y, y: c1.y * v.x + c2.y * v.y });
const rot = (v, th) => {
  const c = Math.cos(th), s = Math.sin(th);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
};

beforeAll(async () => {
  ({ makeRng, validateScenes } = await import('../lib/scene/index.js'));
  const res = await import('../lib/curriculum/scenes/index.js');   // registers all scene modules
  ({ scenesForLesson, capstoneFor, validateSceneLessons } = res);
});

const sceneAt = (i) => scenesForLesson(LESSON)[i];

describe('registration + validation', () => {
  it('registers the six la-matmul scenes in arc order', () => {
    expect(scenesForLesson(LESSON).map((s) => s.id)).toEqual(EXPECTED_IDS);
  });
  it('passes the kit per-scene validateScenes() with zero problems', () => {
    expect(validateScenes()).toEqual([]);
  });
  it('passes the flagship lesson rule (exactly one capstone, last)', () => {
    expect(validateSceneLessons()).toEqual([]);
    expect(capstoneFor(LESSON).id).toBe('matmul.capstone');
  });
  it('the slider scene declares a slider control bound to a scalar param', () => {
    const sc = sceneAt(3);
    expect(Array.isArray(sc.controls)).toBe(true);
    expect(sc.controls[0].kind).toBe('slider');
    expect(sc.controls[0].param).toBe('k');
    expect(typeof sc.params.k).toBe('number');
    expect(sc.params.k).toBeGreaterThanOrEqual(-3);
    expect(sc.params.k).toBeLessThanOrEqual(3);
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
    const QUIZ_TAGS = new Set(['composition order', 'non-commutativity', 'product entries']);
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
  it('matmul.compose — free A columns hit exact-grid witnesses', () => { assertReachable(sceneAt(0)); });
  it('matmul.order — free probe v hits exact-grid witnesses', () => { assertReachable(sceneAt(1)); });
  it('matmul.entries — free A columns hit exact-grid witnesses', () => { assertReachable(sceneAt(2)); });

  it('matmul.slider — shear k searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(3), { dims: [{ bind: 'k', range: [-3, 3], steps: 200 }] });
  });

  it('matmul.collapse — reachable via an analytic witness (layer1 = identity, layer2 = target)', () => {
    assertReachable(sceneAt(4), {
      dims: [
        { bind: 'l1Col1', values: [{ x: 1, y: 0 }] },
        { bind: 'l1Col2', values: [{ x: 0, y: 1 }] },
        { bind: 'l2Col1', values: [{ x: 1, y: 0 }] },
        { bind: 'l2Col2', values: [{ x: 0, y: 1 }] },
      ],
      witnesses: () => [{ l1Col1: { x: 1, y: 0 }, l1Col2: { x: 0, y: 1 }, l2Col1: { x: 0, y: 2 }, l2Col2: { x: -1, y: 0 } }],
    });
  });

  it('matmul.commute — reachable via analytic witnesses (a non-commuting shear/rotate pair; two distinct rotations)', () => {
    assertReachable(sceneAt(5), {
      dims: [
        { bind: 'aCol1', values: [{ x: 1, y: 0 }] },
        { bind: 'aCol2', values: [{ x: 0, y: 1 }] },
        { bind: 'bCol1', values: [{ x: 1, y: 0 }] },
        { bind: 'bCol2', values: [{ x: 0, y: 1 }] },
      ],
      witnesses: () => {
        const phiA = (60 * Math.PI) / 180, phiB = (150 * Math.PI) / 180;
        return [
          { aCol1: { x: 1, y: 0 }, aCol2: { x: 1, y: 1 }, bCol1: { x: 0, y: 1 }, bCol2: { x: -1, y: 0 } },   // goal 1: gap > 1.5
          { aCol1: rot({ x: 1, y: 0 }, phiA), aCol2: rot({ x: 0, y: 1 }, phiA),                              // goal 2: two distinct
            bCol1: rot({ x: 1, y: 0 }, phiB), bCol2: rot({ x: 0, y: 1 }, phiB) },                            //   rotations commute
        ];
      },
    });
  });

  it('matmul.capstone — every target reachable for every seed (exact-reproduction witness)', () => {
    assertReachable(capstoneFor(LESSON), {
      seeds: 50,
      step: 4,   // coarsen the (redundant) 4-handle auto grid past the combo guard — the witness proves it
      witnesses: (base) => [{
        ...base,
        aCol1: base.tACol1, aCol2: base.tACol2,
        bCol1: base.tBCol1, bCol2: base.tBCol2,
      }],
    });
  });
});

describe('capstone: weak-area tag migration + the official reroll seam', () => {
  it('carries the old quiz’s three weak-area tags', () => {
    const tags = capstoneFor(LESSON).goals.map((g) => g.tag);
    expect(new Set(tags)).toEqual(new Set(['composition order', 'non-commutativity', 'product entries']));
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
  it('capstone TARGET columns are non-identity, past the MIN_MAG floor, and within grid range for every seed', () => {
    const cap = capstoneFor(LESSON);
    for (let seed = 1; seed <= 200; seed++) {
      const p = cap.randomize(makeRng(seed));
      expect(p.aCol1).toEqual({ x: 1, y: 0 });   // controls reset to identity
      expect(p.aCol2).toEqual({ x: 0, y: 1 });
      expect(p.bCol1).toEqual({ x: 1, y: 0 });
      expect(p.bCol2).toEqual({ x: 0, y: 1 });
      for (const t of [p.tACol1, p.tACol2, p.tBCol1, p.tBCol2]) {
        expect(mag(t)).toBeGreaterThan(0.5);       // past the MIN_MAG handle floor
        expect(mag(t)).toBeLessThanOrEqual(1.6001);   // within the [-4,4] search grid, comfortably
      }
    }
  });
});

describe('CAPSTONE BASELINE-SAFETY — exhaustive enumeration of the finite parameter space', () => {
  // la-matmul.js's own comment derives: |rot(vec(s,0),θ) - (1,0)|² = s² - 2s·cos(θ) + 1.
  // Enumerate ALL (φA, φB, sA1) combinations — not sampled seeds — and confirm every
  // one of the three capstone goals is false at the identity-reset baseline.
  const ANGLES_DEG = [60, 150, 240];
  const SCALES = [0.8, 1.2, 1.6];
  const TOL = { g1: 0.2, g2: 0.2, g3: 0.2 };

  it('g1 (A* vs identity) is false for all 9 (φA, sA1/sA2) pairs', () => {
    for (const phiDeg of ANGLES_DEG) {
      const phi = (phiDeg * Math.PI) / 180;
      for (const s of SCALES) {
        const tACol1 = rot({ x: s, y: 0 }, phi);
        const tACol2 = rot({ x: 0, y: s }, phi);
        expect(mag(sub({ x: 1, y: 0 }, tACol1)), 'phi=' + phiDeg + ' s=' + s).toBeGreaterThan(TOL.g1);
        expect(mag(sub({ x: 0, y: 1 }, tACol2)), 'phi=' + phiDeg + ' s=' + s).toBeGreaterThan(TOL.g1);
      }
    }
  });

  it('g2 (B* vs identity, pure rotation) is false for all 3 φB', () => {
    for (const phiDeg of ANGLES_DEG) {
      const phi = (phiDeg * Math.PI) / 180;
      const tBCol1 = rot({ x: 1, y: 0 }, phi);
      const tBCol2 = rot({ x: 0, y: 1 }, phi);
      expect(mag(sub({ x: 1, y: 0 }, tBCol1)), 'phi=' + phiDeg).toBeGreaterThan(TOL.g2);
      expect(mag(sub({ x: 0, y: 1 }, tBCol2)), 'phi=' + phiDeg).toBeGreaterThan(TOL.g2);
    }
  });

  it('g3 (composed column 1 vs identity) is false for all 27 (φA, φB, sA1) combinations', () => {
    let worst = Infinity;
    for (const phiADeg of ANGLES_DEG) for (const phiBDeg of ANGLES_DEG) for (const sA1 of SCALES) {
      const phiA = (phiADeg * Math.PI) / 180, phiB = (phiBDeg * Math.PI) / 180;
      const tACol1 = rot({ x: sA1, y: 0 }, phiA);
      const tBCol1 = rot({ x: 1, y: 0 }, phiB), tBCol2 = rot({ x: 0, y: 1 }, phiB);
      const tCcol1 = matApply(tBCol1, tBCol2, tACol1);
      const d = mag(sub({ x: 1, y: 0 }, tCcol1));
      worst = Math.min(worst, d);
      expect(d, 'phiA=' + phiADeg + ' phiB=' + phiBDeg + ' sA1=' + sA1).toBeGreaterThan(TOL.g3);
    }
    expect(worst).toBeLessThan(0.6);   // sanity: the analytic worst-case (~0.50) is in this run
    expect(worst).toBeGreaterThan(TOL.g3);
  });

  it('cross-checks the closed-form derivation against the actual randomize() output for 200 seeds', () => {
    const cap = capstoneFor(LESSON);
    for (let seed = 1; seed <= 200; seed++) {
      const p = cap.randomize(makeRng(seed));
      const actualC1 = matApply(p.tBCol1, p.tBCol2, p.tACol1);
      expect(mag(sub(actualC1, p.tCcol1))).toBeLessThan(1e-9);   // randomize()'s own tCcol1 matches
    }
  });
});

describe('ANTI-GAMING: degenerate strategies must NOT credit', () => {
  it('matmul.entries: a near-zero A column must NOT fake either entry target', () => {
    const s = sceneAt(2);
    // near-zero A col2 gives entry(1,2) ≈ 0, nowhere near the target 3
    expect(s.goals[0].predicate({ aCol1: { x: 1, y: 0 }, aCol2: { x: 0.01, y: 0.01 } })).toBe(false);
    // legitimate: a real A col2 solving 2x + y = 3
    expect(s.goals[0].predicate({ aCol1: { x: 1, y: 0 }, aCol2: { x: 1, y: 1 } })).toBe(true);
    // near-zero A col1 gives entry(2,1) ≈ 0, nowhere near the target -2
    expect(s.goals[1].predicate({ aCol1: { x: 0.01, y: -0.01 }, aCol2: { x: 0, y: 1 } })).toBe(false);
    expect(s.goals[1].predicate({ aCol1: { x: 0, y: 2 }, aCol2: { x: 0, y: 1 } })).toBe(true);
  });
  it('matmul.collapse: collapsing a layer to near-zero must NOT fake either target column', () => {
    const s = sceneAt(4);
    // layer1 or layer2 shrunk toward zero drags W toward zero too — nowhere near ★₁/★₂
    const shrunk = { l1Col1: { x: 0.02, y: 0.01 }, l1Col2: { x: 0.01, y: 0.02 }, l2Col1: { x: 1, y: 0 }, l2Col2: { x: 0, y: 1 } };
    expect(s.goals[0].predicate(shrunk)).toBe(false);
    expect(s.goals[1].predicate(shrunk)).toBe(false);
    // legitimate: layer1 = identity, layer2 = the exact target (W = layer2)
    const legit = { l1Col1: { x: 1, y: 0 }, l1Col2: { x: 0, y: 1 }, l2Col1: { x: 0, y: 2 }, l2Col2: { x: -1, y: 0 } };
    expect(s.goals[0].predicate(legit)).toBe(true);
    expect(s.goals[1].predicate(legit)).toBe(true);
  });
  it('matmul.commute g2: A == B trivially "commutes" but must NOT credit; two distinct rotations do', () => {
    const s = sceneAt(5);
    const I = { aCol1: { x: 1, y: 0 }, aCol2: { x: 0, y: 1 }, bCol1: { x: 1, y: 0 }, bCol2: { x: 0, y: 1 } };
    expect(s.goals[1].predicate(I)).toBe(false);   // identical (identity==identity) — not the insight
    const phiA = (60 * Math.PI) / 180, phiB = (150 * Math.PI) / 180;
    const legit = {
      aCol1: rot({ x: 1, y: 0 }, phiA), aCol2: rot({ x: 0, y: 1 }, phiA),
      bCol1: rot({ x: 1, y: 0 }, phiB), bCol2: rot({ x: 0, y: 1 }, phiB),
    };
    expect(s.goals[1].predicate(legit)).toBe(true);
  });
  it('matmul.commute g2: two near-zero (collapsed) matrices drag the gap to 0 for free — must NOT credit', () => {
    const s = sceneAt(5);
    const shrunk = { aCol1: { x: 0.01, y: 0 }, aCol2: { x: 0, y: 0.01 }, bCol1: { x: 0.01, y: 0.01 }, bCol2: { x: -0.01, y: 0.01 } };
    expect(s.goals[1].predicate(shrunk)).toBe(false);
  });
  it('matmul.capstone g3: placing A and B far from target must NOT fake the composed-column check', () => {
    const cap = capstoneFor(LESSON);
    const p1 = cap.randomize(makeRng(1));
    // identity A, identity B (the untouched baseline) must not satisfy g3
    expect(cap.goals[2].predicate({ ...p1, aCol1: { x: 1, y: 0 }, aCol2: { x: 0, y: 1 }, bCol1: { x: 1, y: 0 }, bCol2: { x: 0, y: 1 } })).toBe(false);
    // legitimate: both factors placed exactly on target
    expect(cap.goals[2].predicate({ ...p1, aCol1: p1.tACol1, aCol2: p1.tACol2, bCol1: p1.tBCol1, bCol2: p1.tBCol2 })).toBe(true);
  });
});
