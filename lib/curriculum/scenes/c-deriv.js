/* ================================================================
   SCENE LESSON — c-deriv (The Derivative: Slope, Live).
   ----------------------------------------------------------------
   P2 wave D migration (CONTRACT Amendment v1.8). SECOND calc-world
   scene arc. Converts the two-lab / three-quiz c-deriv into SIX scenes
   ending in a randomized capstone, following docs/AUTHORING_SCENES.md
   and the la-* pattern. Draft PR #82 mined for content ideas only
   (secant-to-tangent convergence, "the derivative is a new function",
   local linearity, trace-the-derivative, sign-of-f′-vs-shape) — no code
   carried over, the drafts predate the scene kit.

   THE ONE IDEA: f'(a) = lim_{h→0} (f(a+h)−f(a))/h — the secant slope
   (average rate) tips into the tangent slope (instantaneous rate) as
   the gap h shrinks to nothing. This IS the gradient a model trains
   with: the number that says how much nudging one weight would change
   the loss, computed by autodiff at every step the same way you compute
   it by hand here.

   Scenes are DATA + PURE PREDICATES. Zero renderer imports. This wave is
   ADDITIVE — the lesson keeps its `labs`; the arc is added as
   `scenes:[...]` (mirrors every prior migration).

   ARC (secant → local linearity → trace → critical point → sign → capstone):
     1 deriv.secant     shrink h; secant tips into the tangent
     2 deriv.zoom       local linearity: shrink the window, the gap vanishes
     3 deriv.trace       sweep x, watch f'(x) get traced as its own curve (inset)
     4 deriv.flat        find the flat tangent — a critical point
     5 deriv.sign         sign of f′ ↔ rising / falling / flat, on a cubic
     6 deriv.capstone    randomized target, no hints

   WEAK-AREA TAG MIGRATION — the old quiz's three q.tag/q.focus pairs:
     quiz "derivative meaning" → scenes 1(g1), 2 + capstone g1
     quiz "computing slopes"   → scenes 1(g2), 3 + capstone g2
     quiz "critical points"    → scenes 4, 5 + capstone g3

   R-CONTENT invariant (g), BRIEFS.md: every goal/caption states the
   CONCEPTUAL PAYOFF, tied to AI foundations where the math genuinely
   supports it — the secant→tangent limit IS the gradient computation
   (scene 1); local linearity is WHY a small gradient-descent step is a
   valid downhill move (scene 2); the derivative as a traced-out function
   mirrors a per-weight gradient, not one global number (scene 3); a flat
   tangent is a zero-gradient stall point (scene 4); the sign of the
   slope is literally the direction gradient descent steps (scene 5).

   INSET (v1.6, no kit changes): scene 3 traces f'(x) live in a small
   corner plot while the main space shows f(x) — the exact "trace a
   scalar as a param sweeps" recipe eigen.pca/dot.alignment established.
   ================================================================ */
import {
  registerScene, vec, makeRng, slider,
  grid, curve, point, segment, label,
  goal,
} from '../../scene/index.js';

const LESSON = 'c-deriv';
const fmt2 = (x) => x.toFixed(2);

/* ---- 1. SECANT: shrink h, watch the secant tip into the tangent -- */
/* Micro-idea: f(x) = x²/2 (the lab/quiz's own function). The secant
   through (a, a+h) converges to the tangent as h→0 — the textbook
   definition of the derivative, and the literal computation autodiff
   performs for a gradient. Owns "derivative meaning" (g1) and
   "computing slopes" (g2). */
