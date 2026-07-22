/* ================================================================
   SCENE LESSON — la-matrix (Matrices = Transformations).
   ----------------------------------------------------------------
   P1 migration wave 1, lesson 2. Converts the old two-lab / three-quiz
   la-matrix into SIX scenes ending in a randomized capstone that IS the
   exam, following docs/AUTHORING_SCENES.md and the la-dot pattern.

   THE ONE IDEA: a 2×2 matrix is its two COLUMNS — the landing spots of
   î = [1,0] and ĵ = [0,1]. Every other vector follows by linearity:
   M·v = v.x·(col 1) + v.y·(col 2) (a linear combination — the payoff of
   la-vecops). The columns are draggable vectors in most scenes, so the
   learner literally grabs where î and ĵ land; grid() morphs under the
   matrix [col1 col2] so the whole plane warps with them.

   Scenes are DATA + PURE PREDICATES. Zero renderer imports. This wave is
   ADDITIVE — the lesson keeps its `labs`; the arc is added as
   `scenes:[...]` (CONTRACT v1.4 §5).

   ARC (anatomy → guided → free → capstone):
     1 matrix.columns    the columns ARE the landings; a point follows them
     2 matrix.rotation   a θ SLIDER drives a rigid rotation (area preserved)
     3 matrix.transform  fixed M, drag the input: M·v = combination of columns
     4 matrix.zoo        build stretch / shear / reflection by their columns
     5 matrix.classify   ML teaser: transform space to separate two classes
     6 matrix.capstone   randomized target transform, no hints

   WEAK-AREA TAG MIGRATION — the old quiz's three q.tag/q.focus pairs land
   on the capstone goals:
     quiz "columns rule"            → capstone goal 2 (place column 1 = î’s landing)
     quiz "reading transformations" → capstone goal 3 (place column 2)
     quiz "matrix-vector multiply"  → capstone goal 1 (send a probe to its image)
   Mid-lesson scenes carry these three tags on the concept they drill.

   CONTROLS: scene 2's angle is a real `slider` (CONTRACT v1.4 §3) — the
   right control for a scalar knob. Column landings are draggable vectors
   (a position, not a scalar), so they stay `handle`s.

   CAPSTONE RANDOMIZATION (CONTRACT v1.1 §1/§8): `randomize(rng)` draws a
   rotated anisotropic-scale transform (rotated diagonal); the columns reset
   to the identity each attempt, so no target is pre-satisfied for any seed
   (proven ×1000 — the rotation angles are all ≥ 40° off identity and the
   probe target is bounded away from the identity image).
   ================================================================ */
import {
  registerScene, vec, makeRng, handle, slider,
  grid, vector, point, segment, polygon, label,
  goal,
} from '../../scene/index.js';
import {
  mag, add, sub, scale, rot, matApply, det2,
  minMagConstraint,
} from './vec-math.js';

const LESSON = 'la-matrix';
const f2 = (x) => x.toFixed(2);
const deg = (rad) => Math.round((rad * 180) / Math.PI);

// Anti-gaming floor (mirrors la-dot/la-vecops): a draggable column can't be
// shrunk to (near-)nothing to fake a collapse/degenerate matrix — clamped to
// mag ≥ MIN_MAG, and the collapse goal re-checks both columns are real.
const MIN_MAG = 0.5;
const onMinMag = minMagConstraint(MIN_MAG);

const I1 = vec(1, 0), I2 = vec(0, 1);                    // î, ĵ (identity columns)
// unit-square image under columns [c1 c2]: origin → c1 → c1+c2 → c2.
const unitSquare = (c1, c2) => [vec(0, 0), c1, add(c1, c2), c2];
const gridMatrix = (c1, c2) => [c1.x, c2.x, c1.y, c2.y];  // grid() [a,b,c,d]: cols = c1, c2
const matReadout = (c1, c2) =>
  'M = [' + f2(c1.x) + '  ' + f2(c2.x) + ' ; ' + f2(c1.y) + '  ' + f2(c2.y) + ']    î→[' + f2(c1.x) + ', ' + f2(c1.y) + ']  ĵ→[' + f2(c2.x) + ', ' + f2(c2.y) + ']';

