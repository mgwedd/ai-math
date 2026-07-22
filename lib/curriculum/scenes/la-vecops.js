/* ================================================================
   SCENE LESSON — la-vecops (Adding & Scaling Vectors).
   ----------------------------------------------------------------
   P1 migration wave 1. Converts the old two-lab / three-quiz
   la-vecops into SIX scenes ending in a randomized capstone that IS
   the exam, following docs/AUTHORING_SCENES.md and the la-dot pattern.

   Scenes are DATA + PURE PREDICATES. Zero renderer imports: geometry
   comes from the kit (lib/scene), lesson math from ./vec-math.js. This
   wave is ADDITIVE — the lesson keeps its `labs`; the scene arc is added
   as `scenes:[...]` (CONTRACT v1.4 §5).

   ARC (AUTHORING_SCENES §1 — 6–10 scenes, anatomy → guided → free →
   capstone):
     1 vecops.addition      tip-to-tail: a+b is a walk; components add
     2 vecops.scaling       a scalar stretches / flips / shrinks along a line
     3 vecops.combination   c1a+c2b reaches targets — basis coordinates
     4 vecops.span          the {a,b} lattice; independence vs collapse to a line
     5 vecops.convex        attention = a convex combination trapped in the hull
     6 vecops.capstone      randomized scalar/addition/combination targets, no hints

   WEAK-AREA TAG MIGRATION (AUTHORING_SCENES §5/§7 — keep the spaced-review
   loop alive as quizzes retire). The old quiz's three q.tag/q.focus pairs
   move onto the capstone goals:
     quiz "vector addition"        → capstone goal 2 (unit-scalar combo = a+b)
     quiz "scalar multiplication"  → capstone goal 1 (hit a scalar target)
     quiz "linear combinations"    → capstone goal 3 (hit a target point)
   Mid-lesson scenes carry these three tags on the concept they drill.

   SCALAR CONTROLS (v1 has no slider): every scalar (c, c1, c2, temperature)
   is a `point` dragged on a vertical track — the P0 la-dot temperature
   pattern. kit-core's v1.4 `slider(paramKey, …)` was not published when this
   was authored; retrofit noted in flagship-content.md Handoffs.

   CAPSTONE RANDOMIZATION (CONTRACT v1.1 §1/§8): `randomize(rng)` draws a
   rotated ORTHOGONAL basis {a,b} and integer-ish target coefficients; the
   controls c1,c2 reset to 0 each attempt, so every target is off its
   baseline for every seed (proven ×1000 in the tests).
   ================================================================ */
import {
  registerScene, vec, makeRng, handle,
  grid, vector, point, segment, polygon, label, bars,
  goal,
} from '../../scene/index.js';
import {
  dot, mag, add, sub, scale, norm, softmax, mapRange,
  lincomb, det2, rot,
  trackConstraint, minMagConstraint,
} from './vec-math.js';

const LESSON = 'la-vecops';
const f2 = (x) => x.toFixed(2);

// Anti-gaming floor (mirrors la-dot): a draggable vector's tip is clamped to
// stay >= MIN_MAG from the origin, AND any goal that would otherwise credit a
// shrunk-to-nothing arrow re-checks mag(...) > MIN_MAG — defense in two layers.
const MIN_MAG = 0.5;
const onMinMag = minMagConstraint(MIN_MAG);

/* ---- 1. ADDITION: a+b is a tip-to-tail walk -------------------- */
/* Micro-idea: adding two vectors is walking along the first arrow then
   the second; the sum's components are the component sums. Owns the
   "vector addition" concept. Both tips move freely. */
