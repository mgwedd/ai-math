/* ================================================================
   WORLD 3 — PROBABILITY & STATISTICS: the language models speak.
   Same registries, same schema as the other worlds (see index.js).
   Sequenced: random variables → distributions → Bayes → MLE →
   sampling/CLT → entropy & KL. Each lab earns the vocabulary that
   World 4 (ml-gpt's "probability distribution over tokens") spends.
   ================================================================ */
import { INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, slider, chips, plane, clearBg } from '../engine.js';

/* ---------- shared drawing helper: labeled bar chart ---------- */
function bars(ctx, W, H, data, opts){
  // data: [{label, v, color?}] with v in [0,1] of opts.vmax
  opts = opts || {};
  const pad = {l: 40, r: 16, t: 18, b: 34};
  const bw = (W - pad.l - pad.r) / data.length;
  const vmax = opts.vmax || Math.max(...data.map(d => d.v), 1e-9);
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad.l, H - pad.b); ctx.lineTo(W - pad.r, H - pad.b); ctx.stroke();
  ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
  data.forEach((d, i) => {
    const h = Math.min(H - pad.t - pad.b, (H - pad.t - pad.b) * (d.v / vmax));
    const x = pad.l + i * bw;
    ctx.fillStyle = d.color || 'rgba(0,212,255,.55)';
    ctx.fillRect(x + bw * .12, H - pad.b - h, bw * .76, h);
    if (data.length <= 24 || i % Math.ceil(data.length / 16) === 0){
      ctx.fillStyle = '#8b93b8'; ctx.textAlign = 'center';
      ctx.fillText(d.label, x + bw / 2, H - pad.b + 16);
    }
  });
  ctx.textAlign = 'left';
  return {x: i => pad.l + (i + .5) * bw, y0: H - pad.b, yOf: v => H - pad.b - (H - pad.t - pad.b) * (v / vmax)};
}

/* ================== 1 · RANDOM VARIABLES & EXPECTATION ================== */

registerLesson({
  id:'prob-rv', world:'prob', emoji:'🎲', title:'Random Variables & Expectation',
  sub:'A number attached to chance — and the long-run average it secretly promises.',
  learn:`<p>A <strong>random variable</strong> is not a label — it's a <em>function</em> from outcomes to numbers. Feed it an outcome (the face a die lands on, tomorrow's weather) and it returns a number (the pips, the clicks, the next token's score). The randomness lives in which outcome occurs; the function itself is fixed. Before the roll the value is undetermined — but it carries a <strong>distribution</strong>: each possible value with its probability.</p>
  <p>The single most useful summary is the <strong>expected value</strong> — the probability-weighted average:</p>
  <div class="formula">$$E[X] = \\sum x_i \\cdot P(X = x_i)$$</div>
  <p>For a fair die: E[X] = (1+2+3+4+5+6)/6 = <strong>3.5</strong>. Note that 3.5 is not a face of any die — expectation is a <em>long-run average</em>, not a prediction of one roll.</p>
  <p>The <strong>law of large numbers</strong> makes the promise concrete: as you roll more, the running sample mean converges to E[X]. But the convergence is <em>probabilistic</em>, not a guarantee for any fixed run — at finite n a standard error of σ/√n remains, so the mean still wobbles; it just wobbles less and less. Chance is noisy per-event and lawful in bulk.</p>`,
  ml:`Every loss you'll ever minimize is an expectation: \\(E[\\text{loss}(\\text{model}(x), y)]\\) over the data distribution. You can't compute it exactly — you <b>estimate it from samples</b> (a batch!), trusting the law of large numbers. "Training loss" is literally a running sample mean of a random variable.`,
  deeper:[
   {title:'😵 Stuck? The casino view', body:'A casino doesn\'t know what the next spin pays — and doesn\'t care. It knows E[payout] per spin, and the law of large numbers does the rest across a million spins. Expectation is the casino\'s certainty hiding inside each gambler\'s uncertainty.'},
   {title:'🚀 Go deeper: variance', body:'E[X] says where the average lands; <b>variance</b> E[(X−E[X])²] says how hard it swings. Two dice games can share E = 0 while one risks pennies and the other your house. ML twin: two gradient estimators can be equally right on average (unbiased) while one is far noisier — that\'s why batch size matters.'},
   {title:'🚀 Go deeper: linearity of expectation', body:'The most-used rule in all of probability: <b>E[X + Y] = E[X] + E[Y]</b>, and E[cX] = c·E[X] — and it holds <em>even when X and Y are dependent</em>, no independence needed. This is exactly why a mini-batch gradient is an <em>unbiased</em> estimate of the full-dataset gradient: the average of the per-example gradients has expectation equal to the true gradient, so SGD descends the real loss in expectation. (Beware: expectation is linear, but E[g(X)] ≠ g(E[X]) for nonlinear g — that gap is what variance and Jensen\'s inequality measure.)'},
   {title:'🚀 Go deeper: LOTUS — expectation of a function', body:'To get E[g(X)] you do NOT need the distribution of g(X) — the <b>Law of the Unconscious Statistician</b> lets you weight g by X\'s own probabilities: E[g(X)] = Σ g(xᵢ)·P(X = xᵢ). It\'s called "unconscious" because people apply it without noticing they skipped deriving a new distribution. This is the workhorse behind every expected-loss you compute: E[loss(model(x), y)] is just LOTUS over the data distribution.'},
   {title:'🚀 Go deeper: Jensen\'s inequality', body:'For a <em>convex</em> function f, <b>E[f(X)] ≥ f(E[X])</b> (concave flips it). The average of a curve\'s outputs sits above the curve at the average input — the two agree only when f is linear or X is constant. Consequences everywhere: E[X²] ≥ (E[X])² is just variance ≥ 0; and because log is concave, log E[·] ≥ E[log ·], which is exactly why the ELBO in variational inference is a valid lower bound. See Cover & Thomas, <em>Elements of Information Theory</em>.'},
   {title:'🚀 Go deeper: when E[X] doesn\'t even exist', body:'Expectation is a SUM (or integral) — and some sums diverge. Heavy-tailed distributions like the Cauchy have a mean integral that never converges, so E[X] is <em>undefined</em>: the sample mean of Cauchy draws never settles, no matter how many you take (the law of large numbers has nothing to converge to). Real-world cousins — wealth, city sizes, word frequencies — are heavy-tailed enough that "the average" can be dominated by one outlier. Never assume a mean exists just because you can compute a sample average.'}],
  labs:[
    {key:'explore', title:'Roll the die, watch the mean settle', interactive:'probrv',
     intro:'<p>Roll fair and loaded dice hundreds of times and watch the running sample mean converge to E[X] — the law of large numbers in action.</p>'},
    {key:'design', title:'Design a distribution to a mean', interactive:'probrvDesign',
     intro:'<p>Now construct: set the six face weights so the die has an <strong>exact</strong> target expectation. Predict a loaded die\'s E[X] first, then build one to spec.</p>'},
  ],
  quiz:[
   {q:'A fair six-sided die has expected value…', opts:['3.5','3','21','6'], a:0,
    tag:'expectation', focus:'Compute E[X] = Σ x·P(x) by hand for a die and one loaded variant.',
    why:'Weighted average: (1+2+3+4+5+6)·(1/6) = 21/6 = 3.5. Every face is equally weighted.',
    wrong:{1:'3 is the median face ⌊3.5⌋ — close, but expectation weights ALL faces: 21/6 = 3.5.',2:'21 is the SUM of the faces — you skipped the ÷6 weighting.',3:'6 is just the max. Expectation averages, it doesn\'t take the best case.'}},
   {q:'A random variable is best described as…', opts:['A number assigned to each random outcome','A variable whose value changes over time','Any unknown quantity','A probability'], a:0,
    tag:'random variables', focus:'A RV maps outcomes → numbers; the distribution attaches a probability to each value.',
    why:'It\'s a mapping from outcomes to numbers. The randomness lives in which outcome occurs; the variable just reports a number for it.',
    wrong:{1:'Time isn\'t required — one die roll is a perfectly good random variable.',2:'An unknown isn\'t random unless outcomes carry probabilities.',3:'A probability is a number in [0,1] attached to an event; the RV is the VALUE you observe.'}},
   {q:'E[X] = 3.5 but a die can never show 3.5. This is…', opts:['Fine — expectation is a long-run average, not a possible outcome','A contradiction in the definition','Proof the die is unfair','A rounding error'], a:0,
    tag:'expectation vs outcome', focus:'Expectation lives in the long run; single outcomes don\'t have to (and often can\'t) equal it.',
    why:'Expectation averages over the distribution. The average household has 2.3 people; no household does.',
    wrong:{1:'The definition never promises E[X] is attainable — it\'s a weighted average over outcomes.',2:'Fair dice genuinely have E = 3.5; unfairness would MOVE it, not explain it.',3:'No rounding involved: 21/6 is exactly 3.5.'}},
   {q:'You roll 10,000 times and the sample mean is 4.46. The die is most likely…', opts:['Loaded — the mean should have settled near 3.5 by now','Fair — anything can happen','Broken — means can\'t exceed 4','Impossible to say at any sample size'], a:0,
    tag:'law of large numbers', focus:'At large n the sample mean pins down E[X] tightly — big deviations become evidence, not noise.',
    why:'By 10,000 rolls a fair die\'s mean is within ~±0.05 of 3.5 almost surely. A persistent 4.46 means the weights, not the luck.',
    wrong:{1:'At n = 10,000 the standard error is ~0.017 — a 0.96 deviation is ~50σ. That\'s not luck.',2:'Sample means are bounded by the faces (1–6), but 4.46 is perfectly possible — for a LOADED die.',3:'Sample size is exactly what makes it sayable: more rolls = tighter pin on E[X].'}},
  ],
});
INTERACTIVES.probrv = function(stage, api){
  const L=makeLab(stage);
  const FAIR=[1,1,1,1,1,1].map(x=>x/6);
  const LOADED=[.1,.1,.1,.1,.1,.5];          // E = 1.5 + 3 = 4.5
  let mode='fair', counts=[0,0,0,0,0,0], total=0, sum=0, hist=[];
  const m=api.missions([
    {text:'Roll the die at least <b>100</b> times', xp:15, check:s=>s.total>=100},
    {text:'Fair die: roll ≥ <b>200</b> times and watch the mean settle within <b>0.15</b> of 3.5', xp:25, check:s=>s.mode==='fair'&&s.total>=200&&Math.abs(s.mean-3.5)<.15},
    {text:'Switch to the <b>loaded</b> die, roll ≥ 200 — where does the mean settle now?', xp:20, check:s=>s.mode==='loaded'&&s.total>=200&&s.mean>4.2},
  ]);
  function roll(n){
    const p = mode==='fair'?FAIR:LOADED;
    for(let r=0;r<n;r++){
      let u=Math.random(), f=0; while(f<5 && u>p[f]) {u-=p[f]; f++;}
      counts[f]++; total++; sum+=f+1;
      if(total<=2000 || total%10===0){ hist.push(sum/total); if(hist.length>400) hist.shift(); }
    }
    draw();
  }
  function reset(){ counts=[0,0,0,0,0,0]; total=0; sum=0; hist=[]; draw(); }
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    const E = mode==='fair'?3.5:4.5;
    // top: counts histogram
    const data=counts.map((c,i)=>({label:''+(i+1), v: total?c/total:0,
      color: i===5&&mode==='loaded'?'rgba(255,201,77,.7)':'rgba(0,212,255,.55)'}));
    L.ctx.save(); L.ctx.translate(0,0);
    bars(L.ctx,L.W,250,data,{vmax: mode==='loaded'?0.55:0.3});
    L.ctx.restore();
    // bottom: running-mean convergence strip
    const y0=270, h=150;
    L.ctx.strokeStyle='rgba(255,255,255,.12)'; L.ctx.strokeRect(40,y0,L.W-56,h);
    const my=v=>y0+h-(v-1)/5*h;
    L.ctx.setLineDash([5,5]); L.ctx.strokeStyle='rgba(255,201,77,.7)'; L.ctx.lineWidth=1.5;
    L.ctx.beginPath(); L.ctx.moveTo(40,my(E)); L.ctx.lineTo(L.W-16,my(E)); L.ctx.stroke(); L.ctx.setLineDash([]);
    if(hist.length>1){
      L.ctx.strokeStyle='#00d4ff'; L.ctx.lineWidth=2; L.ctx.beginPath();
      hist.forEach((v,i)=>{ const x=40+(L.W-56)*i/(hist.length-1), y=my(Math.max(1,Math.min(6,v)));
        i?L.ctx.lineTo(x,y):L.ctx.moveTo(x,y); });
      L.ctx.stroke();
    }
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='600 11px '+getComputedStyle(document.body).fontFamily;
    L.ctx.fillText('running mean → E[X] = '+E, 46, y0+14);
    const mean= total?sum/total:0;
    L.readout.innerHTML=(mode==='fair'?'FAIR die':'LOADED die (p(6) = ½)')+'<br>rolls = '+total+
      '<br>sample mean = '+(total?mean.toFixed(3):'—')+'<br>E[X] = '+E;
    m.update({mode,total,mean});
  }
  chips(L.ctrl,'ROLL',['🎲 ×1','🎲 ×10','🎲 ×100'],(i)=>roll([1,10,100][i]));
  chips(L.ctrl,'DIE',['Fair','Loaded'],(i,btn,row)=>{
    mode=i?'loaded':'fair'; reset();
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); });
  const d=document.createElement('div'); d.className='ctrl';
  const rb=document.createElement('button'); rb.className='chip'; rb.textContent='↺ Reset stats'; rb.onclick=reset;
  d.appendChild(rb); L.ctrl.appendChild(d);
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Top: how often each face came up. Bottom: the running sample mean stalking the dashed gold line E[X]. Single rolls are chaos; the average is destiny.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== 2 · COMMON DISTRIBUTIONS ================== */

