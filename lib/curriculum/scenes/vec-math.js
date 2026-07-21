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
