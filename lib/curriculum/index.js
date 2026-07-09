/* ================================================================
   CURRICULUM — all lessons, labs and wrong-answer feedback.
   ----------------------------------------------------------------
   Lesson schema:
   {
     id:    'la-vectors',        // stable unique key (progress key)
     world: 'la' | 'calc',       // which track it appears in
     emoji: '...', title: '...', sub: '...card subtitle...',
     learn: '<p>HTML body</p>',  // the LEARN step
     ml:    '<b>...</b> html',   // "WHY THIS MATTERS FOR AI" box
     interactive: 'vectors',     // key into INTERACTIVES registry
     expositions:[{key,title,caption,figure}], // optional Learn-step "see it first" gallery; figure is a headless-safe INTERACTIVE taking only (stage)
     quiz: [ {q:'html', opts:['a','b','c','d'], a:0, why:'html'} ]
   }
   Interactives: INTERACTIVES[key] = (stage, api) => cleanup?
     api.missions([{text, xp, check:(state)=>bool}]) gates progression.
   Wrong-answer feedback rides inline on each question as q.wrong =
     {wrongOptIdx: html} — why that option is wrong + the misconception.
   Per-question study metadata is inline too: q.tag / q.focus.
   ================================================================ */
import { LESSONS, INTERACTIVES, registerLesson, validateCurriculum } from './registry.js';
// Concept registry (KB spine, docs/KNOWLEDGE-BASE-PLAN.md §6): importing it
// runs its registerConcept() calls as a side effect, populating CONCEPTS +
// TAG_ALIASES before the tag cross-check below runs.
import { validateConcepts, validateLessonTags } from './concepts.js';
import { makeLab, slider, chips, plane, clearBg, fmt2, registerCleanup } from '../engine.js';

/* ================== WORLD 1: LINEAR ALGEBRA ================== */

registerLesson({
  id:'la-vectors', world:'la', emoji:'➡️', title:'Vectors: Arrows & Data',
  sub:'What a vector really is — and why every piece of data in ML is one.',
  learn:`<p>A <strong>vector</strong> is just an ordered list of numbers. In 2D, the vector \\([3, 2]\\) means "go 3 right, 2 up" — drawn as an arrow from the origin.</p>
  <p>Two ways to read the same object: as a <strong>point in space</strong> (a location) or as a <strong>movement</strong> (a direction + distance). Its length is called the <strong>magnitude</strong>:</p>
  <div class="formula">$$\\|v\\| = \\sqrt{x^2 + y^2}$$</div>
  <p>That's just the Pythagorean theorem. A vector with magnitude 1 is a <strong>unit vector</strong> — pure direction, no size.</p>`,
  ml:`In machine learning, <b>everything is a vector</b>. A user profile, a word, an image — all encoded as lists of numbers called <b>embeddings</b>. GPT-class models represent each token as a vector with thousands of dimensions. The 2D arrows you're about to drag are the same objects, just small enough to see.`,
  expositions:[
    {key:'read',  title:'One arrow, two readings',      figure:'vecReadings', caption:'A vector is one object you can read two ways: as an <b>arrow</b> (direction + length) or as a <b>list of numbers</b> (its components). Same thing, two coordinate systems.'},
    {key:'space', title:'Every data point is an arrow',  figure:'vecDataSpace', caption:'Give each animal a row <code>[speed, size]</code> and it becomes a point — an arrow from the origin — in feature space. Similar animals sit close together; search = find the nearest arrow.'},
    {key:'dims',  title:'The same idea, more numbers',   figure:'vecDims', caption:'Nothing about a vector needs 2-D. A GPT token is a vector with thousands of components — you can\'t draw it, but every rule here works identically.'},
  ],
  labs:[
    {key:'explore', title:'Anatomy of a vector', interactive:'vectors',
     intro:'<p>Drag the arrow tip. Feel how the two components and the magnitude ‖v‖ move together — and hit the three targets to lock in what a vector <em>is</em>.</p>'},
    {key:'normalize', title:'Normalize to the unit circle', interactive:'vectorsNorm',
     intro:'<p>Now solve a real problem: shrink a vector down to length exactly 1 (a <strong>unit vector</strong>). Predict the length first, then find the scalar that lands it on the circle — that scalar is 1/‖v‖.</p>'},
    {key:'polar', title:'Direction & length — the polar view', interactive:'vectorsPolar', intro:'<p>Same arrow, different controls: steer with <strong>length r</strong> and <strong>angle θ</strong>. Components are \\([r\\cos\\theta,\\ r\\sin\\theta]\\).</p>'},
    {key:'data',  title:'Vectors are data — nearest neighbor', interactive:'vectorsData',  intro:'<p>Use vectors the way ML does: as <strong>data</strong>. Each animal is a point \\([\\text{speed},\\text{size}]\\). Drag the probe and watch the distance ranking — baby nearest-neighbor search.</p>'},
  ],
  quiz:[
    {type:'numeric', q:'Compute the magnitude of \\([5, 12]\\). (‖v‖ = √(x²+y²))', answer:13, tol:0.05,
     tag:'magnitude', focus:'‖v‖ = √(x²+y²). 5-12-13 is a Pythagorean triple worth memorizing.',
     hint:'Square each component, add, then take the square root: √(25+144) = √169.',
     wolfram:'sqrt(5^2 + 12^2)',
     why:'‖[5,12]‖ = √(25 + 144) = √169 = <b>13</b> — the 5-12-13 right triangle.'},
    {q:'The vector \\([-4, 3]\\) has magnitude…', opts:['1','5','7','25'], a:1,
     tag:'magnitude', focus:'Practice ‖v‖ = √(x²+y²) on paper with 3-4-5 style triangles until squaring-before-adding is automatic.', why:'‖v‖ = √((−4)² + 3²) = √(16+9) = √25 = <b>5</b>. Classic 3-4-5 triangle.', wrong:{0:'<b>Likely trap:</b> adding the components (−4 + 3 = −1). Magnitude isn\'t a sum — it\'s Pythagoras: <b>square</b> each component, add, then square-root: √(16+9) = √25 = 5.',
  2:'<b>Likely trap:</b> adding absolute values (4 + 3 = 7). That\'s "Manhattan distance" — a real thing, but not the magnitude. Euclidean length squares first: √(16+9) = 5.',
  3:'So close — 25 is x² + y². You stopped one step early: magnitude is the <b>square root</b> of that sum. √25 = 5.'}},
    {q:'A vector \\([0.2, -0.1, 0.7, \\ldots]\\) with 1,536 numbers in it is best described as…', opts:['An error — vectors are 2D or 3D','A point/direction in 1,536-dimensional space','A matrix','1,536 separate vectors'], a:1,
     tag:'high dimensions', focus:'Read about embeddings: a vector is an ordered list of ANY length — search "word embeddings intuition".', why:'Dimensions beyond 3 work exactly like 2D — you just can\'t draw them. OpenAI\'s embedding vectors are literally this size.', wrong:{0:'Understandable — you can\'t <i>picture</i> a 1,536-D arrow. But the math never requires a picture: the definitions (components, magnitude, dot product) work identically in any number of dimensions. ML lives in this regime.',
  2:'A matrix is a <b>grid</b> of numbers (rows × columns) that <i>transforms</i> vectors. One ordered list of 1,536 numbers is a single vector — one point in a 1,536-D space.',
  3:'Each of the 1,536 numbers is a <b>component</b> (one coordinate) of a single vector — like x and y are components of [3,2], not two separate vectors.'}},
    {q:'Which vector is a <b>unit</b> vector?', opts:['\\([1, 1]\\)','\\([0.6, 0.8]\\)','\\([2, 0]\\)','\\([0.5, 0.5]\\)'], a:1,
     tag:'unit vectors', focus:'Check several vectors: do the squared components sum to exactly 1? Normalize one by dividing by its length.', why:'√(0.36 + 0.64) = √1 = 1. Note \\([1,1]\\) has magnitude √2 ≈ 1.41 — a common trap.', wrong:{0:'<b>Classic trap.</b> The components being 1 doesn\'t make the length 1: ‖[1,1]‖ = √(1+1) = √2 ≈ 1.41. The diagonal of a unit square is longer than its sides.',
  2:'Clean direction, wrong length: ‖[2,0]‖ = 2. Divide by its magnitude to unit-ize it: [1, 0].',
  3:'Small components ≠ unit length. ‖[0.5,0.5]‖ = √(0.25+0.25) ≈ 0.71. The test is always: do the squares sum to exactly 1?'}},
  ]
});
INTERACTIVES.vectors = function(stage, api){
  const L=makeLab(stage); const v={x:2,y:1.5};
  const m=api.missions([
    {text:'Drag the arrow tip to exactly <b>[3, 2]</b>', xp:20, check:s=>Math.abs(s.x-3)<.15&&Math.abs(s.y-2)<.15},
    {text:'Make the magnitude bigger than <b>4.5</b>', xp:20, check:s=>Math.hypot(s.x,s.y)>4.5},
    {text:'Point it into the third quadrant (both components negative)', xp:20, check:s=>s.x<-.3&&s.y<-.3},
  ]);
  const P=plane(L.ctx,L.W,L.H,52);
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    // target ghost
    P.dot(3,2,6,'rgba(255,201,77,.35)');
    L.ctx.strokeStyle='rgba(255,201,77,.5)'; L.ctx.setLineDash([4,4]); L.ctx.lineWidth=1.5;
    L.ctx.strokeRect(P.sx(3)-9,P.sy(2)-9,18,18); L.ctx.setLineDash([]);
    // component legs
    L.ctx.strokeStyle='rgba(0,212,255,.4)'; L.ctx.setLineDash([5,5]); L.ctx.lineWidth=2;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(v.x),P.sy(0)); L.ctx.lineTo(P.sx(v.x),P.sy(v.y)); L.ctx.stroke();
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(0),P.sy(0)); L.ctx.lineTo(P.sx(v.x),P.sy(0)); L.ctx.stroke();
    L.ctx.setLineDash([]);
    P.arrow(0,0,v.x,v.y,'#7c5cff',4,'v');
    P.dot(v.x,v.y,7,'#b9a8ff');
    L.readout.innerHTML='v = ['+fmt2(v.x)+', '+fmt2(v.y)+']<br>‖v‖ = '+Math.hypot(v.x,v.y).toFixed(2);
    m.update(v);
  }
  let drag=false;
  L.canvas.addEventListener('pointerdown',e=>{drag=true;L.canvas.setPointerCapture(e.pointerId);move(e);});
  L.canvas.addEventListener('pointermove',move);
  L.canvas.addEventListener('pointerup',()=>drag=false);
  function move(e){ if(!drag)return; const c=L.toCanvas(e);
    v.x=Math.round(P.wx(c.x)*4)/4; v.y=Math.round(P.wy(c.y)*4)/4; draw(); }
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<label><span>HOW TO PLAY</span></label><div style="font-size:13px;line-height:1.6;color:#cdd4f0">Drag anywhere on the grid to move the arrow tip. Watch the components and magnitude update.</div>';
  L.ctrl.prepend(note);
  draw();
};

