/* ================================================================
   SCENE LESSON — la-det (The Determinant).
   ----------------------------------------------------------------
   P2 migration wave 2, lesson 2 (only attempted because la-matmul landed
   fully clean — CONTRACT v1.5 §2). Converts the old two-lab / three-quiz
   la-det into scenes ending in a randomized capstone (EIGHT as of P2 wave
   E), reusing
   la-matrix's `det2` (vec-math.js) and the columns-as-handles idiom.

   THE ONE IDEA, in three faces: det = ad − bc is a FORMULA (scene 1, 4);
   |det| is the AREA the unit square scales to (scene 5); the SIGN of det
   is ORIENTATION — positive keeps it, negative flips it, zero destroys
   it (scenes 2, 3). All three faces are exercised in the capstone.

   Scenes are DATA + PURE PREDICATES. Zero renderer imports. This wave is
   ADDITIVE — the lesson keeps its `labs`; the arc is added as
   `scenes:[...]` (CONTRACT v1.5 §5).

   ARC (formula -> collapse -> sign -> scale -> area -> capstone):
     1 det.formula   drag the columns, hit an exact det value
     2 det.collapse  line the columns up (same OR opposite direction) —
                      det -> 0, space squashed onto a line
     3 det.sign      build a reflection two different ways — det < 0
     4 det.scale     a real `slider` t drives col2=[0,t]; det = 2t is a
                      line through the origin — cross t=0, sign flips
     5 det.area      |det| IS the unit square's image area; hit a target
                      area, then flip it (same area, opposite orientation)
     6 det.product    det(B·A) = det(A)·det(B) — one bad factor collapses
                      the whole chain, however healthy the rest is
     7 det.shear      shearing a column never moves det; scaling does —
                      the volume-preserving move real invertible layers use
     8 det.capstone   randomized magnitude + sign targets, then collapse

   P2 wave E addition: scenes 6-7 (det-multiplies + shear-preserves-area,
   mined from draft PR #79) inserted before the capstone, additive, no
   existing scene touched.

   WEAK-AREA TAG MIGRATION — the old quiz's three q.tag/q.focus pairs:
     quiz "det formula"       -> scenes 1, 4, 5 + capstone goal 1
     quiz "det = 0 collapse"  -> scene 2 + capstone goal 3
     quiz "negative det"      -> scenes 3, 4, 5 + capstone goal 2
   Every goal in every scene (not just the capstone) carries one of these
   three tags — the migrated review loop.

   CONTROLS: scene 4's t is a real `slider` (v1.4 §3) — the one truly-
   scalar knob. Every other draggable quantity is a column vector, so it
   stays a `handle`.

   CAPSTONE RANDOMIZATION (CONTRACT v1.1 §1/§8): draws a magnitude target
   from a small finite set for goal 1 and an independent one for goal 2
   (always negative-signed, per the fixed quiz tag); goal 3 (collapse) is
   an unparameterized fixed target (0 can't be "randomized" further, same
   as the old lab's fixed collapse mission). Controls reset to the
   identity (det=1) each attempt — provably off every goal's target since
   every magnitude in the finite draw sets is >= 2 away from 1 (proof in
   the capstone's own comment below). ×1000-seed empirical check backs it.
   ================================================================ */
import {
  registerScene, vec, makeRng, handle, slider,
  grid, vector, label,
  goal,
} from '../../scene/index.js';
import {
  mag, sub, dot, det2, matMul,
  minMagConstraint,
} from './vec-math.js';

const LESSON = 'la-det';
const f2 = (x) => x.toFixed(2);

const MIN_MAG = 0.5;
const onMinMag = minMagConstraint(MIN_MAG);
const gridMatrix = (c1, c2) => [c1.x, c2.x, c1.y, c2.y];
const detReadout = (c1, c2) => 'det = ad−bc = ' + f2(det2(c1, c2)) + '    area = ' + f2(Math.abs(det2(c1, c2))) + (det2(c1, c2) < 0 ? '  (flipped)' : '');

