/* ================================================================
   WORLD 3 -- PROBABILITY & STATISTICS · INFORMATION THEORY ADD-ON
   Two lessons that close out World 3 and bridge to World 4:

     Lesson A  (order 110) -- Cross-Entropy = NLL = KL + Entropy
     Lesson B  (order 111) -- Mutual Information

   Prerequisite vocabulary (entropy, KL, bits) is established in the
   existing prob-entropy lesson (prob.js) -- these lessons build on
   it without re-defining anything.

   Log base: natural log (nats) inside all computation; results are
   DISPLAYED in bits (divide by ln 2) so numbers match the prior
   lessons.  All formulas in the learn text state the base convention.
   ================================================================ */
import { INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, slider, chips, clearBg } from '../engine.js';

/* ---------- shared tiny helpers ---------- */
const LN2 = Math.LN2;
const EPS  = 1e-12;
// Shannon entropy in bits (natural-log base, then /ln2)
function entropy(p){
  let h = 0;
  for(const pi of p) if(pi > EPS) h -= pi * Math.log(pi);
  return h / LN2;
}
// KL(p || q) in bits
function kl(p, q){
  let d = 0;
  for(let i = 0; i < p.length; i++){
    if(p[i] > EPS) d += p[i] * Math.log(p[i] / Math.max(q[i], EPS));
  }
  return d / LN2;
}
// Cross-entropy H(p, q) in bits
function crossEnt(p, q){
  let c = 0;
  for(let i = 0; i < p.length; i++){
    if(p[i] > EPS) c -= p[i] * Math.log(Math.max(q[i], EPS));
  }
  return c / LN2;
}
// Normalize a raw-weight array (add EPS floor so no zeros)
function norm(w){
  const s = w.reduce((a, b) => a + b, 0) || 1;
  return w.map(x => Math.max(x, EPS) / s);
}

/* ================================================================
   LESSON A -- Cross-Entropy = NLL = KL + Entropy
   ================================================================ */

registerLesson({
  id:'info-ce', world:'prob', order:110, emoji:'⚖️',
  title:'Cross-Entropy = NLL = KL + H',
  sub:'The loss every LLM and classifier minimizes -- and why bottoming out at H(p) is the best you can do.',

  learn:`<p>The previous lesson established <strong>entropy</strong> H(p) and <strong>KL divergence</strong> KL(p&nbsp;&#x2016;&nbsp;q). Now combine them. The <strong>cross-entropy</strong> H(p, q) measures the average number of bits you need per outcome when the true distribution is <strong>p</strong> but you encode using <strong>q</strong>:</p>
<div class="formula">$$H(p, q) = -\\sum p_i \\log q_i \\quad \\text{(bits: use } \\log_2 \\text{; nats: use } \\ln\\text{)}$$</div>
<p>This decomposes <em>exactly</em> as:</p>
<div class="formula">$$H(p, q) = H(p) + KL(p \\, \\| \\, q)$$</div>
<p>Since H(p) -- the data distribution's own entropy -- does not depend on your model, <strong>minimizing H(p, q) over q is identical to minimizing KL(p&nbsp;&#x2016;&nbsp;q)</strong>. The best q can ever achieve is H(p, q)&nbsp;=&nbsp;H(p), which occurs when q&nbsp;=&nbsp;p. Cross-entropy cannot be pushed to zero; it bottoms out at H(p), the irreducible uncertainty of the data itself.</p>
<p><strong>Negative log-likelihood (NLL) is the same thing.</strong> Given a labeled batch {(x<sub>1</sub>,y<sub>1</sub>),&nbsp;&hellip;}, the per-example NLL is &minus;log&nbsp;q(y<sub>i</sub>). Averaging over the empirical label frequencies (the sample distribution p&#x0302;) recovers exactly H(p&#x0302;,&nbsp;q) -- so "minimize NLL" = "minimize cross-entropy" = "minimize KL to the data."</p>
<p>All logarithms here can be taken in any base; the convention is stated once and held throughout. This curriculum uses <strong>bits (log base&nbsp;2)</strong> so the numbers match the entropy lesson. Research code typically uses <strong>nats (natural log)</strong> -- only the scale changes, not the argmin.</p>`,

  ml:`<strong>Every deep classifier and every LLM is trained by minimizing cross-entropy.</strong> PyTorch's <code>nn.CrossEntropyLoss</code>, TensorFlow's <code>sparse_categorical_crossentropy</code>, GPT's next-token NLL objective -- all are H(p,q) with p the one-hot truth. Because H(p) is a constant of the dataset, the gradient touches only the KL term: training shrinks the model's divergence from reality one step at a time. When a loss curve plateaus, it has reached (or nearly reached) H(p) -- the irreducible floor. Understanding this identity is the single most clarifying fact about why the loss function you use is the right one.`,

  deeper:[
    {title:'😵 Stuck? One formula, three names', body:'H(p,q) = H(p) + KL(p&nbsp;&#x2016;&nbsp;q) is purely algebra. Expand the KL definition: KL = &Sigma; p log(p/q) = &Sigma; p log p &minus; &Sigma; p log q = &minus;H(p) &minus; &Sigma; p log q. Rearrange and you get H(p,q) = &Sigma; &minus;p log q = H(p) + KL. Three names for the same quantity in three contexts: compression theory (cross-entropy), ML loss (NLL), and information geometry (KL + offset).'},
    {title:'🚀 Go deeper: why the floor is H(p), not 0', body:'An encoding must use at least H(p) bits per symbol (Shannon\'s source coding theorem). So H(p,q) = H(p) + KL, and KL >= 0 (Gibbs\' inequality), guarantees H(p,q) >= H(p). No model, however good, gets the loss below the data entropy. In practice, if your training loss plateaus well above H(p), the model has not yet closed the gap; if it reaches H(p), it has learned everything learnable from the label distribution.'},
    {title:'🚀 Go deeper: Cover & Thomas reference', body:'The decomposition H(p,q) = H(p) + KL(p&nbsp;&#x2016;&nbsp;q) and Shannon\'s source coding theorem are developed formally in <em>Cover &amp; Thomas, Elements of Information Theory (2nd ed.), chapters 2--5</em>. The book also proves that KL >= 0 (Gibbs\' inequality) via Jensen\'s inequality applied to the concave log function -- the same Jensen inequality that appeared in the expectation lesson.'},
  ],

  labs:[
    {interactive:'infoce-decomp', title:'Decomposition explorer',
     intro:'<p>Fix the true distribution <b>p</b> with the sliders, then drag <b>q</b> with the chips. Watch H(p,&nbsp;q) split cleanly into the fixed H(p) (grey) plus the shrinking KL(p&nbsp;&#x2016;&nbsp;q) (colored). Confirm the floor: no matter how cleverly you choose q, the bar never falls below H(p).</p>'},
    {interactive:'infoce-nll', title:'NLL = cross-entropy on a batch',
     intro:'<p>Three labeled examples with known true labels. Commit a prediction about what average NLL the model will produce, then adjust the model&rsquo;s output probabilities and verify that NLL equals H(p,&nbsp;q) to the decimal.</p>'},
    {interactive:'infoce-temp', title:'Temperature & confidence',
     intro:'<p>A model outputs raw logits. Temperature T scales them before softmax: low T sharpens the distribution toward the argmax, high T flattens it toward uniform. See how CE reacts as you simultaneously tune T and the correctness of the top prediction.</p>'},
  ],

  quiz:[
    {q:'Cross-entropy H(p, q) decomposes as…',
     opts:['H(p) + KL(p‖q)', 'KL(p‖q) − H(p)', 'H(q) + KL(q‖p)', 'H(p) × KL(p‖q)'],
     a:0, tag:'ce decomposition',
     focus:'Expand KL = Σ p log(p/q) and rearrange; the H(p) term separates from the Σ −p log q term.',
     why:'Algebra: −Σ p log q = −Σ p log p + Σ p log(p/q) = H(p) + KL(p‖q). The decomposition is exact.',
     wrong:{1:'It is H(p) PLUS KL, not minus. KL is the extra cost on top of H(p) -- it can only add to the floor.',2:'The formula weights by p (the truth), not q. KL(q‖p) penalizes a different mismatch and is not what training minimizes.',3:'Cross-entropy is a sum (bits add); probabilities multiply. H \xd7 KL has no probabilistic meaning.'}},
    {q:'Minimizing cross-entropy H(p, q) over the model q is equivalent to…',
     opts:['Minimizing KL(p‖q) -- H(p) is a constant of the dataset',
           'Minimizing H(p)',
           'Maximizing H(q)',
           'Setting q = uniform'],
     a:0, tag:'what training actually minimizes',
     focus:'H(p) does not depend on q; only KL(p‖q) does. Gradient descent touches only that term.',
     why:'H(p,q) = H(p) + KL(p‖q); the gradient of H(p,q) w.r.t. q is the gradient of KL alone. Minimizing CE and minimizing KL are the same optimization.',
     wrong:{1:'H(p) is fixed by the dataset -- no model choice changes it. You can minimize KL but never touch H(p).',2:'Maximizing H(q) would push q toward uniform -- the opposite of fitting the data.',3:'Uniform q maximizes entropy but maximizes KL too (unless p is also uniform). It is the worst model, not the best.'}},
    {q:'The minimum possible value of H(p, q) over all choices of q is…',
     opts:['H(p) -- achieved when q = p',
           '0 -- with a good enough model',
           'KL(p‖q) -- the divergence term',
           'H(p) × H(q)'],
     a:0, tag:'ce floor is H(p)',
     focus:'KL >= 0 (Gibbs), so H(p,q) = H(p) + KL >= H(p). The floor is the data entropy, hit exactly when q = p.',
     why:'KL >= 0 always (Gibbs’ inequality), so H(p,q) >= H(p). Equality holds iff KL = 0 iff q = p. No model gets below H(p).',
     wrong:{1:'CE = 0 would require H(p) = 0 AND q = p -- meaning the data is deterministic AND perfectly predicted. Training loss can never be zero on real data.',2:'KL is part of the decomposition, not the minimum -- the minimum is H(p) + 0 = H(p).',3:'Probabilities multiply when events are independent; this formula has no such interpretation.'}},
    {type:'numeric',
     q:'True distribution p = (0.5, 0.5) (fair coin). Model predicts q = (0.5, 0.5). What is H(p, q) in bits? (Answer to 1 decimal.)',
     answer:1.0, tol:0.05,
     tag:'ce numeric',
     focus:'When q = p the KL term is 0, so H(p,q) = H(p) = −(0.5 log₂ 0.5 + 0.5 log₂ 0.5) = 1 bit.',
     hint:'H(p,q) = H(p) + KL(p‖q). With q = p, KL = 0. H(fair coin) = 1 bit.',
     why:'q = p means KL = 0, so H(p,q) = H(p) = 1 bit. The model is perfect; CE equals the irreducible floor.'},
    {type:'order',
     q:'Arrange the steps that prove minimizing NLL on a batch = minimizing KL(p̂‖q):',
     tag:'nll = kl derivation',
     focus:'The chain: average NLL over the batch is H(p̂,q) by definition; then apply the decomposition.',
     steps:[
       'Write the per-example NLL: −log q(yᵢ).',
       'Average over the batch: (1/n)Σ −log q(yᵢ) = H(p̂, q), the cross-entropy of the empirical distribution p̂ with q.',
       'Decompose: H(p̂, q) = H(p̂) + KL(p̂‖q).',
       'H(p̂) is a constant of the dataset; minimizing over q is equivalent to minimizing KL(p̂‖q).',
     ],
     why:'The chain is: NLL average = cross-entropy by definition; cross-entropy = H(data) + KL; H(data) is constant; therefore minimizing CE = minimizing KL.'},
  ],
});

