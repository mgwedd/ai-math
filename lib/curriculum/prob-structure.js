/* ================================================================
   WORLD 3 — PROBABILITY & STATISTICS · STRUCTURE ADD-ON
   Joint, Conditional & Covariance Structure. Where single random
   variables become RELATIONSHIPS between variables — the vocabulary
   n-D Gaussians, PCA (World 1) and every generative model speak.
   Sequenced AFTER the core prob lessons (order 100+ so this appends
   at the end of the 'prob' world regardless of parallel additions):
     joint/marginal/conditional → (conditional) independence → covariance.
   Same registries + schema as the other worlds (see index.js).
   ================================================================ */
import { LESSONS, INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, slider, chips, plane, clearBg, fmt2 } from '../engine.js';

/* ---------- shared: color scale for a probability cell (blue→cyan→gold) ---------- */
function heatColor(t){
  // t in [0,1]; low = deep blue, high = warm gold
  t = Math.max(0, Math.min(1, t));
  const stops = [
    [17, 21, 42],     // #11152a  (≈0)
    [30, 60, 130],
    [0, 150, 200],
    [0, 212, 255],    // cyan
    [255, 201, 77],   // gold (≈1)
  ];
  const seg = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(seg));
  const f = seg - i;
  const a = stops[i], b = stops[i + 1];
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return 'rgb(' + r + ',' + g + ',' + bl + ')';
}

/* ================== 1 · JOINT, MARGINAL & CONDITIONAL ================== */

