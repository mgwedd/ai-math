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
     6 vecops.difference    b−a is the walk a→b — the residual a learner chases to 0
     7 vecops.capstone      randomized scalar/addition/combination targets, no hints

   P2 wave E addition: scene 6 (difference-vector, mined from draft PR #75)
   inserted before the capstone, additive, no existing scene touched.

   WEAK-AREA TAG MIGRATION (AUTHORING_SCENES §5/§7 — keep the spaced-review
   loop alive as quizzes retire). The old quiz's three q.tag/q.focus pairs
   move onto the capstone goals:
     quiz "vector addition"        → capstone goal 2 (unit-scalar combo = a+b)
     quiz "scalar multiplication"  → capstone goal 1 (hit a scalar target)
     quiz "linear combinations"    → capstone goal 3 (hit a target point)
   Mid-lesson scenes carry these three tags on the concept they drill.

   SCALAR CONTROLS: every scalar (c, c1, c2, temperature) is a real v1.4
   `slider(paramKey, …)` (CONTRACT §3) bound directly to a scalar param —
   retrofitted from the original track-point fallback (P2 wave B polish,
   semantics-preserving: same goals/targets/tags/anti-gaming, only the
   control mechanism changed, per the chief architect's ruling that this
   retrofit ships only once la-eigen lands clean).

   CAPSTONE RANDOMIZATION (CONTRACT v1.1 §1/§8): `randomize(rng)` draws a
   rotated ORTHOGONAL basis {a,b} and integer-ish target coefficients; the
   controls c1,c2 reset to 0 each attempt, so every target is off its
   baseline for every seed (proven ×1000 in the tests).
   ================================================================ */
import {
  registerScene, vec, makeRng, handle, slider,
  grid, vector, point, segment, polygon, label, bars,
  goal,
} from '../../scene/index.js';
import {
  dot, mag, add, sub, scale, norm, softmax,
  lincomb, det2, rot,
  minMagConstraint,
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
    goal('Walk tip-to-tail until the sum reaches past x = 4, to see how vector addition combines components one axis at a time',
      (s) => add(s.a, s.b).x > 4,
      { xp: 20, tag: 'vector addition',
        focus: 'Addition is component-wise: (a+b).x = a.x + b.x. Lean both arrows rightward and the sum reaches further right.' }),
    goal('Cancel the height: make the sum lie flat (its y ≈ 0) while still pointing right, to see how opposing components in a sum cancel out axis by axis',
      (s) => mag(s.a) > MIN_MAG && mag(s.b) > MIN_MAG
        && Math.abs(add(s.a, s.b).y) < 0.15 && add(s.a, s.b).x > 1
        // genuine cancellation: both arrows must carry a real, OPPOSING vertical
        // component (not two already-flat arrows that trivially sum flat).
        && Math.min(Math.abs(s.a.y), Math.abs(s.b.y)) >= 0.3 && s.a.y * s.b.y < 0,
      { xp: 20, hold: 400, tag: 'vector addition',
        focus: 'The y-components add too: a.y + b.y must reach 0. One arrow must point genuinely up, the other genuinely down by the same amount — two flat arrows aren’t cancelling anything.' }),
    goal('Cancel completely: collapse a + b to nothing (both arrows still real), to see how a sum of equal-and-opposite vectors reaches the zero vector',
      (s) => mag(s.a) > MIN_MAG && mag(s.b) > MIN_MAG && mag(add(s.a, s.b)) < 0.3,
      { xp: 20, hold: 400, tag: 'vector addition',
        focus: 'a + b = 0 means b = −a: same length, opposite direction. Shrinking an arrow away doesn’t count — the directions must oppose.' }),
  ],
  caption: 'Drag a and b. The green sum is the tip-to-tail walk — along a, then along b — and its components are the component sums.',
});

/* ---- 2. SCALING: a scalar stretches / flips along a line ------- */
/* Micro-idea: c·a stays on a's line; |c| sets the length, the sign sets
   the direction — a scalar can never rotate. Owns "scalar multiplication".
   c is a real scalar `slider` (retrofitted from the original track-point
   fallback — same range, same goals, same targets). */
