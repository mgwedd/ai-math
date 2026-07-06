/* ================================================================
   WORLD 3 — MACHINE LEARNING: from "what is learning" to GPTs.
   Same registries, same schema as the math worlds.
   ================================================================ */
import { LESSONS, INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, slider, chips, plane, clearBg } from '../engine.js';

registerLesson({
  id:'ml-learning', world:'ml', emoji:'🎓', title:'What Learning Is: Fit & Overfit',
  sub:'Models minimize error on data they\'ve seen. The whole game is doing well on data they haven\'t.',
  learn:`<p><strong>Learning</strong> = choosing a function that fits examples. You fit on <strong>training data</strong>, but you're judged on data the model never saw — that gap is generalization. (Strictly, there are <em>three</em> splits: <b>train</b> fits the parameters, a <b>validation</b> set picks hyperparameters like model complexity, and a <b>test</b> set is touched once at the very end for an honest score. The slider sweep below is really using a validation set.)</p>
  <p>Model <strong>capacity</strong> (here: polynomial degree) is the central dial:</p>
  <p>• Too little → <strong>underfitting</strong>: can't even fit the training data<br>
  • Too much → <strong>overfitting</strong>: memorizes noise; training error ≈ 0 while test error explodes</p>
  <div class="formula">good model = lowest TEST error, not lowest train error</div>`,
  ml:`This IS the field. Every architecture choice, regularizer, dropout layer and early-stop is a move in the fit-vs-overfit game. The train/test split you'll use in the lab is the same discipline behind every benchmark score you've ever read.`,
  deeper:[
   {title:'😵 Stuck? The student metaphor', body:'A student who memorizes past exam answers (overfit) aces practice tests and bombs the real one. A student who skimmed (underfit) fails both. Understanding generalizes. Train error = practice test; test error = the real exam.'},
   {title:'🚀 Go deeper: bias–variance & regularization', body:'Underfitting = high bias (model too rigid); overfitting = high variance (model swings with every noisy point). Regularization (L2, dropout) deliberately limits capacity to trade a little bias for a lot less variance — pulling the test curve\'s U-shape minimum toward you. Caveat for the deep-learning era: that tidy U is the <em>classical</em> regime. Massively over-parameterized nets show <b>double descent</b> — push past the point where training error hits zero and test error can fall <em>again</em>, which is why huge models generalize despite fitting the data perfectly.'}],
  interactive:'mlfit',
  quiz:[
   {q:'Train error 0.01, test error 0.9. Diagnosis?', opts:['Overfitting','Underfitting','Perfect model','Bad test set, ignore it'], a:0,
    tag:'overfitting', focus:'Memorization signature: huge train/test gap. Re-create it in the lab with max degree.',
    why:'Near-zero train + huge test error = memorized noise that doesn\'t generalize. The gap is the tell.',
    wrong:{1:'Underfitting fails on BOTH sets; this aced training.',2:'A perfect model does well on data it hasn\'t seen.',3:'Blaming the test set is how leaderboard tragedies happen — the gap is the model\'s fault.'}},
   {q:'Why hold out a test set at all?', opts:['To estimate performance on unseen data','To make training faster','To get more training data','Tradition'], a:0,
    tag:'generalization', focus:'The test set simulates the future: data the model never saw.',
    why:'Training error rewards memorization; only held-out data measures what you actually care about — generalization.',
    wrong:{1:'Held-out data adds evaluation cost, never speed.',2:'It\'s data you deliberately DON\'T train on.',3:'It\'s the only honest scorecard — the opposite of tradition for its own sake.'}},
   {q:'Both train AND test error are high. The model is…', opts:['Underfitting — add capacity','Overfitting — reduce capacity','Done — ship it','Leaking test data'], a:0,
    tag:'underfitting', focus:'High-high = too rigid; low-high = memorizing. Learn the 2×2.',
    why:'Failing even on seen data means the model can\'t express the pattern: underfit. More capacity (or features) helps.',
    wrong:{1:'Reducing capacity helps overfitting — the low-train/high-test case.',2:'High error everywhere is the clearest "don\'t ship" signal there is.',3:'Leakage makes test error suspiciously LOW, not high.'}},
   {q:'As capacity grows, test error typically…', opts:['Falls, then rises (U-shape)','Falls forever','Rises forever','Equals train error'], a:0,
    tag:'capacity tradeoff', focus:'Sweep the degree slider start→end and watch the test curve\'s U.',
    why:'More capacity first captures real structure (error falls), then starts fitting noise (error rises): the U you traced in the lab.',
    wrong:{1:'Falls-forever describes TRAIN error.',2:'It first falls — some capacity is genuinely needed.',3:'The gap between them is the entire drama.'}},
  ],
});
INTERACTIVES.mlfit = function(stage, api){
  const L=makeLab(stage);
  const tr=[[0.2,0.35],[0.8,0.95],[1.5,1.18],[2.2,0.74],[2.9,0.21],[3.6,-0.52],[4.3,-0.89],[4.8,-0.97]];
  const te=[[0.5,0.62],[1.2,1.05],[1.9,0.97],[2.6,0.41],[3.3,-0.2],[4.6,-1.02]];
  let d=1;
  function fit(deg){ // least squares poly via normal equations + gaussian elim
    const n=deg+1, A=[...Array(n)].map(()=>Array(n+1).fill(0));
    for(const [x,y] of tr) for(let i=0;i<n;i++){ for(let j=0;j<n;j++) A[i][j]+=Math.pow(x,i+j); A[i][n]+=y*Math.pow(x,i); }
    for(let c=0;c<n;c++){ let p=c; for(let r=c+1;r<n;r++) if(Math.abs(A[r][c])>Math.abs(A[p][c])) p=r;
      [A[c],A[p]]=[A[p],A[c]]; if(Math.abs(A[c][c])<1e-12) continue;
      for(let r=0;r<n;r++){ if(r===c) continue; const f=A[r][c]/A[c][c]; for(let j=c;j<=n;j++) A[r][j]-=f*A[c][j]; } }
    return [...Array(n)].map((_,i)=>A[i][i]?A[i][n]/A[i][i]:0);
  }
  const mse=(pts,co)=>pts.reduce((s,[x,y])=>{ const p=co.reduce((a,c,i)=>a+c*Math.pow(x,i),0); return s+(y-p)*(y-p); },0)/pts.length;
  const m=api.missions([
    {text:'See <b>underfitting</b>: degree ≤ 1 (note both errors stuck high)', xp:15, check:s=>s.d<=1},
    {text:'Find the <b>sweet spot</b>: test error below 0.05', xp:25, check:s=>s.test<.05},
    {text:'Manufacture <b>overfitting</b>: degree 7 — train error ~0 while test error TRIPLES vs degree 6', xp:25, check:s=>s.d>=7&&s.train<.001&&s.test>.008},
  ]);
  const P=plane(L.ctx,L.W,L.H,75,70,L.H/2);
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const co=fit(d);
    P.fn(x=>co.reduce((a,c,i)=>a+c*Math.pow(x,i),0),'#7c5cff',3,-0.2,5.2);
    tr.forEach(p=>P.dot(p[0],p[1],6,'#ffc94d'));
    te.forEach(p=>P.dot(p[0],p[1],6,'#2dd4a0'));
    const trE=mse(tr,co), teE=mse(te,co);
    L.readout.innerHTML='degree = '+d+'<br>train error = '+trE.toFixed(4)+'<br><span style="color:#2dd4a0">test error = '+teE.toFixed(4)+'</span>';
    m.update({d, train:trE, test:teE});
  }
  slider(L.ctrl,'model capacity (poly degree)',0,7,1,1,v=>''+v,v=>{d=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b style="color:#ffc94d">Gold</b> = training data (the model sees these). <b style="color:#2dd4a0">Green</b> = held-out test data. Sweep the degree and watch the two errors part ways.</div>';
  L.ctrl.appendChild(note);
  draw();
};

registerLesson({
  id:'ml-mlp', world:'ml', emoji:'🧱', title:'Neurons & MLPs: Bend the Line',
  sub:'A neuron is a hinge. Stack hinges and you can build any shape — that\'s the universal approximation idea.',
  learn:`<p>One <strong>ReLU neuron</strong> computes <code>w·relu(x − b)</code>. Its graph is dead flat at zero, then a straight ramp — like a door hinge lying flat, then opening. The corner where flat becomes ramp is the <strong>kink</strong>, and it sits at x = b. One neuron = one kink, slope w after it.</p>
  <div style="margin:14px 0;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:10px 6px 2px">
  <svg viewBox="0 0 600 152" style="width:100%;max-width:600px;display:block;margin:0 auto" xmlns="http://www.w3.org/2000/svg">
    <line x1="20" y1="100" x2="160" y2="100" stroke="rgba(255,255,255,.25)"/>
    <polyline points="20,100 48,100 160,32" fill="none" stroke="#2dd4a0" stroke-width="2.5"/>
    <circle cx="48" cy="100" r="4" fill="#ffc94d"/>
    <text x="40" y="120" font-size="11" fill="#ffc94d">kink (x = b)</text>
    <text x="20" y="140" font-size="11.5" fill="#8b93b8">one hinge: slope w after the kink</text>
    <text x="186" y="80" font-size="22" fill="#8b93b8">+</text>
    <line x1="230" y1="100" x2="370" y2="100" stroke="rgba(255,255,255,.25)"/>
    <polyline points="230,100 314,100 347,140" fill="none" stroke="#ff5c7a" stroke-width="2.5"/>
    <circle cx="314" cy="100" r="4" fill="#ffc94d"/>
    <text x="230" y="140" font-size="11.5" fill="#8b93b8">a second hinge, negative w</text>
    <text x="396" y="80" font-size="22" fill="#8b93b8">=</text>
    <line x1="440" y1="100" x2="580" y2="100" stroke="rgba(255,255,255,.25)"/>
    <polyline points="440,100 468,100 524,66 580,100" fill="none" stroke="#7c5cff" stroke-width="3"/>
    <circle cx="468" cy="100" r="4" fill="#ffc94d"/>
    <circle cx="524" cy="66" r="4" fill="#ffc94d"/>
    <text x="440" y="140" font-size="11.5" fill="#8b93b8">their sum: a tent — two kinks</text>
  </svg></div>
  <div class="formula">$$y = w_1 \\cdot \\text{relu}(x - b_1) + w_2 \\cdot \\text{relu}(x - b_2) + \\cdots$$</div>
  <p>The addition rule is the whole trick: to the <em>left</em> of its kink a hinge contributes nothing; to the <em>right</em> it adds its slope. So reading the sum left to right, <strong>the slope accumulates at every kink</strong> — flat, then w₁, then w₁+w₂, … Place enough kinks and you can trace any curve to any precision. That's the <strong>universal approximation theorem</strong> in its most touchable form.</p>
  <p>An <strong>MLP</strong> (multi-layer perceptron) is exactly this, in many dimensions, stacked in layers: matrix (W1) → hinges → matrix (W2) → …</p>`,
  ml:`Every transformer block contains an MLP doing precisely this hinge-stacking in thousands of dimensions. When you place kinks by hand in the lab, you're doing what gradient descent does to fit data — but with your eyes open.`,
  deeper:[
   {title:'😵 Stuck? One hinge at a time', body:'Stay in <b>1 neuron</b> mode and just play: b₁ slides the kink left/right, w₁ sets the ramp slope. The dashed green line IS your neuron. Only when that feels obvious, switch to 2 neurons — the purple sum is just green + pink, and the slope labels under the axis show the accumulation.'},
   {title:'🚀 Go deeper: depth vs width', body:'Width (more hinges per layer) adds kinks linearly. Depth multiplies: layer 2 bends the already-bent output of layer 1, so the number of linear regions can grow exponentially with depth (an <em>upper bound</em> — random nets rarely use all of them). That\'s the cheap-complexity argument for deep over wide.'},
   {title:'🚀 Go deeper: the code form, and "dying ReLU"', body:'We wrote a hinge as w·relu(x − b) to make the kink position obvious. In real code you\'ll see it the other way round: <code>relu(w·x + b)</code>, where the bias is added <em>inside</em> and the kink sits at x = −b/w. Same object, different bookkeeping. Watch out for the <b>dying ReLU</b>: if a neuron\'s input stays negative (large negative bias or too-high learning rate) it outputs 0 forever, its gradient is 0, and it never recovers — which is why Leaky ReLU and GELU were invented.'},
   {title:'🚀 Go deeper: how weights get set — backprop', body:'You placed these kinks by eye; a real net sets them with <b>backpropagation</b>, which is just <em>reverse-mode automatic differentiation</em> on the network\'s computational graph. One <b>forward pass</b> computes the loss and caches each layer\'s inputs; one <b>backward pass</b> then walks the graph in reverse, applying the chain rule (World 2) node by node to get ∇loss for <em>every</em> weight at once. The punchline that made deep learning practical: that whole backward sweep costs only about the same as <em>one</em> forward pass, no matter how many millions of parameters — so you never differentiate each weight separately. Gradient descent then nudges every weight a step downhill. (Rumelhart, Hinton &amp; Williams, 1986.)'}],
  interactive:'mlrelu',
  quiz:[
   {q:'relu(wx + b) contributes what to the output shape?', opts:['One kink (slope change) at a threshold','A smooth bump','A constant offset','An oscillation'], a:0,
    tag:'ReLU geometry', focus:'ReLU = flat, then ramp. Each neuron = one hinge at x = −b/w.',
    why:'Zero below threshold, linear above: exactly one slope change. Sums of these = piecewise-linear curves.',
    wrong:{1:'Smooth bumps need pairs of opposing sigmoids/ReLUs — one ReLU alone is a hard hinge.',2:'Constant offsets come from bias on the OUTPUT, not a hinge.',3:'ReLUs are monotone pieces; no oscillation from one unit.'}},
   {q:'Why must a nonlinearity sit between weight matrices?', opts:['Stacked linear maps collapse into one linear map','It makes training faster','Tradition from neuroscience','It reduces parameter count'], a:0,
    tag:'why nonlinearity', focus:'W₂·W₁ is just another matrix — recall matrix composition from World 1.',
    why:'Matrix × matrix = matrix: without hinges, a 100-layer net equals a 1-layer net. The bend is the power.',
    wrong:{1:'If anything nonlinearities cost a little compute — the win is expressiveness.',2:'The neuroscience inspiration is real but isn\'t the mathematical reason.',3:'Nonlinearities don\'t reduce parameters; they make the existing ones worth having.'}},
   {q:'The universal approximation theorem says (roughly)…', opts:['Enough neurons can approximate any reasonable function','Any net can learn anything from any data','Deep nets never overfit','MLPs can extrapolate perfectly'], a:0,
    tag:'universal approximation', focus:'It\'s about EXPRESSIVENESS (could represent), not learnability or generalization.',
    why:'It guarantees a big-enough net CAN represent the function — finding it with finite data and SGD is a separate, harder question.',
    wrong:{1:'Learnability from data isn\'t promised — only representational capacity.',2:'Overfitting is fully possible — the theorem says nothing about generalization.',3:'Extrapolation beyond the data is exactly where approximation guarantees die.'}},
   {q:'In a ReLU network, changing one unit\'s bias mainly moves…', opts:['Where that unit\'s kink (bend) sits','The overall slope everywhere','The output\'s height only','Nothing visible'], a:0,
    tag:'parameters → geometry', focus:'w = slope contribution, b = kink location. Map each knob to its geometric job.',
    why:'The hinge activates where x − b₂ = 0, so b₂ positions the kink along x.',
    wrong:{1:'Overall slope is the w\'s job.',2:'Height-only would be the output bias c.',3:'Slide it in the lab — the kink visibly walks along the x-axis.'}},
  ],
});
INTERACTIVES.mlrelu = function(stage, api){
  const L=makeLab(stage);
  const relu=x=>Math.max(0,x);
  const target=x=>relu(x)-2*relu(x-2); // tent: up to (2,2), down to (4,0)
  let w1=0.5,b1=0.5,w2=-0.5,b2=3,neurons=1;
  const m=api.missions([
    {text:'<b>One neuron</b>: kink at <b>x = 0</b>, slope <b>w₁ = 1</b> — match the tent\'s uphill', xp:15, check:s=>s.neurons===1&&Math.abs(s.b1)<.05&&Math.abs(s.w1-1)<.05},
    {text:'Add the <b>second neuron</b> and park its kink at the tent\'s peak, <b>x = 2</b>', xp:20, check:s=>s.neurons===2&&Math.abs(s.b2-2)<.05},
    {text:'Fold the downhill: past the peak slopes <b>add</b> — make w₁+w₂ = −1. Error below <b>0.05</b>', xp:30, check:s=>s.neurons===2&&s.err<.05},
  ]);
  const P=plane(L.ctx,L.W,L.H,72,90,L.H-80);
  const FONT=getComputedStyle(document.body).fontFamily;
  const h1=x=>w1*relu(x-b1), h2=x=>w2*relu(x-b2);
  const model=x=>neurons===1?h1(x):h1(x)+h2(x);
  function dashFn(f,color){ L.ctx.setLineDash([6,5]); P.fn(f,color,1.8,-0.3,5); L.ctx.setLineDash([]); }
  function kinkMark(bx,i,color){
    L.ctx.setLineDash([3,5]); L.ctx.strokeStyle='rgba(255,255,255,.16)'; L.ctx.lineWidth=1;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(bx),0); L.ctx.lineTo(P.sx(bx),L.H); L.ctx.stroke(); L.ctx.setLineDash([]);
    P.dot(bx,model(bx),5.5,color);
    L.ctx.font='700 12px '+FONT; L.ctx.fillStyle=color;
    L.ctx.fillText('kink '+i, P.sx(bx)+7, P.sy(model(bx))-9);
  }
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    P.fn(target,'rgba(255,201,77,.9)',2.5,-0.3,5);
    dashFn(h1,'rgba(45,212,160,.8)');                       // neuron 1 alone
    if(neurons===2) dashFn(h2,'rgba(255,92,122,.8)');       // neuron 2 alone
    P.fn(model,'#7c5cff',3,-0.3,5);                         // their sum
    kinkMark(b1,1,'#2dd4a0');
    if(neurons===2) kinkMark(b2,2,'#ff5c7a');
    // per-region slope labels under the axis — the accumulation, visible
    const ks=(neurons===2?[[b1,w1],[b2,w2]]:[[b1,w1]]).sort((a,b)=>a[0]-b[0]);
    const edges=[-0.3,...ks.map(k=>k[0]),5.1];
    let acc=0; const slopes=[0,...ks.map(k=>acc+=k[1])];
    L.ctx.font='600 11.5px '+FONT; L.ctx.textAlign='center';
    for(let i=0;i<slopes.length;i++){
      if(edges[i+1]-edges[i]<0.55) continue;
      L.ctx.fillStyle='#8b93b8';
      L.ctx.fillText('slope '+slopes[i].toFixed(1), P.sx((edges[i]+edges[i+1])/2), P.sy(0)+20);
    }
    L.ctx.textAlign='left';
    let err=0,nn=0; for(let x=0;x<=4.001;x+=.2){ const d=model(x)-target(x); err+=d*d; nn++; }
    err/=nn;
    L.readout.innerHTML='y = '+w1.toFixed(1)+'·relu(x−'+b1.toFixed(1)+')'+
      (neurons===2?' + '+w2.toFixed(1)+'·relu(x−'+b2.toFixed(1)+')':'')+
      '<br>slopes left→right: '+slopes.map(s=>s.toFixed(1)).join(' → ')+
      '<br>error vs tent = '+err.toFixed(3);
    m.update({err,b1,w1,b2,neurons});
  }
  const row=chips(L.ctrl,'NEURONS',['1 neuron','2 neurons'],(i,btn,r)=>{
    neurons=i+1; [...r.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); });
  row.children[0].classList.add('on');
  slider(L.ctrl,'w₁ — neuron 1 slope',-3,3,0.1,0.5,null,v=>{w1=v;draw();});
  slider(L.ctrl,'b₁ — neuron 1 kink position',-1,4,0.1,0.5,null,v=>{b1=v;draw();});
  slider(L.ctrl,'w₂ — neuron 2 slope',-3,3,0.1,-0.5,null,v=>{w2=v;draw();});
  slider(L.ctrl,'b₂ — neuron 2 kink position',-1,4,0.1,3,null,v=>{b2=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Fit the <b style="color:#ffc94d">gold tent</b>. Dashed <b style="color:#2dd4a0">green</b>/<b style="color:#ff5c7a">pink</b> = each neuron alone; <b style="color:#b9a8ff">purple</b> = their sum (your network). Watch the slope labels under the axis: every kink adds its w to the running slope.</div>';
  L.ctrl.appendChild(note);
  draw();
};

registerLesson({
  id:'ml-embed', world:'ml', emoji:'🗺️', title:'Embeddings: Meaning as Geometry',
  sub:'Words become points; similarity becomes distance; analogy becomes vector arithmetic.',
  learn:`<p>An <strong>embedding</strong> assigns each token a learned vector so that <em>related things sit near each other</em>. Meaning becomes geometry:</p>
  <p>• Similarity = closeness (cosine / distance — World 1's dot product!)<br>
  • Categories = clusters<br>
  • Relations = <strong>directions</strong>: the vector from <i>man</i> to <i>woman</i> ≈ the vector from <i>king</i> to <i>queen</i></p>
  <div class="formula">$$\\text{king} - \\text{man} + \\text{woman} \\approx \\text{queen}$$</div>
  <p>That last line is arithmetic on learned vectors — you'll try it in the lab. (Honesty caveat: the analogy is <em>approximate</em> and famously over-sold. It only lands on "queen" when you exclude the input words from the search, holds far better for some relations than others, and inherits the data's biases — "doctor − man + woman" infamously drifts toward "nurse". Real geometry, real caveats.)</p>`,
  ml:`Embeddings are the input layer of every LLM and the entire engine of semantic search/RAG: your query is embedded, then nearest-neighbor document vectors are retrieved by dot product. Two flavors matter: <b>static</b> embeddings (word2vec/GloVe — one fixed vector per word, where the analogy trick lives) and the <b>contextual</b> token representations inside a transformer (a word's vector shifts with its sentence — "river bank" vs "savings bank"). The 2D map in the lab is a static toy, small enough to see.`,
  deeper:[
   {title:'😵 Stuck? The map metaphor', body:'Think city map: coffee shops cluster downtown; "the direction toward the river" means something everywhere on the map. Embeddings are that map for meaning — learned so that useful relations become consistent directions.'},
   {title:'🚀 Go deeper: how embeddings get learned', body:'Nothing hand-places these points. Models learn them by prediction: word2vec predicts neighbors; LLMs predict next tokens. Vectors drift until words used similarly end up placed similarly — "you shall know a word by the company it keeps", as distributional semantics put it in 1957.'},
   {title:'🚀 Go deeper: cosine vs dot product', body:'The lab uses raw distance, but production retrieval scores with the <b>dot product</b> q·k = |q||k|cos θ (World 1). That mixes two things: the <em>angle</em> between vectors (semantic direction) and their <em>magnitudes</em>. <b>Cosine similarity</b> divides the magnitudes out — cos θ = (q·k)/(|q||k|) — so it compares pure direction, ranging −1 (opposite) to +1 (same). It\'s the default for search because a token\'s embedding norm often tracks frequency, not meaning, and you don\'t want common words winning just for being long. If you <em>normalize</em> every vector to length 1 first, dot product and cosine become identical — which is why many vector databases store unit vectors and then use the (cheaper) dot product.'}],
  interactive:'mlembed',
  quiz:[
   {q:'Two embeddings have cosine similarity 0.97. The tokens are likely…', opts:['Used in very similar contexts','Spelled similarly','The same length as strings','Adjacent in the alphabet'], a:0,
    tag:'similarity meaning', focus:'Embedding geometry encodes USAGE/meaning, not surface features like spelling.',
    why:'Embeddings are trained on context prediction, so closeness = used the same way. "Doctor" and "physician" — different letters, same neighborhood.',
    wrong:{1:'Spelling is invisible to embedding training — "doctor"/"physician" prove it.',2:'String length plays no role in semantics.',3:'Alphabet position is exactly the kind of surface feature embeddings ignore.'}},
   {q:'king − man + woman lands near queen because…', opts:['The man→woman relation is a consistent direction in the space','The model memorized the analogy','Those four words rhyme','Coincidence'], a:0,
    tag:'analogy arithmetic', focus:'Relations = shared offsets. Re-do the lab\'s analogy mission and watch the parallelogram.',
    why:'Training pressure makes the gender offset roughly parallel across pairs, so adding it to "king" translates to "queen". A learned parallelogram.',
    wrong:{1:'Memorization can\'t explain why it works for UNSEEN pairs — the offset generalizes.',2:'Rhyme is sound, not distributional meaning.',3:'It replicates across thousands of pairs — far beyond coincidence.'}},
   {q:'In RAG / semantic search, documents are ranked by…', opts:['Similarity between query and document embeddings','Alphabetical order','Document length','Exact keyword counts only'], a:0,
    tag:'retrieval', focus:'Embed query → nearest neighbors by dot product/cosine. That\'s the whole trick.',
    why:'Both query and documents live in the same embedding space; the dot product (World 1!) scores their alignment.',
    wrong:{1:'Alphabetical retrieval would be... a phone book.',2:'Document length says nothing about relevance to the query.',3:'Keyword counting is the OLD way (BM25); embeddings catch synonyms it misses.'}},
   {q:'Real LLM word embeddings differ from a hand-built 2D toy mainly by…', opts:['Having thousands of dimensions','Being hand-designed','Not using vectors','Being exact, not approximate'], a:0,
    tag:'scale', focus:'Same geometry, vastly more axes — recall the high-dimensional vectors of World 1.',
    why:'The lab is honest geometry at d=2; production embeddings are d=768–4096+. More room, same math.',
    wrong:{1:'Hand-designing thousands of coordinates per word is exactly what learning replaced.',2:'They are nothing BUT vectors.',3:'High-dim embeddings are just as approximate — more expressive, not exact.'}},
  ],
});
INTERACTIVES.mlembed = function(stage, api){
  const L=makeLab(stage);
  const words=[['man',1,1],['woman',1.6,1.1],['king',2,3],['queen',2.6,3.1],['cat',-1.7,1.3],['dog',-2.2,1],['car',-2,-2],['truck',-1.5,-2.2]];
  let q={x:0,y:0};
  const m=api.missions([
    {text:'Drag the query until its nearest neighbor is <b>cat</b>', xp:15, check:s=>s.nearest==='cat'},
    {text:'Compute <b>king − man + woman</b>: park the query there (±0.3) and read its neighbor', xp:30, check:s=>Math.hypot(s.x-2.6,s.y-3.1)<.3},
    {text:'Visit the <b>vehicle cluster</b> (nearest = car or truck)', xp:15, check:s=>s.nearest==='car'||s.nearest==='truck'},
  ]);
  const P=plane(L.ctx,L.W,L.H,58);
  let drag=false;
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    let best=null,bd=1e9;
    for(const [w,x,y] of words){ const d=Math.hypot(q.x-x,q.y-y); if(d<bd){bd=d;best=w;} }
    for(const [w,x,y] of words){
      P.dot(x,y,6,w===best?'#2dd4a0':'#ffc94d');
      L.ctx.fillStyle=w===best?'#2dd4a0':'#8b93b8'; L.ctx.font='700 12px '+getComputedStyle(document.body).fontFamily;
      L.ctx.fillText(w,P.sx(x)+9,P.sy(y)-7);
    }
    L.ctx.setLineDash([4,4]); L.ctx.strokeStyle='rgba(45,212,160,.5)'; L.ctx.lineWidth=1.5;
    const bw=words.find(w=>w[0]===best);
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(q.x),P.sy(q.y)); L.ctx.lineTo(P.sx(bw[1]),P.sy(bw[2])); L.ctx.stroke();
    L.ctx.setLineDash([]);
    P.dot(q.x,q.y,8,'#7c5cff');
    L.readout.innerHTML='query = ['+q.x.toFixed(2)+', '+q.y.toFixed(2)+']<br>nearest: <b>'+best+'</b> (dist '+bd.toFixed(2)+')';
    m.update({x:q.x,y:q.y,nearest:best});
  }
  L.canvas.addEventListener('pointerdown',e=>{drag=true;L.canvas.setPointerCapture(e.pointerId);mv(e);});
  L.canvas.addEventListener('pointermove',mv);
  L.canvas.addEventListener('pointerup',()=>drag=false);
  function mv(e){ if(!drag)return; const c=L.toCanvas(e); q.x=P.wx(c.x); q.y=P.wy(c.y); draw(); }
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">A tiny embedding space. Drag the <b style="color:#b9a8ff">purple query</b> — the dashed line tracks its nearest neighbor. For the analogy mission: king is at (2,3); man→woman is the offset (+0.6, +0.1)…</div>';
  L.ctrl.appendChild(note);
  draw();
};

