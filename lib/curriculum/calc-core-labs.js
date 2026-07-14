/* ================================================================
   WORLD 2 CORE — PROBLEM-SOLVING LABS (the "challenge" second lab
   for each foundational Calculus lesson).
   ----------------------------------------------------------------
   Deepens the original single-canvas Calculus lessons in index.js
   from "watch the slope move" to "compute the answer, then verify".
   Each challenge lab opens with a predict-then-verify gate and uses
   construct-to-spec / compute-a-number missions:

     limits   -> factor a 0/0 form and discover a limit that DNE
     deriv    -> finite-difference gradient check (estimate f'(a))
     rules    -> build a polynomial to hit a target derivative
     chain    -> multiply local slopes through a 3-stage backward pass
     optim    -> classify critical points with the second derivative
     graddesc -> tune the learning rate to converge / oscillate / diverge
     integrals-> accumulate signed area to an exact target

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
function btnRow(parent, buttons){
  const d = document.createElement('div'); d.className = 'ctrl';
  const row = document.createElement('div'); row.className = 'chipbtns';
  buttons.forEach(b => { const el = document.createElement('button');
    el.className = 'chip'; el.textContent = b.label; el.onclick = b.on; row.appendChild(el); b.el = el; });
  d.appendChild(row); parent.appendChild(d); return d;
}
// Bare DPR-scaled canvas for an EXPOSITION figure (no controls, no missions).
function figCanvas(stage, w, h){
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas'); wrap.appendChild(canvas); stage.appendChild(wrap);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.aspectRatio = w + '/' + h;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  return { canvas, ctx, W: w, H: h };
}

/* ================== c-limits — Lab 2: Factor, evaluate, and find a DNE =========
   Evaluate two removable (0/0) limits by creeping to the hole, then meet a JUMP
   discontinuity where the left and right limits disagree, so the limit does not
   exist. Reading the approached value is the payoff — not a value AT the point. */
INTERACTIVES.limitsChallenge = function(stage, api){
  const L = makeLab(stage);
  const FN = [
    {name:'(x²−9)/(x−3)',    f:x=>(x*x-9)/(x-3),   a:3, L:6, kind:'removable'},
    {name:'(x²+x−6)/(x−2)',  f:x=>(x*x+x-6)/(x-2), a:2, L:5, kind:'removable'},
    {name:'jump at x=1',     f:x=> x<1 ? x+1 : x+3, a:1, kind:'jump', left:2, right:4},
  ];
  let fi = 0, x = 0, visitedL = false, visitedR = false;

  api.predict({
    prompt: 'Plug x = 3 into \\((x^2-9)/(x-3)\\) and you get 0/0. Factor it and predict the limit <b>lim<sub>x→3</sub></b>.',
    input: true, placeholder: 'the limit', answer: 6, tol: 0.05, unit: '',
    reveal: 'x²−9 = (x−3)(x+3), so away from the hole f(x) = x+3 → <b>6</b>. 0/0 is a "do more work" signal, never an answer. Now creep up on each hole and read the value the curve is heading for — then meet a jump where the two sides disagree.',
  });

  const m = api.missions([
    {text:'On <b>(x²−9)/(x−3)</b>: creep within 0.01 of the hole and read the limit ≈ 6', xp:20,
      check:s => s.fi === 0 && Math.abs(s.x - 3) < 0.01 && s.x !== 3},
    {text:'Switch to <b>(x²+x−6)/(x−2)</b>: factor, then creep to its hole (limit = 5)', xp:25,
      check:s => s.fi === 1 && Math.abs(s.x - 2) < 0.01 && s.x !== 2},
    {text:'On the <b>jump</b>: visit both sides of x=1 — left → 2, right → 4, so the limit <b>does not exist</b>', xp:25,
      check:s => s.fi === 2 && s.vL && s.vR},
  ]);

  const P = plane(L.ctx, L.W, L.H, 46, L.W/2 - 40, L.H/2 + 50);
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    const spec = FN[fi];
    // plot, skipping across the discontinuity
    P.fn(t => Math.abs(t - spec.a) < 1e-3 ? NaN : spec.f(t), '#7c5cff', 3);
    // hole / jump markers
    if(spec.kind === 'removable'){
      L.ctx.strokeStyle = '#7c5cff'; L.ctx.lineWidth = 2.5; L.ctx.fillStyle = '#11152a';
      L.ctx.beginPath(); L.ctx.arc(P.sx(spec.a), P.sy(spec.L), 6, 0, 7); L.ctx.fill(); L.ctx.stroke();
    } else {
      L.ctx.fillStyle = '#11152a'; L.ctx.strokeStyle = '#ff5c7a'; L.ctx.lineWidth = 2.5;
      L.ctx.beginPath(); L.ctx.arc(P.sx(spec.a), P.sy(spec.left), 6, 0, 7); L.ctx.fill(); L.ctx.stroke();
      L.ctx.beginPath(); L.ctx.arc(P.sx(spec.a), P.sy(spec.right), 6, 0, 7); L.ctx.fill(); L.ctx.stroke();
    }
    const y = spec.f(x);
    if(Math.abs(x - spec.a) > 1e-6 && isFinite(y)){
      L.ctx.setLineDash([4,4]); L.ctx.strokeStyle = 'rgba(0,212,255,.5)'; L.ctx.lineWidth = 1.5;
      L.ctx.beginPath(); L.ctx.moveTo(P.sx(x), P.sy(0)); L.ctx.lineTo(P.sx(x), P.sy(y)); L.ctx.stroke();
      L.ctx.setLineDash([]);
      P.dot(x, y, 6, '#00d4ff');
    }
    // left/right approach readout
    const eps = 0.02;
    const lv = spec.f(spec.a - eps), rv = spec.f(spec.a + eps);
    const dne = spec.kind === 'jump';
    L.readout.innerHTML = 'x = ' + x.toFixed(3) + '   f(x) = ' + (isFinite(y) ? y.toFixed(3) : '—') + '<br>' +
      'from left → ' + lv.toFixed(2) + '   ·   from right → ' + rv.toFixed(2) + '<br>' +
      (dne ? '<b style="color:#ff5c7a">left ≠ right → limit DOES NOT EXIST</b>'
           : '<b style="color:#2dd4a0">both sides → ' + spec.L + ' → limit exists</b>');
    if(fi === 2){ if(x < spec.a && x > spec.a - 0.3) visitedL = true; if(x > spec.a && x < spec.a + 0.3) visitedR = true; }
    m.update({fi, x, vL:visitedL, vR:visitedR});
  }
  slider(L.ctrl, 'x (drag toward the hole)', -1, 5, 0.005, 0, v=>v.toFixed(3), v=>{x=v; draw();});
  const row = chips(L.ctrl, 'FUNCTION', FN.map(s=>s.name), (i, btn, r)=>{
    fi = i; x = 0; visitedL = visitedR = false;
    [...r.children].forEach(el=>el.classList.remove('on')); btn.classList.add('on'); draw();
  });
  row.children[0].classList.add('on');
  note(L.ctrl, 'Two of these have a <b>hole</b> (0/0) — factor to find where the curve is heading. The third has a <b>jump</b>: approach x=1 from the left and the right and watch the two target values disagree. When they disagree, the limit does not exist.');
  draw();
};

