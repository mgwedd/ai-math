/* ================================================================
   WORLD 2 — MULTIVARIABLE CALCULUS & CONSTRAINED OPTIMIZATION.
   Appends at the END of World 2 (orders 16 / 16.3 / 16.6, above the
   2D boss at effective order 15). Three depth lessons that carry the
   single-variable calculus of World 2 up into many dimensions — the
   exact machinery underneath backprop, SVMs and RLHF's KL constraint:
     1 · the gradient as the best linear map (total derivative / tangent plane)
     2 · the chain rule as a product of Jacobians (backprop, formalized)
     3 · Lagrange multipliers (constrained optimization, ∇f ∥ ∇g)
   Same registries and schema as the other worlds (see index.js).
   Derivatives use the Unicode primes ′ ″ (never ASCII ' — that would
   break single-quoted strings). All contour/heatmap art is drawn with
   ctx directly over `plane` world-coordinates.
   ================================================================ */
import { LESSONS, INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, slider, chips, plane, clearBg, fmt2 } from '../engine.js';

/* ================== 1 · THE GRADIENT AS BEST LINEAR MAP ================== */

registerLesson({
  id:'c-totalderiv', world:'calc', order:16, emoji:'🛬', title:'The Gradient = Best Linear Approximation',
  sub:'Zoom into any smooth surface and it flattens into a plane. The gradient IS that plane — the whole point of a derivative.',
  learn:`<p>World 2 taught the derivative of a one-input function: <em>zoom in and the curve looks straight</em>, and f′(a) is the slope of that line. Everything about derivatives generalizes from that one idea — including the jump to many inputs. Zoom into a smooth <strong>surface</strong> z = f(x, y) and it flattens into a <strong>tangent plane</strong>. The gradient is the recipe for that plane.</p>
  <p>Ask the slope question one variable at a time and you get the two <strong>partial derivatives</strong> — the slopes of the two <em>cross-sections</em> through the point (freeze y, walk in x; freeze x, walk in y):</p>
  <div class="formula">$$\\dfrac{\\partial f}{\\partial x} = \\text{slope of the } x\\text{-slice} \\qquad \\dfrac{\\partial f}{\\partial y} = \\text{slope of the } y\\text{-slice}$$</div>
  <p>Stack them into a vector — hello, World 1 — and you have the <strong>gradient</strong>, and the tangent-plane (first-order Taylor) formula it powers:</p>
  <div class="formula">$$\\nabla f = \\left[ \\dfrac{\\partial f}{\\partial x}, \\dfrac{\\partial f}{\\partial y} \\right] \\qquad f(a+\\Delta) \\approx f(a) + \\nabla f(a) \\cdot \\Delta$$</div>
  <p>That dot product is the punchline: near a point, f behaves like a <strong>linear map plus a constant</strong>, and ∇f is the matrix of that map (a 1×2 row). This is the real definition of the derivative in any dimension — the <strong>total derivative</strong> is "the best linear approximation," and the partials are just its entries. Two consequences fall straight out:</p>
  <p>• <strong>Direction.</strong> Since f(a+Δ) − f(a) ≈ ∇f · Δ, the step Δ that increases f fastest is the one aligned with ∇f — so <strong>∇f points in the steepest-uphill direction</strong> and ‖∇f‖ is that steepness. −∇f is the fastest way down. That single fact is gradient descent.<br>
  • <strong>Level sets.</strong> Move <em>along</em> a contour (constant height) and f does not change, so ∇f · Δ = 0 there: <strong>the gradient is always perpendicular to the contour lines.</strong> (Lesson 3 turns this into Lagrange multipliers.)</p>
  <p>A subtlety worth knowing: having both partials is <em>not</em> quite enough for a genuine tangent plane — the function must be <strong>differentiable</strong> (the plane must approximate f in <em>every</em> direction, not just along the axes). For the smooth losses of ML this always holds, so we lean on ∇f freely.</p>`,
  ml:`This is the ground floor of deep learning. A loss L(w) over millions of weights is a surface in a millions-D space; at the current weights it is approximated by its tangent hyperplane, whose slope vector is <b>∇L</b> — one partial derivative per weight. Every optimizer (SGD, Adam, RMSProp) is a rule for taking a step using only that <em>local linear</em> picture, then re-linearizing at the new point. The whole enterprise is: <b>repeatedly replace a hopeless nonlinear surface with the best local plane, step downhill, repeat.</b> The partials are computed for free by <b>backprop</b> (next lesson), and "the gradient is ⟂ to level sets" is exactly why gradient steps are the most efficient local move.`,
  deeper:[
   {title:'😵 Stuck? A partial is just a 1-D derivative in disguise', body:'To get ∂f/∂x, treat y as a frozen constant and differentiate the ordinary one-variable function you have left — pure World 2. ∂f/∂y freezes x instead. The two partials are the slopes of the two cross-section curves you get by slicing the surface with a vertical plane. Stacking those two slopes is all the gradient is.'},
   {title:'🚀 Go deeper: gradient ⟂ contours, and why steepest = ∇f', body:'The linear part of f near a is the dot product ∇f · Δ. By the geometry of the dot product, that is maximized when Δ points the same way as ∇f (steepest ascent) and is zero when Δ is perpendicular to ∇f — which is exactly the direction that keeps f constant, i.e. tangent to the contour. So one formula gives you both facts: the gradient points straight uphill AND straight across the contours it crosses.'},
   {title:'🚀 Go deeper: differentiable ≠ "partials exist"', body:'The classic warning example f(x,y)=xy/(x²+y²) (with f(0,0)=0) has BOTH partials equal to 0 at the origin, yet it is not even continuous there — no honest tangent plane exists. Existence of partials only probes the axis directions; true differentiability demands the linear model ∇f·Δ approximate f along every direction. Smooth ML losses are differentiable, so this pathology never bites in practice — but it is why "the derivative" formally means "best linear map," not "the partials."'}],
  labs:[
   {key:'tangplane', title:'The tangent plane hugs the surface', interactive:'mv-tangplane',
    intro:'<p>Drag the expansion point across the contour map of a surface. The two <b style="color:#7fe7ff">cross-section slopes</b> (∂f/∂x and ∂f/∂y) are read from the two slices; together they build the <b style="color:#ffc94d">tangent plane</b>, shown as its gradient arrow ⟂ to the contours. Watch the plane hug the surface locally and lie flat only where ∇f = 0.</p>'},
   {key:'gradperp', title:'Gradient is perpendicular to contours', interactive:'mv-gradperp',
    intro:'<p>Move the probe. The <b style="color:#ff5c7a">gradient arrow</b> always crosses the contour lines at a right angle — pointing straight uphill. Step <em>along</em> a contour and f barely changes; step <em>across</em> it (with the gradient) and f changes fastest. This right angle is the whole geometry of gradient descent.</p>'},
  ],
  quiz:[
   {q:'What does the partial derivative ∂f/∂x measure?', opts:['The slope of f as you step in the x-direction, holding the other variables fixed','The slope of f as you step in the y-direction','The total change of f in every direction at once','The curvature of f'], a:0, tag:'partial derivatives', focus:'A partial freezes the other variables and takes an ordinary 1-D slope along one axis.',
    why:'∂f/∂x is the ordinary single-variable slope you get by freezing every other input and letting only x vary — the slope of the x cross-section.', wrong:{1:'That describes ∂f/∂y — the y-direction slope. ∂f/∂x moves along x.',2:'No single partial captures "every direction"; that is the job of the full gradient (all partials together) via the dot product ∇f·Δ.',3:'Curvature is a second derivative (the Hessian). A partial is a first-order slope.'}},
   {q:'The gradient ∇f of a function of several variables is best described as…', opts:['The vector of all first partial derivatives, giving the best local linear approximation','A single number equal to the largest partial','The matrix of all second partial derivatives','Always zero for smooth functions'], a:0, tag:'gradient as total derivative', focus:'∇f stacks the partials; f(a+Δ) ≈ f(a) + ∇f·Δ is the best linear (tangent-plane) model.',
    why:'Stacking the partials gives ∇f, and f(a+Δ) ≈ f(a) + ∇f·Δ is the tangent-plane / total-derivative model — the derivative IS the best linear approximation.', wrong:{1:'The gradient keeps every partial as a vector, not a single largest one — direction needs all components.',2:'The matrix of second partials is the Hessian (curvature). The gradient holds first derivatives.',3:'∇f is zero only at flat spots (critical points), not generally.'}},
   {q:'Why does the gradient point in the direction of steepest ascent?', opts:['Because f(a+Δ)−f(a) ≈ ∇f·Δ is largest when Δ aligns with ∇f','Because the gradient is always vertical','Because partial derivatives are always positive','Because it is defined to point downhill'], a:0, tag:'steepest direction', focus:'The linear change ∇f·Δ is a dot product — maximized when the step Δ lines up with ∇f.',
    why:'Near a point the change in f is the dot product ∇f·Δ, and a dot product is largest when the two vectors are parallel — so the steepest-uphill step Δ is aligned with ∇f.', wrong:{1:'The gradient lives in the input plane (the (x,y) domain), not a vertical direction.',2:'Partials can be negative; sign carries the direction information.',3:'∇f points UPhill by construction; the downhill direction is −∇f.'}},
   {q:'At a point on a contour (level) line, the gradient ∇f is…', opts:['Perpendicular to the contour line','Tangent to (along) the contour line','Zero everywhere on the contour','Parallel to the x-axis'], a:0, tag:'gradient vs level sets', focus:'Moving along a contour keeps f constant, so ∇f·Δ=0 there — ∇f is ⟂ to the contour.',
    why:'Along a contour f does not change, so ∇f·Δ = 0 for the tangent step Δ — meaning ∇f is perpendicular to the contour (and thus points across it, uphill).', wrong:{1:'Along the contour is where f stays constant, so ∇f·Δ=0 — that direction is ⟂ to ∇f, not the gradient itself.',2:'∇f is zero only at critical points, not along a generic contour.',3:'The contour orientation is arbitrary; ∇f is tied to the contour, not fixed to an axis.'}},
   {q:'Having both partial derivatives exist at a point guarantees a true tangent plane there.', opts:['False — the function must be differentiable (approximated well in every direction)','True — the two partials are always enough','True — but only for polynomials','False — you also need the second derivatives'], a:0, tag:'differentiability vs partials', focus:'Partials probe only the axes; differentiability requires ∇f·Δ approximate f in ALL directions.',
    why:'Partials only test the axis directions; genuine differentiability (a real tangent plane) demands the linear model ∇f·Δ approximate f along every direction — some functions have both partials yet no tangent plane.', wrong:{1:'The classic xy/(x²+y²) example has both partials at the origin yet is not even continuous — no tangent plane.',2:'The gap between "partials exist" and "differentiable" is not about being a polynomial.',3:'Tangent planes are a first-order (gradient) notion; second derivatives are curvature, a separate story.'}},
  ],
});

