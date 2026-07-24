/* ================================================================
   WORLD 1 — ORTHOGONALITY, PROJECTION & LEAST SQUARES.
   Appends at the END of World 1 via order 20/21/22 (higher than every
   existing `la` lesson: index.js push-order tops out at la-boss, and
   la-depth uses 6.2–6.6). Same registries + schema as the rest of the
   curriculum (see index.js / la-depth.js).

   The arc: project a vector onto a line (residual ⊥ line) → least squares
   IS that projection onto a column space, with the normal equations
   AᵀAx = Aᵀb falling straight out (and fitting a line, tying back to
   pre-slope) → Gram–Schmidt as repeated projection, the intuition
   behind QR. This fills the graduate-review coverage hole between
   "matrices transform" and "SVD / matrix calculus".
   ================================================================ */
import { INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, slider, chips, plane, clearBg, fmt2 } from '../engine.js';

/* ================== 1 · PROJECTION ONTO A LINE / SUBSPACE ================== */

registerLesson({
  id:'la-projection', world:'la', order:20, emoji:'📐', title:'Projection onto a Line',
  sub:'Drop a vector onto a direction — the shadow it casts, and the part left behind.',
  learn:`<p>Take a vector <strong>b</strong> and a line through the origin with direction <strong>a</strong>. The <strong>projection of b onto a</strong> is the point on that line closest to b — the shadow b casts when light falls perpendicular to the line.</p>
  <p>Two flavours. The <strong>scalar projection</strong> is how far along <b>a</b> you travel (a signed length):</p>
  <div class="formula">$$b \\cdot \\hat{a} = \\dfrac{a \\cdot b}{\\|a\\|} \\quad (\\hat{a} = a/\\|a\\|, \\text{ the unit direction})$$</div>
  <p>The <strong>vector projection</strong> puts that length back onto the line as an actual vector:</p>
  <div class="formula">$$\\text{proj}_a b = \\left(\\dfrac{a \\cdot b}{a \\cdot a}\\right) \\cdot a$$</div>
  <p>The magic is what's <em>left over</em>. The <strong>residual</strong> r = b − proj<sub>a</sub>b is always <strong>perpendicular to the line</strong>. That is not a coincidence you have to memorise — it's forced: the closest point is exactly the one where the error has no leftover component along <b>a</b> to shave off. Check it with a dot product: a·r = a·b − (a·b/a·a)(a·a) = 0.</p>
  <p>So every vector splits cleanly into "the part along <b>a</b>" plus "the part orthogonal to <b>a</b>" — and those two pieces obey the Pythagorean theorem: ‖b‖² = ‖proj‖² + ‖r‖².</p>`,
  ml:`Projection is how models <b>measure</b> a vector against a direction. A single neuron computes \\(w \\cdot x\\) — an unnormalised scalar projection of the input onto its weight direction: "how much of x points my way?" Attention scores are dot products (projections of a query onto keys). And the residual — the orthogonal leftover — is the raw material of <b>least squares</b> and of the residual streams in transformers: the part the current direction couldn't explain, passed on for the next layer to handle.`,
  deeper:[
   {title:'😵 Stuck? The flashlight view', body:'Hold a flashlight so its rays hit the line dead-on (perpendicular). The shadow of b on the line is proj_a b. The residual is the gap between b and its shadow — and because the light is perpendicular to the line, that gap is perpendicular to the line too. Move b straight up or down (parallel to the residual) and its shadow doesn\'t budge: those are exactly the directions the line can\'t see.'},
   {title:'🚀 Go deeper: projecting onto a subspace', body:'Onto a single direction the projection is (a·b/a·a)a. Onto a whole subspace — the column space of a matrix A — the same idea becomes a matrix: P = A(AᵀA)⁻¹Aᵀ, and proj = Pb. P is a genuine <b>projection matrix</b>: P² = P (projecting twice changes nothing) and Pᵀ = P (symmetric). The residual b − Pb is orthogonal to the entire subspace. That P is the engine of the next lesson — least squares is just proj onto col(A).'}],
  interactive:'laproj',
  // P2 wave L: additive scene arc (Scene Kit migration). The scene modules
  // live in scenes/la-projection.js and register into the scene registry via
  // scenes/index.js; `interactive`/`quiz` above are untouched (additive).
  scenes:['proj.shadow','proj.perp','proj.signed','proj.line','proj.split','proj.capstone'],
  quiz:[
   {q:'The residual r = b − proj<sub>a</sub>b always satisfies…', opts:['a·r = 0 — it is perpendicular to a','r = 0 for every b','r is parallel to a','‖r‖ = ‖b‖ always'], a:0,
    tag:'residual is orthogonal', focus:'The closest point on a line leaves an error with no component along the line: a·r = 0 by construction.',
    why:'Plug in: a·r = a·b − (a·b/a·a)(a·a) = a·b − a·b = 0. The leftover has no component along a — that orthogonality IS what makes proj the closest point.',
    wrong:{1:'r = 0 only when b already lies on the line. In general b sticks out, so there is a real perpendicular leftover.',
           2:'Backwards: the residual is the part that is NOT along a. The part along a is the projection itself; what remains is orthogonal to it.',
           3:'‖r‖ = ‖b‖ would mean the projection is zero — true only when b is already perpendicular to a, not in general.'}},
   {q:'The scalar projection of b onto a unit vector â is…', opts:['b·â','‖b‖','b·â times â','â/‖b‖'], a:0,
    tag:'scalar projection', focus:'Onto a UNIT vector, the projected length is just the dot product b·â — no division needed.',
    why:'â already has length 1, so the (a·b)/‖a‖ formula collapses to a·b = b·â — a plain signed number telling you how far along â the shadow reaches.',
    wrong:{1:'‖b‖ is b\'s full length regardless of direction. The projection cares only about the part of b pointing along â, which is generally shorter.',
           2:'That is the VECTOR projection (a length times the direction â). The SCALAR projection is just the number b·â.',
           3:'Dividing a direction by a length is dimensionally wrong — the scalar projection is a signed length, the number b·â.'}},
   {q:'proj<sub>a</sub>b = (a·b / a·a)·a. If you replace a with 2a (same line, longer arrow), the projection…', opts:['is unchanged — it depends only on the line','doubles','halves','flips sign'], a:0,
    tag:'projection depends on direction, not length', focus:'Projection is onto a LINE. Scaling the direction vector cancels out in the formula — same subspace, same shadow.',
    why:'Substitute 2a: ((2a)·b)/((2a)·(2a)) · 2a = (2 a·b)/(4 a·a) · 2a = (a·b/a·a)·a. The two factors of 2 in the denominator kill the one in the numerator and the one out front — you land on the exact same point.',
    wrong:{1:'The numerator scaling is cancelled by the denominator a·a, which picks up a factor of 4. Nothing doubles — the result is invariant.',
           2:'Halving would require the length to survive linearly, but a·a grows quadratically and the trailing a grows linearly, so they cancel exactly.',
           3:'No sign flips: 2a points the same way as a. Only a negative scalar would reverse the direction arrow (and even then the point on the line is the same).'}},
   {q:'A vector b splits as proj<sub>a</sub>b + r (residual). Which identity holds?', opts:['‖b‖² = ‖proj<sub>a</sub>b‖² + ‖r‖²','‖b‖ = ‖proj<sub>a</sub>b‖ + ‖r‖','‖b‖² = ‖proj<sub>a</sub>b‖² − ‖r‖²','‖r‖ = ‖b‖ − ‖proj<sub>a</sub>b‖'], a:0,
    tag:'Pythagoras for the split', focus:'proj and residual are perpendicular, so their squared lengths add — Pythagoras on a right triangle.',
    why:'proj_a b ⊥ r, so they form the legs of a right triangle with hypotenuse b. Pythagoras gives ‖b‖² = ‖proj‖² + ‖r‖² — squares add, not the lengths themselves.',
    wrong:{1:'Lengths add only for parallel pieces. These two are perpendicular, so it is the SQUARES that add (Pythagoras), not the raw lengths.',
           2:'The sign is wrong: perpendicular legs ADD in Pythagoras. Subtracting would let ‖b‖ be smaller than a piece of itself.',
           3:'That rearranges the raw-length (non-Pythagorean) claim, which is false whenever the residual is nonzero — the triangle inequality is strict here.'}},
  ],
});
INTERACTIVES.laproj = function(stage, api){
  const L=makeLab(stage);
  const a={x:3,y:1};            // direction of the line (draggable)
  const b={x:1,y:2.5};         // the vector we project (draggable)
  let drag=null;               // 'a' | 'b' | null
  const m=api.missions([
    {text:'Drag <b style="color:#b9a8ff">b</b> so its projection lands near the tip of <b style="color:#ffc94d">a</b> (residual ‖r‖ ≥ 1 — b still off the line)', xp:20,
      check:s=>Math.abs(s.t-1)<.12&&s.rnorm>=1},
    {text:'Make <b style="color:#b9a8ff">b</b> nearly <b>perpendicular</b> to the line: scalar projection ≈ 0 (|b·â| ≤ 0.15, ‖b‖ ≥ 1)', xp:25,
      check:s=>Math.abs(s.scal)<=.15&&s.bnorm>=1},
    {text:'Put <b style="color:#b9a8ff">b</b> <b>onto</b> the line: residual ‖r‖ ≤ 0.15 with ‖b‖ ≥ 1 (nothing left over)', xp:20,
      check:s=>s.rnorm<=.15&&s.bnorm>=1},
  ]);
  const P=plane(L.ctx,L.W,L.H,54);
  function hit(c,pt){ return Math.hypot(c.x-P.sx(pt.x), c.y-P.sy(pt.y))<20; }
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const aa=a.x*a.x+a.y*a.y || 1e-9;
    const ab=a.x*b.x+a.y*b.y;
    const t=ab/aa;                       // scalar in the vector-projection formula
    const p={x:t*a.x, y:t*a.y};          // proj_a b
    const r={x:b.x-p.x, y:b.y-p.y};      // residual
    const anorm=Math.hypot(a.x,a.y)||1e-9;
    const scal=ab/anorm;                 // scalar projection b·â
    const rnorm=Math.hypot(r.x,r.y), bnorm=Math.hypot(b.x,b.y);
    // the infinite line through the origin along a (gold, dashed)
    const k=8/anorm;
    L.ctx.setLineDash([8,6]); L.ctx.lineWidth=1.5; L.ctx.strokeStyle='rgba(255,201,77,.5)';
    L.ctx.beginPath();
    L.ctx.moveTo(P.sx(-k*a.x),P.sy(-k*a.y)); L.ctx.lineTo(P.sx(k*a.x),P.sy(k*a.y)); L.ctx.stroke();
    L.ctx.setLineDash([]);
    // residual (b → proj): dashed cyan, plus a right-angle tick at the foot
    L.ctx.setLineDash([5,4]); L.ctx.lineWidth=2; L.ctx.strokeStyle='rgba(0,212,255,.75)';
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(b.x),P.sy(b.y)); L.ctx.lineTo(P.sx(p.x),P.sy(p.y)); L.ctx.stroke();
    L.ctx.setLineDash([]);
    if(rnorm>.25 && anorm>.25){         // little square marking the right angle at proj
      const ua={x:a.x/anorm,y:a.y/anorm}, ur={x:r.x/rnorm,y:r.y/rnorm}, sq=13;
      const c1={x:P.sx(p.x)+ua.x*sq, y:P.sy(p.y)-ua.y*sq};
      const c2={x:P.sx(p.x)+ur.x*sq, y:P.sy(p.y)-ur.y*sq};
      L.ctx.strokeStyle='rgba(255,255,255,.5)'; L.ctx.lineWidth=1.4;
      L.ctx.beginPath(); L.ctx.moveTo(c1.x,c1.y);
      L.ctx.lineTo(c1.x+ur.x*sq, c1.y-ur.y*sq); L.ctx.lineTo(c2.x,c2.y); L.ctx.stroke();
    }
    P.arrow(0,0,a.x,a.y,'rgba(255,201,77,.95)',3,'a');
    P.arrow(0,0,p.x,p.y,'#2dd4a0',5,'proj');
    P.arrow(0,0,b.x,b.y,'#7c5cff',4,'b');
    P.dot(a.x,a.y,7,'#ffe08a'); P.dot(b.x,b.y,7,'#b9a8ff'); P.dot(p.x,p.y,5,'#2dd4a0');
    const perp=Math.abs(a.x*r.x+a.y*r.y);      // ≈ 0 always — display the check
    L.readout.innerHTML='proj = (a·b / a·a)·a = ['+fmt2(p.x)+', '+fmt2(p.y)+']<br>'
      +'scalar proj b·â = '+fmt2(scal)+'<br>'
      +'residual r = b − proj, ‖r‖ = '+fmt2(rnorm)+'<br>'
      +'a·r = '+fmt2(perp)+' &nbsp;(⊥ check — always ~0)';
    m.update({t, scal, rnorm, bnorm});
  }
  L.canvas.addEventListener('pointerdown',e=>{
    const c=L.toCanvas(e);
    drag = hit(c,b) ? 'b' : hit(c,a) ? 'a' : 'b';   // default: grab b
    L.canvas.setPointerCapture(e.pointerId); move(e);
  });
  L.canvas.addEventListener('pointermove',move);
  L.canvas.addEventListener('pointerup',()=>drag=null);
  function move(e){ if(!drag)return; const c=L.toCanvas(e);
    const pt=drag==='a'?a:b; pt.x=Math.round(P.wx(c.x)*4)/4; pt.y=Math.round(P.wy(c.y)*4)/4; draw(); }
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<label><span>HOW TO PLAY</span></label><div style="font-size:13px;line-height:1.6;color:#cdd4f0">Drag <b style="color:#b9a8ff">b</b> (the vector) or <b style="color:#ffc94d">a</b> (the line\'s direction). The green <b>proj</b> is b\'s shadow on the gold line; the dashed cyan segment is the residual. Notice the little right-angle square — the residual is <b>always</b> perpendicular to the line, so a·r stays ~0 no matter how you drag.</div>';
  L.ctrl.prepend(note);
  draw();
};

