/* ================================================================
   WORLD 3 CORE — PROBABILITY: problem-solving "challenge" labs.
   ----------------------------------------------------------------
   One predict-then-verify challenge lab per thin lesson (prob-bayes
   is already multi-lab, so it is untouched):

     prob-rv      -> design a distribution to hit a target E[X]
     prob-dist    -> hit a binomial's mean/variance to spec
     prob-mle     -> coin-flip MLE: slide p to the log-likelihood peak
     prob-clt     -> the standard-error law SE = σ/√n, to a target
     prob-entropy -> compute entropy to exact bit targets

   Registered as INTERACTIVES here; prob.js references them from each
   lesson's labs:[] array. Loaded before validateCurriculum() runs.
   ================================================================ */
import { INTERACTIVES } from './registry.js';
import { makeLab, slider, chips, clearBg } from '../engine.js';

const FONT = () => getComputedStyle(document.body).fontFamily;
function note(parent, html){
  const d = document.createElement('div'); d.className = 'ctrl';
  d.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">' + html + '</div>';
  parent.appendChild(d); return d;
}
// simple labelled bar chart into ctx (values already normalised to [0, vmax])
function barPlot(ctx, W, H, data, vmax, y0off){
  const pad = {l:44, r:16, t:20, b:34}, top = (y0off||0) + pad.t;
  const base = (y0off||0) + H - pad.b, bw = (W - pad.l - pad.r) / data.length;
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad.l, base); ctx.lineTo(W - pad.r, base); ctx.stroke();
  ctx.font = '600 11px ' + FONT();
  data.forEach((d, i) => {
    const h = Math.max(0, (base - top) * (d.v / vmax));
    const x = pad.l + i * bw;
    ctx.fillStyle = d.color || 'rgba(0,212,255,.55)';
    ctx.fillRect(x + bw*.14, base - h, bw*.72, h);
    ctx.fillStyle = '#8b93b8'; ctx.textAlign = 'center';
    ctx.fillText(d.label, x + bw/2, base + 16);
  });
  ctx.textAlign = 'left';
}

/* ================== prob-rv — Lab: Design a distribution to a mean ============
   Expectation is a weighted average: E[X] = Σ xᵢ·pᵢ. Set the six face weights so
   the die has an EXACT target expectation — construct-to-spec, not just observe. */
INTERACTIVES.probrvDesign = function(stage, api){
  const L = makeLab(stage);
  let w = [2,1,1,1,1,1];

  api.predict({
    prompt: 'A die has P(6) = 0.5, and the other five faces split the rest equally (0.1 each). Predict its expectation <b>E[X] = Σ xᵢ·pᵢ</b>.',
    input: true, placeholder: 'E[X]', answer: 4.5, tol: 0.05, unit: '',
    reveal: 'E[X] = 0.1·(1+2+3+4+5) + 0.5·6 = 1.5 + 3.0 = <b>4.5</b>. Expectation weights each value by its probability. Below, shape the weights so the die hits an exact target expectation.',
  });

  const m = api.missions([
    {text:'Design a die with <b>E[X] = 4.0</b> (± 0.05) — weight the high faces', xp:20,
      check:s => Math.abs(s.E - 4.0) < 0.05},
    {text:'Now pull it down to <b>E[X] = 2.0</b> (± 0.05)', xp:20,
      check:s => Math.abs(s.E - 2.0) < 0.05},
    {text:'Rebuild the <b>fair</b> die: E[X] = 3.5 with all six probabilities equal', xp:25,
      check:s => Math.abs(s.E - 3.5) < 0.05 && s.spread < 0.02},
  ]);

  function draw(){
    clearBg(L.ctx, L.W, L.H);
    const sum = w.reduce((a,b)=>a+b, 0) || 1;
    const p = w.map(x => x/sum);
    const E = p.reduce((a,pi,i)=>a + (i+1)*pi, 0);
    const spread = Math.max(...p) - Math.min(...p);
    barPlot(L.ctx, L.W, 300, p.map((pi,i)=>({label:''+(i+1), v:pi,
      color:'rgba(0,212,255,.55)'})), Math.max(0.5, Math.max(...p)));
    // E marker as text
    L.ctx.fillStyle = Math.abs(E-4)<0.05||Math.abs(E-2)<0.05||Math.abs(E-3.5)<0.05 ? '#2dd4a0' : '#ffc94d';
    L.ctx.font = 'bold 17px ' + FONT();
    L.ctx.fillText('E[X] = Σ xᵢ·pᵢ = ' + E.toFixed(3), 44, 26);
    L.readout.innerHTML = 'p = [' + p.map(x=>x.toFixed(2)).join(', ') + ']<br>' +
      '<b>E[X] = ' + E.toFixed(3) + '</b>';
    m.update({E, spread});
  }
  ['1','2','3','4','5','6'].forEach((nm,i)=>
    slider(L.ctrl, 'weight on face ' + nm, 0, 10, 0.5, w[i], v=>v.toFixed(1), v=>{w[i]=v; draw();}));
  note(L.ctrl, 'The weights become probabilities once normalised (they always sum to 1). Expectation is the balance point Σ xᵢ·pᵢ — shift weight toward high faces to raise it, toward low faces to lower it. The fair die needs all six equal.');
  draw();
};

