/* ================================================================
   WORLD 4 — ML, KERNELS & SVM GEOMETRY.
   Two lessons that close the "kernels & the feature-map trick;
   SVM geometry" gap named in CURRICULUM-REVIEW.md / ROADMAP.md (P2):

     ml-margin  (order 43) — Max-Margin Classification: the widest
        street. Hard margin (find the max-margin line, support
        vectors, non-support invariance) and soft margin (the C
        knob, hinge loss, and a side-by-side with logistic
        regression's boundary).
     ml-kernels (order 44) — The Kernel Trick: separate the
        inseparable. Lifting rings onto a paraboloid, the RBF
        kernel's bandwidth (overfit vs smooth), and a
        pick-the-right-kernel challenge (linear / rings / XOR).

   Cashes in ml-logreg (the other linear classifier), c-lagrange
   (the constrained optimum behind the dual) and la-posdef (Mercer /
   PSD kernels). Same registries + schema as every other world; every
   interactive lives behind a render function; no top-level DOM.
   ================================================================ */
import { INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, slider, chips, plane, clearBg, fmt2 } from '../engine.js';

const FONT = () => getComputedStyle(document.body).fontFamily;
function note(parent, html){
  const d = document.createElement('div'); d.className = 'ctrl';
  d.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">' + html + '</div>';
  parent.appendChild(d); return d;
}
const sigmoid = z => 1/(1+Math.exp(-z));

/* ================================================================
   LESSON 1 — ml-margin: Max-Margin Classification
   ================================================================ */
