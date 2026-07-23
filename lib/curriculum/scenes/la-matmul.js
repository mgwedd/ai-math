/* ================================================================
   SCENE LESSON — la-matmul (Matrix Multiplication = Composition).
   ----------------------------------------------------------------
   P2 migration wave 2, lesson 1. Converts the old two-lab / three-quiz
   la-matmul into SIX scenes ending in a randomized capstone, following
   docs/AUTHORING_SCENES.md and the la-matrix pattern (this lesson's own
   reference: "grid({matrix}) + draggable columns... reusable for
   la-matmul (compose two column-sets)" — wave-1 handoff).

   THE ONE IDEA, taught two ways: B·A means "apply A first, then B"
   (COMPOSITION — chase a point through two steps), and entry (i,j) of
   B·A is row i of B dotted with column j of A (the DOT-PRODUCT GRID —
   ties back to la-dot). Both views produce the same matrix; la-matrix's
   columns rule (a matrix IS its two columns) is the substrate for both.

   Scenes are DATA + PURE PREDICATES. Zero renderer imports. This wave is
   ADDITIVE — the lesson keeps its `labs`; the arc is added as
   `scenes:[...]` (CONTRACT v1.4/v1.5 §5).

   ARC (composition -> order -> entries -> scalar -> ML teaser -> capstone):
     1 matmul.compose   B fixed, drag A: C = B∘A is A applied, then B
     2 matmul.order     same two fixed matrices, swap the order, land
                         the SAME probe on two DIFFERENT points
     3 matmul.entries    B fixed, drag A: an entry of B·A is a row of B
                         dotted with a column of A — read live
     4 matmul.slider     a shear amount k (real `slider`) drives B∘A(k);
                         one entry of the product equals k exactly
     5 matmul.collapse   ML teaser: two layers, no nonlinearity between
                         them, still collapse to ONE matrix
     6 matmul.commute    find a non-commuting pair, then a commuting one
     7 matmul.capstone   randomized target — place BOTH factors A and B

   P2 wave E addition: scene 6 (commuting-pairs, mined from draft PR #78)
   inserted before the capstone, additive, no existing scene touched.

   WEAK-AREA TAG MIGRATION — the old quiz's three q.tag/q.focus pairs:
     quiz "composition order"   -> scenes 1, 4 + capstone goal 1 (place A)
     quiz "non-commutativity"   -> scene 2 + capstone goal 2 (place B)
     quiz "product entries"     -> scenes 3, 4, 5 + capstone goal 3
   Every goal in every scene (not just the capstone) carries one of these
   three tags — the migrated review loop.

   CONTROLS: scene 4's shear amount is a real `slider` (v1.4 §3) — the
   one truly-scalar knob in this arc. Every other draggable quantity is a
   column vector (a position), so it stays a `handle`.

   CAPSTONE RANDOMIZATION (CONTRACT v1.1 §1/§8, analytic proof in the
   capstone's own comment block below): draws A* (rotated anisotropic
   scale) and B* (a PURE rotation — no scale) independently from small
   finite angle/scale sets chosen so every goal is bounded away from the
   identity-reset baseline for EVERY possible draw, not just sampled
   seeds — proof by exhaustive enumeration of the finite parameter space,
   plus the ×1000-seed empirical check via the shared helper.
   ================================================================ */
import {
  registerScene, vec, makeRng, handle, slider,
  grid, vector, point, label,
  goal,
} from '../../scene/index.js';
import {
  mag, sub, dot, rot, matApply, matMul, rowOf,
  minMagConstraint,
} from './vec-math.js';

const LESSON = 'la-matmul';
const f2 = (x) => x.toFixed(2);

// Anti-collapse floor (mirrors la-matrix): a draggable column can't be
// dragged to (near-)zero to fake a degenerate matrix.
const MIN_MAG = 0.5;
const onMinMag = minMagConstraint(MIN_MAG);

const I1 = vec(1, 0), I2 = vec(0, 1);
const gridMatrix = (c1, c2) => [c1.x, c2.x, c1.y, c2.y];
const matStr = (c1, c2) =>
  '[' + f2(c1.x) + '  ' + f2(c2.x) + ' ; ' + f2(c1.y) + '  ' + f2(c2.y) + ']';

