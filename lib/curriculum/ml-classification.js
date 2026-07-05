/* ================================================================
   WORLD 3 — ML, CLASSIFICATION DEPTH:
   Logistic regression & regularization.
   Cashes in World 3's MLE + Bernoulli and the priors/MAP story:
   sigmoid + cross-entropy, L2↔Gaussian prior, L1↔Laplace prior,
   and the log-odds linear model behind every decision boundary.
   Same registries, same schema as every other world.
   ================================================================ */
import { LESSONS, INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, slider, chips, plane, clearBg, fmt2 } from '../engine.js';

const sigmoid = z => 1/(1+Math.exp(-z));

/* ================================================================
   LESSON 1 — Logistic regression as maximum likelihood
   ================================================================ */
registerLesson({
  id:'ml-logreg', world:'ml', order:20, emoji:'🪤', title:'Logistic Regression: Maximum Likelihood',
  sub:'A line splits two classes; the sigmoid turns distance-from-the-line into probability; cross-entropy is just the negative log-likelihood.',
  learn:`<p>You have points in two classes — call them <b>0</b> and <b>1</b>. A <strong>logistic regression</strong> draws a straight <strong>decision boundary</strong> and, crucially, doesn't just say "left or right" — it outputs a <em>probability</em>. It scores each point with a linear function and squashes that score through the <strong>sigmoid</strong>:</p>
  <div class="formula">z = w·x + b        p = σ(z) = 1 / (1 + e<sup>−z</sup>)</div>
  <p>• On the boundary, z = 0 and p = 0.5 (maximum uncertainty).<br>
  • Far on the "1" side, z ≫ 0 and p → 1.<br>
  • Far on the "0" side, z ≪ 0 and p → 0.</p>
  <p>How do we pick w and b? <strong>Maximum likelihood</strong> (World 3!). Each label is a <strong>Bernoulli</strong> draw with probability p, so the likelihood of the whole dataset is a product of p for the 1-points and (1−p) for the 0-points. Taking −log turns that product into a sum — the <strong>cross-entropy</strong> (a.k.a. negative log-likelihood) loss:</p>
  <div class="formula">NLL = − Σ [ yᵢ ln pᵢ + (1−yᵢ) ln(1−pᵢ) ]</div>
  <p>Minimizing this NLL <em>is</em> maximizing the likelihood. The lab lets you drag the weights and watch the loss respond: confident-and-right is nearly free; confident-and-wrong is punished harshly by that logarithm.</p>`,
  ml:`This is the single most common classifier on Earth and the <b>output layer of essentially every neural net that predicts a category</b>. The multi-class version is the softmax head you met in GPTs; the two-class version is exactly this sigmoid. "Cross-entropy loss", "log loss", "negative log-likelihood", "logistic loss" are four names for the same object you're about to minimize by hand. Every image classifier, spam filter, and click-through model rides on it.`,
  deeper:[
   {title:'😵 Stuck? Why the log?', body:'Multiplying thousands of probabilities underflows to zero on a real computer, and products are painful to differentiate. Taking the log turns the product into a sum — easy to add up, easy to take gradients of — and because log is monotone, the maximum lands in exactly the same place. So we maximize the log-likelihood, which is the same as minimizing its negative: the NLL.'},
   {title:'🚀 Go deeper: why not just squared error?', body:'You could measure (y − p)² like a regression, but it pairs badly with the sigmoid: when a point is confidently wrong the squared-error gradient <em>vanishes</em> (the sigmoid saturates), so learning stalls exactly when it should be fastest. Cross-entropy has a beautifully clean gradient — <code>∇ = (p − y)·x</code>, the prediction error times the input — which never saturates on the wrong side. That clean gradient is a big part of why logistic regression trains so reliably.'},
   {title:'🚀 Go deeper: it\'s convex', body:'The NLL of logistic regression is a <b>convex</b> function of (w, b) — one bowl, no local traps (World 3\'s convexity lesson). So gradient descent is guaranteed to find the global optimum. Neural nets lose this the moment you stack nonlinear layers, but the humble single logistic unit keeps it.'}],
  interactive:'mllogreg',
  quiz:[
   {q:'A logistic model outputs, for one point, p = 0.5. That point sits…', opts:['Exactly on the decision boundary','Deep inside the class-1 region','Deep inside the class-0 region','Infinitely far from the boundary'], a:0,
    tag:'sigmoid at the boundary', focus:'p = σ(z); p = 0.5 exactly when z = w·x + b = 0. The boundary is the z = 0 contour.',
    why:'σ(z) = 0.5 exactly when z = 0, and z = 0 is the definition of the decision boundary — the model is maximally uncertain there.',
    wrong:{1:'Deep in the class-1 region z ≫ 0, so p → 1, not 0.5.',2:'Deep in the class-0 region z ≪ 0, so p → 0, not 0.5.',3:'Far from the boundary p is pushed toward 0 or 1; p = 0.5 is the one place you\'re ON it.'}},
   {q:'Minimizing cross-entropy (log loss) is the same thing as…', opts:['Maximizing the likelihood of the labels under the model','Maximizing classification accuracy directly','Minimizing the squared distance to the boundary','Maximizing the margin like an SVM'], a:0,
    tag:'NLL = MLE', focus:'Cross-entropy is the negative log-likelihood of Bernoulli labels. −log is monotone, so its minimum = the likelihood\'s maximum.',
    why:'The labels are Bernoulli draws; their likelihood is a product of p and (1−p) terms. −log turns it into cross-entropy, so minimizing NLL maximizes likelihood.',
    wrong:{1:'Accuracy is a non-differentiable step function — you can\'t descend on it directly. Cross-entropy is its smooth, trainable surrogate.',2:'Squared distance is a geometric quantity; cross-entropy scores predicted probabilities, not distances.',3:'Max-margin is the SVM objective — a different loss. Logistic regression maximizes label likelihood.'}},
   {q:'A point is class 1 but the model confidently predicts p = 0.01. Its contribution to the loss is…', opts:['Huge — the −ln of a tiny probability blows up','Zero — confident predictions are never penalized','Slightly negative','Exactly 1'], a:0,
    tag:'confident-and-wrong', focus:'For a class-1 point the loss term is −ln p. As p→0, −ln p → +∞. Confident wrongness is punished hardest.',
    why:'For a true-1 point the loss is −ln p = −ln(0.01) ≈ 4.6 — large. Push p toward 0 and it heads to infinity: being confidently wrong is the most expensive mistake.',
    wrong:{1:'Confidence is only free when it\'s RIGHT. Confident and wrong is exactly what the log blows up on.',2:'Loss is a sum of non-negative terms; it never goes negative.',3:'−ln(0.01) ≈ 4.6, not 1. The value grows without bound as p → 0.'}},
   {q:'Why squash the linear score w·x + b through a sigmoid at all?', opts:['To turn an unbounded score into a probability in (0, 1)','To make the boundary curved instead of straight','To speed up matrix multiplication','To remove the bias term b'], a:0,
    tag:'why the sigmoid', focus:'w·x + b ranges over all reals; a probability must live in (0,1). σ is the monotone map that does exactly that.',
    why:'The linear score is any real number, but a probability must lie in (0, 1). The sigmoid is the monotone squashing function that maps ℝ → (0, 1).',
    wrong:{1:'The boundary stays a straight line (z = 0 is linear); the sigmoid only reshapes the score into a probability, it doesn\'t bend the boundary.',2:'The sigmoid adds work, it doesn\'t speed up anything — its job is calibration into (0,1).',3:'The bias b is part of z and survives the squashing; the sigmoid doesn\'t remove it.'}},
  ],
});
INTERACTIVES.mllogreg = function(stage, api){
  const L=makeLab(stage);
  // Two roughly-separable clusters. [x, y, label]
  const pts=[
    [-2.2, 1.4, 0],[-2.8, 0.3, 0],[-1.6, 2.1, 0],[-3.1, 1.6, 0],[-1.9,-0.4,0],[-2.5, 2.3,0],[-1.2, 1.0,0],[-3.0, 0.9,0],
    [ 2.1, 0.6, 1],[ 2.7, 1.5, 1],[ 1.5,-0.6, 1],[ 3.0, 0.2, 1],[ 1.8, 1.9,1],[ 2.4,-1.1,1],[ 1.2, 0.9,1],[ 3.2, 1.2,1],
  ];
  let w1=0.4, w2=0.0, b=0.0;
  function loss(){
    let nll=0, correct=0;
    for(const [x,y,lab] of pts){
      const p=Math.min(1-1e-9,Math.max(1e-9, sigmoid(w1*x+w2*y+b)));
      nll += -(lab*Math.log(p) + (1-lab)*Math.log(1-p));
      if((p>=0.5?1:0)===lab) correct++;
    }
    return {nll:nll/pts.length, acc:correct/pts.length};
  }
  const m=api.missions([
    {text:'Separate the classes: get accuracy to <b>100%</b>', xp:20, check:s=>s.acc>=0.999},
    {text:'Drive the cross-entropy loss <b>below 0.30</b> (confident AND right)', xp:25, check:s=>s.nll<0.30},
    {text:'See the penalty for over-confidence: flip a weight sign so loss climbs <b>above 1.5</b>', xp:20, check:s=>s.nll>1.5},
  ]);
  const P=plane(L.ctx,L.W,L.H,54);
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    // probability field shading (p over the plane)
    const step=14;
    for(let px=0;px<L.W;px+=step){
      for(let py=0;py<L.H;py+=step){
        const wx=P.wx(px+step/2), wy=P.wy(py+step/2);
        const p=sigmoid(w1*wx+w2*wy+b);
        // blue (class 0) -> purple midline -> gold (class 1)
        const r=Math.round(30+p*225), g=Math.round(70+p*130), bl=Math.round(220-p*160);
        L.ctx.fillStyle='rgba('+r+','+g+','+bl+','+(0.10+Math.abs(p-0.5)*0.28)+')';
        L.ctx.fillRect(px,py,step,step);
      }
    }
    P.grid();
    // decision boundary: w1*x + w2*y + b = 0  ->  y = -(w1*x+b)/w2  (or vertical)
    L.ctx.strokeStyle='#e8ecff'; L.ctx.lineWidth=2.5; L.ctx.setLineDash([8,5]);
    L.ctx.beginPath();
    if(Math.abs(w2)>1e-6){
      const xa=P.wx(0), xb=P.wx(L.W);
      L.ctx.moveTo(P.sx(xa), P.sy(-(w1*xa+b)/w2));
      L.ctx.lineTo(P.sx(xb), P.sy(-(w1*xb+b)/w2));
    } else if(Math.abs(w1)>1e-6){
      const xv=-b/w1; L.ctx.moveTo(P.sx(xv),0); L.ctx.lineTo(P.sx(xv),L.H);
    }
    L.ctx.stroke(); L.ctx.setLineDash([]);
    // points
    for(const [x,y,lab] of pts){
      const p=sigmoid(w1*x+w2*y+b);
      const right=(p>=0.5?1:0)===lab;
      P.dot(x,y,7, lab===1?'#ffc94d':'#00d4ff');
      if(!right){ L.ctx.strokeStyle='#ff5c7a'; L.ctx.lineWidth=2.5;
        L.ctx.beginPath(); L.ctx.arc(P.sx(x),P.sy(y),10,0,7); L.ctx.stroke(); }
    }
    const st=loss();
    L.readout.innerHTML='z = '+fmt2(w1)+'·x + '+fmt2(w2)+'·y + '+fmt2(b)+
      '<br><span style="color:#2dd4a0">cross-entropy = '+st.nll.toFixed(3)+'</span>'+
      '<br>accuracy = '+(st.acc*100).toFixed(0)+'%';
    m.update(st);
  }
  slider(L.ctrl,'w₁ — weight on x',-3,3,0.1,0.4,null,v=>{w1=v;draw();});
  slider(L.ctrl,'w₂ — weight on y',-3,3,0.1,0,null,v=>{w2=v;draw();});
  slider(L.ctrl,'b — bias (shifts the boundary)',-4,4,0.1,0,null,v=>{b=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b style="color:#00d4ff">Blue</b> = class 0, <b style="color:#ffc94d">gold</b> = class 1. The dashed line is the <b>decision boundary</b> (p = 0.5); the shading is the predicted probability. A <b style="color:#ff5c7a">red ring</b> marks a misclassified point. Move the weights to shrink the cross-entropy — confident-and-right is nearly free, confident-and-wrong is brutal.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================================================================
   LESSON 2 — Regularization as priors (L2 ↔ Gaussian, L1 ↔ Laplace)
   ================================================================ */
registerLesson({
  id:'ml-regularize', world:'ml', order:21, emoji:'🪢', title:'Regularization as Priors',
  sub:'Add a penalty on big weights and you\'re secretly doing Bayesian MAP: L2 = a Gaussian prior (weight decay), L1 = a Laplace prior (sparsity).',
  learn:`<p>Pure maximum likelihood happily makes weights enormous to fit noise — that's overfitting. <strong>Regularization</strong> adds a penalty on the size of the weights:</p>
  <div class="formula">minimize   NLL(w)  +  λ · penalty(w)</div>
  <p>The knob λ trades data-fit against simplicity. Two penalties dominate machine learning, and each is secretly a <strong>prior belief</strong> about the weights (World 3's Bayes!). Because MAP = maximize [ likelihood × prior ], and −log turns that into [ NLL + (−log prior) ]:</p>
  <p>• <strong>L2</strong> (ridge / weight decay): penalty = Σ wⱼ². This is exactly the <strong>−log of a Gaussian prior</strong> centered at 0. It <em>shrinks</em> every weight smoothly toward zero but rarely to exactly zero.<br>
  • <strong>L1</strong> (lasso): penalty = Σ |wⱼ|. This is the <strong>−log of a Laplace prior</strong> — a distribution with a sharp spike at 0. Its pointy corner drives many weights to <em>exactly zero</em>, producing a <strong>sparse</strong> model that selects features.</p>
  <div class="formula">L2 penalty = ‖w‖²  ⇔  Gaussian prior        L1 penalty = ‖w‖₁  ⇔  Laplace prior</div>
  <p>So "add weight decay" and "assume the weights are probably small and Gaussian" are the <em>same statement</em>, viewed from optimization vs. Bayesian angles. The lab sweeps λ and shows L1 zeroing weights one by one (a <strong>sparsity path</strong>) while L2 melts them down smoothly.</p>`,
  ml:`<b>Weight decay</b> is L2 regularization and sits in essentially every deep-learning optimizer (AdamW is literally "Adam with decoupled weight decay"). <b>L1/lasso</b> is the classic feature-selection tool — it hands you a short list of the weights that survive. The prior view is the backbone of Bayesian deep learning and explains dropout, early stopping, and data augmentation as different ways of encoding "prefer simpler models". When someone says "we added L2 to fight overfitting", they've placed a Gaussian prior on the weights whether they say so or not.`,
  deeper:[
   {title:'😵 Stuck? What "prior" means here', body:'A prior is your belief about the weights BEFORE seeing data. "Weights are probably small" is a bell curve (Gaussian) centered at 0 — that\'s L2. "Weights are probably small, but a few might be large, and lots are exactly zero" is the spiky Laplace distribution — that\'s L1. Multiplying the likelihood by the prior and taking −log gives you loss + penalty. MAP estimation IS regularized maximum likelihood.'},
   {title:'🚀 Go deeper: why L1 makes exact zeros and L2 doesn\'t', body:'Picture the penalty\'s contours. L2\'s ‖w‖² contours are smooth circles — the loss minimum touches them on a slanted face, so weights land small but nonzero. L1\'s ‖w‖₁ contours are diamonds with sharp <em>corners</em> on the axes, and the minimum tends to hit a corner, where one coordinate is exactly 0. The corner is the whole story: a non-differentiable point that pins weights to zero. That\'s why lasso is a feature selector and ridge is not.'},
   {title:'🚀 Go deeper: λ is the prior\'s confidence', body:'Bigger λ = a narrower prior = a stronger prior belief that weights are near zero = more shrinkage and (for L1) more zeros. λ → 0 recovers plain maximum likelihood (a flat, uninformative prior). λ → ∞ crushes every weight to 0 (a prior so confident it ignores the data). Choosing λ is choosing how much you trust your prior over your data — usually picked by cross-validation.'}],
  interactive:'mlreg',
  quiz:[
   {q:'Adding an L2 penalty (Σ wⱼ²) to the loss is equivalent, in Bayesian terms, to…', opts:['Placing a Gaussian prior on the weights','Placing a uniform prior on the weights','Removing the likelihood term','Assuming the weights are exactly zero'], a:0,
    tag:'L2 ↔ Gaussian', focus:'−log of a zero-mean Gaussian is (const)·Σwⱼ². MAP with a Gaussian prior = NLL + L2 penalty.',
    why:'The −log of a zero-mean Gaussian density is proportional to Σ wⱼ². So MAP with a Gaussian prior is exactly maximum likelihood plus an L2 penalty.',
    wrong:{1:'A uniform (flat) prior adds a constant — no penalty at all, which recovers plain maximum likelihood, not L2.',2:'The likelihood (NLL) stays; the prior is ADDED to it. MAP = likelihood × prior.',3:'The prior only says weights are probably small, not exactly zero — the data still moves them.'}},
   {q:'You increase λ on an L1 penalty. As λ grows, individual weights tend to…', opts:['Snap to exactly zero, one after another (sparsity)','Shrink smoothly but never reach zero','Grow without bound','Stay completely unchanged'], a:0,
    tag:'L1 sparsity', focus:'L1\'s diamond-shaped penalty has corners on the axes; the optimum hits them, pinning weights to exactly 0.',
    why:'L1\'s penalty has sharp corners on the coordinate axes; as λ rises the optimum gets pinned to those corners, sending weights to exactly zero — that\'s the sparsity path.',
    wrong:{1:'Smooth shrink-but-never-zero is the L2 (ridge) behavior. L1\'s corner is what produces exact zeros.',2:'A penalty on weight size pushes weights DOWN, never lets them blow up.',3:'Larger λ means a stronger penalty, so weights actively move toward zero — not unchanged.'}},
   {q:'What does MAP (maximum a posteriori) estimation add on top of plain maximum likelihood?', opts:['A prior term, which shows up as the regularization penalty','A second dataset','A larger learning rate','Nothing — MAP and MLE are identical'], a:0,
    tag:'MAP = regularized MLE', focus:'MAP maximizes likelihood × prior; −log makes it NLL + (−log prior), and the −log prior IS the penalty.',
    why:'MAP maximizes likelihood × prior. Taking −log gives NLL + (−log prior), and that −log-prior term is precisely the regularization penalty (L2 for Gaussian, L1 for Laplace).',
    wrong:{1:'MAP uses the same data; it adds a PRIOR, not more data.',2:'The learning rate is an optimizer setting, unrelated to whether you use a prior.',3:'They coincide only under a flat/uniform prior; any informative prior makes MAP = regularized MLE.'}},
   {q:'Two teams describe the same trick: one says "we use weight decay", the other says "we put a Gaussian prior on the weights". They are…', opts:['Describing the same thing from optimization vs. Bayesian views','Doing two unrelated things','In conflict — only one can be right','Both describing L1 regularization'], a:0,
    tag:'two views, one method', focus:'Weight decay = L2 = −log Gaussian prior. Optimization and Bayesian framings of one operation.',
    why:'Weight decay is L2, and L2 is the −log of a Gaussian prior. It\'s a single operation with two equivalent descriptions.',
    wrong:{1:'They\'re the SAME operation, just framed as loss-plus-penalty vs. likelihood-times-prior.',2:'No conflict — the equivalence is exact, not a matter of who\'s right.',3:'Gaussian prior ↔ L2, not L1. L1 corresponds to the Laplace prior.'}},
  ],
});
INTERACTIVES.mlreg = function(stage, api){
  const L=makeLab(stage);
  // Unregularized least-squares "true" weights for 6 features — a couple are noise.
  const wStar=[1.9, -1.3, 0.9, 0.15, -0.10, 0.55];
  const N=wStar.length;
  let lam=0, mode='L1'; // 'L1' or 'L2'
  // Closed-form-ish shrinkage of each weight given lambda:
  //  L2 (ridge): w = w*/(1+lam)                 -> smooth shrink, never exact 0
  //  L1 (lasso): soft-threshold sign(w*)*max(|w*|-lam,0) -> exact zeros
  function weights(){
    return wStar.map(w=>{
      if(mode==='L2') return w/(1+lam);
      const s=Math.sign(w); return s*Math.max(Math.abs(w)-lam,0);
    });
  }
  function stats(){
    const w=weights();
    const zeros=w.filter(v=>Math.abs(v)<1e-9).length;
    const l1=w.reduce((a,v)=>a+Math.abs(v),0);
    return {w, zeros, l1, lam, mode};
  }
  const m=api.missions([
    {text:'In <b>L1</b> mode, raise λ until at least <b>2 weights hit exactly zero</b> (sparsity)', xp:25, check:s=>s.mode==='L1'&&s.zeros>=2},
    {text:'Switch to <b>L2</b> and confirm it <b>shrinks smoothly</b>: total |w| below 3 with <b>zero</b> weights exactly at 0', xp:25, check:s=>s.mode==='L2'&&s.l1<3&&s.zeros===0},
    {text:'Crank <b>L1</b> λ high enough to zero out <b>every</b> weight', xp:20, check:s=>s.mode==='L1'&&s.zeros===N},
  ]);
  const pad=54, top=40, barH=30, gap=14;
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    const w=weights();
    const maxW=2.2;
    const midX=L.W/2;
    // zero axis
    L.ctx.strokeStyle='rgba(255,255,255,.35)'; L.ctx.lineWidth=1.5;
    L.ctx.beginPath(); L.ctx.moveTo(midX,top-10); L.ctx.lineTo(midX,top+N*(barH+gap)); L.ctx.stroke();
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='600 11px '+getComputedStyle(document.body).fontFamily;
    L.ctx.textAlign='center'; L.ctx.fillText('0', midX, top-16); L.ctx.textAlign='left';
    const half=(L.W/2)-pad;
    for(let i=0;i<N;i++){
      const y=top+i*(barH+gap);
      // ghost of the un-regularized weight
      const gx=wStar[i]/maxW*half;
      L.ctx.fillStyle='rgba(255,255,255,.10)';
      L.ctx.fillRect(Math.min(midX,midX+gx), y, Math.abs(gx), barH);
      // current weight
      const cx=w[i]/maxW*half;
      const isZero=Math.abs(w[i])<1e-9;
      L.ctx.fillStyle=isZero?'#3a4266':(w[i]>0?'#ffc94d':'#00d4ff');
      L.ctx.fillRect(Math.min(midX,midX+cx), y, Math.abs(cx), barH);
      L.ctx.fillStyle=isZero?'#ff5c7a':'#e8ecff';
      L.ctx.font='700 12px '+getComputedStyle(document.body).fontFamily;
      L.ctx.fillText('w'+(i+1)+' = '+w[i].toFixed(2)+(isZero?'  (zeroed)':''), 8, y+barH-9);
    }
    const st=stats();
    L.readout.innerHTML='penalty = <b>'+mode+'</b> ('+(mode==='L1'?'Laplace prior — sparsity':'Gaussian prior — smooth shrink')+')'+
      '<br>λ = '+lam.toFixed(2)+'<br>zeroed weights = '+st.zeros+' / '+N+'   ‖w‖₁ = '+st.l1.toFixed(2);
    m.update(st);
  }
  chips(L.ctrl,'PENALTY',['L1 (Laplace → sparse)','L2 (Gaussian → smooth)'],(i,btn,row)=>{
    mode=i===0?'L1':'L2'; [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw();
  }).children[0].classList.add('on');
  slider(L.ctrl,'λ — regularization strength (prior confidence)',0,2.2,0.05,0,v=>v.toFixed(2),v=>{lam=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Each bar is one weight; the faint ghost behind it is its un-penalized value. Raise <b>λ</b> and watch <b>L1</b> snap weights to <b style="color:#ff5c7a">exactly zero</b> one by one (a sparsity path), while <b>L2</b> melts them all down smoothly but never quite to zero.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================================================================
   LESSON 3 — Decision boundaries & the sigmoid link (log-odds)
   ================================================================ */
registerLesson({
  id:'ml-logodds', world:'ml', order:22, emoji:'⚖️', title:'Log-Odds & the Sigmoid Link',
  sub:'The sigmoid isn\'t arbitrary: it\'s the exact inverse of the log-odds. Logistic regression is a linear model — for the log-odds.',
  learn:`<p>Why the sigmoid and not some other squashing curve? Because logistic regression is really a <em>linear</em> model — just not for the probability directly. It's linear for the <strong>log-odds</strong> (the "logit"):</p>
  <div class="formula">odds = p / (1 − p)        logit(p) = ln( p / (1−p) ) = z = w·x + b</div>
  <p>Read that right to left: the model computes a plain linear score z = w·x + b, and <em>that score IS the log-odds</em>. Invert the logit and you get the sigmoid back:</p>
  <div class="formula">p = σ(z) = 1 / (1 + e<sup>−z</sup>)</div>
  <p>So the sigmoid is the <strong>link function</strong> that connects a linear predictor to a probability. This gives the model a clean interpretation: <strong>each weight wⱼ is how much one unit of feature j adds to the log-odds.</strong> Increase xⱼ by 1 and the odds multiply by e<sup>wⱼ</sup> — a constant multiplicative kick, no matter where you started.</p>
  <p>The <strong>decision boundary</strong> is wherever p = 0.5, i.e. odds = 1, i.e. z = 0 — a straight line (or hyperplane). Everything curved you see in a probability heat-map is the sigmoid bending a fundamentally <em>flat</em> log-odds surface.</p>`,
  ml:`This "linear predictor → link function → distribution" recipe is the entire family of <b>generalized linear models</b>, and it scales straight up: swap the sigmoid for a <b>softmax</b> and you have multi-class classification — the output head of every LLM and image classifier. Understanding that GPT's final layer is "a linear score per token, then softmax" is exactly this lesson at vocabulary scale. Log-odds also power calibration, logistic calibration of any classifier, and the "logit" you see everywhere in ML code.`,
  deeper:[
   {title:'😵 Stuck? Odds vs. probability', body:'Probability 0.5 = odds 1 ("even money", 1-to-1). Probability 0.8 = odds 4 (4-to-1 for). Probability 0.2 = odds 0.25 (4-to-1 against). Taking the log makes them symmetric around 0: log-odds 0 is the 50/50 boundary, positive log-odds lean class 1, negative lean class 0. The sigmoid is just the machine that turns any log-odds number back into a probability between 0 and 1.'},
   {title:'🚀 Go deeper: what a weight really means', body:'In linear regression a coefficient adds to the output. In logistic regression a coefficient adds to the LOG-odds — so it <em>multiplies</em> the odds by e^wⱼ. A weight of ln(2) ≈ 0.69 means "each unit of this feature doubles the odds". That multiplicative reading (the "odds ratio") is why logistic regression is the workhorse of epidemiology and credit scoring: the coefficients are directly interpretable.'},
   {title:'🚀 Go deeper: from sigmoid to softmax', body:'The two-class sigmoid is the special case of the general <b>softmax</b>. Softmax takes a vector of scores (one linear predictor per class) and returns a probability distribution over classes; with exactly two classes it collapses back to σ applied to the difference of the two scores. So the binary decision boundary generalizes to the multi-class boundaries carved out by a softmax head — the exact object sitting at the top of a GPT.'}],
  interactive:'mllogit',
  quiz:[
   {q:'In logistic regression, the linear score z = w·x + b directly equals…', opts:['The log-odds (logit) of the positive class','The probability of the positive class','The classification accuracy','The squared error'], a:0,
    tag:'z is the log-odds', focus:'logit(p) = ln(p/(1−p)) = z. The linear predictor IS the log-odds; the sigmoid inverts it to a probability.',
    why:'By construction ln(p/(1−p)) = z, so the linear score is the log-odds itself. Applying the sigmoid to z inverts the logit to recover p.',
    wrong:{1:'z is the log-odds, not the probability — you must pass z through the sigmoid to get p in (0,1).',2:'Accuracy is an evaluation metric, not the model\'s linear score.',3:'Squared error is a loss; z is the model\'s log-odds output.'}},
   {q:'The decision boundary of a logistic regression (p = 0.5) is…', opts:['A straight line / hyperplane where z = 0','A curved surface, because of the sigmoid','Wherever the loss is largest','Always through the origin'], a:0,
    tag:'boundary is linear', focus:'p = 0.5 ⇔ odds = 1 ⇔ z = w·x + b = 0, which is a linear equation: a line or hyperplane.',
    why:'p = 0.5 means odds = 1 means z = 0, and z = w·x + b = 0 is a linear equation — a straight line in 2D, a hyperplane in general.',
    wrong:{1:'The probability HEATMAP curves, but the p = 0.5 contour itself is the straight line z = 0. The sigmoid bends a flat log-odds surface.',2:'The boundary is defined by p = 0.5, not by where the loss is largest.',3:'The bias b shifts the line off the origin; it only passes through the origin when b = 0.'}},
   {q:'A logistic-regression weight wⱼ = ln(2) ≈ 0.69 means one extra unit of feature j…', opts:['Multiplies the odds of the positive class by 2','Adds 2 to the probability','Doubles the probability','Multiplies the probability by e'], a:0,
    tag:'weights as odds ratios', focus:'wⱼ adds to the LOG-odds, so it multiplies the odds by e^wⱼ. e^ln(2) = 2 → the odds double.',
    why:'A weight adds to the log-odds, so exponentiating gives a multiplicative effect on the odds: e^ln(2) = 2, so the odds double per unit of feature j.',
    wrong:{1:'Weights add to the log-ODDS, not the probability; and probabilities can\'t exceed 1, so "add 2" is impossible.',2:'It doubles the ODDS, not the probability — near p = 0.9 doubling the probability would exceed 1.',3:'e^wⱼ = e^ln(2) = 2 multiplies the odds by 2, not by e.'}},
   {q:'Generalizing the sigmoid link from two classes to many gives you…', opts:['The softmax — the output head of image classifiers and LLMs','A bigger sigmoid with a steeper slope','Linear regression','A decision tree'], a:0,
    tag:'sigmoid → softmax', focus:'Sigmoid is the 2-class case of softmax; softmax maps a vector of linear scores to a class distribution.',
    why:'The multi-class link function is the softmax, which turns one linear score per class into a probability distribution — exactly the output head of LLMs and classifiers.',
    wrong:{1:'You don\'t just steepen one sigmoid; multi-class needs one score PER class, combined by softmax.',2:'Linear regression predicts an unbounded number, not a class distribution.',3:'A decision tree is an entirely different model family, not a generalization of the sigmoid link.'}},
  ],
});
INTERACTIVES.mllogit = function(stage, api){
  const L=makeLab(stage);
  // Left panel: log-odds line z = w*x + b ; right side of the plot: sigmoid p = σ(z).
  let w=1.0, b=0.0;
  const m=api.missions([
    {text:'Read the boundary: set b so the crossing point (z = 0, p = 0.5) sits at <b>x = 0</b>', xp:20, check:s=>Math.abs(s.x50)<0.08&&isFinite(s.x50)},
    {text:'Make the sigmoid <b>steeper</b>: raise the slope so |w| ≥ 2.5 (sharper decisions)', xp:20, check:s=>Math.abs(s.w)>=2.5},
    {text:'Shift the 50/50 point to <b>x = 2</b> using the bias (boundary = −b/w)', xp:25, check:s=>Math.abs(s.x50-2)<0.12},
  ]);
  // Two stacked planes: top = log-odds (linear), bottom = probability (sigmoid).
  const P=plane(L.ctx,L.W,L.H,52, L.W/2, L.H*0.30);   // top: log-odds, y-up
  const Q=plane(L.ctx,L.W,L.H,52, L.W/2, L.H*0.82);   // bottom: probability
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    // ---- TOP: the linear log-odds z = w x + b ----
    L.ctx.save();
    L.ctx.beginPath(); L.ctx.rect(0,0,L.W,L.H*0.55); L.ctx.clip();
    P.grid();
    P.fn(x=>w*x+b, '#7c5cff', 3, P.wx(0), P.wx(L.W));
    // z=0 line & crossing
    L.ctx.strokeStyle='rgba(255,255,255,.3)'; L.ctx.setLineDash([5,5]); L.ctx.lineWidth=1.5;
    L.ctx.beginPath(); L.ctx.moveTo(0,P.sy(0)); L.ctx.lineTo(L.W,P.sy(0)); L.ctx.stroke(); L.ctx.setLineDash([]);
    const x50 = Math.abs(w)>1e-6 ? -b/w : Infinity;
    if(isFinite(x50)){ P.dot(x50,0,6,'#ffc94d'); }
    L.ctx.fillStyle='#b9a8ff'; L.ctx.font='700 13px '+getComputedStyle(document.body).fontFamily;
    L.ctx.fillText('log-odds  z = w·x + b  (linear)', 14, 22);
    L.ctx.restore();
    // divider
    L.ctx.strokeStyle='rgba(255,255,255,.12)'; L.ctx.beginPath();
    L.ctx.moveTo(0,L.H*0.55); L.ctx.lineTo(L.W,L.H*0.55); L.ctx.stroke();
    // ---- BOTTOM: probability p = sigmoid(z) ----
    L.ctx.save();
    L.ctx.beginPath(); L.ctx.rect(0,L.H*0.55,L.W,L.H*0.45); L.ctx.clip();
    // horizontal guides at p=0, .5, 1
    L.ctx.strokeStyle='rgba(255,255,255,.08)'; L.ctx.lineWidth=1;
    [0,0.5,1].forEach(pv=>{ L.ctx.beginPath(); L.ctx.moveTo(0,Q.sy(pv)); L.ctx.lineTo(L.W,Q.sy(pv)); L.ctx.stroke(); });
    L.ctx.strokeStyle='rgba(255,255,255,.3)'; L.ctx.setLineDash([5,5]);
    L.ctx.beginPath(); L.ctx.moveTo(0,Q.sy(0.5)); L.ctx.lineTo(L.W,Q.sy(0.5)); L.ctx.stroke(); L.ctx.setLineDash([]);
    Q.fn(x=>sigmoid(w*x+b), '#2dd4a0', 3, Q.wx(0), Q.wx(L.W));
    if(isFinite(x50)){
      L.ctx.strokeStyle='rgba(255,201,77,.5)'; L.ctx.setLineDash([3,4]);
      L.ctx.beginPath(); L.ctx.moveTo(Q.sx(x50),L.H*0.55); L.ctx.lineTo(Q.sx(x50),L.H); L.ctx.stroke(); L.ctx.setLineDash([]);
      Q.dot(x50,0.5,6,'#ffc94d');
    }
    L.ctx.fillStyle='#2dd4a0'; L.ctx.font='700 13px '+getComputedStyle(document.body).fontFamily;
    L.ctx.fillText('p = σ(z)  (probability in 0–1)', 14, L.H*0.55+22);
    L.ctx.restore();
    L.readout.innerHTML='z = '+fmt2(w)+'·x + '+fmt2(b)+
      '<br>decision boundary (p = 0.5) at x = '+(isFinite(x50)?x50.toFixed(2):'—')+
      '<br>odds multiply by e^w = '+Math.exp(w).toFixed(2)+' per unit of x';
    m.update({w,b,x50});
  }
  slider(L.ctrl,'w — slope (log-odds per unit x)',-4,4,0.1,1,null,v=>{w=v;draw();});
  slider(L.ctrl,'b — bias (shifts the 50/50 point)',-4,4,0.1,0,null,v=>{b=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b style="color:#b9a8ff">Top</b>: the log-odds z is a straight line. <b style="color:#2dd4a0">Bottom</b>: the sigmoid link bends it into a probability. The <b style="color:#ffc94d">gold dot</b> is where they meet — z = 0, p = 0.5, the decision boundary. Steepen w for sharper decisions; move b to slide the boundary.</div>';
  L.ctrl.appendChild(note);
  draw();
};