registerLesson({
  id:'prob-joint', world:'prob', order:103, emoji:'🗺️', title:'Joint, Marginal & Conditional',
  sub:'One table holds every relationship between two variables — and slicing vs summing it are the two moves that matter.',
  learn:`<p>Two random variables at once live in a <strong>joint distribution</strong> P(X, Y): a table where every cell is the probability of one (x, y) pair. All the cells sum to 1. That single table secretly contains three different distributions, and two operations pull them out:</p>
  <p><strong>Marginalize (sum a row or column)</strong> — collapse one variable away to recover the other alone:</p>
  <div class="formula">$$P(X = x) = \\sum_{y} P(X = x, Y = y)$$</div>
  <p>Summing across each row gives the <strong>marginal</strong> P(X); summing down each column gives P(Y). The name is literal: old statisticians wrote these totals in the <em>margins</em> of the table.</p>
  <p><strong>Condition (take one row or column, then renormalize)</strong> — fix Y at a known value and ask what X does now:</p>
  <div class="formula">$$P(X = x \\mid Y = y) = \\dfrac{P(X = x, Y = y)}{P(Y = y)}$$</div>
  <p>Conditioning is <em>slicing</em>: grab the Y = y column, then divide by its total so the slice sums back to 1. You've thrown away every world where Y ≠ y and rescaled what remains. Marginalizing forgets a variable; conditioning learns one.</p>`,
  ml:`Every generative model is a joint distribution you can slice. A language model factorizes P(tokens) and samples <b>conditionally</b>: P(next | context) is one conditioning operation per token. Image models learn P(pixels), then condition on a caption. "Prompting" is choosing which row of an unimaginably large joint table to renormalize — and marginalizing (summing out latents) is exactly what makes the normalizing constant so expensive.`,
  deeper:[
   {title:'😵 Stuck? Rows vs columns, sums vs slices', body:'Keep two verbs straight. MARGINAL = SUM a whole strip → you forget that variable and keep the other. CONDITIONAL = SLICE one strip and RENORMALIZE → you assume that variable\'s value and ask about the other. Same table, opposite intentions: one erases a dimension, the other fixes it.'},
   {title:'🚀 Go deeper: the chain rule of probability', body:'Rearrange the conditional definition and you get P(X, Y) = P(Y)·P(X | Y). Chain it across many variables — P(x₁)P(x₂|x₁)P(x₃|x₁,x₂)… — and you have the exact factorization an autoregressive model (GPT) uses to turn "model a joint over 1000 tokens" into "predict one token at a time." The whole architecture is this identity, unrolled.'},
   {title:'🚀 Go deeper: marginalizing is the expensive part', body:'Getting P(X) from a joint means summing (or integrating) over every value of Y. In two dimensions that\'s a quick row-sum; over hundreds of latent variables it\'s a sum with exponentially many terms — the intractable normalizing constant Z that variational inference, MCMC, and diffusion models all exist to dodge. Conditioning is cheap; marginalizing is where the hard problems hide.'}],
  interactive:'probjoint',
  quiz:[
   {q:'You have a joint table P(X, Y). To get the marginal P(X), you…', opts:['Sum P(X, Y) over all values of Y','Divide P(X, Y) by P(Y)','Multiply the row by the column','Take the largest cell in each row'], a:0,
    tag:'marginalization', focus:'Marginal P(X) = sum the joint over the OTHER variable. It collapses Y away, leaving X alone.',
    why:'Marginalizing sums the joint over the variable you want to forget: P(X=x) = Σ_y P(x, y). Each row-total is one marginal probability.',
    wrong:{1:'Dividing the joint by P(Y) gives the CONDITIONAL P(X|Y), not the marginal. Marginalizing is a plain sum, no division.',2:'Multiplying a marginal row by a marginal column reconstructs an INDEPENDENT joint — that\'s the reverse move, and only valid under independence.',3:'The mode (largest cell) throws away probability mass. A marginal keeps all of it by summing the whole strip.'}},
   {q:'Conditioning on Y = y (computing P(X | Y = y)) amounts to…', opts:['Taking the Y = y slice of the joint and renormalizing it to sum to 1','Summing the joint over all y','Setting P(Y = y) = 1 and leaving X untouched','Averaging every row of the table'], a:0,
    tag:'conditioning', focus:'Conditioning = slice one row/column, then divide by its total so the slice sums to 1.',
    why:'P(X | Y=y) = P(x, y) / P(Y=y): keep only the Y=y strip, then divide by its total. You discard all worlds where Y ≠ y and rescale the rest.',
    wrong:{1:'Summing over all y is MARGINALIZING — it forgets Y entirely. Conditioning does the opposite: it fixes Y at one value.',2:'You must renormalize: the raw slice sums to P(Y=y) < 1, so you divide by it. Without that division it isn\'t a valid distribution over X.',3:'Averaging rows blends the variable away. Conditioning selects exactly one strip, it doesn\'t average across them.'}},
   {q:'In a valid joint distribution P(X, Y), the sum of ALL cells is…', opts:['1','Equal to the number of cells','P(X) + P(Y)','Not constrained'], a:0,
    tag:'joint normalization', focus:'A joint over all outcomes is still one probability distribution: every cell ≥ 0 and the whole table sums to 1.',
    why:'It is one distribution over the pair (X, Y). Probabilities of all mutually exclusive outcomes must total 1 — cells and grand total alike.',
    wrong:{1:'Cell count is just how finely you\'ve gridded the outcomes; it doesn\'t change that the probabilities sum to 1. A 100-cell table still totals 1.',2:'P(X) + P(Y) each already sum to 1 on their own, so their sum is 2 — the joint is not their sum. The joint sums to 1 by itself.',3:'It is constrained: any probability distribution\'s outcomes sum to exactly 1. That normalization is what makes it a distribution.'}},
   {q:'From the conditional definition, the joint P(X, Y) can always be rewritten as…', opts:['P(Y) · P(X | Y)','P(X) · P(Y) always','P(X | Y) − P(Y)','P(X) / P(Y)'], a:0,
    tag:'chain rule', focus:'Rearranging P(X|Y)=P(X,Y)/P(Y) gives the chain rule P(X,Y)=P(Y)·P(X|Y) — true for ANY two variables.',
    why:'Multiply both sides of the conditional definition by P(Y): P(X, Y) = P(Y)·P(X | Y). This holds always — it\'s the chain rule that autoregressive models unroll.',
    wrong:{1:'P(X)·P(Y) equals the joint ONLY when X and Y are independent. The chain-rule form P(Y)·P(X|Y) is always valid.',2:'Probabilities in the chain rule multiply, they don\'t subtract — and a difference of probabilities isn\'t a joint probability.',3:'Dividing gives back a conditional, not the joint. To rebuild the joint you multiply P(Y) by P(X|Y).'}},
  ],
});
INTERACTIVES.probjoint = function(stage, api){
  const L=makeLab(stage, {w:640, h:520});
  // 4×4 joint over X (cols 0..3) and Y (rows 0..3). Start correlated so slicing is interesting.
  const NX=4, NY=4;
  // raw (unnormalized) weights; a "positive dependence" pattern (mass near the diagonal)
  let W=[];
  function seed(){
    W=[];
    for(let y=0;y<NY;y++){ const r=[]; for(let x=0;x<NX;x++){
      r.push(1 + 6*Math.exp(-Math.pow(x-y,2)/1.2)); } W.push(r); }
  }
  seed();
  let mode='joint';           // joint | condX | condY
  let selRow=1, selCol=1;     // which strip is highlighted for conditioning
  function totals(){
    let S=0; const px=Array(NX).fill(0), py=Array(NY).fill(0);
    for(let y=0;y<NY;y++) for(let x=0;x<NX;x++){ S+=W[y][x]; px[x]+=W[y][x]; py[y]+=W[y][x]; }
    return {S, px, py};
  }
  const m=api.missions([
    {text:'Read a <b>marginal</b>: switch to "Marginal P(X)" and confirm the four column totals sum to 1', xp:15, check:s=>s.mode==='joint'&&s.showMargin},
    {text:'<b>Condition</b> on a value of Y: pick "P(X | Y)" and select any row — watch that slice renormalize to 1', xp:20, check:s=>s.mode==='condY'},
    {text:'Condition on X instead: pick "P(Y | X)" and select any column', xp:20, check:s=>s.mode==='condX'},
  ]);
  let showMargin=false;
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    const ff=getComputedStyle(document.body).fontFamily;
    const {S, px, py}=totals();
    const gx=90, gy=60, cell=90;                 // grid origin + cell size
    const gw=cell*NX, gh=cell*NY;
    // title
    L.ctx.fillStyle='#cdd4f0'; L.ctx.font='700 13px '+ff;
    L.ctx.fillText(mode==='joint'?'JOINT  P(X, Y)':mode==='condY'?'CONDITIONAL  P(X | Y = '+selRow+')':'CONDITIONAL  P(Y | X = '+selCol+')', gx, 34);
    // determine per-cell display probability + max for the color scale
    const rowTot=py, colTot=px;
    function cellProb(x,y){
      if(mode==='condY') return selRow===y ? W[y][x]/(rowTot[y]||1) : 0;
      if(mode==='condX') return selCol===x ? W[y][x]/(colTot[x]||1) : 0;
      return W[y][x]/S;
    }
    let vmax=1e-9;
    for(let y=0;y<NY;y++) for(let x=0;x<NX;x++) vmax=Math.max(vmax, cellProb(x,y));
    // cells (canvas row 0 at TOP = highest Y for a math-y feel)
    for(let y=0;y<NY;y++) for(let x=0;x<NX;x++){
      const yy=NY-1-y;                            // draw high Y at top
      const px0=gx+x*cell, py0=gy+yy*cell;
      const p=cellProb(x,y);
      const dimmed=(mode==='condY'&&selRow!==y)||(mode==='condX'&&selCol!==x);
      L.ctx.fillStyle=dimmed?'rgba(30,36,64,.6)':heatColor(p/vmax);
      L.ctx.fillRect(px0+1, py0+1, cell-2, cell-2);
      if(!dimmed){
        L.ctx.fillStyle = p/vmax>0.55 ? '#11152a' : '#cdd4f0';
        L.ctx.font='700 14px '+ff; L.ctx.textAlign='center';
        L.ctx.fillText(p.toFixed(2), px0+cell/2, py0+cell/2+5);
        L.ctx.textAlign='left';
      }
    }
    // highlight the selected strip
    L.ctx.lineWidth=3; L.ctx.strokeStyle='#ffc94d';
    if(mode==='condY'){ const yy=NY-1-selRow; L.ctx.strokeRect(gx, gy+yy*cell, gw, cell); }
    if(mode==='condX'){ L.ctx.strokeRect(gx+selCol*cell, gy, cell, gh); }
    // axis labels
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='600 12px '+ff; L.ctx.textAlign='center';
    for(let x=0;x<NX;x++) L.ctx.fillText('X='+x, gx+x*cell+cell/2, gy+gh+22);
    L.ctx.textAlign='right';
    for(let y=0;y<NY;y++) L.ctx.fillText('Y='+y, gx-8, gy+(NY-1-y)*cell+cell/2+4);
    L.ctx.textAlign='left';
    // marginal strips (only shown in joint mode)
    if(mode==='joint' && showMargin){
      // bottom: P(X) column totals
      L.ctx.fillStyle='#8b93b8'; L.ctx.font='700 11px '+ff;
      L.ctx.fillText('marginal P(X) — column sums:', gx, gy+gh+44);
      L.ctx.font='700 13px '+ff;
      let sx=0;
      for(let x=0;x<NX;x++){ const v=px[x]/S; sx+=v;
        L.ctx.fillStyle='rgba(0,212,255,.75)';
        L.ctx.fillText(v.toFixed(2), gx+x*cell+cell/2-14, gy+gh+62); }
      L.ctx.fillStyle='#2dd4a0'; L.ctx.fillText('Σ = '+sx.toFixed(2), gx, gy+gh+82);
    }
    // readout
    let ro='';
    if(mode==='joint'){
      ro='JOINT P(X, Y) — grand total = '+(1).toFixed(2)+'<br>marginal P(X) = ['+px.map(v=>(v/S).toFixed(2)).join(', ')+']'+
         '<br>marginal P(Y) = ['+py.map(v=>(v/S).toFixed(2)).join(', ')+']';
    } else if(mode==='condY'){
      const slice=W[selRow].map(v=>(v/(rowTot[selRow]||1)));
      ro='Conditioned on Y = '+selRow+'<br>P(X | Y='+selRow+') = ['+slice.map(v=>v.toFixed(2)).join(', ')+']'+
         '<br>slice sums to '+slice.reduce((a,b)=>a+b,0).toFixed(2)+' (renormalized)';
    } else {
      const slice=W.map(r=>r[selCol]/(colTot[selCol]||1));
      ro='Conditioned on X = '+selCol+'<br>P(Y | X='+selCol+') = ['+slice.map(v=>v.toFixed(2)).join(', ')+']'+
         '<br>slice sums to '+slice.reduce((a,b)=>a+b,0).toFixed(2)+' (renormalized)';
    }
    L.readout.innerHTML=ro;
    m.update({mode, showMargin, selRow, selCol});
  }
  chips(L.ctrl,'VIEW',['Joint P(X,Y)','Marginal P(X)','P(X | Y)','P(Y | X)'],(i,btn,row)=>{
    if(i===0){ mode='joint'; showMargin=false; }
    else if(i===1){ mode='joint'; showMargin=true; }
    else if(i===2){ mode='condY'; }
    else { mode='condX'; }
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw();
  });
  slider(L.ctrl,'conditioning row  Y = y  (used by P(X|Y))',0,NY-1,1,1,v=>''+v,v=>{selRow=v;draw();});
  slider(L.ctrl,'conditioning col  X = x  (used by P(Y|X))',0,NX-1,1,1,v=>''+v,v=>{selCol=v;draw();});
  chips(L.ctrl,'JOINT PATTERN',['Diagonal (dependent)','Uniform','Random'],(i,btn,row)=>{
    if(i===0) seed();
    else if(i===1){ W=Array.from({length:NY},()=>Array(NX).fill(1)); }
    else { W=Array.from({length:NY},()=>Array.from({length:NX},()=>0.3+Math.random()*3)); }
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw();
  });
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The grid is the joint table — brighter cells are more probable. <b>Marginal P(X)</b> sums each column. <b>P(X | Y)</b> keeps one gold-boxed row and renormalizes it to sum to 1. Marginalizing forgets a variable; conditioning fixes one.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== 2 · INDEPENDENCE & CONDITIONAL INDEPENDENCE ================== */