/* lab 1.1 — contour map with a draggable expansion point + tangent plane / cross-section slopes */
INTERACTIVES['mv-tangplane'] = function(stage, api){
  const L=makeLab(stage,{h:460});
  // a saddle-ish smooth surface so ∇f, cross-sections and the flat spot are all reachable
  const f  =(x,y)=> 0.5*x*x - 0.35*y*y + 0.4*x*y + 0.15;
  const fx =(x,y)=> x + 0.4*y;             // ∂f/∂x
  const fy =(x,y)=> -0.7*y + 0.4*x;        // ∂f/∂y
  let ax=1.2, ay=-0.6, drag=false;
  const M=api.missions([
    {text:'Drag to the <b>flat spot</b> (the saddle) where the plane lies level: ‖∇f‖ &lt; 0.15', xp:20, check:s=>s.g<0.15},
    {text:'Find a spot with a <b>steep positive</b> x-slice: ∂f/∂x &gt; 1.5', xp:20, check:s=>s.fx>1.5},
    {text:'Find a spot where the y-slice slopes <b>downward</b>: ∂f/∂y &lt; −0.8', xp:15, check:s=>s.fy<-0.8},
  ]);
  const P=plane(L.ctx,L.W,L.H,60);
  // filled contour heatmap (dark = low), drawn once
  const hm=document.createElement('canvas'); hm.width=L.W; hm.height=460;
  (function(){ const c=hm.getContext('2d'), img=c.createImageData(L.W,460); let lo=1e9,hi=-1e9;
    for(let py=0;py<460;py++)for(let px=0;px<L.W;px++){ const v=f(P.wx(px),P.wy(py)); if(v<lo)lo=v; if(v>hi)hi=v; }
    for(let py=0;py<460;py++)for(let px=0;px<L.W;px++){
      const v=f(P.wx(px),P.wy(py)), t=Math.max(0,Math.min(1,(v-lo)/(hi-lo))), i=(py*L.W+px)*4;
      img.data[i]=17+95*t; img.data[i+1]=21+34*(1-t)+8*t; img.data[i+2]=42+120*(1-t); img.data[i+3]=255;
    } c.putImageData(img,0,0); })();
  function contours(){
    L.ctx.strokeStyle='rgba(255,255,255,.12)'; L.ctx.lineWidth=1;
    // marching-squares-free: sample sign of (f - level) on a grid and stroke crossings as short ticks
    for(const lv of [-1.2,-0.6,0,0.6,1.2,2,3]){
      for(let px=6; px<L.W; px+=6) for(let py=6; py<460; py+=6){
        const a=f(P.wx(px),P.wy(py))-lv, b=f(P.wx(px+6),P.wy(py))-lv;
        if(a===0||(a<0)!==(b<0)){ L.ctx.beginPath(); L.ctx.moveTo(px,py-2); L.ctx.lineTo(px,py+2); L.ctx.stroke(); }
      }
    }
  }
  function draw(){
    L.ctx.drawImage(hm,0,0); contours();
    const gx=fx(ax,ay), gy=fy(ax,ay), g=Math.hypot(gx,gy);
    // gradient arrow (⟂ contours, points uphill) = the tangent plane's tilt
    if(g>0.02) P.arrow(ax,ay, ax+gx*0.45, ay+gy*0.45, '#ffc94d', 3.5, '∇f');
    // the two axis cross-section slopes as little tangent segments
    P.arrow(ax,ay, ax+0.7, ay, gx>0?'#7fe7ff':'#5aa9c9', 2, null);
    P.arrow(ax,ay, ax, ay+0.7, gy>0?'#7fe7ff':'#5aa9c9', 2, null);
    P.dot(ax,ay,7, g<0.15?'#2dd4a0':'#ffffff');
    L.readout.innerHTML='point ('+fmt2(ax)+', '+fmt2(ay)+')<br>'+
      '∂f/∂x = <b style="color:#7fe7ff">'+fmt2(gx)+'</b>   ∂f/∂y = <b style="color:#7fe7ff">'+fmt2(gy)+'</b><br>'+
      '∇f = ['+fmt2(gx)+', '+fmt2(gy)+']   ‖∇f‖ = <b>'+fmt2(g)+'</b>'+(g<0.15?'  <b style="color:#7df5c8">flat — tangent plane is level</b>':'');
    M.update({g, fx:gx, fy:gy});
  }
  L.canvas.addEventListener('pointerdown',e=>{ drag=true; L.canvas.setPointerCapture(e.pointerId); mv(e); });
  L.canvas.addEventListener('pointermove',mv);
  L.canvas.addEventListener('pointerup',()=>drag=false);
  function mv(e){ if(!drag)return; const c=L.toCanvas(e);
    ax=Math.max(-3.5,Math.min(3.5,P.wx(c.x))); ay=Math.max(-3.5,Math.min(3.5,P.wy(c.y))); draw(); }
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Dark = low ground. The <b style="color:#ffc94d">gold arrow</b> is ∇f — the tilt of the local tangent plane, always ⟂ to the contour ticks. The two <b style="color:#7fe7ff">cyan stubs</b> are the x- and y-cross-section slopes that build it. Drag onto the saddle to make the plane go level.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* lab 1.2 — gradient is perpendicular to the contour lines */
INTERACTIVES['mv-gradperp'] = function(stage, api){
  const L=makeLab(stage,{h:460});
  const fns=[
    {n:'bowl  x²+y²', f:(x,y)=>x*x+y*y, g:(x,y)=>[2*x,2*y]},
    {n:'tilted bowl', f:(x,y)=>0.6*x*x+1.6*y*y+0.5*x, g:(x,y)=>[1.2*x+0.5,3.2*y]},
    {n:'valley  x²+0.15y²', f:(x,y)=>x*x+0.15*y*y, g:(x,y)=>[2*x,0.3*y]},
  ];
  let fi=0, mx=1.4, my=1.0;
  const M=api.missions([
    {text:'Move the probe off-center — see the <b style="color:#ff5c7a">gradient</b> cross the contour at a right angle', xp:15, check:s=>s.r>0.4},
    {text:'Find where the gradient <b>vanishes</b> (the minimum): ‖∇f‖ &lt; 0.2', xp:20, check:s=>s.g<0.2},
    {text:'On the <b>valley</b> surface, probe a point where the gradient is nearly <b>horizontal</b> (|gy| &lt; 0.15·|gx|)', xp:20, check:s=>s.fi===2&&Math.abs(s.gy)<0.15*Math.abs(s.gx)&&s.g>0.3},
  ]);
  const P=plane(L.ctx,L.W,L.H,52);
  function drawContours(f){
    for(const lv of [0.4,1,2,3.5,5.5,8]){
      L.ctx.strokeStyle='rgba(255,255,255,.16)'; L.ctx.lineWidth=1.4; L.ctx.beginPath();
      // cheap contour: mark pixels where |f - lv| is small over a coarse grid
      for(let px=2; px<L.W; px+=2) for(let py=2; py<460; py+=2){
        const v=f(P.wx(px),P.wy(py)); if(Math.abs(v-lv)<0.06){ L.ctx.rect(px,py,1.4,1.4); }
      }
      L.ctx.stroke();
    }
  }
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const F=fns[fi];
    drawContours(F.f);
    const g=F.g(mx,my), gn=Math.hypot(g[0],g[1]), r=Math.hypot(mx,my);
    if(gn>0.02){
      const s=0.5/Math.max(0.5,gn/2); // scale arrow to keep it readable
      P.arrow(mx,my, mx+g[0]*s, my+g[1]*s, '#ff5c7a', 3, '∇f');
      // a perpendicular tangent-to-contour hint (green): along the contour
      const tx=-g[1]/gn, ty=g[0]/gn;
      P.arrow(mx,my, mx+tx*0.7, my+ty*0.7, '#2dd4a0', 2, null);
      P.arrow(mx,my, mx-tx*0.7, my-ty*0.7, '#2dd4a0', 2, null);
    }
    P.dot(mx,my,6,'#ffffff');
    L.readout.innerHTML=F.n+'<br>∇f = ['+fmt2(g[0])+', '+fmt2(g[1])+']   ‖∇f‖ = <b>'+fmt2(gn)+'</b><br>'+
      '<b style="color:#ff9db1">red</b> = uphill (⟂ contour)   <b style="color:#7df5c8">green</b> = along the contour (f constant)';
    M.update({fi, g:gn, gx:g[0], gy:g[1], r});
  }
  L.canvas.addEventListener('pointermove',e=>{ const c=L.toCanvas(e); mx=P.wx(c.x); my=P.wy(c.y); draw(); });
  L.canvas.addEventListener('pointerdown',e=>{ const c=L.toCanvas(e); mx=P.wx(c.x); my=P.wy(c.y); draw(); });
  chips(L.ctrl,'SURFACE',fns.map(f=>f.n),(i,btn,row)=>{ fi=i;
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); }).children[0].classList.add('on');
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The <b style="color:#ff9db1">red</b> gradient always meets the contour rings at a right angle — steepest uphill. The <b style="color:#7df5c8">green</b> directions run along a contour, where f is constant. Hover to move the probe; head to the center to watch ∇f shrink to zero.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== 2 · CHAIN RULE WITH JACOBIANS ================== */