/* ================== c-deriv — Lab 2: Finite-difference gradient check ==========
   The practical skill behind autodiff "grad-checking": estimate f'(a) numerically
   by shrinking h in the symmetric difference (f(a+h)−f(a−h))/2h, and match the
   true slope within tolerance. f is treated as a black box. */
INTERACTIVES.derivEstimate = function(stage, api){
  const L = makeLab(stage);
  const f = x => x*x*x/3;            // mystery cubic; true f'(x) = x^2
  const fp = x => x*x;
  const TARGETS = [ {a:2, d:4}, {a:1, d:1}, {a:-1.5, d:2.25} ];
  let ti = 0, h = 1;

  api.predict({
    prompt: 'For \\(f(x) = x^3/3\\) the derivative is \\(f\'(x) = x^2\\). Predict <b>f′(2)</b>.',
    input: true, placeholder: "f'(2)", answer: 4, tol: 0.05, unit: '',
    reveal: 'f′(2) = 2² = <b>4</b>. In real autodiff you check a hand-derived gradient against a numerical one: (f(a+h) − f(a−h)) / 2h for small h. Below, shrink h until your numerical estimate matches the true slope.',
  });

  const m = api.missions([
    {text:'At <b>a = 2</b>: shrink h until the numerical estimate is within 0.02 of the true f′ (= 4)', xp:20,
      check:s => s.ti === 0 && Math.abs(s.est - 4) < 0.02},
    {text:'Move to <b>a = 1</b> and estimate f′ (= 1) within 0.02', xp:25,
      check:s => s.ti === 1 && Math.abs(s.est - 1) < 0.02},
    {text:'Estimate the slope at the <b>negative</b> point a = −1.5 (true f′ = 2.25) within 0.03', xp:25,
      check:s => s.ti === 2 && Math.abs(s.est - 2.25) < 0.03},
  ]);

  const P = plane(L.ctx, L.W, L.H, 40, L.W/2, L.H/2);
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    P.fn(f, '#7c5cff', 3);
    const a = TARGETS[ti].a;
    const est = (f(a + h) - f(a - h)) / (2 * h);
    const fa = f(a);
    // secant through the two sample points
    L.ctx.strokeStyle = '#ffc94d'; L.ctx.lineWidth = 2.5;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(a - 6), P.sy(fa - 6*est)); L.ctx.lineTo(P.sx(a + 6), P.sy(fa + 6*est)); L.ctx.stroke();
    P.dot(a - h, f(a - h), 5, '#ffab4d');
    P.dot(a + h, f(a + h), 5, '#ffab4d');
    P.dot(a, fa, 7, '#00d4ff');
    const err = Math.abs(est - fp(a));
    const good = err < 0.02;
    L.ctx.fillStyle = good ? '#2dd4a0' : '#cdd4f0'; L.ctx.font = 'bold 15px ' + FONT(); L.ctx.textAlign = 'left';
    L.ctx.fillText('estimate f′(' + a + ') ≈ ' + est.toFixed(3), 22, 34);
    L.readout.innerHTML = 'a = ' + a + '   h = ' + h.toFixed(3) + '<br>' +
      'numerical f′ ≈ <span style="color:' + (good?'#2dd4a0':'#ffc94d') + '">' + est.toFixed(3) + '</span>   ·   true = ' + fp(a).toFixed(3) + '<br>' +
      'error = ' + err.toFixed(4) + (good ? '  ✓ matched' : '');
    m.update({ti, est, h});
  }
  slider(L.ctrl, 'h — step size (shrink me)', 0.002, 1.5, 0.002, 1, v=>v.toFixed(3), v=>{h=v; draw();});
  const row = chips(L.ctrl, 'POINT a', TARGETS.map(t=>'a = ' + t.a), (i, btn, r)=>{
    ti = i; [...r.children].forEach(el=>el.classList.remove('on')); btn.classList.add('on'); draw();
  });
  row.children[0].classList.add('on');
  note(L.ctrl, 'The two gold points sit a distance h on either side of a; the gold line is their secant. As h → 0 the secant slope converges to the true derivative. Shrink h until the numerical estimate matches — that is exactly how frameworks sanity-check a gradient.');
  draw();
};

