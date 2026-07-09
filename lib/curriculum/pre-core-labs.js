/* ================================================================
   WORLD 0 FOUNDATIONS — PROBLEM-SOLVING LABS (a "challenge" lab for
   each Foundations lesson).
   ----------------------------------------------------------------
   The Foundations lessons already ship 2–3 exploration labs each; what
   they lacked was a predict-then-verify gate and a pure "compute the
   answer" task. Each challenge lab here commits a prediction before the
   controls unlock, then sets construct-to-spec / solve-for-the-input
   missions with exact targets:

     functions -> solve f(x) = target (find BOTH roots; some have none)
     slope     -> two-point slope & intercept to spec
     powers    -> apply the exponent laws to hit a target
     logs      -> solve exponential equations (log as the inverse)
     sigma     -> build a sum with chosen bounds to hit a target

   Registered as INTERACTIVES here; extra.js references them from each
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
const snap = (v, g) => Math.round(v / g) * g;

/* ================== pre-functions — Lab: Solve f(x) = target ===================
   Forward evaluation is the explore lab; this is the inverse question — given an
   OUTPUT, find the input(s). f(x)=x²/2−2 has two roots, and f(x)=6 has two more;
   the learner discovers that f(x)=−5 has NONE (the curve bottoms out at −2). */
INTERACTIVES.prefnSolve = function(stage, api){
  const L = makeLab(stage);
  const f = x => x*x/2 - 2;
  let x = 1;

  api.predict({
    prompt: 'For \\(f(x) = x^2/2 - 2\\), predict <b>f(3)</b> before you touch anything.',
    input: true, placeholder: 'f(3)', answer: 2.5, tol: 0.05, unit: '',
    reveal: 'f(3) = 9/2 − 2 = <b>2.5</b>. Evaluating forward is easy; the harder skill is running it backward — given an output, which inputs produce it? Below, drag x to land f(x) on a target. Some targets have two solutions; one has none.',
  });

  const m = api.missions([
    {text:'Solve <b>f(x) = 0</b> — find the <b>positive</b> root (x &gt; 0)', xp:20,
      check:s => Math.abs(s.y) < 0.08 && s.x > 0.5},
    {text:'Solve f(x) = 0 again — now the <b>negative</b> root (x &lt; 0)', xp:20,
      check:s => Math.abs(s.y) < 0.08 && s.x < -0.5},
    {text:'Solve <b>f(x) = 6</b> (either of its two solutions)', xp:25,
      check:s => Math.abs(s.y - 6) < 0.15},
  ]);

  const P = plane(L.ctx, L.W, L.H, 44, L.W/2, L.H/2 + 60);
  let drag = false;
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    // target guide lines at y=0 (axis) and y=6
    L.ctx.strokeStyle = 'rgba(255,201,77,.35)'; L.ctx.lineWidth = 1.5; L.ctx.setLineDash([6,5]);
    L.ctx.beginPath(); L.ctx.moveTo(0, P.sy(6)); L.ctx.lineTo(L.W, P.sy(6)); L.ctx.stroke(); L.ctx.setLineDash([]);
    L.ctx.fillStyle = 'rgba(255,201,77,.6)'; L.ctx.font = '12px ' + FONT();
    L.ctx.fillText('target f = 6', 8, P.sy(6) - 6);
    L.ctx.fillText('target f = 0', 8, P.sy(0) - 6);
    P.fn(f, '#7c5cff', 3);
    const y = f(x);
    L.ctx.setLineDash([4,4]); L.ctx.strokeStyle = 'rgba(0,212,255,.5)'; L.ctx.lineWidth = 1.5;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(x), P.sy(0)); L.ctx.lineTo(P.sx(x), P.sy(y)); L.ctx.stroke();
    L.ctx.setLineDash([]);
    const near = Math.abs(y) < 0.08 || Math.abs(y - 6) < 0.15;
    P.dot(x, y, 7, near ? '#2dd4a0' : '#00d4ff');
    L.readout.innerHTML = 'x = ' + x.toFixed(2) + '  →  f(x) = <span style="color:' + (near?'#2dd4a0':'#cdd4f0') + '">' + y.toFixed(2) + '</span>' +
      (Math.abs(y) < 0.08 ? '  ✓ a root!' : Math.abs(y-6) < 0.15 ? '  ✓ hits 6!' : '');
    m.update({x, y});
  }
  L.canvas.addEventListener('pointerdown', e=>{drag=true; L.canvas.setPointerCapture(e.pointerId); mv(e);});
  L.canvas.addEventListener('pointermove', mv);
  L.canvas.addEventListener('pointerup', ()=>drag=false);
  function mv(e){ if(!drag) return; const c = L.toCanvas(e); x = snap(Math.max(-5, Math.min(5, P.wx(c.x))), 0.1); draw(); }
  note(L.ctrl, 'Drag x until the point lands on a dashed target line. <b>f(x) = 0</b> has two solutions (the roots ±2); <b>f(x) = 6</b> has two more. Try dragging toward f = −5 and notice you can never get there — the parabola bottoms out at −2.');
  draw();
};