registerLesson({
  id:'ml-margin', world:'ml', order:43, emoji:'🛣️', title:'Max-Margin Classification',
  sub:'Many lines separate two classes; the support-vector machine picks the one that leaves the widest empty street. The points touching the curb are the only ones that matter.',
  learn:`<p>When two classes are separable, there are <em>infinitely many</em> lines that split them. Logistic regression (see <b>ml-logreg</b>) picks one by maximizing label likelihood. A <strong>support-vector machine (SVM)</strong> picks by a purely geometric rule: draw the widest possible <strong>street</strong> (margin band) between the classes, and put the boundary down its center. Widest street = most robust to noise.</p>
  <p>Write the boundary as \\(w\\cdot x + b = 0\\). If we <em>fix the scale</em> so the closest points on each side satisfy \\(y_i(w\\cdot x_i+b)=1\\) (the <strong>canonical form</strong>, with labels \\(y_i\\in\\{-1,+1\\}\\)), then the distance from the boundary to those closest points is \\(1/\\lVert w\\rVert\\), and the full street width is:</p>
  <div class="formula">$$\\text{margin width} = \\frac{2}{\\lVert w\\rVert}$$</div>
  <p>Maximizing that width is the same as <em>minimizing</em> \\(\\lVert w\\rVert\\). So the hard-margin SVM is the constrained optimization problem:</p>
  <div class="formula">$$\\min_{w,b}\\;\\tfrac12\\lVert w\\rVert^2 \\qquad \\text{subject to}\\qquad y_i\\,(w\\cdot x_i + b)\\ge 1\\ \\text{ for every } i.$$</div>
  <p>The magic: at the optimum only a handful of points sit exactly on the curb (\\(y_i(w\\cdot x_i+b)=1\\)). Those are the <strong>support vectors</strong>. Every other point is strictly inside its own territory and could be moved around freely without changing the answer — the boundary depends <em>only</em> on the support vectors. That is the defining feature of the SVM and the lab lets you feel it directly.</p>
  <p><strong>When the classes overlap</strong>, no line separates them and the hard constraints are impossible. We relax them with a <strong>hinge loss</strong> that charges for each point that lands inside the street or on the wrong side:</p>
  <div class="formula">$$\\min_{w,b}\\;\\tfrac12\\lVert w\\rVert^2 \\;+\\; C\\sum_i \\max\\!\\big(0,\\;1 - y_i(w\\cdot x_i + b)\\big)$$</div>
  <p>The knob \\(C\\) trades a wide street against violations: small \\(C\\) favors a broad margin and tolerates points inside it; large \\(C\\) insists on classifying every training point, shrinking the street to squeeze past outliers (and risking overfitting). This is the <strong>soft-margin</strong> SVM, and the second lab lets you sweep \\(C\\) and watch the tradeoff — with logistic regression's boundary drawn alongside for contrast.</p>`,
  ml:`The SVM was <b>the</b> dominant classifier of the 2000s and is still a first reach for small, clean, high-dimensional datasets (text, bioinformatics). Two ideas from it are permanent fixtures of modern ML. First, the <b>hinge loss</b> is a margin-maximizing cousin of cross-entropy and reappears whenever people want confident separation, not just calibrated probabilities. Second, the observation that the solution depends only on inner products among the support vectors is exactly what opens the door to the <b>kernel trick</b> (next lesson) — the machinery behind kernelized methods and a direct ancestor of how attention scores similarity. "Maximize the margin" is also the intuition behind <b>large-margin</b> and contrastive objectives in deep learning.`,
  deeper:[
   {title:'😵 Stuck? Why the WIDEST street?', body:'Any separating line has zero training error, so training accuracy cannot choose between them. The widest margin is the choice that generalizes best: it leaves the most room before a slightly-shifted test point crosses to the wrong side. Formally, a large margin bounds the classifier\'s capacity (VC dimension / Rademacher complexity), which bounds the gap between training and test error. Vapnik built statistical learning theory around exactly this. (Hastie, Tibshirani & Friedman, <i>The Elements of Statistical Learning</i>, 2e, ch. 12.)'},
   {title:'🚀 Go deeper: the dual & why only support vectors matter', body:'Introduce a Lagrange multiplier \\(\\alpha_i\\ge 0\\) for each constraint \\(y_i(w\\cdot x_i+b)\\ge1\\) (this is <b>c-lagrange</b> in action). Solving the dual gives \\(w=\\sum_i \\alpha_i y_i x_i\\), and the KKT conditions force \\(\\alpha_i=0\\) for every point that is strictly outside the margin. Only the support vectors get \\(\\alpha_i>0\\), so only they enter \\(w\\). That is the algebra behind "move a non-support point and nothing changes" — its \\(\\alpha_i\\) was already zero. (Burges, <i>A Tutorial on Support Vector Machines for Pattern Recognition</i>, 1998, §3.)'},
   {title:'🚀 Go deeper: hinge vs logistic loss', body:'Both are convex surrogates for the 0/1 error, plotted against the margin \\(y\\,f(x)\\). Logistic loss \\(\\ln(1+e^{-yf})\\) is smooth and never exactly zero, so every point keeps nudging the boundary — you get calibrated probabilities. Hinge loss \\(\\max(0,1-yf)\\) is exactly zero once a point clears the margin, so confidently-correct points stop contributing entirely — that sparsity is why the SVM depends only on support vectors, but it also means the SVM does not natively output probabilities. (ESL 2e, §12.3.)'},
   {title:'🚀 Go deeper: C is inverse regularization', body:'Rewrite the soft-margin objective as \\(\\sum_i \\text{hinge}_i + \\tfrac{1}{2C}\\lVert w\\rVert^2\\): the \\(\\tfrac12\\lVert w\\rVert^2\\) term is an L2 penalty, and \\(1/C\\) is its strength. So large \\(C\\) = weak regularization = fit the data hard = narrow margin; small \\(C\\) = strong regularization = wide margin, more violations. It is the same L2-as-prior story from <b>ml-regularize</b>, wearing SVM clothing. (Bishop, <i>Pattern Recognition and Machine Learning</i>, 2006, §7.1.)'}],
  labs:[
   {key:'street', title:'The widest street', interactive:'mlmarginStreet',
    intro:`Rotate and slide the boundary to open the widest empty street between the classes. The points that end up touching the curb are the <b>support vectors</b> — and dragging a point that is <em>not</em> one of them will show you they are the only points that matter.`},
   {key:'soft', title:'Soft margin & the C knob', interactive:'mlmarginSoft',
    intro:`These classes overlap, so no line separates them. Sweep <b>C</b> to trade street-width against violations and read the hinge loss. The dashed line is logistic regression on the same data — watch how the two objectives disagree.`},
  ],
  quiz:[
   {q:'Several straight lines perfectly separate two classes. What extra principle does a support-vector machine use to choose one?', opts:['Pick the line that maximizes the margin — the width of the empty street between the classes','Pick the line closest to the class means','Pick the line with the largest slope','Pick whichever line the optimizer finds first'], a:0,
    tag:'the widest street', focus:'Among all separating hyperplanes the SVM chooses the maximum-margin one — the boundary centered in the widest gap.',
    why:'Training accuracy is identical for every separating line, so the SVM adds a geometric criterion: maximize the margin, the width of the gap it can carve between the classes.',
    wrong:{1:'Nearest-to-the-means is a different rule (nearest-centroid); it ignores the gap and can sit closer to one class than the other.',2:'Slope is not a meaningful selection criterion and depends on the arbitrary coordinate axes.',3:'The SVM optimum is a well-defined unique line, not "whatever comes out first" — the margin criterion pins it down.'}},
   {q:'In canonical form the closest points satisfy \\(y_i(w\\cdot x_i+b)=1\\). The full width of the margin street is:', opts:['\\(2/\\lVert w\\rVert\\)','\\(\\lVert w\\rVert / 2\\)','\\(\\lVert w\\rVert^2\\)','\\(2\\,\\lVert w\\rVert\\)'], a:0,
    tag:'margin width formula', focus:'Distance boundary-to-curb is 1/‖w‖; the street spans both sides, so width = 2/‖w‖. Maximizing it minimizes ‖w‖.',
    why:'Each curb is a distance 1/‖w‖ from the center line, and the street covers both sides, so its total width is 2/‖w‖. This is why maximizing the margin means minimizing ‖w‖.',
    wrong:{1:'This inverts and halves the correct expression; the width grows as ‖w‖ shrinks, so ‖w‖ must be in the denominator.',2:'‖w‖² is the quantity we minimize, not the geometric width.',3:'Width is inversely proportional to ‖w‖, not directly — a larger ‖w‖ gives a narrower street.'}},
   {q:'What is a support vector?', opts:['A training point that lies exactly on the margin (or inside/across it) and pins the boundary in place','The vector w that defines the boundary direction','The single point nearest the origin','Any point that is correctly classified with high confidence'], a:0,
    tag:'support vectors', focus:'Support vectors are the points with a nonzero dual weight — those touching or violating the margin. They alone determine w and b.',
    why:'Support vectors are the points that sit on the margin curb (or inside/across it). At the optimum only they carry nonzero Lagrange multipliers, so they alone fix the boundary.',
    wrong:{1:'w is the weight vector, not a data point; it is built FROM the support vectors, but it is not itself one.',2:'Distance to the origin is irrelevant — what matters is distance to the boundary.',3:'Confidently-correct points are far from the margin; those are exactly the NON-support points that can be moved freely.'}},
   {q:'You drag a point that is deep inside its own class region (not a support vector) to a new spot, still deep inside. The max-margin boundary…', opts:['Does not move at all — non-support points have zero influence on it','Rotates to follow the moved point','Shifts halfway toward the new location','Always moves, since every point contributes'], a:0,
    tag:'non-support invariance', focus:'Only support vectors (nonzero α) define w and b. A non-support point has α=0, so moving it within its region changes nothing.',
    why:'The boundary is w = Σ αᵢ yᵢ xᵢ, and a non-support point has αᵢ = 0. Moving a zero-weight point leaves w and b untouched — the defining property of the SVM.',
    wrong:{1:'Only support vectors steer the boundary; a deep-interior point exerts no pull, so there is nothing to follow.',2:'A zero-weight point contributes nothing to the weighted sum that defines the boundary.',3:'Not every point contributes — that is precisely what distinguishes the SVM from, say, logistic regression, where every point nudges the boundary.'}},
   {q:'The hinge loss for one point is \\(\\max(0,\\,1 - y\\,f(x))\\) where \\(f(x)=w\\cdot x+b\\). For a point that is correctly classified and well outside the margin, the hinge loss is…', opts:['Exactly zero — it clears the margin, so it stops contributing','A small positive number','Negative','Always 1'], a:0,
    tag:'hinge loss', focus:'Hinge loss is 0 once y·f(x) ≥ 1. Points past the margin contribute nothing — the source of SVM sparsity.',
    why:'If y·f(x) ≥ 1 then 1 − y·f(x) ≤ 0 and the max clamps it to 0. Points comfortably past the margin add nothing to the loss, which is why so few points end up mattering.',
    wrong:{1:'It is not small-but-positive; the max with 0 makes it exactly zero past the margin.',2:'A max with 0 can never be negative.',3:'Hinge loss equals 1 only right at the boundary (y·f = 0); past the margin it is 0, and deep in the wrong side it grows without bound.'}},
   {q:'You raise C in the soft-margin SVM from small to large. The margin street tends to…', opts:['Narrow, because the model now pays heavily for each point inside it','Widen, because C rewards big margins','Stay fixed — C only affects speed','Disappear entirely regardless of the data'], a:0,
    tag:'soft-margin C', focus:'C weights the hinge penalty. Large C = violations are expensive = shrink the street to avoid them (weak regularization).',
    why:'C multiplies the hinge penalty, so a large C makes every in-street or misclassified point very costly; the optimizer shrinks the margin to reduce those violations, fitting the data harder.',
    wrong:{1:'It is the opposite: large C punishes violations, so the street narrows, not widens.',2:'C is a modeling tradeoff in the objective, not an optimizer speed setting.',3:'The street narrows but does not vanish; even large C keeps a finite margin unless forced otherwise by the data.'}},
   {q:'How does a soft-margin SVM differ from logistic regression on the same separable-ish data?', opts:['The SVM maximizes the margin and ignores points past it; logistic regression uses every point and outputs calibrated probabilities','They are the same model with different names','The SVM outputs probabilities; logistic regression does not','Logistic regression maximizes the margin; the SVM does not'], a:0,
    tag:'svm vs logistic regression', focus:'Hinge loss zeroes out non-margin points (sparse, margin-focused); logistic loss never zeroes, giving probabilities and full-data influence.',
    why:'Hinge loss goes flat past the margin, so the SVM depends only on support vectors and targets separation. Logistic loss never reaches zero, so every point contributes and you get probabilities.',
    wrong:{1:'They optimize different losses (hinge vs logistic) and generally give different boundaries.',2:'It is the reverse: logistic regression is the one that naturally outputs probabilities; the plain SVM does not.',3:'Max-margin is the SVM objective; logistic regression maximizes likelihood instead.'}},
   {q:'A trained hard-margin SVM has \\(\\lVert w\\rVert = 0.5\\) in canonical form. What is the full width of its margin street?', type:'numeric', answer:4, tol:0.05, unit:'',
    tag:'margin width numeric', focus:'Width = 2/‖w‖ = 2/0.5 = 4. The width is the reciprocal-scaled reach of both curbs.',
    hint:'Use width = 2 / ‖w‖ with ‖w‖ = 0.5.',
    why:'Width = 2/‖w‖ = 2/0.5 = 4. A smaller ‖w‖ means a wider street.'},
   {q:'Arrange the logic that derives the hard-margin SVM, from setup to conclusion.', type:'order',
    steps:[
      'Fix the scale so the closest points satisfy \\(y_i(w\\cdot x_i+b)=1\\) (canonical form).',
      'The distance from the boundary to those closest points is \\(1/\\lVert w\\rVert\\), so the street width is \\(2/\\lVert w\\rVert\\).',
      'Maximizing the width \\(2/\\lVert w\\rVert\\) is the same as minimizing \\(\\tfrac12\\lVert w\\rVert^2\\).',
      'Solve that convex problem subject to \\(y_i(w\\cdot x_i+b)\\ge 1\\); the points where the constraint is tight are the support vectors.'],
    tag:'max-margin derivation', focus:'Canonical scaling → width 2/‖w‖ → minimize ½‖w‖² → constrained convex solve → support vectors are the active constraints.',
    why:'You fix the scale, read off the width as 2/‖w‖, convert "widest margin" into "minimize ½‖w‖²", then solve the constrained convex problem — whose tight constraints are the support vectors.'},
  ],
});