/* ---- 1. COMPOSE: B is fixed, drag A — watch A-then-B become one matrix */
/* Micro-idea: C = B∘A is computed by applying A first, then the fixed B —
   the reading-order convention. Column j of C is B applied to A's column j.
   Owns "composition order". */
const B1_COL1 = rot(I1, Math.PI / 2), B1_COL2 = rot(I2, Math.PI / 2);   // B: fixed 90° CCW turn
const PROBE1 = vec(1, 1);
const T1_C1 = vec(2, 1);    // target for C's column 1 (î's final landing, A then B)
const T1_C2 = vec(-1, 2);   // target for C's column 2 (ĵ's final landing, A then B)
registerScene({
  id: 'matmul.compose',
  lesson: LESSON,
  space: 'plane2',
  params: { aCol1: vec(1, 0), aCol2: vec(0, 1) },          // A starts at the identity
  entities: (p) => {
    const c = matMul(B1_COL1, B1_COL2, p.aCol1, p.aCol2);  // C = B∘A
    const aImg = matApply(p.aCol1, p.aCol2, PROBE1);
    const cImg = matApply(B1_COL1, B1_COL2, aImg);
    return [
      grid({ matrix: gridMatrix(c.c1, c.c2), color: 'muted' }),
      vector(B1_COL1, { color: 'muted', label: 'B col1', key: 'b1' }),
      vector(B1_COL2, { color: 'muted', label: 'B col2', key: 'b2' }),
      vector(p.aCol1, { color: 'accent', label: 'A→î', handle: handle('aCol1', { constrain: onMinMag }) }),
      vector(p.aCol2, { color: 'accent2', label: 'A→ĵ', handle: handle('aCol2', { constrain: onMinMag }) }),
      point(T1_C1, { color: 'warn', label: '★₁', r: 6, key: 't1' }),
      point(T1_C2, { color: 'warn', label: '★₂', r: 6, key: 't2' }),
      point(c.c1, { color: 'good', label: 'C col1', key: 'cc1' }),
      point(c.c2, { color: 'good', label: 'C col2', key: 'cc2' }),
      point(aImg, { color: 'muted', label: 'A(●)', key: 'aimg' }),
      point(cImg, { color: 'good', label: 'C(●)', key: 'cimg' }),
      label('B fixed (90° turn). C = B∘A = ' + matStr(c.c1, c.c2) + '   C(●) = [' + f2(cImg.x) + ', ' + f2(cImg.y) + ']', { at: 'readout' }),
    ];
  },
  goals: [
    goal('B is fixed. Drag A so C = B∘A sends î to ★₁ (apply A, then B)',
      (s) => mag(sub(matApply(B1_COL1, B1_COL2, s.aCol1), T1_C1)) < 0.2,
      { xp: 20, hold: 400, tag: 'composition order',
        focus: 'B·A means apply A first, then B. Column 1 of the product is B applied to A’s column 1 — chase the arrow through both steps.' }),
    goal('Now send ĵ to ★₂ the same way — through A, then through the fixed B',
      (s) => mag(sub(matApply(B1_COL1, B1_COL2, s.aCol2), T1_C2)) < 0.2,
      { xp: 20, hold: 400, tag: 'composition order',
        focus: 'Every column of B·A is B applied to the matching column of A. Reading right-to-left is the composition order.' }),
  ],
  caption: 'B is a fixed 90° turn. Drag A’s columns — the grid shows C = B∘A, A applied first, then B. Land C’s columns on the stars.',
});

/* ---- 2. ORDER: same two matrices, swapped order, different landing ---- */
/* Micro-idea: R and Sh don't commute. The SAME probe, run through the SAME
   two fixed matrices in opposite orders, lands on two different points —
   the gap IS non-commutativity. Owns "non-commutativity". */
