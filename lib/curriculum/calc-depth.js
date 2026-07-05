/* ================================================================
   WORLD 2 DEPTH — convexity → the second-order view (Taylor / Hessian /
   Newton). Slots right after gradient descent (order 13) via explicit
   `order` floats, before integrals and the 2D boss. Same registries and
   schema as the other worlds (see index.js). Convexity says WHEN downhill
   is enough; the second-order view says how curvature makes it fast.
   Derivatives are written with primes ′ ″ (never the ASCII ' which would
   break single-quoted strings).
   ================================================================ */
import { LESSONS, INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, slider, chips, plane, clearBg, fmt2, registerCleanup } from '../engine.js';

/* ================== 1 · CONVEXITY ================== */

registerLesson({
  id:'c-convex', world:'calc', order:13.3, emoji:'🥣', title:'Convexity: One Bowl, No Traps',
  sub:'When the landscape is a single bowl, "always walk downhill" is guaranteed to win.',
  learn:`<p>Gradient descent only ever looks at the <em>local</em> slope. So when can blindly walking downhill be trusted to reach the <em>global</em> bottom? Exactly when the function is <strong>convex</strong>.</p>
  <p>The clean test is the <strong>chord test</strong>: pick any two points on the graph and draw the straight segment (chord) between them. If that chord never dips <em>below</em> the curve — for every pair of points — the function is convex. A bowl passes; a wavy double-well fails (somewhere a chord cuts under a hump).</p>
  <div class="formula">f convex  ⟺  chord always ≥ curve  ⟺  f″(x) ≥ 0 everywhere</div>
  <p>For smooth functions there is an equivalent one-line test: the second derivative is never negative — the curve only ever bends <em>upward</em>. The payoff is enormous:</p>
  <p>• A convex function has <strong>no local minimum other than the global one</strong> — any flat spot that <em>is</em> a minimum is THE bottom.<br>
  • So gradient descent is guaranteed to find the global optimum — <em>provided a minimum exists</em> (eˣ is convex but never bottoms out) and the step size is small enough (≤ 1/L for an L-smooth gradient).<br>
  • Convexity survives friendly operations: nonnegative sums, pointwise max (why the SVM hinge loss is convex), affine substitution f(Ax+b), and composition h(g) when the outer function is convex &amp; monotonic the right way (this is how you verify log-loss is convex).</p>
  <p>Real neural-network losses are wildly <strong>non-convex</strong>, but the modern picture is subtler than "lots of bad valleys": in very high dimensions the landscape is dominated by <strong>saddle points</strong> and flat plateaus, not distinct poor local minima (Dauphin et&nbsp;al. 2014). That is exactly why momentum (to coast off saddles), good initialization, and learning-rate schedules matter. Convexity is the line between optimization that "just works" and optimization as an art.</p>`,
  ml:`The reliable, classical corner of ML lives here: <b>linear/ridge regression</b> (convex MSE), <b>logistic regression</b> and <b>softmax cross-entropy</b> (convex in their weights — their Hessians are positive semidefinite), and <b>SVMs</b> (convex hinge loss) all have a single global optimum you can reach every time. Deep nets give that up — but they are trained with the same downhill machinery, trusting that in very high dimensions the local minima reached in practice sit close to the global value. The formal definition, f(λx+(1−λ)y) ≤ λf(x)+(1−λ)f(y), is also the finite form of <b>Jensen's inequality</b> E[f(X)] ≥ f(E[X]) — which you'll meet weekly (KL ≥ 0, the VAE's ELBO, EM).`,
  deeper:[
   {title:'😵 Stuck? "No rope cuts under the hills"', body:'Picture the graph as a mountain skyline and the chord as a taut rope between two points on it. Convex = the rope is always on or above the ground. The moment the ground rises above the rope between its endpoints, you have found non-convexity — and that dip is a trap gradient descent could fall into.'},
   {title:'🚀 Go deeper: strict, strong & convergence speed', body:'<b>Strictly</b> convex (f″ > 0, no flat stretches) guarantees a <em>unique</em> minimizer. <b>Strongly</b> convex (f″ ≥ m > 0) additionally bounds how flat it can get, which is what lets you prove gradient descent converges at a guaranteed rate. These distinctions are the backbone of the convex-optimization guarantees behind classical ML solvers.'},
   {title:'🚀 Go deeper: convexity in high dimensions', body:'In many dimensions, "f″ ≥ 0" becomes "the Hessian is positive semidefinite" — every eigenvalue ≥ 0 (World 1 returns!). For deep nets the Hessian has mixed-sign eigenvalues almost everywhere, so the landscape is dominated by <b>saddle points</b>, not the bowl-shaped minima of the convex world. The next lesson opens up exactly this second-derivative / Hessian view.'},
   {title:'🚀 Go deeper: the first-order condition (tangent-plane lower bound)', body:'There is a slope-only test that needs no second derivative. A differentiable f is convex exactly when it always sits <em>on or above its own tangent</em>:<div class="formula">f(y) ≥ f(x) + ∇f(x)ᵀ(y − x)   for all x, y</div>Every tangent plane under-estimates the graph, so the linear model gradient descent trusts is never an over-estimate of the true loss — the picture behind convergence proofs. It also delivers the optimality certificate: where ∇f(x)=0 the bound reads f(y) ≥ f(x) for every y, so that point is the global minimum. (Boyd &amp; Vandenberghe, <em>Convex Optimization</em>, §3.1.3.)'},
   {title:'🚀 Go deeper: the composition rule builds ML losses', body:'Convexity survives composition when the pieces line up: if g is convex and h is convex AND nondecreasing, then h(g(x)) is convex. This is the machine that certifies real losses. The per-example logistic loss log(1 + e^{−z}) is (convex, nondecreasing) softplus applied to an affine score — convex. Softmax cross-entropy is the log-sum-exp function (a convex, nondecreasing combiner) on affine logits — convex in the weights. Flip a condition (h nonincreasing, or g concave) and the guarantee is gone, which is precisely what nonlinear hidden layers do.'},
   {title:'🚀 Go deeper: Jensen — convexity as an expectation', body:'The definition f(λx+(1−λ)y) ≤ λf(x)+(1−λ)f(y) is a 2-point average. Push it to a whole distribution and you get <b>Jensen\'s inequality</b>: for convex f, f(E[X]) ≤ E[f(X)] (the sign flips for concave f). This one line is why KL divergence ≥ 0, why the VAE\'s ELBO is a valid lower bound on the log-evidence, and why the EM algorithm never decreases the likelihood. Convexity you drew as a chord in 1D becomes an inequality you invoke weekly over random variables.'}],
  labs:[
   {key:'chord', title:'The chord test', interactive:'convchord',
    intro:'<p>Drag the two points along the curve to lay a <b>chord</b> between them. If the chord ever passes <b>below</b> the curve, the function is <b>not convex</b> there. A bowl can never be caught out; a double-well can.</p>'},
   {key:'traps', title:'Why convexity matters', interactive:'convtraps',
    intro:'<p>Now run gradient descent from a start you choose. On the <b>convex bowl</b> every start flows to the same bottom. On the <b>non-convex</b> landscape, where you start decides which valley you are trapped in — and one is worse than the other.</p>'},
  ],
  quiz:[
   {q:'A function is convex when, for every pair of points on its graph, the chord between them…', opts:['Never goes below the curve','Is always horizontal','Always goes below the curve','Touches the curve only once'], a:0, tag:'chord test', focus:'Convex = chord stays on or above the curve for every pair of points.',
    why:'That IS the definition of convex: the line segment between any two points on the graph lies on or above the graph.', wrong:{1:'A horizontal chord only happens for equal endpoints — convexity is about the chord staying ABOVE the curve, at any tilt.',2:'Chord below the curve is the NON-convex case — that is a concave hill, the opposite.',3:'A chord can touch the curve along a flat stretch many times; what matters is it never dips below.'}},
   {q:'For a smooth function, convexity is equivalent to…', opts:['f″(x) ≥ 0 everywhere','f″(x) ≤ 0 everywhere','f″(x) = 0 everywhere','f′(x) ≥ 0 everywhere'], a:0, tag:'second-derivative test', focus:'Convex ⟺ the curve only bends upward ⟺ f″ is never negative.',
    why:'A non-negative second derivative means the slope never decreases, so the curve only bends upward — exactly convexity.', wrong:{1:'f″ ≤ 0 is CONCAVE (bends down) — a dome, not a bowl.',2:'f″ = 0 everywhere is just a straight line (a boundary case), not the general convex condition.',3:'f′(x) ≥ 0 means increasing, which has nothing to do with curvature — a decreasing bowl is still convex.'}},
   {q:'Why does convexity matter so much for gradient descent?', opts:['Every local minimum is also the global minimum, so no start gets trapped','It makes the gradient larger','It removes the need for a learning rate','It guarantees the loss is zero'], a:0, tag:'global guarantee', focus:'On a convex loss the only local minima ARE the global one — but GD still needs a minimizer to exist and a small enough step.',
    why:'Convex functions have no spurious local minima, so any flat spot that is a minimum is THE global one. GD is guaranteed to reach it — provided a minimizer exists (eˣ is convex yet never bottoms out) and the step is small enough.', wrong:{1:'A bigger gradient is not the point — convexity is about the SHAPE ruling out spurious traps, not the slope size.',2:'You still need a learning rate; a too-large step diverges even on a convex bowl. Convexity fixes WHERE you converge, not whether the step size is safe.',3:'The minimum of a convex loss can be any value, not necessarily zero.'}},
   {q:'Which loss is NOT generally convex in its parameters?', opts:['A deep neural network’s loss','Linear-regression squared error','Logistic-regression cross-entropy','A linear SVM’s hinge loss'], a:0, tag:'convex vs non-convex models', focus:'Classical linear models are convex; stacking nonlinear layers destroys convexity.',
    why:'Linear/logistic regression and SVMs are convex in their weights. Composing many nonlinear layers makes a deep net loss non-convex — many valleys and saddles.', wrong:{1:'Squared error IS convex (a paraboloid) — the reliable classical case.',2:'Logistic cross-entropy is convex in the weights — that is why logistic regression has a unique solution.',3:'The hinge loss is a max of linear pieces, which is convex — SVMs are a convex problem.'}},
   {q:'The sum of two convex functions is…', opts:['Always convex','Sometimes concave','Never convex','Convex only if they are equal'], a:0, tag:'convexity rules', focus:'Convexity survives addition (and non-negative scaling and max) — used to build losses with regularizers.',
    why:'Adding convex functions keeps convexity, which is why "loss + λ·penalty" (e.g. ridge) stays convex and solvable.', wrong:{1:'Convexity is preserved under addition — always.',2:'It can never flip to concave: each piece curves up, so the sum curves up.',3:'Equality is not required; any two convex functions sum to a convex one.'}},
  ],
});

