/* ================================================================
   FLAGSHIP SCENE LESSON — la-dot (Dot Product & Similarity).
   ----------------------------------------------------------------
   The P0 reference implementation of the Scene Kit (VISUAL_FIRST §7),
   built STRICTLY against the frozen CONTRACT.md v1. Converts the old
   one-lab / three-quiz la-dot into SEVEN scenes ending in a
   randomized capstone that IS the exam.

   Scenes are DATA + PURE PREDICATES. Zero renderer imports: geometry
   comes from the kit (lib/scene), lesson math from ./vec-math.js. The
   old INTERACTIVES.dot lab in curriculum/index.js is left untouched
   until the architect approves the swap; these register into the
   separate SCENES registry and are exercised by tests today.

   ARC (VISUAL_FIRST §2 — 6–10 scenes, 2–5 goals each):
     1 dot.anatomy         projection drop-lines: a·b is a shadow
     2 dot.alignment       b sweeps a circle around a; cos anchors
     3 dot.threegoals      orthogonal / aligned / opposed, held
     4 dot.scaleinvariance stretch a along its ray: a·b moves, cos won't
     5 dot.search          rank documents by cosine (semantic search)
     6 dot.attention       dots → softmax weights, with a temperature knob
     7 dot.capstone        randomized targets, tolerance + hold, NO hints

   WEAK-AREA TAG MIGRATION (VISUAL_FIRST §8 — keep the spaced-review
   loop alive as quizzes retire). The old quiz's three q.tag/q.focus
   pairs move onto the capstone goals:
     quiz "dot product arithmetic" → capstone goal 1 (hit a·b target)
     quiz "cosine similarity"      → capstone goal 2 (hit cos θ target)
     quiz "sign vs angle"          → capstone goal 3 (hit an angle target)
   Mid-lesson scenes carry these tags too (plus one finer-grained
   'dot product geometry' tag on the anatomy scene — tags are
   free-form; only the capstone must carry exactly the migrated
   three) so a review stumble is attributable to the scene that
   teaches the concept.

   CAPSTONE RANDOMIZATION (CONTRACT v1.1 §1/§8): the capstone spec
   carries `capstone:true` and the official reroll seam
   `randomize(rng) -> params patch`. The runtime rerolls each fresh
   attempt via `controller.newAttempt(seed)`, which calls
   `randomize(makeRng(seed))` and writes the patch through the atoms.
   `params` is the seed-1 draw (a plain object, per CONTRACT §1) and
   contains every key `randomize` returns, so all atoms exist for the
   patch to write through.
   ================================================================ */
import {
  registerScene, vec, makeRng, handle,
  grid, vector, point, segment, dropLine, angleArc, label, bars, curve,
  goal,
} from '../../scene/index.js';
import {
  dot, cos, mag, angleDeg, proj, projVec, scale, norm, softmax, mapRange,
  rayConstraint, circleConstraint, trackConstraint, minMagConstraint,
} from './vec-math.js';

const LESSON = 'la-dot';
const ORIGIN = vec(0, 0);
const round1 = (x) => Math.round(x * 10) / 10;
const f2 = (x) => x.toFixed(2);
const f3 = (x) => x.toFixed(3);
const deg0 = (a, b) => angleDeg(a, b).toFixed(0);

// Anti-gaming floor (review-confirmed defect): a draggable vector's tip is
// clamped to stay at least this far from the origin, AND any goal predicate
// that divides by a vector's magnitude (cos/proj) additionally re-checks
// mag(...) > MIN_MAG on every vector it reads — defense in both layers, so
// neither a pointer-drag exploit nor a directly-injected degenerate snapshot
// can credit a goal by shrinking a vector instead of changing its angle.
const MIN_MAG = 0.5;
const onMinMag = minMagConstraint(MIN_MAG);

/* ---- 1. ANATOMY: the dot product is a shadow ------------------- */
/* Micro-idea: a·b = (length of a's shadow on b) × ‖b‖. The scalar
   projection is that shadow; its sign is the sign of a·b — the whole
   lesson previewed in one picture. */