/* ================== 2 · LEAST SQUARES = PROJECTION + NORMAL EQUATIONS ================== */

registerLesson({
  id:'la-leastsq', world:'la', order:21, emoji:'📉', title:'Least Squares = Projection',
  sub:'Ax = b has no solution? Project b onto what A can reach, then the normal equations pop out.',
  learn:`<p>Fitting a line to noisy points (the <em>pre-slope</em> problem) is really the equation Ax = b where each row of A is one data point and b is the stack of targets. With more equations than unknowns, no exact x exists — b lies <strong>outside</strong> the reachable set.</p>
  <p>What can A reach? Exactly its <strong>column space</strong>: every Ax is a combination of A's columns. So "solve Ax = b" becomes "find the Ax̂ <em>closest</em> to b" — and closest means <strong>project b onto col(A)</strong>. Last lesson's residual principle returns: the best x̂ is the one whose error b − Ax̂ is <strong>orthogonal to every column of A</strong>.</p>
  <p>Write that orthogonality down. "Aᵀ(error) = 0" for all columns is:</p>
  <div class="formula">$$A^T(b - A\\hat{x}) = 0 \\implies A^T A \\hat{x} = A^T b \\quad (\\text{the normal equations})$$</div>
  <p>That is the whole derivation — no calculus needed. The residual-is-orthogonal fact <em>is</em> the normal equations. Solve the small square system AᵀAx̂ = Aᵀb and you have the best fit. For a straight-line fit y = mx + c, A's columns are the x-values and a column of ones, and AᵀAx̂ = Aᵀb is exactly the slope/intercept formulas you used in pre-slope.</p>`,
  ml:`<b>Linear regression is least squares.</b> The normal equations AᵀAx̂ = Aᵀb are the closed-form solution, and the projection matrix P = A(AᵀA)⁻¹Aᵀ maps targets to predictions ŷ = Pb. When AᵀA is ill-conditioned you add λI (<b>ridge regression / Tikhonov</b>) — the same normal equations with a stabiliser. Even deep nets end this way: the final layer is often a least-squares/logistic readout, and the loss you minimise, ‖b − Ax‖², is the squared length of exactly the residual you\'re projecting away.`,
  deeper:[
   {title:'😵 Stuck? Why "orthogonal to the columns"?', body:'Imagine standing on a tilted floor (the column space) trying to touch a point b floating above it. The nearest spot on the floor is directly below b — the line from b to that spot is straight down, perpendicular to the floor. "Perpendicular to the floor" means perpendicular to every direction you can walk on it, i.e. to every column of A. Writing "Aᵀ times the straight-down error equals zero" gives AᵀAx̂ = Aᵀb.'},
   {title:'🚀 Go deeper: the pseudo-inverse & when AᵀA is singular', body:'If A\'s columns are independent, AᵀA is invertible and x̂ = (AᵀA)⁻¹Aᵀb. That matrix (AᵀA)⁻¹Aᵀ is the <b>Moore–Penrose pseudo-inverse</b> A⁺ — the "best-effort inverse" for non-square A. If columns are dependent (redundant features), AᵀA is singular; the SVD-based pseudo-inverse then picks the minimum-norm x̂. Numerically nobody forms AᵀA (it squares the condition number) — they use QR (next lesson) or SVD. But conceptually every path lands on the same projection.'}],
  interactive:'laleastsq',
  quiz:[
   {q:'Why does Ax = b usually have no exact solution when there are more data points than parameters?', opts:['b generally lies outside the column space of A','A is not square so it has no inverse — ever','The data is always noisy','Aᵀ does not exist'], a:0,
    tag:'why least squares exists', focus:'Ax can only ever equal a combination of A\'s columns; b outside col(A) means no exact x.',
    why:'Ax ranges over col(A), a low-dimensional slice of the target space. With many equations, b almost never lands exactly in that slice — so we settle for the closest reachable point instead.',
    wrong:{1:'Non-squareness alone is not the reason — even a tall A with b inside col(A) has an exact solution. The issue is specifically b lying OUTSIDE what A can reach.',
           2:'Noise makes it worse, but the geometry is the real cause: even perfectly clean over-determined systems fail unless b happens to sit in col(A).',
           3:'Aᵀ always exists (it is just the transpose). The obstacle is that no x reproduces b exactly, not a missing transpose.'}},
   {q:'The least-squares solution x̂ is characterised by which orthogonality condition?', opts:['Aᵀ(b − Ax̂) = 0 — the residual is orthogonal to every column of A','Ax̂ = b exactly','b − Ax̂ is parallel to every column of A','x̂ᵀx̂ = 0'], a:0,
    tag:'the normal equations', focus:'Best fit ⇔ residual orthogonal to col(A). Writing that out gives AᵀAx̂ = Aᵀb.',
    why:'The closest Ax̂ leaves an error with no component inside col(A). "Orthogonal to all columns" is exactly Aᵀ(b − Ax̂) = 0, which rearranges to AᵀAx̂ = Aᵀb.',
    wrong:{1:'Ax̂ = b exactly is the case that does NOT exist here (that is why we project). Least squares accepts a nonzero residual and only makes it orthogonal.',
           2:'Parallel is backwards. If the residual were parallel to a column, you could slide along that column and shrink it — so the true minimiser has the residual perpendicular instead.',
           3:'x̂ᵀx̂ = 0 forces x̂ = 0, which is not the fit unless b is orthogonal to everything. The condition is on the RESIDUAL, not on x̂.'}},
   {q:'For a straight-line fit y = mx + c, the design matrix A has columns…', opts:['the x-values and a column of ones','the y-values and the x-values','a single column of x-values only','the residuals'], a:0,
    tag:'design matrix for a line', focus:'y = mx + c = m·(x) + c·(1): the unknowns m,c multiply the x-column and the all-ones column.',
    why:'Each prediction is m·xᵢ + c·1, a combination of two columns: the xᵢ values and a constant column of ones (which carries the intercept c). Solving AᵀAx̂ = Aᵀb gives exactly the pre-slope slope/intercept.',
    wrong:{1:'The y-values are the TARGET b, not columns of A. A holds only the inputs you combine with the unknown m and c.',
           2:'A single x-column fits y = mx through the origin — it has no way to represent a nonzero intercept c. The ones-column is what carries c.',
           3:'Residuals are the leftover error b − Ax̂, computed AFTER solving — they are not inputs to the design matrix.'}},
   {q:'When AᵀA is nearly singular (redundant/collinear features), a common fix is…', opts:['ridge regression: solve (AᵀA + λI)x̂ = Aᵀb','delete b','use a larger learning rate','transpose A twice'], a:0,
    tag:'ridge / regularisation', focus:'Adding λI to AᵀA makes it invertible and stable — Tikhonov / ridge regression.',
    why:'λI nudges every eigenvalue of AᵀA up by λ, curing the near-singularity and shrinking the solution toward zero. It is the normal equations with a stabiliser — ridge / Tikhonov regularisation.',
    wrong:{1:'Deleting b throws away the targets entirely — there is nothing left to fit. The instability is in AᵀA, and that is what λI repairs.',
           2:'Learning rate is a gradient-descent knob; the normal equations are a direct solve with no step size. It cannot fix a singular matrix.',
           3:'Transposing A twice returns A unchanged — a no-op that does nothing to the conditioning of AᵀA.'}},
  ],
});
INTERACTIVES.laleastsq = function(stage, api){
  const L=makeLab(stage,{h:470});
  // fixed noisy points; user drags a line (slope m, intercept c) and watches SSE.
  const pts=[{x:-3,y:-2.2},{x:-2,y:-1.9},{x:-1,y:-.4},{x:0,y:.3},{x:1,y:1.4},{x:2,y:1.7},{x:3,y:2.9}];
  let m=0.4, c=1.6, showFit=false;                // showFit: overlay the exact normal-equations line
  // closed-form least-squares line via the normal equations AᵀAx̂ = Aᵀb
  function bestLine(){
    const n=pts.length; let Sx=0,Sy=0,Sxx=0,Sxy=0;
    for(const p of pts){ Sx+=p.x; Sy+=p.y; Sxx+=p.x*p.x; Sxy+=p.x*p.y; }
    const det=n*Sxx-Sx*Sx;                        // = det(AᵀA)
    const mb=(n*Sxy-Sx*Sy)/det, cb=(Sy-mb*Sx)/n;
    return {m:mb,c:cb};
  }
  const best=bestLine();
  function sse(mm,cc){ let s=0; for(const p of pts){ const e=p.y-(mm*p.x+cc); s+=e*e; } return s; }
  const bestSSE=sse(best.m,best.c);
  const mis=api.missions([
    {text:'Drag the line to shrink the total squared error <b>SSE ≤ 3</b> (watch the residual sticks shrink)', xp:20,
      check:s=>s.sse<=3},
    {text:'Beat it down to within <b>10%</b> of the true least-squares minimum', xp:25,
      check:s=>s.sse<=bestSSE*1.1},
    {text:'Toggle <b>Show best fit</b> and land your line on it: slope and intercept both within 0.1', xp:20,
      check:s=>Math.abs(s.m-best.m)<.1&&Math.abs(s.c-best.c)<.1},
  ]);
  const P=plane(L.ctx,L.W,L.H,46);
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    // the fitted line (draggable)
    L.ctx.strokeStyle='#7c5cff'; L.ctx.lineWidth=3;
    L.ctx.beginPath();
    L.ctx.moveTo(P.sx(-7),P.sy(m*-7+c)); L.ctx.lineTo(P.sx(7),P.sy(m*7+c)); L.ctx.stroke();
    if(showFit){                                  // exact least-squares line (green, dashed)
      L.ctx.setLineDash([7,5]); L.ctx.lineWidth=2.5; L.ctx.strokeStyle='rgba(45,212,160,.9)';
      L.ctx.beginPath();
      L.ctx.moveTo(P.sx(-7),P.sy(best.m*-7+best.c)); L.ctx.lineTo(P.sx(7),P.sy(best.m*7+best.c)); L.ctx.stroke();
      L.ctx.setLineDash([]);
    }
    // residual sticks (vertical error to the draggable line) + points
    for(const p of pts){
      const yhat=m*p.x+c;
      L.ctx.strokeStyle='rgba(0,212,255,.55)'; L.ctx.lineWidth=2;
      L.ctx.beginPath(); L.ctx.moveTo(P.sx(p.x),P.sy(p.y)); L.ctx.lineTo(P.sx(p.x),P.sy(yhat)); L.ctx.stroke();
      P.dot(p.x,p.y,6,'#ffc94d');
    }
    const s=sse(m,c);
    L.readout.innerHTML='fit: y = '+fmt2(m)+'x + '+fmt2(c)+'<br>'
      +'SSE = Σ residual² = '+fmt2(s)+'<br>'
      +'least-squares min (AᵀAx̂ = Aᵀb): '+fmt2(bestSSE)+'<br>'
      +(showFit?'best: y = '+fmt2(best.m)+'x + '+fmt2(best.c)+' (green dashed)':'toggle "Show best fit" to compare');
    mis.update({sse:s, m, c});
  }
  slider(L.ctrl,'m — slope',-3,3,0.05,m,fmt2,v=>{m=v;draw();});
  slider(L.ctrl,'c — intercept',-4,4,0.05,c,fmt2,v=>{c=v;draw();});
  chips(L.ctrl,'BEST FIT',['Show best fit'],(i,btn)=>{ showFit=!showFit; btn.classList.toggle('on',showFit); draw(); });
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The cyan sticks are the residuals — the vertical gaps least squares squares and sums. Minimising SSE by hand traces out what the normal equations AᵀAx̂ = Aᵀb solve in one shot. Each residual is a coordinate of b − Ax̂; at the minimum that whole vector is orthogonal to col(A).</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== 3 · GRAM–SCHMIDT / ORTHONORMAL BASES (QR INTUITION) ================== */