/* ================================================================
   EXPOSITION FIGURES for c-deriv ("see it first" gallery).
   Each is INTERACTIVES.key = function(stage){...}: builds its own
   canvas, never touches api.missions/api.predict, draws once
   synchronously, and returns a cancel cleanup (all three animate).
   No Math.random — deterministic so the headless audit is stable.
   ================================================================ */

/* derSecantTangent — one fixed point a; a secant partner sweeps in as h
   oscillates toward 0, so the gold secant rotates onto the green dashed
   true tangent. Slope readout ticks toward f′(a) live. */
INTERACTIVES.derSecantTangent = function(stage){
  const F = figCanvas(stage, 640, 340);
  const ctx = F.ctx, W = F.W, H = F.H;
  const P = plane(ctx, W, H, 60, W/2, H - 70);
  const f = x => x*x/2;
  const a = 1.5;
  let t = 0, raf = 0;
  function draw(){
    clearBg(ctx, W, H); P.grid();
    P.fn(f, '#7c5cff', 3);
    const h = 0.05 + 1.75 * (0.5 + 0.5 * Math.cos(t));
    const fa = f(a), fb = f(a + h), slope = (fb - fa) / h;
    // gold secant through (a,fa)
    ctx.strokeStyle = '#ffc94d'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(P.sx(a - 6), P.sy(fa - 6*slope)); ctx.lineTo(P.sx(a + 6), P.sy(fa + 6*slope)); ctx.stroke();
    // green dashed true tangent (slope = a)
    ctx.setLineDash([5,5]); ctx.strokeStyle = 'rgba(45,212,160,.75)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(P.sx(a - 6), P.sy(fa - 6*a)); ctx.lineTo(P.sx(a + 6), P.sy(fa + 6*a)); ctx.stroke();
    ctx.setLineDash([]);
    P.dot(a, fa, 7, '#00d4ff'); P.dot(a + h, fb, 6, '#ffc94d');
    ctx.fillStyle = '#cdd4f0'; ctx.font = '700 13px ' + FONT(); ctx.textAlign = 'left';
    ctx.fillText('h = ' + h.toFixed(2) + '   secant slope = ' + slope.toFixed(2) + '  →  f′(a) = ' + a.toFixed(2), 14, 24);
  }
  draw();
  function loop(){ t += 0.02; draw(); raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
};

/* derSlopeFn — top curve f(x)=x²/2, bottom curve f′(x)=x. A point sweeps
   left↔right; the tangent slope on top literally equals the dot height on
   the bottom, made visible by the dashed vertical link between them. */
INTERACTIVES.derSlopeFn = function(stage){
  const F = figCanvas(stage, 640, 380);
  const ctx = F.ctx, W = F.W, H = F.H;
  const PT = plane(ctx, W, H, 46, W/2, 120);
  const PB = plane(ctx, W, H, 46, W/2, 300);
  const f = x => x*x/2, fp = x => x;
  let t = 0, raf = 0;
  function draw(){
    clearBg(ctx, W, H);
    PT.grid(); PT.fn(f, '#7c5cff', 3);
    PB.grid(); PB.fn(fp, '#00d4ff', 3);
    const a = 2.4 * Math.sin(t * 0.6);
    const s = fp(a);
    // top tangent at (a,f(a)), slope s, green
    ctx.strokeStyle = '#2dd4a0'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(PT.sx(a - 3), PT.sy(f(a) - 3*s)); ctx.lineTo(PT.sx(a + 3), PT.sy(f(a) + 3*s)); ctx.stroke();
    PT.dot(a, f(a), 6, '#2dd4a0');
    // dashed vertical link: slope up top → height down below
    ctx.setLineDash([4,4]); ctx.strokeStyle = 'rgba(0,212,255,.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PT.sx(a), PT.sy(f(a))); ctx.lineTo(PB.sx(a), PB.sy(s)); ctx.stroke();
    ctx.setLineDash([]);
    PB.dot(a, s, 6, '#00d4ff');
    ctx.fillStyle = '#cdd4f0'; ctx.font = '700 13px ' + FONT(); ctx.textAlign = 'left';
    ctx.fillText('f(x) = x²/2', 14, 24);
    ctx.fillText('f′(x) = x  (slope above = height here)', 14, 204);
  }
  draw();
  function loop(){ t += 0.02; draw(); raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
};

/* derLocalLinear — a live optical zoom into the point (a,f(a)) on x²/2. As
   the pixels-per-unit scale swells, the curve flattens onto its tangent line,
   showing WHY a derivative exists: smooth curves are locally straight. */
INTERACTIVES.derLocalLinear = function(stage){
  const F = figCanvas(stage, 640, 320);
  const ctx = F.ctx, W = F.W, H = F.H;
  const f = x => x*x/2, a = 1, fa = f(a);
  let t = 0, raf = 0;
  function draw(){
    clearBg(ctx, W, H);
    const zoom = 1 + 5 * (0.5 + 0.5 * Math.sin(t));
    const P = plane(ctx, W, H, 40 * zoom, W/2 - a*40*zoom, H/2 + fa*40*zoom);
    P.grid(); P.fn(f, '#7c5cff', 3);
    // green dashed tangent through (a,fa), slope a (=1)
    ctx.setLineDash([5,5]); ctx.strokeStyle = 'rgba(45,212,160,.75)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(P.sx(a - 6), P.sy(fa - 6*a)); ctx.lineTo(P.sx(a + 6), P.sy(fa + 6*a)); ctx.stroke();
    ctx.setLineDash([]);
    P.dot(a, fa, 6, '#00d4ff');
    ctx.fillStyle = '#cdd4f0'; ctx.font = '700 13px ' + FONT(); ctx.textAlign = 'left';
    ctx.fillText('zoom ×' + zoom.toFixed(1) + ' — the curve flattens onto its tangent', 14, 24);
  }
  draw();
  function loop(){ t += 0.02; draw(); raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
};

/* ================== c-deriv — Lab 3: Trace out the derivative function ==========
   Read the tangent slope of f(x)=x²/2 at each integer x, stamp it as a point,
   and watch the stamps trace f′(x)=x — a straight line. Proves the derivative
   is a function in its own right by drawing it one slope-reading at a time. */
INTERACTIVES.derivTrace = function(stage, api){
  const L = makeLab(stage);
  const f = x => x*x/2, fp = x => x;
  let a = -2, stamps = [], revealed = false;
  const XS = [-2, -1, 0, 1, 2];

  api.predict({
    prompt:'For \\(f(x)=\\tfrac12 x^2\\) the slope at each point is \\(f\'(x)=x\\). If you plot the slope at every \\(x\\), what shape do the stamped points form?',
    choices:['A straight line through the origin','The same parabola as f','A flat horizontal line'],
    answer:0,
    reveal:'The slope of \\(\\tfrac12 x^2\\) is \\(f\'(x)=x\\) — a straight line through the origin. Plotting the slope at every point literally draws the derivative <b>function</b>.',
  });

  const m = api.missions([
    {text:'Stamp the slope at 3 different x-values', xp:15, check:s=>s.stampCount>=3},
    {text:'Stamp all five (x = −2, −1, 0, 1, 2) to trace f′', xp:25, check:s=>s.allX===true},
    {text:'Reveal f′ and confirm every stamp lands on it (slope-reading was correct)', xp:20, check:s=>s.revealed && s.allX && s.onCurve},
  ]);

  const P = plane(L.ctx, L.W, L.H, 40);
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    P.fn(f, '#7c5cff', 3);
    // gold tangent at current a
    const s = fp(a), fa = f(a);
    L.ctx.strokeStyle = '#ffc94d'; L.ctx.lineWidth = 2.5;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(a - 3), P.sy(fa - 3*s)); L.ctx.lineTo(P.sx(a + 3), P.sy(fa + 3*s)); L.ctx.stroke();
    P.dot(a, fa, 6, '#ffc94d');
    // stamps
    stamps.forEach(st => P.dot(st.x, st.y, 6, '#00d4ff'));
    if(revealed) P.fn(fp, 'rgba(0,212,255,.6)', 2);
    const covered = XS.filter(xv => stamps.some(st => Math.abs(st.x - xv) < 0.15)).length;
    const onCurve = stamps.every(st => Math.abs(st.y - fp(st.x)) < 0.1);
    L.readout.innerHTML = 'read position x = ' + a.toFixed(2) + '<br>slope = f′(a) = ' + a.toFixed(2) + '<br>stamps: ' + stamps.length + ' / 5';
    m.update({stampCount:stamps.length, covered, onCurve, revealed, allX:covered === XS.length});
  }
  slider(L.ctrl, 'read position x', -2.5, 2.5, 0.05, -2, v=>v.toFixed(2), v=>{a=v; draw();});
  btnRow(L.ctrl, [
    {label:'Stamp slope here', on:()=>{ const xv = XS.reduce((b,c)=>Math.abs(c-a)<Math.abs(b-a)?c:b, XS[0]); if(Math.abs(xv-a)<0.15 && !stamps.some(st=>Math.abs(st.x-xv)<0.15)){ stamps.push({x:xv, y:fp(xv)}); draw(); } }},
    {label:'Reveal f′', on:()=>{ revealed = !revealed; draw(); }},
    {label:'Clear', on:()=>{ stamps = []; draw(); }},
  ]);
  note(L.ctrl, 'Move to an x-value, read the tangent slope f′(x), and press Stamp to drop it as a point below. Stamp x = −2, −1, 0, 1, 2 and the dots trace out f′(x) = x — a straight line. The derivative is its own function.');
  draw();
};

/* ================== c-deriv — Lab 4: Sign of f′ ↔ shape of f ====================
   Slide along f(x)=x³/3−x and colour-read its slope f′(x)=x²−1: gold rising,
   red falling, green flat. The two flat spots at x=±1 are exactly where f turns
   around — the reading that seeds every optimization algorithm. */
INTERACTIVES.derivSign = function(stage, api){
  const L = makeLab(stage);
  const f = x => x*x*x/3 - x, fp = x => x*x - 1;
  let x = 0.9;

  api.predict({
    prompt:'On \\(f(x)=\\tfrac{x^3}{3}-x\\), where is \\(f\\) <b>falling</b> (going downhill as x increases)?',
    choices:['Between the two turning points, \\(-1<x<1\\)','Everywhere','Only for \\(x>1\\)'],
    answer:0,
    reveal:'\\(f\'(x)=x^2-1\\) is <b>negative</b> exactly when \\(-1<x<1\\), so \\(f\\) falls there; it is positive (rising) for \\(|x|>1\\), and zero at the turning points \\(x=\\pm 1\\). The sign of \\(f\'\\) is the shape of \\(f\\).',
  });

  const m = api.missions([
    {text:'Stand where f is FALLING: make f′(x) &lt; −0.5', xp:15, check:s=>s.slope<-0.5},
    {text:'Stand where f is RISING: make f′(x) &gt; 1', xp:20, check:s=>s.slope>1},
    {text:'Find a FLAT spot: f′(x) ≈ 0 (a turning point at x = ±1)', xp:25, check:s=>Math.abs(s.slope)<0.08},
  ]);

  const P = plane(L.ctx, L.W, L.H, 70, L.W/2, L.H/2);
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    P.fn(f, '#7c5cff', 3);
    const s = fp(x);
    const col = Math.abs(s) < 0.08 ? '#2dd4a0' : s > 0 ? '#ffc94d' : '#ff5c7a';
    const fx = f(x);
    L.ctx.strokeStyle = col; L.ctx.lineWidth = 2.5;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(x - 2.5), P.sy(fx - 2.5*s)); L.ctx.lineTo(P.sx(x + 2.5), P.sy(fx + 2.5*s)); L.ctx.stroke();
    P.dot(x, fx, 7, col);
    // faint turning-point marks at x = ±1
    L.ctx.fillStyle = 'rgba(205,212,240,.35)';
    P.dot(-1, f(-1), 4, 'rgba(205,212,240,.35)');
    P.dot(1, f(1), 4, 'rgba(205,212,240,.35)');
    L.readout.innerHTML = 'x = ' + x.toFixed(2) + '<br>f′(x) = x²−1 = <span style="color:' + col + '">' + s.toFixed(2) + '</span><br>' +
      (Math.abs(s) < 0.08 ? 'flat (f′ = 0)' : s > 0 ? 'rising (f′ > 0)' : 'falling (f′ < 0)');
    m.update({x, slope:s});
  }
  slider(L.ctrl, 'x', -2.5, 2.5, 0.05, 0.9, v=>v.toFixed(2), v=>{x=v; draw();});
  note(L.ctrl, 'Slide along the curve and read f′(x) = x² − 1. Gold = rising (f′ > 0), red = falling (f′ < 0), green = flat (f′ = 0). The two flat spots at x = ±1 are exactly where f turns around — the seed of optimization.');
  draw();
};