/* ---- Lab 1a: the widest street + non-support invariance ---- */
INTERACTIVES.mlmarginStreet = function(stage, api){
  const L = makeLab(stage);
  const neg = [[-3.2,1.6],[-2.7,-0.5],[-2.1,0.9],[-2.5,2.1],[-1.7,-1.3],[-2.9,-1.7],[-1.5,0.2]];
  const pos = [[2.9,-1.1],[2.4,0.7],[1.9,-0.8],[2.7,1.9],[1.6,1.0],[3.3,0.1]];
  const DRAG = pos.length-1;                    // the outer point [3.3,0.1] is draggable
  let thetaDeg = -30, b = 1.2;                   // user's line (deliberately mediocre to start)

  // Best achievable street width for the current point positions. For a unit
  // normal w(theta), projecting all points, the widest separating street is
  //   min(pos projections) - max(neg projections),  maximized over theta.
  function best(){
    let bw = -1e9, bt = 0, bb = 0;
    for(let d=-45; d<=45; d++){
      const th=d*Math.PI/180, wx=Math.cos(th), wy=Math.sin(th);
      const pn = neg.map(p=>wx*p[0]+wy*p[1]);
      const pp = pos.map(p=>wx*p[0]+wy*p[1]);
      const width = Math.min(...pp) - Math.max(...pn);
      if(width>bw){ bw=width; bt=d; bb=-(Math.min(...pp)+Math.max(...pn))/2; }
    }
    return {width:bw, theta:bt, b:bb};
  }

  api.predict({
    prompt:'The gold point on the far right is a NON-support point (deep in its class). Once you find the widest street, you will drag it around. <b>Predict:</b> what happens to the maximum street width as you move it (while it stays deep in its region)?',
    choices:['It stays the same — only the support vectors set the margin','It grows as the point moves outward','It shrinks toward zero','It flips the boundary to the other side'],
    answer:0,
    reveal:'The max-margin street is fixed by the two or three <b>support vectors</b> touching its curbs. A deep-interior point has dual weight \\(\\alpha=0\\); moving it changes nothing — until you drag it into the street, at which point it BECOMES a support vector and the width readout drops. Try both.',
  });

  const m = api.missions([
    {text:'<b>Separate</b> the two classes — get every point on its correct side of the line', xp:15,
     check:s=>s.separated},
    {text:'Open a <b>wide street</b>: reach at least 90% of the maximum possible width', xp:25,
     check:s=>s.separated && s.width >= 0.90*s.bestWidth},
    {text:'Find the <b>max-margin line</b> (≥ 97% of the best) — the support vectors light up', xp:25,
     check:s=>s.separated && s.width >= 0.97*s.bestWidth},
  ]);

  const P = plane(L.ctx, L.W, L.H, 44);
  let dragging = false;
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    const th = thetaDeg*Math.PI/180, wx=Math.cos(th), wy=Math.sin(th);
    const f = p => wx*p[0] + wy*p[1] + b;                 // ‖w‖ = 1
    // separated? all neg on the negative side, all pos on the positive side
    const sepPos = pos.every(p=>f(p)>0), sepNeg = neg.every(p=>f(p)<0);
    const separated = sepPos && sepNeg;
    // half-width = distance to the nearest point (only meaningful when separated)
    let margin = Infinity;
    for(const p of neg.concat(pos)) margin = Math.min(margin, Math.abs(f(p)));
    const width = separated ? 2*margin : 0;
    const bw = best();

    // margin band (street) — two lines parallel to the boundary at +/- margin
    const dirx=-wy, diry=wx;                               // along the boundary
    const base=[-b*wx, -b*wy];                            // a point on the line
    const big=40;
    function seg(off){ const c=[base[0]+off*wx, base[1]+off*wy];
      return [[c[0]-big*dirx,c[1]-big*diry],[c[0]+big*dirx,c[1]+big*diry]]; }
    if(separated && isFinite(margin)){
      const a1=seg(margin), a2=seg(-margin);
      L.ctx.fillStyle='rgba(45,212,160,.12)';
      L.ctx.beginPath();
      L.ctx.moveTo(P.sx(a1[0][0]),P.sy(a1[0][1])); L.ctx.lineTo(P.sx(a1[1][0]),P.sy(a1[1][1]));
      L.ctx.lineTo(P.sx(a2[1][0]),P.sy(a2[1][1])); L.ctx.lineTo(P.sx(a2[0][0]),P.sy(a2[0][1]));
      L.ctx.closePath(); L.ctx.fill();
      [a1,a2].forEach(a=>{ L.ctx.strokeStyle='rgba(45,212,160,.5)'; L.ctx.lineWidth=1.5; L.ctx.setLineDash([6,5]);
        L.ctx.beginPath(); L.ctx.moveTo(P.sx(a[0][0]),P.sy(a[0][1])); L.ctx.lineTo(P.sx(a[1][0]),P.sy(a[1][1])); L.ctx.stroke(); L.ctx.setLineDash([]); });
    }
    // the boundary itself
    const bl=seg(0);
    L.ctx.strokeStyle = separated ? '#e8ecff' : '#ff8fa3'; L.ctx.lineWidth=2.5;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(bl[0][0]),P.sy(bl[0][1])); L.ctx.lineTo(P.sx(bl[1][0]),P.sy(bl[1][1])); L.ctx.stroke();

    // points; ring the support vectors (those touching the current curb)
    function drawSet(set,color,isPos){
      set.forEach((p,i)=>{
        const isSV = separated && isFinite(margin) && Math.abs(Math.abs(f(p))-margin) < 0.06;
        P.dot(p[0],p[1],7,color);
        if(isSV){ L.ctx.strokeStyle='#2dd4a0'; L.ctx.lineWidth=3;
          L.ctx.beginPath(); L.ctx.arc(P.sx(p[0]),P.sy(p[1]),12,0,7); L.ctx.stroke(); }
        if(isPos && i===DRAG){ L.ctx.strokeStyle='#ffffff'; L.ctx.lineWidth=2; L.ctx.setLineDash([3,3]);
          L.ctx.beginPath(); L.ctx.arc(P.sx(p[0]),P.sy(p[1]),15,0,7); L.ctx.stroke(); L.ctx.setLineDash([]); }
      });
    }
    drawSet(neg,'#00d4ff',false);
    drawSet(pos,'#ffc94d',true);

    L.readout.innerHTML = (separated
        ? '<span style="color:#2dd4a0">separated ✓</span>  street width = <b>'+width.toFixed(2)+'</b>'
        : '<span style="color:#ff8fa3">not separated — some points are on the wrong side</span>')+
      '<br>maximum possible width (given the points) = '+bw.width.toFixed(2)+
      '<br>angle = '+thetaDeg.toFixed(0)+'°,  offset b = '+fmt2(b);
    m.update({separated, width, bestWidth:bw.width});
  }

  L.canvas.addEventListener('pointerdown', e=>{
    const q=L.toCanvas(e), p=pos[DRAG];
    if(Math.hypot(q.x-P.sx(p[0]), q.y-P.sy(p[1])) < 18){ dragging=true; L.canvas.setPointerCapture(e.pointerId); }
  });
  L.canvas.addEventListener('pointermove', e=>{
    if(!dragging) return; const q=L.toCanvas(e);
    pos[DRAG][0]=Math.max(-4,Math.min(4, P.wx(q.x)));
    pos[DRAG][1]=Math.max(-3,Math.min(3, P.wy(q.y)));
    draw();
  });
  L.canvas.addEventListener('pointerup', ()=>{ dragging=false; });

  slider(L.ctrl,'angle of the boundary (degrees)',-60,60,1,thetaDeg,v=>v.toFixed(0)+'°',v=>{thetaDeg=v;draw();});
  slider(L.ctrl,'b — slide the boundary across',-4,4,0.05,b,v=>v.toFixed(2),v=>{b=v;draw();});
  note(L.ctrl,'Rotate and slide to open the widest empty <b style="color:#2dd4a0">street</b>. Points ringed in <b style="color:#2dd4a0">green</b> touch the curb — they are the <b>support vectors</b>. Drag the <b style="color:#fff">white-ringed</b> gold point: while it stays deep in its region the maximum width does not budge; push it into the street and watch it drop.');
  draw();
};