registerLesson({
  id:'c-jacobian', world:'calc', order:16.3, emoji:'🧩', title:'The Chain Rule with Jacobians',
  sub:'Compose vector functions and the derivatives multiply — as matrices. This is backprop, written honestly.',
  learn:`<p>World 2's chain rule was <code>(f∘g)′ = f′(g(x))·g′(x)</code> — multiply the slopes along a chain. When each stage maps <em>vectors to vectors</em>, "the slope" becomes a matrix: the <strong>Jacobian</strong>, the grid of all partials of every output with respect to every input.</p>
  <div class="formula">$$J = \\dfrac{\\partial(\\text{outputs})}{\\partial(\\text{inputs})} \\qquad \\text{row } i\\text{, col } j = \\dfrac{\\partial(\\text{output}_i)}{\\partial(\\text{input}_j)}$$</div>
  <p>The Jacobian IS the total derivative from Lesson 1, now for a map with several outputs: it is the <strong>best linear approximation</strong> of a vector function near a point (a gradient is just the special one-row case). Feed a small input nudge Δin through it and you get the output nudge: Δout ≈ J·Δin.</p>
  <p>Now chain a pipeline <strong>x → u → y</strong> (say ℝ²→ℝ²→ℝ). The multivariable chain rule says the Jacobian of the whole thing is the <strong>product of the stage Jacobians</strong>, multiplied in reverse pipeline order:</p>
  <div class="formula">$$J(y \\text{ w.r.t. } x) = J(y \\text{ w.r.t. } u) \\cdot J(u \\text{ w.r.t. } x)$$</div>
  <p>That is not an analogy for backprop — it is backprop. A neural net is a deep composition <code>xₙ = fₙ(… f₂(f₁(x)))</code>; the gradient of the scalar loss w.r.t. the inputs is one long product of layer Jacobians. Two facts make it practical:</p>
  <p>• <strong>The final loss is a scalar</strong>, so the very first factor is a 1×n row (a gradient). Multiplying <em>right-to-left</em> keeps a small row-vector at each step — you never form a giant square Jacobian. This right-to-left pass is <strong>reverse-mode autodiff</strong>; it hands you all partials in roughly the cost of one forward pass.<br>
  • <strong>Order of factors matters, order of multiplication doesn't.</strong> Matrix products are non-commutative, so J₂·J₁ ≠ J₁·J₂ — you must respect pipeline order. But they are associative, so you may bracket the chain either way; reverse-mode just picks the bracketing (right-to-left) that keeps every intermediate a cheap vector.</p>
  <p>The chain of factors also explains training's oldest demons: multiply many layer Jacobians with singular values &lt; 1 and the product shrinks toward zero (<strong>vanishing gradients</strong>); with values &gt; 1 it blows up (<strong>exploding gradients</strong>).</p>`,
  ml:`Backprop = evaluate <b>J₁ⱼ · J₂ · … · J_L</b> from the loss end backward. Every framework (PyTorch, JAX, TensorFlow) is a Jacobian-multiplying machine that never materializes the full Jacobians — it computes <b>vector–Jacobian products</b> (reverse mode, one scalar loss → cheap) or <b>Jacobian–vector products</b> (forward mode). The layer Jacobians are exactly what you already know: a linear layer's is its weight matrix Wᵀ, an elementwise activation's is a diagonal of its derivatives (ReLU → 0/1, sigmoid → σ(1−σ)). "Vanishing/exploding gradients," why <b>residual connections</b> and careful init help, and why <b>LSTMs/normalization</b> exist — all are statements about the singular values of this Jacobian product.`,
  deeper:[
   {title:'😵 Stuck? A Jacobian is a table of partials', body:'For a map taking inputs (x₁,x₂,…) to outputs (y₁,y₂,…), the Jacobian is a rectangle: put ∂yᵢ/∂xⱼ in row i, column j. A function ℝ²→ℝ² has a 2×2 Jacobian; a scalar loss ℝⁿ→ℝ has a 1×n Jacobian, which is just the gradient laid on its side. Chaining maps multiplies these rectangles — the same "multiply the slopes" rule, upgraded to matrices.'},
   {title:'🚀 Go deeper: why reverse-mode (backprop) is cheap', body:'Consider ℝⁿ → … → ℝ (many weights in, one loss out). The chain is (1×n)·(n×n)·… If you multiply left-to-right you keep a fat n×n matrix around; multiply <b>right-to-left</b> and each partial product is a 1×k row vector — far cheaper. Because matrix multiplication is associative, both bracketings give the same answer, so backprop is free to choose the cheap one. That single choice is why you can train billion-parameter models.'},
   {title:'🚀 Go deeper: activations & the vanishing-gradient story', body:'A layer h = σ(Wx) has Jacobian diag(σ′(Wx))·W. Stack L of them and the loss gradient is a product of L such matrices. If the typical singular value is < 1 the product decays geometrically → vanishing gradients (deep sigmoid nets barely learn early layers); > 1 → exploding gradients (RNNs on long sequences). ReLU (σ′ ∈ {0,1}), residual connections (add an identity so a Jacobian ≈ I + small), and normalization all fight to keep those singular values near 1.'}],
  labs:[
   {key:'jacpipe', title:'Multiply Jacobians through a 2→2→1 pipeline', interactive:'mv-jacpipe',
    intro:'<p>A pipeline x → u → y with two vector stages and a scalar readout. Push an input nudge through and watch it transform stage by stage — Δu = J₁·Δx, then Δy = J₂·Δu. The composed Jacobian J₂·J₁ predicts Δy directly from Δx. Confirm the product of Jacobians equals following the graph end to end.</p>'},
   {key:'jacvanish', title:'Vanishing vs exploding gradient chains', interactive:'mv-jacvanish',
    intro:'<p>Stack many identical layer Jacobians and watch the product\'s size. Turn the "gain" (a stand-in for the typical singular value) below 1 and the chained gradient collapses toward zero; push it above 1 and it explodes. This is the whole vanishing/exploding-gradient phenomenon in one dial.</p>'},
  ],
  quiz:[
   {q:'For a function that maps a vector to a vector, the Jacobian is…', opts:['The matrix of every output partial w.r.t. every input','A single slope number','The vector of second derivatives','Always a square matrix'], a:0, tag:'jacobian definition', focus:'Jacobian entry (i,j) = ∂(output i)/∂(input j); it is the best linear map of a vector function.',
    why:'The Jacobian collects ∂(outputᵢ)/∂(inputⱼ) in row i, column j — the best linear approximation of a vector-to-vector map (the multivariable total derivative).', wrong:{1:'A single number is the derivative of a scalar-to-scalar function; a vector map needs a whole matrix.',2:'Second derivatives form the Hessian; the Jacobian is first-order.',3:'A map ℝⁿ→ℝᵐ has an m×n Jacobian — square only when m=n.'}},
   {q:'For a pipeline x → u → y, the chain rule says the overall Jacobian equals…', opts:['J(y w.r.t. u) · J(u w.r.t. x) — the stage Jacobians multiplied','J(u w.r.t. x) · J(y w.r.t. u) — the reverse product','The sum of the two Jacobians','The larger of the two Jacobians'], a:0, tag:'jacobian chain rule', focus:'Compose maps → multiply their Jacobians in reverse pipeline order (outer × inner).',
    why:'The multivariable chain rule multiplies the stage Jacobians, outer-times-inner: J(y|u)·J(u|x). It is the matrix version of (f∘g)′=f′(g)·g′.', wrong:{1:'That order (inner × outer) is generally wrong — matrix products do not commute, so you must apply outer × inner.',2:'Derivatives of a composition multiply, they do not add.',3:'The chain rule uses the full product, not a single dominant factor.'}},
   {q:'Why is reverse-mode autodiff (backprop) so efficient for a scalar loss over many weights?', opts:['Multiplying the Jacobian chain right-to-left keeps a small row vector at every step','It skips the chain rule entirely','It only needs the first layer','It replaces matrices with single numbers'], a:0, tag:'reverse-mode efficiency', focus:'Loss is scalar → first factor is 1×n; right-to-left products stay vector-sized (cheap).',
    why:'A scalar loss gives a 1×n leading factor; multiplying the chain right-to-left keeps each partial product a cheap row vector instead of a huge square matrix — all gradients in ~one backward pass.', wrong:{1:'Backprop IS the chain rule — applied efficiently, not skipped.',2:'It needs every layer\'s Jacobian; it cannot ignore the rest of the network.',3:'The factors are genuine matrices/vectors; efficiency comes from the multiplication order, not from shrinking them to scalars.'}},
   {q:'Because matrix multiplication is non-commutative, in the chain rule J₂·J₁…', opts:['The order of the factors matters — J₂·J₁ ≠ J₁·J₂ in general','You may freely swap the factors','The Jacobians must be identical','The product is always the identity'], a:0, tag:'non-commutativity', focus:'Jacobian factors follow pipeline order; you may re-bracket (associative) but not reorder.',
    why:'Matrix products do not commute, so the Jacobian factors must appear in pipeline order (you may re-bracket them since multiplication is associative, but not reorder them).', wrong:{1:'Swapping factors changes the product — pipeline order is fixed.',2:'The stage Jacobians are generally different matrices; nothing forces them equal.',3:'A product of Jacobians is the identity only in trivial special cases, not in general.'}},
   {q:'Stacking many layer Jacobians whose singular values are consistently below 1 produces…', opts:['Vanishing gradients — the product shrinks toward zero','Exploding gradients — the product blows up','A perfectly conditioned gradient','No effect on training'], a:0, tag:'vanishing gradients', focus:'Product of factors <1 decays geometrically (vanishing); >1 explodes. ResNets/norm keep it ≈1.',
    why:'Multiplying many matrices with singular values below 1 makes the product decay geometrically toward zero — vanishing gradients, which starve early layers of a training signal.', wrong:{1:'Values below 1 shrink, not blow up; exploding needs singular values above 1.',2:'A chain of sub-1 factors is the opposite of well-conditioned — it decays.',3:'It has a large effect: early layers stop learning, which is why residual/normalization tricks exist.'}},
  ],
});

