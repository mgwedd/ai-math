/* ================================================================
   Scene authoring — shared 2D vector math (content-side, PURE).
   ----------------------------------------------------------------
   The Scene Kit exports `vec` (params.js) but no math helpers — the
   kit is deliberately geometry-agnostic. Lesson math lives with the
   content. This module is the shared toolkit every la-* / calc-*
   scene draws on so the dot-product formulas aren't retyped 300×.

   All functions are pure and take RESOLVED values (a vector is the
   plain {x, y} that `vec()` produces and that a params view yields).
   Renderer-free by construction — safe to import from any scene.

   NOTE to kit-core: if you'd rather these live in the kit (a
   `lib/scene/math.js` seam), say so in kit-core.md and I'll import
   from there instead — filed in flagship-content.md Handoffs.
   ================================================================ */

export const dot = (a, b) => a.x * b.x + a.y * b.y;
export const mag = (v) => Math.hypot(v.x, v.y);
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (v, k) => ({ x: v.x * k, y: v.y * k });
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export function norm(v) {
  const m = mag(v);
  return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
}

// Cosine similarity; degenerate zero-length inputs → 0 (no NaN).
export function cos(a, b) {
  const d = mag(a) * mag(b);
  return d === 0 ? 0 : clamp(dot(a, b) / d, -1, 1);
}

// Angle between a and b, degrees, 0..180.
export const angleDeg = (a, b) => (Math.acos(cos(a, b)) * 180) / Math.PI;

// SCALAR projection of a onto b: signed length of a's shadow on b = (a·b)/‖b‖.
export function proj(a, b) {
  const mb = mag(b);
  return mb === 0 ? 0 : dot(a, b) / mb;
}

// VECTOR projection of a onto b: the shadow as a point on b's line.
export function projVec(a, b) {
  const mb2 = dot(b, b);
  return mb2 === 0 ? { x: 0, y: 0 } : scale(b, dot(a, b) / mb2);
}

// RESIDUAL of b against direction a: b minus its shadow on a's line (la-projection).
// r = b − projVec(b, a) is the part of b ORTHOGONAL to a — always a·r = 0, and
// ‖b‖² = ‖projVec(b,a)‖² + ‖r‖² (Pythagoras). NOTE the (b, a) argument order:
// projVec(a, b) projects the FIRST onto the SECOND, so the shadow of b on a is
// projVec(b, a) and the leftover is residVec(b, a). Degenerate a → r = b (the
// zero-length "line" casts no shadow), matching projVec's zero-guard.
export const residVec = (b, a) => sub(b, projVec(b, a));

// Numerically-stable softmax with temperature; temp→0 sharpens, large flattens.
export function softmax(xs, temp = 1) {
  const t = temp > 0 ? temp : 1e-6;
  const logits = xs.map((x) => x / t);
  const m = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - m));
  const sum = exps.reduce((s, e) => s + e, 0) || 1;
  return exps.map((e) => e / sum);
}

// Linear remap of x from [a0,a1] to [b0,b1] (unclamped).
export const mapRange = (x, a0, a1, b0, b1) => b0 + ((x - a0) / (a1 - a0)) * (b1 - b0);

/* ---- linear-combination toolkit (la-vecops) -----------------------
   Addition + scalar multiplication compose into the linear combination
   c1·a + c2·b — the core construction of la-vecops. det2/solve2 turn the
   {a,b} pair into a basis: solve2 reads off a target's coordinates. */

// The linear combination c1·a + c2·b (the whole lesson in one expression).
export const lincomb = (c1, a, c2, b) => add(scale(a, c1), scale(b, c2));

// Signed area of the parallelogram [a b]; 0 ⇔ a,b parallel ⇔ span is a line.
export const det2 = (a, b) => a.x * b.y - a.y * b.x;

// Solve c1·a + c2·b = t for the scalars (Cramer's rule). Returns {c1,c2};
// c1/c2 are +/-Infinity when {a,b} is degenerate (det = 0) — callers on the
// content side always pass an independent basis, so this stays finite there.
export function solve2(a, b, t) {
  const d = det2(a, b);
  return { c1: det2(t, b) / d, c2: det2(a, t) / d };
}

// Rotate v by theta radians (CCW). Used to draw a randomized basis.
export const rot = (v, th) => {
  const c = Math.cos(th), s = Math.sin(th);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
};

