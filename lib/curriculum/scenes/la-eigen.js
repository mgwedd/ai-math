/* ================================================================
   SCENE LESSON — la-eigen (Eigenvectors & Eigenvalues).
   ----------------------------------------------------------------
   P2 wave B migration (CONTRACT Amendment v1.6 §2). Converts the old
   two-lab / four-quiz la-eigen into SIX scenes ending in a randomized
   capstone that IS the exam, following docs/AUTHORING_SCENES.md and the
   la-matrix/la-matmul/la-det pattern.

   THE ONE IDEA: M·v = λ·v — most vectors get knocked off their own
   direction by a matrix, but an eigenvector only gets STRETCHED, never
   rotated. Every scene drags a vector v and reads Mv, checking whether
   Mv still points along v (parallel — an eigen-direction) or has swung
   away (not one). Parallelism is SCALE-INVARIANT (cos(v,Mv) doesn't
   care how long v is), so every alignment goal in this file gates on
   BOTH an angle epsilon AND a magnitude floor via vec-math's isAligned()
   — a lone epsilon check would happily credit a vanishing v, whose
   direction is numerically unstable to begin with (Amendment v1.6 §2
   review warning, heeded throughout).

   Scenes are DATA + PURE PREDICATES. Zero renderer imports. This wave is
   ADDITIVE — the lesson keeps its `labs`; the arc is added as
   `scenes:[...]` (mirrors la-matrix/la-matmul/la-det).

   ARC (anatomy → special case → harder → theorem → application → capstone):
     1 eigen.anatomy    Mv=λv on a fixed symmetric M; find both eigen-dirs
     2 eigen.diagonal   triangular M — eigenvalues sit right on the diagonal
     3 eigen.hunt       harder M, no hints; signed λ (stretch vs. flip)
     4 eigen.orthogonal spectral theorem: symmetric ⇒ eigenvectors ⟂
     5 eigen.pca        PCA teaser: the max-variance direction IS λ_max's dir
     6 eigen.power      power iteration: v_k = normalize(Mᵏv₀) → dominant dir
     7 eigen.tracedet   trace+det steer (λ1,λ2); the real-eigenvalue boundary
     8 eigen.capstone   randomized target eigen-pair, no hints

   P2 WAVE J (Amendment v1.14 — mined from draft PR #80, IDEAS ONLY, no code
   reused; PR #80 is mine-then-close). Inserted before the capstone, after
   pca, so every prior scene's index/id is untouched (additive):
     6 eigen.power — a single slider k drives v_k = normalize(Mᵏv₀) for TWO
       fixed symmetric matrices sharing the dominant direction [1,1]: the
       lesson's own M1 = [[2,1],[1,2]] (λ=3,1 — wide gap) and a new
       SLOW = [[1,0.1],[0.1,1]] (λ=1.1,0.9 — narrow gap). v_k is computed in
       CLOSED FORM from the eigen-decomposition (v0's components along each
       eigen-direction, each scaled by λ^k) rather than by iterating matApply
       k times — exact, no numerical drift, and it makes v_k ALWAYS unit
       length (normalize is baked into the formula), so there is no vanishing-
       vector exploit to gate against here: k is the only control. Honesty
       conditions baked in by construction (not user-adjustable, so provable
       once, not per-attempt): |λ1|>|λ2| for both matrices, and v0 (15° off
       the dominant direction) is genuinely non-orthogonal to it. The
       eigenvalue-GAP payoff is literal: at k=2 the wide-gap vector has
       already locked on while the narrow-gap one is still visibly adrift;
       push k to 12 and even the narrow-gap one gets there — just slower.
     7 eigen.tracedet — sliders for trace and det steer (λ1,λ2) via
       λ = (tr ± √(tr²−4·det))/2; a third slider (φ) spins the live eigen-
       axis by feeding (λ1,λ2,φ) straight into the EXISTING `eigenMatrix`
       helper (no new vec-math) — reusing the capstone's own spectral-form
       construction, so the axis is never hard-coded to ±45°. When
       tr²−4·det goes negative the reconstruction has no real λs; rather than
       clamp the sliders away from that region, the scene surfaces the
       boundary honestly (a plain, undistorted grid + a "complex eigenvalues"
       readout, no crash). A symmetric matrix ALWAYS has tr²≥4·det — this
       scene's (trace,det) pair is a free-standing pair fed into the
       reconstruction, so unlike the rest of the lesson it CAN wander outside
       the "symmetric-realizable" region, which is the whole point: the
       boundary is something to find, not something ruled out by fiat.

   WEAK-AREA TAG MIGRATION — the old quiz's three q.tag/q.focus pairs land
   on the capstone goals:
     quiz "eigen definition"     → capstone goal 1 (first eigen-direction)
     quiz "diagonal matrices"    → capstone goal 2 (second eigen-direction;
                                    "in the eigenbasis M IS diagonal")
     quiz "PCA connection"       → capstone goal 3 (the DOMINANT direction —
                                    the one PCA would keep)
   Mid-lesson scenes carry these three tags on the concept they drill.

   NO INSET FRAME this wave (Amendment v1.6 §2 — lands in parallel on
   ai/p2-kit-inset; scenes here use only the main space).

   CAPSTONE RANDOMIZATION: `eigenMatrix(lambda1, lambda2, phi)` builds a
   symmetric matrix BY CONSTRUCTION from a target eigen-pair (spectral
   form M = λ1·d1·d1ᵀ + λ2·d2·d2ᵀ) — no numerical solve, so the target is
   exact and the baseline-safety proof is closed-form (see the comment by
   `randomize` below), verified both analytically and by exhaustive
   enumeration of the small finite (λ1,λ2,φ) domain in the test suite
   (P2 wave-A insight: exhaustion beats seed-sampling for small finite
   randomize() domains).
   ================================================================ */
