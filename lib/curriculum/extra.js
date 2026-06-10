/* ================================================================
   CURRICULUM EXTENSIONS — assessment metadata, go-deeper material,
   expanded question pools, and additional lessons (Foundations world,
   la-inverse, c-exp). Imported by ./index.js after the core lessons.
   Everything here is data managed through the registries — no engine
   changes needed to add/remove any of it.
   ================================================================ */
import { LESSONS, INTERACTIVES, WRONG_WHY, QMETA } from './registry.js';
import { makeLab, slider, chips, plane, clearBg, fmt2 } from '../engine.js';

const byId = id => LESSONS.find(l => l.id === id);
const deepen = (id, cards) => { const l = byId(id); if (l) l.deeper = cards; };

/* ---------------- per-question concept tags + study focus ---------------- */
Object.assign(QMETA, {
'la-vectors':[
 {tag:'magnitude', focus:'Practice ‖v‖ = √(x²+y²) on paper with 3-4-5 style triangles until squaring-before-adding is automatic.'},
 {tag:'high dimensions', focus:'Read about embeddings: a vector is an ordered list of ANY length — search "word embeddings intuition".'},
 {tag:'unit vectors', focus:'Check several vectors: do the squared components sum to exactly 1? Normalize one by dividing by its length.'}],
'la-vecops':[
 {tag:'vector addition', focus:'Do five component-wise additions by hand, keeping signs — then verify one geometrically tip-to-tail in the lab.'},
 {tag:'scalar multiplication', focus:'Internalize: |c| changes length, sign flips direction, rotation is impossible for a scalar.'},
 {tag:'linear combinations', focus:'Write out c₁a + c₂b for a few scalars; note the result is always a vector, never a number.'}],
'la-dot':[
 {tag:'dot product arithmetic', focus:'Compute five dot products by hand, with negative components — multiply matching slots, then SUM to one number.'},
 {tag:'cosine similarity', focus:'Memorize the anchor cases: cos = 1 same direction, 0 orthogonal/unrelated, −1 opposite.'},
 {tag:'sign vs angle', focus:'Positive dot ⇔ angle < 90°, zero ⇔ exactly 90°, negative ⇔ obtuse. Sketch each case once.'}],
'la-matrix':[
 {tag:'reading transformations', focus:'Drill: column 1 = where î lands, column 2 = where ĵ lands. Identify rotation/shear/scale matrices by their columns.'},
 {tag:'matrix-vector multiply', focus:'Compute M·v as x·(col1) + y·(col2) for a few cases — the linear-combination view beats row memorization.'},
 {tag:'columns rule', focus:'Re-derive why columns (not rows) are the landing spots: M·[1,0] selects column 1.'}],
'la-matmul':[
 {tag:'composition order', focus:'Read B·A·x inside-out as B(A(x)) — write two nested function calls and match them to the product.'},
 {tag:'non-commutativity', focus:'In the lab, run rotate→shear then shear→rotate and sketch both results from memory.'},
 {tag:'product entries', focus:'Entry (i,j) = row i of LEFT · column j of RIGHT. Compute one full 2×2 product slowly.'}],
'la-det':[
 {tag:'det formula', focus:'ad − bc: drill the minus sign with five quick 2×2 determinants, including negative entries.'},
 {tag:'det = 0 collapse', focus:'Connect det 0 ⇔ space flattens ⇔ not invertible ⇔ information lost — one idea, four phrasings.'},
 {tag:'negative det', focus:'Negative determinant = orientation flip (mirror), |det| still scales area. Two independent facts.'}],
'la-eigen':[
 {tag:'eigen definition', focus:'Mv = λv means direction unchanged, length scaled by λ. Re-find both eigendirections in the lab.'},
 {tag:'diagonal matrices', focus:'For diagonal matrices the diagonal entries ARE the eigenvalues; trace is their sum, det their product.'},
 {tag:'PCA connection', focus:'Read a short PCA explainer: top eigenvectors of the covariance matrix = directions of max variance.'}],
'la-boss':[
 {tag:'representation learning', focus:'The point of layers: re-represent data until a simple boundary works. Replay the boss lab and watch the clusters separate.'},
 {tag:'what training changes', focus:'Training adjusts weight-matrix entries only — data and labels are fixed. Map each to its role.'},
 {tag:'information loss', focus:'Revisit det = 0 in the boss lab: collapse glues classes together irreversibly.'}],
'c-limits':[
 {tag:'indeterminate forms', focus:'0/0 means "factor and simplify", not "answer is 0". Practice (x²−a²)/(x−a) style limits.'},
 {tag:'one-sided limits', focus:'A limit exists only when left and right approaches agree — sketch a jump discontinuity to see it fail.'},
 {tag:'limit vs value', focus:'The limit describes the approach, not the destination: f(a) can be undefined while lim x→a f exists.'}],
'c-deriv':[
 {tag:'derivative meaning', focus:'f′(a) = instantaneous rate = tangent slope. Contrast with f(a) (height) and average rate (secant).'},
 {tag:'computing slopes', focus:'For f = x²/2, f′(x) = x. Recompute the lab readouts by hand at x = 1, 2, 3.'},
 {tag:'critical points', focus:'f′ = 0 ⇔ horizontal tangent — the flat spots where minima/maxima hide.'}],
'c-rules':[
 {tag:'power rule', focus:'xⁿ → n·xⁿ⁻¹: exponent down front, power drops one. Differentiate x⁷, x³, x by hand.'},
 {tag:'term-by-term', focus:'Differentiate a full polynomial: constants die, cx → c, coefficients multiply through.'},
 {tag:'constants', focus:'Flat line ⇒ zero slope ⇒ derivative 0 — geometric, not a convention.'}],
'c-chain':[
 {tag:'chain rule', focus:'Local slopes MULTIPLY along a pipeline: dL/dw = dL/du · du/dw. Trace the lab\'s backward pass by hand.'},
 {tag:'gradient direction', focus:'w ← w − lr·grad: negative gradient means increase w. Work one numeric example.'},
 {tag:'vanishing gradients', focus:'Multiply ten 0.5s — that\'s why deep nets starve early layers. Compute 0.5¹⁰.'}],
'c-optim':[
 {tag:'classifying critical points', focus:'Slope − → 0 → + is a minimum; + → 0 → − a maximum. Sketch both.'},
 {tag:'finding critical points', focus:'Set f′ = 0 and solve. For x³/3 − x: f′ = x² − 1 → x = ±1.'},
 {tag:'local vs global', focus:'Gradient followers stop at ANY flat spot — that\'s why initialization and restarts matter in training.'}],
'c-graddesc':[
 {tag:'update rule', focus:'x ← x − lr·f′(x): step against the slope, scaled by lr. Compute two steps by hand.'},
 {tag:'learning rate', focus:'Too small crawls, too large bounces/diverges. Reproduce both failure modes in the lab.'},
 {tag:'initialization', focus:'Different starts flow to different valleys — determinism isn\'t global optimality.'}],
'c-integrals':[
 {tag:'fundamental theorem', focus:'∫ₐᵇ f′ = f(b) − f(a): antiderivative at the ends. Verify ∫₀³ 2x dx = 9 by triangle area too.'},
 {tag:'Riemann convergence', focus:'More, thinner rectangles → error → 0. Watch the error column shrink in the lab as n grows.'},
 {tag:'probability densities', focus:'Densities integrate to 1; heights can exceed 1. Sketch a narrow tall spike with area 1.'}],
'c-boss':[
 {tag:'partial derivatives', focus:'∂f/∂x treats y as constant. Compute ∇f for f = x² + 3y and f = x²+2y² by hand.'},
 {tag:'gradient direction', focus:'∇f points steepest UPHILL; descent steps along −∇f. Verify with the lab\'s arrows.'},
 {tag:'gradients at scale', focus:'One partial per parameter, stacked into a vector — recomputed every training step.'}],
});

