/* ================================================================
   WORLD 3 DEPTH — TREES, ENSEMBLES & EVALUATION.
   A classification-side companion to the ml world: greedy splits,
   why many weak learners beat one deep one, and how to actually
   MEASURE a classifier honestly. Appends at the END of the ml world
   (explicit high `order` floats) so it sits after the transformer arc.
   Same registries + schema as every other lesson file.
   ================================================================ */
import { LESSONS, INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, slider, chips, plane, clearBg, fmt2 } from '../engine.js';

/* ---------------------------------------------------------------
   1) DECISION TREES & SPLITS
   --------------------------------------------------------------- */
registerLesson({
  id:'ml-trees', world:'ml', order:100, emoji:'🌳', title:'Decision Trees: Greedy Splits',
  sub:'Ask one yes/no question at a time. Each cut carves space into axis-aligned boxes — pick the cut that makes the boxes purest.',
  learn:`<p>A <strong>decision tree</strong> classifies by asking a chain of threshold questions: "is x &gt; 3.1?", then "is y &lt; 0.7?", … Each question is a single axis-aligned cut, so the regions it builds are always <strong>rectangles</strong>.</p>
  <p>Which cut is best? The one that leaves each side as <strong>pure</strong> as possible — ideally all one class. We score impurity two common ways, where <code>p</code> is the fraction of the majority-vs-minority split in a region:</p>
  <div class="formula">$$\\text{Gini} = 1 - \\sum p_k^2 \\qquad \\text{entropy} = -\\sum p_k \\log_2 p_k$$</div>
  <p>Both are <strong>0 when a region is one pure class</strong> and largest at a 50/50 mix. A split's quality is the <em>weighted</em> impurity of its two children — smaller is better. The tree is built <strong>greedily</strong>: at each node it tries every threshold, keeps the single best cut, then recurses. No lookahead — locally best, one step at a time.</p>
  <p>Left unchecked a tree keeps splitting until every leaf is pure, which memorizes noise (overfitting). Real trees are pruned or depth-limited — the same fit-vs-overfit game from the very first ml lesson.</p>`,
  ml:`Trees are the backbone of <b>gradient-boosted machines</b> (XGBoost, LightGBM) — still the go-to for tabular data, often beating neural nets there. Their axis-aligned, if/then structure is also the most <em>interpretable</em> model in wide use: you can read the decision path. Every split you place by hand in the lab is what the learner does automatically, scanning thresholds for the biggest impurity drop.`,
  deeper:[
   {title:'😵 Stuck? The 20-questions view', body:'A tree is the game 20 Questions. Each question should split the remaining possibilities as evenly-by-answer but as purely-by-class as possible. "Is it bigger than a breadbox?" is a good early question because it cleanly separates groups. Gini/entropy just score "how pure did this question leave each side".'},
   {title:'🚀 Go deeper: why axis-aligned is a limitation', body:'A single tree can only draw horizontal and vertical cuts, so a diagonal boundary comes out as a jagged staircase — it needs many splits to approximate one slanted line. That bias is exactly why <b>ensembles</b> of trees (next lesson) and feature engineering matter: rotate the data or average many staircases and the boundary smooths out.'},
   {title:'🚀 Go deeper: Gini vs entropy vs misclassification', body:'All three impurity measures agree at the extremes (0 when pure, max at 50/50). Gini and entropy are both <em>concave</em> and reward splits that create a very-pure child even if the other stays mixed; plain misclassification error is not concave and can miss such splits, so it is rarely used to grow trees. Gini is the CART default (cheaper — no log); entropy (information gain) is the ID3/C4.5 default. In practice they pick nearly identical trees.'}],
  interactive:'mltrees',
  quiz:[
   {q:'A tree node holds 8 points: all 8 are class A. Its Gini impurity is…', opts:['0 — perfectly pure','0.5 — maximally mixed','1 — worst case','Undefined'], a:0,
    tag:'impurity extremes', focus:'Gini = 1 − Σpₖ². One pure class → p=1 → 1 − 1 = 0. Impurity is 0 for a pure node, max at 50/50.',
    why:'One class means p_A = 1, so Gini = 1 − 1² = 0. A pure node needs no more splitting — it is already a decision.',
    wrong:{1:'0.5 is the Gini of a 50/50 two-class mix, the WORST case — the opposite of a pure node.',2:'Gini for two classes maxes out at 0.5, never 1; and a pure node is the best case anyway.',3:'It is perfectly defined: p_A=1, p_B=0, Gini = 1 − (1+0) = 0.'}},
   {q:'When choosing a split, "greedy" means the tree…', opts:['Picks the single best cut right now, without lookahead','Searches all possible whole trees for the global best','Always splits on the first feature','Prefers deeper trees'], a:0,
    tag:'greedy splitting', focus:'Greedy = locally optimal each step. It scans thresholds, takes the biggest immediate impurity drop, then recurses — never backtracks.',
    why:'At each node it evaluates candidate thresholds and keeps the one with the largest immediate impurity reduction — a local choice, no global search.',
    wrong:{1:'Searching all trees is combinatorially explosive and is exactly what greedy AVOIDS; it settles for locally best.',2:'It considers every feature at each node and picks whichever splits best — not a fixed first feature.',3:'Greed is about the per-node cut, not a preference for depth; unchecked depth is a bug (overfitting), not the goal.'}},
   {q:'Why do decision regions from one tree look like a staircase, never a clean diagonal?', opts:['Each split is a single axis-aligned threshold','Trees can only handle two classes','Gini forbids diagonal cuts','The data is always integer-valued'], a:0,
    tag:'axis-aligned bias', focus:'One split = "feature > threshold" = one horizontal OR vertical line. Diagonals must be approximated by many such cuts (a staircase).',
    why:'A split tests one feature against one threshold, producing a vertical or horizontal cut. A diagonal boundary can only be approximated by stacking many of these — the staircase.',
    wrong:{1:'Trees handle any number of classes; the staircase shape is about cut geometry, not class count.',2:'Gini scores purity — it says nothing about cut orientation; the axis-alignment comes from testing one feature at a time.',3:'The values can be continuous; the staircase persists because each cut is still axis-aligned.'}},
   {q:'A tree keeps splitting until every leaf is a single point. On new data it will likely…', opts:['Overfit — it memorized the training noise','Underfit — too simple','Generalize perfectly','Refuse to make predictions'], a:0,
    tag:'tree overfitting', focus:'Unlimited depth → pure leaves → zero training error but memorized noise. Pruning / max-depth trades a little train error for much better test error.',
    why:'Pure-leaf trees fit every training quirk including noise, so training error is ~0 while test error balloons — the overfitting signature from the first ml lesson.',
    wrong:{1:'Underfitting is too FEW splits; a fully-grown tree is the opposite — maximum complexity.',2:'Perfect generalization from memorized noise is exactly what does NOT happen; the gap is the tell.',3:'It predicts fine — it just predicts badly on unseen data because it overfit.'}},
  ],
});
INTERACTIVES.mltrees = function(stage, api){
  const L=makeLab(stage);
  // two classes of points on a plane; class boundary roughly diagonal-ish so a
  // single axis cut can't fully separate — motivates the "greedy, one axis" idea
  // two classes on a roughly DIAGONAL boundary: neither the x nor the y axis
  // alone can separate them cleanly, so a single cut always leaves some impurity —
  // which is exactly the axis-aligned limitation the lesson is teaching.
  const pts=[
    // class 0 (blue) — lower-left, with a couple reaching into mid-x
    [-2.4,-1.6,0],[-1.8,-0.4,0],[-2.6,0.6,0],[-1.2,-1.8,0],[-0.6,-0.9,0],
    [-2.0,1.4,0],[-1.0,0.3,0],[0.4,-1.6,0],[-0.3,-2.1,0],[1.0,-1.9,0],
    // class 1 (orange) — upper-right, with a couple reaching into mid-x
    [2.2,1.4,1],[1.6,0.3,1],[2.8,-0.4,1],[1.1,1.9,1],[0.4,1.4,1],
    [2.4,2.0,1],[1.9,-1.1,1],[-0.4,1.9,1],[2.9,0.8,1],[-1.0,2.0,1],
  ];
  let axis=0;         // 0 = split on x (vertical line), 1 = split on y (horizontal)
  let thr=0;          // threshold value
  let metric=0;       // 0 = Gini, 1 = entropy
  function impurity(group){
    if(group.length===0) return 0;
    const n=group.length, n1=group.filter(p=>p[2]===1).length, p1=n1/n, p0=1-p1;
    if(metric===0) return 1-(p0*p0+p1*p1);
    // entropy in bits
    const t=x=>x>0? -x*Math.log2(x):0;
    return t(p0)+t(p1);
  }
  function split(){
    const left=pts.filter(p=>p[axis]<=thr), right=pts.filter(p=>p[axis]>thr);
    const n=pts.length;
    const wImp=(left.length/n)*impurity(left)+(right.length/n)*impurity(right);
    return {left,right,wImp,parent:impurity(pts)};
  }
  const m=api.missions([
    {text:'Find a split whose <b>weighted Gini drops below 0.30</b> (a clean cut)', xp:20, check:s=>s.metric===0&&s.wImp<0.30},
    {text:'Switch metric to <b>entropy</b> and find a split with weighted impurity below <b>0.60</b>', xp:20, check:s=>s.metric===1&&s.wImp<0.60},
    {text:'Make one side <b>perfectly pure</b> (a child with impurity exactly 0 and ≥ 3 points)', xp:25, check:s=>s.purePure},
  ]);
  const P=plane(L.ctx,L.W,L.H,58);
  function classColor(c){ return c===1? '#ffc94d':'#00d4ff'; }
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const {left,right,wImp,parent}=split();
    // shade the two regions by their majority class (decision regions)
    function majority(group){ if(!group.length) return -1;
      const n1=group.filter(p=>p[2]===1).length; return n1*2===group.length? -1 : (n1>group.length/2?1:0); }
    const mL=majority(left), mR=majority(right);
    // region rectangles: fill the half-planes on either side of the cut
    L.ctx.globalAlpha=0.10;
    if(axis===0){
      const cx=P.sx(thr);
      if(mL>=0){ L.ctx.fillStyle=classColor(mL); L.ctx.fillRect(0,0,cx,L.H); }
      if(mR>=0){ L.ctx.fillStyle=classColor(mR); L.ctx.fillRect(cx,0,L.W-cx,L.H); }
    } else {
      const cy=P.sy(thr);
      if(mL>=0){ L.ctx.fillStyle=classColor(mL); L.ctx.fillRect(0,cy,L.W,L.H-cy); } // y<=thr is below in world-coords → larger canvas-y
      if(mR>=0){ L.ctx.fillStyle=classColor(mR); L.ctx.fillRect(0,0,L.W,cy); }
    }
    L.ctx.globalAlpha=1;
    // the split line
    L.ctx.strokeStyle='#7c5cff'; L.ctx.lineWidth=3; L.ctx.setLineDash([]);
    L.ctx.beginPath();
    if(axis===0){ L.ctx.moveTo(P.sx(thr),0); L.ctx.lineTo(P.sx(thr),L.H); }
    else { L.ctx.moveTo(0,P.sy(thr)); L.ctx.lineTo(L.W,P.sy(thr)); }
    L.ctx.stroke();
    // points
    pts.forEach(p=>{ P.dot(p[0],p[1],6,classColor(p[2]));
      L.ctx.strokeStyle='rgba(0,0,0,.35)'; L.ctx.lineWidth=1;
      L.ctx.beginPath(); L.ctx.arc(P.sx(p[0]),P.sy(p[1]),6,0,7); L.ctx.stroke(); });
    const impL=impurity(left), impR=impurity(right);
    const purePure=(left.length>=3&&impL<1e-9)||(right.length>=3&&impR<1e-9);
    const name=metric===0?'Gini':'entropy';
    L.readout.innerHTML='split: '+(axis===0?'x':'y')+' ≤ '+fmt2(thr)+
      '<br>'+name+' — left ('+left.length+'): '+impL.toFixed(3)+'   right ('+right.length+'): '+impR.toFixed(3)+
      '<br>parent '+parent.toFixed(3)+' → <span style="color:#2dd4a0">weighted '+wImp.toFixed(3)+'</span> (lower = purer)';
    m.update({wImp,metric,purePure});
  }
  chips(L.ctrl,'SPLIT AXIS',['x (vertical cut)','y (horizontal cut)'],(i,btn,row)=>{
    axis=i; [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); }).children[0].classList.add('on');
  chips(L.ctrl,'IMPURITY METRIC',['Gini','entropy'],(i,btn,row)=>{
    metric=i; [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); }).children[0].classList.add('on');
  slider(L.ctrl,'threshold',-3,3,0.1,0,v=>v.toFixed(1),v=>{thr=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b style="color:#00d4ff">Blue</b> and <b style="color:#ffc94d">orange</b> are the two classes. Slide the <b style="color:#b9a8ff">purple cut</b> and switch its axis — each region is shaded by its majority class. Chase the lowest <b style="color:#2dd4a0">weighted impurity</b>. Notice one axis-aligned cut can never fully separate a diagonal split.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ---------------------------------------------------------------
   2) ENSEMBLES: BAGGING / RANDOM FORESTS
   --------------------------------------------------------------- */
registerLesson({
  id:'ml-ensemble', world:'ml', order:101, emoji:'🌲', title:'Ensembles: Wisdom of Weak Trees',
  sub:'One deep tree memorizes. A crowd of shallow stumps, each slightly different, votes — and the vote is steadier than any member.',
  learn:`<p>A single deep tree has <strong>low bias but high variance</strong>: retrain it on a slightly different sample and the boundary lurches. <strong>Bagging</strong> (bootstrap aggregating) tames that variance by a crowd:</p>
  <p>• Train many trees, each on a <strong>random resample</strong> of the data (and, for a <strong>random forest</strong>, each split only allowed to consider a random subset of features)<br>
  • To predict, take the <strong>majority vote</strong> across all trees</p>
  <div class="formula">$$\\text{forest}(x) = \\text{majority vote of } \\text{tree}_1(x), \\text{tree}_2(x), \\ldots$$</div>
  <p>Why does averaging help? Each weak tree makes different, largely <em>independent</em> mistakes. Independent errors partly cancel when you vote, so the ensemble's variance shrinks roughly like <code>1/N</code> for N truly independent learners — while the bias stays about the same. The forcing of feature-subsets is what keeps the trees from all making the <em>same</em> mistake (decorrelation).</p>
  <p>The punchline you will build in the lab: a forest of shallow <strong>stumps</strong> (depth-1 trees) can trace a smooth boundary that no single stump could, and it does <em>not</em> overfit the way one very deep tree does.</p>`,
  ml:`This is one of the most reliable tricks in all of ML. <b>Random forests</b> are a strong, low-tuning baseline on tabular data. The bias–variance view generalizes far beyond trees: <b>model averaging</b>, <b>dropout</b> (an implicit ensemble of sub-networks), and <b>deep-learning ensembles</b> for calibrated uncertainty all cash in the same "independent errors cancel" principle. Boosting is the cousin that instead grows trees <em>sequentially</em>, each fixing the last one's mistakes.`,
  deeper:[
   {title:'😵 Stuck? The estimating-a-jar view', body:'Ask one person to guess the number of jellybeans in a jar and they are wildly off. Ask 500 independent people and average — the crowd is startlingly accurate, because individual over- and under-guesses cancel. A random forest is that crowd, each "person" a quick, imperfect tree.'},
   {title:'🚀 Go deeper: bagging vs boosting', body:'<b>Bagging</b> (random forests) trains trees <em>in parallel</em> on resamples and averages — it mainly cuts <em>variance</em>, so it pairs with deeper, higher-variance base trees. <b>Boosting</b> (AdaBoost, gradient boosting / XGBoost) trains trees <em>sequentially</em>, each new one focused on the examples the ensemble still gets wrong — it mainly cuts <em>bias</em>, so it pairs with shallow stumps and can overfit if run too long. Same "ensemble of trees" family, opposite failure modes.'},
   {title:'🚀 Go deeper: why decorrelation matters', body:'Averaging N estimators drops variance by 1/N only if their errors are <em>independent</em>. Trees trained on similar data are correlated, so the real gain is smaller. Random forests inject two sources of randomness — bootstrap samples AND random feature subsets at each split — precisely to <em>decorrelate</em> the trees and recover more of that 1/N. It is the difference between 500 clones and 500 genuinely different opinions.'}],
  interactive:'mlensemble',
  quiz:[
   {q:'Bagging reduces a model\'s error mainly by lowering its…', opts:['Variance','Bias','Number of features','Training-set size'], a:0,
    tag:'bias-variance', focus:'Averaging many high-variance learners cancels their independent errors → lower VARIANCE, bias roughly unchanged. That is the whole point of bagging.',
    why:'Independent errors partly cancel under a vote, shrinking variance while leaving bias about the same — so bagging pairs best with high-variance base learners like deep trees.',
    wrong:{1:'Averaging leaves bias roughly unchanged — if each tree is biased the same way, the vote is too. Boosting is the bias-reducer.',2:'Bagging changes how models are trained and combined, not how many features exist.',3:'Each bootstrap sample is about the same size as the original; bagging does not add data.'}},
   {q:'A random forest makes each tree consider only a random subset of features at each split in order to…', opts:['Decorrelate the trees so their errors cancel better','Make training slower on purpose','Guarantee every tree is identical','Remove the need for data'], a:0,
    tag:'decorrelation', focus:'Averaging cuts variance by ~1/N only when errors are INDEPENDENT. Feature subsets make trees differ, so their mistakes are less correlated.',
    why:'If all trees saw all features they would often split the same way and make the same mistakes; restricting features forces variety, so their errors are more independent and cancel more under the vote.',
    wrong:{1:'It usually speeds each split up (fewer features to scan); the goal is decorrelation, not slowness.',2:'Identical trees would defeat the ensemble entirely — you want them DIFFERENT.',3:'Forests very much need data; feature subsetting is about variety among trees.'}},
   {q:'One depth-1 "stump" is a weak classifier. A forest of 200 different stumps voting is often strong because…', opts:['Their independent errors partly cancel in the vote','Each stump is secretly deep','Voting removes all bias','200 stumps equal one perfect tree'], a:0,
    tag:'weak learners', focus:'A crowd of weak, decorrelated learners can be strong: the vote averages away independent error even when no single member is good.',
    why:'No stump is good alone, but if they err in different places, the majority vote lands on the right class more often than any single stump — errors cancel.',
    wrong:{1:'Stumps stay depth-1; the strength comes from the crowd, not from any one becoming deep.',2:'Voting cuts variance, not bias — a systematically biased crowd stays biased.',3:'It is not equivalent to one perfect tree; it is a different, more robust object built from weak parts.'}},
   {q:'Compared with one very deep tree, a bagged forest of shallow trees usually…', opts:['Generalizes better (less overfitting) at similar training accuracy','Always has higher training accuracy','Overfits more','Ignores the training data'], a:0,
    tag:'forest vs deep tree', focus:'A single deep tree = low bias, high variance (overfits). Averaging shallow trees keeps decent fit but far lower variance → better test error.',
    why:'The deep tree memorizes noise (high variance); the forest averages that variance away, so test error drops even though training accuracy is comparable.',
    wrong:{1:'A single deep tree usually has the HIGHER training accuracy (it can memorize); the forest wins on TEST data.',2:'The forest overfits LESS — that is its whole advantage over the deep tree.',3:'It uses the data heavily — many resamples of it; it just does not memorize any one sample.'}},
  ],
});
INTERACTIVES.mlensemble = function(stage, api){
  const L=makeLab(stage);
  // DIAGONAL boundary (class 1 when x+y>0). One axis-aligned stump can only
  // approximate a diagonal with a single step, so it caps out around ~75%.
  // A forest of many stumps — some cutting x, some cutting y, each on a
  // resample — votes into a staircase that hugs the diagonal, and (the real
  // point) its accuracy is far STEADIER than any single stump's.
  const N=120, data=[];
  (function build(){
    for(let i=0;i<N;i++){
      const x=(Math.random()*6-3), y=(Math.random()*6-3);
      let lab = (x+y>0)?1:0;
      if(Math.random()<0.03) lab=1-lab; // a little label noise
      data.push([x,y,lab]);
    }
  })();
  let nTrees=1, forest=[];
  function trainStump(sample){
    // a stump: pick the axis+threshold (from a small random menu) minimizing weighted Gini
    let best=null;
    const axes=[0,1];
    for(const ax of axes){
      for(let t=-2.6;t<=2.6;t+=0.4){
        const jitter=t+(Math.random()-0.5)*0.3;
        const left=sample.filter(p=>p[ax]<=jitter), right=sample.filter(p=>p[ax]>jitter);
        const gi=g=>{ if(!g.length) return 0; const p1=g.filter(p=>p[2]===1).length/g.length; return 1-(p1*p1+(1-p1)*(1-p1)); };
        const w=(left.length*gi(left)+right.length*gi(right))/(sample.length||1);
        const maj=g=>{ if(!g.length) return 0; return g.filter(p=>p[2]===1).length>g.length/2?1:0; };
        if(!best||w<best.w) best={ax,thr:jitter,w,lMaj:maj(left),rMaj:maj(right)};
      }
    }
    return best;
  }
  function bootstrap(){ const s=[]; for(let i=0;i<data.length;i++) s.push(data[Math.floor(Math.random()*data.length)]); return s; }
  function grow(){
    forest=[]; for(let i=0;i<nTrees;i++) forest.push(trainStump(bootstrap()));
  }
  function predictOne(tree,x,y){ const v=(tree.ax===0?x:y); return v<=tree.thr?tree.lMaj:tree.rMaj; }
  function vote(x,y){ let s=0; for(const t of forest) s+=predictOne(t,x,y); return s/(forest.length||1); }
  function accuracy(){
    let correct=0; for(const [x,y,lab] of data){ const p=vote(x,y)>=0.5?1:0; if(p===lab) correct++; }
    return correct/data.length;
  }
  grow();
  const m=api.missions([
    {text:'Grow the forest to <b>≥ 15 trees</b> and reach <b>accuracy ≥ 0.75</b>', xp:25, check:s=>s.nTrees>=15&&s.acc>=0.75},
    {text:'Compare: at <b>1 tree</b> note the jagged boundary, then push to <b>≥ 40 trees</b> and reach accuracy ≥ 0.76', xp:25, check:s=>s.nTrees>=40&&s.acc>=0.76},
    {text:'Re-roll the forest (↻) and confirm accuracy stays <b>≥ 0.75</b> with ≥ 25 trees — the vote is stable', xp:20, check:s=>s.nTrees>=25&&s.acc>=0.75&&s.rerolled},
  ]);
  const P=plane(L.ctx,L.W,L.H,58);
  let rerolled=false;
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    // decision-region heat: sample a coarse grid, color by vote fraction
    const step=14;
    for(let px=0;px<L.W;px+=step){
      for(let py=0;py<L.H;py+=step){
        const wx=P.wx(px+step/2), wy=P.wy(py+step/2);
        const v=vote(wx,wy); // 0..1 fraction voting class 1
        // blend blue(0) → orange(1)
        const r=Math.round(0x00+(0xff-0x00)*v), g=Math.round(0xd4+(0xc9-0xd4)*v), b=Math.round(0xff+(0x4d-0xff)*v);
        L.ctx.fillStyle='rgba('+r+','+g+','+b+',0.18)';
        L.ctx.fillRect(px,py,step,step);
      }
    }
    P.grid();
    data.forEach(p=>{ P.dot(p[0],p[1],5.5,p[2]===1?'#ffc94d':'#00d4ff');
      L.ctx.strokeStyle='rgba(0,0,0,.35)'; L.ctx.lineWidth=1;
      L.ctx.beginPath(); L.ctx.arc(P.sx(p[0]),P.sy(p[1]),5.5,0,7); L.ctx.stroke(); });
    const acc=accuracy();
    L.readout.innerHTML='trees in forest: <b>'+nTrees+'</b><br>majority-vote accuracy = <span style="color:#2dd4a0">'+(acc*100).toFixed(1)+'%</span><br>(shading = fraction of trees voting orange)';
    m.update({nTrees,acc,rerolled});
  }
  slider(L.ctrl,'number of stumps in the forest',1,80,1,1,v=>''+v,v=>{nTrees=Math.round(v);grow();draw();});
  const bar=document.createElement('div'); bar.className='ctrl';
  bar.innerHTML='<div class="chipbtns"><button class="chip" id="reroll">↻ Re-roll forest</button></div>';
  L.ctrl.appendChild(bar);
  bar.querySelector('#reroll').onclick=()=>{ rerolled=true; grow(); draw(); };
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Each tree is a single <b>stump</b> (one cut). Alone it is nearly useless. Slide up the count and watch the shaded <b>vote boundary</b> smooth out and accuracy climb — the crowd beats the individual. Re-roll to see the vote stays steady while any one stump is random.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ---------------------------------------------------------------
   3) EVALUATION METHODOLOGY
   --------------------------------------------------------------- */
