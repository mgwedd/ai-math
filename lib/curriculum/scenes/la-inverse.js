/* ================================================================
   SCENE LESSON — la-inverse (Solving Ax = b & the Inverse).
   ----------------------------------------------------------------
   P2 wave K migration. Converts the old one-lab / four-quiz la-inverse
   (lib/curriculum/extra.js, INTERACTIVES.lainverse) into SIX scenes
   ending in a randomized capstone that IS the exam, following
   docs/AUTHORING_SCENES.md and the la-det/la-eigen pattern.

   THE ONE IDEA: A⁻¹ is the transformation that exactly undoes A; it
   exists iff det ≠ 0, and solving Ax = b IS applying A⁻¹ to b. When
   det = 0 the outputs collapse onto a line: off-line targets are
   unreachable, and on-line targets are hit by infinitely many inputs.

   Scenes are DATA + PURE PREDICATES. Zero renderer imports. This wave is
   ADDITIVE — the lesson keeps its `interactive:'lainverse'` lab and quiz
   untouched; the arc is added as `scenes:[...]` (mirrors every prior
   migration).

   ARC (solve by feel → build the undo → reciprocals → the det≠0 gate →
        singular collapse → capstone):
     1 inverse.solve    A fixed invertible (the old lab's [[2,1],[1,1]],
                        det = 1); drag the input x until Ax covers each
                        gold target — computing A⁻¹b by feel
     2 inverse.undo     build A⁻¹ by hand: drag B's two columns until
                        B·A reads the identity (warm-up: undo A on one
                        test vector — necessary but not sufficient)
     3 inverse.recip    A = diag(2,4); two REAL sliders drive
                        B = diag(s1,s2) — diagonal inverses are per-axis
                        reciprocals, each axis its own knob
     4 inverse.blowup   one slider t drives A_t = [[2,1],[1,t]];
                        det = 2t−1 crosses 0 at t = 0.5 and the inverse's
                        entries blow up like 1/det — then cross to det<0
                        and the inverse comes back (only det=0 kills it)
     5 inverse.singular the old lab's soul: A = [[2,1],[4,2]] (det = 0);
                        outputs trapped on y = 2x, the off-line target is
                        forever ≥ 4/√5 ≈ 1.789 away (least squares!),
                        and the null direction (1,−2) gives infinitely
                        many inputs per reachable output
     6 inverse.capstone randomized invertible A + two targets, rebuild
                        A⁻¹ by hand, no hints

   WEAK-AREA TAG MIGRATION — the old quiz's four q.tag/q.focus pairs:
     quiz 'inverse meaning'     → scene 1 (both), scene 2 g1, scene 3 g2
                                  + capstone goal 1
     quiz 'computing inverses'  → scene 2 g2, scene 3 g1 + capstone goal 2
     quiz 'invertibility'       → scene 4 (both goals) + capstone goal 3
     quiz 'singular systems'    → scene 5 (BOTH goals). NOT on the
                                  capstone: the capstone's A is drawn
                                  invertible (det = ±1), so a 'singular
                                  systems' goal there would be dishonest.
                                  The la-eigen precedent (its capstone
                                  carries the tags its goals honestly
                                  drill) is mirrored: the capstone carries
                                  three of the four tags, and the UNION
                                  across the lesson covers all four — the
                                  migrated review loop stays complete.
   Every goal in every scene carries one of these four tags + a focus.

   CONTROLS: scene 3's s1/s2 and scene 4's t are real `slider`s (the
   truly-scalar knobs). Every other draggable quantity is a vector, so it
   stays a `handle`.

   CAPSTONE RANDOMIZATION (CONTRACT v1.1 §1/§8): A is drawn from a finite
   family of SIX integer matrices with det = ±1 (four det=1 + two
   one-column-flipped det=−1 variants — flips are invertible too), and
   the two targets are b = A·xt1, b2 = A·xt2 for DISTINCT corners
   xt ∈ {(±1,±1)} — so both targets are exactly solvable by construction
   (x = xt, always within the draggable range) and b ≠ b2 always (A
   invertible + xt1 ≠ xt2). Controls reset each attempt: x = (0,0)
   (Ax = 0, and ‖A·xt‖ ≥ 1 for every family×corner combo — no target is
   ever pre-hit within the 0.15 band) and B = identity (B·A = A, and
   every family matrix has at least one entry ≥ 1 away from I — B·A ≈ I
   is never pre-satisfied within the 0.15 band). Both margins clear their
   tolerances ×6, for every possible draw — exhaustively enumerated (all
   6 matrices × 4 corners), not just seed-sampled, in the test file,
   plus the shared ×1000-seed empirical helper.
   ================================================================ */