/* ---------------- go-deeper cards for every core lesson ---------------- */
deepen('la-vectors',[
 {title:'😵 Not clicking? Vectors three ways', body:'The same object wears three hats: a <b>list of numbers</b> [3,2] (how code stores it), a <b>point</b> (where it is), an <b>arrow</b> (how to get there). When confused, ask "which hat does this sentence need?" Magnitude only makes sense in the arrow view; indexing only in the list view.'},
 {title:'🚀 Go deeper: distance and normalization', body:'The distance between vectors a, b is ‖a−b‖ — subtract then take magnitude. Dividing a vector by its own magnitude ("normalizing") yields a unit vector preserving direction only; embeddings are usually compared after normalization, which is why cosine similarity ignores how "long" an embedding is.'}]);
deepen('la-vecops',[
 {title:'😵 Stuck? Walk it', body:'a + b literally means: walk arrow a, then from where you stopped, walk arrow b. The sum is your net displacement. Subtraction a − b is "what walk takes me from b to a". Re-do the lab watching the faint tip-to-tail ghost arrow.'},
 {title:'🚀 Go deeper: span and basis', body:'The set of ALL linear combinations c₁a + c₂b is the <b>span</b> — usually the whole plane, unless a and b are parallel (then just a line). Two non-parallel vectors form a <b>basis</b>: every point is reachable with exactly one recipe of scalars. This is why î, ĵ generate everything.'}]);
deepen('la-dot',[
 {title:'😵 Two formulas, one number', body:'a·b = a₁b₁ + a₂b₂ (algebra) and ‖a‖‖b‖cosθ (geometry) always agree. Use the first to compute, the second to interpret. If the sign surprises you, check the angle; if the magnitude surprises you, check the lengths.'},
 {title:'🚀 Go deeper: projection', body:'(a·b)/‖b‖ is the length of a\'s shadow along b. That\'s what attention scores really are: how much of the query points along each key. Projection also explains why orthogonal vectors share nothing — zero shadow.'}]);
deepen('la-matrix',[
 {title:'😵 One sentence to rule them all', body:'<b>The columns are where the basis vectors land.</b> Given any matrix, draw î→(a,c) and ĵ→(b,d) and you can SEE the transformation. Rotation: both columns rotate. Shear: one stays. Scale: columns stretch along themselves.'},
 {title:'🚀 Go deeper: bigger matrices', body:'A 3×2 matrix maps 2D → 3D (two columns, each a 3D landing spot). An n×m maps m-dim to n-dim. A "768→3072 layer" in a transformer is literally a 3072×768 matrix: 768 columns, each saying where one input basis direction lands in 3072-dim space.'}]);
deepen('la-matmul',[
 {title:'😵 Order keeps biting? Read right-to-left', body:'Treat matrices as verbs and B·A as "do A, then B" — the matrix nearest the vector acts first, like g(f(x)). When in doubt, apply each matrix to î step by step and watch where it ends up.'},
 {title:'🚀 Go deeper: associativity is the superpower', body:'(C·B)·A = C·(B·A): you can pre-multiply a whole pipeline of transforms into ONE matrix offline, then apply it cheaply to millions of vectors. Graphics engines and model-weight folding both exploit exactly this.'}]);
deepen('la-det',[
 {title:'😵 det as a volume knob', body:'Forget the formula briefly: det answers "what does this transform do to area?" ×3, ×1 (preserved), ×0 (flattened), negative (flipped). THEN the formula ad−bc is just the recipe. Re-run the lab watching only the shaded parallelogram.'},
 {title:'🚀 Go deeper: invertibility', body:'A transform is undoable iff no information is destroyed iff area isn\'t crushed to zero iff det ≠ 0. The inverse matrix A⁻¹ exactly reverses A, and det(A⁻¹) = 1/det(A) — you can\'t divide by zero, algebraically or geometrically.'}]);
deepen('la-eigen',[
 {title:'😵 The skeleton metaphor', body:'A matrix thrashes most vectors around, but its eigenvectors are the skeleton: directions it can only stretch. Knowing the skeleton + stretch factors (λ) tells you the long-run behavior — apply M many times and everything aligns with the biggest-λ direction.'},
 {title:'🚀 Go deeper: eigendecomposition', body:'When a matrix has a full set of eigenvectors, M = PDP⁻¹: change to eigen-coordinates (P⁻¹), scale each axis by its λ (diagonal D), change back. Powers become trivial: Mᵏ = PDᵏP⁻¹ — why eigenvalues govern stability of repeated processes (RNNs, Markov chains, PageRank).'}]);
deepen('la-boss',[
 {title:'😵 Why a line is enough', body:'The classifier at the end is deliberately dumb: "is x′ > 0?" All intelligence lives in the transform that makes that dumb test sufficient. If you can\'t separate the clusters, you\'re trying to make the TEST smart — instead make the SPACE friendly.'},
 {title:'🚀 Go deeper: why nonlinearity is needed', body:'Stacking matrices alone is futile: a product of linear maps is one linear map. Real networks insert a nonlinearity (ReLU) between layers, letting them bend space, not just stretch it — that\'s what separates spirals and XOR patterns no single matrix can.'}]);