registerLesson({
  id:'prob-independence', world:'prob', order:104, emoji:'🔗', title:'Independence & Conditional Independence',
  sub:'Independence has a shape: the joint table becomes the outer product of its own margins. See it, and you can never un-see it.',
  learn:`<p>Two variables are <strong>independent</strong> when knowing one tells you nothing about the other. The clean algebraic test:</p>
  <div class="formula">$$P(X, Y) = P(X) \\cdot P(Y) \\quad \\text{for every cell}$$</div>
  <p>That equation has a picture. The right-hand side is an <strong>outer product</strong> of the two marginal vectors — so an independent joint table is exactly what you get by multiplying a column of P(X) values by a row of P(Y) values. Every row of the table is a rescaled copy of every other row; conditioning on Y doesn't change the shape of X's distribution at all. Dependence is any departure from that rank-1 pattern.</p>
  <p><strong>Conditional independence</strong> is subtler and more useful: X and Y may look dependent, yet become independent <em>once you know a third variable Z</em>:</p>
  <div class="formula">$$P(X, Y \\mid Z) = P(X \\mid Z) \\cdot P(Y \\mid Z)$$</div>
  <p>Ice-cream sales and drowning deaths are correlated — until you condition on temperature (Z), which explained both. The dependence was a shadow cast by a common cause; fix Z and it evaporates.</p>`,
  ml:`Conditional independence is the load-bearing assumption of probabilistic ML. <b>Naive Bayes</b> assumes features are independent GIVEN the class — crude, yet it works. <b>Graphical models</b> ARE a map of which conditional independencies hold. And a transformer\'s attention is, in effect, the model deciding which tokens it can treat as conditionally independent given the context — every "this token attends to that one" is a refusal to assume independence.`,
  deeper:[
   {title:'😵 Stuck? Independence = rank-1 table', body:'Build a table by picking column-weights P(X) and row-weights P(Y) and multiplying: cell(x,y) = P(x)·P(y). That table is independent by construction, and it always has the same look — every row is a scaled copy of the marginal P(X). If you can\'t write a table as (one column) × (one row), the variables are dependent. Independence is literally a rank-1 matrix.'},
   {title:'🚀 Go deeper: correlation ≠ dependence', body:'Zero correlation does NOT imply independence — correlation only sees LINEAR relationships. Points on a perfect circle, or Y = X², have correlation ≈ 0 yet Y is completely determined by X. Independence is the strong condition (the whole joint factorizes); zero correlation is the weak one (just the covariance vanishes). The lone exception: for JOINTLY GAUSSIAN variables, zero correlation does imply independence — which is exactly why Gaussians are so beloved.'},
   {title:'🚀 Go deeper: colliders flip the rule', body:'Conditioning usually REMOVES dependence (common cause), but sometimes CREATES it. If X and Y independently cause Z (a "collider"), then X and Y are independent — until you condition on Z, which makes them dependent. Knowing a talented actor got the role AND the film flopped tells you the script was probably bad: two independent causes become linked once you know their shared effect. This "explaining away" is why causal direction matters, not just correlation. The classic instance is <b>Berkson\'s paradox</b>: among hospital patients (a population already conditioned on "admitted"), disease and injury severity can appear negatively correlated even if they\'re unrelated in the general population — because severe-enough-in-either-way is what got you admitted in the first place. Selecting on a collider manufactures a correlation that isn\'t there upstream. (Berkson, 1946.)'},
   {title:'🚀 Go deeper: pairwise independence is not enough', body:'"X and Y are independent" and "Y and Z are independent" and "X and Z are independent" — call that <b>pairwise independence</b> — sounds like it should add up to "X, Y, Z are all independent together" (<b>mutual independence</b>). It doesn\'t. Classic counterexample: let X and Y each be a fair coin flip (0 or 1), and let Z = X ⊕ Y (XOR — 1 if X and Y differ, 0 if they match). Check every pair: P(X,Y) factorizes (they\'re independent flips by construction); Z is a fair coin too, and it turns out P(X,Z) and P(Y,Z) also both factorize — every PAIR here is independent. But the trio isn\'t: knowing any two of {X, Y, Z} tells you the third with certainty (Z reveals whether X, Y matched), so P(X,Y,Z) ≠ P(X)P(Y)P(Z). Mutual independence requires the joint of ALL variables to factorize at once — a strictly stronger condition than every pair checking out. Naive Bayes and similar models that assume full independence are assuming something no amount of pairwise testing can verify. (Grimmett &amp; Stirzaker, <em>Probability and Random Processes</em>.)'}],
  interactive:'probindep',
  quiz:[
   {q:'X and Y are independent exactly when, for every cell,…', opts:['P(X, Y) = P(X) · P(Y)','P(X, Y) = P(X) + P(Y)','P(X | Y) = P(Y | X)','their covariance is negative'], a:0,
    tag:'independence test', focus:'Independence ⇔ the joint FACTORIZES into the product of the marginals, cell by cell.',
    why:'Independence means the joint equals the product of the marginals in every cell — equivalently, P(X|Y) = P(X): learning Y changes nothing about X.',
    wrong:{1:'Probabilities of independent events MULTIPLY, they don\'t add. P(X)+P(Y) isn\'t even a probability (it can exceed 1).',2:'P(X|Y)=P(Y|X) is a symmetry that can hold for dependent variables too; it is not the independence condition. Factorization of the joint is.',3:'Negative covariance is a specific KIND of dependence. Independence requires covariance to be ZERO — but zero covariance alone still isn\'t enough for independence.'}},
   {q:'Viewed as a matrix, an independent joint table P(X, Y) is always…', opts:['A rank-1 outer product of the two marginal vectors','Full rank','Symmetric','Diagonal'], a:0,
    tag:'outer product shape', focus:'P(X)·P(Y) = (column of P(X)) × (row of P(Y)) — a rank-1 matrix. Every row is a scaled copy of the marginal.',
    why:'P(X, Y) = P(X)·P(Y) is a column vector times a row vector — the definition of a rank-1 outer product. Every row of the table is a rescaling of the same marginal shape.',
    wrong:{1:'Full rank is the signature of DEPENDENCE — the rows can\'t all be scalar copies of one marginal. Independence forces rank 1.',2:'Symmetry would need P(X) and P(Y) to match and the table to be square; independence requires neither. A 2×5 independent table is rank-1 but not symmetric.',3:'A diagonal table means Y is a deterministic function of X — maximally DEPENDENT, the opposite of independent.'}},
   {q:'Ice-cream sales and drownings are correlated, but independent given temperature. Temperature is…', opts:['A common cause that made them look dependent','An effect of both','Irrelevant noise','Proof ice cream causes drowning'], a:0,
    tag:'conditional independence', focus:'A common cause Z induces dependence between its two effects; conditioning on Z removes it.',
    why:'Hot days drive both. That shared cause makes the two effects move together (correlated). Fix temperature and the leftover dependence vanishes — the definition of conditional independence.',
    wrong:{1:'Temperature is the CAUSE here, not an effect — sales and drownings are its downstream effects. Conditioning on a common cause is what removes the spurious link.',2:'It\'s the opposite of irrelevant: temperature explains the ENTIRE apparent association. Ignore it and you\'d infer a fake causal link.',3:'That\'s exactly the fallacy the example warns against — correlation from a common cause is not causation between the effects.'}},
   {q:'Two variables have correlation ≈ 0. It follows that they are…', opts:['Not necessarily independent — zero correlation only rules out LINEAR association','Definitely independent','Definitely dependent','Jointly Gaussian'], a:0,
    tag:'correlation vs independence', focus:'Zero correlation ≠ independence. Correlation sees only linear structure; Y=X² has ρ≈0 yet full dependence.',
    why:'Correlation measures only linear alignment. Y = X² (or points on a circle) can have zero correlation while Y is fully determined by X — dependent, but not linearly.',
    wrong:{1:'Independence is stronger than zero correlation: it requires the WHOLE joint to factorize, not just the covariance to vanish. Nonlinear dependence hides under zero correlation.',2:'Zero correlation doesn\'t prove dependence either — genuinely independent variables also have correlation 0. It\'s simply inconclusive.',3:'They MIGHT be Gaussian, and IF they were jointly Gaussian, zero correlation would then imply independence — but nothing here forces Gaussianity.'}},
  ],
});
INTERACTIVES.probindep = function(stage, api){
  const L=makeLab(stage, {w:640, h:520});
  const NX=4, NY=4;
  // independent example: outer product of two adjustable marginals
  let mx=[3,4,2,1], my=[1,3,4,2];   // marginal weights for the independent table
  // dependent example: a diagonal-ish table (NOT a product)
  const DEP=[[6,2,1,1],[2,6,2,1],[1,2,6,2],[1,1,2,6]];
  let show='both';                   // both | indep | dep
  function indepTable(){
    const t=[]; for(let y=0;y<NY;y++){ const r=[]; for(let x=0;x<NX;x++) r.push(mx[x]*my[y]); t.push(r); } return t;
  }
  function norm(t){ let s=0; for(const r of t) for(const v of r) s+=v; return t.map(r=>r.map(v=>v/s)); }
  // how far a table is from independence: max |P(x,y) - P(x)P(y)|
  function depScore(t){
    const P=norm(t); const px=Array(NX).fill(0), py=Array(NY).fill(0);
    for(let y=0;y<NY;y++) for(let x=0;x<NX;x++){ px[x]+=P[y][x]; py[y]+=P[y][x]; }
    let mx2=0; for(let y=0;y<NY;y++) for(let x=0;x<NX;x++) mx2=Math.max(mx2, Math.abs(P[y][x]-px[x]*py[y]));
    return mx2;
  }
  const m=api.missions([
    {text:'Confirm the <b>independent</b> table factorizes: keep its dependence score at <b>0.00</b> while changing a marginal', xp:20, check:s=>s.indepScore<0.005},
    {text:'Compare: the <b>dependent</b> table has a clearly non-zero dependence score', xp:15, check:s=>s.show!=='indep'&&s.depScore>0.05},
    {text:'Reshape a marginal so the independent table\'s <b>P(X)</b> is nearly uniform (all columns within 0.03 of 0.25)', xp:20, check:s=>s.uniformX},
  ]);
  function drawTable(t, ox, oy, cell, title, boxColor){
    const ff=getComputedStyle(document.body).fontFamily;
    const P=norm(t);
    let vmax=1e-9; for(const r of P) for(const v of r) vmax=Math.max(vmax,v);
    L.ctx.fillStyle='#cdd4f0'; L.ctx.font='700 12px '+ff; L.ctx.textAlign='left';
    L.ctx.fillText(title, ox, oy-10);
    for(let y=0;y<NY;y++) for(let x=0;x<NX;x++){
      const yy=NY-1-y, px0=ox+x*cell, py0=oy+yy*cell;
      L.ctx.fillStyle=heatColor(P[y][x]/vmax);
      L.ctx.fillRect(px0+1, py0+1, cell-2, cell-2);
      L.ctx.fillStyle = P[y][x]/vmax>0.55 ? '#11152a' : '#cdd4f0';
      L.ctx.font='600 10px '+ff; L.ctx.textAlign='center';
      L.ctx.fillText(P[y][x].toFixed(2), px0+cell/2, py0+cell/2+3);
      L.ctx.textAlign='left';
    }
    L.ctx.strokeStyle=boxColor; L.ctx.lineWidth=2;
    L.ctx.strokeRect(ox, oy, cell*NX, cell*NY);
    return P;
  }
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    const ff=getComputedStyle(document.body).fontFamily;
    const cell=58;
    const it=indepTable();
    const indScore=depScore(it), depSc=depScore(DEP);
    if(show==='both' || show==='indep')
      drawTable(it, 60, 60, cell, 'INDEPENDENT  P(X,Y)=P(X)·P(Y)', '#2dd4a0');
    if(show==='both' || show==='dep')
      drawTable(DEP, show==='both'?360:60, 60, cell, 'DEPENDENT  (not a product)', '#ff5c7a');
    // marginal bars for the independent table
    const Pi=norm(it); const px=Array(NX).fill(0);
    for(let y=0;y<NY;y++) for(let x=0;x<NX;x++) px[x]+=Pi[y][x];
    const by=360;
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='700 12px '+ff;
    L.ctx.fillText('marginal P(X) of the independent table (drag the sliders):', 60, by-8);
    for(let x=0;x<NX;x++){
      const h=120*px[x]/Math.max(...px,0.001);
      L.ctx.fillStyle='rgba(0,212,255,.7)';
      L.ctx.fillRect(60+x*70, by+120-h, 50, h);
      L.ctx.fillStyle='#cdd4f0'; L.ctx.font='600 11px '+ff; L.ctx.textAlign='center';
      L.ctx.fillText(px[x].toFixed(2), 60+x*70+25, by+120-h-6);
      L.ctx.fillStyle='#8b93b8'; L.ctx.fillText('X='+x, 60+x*70+25, by+138);
      L.ctx.textAlign='left';
    }
    // uniform-X dashed target line at 0.25
    L.ctx.setLineDash([5,5]); L.ctx.strokeStyle='rgba(255,201,77,.6)'; L.ctx.lineWidth=1.5;
    const yUni=by+120-120*0.25/Math.max(...px,0.001);
    L.ctx.beginPath(); L.ctx.moveTo(60, yUni); L.ctx.lineTo(60+4*70, yUni); L.ctx.stroke(); L.ctx.setLineDash([]);
    const uniformX = px.every(v=>Math.abs(v-0.25)<0.03);
    L.readout.innerHTML='independent table dependence score = '+indScore.toFixed(3)+' (≈0 by construction)'+
      '<br>dependent table dependence score = '+depSc.toFixed(3)+
      '<br>P(X) of independent table = ['+px.map(v=>v.toFixed(2)).join(', ')+']';
    m.update({show, indepScore:indScore, depScore:depSc, uniformX});
  }
  chips(L.ctrl,'SHOW',['Both side by side','Independent only','Dependent only'],(i,btn,row)=>{
    show=['both','indep','dep'][i];
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw();
  });
  slider(L.ctrl,'P(X) weight on X=0',0.2,6,0.1,3,v=>v.toFixed(1),v=>{mx[0]=v;draw();});
  slider(L.ctrl,'P(X) weight on X=1',0.2,6,0.1,4,v=>v.toFixed(1),v=>{mx[1]=v;draw();});
  slider(L.ctrl,'P(X) weight on X=2',0.2,6,0.1,2,v=>v.toFixed(1),v=>{mx[2]=v;draw();});
  slider(L.ctrl,'P(X) weight on X=3',0.2,6,0.1,1,v=>v.toFixed(1),v=>{mx[3]=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b style="color:#2dd4a0">Left</b> table is built as P(X)·P(Y) — an outer product, so its dependence score stays 0 no matter how you drag the marginals. <b style="color:#ff9db1">Right</b> table can\'t be written that way, so its score is non-zero. Independence = the table is a rank-1 outer product.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== 3 · COVARIANCE & CORRELATION ================== */

registerLesson({
  id:'prob-covariance', world:'prob', order:105, emoji:'📈', title:'Covariance & Correlation',
  sub:'Do two variables rise together? Covariance says yes/no and by how much; correlation strips out the units so you can compare.',
  learn:`<p><strong>Covariance</strong> measures whether two variables move together. It averages the product of their deviations from their own means:</p>
  <div class="formula">$$\\text{Cov}(X, Y) = E[(X - \\mu_X)(Y - \\mu_Y)]$$</div>
  <p>When a point is above-average in X <em>and</em> above-average in Y, that product is positive; above in one and below in the other, it's negative. Sum them up: positive covariance = the cloud tilts up-right, negative = down-right, zero = no linear tilt.</p>
  <p>But covariance has a flaw: it's <strong>unit-dependent</strong>. Measure height in centimetres instead of metres and the covariance jumps 100×, though nothing about the relationship changed. So we normalize by each variable's spread to get <strong>correlation</strong>:</p>
  <div class="formula">$$\\rho = \\dfrac{\\text{Cov}(X, Y)}{\\sigma_X \\sigma_Y}$$</div>
  <p>Correlation is <strong>scale-free covariance</strong>, always between −1 and +1. ρ = +1 is a perfect upward line, −1 a perfect downward line, 0 no linear relationship. It's the same number a dot product gives when you first center and normalize — cosine similarity of the mean-centered data.</p>
  <p>One warning worth tattooing on: ρ only sees <em>linear</em> structure. A perfect parabola or circle can have ρ ≈ 0 while the variables are tightly, deterministically linked.</p>`,
  ml:`Stack all the pairwise covariances of a data vector and you get the <b>covariance matrix</b> Σ — the object <b>PCA</b> (World 1) diagonalizes: its eigenvectors are the axes of maximum variance, its eigenvalues the variance along them. Σ is also the shape parameter of a <b>multivariate Gaussian</b> 𝒩(μ, Σ): μ says where the cloud sits, Σ says how it\'s stretched and tilted. Whitening, Mahalanobis distance, Gaussian mixtures — all are Σ, put to work.`,
  deeper:[
   {title:'😵 Stuck? The four quadrants', body:'Center the cloud at its mean. Points in the upper-right (both above average) and lower-left (both below) contribute POSITIVE products; upper-left and lower-right contribute NEGATIVE. Covariance is the tug-of-war between these piles. A cloud filling all four quadrants evenly → they cancel → covariance ≈ 0. A cloud hugging the up-right/down-left diagonal → positives win → positive covariance.'},
   {title:'🚀 Go deeper: correlation is a cosine', body:'Center each variable (subtract its mean) and treat the two lists of deviations as vectors. Their dot product is (n times) the covariance; dividing by their magnitudes gives ρ = cos θ between the centered data vectors. So the dot-product/cosine-similarity lesson from World 1 and covariance/correlation here are the SAME geometry — correlation is cosine similarity of mean-centered features. That\'s why both live at the heart of ML.'},
   {title:'🚀 Go deeper: the covariance matrix & PCA', body:'For a d-dimensional variable, Cov becomes a d×d symmetric matrix Σ: entry (i,j) is Cov(Xᵢ, Xⱼ), the diagonal holds the variances. Being symmetric, Σ has real orthogonal eigenvectors (the spectral theorem from the eigen lesson) — those eigenvectors are exactly the principal components, and their eigenvalues are the variance captured along each. PCA is nothing but the eigendecomposition of this covariance structure.'}],
  interactive:'probcov',
  quiz:[
   {q:'A cloud of points tilts clearly up and to the right. Its covariance is…', opts:['Positive','Negative','Zero','Undefined'], a:0,
    tag:'sign of covariance', focus:'Up-right tilt ⇒ high-X pairs with high-Y ⇒ positive deviation products ⇒ positive covariance.',
    why:'Up-right means high X tends to come with high Y: their deviations from the means share a sign, so the average product is positive.',
    wrong:{1:'Negative covariance is a DOWN-right tilt (high X with low Y). Up-right is the positive case.',2:'Zero covariance is no tilt at all — a round or axis-aligned blob. A clear up-right tilt is decisively positive.',3:'Covariance is always well-defined for finite-variance data; a visible linear tilt gives a definite non-zero value.'}},
   {q:'The MAIN reason we use correlation ρ instead of raw covariance is that ρ…', opts:['Is scale-free (unitless), so it always lands in [−1, +1] and is comparable across variables','Is easier to compute','Can detect nonlinear relationships covariance misses','Is always positive'], a:0,
    tag:'why correlation', focus:'ρ = Cov / (σ_X σ_Y) divides out the units, bounding it to [−1,1] and making pairs comparable.',
    why:'Dividing covariance by σ_X σ_Y cancels the units, so ρ ∈ [−1, 1] regardless of scale — you can compare a height-weight ρ to a price-demand ρ directly.',
    wrong:{1:'Correlation is actually MORE work — you compute covariance first, then divide by both standard deviations. Ease isn\'t the reason.',2:'Correlation sees only LINEAR structure, exactly like covariance — normalizing doesn\'t grant it nonlinear vision.',3:'ρ ranges over [−1, +1] including negatives — a downward relationship gives a legitimately negative correlation.'}},
   {q:'Changing X\'s units from metres to centimetres (×100) affects Cov(X, Y) and ρ how?', opts:['Cov scales by 100; ρ is unchanged','Both scale by 100','Neither changes','ρ scales by 100; Cov is unchanged'], a:0,
    tag:'scale invariance', focus:'Covariance carries units (scales with them); correlation divides them out and stays fixed.',
    why:'Covariance has units of X·Y, so ×100 on X multiplies it by 100. Correlation divides by σ_X (also ×100), cancelling the factor — ρ is unchanged. That invariance is the whole point.',
    wrong:{1:'Only covariance carries the units. ρ divides them out, so the 100× cancels and ρ stays put.',2:'Covariance definitely changes — its units are X·Y, so rescaling X rescales it. Only ρ is immune.',3:'Backwards: ρ is the scale-free one (unchanged), and covariance is the one that scales with units.'}},
   {q:'Points lie on a perfect circle centered at the origin. Their correlation ρ is…', opts:['≈ 0, even though X and Y are clearly related','≈ +1','≈ −1','Undefined'], a:0,
    tag:'correlation limits', focus:'ρ captures only LINEAR association; a circle (or parabola) has strong nonlinear structure but ρ≈0.',
    why:'A circle has no linear tilt — for every up-right point there\'s a balancing down-right one, so the products cancel to ρ ≈ 0. Yet X and Y are tightly (nonlinearly) related. ρ is blind to that.',
    wrong:{1:'+1 requires a perfect straight upward LINE, not a circle. The circle\'s symmetry cancels any linear trend.',2:'−1 needs a perfect downward line. A circle is symmetric, so it tilts neither way on average.',3:'ρ is perfectly well-defined here (finite, nonzero variances) — it just equals ≈ 0, which is the instructive part.'}},
  ],
});
INTERACTIVES.probcov = function(stage, api){
  const L=makeLab(stage, {w:640, h:500});
  // draggable point cloud in world coords; live covariance/correlation readout
  let pts=[];
  function seed(pattern){
    pts=[];
    const N=14;
    for(let i=0;i<N;i++){
      let x,y;
      if(pattern==='pos'){ x=(Math.random()*2-1)*3; y=x*0.8+(Math.random()*2-1)*1.2; }
      else if(pattern==='neg'){ x=(Math.random()*2-1)*3; y=-x*0.8+(Math.random()*2-1)*1.2; }
      else if(pattern==='blob'){ x=(Math.random()*2-1)*3; y=(Math.random()*2-1)*3; }
      else if(pattern==='circle'){ const t=i/N*2*Math.PI; x=2.6*Math.cos(t); y=2.6*Math.sin(t); }
      pts.push({x:Math.max(-3.6,Math.min(3.6,x)), y:Math.max(-3.6,Math.min(3.6,y))});
    }
  }
  seed('pos');
  function stats(){
    const n=pts.length;
    const mx=pts.reduce((a,p)=>a+p.x,0)/n, my=pts.reduce((a,p)=>a+p.y,0)/n;
    let cxy=0,vx=0,vy=0;
    for(const p of pts){ const dx=p.x-mx, dy=p.y-my; cxy+=dx*dy; vx+=dx*dx; vy+=dy*dy; }
    cxy/=n; vx/=n; vy/=n;
    const sx=Math.sqrt(vx), sy=Math.sqrt(vy);
    const rho=(sx>1e-6&&sy>1e-6)?cxy/(sx*sy):0;
    return {mx,my,cxy,vx,vy,sx,sy,rho};
  }
  const m=api.missions([
    {text:'Make a <b>strong positive</b> relationship: correlation ρ ≥ <b>0.8</b>', xp:20, check:s=>s.rho>=0.8},
    {text:'Flip it: make ρ ≤ <b>−0.8</b> (a downward cloud)', xp:20, check:s=>s.rho<=-0.8},
    {text:'Kill the linear signal: arrange points so |ρ| < <b>0.15</b> while they still spread out (σ_X ≥ 1)', xp:25, check:s=>Math.abs(s.rho)<0.15&&s.sx>=1},
  ]);
  const P=plane(L.ctx,L.W,L.H,58);
  let drag=-1;
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const st=stats();
    // mean crosshair
    L.ctx.setLineDash([4,4]); L.ctx.strokeStyle='rgba(255,201,77,.5)'; L.ctx.lineWidth=1.5;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(st.mx),0); L.ctx.lineTo(P.sx(st.mx),L.H); L.ctx.stroke();
    L.ctx.beginPath(); L.ctx.moveTo(0,P.sy(st.my)); L.ctx.lineTo(L.W,P.sy(st.my)); L.ctx.stroke();
    L.ctx.setLineDash([]);
    // best-fit line through the mean with slope = Cov/Var(X) (least squares)
    if(st.vx>1e-6){
      const slope=st.cxy/st.vx;
      const x0=-4, x1=4;
      const y0=st.my+slope*(x0-st.mx), y1=st.my+slope*(x1-st.mx);
      const col=st.rho>0.15?'#2dd4a0':st.rho<-0.15?'#ff5c7a':'#8b93b8';
      L.ctx.strokeStyle=col; L.ctx.lineWidth=2.5;
      L.ctx.beginPath(); L.ctx.moveTo(P.sx(x0),P.sy(y0)); L.ctx.lineTo(P.sx(x1),P.sy(y1)); L.ctx.stroke();
    }
    // points, colored by quadrant relative to the mean (shows the covariance tug-of-war)
    for(const p of pts){
      const dx=p.x-st.mx, dy=p.y-st.my;
      const pos=dx*dy>=0;                          // positive product = reinforces positive cov
      P.dot(p.x,p.y,7,pos?'rgba(45,212,160,.95)':'rgba(255,92,122,.95)');
    }
    const rho=st.rho;
    const rcol=rho>0.15?'#2dd4a0':rho<-0.15?'#ff5c7a':'#ffc94d';
    L.readout.innerHTML='Cov(X,Y) = '+fmt2(st.cxy)+'   (units-dependent)'+
      '<br>σ_X = '+fmt2(st.sx)+'   σ_Y = '+fmt2(st.sy)+
      '<br>ρ = Cov/(σ_X σ_Y) = <span style="color:'+rcol+'">'+rho.toFixed(3)+'</span>';
    m.update({rho, sx:st.sx});
  }
  function nearest(e){
    const c=L.toCanvas(e), wx=P.wx(c.x), wy=P.wy(c.y);
    let best=-1, bd=1e9;
    pts.forEach((p,i)=>{ const d=Math.hypot(p.x-wx,p.y-wy); if(d<bd){bd=d;best=i;} });
    return bd<0.6?best:-1;
  }
  L.canvas.addEventListener('pointerdown',e=>{ drag=nearest(e); if(drag>=0){L.canvas.setPointerCapture(e.pointerId); move(e);} });
  L.canvas.addEventListener('pointermove',move);
  L.canvas.addEventListener('pointerup',()=>drag=-1);
  function move(e){ if(drag<0)return; const c=L.toCanvas(e);
    pts[drag].x=Math.max(-3.8,Math.min(3.8,P.wx(c.x)));
    pts[drag].y=Math.max(-3.8,Math.min(3.8,P.wy(c.y))); draw(); }
  chips(L.ctrl,'RESET CLOUD',['Positive','Negative','Blob','Circle'],(i)=>{
    seed(['pos','neg','blob','circle'][i]); draw();
  });
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b>Drag any point.</b> Dashed gold lines mark the means. <b style="color:#2dd4a0">Green</b> dots sit in the "both-above / both-below" quadrants (push covariance up); <b style="color:#ff9db1">red</b> dots oppose it. The fit line\'s tilt is the covariance; ρ rescales it to [−1, 1]. Try the <b>Circle</b> preset — clearly related, yet ρ ≈ 0.</div>';
  L.ctrl.appendChild(note);
  draw();
};
