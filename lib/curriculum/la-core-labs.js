/* ================================================================
   WORLD 1 CORE — PROBLEM-SOLVING LABS (the "challenge" second lab
   for each foundational Linear Algebra lesson).
   ----------------------------------------------------------------
   These deepen the original single-canvas lessons in index.js from
   "drag and recognise" to "solve a problem". Each lab is one of:
     · construct-to-spec   — hit an exact numeric/geometric target
     · inverse problem      — given the OUTPUT, find the INPUT/transform
     · predict-then-verify  — commit an answer before the controls unlock
   so completion requires *producing* the right value, not sweeping a
   slider until a checkmark happens to fire.

   Registered as INTERACTIVES here; index.js references them from each
   lesson's `labs:` array. Loaded before validateCurriculum() runs.
   ================================================================ */
import { INTERACTIVES } from './registry.js';
import { makeLab, slider, chips, plane, clearBg, fmt2 } from '../engine.js';

const FONT = () => getComputedStyle(document.body).fontFamily;
function note(parent, html){
  const d = document.createElement('div'); d.className = 'ctrl';
  d.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">' + html + '</div>';
  parent.appendChild(d); return d;
}
// snap a world coordinate to a grid so exact targets are actually hittable
const snap = (v, g) => Math.round(v / g) * g;

// Bare DPR-scaled canvas for an EXPOSITION figure (no controls, no missions).
// A figure takes ONLY a stage: it builds its own canvas, draws once
// synchronously, and (if animated) returns a cancel cleanup. Headless-safe.
function figCanvas(stage, w, h){
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); wrap.appendChild(canvas); stage.appendChild(wrap);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.aspectRatio = w + '/' + h;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  return { canvas, ctx, W: w, H: h };
}

/* ================================================================
   EXPOSITION FIGURES for la-vectors ("see it first" gallery).
   Each is INTERACTIVES.key = function(stage){...}: builds its own
   canvas, never touches api.missions/api.predict, draws once
   synchronously, and returns a cancel cleanup only if it animates.
   No Math.random — deterministic so the headless audit is stable.
   ================================================================ */

/* vecReadings — one fixed arrow v=[3,2], morphing the highlight between its two
   readings: the component legs (as-numbers) and the angle-arc + length bracket
   (as-an-arrow). A right-hand panel shows BOTH readings at once, brightening
   whichever the morph is currently emphasizing. Auto-animated. */
