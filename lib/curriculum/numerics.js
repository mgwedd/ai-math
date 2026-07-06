/* ================================================================
   WORLD 4 — NUMERICAL COMPUTING FOR ML.
   Two depth lessons on the arithmetic that makes (or breaks) ML code:
     A · Floating Point & Log-Sum-Exp (order 110)
         softmax overflow, shift invariance, stable cross-entropy
     B · Conditioning & Stability — "solve, don't invert" (order 111)
         condition numbers, solve vs invert, classifying conditioning
   Append at the END of World 4 (order 110/111 > ml-classification 22
   and ml-trees-eval 102). Same registries as every other module.

   IMPORTANT: Unicode symbols are fine inside string CONTENT, but
   all JS string DELIMITERS are ASCII ' or ` — smart quotes as
   delimiters break the ESM + SWC build.
   ================================================================ */
import { LESSONS, INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, slider, chips, plane, clearBg, fmt2, registerCleanup } from '../engine.js';

/* ================== A · FLOATING POINT & LOG-SUM-EXP ================== */

registerLesson({
  id:'num-logsumexp', world:'ml', order:110, emoji:'🌡️',
  title:'Floating Point & Log-Sum-Exp',
  sub:'Why naive softmax explodes — and one cheap trick that fixes it forever.',
  learn:`<p>Every number in a neural network is stored as a 64-bit (or 32-bit) <strong>floating-point</strong> approximation. The format keeps a fixed number of <em>significant digits</em> (the mantissa) and a separate exponent, so it can represent quantities from ~10<sup>−308</sup> to ~10<sup>308</sup>. Anything bigger returns <code>Infinity</code>; arithmetic involving <code>Infinity</code> or <code>0/0</code> yields <code>NaN</code>. These are not errors you can catch — they silently propagate and corrupt every downstream computation.</p>
  <p>The danger is acute in <strong>softmax</strong>, the function that turns a vector of raw scores (logits) z into a probability distribution:</p>
  <div class="formula">softmax(z)<sub>i</sub> = exp(z<sub>i</sub>) / Σ<sub>j</sub> exp(z<sub>j</sub>)</div>
  <p>If any logit exceeds ~88 (in float32) or ~709 (float64), <code>exp(z<sub>i</sub>)</code> overflows to <code>Infinity</code>, the denominator becomes <code>Infinity</code>, and every probability becomes <code>NaN</code>. Modern language models routinely produce logits in the hundreds.</p>
  <p>The fix costs nothing arithmetically: subtract the maximum logit from every entry before exponentiating. Call <strong>c = max(z)</strong>, then:</p>
  <div class="formula">softmax(z)<sub>i</sub> = exp(z<sub>i</sub> − c) / Σ<sub>j</sub> exp(z<sub>j</sub> − c)</div>
  <p>This is <strong>exactly the same probability</strong> — the constant c cancels in the ratio — but now the largest shifted logit is 0 and all exp values are ≤ 1, safely in range. This is the "subtract-max" stabilisation, the first half of the <strong>log-sum-exp</strong> trick.</p>
  <p>The second half handles the loss. Cross-entropy for the correct class k is −log(softmax(z)<sub>k</sub>). Expanding that log:</p>
  <div class="formula">CE = −z<sub>k</sub> + log Σ<sub>j</sub> exp(z<sub>j</sub>)  =  −z<sub>k</sub> + LSE(z)</div>
  <p>where <strong>LSE(z) = c + log Σ<sub>j</sub> exp(z<sub>j</sub> − c)</strong> is the log-sum-exp with max-subtraction baked in. The naive route — compute softmax, then take log — can overflow AND then underflow (log of a tiny float32 probability can hit −∞). The stable CE path skips the intermediate probability entirely and stays finite for any logit magnitude.</p>`,
  ml:`Softmax and cross-entropy are in every classification network. PyTorch's <code>F.cross_entropy</code> and TensorFlow's <code>softmax_cross_entropy_with_logits</code> both implement the stable LSE path internally — they accept raw logits, not probabilities, precisely to avoid the overflow/underflow cycle. Understanding <em>why</em> that API contract exists is the difference between writing bug-free loss functions and chasing mysterious <code>NaN</code> gradients. The same LSE trick appears in HMMs (forward–backward), VAEs (ELBO), and any computation that sums tiny exponentials over a large vocabulary.`,
  deeper:[
    {title:'😵 Stuck? Why c cancels', body:'The ratio exp(zi − c) / Σ exp(zj − c) is the same as exp(zi)/exp(c) ÷ Σ(exp(zj)/exp(c)) = exp(zi) / Σ exp(zj). The exp(c) terms appear in both numerator and denominator and divide out exactly. So subtracting c is a free operation on the output; it only costs safety.'},
    {title:'🚀 Go deeper: LSE as a smooth max', body:'log Σ exp(z<sub>j</sub>) is sometimes written LSE(z) or "soft-max" in the mathematical sense — it approximates max(z) from above (LSE ≥ max always) and the gap shrinks as one logit dominates. The gradient of LSE w.r.t. z<sub>i</sub> is exactly softmax(z)<sub>i</sub> — the probability! This is why cross-entropy gradients are so clean and why log-sum-exp appears in free-energy calculations in physics (Helmholtz) and in the partition function of any Gibbs distribution. Reference: Goodfellow, Bengio, Courville, <em>Deep Learning</em>, §4.1.'},
  ],
  labs:[
    {key:'num-softmax-overflow', title:'Softmax overflow explorer',
     intro:'<p>Drag the <b>logit magnitude</b> slider to push the logits into overflow territory. Watch the naive softmax produce <code>Inf</code> and <code>NaN</code>, while the <b style="color:#2dd4a0">stabilised</b> version stays correct. The probabilities computed by both methods should be identical when numerics are healthy — and the stabilised path is <em>always</em> healthy.</p>',
     interactive:'num-softmax-overflow'},
    {key:'num-shift-invariance', title:'Shift-invariance: why subtract-max is free',
     intro:'<p>Predict what happens to the softmax probabilities when you shift every logit by a constant c — do they change? Commit your prediction, then sweep the shift slider and watch. This is the core theorem that makes the stabilisation valid.</p>',
     interactive:'num-shift-invariance'},
    {key:'num-stable-ce', title:'Stable cross-entropy via LSE',
     intro:'<p>A single correct logit z<sub>k</sub> and a large "distractor" logit z<sub>bad</sub>. Watch the naive CE (compute softmax first, then log) overflow when z<sub>bad</sub> is large, while the <b style="color:#2dd4a0">stable CE = LSE(z) − z<sub>k</sub></b> stays finite and exactly correct throughout.</p>',
     interactive:'num-stable-ce'},
  ],
  quiz:[
    {q:'Naive softmax overflows when logit values are large because…',
     opts:['exp(z<sub>i</sub>) returns Infinity for z<sub>i</sub> > ~709 in float64 (or ~88 in float32), poisoning the sum',
           'the denominator can never be larger than 1',
           'softmax was only defined for negative logits',
           'floating-point numbers have no upper bound'],
     a:0, tag:'float overflow', focus:'Floating-point exp overflows to Infinity beyond ~709 (float64); any logit that large breaks naive softmax.',
     why:'Floating-point representable numbers have a finite maximum (~10^308 for float64). exp(x) hits that ceiling near x ≈ 709 for float64 (or x ≈ 88 for float32). Once any exp value is Infinity, the sum is Infinity, and every probability becomes 0/∞ = 0 or ∞/∞ = NaN.',
     wrong:{1:'The denominator is a sum of exponentials — it can easily be astronomically large; there is no upper-bound constraint forcing it below 1.',
            2:'Softmax is defined for any real-valued logit vector; large positive values are common in trained networks.',
            3:'Floating-point numbers have a finite maximum (~1.8×10^308). Overflow is exactly the issue — the format is bounded.'}},
    {q:'The stabilised softmax subtracts c = max(z) from every logit first. The output probabilities compared to naive softmax are…',
     opts:['Exactly equal — c cancels in the ratio exp(z<sub>i</sub>−c)/Σexp(z<sub>j</sub>−c)',
           'Slightly different due to rounding errors',
           'Larger because the logits are smaller',
           'Undefined when c = 0'],
     a:0, tag:'shift invariance', focus:'Subtracting c is algebraically exact; it cancels in numerator and denominator, leaving probabilities unchanged.',
     why:'exp(zi − c)/Σ exp(zj − c) = [exp(zi)/exp(c)] / [Σ exp(zj)/exp(c)]. The exp(c) factor appears in both and cancels. The result is algebraically identical to exp(zi)/Σ exp(zj). No approximation is involved.',
     wrong:{1:'The cancellation is exact, not approximate. The stabilised version can even be more accurate because it avoids large-number arithmetic that would amplify rounding.',
            2:'The probabilities are ratios. A smaller numerator and a proportionally smaller denominator leave the ratio unchanged.',
            3:'c = 0 means max(z) = 0, i.e. all logits are non-positive. That is fine and produces the same probabilities.'}},
    {q:'Stable cross-entropy avoids taking log(softmax(z)) because…',
     opts:['That route can both overflow (in exp) and underflow (log of a tiny probability → −∞); LSE(z) − z<sub>k</sub> is numerically safe',
           'Cross-entropy is only defined for integers',
           'Logarithms are not computable in floating point',
           'The probabilities from softmax are always exactly 0 or 1'],
     a:0, tag:'stable cross-entropy', focus:'Compute CE = LSE(z) − z_k directly from logits to avoid overflow in exp and underflow in log simultaneously.',
     why:'The two-step route computes exp (which may overflow), forms probabilities (which may be tiny float denormals), then takes log (which may return −Inf for a tiny but nonzero float). The direct route CE = LSE(z) − zk avoids both: LSE is numerically stable, and zk is just a raw logit.',
     wrong:{1:'Cross-entropy takes a real-valued probability distribution as input; it is well-defined for any probabilities in (0,1].',
            2:'Logarithms are a standard floating-point operation (IEEE 754 specifies log). The problem is the INPUT to log being too small or zero.',
            3:'Softmax outputs are strictly between 0 and 1 (never exactly 0 or 1 for finite logits), but they can be astronomically close to 0 in float32, sending log to −Inf.'}},
    {type:'numeric',
     q:'For z = [3, 3, 3], what does the stabilised softmax give for each of the 3 probabilities? (Enter as a decimal, e.g. 0.33)',
     answer:0.333, tol:0.002,
     tag:'uniform logits → uniform softmax',
     hint:'Subtract max(z)=3 from each logit to get [0,0,0]. Then exp([0,0,0]) = [1,1,1], sum = 3. Each probability = 1/3 ≈ 0.333.',
     why:'After subtracting the max (3), all shifted logits are 0. exp(0) = 1 for all three, sum = 3. Each probability = 1/3 ≈ 0.333. Uniform logits produce uniform probabilities — a basic sanity check.'},
    {type:'order',
     q:'Arrange these steps for computing numerically stable cross-entropy CE = −log softmax(z)<sub>k</sub> from logits z and correct class k:',
     tag:'LSE cross-entropy recipe',
     steps:[
       'Compute c = max(z) to find the shift constant.',
       'Compute shifted logits: z′<sub>j</sub> = z<sub>j</sub> − c for each j.',
       'Compute LSE(z) = c + log Σ<sub>j</sub> exp(z′<sub>j</sub>).',
       'Return CE = LSE(z) − z<sub>k</sub>.',
     ],
     why:'The stable recipe: subtract max to keep exps in range, compute the log-sum-exp with the shift baked in, then subtract the correct logit. The result equals −log softmax(z)_k but never overflows or underflows.'},
  ],
});