registerLesson({
  id:'la-vecops', world:'la', emoji:'➕', title:'Adding & Scaling Vectors',
  sub:'Tip-to-tail addition and stretching by scalars — the two moves everything else is built from.',
  learn:`<p>Vectors combine with two operations, and they're both dead simple:</p>
  <p><strong>Addition</strong> — add component-wise: \\([1,2] + [3,-1] = [4,1]\\). Geometrically: walk along the first arrow, then the second ("tip-to-tail").</p>
  <p><strong>Scalar multiplication</strong> — multiply every component by a number: \\(2 \\cdot [3,1] = [6,2]\\). It stretches (|c|&gt;1), shrinks (|c|&lt;1), or flips (c&lt;0) the arrow.</p>
  <div class="formula">$$c \\cdot a + b \\quad \\leftarrow \\quad \\text{a "linear combination"}$$</div>
  <p>Combining scaling and adding is called a <strong>linear combination</strong> — the single most important construction in linear algebra.</p>`,
  ml:`A neuron computes exactly this: \\(w_1 x_1 + w_2 x_2 + \\ldots + b\\) — a linear combination of its inputs plus a bias. Training a network = finding the right scalars. You're about to do by hand what backprop does a trillion times.`,
  deeper:[
   {title:'🚀 Go deeper: span, and attention as a convex combination', body:'Take one pair of vectors and form <em>every</em> linear combination \\(c_1 a + c_2 b\\) by ranging c₁, c₂ over all real numbers — the whole set of reachable points is called the <b>span</b> of {a, b}. For two non-parallel vectors in the plane, the span is all of ℝ² (the "reach the target" lab is you hunting for the one c₁, c₂ that lands on a chosen point in that span). Restrict the scalars two ways and you get named, more useful sub-populations: keep them non-negative and you get a <b>cone</b>; further force them to sum to 1 and you get an <b>affine combination</b>; do both at once (non-negative <em>and</em> summing to 1) and you get a <b>convex combination</b> — a weighted average, guaranteed to land inside the convex hull (the "filled-in" shape) of the original points, never outside it. This is exactly what <b>attention</b> computes: softmax turns raw scores into weights that are non-negative and sum to 1, and the output is that softmax-weighted average of the value vectors. So every attention output is a convex combination of the values being attended to — geometrically, a point trapped inside their convex hull, no matter how the weights shift. (Strang, <em>Introduction to Linear Algebra</em>, ch. 1; Vaswani et al., "Attention Is All You Need," 2017.)'}],
  labs:[
    {key:'explore', title:'Tip-to-tail & scaling', interactive:'vecops',
     intro:'<p>Drag the two vectors and stretch one with the scalar. Watch how scaling-then-adding builds a <strong>linear combination</strong>.</p>'},
    {key:'reach', title:'Reach the target', interactive:'vecopsReach',
     intro:'<p>Here is the real skill: given two fixed vectors, find the exact amounts <strong>c₁, c₂</strong> that combine them to hit a target point. Every target has one answer — you are solving a 2×2 system by hand.</p>'},
  ],
  quiz:[
    {q:'\\([2, -1] + [-2, 4]\\) = ?', opts:['\\([0, 3]\\)','\\([4, 5]\\)','\\([0, -5]\\)','\\([-4, -4]\\)'], a:0,
     tag:'vector addition', focus:'Do five component-wise additions by hand, keeping signs — then verify one geometrically tip-to-tail in the lab.', why:'Component-wise: 2+(−2)=0 and −1+4=3.', wrong:{1:'<b>Likely trap:</b> dropping the minus signs and adding sizes. Addition is strictly component-wise, signs included: 2+(−2)=0, −1+4=3.',
  2:'Your x is right; the y slipped: −1 + 4 = +3, not −5. (−5 would be subtracting 4 instead of adding it.)',
  3:'That looks like negating-then-combining. Addition never flips signs on its own: just add matching slots: [2+(−2), −1+4] = [0, 3].'}},
    {q:'What does multiplying a vector by <b>−0.5</b> do to it?', opts:['Rotates it 90°','Halves its length and reverses its direction','Doubles its length','Nothing — scalars only affect magnitude'], a:1,
     tag:'scalar multiplication', focus:'Internalize: |c| changes length, sign flips direction, rotation is impossible for a scalar.', why:'|−0.5| = 0.5 shrinks it to half length; the minus sign flips it 180°.', wrong:{0:'Scalars <b>cannot rotate</b> — they only stretch or flip a vector along the line it already lives on. Rotation requires a matrix (next lessons!).',
  2:'<b>Likely trap:</b> reading 0.5 as "ratio 2". Multiplying by |−0.5| = 0.5 <i>halves</i> the length; the minus sign then reverses direction.',
  3:'Both parts of the scalar matter: 0.5 changes the length (halves it), the − sign reverses direction. Only c = 1 leaves a vector untouched.'}},
    {q:'Which expression is a linear combination of \\(a\\) and \\(b\\)?', opts:['\\(a \\cdot b\\)','\\(3a - 2b\\)','\\(a / b\\)','\\(\\|a\\| + \\|b\\|\\)'], a:1,
     tag:'linear combinations', focus:'Write out c₁a + c₂b for a few scalars; note the result is always a vector, never a number.', why:'Scalars times vectors, summed: 3a + (−2)b. Dot product gives a number, division isn\'t defined, and magnitudes are just lengths.', wrong:{0:'a·b is the <b>dot product</b> — it outputs a single number. A linear combination outputs a <i>vector</i>: scalars times vectors, added: 3a − 2b.',
  2:'Vector division simply isn\'t defined — there\'s no consistent way to "divide by an arrow". Only scaling and adding are allowed in linear algebra.',
  3:'‖a‖ + ‖b‖ adds two <i>lengths</i> — a plain number. Linear combinations keep the vectors themselves: (scalar)·a + (scalar)·b.'}},
  ]
});
INTERACTIVES.vecops = function(stage, api){
  const L=makeLab(stage);
  const a={x:2,y:1}, b={x:1,y:2}; let c=1;
  const m=api.missions([
    {text:'Make <b>a + b</b> land on the gold target <b>[4, 1]</b>', xp:20, check:s=>Math.abs(s.sx-4)<.2&&Math.abs(s.sy-1)<.2&&Math.abs(s.c-1)<.01},
    {text:'Set the scalar <b>c negative</b> and watch a flip', xp:15, check:s=>s.c<=-0.5},
    {text:'Make <b>c·a + b ≈ 0</b> (the zero vector, length &lt; 0.3)', xp:25, check:s=>Math.hypot(s.sx,s.sy)<0.3},
  ]);
  const P=plane(L.ctx,L.W,L.H,50);
  let dragging=null;
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const ca={x:c*a.x,y:c*a.y}, s={x:ca.x+b.x,y:ca.y+b.y};
    P.dot(4,1,7,'rgba(255,201,77,.4)');
    L.ctx.strokeStyle='#ffc94d'; L.ctx.setLineDash([4,4]); L.ctx.lineWidth=1.5;
    L.ctx.strokeRect(P.sx(4)-10,P.sy(1)-10,20,20); L.ctx.setLineDash([]);
    // tip-to-tail ghost of b starting at ca
    L.ctx.globalAlpha=.45; P.arrow(ca.x,ca.y,ca.x+b.x,ca.y+b.y,'#00d4ff',2.5); L.ctx.globalAlpha=1;
    P.arrow(0,0,ca.x,ca.y,'#7c5cff',4,'c·a');
    P.arrow(0,0,b.x,b.y,'#00d4ff',4,'b');
    P.arrow(0,0,s.x,s.y,'#2dd4a0',4,'c·a+b');
    P.dot(a.x,a.y,7,'#b9a8ff'); P.dot(b.x,b.y,7,'#7fe7ff');
    L.readout.innerHTML='a=['+fmt2(a.x)+','+fmt2(a.y)+']  b=['+fmt2(b.x)+','+fmt2(b.y)+']<br>c·a+b = ['+fmt2(s.x)+', '+fmt2(s.y)+']';
    m.update({sx:s.x,sy:s.y,c});
  }
  function pick(e){ const p=L.toCanvas(e), wx=P.wx(p.x), wy=P.wy(p.y);
    return (Math.hypot(wx-a.x,wy-a.y)<Math.hypot(wx-b.x,wy-b.y))?a:b; }
  L.canvas.addEventListener('pointerdown',e=>{dragging=pick(e);L.canvas.setPointerCapture(e.pointerId);move(e);});
  L.canvas.addEventListener('pointermove',move);
  L.canvas.addEventListener('pointerup',()=>dragging=null);
  function move(e){ if(!dragging)return; const p=L.toCanvas(e);
    dragging.x=Math.round(P.wx(p.x)*4)/4; dragging.y=Math.round(P.wy(p.y)*4)/4; draw(); }
  slider(L.ctrl,'scalar c (stretches a)',-2,2,0.25,1,v=>v.toFixed(2),v=>{c=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Drag the <b style="color:#b9a8ff">purple</b> and <b style="color:#7fe7ff">cyan</b> dots to move <b>a</b> and <b>b</b>. The <b style="color:#2dd4a0">green</b> arrow is the linear combination.</div>';
  L.ctrl.appendChild(note);
  draw();
};

registerLesson({
  id:'la-dot', world:'la', emoji:'🎯', title:'Dot Product & Similarity',
  sub:'One number that tells you how aligned two vectors are. The engine of search & attention.',
  learn:`<p>The <strong>dot product</strong> multiplies matching components and sums them:</p>
  <div class="formula">$$a \\cdot b = a_1 b_1 + a_2 b_2$$</div>
  <p>It also has a geometric identity: \\(a \\cdot b = \\|a\\|\\|b\\|\\cos\\theta\\), where θ is the angle between the arrows. So the dot product measures <strong>alignment</strong>:</p>
  <p>• <strong>Positive</strong> → pointing the same general way<br>
  • <strong>Zero</strong> → perpendicular (<strong>orthogonal</strong>) — completely unrelated directions<br>
  • <strong>Negative</strong> → pointing against each other</p>
  <p>Divide out the lengths and you get <strong>cosine similarity</strong> = cos θ, a pure alignment score from −1 to 1.</p>`,
  ml:`This is the workhorse of modern AI. <b>Semantic search</b> ranks documents by cosine similarity of embeddings. <b>Attention</b> in transformers scores every query against every key with a dot product — actually the <em>scaled</em> dot product Q·Kᵀ/√d (the √d keeps the scores from blowing up in high dimensions and starving the gradient). When you hear "Q·Kᵀ", it's this, billions of times per second.`,
  labs:[
    {key:'explore', title:'Alignment & angle', interactive:'dot',
     intro:'<p>Drag two vectors and watch cos θ swing from +1 (aligned) through 0 (orthogonal) to −1 (opposed). Build an intuition for what the sign means.</p>'},
    {key:'target', title:'Hit the dot product', interactive:'dotTarget',
     intro:'<p>Now control the number itself. Construct an <strong>orthogonal pair</strong> (a·b = 0) and hit exact positive and negative targets — you have to reason about the products a₁b₁ + a₂b₂, not just eyeball the angle.</p>'},
  ],
  quiz:[
    {q:'\\([2, 3] \\cdot [4, -1]\\) = ?', opts:['5','11','\\([8, -3]\\)','−5'], a:0,
     tag:'dot product arithmetic', focus:'Compute five dot products by hand, with negative components — multiply matching slots, then SUM to one number.', why:'2·4 + 3·(−1) = 8 − 3 = <b>5</b>. The dot product is always a single number, never a vector.', wrong:{1:'<b>Sign slip:</b> 2·4 + 3·(−1) = 8 − 3 = 5. You computed 8 + 3 — the second product is negative. Signs ride along inside dot products.',
  2:'<b>Likely trap:</b> stopping at component-wise multiplication. [8, −3] is the halfway point — the dot product then <b>sums</b> those products into one number: 8 + (−3) = 5.',
  3:'Right arithmetic, flipped sign: 8 − 3 = +5. Double-check which term carries the minus.',}},
    {q:'Two embedding vectors have cosine similarity <b>≈ 0</b>. The texts they represent are…', opts:['Opposites in meaning','Nearly identical in meaning','Unrelated in meaning','Both empty strings'], a:2,
     tag:'cosine similarity', focus:'Memorize the anchor cases: cos = 1 same direction, 0 orthogonal/unrelated, −1 opposite.', why:'cos θ = 0 means orthogonal — no alignment either way. Opposite meaning would push toward −1, identical toward +1.', wrong:{0:'Opposite meanings push cosine toward <b>−1</b> (vectors pointing against each other). Zero means <i>no alignment either way</i> — orthogonal, unrelated.',
  1:'Nearly identical meanings give cosine near <b>+1</b>. Zero is the "strangers" reading: the directions share nothing.',
  3:'Cosine similarity measures the <b>angle</b> between embedding vectors — it says nothing about the texts being empty. cos ≈ 0 just means unrelated directions.'}},
    {q:'If \\(a \\cdot b > 0\\), the angle between a and b is…', opts:['Exactly 0°','Less than 90°','Exactly 90°','More than 90°'], a:1,
     tag:'sign vs angle', focus:'Positive dot ⇔ angle < 90°, zero ⇔ exactly 90°, negative ⇔ obtuse. Sketch each case once.', why:'cos θ &gt; 0 exactly when θ &lt; 90°. Positive dot product = "same general direction".', wrong:{0:'Exactly 0° would mean perfectly aligned (cos θ = 1) — that\'s the extreme case, not what a positive dot product implies. <i>Any</i> angle under 90° gives a·b &gt; 0.',
  2:'Exactly 90° is precisely where the dot product equals <b>zero</b> — the boundary. Positive means you\'re on the acute side of it.',
  3:'Beyond 90° the cosine — and therefore the dot product — goes <b>negative</b>. Positive dot product = acute angle = "same general direction".'}},
  ]
});
INTERACTIVES.dot = function(stage, api){
  const L=makeLab(stage);
  const a={x:2.5,y:1}, b={x:1,y:2.5};
  const m=api.missions([
    {text:'Make the vectors <b>orthogonal</b> (cos θ ≈ 0)', xp:20, check:s=>Math.abs(s.cos)<.04},
    {text:'Make them <b>nearly identical</b> in direction (cos θ &gt; 0.97)', xp:20, check:s=>s.cos>.97},
    {text:'Make them <b>oppose</b> each other (cos θ &lt; −0.9)', xp:20, check:s=>s.cos<-.9},
  ]);
  const P=plane(L.ctx,L.W,L.H,52);
  let dragging=null;
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const dot=a.x*b.x+a.y*b.y, na=Math.hypot(a.x,a.y), nb=Math.hypot(b.x,b.y);
    const cos=dot/(na*nb||1);
    // angle arc
    const a0=Math.atan2(a.y,a.x), a1=Math.atan2(b.y,b.x);
    L.ctx.strokeStyle='rgba(255,201,77,.8)'; L.ctx.lineWidth=2;
    L.ctx.beginPath(); L.ctx.arc(P.sx(0),P.sy(0),34,-a0,-a1,((a1-a0+2*Math.PI)%(2*Math.PI))<Math.PI?true:false); L.ctx.stroke();
    const col = cos>0.3?'#2dd4a0':cos<-0.3?'#ff5c7a':'#ffc94d';
    P.arrow(0,0,a.x,a.y,'#7c5cff',4,'a'); P.arrow(0,0,b.x,b.y,'#00d4ff',4,'b');
    P.dot(a.x,a.y,7,'#b9a8ff'); P.dot(b.x,b.y,7,'#7fe7ff');
    const deg=Math.acos(Math.max(-1,Math.min(1,cos)))*180/Math.PI;
    L.readout.innerHTML='a·b = '+dot.toFixed(2)+'<br>cos θ = <span style="color:'+col+'">'+cos.toFixed(3)+'</span><br>θ = '+deg.toFixed(1)+'°';
    m.update({cos});
  }
  function pick(e){ const p=L.toCanvas(e), wx=P.wx(p.x), wy=P.wy(p.y);
    return (Math.hypot(wx-a.x,wy-a.y)<Math.hypot(wx-b.x,wy-b.y))?a:b; }
  L.canvas.addEventListener('pointerdown',e=>{dragging=pick(e);L.canvas.setPointerCapture(e.pointerId);move(e);});
  L.canvas.addEventListener('pointermove',move);
  L.canvas.addEventListener('pointerup',()=>dragging=null);
  function move(e){ if(!dragging)return; const p=L.toCanvas(e);
    dragging.x=P.wx(p.x); dragging.y=P.wy(p.y); draw(); }
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Drag both arrow tips. The readout colors green when aligned, red when opposed, gold near orthogonal. Think of <b>a</b> as a search query and <b>b</b> as a document.</div>';
  L.ctrl.appendChild(note);
  draw();
};

registerLesson({
  id:'la-matrix', world:'la', emoji:'🌀', title:'Matrices = Transformations',
  sub:'A 2×2 matrix is a machine that warps all of space. Watch the grid bend.',
  learn:`<p>Forget "grids of numbers" — a <strong>matrix is a function that transforms space</strong>. A 2×2 matrix is fully described by where it sends the two basis vectors î = [1,0] and ĵ = [0,1]:</p>
  <div class="formula">$$M = \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} \\quad \\hat{\\imath} \\mapsto [a, c] \\quad (\\text{column 1}) \\quad \\hat{\\jmath} \\mapsto [b, d] \\quad (\\text{column 2})$$</div>
  <p>Every other vector follows along, because transformation is linear: \\(M[x,y] = x \\cdot (M\\hat{\\imath}) + y \\cdot (M\\hat{\\jmath})\\). The <strong>columns of the matrix tell you where the basis vectors land.</strong> That single sentence unlocks all of linear algebra.</p>
  <p>Rotations, stretches, shears, reflections — all just choices of those four numbers.</p>`,
  ml:`Every layer of a neural network is a matrix transforming its input vector into a new space (then a nonlinearity bends it). "Training" = nudging matrix entries so the final space puts cats far away from dogs. A 7B-parameter LLM is mostly a stack of big matrices doing exactly what you're about to do with sliders.`,
  labs:[
    {key:'explore', title:'Warp all of space', interactive:'matrix',
     intro:'<p>Set the four entries and watch the whole grid bend. Build a rotation, a shear, and a stretch by placing the columns — the landing spots of î and ĵ.</p>'},
    {key:'aim', title:'Aim the output (solve M·x = t)', interactive:'matrixAim',
     intro:'<p>The inverse question: given a <em>fixed</em> matrix and a target <em>output</em>, find the input that produces it. Running a transformation backwards is what "solving a linear system" really is.</p>'},
  ],
  quiz:[
    {q:'A matrix has columns \\([0,1]\\) and \\([-1,0]\\) — i.e. î lands on [0,1], ĵ lands on [−1,0]. What does it do?', opts:['Rotates 90° counterclockwise','Reflects over the x-axis','Scales by 2','Shears horizontally'], a:0,
     tag:'reading transformations', focus:'Drill: column 1 = where î lands, column 2 = where ĵ lands. Identify rotation/shear/scale matrices by their columns.', why:'î (pointing right) ends up pointing up; ĵ (up) ends up pointing left. That\'s a quarter-turn counterclockwise.', wrong:{1:'Reflection over the x-axis keeps î = [1,0] in place and flips ĵ to [0,−1] — matrix [[1,0],[0,−1]]. Here <i>both</i> basis vectors changed direction: î→[0,1] (right became up) and ĵ→[−1,0] (up became left). That\'s a quarter-turn CCW.',
  2:'Scaling stretches vectors <i>along their own directions</i> — î would stay pointing right, just longer. Here the basis vectors changed direction entirely: rotation.',
  3:'A shear keeps one basis vector fixed and tilts the other. Here both moved — î to [0,1], ĵ to [−1,0]. Follow the columns: that\'s a 90° CCW rotation.'}},
    {q:'Where does \\(M = \\begin{bmatrix} 2 & 0 \\\\ 0 & 1 \\end{bmatrix}\\) send the vector \\([3, 4]\\)?', opts:['\\([6, 4]\\)','\\([3, 8]\\)','\\([6, 8]\\)','\\([5, 5]\\)'], a:0,
     tag:'matrix-vector multiply', focus:'Compute M·v as x·(col1) + y·(col2) for a few cases — the linear-combination view beats row memorization.', why:'It doubles x and leaves y alone: [2·3, 1·4] = [6, 4]. A pure horizontal stretch.', wrong:{1:'<b>Likely trap:</b> applying the 2 to the second coordinate. The 2 sits in the first row — it scales <b>x</b>: [2·3, 1·4] = [6, 4].',
  2:'The second diagonal entry is 1, so y is left alone: [2·3, 1·4] = [6, 4]. Only a matrix like [[2,0],[0,2]] doubles both.',
  3:'[5,5] looks like <i>adding</i> the matrix diagonal to the vector. Matrices don\'t add to vectors — they transform them: each output coordinate is a row·vector dot product.'}},
    {q:'How do you read off what a matrix does, instantly?', opts:['Add all entries','Its columns are where î and ĵ land','Its rows are where î and ĵ land','Compute the determinant first'], a:1,
     tag:'columns rule', focus:'Re-derive why columns (not rows) are the landing spots: M·[1,0] selects column 1.', why:'Column 1 = image of î, column 2 = image of ĵ. Everything else follows by linearity.', wrong:{0:'Entry sums have no geometric meaning. The readable structure is the <b>columns</b>: column 1 = where î lands, column 2 = where ĵ lands.',
  2:'<b>The classic transpose trap.</b> Rows mix together pieces of both basis images. It\'s the <b>columns</b> that are the landing spots of î and ĵ — memorize that one.',
  3:'The determinant compresses the matrix to a single number (area scaling) — it can\'t tell you the full action. The columns give you everything: images of î and ĵ.'}},
  ]
});
INTERACTIVES.matrix = function(stage, api){
  const L=makeLab(stage);
  let M={a:1,b:0,c:0,d:1};
  const m=api.missions([
    {text:'Build a <b>90° rotation</b>: send î→[0,1] and ĵ→[−1,0]', xp:25, check:s=>near(s.a,0)&&near(s.b,-1)&&near(s.c,1)&&near(s.d,0)},
    {text:'Build a <b>horizontal shear</b>: keep î=[1,0], tilt ĵ to [k,1] with k ≥ 0.5', xp:20, check:s=>near(s.a,1)&&near(s.c,0)&&near(s.d,1)&&s.b>=.45},
    {text:'Stretch x by <b>2×</b> leaving y alone: [[2,0],[0,1]]', xp:20, check:s=>near(s.a,2)&&near(s.b,0)&&near(s.c,0)&&near(s.d,1)},
  ]);
  function near(x,t){return Math.abs(x-t)<.13;}
  const P=plane(L.ctx,L.W,L.H,52);
  function T(x,y){ return [M.a*x+M.b*y, M.c*x+M.d*y]; }
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    // faint original grid
    L.ctx.globalAlpha=.35; P.grid(); L.ctx.globalAlpha=1;
    // transformed grid
    L.ctx.lineWidth=1.4;
    for(let i=-6;i<=6;i++){
      L.ctx.strokeStyle=i===0?'rgba(0,212,255,.6)':'rgba(0,212,255,.18)';
      let p=T(i,-6); L.ctx.beginPath(); L.ctx.moveTo(P.sx(p[0]),P.sy(p[1]));
      p=T(i,6); L.ctx.lineTo(P.sx(p[0]),P.sy(p[1])); L.ctx.stroke();
      L.ctx.strokeStyle=i===0?'rgba(124,92,255,.6)':'rgba(124,92,255,.18)';
      p=T(-6,i); L.ctx.beginPath(); L.ctx.moveTo(P.sx(p[0]),P.sy(p[1]));
      p=T(6,i); L.ctx.lineTo(P.sx(p[0]),P.sy(p[1])); L.ctx.stroke();
    }
    // unit square image
    const c0=T(0,0),c1=T(1,0),c2=T(1,1),c3=T(0,1);
    L.ctx.fillStyle='rgba(255,201,77,.18)'; L.ctx.strokeStyle='rgba(255,201,77,.7)'; L.ctx.lineWidth=2;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(c0[0]),P.sy(c0[1]));
    [c1,c2,c3].forEach(p=>L.ctx.lineTo(P.sx(p[0]),P.sy(p[1])));
    L.ctx.closePath(); L.ctx.fill(); L.ctx.stroke();
    P.arrow(0,0,M.a,M.c,'#2dd4a0',4,'î→');
    P.arrow(0,0,M.b,M.d,'#ff5c7a',4,'ĵ→');
    L.readout.innerHTML='M = [ '+fmt2(M.a)+'  '+fmt2(M.b)+' ]<br>      [ '+fmt2(M.c)+'  '+fmt2(M.d)+' ]<br>î→['+fmt2(M.a)+','+fmt2(M.c)+']  ĵ→['+fmt2(M.b)+','+fmt2(M.d)+']';
    m.update(M);
  }
  const sa=slider(L.ctrl,'a — î\'s x landing',-2,2,0.1,1,null,v=>{M.a=v;draw();});
  const sb=slider(L.ctrl,'b — ĵ\'s x landing',-2,2,0.1,0,null,v=>{M.b=v;draw();});
  const sc=slider(L.ctrl,'c — î\'s y landing',-2,2,0.1,0,null,v=>{M.c=v;draw();});
  const sd=slider(L.ctrl,'d — ĵ\'s y landing',-2,2,0.1,1,null,v=>{M.d=v;draw();});
  chips(L.ctrl,'PRESETS',['Identity','Rotate 45°','Flip x','Squash'],(i)=>{
    const r2=Math.SQRT1_2;
    const pre=[{a:1,b:0,c:0,d:1},{a:+r2.toFixed(1),b:-r2.toFixed(1),c:+r2.toFixed(1),d:+r2.toFixed(1)},{a:-1,b:0,c:0,d:1},{a:.5,b:0,c:0,d:.5}][i];
    M={a:+pre.a,b:+pre.b,c:+pre.c,d:+pre.d};
    sa.set(M.a);sb.set(M.b);sc.set(M.c);sd.set(M.d); draw();
  });
  draw();
};

