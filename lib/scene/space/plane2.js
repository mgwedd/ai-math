/* ================================================================
   Scene Kit — plane2 space. CONTRACT.md §6. Owner: kit-core.

   World coords, mathematical y-up. Math is in CSS px (pointer events
   are CSS px); the backend reads `dpr` (capped at 2) for canvas
   resolution. Interaction maps a pointer to a param value via toWorld().
   pan/zoom are off in v1 (opts reserved).
   ================================================================ */

const DPR_CAP = 2;

/**
 * @param {{extent?:number, yUp?:boolean, pan?:boolean, zoom?:boolean}} opts
 *   extent = world half-extent to fit in the smaller viewport half-dimension.
 *   yUp    = mathematical y-up (default). `false` gives screen-style y-down,
 *            used by an inset gauge whose sub-space wants pixel-like axes
 *            (CONTRACT §6 opts; v1.6 inset honors it). Default preserves the
 *            exact prior transform (y-up), so main-space scenes are unchanged.
 */
export function createPlane2(opts){
  const p = opts || {};
  const extent = p.extent ?? 6;
  const yUp = p.yUp !== false;                 // default true (byte-identical to prior behavior)
  const sy = yUp ? -1 : 1;                      // screen-y sign of a positive world-y
  let W = 0, H = 0, dpr = 1, scale = 1, ox = 0, oy = 0;

  const space = {
    name: 'plane2',
    /** @param {number} w @param {number} h css px @param {number} [devicePR] */
    resize(w, h, devicePR){
      // Degenerate dimensions (a 0-width/height container mid-layout, or a
      // 0/negative extent) would make scale 0 or NaN, and toWorld/bounds would
      // then divide by it and emit NaN coords. Least-surprising guard: no-op and
      // keep the last good layout (initial layout is a finite 1:1 at the origin).
      if(!(w > 0) || !(h > 0) || !(extent > 0)) return space;
      W = w; H = h;
      dpr = Math.min(devicePR || (typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1), DPR_CAP);
      scale = Math.min(W, H) / (2 * extent);   // `extent` units fit the smaller half
      ox = W / 2; oy = H / 2;                   // origin centered
      return space;
    },
    /** world -> canvas px (y-up by default; y-down when yUp:false). */
    toScreen(v){ return { px: ox + v.x * scale, py: oy + sy * v.y * scale }; },
    /** canvas px -> world. */
    toWorld(pt){ return { x: (pt.px - ox) / scale, y: sy * (pt.py - oy) / scale }; },
    /** visible world rectangle. */
    bounds(){
      const ya = sy * (0 - oy) / scale, yb = sy * (H - oy) / scale;
      return { xmin: (0 - ox) / scale, xmax: (W - ox) / scale,
               ymin: Math.min(ya, yb), ymax: Math.max(ya, yb) };
    },
    get dpr(){ return dpr; },
    get scale(){ return scale; },
    destroy(){ /* no owned resources in v1 */ },
  };
  return space;
}