/* ================== prob-dist — Lab: Hit a binomial's mean/variance ===========
   Binomial(n, p): E = np, Var = np(1−p). Set n and p to hit exact statistics —
   and see why p = 0.5 is the most-uncertain (widest) trial. */
INTERACTIVES.probdistMatch = function(stage, api){
  const L = makeLab(stage);
  let n = 8, p = 0.4;

  api.predict({
    prompt: 'For <code>Binomial(n = 20, p = 0.5)</code>, the mean is <b>E[X] = n·p</b>. Predict it.',
    input: true, placeholder: 'mean np', answer: 10, tol: 0.05, unit: '',
    reveal: 'E[X] = np = 20·0.5 = <b>10</b>, and the variance is np(1−p) = 5. Below, dial n and p to hit exact targets — and notice the spread is widest at p = 0.5.',
  });

  const m = api.missions([
    {text:'Make the mean <b>E = np = 6</b> (± 0.1)', xp:20,
      check:s => Math.abs(s.n * s.p - 6) < 0.1},
    {text:'Make the mean <b>E = 15</b> using at most 20 trials (so p must be large)', xp:20,
      check:s => Math.abs(s.n * s.p - 15) < 0.1 && s.n <= 20},
    {text:'Most uncertain, mean 5: make it <b>symmetric</b> (p = 0.5) with E = 5', xp:25,
      check:s => Math.abs(s.p - 0.5) < 0.02 && Math.abs(s.n * s.p - 5) < 0.1},
  ]);

  const choose = (N,k)=>{ let r=1; for(let i=1;i<=k;i++) r = r*(N-k+i)/i; return r; };
  function draw(){
    clearBg(L.ctx, L.W, L.H);
    const data = [...Array(n+1)].map((_,k)=>({label: (k%Math.ceil((n+1)/16)===0)?''+k:'',
      v: choose(n,k)*Math.pow(p,k)*Math.pow(1-p,n-k), color:'rgba(0,212,255,.55)'}));
    barPlot(L.ctx, L.W, 300, data, Math.max(...data.map(d=>d.v), 1e-6));
    const E = n*p, V = n*p*(1-p);
    L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = 'bold 15px ' + FONT();
    L.ctx.fillText('E = np = ' + E.toFixed(2) + '    σ = √(np(1−p)) = ' + Math.sqrt(V).toFixed(2), 44, 24);
    L.readout.innerHTML = 'Binomial(n = ' + n + ', p = ' + p.toFixed(2) + ')<br>' +
      '<b>mean np = ' + E.toFixed(2) + '</b>   ·   variance np(1−p) = ' + V.toFixed(2);
    m.update({n, p});
  }
  slider(L.ctrl, 'n — number of trials', 1, 40, 1, n, v=>''+v, v=>{n=v; draw();});
  slider(L.ctrl, 'p — success probability', 0.01, 0.99, 0.01, p, v=>v.toFixed(2), v=>{p=v; draw();});
  note(L.ctrl, 'The mean np is the balance point; the variance np(1−p) is the spread. Many (n, p) pairs share a mean — but the shape and spread differ. For a fixed n the trial is widest, most uncertain, exactly at p = 0.5.');
  draw();
};