registerLesson({
  id:'la-matmul', world:'la', emoji:'⛓️', title:'Matrix Multiplication = Composition',
  sub:'Multiplying matrices means doing one transformation after another. Order matters.',
  learn:`<p>What does \\(B \\cdot A\\) mean? <strong>Apply A first, then B.</strong> Matrix multiplication is function composition — reading right to left, like \\(B(A(x))\\).</p>
  <p>To compute an entry: row of the left matrix · column of the right matrix (a dot product!).</p>
  <div class="formula">$$(B \\cdot A)_{ij} = \\text{(row } i \\text{ of } B\\text{)} \\cdot \\text{(column } j \\text{ of } A\\text{)}$$</div>
  <p>Crucially, <strong>matrix multiplication is NOT commutative</strong>: B·A ≠ A·B in general. Rotating then shearing gives a different world than shearing then rotating — try it in the lab.</p>`,
  ml:`A deep network is literally a chain of these: \\(\\text{output} = W_3 \\cdot \\sigma(W_2 \\cdot \\sigma(W_1 \\cdot x))\\). "Deep" = many compositions. Matrix multiply is <b>associative</b> (so the chain is well-defined) but <b>not commutative</b> (so layer order matters). The load-bearing catch: the \\(\\sigma\\) nonlinearities are essential — without them a stack of matrices <em>collapses to a single matrix</em> W₃W₂W₁, and depth buys nothing.`,
  labs:[
    {key:'explore', title:'Compose two transforms', interactive:'matmul',
     intro:'<p>Chain two transformations and read the product matrix. Build a 180° turn, prove order matters, and compose a transform back to the identity.</p>'},
    {key:'order', title:'Order matters — on a point', interactive:'matmulReach',
     intro:'<p>Commit a prediction first, then watch a single point travel two different paths: rotate-then-shear vs shear-then-rotate. The gap between the endpoints <em>is</em> non-commutativity.</p>'},
  ],
  quiz:[
    {q:'The product \\(B \\cdot A\\) applied to a vector x means…', opts:['Apply B first, then A','Apply A first, then B','Apply both simultaneously','Average the two transformations'], a:1,
     tag:'composition order', focus:'Read B·A·x inside-out as B(A(x)) — write two nested function calls and match them to the product.', why:'B·A·x evaluates inside-out: A hits x first, then B hits the result. Right-to-left, like nested function calls B(A(x)).', wrong:{0:'Natural reading — left to right — but composition evaluates <b>inside-out</b>, like nested function calls: B·A·x = B(A(x)). A touches x first.',
  2:'It\'s strictly sequential, not simultaneous: A transforms space, then B transforms the result. (That\'s why order can matter so much.)',
  3:'Nothing is averaged — composition chains the full effect of each transform. Half-rotating and half-shearing is a different (and rarely useful) operation.'}},
    {q:'R rotates 90° CCW, S shears horizontally. Which is true?', opts:['R·S = S·R always','R·S ≠ S·R in general','Both equal the identity','Products of transforms are undefined'], a:1,
     tag:'non-commutativity', focus:'In the lab, run rotate→shear then shear→rotate and sketch both results from memory.', why:'You proved this in the lab — composition order changes the result. Matrix multiplication is associative but not commutative.', wrong:{0:'Numbers commute (3·5 = 5·3); matrices generally don\'t. You proved it in the lab: rotate-then-shear lands the F somewhere different than shear-then-rotate.',
  2:'Only mutually-inverse transforms compose to the identity (like Flip x twice). A rotation and a shear don\'t undo each other.',
  3:'Products of compatible matrices are always defined — non-commutativity means the two orders give <i>different valid answers</i>, not no answer.'}},
    {q:'Entry (1,2) of \\(B \\cdot A\\) (row 1, column 2) equals…', opts:['B\'s row 1 · A\'s column 2','B\'s column 1 · A\'s row 2','B₁₂ × A₁₂','The sum of B\'s row 1'], a:0,
     tag:'product entries', focus:'Entry (i,j) = row i of LEFT · column j of RIGHT. Compute one full 2×2 product slowly.', why:'Each entry of a product is a dot product: row i of the left matrix with column j of the right matrix.', wrong:{1:'Backwards: rows come from the <b>left</b> factor, columns from the <b>right</b>. Entry (i,j) = (row i of B) · (column j of A).',
  2:'Multiplying matching single entries is the <i>Hadamard</i> (element-wise) product — a different operation. True matrix multiplication dots an entire row with an entire column.',
  3:'A can\'t be ignored — every entry of the product blends both matrices: row of B dotted with column of A.'}},
  ]
});
INTERACTIVES.matmul = function(stage, api){
  const L=makeLab(stage);
  const TS={
    'Rotate 90°':[0,-1,1,0], 'Shear →':[1,1,0,1], 'Scale ½':[.5,0,0,.5], 'Flip x':[-1,0,0,1]
  };
  const names=Object.keys(TS);
  let first='Rotate 90°', second='Shear →';
  let seen={}; // for order-matters mission
  const m=api.missions([
    {text:'Compose two transforms into a <b>180° rotation</b> (î lands on [−1, 0])', xp:20, check:s=>Math.abs(s.C[0]+1)<.05&&Math.abs(s.C[2])<.05&&Math.abs(s.C[1])<.05&&Math.abs(s.C[3]+1)<.05},
    {text:'Prove order matters: run <b>Rotate→Shear</b> and then <b>Shear→Rotate</b>', xp:25, check:s=>s.seenBoth},
    {text:'Compose two transforms back into the <b>identity</b> (undo!)', xp:20, check:s=>Math.abs(s.C[0]-1)<.05&&Math.abs(s.C[1])<.05&&Math.abs(s.C[2])<.05&&Math.abs(s.C[3]-1)<.05},
  ]);
  const P=plane(L.ctx,L.W,L.H,52);
  function mul(B,A){ return [B[0]*A[0]+B[1]*A[2], B[0]*A[1]+B[1]*A[3], B[2]*A[0]+B[3]*A[2], B[2]*A[1]+B[3]*A[3]]; }
  function T(Mx,x,y){ return [Mx[0]*x+Mx[1]*y, Mx[2]*x+Mx[3]*y]; }
  function draw(){
    clearBg(L.ctx,L.W,L.H); L.ctx.globalAlpha=.3; P.grid(); L.ctx.globalAlpha=1;
    const A=TS[first], B=TS[second], C=mul(B,A);
    seen[first+'>'+second]=true;
    const seenBoth = seen['Rotate 90°>Shear →'] && seen['Shear →>Rotate 90°'];
    // draw an "F" polygon through stages
    const F=[[0,0],[0,2],[1,2],[1,1.6],[0.4,1.6],[0.4,1.1],[0.9,1.1],[0.9,0.7],[0.4,0.7],[0.4,0]];
    function poly(pts,fill,strokeC){ L.ctx.beginPath();
      pts.forEach((p,i)=>{const sx=P.sx(p[0]),sy=P.sy(p[1]); i?L.ctx.lineTo(sx,sy):L.ctx.moveTo(sx,sy);});
      L.ctx.closePath(); L.ctx.fillStyle=fill; L.ctx.fill(); L.ctx.strokeStyle=strokeC; L.ctx.lineWidth=2; L.ctx.stroke(); }
    poly(F,'rgba(139,147,184,.15)','rgba(139,147,184,.5)');
    poly(F.map(p=>T(A,p[0],p[1])),'rgba(0,212,255,.12)','rgba(0,212,255,.55)');
    poly(F.map(p=>T(C,p[0],p[1])),'rgba(45,212,160,.2)','#2dd4a0');
    P.arrow(0,0,C[0],C[2],'#2dd4a0',4,'î→');
    P.arrow(0,0,C[1],C[3],'#ff5c7a',4,'ĵ→');
    L.readout.innerHTML='1st: '+first+'  →  2nd: '+second+'<br>C = B·A = [ '+fmt2(C[0])+'  '+fmt2(C[1])+' ]<br>             [ '+fmt2(C[2])+'  '+fmt2(C[3])+' ]';
    m.update({C,seenBoth});
  }
  let row1,row2;
  row1=chips(L.ctrl,'STEP 1 — apply first',names,(i,btn,row)=>{
    first=names[i]; [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); });
  row2=chips(L.ctrl,'STEP 2 — apply second',names,(i,btn,row)=>{
    second=names[i]; [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); });
  row1.children[0].classList.add('on'); row2.children[1].classList.add('on');
  const d=document.createElement('div'); d.className='ctrl';
  const swap=document.createElement('button'); swap.className='chip'; swap.textContent='⇄ Swap order';
  swap.onclick=()=>{ const t=first; first=second; second=t;
    [...row1.children].forEach((b,i)=>b.classList.toggle('on',names[i]===first));
    [...row2.children].forEach((b,i)=>b.classList.toggle('on',names[i]===second));
    draw(); };
  d.appendChild(swap); L.ctrl.appendChild(d);
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Grey F = original. <b style="color:#7fe7ff">Cyan</b> = after step 1. <b style="color:#2dd4a0">Green</b> = after both. Hint for the identity: some transforms undo themselves.</div>';
  L.ctrl.appendChild(note);
  draw();
};

