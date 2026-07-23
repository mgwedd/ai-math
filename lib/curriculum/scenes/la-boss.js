/* ================================================================
   SCENE LESSON — la-boss (BOSS: Build a Neural Layer).
   ----------------------------------------------------------------
   P2 wave F migration (CONTRACT Amendment v1.10). Converts the old
   single-lab / three-quiz la-boss into SIX scenes ending in a randomized
   capstone, following docs/AUTHORING_SCENES.md and the established
   la-matrix/la-det/la-eigen pattern.

   THE ONE IDEA: "you ARE the weight matrix." A layer computes
   x' = W·x; training never touches x, only W's four entries. Tuning
   a, b, c, d live re-represents two tangled classes until a trivial
   rule (x' > 0 ?) separates them — that IS representation learning.
   Every scene exposes W as four real `slider` controls (mirroring the
   retiring lab's own four sliders exactly), never a draggable vector —
   there is nothing to grab in this lesson, only numbers to tune.

   ROW-MAJOR CONVENTION (matches the lab and the kit's own grid()
   renderer, see vec-math.js's applyW comment): x' = a·x + b·y,
   y' = c·x + d·y. Only ROW 1 (a, b) decides which side of the boundary
   a point falls on — row 2 (c, d) is "free" for classification but
   still gates invertibility (det = ad − bc), a deliberate asymmetry the
   lesson exploits scene-to-scene (boss.direction only needs a, b;
   boss.invertible needs all four; boss.collapse shows why c, d still
   matter even though they never touch x').

   Scenes are DATA + PURE PREDICATES. Zero renderer imports. This wave
   is ADDITIVE — the lesson keeps its `interactive:'boss-la'` lab and
   quiz untouched; the arc is added as `scenes:[...]` (CONTRACT v1.10).

   ARC (anatomy -> direction -> invertible -> collapse -> margin -> capstone):
     1 boss.anatomy     one fixed point x; tune W, chase two targets —
                          the raw mechanics of x' = W·x
     2 boss.direction   the full clusters; separate them (either sign
                          pattern — no single "correct" W)
     3 boss.invertible  separate AND keep |det| > 0.3 — no information loss
     4 boss.collapse    THE SABOTAGE BEAT (its own scene): line the rows
                          up, det -> 0, both classes glue onto one line
     5 boss.margin      push past a bare pass — wide margin, high |det|
     6 boss.capstone     randomized side + thresholds, no hints

   WEAK-AREA TAG MIGRATION — the old quiz's three q.tag/q.focus pairs:
     quiz "representation learning" -> scenes 2, 5 + capstone goal 1
     quiz "what training changes"   -> scene 1 + capstone goal 3
     quiz "information loss"        -> scenes 3, 4, 5 + capstone goal 2
   Every goal in every scene (not just the capstone) carries one of
   these three tags — the migrated review loop.

   INVARIANT (g) — every goal/caption states the PAYOFF, not just the
   move: see each `focus` string below ("...to see why...", "...that IS
   what...") and every scene caption.

   NO HANDLES ANYWHERE in this file (v1.10 charter: tune W's entries via
   sliders only — there is no vector to drag). Consequently invariant
   (f) "constrain closures hoisted to module scope" is VACUOUS here —
   there are no constrain closures to hoist. Anti-gaming instead lives
   in the PREDICATES directly: boss.collapse's rows are unconstrained
   sliders (unlike a handle, nothing stops a,b or c,d resolving near
   [0,0]), so its collapse goals carry their own magnitude floor
   (ROW_MIN_MAG) rather than relying on a drag clamp that doesn't exist.

   CLUSTER DATA is copied VERBATIM from the retiring lab
   (lib/curriculum/index.js, INTERACTIVES['boss-la']) — the jitter table
   J and the two center-point formulas are byte-identical (data, not lab
   code, per the v1.10 charter).

   CAPSTONE BASELINE-SAFETY (closed-form, holds for EVERY possible
   randomize() draw): at the reset identity (a=1,b=0,c=0,d=1), x' = x for
   every point. CLUSTER_A's x ranges [0.65, 1.35] and CLUSTER_B's x
   ranges [1.45, 2.15] — BOTH strictly positive. `sepDir` requires ONE
   cluster's x' to be < -margin (margin >= 0.2 in every draw); at the
   identity NEITHER cluster is ever negative, for EITHER `side` value —
   so goal 1 (and therefore goals 2 and 3, which additionally require
   goal 1) are false at baseline for all 2 x 3 x 3 x 3 x 3 = 162 possible
   draws, without needing to sample a single seed. The x1000-seed helper
   below is the platform-mandated belt; this comment is the suspenders.
   ================================================================ */