deepen('c-limits',[
 {title:'😵 The hole vs the road', body:'Picture driving toward a missing bridge plank: the road\'s height as you approach is the LIMIT; the missing plank is f(a) being undefined. The approach is real and measurable even though the destination is absent. The lab\'s fine slider is that drive.'},
 {title:'🚀 Go deeper: continuity & ε–δ', body:'f is <b>continuous</b> at a when lim x→a f(x) = f(a) — approach matches destination. The formal ε–δ definition just pins down "approach": for any tolerance ε around the limit, some window δ around a keeps f inside it. Every derivative you\'ll ever take quietly relies on this machinery.'}]);
deepen('c-deriv',[
 {title:'😵 Zoom in', body:'A smooth curve viewed under a microscope looks straight. The derivative is the slope of that microscopic straight line. The h-slider IS the microscope: shrinking h zooms in until secant and tangent are indistinguishable.'},
 {title:'🚀 Go deeper: differentiability', body:'Not everything has a derivative: |x| has a corner at 0 (left slope −1, right slope +1 — the limit disagrees with itself). ReLU is exactly |x|\'s cousin and deep learning shrugs: pick 0 or 1 at the kink ("subgradient") and training works fine.'}]);
deepen('c-rules',[
 {title:'😵 Why does the exponent hop down?', body:'(x+h)ⁿ expands to xⁿ + n·xⁿ⁻¹h + (terms with h²...). Subtract xⁿ, divide by h, let h→0: only n·xⁿ⁻¹ survives. The rule is the binomial theorem with the dust blown off — derive it once for n=2 and own it forever.'},
 {title:'🚀 Go deeper: product & quotient rules', body:'(fg)′ = f′g + fg′ — both factors take turns changing. Quotient rule follows from product + chain. With power, product and chain rules you can differentiate anything a neural net is made of.'}]);
deepen('c-chain',[
 {title:'😵 Gears, not formulas', body:'Picture gears: w turns u at ratio du/dw, u turns L at ratio dL/du. Total ratio multiplies. A pipeline of five gears multiplies five ratios — that\'s a 5-layer net\'s gradient, no more.'},
 {title:'🚀 Go deeper: full backprop', body:'Real layers have many inputs/outputs, so the local "ratio" is a matrix of partials (the <b>Jacobian</b>) and backprop multiplies Jacobians right-to-left. The trick that makes it cheap: propagate the gradient VECTOR backwards instead of forming full matrices — that\'s reverse-mode autodiff.'}]);
deepen('c-optim',[
 {title:'😵 Read slopes like a hiker', body:'You\'re blindfolded on a hill: f′ > 0 means ground rises ahead — walking right goes up. At f′ = 0 it\'s flat underfoot: summit, valley floor, or a ledge. The second derivative (slope of the slope) tells which: f″ > 0 valley, f″ < 0 summit.'},
 {title:'🚀 Go deeper: saddles in high dimensions', body:'In millions of dimensions, true local minima are rare — most flat points are <b>saddles</b> (down in some directions, up in others). The Hessian\'s eigenvalues (World 1!) diagnose them: mixed signs = saddle. This is why "stuck in a local min" is usually really "slow near a saddle".'}]);
deepen('c-graddesc',[
 {title:'😵 Three knobs, one ball', body:'Everything you observe reduces to: where you start (which basin you\'ll find), how big you step (lr), how many steps. Re-run the lab varying ONE knob at a time and narrate what changes — that habit transfers directly to debugging real training runs.'},
 {title:'🚀 Go deeper: momentum & Adam', body:'Plain GD forgets the past each step. <b>Momentum</b> accumulates velocity (rolls through small bumps); <b>Adam</b> additionally rescales each parameter\'s step by its recent gradient sizes. Both are three-line modifications of the update you just used.'}]);
deepen('c-integrals',[
 {title:'😵 Accumulation, not area', body:'"Area under the curve" is the picture; the concept is <b>accumulating a rate</b>. Speed curve → distance traveled. Power curve → energy used. The rectangle sum literally adds (rate × small time) chunks. Area is just what accumulation looks like on paper.'},
 {title:'🚀 Go deeper: why the fundamental theorem is true', body:'Define A(x) = area so far. Nudging x by h adds a sliver ≈ f(x)·h, so A′(x) = f(x) — accumulating then differentiating returns the original. That one observation welds the two halves of calculus together.'}]);
deepen('c-boss',[
 {title:'😵 Hold one knob still', body:'∂f/∂x is ordinary 1-D calculus done while pretending y is a constant. Compute both partials separately, stack them — done. The lab\'s readout shows exactly this decomposition at every mouse position.'},
 {title:'🚀 Go deeper: the loss landscape view of training', body:'Training a network IS this lab in 70-billion-D: loss = f(weights), backprop computes ∇f, the optimizer steps along −∇f. Learning-rate schedules, warmup, gradient clipping — all are tweaks to the step you just took on the contour map. You now have the full picture.'}]);

/* ---------------- expanded question pools (flagship lessons) ---------------- */
function addQ(id, q, traps){
  const l = byId(id); if(!l) return;
  const qi = l.quiz.length;
  l.quiz.push(q);
  if(traps){ WRONG_WHY[id] = WRONG_WHY[id]||[]; WRONG_WHY[id][qi] = traps; }
}
addQ('la-vectors',
 {q:'Vectors <code>u=[1,2]</code> and <code>v=[3,1]</code>. What is the distance between them (as points)?',
  opts:['√5','√17','3','5'], a:0, tag:'distance', focus:'Distance = ‖u−v‖: subtract component-wise, then take the magnitude.',
  why:'u−v = [−2, 1]; ‖[−2,1]‖ = √(4+1) = √5. Distance is the magnitude of the difference.'},
 {1:'√17 is ‖u+v‖-ish territory — distance uses the DIFFERENCE u−v, not the sum.',
  2:'3 adds |−2|+|1| — Manhattan distance again. Euclidean squares first.',
  3:'5 is the squared distance (4+1). One more step: take the root.'});
