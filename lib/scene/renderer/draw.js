/* ================================================================
   Scene Kit — per-kind draw layer for the Pixi backend.
   CONTRACT.md §3/§4. Owner: kit-core.

   This module receives Pixi CONSTRUCTORS (PIXI) injected by pixi.js —
   it never imports pixi itself, so the renderer-agnostic rule holds and
   this file is unit-reasoned without a bundler. Each entity kind maps to
   ONE Pixi node (a Graphics, or a Container{Graphics, Text} when it also
   carries a text label). Draw is deliberately simple (clear+redraw): the
   CPU budget is ~4% used at the target envelope; the risk is GPU-side, so
   we keep the graph shallow and the paths short rather than clever.
   ================================================================ */

// Semantic color tokens -> hex (dark theme, matches lib/engine.js palette).
// A raw CSS color string passes through untouched.
const TOKENS = {
  accent: 0x6ea8fe, accent2: 0xffb86b, muted: 0x8b93b0,
  grid: 0x2a3350, good: 0x5ee0a0, warn: 0xff6b6b, axis: 0xb8c0e0,
};
function color(c){ return (c != null && TOKENS[c] != null) ? TOKENS[c] : (c ?? 0xffffff); }

// Apply a 2x2 row-major matrix [a,b,c,d] to a world point.
function mul(m, x, y){ return m ? { x: m[0] * x + m[1] * y, y: m[2] * x + m[3] * y } : { x, y }; }

// Screen-space angle of a WORLD direction (y flips on screen).
function screenAngle(dx, dy){ return Math.atan2(-dy, dx); }

/**
 * Build the Pixi node for an entity. Returns { node, redraw(entity, space) }.
 * @param {Object} PIXI injected pixi module namespace
 * @param {Object} entity descriptor
 * @param {Object} space CONTRACT §6 (toScreen)
 */
export function makeNode(PIXI, entity, space){
  const g = new PIXI.Graphics();
  let text = null;                 // lazily created Text child for labels
  const node = new PIXI.Container();
  node.addChild(g);

  function ensureText(str){
    if(!text){
      text = new PIXI.Text({ text: str, style: new PIXI.TextStyle({ fill: 0xdfe6ff, fontSize: 13, fontWeight: '700' }) });
      text.anchor.set(0, 0.5);
      node.addChild(text);
    }
    text.text = str;
    return text;
  }
  function dropText(){ if(text){ node.removeChild(text); text.destroy(); text = null; } }

  function redraw(e, sp){
    g.clear();
    (DRAW[e.kind] || noop)(g, e, sp, PIXI, ensureText, dropText);
  }
  redraw(entity, space);
  return { node, redraw, destroy(){ node.destroy({ children: true }); } };
}

const noop = () => {};

// ---- arrowhead helper (screen coords) ----
function arrow(g, ax, ay, bx, by, col, w){
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
  if(len < 0.5){ return; }
  const ux = dx / len, uy = dy / len, hs = Math.min(13, len * 0.4);
  g.moveTo(ax, ay).lineTo(bx - ux * hs * 0.7, by - uy * hs * 0.7).stroke({ width: w || 3, color: col });
  g.moveTo(bx, by)
   .lineTo(bx - ux * hs - uy * hs * 0.45, by - uy * hs + ux * hs * 0.45)
   .lineTo(bx - ux * hs + uy * hs * 0.45, by - uy * hs - ux * hs * 0.45)
   .lineTo(bx, by).fill(col);
}

