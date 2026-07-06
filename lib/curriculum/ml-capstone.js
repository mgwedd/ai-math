/* ================================================================
   WORLD 4 — MACHINE LEARNING · CAPSTONE
   Train a real MLP in the browser. Forward + backprop by hand, no
   libraries. The motivational payoff: every failure mode from the
   earlier ml lessons (lr divergence, too-little capacity, overfitting)
   reproduced live, with the loss curve descending and the decision
   boundary bending to fit a two-moons dataset in real time.

   Same registries + schema as the rest of the curriculum. The lab
   drives its own requestAnimationFrame loop and MUST return a cleanup
   that cancels it — the engine calls that on navigation.
   ================================================================ */
import { LESSONS, INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, slider, chips, clearBg, fmt2 } from '../engine.js';

registerLesson({
  id:'ml-capstone', world:'ml', order:90, emoji:'🏔️', title:'CAPSTONE: Train an MLP in the Browser',
  sub:'No libraries, no server — a real neural net learning live in your tab. Every earlier failure mode, reproducible on demand.',
  learn:`<p>This is the summit. A <strong>multi-layer perceptron</strong> — 2 inputs → a hidden layer of tanh neurons → 1 output — trained by <strong>plain gradient descent</strong>, entirely in JavaScript running in this page. No PyTorch, no GPU, no magic. Everything you built across four worlds, assembled and running:</p>
  <p>• <strong>Forward pass</strong> (World 1): the input <code>[x₁, x₂]</code> is a vector; each layer is a <em>matrix multiply</em> then a nonlinearity. <code>h = tanh(W₁·x + b₁)</code>, then <code>ŷ = σ(W₂·h + b₂)</code>.<br>
  • <strong>Loss</strong> (World 3): binary cross-entropy — how surprised the model is by the true label.<br>
  • <strong>Backprop</strong> (World 2): the chain rule, run backwards through the net, hands every weight its gradient <code>∂loss/∂w</code>.<br>
  • <strong>Update</strong>: <code>w ← w − η·∇w</code>. Gradient <em>descent</em>. Repeat for E epochs.</p>
  <div class="formula">$$h = \\tanh(W_1 x + b_1) \\qquad \\hat{y} = \\sigma(W_2 h + b_2) \\qquad w \\leftarrow w - \\eta \\cdot \\nabla w$$</div>
  <p>The dataset is <strong>two interleaving moons</strong> — not linearly separable, so a single line can never fit it. You need the hidden layer's bent hinges (the universal-approximation idea from <em>Neurons &amp; MLPs</em>) to carve a curved <strong>decision boundary</strong> between the two classes. Press <b>Train</b> and watch the loss curve fall while the boundary bends to wrap the moons.</p>
  <p>Then break it on purpose. The learning rate <strong>η</strong> is the single most temperamental knob in all of deep learning: too high and the loss <em>diverges</em> (overshoots the valley and climbs the far wall); too low and it <em>crawls</em> (thousands of tiny steps to nowhere). Too few hidden neurons and the net simply <em>can't bend far enough</em> — underfitting, live.</p>`,
  ml:`This is the whole loop that trains GPT-scale models, shrunk until you can watch every epoch: <b>forward → loss → backprop → step</b>. The engine here is a few hundred parameters; a frontier model is a trillion — but the outer loop is character-for-character identical. Every hyperparameter headache you'll ever hit (diverging loss, dead training, overfitting) has a cause you can now <em>see</em> at toy scale. When someone says "the loss blew up so we dropped the learning rate", you'll know exactly what picture that sentence draws.`,
  deeper:[
   {title:'😵 Stuck? What "the boundary" actually is', body:'The output ŷ is a number between 0 and 1 — the model\'s guess at P(class = orange). The <b>decision boundary</b> is the set of points where ŷ = 0.5: the fence the net draws between "probably blue" and "probably orange". Early in training that fence is a vague straight-ish smear; as the hidden neurons specialize, it bends into an S that threads between the two moons. That bending IS learning made visible.'},
   {title:'🚀 Go deeper: why tanh, and why cross-entropy not squared error', body:'The hidden layer uses <b>tanh</b> (a smooth, centered S-curve) rather than ReLU purely so the boundary looks smooth at this tiny scale — the gradients (1 − tanh²) are trivial to backprop by hand. The output uses <b>sigmoid σ</b> to squash into a probability, paired with <b>binary cross-entropy</b> loss. That pairing is not cosmetic: it makes the output-layer gradient collapse to the beautifully simple <code>ŷ − y</code>. Squared error on a sigmoid instead gives a gradient that vanishes when the model is confidently wrong — training stalls exactly when it most needs to move. The loss/activation pairing is a real engineering choice, not a default.'},
   {title:'🚀 Go deeper: learning rate is a Goldilocks dial', body:'Gradient descent takes a step of size η in the downhill direction. The gradient tells you <em>which way</em>; η alone sets <em>how far</em>. Picture a marble in a bowl: too big a step and it flies past the bottom and up the opposite wall, each step worse than the last — the loss <b>diverges</b> to NaN/∞. Too small and it inches down forever. The usable band is often a factor of 100 wide and problem-specific, which is why "tune the learning rate first" is the oldest advice in the field. Modern optimizers (Adam, learning-rate schedules, warmup) are all elaborate machines for <em>not having to guess η perfectly</em> — but they\'re still riding this same cliff.'},
   {title:'🚀 Go deeper: capacity, and how this connects to overfitting', body:'Hidden size is <b>capacity</b> — how many hinges the net can place. Two moons need a handful of bends; with 1–2 hidden units the boundary is too stiff to wrap them (<b>underfitting</b>, high loss on everything). Crank capacity way up on a <em>tiny, noisy</em> dataset and the flip side appears: the boundary contorts to snake around individual points — memorizing noise — which is the <b>overfitting</b> from <i>What Learning Is</i>. This lab shows the low-capacity failure directly; the fit-vs-overfit lesson shows the high-capacity one. Same U-shaped tradeoff, two labs.'}],
  interactive:'mlcapstone',
  quiz:[
   {q:'You train an MLP and the loss shoots up to NaN within a few epochs. The most likely single cause is…', opts:['Learning rate too high','Learning rate too low','Too few epochs','The dataset is linearly separable'], a:0,
    tag:'lr divergence', focus:'Too-high η overshoots the minimum and climbs the far wall — loss grows, then blows up. Reproduce it: push η past the safe band.',
    why:'A too-large step overshoots the downhill minimum and lands higher up the opposite wall; each step compounds until the loss explodes to ∞/NaN. Cut η by 3–10× and it settles.',
    wrong:{1:'A too-LOW rate makes loss crawl <i>down</i> slowly — it never blows up. Divergence is the high-η signature.',2:'Too few epochs means you stop early with a mediocre loss, not an exploding one.',3:'Separability affects whether a line suffices, not whether the loss diverges — divergence is a step-size problem.'}},
   {q:'Loss decreases, but painfully slowly — barely moving after many epochs. The fix most likely to help is…', opts:['Increase the learning rate','Decrease the learning rate further','Remove the hidden layer','Shuffle the option order'], a:0,
    tag:'lr too low', focus:'Too-small η = tiny steps = crawling loss. Nudge η up until it descends briskly without diverging.',
    why:'A crawling loss is the too-small-step symptom: the direction is right but each move is minuscule. Raising η (staying below the divergence cliff) makes it descend faster.',
    wrong:{1:'Lowering η further makes the crawl even slower — the opposite of the fix.',2:'Removing the hidden layer strips the net of the capacity to bend at all — it would fit worse, not train faster.',3:'Option order is a quiz artifact, not a training knob.'}},
   {q:'A two-moons dataset is NOT linearly separable. What does the MLP\'s hidden layer provide that a single linear classifier cannot?', opts:['A curved (nonlinear) decision boundary','Faster matrix multiplies','A larger learning rate','More training data'], a:0,
    tag:'why hidden layer', focus:'Hidden neurons + nonlinearity = bendable boundary. Without them the net is one linear map — a straight fence only.',
    why:'Stacked linear maps collapse to one line. The hidden layer\'s nonlinearity (tanh here) lets the net bend space, drawing the curved fence that threads between two interleaving moons.',
    wrong:{1:'The hidden layer adds compute, it doesn\'t speed multiplies up — the point is expressiveness.',2:'Learning rate is an unrelated optimization knob; the hidden layer changes what shapes are representable.',3:'It changes the model\'s capacity, not the amount of data.'}},
   {q:'On a small, noisy dataset you keep adding hidden neurons until the boundary snakes tightly around individual points. Train loss ≈ 0, but new points are misclassified. This is…', opts:['Overfitting — too much capacity for the data','Underfitting — too little capacity','Learning-rate divergence','A bug in backprop'], a:0,
    tag:'capacity/overfitting', focus:'Near-zero train loss + poor generalization = memorized noise. The high-capacity failure, mirror image of underfitting.',
    why:'A boundary contorting around single points has memorized noise: train loss ≈ 0 while unseen points fail. That train/generalization gap is the overfitting signature from What Learning Is.',
    wrong:{1:'Underfitting fails on the TRAINING data too — here train loss is ~0, the opposite tell.',2:'Divergence makes loss explode; here train loss is near zero.',3:'Backprop bugs usually prevent learning entirely — here the model learned the training set too well.'}},
   {q:'The core training loop that fits this MLP — the same one that trains GPT-scale models — is…', opts:['forward → loss → backprop → update, repeated','sample → append → repeat','sort → search → return','embed → retrieve → rank'], a:0,
    tag:'training loop', focus:'Predict, measure error, chain-rule the gradients backward, step downhill, repeat. Four steps, any scale.',
    why:'Forward pass computes a prediction, the loss measures its error, backprop (chain rule) sends gradients to every weight, and the update steps downhill. Looping that is training — from this toy to a trillion parameters.',
    wrong:{1:'sample→append→repeat is GPT text GENERATION (inference), not the training loop.',2:'sort/search/return is classical algorithms, not gradient learning.',3:'embed→retrieve→rank is semantic search / RAG, not the weight-update loop.'}},
  ],
});