registerScene({
  id: 'dot.anatomy',
  lesson: LESSON,
  space: 'plane2',
  params: { a: vec(2.6, 0.6), b: vec(1.4, 2.4) },
  entities: (p) => {
    const foot = projVec(p.a, p.b);      // shadow's endpoint on b's line
    return [
      grid(),
      vector(p.b, { color: 'accent2', label: 'b', handle: handle('b', { constrain: onMinMag }) }),
      segment(ORIGIN, foot, { color: 'warn', width: 5, label: 'shadow' }),
      dropLine(p.a, { to: foot, color: 'warn' }),
      vector(p.a, { color: 'accent', label: 'a', handle: handle('a', { constrain: onMinMag }) }),
      label('a·b = ' + f2(dot(p.a, p.b)) + '    shadow = ' + f2(proj(p.a, p.b)), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Stretch a until its shadow reaches past the tip of b',
      (s) => proj(s.a, s.b) > mag(s.b),
      { xp: 20, tag: 'dot product geometry',
        focus: 'a·b is the shadow length times ‖b‖ — a longer, better-aligned a casts a longer shadow.' }),
    goal('Fold a down so its shadow shrinks to nothing (a ⟂ b)',
      (s) => mag(s.a) > MIN_MAG && mag(s.b) > MIN_MAG && Math.abs(proj(s.a, s.b)) < 0.1,
      { xp: 20, hold: 400, tag: 'dot product geometry',
        focus: 'Zero shadow means a·b = 0 — perpendicular. Watch the drop-line collapse to the origin. (Shrinking a to nothing doesn’t count — both arrows must stay real vectors; it’s the ANGLE that must reach 90°.)' }),
    goal('Swing a the other way so its shadow points against b (negative)',
      (s) => proj(s.a, s.b) < -0.1,
      { xp: 20, tag: 'sign vs angle',
        focus: 'A backward shadow is a negative dot product — the angle has opened past 90°.' }),
  ],
  caption: 'Drag the arrows. The amber shadow is a projected onto b, and a·b is that shadow’s length times ‖b‖.',
});

/* ---- 2. ALIGNMENT: sweep b around a, find the cos anchors ------ */
/* b is pinned to a circle (length locked) so ONLY the angle varies —
   isolating the idea that alignment is about direction. The motion
   layer can auto-sweep b via driver.addSource; the learner can also
   drag it around the circle. Goals land on the three cos anchors. */
const A2 = vec(2.4, 0.8);                       // fixed reference vector a
const R2 = mag(A2);                             // b sweeps at a's length
const onCircle2 = circleConstraint(R2);         // stable closure (diff-friendly)
const b2Start = (() => {                         // start ~60° off a: no anchor met
  const th = Math.atan2(A2.y, A2.x) + Math.PI / 3;
  return vec(round1(R2 * Math.cos(th)), round1(R2 * Math.sin(th)));
})();
// INSET GAUGE (P2 wave C, Amendment v1.7 §2 — the original inset demand,
// flagship-content.md:40): trace cos θ against θ in a small corner plot while
// b sweeps. θ = acos(cos(a,b)) in [0,π] (unsigned — cos is even in θ, so this
// still shows the full +1→0→−1 sweep as |θ| grows); mapped to inset x in
// [-1,1] so the reference curve and the live trace share one coordinate. This
// is READ-ONLY: no handle in the inset, purely a param-driven visual — the
// draggable b handle stays in the main space exactly as before. Semantics-
// preserving: params/goals/predicates/tags/caption below are BYTE-IDENTICAL
// to the pre-inset scene; only the inset declaration + two inset entities
// are new.
const angleToInsetX = (thRad) => mapRange(thRad, 0, Math.PI, -1, 1);
const insetXToAngle = (x) => mapRange(x, -1, 1, 0, Math.PI);
registerScene({
  id: 'dot.alignment',
  lesson: LESSON,
  space: 'plane2',
  params: { b: b2Start },
  inset: { rect: [0.62, 0.05, 0.33, 0.33], extent: 1.2 },
  entities: (p) => [
    grid(),
    vector(A2, { color: 'accent', label: 'a' }),
    vector(p.b, { color: 'accent2', label: 'b', handle: handle('b', { constrain: onCircle2 }) }),
    angleArc(A2, p.b, { color: 'warn', label: deg0(A2, p.b) + '°' }),
    label('cos θ = ' + f3(cos(A2, p.b)) + '   (b’s length is locked)', { at: 'readout' }),
    // gauge: the theoretical cos(θ) reference curve, plus a live trace dot.
    curve((x) => Math.cos(insetXToAngle(x)), { domain: [-1, 1], frame: 'inset', color: 'muted' }),
    point(vec(angleToInsetX(Math.acos(cos(A2, p.b))), cos(A2, p.b)), { frame: 'inset', color: 'good', key: 'trace' }),
    label('cos θ vs θ', { at: vec(-0.95, 1.05), frame: 'inset', color: 'muted' }),
  ],
  goals: [
    goal('Sweep b until it aligns with a (cos θ > 0.98)',
      (s) => cos(A2, s.b) > 0.98,
      { xp: 20, tag: 'cosine similarity',
        focus: 'cos = +1 is the "same direction" anchor — the arrows overlap.' }),
    goal('Park b square to a (cos θ ≈ 0)',
      (s) => Math.abs(cos(A2, s.b)) < 0.03,
      { xp: 20, hold: 400, tag: 'cosine similarity',
        focus: 'cos = 0 is the "unrelated" anchor — the arrows meet at a right angle.' }),
    goal('Sweep b to point directly against a (cos θ < −0.98)',
      (s) => cos(A2, s.b) < -0.98,
      { xp: 20, tag: 'cosine similarity',
        focus: 'cos = −1 is the "opposite" anchor — b points 180° from a. Length never entered any of this.' }),
  ],
  caption: 'Sweep b around the circle — its length is locked, so only the angle changes. Find where cos θ hits +1, 0, and −1.',
});

/* ---- 3. THREE GOALS: orthogonal / aligned / opposed ----------- */
/* The direct upgrade of the old lab’s three missions — now with an
   angle arc, a live readout, and hold-time so a drive-by drag doesn’t
   count. Both tips move freely. Owns the "sign vs angle" concept. */
registerScene({
  id: 'dot.threegoals',
  lesson: LESSON,
  space: 'plane2',
  params: { a: vec(2.5, 1), b: vec(1, 2.5) },     // old-lab defaults; cos ≈ 0.69
  entities: (p) => [
    grid(),
    angleArc(p.a, p.b, { color: 'warn', label: deg0(p.a, p.b) + '°' }),
    vector(p.a, { color: 'accent', label: 'a', handle: handle('a', { constrain: onMinMag }) }),
    vector(p.b, { color: 'accent2', label: 'b', handle: handle('b', { constrain: onMinMag }) }),
    label('a·b = ' + f2(dot(p.a, p.b)) + '    cos θ = ' + f3(cos(p.a, p.b)), { at: 'readout' }),
  ],
  goals: [
    goal('Make the vectors orthogonal (cos θ ≈ 0)',
      (s) => mag(s.a) > MIN_MAG && mag(s.b) > MIN_MAG && Math.abs(cos(s.a, s.b)) < 0.04,
      { xp: 20, hold: 500, tag: 'sign vs angle',
        focus: 'Positive dot ⇔ angle < 90°, zero ⇔ exactly 90°, negative ⇔ obtuse. Zero is the boundary. (A zeroed-out arrow has no angle — both must stay real vectors.)' }),
    goal('Make them nearly identical in direction (cos θ > 0.97)',
      (s) => cos(s.a, s.b) > 0.97,
      { xp: 20, hold: 500, tag: 'sign vs angle',
        focus: 'A large positive dot product means a small angle — the arrows point the same way.' }),
    goal('Make them oppose each other (cos θ < −0.9)',
      (s) => cos(s.a, s.b) < -0.9,
      { xp: 20, hold: 500, tag: 'sign vs angle',
        focus: 'A negative dot product means an obtuse angle — the arrows point against each other.' }),
  ],
  caption: 'Drag both tips. The dot product’s sign is the angle’s tell: positive under 90°, zero at 90°, negative beyond.',
});

/* ---- 4. SCALE INVARIANCE: length moves a·b, not cos θ ---------- */
/* a’s handle is constrained to its own ray, so dragging it changes
   only its LENGTH. The learner discovers: scaling swings a·b freely
   but never moves cos θ, and no stretch can flip the sign — only
   turning b past 90° does. Angle and magnitude are independent. */
const A4_DIR = vec(2.0, 1.0);                    // a’s locked direction
const onRay4 = rayConstraint(A4_DIR);            // stable closure
const A4_LINE_A = scale(norm(A4_DIR), -8);       // fixed dashed guide line…
const A4_LINE_B = scale(norm(A4_DIR), 8);        // …independent of a’s length
registerScene({
  id: 'dot.scaleinvariance',
  lesson: LESSON,
  space: 'plane2',
  params: { a: vec(2.0, 1.0), b: vec(1.2, 2.0) },  // dot ≈ 4.4, cos ≈ 0.843
  entities: (p) => [
    grid(),
    segment(A4_LINE_A, A4_LINE_B, { color: 'muted', dashed: true }),
    vector(p.a, { color: 'accent', label: 'a', handle: handle('a', { constrain: onRay4 }) }),
    vector(p.b, { color: 'accent2', label: 'b', handle: 'b' }),
    label('a·b = ' + f2(dot(p.a, p.b)) + '    cos θ = ' + f3(cos(p.a, p.b)) + '   (cos is locked to the angle)', { at: 'readout' }),
  ],
  goals: [
    goal('Lengthen a until a·b > 8 while staying aligned (cos θ > 0.8)',
      (s) => dot(s.a, s.b) > 8 && cos(s.a, s.b) > 0.8,
      { xp: 20, tag: 'dot product arithmetic',
        focus: 'At a fixed angle, a·b scales with length. Slide a outward and the number climbs — cos does not.' }),
    goal('Flip the sign: make a·b < 0 (stretching can’t — turn b past 90°)',
      (s) => dot(s.a, s.b) < 0,
      { xp: 20, tag: 'sign vs angle',
        focus: 'Length never changes a sign. Only rotating past a right angle makes the dot product negative.' }),
    goal('Strongly aligned yet small: cos θ > 0.9 AND a·b < 1.5',
      (s) => cos(s.a, s.b) > 0.9 && dot(s.a, s.b) < 1.5,
      { xp: 25, tag: 'cosine similarity',
        focus: 'High cosine with a tiny dot product proves they’re independent: cosine ignores length entirely.' }),
  ],
  caption: 'Slide a along its dashed line — only its length changes. a·b moves; cos θ won’t budge. To flip the sign you must turn b.',
});

/* ---- 5. SEARCH: rank documents by cosine ---------------------- */
/* Semantic-search framing: one query, four fixed document vectors,
   ranked by cosine. Rotating the query re-ranks the bars — exactly
   what retrieval does. */
const DOCS = [vec(2.5, 0.4), vec(0.6, 2.6), vec(-1.8, 1.4), vec(1.2, -2.2)];
const simRank = (q) => DOCS.map((d, i) => ({ i, c: cos(q, d) })).sort((x, y) => y.c - x.c);
const argmaxDoc = (q) => simRank(q)[0].i;
const argminDoc = (q) => simRank(q)[DOCS.length - 1].i;
const topTwo = (q) => new Set(simRank(q).slice(0, 2).map((r) => r.i));
registerScene({
  id: 'dot.search',
  lesson: LESSON,
  space: 'plane2',
  params: { q: vec(2.2, 1.6) },     // baseline ranks d1>d2>d4>d3 — none of the goals
  entities: (p) => {
    const ranked = simRank(p.q);
    return [
      grid(),
      ...DOCS.map((d, i) => vector(d, { color: 'muted', label: 'd' + (i + 1), key: 'doc' + i })),
      vector(p.q, { color: 'accent', label: 'query', handle: 'q' }),
      bars(ranked.map((r) => r.c), {
        at: vec(-5.6, -5), labels: ranked.map((r) => 'd' + (r.i + 1)), color: 'accent2',
      }),
      label('top match: d' + (argmaxDoc(p.q) + 1) + '   (cos = ' + f3(ranked[0].c) + ')', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Aim the query so document 2 is the top match',
      (s) => argmaxDoc(s.q) === 1,
      { xp: 20, tag: 'cosine similarity',
        focus: 'Retrieval returns the highest-cosine document. Point the query toward d2’s direction.' }),
    goal('Find a query where d2 and d3 are the top two',
      (s) => { const t = topTwo(s.q); return t.has(1) && t.has(2); },
      { xp: 25, tag: 'cosine similarity',
        focus: 'Top-k is the k nearest directions. Aim between d2 and d3 so both outrank the others.' }),
    goal('Make d4 the least similar while keeping d1 positive',
      (s) => argminDoc(s.q) === 3 && cos(s.q, DOCS[0]) > 0,
      { xp: 20, tag: 'sign vs angle',
        focus: 'Least similar = most negative cosine (angle past 90°). Turn away from d4 without leaving d1 behind.' }),
  ],
  caption: 'Rotate the query. The bars rank each document by cosine — turning the query is how semantic search finds the closest match.',
});

/* ---- 6. ATTENTION: dots → softmax weights, with temperature ---- */
/* The transformer teaser. Each key’s scaled dot product with the
   query becomes an attention weight via softmax; a temperature knob
   sharpens or flattens the distribution. Scaled dot = (q·k)/√d,
   echoing Q·Kᵀ/√d from the lesson’s ML box. Temperature is a point
   dragged along a vertical track — v1 has no scalar slider control
   (requested; see Handoffs). */
const KEYS = [vec(2.2, 0.5), vec(0.4, 2.3), vec(-2.0, 0.8), vec(0.7, -2.1)];
const SQRT_D = Math.sqrt(2);
const TK_X = 5.2, TK_LO = -4, TK_HI = 4, T_MIN = 0.2, T_MAX = 5;
const onTrack6 = trackConstraint(TK_X, TK_LO, TK_HI);
const tempOf = (y) => mapRange(y, TK_LO, TK_HI, T_MIN, T_MAX);
const yForTemp = (t) => mapRange(t, T_MIN, T_MAX, TK_LO, TK_HI);
// Flatten-goal floor: temperature must be raised meaningfully above the T=1
// baseline (double it) — the goal is to credit RAISING the temperature, not
// merely landing under the weight threshold by any means.
const FLATTEN_TEMP_MIN = 2;
const attn = (q, temp) => softmax(KEYS.map((k) => dot(q, k) / SQRT_D), temp);
registerScene({
  id: 'dot.attention',
  lesson: LESSON,
  space: 'plane2',
  params: { q: vec(1.8, 1.2), tk: vec(TK_X, yForTemp(1)) },   // T = 1, max weight ≈ 0.67
  entities: (p) => {
    const temp = tempOf(p.tk.y);
    const w = attn(p.q, temp);
    return [
      grid(),
      segment(vec(TK_X, TK_LO), vec(TK_X, TK_HI), { color: 'muted', label: 'temperature' }),
      ...KEYS.map((k, i) => vector(k, { color: 'muted', label: 'k' + (i + 1), key: 'key' + i })),
      vector(p.q, { color: 'accent', label: 'query', handle: 'q' }),
      point(p.tk, { color: 'warn', label: 'T = ' + f2(temp), handle: handle('tk', { constrain: onTrack6 }) }),
      bars(w, { at: vec(-5.6, -5), labels: KEYS.map((_, i) => 'k' + (i + 1)), color: 'accent2' }),
      label('max weight = ' + f2(Math.max(...w)) + '    T = ' + f2(temp), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Concentrate attention: push one key above 0.8',
      (s) => Math.max(...attn(s.q, tempOf(s.tk.y))) > 0.8,
      { xp: 20, tag: 'dot product arithmetic',
        focus: 'Align the query with one key and/or cool the temperature — both sharpen the softmax.' }),
    goal('Flatten attention: raise the temperature until every key sits under 0.4',
      (s) => {
        const temp = tempOf(s.tk.y);
        return mag(s.q) > MIN_MAG && temp > FLATTEN_TEMP_MIN
          && Math.max(...attn(s.q, temp)) < 0.4;
      },
      { xp: 20, hold: 500, tag: 'cosine similarity',
        focus: 'A high temperature washes out the differences between dot products — attention spreads evenly. (Zeroing the query doesn’t count: that flattens the weights for free without touching temperature at all — the query has to stay real, and the flattening has to come from heat.)' }),
    goal('Focus on key 3 specifically: its weight above 0.9',
      (s) => attn(s.q, tempOf(s.tk.y))[2] > 0.9,
      { xp: 25, tag: 'dot product arithmetic',
        focus: 'Point the query at k3 and cool the temperature so its dot product dominates the softmax.' }),
  ],
  caption: 'Each key’s dot product with the query becomes an attention weight via softmax. Cool the temperature to sharpen the focus onto one key.',
});

/* ---- 7. CAPSTONE: randomized targets, tolerance + hold, no hints */
/* THE EXAM. A random reference a is drawn per attempt; b starts
   exactly perpendicular to a, so cos = 0 / a·b = 0 / θ = 90° — which
   guarantees NO target is pre-satisfied for ANY seed (targets are all
   nonzero, off 90°). Three targets — a dot product, a cosine, an
   angle — gated by tolerance + hold-time, no hints. The goals carry
   the migrated weak-area tags so spaced review survives the quiz. */
// The official reroll seam (CONTRACT v1.1 §1): receives rng() in [0,1)
// from the kit (controller.newAttempt(seed) passes makeRng(seed)) and
// returns a params patch applied through the atoms.
function randomize(rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const ang = rng() * Math.PI * 2;
  const len = 1.6 + rng() * 1.4;                          // ‖a‖ in [1.6, 3.0]
  const a = vec(round1(len * Math.cos(ang)), round1(len * Math.sin(ang)));
  const b = scale(norm(vec(-a.y, a.x)), 1.0);             // unit, perpendicular to a
  return {
    a, b,
    dotTarget: pick([3, 4, 5, -3, -4, -5]),               // "dot product arithmetic"
    cosTarget: pick([-0.8, -0.5, 0.5, 0.8]),              // "cosine similarity"
    angTarget: pick([40, 60, 120, 140]),                  // "sign vs angle"
  };
}
registerScene({
  id: 'dot.capstone',
  lesson: LESSON,
  capstone: true,
  randomize,                                              // official reroll seam (v1.1 §1/§8)
  space: 'plane2',
  params: randomize(makeRng(1)),                          // seed-1 draw (plain object)
  entities: (p) => [
    grid(),
    angleArc(p.a, p.b, { color: 'warn', label: deg0(p.a, p.b) + '°' }),
    vector(p.a, { color: 'accent', label: 'a' }),          // the given — not draggable
    vector(p.b, { color: 'accent2', label: 'b', handle: 'b' }),
    label('a·b = ' + f2(dot(p.a, p.b)) + '    cos θ = ' + f3(cos(p.a, p.b)) + '    θ = ' + deg0(p.a, p.b) + '°', { at: 'readout' }),
  ],
  goals: [
    goal('Hit the dot-product target a·b = T (±0.4) and hold',
      (s) => Math.abs(dot(s.a, s.b) - s.dotTarget) < 0.4,
      { xp: 40, hold: 700, tag: 'dot product arithmetic',
        focus: 'Balance length and angle: a·b = ‖a‖‖b‖cos θ. Both knobs move the number.' }),
    goal('Hit the cosine target cos θ = C (±0.03) and hold',
      (s) => Math.abs(cos(s.a, s.b) - s.cosTarget) < 0.03,
      { xp: 40, hold: 700, tag: 'cosine similarity',
        focus: 'Cosine cares only about the angle. Turn b until the readout matches; ignore its length.' }),
    goal('Hit the angle target θ = A° (±5°) and hold',
      (s) => Math.abs(angleDeg(s.a, s.b) - s.angTarget) < 5,
      { xp: 40, hold: 700, tag: 'sign vs angle',
        focus: 'Angle fixes the sign: under 90° positive, over 90° negative. Land inside the tolerance and steady it.' }),
  ],
  caption: 'No hints now. Hit each target — a set dot product, a cosine, and an angle — and hold steady. This is the exam.',
});