import {
  registerScene, vec, makeRng, slider,
  grid, point, segment, cellGrid, label,
  goal,
} from '../../scene/index.js';
import { applyW, detW } from './vec-math.js';

const LESSON = 'la-boss';
const f2 = (x) => x.toFixed(2);

/* ---- cluster data — copied VERBATIM from the lab (data, not code) --- */
const J = [[-.3, .2], [.25, -.15], [.1, .3], [-.2, -.25], [.35, .1], [0, -.3], [-.35, 0], [.2, .2]];
const CLUSTER_A = J.map(([jx, jy]) => vec(1 + jx, 1.8 + jy));       // 🟣
const CLUSTER_B = J.map(([jx, jy]) => vec(1.8 - jx, -0.8 - jy));    // 🟠

const MARGIN = 0.2;        // the lab's own separation tolerance
const DET_MIN = 0.3;       // the lab's own invertibility tolerance
const COLLAPSE_EPS = 0.06; // the lab's own collapse tolerance
const ROW_MIN_MAG = 0.5;   // anti-gaming floor: a row can't fake a collapse by vanishing

const IDENTITY = { a: 1, b: 0, c: 0, d: 1 };   // the lab's own reset state

// x' of a point under ROW 1 [a,b] only — the row that decides which side of
// the boundary a point lands on (row 2 never touches x').
const rowScore = (a, b, p) => a * p.x + b * p.y;

// Separation, parameterized by a SIGN CONVENTION (`side`): there is no single
// "correct" W, only a correct sign pattern for row [a,b]. side=1: 🟣 negative
// / 🟠 positive; side=-1: the mirror image.
const sepDir = (a, b, side, m) => (side === 1
  ? CLUSTER_A.every((p) => rowScore(a, b, p) < -m) && CLUSTER_B.every((p) => rowScore(a, b, p) > m)
  : CLUSTER_A.every((p) => rowScore(a, b, p) > m) && CLUSTER_B.every((p) => rowScore(a, b, p) < -m));

const gridMatrix = (a, b, c, d) => [a, b, c, d];   // grid() wants row-major [a,b,c,d] — same convention
const wReadout = (a, b, c, d) => 'W = [ ' + f2(a) + '  ' + f2(b) + ' ; ' + f2(c) + '  ' + f2(d) + ' ]    det = ' + f2(detW(a, b, c, d));

const wSliders = () => [
  slider('a', { min: -2, max: 2, step: 0.1, label: 'a (W₁₁)', format: f2 }),
  slider('b', { min: -2, max: 2, step: 0.1, label: 'b (W₁₂)', format: f2 }),
  slider('c', { min: -2, max: 2, step: 0.1, label: 'c (W₂₁)', format: f2 }),
  slider('d', { min: -2, max: 2, step: 0.1, label: 'd (W₂₂)', format: f2 }),
];

// The recurring background for every clusters scene: the warped grid, the
// FIXED vertical decision boundary (x'=0, in the same space the transformed
// points are plotted — mirrors la-matrix.classify), and the two transformed
// clusters. Scene-specific readouts are appended by each caller.
const clusterEntities = (p) => [
  grid({ matrix: gridMatrix(p.a, p.b, p.c, p.d), color: 'muted' }),
  segment(vec(0, -4), vec(0, 4), { color: 'muted', dashed: true, label: "x' = 0", key: 'boundary' }),
  ...CLUSTER_A.map((pt, i) => point(applyW(p.a, p.b, p.c, p.d, pt), { color: 'accent', label: i === 0 ? '🟣' : undefined, key: 'a' + i })),
  ...CLUSTER_B.map((pt, i) => point(applyW(p.a, p.b, p.c, p.d, pt), { color: 'accent2', label: i === 0 ? '🟠' : undefined, key: 'b' + i })),
];

/* ---- 1. ANATOMY: one fixed point, tune W, chase two targets --------- */
/* Micro-idea: x' = W·x. The input never moves — only the four numbers do.
   A small |W| heatmap (cellGrid) makes the "four numbers" literal: this is
   the actual matrix you're editing, nothing more. Owns "what training
   changes". */