/* ---- Lab 1b: soft margin, the C knob, hinge loss, vs logistic ---- */
INTERACTIVES.mlmarginSoft = function(stage, api){
  const L = makeLab(stage);
  // Overlapping data (labels +/-1): no line separates it.
  const pts = [
    [-2.4,1.2,-1],[-2.0,-0.6,-1],[-1.5,0.8,-1],[-1.9,1.9,-1],[-1.2,-1.1,-1],[-0.6,0.3,-1],[-2.6,-1.4,-1],[0.4,0.9,-1],
    [2.3,-1.0,1],[1.8,0.5,1],[1.3,-0.7,1],[2.1,1.6,1],[1.0,1.0,1],[2.7,0.2,1],[0.5,-0.9,1],[-0.3,-0.4,1],
  ];
  let C = 0.3;

  // Soft-margin SVM by subgradient descent on the primal
  //   ½‖w‖² + C·Σ max(0, 1 − yᵢ(w·xᵢ+b)).
  function fitSVM(C){
    let w0=0, w1=0, bb=0;
    for(let t=0;t<1200;t++){
      let gw0=w0, gw1=w1, gb=0;                 // gradient of ½‖w‖² is w
      for(const [x,y,l] of pts){ const f=w0*x+w1*y+bb; if(l*f<1){ gw0-=C*l*x; gw1-=C*l*y; gb-=C*l; } }
      const s=0.08/(1+0.003*t);
      w0-=s*gw0; w1-=s*gw1; bb-=s*gb;
    }
    return {w0,w1,b:bb};
  }
  // Logistic regression on the same data (labels mapped to {0,1}) for contrast.
  function fitLog(){
    let w0=0, w1=0, bb=0;
    for(let t=0;t<900;t++){
      let g0=0,g1=0,gb=0;
      for(const [x,y,l] of pts){ const p=sigmoid(w0*x+w1*y+bb), e=p-(l+1)/2; g0+=e*x; g1+=e*y; gb+=e; }
      w0-=0.12*g0/pts.length; w1-=0.12*g1/pts.length; bb-=0.12*gb/pts.length;
    }
    return {w0,w1,b:bb};
  }
  const logfit = fitLog();

  const m = api.missions([
    {text:'Set <b>C small</b> (≤ 0.3): a <b>wide</b> street (width ≥ 2.3) that tolerates many violations', xp:22,
     check:s=>s.C<=0.3 && s.width>=2.3},
    {text:'Set <b>C large</b> (≥ 8): the street narrows to drive <b>misclassified points to 0</b>', xp:25,
     check:s=>s.C>=8 && s.mis===0},
  ]);

  const P = plane(L.ctx, L.W, L.H, 44);
  function line(fit,color,dash,lw){
    const {w0,w1,b:bb}=fit; if(Math.abs(w0)<1e-9 && Math.abs(w1)<1e-9) return;
    L.ctx.strokeStyle=color; L.ctx.lineWidth=lw||2.5; if(dash) L.ctx.setLineDash(dash);
    L.ctx.beginPath();
    if(Math.abs(w1)>1e-6){ const xa=P.wx(0), xb=P.wx(L.W);
      L.ctx.moveTo(P.sx(xa),P.sy(-(w0*xa+bb)/w1)); L.ctx.lineTo(P.sx(xb),P.sy(-(w0*xb+bb)/w1)); }
    else { const xv=-bb/w0; L.ctx.moveTo(P.sx(xv),0); L.ctx.lineTo(P.sx(xv),L.H); }
    L.ctx.stroke(); L.ctx.setLineDash([]);
  }
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    const fit = fitSVM(C);
    const nw = Math.hypot(fit.w0, fit.w1) || 1e-9;
    const width = 2/nw;                                   // canonical margin width
    let hinge=0, viol=0, mis=0;
    for(const [x,y,l] of pts){ const f=fit.w0*x+fit.w1*y+fit.b;
      hinge += Math.max(0,1-l*f); if(l*f<1) viol++; if(l*f<0) mis++; }
    // the two margin curbs w·x+b = +/-1
    function marginLine(c){ const {w0,w1,b:bb}=fit; if(Math.abs(w1)<1e-6) return;
      L.ctx.strokeStyle='rgba(45,212,160,.4)'; L.ctx.lineWidth=1.3; L.ctx.setLineDash([5,5]); L.ctx.beginPath();
      const xa=P.wx(0), xb=P.wx(L.W);
      L.ctx.moveTo(P.sx(xa),P.sy((c-bb-w0*xa)/w1)); L.ctx.lineTo(P.sx(xb),P.sy((c-bb-w0*xb)/w1));
      L.ctx.stroke(); L.ctx.setLineDash([]); }
    marginLine(1); marginLine(-1);
    line(fit,'#e8ecff',null,2.6);                         // SVM boundary
    line(logfit,'#b9a8ff',[7,5],2);                       // logistic regression boundary
    // points; mark violators (inside the street or wrong side) with a red/gold ring
    for(const [x,y,l] of pts){ const f=fit.w0*x+fit.w1*y+fit.b;
      P.dot(x,y,7, l>0?'#ffc94d':'#00d4ff');
      if(l*f<1){ L.ctx.strokeStyle=l*f<0?'#ff5c7a':'rgba(255,201,77,.7)'; L.ctx.lineWidth=2;
        L.ctx.beginPath(); L.ctx.arc(P.sx(x),P.sy(y),11,0,7); L.ctx.stroke(); } }
    L.readout.innerHTML='C = <b>'+C.toFixed(2)+'</b>   street width 2/‖w‖ = <b>'+width.toFixed(2)+'</b>'+
      '<br>hinge loss = '+hinge.toFixed(2)+'   inside-margin violations = '+viol+
      '<br><span style="color:#ff5c7a">misclassified = '+mis+'</span>   '+
      '<span style="color:#b9a8ff">dashed = logistic regression</span>';
    m.update({C, width, hinge, viol, mis});
  }
  slider(L.ctrl,'C — penalty on margin violations',0.1,20,0.1,C,v=>v.toFixed(1),v=>{C=v;draw();});
  note(L.ctrl,'The white line is the soft-margin boundary; the green dashes are its margin curbs. A <b style="color:#ff5c7a">red ring</b> is a misclassified point, a <b style="color:#ffc94d">gold ring</b> a point sitting inside the street. Small <b>C</b> = a broad, forgiving street; large <b>C</b> = a tight street that fights every violation. The <b style="color:#b9a8ff">purple dashes</b> are logistic regression on the same points — a different objective, a different line.');
  draw();
};

/* ================================================================
   LESSON 2 — ml-kernels: The Kernel Trick
   ================================================================ */