/* ================== c-rules — Lab 2: Build a polynomial to spec ================
   Set the coefficients of g(x) = a·x² + b·x so its derivative g′(x) = 2a·x + b
   satisfies a target: a chosen slope at a point, a constant derivative, a vertex
   at a chosen x. Forces working the power/sum/constant-multiple rules backward. */
INTERACTIVES.rulesChallenge = function(stage, api){
  const L = makeLab(stage);
  let a = 1, b = 0;

  api.predict({
    prompt: 'Differentiate \\(3x^2\\) with the power rule, then evaluate at x = 2. Predict <b>the value of the derivative there</b>.',
    input: true, placeholder: "d/dx of 3x² at x=2", answer: 12, tol: 0.05, unit: '',
    reveal: 'd/dx(3x²) = 6x, and 6·2 = <b>12</b>. Below you build g(x) = a·x² + b·x and read its derivative g′(x) = 2a·x + b live — then bend it to hit each target.',
  });

  const m = api.missions([
    {text:'Make the slope at x = 1 equal <b>5</b>:  g′(1) = 2a + b = 5', xp:20,
      check:s => Math.abs(2*s.a + s.b - 5) < 0.05},
    {text:'Make the derivative <b>constant everywhere</b> (a flat g′ line) — so g is linear', xp:20,
      check:s => Math.abs(s.a) < 0.01 && Math.abs(s.b) > 0.4},
    {text:'Put the <b>vertex</b> (where g′ = 0) at x = 2:  g′(2) = 4a + b = 0, with a ≠ 0', xp:25,
      check:s => Math.abs(4*s.a + s.b) < 0.1 && Math.abs(s.a) > 0.1},
  ]);

  const P = plane(L.ctx, L.W, L.H, 40, L.W/2, L.H/2);
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    const g = x => a*x*x + b*x, gp = x => 2*a*x + b;
    P.fn(g, '#7c5cff', 3);
    P.fn(gp, 'rgba(0,212,255,.75)', 2);
    // markers: g' at x=1 and vertex
    const xv = Math.abs(a) > 1e-6 ? -b/(2*a) : NaN;
    if(isFinite(xv) && Math.abs(xv) < 6){ P.dot(xv, g(xv), 5, '#ffc94d'); }
    L.readout.innerHTML = 'g(x) = ' + fmt2(a) + 'x² + ' + fmt2(b) + 'x<br>' +
      "g′(x) = " + fmt2(2*a) + 'x + ' + fmt2(b) + '<br>' +
      "g′(1) = " + (2*a + b).toFixed(2) + '   ·   vertex at x = ' + (isFinite(xv) ? xv.toFixed(2) : '—');
    m.update({a, b});
  }
  slider(L.ctrl, 'a — the x² coefficient', -2, 2, 0.25, 1, v=>v.toFixed(2), v=>{a=v; draw();});
  slider(L.ctrl, 'b — the x coefficient', -4, 4, 0.5, 0, v=>v.toFixed(2), v=>{b=v; draw();});
  note(L.ctrl, '<b style="color:#b9a8ff">Purple</b> = g(x); <b style="color:#7fe7ff">cyan</b> = its derivative g′(x) = 2a·x + b, always a straight line. Read the rules backward: which a, b give the slope, the flatness, or the vertex the mission asks for?');
  draw();
};