/* ================== pre-slope — Lab: Two-point slope & intercept ===============
   The explore labs fit a line to a cloud; this pins a line through two draggable
   points and asks for an exact slope, a horizontal line, and a chosen intercept —
   working y = mx + b, with m = Δy/Δx, in reverse. */
INTERACTIVES.preslopeTwoPoint = function(stage, api){
  const L = makeLab(stage);
  const p1 = {x:-2, y:0}, p2 = {x:2, y:2};

  api.predict({
    prompt: 'A line passes through \\((0, 1)\\) and \\((2, 5)\\). Predict its <b>slope \\(m = \\Delta y / \\Delta x\\)</b>.',
    input: true, placeholder: 'slope m', answer: 2, tol: 0.05, unit: '',
    reveal: 'm = (5 − 1) / (2 − 0) = 4/2 = <b>2</b>. Slope is rise over run — the change in y divided by the change in x. Below, drag two points to build lines that meet each spec exactly.',
  });

  const m = api.missions([
    {text:'Make the slope exactly <b>2</b> (± 0.05)', xp:20,
      check:s => Math.abs(s.m - 2) < 0.05},
    {text:'Make a <b>horizontal</b> line — slope 0', xp:20,
      check:s => Math.abs(s.m) < 0.05 && s.dx > 0.5},
    {text:'Make the <b>y-intercept</b> b = 3 (where the line crosses x = 0)', xp:25,
      check:s => Math.abs(s.b - 3) < 0.1 && s.dx > 0.5},
  ]);

  const P = plane(L.ctx, L.W, L.H, 46);
  let dragging = null;
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    const dx = p2.x - p1.x;
    const mm = Math.abs(dx) > 1e-6 ? (p2.y - p1.y) / dx : Infinity;
    const b = isFinite(mm) ? p1.y - mm * p1.x : NaN;
    if(isFinite(mm)){
      L.ctx.strokeStyle = '#2dd4a0'; L.ctx.lineWidth = 2.5;
      L.ctx.beginPath(); L.ctx.moveTo(P.sx(-7), P.sy(mm*(-7) + b)); L.ctx.lineTo(P.sx(7), P.sy(mm*7 + b)); L.ctx.stroke();
      // y-intercept marker
      P.dot(0, b, 5, '#ffc94d');
    }
    P.dot(p1.x, p1.y, 7, '#b9a8ff'); P.dot(p2.x, p2.y, 7, '#7fe7ff');
    L.readout.innerHTML = 'P₁ = (' + fmt2(p1.x) + ', ' + fmt2(p1.y) + ')   P₂ = (' + fmt2(p2.x) + ', ' + fmt2(p2.y) + ')<br>' +
      'slope m = Δy/Δx = ' + (isFinite(mm) ? mm.toFixed(2) : '∞ (vertical)') + '<br>' +
      'y-intercept b = ' + (isFinite(b) ? b.toFixed(2) : '—');
    m.update({m:mm, b, dx:Math.abs(dx)});
  }
  function pick(e){ const c = L.toCanvas(e), wx = P.wx(c.x), wy = P.wy(c.y);
    return (Math.hypot(wx-p1.x, wy-p1.y) < Math.hypot(wx-p2.x, wy-p2.y)) ? p1 : p2; }
  L.canvas.addEventListener('pointerdown', e=>{dragging=pick(e); L.canvas.setPointerCapture(e.pointerId); mv(e);});
  L.canvas.addEventListener('pointermove', mv);
  L.canvas.addEventListener('pointerup', ()=>dragging=null);
  function mv(e){ if(!dragging) return; const c = L.toCanvas(e);
    dragging.x = snap(P.wx(c.x), 0.5); dragging.y = snap(P.wy(c.y), 0.5); draw(); }
  note(L.ctrl, 'Drag the two points to control the <b style="color:#2dd4a0">green</b> line. Slope is rise ÷ run between them; the <b style="color:#ffc94d">gold</b> dot marks where the line crosses x = 0 (the intercept b). Read y = mx + b backward to hit each spec.');
  draw();
};