registerLesson({
  id:'la-det', world:'la', emoji:'📐', title:'The Determinant',
  sub:'One number that tells you how much a matrix stretches area — and whether it destroys information.',
  learn:`<p>The <strong>determinant</strong> of a 2×2 matrix measures how the transformation scales <strong>area</strong>:</p>
  <div class="formula">$$\\det\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} = ad - bc$$</div>
  <p>• \\(|\\det| = 3\\) → every area gets 3× bigger<br>
  • \\(\\det < 0\\) → space gets <strong>flipped</strong> (mirror image)<br>
  • \\(\\det = 0\\) → space is <strong>squashed onto a line</strong> — area becomes 0, and the transformation can't be undone. Information is destroyed.</p>
  <p>That last case is huge: a matrix is <strong>invertible</strong> exactly when det ≠ 0.</p>`,
  ml:`det = 0 means a layer collapses dimensions — different inputs map to the same output and can never be told apart again. Related idea: singular matrices break solvers. (One caveat — a <em>small</em> determinant does NOT mean "numerically unstable": 0.01·I has a tiny det yet is perfectly well-conditioned. The real measure of instability is the <b>condition number</b>, the ratio of largest to smallest singular value.) And the "log-det" of a layer's Jacobian appears in normalizing flows, a family of generative models.`,
  labs:[
    {key:'explore', title:'Area & orientation', interactive:'det',
     intro:'<p>Move the four entries and watch the unit square become a parallelogram of area |det|. Flip it red (negative det) and collapse it flat (det = 0).</p>'},
    {key:'build', title:'Drag a column to set the area', interactive:'detBuild',
     intro:'<p>Column 1 is pinned. Drag column 2 to hit an exact area — including the <strong>singular</strong> case where the columns line up and det snaps to 0. That is linear dependence you can see.</p>'},
  ],
  quiz:[
    {q:'det of \\(\\begin{bmatrix} 3 & 1 \\\\ 2 & 2 \\end{bmatrix}\\) = ?', opts:['4','8','6','−4'], a:0,
     tag:'det formula', focus:'ad − bc: drill the minus sign with five quick 2×2 determinants, including negative entries.', why:'ad − bc = 3·2 − 1·2 = 6 − 2 = <b>4</b>. Unit squares become parallelograms of area 4.', wrong:{1:'<b>Likely trap:</b> ad + bc = 6 + 2 = 8. The formula <b>subtracts</b>: ad − bc = 6 − 2 = 4. That minus is what detects flips.',
  2:'You took ad = 6 and stopped. The cross term matters: ad − bc = 6 − 2 = <b>4</b>.',
  3:'That\'s bc − ad — the formula backwards. Convention: main diagonal first: ad − bc = +4.'}},
    {q:'A matrix has det = 0. What happened to 2D space?', opts:['Nothing — it\'s the identity','It rotated','It collapsed onto a line (or point) — not invertible','It flipped orientation'], a:2,
     tag:'det = 0 collapse', focus:'Connect det 0 ⇔ space flattens ⇔ not invertible ⇔ information lost — one idea, four phrasings.', why:'Zero area scaling means everything got flattened. Two different inputs now share an output, so there\'s no way back.', wrong:{0:'The identity changes nothing and has det = <b>1</b> (areas preserved). det = 0 is the opposite extreme — total collapse.',
  1:'Rotations preserve area perfectly: det = 1. A zero determinant means area became zero — everything flattened onto a line.',
  3:'Flips give <b>negative</b> det (orientation reverses, area survives). Zero det means area is annihilated — and with it, invertibility.'}},
    {q:'det = −2 means the transformation…', opts:['Shrinks area by 2 and rotates','Doubles area and flips orientation','Is not invertible','Halves all lengths'], a:1,
     tag:'negative det', focus:'Negative determinant = orientation flip (mirror), |det| still scales area. Two independent facts.', why:'|−2| = 2 → areas double. The negative sign → orientation flips, like a mirror.', wrong:{0:'det says nothing about rotation, and |−2| = 2 means areas <b>double</b>, not shrink. The sign carries exactly one bit: orientation flipped.',
  2:'Only det = <b>0</b> breaks invertibility. −2 is a perfectly healthy determinant: doubled areas, mirrored orientation, fully reversible.',
  3:'Determinants track <b>area</b> (in 2D), not lengths — and 2 means areas double. Individual lengths can change by different amounts in different directions.'}},
  ]
});
INTERACTIVES.det = function(stage, api){
  const L=makeLab(stage);
  let M={a:1,b:0,c:0,d:1};
  const m=api.missions([
    {text:'<b>Collapse space</b>: make det ≈ 0 (with a non-zero matrix)', xp:20, check:s=>Math.abs(s.det)<.06&&(Math.abs(s.a)+Math.abs(s.b)+Math.abs(s.c)+Math.abs(s.d))>1},
    {text:'<b>Flip the world</b>: make det &lt; −0.5', xp:20, check:s=>s.det<-.5},
    {text:'Make the unit square\'s area exactly <b>3</b> (|det| ≈ 3)', xp:25, check:s=>Math.abs(Math.abs(s.det)-3)<.15},
  ]);
  const P=plane(L.ctx,L.W,L.H,52);
  function draw(){
    clearBg(L.ctx,L.W,L.H); L.ctx.globalAlpha=.3; P.grid(); L.ctx.globalAlpha=1;
    const det=M.a*M.d-M.b*M.c;
    const c0=[0,0],c1=[M.a,M.c],c2=[M.a+M.b,M.c+M.d],c3=[M.b,M.d];
    const col = det<0 ? 'rgba(255,92,122,' : 'rgba(45,212,160,';
    L.ctx.fillStyle=col+'.25)'; L.ctx.strokeStyle=col+'.9)'; L.ctx.lineWidth=2.5;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(c0[0]),P.sy(c0[1]));
    [c1,c2,c3].forEach(p=>L.ctx.lineTo(P.sx(p[0]),P.sy(p[1]))); L.ctx.closePath();
    L.ctx.fill(); L.ctx.stroke();
    P.arrow(0,0,M.a,M.c,'#2dd4a0',3.5,'î→'); P.arrow(0,0,M.b,M.d,'#ff5c7a',3.5,'ĵ→');
    L.readout.innerHTML='det = ad−bc = '+det.toFixed(2)+'<br>area ×'+Math.abs(det).toFixed(2)+(det<0?'  (flipped!)':'')+(Math.abs(det)<.06?'<br>⚠ COLLAPSED — not invertible':'');
    m.update({...M,det});
  }
  slider(L.ctrl,'a',-2,2,0.1,1,null,v=>{M.a=v;draw();});
  slider(L.ctrl,'b',-2,2,0.1,0,null,v=>{M.b=v;draw();});
  slider(L.ctrl,'c',-2,2,0.1,0,null,v=>{M.c=v;draw();});
  slider(L.ctrl,'d',-2,2,0.1,1,null,v=>{M.d=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The shaded parallelogram is where the unit square lands. Its area = |det|. Watch it turn <b style="color:#ff5c7a">red</b> when orientation flips.</div>';
  L.ctrl.appendChild(note);
  draw();
};

registerLesson({
  id:'la-eigen', world:'la', emoji:'🧭', title:'Eigenvectors & Eigenvalues',
  sub:'The special directions a matrix can\'t rotate — only stretch. The skeleton of a transformation.',
  learn:`<p>Apply a matrix to most vectors and they get knocked off their original direction. But some special vectors only get <strong>stretched, never rotated</strong>:</p>
  <div class="formula">$$M \\cdot v = \\lambda \\cdot v$$</div>
  <p>\\(v\\) is an <strong>eigenvector</strong> ("eigen" = own/characteristic), and the stretch factor \\(\\lambda\\) is its <strong>eigenvalue</strong>.</p>
  <p>The lab uses \\(M = \\begin{bmatrix} 2 & 1 \\\\ 1 & 2 \\end{bmatrix}\\). It has two eigendirections: along \\([1,1]\\) vectors get stretched ×3 (λ=3), and along \\([1,-1]\\) they're untouched (λ=1). <em>Repeatedly</em> applying M drives almost any vector toward the dominant (largest-λ) direction — that's <strong>power iteration</strong>, the engine behind PageRank.</p>
  <p>Eigenvectors reveal what a matrix <em>fundamentally does</em>, stripped of the rotating — but not every matrix has (real) ones: a pure <strong>rotation</strong> turns every vector, so it has <em>no</em> real eigenvectors (its eigenvalues are complex). This \\(M\\) is also <strong>symmetric</strong>, and symmetric matrices are special — the spectral theorem guarantees their eigenvectors are real and <em>perpendicular</em> (here [1,1]⊥[1,−1]), which is exactly why PCA's axes come out orthogonal.</p>`,

  ml:`<b>PCA</b> (principal component analysis) finds the eigenvectors of your data's covariance matrix — the directions of maximum variance — to compress 1000-dim data down to its essence. Google's original <b>PageRank</b> is an eigenvector of the web's link matrix. Eigenvalues of the Hessian tell researchers whether training is in a valley or at a saddle point.`,
  labs:[
    {key:'explore', title:'The directions that don\'t rotate', interactive:'eigen',
     intro:'<p>Drag v on the symmetric matrix [[2,1],[1,2]] until M·v lines up with v — an eigenvector. Faint hint lines mark the two eigendirections.</p>'},
    {key:'hunt', title:'Eigenvalue hunter (no hints)', interactive:'eigenHunt',
     intro:'<p>Harder matrix, no hints. Predict the eigenvalues from the diagonal of a triangular matrix, then hunt both eigendirections and read each eigenvalue straight off the stretch factor.</p>'},
  ],
  quiz:[
    {type:'numeric', q:'For the triangular matrix \\(M = \\begin{bmatrix} 4 & 7 \\\\ 0 & 3 \\end{bmatrix}\\), what is its <b>largest</b> eigenvalue? (Triangular ⇒ eigenvalues are the diagonal entries.)', answer:4, tol:0.05,
     tag:'diagonal matrices', focus:'For triangular (and diagonal) matrices, the eigenvalues are exactly the diagonal entries — no characteristic polynomial needed.',
     hint:'Read the diagonal: 4 and 3. The larger one is the answer.',
     wolfram:'eigenvalues of {{4,7},{0,3}}',
     why:'A triangular matrix has its eigenvalues on the diagonal: 4 and 3. The largest is <b>4</b>. The off-diagonal 7 shifts the eigenvectors, not the eigenvalues.'},
    {q:'v is an eigenvector of M with λ = 3. Then M·v is…', opts:['v rotated by 3°','3 times longer than v, same direction','v reflected','The zero vector'], a:1,
     tag:'eigen definition', focus:'Mv = λv means direction unchanged, length scaled by λ. Re-find both eigendirections in the lab.', why:'M·v = λv = 3v: same direction, triple the length. No rotation — that\'s the defining property.', wrong:{0:'λ is a <b>stretch factor</b>, never an angle. Eigenvectors are precisely the vectors that <i>don\'t</i> rotate — M·v points exactly along v, 3× longer.',
  2:'Reflection would reverse direction — that\'s a <b>negative</b> eigenvalue. λ = 3 is positive: same direction, tripled length.',
  3:'M·v = 0 only when λ = 0 (the matrix crushes that direction — and det = 0). λ = 3 means v survives, scaled ×3.'}},
    {q:'For \\(M = \\begin{bmatrix} 2 & 0 \\\\ 0 & 5 \\end{bmatrix}\\) (diagonal), the eigenvalues are…', opts:['2 and 5','0 and 0','7 only','10 only'], a:0,
     tag:'diagonal matrices', focus:'For diagonal matrices the diagonal entries ARE the eigenvalues; trace is their sum, det their product.', why:'Diagonal matrices stretch along the axes: î stays on the x-axis (×2), ĵ stays on the y-axis (×5). The diagonal entries ARE the eigenvalues.', wrong:{1:'The zeros are <i>off</i> the diagonal — they just mean "no mixing between axes". The diagonal entries 2 and 5 are the per-axis stretch factors = the eigenvalues.',
  2:'7 = 2 + 5 is the <b>trace</b> — a different invariant (it equals the <i>sum</i> of eigenvalues, which should tip you off).',
  3:'10 = 2 × 5 is the <b>determinant</b> — the <i>product</i> of eigenvalues. The eigenvalues themselves are 2 and 5.'}},
    {q:'PCA reduces dimensions by projecting data onto…', opts:['Random directions','The top eigenvectors of the covariance matrix','The smallest eigenvectors','The data\'s mean'], a:1,
     tag:'PCA connection', focus:'Read a short PCA explainer: top eigenvectors of the covariance matrix = directions of max variance.', why:'The eigenvectors with the largest eigenvalues capture the most variance — keep those, drop the rest, and you lose the least information.', wrong:{0:'Random projections exist (and are surprisingly useful!), but PCA\'s entire point is choosing the <b>optimal</b> directions — those that preserve maximum variance: the top eigenvectors.',
  2:'Backwards: the smallest-eigenvalue directions carry the <b>least</b> variance — they\'re exactly what PCA throws away.',
  3:'Subtracting the mean is the <i>centering</i> pre-step. The projection directions come from the covariance matrix\'s top eigenvectors.'}},
  ]
});
INTERACTIVES.eigen = function(stage, api){
  const L=makeLab(stage);
  const M=[2,1,1,2]; let v={x:2,y:.5};
  const m=api.missions([
    {text:'Find the eigendirection where v gets <b>stretched ×3</b> (Mv parallel to v)', xp:25, check:s=>s.par&&s.ratio>2.8},
    {text:'Find the <b>other</b> eigendirection — where M leaves v <b>unchanged</b> (λ=1)', xp:25, check:s=>s.par&&s.ratio<1.2},
    {text:'Now break alignment: make M rotate v by <b>more than 15°</b>', xp:15, check:s=>s.angDeg>15},
  ]);
  const P=plane(L.ctx,L.W,L.H,46);
  let drag=false;
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const Mv={x:M[0]*v.x+M[1]*v.y, y:M[2]*v.x+M[3]*v.y};
    const nv=Math.hypot(v.x,v.y)||1e-9, nMv=Math.hypot(Mv.x,Mv.y);
    const cos=(v.x*Mv.x+v.y*Mv.y)/(nv*nMv||1e-9);
    const angDeg=Math.acos(Math.max(-1,Math.min(1,cos)))*180/Math.PI;
    const par = angDeg<2.2;
    // eigendirection guide lines (faint)
    L.ctx.setLineDash([6,6]); L.ctx.lineWidth=1.5;
    L.ctx.strokeStyle='rgba(255,201,77,.25)';
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(-6),P.sy(-6)); L.ctx.lineTo(P.sx(6),P.sy(6)); L.ctx.stroke();
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(-6),P.sy(6)); L.ctx.lineTo(P.sx(6),P.sy(-6)); L.ctx.stroke();
    L.ctx.setLineDash([]);
    L.ctx.globalAlpha=.5; P.arrow(0,0,Mv.x,Mv.y,par?'#2dd4a0':'#ff5c7a',3.5,'Mv'); L.ctx.globalAlpha=1;
    P.arrow(0,0,Mv.x,Mv.y,par?'#2dd4a0':'#ff5c7a',3.5);
    P.arrow(0,0,v.x,v.y,'#7c5cff',4,'v');
    P.dot(v.x,v.y,7,'#b9a8ff');
    L.readout.innerHTML='M = [2 1; 1 2]<br>angle(v, Mv) = '+angDeg.toFixed(1)+'°'+(par?' ✓ EIGEN!':'')+'<br>stretch ‖Mv‖/‖v‖ = '+(nMv/nv).toFixed(2);
    m.update({par, ratio:nMv/nv, angDeg});
  }
  L.canvas.addEventListener('pointerdown',e=>{drag=true;L.canvas.setPointerCapture(e.pointerId);move(e);});
  L.canvas.addEventListener('pointermove',move);
  L.canvas.addEventListener('pointerup',()=>drag=false);
  function move(e){ if(!drag)return; const c=L.toCanvas(e); v.x=P.wx(c.x); v.y=P.wy(c.y); draw(); }
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Drag <b style="color:#b9a8ff">v</b>. The second arrow is <b>M·v</b> — red while M rotates v, <b style="color:#2dd4a0">green</b> when they align. The dashed gold lines are hints…</div>';
  L.ctrl.appendChild(note);
  draw();
};

