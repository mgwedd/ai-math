/* ================================================================
   SCENE LESSON — la-projection (Projection onto a Line).
   ----------------------------------------------------------------
   P2 wave L migration. Converts the old one-lab / four-quiz
   la-projection into SIX scenes ending in a randomized capstone that
   IS the exam, following docs/AUTHORING_SCENES.md and the
   la-det / la-eigen precedents.

   THE ONE IDEA: proj_a b is the CLOSEST point to b on the line through
   a; what's left over — the residual r = b − proj — is FORCED
   perpendicular to that line, and that orthogonality is exactly what
   "closest" means. The split obeys Pythagoras (‖b‖² = ‖proj‖² + ‖r‖²),
   and the projection cares only about the LINE (direction), never how
   long the arrow a happens to be.

   Scenes are DATA + PURE PREDICATES. Zero renderer imports. This wave is
   ADDITIVE — the lesson keeps its `interactive`/`quiz`; the arc is added
   as `scenes:[...]` on the existing registerLesson() call.

   THE VANISHING-VECTOR EXPLOIT: the scalar projection b·â and the
   residual norm ‖r‖ both go to (near) zero when b shrinks to nothing —
   so a learner could "hit" any ≈0 goal by parking b at the origin
   instead of reasoning about geometry. Every ≈0 goal therefore gates on
   BOTH the handle's minMagConstraint (layer 1) AND a magnitude floor in
   the predicate (layer 2, ‖b‖ ≥ 1) — la-det/la-eigen's two-layer
   defense. A second, subtler exploit: b·â = (a·b)/‖a‖ also degenerates
   if a vanishes (proj() defensively returns 0 for a zero-length a), so
   the perpendicular scene's ≈0 goals ALSO gate on ‖a‖ > MIN_MAG.

   NOTE — the residual is drawn as a dashed segment(b, proj), NOT the
   kit's dropLine: dropLine's renderer only drops to the coordinate axes
   (renderer/draw.js), never to an arbitrary tilted line, so it can't
   express the foot-of-perpendicular onto span(a). A dashed segment is
   the honest, unambiguous residual (and matches the old lab).

   ARC (anatomy → perpendicular → signed length → invariance → split → capstone):
     1 proj.shadow  drag a (line dir) and b; land the shadow at a's tip
                    while b stays OFF the line, then drop b ONTO the line
     2 proj.perp    kill the shadow: b ⊥ line (scalar proj ≈ 0), from each
                    of the TWO perpendicular half-planes
     3 proj.signed  a locked to the unit circle so â = a: the scalar
                    projection is a SIGNED length — hit +2, then −2
     4 proj.line    a = k·a0 driven by a slider: the vector proj never
                    moves as k changes (it's onto a LINE); the scalar proj
                    flips SIGN when k < 0 because â flips
     5 proj.split   Pythagoras: balance ‖proj‖² vs ‖r‖², then send (almost)
                    all of ‖b‖² into the residual, then into the projection
     6 proj.capstone randomized signed-scalar + residual-norm targets, then
                    collapse the residual — no hints

   WEAK-AREA TAG MIGRATION — the old quiz's four q.tag/q.focus strings map
   onto the arc's goals (every goal, not just the capstone, carries one):
     'residual is orthogonal'                    → scenes 1b, 2b, 5? (no) + capstone g3
     'scalar projection'                         → scenes 1a, 2a, 3 + capstone g1
     'projection depends on direction, not length' → scene 4 (both goals)
     'Pythagoras for the split'                  → scene 5 (all three) + capstone g2
   Tag placement is HONEST: each tag sits on the goal that actually drills
   its concept (a goal instruction restating the tag would be gameable
   review signal).

   THE FOURTH-TAG RESOLUTION (mirrors the wave-K precedent): a capstone
   can only honestly tag what its own goals drill. This capstone's three
   goals drill 'scalar projection' (hit a signed b·â), 'Pythagoras for the
   split' (hit a residual-leg length), and 'residual is orthogonal'
   (collapse the residual to zero). The fourth tag, 'projection depends on
   direction, not length', has no slider on the exam stage (a is pinned per
   attempt), so it lives on scene 4 (both goals) instead. The test asserts
   the capstone's THREE tags AND the lesson-wide UNION of all FOUR — the
   review loop survives the quiz's retirement either way.

   CAPSTONE RANDOMIZATION (CONTRACT v1.1 §1/§8): draws the line direction
   a = rot((1,0), φ) UNIT (so â = a and the readout scalar is literally
   b·â) from a finite angle set, an independent signed scalar target
   sTarget, and an independent residual-norm target rTarget. a is FIXED
   per attempt (the exam pins the line — no handle on a); b is the only
   handle. b RESETS each attempt to b0 = 3.2·rot(â, 90°): exactly
   perpendicular to the drawn line at norm 3.2 (the la-dot capstone trick),
   so at load b·â = 0 (≥ 1.5 from every sTarget draw) and ‖r‖ = ‖b‖ = 3.2
   (≥ 1.2 from every rTarget draw, and far from 0). No target is ever
   pre-satisfied, for any of the 5×6×3 = 90 draws — proven by exhaustive
   enumeration in the test (rotation preserves both perpendicularity and
   norms, so the margins are φ-independent).
   ================================================================ */