/* ------------------------------------------------------------------ */
/* Lab A-1: CE decomposition explorer                                  */
/* ------------------------------------------------------------------ */
INTERACTIVES['infoce-decomp'] = function(stage, api){
  const L = makeLab(stage);
  // 4-outcome distribution; user drags p, chips set q
  const NAMES = ['A','B','C','D'];
  let wp = [3, 2, 2, 1];
  let wq = [1, 1, 1, 1];
  const m = api.missions([
    {text:'Make H(p) as large as possible: push <b>H(p) >= 1.99 bits</b>', xp:15, check:s=>s.hp>=1.99},
    {text:'Force the floor: set q = p (match all four sliders) and confirm <b>KL = 0</b>', xp:20, check:s=>s.klpq<0.02},
    {text:'Expensive beliefs: use "Wrong Q" and confirm <b>CE >= H(p) + 1.5</b>', xp:25, check:s=>s.ce>=s.hp+1.5},
  ]);
  function draw(){
    clearBg(L.ctx, L.W, L.H);
    const p = norm(wp), q = norm(wq);
    const hp = entropy(p), klpq = kl(p, q), ce = crossEnt(p, q);
    const ff = getComputedStyle(document.body).fontFamily;
    // -- stacked bar showing CE = H(p) [grey] + KL [cyan]
    const BX = 60, BY = 60, BW = L.W - 120, BH = 46;
    const maxCE = Math.max(ce, 2.2);
    const hFrac = hp / maxCE, klFrac = klpq / maxCE;
    // H(p) segment
    L.ctx.fillStyle = 'rgba(139,147,184,.55)';
    L.ctx.fillRect(BX, BY, BW * hFrac, BH);
    // KL segment
    if(klFrac > 0.002){
      L.ctx.fillStyle = 'rgba(0,212,255,.75)';
      L.ctx.fillRect(BX + BW * hFrac, BY, BW * klFrac, BH);
    }
    // outline
    L.ctx.strokeStyle = 'rgba(255,255,255,.25)'; L.ctx.lineWidth = 1;
    L.ctx.strokeRect(BX, BY, BW, BH);
    // label
    L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = '700 12px ' + ff;
    L.ctx.fillText('H(p,q) = H(p) + KL(p‖q)', BX, BY - 10);
    // H(p) label
    if(hFrac > 0.15){
      L.ctx.fillStyle = '#11152a'; L.ctx.font = '600 11px ' + ff;
      L.ctx.fillText(hp.toFixed(2) + ' bits', BX + 6, BY + 29);
    }
    // KL label
    if(klFrac > 0.12){
      L.ctx.fillStyle = '#11152a'; L.ctx.font = '600 11px ' + ff;
      L.ctx.fillText('+' + klpq.toFixed(2), BX + BW * hFrac + 6, BY + 29);
    }

    // -- grouped bars: p (purple) + q (gold outline)
    const GY = BY + BH + 50, GH = 160;
    const gw = (L.W - 80) / 4;
    L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '700 11px ' + ff;
    L.ctx.fillText('distribution bars  (■ p-truth,  □ q-model)', 40, GY - 12);
    NAMES.forEach((nm, i) => {
      const x = 40 + i * gw;
      L.ctx.fillStyle = 'rgba(124,92,255,.7)';
      L.ctx.fillRect(x + gw * .10, GY + GH - GH * p[i], gw * .36, GH * p[i]);
      L.ctx.strokeStyle = 'rgba(255,201,77,.9)'; L.ctx.lineWidth = 2;
      L.ctx.strokeRect(x + gw * .52, GY + GH - GH * q[i], gw * .36, GH * q[i]);
      L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '700 12px ' + ff; L.ctx.textAlign = 'center';
      L.ctx.fillText(nm, x + gw / 2, GY + GH + 18); L.ctx.textAlign = 'left';
    });
    // floor tick
    L.ctx.setLineDash([5, 5]); L.ctx.strokeStyle = 'rgba(139,147,184,.45)'; L.ctx.lineWidth = 1.5;
    const floorX = BX + BW * (hp / maxCE);
    L.ctx.beginPath(); L.ctx.moveTo(floorX, BY - 6); L.ctx.lineTo(floorX, BY + BH + 6); L.ctx.stroke();
    L.ctx.setLineDash([]);
    L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '600 10px ' + ff;
    L.ctx.fillText('H(p) floor', floorX + 4, BY - 10);

    L.readout.innerHTML =
      'H(p) = ' + hp.toFixed(3) + ' bits  (fixed by data)<br>' +
      'KL(p‖q) = ' + klpq.toFixed(3) + ' bits  (model gap)<br>' +
      '<b>H(p,q) = ' + ce.toFixed(3) + ' bits</b>' +
      (klpq < 0.02 ? '  &#x2705; floor reached!' : '');
    m.update({hp, klpq, ce});
  }
  NAMES.forEach((nm, i) =>
    slider(L.ctrl, 'p weight on ' + nm, 0.1, 8, 0.1, wp[i], v => v.toFixed(1), v => { wp[i] = v; draw(); })
  );
  chips(L.ctrl, 'SET Q (model belief)',
    ['Uniform', 'Copy p', 'Wrong Q (sure it\'s A)'],
    (i, btn, row) => {
      if(i === 0) wq = [1, 1, 1, 1];
      else if(i === 1) wq = [...wp];
      else wq = [9, 0.2, 0.2, 0.2];
      [...row.children].forEach(b => b.classList.remove('on')); btn.classList.add('on');
      draw();
    }
  );
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The bar = H(p,q). The <b style="color:#8b93b8">grey</b> segment is H(p) -- the irreducible floor; the <b style="color:#00d4ff">cyan</b> segment is KL(p‖q) -- your model\'s extra cost. When q = p the cyan disappears and the bar hits the floor. It can never go lower.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ------------------------------------------------------------------ */
/* Lab A-2: NLL = cross-entropy on a tiny batch  (predict-then-verify) */
/* ------------------------------------------------------------------ */
INTERACTIVES['infoce-nll'] = function(stage, api){
  const L = makeLab(stage);
  // 3 examples; true labels fixed; model outputs one slider per example
  const LABELS = ['Cat','Dog','Cat'];
  const CLASSES = ['Cat','Dog'];
  // raw logit for "Cat" per example; Dog = 1 - Cat after softmax
  let logitCat = [1.2, -0.8, 0.3];

  function softmax2(z){ const e0 = Math.exp(z), e1 = 1; const s = e0 + e1; return [e0/s, e1/s]; }
  function computeNLL(){
    let nll = 0;
    for(let i = 0; i < 3; i++){
      const p = softmax2(logitCat[i]);
      const trueIdx = LABELS[i] === 'Cat' ? 0 : 1;
      nll -= Math.log(p[trueIdx]);
    }
    return nll / Math.LN2 / 3;  // bits, averaged
  }
  function computeCE(){
    // empirical p: 2/3 Cat, 1/3 Dog
    const pTrue = [2/3, 1/3];
    // model q: average softmax outputs
    let qAvg = [0, 0];
    for(let i = 0; i < 3; i++){
      const q = softmax2(logitCat[i]);
      qAvg[0] += q[0]; qAvg[1] += q[1];
    }
    qAvg = qAvg.map(v => v / 3);
    return crossEnt(pTrue, qAvg);
  }

  const m = api.missions([
    {text:'Commit a prediction, then verify: <b>NLL = CE</b> (within 0.03 bits)', xp:20, check:s=>s.committed&&Math.abs(s.nll-s.ce)<0.03},
    {text:'Find the model that <b>minimizes NLL</b>: get NLL below <b>0.75 bits</b>', xp:25, check:s=>s.nll<0.75},
    {text:'Watch the floor: confirm <b>NLL >= H(p) = 0.918 bits</b> no longer (use negative logits to see it approach)', xp:20, check:s=>s.nll<0.95},
  ]);

  // predict-then-verify widget (manual, since makePredict needs pre-render setup)
  const predBox = document.createElement('div'); predBox.className = 'predict';
  predBox.innerHTML = '<div class="predict-head">&#x1f52e; PREDICT FIRST -- commit a guess before controls unlock' +
    '<span class="predict-xp">+10 to commit</span></div>' +
    '<div class="predict-prompt">The 3-example batch has labels (Cat, Dog, Cat). The model predicts Cat with roughly equal probability each time. Will average NLL equal H(p&#x0302;, q) -- the cross-entropy of the empirical label distribution? Choose: Yes (they are identical) or No (they differ).</div>';
  const prow = document.createElement('div'); prow.style.cssText = 'display:flex;gap:8px;margin:8px 0';
  const pYes = document.createElement('button'); pYes.className = 'chip'; pYes.textContent = 'Yes -- identical';
  const pNo  = document.createElement('button'); pNo.className = 'chip';  pNo.textContent  = 'No -- they differ';
  const pReveal = document.createElement('div'); pReveal.className = 'predict-reveal';
  prow.appendChild(pYes); prow.appendChild(pNo); predBox.appendChild(prow); predBox.appendChild(pReveal);
  stage.appendChild(predBox);

  let committed = false;
  function commitPred(isYes){
    if(committed) return;
    committed = true;
    pYes.disabled = true; pNo.disabled = true;
    const correct = isYes;  // Yes is the right answer
    pReveal.innerHTML = correct
      ? '<b style="color:#2dd4a0">Correct!</b> NLL averaged over the batch = H(p&#x0302;, q) exactly -- they are the same sum in two notations.'
      : '<b style="color:#ff5c7a">Not quite.</b> Average NLL and H(p&#x0302;, q) are identical: both equal &minus;(1/n) &Sigma; log q(y<sub>i</sub>). The difference is only the name.';
    // unlock controls
    stage.querySelectorAll('.controls input, .controls button')
      .forEach(el => { if(!predBox.contains(el)) el.disabled = false; });
    draw();
  }
  pYes.onclick = () => commitPred(true);
  pNo.onclick  = () => commitPred(false);
  // initially lock controls
  setTimeout(() => {
    stage.querySelectorAll('.controls input, .controls button')
      .forEach(el => { if(!predBox.contains(el)) el.disabled = true; });
  }, 0);

  function draw(){
    clearBg(L.ctx, L.W, L.H);
    const ff = getComputedStyle(document.body).fontFamily;
    const nll = computeNLL(), ce = computeCE();
    const pHat = [2/3, 1/3];
    const hpHat = entropy(pHat);  // 0.918 bits

    // example rows
    for(let i = 0; i < 3; i++){
      const p = softmax2(logitCat[i]);
      const trueIdx = LABELS[i] === 'Cat' ? 0 : 1;
      const nlLi = -Math.log(p[trueIdx]) / LN2;
      const y = 50 + i * 110;
      L.ctx.fillStyle = 'rgba(255,255,255,.06)'; L.ctx.fillRect(30, y, L.W - 60, 90);
      L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = '700 12px ' + ff;
      L.ctx.fillText('Example ' + (i+1) + ': true label = ' + LABELS[i], 44, y + 20);
      CLASSES.forEach((cls, ci) => {
        const bx = 44 + ci * 200, by = y + 34, bh = 36, bw = 160;
        const frac = p[ci];
        L.ctx.fillStyle = ci === trueIdx ? 'rgba(45,212,160,.35)' : 'rgba(139,147,184,.18)';
        L.ctx.fillRect(bx, by, bw * frac, bh);
        L.ctx.strokeStyle = 'rgba(255,255,255,.15)'; L.ctx.lineWidth = 1;
        L.ctx.strokeRect(bx, by, bw, bh);
        L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = '600 11px ' + ff;
        L.ctx.fillText(cls + ' ' + (p[ci]*100).toFixed(1)+'%', bx + 6, by + 23);
      });
      L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '600 11px ' + ff;
      L.ctx.fillText('NLL = ' + nlLi.toFixed(3) + ' bits', L.W - 150, y + 75);
    }

    // bottom readout
    const by = 390;
    L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '700 12px ' + ff;
    L.ctx.fillText('avg NLL = ' + nll.toFixed(4) + ' bits', 40, by);
    L.ctx.fillText('H(p̂, q) = ' + ce.toFixed(4) + ' bits', 40, by + 22);
    L.ctx.fillText('H(p̂) floor = ' + hpHat.toFixed(4) + ' bits  (p̂ = 2/3 Cat, 1/3 Dog)', 40, by + 44);
    const match = Math.abs(nll - ce) < 0.001;
    if(match) { L.ctx.fillStyle = '#2dd4a0'; L.ctx.fillText('✅ NLL = CE confirmed', 300, by); }
    L.readout.innerHTML =
      'avg NLL = ' + nll.toFixed(4) + ' bits<br>' +
      'H(p̂, q) = ' + ce.toFixed(4) + ' bits<br>' +
      (match ? '<b>Equal!</b>' : 'difference = ' + Math.abs(nll - ce).toFixed(5) + ' bits');
    m.update({nll, ce, committed});
  }
  for(let i = 0; i < 3; i++){
    const ii = i;
    slider(L.ctrl, 'Example ' + (i+1) + ' logit (positive = more Cat)', -3, 3, 0.05, logitCat[i],
      v => v.toFixed(2), v => { logitCat[ii] = v; draw(); });
  }
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Each example contributes &minus;log&nbsp;q(true label) to the NLL sum. Averaging that sum over the batch equals H(p&#x0302;,&nbsp;q) by definition -- the same arithmetic, two names.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ------------------------------------------------------------------ */
/* Lab A-3: Temperature & confidence                                   */
/* ------------------------------------------------------------------ */
INTERACTIVES['infoce-temp'] = function(stage, api){
  const L = makeLab(stage);
  // 4-class model with fixed logits; T scales them; user also controls
  // which logit is largest (how "correct" the model is)
  let logits = [2.5, 0.8, -0.3, -1.2];
  let temp = 1.0;
  let correct = 0;  // index of the true class

  function softmax4(ls, T){
    const scaled = ls.map(z => z / T);
    const mx = Math.max(...scaled);
    const exps = scaled.map(z => Math.exp(z - mx));
    const s = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / s);
  }
  function computeMetrics(q, trueIdx){
    const nll = -Math.log(Math.max(q[trueIdx], EPS)) / LN2;
    const pUnif = [0.25, 0.25, 0.25, 0.25];
    const hq = entropy(q);
    const ceUnifQ = crossEnt(pUnif, q);
    return {nll, hq, ceUnifQ};
  }

  const m = api.missions([
    {text:'Low T sharpens: set T < 0.3 and confirm <b>CE < 0.3 bits</b> (model is confident and correct)', xp:20, check:s=>s.temp<0.3&&s.nll<0.3},
    {text:'High T flattens: set T > 3 and see <b>CE approach log2(4) = 2 bits</b> (nearly uniform)', xp:20, check:s=>s.temp>3&&s.hq>1.85},
    {text:'Confident but wrong: move the true class to the <b>lowest logit</b> -- CE spikes above 2 bits', xp:25, check:s=>s.correct===3&&s.nll>2.0},
  ]);

  function draw(){
    clearBg(L.ctx, L.W, L.H);
    const ff = getComputedStyle(document.body).fontFamily;
    const q = softmax4(logits, temp);
    const {nll, hq} = computeMetrics(q, correct);

    // bar chart of q
    const NAMES = ['Class 0','Class 1','Class 2','Class 3'];
    const padL = 50, padR = 20, padT = 50, padB = 50;
    const bw = (L.W - padL - padR) / 4;
    const maxH = L.H - padT - padB;
    L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '700 12px ' + ff;
    L.ctx.fillText('softmax output after temperature T = ' + temp.toFixed(2), padL, padT - 16);
    q.forEach((qi, i) => {
      const x = padL + i * bw;
      const bh = qi * maxH;
      const isTrue = i === correct;
      L.ctx.fillStyle = isTrue ? 'rgba(45,212,160,.8)' : 'rgba(124,92,255,.55)';
      L.ctx.fillRect(x + bw * .1, padT + maxH - bh, bw * .8, bh);
      L.ctx.strokeStyle = isTrue ? '#2dd4a0' : 'rgba(0,0,0,0)'; L.ctx.lineWidth = 2;
      L.ctx.strokeRect(x + bw * .1, padT + maxH - bh, bw * .8, bh);
      L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '600 11px ' + ff; L.ctx.textAlign = 'center';
      L.ctx.fillText(NAMES[i], x + bw / 2, padT + maxH + 18);
      L.ctx.fillText((qi * 100).toFixed(1) + '%', x + bw / 2, padT + maxH - bh - 6);
      L.ctx.textAlign = 'left';
    });
    // CE meter
    const MX = padL, MY = padT + maxH + 40, MW = L.W - padL - padR, MH = 22;
    const maxCE = 2.5;
    L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '700 12px ' + ff;
    L.ctx.fillText('Cross-entropy loss (true class = ' + NAMES[correct] + ')', MX, MY - 8);
    L.ctx.fillStyle = 'rgba(139,147,184,.2)'; L.ctx.fillRect(MX, MY, MW, MH);
    const ceFrac = Math.min(nll / maxCE, 1);
    L.ctx.fillStyle = nll < 0.5 ? 'rgba(45,212,160,.85)' : nll < 1.5 ? 'rgba(255,201,77,.85)' : 'rgba(255,92,122,.85)';
    L.ctx.fillRect(MX, MY, MW * ceFrac, MH);
    L.ctx.fillStyle = '#fff'; L.ctx.font = '800 13px ' + ff;
    L.ctx.fillText(nll.toFixed(3) + ' bits', MX + 8, MY + 16);
    // uniform line at log2(4) = 2 bits
    const unifX = MX + MW * (2.0 / maxCE);
    L.ctx.setLineDash([4, 4]); L.ctx.strokeStyle = 'rgba(255,201,77,.5)'; L.ctx.lineWidth = 1.5;
    L.ctx.beginPath(); L.ctx.moveTo(unifX, MY - 4); L.ctx.lineTo(unifX, MY + MH + 4); L.ctx.stroke();
    L.ctx.setLineDash([]); L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '600 10px ' + ff;
    L.ctx.fillText('H(unif)=2', unifX + 4, MY - 6);

    L.readout.innerHTML =
      'T = ' + temp.toFixed(2) + '<br>' +
      'H(q) = ' + hq.toFixed(3) + ' bits  (model entropy -- how spread out)<br>' +
      '<b>CE = ' + nll.toFixed(3) + ' bits</b>  (true class: ' + NAMES[correct] + ')';
    m.update({temp, nll, hq, correct});
  }
  slider(L.ctrl, 'Temperature T', 0.1, 5, 0.05, 1.0, v => v.toFixed(2), v => { temp = v; draw(); });
  chips(L.ctrl, 'TRUE CLASS (which class is actually correct)',
    ['Class 0 (best logit)', 'Class 1', 'Class 2', 'Class 3 (worst logit)'],
    (i, btn, row) => {
      correct = i;
      [...row.children].forEach(b => b.classList.remove('on')); btn.classList.add('on'); draw();
    }
  );
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b style="color:#2dd4a0">Green bar</b> = true class. Low T &rarr; confident; High T &rarr; uniform. CE = &minus;log q(true class). A confident model on the wrong class pays a steep price above 2 bits.</div>';
  L.ctrl.appendChild(note);
  draw();
};


/* ================================================================
   LESSON B -- Mutual Information
   ================================================================ */

registerLesson({
  id:'info-mi', world:'prob', order:111, emoji:'&#x1f517;',
  title:'Mutual Information',
  sub:'How much knowing Y tells you about X -- the symmetric information overlap between two variables.',

  learn:`<p>Given two random variables X and Y with joint distribution p(x,&nbsp;y) and marginals p(x), p(y), their <strong>mutual information</strong> is:</p>
<div class="formula">$$I(X; Y) = \\sum_{x,y} p(x,y) \\log \\dfrac{p(x,y)}{p(x) p(y)}$$</div>
<p>This is the KL divergence from the <em>product of the marginals</em> to the joint: I(X;&nbsp;Y)&nbsp;=&nbsp;KL(p(x,y)&nbsp;&#x2016;&nbsp;p(x)p(y)). Because KL&nbsp;&ge;&nbsp;0, so is I, with equality iff X&nbsp;&#x22A5;&nbsp;Y -- independence is the unique state of zero mutual information.</p>
<p>Three equivalent expressions make the geometry clear:</p>
<div class="formula">$$I(X; Y) = H(X) - H(X|Y) = H(Y) - H(Y|X) = H(X) + H(Y) - H(X, Y)$$</div>
<p>The <strong>uncertainty-reduction view</strong>: I is how much H(X) shrinks when you learn Y. Before observing Y, you need H(X) bits on average to describe X; after, only H(X|Y) bits. The difference is the information Y gave you about X.</p>
<p>Crucially, I(X;&nbsp;Y)&nbsp;=&nbsp;I(Y;&nbsp;X): information is <strong>symmetric</strong>. Knowing Y reduces uncertainty about X by exactly as much as knowing X reduces uncertainty about Y -- even when the causal direction is asymmetric.</p>
<p><strong>Conditional entropy</strong> H(X|Y) = &minus;&Sigma;<sub>x,y</sub> p(x,y) log p(x|y). It averages the entropy of X within each Y-slice, weighted by how often each Y-value occurs.</p>`,

  ml:`Mutual information is everywhere in modern ML. <b>Feature selection</b> uses I(feature; label) to rank which inputs are most informative. <b>InfoNCE / contrastive losses</b> (CLIP, SimCLR, CPC) are lower bounds on I(X;&nbsp;Y) -- maximizing them forces the model to capture the shared information between two views of the same object. The <b>Information Bottleneck</b> framework formalizes learning as I(X;&nbsp;Z) minimization subject to I(Z;&nbsp;Y) maximization: discard what is irrelevant about the input while preserving what predicts the label. MI also underpins RLHF analysis: how much information about human preferences survives in the reward model?`,

  deeper:[
    {title:'😵 Stuck? The Venn-diagram view', body:'Draw an ellipse for H(X) and one for H(Y), overlapping. The overlap IS I(X;Y) -- the information both share. H(X|Y) is the X-ellipse minus the overlap (what X has that Y doesn\'t explain). H(X,Y) is the union of both ellipses. The four pieces add up: H(X|Y) + I(X;Y) + H(Y|X) = H(X,Y). Independence means the ellipses don\'t touch.'},
    {title:'🚀 Go deeper: data processing inequality', body:'If X → Y → Z forms a Markov chain, then I(X; Z) &le; I(X; Y). Processing can only destroy information, never create it. A classifier\'s hidden layers cannot hold more information about the labels than the raw input does -- they can only compress it. This is the upper bound that motivates the information bottleneck: you want to drop irrelevant information while keeping I(Z; Y) high.'},
    {title:'🚀 Go deeper: Cover & Thomas reference', body:'The identities I(X;Y) = H(X) + H(Y) − H(X,Y) = H(X) − H(X|Y) and the data processing inequality are proven in <em>Cover &amp; Thomas, Elements of Information Theory (2nd ed.), chapter 2</em>. The information bottleneck is developed in Tishby, Pereira &amp; Bialek (1999). The link to contrastive learning is made rigorous in van den Oord et al., "Representation Learning with Contrastive Predictive Coding" (2018).'},
  ],

  labs:[
    {interactive:'infomi-heatmap', title:'Joint heatmap explorer',
     intro:'<p>A 3&times;3 joint distribution over (X, Y). Drag the mass with the pattern chips and see I(X;&nbsp;Y) respond. Independent joint (outer product of marginals): I&nbsp;&rarr;&nbsp;0. Diagonal concentration: I climbs. The product-of-marginals is overlaid as a heatmap for comparison.</p>'},
    {interactive:'infomi-uncert', title:'Uncertainty reduction H(X) → H(X|Y)',
     intro:'<p>Watch H(X) shrink to H(X|Y) as the coupling between X and Y strengthens. Drag the coupling slider from 0 (independent) to 1 (X determined by Y). I(X;Y) is the gap that opens between the two entropy bars.</p>'},
    {interactive:'infomi-predict', title:'Predict: is I zero here?',
     intro:'<p>Four joint distributions shown one at a time. For each, predict whether I(X;&nbsp;Y)&nbsp;=&nbsp;0 (independent) or I(X;&nbsp;Y)&nbsp;&gt;&nbsp;0 (dependent), then reveal the true I value. A perfect chain-rule surprise.</p>'},
  ],

  quiz:[
    {q:'I(X; Y) = 0 exactly when…',
     opts:['X and Y are independent: p(x,y) = p(x)p(y) for every cell',
           'X = Y (they are identical)',
           'H(X) = H(Y)',
           'The joint is uniform'],
     a:0, tag:'mi zero iff independent',
     focus:'I = KL(joint ‖ product-of-marginals). KL = 0 iff joint = product-of-marginals iff X ⊥ Y.',
     why:'I(X;Y) = KL(p(x,y)‖p(x)p(y)); KL = 0 iff the two distributions match; they match iff the joint factorizes: X ⊥ Y.',
     wrong:{1:'X = Y is maximum dependence -- I is as large as it can be (I = H(X) = H(Y)). That is the opposite of zero.',2:'Equal entropies do not imply independence. Two variables can have H(X) = H(Y) yet be highly correlated.',3:'A uniform joint over N×M cells can be dependent (if the marginals are also uniform, it happens to be independent -- but the uniform joint of a NON-uniform marginal is dependent).'}},
    {q:'I(X; Y) = H(X) − H(X|Y). This means I is…',
     opts:['The reduction in uncertainty about X after learning Y',
           'The total entropy of the system',
           'The entropy of Y minus the entropy of X',
           'Always greater than H(X)'],
     a:0, tag:'mi as uncertainty reduction',
     focus:'H(X) is the uncertainty about X alone; H(X|Y) is the remaining uncertainty after Y is known. Their difference is the information Y provided.',
     why:'H(X) bits to describe X before learning Y; H(X|Y) bits after. The gap I = H(X) − H(X|Y) is exactly what Y told you about X.',
     wrong:{1:'H(X,Y) is the joint entropy (total). I is not H(X,Y); it equals H(X) + H(Y) − H(X,Y) (the overlap, not the union).',2:'H(Y) − H(X) is an asymmetric difference with no direct interpretation. I is symmetric: I(X;Y) = I(Y;X).',3:'I ≤ min(H(X), H(Y)) always. It can never exceed H(X) because H(X|Y) ≥ 0.'}},
    {q:'Is I(X; Y) = I(Y; X)?',
     opts:['Yes -- mutual information is symmetric',
           'No -- I(X;Y) measures X→Y information; I(Y;X) measures Y→X',
           'Only when H(X) = H(Y)',
           'Only when X and Y are independent'],
     a:0, tag:'mi symmetry',
     focus:'I(X;Y) = H(X) + H(Y) − H(X,Y) = H(Y) + H(X) − H(X,Y) = I(Y;X). The formula is symmetric in X and Y.',
     why:'From the third form I(X;Y) = H(X) + H(Y) − H(X,Y), swapping X and Y changes nothing -- addition is commutative.',
     wrong:{1:'I measures shared information, which is the same from either direction. Causal direction is irrelevant to the amount of shared information.',2:'Symmetry holds regardless of whether H(X) = H(Y). The formula H(X) + H(Y) − H(X,Y) is clearly symmetric.',3:'When X ⊥ Y both I(X;Y) and I(Y;X) equal 0 -- they are trivially equal. Symmetry holds for ALL joints, not just independent ones.'}},
    {type:'numeric',
     q:'X and Y each take values {0,1} with joint: P(0,0)=0.4, P(0,1)=0.1, P(1,0)=0.1, P(1,1)=0.4. Compute I(X;Y) in bits to 2 decimal places. (Use H(X,Y) = −Σ p log₂ p and H(X) = H(Y) = 1 bit.)',
     answer:0.28, tol:0.025,
     tag:'mi numeric',
     focus:'I = H(X) + H(Y) − H(X,Y). H(X) = H(Y) = 1 bit. H(X,Y) = −2(0.4 log₂ 0.4 + 0.1 log₂ 0.1) ≈ 1.72 bits. I ≈ 1 + 1 − 1.72 = 0.28 bits.',
     hint:'Compute H(X,Y) = −2×0.4×log₂(0.4) − 2×0.1×log₂(0.1). Then I = H(X) + H(Y) − H(X,Y) with H(X) = H(Y) = 1 bit.',
     why:'H(X,Y) ≈ 1.722 bits. I = 1 + 1 − 1.722 = 0.278 ≈ 0.28 bits. The correlation between X and Y (they mostly agree) creates ~0.28 bits of shared information.'},
  ],
});

/* ------------------------------------------------------------------ */
/* Lab B-1: Joint heatmap explorer                                     */
/* ------------------------------------------------------------------ */
INTERACTIVES['infomi-heatmap'] = function(stage, api){
  const L = makeLab(stage, {w:640, h:480});
  const N = 3;
  // raw weights for the joint; will be normalized
  let W = [[4,1,0],[1,3,1],[0,1,4]];  // diagonal-ish = dependent

  function heatColor(t){
    t = Math.max(0, Math.min(1, t));
    const stops = [[17,21,42],[30,60,130],[0,150,200],[0,212,255],[255,201,77]];
    const seg = t * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(seg));
    const f = seg - i;
    const a = stops[i], b = stops[i + 1];
    return 'rgb(' + Math.round(a[0]+(b[0]-a[0])*f) + ',' + Math.round(a[1]+(b[1]-a[1])*f) + ',' + Math.round(a[2]+(b[2]-a[2])*f) + ')';
  }
  function getJoint(){
    let s = 0; for(let y=0;y<N;y++) for(let x=0;x<N;x++) s += W[y][x];
    return W.map(r => r.map(v => v / s));
  }
  function computeMI(J){
    const px = Array(N).fill(0), py = Array(N).fill(0);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ px[x] += J[y][x]; py[y] += J[y][x]; }
    let mi = 0;
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      if(J[y][x] > EPS) mi += J[y][x] * Math.log(J[y][x] / Math.max(px[x] * py[y], EPS));
    }
    return mi / LN2;
  }
  function computeJointEntropy(J){
    let h = 0;
    for(let y=0;y<N;y++) for(let x=0;x<N;x++) if(J[y][x]>EPS) h -= J[y][x]*Math.log(J[y][x]);
    return h / LN2;
  }

  const m = api.missions([
    {text:'Independence: use "Uniform" preset and confirm <b>I(X;Y) < 0.01 bits</b>', xp:15, check:s=>s.mi<0.01},
    {text:'Dependence: use "Diagonal" and confirm <b>I(X;Y) > 0.3 bits</b>', xp:20, check:s=>s.mi>0.3},
    {text:'Maximum: use "Deterministic" (X = Y) and confirm <b>I(X;Y) > 1.4 bits</b>', xp:25, check:s=>s.mi>1.4},
  ]);

  function draw(){
    clearBg(L.ctx, L.W, L.H);
    const J = getJoint();
    const px = Array(N).fill(0), py = Array(N).fill(0);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ px[x] += J[y][x]; py[y] += J[y][x]; }
    const mi = computeMI(J);
    const hxy = computeJointEntropy(J);
    const hx = entropy(px), hy = entropy(py);
    const ff = getComputedStyle(document.body).fontFamily;

    // -- left: actual joint; right: product of marginals
    const cell = 72, ox = 44, oy = 54, ox2 = 310;
    L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = '700 12px ' + ff;
    L.ctx.fillText('JOINT  p(x,y)', ox, oy - 12);
    L.ctx.fillText('PRODUCT  p(x)·p(y)', ox2, oy - 12);
    let vmax = 1e-9;
    for(let y=0;y<N;y++) for(let x=0;x<N;x++) vmax = Math.max(vmax, J[y][x], px[x]*py[y]);

    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      const yy = N-1-y;  // math y-up
      // joint cell
      const jv = J[y][x];
      L.ctx.fillStyle = heatColor(jv / vmax);
      L.ctx.fillRect(ox + x*cell + 1, oy + yy*cell + 1, cell-2, cell-2);
      L.ctx.fillStyle = jv/vmax>0.5 ? '#11152a' : '#cdd4f0';
      L.ctx.font = '700 13px ' + ff; L.ctx.textAlign = 'center';
      L.ctx.fillText(jv.toFixed(2), ox + x*cell + cell/2, oy + yy*cell + cell/2 + 5);
      // product cell
      const pv = px[x] * py[y];
      L.ctx.fillStyle = heatColor(pv / vmax);
      L.ctx.fillRect(ox2 + x*cell + 1, oy + yy*cell + 1, cell-2, cell-2);
      L.ctx.fillStyle = pv/vmax>0.5 ? '#11152a' : '#cdd4f0';
      L.ctx.fillText(pv.toFixed(2), ox2 + x*cell + cell/2, oy + yy*cell + cell/2 + 5);
      L.ctx.textAlign = 'left';
    }
    // axis labels
    L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '600 11px ' + ff;
    for(let x=0;x<N;x++){
      L.ctx.textAlign = 'center';
      L.ctx.fillText('X='+x, ox + x*cell + cell/2, oy + N*cell + 18);
      L.ctx.fillText('X='+x, ox2 + x*cell + cell/2, oy + N*cell + 18);
    }
    for(let y=0;y<N;y++){
      L.ctx.textAlign = 'right';
      L.ctx.fillText('Y='+y, ox - 6, oy + (N-1-y)*cell + cell/2 + 4);
    }
    L.ctx.textAlign = 'left';
    // MI bar
    const MX = ox, MY = oy + N*cell + 38, MW = L.W - 2*ox, MH = 20;
    const maxMI = Math.log2(N);
    L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '700 12px ' + ff;
    L.ctx.fillText('I(X; Y) = KL(joint ‖ product)', MX, MY - 8);
    L.ctx.fillStyle = 'rgba(139,147,184,.2)'; L.ctx.fillRect(MX, MY, MW, MH);
    L.ctx.fillStyle = 'rgba(0,212,255,.8)';
    L.ctx.fillRect(MX, MY, MW * Math.min(mi / maxMI, 1), MH);
    L.ctx.fillStyle = '#fff'; L.ctx.font = '800 12px ' + ff;
    L.ctx.fillText(mi.toFixed(3) + ' bits', MX + 6, MY + 15);
    // max MI marker
    L.ctx.setLineDash([4,4]); L.ctx.strokeStyle = 'rgba(255,201,77,.5)'; L.ctx.lineWidth = 1.5;
    L.ctx.beginPath(); L.ctx.moveTo(MX + MW, MY - 4); L.ctx.lineTo(MX + MW, MY + MH + 4); L.ctx.stroke();
    L.ctx.setLineDash([]); L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '600 10px ' + ff;
    L.ctx.fillText('max=' + maxMI.toFixed(2), MX + MW - 56, MY - 6);

    L.readout.innerHTML =
      'H(X) = ' + hx.toFixed(3) + ' bits   H(Y) = ' + hy.toFixed(3) + ' bits<br>' +
      'H(X,Y) = ' + hxy.toFixed(3) + ' bits<br>' +
      '<b>I(X;Y) = H(X)+H(Y)−H(X,Y) = ' + mi.toFixed(3) + ' bits</b>';
    m.update({mi});
  }
  chips(L.ctrl, 'JOINT PATTERN',
    ['Diagonal (dependent)', 'Uniform (independent)', 'Deterministic (X=Y)', 'Random'],
    (i, btn, row) => {
      if(i === 0) W = [[4,1,0],[1,4,1],[0,1,4]];
      else if(i === 1) W = [[1,1,1],[1,1,1],[1,1,1]];
      else if(i === 2) W = [[5,0,0],[0,5,0],[0,0,5]];
      else W = Array.from({length:N}, () => Array.from({length:N}, () => 0.5 + Math.random()*5));
      [...row.children].forEach(b => b.classList.remove('on')); btn.classList.add('on'); draw();
    }
  );
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Left: the actual joint. Right: p(x)·p(y) -- what the joint would look like if X, Y were independent. I = KL between them. When the tables match, I = 0. Diagonal mass creates strong shared information.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ------------------------------------------------------------------ */
/* Lab B-2: Uncertainty reduction view                                 */
/* ------------------------------------------------------------------ */
INTERACTIVES['infomi-uncert'] = function(stage, api){
  const L = makeLab(stage);
  // X, Y each take {0,1,2}; coupling parameter c in [0,1]
  // c=0: independent uniform; c=1: X=Y with prob 1 (deterministic)
  let c = 0.0;
  const N = 3;

  function buildJoint(c){
    // interpolate between uniform (c=0) and identity (c=1)
    const pUnif = 1 / (N * N);
    const J = [];
    for(let y=0;y<N;y++){
      const row = [];
      for(let x=0;x<N;x++){
        const pIdent = (x === y) ? 1/N : 0;
        row.push((1-c) * pUnif + c * pIdent);
      }
      J.push(row);
    }
    return J;
  }
  function condEntropy(J){
    // H(X|Y) = sum_y P(Y=y) H(X|Y=y)
    const py = Array(N).fill(0);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++) py[y] += J[y][x];
    let hxy = 0;
    for(let y=0;y<N;y++){
      if(py[y] < EPS) continue;
      for(let x=0;x<N;x++){
        const p = J[y][x] / py[y];
        if(p > EPS) hxy -= py[y] * p * Math.log(p);
      }
    }
    return hxy / LN2;
  }

  const m = api.missions([
    {text:'Full independence (c = 0): confirm <b>H(X|Y) = H(X)</b> -- learning Y helps not at all', xp:15, check:s=>s.c<0.02&&Math.abs(s.hxGivenY-s.hx)<0.01},
    {text:'Watch I grow: raise c to 0.6 -- I(X;Y) should exceed <b>0.6 bits</b>', xp:20, check:s=>s.mi>0.6},
    {text:'Deterministic (c = 1): I(X;Y) = H(X) -- Y tells you everything about X', xp:25, check:s=>s.c>0.99&&s.mi>1.55},
  ]);

  function draw(){
    clearBg(L.ctx, L.W, L.H);
    const J = buildJoint(c);
    const px = Array(N).fill(0);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++) px[x] += J[y][x];
    const hx = entropy(px);
    const hxGivenY = condEntropy(J);
    const mi = hx - hxGivenY;
    const ff = getComputedStyle(document.body).fontFamily;

    // two entropy bars: H(X) and H(X|Y)
    const BX = 60, BW = L.W - 120, BH = 50, gap = 30;
    const maxH = Math.log2(N) + 0.1;

    // H(X) bar
    const hxFrac = hx / maxH;
    L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '700 12px ' + ff;
    L.ctx.fillText('H(X) -- uncertainty about X before learning Y', BX, 50);
    L.ctx.fillStyle = 'rgba(124,92,255,.65)';
    L.ctx.fillRect(BX, 58, BW * hxFrac, BH);
    L.ctx.strokeStyle = 'rgba(255,255,255,.2)'; L.ctx.lineWidth = 1;
    L.ctx.strokeRect(BX, 58, BW, BH);
    L.ctx.fillStyle = '#fff'; L.ctx.font = '800 14px ' + ff;
    L.ctx.fillText(hx.toFixed(3) + ' bits', BX + 8, 88);

    // H(X|Y) bar
    const hxyFrac = hxGivenY / maxH;
    L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '700 12px ' + ff;
    L.ctx.fillText('H(X|Y) -- remaining uncertainty after observing Y', BX, 58 + BH + gap + 6);
    L.ctx.fillStyle = 'rgba(45,212,160,.65)';
    L.ctx.fillRect(BX, 58 + BH + gap + 14, BW * hxyFrac, BH);
    L.ctx.strokeStyle = 'rgba(255,255,255,.2)'; L.ctx.lineWidth = 1;
    L.ctx.strokeRect(BX, 58 + BH + gap + 14, BW, BH);
    L.ctx.fillStyle = '#fff'; L.ctx.font = '800 14px ' + ff;
    L.ctx.fillText(hxGivenY.toFixed(3) + ' bits', BX + 8, 58 + BH + gap + 44);

    // I(X;Y) annotation
    const iy0 = 58 + BH + gap + 14;
    const iy1 = 58 + BH;
    if(mi > 0.02){
      const midX = BX + BW * hxFrac;
      L.ctx.fillStyle = 'rgba(0,212,255,.6)';
      L.ctx.fillRect(midX + 4, iy0 - 4, BW * mi / maxH - 8, iy1 - iy0 + BH + 8);
      L.ctx.fillStyle = '#fff'; L.ctx.font = '700 11px ' + ff; L.ctx.textAlign = 'center';
      if(BW * mi / maxH > 40)
        L.ctx.fillText('I = ' + mi.toFixed(3), midX + BW * mi / maxH / 2, iy0 + (iy1 - iy0 + BH)/2 + 4);
      L.ctx.textAlign = 'left';
    }

    // coupling meter
    const CY = 58 + 2*BH + 2*gap + 40;
    L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '700 12px ' + ff;
    L.ctx.fillText('coupling c = ' + c.toFixed(2) + '   (0 = independent, 1 = X determined by Y)', BX, CY);
    L.ctx.fillStyle = 'rgba(255,201,77,.6)';
    L.ctx.fillRect(BX, CY + 10, BW * c, 14);
    L.ctx.strokeStyle = 'rgba(255,255,255,.2)'; L.ctx.lineWidth = 1;
    L.ctx.strokeRect(BX, CY + 10, BW, 14);

    L.readout.innerHTML =
      'c = ' + c.toFixed(2) + '<br>' +
      'H(X) = ' + hx.toFixed(3) + ' bits<br>' +
      'H(X|Y) = ' + hxGivenY.toFixed(3) + ' bits<br>' +
      '<b>I(X;Y) = H(X) − H(X|Y) = ' + mi.toFixed(3) + ' bits</b>';
    m.update({c, hx, hxGivenY, mi});
  }
  slider(L.ctrl, 'coupling  c  (0 = independent, 1 = X = Y)', 0, 1, 0.01, 0, v => v.toFixed(2), v => { c = v; draw(); });
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b style="color:#b9a8ff">Purple bar</b> = H(X) (full uncertainty). <b style="color:#7fe6c0">Green bar</b> = H(X|Y) (remaining uncertainty after seeing Y). The <b style="color:#00d4ff">cyan gap</b> is I(X;Y) -- the information Y gave you. At c = 1, H(X|Y) = 0 and I = H(X): Y tells you everything.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ------------------------------------------------------------------ */
/* Lab B-3: Predict -- is I zero here?                                */
/* ------------------------------------------------------------------ */
INTERACTIVES['infomi-predict'] = function(stage, api){
  const L = makeLab(stage);
  // Four preset joints; learner predicts independent vs dependent for each
  const CASES = [
    {name:'Case A', label:'Independent (outer product)',
     W:[[4,2,2],[2,1,1],[2,1,1]], isIndep:true},
    {name:'Case B', label:'Positively correlated',
     W:[[5,1,0],[1,3,1],[0,1,5]], isIndep:false},
    {name:'Case C', label:'Uniform joint',
     W:[[1,1,1],[1,1,1],[1,1,1]], isIndep:true},
    {name:'Case D', label:'Anti-diagonal',
     W:[[0,0,5],[0,4,0],[5,0,0]], isIndep:false},
  ];
  let caseIdx = 0;
  let predictions = {};  // caseIdx -> 'indep' | 'dep'
  let revealed = {};

  function heatColor(t){
    t = Math.max(0, Math.min(1, t));
    const stops = [[17,21,42],[30,60,130],[0,150,200],[0,212,255],[255,201,77]];
    const seg = t*(stops.length-1), i2 = Math.min(stops.length-2, Math.floor(seg)), f = seg-i2;
    const a = stops[i2], b = stops[i2+1];
    return 'rgb('+Math.round(a[0]+(b[0]-a[0])*f)+','+Math.round(a[1]+(b[1]-a[1])*f)+','+Math.round(a[2]+(b[2]-a[2])*f)+')';
  }
  function getJointNorm(W){
    let s = 0; for(const r of W) for(const v of r) s += v;
    return W.map(r => r.map(v => v/s));
  }
  function computeMI2(J){
    const N2 = J.length;
    const px = Array(N2).fill(0), py = Array(N2).fill(0);
    for(let y=0;y<N2;y++) for(let x=0;x<N2;x++){ px[x] += J[y][x]; py[y] += J[y][x]; }
    let mi = 0;
    for(let y=0;y<N2;y++) for(let x=0;x<N2;x++){
      if(J[y][x] > EPS) mi += J[y][x] * Math.log(J[y][x] / Math.max(px[x]*py[y], EPS));
    }
    return mi / LN2;
  }

  const m = api.missions([
    {text:'Predict correctly for <b>all 4</b> cases', xp:30, check:s=>s.allCorrect},
    {text:'Reveal <b>Case D</b> (anti-diagonal) -- see that anti-correlation is still dependence', xp:15, check:s=>s.revealedD},
    {text:'Predict <b>Case C</b> (uniform joint) correctly before revealing', xp:20, check:s=>s.correctC},
  ]);

  function countCorrect(){
    let n = 0;
    CASES.forEach((c, i) => {
      if(predictions[i] !== undefined && revealed[i]){
        const predIndep = predictions[i] === 'indep';
        if(predIndep === c.isIndep) n++;
      }
    });
    return n;
  }

  function draw(){
    clearBg(L.ctx, L.W, L.H);
    const ff = getComputedStyle(document.body).fontFamily;
    const c = CASES[caseIdx];
    const J = getJointNorm(c.W);
    const mi = computeMI2(J);
    const N2 = 3, cell = 80, ox = 60, oy = 60;

    L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = '800 13px ' + ff;
    L.ctx.fillText(c.name + ' -- what is I(X; Y)?', ox, oy - 14);

    let vmax = 1e-9; for(let y=0;y<N2;y++) for(let x=0;x<N2;x++) vmax = Math.max(vmax, J[y][x]);
    for(let y=0;y<N2;y++) for(let x=0;x<N2;x++){
      const yy = N2-1-y;
      L.ctx.fillStyle = heatColor(J[y][x]/vmax);
      L.ctx.fillRect(ox+x*cell+1, oy+yy*cell+1, cell-2, cell-2);
      L.ctx.fillStyle = J[y][x]/vmax>0.5 ? '#11152a' : '#cdd4f0';
      L.ctx.font = '700 13px ' + ff; L.ctx.textAlign = 'center';
      L.ctx.fillText(J[y][x].toFixed(2), ox+x*cell+cell/2, oy+yy*cell+cell/2+5);
      L.ctx.textAlign = 'left';
    }
    L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '600 11px ' + ff;
    for(let x=0;x<N2;x++){ L.ctx.textAlign = 'center'; L.ctx.fillText('X='+x, ox+x*cell+cell/2, oy+N2*cell+18); }
    for(let y=0;y<N2;y++){ L.ctx.textAlign = 'right'; L.ctx.fillText('Y='+y, ox-6, oy+(N2-1-y)*cell+cell/2+4); }
    L.ctx.textAlign = 'left';

    // prediction buttons / result
    const bY = oy + N2*cell + 46;
    if(!predictions[caseIdx]){
      L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = '700 12px ' + ff;
      L.ctx.fillText('Your prediction: is I(X;Y) = 0?', ox, bY);
    } else if(!revealed[caseIdx]){
      L.ctx.fillStyle = '#ffc94d'; L.ctx.font = '700 12px ' + ff;
      L.ctx.fillText('Predicted: ' + (predictions[caseIdx]==='indep' ? 'I = 0 (independent)' : 'I > 0 (dependent)') + ' -- hit Reveal to check!', ox, bY);
    } else {
      const correct = (predictions[caseIdx]==='indep') === c.isIndep;
      L.ctx.fillStyle = correct ? '#2dd4a0' : '#ff5c7a'; L.ctx.font = '700 12px ' + ff;
      L.ctx.fillText((correct ? '✅ Correct!' : '❌ Wrong!') + '  I(X;Y) = ' + mi.toFixed(3) + ' bits  (' + c.label + ')', ox, bY);
    }

    const allCorrect = CASES.every((_, i) => predictions[i] !== undefined && revealed[i] && ((predictions[i]==='indep') === CASES[i].isIndep));
    const revealedD = revealed[3];
    const correctC = predictions[2] !== undefined && revealed[2] && (predictions[2]==='indep') === CASES[2].isIndep;
    L.readout.innerHTML = 'Case ' + (caseIdx+1) + ' of 4: ' + c.name + '<br>' +
      'Predictions made: ' + Object.keys(predictions).length + '/4<br>' +
      'Correct so far: ' + countCorrect();
    m.update({allCorrect, revealedD, correctC});
  }

  // nav chips
  chips(L.ctrl, 'SELECT CASE',
    CASES.map(c => c.name),
    (i, btn, row) => {
      caseIdx = i;
      [...row.children].forEach(b => b.classList.remove('on')); btn.classList.add('on');
      draw();
    }
  );
  // predict row
  chips(L.ctrl, 'YOUR PREDICTION',
    ['I = 0 (independent)', 'I > 0 (dependent)'],
    (i, btn, row) => {
      predictions[caseIdx] = i === 0 ? 'indep' : 'dep';
      [...row.children].forEach(b => b.classList.remove('on')); btn.classList.add('on');
      draw();
    }
  );
  // reveal
  const d = document.createElement('div'); d.className = 'ctrl';
  const rb = document.createElement('button'); rb.className = 'chip';
  rb.textContent = 'Reveal true I';
  rb.onclick = () => { revealed[caseIdx] = true; draw(); };
  d.appendChild(rb); L.ctrl.appendChild(d);

  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">For each case: study the heatmap, predict whether I(X;Y) = 0 or not, then reveal. A uniform joint (Case C) is independent -- each cell equals (1/3)(1/3). Anti-diagonal (Case D) has zero cells AND full cells, clearly not a product: I &gt; 0.</div>';
  L.ctrl.appendChild(note);
  draw();
};