registerLesson({
  id:'prob-dist', world:'prob', emoji:'📊', title:'Distributions: Shapes of Chance',
  sub:'Bernoulli, Binomial, Gaussian — three shapes that cover half of applied probability.',
  learn:`<p>A <strong>distribution</strong> is the full price list of chance: every value with its probability. Three workhorses:</p>
  <p><strong>Bernoulli(p)</strong> — one yes/no trial: 1 with probability p, else 0. The atom of probability. Its variance is p(1−p), a downward parabola <em>maximized at p = 0.5</em> (a fair coin is the most uncertain trial) and pinned to 0 at p = 0 or 1 (a foregone conclusion carries no variance).</p>
  <p><strong>Binomial(n, p)</strong> — count of successes in n independent Bernoulli trials:</p>
  <div class="formula">$$P(k) = C(n, k) \\cdot p^k (1-p)^{n-k}$$</div>
  <p><strong>Gaussian / Normal</strong>, written <strong>𝒩(μ, σ²)</strong> — the continuous bell: μ sets the center, and the second parameter is the <em>variance</em> σ² (σ itself is the standard deviation / spread — watch the slot, textbooks always put variance there). It appears whenever many small independent effects add up (next lessons make that precise), and it's the <em>maximum-entropy</em> distribution for a fixed mean and variance — the least-committal bell consistent with those two facts.</p>
  <p>Watch in the lab: crank a binomial's n and the bars <em>become</em> a bell. That's not coincidence — it's a theorem you'll meet in lesson 5. But the approximation isn't universal: the usual rule of thumb is that the normal fit is trustworthy only when <strong>np ≥ 5 and n(1−p) ≥ 5</strong>. With a very skewed p (say p = 0.02), you can have a large n and still have a lopsided, un-bell-like binomial.</p>`,
  ml:`A classifier's sigmoid output IS a Bernoulli parameter p. A language model's softmax IS a categorical distribution over tokens. Weight initialization draws from Gaussians. You can't read a single modern ML paper without these three shapes — they're the nouns of the field.`,
  deeper:[
   {title:'😵 Stuck? Parameters are knobs', body:'A distribution family is a machine; its parameters are the knobs. Bernoulli has one knob (p), Gaussian two (μ slides it, σ widens it). "Fitting a model" = turning knobs until the machine\'s output matches your data — exactly what lesson 4 (MLE) does with a principled rule.'},
   {title:'🚀 Go deeper: categorical & softmax', body:'Generalize Bernoulli from 2 outcomes to k and you get the <b>categorical</b> distribution — what a language model emits over its vocabulary every token. Softmax exists to turn raw scores into a valid categorical: positive, summing to 1. Temperature scales the scores before softmax: low T sharpens, high T flattens.'},
   {title:'🚀 Go deeper: the exponential family', body:'Bernoulli, binomial, Gaussian, categorical, Poisson, exponential, gamma, Beta — nearly every distribution you\'ll meet is a special case of one template, the <b>exponential family</b>: p(x | θ) = h(x)·exp(η(θ)·T(x) − A(θ)). This is not trivia — the shared structure is why softmax/sigmoid outputs, sufficient statistics (T(x)), and clean maximum-likelihood equations all keep reappearing. Generalized linear models are exactly "put an exponential-family distribution on the output". See Bishop, <em>Pattern Recognition and Machine Learning</em>, ch. 2.'},
   {title:'🚀 Go deeper: the Gaussian is the least-assuming bell', body:'Why does the Gaussian, of all shapes, sit at the center of statistics? Among <em>all</em> distributions with a given mean and variance, the Gaussian is the one with <b>maximum entropy</b> — it commits to nothing beyond those two facts. So reaching for a Gaussian isn\'t a strong modeling claim; it\'s the most honest "I only know the mean and spread" choice. (Fix a different constraint and maximum entropy hands you a different family — fix a mean on the positives and you get the exponential; this is the maximum-entropy view of the exponential family above.)'}],
  labs:[
    {key:'explore', title:'Bernoulli, Binomial, Gaussian', interactive:'probdist',
     intro:'<p>Flip between the three families and turn their knobs — watch a binomial become a bell as n grows.</p>'},
    {key:'match', title:'Hit a binomial\'s mean & variance', interactive:'probdistMatch',
     intro:'<p>Dial n and p so the binomial has a target mean np — and see why p = 0.5 is the widest, most uncertain trial. Predict the mean of Binomial(20, 0.5) first.</p>'},
  ],
  quiz:[
   {q:'"Number of heads in 100 coin flips" follows a…', opts:['Binomial distribution','Bernoulli distribution','Gaussian distribution','Uniform distribution'], a:0,
    tag:'choosing distributions', focus:'Bernoulli = one trial; Binomial = COUNT of successes over n trials.',
    why:'A count of successes over n independent identical trials is the binomial\'s exact job description. (One flip alone is Bernoulli.)',
    wrong:{1:'Bernoulli covers ONE flip. A hundred of them, counted, is binomial.',2:'Gaussian is continuous — head-counts are whole numbers. (Though the binomial\'s SHAPE approaches a bell…)',3:'Uniform would mean 0 heads is as likely as 50. Try flipping 100 coins and getting 0.'}},
   {q:'In a Gaussian, increasing σ…', opts:['Widens the bell without moving its center','Shifts the bell right','Makes the peak taller','Skews it asymmetric'], a:0,
    tag:'gaussian parameters', focus:'μ slides the bell; σ stretches it. Total area stays 1, so wider ⇒ shorter.',
    why:'σ is the spread knob. And since total area must stay 1, a wider bell is necessarily a shorter one.',
    wrong:{1:'Shifting is μ\'s job — σ only stretches around the center.',2:'Backwards: bigger σ spreads the same area wider, so the peak DROPS.',3:'A Gaussian is symmetric for every μ, σ. No knob skews it.'}},
   {q:'A binomial with n = 30, p = 0.5 looks strikingly like…', opts:['A Gaussian bell','A flat line','An exponential decay','Two separate peaks'], a:0,
    tag:'binomial→gaussian', focus:'Sum many independent coin flips and the bars trace a bell — CLT preview.',
    why:'A binomial is a SUM of n little Bernoullis — and sums of many independent pieces go Gaussian (the CLT, lesson 5).',
    wrong:{1:'Flat would mean all head-counts equally likely — but extreme counts need every flip to agree: vanishingly rare.',2:'Exponential decay is monotone; the binomial rises to a hump at np then falls.',3:'Two peaks would need two distinct clusters of outcomes; coin-flip counts pile around one center, np.'}},
   {q:'A model outputs 0.83 from a sigmoid for "spam". The right probabilistic reading is…', opts:['Spam ~ Bernoulli(0.83)','83% of the email is spam','The model is 83% accurate','P(spam) = 0.5 since there are 2 classes'], a:0,
    tag:'ml as distributions', focus:'Classifier outputs parameterize distributions over labels — that\'s the bridge from math to ML.',
    why:'The output parameterizes a Bernoulli over the label. Accuracy is a property of the model overall, not of this prediction.',
    wrong:{1:'The 0.83 describes THIS email\'s label uncertainty, not a fraction of its content.',2:'Accuracy is measured across many emails; the sigmoid speaks about one.',3:'Two classes doesn\'t mean 50/50 — the whole point of the model is to move p away from ignorance.'}},
  ],
});
INTERACTIVES.probdist = function(stage, api){
  const L=makeLab(stage);
  let type='bern', p=.5, n=10, mu=0, sg=1;
  const m=api.missions([
    {text:'Make the binomial perfectly <b>symmetric</b> (p = 0.5, n ≥ 10)', xp:15, check:s=>s.type==='binom'&&Math.abs(s.p-.5)<.011&&s.n>=10},
    {text:'CLT preview: crank the binomial to <b>n ≥ 25</b> and watch the bell emerge', xp:20, check:s=>s.type==='binom'&&s.n>=25},
    {text:'Gaussian: park <b>μ = 2.0</b> and sharpen to <b>σ ≤ 0.5</b>', xp:20, check:s=>s.type==='gauss'&&Math.abs(s.mu-2)<=.05&&s.sg<=.5},
  ]);
  const choose=(N,k)=>{ let r=1; for(let i=1;i<=k;i++) r=r*(N-k+i)/i; return r; };
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    if(type==='bern'){
      bars(L.ctx,L.W,L.H,[{label:'0 (fail)',v:1-p,color:'rgba(255,92,122,.55)'},{label:'1 (success)',v:p,color:'rgba(45,212,160,.6)'}],{vmax:1});
      L.readout.innerHTML='Bernoulli(p = '+p.toFixed(2)+')<br>E[X] = p = '+p.toFixed(2)+'<br>Var = p(1−p) = '+(p*(1-p)).toFixed(3);
    } else if(type==='binom'){
      const data=[...Array(n+1)].map((_,k)=>({label:''+k, v: choose(n,k)*Math.pow(p,k)*Math.pow(1-p,n-k)}));
      bars(L.ctx,L.W,L.H,data);
      L.readout.innerHTML='Binomial(n = '+n+', p = '+p.toFixed(2)+')<br>E[X] = np = '+(n*p).toFixed(1)+'<br>σ = √(np(1−p)) = '+Math.sqrt(n*p*(1-p)).toFixed(2);
    } else {
      const P=plane(L.ctx,L.W,L.H,72,L.W/2,L.H-60);
      P.grid();
      P.fn(x=>Math.exp(-(x-mu)*(x-mu)/(2*sg*sg))/(sg*Math.sqrt(2*Math.PI))*3,'#7c5cff',3);
      L.ctx.setLineDash([5,5]); L.ctx.strokeStyle='rgba(255,201,77,.6)'; L.ctx.lineWidth=1.5;
      L.ctx.beginPath(); L.ctx.moveTo(P.sx(mu),0); L.ctx.lineTo(P.sx(mu),L.H); L.ctx.stroke(); L.ctx.setLineDash([]);
      L.readout.innerHTML='Normal(μ = '+mu.toFixed(2)+', σ = '+sg.toFixed(2)+')<br>peak height ∝ 1/σ<br>~68% of mass within μ ± σ';
    }
    m.update({type,p,n,mu,sg});
  }
  chips(L.ctrl,'DISTRIBUTION',['Bernoulli','Binomial','Gaussian'],(i,btn,row)=>{
    type=['bern','binom','gauss'][i];
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); });
  slider(L.ctrl,'p — success probability (Bernoulli/Binomial)',0.01,0.99,0.01,0.5,v=>v.toFixed(2),v=>{p=v;draw();});
  slider(L.ctrl,'n — number of trials (Binomial)',1,40,1,10,v=>''+v,v=>{n=v;draw();});
  slider(L.ctrl,'μ — center (Gaussian)',-3,3,0.05,0,v=>v.toFixed(2),v=>{mu=v;draw();});
  slider(L.ctrl,'σ — spread (Gaussian)',0.2,2,0.01,1,v=>v.toFixed(2),v=>{sg=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Each slider drives the distribution named in its label — pick a family with the chips, then turn its knobs. The binomial bars at large n are quietly drawing you a Gaussian.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== 3 · BAYES' THEOREM ================== */

registerLesson({
  id:'prob-bayes', world:'prob', emoji:'🩺', title:'Bayes\' Theorem: Updating Beliefs',
  sub:'A positive test for a rare disease usually means… you\'re fine. Learn why, forever.',
  learn:`<p><strong>Bayes' theorem</strong> tells you how to update a belief when evidence arrives:</p>
  <div class="formula">$$P(H \\mid E) = \\dfrac{P(E \\mid H) \\cdot P(H)}{P(E)}$$</div>
  <p>Read: <em>posterior = likelihood × prior, normalized.</em> The three pieces:</p>
  <p>• <strong>Prior</strong> P(H) — how plausible the hypothesis was before the evidence<br>
  • <strong>Likelihood</strong> P(E|H) — how strongly the hypothesis predicts this evidence<br>
  • <strong>Posterior</strong> P(H|E) — your updated belief</p>
  <p>The classic shocker: a disease hits 1% of people; the test catches 99% of cases (sensitivity) and false-alarms on 5% of healthy people. You test positive. P(sick) ≈ <strong>17%</strong>, not 99% — because the 5% false-alarm rate applied to the <em>huge healthy majority</em> produces far more false positives than the rare disease produces true ones. The prior is not optional.</p>`,
  ml:`Spam filters are literally "naive Bayes". Diffusion models invert a noising process with Bayes-flavored math. And the deepest framing in the field: <b>training is belief updating</b> — a prior over parameters, updated by the likelihood of data. When ML people say "the model is confident but wrong", they're describing a posterior gone bad.`,
  deeper:[
   {title:'😵 Stuck? Count people, not percentages', body:'Take 10,000 people. Sick: 100, of whom the test flags 99. Healthy: 9,900, of whom 5% = 495 get false-flagged. Positives total 99 + 495 = 594; truly sick: 99/594 ≈ 17%. Bayes is just careful counting — the formula is bookkeeping for this exact tally.'},
   {title:'🚀 Go deeper: odds form', body:'Bayes is cleaner in odds: posterior odds = prior odds × likelihood ratio. Rare disease = tiny prior odds (1:99); a positive test multiplies by LR = 99%/5% ≈ 20 → posterior odds ≈ 20:99 ≈ 17%. One multiplication, no normalizer. Chain multiple independent tests by multiplying their LRs.'},
   {title:'🚀 Go deeper: the prosecutor\'s fallacy', body:'"The DNA match has a 1-in-a-million chance if the suspect is innocent, so there\'s a 1-in-a-million chance he\'s innocent." Wrong — that swaps P(evidence | innocent) for P(innocent | evidence), the <b>transposed conditional</b>. It\'s the base-rate fallacy wearing a courtroom suit: with a large suspect pool, a 1-in-a-million match rate still produces several matching innocents, so the posterior of guilt can be far from certain. Same math as the disease test — P(E|H) is not P(H|E).'},
   {title:'🚀 Go deeper: sequential updating', body:'Bayes composes. Run a second, independent test and your <em>posterior from the first test becomes the prior for the second</em>. A single positive on the rare disease left you at ~17%; feed that 17% back in as the new prior and a second positive vaults you past 80%. Beliefs accumulate evidence one observation at a time — and the order you process the data in doesn\'t change where you end up.'},
   {title:'🚀 Go deeper: conjugate priors (Beta–Binomial)', body:'For some prior/likelihood pairs the posterior stays in the same family — a <b>conjugate prior</b> — so updating is just arithmetic on the parameters, no integral. The headline case: a <b>Beta(α, β)</b> prior on a coin\'s bias, updated by binomial data of h heads and t tails, gives a <b>Beta(α + h, β + t)</b> posterior. You can literally read the update as "add your successes to α and failures to β." This is the closed-form engine behind the sequential-updating lab.'},
   {title:'🚀 Go deeper: MAP estimation = weight decay', body:'Maximizing the <em>posterior</em> over parameters instead of the likelihood is <b>MAP</b> estimation — it multiplies the likelihood by a prior P(θ). Take the −log and the prior becomes an additive penalty on the loss. A <b>Gaussian prior</b> on the weights turns into an L2 penalty λ‖θ‖² — i.e. <b>weight decay is a Gaussian prior</b>, and a Laplace prior gives L1. So regularization isn\'t a hack bolted onto training; it\'s Bayes putting a prior on your parameters.'}],
  labs:[
   {key:'onehit', title:'The one-test shocker', interactive:'probbayes',
    intro:'<p>The classic base-rate trap. Set the disease\'s <b>prevalence</b> (your prior), the test\'s <b>sensitivity</b> and <b>specificity</b>, and watch the posterior fall out of a careful headcount of 10,000 people. A "99% accurate" test on a rare disease still leaves you near 17% — find which slider actually rescues it.</p>'},
   {key:'seq', title:'Sequential updating: posterior → prior', interactive:'probbayesseq',
    intro:'<p>One positive test is weak evidence — so run the <b>same test again</b>. Each result\'s posterior becomes the <b>prior</b> for the next round: 1% → ~17% → ~80% → 99%+. Watch belief compound as independent positives accumulate, and see a stray negative knock it back down. This is how Bayesian reasoning behaves over a stream of data.</p>'},
  ],
  quiz:[
   {q:'Disease: 1% prevalence. Test: 99% sensitivity, 95% specificity. You test positive. P(diseased) ≈ ?', opts:['17%','99%','95%','1%'], a:0,
    tag:'posterior computation', focus:'Run the 10,000-people count: true positives vs false positives from the healthy majority.',
    why:'Of 10,000 people: 99 true positives, ~495 false positives. 99/594 ≈ 17%. The healthy majority\'s false alarms swamp the rare true cases.',
    wrong:{1:'99% is the test\'s sensitivity — P(positive|sick), not P(sick|positive). Flipping these is THE classic error this lesson exists to kill.',2:'95% is specificity — a property of the test on healthy people, not your posterior.',3:'1% was your prior, BEFORE the test. The positive result does move you — from 1% up to ~17%.'}},
   {q:'In Bayes\' theorem, the posterior is proportional to…', opts:['likelihood × prior','likelihood ÷ prior','prior − likelihood','evidence × posterior'], a:0,
    tag:'bayes structure', focus:'Memorize the skeleton: posterior ∝ likelihood × prior. The evidence term just renormalizes.',
    why:'P(H|E) ∝ P(E|H)·P(H). What the evidence says (likelihood) scales what you already believed (prior).',
    wrong:{1:'Dividing by the prior would make rare hypotheses MORE believable on weak evidence — backwards.',2:'Probabilities multiply through Bayes; nothing is subtracted.',3:'Evidence P(E) sits in the DENOMINATOR as a normalizer — and the posterior is the output, not an input.'}},
   {q:'Why does a rare disease make a positive test less convincing?', opts:['False positives from the huge healthy pool outnumber the rare true positives','Rare diseases break test chemistry','Sensitivity drops for rare diseases','It doesn\'t — accuracy is accuracy'], a:0,
    tag:'base rates', focus:'Rarity means the false-positive pool dwarfs the true-positive pool, even with a great test.',
    why:'5% of 9,900 healthy people is 495 false alarms vs only 99 true positives. The prior (rarity) shapes the answer as much as the test does.',
    wrong:{1:'Test chemistry doesn\'t know prevalence — the numbers (sens/spec) are unchanged. What changes is the POPULATION the test runs on.',2:'Sensitivity is fixed by the test, not the disease rate. The arithmetic of the healthy majority does all the damage.',3:'It does matter — run the 10,000-person count and watch 17% fall out of a "99% accurate" test.'}},
   {q:'Ignoring P(H) and judging only by how well evidence fits is called…', opts:['The base-rate fallacy','Overfitting','The law of large numbers','Regularization'], a:0,
    tag:'base-rate fallacy', focus:'Name the error: dropping the prior. "The test is 99% accurate, so I\'m 99% sick" is its anthem.',
    why:'The base-rate fallacy: treating the likelihood as the posterior. Bayes exists precisely to stop you doing this.',
    wrong:{1:'Overfitting is a model-fitting failure (memorizing noise). Ignoring priors is a reasoning failure.',2:'The law of large numbers is about sample means converging — unrelated to dropping priors.',3:'Regularization is, if anything, the OPPOSITE: it injects a prior into training.'}},
  ],
});
INTERACTIVES.probbayes = function(stage, api){
  const L=makeLab(stage);
  let prev=1, sens=99, spec=95; // percents
  const m=api.missions([
    {text:'Recreate the shocker: prevalence ≤ 1%, sensitivity ≥ 99%, and posterior still <b>below 20%</b>', xp:20, check:s=>s.prev<=1&&s.sens>=99&&s.post<.2},
    {text:'Rescue the test: keep prevalence ≤ 1% and push the posterior <b>≥ 80%</b> (which knob actually works?)', xp:25, check:s=>s.prev<=1&&s.post>=.8},
    {text:'Prior power: cap both sens and spec at ≤ 92% and reach posterior ≥ 50% <b>using prevalence alone</b>', xp:20, check:s=>s.sens<=92&&s.spec<=92&&s.post>=.5},
  ]);
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    const p=prev/100, se=sens/100, sp=spec/100;
    const N=10000, sick=N*p, healthy=N-sick;
    const TP=sick*se, FP=healthy*(1-sp), pos=TP+FP, post=pos?TP/pos:0;
    const ff=getComputedStyle(document.body).fontFamily;
    // population strip
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='700 12px '+ff;
    L.ctx.fillText('POPULATION — 10,000 people', 40, 34);
    const x0=40, w=L.W-80;
    L.ctx.fillStyle='rgba(139,147,184,.25)'; L.ctx.fillRect(x0,44,w,38);
    L.ctx.fillStyle='rgba(255,92,122,.75)'; L.ctx.fillRect(x0,44,Math.max(1.5,w*p),38);
    L.ctx.fillStyle='#cdd4f0'; L.ctx.font='600 11px '+ff;
    L.ctx.fillText(Math.round(sick)+' sick', x0, 98);
    L.ctx.textAlign='right'; L.ctx.fillText(Math.round(healthy)+' healthy', x0+w, 98); L.ctx.textAlign='left';
    // arrows
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='700 12px '+ff;
    L.ctx.fillText('⬇ the test flags…', 40, 138);
    // positives bar split TP vs FP
    L.ctx.fillText('EVERYONE WHO TESTED POSITIVE — '+Math.round(pos)+' people', 40, 178);
    const tpw = pos? w*TP/pos : 0;
    L.ctx.fillStyle='rgba(255,92,122,.85)'; L.ctx.fillRect(x0,188,tpw,46);
    L.ctx.fillStyle='rgba(255,201,77,.8)'; L.ctx.fillRect(x0+tpw,188,w-tpw,46);
    L.ctx.fillStyle='#11152a'; L.ctx.font='800 13px '+ff;
    if(tpw>120) L.ctx.fillText(Math.round(TP)+' truly sick', x0+8, 216);
    if(w-tpw>150){ L.ctx.fillText(Math.round(FP)+' healthy false alarms', x0+tpw+8, 216); }
    L.ctx.fillStyle='#cdd4f0'; L.ctx.font='600 11px '+ff;
    if(tpw<=120) L.ctx.fillText(Math.round(TP)+' truly sick →', x0, 250);
    // posterior gauge
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='700 12px '+ff;
    L.ctx.fillText('P(sick | positive) — the posterior', 40, 300);
    L.ctx.fillStyle='rgba(139,147,184,.2)'; L.ctx.fillRect(x0,310,w,30);
    L.ctx.fillStyle=post>.7?'rgba(45,212,160,.85)':post>.3?'rgba(255,201,77,.85)':'rgba(255,92,122,.85)';
    L.ctx.fillRect(x0,310,w*post,30);
    L.ctx.fillStyle='#fff'; L.ctx.font='800 16px '+ff;
    L.ctx.fillText((post*100).toFixed(1)+'%', x0+w*post+8>x0+w-70? x0+w-70 : x0+w*post+8, 332);
    L.readout.innerHTML='prior P(sick) = '+(p*100).toFixed(1)+'%<br>P(+|sick) = '+sens+'%   P(−|healthy) = '+spec+'%<br><b>posterior = '+(post*100).toFixed(1)+'%</b>';
    m.update({prev,sens,spec,post});
  }
  slider(L.ctrl,'prevalence — % of population sick (the PRIOR)',0.1,30,0.1,1,v=>v.toFixed(1)+'%',v=>{prev=v;draw();});
  slider(L.ctrl,'sensitivity — % of sick the test catches',80,99.9,0.1,99,v=>v.toFixed(1)+'%',v=>{sens=v;draw();});
  slider(L.ctrl,'specificity — % of healthy correctly cleared',90,99.9,0.1,95,v=>v.toFixed(1)+'%',v=>{spec=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Top bar: the population (red = sick). Middle bar: ONLY the people who tested positive — <b style="color:#ff9db1">red</b> truly sick, <b style="color:#ffc94d">gold</b> false alarms. The posterior is just red ÷ (red + gold). Watch which slider actually moves it.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* --- Bayes lab 2: sequential updating — posterior becomes the next prior --- */
INTERACTIVES.probbayesseq = function(stage, api){
  const L=makeLab(stage);
  let prev=1, sens=99, spec=95;             // percents (slider-driven starting prior + test)
  let belief=prev/100;                      // current posterior probability of "sick"
  let steps=[{r:'prior', b:belief}];        // history of {result, belief-after}
  let peak=belief;                          // best belief reached this run (for the mission)
  let sawHigh=false, droppedBelow=false;
  const m=api.missions([
    {text:'Chain the evidence: apply enough <b>positive</b> results to push belief past <b>80%</b>', xp:20, check:s=>s.peak>=.8},
    {text:'Overwhelming case: get belief past <b>99%</b> with repeated positives', xp:20, check:s=>s.peak>=.99},
    {text:'Evidence cuts both ways: after climbing high, apply a <b>negative</b> and knock belief back <b>below 50%</b>', xp:20, check:s=>s.droppedBelow&&s.sawHigh},
  ]);
  function update(positive){
    const se=sens/100, sp=spec/100, pr=belief;
    // Bayes with the CURRENT belief as prior; likelihood is the test result.
    const like1 = positive ? se : (1-se);          // P(result | sick)
    const like0 = positive ? (1-sp) : sp;          // P(result | healthy)
    const denom = like1*pr + like0*(1-pr);
    belief = denom>0 ? (like1*pr)/denom : pr;
    if(belief>peak) peak=belief;
    if(belief>=.8) sawHigh=true;
    if(sawHigh && belief<.5) droppedBelow=true;
    steps.push({r: positive?'+':'−', b:belief});
    if(steps.length>40) steps=steps.slice(-40);
    draw();
  }
  function resetRun(){ belief=prev/100; peak=belief; steps=[{r:'prior', b:belief}];
    sawHigh=false; droppedBelow=false; draw(); }
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    const ff=getComputedStyle(document.body).fontFamily;
    // --- history strip: one bar per applied test, height = belief AFTER it ---
    const pad={l:44,r:20,t:60,b:40};
    const plotH=L.H-pad.t-pad.b-70;
    const y0=pad.t+plotH;
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='700 12px '+ff;
    L.ctx.fillText('BELIEF P(sick) AFTER EACH TEST', pad.l, pad.t-14);
    // gridlines at 50% and 80%
    L.ctx.lineWidth=1;
    [[.5,'50%'],[.8,'80%']].forEach(pair=>{
      const v=pair[0], lab=pair[1], y=y0-plotH*v;
      L.ctx.setLineDash([4,4]); L.ctx.strokeStyle='rgba(255,255,255,.12)';
      L.ctx.beginPath(); L.ctx.moveTo(pad.l,y); L.ctx.lineTo(L.W-pad.r,y); L.ctx.stroke(); L.ctx.setLineDash([]);
      L.ctx.fillStyle='#6b7299'; L.ctx.font='600 10px '+ff; L.ctx.textAlign='right';
      L.ctx.fillText(lab, pad.l-4, y+4); L.ctx.textAlign='left';
    });
    L.ctx.strokeStyle='rgba(255,255,255,.25)'; L.ctx.beginPath();
    L.ctx.moveTo(pad.l,y0); L.ctx.lineTo(L.W-pad.r,y0); L.ctx.stroke();
    const n=steps.length, bw=(L.W-pad.l-pad.r)/Math.max(n,12);
    steps.forEach((s,i)=>{
      const h=plotH*Math.max(0,Math.min(1,s.b)), x=pad.l+i*bw;
      L.ctx.fillStyle = s.r==='prior' ? 'rgba(139,147,184,.6)'
                      : s.r==='+' ? 'rgba(255,92,122,.75)' : 'rgba(45,212,160,.7)';
      L.ctx.fillRect(x+bw*.14, y0-h, bw*.72, h);
      if(bw>14){ L.ctx.fillStyle='#8b93b8'; L.ctx.font='700 11px '+ff; L.ctx.textAlign='center';
        L.ctx.fillText(s.r, x+bw/2, y0+16); L.ctx.textAlign='left'; }
    });
    // --- current posterior gauge ---
    const gy=L.H-46;
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='700 12px '+ff;
    L.ctx.fillText('current belief', pad.l, gy-8);
    L.ctx.fillStyle='rgba(139,147,184,.2)'; L.ctx.fillRect(pad.l,gy,L.W-pad.l-pad.r,26);
    L.ctx.fillStyle=belief>.7?'rgba(45,212,160,.85)':belief>.3?'rgba(255,201,77,.85)':'rgba(255,92,122,.85)';
    L.ctx.fillRect(pad.l,gy,(L.W-pad.l-pad.r)*belief,26);
    L.ctx.fillStyle='#fff'; L.ctx.font='800 15px '+ff;
    L.ctx.fillText((belief*100).toFixed(2)+'%', pad.l+8, gy+19);
    const tests=steps.length-1;
    L.readout.innerHTML='start prior = '+prev.toFixed(1)+'%<br>tests applied = '+tests+
      '<br><b>belief now = '+(belief*100).toFixed(2)+'%</b><br>peak this run = '+(peak*100).toFixed(2)+'%';
    m.update({peak,sawHigh,droppedBelow});
  }
  chips(L.ctrl,'APPLY A TEST RESULT (posterior → new prior)',['✚ Positive','− Negative'],(i)=>update(i===0));
  const d=document.createElement('div'); d.className='ctrl';
  const rb=document.createElement('button'); rb.className='chip'; rb.textContent='↺ Reset to prior';
  rb.onclick=resetRun; d.appendChild(rb); L.ctrl.appendChild(d);
  slider(L.ctrl,'starting prevalence — the first prior',0.1,30,0.1,1,v=>v.toFixed(1)+'%',v=>{prev=v;resetRun();});
  slider(L.ctrl,'sensitivity — % of sick the test catches',80,99.9,0.1,99,v=>v.toFixed(1)+'%',v=>{sens=v;draw();});
  slider(L.ctrl,'specificity — % of healthy correctly cleared',90,99.9,0.1,95,v=>v.toFixed(1)+'%',v=>{spec=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Each <b style="color:#ff9db1">positive</b> and <b style="color:#7fe6c0">negative</b> is fed to Bayes with your <b>current</b> belief as the prior — so evidence compounds. Start at 1%, tap Positive a few times, and watch belief march 1% → 17% → 80% → 99%+. One Negative, and Bayes takes it back. Order never changes the destination.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== 4 · MAXIMUM LIKELIHOOD ================== */

registerLesson({
  id:'prob-mle', world:'prob', emoji:'🎯', title:'Maximum Likelihood Estimation',
  sub:'"Which parameters make my data least surprising?" — the principle behind nearly every loss function.',
  learn:`<p>You have data and a family of distributions. Which member fits best? <strong>Maximum likelihood</strong> answers: the parameters under which the observed data was <em>most probable</em>:</p>
  <div class="formula">$$\\theta^* = \\underset{\\theta}{\\text{argmax}} \\ P(\\text{data} \\mid \\theta) = \\underset{\\theta}{\\text{argmax}} \\prod p(x_i \\mid \\theta)$$</div>
  <p>That product form quietly assumes the data is <strong>i.i.d.</strong> — independent and identically distributed. Independence is what lets P(data | θ) factor into a product of per-point terms; "identically distributed" is what lets the same θ describe every xᵢ. When data is correlated (time series, sequences) this exact product is wrong, and you factor with the chain rule of probability instead.</p>
  <p>Products of many small numbers are numerically miserable, and sums are easier to differentiate — so everyone maximizes the <strong>log-likelihood</strong> instead (the log is monotone, so the argmax doesn't move):</p>
  <div class="formula">$$\\log L(\\theta) = \\sum \\log p(x_i \\mid \\theta)$$</div>
  <p>For a Gaussian, calculus gives a famous answer: the MLE of μ is the <strong>sample mean</strong>, and of σ² the average squared deviation \\(\\dfrac{1}{n}\\sum (x_i - \\hat{\\mu})^2\\). Note that divides by <strong>n</strong>, not n−1 — so the MLE of variance is slightly <em>biased</em> (it underestimates on average; the unbiased estimator uses n−1). In the lab you'll find both by hand — drag the bell until the data stops being surprising. And remember MLE returns a single best-fit point, with no built-in measure of how uncertain it is.</p>
  <p>One trap: σ too small means the bell is <em>overconfident</em> — points in its tails become astronomically unlikely and the log-likelihood craters. Confidence is expensive.</p>`,
  ml:`This is where loss functions COME FROM. Minimizing <b>MSE</b> = MLE under Gaussian noise <em>with a fixed (constant) σ</em> — that\'s the fine print: only when σ doesn\'t depend on the parameters does the −log-likelihood reduce to plain squared error (let σ vary and extra log-σ terms appear). Minimizing <b>cross-entropy</b> = MLE for a categorical model — which is exactly how GPT is trained: maximize the log-probability of the next token, summed over the internet. "Training" is this lab, scaled up.`,
  deeper:[
   {title:'😵 Stuck? The surprise dial', body:'log p(x) is "how unsurprised the model is by x". The log-likelihood adds up surprise over your dataset. MLE just says: turn the knobs until the total surprise is as low as possible. Dragging the bell over the data points IS that — you can see surprise fall as the curve covers them.'},
   {title:'🚀 Go deeper: MLE → loss functions', body:'Write −log of a Gaussian likelihood and the (x−μ)²/2σ² term IS squared error — minimizing MSE and maximizing Gaussian likelihood are the same optimization. Do it for a categorical and you get cross-entropy. Add a prior and maximize the posterior instead (MAP): the log-prior term becomes weight decay. Three pillars of ML, one principle.'},
   {title:'🚀 Go deeper: likelihood is NOT a distribution over θ', body:'The likelihood L(θ) = p(data | θ) is read as a function of θ, but it does <em>not</em> integrate to 1 over θ and is <b>not a probability distribution over the parameters</b> — calling p(θ | data) "the probability the parameter is θ" is a Bayesian statement that needs a prior (that\'s the posterior, and MAP, not MLE). MLE treats θ as a fixed unknown and just asks which value makes the observed data most probable. Conflating the two is one of the most common statistical slips.'},
   {title:'🚀 Go deeper: the MLE of σ² is biased', body:'The Gaussian MLE of variance divides the summed squared deviations by <b>n</b>; the <em>unbiased</em> estimator divides by <b>n−1</b> (Bessel\'s correction). The MLE systematically underestimates σ² because it measures spread around the sample mean — which was itself fit to the data, so the points hug it more tightly than they hug the true μ. The bias vanishes as n → ∞, which is why nobody worries about it at scale, but it\'s a clean example that MLEs can be biased even when they\'re otherwise excellent.'},
   {title:'🚀 Go deeper: why statisticians love the MLE', body:'Under mild conditions the MLE is <b>consistent</b> (it converges to the true θ as n grows), <b>asymptotically efficient</b> (no unbiased estimator beats its variance in the large-n limit — it attains the Cramér–Rao bound), and satisfies the <b>invariance property</b>: the MLE of g(θ) is just g(θ̂), so you can estimate in whatever parameterization is convenient. These guarantees — not mere convenience — are why maximum likelihood is the default estimator across the sciences. See Casella & Berger, <em>Statistical Inference</em>.'},
   {title:'🚀 Go deeper: MLE = minimizing KL to the data', body:'Maximizing the average log-likelihood is <em>identical</em> to minimizing KL(p_data ‖ p_θ), the divergence from the true data distribution to your model. Proof sketch: KL(p_data‖p_θ) = −H(p_data) − E_data[log p_θ], and only the second term depends on θ — maximizing E_data[log p_θ] (the log-likelihood) minimizes the KL. So MLE isn\'t an arbitrary rule; it\'s "make your model\'s distribution as close as possible, in KL, to reality." This is the exact bridge to the cross-entropy lesson.'}],
  labs:[
    {key:'explore', title:'Drag the bell over the data', interactive:'probmle',
     intro:'<p>Slide a Gaussian over the data until the points stop being surprising — maximum likelihood, felt by hand.</p>'},
    {key:'fit', title:'Coin-flip maximum likelihood', interactive:'probmleFit',
     intro:'<p>The canonical MLE: for a coin, slide p to the peak of the log-likelihood and read off p̂ = heads / total. Push p to the edges and watch the curve crater.</p>'},
  ],
  quiz:[
   {q:'MLE chooses parameters that…', opts:['Maximize the probability of the observed data','Maximize the probability of the parameters','Minimize the number of parameters','Fit every data point exactly'], a:0,
    tag:'mle principle', focus:'MLE: argmax over θ of P(data|θ). The data is fixed; the knobs move.',
    why:'θ* = argmax P(data|θ): make what you actually saw least surprising. (Maximizing P(θ|data) would be MAP — that needs a prior.)',
    wrong:{1:'P(parameters|data) is the POSTERIOR — maximizing it is MAP estimation and requires a prior. MLE flips the conditioning.',2:'Parameter count is architecture/model selection, a different question entirely.',3:'Fitting every point exactly is interpolation — usually catastrophic overfitting, and not what "most probable data" means.'}},
   {q:'We maximize LOG-likelihood instead of likelihood because…', opts:['Sums beat products numerically and the argmax is unchanged','The log makes probabilities bigger','Likelihood can be negative','It changes the answer to a better one'], a:0,
    tag:'log-likelihood', focus:'log is monotone: same argmax. It turns Π into Σ — stable numbers, easy derivatives.',
    why:'log is strictly increasing, so argmax is preserved — and Π p(xᵢ) becomes Σ log p(xᵢ): no underflow, term-by-term gradients.',
    wrong:{1:'log of a number in (0,1) is NEGATIVE — it makes them smaller (and that\'s fine; we only compare).',2:'Likelihoods are products of densities — never negative. Log-likelihoods are routinely negative, harmlessly.',3:'Monotone transforms can\'t move an argmax. Same answer, friendlier arithmetic.'}},
   {q:'The MLE of a Gaussian\'s μ given samples x₁…xₙ is…', opts:['The sample mean','The sample median','The midpoint of min and max','Always 0'], a:0,
    tag:'gaussian mle', focus:'Differentiate Σ −(xᵢ−μ)²/2σ², set to zero → μ = mean. You verified it by dragging.',
    why:'Set d/dμ of the log-likelihood to zero and the sample mean falls out — the bell\'s best center is the data\'s center of mass.',
    wrong:{1:'The median is more robust to outliers but it is NOT the Gaussian MLE — the calculus delivers the mean.',2:'Min-max midpoint is the uniform distribution\'s flavor of estimate, not the Gaussian\'s.',3:'Only if your data happens to center at 0. The MLE follows the data, not the origin.'}},
   {q:'GPT\'s training objective — maximize Σ log P(next token | context) — is…', opts:['Maximum likelihood estimation on text','K-means clustering','A heuristic with no probabilistic meaning','Bayesian inference over weights'], a:0,
    tag:'mle in ml', focus:'Next-token cross-entropy IS the log-likelihood of the corpus under the model.',
    why:'It\'s textbook MLE: the model defines P(text), training maximizes the log-probability of the real corpus. Cross-entropy loss is its negative.',
    wrong:{1:'K-means is clustering — no likelihood, no probability model over text.',2:'It has an exact probabilistic meaning — that\'s the beauty: the loss everyone uses IS a log-likelihood.',3:'Bayesian inference would maintain a distribution over weights; GPT training finds one point estimate by MLE.'}},
  ],
});
INTERACTIVES.probmle = function(stage, api){
  const L=makeLab(stage);
  // sample mean = 1.2, sample σ = 0.497 (MLE targets)
  const X=[0.4, 0.9, 1.1, 1.3, 1.7, 2.0, 0.7, 1.5];
  const MEAN=1.2, SIG=Math.sqrt(X.reduce((s,x)=>s+(x-MEAN)*(x-MEAN),0)/X.length);
  let mu=0, sg=1;
  const ll=(m_,s_)=>X.reduce((a,x)=>a-0.5*Math.log(2*Math.PI*s_*s_)-(x-m_)*(x-m_)/(2*s_*s_),0);
  const MAXLL=ll(MEAN,SIG);
  const m=api.missions([
    {text:'Center the bell: get μ within <b>0.05</b> of the data\'s center of mass', xp:20, check:s=>Math.abs(s.mu-MEAN)<.05},
    {text:'Find the summit: log-likelihood within <b>0.05</b> of the maximum (tune σ too!)', xp:25, check:s=>s.ll>=MAXLL-.05},
    {text:'Overconfidence is punished: squeeze <b>σ ≤ 0.2</b> and watch log L crater below −15', xp:15, check:s=>s.sg<=.21&&s.ll<-15},
  ]);
  const P=plane(L.ctx,L.W,L.H,120,L.W/2-60,L.H-80);
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const pdf=x=>Math.exp(-(x-mu)*(x-mu)/(2*sg*sg))/(sg*Math.sqrt(2*Math.PI));
    P.fn(x=>pdf(x),'#7c5cff',3);
    // per-point likelihood stems
    for(const x of X){
      const y=pdf(x);
      L.ctx.strokeStyle='rgba(0,212,255,.5)'; L.ctx.lineWidth=1.5; L.ctx.setLineDash([3,3]);
      L.ctx.beginPath(); L.ctx.moveTo(P.sx(x),P.sy(0)); L.ctx.lineTo(P.sx(x),P.sy(y)); L.ctx.stroke();
      L.ctx.setLineDash([]);
      P.dot(x,0,5.5,'#ffc94d'); P.dot(x,y,3.5,'#00d4ff');
    }
    const v=ll(mu,sg);
    // likelihood meter
    const ff=getComputedStyle(document.body).fontFamily;
    const frac=Math.max(0,Math.min(1,(v+30)/(MAXLL+30)));
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='700 11px '+ff; L.ctx.fillText('log-likelihood', 16, 24);
    L.ctx.fillStyle='rgba(139,147,184,.2)'; L.ctx.fillRect(16,32,200,14);
    L.ctx.fillStyle=frac>.97?'rgba(45,212,160,.9)':'rgba(124,92,255,.9)';
    L.ctx.fillRect(16,32,200*frac,14);
    L.readout.innerHTML='μ = '+mu.toFixed(2)+'   σ = '+sg.toFixed(2)+'<br>log L = '+v.toFixed(2)+'<br>max possible = '+MAXLL.toFixed(2)+(v>=MAXLL-.05?'  🏔️ SUMMIT!':'');
    m.update({mu,sg,ll:v});
  }
  slider(L.ctrl,'μ — slide the bell',-1,3,0.01,0,v=>v.toFixed(2),v=>{mu=v;draw();});
  slider(L.ctrl,'σ — width / confidence',0.1,2,0.01,1,v=>v.toFixed(2),v=>{sg=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b style="color:#ffc94d">Gold dots</b> = your data (on the axis). Each dashed stem rises to the curve: that height is p(xᵢ) — the point\'s likelihood. log L adds the logs of all stems. Make the curve cover the data… but beware of squeezing too hard.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== 5 · SAMPLING & THE CLT ================== */

registerLesson({
  id:'prob-clt', world:'prob', emoji:'🔔', title:'Sampling & the Central Limit Theorem',
  sub:'Average enough of anything and a bell appears. The most magical theorem in statistics.',
  learn:`<p>Take any distribution — flat, skewed, two-humped, ugly. Draw n samples, average them, and repeat many times. The <strong>central limit theorem</strong> says the distribution of those <em>averages</em> approaches a Gaussian as n grows — <strong>regardless of the source's shape</strong>:</p>
  <div class="formula">$$\\bar{x}_n \\ \\longrightarrow\\ \\mathcal{N}\\!\\left(\\mu, \\dfrac{\\sigma^2}{n}\\right) \\quad \\text{(standard deviation } \\sigma/\\sqrt{n}\\text{)}$$</div>
  <p>Two separate miracles in one line:</p>
  <p>• The <em>shape</em> goes bell, whatever you started with.<br>
  • The <em>spread</em> shrinks like <strong>σ/√n</strong> — quadruple the sample, halve the noise.</p>
  <p>That √n is why polls quote margins of error, why labs repeat measurements, and why this is the most-used theorem in applied statistics. It's also why the Gaussian is everywhere: anything that's a sum of many small independent effects — noise, heights, measurement error — has been CLT'd into a bell.</p>`,
  ml:`A <b>minibatch gradient</b> is a sample mean of per-example gradients — so the CLT governs training noise: batch size 4× larger → gradient noise 2× smaller (with diminishing returns, hence the art of batch sizing). Evaluation works the same way: benchmark scores are sample means, and their error bars shrink like 1/√n.`,
  deeper:[
   {title:'😵 Stuck? Why averages go bell-shaped', body:'For an average to land far from μ, MANY samples must conspire in the same direction — exponentially unlikely. Landing near μ has countless ways to happen (highs cancel lows). Count the ways and the bell curve is what "number of ways" looks like. Extremes need conspiracies; the middle just needs indifference.'},
   {title:'🚀 Go deeper: what the CLT does NOT say', body:'It does NOT say "everything is Gaussian". Heavy-tailed distributions (wealth, word frequencies, viral posts) violate the finite-variance fine print or converge uselessly slowly. It speaks about SUMS/AVERAGES of many comparable, independent pieces. When one piece can dominate the sum — one billionaire in the room — expect no bell.'}],
  labs:[
    {key:'explore', title:'Averages become a bell', interactive:'probclt',
     intro:'<p>Average samples from any source — flat, skewed, bimodal — and watch a Gaussian emerge, tightening as n grows.</p>'},
    {key:'se', title:'The standard-error law', interactive:'probcltSE',
     intro:'<p>The quantitative half of the CLT: dial σ and n to hit a target standard error σ/√n, and feel why cutting the error in half needs four times the data.</p>'},
  ],
  quiz:[
   {q:'The CLT says that as n grows, the distribution of SAMPLE MEANS approaches…', opts:['A Gaussian, regardless of the source distribution','The source distribution','A uniform distribution','Zero'], a:0,
    tag:'clt statement', focus:'CLT is about the distribution of AVERAGES, and it forgets the source\'s shape.',
    why:'That\'s the magic: average enough independent draws and the source\'s shape washes out — only μ and σ survive, in bell form.',
    wrong:{1:'Only at n = 1. The whole theorem is that growing n ERASES the source\'s shape.',2:'Uniform is just another source that gets bell-ified like everything else.',3:'The SPREAD shrinks toward zero, but the distribution\'s shape goes Gaussian around μ — it doesn\'t collapse to the number 0.'}},
   {q:'Sample means from a distribution with σ = 2, at n = 100, have standard deviation…', opts:['0.2','2','0.02','20'], a:0,
    tag:'standard error', focus:'Standard error = σ/√n. Memorize the √: 4× data → 2× precision.',
    why:'σ/√n = 2/√100 = 2/10 = 0.2. Precision buys at √n prices — to halve the noise, quadruple the data.',
    wrong:{1:'2 is the SOURCE σ — single draws. Averages of 100 are far steadier: divide by √100.',2:'0.02 divides by n = 100 instead of √n = 10. The square root is the entire point.',3:'20 multiplies by √n. Averaging REDUCES noise; more samples can\'t make the mean wilder.'}},
   {q:'With n = 1, the histogram of "sample means" looks like…', opts:['The source distribution itself','A perfect bell','A flat line','A single spike'], a:0,
    tag:'n=1 edge case', focus:'A mean of one sample IS the sample. CLT needs n to grow before the bell appears.',
    why:'Averaging one draw changes nothing — you\'re histogramming raw samples. The bell only emerges as n climbs.',
    wrong:{1:'The bell needs averaging to emerge — one draw has nothing to average.',2:'Flat happens only if the SOURCE is flat (and n = 1 shows the source).',3:'A spike would mean every draw lands identically — only true if the source has zero variance.'}},
   {q:'Batch size 32 → 128 (4×). Gradient noise (std of the batch-mean gradient) becomes roughly…', opts:['Half','A quarter','Unchanged','Four times larger'], a:0,
    tag:'clt in training', focus:'Batch gradients are sample means → noise scales 1/√n. 4× batch = 2× less noise.',
    why:'Noise ∝ 1/√n: √4 = 2× reduction. Linear cost, square-root benefit — the eternal economics of batch sizing.',
    wrong:{1:'A quarter would need 16× the batch (1/√16). Tempting linear thinking; the √ says otherwise.',2:'Bigger batches genuinely average out more noise — that\'s why they\'re used.',3:'More averaging cannot AMPLIFY noise — direction is right only if you confuse n with 1/n.'}},
  ],
});
INTERACTIVES.probclt = function(stage, api){
  const L=makeLab(stage);
  let src='uniform', n=1, means=[];
  const SRC={
    uniform:{f:()=>6*Math.random(), mu:3, name:'Uniform'},
    skewed:{f:()=>6*Math.random()*Math.random(), mu:1.5, name:'Skewed'},   // 6·u·v: mean 1.5, piled left
    bimodal:{f:()=>{ const g=(Array.from({length:12},Math.random).reduce((a,b)=>a+b)-6)*0.5;
      return Math.max(0,Math.min(6,(Math.random()<.5?1:5)+g)); }, mu:3, name:'Bimodal'},
  };
  const m=api.missions([
    {text:'Ground truth: at <b>n = 1</b>, collect ≥ 300 "means" — you\'re seeing the raw source shape', xp:15, check:s=>s.n===1&&s.count>=300},
    {text:'The bell: pick a <b>non-uniform</b> source, set <b>n ≥ 30</b>, collect ≥ 300 means', xp:25, check:s=>s.src!=='uniform'&&s.n>=30&&s.count>=300},
    {text:'σ/√n in action: with n ≥ 30, get the std of your means below <b>0.45</b> (≥ 200 means)', xp:20, check:s=>s.n>=30&&s.count>=200&&s.sd<.45},
  ]);
  function sampleMean(){ const f=SRC[src].f; let s=0; for(let i=0;i<n;i++) s+=f(); return s/n; }
  function add(k){ for(let i=0;i<k;i++) means.push(sampleMean()); if(means.length>20000) means=means.slice(-20000); draw(); }
  function reset(){ means=[]; draw(); }
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    const B=48, hist=Array(B).fill(0);
    for(const v of means){ const b=Math.max(0,Math.min(B-1,Math.floor(v/6*B))); hist[b]++; }
    const mx=Math.max(...hist,1);
    bars(L.ctx,L.W,L.H,hist.map((c,i)=>({label:(i%8===0)?(i/B*6).toFixed(0):'', v:c/mx,
      color:'rgba(0,212,255,.55)'})),{vmax:1});
    // source mean marker
    const mu=SRC[src].mu;
    L.ctx.setLineDash([5,5]); L.ctx.strokeStyle='rgba(255,201,77,.7)'; L.ctx.lineWidth=1.5;
    const px=40+(L.W-56)*(mu/6);
    L.ctx.beginPath(); L.ctx.moveTo(px,18); L.ctx.lineTo(px,L.H-34); L.ctx.stroke(); L.ctx.setLineDash([]);
    const count=means.length;
    const mean=count?means.reduce((a,b)=>a+b,0)/count:0;
    const sd=count>1?Math.sqrt(means.reduce((a,b)=>a+(b-mean)*(b-mean),0)/count):0;
    L.readout.innerHTML=SRC[src].name+' source · n = '+n+'<br>means collected = '+count+
      '<br>mean of means = '+(count?mean.toFixed(3):'—')+'<br>std of means = '+(count>1?sd.toFixed(3):'—');
    m.update({src,n,count,sd});
  }
  chips(L.ctrl,'SOURCE DISTRIBUTION',['Uniform','Skewed','Bimodal'],(i,btn,row)=>{
    src=['uniform','skewed','bimodal'][i]; means=[];
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); });
  slider(L.ctrl,'n — samples per average',1,50,1,1,v=>''+v,v=>{n=v;means=[];draw();});
  chips(L.ctrl,'COLLECT SAMPLE MEANS',['+1','+100','+1000'],(i)=>add([1,100,1000][i]));
  const d=document.createElement('div'); d.className='ctrl';
  const rb=document.createElement('button'); rb.className='chip'; rb.textContent='↺ Clear histogram'; rb.onclick=reset;
  d.appendChild(rb); L.ctrl.appendChild(d);
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Each click draws n samples from the source, records their AVERAGE, and histograms it. n = 1 shows the raw source. Then raise n: any source, same bell — tightening around the dashed gold μ like σ/√n promises.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== 6 · ENTROPY & KL DIVERGENCE ================== */

registerLesson({
  id:'prob-entropy', world:'prob', emoji:'🌡️', title:'Entropy & KL Divergence',
  sub:'Measure surprise, measure wrongness — the two numbers behind every loss curve you\'ll ever stare at.',
  learn:`<p><strong>Entropy</strong> measures the uncertainty in a distribution — the average surprise per outcome, in bits:</p>
  <div class="formula">$$H(P) = -\\sum p_i \\log_2 p_i$$</div>
  <p>Uniform over 4 outcomes → H = 2 bits (maximally unsure: two yes/no questions to pin down the answer). All mass on one outcome → H = 0 (no surprise left).</p>
  <p><strong>KL divergence</strong> measures how wrong it is to believe Q when the truth is P:</p>
  <div class="formula">$$KL(P \\| Q) = \\sum p_i \\log_2 \\left(\\dfrac{p_i}{q_i}\\right)$$</div>
  <p>It's the <em>extra</em> surprise you pay for using the wrong beliefs — zero only when Q = P, and brutal when Q says "nearly impossible" about something P actually does. Note it's <strong>not symmetric</strong>: KL(P‖Q) ≠ KL(Q‖P). Wrongness has a direction.</p>`,
  ml:`<b>Cross-entropy loss</b> — the loss of GPT, of every classifier — is H(P) + KL(P‖Q): the data's own entropy (fixed) plus your model's divergence from it. So minimizing cross-entropy IS minimizing KL to the true distribution. When a loss curve goes down, you are literally watching KL(data ‖ model) shrink, bit by bit.`,
  deeper:[
   {title:'😵 Stuck? Entropy as 20-questions', body:'H is the average number of optimal yes/no questions to identify the outcome. Uniform-over-4 needs 2 questions: 2 bits. If one outcome has 99% probability you barely ever need to ask: ~0.08 bits. Surprise = questions = bits — one currency, three names.'},
   {title:'🚀 Go deeper: why KL is asymmetric', body:'KL(P‖Q) weights errors by P — it punishes Q for assigning low probability where REALITY (P) puts mass. KL(Q‖P) weights by Q — it punishes Q for putting mass where reality has none. Fitting a model by minimizing one or the other gives different behavior: mode-covering vs mode-seeking. In RLHF, the KL penalty keeps the tuned model from drifting too far from the base model — direction chosen deliberately.'}],
  labs:[
    {key:'explore', title:'Surprise & the cost of wrong beliefs', interactive:'probent',
     intro:'<p>Shape the true distribution P and the model\'s belief Q, and read the price of being wrong — KL(P‖Q) in bits.</p>'},
    {key:'compute', title:'Compute entropy to a target', interactive:'probentCompute',
     intro:'<p>Shape a 4-outcome distribution to hit exact entropy targets: 1 bit (a fair coin\'s worth), 1.5 bits, and the 2-bit uniform maximum. Predict a fair coin\'s entropy first.</p>'},
  ],
  quiz:[
   {q:'Over 4 outcomes, entropy is maximized by…', opts:['The uniform distribution (H = 2 bits)','All mass on one outcome','Any asymmetric distribution','H has no maximum'], a:0,
    tag:'max entropy', focus:'Uniform = maximal ignorance = max entropy: log₂(4) = 2 bits for 4 outcomes.',
    why:'Maximal uncertainty is spread-evenly: H = log₂(4) = 2 bits. Any concentration of belief reduces surprise on average.',
    wrong:{1:'All mass on one outcome is H = 0 — MINIMUM entropy. You\'ve confused certainty with uncertainty.',2:'Any asymmetry means some outcome is more predictable — average surprise drops below 2 bits.',3:'It does: log₂(k) bits for k outcomes, achieved exactly at uniform.'}},
   {q:'A distribution has H = 0. This means…', opts:['One outcome has probability 1 — no uncertainty at all','All outcomes are equally likely','The distribution is invalid','Probabilities are negative'], a:0,
    tag:'zero entropy', focus:'H = 0 ⟺ certainty: a single outcome carries all the mass.',
    why:'Zero average surprise means there\'s never any surprise: the outcome is predetermined. (Equally likely is the OPPOSITE extreme.)',
    wrong:{1:'Equally likely is MAXIMUM entropy (2 bits over 4 outcomes) — the far end of the scale from 0.',2:'Perfectly valid: P = (1,0,0,0) is a legitimate distribution. Boring, but legitimate.',3:'Probabilities are never negative anywhere in probability theory — and entropy\'s formula doesn\'t need them to hit 0.'}},
   {q:'KL(P ‖ Q) = 0 exactly when…', opts:['P = Q','P and Q are independent','Both are uniform','Never — KL is always positive'], a:0,
    tag:'kl basics', focus:'KL ≥ 0 always, with equality iff the distributions match exactly (Gibbs\' inequality).',
    why:'KL is the extra surprise from believing Q instead of truth P — and there\'s no extra exactly when your beliefs are correct.',
    wrong:{1:'Independence is a property of JOINT distributions of two variables — KL here compares two beliefs about the SAME variable.',2:'Two uniforms over the same outcomes are equal, so KL = 0 — but that\'s because they\'re EQUAL, not because they\'re uniform.',3:'KL ≥ 0 always, but it DOES reach 0 — precisely at Q = P.'}},
   {q:'Cross-entropy loss decomposes as H(data) + KL(data ‖ model). Training minimizes…', opts:['Only the KL term — H(data) is a constant of the dataset','Only H(data)','Both terms equally','Neither; cross-entropy is unrelated'], a:0,
    tag:'cross-entropy', focus:'H(data) doesn\'t depend on the model — gradient descent can only attack the KL term.',
    why:'The data\'s own entropy is fixed; every step of training shrinks KL(data‖model). Loss curves are KL curves with a constant offset.',
    wrong:{1:'H(data) is what training would minimize if it could — but no model choice changes the dataset\'s own entropy.',2:'They\'re not symmetric in the model\'s eyes: only KL contains θ.',3:'Cross-entropy is THE standard loss — the decomposition is exact, not an analogy.'}},
  ],
});
INTERACTIVES.probent = function(stage, api){
  const L=makeLab(stage);
  const NAMES=['A','B','C','D'];
  let wp=[1,1,1,1], wq=[1,1,1,1];          // raw slider weights
  const EPS=0.02;
  const norm=w=>{ const s=w.reduce((a,b)=>a+b,0)+4*EPS; return w.map(x=>(x+EPS)/s); };
  const H=p=>p.reduce((a,x)=>a-(x>0?x*Math.log2(x):0),0);
  const KL=(p,q)=>p.reduce((a,x,i)=>a+(x>0?x*Math.log2(x/q[i]):0),0);
  const m=api.missions([
    {text:'Maximize uncertainty: <b>H(P) ≥ 1.99 bits</b> (what shape must P be?)', xp:15, check:s=>s.h>=1.99},
    {text:'Collapse it: <b>H(P) ≤ 0.3 bits</b> — near-certainty', xp:15, check:s=>s.h<=.3},
    {text:'Make wrong beliefs expensive: <b>KL(P ‖ Q) ≥ 2 bits</b> — put P\'s mass where Q least expects it', xp:25, check:s=>s.klpq>=2},
  ]);
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    const p=norm(wp), q=norm(wq);
    const ff=getComputedStyle(document.body).fontFamily;
    // grouped bars: P solid, Q outline
    const pad={l:50,r:20,t:30,b:40}, gw=(L.W-pad.l-pad.r)/4;
    L.ctx.strokeStyle='rgba(255,255,255,.25)'; L.ctx.beginPath();
    L.ctx.moveTo(pad.l,L.H-pad.b); L.ctx.lineTo(L.W-pad.r,L.H-pad.b); L.ctx.stroke();
    const hmax=L.H-pad.t-pad.b;
    NAMES.forEach((nm,i)=>{
      const x=pad.l+i*gw;
      L.ctx.fillStyle='rgba(124,92,255,.7)';
      L.ctx.fillRect(x+gw*.12, L.H-pad.b-hmax*p[i], gw*.34, hmax*p[i]);
      L.ctx.strokeStyle='rgba(255,201,77,.9)'; L.ctx.lineWidth=2;
      L.ctx.strokeRect(x+gw*.52, L.H-pad.b-hmax*q[i], gw*.34, hmax*q[i]);
      L.ctx.fillStyle='#8b93b8'; L.ctx.font='700 13px '+ff; L.ctx.textAlign='center';
      L.ctx.fillText(nm, x+gw/2, L.H-pad.b+22); L.ctx.textAlign='left';
    });
    L.ctx.fillStyle='rgba(124,92,255,.9)'; L.ctx.fillRect(pad.l,8,12,12);
    L.ctx.fillStyle='#cdd4f0'; L.ctx.font='600 12px '+ff; L.ctx.fillText('P (truth)', pad.l+18, 18);
    L.ctx.strokeStyle='rgba(255,201,77,.9)'; L.ctx.strokeRect(pad.l+110,8,12,12);
    L.ctx.fillText('Q (model\'s belief)', pad.l+128, 18);
    const h=H(p), klpq=KL(p,q), klqp=KL(q,p);
    L.readout.innerHTML='H(P) = '+h.toFixed(3)+' bits<br>KL(P‖Q) = '+klpq.toFixed(3)+' bits<br>KL(Q‖P) = '+klqp.toFixed(3)+' bits'+
      (Math.abs(klpq-klqp)>.3?'<br><span style="color:#ffc94d">⚠ not symmetric!</span>':'');
    m.update({h,klpq,klqp});
  }
  NAMES.forEach((nm,i)=>slider(L.ctrl,'P weight on '+nm,0,10,0.5,1,v=>v.toFixed(1),v=>{wp[i]=v;draw();}));
  chips(L.ctrl,'Q — THE MODEL\'S BELIEF',['Uniform','Sure it\'s A','Sure it\'s D','Copy P'],(i,btn,row)=>{
    if(i===0) wq=[1,1,1,1];
    else if(i===1) wq=[8.5,.5,.5,.5];
    else if(i===2) wq=[.5,.5,.5,8.5];
    else wq=[...wp];
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); });
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Sliders shape the true distribution <b style="color:#b9a8ff">P</b>; chips set the model\'s belief <b style="color:#ffc94d">Q</b>. KL(P‖Q) is what believing Q costs you per outcome, in bits. Try "Sure it\'s A" while P is sure it\'s D — then read the bill.</div>';
  L.ctrl.appendChild(note);
  draw();
};