/* ---------- Lab A1 — Softmax overflow explorer ---------- */
INTERACTIVES['num-softmax-overflow'] = function(stage, api){
  const L = makeLab(stage, {h:440});
  let mag = 2;   // logit magnitude — logits will be [mag, mag*0.5, -mag*0.3]
  const m = api.missions([
    {text:'Push the magnitude above 200 — watch naive softmax produce <b>NaN/Inf</b> while stabilised stays clean', xp:25,
      check:s => s.naiveNaN && s.stableOk},
    {text:'Return to a safe range (mag &lt; 50) and confirm both methods agree to 4 decimal places', xp:20,
      check:s => s.mag < 50 && s.maxDiff < 0.0001 && s.stableOk},
    {text:'Find the <b>exact overflow boundary</b>: the lowest integer magnitude where naive softmax breaks (NaN appears)', xp:20,
      check:s => s.naiveNaN && s.mag < 800 && s.mag > 700},
  ]);
  function naiveSoftmax(z) {
    const exps = z.map(v => Math.exp(v));
    const sum = exps.reduce((a,b) => a+b, 0);
    return exps.map(v => v/sum);
  }
  function stableSoftmax(z) {
    const c = Math.max(...z);
    const exps = z.map(v => Math.exp(v - c));
    const sum = exps.reduce((a,b) => a+b, 0);
    return exps.map(v => v/sum);
  }
  function draw() {
    clearBg(L.ctx, L.W, L.H);
    const z = [mag, mag*0.5, -mag*0.3];
    const naive = naiveSoftmax(z);
    const stable = stableSoftmax(z);
    const naiveNaN = naive.some(v => !isFinite(v) || isNaN(v));
    const stableOk = stable.every(v => isFinite(v) && !isNaN(v));
    const maxDiff = naiveNaN ? Infinity : Math.max(...naive.map((v,i) => Math.abs(v - stable[i])));
    // draw bars
    const barW = 60, gap = 40, y0 = L.H - 80, barMax = L.H - 180;
    const labels = ['z₀='+fmt2(z[0]), 'z₁='+fmt2(z[1]), 'z₂='+fmt2(z[2])];
    const colors = ['#7c5cff','#ffc94d','#ff5c7a'];
    // left group: naive; right group: stable
    const groups = [
      {label:'Naive softmax', probs:naive, ox:100},
      {label:'Stabilised softmax', probs:stable, ox:100 + 3*(barW+gap) + 60},
    ];
    L.ctx.font = '700 13px sans-serif'; L.ctx.textAlign = 'center';
    groups.forEach(g => {
      L.ctx.fillStyle = 'rgba(255,255,255,.12)';
      L.ctx.fillRect(g.ox - 10, 60, 3*(barW+gap) + 10, L.H - 100);
      L.ctx.fillStyle = '#aeb6e0'; L.ctx.font = '700 13px sans-serif';
      L.ctx.fillText(g.label, g.ox + (3*(barW+gap))/2 - 10, 48);
      g.probs.forEach((p, i) => {
        const x = g.ox + i*(barW + gap);
        const val = isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
        const h = val * (y0 - 80);
        const bad = !isFinite(p) || isNaN(p);
        L.ctx.fillStyle = bad ? 'rgba(255,80,80,.7)' : colors[i];
        L.ctx.fillRect(x, y0 - h, barW, h);
        L.ctx.fillStyle = bad ? '#ff8888' : colors[i];
        L.ctx.font = '600 12px sans-serif';
        L.ctx.fillText(bad ? '⚠ NaN/Inf' : fmt2(p), x + barW/2, y0 - h - 8);
        L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = '11px sans-serif';
        L.ctx.fillText(labels[i], x + barW/2, y0 + 16);
      });
    });
    // axis labels
    L.ctx.fillStyle = '#8a92c0'; L.ctx.font = '11px sans-serif'; L.ctx.textAlign = 'left';
    L.ctx.fillText('p=1.0', 10, 85); L.ctx.fillText('p=0.5', 10, (y0+85)/2); L.ctx.fillText('p=0.0', 10, y0+4);
    // dividing line
    L.ctx.strokeStyle = 'rgba(255,255,255,.12)'; L.ctx.lineWidth = 1;
    L.ctx.beginPath(); L.ctx.moveTo(L.W/2, 40); L.ctx.lineTo(L.W/2, L.H-20); L.ctx.stroke();
    const agree = !naiveNaN && maxDiff < 0.0001;
    L.readout.innerHTML = 'logits z = ['+z.map(fmt2).join(', ')+']<br>'
      + (naiveNaN ? '<b style="color:#ff8888">Naive softmax: OVERFLOW — Inf/NaN (magnitude too large!)</b>' : 'Naive softmax: OK, max diff from stable = '+maxDiff.toExponential(2))
      + '<br>Stabilised softmax: always correct, c = max(z) = '+fmt2(Math.max(...z))
      + (agree ? '<br><b style="color:#7df5c8">Both methods agree — arithmetic is healthy at this magnitude</b>' : '');
    m.update({mag, naiveNaN, stableOk, maxDiff});
  }
  slider(L.ctrl, 'logit magnitude', 1, 900, 1, 2, v => fmt2(v), v => { mag = v; draw(); });
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Logits are [mag, 0.5·mag, −0.3·mag]. Below ~709 (float64 overflow boundary) both columns agree; above it, naive softmax produces ⚠ NaN/Inf while the stabilised version (subtract max first) stays correct. The <b>probabilities should be identical when numerics are healthy</b> — they are ratios, so the shift cancels.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ---------- Lab A2 — Shift-invariance: predict-then-verify ---------- */
INTERACTIVES['num-shift-invariance'] = function(stage, api){
  const L = makeLab(stage, {h:440});
  let shift = 0;
  const baseLogits = [2.1, 0.4, -0.9];
  // build the predict gate first (before any sliders)
  const pred = api.predict({
    prompt: 'If you add a constant c = 50 to every logit in [2.1, 0.4, −0.9], the softmax probabilities will…',
    choices: [
      'Stay exactly the same — c cancels in the ratio',
      'All increase proportionally to c',
      'Become undefined (overflow)',
      'Shift toward a uniform distribution',
    ],
    answer: 0,
    reveal: 'Adding any constant c to all logits leaves the softmax <b>exactly unchanged</b> — mathematically. exp(z<sub>i</sub>+c) / Σ exp(z<sub>j</sub>+c) = exp(c)·exp(z<sub>i</sub>) / exp(c)·Σ exp(z<sub>j</sub>) = exp(z<sub>i</sub>) / Σ exp(z<sub>j</sub>). The exp(c) factors cancel. This is why the subtract-max trick is free: it is just choosing c = −max(z).',
  });
  function stableSoftmax(z) {
    const c = Math.max(...z);
    const exps = z.map(v => Math.exp(v - c));
    const s = exps.reduce((a,b) => a+b, 0);
    return exps.map(v => v/s);
  }
  function draw() {
    clearBg(L.ctx, L.W, L.H);
    const zBase = baseLogits;
    const zShifted = baseLogits.map(v => v + shift);
    const pBase = stableSoftmax(zBase);
    const pShifted = stableSoftmax(zShifted);
    const maxDiff = Math.max(...pBase.map((v,i) => Math.abs(v - pShifted[i])));
    const barW = 55, gap = 30, y0 = L.H - 80;
    const colors = ['#7c5cff','#ffc94d','#ff5c7a'];
    const groups = [
      {label:'Base logits z', probs:pBase, logits:zBase, ox:60},
      {label:'Shifted z + c', probs:pShifted, logits:zShifted, ox:60 + 3*(barW+gap) + 70},
    ];
    L.ctx.font = '700 13px sans-serif'; L.ctx.textAlign = 'center';
    groups.forEach(g => {
      L.ctx.fillStyle = 'rgba(255,255,255,.08)';
      L.ctx.fillRect(g.ox - 8, 60, 3*(barW+gap) + 10, L.H - 110);
      L.ctx.fillStyle = '#aeb6e0'; L.ctx.font = '700 13px sans-serif';
      L.ctx.fillText(g.label, g.ox + (3*(barW+gap))/2 - 10, 50);
      g.probs.forEach((p, i) => {
        const x = g.ox + i*(barW+gap);
        const h = p * (y0 - 80);
        L.ctx.fillStyle = colors[i];
        L.ctx.fillRect(x, y0 - h, barW, h);
        L.ctx.fillStyle = colors[i]; L.ctx.font = '600 11px sans-serif';
        L.ctx.fillText(fmt2(p), x + barW/2, y0 - h - 8);
        L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = '10px sans-serif';
        L.ctx.fillText('z='+fmt2(g.logits[i]), x + barW/2, y0 + 14);
      });
    });
    L.ctx.fillStyle = '#8a92c0'; L.ctx.font = '11px sans-serif'; L.ctx.textAlign = 'left';
    L.ctx.fillText('p=1.0', 8, 82); L.ctx.fillText('p=0', 8, y0+4);
    L.ctx.strokeStyle = 'rgba(255,255,255,.12)'; L.ctx.lineWidth = 1;
    L.ctx.beginPath(); L.ctx.moveTo(L.W/2, 40); L.ctx.lineTo(L.W/2, L.H-20); L.ctx.stroke();
    L.readout.innerHTML = 'shift c = '+fmt2(shift)
      + '  &nbsp;|&nbsp;  base logits: ['+zBase.map(fmt2).join(', ')+']'
      + '  &nbsp;|&nbsp;  shifted: ['+zShifted.map(fmt2).join(', ')+']'
      + '<br>max |p<sub>base</sub> − p<sub>shifted</sub>| = <b>'+(maxDiff < 1e-12 ? '0 (exact)' : maxDiff.toExponential(2))+'</b>'
      + (maxDiff < 1e-8 ? '  <b style="color:#7df5c8">Probabilities are identical — shift cancels in the ratio</b>' : '');
  }
  slider(L.ctrl, 'shift constant c', -200, 200, 1, 0, v => fmt2(v), v => { shift = v; draw(); });
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">After committing your prediction, drag the shift slider anywhere — ±200, ±50, 0. The two bar charts always show the same heights. The subtract-max stabilisation is <b>choosing c = −max(z)</b>, which brings the largest logit to 0 and all exp values into [0,1]. It is <b>not an approximation</b> — it is algebraically free.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ---------- Lab A3 — Stable cross-entropy via LSE ---------- */
INTERACTIVES['num-stable-ce'] = function(stage, api){
  const L = makeLab(stage, {h:440});
  let zk = 3.0;     // correct-class logit
  let zbad = 2.0;   // largest competitor logit
  const m = api.missions([
    {text:'Push z<sub>bad</sub> above 500 — watch naive CE break (NaN/Inf) while stable CE survives', xp:25,
      check:s => s.zbad > 500 && !isFinite(s.naiveCE) && isFinite(s.stableCE)},
    {text:'Make z<sub>k</sub> much larger than z<sub>bad</sub>: confirm stable CE ≈ 0 (near-certain prediction)', xp:20,
      check:s => s.stableCE < 0.1 && s.zk > s.zbad + 5},
    {text:'Set z<sub>k</sub> &lt; z<sub>bad</sub> by at least 3: CE should be large (model is wrong)', xp:20,
      check:s => s.stableCE > 3 && s.zbad > s.zk + 3},
  ]);
  function lse(zArr) {
    const c = Math.max(...zArr);
    return c + Math.log(zArr.reduce((s,v) => s + Math.exp(v - c), 0));
  }
  function draw() {
    clearBg(L.ctx, L.W, L.H);
    const z = [zk, zbad];
    // naive CE: softmax then log
    const expK = Math.exp(zk), expBad = Math.exp(zbad);
    const sumExp = expK + expBad;
    const pK_naive = expK / sumExp;
    const naiveCE = -Math.log(pK_naive);
    // stable CE: LSE(z) - z_k
    const stableCE = lse(z) - zk;
    const agree = Math.abs(naiveCE - stableCE) < 0.001;
    // render a bar for each, then annotations
    const cx = L.W/2;
    // draw logit positions as a small diagram
    const P = plane(L.ctx, L.W, 200, 22, cx, 110);
    L.ctx.save(); L.ctx.beginPath(); L.ctx.rect(0, 20, L.W, 180); L.ctx.clip();
    P.grid();
    P.arrow(0, 0, zk, 0, '#7c5cff', 4, 'zₖ');
    P.arrow(0, 0, zbad, 0, '#ff5c7a', 3, 'zᵇᵃᵈ');
    P.dot(zk, 0, 6, '#b9a8ff');
    P.dot(zbad, 0, 5, '#ff9db1');
    L.ctx.restore();
    // CE bars
    const y0 = L.H - 60, y1 = 240;
    const maxCE = 12;
    function ceBar(x, w, ce, label, color) {
      const bad = !isFinite(ce) || isNaN(ce);
      const h = bad ? (y0 - y1) : Math.min(1, ce / maxCE) * (y0 - y1);
      L.ctx.fillStyle = bad ? 'rgba(255,80,80,.6)' : color;
      L.ctx.fillRect(x - w/2, y0 - h, w, h);
      L.ctx.fillStyle = bad ? '#ff8888' : color; L.ctx.font = '700 13px sans-serif'; L.ctx.textAlign = 'center';
      L.ctx.fillText(bad ? '⚠ NaN/Inf' : fmt2(ce), x, y0 - h - 10);
      L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = '12px sans-serif';
      L.ctx.fillText(label, x, y0 + 18);
    }
    ceBar(cx - 80, 90, naiveCE, 'Naive CE', '#ffc94d');
    ceBar(cx + 80, 90, stableCE, 'Stable CE', '#2dd4a0');
    // CE=0 and CE=maxCE labels
    L.ctx.fillStyle = '#8a92c0'; L.ctx.font = '11px sans-serif'; L.ctx.textAlign = 'left';
    L.ctx.fillText('CE='+maxCE+'+', 12, y1 + 4);
    L.ctx.fillText('CE=0', 12, y0 + 4);
    L.readout.innerHTML = 'z<sub>k</sub> (correct) = '+fmt2(zk)+'  &nbsp; z<sub>bad</sub> (top competitor) = '+fmt2(zbad)
      + '<br>Naive CE = −log(softmax(z)<sub>k</sub>) = '+(isFinite(naiveCE) ? fmt2(naiveCE) : '<b style="color:#ff8888">NaN/Inf — overflow!</b>')
      + '<br>Stable CE = LSE(z) − z<sub>k</sub> = <b style="color:#7df5c8">'+fmt2(stableCE)+'</b>'
      + (agree ? '  <b style="color:#7df5c8">(both agree)</b>' : isFinite(naiveCE) ? '' : '  <b style="color:#ff9db1">(naive broke — stable is the truth)</b>');
    m.update({zk, zbad, naiveCE, stableCE});
  }
  slider(L.ctrl, 'zₖ (correct-class logit)', -5, 15, 0.1, 3.0, fmt2, v => { zk = v; draw(); });
  slider(L.ctrl, 'zᵇᵃᵈ (top competitor)', -5, 900, 1, 2.0, fmt2, v => { zbad = v; draw(); });
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The two bars should have equal height whenever the naive path is finite. Push z<sub>bad</sub> past ~709 and naive CE overflows while stable CE (the gold formula) stays calm. Real frameworks like PyTorch\'s <code>F.cross_entropy</code> use exactly this LSE path — they take raw logits, not probabilities, for this reason.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== B · CONDITIONING & STABILITY ================== */

registerLesson({
  id:'num-conditioning', world:'ml', order:111, emoji:'🔬',
  title:'Conditioning & Stability: Solve, Don\'t Invert',
  sub:'Why a nearly-singular matrix turns small errors into catastrophes — and why you should never form A⁻¹.',
  learn:`<p>Even with exact arithmetic, some linear systems <em>amplify</em> any error you make. The <strong>condition number</strong> κ(A) = σ<sub>max</sub>/σ<sub>min</sub> (the ratio of the largest to smallest singular value of A) quantifies this sensitivity. The key bound: if you perturb the right-hand side b by a relative error ε, the solution x can swing by as much as</p>
  <div class="formula">‖Δx‖/‖x‖  ≤  κ(A) · ‖Δb‖/‖b‖</div>
  <p>A condition number of 10<sup>6</sup> means a one-part-in-a-million rounding error in b can produce a 100% error in x. And floating-point arithmetic introduces rounding at <em>every</em> step, so a truly ill-conditioned system cannot be solved to more than a handful of correct digits no matter what algorithm you use — the information is genuinely gone.</p>
  <p>A matrix is <strong>well-conditioned</strong> when κ is small (close to 1 — σ<sub>min</sub> ≈ σ<sub>max</sub>, meaning A stretches all directions similarly). It is <strong>ill-conditioned</strong> when κ is large, meaning A nearly collapses at least one direction — it is close to singular. A truly singular matrix has σ<sub>min</sub> = 0 and κ = ∞.</p>
  <p>This matters enormously for the <strong>"solve, don't invert" principle</strong>. Forming A⁻¹ explicitly is almost always worse than solving Ax = b by factorisation (LU, QR, Cholesky). Why? Computing the inverse compounds rounding error over many arithmetic operations and produces a dense matrix whose application is a full matrix-vector multiply — slower AND less accurate. Direct solvers (e.g. Gaussian elimination with partial pivoting) achieve stability by careful pivoting strategies that keep intermediate values from blowing up.</p>
  <p>In ML, conditioning appears in three places: (1) the <strong>normal equations</strong> AᵀAx = Aᵀb for least squares — AᵀA squares the condition number, which is why QR is preferred; (2) <strong>Newton-type optimisers</strong> that need to invert or solve with the Hessian; (3) <strong>kernel matrices</strong> in GP/SVM that become ill-conditioned for certain bandwidth choices.</p>`,
  ml:`Whenever a gradient step is scaled by a curvature estimate (Adam, L-BFGS, natural gradient), the quality of that estimate depends directly on the condition number of the relevant matrix. Poorly-conditioned Hessians make Newton steps unstable. The reason Adam works so well in practice is partly that it estimates a diagonal preconditioner — a cheap stabiliser that reduces the effective condition number per-weight. Ridge regression (Tikhonov regularisation, +λI) deliberately shrinks σ<sub>min</sub> upward, bounding κ(A+λI) ≤ (σ<sub>max</sub>+λ)/λ and making the normal equations safe to solve. Understanding conditioning turns "why is my optimiser diverging?" from magic into diagnosis.`,
  deeper:[
    {title:'😵 Stuck? The geometry of a small singular value', body:'Picture a 2×2 matrix A. It takes the unit circle to an ellipse. The lengths of the ellipse axes are σ_max and σ_min (the singular values). If σ_min is near zero, the ellipse is almost a line — A nearly maps a whole direction to zero. A small change in b that points in that near-null direction produces a huge swing in x, because the solution has to reach in the nearly-collapsed direction to cancel the perturbation. That is exactly what κ = σ_max/σ_min measures.'},
    {title:'🚀 Go deeper: LU with partial pivoting vs explicit inverse', body:'LAPACK\'s dgesv (and numpy.linalg.solve, torch.linalg.solve) use LU decomposition with partial pivoting — they swap rows to keep pivot elements large, bounding the growth of intermediate values. This achieves backward stability: the computed solution is the exact solution of a slightly perturbed system. Forming A⁻¹ via the same LU costs the same FLOPS but then applying it to b costs an extra n² multiply-adds and accumulates more rounding. The rule: use linalg.solve(A, b), never linalg.inv(A) @ b. Reference: Trefethen & Bau, <em>Numerical Linear Algebra</em>, Lectures 12–16.'},
  ],
  labs:[
    {key:'num-condition-explorer', title:'Condition number explorer',
     intro:'<p>A 2×2 matrix A. Drag σ<sub>min</sub> toward zero and watch κ = σ<sub>max</sub>/σ<sub>min</sub> grow. A small perturbation Δb is added to b; the <b style="color:#ff5c7a">relative error</b> in x tracks κ — exactly as the bound predicts.</p>',
     interactive:'num-condition-explorer'},
    {key:'num-solve-vs-invert', title:'Solve vs invert: accuracy and ops',
     intro:'<p>Predict whether solving Ax = b directly (LU factorisation) or forming A⁻¹ then multiplying will be more accurate for an ill-conditioned A. Commit your prediction, then vary the condition number and compare the residuals.</p>',
     interactive:'num-solve-vs-invert'},
    {key:'num-conditioning-classify', title:'Classify the conditioning',
     intro:'<p>Given a 2×2 matrix, classify it as well-conditioned or ill-conditioned based on its singular values and condition number. Complete the missions to develop intuition for when conditioning matters.</p>',
     interactive:'num-conditioning-classify'},
  ],
  quiz:[
    {q:'The condition number κ(A) = σ<sub>max</sub>/σ<sub>min</sub> bounds the relative error amplification. If κ = 10⁶ and the relative error in b is 10⁻⁷, the relative error in x could be as large as…',
     opts:['10⁻¹ (10%) — the bound is κ · ‖Δb‖/‖b‖',
           '10⁻¹³ — errors shrink going through a linear system',
           '10⁶ — the error is exactly κ regardless of ‖Δb‖/‖b‖',
           '0 — linear systems always return exact answers'],
     a:0, tag:'condition number bound', focus:'The relative error in x is bounded by κ times the relative error in b: 10^6 · 10^{-7} = 10^{-1}.',
     why:'The perturbation bound is ‖Δx‖/‖x‖ ≤ κ(A) · ‖Δb‖/‖b‖. Substituting κ = 10^6 and ‖Δb‖/‖b‖ = 10^{-7} gives a bound of 10^{-1}. A 10^{-7} relative error in b can produce a 10% relative error in x — a million-fold amplification.',
     wrong:{1:'Errors through linear systems can grow enormously when κ is large. Only for κ ≈ 1 (well-conditioned) do input errors stay small.',
            2:'The amplification is bounded by κ TIMES the input error, not by κ alone. The output error = κ · (input error), not just κ.',
            3:'Floating-point arithmetic always introduces rounding. For an ill-conditioned system that rounding is amplified; the answer cannot be exact.'}},
    {q:'Why should you solve Ax = b with a direct solver rather than computing A⁻¹ and multiplying?',
     opts:['Forming A⁻¹ accumulates more rounding errors AND costs an extra n² multiply-add to apply; a direct solver achieves backward stability in one factorisation',
           'A⁻¹ does not exist for any square matrix',
           'Direct solvers are always slower',
           'A⁻¹ b = x is only valid when A is symmetric'],
     a:0, tag:'solve vs invert', focus:'Use linalg.solve(A, b): explicit inversion costs more flops, accumulates more rounding, and is slower to apply.',
     why:'Computing A^{-1} via LU costs the same as factorising, but then applying it to b costs an extra n² flops AND each intermediate value accumulates more rounding. Backward-stable direct solvers (LU with pivoting) solve Ax=b in one sweep, keeping arithmetic errors bounded. The inverse approach is both slower and less accurate.',
     wrong:{1:'A^{-1} exists whenever A is invertible (nonzero determinant). The objection is not existence — it is cost and stability.',
            2:'Direct solvers are typically the same FLOP count as computing the inverse, and applying a factored form (stored as triangular factors) to b is cheaper than a full dense multiply.',
            3:'The solve-vs-invert trade-off applies to all invertible matrices, not only symmetric ones. Cholesky is the symmetric-positive-definite specialist, but LU handles the general case.'}},
    {q:'The normal equations AᵀAx = Aᵀb are sometimes avoided for least squares because…',
     opts:['Forming AᵀA squares the condition number: κ(AᵀA) = κ(A)², so QR is used on A directly instead',
           'AᵀA is always singular',
           'The normal equations give a different answer than the least-squares solution',
           'AᵀA is only valid when A is square'],
     a:0, tag:'normal equations vs QR', focus:'κ(AᵀA) = κ(A)^2: squaring the condition number makes the normal equations numerically dangerous for ill-conditioned A.',
     why:'Singular values of AᵀA are σᵢ², so κ(AᵀA) = (σ_max/σ_min)² = κ(A)². A mildly ill-conditioned A (κ=10³) produces a severely ill-conditioned AᵀA (κ=10⁶). QR factors A directly without forming AᵀA and therefore works with κ(A) instead of its square.',
     wrong:{1:'AᵀA is singular only when A does not have full column rank. For well-posed problems it is invertible. The issue is conditioning, not singularity.',
            2:'They give exactly the same solution (algebraically). The issue is that the ill-conditioned AᵀA system is hard to solve ACCURATELY in finite precision.',
            3:'AᵀA is always n×n for an m×n matrix A; it is valid for tall matrices (m > n), which is the common overdetermined least-squares setting.'}},
    {type:'numeric',
     q:'A 2×2 matrix has singular values σ<sub>max</sub> = 100 and σ<sub>min</sub> = 0.01. What is its condition number κ?',
     answer:10000, tol:1,
     tag:'computing condition number',
     hint:'κ = σ_max / σ_min = 100 / 0.01 = 10,000.',
     why:'κ(A) = σ_max/σ_min = 100/0.01 = 10,000. A relative error of 10^{-4} in b could produce a 100% relative error in the solution x — this system is severely ill-conditioned.'},
    {type:'order',
     q:'Arrange the steps for diagnosing and safely solving an ill-conditioned least-squares problem Ax ≈ b (m×n, overdetermined):',
     tag:'ill-conditioned least-squares recipe',
     steps:[
       'Compute the condition number κ(A) via SVD or check the ratio of largest to smallest singular values.',
       'If κ is large, add Tikhonov regularisation: form (AᵀA + λI)x̂ = Aᵀb to bound κ((AᵀA + λI)) ≤ (σ²_max + λ)/λ.',
       'Factorize A directly using QR (not AᵀA) to keep the working condition number κ(A) instead of κ(A)².',
       'Solve the triangular system Rx̂ = Qᵀb by back-substitution; the result is the regularised least-squares solution.',
     ],
     why:'The recipe: diagnose (compute κ), regularise if needed (add λI), factorise the original A not AᵀA (to avoid squaring κ), then solve the triangular system. This is what numpy.linalg.lstsq and scipy.linalg.solve do internally.'},
  ],
});

/* ---------- Lab B1 — Condition number explorer ---------- */
INTERACTIVES['num-condition-explorer'] = function(stage, api){
  const L = makeLab(stage, {h:440});
  let sMin = 1.0;   // σ_min (draggable toward 0)
  const sMax = 5.0; // σ_max (fixed)
  let perturbLevel = 0.01; // ‖Δb‖/‖b‖
  // Simple 2×2 matrix: A = [[sMax, 0],[0, sMin]] (diagonal — clean SVD)
  // Ax = b  =>  x = [b[0]/sMax, b[1]/sMin]
  // b = [1, 1]; perturb b[1] by perturbLevel
  const m = api.missions([
    {text:'Drag σ<sub>min</sub> below 0.05 — watch κ exceed 100 and the relative error in x balloon', xp:20,
      check:s => s.kappa > 100 && s.relErrX > 0.5},
    {text:'With σ<sub>min</sub> = 0.01, confirm the relative error in x is close to the bound κ · (‖Δb‖/‖b‖)', xp:25,
      check:s => s.sMin < 0.02 && Math.abs(s.relErrX / (s.kappa * s.perturbLevel) - 1) < 0.5},
    {text:'Restore σ<sub>min</sub> = σ<sub>max</sub> = 5 (κ = 1): confirm Δx/x ≈ Δb/b (no amplification)', xp:20,
      check:s => Math.abs(s.sMin - s.sMax) < 0.1 && s.relErrX < 0.02},
  ]);
  function draw() {
    clearBg(L.ctx, L.W, L.H);
    const kappa = sMax / (sMin || 1e-9);
    const b = [1.0, 1.0];
    const db = [0.0, perturbLevel]; // perturb b[1]
    const x = [b[0]/sMax, b[1]/sMin];
    const xPerturbed = [(b[0]+db[0])/sMax, (b[1]+db[1])/sMin];
    const xNorm = Math.hypot(x[0], x[1]);
    const dxNorm = Math.hypot(xPerturbed[0]-x[0], xPerturbed[1]-x[1]);
    const relErrX = dxNorm / (xNorm || 1e-9);
    const relErrB = Math.hypot(db[0], db[1]) / Math.hypot(b[0], b[1]);
    const bound = kappa * relErrB;
    // draw the ellipse: A maps unit circle to axes of length sMax (horiz) and sMin (vert)
    const cx = L.W * 0.4, cy = L.H * 0.45;
    const scaleVis = 60;
    L.ctx.strokeStyle = 'rgba(255,201,77,0.8)'; L.ctx.lineWidth = 2.5; L.ctx.beginPath();
    for(let i = 0; i <= 100; i++) {
      const t = i/100 * Math.PI * 2;
      const ex = cx + sMax * scaleVis * Math.cos(t);
      const ey = cy - sMin * scaleVis * Math.sin(t);
      if(i===0) L.ctx.moveTo(ex, ey); else L.ctx.lineTo(ex, ey);
    }
    L.ctx.stroke();
    // unit circle (faint)
    L.ctx.strokeStyle = 'rgba(255,255,255,.15)'; L.ctx.lineWidth = 1.5; L.ctx.beginPath();
    L.ctx.arc(cx, cy, scaleVis, 0, Math.PI*2); L.ctx.stroke();
    // axis labels for ellipse
    L.ctx.fillStyle = '#ffc94d'; L.ctx.font = '11px sans-serif'; L.ctx.textAlign = 'center';
    L.ctx.fillText('σₘₐˣ = '+fmt2(sMax), cx + sMax*scaleVis + 22, cy + 14);
    L.ctx.fillStyle = sMin < 0.1 ? '#ff8888' : '#ffc94d';
    L.ctx.fillText('σₘᴦₙ = '+fmt2(sMin), cx, cy - sMin*scaleVis - 10);
    // condition-number dial (right side)
    const bx = L.W * 0.78, by = cy;
    const r = 55;
    const logK = Math.log10(Math.max(1, kappa));
    const logMax = 5;
    const angle = Math.PI * (0.2 + 0.6 * Math.min(1, logK/logMax));
    // arc background
    L.ctx.strokeStyle = 'rgba(255,255,255,.12)'; L.ctx.lineWidth = 14;
    L.ctx.beginPath(); L.ctx.arc(bx, by, r, Math.PI*1.15, Math.PI*1.85); L.ctx.stroke();
    // filled arc for κ level
    const capColor = kappa > 1000 ? '#ff5c7a' : kappa > 10 ? '#ffc94d' : '#2dd4a0';
    L.ctx.strokeStyle = capColor; L.ctx.lineWidth = 14;
    L.ctx.beginPath(); L.ctx.arc(bx, by, r, Math.PI*1.15, Math.PI*1.15 + (angle - Math.PI*0.2)/0.6 * Math.PI*0.7); L.ctx.stroke();
    L.ctx.fillStyle = capColor; L.ctx.font = '700 16px sans-serif'; L.ctx.textAlign = 'center';
    L.ctx.fillText('κ = '+(kappa > 9999 ? kappa.toExponential(1) : kappa.toFixed(0)), bx, by + 12);
    L.ctx.fillStyle = '#aeb6e0'; L.ctx.font = '11px sans-serif';
    L.ctx.fillText('condition number', bx, by + 30);
    // error comparison bar
    const barY = L.H - 80, barX = 50, barL = L.W * 0.6;
    L.ctx.fillStyle = 'rgba(255,255,255,.07)'; L.ctx.fillRect(barX, barY - 30, barL, 26);
    L.ctx.fillStyle = 'rgba(0,212,255,.5)'; L.ctx.fillRect(barX, barY - 30, relErrB/bound * barL, 26);
    L.ctx.fillStyle = Math.min(1, relErrX/bound) > 0.8 ? '#ff5c7a' : '#2dd4a0';
    L.ctx.fillRect(barX, barY - 30, Math.min(1, relErrX/bound) * barL, 12);
    L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = '11px sans-serif'; L.ctx.textAlign = 'left';
    L.ctx.fillText('‖Δb‖/‖b‖ (cyan) vs  ‖Δx‖/‖x‖ (color) vs bound κ\xb7(Δb/b) (full bar)', barX, barY + 14);
    L.readout.innerHTML = 'σ<sub>max</sub> = '+fmt2(sMax)+'  σ<sub>min</sub> = '+fmt2(sMin)+'  &nbsp; κ = '+kappa.toFixed(1)
      + '<br>‖Δb‖/‖b‖ = '+relErrB.toFixed(4)+'  &nbsp; bound = κ\xb7(Δb/b) = '+(bound > 999 ? bound.toExponential(2) : fmt2(bound))
      + '<br><b style="color:'+(relErrX > 0.5 ? '#ff8888' : '#7df5c8')+'">‖Δx‖/‖x‖ = '+(relErrX > 9 ? relErrX.toExponential(2) : fmt2(relErrX))+'</b>'
      + (relErrX > 0.5 ? '  <b style="color:#ff9db1">— solution has large relative error!</b>' : '  (within bound)');
    m.update({sMin, sMax, kappa, relErrX, relErrB, perturbLevel});
  }
  slider(L.ctrl, 'σₘᴦₙ (drag toward 0 to ill-condition A)', 0.01, 5.0, 0.01, 1.0, fmt2, v => { sMin = v; draw(); });
  slider(L.ctrl, '‖Δb‖/‖b‖ (perturbation size)', 1e-4, 0.1, 1e-4, 0.01, v => v.toExponential(1), v => { perturbLevel = v; draw(); });
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">A is diagonal with σ<sub>max</sub>=5, σ<sub>min</sub> variable. The ellipse shows how A maps the unit circle. As σ<sub>min</sub> → 0, the ellipse flattens, κ explodes, and a tiny perturbation in b produces a huge swing in x. The bound κ\xb7(Δb/b) is tight: the actual error tracks it.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ---------- Lab B2 — Solve vs Invert: predict-then-verify ---------- */
INTERACTIVES['num-solve-vs-invert'] = function(stage, api){
  const L = makeLab(stage, {h:440});
  let kappaPow = 2; // 10^kappaPow is the (approximate) condition number we engineer
  // Build an ill-conditioned A via its SVD: A = U * diag(sMax, sMin) * Vt
  // Use fixed rotation: U=Vt=rotation by 30 degrees
  const cos30 = Math.cos(Math.PI/6), sin30 = Math.sin(Math.PI/6);
  // A x = b, x_true = [1, 1]
  function buildSystem(sMin) {
    const sMax = 100;
    // A = U diag V^T where U=V = rotation by 30 deg
    // A[0][0] = c*c*sMax + s*s*sMin, etc.
    const c=cos30, s=sin30;
    const a00 = c*c*sMax + s*s*sMin;
    const a01 = c*s*(sMax - sMin);
    const a10 = c*s*(sMax - sMin);
    const a11 = s*s*sMax + c*c*sMin;
    const xT = [1.0, 1.0];
    const b0 = a00*xT[0] + a01*xT[1];
    const b1 = a10*xT[0] + a11*xT[1];
    return {a00, a01, a10, a11, b:[b0, b1], xTrue:xT, sMax, sMin, kappa:sMax/sMin};
  }
  function solveLinear(a00, a01, a10, a11, b0, b1) {
    // 2x2 Cramer's rule (exact for 2x2 — simulates direct solve)
    const det = a00*a11 - a01*a10;
    if(Math.abs(det) < 1e-15) return [NaN, NaN];
    return [(b0*a11 - b1*a01)/det, (a00*b1 - a10*b0)/det];
  }
  function invertAndMultiply(a00, a01, a10, a11, b0, b1) {
    // explicitly compute A^{-1} first, then multiply — same math, extra rounding step
    const det = a00*a11 - a01*a10;
    if(Math.abs(det) < 1e-15) return [NaN, NaN];
    const inv00 = a11/det, inv01 = -a01/det, inv10 = -a10/det, inv11 = a00/det;
    return [inv00*b0 + inv01*b1, inv10*b0 + inv11*b1];
  }
  // Build prediction gate first
  const pred = api.predict({
    prompt: 'For a well-conditioned system (small κ), do you expect the direct solve and the invert-then-multiply approaches to differ in accuracy?',
    choices: [
      'No significant difference — both will be accurate when κ is small',
      'Direct solve will always be worse',
      'Invert-then-multiply is always more accurate',
      'The approaches return completely different answers regardless of κ',
    ],
    answer: 0,
    reveal: 'For well-conditioned systems (small κ), both approaches are accurate — the condition number bounds the amplification for both. The gap opens for <b>ill-conditioned systems</b> (large κ), where explicit inversion accumulates extra rounding errors over more arithmetic operations, while a stable direct solve (LU with pivoting) achieves backward stability. Drag the slider to observe both regions.',
  });
  function draw() {
    clearBg(L.ctx, L.W, L.H);
    const sMin = Math.pow(10, -kappaPow) * 100; // sMax=100, so kappa=10^kappaPow
    const {a00, a01, a10, a11, b, xTrue, kappa} = buildSystem(sMin);
    const xSolve = solveLinear(a00, a01, a10, a11, b[0], b[1]);
    const xInvert = invertAndMultiply(a00, a01, a10, a11, b[0], b[1]);
    function residual(x) {
      const r0 = a00*x[0]+a01*x[1] - b[0];
      const r1 = a10*x[0]+a11*x[1] - b[1];
      return Math.hypot(r0, r1);
    }
    const errSolve = Math.hypot(xSolve[0]-xTrue[0], xSolve[1]-xTrue[1]) / Math.hypot(xTrue[0], xTrue[1]);
    const errInvert = Math.hypot(xInvert[0]-xTrue[0], xInvert[1]-xTrue[1]) / Math.hypot(xTrue[0], xTrue[1]);
    const resSolve = residual(xSolve);
    const resInvert = residual(xInvert);
    // draw error bars
    const bx = 80, by = L.H - 100, bw = (L.W - 160)/2 - 20, bh = L.H - 200;
    function errBar(x, err, label, color) {
      const logE = Math.max(-16, Math.log10(Math.max(1e-17, err)));
      const loLim = -17, hiLim = 1;
      const h = (logE - loLim)/(hiLim - loLim) * bh;
      L.ctx.fillStyle = color + '99'; L.ctx.fillRect(x, by - h, bw, h);
      L.ctx.strokeStyle = color; L.ctx.lineWidth = 2; L.ctx.strokeRect(x, by - h, bw, h);
      L.ctx.fillStyle = color; L.ctx.font = '700 12px sans-serif'; L.ctx.textAlign = 'center';
      L.ctx.fillText(err < 1e-14 ? '~0 (exact)' : err.toExponential(1), x + bw/2, by - h - 8);
      L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = '12px sans-serif';
      L.ctx.fillText(label, x + bw/2, by + 18);
    }
    errBar(bx, errSolve, 'Direct solve', '#2dd4a0');
    errBar(bx + bw + 40, errInvert, 'Invert then multiply', '#ff9db1');
    // log10 scale labels
    L.ctx.fillStyle = '#8a92c0'; L.ctx.font = '10px sans-serif'; L.ctx.textAlign = 'right';
    for(let e=-16; e<=0; e+=4) {
      const yPos = by - (e - (-17))/(1-(-17)) * bh;
      L.ctx.fillText('1e'+e, bx - 6, yPos + 4);
      L.ctx.strokeStyle='rgba(255,255,255,.07)'; L.ctx.lineWidth=1; L.ctx.beginPath(); L.ctx.moveTo(bx, yPos); L.ctx.lineTo(L.W-40, yPos); L.ctx.stroke();
    }
    L.ctx.fillStyle='#8a92c0'; L.ctx.font='11px sans-serif'; L.ctx.textAlign='left';
    L.ctx.fillText('relative error in x (log scale)', 20, 40);
    const better = errSolve <= errInvert ? 'Direct solve' : 'Invert+multiply';
    L.readout.innerHTML = 'κ(A) = '+kappa.toExponential(2)
      + '  &nbsp; σ<sub>min</sub> = '+sMin.toExponential(2)+'  σ<sub>max</sub> = 100'
      + '<br>Direct solve error: <b style="color:#2dd4a0">'+errSolve.toExponential(2)+'</b>  &nbsp; Invert+multiply error: <b style="color:#ff9db1">'+errInvert.toExponential(2)+'</b>'
      + '<br>Both compute the same <b>2×2 Cramer rule</b> — in real n×n systems with pivoting, direct solve is robustly more stable';
    m_slider && m_slider;
  }
  let m_slider = null;
  const ms = api.missions([
    {text:'Set κ ≈ 10⁸ (kappaPow = 8) — observe that both methods struggle (this is expected: information is genuinely lost)', xp:20,
      check:s => s.kappaPow >= 8},
    {text:'Bring κ back below 1000 (kappaPow ≤ 3): both methods recover to high accuracy', xp:20,
      check:s => s.kappaPow <= 3},
    {text:'Find the κ threshold where relative error first exceeds 1% for the invert-then-multiply path', xp:25,
      check:s => s.errInvert > 0.01},
  ]);
  function drawWithMissions() {
    clearBg(L.ctx, L.W, L.H);
    const sMin = Math.pow(10, -kappaPow) * 100;
    const {a00, a01, a10, a11, b, xTrue, kappa} = buildSystem(sMin);
    const xSolve = solveLinear(a00, a01, a10, a11, b[0], b[1]);
    const xInvert = invertAndMultiply(a00, a01, a10, a11, b[0], b[1]);
    const errSolve = Math.hypot(xSolve[0]-xTrue[0], xSolve[1]-xTrue[1]) / Math.hypot(xTrue[0], xTrue[1]);
    const errInvert = Math.hypot(xInvert[0]-xTrue[0], xInvert[1]-xTrue[1]) / Math.hypot(xTrue[0], xTrue[1]);
    const bx = 80, by = L.H - 100, bw = (L.W - 160)/2 - 20, bh = L.H - 200;
    function errBar(x, err, label, color) {
      const logE = Math.max(-16, Math.log10(Math.max(1e-17, err)));
      const loLim = -17, hiLim = 1;
      const h = (logE - loLim)/(hiLim - loLim) * bh;
      L.ctx.fillStyle = color + '99'; L.ctx.fillRect(x, by - h, bw, h);
      L.ctx.strokeStyle = color; L.ctx.lineWidth = 2; L.ctx.strokeRect(x, by - h, bw, h);
      L.ctx.fillStyle = color; L.ctx.font = '700 12px sans-serif'; L.ctx.textAlign = 'center';
      L.ctx.fillText(err < 1e-14 ? '~0 (exact)' : err.toExponential(1), x + bw/2, by - h - 8);
      L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = '12px sans-serif';
      L.ctx.fillText(label, x + bw/2, by + 18);
    }
    errBar(bx, errSolve, 'Direct solve', '#2dd4a0');
    errBar(bx + bw + 40, errInvert, 'Invert then multiply', '#ff9db1');
    L.ctx.fillStyle = '#8a92c0'; L.ctx.font = '10px sans-serif'; L.ctx.textAlign = 'right';
    for(let e=-16; e<=0; e+=4) {
      const yPos = by - (e - (-17))/(1-(-17)) * bh;
      L.ctx.fillText('1e'+e, bx - 6, yPos + 4);
      L.ctx.strokeStyle='rgba(255,255,255,.07)'; L.ctx.lineWidth=1; L.ctx.beginPath(); L.ctx.moveTo(bx, yPos); L.ctx.lineTo(L.W-40, yPos); L.ctx.stroke();
    }
    L.ctx.fillStyle = '#8a92c0'; L.ctx.font = '11px sans-serif'; L.ctx.textAlign = 'left';
    L.ctx.fillText('relative error in x (log scale)', 20, 40);
    L.readout.innerHTML = 'κ(A) ≈ 10<sup>'+kappaPow+'</sup>  &nbsp; σ<sub>min</sub> = '+sMin.toExponential(2)
      + '<br>Direct solve error: <b style="color:#2dd4a0">'+errSolve.toExponential(2)+'</b>  &nbsp; Invert+multiply error: <b style="color:#ff9db1">'+errInvert.toExponential(2)+'</b>'
      + (errInvert > errSolve * 10 ? '<br><b style="color:#ff9db1">Invert-then-multiply is measurably less accurate at this κ</b>' : '<br>Both similar — both need κ · machine ε headroom to differ');
    ms.update({kappaPow, errSolve, errInvert});
  }
  slider(L.ctrl, 'log₁₀(κ) — condition number exponent', 1, 15, 0.5, 2, v => '10^'+v.toFixed(1), v => { kappaPow = v; drawWithMissions(); });
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">For this 2×2 system Cramer\'s rule is the same computation for both methods; the difference is small. In real n×n systems, LU with partial pivoting achieves <b>backward stability</b> — the computed answer is the exact solution to a nearby problem — while explicit inversion compounds rounding across many more operations. Always use <code>linalg.solve(A, b)</code>.</div>';
  L.ctrl.appendChild(note);
  drawWithMissions();
};

/* ---------- Lab B3 — Classify the conditioning ---------- */
INTERACTIVES['num-conditioning-classify'] = function(stage, api){
  const L = makeLab(stage, {h:440});
  // A library of 2×2 matrices with known conditioning
  const matrices = [
    {label:'Identity I', a:[[1,0],[0,1]], sMax:1, sMin:1},
    {label:'Rotation 30°', a:[[Math.cos(Math.PI/6),-Math.sin(Math.PI/6)],[Math.sin(Math.PI/6),Math.cos(Math.PI/6)]], sMax:1, sMin:1},
    {label:'Scaling [100, 0.01]', a:[[100,0],[0,0.01]], sMax:100, sMin:0.01},
    {label:'Nearly singular', a:[[1,1-1e-4],[1,1]], sMax:null, sMin:null},
    {label:'Well-cond. ([[3,1],[0,2]])', a:[[3,1],[0,2]], sMax:null, sMin:null},
    {label:'Hilbert 2×2', a:[[1, 1/2],[1/2, 1/3]], sMax:null, sMin:null},
  ];
  // Compute singular values for 2×2: σ = sqrt(eigenvalues of AᵀA)
  function singularValues(a) {
    const A = a;
    const A00=A[0][0], A01=A[0][1], A10=A[1][0], A11=A[1][1];
    // AᵀA
    const B00=A00*A00+A10*A10, B01=A00*A01+A10*A11, B11=A01*A01+A11*A11;
    // eigenvalues of symmetric B via quadratic formula
    const tr = B00+B11, det = B00*B11 - B01*B01;
    const disc = Math.sqrt(Math.max(0, tr*tr/4 - det));
    const l1 = tr/2 + disc, l2 = tr/2 - disc;
    return [Math.sqrt(Math.max(0, l1)), Math.sqrt(Math.max(0, l2))];
  }
  // Fill in sMax/sMin for matrices that need it
  matrices.forEach(m => {
    if(m.sMax === null) {
      const sv = singularValues(m.a);
      m.sMax = Math.max(sv[0], sv[1]);
      m.sMin = Math.min(sv[0], sv[1]);
    }
  });
  let mi = 0; // current matrix index
  const missions = api.missions([
    {text:'Find a matrix with κ &lt; 2 (well-conditioned) and a matrix with κ &gt; 1000 (ill-conditioned)', xp:20,
      check:s => s.seenWell && s.seenIll},
    {text:'Select the <b>Hilbert 2×2</b> matrix and observe its condition number — it grows rapidly with size', xp:20,
      check:s => s.mi === 5},
    {text:'For the <b>scaling [100, 0.01]</b> matrix, confirm κ = σ<sub>max</sub>/σ<sub>min</sub> = 10,000', xp:25,
      check:s => s.mi === 2 && Math.abs(s.kappa - 10000) < 1},
  ]);
  let seenWell = false, seenIll = false;
  function draw() {
    clearBg(L.ctx, L.W, L.H);
    const mat = matrices[mi];
    const kappa = mat.sMax / (mat.sMin || 1e-12);
    if(kappa < 2) seenWell = true;
    if(kappa > 1000) seenIll = true;
    // draw the matrix as text
    const mx = L.W*0.15, my = 100;
    L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = '700 16px sans-serif'; L.ctx.textAlign = 'center';
    L.ctx.fillText('A = ' + mat.label, L.W/2, 55);
    L.ctx.font = '700 20px var(--mono, monospace)';
    const a = mat.a;
    const rows = ['[ '+a[0].map(v=>v.toFixed(3)).join('  ')+ ' ]',
                  '[ '+a[1].map(v=>v.toFixed(3)).join('  ')+ ' ]'];
    L.ctx.fillStyle = '#b9a8ff';
    rows.forEach((r,i) => L.ctx.fillText(r, L.W/2, 95 + i*32));
    // ellipse diagram
    const cx = L.W*0.38, cy = L.H*0.57;
    const scl = 55;
    const maxSVis = Math.min(3.5, mat.sMax);
    const minSVis = Math.max(0.03, mat.sMin);
    L.ctx.strokeStyle = 'rgba(255,201,77,0.85)'; L.ctx.lineWidth = 2.5; L.ctx.beginPath();
    for(let i=0; i<=100; i++) {
      const t = i/100*Math.PI*2;
      const ex = cx + maxSVis*scl*Math.cos(t);
      const ey = cy - minSVis*scl*Math.sin(t);
      if(i===0) L.ctx.moveTo(ex, ey); else L.ctx.lineTo(ex, ey);
    }
    L.ctx.stroke();
    L.ctx.strokeStyle='rgba(255,255,255,.12)'; L.ctx.lineWidth=1; L.ctx.beginPath();
    L.ctx.arc(cx, cy, scl, 0, Math.PI*2); L.ctx.stroke();
    L.ctx.fillStyle='#ffc94d'; L.ctx.font='11px sans-serif'; L.ctx.textAlign='center';
    L.ctx.fillText('σₘₐˣ = '+mat.sMax.toFixed(3), cx, cy - minSVis*scl - 12);
    L.ctx.fillText('σₘᴦₙ = '+mat.sMin.toFixed(4), cx + maxSVis*scl + 30, cy + 6);
    // condition number display (right panel)
    const px = L.W*0.72, py = L.H*0.54;
    const isWell = kappa < 10, isIll = kappa > 1000;
    const color = isWell ? '#2dd4a0' : isIll ? '#ff5c7a' : '#ffc94d';
    L.ctx.fillStyle = color; L.ctx.font = '700 22px sans-serif'; L.ctx.textAlign = 'center';
    L.ctx.fillText('κ = '+(kappa > 9999 ? kappa.toExponential(2) : kappa.toFixed(1)), px, py);
    L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = '13px sans-serif';
    L.ctx.fillText(isWell ? 'WELL-CONDITIONED' : isIll ? 'ILL-CONDITIONED' : 'MODERATE', px, py + 24);
    // ridge regularisation preview
    const lambda = 0.5;
    const kappaReg = (mat.sMax + lambda) / (mat.sMin + lambda);
    L.ctx.fillStyle = '#aeb6e0'; L.ctx.font = '12px sans-serif';
    L.ctx.fillText('With +λI (λ='+lambda+'): κ→ '+(kappaReg > 9999 ? kappaReg.toExponential(2) : kappaReg.toFixed(1)), px, py + 50);
    L.readout.innerHTML = mat.label + '<br>'
      + 'σ<sub>max</sub> = '+mat.sMax.toFixed(4)+'  σ<sub>min</sub> = '+mat.sMin.toFixed(4)+'  κ = <b>'+kappa.toFixed(1)+'</b>'
      + '<br>' + (isWell ? '<b style="color:#7df5c8">Well-conditioned (κ < 10): small errors stay small</b>'
                 : isIll ? '<b style="color:#ff9db1">Ill-conditioned (κ > 1000): errors amplified by up to '+kappa.toExponential(1)+'×</b>'
                 : 'Moderate conditioning (κ = '+kappa.toFixed(0)+')')
      + '<br>Ridge (+λI, λ=0.5) reduces κ to '+kappaReg.toFixed(1);
    missions.update({mi, kappa, seenWell, seenIll});
  }
  // chip buttons for matrix selection
  chips(L.ctrl, 'SELECT MATRIX', matrices.map(m => m.label), (i, btn, row) => {
    mi = i;
    [...row.children].forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    draw();
  }).children[0].classList.add('on');
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Click each matrix to see its ellipse (image of the unit circle) and condition number. A nearly-circular ellipse means κ ≈ 1 (well-conditioned); a flat line means κ ≫ 1 (ill-conditioned). The Hilbert matrix is the classic numerical-analysis warning: even the 2\xd72 version is already ill-conditioned; by 10\xd710 it is hopeless without regularisation.</div>';
  L.ctrl.appendChild(note);
  draw();
};