registerLesson({
  id:'ml-eval', world:'ml', order:102, emoji:'⚖️', title:'Evaluation: Beyond Accuracy',
  sub:'Move one threshold and precision, recall, and the ROC point all move together. Accuracy alone will lie to you on imbalanced data.',
  learn:`<p>A classifier outputs a <strong>score</strong>; you turn it into a yes/no by picking a <strong>threshold</strong>. Every threshold produces four counts:</p>
  <p>• <strong>TP</strong> true positives, <strong>FP</strong> false positives, <strong>TN</strong> true negatives, <strong>FN</strong> false negatives</p>
  <div class="formula">$$\\text{precision} = \\dfrac{TP}{TP+FP} \\qquad \\text{recall} = TPR = \\dfrac{TP}{TP+FN} \\qquad FPR = \\dfrac{FP}{FP+TN}$$</div>
  <p>Read them out loud: <strong>precision</strong> = "of the things I flagged, how many were right?"; <strong>recall</strong> = "of the things I should have caught, how many did I?". Raising the threshold makes you pickier — precision up, recall down. There is a <strong>tradeoff</strong>; you cannot maximize both at once.</p>
  <p>Sweep the threshold and plot TPR against FPR: you trace the <strong>ROC curve</strong>. A single operating point is one dot on it. The area under that curve (<strong>AUC</strong>) summarizes ranking quality across all thresholds — 0.5 is coin-flip, 1.0 is perfect.</p>
  <p><strong>Why accuracy misleads:</strong> if 99% of emails are legit, a model that says "legit" every time scores <strong>99% accuracy</strong> while catching <em>zero</em> spam. On imbalanced data, accuracy rewards ignoring the rare class. Precision/recall (or AUC, or F1) expose that failure; accuracy hides it.</p>`,
  ml:`Every model card, leaderboard, and A/B test lives on these numbers. <b>Imbalanced problems are the norm</b> in the wild — fraud, disease, spam, safety classifiers — so accuracy is often the <em>worst</em> single metric to optimize. Which metric you pick <em>is</em> a product decision: a cancer screen wants high <b>recall</b> (miss nothing, tolerate false alarms); a spam filter wants high <b>precision</b> (never trash a real email). <b>F1</b> balances the two; <b>AUC</b> / <b>PR-AUC</b> summarize the whole threshold sweep; the <b>confusion matrix</b> is the ground truth behind all of them.`,
  deeper:[
   {title:'😵 Stuck? Precision vs recall in one breath', body:'Precision = "when I raised the alarm, was I right?" (punishes false alarms). Recall = "of everything I should have caught, how much did I catch?" (punishes misses). Fire alarm: high recall, low precision (goes off at toast, but never misses a real fire). Picky doctor: high precision, low recall (only diagnoses when certain, so misses some cases).'},
   {title:'🚀 Go deeper: the accuracy trap, with numbers', body:'99 negatives, 1 positive. "Always predict negative" → 99/100 = 99% accuracy, but recall = 0/1 = 0% — it never catches the one case that matters. This is why fraud/disease/spam teams report precision, recall, and AUC, almost never bare accuracy. On balanced data accuracy is fine; the moment classes are skewed, it flatters useless models.'},
   {title:'🚀 Go deeper: ROC vs PR curves, and F1', body:'The <b>ROC curve</b> plots TPR vs FPR; its area (AUC) is the probability a random positive outranks a random negative. But ROC can look rosy under heavy imbalance because FPR has a huge negative denominator — the <b>precision–recall curve</b> is the more honest picture when positives are rare. <b>F1 = 2·(precision·recall)/(precision+recall)</b> is their harmonic mean, a single number that punishes ignoring either. Pick the summary that matches which error actually costs you.'}],
  interactive:'mleval',
  quiz:[
   {q:'99% of emails are legit. A model labels EVERY email "legit". Its accuracy and recall-for-spam are…', opts:['99% accuracy, 0% spam recall','99% accuracy, 99% spam recall','50% accuracy, 50% recall','0% accuracy, 100% recall'], a:0,
    tag:'accuracy trap', focus:'On imbalanced data, "always predict the majority" scores high accuracy but 0 recall on the rare class. Accuracy hides the failure that matters.',
    why:'It is right on all 99% legit mails (99% accuracy) but never flags a single spam, so it catches 0 of the spam → 0% recall on the class you actually care about.',
    wrong:{1:'It catches ZERO spam, so spam recall is 0%, not 99% — recall counts caught positives, and it caught none.',2:'Accuracy is 99% (it is right on the 99% majority), not 50%.',3:'Accuracy is high precisely because the majority is legit; it is not 0%.'}},
   {q:'You RAISE the decision threshold (require a higher score to say "positive"). Typically…', opts:['Precision rises, recall falls','Both rise','Both fall','Precision falls, recall rises'], a:0,
    tag:'threshold tradeoff', focus:'Higher threshold = pickier = fewer positives flagged. Of those flagged, more are correct (precision up) but you miss more real ones (recall down).',
    why:'Being pickier means the positives you do flag are more often right (precision up), but you let more true positives slip through (recall down) — the core tradeoff.',
    wrong:{1:'They generally move in OPPOSITE directions; you cannot push both up by moving one threshold.',2:'Raising the threshold does not lower precision — being stricter tends to raise it.',3:'That is the LOWER-threshold direction: looser flagging raises recall and drops precision.'}},
   {q:'On the ROC curve, the axes are…', opts:['True positive rate (recall) vs false positive rate','Precision vs recall','Accuracy vs threshold','TP count vs FP count'], a:0,
    tag:'ROC axes', focus:'ROC = TPR (y) vs FPR (x), swept over all thresholds. AUC (area under it) summarizes ranking; 0.5 is chance, 1.0 perfect.',
    why:'ROC plots TPR against FPR as the threshold sweeps; each threshold is one point, and the area under the whole curve (AUC) scores ranking quality.',
    wrong:{1:'That describes the precision–recall curve, a different (and under imbalance, often more honest) plot — not ROC.',2:'ROC is not accuracy vs threshold; it is a rate-vs-rate curve.',3:'ROC uses normalized RATES (TPR, FPR), not raw counts, so curves are comparable across datasets.'}},
   {q:'A cancer-screening model should usually be tuned for high…', opts:['Recall — missing a real case is far costlier than a false alarm','Precision — never raise a false alarm','Accuracy — the single best number','Threshold — set it as high as possible'], a:0,
    tag:'metric choice', focus:'The costly error picks the metric. A missed cancer (false negative) is catastrophic → maximize recall, tolerate more false alarms (lower precision).',
    why:'A false negative (missed cancer) is far worse than a false positive (a scary but survivable extra test), so you want to catch nearly all true cases → high recall.',
    wrong:{1:'Optimizing precision minimizes false alarms but tolerates MISSES — exactly the deadly error here.',2:'Accuracy is misleading on rare diseases; a "no cancer" model can score high while catching nothing.',3:'A very high threshold maximizes precision and CRATERS recall — the opposite of what screening needs.'}},
  ],
});
INTERACTIVES.mleval = function(stage, api){
  const L=makeLab(stage);
  // two score distributions: negatives (low scores) and positives (high scores),
  // heavily IMBALANCED (few positives) so accuracy misleads. Fixed for stability.
  const neg=[], pos=[];
  (function build(){
    // deterministic-ish pseudo samples via a simple LCG so the picture is stable
    let seed=12345; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
    const gauss=(mu,sd)=>{ let u=0,v=0; while(u===0)u=rnd(); while(v===0)v=rnd();
      return mu+sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
    for(let i=0;i<180;i++) neg.push(Math.max(0,Math.min(10,gauss(3.2,1.6))));  // many negatives, low-ish
    for(let i=0;i<20;i++)  pos.push(Math.max(0,Math.min(10,gauss(6.6,1.5))));  // few positives, high-ish
  })();
  const P=neg.length+pos.length;
  let thr=5.0;
  function counts(t){
    const TP=pos.filter(s=>s>=t).length, FN=pos.length-TP;
    const FP=neg.filter(s=>s>=t).length, TN=neg.length-FP;
    return {TP,FN,FP,TN};
  }
  function metrics(t){
    const {TP,FN,FP,TN}=counts(t);
    const precision=TP+FP>0?TP/(TP+FP):0;
    const recall=TP+FN>0?TP/(TP+FN):0;   // = TPR
    const fpr=FP+TN>0?FP/(FP+TN):0;
    const acc=(TP+TN)/P;
    const f1=(precision+recall>0)?2*precision*recall/(precision+recall):0;
    return {TP,FN,FP,TN,precision,recall,fpr,acc,f1};
  }
  const m=api.missions([
    {text:'Expose the <b>accuracy trap</b>: set the threshold so <b>accuracy ≥ 0.90</b> but <b>recall ≤ 0.30</b>', xp:25, check:s=>s.acc>=0.90&&s.recall<=0.30},
    {text:'Chase <b>high recall</b> (≥ 0.90) like a cancer screen — accept the precision hit', xp:20, check:s=>s.recall>=0.90},
    {text:'Find a <b>balanced</b> operating point: precision ≥ 0.55 AND recall ≥ 0.55 (F1 ≥ 0.55)', xp:25, check:s=>s.precision>=0.55&&s.recall>=0.55},
  ]);
  // layout: left = score histogram + threshold; right = ROC curve with moving point
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    const M=metrics(thr);
    // ---- left panel: histogram of scores 0..10 ----
    const padL=40, plotW=L.W*0.56-padL, plotH=L.H-70, base=L.H-40;
    const bins=20, binW=plotW/bins;
    const histN=new Array(bins).fill(0), histP=new Array(bins).fill(0);
    neg.forEach(s=>{ histN[Math.min(bins-1,Math.floor(s/10*bins))]++; });
    pos.forEach(s=>{ histP[Math.min(bins-1,Math.floor(s/10*bins))]++; });
    const maxBin=Math.max(1,...histN,...histP);
    for(let b=0;b<bins;b++){
      const x=padL+b*binW;
      const hn=histN[b]/maxBin*plotH, hp=histP[b]/maxBin*plotH;
      L.ctx.fillStyle='rgba(0,212,255,.55)'; L.ctx.fillRect(x+1,base-hn,binW-2,hn);
      L.ctx.fillStyle='rgba(255,201,77,.7)'; L.ctx.fillRect(x+1,base-hp,binW-2,hp);
    }
    // axis
    L.ctx.strokeStyle='rgba(255,255,255,.3)'; L.ctx.lineWidth=1;
    L.ctx.beginPath(); L.ctx.moveTo(padL,base); L.ctx.lineTo(padL+plotW,base); L.ctx.stroke();
    // threshold line
    const tx=padL+(thr/10)*plotW;
    L.ctx.strokeStyle='#7c5cff'; L.ctx.lineWidth=3;
    L.ctx.beginPath(); L.ctx.moveTo(tx,base-plotH-6); L.ctx.lineTo(tx,base+6); L.ctx.stroke();
    L.ctx.fillStyle='#b9a8ff'; L.ctx.font='700 12px '+getComputedStyle(document.body).fontFamily;
    L.ctx.fillText('threshold', tx-28, base-plotH-12);
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='11px '+getComputedStyle(document.body).fontFamily;
    L.ctx.fillText('score →', padL+plotW-46, base+22);
    L.ctx.fillStyle='rgba(0,212,255,.9)'; L.ctx.fillText('■ negatives', padL, 18);
    L.ctx.fillStyle='rgba(255,201,77,.95)'; L.ctx.fillText('■ positives', padL+92, 18);
    // ---- right panel: ROC curve ----
    const rx0=L.W*0.62, ry0=40, rw=L.W-rx0-30, rh=L.H-90;
    // frame + diagonal
    L.ctx.strokeStyle='rgba(255,255,255,.25)'; L.ctx.lineWidth=1;
    L.ctx.strokeRect(rx0,ry0,rw,rh);
    L.ctx.setLineDash([5,5]); L.ctx.strokeStyle='rgba(255,255,255,.2)';
    L.ctx.beginPath(); L.ctx.moveTo(rx0,ry0+rh); L.ctx.lineTo(rx0+rw,ry0); L.ctx.stroke();
    L.ctx.setLineDash([]);
    // trace ROC by sweeping threshold high→low
    L.ctx.strokeStyle='#2dd4a0'; L.ctx.lineWidth=2.5; L.ctx.beginPath();
    let started=false, auc=0, prevFpr=0, prevTpr=0;
    for(let t=10.2;t>=-0.2;t-=0.1){
      const mm=metrics(t);
      const gx=rx0+mm.fpr*rw, gy=ry0+rh-mm.recall*rh;
      if(!started){ L.ctx.moveTo(gx,gy); started=true; }
      else { L.ctx.lineTo(gx,gy); auc+=(mm.fpr-prevFpr)*(mm.recall+prevTpr)/2; }
      prevFpr=mm.fpr; prevTpr=mm.recall;
    }
    L.ctx.stroke();
    // current operating point
    const opx=rx0+M.fpr*rw, opy=ry0+rh-M.recall*rh;
    L.ctx.fillStyle='#ff5c7a'; L.ctx.beginPath(); L.ctx.arc(opx,opy,7,0,7); L.ctx.fill();
    L.ctx.fillStyle='#e8ecff'; L.ctx.font='700 12px '+getComputedStyle(document.body).fontFamily;
    L.ctx.fillText('ROC (AUC '+auc.toFixed(2)+')', rx0+6, ry0-8);
    L.ctx.fillStyle='#8b93b8'; L.ctx.font='11px '+getComputedStyle(document.body).fontFamily;
    L.ctx.fillText('FPR →', rx0+rw-42, ry0+rh+18);
    L.ctx.save(); L.ctx.translate(rx0-10, ry0+rh/2+18); L.ctx.rotate(-Math.PI/2);
    L.ctx.fillText('TPR (recall)', 0, 0); L.ctx.restore();
    L.readout.innerHTML='threshold = '+thr.toFixed(1)+
      '<br>TP '+M.TP+'  FP '+M.FP+'  TN '+M.TN+'  FN '+M.FN+
      '<br>precision = <b>'+M.precision.toFixed(2)+'</b>   recall/TPR = <b>'+M.recall.toFixed(2)+'</b>   FPR = '+M.fpr.toFixed(2)+
      '<br><span style="color:#ff5c7a">accuracy = '+(M.acc*100).toFixed(1)+'%</span>   F1 = '+M.f1.toFixed(2);
    m.update({acc:M.acc,recall:M.recall,precision:M.precision,f1:M.f1});
  }
  slider(L.ctrl,'decision threshold (score cutoff)',0,10,0.1,5,v=>v.toFixed(1),v=>{thr=v;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Left: the score histogram — <b style="color:#00d4ff">negatives</b> (180) vs a rare <b style="color:#ffc94d">positives</b> class (20). Slide the <b style="color:#b9a8ff">threshold</b>: everything to its right is predicted positive. Right: the <b style="color:#2dd4a0">ROC curve</b>, with the <b style="color:#ff5c7a">red point</b> marking your current operating point. Watch accuracy stay high even when recall is near zero — that is the imbalance trap.</div>';
  L.ctrl.appendChild(note);
  draw();
};
