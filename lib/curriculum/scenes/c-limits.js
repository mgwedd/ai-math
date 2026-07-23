/* ================================================================
   SCENE LESSON — c-limits (Limits: Sneaking Up on a Value).
   ----------------------------------------------------------------
   P2 wave D migration (CONTRACT Amendment v1.8). FIRST calc-world scene
   arc. Converts the two-lab / three-quiz c-limits into SEVEN scenes
   ending in a randomized capstone, following docs/AUTHORING_SCENES.md
   and the la-* pattern. Draft PRs #81 mined for content ideas only
   (jump-vs-asymptote one-sided probing, sin(x)/x numeric-estimate table)
   — no code carried over, the drafts predate the scene kit.

   THE ONE IDEA: a limit is what f(x) APPROACHES as x sneaks toward a
   point — a statement about the neighborhood, not about f(a) itself.
   f(a) can be undefined, defined-but-wrong, or simply irrelevant; the
   limit is read from the trend on both sides.

   Scenes are DATA + PURE PREDICATES. Zero renderer imports. This wave is
   ADDITIVE — the lesson keeps its `labs`; the arc is added as
   `scenes:[...]` (mirrors every prior migration).

   ARC (hole → factor → jump → asymptote → transcendental → synthesis → capstone):
     1 limits.hole        sneak to a removable hole from both sides
     2 limits.factor       0/0 is a SIGNAL to factor, not the answer "0"
     3 limits.jump         one-sided disagreement ⇒ DNE
     4 limits.asymptote    one-sided agreement-but-infinite ⇒ still DNE
     5 limits.sinc         a transcendental limit read off the numbers
     6 limits.classify      no-hints synthesis: diagnose all three cases
     7 limits.capstone      randomized target, no hints

   WEAK-AREA TAG MIGRATION — the old quiz's three q.tag/q.focus pairs:
     quiz "indeterminate forms" → scenes 2, 5 + capstone g1
     quiz "one-sided limits"    → scenes 3, 4, 6(g1/g2) + capstone g2
     quiz "limit vs value"      → scenes 1, 6(g3) + capstone g3

   R-CONTENT invariant (g), BRIEFS.md: every goal/caption states the
   CONCEPTUAL PAYOFF, tied to AI foundations where the math genuinely
   supports it (not decorative) — a decaying learning-rate schedule
   approaches-but-never-touches zero (scene 1's exact shape); a
   non-differentiable step function is why ML losses must be smooth
   (scene 3, matching this lesson's own `ml` box); an exploding 1/x² is
   the textbook shape of an exploding gradient (scene 4); reading a limit
   off numbers instead of algebra is literally what a numerical
   gradient-check does (scene 5).

   NO INSET FRAME this lesson (not needed — every scene's payoff reads
   directly off the main-space curve + readout).
   ================================================================ */
import {
  registerScene, vec, makeRng, slider,
  grid, curve, point, dropLine, label,
  goal,
} from '../../scene/index.js';

const LESSON = 'c-limits';
const fmt2 = (x) => x.toFixed(2);

/* ---- 1. HOLE: sneak up on a removable discontinuity ------------- */
/* Micro-idea: f(x) = (x²−1)/(x−1) is 0/0 exactly at x=1 (a hole) but
   heads for 2 from either side. Owns "limit vs value" — the retiring
   quiz's own Q3 scenario (f undefined at the point, limit still exists),
   made draggable. */