/* lab 2.1 — push a nudge through a 2→2→1 pipeline; product of Jacobians == following the graph */
INTERACTIVES['mv-jacpipe'] = function(stage, api){
  const L=makeLab(stage,{h:460});
  // stage 1: u = g(x),  ℝ²→ℝ²   ;  stage 2: y = h(u), ℝ²→ℝ (scalar)
  const g =(x1,x2)=>[Math.sin(x1)+0.5*x2, x1*x2];        // u1, u2
  const J1=(x1,x2)=>[[Math.cos(x1), 0.5],[x2, x1]];      // ∂u/∂x
  const h =(u1,u2)=> 0.5*u1*u1 + u2;                     // y (scalar)
  const J2=(u1,u2)=>[[u1, 1]];                           // ∂y/∂u  (1×2)
  let x1=0.8, x2=0.6, dx1=0.4, dx2=0.0;
  function matvec(M,v){ return M.map(row=>row.reduce((s,a,j)=>s+a*v[j],0)); }
  function matmul(A,B){ return A.map(r=>B[0].map((_,j)=>r.reduce((s,a,k)=>s+a*B[k][j],0))); }
  const M=api.missions([
    {text:'Send a pure-x₁ nudge (Δx=[+,0]) through and read Δu, Δy along the graph', xp:15, check:s=>s.dx1>0.15&&Math.abs(s.dx2)<0.05},
    {text:'Confirm the <b>composed Jacobian</b> J₂·J₁ predicts Δy: match to within 0.02', xp:25, check:s=>s.match},
    {text:'Find an input nudge that leaves y almost unchanged (|Δy| &lt; 0.03) with a nonzero step', xp:20, check:s=>Math.abs(s.dy)<0.03&&(Math.abs(s.dx1)+Math.abs(s.dx2))>0.15},
  ]);
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    const u=g(x1,x2), y=h(u[0],u[1]);
    const j1=J1(x1,x2), j2=J2(u[0],u[1]);
    const du=matvec(j1,[dx1,dx2]);              // Δu ≈ J1·Δx
    const dy=matvec(j2,du)[0];                  // Δy ≈ J2·Δu
    const Jc=matmul(j2,j1);                     // composed 1×2 = J2·J1
    const dyDirect=Jc[0][0]*dx1+Jc[0][1]*dx2;   // Δy straight from the product
    const match=Math.abs(dy-dyDirect)<0.02;
    // draw the three nodes as boxes with the flowing nudge
    const cols=[110, L.W/2, L.W-110], cy=150;
    const boxes=[['x',[x1,x2],[dx1,dx2],'#7fe7ff'],['u',u,du,'#c9a3ff'],['y',[y],[dy],'#ffc94d']];
    L.ctx.textAlign='center';
    boxes.forEach((b,i)=>{
      L.ctx.fillStyle='rgba(255,255,255,.06)'; L.ctx.fillRect(cols[i]-60,cy-46,120,92);
      L.ctx.strokeStyle=b[3]; L.ctx.lineWidth=2; L.ctx.strokeRect(cols[i]-60,cy-46,120,92);
      L.ctx.fillStyle=b[3]; L.ctx.font='700 20px sans-serif'; L.ctx.fillText(b[0], cols[i], cy-24);
      L.ctx.fillStyle='#dfe6ff'; L.ctx.font='13px sans-serif';
      b[1].forEach((val,k)=>L.ctx.fillText(fmt2(val), cols[i], cy-2+k*17));
      L.ctx.fillStyle='#8fd4ff'; L.ctx.font='12px sans-serif';
      b[2].forEach((val,k)=>L.ctx.fillText('Δ '+fmt2(val), cols[i], cy+40-((b[2].length-1-k)*15)));
    });
    // arrows between stages, labelled with the Jacobian
    L.ctx.strokeStyle='#5a6398'; L.ctx.lineWidth=2;
    [[0,1,'J₁ (2×2)'],[1,2,'J₂ (1×2)']].forEach(([a,c,lab])=>{
      L.ctx.beginPath(); L.ctx.moveTo(cols[a]+60,cy); L.ctx.lineTo(cols[c]-60,cy); L.ctx.stroke();
      L.ctx.fillStyle='#aeb6e0'; L.ctx.font='12px sans-serif'; L.ctx.fillText(lab,(cols[a]+cols[c])/2,cy-56);
    });
    // the composed-Jacobian verification panel
    L.ctx.textAlign='left'; L.ctx.fillStyle='#dfe6ff'; L.ctx.font='13px sans-serif';
    L.ctx.fillText('composed  J₂·J₁ = [ '+fmt2(Jc[0][0])+' , '+fmt2(Jc[0][1])+' ]', 40, 300);
    L.ctx.fillText('Δy along the graph      = '+fmt2(dy), 40, 322);
    L.ctx.fillText('Δy from J₂·J₁ · Δx      = '+fmt2(dyDirect), 40, 344);
    L.ctx.fillStyle=match?'#7df5c8':'#ff9db1';
    L.ctx.fillText(match?'✓ product of Jacobians = following the graph':'…nudging; they will agree for small Δ', 40, 372);
    L.ctx.textAlign='left';
    L.readout.innerHTML='x=('+fmt2(x1)+','+fmt2(x2)+')  →  u=('+fmt2(u[0])+','+fmt2(u[1])+')  →  y='+fmt2(y)+
      '<br>Δx=('+fmt2(dx1)+','+fmt2(dx2)+')  →  Δu=('+fmt2(du[0])+','+fmt2(du[1])+')  →  Δy='+fmt2(dy);
    M.update({dx1,dx2,dy,match});
  }
  slider(L.ctrl,'input x₁',-2.5,2.5,0.05,0.8,v=>v.toFixed(2),v=>{x1=v;draw();});
  slider(L.ctrl,'input x₂',-2.5,2.5,0.05,0.6,v=>v.toFixed(2),v=>{x2=v;draw();});
  slider(L.ctrl,'nudge Δx₁',-0.6,0.6,0.02,0.4,v=>v.toFixed(2),v=>{dx1=v;draw();});
  slider(L.ctrl,'nudge Δx₂',-0.6,0.6,0.02,0.0,v=>v.toFixed(2),v=>{dx2=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Left→right is the forward pass: the input nudge <b style="color:#8fd4ff">Δ</b> is reshaped by J₁, then J₂. The bottom panel checks that the single product <b>J₂·J₁</b> reproduces the same Δy — the chain rule, made of matrices.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* lab 2.2 — chained layer Jacobians: vanishing vs exploding */
INTERACTIVES['mv-jacvanish'] = function(stage, api){
  const L=makeLab(stage,{h:460});
  let gain=0.85, depth=12;
  const M=api.missions([
    {text:'Push the gain well below 1 (and the depth up) until the chained gradient <b>vanishes</b> (final &lt; 0.05)', xp:20, check:s=>s.finalMag<0.05},
    {text:'Set gain &gt; 1 — watch it <b>explode</b> (final &gt; 20)', xp:20, check:s=>s.finalMag>20},
    {text:'Tune gain to the <b>sweet spot</b> where the gradient stays healthy through the whole net (0.5 &lt; final &lt; 2)', xp:20, check:s=>s.finalMag>0.5&&s.finalMag<2},
  ]);
  const P=plane(L.ctx,L.W,L.H,1,60,L.H-70); // custom axes: x=layer, y=log magnitude
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    // magnitude of the gradient after multiplying k layer Jacobians (each ~ gain)
    const mags=[1]; for(let k=1;k<=depth;k++) mags.push(mags[k-1]*gain);
    const finalMag=mags[depth];
    const x0=60, x1=L.W-30, y0=L.H-60, yTop=40;
    // log scale for y
    const lo=-6, hi=6; // log10 range
    const sx=k=>x0+(x1-x0)*k/depth;
    const sy=m=>{ const lg=Math.log10(Math.max(1e-9,m)); return y0-(y0-yTop)*(lg-lo)/(hi-lo); };
    // axes + gridlines at powers of ten
    L.ctx.strokeStyle='rgba(255,255,255,.12)'; L.ctx.lineWidth=1;
    for(let e=lo;e<=hi;e+=2){ const y=sy(Math.pow(10,e)); L.ctx.beginPath(); L.ctx.moveTo(x0,y); L.ctx.lineTo(x1,y); L.ctx.stroke();
      L.ctx.fillStyle='#8a92c0'; L.ctx.font='11px sans-serif'; L.ctx.textAlign='right'; L.ctx.fillText('1e'+e, x0-6, y+4); }
    // the "healthy" band around 1
    L.ctx.fillStyle='rgba(45,212,160,.10)'; L.ctx.fillRect(x0, sy(2), x1-x0, sy(0.5)-sy(2));
    // the magnitude curve
    L.ctx.strokeStyle=finalMag<0.05?'#ff9db1':(finalMag>20?'#ffb14d':'#7df5c8'); L.ctx.lineWidth=3; L.ctx.beginPath();
    mags.forEach((m,k)=>{ const X=sx(k),Y=Math.max(yTop,Math.min(y0,sy(m))); if(k===0)L.ctx.moveTo(X,Y); else L.ctx.lineTo(X,Y); });
    L.ctx.stroke();
    mags.forEach((m,k)=>{ L.ctx.fillStyle='#dfe6ff'; L.ctx.beginPath(); L.ctx.arc(sx(k),Math.max(yTop,Math.min(y0,sy(m))),3,0,7); L.ctx.fill(); });
    L.ctx.fillStyle='#aeb6e0'; L.ctx.font='12px sans-serif'; L.ctx.textAlign='center';
    L.ctx.fillText('layer 0 (loss)  →  through '+depth+' layers  →  input', (x0+x1)/2, L.H-30);
    L.ctx.textAlign='left';
    const verdict = finalMag<0.05?'<b style="color:#ff9db1">VANISHED — early layers get almost no signal</b>'
                  : finalMag>20?'<b style="color:#ffb14d">EXPLODED — unstable updates</b>'
                  : '<b style="color:#7df5c8">healthy — gradient survives the depth</b>';
    L.readout.innerHTML='per-layer gain (≈ singular value) = <b>'+gain.toFixed(2)+'</b>, depth = '+depth+
      '<br>gradient magnitude after '+depth+' layers = <b>'+finalMag.toExponential(2)+'</b><br>'+verdict;
    M.update({finalMag, gain, depth});
  }
  slider(L.ctrl,'per-layer gain',0.5,1.6,0.01,0.85,v=>v.toFixed(2),v=>{gain=v;draw();});
  slider(L.ctrl,'depth (layers)',2,30,1,12,v=>String(Math.round(v)),v=>{depth=Math.round(v);draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Each layer multiplies the running gradient by roughly its Jacobian\'s singular value (the <b>gain</b>). Below 1, the product decays layer by layer to nothing (<b style="color:#ff9db1">vanishing</b>); above 1 it blasts off (<b style="color:#ffb14d">exploding</b>). The <b style="color:#7df5c8">green band</b> near 1 is where deep nets stay trainable — the goal of good init, residuals and normalization.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== 3 · LAGRANGE MULTIPLIERS ================== */

registerLesson({
  id:'c-lagrange', world:'calc', order:16.6, emoji:'⛓️', title:'Lagrange Multipliers: Optimizing on a Leash',
  sub:'Minimize f while pinned to a constraint g=0. At the answer, the two gradients line up — one of calculus\'s most visual theorems.',
  learn:`<p>Real optimization is rarely "go anywhere downhill." Usually you must obey a <strong>constraint</strong>: minimize f(x, y) <em>subject to</em> g(x, y) = 0. You are on a leash — free to move only along the curve g = 0.</p>
  <p>Here is the whole idea in one picture. Walk along the constraint curve and watch f's contour lines. As long as your path <em>crosses</em> contours, you are still going up or down f — so you can do better by sliding along the leash. You can only stop improving when the constraint curve runs <strong>tangent</strong> to a contour of f. And tangency of two curves means their gradients (each ⟂ its own curve, from Lesson 1) point along the <strong>same line</strong>:</p>
  <div class="formula">$$\\nabla f = \\lambda \\nabla g \\qquad \\text{(at the constrained optimum)}$$</div>
  <p>That scalar λ is the <strong>Lagrange multiplier</strong>. It bundles into one tidy statement: at the best feasible point, you cannot lower f without leaving the constraint. Equivalently, define the <strong>Lagrangian</strong></p>
  <div class="formula">$$\\mathcal{L}(x, y, \\lambda) = f(x, y) - \\lambda \\cdot g(x, y)$$</div>
  <p>and set <em>all</em> its partials to zero: ∂ℒ/∂x = ∂ℒ/∂y = 0 reproduce ∇f = λ∇g, and ∂ℒ/∂λ = 0 gives back the constraint g = 0. A constrained problem becomes an <em>unconstrained</em> stationary-point problem in one more variable — a trick that scales.</p>
  <p>The multiplier λ is not just bookkeeping: it is a <strong>sensitivity / shadow price</strong>. It equals ∂(optimal f)/∂(constraint level) — how much the best achievable value would change if you loosened the constraint by one unit. In economics that is the price of relaxing a budget; in ML it is the exchange rate between an objective and a limit.</p>`,
  ml:`This is the backbone of constrained ML. <b>SVMs</b> maximize the margin subject to correct-classification constraints; the Lagrange multipliers are literally the <b>support-vector weights</b> (nonzero only for the points that touch the margin), and the dual problem you actually solve is written in those multipliers. <b>RLHF/PPO</b> keeps the new policy from drifting too far by constraining a <b>KL divergence</b> — the KL-penalty coefficient is a Lagrange multiplier trading reward against staying close to the reference model. <b>Maximum-entropy models</b>, <b>optimal transport</b>, and any "minimize loss subject to a budget" problem all run on ∇f = λ∇g. Whenever you see a penalty term "+ λ·(constraint)," a Lagrange multiplier is doing the work.`,
  deeper:[
   {title:'😵 Stuck? "Slide until the leash goes tangent"', body:'Picture the contour lines of f as a topographic map and the constraint g=0 as a fixed trail you must stay on. Walk the trail: whenever it cuts ACROSS the contours you are gaining or losing height, so keep going. The lowest (or highest) point on the trail is exactly where the trail just kisses a contour — runs tangent to it. Tangent curves share a perpendicular, so ∇f and ∇g point along the same line there: ∇f = λ∇g.'},
   {title:'🚀 Go deeper: the Lagrangian & KKT', body:'Bundling the condition into ℒ = f − λg and zeroing every partial turns a constrained problem into an unconstrained one in (x, y, λ). For inequality constraints g ≤ 0 this generalizes to the <b>KKT conditions</b>: λ ≥ 0 and "complementary slackness" λ·g = 0 (a constraint either binds, g=0, or its multiplier is 0). KKT is the theoretical engine behind SVM training and convex optimization solvers.'},
   {title:'🚀 Go deeper: λ as a shadow price (why RLHF tunes it)', body:'The multiplier equals ∂f*/∂c — the rate the optimal objective f* moves as you shift the constraint level c. A big λ means the constraint is "expensive": relaxing it a little buys a lot of objective. RLHF exploits exactly this: the KL-penalty coefficient IS the multiplier trading reward against divergence from the reference policy, and tuning it slides you along the trade-off frontier between reward-hacking and staying on-distribution.'}],
  labs:[
   {key:'lagtangent', title:'Slide along the constraint to the tangency', interactive:'mv-lagtangent',
    intro:'<p>Minimize f on the <b style="color:#ffc94d">constraint curve</b> g=0. Drag the point along the leash; at each spot compare <b style="color:#ff5c7a">∇f</b> and <b style="color:#7fe7ff">∇g</b>. Away from the optimum they point in different directions (you can still improve); at the optimum they line up — ∇f = λ∇g — and the constraint runs tangent to an f-contour.</p>'},
   {key:'lagsolve', title:'Read off the multiplier λ', interactive:'mv-lagsolve',
    intro:'<p>Now search for the constrained optimum directly. As you slide along g=0, the readout tracks how parallel ∇f and ∇g are and estimates λ = ‖∇f‖/‖∇g‖. Land on the tangency to lock in ∇f = λ∇g and read the multiplier — the shadow price of the constraint.</p>'},
  ],
  quiz:[
   {q:'At the solution of "minimize f subject to g=0," the gradients satisfy…', opts:['∇f = λ∇g — they point along the same line','∇f = 0 — the gradient of f vanishes','∇f ⟂ ∇g — the gradients are perpendicular','f = g at that point'], a:0, tag:'lagrange condition', focus:'Constrained optimum ⇒ ∇f and ∇g are parallel: ∇f = λ∇g for some scalar λ.',
    why:'At a constrained optimum the constraint curve is tangent to an f-contour, so the two gradients (each ⟂ its own curve) are parallel: ∇f = λ∇g.', wrong:{1:'∇f=0 is the UNconstrained condition. On a constraint, f\'s gradient is generally nonzero — it just can\'t push you off the leash.',2:'Perpendicular gradients mean you can still slide along the constraint to lower f — that is NOT the optimum.',3:'f and g need not be equal; g=0 is the constraint, and f takes whatever value the tangency point gives.'}},
   {q:'Geometrically, the constrained optimum occurs where the constraint curve g=0…', opts:['Runs tangent to a contour (level set) of f','Crosses the most contours of f','Passes through the origin','Is perpendicular to every contour of f'], a:0, tag:'tangency picture', focus:'Optimum ⇔ constraint tangent to an f-contour (no contour-crossing left to exploit).',
    why:'While the constraint crosses f\'s contours you can still slide to change f; improvement stops exactly where it runs tangent to a contour — the constrained optimum.', wrong:{1:'Crossing many contours means f is still changing fast along the constraint — you can keep improving, so it is not optimal.',2:'The origin is irrelevant unless the constraint happens to pass through it; tangency is the condition.',3:'Perpendicular to a contour is the steepest-crossing direction — the opposite of tangency; there f changes fastest along the leash.'}},
   {q:'The Lagrangian ℒ = f − λg turns a constrained problem into…', opts:['An unconstrained stationary-point problem in x, y, and λ','A problem with no solution','A pure maximization of g','A second-derivative (Hessian) problem'], a:0, tag:'the lagrangian', focus:'Zero every partial of ℒ: the x,y ones give ∇f=λ∇g; the λ one gives back g=0.',
    why:'Setting all partials of ℒ to zero reproduces ∇f=λ∇g (from ∂/∂x, ∂/∂y) and the constraint g=0 (from ∂/∂λ) — an unconstrained system in one extra variable.', wrong:{1:'It has solutions — that is the whole point; it packages the optimum into one stationary-point system.',2:'It does not maximize g; ∂ℒ/∂λ=0 just re-imposes the constraint g=0.',3:'The Lagrangian method uses first-order (gradient) conditions, not the Hessian.'}},
   {q:'The Lagrange multiplier λ can be interpreted as…', opts:['A sensitivity / shadow price: how much the optimal f changes as the constraint loosens','The number of constraints','The value of f at the optimum','Always equal to 1'], a:0, tag:'shadow price', focus:'λ = ∂(optimal f)/∂(constraint level) — the marginal value of relaxing the constraint.',
    why:'λ equals ∂f*/∂c, the rate at which the optimal objective changes as you shift the constraint level — its shadow price (why RLHF tunes the KL coefficient).', wrong:{1:'There is one λ per equality constraint, but its VALUE is a sensitivity, not a count.',2:'λ is not f\'s optimal value; it is the marginal change in that value per unit of constraint.',3:'λ takes whatever value the tangency demands — rarely 1.'}},
   {q:'In an SVM, the Lagrange multipliers of the margin constraints turn out to be…', opts:['The support-vector weights — nonzero only for points on the margin','The learning rate','The number of features','Always zero'], a:0, tag:'lagrange in ML', focus:'SVM multipliers = per-point weights; nonzero only for support vectors (points touching the margin).',
    why:'Solving the SVM\'s constrained problem yields one multiplier per training point; only the support vectors (those touching the margin) get nonzero multipliers — that is complementary slackness in action.', wrong:{1:'The learning rate is an optimizer step size, unrelated to the constraint multipliers.',2:'There is one multiplier per constraint/point, not per feature.',3:'Support-vector multipliers are nonzero — they are exactly what defines the decision boundary.'}},
  ],
});

/* lab 3.1 — slide along the constraint; watch ∇f vs ∇g line up at the tangency */
INTERACTIVES['mv-lagtangent'] = function(stage, api){
  const L=makeLab(stage,{h:460});
  // minimize f = (x-0.4)² + 0.7(y-0.2)² on the circle g = x²+y²-1 = 0
  const f  =(x,y)=> (x-0.4)*(x-0.4) + 0.7*(y-0.2)*(y-0.2);
  const gf =(x,y)=> [2*(x-0.4), 1.4*(y-0.2)];   // ∇f
  const gg =(x,y)=> [2*x, 2*y];                 // ∇g (constraint circle)
  let th=0.9;                                   // param angle on the circle
  function pt(t){ return [Math.cos(t), Math.sin(t)]; }
  function cosAngle(t){ const [x,y]=pt(t), a=gf(x,y), b=gg(x,y);
    const na=Math.hypot(a[0],a[1]), nb=Math.hypot(b[0],b[1]);
    return (a[0]*b[0]+a[1]*b[1])/(na*nb||1); }   // +1 or -1 ⇒ parallel ⇒ tangency
  const M=api.missions([
    {text:'Slide to a spot where <b style="color:#ff5c7a">∇f</b> does <b>not</b> align with <b style="color:#7fe7ff">∇g</b> (|cos| &lt; 0.9) — you can still improve', xp:15, check:s=>Math.abs(s.cos)<0.9},
    {text:'Find the <b>constrained minimum</b>: make ∇f and ∇g parallel (|cos| &gt; 0.985)', xp:25, check:s=>Math.abs(s.cos)>0.985&&s.isMin},
    {text:'Find the <b>constrained maximum</b> on the same circle (also a tangency, |cos| &gt; 0.985)', xp:20, check:s=>Math.abs(s.cos)>0.985&&!s.isMin},
  ]);
  const P=plane(L.ctx,L.W,L.H,140);
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    // f contours (ellipses centered at (0.4,0.2)) as sampled rings
    for(const lv of [0.15,0.4,0.8,1.4,2.2]){
      L.ctx.strokeStyle='rgba(124,92,255,.5)'; L.ctx.lineWidth=1.4; L.ctx.beginPath();
      for(let i=0;i<=90;i++){ const a=i/90*Math.PI*2;
        // solve radius on this ray for f=lv:  along direction (cos,sin) from center
        const cx=0.4, cy=0.2, dx=Math.cos(a), dy=Math.sin(a);
        // f = dx²·r² + 0.7·dy²·r²  ⇒ r = sqrt(lv / (dx²+0.7dy²))
        const r=Math.sqrt(lv/(dx*dx+0.7*dy*dy));
        const X=P.sx(cx+dx*r), Y=P.sy(cy+dy*r); if(i===0)L.ctx.moveTo(X,Y); else L.ctx.lineTo(X,Y);
      } L.ctx.stroke();
    }
    // constraint circle g=0
    L.ctx.strokeStyle='#ffc94d'; L.ctx.lineWidth=2.5; L.ctx.beginPath();
    L.ctx.arc(P.sx(0),P.sy(0),140,0,7); L.ctx.stroke();
    const [x,y]=pt(th); const a=gf(x,y), b=gg(x,y), c=cosAngle(th);
    const par=Math.abs(c)>0.985;
    // gradient arrows at the current point
    P.arrow(x,y, x+a[0]*0.22, y+a[1]*0.22, '#ff5c7a', 3, '∇f');
    P.arrow(x,y, x+b[0]*0.22, y+b[1]*0.22, '#7fe7ff', 3, '∇g');
    P.dot(x,y,7, par?'#2dd4a0':'#ffffff');
    const lam = Math.hypot(a[0],a[1])/Math.hypot(b[0],b[1]) * (c<0?-1:1);
    L.readout.innerHTML='point on g=0: ('+fmt2(x)+', '+fmt2(y)+')   f = '+fmt2(f(x,y))+'<br>'+
      'alignment cos(∇f,∇g) = <b>'+fmt2(c)+'</b> '+(par?'<b style="color:#7df5c8">→ ∇f ∥ ∇g : tangency!</b>':'(not parallel — slide on)')+
      (par?'<br>λ ≈ '+fmt2(lam):'');
    M.update({cos:c, isMin: f(x,y)<0.6});
  }
  slider(L.ctrl,'slide along g=0 (angle)',0,6.28,0.01,0.9,v=>v.toFixed(2)+' rad',v=>{th=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The <b style="color:#ffc94d">gold circle</b> is the constraint g=0; <b style="color:#b9a8ff">purple rings</b> are contours of f. Slide the point: while <b style="color:#ff5c7a">∇f</b> and <b style="color:#7fe7ff">∇g</b> disagree you can still lower f along the leash. Where they line up (dot turns green), the circle is tangent to a contour — that is the constrained optimum, ∇f = λ∇g.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* lab 3.2 — find the tangency and read off λ = ‖∇f‖/‖∇g‖ */
INTERACTIVES['mv-lagsolve'] = function(stage, api){
  const L=makeLab(stage,{h:460});
  // minimize f = x + 2y on the ellipse g = x²/4 + y² - 1 = 0 (a clean closed-form answer)
  const f  =(x,y)=> x + 2*y;
  const gf =(x,y)=> [1, 2];              // ∇f (constant field — nice teaching case)
  const gg =(x,y)=> [x/2, 2*y];          // ∇g
  let th=2.2;
  function pt(t){ return [2*Math.cos(t), Math.sin(t)]; } // ellipse param
  function cosAngle(t){ const [x,y]=pt(t), a=gf(x,y), b=gg(x,y);
    const na=Math.hypot(a[0],a[1]), nb=Math.hypot(b[0],b[1]);
    return (a[0]*b[0]+a[1]*b[1])/(na*nb||1); }
  const M=api.missions([
    {text:'Slide to the <b>constrained minimum</b> of f=x+2y on the ellipse (align ∇f ∥ ∇g, |cos| &gt; 0.99)', xp:25, check:s=>Math.abs(s.cos)>0.99},
    {text:'At the tangency, read a <b>positive</b> multiplier λ &gt; 0 (∇f and ∇g point the SAME way)', xp:20, check:s=>Math.abs(s.cos)>0.99&&s.lam>0},
    {text:'Slide to the opposite tangency where λ is <b>negative</b> (gradients anti-parallel)', xp:20, check:s=>Math.abs(s.cos)>0.99&&s.lam<0},
  ]);
  const P=plane(L.ctx,L.W,L.H,95);
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    // f = x+2y contours are straight lines; draw a few
    for(const lv of [-4,-2,0,2,4]){
      L.ctx.strokeStyle='rgba(124,92,255,.45)'; L.ctx.lineWidth=1.3; L.ctx.beginPath();
      // x + 2y = lv  ⇒  y = (lv - x)/2
      const xa=-4, xb=4; L.ctx.moveTo(P.sx(xa),P.sy((lv-xa)/2)); L.ctx.lineTo(P.sx(xb),P.sy((lv-xb)/2)); L.ctx.stroke();
    }
    // ellipse g=0
    L.ctx.strokeStyle='#ffc94d'; L.ctx.lineWidth=2.5; L.ctx.beginPath();
    for(let i=0;i<=100;i++){ const t=i/100*Math.PI*2, [x,y]=pt(t); const X=P.sx(x),Y=P.sy(y); if(i===0)L.ctx.moveTo(X,Y); else L.ctx.lineTo(X,Y); }
    L.ctx.stroke();
    const [x,y]=pt(th), a=gf(x,y), b=gg(x,y), c=cosAngle(th), par=Math.abs(c)>0.99;
    const lam = (Math.hypot(a[0],a[1])/Math.hypot(b[0],b[1])) * (c<0?-1:1);
    P.arrow(x,y, x+a[0]*0.28, y+a[1]*0.28, '#ff5c7a', 3, '∇f');
    P.arrow(x,y, x+b[0]*0.28, y+b[1]*0.28, '#7fe7ff', 3, '∇g');
    P.dot(x,y,7, par?'#2dd4a0':'#ffffff');
    L.readout.innerHTML='point ('+fmt2(x)+', '+fmt2(y)+')   f = x+2y = <b>'+fmt2(f(x,y))+'</b><br>'+
      'cos(∇f,∇g) = '+fmt2(c)+(par?'  <b style="color:#7df5c8">∥ tangency</b>':'  (keep sliding)')+
      '<br>λ = ‖∇f‖/‖∇g‖ '+(par?'= <b>'+fmt2(lam)+'</b>':'(only meaningful at tangency)');
    M.update({cos:c, lam});
  }
  slider(L.ctrl,'slide along g=0 (angle)',0,6.28,0.01,2.2,v=>v.toFixed(2)+' rad',v=>{th=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Here f=x+2y so its <b style="color:#b9a8ff">contours are parallel lines</b> and <b style="color:#ff5c7a">∇f</b> is a constant arrow. Slide along the <b style="color:#ffc94d">ellipse</b> until <b style="color:#7fe7ff">∇g</b> lines up with ∇f — that tangency is the constrained optimum, and λ = ‖∇f‖/‖∇g‖ is its shadow price. Two tangencies exist: the min (λ&gt;0) and the max (λ&lt;0).</div>';
  L.ctrl.appendChild(note);
  draw();
};