const R2_COL1 = rot(I1, Math.PI / 2), R2_COL2 = rot(I2, Math.PI / 2);   // R: 90° CCW turn
const SH2_COL1 = vec(1, 0), SH2_COL2 = vec(1, 1);                       // Sh: horizontal shear
const RS2 = matMul(R2_COL1, R2_COL2, SH2_COL1, SH2_COL2);   // R∘Sh = apply Sh, then R
const SR2 = matMul(SH2_COL1, SH2_COL2, R2_COL1, R2_COL2);   // Sh∘R = apply R, then Sh
const T2_RS = matApply(RS2.c1, RS2.c2, vec(1, 2));    // witness v=[1,2] under Sh-then-R
const T2_SR = matApply(SR2.c1, SR2.c2, vec(-2, 1));   // witness v=[-2,1] under R-then-Sh
registerScene({
  id: 'matmul.order',
  lesson: LESSON,
  space: 'plane2',
  params: { v: vec(2, -1) },
  entities: (p) => {
    const imgRS = matApply(RS2.c1, RS2.c2, p.v);
    const imgSR = matApply(SR2.c1, SR2.c2, p.v);
    return [
      grid({ color: 'muted' }),
      point(T2_RS, { color: 'warn', label: '★₁', r: 6, key: 't1' }),
      point(T2_SR, { color: 'warn', label: '★₂', r: 6, key: 't2' }),
      vector(p.v, { color: 'accent', label: 'v', handle: 'v' }),
      point(imgRS, { color: 'good', label: 'Sh→R(v)', key: 'rs' }),
      point(imgSR, { color: 'accent2', label: 'R→Sh(v)', key: 'sr' }),
      label('same two matrices, swapped order — Sh-then-R(v) = [' + f2(imgRS.x) + ', ' + f2(imgRS.y) + ']   R-then-Sh(v) = [' + f2(imgSR.x) + ', ' + f2(imgSR.y) + ']   gap = ' + f2(mag(sub(imgRS, imgSR))), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Drag v so applying Sh FIRST, then R, lands it on ★₁',
      (s) => mag(sub(matApply(RS2.c1, RS2.c2, s.v), T2_RS)) < 0.25,
      { xp: 20, hold: 400, tag: 'composition order',
        focus: 'R∘Sh means Sh acts first, then R rotates the result. Track v through both steps to land on ★₁.' }),
    goal('Now drag v so applying R FIRST, then Sh, lands the SAME v on ★₂ — a different spot for the same two matrices',
      (s) => mag(sub(matApply(SR2.c1, SR2.c2, s.v), T2_SR)) < 0.25,
      { xp: 25, hold: 400, tag: 'non-commutativity',
        focus: 'R and Sh don’t commute: swapping the order sends the same v somewhere else. That gap is exactly what "AB ≠ BA" means.' }),
  ],
  caption: 'R rotates 90°, Sh shears — both fixed. Drag the probe so Sh-then-R lands on ★₁, then so R-then-Sh lands on ★₂: same two matrices, different order, different landing.',
});

/* ---- 3. ENTRIES: an entry of B·A is a row of B dotted with a column of A */
/* Micro-idea: entry (i,j) of B·A = row i of B, dotted with column j of A —
   the row·column definition, made literal and live. Owns "product entries". */
const B3_COL1 = vec(2, 1), B3_COL2 = vec(1, -1);            // fixed B, distinct entries
const ROW0_B3 = rowOf(B3_COL1, B3_COL2, 0);                 // = (2, 1)
const ROW1_B3 = rowOf(B3_COL1, B3_COL2, 1);                 // = (1, -1)
registerScene({
  id: 'matmul.entries',
  lesson: LESSON,
  space: 'plane2',
  params: { aCol1: vec(1, 0), aCol2: vec(0, 1) },
  entities: (p) => {
    const c = matMul(B3_COL1, B3_COL2, p.aCol1, p.aCol2);
    const e12 = dot(ROW0_B3, p.aCol2);   // entry (1,2) = row 1(B)·col 2(A)
    const e21 = dot(ROW1_B3, p.aCol1);   // entry (2,1) = row 2(B)·col 1(A)
    return [
      grid({ matrix: gridMatrix(c.c1, c.c2), color: 'muted' }),
      vector(B3_COL1, { color: 'muted', label: 'B col1', key: 'b1' }),
      vector(B3_COL2, { color: 'muted', label: 'B col2', key: 'b2' }),
      vector(p.aCol1, { color: 'accent', label: 'A col1', handle: handle('aCol1', { constrain: onMinMag }) }),
      vector(p.aCol2, { color: 'accent2', label: 'A col2', handle: handle('aCol2', { constrain: onMinMag }) }),
      label('row1(B) = [' + f2(ROW0_B3.x) + ', ' + f2(ROW0_B3.y) + ']  row2(B) = [' + f2(ROW1_B3.x) + ', ' + f2(ROW1_B3.y) + ']    entry(1,2) = row1(B)·col2(A) = ' + f2(e12) + '    entry(2,1) = row2(B)·col1(A) = ' + f2(e21), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Drag A’s column 2 until entry (1,2) of B·A — row 1 of B dotted with column 2 of A — reads 3',
      (s) => Math.abs(dot(ROW0_B3, s.aCol2) - 3) < 0.15,
      { xp: 20, hold: 400, tag: 'product entries',
        focus: 'Entry (i,j) of a product is row i of the LEFT matrix dotted with column j of the RIGHT one. Only A’s column 2 feeds entry (1,2).' }),
    goal('Drag A’s column 1 until entry (2,1) of B·A reads −2',
      (s) => Math.abs(dot(ROW1_B3, s.aCol1) - (-2)) < 0.15,
      { xp: 20, hold: 400, tag: 'product entries',
        focus: 'Entry (2,1) only depends on A’s column 1 — row 2 of B dotted with it. The other column never enters this dot product.' }),
  ],
  caption: 'B is fixed. Drag A’s columns and watch two entries of B·A update live — each one is a row of B dotted with a column of A, nothing more.',
});

/* ---- 4. SLIDER: one scalar (a shear amount) drives the product -------- */
/* Micro-idea: A(k) is a shear by the real scalar k (a `slider`, v1.4 §3);
   B is a fixed 90° turn. Column 2 of B∘A(k) traces a line as k sweeps, and
   its y-entry equals k exactly — ties composition to product entries. */
const B4_COL1 = rot(I1, Math.PI / 2), B4_COL2 = rot(I2, Math.PI / 2);   // B: fixed 90° turn
registerScene({
  id: 'matmul.slider',
  lesson: LESSON,
  space: 'plane2',
  params: { k: 0 },
  controls: [slider('k', { min: -3, max: 3, step: 0.05, label: 'shear k', format: f2 })],
  entities: (p) => {
    const aCol2 = vec(p.k, 1);                                // A(k): shear by k (col1 stays î)
    const c = matMul(B4_COL1, B4_COL2, I1, aCol2);            // C(k) = B∘A(k)
    return [
      grid({ matrix: gridMatrix(c.c1, c.c2), color: 'muted' }),
      vector(aCol2, { color: 'muted', label: 'A col2', key: 'a2' }),
      point(vec(-1, 2.3), { color: 'warn', label: '★', r: 6, key: 'tgt1' }),
      point(vec(-1, -1.5), { color: 'warn', label: '◆', r: 6, key: 'tgt2' }),
      point(c.c2, { color: 'good', label: 'C col2', key: 'cc2' }),
      label('k = ' + f2(p.k) + '    C col2 = [' + f2(c.c2.x) + ', ' + f2(c.c2.y) + ']  (entry (2,2) of C is always k)', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Slide k so C = B∘A(k)’s second column lands on ★',
      (s) => mag(sub(matMul(B4_COL1, B4_COL2, I1, vec(s.k, 1)).c2, vec(-1, 2.3))) < 0.15,
      { xp: 20, hold: 400, tag: 'composition order',
        focus: 'A(k) shears by k; B then rotates the result 90°. Column 2 of the product traces a line as k sweeps — chase it to the target.' }),
    goal('Now slide k so entry (2,2) of B∘A reads −1.5 exactly',
      (s) => Math.abs(s.k - (-1.5)) < 0.05,
      { xp: 20, hold: 400, tag: 'product entries',
        focus: 'Entry (2,2) of B∘A equals k exactly here — read it straight off the slider instead of recomputing the product.' }),
  ],
  caption: 'B (a fixed 90° turn) is applied after A(k), a shear by k. Slide k and watch column 2 of the product trace a line — its y-value is always exactly k.',
});

/* ---- 5. COLLAPSE: two layers, no nonlinearity, still ONE matrix ------- */
/* The ML teaser: a chain of matrices with nothing nonlinear between them
   collapses to a single matrix W = layer2∘layer1 — "depth buys nothing"
   without a nonlinearity, straight from the lesson's ml box. */
const CAP5_1 = vec(0, 2), CAP5_2 = vec(-1, 0);   // target for W = layer2∘layer1
registerScene({
  id: 'matmul.collapse',
  lesson: LESSON,
  space: 'plane2',
  params: { l1Col1: vec(1, 0), l1Col2: vec(0, 1), l2Col1: vec(1, 0), l2Col2: vec(0, 1) },
  entities: (p) => {
    const w = matMul(p.l2Col1, p.l2Col2, p.l1Col1, p.l1Col2);   // W = layer2∘layer1
    return [
      grid({ matrix: gridMatrix(w.c1, w.c2), color: 'muted' }),
      vector(p.l1Col1, { color: 'muted', label: 'layer1 col1', handle: handle('l1Col1', { constrain: onMinMag }) }),
      vector(p.l1Col2, { color: 'muted', label: 'layer1 col2', handle: handle('l1Col2', { constrain: onMinMag }) }),
      vector(p.l2Col1, { color: 'accent', label: 'layer2 col1', handle: handle('l2Col1', { constrain: onMinMag }) }),
      vector(p.l2Col2, { color: 'accent2', label: 'layer2 col2', handle: handle('l2Col2', { constrain: onMinMag }) }),
      point(CAP5_1, { color: 'warn', label: '★₁', r: 6, key: 't1' }),
      point(CAP5_2, { color: 'warn', label: '★₂', r: 6, key: 't2' }),
      point(w.c1, { color: 'good', label: 'W col1', key: 'wc1' }),
      point(w.c2, { color: 'good', label: 'W col2', key: 'wc2' }),
      label('W = layer2∘layer1 = ' + matStr(w.c1, w.c2), { at: 'readout' }),
    ];
  },
  goals: [
    goal('However you split the two layers, land W’s column 1 on ★₁',
      (s) => mag(sub(matMul(s.l2Col1, s.l2Col2, s.l1Col1, s.l1Col2).c1, CAP5_1)) < 0.25,
      { xp: 20, hold: 400, tag: 'composition order',
        focus: 'Any two layers chain into ONE matrix, W = layer2∘layer1. Without a nonlinearity between them, "deep" collapses to a single linear map.' }),
    goal('And land W’s column 2 on ★₂ — the same single-matrix rule',
      (s) => mag(sub(matMul(s.l2Col1, s.l2Col2, s.l1Col1, s.l1Col2).c2, CAP5_2)) < 0.25,
      { xp: 20, hold: 400, tag: 'product entries',
        focus: 'Try it two ways: layer1 = identity (all the work in layer2), or split the work across both. W lands in the same place either time.' }),
  ],
  caption: 'Two layers, no nonlinearity between them — drag both matrices. However you split the work, W = layer2∘layer1 is always just ONE matrix; that is why depth without nonlinearity buys nothing.',
});

/* ---- 6. COMMUTE: find a non-commuting pair, then a commuting one ------ */
/* Micro-idea: B·A ≠ A·B for most pairs — swapping two network LAYERS
   generally computes a different function, exactly because matrix
   multiplication is non-commutative. A few structured pairs (two
   rotations, a uniform scale with anything) are the exception, not the
   rule. Owns "non-commutativity" both ways: confirm the gap, then find
   where it vanishes. Anti-gaming: A == B trivially "commutes" with itself
   (not the insight) and a near-zero matrix drags the gap toward 0 for
   free — the commuting goal requires the pair to be genuinely DIFFERENT
   (col-distance floor) and both real (MIN_MAG floor), not just equal or
   collapsed. */
const gapOf = (s) => {
  const applyBthenA = matMul(s.aCol1, s.aCol2, s.bCol1, s.bCol2);  // A∘B
  const applyAthenB = matMul(s.bCol1, s.bCol2, s.aCol1, s.aCol2);  // B∘A
  return mag(sub(applyBthenA.c1, applyAthenB.c1)) + mag(sub(applyBthenA.c2, applyAthenB.c2));
};
const distinctOf = (s) => mag(sub(s.aCol1, s.bCol1)) + mag(sub(s.aCol2, s.bCol2));
const bothReal = (s) => mag(s.aCol1) > MIN_MAG && mag(s.aCol2) > MIN_MAG
  && mag(s.bCol1) > MIN_MAG && mag(s.bCol2) > MIN_MAG;
registerScene({
  id: 'matmul.commute',
  lesson: LESSON,
  space: 'plane2',
  params: { aCol1: vec(1, 0), aCol2: vec(0, 1), bCol1: vec(1, 0), bCol2: vec(0, 1) },
  entities: (p) => {
    const ba = matMul(p.bCol1, p.bCol2, p.aCol1, p.aCol2);   // apply A, then B
    const ab = matMul(p.aCol1, p.aCol2, p.bCol1, p.bCol2);   // apply B, then A
    const gap = gapOf(p);
    return [
      grid({ matrix: gridMatrix(ba.c1, ba.c2), color: 'muted' }),
      vector(p.aCol1, { color: 'accent', label: 'A col1', handle: handle('aCol1', { constrain: onMinMag }) }),
      vector(p.aCol2, { color: 'accent2', label: 'A col2', handle: handle('aCol2', { constrain: onMinMag }) }),
      vector(p.bCol1, { color: 'good', label: 'B col1', handle: handle('bCol1', { constrain: onMinMag }) }),
      vector(p.bCol2, { color: 'muted', label: 'B col2', handle: handle('bCol2', { constrain: onMinMag }) }),
      point(ba.c1, { color: 'good', label: '(B∘A)·î', key: 'bapt' }),
      point(ab.c1, { color: 'warn', label: '(A∘B)·î', key: 'abpt' }),
      label('gap ‖B·A − A·B‖ = ' + f2(gap) + (gap < 0.05 ? '  — COMMUTES' : '  — order matters'), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Drag A and B into a genuinely non-commuting pair — gap > 1.5 — to see why swapping two network layers changes what the network computes',
      (s) => bothReal(s) && gapOf(s) > 1.5,
      { xp: 20, hold: 400, tag: 'non-commutativity',
        focus: 'B·A means apply A then B; A·B means the reverse — for most pairs these differ. That gap is exactly why layer order in a network is never free to swap.' }),
    goal('Now find two DIFFERENT, real matrices that DO commute (gap < 0.05) — e.g. two rotations — the exception, not the rule',
      (s) => bothReal(s) && distinctOf(s) > 0.4 && gapOf(s) < 0.05,
      { xp: 25, hold: 500, tag: 'non-commutativity',
        focus: 'Rotations always commute with each other (so do uniform scalings) — a rare structural exception. Non-commutativity is about STRUCTURE, not an absolute law every pair obeys.' }),
  ],
  caption: 'Drag A and B. B∘A and A∘B rarely land the same place — that gap is why swapping two layers usually changes what a network computes. Find a pair where the gap vanishes and you’ve found a commuting exception.',
});

/* ---- 7. CAPSTONE: reproduce a randomized product by placing BOTH factors */
/* THE EXAM. Draws A* (rotated anisotropic scale, like la-matrix's capstone)
   and B* (a PURE rotation — s=1, no scale) independently. Controls reset
   to the identity each attempt. Three goals carry the migrated tags.

   BASELINE-SAFETY PROOF (finite parameter space — checked exhaustively in
   the test file, not just sampled seeds):
     ANGLES = [60°, 150°, 240°], SCALES = [0.8, 1.2, 1.6].
   For a column c = rot(vec(s,0), θ) vs. the identity-reset baseline (1,0):
     |c - (1,0)|² = s² − 2s·cos(θ) + 1.
   (a) g1 (A* columns vs identity): θ = φA ∈ ANGLES, minimum at φA = 60°
       (cos = 0.5) and s closest to 0.5 among SCALES (s = 0.8) gives
       |diff|² = 0.64 − 0.8 + 1 = 0.84 → |diff| ≈ 0.92, far past the 0.2
       tolerance. (Same formula holds for column 2, sin/cos swapped.)
   (b) g2 (B* columns vs identity, s = 1 fixed): |diff|² = 2 − 2cos(φB),
       minimum at φB = 60° gives |diff| = 1 — trivially past 0.2.
   (c) g3 (composed column 1 vs identity): B* is a PURE rotation, so
       B*(A*.col1) = rot(vec(sA1,0), φA + φB) — the SAME closed form with
       θ = φA + φB (mod 360°). ANGLES pairwise sums mod 360° land in
       {30°, 120°, 210°, 300°}; the worst case is 30° (e.g. φA=150°,
       φB=240°). At θ = 30° (cos ≈ 0.866) and s = 0.8 (closest to the
       0.866 minimizer): |diff|² = 0.64 − 1.3856 + 1 = 0.2544 → |diff| ≈
       0.50 — past the 0.2 tolerance used below, with margin.
   Every target magnitude (0.8–1.6, or 1 for B*) also clears the 0.5
   MIN_MAG handle floor. test/scenes-la-matmul.test.mjs enumerates all 27
   (φA, φB, sA1) combinations feeding g3 directly, plus the ×1000-seed
   empirical helper. */
const CAP_ANGLES = [60, 150, 240];       // degrees; pairwise sums mod 360 stay >=30° from 0
const CAP_SCALES = [0.8, 1.2, 1.6];
function randomize(rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const phiA = (pick(CAP_ANGLES) * Math.PI) / 180;
  const phiB = (pick(CAP_ANGLES) * Math.PI) / 180;
  const sA1 = pick(CAP_SCALES), sA2 = pick(CAP_SCALES);
  const tACol1 = rot(vec(sA1, 0), phiA);
  const tACol2 = rot(vec(0, sA2), phiA);
  const tBCol1 = rot(I1, phiB);   // B* is a PURE rotation (unit columns)
  const tBCol2 = rot(I2, phiB);
  const tCcol1 = matApply(tBCol1, tBCol2, tACol1);   // (B*∘A*)'s column 1
  return {
    aCol1: vec(1, 0), aCol2: vec(0, 1),
    bCol1: vec(1, 0), bCol2: vec(0, 1),
    tACol1, tACol2, tBCol1, tBCol2, tCcol1,
  };
}
registerScene({
  id: 'matmul.capstone',
  lesson: LESSON,
  capstone: true,
  randomize,
  space: 'plane2',
  params: randomize(makeRng(1)),
  entities: (p) => {
    const c = matMul(p.bCol1, p.bCol2, p.aCol1, p.aCol2);
    return [
      grid({ matrix: gridMatrix(c.c1, c.c2), color: 'muted' }),
      point(p.tACol1, { color: 'warn', label: '★A₁', r: 6, key: 'ta1' }),
      point(p.tACol2, { color: 'warn', label: '★A₂', r: 6, key: 'ta2' }),
      point(p.tBCol1, { color: 'warn', label: '★B₁', r: 6, key: 'tb1' }),
      point(p.tBCol2, { color: 'warn', label: '★B₂', r: 6, key: 'tb2' }),
      point(p.tCcol1, { color: 'warn', label: '◆', r: 6, key: 'tc1' }),
      vector(p.aCol1, { color: 'accent', label: 'A col1', handle: handle('aCol1', { constrain: onMinMag }) }),
      vector(p.aCol2, { color: 'accent2', label: 'A col2', handle: handle('aCol2', { constrain: onMinMag }) }),
      vector(p.bCol1, { color: 'good', label: 'B col1', handle: handle('bCol1', { constrain: onMinMag }) }),
      vector(p.bCol2, { color: 'muted', label: 'B col2', handle: handle('bCol2', { constrain: onMinMag }) }),
      point(c.c1, { color: 'good', label: 'C col1', key: 'cc1' }),
      label('A = ' + matStr(p.aCol1, p.aCol2) + '   B = ' + matStr(p.bCol1, p.bCol2) + '   C = B·A = ' + matStr(c.c1, c.c2), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Place A (both columns) to match its target — this is what gets applied FIRST (±0.2) and hold',
      (s) => mag(sub(s.aCol1, s.tACol1)) < 0.2 && mag(sub(s.aCol2, s.tACol2)) < 0.2,
      { xp: 40, hold: 700, tag: 'composition order',
        focus: 'B·A applies A first. Match A’s two columns to ★A₁ and ★A₂ — that fixes the first step of the composition.' }),
    goal('Place B (both columns) to match its target — applied SECOND (±0.2) and hold',
      (s) => mag(sub(s.bCol1, s.tBCol1)) < 0.2 && mag(sub(s.bCol2, s.tBCol2)) < 0.2,
      { xp: 40, hold: 700, tag: 'non-commutativity',
        focus: 'Swap A and B and you would land the composition somewhere else entirely — order is load-bearing. Match B to ★B₁ and ★B₂.' }),
    goal('With both placed, land C’s column 1 on ◆ (±0.2) and hold — that entry is B applied to A’s column 1',
      (s) => mag(sub(matMul(s.bCol1, s.bCol2, s.aCol1, s.aCol2).c1, s.tCcol1)) < 0.2,
      { xp: 40, hold: 700, tag: 'product entries',
        focus: 'Column 1 of B·A is B applied to A’s column 1 — a row-by-row combination of B’s entries with A’s. It falls out for free once both factors are placed.' }),
  ],
  caption: 'No hints now. Place A and B — the two factors — matching each to its stars, then confirm the product’s column 1 lands on ◆ and hold. This is the exam.',
});