/* convex lab 1 — the chord test */
INTERACTIVES.convchord = function(stage, api){
  const L=makeLab(stage);
  const fns=[
    {n:'bowl  x²/3', f:x=>x*x/3, conv:true},
    {n:'double-well', f:x=>(x*x-3)*(x*x-3)/7, conv:false},
    {n:'vee  |x|', f:x=>Math.abs(x), conv:true},
    {n:'hill  −x²/3+2', f:x=>-x*x/3+2, conv:false},
  ];
  let fi=1, A=-2.2, B=2.2, drag=null;
  const M=api.missions([
    {text:'On the <b>double-well</b>, place the chord so it dips <b>below</b> the curve (proof: not convex)', xp:20, check:s=>s.fi===1&&s.below},
    {text:'On the <b>bowl</b>, spread the points wide (|A−B| &gt; 4) — the chord stays <b>above</b>, always', xp:20, check:s=>s.fi===0&&Math.abs(s.A-s.B)>4&&!s.below},
    {text:'Find the <b>concave hill</b> — its chord lies <b>below</b> the whole curve', xp:15, check:s=>s.fi===3&&s.below},
  ]);
  const P=plane(L.ctx,L.W,L.H,46,L.W/2,L.H/2+40);
  function below(){ const f=fns[fi].f, lo=Math.min(A,B), hi=Math.max(A,B), fa=f(A), fb=f(B);
    let worst=1e9;
    for(let i=0;i<=40;i++){ const t=lo+(hi-lo)*i/40, w=(t-A)/(B-A), chord=fa+(fb-fa)*w; worst=Math.min(worst, chord-f(t)); }
    return worst < -0.06;
  }
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    P.fn(fns[fi].f,'#7c5cff',3);
    const f=fns[fi].f, bel=below();
    L.ctx.strokeStyle=bel?'#ff5c7a':'#2dd4a0'; L.ctx.lineWidth=2.5;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(A),P.sy(f(A))); L.ctx.lineTo(P.sx(B),P.sy(f(B))); L.ctx.stroke();
    P.dot(A,f(A),7,'#b9a8ff'); P.dot(B,f(B),7,'#00d4ff');
    L.readout.innerHTML=fns[fi].n+'<br>chord '+(bel?'<b style="color:#ff9db1">dips BELOW</b> → not convex here':'<b style="color:#7df5c8">stays above</b> → convex here');
    M.update({fi, A, B, below:bel});
  }
  L.canvas.addEventListener('pointerdown',e=>{ const c=L.toCanvas(e), wx=P.wx(c.x);
    drag = Math.abs(wx-A) < Math.abs(wx-B) ? 'A' : 'B'; L.canvas.setPointerCapture(e.pointerId); mv(e); });
  L.canvas.addEventListener('pointermove',mv);
  L.canvas.addEventListener('pointerup',()=>drag=null);
  function mv(e){ if(!drag)return; const c=L.toCanvas(e), x=Math.max(-3.4,Math.min(3.4,P.wx(c.x)));
    if(drag==='A') A=x; else B=x; draw(); }
  chips(L.ctrl,'FUNCTION',fns.map(f=>f.n),(i,btn,row)=>{ fi=i; A=-2.2; B=2.2;
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); }).children[1].classList.add('on');
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Drag the two points. The chord turns <b style="color:#7df5c8">green</b> when it stays above the curve (convex here) and <b style="color:#ff9db1">red</b> the instant it cuts below. Convex means you can never make it red — try.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* convex lab 2 — gradient descent on convex vs non-convex */
INTERACTIVES.convtraps = function(stage, api){
  const L=makeLab(stage);
  const lands=[
    {n:'convex bowl', f:x=>x*x/4, df:x=>x/2, conv:true},
    // tilted double-well: deep global min on the left, shallow local on the right
    {n:'non-convex (two wells)', f:x=>(x*x-3)*(x*x-3)/8 + 0.45*x, df:x=>0.5*x*(x*x-3)+0.45, conv:false},
  ];
  let li=1, start=1.8;
  const M=api.missions([
    {text:'On the <b>non-convex</b> land, start on the <b>right</b> and get trapped in the <b>shallow</b> (local) min', xp:20, check:s=>!s.conv&&s.finalX>0.6},
    {text:'Now start on the <b>left</b> and reach the <b>deep</b> (global) min', xp:20, check:s=>!s.conv&&s.finalX<-0.6},
    {text:'Switch to the <b>convex bowl</b> — from any start, GD reaches the <b>same</b> bottom', xp:15, check:s=>s.conv&&Math.abs(s.finalX)<0.4},
  ]);
  const P=plane(L.ctx,L.W,L.H,44,L.W/2,L.H-70);
  function run(){ // deterministic GD trajectory from `start`
    const land=lands[li], lr=0.12, path=[start]; let x=start;
    for(let i=0;i<240;i++){ x = x - lr*land.df(x); x=Math.max(-4,Math.min(4,x)); path.push(x); if(Math.abs(land.df(x))<0.004) break; }
    return path;
  }
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const land=lands[li];
    P.fn(land.f,'#7c5cff',3);
    const path=run(), finalX=path[path.length-1];
    for(let i=0;i<path.length;i+=3){ const x=path[i]; P.dot(x,land.f(x),3,'rgba(0,212,255,.5)'); }
    P.dot(start,land.f(start),7,'#ffc94d');          // start
    P.dot(finalX,land.f(finalX),8,'#2dd4a0');        // resting point
    const deep = !land.conv && finalX<0;
    L.readout.innerHTML=land.n+'<br>start x = '+start.toFixed(2)+'  →  rests at x = '+finalX.toFixed(2)+
      (land.conv?'<br><b style="color:#7df5c8">the one global min</b>':(deep?'<br><b style="color:#7df5c8">deep / global min ✓</b>':'<br><b style="color:#ff9db1">shallow / local min ✗</b>'));
    M.update({conv:land.conv, finalX});
  }
  slider(L.ctrl,'start x',-3.5,3.5,0.05,1.8,v=>v.toFixed(2),v=>{start=v;draw();});
  chips(L.ctrl,'LANDSCAPE',lands.map(l=>l.n),(i,btn,row)=>{ li=i;
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); }).children[1].classList.add('on');
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b style="color:#ffc94d">Gold</b> = where you drop the ball. Cyan trail = the gradient-descent path. <b style="color:#7df5c8">Green</b> = where it settles. On the bowl the green dot never moves; on the double-well, your start decides your fate.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== 2 · THE SECOND-ORDER VIEW ================== */