INTERACTIVES.mlcapstone = function(stage, api){
  const L = makeLab(stage, {w:640, h:440});

  /* ---------- dataset: two interleaving moons (≤200 pts) ----------
     R sizes the moons to fill the [-2,2] plot; NZ is label noise. Tuned
     so a full hidden layer fits it (~96% acc) while a single hidden unit
     can only draw one bend and visibly UNDERFITS (~88%). */
  const R = 1.3, NZ = 0.25;
  function makeMoons(n){
    const pts=[]; const half=Math.floor(n/2);
    for(let i=0;i<half;i++){                 // upper moon → class 0
      const t=Math.PI*i/(half-1);
      pts.push({x:R*Math.cos(t)-0.6 + (Math.random()-0.5)*NZ,
                y:R*Math.sin(t)-0.3 + (Math.random()-0.5)*NZ, c:0});
    }
    for(let i=0;i<n-half;i++){                // lower moon → class 1
      const t=Math.PI*i/(n-half-1);
      pts.push({x:R*(1-Math.cos(t))-0.6 + (Math.random()-0.5)*NZ,
                y:-R*Math.sin(t)+0.3 + (Math.random()-0.5)*NZ, c:1});
    }
    return pts;
  }
  let DATA = makeMoons(160);

  /* ---------- network: 2 -> H (tanh) -> 1 (sigmoid) ---------- */
  let H = 8, lr = 0.5, epochsTarget = 300;
  let net = null;
  function initNet(h){
    // small random weights; He-ish scaling keeps early activations sane
    const rnd = s => (Math.random()*2-1)*s;
    const W1 = [], b1 = [];
    for(let j=0;j<h;j++){ W1.push([rnd(1.0), rnd(1.0)]); b1.push(rnd(0.3)); }
    const W2 = [], b2 = rnd(0.3);
    for(let j=0;j<h;j++) W2.push(rnd(1.0));
    return {W1, b1, W2, b2, h};
  }
  const sigmoid = z => 1/(1+Math.exp(-z));
  function forward(nt, x0, x1){
    const h = new Array(nt.h);
    for(let j=0;j<nt.h;j++) h[j] = Math.tanh(nt.W1[j][0]*x0 + nt.W1[j][1]*x1 + nt.b1[j]);
    let z = nt.b2; for(let j=0;j<nt.h;j++) z += nt.W2[j]*h[j];
    return {h, yhat: sigmoid(z)};
  }
  // one full-batch gradient-descent step; returns mean cross-entropy loss
  function trainStep(nt){
    const gW1 = nt.W1.map(()=>[0,0]), gb1 = new Array(nt.h).fill(0);
    const gW2 = new Array(nt.h).fill(0); let gb2 = 0;
    let loss = 0;
    for(const p of DATA){
      const {h, yhat} = forward(nt, p.x, p.y);
      const eps = 1e-7, y = p.c;
      loss += -(y*Math.log(yhat+eps) + (1-y)*Math.log(1-yhat+eps));
      const dz = yhat - y;                 // ∂loss/∂z2  (sigmoid + BCE simplify)
      gb2 += dz;
      for(let j=0;j<nt.h;j++){
        gW2[j] += dz*h[j];
        const dh = dz*nt.W2[j]*(1 - h[j]*h[j]);   // through tanh: 1 − tanh²
        gW1[j][0] += dh*p.x; gW1[j][1] += dh*p.y; gb1[j] += dh;
      }
    }
    const n = DATA.length, s = lr/n;
    nt.b2 -= s*gb2;
    for(let j=0;j<nt.h;j++){
      nt.W2[j] -= s*gW2[j];
      nt.W1[j][0] -= s*gW1[j][0]; nt.W1[j][1] -= s*gW1[j][1]; nt.b1[j] -= s*gb1[j];
    }
    return loss/n;
  }

  /* ---------- view: plot spans world x,y ∈ [-2, 2] ---------- */
  const PAD = 8, PW = 380, PH = L.H - 2*PAD;   // left: data + boundary
  const ox = PAD, oy = PAD;
  const wx = 4, wy = 4;                         // world span (-2..2)
  const sx = x => ox + (x+2)/wx * PW;
  const sy = y => oy + (2-y)/wy * PH;           // y-up
  // loss curve panel on the right
  const LX = PAD + PW + 24, LY = 40, LW = L.W - LX - PAD, LH = 150;

  let lossHist = [];                            // recorded mean loss per epoch
  let epoch = 0, running = false, raf = 0, diverged = false;
  let bestLoss = Infinity, converged = false;

  // precomputed boundary grid (recomputed each redraw, coarse for speed)
  const GRID = 44;

  function classColor(c){ return c===0 ? '#00d4ff' : '#ffc94d'; }

  function drawBoundary(){
    // fill a coarse grid with the model's probability, cheap & smooth enough
    const cell = PW/GRID, cellH = PH/GRID;
    for(let gx=0; gx<GRID; gx++){
      for(let gy=0; gy<GRID; gy++){
        const worldX = (gx+0.5)/GRID*wx - 2;
        const worldY = 2 - (gy+0.5)/GRID*wy;
        const p = net ? forward(net, worldX, worldY).yhat : 0.5;
        // blue (class0) ↔ gold (class1), faint
        const t = p;                       // 0..1
        const r = Math.round(0 + t*255*0.85);
        const g = Math.round(212*(1-t) + 201*t);
        const b = Math.round(255*(1-t) + 77*t);
        L.ctx.fillStyle = 'rgba('+r+','+g+','+b+',0.16)';
        L.ctx.fillRect(ox+gx*cell, oy+gy*cellH, cell+1, cellH+1);
      }
    }
    // the ŷ = 0.5 fence, drawn by marching the grid for sign changes
    L.ctx.strokeStyle = '#7c5cff'; L.ctx.lineWidth = 2.5;
    L.ctx.beginPath();
    const step = 3;
    let prevRow = null;
    for(let px=0; px<=PW; px+=step){
      const worldX = px/PW*wx - 2;
      // find y where yhat crosses 0.5 (scan top→bottom for a sign flip)
      let last = null, crossY = null;
      for(let py=0; py<=PH; py+=step){
        const worldY = 2 - py/PH*wy;
        const v = (net ? forward(net, worldX, worldY).yhat : 0.5) - 0.5;
        if(last!==null && (last<0) !== (v<0)){ crossY = py; break; }
        last = v;
      }
      if(crossY!==null){
        const X = ox+px, Y = oy+crossY;
        if(prevRow===null) L.ctx.moveTo(X,Y); else L.ctx.lineTo(X,Y);
        prevRow = true;
      } else prevRow = null;
    }
    L.ctx.stroke();
  }

  function drawLossPanel(){
    // frame
    L.ctx.strokeStyle='rgba(255,255,255,.14)'; L.ctx.lineWidth=1;
    L.ctx.strokeRect(LX, LY, LW, LH);
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='600 12px '+FONT;
    L.ctx.fillText('loss (cross-entropy)', LX, LY-8);
    if(lossHist.length<2) return;
    const maxL = Math.max(...lossHist, 0.7);
    const n = lossHist.length;
    L.ctx.strokeStyle='#2dd4a0'; L.ctx.lineWidth=2; L.ctx.beginPath();
    lossHist.forEach((v,i)=>{
      const X = LX + (n<2?0:i/(n-1))*LW;
      const capped = Math.min(v, maxL);
      const Y = LY + LH - (capped/maxL)*LH;
      i? L.ctx.lineTo(X,Y) : L.ctx.moveTo(X,Y);
    });
    L.ctx.stroke();
    // current value tag
    const cur = lossHist[lossHist.length-1];
    L.ctx.fillStyle= diverged?'#ff5c7a':'#2dd4a0'; L.ctx.font='700 13px '+FONT;
    L.ctx.fillText((diverged?'DIVERGED':'loss '+cur.toFixed(4)), LX, LY+LH+20);
  }

  let FONT = 'sans-serif';
  try { FONT = getComputedStyle(document.body).fontFamily || 'sans-serif'; } catch(e){}

  function draw(){
    clearBg(L.ctx, L.W, L.H);
    drawBoundary();
    // data points
    for(const p of DATA){
      L.ctx.fillStyle = classColor(p.c);
      L.ctx.beginPath(); L.ctx.arc(sx(p.x), sy(p.y), 4, 0, 7); L.ctx.fill();
      L.ctx.strokeStyle='rgba(17,21,42,.85)'; L.ctx.lineWidth=1; L.ctx.stroke();
    }
    // plot frame + title
    L.ctx.strokeStyle='rgba(255,255,255,.14)'; L.ctx.lineWidth=1;
    L.ctx.strokeRect(ox, oy, PW, PH);
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='600 12px '+FONT;
    L.ctx.fillText('two moons + decision boundary (ŷ = 0.5)', ox, oy-8>0?oy-8:12);
    drawLossPanel();

    const acc = accuracy();
    L.readout.innerHTML =
      'epoch '+epoch+' / '+epochsTarget+
      '  ·  hidden = '+H+'  ·  η = '+lr.toFixed(3)+
      '<br>loss = <span style="color:'+(diverged?'#ff5c7a':'#2dd4a0')+'">'+
      (lossHist.length?lossHist[lossHist.length-1].toFixed(4):'—')+
      (diverged?' (diverged ✗)':'')+'</span>'+
      '  ·  train accuracy = '+(acc*100).toFixed(0)+'%';

    m.update({epoch, loss: lossHist.length?lossHist[lossHist.length-1]:1, diverged, acc, running, converged, H, lr, bestLoss});
  }

  function accuracy(){
    if(!net) return 0;
    let ok=0;
    for(const p of DATA){ const pr = forward(net, p.x, p.y).yhat; if((pr>=0.5?1:0)===p.c) ok++; }
    return ok/DATA.length;
  }

  /* ---------- training loop (requestAnimationFrame, cancellable) ---------- */
  // "Divergence" here means the too-high-η failure: the step overshoots the
  // minimum so the loss climbs instead of falling. A tanh net with a
  // batch-normalized gradient rarely reaches literal NaN, so we flag the
  // honest visible symptom too — the loss spiking far above where it started
  // (overshoot / instability) — as well as the hard blow-up (NaN / huge).
  let firstLoss = null;
  const STEPS_PER_FRAME = 3;   // a few epochs per frame keeps it lively but light
  function loop(){
    if(!running){ raf = 0; return; }
    for(let s=0; s<STEPS_PER_FRAME && epoch<epochsTarget && !diverged; s++){
      const loss = trainStep(net);
      epoch++;
      lossHist.push(loss);
      if(firstLoss===null) firstLoss = loss;
      const blewUp = !isFinite(loss) || loss > 50;                 // hard divergence
      const overshoot = epoch >= 2 && loss > Math.max(1.8, firstLoss*2); // η too high: loss climbing well above start
      if(blewUp || overshoot){ diverged = true; running = false; }
      if(loss < bestLoss) bestLoss = loss;
      if(loss < 0.25) converged = true;
    }
    draw();
    if(running && epoch<epochsTarget && !diverged){ raf = requestAnimationFrame(loop); }
    else { running = false; raf = 0; draw(); }
  }
  function startTraining(){
    if(running) return;
    net = initNet(H);
    lossHist = []; epoch = 0; diverged = false; bestLoss = Infinity; converged = false; firstLoss = null;
    running = true;
    raf = requestAnimationFrame(loop);
  }
  function stopTraining(){ running = false; if(raf){ cancelAnimationFrame(raf); raf = 0; } }

  /* ---------- missions ---------- */
  const m = api.missions([
    {text:'Press <b>Train</b> and watch the loss descend as the boundary bends to the moons', xp:20,
      check:s=>s.epoch>=30 && s.loss<0.65 && !s.diverged},
    {text:'<b>Fit it well</b>: reach train accuracy ≥ 92% (enough capacity + a sane η)', xp:30,
      check:s=>s.acc>=0.92},
    {text:'Reproduce <b>divergence</b>: crank η high (try η ≥ 10) so the step overshoots and the loss spikes upward', xp:25,
      check:s=>s.diverged},
    {text:'Reproduce <b>underfitting</b>: set hidden size to 1, train, and watch accuracy stall below 92% (one bend can\'t wrap the moons)', xp:25,
      check:s=>s.H===1 && s.epoch>=epochsTarget-3 && s.acc<0.92 && !s.diverged},
  ]);

  /* ---------- controls ---------- */
  slider(L.ctrl, 'learning rate η', 0.01, 12, 0.01, 0.5, v=>v.toFixed(2), v=>{ lr=v; });
  slider(L.ctrl, 'hidden neurons', 1, 16, 1, 8, v=>''+v, v=>{ H=v; if(!running){ net=initNet(H); lossHist=[]; epoch=0; diverged=false; draw(); } });
  slider(L.ctrl, 'epochs', 50, 800, 10, 300, v=>''+v, v=>{ epochsTarget=v; });

  chips(L.ctrl, 'TRAIN', ['▶ Train', '⏹ Stop', '↺ New data'], (i, btn, r)=>{
    if(i===0){ stopTraining(); startTraining(); }
    else if(i===1){ stopTraining(); draw(); }
    else if(i===2){ stopTraining(); DATA = makeMoons(160); net = initNet(H); lossHist=[]; epoch=0; diverged=false; draw(); }
  });

  const note = document.createElement('div'); note.className='ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">'+
    '<b style="color:#00d4ff">Blue</b> / <b style="color:#ffc94d">gold</b> = the two moon classes; the shaded field is the model\'s confidence and the <b style="color:#b9a8ff">purple</b> curve is the ŷ = 0.5 <b>decision boundary</b>. '+
    'Press <b>Train</b> and watch the loss curve (right) fall. '+
    'Then break it: crank η up until the loss <b style="color:#ff5c7a">diverges</b>, or drop hidden neurons to 1 to see it <b>underfit</b>.</div>';
  L.ctrl.appendChild(note);

  net = initNet(H);
  draw();

  // VERY IMPORTANT: the engine calls this on navigation — kill the loop.
  return function cleanup(){ stopTraining(); };
};