registerLesson({
  id:'la-boss', world:'la', emoji:'🧠', title:'BOSS: Build a Neural Layer',
  sub:'Use everything: transform raw data so the two classes become separable. This is what learning IS.',
  learn:`<p>Time to put it all together. A neural network layer computes \\(\\text{new\\_representation} = W \\cdot x \\text{ (+ bias, + nonlinearity)}\\). Why? Because the raw data is often arranged so that no simple rule separates the classes — but in the <strong>right transformed space</strong>, a trivial rule works.</p>
  <p>In the lab you'll see two classes of data points (🟣 and 🟠). Your job: <strong>be the weight matrix.</strong> Tune W's four numbers until a vertical line (x = 0) cleanly separates the classes — purple on the left, orange on the right.</p>
  <div class="formula">$$x' = W \\cdot x \\quad \\text{then classify by: } x' > 0 \\text{ ?}$$</div>
  <p>When training runs, gradient descent (coming in World 2!) finds these numbers automatically. Today, you are the optimizer.</p>`,
  ml:`This is the deepest idea in deep learning: <b>layers re-represent data until the problem becomes easy</b>. Pixel space → edge space → shape space → "cat vs dog" space. Each arrow in that chain is a matrix you now understand — and the determinant/eigen ideas tell you when those maps preserve or destroy information.`,
  interactive:'boss-la',
  quiz:[
    {q:'Why transform data before classifying it?', opts:['It makes files smaller','In the right space, a simple boundary separates classes that were tangled in the original space','Transformation always improves accuracy','It removes the need for labels'], a:1,
     tag:'representation learning', focus:'The point of layers: re-represent data until a simple boundary works. Replay the boss lab and watch the clusters separate.', why:'A linear cut that fails in raw space can succeed after a good change of representation — that\'s the entire point of hidden layers.', wrong:{0:'Compression is a side benefit sometimes, but the core reason is geometric: a boundary that\'s impossible in raw space becomes a simple straight cut in the right representation.',
  2:'Not always! You proved it yourself with det ≈ 0 — a bad transform <i>destroys</i> the information needed to classify. Only well-chosen transforms help.',
  3:'Representation changes don\'t replace supervision — you still need labels to know which side of the boundary is which.'}},
    {q:'In \\(y = W \\cdot x\\), training a network adjusts…', opts:['The data x','The entries of matrices like W','The number of dimensions only','The labels'], a:1,
     tag:'what training changes', focus:'Training adjusts weight-matrix entries only — data and labels are fixed. Map each to its role.', why:'The data is fixed; the learnable parameters are the matrix entries (weights). You just hand-optimized one with sliders.', wrong:{0:'The data is the fixed ground truth. If you could edit the inputs to fit the model, you wouldn\'t be learning anything about the world.',
  2:'Architecture (dimension counts, layer sizes) is fixed before training. What training moves are the <b>values inside the matrices</b> — exactly your four sliders.',
  3:'Labels are the answer key — changing them would be cheating, not learning. The weights W are the only thing the optimizer may touch.'}},
    {q:'If a weight matrix W has det = 0, what is the risk?', opts:['None — det doesn\'t matter','The data would explode to infinity','Different points could collapse together, becoming impossible to separate','The classes would swap'], a:2,
     tag:'information loss', focus:'Revisit det = 0 in the boss lab: collapse glues classes together irreversibly.', why:'det = 0 flattens space onto a line. Points from both classes can land on top of each other — information needed to classify is gone.', wrong:{0:'You watched it matter: at det ≈ 0 both clusters fell onto one line and intermixed — unrecoverable.',
  1:'Explosion comes from <i>large</i> matrix entries. det = 0 is the opposite failure: collapse. Different points get glued together.',
  3:'A class swap is just a flip (negative det) — harmless, since the boundary still separates them. det = 0 is the lethal case: separation itself becomes impossible.'}},
  ]
});
INTERACTIVES['boss-la'] = function(stage, api){
  const L=makeLab(stage);
  let M={a:1,b:0,c:0,d:1};
  // fixed jittered clusters: class A (purple) around (1,1.8), class B (orange) around (1.8,-0.8)
  const J=[[-.3,.2],[.25,-.15],[.1,.3],[-.2,-.25],[.35,.1],[0,-.3],[-.35,0],[.2,.2]];
  const A=J.map(j=>[1+j[0], 1.8+j[1]]), B=J.map(j=>[1.8-j[0], -0.8-j[1]]);
  const m=api.missions([
    {text:'Separate the classes: all 🟣 at <b>x &lt; −0.2</b>, all 🟠 at <b>x &gt; 0.2</b>', xp:35, check:s=>s.sep},
    {text:'…while keeping the layer <b>invertible</b> (|det| &gt; 0.3) — no information loss', xp:20, check:s=>s.sep&&Math.abs(s.det)>.3},
    {text:'Sabotage check: set <b>det ≈ 0</b> and watch both classes collapse onto one line', xp:15, check:s=>Math.abs(s.det)<.06},
  ]);
  const P=plane(L.ctx,L.W,L.H,52);
  function T(p){ return [M.a*p[0]+M.b*p[1], M.c*p[0]+M.d*p[1]]; }
  function draw(){
    clearBg(L.ctx,L.W,L.H); L.ctx.globalAlpha=.3; P.grid(); L.ctx.globalAlpha=1;
    const det=M.a*M.d-M.b*M.c;
    // decision boundary x=0
    L.ctx.fillStyle='rgba(255,92,122,.06)'; L.ctx.fillRect(0,0,P.sx(0),L.H);
    L.ctx.fillStyle='rgba(255,201,77,.05)'; L.ctx.fillRect(P.sx(0),0,L.W-P.sx(0),L.H);
    L.ctx.strokeStyle='rgba(255,255,255,.5)'; L.ctx.lineWidth=2; L.ctx.setLineDash([8,6]);
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(0),0); L.ctx.lineTo(P.sx(0),L.H); L.ctx.stroke(); L.ctx.setLineDash([]);
    const TA=A.map(T), TB=B.map(T);
    TA.forEach(p=>P.dot(p[0],p[1],6.5,'#b08aff'));
    TB.forEach(p=>P.dot(p[0],p[1],6.5,'#ffab4d'));
    const sep = TA.every(p=>p[0]<-.2) && TB.every(p=>p[0]>.2);
    L.readout.innerHTML='W = [ '+fmt2(M.a)+'  '+fmt2(M.b)+' ]<br>      [ '+fmt2(M.c)+'  '+fmt2(M.d)+' ]<br>det = '+det.toFixed(2)+(sep?'<br>✓ SEPARATED!':'');
    m.update({sep,det});
  }
  slider(L.ctrl,'W₁₁ (a)',-2,2,0.1,1,null,v=>{M.a=v;draw();});
  slider(L.ctrl,'W₁₂ (b)',-2,2,0.1,0,null,v=>{M.b=v;draw();});
  slider(L.ctrl,'W₂₁ (c)',-2,2,0.1,0,null,v=>{M.c=v;draw();});
  slider(L.ctrl,'W₂₂ (d)',-2,2,0.1,1,null,v=>{M.d=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">You are the weight matrix. Move 🟣 left of the dashed line and 🟠 right of it. Hint: the classes differ most along the "down-right" direction — find a row that exploits it (try making x\' depend positively on x and negatively on y).</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== WORLD 2: CALCULUS ================== */

registerLesson({
  id:'c-limits', world:'calc', emoji:'🔭', title:'Limits: Sneaking Up on a Value',
  sub:'What a function approaches matters more than what it equals. The foundation of all calculus.',
  learn:`<p>Consider \\(f(x) = (x^2 - 1)/(x - 1)\\). Plug in x = 1 and you get 0/0 — an <strong>indeterminate form</strong>. That's stronger than "undefined": unlike 1/0 (which blows up), 0/0 could approach <em>any</em> value, so you have to do more work to find out. There's a <strong>hole</strong> in the graph at x = 1.</p>
  <p>But watch what happens as x <em>approaches</em> 1: f(0.9) = 1.9, f(0.99) = 1.99, f(1.001) = 2.001… The function is clearly <em>heading somewhere</em>:</p>
  <div class="formula">$$\\lim_{x \\to 1} \\dfrac{x^2 - 1}{x - 1} = 2$$</div>
  <p>(Algebra confirms it: x² − 1 = (x−1)(x+1), so away from the hole, f(x) = x + 1.)</p>
  <p>A <strong>limit</strong> is the value a function approaches. For it to exist, approaching <strong>from the left</strong> and <strong>from the right</strong> must agree. Calculus is built entirely from this one idea.</p>`,
  ml:`Derivatives — the heart of training neural networks — are <em>defined</em> as a limit (next lesson). Limits also explain vanishing gradients (values sneaking toward 0 through deep layers) and why learning-rate schedules "decay toward" zero without reaching it.`,
  labs:[
    {key:'explore', title:'Sneak up on the hole', interactive:'limits',
     intro:'<p>Creep toward x = 1 from both sides on a curve with a hole, and watch f(x) home in on the value it never actually reaches.</p>'},
    {key:'evaluate', title:'Factor, evaluate, and find a DNE', interactive:'limitsChallenge',
     intro:'<p>Now do the real work: predict a 0/0 limit by factoring, verify it by creeping to the hole, then meet a <strong>jump</strong> where the left and right approaches disagree and the limit does not exist.</p>'},
  ],
  quiz:[
    {q:'\\(\\lim_{x \\to 3} (x^2 - 9)/(x - 3)\\) = ?', opts:['0','Undefined','6','9'], a:2,
     tag:'indeterminate forms', focus:'0/0 means "factor and simplify", not "answer is 0". Practice (x²−a²)/(x−a) style limits.', why:'Factor: x² − 9 = (x−3)(x+3). Away from the hole, f(x) = x + 3 → 6. The function never needs a value AT 3 for the limit to exist.', wrong:{0:'Plugging in gives 0/0 — which is not 0! It\'s an "indeterminate form": a signal to do more work. Factor: (x−3)(x+3)/(x−3) → x+3 → 6.',
  1:'f(3) is undefined, true — but the <b>limit</b> asks where f is <i>heading</i>, not its value at the point. Approaching 3, f(x) = x+3 → 6. This distinction is the whole lesson.',
  3:'Looks like you squared 3. After canceling the common factor, f(x) = x + 3 near the hole, so the limit is 3 + 3 = 6.'}},
    {q:'A function approaches 5 from the left of x=2 but 7 from the right. The limit at x=2…', opts:['Is 6 (the average)','Is 5','Is 7','Does not exist'], a:3,
     tag:'one-sided limits', focus:'A limit exists only when left and right approaches agree — sketch a jump discontinuity to see it fail.', why:'Left and right limits must agree. 5 ≠ 7 → no limit. (This is what a "jump" discontinuity looks like.)', wrong:{0:'Tempting, but limits never average mismatched sides — there\'s no "compromise value" the function actually approaches. Disagreement means no limit, full stop.',
  1:'The left side alone isn\'t enough. A limit exists only when <b>both</b> approaches agree, and 5 ≠ 7.',
  2:'Same problem from the other side: the right-hand value alone doesn\'t make a limit. Both sides must match.'}},
    {q:'f(1) is undefined but lim<sub>x→1</sub> f(x) = 2. Which is true?', opts:['Impossible — limits need f defined there','Perfectly fine — limits care about the approach, not the destination','The limit must also be undefined','f must equal 2 somewhere else'], a:1,
     tag:'limit vs value', focus:'The limit describes the approach, not the destination: f(a) can be undefined while lim x→a f exists.', why:'That\'s the whole point of limits: they describe behavior NEAR a point, ignoring (even missing) values AT it.', wrong:{0:'It\'s not just possible — it\'s the defining feature of limits. They examine the <i>neighborhood</i> of a point and completely ignore the point itself (even a missing one).',
  2:'The limit doesn\'t inherit the hole: it\'s computed from nearby values, all of which crowd around 2.',
  3:'No such requirement — f never needs to reach 2 anywhere. The limit describes approach behavior near x=1 only.'}},
  ]
});
INTERACTIVES.limits = function(stage, api){
  const L=makeLab(stage);
  let x=0.0; let visitedL=false, visitedR=false;
  const f=t=>(t*t-1)/(t-1);
  const m=api.missions([
    {text:'Sneak up <b>from the left</b>: get x within 0.01 below 1', xp:20, check:s=>s.visitedL},
    {text:'Sneak up <b>from the right</b>: get x within 0.01 above 1', xp:20, check:s=>s.visitedR},
    {text:'Land within <b>0.002</b> of the hole and read the limit', xp:20, check:s=>Math.abs(s.x-1)<.002&&s.x!==1},
  ]);
  const P=plane(L.ctx,L.W,L.H,90,L.W/2-90,L.H/2+60);
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    P.fn(t=>Math.abs(t-1)<1e-4?NaN:f(t),'#7c5cff',3);
    // hole
    L.ctx.strokeStyle='#7c5cff'; L.ctx.lineWidth=2.5; L.ctx.fillStyle='#11152a';
    L.ctx.beginPath(); L.ctx.arc(P.sx(1),P.sy(2),6,0,7); L.ctx.fill(); L.ctx.stroke();
    // moving point
    if(Math.abs(x-1)>1e-9){
      const y=f(x);
      L.ctx.setLineDash([4,4]); L.ctx.strokeStyle='rgba(0,212,255,.5)'; L.ctx.lineWidth=1.5;
      L.ctx.beginPath(); L.ctx.moveTo(P.sx(x),P.sy(0)); L.ctx.lineTo(P.sx(x),P.sy(y)); L.ctx.stroke();
      L.ctx.beginPath(); L.ctx.moveTo(P.sx(0),P.sy(y)); L.ctx.lineTo(P.sx(x),P.sy(y)); L.ctx.stroke();
      L.ctx.setLineDash([]);
      P.dot(x,y,7,'#00d4ff');
      L.readout.innerHTML='x = '+x.toFixed(4)+'<br>f(x) = '+y.toFixed(4)+'<br>'+(Math.abs(x-1)<.01?'→ approaching <b>2</b>!':'');
    }
    if(x<1&&x>1-.0101) visitedL=true;
    if(x>1&&x<1+.0101) visitedR=true;
    m.update({x,visitedL,visitedR});
  }
  slider(L.ctrl,'x — coarse',-1,3,0.05,0,v=>v.toFixed(2),v=>{x=v;draw();});
  slider(L.ctrl,'x — fine zoom (0.9 to 1.1)',0.9,1.1,0.001,0.9,v=>v.toFixed(3),v=>{x=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The curve has a hole at x=1 (the open circle). Use the fine slider to creep toward it from both sides and watch f(x) — what value is it stalking?</div>';
  L.ctrl.appendChild(note);
  draw();
};

registerLesson({
  id:'c-deriv', world:'calc', emoji:'📈', title:'The Derivative: Slope, Live',
  sub:'Zoom in far enough and every smooth curve becomes a straight line. The derivative is its slope.',
  learn:`<p>How fast is a function changing <em>at a single instant</em>? Average change between two points is easy — rise over run, the <strong>secant</strong> slope:</p>
  <div class="formula">$$\\text{slope} = \\dfrac{f(a+h) - f(a)}{h}$$</div>
  <p>The trick: shrink the gap \\(h\\) toward 0 (a limit!). The secant line tips into the <strong>tangent</strong> line, and its slope is the <strong>derivative</strong> f′(a):</p>
  <div class="formula">$$f'(a) = \\lim_{h \\to 0} \\dfrac{f(a+h) - f(a)}{h}$$</div>
  <p>For \\(f(x) = x^2/2\\) in the lab, the derivative is \\(f'(x) = x\\) — at x=2 the curve climbs at slope 2, at x=0 it's flat. The derivative is a <em>new function</em> reporting the slope everywhere.</p>`,
  ml:`The derivative of the <b>loss</b> with respect to each <b>weight</b> tells training which way to nudge the weight to reduce error. A model with 70B parameters computes 70B of these slopes per step. Slope = "how much does my error change if I tweak this knob" — the most important question in ML.`,
  labs:[
    {key:'explore', title:'Secant becomes tangent', interactive:'deriv',
     intro:'<p>Shrink the gap h and watch the secant line tip into the tangent. The slope it settles on is the derivative.</p>'},
    {key:'estimate', title:'Finite-difference gradient check', interactive:'derivEstimate',
     intro:'<p>The skill autodiff frameworks use to sanity-check themselves: predict f′(a), then estimate it numerically by shrinking h in (f(a+h)−f(a−h))/2h until it matches the true slope.</p>'},
  ],
  quiz:[
    {q:'f′(a) measures…', opts:['The height of f at a','The instantaneous rate of change of f at a','The area under f up to a','The average value of f'], a:1,
     tag:'derivative meaning', focus:'f′(a) = instantaneous rate = tangent slope. Contrast with f(a) (height) and average rate (secant).', why:'It\'s the slope of the tangent line — how fast f is rising or falling exactly at a.', wrong:{0:'Height is f(a) itself — the function\'s <i>value</i>. The derivative is about <b>change</b>: how steeply that value is rising or falling.',
  2:'Area under the curve is the <b>integral</b> — the other half of calculus (lesson 7!). Derivative = slope; integral = accumulation.',
  3:'Average rate needs two points. The derivative is the <b>instantaneous</b> rate — the limit of those averages as the window shrinks to nothing.'}},
    {q:'For \\(f(x) = x^2/2\\), the slope at x = 3 is…', opts:['3','4.5','9','6'], a:0,
     tag:'computing slopes', focus:'For f = x²/2, f′(x) = x. Recompute the lab readouts by hand at x = 1, 2, 3.', why:'f′(x) = x, so f′(3) = 3. You verified this pattern by shrinking h in the lab.', wrong:{1:'4.5 = f(3) = 9/2 — that\'s the <b>height</b> at x=3, not the slope. For f = x²/2, the slope function is f′(x) = x, so f′(3) = 3.',
  2:'9 = 3² — looks like you squared instead of differentiating. The ½ matters: (x²/2)′ = x, so the slope at 3 is just 3.',
  3:'6 = 2·3 is the derivative of plain x² . Our curve is x²/<b>2</b>, and the ½ rides along: f′(x) = x → f′(3) = 3.'}},
    {q:'A function has f′(c) = 0 at some point c. The tangent line there is…', opts:['Vertical','Horizontal','Undefined','At 45°'], a:1,
     tag:'critical points', focus:'f′ = 0 ⇔ horizontal tangent — the flat spots where minima/maxima hide.', why:'Zero slope = flat. These flat spots are where minima and maxima hide — the key to optimization.', wrong:{0:'Vertical tangents are where the slope blows up to ±∞ (like x^⅓ at 0) — the opposite extreme of zero slope.',
  2:'Zero is a perfectly well-defined slope — it means "momentarily flat". Undefined slopes happen at corners and cusps.',
  3:'45° corresponds to slope <b>1</b> (rise = run). Slope 0 is dead horizontal — the floor of a valley or crest of a hill.'}},
  ]
});
INTERACTIVES.deriv = function(stage, api){
  const L=makeLab(stage);
  const f=x=>x*x/2;
  let a=1.5, h=2;
  const m=api.missions([
    {text:'Shrink the gap: make <b>h ≤ 0.05</b> and watch secant → tangent', xp:20, check:s=>s.h<=.05},
    {text:'With h ≤ 0.1, park the point where the slope ≈ <b>2</b>', xp:20, check:s=>s.h<=.1&&Math.abs(s.slope-2)<.1},
    {text:'Find the <b>flat spot</b>: slope ≈ 0 (h ≤ 0.1)', xp:20, check:s=>s.h<=.1&&Math.abs(s.slope)<.08},
  ]);
  const P=plane(L.ctx,L.W,L.H,62,L.W/2,L.H-70);
  let drag=false;
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    P.fn(f,'#7c5cff',3);
    const fa=f(a), fb=f(a+h), slope=(fb-fa)/h;
    // secant line (extended)
    L.ctx.strokeStyle='#ffc94d'; L.ctx.lineWidth=2.5;
    L.ctx.beginPath();
    L.ctx.moveTo(P.sx(a-8),P.sy(fa-8*slope)); L.ctx.lineTo(P.sx(a+8),P.sy(fa+8*slope)); L.ctx.stroke();
    // true tangent ghost
    L.ctx.setLineDash([5,5]); L.ctx.strokeStyle='rgba(45,212,160,.65)'; L.ctx.lineWidth=2;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(a-8),P.sy(fa-8*a)); L.ctx.lineTo(P.sx(a+8),P.sy(fa+8*a)); L.ctx.stroke();
    L.ctx.setLineDash([]);
    P.dot(a,fa,7,'#00d4ff'); P.dot(a+h,fb,6,'#ffc94d');
    L.readout.innerHTML='a = '+a.toFixed(2)+'   h = '+h.toFixed(2)+'<br>secant slope = '+slope.toFixed(3)+'<br>true f′(a) = '+a.toFixed(2);
    m.update({h,slope,a});
  }
  L.canvas.addEventListener('pointerdown',e=>{drag=true;L.canvas.setPointerCapture(e.pointerId);move(e);});
  L.canvas.addEventListener('pointermove',move);
  L.canvas.addEventListener('pointerup',()=>drag=false);
  function move(e){ if(!drag)return; const c=L.toCanvas(e); a=Math.max(-3.5,Math.min(3.5,P.wx(c.x))); draw(); }
  slider(L.ctrl,'h — gap between points',0.01,2,0.01,2,v=>v.toFixed(2),v=>{h=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Drag on the canvas to move the <b style="color:#7fe7ff">blue</b> point. The <b style="color:#ffc94d">gold</b> secant uses the second point h away; the dashed <b style="color:#2dd4a0">green</b> line is the true tangent. Shrink h and watch them merge.</div>';
  L.ctrl.appendChild(note);
  draw();
};

registerLesson({
  id:'c-rules', world:'calc', emoji:'⚡', title:'The Power Rule (Slopes for Free)',
  sub:'Nobody computes limits all day. Rules turn differentiation into pattern-matching.',
  learn:`<p>Computing limits by hand gets old fast. Luckily slopes follow patterns. The big one — the <strong>power rule</strong>:</p>
  <div class="formula">$$f(x) = x^n \\quad \\to \\quad f'(x) = n \\cdot x^{n-1}$$</div>
  <p>The exponent hops down front, then drops by one: \\(x^3 \\to 3x^2\\), \\(x^2 \\to 2x\\), \\(x \\to 1\\), and constants → 0 (flat lines have no slope).</p>
  <p>Two friends that make it scale:<br>
  • <strong>Sum rule</strong>: (f + g)′ = f′ + g′ — differentiate term by term<br>
  • <strong>Constant multiple</strong>: (c·f)′ = c·f′ — scalars ride along</p>
  <p>So \\((x^3 + 4x^2 - 7x + 2)' = 3x^2 + 8x - 7\\). Mechanical. You'll verify the rule visually in the lab.</p>`,
  ml:`Autograd engines (PyTorch, JAX) are databases of these rules. Every op records its derivative rule; backprop just replays them. ReLU\'s rule is famously trivial — derivative 1 (if x&gt;0) or 0 — one reason it conquered deep learning: cheap, stable slopes.`,
  labs:[
    {key:'explore', title:'The derivative is a function', interactive:'rules',
     intro:'<p>Watch f(x) = xⁿ and its derivative n·xⁿ⁻¹ side by side — the derivative curve\'s height is always the tangent\'s slope.</p>'},
    {key:'build', title:'Build a polynomial to spec', interactive:'rulesChallenge',
     intro:'<p>Run the rules backward: set the coefficients of g(x) = a·x² + b·x so its derivative hits a target slope, becomes constant, or has its vertex exactly where asked.</p>'},
  ],
  quiz:[
    {q:'d/dx of \\(x^5\\) = ?', opts:['\\(5x^4\\)','\\(x^4\\)','\\(5x^5\\)','\\(4x^5\\)'], a:0,
     tag:'power rule', focus:'xⁿ → n·xⁿ⁻¹: exponent down front, power drops one. Differentiate x⁷, x³, x by hand.', why:'Exponent down front, drop by one: 5x⁴.', wrong:{1:'You reduced the exponent but forgot to bring the old one down front: xⁿ → <b>n</b>·xⁿ⁻¹, so x⁵ → 5x⁴.',
  2:'You brought the 5 down but kept the power at 5. Both moves happen: coefficient n down, exponent drops to n−1 → 5x⁴.',
  3:'The pieces got swapped: the <i>original</i> exponent (5) becomes the coefficient, and the power drops by one (to 4). 5x⁴.'}},
    {q:'d/dx of \\(3x^4 - 2x + 7\\) = ?', opts:['\\(12x^3 - 2\\)','\\(12x^3 - 2x\\)','\\(3x^3 - 2\\)','\\(12x^3 + 7\\)'], a:0,
     tag:'term-by-term', focus:'Differentiate a full polynomial: constants die, cx → c, coefficients multiply through.', why:'Term by term: 3·4x³ = 12x³, then −2x → −2, and the constant 7 → 0.', wrong:{1:'Almost — but −2x differentiates to the constant −2 (power rule with n=1: x¹ → 1). The x disappears.',
  2:'The constant multiple rides along: (3x⁴)′ = 3 · 4x³ = <b>12</b>x³, not 3x³.',
  3:'Constants vanish under differentiation — a flat +7 has zero slope. It can\'t survive into the derivative.'}},
    {q:'Why is the derivative of a constant zero?', opts:['Constants are negative','A horizontal line has zero slope everywhere','It\'s a convention with no meaning','Because n·xⁿ⁻¹ fails'], a:1,
     tag:'constants', focus:'Flat line ⇒ zero slope ⇒ derivative 0 — geometric, not a convention.', why:'f(x) = 7 never changes, so its rate of change is 0 at every point. (It also follows from the power rule: 7x⁰ → 0.)', wrong:{0:'Sign is irrelevant — negative constants are just as flat as positive ones. The reason is geometric: no change, no slope.',
  2:'It\'s not a bookkeeping convention — it\'s geometry. f(x) = 7 is a horizontal line; its rate of change is literally zero everywhere.',
  3:'The power rule handles it fine: 7 = 7x⁰, so 7·0·x⁻¹ = 0. No failure — just zero.'}},
    {type:'numeric', q:'For \\(f(x) = x^3\\), the power rule gives \\(f\'(x) = 3x^2\\). What is \\(f\'(2)\\)?',
     answer:12, tol:0.001,
     tag:'evaluating a derivative', focus:'Differentiate first (x³ → 3x²), THEN substitute the point: 3·2² = 12.',
     hint:'Apply the power rule, then plug in x = 2: f′(x) = 3x², so f′(2) = 3·(2²).',
     wolfram:'derivative of x^3 at x = 2',
     why:'f′(x) = 3x², so f′(2) = 3·2² = 3·4 = 12 — the slope of the tangent to x³ at x = 2.'},
  ]
});
INTERACTIVES.rules = function(stage, api){
  const L=makeLab(stage);
  let n=2, x=1;
  const m=api.missions([
    {text:'Set n so that the slope at x = 1 equals <b>3</b>', xp:20, check:s=>s.n===3&&Math.abs(s.x-1)<.05},
    {text:'With <b>n = 2</b>, find the point where the slope = <b>4</b>', xp:20, check:s=>s.n===2&&Math.abs(s.slope-4)<.15},
    {text:'Pick the n that makes the slope <b>constant everywhere</b> (f′ doesn\'t depend on x)', xp:20, check:s=>s.n===1},
  ]);
  const P=plane(L.ctx,L.W,L.H,56,L.W/2,L.H-60);
  let drag=false;
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const f=t=>Math.pow(t,n), fp=t=>n*Math.pow(t,n-1);
    P.fn(f,'#7c5cff',3);
    P.fn(fp,'rgba(0,212,255,.7)',2);
    const y=f(x), s=fp(x);
    L.ctx.strokeStyle='#ffc94d'; L.ctx.lineWidth=2.5;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(x-6),P.sy(y-6*s)); L.ctx.lineTo(P.sx(x+6),P.sy(y+6*s)); L.ctx.stroke();
    P.dot(x,y,7,'#ffc94d'); P.dot(x,s,5,'#00d4ff');
    L.readout.innerHTML='f(x) = x<sup>'+n+'</sup>   f′(x) = '+(n===1?'1':n+'x<sup>'+(n-1===1?'':n-1)+'</sup>')+'<br>x = '+x.toFixed(2)+'   slope = '+s.toFixed(2);
    m.update({n,x,slope:s});
  }
  L.canvas.addEventListener('pointerdown',e=>{drag=true;L.canvas.setPointerCapture(e.pointerId);move(e);});
  L.canvas.addEventListener('pointermove',move);
  L.canvas.addEventListener('pointerup',()=>drag=false);
  function move(e){ if(!drag)return; const c=L.toCanvas(e); x=Math.max(-3,Math.min(3,P.wx(c.x))); draw(); }
  chips(L.ctrl,'EXPONENT n',['1','2','3','4'],(i,btn,row)=>{
    n=i+1; [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); });
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b style="color:#b9a8ff">Purple</b> = f(x) = xⁿ. <b style="color:#7fe7ff">Cyan</b> = its derivative f′(x) = n·xⁿ⁻¹. Drag to move the gold tangent point — the cyan curve\'s height always equals the gold line\'s slope. That\'s what "derivative is a function" means.</div>';
  L.ctrl.appendChild(note);
  draw();
};

registerLesson({
  id:'c-chain', world:'calc', emoji:'🔗', title:'The Chain Rule = Backprop',
  sub:'Derivatives of nested functions multiply along the chain. This single rule trains every neural network.',
  learn:`<p>What's the derivative of a <em>pipeline</em>? If \\(L = f(g(w))\\) — w flows through g, then f — the <strong>chain rule</strong> says:</p>
  <div class="formula">$$\\dfrac{dL}{dw} = \\dfrac{dL}{du} \\cdot \\dfrac{du}{dw} \\quad \\text{(where } u = g(w)\\text{)}$$</div>
  <p>Local slopes <strong>multiply along the chain</strong>. Intuition: if u changes 3× as fast as w, and L changes 2× as fast as u, then L changes 6× as fast as w.</p>
  <p>The lab is a micro neural net: prediction \\(u = w \\cdot x\\), loss \\(L = (u - \\text{target})^2\\). The chain gives:</p>
  <div class="formula">$$\\dfrac{dL}{dw} = 2(u - \\text{target}) \\cdot x$$</div>
  <p>That number tells you which way to turn the w knob to shrink the loss. Negative gradient → increase w. Positive → decrease it.</p>`,
  ml:`This IS <b>backpropagation</b>. A deep network is a long pipeline; backprop multiplies local derivatives backwards layer by layer. It also explains <b>vanishing gradients</b>: multiply many slopes &lt; 1 and the product dies — the reason architectures like ResNets and LSTMs exist.`,
  labs:[
    {key:'explore', title:'One-weight backward pass', interactive:'chain',
     intro:'<p>Tune the weight of a micro-net and watch the forward values flow right while the chain-rule derivatives multiply back to the left.</p>'},
    {key:'multiply', title:'Backprop through three stages', interactive:'chainChallenge',
     intro:'<p>Predict a two-stage gradient, then set the three local slopes of a chain to hit a target gradient, flip its sign, and manufacture a <strong>vanishing gradient</strong> — the compounding that makes deep nets hard to train.</p>'},
  ],
  quiz:[
    {q:'L = f(g(w)), with du/dw = 3 and dL/du = 2 at the current point. dL/dw = ?', opts:['5','6','2/3','1.5'], a:1,
     tag:'chain rule', focus:'Local slopes MULTIPLY along a pipeline: dL/dw = dL/du · du/dw. Trace the lab\'s backward pass by hand.', why:'Chain rule: multiply the local slopes. 2 × 3 = 6.', wrong:{0:'<b>Likely trap:</b> adding the local slopes (2+3). The chain rule <b>multiplies</b> them: if u moves 3× as fast as w, and L moves 2× as fast as u, L moves 6× as fast as w.',
  2:'That\'s division — backwards compounding. Rates through a pipeline multiply: 2 × 3 = 6.',
  3:'Also a division (3/2). Think compounding: each stage\'s sensitivity multiplies the next. 2 × 3 = 6.'}},
    {q:'A network\'s gradient dL/dw is <b>negative</b> at the current weight. To reduce the loss you should…', opts:['Decrease w','Increase w','Leave w alone','Change x instead'], a:1,
     tag:'gradient direction', focus:'w ← w − lr·grad: negative gradient means increase w. Work one numeric example.', why:'Negative slope means L decreases as w increases. Step w in the direction OPPOSITE the gradient\'s sign... which here means increasing w. (gradient descent: w ← w − lr·grad)', wrong:{0:'Careful — that\'s the trap. The update is w ← w − lr·grad. With grad &lt; 0, subtracting a negative <b>increases</b> w. The slope says "L falls as w rises" — so rise.',
  2:'Leave w alone only when grad ≈ 0 (you\'re at the bottom). A clearly negative gradient is an instruction: move w up.',
  3:'x is the data — fixed. The only knob training turns is w, and the gradient tells you which way.'}},
    {q:'A 10-layer net multiplies 10 local derivatives, each ≈ 0.5. The early-layer gradient is ≈…', opts:['5','0.5','0.001 (0.5¹⁰)','10'], a:2,
     tag:'vanishing gradients', focus:'Multiply ten 0.5s — that\'s why deep nets starve early layers. Compute 0.5¹⁰.', why:'0.5¹⁰ ≈ 0.00098 — nearly zero. This is the vanishing gradient problem: early layers stop learning in deep, poorly-designed nets.', wrong:{0:'5 = 0.5 × 10 — you multiplied by the layer count. The chain rule multiplies the slopes <i>together</i>: 0.5¹⁰ ≈ 0.001.',
  1:'0.5 is one layer\'s contribution. Ten chained layers compound: 0.5 × 0.5 × … = 0.5¹⁰ ≈ 0.001. That compounding is exactly why gradients vanish.',
  3:'10 is just the layer count. The gradient is the <b>product</b> of the ten local slopes: 0.5¹⁰ ≈ 0.001 — nearly extinguished.'}},
  ]
});
INTERACTIVES.chain = function(stage, api){
  const L=makeLab(stage,{h:380});
  let w=-0.5; const x=1.5, target=3;
  const m=api.missions([
    {text:'Make the gradient <b>negative</b> (prediction below target)', xp:15, check:s=>s.grad<-.2},
    {text:'Get the loss under <b>0.05</b> — tune w like an optimizer would', xp:25, check:s=>s.L<.05},
    {text:'Overshoot: push the prediction <b>above</b> the target until the gradient exceeds <b>+3</b>', xp:20, check:s=>s.grad>3},
  ]);
  function draw(){
    const ctx=L.ctx,W=L.W,H=L.H;
    clearBg(ctx,W,H);
    const u=w*x, diff=u-target, Lv=diff*diff, grad=2*diff*x;
    // computational graph
    function node(cx,cy,label,val,color){
      ctx.fillStyle='#1d2342'; ctx.strokeStyle=color; ctx.lineWidth=2;
      ctx.beginPath(); ctx.roundRect(cx-52,cy-34,104,68,12); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#8b93b8'; ctx.font='700 12px '+getComputedStyle(document.body).fontFamily;
      ctx.textAlign='center'; ctx.fillText(label,cx,cy-12);
      ctx.fillStyle=color; ctx.font='800 19px '+getComputedStyle(document.body).fontFamily;
      ctx.fillText(val,cx,cy+15); ctx.textAlign='left';
    }
    function edge(x0,x1,y,label,below){
      ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1-8,y); ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.35)';
      ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x1-10,y-5); ctx.lineTo(x1-10,y+5); ctx.fill();
      ctx.fillStyle='#ffc94d'; ctx.font='700 12.5px '+getComputedStyle(document.body).fontFamily;
      ctx.textAlign='center'; ctx.fillText(label,(x0+x1)/2, y+(below?22:-12)); ctx.textAlign='left';
    }
    const y=120;
    node(90,y,'weight w',w.toFixed(2),'#7c5cff');
    edge(142,238,y,'u = w·x   (x='+x+')');
    node(290,y,'pred u',u.toFixed(2),'#00d4ff');
    edge(342,438,y,'L = (u−'+target+')²');
    node(490,y,'loss L',Lv.toFixed(3),Lv<.05?'#2dd4a0':'#ff5c7a');
    // backward pass
    const by=y+105;
    ctx.fillStyle='#ff9db1'; ctx.font='800 13px '+getComputedStyle(document.body).fontFamily;
    ctx.textAlign='center';
    ctx.fillText('◀ BACKWARD PASS (chain rule)',290,by-38);
    ctx.fillText('dL/du = 2(u−t) = '+(2*diff).toFixed(2), 400, by);
    ctx.fillText('du/dw = x = '+x.toFixed(2), 215, by);
    ctx.fillText('dL/dw = '+(2*diff).toFixed(2)+' × '+x.toFixed(2)+' = '+grad.toFixed(2), 290, by+34);
    ctx.textAlign='left';
    // target marker bar
    ctx.fillStyle='#8b93b8'; ctx.font='600 12px '+getComputedStyle(document.body).fontFamily;
    ctx.fillText('target = '+target, 452, y-46);
    L.readout.innerHTML='grad dL/dw = '+grad.toFixed(2)+'<br>'+(Math.abs(grad)<.3?'≈ flat — near optimum!':(grad<0?'slope ↓ : increase w':'slope ↑ : decrease w'));
    m.update({grad,L:Lv});
  }
  slider(L.ctrl,'weight w',-2,4,0.05,-0.5,v=>v.toFixed(2),v=>{w=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">A one-weight neural net. Forward: data flows right. Backward: derivatives multiply leftward. The gradient always points "uphill" on the loss — training steps the other way. (Optimum here: w = target/x = 2.0)</div>';
  L.ctrl.appendChild(note);
  draw();
};

registerLesson({
  id:'c-optim', world:'calc', emoji:'🏔️', title:'Optimization: Hunting Flat Spots',
  sub:'Minima and maxima live where the derivative hits zero. Learn to read a slope like a map.',
  learn:`<p>Want the lowest (or highest) point of a function? Walk the curve and watch the slope:</p>
  <p>• f′ &gt; 0 → climbing &nbsp;&nbsp;• f′ &lt; 0 → descending &nbsp;&nbsp;• <strong>f′ = 0 → flat: a candidate!</strong></p>
  <p>Points where f′ = 0 are <strong>critical points</strong>. To classify one, check how the slope changes through it:</p>
  <div class="formula">$$\\begin{aligned} &\\text{slope goes} -\\to 0 \\to + \\quad\\Rightarrow\\quad \\text{local MIN} \\\\ &\\text{slope goes} +\\to 0 \\to - \\quad\\Rightarrow\\quad \\text{local MAX} \\end{aligned}$$</div>
  <p>The lab curve is \\(f(x) = x^3/3 - x\\), so \\(f'(x) = x^2 - 1\\) — critical points at x = −1 and x = +1. One is a peak, one is a valley. Beware: a <em>local</em> minimum isn't necessarily the <em>global</em> one.</p>`,
  ml:`Training = minimizing a loss with millions of dimensions instead of one. The "flat spot" condition becomes ∇L = 0. In 1-D a flat spot that's neither peak nor valley is a <em>horizontal inflection</em> (like x³ at 0); its higher-dimensional cousin — down some directions, up others — is the <b>saddle point</b>. And in very high dimensions almost every critical point is a saddle, not a bad local minimum (most local minima sit near the global value). That's why <b>SGD noise and momentum</b> — which slip past flat saddles — matter more than fear of local minima; Adam additionally adapts the step per parameter.`,
  labs:[
    {key:'explore', title:'Read the slope like a map', interactive:'optim',
     intro:'<p>Walk the cubic and watch the tangent color: climbing, descending, or flat. The flat spots are the critical points.</p>'},
    {key:'classify', title:'The second-derivative test', interactive:'optimClassify',
     intro:'<p>On a double-well curve, find all three critical points and classify each by the <strong>sign of f″</strong>: f″ &gt; 0 is a minimum, f″ &lt; 0 a maximum. Predict how many there are first.</p>'},
  ],
  quiz:[
    {q:'f′(c) = 0 and the slope goes from negative to positive through c. Then c is…', opts:['A local maximum','A local minimum','A saddle point','Not a critical point'], a:1,
     tag:'classifying critical points', focus:'Slope − → 0 → + is a minimum; + → 0 → − a maximum. Sketch both.', why:'Descending, flat, then climbing — the bottom of a valley. Local min.', wrong:{0:'A local max is the reverse pattern: slope goes + → 0 → − (climb, crest, descend). Here we descend then climb: a valley floor.',
  2:'At a 1D saddle/inflection with f′=0, the slope keeps the <b>same</b> sign on both sides (like x³ at 0). Ours flips − to + : true minimum.',
  3:'f′(c) = 0 is the literal definition of a critical point — flatness is what makes it a candidate.'}},
    {q:'For \\(f(x) = x^3/3 - x\\), the critical points are at…', opts:['x = 0 only','x = ±1','x = ±3','There are none'], a:1,
     tag:'finding critical points', focus:'Set f′ = 0 and solve. For x³/3 − x: f′ = x² − 1 → x = ±1.', why:'f′(x) = x² − 1 = 0 → x² = 1 → x = ±1. You stood on both in the lab.', wrong:{0:'f′(0) = 0² − 1 = −1 ≠ 0 — at x=0 the curve is mid-descent, not flat. Solve x² − 1 = 0 → x = ±1.',
  2:'Looks like x² = 9 got solved. The derivative is x² − 1; setting it to zero gives x² = 1 → x = ±1.',
  3:'Every cubic with a positive and negative slope region has two critical points — and f′ = x² − 1 clearly hits zero at ±1.'}},
    {q:'Why can gradient-based training get "stuck"?', opts:['Computers run out of numbers','The optimizer may settle in a local minimum or flat region, not the global best','Losses can\'t be differentiated twice','Learning rates are always too small'], a:1,
     tag:'local vs global', focus:'Gradient followers stop at ANY flat spot — that\'s why initialization and restarts matter in training.', why:'The slope is zero at ANY flat spot, so a slope-following walker can\'t tell a local valley from the deepest one.', wrong:{0:'Precision isn\'t the issue — the geometry is: slope-following can\'t see past the nearest flat spot.',
  2:'Differentiability is usually fine — the obstacle is that ANY flat spot (local valley, plateau, saddle) reads as "done" to a slope-follower.',
  3:'No learning rate fixes blindness: at a local minimum the gradient is genuinely zero, so no scaled step escapes it. (That\'s why momentum & restarts exist.)'}},
    {type:'order', q:'Arrange the derivation that finds and confirms the <b>local minimum</b> of \\(f(x) = x^3/3 - x\\):',
     tag:'the optimization recipe', focus:'The recipe is always: differentiate → set f′=0 → solve for candidates → test each with the sign change.',
     steps:[
       'Differentiate: f′(x) = x² − 1.',
       'Set the derivative to zero: x² − 1 = 0.',
       'Solve for the critical points: x = −1 and x = +1.',
       'At x = +1 the slope runs − → 0 → +, so x = +1 is the local minimum.',
     ],
     why:'The optimization recipe never changes: differentiate, set f′ = 0, solve for the critical points, then classify each by how the slope changes through it. Here x = +1 is where the slope flips from negative to positive — the valley floor.'},
  ]
});
INTERACTIVES.optim = function(stage, api){
  const L=makeLab(stage);
  const f=x=>x*x*x/3-x, fp=x=>x*x-1;
  let x=2.2, drag=false;
  const m=api.missions([
    {text:'Stand on the <b>local minimum</b> (f′ ≈ 0, valley)', xp:20, check:s=>Math.abs(s.x-1)<.07},
    {text:'Stand on the <b>local maximum</b> (f′ ≈ 0, peak)', xp:20, check:s=>Math.abs(s.x+1)<.07},
    {text:'Find a spot where the curve climbs at exactly slope <b>3</b>', xp:20, check:s=>Math.abs(s.slope-3)<.12},
  ]);
  const P=plane(L.ctx,L.W,L.H,85,L.W/2,L.H/2);
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    P.fn(f,'#7c5cff',3);
    const y=f(x), s=fp(x);
    const col=Math.abs(s)<.08?'#2dd4a0':(s>0?'#ffc94d':'#ff5c7a');
    L.ctx.strokeStyle=col; L.ctx.lineWidth=2.5;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(x-5),P.sy(y-5*s)); L.ctx.lineTo(P.sx(x+5),P.sy(y+5*s)); L.ctx.stroke();
    P.dot(x,y,8,col);
    // critical point hints
    P.dot(-1,f(-1),3,'rgba(255,255,255,.35)'); P.dot(1,f(1),3,'rgba(255,255,255,.35)');
    L.readout.innerHTML='x = '+x.toFixed(2)+'<br>f′(x) = x²−1 = <span style="color:'+col+'">'+s.toFixed(2)+'</span><br>'+
      (Math.abs(s)<.08?'⛳ CRITICAL POINT':(s>0?'↗ climbing':'↘ descending'));
    m.update({x,slope:s});
  }
  L.canvas.addEventListener('pointerdown',e=>{drag=true;L.canvas.setPointerCapture(e.pointerId);move(e);});
  L.canvas.addEventListener('pointermove',move);
  L.canvas.addEventListener('pointerup',()=>drag=false);
  function move(e){ if(!drag)return; const c=L.toCanvas(e); x=Math.max(-3,Math.min(3,P.wx(c.x))); draw(); }
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Drag along the curve. The tangent line is color-coded: <b style="color:#ffc94d">gold</b> climbing, <b style="color:#ff9db1">red</b> descending, <b style="color:#2dd4a0">green</b> flat. The two faint dots mark buried treasure.</div>';
  L.ctrl.appendChild(note);
  draw();
};