import {
  registerScene, vec, makeRng, handle, slider,
  grid, vector, point, segment, label, angleArc, curve,
  goal,
} from '../../scene/index.js';
import {
  angleDeg, dot, norm, scale, add, cos, matApply,
  eigSym2, eigenMatrix, isAligned, eigRatio,
  minMagConstraint, circleConstraint, covOf, projectedVariance, mapRange,
} from './vec-math.js';

const LESSON = 'la-eigen';
const f2 = (x) => x.toFixed(2);
const deg = (rad) => Math.round((rad * 180) / Math.PI);

// Anti-gaming floor (mirrors la-matrix): a draggable v can't be shrunk to
// (near-)nothing to fake alignment — clamped to mag ≥ MIN_MAG at the handle
// (layer 1); isAligned() re-checks the SAME floor inside every predicate
// (layer 2, defense in depth against a handle bypassed by a direct snapshot).
const MIN_MAG = 0.5;
const onMinMag = minMagConstraint(MIN_MAG);

/* ---- 1. ANATOMY: Mv = λv on a fixed symmetric matrix ----------- */
/* Micro-idea: most directions get knocked off course by M; two special
   ones (the eigen-directions) only get stretched. M = [[2,1],[1,2]] is
   the classic teaching matrix (same skeleton as the old lab) — symmetric,
   so its eigen-directions are guaranteed real and perpendicular. Owns
   "eigen definition". */
