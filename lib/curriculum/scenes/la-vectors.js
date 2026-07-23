/* ================================================================
   SCENE LESSON — la-vectors (Vectors: Arrows & Data).
   ----------------------------------------------------------------
   P2 wave C migration. Converts the intro lesson of the LA world into
   SEVEN scenes ending in a randomized capstone, following
   docs/AUTHORING_SCENES.md and the la-matrix/la-eigen pattern.

   This is the learner's FIRST scene lesson — the gentlest on-ramp in the
   curriculum. No prior scene experience assumed: scene 1 starts at the
   very anatomy of an arrow (components + magnitude) before anything else.

   THE ONE IDEA: a vector is ONE object read two ways — an arrow (length +
   direction) and a list of numbers (components). Every later idea
   (magnitude, unit vectors, polar form, high dimensions, vectors-as-data)
   is a different lens on that same pair of numbers.

   Scenes are DATA + PURE PREDICATES. Zero renderer imports. This wave is
   ADDITIVE — the lesson keeps its `labs`; the arc is added as
   `scenes:[...]` (mirrors la-matrix/la-matmul/la-det/la-eigen).

   ARC (anatomy → components → unit → polar → dims → data → capstone):
     1 vectors.anatomy     drag the tip; magnitude is Pythagoras
     2 vectors.components  a vector IS its two numbers — hit exact points
     3 vectors.unit        normalize: shrink/stretch onto the unit circle
     4 vectors.polar       r/θ sliders drive the SAME components
     5 vectors.dims        the magnitude rule generalizes past 2-D
     6 vectors.data        vectors as DATA — nearest-neighbor search
     7 vectors.capstone    randomized target, no hints

   WEAK-AREA TAG MIGRATION — the old quiz's three q.tag/q.focus pairs land
   on the capstone goals:
     quiz "magnitude"       → capstone goal 1 (hit the target point)
     quiz "unit vectors"    → capstone goal 2 (hit the unit-circle target)
     quiz "high dimensions" → capstone goal 3 (extend to 3 numbers)
   Mid-lesson scenes carry these three tags on the concept they drill
   ('magnitude' is the biggest bucket — it's also the biggest bucket in
   the retiring quiz, two of its three questions).

   CAPSTONE BASELINE-SAFETY (CONTRACT v1.1 §1/§8): the reset vector is
   v=[1.6,0] (magnitude 1.6, not 1) and k=0. Every goal's satisfying
   target sits a magnitude-gap away from the reset BY CONSTRUCTION — see
   the comment on `randomize` below — so no goal can ever be pre-satisfied
   at reset, for any seed, independent of the randomized angle.
   ================================================================ */
import {
  registerScene, vec, makeRng, slider,
  grid, vector, point, polygon, label, dropLine, bars,
  goal,
} from '../../scene/index.js';
import { mag, sub, rot } from './vec-math.js';

const LESSON = 'la-vectors';
const f2 = (x) => x.toFixed(2);
const deg = (rad) => Math.round((rad * 180) / Math.PI);

// A fixed reference unit circle (static geometry, module scope so the array
// reference is stable frame-to-frame — no handle, purely decorative).
const UNIT_CIRCLE = Array.from({ length: 48 }, (_, i) => {
  const a = (i / 48) * 2 * Math.PI;
  return { x: Math.cos(a), y: Math.sin(a) };
});

/* ---- 1. ANATOMY: drag the tip; magnitude is Pythagoras --------- */
/* Micro-idea: a vector is one arrow with two readings — its components
   [x,y] and its length ‖v‖ = √(x²+y²). The two targets are the retiring
   quiz's own Pythagorean triples (5 from 3-4-5, 13 from 5-12-13) so the
   arc directly rehearses what used to be multiple-choice. Owns
   "magnitude". */