import {
  registerScene, vec, makeRng, handle, slider,
  grid, vector, point, segment, angleArc, label,
  goal,
} from '../../scene/index.js';
import {
  dot, mag, sub, scale, norm, proj, projVec, residVec, rot,
  minMagConstraint, circleConstraint,
} from './vec-math.js';

const LESSON = 'la-projection';
const f2 = (x) => x.toFixed(2);

// Anti-gaming floor (mirrors la-det/la-eigen): a draggable tip can't be
// shrunk to (near-)nothing to fake a vanishing shadow/residual — clamped to
// mag ≥ MIN_MAG at the handle (layer 1); every ≈0 predicate re-checks its own
// magnitude floor (layer 2). MIN_MAG is the handle floor; the ≈0 GOALS use a
// stronger ‖b‖ ≥ 1 so a legitimate-but-small b can't graze a threshold.
const MIN_MAG = 0.5;
const onMinMag = minMagConstraint(MIN_MAG);

// The scalar t in the vector-projection formula proj_a b = t·a, t = (a·b)/(a·a).
const tOf = (b, a) => (dot(a, a) === 0 ? 0 : dot(b, a) / dot(a, a));
// Signed z of the 2D cross product a×b: >0 when b is in a's left half-plane,
// <0 in the right — the two perpendicular "homes" scene 2 distinguishes.
const crossZ = (a, b) => a.x * b.y - a.y * b.x;

/* ---- 1. SHADOW: the anatomy — proj, residual, right angle ----------- */
/* Micro-idea: proj_a b is b's shadow on the line through a; the residual
   r = b − proj is the perpendicular gap. Land the shadow at a's tip
   (t ≈ 1) while b stays genuinely off the line (‖r‖ ≥ 1), then drop b
   ONTO the line so the residual vanishes and the shadow IS the vector.
   Baseline a=(3,1), b=(1,2.5) (the old lab's start): t=0.55, ‖r‖=2.06 —
   off both goals. Owns 'scalar projection' (g1) + 'residual is
   orthogonal' (g2). */