const A_S = vec(2, 1.2);                                 // the vector being scaled
const C_MIN = -2.5, C_MAX = 2.5;
const A_S_LINE_A = scale(norm(A_S), -7);                 // a's full line (fixed guide)
const A_S_LINE_B = scale(norm(A_S), 7);
registerScene({
  id: 'vecops.scaling',
  lesson: LESSON,
  space: 'plane2',
  params: { c: 1 },                                      // c = 1 (arrow = a itself)
  controls: [slider('c', { min: C_MIN, max: C_MAX, step: 0.05, label: 'scalar c', format: f2 })],
  entities: (p) => [
    grid(),
    segment(A_S_LINE_A, A_S_LINE_B, { color: 'muted', dashed: true }),
    vector(A_S, { color: 'muted', label: 'a (c=1)' }),
    vector(scale(A_S, p.c), { color: 'accent', label: 'c·a' }),
    label('c = ' + f2(p.c) + '    c·a = [' + f2(A_S.x * p.c) + ', ' + f2(A_S.y * p.c) + ']', { at: 'readout' }),
  ],
  goals: [
    goal('Stretch a past double its length (c > 2), to see how a scalar multiplier grows a vector’s length without ever changing its direction',
      (s) => s.c > 2,
      { xp: 20, tag: 'scalar multiplication',
        focus: '|c| sets the length: c = 2 doubles the arrow, c = 3 triples it — same direction, just longer.' }),
    goal('Flip a to point the opposite way (c < 0), to see how a negative scalar reverses direction but never rotates a vector off its own line',
      (s) => s.c < -0.5,
      { xp: 20, hold: 400, tag: 'scalar multiplication',
        focus: 'A negative scalar reverses direction 180° — the arrow lands on the other side of the origin. It never rotates off its own line.' }),
    goal('Shrink a below half length, still pointing forward (0.1 < c < 0.5), to see how a scalar between 0 and 1 shrinks a vector while preserving its direction',
      (s) => s.c > 0.1 && s.c < 0.5,
      { xp: 20, tag: 'scalar multiplication',
        focus: '|c| < 1 shrinks. c = 0.5 halves the arrow but keeps its direction; only the minus sign would flip it.' }),
  ],
  caption: 'Slide c. c·a rides a’s dashed line — |c| sets the length, the sign flips the direction. A scalar can’t rotate.',
});

/* ---- 3. COMBINATION: c1a+c2b reaches any target --------------- */
/* Micro-idea: scale each of two independent vectors, add tip-to-tail,
   and you can land on any point — its (c1,c2) are its coordinates in the
   basis {a,b}. Owns "linear combinations". Two scalar `slider`s
   (retrofitted from the original track-point fallback — same range, same
   goals, same three fixed targets, incl. negative coordinates). */