INTERACTIVES.vecReadings = function(stage){
  const F = figCanvas(stage, 640, 260);
  const ctx = F.ctx, W = F.W, H = F.H;
  const P = plane(ctx, W, H, 46, 150, H / 2);
  const v = { x: 3, y: 2 };
  const mag = Math.hypot(v.x, v.y);              // 3.61
  const deg = Math.atan2(v.y, v.x) * 180 / Math.PI; // 33.7
  let t = 0, raf = 0;
  function draw(){
    clearBg(ctx, W, H);
    P.grid();
    const hi = 0.5 + 0.5 * Math.sin(t);           // 0..1 morph phase
    // component legs (cyan, dashed) — brighten when hi < 0.5
    ctx.save();
    ctx.globalAlpha = 0.2 + 0.8 * (1 - hi);
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(P.sx(0), P.sy(0)); ctx.lineTo(P.sx(v.x), P.sy(0)); ctx.stroke();       // x-leg
    ctx.beginPath(); ctx.moveTo(P.sx(v.x), P.sy(0)); ctx.lineTo(P.sx(v.x), P.sy(v.y)); ctx.stroke();   // y-leg
    ctx.setLineDash([]); ctx.restore();
    // origin angle-arc + length bracket (gold) — brighten when hi > 0.5
    ctx.save();
    ctx.globalAlpha = 0.2 + 0.8 * hi;
    const a1 = Math.atan2(v.y, v.x);
    ctx.strokeStyle = 'rgba(255,201,77,.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(P.sx(0), P.sy(0), 28, 0, -a1, true); ctx.stroke();
    // length bracket parallel to v, offset perpendicular in screen space
    const ax = P.sx(0), ay = P.sy(0), bx = P.sx(v.x), by = P.sy(v.y);
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, off = 14;
    ctx.beginPath();
    ctx.moveTo(ax + nx * off, ay + ny * off); ctx.lineTo(bx + nx * off, by + ny * off); ctx.stroke();
    ctx.font = '700 13px ' + FONT(); ctx.fillStyle = 'rgba(255,201,77,.95)'; ctx.textAlign = 'center';
    ctx.fillText('‖v‖ = ' + mag.toFixed(2), (ax + bx) / 2 + nx * (off + 12), (ay + by) / 2 + ny * (off + 12));
    ctx.restore();
    // the vector itself
    P.arrow(0, 0, v.x, v.y, '#7c5cff', 4, 'v');
    P.dot(v.x, v.y, 6, '#b9a8ff');
    // readout panel (right third): both readings, active one brightened
    ctx.save();
    ctx.fillStyle = '#0b0e1a'; ctx.fillRect(410, 0, W - 410, H);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1; ctx.fillStyle = '#8b93b8'; ctx.font = '700 12px ' + FONT();
    ctx.fillText('TWO READINGS, ONE VECTOR', 434, 40);
    const na = 0.35 + 0.65 * (1 - hi);
    ctx.globalAlpha = na; ctx.fillStyle = '#00d4ff'; ctx.font = '700 13px ' + FONT();
    ctx.fillText('as a list of numbers', 434, 78);
    ctx.fillStyle = '#aee8ff'; ctx.font = '600 20px ' + FONT();
    ctx.fillText('[ ' + fmt2(v.x) + ' ]', 440, 108);
    ctx.fillText('[ ' + fmt2(v.y) + ' ]', 440, 134);
    const aa = 0.35 + 0.65 * hi;
    ctx.globalAlpha = aa; ctx.fillStyle = '#ffc94d'; ctx.font = '700 13px ' + FONT();
    ctx.fillText('as an arrow', 434, 178);
    ctx.fillStyle = '#ffe6a8'; ctx.font = '600 18px ' + FONT();
    ctx.fillText('‖v‖ = ' + mag.toFixed(2), 440, 206);
    ctx.fillText('θ = ' + deg.toFixed(1) + '°', 440, 232);
    ctx.restore();
  }
  draw();                                          // synchronous first paint
  function loop(){ t += 0.02; draw(); raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
};

/* vecDataSpace — five animals plotted as arrows-from-origin in [speed, size]
   feature space. Static: shows that a data row IS a point/arrow. */
INTERACTIVES.vecDataSpace = function(stage){
  const F = figCanvas(stage, 640, 360);
  const ctx = F.ctx, W = F.W, H = F.H;
  const P = plane(ctx, W, H, 64, 60, H - 40);      // first-quadrant origin
  const ITEMS = [
    { emoji: '🐈', name: 'cat',      x: 2,   y: 1 },
    { emoji: '🐘', name: 'elephant', x: 1,   y: 4 },
    { emoji: '🐆', name: 'cheetah',  x: 4.5, y: 1.5 },
    { emoji: '🐢', name: 'turtle',   x: 0.5, y: 0.75 },
    { emoji: '🦅', name: 'hawk',     x: 4,   y: 0.75 },
  ];
  clearBg(ctx, W, H); P.grid();
  ITEMS.forEach(it => {
    P.arrow(0, 0, it.x, it.y, 'rgba(124,92,255,.35)', 2);
    P.dot(it.x, it.y, 6, '#b9a8ff');
    ctx.textAlign = 'center';
    ctx.font = '20px ' + FONT(); ctx.fillText(it.emoji, P.sx(it.x), P.sy(it.y) - 10);
    ctx.font = '600 12px ' + FONT(); ctx.fillStyle = '#cdd4f0';
    ctx.fillText(it.name, P.sx(it.x), P.sy(it.y) + 18);
  });
  ctx.fillStyle = '#8b93b8'; ctx.font = '700 13px ' + FONT();
  ctx.textAlign = 'right'; ctx.fillText('speed →', W - 16, H - 16);
  ctx.textAlign = 'left'; ctx.fillText('size ↑', 16, 26);
};

/* vecDims — a 2-D vector vs a ~14-component embedding, as bar charts, to show
   the dimension count is the only thing that changes. Static. */
INTERACTIVES.vecDims = function(stage){
  const F = figCanvas(stage, 640, 300);
  const ctx = F.ctx, W = F.W, H = F.H;
  clearBg(ctx, W, H);
  ctx.textAlign = 'left';
  // LEFT: 2-D vector [3, 2]
  ctx.fillStyle = '#cdd4f0'; ctx.font = '700 13px ' + FONT();
  ctx.fillText('a 2-D vector  [3, 2]', 30, 40);
  const base = 210, unit = 26, left = [3, 2];
  left.forEach((val, i) => {
    const x = 46 + i * 48, h = val * unit;
    ctx.fillStyle = '#00d4ff'; ctx.fillRect(x, base - h, 34, h);
    ctx.fillStyle = '#8b93b8'; ctx.font = '600 12px ' + FONT(); ctx.textAlign = 'center';
    ctx.fillText(String(val), x + 17, base + 16); ctx.textAlign = 'left';
  });
  // divider
  ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(206, 26); ctx.lineTo(206, base + 30); ctx.stroke();
  // RIGHT: a ~1,536-D embedding — a deterministic slice of 14 components
  ctx.fillStyle = '#cdd4f0'; ctx.font = '700 13px ' + FONT();
  ctx.fillText('a 1,536-D embedding  [0.2, −0.1, 0.7, …]', 234, 40);
  const emb = [0.2, -0.1, 0.7, 0.4, -0.5, 0.15, 0.9, -0.3, 0.55, -0.7, 0.35, 0.8, -0.2, 0.6];
  const rbase = 150, amp = 60, bw = 18, gap = 6, x0 = 244;
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(x0 - 6, rbase); ctx.lineTo(x0 + emb.length * (bw + gap) + 20, rbase); ctx.stroke();
  ctx.setLineDash([]);
  emb.forEach((val, i) => {
    const x = x0 + i * (bw + gap), h = val * amp;
    ctx.fillStyle = val >= 0 ? '#00d4ff' : '#ff5c7a';
    if (val >= 0) ctx.fillRect(x, rbase - h, bw, h);
    else ctx.fillRect(x, rbase, bw, -h);
  });
  ctx.fillStyle = '#8b93b8'; ctx.font = '700 22px ' + FONT();
  ctx.fillText('…', x0 + emb.length * (bw + gap), rbase + 8);
};

/* ================== la-vectors — Lab 3: polar view (r, θ) =====================
   Concept: the SAME arrow steered by length r and angle θ, with components
   [r·cosθ, r·sinθ]. Construct-to-spec: hit exact vectors via the two dials. */
INTERACTIVES.vectorsPolar = function(stage, api){
  const L = makeLab(stage);
  let r = 2, deg = 30;
  const angDiff = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };

  api.predict({
    prompt: 'Set <b>length 2</b> and <b>angle 30°</b>. Before building it, predict the <b>y-component</b> of \\([r\\cos\\theta,\\ r\\sin\\theta]\\).',
    input: true, placeholder: 'y-component', answer: 1, tol: 0.15, unit: '',
    reveal: 'y = r·sinθ = 2·sin30° = 2·½ = <b>1</b>. The angle sets the direction; the length scales both components together. sin30° = ½ is worth memorizing.',
  });

  const m = api.missions([
    {text: 'Build exactly <b>[3, 4]</b> from r and θ (the 3-4-5 vector)', xp: 25,
      check: s => Math.abs(s.x - 3) < 0.15 && Math.abs(s.y - 4) < 0.15},
    {text: 'Make a <b>unit vector into the second quadrant</b> (r = 1, x &lt; 0, y &gt; 0)', xp: 20,
      check: s => Math.abs(s.r - 1) <= 0.03 && s.x < -0.05 && s.y > 0.05},
    {text: 'Point the <b>exact opposite direction of 30°</b> at length 2 (i.e. 210°)', xp: 20,
      check: s => Math.abs(s.r - 2) < 0.1 && angDiff(s.deg, 210) < 3},
  ]);

  const P = plane(L.ctx, L.W, L.H, 52);
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    // unit circle (gold, dashed)
    L.ctx.strokeStyle = 'rgba(255,201,77,.55)'; L.ctx.lineWidth = 2; L.ctx.setLineDash([5, 4]);
    L.ctx.beginPath(); L.ctx.arc(P.sx(0), P.sy(0), 52, 0, 7); L.ctx.stroke(); L.ctx.setLineDash([]);
    const th = deg * Math.PI / 180;
    const vx = r * Math.cos(th), vy = r * Math.sin(th);
    // component legs (cyan, dashed)
    L.ctx.strokeStyle = 'rgba(0,212,255,.4)'; L.ctx.setLineDash([5, 5]); L.ctx.lineWidth = 2;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(0), P.sy(0)); L.ctx.lineTo(P.sx(vx), P.sy(0)); L.ctx.stroke();
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(vx), P.sy(0)); L.ctx.lineTo(P.sx(vx), P.sy(vy)); L.ctx.stroke();
    L.ctx.setLineDash([]);
    // origin angle arc
    L.ctx.strokeStyle = 'rgba(255,201,77,.85)'; L.ctx.lineWidth = 2;
    L.ctx.beginPath(); L.ctx.arc(P.sx(0), P.sy(0), 26, 0, -th, th > 0); L.ctx.stroke();
    P.arrow(0, 0, vx, vy, '#7c5cff', 4, 'v');
    P.dot(vx, vy, 6, '#b9a8ff');
    L.readout.innerHTML = 'r = ' + r.toFixed(2) + '   θ = ' + deg.toFixed(0) + '°<br>' +
      'v = [' + fmt2(vx) + ', ' + fmt2(vy) + ']';
    m.update({ r, deg, x: vx, y: vy });
  }
  slider(L.ctrl, 'length r', 0, 5, 0.05, r, x => x.toFixed(2), x => { r = x; draw(); });
  slider(L.ctrl, 'angle θ (°)', 0, 360, 1, deg, x => x.toFixed(0) + '°', x => { deg = x; draw(); });
  note(L.ctrl, 'Two dials instead of two components: <b>r</b> sets the length, <b>θ</b> the direction. The tip rides the gold unit circle when r = 1. Watch the cyan legs — the components <b>[r·cosθ, r·sinθ]</b> — follow along.');
  draw();
};

/* ================== la-vectors — Lab 4: vectors are data =====================
   Concept: a vector is a DATA point. Drag a probe and read the distance ranking
   to five animal points — a hand-run nearest-neighbor / similarity search. */