registerScene({
  id: 'proj.shadow',
  lesson: LESSON,
  space: 'plane2',
  params: { a: vec(3, 1), b: vec(1, 2.5) },
  entities: (p) => {
    const pr = projVec(p.b, p.a);
    const r = residVec(p.b, p.a);
    const ah = norm(p.a);
    const L = scale(ah, 7);
    return [
      grid({ color: 'muted' }),
      // the infinite line through the origin along a (muted, long segment)
      segment(scale(L, -1), L, { color: 'muted', dashed: true, label: 'line', key: 'line' }),
      vector(p.a, { color: 'accent2', label: 'a (line dir)', handle: handle('a', { constrain: onMinMag }) }),
      vector(p.b, { color: 'accent', label: 'b', handle: handle('b', { constrain: onMinMag }) }),
      point(pr, { color: 'good', label: 'proj', key: 'proj' }),
      segment(p.b, pr, { color: 'warn', dashed: true, label: 'r', key: 'resid' }),
      angleArc(p.a, r, { color: 'warn', at: pr, label: '90°', key: 'sq' }),
      label('proj = t·a, t = ' + f2(tOf(p.b, p.a)) + '    b·â = ' + f2(proj(p.b, p.a)) + '    ‖r‖ = ' + f2(mag(r)) + '    a·r = ' + f2(dot(p.a, r)) + ' (⊥ check ≈ 0)', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Land the shadow at the tip of a (t ≈ 1) while b stays genuinely off the line (‖r‖ ≥ 1), to see how the projection reports WHERE along the line b\'s shadow falls, a number entirely separate from how far b sticks out perpendicular to it',
      (s) => mag(s.a) > MIN_MAG && Math.abs(tOf(s.b, s.a) - 1) < 0.12 && mag(residVec(s.b, s.a)) >= 1,
      { xp: 25, hold: 400, tag: 'scalar projection',
        focus: 't = (a·b)/(a·a) is how many copies of a you travel; t = 1 puts the shadow exactly at a\'s tip. Keep b off the line so the shadow is a real projection, not b itself.' }),
    goal('Now put b exactly ONTO the line (‖r‖ ≤ 0.15, ‖b‖ ≥ 1) so the residual vanishes, to see how the shadow only equals the whole vector in the special case where there was nothing perpendicular to lose',
      (s) => mag(residVec(s.b, s.a)) <= 0.15 && mag(s.b) >= 1,
      { xp: 20, hold: 400, tag: 'residual is orthogonal',
        focus: 'When b already lies on the line, b − proj = 0: the residual is the ONLY part projection throws away, and here there is none.' }),
  ],
  caption: 'Drag b (the vector) and a (the line\'s direction). The green proj is b\'s shadow; the dashed residual meets the line at a right angle — no matter how you drag, a·r stays ≈ 0.',
});

/* ---- 2. PERP: kill the shadow from either half-plane ---------------- */
/* Micro-idea: the scalar projection b·â dies exactly when b ⟂ the line —
   and perpendicular has TWO homes (b left of the line, b right of it),
   both killing the shadow. There the residual IS all of b. The ≈0 goal
   is the lesson's prime exploit (tiny b OR tiny a both force b·â ≈ 0), so
   BOTH gate ‖b‖ ≥ 1 AND ‖a‖ > MIN_MAG. Baseline a=(3,1), b=(1,2.5):
   b·â = 1.74 — off both. g1 owns 'scalar projection', g2 owns 'residual
   is orthogonal' (there the residual carries everything). */
registerScene({
  id: 'proj.perp',
  lesson: LESSON,
  space: 'plane2',
  params: { a: vec(3, 1), b: vec(1, 2.5) },
  entities: (p) => {
    const pr = projVec(p.b, p.a);
    const r = residVec(p.b, p.a);
    const ah = norm(p.a);
    const L = scale(ah, 7);
    return [
      grid({ color: 'muted' }),
      segment(scale(L, -1), L, { color: 'muted', dashed: true, label: 'line', key: 'line' }),
      vector(p.a, { color: 'accent2', label: 'a (line dir)', handle: handle('a', { constrain: onMinMag }) }),
      vector(p.b, { color: 'accent', label: 'b', handle: handle('b', { constrain: onMinMag }) }),
      point(pr, { color: 'good', label: 'proj', key: 'proj' }),
      segment(p.b, pr, { color: 'warn', dashed: true, label: 'r', key: 'resid' }),
      label('b·â = ' + f2(proj(p.b, p.a)) + '    ‖proj‖ = ' + f2(mag(pr)) + '    ‖r‖ = ' + f2(mag(r)) + '    side (a×b) = ' + f2(crossZ(p.a, p.b)), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Make b perpendicular to the line on its LEFT side: scalar projection b·â ≈ 0 with a×b > 0, to see how a vanishing shadow is the visual signature of orthogonality — the direction the line literally cannot measure',
      (s) => mag(s.a) > MIN_MAG && mag(s.b) >= 1 && Math.abs(proj(s.b, s.a)) <= 0.15 && crossZ(s.a, s.b) > 0,
      { xp: 25, hold: 400, tag: 'scalar projection',
        focus: 'b·â = 0 means b has NO component along the line — it is entirely perpendicular. Keep ‖b‖ ≥ 1 so a shrunk-to-nothing b can\'t fake the zero.' }),
    goal('Now kill the shadow again from the OTHER side (a×b < 0), to see how perpendicular has two opposite homes and both erase the projection equally — the residual, not the shadow, is now carrying the entire vector',
      (s) => mag(s.a) > MIN_MAG && mag(s.b) >= 1 && Math.abs(proj(s.b, s.a)) <= 0.15 && crossZ(s.a, s.b) < 0,
      { xp: 25, hold: 400, tag: 'residual is orthogonal',
        focus: 'Both perpendicular directions give b·â = 0; which side b sits on flips the sign of a×b but never revives the shadow. All of b is residual here.' }),
  ],
  caption: 'Swing b until its shadow collapses — that is the moment b runs perpendicular to the line. Find it once on each side; both kill the projection, and the whole of b becomes the residual.',
});

/* ---- 3. SIGNED: the scalar projection is a SIGNED length ------------ */
/* Micro-idea: lock a to the UNIT circle so â = a and the readout scalar
   is literally b·â = a·b. Then hit b·â = +2 (shadow points ALONG â) and
   b·â = −2 (shadow points AGAINST â) — same magnitude of shadow, opposite
   sign. No vanishing exploit: the targets are ±2, physically unreachable
   by a tiny b, and circleConstraint pins ‖a‖ = 1 exactly. Baseline
   â=(1,0), b=(0.5,2): b·â = 0.5 — off both. Owns 'scalar projection'. */
const CIRC_R = 1;
const onUnit = circleConstraint(CIRC_R);
registerScene({
  id: 'proj.signed',
  lesson: LESSON,
  space: 'plane2',
  params: { a: vec(1, 0), b: vec(0.5, 2) },
  entities: (p) => {
    const s = dot(p.a, p.b);            // = b·â since ‖a‖ = 1 on the unit circle
    const pr = scale(p.a, s);           // vector shadow = (b·â)·â
    const L = scale(norm(p.a), 7);
    return [
      grid({ color: 'muted' }),
      segment(scale(L, -1), L, { color: 'muted', dashed: true, label: 'line', key: 'line' }),
      vector(p.a, { color: 'accent2', label: 'â (unit)', handle: handle('a', { constrain: onUnit }) }),
      vector(p.b, { color: 'accent', label: 'b', handle: handle('b', { constrain: onMinMag }) }),
      point(pr, { color: 'good', label: 'shadow', key: 'proj' }),
      segment(p.b, pr, { color: 'warn', dashed: true, label: 'r', key: 'resid' }),
      label('â = [' + f2(p.a.x) + ', ' + f2(p.a.y) + ']    b·â = ' + f2(s) + '   ' + (s >= 0 ? '(shadow ALONG â)' : '(shadow AGAINST â)'), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Drive the signed scalar projection to b·â = +2 (hold), to see how the projection is a SIGNED length, not just a distance — a positive value says the shadow reaches forward along the direction you\'re measuring',
      (s) => Math.abs(dot(s.a, s.b) - 2) < 0.15,
      { xp: 25, hold: 500, tag: 'scalar projection',
        focus: 'On the unit circle â = a, so b·â is the plain dot product a·b. Aim it at +2 — the shadow sits two units FORWARD along â.' }),
    goal('Now reach b·â = −2 instead (hold), to see how the very same shadow can read negative — the sign records which way along â you had to travel, so a backward shadow is a genuine minus, not a shorter one',
      (s) => Math.abs(dot(s.a, s.b) + 2) < 0.15,
      { xp: 25, hold: 500, tag: 'scalar projection',
        focus: 'A negative dot means the shadow points AGAINST â (b leans behind the direction). Same size shadow as +2, opposite sign.' }),
  ],
  caption: 'â is pinned to the unit circle, so the readout b·â is exactly the dot product. Push b forward for a positive shadow, behind for a negative one — the scalar projection carries a sign.',
});

/* ---- 4. LINE: projection depends on the LINE, not the arrow --------- */
/* Micro-idea: a = k·a0 for a FIXED base direction a0 and a slider k. The
   vector projection is onto a LINE, so projVec(b, k·a0) = projVec(b, a0)
   for EVERY k ≠ 0 — the shadow point never moves as you stretch or flip
   the arrow. The SCALAR projection b·â, though, flips SIGN when k < 0
   because â flips. Goal (a): stretch hard (|k| ≥ 2.5) and confirm the
   vector proj is unmoved (the second clause is always true — that is the
   lesson; the |k| clause is the anti-gaming that forces a real slider
   move). Goal (b): flip the arrow (k ≤ −0.5) and watch the scalar sign
   flip. THE LINE NEVER DEGENERATES: it is drawn from a0's fixed direction
   regardless of k (scaling a direction never changes its line; only k = 0
   exactly would, and predicates gate |k| ≥ 0.2/0.5 well clear of it).
   Baseline k = 1 fails both (needs |k| ≥ 2.5 / k ≤ −0.5). Owns
   'projection depends on direction, not length' (both goals). */
const A0 = vec(2, 1);
const A0_HAT = norm(A0);
const A4_LINE = [scale(A0_HAT, -7), scale(A0_HAT, 7)];
registerScene({
  id: 'proj.line',
  lesson: LESSON,
  space: 'plane2',
  params: { k: 1, b: vec(1, 2) },
  controls: [slider('k', { min: -3, max: 3, step: 0.05, label: 'scale k (a = k·a0)', format: f2 })],
  entities: (p) => {
    const a = scale(A0, p.k);
    const pr = projVec(p.b, A0);        // onto the LINE — stable as k varies
    const sSigned = proj(p.b, a);       // scalar proj against a = k·a0 (flips sign with k)
    return [
      grid({ color: 'muted' }),
      segment(A4_LINE[0], A4_LINE[1], { color: 'muted', dashed: true, label: 'line (fixed)', key: 'line' }),
      vector(a, { color: 'accent2', label: 'a = k·a0', key: 'a' }),
      vector(p.b, { color: 'accent', label: 'b', handle: handle('b', { constrain: onMinMag }) }),
      point(pr, { color: 'good', label: 'proj (unmoved)', key: 'proj' }),
      segment(p.b, pr, { color: 'warn', dashed: true, label: 'r', key: 'resid' }),
      label('k = ' + f2(p.k) + '    vector proj = [' + f2(pr.x) + ', ' + f2(pr.y) + '] (fixed)    scalar b·â = ' + f2(sSigned), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Stretch the arrow hard (|k| ≥ 2.5) and confirm the vector projection has not moved a hair, to see how projection is onto a LINE, not an arrow — the length of the direction vector cancels out of the formula entirely',
      (s) => Math.abs(s.k) >= 2.5 && mag(sub(projVec(s.b, scale(A0, s.k)), projVec(s.b, A0))) < 0.05,
      { xp: 25, hold: 400, tag: 'projection depends on direction, not length',
        focus: 'proj = (a·b/a·a)·a: scale a by k and the k in the numerator cancels the k² in the denominator against the trailing k. Same line, same shadow — the |k| ≥ 2.5 clause just forces you to actually move the slider.' }),
    goal('Now flip the arrow to the other side (k ≤ −0.5) and watch only the scalar projection change sign, to see how flipping the direction you measure ALONG relabels the shadow\'s sign while leaving the geometric projection point exactly where it was',
      (s) => s.k <= -0.5 && Math.abs(proj(s.b, A0)) >= 0.3 && Math.sign(proj(s.b, scale(A0, s.k))) !== Math.sign(proj(s.b, A0)),
      { xp: 25, hold: 400, tag: 'projection depends on direction, not length',
        focus: 'b·â uses the UNIT arrow â = a/‖a‖; flip a (k < 0) and â flips, so the signed length flips too — but the point on the line is unchanged. (Needs b not ⊥ the line, so its shadow has a sign to flip.)' }),
  ],
  caption: 'Slide k to stretch or flip the arrow a = k·a0. The green projection point never budges — it is onto the line, which k can\'t change; only the SCALAR b·â flips sign when k goes negative.',
});

/* ---- 5. SPLIT: Pythagoras on the projection and residual ------------ */
/* Micro-idea: a fixed, b draggable. Every b splits as proj + r with
   proj ⟂ r, so ‖b‖² = ‖proj‖² + ‖r‖² — the readout shows the identity
   live. Balance the two legs (b at 45° to the line), then pour (almost)
   all the length into the residual (b nearly ⟂), then into the projection
   (b nearly along). Every goal gates ‖b‖ ≥ 1.5 — the ≥90% goals are
   RATIO conditions, scale-invariant, so a tiny aligned b would satisfy
   the ratio without the floor. Baseline b=(1,2): proj²=3.2, r²=1.8,
   b²=5 (64%/36%) — clears all three. All three own 'Pythagoras for the
   split' (la-det precedent: multiple goals, one honest tag). */
const A5 = vec(2, 1);
registerScene({
  id: 'proj.split',
  lesson: LESSON,
  space: 'plane2',
  params: { b: vec(1, 2) },
  entities: (p) => {
    const pr = projVec(p.b, A5);
    const r = residVec(p.b, A5);
    const P2 = dot(pr, pr), R2 = dot(r, r), B2 = dot(p.b, p.b);
    const L = scale(norm(A5), 7);
    return [
      grid({ color: 'muted' }),
      segment(scale(L, -1), L, { color: 'muted', dashed: true, label: 'line', key: 'line' }),
      vector(A5, { color: 'accent2', label: 'a (fixed)', key: 'a' }),
      vector(p.b, { color: 'accent', label: 'b', handle: handle('b', { constrain: onMinMag }) }),
      point(pr, { color: 'good', label: 'proj', key: 'proj' }),
      segment(p.b, pr, { color: 'warn', dashed: true, label: 'r', key: 'resid' }),
      label('‖b‖² = ' + f2(B2) + '    ‖proj‖² = ' + f2(P2) + '    ‖r‖² = ' + f2(R2) + '    ‖proj‖²+‖r‖² = ' + f2(P2 + R2) + ' (= ‖b‖²)', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Balance the split: make ‖proj‖² and ‖r‖² within 10% of ‖b‖² of each other (b at 45° to the line, ‖b‖ ≥ 1.5), to see how the two Pythagorean legs are equal exactly when b bisects the line and its perpendicular — a right triangle with matching legs',
      (s) => { const P2 = dot(projVec(s.b, A5), projVec(s.b, A5)); const R2 = dot(residVec(s.b, A5), residVec(s.b, A5)); return mag(s.b) >= 1.5 && Math.abs(P2 - R2) < 0.1 * dot(s.b, s.b); },
      { xp: 25, hold: 400, tag: 'Pythagoras for the split',
        focus: '‖proj‖² = ‖b‖²cos²θ, ‖r‖² = ‖b‖²sin²θ. They match at θ = 45°, where cos² = sin² — the balanced right triangle.' }),
    goal('Pour it into the residual: make ‖r‖² ≥ 90% of ‖b‖² (b nearly ⊥ the line, ‖b‖ ≥ 1.5), to see how a vector almost perpendicular to the line stores nearly all its length in the part the projection discards',
      (s) => { const R2 = dot(residVec(s.b, A5), residVec(s.b, A5)); return mag(s.b) >= 1.5 && R2 >= 0.9 * dot(s.b, s.b); },
      { xp: 25, hold: 400, tag: 'Pythagoras for the split',
        focus: 'Push b toward perpendicular: sin²θ → 1, so ‖r‖²/‖b‖² → 1. The floor ‖b‖ ≥ 1.5 stops a tiny b from passing the ratio for free.' }),
    goal('Now pour it into the projection instead: make ‖proj‖² ≥ 90% of ‖b‖² (b nearly along the line, ‖b‖ ≥ 1.5), to see how the split hands the length back to the shadow as b lines up with the direction — the residual is what remains only while b leans away',
      (s) => { const P2 = dot(projVec(s.b, A5), projVec(s.b, A5)); return mag(s.b) >= 1.5 && P2 >= 0.9 * dot(s.b, s.b); },
      { xp: 25, hold: 400, tag: 'Pythagoras for the split',
        focus: 'Line b up with a: cos²θ → 1, so ‖proj‖²/‖b‖² → 1 and the residual shrinks to nothing. Same Pythagorean identity, weight shifted to the other leg.' }),
  ],
  caption: 'Drag b and read the live identity ‖proj‖² + ‖r‖² = ‖b‖². Balance the two squares, then tip almost everything into the residual, then into the projection — the sum never changes.',
});

/* ---- 6. CAPSTONE: hit a signed scalar, a residual length, then collapse */
/* THE EXAM. Three goals, three faces of the split: the signed scalar
   projection (g1), the residual's length as the other Pythagorean leg
   (g2), and collapsing the residual to zero (g3). a is FIXED per attempt
   (no handle — the exam pins the line); b resets to b0 ⟂ a at norm 3.2.
   No hints.

   BASELINE-SAFETY PROOF (holds for ALL 90 draws, φ-independent): b0 =
   3.2·rot(â, 90°) is EXACTLY perpendicular to a, so at load
     • b·â = 0            → |0 − sTarget| = |sTarget| ≥ 1.5 > 0.15  (g1 false)
     • ‖r‖ = ‖b0‖ = 3.2   → |3.2 − rTarget| ≥ |3.2 − 2| = 1.2 > 0.15 (g2 false)
     • ‖r‖ = 3.2 > 0.15                                            (g3 false)
   Rotation preserves perpendicularity AND norms, so every margin is
   independent of φ — the same three inequalities hold for all 5 angles,
   6 sTargets, 3 rTargets. Enumerated exhaustively in the test (90 combos),
   not merely sampled. ANTI-GAMING: g2/g3 gate ‖b‖ ≥ 1 so a shrunk b (‖r‖
   ≈ 0) cannot fake the residual-collapse goal; g1's target is ±1.5…±2.5,
   physically out of reach for a vanishing b. */
const ANGLES = [15, 40, 65, 115, 140].map((d) => (d * Math.PI) / 180);
const S_TARGETS = [1.5, -1.5, 2, -2, 2.5, -2.5];
const R_TARGETS = [1, 1.5, 2];
const B0_NORM = 3.2;
function randomize(rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const a = rot(vec(1, 0), pick(ANGLES));         // UNIT line direction (â = a)
  const b = scale(rot(a, Math.PI / 2), B0_NORM);  // exactly ⊥ a, norm 3.2, off the line
  return { a, b, sTarget: pick(S_TARGETS), rTarget: pick(R_TARGETS) };
}
registerScene({
  id: 'proj.capstone',
  lesson: LESSON,
  capstone: true,
  randomize,
  space: 'plane2',
  params: randomize(makeRng(1)),
  entities: (p) => {
    const pr = projVec(p.b, p.a);
    const r = residVec(p.b, p.a);
    const L = scale(norm(p.a), 7);
    return [
      grid({ color: 'muted' }),
      segment(scale(L, -1), L, { color: 'muted', dashed: true, label: 'line (fixed)', key: 'line' }),
      vector(p.a, { color: 'accent2', label: 'â (line)', key: 'a' }),
      vector(p.b, { color: 'accent', label: 'b', handle: handle('b', { constrain: onMinMag }) }),
      point(pr, { color: 'good', label: 'proj', key: 'proj' }),
      segment(p.b, pr, { color: 'warn', dashed: true, label: 'r', key: 'resid' }),
      label('b·â = ' + f2(proj(p.b, p.a)) + '    ‖r‖ = ' + f2(mag(r)) + '    ‖b‖ = ' + f2(mag(p.b)) + '    targets: b·â = ' + f2(p.sTarget) + ', ‖r‖ = ' + f2(p.rTarget) + ', then ‖r‖ → 0', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Hit the signed scalar projection target: make b·â equal it (read the readout) and hold, to see how the shadow\'s signed length is one full coordinate of the split — set it independently of everything perpendicular',
      (s) => Math.abs(proj(s.b, s.a) - s.sTarget) < 0.15,
      { xp: 40, hold: 700, tag: 'scalar projection',
        focus: 'b·â = (a·â) is the signed length of the shadow along â. Match the target\'s value AND its sign — a backward shadow is a real negative.' }),
    goal('Hit the residual-length target: make ‖r‖ equal it (with ‖b‖ ≥ 1) and hold, to see how the perpendicular leftover has its own length — the other leg of the Pythagorean split, tunable on its own',
      (s) => mag(s.b) >= 1 && Math.abs(mag(residVec(s.b, s.a)) - s.rTarget) < 0.15,
      { xp: 40, hold: 700, tag: 'Pythagoras for the split',
        focus: '‖r‖ is the second leg in ‖b‖² = ‖proj‖² + ‖r‖². Grow b\'s perpendicular part until the residual length matches — keep ‖b‖ ≥ 1 so it is a genuine leftover.' }),
    goal('Finally collapse the residual: put b on the line so ‖r‖ ≈ 0 (with ‖b‖ ≥ 1) and hold, to see how zero residual is the exact signature that b already lived in the line — the projection has nothing left to remove',
      (s) => mag(s.b) >= 1 && mag(residVec(s.b, s.a)) <= 0.15,
      { xp: 40, hold: 700, tag: 'residual is orthogonal',
        focus: 'Residual → 0 means a·r → 0 with nothing left over: b is ON the line, so its shadow is the whole of b. A shrunk-to-nothing b is blocked by the ‖b‖ ≥ 1 floor.' }),
  ],
  caption: 'No hints now. Set the signed shadow length b·â to its target, then stretch the residual to its own target length, then lay b flat on the line so the residual vanishes.',
});