registerLesson({
  id:'ml-kernels', world:'ml', order:44, emoji:'🌀', title:'The Kernel Trick',
  sub:'Some data no straight line can split. Lift it into a higher-dimensional feature space and a flat cut suddenly works — and a kernel lets you do this without ever building the lift.',
  learn:`<p>A ring of one class surrounding a core of another cannot be split by any straight line in the plane. But watch what happens if we <strong>lift</strong> each 2-D point \\(x=(x_1,x_2)\\) into three dimensions with the <strong>feature map</strong> \\(\\varphi(x)=(x_1,\\;x_2,\\;x_1^2+x_2^2)\\): the height is the squared radius, so the inner core sits low and the outer ring rises up. Now a flat plane slices cleanly between them. Project that plane back down and it becomes a <em>circle</em> — the boundary that was impossible with a line. The first lab is exactly this lift.</p>
  <div class="formula">$$\\text{not linearly separable in } x \\;\\xrightarrow{\\;\\varphi\\;}\\; \\text{linearly separable in } \\varphi(x)$$</div>
  <p>The catch: useful feature maps are huge. A degree-2 map of a \\(d\\)-dimensional input has \\(\\sim d^2/2\\) features; higher degrees explode; some maps are infinite-dimensional. Building \\(\\varphi(x)\\) explicitly is hopeless. Here is the trick that saves everything.</p>
  <p>Recall from the SVM (<b>ml-margin</b>) that the trained model touches the data <em>only through inner products</em> between points. So we never need \\(\\varphi(x)\\) itself — we only need the inner product \\(\\varphi(x)\\cdot\\varphi(x\')\\). A <strong>kernel</strong> is a function that returns that inner product directly:</p>
  <div class="formula">$$k(x,x\') = \\varphi(x)\\cdot\\varphi(x\')$$</div>
  <p>and for many kernels \\(k\\) is cheap even when \\(\\varphi\\) is astronomically large. That is the <strong>kernel trick</strong>: compute similarities in the rich feature space at the cost of the input space, without ever constructing the space. The most common choice is the <strong>Gaussian / RBF kernel</strong>:</p>
  <div class="formula">$$k(x,x\') = \\exp\\!\\left(-\\frac{\\lVert x-x\'\\rVert^2}{2\\sigma^2}\\right) \\;=\\; \\exp\\!\\big(-\\gamma\\,\\lVert x-x\'\\rVert^2\\big)$$</div>
  <p>It reads as a smooth similarity: 1 when \\(x=x\'\\), decaying to 0 as the points separate, with reach set by the bandwidth \\(\\sigma\\) (equivalently \\(\\gamma=1/2\\sigma^2\\)). Remarkably, the RBF kernel corresponds to an <em>infinite-dimensional</em> feature map — you could never write \\(\\varphi\\) down, yet \\(k\\) is one line of code. Small \\(\\sigma\\) (large \\(\\gamma\\)) makes each point influential only very locally — wiggly, overfit boundaries; large \\(\\sigma\\) makes influence broad — smooth boundaries that can underfit. The second lab lets you feel that tradeoff.</p>
  <p>Not every function is a valid kernel. It must be a <strong>symmetric positive-semidefinite</strong> function (Mercer's condition): the matrix \\(K_{ij}=k(x_i,x_j)\\) must be PSD for every choice of points — exactly the positive-semidefiniteness you met in <b>la-posdef</b>. That is what guarantees \\(k\\) really is an inner product in <em>some</em> feature space.</p>`,
  ml:`The kernel trick was the engine of pre-deep-learning ML and remains a clean idea worth owning. Its fingerprints are everywhere: <b>kernel SVMs</b> and <b>kernel ridge regression</b>, the <b>RBF / Gaussian kernel</b> at the heart of <b>Gaussian processes</b> (the Bayesian backbone of hyperparameter tuning and many uncertainty models), the <b>Nyström</b> and <b>random-features</b> approximations that scale it up, and the <b>kernel view of attention</b> that connects Transformers back to similarity kernels. The central lesson — "your model only needs inner products, so replace them with a similarity function and compute in a space you never build" — is one of the most reused moves in the field. The PSD requirement is the same positive-definiteness thread that runs through covariance matrices and Hessians.`,
  deeper:[
   {title:'😵 Stuck? Why does lifting help at all?', body:'Linear separability is not a property of the data alone — it depends on the coordinates you describe the data in. Concentric rings are hopeless in \\((x_1,x_2)\\), but in the single coordinate "distance from center" they are trivially separable by a threshold. A feature map just adds coordinates (like \\(x_1^2+x_2^2\\)) that expose structure a straight line can exploit. The boundary is still "flat" in the new space; it only looks curved when you fold that space back down to the original picture. (Schölkopf & Smola, <i>Learning with Kernels</i>, 2002, ch. 1.)'},
   {title:'🚀 Go deeper: Mercer, PSD, and why not every function is a kernel', body:'For \\(k\\) to be a genuine inner product \\(\\varphi(x)\\cdot\\varphi(x\')\\) in some space, the Gram matrix \\(K_{ij}=k(x_i,x_j)\\) must be symmetric positive-semidefinite for ALL finite point sets — Mercer\'s theorem. This is precisely <b>la-posdef</b>: \\(K\\) has no negative eigenvalues, so \\(c^\\top K c\\ge 0\\). If a function fails this, there is no feature space it corresponds to and the "similarity" can be self-contradictory. PSD kernels are closed under sum, product, and positive scaling, which is how new kernels are built from old ones. (Schölkopf & Smola, 2002, ch. 2.)'},
   {title:'🚀 Go deeper: the RBF kernel is infinite-dimensional', body:'Expand \\(\\exp(x\\cdot x\'/\\sigma^2)\\) as its power series and every term is a polynomial feature of ever-higher degree — the implied feature map \\(\\varphi\\) has infinitely many coordinates. Yet \\(k(x,x\')=\\exp(-\\lVert x-x\'\\rVert^2/2\\sigma^2)\\) evaluates in constant time. That is the whole payoff of the trick in one example: an infinite-dimensional model priced like a distance computation. The bandwidth \\(\\sigma\\) controls the effective smoothness / capacity. (Bishop, <i>PRML</i>, 2006, §6.2.)'},
   {title:'🚀 Go deeper: the representer theorem', body:'Why is it always safe to write the solution as a weighted sum of kernels centered on the training points, \\(f(x)=\\sum_i \\alpha_i k(x,x_i)\\)? The representer theorem: for any loss plus an increasing penalty on \\(\\lVert f\\rVert\\) in the kernel\'s function space (an RKHS), the minimizer provably lies in the span of the training kernels — even when that space is infinite-dimensional. This is what makes kernelized learning a finite computation and underlies kernel SVMs, kernel ridge regression, and Gaussian processes. (Hastie, Tibshirani & Friedman, ESL 2e, §5.8 & 12.3.)'}],
  labs:[
   {key:'lift', title:'Lift the rings', interactive:'mlkernelsLift',
    intro:`Two rings, one inside the other — no line can split them. Raise the lift slider to send each point to height \\(x_1^2+x_2^2\\) (its squared radius) and slide the cut until a single flat plane separates them. In the input view, that flat cut is a <b>circle</b>.`},
   {key:'rbf', title:'The RBF kernel & bandwidth', interactive:'mlkernelsRBF',
    intro:`Each point casts an RBF "bump" of similarity; summed with their labels they build a decision boundary. Drag the probe to read the similarity \\(k(x,x\')\\), and sweep the bandwidth \\(\\sigma\\) from tiny (wiggly, overfit) to broad (smooth, underfit).`},
   {key:'choose', title:'Pick the right kernel', interactive:'mlkernelsChoose',
    intro:`Three datasets, three kernels. For each dataset find a kernel that reaches 100% training accuracy — and notice where the linear kernel simply cannot.`},
  ],
  quiz:[
   {q:'Concentric rings (inner class surrounded by outer class) cannot be split by a line in the plane. The kernel/feature-map fix is to…', opts:['Map the points into a higher-dimensional space where a flat boundary separates them','Use a steeper line','Delete the points that overlap','Rotate the coordinate axes'], a:0,
    tag:'the feature map', focus:'A feature map φ adds coordinates (e.g. x₁²+x₂²) that make the classes linearly separable in the lifted space.',
    why:'Adding a coordinate like the squared radius x₁²+x₂² lifts the outer ring above the inner core, so a flat plane separates them. Linear separability depends on the representation, and the map changes it.',
    wrong:{1:'No line of any slope can separate a class that fully surrounds another; slope is not the issue.',2:'Deleting data changes the problem and throws away information; the kernel keeps every point.',3:'Rotation is a linear change of coordinates and cannot make a non-linearly-separable set separable.'}},
   {q:'A degree-2 feature map turns a 2-D point into features like \\((x_1^2,\\,x_2^2,\\,\\sqrt2\\,x_1x_2,\\dots)\\). Why not always just build \\(\\varphi(x)\\) explicitly and run a linear model?', opts:['Because useful feature maps are enormous or infinite-dimensional; building them is infeasible','Because linear models cannot use extra features','Because it would make the data linearly inseparable','Because φ is never known for any dataset'], a:0,
    tag:'lifting to linear separability', focus:'Feature dimension explodes with degree (and is infinite for RBF). The kernel trick avoids constructing φ at all.',
    why:'A degree-p map of d inputs has on the order of dᵖ features, and some maps (RBF) are infinite-dimensional. Constructing φ explicitly is infeasible, which is exactly the problem the kernel trick solves.',
    wrong:{1:'Linear models happily use more features; the obstacle is the sheer NUMBER of them, not the model.',2:'Lifting makes data MORE separable, not less — that is the whole point.',3:'φ is perfectly well-defined for these maps; it is just too big to build, and the kernel sidesteps it.'}},
   {q:'The kernel trick works because a trained SVM depends on the data only through…', opts:['Inner products between points, which a kernel returns directly without building φ','The determinant of the data matrix','The individual coordinates of each point','The number of classes'], a:0,
    tag:'the kernel trick', focus:'The dual solution uses only φ(x)·φ(x′). Replace that inner product with k(x,x′) and φ is never needed.',
    why:'The dual SVM (and kernel ridge, GPs, ...) accesses the feature space only via inner products φ(x)·φ(x′). A kernel computes that number directly, so the explicit map φ is never constructed.',
    wrong:{1:'No determinant appears in the SVM solution; it runs on pairwise inner products.',2:'It specifically does NOT need raw coordinates in feature space — only their inner products, which is what makes the trick possible.',3:'The class count is unrelated to why inner products suffice.'}},
   {q:'The RBF (Gaussian) kernel \\(k(x,x\')=\\exp(-\\lVert x-x\'\\rVert^2/2\\sigma^2)\\) returns a value that…', opts:['Equals 1 when the points coincide and decays toward 0 as they separate','Grows without bound as points separate','Is negative for far-apart points','Equals the Euclidean distance between the points'], a:0,
    tag:'the RBF kernel', focus:'RBF is a similarity: k=1 at zero distance, decaying to 0 with distance; the rate is set by σ (γ = 1/2σ²).',
    why:'At x = x′ the exponent is 0 so k = 1 (maximum similarity); as the squared distance grows the exponent goes to −∞ and k → 0. It is a smooth, bounded similarity, not a distance.',
    wrong:{1:'The exponential of a negative number is bounded by 1; it cannot grow without bound.',2:'k is always in (0, 1]; it is never negative.',3:'k is a decreasing function OF the distance, not the distance itself — far points give k near 0, not a large value.'}},
   {q:'You shrink the RBF bandwidth \\(\\sigma\\) toward 0 (equivalently raise \\(\\gamma\\)). The decision boundary tends to…', opts:['Fracture into tight islands around individual points — overfitting','Become a single straight line','Stop depending on the data','Widen into one smooth blob that ignores the points'], a:0,
    tag:'RBF bandwidth', focus:'Small σ = each point influential only very locally = wiggly, high-variance boundary that memorizes points.',
    why:'Small σ means each point\'s influence dies off almost immediately, so the classifier reacts only near individual points — the boundary breaks into little islands and overfits.',
    wrong:{1:'A straight line is the LARGE-σ (very smooth) limit, the opposite extreme.',2:'It depends on the data more locally and more sensitively, not less.',3:'One smooth blob is the large-σ behavior; small σ does the reverse.'}},
   {q:'What must be true of a function \\(k(x,x\')\\) for it to be a valid kernel (Mercer\'s condition)?', opts:['It is symmetric and its Gram matrix \\(K_{ij}=k(x_i,x_j)\\) is positive-semidefinite for every set of points','It is always positive','It integrates to 1','It is linear in x'], a:0,
    tag:'Mercer and PSD kernels', focus:'A valid kernel is symmetric PSD: K has no negative eigenvalues (la-posdef). Only then is it an inner product in some feature space.',
    why:'Mercer\'s condition: k must be symmetric and produce a positive-semidefinite Gram matrix for any points, so cᵀKc ≥ 0. That is exactly the PSD property from la-posdef, and it guarantees k is a genuine inner product in some feature space.',
    wrong:{1:'Kernel values need not be positive (a linear kernel x·x′ can be negative); it is the Gram MATRIX that must be PSD.',2:'Integrating to 1 is a probability-density condition, not a kernel condition.',3:'The RBF kernel is highly nonlinear in x yet perfectly valid; linearity is not required.'}},
   {q:'A remarkable fact about the RBF kernel is that its implied feature map \\(\\varphi\\) is…', opts:['Infinite-dimensional, yet \\(k\\) still evaluates in constant time','Two-dimensional','The identity map','Undefined, because RBF is not a real kernel'], a:0,
    tag:'RBF is infinite-dimensional', focus:'RBF corresponds to an infinite-dimensional φ (power-series expansion), but k is O(1) to compute — the trick\'s payoff.',
    why:'Expanding the exponential produces polynomial features of every degree, so φ has infinitely many coordinates — yet k is a single exponential of a distance. An infinite-dimensional model priced like a distance calculation.',
    wrong:{1:'Two dimensions is the INPUT size here, not the feature dimension, which is infinite.',2:'The identity map corresponds to the linear kernel, not the RBF.',3:'RBF is a valid PSD kernel; it corresponds to a real (infinite-dimensional) feature space.'}},
   {q:'Two points are a Euclidean distance \\(\\lVert x-x\'\\rVert = 2\\) apart. With bandwidth \\(\\sigma = 1\\), compute the RBF similarity \\(k=\\exp(-\\lVert x-x\'\\rVert^2/2\\sigma^2)\\). (Give 3 decimals.)', type:'numeric', answer:0.135, tol:0.008, unit:'',
    tag:'RBF similarity numeric', focus:'k = exp(−(2²)/(2·1²)) = exp(−2) ≈ 0.135. Square the distance first, then divide by 2σ².',
    hint:'Squared distance = 4; divide by 2σ² = 2 to get 2; k = e^(−2).',
    why:'‖x−x′‖² = 4, and 2σ² = 2, so the exponent is −4/2 = −2 and k = e^(−2) ≈ 0.135.'},
   {q:'Order the reasoning behind the kernel trick, from problem to resolution.', type:'order',
    steps:[
      'A dataset is not linearly separable in its input space.',
      'Map each point through a feature map \\(\\varphi\\) into a higher-dimensional space where a flat boundary can fit.',
      'Notice the trained model uses the data only through inner products \\(\\varphi(x)\\cdot\\varphi(x\')\\).',
      'Replace each inner product with a kernel \\(k(x,x\')\\) that returns it directly, so \\(\\varphi\\) is never built.'],
    tag:'the kernel trick', focus:'Inseparable in x → lift with φ → model only needs inner products → swap in a kernel and skip φ entirely.',
    why:'Start from data no line can split, lift it with φ so a flat cut works, observe the solution needs only inner products in that space, then compute those inner products with a kernel — never building φ.'},
  ],
});