INTERACTIVES.vectorsData = function(stage, api){
  const L = makeLab(stage);
  const ITEMS = [
    { emoji: '🐈', name: 'cat',      x: 2,   y: 1 },
    { emoji: '🐘', name: 'elephant', x: 1,   y: 4 },
    { emoji: '🐆', name: 'cheetah',  x: 4.5, y: 1.5 },
    { emoji: '🐢', name: 'turtle',   x: 0.5, y: 0.75 },
    { emoji: '🦅', name: 'hawk',     x: 4,   y: 0.75 },
  ];
  const probe = { x: 1, y: 1 };

  api.predict({
    prompt: 'The probe sits at \\([1, 1]\\) and the cat at \\([2, 1]\\). Predict the <b>distance</b> between them.',
    input: true, placeholder: 'distance', answer: 1, tol: 0.1, unit: '',
    reveal: 'Distance = ‖[2,1] − [1,1]‖ = ‖[1, 0]‖ = √(1²+0²) = <b>1</b>. Nearest-neighbor search is just this Euclidean distance computed to every point, then sorted.',
  });

  const m = api.missions([
    {text: 'Give the probe <b>speed 4, size 0.75</b> — land exactly on the 🦅 hawk', xp: 20,
      check: s => s.dHawk < 0.2},
    {text: 'Back away from <b>🐢 turtle</b> — stay <b>≥ 1.0</b> from it while it is still your nearest neighbor', xp: 25,
      check: s => s.nearest === 'turtle' && s.dTurtle >= 1},
    {text: 'Stand <b>equally far from 🐈 cat and 🦅 hawk</b> (gap &lt; 0.15, both &lt; 2.5)', xp: 20,
      check: s => Math.abs(s.dCat - s.dHawk) < 0.15 && s.dCat < 2.5 && s.dHawk < 2.5},
  ]);

  const P = plane(L.ctx, L.W, L.H, 80, 70, L.H - 50);
  let drag = false;
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    const dists = ITEMS.map(it => ({ ...it, d: Math.hypot(it.x - probe.x, it.y - probe.y) }));
    const sorted = [...dists].sort((a, b) => a.d - b.d);
    const nearest = sorted[0];
    // dashed line probe -> nearest neighbor
    L.ctx.strokeStyle = 'rgba(255,201,77,.6)'; L.ctx.setLineDash([5, 5]); L.ctx.lineWidth = 2;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(probe.x), P.sy(probe.y)); L.ctx.lineTo(P.sx(nearest.x), P.sy(nearest.y)); L.ctx.stroke();
    L.ctx.setLineDash([]);
    dists.forEach(it => {
      const near = it.name === nearest.name;
      P.dot(it.x, it.y, 6, near ? '#2dd4a0' : '#b9a8ff');
      L.ctx.textAlign = 'center'; L.ctx.font = '20px ' + FONT();
      L.ctx.fillText(it.emoji, P.sx(it.x), P.sy(it.y) - 10);
    });
    L.ctx.fillStyle = '#ffc94d'; L.ctx.font = '22px ' + FONT(); L.ctx.textAlign = 'center';
    L.ctx.fillText('★', P.sx(probe.x), P.sy(probe.y) + 8);
    const find = n => dists.find(d => d.name === n).d;
    const top3 = sorted.slice(0, 3).map(it => it.emoji + ' ' + it.name + ' — ' + it.d.toFixed(2)).join('<br>');
    L.readout.innerHTML = 'probe ★ = [' + fmt2(probe.x) + ', ' + fmt2(probe.y) + ']<br>' +
      '<span style="color:#8b93b8">nearest 3:</span><br>' + top3;
    m.update({ dCat: find('cat'), dHawk: find('hawk'), dTurtle: find('turtle'), nearest: nearest.name, x: probe.x, y: probe.y });
  }
  L.canvas.addEventListener('pointerdown', e => { drag = true; L.canvas.setPointerCapture(e.pointerId); move(e); });
  L.canvas.addEventListener('pointermove', move);
  L.canvas.addEventListener('pointerup', () => drag = false);
  function move(e){ if (!drag) return; const p = L.toCanvas(e);
    probe.x = Math.max(0, snap(P.wx(p.x), 0.25)); probe.y = Math.max(0, snap(P.wy(p.y), 0.25)); draw(); }
  note(L.ctrl, 'Drag the gold <b>★ probe</b>. The dashed line always points to its <b>nearest neighbor</b> (green), and the readout ranks the closest three. This is exactly how similarity search works: encode everything as a vector, then find the closest one.');
  draw();
};

/* ================== la-vectors — Lab 2: Normalize to the unit circle ==========
   Concept: magnitude, unit vectors, normalization u = v/‖v‖. The learner drags
   v, then chooses the scalar c that lands c·v exactly on the unit circle — that
   is the computation c = 1/‖v‖, done by hand, not swept. */
INTERACTIVES.vectorsNorm = function(stage, api){
  const L = makeLab(stage);
  const v = {x:3, y:1.5}; let c = 1;

  api.predict({
    prompt: 'A vector \\(v = [6, 8]\\). Predict its magnitude <b>‖v‖</b> before you build anything.',
    input: true, placeholder: 'length of v', answer: 10, tol: 0.5, unit: '',
    reveal: '‖v‖ = √(6²+8²) = √100 = <b>10</b> (a 6-8-10 triangle). So to shrink v onto the unit circle you scale by c = 1/‖v‖ = 0.1. That reciprocal-of-the-length move is exactly <b>normalization</b>.',
  });

  const m = api.missions([
    {text:'Scale v onto the <b>unit circle</b>: choose c so ‖c·v‖ = 1.00 (± 0.03)', xp:25,
      check:s => Math.abs(s.len - 1) < 0.03 && s.len > 0.2},
    {text:'Now make a <b>unit vector pointing into Q2</b> (x &lt; 0, y &gt; 0, still on the circle)', xp:20,
      check:s => Math.abs(s.len - 1) < 0.04 && s.cvx < -0.05 && s.cvy > 0.05},
    {text:'Build the unit vector at <b>45°</b> — equal positive components, on the circle', xp:20,
      check:s => Math.abs(s.len - 1) < 0.05 && s.cvx > 0.1 && Math.abs(s.cvx - s.cvy) < 0.05},
  ]);

  const P = plane(L.ctx, L.W, L.H, 60);
  let drag = false;
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    // unit circle
    L.ctx.strokeStyle = 'rgba(255,201,77,.55)'; L.ctx.lineWidth = 2; L.ctx.setLineDash([5,4]);
    L.ctx.beginPath(); L.ctx.arc(P.sx(0), P.sy(0), 60, 0, 7); L.ctx.stroke(); L.ctx.setLineDash([]);
    const cv = {x:c*v.x, y:c*v.y};
    const len = Math.hypot(cv.x, cv.y);
    const onCircle = Math.abs(len - 1) < 0.03;
    P.arrow(0,0, v.x, v.y, 'rgba(124,92,255,.55)', 3, 'v');
    P.arrow(0,0, cv.x, cv.y, onCircle ? '#2dd4a0' : '#00d4ff', 4, 'c·v');
    P.dot(v.x, v.y, 7, '#b9a8ff');
    P.dot(cv.x, cv.y, 6, onCircle ? '#2dd4a0' : '#7fe7ff');
    L.readout.innerHTML = 'v = [' + fmt2(v.x) + ', ' + fmt2(v.y) + ']  ‖v‖ = ' + Math.hypot(v.x,v.y).toFixed(2) +
      '<br>c = ' + c.toFixed(2) + '  →  ‖c·v‖ = <span style="color:' + (onCircle?'#2dd4a0':'#ffc94d') + '">' +
      len.toFixed(3) + '</span>' + (onCircle ? '  ✓ unit' : '');
    m.update({len, cvx:cv.x, cvy:cv.y, c});
  }
  L.canvas.addEventListener('pointerdown', e=>{drag=true; L.canvas.setPointerCapture(e.pointerId); move(e);});
  L.canvas.addEventListener('pointermove', move);
  L.canvas.addEventListener('pointerup', ()=>drag=false);
  function move(e){ if(!drag) return; const p = L.toCanvas(e);
    v.x = snap(P.wx(p.x), 0.25); v.y = snap(P.wy(p.y), 0.25); draw(); }
  slider(L.ctrl, 'scalar c', 0, 2, 0.01, 1, x=>x.toFixed(2), x=>{c=x; draw();});
  note(L.ctrl, 'Drag <b style="color:#b9a8ff">v</b> to aim the direction; set <b>c</b> to control the length. The gold ring is the unit circle — landing the <b style="color:#2dd4a0">c·v</b> tip on it means you have normalized v. What is c in terms of ‖v‖?');
  draw();
};

/* ================== la-vecops — Lab 2: Reach the target =======================
   Concept: a linear combination c₁a + c₂b is a coordinate system. Reaching a
   target point means SOLVING the 2×2 system for (c₁, c₂) — the learner does this
   by reasoning, not by sweeping, because only one (c₁,c₂) hits each target. */