/* ================== prob-mle — Lab: Coin-flip maximum likelihood ==============
   The canonical MLE. For h heads in n flips the log-likelihood is h·ln p + t·ln(1−p),
   peaking at p̂ = h/n. Slide p to the peak; watch overconfident p craters the curve. */
INTERACTIVES.probmleFit = function(stage, api){
  const L = makeLab(stage);
  const DATA = [ {name:'7 heads, 3 tails', h:7, t:3, phat:0.7},
                 {name:'3 heads, 7 tails', h:3, t:7, phat:0.3},
                 {name:'5 heads, 5 tails', h:5, t:5, phat:0.5} ];
  let di = 0, p = 0.5;

  api.predict({
    prompt: 'You flip a coin 10 times and see <b>7 heads</b>. The maximum-likelihood estimate is p̂ = heads / total. Predict <b>p̂</b>.',
    input: true, placeholder: 'p-hat', answer: 0.7, tol: 0.02, unit: '',
    reveal: 'p̂ = 7/10 = <b>0.7</b> — the value of p that makes the data you actually saw most probable. Below, slide p and watch the log-likelihood h·ln p + t·ln(1−p) peak exactly there.',
  });

  const m = api.missions([
    {text:'Slide p to <b>maximize the log-likelihood</b> for 7H/3T (find p̂ = 0.7)', xp:20,
      check:s => s.di === 0 && Math.abs(s.p - 0.7) < 0.02},
    {text:'Switch to <b>3H/7T</b> and find its new peak (p̂ = 0.3)', xp:20,
      check:s => s.di === 1 && Math.abs(s.p - 0.3) < 0.02},
    {text:'Overconfidence: push p to <b>≥ 0.97</b> and watch the log-likelihood crater', xp:20,
      check:s => s.p >= 0.97},
  ]);

  function draw(){
    clearBg(L.ctx, L.W, L.H);
    const d = DATA[di], h = d.h, t = d.t;
    const LL = pp => h*Math.log(pp) + t*Math.log(1-pp);
    // plot LL(p) over p in (0,1); map to canvas
    const x0 = 50, x1 = L.W - 20, yb = L.H - 50, yt = 40;
    const pmin = 0.02, pmax = 0.98;
    const llMax = LL(d.phat), llMin = LL(0.02);
    const sx = pp => x0 + (pp - pmin)/(pmax - pmin) * (x1 - x0);
    const sy = ll => yb - (ll - llMin)/(llMax - llMin) * (yb - yt);
    // axis
    L.ctx.strokeStyle = 'rgba(255,255,255,.2)'; L.ctx.lineWidth = 1;
    L.ctx.beginPath(); L.ctx.moveTo(x0, yb); L.ctx.lineTo(x1, yb); L.ctx.stroke();
    // LL curve
    L.ctx.strokeStyle = '#7c5cff'; L.ctx.lineWidth = 3; L.ctx.beginPath();
    let started = false;
    for(let pp = pmin; pp <= pmax; pp += 0.005){ const X = sx(pp), Y = sy(LL(pp));
      if(!started){ L.ctx.moveTo(X, Y); started = true; } else L.ctx.lineTo(X, Y); }
    L.ctx.stroke();
    // peak marker (p̂) dashed
    L.ctx.setLineDash([5,5]); L.ctx.strokeStyle = 'rgba(45,212,160,.6)'; L.ctx.lineWidth = 1.5;
    L.ctx.beginPath(); L.ctx.moveTo(sx(d.phat), yt); L.ctx.lineTo(sx(d.phat), yb); L.ctx.stroke(); L.ctx.setLineDash([]);
    // current p
    const atPeak = Math.abs(p - d.phat) < 0.02;
    L.ctx.fillStyle = atPeak ? '#2dd4a0' : '#00d4ff';
    L.ctx.beginPath(); L.ctx.arc(sx(p), sy(LL(p)), 7, 0, 7); L.ctx.fill();
    L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '12px ' + FONT();
    L.ctx.fillText('p = 0', x0 - 6, yb + 18); L.ctx.fillText('p = 1', x1 - 24, yb + 18);
    L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = 'bold 14px ' + FONT();
    L.ctx.fillText('log-likelihood  ℓ(p) = ' + h + '·ln p + ' + t + '·ln(1−p)', x0, 28);
    L.readout.innerHTML = d.name + '<br>p = ' + p.toFixed(2) + '   ℓ(p) = ' + LL(p).toFixed(2) +
      '<br>MLE p̂ = h/(h+t) = <b>' + d.phat.toFixed(2) + '</b>' + (atPeak ? '  ✓ at the peak' : '');
    m.update({di, p});
  }
  slider(L.ctrl, 'p — the coin\'s bias', 0.02, 0.98, 0.01, 0.5, v=>v.toFixed(2), v=>{p=v; draw();});
  const row = chips(L.ctrl, 'OBSERVED DATA', DATA.map(d=>d.name), (i, btn, r)=>{
    di = i; [...r.children].forEach(el=>el.classList.remove('on')); btn.classList.add('on'); draw();
  });
  row.children[0].classList.add('on');
  note(L.ctrl, 'The purple curve is the log-likelihood of the observed flips as a function of the coin\'s bias p. Its peak (dashed green) is the MLE p̂ = heads/total — the bias that makes what you saw most probable. Push p toward the edges and the curve plunges: overconfidence is expensive.');
  draw();
};