/* ---- Lab 2a: lift the rings onto the paraboloid ---- */
INTERACTIVES.mlkernelsLift = function(stage, api){
  const L = makeLab(stage, {h:480});
  // Two concentric rings (deterministic): inner class -1, outer class +1.
  const R_IN=1.15, R_OUT=2.6, data=[];
  for(let i=0;i<10;i++){ const a=i/10*2*Math.PI;
    data.push({x:R_IN*Math.cos(a), y:R_IN*Math.sin(a), out:false});
    data.push({x:R_OUT*Math.cos(a), y:R_OUT*Math.sin(a), out:true}); }
  let t=0, h=4.5;                                 // lift amount 0..1 ; cut height

  api.predict({
    prompt:'You will lift the rings by height \\(x_1^2+x_2^2\\) and cut them apart with a flat plane at some height h. <b>Predict:</b> when you project that flat cut back down into the 2-D input view, what shape is the boundary?',
    choices:['A circle of radius \\(\\sqrt{h}\\)','A straight line','A square','Two parallel lines'],
    answer:0,
    reveal:'The plane is the level set \\(x_1^2+x_2^2 = h\\). Solving for the input coordinates gives \\(\\lVert x\\rVert=\\sqrt h\\) — a <b>circle of radius \\(\\sqrt h\\)</b>. A flat cut in feature space is a curved boundary in input space; that is the entire idea of the lift, made concrete.',
  });

  const m = api.missions([
    {text:'<b>Lift fully</b>: raise the lift slider to the top (height = squared radius)', xp:18,
     check:s=>s.t>=0.98},
    {text:'<b>Separate</b> them: with the rings lifted, set the cut so the plane splits the classes with <b>0 errors</b>', xp:27,
     check:s=>s.t>=0.9 && s.errors===0},
  ]);

  function draw(){
    clearBg(L.ctx, L.W, L.H);
    const W=L.W, H=L.H;
    // --- TOP: input space (top-down) with the decision circle ---
    const tcx=W*0.5, tcy=H*0.24, ts=26;
    const isx=x=>tcx+x*ts, isy=y=>tcy-y*ts;
    L.ctx.strokeStyle='rgba(255,255,255,.07)'; L.ctx.lineWidth=1;
    for(let g=-3;g<=3;g++){ L.ctx.beginPath(); L.ctx.moveTo(isx(g),tcy-3*ts); L.ctx.lineTo(isx(g),tcy+3*ts); L.ctx.stroke();
      L.ctx.beginPath(); L.ctx.moveTo(tcx-3*ts,isy(g)); L.ctx.lineTo(tcx+3*ts,isy(g)); L.ctx.stroke(); }
    // decision circle radius sqrt(h)
    if(h>0){ L.ctx.strokeStyle='rgba(45,212,160,.8)'; L.ctx.lineWidth=2; L.ctx.setLineDash([6,5]);
      L.ctx.beginPath(); L.ctx.arc(tcx,tcy,Math.sqrt(h)*ts,0,7); L.ctx.stroke(); L.ctx.setLineDash([]); }
    for(const p of data){ L.ctx.fillStyle=p.out?'#ffc94d':'#00d4ff';
      L.ctx.beginPath(); L.ctx.arc(isx(p.x),isy(p.y),5,0,7); L.ctx.fill(); }
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='700 12px '+FONT(); L.ctx.textAlign='left';
    L.ctx.fillText('INPUT SPACE  —  boundary is a circle of radius √h = '+Math.sqrt(h).toFixed(2), 12, 16);
    // divider
    L.ctx.strokeStyle='rgba(255,255,255,.12)'; L.ctx.beginPath(); L.ctx.moveTo(0,H*0.5); L.ctx.lineTo(W,H*0.5); L.ctx.stroke();
    // --- BOTTOM: side view of the lift. x = radius, y = height t*r² ---
    const padX=54, base=H-30, vs=(H*0.42)/12;
    const rsx=r=>padX + (r/3.3)*(W-2*padX);
    const hsy=z=>base - z*vs;
    L.ctx.strokeStyle='rgba(255,255,255,.18)'; L.ctx.lineWidth=1;
    L.ctx.beginPath(); L.ctx.moveTo(padX,base); L.ctx.lineTo(W-padX,base); L.ctx.stroke();   // radius axis
    L.ctx.beginPath(); L.ctx.moveTo(padX,base); L.ctx.lineTo(padX,hsy(12)); L.ctx.stroke();  // height axis
    // faint paraboloid guide z = t*r²
    L.ctx.strokeStyle='rgba(124,92,255,.35)'; L.ctx.lineWidth=1.5; L.ctx.beginPath();
    for(let r=0;r<=3.3;r+=0.05){ const px=rsx(r), py=hsy(t*r*r); if(r===0)L.ctx.moveTo(px,py); else L.ctx.lineTo(px,py); }
    L.ctx.stroke();
    // cut plane (horizontal line at height h)
    L.ctx.strokeStyle='rgba(45,212,160,.85)'; L.ctx.lineWidth=2; L.ctx.setLineDash([7,5]);
    L.ctx.beginPath(); L.ctx.moveTo(padX,hsy(h)); L.ctx.lineTo(W-padX,hsy(h)); L.ctx.stroke(); L.ctx.setLineDash([]);
    // points lifted; count errors
    let errors=0;
    for(const p of data){ const r=Math.hypot(p.x,p.y), z=t*r*r;
      const predOut = z>h;                          // above the cut => predicted "outer"
      if(predOut!==p.out) errors++;
      L.ctx.fillStyle=p.out?'#ffc94d':'#00d4ff';
      L.ctx.beginPath(); L.ctx.arc(rsx(r),hsy(z),5,0,7); L.ctx.fill();
      if(predOut!==p.out){ L.ctx.strokeStyle='#ff5c7a'; L.ctx.lineWidth=2;
        L.ctx.beginPath(); L.ctx.arc(rsx(r),hsy(z),9,0,7); L.ctx.stroke(); } }
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='700 12px '+FONT();
    L.ctx.fillText('SIDE VIEW OF THE LIFT  —  height = t·(x₁² + x₂²),  cut plane at h', 12, H*0.5+18);
    L.ctx.fillText('radius →', W-padX-56, base+16);
    L.readout.innerHTML='lift t = '+t.toFixed(2)+'   cut height h = '+h.toFixed(2)+
      '   decision radius √h = '+Math.sqrt(h).toFixed(2)+
      '<br>'+(errors===0 && t>=0.9 ? '<span style="color:#2dd4a0">separated ✓ — a flat plane splits the lifted rings</span>'
        : '<span style="color:#ff8fa3">errors = '+errors+'</span>');
    m.update({t, h, errors});
  }
  slider(L.ctrl,'lift  —  raise points to height x₁² + x₂²',0,1,0.01,t,v=>v.toFixed(2),v=>{t=v;draw();});
  slider(L.ctrl,'cut height h  —  the flat plane',0,12,0.1,h,v=>v.toFixed(1),v=>{h=v;draw();});
  note(L.ctrl,'Bottom: each point rises to height \\(t\\,(x_1^2+x_2^2)\\) — its squared radius. At full lift the inner ring (low) and outer ring (high) split at a flat <b style="color:#2dd4a0">cut</b>. Top: that same cut is a <b style="color:#2dd4a0">circle</b> of radius √h back in the input plane. A red ring marks a point on the wrong side of the cut.');
  draw();
};