INTERACTIVES.vecopsReach = function(stage, api){
  const L = makeLab(stage);
  const a = {x:2, y:1}, b = {x:1, y:3};           // det = 5, invertible
  const TARGETS = [
    {name:'[5, 5]',  T:[5,5],  c:[2,1]},           // 2a + 1b
    {name:'[0, 5]',  T:[0,5],  c:[-1,2]},          // -1a + 2b
    {name:'[3, -1]', T:[3,-1], c:[2,-1]},          // 2a - 1b
  ];
  let ti = 0, c1 = 0, c2 = 0;

  api.predict({
    prompt: 'With \\(a = [2, 1]\\) and \\(b = [1, 3]\\), you want \\(c_1 \\cdot a + c_2 \\cdot b = [5, 5]\\).<br>Solve the system in your head and predict <b>c₁</b> (how many copies of a).',
    input: true, placeholder: 'c₁', answer: 2, tol: 0.3, unit: '',
    reveal: 'Solving 2c₁ + c₂ = 5 and c₁ + 3c₂ = 5 gives <b>c₁ = 2, c₂ = 1</b>. Every point in the plane has exactly one such (c₁, c₂) because a and b are independent — they are a <b>basis</b>, and (c₁, c₂) are the target\'s coordinates in it.',
  });

  const m = api.missions([
    {text:'Reach target <b>A = [5, 5]</b> (dist &lt; 0.15)', xp:20,
      check:s => s.ti === 0 && s.dist < 0.15},
    {text:'Switch to <b>B = [0, 5]</b> and reach it — note c₁ goes negative', xp:25,
      check:s => s.ti === 1 && s.dist < 0.15},
    {text:'Reach <b>C = [3, −1]</b> — a mix of +a and −b', xp:25,
      check:s => s.ti === 2 && s.dist < 0.15},
  ]);

  const P = plane(L.ctx, L.W, L.H, 44);
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    const T = TARGETS[ti].T;
    const r = {x:c1*a.x + c2*b.x, y:c1*a.y + c2*b.y};
    const dist = Math.hypot(r.x - T[0], r.y - T[1]);
    const hit = dist < 0.15;
    // target
    L.ctx.strokeStyle = '#ffc94d'; L.ctx.setLineDash([4,4]); L.ctx.lineWidth = 1.5;
    L.ctx.strokeRect(P.sx(T[0]) - 10, P.sy(T[1]) - 10, 20, 20); L.ctx.setLineDash([]);
    P.dot(T[0], T[1], 6, 'rgba(255,201,77,.5)');
    // basis directions (faint full lines)
    L.ctx.strokeStyle = 'rgba(124,92,255,.2)'; L.ctx.lineWidth = 1;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(-6*a.x), P.sy(-6*a.y)); L.ctx.lineTo(P.sx(6*a.x), P.sy(6*a.y)); L.ctx.stroke();
    L.ctx.strokeStyle = 'rgba(0,212,255,.2)';
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(-6*b.x), P.sy(-6*b.y)); L.ctx.lineTo(P.sx(6*b.x), P.sy(6*b.y)); L.ctx.stroke();
    // tip-to-tail construction: c1·a, then +c2·b
    const ca = {x:c1*a.x, y:c1*a.y};
    P.arrow(0,0, ca.x, ca.y, '#7c5cff', 3.5, 'c₁a');
    L.ctx.globalAlpha = .6; P.arrow(ca.x, ca.y, r.x, r.y, '#00d4ff', 3, 'c₂b'); L.ctx.globalAlpha = 1;
    P.arrow(0,0, r.x, r.y, hit ? '#2dd4a0' : '#8b93b8', 4);
    P.dot(r.x, r.y, 6, hit ? '#2dd4a0' : '#cdd4f0');
    L.readout.innerHTML = 'target = [' + T[0] + ', ' + T[1] + ']<br>' +
      'c₁a + c₂b = [' + fmt2(r.x) + ', ' + fmt2(r.y) + ']<br>' +
      'distance = <span style="color:' + (hit?'#2dd4a0':'#ffc94d') + '">' + dist.toFixed(2) + '</span>' + (hit ? '  ✓ reached' : '');
    m.update({dist, ti});
  }
  slider(L.ctrl, 'c₁ (amount of a)', -3, 3, 0.25, 0, x=>x.toFixed(2), x=>{c1=x; draw();});
  slider(L.ctrl, 'c₂ (amount of b)', -3, 3, 0.25, 0, x=>x.toFixed(2), x=>{c2=x; draw();});
  const row = chips(L.ctrl, 'TARGET', TARGETS.map(t=>t.name), (i, btn, r)=>{
    ti = i; [...r.children].forEach(x=>x.classList.remove('on')); btn.classList.add('on'); draw();
  });
  row.children[0].classList.add('on');
  note(L.ctrl, 'Tune <b>c₁</b> and <b>c₂</b> so the green combination lands on the gold target. There is exactly one answer per target — read it off the tip-to-tail construction, don\'t guess. This is solving a 2×2 system by hand.');
  draw();
};

/* ================== la-dot — Lab 2: Hit the dot product =======================
   Concept: the dot product as a controllable quantity. Hitting a·b = 0 (build an
   orthogonal pair) or an exact positive/negative value forces the learner to
   reason about products of components rather than read off an angle. */
/* ================================================================
   EXPOSITION FIGURES for la-dot ("see it first" gallery).
   ================================================================ */

/* dotRegime — one fixed a, and b swinging from aligned to opposed, with the
   live a·b, cos θ, and a signed track showing the number slide positive→
   negative through zero at 90°. Auto-animated. */