addQ('la-vectors',
 {q:'Normalizing <code>[6, 8]</code> (making it length 1) gives…',
  opts:['<code>[0.6, 0.8]</code>','<code>[1, 1]</code>','<code>[3, 4]</code>','<code>[6/14, 8/14]</code>'], a:0,
  tag:'unit vectors', focus:'Normalize = divide each component by the magnitude. Compute the magnitude first.',
  why:'‖[6,8]‖ = 10 (6-8-10 triangle), so divide both components by 10: [0.6, 0.8] — same direction, length 1.'},
 {1:'[1,1] has length √2 and a different direction entirely — normalizing preserves direction.',
  2:'[3,4] is the vector halved — length 5, not 1. Divide by the full magnitude, 10.',
  3:'Dividing by the component SUM (14) is a common slip; divide by the magnitude √(36+64) = 10.'});
addQ('la-matrix',
 {q:'Which matrix reflects the plane over the <b>x-axis</b>?',
  opts:['<code>[[1,0],[0,−1]]</code>','<code>[[−1,0],[0,1]]</code>','<code>[[0,1],[1,0]]</code>','<code>[[−1,0],[0,−1]]</code>'], a:0,
  tag:'reading transformations', focus:'Build transforms column-by-column: decide where î and ĵ should land, then write them down.',
  why:'Over the x-axis: î=[1,0] stays put (column 1), ĵ=[0,1] flips to [0,−1] (column 2).'},
 {1:'[[−1,0],[0,1]] flips î instead — that\'s reflection over the Y-axis.',
  2:'[[0,1],[1,0]] swaps î and ĵ — reflection over the diagonal y=x.',
  3:'Flipping BOTH basis vectors is a 180° rotation, not a reflection.'});
addQ('la-matrix',
 {q:'M sends î→[2,0] and ĵ→[1,1]. Where does <code>[1, 2]</code> land?',
  opts:['<code>[4, 2]</code>','<code>[2, 2]</code>','<code>[3, 1]</code>','<code>[2, 1]</code>'], a:0,
  tag:'matrix-vector multiply', focus:'M·[x,y] = x·(image of î) + y·(image of ĵ) — the linear-combination view.',
  why:'1·[2,0] + 2·[1,1] = [2,0] + [2,2] = [4,2]. Every output is a combination of the columns.'},
 {1:'[2,2] is just 2·ĵ-image — you dropped the î contribution.',
  2:'[3,1] sums the columns once each — but the input weights them: ×1 and ×2.',
  3:'[2,1] is column 1 + column 2 halved... re-apply the recipe x·col1 + y·col2 with x=1, y=2.'});
addQ('c-deriv',
 {q:'f(x) = x² − 4x. Where is its tangent line horizontal?',
  opts:['x = 2','x = 0','x = 4','x = −2'], a:0,
  tag:'critical points', focus:'Horizontal tangent ⇔ f′(x) = 0. Differentiate, set to zero, solve.',
  why:'f′(x) = 2x − 4 = 0 → x = 2. (That\'s the bottom of this upward parabola.)'},
 {1:'x = 0 is where f crosses the axis (f(0)=0) — height, not slope. Set f′, not f, to zero.',
  2:'x = 4 is the other axis crossing (f(4)=0). Same trap: roots of f are not flat spots.',
  3:'x = −2 would solve 2x + 4 = 0 — sign slip differentiating −4x (it gives −4, not +4).'});
addQ('c-deriv',
 {q:'A car\'s position is p(t). What is p′(t)?',
  opts:['Its velocity','Its acceleration','Distance remaining','Average speed for the trip'], a:0,
  tag:'derivative meaning', focus:'First derivative of position = velocity; second = acceleration. Rates of rates.',
  why:'The derivative of position with respect to time is the instantaneous rate of change of position: velocity.'},
 {1:'Acceleration is the derivative OF velocity — p″(t), one level deeper.',
  2:'Distance remaining isn\'t a rate at all; derivatives measure change per unit time.',
  3:'Average speed is total distance / total time — the SECANT. The derivative is the instantaneous version.'});
addQ('c-graddesc',
 {q:'With lr = 0.5 at x = 4 on f(x) = x², where does one gradient-descent step land?',
  opts:['x = 0','x = 2','x = −4','x = 3.5'], a:0,
  tag:'update rule', focus:'Apply x ← x − lr·f′(x) numerically: f′(x) = 2x here.',
  why:'f′(4) = 8; x ← 4 − 0.5·8 = 0. (Perfect jump to the minimum — lr = 0.5 is special for x².)'},
 {1:'x = 2 would be lr = 0.25. The step is lr × slope = 0.5 × 8 = 4.',
  2:'x = −4 is a full overshoot (lr = 1 territory): 4 − 8. Check the lr scaling.',
  3:'x = 3.5 treats the step as lr alone — the slope multiplies it: 0.5 × 8 = 4.'});
addQ('c-graddesc',
 {q:'Halving the learning rate generally makes training…',
  opts:['Slower but more stable','Faster and less stable','Reach a different kind of minimum','Use less memory'], a:0,
  tag:'learning rate', focus:'lr trades speed against stability: smaller = safer crawl, larger = faster but bouncier.',
  why:'Smaller steps follow the landscape more faithfully (less overshoot) at the cost of more steps — the core lr trade-off.'},
 {1:'Backwards — larger learning rates are the fast-but-bouncy direction.',
  2:'The minima don\'t change kind; only the path to them changes. (Step size can affect WHICH basin, but not minimum "types".)',
  3:'lr doesn\'t affect memory; it\'s a scalar multiplier on the update.'});

/* ================== WORLD 0: FOUNDATIONS ================== */