registerLesson({
  id:'c-secondorder', world:'calc', order:13.6, emoji:'🏎️', title:'Curvature & Newton’s Method',
  sub:'The second derivative is curvature. Use it and you can leap to the bottom in one bound.',
  learn:`<p>The first derivative is slope — a <strong>linear</strong> snapshot. The second derivative is <strong>curvature</strong>: how fast that slope is itself changing. Together they give the <strong>Taylor expansion</strong>, the best polynomial picture of a function near a point a:</p>
  <div class="formula">f(x) ≈ f(a) + f′(a)(x−a) + ½ f″(a)(x−a)²</div>
  <p>Stop after two terms and you have the <strong>tangent line</strong> — the local linear model gradient descent quietly trusts. Add the f″ term and you get the best-fit <strong>parabola</strong>, which hugs the curve far longer because it bends the right way.</p>
  <p><strong>Newton’s method</strong> exploits that parabola directly. Instead of inching downhill by a fixed learning rate, it jumps to the <em>bottom of the local parabola</em>:</p>
  <div class="formula">x ← x − f′(x) / f″(x)</div>
  <p>On a true quadratic (like squared-error loss) the parabola IS the function, so Newton lands on the exact minimum in <strong>one step</strong>. <em>Close</em> to a minimum it then converges <em>quadratically</em> — the error roughly squares each step. But two big catches: it needs f″, and the step only points downhill when <strong>f″ &gt; 0</strong>. Where curvature is negative the fitted parabola opens <em>downward</em>, so its "bottom" is really a peak and raw Newton steps the wrong way — in non-convex problems it is actually <em>attracted to saddle points</em> (the fix: damping/line-search, or "saddle-free" Newton using |f″|). In many dimensions f″ becomes the <strong>Hessian</strong> of all second partials, whose eigenvalues (World 1!) classify the point: all positive → bowl (min), all negative → dome (max), mixed → <strong>saddle</strong>.</p>`,
  ml:`Full Newton is too costly for deep nets — the Hessian of a billion-parameter model has 10¹⁸ entries — but its spirit lives on in approximations. <b>L-BFGS</b> builds a cheap low-rank Hessian; <b>K-FAC</b> and <b>natural gradient</b> precondition with the Fisher matrix. <b>Adam</b> is often <em>described</em> as curvature-aware, but really it rescales each parameter by its recent <em>gradient magnitudes</em> (an EMA of squared gradients ≈ the diagonal empirical Fisher) — related to, but not the same as, true Hessian curvature. Curvature still explains GD's pain: when the Hessian is <b>ill-conditioned</b> (one eigenvalue ≫ another) gradient descent zig-zags down a narrow ravine — exactly what momentum and warmup fight.`,
  deeper:[
   {title:'😵 Stuck? Taylor = zoom into a parabola', body:'Pick a point and zoom in. At first zoom the curve looks straight — that is the tangent line, the order-1 Taylor model. Zoom less and it looks like a gentle parabola — the order-2 model, the "kissing parabola" that shares the curve slope AND curvature at that point. Each extra Taylor term matches one more derivative, so the approximation hugs the curve over a wider window.'},
   {title:'🚀 Go deeper: the Hessian & critical points', body:'In n dimensions the second derivative is the n×n <b>Hessian</b> H. The quadratic Taylor term becomes ½(x−a)ᵀH(x−a), and H’s eigenvalues are the curvatures along its eigenvector axes. All positive = local min, all negative = local max, mixed = saddle (down some ways, up others). This is the rigorous version of the second-derivative test, powered by eigenvalues from World 1.'},
   {title:'🚀 Go deeper: why deep learning skips Newton', body:'Forming and inverting an N×N Hessian costs ~N³ — hopeless at N = billions. So deep learning keeps first-order steps (cheap gradients) and <em>approximates</em> curvature: Adam per-parameter scaling, L-BFGS history-based Hessian, Gauss-Newton/Fisher methods. Knowing what Newton would do tells you what these approximations are reaching for — and why a well-tuned Adam often feels "curvature-aware". A caveat worth keeping: Adam divides each coordinate by an EMA of squared gradients (a diagonal RMS / empirical-Fisher scale), which is <em>related</em> to curvature but is NOT the true Hessian — it captures neither off-diagonal coupling nor the <em>sign</em> of curvature.'},
   {title:'🚀 Go deeper: saddle-free Newton', body:'Raw Newton\'s fatal flaw in high dimensions: it solves H·step = −∇f, so along a direction with <em>negative</em> curvature (eigenvalue < 0) it moves <em>uphill toward</em> the saddle instead of away. Since deep-net critical points are overwhelmingly saddles, this is a real trap. The saddle-free fix replaces H with |H| — flip the sign of every negative eigenvalue so the step is always downhill along each axis while still rescaling by curvature magnitude (Dauphin et&nbsp;al. 2014, "Identifying and attacking the saddle point problem").'},
   {title:'🚀 Go deeper: the condition number κ & GD zig-zag', body:'For a quadratic bowl the Hessian\'s eigenvalues are the curvatures along its axes; their ratio is the <b>condition number</b> κ = λ_max / λ_min. A round bowl (κ=1) lets GD walk straight down. An <b>ill-conditioned</b> bowl (κ ≫ 1) is a long narrow ravine: one safe learning rate must respect the steep λ_max direction, so progress along the shallow λ_min direction crawls — GD needs on the order of κ iterations, and if the step is pushed near its stability limit the path <b>zig-zags</b> across the valley. This is exactly the pain momentum, warmup, and Adam are built to fight — and what Newton erases by rescaling every axis to κ=1.'}],
  labs:[
   {key:'taylor', title:'Line vs parabola', interactive:'taylor',
    intro:'<p>Move the expansion point along the curve. The <b style="color:#7fe7ff">tangent line</b> matches the slope; the <b style="color:#ffc94d">parabola</b> matches slope <em>and</em> curvature. Watch how much longer the parabola hugs the curve — and read f″(a), the curvature, as you go.</p>'},
   {key:'newton', title:'Newton vs gradient descent', interactive:'newton',
    intro:'<p>Race the two optimizers from the same start. <b style="color:#7fe7ff">Gradient descent</b> inches downhill by a fixed step; <b style="color:#ffc94d">Newton</b> jumps to the bottom of the local parabola. On a quadratic, Newton needs a single step — count them.</p>'},
   {key:'illcond', title:'The ill-conditioned ravine', interactive:'illcond',
    intro:'<p>Same bowl, two axes: f = ½(x² + κy²). Slide the <b>condition number κ</b> up and watch gradient descent need far more steps to reach the bottom — and, near its stability limit, <b>zig-zag</b> across a narrow ravine. This is the curse of ill-conditioning that momentum and Adam are built to fight.</p>'},
  ],
  quiz:[
   {q:'In the Taylor expansion, what does the ½f″(a)(x−a)² term add over the tangent line?', opts:['Curvature — it bends the approximation to match the curve','A vertical shift only','The slope','Nothing useful'], a:0, tag:'taylor terms', focus:'Order-1 = slope (line); the order-2 term injects curvature (the parabola).',
    why:'The tangent line captures slope; the squared term scaled by f″(a) adds curvature, turning the line into the parabola that hugs the curve.', wrong:{1:'A vertical shift is the f(a) constant term — the f″ term specifically adds CURVATURE (bending).',2:'The slope is the f′(a)(x−a) term (order 1); f″ is the next order up.',3:'It is the term that makes the approximation actually hug a curving function — far from useless.'}},
   {q:'Newton’s update is x ← x − f′(x)/f″(x). On a perfect quadratic it reaches the minimum in…', opts:['One step','As many steps as gradient descent','Never','Two steps regardless'], a:0, tag:'newton on quadratics', focus:'A quadratic equals its own order-2 Taylor model, so Newton jumps straight to the vertex.',
    why:'For a quadratic the parabola Newton fits IS the function, so it lands exactly on the vertex (the minimum) in a single step.', wrong:{1:'GD takes many fixed-size steps; Newton use of curvature lets it finish a quadratic in one.',2:'"Never" is the opposite — Newton is exact on quadratics.',3:'It is one step, not two: the fitted parabola equals the function so its vertex is the true min.'}},
   {q:'In many dimensions, the matrix of all second partial derivatives is called the…', opts:['Hessian','Jacobian','Gradient','Determinant'], a:0, tag:'the Hessian', focus:'Hessian = second-order (curvature) matrix; Jacobian = first-order (slopes) matrix.',
    why:'The Hessian collects every second partial derivative — the multivariable curvature. (The Jacobian holds first derivatives.)', wrong:{1:'The Jacobian is the FIRST-derivative matrix (slopes); curvature lives in the Hessian.',2:'The gradient is the first-derivative VECTOR, not the second-derivative matrix.',3:'The determinant is a single number summarizing a matrix, not the matrix of second partials.'}},
   {q:'A critical point where the Hessian has both positive AND negative eigenvalues is a…', opts:['Saddle point','Local minimum','Local maximum','Global minimum'], a:0, tag:'classifying critical points', focus:'All + → min, all − → max, mixed signs → saddle (down some directions, up others).',
    why:'Mixed-sign curvature means the surface goes down along some directions and up along others — the definition of a saddle.', wrong:{1:'All-positive eigenvalues would be a local MIN (a bowl); mixed signs make a saddle.',2:'All-negative would be a local MAX (a dome); the question specifies mixed signs.',3:'A global min is a special min — but mixed-sign curvature is not a min at all.'}},
   {q:'Why don’t we use full Newton’s method to train large neural networks?', opts:['The Hessian is far too big to form and invert','Newton cannot handle minima','It ignores the gradient','It only works in one dimension'], a:0, tag:'why not Newton', focus:'Hessian is N×N for N parameters; forming/inverting it costs ~N³ — infeasible at billions of params.',
    why:'For N parameters the Hessian has N² entries and inverting it costs ~N³ — impossible at billions of parameters, so we approximate curvature (Adam, L-BFGS) instead.', wrong:{1:'Exactly — the N×N Hessian and its ~N³ inverse are infeasible for billion-parameter models.',2:'Newton handles minima fine; cost, not capability, is the problem.',3:'Newton uses the gradient f′ in its numerator — it does not ignore it.'}},
  ],
});