registerScene({
  id: 'vecops.addition',
  lesson: LESSON,
  space: 'plane2',
  params: { a: vec(2, 1), b: vec(1, 2) },              // sum = [3,3]
  entities: (p) => {
    const s = add(p.a, p.b);
    return [
      grid(),
      vector(p.a, { color: 'accent', label: 'a', handle: handle('a', { constrain: onMinMag }) }),
      vector(p.b, { color: 'accent2', label: 'b', handle: handle('b', { constrain: onMinMag }) }),
      vector(p.b, { from: p.a, color: 'muted', width: 2.5, key: 'bghost' }),   // tip-to-tail ghost
      vector(s, { color: 'good', label: 'a+b' }),
      label('a = [' + f2(p.a.x) + ', ' + f2(p.a.y) + ']    b = [' + f2(p.b.x) + ', ' + f2(p.b.y) + ']    a+b = [' + f2(s.x) + ', ' + f2(s.y) + ']', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Walk tip-to-tail until the sum reaches past x = 4',
      (s) => add(s.a, s.b).x > 4,
      { xp: 20, tag: 'vector addition',
        focus: 'Addition is component-wise: (a+b).x = a.x + b.x. Lean both arrows rightward and the sum reaches further right.' }),
    goal('Cancel the height: make the sum lie flat (its y ≈ 0) while still pointing right',
      (s) => mag(s.a) > MIN_MAG && mag(s.b) > MIN_MAG
        && Math.abs(add(s.a, s.b).y) < 0.15 && add(s.a, s.b).x > 1,
      { xp: 20, hold: 400, tag: 'vector addition',
        focus: 'The y-components add too: a.y + b.y must reach 0. One arrow points up, the other down by the same amount.' }),
    goal('Cancel completely: collapse a + b to nothing (both arrows still real)',
      (s) => mag(s.a) > MIN_MAG && mag(s.b) > MIN_MAG && mag(add(s.a, s.b)) < 0.3,
      { xp: 20, hold: 400, tag: 'vector addition',
        focus: 'a + b = 0 means b = −a: same length, opposite direction. Shrinking an arrow away doesn’t count — the directions must oppose.' }),
  ],
  caption: 'Drag a and b. The green sum is the tip-to-tail walk — along a, then along b — and its components are the component sums.',
});

/* ---- 2. SCALING: a scalar stretches / flips along a line ------- */
/* Micro-idea: c·a stays on a's line; |c| sets the length, the sign sets
   the direction — a scalar can never rotate. Owns "scalar multiplication".
   c is a point dragged on a vertical track (v1 has no slider). */
const A_S = vec(2, 1.2);                                 // the vector being scaled
const SC_X = 5.4, SC_LO = -4, SC_HI = 4, C_MIN = -2.5, C_MAX = 2.5;
const onScaleTrack = trackConstraint(SC_X, SC_LO, SC_HI);
const cOfS = (y) => mapRange(y, SC_LO, SC_HI, C_MIN, C_MAX);
const yForCS = (c) => mapRange(c, C_MIN, C_MAX, SC_LO, SC_HI);
const A_S_LINE_A = scale(norm(A_S), -7);                 // a's full line (fixed guide)
const A_S_LINE_B = scale(norm(A_S), 7);
registerScene({
  id: 'vecops.scaling',
  lesson: LESSON,
  space: 'plane2',
  params: { ck: vec(SC_X, yForCS(1)) },                  // c = 1 (arrow = a itself)
  entities: (p) => {
    const c = cOfS(p.ck.y);
    return [
      grid(),
      segment(A_S_LINE_A, A_S_LINE_B, { color: 'muted', dashed: true }),
      segment(vec(SC_X, SC_LO), vec(SC_X, SC_HI), { color: 'muted', label: 'scalar c' }),
      vector(A_S, { color: 'muted', label: 'a (c=1)' }),
      vector(scale(A_S, c), { color: 'accent', label: 'c·a' }),
      point(p.ck, { color: 'warn', label: 'c = ' + f2(c), handle: handle('ck', { constrain: onScaleTrack }) }),
      label('c = ' + f2(c) + '    c·a = [' + f2(A_S.x * c) + ', ' + f2(A_S.y * c) + ']', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Stretch a past double its length (c > 2)',
      (s) => cOfS(s.ck.y) > 2,
      { xp: 20, tag: 'scalar multiplication',
        focus: '|c| sets the length: c = 2 doubles the arrow, c = 3 triples it — same direction, just longer.' }),
    goal('Flip a to point the opposite way (c < 0)',
      (s) => cOfS(s.ck.y) < -0.5,
      { xp: 20, hold: 400, tag: 'scalar multiplication',
        focus: 'A negative scalar reverses direction 180° — the arrow lands on the other side of the origin. It never rotates off its own line.' }),
    goal('Shrink a below half length, still pointing forward (0.1 < c < 0.5)',
      (s) => { const c = cOfS(s.ck.y); return c > 0.1 && c < 0.5; },
      { xp: 20, tag: 'scalar multiplication',
        focus: '|c| < 1 shrinks. c = 0.5 halves the arrow but keeps its direction; only the minus sign would flip it.' }),
  ],
  caption: 'Slide c up and down the track. c·a rides a’s dashed line — |c| sets the length, the sign flips the direction. A scalar can’t rotate.',
});

/* ---- 3. COMBINATION: c1a+c2b reaches any target --------------- */
/* Micro-idea: scale each of two independent vectors, add tip-to-tail,
   and you can land on any point — its (c1,c2) are its coordinates in the
   basis {a,b}. Owns "linear combinations". Two scalar tracks; three fixed
   targets (the old reach-lab’s three, incl. negative coordinates). */
const A_C = vec(2, 1), B_C = vec(1, 3);                  // basis, det = 5 (independent)
const T_A = vec(5, 5), T_B = vec(0, 5), T_C = vec(3, -1); // = 2a+b, −a+2b, 2a−b
const C1_X = 5.0, C2_X = 5.9, CB_LO = -4, CB_HI = 4, K_MIN = -3, K_MAX = 3;
const onC1 = trackConstraint(C1_X, CB_LO, CB_HI);
const onC2 = trackConstraint(C2_X, CB_LO, CB_HI);
const kOf = (y) => mapRange(y, CB_LO, CB_HI, K_MIN, K_MAX);
const yForK = (k) => mapRange(k, K_MIN, K_MAX, CB_LO, CB_HI);
const A_C_LINE = [scale(norm(A_C), -7), scale(norm(A_C), 7)];
const B_C_LINE = [scale(norm(B_C), -7), scale(norm(B_C), 7)];
const combResult = (s) => lincomb(kOf(s.c1k.y), A_C, kOf(s.c2k.y), B_C);
registerScene({
  id: 'vecops.combination',
  lesson: LESSON,
  space: 'plane2',
  params: { c1k: vec(C1_X, yForK(1)), c2k: vec(C2_X, yForK(1)) },  // c1=c2=1 → a+b=[3,4]
  entities: (p) => {
    const c1 = kOf(p.c1k.y), c2 = kOf(p.c2k.y);
    const ca = scale(A_C, c1), r = lincomb(c1, A_C, c2, B_C);
    return [
      grid(),
      segment(A_C_LINE[0], A_C_LINE[1], { color: 'muted', dashed: true }),
      segment(B_C_LINE[0], B_C_LINE[1], { color: 'muted', dashed: true }),
      point(T_A, { color: 'warn', label: 'A', r: 6, key: 'tA' }),
      point(T_B, { color: 'warn', label: 'B', r: 6, key: 'tB' }),
      point(T_C, { color: 'warn', label: 'C', r: 6, key: 'tC' }),
      vector(ca, { color: 'accent', label: 'c₁a' }),
      vector(scale(B_C, c2), { from: ca, color: 'accent2', label: 'c₂b', key: 'c2ghost' }),
      vector(r, { color: 'good', label: 'c₁a+c₂b' }),
      segment(vec(C1_X, CB_LO), vec(C1_X, CB_HI), { color: 'muted', label: 'c₁' }),
      segment(vec(C2_X, CB_LO), vec(C2_X, CB_HI), { color: 'muted', label: 'c₂' }),
      point(p.c1k, { color: 'warn', handle: handle('c1k', { constrain: onC1 }) }),
      point(p.c2k, { color: 'warn', handle: handle('c2k', { constrain: onC2 }) }),
      label('c₁ = ' + f2(c1) + '   c₂ = ' + f2(c2) + '   c₁a+c₂b = [' + f2(r.x) + ', ' + f2(r.y) + ']', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Reach target A = [5, 5] — build 2a + b',
      (s) => mag(sub(combResult(s), T_A)) < 0.3,
      { xp: 20, hold: 400, tag: 'linear combinations',
        focus: 'Scale a by 2 and b by 1, then add tip-to-tail. A linear combination c₁a + c₂b is always another vector.' }),
    goal('Reach target B = [0, 5] — the amount of a must go negative',
      (s) => mag(sub(combResult(s), T_B)) < 0.3 && kOf(s.c1k.y) < 0,
      { xp: 25, hold: 400, tag: 'linear combinations',
        focus: 'B sits on the far side of a: reaching it needs c₁ = −1, c₂ = 2. Negative scalars are allowed and often necessary.' }),
    goal('Reach target C = [3, −1] — a mix of +a and −b',
      (s) => mag(sub(combResult(s), T_C)) < 0.3 && kOf(s.c2k.y) < 0,
      { xp: 25, hold: 400, tag: 'linear combinations',
        focus: 'C = 2a − b. Every point has exactly one (c₁, c₂) — these are its coordinates in the basis {a, b}.' }),
  ],
  caption: 'Tune c₁ and c₂ so the green combination lands on each gold target. There is exactly one answer per target — read it off the tip-to-tail construction.',
});

/* ---- 4. SPAN: the {a,b} lattice, independence vs collapse ------ */
/* Micro-idea: the set of ALL c1a+c2b is the span. Two independent vectors
   span the whole plane (the lattice tiles it); make them parallel and the
   span collapses to a single line. a is fixed; b is dragged; grid() morphs
   under the matrix [a b] so the lattice IS the reachable set. */
const A_SP = vec(2, 1);                                  // fixed generator
registerScene({
  id: 'vecops.span',
  lesson: LESSON,
  space: 'plane2',
  params: { b: vec(1, 2) },                              // det = 3 baseline
  entities: (p) => {
    const d = det2(A_SP, p.b);
    return [
      // grid matrix [a, b, c, d] maps e1->(a,c), e2->(b,d): columns = A_SP, b.
      grid({ matrix: [A_SP.x, p.b.x, A_SP.y, p.b.y], color: 'muted' }),
      vector(A_SP, { color: 'accent', label: 'a' }),
      vector(p.b, { color: 'accent2', label: 'b', handle: handle('b', { constrain: onMinMag }) }),
      label('det [a b] = ' + f2(d) + '    → span = ' + (Math.abs(d) < 0.2 ? 'a LINE' : 'the whole plane'), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Tilt b so the two directions clearly span the plane (|det| > 4)',
      (s) => Math.abs(det2(A_SP, s.b)) > 4,
      { xp: 20, tag: 'linear combinations',
        focus: 'Two non-parallel vectors reach every point: their span is all of ℝ². The lattice tiles the whole plane.' }),
    goal('Collapse the span to a line: line b up parallel with a (|det| ≈ 0, b still real)',
      (s) => mag(s.b) > MIN_MAG && Math.abs(det2(A_SP, s.b)) < 0.2,
      { xp: 25, hold: 500, tag: 'linear combinations',
        focus: 'Parallel vectors span only a line — most of the plane becomes unreachable. Independence is what buys you the whole plane. (Shrinking b to nothing doesn’t count — it must stay real, just parallel.)' }),
    goal('Swing b out wide the other way (det < −6)',
      (s) => det2(A_SP, s.b) < -6,
      { xp: 20, tag: 'linear combinations',
        focus: 'Crossing b to the other side of a flips the orientation — det goes negative — and a wider spread covers more area per lattice step.' }),
  ],
  caption: 'Drag b. The lattice is every c₁a + c₂b you can build — the span. Non-parallel arrows tile the plane; make them parallel and it flattens to one line.',
});

/* ---- 5. CONVEX: attention is a convex combination ------------- */
/* The transformer teaser and the lesson’s "deeper" payload. Softmax turns
   query·value scores into weights that are non-negative and sum to 1; the
   output is that weighted average of the value points — a CONVEX combination,
   always trapped inside their triangle hull, no matter the weights. */
const VALS = [vec(-2.4, -1.2), vec(2.6, -0.8), vec(0.2, 2.8)];  // value points (hull)
const SQRT_D = Math.sqrt(2);
const CV_X = 5.4, CV_LO = -4, CV_HI = 4, CT_MIN = 0.2, CT_MAX = 5;
const onCvTrack = trackConstraint(CV_X, CV_LO, CV_HI);
const cvTempOf = (y) => mapRange(y, CV_LO, CV_HI, CT_MIN, CT_MAX);
const yForCvTemp = (t) => mapRange(t, CT_MIN, CT_MAX, CV_LO, CV_HI);
const CV_FLATTEN_TEMP = 2;                               // must genuinely heat, not zero q
const attnW = (q, temp) => softmax(VALS.map((v) => dot(q, v) / SQRT_D), temp);
const attnOut = (q, temp) => attnW(q, temp)
  .reduce((acc, wi, i) => add(acc, scale(VALS[i], wi)), vec(0, 0));
registerScene({
  id: 'vecops.convex',
  lesson: LESSON,
  space: 'plane2',
  params: { q: vec(1.6, 1.0), tk: vec(CV_X, yForCvTemp(1)) },   // T = 1, max weight ≈ 0.54
  entities: (p) => {
    const temp = cvTempOf(p.tk.y);
    const w = attnW(p.q, temp);
    const out = attnOut(p.q, temp);
    return [
      grid(),
      polygon(VALS, { color: 'muted', fill: 'muted', alpha: 0.12 }),
      ...VALS.map((v, i) => point(v, { color: 'muted', label: 'v' + (i + 1), key: 'val' + i })),
      vector(p.q, { color: 'accent', label: 'query', handle: 'q' }),
      segment(vec(CV_X, CV_LO), vec(CV_X, CV_HI), { color: 'muted', label: 'temperature' }),
      point(p.tk, { color: 'warn', label: 'T = ' + f2(temp), handle: handle('tk', { constrain: onCvTrack }) }),
      point(out, { color: 'good', label: 'output', key: 'out' }),
      bars(w, { at: vec(-5.6, -5), labels: VALS.map((_, i) => 'v' + (i + 1)), color: 'accent2' }),
      label('weights = [' + w.map(f2).join(', ') + ']    output = [' + f2(out.x) + ', ' + f2(out.y) + ']  (inside the triangle)', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Attend almost entirely to v1: push its weight above 0.85',
      (s) => attnW(s.q, cvTempOf(s.tk.y))[0] > 0.85,
      { xp: 20, tag: 'linear combinations',
        focus: 'Aim the query at v1 and cool the temperature — the softmax weight on v1 approaches 1 and the output slides onto that corner.' }),
    goal('Attend almost entirely to v3: its weight above 0.85',
      (s) => attnW(s.q, cvTempOf(s.tk.y))[2] > 0.85,
      { xp: 20, tag: 'linear combinations',
        focus: 'The output is a weighted average of the value points. Concentrate the weight and the average lands on that vertex.' }),
    goal('Blend all three so no weight tops 0.45 (query real, heat doing the work)',
      (s) => {
        const t = cvTempOf(s.tk.y);
        return mag(s.q) > MIN_MAG && t > CV_FLATTEN_TEMP
          && Math.max(...attnW(s.q, t)) < 0.45;
      },
      { xp: 25, hold: 500, tag: 'linear combinations',
        focus: 'High temperature evens the weights — the output drifts toward the centroid but never leaves the triangle. A convex combination is always trapped inside the hull. (Zeroing the query flattens for free — it doesn’t count; the heat must do it.)' }),
  ],
  caption: 'Aim the query and set the temperature. The weights are non-negative and sum to 1, so the output is a weighted average of v1, v2, v3 — always inside their triangle.',
});

/* ---- 6. CAPSTONE: randomized scalar / addition / combination -- */
/* THE EXAM. A rotated ORTHOGONAL basis {a,b} is drawn per attempt; the two
   scalar controls reset to 0, so no target — a scalar target, the unit-scalar
   sum a+b, or a random target point — is ever pre-satisfied for any seed
   (proven ×1000). Three targets carry the migrated weak-area tags. No hints. */
const CAP_C1_X = 5.0, CAP_C2_X = 5.9, CAP_LO = -4, CAP_HI = 4, CAP_KMIN = -2.6, CAP_KMAX = 2.6;
const onCapC1 = trackConstraint(CAP_C1_X, CAP_LO, CAP_HI);
const onCapC2 = trackConstraint(CAP_C2_X, CAP_LO, CAP_HI);
const capKOf = (y) => mapRange(y, CAP_LO, CAP_HI, CAP_KMIN, CAP_KMAX);
const capYForK = (k) => mapRange(k, CAP_KMIN, CAP_KMAX, CAP_LO, CAP_HI);
const capResult = (s) => lincomb(capKOf(s.c1k.y), s.a, capKOf(s.c2k.y), s.b);
// The official reroll seam (CONTRACT v1.1 §1): rng() in [0,1). Draws a rotated
// orthogonal basis so ‖c1·a + c2·b‖ is bounded below (Pythagoras) — the target
// point can never sit near the origin where the c1=c2=0 baseline lives.
function randomize(rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const th = rng() * Math.PI * 2;
  const len1 = 1.5 + rng() * 1.0;                        // ‖a‖ in [1.5, 2.5]
  const len2 = 1.5 + rng() * 1.0;                        // ‖b‖ in [1.5, 2.5]
  const a = rot(vec(len1, 0), th);
  const b = rot(vec(0, len2), th);                       // ⟂ a: orthogonal basis
  const coeffs = [-2, -1.5, 1.5, 2];
  const c1star = pick(coeffs);
  const c2star = pick(coeffs);
  const T = lincomb(c1star, a, c2star, b);               // random target point
  return {
    a, b, T,
    sTarget: pick(coeffs),                               // scalar-only target for c1
    c1k: vec(CAP_C1_X, capYForK(0)),                     // controls reset to 0
    c2k: vec(CAP_C2_X, capYForK(0)),
  };
}
registerScene({
  id: 'vecops.capstone',
  lesson: LESSON,
  capstone: true,
  randomize,                                             // official reroll seam (v1.1 §1/§8)
  space: 'plane2',
  params: randomize(makeRng(1)),                         // seed-1 draw (plain object)
  entities: (p) => {
    const c1 = capKOf(p.c1k.y), c2 = capKOf(p.c2k.y);
    const ca = scale(p.a, c1), r = lincomb(c1, p.a, c2, p.b);
    return [
      grid(),
      vector(p.a, { color: 'muted', label: 'a' }),        // the given basis — not draggable
      vector(p.b, { color: 'muted', label: 'b' }),
      point(p.T, { color: 'warn', label: '★', r: 6 }),
      vector(ca, { color: 'accent', label: 'c₁a' }),
      vector(scale(p.b, c2), { from: ca, color: 'accent2', label: 'c₂b', key: 'c2g' }),
      vector(r, { color: 'good', label: 'c₁a+c₂b' }),
      segment(vec(CAP_C1_X, CAP_LO), vec(CAP_C1_X, CAP_HI), { color: 'muted', label: 'c₁' }),
      segment(vec(CAP_C2_X, CAP_LO), vec(CAP_C2_X, CAP_HI), { color: 'muted', label: 'c₂' }),
      point(p.c1k, { color: 'warn', handle: handle('c1k', { constrain: onCapC1 }) }),
      point(p.c2k, { color: 'warn', handle: handle('c2k', { constrain: onCapC2 }) }),
      label('targets:  c₁ = ' + f2(p.sTarget) + '    ★ = [' + f2(p.T.x) + ', ' + f2(p.T.y) + ']    now  c₁ = ' + f2(c1) + '  c₂ = ' + f2(c2), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Set the amount of a to the marked scalar: c₁ = target (±0.15) and hold',
      (s) => Math.abs(capKOf(s.c1k.y) - s.sTarget) < 0.15,
      { xp: 40, hold: 700, tag: 'scalar multiplication',
        focus: 'A scalar just stretches or flips a: |c| is the length, the sign is the direction. Dial c₁ to the marked amount.' }),
    goal('Plain addition: set both scalars to 1 so the result is exactly a + b, and hold',
      (s) => Math.abs(capKOf(s.c1k.y) - 1) < 0.12 && Math.abs(capKOf(s.c2k.y) - 1) < 0.12,
      { xp: 40, hold: 700, tag: 'vector addition',
        focus: 'c₁ = c₂ = 1 is nothing but a + b — a linear combination with unit scalars is ordinary tip-to-tail addition.' }),
    goal('Reach the ★ target with the right mix: c₁a + c₂b within 0.3 of ★, and hold',
      (s) => mag(sub(capResult(s), s.T)) < 0.3,
      { xp: 40, hold: 700, tag: 'linear combinations',
        focus: 'Every point has one coordinate pair in the basis {a, b}. Solve for the c₁, c₂ that land the combination on the star.' }),
  ],
  caption: 'No hints now. Hit each target — a scalar amount, the plain sum a + b, and the star point — by tuning c₁ and c₂, and hold steady. This is the exam.',
});
