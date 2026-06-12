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
  learn:`<p>A <strong>function</strong> is a machine with one ironclad rule: feed in a number x, and it returns <em>exactly one</em> number f(x). Notation like <code>f(x) = x² − 2</code> is both a recipe — "square the input, then subtract 2" — and a name (<code>f</code>) so we can talk about the machine without re-describing it every time.</p>
  <div class="formula">input  x  ──►  [ f ]  ──►  output  f(x)</div>
  <p>The same machine wears two faces. As a <strong>recipe</strong> you compute with it one input at a time; as a <strong>graph</strong> you see it whole — every input laid along the horizontal axis, its output drawn as height. Reading graphs fluently is the entire skill this world builds:</p>
  <p>• <strong>Roots</strong> — where the curve crosses the x-axis: the inputs with f(x) = 0.<br>
  • <strong>Height</strong> — a higher curve means a larger output at that x.<br>
  • <strong>Steepness</strong> — how fast the output is changing (the seed of <em>derivatives</em>, World 2).<br>
  • <strong>The one-output rule</strong> — a vertical line may touch the graph at most once.</p>
  <p>Finally, machines <strong>chain</strong>: the output of one becomes the input of the next, written g(f(x)). A neural network is nothing but a long chain of such machines — so getting fluent at evaluating, testing, and composing them now is the foundation for everything ahead.</p>`,
  ml:`Every model <em>is</em> a function — usually an enormous one: feed in an image (a vector of pixel values), read out "cat: 0.97". The pieces you'll meet daily are all functions on a graph: <b>ReLU</b>, <b>sigmoid</b>, the <b>loss curve</b> you watch during training, the <b>learning-rate schedule</b>. And "deep" literally means a deep chain of composed functions, g(f(…)), dozens of layers long. This lesson is the literacy the rest depends on.`,
  deeper:[
   {title:'😵 Stuck? The vending-machine test', body:'A function gives ONE output per input — a vending machine where button A3 sometimes drops chips and sometimes soda is broken. That\'s why a circle isn\'t a function (the vertical line x = 0 hits it at y = +1 AND −1) but a parabola is. "Exactly one output" is the whole definition; the vertical-line test is just that rule, drawn.'},
   {title:'🚀 Go deeper: domain & range', body:'The <b>domain</b> is every input the machine legally accepts (√x rejects negatives; 1/x rejects 0); the <b>range</b> is every output it can produce. Activation functions are picked partly for their range: sigmoid outputs land in (0,1) so they read as probabilities; ReLU outputs land in [0,∞).'},
   {title:'🚀 Go deeper: composing machines', body:'g(f(x)) feeds f\'s output into g, and order is not optional — square-then-add-1 ≠ add-1-then-square. Deep networks are dozens of chained machines; the <b>chain rule</b> (World 2) differentiates exactly such chains, one link at a time. The third lab lets you feel the order-dependence directly.'}],
  labs:[
   {key:'graph', title:'Read a machine\'s graph', interactive:'prefn',
    intro:'<p>Drag the point along the x-axis. The dashed lines trace <b>input → output</b>: choose an x, read its height. Switch machines and watch the same input produce wildly different outputs.</p>'},
   {key:'vlt', title:'The vertical-line test', interactive:'prefn_vlt',
    intro:'<p>What separates a true <b>function</b> from a mere relation? One output per input. Sweep the vertical line across each curve — if it ever strikes twice, that input has two outputs, and the relation is <b>not a function</b>.</p>'},
   {key:'compose', title:'Chaining machines', interactive:'prefn_compose',
    intro:'<p>Feed one machine\'s output straight into the next: <code>g(f(x))</code>. Order rarely commutes — square-then-add almost never equals add-then-square. This is exactly how layers stack inside a network.</p>'},
  ],
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
   {q:'With f(x) = x + 1 and g(x) = x², what is g(f(2))?', opts:['9','5','6','4'], a:0,
    tag:'composition', focus:'Read g(f(x)) inside-out: apply the INNER machine f first, then feed its output to g.',
    why:'Inner first: f(2) = 3. Then g(3) = 3² = 9. The inner machine always acts before the outer one.'},
   {q:'A vertical line crosses a graph at two points. This tells you…', opts:['It is NOT a function — one input has two outputs','It has a root there','The function is steep there','That input is in the domain twice'], a:0,
    tag:'definition of function', focus:'The vertical-line test: two crossings on one vertical = two outputs for one input = not a function.',
    why:'Two crossings on a single vertical line means one x-value maps to two y-values — the one-output rule is broken, so it is not a function.'},
  ],
});
WRONG_WHY['pre-functions']=[
 {1:'4 = 3+1? Substitute fully: square FIRST (9), then subtract 2.',2:'1 = 3−2 skips the squaring. The machine squares before subtracting.',3:'9 is x² — one more step: subtract 2.'},
 {1:'x = 0 is the y-axis crossing (the value f(0)), a different landmark.',2:'Steepness is about derivatives, not roots.',3:'Undefined points are holes/gaps, not roots.'},
 {1:'|x| gives one output per input (V shape) — a fine function.',2:'x³ is one-to-one — certainly a function.',3:'y = 7 ignores x but still gives exactly one output: a constant function.'},
 {1:'Height read backwards — higher curve means bigger value.',2:'2 < 5 always; inputs aren\'t being compared.',3:'One comparison at two points says nothing about everywhere.'},
 {1:'5 is f(g(2)) — you applied g first. Read g(f(2)) inside-out: f acts first (2→3), then g squares (→9).',2:'6 looks like 2·3 — but g squares its input, it doesn\'t multiply by 2. g(3) = 9.',3:'4 = g(2) alone; you skipped f. Apply f first: 2→3, then square → 9.'},
 {1:'A root is where the curve crosses the X-axis (height 0) — unrelated to how many times a VERTICAL line crosses.',2:'Steepness is about slope, not the count of crossings.',3:'An input is either in the domain or not — it can\'t be there "twice". Two outputs is the actual problem.'}];
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