registerScene({
  id: 'vectors.anatomy',
  lesson: LESSON,
  space: 'plane2',
  params: { v: vec(2, -1) },                                // ‖v‖ = √5 ≈ 2.24
  entities: (p) => [
    grid(),
    dropLine(p.v, { to: 'axes' }),
    vector(p.v, { color: 'accent', label: 'v', handle: 'v' }),
    label('v = [' + f2(p.v.x) + ', ' + f2(p.v.y) + ']    ‖v‖ = ' + f2(mag(p.v)), { at: 'readout' }),
  ],
  goals: [
    goal('Stretch v out to length 5 — a 3-4-5 right triangle, any direction, to see how magnitude is just Pythagoras applied to a vector’s components',
      (s) => Math.abs(mag(s.v) - 5) < 0.3,
      { xp: 15, tag: 'magnitude',
        focus: '‖v‖ = √(x²+y²) is just Pythagoras. [3,4], [4,3], and every rotation of them give length 5 — the classic 3-4-5 triangle.' }),
    goal('Now reach length 13 — the 5-12-13 triangle — with a NEGATIVE x-component, to see how magnitude ignores sign entirely',
      (s) => Math.abs(mag(s.v) - 13) < 0.4 && s.v.x < 0,
      { xp: 20, hold: 400, tag: 'magnitude',
        focus: '[−5,12] and [−12,5] both give length 13. Magnitude never cares about sign — only the squared components, which are always positive.' }),
  ],
  caption: 'Drag the tip to see how the two components combine into the length ‖v‖ — the same Pythagorean sum used to measure the size of a feature vector.',
});

/* ---- 2. COMPONENTS: a vector IS its two numbers ---------------- */
/* Micro-idea: hitting an exact point needs BOTH coordinates right, not
   just a length — the natural next step after "magnitude ignores sign".
   Both targets sit inside the same grid box the learner can already
   reach. Owns "magnitude" (component precision underlies the formula). */
const T2_A = vec(4, -3), T2_B = vec(-3, 4);
registerScene({
  id: 'vectors.components',
  lesson: LESSON,
  space: 'plane2',
  params: { v: vec(1, 1) },
  entities: (p) => [
    grid(),
    dropLine(p.v, { to: 'axes' }),
    point(T2_A, { color: 'warn', label: '★₁', r: 6, key: 't1' }),
    point(T2_B, { color: 'warn', label: '★₂', r: 6, key: 't2' }),
    vector(p.v, { color: 'accent', label: 'v', handle: 'v' }),
    label('v = [' + f2(p.v.x) + ', ' + f2(p.v.y) + ']', { at: 'readout' }),
  ],
  goals: [
    goal('Place the tip exactly on the first target ★₁ = [4, −3], to see how a vector’s identity comes from both numbers together, not length alone',
      (s) => mag(sub(s.v, T2_A)) < 0.35,
      { xp: 20, tag: 'magnitude',
        focus: 'A vector is nothing more than its list of numbers — match BOTH coordinates, not just the overall length.' }),
    goal('Now hit the second target ★₂ = [−3, 4] — a different quadrant, both signs flipped, to see how two vectors can share a magnitude yet be completely different points',
      (s) => mag(sub(s.v, T2_B)) < 0.35,
      { xp: 20, hold: 400, tag: 'magnitude',
        focus: 'Same length as ★₁ (both are length 5), completely different point — the two numbers, not the length alone, define WHERE it is.' }),
  ],
  caption: 'The two dashed drop-lines are the components read straight off the axes, to see how a vector’s numbers — not just its length — pin down exactly where it points. Land the tip on each star by matching both exactly.',
});

/* ---- 3. UNIT: normalize onto the unit circle ------------------- */
/* Micro-idea: a unit vector is any arrow of length exactly 1 — pure
   direction, no size. The faint circle is every unit vector, one per
   angle. Owns "unit vectors". */
registerScene({
  id: 'vectors.unit',
  lesson: LESSON,
  space: 'plane2',
  params: { v: vec(2, 1.5) },                                // ‖v‖ = 2.5
  entities: (p) => [
    grid(),
    polygon(UNIT_CIRCLE, { color: 'muted', fill: false, key: 'circle' }),
    vector(p.v, { color: 'accent', label: 'v', handle: 'v' }),
    label('v = [' + f2(p.v.x) + ', ' + f2(p.v.y) + ']    ‖v‖ = ' + f2(mag(p.v)), { at: 'readout' }),
  ],
  goals: [
    goal('Shrink or stretch v to length exactly 1 — landing it on the circle, to see how normalizing strips away magnitude and keeps pure direction',
      (s) => Math.abs(mag(s.v) - 1) < 0.08,
      { xp: 20, hold: 400, tag: 'unit vectors',
        focus: 'A unit vector has ‖v‖ = 1 — pure direction, no size. Divide any vector by its own length to build one: v/‖v‖.' }),
    goal('Now find a DIFFERENT point on the circle, with a negative x-coordinate, to see how every direction has its own unit vector',
      (s) => Math.abs(mag(s.v) - 1) < 0.08 && s.v.x < 0,
      { xp: 20, hold: 400, tag: 'unit vectors',
        focus: 'Every direction has its own unit vector — the circle is the set of ALL of them, one per angle, not just one special point.' }),
  ],
  caption: 'The faint ring is the unit circle — every vector of length 1 — to see how normalizing strips away magnitude and keeps pure direction, the same hygiene step behind comparing embeddings. Drag v onto it, then find a second point in a different direction.',
});