/* ================== pre-powers — Lab: Apply the exponent laws ==================
   Set exponents m, n and use the laws 2^m·2^n = 2^(m+n) and (2^m)^n = 2^(mn) to
   hit target values — including the a^0 = 1 case that the halving pattern forces. */
INTERACTIVES.prepowersLaws = function(stage, api){
  let m = 2, n = 1;
  const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;flex-direction:column;gap:16px'; stage.appendChild(wrap);
  const head = document.createElement('div');
  head.style.cssText = 'background:var(--bg2);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:20px;text-align:center';
  wrap.appendChild(head);
  const ctrls = document.createElement('div'); ctrls.className = 'controls'; wrap.appendChild(ctrls);

  api.predict({
    prompt: 'Using the product law \\(2^m \\cdot 2^n = 2^{m+n}\\), simplify \\(2^3 \\cdot 2^4\\). Predict the resulting <b>exponent</b>.',
    input: true, placeholder: 'the exponent', answer: 7, tol: 0.001, unit: '',
    reveal: 'Multiplying powers of the same base <b>adds</b> the exponents: 2³·2⁴ = 2³⁺⁴ = 2⁷ (= 128). Below, bend m and n to hit each target, and confirm 2⁰ = 1 by driving both exponents to zero.',
  });

  const M = api.missions([
    {text:'Product law: make <b>2^m · 2^n = 128</b> (so m + n = 7)', xp:20,
      check:s => s.m + s.n === 7},
    {text:'Power law: make <b>(2^m)^n = 4096</b> = 2¹² (so m · n = 12)', xp:25,
      check:s => s.m * s.n === 12},
    {text:'The a⁰ = 1 case: make the product equal <b>1</b> (2^m · 2^n = 2⁰)', xp:20,
      check:s => s.m === 0 && s.n === 0},
  ]);

  function render(){
    const sum = m + n, prod = m * n;
    const P2 = e => Math.pow(2, e);
    head.innerHTML =
      '<div style="font-family:var(--mono);font-size:20px;color:#b9a8ff;font-weight:800;line-height:1.9">' +
        '2<sup>' + m + '</sup> · 2<sup>' + n + '</sup> = 2<sup>' + m + '+' + n + '</sup> = <b style="color:#2dd4a0">2<sup>' + sum + '</sup> = ' + P2(sum) + '</b>' +
      '</div>' +
      '<div style="font-family:var(--mono);font-size:20px;color:#b9a8ff;font-weight:800;line-height:1.9">' +
        '(2<sup>' + m + '</sup>)<sup>' + n + '</sup> = 2<sup>' + m + '·' + n + '</sup> = <b style="color:#7fe7ff">2<sup>' + prod + '</sup> = ' + P2(prod) + '</b>' +
      '</div>';
    M.update({m, n});
  }
  slider(ctrls, 'exponent m', 0, 8, 1, 2, v=>Math.round(v).toString(), v=>{m=Math.round(v); render();});
  slider(ctrls, 'exponent n', 0, 8, 1, 1, v=>Math.round(v).toString(), v=>{n=Math.round(v); render();});
  note(ctrls, 'Two laws, one idea: <b>multiplying</b> powers of a base <b>adds</b> exponents (top line); <b>raising a power to a power multiplies</b> them (bottom). Drive both exponents to 0 to see why anything⁰ = 1.');
  render();
};