INTERACTIVES.dotRegime = function(stage){
  const F = figCanvas(stage, 640, 300);
  const ctx = F.ctx, W = F.W, H = F.H;
  const P = plane(ctx, W, H, 46, 220, H / 2);
  let t = 0, raf = 0;
  const a = {x:2.4, y:0}, r = 2.2;
  function draw(){
    clearBg(ctx, W, H); P.grid();
    const phi = 0.5 * Math.PI * (1 + Math.sin(t));
    const b = {x:r*Math.cos(phi), y:r*Math.sin(phi)};
    const dot = a.x*b.x + a.y*b.y, cos = Math.cos(phi);
    const col = cos>0.3 ? '#2dd4a0' : cos<-0.3 ? '#ff5c7a' : '#ffc94d';
    // angle arc at origin between a and b
    const a0 = Math.atan2(a.y, a.x), a1 = Math.atan2(b.y, b.x);
    ctx.strokeStyle = 'rgba(255,201,77,.8)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(P.sx(0), P.sy(0), 34, -a0, -a1, ((a1-a0+2*Math.PI)%(2*Math.PI))<Math.PI ? true : false);
    ctx.stroke();
    P.arrow(0,0, a.x, a.y, '#7c5cff', 4, 'a');
    P.arrow(0,0, b.x, b.y, col, 4, 'b');
    // live readout
    ctx.textAlign = 'left';
    ctx.fillStyle = col; ctx.font = '700 16px ' + FONT();
    ctx.fillText('a·b = ' + dot.toFixed(2), 20, 28);
    ctx.fillStyle = '#8b93b8'; ctx.font = '600 13px ' + FONT();
    ctx.fillText('cos θ = ' + cos.toFixed(2), 20, 48);
    // signed track: 0 at center tick, marker slides ±90px with cos
    ctx.strokeStyle = '#39406b'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(20, 270); ctx.lineTo(200, 270); ctx.stroke();
    ctx.strokeStyle = '#8b93b8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(110, 262); ctx.lineTo(110, 278); ctx.stroke();
    ctx.fillStyle = '#6b7299'; ctx.font = '600 11px ' + FONT(); ctx.textAlign = 'center';
    ctx.fillText('0', 110, 258);
    const mx = 110 + 90 * (dot / (Math.hypot(a.x, a.y) * r));
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(mx, 270, 6, 0, 2*Math.PI); ctx.fill();
  }
  draw();
  function loop(){ t += 0.02; draw(); raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
};

/* dotShadow — fixed b, a rotating; the gold "shadow" is a's projection onto b
   (scalar projection a·b/‖b‖), flipping to the far side and negative when a
   leans past 90°. Auto-animated. */
INTERACTIVES.dotShadow = function(stage){
  const F = figCanvas(stage, 640, 300);
  const ctx = F.ctx, W = F.W, H = F.H;
  const P = plane(ctx, W, H, 50, W / 2, H / 2);
  let t = 0, raf = 0;
  const b = {x:3, y:0.6};
  const nb2 = b.x*b.x + b.y*b.y, nb = Math.hypot(b.x, b.y);
  function draw(){
    clearBg(ctx, W, H); P.grid();
    // faint full b-line through the origin
    ctx.strokeStyle = 'rgba(0,212,255,.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(P.sx(-2*b.x), P.sy(-2*b.y)); ctx.lineTo(P.sx(2*b.x), P.sy(2*b.y)); ctx.stroke();
    const ang = t * 0.6;
    const a = {x:2.4*Math.cos(ang), y:2.4*Math.sin(ang)};
    const k = (a.x*b.x + a.y*b.y) / nb2;
    const foot = {x:k*b.x, y:k*b.y};
    const comp = (a.x*b.x + a.y*b.y) / nb;
    P.arrow(0,0, b.x, b.y, '#00d4ff', 3, 'b');
    P.arrow(0,0, a.x, a.y, '#7c5cff', 3, 'a');
    // dashed perpendicular from a's tip to its foot on b
    ctx.strokeStyle = 'rgba(139,147,184,.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([5,5]);
    ctx.beginPath(); ctx.moveTo(P.sx(a.x), P.sy(a.y)); ctx.lineTo(P.sx(foot.x), P.sy(foot.y)); ctx.stroke();
    ctx.setLineDash([]);
    // gold shadow along b (red if negative)
    P.arrow(0,0, foot.x, foot.y, comp>=0 ? '#ffc94d' : '#ff5c7a', 4);
    P.dot(foot.x, foot.y, 5, '#ffc94d');
    ctx.textAlign = 'left';
    ctx.fillStyle = comp>=0 ? '#ffc94d' : '#ff5c7a'; ctx.font = '700 16px ' + FONT();
    ctx.fillText('shadow (a·b / ‖b‖) = ' + comp.toFixed(2), 20, 28);
  }
  draw();
  function loop(){ t += 0.02; draw(); raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
};

/* dotSearchFig — one fixed query against four labelled keys, each scored by
   cosine similarity; the top match is highlighted, with a ranked list.
   STATIC (no animation). */
INTERACTIVES.dotSearchFig = function(stage){
  const F = figCanvas(stage, 640, 340);
  const ctx = F.ctx, W = F.W, H = F.H;
  const P = plane(ctx, W, H, 44, W / 2, H / 2);
  clearBg(ctx, W, H); P.grid();
  const q = {x:3, y:2};
  const KEYS = [
    {e:'🍎', n:'apple',  x:3.2, y:1.6},
    {e:'🍊', n:'orange', x:1,   y:3},
    {e:'🚗', n:'car',    x:-1,  y:2},
    {e:'🎸', n:'guitar', x:3,   y:-1},
  ];
  const nq = Math.hypot(q.x, q.y);
  const scored = KEYS.map(k => ({...k, cos:(q.x*k.x + q.y*k.y) / (nq * Math.hypot(k.x, k.y))}));
  const sorted = [...scored].sort((p, r) => r.cos - p.cos);
  const topN = sorted[0].n;
  ctx.textAlign = 'left';
  scored.forEach(k => {
    const col = k.cos>0.5 ? '#2dd4a0' : k.cos>-0.1 ? '#ffc94d' : '#ff5c7a';
    P.arrow(0,0, k.x, k.y, col, k.n===topN ? 4 : 3);
    ctx.fillStyle = col; ctx.font = '600 13px ' + FONT();
    ctx.fillText(k.e + ' ' + k.cos.toFixed(2), P.sx(k.x) + 8, P.sy(k.y) - 4);
  });
  P.arrow(0,0, q.x, q.y, '#ffc94d', 4, 'query');
  // ranked list, top-left
  ctx.fillStyle = '#8b93b8'; ctx.font = '700 12px ' + FONT();
  ctx.fillText('cosine to query', 16, 26);
  sorted.forEach((k, i) => {
    ctx.fillStyle = k.n===topN ? '#2dd4a0' : '#cdd4f0'; ctx.font = '600 13px ' + FONT();
    ctx.fillText(k.e + ' ' + k.n + '  ' + k.cos.toFixed(2), 16, 50 + i*22);
  });
};

INTERACTIVES.dotTarget = function(stage, api){
  const L = makeLab(stage);
  const a = {x:3, y:1}, b = {x:1, y:2};

  api.predict({
    prompt: 'Compute it by hand first: \\(a = [3, 4]\\), \\(b = [4, 3]\\). Predict <b>a · b</b>.',
    input: true, placeholder: 'a · b', answer: 24, tol: 0.5, unit: '',
    reveal: 'a·b = 3·4 + 4·3 = 12 + 12 = <b>24</b>. The dot product multiplies matching components and sums — one number, and here it is strongly positive because the two vectors point in nearly the same direction.',
  });

  const m = api.missions([
    {text:'Build an <b>orthogonal pair</b>: make a·b = 0 with both vectors long (‖a‖, ‖b‖ &gt; 1.5)', xp:25,
      check:s => Math.abs(s.dot) < 0.3 && s.na > 1.5 && s.nb > 1.5},
    {text:'Make the dot product <b>exactly +6</b> (± 0.4)', xp:20,
      check:s => Math.abs(s.dot - 6) < 0.4},
    {text:'Make the dot product <b>exactly −6</b> (± 0.4) — vectors leaning apart', xp:20,
      check:s => Math.abs(s.dot + 6) < 0.4},
  ]);

  const P = plane(L.ctx, L.W, L.H, 46);
  let dragging = null;
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    const dot = a.x*b.x + a.y*b.y;
    const na = Math.hypot(a.x,a.y), nb = Math.hypot(b.x,b.y);
    const col = Math.abs(dot) < 0.3 ? '#ffc94d' : dot > 0 ? '#2dd4a0' : '#ff5c7a';
    P.arrow(0,0, a.x, a.y, '#7c5cff', 4, 'a');
    P.arrow(0,0, b.x, b.y, '#00d4ff', 4, 'b');
    P.dot(a.x, a.y, 7, '#b9a8ff'); P.dot(b.x, b.y, 7, '#7fe7ff');
    // big dot-product readout on canvas
    L.ctx.fillStyle = col; L.ctx.font = 'bold 22px ' + FONT(); L.ctx.textAlign = 'left';
    L.ctx.fillText('a · b = ' + dot.toFixed(2), 24, 40);
    L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '13px ' + FONT();
    L.ctx.fillText('= (' + fmt2(a.x) + ')(' + fmt2(b.x) + ') + (' + fmt2(a.y) + ')(' + fmt2(b.y) + ')', 24, 62);
    L.readout.innerHTML = 'a = [' + fmt2(a.x) + ', ' + fmt2(a.y) + ']  b = [' + fmt2(b.x) + ', ' + fmt2(b.y) + ']<br>' +
      'a·b = <span style="color:' + col + '">' + dot.toFixed(2) + '</span>';
    m.update({dot, na, nb});
  }
  function pick(e){ const p = L.toCanvas(e), wx = P.wx(p.x), wy = P.wy(p.y);
    return (Math.hypot(wx-a.x, wy-a.y) < Math.hypot(wx-b.x, wy-b.y)) ? a : b; }
  L.canvas.addEventListener('pointerdown', e=>{dragging=pick(e); L.canvas.setPointerCapture(e.pointerId); move(e);});
  L.canvas.addEventListener('pointermove', move);
  L.canvas.addEventListener('pointerup', ()=>dragging=null);
  function move(e){ if(!dragging) return; const p = L.toCanvas(e);
    dragging.x = snap(P.wx(p.x), 0.25); dragging.y = snap(P.wy(p.y), 0.25); draw(); }
  note(L.ctrl, 'Drag both tips (snapped to a quarter grid). Watch the live sum <b>a·b = a₁b₁ + a₂b₂</b>. To hit a target value you have to trade the two products off against each other — orthogonal (0) means they cancel exactly.');
  draw();
};

/* ================== la-dot — Lab 3: Projection (the shadow) ==================
   Concept: scalar projection of a onto a FIXED b is a·b/‖b‖ = ‖a‖cos θ — the
   length of a's shadow on b. Drag a to hit an exact shadow length, zero it
   (orthogonal), and drive it negative (a leaning away from b). */
INTERACTIVES.dotProject = function(stage, api){
  const L = makeLab(stage);
  const b = {x:3, y:4}; const nb = 5, nb2 = 25;
  const a = {x:1, y:1};
  let drag = false;

  api.predict({
    prompt:'With \\(a = [4, 3]\\) and \\(b = [3, 4]\\) (‖b‖ = 5), the scalar projection of a onto b is \\(\\frac{a\\cdot b}{\\|b\\|}\\). Predict it.',
    input:true, placeholder:'a·b / ‖b‖', answer:4.8, tol:0.2, unit:'',
    reveal:'\\(a\\cdot b = 4\\cdot 3 + 3\\cdot 4 = 24\\); divide by \\(\\|b\\| = 5\\) to get \\(4.8\\). That is the length of a\'s shadow on b — how far along b you reach when you drop a perpendicular from a\'s tip.',
  });

  const m = api.missions([
    {text:'Set the shadow to exactly 2.0 (± 0.15)', xp:20, check:s => Math.abs(s.comp-2) < 0.15},
    {text:'Make the shadow vanish — a orthogonal to b (|shadow| &lt; 0.1) with ‖a‖ ≥ 1.5', xp:25, check:s => Math.abs(s.comp) < 0.1 && s.na >= 1.5},
    {text:'Make the shadow negative: ≤ −1.5 (a leaning away from b)', xp:20, check:s => s.comp <= -1.5},
  ]);

  const P = plane(L.ctx, L.W, L.H, 46);
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    // faint full b-line through the origin
    L.ctx.strokeStyle = 'rgba(0,212,255,.25)'; L.ctx.lineWidth = 1.5;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(-1.5*b.x), P.sy(-1.5*b.y)); L.ctx.lineTo(P.sx(1.5*b.x), P.sy(1.5*b.y)); L.ctx.stroke();
    P.arrow(0,0, b.x, b.y, '#00d4ff', 3.5, 'b');
    const abdot = a.x*b.x + a.y*b.y;
    const comp = abdot / nb;
    const k = abdot / nb2;
    const foot = {x:k*b.x, y:k*b.y};
    const na = Math.hypot(a.x, a.y);
    P.arrow(0,0, a.x, a.y, '#7c5cff', 3.5, 'a'); P.dot(a.x, a.y, 7, '#b9a8ff');
    // dashed perpendicular from a's tip to its foot on b
    L.ctx.strokeStyle = 'rgba(139,147,184,.6)'; L.ctx.lineWidth = 1.5; L.ctx.setLineDash([5,5]);
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(a.x), P.sy(a.y)); L.ctx.lineTo(P.sx(foot.x), P.sy(foot.y)); L.ctx.stroke();
    L.ctx.setLineDash([]);
    // gold shadow along b (red if negative)
    P.arrow(0,0, foot.x, foot.y, comp>=0 ? '#ffc94d' : '#ff5c7a', 4);
    L.readout.innerHTML = 'a·b = ' + abdot.toFixed(2) + '<br>‖b‖ = 5<br>shadow = a·b / ‖b‖ = <span style="color:' + (comp>=0 ? '#ffc94d' : '#ff5c7a') + '">' + comp.toFixed(2) + '</span>';
    m.update({comp, na});
  }
  L.canvas.addEventListener('pointerdown', e=>{drag=true; L.canvas.setPointerCapture(e.pointerId); move(e);});
  L.canvas.addEventListener('pointermove', move);
  L.canvas.addEventListener('pointerup', ()=>drag=false);
  function move(e){ if(!drag) return; const p = L.toCanvas(e);
    a.x = snap(P.wx(p.x), 0.25); a.y = snap(P.wy(p.y), 0.25); draw(); }
  note(L.ctrl, 'b is fixed; drag <b style="color:#b9a8ff">a</b>. The gold segment is a\'s <b>shadow</b> on b, length \\(\\frac{a\\cdot b}{\\|b\\|}\\). Lean a past 90° from b and the shadow flips negative.');
  draw();
};

