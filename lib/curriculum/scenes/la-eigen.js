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
     6 eigen.capstone   randomized target eigen-pair, no hints

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
  angleDeg, dot, norm, scale, matApply,
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

/* ---- 6. CAPSTONE: reproduce a randomized eigen-pair ---------------- */
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
