/* ================================================================
   WORLD 1 DEPTH — rank & the four subspaces → SVD → matrix calculus.
   Slots between la-eigen (order 6) and la-boss (order 7) via explicit
   `order` floats. Same registries, same schema as the other worlds
   (see index.js). This trio unlocks reading real backprop derivations
   and LoRA papers: rank says what a matrix can express, SVD says how
   to approximate it cheaply, matrix calculus says how to update it.
   ================================================================ */
import { LESSONS, INTERACTIVES, WRONG_WHY, registerLesson } from './registry.js';
import { makeLab, slider, chips, plane, clearBg, fmt2 } from '../engine.js';

/* ================== 1 · RANK & THE FOUR SUBSPACES ================== */

registerLesson({
  id:'la-rank', world:'la', order:6.2, emoji:'🥞', title:'Rank & the Four Subspaces',
  sub:'What a matrix can express — and what it crushes to zero forever.',
  learn:`<p>Apply a matrix A to <em>every</em> vector in the plane and look at where the outputs land. That set is the <strong>column space</strong> — all possible vectors Ax, which is exactly all combinations of A's columns. Its dimension is the <strong>rank</strong>.</p>
  <p>A 2×2 matrix has rank 2 (outputs fill the plane), rank 1 (outputs collapse onto a line), or rank 0 (everything maps to the origin). Collapse is the interesting case: if the columns are parallel, no combination of them ever leaves their shared line.</p>
  <p>Whatever gets crushed lives in the <strong>null space</strong>: the vectors with Ax = 0. The two trade off exactly:</p>
  <div class="formula">rank(A) + dim(null space) = n &nbsp;&nbsp;(rank–nullity)</div>
  <p>Every dimension of input either survives into the column space or dies in the null space. Two more subspaces belong to Aᵀ — the <strong>row space</strong> (what the input actually gets measured along) and the <strong>left null space</strong> — and together the four describe everything a matrix does.</p>
  <p>Ties to what you know: rank 2 ⇔ det ≠ 0 ⇔ invertible. A rank-deficient matrix <em>destroys information</em> — many inputs share one output, so no inverse can exist.</p>`,
  ml:`Rank is the budget of a linear layer. A 4096→4096 weight matrix <i>could</i> have rank 4096, but trained weights are usually well-approximated by far lower rank — that observation IS <b>LoRA</b>, next lesson. Bottleneck layers (autoencoders) impose low rank on purpose: forcing data through a rank-k pinch point is what makes the network keep only the k most useful directions.`,
  deeper:[
   {title:'😵 Stuck? The shadow view', body:'A rank-1 matrix is a projector-with-extras: like the sun casting the 2D world onto a 1D wall. Every point lands on the wall (column space). All the points that share your shadow differ by something the sun can\'t see — a vector along the light rays (null space). Once shadows are taken, nobody can reconstruct who cast them: information is gone, no inverse exists.'},
   {title:'🚀 Go deeper: the four subspaces', body:'A (m×n) splits both its input and output worlds in two. Input ℝⁿ = <b>row space</b> ⊕ <b>null space</b>: the part of x the matrix measures, and the part it ignores. Output ℝᵐ = <b>column space</b> ⊕ <b>left null space</b>: where outputs can land, and the directions no output ever touches. All four have dimensions set by one number, rank r: r, n−r, r, m−r. Strang calls this the Fundamental Theorem of Linear Algebra.'}],
  interactive:'larank',
  quiz:[
   {q:'The rank of <code>[[2,4],[1,2]]</code> is…', opts:['1 — the columns are parallel','2 — it has 2 columns','0 — it\'s not invertible','4 — count the entries'], a:0,
    tag:'computing rank', focus:'Rank = number of independent columns. Check if one column is a multiple of another.',
    why:'Column 2 = 2 × column 1, so every output Ax sits on the line through [2,1]. One independent direction ⇒ rank 1 (and det = 4−4 = 0 agrees).'},
   {q:'A is 3×3 with rank 2. The dimension of its null space is…', opts:['1','0','2','3'], a:0,
    tag:'rank–nullity', focus:'rank + dim(null) = number of columns. Every input dimension survives or dies.',
    why:'Rank–nullity: 2 + dim(null) = 3, so exactly one direction of input gets crushed to zero.'},
   {q:'An embedding matrix is 50,000 × 512 (vocab × dimension). Its rank is at most…', opts:['512','50,000','50,000 × 512','Unlimited'], a:0,
    tag:'rank bounds', focus:'rank ≤ min(rows, columns) — the smaller dimension is a hard ceiling.',
    why:'Rank can\'t exceed min(m, n) = 512. Token vectors live in 512 dimensions, so 50,000 of them can span at most 512 independent directions — that\'s the whole compression bet of embeddings.'},
   {q:'There is a vector x ≠ 0 with Ax = 0. What does this tell you about A?', opts:['It destroys information and has no inverse','Nothing — that\'s true of every matrix','A must be the zero matrix','A is invertible'], a:0,
    tag:'null space meaning', focus:'A nonzero null space means many inputs share an output — un-invertible by counting.',
    why:'If Ax = 0 with x ≠ 0, then A(v + x) = Av for every v: distinct inputs, identical outputs. No function can undo that. (Only x = 0 maps to 0 under an invertible matrix.)'},
  ],
});
WRONG_WHY['la-rank']=[
 {1:'Having 2 columns puts rank ≤ 2, but parallel columns span only one line — count INDEPENDENT columns.',
  2:'Rank 0 means the zero matrix — this one still maps things to a whole line of outputs.',
  3:'Rank counts independent directions, not entries. A million entries can still all point one way.'},
 {1:'Zero null space would mean rank 3 (full rank). Rank 2 leaves one input dimension unaccounted for — it must die.',
  2:'2 is the rank itself. The null space gets what\'s LEFT: 3 − 2 = 1.',
  3:'dim(null) = 3 would mean everything maps to zero — that\'s rank 0, not rank 2.'},
 {1:'50,000 rows give 50,000 column-ENTRIES, but only 512 columns exist to be independent.',
  2:'That\'s the entry count, not the rank. Rank lives in min(rows, cols).',
  3:'Rank is always finite and ≤ min(m, n) — a hard ceiling baked into the shape.'},
 {1:'Not every matrix: an invertible A sends only x = 0 to 0. A nonzero null vector is special — and disqualifying.',
  2:'A needn\'t be all zero — [[1,2],[0.5,1]] kills the direction [−2,1] while happily moving everything else.',
  3:'Exactly backwards: a nonzero null space is the definitive PROOF of non-invertibility.'}];