/* ---- 1. FORMULA: drag the columns, hit an exact det value ----------- */
registerScene({
  id: 'det.formula',
  lesson: LESSON,
  space: 'plane2',
  params: { col1: vec(1, 0), col2: vec(0, 1) },
  entities: (p) => [
    grid({ matrix: gridMatrix(p.col1, p.col2), color: 'muted' }),
    vector(p.col1, { color: 'accent', label: 'col1', handle: handle('col1', { constrain: onMinMag }) }),
    vector(p.col2, { color: 'accent2', label: 'col2', handle: handle('col2', { constrain: onMinMag }) }),
    label(detReadout(p.col1, p.col2), { at: 'readout' }),
  ],
  goals: [
    goal('Build a matrix with det = ad − bc exactly 4, to see how a closed-form area-scaling factor can be read off four numbers alone — no equation-solving needed to know how a transform scales space',
      (s) => Math.abs(det2(s.col1, s.col2) - 4) < 0.2,
      { xp: 20, hold: 400, tag: 'det formula',
        focus: 'det = ad − bc: with col1 = [a,c] and col2 = [b,d], plug the four numbers straight into the formula.' }),
    goal('Now build one with det exactly 6, to see how many different matrices can share the same determinant value',
      (s) => Math.abs(det2(s.col1, s.col2) - 6) < 0.2,
      { xp: 20, hold: 400, tag: 'det formula',
        focus: 'Many matrices share a determinant — you only need ad − bc to land on the target, not any particular column values.' }),
  ],
  caption: 'Drag the two columns and read det = ad − bc off the readout. Hit each target exactly — det is nothing more than that one formula.',
});

/* ---- 2. COLLAPSE: line the columns up (either direction) — det -> 0 - */
/* Micro-idea: det = 0 exactly when the columns are parallel — SAME
   direction or OPPOSITE, both collapse space onto their shared line.
   Owns "det = 0 collapse". Anti-gaming: a shrunk-to-near-zero column
   can't fake this — the floor is baked into the predicate, not just the
   drag constraint (mirrors la-matrix's collapse goal). */
registerScene({
  id: 'det.collapse',
  lesson: LESSON,
  space: 'plane2',
  params: { col1: vec(1, 0), col2: vec(2, 2) },
  entities: (p) => [
    grid({ matrix: gridMatrix(p.col1, p.col2), color: 'muted' }),
    vector(p.col1, { color: 'accent', label: 'col1', handle: handle('col1', { constrain: onMinMag }) }),
    vector(p.col2, { color: 'accent2', label: 'col2', handle: handle('col2', { constrain: onMinMag }) }),
    label(detReadout(p.col1, p.col2) + (Math.abs(det2(p.col1, p.col2)) < 0.2 ? '  — COLLAPSED, not invertible' : ''), { at: 'readout' }),
  ],
  goals: [
    goal('Collapse space: point both columns along the SAME line, same direction (det ≈ 0), to see how parallel columns destroy a matrix’s invertibility by squashing the plane onto a line',
      (s) => mag(s.col1) > MIN_MAG && mag(s.col2) > MIN_MAG && Math.abs(det2(s.col1, s.col2)) < 0.2 && dot(s.col1, s.col2) > 0,
      { xp: 20, hold: 400, tag: 'det = 0 collapse',
        focus: 'Parallel, same-direction columns squash the plane onto one ray-and-its-opposite — every area collapses to zero.' }),
    goal('Collapse it again, but point the columns in OPPOSITE directions along the line, to see how sharing a line — not which way each column points along it — is what zeroes the determinant',
      (s) => mag(s.col1) > MIN_MAG && mag(s.col2) > MIN_MAG && Math.abs(det2(s.col1, s.col2)) < 0.2 && dot(s.col1, s.col2) < 0,
      { xp: 20, hold: 400, tag: 'det = 0 collapse',
        focus: 'Anti-parallel still collapses — det only cares that the columns share a line, not which way each one points along it.' }),
  ],
  caption: 'Line the columns up along one line and det collapses to 0 — space gets squashed flat, not invertible. Do it both ways: same direction, then opposite.',
});

/* ---- 3. SIGN: build a reflection two different ways — det < 0 ------- */
/* Micro-idea: flipping EITHER basis vector reverses orientation and
   sends det negative — it doesn't matter which one. Owns "negative det". */