registerLesson({
  id:'c-graddesc', world:'calc', emoji:'⛷️', title:'Gradient Descent',
  sub:'Drop a ball, follow the slope downhill, repeat. The algorithm that trains every neural network.',
  learn:`<p>You can't see a million-dimensional loss landscape — but you can always compute the slope where you stand. <strong>Gradient descent</strong> needs nothing else:</p>
  <div class="formula">$$x \\leftarrow x - \\text{lr} \\cdot f'(x)$$</div>
  <p>Read it out loud: "step opposite the slope, scaled by the <strong>learning rate</strong>." Slope positive → move left. Slope negative → move right. Repeat until flat.</p>
  <p>The learning rate \\(\\text{lr}\\) is the most famous hyperparameter in ML:<br>
  • Too small → crawls forever<br>
  • Too large → overshoots the valley, bounces, even <strong>diverges</strong><br>
  • Just right → glides to the bottom</p>
  <p>The lab landscape has <strong>two valleys</strong> — one deeper than the other. Where you start determines which basin you fall into. That start-dependence is real, but it's mostly a <em>low-dimensional</em> drama (see the note below).</p>`,
  ml:`This is THE training loop. Replace x with 70 billion weights and f with the loss over your dataset — the update rule is unchanged. But the extras aren't mere decoration: <b>SGD</b> swaps the exact gradient for a noisy minibatch estimate (cheap, and the noise slips past saddles); <b>momentum</b> and <b>Adam</b> fix the <em>conditioning</em>, often a big speedup on ravine-shaped losses. And the "trapped in a bad local minimum" fear is largely a 1-D artifact: in millions of dimensions almost every flat spot is a <b>saddle</b>, and the local minima actually reached sit near the global value. The "loss curves" researchers watch are pictures of this ball rolling.`,
  deeper:[
   {title:'🚀 Go deeper: the divergence threshold', body:'"Too large" has an exact boundary. Near a minimum, a loss locally looks like a quadratic bowl \\(f(x) = \\tfrac12 L x^2\\) with curvature L (how sharply it bends — the second derivative). One gradient-descent step there is \\(x \\leftarrow (1 - \\text{lr}\\cdot L)\\,x\\), and that shrinks x toward 0 only while \\(|1 - \\text{lr}\\cdot L| < 1\\). Solve it and the whole story is one inequality: <b>lr &lt; 2/L converges, lr &gt; 2/L diverges</b> — exactly the bouncing-off-the-walls blowup you can trigger in the lab. Steep, narrow bowls (large L) tolerate only tiny steps; shallow bowls (small L) tolerate large ones. Real networks have many directions with wildly different curvatures at once, so a single global learning rate is always a compromise — which is exactly why <b>warmup</b> (start small while the loss surface is roughest, near initialization) and <b>decay</b> (shrink lr as you approach a sharper minimum) are standard, not decorative. (Goodfellow, Bengio &amp; Courville, <em>Deep Learning</em>, §4.3.)'}],
  labs:[
    {key:'explore', title:'Drop a ball, follow the slope', interactive:'graddesc',
     intro:'<p>Click to drop a ball on a two-valley landscape and descend. See how the starting point decides which basin you fall into.</p>'},
    {key:'tune', title:'Tune the learning rate', interactive:'graddescChallenge',
     intro:'<p>On a clean bowl the update is x ← (1−lr)·x. Predict whether a big lr converges or explodes, then reproduce fast convergence, a single-step landing, and outright divergence.</p>'},
  ],
  quiz:[
    {q:'The slope is f′(x) = +4 and the learning rate is 0.1. One gradient-descent step moves x…', opts:['Right by 0.4','Left by 0.4','Right by 4','Nowhere'], a:1,
     tag:'update rule', focus:'x ← x − lr·f′(x): step against the slope, scaled by lr. Compute two steps by hand.', why:'x ← x − 0.1·4 = x − 0.4. Positive slope means uphill-to-the-right, so step LEFT to descend.', wrong:{0:'<b>Sign flip.</b> The update subtracts: x ← x − 0.1·(+4) = x − 0.4. Positive slope = uphill to the right = step LEFT.',
  2:'Two slips: the step is scaled by lr (0.1 × 4 = 0.4) and goes <i>against</i> the slope — left, not right.',
  3:'You move whenever f′ ≠ 0. With slope +4 and lr 0.1, the rule prescribes exactly 0.4 leftward.'}},
    {q:'A training run’s loss bounces higher and higher each step. Most likely cause?', opts:['Learning rate too small','Learning rate too large','The loss has no minimum','Too few parameters'], a:1,
     tag:'learning rate', focus:'Too small crawls, too large bounces/diverges. Reproduce both failure modes in the lab.', why:'Each oversized step leaps across the valley and lands higher on the far wall — the divergence you triggered in the lab.', wrong:{0:'Too-small lr looks like <i>crawling</i> — slow but steady descent. Bouncing ever higher is the signature of oversized steps leaping across the valley.',
  2:'The minimum exists — your steps just jump clean over it and land higher on the far wall, again and again. Shrink the learning rate.',
  3:'Parameter count doesn\'t cause divergence; step size does. Same equation, same failure mode, in 1-D or 70-billion-D.'}},
    {q:'Two runs start at different points and settle in different valleys with different losses. This shows…', opts:['Gradient descent is broken','A bug in the code','Initialization matters: GD finds local minima, not guaranteed global ones','The learning rate changed itself'], a:2,
     tag:'initialization', focus:'Different starts flow to different valleys — determinism isn\'t global optimality.', why:'GD only follows the local slope. Different starting points can flow into different basins — why neural nets are sensitive to initialization (and why we train with random restarts, etc.).', wrong:{0:'It\'s working exactly as designed — following the local slope to the nearest basin. Locality, not breakage.',
  1:'Deterministic and reproducible: same start, same valley, every time. The sensitivity to the starting point is mathematics, not a bug.',
  3:'The learning rate was fixed throughout. What differed was the <b>starting position</b> — each run flowed into its own basin of attraction.'}},
  ]
});
INTERACTIVES.graddesc = function(stage, api){
  const L=makeLab(stage);
  const f=x=>Math.pow(x*x-4,2)/8 + x/2;
  const fp=x=>0.5*x*x*x - 2*x + 0.5;
  // minima: x≈-2.116 (global, f≈-1.03), x≈1.861 (local); max x≈0.252
  let bx=null, steps=0, lr=0.1, timer=null, diverged=false;
  const m=api.missions([
    {text:'Drop a ball (click the canvas) and <b>descend to any valley</b> (|slope| &lt; 0.02)', xp:20, check:s=>s.converged},
    {text:'Reach the <b>GLOBAL minimum</b> — the deeper left valley', xp:25, check:s=>s.converged&&s.x<0},
    {text:'Crank lr to <b>≥ 1.0</b> and make the ball <b>diverge</b> 💥', xp:20, check:s=>s.diverged},
  ]);
  const P=plane(L.ctx,L.W,L.H,62,L.W/2,L.H/2-40);
  let trail=[];
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    P.fn(f,'#7c5cff',3,-4.2,4.2);
    P.dot(-2.116,f(-2.116),4,'rgba(255,201,77,.5)');
    P.dot(1.861,f(1.861),4,'rgba(255,255,255,.25)');
    trail.forEach((t,i)=>{ L.ctx.globalAlpha=(i+1)/trail.length*.6;
      P.dot(t,f(t),4,'#00d4ff'); L.ctx.globalAlpha=1; });
    if(bx!==null&&Math.abs(bx)<8){
      const s=fp(bx);
      P.dot(bx,f(bx),9,diverged?'#ff5c7a':'#00d4ff');
      L.ctx.strokeStyle='rgba(255,201,77,.8)'; L.ctx.lineWidth=2;
      L.ctx.beginPath(); L.ctx.moveTo(P.sx(bx-1),P.sy(f(bx)-s)); L.ctx.lineTo(P.sx(bx+1),P.sy(f(bx)+s)); L.ctx.stroke();
      L.readout.innerHTML='x = '+bx.toFixed(3)+'   f′ = '+s.toFixed(3)+'<br>steps: '+steps+(Math.abs(s)<.02?'  ✓ CONVERGED':'')+(diverged?'  💥 DIVERGED':'');
    } else {
      L.readout.innerHTML=diverged?'💥 DIVERGED — ball left the universe<br>(that\'s what lr too big does)':'click anywhere to drop the ball';
    }
    m.update({converged: bx!==null&&Math.abs(fp(bx))<.02&&!diverged, x:bx||0, diverged});
  }
  function step(){
    if(bx===null) return;
    bx = bx - lr*fp(bx); steps++;
    trail.push(bx); if(trail.length>40) trail.shift();
    if(Math.abs(bx)>6){ diverged=true; stopAuto(); }
    draw();
  }
  function stopAuto(){ if(timer){clearInterval(timer); timer=null; runBtn.textContent='▶ Auto-run';} }
  L.canvas.addEventListener('pointerdown',e=>{
    const c=L.toCanvas(e); bx=Math.max(-4,Math.min(4,P.wx(c.x)));
    steps=0; trail=[]; diverged=false; draw();
  });
  slider(L.ctrl,'learning rate',0.01,1.3,0.01,0.1,v=>v.toFixed(2),v=>{lr=v;});
  const d=document.createElement('div'); d.className='ctrl'; const row=document.createElement('div'); row.className='chipbtns';
  const stepBtn=document.createElement('button'); stepBtn.className='chip'; stepBtn.textContent='Step ×1'; stepBtn.onclick=step;
  const runBtn=document.createElement('button'); runBtn.className='chip'; runBtn.textContent='▶ Auto-run';
  runBtn.onclick=()=>{ if(timer){stopAuto();} else {timer=setInterval(step,120); runBtn.textContent='⏸ Pause';} };
  row.appendChild(stepBtn); row.appendChild(runBtn); d.appendChild(row); L.ctrl.appendChild(d);
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Click to drop a ball, then Step or Auto-run. The gold dot marks the global minimum, the faint one a decoy valley. Try: small lr from the right side (trapped!), then start further left. Then break it with lr ≥ 1.</div>';
  L.ctrl.appendChild(note);
  registerCleanup(()=>stopAuto());
  draw();
};