/* ---- matrix-as-transformation toolkit (la-matrix) -----------------
   A 2×2 matrix IS its two columns — the landing spots of î and ĵ. Applying
   it to v is the linear combination v.x·col1 + v.y·col2 (ties matrices back
   to la-vecops). det2(col1,col2) is the signed area scale (0 ⇔ space
   collapses to a line). */
export const matApply = (col1, col2, v) => add(scale(col1, v.x), scale(col2, v.y));

/* ---- matrix MULTIPLICATION toolkit (la-matmul) ---------------------
   B·A means "apply A first, then B" — matMul(bc1,bc2, ac1,ac2) returns the
   PRODUCT's two columns by running matApply(B, ·) on each of A's columns
   (composition, CONTRACT-legal since it only calls matApply twice). rowOf
   reads a ROW of a column-represented matrix as a plain vector, so an
   entry (i,j) of B·A is exactly `dot(rowOf(B,i), colJ(A))` — the row·column
   definition, made literal. */
export const matMul = (bc1, bc2, ac1, ac2) => ({
  c1: matApply(bc1, bc2, ac1),
  c2: matApply(bc1, bc2, ac2),
});

// Row i (0=top, 1=bottom) of the matrix with columns c1,c2, as a plain vector.
export const rowOf = (c1, c2, i) => (i === 0 ? { x: c1.x, y: c2.x } : { x: c1.y, y: c2.y });

/* ---- ROW-major weight-matrix toolkit (la-boss) ---------------------
   la-boss authors W by its four ENTRIES a,b,c,d (sliders, mirroring the
   retiring lab exactly) rather than by its columns, so it needs the
   row-major apply the kit's own grid() renderer already uses internally
   (renderer/draw.js: "Apply a 2x2 row-major matrix [a,b,c,d]"):
   x' = a·x + b·y, y' = c·x + d·y. detW is the same ad−bc formula as
   det2, just spelled directly in terms of the four scalars (no vec
   wrapping needed — a,b,c,d are plain numbers here, not columns). */
export const applyW = (a, b, c, d, v) => ({ x: a * v.x + b * v.y, y: c * v.x + d * v.y });
export const detW = (a, b, c, d) => a * d - b * c;

/* ---- handle constrain closures (pointer world-point clampers) ----
   CONTRACT §7 allows handle.constrain to be a `(pt)=>pt` function.
   Define these ONCE (module scope) so the closure identity is stable
   across entities() evals — a fresh closure every frame would make the
   diff layer treat the entity as always-changed. */

// Clamp a pointer to the ray through the origin along `dir` (length-only drag):
// keeps a vector's direction locked while the learner changes its magnitude.
export const rayConstraint = (dir) => (pt) => {
  const d2 = dot(dir, dir) || 1;
  const t = Math.max(0.05, dot(pt, dir) / d2);   // stay on the positive ray
  return scale(dir, t);
};

// Clamp a pointer to the circle of radius `r` (angle-only drag): keeps a
// vector's length fixed while the learner rotates it.
export const circleConstraint = (r) => (pt) => scale(norm(pt), r);

// Clamp a pointer to a vertical track at x=`atX`, y in [lo,hi] (a slider made
// from a draggable point — v1 has no scalar slider control; see Handoffs).
export const trackConstraint = (atX, lo, hi) => (pt) => ({ x: atX, y: clamp(pt.y, lo, hi) });

// Clamp a pointer so it can never resolve to a (near-)zero-magnitude vector:
// keeps a draggable tip at least `min` away from the origin. Anti-gaming
// defense (layer 1 of 2 — goal predicates gate on magnitude too, layer 2):
// cos()/proj() defensively return 0 for a zero-length input, which a learner
// could otherwise exploit by shrinking a vector to near-nothing instead of
// actually reasoning about the angle between the two arrows. Defaults to the
// +x direction on the degenerate pointer-at-origin case (division guard).
export const minMagConstraint = (min) => (pt) => {
  const m = mag(pt);
  if (m >= min) return pt;
  const dir = m > 1e-9 ? scale(pt, 1 / m) : { x: 1, y: 0 };
  return scale(dir, min);
};

/* ---- eigenvector/eigenvalue toolkit (la-eigen) ---------------------
   Mv = λv: v is an eigenvector, λ its eigenvalue — v only gets stretched
   (never rotated) by M. Parallelism (v ∥ Mv) is SCALE-INVARIANT: cos(v,Mv)
   doesn't care how long v is, so a lone epsilon-on-angle gate would happily
   credit a vanishing v (whose direction is numerically unstable to begin
   with). `isAligned` therefore checks TWO independent things — an angle
   epsilon AND a magnitude floor — mirroring la-matrix's two-layer
   minMagConstraint (handle floor + predicate re-check) rather than trusting
   the handle constraint alone. */