/* lab 2 — vertical-line test: sweep a vertical line, count outputs */
INTERACTIVES.prefn_vlt = function(stage, api){
  const L=makeLab(stage);
  const P=plane(L.ctx,L.W,L.H,42);
  const rels=[
    {n:'parabola  y = x²/3 − 1', draw:()=>P.fn(x=>x*x/3-1,'#7c5cff',3),
      ys:vx=>[vx*vx/3-1]},
    {n:'circle  x² + y² = 9',
      draw:()=>{ L.ctx.strokeStyle='#7c5cff'; L.ctx.lineWidth=3; L.ctx.beginPath();
        for(let t=0;t<=6.30;t+=0.04){const x=3*Math.cos(t),y=3*Math.sin(t);t===0?L.ctx.moveTo(P.sx(x),P.sy(y)):L.ctx.lineTo(P.sx(x),P.sy(y));} L.ctx.stroke(); },
      ys:vx=>{const d=9-vx*vx; return d>1e-3?[Math.sqrt(d),-Math.sqrt(d)]:(d>=0?[0]:[]);}},
    {n:'sideways  x = y²/2 − 2',
      draw:()=>{ L.ctx.strokeStyle='#7c5cff'; L.ctx.lineWidth=3; L.ctx.beginPath(); let s=false;
        for(let y=-4;y<=4;y+=0.04){const x=y*y/2-2;const px=P.sx(x),py=P.sy(y);s?L.ctx.lineTo(px,py):(L.ctx.moveTo(px,py),s=true);} L.ctx.stroke(); },
      ys:vx=>{const v=2*(vx+2); return v>1e-3?[Math.sqrt(v),-Math.sqrt(v)]:(v>=0?[0]:[]);}},
    {n:'line  y = 0.7x', draw:()=>P.fn(x=>0.7*x,'#7c5cff',3),
      ys:vx=>[0.7*vx]},
  ];
  let ri=1, vx=0, drag=false; const seen={1:true};
  const M=api.missions([
    {text:'On the <b>circle</b>, place the line so it crosses <b>twice</b> — one x, two y\'s ⇒ NOT a function', xp:20, check:s=>s.ri===1&&s.cross===2},
    {text:'On the <b>sideways parabola</b>, find a double crossing too', xp:20, check:s=>s.ri===2&&s.cross===2},
    {text:'Inspect <b>all four</b> — note the parabola & line never exceed one crossing', xp:15, check:s=>s.all},
  ]);
  const yTop=P.wy(0), yBot=P.wy(L.H);
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    rels[ri].draw();
    L.ctx.strokeStyle='rgba(0,212,255,.9)'; L.ctx.lineWidth=2;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(vx),0); L.ctx.lineTo(P.sx(vx),L.H); L.ctx.stroke();
    const cs=rels[ri].ys(vx).filter(y=>y>=yBot&&y<=yTop);
    cs.forEach(y=>P.dot(vx,y,6,'#ffc94d'));
    const c=cs.length;
    L.readout.innerHTML=rels[ri].n+'<br>line at x = '+vx.toFixed(2)+' crosses <b>'+c+'</b> time'+(c===1?'':'s')+
      '<br>'+(c>1?'⚠ NOT a function here (one x → '+c+' outputs)':'✓ ok so far (≤ 1 output)');
    seen[ri]=true;
    M.update({ri, cross:c, all:seen[0]&&seen[1]&&seen[2]&&seen[3]});
  }
  L.canvas.addEventListener('pointerdown',e=>{drag=true;L.canvas.setPointerCapture(e.pointerId);mv(e);});
  L.canvas.addEventListener('pointermove',mv);
  L.canvas.addEventListener('pointerup',()=>drag=false);
  function mv(e){ if(!drag)return; const c=L.toCanvas(e); vx=Math.max(-5,Math.min(5,P.wx(c.x))); draw(); }
  chips(L.ctrl,'RELATION',rels.map(r=>r.n),(i,btn,row)=>{ ri=i; vx=0;
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); }).children[1].classList.add('on');
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Drag left/right to sweep the <b style="color:#7fe7ff">vertical line</b>. Gold dots mark every output at that input. Two dots on one line = the relation fails the test.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* lab 3 — function composition: g(f(x)) vs f(g(x)) */
INTERACTIVES.prefn_compose = function(stage, api){
  const machines=[
    {n:'+1', f:x=>x+1}, {n:'×2', f:x=>x*2}, {n:'square', f:x=>x*x}, {n:'−3', f:x=>x-3},
  ];
  let fi=0, gi=0, x=0, moved=false;
  const wrap=document.createElement('div'); wrap.style.cssText='display:flex;flex-direction:column;gap:16px'; stage.appendChild(wrap);
  const flow=document.createElement('div'); flow.style.cssText='background:var(--bg2);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:18px'; wrap.appendChild(flow);
  const ctrls=document.createElement('div'); ctrls.className='controls'; wrap.appendChild(ctrls);
  const M=api.missions([
    {text:'With f = <b>square</b>, g = <b>+1</b>, set x = 2 → read <b>g(f(2)) = 5</b>', xp:20, check:s=>s.fi===2&&s.gi===0&&Math.abs(s.x-2)<.05},
    {text:'Find a setup where <b>order matters</b>: g(f(x)) ≠ f(g(x))', xp:20, check:s=>Math.abs(s.gf-s.fg)>.01},
    {text:'Now find a setup where <b>order does not matter</b> (the two agree)', xp:15, check:s=>Math.abs(s.gf-s.fg)<1e-6&&s.moved},
  ]);
  const fmt=v=>Math.abs(v)>=1000?v.toExponential(1):(Math.round(v*100)/100).toString();
  const val=(v,col)=>'<span style="font-family:var(--mono);font-size:20px;font-weight:800;color:'+(col||'#aee8ff')+'">'+fmt(v)+'</span>';
  const box=n=>'<span style="background:var(--card2);border:1px solid rgba(124,92,255,.4);border-radius:10px;padding:8px 13px;font-weight:800;color:#b9a8ff;font-family:var(--mono)">'+n+'</span>';
  const arr='<span style="color:#6b7299;font-size:19px">→</span>';
  const rowCss='display:flex;align-items:center;gap:11px;flex-wrap:wrap;justify-content:center';
  function render(){
    const f=machines[fi].f, g=machines[gi].f;
    const u=f(x), gf=g(u), v=g(x), fg=f(v), same=Math.abs(gf-fg)<1e-6;
    flow.innerHTML=
      '<div style="font-size:12px;color:var(--muted);font-weight:800;letter-spacing:.5px;margin-bottom:7px">g(f(x)) — apply f, THEN g</div>'+
      '<div style="'+rowCss+'">'+val(x)+arr+box('f: '+machines[fi].n)+arr+val(u)+arr+box('g: '+machines[gi].n)+arr+val(gf,'#2dd4a0')+'</div>'+
      '<div style="height:13px"></div>'+
      '<div style="font-size:12px;color:var(--muted);font-weight:800;letter-spacing:.5px;margin-bottom:7px">f(g(x)) — the other order</div>'+
      '<div style="'+rowCss+'">'+val(x)+arr+box('g: '+machines[gi].n)+arr+val(v)+arr+box('f: '+machines[fi].n)+arr+val(fg,'#ff9db1')+'</div>'+
      '<div style="text-align:center;margin-top:15px;font-weight:800;font-size:14px;color:'+(same?'#2dd4a0':'#ffc94d')+'">'+
        (same?'✓ same result — these two machines commute':'✗ '+fmt(gf)+' ≠ '+fmt(fg)+' — order matters!')+'</div>';
    M.update({fi,gi,x,gf,fg,moved});
  }
  chips(ctrls,'MACHINE f',machines.map(mc=>mc.n),(i,btn,row)=>{fi=i;moved=true;[...row.children].forEach(b=>b.classList.remove('on'));btn.classList.add('on');render();}).children[fi].classList.add('on');
  chips(ctrls,'MACHINE g',machines.map(mc=>mc.n),(i,btn,row)=>{gi=i;moved=true;[...row.children].forEach(b=>b.classList.remove('on'));btn.classList.add('on');render();}).children[gi].classList.add('on');
  slider(ctrls,'input x',-3,4,0.5,0,v=>v.toFixed(1),v=>{x=v;moved=true;render();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Pick two machines and an input. The top row applies <b>f then g</b>; the bottom applies <b>g then f</b>. Most pairs disagree — that\'s why layer order in a network is not arbitrary.</div>';
  ctrls.appendChild(note);
  render();
};

LESSONS.push({
  id:'pre-slope', world:'pre', emoji:'📏', title:'Slope & Fitting Lines',
  sub:'y = mx + b, and your first taste of what "training a model" means: fitting a line by hand.',
  learn:`<p>A line is the simplest non-trivial function: <code>y = mx + b</code>. Just two numbers pin it down completely:</p>
  <p>• <strong>m — slope</strong>: rise over run, i.e. how much y changes per unit step in x. Positive climbs, negative falls, zero is flat.<br>
  • <strong>b — intercept</strong>: the height where the line crosses the y-axis — its value at x = 0.</p>
  <div class="formula">m = rise / run = (y₂ − y₁) / (x₂ − x₁)</div>
  <p>Slope is the same idea as a derivative, just for a straight line: a constant rate of change. Pick <em>any</em> two points on the line and the ratio comes out the same — that constancy is exactly what makes a line a line.</p>
  <p>The real payoff comes when the points <em>don't</em> lie on a line. Given a cloud of noisy data, which line fits best? We score each candidate by its <strong>squared error</strong> — the sum of squared vertical misses (residuals) — and hunt for the line that makes it smallest. That hunt is <strong>linear regression</strong>, the first machine-learning model ever, and you'll do it three ways: by reading slope off two points, by tuning the knobs by hand, and by watching the error itself become a curve with a single lowest point.</p>`,
  ml:`This is your first loss-minimization, done by hand. Turning the knobs m and b to shrink the squared error <em>is</em> what training a model means — every network you'll ever fit is this, with millions of knobs instead of two. The third lab is the punchline: plot the error against a parameter and you get a <b>bowl</b> with one bottom. Finding that bottom automatically, using the slope of the bowl, is <b>gradient descent</b> (World 2) — the algorithm behind all of deep learning.`,
  deeper:[
   {title:'😵 Stuck? Anchor then tilt', body:'Fit in two moves: first set b so the line passes through the leftmost data, then tilt m until the right side lines up. Adjusting one knob at a time while watching the error fall is literally "coordinate descent" — a real optimization method, not a beginner\'s crutch.'},
   {title:'🚀 Go deeper: why SQUARED error?', body:'Squaring punishes big misses far more than small ones, is always positive (so misses above and below can\'t cancel), and — calculus preview — has a clean derivative, so the best m, b can be solved in one shot. That closed-form solution is the <b>normal equation</b> of linear regression, X·w = projection of y onto the column space (you\'ll meet it again in World 1).'},
   {title:'🚀 Go deeper: the loss is convex', body:'Because the error is a sum of squares, plotting it against a parameter gives a <b>parabola</b> — a single smooth bowl, no false bottoms. That\'s a gift: gradient descent on a convex loss is guaranteed to find the global minimum. Real deep nets are NOT convex (World 2 explores why), which is what makes their training an art.'}],
  labs:[
   {key:'rise', title:'Slope = rise over run', interactive:'preslope_rise',
    intro:'<p>Drag the two points. The dashed triangle shows the <b>run</b> (horizontal) and the <b>rise</b> (vertical); their ratio is the slope. Notice it stays constant no matter where on the line you measure.</p>'},
   {key:'fit', title:'Fit a line by hand', interactive:'preslope',
    intro:'<p>Now the data is noisy and off-line. Turn the two knobs to drag the line through the cloud, shrinking the <b>squared error</b> (the red residual dashes). You are the optimizer.</p>'},
   {key:'loss', title:'The loss is a bowl', interactive:'preslope_loss',
    intro:'<p>Here\'s the same fit, viewed differently: the curve plots total <b>error vs. slope</b> (intercept held fixed). It\'s a bowl with one lowest point. Sliding to that bottom is what gradient descent automates.</p>'},
  ],
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
   {q:'Plotting the squared error against the slope m gives what shape?', opts:['A bowl (parabola) with one lowest point','A straight line','A circle','A flat horizontal line'], a:0,
    tag:'loss landscape', focus:'A sum of squared (linear) residuals is quadratic in the parameter — a convex bowl with a single minimum.',
    why:'Each residual is linear in m, and we square and sum them, so the error is a quadratic in m — a parabola. Its single bottom is the best slope, which is exactly what gradient descent slides toward.'},
   {q:'Why square the residuals instead of just summing them?', opts:['So positive and negative misses can\'t cancel out','To make the math harder','Because residuals are always negative','To convert them to probabilities'], a:0,
    tag:'why squared error', focus:'Squaring removes sign (no cancellation), penalizes large misses more, and yields a clean derivative.',
    why:'A miss of +3 above and −3 below would cancel to 0 if you just added them, hiding a bad fit. Squaring makes every miss positive (and penalizes big ones extra), so the total honestly measures fit quality.'},
  ],
});
WRONG_WHY['pre-slope']=[
 {1:'6 is just Δy — divide by Δx = 2.',2:'2 is Δx. Slope is rise OVER run: 6/2.',3:'1/3 is run over rise — inverted.'},
 {1:'Steepness is m\'s job.',2:'The x-crossing depends on BOTH m and b (it\'s −b/m).',3:'Lines are infinite; they don\'t have lengths.'},
 {1:'Clustering groups unlabeled points — no line, no target.',2:'Classification predicts categories, not continuous values.',3:'Integration accumulates areas — different world.'},
 {1:'Sign flipped: negative slope falls as x grows.',2:'That\'s b\'s meaning, not m = −2.',3:'Vertical lines have UNDEFINED slope, not −2.'},
 {1:'A straight line would mean error grows at a constant rate — but moving past the best slope in EITHER direction makes it worse, which curves the plot into a bowl.',2:'A circle closes back on itself; error keeps rising as m runs away in either direction, so it can\'t.',3:'A flat line would mean every slope fits equally well — but clearly some slopes fit better, so the error must vary.'},
 {1:'Squaring is the standard fix, but the goal is no cancellation (and a clean derivative) — not difficulty for its own sake.',2:'Residuals can be positive OR negative (above or below the line) — that\'s exactly why we square them.',3:'Squared error isn\'t a probability; it\'s an unbounded non-negative score. Probabilities come later, via different machinery.'}];
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

/* slope lab 1 — rise/run from two draggable points */
INTERACTIVES.preslope_rise = function(stage, api){
  const L=makeLab(stage);
  const P=plane(L.ctx,L.W,L.H,40);
  const A={x:-2,y:-1}, B={x:2,y:1}; let drag=null;
  const M=api.missions([
    {text:'Drag the points until the slope is exactly <b>m = 2</b>', xp:20, check:s=>Math.abs(s.m-2)<.12},
    {text:'Make a <b>downhill</b> line — slope clearly <b>negative</b>', xp:15, check:s=>s.m<-0.3},
    {text:'Make the line <b>flat</b> — slope ≈ 0 (a horizontal line)', xp:20, check:s=>Math.abs(s.m)<.06&&Math.abs(s.dx)>1.5},
  ]);
  const FF=getComputedStyle(document.body).fontFamily;
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const dx=B.x-A.x, dy=B.y-A.y, slp=dx===0?Infinity:dy/dx;
    if(isFinite(slp)) P.fn(x=>A.y+slp*(x-A.x),'#7c5cff',2.5);
    L.ctx.setLineDash([5,4]); L.ctx.lineWidth=2;
    L.ctx.strokeStyle='rgba(0,212,255,.7)';
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(A.x),P.sy(A.y)); L.ctx.lineTo(P.sx(B.x),P.sy(A.y)); L.ctx.stroke();
    L.ctx.strokeStyle='rgba(255,201,77,.85)';
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(B.x),P.sy(A.y)); L.ctx.lineTo(P.sx(B.x),P.sy(B.y)); L.ctx.stroke();
    L.ctx.setLineDash([]);
    L.ctx.font='700 13px '+FF;
    L.ctx.fillStyle='#7fe7ff'; L.ctx.fillText('run '+dx.toFixed(1), (P.sx(A.x)+P.sx(B.x))/2-18, P.sy(A.y)+(dy>=0?18:-8));
    L.ctx.fillStyle='#ffc94d'; L.ctx.fillText('rise '+dy.toFixed(1), P.sx(B.x)+8, (P.sy(A.y)+P.sy(B.y))/2+4);
    P.dot(A.x,A.y,7,'#b9a8ff'); P.dot(B.x,B.y,7,'#00d4ff');
    L.readout.innerHTML='A=('+A.x.toFixed(1)+', '+A.y.toFixed(1)+')  B=('+B.x.toFixed(1)+', '+B.y.toFixed(1)+')<br>'+
      'm = rise/run = '+dy.toFixed(1)+' / '+dx.toFixed(1)+' = <b>'+(isFinite(slp)?slp.toFixed(2):'∞ (vertical!)')+'</b>';
    M.update({m:isFinite(slp)?slp:99, dx});
  }
  L.canvas.addEventListener('pointerdown',e=>{ const c=L.toCanvas(e), wx=P.wx(c.x), wy=P.wy(c.y);
    drag = Math.hypot(wx-A.x,wy-A.y) < Math.hypot(wx-B.x,wy-B.y) ? A : B;
    L.canvas.setPointerCapture(e.pointerId); mv(e); });
  L.canvas.addEventListener('pointermove',mv);
  L.canvas.addEventListener('pointerup',()=>drag=null);
  function mv(e){ if(!drag)return; const c=L.toCanvas(e);
    drag.x=Math.max(-6,Math.min(6,P.wx(c.x))); drag.y=Math.max(-5,Math.min(5,P.wy(c.y))); draw(); }
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Drag either endpoint. Slope = <b style="color:#ffc94d">rise</b> ÷ <b style="color:#7fe7ff">run</b>. Move a point along the line and the ratio never changes — that constancy is what makes it a straight line.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* slope lab 3 — the loss as a function of the slope (a convex bowl) */
INTERACTIVES.preslope_loss = function(stage, api){
  const L=makeLab(stage);
  const pts=[[0,0.6],[1,1.6],[2,3.0],[3,4.0]], b=0.5;
  let mm=-0.5;
  const E=m=>pts.reduce((s,[x,y])=>{const r=y-m*x-b;return s+r*r;},0);
  const mMin=-1, mMax=3.5, Emax=20, pad={l:52,r:18,t:18,btm:40};
  const M=api.missions([
    {text:'Slide <b>m</b> to the <b>bottom of the bowl</b> — error under 0.1', xp:25, check:s=>s.E<0.1},
    {text:'Push m to the far <b>left</b> (m ≤ −0.5) and watch error climb the wall', xp:15, check:s=>s.m<=-0.5},
    {text:'Push m to the far <b>right</b> (m ≥ 3) — it climbs on this side too: a convex bowl', xp:15, check:s=>s.m>=3},
  ]);
  const mapX=m=>pad.l+(m-mMin)/(mMax-mMin)*(L.W-pad.l-pad.r);
  const mapY=e=>L.H-pad.btm-Math.min(e,Emax)/Emax*(L.H-pad.t-pad.btm);
  const mStar=33.2/28, FF=getComputedStyle(document.body).fontFamily;
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    L.ctx.strokeStyle='rgba(255,255,255,.25)'; L.ctx.lineWidth=1;
    L.ctx.beginPath(); L.ctx.moveTo(pad.l,pad.t); L.ctx.lineTo(pad.l,L.H-pad.btm); L.ctx.lineTo(L.W-pad.r,L.H-pad.btm); L.ctx.stroke();
    L.ctx.strokeStyle='#7c5cff'; L.ctx.lineWidth=3; L.ctx.beginPath(); let st=false;
    for(let m=mMin;m<=mMax;m+=0.02){const px=mapX(m),py=mapY(E(m)); st?L.ctx.lineTo(px,py):(L.ctx.moveTo(px,py),st=true);} L.ctx.stroke();
    L.ctx.setLineDash([4,4]); L.ctx.strokeStyle='rgba(45,212,160,.55)';
    L.ctx.beginPath(); L.ctx.moveTo(mapX(mStar),mapY(E(mStar))); L.ctx.lineTo(mapX(mStar),L.H-pad.btm); L.ctx.stroke(); L.ctx.setLineDash([]);
    const e=E(mm);
    L.ctx.fillStyle='#00d4ff'; L.ctx.beginPath(); L.ctx.arc(mapX(mm),mapY(e),7,0,7); L.ctx.fill();
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='700 12px '+FF;
    L.ctx.fillText('error ↑', pad.l+4, pad.t+12);
    L.ctx.fillText('slope m →', L.W-pad.r-72, L.H-pad.btm+24);
    L.ctx.fillStyle='#2dd4a0'; L.ctx.fillText('best', mapX(mStar)-12, mapY(E(mStar))-10);
    L.readout.innerHTML='intercept b fixed at '+b+'<br>m = '+mm.toFixed(2)+'  →  error = '+e.toFixed(2);
    M.update({m:mm,E:e});
  }
  slider(L.ctrl,'slope m',mMin,mMax,0.01,mm,v=>v.toFixed(2),v=>{mm=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">This plots <b>total squared error</b> as the slope varies (intercept fixed). One lowest point, walls climbing both sides — a <b>convex bowl</b>. Finding that bottom by following the downhill slope is exactly <b>gradient descent</b> (World 2).</div>';
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

/* ================== WORLD 0: Powers, Roots & Scale ================== */
LESSONS.push({
  id:'pre-powers', world:'pre', emoji:'🔢', title:'Powers, Roots & Scale',
  sub:'Exponents are repeated multiplication — and the language for the absurd range of numbers in ML.',
  learn:`<p>An <strong>exponent</strong> just counts repeated multiplication: <code>2⁵ = 2·2·2·2·2 = 32</code>. Everything else follows from that one idea — and these are the rules you'll reuse forever:</p>
  <p>• <strong>Multiply ⇒ add exponents</strong>: aᵐ·aⁿ = aᵐ⁺ⁿ (two doublings then three more = five doublings).<br>
  • <strong>Zero power is 1</strong>: a⁰ = 1 (multiply by nothing at all).<br>
  • <strong>Negative ⇒ reciprocal</strong>: a⁻ⁿ = 1/aⁿ (un-multiplying — a small <em>positive</em> fraction).<br>
  • <strong>Fractional ⇒ root</strong>: a^(1/2) = √a (the number that, squared, gives a).</p>
  <div class="formula">aᵐ · aⁿ = aᵐ⁺ⁿ      a⁻ⁿ = 1/aⁿ      a^(1/2) = √a</div>
  <p>Exponential growth is the headline act: because each +1 step <em>multiplies</em>, values explode (or, for fractions, collapse) astonishingly fast. That's why we need <strong>scientific notation</strong> — writing 0.0000001 as 10⁻⁷ — just to keep our place. Machine learning spans this entire range in a single breath: a learning rate of 10⁻³, an epsilon of 10⁻⁸, a model with 10⁹ parameters.</p>`,
  ml:`Scale literacy is survival in ML. Gradients <b>vanish</b> (0.5¹⁰ ≈ 0.001) or <b>explode</b> across deep nets — both are exponentials biting. Floating-point numbers physically cannot hold 10⁻⁴⁰⁰, so we work in <b>log-space</b> (next stop: e and logs in World 2). And every "how big is this model / dataset / learning rate?" conversation happens in powers of ten.`,
  deeper:[
   {title:'😵 Stuck? Why is a⁰ = 1?', body:'Walk the pattern <em>downward</em>: 2³=8, 2²=4, 2¹=2 — each step <b>divides by 2</b>. Keep going and 2⁰ must be 2÷2 = 1, then 2⁻¹ = ½, 2⁻² = ¼. The rules for zero and negative exponents aren\'t arbitrary conventions; they\'re the only values that keep the halving pattern unbroken.'},
   {title:'🚀 Go deeper: orders of magnitude', body:'An "order of magnitude" is one power of ten — a single 10× jump. Saying GPT-3 (175×10⁹ params) is "about 5 orders of magnitude bigger" than a 10⁶-param toy net communicates more than the raw digits do. Training cost, dataset size and parameter count comparisons all live naturally on this log scale.'},
   {title:'🚀 Go deeper: roots are fractional powers', body:'∜a = a^(1/4), and a^(3/2) = (√a)³ = √(a³). Fractional exponents fold roots and powers into one operation — which is exactly why the single rule d/dx xⁿ = n·xⁿ⁻¹ (World 2) will happily differentiate a square root too, with n = ½.'}],
  labs:[
   {key:'rules', title:'Exponents & roots', interactive:'powrules',
    intro:'<p>Slide the exponent. Whole numbers are repeated multiplication; <b>zero</b> gives 1; <b>negatives</b> give fractions; <b>halves</b> give roots. Watch how each +1 in the exponent <em>multiplies</em> the height by the base — that\'s exponential growth.</p>'},
   {key:'sci', title:'The scale of ML', interactive:'sci',
    intro:'<p>This ruler is logarithmic — each tick is <b>10× the last</b>. Real ML quantities live all across it, from a 10⁻⁸ epsilon to a 10⁹-parameter model. Slide around and build a feel for where things sit.</p>'},
  ],
  quiz:[
   {q:'What is 2⁻³?', opts:['1/8','−8','−6','6'], a:0, tag:'negative exponents', focus:'Negative exponent = reciprocal: a⁻ⁿ = 1/aⁿ. The sign never makes the value itself negative.',
    why:'2⁻³ = 1/2³ = 1/8. A negative exponent flips to a reciprocal — it does NOT make the number negative.'},
   {q:'Simplify 10³ · 10⁴.', opts:['10⁷','10¹²','100⁷','10⁰·⁷⁵'], a:0, tag:'multiplying powers', focus:'Same base, multiplying ⇒ ADD the exponents: aᵐ·aⁿ = aᵐ⁺ⁿ.',
    why:'Multiplying powers of the same base adds exponents: 10³·10⁴ = 10⁷. (Multiplying the exponents to get 10¹² is the classic trap.)'},
   {q:'What is 9^(1/2)?', opts:['3','4.5','81','18'], a:0, tag:'fractional exponents', focus:'The ½ power is the square root: a^(1/2) = √a.',
    why:'A one-half power is a square root: 9^(1/2) = √9 = 3.'},
   {q:'Written in scientific notation, 0.0004 is…', opts:['4 × 10⁻⁴','4 × 10⁴','4 × 10⁻³','0.4 × 10⁻³'], a:0, tag:'scientific notation', focus:'Shift the decimal to sit just after the first nonzero digit; a left-start (leading zeros) ⇒ negative power.',
    why:'Move the decimal 4 places to the right to reach 4.0, so 0.0004 = 4 × 10⁻⁴. (10⁻³ would be 0.004.)'},
   {q:'A model with 10⁹ parameters is how many orders of magnitude bigger than one with 10⁶?', opts:['3','1000','103','9'], a:0, tag:'orders of magnitude', focus:'Orders of magnitude apart = the difference of the exponents.',
    why:'10⁹ vs 10⁶ differ by 9 − 6 = 3 orders of magnitude — which is a 1000× difference in the actual count.'},
  ],
});
WRONG_WHY['pre-powers']=[
 {1:'The sign of the exponent never flips the number\'s sign — 2⁻³ is a small POSITIVE fraction, 1/8.',2:'−6 = 2·(−3): that\'s multiplication, not exponentiation.',3:'6 = 2·3 — also multiplication. Exponent means repeated multiply, then reciprocate for the minus sign.'},
 {1:'10¹² multiplies the exponents — but multiplying powers ADDS them: 3 + 4 = 7.',2:'The base stays 10, not 100 — you don\'t multiply the bases together.',3:'Averaging or dividing the exponents isn\'t a rule at all.'},
 {1:'4.5 = 9/2 — you halved the base instead of taking its ½ power (the root).',2:'81 = 9² — that\'s the SECOND power, the opposite direction from one-half.',3:'18 = 9·2 — multiplication again, not a root.'},
 {1:'10⁴ = 10,000 — far too big. Leading zeros mean a NEGATIVE power of ten.',2:'10⁻³ = 0.004, one place off — count all the way to the first nonzero digit (4 places).',3:'Scientific notation keeps exactly one nonzero digit before the point: 4, not 0.4.'},
 {1:'1000 is the RATIO (10³), not the count of orders. Orders of magnitude apart = the gap in exponents, which is 3.',2:'103 just mashes the digits together — subtract the exponents: 9 − 6 = 3.',3:'9 is only the larger exponent; the DIFFERENCE 9 − 6 = 3 is what "orders of magnitude apart" means.'}];

/* powers lab 1 — exponent meaning (integer / zero / negative / fractional) */
INTERACTIVES.powrules = function(stage, api){
  const L=makeLab(stage);
  let base=2, n=3;
  const M=api.missions([
    {text:'Set the exponent so <b>2ⁿ = 8</b>', xp:20, check:s=>s.base===2&&Math.abs(s.n-3)<.06},
    {text:'Use a <b>negative</b> exponent to make the value <b>less than 1</b>', xp:20, check:s=>s.n<0&&s.val<1},
    {text:'Set n = <b>0.5</b> — a half-power is a <b>square root</b> (2^0.5 ≈ 1.41)', xp:20, check:s=>Math.abs(s.n-0.5)<.06},
  ]);
  const P=plane(L.ctx,L.W,L.H,30,64,L.H-54);
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const f=x=>Math.pow(base,x), v=Math.pow(base,n);
    P.fn(f,'#7c5cff',3);
    L.ctx.setLineDash([4,4]); L.ctx.strokeStyle='rgba(0,212,255,.5)'; L.ctx.lineWidth=1.5;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(n),P.sy(0)); L.ctx.lineTo(P.sx(n),P.sy(Math.min(v,14))); L.ctx.stroke(); L.ctx.setLineDash([]);
    if(v<=14) P.dot(n,v,7,'#00d4ff');
    let expand='';
    if(Number.isInteger(n)&&n>0&&n<=6) expand=' = '+Array(n).fill(base).join('×');
    else if(n===0) expand=' = 1  (any base⁰)';
    else if(Number.isInteger(n)&&n<0) expand=' = 1 / '+base+(n<-1?('^'+(-n)):'');
    else if(Math.abs(n-0.5)<.06) expand=' = √'+base;
    const ne=(+n.toFixed(2)).toString();
    const vs=v>=1e4?v.toExponential(2):(+v.toFixed(3)).toString();
    L.readout.innerHTML=base+'<sup>'+ne+'</sup> = <b>'+vs+'</b>'+expand;
    M.update({base,n,val:v});
  }
  chips(L.ctrl,'BASE',['2','3','10'],(i,btn,row)=>{base=[2,3,10][i];[...row.children].forEach(x=>x.classList.remove('on'));btn.classList.add('on');draw();}).children[0].classList.add('on');
  slider(L.ctrl,'exponent n',-3,6,0.1,3,v=>(+v.toFixed(1)).toString(),v=>{n=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">An exponent is <b>repeated multiplication</b>. Whole n: multiply n copies. <b>n = 0</b> → 1. <b>Negative</b> n → a reciprocal (fraction). <b>Fractional</b> n → a root. Each +1 in n multiplies the height by the base.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* powers lab 2 — orders of magnitude / scientific notation ruler */
INTERACTIVES.sci = function(stage, api){
  const L=makeLab(stage);
  let e=0;
  const anchor=k=>({'-9':'nanometer scale','-8':'Adam ε = 1e-8 (stops ÷0)','-3':'learning rate ≈ 1e-3','-1':'dropout 0.1','0':'one','2':'a mini-batch ≈ 100','3':'1,000','6':'1M params — a tiny model','9':'1B params — GPT-class'})[k]||'';
  const M=api.missions([
    {text:'Slide to the scale of a typical <b>learning rate</b> (1e-3)', xp:20, check:s=>s.e===-3},
    {text:'Slide to <b>a billion</b> (1e9) — GPT-class parameter counts', xp:20, check:s=>s.e===9},
    {text:'Find <b>Adam\'s epsilon</b> (1e-8) — the tiny constant that prevents divide-by-zero', xp:15, check:s=>s.e===-8},
  ]);
  const FF=getComputedStyle(document.body).fontFamily, x0=42, x1=L.W-42;
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    const y=L.H/2;
    L.ctx.strokeStyle='rgba(255,255,255,.3)'; L.ctx.lineWidth=2;
    L.ctx.beginPath(); L.ctx.moveTo(x0,y); L.ctx.lineTo(x1,y); L.ctx.stroke();
    L.ctx.textAlign='center';
    for(let k=-9;k<=9;k++){
      const px=x0+(k+9)/18*(x1-x0), big=k%3===0;
      L.ctx.strokeStyle='rgba(255,255,255,'+(big?.5:.18)+')'; L.ctx.lineWidth=1;
      L.ctx.beginPath(); L.ctx.moveTo(px,y-(big?12:6)); L.ctx.lineTo(px,y+(big?12:6)); L.ctx.stroke();
      if(big){ L.ctx.fillStyle='#8b93b8'; L.ctx.font='700 12px '+FF; L.ctx.fillText('10^'+k, px, y+30); }
    }
    const mx=x0+(e+9)/18*(x1-x0);
    L.ctx.fillStyle='#00d4ff';
    L.ctx.beginPath(); L.ctx.moveTo(mx,y-16); L.ctx.lineTo(mx-7,y-30); L.ctx.lineTo(mx+7,y-30); L.ctx.closePath(); L.ctx.fill();
    L.ctx.beginPath(); L.ctx.arc(mx,y,6,0,7); L.ctx.fill();
    const a=anchor(''+e);
    if(a){ L.ctx.fillStyle='#ffc94d'; L.ctx.font='800 12px '+FF; L.ctx.fillText(a, Math.max(70,Math.min(L.W-70,mx)), y-40); }
    L.ctx.textAlign='left';
    const val=Math.pow(10,e);
    L.readout.innerHTML='10<sup>'+e+'</sup> = '+(e>=0?val.toLocaleString('en-US'):val.toExponential(0))+(a?'<br>≈ '+a:'');
    M.update({e});
  }
  slider(L.ctrl,'power of ten',-9,9,1,0,v=>'10^'+Math.round(v),v=>{e=Math.round(v);draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Every tick is a <b>10× jump</b> — a full order of magnitude. ML spans this whole ruler at once: tiny epsilons on the left, billion-parameter models on the right. The gold labels mark real quantities.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== WORLD 0: Logarithms ================== */
LESSONS.push({
  id:'pre-logs', world:'pre', emoji:'🔁', title:'Logarithms: The Inverse Question',
  sub:'log asks "what power gives me this?" — and quietly turns ML\'s multiplications into additions.',
  learn:`<p>A <strong>logarithm</strong> is just an exponent, asked for backwards. The power 2³ = 8 poses the forward question "what is 2 to the 3rd?". The log poses the <em>inverse</em>: "2 to the <em>what</em> gives 8?" — and the answer is 3.</p>
  <div class="formula">log<sub>b</sub>(x) = y   ⟺   bʸ = x</div>
  <p>So <code>log₁₀(1000) = 3</code> (ten to the 3rd is 1000) and <code>log₂(8) = 3</code> (two cubed is 8). A log is literally the <strong>undo button</strong> for an exponential — they cancel: log<sub>b</sub>(bˣ) = x. Two quick consequences worth memorizing: <strong>log(1) = 0</strong> (any base⁰ = 1) and the log of a fraction is <strong>negative</strong> (log₂(½) = −1).</p>
  <p>The single most useful property — the reason logs are everywhere in ML — is that they convert <strong>multiplication into addition</strong>:</p>
  <div class="formula">log(a·b) = log a + log b      log(aⁿ) = n·log a</div>
  <p>And because each <strong>+1 on a log scale is a ×base jump</strong>, logs <strong>compress enormous ranges</strong> into something readable. A loss that falls from 10 to 0.0001 is a straight slide on a log axis; learning rates are swept 10⁻⁵, 10⁻⁴, 10⁻³… in equal log steps, not equal linear ones.</p>`,
  ml:`Logs are the workhorse of ML numerics. <b>Cross-entropy</b> loss is −Σ log p (a sum of logs — see the next lesson); <b>log-likelihood</b> replaces an underflowing product of probabilities with a safe sum; <b>entropy</b> and <b>bits</b> are measured in log₂; <b>perplexity</b> is just an exponentiated entropy. And every hyperparameter sweep and loss plot you'll read lives on a <b>log scale</b>, because in ML what matters is almost always the <em>order of magnitude</em>, not the raw number.`,
  deeper:[
   {title:'😵 Stuck? "How many times do I divide?"', body:'For base 10, log₁₀(x) counts how many times you divide x by 10 to reach 1 — which, for a round number, is just the number of zeros. log₁₀(1000) = 3 (three zeros); log₁₀(100) = 2. For base 2, log₂(x) counts halvings to reach 1: log₂(8) = 3 because 8→4→2→1 is three steps.'},
   {title:'🚀 Go deeper: change of base', body:'Every log is a rescaled version of every other: log<sub>b</sub>(x) = ln(x) / ln(b). So switching base only multiplies by a constant — which is why a loss curve labelled just "log" (no base) is unambiguous up to scale, and why computer scientists, who love log₂, and mathematicians, who love ln, never actually disagree.'},
   {title:'🚀 Go deeper: bits, entropy & surprise', body:'log₂(N) is the number of yes/no bits needed to name one of N options (log₂256 = 8 bits = 1 byte). Define "surprise" of an event as −log₂(p): rare events are more surprising. <b>Entropy</b> is the average surprise, and <b>cross-entropy</b> — the loss that trains nearly every classifier and language model — is the average surprise of the true labels under your model\'s predicted probabilities.'}],
  labs:[
   {key:'inv', title:'log is the inverse of a power', interactive:'loginv',
    intro:'<p>Drag along the curve y = bˣ. For any height you land on, the log is simply the <b>exponent x</b> that produced it. Reading the curve right-to-left (height → exponent) <em>is</em> taking a log.</p>'},
   {key:'mul', title:'logs turn × into +', interactive:'logmul',
    intro:'<p>Pick two numbers. Watch <code>log a</code> and <code>log b</code> lay end-to-end and land exactly on <code>log(a·b)</code>. Multiplication on the inputs becomes plain <b>addition</b> on the logs — the trick behind log-likelihood.</p>'},
  ],
  quiz:[
   {q:'What is log₁₀(1000)?', opts:['3','100','30','10'], a:0, tag:'evaluating a log', focus:'log₁₀(x) asks "10 to the what equals x?" — for round numbers, count the zeros.',
    why:'10³ = 1000, so log₁₀(1000) = 3. (For powers of ten, the log is just the number of zeros.)'},
   {q:'log<sub>b</sub>(x) = y is exactly the same statement as…', opts:['bʸ = x','xʸ = b','b·y = x','y = b/x'], a:0, tag:'definition of log', focus:'A log IS an exponent: log_b(x)=y means the base raised to y gives x.',
    why:'log and exponent are two views of one fact: log_b(x) = y ⟺ bʸ = x. The log just names the exponent.'},
   {q:'log(a·b) equals…', opts:['log a + log b','log a · log b','log a − log b','log(a + b)'], a:0, tag:'product rule', focus:'The headline identity: logs turn multiplication into addition.',
    why:'log(a·b) = log a + log b. This is why a product of probabilities becomes a safe SUM of log-probabilities.'},
   {q:'What is log₂(½)?', opts:['−1','1','0','½'], a:0, tag:'logs of fractions', focus:'2 to the what gives ½? A reciprocal needs a negative exponent.',
    why:'2⁻¹ = ½, so log₂(½) = −1. Logs of numbers below 1 are negative; log of exactly 1 is 0.'},
   {q:'Why are learning rates usually swept on a LOG scale (1e-5, 1e-4, 1e-3, …)?', opts:['What matters is the order of magnitude, so equal log steps = equal ×10 jumps','Log scales are easier to type','Linear steps are mathematically invalid','To make the numbers negative'], a:0, tag:'log scale', focus:'On a log axis, equal spacing means equal RATIOS (×base), which is how scale-sensitive quantities should be compared.',
    why:'A good learning rate could be anywhere across many orders of magnitude. Equal log steps test each ×10 band evenly; a linear sweep would waste almost all its samples in one band.'},
  ],
});
WRONG_WHY['pre-logs']=[
 {1:'100 = 10² is a value, not an exponent — the log returns the EXPONENT, which is 3.',2:'30 mixes things up; log₁₀(1000) is the power of ten that makes 1000, namely 3.',3:'10 is the base, not the answer. Ask "10 to the WHAT is 1000?" → 3.'},
 {1:'xʸ = b swaps the roles — the BASE is b and it\'s raised to y, giving x.',2:'b·y = x is multiplication; a log is about exponentiation, not a product.',3:'y = b/x is division — unrelated to the exponent relationship.'},
 {1:'Multiplying the logs isn\'t a rule — the product INSIDE becomes a SUM outside: log a + log b.',2:'log a − log b is the rule for a QUOTIENT, log(a/b). For a product you add.',3:'log(a+b) doesn\'t simplify at all — a classic trap. Only products and quotients split.'},
 {1:'+1 would be log₂(2). For ½ = 2⁻¹ the exponent is −1, so the log is negative.',2:'0 is log of 1 (b⁰ = 1) — but ½ is below 1, giving a negative log.',3:'½ is the number itself, not its exponent. 2 to the −1 gives ½, so the log is −1.'}];

/* logs lab 1 — log reads the exponent off the bˣ curve */
INTERACTIVES.loginv = function(stage, api){
  const L=makeLab(stage);
  let base=2, x=2, drag=false;
  const M=api.missions([
    {text:'With base 2, drag so the height is <b>8</b> — you\'re reading <b>log₂(8) = 3</b>', xp:20, check:s=>s.base===2&&Math.abs(s.val-8)<.4},
    {text:'Drag to a height <b>below 1</b> — the log of a fraction is <b>negative</b>', xp:20, check:s=>s.val<1&&s.val>0},
    {text:'Find where the height is <b>1</b> — <b>log of 1 is 0</b> for every base', xp:15, check:s=>Math.abs(s.val-1)<.05},
  ]);
  const P=plane(L.ctx,L.W,L.H,34,70,L.H-50);
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const f=t=>Math.pow(base,t), val=f(x), shown=Math.min(val,16);
    P.fn(f,'#7c5cff',3);
    L.ctx.setLineDash([4,4]); L.ctx.strokeStyle='rgba(0,212,255,.5)'; L.ctx.lineWidth=1.5;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(x),P.sy(0)); L.ctx.lineTo(P.sx(x),P.sy(shown)); L.ctx.stroke();
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(0),P.sy(shown)); L.ctx.lineTo(P.sx(x),P.sy(shown)); L.ctx.stroke();
    L.ctx.setLineDash([]);
    if(val<=16) P.dot(x,val,7,'#00d4ff');
    const xs=(+x.toFixed(2)).toString(), vs=(+val.toFixed(3)).toString();
    L.readout.innerHTML=base+'<sup>'+xs+'</sup> = '+vs+'<br>so <b>log<sub>'+base+'</sub>('+vs+') = '+xs+'</b>';
    M.update({base,x,val});
  }
  L.canvas.addEventListener('pointerdown',e=>{drag=true;L.canvas.setPointerCapture(e.pointerId);mv(e);});
  L.canvas.addEventListener('pointermove',mv);
  L.canvas.addEventListener('pointerup',()=>drag=false);
  function mv(e){ if(!drag)return; const c=L.toCanvas(e); x=Math.max(-3.2,Math.min(base===10?1.25:4,P.wx(c.x))); draw(); }
  chips(L.ctrl,'BASE',['2','10'],(i,btn,row)=>{base=[2,10][i]; x=Math.min(x, base===10?1.2:4);
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); }).children[0].classList.add('on');
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b>log reads the curve backwards.</b> Pick a height; the log is the exponent that produced it. Height 8 on base 2 sits above x = 3, because 2³ = 8. Heights below 1 sit at negative x — negative logs.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* logs lab 2 — log turns multiplication into addition */
INTERACTIVES.logmul = function(stage, api){
  const L=makeLab(stage);
  const opts=[0.5,2,4,8];
  let ai=2, bi=3, moved=false;
  const M=api.missions([
    {text:'Pick a = <b>4</b>, b = <b>8</b>: watch log₂4 + log₂8 = <b>log₂32 = 5</b>', xp:20, check:s=>s.a===4&&s.b===8},
    {text:'Make the two logs <b>sum to 0</b> — pick reciprocals so a·b = 1', xp:20, check:s=>Math.abs(s.la+s.lb)<1e-6&&s.moved},
    {text:'Reach a·b = <b>16</b> a different way (e.g. 8×2 or 4×4)', xp:15, check:s=>Math.abs(s.a*s.b-16)<1e-6&&s.moved},
  ]);
  const lg=x=>Math.log(x)/Math.log(2), ox=72, sc=56, FF=getComputedStyle(document.body).fontFamily;
  function seg(x1,x2,y,color,label){
    L.ctx.strokeStyle=color; L.ctx.fillStyle=color; L.ctx.lineWidth=6;
    L.ctx.beginPath(); L.ctx.moveTo(x1,y); L.ctx.lineTo(x2,y); L.ctx.stroke();
    L.ctx.beginPath(); L.ctx.arc(x1,y,3,0,7); L.ctx.fill();
    L.ctx.beginPath(); L.ctx.arc(x2,y,4.5,0,7); L.ctx.fill();
    L.ctx.font='700 11px '+FF; L.ctx.textAlign='center'; L.ctx.fillText(label,(x1+x2)/2,y-11);
  }
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    const a=opts[ai], b=opts[bi], la=lg(a), lb=lg(b), lab=lg(a*b);
    const yA=L.H*0.36, yB=L.H*0.66;
    L.ctx.strokeStyle='rgba(255,255,255,.1)'; L.ctx.lineWidth=1; L.ctx.textAlign='center';
    for(let k=-2;k<=6;k++){ const px=ox+k*sc;
      L.ctx.beginPath(); L.ctx.moveTo(px,28); L.ctx.lineTo(px,L.H-28); L.ctx.stroke();
      L.ctx.fillStyle='#5d6485'; L.ctx.font='600 10px '+FF; L.ctx.fillText(k,px,L.H-12); }
    L.ctx.fillStyle='#8b93b8'; L.ctx.textAlign='left'; L.ctx.font='700 11px '+FF; L.ctx.fillText('log₂ value →', L.W-108, 22);
    seg(ox, ox+la*sc, yA, '#00d4ff', 'log₂'+a+' = '+(+la.toFixed(2)));
    seg(ox+la*sc, ox+(la+lb)*sc, yA, '#7c5cff', '+ log₂'+b+' = '+(+lb.toFixed(2)));
    seg(ox, ox+lab*sc, yB, '#ffc94d', 'log₂'+(a*b)+' = '+(+lab.toFixed(2)));
    L.ctx.setLineDash([4,4]); L.ctx.strokeStyle='rgba(255,255,255,.4)'; L.ctx.lineWidth=1;
    L.ctx.beginPath(); L.ctx.moveTo(ox+(la+lb)*sc,yA); L.ctx.lineTo(ox+lab*sc,yB); L.ctx.stroke(); L.ctx.setLineDash([]);
    L.readout.innerHTML='log₂('+a+') + log₂('+b+') = '+(+la.toFixed(2))+' + '+(+lb.toFixed(2))+' = <b>'+(+(la+lb).toFixed(2))+'</b><br>'+
      'log₂('+a+'·'+b+') = log₂('+(a*b)+') = <b>'+(+lab.toFixed(2))+'</b>  ✓ they match';
    M.update({a,b,la,lb,moved});
  }
  chips(L.ctrl,'a',opts.map(String),(i,btn,row)=>{ai=i;moved=true;[...row.children].forEach(x=>x.classList.remove('on'));btn.classList.add('on');draw();}).children[ai].classList.add('on');
  chips(L.ctrl,'b',opts.map(String),(i,btn,row)=>{bi=i;moved=true;[...row.children].forEach(x=>x.classList.remove('on'));btn.classList.add('on');draw();}).children[bi].classList.add('on');
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Top row: <b style="color:#7fe7ff">log a</b> then <b style="color:#b9a8ff">log b</b>, laid end to end. Bottom row: <b style="color:#ffc94d">log(a·b)</b> in one jump. They land at the same place — multiplying inside equals adding the logs.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== WORLD 0: Sigma Notation ================== */
LESSONS.push({
  id:'pre-sigma', world:'pre', emoji:'➕', title:'Sigma Notation & Reading Formulas',
  sub:'Σ just means "add these up." Decode it once and almost every ML formula opens up.',
  learn:`<p>The wall most engineers hit reading ML papers isn't the math — it's the <em>notation</em>. The biggest, scariest symbol is <strong>Σ</strong> (capital sigma), and it means one friendly thing: <strong>add up a list</strong>.</p>
  <div class="formula">Σ&thinsp;<sub>i=1</sub><sup>n</sup>  aᵢ   =   a₁ + a₂ + … + aₙ</div>
  <p>Read it in three parts. The <strong>index</strong> i starts at the bottom value, climbs to the top value n, and for each i you evaluate the expression on the right and add it to a running total. The subscript <code>aᵢ</code> simply means "the i-th item in the list a".</p>
  <p>If you code, you already know this — Σ is a <code>for</code> loop. Once it's automatic, the formulas you've heard of become readable sentences:</p>
  <p>• <strong>Mean</strong>: x̄ = (1/n) Σ xᵢ — "add the values, divide by how many." It's the data's balance point.<br>
  • <strong>Dot product</strong> (World 1): a·b = Σ aᵢbᵢ — "multiply matching slots, then sum."<br>
  • <strong>Loss</strong> (World 4): often (1/n) Σ (errorᵢ)² — "average squared miss across the dataset."</p>`,
  ml:`Almost every loss, metric and expectation in ML is a Σ in disguise: mean-squared error, cross-entropy (a sum of logs), the expectation E[X] = Σ p(x)·x. Its cousin <b>Π</b> (capital pi) means <em>multiply</em> the list instead — and taking a log turns a scary Π into a friendly Σ, which is the whole reason log-likelihoods are summed. Fluent Σ-reading is the difference between a paper looking like noise and like prose.`,
  deeper:[
   {title:'😵 Stuck? It\'s literally a for-loop', body:'Σ is a <code>for</code> loop you\'ve written a thousand times:<br><code>total = 0<br>for i in range(1, n+1):<br>&nbsp;&nbsp;total += a[i]</code><br>The bottom of the Σ is the loop start, the top is the end, the right-hand expression is the loop body. Coders have an unfair advantage at reading this.'},
   {title:'🚀 Go deeper: the index is a dummy', body:'The letter (i, j, k) is arbitrary — Σᵢ aᵢ and Σⱼ aⱼ are the same sum. <b>Double sums</b> Σᵢ Σⱼ are just nested loops, and they\'re everywhere in matrix math (every matrix multiply is one). When a scary double sum appears, mentally indent it into two nested for-loops.'},
   {title:'🚀 Go deeper: Π and the log trick', body:'A likelihood multiplies probabilities: L = Πᵢ p(xᵢ). Multiplying thousands of sub-1 numbers underflows to exactly 0 on a computer. Take the log: ln L = Σᵢ ln p(xᵢ) — the product becomes a sum that adds safely, with the same maximizer. Every "negative log-likelihood" loss is this one move.'}],
  labs:[
   {key:'build', title:'Build a sum', interactive:'sigma',
    intro:'<p>Slide the upper limit n and watch terms switch on and accumulate. Try each rule: Σ i (counting), Σ i² (squares), and Σ aᵢ (a real data list). The index i is just the term number.</p>'},
   {key:'mean', title:'The mean is a balance point', interactive:'sigmamean',
    intro:'<p>The mean x̄ = (1/n) Σ xᵢ has a physical meaning: the point where the data balances. Drag the points and watch the gold fulcrum settle — then notice how a single outlier yanks it.</p>'},
  ],
  quiz:[
   {q:'What does Σ&thinsp;<sub>i=1</sub><sup>4</sup> i equal?', opts:['10','24','4','1+2+3+4+5'], a:0, tag:'evaluating a sum', focus:'Run the index from the bottom value up to the top, adding the expression each time.',
    why:'i runs 1, 2, 3, 4 and we add them: 1+2+3+4 = 10. (It stops AT 4, so there is no +5.)'},
   {q:'In Σ&thinsp;<sub>i=1</sub><sup>n</sup> aᵢ, what is n?', opts:['Where the index stops — it sets how many terms are added','The size of each term','The running total','The starting index'], a:0, tag:'reading the limits', focus:'Bottom = where i starts, top (n) = where it stops. Together they fix the number of terms.',
    why:'The top number n is the upper limit: the index climbs up to it, so n controls how many terms get added.'},
   {q:'The mean of a dataset is written…', opts:['(1/n) Σ xᵢ','Σ xᵢ²','Π xᵢ','Σ (1/xᵢ)'], a:0, tag:'mean formula', focus:'Mean = sum of the values divided by how many there are: (1/n) Σ xᵢ.',
    why:'Add the values (Σ xᵢ) and divide by the count n — the balance point you dragged in the lab.'},
   {q:'A capital Π (pi) instead of Σ tells you to…', opts:['Multiply the terms','Add the terms','Take the average','Differentiate'], a:0, tag:'product notation', focus:'Σ sums, Π multiplies — same loop, different operation in the body.',
    why:'Π is the product operator: multiply the listed terms. (Taking a log turns it back into a Σ — the log-likelihood trick.)'},
   {q:'Why sum LOG-probabilities instead of multiplying the probabilities directly?', opts:['Products of tiny numbers underflow to 0; logs turn the product into a safe sum','Logs are faster to compute','Summing is more accurate than the true product','It changes which model comes out best'], a:0, tag:'log-sum trick', focus:'ln(ab) = ln a + ln b converts an underflowing product (Π) into a stable sum (Σ).',
    why:'Multiplying thousands of sub-1 probabilities collapses to 0 in floating point. ln turns the product into a sum (ln Π = Σ ln), which adds safely — and since ln is monotonic, the best model is unchanged.'},
  ],
});
WRONG_WHY['pre-sigma']=[
 {1:'24 = 1·2·3·4 — that\'s the PRODUCT (Π), not the sum. Σ adds: 1+2+3+4.',2:'4 is just the top limit, not the total. Add every term from i=1 up to 4.',3:'The index stops AT 4, so there is no +5 term. It\'s 1+2+3+4 = 10.'},
 {1:'That describes a term\'s size — but n is the upper LIMIT: it says where the index stops, i.e. how many terms.',2:'The running total is the RESULT of the Σ, not n.',3:'The starting index is the bottom number (here 1), not the top value n.'},
 {1:'Σ xᵢ² sums squares — that\'s variance territory, not the plain mean.',2:'Π xᵢ multiplies the values; the mean adds them.',3:'Σ (1/xᵢ) leads to the harmonic mean — a different beast.'},
 {1:'Adding is Σ\'s job; Π is specifically the MULTIPLY operator.',2:'Averaging needs a Σ plus a division; Π alone just multiplies.',3:'Π is a sum-like accumulation operator — nothing to do with derivatives.'},
 {1:'Speed isn\'t the issue — correctness is: the raw product underflows to exactly 0 and destroys the information entirely.',2:'The log-sum equals the log of the product exactly (ln ab = ln a + ln b) — it is not an approximation.',3:'Because ln is monotonic, the SAME parameters maximize both forms — the best model is identical.'}];

/* sigma lab 1 — build a sum, watch terms accumulate */
INTERACTIVES.sigma = function(stage, api){
  const data=[3,1,4,1,5,9,2,6];
  const exprs=[
    {key:'i', label:'Σ i', term:i=>i, tex:'i'},
    {key:'i2', label:'Σ i²', term:i=>i*i, tex:'i²'},
    {key:'a', label:'Σ aᵢ (data)', term:i=>data[i-1], tex:'aᵢ'},
  ];
  let ei=0, n=3;
  const wrap=document.createElement('div'); wrap.style.cssText='display:flex;flex-direction:column;gap:16px'; stage.appendChild(wrap);
  const head=document.createElement('div'); head.style.cssText='background:var(--bg2);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:18px;text-align:center'; wrap.appendChild(head);
  const ctrls=document.createElement('div'); ctrls.className='controls'; wrap.appendChild(ctrls);
  const M=api.missions([
    {text:'Using <b>Σ i</b>, set n so the sum equals <b>15</b> (that\'s 1+2+3+4+5)', xp:20, check:s=>s.key==='i'&&s.sum===15},
    {text:'Switch to <b>Σ i²</b> and set n = 3 → 1+4+9 = <b>14</b>', xp:20, check:s=>s.key==='i2'&&s.n===3},
    {text:'Switch to <b>Σ aᵢ</b> and include <b>all 8</b> data terms', xp:15, check:s=>s.key==='a'&&s.n===8},
  ]);
  function render(){
    const ex=exprs[ei]; let sum=0; const terms=[];
    for(let i=1;i<=n;i++){ const t=ex.term(i); sum+=t; terms.push(t); }
    const cells=[];
    for(let i=1;i<=8;i++){ const on=i<=n, t=ex.term(i);
      cells.push('<span style="display:inline-flex;flex-direction:column;align-items:center;margin:3px;opacity:'+(on?1:.28)+'">'+
        '<span style="font-family:var(--mono);font-size:10.5px;color:#8b93b8">i='+i+'</span>'+
        '<span style="font-family:var(--mono);font-size:17px;font-weight:800;color:'+(on?'#aee8ff':'#5a6079')+';background:var(--card2);border:1px solid '+(on?'rgba(0,212,255,.45)':'rgba(255,255,255,.08)')+';border-radius:8px;padding:5px 9px;min-width:24px">'+t+'</span></span>');
    }
    head.innerHTML=
      '<div style="font-size:28px;font-family:var(--mono);color:#b9a8ff;font-weight:800;line-height:1;display:inline-flex;align-items:center;gap:4px">'+
        '<span style="font-size:40px">Σ</span>'+
        '<span style="display:inline-flex;flex-direction:column;font-size:12px;line-height:1.25"><span>n='+n+'</span><span>i=1</span></span>'+
        '<span style="margin-left:4px">'+ex.tex+'</span></div>'+
      '<div style="margin:16px 0;line-height:1.3">'+cells.join('')+'</div>'+
      '<div style="font-family:var(--mono);font-size:15px;color:#cdd4f0">'+terms.join(' + ')+' = <b style="color:#2dd4a0;font-size:20px">'+sum+'</b></div>';
    M.update({key:ex.key,n,sum});
  }
  chips(ctrls,'EXPRESSION',exprs.map(e=>e.label),(i,btn,row)=>{ei=i;[...row.children].forEach(b=>b.classList.remove('on'));btn.classList.add('on');render();}).children[0].classList.add('on');
  slider(ctrls,'upper limit n',1,8,1,3,v=>Math.round(v).toString(),v=>{n=Math.round(v);render();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Σ ("sigma") means <b>add up</b>. The bottom (i=1) and top (n) say where the index starts and stops; the symbol on the right is the rule for each term. Slide n to fold in more terms.</div>';
  ctrls.appendChild(note);
  render();
};

/* sigma lab 2 — the mean as the balance point of the data */
INTERACTIVES.sigmamean = function(stage, api){
  const L=makeLab(stage);
  const xs=[-3,-1,2]; let drag=null;
  const M=api.missions([
    {text:'Drag the points so the <b>mean is 0</b> (the fulcrum sits at the origin)', xp:25, check:s=>Math.abs(s.mean)<.1},
    {text:'Now make the mean clearly <b>positive</b> (mean &gt; 1)', xp:15, check:s=>s.mean>1},
    {text:'Drag one point out to <b>x &gt; 4</b> and watch the fulcrum chase it', xp:15, check:s=>s.maxx>4},
  ]);
  const cy=L.H/2, x0=42, x1=L.W-42, sc=(x1-x0)/12, FF=getComputedStyle(document.body).fontFamily;
  const toPx=x=>x0+(x+6)*sc, toW=px=>(px-x0)/sc-6;
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    L.ctx.strokeStyle='rgba(255,255,255,.3)'; L.ctx.lineWidth=2;
    L.ctx.beginPath(); L.ctx.moveTo(x0,cy); L.ctx.lineTo(x1,cy); L.ctx.stroke();
    L.ctx.textAlign='center'; L.ctx.font='600 11px '+FF;
    for(let k=-6;k<=6;k++){ const px=toPx(k);
      L.ctx.strokeStyle='rgba(255,255,255,'+(k===0?.5:.15)+')'; L.ctx.lineWidth=1;
      L.ctx.beginPath(); L.ctx.moveTo(px,cy-6); L.ctx.lineTo(px,cy+6); L.ctx.stroke();
      L.ctx.fillStyle='#5d6485'; L.ctx.fillText(k, px, cy+22); }
    const mean=xs.reduce((a,b)=>a+b,0)/xs.length, mx=toPx(mean);
    L.ctx.fillStyle='#ffc94d';
    L.ctx.beginPath(); L.ctx.moveTo(mx,cy+8); L.ctx.lineTo(mx-12,cy+30); L.ctx.lineTo(mx+12,cy+30); L.ctx.closePath(); L.ctx.fill();
    L.ctx.font='800 12px '+FF; L.ctx.fillText('mean '+mean.toFixed(2), mx, cy+46);
    xs.forEach(x=>{ L.ctx.fillStyle='#00d4ff'; L.ctx.beginPath(); L.ctx.arc(toPx(x),cy,9,0,7); L.ctx.fill(); });
    L.ctx.textAlign='left';
    L.readout.innerHTML='mean = (1/'+xs.length+') Σ xᵢ<br>= ('+xs.map(x=>x.toFixed(1)).join(' + ').replace(/\+ -/g,'− ')+') / '+xs.length+' = <b>'+mean.toFixed(2)+'</b>';
    M.update({mean, maxx:Math.max(...xs)});
  }
  L.canvas.addEventListener('pointerdown',e=>{ const c=L.toCanvas(e); let best=-1, bd=1e9;
    xs.forEach((x,i)=>{ const d=Math.abs(toPx(x)-c.x)+Math.abs(cy-c.y); if(d<bd){bd=d;best=i;} });
    if(bd<70){ drag=best; L.canvas.setPointerCapture(e.pointerId); mv(e); } });
  L.canvas.addEventListener('pointermove',mv);
  L.canvas.addEventListener('pointerup',()=>drag=null);
  function mv(e){ if(drag===null||drag<0)return; const c=L.toCanvas(e); xs[drag]=Math.max(-6,Math.min(6,Math.round(toW(c.x)*2)/2)); draw(); }
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The <b>mean</b> is the balance point of the data: <code>(1/n) Σ xᵢ</code>. Drag the blue points — the gold fulcrum always settles where they balance. Push one point far out and the mean follows (means are sensitive to outliers).</div>';
  L.ctrl.appendChild(note);
  draw();
};