registerLesson({
  id:'c-integrals', world:'calc', emoji:'📊', title:'Integrals: Area Under the Curve',
  sub:'Slice it into rectangles, add them up, take the limit. The other half of calculus.',
  learn:`<p>How much area sits under a curve? Approximate with rectangles — width Δx, height f(x) — and add:</p>
  <div class="formula">$$\\text{Area} \\approx \\sum f(x_i) \\cdot \\Delta x \\quad \\to \\quad \\int_a^b f(x)\\, dx \\quad \\text{(as } \\Delta x \\to 0\\text{)}$$</div>
  <p>That limit of <strong>Riemann sums</strong> is the <strong>definite integral</strong>. More rectangles → less error → exact area in the limit. (Same limit trick as derivatives, pointed at accumulation instead of change.)</p>
  <p>One caveat the picture hides: area below the x-axis counts as <strong>negative</strong>. The integral is <em>signed</em> (net) area, not painted area — central once integrals become probabilities and expected values.</p>
  <p>And the punchline of all calculus, the <strong>Fundamental Theorem</strong>, which actually has <strong>two halves</strong>:</p>
  <div class="formula">$$\\text{Part 1: } \\dfrac{d}{dx} \\int_a^x f(t)\\, dt = f(x) \\qquad \\text{Part 2: } \\int_a^b f'(x)\\, dx = f(b) - f(a)$$</div>
  <p>Part 1 says differentiating an accumulation gives back the integrand; Part 2 says a definite integral is just the antiderivative evaluated at the ends. Together: integration and differentiation are inverse operations — two halves of one subject. (Part 2 needs an antiderivative to exist; not every function has one in closed form.)</p>`,
  ml:`Integrals show up wherever probability lives: the area under a probability density must equal 1, expected values are integrals E[X] = ∫ x·p(x) dx, and the "AUC" metric on every classifier eval is literally <b>A</b>rea <b>U</b>nder the <b>C</b>urve. They're also the backbone of generative models: a VAE's training objective (the ELBO) is an integral over latent space, and diffusion models are <em>derived</em> from continuous-time noise processes (SDEs) whose reverse path is an integral of the score function.`,
  labs:[
    {key:'explore', title:'Rectangles fill the area', interactive:'integrals',
     intro:'<p>Add more rectangles and watch the Riemann sum close in on the true area under the curve.</p>'},
    {key:'accumulate', title:'Accumulate to a target', interactive:'integralsChallenge',
     intro:'<p>Drag the upper limit b to make the area hit an exact value — then switch to a line that crosses the axis and find where the <strong>signed</strong> area nets to zero.</p>'},
  ],
  quiz:[
    {q:'∫₀³ 2x dx = ? (Hint: antiderivative of 2x is x².)', opts:['6','9','3','18'], a:1,
     tag:'fundamental theorem', focus:'∫ₐᵇ f′ = f(b) − f(a): antiderivative at the ends. Verify ∫₀³ 2x dx = 9 by triangle area too.', why:'By the Fundamental Theorem: x² evaluated 0→3 gives 9 − 0 = 9. (It\'s also a triangle: ½·3·6 = 9.)', wrong:{0:'6 is f(3) — the curve\'s <b>height</b> at the endpoint. The integral accumulates area the whole way: x² from 0 to 3 = 9. (Picture the triangle: ½·3·6.)',
  2:'3 is just the width of the interval (b − a). The integral weights every slice by the function\'s height: 9.',
  3:'18 = 6 × 3 is the full <b>rectangle</b> (max height × width). The region under the rising line 2x is the triangle — half of that: 9.'}},
    {q:'As the number of rectangles n → ∞, the Riemann sum…', opts:['Diverges to infinity','Approaches the exact area — the integral','Approaches zero','Oscillates forever'], a:1,
     tag:'Riemann convergence', focus:'More, thinner rectangles → error → 0. Watch the error column shrink in the lab as n grows.', why:'Thinner slices hug the curve better; the error shrinks to 0. You watched this happen on the slider.', wrong:{0:'More rectangles, but each one thinner — width shrinks as 1/n, so the total stays pinned near the true area. It converges, not explodes.',
  2:'Each rectangle\'s area → 0, but you have n → ∞ of them. The product (sum) settles at the exact area — that limit IS the integral.',
  3:'For a fixed sample rule on a monotone curve the sums march steadily toward the answer (your left-sums only ever increased). No oscillation.'}},
    {q:'A probability density function must satisfy…', opts:['f(x) ≤ 1 everywhere','Total area under it = 1','It must be a straight line','f(0) = 0'], a:1,
     tag:'probability densities', focus:'Densities integrate to 1; heights can exceed 1. Sketch a narrow tall spike with area 1.', why:'Probabilities over all outcomes sum to 1 — for continuous variables "sum" means integral. (Density values themselves CAN exceed 1.)', wrong:{0:'Surprisingly, no! A density can spike above 1 on a narrow interval (a tight Gaussian peaks well above 1) as long as total <b>area</b> stays 1. Heights aren\'t probabilities; areas are.',
  2:'Shape is unconstrained — bell, spike, plateau, anything — provided the area under it integrates to exactly 1.',
  3:'No pointwise requirement at 0 or anywhere else. The single defining constraint is global: ∫ f = 1.'}},
  ]
});
INTERACTIVES.integrals = function(stage, api){
  const L=makeLab(stage);
  const f=x=>x*x/4+0.5;
  const exact = 64/12 + 2; // ∫₀⁴ x²/4 + 1/2 = x³/12 + x/2
  let n=4, mode=0; // 0 left, 1 right
  let triedL=false, triedR=false;
  const m=api.missions([
    {text:'Slice finer: use at least <b>24 rectangles</b>', xp:15, check:s=>s.n>=24},
    {text:'Get the error under <b>2%</b>', xp:25, check:s=>s.errPct<2},
    {text:'Compare <b>left vs right</b> sums (try both modes) — which overestimates here?', xp:20, check:s=>s.triedBoth},
  ]);
  const P=plane(L.ctx,L.W,L.H,92,70,L.H-50);
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const dx=4/n; let sum=0;
    for(let i=0;i<n;i++){
      const x0=i*dx, h=f(mode===0?x0:x0+dx); sum+=h*dx;
      L.ctx.fillStyle='rgba(0,212,255,.22)'; L.ctx.strokeStyle='rgba(0,212,255,.6)'; L.ctx.lineWidth=1;
      const px=P.sx(x0), pw=P.sx(x0+dx)-px, py=P.sy(h), ph=P.sy(0)-py;
      L.ctx.fillRect(px,py,pw,ph); L.ctx.strokeRect(px,py,pw,ph);
    }
    P.fn(f,'#7c5cff',3,-0.5,4.5);
    L.ctx.strokeStyle='rgba(255,255,255,.4)'; L.ctx.setLineDash([4,4]);
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(4),P.sy(0)); L.ctx.lineTo(P.sx(4),P.sy(f(4))); L.ctx.stroke(); L.ctx.setLineDash([]);
    const errPct=Math.abs(sum-exact)/exact*100;
    if(mode===0) triedL=true; else triedR=true;
    L.readout.innerHTML=(mode===0?'LEFT':'RIGHT')+' sum, n = '+n+'<br>Σ f(xᵢ)Δx = '+sum.toFixed(4)+'<br>exact ∫ = '+exact.toFixed(4)+'<br>error = '+errPct.toFixed(2)+'%';
    m.update({n,errPct,triedBoth:triedL&&triedR});
  }
  slider(L.ctrl,'n — number of rectangles',2,60,1,4,v=>''+v,v=>{n=v;draw();});
  chips(L.ctrl,'SAMPLE POINT',['Left edge','Right edge'],(i,btn,row)=>{
    mode=i; [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); });
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Computing ∫₀⁴ (x²/4 + ½) dx. Left-edge rectangles undershoot a rising curve; right-edge overshoot. Both converge to the same truth as n grows.</div>';
  L.ctrl.appendChild(note);
  draw();
};

