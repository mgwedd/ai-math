/* ================================================================
   Scene Kit — entity constructors. CONTRACT.md §3. Owner: kit-core.

   Every constructor is PURE: returns a plain {kind, key?, ...props}
   descriptor, touches no DOM/GPU, reads no globals. entities(p,t)
   returns Entity[]. This purity is what makes scenes headless-testable
   (quality's purity test enforces it).

   Colors are semantic tokens resolved by the backend: 'accent',
   'accent2', 'muted', 'grid', 'good', 'warn', or any raw CSS color.
   Provide `key` for anything reorderable/addable/removable frame-to-frame.
   ================================================================ */

// Entity kinds shipping in v1. Adding one is a kit-core PR (kind + backend
// draw case + diff rule), never a scene-side hack.
export const KINDS = Object.freeze([
  'grid', 'vector', 'point', 'segment', 'curve', 'area',
  'polygon', 'label', 'angleArc', 'dropLine', 'cellGrid', 'bars',
]);

// Entity kinds that accept a `handle` option, and the param type they write
// back. Frozen capability table — CONTRACT.md §7. Interaction reads this.
export const HANDLE_KINDS = Object.freeze({
  vector: 'vec', point: 'vec', segment: 'vec', polygon: 'vec',
});

const o = (x) => x || {};

// Non-handle constructors still pass `handle` through so validateScenes can
// REJECT a handle on a kind that can't accept one (HANDLE_KINDS), rather than
// silently dropping the author's mistake (VISUAL_FIRST: fail loudly in dev).

/** Reference grid, morphable under a 2x2 matrix [a,b,c,d]. */
export function grid(opts){ const p = o(opts);
  return { kind: 'grid', key: p.key, matrix: p.matrix || [1, 0, 0, 1],
           extent: p.extent ?? 6, step: p.step ?? 1, color: p.color || 'grid',
           handle: p.handle }; }

/** Arrow from origin (or opts.from) to v. `handle` binds the tip. */
export function vector(v, opts){ const p = o(opts);
  return { kind: 'vector', key: p.key, v, from: p.from || { x: 0, y: 0 },
           color: p.color || 'accent', label: p.label, width: p.width,
           handle: p.handle }; }

export function point(v, opts){ const p = o(opts);
  return { kind: 'point', key: p.key, v, color: p.color || 'accent',
           r: p.r, label: p.label, handle: p.handle }; }

/** Segment a->b. `handle` binds the nearest endpoint. */
export function segment(a, b, opts){ const p = o(opts);
  return { kind: 'segment', key: p.key, a, b, color: p.color || 'muted',
           width: p.width, dashed: !!p.dashed, label: p.label, handle: p.handle }; }

/** Plot y=fn(x) over opts.domain. */
export function curve(fn, opts){ const p = o(opts);
  return { kind: 'curve', key: p.key, fn, domain: p.domain,
           color: p.color || 'accent', width: p.width, samples: p.samples,
           handle: p.handle }; }

/** Filled region between fn and opts.to (default y=0). */
export function area(fn, opts){ const p = o(opts);
  return { kind: 'area', key: p.key, fn, domain: p.domain, to: p.to ?? 0,
           color: p.color || 'accent', alpha: p.alpha ?? 0.25, handle: p.handle }; }

/** Polygon over vec[] pts. `handle` binds the nearest vertex. */
export function polygon(pts, opts){ const p = o(opts);
  return { kind: 'polygon', key: p.key, pts, color: p.color || 'accent',
           fill: p.fill, alpha: p.alpha, closed: p.closed !== false,
           handle: p.handle }; }

/** Text label. `at:'readout'` renders to the DOM readout strip (a11y), not canvas. */
export function label(textOrFn, opts){ const p = o(opts);
  return { kind: 'label', key: p.key, text: textOrFn, at: p.at ?? 'readout',
           color: p.color, size: p.size, handle: p.handle }; }

/** Arc between directions u,w at opts.at. */
export function angleArc(u, w, opts){ const p = o(opts);
  return { kind: 'angleArc', key: p.key, u, w, at: p.at || { x: 0, y: 0 },
           r: p.r, color: p.color || 'muted', label: p.label, handle: p.handle }; }

/** Perpendicular drop lines from v to axes or a target. */
export function dropLine(v, opts){ const p = o(opts);
  return { kind: 'dropLine', key: p.key, v, to: p.to || 'axes',
           axis: p.axis || 'both', color: p.color || 'muted', handle: p.handle }; }

/** 2D scalar field / heatmap. values: number[][]. */
export function cellGrid(values, opts){ const p = o(opts);
  return { kind: 'cellGrid', key: p.key, values, at: p.at || { x: 0, y: 0 },
           cell: p.cell ?? 1, colormap: p.colormap, min: p.min, max: p.max,
           handle: p.handle }; }

/** Bar chart. values: number[]. */
export function bars(values, opts){ const p = o(opts);
  return { kind: 'bars', key: p.key, values, at: p.at || { x: 0, y: 0 },
           width: p.width, gap: p.gap, color: p.color || 'accent',
           labels: p.labels, handle: p.handle }; }