import {
  registerScene, vec, makeRng, handle, slider,
  grid, vector, point, segment, label,
  goal,
} from '../../scene/index.js';
import {
  mag, sub, det2, matApply, matMul, inv2,
  minMagConstraint,
} from './vec-math.js';

const LESSON = 'la-inverse';
const f2 = (x) => x.toFixed(2);

// Anti-gaming floor (mirrors la-det): a draggable inverse-column can't be
// shrunk to (near-)nothing — clamped at the handle (layer 1); every
// B-column predicate re-checks the SAME floor (layer 2, defense in depth
// against a handle bypassed by a direct snapshot).
const MIN_MAG = 0.5;
const onMinMag = minMagConstraint(MIN_MAG);
const gridMatrix = (c1, c2) => [c1.x, c2.x, c1.y, c2.y];

// The lesson's fixed invertible matrix (the old lab's A): [[2,1],[1,1]],
// det = 1, inverse [[1,−1],[−1,2]]. Columns col1 = [2,1], col2 = [1,1].
const A_COL1 = vec(2, 1);
const A_COL2 = vec(1, 1);
const Aapply = (v) => matApply(A_COL1, A_COL2, v);

// All four entries of the column-matrix {c1,c2} within tol of the identity.
const nearIdentity = (c, tol) =>
  Math.abs(c.c1.x - 1) < tol && Math.abs(c.c1.y) < tol &&
  Math.abs(c.c2.x) < tol && Math.abs(c.c2.y - 1) < tol;

// Largest |entry| of an inv2() result — callers gate on truthiness FIRST
// (inv2 returns null when singular), so Infinity never enters a predicate.
const invMaxEntry = (inv) =>
  Math.max(Math.abs(inv.c1.x), Math.abs(inv.c1.y), Math.abs(inv.c2.x), Math.abs(inv.c2.y));

/* ---- 1. SOLVE: drag x until Ax covers the target — A⁻¹b by feel ----- */
/* Micro-idea: solving Ax = b IS computing A⁻¹b — the learner runs the
   inverse with their hand before ever seeing its formula. det = 1 ≠ 0
   means every target is reachable by exactly one input; two different
   targets make "unique solution per target" concrete. Owns 'inverse
   meaning'. Baseline x = (0.5, 0.5) → Ax = (1.5, 1): 1.80 from b and
   1.12 from b2 — both goals cleanly false at load. */