/* ---- Lab 2b: the RBF kernel, similarity heatmap, bandwidth ---- */
INTERACTIVES.mlkernelsRBF = function(stage, api){
  const L = makeLab(stage);
  // An XOR-like set: +1 on one diagonal, -1 on the other. No line separates it.
  const pts = [
    [1.4,1.3,1],[1.7,1.6,1],[-1.3,-1.4,1],[-1.6,-1.1,1],
    [1.5,-1.4,-1],[1.2,-1.6,-1],[-1.4,1.5,-1],[-1.6,1.2,-1],
  ];
  let sigma = 1.0;
  const probe = {x:0.6, y:0.6};
  const K = (ax,ay,bx,by) => Math.exp(-((ax-bx)**2+(ay-by)**2)/(2*sigma*sigma));

  api.predict({
    prompt:'Drag the white probe far from every training point (a corner of the plot) with a moderate bandwidth. <b>Predict:</b> the RBF similarity \\(k\\) between the probe and the nearest training point will be…',
    choices:['Close to 0 — far points are dissimilar','Close to 1 — all points are similar','Exactly 0.5','Negative'],
    answer:0,
    reveal:'RBF similarity decays with distance: far from every point, \\(\\lVert x-x_i\\rVert\\) is large, the exponent is very negative, and \\(k\\to 0\\). The kernel says "nothing here looks like any training point," so the classifier is unsure. Similarity near 1 happens only when the probe sits almost on top of a point.',
  });

  const m = api.missions([
    {text:'<b>Overfit:</b> shrink σ to ≤ 0.4 and watch the boundary fracture into tight islands around points', xp:22,
     check:s=>s.sigma<=0.4},
    {text:'<b>Smooth:</b> grow σ to ≥ 2.5 — the influence spreads out and the boundary calms (and can underfit)', xp:22,
     check:s=>s.sigma>=2.5},
  ]);

  const P = plane(L.ctx, L.W, L.H, 44);
  function draw(){
    clearBg(L.ctx, L.W, L.H);
    const step=10;
    for(let px=0;px<L.W;px+=step){
      for(let py=0;py<L.H;py+=step){
        const wx=P.wx(px+step/2), wy=P.wy(py+step/2);
        // classifier field f = Σ yᵢ k(x, xᵢ)  (equal-weight kernel classifier)
        let f=0; for(const [x,y,l] of pts) f += l*K(wx,wy,x,y);
        // similarity to the probe (the RBF heatmap the lab is about)
        const sim=K(wx,wy,probe.x,probe.y);
        // base tint by class field, plus the probe's similarity glow
        const tp=Math.tanh(f*1.2);
        const r=Math.round(20 + (tp>0? tp*210:0) + sim*120);
        const g=Math.round(55 + Math.abs(tp)*55 + sim*90);
        const bl=Math.round(30 + (tp<0? -tp*195:0) + sim*40);
        L.ctx.fillStyle='rgb('+Math.min(255,r)+','+Math.min(255,g)+','+Math.min(255,bl)+')';
        L.ctx.fillRect(px,py,step,step);
        // boundary band
        if(Math.abs(f)<0.05){ L.ctx.fillStyle='rgba(255,255,255,.75)'; L.ctx.fillRect(px,py,step,step); }
      }
    }
    // training points
    for(const [x,y,l] of pts){ P.dot(x,y,7, l>0?'#ffc94d':'#00d4ff');
      L.ctx.strokeStyle='rgba(0,0,0,.5)'; L.ctx.lineWidth=1.5;
      L.ctx.beginPath(); L.ctx.arc(P.sx(x),P.sy(y),7,0,7); L.ctx.stroke(); }
    // probe + its sigma-reach ring
    L.ctx.strokeStyle='rgba(255,255,255,.5)'; L.ctx.lineWidth=1.5; L.ctx.setLineDash([4,4]);
    L.ctx.beginPath(); L.ctx.arc(P.sx(probe.x),P.sy(probe.y),sigma*44,0,7); L.ctx.stroke(); L.ctx.setLineDash([]);
    P.dot(probe.x,probe.y,6,'#ffffff');
    // nearest training point & its similarity
    let best=1e9, bk=0; for(const [x,y] of pts){ const d=Math.hypot(x-probe.x,y-probe.y); if(d<best){best=d; bk=K(probe.x,probe.y,x,y);} }
    L.readout.innerHTML='σ = <b>'+sigma.toFixed(2)+'</b>  (γ = 1/2σ² = '+(1/(2*sigma*sigma)).toFixed(2)+')'+
      '<br>probe at ('+probe.x.toFixed(1)+', '+probe.y.toFixed(1)+')   nearest distance = '+best.toFixed(2)+
      '<br>k(probe, nearest point) = <b>'+bk.toFixed(3)+'</b>';
    m.update({sigma});
  }
  let dragging=false;
  L.canvas.addEventListener('pointerdown', e=>{ const q=L.toCanvas(e);
    if(Math.hypot(q.x-P.sx(probe.x), q.y-P.sy(probe.y))<20){ dragging=true; L.canvas.setPointerCapture(e.pointerId); } });
  L.canvas.addEventListener('pointermove', e=>{ if(!dragging) return; const q=L.toCanvas(e);
    probe.x=Math.max(-3.2,Math.min(3.2,P.wx(q.x))); probe.y=Math.max(-2.4,Math.min(2.4,P.wy(q.y))); draw(); });
  L.canvas.addEventListener('pointerup', ()=>{ dragging=false; });
  slider(L.ctrl,'σ — RBF bandwidth (reach of each point)',0.2,3.5,0.05,sigma,v=>v.toFixed(2),v=>{sigma=v;draw();});
  note(L.ctrl,'Background: the summed RBF field. The <b style="color:#fff">white band</b> is the decision boundary; the glow tracks similarity to the <b style="color:#fff">draggable probe</b>, whose dashed ring is its σ-reach. Tiny σ = each point rules only its immediate neighborhood (overfit islands); large σ = broad influence, a smooth boundary. This XOR set even resists one smooth curve — a taste of underfitting.');
  draw();
};