LESSONS.push({
  id:'pre-functions', world:'pre', emoji:'⚙️', title:'Functions: Machines & Graphs',
  sub:'f(x) is a machine: number in, number out. The graph is its complete biography.',
  learn:`<p>A <strong>function</strong> is a machine: feed in a number x, get out exactly one number f(x). The notation <code>f(x) = x² − 2</code> means "the machine squares the input, then subtracts 2".</p>
  <p>The <strong>graph</strong> plots every (input, output) pair: height above x is the machine's answer at x. Reading graphs fluently is the core skill:</p>
  <p>• Where the curve crosses the x-axis → <strong>roots</strong> (f(x) = 0)<br>
  • Higher curve → bigger output<br>
  • Steeper curve → output changing faster (foreshadowing: derivatives!)</p>
  <div class="formula">y = f(x)   —   "height of the curve above x"</div>`,
  ml:`Every model IS a function — usually a monstrous one: input an image (a vector!), output "cat: 0.97". Loss curves, activation functions (ReLU, sigmoid), learning-rate schedules: all graphs you'll read daily. This lesson is literacy training.`,
  deeper:[
   {title:'😵 Stuck? The vending machine test', body:'A function must give ONE output per input — a vending machine where A3 sometimes drops chips and sometimes soda is broken. That\'s why a circle isn\'t a function graph (one x, two heights) but a parabola is. "Exactly one output" is the entire definition.'},
   {title:'🚀 Go deeper: composing machines', body:'Machines chain: g(f(x)) feeds f\'s output into g. Order matters — square-then-add-1 ≠ add-1-then-square. Deep networks are dozens of chained machines, and the chain rule (World 2) differentiates exactly such chains.'}],
  interactive:'prefn',
  quiz:[
   {q:'f(x) = x² − 2. What is f(3)?', opts:['7','4','1','9'], a:0,
    tag:'evaluating functions', focus:'Substitute mechanically: replace every x with the input, then arithmetic.',
    why:'f(3) = 3² − 2 = 9 − 2 = 7.'},
   {q:'A "root" of f is a point where…', opts:['f(x) = 0 — the graph crosses the x-axis','x = 0 — the y-axis','The graph is steepest','f is undefined'], a:0,
    tag:'roots', focus:'Roots solve f(x) = 0: graphically, x-axis crossings.',
    why:'Root ⇔ output zero ⇔ the curve touches height 0 — the x-axis.'},
   {q:'Which is NOT a function of x?', opts:['A circle: x² + y² = 1','y = |x|','y = x³','y = 7'], a:0,
    tag:'definition of function', focus:'One input → exactly one output. Apply the vertical-line test to each graph.',
    why:'At x = 0 the circle has two heights (y = ±1) — two outputs for one input. The others pass the vertical-line test.'},
   {q:'If the graph of f is higher at x=2 than at x=5, then…', opts:['f(2) &gt; f(5)','f(2) &lt; f(5)','2 &gt; 5','f is decreasing everywhere'], a:0,
    tag:'reading graphs', focus:'Height of the curve = value of the function. Translate between picture and notation.',
    why:'Curve height IS the output value: higher at 2 means f(2) > f(5). Nothing about global behavior follows.'},
  ],
});
WRONG_WHY['pre-functions']=[
 {1:'4 = 3+1? Substitute fully: square FIRST (9), then subtract 2.',2:'1 = 3−2 skips the squaring. The machine squares before subtracting.',3:'9 is x² — one more step: subtract 2.'},
 {1:'x = 0 is the y-axis crossing (the value f(0)), a different landmark.',2:'Steepness is about derivatives, not roots.',3:'Undefined points are holes/gaps, not roots.'},
 {1:'|x| gives one output per input (V shape) — a fine function.',2:'x³ is one-to-one — certainly a function.',3:'y = 7 ignores x but still gives exactly one output: a constant function.'},
 {1:'Height read backwards — higher curve means bigger value.',2:'2 < 5 always; inputs aren\'t being compared.',3:'One comparison at two points says nothing about everywhere.'}];
INTERACTIVES.prefn = function(stage, api){
  const L=makeLab(stage);
  const fns=[{n:'line: 0.8x + 1',f:x=>0.8*x+1},{n:'parabola: x²/2 − 2',f:x=>x*x/2-2},{n:'vee: |x| − 1.5',f:x=>Math.abs(x)-1.5}];
  let fi=1, x=1.2, tried={1:true};
  const m=api.missions([
    {text:'On the <b>parabola</b>, drag to a root (f(x) ≈ 0)', xp:20, check:s=>s.fi===1&&Math.abs(s.y)<.08},
    {text:'On the <b>line</b>, find where f(x) = 3', xp:20, check:s=>s.fi===0&&Math.abs(s.y-3)<.1},
    {text:'Inspect all <b>three machines</b>', xp:15, check:s=>s.all},
  ]);
  const P=plane(L.ctx,L.W,L.H,55);
  let drag=false;
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    P.fn(fns[fi].f,'#7c5cff',3);
    const y=fns[fi].f(x);
    L.ctx.setLineDash([4,4]); L.ctx.strokeStyle='rgba(0,212,255,.5)'; L.ctx.lineWidth=1.5;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(x),P.sy(0)); L.ctx.lineTo(P.sx(x),P.sy(y)); L.ctx.stroke();
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(0),P.sy(y)); L.ctx.lineTo(P.sx(x),P.sy(y)); L.ctx.stroke();
    L.ctx.setLineDash([]);
    P.dot(x,y,7,'#00d4ff');
    L.readout.innerHTML='machine: '+fns[fi].n+'<br>x = '+x.toFixed(2)+'  →  f(x) = '+y.toFixed(2);
    m.update({fi, y, all:tried[0]&&tried[1]&&tried[2]});
  }
  L.canvas.addEventListener('pointerdown',e=>{drag=true;L.canvas.setPointerCapture(e.pointerId);mv(e);});
  L.canvas.addEventListener('pointermove',mv);
  L.canvas.addEventListener('pointerup',()=>drag=false);
  function mv(e){ if(!drag)return; const c=L.toCanvas(e); x=Math.max(-5,Math.min(5,P.wx(c.x))); draw(); }
  chips(L.ctrl,'MACHINE',fns.map(f=>f.n),(i,btn,row)=>{ fi=i; tried[i]=true;
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); }).children[1].classList.add('on');
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Drag along the x-axis; the dashed lines show input → output. Watch how the same x gives different outputs in different machines.</div>';
  L.ctrl.appendChild(note);
  draw();
};