// Per-kind drawers. Each draws into a fresh-cleared Graphics `g`, in screen px.
const DRAW = {
  grid(g, e, sp){
    const m = e.matrix, E = e.extent, step = e.step || 1;
    for(let i = -E; i <= E + 1e-9; i += step){
      const axis = Math.abs(i) < 1e-9;
      const col = axis ? TOKENS.axis : TOKENS.grid, w = axis ? 1.5 : 1;
      // vertical world line x=i  and horizontal world line y=i, both under m
      const v0 = sp.toScreen(mul(m, i, -E)), v1 = sp.toScreen(mul(m, i, E));
      g.moveTo(v0.px, v0.py).lineTo(v1.px, v1.py).stroke({ width: w, color: col, alpha: axis ? 0.7 : 0.5 });
      const h0 = sp.toScreen(mul(m, -E, i)), h1 = sp.toScreen(mul(m, E, i));
      g.moveTo(h0.px, h0.py).lineTo(h1.px, h1.py).stroke({ width: w, color: col, alpha: axis ? 0.7 : 0.5 });
    }
  },
  vector(g, e, sp, PIXI, ensureText, dropText){
    const a = sp.toScreen(e.from), b = sp.toScreen(e.v);
    arrow(g, a.px, a.py, b.px, b.py, color(e.color), e.width);
    if(e.label){ const t = ensureText(e.label); t.x = b.px + 8; t.y = b.py - 8; } else dropText();
  },
  point(g, e, sp, PIXI, ensureText, dropText){
    const p = sp.toScreen(e.v);
    g.circle(p.px, p.py, e.r || 5).fill(color(e.color));
    if(e.label){ const t = ensureText(e.label); t.x = p.px + 8; t.y = p.py; } else dropText();
  },
  segment(g, e, sp, PIXI, ensureText, dropText){
    const a = sp.toScreen(e.a), b = sp.toScreen(e.b);
    g.moveTo(a.px, a.py).lineTo(b.px, b.py).stroke({ width: e.width || 2.5, color: color(e.color), alpha: e.dashed ? 0.6 : 1 });
    if(e.label){ const t = ensureText(e.label); t.x = (a.px + b.px) / 2 + 6; t.y = (a.py + b.py) / 2; } else dropText();
  },
  curve(g, e, sp){
    const [x0, x1] = e.domain || [sp.bounds().xmin, sp.bounds().xmax];
    const n = e.samples || 128; let started = false;
    for(let i = 0; i <= n; i++){
      const x = x0 + (x1 - x0) * i / n, y = e.fn(x);
      if(!isFinite(y)){ started = false; continue; }
      const s = sp.toScreen({ x, y });
      if(!started){ g.moveTo(s.px, s.py); started = true; } else g.lineTo(s.px, s.py);
    }
    g.stroke({ width: e.width || 2.5, color: color(e.color) });
  },
  area(g, e, sp){
    const [x0, x1] = e.domain || [sp.bounds().xmin, sp.bounds().xmax];
    const n = e.samples || 128, pts = [];
    for(let i = 0; i <= n; i++){ const x = x0 + (x1 - x0) * i / n; const s = sp.toScreen({ x, y: e.fn(x) }); pts.push(s.px, s.py); }
    for(let i = n; i >= 0; i--){ const x = x0 + (x1 - x0) * i / n; const s = sp.toScreen({ x, y: e.to }); pts.push(s.px, s.py); }
    g.poly(pts).fill({ color: color(e.color), alpha: e.alpha ?? 0.25 });
  },
  polygon(g, e, sp){
    const pts = [];
    for(const p of e.pts){ const s = sp.toScreen(p); pts.push(s.px, s.py); }
    g.poly(pts);
    if(e.fill) g.fill({ color: color(e.fill), alpha: e.alpha ?? 0.3 });
    g.stroke({ width: 2, color: color(e.color) });
  },
  angleArc(g, e, sp){
    const c = sp.toScreen(e.at), r = e.r || 26;
    const a0 = screenAngle(e.u.x, e.u.y), a1 = screenAngle(e.w.x, e.w.y);
    g.moveTo(c.px, c.py).arc(c.px, c.py, r, a0, a1).stroke({ width: 2, color: color(e.color) });
  },
  dropLine(g, e, sp){
    const p = sp.toScreen(e.v), col = color(e.color);
    if(e.axis === 'both' || e.axis === 'x'){ const f = sp.toScreen({ x: e.v.x, y: 0 }); g.moveTo(p.px, p.py).lineTo(f.px, f.py).stroke({ width: 1.5, color: col, alpha: 0.6 }); }
    if(e.axis === 'both' || e.axis === 'y'){ const f = sp.toScreen({ x: 0, y: e.v.y }); g.moveTo(p.px, p.py).lineTo(f.px, f.py).stroke({ width: 1.5, color: col, alpha: 0.6 }); }
  },
  cellGrid(g, e, sp){
    const rows = e.values.length, cols = rows ? e.values[0].length : 0, cell = e.cell || 1;
    let lo = e.min, hi = e.max;
    if(lo == null || hi == null){ lo = Infinity; hi = -Infinity; for(const row of e.values) for(const v of row){ if(v < lo) lo = v; if(v > hi) hi = v; } }
    const span = (hi - lo) || 1;
    for(let r = 0; r < rows; r++) for(let cx = 0; cx < cols; cx++){
      const t = (e.values[r][cx] - lo) / span;
      const w0 = { x: e.at.x + cx * cell, y: e.at.y - r * cell };
      const s0 = sp.toScreen(w0), s1 = sp.toScreen({ x: w0.x + cell, y: w0.y - cell });
      g.rect(s0.px, s0.py, s1.px - s0.px, s1.py - s0.py).fill({ color: color(e.color || 'accent'), alpha: 0.15 + 0.75 * t });
    }
  },
  bars(g, e, sp){
    const w = e.width || 0.6, gap = e.gap ?? 0.4;
    e.values.forEach((val, i) => {
      const x = e.at.x + i * (w + gap);
      const base = sp.toScreen({ x, y: e.at.y }), top = sp.toScreen({ x: x + w, y: e.at.y + val });
      g.rect(base.px, top.py, top.px - base.px, base.py - top.py).fill(color(e.color));
    });
  },
  label(g, e, sp, PIXI, ensureText){
    // Only on-canvas labels (at: vec) reach the backend; at:'readout' labels
    // are pulled out upstream (scene.js) and written to the DOM readout strip.
    const str = typeof e.text === 'function' ? e.text() : e.text;
    const t = ensureText(str);
    const p = sp.toScreen(e.at); t.x = p.px; t.y = p.py; t.anchor.set(0.5, 0.5);
  },
};

export { color as resolveColor };