/* ================== pre-logs — Lab: Solve exponential equations ================
   log is the inverse of "raise to a power": solving base^x = target IS computing
   log_base(target). Includes non-integer answers (2^x = 100) so the log stops
   looking like "just counting zeros". */
INTERACTIVES.prelogsSolve = function(stage, api){
  const L = makeLab(stage);
  let base = 2, x = 1;

  api.predict({
    prompt: '\\(\\log_2(32)\\) asks: 2 to what power is 32? Predict <b>\\(\\log_2(32)\\)</b>.',
    input: true, placeholder: 'log₂(32)', answer: 5, tol: 0.05, unit: '',
    reveal: '2⁵ = 32, so log₂(32) = <b>5</b>. A logarithm just solves an exponential equation for its exponent. Below, drag x to solve base^x = target — and notice some answers are not whole numbers at all.',
  });

  const m = api.missions([
    {text:'Solve <b>2^x = 8</b> — drag x until the value hits 8 (answer is a whole number)', xp:20,
      check:s => s.base === 2 && Math.abs(s.val - 8) < 0.1},
    {text:'Solve <b>2^x = 100</b> — the answer is NOT a whole number (≈ 6.64)', xp:25,
      check:s => s.base === 2 && Math.abs(s.val - 100) < 1},
    {text:'Switch to base 10 and solve <b>10^x = 50</b> (x ≈ 1.70)', xp:25,
      check:s => s.base === 10 && Math.abs(s.val - 50) < 0.5},
  ]);

  const P = plane(L.ctx, L.W, L.H, 40, 70, L.H - 60);
  const TARGETS = {2:[8,100], 10:[50]};
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    const g = t => Math.pow(base, t);
    P.fn(g, '#7c5cff', 3, -0.5, base === 2 ? 7.5 : 2.2);
    // target lines
    L.ctx.strokeStyle = 'rgba(255,201,77,.35)'; L.ctx.lineWidth = 1.5; L.ctx.setLineDash([6,5]);
    TARGETS[base].forEach(tv => { if(P.sy(tv) > 0){ L.ctx.beginPath(); L.ctx.moveTo(0, P.sy(tv)); L.ctx.lineTo(L.W, P.sy(tv)); L.ctx.stroke(); } });
    L.ctx.setLineDash([]);
    const val = g(x);
    L.ctx.setLineDash([4,4]); L.ctx.strokeStyle = 'rgba(0,212,255,.5)'; L.ctx.lineWidth = 1.5;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(x), P.sy(0)); L.ctx.lineTo(P.sx(x), P.sy(Math.min(val, 200))); L.ctx.stroke();
    L.ctx.setLineDash([]);
    P.dot(x, Math.min(val, 200), 7, '#00d4ff');
    L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = 'bold 15px ' + FONT(); L.ctx.textAlign = 'left';
    L.ctx.fillText(base + '^' + x.toFixed(2) + ' = ' + val.toFixed(2), 20, 32);
    L.readout.innerHTML = 'base = ' + base + '   x = ' + x.toFixed(2) + '<br>' +
      base + '^x = <b>' + val.toFixed(2) + '</b><br>' +
      '(so x = log' + (base===2?'₂':'₁₀') + '(' + val.toFixed(1) + '))';
    m.update({base, x, val});
  }
  slider(L.ctrl, 'exponent x', 0, base === 2 ? 7 : 2.2, 0.01, 1, v=>v.toFixed(2), v=>{x=v; draw();});
  const row = chips(L.ctrl, 'BASE', ['2', '10'], (i, btn, r)=>{
    base = i === 0 ? 2 : 10; x = 1;
    [...r.children].forEach(el=>el.classList.remove('on')); btn.classList.add('on'); draw();
  });
  row.children[0].classList.add('on');
  note(L.ctrl, 'Drag x until base^x lands on a dashed target line — that value of x <em>is</em> the logarithm. 2^x = 8 gives a clean x = 3, but 2^x = 100 lands between 6 and 7: logs are happy to be fractional.');
  draw();
};