const A_C = vec(2, 1), B_C = vec(1, 3);                  // basis, det = 5 (independent)
const T_A = vec(5, 5), T_B = vec(0, 5), T_C = vec(3, -1); // = 2a+b, −a+2b, 2a−b
const K_MIN = -3, K_MAX = 3;
const A_C_LINE = [scale(norm(A_C), -7), scale(norm(A_C), 7)];
const B_C_LINE = [scale(norm(B_C), -7), scale(norm(B_C), 7)];
const combResult = (s) => lincomb(s.c1, A_C, s.c2, B_C);
registerScene({
  id: 'vecops.combination',
  lesson: LESSON,
  space: 'plane2',
  params: { c1: 1, c2: 1 },                              // c1=c2=1 → a+b=[3,4]
  controls: [
    slider('c1', { min: K_MIN, max: K_MAX, step: 0.05, label: 'c₁', format: f2 }),
    slider('c2', { min: K_MIN, max: K_MAX, step: 0.05, label: 'c₂', format: f2 }),
  ],
  entities: (p) => {
    const ca = scale(A_C, p.c1), r = lincomb(p.c1, A_C, p.c2, B_C);
    return [
      grid(),
      segment(A_C_LINE[0], A_C_LINE[1], { color: 'muted', dashed: true }),
      segment(B_C_LINE[0], B_C_LINE[1], { color: 'muted', dashed: true }),
      point(T_A, { color: 'warn', label: 'A', r: 6, key: 'tA' }),
      point(T_B, { color: 'warn', label: 'B', r: 6, key: 'tB' }),
      point(T_C, { color: 'warn', label: 'C', r: 6, key: 'tC' }),
      vector(ca, { color: 'accent', label: 'c₁a' }),
      vector(scale(B_C, p.c2), { from: ca, color: 'accent2', label: 'c₂b', key: 'c2ghost' }),
      vector(r, { color: 'good', label: 'c₁a+c₂b' }),
      label('c₁ = ' + f2(p.c1) + '   c₂ = ' + f2(p.c2) + '   c₁a+c₂b = [' + f2(r.x) + ', ' + f2(r.y) + ']', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Reach target A = [5, 5] — build 2a + b, to see how any point in the plane is reachable as a weighted sum of two basis vectors',
      (s) => mag(sub(combResult(s), T_A)) < 0.3,
      { xp: 20, hold: 400, tag: 'linear combinations',
        focus: 'Scale a by 2 and b by 1, then add tip-to-tail. A linear combination c₁a + c₂b is always another vector.' }),
    goal('Reach target B = [0, 5] — the amount of a must go negative, to see how a negative coefficient is just as valid a weight as a positive one',
      (s) => mag(sub(combResult(s), T_B)) < 0.3 && s.c1 < 0,
      { xp: 25, hold: 400, tag: 'linear combinations',
        focus: 'B sits on the far side of a: reaching it needs c₁ = −1, c₂ = 2. Negative scalars are allowed and often necessary.' }),
    goal('Reach target C = [3, −1] — a mix of +a and −b, to see how every point has exactly one coordinate pair in a given basis',
      (s) => mag(sub(combResult(s), T_C)) < 0.3 && s.c2 < 0,
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
    goal('Tilt b so the two directions clearly span the plane (|det| > 4), to see how two independent directions can reach every point in the plane',
      (s) => Math.abs(det2(A_SP, s.b)) > 4,
      { xp: 20, tag: 'linear combinations',
        focus: 'Two non-parallel vectors reach every point: their span is all of ℝ². The lattice tiles the whole plane.' }),
    goal('Collapse the span to a line: line b up parallel with a (|det| ≈ 0, b still real), to see how losing independence between two vectors collapses their reachable space onto a single line',
      (s) => mag(s.b) > MIN_MAG && Math.abs(det2(A_SP, s.b)) < 0.2,
      { xp: 25, hold: 500, tag: 'linear combinations',
        focus: 'Parallel vectors span only a line — most of the plane becomes unreachable. Independence is what buys you the whole plane. (Shrinking b to nothing doesn’t count — it must stay real, just parallel.)' }),
    goal('Swing b out wide the other way (det < −6), to see how flipping a basis vector to the other side reverses orientation while still spanning the full plane',
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
const CT_MIN = 0.2, CT_MAX = 5;
const CV_FLATTEN_TEMP = 2;                               // must genuinely heat, not zero q
const attnW = (q, temp) => softmax(VALS.map((v) => dot(q, v) / SQRT_D), temp);
const attnOut = (q, temp) => attnW(q, temp)
  .reduce((acc, wi, i) => add(acc, scale(VALS[i], wi)), vec(0, 0));
registerScene({
  id: 'vecops.convex',
  lesson: LESSON,
  space: 'plane2',
  params: { q: vec(1.6, 1.0), temp: 1 },                  // T = 1, max weight ≈ 0.54
  controls: [slider('temp', { min: CT_MIN, max: CT_MAX, step: 0.1, label: 'temperature', format: f2 })],
  entities: (p) => {
    const w = attnW(p.q, p.temp);
    const out = attnOut(p.q, p.temp);
    return [
      grid(),
      polygon(VALS, { color: 'muted', fill: 'muted', alpha: 0.12 }),
      ...VALS.map((v, i) => point(v, { color: 'muted', label: 'v' + (i + 1), key: 'val' + i })),
      vector(p.q, { color: 'accent', label: 'query', handle: 'q' }),
      point(out, { color: 'good', label: 'output', key: 'out' }),
      bars(w, { at: vec(-5.6, -5), labels: VALS.map((_, i) => 'v' + (i + 1)), color: 'accent2' }),
      label('T = ' + f2(p.temp) + '    weights = [' + w.map(f2).join(', ') + ']    output = [' + f2(out.x) + ', ' + f2(out.y) + ']  (inside the triangle)', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Attend almost entirely to v1: push its weight above 0.85, to see how concentrating softmax weight on one value pulls the attention output onto that vertex',
      (s) => attnW(s.q, s.temp)[0] > 0.85,
      { xp: 20, tag: 'linear combinations',
        focus: 'Aim the query at v1 and cool the temperature — the softmax weight on v1 approaches 1 and the output slides onto that corner.' }),
    goal('Attend almost entirely to v3: its weight above 0.85, to see how the output is always a weighted average of the value points, never a jump outside them',
      (s) => attnW(s.q, s.temp)[2] > 0.85,
      { xp: 20, tag: 'linear combinations',
        focus: 'The output is a weighted average of the value points. Concentrate the weight and the average lands on that vertex.' }),
    goal('Blend all three so no weight tops 0.45 (query real, heat doing the work), to see how raising the temperature flattens softmax weights toward a uniform blend',
      (s) => mag(s.q) > MIN_MAG && s.temp > CV_FLATTEN_TEMP
        && Math.max(...attnW(s.q, s.temp)) < 0.45,
      { xp: 25, hold: 500, tag: 'linear combinations',
        focus: 'High temperature evens the weights — the output drifts toward the centroid but never leaves the triangle. A convex combination is always trapped inside the hull. (Zeroing the query flattens for free — it doesn’t count; the heat must do it.)' }),
  ],
  caption: 'Aim the query and set the temperature — to blend evenly, keep the query modest and raise the heat. The weights are non-negative and sum to 1, so the output is a weighted average of v1, v2, v3, always inside their triangle.',
});

/* ---- 6. DIFFERENCE: b − a is the walk from a to b -------------- */
/* Micro-idea: b − a is the arrow FROM point a TO point b; its length is the
   distance between them. This is the RESIDUAL vector that shows up
   everywhere in learning — "prediction minus target" is exactly a
   difference vector, and a learning update's whole job is to walk that
   arrow toward zero. Owns "vector addition" (subtraction = addition with
   a flipped sign). Both points move freely — no min-mag floor needed,
   since every goal targets an exact, off-baseline displacement, not a
   ratio a shrunk vector could fake. Deliberately placed as the last new
   OPERATION before the capstone — mechanically simpler than the
   convex/attention teaser it follows, closing the arc back down to plain
   arithmetic before the exam. */
registerScene({
  id: 'vecops.difference',
  lesson: LESSON,
  space: 'plane2',
  params: { a: vec(-2, -0.5), b: vec(1.5, 2) },
  entities: (p) => {
    const d = sub(p.b, p.a);
    return [
      grid(),
      point(p.a, { color: 'accent', label: 'a (prediction)', handle: 'a' }),
      point(p.b, { color: 'accent2', label: 'b (target)', handle: 'b' }),
      segment(p.a, p.b, { color: 'good', width: 3, label: 'b−a', key: 'diffseg' }),
      vector(d, { color: 'muted', width: 2, key: 'diffghost' }),         // same arrow, from the origin
      label('b − a = [' + f2(d.x) + ', ' + f2(d.y) + ']    ‖b−a‖ = ' + f2(mag(d)) + '  — the residual a learning update would chase to zero', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Set the walk from a to b to exactly [2, 2] — the residual a gradient step would climb down',
      (s) => mag(sub(sub(s.b, s.a), vec(2, 2))) < 0.2,
      { xp: 20, hold: 400, tag: 'vector addition',
        focus: 'b − a is component-wise subtraction, same math as addition with a flipped sign. This IS the "error vector" — prediction minus target — that a learning update tries to shrink to zero.' }),
    goal('Aim the residual straight up: b−a has x ≈ 0 and length ≥ 1.5, to see how reading a residual componentwise tells you exactly which coordinate still needs correcting',
      (s) => Math.abs(sub(s.b, s.a).x) < 0.15 && sub(s.b, s.a).y >= 1.5,
      { xp: 20, hold: 400, tag: 'vector addition',
        focus: 'A purely-vertical residual means only ONE coordinate is off — reading a residual componentwise like this is the diagnostic step: it tells you WHICH coordinate still needs correcting, not just by how much overall.' }),
    goal('Build a 3-4-5 walk: make the distance ‖b−a‖ exactly 5, to see how the distance between two points is just the length of their residual vector',
      (s) => Math.abs(mag(sub(s.b, s.a)) - 5) < 0.2,
      { xp: 25, hold: 400, tag: 'vector addition',
        focus: 'Distance between two points is the LENGTH of their difference vector — the same magnitude idea from la-vectors, now measuring how far a prediction sits from its target.' }),
  ],
  caption: 'Drag a and b. The solid arrow b−a is the walk from a to b — exactly the "error" vector a learning update shrinks toward zero. Its length is the distance between the points.',
});

/* ---- 7. CAPSTONE: randomized scalar / addition / combination -- */
/* THE EXAM. A rotated ORTHOGONAL basis {a,b} is drawn per attempt; the two
   scalar `slider`s (retrofitted from the original track-point fallback —
   same range, same reset-to-0, same targets) reset to 0, so no target — a
   scalar target, the unit-scalar sum a+b, or a random target point — is ever
   pre-satisfied for any seed (proven ×1000). Three targets carry the
   migrated weak-area tags. No hints. */
const CAP_KMIN = -2.6, CAP_KMAX = 2.6;
const capResult = (s) => lincomb(s.c1, s.a, s.c2, s.b);
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
    c1: 0, c2: 0,                                         // controls reset to 0
  };
}
registerScene({
  id: 'vecops.capstone',
  lesson: LESSON,
  capstone: true,
  randomize,                                             // official reroll seam (v1.1 §1/§8)
  space: 'plane2',
  params: randomize(makeRng(1)),                         // seed-1 draw (plain object)
  controls: [
    slider('c1', { min: CAP_KMIN, max: CAP_KMAX, step: 0.05, label: 'c₁', format: f2 }),
    slider('c2', { min: CAP_KMIN, max: CAP_KMAX, step: 0.05, label: 'c₂', format: f2 }),
  ],
  entities: (p) => {
    const ca = scale(p.a, p.c1), r = lincomb(p.c1, p.a, p.c2, p.b);
    return [
      grid(),
      vector(p.a, { color: 'muted', label: 'a' }),        // the given basis — not draggable
      vector(p.b, { color: 'muted', label: 'b' }),
      point(p.T, { color: 'warn', label: '★', r: 6 }),
      vector(ca, { color: 'accent', label: 'c₁a' }),
      vector(scale(p.b, p.c2), { from: ca, color: 'accent2', label: 'c₂b', key: 'c2g' }),
      vector(r, { color: 'good', label: 'c₁a+c₂b' }),
      label('targets:  c₁ = ' + f2(p.sTarget) + '    ★ = [' + f2(p.T.x) + ', ' + f2(p.T.y) + ']    now  c₁ = ' + f2(p.c1) + '  c₂ = ' + f2(p.c2), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Set the amount of a to the marked scalar: c₁ = target (±0.15) and hold, to see how a scalar coefficient alone controls how much of a basis vector enters a combination',
      (s) => Math.abs(s.c1 - s.sTarget) < 0.15,
      { xp: 40, hold: 700, tag: 'scalar multiplication',
        focus: 'A scalar just stretches or flips a: |c| is the length, the sign is the direction. Dial c₁ to the marked amount.' }),
    goal('Plain addition: set both scalars to 1 so the result is exactly a + b, and hold, to see how unit coefficients reduce a linear combination to ordinary vector addition',
      (s) => Math.abs(s.c1 - 1) < 0.12 && Math.abs(s.c2 - 1) < 0.12,
      { xp: 40, hold: 700, tag: 'vector addition',
        focus: 'c₁ = c₂ = 1 is nothing but a + b — a linear combination with unit scalars is ordinary tip-to-tail addition.' }),
    goal('Reach the ★ target with the right mix: c₁a + c₂b within 0.3 of ★, and hold, to see how solving for the right coefficients is how any target point gets expressed in a basis',
      (s) => mag(sub(capResult(s), s.T)) < 0.3,
      { xp: 40, hold: 700, tag: 'linear combinations',
        focus: 'Every point has one coordinate pair in the basis {a, b}. Solve for the c₁, c₂ that land the combination on the star.' }),
  ],
  caption: 'No hints now. Hit each target — a scalar amount, the plain sum a + b, and the star point — by tuning c₁ and c₂, and hold steady. This is the exam.',
});