/* ================== c-chain — Lab 2: Backprop through three stages =============
   Set the three local slopes of a chain w→u→v→L; the total derivative is their
   product. Hit a target gradient, flip its sign, and manufacture a vanishing
   gradient — the compounding that motivates ResNets/LSTMs. */
INTERACTIVES.chainChallenge = function(stage, api){
  const L = makeLab(stage, {h: 380});
  let s1 = 2, s2 = 1.5, s3 = 1;

  api.predict({
    prompt: 'A 2-stage chain has local slopes \\(du/dw = 2\\) and \\(dL/du = 3\\). The chain rule says dL/dw is their <b>product</b>. Predict <b>dL/dw</b>.',
    input: true, placeholder: 'dL/dw', answer: 6, tol: 0.05, unit: '',
    reveal: 'dL/dw = 3 × 2 = <b>6</b> — local slopes multiply along the chain. Below, a 3-stage chain: set each local slope and watch the product. Multiply along a path; that product IS the gradient backprop delivers.',
  });

  const m = api.missions([
    {text:'Make the total gradient <b>dL/dw = 12</b> (± 0.1)', xp:20,
      check:s => Math.abs(s.prod - 12) < 0.1},
    {text:'Make the gradient <b>negative</b> — an odd number of negative slopes', xp:20,
      check:s => s.prod < -0.5},
    {text:'Manufacture a <b>vanishing gradient</b>: every |slope| ≤ 0.5 (nonzero), product below 0.15', xp:25,
      check:s => Math.abs(s.s1)<=0.5 && Math.abs(s.s2)<=0.5 && Math.abs(s.s3)<=0.5 &&
                 s.s1!==0 && s.s2!==0 && s.s3!==0 && Math.abs(s.prod) < 0.15},
  ]);

  function draw(){
    const ctx = L.ctx, W = L.W;
    clearBg(ctx, W, L.H);
    const prod = s1 * s2 * s3;
    const nodes = [ {x:70, label:'w'}, {x:230, label:'u'}, {x:390, label:'v'}, {x:530, label:'L'} ];
    const y = 110;
    const slopes = [s1, s2, s3];
    function node(cx, label, color){
      ctx.fillStyle = '#1d2342'; ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(cx - 34, y - 28, 68, 56, 11); ctx.fill(); ctx.stroke();
      ctx.fillStyle = color; ctx.font = '800 20px ' + FONT(); ctx.textAlign = 'center';
      ctx.fillText(label, cx, y + 7);
    }
    for(let i = 0; i < 3; i++){
      const x0 = nodes[i].x + 34, x1 = nodes[i+1].x - 34;
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1 - 8, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 - 10, y - 5); ctx.lineTo(x1 - 10, y + 5); ctx.fill();
      ctx.fillStyle = slopes[i] < 0 ? '#ff9db1' : '#ffc94d'; ctx.font = '700 13px ' + FONT();
      ctx.textAlign = 'center'; ctx.fillText('×' + slopes[i].toFixed(2), (x0 + x1)/2, y - 14);
    }
    nodes.forEach((n, i) => node(n.x, n.label, i === 3 ? (Math.abs(prod) < 0.15 ? '#ff5c7a' : '#2dd4a0') : '#7c5cff'));
    ctx.fillStyle = '#ff9db1'; ctx.font = '800 13px ' + FONT(); ctx.textAlign = 'center';
    ctx.fillText('◀ BACKWARD PASS — multiply the local slopes', W/2, y + 70);
    ctx.fillStyle = Math.abs(prod) < 0.15 ? '#ff5c7a' : '#2dd4a0'; ctx.font = '800 18px ' + FONT();
    ctx.fillText('dL/dw = ' + s1.toFixed(2) + ' × ' + s2.toFixed(2) + ' × ' + s3.toFixed(2) + ' = ' + prod.toFixed(3), W/2, y + 100);
    ctx.textAlign = 'left';
    L.readout.innerHTML = 'dL/dw = <b>' + prod.toFixed(3) + '</b>' +
      (Math.abs(prod) < 0.15 ? '  <span style="color:#ff5c7a">(vanishing!)</span>' : '');
    m.update({prod, s1, s2, s3});
  }
  slider(L.ctrl, 'du/dw  (stage 1)', -3, 3, 0.25, 2, v=>v.toFixed(2), v=>{s1=v; draw();});
  slider(L.ctrl, 'dv/du  (stage 2)', -3, 3, 0.25, 1.5, v=>v.toFixed(2), v=>{s2=v; draw();});
  slider(L.ctrl, 'dL/dv  (stage 3)', -3, 3, 0.25, 1, v=>v.toFixed(2), v=>{s3=v; draw();});
  note(L.ctrl, 'Each slider is one stage\'s local slope. The total gradient is their <b>product</b>, not their sum. Notice how three factors below 1 collapse the gradient toward zero — that is why very deep plain networks stop learning in their early layers.');
  draw();
};