/* ================== la-dot — Lab 4: Cosine search (be the query) ============
   Concept: rank fixed keys against a query by cosine similarity — pure
   direction, length divided out — exactly as attention scores Q·Kᵀ. Steer the
   query's direction to promote a key, orthogonalize one, or force a tie. */
INTERACTIVES.dotSearch = function(stage, api){
  const L = makeLab(stage);
  const q = {x:2, y:0.5};
  let drag = false;
  const KEYS = [
    {e:'🍎', n:'apple',  x:3,  y:1},
    {e:'🍊', n:'orange', x:1,  y:3},
    {e:'🚗', n:'car',    x:-2, y:1},
    {e:'🎸', n:'guitar', x:1,  y:-2},
  ];

  api.predict({
    prompt:'Cosine similarity divides out length. Key A points the <b>same direction</b> as the query (angle 0°) but is 3× longer; key B is the <b>same length</b> as the query but 30° off. Which has the higher cosine similarity?',
    choices:['Key A (angle 0°)', 'Key B (same length)', 'They tie — length cancels'],
    answer:0,
    reveal:'Cosine similarity is \\(\\cos\\theta\\) — it ignores length entirely. Key A is at 0° so \\(\\cos 0° = 1\\); key B is at 30° so \\(\\cos 30° \\approx 0.87\\). A wins on <b>direction</b>, not size — which is why search and attention normalize magnitude away.',
  });

  const m = api.missions([
    {text:'Promote 🚗 car to the top match by aligning direction (cos ≥ 0.98)', xp:20, check:s => s.top==='car' && s.topCos>=0.98},
    {text:'Make the query orthogonal to 🍎 apple (|cos| &lt; 0.03) with ‖query‖ ≥ 1.5', xp:25, check:s => Math.abs(s.cosApple)<0.03 && s.nq>=1.5},
    {text:'Force a tie between 🍎 apple and 🍊 orange (cosines within 0.02, both ≥ 0.5)', xp:20, check:s => Math.abs(s.cosApple-s.cosOrange)<0.02 && s.cosApple>=0.5 && s.cosOrange>=0.5},
  ]);

  const P = plane(L.ctx, L.W, L.H, 46);
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    const nq = Math.hypot(q.x, q.y) || 1e-9;
    const scored = KEYS.map(k => ({...k, cos:(q.x*k.x + q.y*k.y) / (nq * Math.hypot(k.x, k.y))}));
    const sorted = [...scored].sort((p, r) => r.cos - p.cos);
    const topK = sorted[0];
    L.ctx.textAlign = 'left';
    scored.forEach(k => {
      const col = k.cos>0.5 ? '#2dd4a0' : k.cos>-0.1 ? '#ffc94d' : '#ff5c7a';
      P.arrow(0,0, k.x, k.y, col, k.n===topK.n ? 4 : 2.5); P.dot(k.x, k.y, 5, col);
      L.ctx.fillStyle = col; L.ctx.font = '600 13px ' + FONT();
      L.ctx.fillText(k.e + ' ' + k.cos.toFixed(2), P.sx(k.x) + 8, P.sy(k.y) - 4);
    });
    // dashed line query → top match tip
    L.ctx.strokeStyle = 'rgba(139,147,184,.5)'; L.ctx.lineWidth = 1.5; L.ctx.setLineDash([5,5]);
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(q.x), P.sy(q.y)); L.ctx.lineTo(P.sx(topK.x), P.sy(topK.y)); L.ctx.stroke();
    L.ctx.setLineDash([]);
    P.arrow(0,0, q.x, q.y, '#ffc94d', 4, 'query'); P.dot(q.x, q.y, 6, '#ffc94d');
    L.readout.innerHTML = sorted.map(k =>
      k.n===topK.n
        ? '<span style="color:#2dd4a0">' + k.e + ' ' + k.n + ' — ' + k.cos.toFixed(2) + '</span>'
        : k.e + ' ' + k.n + ' — ' + k.cos.toFixed(2)
    ).join('<br>');
    const find = n => scored.find(k => k.n===n).cos;
    m.update({top:topK.n, topCos:topK.cos, cosApple:find('apple'), cosOrange:find('orange'), nq});
  }
  L.canvas.addEventListener('pointerdown', e=>{drag=true; L.canvas.setPointerCapture(e.pointerId); move(e);});
  L.canvas.addEventListener('pointermove', move);
  L.canvas.addEventListener('pointerup', ()=>drag=false);
  function move(e){ if(!drag) return; const p = L.toCanvas(e);
    q.x = snap(P.wx(p.x), 0.25); q.y = snap(P.wy(p.y), 0.25); draw(); }
  note(L.ctrl, 'Drag the gold <b>query</b>. Keys are ranked by <b>cosine similarity</b> — pure direction. Point the query along a key to make it the top match; its length never changes the ranking.');
  draw();
};

/* ================== la-matrix — Lab 2: Aim the output (inverse) ===============
   Concept: M·x = x·col₁ + y·col₂. Given a FIXED matrix and a target output, the
   learner drags the INPUT to land the output on the target — solving M·x = t for
   x. That is the inverse question, foreshadowing la-inverse. */