registerScene({
  id: 'det.sign',
  lesson: LESSON,
  space: 'plane2',
  params: { col1: vec(1, 0), col2: vec(0, 1) },
  entities: (p) => [
    grid({ matrix: gridMatrix(p.col1, p.col2), color: 'muted' }),
    vector(p.col1, { color: 'accent', label: 'col1', handle: handle('col1', { constrain: onMinMag }) }),
    vector(p.col2, { color: 'accent2', label: 'col2', handle: handle('col2', { constrain: onMinMag }) }),
    label(detReadout(p.col1, p.col2), { at: 'readout' }),
  ],
  goals: [
    goal('Build a reflection over the x-axis: keep col1 = [1,0], flip col2 to [0,−1], to see how flipping one basis vector reverses orientation and flips the determinant’s sign',
      (s) => mag(sub(s.col1, vec(1, 0))) < 0.15 && mag(sub(s.col2, vec(0, -1))) < 0.15,
      { xp: 20, hold: 400, tag: 'negative det',
        focus: 'Mirroring ĵ to [0,−1] flips orientation. Watch det flip sign right along with it — that minus sign IS the mirror.' }),
    goal('Now flip the OTHER basis vector instead: col1 → [−1,0], keep col2 = [0,1], to see how either basis vector alone can flip orientation — the sign doesn’t care which one',
      (s) => mag(sub(s.col1, vec(-1, 0))) < 0.15 && mag(sub(s.col2, vec(0, 1))) < 0.15,
      { xp: 20, hold: 400, tag: 'negative det',
        focus: 'It doesn’t matter WHICH basis vector you flip — either one alone reverses orientation and sends det negative.' }),
  ],
  caption: 'Build a reflection two different ways — flip col2, or flip col1 instead. Either flip sends det negative: the sign tracks orientation, not size.',
});

/* ---- 4. SCALE: a real slider t drives col2 = [0,t]; det = 2t -------- */
/* Micro-idea: col1 is fixed; slide the scalar t and det moves along a
   straight line (2t) through the origin. Crossing t = 0 is crossing the
   collapse point; past it, the sign flips. Ties formula + sign together. */