registerLesson({
  id:'ml-attn', world:'ml', emoji:'🔦', title:'Attention: Soft Lookup',
  sub:'Each token asks a question (query), every token offers an answer (key/value). Dot products decide who gets heard.',
  learn:`<p><strong>Attention</strong> is a differentiable dictionary lookup. For one token:</p>
  <div class="formula">$$\\text{weights} = \\text{softmax}(q \\cdot k_1, q \\cdot k_2, \\ldots) \\qquad \\text{output} = \\sum \\text{weight}_i \\cdot \\text{value}_i$$</div>
  <p>• <strong>q</strong> (query): what this token is looking for<br>
  • <strong>kᵢ</strong> (keys): what each token advertises — alignment scored by the <strong>dot product</strong> (World 1!)<br>
  • <strong>softmax</strong> (World 2's eˣ!) turns scores into weights summing to 1<br>
  • Output: a <strong>blend of values</strong>, weighted by relevance</p>
  <p>No hard choice is ever made — everything is a weighted average, so gradients flow through the whole lookup. That's the trick that made transformers trainable.</p>`,
  ml:`This is THE mechanism of the transformer era. "Multi-head" = several q/k/v lookups in parallel; "self-attention" = every token querying every other. Your two prior worlds literally assemble into it: dot products score, softmax normalizes, the chain rule trains it.`,
  deeper:[
   {title:'😵 Stuck? The cocktail party', body:'You (query) are at a party listening for gossip about math. Each guest broadcasts a topic (key). You tune your ear toward topic-matched guests — mostly. What you take home is a blend of what they said (values), weighted by how hard you listened. Nobody gets fully ignored: soft, not hard, attention.'},
   {title:'🚀 Go deeper: scaling and masks', body:'Real attention divides scores by √d before softmax — for unit-variance components the dot product q·k has <em>variance</em> d (so it scales like √d), big enough to saturate softmax and kill gradients; the √d divisor restores variance ≈ 1. And GPTs add a causal mask: token i may only attend to tokens ≤ i, which is what makes generation left-to-right.'},
   {title:'🚀 Go deeper: where q, k, v come from', body:'q, k, v aren\'t given — each is a <b>learned linear projection of the same token embedding</b>: q = W_Q·x, k = W_K·x, v = W_V·x. The key is what a token advertises for matching; the <b>value</b> is the (separate) content it contributes to the output — so the output is a blend of <em>values</em>, not keys. "Multi-head" runs several (W_Q, W_K, W_V) triples in parallel so different heads attend in different subspaces, then concatenates and projects with W_O.'},
   {title:'🚀 Go deeper: the O(n²) price', body:'Self-attention has every token query every other token, so for a sequence of length n it forms an n×n table of scores — <b>O(n²)</b> compute and memory. Double the context and the attention cost <em>quadruples</em>; that quadratic wall is why context windows were long stuck in the low thousands and why so much research chases cheaper variants: <b>FlashAttention</b> (same exact math, but tiled to avoid ever writing the full n×n matrix to slow memory) and approximate/linear schemes (Longformer, Performer) that trade exactness for O(n). The per-token MLP, by contrast, is only O(n) — attention is the part that scales badly with length.'}],
  interactive:'mlattn',
  quiz:[
   {q:'Attention weights are produced by…', opts:['softmax over query·key dot products','Multiplying all the values together','A hard argmax pick','Random sampling'], a:0,
    tag:'attention mechanics', focus:'Score with q·k, normalize with softmax, blend the values. Three steps.',
    why:'Dot products measure query/key alignment; softmax turns scores into positive weights summing to 1.',
    wrong:{1:'Values are blended ADDITIVELY with weights — never multiplied together.',2:'Argmax is the hard lookup attention deliberately avoids.',3:'Weights are deterministic given q and k — no dice.'}},
   {q:'Why softmax instead of picking the single best key?', opts:['A soft blend is differentiable — gradients can train it','It\'s faster to compute','Argmax would be too accurate','To use more memory'], a:0,
    tag:'differentiability', focus:'Hard choices have zero gradient. Everything in a transformer must be smooth enough to backprop through.',
    why:'Argmax has no useful derivative; the soft weighted average lets the chain rule assign credit through the lookup.',
    wrong:{1:'Softmax is actually slightly slower than argmax — the win is gradients, not speed.',2:'"Too accurate" isn\'t a thing; untrainable is.',3:'Memory is irrelevant here.'}},
   {q:'The output of one attention head is…', opts:['A weighted average of value vectors','The largest key','The query, unchanged','A probability'], a:0,
    tag:'attention output', focus:'Output = Σ wᵢvᵢ — a blend vector, not a choice and not a scalar.',
    why:'The weights blend the VALUE vectors into one output vector — information gathered from across the sequence.',
    wrong:{1:'Keys only score the lookup; they aren\'t returned.',2:'If outputs were unchanged queries, attention would do nothing.',3:'The WEIGHTS are probabilities; the output is a full vector.'}},
   {q:'When a query vector aligns more closely with one key, that key\'s attention weight…', opts:['Rises toward 1 while the others shrink','Drops to zero','Stays fixed','Turns negative'], a:0,
    tag:'query-key geometry', focus:'Alignment ⇒ bigger dot product ⇒ exponentially bigger softmax share.',
    why:'Bigger q·k for that key, and softmax amplifies the gap — weights shift toward the aligned key.',
    wrong:{1:'Weights dropping when you align would be anti-attention.',2:'Fixed weights = no lookup at all.',3:'Softmax outputs are always positive.'}},
  ],
});
INTERACTIVES.mlattn = function(stage, api){
  const L=makeLab(stage);
  const toks=[['the',2.4,0.6],['cat',1.8,2.0],['sat',-0.8,2.2],['mat',-2.2,-1.0]];
  let q={x:.3,y:.3};
  const m=api.missions([
    {text:'Focus: get weight on <b>cat</b> above 0.8', xp:20, check:s=>s.w[1]>.8},
    {text:'Diffuse: make attention nearly <b>uniform</b> (max−min &lt; 0.1) — where must q sit?', xp:25, check:s=>(Math.max(...s.w)-Math.min(...s.w))<.1},
    {text:'Re-aim: weight on <b>mat</b> above 0.8', xp:20, check:s=>s.w[3]>.8},
  ]);
  const P=plane(L.ctx,L.W,L.H,62,L.W/2-90,L.H/2);
  let drag=false;
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const scores=toks.map(([_,x,y])=>q.x*x+q.y*y);
    const mx=Math.max(...scores);
    const ex=scores.map(s=>Math.exp(s-mx)), Z=ex.reduce((a,b)=>a+b,0);
    const w=ex.map(e=>e/Z);
    toks.forEach(([t,x,y],i)=>{
      P.arrow(0,0,x,y,'rgba(255,201,77,'+(0.25+w[i]*0.75)+')',2+w[i]*5,t);
    });
    P.arrow(0,0,q.x,q.y,'#7c5cff',4,'q');
    P.dot(q.x,q.y,7,'#b9a8ff');
    // weight bars
    const bx=L.W-150;
    toks.forEach(([t],i)=>{
      L.ctx.fillStyle='rgba(255,255,255,.12)'; L.ctx.fillRect(bx,30+i*34,110,18);
      L.ctx.fillStyle='#00d4ff'; L.ctx.fillRect(bx,30+i*34,110*w[i],18);
      L.ctx.fillStyle='#e8ecff'; L.ctx.font='700 11px '+getComputedStyle(document.body).fontFamily;
      L.ctx.fillText(t+' '+(w[i]).toFixed(2), bx+4, 43+i*34);
    });
    L.readout.innerHTML='weights = softmax(q·k)<br>'+toks.map(([t],i)=>t+': '+w[i].toFixed(2)).join('  ');
    m.update({w});
  }
  L.canvas.addEventListener('pointerdown',e=>{drag=true;L.canvas.setPointerCapture(e.pointerId);mv(e);});
  L.canvas.addEventListener('pointermove',mv);
  L.canvas.addEventListener('pointerup',()=>drag=false);
  function mv(e){ if(!drag)return; const c=L.toCanvas(e); q.x=P.wx(c.x); q.y=P.wy(c.y); draw(); }
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Gold arrows = the <b>keys</b> of four tokens (thicker = more attended). Drag the <b style="color:#b9a8ff">query</b>: its dot product with each key feeds the softmax bars. For uniform attention, think: what q gives EQUAL dot products with everything?</div>';
  L.ctrl.appendChild(note);
  draw();
};

