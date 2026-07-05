/* ================================================================
   WORLD 3 EXTENSION — STATISTICS & EVIDENCE (frequentist).
   Fills the frequentist-statistics gap: what an estimator IS and how
   it behaves (bias/variance), what a confidence interval REALLY means,
   and how a p-value falls out of a permutation test. Simulation-first
   throughout — every claim is something you watch happen, not a formula
   to memorize. Same registries + schema as the other worlds (index.js).
   world:'prob' (Probability & Statistics) — NOT a separate world.
   Appended at the END of the prob track via explicit high `order`.
   Math is written with Unicode (μ, σ, ², ÷, ≈, ≤, ≥, √); JS string
   delimiters are ASCII ' or backtick ONLY.
   ================================================================ */
import { LESSONS, INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, slider, chips, clearBg } from '../engine.js';

/* ---------- shared: a boxed histogram drawn straight with ctx ----------
   Draws `counts` (an array of bin heights) into the rect [x,y,w,h].
   Returns a mapper {binX, toX} so callers can overlay markers in the
   same pixel space (a true-parameter line, the observed statistic, …). */
function histo(ctx, x, y, w, h, counts, opts){
  opts = opts || {};
  const n = counts.length;
  const mx = Math.max(...counts, 1);
  const bw = w / n;
  // baseline
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.stroke();
  for(let i = 0; i < n; i++){
    const bh = (counts[i] / mx) * h;
    ctx.fillStyle = (opts.colorOf && opts.colorOf(i)) || 'rgba(0,212,255,.55)';
    ctx.fillRect(x + i * bw + bw * 0.08, y + h - bh, bw * 0.84, bh);
  }
  // domain → pixel mappers (lo..hi map across the full width)
  const lo = opts.lo === undefined ? 0 : opts.lo;
  const hi = opts.hi === undefined ? n : opts.hi;
  return {
    binX: i => x + (i + 0.5) * bw,
    toX: v => x + (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * w,
    x0: x, x1: x + w, yTop: y, yBot: y + h,
  };
}
function vline(ctx, px, yTop, yBot, color, dash){
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  if(dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(px, yTop); ctx.lineTo(px, yBot); ctx.stroke();
  ctx.restore();
}
/* Box–Muller: one standard-normal draw. Math.random() is available in
   the browser (only forbidden in workflow scripts, not lesson code). */
function gauss(){
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ================== 1 · ESTIMATORS, BIAS & VARIANCE ================== */

registerLesson({
  id:'stat-estimator', world:'prob', order:100, emoji:'📏', title:'Estimators, Bias & Variance',
  sub:'An estimator is a recipe that turns data into a guess — and every recipe has a personality.',
  learn:`<p>You never see a distribution — only <strong>samples</strong> from it. An <strong>estimator</strong> is a rule that turns those samples into a guess about a hidden parameter (the true mean μ, the true variance σ²). Because the sample is random, <em>the estimate is itself a random variable</em>: run the experiment again, get a different number. Its distribution over repeated experiments is called the <strong>sampling distribution</strong>, and two of its features decide whether the estimator is any good:</p>
  <p>• <strong>Bias</strong> — does it hit the true value <em>on average</em>? Bias = E[estimate] − true.<br>
  • <strong>Variance</strong> — how much does it bounce around from sample to sample?</p>
  <p>The sample mean x̄ = (1/n)Σxᵢ is <strong>unbiased</strong> for μ: centre a whole cloud of x̄'s and it sits exactly on μ. Variance is subtler. The "natural" variance estimate divides by n:</p>
  <div class="formula">σ²_MLE = (1/n) Σ (xᵢ − x̄)²   ← biased LOW</div>
  <p>It systematically <em>under</em>-estimates, because the data hugs its own mean x̄ more tightly than it hugs the true μ — you already spent one "degree of freedom" estimating the centre. The fix is <strong>Bessel's correction</strong>: divide by n−1 instead of n.</p>
  <div class="formula">s² = (1/(n−1)) Σ (xᵢ − x̄)²   ← unbiased for σ²</div>
  <p>In the lab you'll draw thousands of samples and watch the ÷n cloud land <em>below</em> the true σ² while the ÷(n−1) cloud centres right on it. Neither is "more accurate" on a single sample — bias is a statement about the long-run average of the recipe, not about any one run.</p>`,
  ml:`Every metric you report — validation accuracy, a benchmark score, an A/B lift — is an <b>estimate</b> from a finite sample, so it has a sampling distribution with its own bias and variance. This is also the <b>bias–variance tradeoff</b> in disguise: a high-capacity model has low bias but high variance across training sets; a simple model is the reverse. And the ÷n vs ÷(n−1) distinction is exactly why libraries expose <code>ddof</code> (delta degrees of freedom): NumPy's <code>var</code> defaults to ÷n, pandas to ÷(n−1).`,
  deeper:[
   {title:'😵 Stuck? One recipe, many meals', body:'Think of an estimator as a recipe and each sample as a batch of groceries. Bias asks: if I cook this recipe a thousand times, does the average dish taste like the target? Variance asks: how wildly do individual dishes differ? A recipe can be perfectly on-target on average (unbiased) yet produce wildly inconsistent meals (high variance) — and a biased recipe can still be the one you want if it is far more consistent.'},
   {title:'🚀 Go deeper: why n−1 and not n−0.5?', body:'Estimating the centre from the same data costs exactly one <b>degree of freedom</b>: once x̄ is fixed, only n−1 of the deviations (xᵢ − x̄) are free — the last is forced, because they must sum to zero. Dividing by that count of free deviations, n−1, is what makes E[s²] land exactly on σ². It is not a fudge factor; it is counting the information the data actually had left after locating its own centre.'},
   {title:'🚀 Go deeper: unbiased is not sacred (MSE)', body:'Mean squared error decomposes as MSE = bias² + variance. Minimising MSE sometimes means <em>accepting</em> a little bias to kill a lot of variance — which is the whole idea behind <b>shrinkage</b> and regularization (ridge regression, James–Stein). The ÷n variance estimator is biased but has slightly lower variance than ÷(n−1); statisticians keep the unbiased one by convention, but "unbiased" and "best" are genuinely different goals.'}],
  interactive:'statestimator',
  quiz:[
   {q:'An estimator is called <b>unbiased</b> when…', opts:['Its expected value equals the true parameter','It gives the same answer on every sample','It never makes an error on any single sample','It has the smallest possible variance'], a:0,
    tag:'bias definition', focus:'Unbiased is a statement about the AVERAGE over many samples: E[estimate] = true value.',
    why:'Unbiased means E[estimate] = true parameter — the sampling distribution is centred on the target. It says nothing about any single run.',
    wrong:{1:'A random sample gives a different estimate each time — that is variance, not bias. An unbiased estimator still bounces around; it just bounces around the RIGHT centre.',2:'No estimator built from a finite random sample is exactly right every time. Unbiasedness is about the long-run average, not per-sample perfection.',3:'Smallest variance is a SEPARATE property (efficiency). An estimator can be unbiased and noisy, or biased and tight.'}},
   {q:'The variance estimate that divides by <b>n</b> (the MLE) is…', opts:['Biased low — it under-estimates σ² on average','Unbiased for σ²','Biased high — it over-estimates σ²','Only correct when μ is known'], a:0,
    tag:'variance bias', focus:'÷n under-estimates because deviations are measured from x̄ (which the data hugs), not the true μ.',
    why:'Dividing by n under-estimates σ² on average: squared deviations are taken from x̄, which the sample sits closer to than to the true μ. That is why Bessel divides by n−1.',
    wrong:{1:'The ÷n estimator is the biased one — that is the whole reason Bessel corrects it to ÷(n−1).',2:'It errs LOW, not high: measuring spread from the sample mean makes the data look tighter than it truly is around μ.',3:'The bias is present precisely BECAUSE μ is unknown and replaced by x̄. If μ were known, ÷n would actually be unbiased.'}},
   {q:'Bessel’s correction (dividing by n−1) exists to…', opts:['Remove the bias so E[s²] = σ²','Reduce the variance of the estimate','Make the estimate larger to be safe','Speed up the computation'], a:0,
    tag:'bessel correction', focus:'n−1 counts the free deviations after fixing x̄, making the estimator exactly unbiased.',
    why:'Dividing by n−1 (the number of free deviations once x̄ is fixed) makes the expected value land exactly on σ². It corrects bias, not variance.',
    wrong:{1:'It actually raises the variance of the estimate slightly — the point is unbiasedness, a different goal from minimum variance.',2:'It is not a safety margin. n−1 is the exact count of degrees of freedom left after estimating the mean — the unique divisor that removes the bias.',3:'It changes the divisor, not the amount of work — computation is essentially identical.'}},
   {q:'You report validation accuracy from a 500-image test set. Bias–variance-wise, this number is…', opts:['One draw from a sampling distribution — it has variance across test sets','The model’s exact true accuracy','Deterministic and error-free','Meaningful only if the model is unbiased'], a:0,
    tag:'estimators in ML', focus:'A benchmark score is an estimate from a finite sample; re-drawing the test set would move it.',
    why:'A test-set score is an estimate from one finite sample, so it has a sampling distribution — swap in a different 500 images and the number moves. Report it with an error bar.',
    wrong:{1:'True accuracy is over the whole data distribution; 500 images only estimate it, with sampling error.',2:'It is random: a different random test set yields a different score. That randomness is exactly its variance.',3:'The score is an estimator regardless of the model — bias/variance describe the ESTIMATE, not a precondition for it to mean anything.'}},
  ],
});
INTERACTIVES.statestimator = function(stage, api){
  const L = makeLab(stage, {h:480});
  // Truth: Normal(mu=0, sigma=2) so sigma^2 = 4.
  const MU = 0, SIGMA = 2, TRUEVAR = SIGMA * SIGMA;
  let n = 5;
  // collected estimates across repeated experiments
  let means = [], varN = [], varN1 = [];
  const m = api.missions([
    {text:'Run at least <b>300</b> experiments (draw a sample, record the estimates)', xp:15,
      check:s=>s.count>=300},
    {text:'With <b>n = 5</b>, gather ≥ 500 experiments and watch the <b>÷n</b> variance cloud sit clearly <b>below</b> the true σ² = 4 (its mean ≤ 3.6)', xp:25,
      check:s=>s.n===5&&s.count>=500&&s.avgVarN<=3.6},
    {text:'Confirm the fix: the <b>÷(n−1)</b> cloud centres on σ² = 4 (its mean within 0.3 of 4, ≥ 500 experiments)', xp:20,
      check:s=>s.count>=500&&Math.abs(s.avgVarN1-4)<0.3},
  ]);
  function drawSample(){
    const xs = [];
    for(let i = 0; i < n; i++) xs.push(MU + SIGMA * gauss());
    const mean = xs.reduce((a,b)=>a+b,0) / n;
    const ss = xs.reduce((a,x)=>a + (x - mean) * (x - mean), 0);
    means.push(mean);
    varN.push(ss / n);
    varN1.push(n > 1 ? ss / (n - 1) : 0);
    if(means.length > 20000){ means.shift(); varN.shift(); varN1.shift(); }
  }
  function run(k){ for(let i = 0; i < k; i++) drawSample(); draw(); }
  function reset(){ means = []; varN = []; varN1 = []; draw(); }
  function binize(vals, lo, hi, B){
    const c = Array(B).fill(0);
    for(const v of vals){
      const b = Math.floor((v - lo) / (hi - lo) * B);
      if(b >= 0 && b < B) c[b]++;
    }
    return c;
  }
  function avg(a){ return a.length ? a.reduce((x,y)=>x+y,0) / a.length : 0; }
  function draw(){
    clearBg(L.ctx, L.W, L.H);
    const ff = getComputedStyle(document.body).fontFamily;
    const ctx = L.ctx, count = means.length;
    const px = 40, pw = L.W - 80, B = 40;
    // --- panel 1: sampling distribution of the sample mean ---
    ctx.fillStyle = '#8b93b8'; ctx.font = '700 12px ' + ff;
    ctx.fillText('Sampling distribution of x̄ (sample mean) — unbiased for μ', px, 22);
    const mh = histo(ctx, px, 34, pw, 110, binize(means, -4, 4, B),
      {lo:-4, hi:4, colorOf:()=>'rgba(45,212,160,.55)'});
    vline(ctx, mh.toX(MU), 34, 144, 'rgba(255,201,77,.9)', [5,5]);
    ctx.fillStyle = '#cdd4f0'; ctx.font = '600 11px ' + ff;
    ctx.fillText('true μ = 0', mh.toX(MU) + 6, 46);
    // --- panels 2+3 share a variance axis 0..8, true var=4 at centre ---
    const vlo = 0, vhi = 8;
    ctx.fillStyle = '#8b93b8'; ctx.font = '700 12px ' + ff;
    ctx.fillText('Variance estimates — ÷n (blue, biased LOW) vs ÷(n−1) (purple, unbiased)', px, 178);
    // Two overlaid variance histograms sharing ONE normalization max, so the
    // clouds are visually comparable (the lesson is about their POSITIONS).
    const cN = binize(varN, vlo, vhi, B), c1 = binize(varN1, vlo, vhi, B);
    const vmax = Math.max(...cN, ...c1, 1);
    const vTop = 190, vH = 150, bw = pw / B;
    // shared baseline
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, vTop + vH); ctx.lineTo(px + pw, vTop + vH); ctx.stroke();
    for(let i = 0; i < B; i++){
      const hN = (cN[i] / vmax) * vH, h1 = (c1[i] / vmax) * vH;
      ctx.fillStyle = 'rgba(0,212,255,.5)';
      ctx.fillRect(px + i * bw + bw * 0.08, vTop + vH - hN, bw * 0.84, hN);
      ctx.fillStyle = 'rgba(124,92,255,.5)';
      ctx.fillRect(px + i * bw + bw * 0.08, vTop + vH - h1, bw * 0.84, h1);
    }
    // shared domain→pixel mapper for this variance axis
    const vh = { toX: v => px + (Math.max(vlo, Math.min(vhi, v)) - vlo) / (vhi - vlo) * pw };
    // true variance line
    vline(ctx, vh.toX(TRUEVAR), 190, 340, 'rgba(255,201,77,.9)', [5,5]);
    ctx.fillStyle = '#ffc94d'; ctx.font = '700 11px ' + ff;
    ctx.fillText('true σ² = 4', vh.toX(TRUEVAR) + 6, 204);
    // mean markers for each cloud
    const aVarN = avg(varN), aVarN1 = avg(varN1);
    if(count){
      vline(ctx, vh.toX(aVarN), 320, 340, '#00d4ff');
      vline(ctx, vh.toX(aVarN1), 320, 340, '#7c5cff');
    }
    // axis ticks for variance panel
    ctx.fillStyle = '#8b93b8'; ctx.font = '600 10px ' + ff; ctx.textAlign = 'center';
    for(let t = 0; t <= 8; t += 2) ctx.fillText('' + t, vh.toX(t), 356);
    ctx.textAlign = 'left';
    L.readout.innerHTML =
      'true: μ = 0, σ² = 4 (Normal), n = ' + n +
      '<br>experiments = ' + count +
      '<br>mean of ÷n estimates = ' + (count ? aVarN.toFixed(3) : '—') +
        ' <span style="color:#00d4ff">(biased low)</span>' +
      '<br>mean of ÷(n−1) estimates = ' + (count ? aVarN1.toFixed(3) : '—') +
        ' <span style="color:#b9a8ff">(≈ 4)</span>';
    m.update({n, count, avgVarN: aVarN, avgVarN1: aVarN1});
  }
  chips(L.ctrl, 'RUN EXPERIMENTS (draw sample → record estimates)',
    ['+1', '+100', '+1000'], (i)=>run([1,100,1000][i]));
  slider(L.ctrl, 'n — sample size per experiment', 2, 30, 1, 5, v=>'' + v, v=>{ n = v; reset(); });
  const d = document.createElement('div'); d.className = 'ctrl';
  const rb = document.createElement('button'); rb.className = 'chip';
  rb.textContent = '↺ Clear'; rb.onclick = reset;
  d.appendChild(rb); L.ctrl.appendChild(d);
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Each experiment draws n numbers from a Normal with true μ = 0, σ² = 4. Top: the sample means pile up right on μ — <b style="color:#2dd4a0">unbiased</b>. Bottom: the <b style="color:#00d4ff">÷n</b> variance cloud sits LEFT of the gold σ² = 4 line, while the <b style="color:#b9a8ff">÷(n−1)</b> cloud centres on it. Small n exaggerates the gap.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== 2 · CONFIDENCE INTERVALS ================== */

registerLesson({
  id:'stat-ci', world:'prob', order:101, emoji:'🎯', title:'Confidence Intervals',
  sub:'"95% confident" is a promise about the procedure, not about this one interval. Learn the difference forever.',
  learn:`<p>A point estimate (x̄ = 4.7) throws away its own uncertainty. A <strong>confidence interval</strong> reports a range instead — say 4.7 ± 0.6 — built so that the <em>procedure</em> traps the true parameter a stated fraction of the time. For a mean, the classic 95% interval is:</p>
  <div class="formula">x̄ ± 1.96 · (σ / √n)    ← the ±1.96·SE band</div>
  <p>Here σ/√n is the <strong>standard error</strong> (the spread of x̄, from the CLT), and 1.96 is the z-value cutting off the central 95% of a Gaussian. Wider n ⇒ narrower interval, at the √n rate.</p>
  <p>Now the part everyone gets wrong. The frequentist meaning of "95% confidence" is:</p>
  <p><strong>If you repeated the whole experiment many times, about 95% of the intervals you build would contain the true parameter.</strong></p>
  <p>The <em>interval</em> is random (it moves with the data); the <em>parameter</em> is a fixed unknown constant. So it is <strong>wrong</strong> to say "there is a 95% probability the true mean is in <em>this</em> interval" — this interval either caught it or missed it; the 95% lives in the long run of the procedure, not in one realization. In the lab you'll draw ~100 samples, build a CI from each, and literally count: about 95 of the horizontal bars cross the true-parameter line, about 5 miss.</p>`,
  ml:`Every serious result table has error bars, and they are confidence (or credible) intervals. "SOTA by 0.3%" is meaningless if the 95% CIs overlap heavily — the difference is inside the noise. Bootstrap CIs (resample your test set with replacement, recompute the metric, take the middle 95%) are the practical way to put honest error bars on any metric without a formula. Reviewers who ask for "significance" are asking whether your intervals actually separate.`,
  deeper:[
   {title:'😵 Stuck? The interval is the arrow, not the target', body:'The true parameter is a fixed bullseye you cannot see. Each experiment fires one arrow-shaped interval at it. A "95% CI" is an arrow-making machine calibrated so 95% of its arrows straddle the bullseye. Once an arrow has landed, it either covers the bullseye or it does not — there is no probability left in that single shot. The 95% describes the MACHINE, across many shots.'},
   {title:'🚀 Go deeper: coverage vs the Bayesian credible interval', body:'The frequentist CI has a <b>coverage</b> guarantee: the procedure catches θ 95% of the time, but you may not attach a probability to θ itself (θ is not random). A Bayesian <b>credible interval</b> flips this — it treats θ as random given a prior and genuinely says "95% posterior probability θ is in here". They often look similar numerically but answer different questions; conflating them is the deepest CI confusion of all.'},
   {title:'🚀 Go deeper: what makes a CI too wide or too narrow', body:'If your model of the noise is wrong — correlated samples, heavy tails, an underestimated σ — the stated 95% can badly miss its real coverage (you get 80% intervals wearing a 95% label). This is why bootstrap and permutation methods are so valued: they lean on resampling the actual data rather than trusting a fragile formula, so their coverage degrades more gracefully when assumptions break.'}],
  interactive:'statci',
  quiz:[
   {q:'A 95% confidence interval for μ means…', opts:['If we repeated the experiment, ~95% of such intervals would contain μ','There is a 95% probability μ lies in this specific interval','95% of the data falls inside the interval','The interval is correct 95% of the way across its width'], a:0,
    tag:'CI meaning', focus:'Confidence is a property of the PROCEDURE across repeats, not a probability about one interval.',
    why:'The guarantee is about the long-run procedure: across many repeated experiments, ~95% of the constructed intervals cover the fixed true μ.',
    wrong:{1:'This is THE classic error. μ is a fixed constant and this interval is already drawn — it either contains μ or it does not. The 95% lives in the repeated procedure, not in this one realization.',2:'A CI for the MEAN is not a range for the raw data — it is a range for the parameter, and is far narrower than the data spread (it shrinks like 1/√n).',3:'Confidence is not a fraction of the interval’s width; it is the long-run coverage rate of the method.'}},
   {q:'In the frequentist view, which is random?', opts:['The interval (it changes with the data); the parameter is fixed','The parameter; the interval is fixed','Both the parameter and the interval','Neither — everything is fixed once observed'], a:0,
    tag:'what is random', focus:'Data (and the interval built from it) is random; the true parameter is an unknown constant.',
    why:'The parameter is an unknown but fixed constant. The data is random, so the interval computed from it is random — that is where the 95% comes from.',
    wrong:{1:'Backwards. Frequentists treat the parameter as a fixed constant; it is the DATA (and the interval) that varies from experiment to experiment.',2:'The parameter does not vary in the frequentist framework — only the sample-dependent interval does.',3:'The interval is a function of random data, so before you see the data it is genuinely random — that randomness is the whole basis of the coverage claim.'}},
   {q:'You quadruple the sample size (n → 4n). A 95% CI for the mean becomes…', opts:['About half as wide','About a quarter as wide','About twice as wide','Unchanged in width'], a:0,
    tag:'CI width vs n', focus:'Width ∝ σ/√n, so 4× the data halves the width (√4 = 2).',
    why:'The half-width is 1.96·σ/√n, so it scales like 1/√n. Multiplying n by 4 divides the width by √4 = 2 — half as wide.',
    wrong:{1:'A quarter would need the width to scale like 1/n, but it scales like 1/√n. You are off by the square root.',2:'More data makes the interval NARROWER, not wider — precision improves with n.',3:'Width shrinks with n; it is not constant. The √n in the standard error is what changes it.'}},
   {q:'Two models’ accuracies have heavily overlapping 95% CIs. The honest conclusion is…', opts:['The difference may well be noise — not clearly significant','Model A is definitely better','The CIs must have been computed wrong','Overlap is irrelevant to significance'], a:0,
    tag:'CIs in ML', focus:'Heavily overlapping CIs mean the gap is within sampling noise — do not claim a real difference.',
    why:'When intervals overlap heavily, the observed gap is comfortably within sampling noise, so you cannot claim a reliable difference from this evidence.',
    wrong:{1:'A higher point estimate with overlapping CIs is exactly the situation where the lead may be luck — the evidence does not support “definitely”.',2:'Overlapping CIs are a normal, correct outcome when effects are small relative to noise — not a sign of a computation error.',3:'Overlap is directly relevant: it is a quick visual check on whether a difference exceeds the noise.'}},
  ],
});
INTERACTIVES.statci = function(stage, api){
  const L = makeLab(stage, {h:480});
  // Truth: Normal(mu=5, sigma=3). Each "trial" draws n samples, builds a
  // 95% CI x̄ ± 1.96 sigma/sqrt(n), and we track whether it covers mu.
  const MU = 5, SIGMA = 3;
  let n = 25, conf = 1.96;         // 1.96 -> 95%
  let trials = [];                  // {lo, hi, mean, covers}
  let covered = 0;
  const m = api.missions([
    {text:'Build at least <b>50</b> intervals (each from a fresh sample)', xp:15,
      check:s=>s.total>=50},
    {text:'Reach ≥ <b>200</b> intervals and watch coverage converge near <b>95%</b> (between 92% and 98%)', xp:25,
      check:s=>s.total>=200&&s.rate>=0.92&&s.rate<=0.98},
    {text:'Change the confidence level to <b>80%</b> and gather ≥ 200 intervals — coverage should drop toward 80% (between 76% and 84%)', xp:20,
      check:s=>Math.abs(s.conf-1.28)<0.05&&s.total>=200&&s.rate>=0.76&&s.rate<=0.84},
  ]);
  function addTrial(){
    let s = 0;
    for(let i = 0; i < n; i++) s += MU + SIGMA * gauss();
    const mean = s / n;
    const half = conf * SIGMA / Math.sqrt(n);
    const lo = mean - half, hi = mean + half;
    const covers = (lo <= MU && MU <= hi);
    trials.push({lo, hi, mean, covers});
    if(covers) covered++;
    if(trials.length > 100){ const old = trials.shift(); if(old.covers) covered--; }
  }
  function run(k){ for(let i = 0; i < k; i++) addTrial(); draw(); }
  function reset(){ trials = []; covered = 0; draw(); }
  function draw(){
    clearBg(L.ctx, L.W, L.H);
    const ctx = L.ctx, ff = getComputedStyle(document.body).fontFamily;
    const px = 30, pw = L.W - 60;
    // horizontal value axis: mu in the middle, +/- a fixed window
    const lo = MU - 5, hi = MU + 5;
    const toX = v => px + (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * pw;
    // header
    ctx.fillStyle = '#8b93b8'; ctx.font = '700 12px ' + ff;
    const pct = Math.round((conf === 1.96 ? 95 : conf === 1.28 ? 80 : (2 * normCdf(conf) - 1) * 100));
    ctx.fillText('Each bar = one experiment’s ' + pct + '% CI. Gold line = the (fixed, unknown) true μ.', px, 20);
    // draw the true-mu vertical line spanning the stack
    const stackTop = 34, stackBot = L.H - 30;
    vline(ctx, toX(MU), stackTop, stackBot, 'rgba(255,201,77,.9)', [5,5]);
    ctx.fillStyle = '#ffc94d'; ctx.font = '700 11px ' + ff;
    ctx.textAlign = 'center'; ctx.fillText('μ = 5', toX(MU), stackTop - 2); ctx.textAlign = 'left';
    // show the most recent intervals as stacked horizontal segments
    const show = trials.slice(-40);
    const rows = show.length || 1;
    const gap = (stackBot - stackTop) / Math.max(rows, 1);
    show.forEach((t, i) => {
      const y = stackTop + i * gap + gap * 0.5;
      ctx.strokeStyle = t.covers ? 'rgba(45,212,160,.85)' : 'rgba(255,92,122,.95)';
      ctx.lineWidth = t.covers ? 2 : 2.5;
      ctx.beginPath(); ctx.moveTo(toX(t.lo), y); ctx.lineTo(toX(t.hi), y); ctx.stroke();
      // end caps
      ctx.beginPath(); ctx.moveTo(toX(t.lo), y - 3); ctx.lineTo(toX(t.lo), y + 3);
      ctx.moveTo(toX(t.hi), y - 3); ctx.lineTo(toX(t.hi), y + 3); ctx.stroke();
      // point estimate dot
      ctx.fillStyle = t.covers ? '#2dd4a0' : '#ff5c7a';
      ctx.beginPath(); ctx.arc(toX(t.mean), y, 2.5, 0, 7); ctx.fill();
    });
    const total = trials.length;
    const rate = total ? covered / total : 0;
    L.readout.innerHTML =
      'true μ = 5 (fixed), σ = 3, n = ' + n +
      '<br>confidence level = ' + pct + '%' +
      '<br>intervals built = ' + total + ' (showing last ' + show.length + ')' +
      '<br><b>covered μ: ' + covered + ' / ' + total + ' = ' +
        (total ? (rate * 100).toFixed(1) + '%' : '—') + '</b>' +
      '<br><span style="color:#ff5c7a">red bars missed μ</span>';
    m.update({total, rate, conf, n});
  }
  // small normal-CDF for arbitrary confidence readouts (Abramowitz-Stegun)
  function normCdf(z){
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }
  chips(L.ctrl, 'BUILD INTERVALS (fresh sample each)',
    ['+1', '+10', '+50'], (i)=>run([1,10,50][i]));
  chips(L.ctrl, 'CONFIDENCE LEVEL', ['80%', '90%', '95%', '99%'], (i, btn, row)=>{
    conf = [1.28, 1.645, 1.96, 2.576][i]; reset();
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on');
  });
  slider(L.ctrl, 'n — sample size per interval', 5, 100, 5, 25, v=>'' + v, v=>{ n = v; reset(); });
  const d = document.createElement('div'); d.className = 'ctrl';
  const rb = document.createElement('button'); rb.className = 'chip';
  rb.textContent = '↺ Clear'; rb.onclick = reset;
  d.appendChild(rb); L.ctrl.appendChild(d);
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Every horizontal bar is one experiment’s interval. The <b style="color:#ffc94d">gold μ line stays put</b> — it is the intervals that jump around. <b style="color:#2dd4a0">Green</b> bars caught μ; <b style="color:#ff5c7a">red</b> ones missed. Keep building and the miss rate settles near 5% for a 95% level: coverage is a property of the procedure, not of any one bar.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ============== 3 · HYPOTHESIS TESTING & p-VALUES (PERMUTATION) ============== */

registerLesson({
  id:'stat-perm', world:'prob', order:102, emoji:'🃏', title:'Hypothesis Testing & p-values',
  sub:'Shuffle the labels, build the world where nothing is going on, and see how weird your result looks in it.',
  learn:`<p>You gave a treatment to one group and a placebo to another; the treated group did better by some amount — the <strong>observed statistic</strong> (say, a difference in means). Real effect, or luck of the draw? A <strong>hypothesis test</strong> answers by first assuming the boring explanation, the <strong>null hypothesis</strong> H₀: <em>the label doesn't matter — both groups are draws from the same distribution.</em></p>
  <p>The <strong>permutation test</strong> makes H₀ concrete with zero formulas. If the label truly doesn't matter, then reshuffling which subjects were "treated" vs "control" should produce differences just like the one you saw. So:</p>
  <p>1. Pool everyone, <strong>shuffle the labels</strong>, split into two fake groups, recompute the statistic.<br>
  2. Repeat thousands of times → the <strong>null distribution</strong>: what "no effect" looks like.<br>
  3. Locate your real observed statistic in that distribution.</p>
  <p>The <strong>p-value</strong> is the fraction of shuffled worlds that produced a statistic <em>at least as extreme</em> as the one you actually observed:</p>
  <div class="formula">p = P( statistic ≥ observed | H₀ )</div>
  <p>Small p (say &lt; 0.05) means your result is rare under "nothing is going on" — evidence against H₀. Crucially, the p-value is <strong>NOT</strong> the probability that H₀ is true, and it is <strong>not</strong> the probability your result happened by chance in some absolute sense. It is: <em>if H₀ held, how often would pure shuffling beat what I saw?</em> A big p means "shuffling reproduces this easily — no evidence of an effect", never "H₀ is proven".</p>`,
  ml:`A/B tests are permutation/hypothesis tests: is variant B’s conversion lift bigger than reshuffling the same users would produce by chance? Permutation testing is the honest, assumption-light way to compare two models on a shared test set: pool the per-example scores, shuffle which model each came from, and see how often the shuffled gap beats the real one. It sidesteps fragile normality assumptions entirely — you only assume that, under the null, the labels are exchangeable.`,
  deeper:[
   {title:'😵 Stuck? The p-value is a rarity score, not a truth probability', body:'Read p = 0.03 as: “in a world where the treatment does nothing, only 3% of random relabelings would look at least this impressive.” That is a statement about how surprising your data is UNDER the null — not the probability the null is true, and not the probability you are wrong. Flipping it into “97% chance the effect is real” is the single most common misuse in all of science.'},
   {title:'🚀 Go deeper: one- vs two-sided, and “at least as extreme”', body:'“Extreme” must be defined before you peek. A one-sided test counts shuffles with statistic ≥ observed (you only care if treatment HELPS). A two-sided test counts |statistic| ≥ |observed| (any difference, either direction) and typically doubles the tail. Choosing the side after seeing the data is a form of cheating that secretly inflates your false-positive rate.'},
   {title:'🚀 Go deeper: significance is not size, and p-hacking', body:'A tiny, useless effect can be “highly significant” with enough data (p depends on n), and a big effect can be non-significant with too little. Always report the effect SIZE and its interval alongside p. And if you test 20 things at α = 0.05, you expect ~1 false “discovery” by chance — that is <b>p-hacking / multiple comparisons</b>, corrected with Bonferroni or false-discovery-rate control.'}],
  interactive:'statperm',
  quiz:[
   {q:'A p-value is…', opts:['P(a statistic at least as extreme as observed, assuming H₀ is true)','The probability that H₀ is true','The probability the result was due to chance, absolutely','The probability the effect is real'], a:0,
    tag:'p-value definition', focus:'p = P(data at least this extreme | H₀). It conditions ON the null being true.',
    why:'A p-value is computed ASSUMING H₀: it is the probability, under the null, of a statistic at least as extreme as the one observed.',
    wrong:{1:'This is the #1 misconception. p is computed assuming H₀ is TRUE — it cannot also be the probability that H₀ is true. That would require a prior (a Bayesian quantity).',2:'“Due to chance, absolutely” has no meaning without a model; p is explicitly conditional on the null model H₀.',3:'p says nothing directly about the effect being real — it only measures how surprising the data is under “no effect”.'}},
   {q:'In a permutation test, shuffling the group labels simulates…', opts:['The null hypothesis — a world where the label doesn’t matter','The alternative hypothesis','A larger sample size','Measurement error in the instrument'], a:0,
    tag:'permutation logic', focus:'Under H₀ the labels are exchangeable, so shuffling them generates draws from the null distribution.',
    why:'If the label truly has no effect (H₀), the two groups are interchangeable, so reshuffling labels generates exactly the distribution of statistics you would see under “no effect”.',
    wrong:{1:'The alternative is “the label DOES matter” — the opposite of what shuffling (which erases the label’s meaning) builds. Shuffling constructs the null world.',2:'Shuffling reuses the same data — it does not add samples or change n. It reassigns labels within the pool you have.',3:'Permutation targets the effect of the LABEL, not instrument error; it needs no noise model at all.'}},
   {q:'Your permutation test gives p = 0.40. The right conclusion is…', opts:['No evidence against H₀ — shuffling reproduces this result easily','H₀ is proven true','There is a 40% chance the effect is real','The experiment failed'], a:0,
    tag:'interpreting large p', focus:'Large p = the null reproduces your data easily = no evidence of an effect (NOT proof of no effect).',
    why:'p = 0.40 means 40% of pure relabelings match or beat your result — utterly unremarkable under H₀, so there is no evidence of an effect. That is not the same as proving there is none.',
    wrong:{1:'A large p never PROVES H₀ — absence of evidence is not evidence of absence. It just fails to find a signal; a real small effect could be hiding under noise.',2:'p is not the probability the effect is real — that is the classic inversion. p is computed assuming the null, not the alternative.',3:'A large p is a perfectly valid, informative outcome (“no detectable effect”), not a failed experiment.'}},
   {q:'A result has p = 0.001 but the effect size is tiny (0.1% lift). This means…', opts:['Statistically significant, but possibly not practically important','The effect is large and important','The p-value must be wrong','H₀ is certainly true'], a:0,
    tag:'significance vs size', focus:'p measures surprise-under-null, not importance; with big n even trivial effects get small p.',
    why:'With enough data, even a trivially small effect can be highly significant. Significance (small p) and practical importance (effect size) are different questions — always report both.',
    wrong:{1:'p being small says the effect is DETECTABLE, not that it is big — here the effect size (0.1%) says it is tiny.',2:'Nothing is wrong: large samples routinely make small effects highly significant. That is expected behavior, not an error.',3:'A small p is evidence AGAINST H₀, and in any case p never proves the null true.'}},
  ],
});
INTERACTIVES.statperm = function(stage, api){
  const L = makeLab(stage, {h:480});
  // A fixed "experiment": treatment vs control outcomes (e.g. recovery scores).
  // Treatment mean is modestly higher, so the real effect is detectable but
  // not overwhelming.
  const TREAT = [7.4, 6.9, 8.1, 7.7, 6.5, 8.4, 7.0, 7.9, 6.8, 8.0, 7.5, 7.2];
  const CTRL  = [6.1, 5.8, 6.9, 6.4, 7.1, 5.5, 6.7, 6.2, 5.9, 6.6, 6.0, 7.0];
  const pool = TREAT.concat(CTRL);
  const nT = TREAT.length;
  const mean = a => a.reduce((x,y)=>x+y,0) / a.length;
  const OBS = mean(TREAT) - mean(CTRL);   // observed difference in means
  let nullStats = [];                     // shuffled differences
  let atLeast = 0;                        // count >= OBS (one-sided)
  const m = api.missions([
    {text:'Run at least <b>500</b> shuffles to build the null distribution', xp:15,
      check:s=>s.count>=500},
    {text:'Reach ≥ <b>2000</b> shuffles and read off a stable p-value (the observed effect should be rare under H₀: p ≤ 0.06)', xp:25,
      check:s=>s.count>=2000&&s.p<=0.06},
    {text:'Confirm the null is centred on <b>zero</b>: mean of the shuffled differences within 0.1 of 0 (≥ 1000 shuffles)', xp:20,
      check:s=>s.count>=1000&&Math.abs(s.nullMean)<0.1},
  ]);
  function shuffleOnce(){
    // Fisher-Yates on a copy, split into fake treat/control
    const a = pool.slice();
    for(let i = a.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    let s1 = 0; for(let i = 0; i < nT; i++) s1 += a[i];
    let s2 = 0; for(let i = nT; i < a.length; i++) s2 += a[i];
    const d = s1 / nT - s2 / (a.length - nT);
    nullStats.push(d);
    if(d >= OBS) atLeast++;
    if(nullStats.length > 40000){ nullStats.shift(); }  // atLeast approx for cap; rare in practice
  }
  function run(k){ for(let i = 0; i < k; i++) shuffleOnce(); draw(); }
  function reset(){ nullStats = []; atLeast = 0; draw(); }
  function draw(){
    clearBg(L.ctx, L.W, L.H);
    const ctx = L.ctx, ff = getComputedStyle(document.body).fontFamily;
    const px = 40, pw = L.W - 80, B = 41;
    const lo = -2.2, hi = 2.2;   // symmetric window covering the null spread
    // histogram of null differences
    const counts = Array(B).fill(0);
    for(const d of nullStats){
      const b = Math.floor((d - lo) / (hi - lo) * B);
      if(b >= 0 && b < B) counts[b]++;
    }
    ctx.fillStyle = '#8b93b8'; ctx.font = '700 12px ' + ff;
    ctx.fillText('Null distribution — differences from ' + nullStats.length + ' shuffled worlds (H₀: label doesn’t matter)', px, 22);
    // color bins in the extreme tail (>= OBS) differently
    const obsBin = Math.floor((OBS - lo) / (hi - lo) * B);
    const h = histo(ctx, px, 40, pw, 300, counts,
      {lo, hi, colorOf:(i)=> i >= obsBin ? 'rgba(255,92,122,.75)' : 'rgba(0,212,255,.5)'});
    // zero line (null centre)
    vline(ctx, h.toX(0), 40, 356, 'rgba(255,255,255,.35)', [4,4]);
    ctx.fillStyle = '#8b93b8'; ctx.font = '600 11px ' + ff;
    ctx.textAlign = 'center'; ctx.fillText('0', h.toX(0), 372);
    // observed statistic line
    vline(ctx, h.toX(OBS), 30, 356, 'rgba(255,201,77,.95)');
    ctx.fillStyle = '#ffc94d'; ctx.font = '800 12px ' + ff;
    ctx.fillText('observed', h.toX(OBS), 26);
    ctx.font = '600 11px ' + ff;
    ctx.fillText('Δ = ' + OBS.toFixed(2), h.toX(OBS), 372);
    ctx.textAlign = 'left';
    const count = nullStats.length;
    const p = count ? atLeast / count : 0;
    L.readout.innerHTML =
      'observed Δ (treat − control) = <b style="color:#ffc94d">' + OBS.toFixed(3) + '</b>' +
      '<br>shuffles = ' + count +
      '<br>shuffles with Δ ≥ observed = ' + atLeast +
      '<br><b>p-value ≈ ' + (count ? p.toFixed(3) : '—') + '</b>' +
        ' <span style="color:#ff5c7a">(red tail ÷ all)</span>' +
      '<br><span style="font-size:11px;color:#8b93b8">= P(Δ ≥ observed | H₀), one-sided</span>';
    m.update({count, p, nullMean: count ? mean(nullStats) : 0});
  }
  chips(L.ctrl, 'SHUFFLE LABELS (build the null world)',
    ['+1', '+100', '+1000'], (i)=>run([1,100,1000][i]));
  const d = document.createElement('div'); d.className = 'ctrl';
  const rb = document.createElement('button'); rb.className = 'chip';
  rb.textContent = '↺ Clear'; rb.onclick = reset;
  d.appendChild(rb); L.ctrl.appendChild(d);
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The experiment is fixed: 12 treated vs 12 control outcomes, observed gap <b style="color:#ffc94d">Δ ≈ ' + OBS.toFixed(2) + '</b>. Each shuffle randomly reassigns who was “treated” and recomputes the gap — building the world where the label is meaningless. The <b style="color:#ff5c7a">red tail</b> (Δ ≥ observed) divided by the total is the p-value: how often blind shuffling matches or beats your real result.</div>';
  L.ctrl.appendChild(note);
  draw();
};