const S4_COL1 = vec(2, 0);
registerScene({
  id: 'det.scale',
  lesson: LESSON,
  space: 'plane2',
  params: { t: 1 },
  controls: [slider('t', { min: -4, max: 4, step: 0.05, label: 't', format: f2 })],
  entities: (p) => {
    const col2 = vec(0, p.t);
    return [
      grid({ matrix: gridMatrix(S4_COL1, col2), color: 'muted' }),
      vector(S4_COL1, { color: 'muted', label: 'col1 (fixed)', key: 'c1' }),
      vector(col2, { color: 'accent2', label: 'col2 = [0, t]', key: 'c2' }),
      label('t = ' + f2(p.t) + '    ' + detReadout(S4_COL1, col2), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Slide t so det = 2t reads 5, to see how the determinant moves linearly with a single scaled entry',
      (s) => Math.abs(2 * s.t - 5) < 0.2,
      { xp: 20, hold: 400, tag: 'det formula',
        focus: 'With col1 fixed at [2,0], det = ad − bc = 2·t − 0·0 = 2t — a straight line in t. Solve 2t = 5 and slide there.' }),
    goal('Now slide t NEGATIVE so det reads −6, to see how crossing zero on one column flips the determinant’s sign along with the transformation’s orientation',
      (s) => Math.abs(2 * s.t + 6) < 0.2,
      { xp: 20, hold: 400, tag: 'negative det',
        focus: 'Crossing t = 0 crosses the collapse point (det = 0); past it, col2 points the other way and det goes negative.' }),
  ],
  caption: 'Column 1 is fixed; slide t to set column 2 = [0, t]. det = 2t is a straight line — cross t = 0 and watch the sign flip along with the shape.',
});

/* ---- 5. AREA: |det| IS the unit square's image area ----------------- */
/* Micro-idea: the shaded parallelogram's area is exactly |det|; hitting a
   target area is sign-agnostic, but flipping it while keeping the SAME
   area shows sign and magnitude are independent facts. */
registerScene({
  id: 'det.area',
  lesson: LESSON,
  space: 'plane2',
  params: { col1: vec(1, 0), col2: vec(0, 1) },
  entities: (p) => [
    grid({ matrix: gridMatrix(p.col1, p.col2), color: 'muted' }),
    vector(p.col1, { color: 'accent', label: 'col1', handle: handle('col1', { constrain: onMinMag }) }),
    vector(p.col2, { color: 'accent2', label: 'col2', handle: handle('col2', { constrain: onMinMag }) }),
    label(detReadout(p.col1, p.col2), { at: 'readout' }),
  ],
  goals: [
    goal('Make the unit square’s image area exactly 5 (either orientation), to see how the determinant’s magnitude alone measures how much area a transformation scales space by',
      (s) => Math.abs(Math.abs(det2(s.col1, s.col2)) - 5) < 0.2,
      { xp: 20, hold: 400, tag: 'det formula',
        focus: '|det| is the area, full stop — the sign is a separate question. Any matrix with |ad − bc| = 5 counts.' }),
    goal('Now flip it: same area (5), but oriented backwards (det negative), to see how area and orientation are independent facts the determinant encodes separately',
      (s) => Math.abs(Math.abs(det2(s.col1, s.col2)) - 5) < 0.2 && det2(s.col1, s.col2) < 0,
      { xp: 25, hold: 400, tag: 'negative det',
        focus: 'Area and orientation are independent: you can keep the exact same area and just flip which side is "up".' }),
  ],
  caption: 'The shaded parallelogram is where the unit square lands; its area is exactly |det|. Hit a target area, then flip it — same area, opposite orientation.',
});

/* ---- 6. PRODUCT: det(B·A) = det(A)·det(B) — determinants compound ---- */
/* Micro-idea: composing two transforms MULTIPLIES their area factors. This
   is exactly why a deep composition's invertibility is a CHAIN property:
   a SINGLE collapsed (det≈0) factor collapses the whole composition to a
   non-invertible map, however healthy every other factor in the chain is
   — det(B·A) = det(A)·det(B) means one zero factor zeroes the product,
   full stop. Owns all three tags: the multiply rule itself (det formula),
   a sign flip through composition (negative det), and a chain-wide
   collapse from one bad factor (det = 0 collapse). */
registerScene({
  id: 'det.product',
  lesson: LESSON,
  space: 'plane2',
  params: { aCol1: vec(1, 0), aCol2: vec(0, 1), bCol1: vec(1, 0), bCol2: vec(0, 1) },
  entities: (p) => {
    const c = matMul(p.bCol1, p.bCol2, p.aCol1, p.aCol2);   // B∘A: apply A first, then B
    const detA = det2(p.aCol1, p.aCol2), detB = det2(p.bCol1, p.bCol2), detBA = det2(c.c1, c.c2);
    return [
      grid({ matrix: gridMatrix(c.c1, c.c2), color: 'muted' }),
      vector(p.aCol1, { color: 'accent', label: 'A col1', handle: handle('aCol1', { constrain: onMinMag }) }),
      vector(p.aCol2, { color: 'accent2', label: 'A col2', handle: handle('aCol2', { constrain: onMinMag }) }),
      vector(p.bCol1, { color: 'good', label: 'B col1', handle: handle('bCol1', { constrain: onMinMag }) }),
      vector(p.bCol2, { color: 'muted', label: 'B col2', handle: handle('bCol2', { constrain: onMinMag }) }),
      label('det(A) = ' + f2(detA) + '   det(B) = ' + f2(detB) + '   det(A)·det(B) = ' + f2(detA * detB) + '   det(B·A) = ' + f2(detBA), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Build a chain that distorts area at each step but preserves it overall: det(A) and det(B) both far from 1, yet det(B·A) ≈ 1, to see how determinants multiply along a composition, so individual layers can distort area while the whole chain’s volume factor cancels back to nearly 1',
      (s) => mag(s.aCol1) > MIN_MAG && mag(s.aCol2) > MIN_MAG && mag(s.bCol1) > MIN_MAG && mag(s.bCol2) > MIN_MAG
        && Math.abs(det2(s.aCol1, s.aCol2) - 1) > 0.3 && Math.abs(det2(s.bCol1, s.bCol2) - 1) > 0.3
        && Math.abs(det2(s.aCol1, s.aCol2) * det2(s.bCol1, s.bCol2) - 1) < 0.15,
      { xp: 25, hold: 400, tag: 'det formula',
        focus: 'Determinants multiply along a composition: det(B·A) = det(A)·det(B). Two layers can each distort area and still cancel out overall — like a layer that halves scale paired with one that doubles it.' }),
    goal('Now flip orientation through the chain: with both factors real, drive det(B·A) below −0.5, to see how a single orientation flip anywhere in a composition flips the sign of the whole product',
      (s) => mag(s.aCol1) > MIN_MAG && mag(s.aCol2) > MIN_MAG && mag(s.bCol1) > MIN_MAG && mag(s.bCol2) > MIN_MAG
        && det2(s.aCol1, s.aCol2) * det2(s.bCol1, s.bCol2) < -0.5,
      { xp: 25, hold: 400, tag: 'negative det',
        focus: 'A single orientation flip anywhere in the chain (one factor with negative det) flips the whole composition — the COUNT of flips decides the sign, not their size.' }),
    goal('Collapse the WHOLE chain by collapsing just ONE factor — keep the other healthy (|det| > 1) — and watch det(B·A) go to 0 too, to see how one rank-collapsed layer destroys the invertibility of an entire composed network, no matter how healthy the rest of the chain is',
      (s) => mag(s.aCol1) > MIN_MAG && mag(s.aCol2) > MIN_MAG && mag(s.bCol1) > MIN_MAG && mag(s.bCol2) > MIN_MAG
        && ((Math.abs(det2(s.aCol1, s.aCol2)) < 0.2 && Math.abs(det2(s.bCol1, s.bCol2)) > 1)
          || (Math.abs(det2(s.bCol1, s.bCol2)) < 0.2 && Math.abs(det2(s.aCol1, s.aCol2)) > 1)),
      { xp: 30, hold: 400, tag: 'det = 0 collapse',
        focus: 'A deep composition is only as invertible as its WORST factor — one degenerate (non-invertible) layer collapses the whole chain, however healthy every other layer stays.' }),
  ],
  caption: 'Drag A and B — the readout tracks det(A), det(B), and det(B·A). Determinants multiply along a composition, so one bad (det ≈ 0) factor collapses the whole chain no matter how healthy the other is.',
});

/* ---- 7. SHEAR: shearing a column never changes det, scaling does ---- */
/* Micro-idea: shearing column 2 ALONG column 1 (adding a multiple of one
   column to another) leaves the parallelogram's base and height — and so
   det — untouched; only SCALING a column changes det. This is exactly
   why invertible-network layers (e.g. coupling-layer flows) shear data on
   purpose: a shear leaves det (the change-of-variables volume factor)
   untouched, while a scaling step moves it directly. Information is only
   destroyed once det actually reaches 0 (goal 3) — det moving from 2 to 4
   loses nothing, it just rescales. col1 = [2s, 0], col2 = [2sk, 1], so
   det = 2s − 0·(2sk) = 2s — independent of k by construction. */
const S7_SCALE_MIN = 0, S7_SCALE_MAX = 3;
const S7_SHEAR_MIN = -2.5, S7_SHEAR_MAX = 2.5;
registerScene({
  id: 'det.shear',
  lesson: LESSON,
  space: 'plane2',
  params: { s: 1, k: 0 },
  controls: [
    slider('s', { min: S7_SCALE_MIN, max: S7_SCALE_MAX, step: 0.05, label: 'scale s (column 1)', format: f2 }),
    slider('k', { min: S7_SHEAR_MIN, max: S7_SHEAR_MAX, step: 0.05, label: 'shear k (column 2 along column 1)', format: f2 }),
  ],
  entities: (p) => {
    const col1 = vec(2 * p.s, 0);
    const col2 = vec(2 * p.s * p.k, 1);
    return [
      grid({ matrix: gridMatrix(col1, col2), color: 'muted' }),
      vector(col1, { color: 'accent', label: 'col1', key: 'c1' }),
      vector(col2, { color: 'accent2', label: 'col2', key: 'c2' }),
      label('s = ' + f2(p.s) + '   k = ' + f2(p.k) + '   ' + detReadout(col1, col2), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Shear hard (|k| ≥ 1.5) while holding the area fixed at det ≈ 2 — because shear costs nothing',
      (s) => Math.abs(2 * s.s - 2) < 0.15 && Math.abs(s.k) >= 1.5,
      { xp: 20, hold: 400, tag: 'det formula',
        focus: 'Shear slides column 2 along column 1 without ever moving det = 2s. This is the volume-preserving move real invertible-network layers use on purpose — det stays put, so nothing about the transform’s invertibility changes.' }),
    goal('Now scale column 1 instead: double the area to det = 4, to see how scaling a column, unlike shearing, moves the determinant directly',
      (s) => Math.abs(2 * s.s - 4) < 0.15,
      { xp: 20, hold: 400, tag: 'det formula',
        focus: 'Unlike shearing, scaling column 1 changes det = 2s directly. Nothing is lost here either — det just moved from one nonzero value to another; only det → 0 (next goal) is where information actually gets destroyed.' }),
    goal('Collapse it: shrink column 1 to zero so det → 0 — no amount of shear can rescue it',
      (s) => Math.abs(2 * s.s) < 0.15,
      { xp: 25, hold: 400, tag: 'det = 0 collapse',
        focus: 's → 0 shrinks column 1 to nothing, and shearing never touches the determinant — once a layer collapses to zero, no downstream mixing can restore the lost dimension.' }),
  ],
  caption: 'Two moves: shear k slides column 2 along column 1 — det never budges. Scale s stretches column 1 and det = 2s moves with it directly. Only one of these two moves costs area.',
});

/* ---- 8. CAPSTONE: hit a magnitude, hit a negative, then collapse ----- */
/* THE EXAM. Three goals, the three faces of det: an exact (randomized,
   sign-agnostic) magnitude; an exact (randomized) NEGATIVE value; and the
   fixed collapse target (0 can't be further randomized — same as the old
   lab's fixed collapse mission). Controls reset to the identity (det=1).

   BASELINE-SAFETY PROOF: MAGS = [3,4,5,6], NEG_MAGS = [2,3,4] are both
   finite sets with every value >= 2 away from the baseline det = 1
   (|1-3|=2 is the closest approach for goal 1; goal 2 targets are
   NEGATIVE so |1-(-2)|=3 is the closest approach). Both margins clear
   the 0.2 tolerance with room to spare, for every possible draw — this is
   exhaustively checked (not just sampled seeds) in the test file, plus
   the ×1000-seed empirical helper. Goal 3 (collapse) needs no
   randomization: det = 1 at the reset baseline is never within 0.2 of 0. */
const CAP_MAGS = [3, 4, 5, 6];
const CAP_NEG_MAGS = [2, 3, 4];
function randomize(rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  return {
    col1: vec(1, 0), col2: vec(0, 1),
    targetMag: pick(CAP_MAGS),
    targetNeg: pick(CAP_NEG_MAGS),
  };
}
registerScene({
  id: 'det.capstone',
  lesson: LESSON,
  capstone: true,
  randomize,
  space: 'plane2',
  params: randomize(makeRng(1)),
  entities: (p) => [
    grid({ matrix: gridMatrix(p.col1, p.col2), color: 'muted' }),
    vector(p.col1, { color: 'accent', label: 'col1', handle: handle('col1', { constrain: onMinMag }) }),
    vector(p.col2, { color: 'accent2', label: 'col2', handle: handle('col2', { constrain: onMinMag }) }),
    label(detReadout(p.col1, p.col2) + '    targets: det=' + f2(p.targetMag) + ' (or ' + f2(-p.targetMag) + '), det=' + f2(-p.targetNeg) + ', then det≈0', { at: 'readout' }),
  ],
  goals: [
    goal('Hit the first target magnitude: make |ad − bc| equal it (read the readout) and hold (±0.2), to see how the determinant’s magnitude is a single number capturing how much a transformation scales area, regardless of sign',
      (s) => Math.abs(Math.abs(det2(s.col1, s.col2)) - s.targetMag) < 0.2,
      { xp: 40, hold: 700, tag: 'det formula',
        focus: 'det = ad − bc, full stop. Any matrix whose determinant has this magnitude counts, sign either way.' }),
    goal('Now hit an exact NEGATIVE determinant: make det equal the second target (negative) and hold (±0.2), to see how a negative determinant marks a transformation that flips orientation',
      (s) => Math.abs(det2(s.col1, s.col2) + s.targetNeg) < 0.2,
      { xp: 40, hold: 700, tag: 'negative det',
        focus: 'A negative determinant is a flip — orientation reversed. Hit the exact signed value, not just the magnitude.' }),
    goal('Finally, collapse space: drive det to ≈ 0 with both columns still real, and hold, to see how a zero determinant marks the exact boundary where a transformation stops being invertible',
      (s) => mag(s.col1) > MIN_MAG && mag(s.col2) > MIN_MAG && Math.abs(det2(s.col1, s.col2)) < 0.2,
      { xp: 40, hold: 700, tag: 'det = 0 collapse',
        focus: 'Line the columns up on one line — any line — and det goes to 0. That is the boundary where the matrix stops being invertible.' }),
  ],
  caption: 'No hints now. Hit the exact determinant, then an exact negative determinant, then collapse space flat — three faces of one number.',
});