/* ================== c-optim — Lab 2: The second-derivative test ================
   On the double-well quartic f(x)=x⁴/4 − x² (f′=x³−2x, f″=3x²−2), find all three
   critical points and classify each by the SIGN of f″: f″>0 ⇒ min, f″<0 ⇒ max. */
INTERACTIVES.optimClassify = function(stage, api){
  const L = makeLab(stage);
  const f = x => x*x*x*x/4 - x*x;
  const fp = x => x*x*x - 2*x;
  const fpp = x => 3*x*x - 2;
  let x = 2.4, drag = false;

  api.predict({
    prompt: 'For \\(f(x) = x^4/4 - x^2\\), f′(x) = x³ − 2x = x(x²−2). How many <b>critical points</b> (values where f′ = 0) does it have?',
    input: true, placeholder: 'how many', answer: 3, tol: 0.001, unit: '',
    reveal: 'x(x²−2) = 0 gives x = 0 and x = ±√2 — <b>3</b> critical points. The second derivative sorts them: f″ = 3x²−2 is negative at 0 (a maximum) and positive at ±√2 (two minima). This is the second-derivative test.',
  });

  const m = api.missions([
    {text:'Stand on the <b>right minimum</b> (f′ ≈ 0 and f″ &gt; 0), x &gt; 0', xp:20,
      check:s => Math.abs(s.fp) < 0.08 && s.fpp > 0 && s.x > 0.5},
    {text:'Stand on the <b>local maximum</b> at the origin (f′ ≈ 0 and f″ &lt; 0)', xp:20,
      check:s => Math.abs(s.fp) < 0.08 && s.fpp < 0 && Math.abs(s.x) < 0.3},
    {text:'Confirm the symmetry: stand on the <b>left minimum</b> (f′ ≈ 0, f″ &gt; 0), x &lt; 0', xp:25,
      check:s => Math.abs(s.fp) < 0.08 && s.fpp > 0 && s.x < -0.5},
  ]);

  const P = plane(L.ctx, L.W, L.H, 70, L.W/2, L.H/2 - 60);
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    P.fn(f, '#7c5cff', 3, -2.4, 2.4);
    const s = fp(x), c = fpp(x);
    const flat = Math.abs(s) < 0.08;
    const col = flat ? (c > 0 ? '#2dd4a0' : c < 0 ? '#ff5c7a' : '#ffc94d') : (s > 0 ? '#ffc94d' : '#ff9db1');
    const y = f(x);
    L.ctx.strokeStyle = col; L.ctx.lineWidth = 2.5;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(x-1.4), P.sy(y-1.4*s)); L.ctx.lineTo(P.sx(x+1.4), P.sy(y+1.4*s)); L.ctx.stroke();
    P.dot(x, y, 8, col);
    // faint markers at the three critical points
    [-Math.SQRT2, 0, Math.SQRT2].forEach(cx => P.dot(cx, f(cx), 3, 'rgba(255,255,255,.3)'));
    let verdict = flat ? (c > 0 ? '⛳ local MINIMUM (f″ > 0)' : c < 0 ? '⛰ local MAXIMUM (f″ < 0)' : 'inflection') :
      (s > 0 ? '↗ climbing' : '↘ descending');
    L.readout.innerHTML = 'x = ' + x.toFixed(2) + '<br>' +
      "f′(x) = <span style='color:" + col + "'>" + s.toFixed(2) + '</span>   ·   f″(x) = ' + c.toFixed(2) + '<br>' +
      '<b style="color:' + col + '">' + verdict + '</b>';
    m.update({x, fp:s, fpp:c});
  }
  L.canvas.addEventListener('pointerdown', e=>{drag=true; L.canvas.setPointerCapture(e.pointerId); move(e);});
  L.canvas.addEventListener('pointermove', move);
  L.canvas.addEventListener('pointerup', ()=>drag=false);
  function move(e){ if(!drag) return; const c = L.toCanvas(e); x = Math.max(-2.3, Math.min(2.3, P.wx(c.x))); draw(); }
  note(L.ctrl, 'Drag along the double-well curve. At a flat spot (f′ ≈ 0) read the <b>second</b> derivative: f″ &gt; 0 means the curve holds water (a minimum), f″ &lt; 0 means it sheds water (a maximum). Three critical points, two of them minima.');
  draw();
};