/* ---- Lab 2c: pick the right kernel for 3 datasets ---- */
INTERACTIVES.mlkernelsChoose = function(stage, api){
  const L = makeLab(stage);
  // Deterministic datasets: blobs (linear works), rings & XOR (need curves).
  function makeBlobs(){ return [[-1.9,0.7,-1],[-2.2,-0.3,-1],[-1.4,1.3,-1],[-2.5,0.2,-1],[-1.6,-0.8,-1],[-2.0,1.6,-1],
    [1.9,-0.6,1],[2.2,0.4,1],[1.4,-1.2,1],[2.5,-0.1,1],[1.6,0.9,1],[2.0,-1.5,1]]; }
  function makeRings(){ const a=[]; for(let i=0;i<8;i++){ const t=i/8*2*Math.PI;
    a.push([1.1*Math.cos(t),1.1*Math.sin(t),-1]); a.push([2.6*Math.cos(t),2.6*Math.sin(t),1]); } return a; }
  function makeXor(){ const a=[], c=[[1.4,1.4,1],[-1.4,-1.4,1],[1.4,-1.4,-1],[-1.4,1.4,-1]],
    off=[[0.35,0.2],[-0.3,0.35],[0.25,-0.35],[-0.35,-0.25]];
    for(const [cx,cy,l] of c) for(const [ox,oy] of off) a.push([cx+ox,cy+oy,l]); return a; }
  const SETS=[{name:'Two blobs', data:makeBlobs()},{name:'Concentric rings', data:makeRings()},{name:'XOR', data:makeXor()}];
  let di=0, kernel='linear';

  const phi = (k,x,y) => k==='linear' ? [x,y,1] : [x*x,y*y,x*y,x,y,1];   // linear or poly-2
  function percAcc(data,k){                                   // perceptron in feature space
    let w=null;
    for(let ep=0;ep<120;ep++) for(const [x,y,l] of data){ const f=phi(k,x,y);
      if(!w) w=f.map(_=>0); let d=0; for(let j=0;j<w.length;j++) d+=w[j]*f[j];
      if(l*d<=0) for(let j=0;j<w.length;j++) w[j]+=0.5*l*f[j]; }
    let c=0; for(const [x,y,l] of data){ const f=phi(k,x,y); let d=0; for(let j=0;j<w.length;j++) d+=w[j]*f[j];
      if((d>0?1:-1)===l) c++; } return c/data.length;
  }
  function rbfAcc(data,sig){                                  // kernel perceptron, RBF
    const n=data.length, al=new Array(n).fill(0);
    const K=(a,b)=>Math.exp(-((data[a][0]-data[b][0])**2+(data[a][1]-data[b][1])**2)/(2*sig*sig));
    for(let ep=0;ep<60;ep++) for(let i=0;i<n;i++){ let f=0; for(let j=0;j<n;j++) f+=al[j]*data[j][2]*K(i,j);
      if(data[i][2]*f<=0) al[i]++; }
    let c=0; for(let i=0;i<n;i++){ let f=0; for(let j=0;j<n;j++) f+=al[j]*data[j][2]*K(i,j); if((f>0?1:-1)===data[i][2]) c++; }
    return c/n;
  }
  function accuracy(){ const d=SETS[di].data;
    return kernel==='rbf' ? rbfAcc(d,1.0) : percAcc(d,kernel); }

  const m = api.missions([
    {text:'Separate the <b>blobs</b> with the <b>Linear</b> kernel — the simplest tool that works', xp:18,
     check:s=>s.di===0 && s.kernel==='linear' && s.acc>=0.999},
    {text:'Linear fails on the <b>rings</b> — separate them with a <b>curved</b> kernel (Poly-2 or RBF)', xp:24,
     check:s=>s.di===1 && s.kernel!=='linear' && s.acc>=0.999},
    {text:'Separate <b>XOR</b> — it too needs a nonlinear kernel', xp:24,
     check:s=>s.di===2 && s.kernel!=='linear' && s.acc>=0.999},
  ]);

  const P = plane(L.ctx, L.W, L.H, 44);
  function draw(){
    clearBg(L.ctx, L.W, L.H); P.grid();
    const d=SETS[di].data, acc=accuracy();
    for(const [x,y,l] of d) P.dot(x,y,7, l>0?'#ffc94d':'#00d4ff');
    const ok=acc>=0.999;
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='700 13px '+FONT(); L.ctx.textAlign='left';
    L.ctx.fillText('Dataset: '+SETS[di].name+'   ·   kernel: '+kernel.toUpperCase(), 12, 20);
    L.readout.innerHTML='training accuracy with the <b>'+kernel.toUpperCase()+'</b> kernel = '+
      '<b style="color:'+(ok?'#2dd4a0':'#ff8fa3')+'">'+(acc*100).toFixed(0)+'%</b>'+
      (ok?'  — separated ✓':'  — this kernel cannot separate '+SETS[di].name);
    m.update({di, kernel, acc});
  }
  chips(L.ctrl,'DATASET',['Two blobs','Concentric rings','XOR'],(i,btn,row)=>{
    di=i; [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw();
  }).children[0].classList.add('on');
  chips(L.ctrl,'KERNEL',['Linear','Polynomial (deg 2)','RBF'],(i,btn,row)=>{
    kernel=['linear','poly','rbf'][i]; [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw();
  }).children[0].classList.add('on');
  note(L.ctrl,'Pick a dataset and a kernel; the readout runs a classifier in that kernel\'s feature space and reports training accuracy. The <b>linear</b> kernel handles the blobs but is helpless on rings and XOR — those need a <b>polynomial</b> or <b>RBF</b> kernel. That failure, not the successes, is the lesson: match the kernel to the geometry.');
  draw();
};