/* ================== prob-clt — Lab: The standard-error law SE = σ/√n ==========
   The CLT's quantitative half: the spread of a sample mean is σ/√n. Set σ and n
   to hit target standard errors and feel the square-root cost (4× data → ½ noise). */
INTERACTIVES.probcltSE = function(stage, api){
  const L = makeLab(stage);
  let sg = 2, n = 1;

  api.predict({
    prompt: 'A source has standard deviation \\(\\sigma = 2\\). For a sample mean of \\(n = 100\\) draws, predict the <b>standard error \\(\\sigma/\\sqrt{n}\\)</b>.',
    input: true, placeholder: 'σ/√n', answer: 0.2, tol: 0.02, unit: '',
    reveal: 'SE = σ/√n = 2/√100 = 2/10 = <b>0.2</b>. Precision costs at √n prices: to halve the noise you need 4× the data. Below, dial σ and n to hit each target.',
  });

  const m = api.missions([
    {text:'Make the standard error <b>SE = 1.0</b> (± 0.03)', xp:20,
      check:s => Math.abs(s.se - 1.0) < 0.03},
    {text:'Halve it to <b>SE = 0.5</b> — notice how much more data that takes', xp:20,
      check:s => Math.abs(s.se - 0.5) < 0.02},
    {text:'Reach <b>SE = 0.2</b> (± 0.01)', xp:25,
      check:s => Math.abs(s.se - 0.2) < 0.01},
  ]);

  function draw(){
    clearBg(L.ctx, L.W, L.H);
    const se = sg / Math.sqrt(n);
    // draw a Gaussian of width `se` around center, so the narrowing is visible
    const cx = L.W/2, yb = L.H - 46, scale = 90;
    const g = x => Math.exp(-(x*x)/(2*se*se));
    L.ctx.strokeStyle = 'rgba(255,255,255,.2)'; L.ctx.lineWidth = 1;
    L.ctx.beginPath(); L.ctx.moveTo(40, yb); L.ctx.lineTo(L.W-40, yb); L.ctx.stroke();
    L.ctx.strokeStyle = '#7c5cff'; L.ctx.lineWidth = 3; L.ctx.beginPath();
    let started = false;
    for(let px = 40; px <= L.W-40; px += 2){ const x = (px - cx)/scale; const y = yb - g(x)*(yb-60);
      if(!started){ L.ctx.moveTo(px, y); started = true; } else L.ctx.lineTo(px, y); }
    L.ctx.stroke();
    // ±SE markers
    L.ctx.setLineDash([5,5]); L.ctx.strokeStyle = 'rgba(255,201,77,.6)'; L.ctx.lineWidth = 1.5;
    [-se, se].forEach(x => { const px = cx + x*scale; L.ctx.beginPath(); L.ctx.moveTo(px, 60); L.ctx.lineTo(px, yb); L.ctx.stroke(); });
    L.ctx.setLineDash([]);
    const hit = Math.abs(se-1)<0.03 || Math.abs(se-0.5)<0.02 || Math.abs(se-0.2)<0.01;
    L.ctx.fillStyle = hit ? '#2dd4a0' : '#cdd4f0'; L.ctx.font = 'bold 17px ' + FONT();
    L.ctx.fillText('SE = σ/√n = ' + sg.toFixed(1) + '/√' + n + ' = ' + se.toFixed(3), 44, 30);
    L.readout.innerHTML = 'σ = ' + sg.toFixed(1) + '   n = ' + n + '<br><b>standard error = ' + se.toFixed(3) + '</b>';
    m.update({se, sg, n});
  }
  slider(L.ctrl, 'σ — source standard deviation', 1, 10, 0.5, sg, v=>v.toFixed(1), v=>{sg=v; draw();});
  slider(L.ctrl, 'n — sample size', 1, 400, 1, n, v=>''+v, v=>{n=v; draw();});
  note(L.ctrl, 'The bell is the distribution of the sample mean; its width is the standard error σ/√n. Because of the square root, cutting the error in half needs four times the data — the eternal economics of sample size (and batch size).');
  draw();
};