registerLesson({
  id:'ml-gpt', world:'ml', emoji:'🔮', title:'GPTs: Next-Token Prediction',
  sub:'The entire trick: predict the next token, sample, repeat. Temperature decides how brave the dice are.',
  learn:`<p>A GPT does exactly one thing: given tokens so far, output a <strong>probability distribution over the next token</strong> (softmax again). Generation is a loop:</p>
  <div class="formula">predict → sample → append → repeat</div>
  <p><strong>Temperature</strong> rescales the distribution before sampling: T→0 always takes the top token (greedy — deterministic, repetitive); high T flattens toward uniform (creative → gibberish).</p>
  <p>Your lab model is a real (tiny) language model: bigram counts from a 20-token corpus. The <em>sampling loop</em> — predict a distribution, apply temperature, sample, append, repeat — is identical to GPT-4's. What differs is how the distribution is computed: a lookup table here versus billions of parameters (attention + MLPs) there. Same outer loop, vastly different engine.</p>`,
  ml:`Everything an LLM says is this loop. "Hallucination" = plausible-by-distribution but wrong; temperature/top-p are the knobs you'll set in every API call; and training = nudging these distributions toward the corpus via cross-entropy (the ln from c-exp) and backprop (c-chain). The full stack you've built now closes.`,
  deeper:[
   {title:'😵 Stuck? The autocomplete view', body:'It\'s your phone keyboard\'s next-word suggestion, scaled a billionfold: see context, score every possible next token, pick one, repeat. No plan, no lookahead — any apparent planning EMERGES from very good next-token guesses.'},
   {title:'🚀 Go deeper: context windows and why attention matters', body:'A bigram model sees only 1 token back — watch it lose the plot in the lab. Attention is what lets real models condition on thousands of prior tokens at once: every new token queries the entire context. Context window = how far back those queries can reach.'},
   {title:'🚀 Go deeper: beyond temperature — top-k &amp; top-p', body:'Temperature reshapes the <em>whole</em> distribution, but high T can still hand real probability to nonsense tokens. Two truncation knobs fix that by sampling only from a shortlist: <b>top-k</b> keeps the k most-likely tokens and renormalizes; <b>top-p</b> (nucleus) keeps the smallest set whose probabilities sum to p (e.g. 0.9), so the shortlist grows when the model is unsure and shrinks when it\'s confident. In practice you combine them — temperature to set the overall boldness, top-p to clip the long tail of garbage. All three act only at sampling time; none of them touch the model\'s weights.'},
   {title:'🚀 Go deeper: cross-entropy, not squared error', body:'The head outputs a distribution, so training uses <b>cross-entropy</b> loss — −ln p(correct token), the ln from c-exp — not the mean-squared error you\'d use for regression. Why it matters: with softmax + cross-entropy the gradient on the logits is simply (predicted probability − target) — clean, and it never saturates. Pairing softmax with MSE instead gives a gradient that vanishes exactly when the model is <em>confidently wrong</em>, so learning stalls. Cross-entropy also punishes a confident mistake almost without bound (−ln of a tiny number is huge), which is precisely the pressure you want on a classifier.'},
   {title:'🚀 Go deeper: the KV-cache', body:'Naively, generating token 1001 would re-run attention over all 1000 prior tokens from scratch every step. But a token\'s key and value vectors never change once computed, so models <b>cache</b> them: each new step computes k,v for just the one new token, appends to the cache, and the fresh query attends over the stored keys/values. That turns per-step cost from "reprocess everything" into "process one token, look up the rest" — the single biggest reason autoregressive generation is fast, at the price of a cache whose memory grows with context length.'}],
  interactive:'mlgpt',
  quiz:[
   {q:'At temperature → 0, generation becomes…', opts:['Deterministic — always the most likely token','Pure noise','Slower','Always longer'], a:0,
    tag:'temperature', focus:'T→0 = greedy argmax; high T → uniform chaos. You produced both in the lab.',
    why:'Near zero temperature the top token gets all the probability mass: same input, same output, often loops.',
    wrong:{1:'High temperature is the noise direction.',2:'Sampling strategy barely affects speed.',3:'Length is governed by stop tokens, not T.'}},
   {q:'A GPT\'s output layer produces…', opts:['A probability distribution over the whole vocabulary','A single word string','A parse tree','A database query'], a:0,
    tag:'model output', focus:'One score per vocab token, softmaxed. The "choice" happens at sampling.',
    why:'The model emits logits for every token; softmax makes them probabilities; the sampler picks.',
    wrong:{1:'The string appears only after sampling from the distribution.',2:'No symbolic parse trees anywhere in a GPT.',3:'No database — just weights.'}},
   {q:'Why can an LLM "hallucinate" fluent falsehoods?', opts:['It samples what\'s probable, not what\'s verified','Its database is corrupted','It chooses to lie','Too low a temperature'], a:0,
    tag:'hallucination', focus:'Distributions encode plausibility from training text — there is no truth check in the loop.',
    why:'Probable-next-token ≠ true: fluent falsehoods can be high-probability. Nothing in predict→sample→repeat verifies facts.',
    wrong:{1:'There\'s no database to corrupt — knowledge is smeared across weights.',2:'No intent: the loop has no concept of truth to violate.',3:'Low temperature REDUCES randomness; hallucination persists even greedy.'}},
   {q:'A bigram language model tends to derail mid-sentence because…', opts:['It only conditions on ONE previous token','Its temperature was broken','14 words is plenty of data','Bigram models can\'t use softmax'], a:0,
    tag:'context length', focus:'Bigrams see 1 token of context; transformers attend to thousands. That difference IS the revolution.',
    why:'With one token of memory, "sat on the…" and "dog on the…" look identical. Attention exists to widen exactly this bottleneck.',
    wrong:{1:'Temperature worked fine — it\'s the memory that\'s one token deep.',2:'14 words is comically little data, but the DERAILING is a context problem.',3:'The lab literally softmaxes bigram counts.'}},
  ],
});
INTERACTIVES.mlgpt = function(stage, api){
  const corpus='the cat sat on the mat . the dog sat on the rug . the cat saw the dog .'.split(' ');
  const big={}; for(let i=0;i<corpus.length-1;i++){ (big[corpus[i]]=big[corpus[i]]||{})[corpus[i+1]]=(big[corpus[i]]?.[corpus[i+1]]||0)+1; }
  let seq=['the'], T=1, sampled=0, hiT=0, loT=0, ended=false;
  const m=api.missions([
    {text:'Go <b>greedy</b>: T ≤ 0.2, sample 6 tokens (watch it commit to one groove)', xp:20, check:s=>s.loT>=6},
    {text:'Go <b>chaotic</b>: T ≥ 2, sample 6 tokens', xp:20, check:s=>s.hiT>=6},
    {text:'Generate until a sentence <b>ends</b> (a "." appears)', xp:20, check:s=>s.ended},
  ]);
  const box=document.createElement('div'); box.className='ctrl';
  box.innerHTML='<label><span>TINY GPT (bigram) — corpus: "'+corpus.join(' ')+'"</span></label>'+
    '<div id="gseq" style="font-family:var(--mono);font-size:15px;line-height:1.8;color:#aee8ff;min-height:56px;background:var(--bg2);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 12px;margin:8px 0"></div>'+
    '<div id="gdist" style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px"></div>'+
    '<div class="chipbtns"><button class="chip" id="gnext">▶ Sample next token</button><button class="chip" id="greset">↺ Reset</button></div>';
  stage.appendChild(box);
  const ctrl=document.createElement('div'); ctrl.className='controls'; stage.appendChild(ctrl);
  const sl=slider(ctrl,'temperature',0.05,3,0.05,1,v=>v.toFixed(2),v=>{T=v;draw();});
  function dist(){
    const counts=big[seq[seq.length-1]]||{'the':1};
    const toks=Object.keys(counts);
    const logits=toks.map(t=>Math.log(counts[t]));
    const mx=Math.max(...logits.map(l=>l/T));
    const ex=logits.map(l=>Math.exp(l/T-mx)), Z=ex.reduce((a,b)=>a+b,0);
    return toks.map((t,i)=>[t,ex[i]/Z]).sort((a,b)=>b[1]-a[1]);
  }
  function draw(){
    box.querySelector('#gseq').textContent=seq.join(' ')+' ▌';
    box.querySelector('#gdist').innerHTML=dist().map(([t,p])=>
      '<div style="display:flex;align-items:center;gap:8px;font-size:12px;font-family:var(--mono)">'+
      '<span style="width:42px;color:#8b93b8">'+t+'</span>'+
      '<div style="flex:1;background:rgba(255,255,255,.08);border-radius:4px;height:14px"><div style="width:'+(p*100)+'%;height:100%;background:var(--accent2);border-radius:4px"></div></div>'+
      '<span style="width:40px;color:#aee8ff">'+(p*100).toFixed(0)+'%</span></div>').join('');
    m.update({loT,hiT,ended});
  }
  box.querySelector('#gnext').onclick=()=>{
    const d=dist(); let r=Math.random(), pick=d[d.length-1][0];
    for(const [t,p] of d){ if(r<p){ pick=t; break; } r-=p; }
    seq.push(pick); if(seq.length>14) seq.shift();
    sampled++; if(T<=0.2) loT++; if(T>=2) hiT++; if(pick==='.') ended=true;
    draw();
  };
  box.querySelector('#greset').onclick=()=>{ seq=['the']; draw(); };
  draw();
};