LESSONS.push({
  id:'pre-slope', world:'pre', emoji:'📏', title:'Slope & Fitting Lines',
  sub:'y = mx + b, and your first taste of what "training a model" means: fitting a line by hand.',
  learn:`<p>A line is the simplest function: <code>y = mx + b</code>. Two numbers describe it completely:</p>
  <p>• <strong>m — slope</strong>: rise over run. How much y changes per unit of x. Negative = downhill.<br>
  • <strong>b — intercept</strong>: where the line crosses the y-axis (the value at x = 0).</p>
  <div class="formula">m = (y₂ − y₁) / (x₂ − x₁)</div>
  <p>In the lab you'll fit a line to noisy data points by adjusting m and b while watching the <strong>squared error</strong> (sum of squared vertical misses). Minimizing that error is — literally — <strong>linear regression</strong>, the first machine-learning model ever.</p>`,
  ml:`You're about to do gradient descent's job by hand: turn knobs (parameters m, b) to shrink a loss (squared error). Every model you'll ever train is this, with more knobs. Slope also previews derivatives: m IS the rate of change.`,
  deeper:[
   {title:'😵 Stuck? Anchor then tilt', body:'Fit in two moves: first set b so the line hits the leftmost data, then tilt m until the right side matches. Adjusting one knob at a time and watching the error is exactly "coordinate descent" — a real optimization method.'},
   {title:'🚀 Go deeper: why SQUARED error?', body:'Squaring punishes big misses much more than small ones, is always positive (misses don\'t cancel), and — calculus preview — has a clean derivative, so the best m, b can be solved in closed form. That solution is the "normal equation" of linear regression.'}],
  interactive:'preslope',
  quiz:[
   {q:'The line through (1, 2) and (3, 8) has slope…', opts:['3','6','2','1/3'], a:0,
    tag:'computing slope', focus:'m = Δy/Δx between any two points on the line.',
    why:'m = (8−2)/(3−1) = 6/2 = 3.'},
   {q:'In y = mx + b, what does b control?', opts:['Height where the line crosses the y-axis','The steepness','The x-axis crossing','The line\'s length'], a:0,
    tag:'intercept', focus:'b = f(0): the value when x is zero. m handles steepness.',
    why:'At x = 0, y = b — the y-axis crossing. Steepness belongs to m.'},
   {q:'Fitting a line by minimizing squared error is called…', opts:['Linear regression','Clustering','Classification','Integration'], a:0,
    tag:'regression', focus:'Match the names to the tasks: regression fits continuous outputs; classification picks categories.',
    why:'Least-squares line fitting IS linear regression — the original supervised learning algorithm.'},
   {q:'A line with m = −2 means…', opts:['y drops 2 for every 1 step right','y rises 2 per step right','The line crosses y at −2','The line is vertical'], a:0,
    tag:'slope sign', focus:'Sign of m = direction; magnitude = steepness. Negative slopes go downhill left-to-right.',
    why:'Slope is change in y per unit x: −2 means down 2 per step right.'},
  ],
});
WRONG_WHY['pre-slope']=[
 {1:'6 is just Δy — divide by Δx = 2.',2:'2 is Δx. Slope is rise OVER run: 6/2.',3:'1/3 is run over rise — inverted.'},
 {1:'Steepness is m\'s job.',2:'The x-crossing depends on BOTH m and b (it\'s −b/m).',3:'Lines are infinite; they don\'t have lengths.'},
 {1:'Clustering groups unlabeled points — no line, no target.',2:'Classification predicts categories, not continuous values.',3:'Integration accumulates areas — different world.'},
 {1:'Sign flipped: negative slope falls as x grows.',2:'That\'s b\'s meaning, not m = −2.',3:'Vertical lines have UNDEFINED slope, not −2.'}];