/* ================== prob-entropy — Lab: Compute entropy to a target ===========
   H(P) = −Σ pᵢ log₂ pᵢ. Shape a 4-outcome P to hit exact bit targets: 1 bit
   (a fair coin's worth), 1.5 bits, and the 2-bit uniform maximum. */
INTERACTIVES.probentCompute = function(stage, api){
  const L = makeLab(stage);
  let w = [3,1,1,1];
  const NAMES = ['A','B','C','D'];

  api.predict({
    prompt: 'A fair coin has two equally likely outcomes. Its entropy is \\(H = -\\sum p_i \\log_2 p_i\\). Predict <b>H</b>, in bits.',
    input: true, placeholder: 'bits', answer: 1, tol: 0.05, unit: 'bits',
    reveal: 'H = −(½·log₂½ + ½·log₂½) = −(−½ − ½) = <b>1 bit</b> — one yes/no question settles a fair coin. Below, shape a 4-outcome distribution to hit exact entropy targets.',
  });

  const m = api.missions([
    {text:'Make <b>H(P) = 1.0 bit</b> (± 0.05) — a fair coin\'s worth of uncertainty', xp:20,
      check:s => Math.abs(s.H - 1.0) < 0.05},
    {text:'Make <b>H(P) = 1.5 bits</b> (± 0.05)', xp:20,
      check:s => Math.abs(s.H - 1.5) < 0.05},
    {text:'Maximize it: <b>H(P) = 2 bits</b> — the uniform distribution over 4 outcomes', xp:25,
      check:s => Math.abs(s.H - 2.0) < 0.03},
  ]);

  function draw(){
    clearBg(L.ctx, L.W, L.H);
    const sum = w.reduce((a,b)=>a+b, 0) || 1;
    const p = w.map(x => x/sum);
    const H = p.reduce((a,x)=> a - (x > 1e-9 ? x*Math.log2(x) : 0), 0);
    barPlot(L.ctx, L.W, 300, p.map((pi,i)=>({label:NAMES[i], v:pi, color:'rgba(124,92,255,.7)'})), 1);
    const hit = Math.abs(H-1)<0.05 || Math.abs(H-1.5)<0.05 || Math.abs(H-2)<0.03;
    L.ctx.fillStyle = hit ? '#2dd4a0' : '#ffc94d'; L.ctx.font = 'bold 17px ' + FONT();
    L.ctx.fillText('H(P) = −Σ pᵢ log₂ pᵢ = ' + H.toFixed(3) + ' bits', 44, 26);
    L.readout.innerHTML = 'p = [' + p.map(x=>x.toFixed(2)).join(', ') + ']<br><b>H(P) = ' + H.toFixed(3) + ' bits</b>' +
      '  (max = 2 for 4 outcomes)';
    m.update({H});
  }
  NAMES.forEach((nm,i)=>slider(L.ctrl, 'weight on ' + nm, 0, 10, 0.5, w[i], v=>v.toFixed(1), v=>{w[i]=v; draw();}));
  note(L.ctrl, 'Entropy is average surprise in bits: 0 when one outcome is certain, maximal (log₂4 = 2 bits) when all four are equally likely. Two equal outcomes with the rest empty give exactly 1 bit — a fair coin. Shape P to hit each target.');
  draw();
};