// Is w parallel to v — same OR opposite direction (either sign eigenvalue) —
// within an angle epsilon, AND is v a real (non-vanishing) vector. Two
// independent gates, both must hold; this is layer 2 (the predicate-side
// check) — pair with a `minMagConstraint` on the handle for layer 1.
export function isAligned(v, w, opts = {}) {
  const cosMin = opts.cosMin ?? 0.995;
  const minMag = opts.minMag ?? 0.5;
  return mag(v) >= minMag && Math.abs(cos(v, w)) >= cosMin;
}

// Signed stretch factor once (v, Mv) are aligned: +|Mv|/|v| when Mv points
// the SAME way as v (positive eigenvalue — a "stretch"), -|Mv|/|v| when it
// points OPPOSITE (negative eigenvalue — a "flip"). Defensively 0 for a
// vanishing v (division guard) — callers gate on isAligned() first, which
// already excludes this case via the magnitude floor.
export function eigRatio(v, Mv) {
  const mv = mag(v);
  if (mv < 1e-9) return 0;
  return (cos(v, Mv) < 0 ? -1 : 1) * (mag(Mv) / mv);
}

// Exact eigen-decomposition of a SYMMETRIC 2x2 matrix [[a,b],[b,c]] (the
// spectral theorem guarantees REAL eigenvalues and ORTHOGONAL eigenvectors
// for any symmetric matrix — no numerical iteration needed for 2x2). Returns
// unit directions dir1 ⟂ dir2 and their eigenvalues lambda1/lambda2 (no
// ordering guarantee by magnitude — callers compare if they need "dominant").
export function eigSym2(a, b, c) {
  const mid = (a + c) / 2;
  const half = (a - c) / 2;
  const rad = Math.sqrt(half * half + b * b);
  const lambda1 = mid + rad;
  const lambda2 = mid - rad;
  const dirFor = (lambda) => (Math.abs(b) > 1e-9
    ? norm({ x: b, y: lambda - a })
    : (Math.abs(a - lambda) <= Math.abs(c - lambda) ? { x: 1, y: 0 } : { x: 0, y: 1 }));
  return { lambda1, lambda2, dir1: dirFor(lambda1), dir2: dirFor(lambda2) };
}

// Build a SYMMETRIC matrix (as its two columns) from a target eigen-pair —
// the inverse of eigSym2, and the la-eigen capstone's randomize() workhorse.
// dir1=rot(î,phi), dir2=rot(ĵ,phi) are automatically unit + orthogonal, so
// this is exactly the spectral form M = λ1·dir1·dir1ᵀ + λ2·dir2·dir2ᵀ — a
// symmetric matrix with EXACTLY the given eigenvalues/directions by
// construction, no solve required (and so no risk of an unprovable target).
export function eigenMatrix(lambda1, lambda2, phi) {
  const dir1 = rot({ x: 1, y: 0 }, phi);
  const dir2 = rot({ x: 0, y: 1 }, phi);
  const col1 = add(scale(dir1, lambda1 * dir1.x), scale(dir2, lambda2 * dir2.x));
  const col2 = add(scale(dir1, lambda1 * dir1.y), scale(dir2, lambda2 * dir2.y));
  return { col1, col2, dir1, dir2 };
}

// Sample covariance entries {a,b,c} (matrix [[a,b],[b,c]]) of a MEAN-ZERO
// point cloud — the la-eigen PCA-teaser scene's data matrix. Callers supply
// an already-centered cloud (a fixed, by-construction-symmetric module-scope
// constant) so this is a direct second-moment computation, no centering step.
export function covOf(points) {
  const n = points.length || 1;
  let a = 0, b = 0, c = 0;
  for (const p of points) { a += p.x * p.x; b += p.x * p.y; c += p.y * p.y; }
  return { a: a / n, b: b / n, c: c / n };
}

// Variance of the cloud projected onto the unit direction at angle theta
// (radians): d = [cosθ, sinθ], variance = dᵀ·cov·d (a quadratic form). This
// IS the PCA objective; its maximum over theta is cov's top eigenvalue
// (eigSym2's lambda1), attained exactly at the top eigenvector's angle.
export function projectedVariance(cov, theta) {
  const dx = Math.cos(theta), dy = Math.sin(theta);
  return cov.a * dx * dx + 2 * cov.b * dx * dy + cov.c * dy * dy;
}