registerLesson({
  id:'la-gramschmidt', world:'la', order:22, emoji:'🧹', title:'Gram–Schmidt: Straighten a Basis',
  sub:'Turn any tilted basis into a clean perpendicular one — by subtracting off projections.',
  learn:`<p>Orthonormal bases (perpendicular, unit-length) are the nicest coordinate systems: projections are just dot products, no matrix inverse in sight. <strong>Gram–Schmidt</strong> manufactures one from any basis using only the projection you already know.</p>
  <p>Given vectors v₁, v₂, … walk through them and, at each step, <em>subtract off the part that overlaps everything you've already straightened</em>:</p>
  <div class="formula">$$\\begin{aligned} u_1 &= v_1 \\\\ u_2 &= v_2 - \\text{proj}_{u_1} v_2 \\\\ u_3 &= v_3 - \\text{proj}_{u_1} v_3 - \\text{proj}_{u_2} v_3 \\end{aligned}$$</div>
  <p>Each subtraction removes the component along a direction you've already claimed — exactly the residual from lesson 1. What's left is orthogonal to all of them by construction. Normalise each (divide by its length) and you get an <strong>orthonormal</strong> set q₁, q₂, ….</p>
  <p>This is the intuition behind <strong>QR decomposition</strong>: A = QR, where Q holds the orthonormal vectors Gram–Schmidt produced and R is upper-triangular, bookkeeping how much of each earlier direction you subtracted. You don't need the full algorithm — just hold onto the picture: <em>orthogonalise by repeatedly projecting and subtracting.</em></p>`,
  ml:`Orthonormal bases keep numbers well-behaved: an orthogonal matrix Q has QᵀQ = I, so it rotates without stretching — lengths and angles survive, gradients don\'t blow up or vanish. That is why <b>QR</b> (not the normal equations) is the stable way to solve least squares — it sidesteps the ill-conditioned AᵀA. <b>Orthogonal weight initialisation</b> and re-orthogonalisation in RNNs use the same idea to fight exploding/vanishing gradients; QR also drives numerical eigenvalue solvers.`,
  deeper:[
   {title:'😵 Stuck? The "declutter" view', body:'You are building a set of reference directions and want them to not overlap. Take the next raw vector, ask "how much of you is already covered by the directions I have?", and delete that much. What remains points somewhere genuinely new — perpendicular to all the old ones. Repeat. It is decluttering: each new axis carries only information the previous axes did not.'},
   {title:'🚀 Go deeper: why R is upper-triangular', body:'When you build uₖ you subtract projections onto u₁…u_{k−1} only — never onto later vectors. So vₖ is a combination of q₁…qₖ and nothing beyond. Stacking "vₖ in terms of q₁…qₖ" as columns gives A = QR with R upper-triangular: entry R_{ik} is how much of qᵢ lives in vₖ. Classical Gram–Schmidt is numerically shaky (rounding erodes orthogonality); the <b>modified</b> variant and Householder reflections are what real QR routines use — same result, better arithmetic.'}],
  interactive:'lagramschmidt',
  quiz:[
   {q:'In Gram–Schmidt, u₂ = v₂ − proj<sub>u₁</sub>v₂. Why subtract the projection?', opts:['To remove v₂\'s component along u₁, leaving a part orthogonal to u₁','To make u₂ longer than v₂','To make u₂ parallel to u₁','To normalise u₂ to length 1'], a:0,
    tag:'orthogonalisation step', focus:'Subtracting the projection leaves the residual, which is orthogonal to u₁ by the lesson-1 principle.',
    why:'proj_{u₁}v₂ is v₂\'s shadow on u₁. Removing it leaves the residual — the part of v₂ with no overlap along u₁ — which is orthogonal to u₁ exactly as in lesson 1.',
    wrong:{1:'Subtracting a component can only shorten or keep the length (Pythagoras), never lengthen it. The goal is orthogonality, not size.',
           2:'The opposite: the leftover is PERPENDICULAR to u₁, not parallel. If it were parallel we would have gained no new direction.',
           3:'Normalising is a SEPARATE later step (divide by ‖u₂‖). Subtracting the projection is about direction — making u₂ ⊥ u₁ — not about length.'}},
   {q:'After Gram–Schmidt + normalising, the vectors q₁, q₂, … satisfy…', opts:['qᵢ·qⱼ = 0 for i ≠ j and ‖qᵢ‖ = 1 — orthonormal','they are all parallel','they all have length equal to the original vectors','qᵢ·qⱼ = 1 for every i, j'], a:0,
    tag:'orthonormal set', focus:'Orthonormal = mutually perpendicular (dot 0) AND unit length (dot with self = 1).',
    why:'Orthogonalising makes distinct pairs perpendicular (dot 0); normalising makes each length 1 (dot with itself 1). Together: an orthonormal set, the columns of an orthogonal Q.',
    wrong:{1:'Parallel is the exact thing Gram–Schmidt destroys — it drives the vectors apart to mutually perpendicular, not together.',
           2:'Normalising rescales every vector to length 1, deliberately discarding the original lengths.',
           3:'qᵢ·qⱼ = 1 for ALL pairs (including i ≠ j) would make them identical. Off-diagonal dots are 0; only the self-dots are 1.'}},
   {q:'In QR = A, the matrix R comes out upper-triangular because…', opts:['each vₖ is built from q₁…qₖ only, never from later q\'s','R is always the identity','Q is lower-triangular','A must be symmetric'], a:0,
    tag:'why R is upper-triangular', focus:'uₖ subtracts projections onto earlier vectors only, so vₖ uses q₁…qₖ and nothing after.',
    why:'Gram–Schmidt processes vectors in order, subtracting only onto already-built directions. So vₖ is a combination of q₁…qₖ — its coordinates beyond row k are zero, which is exactly an upper-triangular R.',
    wrong:{1:'If R were the identity, A would already equal Q — i.e. A would already be orthonormal. R records the (generally nonzero) overlaps removed along the way.',
           2:'Q is not triangular at all; it is orthonormal (QᵀQ = I). The triangular structure lives entirely in R.',
           3:'QR works for ANY matrix with independent columns — symmetry is never required. The triangularity comes from the left-to-right order of the algorithm.'}},
   {q:'Why prefer QR over the normal equations AᵀAx̂ = Aᵀb for least squares in practice?', opts:['Forming AᵀA squares the condition number; QR avoids it and stays numerically stable','QR is the only method that gives an exact answer','AᵀA does not exist for tall matrices','QR needs no computation'], a:0,
    tag:'QR vs normal equations', focus:'AᵀA squares conditioning; orthonormal Q (QᵀQ=I) keeps the solve well-conditioned.',
    why:'Building AᵀA squares its condition number, amplifying round-off. QR works with an orthonormal Q (which preserves lengths and conditioning), so it solves the same least-squares problem far more stably.',
    wrong:{1:'Both are exact in perfect arithmetic — they solve the identical problem. The difference is numerical stability under finite precision, not exactness.',
           2:'AᵀA is perfectly well-defined for a tall A (it is n×n). The objection is its worsened conditioning, not its existence.',
           3:'QR is real work (orthogonalising every column). Its payoff is stability, not zero cost.'}},
  ],
});
INTERACTIVES.lagramschmidt = function(stage, api){
  const L=makeLab(stage,{h:470});
  const v1={x:3,y:0.6}, v2={x:1.2,y:2.6};        // two draggable input vectors
  let drag=null, normalise=false;                 // toggle: show unit q's vs raw orthogonal u's
  function hit(c,pt,P){ return Math.hypot(c.x-P.sx(pt.x), c.y-P.sy(pt.y))<20; }
  const P=plane(L.ctx,L.W,L.H,50);
  const mis=api.missions([
    {text:'Drag <b style="color:#7c5cff">v₂</b> so the raw inputs are far from perpendicular (|cos∠(v₁,v₂)| ≥ 0.5)', xp:15,
      check:s=>Math.abs(s.cosRaw)>=.5},
    {text:'Read off the result: after Gram–Schmidt, u₂ is orthogonal to u₁ (u₁·u₂ ≈ 0 — check the readout)', xp:20,
      check:s=>Math.abs(s.dotU)<=.05&&s.u2norm>=.3},
    {text:'Toggle <b>Normalise</b> and confirm q₁, q₂ both reach unit length (‖q₁‖ = ‖q₂‖ = 1)', xp:20,
      check:s=>s.normalise&&s.u2norm>=.3},
  ]);
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    // Gram-Schmidt: u1 = v1 ; u2 = v2 - proj_{u1} v2
    const u1={x:v1.x,y:v1.y};
    const d11=u1.x*u1.x+u1.y*u1.y || 1e-9;
    const t=(u1.x*v2.x+u1.y*v2.y)/d11;
    const proj={x:t*u1.x, y:t*u1.y};
    const u2={x:v2.x-proj.x, y:v2.y-proj.y};
    const n1=Math.hypot(u1.x,u1.y)||1e-9, n2=Math.hypot(u2.x,u2.y)||1e-9;
    const nv1=Math.hypot(v1.x,v1.y)||1e-9, nv2=Math.hypot(v2.x,v2.y)||1e-9;
    const cosRaw=(v1.x*v2.x+v1.y*v2.y)/(nv1*nv2);
    const q1={x:u1.x/n1,y:u1.y/n1}, q2={x:u2.x/n2,y:u2.y/n2};
    const showU1 = normalise?q1:u1, showU2 = normalise?q2:u2;
    // faint raw inputs
    P.arrow(0,0,v1.x,v1.y,'rgba(124,92,255,.35)',3,'v₁');
    P.arrow(0,0,v2.x,v2.y,'rgba(124,92,255,.9)',3.5,'v₂');
    // the projection of v2 onto u1, and the subtraction (dashed) that yields u2
    P.arrow(0,0,proj.x,proj.y,'rgba(255,201,77,.65)',2.5);
    L.ctx.setLineDash([5,4]); L.ctx.lineWidth=2; L.ctx.strokeStyle='rgba(0,212,255,.6)';
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(v2.x),P.sy(v2.y)); L.ctx.lineTo(P.sx(proj.x),P.sy(proj.y)); L.ctx.stroke();
    L.ctx.setLineDash([]);
    // orthogonalised outputs
    P.arrow(0,0,showU1.x,showU1.y,'#ffc94d',4,normalise?'q₁':'u₁');
    P.arrow(0,0,showU2.x,showU2.y,'#2dd4a0',4,normalise?'q₂':'u₂');
    P.dot(v1.x,v1.y,6,'#b9a8ff'); P.dot(v2.x,v2.y,6,'#b9a8ff');
    const dotU=u1.x*u2.x+u1.y*u2.y;               // ≈ 0 always
    L.readout.innerHTML='u₁ = v₁ ; u₂ = v₂ − proj<sub>u₁</sub>v₂<br>'
      +'raw cos∠(v₁,v₂) = '+fmt2(cosRaw)+'<br>'
      +'u₁·u₂ = '+fmt2(dotU)+' &nbsp;(⊥ check — always ~0)<br>'
      +(normalise?'‖q₁‖ = '+fmt2(Math.hypot(q1.x,q1.y))+', ‖q₂‖ = '+fmt2(Math.hypot(q2.x,q2.y))+' (unit)'
                 :'‖u₁‖ = '+fmt2(n1)+', ‖u₂‖ = '+fmt2(n2)+' (toggle Normalise for unit length)');
    mis.update({cosRaw, dotU, u2norm:n2, normalise});
  }
  L.canvas.addEventListener('pointerdown',e=>{
    const c=L.toCanvas(e);
    drag = hit(c,v2,P) ? 'v2' : hit(c,v1,P) ? 'v1' : 'v2';
    L.canvas.setPointerCapture(e.pointerId); move(e);
  });
  L.canvas.addEventListener('pointermove',move);
  L.canvas.addEventListener('pointerup',()=>drag=null);
  function move(e){ if(!drag)return; const c=L.toCanvas(e);
    const pt=drag==='v1'?v1:v2; pt.x=Math.round(P.wx(c.x)*4)/4; pt.y=Math.round(P.wy(c.y)*4)/4; draw(); }
  chips(L.ctrl,'LENGTH',['Normalise (unit q\'s)'],(i,btn)=>{ normalise=!normalise; btn.classList.toggle('on',normalise); draw(); });
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<label><span>HOW TO PLAY</span></label><div style="font-size:13px;line-height:1.6;color:#cdd4f0">Drag the purple inputs <b style="color:#b9a8ff">v₁, v₂</b>. Gold <b>u₁</b> is just v₁; green <b>u₂</b> is v₂ minus its shadow on u₁ (the dashed cyan subtraction). No matter how you tilt the inputs, u₁·u₂ stays ~0 — that is orthogonalisation. Toggle <b>Normalise</b> to shrink them to the unit q₁, q₂ of QR.</div>';
  L.ctrl.prepend(note);
  draw();
};