INTERACTIVES.matrixAim = function(stage, api){
  const L = makeLab(stage);
  const MATS = [
    {name:'stretch [[2,0],[0,1]]', M:[2,0,0,1], target:[4,3], sol:[2,3]},
    {name:'rotate 90° CCW',        M:[0,-1,1,0], target:[0,2], sol:[2,0]},
    {name:'shear [[1,1],[0,1]]',   M:[1,1,0,1], target:[3,1], sol:[2,1]},
  ];
  let mi = 0;
  const x = {x:1, y:1};

  api.predict({
    prompt: 'The matrix \\(M = \\begin{bmatrix} 2 & 0 \\\\ 0 & 1 \\end{bmatrix}\\) doubles x and leaves y. It sends \\([3, 4]\\) to a point — predict that point\'s <b>x-coordinate</b>.',
    input: true, placeholder: 'output x', answer: 6, tol: 0.1, unit: '',
    reveal: 'M·[3,4] = [2·3, 1·4] = [<b>6</b>, 4]. Each output coordinate is a row of M dotted with the input. Now the reverse: you\'ll be given the OUTPUT and have to find the input that produces it.',
  });

  const m = api.missions([
    {text:'<b>Stretch</b> matrix: drag the input so the output lands on the gold target [4, 3]', xp:25,
      check:s => s.mi === 0 && s.dist < 0.2},
    {text:'<b>Rotate 90°</b>: find the input whose output is [0, 2] (undo the rotation in your head)', xp:25,
      check:s => s.mi === 1 && s.dist < 0.2},
    {text:'<b>Shear</b>: find the input mapping to [3, 1]', xp:20,
      check:s => s.mi === 2 && s.dist < 0.2},
  ]);

  const P = plane(L.ctx, L.W, L.H, 46);
  let drag = false;
  function apply(M, p){ return [M[0]*p[0] + M[1]*p[1], M[2]*p[0] + M[3]*p[1]]; }
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    const spec = MATS[mi], M = spec.M, T = spec.target;
    const y = apply(M, [x.x, x.y]);
    const dist = Math.hypot(y[0] - T[0], y[1] - T[1]);
    const hit = dist < 0.2;
    // target
    L.ctx.strokeStyle = '#ffc94d'; L.ctx.setLineDash([4,4]); L.ctx.lineWidth = 1.5;
    L.ctx.strokeRect(P.sx(T[0]) - 11, P.sy(T[1]) - 11, 22, 22); L.ctx.setLineDash([]);
    // input (draggable) and output
    P.arrow(0,0, x.x, x.y, '#7c5cff', 3.5, 'input x');
    P.arrow(0,0, y[0], y[1], hit ? '#2dd4a0' : '#00d4ff', 4, 'M·x');
    P.dot(x.x, x.y, 7, '#b9a8ff');
    P.dot(y[0], y[1], 6, hit ? '#2dd4a0' : '#7fe7ff');
    L.readout.innerHTML = 'M·x = [' + fmt2(y[0]) + ', ' + fmt2(y[1]) + ']  ·  target [' + T[0] + ', ' + T[1] + ']<br>' +
      'input x = [' + fmt2(x.x) + ', ' + fmt2(x.y) + ']  ·  gap = <span style="color:' + (hit?'#2dd4a0':'#ffc94d') + '">' +
      dist.toFixed(2) + '</span>' + (hit ? '  ✓' : '');
    m.update({dist, mi});
  }
  L.canvas.addEventListener('pointerdown', e=>{drag=true; L.canvas.setPointerCapture(e.pointerId); move(e);});
  L.canvas.addEventListener('pointermove', move);
  L.canvas.addEventListener('pointerup', ()=>drag=false);
  function move(e){ if(!drag) return; const p = L.toCanvas(e);
    x.x = snap(P.wx(p.x), 0.5); x.y = snap(P.wy(p.y), 0.5); draw(); }
  const row = chips(L.ctrl, 'MATRIX', MATS.map(s=>s.name), (i, btn, r)=>{
    mi = i; [...r.children].forEach(el=>el.classList.remove('on')); btn.classList.add('on'); draw();
  });
  row.children[0].classList.add('on');
  note(L.ctrl, 'You drag the <b style="color:#b9a8ff">input</b>; the matrix computes the <b style="color:#7fe7ff">output</b>. Your job is the reverse of multiplication: find the input whose output hits the gold target. That is what "solving M·x = t" means.');
  draw();
};

/* ================== la-matmul — Lab 2: Order matters, on a point ==============
   Concept: composition is non-commutative. Predict whether the two orders send a
   point to the same place, then watch both paths land differently. */
INTERACTIVES.matmulReach = function(stage, api){
  const L = makeLab(stage);
  const R = [0,-1,1,0];      // rotate 90° CCW
  const S = [1,1,0,1];       // shear →
  const p = {x:1, y:0.5};

  api.predict({
    prompt: 'R = rotate 90° CCW, S = shear→ (\\(\\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\end{bmatrix}\\)). Apply both to a point, in the two orders R∘S and S∘R. Do the orders land the point in the <b>same</b> place?',
    choices: ['Yes — order never matters', 'No — the two orders differ'],
    answer: 1,
    reveal: 'They differ. Matrix multiplication is <b>not commutative</b>: R·S ≠ S·R. Below, the <b style="color:#2dd4a0">green</b> path (R after S) and the <b style="color:#ff5c7a">red</b> path (S after R) end at different points for almost every input.',
  });

  const m = api.missions([
    {text:'Drag the point until the two orders are <b>far apart</b> (gap &gt; 1.5) — see how much order matters', xp:25,
      check:s => s.gap > 1.5},
    {text:'Send the point to the <b>origin</b> — the one place every linear map agrees (both outputs within 0.2 of 0)', xp:20,
      check:s => s.originBoth},
    {text:'Read off <b>R∘S</b> of [1, 0]: drag the point onto [1, 0] and watch the green tip', xp:20,
      check:s => s.atUnitX},
  ]);

  const P = plane(L.ctx, L.W, L.H, 46);
  let drag = false;
  function ap(M, q){ return [M[0]*q[0] + M[1]*q[1], M[2]*q[0] + M[3]*q[1]]; }
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    const rs = ap(R, ap(S, [p.x, p.y]));   // R after S
    const sr = ap(S, ap(R, [p.x, p.y]));   // S after R
    const gap = Math.hypot(rs[0]-sr[0], rs[1]-sr[1]);
    P.arrow(0,0, p.x, p.y, '#8b93b8', 3, 'p');
    P.arrow(0,0, rs[0], rs[1], '#2dd4a0', 4, 'R∘S');
    P.arrow(0,0, sr[0], sr[1], '#ff5c7a', 4, 'S∘R');
    P.dot(p.x, p.y, 7, '#cdd4f0');
    L.readout.innerHTML = 'p = [' + fmt2(p.x) + ', ' + fmt2(p.y) + ']<br>' +
      'R∘S(p) = [' + fmt2(rs[0]) + ', ' + fmt2(rs[1]) + ']<br>' +
      'S∘R(p) = [' + fmt2(sr[0]) + ', ' + fmt2(sr[1]) + ']<br>' +
      'gap = <span style="color:' + (gap>1.5?'#2dd4a0':'#ffc94d') + '">' + gap.toFixed(2) + '</span>';
    m.update({
      gap,
      originBoth: Math.hypot(rs[0],rs[1]) < 0.2 && Math.hypot(sr[0],sr[1]) < 0.2,
      atUnitX: Math.abs(p.x - 1) < 0.15 && Math.abs(p.y) < 0.15,
    });
  }
  L.canvas.addEventListener('pointerdown', e=>{drag=true; L.canvas.setPointerCapture(e.pointerId); move(e);});
  L.canvas.addEventListener('pointermove', move);
  L.canvas.addEventListener('pointerup', ()=>drag=false);
  function move(e){ if(!drag) return; const q = L.toCanvas(e);
    p.x = snap(P.wx(q.x), 0.25); p.y = snap(P.wy(q.y), 0.25); draw(); }
  note(L.ctrl, 'Drag the grey point <b>p</b>. <b style="color:#2dd4a0">Green</b> = rotate-after-shear, <b style="color:#ff5c7a">red</b> = shear-after-rotate. They almost never coincide — that gap is non-commutativity, and it is why layer order changes a network.');
  draw();
};

/* ================== la-det — Lab 2: Drag a column to control area =============
   Concept: det = signed area of the column parallelogram; det = 0 ⇔ columns are
   parallel (linearly dependent) ⇔ not invertible. Column 1 is pinned; the learner
   drags column 2 to hit a target area, including the singular case. */