registerLesson({
  id:'c-boss', world:'calc', emoji:'🗺️', title:'BOSS: Gradients in 2D',
  sub:'Partial derivatives, the gradient vector, and descent on a real loss surface. Your graduation run.',
  learn:`<p>Real loss functions take many inputs. With two, \\(f(x, y)\\), ask the slope question one variable at a time — <strong>partial derivatives</strong>:</p>
  <div class="formula">$$\\dfrac{\\partial f}{\\partial x} = \\text{slope if you step in } x \\qquad \\dfrac{\\partial f}{\\partial y} = \\text{slope if you step in } y$$</div>
  <p>Stack them into a vector — hello, World 1! — and you get the <strong>gradient</strong>:</p>
  <div class="formula">$$\\nabla f = \\left[ \\dfrac{\\partial f}{\\partial x}, \\dfrac{\\partial f}{\\partial y} \\right]$$</div>
  <p>The gradient is a vector that <strong>points in the steepest uphill direction</strong>, with magnitude = steepness. So \\(-\\nabla f\\) is the fastest way down. Gradient descent in any dimension:</p>
  <div class="formula">$$\\text{position} \\leftarrow \\text{position} - \\text{lr} \\cdot \\nabla f$$</div>
  <p>The lab surface is \\(f(x,y) = \\dfrac{1}{2}(x-1)^2 + 0.8(y+0.8)^2\\) — a tilted bowl. Read the gradient field, then ride it to the bottom.</p>`,
  ml:`You now hold the complete mental model of deep learning: <b>data are vectors</b> (W1), <b>layers are matrices</b> (W1), <b>loss is a surface</b> over weight-space, <b>backprop computes ∇loss via the chain rule</b>, and <b>training is gradient descent</b> — exactly what you're about to do, in 70-billion-D instead of 2-D. That's not a metaphor; it's the same equation.`,
  interactive:'boss-calc',
  quiz:[
    {q:'For \\(f(x,y) = x^2 + 3y\\), ∇f = ?', opts:['\\([2x, 3]\\)','\\([x^2, 3y]\\)','\\([2x + 3]\\)','\\([2, 3]\\)'], a:0,
     tag:'partial derivatives', focus:'∂f/∂x treats y as constant. Compute ∇f for f = x² + 3y and f = x²+2y² by hand.', why:'∂f/∂x treats y as constant → 2x. ∂f/∂y treats x as constant → 3. The gradient stacks them into a vector.', wrong:{1:'Those are the original <i>terms</i>, not their slopes. Differentiate each: ∂(x²)/∂x = 2x and ∂(3y)/∂y = 3 → ∇f = [2x, 3].',
  2:'Don\'t collapse them into one number — the gradient <b>stacks</b> the partials into a vector (this is where World 1 meets World 2): [2x, 3].',
  3:'∂(x²)/∂x = 2x, which still depends on where you stand. [2, 3] would be the gradient of 2x + 3y — a plane, not our bowl.'}},
    {q:'A function’s gradient at a point points northeast. To minimize f, step…', opts:['Northeast','Southwest','North','It doesn\'t matter'], a:1,
     tag:'gradient direction', focus:'∇f points steepest UPHILL; descent steps along −∇f. Verify with the lab\'s arrows.', why:'∇f points steepest UPHILL; descent goes exactly opposite: −∇f, i.e. southwest.', wrong:{0:'Northeast is the gradient\'s own direction — steepest <b>ascent</b>. Following it maximizes f. To minimize, go exactly opposite: −∇f.',
  2:'Due north only cancels part of the climb — you\'d still be drifting uphill along the east component. Steepest descent is the full reversal: southwest.',
  3:'Direction is everything: the right one descends fastest, the wrong one climbs. The rule is mechanical: step along −∇f.'}},
    {q:'Training a 70B-parameter LLM, the gradient ∇L is…', opts:['A single number','A 70-billion-dimensional vector, one slope per weight','A 70B × 70B matrix','Computed only once before training'], a:1,
     tag:'gradients at scale', focus:'One partial per parameter, stacked into a vector — recomputed every training step.', why:'One partial derivative per parameter, stacked into one colossal vector — recomputed every single training step via backprop.', wrong:{0:'A single number is the loss L itself. Its gradient has one slope <i>per parameter</i> — 70 billion partial derivatives stacked into one vector.',
  2:'A 70B × 70B matrix is the <b>Hessian</b> (second derivatives) — astronomically too large to form. The gradient is the humble first-derivative vector, size 70B.',
  3:'It\'s recomputed every single step — the loss surface shifts under you with each batch. That\'s why training costs what it costs.'}},
  ]
});
INTERACTIVES['boss-calc'] = function(stage, api){
  const L=makeLab(stage,{h:460});
  const fx=(x,y)=>0.5*(x-1)*(x-1)+0.8*(y+0.8)*(y+0.8);
  const grad=(x,y)=>[(x-1), 1.6*(y+0.8)];
  let ball=null, steps=0, lr=0.15, timer=null, probed=false;
  const m=api.missions([
    {text:'Probe the field: hover/drag to find a spot where <b>‖∇f‖ &gt; 3</b>', xp:15, check:s=>s.probed},
    {text:'Drop a ball (click) and <b>descend to the minimum</b> (within 0.15)', xp:30, check:s=>s.atMin},
    {text:'Do it efficiently: converge in <b>≤ 20 steps</b>', xp:25, check:s=>s.atMin&&s.steps<=20},
  ]);
  const P=plane(L.ctx,L.W,L.H,56);
  // static heatmap
  const hm=document.createElement('canvas'); hm.width=L.W; hm.height=460;
  (function(){ const c=hm.getContext('2d'), img=c.createImageData(L.W,460);
    for(let py=0;py<460;py++)for(let px=0;px<L.W;px++){
      const v=fx(P.wx(px),P.wy(py)); const t=Math.min(1,v/14);
      const i=(py*L.W+px)*4;
      img.data[i]=17+90*t; img.data[i+1]=21+30*(1-t)+10*t; img.data[i+2]=42+120*(1-t);
      img.data[i+3]=255;
    } c.putImageData(img,0,0); })();
  let mouse=null, trail=[];
  function draw(){
    L.ctx.drawImage(hm,0,0);
    // contours via marching dots (cheap): rings of constant f
    L.ctx.strokeStyle='rgba(255,255,255,.14)';
    for(const lv of [0.5,1.5,3,5.5,9]){
      L.ctx.beginPath();
      const a=Math.sqrt(2*lv), b=Math.sqrt(lv/0.8);
      L.ctx.ellipse(P.sx(1),P.sy(-0.8),a*56,b*56,0,0,7); L.ctx.stroke();
    }
    P.dot(1,-0.8,5,'#ffc94d');
    if(mouse){
      const g=grad(mouse[0],mouse[1]), n=Math.hypot(g[0],g[1]);
      P.arrow(mouse[0],mouse[1],mouse[0]+g[0]*.35,mouse[1]+g[1]*.35,'#ff5c7a',3,'∇f');
      P.arrow(mouse[0],mouse[1],mouse[0]-g[0]*.35,mouse[1]-g[1]*.35,'#2dd4a0',3,'−∇f');
      if(n>3) probed=true;
      L.readout.innerHTML='f = '+fx(mouse[0],mouse[1]).toFixed(2)+'<br>∂f/∂x = '+g[0].toFixed(2)+'   ∂f/∂y = '+g[1].toFixed(2)+'<br>‖∇f‖ = '+n.toFixed(2);
    }
    trail.forEach((t,i)=>{L.ctx.globalAlpha=(i+1)/trail.length*.7; P.dot(t[0],t[1],4,'#00d4ff'); L.ctx.globalAlpha=1;});
    let atMin=false;
    if(ball){
      P.dot(ball[0],ball[1],9,'#00d4ff');
      const d=Math.hypot(ball[0]-1,ball[1]+0.8);
      atMin = d<0.15;
      L.readout.innerHTML='ball: ('+ball[0].toFixed(2)+', '+ball[1].toFixed(2)+')<br>loss f = '+fx(ball[0],ball[1]).toFixed(3)+'<br>steps: '+steps+(atMin?'  🏆 MINIMUM!':'');
    }
    m.update({probed, atMin, steps});
  }
  function step(){
    if(!ball) return;
    const g=grad(ball[0],ball[1]);
    ball=[ball[0]-lr*g[0], ball[1]-lr*g[1]]; steps++;
    trail.push([...ball]); if(trail.length>50) trail.shift();
    draw();
  }
  function stopAuto(){ if(timer){clearInterval(timer);timer=null;runBtn.textContent='▶ Auto-descend';} }
  let down=false;
  L.canvas.addEventListener('pointermove',e=>{const c=L.toCanvas(e); mouse=[P.wx(c.x),P.wy(c.y)]; draw();});
  L.canvas.addEventListener('pointerdown',e=>{const c=L.toCanvas(e);
    ball=[P.wx(c.x),P.wy(c.y)]; steps=0; trail=[]; draw();});
  slider(L.ctrl,'learning rate',0.02,1.2,0.01,0.15,v=>v.toFixed(2),v=>{lr=v;});
  const d=document.createElement('div'); d.className='ctrl'; const row=document.createElement('div'); row.className='chipbtns';
  const stepBtn=document.createElement('button'); stepBtn.className='chip'; stepBtn.textContent='Step ×1'; stepBtn.onclick=step;
  const runBtn=document.createElement('button'); runBtn.className='chip'; runBtn.textContent='▶ Auto-descend';
  runBtn.onclick=()=>{ if(timer){stopAuto();} else {timer=setInterval(step,130); runBtn.textContent='⏸ Pause';} };
  row.appendChild(stepBtn); row.appendChild(runBtn); d.appendChild(row); L.ctrl.appendChild(d);
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Darker = lower loss. Move the pointer to read the gradient (<b style="color:#ff9db1">red</b> = uphill, <b style="color:#2dd4a0">green</b> = downhill). Click to drop your ball, then descend. The gold dot is the goal.</div>';
  L.ctrl.appendChild(note);
  registerCleanup(()=>stopAuto());
  draw();
}


// loaded AFTER the core lessons above (static imports hoist and would run
// extra.js before any lesson was registered — top-level await preserves order)
// la-core-labs registers the "challenge" second lab for each World 1 core
// lesson (referenced by the labs:[] arrays above); load it before validation.
await import('./la-core-labs.js');
await import('./calc-core-labs.js');
await import('./pre-core-labs.js');
await import('./prob-core-labs.js');
await import('./extra.js');
await import('./la-depth.js');
await import('./la-projection.js');
await import('./posdef.js');
await import('./markov.js');
await import('./calc-depth.js');
await import('./calc-multivariable.js');
await import('./prob.js');
await import('./stat.js');
await import('./prob-structure.js');
await import('./info-theory.js');
await import('./ml.js');
await import('./ml-capstone.js');
await import('./ml-trees-eval.js');
await import('./ml-classification.js');
await import('./ml-unsupervised.js');
await import('./numerics.js');
await import('./ml-conv.js');
await import('./ml-kernels.js');
await import('./proofs.js');

// Every lesson + interactive is now registered — run cross-reference checks
// (do interactive keys resolve? do the feedback tables line up with the quiz
// pools?). Logs loudly to the console on any problem; silent-clean otherwise.
validateCurriculum();

// Concept registry checks (KB spine, PR 1): the registry is internally
// consistent (valid worlds, prereqs resolve), and every q.tag on every quiz
// question across the whole curriculum resolves to a registered concept,
// directly or via TAG_ALIASES. Same "log loudly, headlessly assertable"
// contract as validateCurriculum() above.
validateConcepts();
validateLessonTags(LESSONS);