const f1 = (x) => (x * x) / 2;
registerScene({
  id: 'deriv.secant',
  lesson: LESSON,
  space: 'plane2',
  params: { a: 1.5, h: 2 },
  controls: [
    slider('a', { min: -3, max: 3, step: 0.01, label: 'a' }),
    slider('h', { min: 0.01, max: 2, step: 0.01, label: 'h' }),
  ],
  entities: (p) => {
    const fa = f1(p.a), fb = f1(p.a + p.h), slope = (fb - fa) / p.h;
    return [
      grid(),
      curve(f1, { domain: [-4, 4] }),
      segment(vec(p.a - 6, fa - 6 * p.a), vec(p.a + 6, fa + 6 * p.a), { color: 'good', dashed: true, label: 'tangent (target)' }),
      segment(vec(p.a - 6, fa - 6 * slope), vec(p.a + 6, fa + 6 * slope), { color: 'warn', label: 'secant' }),
      point(vec(p.a, fa), { color: 'accent', label: 'a', key: 'ptA' }),
      point(vec(p.a + p.h, fb), { color: 'warn', label: 'a+h', key: 'ptB' }),
      label('a = ' + fmt2(p.a) + '    h = ' + fmt2(p.h) + '    secant slope = ' + fmt2(slope) + '    f\'(a) = ' + fmt2(p.a), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Shrink h so the gold secant lines up with the dashed tangent (secant slope within 0.05 of f\'(a)) — this convergence, average rate → instantaneous rate, IS the definition of a gradient: the number that tells a model exactly how to nudge one weight to reduce loss',
      (s) => { const slope = (f1(s.a + s.h) - f1(s.a)) / s.h; return Math.abs(slope - s.a) < 0.05; },
      { xp: 25, hold: 500, tag: 'derivative meaning',
        focus: 'f\'(a) = lim_{h→0} (f(a+h)−f(a))/h — shrinking h makes the secant\'s slope converge to the tangent\'s. That limit IS the derivative.' }),
    goal('Now park a near x=2 (within 0.15) with h still small so the slope reads ≈2 — you have just computed the same VALUE autodiff produces at that point, though autodiff gets there exactly via the chain rule, not by shrinking h',
      (s) => { const slope = (f1(s.a + s.h) - f1(s.a)) / s.h; return Math.abs(s.a - 2) < 0.15 && Math.abs(slope - 2) < 0.1; },
      { xp: 20, hold: 400, tag: 'computing slopes',
        focus: 'For f=x²/2, f\'(x)=x, so the slope AT x=2 is just 2 — verified numerically instead of by formula.' }),
  ],
  caption: 'Shrink the gap h and watch the gold secant tip into the dashed tangent. The slope it settles on is the derivative — the exact quantity a gradient-descent step is built from.',
});

/* ---- 2. ZOOM: local linearity — shrink the window, the gap vanishes */
/* Micro-idea: at a fixed anchor a, the curve-vs-tangent gap at the edge
   of a window of half-width w shrinks (quadratically) as w shrinks —
   this IS why gradient descent's "step downhill along the tangent"
   reasoning is only valid for a SMALL step. Owns "derivative meaning". */
const A2 = 1, FA2 = f1(A2);
const tan2 = (x) => FA2 + A2 * (x - A2);
registerScene({
  id: 'deriv.zoom',
  lesson: LESSON,
  space: 'plane2',
  params: { w: 0.7 },
  controls: [slider('w', { min: 0.02, max: 2, step: 0.01, label: 'window half-width w' })],
  entities: (p) => {
    const gap = Math.abs(f1(A2 + p.w) - tan2(A2 + p.w));
    return [
      grid(),
      curve(f1, { domain: [-2, 4] }),
      segment(vec(A2 - 3, tan2(A2 - 3)), vec(A2 + 3, tan2(A2 + 3)), { color: 'good', dashed: true, label: 'tangent at a' }),
      segment(vec(A2 - p.w, -1.5), vec(A2 + p.w, -1.5), { color: 'warn', width: 4, label: 'window' }),
      point(vec(A2, FA2), { color: 'accent', label: 'a', key: 'ptA' }),
      point(vec(A2 + p.w, f1(A2 + p.w)), { color: 'warn', label: 'edge', key: 'edge' }),
      label('w = ' + fmt2(p.w) + '    curve–tangent gap at the window edge = ' + fmt2(gap), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Shrink the window below 0.3 so the curve–tangent gap drops under 0.05 — this is WHY gradient descent works at all: zoomed in close enough, a loss surface looks straight, so a small step along the (negative) gradient really does move you downhill',
      (s) => s.w < 0.3 && Math.abs(f1(A2 + s.w) - tan2(A2 + s.w)) < 0.05,
      { xp: 25, hold: 500, tag: 'derivative meaning',
        focus: 'Inside a small enough window the curve is indistinguishable from its tangent — that IS what "differentiable" means.' }),
    goal('Now widen it back out past 1.2 and watch the same gap blow past 0.5 — a reminder that gradient descent\'s straight-line assumption only holds for a SMALL step; too large a learning rate and you overshoot past where the local slope was ever a good guide',
      (s) => s.w > 1.2 && Math.abs(f1(A2 + s.w) - tan2(A2 + s.w)) > 0.5,
      { xp: 15, hold: 400, tag: 'derivative meaning',
        focus: 'The tangent approximation is only good LOCALLY — zoom back out and the curve peels away from the straight line fast.' }),
  ],
  caption: 'Shrink the window around a and watch the gap between the curve and its tangent vanish — the local-linearity fact that justifies taking a gradient-descent step along the tangent in the first place.',
});

/* ---- 3. TRACE: sweep x, watch f'(x) traced as its own curve ------ */
/* Micro-idea: the derivative is not one number — it is a FUNCTION.
   Sweeping a across f(x)=x²/2 and reading a live finite-difference slope
   traces out f'(x)=x point by point in a small inset plot. Mirrors a
   model's gradient: one value PER weight, not a single global number.
   Owns "computing slopes". */
const H3 = 1e-3;
const numSlope3 = (x) => (f1(x + H3) - f1(x - H3)) / (2 * H3);
registerScene({
  id: 'deriv.trace',
  lesson: LESSON,
  space: 'plane2',
  params: { a: 0 },
  controls: [slider('a', { min: -3, max: 3, step: 0.01, label: 'a' })],
  inset: { rect: [0.62, 0.05, 0.33, 0.33], extent: 3.3 },
  entities: (p) => {
    const fa = f1(p.a), s = numSlope3(p.a);
    return [
      grid(),
      curve(f1, { domain: [-3, 3] }),
      segment(vec(p.a - 1, fa - 1 * p.a), vec(p.a + 1, fa + 1 * p.a), { color: 'muted', label: 'tangent' }),
      point(vec(p.a, fa), { color: 'accent', label: 'a', key: 'ptA' }),
      label('a = ' + fmt2(p.a) + '    f(a) = ' + fmt2(fa) + '    f\'(a) traced below = ' + fmt2(s), { at: 'readout' }),
      curve((x) => x, { domain: [-3, 3], frame: 'inset', color: 'muted' }),
      point(vec(p.a, s), { frame: 'inset', color: 'good', key: 'trace' }),
      label('f\'(x) vs x', { at: vec(-2.9, 3.0), frame: 'inset', color: 'muted' }),
    ];
  },
  goals: [
    goal('Sweep a until the traced point (inset) reads a slope of 2.5 — proving the derivative is not one number, it is a whole FUNCTION, exactly the way a model\'s gradient is one value PER weight, not a single global number',
      (s) => Math.abs(numSlope3(s.a) - 2.5) < 0.1,
      { xp: 20, hold: 400, tag: 'computing slopes',
        focus: 'Every x has its own slope reading — sweeping a traces out f\'(x)=x point by point in the inset.' }),
    goal('Now sweep to a slope reading of −2 — negative here means the curve is falling, exactly how a negative gradient component tells training "increase this weight to reduce the loss"',
      (s) => Math.abs(numSlope3(s.a) + 2) < 0.1,
      { xp: 20, hold: 400, tag: 'computing slopes',
        focus: 'Negative slope readings correspond to x<0 on this curve — the trace mirrors the sign of x exactly, since f\'(x)=x.' }),
  ],
  caption: 'Sweep a and watch the small inset trace out f\'(x) live — the derivative is a whole new function, read off point by point, the same way a model reports one gradient value per weight.',
});

/* ---- 4. FLAT: find the horizontal tangent — a critical point ----- */
/* Micro-idea: a single clean maximum. f'(c)=0 marks the flat spot —
   exactly the zero-gradient stall point gradient descent searches for.
   Owns "critical points". */
const f4 = (x) => -((x - 2) * (x - 2)) + 3;
const H4 = 1e-3;
const slope4 = (x) => (f4(x + H4) - f4(x - H4)) / (2 * H4);
registerScene({
  id: 'deriv.flat',
  lesson: LESSON,
  space: 'plane2',
  params: { a: -1 },
  controls: [slider('a', { min: -2, max: 6, step: 0.01, label: 'a' })],
  entities: (p) => {
    const fa = f4(p.a), s = slope4(p.a);
    return [
      grid(),
      curve(f4, { domain: [-2, 6] }),
      segment(vec(p.a - 1, fa - 1 * s), vec(p.a + 1, fa + 1 * s), { color: 'muted', label: 'tangent' }),
      point(vec(p.a, fa), { color: 'accent', label: 'a', key: 'ptA' }),
      label('a = ' + fmt2(p.a) + '    f(a) = ' + fmt2(fa) + '    slope = ' + fmt2(s), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Slide a until the tangent goes flat (slope within 0.05 of 0) — you have found a critical point: zero slope means zero update, the stationarity condition training seeks, though here it is a peak, where that stillness is unstable rather than a resting place',
      (s) => Math.abs(slope4(s.a)) < 0.05,
      { xp: 25, hold: 500, tag: 'critical points',
        focus: 'f\'(c)=0 marks a flat tangent — the peak (or valley) of the curve, located without staring at the graph.' }),
    goal('Now find a spot where the slope reads about −3 (well past the peak) — confirming how far from flat you are: the steeper the slope, the larger a gradient-descent update would be there',
      (s) => Math.abs(slope4(s.a) + 3) < 0.15,
      { xp: 15, hold: 400, tag: 'critical points',
        focus: 'Away from the critical point the slope is steep — the further you are, the stronger the pull back toward it.' }),
  ],
  caption: 'Slide a until the tangent lies flat — that is the critical point, the zero-gradient spot where an optimizer would stop updating this weight.',
});

/* ---- 5. SIGN: sign of f′ ↔ rising / falling / flat, on a cubic --- */
/* Micro-idea: f(x)=x³/3−x has f'(x)=x²−1 — two critical points (x=±1)
   and genuine sign changes, unlike the single-bump scene 4. The SIGN of
   the slope is literally the compass gradient descent follows: negative
   gradient ⇒ step right increases the value ⇒ optimizer steps right's
   opposite. Owns "critical points". */
const f5 = (x) => (x * x * x) / 3 - x;
const H5 = 1e-3;
const slope5 = (x) => (f5(x + H5) - f5(x - H5)) / (2 * H5);
registerScene({
  id: 'deriv.sign',
  lesson: LESSON,
  space: 'plane2',
  params: { a: 1.2 },
  controls: [slider('a', { min: -2.5, max: 2.5, step: 0.01, label: 'a' })],
  entities: (p) => {
    const fa = f5(p.a), s = slope5(p.a);
    const shape = s > 0.05 ? 'rising' : (s < -0.05 ? 'falling' : 'flat (critical point)');
    return [
      grid(),
      curve(f5, { domain: [-2.5, 2.5] }),
      segment(vec(p.a - 0.7, fa - 0.7 * s), vec(p.a + 0.7, fa + 0.7 * s), { color: s >= 0 ? 'good' : 'warn', label: 'tangent' }),
      point(vec(p.a, fa), { color: 'accent', label: 'a', key: 'ptA' }),
      label('a = ' + fmt2(p.a) + '    slope = ' + fmt2(s) + '    ' + shape, { at: 'readout' }),
    ];
  },
  goals: [
    goal('Find a RISING spot (slope above +1) — a positive gradient here means moving right INCREASES the value, so gradient descent would step LEFT to reduce a loss shaped like this',
      (s) => slope5(s.a) > 1,
      { xp: 20, hold: 400, tag: 'critical points',
        focus: 'f\'(x)=x²−1 exceeds 1 once |x| is large enough — well outside the two critical points, the curve is rising.' }),
    goal('Now find a FALLING spot (slope below −0.5) — here moving right DECREASES the value, so gradient descent steps RIGHT: the sign of the slope is literally the compass it follows',
      (s) => slope5(s.a) < -0.5,
      { xp: 20, hold: 400, tag: 'critical points',
        focus: 'Between the two critical points (−1 and 1) the curve dips — the sign of f\' flips exactly there.' }),
    goal('Land exactly on a critical point (slope within 0.05 of 0) — one of two flat spots (x=±1) where a naive gradient-descent step would stall, whether or not it is the best minimum on the curve',
      (s) => Math.abs(slope5(s.a)) < 0.05,
      { xp: 25, hold: 500, tag: 'critical points',
        focus: 'f\'(x)=x²−1=0 at x=±1 — one is a local max, one a local min, and a lone "slope=0" reading cannot tell you which without checking nearby.' }),
  ],
  caption: 'Slide a across the cubic and watch the tangent flip color with the sign of the slope — that sign is the exact compass a gradient-descent step follows, and the two flat spots are where it would stall.',
});

/* ---- 6. CAPSTONE: randomized target, no hints -------------------- */
/* THE EXAM. f(x) = k·(x−c)²/2 — a shifted parabola with critical point
   at the RANDOMIZED c, slope k·(x−c). Controls: a (position) + h (secant
   gap). BASELINE-SAFETY, for every seed, by pure control-position
   arguments (independent of the randomized c/k):
     g1/g2 both require h < 0.15; reset h=1.5, always outside.
     g3 requires |a-c| < 0.05; reset a=0, and every c in CAP_C has
        |c| >= 0.5, so |0-c| >= 0.5 >> 0.05 for every seed.
   No hints, but the critical point itself is marked (★) — matching the
   la-eigen/la-vectors precedent of showing geometric targets without
   explaining them. */
const CAP_C = [-1, -0.5, 0.5, 1];
const CAP_K = [0.5, 1, -0.5, -1];
const CAP_OFFSET = 1.5;
const fcapAt = (p, x) => p.k * (x - p.c) * (x - p.c) / 2;
function randomize(rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  return { a: 0, h: 1.5, c: pick(CAP_C), k: pick(CAP_K) };
}
registerScene({
  id: 'deriv.capstone',
  lesson: LESSON,
  capstone: true,
  randomize,
  space: 'plane2',
  extent: 12,
  params: randomize(makeRng(1)),
  controls: [
    slider('a', { min: -3.5, max: 3.5, step: 0.01, label: 'a' }),
    slider('h', { min: 0.01, max: 2, step: 0.01, label: 'h' }),
  ],
  entities: (p) => {
    const fa = fcapAt(p, p.a), fb = fcapAt(p, p.a + p.h), slope = (fb - fa) / p.h;
    const targetSlope = p.k * CAP_OFFSET;
    const critY = fcapAt(p, p.c);
    return [
      grid(),
      curve((x) => fcapAt(p, x), { domain: [-4, 4] }),
      segment(vec(p.a - 4, fa - 4 * slope), vec(p.a + 4, fa + 4 * slope), { color: 'warn', label: 'secant' }),
      point(vec(p.a, fa), { color: 'accent', label: 'a', key: 'ptA' }),
      point(vec(p.a + p.h, fb), { color: 'warn', label: 'a+h', key: 'ptB' }),
      point(vec(p.c, critY), { color: 'good', r: 6, label: '★ critical pt', key: 'critMark' }),
      label('a=' + fmt2(p.a) + ' h=' + fmt2(p.h) + '  secant slope=' + fmt2(slope) + '  target slope=' + fmt2(targetSlope), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Shrink h below 0.1 anywhere on the curve so the secant slope converges to the true tangent slope — proving you can compute the exact gradient this exam\'s model would need, not just eyeball it',
      (s) => { const fa = fcapAt(s, s.a), fb = fcapAt(s, s.a + s.h), slope = (fb - fa) / s.h, trueSlope = s.k * (s.a - s.c); return s.h < 0.1 && Math.abs(slope - trueSlope) < 0.1; },
      { xp: 40, hold: 700, tag: 'derivative meaning',
        focus: 'The secant-to-tangent limit works at ANY point on the curve — shrinking h always converges, the same guarantee that makes a finite-difference gradient check a valid sanity test of autodiff\'s exact output.' }),
    goal('Sweep a (with h small) until the slope reading matches the target slope shown in the readout — the everyday task of computing one specific gradient value at one specific weight',
      (s) => { const fa = fcapAt(s, s.a), fb = fcapAt(s, s.a + s.h), slope = (fb - fa) / s.h, targetSlope = s.k * CAP_OFFSET; return s.h < 0.15 && Math.abs(slope - targetSlope) < 0.15; },
      { xp: 40, hold: 700, tag: 'computing slopes',
        focus: 'The target slope is k·1.5 for this draw\'s k — reading it off means placing a exactly 1.5 past the critical point.' }),
    goal('Land a exactly on the critical point (marked ★) — the flat spot (zero gradient) where an optimizer would stop updating this weight',
      (s) => Math.abs(s.a - s.c) < 0.05,
      { xp: 40, hold: 700, tag: 'critical points',
        focus: 'f\'(c)=k·(c−c)=0 by construction — the marked point is always exactly where the tangent goes flat.' }),
  ],
  caption: 'No hints now. Shrink h to prove the secant becomes the tangent, hit the target slope shown in the readout, then land exactly on the marked critical point — the zero-gradient stall gradient descent hunts for, holding each steady. This is the exam.',
});