/* ---- 4. POLAR: r/θ sliders drive the SAME components ----------- */
/* Micro-idea: components aren't the only description — length r and
   angle θ pin down the exact same point via v = [r cosθ, r sinθ]
   (`rot(vec(r,0), theta)`). Setting r = 1 directly builds a unit vector,
   no division needed — the same idea as scene 3, from a different knob.
   Owns "magnitude" (g1) and "unit vectors" (g2). */
registerScene({
  id: 'vectors.polar',
  lesson: LESSON,
  space: 'plane2',
  params: { r: 2, theta: 0.3 },
  controls: [
    slider('r', { min: 0, max: 6, step: 0.1, label: 'length r' }),
    slider('theta', { min: -Math.PI, max: Math.PI, step: 0.02, label: 'angle θ', format: (v) => deg(v) + '°' }),
  ],
  entities: (p) => {
    const v = rot(vec(p.r, 0), p.theta);
    return [
      grid(),
      polygon(UNIT_CIRCLE, { color: 'muted', fill: false, key: 'circle' }),
      vector(v, { color: 'accent', label: 'v', key: 'v' }),
      label('r = ' + f2(p.r) + '    θ = ' + deg(p.theta) + '°    v = [' + f2(v.x) + ', ' + f2(v.y) + ']', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Dial r and θ so v lands on [3, 4] (r = 5 — a familiar triangle), to see how length and angle together determine the exact components Pythagoras predicts',
      (s) => { const v = rot(vec(s.r, 0), s.theta); return Math.abs(v.x - 3) < 0.3 && Math.abs(v.y - 4) < 0.3; },
      { xp: 20, hold: 400, tag: 'magnitude',
        focus: 'v = [r cosθ, r sinθ]. A length and an angle fully determine the components — and Pythagoras still ties r to them: r = ‖v‖.' }),
    goal('Now dial r down to exactly 1, with θ past 90° from straight right, to see how setting r = 1 directly builds a unit vector, no division needed',
      (s) => Math.abs(s.r - 1) < 0.08 && Math.abs(s.theta) > Math.PI / 2,
      { xp: 20, hold: 400, tag: 'unit vectors',
        focus: 'r IS the magnitude. Set it to 1 and you have built a unit vector directly — no division, no drag, just one number.' }),
  ],
  caption: 'Two sliders, one vector: length r and angle θ, to see how the components are always [r cosθ, r sinθ] no matter which knob you turn.',
});

/* ---- 5. DIMS: the magnitude rule generalizes past 2-D ---------- */
/* Micro-idea: bolt three more numbers onto the same vector. The bars show
   all five components; the SAME Pythagorean sum (now with five squared
   terms under the root) still gives the length — the exact rule a
   1,536-dimensional embedding uses, just with more terms. Owns "high
   dimensions". */
const DIMS_BASE = vec(2, 3);                                // fixed 2-D part, ‖⌐‖ = √13 ≈ 3.606
const fullMag = (p) => Math.hypot(DIMS_BASE.x, DIMS_BASE.y, p.k1, p.k2, p.k3);
registerScene({
  id: 'vectors.dims',
  lesson: LESSON,
  space: 'plane2',
  params: { k1: 0, k2: 0, k3: 0 },
  controls: [
    slider('k1', { min: -6, max: 6, step: 0.2, label: 'k1' }),
    slider('k2', { min: -6, max: 6, step: 0.2, label: 'k2' }),
    slider('k3', { min: -6, max: 6, step: 0.2, label: 'k3' }),
  ],
  entities: (p) => [
    grid(),
    vector(DIMS_BASE, { color: 'muted', label: 'v (first 2 numbers)', key: 'v2' }),
    bars([DIMS_BASE.x, DIMS_BASE.y, p.k1, p.k2, p.k3], {
      at: vec(-5.6, -5), labels: ['x', 'y', 'k1', 'k2', 'k3'], color: 'accent2',
    }),
    label('v = [' + f2(DIMS_BASE.x) + ', ' + f2(DIMS_BASE.y) + ', ' + f2(p.k1) + ', ' + f2(p.k2) + ', ' + f2(p.k3) + ']    ‖v‖ = ' + f2(fullMag(p)), { at: 'readout' }),
  ],
  goals: [
    goal('Raise the total length of this 5-number vector to 7, to see how the same Pythagorean formula scales to any number of dimensions',
      (s) => Math.abs(fullMag(s) - 7) < 0.3,
      { xp: 25, hold: 400, tag: 'high dimensions',
        focus: '‖v‖ = √(sum of every squared component) — Pythagoras doesn’t stop at two numbers. A 1,536-dimensional embedding uses the exact same formula, just with more terms under the root.' }),
    goal('Now bring it back down near 4.2 — as close to the 2-number length (√13 ≈ 3.6) as these extra numbers allow, to see how every extra dimension can only add to the total length, never subtract',
      (s) => Math.abs(fullMag(s) - 4.2) < 0.3,
      { xp: 20, hold: 400, tag: 'high dimensions',
        focus: 'Every extra term is SQUARED, so it can only add to the sum — the total length can shrink toward the original 2-D value but never below it.' }),
  ],
  caption: 'This vector secretly has 5 numbers, not 2 — the bars show all of them — to see how the SAME magnitude formula scales to a 1,536-dimensional embedding, just with more terms under the root.',
});

/* ---- 6. DATA: vectors as data — nearest-neighbor search -------- */
/* Micro-idea: give each animal a row [speed, size] and it becomes a
   point — an arrow from the origin — in feature space. "Similar" means
   "close": search is just finding the nearest arrow. A MARGIN keeps the
   ranking flip unambiguous (no crediting a coin-flip tie). Owns
   "magnitude" (distance is the magnitude of a difference). */
const ANIMALS = [
  { name: 'mouse', p: vec(-2, -2.5) },
  { name: 'cat', p: vec(1, 1.5) },
  { name: 'dog', p: vec(2.5, 2) },
  { name: 'horse', p: vec(3.5, -2.5) },
];
const MARGIN = 0.4;
const distTo = (probe, name) => mag(sub(probe, ANIMALS.find((a) => a.name === name).p));
const nearestMargin = (probe, name) => {
  const d = distTo(probe, name);
  const others = ANIMALS.filter((a) => a.name !== name).map((a) => mag(sub(probe, a.p)));
  return d < Math.min(...others) - MARGIN;
};
registerScene({
  id: 'vectors.data',
  lesson: LESSON,
  space: 'plane2',
  params: { probe: vec(0, 0) },
  entities: (p) => [
    grid(),
    ...ANIMALS.map((a) => point(a.p, { color: 'muted', label: a.name, key: a.name })),
    point(p.probe, { color: 'accent', label: '●', handle: 'probe' }),
    label('probe = [' + f2(p.probe.x) + ', ' + f2(p.probe.y) + ']    nearest = ' +
      ANIMALS.reduce((best, a) => (mag(sub(p.probe, a.p)) < mag(sub(p.probe, best.p)) ? a : best)).name, { at: 'readout' }),
  ],
  goals: [
    goal('Drag the probe so MOUSE is clearly its nearest neighbor, to see how "nearest" is just the smallest distance between two data vectors',
      (s) => nearestMargin(s.probe, 'mouse'),
      { xp: 20, hold: 400, tag: 'magnitude',
        focus: '"Nearest" just means smallest distance — the magnitude of the difference between two points. Move the probe closer to mouse than to anything else.' }),
    goal('Now make HORSE the nearest neighbor instead, to see how ranking candidates by distance is exactly how similarity search picks a winner',
      (s) => nearestMargin(s.probe, 'horse'),
      { xp: 20, hold: 400, tag: 'magnitude',
        focus: 'This is the whole idea behind nearest-neighbor search and semantic retrieval: rank every candidate by distance and take the smallest.' }),
  ],
  caption: 'Each animal is a data point [speed, size] — an arrow from the origin — to see how dragging the probe ● and tracking which one is nearest IS similarity search.',
});

/* ---- 7. CAPSTONE: randomized target, no hints ------------------ */
/* THE EXAM. Reset v=[1.6,0] (magnitude 1.6, deliberately NOT 1) and k=0.
   BASELINE-SAFETY, for every seed, by a magnitude-gap argument (no angle
   restriction needed):
     g1: any tPoint has magnitude in {4,5,6}; even if its angle matched
         v's exactly, distance(v,tPoint) >= min(4,5,6) - 1.6 = 2.4 >> 0.3.
     g2: tUnit has magnitude 1; even at the same angle as v, distance
         >= |1.6 - 1| = 0.6 >> 0.08.
     g3: fullMag(reset) = hypot(1.6, 0, 0) = 1.6; any extTarget in
         {6,7,8} gives |1.6 - extTarget| >= 4.4 >> 0.3.
   Every target is reachable exactly (not just within tolerance) by an
   analytic witness: v=tPoint for g1, v=tUnit for g2, v=[extTarget,0]&
   k=0 for g3 (hypot(extTarget,0,0)=extTarget). Three targets carry the
   migrated weak-area tags. No hints. */
const V_RESET = vec(1.6, 0), K_RESET = 0;
const CAP_MAGS = [4, 5, 6];
const CAP_ANGLES = [30, 80, 130, 190, 240, 310];            // degrees
const CAP_EXT = [6, 7, 8];
function randomize(rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const phi1 = (pick(CAP_ANGLES) * Math.PI) / 180;
  const phi2 = (pick(CAP_ANGLES) * Math.PI) / 180;
  const tPoint = rot(vec(pick(CAP_MAGS), 0), phi1);
  const tUnit = rot(vec(1, 0), phi2);
  const extTarget = pick(CAP_EXT);
  return { v: V_RESET, k: K_RESET, tPoint, tUnit, extTarget };
}
registerScene({
  id: 'vectors.capstone',
  lesson: LESSON,
  capstone: true,
  randomize,
  space: 'plane2',
  params: randomize(makeRng(1)),
  controls: [slider('k', { min: -6, max: 6, step: 0.2, label: 'hidden number k' })],
  entities: (p) => [
    grid(),
    polygon(UNIT_CIRCLE, { color: 'muted', fill: false, key: 'circle' }),
    point(p.tPoint, { color: 'warn', label: '★', r: 6, key: 't1' }),
    point(p.tUnit, { color: 'warn', label: '☆', r: 5, key: 't2' }),
    vector(p.v, { color: 'accent', label: 'v', handle: 'v' }),
    label('v = [' + f2(p.v.x) + ', ' + f2(p.v.y) + ']    k = ' + f2(p.k) + '    ‖[x,y,k]‖ = ' + f2(Math.hypot(p.v.x, p.v.y, p.k)), { at: 'readout' }),
  ],
  goals: [
    goal('Send v to the marked target ★ (magnitude AND direction) and hold, to see how a vector target is two numbers at once',
      (s) => mag(sub(s.v, s.tPoint)) < 0.3,
      { xp: 40, hold: 700, tag: 'magnitude',
        focus: 'A vector target is two numbers at once — magnitude and direction both have to match, not just the length.' }),
    goal('Now land v exactly on the marked point ☆ on the unit circle and hold, to see how normalizing by eye still lands exactly on the unit circle',
      (s) => mag(sub(s.v, s.tUnit)) < 0.08,
      { xp: 40, hold: 700, tag: 'unit vectors',
        focus: 'The unit circle is every length-1 vector, one per direction — you just built one by eye, no division required.' }),
    goal('Extend v with the hidden number k until the FULL 3-number length hits the target, to see how the same Pythagorean rule scales with one more dimension',
      (s) => Math.abs(Math.hypot(s.v.x, s.v.y, s.k) - s.extTarget) < 0.3,
      { xp: 40, hold: 700, tag: 'high dimensions',
        focus: 'Same Pythagorean rule, one more term: ‖[x,y,k]‖ = √(x²+y²+k²) — exactly how a real embedding’s length is computed, just with more terms.' }),
  ],
  caption: 'No hints now: send v to ★, then onto ☆ on the unit circle, then dial k until the extended length matches its target, holding each steady, to see how magnitude, direction, and dimensionality all combine in one vector. This is the exam.',
});