const H1_X = 1, H1_LIMIT = 2;
const f1 = (x) => (x * x - 1) / (x - 1);
registerScene({
  id: 'limits.hole',
  lesson: LESSON,
  space: 'plane2',
  params: { x: -0.5 },
  controls: [slider('x', { min: -1, max: 3, step: 0.001, label: 'x' })],
  entities: (p) => {
    const y = f1(p.x);
    return [
      grid(),
      curve(f1, { domain: [-1, 3] }),
      point(vec(H1_X, H1_LIMIT), { color: 'muted', label: 'hole (f(1) undefined)', key: 'hole' }),
      ...(Number.isFinite(y) ? [
        dropLine(vec(p.x, y), { to: 'axes', color: 'muted' }),
        point(vec(p.x, y), { color: 'accent', label: 'probe', key: 'probe' }),
      ] : []),
      label('x = ' + fmt2(p.x) + '    f(x) = ' + (Number.isFinite(y) ? fmt2(y) : 'undefined'), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Sneak up on the hole from the LEFT (x within 0.05 below 1) — to see how a value can be approached from one side, the same way a decaying learning-rate schedule creeps toward (but never touches) zero',
      (s) => s.x < H1_X && s.x > H1_X - 0.05,
      { xp: 15, hold: 300, tag: 'limit vs value',
        focus: 'A limit is a trend, not a single frozen value — you read it by watching what happens as x gets close, from both directions.' }),
    goal('Now from the RIGHT (x within 0.05 above 1) — confirming the approach agrees from both sides, exactly how you would check a training loss is genuinely converging rather than just drifting in from one direction',
      (s) => s.x > H1_X && s.x < H1_X + 0.05,
      { xp: 15, hold: 300, tag: 'limit vs value',
        focus: 'Both sides must agree for a limit to exist — that agreement is the whole test.' }),
    goal('Land close enough that f(x) reads within 0.05 of 2 — the limit — to see that this trend is well-defined even though f(1) itself is not, the same way a computation can have a perfectly well-behaved NEARBY value even at a point where its raw formula breaks down',
      (s) => { const y = f1(s.x); return Number.isFinite(y) && Math.abs(y - H1_LIMIT) < 0.05; },
      { xp: 20, hold: 400, tag: 'limit vs value',
        focus: 'f(1) is undefined (0/0), but the limit as x→1 is a clean 2 — the limit describes the neighborhood, never the missing point itself.' }),
  ],
  caption: 'Slide x toward the hole at x=1 from both sides — f(x) heads for 2 even though f(1) itself is undefined, the same "approaches but never touches" shape a decaying learning-rate schedule has.',
});

/* ---- 2. FACTOR: 0/0 is a signal to factor, not "the answer is 0" -- */
/* Micro-idea: reproduces the retiring quiz's own (x²−9)/(x−3) → 6.
   Explicit anti-misconception markers at (3,0) [the wrong instinct] and
   (3,6) [the real limit]. Owns "indeterminate forms". */
const H2_X = 3, H2_LIMIT = 6;
const f2fn = (x) => (x * x - 9) / (x - 3);
registerScene({
  id: 'limits.factor',
  lesson: LESSON,
  space: 'plane2',
  params: { x: 0 },
  controls: [slider('x', { min: 0, max: 6, step: 0.001, label: 'x' })],
  entities: (p) => {
    const y = f2fn(p.x);
    return [
      grid(),
      curve(f2fn, { domain: [0, 6] }),
      point(vec(H2_X, 0), { color: 'warn', label: '0/0 here is NOT 0', key: 'decoy' }),
      point(vec(H2_X, H2_LIMIT), { color: 'good', label: 'limit = 6', key: 'hole' }),
      ...(Number.isFinite(y) ? [point(vec(p.x, y), { color: 'accent', label: 'probe', key: 'probe' })] : []),
      label('x = ' + fmt2(p.x) + '    f(x) = ' + (Number.isFinite(y) ? fmt2(y) : 'undefined'), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Sneak toward x=3 from the LEFT (within 0.05) — to see that a 0/0-looking computation is heading somewhere very specific, not toward zero, the same instinct a normalized ratio in a model (like an attention score dividing by a near-vanishing sum) needs',
      (s) => s.x < H2_X && s.x > H2_X - 0.05,
      { xp: 15, tag: 'indeterminate forms',
        focus: '0/0 is "indeterminate", not "0" — it is a signal to factor and simplify, not a computed answer.' }),
    goal('Now from the RIGHT (within 0.05) — confirming from the other side that 0/0 was never actually "nothing"',
      (s) => s.x > H2_X && s.x < H2_X + 0.05,
      { xp: 15, hold: 400, tag: 'indeterminate forms',
        focus: 'x² − 9 = (x−3)(x+3); away from the hole, f(x) = x + 3 → 6. Factoring reveals the real behavior an unsimplified 0/0 hides.' }),
    goal('Read the limit to two decimals: land close enough that f(x) is within 0.02 of 6 — proving 0/0 was a signal to factor, not a computed zero, the same habit you need whenever a training computation momentarily divides two vanishing quantities',
      (s) => { const y = f2fn(s.x); return Number.isFinite(y) && Math.abs(y - H2_LIMIT) < 0.02; },
      { xp: 20, hold: 400, tag: 'indeterminate forms',
        focus: 'Factor first, THEN evaluate: (x²−9)/(x−3) simplifies to x+3, and x+3 at x=3 is a clean 6 — no indeterminate form survives the simplification.' }),
  ],
  caption: 'Slide x toward the marked hole at x=3. The curve heads for 6 (green), never the 0 a bare "0/0" instinct suggests (red) — factor first, the same way you would simplify any vanishing-denominator ratio in a model.',
});

/* ---- 3. JUMP: one-sided disagreement ⇒ DNE ---------------------- */
/* Micro-idea: a genuine step function, probed at x=∓ε. The two sides
   disagree, so no two-sided limit exists — the exact reason a raw
   step-shaped metric (accuracy) can never be a training loss (this
   lesson's own `ml` box: "you can't backprop a step function"). Owns
   "one-sided limits". */
const J3_X = 0, J3_L = 1, J3_R = 3;
const jump3 = (x) => (x < J3_X ? J3_L : J3_R);
registerScene({
  id: 'limits.jump',
  lesson: LESSON,
  space: 'plane2',
  params: { eps: 1 },
  controls: [slider('eps', { min: 0.001, max: 2, step: 0.001, label: 'ε (approach distance)' })],
  entities: (p) => {
    const fL = jump3(-p.eps), fR = jump3(p.eps);
    return [
      grid(),
      curve(jump3, { domain: [-3, -0.001] }),
      curve(jump3, { domain: [0.001, 3] }),
      point(vec(-p.eps, fL), { color: 'good', label: 'left', key: 'pL' }),
      point(vec(p.eps, fR), { color: 'accent', label: 'right', key: 'pR' }),
      label('ε = ' + fmt2(p.eps) + '    f(−ε) = ' + fmt2(fL) + '    f(ε) = ' + fmt2(fR), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Shrink ε below 0.05 and confirm the two sides land on DIFFERENT heights — this jump is exactly why raw classification accuracy can never BE a training loss: a step function has no consistent slope to backprop through, so training always swaps in a smooth surrogate (like cross-entropy) instead',
      (s) => s.eps < 0.05 && Math.abs(jump3(-s.eps) - jump3(s.eps)) > 1,
      { xp: 25, hold: 500, tag: 'one-sided limits',
        focus: 'Left and right limits disagree here (1 vs 3), so the two-sided limit does not exist — a jump, not a hole.' }),
    goal('Now isolate the RIGHT-hand approach alone: shrink ε below 0.05 and read f(ε) ≈ 3 — the one-sided read a model would need at a hard threshold, the kind of discontinuity ML avoids by design',
      (s) => s.eps < 0.05 && Math.abs(jump3(s.eps) - J3_R) < 0.1,
      { xp: 15, hold: 300, tag: 'one-sided limits',
        focus: 'A one-sided limit only asks about ONE direction of approach — the right-hand limit here is a clean 3, even though the two-sided limit fails.' }),
  ],
  caption: 'Shrink ε to place probes at x=−ε (green) and x=+ε (accent). A two-sided limit needs them to agree — here they never do, the same discontinuity that keeps raw accuracy out of a loss function.',
});

/* ---- 4. ASYMPTOTE: agreement-but-infinite ⇒ still DNE ----------- */
/* Micro-idea: 1/x² blows up on BOTH sides of x=0 — the sides "agree" on
   direction (+∞) but that agreement still is not a finite limit. The
   canonical shape of an exploding gradient. Owns "one-sided limits". */
const asymp4 = (x) => 1 / (x * x);
registerScene({
  id: 'limits.asymptote',
  lesson: LESSON,
  space: 'plane2',
  extent: 8,
  params: { eps: 1 },
  controls: [slider('eps', { min: 0.02, max: 2, step: 0.001, label: 'ε (approach distance)' })],
  entities: (p) => {
    const fL = asymp4(-p.eps), fR = asymp4(p.eps);
    return [
      grid(),
      curve(asymp4, { domain: [-3, -0.15] }),
      curve(asymp4, { domain: [0.15, 3] }),
      point(vec(-p.eps, Math.min(fL, 7.5)), { color: 'good', label: 'left', key: 'pL' }),
      point(vec(p.eps, Math.min(fR, 7.5)), { color: 'accent', label: 'right', key: 'pR' }),
      label('ε = ' + fmt2(p.eps) + '    f(−ε) = ' + fmt2(fL) + '    f(ε) = ' + fmt2(fR), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Shrink ε below 0.1 and confirm BOTH sides blow up past 50 — this is exactly the shape of an exploding gradient: a quantity both directions agree is racing to infinity, which is just as much a training failure as it is "not a real limit"',
      (s) => s.eps < 0.1 && asymp4(-s.eps) > 50 && asymp4(s.eps) > 50,
      { xp: 25, hold: 500, tag: 'one-sided limits',
        focus: 'Both sides head to +∞, but +∞ is not a number — a finite two-sided limit needs both sides to approach the same FINITE value.' }),
    goal('Now confirm the sides roughly AGREE while still exploding (within 5 of each other, both past 50) — agreement in trend alone is not enough for a finite answer, the same lesson behind clipping an exploding gradient rather than trusting it to "settle"',
      (s) => s.eps < 0.1 && Math.abs(asymp4(-s.eps) - asymp4(s.eps)) < 5 && asymp4(s.eps) > 50,
      { xp: 15, hold: 400, tag: 'one-sided limits',
        focus: 'The sides "agreeing" on direction is not the same as a limit existing — it must also be finite. This is the case a jump discontinuity and an asymptote both fail, for different reasons.' }),
  ],
  caption: 'Shrink ε again, but this time on 1/x². Both sides race upward together — agreement, but never to a finite number: the textbook shape of an exploding gradient, not a convergent limit.',
});

/* ---- 5. SINC: a transcendental limit, read off the numbers ------ */
/* Micro-idea: sin(x)/x cannot be factored — it is 0/0 at x=0 but
   algebra offers no simplification. Read the limit (1) the way it is
   actually done for a transcendental limit: from the numbers, not a
   formula rearrangement. This is exactly a numerical gradient-check —
   sanity-checking a value you cannot verify by hand. Owns "indeterminate
   forms" (the numeric-estimation half). */
const sinc5 = (x) => Math.sin(x) / x;
registerScene({
  id: 'limits.sinc',
  lesson: LESSON,
  space: 'plane2',
  params: { x: -1.2 },
  controls: [slider('x', { min: -2, max: 2, step: 0.001, label: 'x' })],
  entities: (p) => {
    const y = sinc5(p.x);
    return [
      grid(),
      curve(sinc5, { domain: [-2, 2] }),
      point(vec(0, 1), { color: 'muted', label: 'hole (f(0) undefined)', key: 'hole' }),
      ...(Number.isFinite(y) ? [point(vec(p.x, y), { color: 'accent', label: 'probe', key: 'probe' })] : []),
      label('x = ' + fmt2(p.x) + '    sin(x)/x = ' + (Number.isFinite(y) ? y.toFixed(4) : 'undefined'), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Creep x toward 0 from either side (within 0.02) — reading the limit off the NUMBERS since sin(x)/x cannot be factored, the exact technique (a numerical estimate) engineers use to sanity-check a gradient that cannot be verified by hand',
      (s) => Math.abs(s.x) < 0.02 && s.x !== 0,
      { xp: 20, hold: 400, tag: 'indeterminate forms',
        focus: 'Not every indeterminate form simplifies algebraically — sin(x)/x is a cornerstone example you estimate from a value table instead.' }),
    goal('Land within 0.01 of x=0 and read f(x) within 0.01 of 1 — you have just numerically estimated a limit instead of algebraically deriving it, the same finite-difference habit behind checking an autodiff gradient',
      (s) => { const y = sinc5(s.x); return Number.isFinite(y) && Math.abs(s.x) < 0.01 && Math.abs(y - 1) < 0.01; },
      { xp: 25, hold: 500, tag: 'indeterminate forms',
        focus: 'lim_{x→0} sin(x)/x = 1 — a limit you cannot factor your way to. It is why d/dx sin(x) = cos(x), a fact every autodiff library bakes in.' }),
  ],
  caption: 'Creep x toward 0 on sin(x)/x — this one has no algebraic shortcut, so you read the limit straight off the numbers, exactly like a numerical gradient-check confirms a value you cannot verify by formula.',
});

/* ---- 6. CLASSIFY: no-hints synthesis over all three failure modes  */
/* Micro-idea: pick a function (jump / asymptote / removable), shrink ε,
   and diagnose which of the three verdicts applies — no scaffolding.
   This is the debugging skill of reading a training loss curve: is it
   genuinely discontinuous, exploding, or just glitchy-but-fine at one
   point? Splits across all three tags by construction. */
const CLASSIFY_FN = [
  { name: 'jump', f: (x) => (x < 0 ? 1 : 3) },
  { name: 'asymptote', f: (x) => 1 / (x * x) },
  { name: 'removable', f: (x) => (x * x + 2 * x) / x },   // = x+2 away from 0
];
registerScene({
  id: 'limits.classify',
  lesson: LESSON,
  space: 'plane2',
  extent: 8,
  params: { fi: 0, eps: 1 },
  controls: [
    slider('fi', { min: 0, max: 2, step: 1, label: 'function (0=jump, 1=asymptote, 2=removable)' }),
    slider('eps', { min: 0.01, max: 2, step: 0.001, label: 'ε' }),
  ],
  entities: (p) => {
    const fn = CLASSIFY_FN[p.fi].f;
    const fL = fn(-p.eps), fR = fn(p.eps);
    return [
      grid(),
      curve(fn, { domain: [-3, -0.15] }),
      curve(fn, { domain: [0.15, 3] }),
      point(vec(-p.eps, Number.isFinite(fL) ? Math.max(-8, Math.min(8, fL)) : 0), { color: 'good', label: 'left', key: 'pL' }),
      point(vec(p.eps, Number.isFinite(fR) ? Math.max(-8, Math.min(8, fR)) : 0), { color: 'accent', label: 'right', key: 'pR' }),
      label(CLASSIFY_FN[p.fi].name + '    ε = ' + fmt2(p.eps) + '    f(−ε) = ' + fmt2(fL) + '    f(ε) = ' + fmt2(fR), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Select the JUMP function, shrink ε below 0.05, and confirm the sides disagree — diagnosing a discontinuous training curve exactly the way you would spot a non-differentiable operation hiding in a loss graph',
      (s) => { const fn = CLASSIFY_FN[0].f; return s.fi === 0 && s.eps < 0.05 && Math.abs(fn(-s.eps) - fn(s.eps)) > 1; },
      { xp: 20, hold: 400, tag: 'one-sided limits',
        focus: 'Disagreeing sides = a jump = no limit. The clearest of the three failure modes.' }),
    goal('Select the ASYMPTOTE function, shrink ε below 0.1, and confirm both sides explode past 50 — the exploding-gradient shape, diagnosed from the same probing habit',
      (s) => { const fn = CLASSIFY_FN[1].f; return s.fi === 1 && s.eps < 0.1 && fn(-s.eps) > 50 && fn(s.eps) > 50; },
      { xp: 20, hold: 400, tag: 'one-sided limits',
        focus: 'Both sides agree on direction (+∞) yet still no finite limit — "agreement" and "existence" are not the same claim.' }),
    goal('Select the REMOVABLE function, shrink ε below 0.05, and confirm the sides agree on a FINITE value (≈2) — recognizing a training curve with one glitchy point (like a momentary vanishing-denominator division) that still converges just fine once you look past it',
      (s) => { const fn = CLASSIFY_FN[2].f; return s.fi === 2 && s.eps < 0.05 && Math.abs(fn(-s.eps) - 2) < 0.1 && Math.abs(fn(s.eps) - 2) < 0.1; },
      { xp: 25, hold: 500, tag: 'limit vs value',
        focus: 'Agreement AND finiteness together mean the limit exists — regardless of whether the function is even defined at that exact point.' }),
  ],
  caption: 'Pick a function with the top slider, shrink ε, and read the verdict: disagreement is a jump, shared-but-huge is an explosion, shared-and-finite means the limit genuinely exists — the same triage you would run on a misbehaving loss curve.',
});

/* ---- 7. CAPSTONE: randomized target, no hints -------------------- */
/* THE EXAM. Two independent landmarks on one scene: a hole at x=CAP_XH
   (indeterminate forms + limit vs value, via a small "decoy" band that
   is DEFINED but wrong) and a jump at x=CAP_XJ (one-sided limits).
   BASELINE-SAFETY, for every seed, by pure position arguments (no
   dependence on the randomized a/jL/jR):
     g1 needs 0.1 <= |x-CAP_XH| < 0.2; reset x=0 gives |0-3|=3, outside.
     g2 needs eps < 0.05; reset eps=1, outside.
     g3 needs |x-CAP_XH| < 0.05 (the decoy band); reset x=0 gives
        |0-3|=3 >> 0.05, outside.
   Every target reachable by an exact analytic witness (see the test
   file). Three targets carry the migrated weak-area tags. No hints. */
const CAP_XH = 3, CAP_XJ = -3, CAP_DECOY_HALF = 0.05, CAP_DECOY = 0;
const CAP_A = [2, 3, 4, 5];
const CAP_JL = [0, 1, 2, 3];
const CAP_DELTA = [2, 3, 4, 5];
const capHole = (a) => (x) => (Math.abs(x - CAP_XH) < CAP_DECOY_HALF ? CAP_DECOY : (x - CAP_XH) * (x + a) / (x - CAP_XH));
const capJump = (jL, jR) => (x) => (x < CAP_XJ ? jL : jR);
function randomize(rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const a = pick(CAP_A);
  const jL = pick(CAP_JL);
  const jR = jL + pick(CAP_DELTA);
  return { x: 0, eps: 1, a, jL, jR };
}
registerScene({
  id: 'limits.capstone',
  lesson: LESSON,
  capstone: true,
  randomize,
  space: 'plane2',
  extent: 10,
  params: randomize(makeRng(1)),
  controls: [
    slider('x', { min: -1, max: 6, step: 0.001, label: 'x (near the hole)' }),
    slider('eps', { min: 0.001, max: 2, step: 0.001, label: 'ε (near the jump)' }),
  ],
  entities: (p) => {
    const hf = capHole(p.a), jf = capJump(p.jL, p.jR);
    const y = hf(p.x), fL = jf(CAP_XJ - p.eps), fR = jf(CAP_XJ + p.eps);
    return [
      grid(),
      curve(jf, { domain: [-6, CAP_XJ - 0.02] }),
      curve(jf, { domain: [CAP_XJ + 0.02, 0] }),
      curve(hf, { domain: [0.5, 6] }),
      point(vec(CAP_XH, CAP_XH + p.a), { color: 'good', r: 6, label: '★ limit', key: 'limitMark' }),
      point(vec(CAP_XH, CAP_DECOY), { color: 'warn', r: 5, label: 'f(3) recorded', key: 'decoyMark' }),
      ...(Number.isFinite(y) ? [point(vec(p.x, y), { color: 'accent', label: 'x-probe', key: 'probeX' })] : []),
      point(vec(CAP_XJ - p.eps, fL), { color: 'good', label: 'left', key: 'probeL' }),
      point(vec(CAP_XJ + p.eps, fR), { color: 'accent', label: 'right', key: 'probeR' }),
      label('x=' + fmt2(p.x) + ' f(x)=' + (Number.isFinite(y) ? fmt2(y) : '—') + '    ε=' + fmt2(p.eps) + ' f(left)=' + fmt2(fL) + ' f(right)=' + fmt2(fR), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Creep toward the hole (0.1–0.2 away from x=3) and hold — reading the value the curve genuinely approaches, the same trend-not-formula reasoning a normalized ratio in a model needs whenever its raw computation looks like 0/0',
      (s) => { const d = Math.abs(s.x - CAP_XH); return d >= 0.1 && d < 0.2; },
      { xp: 40, hold: 700, tag: 'indeterminate forms',
        focus: 'The marked ★ is where the SIMPLIFIED formula lands — factoring away the (x−3) reveals it, exactly as in scene 2.' }),
    goal('Shrink ε until the two jump probes disagree, and hold — confirming a genuine discontinuity, the same diagnosis that rules out a raw step-shaped metric as a training loss',
      (s) => s.eps < 0.05 && Math.abs(s.jL - s.jR) > 1,
      { xp: 40, hold: 700, tag: 'one-sided limits',
        focus: 'Left and right never agree at this jump, for any draw of jL/jR — no two-sided limit exists there, whatever the exact heights are.' }),
    goal('Land in the flagged zone right at x=3 and hold — noticing the function\'s ACTUAL recorded value sits nowhere near the limit you just found, the value/limit gap that vanishing- and exploding-gradient debugging depends on',
      (s) => Math.abs(s.x - CAP_XH) < CAP_DECOY_HALF,
      { xp: 40, hold: 700, tag: 'limit vs value',
        focus: 'What a computation returns AT a point can look nothing like what it is trending toward nearby — the limit and the value are two different questions.' }),
  ],
  caption: 'No hints now. Creep to the hole and read the limit, shrink ε to catch the jump disagreeing, then land in the flagged zone and see the recorded value miss the limit — the same value/limit gap that trips up gradient debugging, holding each steady. This is the exam.',
});