registerLesson({
  id:'ml-boss', world:'ml', emoji:'🚀', title:'BOSS: Assemble the Transformer',
  sub:'Every piece you\'ve learned, in one machine. Put it together and you can read the GPT papers.',
  learn:`<p>The full forward pass of a GPT, naming only things you now know:</p>
  <div class="formula">tokenize → embed → [ attention → MLP ] × N → softmax → sample</div>
  <p>• <strong>Tokenizer</strong>: text → integer ids (its merge rules are built once from a corpus, then frozen — no <em>gradient</em> learning in the forward pass)<br>
  • <strong>Embeddings</strong>: ids → vectors (learned — World 1's vectors)<br>
  • <strong>Attention</strong>: tokens exchange information (dot products + softmax)<br>
  • <strong>MLP</strong>: per-token hinge-bending (matrices + ReLU)<br>
  • <strong>Softmax head</strong>: vector → next-token distribution (eˣ)<br>
  • <strong>Sampler</strong>: distribution → token (no learning — dice + temperature)</p>
  <p>Training: cross-entropy loss on next-token prediction, gradients via the chain rule, weights nudged by gradient descent. <em>You have now touched every load-bearing part.</em></p>`,
  ml:`From here the real papers are readable: "Attention Is All You Need" is your ml-attn lesson plus engineering; scaling laws are ml-learning's capacity story at planetary size; RLHF is gradient descent on a learned reward. Go read them — that's the actual moon.`,
  deeper:[
   {title:'😵 Stuck? Follow one word through', body:'Trace "cat" through the machine: → id 1742 → its embedding vector → attention mixes in context ("the cat SAT...") → MLP reshapes it → softmax head scores every next token → dice. One token\'s journey is the whole architecture in miniature.'},
   {title:'🚀 Go deeper: what\'s simplified here', body:'<b>Positional encoding</b> isn\'t optional — attention is order-blind, so real GPTs <em>add a learned position embedding to each token embedding</em> before block 1 (else "cat sat on mat" = "mat sat on cat"). <b>Residual connections</b> add the input back so gradients flow (the vanishing-gradient fix from c-chain). <b>LayerNorm</b> keeps activations well-scaled, and GPT-2+ put it <em>before</em> each sub-block (<b>pre-norm</b>: x + attn(LN(x))), which is what lets 96-layer models train — plus one final LN before the output projection. And the "softmax head" is really a big learned <b>unembedding</b> matrix then softmax. <b>KV caching</b> is why generation is fast. Each is a one-paragraph read now that the skeleton is yours.'}],
  interactive:'mlboss',
  quiz:[
   {q:'Which two pipeline stages have NO learned parameters?', opts:['Tokenizer and sampler','Embeddings and MLP','Attention and softmax head','All stages learn'], a:0,
    tag:'what is learned', focus:'Learning lives in embeddings, attention (W_q/k/v) , MLPs, and the output head. The ends of the pipe are fixed machinery.',
    why:'The tokenizer is a fixed lookup built before training; the sampler is dice. Everything between them is trained weights.',
    wrong:{1:'Embeddings and MLP are the most parameter-heavy LEARNED parts.',2:'Both attention projections and the head are trained matrices.',3:'The pipe\'s ends — tokenizer, sampler — are fixed.'}},
   {q:'"Depth" (the ×N) in a transformer means…', opts:['Attention+MLP blocks stacked, each refining the representation','More vocabulary','Longer context window','Higher temperature'], a:0,
    tag:'architecture', focus:'N stacked blocks = repeated rounds of "exchange info (attention), then process (MLP)".',
    why:'Each block lets tokens gather context and re-process; stacking composes these refinements — matrix composition at civilization scale.',
    wrong:{1:'Vocabulary size is a tokenizer property, not depth.',2:'Context length is the sequence dimension, orthogonal to depth.',3:'Temperature is a sampling-time knob, not architecture.'}},
   {q:'GPTs train on which loss?', opts:['Cross-entropy on next-token prediction','Squared error on pixel values','Accuracy, directly','Human ratings, from the start'], a:0,
    tag:'training objective', focus:'Predict-the-next-token + cross-entropy (a sum of −ln p). RLHF comes later, on top.',
    why:'Pretraining maximizes log-probability of the real next token — cross-entropy. RLHF fine-tunes afterward.',
    wrong:{1:'Pixels belong to vision models; tokens are categorical → cross-entropy.',2:'Accuracy isn\'t differentiable — you can\'t backprop a step function (c-deriv!).',3:'Human feedback arrives in fine-tuning (RLHF), after pretraining.'}},
   {q:'Why does attention come BEFORE the MLP in each block?', opts:['Gather context first, then process each token with it','Alphabetical order','MLPs can\'t follow softmax','It\'s arbitrary and never matters'], a:0,
    tag:'block structure', focus:'Attention = communicate across tokens; MLP = compute per token. Communicate, then compute.',
    why:'The MLP acts on each token independently — it can only use context that attention already mixed in. (Order details vary, but communicate-then-compute is the logic.)',
    wrong:{1:'Alphabetical order — tempting, wrong.',2:'MLPs happily follow anything; it\'s about information flow.',3:'It matters: a per-token MLP without context would just re-process ignorance.'}},
  ],
});
INTERACTIVES.mlboss = function(stage, api){
  const partsTrue=['tokenizer','embeddings','attention','MLP','softmax head','sampler'];
  const learned={embeddings:1,'attention':1,'MLP':1,'softmax head':1};
  let order=[], phase=0, fastDone=false, t0=0, pickedNoLearn=[];
  const m=api.missions([
    {text:'Assemble the pipeline in the correct <b>forward-pass order</b>', xp:30, check:s=>s.built>=1},
    {text:'Rebuild it in under <b>20 seconds</b> (fluency, not memory)', xp:20, check:s=>s.fast},
    {text:'Click only the two stages with <b>no learned parameters</b>', xp:20, check:s=>s.noLearn},
  ]);
  let built=0;
  const box=document.createElement('div'); box.className='ctrl';
  stage.appendChild(box);
  function render(){
    const remaining=partsTrue.filter(p=>!order.includes(p));
    box.innerHTML='<label><span>'+(phase<2?'BUILD THE FORWARD PASS — click stages in order':'CLICK THE TWO UNLEARNED STAGES')+'</span></label>'+
      '<div style="font-family:var(--mono);font-size:13px;color:#aee8ff;min-height:30px;margin:8px 0">'+
      (phase<2?(order.join(' → ')||'(empty)')+(remaining.length?' → ?':' ✓'):'selected: '+pickedNoLearn.join(', '))+'</div>'+
      '<div class="chipbtns">'+(phase<2?remaining:partsTrue).map(p=>'<button class="chip" data-p="'+p+'">'+p+'</button>').join('')+
      (phase===2?'':'')+'</div>';
    box.querySelectorAll('.chip').forEach(b=>{ b.onclick=()=>{
      const p=b.dataset.p;
      if(phase<2){
        if(p===partsTrue[order.length]){ order.push(p);
          if(order.length===partsTrue.length){
            if(phase===0){ built=1; phase=1; order=[]; t0=Date.now();
              setTimeout(render,600); }
            else { fastDone=(Date.now()-t0)<20000; phase=2; }
          }
        } else { order=[]; if(phase===1) t0=Date.now(); }
      } else {
        if(!pickedNoLearn.includes(p)) pickedNoLearn.push(p);
        if(pickedNoLearn.length>2) pickedNoLearn=[p];
      }
      render();
      m.update({built, fast:fastDone, noLearn:pickedNoLearn.length===2&&pickedNoLearn.every(x=>!learned[x])});
    };});
  }
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">A wrong click resets the chain — the order has to become reflex. Phase 2 repeats it against the clock; phase 3 asks where the learning lives.</div>';
  stage.appendChild(note);
  render();
};