/* ================== pre-sigma — Lab: Build a sum to a target ===================
   The explore lab slides n on fixed expressions; here the learner also moves the
   lower bound and picks the term rule to hit exact totals — genuine index
   manipulation, the skill papers actually demand. */
INTERACTIVES.presigmaSolve = function(stage, api){
  const EXPR = [
    {key:'i',  label:'i',  tex:'i',  term:i=>i},
    {key:'2i', label:'2i', tex:'2i', term:i=>2*i},
    {key:'i2', label:'i²', tex:'i²', term:i=>i*i},
  ];
  let ei = 0, s = 1, n = 3;
  const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;flex-direction:column;gap:16px'; stage.appendChild(wrap);
  const head = document.createElement('div');
  head.style.cssText = 'background:var(--bg2);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:20px;text-align:center';
  wrap.appendChild(head);
  const ctrls = document.createElement('div'); ctrls.className = 'controls'; wrap.appendChild(ctrls);

  api.predict({
    prompt: 'Evaluate <code>Σ<sub>i=1</sub><sup>5</sup> i</code> — add the whole numbers 1 through 5. Predict the total.',
    input: true, placeholder: 'the sum', answer: 15, tol: 0.001, unit: '',
    reveal: '1 + 2 + 3 + 4 + 5 = <b>15</b>. The index runs from the bottom limit to the top, adding the term each time. Below, choose the term rule AND both limits to hit each target.',
  });

  const M = api.missions([
    {text:'With term <b>i</b>: set the limits so <b>Σ i = 21</b> (start at 1)', xp:20,
      check:st => st.key === 'i' && st.s === 1 && st.sum === 21},
    {text:'With term <b>2i</b>: make <b>Σ<sub>i=1</sub><sup>4</sup> 2i = 20</b>', xp:20,
      check:st => st.key === '2i' && st.s === 1 && st.n === 4 && st.sum === 20},
    {text:'With term <b>i²</b>: use the lower limit too — make <b>Σ i² = 25</b> (that\'s 3² + 4²)', xp:25,
      check:st => st.key === 'i2' && st.sum === 25 && st.s === 3 && st.n === 4},
  ]);

  function render(){
    const ex = EXPR[ei];
    let sum = 0; const terms = [];
    for(let i = s; i <= n; i++){ const t = ex.term(i); sum += t; terms.push(t); }
    head.innerHTML =
      '<div style="font-size:26px;font-family:var(--mono);color:#b9a8ff;font-weight:800;line-height:1;display:inline-flex;align-items:center;gap:5px">' +
        '<span style="font-size:38px">Σ</span>' +
        '<span style="display:inline-flex;flex-direction:column;font-size:12px;line-height:1.25"><span>n=' + n + '</span><span>i=' + s + '</span></span>' +
        '<span style="margin-left:4px">' + ex.tex + '</span></div>' +
      '<div style="margin-top:16px;font-family:var(--mono);font-size:15px;color:#cdd4f0">' +
        (terms.length ? terms.join(' + ') : '(empty)') + ' = <b style="color:#2dd4a0;font-size:22px">' + sum + '</b></div>';
    M.update({key:ex.key, s, n, sum});
  }
  chips(ctrls, 'TERM RULE', EXPR.map(e=>e.label), (i, btn, r)=>{
    ei = i; [...r.children].forEach(el=>el.classList.remove('on')); btn.classList.add('on'); render();
  }).children[0].classList.add('on');
  slider(ctrls, 'lower limit  (start i)', 1, 5, 1, 1, v=>Math.round(v).toString(), v=>{s=Math.round(v); if(s>n) n=s; render();});
  slider(ctrls, 'upper limit  (n)', 1, 8, 1, 3, v=>Math.round(v).toString(), v=>{n=Math.round(v); if(n<s) s=n; render();});
  note(ctrls, 'A Σ is a for-loop: the index runs from the lower limit to the upper limit, adding the term rule each pass. Change the rule and BOTH limits to hit each target — the lower limit matters just as much as the upper one.');
  render();
};