const S1_B = vec(3, 2);     // solved by x = (1, 1)
const S1_B2 = vec(1, 2);    // solved by x = (−1, 3)
registerScene({
  id: 'inverse.solve',
  lesson: LESSON,
  space: 'plane2',
  params: { x: vec(0.5, 0.5) },
  entities: (p) => {
    const Ax = Aapply(p.x);
    return [
      grid({ matrix: gridMatrix(A_COL1, A_COL2), color: 'muted' }),
      point(S1_B, { color: 'muted', label: 'b = [3, 2]', key: 'b' }),
      point(S1_B2, { color: 'muted', label: 'b2 = [1, 2]', key: 'b2' }),
      vector(p.x, { color: 'accent', label: 'x', handle: 'x' }),
      vector(Ax, { color: 'accent2', label: 'Ax', key: 'ax' }),
      label('A = [2 1; 1 1]    det = 1    ‖Ax − b‖ = ' + f2(mag(sub(Ax, S1_B))) + '    ‖Ax − b2‖ = ' + f2(mag(sub(Ax, S1_B2))), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Solve Ax = b: drag the input x until Ax lands on the target b (within 0.15), to see how solving a linear system IS finding the input A sends to b — you are computing A⁻¹b by feel',
      (s) => mag(sub(Aapply(s.x), S1_B)) < 0.15,
      { xp: 20, hold: 400, tag: 'inverse meaning',
        focus: 'Ax = b asks “which input lands on b?” — the answer x = A⁻¹b exists and is unique here because det = 1 ≠ 0.' }),
    goal('Now solve it again for the second target b2, to see how an invertible A gives EVERY target exactly one solution — a new b just means a new x = A⁻¹b',
      (s) => mag(sub(Aapply(s.x), S1_B2)) < 0.15,
      { xp: 20, hold: 400, tag: 'inverse meaning',
        focus: 'Same matrix, new target, new (unique) answer. When det ≠ 0 the solve never fails and never gives two answers.' }),
  ],
  caption: 'Drag the input x until Ax covers each gold target — you are computing A⁻¹b by feel. det = 1, so every target is reachable by exactly one x.',
});

/* ---- 2. UNDO: build A⁻¹ by hand — drag B's columns until B·A = I ---- */
/* Micro-idea: "B undoes A" means the composition B·A moves nothing. The
   warm-up (bring ONE test vector home) is genuinely easier — two
   equations, many solutions — while B·A ≈ I entrywise pins down all four
   entries: that B is A⁻¹ = [[1,−1],[−1,2]], unique. B starts at the
   identity, so B·A = A at load: three entries sit ≥ 1 away from I and
   the round trip leaves the test vector 2.24 from home — both goals
   cleanly false. g1 owns 'inverse meaning', g2 'computing inverses'. */
const S2_T = vec(1, 1);
const S2_AT = Aapply(S2_T);   // (3, 2) — where A parks the test vector
registerScene({
  id: 'inverse.undo',
  lesson: LESSON,
  space: 'plane2',
  params: { bCol1: vec(1, 0), bCol2: vec(0, 1) },
  entities: (p) => {
    const ba = matMul(p.bCol1, p.bCol2, A_COL1, A_COL2);   // B∘A: apply A first, then B
    const rt = matApply(p.bCol1, p.bCol2, S2_AT);          // the round trip B·(A·t)
    return [
      grid({ matrix: gridMatrix(ba.c1, ba.c2), color: 'muted' }),
      vector(S2_T, { color: 'muted', label: 't (test vector)', key: 't' }),
      vector(S2_AT, { color: 'muted', label: 'A·t', key: 'at' }),
      vector(rt, { color: 'accent2', label: 'B·(A·t)', key: 'rt' }),
      vector(p.bCol1, { color: 'accent', label: 'B col1', handle: handle('bCol1', { constrain: onMinMag }) }),
      vector(p.bCol2, { color: 'good', label: 'B col2', handle: handle('bCol2', { constrain: onMinMag }) }),
      label('B·A = [' + f2(ba.c1.x) + ' ' + f2(ba.c2.x) + ' ; ' + f2(ba.c1.y) + ' ' + f2(ba.c2.y) + ']    det(B) = ' + f2(det2(p.bCol1, p.bCol2)) + '    ‖B·(A·t) − t‖ = ' + f2(mag(sub(rt, S2_T))), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Warm up: drag B’s columns until the round trip B·(A·t) brings the test vector t back home (within 0.2), to see how “B undoes A” means the composition moves nothing',
      (s) => mag(s.bCol1) > MIN_MAG && mag(s.bCol2) > MIN_MAG
        && mag(sub(matApply(s.bCol1, s.bCol2, S2_AT), S2_T)) < 0.2,
      { xp: 20, hold: 400, tag: 'inverse meaning',
        focus: 'Undo means the round trip is a no-op: B·(A·t) = t. One test vector is only two equations — it narrows B down but does not pin down all four entries yet.' }),
    goal('Now finish the job: make ALL FOUR entries of B·A read the identity (each within 0.15), to see how the B that undoes A on every vector at once is unique — that B IS A⁻¹ = (1/det)·[[d,−b],[−c,a]]',
      (s) => mag(s.bCol1) > MIN_MAG && mag(s.bCol2) > MIN_MAG
        && nearIdentity(matMul(s.bCol1, s.bCol2, A_COL1, A_COL2), 0.15),
      { xp: 30, hold: 500, tag: 'computing inverses',
        focus: 'B·A = I is the definition of the inverse. For A = [[2,1],[1,1]] (det 1) that is A⁻¹ = [[1,−1],[−1,2]] — check each entry of B·A against I as you drag.' }),
  ],
  caption: 'Drag B’s two columns until B·A reads the identity — that B is A⁻¹ by definition. Start easier: make the round trip B·(A·t) bring the test vector home.',
});

/* ---- 3. RECIP: diagonal inverses are per-axis reciprocals ----------- */
/* Micro-idea: A = diag(2,4) stretches each axis independently, so its
   inverse is diag(1/2, 1/4) — every stretch factor becomes ITS OWN
   reciprocal (the old quiz's 'computing inverses' item, made literal).
   Goal 2 kills the one-shared-knob intuition: landing a uniform ×2
   round trip needs DIFFERENT slider values (s1 = 1, s2 = 0.5). Baseline
   s1 = s2 = 1 gives B·A = diag(2,4): 1 away from I on the first product
   and 2 away from diag(2,2) on the second — both goals false at load. */
registerScene({
  id: 'inverse.recip',
  lesson: LESSON,
  space: 'plane2',
  params: { s1: 1, s2: 1 },
  controls: [
    slider('s1', { min: 0.1, max: 3, step: 0.05, label: 's1 (undo the ×2 axis)', format: f2 }),
    slider('s2', { min: 0.1, max: 3, step: 0.05, label: 's2 (undo the ×4 axis)', format: f2 }),
  ],
  entities: (p) => {
    const col1 = vec(2 * p.s1, 0);
    const col2 = vec(0, 4 * p.s2);
    return [
      grid({ matrix: gridMatrix(col1, col2), color: 'muted' }),
      vector(col1, { color: 'accent', label: 'B·A col1 = [2·s1, 0]', key: 'c1' }),
      vector(col2, { color: 'accent2', label: 'B·A col2 = [0, 4·s2]', key: 'c2' }),
      label('A = diag(2, 4)    B = diag(' + f2(p.s1) + ', ' + f2(p.s2) + ')    B·A = diag(' + f2(2 * p.s1) + ', ' + f2(4 * p.s2) + ')', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Undo A exactly: set the sliders so B·A = diag(1, 1) (each product within 0.1), to see how a diagonal matrix inverts per axis — every stretch factor becomes its own reciprocal',
      (s) => Math.abs(2 * s.s1 - 1) < 0.1 && Math.abs(4 * s.s2 - 1) < 0.1,
      { xp: 25, hold: 400, tag: 'computing inverses',
        focus: 'diag(2,4)⁻¹ = diag(1/2, 1/4): each axis is undone independently. s1 kills the ×2, s2 kills the ×4 — reciprocals, not negatives.' }),
    goal('Now make the round trip scale uniformly ×2 instead: B·A = diag(2, 2), to see how the axes are independent knobs — matching them takes DIFFERENT slider values, not one shared “reciprocal of A”',
      (s) => Math.abs(2 * s.s1 - 2) < 0.1 && Math.abs(4 * s.s2 - 2) < 0.1,
      { xp: 20, hold: 400, tag: 'inverse meaning',
        focus: 'Landing diag(2,2) needs 2·s1 = 2 but 4·s2 = 2 — s1 and s2 end up different because each axis undoes its own factor.' }),
  ],
  caption: 'A stretches ×2 in x and ×4 in y; the sliders build B = diag(s1, s2). Undo A per axis — each stretch needs its own reciprocal, not one shared knob.',
});

/* ---- 4. BLOWUP: invertibility is a det ≠ 0 gate — seen through 1/det - */
/* Micro-idea: A_t = [[2,1],[1,t]] has det = 2t−1, crossing 0 at t = 0.5.
   The formula A⁻¹ = (1/det)·[[d,−b],[−c,a]] puts det in the DENOMINATOR,
   so the inverse's entries blow up like 1/det approaching the wall —
   and come right back on the far side: det < 0 (a flip) inverts fine,
   only det = 0 kills it. Owns 'invertibility'. Anti-gaming: goal 1
   gates 0.01 ≤ |det| ≤ 0.25 so it means "close to the wall, not ON it"
   — at t = 0.5 exactly (landable: the slider steps hit it) inv2 returns
   null and the predicate fails closed; Infinity/NaN never enters a
   predicate. Baseline t = 1.5 (det = 2, biggest entry 1) fails both. */
const S4_COL1 = vec(2, 1);   // A_t columns: col1 = [2,1] fixed, col2 = [1,t]
const s4det = (t) => 2 * t - 1;
registerScene({
  id: 'inverse.blowup',
  lesson: LESSON,
  space: 'plane2',
  params: { t: 1.5 },
  controls: [slider('t', { min: -1, max: 2, step: 0.05, label: 't (bottom-right entry)', format: f2 })],
  entities: (p) => {
    const col2 = vec(1, p.t);
    const d = s4det(p.t);
    const inv = inv2(S4_COL1, col2);
    return [
      grid({ matrix: gridMatrix(S4_COL1, col2), color: 'muted' }),
      vector(S4_COL1, { color: 'muted', label: 'col1 (fixed)', key: 'c1' }),
      vector(col2, { color: 'accent2', label: 'col2 = [1, t]', key: 'c2' }),
      label('A = [2 1; 1 ' + f2(p.t) + ']    det = 2t − 1 = ' + f2(d) + '    biggest |entry| of A⁻¹ = ' + (Math.abs(d) < 0.05 || !inv ? '∞ (no inverse)' : f2(invMaxEntry(inv))), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Slide t toward the wall until the biggest entry of A⁻¹ exceeds 8 — det close to 0 but NOT on it, to see how the 1/det factor makes the inverse blow up near the wall: nearly-singular matrices have huge, unstable inverses',
      (s) => {
        const d = s4det(s.t);
        if (Math.abs(d) < 0.01 || Math.abs(d) > 0.25) return false;
        const inv = inv2(S4_COL1, vec(1, s.t));
        return !!inv && invMaxEntry(inv) > 8;
      },
      { xp: 25, hold: 400, tag: 'invertibility',
        focus: 'A⁻¹ = (1/det)·[[d,−b],[−c,a]] — det sits in the denominator, so the entries grow like 1/det as t nears the collapse at t = 0.5. AT the wall there is no inverse at all.' }),
    goal('Cross the wall: push det to −0.5 or below and watch the inverse come back tame, to see how only det = 0 kills invertibility — a negative det is a flip, and flips are perfectly reversible',
      (s) => {
        if (s4det(s.t) > -0.5) return false;
        const inv = inv2(S4_COL1, vec(1, s.t));
        return !!inv && invMaxEntry(inv) <= 8;
      },
      { xp: 25, hold: 400, tag: 'invertibility',
        focus: 'Sign does not matter for invertibility: det = −2 inverts fine. The ONLY fatal value is det = 0 — the wall is a single point, not a whole side.' }),
  ],
  caption: 'Slide t and watch det = 2t − 1 head for zero — the inverse’s entries blow up like 1/det on the way. Cross to det < 0 and the inverse comes right back: flips are reversible, only det = 0 kills it.',
});

/* ---- 5. SINGULAR: det = 0 — outputs trapped on a line --------------- */
/* Micro-idea: the old lab's soul. A = [[2,1],[4,2]] (det = 0) can only
   output multiples of (1,2) — the line y = 2x. The off-line target
   b = (3,2) is forever ≥ 4/√5 ≈ 1.789 away (the perpendicular distance;
   "take the closest point" IS least squares), and because A·(1,−2) = 0,
   the SAME near-miss output is reachable from infinitely many inputs —
   no solution off the line, infinitely many on it. Owns 'singular
   systems' (both goals — the tag's home, since the capstone's A is
   drawn invertible). Baseline x = (−1, 0.5) → Ax = (−1.5, −3), 6.73
   from b (goal 1 false) and ‖x‖ = 1.12 < 3 (goal 2 doubly false). */
const S5_COL1 = vec(2, 4);   // A = [[2,1],[4,2]]: col1 = [2,4], col2 = [1,2]
const S5_COL2 = vec(1, 2);
const S5_B = vec(3, 2);
const S5_LINE_A = vec(-3, -6);
const S5_LINE_B = vec(3, 6);
const S5_CLOSEST = vec(1.4, 2.8);   // foot of the perpendicular from b to y = 2x
const S5apply = (v) => matApply(S5_COL1, S5_COL2, v);
registerScene({
  id: 'inverse.singular',
  lesson: LESSON,
  space: 'plane2',
  params: { x: vec(-1, 0.5) },
  entities: (p) => {
    const Ax = S5apply(p.x);
    return [
      grid({ color: 'muted' }),
      segment(S5_LINE_A, S5_LINE_B, { color: 'warn', dashed: true, label: 'output line y = 2x' }),
      segment(S5_B, S5_CLOSEST, { color: 'muted', dashed: true, key: 'gap' }),
      point(S5_B, { color: 'muted', label: 'b (off the line)', key: 'b' }),
      vector(p.x, { color: 'accent', label: 'x', handle: 'x' }),
      vector(Ax, { color: 'accent2', label: 'Ax', key: 'ax' }),
      label('A = [2 1; 4 2]    det = 0    ‖Ax − b‖ = ' + f2(mag(sub(Ax, S5_B))) + '    ‖x‖ = ' + f2(mag(p.x)) + '    ⚠ outputs trapped on the line', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Get Ax within 1.9 of the target b — as close as the line allows, to see how a singular A leaves off-line targets unreachable: the best you can ever do is the closest point on the output line (that idea IS least squares)',
      (s) => mag(sub(S5apply(s.x), S5_B)) < 1.9,
      { xp: 25, hold: 400, tag: 'singular systems',
        focus: 'det = 0 traps every output on the line y = 2x; b = (3,2) is off it, so ‖Ax − b‖ can never reach 0 — its floor is the perpendicular distance 4/√5 ≈ 1.79.' }),
    goal('Reach the SAME near-miss from far away: keep ‖Ax − b‖ under 1.9 with ‖x‖ > 3, to see how a singular A sends infinitely many inputs to one output — sliding x along the null direction (1,−2) does not move Ax at all',
      (s) => mag(sub(S5apply(s.x), S5_B)) < 1.9 && mag(s.x) > 3,
      { xp: 30, hold: 400, tag: 'singular systems',
        focus: 'A·(1,−2) = 0: adding any multiple of the null direction to x changes x but never Ax. That is why a singular system that IS solvable has infinitely many solutions.' }),
  ],
  caption: 'This A has det = 0 — every output Ax is trapped on the dashed line, so the off-line target can never be reached. Get as close as the line allows, then reach the same near-miss from a totally different x: the null direction moves x without moving Ax.',
});

/* ---- 6. CAPSTONE: solve two targets, rebuild A⁻¹, no hints ---------- */
/* THE EXAM. A is drawn from a finite family of six det = ±1 integer
   matrices (four det=1 + two one-column-flipped det=−1 variants); the
   two targets are b = A·xt1, b2 = A·xt2 for distinct corners
   xt ∈ {(±1,±1)}, so both are exactly solvable (x = xt) and distinct.

   BASELINE-SAFETY PROOF (exhaustively enumerated in the test file):
   controls reset to x = (0,0) and B = identity each attempt.
     goals 1/3 (hit b / b2 within 0.15): Ax = A·0 = 0, and the smallest
       ‖A·xt‖ over all 6×4 family×corner combos is exactly 1 (e.g. the
       flipped family member's c1+c2 = (0,−1)) — margin 1 > 0.15, always.
     goal 2 (B·A ≈ I entrywise within 0.15): B·A = A at reset, and every
       family matrix has at least one entry ≥ 1 away from the identity
       (none of the six IS the identity, by inspection of the finite
       set) — margin 1 > 0.15, always.
   Bonus exclusivity: ‖b − b2‖ = ‖A·(xt1 − xt2)‖ ≥ 2 for every draw, so
   goals 1 and 3 can never be satisfied simultaneously — two separate,
   held solves are genuinely required. */
const CAP_FAMILY = [
  { c1: vec(2, 1), c2: vec(1, 1) },     // [[2,1],[1,1]]  det = 1 (the lesson's A)
  { c1: vec(1, 1), c2: vec(1, 2) },     // [[1,1],[1,2]]  det = 1
  { c1: vec(3, 2), c2: vec(1, 1) },     // [[3,1],[2,1]]  det = 1
  { c1: vec(1, 1), c2: vec(2, 3) },     // [[1,2],[1,3]]  det = 1
  { c1: vec(-2, -1), c2: vec(1, 1) },   // col1 flipped   det = −1 (a flip — still invertible)
  { c1: vec(1, 1), c2: vec(-1, -2) },   // col2 flipped   det = −1
];
const CAP_XTS = [vec(1, 1), vec(-1, 1), vec(1, -1), vec(-1, -1)];
function randomize(rng) {
  const A = CAP_FAMILY[Math.floor(rng() * CAP_FAMILY.length)];
  const i1 = Math.floor(rng() * CAP_XTS.length);
  const i2 = (i1 + 1 + Math.floor(rng() * (CAP_XTS.length - 1))) % CAP_XTS.length;   // guaranteed != i1
  return {
    x: vec(0, 0), bCol1: vec(1, 0), bCol2: vec(0, 1),
    aCol1: A.c1, aCol2: A.c2,
    b: matApply(A.c1, A.c2, CAP_XTS[i1]),
    b2: matApply(A.c1, A.c2, CAP_XTS[i2]),
  };
}
registerScene({
  id: 'inverse.capstone',
  lesson: LESSON,
  capstone: true,
  randomize,
  space: 'plane2',
  params: randomize(makeRng(1)),
  entities: (p) => {
    const Ax = matApply(p.aCol1, p.aCol2, p.x);
    const ba = matMul(p.bCol1, p.bCol2, p.aCol1, p.aCol2);
    return [
      grid({ matrix: gridMatrix(p.aCol1, p.aCol2), color: 'muted' }),
      point(p.b, { color: 'muted', label: 'b', key: 'b' }),
      point(p.b2, { color: 'muted', label: 'b2', key: 'b2' }),
      point(p.x, { color: 'accent', label: 'x', handle: 'x' }),
      vector(Ax, { color: 'accent2', label: 'Ax', key: 'ax' }),
      vector(p.bCol1, { color: 'good', label: 'B col1', handle: handle('bCol1', { constrain: onMinMag }) }),
      vector(p.bCol2, { color: 'warn', label: 'B col2', handle: handle('bCol2', { constrain: onMinMag }) }),
      label('A = [' + f2(p.aCol1.x) + ' ' + f2(p.aCol2.x) + ' ; ' + f2(p.aCol1.y) + ' ' + f2(p.aCol2.y) + ']    det = ' + f2(det2(p.aCol1, p.aCol2)) + '    ‖Ax − b‖ = ' + f2(mag(sub(Ax, p.b))) + '    ‖Ax − b2‖ = ' + f2(mag(sub(Ax, p.b2))) + '    B·A = [' + f2(ba.c1.x) + ' ' + f2(ba.c2.x) + ' ; ' + f2(ba.c1.y) + ' ' + f2(ba.c2.y) + ']', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Solve the system: drag x until Ax lands on the first target b and hold, to see how solving Ax = b is exactly applying A⁻¹ to b',
      (s) => mag(sub(matApply(s.aCol1, s.aCol2, s.x), s.b)) < 0.15,
      { xp: 40, hold: 700, tag: 'inverse meaning',
        focus: 'x = A⁻¹b: the unique input an invertible A sends to b. Steer x until ‖Ax − b‖ reads ≈ 0 and hold it there.' }),
    goal('Rebuild the inverse by hand: drag B’s columns until ALL FOUR entries of B·A read the identity, and hold, to see how B·A = I is the defining test that B IS A⁻¹',
      (s) => mag(s.bCol1) > MIN_MAG && mag(s.bCol2) > MIN_MAG
        && nearIdentity(matMul(s.bCol1, s.bCol2, s.aCol1, s.aCol2), 0.15),
      { xp: 40, hold: 700, tag: 'computing inverses',
        focus: 'B·A = I entry by entry — the only B that passes is (1/det)·[[d,−b],[−c,a]]. Watch all four readout entries at once.' }),
    goal('Now solve the OTHER target: drag x until Ax lands on b2 and hold, to see how det ≠ 0 guarantees EVERY target is reachable by exactly one input — invertibility is a promise about all of space',
      (s) => mag(sub(matApply(s.aCol1, s.aCol2, s.x), s.b2)) < 0.15,
      { xp: 40, hold: 700, tag: 'invertibility',
        focus: 'Invertible ⇔ det ≠ 0 ⇔ every b has exactly one solution. A second target is just a second (unique) x = A⁻¹b2.' }),
  ],
  caption: 'No hints now. Solve Ax = b for both targets, then rebuild A⁻¹ by hand until B·A reads the identity — hold each steady.',
});