/* ---- 1. COLUMNS: the columns are where î and ĵ land ----------- */
/* Micro-idea: drag the two columns and you ARE choosing the matrix — column
   1 is where î lands, column 2 where ĵ lands. A marked point follows because
   its image is a linear combination of the columns. Owns "columns rule". */
const PROBE1 = vec(2, 1);                                 // the point carried by the columns
const T_COL1 = vec(1, 3);                                 // reachable image target for PROBE1
registerScene({
  id: 'matrix.columns',
  lesson: LESSON,
  space: 'plane2',
  params: { col1: vec(1, 0), col2: vec(0, 1) },           // identity
  entities: (p) => {
    const img = matApply(p.col1, p.col2, PROBE1);
    return [
      grid({ matrix: gridMatrix(p.col1, p.col2), color: 'muted' }),
      vector(I1, { color: 'muted', label: 'î', key: 'i0' }),
      vector(I2, { color: 'muted', label: 'ĵ', key: 'j0' }),
      polygon(unitSquare(p.col1, p.col2), { color: 'warn', fill: 'warn', alpha: 0.12 }),
      vector(p.col1, { color: 'accent', label: 'î→', handle: handle('col1', { constrain: onMinMag }) }),
      vector(p.col2, { color: 'accent2', label: 'ĵ→', handle: handle('col2', { constrain: onMinMag }) }),
      point(PROBE1, { color: 'muted', label: '●', key: 'probe0' }),
      point(T_COL1, { color: 'warn', label: '★', r: 6, key: 'ptar' }),
      point(img, { color: 'good', label: '●→', key: 'probeImg' }),
      label(matReadout(p.col1, p.col2) + '    ●→[' + f2(img.x) + ', ' + f2(img.y) + ']', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Send î to [0, 1]: drag column 1 there and watch the whole grid pivot',
      (s) => mag(sub(s.col1, vec(0, 1))) < 0.2,
      { xp: 20, tag: 'columns rule',
        focus: 'Column 1 is exactly where î lands. Move it and every vector with an x-part swings along with it.' }),
    goal('Carry the marked point ● onto the target ★ — it moves because the columns move',
      (s) => mag(sub(matApply(s.col1, s.col2, PROBE1), T_COL1)) < 0.25,
      { xp: 25, hold: 400, tag: 'columns rule',
        focus: 'A point’s image is a linear combination of the columns: ●’s image = 2·(col 1) + 1·(col 2). Everything follows from where î and ĵ land.' }),
    goal('Collapse space onto a line: line the two columns up (det ≈ 0, columns still real)',
      (s) => mag(s.col1) > MIN_MAG && mag(s.col2) > MIN_MAG && Math.abs(det2(s.col1, s.col2)) < 0.2,
      { xp: 20, hold: 400, tag: 'reading transformations',
        focus: 'When both columns point along one line the matrix squashes the whole plane onto that line — it is not invertible. Shrinking a column away doesn’t count; the two must be parallel.' }),
  ],
  caption: 'Drag the two columns — the landing spots of î and ĵ. The grid and the marked point follow, because every image is a linear combination of these two columns.',
});

/* ---- 2. ROTATION: a θ slider drives a rigid rotation ---------- */
/* Micro-idea: a rotation is one number, the angle — a real scalar knob, so
   this uses the v1.4 `slider` control (not a faked track point). The columns
   are computed from θ; area (det) is preserved throughout. */
registerScene({
  id: 'matrix.rotation',
  lesson: LESSON,
  space: 'plane2',
  params: { theta: 0 },
  controls: [slider('theta', { min: -Math.PI, max: Math.PI, step: 0.02, label: 'angle θ', format: (v) => deg(v) + '°' })],
  entities: (p) => {
    const c1 = rot(I1, p.theta), c2 = rot(I2, p.theta);
    return [
      grid({ matrix: gridMatrix(c1, c2), color: 'muted' }),
      polygon(unitSquare(c1, c2), { color: 'warn', fill: 'warn', alpha: 0.12 }),
      vector(c1, { color: 'accent', label: 'î→' }),
      vector(c2, { color: 'accent2', label: 'ĵ→' }),
      label('θ = ' + deg(p.theta) + '°    ' + matReadout(c1, c2) + '    det = ' + f2(det2(c1, c2)) + ' (area unchanged)', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Turn a quarter-circle counter-clockwise (θ = 90°): î → [0, 1], ĵ → [−1, 0]',
      (s) => Math.abs(s.theta - Math.PI / 2) < 0.05,
      { xp: 20, hold: 400, tag: 'reading transformations',
        focus: 'A 90° CCW rotation sends î up and ĵ left — the quiz’s columns [0,1] and [−1,0]. Lengths and area are untouched.' }),
    goal('Turn a half-circle (θ = 180°): everything flips to point backwards',
      (s) => Math.abs(Math.abs(s.theta) - Math.PI) < 0.05,
      { xp: 20, hold: 400, tag: 'reading transformations',
        focus: 'A 180° rotation negates every vector: î → [−1,0], ĵ → [0,−1]. It is a rotation, not a scale — det stays +1.' }),
    goal('Turn a quarter-circle CLOCKWISE (θ = −90°)',
      (s) => Math.abs(s.theta + Math.PI / 2) < 0.05,
      { xp: 20, hold: 400, tag: 'reading transformations',
        focus: 'Negative angles rotate the other way. Clockwise 90° sends î → [0,−1], ĵ → [1,0]. Watch the grid spin rigidly.' }),
  ],
  caption: 'Drag the angle slider. The grid spins as a rigid body — a rotation only changes directions, never lengths or area, so det stays 1 the whole way.',
});

/* ---- 3. TRANSFORM: M·v is a linear combination of columns ----- */
/* Micro-idea: with the matrix FIXED, drag the input v and read off the
   output M·v = v.x·(col 1) + v.y·(col 2). Aiming the output at a target is
   running the transform backwards — solving M·x = t. Owns "matrix-vector
   multiply". */
const FCOL1 = vec(1.5, 0.5), FCOL2 = vec(-0.5, 1.2);      // fixed invertible matrix (det = 2.05)
const T3_A = matApply(FCOL1, FCOL2, vec(2, 1));           // = [2.5, 2.2]
const T3_B = matApply(FCOL1, FCOL2, vec(-1, 2));          // = [-2.5, 1.9]
registerScene({
  id: 'matrix.transform',
  lesson: LESSON,
  space: 'plane2',
  params: { v: vec(1, 1) },                               // M·v = col1+col2 = [1, 1.7]
  entities: (p) => {
    const cav = scale(FCOL1, p.v.x);
    const out = matApply(FCOL1, FCOL2, p.v);
    return [
      grid({ matrix: gridMatrix(FCOL1, FCOL2), color: 'muted' }),
      vector(FCOL1, { color: 'muted', label: 'col 1', key: 'fc1' }),
      vector(FCOL2, { color: 'muted', label: 'col 2', key: 'fc2' }),
      point(T3_A, { color: 'warn', label: '★₁', r: 6, key: 'ta' }),
      point(T3_B, { color: 'warn', label: '★₂', r: 6, key: 'tb' }),
      vector(cav, { color: 'accent2', label: 'vₓ·col1', key: 'ca' }),
      vector(scale(FCOL2, p.v.y), { from: cav, color: 'accent2', label: 'v_y·col2', key: 'cb' }),
      vector(p.v, { color: 'accent', label: 'v', handle: 'v' }),
      point(out, { color: 'good', label: 'M·v', key: 'out' }),
      label('v = [' + f2(p.v.x) + ', ' + f2(p.v.y) + ']    M·v = [' + f2(out.x) + ', ' + f2(out.y) + ']', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Aim the input so the output M·v lands on ★₁',
      (s) => mag(sub(matApply(FCOL1, FCOL2, s.v), T3_A)) < 0.25,
      { xp: 20, hold: 400, tag: 'matrix-vector multiply',
        focus: 'M·v = vₓ·(col 1) + v_y·(col 2). Tune the input coordinates until that combination hits the star — this is solving M·x = t.' }),
    goal('Aim the input so the output lands on ★₂ (a different target)',
      (s) => mag(sub(matApply(FCOL1, FCOL2, s.v), T3_B)) < 0.25,
      { xp: 25, hold: 400, tag: 'matrix-vector multiply',
        focus: 'Every reachable output has exactly one input (M is invertible). Read the answer off the tip-to-tail construction, don’t guess.' }),
    goal('Find the input that lands on column 1 itself — that input is î = [1, 0]',
      (s) => mag(sub(matApply(FCOL1, FCOL2, s.v), FCOL1)) < 0.2,
      { xp: 20, tag: 'columns rule',
        focus: 'M·[1,0] selects column 1 — that is WHY the columns are the images of î and ĵ. Slide v onto [1,0] and the output snaps to col 1.' }),
  ],
  caption: 'The matrix is fixed; drag the input v. The output is vₓ·col1 + v_y·col2 — matrix-vector multiply is just a linear combination of the columns.',
});

/* ---- 4. ZOO: build a stretch, a shear, a reflection ----------- */
/* Micro-idea: every named transform is just a choice of the four numbers —
   recognize and build each by placing its columns. Owns "reading
   transformations". The direct upgrade of the old lab's three build-missions. */
registerScene({
  id: 'matrix.zoo',
  lesson: LESSON,
  space: 'plane2',
  params: { col1: vec(1, 0), col2: vec(0, 1) },           // identity
  entities: (p) => [
    grid({ matrix: gridMatrix(p.col1, p.col2), color: 'muted' }),
    polygon(unitSquare(p.col1, p.col2), { color: 'warn', fill: 'warn', alpha: 0.12 }),
    vector(p.col1, { color: 'accent', label: 'î→', handle: handle('col1', { constrain: onMinMag }) }),
    vector(p.col2, { color: 'accent2', label: 'ĵ→', handle: handle('col2', { constrain: onMinMag }) }),
    label(matReadout(p.col1, p.col2) + '    det = ' + f2(det2(p.col1, p.col2)), { at: 'readout' }),
  ],
  goals: [
    goal('Build a horizontal STRETCH by 2: î → [2, 0], ĵ → [0, 1]',
      (s) => mag(sub(s.col1, vec(2, 0))) < 0.2 && mag(sub(s.col2, vec(0, 1))) < 0.2,
      { xp: 20, hold: 400, tag: 'reading transformations',
        focus: 'A pure stretch scales along the axes: only the diagonal entries move. det = 2 means every area doubles.' }),
    goal('Build a horizontal SHEAR: keep î = [1, 0], tilt ĵ to [k, 1] with k ≥ 0.5',
      (s) => mag(sub(s.col1, vec(1, 0))) < 0.15 && Math.abs(s.col2.y - 1) < 0.15 && s.col2.x >= 0.5,
      { xp: 20, hold: 400, tag: 'reading transformations',
        focus: 'A shear pins one basis vector and slides the other parallel to it — the x-axis stays put while heights lean over. det stays 1.' }),
    goal('Build a REFLECTION over the x-axis: î = [1, 0], ĵ → [0, −1] (det goes negative)',
      (s) => mag(sub(s.col1, vec(1, 0))) < 0.15 && mag(sub(s.col2, vec(0, -1))) < 0.15,
      { xp: 25, hold: 400, tag: 'reading transformations',
        focus: 'Flipping ĵ to [0,−1] mirrors the plane; a negative determinant is the signature of a flip — orientation reverses.' }),
  ],
  caption: 'Place the columns to build each named transform. Stretch, shear, reflect — every one is just a choice of where î and ĵ land, readable straight off the columns.',
});

/* ---- 5. CLASSIFY: transform space to separate two classes ----- */
/* The neural-layer teaser (the lesson's ml box): a layer is a matrix that
   warps the input space so classes pull apart. Drag the columns so the two
   clouds land on opposite sides of x = 0 — the winning move IS finding a
   linear map that separates them. */
const CLASS_A = [vec(0.5, 1.6), vec(1.2, 1.4), vec(-0.3, 1.8)];   // "up" cloud
const CLASS_B = [vec(0.4, -1.5), vec(-1.1, -1.4), vec(1.0, -1.7)]; // "down" cloud
const sepFwd = (c1, c2) => CLASS_A.every((d) => matApply(c1, c2, d).x > 0.5)
  && CLASS_B.every((d) => matApply(c1, c2, d).x < -0.5);
const sepBwd = (c1, c2) => CLASS_A.every((d) => matApply(c1, c2, d).x < -0.5)
  && CLASS_B.every((d) => matApply(c1, c2, d).x > 0.5);
registerScene({
  id: 'matrix.classify',
  lesson: LESSON,
  space: 'plane2',
  params: { col1: vec(1, 0), col2: vec(0, 1) },           // identity: clouds overlap in x
  entities: (p) => [
    grid({ matrix: gridMatrix(p.col1, p.col2), color: 'muted' }),
    segment(vec(0, -6), vec(0, 6), { color: 'muted', dashed: true, label: 'x = 0' }),
    ...CLASS_A.map((d, i) => point(matApply(p.col1, p.col2, d), { color: 'accent', label: i === 0 ? '● A' : '●', key: 'a' + i })),
    ...CLASS_B.map((d, i) => point(matApply(p.col1, p.col2, d), { color: 'accent2', label: i === 0 ? '▲ B' : '▲', key: 'b' + i })),
    vector(p.col1, { color: 'accent', label: 'î→', width: 2, handle: handle('col1', { constrain: onMinMag }) }),
    vector(p.col2, { color: 'accent2', label: 'ĵ→', width: 2, handle: handle('col2', { constrain: onMinMag }) }),
    label('A images x ∈ [' + f2(Math.min(...CLASS_A.map((d) => matApply(p.col1, p.col2, d).x))) + ', ' + f2(Math.max(...CLASS_A.map((d) => matApply(p.col1, p.col2, d).x))) + ']    '
      + 'B images x ∈ [' + f2(Math.min(...CLASS_B.map((d) => matApply(p.col1, p.col2, d).x))) + ', ' + f2(Math.max(...CLASS_B.map((d) => matApply(p.col1, p.col2, d).x))) + ']', { at: 'readout' }),
  ],
  goals: [
    goal('Separate the classes: transform space so every A lands at output x > 0.5 and every B at x < −0.5',
      (s) => sepFwd(s.col1, s.col2),
      { xp: 25, hold: 500, tag: 'reading transformations',
        focus: 'A matrix moves every point at once. A quarter-turn sends the "up" cloud rightward and the "down" cloud leftward — a linear map that separates them, exactly what a neural layer learns.' }),
    goal('Separate them the OTHER way: A to x < −0.5, B to x > 0.5 (many matrices work)',
      (s) => sepBwd(s.col1, s.col2),
      { xp: 20, hold: 500, tag: 'reading transformations',
        focus: 'There is no single right answer — a whole family of matrices separates the classes. Flipping the rotation swaps which side each cloud lands on.' }),
    goal('Separate them while keeping space full-dimensional (a separation with |det| > 0.5)',
      (s) => (sepFwd(s.col1, s.col2) || sepBwd(s.col1, s.col2)) && Math.abs(det2(s.col1, s.col2)) > 0.5,
      { xp: 25, hold: 500, tag: 'reading transformations',
        focus: 'You could squash everything onto the x-axis (det ≈ 0) to separate — but keep det away from 0 and the map stays invertible, preserving information the way a real layer must.' }),
  ],
  caption: 'Drag the columns to warp space so the two clouds land on opposite sides of x = 0. A matrix transforms every point together — separating classes is what a neural layer does.',
});

/* ---- 6. CAPSTONE: reproduce a randomized transform ------------ */
/* THE EXAM. A random rotated-anisotropic-scale transform is drawn per
   attempt; the columns reset to the identity, so no target is ever
   pre-satisfied (rotation angles are ≥ 40° off identity and the probe
   target is bounded away from the identity image — proven ×1000). Three
   targets carry the migrated weak-area tags. No hints. */
const CAP_PROBE = vec(1, 1);                              // M·[1,1] = col1 + col2
function randomize(rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const phi = (pick([40, 70, 110, 160, 200, 250, 290, 320]) * Math.PI) / 180;  // ≥ 40° off identity
  const s1 = pick([0.8, 1.2, 1.6]);
  const s2 = pick([0.8, 1.2, 1.6]);
  const tCol1 = rot(vec(s1, 0), phi);                    // î’s target landing
  const tCol2 = rot(vec(0, s2), phi);                    // ĵ’s target landing
  return {
    col1: vec(1, 0), col2: vec(0, 1),                    // controls reset to identity
    tCol1, tCol2,
    tImg: add(tCol1, tCol2),                             // M·[1,1] target
  };
}
registerScene({
  id: 'matrix.capstone',
  lesson: LESSON,
  capstone: true,
  randomize,                                             // official reroll seam (v1.1 §1/§8)
  space: 'plane2',
  params: randomize(makeRng(1)),                         // seed-1 draw (plain object)
  entities: (p) => {
    const img = matApply(p.col1, p.col2, CAP_PROBE);     // = col1 + col2
    return [
      grid({ matrix: gridMatrix(p.col1, p.col2), color: 'muted' }),
      vector(I1, { color: 'muted', label: 'î', key: 'i0' }),
      vector(I2, { color: 'muted', label: 'ĵ', key: 'j0' }),
      point(p.tCol1, { color: 'warn', label: '★₁', r: 6, key: 't1' }),
      point(p.tCol2, { color: 'warn', label: '★₂', r: 6, key: 't2' }),
      point(p.tImg, { color: 'warn', label: '◆', r: 6, key: 'tI' }),
      vector(p.col1, { color: 'accent', label: 'î→', handle: handle('col1', { constrain: onMinMag }) }),
      vector(p.col2, { color: 'accent2', label: 'ĵ→', handle: handle('col2', { constrain: onMinMag }) }),
      point(CAP_PROBE, { color: 'muted', label: '●', key: 'probe0' }),
      point(img, { color: 'good', label: '●→', key: 'probeImg' }),
      label(matReadout(p.col1, p.col2) + '    M·[1,1] = [' + f2(img.x) + ', ' + f2(img.y) + ']', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Send the probe ● = [1,1] to its target ◆: make M·[1,1] land there (±0.25) and hold',
      (s) => mag(sub(add(s.col1, s.col2), s.tImg)) < 0.25,
      { xp: 40, hold: 700, tag: 'matrix-vector multiply',
        focus: 'M·[1,1] = col 1 + col 2. The output is a linear combination of the columns — balance both to land the diamond.' }),
    goal('Send î to its marked landing ★₁: place column 1 there (±0.2) and hold',
      (s) => mag(sub(s.col1, s.tCol1)) < 0.2,
      { xp: 40, hold: 700, tag: 'columns rule',
        focus: 'Column 1 is where î lands. Drag it onto ★₁ — that fixes the first column of the matrix.' }),
    goal('Send ĵ to its marked landing ★₂, completing the transform (±0.2) and hold',
      (s) => mag(sub(s.col2, s.tCol2)) < 0.2,
      { xp: 40, hold: 700, tag: 'reading transformations',
        focus: 'Column 2 is where ĵ lands. Place it on ★₂ and both columns — the whole matrix — are set.' }),
  ],
  caption: 'No hints now. Send the probe to ◆, send î to ★₁, and send ĵ to ★₂ by dragging the two columns, and hold each steady. This is the exam.',
});