/* ================== c-graddesc — Lab 2: Tune the learning rate =================
   On the clean bowl f(x)=x²/2 the update is x ← (1−lr)·x, so it converges iff
   0 < lr < 2, hits x=0 in ONE step at lr=1, oscillates at lr=2, diverges beyond.
   The learner predicts and then reproduces convergence, speed, and divergence. */
INTERACTIVES.graddescChallenge = function(stage, api){
  const L = makeLab(stage);
  const f = x => x*x/2, fp = x => x;
  let x0 = 3, x = 3, lr = 0.5, steps = 0, timer = null, diverged = false, trail = [];

  api.predict({
    prompt: 'On the bowl \\(f(x) = x^2/2\\) the gradient-descent update is \\(x \\leftarrow (1 - lr) \\cdot x\\). With <b>lr = 2.1</b>, does x settle to the minimum or blow up?',
    choices: ['Converges to 0', 'Diverges (blows up)'],
    answer: 1,
    reveal: 'x ← (1−lr)x multiplies x by (1−lr) each step. |1−2.1| = 1.1 &gt; 1, so every step is 10% bigger — it <b>diverges</b>. Convergence needs 0 &lt; lr &lt; 2; lr = 1 lands on the minimum in a single step (the ideal step is 1/f″).',
  });

  const m = api.missions([
    {text:'Find a learning rate that <b>converges</b> to the minimum (|x| &lt; 0.05)', xp:20,
      check:s => s.conv},
    {text:'Converge <b>fast</b>: reach |x| &lt; 0.05 in <b>3 steps or fewer</b> (lr near 1)', xp:25,
      check:s => s.conv && s.steps <= 3},
    {text:'Break it: choose lr so the ball <b>diverges</b> 💥', xp:20,
      check:s => s.diverged},
  ]);

  const P = plane(L.ctx, L.W, L.H, 46, L.W/2, L.H - 70);
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    P.fn(f, '#7c5cff', 3, -4, 4);
    P.dot(0, 0, 4, 'rgba(255,201,77,.6)');
    trail.forEach((t, i) => { L.ctx.globalAlpha = (i+1)/trail.length*0.6;
      if(Math.abs(t) < 4.5) P.dot(t, f(t), 4, '#00d4ff'); L.ctx.globalAlpha = 1; });
    const conv = !diverged && Math.abs(x) < 0.05;
    if(Math.abs(x) < 4.5){
      const s = fp(x);
      P.dot(x, f(x), 9, diverged ? '#ff5c7a' : conv ? '#2dd4a0' : '#00d4ff');
      L.ctx.strokeStyle = 'rgba(255,201,77,.8)'; L.ctx.lineWidth = 2;
      L.ctx.beginPath(); L.ctx.moveTo(P.sx(x-1), P.sy(f(x)-s)); L.ctx.lineTo(P.sx(x+1), P.sy(f(x)+s)); L.ctx.stroke();
    }
    L.readout.innerHTML = 'x = ' + (Math.abs(x) < 1e4 ? x.toFixed(3) : x.toExponential(1)) +
      '   lr = ' + lr.toFixed(2) + '<br>steps: ' + steps +
      (conv ? '  <b style="color:#2dd4a0">✓ CONVERGED</b>' : '') +
      (diverged ? '  <b style="color:#ff5c7a">💥 DIVERGED</b>' : '');
    m.update({conv, steps, diverged, x, lr});
  }
  function reset(){ x = x0; steps = 0; diverged = false; trail = [x]; draw(); }
  function step(){
    if(diverged) return;
    x = (1 - lr) * x; steps++;
    trail.push(x); if(trail.length > 40) trail.shift();
    if(Math.abs(x) > 1e3){ diverged = true; stopAuto(); }
    draw();
  }
  function stopAuto(){ if(timer){ clearInterval(timer); timer = null; if(runBtn) runBtn.textContent = '▶ Auto-run'; } }
  slider(L.ctrl, 'learning rate lr', 0.05, 3, 0.05, 0.5, v=>v.toFixed(2), v=>{lr=v;});
  let runBtn;
  btnRow(L.ctrl, [
    {label:'Step ×1', on:step},
    {label:'▶ Auto-run', on:function(){ if(timer){ stopAuto(); } else { timer = setInterval(step, 130); this.textContent = '⏸ Pause'; runBtn = this; } }},
    {label:'Reset', on:reset},
  ]);
  note(L.ctrl, 'Start is fixed at x = 3. Pick a learning rate, then Step or Auto-run. Watch \\(x \\leftarrow (1-lr) \\cdot x\\): below 1 it crawls in, exactly 1 snaps to the bottom, between 1 and 2 it overshoots but still shrinks, at 2 it bounces forever, and beyond 2 it explodes.');
  reset();
  return () => stopAuto();
};