const X0 = vec(2, 1);        // fixed input — never a param, never draggable
const TARGET1 = vec(4, 0);   // reachable: a=2,b=0,c=0,d=0
const TARGET2 = vec(0, -3);  // reachable: a=0,b=0,c=-1.5,d=0
registerScene({
  id: 'boss.anatomy',
  lesson: LESSON,
  space: 'plane2',
  params: { ...IDENTITY },
  controls: wSliders(),
  entities: (p) => {
    const wx = applyW(p.a, p.b, p.c, p.d, X0);
    return [
      grid({ matrix: gridMatrix(p.a, p.b, p.c, p.d), color: 'muted' }),
      point(X0, { color: 'muted', label: 'x', key: 'x0' }),
      point(TARGET1, { color: 'warn', label: '★₁', r: 6, key: 't1' }),
      point(TARGET2, { color: 'warn', label: '★₂', r: 6, key: 't2' }),
      point(wx, { color: 'good', label: "x'", key: 'wx' }),
      cellGrid([[Math.abs(p.a), Math.abs(p.b)], [Math.abs(p.c), Math.abs(p.d)]],
        { at: vec(-5, 5), cell: 1, min: 0, max: 2, color: 'accent', key: 'wheat' }),
      label('|W| entries', { at: vec(-4.5, 5.6) }),
      label('x = [' + f2(X0.x) + ', ' + f2(X0.y) + ']    ' + wReadout(p.a, p.b, p.c, p.d) + "    x' = [" + f2(wx.x) + ', ' + f2(wx.y) + ']', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Send x′ = W·x onto ★₁ by tuning a, b, c, d — x itself never moves',
      (s) => Math.hypot(applyW(s.a, s.b, s.c, s.d, X0).x - TARGET1.x, applyW(s.a, s.b, s.c, s.d, X0).y - TARGET1.y) < 0.25,
      { xp: 20, hold: 400, tag: 'what training changes',
        focus: 'x′ = W·x. This IS training a layer: the input is fixed forever, and the only thing that ever changes is the matrix — exactly these four sliders.' }),
    goal('Now send x′ to a completely different spot, ★₂ — same x, a different W',
      (s) => Math.hypot(applyW(s.a, s.b, s.c, s.d, X0).x - TARGET2.x, applyW(s.a, s.b, s.c, s.d, X0).y - TARGET2.y) < 0.25,
      { xp: 25, hold: 400, tag: 'what training changes',
        focus: 'Any point can land almost anywhere under SOME W — a layer’s entire expressive power lives in these four numbers, never in touching the data.' }),
  ],
  caption: 'Slide a, b, c, d — the four numbers ARE the weight matrix W. Watch x′ = W·x chase each star, to feel why "training a layer" means moving only these four dials.',
});

/* ---- 2. DIRECTION: separate the real clusters (either sign) --------- */
/* Micro-idea: under the identity both clusters sit on the same side — no
   rule on x alone splits them. Row [a,b] alone decides the boundary; there
   is no single correct W, only a correct SIGN pattern. Owns "representation
   learning". */
registerScene({
  id: 'boss.direction',
  lesson: LESSON,
  space: 'plane2',
  params: { ...IDENTITY },
  controls: wSliders(),
  entities: (p) => [
    ...clusterEntities(p),
    label(wReadout(p.a, p.b, p.c, p.d), { at: 'readout' }),
  ],
  goals: [
    goal('Separate the classes: every 🟣 lands left of the line (x′ < −0.2), every 🟠 lands right (x′ > 0.2)',
      (s) => sepDir(s.a, s.b, 1, MARGIN),
      { xp: 30, hold: 500, tag: 'representation learning',
        focus: 'The raw clusters overlap in x — no rule on x alone splits them. Tuning row [a, b] re-represents every point at once until a trivial rule (x′ > 0?) finally works. That IS what a layer is for.' }),
    goal('Now flip it: separate them the OTHER way — 🟣 right of the line, 🟠 left',
      (s) => sepDir(s.a, s.b, -1, MARGIN),
      { xp: 25, hold: 500, tag: 'representation learning',
        focus: 'There is no single correct W — a whole family of matrices separates the same two classes. Only the SIGN pattern of row [a, b] matters, never one "right answer".' }),
  ],
  caption: 'Under the identity, both clusters sit on the same side — nothing separates them yet. Rotate row [a, b] until 🟣 and 🟠 fall on opposite sides of the line, then do it the other way round.',
});

/* ---- 3. INVERTIBLE: separate WITHOUT destroying information --------- */
/* Micro-idea: separating is cheap if you're willing to collapse the plane
   (det -> 0). Keeping |det| > 0.3 forces the map to stay invertible while
   it separates — the real trade-off a layer must respect. Owns
   "information loss". */
registerScene({
  id: 'boss.invertible',
  lesson: LESSON,
  space: 'plane2',
  params: { ...IDENTITY },
  controls: wSliders(),
  entities: (p) => [
    ...clusterEntities(p),
    label(wReadout(p.a, p.b, p.c, p.d) + (Math.abs(detW(p.a, p.b, p.c, p.d)) < DET_MIN ? '  — not invertible, information is being lost' : ''), { at: 'readout' }),
  ],
  goals: [
    goal('Separate the classes AND keep the layer invertible: |det| > 0.3 so no information is destroyed',
      (s) => sepDir(s.a, s.b, 1, MARGIN) && Math.abs(detW(s.a, s.b, s.c, s.d)) > DET_MIN,
      { xp: 30, hold: 600, tag: 'information loss',
        focus: 'You could squash the plane onto a line and still separate by x — but that destroys y′ forever. Keeping |det| > 0.3 means the map stays invertible: you separate WITHOUT throwing information away.' }),
    goal('Do it again the other way round — 🟣 right, 🟠 left — still with |det| > 0.3',
      (s) => sepDir(s.a, s.b, -1, MARGIN) && Math.abs(detW(s.a, s.b, s.c, s.d)) > DET_MIN,
      { xp: 25, hold: 600, tag: 'information loss',
        focus: 'Invertibility is a property of the WHOLE matrix, not just the row that happens to classify — c and d matter here even though they never touch x′.' }),
  ],
  caption: 'Separating is easy if you are allowed to destroy information; this time keep |det| above 0.3 while you do it. That trade-off — re-represent without erasing — is what a real layer must respect.',
});

/* ---- 4. COLLAPSE: the dedicated sabotage beat ------------------------ */
/* Micro-idea: line row [c,d] up with row [a,b] (same OR opposite direction,
   both collapse) and det -> 0 — both classes glue onto one line,
   unrecoverable. Its OWN scene per the v1.10 charter. Owns "information
   loss". Anti-gaming: sliders have no drag-clamp floor (unlike a handle),
   so the predicate itself gates row magnitude — a row can't fake det≈0 by
   vanishing to [0,0]. */
registerScene({
  id: 'boss.collapse',
  lesson: LESSON,
  space: 'plane2',
  params: { ...IDENTITY },
  controls: wSliders(),
  entities: (p) => [
    ...clusterEntities(p),
    label(wReadout(p.a, p.b, p.c, p.d) + (Math.abs(detW(p.a, p.b, p.c, p.d)) < COLLAPSE_EPS ? '  — COLLAPSED: both classes glued onto one line' : ''), { at: 'readout' }),
  ],
  goals: [
    goal('Sabotage it: line row [a, b] up with row [c, d], SAME direction, so det ≈ 0 and both classes collapse onto one line',
      (s) => Math.hypot(s.a, s.b) >= ROW_MIN_MAG && Math.hypot(s.c, s.d) >= ROW_MIN_MAG
        && Math.abs(detW(s.a, s.b, s.c, s.d)) < COLLAPSE_EPS && (s.a * s.c + s.b * s.d) > 0,
      { xp: 25, hold: 400, tag: 'information loss',
        focus: 'det ≈ 0 is not a harmless flip — it is the layer throwing away a whole dimension. Once both classes land on the same line, no later layer can ever pull them back apart: the information is simply gone.' }),
    goal('Collapse it again with the rows pointing OPPOSITE ways — still det ≈ 0',
      (s) => Math.hypot(s.a, s.b) >= ROW_MIN_MAG && Math.hypot(s.c, s.d) >= ROW_MIN_MAG
        && Math.abs(detW(s.a, s.b, s.c, s.d)) < COLLAPSE_EPS && (s.a * s.c + s.b * s.d) < 0,
      { xp: 20, hold: 400, tag: 'information loss',
        focus: 'It does not matter which way the rows point along their shared line — parallel rows (same or opposite) collapse the plane the same way. det only sees the SHARED direction.' }),
  ],
  caption: 'This is the sabotage move: make row [c, d] parallel to row [a, b] and det collapses toward 0. Watch both classes get glued onto one line — information a network can never recover.',
});

/* ---- 5. MARGIN: push past a bare pass -------------------------------- */
/* Micro-idea: a pass-at-the-boundary separation is fragile. Training
   doesn't stop at "technically correct" — pushing the margin AND the
   determinant further is the same four knobs, refined. Owns both tags
   (the concept bridges representation + invertibility). */
registerScene({
  id: 'boss.margin',
  lesson: LESSON,
  space: 'plane2',
  params: { ...IDENTITY },
  controls: wSliders(),
  entities: (p) => [
    ...clusterEntities(p),
    label(wReadout(p.a, p.b, p.c, p.d), { at: 'readout' }),
  ],
  goals: [
    goal('Do not just barely pass: separate with real margin (x′ beyond ±0.6) AND |det| > 0.6',
      (s) => sepDir(s.a, s.b, 1, 0.6) && Math.abs(detW(s.a, s.b, s.c, s.d)) > 0.6,
      { xp: 30, hold: 600, tag: 'representation learning',
        focus: 'A bare pass at the boundary is fragile — a slightly different sample could cross it. Training does not stop at "technically correct"; it keeps refining W for a wider, more confident margin.' }),
    goal('Now the mirror image, with the same wide margin and the same invertibility bar',
      (s) => sepDir(s.a, s.b, -1, 0.6) && Math.abs(detW(s.a, s.b, s.c, s.d)) > 0.6,
      { xp: 25, hold: 600, tag: 'information loss',
        focus: 'Whichever direction you separate in, a confident (wide-margin) classifier and an invertible (information-preserving) one are the same four numbers doing double duty.' }),
  ],
  caption: 'Push past the bare minimum: separate with margin 0.6 and |det| > 0.6, in both directions. A robust classifier does not sit on the edge of the decision line — it stays well clear of it.',
});

/* ---- 6. CAPSTONE: the exam ------------------------------------------- */
/* THE EXAM. Randomizes which SIGN CONVENTION (`side`) is required and how
   wide the margin/det bars are (two escalating tiers), while controls reset
   to the identity every attempt. See the file-header comment for the
   closed-form baseline-safety proof (holds for all 162 possible draws). */
const CAP_MARGIN = [0.2, 0.25, 0.3];
const CAP_MARGIN2 = [0.4, 0.5, 0.6];
const CAP_DET = [0.3, 0.4, 0.5];
const CAP_DET2 = [0.5, 0.6, 0.7];
function randomize(rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  return {
    ...IDENTITY,
    side: pick([1, -1]),
    margin: pick(CAP_MARGIN),
    margin2: pick(CAP_MARGIN2),
    detMin: pick(CAP_DET),
    detMin2: pick(CAP_DET2),
  };
}
registerScene({
  id: 'boss.capstone',
  lesson: LESSON,
  capstone: true,
  randomize,
  space: 'plane2',
  params: randomize(makeRng(1)),
  controls: wSliders(),
  entities: (p) => [
    ...clusterEntities(p),
    label(wReadout(p.a, p.b, p.c, p.d)
      + '    targets: margin ' + f2(p.margin) + '→' + f2(p.margin2)
      + ', det > ' + f2(p.detMin) + '→' + f2(p.detMin2)
      + ', side ' + (p.side === 1 ? '🟣 neg / 🟠 pos' : '🟠 neg / 🟣 pos'), { at: 'readout' }),
  ],
  goals: [
    goal('Separate the classes on the assigned side (read the readout) with the first margin',
      (s) => sepDir(s.a, s.b, s.side, s.margin),
      { xp: 40, hold: 700, tag: 'representation learning',
        focus: 'Re-represent the data with SOME W so a trivial rule (x′ vs 0) finally separates the tangled classes — the entire point of a layer.' }),
    goal('Now hold that separation AND keep the layer invertible (|det| past the first threshold)',
      (s) => sepDir(s.a, s.b, s.side, s.margin) && Math.abs(detW(s.a, s.b, s.c, s.d)) > s.detMin,
      { xp: 40, hold: 700, tag: 'information loss',
        focus: 'Separating is cheap if you are willing to destroy information (det ≈ 0). Clearing the det bar proves you separated WITHOUT collapsing the plane.' }),
    goal('Finally, push both bars further — wider margin, higher invertibility — the same four knobs, refined',
      (s) => sepDir(s.a, s.b, s.side, s.margin2) && Math.abs(detW(s.a, s.b, s.c, s.d)) > s.detMin2,
      { xp: 40, hold: 700, tag: 'what training changes',
        focus: 'Nothing about the clusters ever changed — only a, b, c, d did. That IS what training a neural layer means: the same four dials, tuned until the fit is both separable and safe.' }),
  ],
  caption: 'No hints now. Separate the assigned classes, then prove the layer stayed invertible, then tighten both bars further — the exam version of being the weight matrix.',
});