INTERACTIVES.larank = function(stage, api){
  const L=makeLab(stage);
  let A=[1,0,0,1];                 // [a b; c d]
  let v={x:1.5,y:1};               // probe vector
  const m=api.missions([
    {text:'Collapse the plane: make a <b>nonzero</b> matrix with <b>rank 1</b> (det = 0)', xp:20, check:s=>s.rank===1},
    {text:'With rank 1, drag the probe into the <b>null space</b>: ‖x‖ ≥ 1 and ‖Ax‖ ≤ 0.1', xp:25, check:s=>s.rank===1&&s.nv>=1&&s.nAv<=.1},
    {text:'Re-inflate: rank 2 with <b>|det| ≥ 2</b> — every output line restored', xp:15, check:s=>s.rank===2&&Math.abs(s.det)>=2},
  ]);
  const P=plane(L.ctx,L.W,L.H,62);
  const sl=[];
  function sing(){ // singular values of 2×2, closed form
    const [a,b,c,d]=A, t=a*a+b*b+c*c+d*d, det=a*d-b*c;
    const disc=Math.sqrt(Math.max(0,t*t-4*det*det));
    return [Math.sqrt((t+disc)/2), Math.sqrt(Math.max(0,(t-disc)/2))];
  }
  function draw(){
    clearBg(L.ctx,L.W,L.H); P.grid();
    const [a,b,c,d]=A, det=a*d-b*c;
    const [s1,s2]=sing();
    const rank=(s1>.045?1:0)+(s2>.045?1:0);
    // image of the unit circle (ellipse / segment / point)
    for(let i=0;i<48;i++){
      const t=i/48*2*Math.PI, ux=Math.cos(t), uy=Math.sin(t);
      P.dot(a*ux+b*uy, c*ux+d*uy, 2.5,'rgba(0,212,255,.5)');
    }
    if(rank===1){
      // column space (gold) — direction of the surviving line
      const col=(Math.hypot(a,c)>.045)?[a,c]:[b,d];
      const cn=Math.hypot(col[0],col[1])||1;
      L.ctx.setLineDash([7,5]); L.ctx.lineWidth=1.5; L.ctx.strokeStyle='rgba(255,201,77,.6)';
      L.ctx.beginPath(); L.ctx.moveTo(P.sx(-6*col[0]/cn),P.sy(-6*col[1]/cn)); L.ctx.lineTo(P.sx(6*col[0]/cn),P.sy(6*col[1]/cn)); L.ctx.stroke();
      // null space (red) — perpendicular to the (parallel) rows
      const row=(Math.hypot(a,b)>.045)?[a,b]:[c,d];
      const nl=[-row[1],row[0]], nn=Math.hypot(nl[0],nl[1])||1;
      L.ctx.strokeStyle='rgba(255,92,122,.6)';
      L.ctx.beginPath(); L.ctx.moveTo(P.sx(-6*nl[0]/nn),P.sy(-6*nl[1]/nn)); L.ctx.lineTo(P.sx(6*nl[0]/nn),P.sy(6*nl[1]/nn)); L.ctx.stroke();
      L.ctx.setLineDash([]);
      L.ctx.font='700 12px '+getComputedStyle(document.body).fontFamily;
      L.ctx.fillStyle='rgba(255,201,77,.85)'; L.ctx.fillText('column space', P.sx(2.1*col[0]/cn)+6, P.sy(2.1*col[1]/cn));
      L.ctx.fillStyle='rgba(255,92,122,.85)'; L.ctx.fillText('null space', P.sx(2.6*nl[0]/nn)+6, P.sy(2.6*nl[1]/nn));
    }
    // columns of A
    P.arrow(0,0,a,c,'rgba(255,201,77,.9)',3,'col₁');
    P.arrow(0,0,b,d,'rgba(255,201,77,.55)',3,'col₂');
    // probe and its image
    const Av={x:a*v.x+b*v.y, y:c*v.x+d*v.y};
    const nv=Math.hypot(v.x,v.y), nAv=Math.hypot(Av.x,Av.y);
    const dead=nAv<=.1&&nv>=.5;
    P.arrow(0,0,v.x,v.y,'#7c5cff',4,'x');
    if(nAv>.06) P.arrow(0,0,Av.x,Av.y,dead?'#2dd4a0':'#00d4ff',3.5,'Ax');
    else P.dot(0,0,6,'#2dd4a0');
    P.dot(v.x,v.y,7,'#b9a8ff');
    L.readout.innerHTML='A = ['+fmt2(a)+' '+fmt2(b)+'; '+fmt2(c)+' '+fmt2(d)+']<br>det = '+fmt2(det)+' &nbsp;·&nbsp; <b>rank = '+rank+'</b><br>σ = '+fmt2(s1)+', '+fmt2(s2)+'<br>‖Ax‖ = '+fmt2(nAv)+(dead?' ✓ CRUSHED':'');
    m.update({rank, det, nv, nAv});
  }
  const labels=['a (col₁ x)','b (col₂ x)','c (col₁ y)','d (col₂ y)'];
  A.forEach((val,i)=>{ sl.push(slider(L.ctrl,labels[i],-2,2,0.05,val,fmt2,x=>{A[i]=x;draw();})); });
  chips(L.ctrl,'PRESETS',['Identity','Shear','Squash [1 2; ½ 1]'],(i)=>{
    A=[[1,0,0,1],[1,1,0,1],[1,2,.5,1]][i].slice();
    A.forEach((x,j)=>sl[j].set(x)); draw(); });
  let drag=false;
  L.canvas.addEventListener('pointerdown',e=>{drag=true;L.canvas.setPointerCapture(e.pointerId);move(e);});
  L.canvas.addEventListener('pointermove',move);
  L.canvas.addEventListener('pointerup',()=>drag=false);
  function move(e){ if(!drag)return; const c=L.toCanvas(e); v.x=P.wx(c.x); v.y=P.wy(c.y); draw(); }
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The cyan dots are the unit circle <i>after</i> A. Watch them flatten from ellipse to line as rank drops. Drag <b style="color:#b9a8ff">x</b> to probe: along the red null line, <b>Ax</b> dies at the origin.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== 2 · SVD & LOW-RANK APPROXIMATION ================== */

registerLesson({
  id:'la-svd', world:'la', order:6.4, emoji:'🗜️', title:'SVD: Compress Anything',
  sub:'Every matrix = rotate · stretch · rotate. Keep the big stretches, drop the rest.',
  learn:`<p>The <strong>singular value decomposition</strong> factors <em>any</em> matrix — square or not, invertible or not — into three clean pieces:</p>
  <div class="formula">A = U Σ Vᵀ &nbsp;&nbsp;(rotate · stretch · rotate)</div>
  <p>Vᵀ rotates the input to align with A's natural axes, Σ is diagonal and just stretches each axis by a <strong>singular value</strong> σ₁ ≥ σ₂ ≥ … ≥ 0, and U rotates the result into place. Rank, made quantitative: the number of nonzero σ's. The σ's you met in the last lesson's readout were exactly these.</p>
  <p>The payoff is <strong>low-rank approximation</strong>. Equivalently, A = σ₁u₁v₁ᵀ + σ₂u₂v₂ᵀ + … — a sum of rank-1 layers, sorted by importance. Truncate after k terms and you get the <em>best possible</em> rank-k approximation of A (Eckart–Young theorem). Each kept term costs one column of U, one of V, and one σ: <strong>k(m+n+1) numbers instead of m·n</strong>.</p>
  <p>An image is just a matrix of brightness values — so in the lab you'll compress one and watch what each rank buys you.</p>`,
  ml:`<b>LoRA</b> fine-tunes a frozen W by learning only a low-rank update — the layer computes W·x + (α/r)·BA·x (B: m×r, A: r×n, r tiny; the α/r scale decouples the learning rate from the chosen rank) — millions of parameters instead of billions, because useful weight <i>changes</i> are empirically low-rank. <b>PCA</b> is the SVD of centered data. Recommender systems factor the user×item matrix into low rank. One decomposition, half the field.`,
  deeper:[
   {title:'😵 Stuck? The layer-cake view', body:'Forget the rotations and think of the sum form: A = σ₁u₁v₁ᵀ + σ₂u₂v₂ᵀ + … Each term is a rank-1 "layer" — the simplest possible matrix, one column pattern times one row pattern — and σ sorts the layers by how much of A they carry. Compression = eating the cake top-down and stopping when you\'re full. The lab\'s bar chart is literally the layer sizes.'},
   {title:'🚀 Go deeper: SVD vs eigendecomposition', body:'Eigenvectors need a square matrix and can be complex or missing; SVD always exists, for any shape, with real nonneg σ\'s. The connection: V holds eigenvectors of AᵀA, U holds eigenvectors of AAᵀ, and σ² are their (shared) eigenvalues. That\'s also how the lab computes it — and why PCA people flip between "eigenvectors of covariance" and "SVD of data" mid-sentence: same thing.'}],
  interactive:'lasvd',
  quiz:[
   {q:'In A = UΣVᵀ, the matrix Σ is…', opts:['Diagonal, holding the sorted nonnegative singular values','A rotation','The inverse of A','The covariance of A'], a:0,
    tag:'svd anatomy', focus:'U and V rotate; Σ alone stretches. All the "size" of A lives in the σ\'s.',
    why:'Σ carries σ₁ ≥ σ₂ ≥ … ≥ 0 on its diagonal — pure axis-aligned stretching, sandwiched between two rotations.'},
   {q:'The best rank-k approximation of A (least total squared error) comes from…', opts:['Keeping the k largest singular values and their vectors','Keeping the k smallest singular values','Zeroing k random entries of A','Keeping the first k rows'], a:0,
    tag:'eckart–young', focus:'Truncated SVD is optimal — no rank-k matrix gets closer to A than the top-k truncation.',
    why:'Eckart–Young: truncating the SVD after the top k terms beats every other rank-k matrix. The σ\'s are an importance ranking, so you keep from the top.'},
   {q:'A 1000×1000 image stored at rank 20 via SVD costs about…', opts:['40k numbers instead of 1M — ~4%','Still 1M numbers','20 numbers','500k numbers — always half'], a:0,
    tag:'storage arithmetic', focus:'Rank-k storage = k(m+n+1). Compare against m·n to get the compression ratio.',
    why:'k(m+n+1) = 20 × 2001 ≈ 40k vs 1,000,000 — you keep 20 column patterns, 20 row patterns, 20 weights.'},
   {q:'LoRA fine-tunes a frozen weight matrix W by…', opts:['Learning a low-rank update ΔW = BA added to W','Retraining all of W with a smaller learning rate','Deleting small entries of W','Computing the exact SVD of W and discarding U'], a:0,
    tag:'lora', focus:'LoRA never touches W — it learns two thin matrices whose product is the update.',
    why:'B (m×k) and A (k×n) with k ≈ 8–64 give a rank-k ΔW with a tiny fraction of the parameters. The bet: the change a task needs is low-rank, even if W isn\'t.'},
  ],
});
WRONG_WHY['la-svd']=[
 {1:'The rotations are U and Vᵀ. Σ is the opposite of a rotation — it changes lengths and nothing else.',
  2:'SVD exists even when A has no inverse (rank-deficient!). Σ⁻¹ would need all σ > 0.',
  3:'Covariance is AᵀA (up to scaling) — related (its eigenvalues are σ²) but not Σ itself.'},
 {1:'The smallest σ\'s carry the least of A — keeping them is keeping the noise and discarding the picture.',
  2:'Zeroing random entries isn\'t even guaranteed to lower the rank — and it ignores the structure entirely.',
  3:'The first k rows can miss everything happening in the other rows. Truncated SVD is provably the best rank-k choice.'},
 {1:'That\'s the point of the factorization — you store the thin factors U(:,1..k), σ\'s, V(:,1..k), not the full product.',
  2:'20 numbers would be just the σ\'s — you also need their 20 + 20 direction vectors to rebuild anything.',
  3:'The ratio depends on k and the shape: k(m+n+1)/mn. Here it\'s ~4%, nowhere near half.'},
 {1:'Retraining all of W is full fine-tuning — exactly the cost LoRA exists to avoid.',
  2:'Deleting small entries is pruning — a different compression, applied to W itself, not a way to learn a task update.',
  3:'LoRA never decomposes W at all. It adds a separately-learned low-rank ΔW alongside the frozen weights.'}];
INTERACTIVES.lasvd = function(stage, api){
  const L=makeLab(stage,{h:530});   // taller: top-left stays clear for the readout overlay
  const N=40;
  const m=api.missions([
    {text:'Squeeze hard: keep <b>k ≤ 4</b> layers while holding <b>≥ 99%</b> of the energy', xp:20, check:s=>s.k<=4&&s.energy>=.99},
    {text:'The engineer\'s spot: <b>error ≤ 5%</b> using <b>less than half</b> the original storage', xp:25, check:s=>s.relErr<=.05&&s.storage<.5*N*N},
    {text:'Crush it to <b>k = 1</b> — see which single pattern the image is mostly made of', xp:15, check:s=>s.k===1},
  ]);
  /* deterministic test image: gradient sky + sun + striped ground + texture */
  const A=[];
  for(let i=0;i<N;i++){ const row=[];
    for(let j=0;j<N;j++){
      let v=0.25+0.5*(i+j)/(2*N);
      const dx=j-26, dy=i-13;
      if(dx*dx+dy*dy<64) v=0.95;
      if(i>28) v=0.15+0.25*((j%10)<5?1:0);
      if(j<4||j>=N-4) v=Math.min(1,v+0.3);
      v+=0.07*Math.sin(i*1.7)*Math.sin(j*2.3)+0.05*Math.sin(i*j*0.37);
      row.push(Math.max(0,Math.min(1,v)));
    }
    A.push(row);
  }
  /* SVD via Jacobi eigendecomposition of AᵀA (runs once, ~ms at 40×40) */
  function jacobiEig(S){
    const n=S.length, a=S.map(r=>r.slice());
    const V=[...Array(n)].map((_,i)=>[...Array(n)].map((_,j)=>i===j?1:0));
    for(let sweep=0;sweep<60;sweep++){
      let off=0;
      for(let p=0;p<n-1;p++) for(let q=p+1;q<n;q++) off+=a[p][q]*a[p][q];
      if(off<1e-18) break;
      for(let p=0;p<n-1;p++) for(let q=p+1;q<n;q++){
        if(Math.abs(a[p][q])<1e-15) continue;
        const th=(a[q][q]-a[p][p])/(2*a[p][q]);
        const t=Math.sign(th||1)/(Math.abs(th)+Math.sqrt(th*th+1));
        const c=1/Math.sqrt(t*t+1), s=t*c;
        for(let k=0;k<n;k++){ const kp=a[k][p],kq=a[k][q]; a[k][p]=c*kp-s*kq; a[k][q]=s*kp+c*kq; }
        for(let k=0;k<n;k++){ const pk=a[p][k],qk=a[q][k]; a[p][k]=c*pk-s*qk; a[q][k]=s*pk+c*qk; }
        for(let k=0;k<n;k++){ const vp=V[k][p],vq=V[k][q]; V[k][p]=c*vp-s*vq; V[k][q]=s*vp+c*vq; }
      }
    }
    return {vals:a.map((r,i)=>r[i]), vecs:V};
  }
  const S=[...Array(N)].map(()=>Array(N).fill(0));
  for(let i=0;i<N;i++) for(let j=0;j<N;j++){
    let s=0; for(let r=0;r<N;r++) s+=A[r][i]*A[r][j]; S[i][j]=s;
  }
  const eig=jacobiEig(S);
  const idx=eig.vals.map((v,i)=>[v,i]).sort((a,b)=>b[0]-a[0]).map(x=>x[1]);
  const sig=idx.map(i=>Math.sqrt(Math.max(0,eig.vals[i])));
  const V=idx.map(i=>eig.vecs.map(r=>r[i]));
  const U=sig.map((s,r)=>{ const u=Array(N).fill(0);
    if(s>1e-9) for(let i=0;i<N;i++){ let t=0; for(let c=0;c<N;c++) t+=A[i][c]*V[r][c]; u[i]=t/s; }
    return u; });
  const total2=sig.reduce((s,x)=>s+x*x,0);
  const normA=Math.sqrt(A.flat().reduce((s,x)=>s+x*x,0));
  let k=N, sel=-1;                            // sel ≥ 0: inspect one rank-1 layer alone
  const BAR={x0:40, show:20, bh:80};          // σ bar-chart geometry (shared with click test)
  function drawImg(M,x0,y0,cell){
    for(let i=0;i<N;i++) for(let j=0;j<N;j++){
      const g=Math.round(255*Math.max(0,Math.min(1,M[i][j])));
      L.ctx.fillStyle='rgb('+Math.round(g*.55)+','+Math.round(g*.75)+','+g+')';
      L.ctx.fillRect(x0+j*cell, y0+i*cell, cell, cell);
    }
  }
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    const R=[...Array(N)].map(()=>Array(N).fill(0));
    if(sel>=0){
      // a single layer σᵣuᵣvᵣᵀ — values are signed, so recenter on mid-gray for display
      let amax=1e-9;
      for(let i=0;i<N;i++) for(let j=0;j<N;j++){
        R[i][j]=sig[sel]*U[sel][i]*V[sel][j]; amax=Math.max(amax,Math.abs(R[i][j])); }
      for(let i=0;i<N;i++) for(let j=0;j<N;j++) R[i][j]=.5+R[i][j]/(2*amax);
    } else {
      for(let r=0;r<k;r++){ const s=sig[r]; if(s<1e-9) break;
        for(let i=0;i<N;i++){ const su=s*U[r][i];
          for(let j=0;j<N;j++) R[i][j]+=su*V[r][j]; } }
    }
    let e2=0; for(let i=0;i<N;i++) for(let j=0;j<N;j++){ const d=A[i][j]-R[i][j]; e2+=d*d; }
    const relErr=Math.sqrt(e2)/normA;
    const energy=sig.slice(0,k).reduce((s,x)=>s+x*x,0)/total2;
    const storage=k*(2*N+1);
    const cell=6.5, iy=124;
    drawImg(A,32,iy,cell); drawImg(R,L.W-32-N*cell,iy,cell);
    L.ctx.font='700 13px '+getComputedStyle(document.body).fontFamily;
    L.ctx.fillStyle='#8b93b8';
    L.ctx.fillText('original (rank '+N+')',32,iy+N*cell+18);
    L.ctx.fillStyle=sel>=0?'#ffc94d':'#8b93b8';
    L.ctx.fillText(sel>=0?'layer '+(sel+1)+' alone: σ'+(sel+1)+'·u'+(sel+1)+'v'+(sel+1)+'ᵀ (rank 1)':'rank-'+k+' reconstruction',
      L.W-32-N*cell,iy+N*cell+18);
    // singular value bar chart (first 20) — click a bar to inspect that layer
    const y0=L.H-14, bw=(L.W-80)/BAR.show;
    L.ctx.fillStyle='#8b93b8';
    L.ctx.fillText('singular values σ₁…σ₂₀ (cyan = kept · click a bar to see that layer alone)',BAR.x0,y0-BAR.bh-8);
    const smax=sig[0];
    for(let r=0;r<BAR.show;r++){
      const h=Math.max(2,BAR.bh*sig[r]/smax);
      L.ctx.fillStyle=r===sel?'rgba(255,201,77,.9)':r<k?'rgba(0,212,255,.75)':'rgba(255,255,255,.18)';
      L.ctx.fillRect(BAR.x0+r*bw, y0-h, bw*.72, h);
    }
    L.readout.innerHTML=(sel>=0
      ?'inspecting layer '+(sel+1)+' — σ = '+sig[sel].toFixed(2)+'<br>one column pattern × one row pattern<br>this layer costs '+(2*N+1)+' numbers<br>(click the bar again to go back)'
      :'k = '+k+' of '+N+' layers<br>energy kept = '+(100*energy).toFixed(2)+'%<br>reconstruction error = '+(100*relErr).toFixed(2)+'%<br>storage: '+storage+' vs '+(N*N)+' numbers ('+Math.round(100*storage/(N*N))+'%)');
    if(sel<0) m.update({k, relErr, energy, storage});  // inspect mode shows a layer, not the reconstruction
  }
  L.canvas.addEventListener('pointerdown',e=>{
    const c=L.toCanvas(e), y0=L.H-14, bw=(L.W-80)/BAR.show;
    if(c.y<y0-BAR.bh-4||c.y>y0){ if(sel>=0){sel=-1;draw();} return; }
    const r=Math.floor((c.x-BAR.x0)/bw);
    if(r>=0&&r<BAR.show){ sel=(sel===r?-1:r); draw(); }
  });
  slider(L.ctrl,'k — ranks (layers) kept',1,N,1,N,v=>''+v,v=>{k=v;sel=-1;draw();});
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Slide k down and watch the right image degrade layer by layer. The bars are the σ\'s — <b>click one</b> to see that single rank-1 layer by itself: layer 1 is the broad light/dark structure, the tail layers are texture. The image is mostly its first few layers — exactly why compression (and LoRA) works.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== 3 · MATRIX CALCULUS ================== */

registerLesson({
  id:'la-matcalc', world:'la', order:6.6, emoji:'🧱', title:'Matrix Calculus: Shapes First',
  sub:'∂L/∂W has the same shape as W — get the shapes right and backprop derives itself.',
  learn:`<p>World 2 taught derivatives of scalars. Networks differentiate <em>vectors and matrices</em> — but only one new idea is needed: <strong>derivatives come in shapes</strong>.</p>
  <p>• Scalar L, vector x ∈ ℝⁿ: the gradient <strong>∇ₓL is a vector in ℝⁿ</strong> — one slope per entry, same shape as x.<br>
  • Vector function f: ℝⁿ → ℝᵐ: the <strong>Jacobian ∂f/∂x is m×n</strong> — row i holds output i's slopes along every input.<br>
  • Scalar L, matrix W (m×n): <strong>∂L/∂W is m×n</strong> — same shape as W, one slope per weight. It must be: gradient descent computes W − η·∂L/∂W, which only typechecks if shapes match.</p>
  <p>Now the most important derivative in deep learning. For a linear layer y = Wx with the loss's known gradient δ = ∂L/∂y:</p>
  <div class="formula">∂L/∂W = δ xᵀ &nbsp;&nbsp;(an outer product: cell (i,j) = δᵢ·xⱼ)</div>
  <p>Why: weight W<sub>ij</sub> only touches output i, scaled by input j — so its slope is δᵢxⱼ, by the chain rule you already own. Also: ∂L/∂x = Wᵀδ, which is how the gradient flows <em>backward</em> to the previous layer.</p>`,
  ml:`This formula IS backprop for every linear layer in every network. And look at its form: δxᵀ is an outer product — a <b>rank-1 matrix</b> (last two lessons!). Each training example nudges W by a rank-1 update; a batch sums B of them, so a batch gradient has rank ≤ B. That low-rank structure of updates is precisely the empirical bet LoRA makes.`,
  deeper:[
   {title:'😵 Stuck? The blame view', body:'Read ∂L/∂Wᵢⱼ = δᵢ·xⱼ as assigning blame. How much is weight (i,j) responsible for the loss? Proportional to how wrong output i was (δᵢ) times how active input j was (xⱼ). A weight is only guilty if its output erred AND its input fired. Zero input ⇒ innocent ⇒ zero gradient ⇒ no update. Backprop is a blame-routing algorithm.'},
   {title:'🚀 Go deeper: numerator layout & the chain rule', body:'Papers disagree on whether ∂y/∂x is m×n or n×m (numerator vs denominator layout) — when reading, recover the convention from one known shape. The chain rule becomes matrix multiplication: for x→y→L, ∂L/∂x = (∂y/∂x)ᵀ ∂L/∂y = Wᵀδ. Stack layers and the Wᵀ\'s multiply backward through the network — that chain of transposes IS the "back" in backprop.'}],
  interactive:'lamatcalc',
  quiz:[
   {q:'L is a scalar; W is a 4×3 weight matrix. The shape of ∂L/∂W is…', opts:['4×3 — same shape as W','3×4 — transposed','A single number','4×4'], a:0,
    tag:'gradient shapes', focus:'A scalar\'s gradient always matches the shape of what you differentiate by — the update W − η∂L/∂W must typecheck.',
    why:'One slope per weight, arranged exactly like the weights. That\'s what lets gradient descent subtract it from W elementwise.'},
   {q:'f maps ℝ⁵ → ℝ². The Jacobian ∂f/∂x is…', opts:['2×5 — one row per output, one column per input','5×2','5×5','2×2'], a:0,
    tag:'jacobian shape', focus:'Jacobian = (outputs) × (inputs). Row i is the gradient of output i.',
    why:'Each of the 2 outputs has slopes along each of the 5 inputs: 2 rows, 5 columns.'},
   {q:'y = Wx, and δ = ∂L/∂y is known. Then ∂L/∂W = …', opts:['δxᵀ — the outer product','xδᵀ','Wᵀδ','δᵀx — a scalar'], a:0,
    tag:'the linear-layer gradient', focus:'Cell (i,j) of the gradient is δᵢxⱼ: output-i error times input-j activity.',
    why:'Wᵢⱼ feeds input j into output i, so ∂L/∂Wᵢⱼ = δᵢ·xⱼ — all cells at once is δxᵀ. (Wᵀδ is the OTHER gradient, ∂L/∂x, flowing to the previous layer.)'},
   {q:'For one training example, the gradient δxᵀ of a linear layer has rank…', opts:['1 — it\'s an outer product','Equal to the rank of W','min(m,n)','0'], a:0,
    tag:'rank of the update', focus:'Outer products are the canonical rank-1 matrices — one column pattern × one row pattern.',
    why:'Every column of δxᵀ is a multiple of δ: one independent direction, rank 1. A batch of B examples sums to rank ≤ B — the structural fact behind LoRA.'},
  ],
});
WRONG_WHY['la-matcalc']=[
 {1:'Transposing breaks the update rule: you can\'t subtract a 3×4 from a 4×3. Scalar gradients copy the variable\'s shape.',
  2:'A single number is ∂L/∂(one weight). W holds 12 weights ⇒ 12 slopes, arranged as 4×3.',
  3:'4×4 matches nothing here — there is no 4-by-4 object in y = Wx with W 4×3.'},
 {1:'5×2 is the denominator-layout convention — fine in some books, but then it\'s (inputs)×(outputs). Standard (numerator) layout: outputs index rows.',
  2:'5×5 would mean 5 outputs — f only produces 2.',
  3:'2×2 loses the inputs: each output needs a slope along all 5 of them.'},
 {1:'xδᵀ has shape n×m — it wouldn\'t even add to W. Order matters: outputs (δ) index rows, like in W.',
  2:'Wᵀδ is ∂L/∂x — the gradient that flows backward to the previous layer, not the one that updates W.',
  3:'δᵀx collapses everything to one number — but W needs a slope for each of its m·n entries.'},
 {1:'The gradient\'s rank doesn\'t care about W\'s rank — δxᵀ is built from two vectors, so it\'s rank 1 regardless.',
  2:'min(m,n) is the MAXIMUM possible rank for the shape. An outer product only ever uses one direction of it.',
  3:'Rank 0 means the zero matrix — true only if the error δ or the input x is entirely zero.'}];
INTERACTIVES.lamatcalc = function(stage, api){
  const L=makeLab(stage,{h:490});  // room for m = n = 6 below the readout overlay
  let mode='shapes', n=3, mm=4;
  const x=[1,.5,-.5], d=[.6,-.4,.8];        // GRADIENT mode: x ∈ ℝ³, δ ∈ ℝ³
  const m=api.missions([
    {text:'SHAPES: make the Jacobian <b>tall</b> — more outputs than inputs (m &gt; n)', xp:15, check:s=>s.mode==='shapes'&&s.m>s.n},
    {text:'GRADIENT: silence input 2 (<b>x₂ = 0</b>, some δ ≠ 0) — its whole <b>column</b> of ∂L/∂W goes dark', xp:20, check:s=>s.mode==='grad'&&s.x[1]===0&&Math.max(...s.d.map(Math.abs))>=.3&&(s.x[0]!==0||s.x[2]!==0)},
    {text:'GRADIENT: perfect prediction — <b>all δ = 0</b>. No error, no gradient, no learning', xp:25, check:s=>s.mode==='grad'&&s.d.every(v=>v===0)},
  ]);
  const F='700 13px '+getComputedStyle(document.body).fontFamily;
  function cellGrid(x0,y0,rows,cols,cs,fill,stroke){
    for(let i=0;i<rows;i++) for(let j=0;j<cols;j++){
      L.ctx.fillStyle=typeof fill==='function'?fill(i,j):fill;
      L.ctx.fillRect(x0+j*cs,y0+i*cs,cs-2,cs-2);
    }
    if(stroke){ L.ctx.strokeStyle=stroke; L.ctx.lineWidth=1.5;
      L.ctx.strokeRect(x0-3,y0-3,cols*cs+4,rows*cs+4); }
  }
  function label(t,x0,y0,color){ L.ctx.font=F; L.ctx.fillStyle=color||'#8b93b8'; L.ctx.fillText(t,x0,y0); }
  function draw(){
    clearBg(L.ctx,L.W,L.H);
    if(mode==='shapes'){
      const cs=20, top=142;   // content starts below the readout overlay
      // forward pass: y = W x
      label('forward:  y  =  W  ·  x',40,top-14,'#cdd4f0');
      cellGrid(60,top,mm,1,cs,'rgba(45,212,160,.45)','rgba(45,212,160,.8)');
      label('y  ('+mm+'×1)',40,top+mm*cs+24,'#2dd4a0');
      label('=',140,top+mm*cs/2+5,'#cdd4f0');
      cellGrid(180,top,mm,n,cs,'rgba(0,212,255,.4)','rgba(0,212,255,.8)');
      label('W  ('+mm+'×'+n+')',180,top+mm*cs+24,'#00d4ff');
      label('·',192+n*cs+10,top+mm*cs/2+5,'#cdd4f0');
      cellGrid(226+n*cs,top,n,1,cs,'rgba(124,92,255,.5)','rgba(124,92,255,.9)');
      label('x  ('+n+'×1)',206+n*cs,top+n*cs+24,'#b9a8ff');
      // derivative shapes
      const ty=top+Math.max(mm,n)*cs+62;
      label('∂y/∂x = W itself — the Jacobian  ('+mm+'×'+n+')',40,ty-12,'#ffc94d');
      cellGrid(60,ty,mm,n,cs,'rgba(255,201,77,.3)','rgba(255,201,77,.8)');
      label('∂L/∂W — same shape as W  ('+mm+'×'+n+')',300,ty-12,'#ff5c7a');
      cellGrid(320,ty,mm,n,cs,'rgba(255,92,122,.3)','rgba(255,92,122,.8)');
      L.readout.innerHTML='x ∈ ℝ'+sup(n)+' → y ∈ ℝ'+sup(mm)+'<br>Jacobian ∂y/∂x: '+mm+'×'+n+(mm>n?' (tall)':mm<n?' (wide)':' (square)')+'<br>∂L/∂W: '+mm+'×'+n+' — always W\'s shape';
    } else {
      const cs=64, gx=220, gy=150;   // below/right of the readout overlay
      // x row across the top
      x.forEach((v,j)=>{ label('x'+subn(j+1)+' = '+fmt2(v), gx+j*cs+4, gy-18, '#b9a8ff'); });
      // δ column on the left
      d.forEach((v,i)=>{ label('δ'+subn(i+1)+' = '+fmt2(v), gx-86, gy+i*cs+cs/2+4, '#2dd4a0'); });
      cellGrid(gx,gy,3,3,cs,(i,j)=>{
        const v=d[i]*x[j], a=Math.min(1,Math.abs(v));
        return v>=0?'rgba(0,212,255,'+(.08+.8*a)+')':'rgba(255,92,122,'+(.08+.8*a)+')';
      },'rgba(255,255,255,.25)');
      L.ctx.font=F;
      for(let i=0;i<3;i++) for(let j=0;j<3;j++){
        const v=d[i]*x[j];
        L.ctx.fillStyle=Math.abs(v)>.45?'#11152a':'#cdd4f0';
        L.ctx.textAlign='center';
        L.ctx.fillText(fmt2(v), gx+j*cs+cs/2-1, gy+i*cs+cs/2+5);
      }
      L.ctx.textAlign='left';
      const allz=d.every(v=>v===0);
      L.readout.innerHTML='∂L/∂Wᵢⱼ = δᵢ·xⱼ<br>'+(allz?'δ = 0 ⇒ gradient = 0 — converged ✓':'rank(δxᵀ) = '+((d.some(v=>v!==0)&&x.some(v=>v!==0))?1:0))+'<br>columns follow x, rows follow δ';
    }
    m.update({mode, m:mm, n, x:x.slice(), d:d.slice()});
  }
  const sup=k=>'<sup>'+k+'</sup>', subn=k=>['₁','₂','₃'][k-1];
  chips(L.ctrl,'MODE',['Shapes','Gradient δxᵀ'],(i,btn,row)=>{
    mode=i?'grad':'shapes';
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); });
  slider(L.ctrl,'n — inputs (Shapes mode)',1,6,1,3,v=>''+v,v=>{n=v;draw();});
  slider(L.ctrl,'m — outputs (Shapes mode)',1,6,1,4,v=>''+v,v=>{mm=v;draw();});
  ['x₁','x₂','x₃'].forEach((t,j)=>slider(L.ctrl,t+' — input (Gradient mode)',-1,1,0.1,x[j],fmt2,v=>{x[j]=Math.abs(v)<1e-9?0:v;draw();}));
  ['δ₁','δ₂','δ₃'].forEach((t,i)=>slider(L.ctrl,t+' — output error (Gradient mode)',-1,1,0.1,d[i],fmt2,v=>{d[i]=Math.abs(v)<1e-9?0:v;draw();}));
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Shapes mode: resize the layer and watch every derivative\'s shape follow. Gradient mode: each cell of ∂L/∂W is δᵢ·xⱼ — kill an input and its column dies; kill the error and everything does.</div>';
  L.ctrl.appendChild(note);
  draw();
};
