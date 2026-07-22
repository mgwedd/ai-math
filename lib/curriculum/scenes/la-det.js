/* ================================================================
   SCENE LESSON — la-det (The Determinant).
   ----------------------------------------------------------------
   P2 migration wave 2, lesson 2 (only attempted because la-matmul landed
   fully clean — CONTRACT v1.5 §2). Converts the old two-lab / three-quiz
   la-det into SIX scenes ending in a randomized capstone, reusing
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
     6 det.capstone  randomized magnitude + sign targets, then collapse

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
  mag, sub, dot, det2,
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
    goal('Build a matrix with det = ad − bc exactly 4',
      (s) => Math.abs(det2(s.col1, s.col2) - 4) < 0.2,
      { xp: 20, hold: 400, tag: 'det formula',
        focus: 'det = ad − bc: with col1 = [a,c] and col2 = [b,d], plug the four numbers straight into the formula.' }),
    goal('Now build one with det exactly 6',
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
    goal('Collapse space: point both columns along the SAME line, same direction (det ≈ 0)',
      (s) => mag(s.col1) > MIN_MAG && mag(s.col2) > MIN_MAG && Math.abs(det2(s.col1, s.col2)) < 0.2 && dot(s.col1, s.col2) > 0,
      { xp: 20, hold: 400, tag: 'det = 0 collapse',
        focus: 'Parallel, same-direction columns squash the plane onto one ray-and-its-opposite — every area collapses to zero.' }),
    goal('Collapse it again, but point the columns in OPPOSITE directions along the line',
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
    goal('Build a reflection over the x-axis: keep col1 = [1,0], flip col2 to [0,−1]',
      (s) => mag(sub(s.col1, vec(1, 0))) < 0.15 && mag(sub(s.col2, vec(0, -1))) < 0.15,
      { xp: 20, hold: 400, tag: 'negative det',
        focus: 'Mirroring ĵ to [0,−1] flips orientation. Watch det flip sign right along with it — that minus sign IS the mirror.' }),
    goal('Now flip the OTHER basis vector instead: col1 → [−1,0], keep col2 = [0,1]',
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
    goal('Slide t so det = 2t reads 5',
      (s) => Math.abs(2 * s.t - 5) < 0.2,
      { xp: 20, hold: 400, tag: 'det formula',
        focus: 'With col1 fixed at [2,0], det = ad − bc = 2·t − 0·0 = 2t — a straight line in t. Solve 2t = 5 and slide there.' }),
    goal('Now slide t NEGATIVE so det reads −6',
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
    goal('Make the unit square’s image area exactly 5 (either orientation)',
      (s) => Math.abs(Math.abs(det2(s.col1, s.col2)) - 5) < 0.2,
      { xp: 20, hold: 400, tag: 'det formula',
        focus: '|det| is the area, full stop — the sign is a separate question. Any matrix with |ad − bc| = 5 counts.' }),
    goal('Now flip it: same area (5), but oriented backwards (det negative)',
      (s) => Math.abs(Math.abs(det2(s.col1, s.col2)) - 5) < 0.2 && det2(s.col1, s.col2) < 0,
      { xp: 25, hold: 400, tag: 'negative det',
        focus: 'Area and orientation are independent: you can keep the exact same area and just flip which side is "up".' }),
  ],
  caption: 'The shaded parallelogram is where the unit square lands; its area is exactly |det|. Hit a target area, then flip it — same area, opposite orientation.',
});

/* ---- 6. CAPSTONE: hit a magnitude, hit a negative, then collapse ----- */
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
    goal('Hit the first target magnitude: make |ad − bc| equal it (read the readout) and hold (±0.2)',
      (s) => Math.abs(Math.abs(det2(s.col1, s.col2)) - s.targetMag) < 0.2,
      { xp: 40, hold: 700, tag: 'det formula',
        focus: 'det = ad − bc, full stop. Any matrix whose determinant has this magnitude counts, sign either way.' }),
    goal('Now hit an exact NEGATIVE determinant: make det equal the second target (negative) and hold (±0.2)',
      (s) => Math.abs(det2(s.col1, s.col2) + s.targetNeg) < 0.2,
      { xp: 40, hold: 700, tag: 'negative det',
        focus: 'A negative determinant is a flip — orientation reversed. Hit the exact signed value, not just the magnitude.' }),
    goal('Finally, collapse space: drive det to ≈ 0 with both columns still real, and hold',
      (s) => mag(s.col1) > MIN_MAG && mag(s.col2) > MIN_MAG && Math.abs(det2(s.col1, s.col2)) < 0.2,
      { xp: 40, hold: 700, tag: 'det = 0 collapse',
        focus: 'Line the columns up on one line — any line — and det goes to 0. That is the boundary where the matrix stops being invertible.' }),
  ],
  caption: 'No hints now. Hit the exact determinant, then an exact negative determinant, then collapse space flat — three faces of one number.',
});