INTERACTIVES.detBuild = function(stage, api){
  const L = makeLab(stage);
  const col1 = [2, 1];       // fixed î landing
  const col2 = {x:0, y:2};   // draggable ĵ landing

  api.predict({
    prompt: 'Column 1 is pinned at \\([2, 1]\\). You drag column 2 to \\([4, 2]\\). Predict the determinant <b>det = ad − bc</b>.',
    input: true, placeholder: 'det', answer: 0, tol: 0.1, unit: '',
    reveal: 'det = (2)(2) − (4)(1) = 4 − 4 = <b>0</b>. [4, 2] is exactly twice [2, 1] — the columns are <b>parallel</b>, so the parallelogram is flat. det = 0 means linearly dependent columns and a non-invertible matrix.',
  });

  const m = api.missions([
    {text:'<b>Collapse it</b>: drag column 2 parallel to column 1 so det ≈ 0 (± 0.1), column 2 non-trivial', xp:25,
      check:s => Math.abs(s.det) < 0.1 && (Math.abs(s.bx) + Math.abs(s.by)) > 0.5},
    {text:'Make the area <b>exactly 3</b> with positive orientation (det = +3 ± 0.15)', xp:25,
      check:s => Math.abs(s.det - 3) < 0.15},
    {text:'<b>Flip orientation</b>: make det clearly negative (det &lt; −1)', xp:20,
      check:s => s.det < -1},
  ]);

  const P = plane(L.ctx, L.W, L.H, 46);
  let drag = false;
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    const a = col1[0], c = col1[1], b = col2.x, d = col2.y;
    const det = a*d - b*c;
    const col = det < 0 ? 'rgba(255,92,122,' : Math.abs(det) < 0.1 ? 'rgba(255,201,77,' : 'rgba(45,212,160,';
    // parallelogram spanned by the two columns
    const pts = [[0,0], [a,c], [a+b, c+d], [b,d]];
    L.ctx.beginPath();
    pts.forEach((q,i)=>{ const sx = P.sx(q[0]), sy = P.sy(q[1]); i ? L.ctx.lineTo(sx,sy) : L.ctx.moveTo(sx,sy); });
    L.ctx.closePath(); L.ctx.fillStyle = col + '.22)'; L.ctx.fill();
    L.ctx.strokeStyle = col + '.9)'; L.ctx.lineWidth = 2.5; L.ctx.stroke();
    // parallel guide line through column 1 (the singular locus)
    L.ctx.strokeStyle = 'rgba(45,212,160,.2)'; L.ctx.lineWidth = 1; L.ctx.setLineDash([5,5]);
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(-6*a), P.sy(-6*c)); L.ctx.lineTo(P.sx(6*a), P.sy(6*c)); L.ctx.stroke();
    L.ctx.setLineDash([]);
    P.arrow(0,0, a, c, '#2dd4a0', 3.5, 'col 1 (fixed)');
    P.arrow(0,0, b, d, '#ff5c7a', 4, 'col 2');
    P.dot(b, d, 7, '#ffab4d');
    L.readout.innerHTML = 'M = [ ' + fmt2(a) + '  ' + fmt2(b) + ' ; ' + fmt2(c) + '  ' + fmt2(d) + ' ]<br>' +
      'det = (' + fmt2(a) + ')(' + fmt2(d) + ') − (' + fmt2(b) + ')(' + fmt2(c) + ') = <span style="color:' +
      (Math.abs(det)<0.1?'#ffc94d':det<0?'#ff5c7a':'#2dd4a0') + '">' + det.toFixed(2) + '</span>' +
      (Math.abs(det) < 0.1 ? '<br>⚠ singular — columns parallel' : det < 0 ? '<br>flipped orientation' : '');
    m.update({det, bx:b, by:d});
  }
  L.canvas.addEventListener('pointerdown', e=>{drag=true; L.canvas.setPointerCapture(e.pointerId); move(e);});
  L.canvas.addEventListener('pointermove', move);
  L.canvas.addEventListener('pointerup', ()=>drag=false);
  function move(e){ if(!drag) return; const p = L.toCanvas(e);
    col2.x = snap(P.wx(p.x), 0.25); col2.y = snap(P.wy(p.y), 0.25); draw(); }
  note(L.ctrl, 'Column 1 is pinned (green). Drag <b style="color:#ff5c7a">column 2</b> and watch the shaded area = |det|. Land it on the faint green line and the area vanishes: parallel columns ⇒ det = 0 ⇒ no inverse.');
  draw();
};

/* ================== la-eigen — Lab 2: Eigenvalue hunter =======================
   Concept: on a NON-symmetric matrix with no hint lines, find each eigendirection
   (Mv ∥ v) and read its eigenvalue off the stretch. M = [[3,1],[0,2]] is
   triangular, so λ ∈ {3, 2}; eigenvectors are [1,0] and [1,−1]. */
INTERACTIVES.eigenHunt = function(stage, api){
  const L = makeLab(stage);
  const M = [3,1,0,2];       // upper-triangular: eigenvalues 3 and 2
  const v = {x:2, y:0.4};

  api.predict({
    prompt: '\\(M = \\begin{bmatrix} 3 & 1 \\\\ 0 & 2 \\end{bmatrix}\\) is <b>triangular</b> (a zero in the lower-left). For a triangular matrix the eigenvalues are just the diagonal entries. Predict the <b>larger</b> eigenvalue.',
    input: true, placeholder: 'larger λ', answer: 3, tol: 0.1, unit: '',
    reveal: 'The diagonal is (3, 2), so the eigenvalues are <b>3</b> and 2 — no characteristic polynomial needed for a triangular matrix. Now hunt for the two directions that only stretch (never rotate), and confirm their stretch factors are 3 and 2.',
  });

  const m = api.missions([
    {text:'Find the <b>λ = 3</b> eigendirection: align v so M·v ∥ v with stretch ≈ 3', xp:25,
      check:s => s.par && Math.abs(s.ratio - 3) < 0.2},
    {text:'Find the <b>λ = 2</b> eigendirection — a different line, stretch ≈ 2', xp:25,
      check:s => s.par && Math.abs(s.ratio - 2) < 0.2},
    {text:'Show the y-axis is <b>not</b> an eigendirection: point v up [0, k] and watch M·v rotate off it (&gt; 10°)', xp:20,
      check:s => Math.abs(s.vx) < 0.25 && Math.abs(s.vy) > 0.8 && s.angDeg > 10},
  ]);

  const P = plane(L.ctx, L.W, L.H, 46);
  let drag = false;
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    const Mv = {x:M[0]*v.x + M[1]*v.y, y:M[2]*v.x + M[3]*v.y};
    const nv = Math.hypot(v.x, v.y) || 1e-9, nMv = Math.hypot(Mv.x, Mv.y);
    const cos = (v.x*Mv.x + v.y*Mv.y) / (nv*nMv || 1e-9);
    const angDeg = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
    const par = angDeg < 3;
    const ratio = nMv / nv;
    L.ctx.globalAlpha = .5; P.arrow(0,0, Mv.x, Mv.y, par ? '#2dd4a0' : '#ff5c7a', 3.5, 'M·v'); L.ctx.globalAlpha = 1;
    P.arrow(0,0, Mv.x, Mv.y, par ? '#2dd4a0' : '#ff5c7a', 3.5);
    P.arrow(0,0, v.x, v.y, '#7c5cff', 4, 'v');
    P.dot(v.x, v.y, 7, '#b9a8ff');
    L.ctx.fillStyle = par ? '#2dd4a0' : '#8b93b8'; L.ctx.font = 'bold 15px ' + FONT(); L.ctx.textAlign = 'left';
    L.ctx.fillText(par ? '✓ eigendirection — λ ≈ ' + ratio.toFixed(2) : 'angle(v, M·v) = ' + angDeg.toFixed(1) + '°', 24, 38);
    L.readout.innerHTML = 'M = [3 1; 0 2]<br>v = [' + fmt2(v.x) + ', ' + fmt2(v.y) + ']<br>' +
      'angle(v, M·v) = ' + angDeg.toFixed(1) + '°' + (par ? ' ✓' : '') + '<br>' +
      'stretch ‖M·v‖/‖v‖ = <span style="color:' + (par?'#2dd4a0':'#cdd4f0') + '">' + ratio.toFixed(2) + '</span>';
    m.update({par, ratio, angDeg, vx:v.x, vy:v.y});
  }
  L.canvas.addEventListener('pointerdown', e=>{drag=true; L.canvas.setPointerCapture(e.pointerId); move(e);});
  L.canvas.addEventListener('pointermove', move);
  L.canvas.addEventListener('pointerup', ()=>drag=false);
  function move(e){ if(!drag) return; const p = L.toCanvas(e);
    v.x = snap(P.wx(p.x), 0.1); v.y = snap(P.wy(p.y), 0.1); draw(); }
  note(L.ctrl, 'No hint lines this time. Drag <b style="color:#b9a8ff">v</b> until <b>M·v</b> lines up with it (turns green) — that is an eigenvector, and the readout\'s stretch factor is its eigenvalue λ. There are exactly two such lines here. Find both.');
  draw();
};