INTERACTIVES.preslope = function(stage, api){
  const L=makeLab(stage);
  const pts=[[0,0.6],[1,1.6],[2,3.0],[3,4.0]];
  let mm=0.4, bb=2.0;
  const m=api.missions([
    {text:'Get the squared error under <b>0.3</b>', xp:20, check:s=>s.err<.3},
    {text:'Now tighten the fit: error under <b>0.06</b>', xp:25, check:s=>s.err<.06},
    {text:'Sabotage: make m <b>negative</b> and watch the error explode (&gt; 5)', xp:15, check:s=>s.m<0&&s.err>5},
  ]);
  const P=plane(L.ctx,L.W,L.H,62,L.W/2-60,L.H/2+60);
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    P.fn(x=>mm*x+bb,'#7c5cff',3);
    let err=0;
    for(const [px,py] of pts){
      const pred=mm*px+bb; err+=(py-pred)*(py-pred);
      L.ctx.setLineDash([3,3]); L.ctx.strokeStyle='rgba(255,92,122,.6)'; L.ctx.lineWidth=1.5;
      L.ctx.beginPath(); L.ctx.moveTo(P.sx(px),P.sy(py)); L.ctx.lineTo(P.sx(px),P.sy(pred)); L.ctx.stroke();
      L.ctx.setLineDash([]);
      P.dot(px,py,6,'#ffc94d');
    }
    L.readout.innerHTML='y = '+mm.toFixed(2)+'x + '+bb.toFixed(2)+'<br>squared error = '+err.toFixed(3);
    m.update({err, m:mm});
  }
  slider(L.ctrl,'m — slope',-2,3,0.02,0.4,v=>v.toFixed(2),v=>{mm=v;draw();});
  slider(L.ctrl,'b — intercept',-2,4,0.02,2.0,v=>v.toFixed(2),v=>{bb=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Gold dots = data. Red dashes = your misses (residuals). You are the optimizer: turn the two knobs to shrink the error. Congratulations — you\'re training a model.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== NEW: la-inverse (between det and eigen) ================== */
LESSONS.push({
  id:'la-inverse', world:'la', order:5.5, emoji:'🔓', title:'Solving Ax = b & the Inverse',
  sub:'Run a transformation backwards. When det ≠ 0 there is exactly one answer.',
  learn:`<p>The central question of linear algebra: given the transform A and a target <code>b</code>, <strong>which input x lands on b?</strong></p>
  <div class="formula">A·x = b   →   x = A⁻¹·b</div>
  <p>The <strong>inverse</strong> A⁻¹ is the transformation that exactly undoes A — apply A, then A⁻¹, and every vector returns home. It exists precisely when <strong>det A ≠ 0</strong> (last lesson!): a collapse can't be undone.</p>
  <p>When A IS singular (det = 0), outputs only cover a line — most targets b are simply <em>unreachable</em>, and the best you can do is the closest point on that line. That "best reachable approximation" idea is <strong>least squares</strong>.</p>`,
  ml:`Solving linear systems is the workhorse under regression (normal equations), Kalman filters, and second-order optimizers. And "unreachable target → take the closest point" is the geometric soul of least squares — the loss your first lab in World 0 minimized.`,
  deeper:[
   {title:'😵 Stuck? Inverse as un-doing', body:'If A rotates 30° and doubles lengths, A⁻¹ rotates −30° and halves them — describe any invertible transform in words and the inverse is the words reversed. The formula for 2×2, A⁻¹ = (1/det)·[[d,−b],[−c,a]], is just that reversal in numbers (note det in the denominator: zero ⇒ no inverse).'},
   {title:'🚀 Go deeper: why nobody computes A⁻¹', body:'In practice solvers factor A (LU/QR decompositions) and solve Ax = b directly — it\'s faster and numerically safer than forming A⁻¹. "Solve, don\'t invert" is a numerical-computing mantra worth keeping.'}],
  interactive:'lainverse',
  quiz:[
   {q:'A⁻¹ exists exactly when…', opts:['det A ≠ 0','A is square with positive entries','det A &gt; 0','A is symmetric'], a:0,
    tag:'invertibility', focus:'Invertible ⇔ det ≠ 0 ⇔ no collapse ⇔ unique solution for every b. One equivalence chain.',
    why:'Nonzero determinant means no information was destroyed, so the transform can be reversed. Sign doesn\'t matter — flips are reversible.'},
   {q:'A is singular (det = 0) and b is OFF the line A\'s outputs cover. Then Ax = b has…', opts:['No solution','Exactly one solution','Infinitely many solutions','x = 0 as the solution'], a:0,
    tag:'singular systems', focus:'Singular A reaches only a line of outputs: targets off it are unreachable; targets on it are hit by infinitely many inputs.',
    why:'Outputs of a singular 2×2 span only a line. A target off the line is never reached — no solution (the lab made you feel this).'},
   {q:'Applying A then A⁻¹ to any vector v gives…', opts:['v itself','The zero vector','2v','A·v'], a:0,
    tag:'inverse meaning', focus:'A⁻¹A = I, the identity — the do-nothing transformation.',
    why:'A⁻¹ undoes A by definition: A⁻¹(Av) = (A⁻¹A)v = Iv = v.'},
   {q:'For A = [[2,0],[0,4]], A⁻¹ = ?', opts:['<code>[[0.5,0],[0,0.25]]</code>','<code>[[−2,0],[0,−4]]</code>','<code>[[4,0],[0,2]]</code>','<code>[[2,0],[0,4]]</code>'], a:0,
    tag:'computing inverses', focus:'Diagonal matrices invert per-axis: each stretch factor becomes its reciprocal.',
    why:'Undo "×2 in x, ×4 in y" with "×½ in x, ×¼ in y". Diagonal inverses are just reciprocals.'},
  ],
});
WRONG_WHY['la-inverse']=[
 {1:'Positivity is irrelevant — [[−1,0],[0,1]] (a flip) inverts itself fine.',2:'det = −2 is perfectly invertible: flips are reversible. Only ZERO kills the inverse.',3:'Symmetry is unrelated; plenty of symmetric matrices are singular (e.g. all-ones).'},
 {1:'Exactly one solution is the healthy det ≠ 0 case.',2:'Infinitely many happens when b IS on the output line (the misses collapse together).',3:'x = 0 maps to 0 — it only solves b = 0.'},
 {1:'Zero would mean A⁻¹ destroyed v — inverses destroy nothing.',2:'2v would mean the round trip stretched space; undo means NO net change.',3:'A·v is the forward trip only — the inverse brings it back.'},
 {1:'Negating doesn\'t undo scaling: ×2 then ×(−2) gives −4x, not x.',2:'Swapping the factors composes to ×8 per axis, worse.',3:'Same matrix twice = ×4, ×16 — squared, not undone.'}];
INTERACTIVES.lainverse = function(stage, api){
  const L=makeLab(stage);
  const A1=[2,1,1,1], A2=[2,1,4,2]; // invertible (det 1) / singular (det 0)
  let A=A1, sing=false, x={x:.5,y:.5}, solved1=false;
  const m=api.missions([
    {text:'Solve <b>Ax = b</b> for the gold target (drag x until Ax hits it)', xp:25, check:s=>s.hit&&!s.sing},
    {text:'Solve it again for the <b>new target</b> (it moves once you succeed!)', xp:25, check:s=>s.hit2},
    {text:'Switch to the <b>singular A</b> and get Ax as close as possible (within 1.9) — notice it can never reach', xp:20, check:s=>s.sing&&s.dist<1.9},
  ]);
  let b={x:3,y:2};
  const P=plane(L.ctx,L.W,L.H,46);
  let drag=false;
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const Ax={x:A[0]*x.x+A[1]*x.y, y:A[2]*x.x+A[3]*x.y};
    if(sing){ // show the reachable line (span of columns: direction (1,2))
      L.ctx.setLineDash([6,6]); L.ctx.strokeStyle='rgba(255,201,77,.4)'; L.ctx.lineWidth=2;
      L.ctx.beginPath(); L.ctx.moveTo(P.sx(-3),P.sy(-6)); L.ctx.lineTo(P.sx(3),P.sy(6)); L.ctx.stroke();
      L.ctx.setLineDash([]);
    }
    P.dot(b.x,b.y,8,'rgba(255,201,77,.9)');
    P.arrow(0,0,x.x,x.y,'#7c5cff',4,'x');
    P.arrow(0,0,Ax.x,Ax.y,'#00d4ff',4,'Ax');
    P.dot(x.x,x.y,7,'#b9a8ff');
    const dist=Math.hypot(Ax.x-b.x,Ax.y-b.y);
    const hit=dist<.15;
    if(hit&&!sing&&!solved1){ solved1=true; b={x:1,y:2}; setTimeout(draw,400); }
    L.readout.innerHTML='A = ['+A[0]+' '+A[1]+'; '+A[2]+' '+A[3]+']  det = '+(A[0]*A[3]-A[1]*A[2])+'<br>‖Ax − b‖ = '+dist.toFixed(2)+(sing?'<br>⚠ outputs trapped on the dashed line':'');
    m.update({hit:hit&&!solved1?true:hit, hit2:solved1&&hit, sing, dist});
  }
  L.canvas.addEventListener('pointerdown',e=>{drag=true;L.canvas.setPointerCapture(e.pointerId);mv(e);});
  L.canvas.addEventListener('pointermove',mv);
  L.canvas.addEventListener('pointerup',()=>drag=false);
  function mv(e){ if(!drag)return; const c=L.toCanvas(e); x.x=P.wx(c.x); x.y=P.wy(c.y); draw(); }
  chips(L.ctrl,'MATRIX',['A (det = 1)','A singular (det = 0)'],(i,btn,row)=>{
    sing=i===1; A=sing?A2:A1; if(sing) b={x:3,y:2};
    [...row.children].forEach(bn=>bn.classList.remove('on')); btn.classList.add('on'); draw();
  }).children[0].classList.add('on');
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">You\'re computing A⁻¹b by feel: drag the <b style="color:#b9a8ff">input x</b> until <b style="color:#7fe7ff">Ax</b> covers the gold target. Then break it with the singular matrix — the output is imprisoned on a line.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== NEW: c-exp (after power rule) ================== */
LESSONS.push({
  id:'c-exp', world:'calc', order:10.5, emoji:'🌿', title:'e and Exponentials',
  sub:'The function that is its own derivative — and why it runs softmax, sigmoid and every probability in ML.',
  learn:`<p>Exponentials <code>f(x) = aˣ</code> grow by <em>multiplication</em>: each unit step multiplies by a. Their defining magic: the derivative is <strong>proportional to the function itself</strong>:</p>
  <div class="formula">d/dx aˣ = aˣ · ln(a)</div>
  <p>One special base makes that constant exactly 1 — growth rate equals current value. That base is <strong>e ≈ 2.718</strong>:</p>
  <div class="formula">d/dx eˣ = eˣ</div>
  <p>You'll <em>discover</em> e in the lab by sliding the base until the derivative curve lies exactly on the function. Its inverse, the <strong>natural log</strong> ln, converts multiplication into addition — ln(ab) = ln a + ln b — which is why ML sums log-probabilities instead of multiplying tiny numbers.</p>`,
  ml:`eˣ is everywhere: <b>softmax</b> (eˣ per logit, normalized) turns scores into probabilities; <b>sigmoid</b> 1/(1+e⁻ˣ) squashes to (0,1); <b>cross-entropy</b> is a sum of ln's. And eˣ being its own derivative makes all their gradients beautifully simple — softmax + cross-entropy backprops to just (prediction − truth).`,
  deeper:[
   {title:'😵 Stuck? Money intuition', body:'100% annual interest compounded yearly turns $1 → $2. Compounded monthly: $2.61. Daily: $2.71. Continuously: exactly $e. e is what "growing at a rate equal to your current size" accumulates to in one unit of time — that\'s the same sentence as f′ = f.'},
   {title:'🚀 Go deeper: ln as an area, logs in practice', body:'ln(x) can be DEFINED as the area under 1/t from 1 to x (integral lesson ahead!), and its derivative is 1/x. Practical ML corollary: probabilities multiply into underflow (10⁻³⁰⁰...), but their logs add safely — every "log-likelihood" you\'ll ever see is this trick.'}],
  interactive:'cexp',
  quiz:[
   {q:'What is special about f(x) = eˣ?', opts:['It equals its own derivative','It grows faster than any function','Its derivative is 1','It\'s the inverse of x²'], a:0,
    tag:'definition of e', focus:'e is THE base where d/dx aˣ = aˣ — growth rate equals current value.',
    why:'d/dx eˣ = eˣ: at every point, slope = height. That\'s e\'s defining property, found in your lab.'},
   {q:'ln(a·b) = ?', opts:['ln a + ln b','ln a · ln b','ln(a + b)','aᵇ'], a:0,
    tag:'log rules', focus:'Logs turn products into sums — the single most-used log identity in ML.',
    why:'Logarithms convert multiplication to addition. This is why log-likelihoods are summed across a dataset.'},
   {q:'d/dx 2ˣ = ?', opts:['2ˣ · ln 2','x · 2ˣ⁻¹','2ˣ','ln 2'], a:0,
    tag:'exponential derivatives', focus:'aˣ differentiates to aˣ·ln a — the power rule does NOT apply (x is the exponent, not the base).',
    why:'Exponentials keep themselves and pick up ln(base): 2ˣ·ln 2 ≈ 0.693·2ˣ, matching your lab readout at a = 2.'},
   {q:'Softmax exponentiates scores before normalizing. A key consequence:', opts:['Bigger score gaps become much bigger probability gaps','All outputs become equal','Negative scores are discarded','Probabilities can exceed 1'], a:0,
    tag:'softmax behavior', focus:'eˣ amplifies differences: a +2 logit gap becomes a ×e² ≈ 7.4 probability ratio.',
    why:'Exponentiation is multiplicative: score differences turn into probability RATIOS (e^gap), sharpening the winner.'},
  ],
});
WRONG_WHY['c-exp']=[
 {1:'Factorials and x^x grow faster — e\'s magic is the self-derivative, not raw speed.',2:'Derivative 1 belongs to f(x) = x. eˣ\'s derivative is eˣ itself.',3:'The inverse of x² is √x; eˣ\'s inverse is ln x.'},
 {1:'Multiplying logs ≈ nothing useful; the product rule lives INSIDE the log: ln(ab) = ln a + ln b.',2:'ln(a+b) doesn\'t simplify at all — a classic trap.',3:'aᵇ is what you\'d exponentiate, not a log identity.'},
 {1:'x·2ˣ⁻¹ is the power rule — wrong tool: that\'s for xⁿ (variable base, fixed exponent).',2:'Plain 2ˣ misses the ln 2 factor — only base e has factor 1.',3:'ln 2 alone is the constant; the function 2ˣ stays in the derivative.'},
 {1:'Softmax outputs always sum to 1 but are rarely equal — equality needs equal scores.',2:'Negative scores are fine: e^negative is small but positive.',3:'Normalization caps every probability at 1.'}];
INTERACTIVES.cexp = function(stage, api){
  const L=makeLab(stage);
  let a=2.0;
  const m=api.missions([
    {text:'Slide the base until the derivative curve <b>lies on top of</b> the function — you just found <b>e</b>!', xp:30, check:s=>Math.abs(s.lna-1)<.02},
    {text:'Set a = 2 and read the ratio f′/f (it\'s ln 2 ≈ 0.693)', xp:20, check:s=>Math.abs(s.a-2)<.03},
    {text:'Push the growth ratio above <b>1.3</b>', xp:15, check:s=>s.lna>1.3},
  ]);
  const P=plane(L.ctx,L.W,L.H,52,L.W/2-110,L.H-60);
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const f=x=>Math.pow(a,x);
    const lna=Math.log(a);
    P.fn(f,'#7c5cff',3.5);
    P.fn(x=>f(x)*lna,'rgba(0,212,255,.85)',2);
    L.readout.innerHTML='f(x) = '+a.toFixed(2)+'<sup>x</sup><br>f′/f = ln('+a.toFixed(2)+') = '+lna.toFixed(3)+
      (Math.abs(lna-1)<.02?'<br>✨ THIS IS e!':'');
    m.update({a, lna});
  }
  slider(L.ctrl,'base a',1.2,4,0.01,2,v=>v.toFixed(2),v=>{a=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b style="color:#b9a8ff">Purple</b> = aˣ. <b style="color:#7fe7ff">Cyan</b> = its derivative. Below e the derivative runs under the function; above e it overtakes. At exactly one base they coincide — find it.</div>';
  L.ctrl.appendChild(note);
  draw();
};