/* ================== c-integrals — Lab 2: Accumulate to a target ================
   Drag the upper limit b to make the (signed) area under f from 0 to b hit an
   exact value. On a line through the origin the area is a triangle b²/2; on a
   line crossing the axis the area below counts negative, so a net zero exists. */
INTERACTIVES.integralsChallenge = function(stage, api){
  const L = makeLab(stage);
  const FN = [
    {name:'f(x) = x',     f:x=>x,     area:b=> b*b/2 },              // triangle
    {name:'f(x) = x − 2', f:x=>x-2,   area:b=> b*b/2 - 2*b },        // signed; zero net at b=4
  ];
  let fi = 0, b = 1;

  api.predict({
    prompt: 'The area under \\(f(x) = x\\) from 0 to 2 is a triangle. Predict <b>∫₀² x dx</b>.',
    input: true, placeholder: 'the area', answer: 2, tol: 0.05, unit: '',
    reveal: '∫₀² x dx = ½·base·height = ½·2·2 = <b>2</b> (antiderivative x²/2 at 2 minus at 0). Now drag the right edge b to accumulate an exact area — and meet <b>signed</b> area, where the part below the axis subtracts.',
  });

  const m = api.missions([
    {text:'On <b>f(x) = x</b>: drag b so the area equals exactly <b>2</b> (± 0.06) → find b', xp:20,
      check:s => s.fi === 0 && Math.abs(s.area - 2) < 0.06},
    {text:'Still on f(x) = x: make the area equal <b>4.5</b> (± 0.08)', xp:20,
      check:s => s.fi === 0 && Math.abs(s.area - 4.5) < 0.08},
    {text:'Switch to <b>f(x) = x − 2</b>: find b where the <b>net signed area = 0</b> (below cancels above)', xp:25,
      check:s => s.fi === 1 && Math.abs(s.area) < 0.12 && s.b > 2.5},
  ]);

  const P = plane(L.ctx, L.W, L.H, 46, 90, L.H/2 + 20);
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    const spec = FN[fi];
    // Riemann rectangles from 0 to b (illustrative; area computed exactly below)
    const N = 24, dx = b / N;
    for(let i = 0; i < N; i++){
      const xm = (i + 0.5) * dx, h = spec.f(xm);
      const x0 = i * dx;
      const pos = h >= 0;
      L.ctx.fillStyle = pos ? 'rgba(45,212,160,.28)' : 'rgba(255,92,122,.28)';
      L.ctx.strokeStyle = pos ? 'rgba(45,212,160,.6)' : 'rgba(255,92,122,.6)';
      L.ctx.lineWidth = 1;
      const yTop = P.sy(Math.max(0, h)), yBot = P.sy(Math.min(0, h));
      L.ctx.fillRect(P.sx(x0), yTop, Math.max(1, P.sx(x0+dx) - P.sx(x0)), yBot - yTop);
      L.ctx.strokeRect(P.sx(x0), yTop, Math.max(1, P.sx(x0+dx) - P.sx(x0)), yBot - yTop);
    }
    P.fn(spec.f, '#7c5cff', 3, -1, 5);
    // b handle
    L.ctx.strokeStyle = '#ffc94d'; L.ctx.lineWidth = 2; L.ctx.setLineDash([5,4]);
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(b), 0); L.ctx.lineTo(P.sx(b), L.H); L.ctx.stroke(); L.ctx.setLineDash([]);
    P.dot(b, 0, 7, '#ffc94d');
    const area = spec.area(b);
    L.readout.innerHTML = spec.name + '<br>upper limit b = ' + b.toFixed(2) + '<br>' +
      '∫₀<sup>b</sup> f dx = <span style="color:' + (area < 0 ? '#ff5c7a' : '#2dd4a0') + '">' + area.toFixed(2) + '</span>' +
      (fi === 1 ? '  (signed: red area subtracts)' : '');
    m.update({fi, area, b});
  }
  slider(L.ctrl, 'upper limit b', 0, 5, 0.05, 1, v=>v.toFixed(2), v=>{b=v; draw();});
  const row = chips(L.ctrl, 'FUNCTION', FN.map(s=>s.name), (i, btn, r)=>{
    fi = i; [...r.children].forEach(el=>el.classList.remove('on')); btn.classList.add('on'); draw();
  });
  row.children[0].classList.add('on');
  note(L.ctrl, 'The shaded rectangles are the Riemann sum; the readout is the exact integral. Drag <b>b</b> to accumulate area to a target. On f(x) = x − 2 the rectangles below the axis turn <b style="color:#ff5c7a">red</b> and count negative — that is what "signed area" means, and why a net-zero point exists.');
  draw();
};