/* second-order lab 1 — Taylor: tangent line vs best-fit parabola */
INTERACTIVES.taylor = function(stage, api){
  const L=makeLab(stage);
  const f=x=>0.15*x*x + Math.sin(1.5*x);
  const df=x=>0.3*x + 1.5*Math.cos(1.5*x);
  const ddf=x=>0.3 - 2.25*Math.sin(1.5*x);
  let a=-1.0;
  const M=api.missions([
    {text:'Find a strongly <b>curved</b> spot: push |f″(a)| above <b>1.5</b> and watch the line fail while the parabola hugs', xp:20, check:s=>Math.abs(s.fpp)>1.5},
    {text:'Find an <b>inflection</b> point: f″(a) ≈ 0 (the parabola flattens into the line)', xp:20, check:s=>Math.abs(s.fpp)<0.12},
    {text:'Land on <b>negative</b> curvature: make f″(a) &lt; −0.5 (curve bending downward)', xp:15, check:s=>s.fpp<-0.5},
  ]);
  const P=plane(L.ctx,L.W,L.H,44,L.W/2,L.H/2+10);
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    P.fn(f,'#7c5cff',3);
    const fa=f(a), fpa=df(a), fppa=ddf(a);
    P.fn(x=>fa+fpa*(x-a),'rgba(0,212,255,.9)',2);                          // tangent line
    P.fn(x=>fa+fpa*(x-a)+0.5*fppa*(x-a)*(x-a),'rgba(255,201,77,.95)',2.5); // parabola
    P.dot(a,fa,7,'#ffffff');
    L.readout.innerHTML='expansion point a = '+a.toFixed(2)+'<br>slope f′(a) = '+fpa.toFixed(2)+
      '<br>curvature f″(a) = <b>'+fppa.toFixed(2)+'</b> '+(Math.abs(fppa)<0.12?'(≈ inflection)':fppa>0?'(bends up)':'(bends down)');
    M.update({a, fpp:fppa});
  }
  slider(L.ctrl,'expansion point a',-3.4,3.4,0.05,-1.0,v=>v.toFixed(2),v=>{a=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b style="color:#7fe7ff">Cyan line</b> = order-1 Taylor (slope only). <b style="color:#ffc94d">Gold parabola</b> = order-2 (slope + curvature). Both touch at <b>a</b>, but the parabola stays close much longer — that extra term is f″(a).</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* second-order lab 2 — Newton's method vs gradient descent */
INTERACTIVES.newton = function(stage, api){
  const L=makeLab(stage);
  const fns=[
    {n:'quadratic', f:x=>0.5*(x-2)*(x-2), df:x=>(x-2), ddf:x=>1, min:2},
    {n:'quartic (double-well)', f:x=>0.25*x*x*x*x - x*x + 1, df:x=>x*x*x - 2*x, ddf:x=>3*x*x - 2, min:Math.sqrt(2)},
  ];
  let fi=0, start=-2.6, lrGD=0.1;
  const M=api.missions([
    {text:'On the <b>quadratic</b>, watch Newton reach the minimum in <b>one step</b>', xp:20, check:s=>s.fi===0&&s.nSteps===1},
    {text:'On the <b>quartic</b>, Newton still finishes in <b>fewer steps</b> than gradient descent', xp:20, check:s=>s.fi===1&&s.nSteps<s.gSteps},
    {text:'Crank GD’s learning rate until it <b>fails to converge</b> (diverges/oscillates)', xp:15, check:s=>s.gSteps>=49},
  ]);
  function trajGD(land){ let x=start; const path=[x];
    for(let i=0;i<60;i++){ x = x - lrGD*land.df(x); if(!isFinite(x)||Math.abs(x)>8){path.push(Math.sign(x)*8);break;} path.push(x); if(Math.abs(land.df(x))<0.01) break; }
    return path;
  }
  function trajNewton(land){ let x=start; const path=[x];
    for(let i=0;i<60;i++){ const d2=land.ddf(x); if(Math.abs(d2)<1e-6)break; x = x - land.df(x)/d2; if(!isFinite(x)||Math.abs(x)>8){path.push(Math.sign(x)*8);break;} path.push(x); if(Math.abs(land.df(x))<0.01) break; }
    return path;
  }
  const P=plane(L.ctx,L.W,L.H,40,L.W/2,L.H-66);
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const land=fns[fi];
    P.fn(land.f,'#7c5cff',3);
    const g=trajGD(land), nw=trajNewton(land);
    g.forEach(x=>P.dot(x,land.f(x),3,'rgba(0,212,255,.55)'));
    nw.forEach(x=>P.dot(x,land.f(x),4.5,'rgba(255,201,77,.9)'));
    P.dot(start,land.f(start),7,'#ffffff');
    const gSteps=g.length-1, nSteps=nw.length-1;
    const gConv=Math.abs(land.df(g[g.length-1]))<0.02;
    L.readout.innerHTML='start x = '+start.toFixed(2)+
      '<br><b style="color:#7fe7ff">GD</b> (lr '+lrGD.toFixed(2)+'): '+(gConv?gSteps+' steps':'<b style="color:#ff9db1">did not converge</b>')+
      '<br><b style="color:#ffc94d">Newton</b>: '+nSteps+' step'+(nSteps===1?'':'s');
    M.update({fi, nSteps, gSteps, gConv});
  }
  chips(L.ctrl,'FUNCTION',fns.map(fn=>fn.n),(i,btn,row)=>{ fi=i; start=i===0?-2.6:-2.4;
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); sStart.set(start); draw(); }).children[0].classList.add('on');
  const sStart=slider(L.ctrl,'start x',-3.2,3.2,0.05,-2.6,v=>v.toFixed(2),v=>{start=v;draw();});
  slider(L.ctrl,'GD learning rate',0.02,1.1,0.01,0.1,v=>v.toFixed(2),v=>{lrGD=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b style="color:#7fe7ff">Cyan</b> = gradient descent (fixed steps). <b style="color:#ffc94d">Gold</b> = Newton (curvature-aware jumps). On the quadratic Newton needs one step; push the GD learning rate too high and it overshoots into oscillation.</div>';
  L.ctrl.appendChild(note);
  draw();
};


/* second-order lab 3 — the ill-conditioned ravine: more steps (and zig-zag) as κ grows */
INTERACTIVES.illcond = function(stage, api){
  const L=makeLab(stage,{h:440});
  // f = ½(x² + κy²): the Hessian is diag(1, κ), so its eigenvalues are 1 and κ
  // and κ IS the condition number. GD update: x ← x − lr·x, y ← y − lr·κy.
  let kappa=8, frac=0.45, ball=null, timer=null;
  // Learning rate is tied to the STEEP axis: lr = frac·(2/κ). The steep-axis
  // multiplier is then (1 − 2·frac), so frac<0.5 descends monotonically and
  // frac>0.5 overshoots into a zig-zag — while the shallow axis (curvature 1)
  // only moves by lr·x = frac·(2/κ)·x, so it crawls ever slower as κ grows.
  const lrOf=()=>frac*2/kappa;
  const M=api.missions([
    {text:'Round bowl (κ = 1): drop a ball — it reaches the bottom in a <b>handful of steps</b>', xp:15, check:s=>s.kappa<=1.5&&s.atMin&&s.steps<=6},
    {text:'Crank κ above <b>20</b> and drop a ball — the same descent now costs <b>40+ steps</b>', xp:20, check:s=>s.kappa>=20&&s.atMin&&s.steps>=40},
    {text:'Push the step past <b>0.5</b> at high κ — the path starts to <b>zig-zag</b> across the ravine', xp:20, check:s=>s.kappa>=20&&s.zig>0.5},
  ]);
  const P=plane(L.ctx,L.W,L.H,90,L.W/2,L.H/2);
  function drawContours(){
    L.ctx.strokeStyle='rgba(255,255,255,.16)'; L.ctx.lineWidth=1;
    for(const lv of [0.15,0.5,1.1,2,3.2]){
      const a=Math.sqrt(2*lv), b=Math.sqrt(2*lv/kappa);
      L.ctx.beginPath(); L.ctx.ellipse(P.sx(0),P.sy(0),a*90,b*90,0,0,7); L.ctx.stroke();
    }
  }
  function run(){ // full GD trajectory from a fixed off-axis start
    const lr=lrOf(); let x=1.8, y=2.4; const p=[[x,y]];
    for(let i=0;i<600;i++){ x=x-lr*x; y=y-lr*kappa*y; p.push([x,y]);
      if(Math.hypot(x,y)<0.02) break; if(!isFinite(x)||Math.hypot(x,y)>40){break;} }
    return p;
  }
  // zig-zag metric: fraction of steps whose steep-axis (y) move flips sign
  function zigOf(p){ let flips=0, n=0; for(let i=2;i<p.length;i++){ const a=p[i-1][1]-p[i-2][1], b=p[i][1]-p[i-1][1];
    if(Math.abs(a)>1e-5&&Math.abs(b)>1e-5){ n++; if(a*b<0) flips++; } } return n?flips/n:0; }
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid(); drawContours();
    const p=run(), zig=zigOf(p), total=p.length-1;
    const upto=ball?Math.min(ball.i,p.length-1):0;
    L.ctx.strokeStyle='rgba(0,212,255,.75)'; L.ctx.lineWidth=2; L.ctx.beginPath();
    for(let i=0;i<=upto;i++){ const q=p[i], px=P.sx(q[0]), py=P.sy(q[1]); i?L.ctx.lineTo(px,py):L.ctx.moveTo(px,py); }
    L.ctx.stroke();
    for(let i=0;i<=upto;i++) P.dot(p[i][0],p[i][1],3,'rgba(0,212,255,.6)');
    if(ball){ const cur=p[upto]; P.dot(cur[0],cur[1],8,'#00d4ff'); }
    P.dot(0,0,6,'#ffc94d'); // the minimum
    const cur=ball?p[upto]:p[0];
    const dist=Math.hypot(cur[0],cur[1]), atMin=ball!==null&&dist<0.1, steps=ball?ball.i:0;
    L.readout.innerHTML='f = ½(x² + κ·y²), κ = <b>'+kappa.toFixed(0)+'</b>  (Hessian eigenvalues 1 and κ)'+
      '<br>learning rate = '+lrOf().toFixed(3)+' = '+frac.toFixed(2)+'·(2/κ)'+
      '<br>steps to converge: <b>'+total+'</b>'+
      (ball?'  ·  ball at step '+steps+', dist '+dist.toFixed(3)+(atMin?'  🏆':''):'  ·  drop a ball to watch GD')+
      '<br>zig-zag = <b style="color:'+(zig>0.5?'#ff9db1':'#7df5c8')+'">'+(zig*100).toFixed(0)+'%</b>';
    M.update({kappa, zig, steps, atMin});
  }
  function stopAuto(){ if(timer){clearInterval(timer);timer=null;} }
  function drop(){ stopAuto(); ball={i:0}; draw();
    timer=setInterval(()=>{ if(!ball){stopAuto();return;} const p=run(); ball.i++;
      const cur=p[Math.min(ball.i,p.length-1)];
      if(ball.i>=p.length-1||Math.hypot(cur[0],cur[1])<0.1){ draw(); stopAuto(); return; }
      draw(); },70); }
  slider(L.ctrl,'condition number κ',1,40,1,8,v=>v.toFixed(0),v=>{kappa=v; ball=null; stopAuto(); draw();});
  slider(L.ctrl,'step (fraction of 2/κ)',0.1,0.99,0.01,0.45,v=>v.toFixed(2),v=>{frac=v; ball=null; stopAuto(); draw();});
  const d=document.createElement('div'); d.className='ctrl'; const row=document.createElement('div'); row.className='chipbtns';
  const dropBtn=document.createElement('button'); dropBtn.className='chip'; dropBtn.textContent='▶ Drop ball & descend'; dropBtn.onclick=drop;
  row.appendChild(dropBtn); d.appendChild(row); L.ctrl.appendChild(d);
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The bowl f = ½(x² + κy²) has curvature 1 along x and κ along y, so κ is the <b>condition number</b>. The single learning rate is set by the steep y-axis, which starves progress along the shallow x-axis — so descent needs on the order of κ steps. Raise κ to feel the slowdown; push the step past 0.5 to make it <b style="color:#7fe7ff">zig-zag</b>. This is what momentum and Adam are built to fight.</div>';
  L.ctrl.appendChild(note);
  registerCleanup(()=>stopAuto());
  draw();
};