const M1 = { col1: vec(2, 1), col2: vec(1, 2) };            // [[2,1],[1,2]]
const M1_EIG = eigSym2(2, 1, 2);                            // λ=3 along [1,1], λ=1 along [1,-1]
const M1_LINE1 = [scale(M1_EIG.dir1, -5), scale(M1_EIG.dir1, 5)];
const M1_LINE2 = [scale(M1_EIG.dir2, -5), scale(M1_EIG.dir2, 5)];
const M1apply = (v) => matApply(M1.col1, M1.col2, v);
registerScene({
  id: 'eigen.anatomy',
  lesson: LESSON,
  space: 'plane2',
  params: { v: vec(1, 0.6) },                               // off both eigen-directions
  entities: (p) => {
    const Mv = M1apply(p.v);
    return [
      grid({ color: 'muted' }),
      segment(M1_LINE1[0], M1_LINE1[1], { color: 'muted', dashed: true, label: 'eigen-dir 1' }),
      segment(M1_LINE2[0], M1_LINE2[1], { color: 'muted', dashed: true, label: 'eigen-dir 2' }),
      vector(p.v, { color: 'accent', label: 'v', handle: handle('v', { constrain: onMinMag }) }),
      vector(Mv, { color: 'good', label: 'Mv', key: 'mv' }),
      angleArc(p.v, Mv, { color: 'warn', label: 'θ', key: 'arc' }),
      label('M = [2 1; 1 2]    v = [' + f2(p.v.x) + ', ' + f2(p.v.y) + ']    Mv = [' + f2(Mv.x) + ', ' + f2(Mv.y) + ']    angle(v,Mv) = ' + Math.round(angleDeg(p.v, Mv)) + '°', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Find the STRETCH eigen-direction: drag v so Mv points the same way, ×3 as long, to see how finding this direction is the first step toward diagonalizing M — reducing repeated applications of the matrix to nothing but repeated scalar multiplication',
      (s) => { const Mv = M1apply(s.v); return isAligned(s.v, Mv, { minMag: MIN_MAG }) && Math.abs(eigRatio(s.v, Mv) - 3) < 0.3; },
      { xp: 20, hold: 500, tag: 'eigen definition',
        focus: 'M·v = λ·v: an eigenvector only gets stretched, never rotated. Along [1,1] this M stretches everything ×3.' }),
    goal('Find the OTHER eigen-direction: Mv points the same way, but UNCHANGED in length (λ=1), to see how a second, perpendicular eigen-direction can carry an entirely different stretch factor',
      (s) => { const Mv = M1apply(s.v); return isAligned(s.v, Mv, { minMag: MIN_MAG }) && Math.abs(eigRatio(s.v, Mv) - 1) < 0.2; },
      { xp: 20, hold: 500, tag: 'eigen definition',
        focus: 'Every symmetric matrix has a SECOND eigen-direction, perpendicular to the first. Here, along [1,−1], v passes straight through unchanged.' }),
    goal('Now break it: pick a direction where M rotates v by more than 15°, to see how almost every direction gets rotated off course — eigenvectors are the rare exception',
      (s) => angleDeg(s.v, M1apply(s.v)) > 15,
      { xp: 15, tag: 'eigen definition',
        focus: 'Almost every direction gets knocked off course — that is the generic case. The two eigen-directions are the rare exceptions.' }),
  ],
  caption: 'Drag v and watch Mv. Most directions swing away — find the two special ones where Mv keeps pointing along v (an eigenvector), one stretched ×3, one unchanged.',
});

/* ---- 2. DIAGONAL: for a triangular matrix, eigenvalues = diagonal --- */
/* Micro-idea: M = [[a,b],[0,d]] — î = [1,0] is ALWAYS an eigenvector
   (M·î = [a,0] = a·î) no matter what b is; its eigenvalue is exactly the
   top-left entry. b only tilts the OTHER eigenvector, never the values.
   Directly reproduces the old quiz's M = [[4,7],[0,3]]. Owns "diagonal
   matrices". */
const M2v = (s) => matApply(vec(s.a, 0), vec(s.b, s.d), s.v);
registerScene({
  id: 'eigen.diagonal',
  lesson: LESSON,
  space: 'plane2',
  params: { a: 1, b: 0, d: 2, v: vec(1, 0.6) },
  controls: [
    slider('a', { min: -2, max: 5, step: 0.1, label: 'a (top-left)' }),
    slider('b', { min: -2, max: 5, step: 0.1, label: 'b (off-diagonal)' }),
    slider('d', { min: -2, max: 5, step: 0.1, label: 'd (bottom-right)' }),
  ],
  entities: (p) => {
    const col1 = vec(p.a, 0), col2 = vec(p.b, p.d);
    const Mv = matApply(col1, col2, p.v);
    return [
      grid({ matrix: [col1.x, col2.x, col1.y, col2.y], color: 'muted' }),
      vector(col1, { color: 'muted', label: 'î→', key: 'c1' }),
      vector(col2, { color: 'muted', label: 'ĵ→', key: 'c2' }),
      vector(p.v, { color: 'accent', label: 'v', handle: handle('v', { constrain: onMinMag }) }),
      vector(Mv, { color: 'good', label: 'Mv', key: 'mv' }),
      label('M = [' + f2(p.a) + ' ' + f2(p.b) + ' ; 0 ' + f2(p.d) + ']    eigenvalues (triangular) = ' + f2(p.a) + ', ' + f2(p.d), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Reproduce the textbook matrix: set a = 4 and d = 3 (b stays free) — read the eigenvalues off the diagonal, to see how a triangular matrix’s eigenvalues sit in plain sight, with no characteristic polynomial needed',
      (s) => Math.abs(s.a - 4) < 0.15 && Math.abs(s.d - 3) < 0.15,
      { xp: 20, hold: 400, tag: 'diagonal matrices',
        focus: 'For a triangular matrix the eigenvalues are exactly the diagonal entries — no characteristic polynomial needed.' }),
    goal('Confirm it: with a ≈ 4, align v with î — that direction is ALWAYS an eigenvector of a triangular matrix, to see how the first standard basis vector is guaranteed to be an eigenvector whenever a matrix is triangular, with no equation-solving required',
      (s) => Math.abs(s.a - 4) < 0.15 && isAligned(s.v, M2v(s), { minMag: MIN_MAG }) && Math.abs(eigRatio(s.v, M2v(s)) - s.a) < 0.2,
      { xp: 25, hold: 500, tag: 'diagonal matrices',
        focus: 'M·[1,0] = [a, 0] = a·[1,0] — î never rotates for a triangular matrix, whatever b is; the top-left entry IS its eigenvalue.' }),
    goal('Now push b past 3 while a stays at 4 and d at 3 — the shear grows but NEITHER eigenvalue moves, to see how the off-diagonal entry steers the eigenVECTORS while leaving the eigenVALUES exactly where they started',
      (s) => s.b > 3 && Math.abs(s.a - 4) < 0.15 && Math.abs(s.d - 3) < 0.15,
      { xp: 20, hold: 400, tag: 'diagonal matrices',
        focus: 'The off-diagonal entry steers the eigenVECTORS (tilts the other one) — it never touches the eigenVALUES, which stay pinned to the diagonal.' }),
  ],
  caption: 'Set a and d, then drag v. î is always an eigenvector of this triangular matrix — its eigenvalue is just the top-left entry a, whatever b is doing.',
});

/* ---- 3. HUNT: a harder matrix, no hints; signed eigenvalues -------- */
/* Micro-idea: M = [[3,1],[1,0]] is indefinite — one eigenvalue positive
   (a stretch), one NEGATIVE (a flip: Mv points exactly opposite v). The
   SIGN of cos(v,Mv) is the sign of λ. This is the "saddle point" shape
   the ml box mentions (Hessian eigenvalues: valley vs. saddle). Owns
   "eigen definition" (the harder, no-hints half). */
const M3 = { col1: vec(3, 1), col2: vec(1, 0) };            // [[3,1],[1,0]]
const M3_EIG = eigSym2(3, 1, 0);                            // λ≈3.30 (stretch), λ≈−0.30 (flip)
const M3apply = (v) => matApply(M3.col1, M3.col2, v);
registerScene({
  id: 'eigen.hunt',
  lesson: LESSON,
  space: 'plane2',
  params: { v: vec(1, 0.15) },
  entities: (p) => {
    const Mv = M3apply(p.v);
    return [
      grid({ color: 'muted' }),
      vector(p.v, { color: 'accent', label: 'v', handle: handle('v', { constrain: onMinMag }) }),
      vector(Mv, { color: 'good', label: 'Mv', key: 'mv' }),
      angleArc(p.v, Mv, { color: 'warn', label: 'θ', key: 'arc' }),
      label('M = [3 1; 1 0]    ratio Mv/v = ' + f2(eigRatio(p.v, Mv)) + ' (sign = direction: + same way, − flipped)', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Find the STRETCH direction (positive λ ≈ 3.30): Mv points the SAME way as v, to see how a positive eigenvalue stretches a vector without ever reversing its direction',
      (s) => { const Mv = M3apply(s.v); return isAligned(s.v, Mv, { minMag: MIN_MAG }) && Math.abs(eigRatio(s.v, Mv) - M3_EIG.lambda1) < 0.3; },
      { xp: 25, hold: 500, tag: 'eigen definition',
        focus: 'A positive eigenvalue means Mv keeps pointing the same way as v, just longer — a genuine stretch.' }),
    goal('Find the FLIP direction (negative λ ≈ −0.30): Mv points OPPOSITE to v, to see how a negative eigenvalue flips a vector’s direction while leaving its eigen-line fixed — the saddle-point shape a Hessian shows near a non-minimum',
      (s) => { const Mv = M3apply(s.v); return isAligned(s.v, Mv, { minMag: MIN_MAG }) && Math.abs(eigRatio(s.v, Mv) - M3_EIG.lambda2) < 0.2; },
      { xp: 25, hold: 500, tag: 'eigen definition',
        focus: 'A NEGATIVE eigenvalue reverses direction — Mv points exactly backwards along v. One positive, one negative λ is a saddle shape (the Hessian case).' }),
    goal('Break alignment: pick a direction where M rotates v by more than 30°, to see how most directions still swing away from v even without hint lines — eigen-directions stay the rare exception',
      (s) => angleDeg(s.v, M3apply(s.v)) > 30,
      { xp: 15, tag: 'eigen definition',
        focus: 'With no hint lines this time — most directions still swing well away from v; only the two eigen-directions don’t.' }),
  ],
  caption: 'A harder matrix, no guide lines. One eigen-direction stretches v (positive λ); the other flips it backwards (negative λ) — read the sign off which way Mv points.',
});

/* ---- 4. ORTHOGONAL: the spectral theorem ---------------------- */
/* Micro-idea: TWO draggable vectors, each locked to a circle (angle-only)
   on the SAME symmetric M. Send one to each eigen-direction and the angle
   between them locks to 90° — a symmetric matrix's eigenvectors are
   ALWAYS perpendicular. This is exactly why PCA's principal axes come
   out orthogonal. g1/g2 own "eigen definition"; g3 (the orthogonality
   payoff) owns "PCA connection". */
const CIRC_R = 2;
const onCircle = circleConstraint(CIRC_R);
registerScene({
  id: 'eigen.orthogonal',
  lesson: LESSON,
  space: 'plane2',
  params: { v1: vec(CIRC_R, 0), v2: vec(0, CIRC_R) },
  entities: (p) => {
    const Mv1 = M1apply(p.v1), Mv2 = M1apply(p.v2);
    const ortho = Math.abs(dot(norm(p.v1), norm(p.v2)));
    return [
      grid({ color: 'muted' }),
      segment(M1_LINE1[0], M1_LINE1[1], { color: 'muted', dashed: true, label: 'eigen-dir 1' }),
      segment(M1_LINE2[0], M1_LINE2[1], { color: 'muted', dashed: true, label: 'eigen-dir 2' }),
      vector(p.v1, { color: 'accent', label: 'v1', handle: handle('v1', { constrain: onCircle }) }),
      vector(p.v2, { color: 'accent2', label: 'v2', handle: handle('v2', { constrain: onCircle }) }),
      point(Mv1, { color: 'good', label: 'Mv1', key: 'mv1' }),
      point(Mv2, { color: 'good', label: 'Mv2', key: 'mv2' }),
      label('angle(v1,v2) = ' + Math.round(angleDeg(p.v1, p.v2)) + '°    |cos(v1,v2)| = ' + f2(ortho), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Send v1 to the STRETCH eigen-direction (ratio ≈ 3), to see how the same eigen-relationship from before still holds when v is locked to a fixed length',
      (s) => { const Mv = M1apply(s.v1); return isAligned(s.v1, Mv, { minMag: MIN_MAG }) && Math.abs(eigRatio(s.v1, Mv) - 3) < 0.3; },
      { xp: 20, hold: 500, tag: 'eigen definition',
        focus: 'Same relation as scene 1, now on a vector you can only rotate (fixed length) — the direction is all that matters.' }),
    goal('Send v2 to the OTHER eigen-direction (ratio ≈ 1), to see how a symmetric matrix is GUARANTEED a second real eigen-direction at a right angle to the first — never oblique, never missing',
      (s) => { const Mv = M1apply(s.v2); return isAligned(s.v2, Mv, { minMag: MIN_MAG }) && Math.abs(eigRatio(s.v2, Mv) - 1) < 0.2; },
      { xp: 20, hold: 500, tag: 'eigen definition',
        focus: 'The second eigen-direction is perpendicular to the first — you are about to see that land exactly on 90°.' }),
    goal('With both aligned, confirm they sit at 90° — a symmetric matrix’s eigenvectors are always perpendicular, to see how this orthogonality is exactly what lets PCA and SVD decompose data along independent, uncorrelated axes',
      (s) => { const Mv1 = M1apply(s.v1), Mv2 = M1apply(s.v2);
        return isAligned(s.v1, Mv1, { minMag: MIN_MAG }) && isAligned(s.v2, Mv2, { minMag: MIN_MAG })
          && Math.abs(dot(norm(s.v1), norm(s.v2))) < 0.05; },
      { xp: 25, hold: 500, tag: 'PCA connection',
        focus: 'This is exactly why PCA’s principal axes come out at right angles: the covariance matrix is symmetric, so the spectral theorem guarantees orthogonal eigenvectors.' }),
  ],
  caption: 'Two vectors, each free to rotate but not stretch. Send one to each eigen-direction of the same matrix — the angle between them locks to 90°.',
});

/* ---- 5. PCA: the max-variance direction IS the top eigenvector ----- */
/* Micro-idea: a small, fixed, mean-zero data cloud; rotate a projection
   axis with a slider and watch the variance of the projected points. The
   angle that MAXIMIZES variance is exactly the top eigenvector of the
   cloud's covariance matrix — the actual PCA computation, made literal.
   Owns "PCA connection". */
const PCA_A = vec(2, 1), PCA_B = vec(0.3, -1);
const PCA_POINTS = [PCA_A, scale(PCA_A, -1), PCA_B, scale(PCA_B, -1)];
const PCA_COV = covOf(PCA_POINTS);
const PCA_EIG = eigSym2(PCA_COV.a, PCA_COV.b, PCA_COV.c);   // lambda1 ALWAYS >= lambda2 (eigSym2 guarantee)
const PCA_AVG = (PCA_EIG.lambda1 + PCA_EIG.lambda2) / 2;    // mean variance over all directions (trace/2)
// INSET GAUGE (P2 wave C, Amendment v1.7 §2 — flagship-content.md:132's filed
// wish): a small variance-vs-angle plot alongside the main projection view.
// θ ranges over the slider's [-π/2, π/2] domain; mapped to inset x in
// [-1,1]. Variance is re-centered on PCA_AVG (the trace/2 mean) so the plot
// spans exactly ±(lambda1-lambda2)/2 ≈ ±1.0 — symmetric around inset y=0 by
// construction (eigSym2: lambda1=mid+rad, lambda2=mid-rad, so lambda-avg =
// ±rad for the two extremes), matching a 1.1 inset extent with a small
// margin. READ-ONLY: no handle in the inset — the slider stays the only
// control, in the main space, exactly as before. Semantics-preserving:
// params/goals/predicates/tags/caption below are BYTE-IDENTICAL to the
// pre-inset scene; only the inset declaration + two inset entities are new.
const thetaToInsetX = (th) => mapRange(th, -Math.PI / 2, Math.PI / 2, -1, 1);
const insetXToTheta = (x) => mapRange(x, -1, 1, -Math.PI / 2, Math.PI / 2);
registerScene({
  id: 'eigen.pca',
  lesson: LESSON,
  space: 'plane2',
  params: { theta: 0 },
  controls: [slider('theta', { min: -Math.PI / 2, max: Math.PI / 2, step: 0.02, label: 'axis angle', format: (v) => deg(v) + '°' })],
  inset: { rect: [0.62, 0.05, 0.33, 0.33], extent: 1.1 },
  entities: (p) => {
    const dir = vec(Math.cos(p.theta), Math.sin(p.theta));
    const v = projectedVariance(PCA_COV, p.theta);
    return [
      grid({ color: 'muted' }),
      segment(scale(dir, -4), scale(dir, 4), { color: 'accent', label: 'axis' }),
      ...PCA_POINTS.map((pt, i) => {
        const foot = scale(dir, dot(pt, dir));
        return [
          point(pt, { color: 'accent2', label: i === 0 ? '● data' : '●', key: 'pt' + i }),
          segment(pt, foot, { color: 'muted', dashed: true, key: 'drop' + i }),
        ];
      }).flat(),
      label('θ = ' + deg(p.theta) + '°    variance = ' + f2(v) + ' (range ' + f2(PCA_EIG.lambda2) + '–' + f2(PCA_EIG.lambda1) + ')', { at: 'readout' }),
      // gauge: the theoretical variance(θ)-minus-average reference curve,
      // plus a live trace dot at the current slider angle.
      curve((x) => projectedVariance(PCA_COV, insetXToTheta(x)) - PCA_AVG, { domain: [-1, 1], frame: 'inset', color: 'muted' }),
      point(vec(thetaToInsetX(p.theta), v - PCA_AVG), { frame: 'inset', color: 'good', key: 'trace' }),
      label('variance vs θ', { at: vec(-0.95, 1.0), frame: 'inset', color: 'muted' }),
    ];
  },
  goals: [
    goal('Rotate the axis to MAXIMIZE the spread of the projected points — this finds the TOP principal component',
      (s) => projectedVariance(PCA_COV, s.theta) > PCA_EIG.lambda1 - 0.05,
      { xp: 25, hold: 500, tag: 'PCA connection',
        focus: 'The variance-maximizing direction IS the top eigenvector of the data’s covariance matrix — the entire PCA computation, done by eye.' }),
    goal('Now MINIMIZE it — find the direction PCA would DISCARD',
      (s) => projectedVariance(PCA_COV, s.theta) < PCA_EIG.lambda2 + 0.05,
      { xp: 20, hold: 500, tag: 'PCA connection',
        focus: 'The smallest-eigenvalue direction carries the least variance — the information PCA throws away when it compresses.' }),
    goal('Find an in-between angle where the variance equals the AVERAGE of the two extremes, to see how variance changes smoothly with angle between the best and worst directions',
      (s) => Math.abs(projectedVariance(PCA_COV, s.theta) - PCA_AVG) < 0.05,
      { xp: 15, hold: 400, tag: 'PCA connection',
        focus: 'Variance changes smoothly with angle — somewhere between the best and worst direction it crosses their average exactly.' }),
  ],
  caption: 'Slide the axis angle and watch the dashed drop-lines spread or bunch. The angle that spreads them the MOST is the data’s top principal component.',
});

/* ---- 6. POWER ITERATION: v_k = normalize(Mᵏv₀) → dominant direction --- */
/* Micro-idea: applying M over and over and renormalizing swings ANY
   (non-orthogonal-to-dominant) start onto the dominant eigen-direction —
   the core of PageRank/power methods. Two fixed matrices SHARE the dominant
   direction [1,1] (both are a=d symmetric): the lesson's own M1 (λ=3,1 —
   wide gap) and a new SLOW (λ=1.1,0.9 — narrow gap). A single slider k
   drives BOTH at once so the gap's effect on SPEED is directly comparable
   at the same k. v_k is computed in closed form from the eigen-decomposition
   (no iterative drift, and v_k is unit-length by construction — no vanishing-
   vector exploit is even possible here). Owns "PCA connection" (the dominant-
   direction/PageRank tie) and "eigen definition" (convergence needs
   |λ1|>|λ2|, guaranteed by construction for both matrices here). */
const SLOW_EIG = eigSym2(1, 0.1, 1);                        // λ1=1.1, λ2=0.9 — narrow gap, same [1,1]
const POWER_DOM = norm({ x: 1, y: 1 });                     // dominant direction shared by both matrices
const POWER_V0 = { x: Math.cos(Math.PI / 12), y: Math.sin(Math.PI / 12) };  // 15° off-axis: not orthogonal, not pre-aligned
// M^k v0 in closed form: v0 = c1·dir1 + c2·dir2 (its components along the
// two eigen-directions), so Mᵏv0 = λ1ᵏ·c1·dir1 + λ2ᵏ·c2·dir2 exactly — the
// textbook reason power iteration converges (the λ1ᵏ term dominates once
// |λ1|>|λ2|), with no iterative matApply loop and no floating drift.
function powerVec(eig, v0, k) {
  const c1 = dot(v0, eig.dir1), c2 = dot(v0, eig.dir2);
  return norm(add(scale(eig.dir1, Math.pow(eig.lambda1, k) * c1), scale(eig.dir2, Math.pow(eig.lambda2, k) * c2)));
}
registerScene({
  id: 'eigen.power',
  lesson: LESSON,
  space: 'plane2',
  params: { k: 0 },
  controls: [slider('k', { min: 0, max: 12, step: 1, label: 'k (times M is applied)', format: (v) => 'k=' + Math.round(v) })],
  entities: (p) => {
    const vFast = powerVec(M1_EIG, POWER_V0, p.k);
    const vSlow = powerVec(SLOW_EIG, POWER_V0, p.k);
    return [
      grid({ color: 'muted' }),
      segment(scale(POWER_DOM, -4), scale(POWER_DOM, 4), { color: 'warn', dashed: true, label: 'dominant direction' }),
      vector(vSlow, { color: 'accent2', label: 'slow (narrow gap)', key: 'slow' }),
      vector(vFast, { color: 'accent', label: 'fast (wide gap)', key: 'fast' }),
      label('k = ' + p.k + '    fast: cos(v_k, dom) = ' + f2(cos(vFast, POWER_DOM)) + '    slow: cos(v_k, dom) = ' + f2(cos(vSlow, POWER_DOM)), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Push k up until the FAST vector locks onto the dashed dominant direction (v_k = normalize(Mᵏv₀)), to see how repeatedly applying a matrix and renormalizing converges onto its dominant eigenvector — the same core trick PageRank uses to rank an entire web graph without ever solving for an eigenvector directly',
      (s) => isAligned(powerVec(M1_EIG, POWER_V0, s.k), POWER_DOM, { cosMin: 0.995 }),
      { xp: 20, hold: 500, tag: 'PCA connection',
        focus: 'Power iteration: apply M and renormalize, repeatedly. The component along the dominant eigenvector grows fastest, so the direction converges there — as long as the start has some (any) component along it.' }),
    goal('At the SAME k, catch the fast vector already locked on while the slow vector is still visibly adrift, to see how a wider gap between the two eigenvalues makes power iteration converge in far fewer applications of M',
      (s) => isAligned(powerVec(M1_EIG, POWER_V0, s.k), POWER_DOM, { cosMin: 0.995 })
        && !isAligned(powerVec(SLOW_EIG, POWER_V0, s.k), POWER_DOM, { cosMin: 0.99 }),
      { xp: 25, hold: 500, tag: 'eigen definition',
        focus: 'Convergence speed depends on the RATIO |λ2/λ1| — the smaller that ratio, the faster it decays to zero. A wide gap between the eigenvalues means fewer applications of M are needed.' }),
    goal('Now push k high enough that even the slow, narrow-gap vector converges too, to see how convergence is guaranteed whenever the dominant eigenvalue is strictly larger in magnitude — a narrow gap just means many more applications before it shows up',
      (s) => isAligned(powerVec(SLOW_EIG, POWER_V0, s.k), POWER_DOM, { cosMin: 0.995 }),
      { xp: 25, hold: 600, tag: 'eigen definition',
        focus: 'M·v = λ·v guarantees convergence whenever |λ1| > |λ2|, however close the two eigenvalues are — "narrow gap" changes the speed, never whether it eventually converges.' }),
  ],
  caption: 'Slide k to apply M repeatedly and renormalize: v_k = normalize(Mᵏv₀). Both vectors swing onto the dashed dominant direction, but the wide-gap one gets there in far fewer steps than the narrow-gap one.',
});

/* ---- 7. TRACE/DET: steer (λ1,λ2) via trace and det; the real boundary --- */
/* Micro-idea: for ANY 2×2, λ1+λ2 = trace and λ1·λ2 = det, so
   λ = (tr ± √(tr²−4·det))/2 — eigenvalues from two numbers, no
   characteristic-polynomial factoring. Sliders drive trace and det
   directly; a third slider φ spins the live eigen-axis by feeding
   (λ1,λ2,φ) into the EXISTING eigenMatrix() spectral-form builder (the
   same one the capstone uses) — the axis angle is a genuinely free,
   continuously-moving knob, never hard-coded to ±45°. tr²−4·det ≥ 0 is
   required for λ to be real; a genuinely SYMMETRIC matrix always clears
   that bar (tr²−4·det = (a−d)²+4b² ≥ 0 identically), but THIS scene's
   (trace,det) pair is free-standing, so it can wander past the boundary —
   surfaced honestly (no distortion grid, a "complex eigenvalues" readout)
   rather than clamped away. Owns "diagonal matrices" (eigenvalues from a
   closed form, no solving), "eigen definition" (the reality boundary
   itself), and "PCA connection" (the axis angle as an independent knob,
   exactly like a rotating principal axis). */
function eigFromTraceDet(T, D) {
  const disc = T * T - 4 * D;
  if (disc < 0) return null;
  const r = Math.sqrt(disc);
  return { lambda1: (T + r) / 2, lambda2: (T - r) / 2, disc };
}
registerScene({
  id: 'eigen.tracedet',
  lesson: LESSON,
  space: 'plane2',
  params: { trace: 3, det: 1, phi: 0.3 },
  controls: [
    slider('trace', { min: -2, max: 6, step: 0.2, label: 'trace (λ1+λ2)' }),
    slider('det', { min: -4, max: 6, step: 0.2, label: 'det (λ1·λ2)' }),
    slider('phi', { min: 0, max: Math.PI, step: 0.02, label: 'eigen-axis angle φ', format: (v) => deg(v) + '°' }),
  ],
  entities: (p) => {
    const eig = eigFromTraceDet(p.trace, p.det);
    if (!eig) {
      return [
        grid({ color: 'muted' }),
        label('trace = ' + f2(p.trace) + '    det = ' + f2(p.det) + '    tr²−4·det = ' + f2(p.trace * p.trace - 4 * p.det) + ' < 0  →  complex eigenvalues, no real eigen-axis here', { at: 'readout' }),
      ];
    }
    const { col1, col2, dir1, dir2 } = eigenMatrix(eig.lambda1, eig.lambda2, p.phi);
    return [
      grid({ matrix: [col1.x, col2.x, col1.y, col2.y], color: 'muted' }),
      segment(scale(dir1, -5), scale(dir1, 5), { color: 'warn', dashed: true, label: 'eigen-axis 1' }),
      segment(scale(dir2, -5), scale(dir2, 5), { color: 'warn', dashed: true, label: 'eigen-axis 2' }),
      label('trace = ' + f2(p.trace) + '    det = ' + f2(p.det) + '    λ1 = ' + f2(eig.lambda1) + '    λ2 = ' + f2(eig.lambda2) + '    axis θ = ' + deg(p.phi) + '°', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Steer trace and det so the eigenvalues land on λ1 = 4 and λ2 = 1 — read them straight off (tr ± √(tr²−4·det))/2, to see how a 2×2’s eigenvalues are fully determined by just two numbers, with no characteristic-polynomial factoring required',
      (s) => { const e = eigFromTraceDet(s.trace, s.det); return !!e && Math.abs(e.lambda1 - 4) < 0.15 && Math.abs(e.lambda2 - 1) < 0.15; },
      { xp: 20, hold: 500, tag: 'diagonal matrices',
        focus: 'λ1+λ2 = trace, λ1·λ2 = det — solve λ² − trace·λ + det = 0 and you have both eigenvalues without ever writing down an eigenvector.' }),
    goal('Push det up (or trace down) until tr² < 4·det — cross the boundary where the eigenvalues stop being real numbers, to see how the single number tr²−4·det decides whether a matrix even HAS a real eigen-direction to find',
      (s) => s.trace * s.trace < 4 * s.det - 0.1,
      { xp: 20, hold: 500, tag: 'eigen definition',
        focus: 'tr²−4·det ≥ 0 is required for real eigenvalues. A genuinely symmetric matrix always clears this bar by identity — this slider pair can walk right up to (and past) the line so you can see where it actually lives.' }),
    goal('With the eigenvalues kept clearly distinct, rotate the live eigen-axis to φ ≈ 2.0 rad, to see how the eigen-axis ANGLE is an independent knob from the eigenvalues themselves — exactly like reorienting a whole covariance ellipse in space while its two principal-axis VARIANCES (the eigenvalues) stay exactly what they were',
      (s) => { const e = eigFromTraceDet(s.trace, s.det); return !!e && (e.lambda1 - e.lambda2) > 1.0 && Math.abs(s.phi - 2.0) < 0.05; },
      { xp: 25, hold: 500, tag: 'PCA connection',
        focus: 'θ = ½·atan2(2b, a−d) moves continuously with the matrix’s shape — never pinned to 45°. (A repeated eigenvalue makes EVERY direction an eigenvector, so this goal requires λ1 and λ2 to stay genuinely apart — otherwise "the" axis angle would be meaningless.)' }),
  ],
  caption: 'Steer trace and det to place the two eigenvalues, and φ to spin the live eigen-axes onto them. Push det high enough (or trace low enough) and tr²−4·det goes negative — the eigenvalues stop being real at all.',
});

/* ---- 8. CAPSTONE: reproduce a randomized eigen-pair ---------------- */
/* THE EXAM. `eigenMatrix(lambda1, lambda2, phi)` builds M BY CONSTRUCTION
   from a target eigen-pair (spectral form), so the two target directions
   are exact, not solved-for. Baseline-safety proof (v resets to [1,0]):

     Mv = M·[1,0] = mcol1 = (A, B) where
       A = λ1·cos²φ + λ2·sin²φ   (a weighted average of λ1,λ2 — bounded
                                   by min/max of the two)
       B = (λ1−λ2)/2 · sin(2φ)

     cos(v, Mv) = A / √(A²+B²); danger (≥ cosMin=0.995) needs |A/B| ≥ 9.96.
     Our PHI set gives |sin(2φ)| = √3/2 EXACTLY for every entry, and the
     minimum |λ1−λ2| across LAMBDAS is 0.8, so |B| ≥ 0.346 always; A is
     bounded by max(|λ|) = 2.2. Enumerating all 4×3 ordered λ-pairs × 8
     φ values (test suite does this exhaustively) the worst observed
     |A/B| is ≈5.8 — well under the 9.96 danger line. No target is ever
     pre-satisfied, for any seed, by construction (not by sampling).
   Three targets carry the migrated weak-area tags. No hints. */
const LAMBDAS = [0.6, 1.4, 2.2, -1.0];                      // 4 distinct magnitudes: .6/1.0/1.4/2.2
const PHI_DEG = [30, 60, 120, 150, 210, 240, 300, 330];     // |sin 2φ| = √3/2 for every entry
const V_RESET = vec(1, 0);
function randomize(rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const i1 = Math.floor(rng() * LAMBDAS.length);
  const i2 = (i1 + 1 + Math.floor(rng() * (LAMBDAS.length - 1))) % LAMBDAS.length;   // guaranteed != i1
  const lambda1 = LAMBDAS[i1], lambda2 = LAMBDAS[i2];
  const phi = (pick(PHI_DEG) * Math.PI) / 180;
  const { col1, col2, dir1, dir2 } = eigenMatrix(lambda1, lambda2, phi);
  return { v: V_RESET, mcol1: col1, mcol2: col2, tDir1: dir1, tLambda1: lambda1, tDir2: dir2, tLambda2: lambda2 };
}
registerScene({
  id: 'eigen.capstone',
  lesson: LESSON,
  capstone: true,
  randomize,
  space: 'plane2',
  params: randomize(makeRng(1)),
  entities: (p) => {
    const Mv = matApply(p.mcol1, p.mcol2, p.v);
    return [
      grid({ matrix: [p.mcol1.x, p.mcol2.x, p.mcol1.y, p.mcol2.y], color: 'muted' }),
      segment(scale(p.tDir1, -4), scale(p.tDir1, 4), { color: 'warn', dashed: true, label: 'target 1' }),
      segment(scale(p.tDir2, -4), scale(p.tDir2, 4), { color: 'warn', dashed: true, label: 'target 2' }),
      vector(p.v, { color: 'accent', label: 'v', handle: handle('v', { constrain: onMinMag }) }),
      vector(Mv, { color: 'good', label: 'Mv', key: 'mv' }),
      angleArc(p.v, Mv, { color: 'warn', label: 'θ', key: 'arc' }),
      label('v = [' + f2(p.v.x) + ', ' + f2(p.v.y) + ']    Mv = [' + f2(Mv.x) + ', ' + f2(Mv.y) + ']    ratio = ' + f2(eigRatio(p.v, Mv)), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Find the FIRST eigen-direction (dashed target 1): align v with it and hold, to see how aligning v with an eigen-direction is the defining test M·v = λ·v',
      (s) => { const Mv = matApply(s.mcol1, s.mcol2, s.v); return isAligned(s.v, Mv, { minMag: MIN_MAG }) && Math.abs(eigRatio(s.v, Mv) - s.tLambda1) < 0.25; },
      { xp: 40, hold: 700, tag: 'eigen definition',
        focus: 'M·v = λ·v: rotate v until Mv snaps onto the same line — that line is an eigen-direction, and the stretch factor is its eigenvalue.' }),
    goal('Find the SECOND eigen-direction (dashed target 2): align v with it and hold, to see how in the eigenbasis this matrix acts as pure diagonal scaling',
      (s) => { const Mv = matApply(s.mcol1, s.mcol2, s.v); return isAligned(s.v, Mv, { minMag: MIN_MAG }) && Math.abs(eigRatio(s.v, Mv) - s.tLambda2) < 0.25; },
      { xp: 40, hold: 700, tag: 'diagonal matrices',
        focus: 'In the basis formed by the two eigen-directions, this matrix IS diagonal — its only entries are these two eigenvalues.' }),
    goal('Find the DOMINANT eigen-direction — the one with the LARGER |eigenvalue| (the top principal component)',
      (s) => { const dom = Math.abs(s.tLambda1) >= Math.abs(s.tLambda2) ? s.tLambda1 : s.tLambda2;
        const Mv = matApply(s.mcol1, s.mcol2, s.v); return isAligned(s.v, Mv, { minMag: MIN_MAG }) && Math.abs(eigRatio(s.v, Mv) - dom) < 0.25; },
      { xp: 40, hold: 700, tag: 'PCA connection',
        focus: 'If this were a covariance matrix, this is the direction PCA keeps — the one carrying the most variance.' }),
  ],
  caption: 'No hints now. Rotate v onto target 1, then target 2, then the dominant (larger-|λ|) direction, holding each steady. This is the exam.',
});
