/* ================================================================
   WORLD 0 — FOUNDATIONS: PROOF-WRITING MICRO-COURSE
   Closes ROADMAP.md P1 "Proof-writing micro-course (4-6 short lessons,
   no canvas): direct proof, contrapositive, induction, counterexample-
   hunting - assessed via derivation-ordering / flaw-spotting."

   These four lessons are DOM-interactive, NOT canvas. The labs are built
   from three reusable interaction patterns defined at the top of this file:
     - arrangeProof   : shuffled proof-step cards the learner puts in order
     - pickOne        : click the one flawed step / counterexample / repair
     - quantifierFlipper : toggle forall/exists and their order, read truth
   Everything routes through the same registerLesson() / INTERACTIVES door
   as every other world; quizzes use the engine's mc / numeric / order types.
   ================================================================ */
import { INTERACTIVES, registerLesson } from './registry.js';

/* ---------------- tiny DOM helpers (theme-matched) ---------------- */
function mk(tag, css, html){
  const e = document.createElement(tag);
  if(css) e.style.cssText = css;
  if(html != null) e.innerHTML = html;
  return e;
}
function shuf(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }

const BOX   = 'background:var(--bg2);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px';
const CARD  = 'background:var(--card2);border:1px solid rgba(255,255,255,.10);border-radius:10px;padding:11px 13px;color:#cdd4f0;font-size:14px;line-height:1.55;cursor:pointer;transition:border-color .15s,background .15s,opacity .15s';
const LABEL = 'font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8b93b8;font-weight:700;margin-bottom:10px';
const NOTE  = 'font-size:13.5px;line-height:1.65;color:#cdd4f0';

/* ================================================================
   PATTERN 1 - arrange-the-proof
   o = { prompt, steps:[in CORRECT order], why, missions:[...] }
   ================================================================ */
function arrangeProof(stage, api, o){
  const n = o.steps.length;
  const wrap = mk('div','display:flex;flex-direction:column;gap:14px'); stage.appendChild(wrap);
  if(o.prompt) wrap.appendChild(mk('div', BOX+';'+NOTE, o.prompt));
  const asmBox  = mk('div', BOX); asmBox.appendChild(mk('div', LABEL, 'YOUR PROOF (top = first line)'));
  const asmList = mk('div','display:flex;flex-direction:column;gap:8px'); asmBox.appendChild(asmList);
  const bankBox = mk('div', BOX); bankBox.appendChild(mk('div', LABEL, 'STEPS - click to drop the next line into place'));
  const bankList= mk('div','display:flex;flex-direction:column;gap:8px'); bankBox.appendChild(bankList);
  wrap.appendChild(asmBox); wrap.appendChild(bankBox);
  const btnRow = mk('div','display:flex;gap:10px;align-items:center;flex-wrap:wrap');
  const checkBtn = mk('button', null, 'Check order'); checkBtn.className='btn';
  const resetBtn = mk('button', null, 'Reset'); resetBtn.className='btn ghost';
  const fb = mk('div', NOTE+';min-height:20px;flex:1;min-width:200px');
  btnRow.appendChild(checkBtn); btnRow.appendChild(resetBtn); btnRow.appendChild(fb);
  wrap.appendChild(btnRow);

  let bankOrder = shuf(o.steps.map((_,i)=>i));
  if(bankOrder.every((v,i)=>v===i)) [bankOrder[0],bankOrder[1]] = [bankOrder[1],bankOrder[0]];
  let asm = [], checks = 0, solved = false;
  const st = () => ({ solved, checks });

  function paint(){
    const used = new Set(asm);
    bankList.innerHTML = '';
    const remaining = bankOrder.filter(i=>!used.has(i));
    if(!remaining.length) bankList.appendChild(mk('div', NOTE+';color:#8b93b8;font-style:italic','All steps placed - hit Check order.'));
    remaining.forEach(i=>{
      const c = mk('div', CARD, o.steps[i]);
      if(!solved){ c.onclick = ()=>{ asm.push(i); paint(); };
        c.onmouseenter=()=>c.style.borderColor='rgba(0,212,255,.5)'; c.onmouseleave=()=>c.style.borderColor=''; }
      bankList.appendChild(c);
    });
    asmList.innerHTML = '';
    if(!asm.length){ asmList.appendChild(mk('div', NOTE+';color:#8b93b8;font-style:italic','No lines yet - click the steps below to build the proof from the top down.')); }
    asm.forEach((si,pos)=>{
      const row = mk('div','display:flex;gap:10px;align-items:flex-start');
      row.appendChild(mk('div','flex:0 0 24px;height:24px;border-radius:50%;background:rgba(124,92,255,.22);color:#b9a8ff;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;margin-top:3px', String(pos+1)));
      const c = mk('div', CARD+';flex:1', o.steps[si]);
      if(solved) c.style.borderColor='rgba(45,212,160,.55)';
      else c.onclick = ()=>{ asm.splice(pos,1); paint(); };
      row.appendChild(c); asmList.appendChild(row);
    });
  }
  checkBtn.onclick = ()=>{
    if(asm.length < n){ fb.style.color='#ffc94d'; fb.textContent='Place all '+n+' steps first ('+asm.length+'/'+n+').'; return; }
    checks++;
    if(asm.every((si,pos)=>si===pos)){
      solved = true; checkBtn.disabled = true;
      fb.style.color='#2dd4a0'; fb.innerHTML='&#10003; Correct - '+(o.why||'a valid proof, read top to bottom.');
      paint();
    } else {
      const good = asm.reduce((k,si,pos)=>k+(si===pos?1:0),0);
      fb.style.color='#ff5c7a';
      fb.textContent='Not yet - '+good+'/'+n+' lines sit in the right place. Trace from the hypothesis you may assume down to the conclusion; every line must follow from the ones above it.';
    }
    M.update(st());
  };
  resetBtn.onclick = ()=>{ if(solved) return; asm=[]; fb.textContent=''; paint(); };
  const M = api.missions(o.missions);
  M.update(st());   // burn the baseline update (no mission credit on load)
  paint();
}

/* ================================================================
   PATTERN 2 - pick-the-one (spot-the-flaw / counterexample / repair)
   o = { prompt, label, cards:[{html, no?}], answer:index, why,
         numbered?, wrongNudge, missions:[...] }
   ================================================================ */
function pickOne(stage, api, o){
  const wrap = mk('div','display:flex;flex-direction:column;gap:14px'); stage.appendChild(wrap);
  if(o.prompt) wrap.appendChild(mk('div', BOX+';'+NOTE, o.prompt));
  const box = mk('div', BOX); box.appendChild(mk('div', LABEL, o.label || 'CLICK YOUR ANSWER'));
  const list = mk('div','display:flex;flex-direction:column;gap:8px'); box.appendChild(list); wrap.appendChild(box);
  const fb = mk('div', NOTE+';min-height:20px'); wrap.appendChild(fb);
  let attempts = 0, found = false; const dead = new Set();
  const st = () => ({ found, attempts });

  function paint(){
    list.innerHTML='';
    o.cards.forEach((card,i)=>{
      const c = mk('div', CARD, (o.numbered ? ('<b style="color:#b9a8ff">'+(i+1)+'.</b> ') : '') + card.html);
      if(dead.has(i)){ c.style.opacity='.5'; c.style.borderColor='rgba(255,92,122,.5)'; c.style.cursor='default'; }
      else if(found){ c.style.cursor='default'; if(i===o.answer) c.style.borderColor='rgba(45,212,160,.55)'; }
      else { c.onclick=()=>pick(i);
        c.onmouseenter=()=>c.style.borderColor='rgba(0,212,255,.5)';
        c.onmouseleave=()=>{ if(!dead.has(i)) c.style.borderColor=''; }; }
      list.appendChild(c);
    });
  }
  function pick(i){
    attempts++;
    if(i===o.answer){ found=true; fb.style.color='#2dd4a0'; fb.innerHTML='&#10003; '+o.why; }
    else { dead.add(i); fb.style.color='#ff5c7a'; fb.innerHTML = (o.cards[i] && o.cards[i].no) || o.wrongNudge || 'Not this one - look again at where the logic actually breaks.'; }
    paint(); M.update(st());
  }
  const M = api.missions(o.missions);
  M.update(st());   // baseline
  paint();
}

/* ================================================================
   PATTERN 3 - quantifier flipper
   o = { prompt, domain:[...], P:(x,y)=>bool, Pdesc, missions:[...],
         seedQx, seedQy, seedOrder }
   ================================================================ */
function quantifierFlipper(stage, api, o){
  const D = o.domain;
  let qx = o.seedQx || '∃', qy = o.seedQy || '∃', order = o.seedOrder || 'xy';
  const seen = {};
  const wrap = mk('div','display:flex;flex-direction:column;gap:14px'); stage.appendChild(wrap);
  if(o.prompt) wrap.appendChild(mk('div', BOX+';'+NOTE, o.prompt));
  const stmtBox = mk('div', BOX+';text-align:center'); wrap.appendChild(stmtBox);
  const ctrls = mk('div','display:flex;flex-wrap:wrap;gap:12px'); wrap.appendChild(ctrls);

  function chipRow(title, options, get, set){
    const d = mk('div', BOX+';flex:1;min-width:160px'); d.appendChild(mk('div', LABEL, title));
    const row = mk('div','display:flex;gap:6px;flex-wrap:wrap');
    const btns = options.map(op=>{ const b=mk('button', null, op.label); b.className='chip'; b.onclick=()=>{ set(op.val); repaint(); }; return b; });
    btns.forEach(b=>row.appendChild(b)); d.appendChild(row);
    d._sync = ()=>btns.forEach((b,k)=>b.classList.toggle('on', options[k].val===get()));
    return d;
  }
  const A='∀', E='∃';
  const cQx = chipRow('QUANTIFIER ON x', [{label:A+' for all',val:A},{label:E+' exists',val:E}], ()=>qx, v=>qx=v);
  const cQy = chipRow('QUANTIFIER ON y', [{label:A+' for all',val:A},{label:E+' exists',val:E}], ()=>qy, v=>qy=v);
  const cOrd= chipRow('ORDER (which binds first)', [{label:'x outer',val:'xy'},{label:'y outer',val:'yx'}], ()=>order, v=>order=v);
  ctrls.appendChild(cQx); ctrls.appendChild(cQy); ctrls.appendChild(cOrd);

  const every = arr => arr.every(Boolean), some = arr => arr.some(Boolean);
  const cmb = q => (q===A ? every : some);
  function evalStmt(){
    if(order==='xy') return cmb(qx)(D.map(x=>cmb(qy)(D.map(y=>o.P(x,y)))));
    return cmb(qy)(D.map(y=>cmb(qx)(D.map(x=>o.P(x,y)))));
  }
  function stmtText(){
    const dset = '{'+D.join(', ')+'}';
    const first  = order==='xy' ? (qx+'x') : (qy+'y');
    const second = order==='xy' ? (qy+'y') : (qx+'x');
    return first+' ∈ '+dset+',  '+second+' ∈ '+dset+' :  '+o.Pdesc;
  }
  function witness(v){
    const outerQ = order==='xy' ? qx : qy;
    const outerVar = order==='xy' ? 'x' : 'y';
    const innerHolds = ov => { const q = order==='xy' ? qy : qx;
      const arr = D.map(iv => order==='xy' ? o.P(ov,iv) : o.P(iv,ov)); return (q===A ? every : some)(arr); };
    if(outerQ===A){ if(v) return 'Every '+outerVar+' in the set makes the inner part hold.';
      const bad = D.find(ov=>!innerHolds(ov)); return outerVar+' = '+bad+' breaks it, so the "for all" fails.'; }
    if(v){ const good = D.find(ov=>innerHolds(ov)); return 'Witness: '+outerVar+' = '+good+' makes the inner part hold.'; }
    return 'No single '+outerVar+' makes the inner part hold, so the "there exists" fails.';
  }
  const st = () => ({ value: evalStmt(), qx, qy, order, sawAE: !!seen.AE, sawEA: !!seen.EA });
  function repaint(){
    [cQx,cQy,cOrd].forEach(c=>c._sync());
    const v = evalStmt();
    if(qx===A && qy===E && order==='xy' && v===true)  seen.AE = true;
    if(qx===A && qy===E && order==='yx' && v===false) seen.EA = true;
    stmtBox.innerHTML =
      '<div style="font-family:var(--mono);font-size:18px;color:#e8ecff;font-weight:700;line-height:1.5">'+stmtText()+'</div>'+
      '<div style="margin-top:12px;font-size:26px;font-weight:800;color:'+(v?'#2dd4a0':'#ff5c7a')+'">'+(v?'TRUE':'FALSE')+'</div>'+
      '<div style="margin-top:6px;font-size:13px;color:#8b93b8">'+witness(v)+'</div>';
    M.update(st());
  }
  const M = api.missions(o.missions);
  repaint();   // first update = baseline (no credit)
}

/* ================================================================
   LESSON 1 - proof-read : Reading & Writing a Direct Proof
   ================================================================ */
registerLesson({
  id:'proof-read', world:'pre', order:30, emoji:'📜', title:'Reading & Writing a Direct Proof',
  sub:'A theorem is a promise "hypothesis implies conclusion." Unpack the definitions, walk forward, and the promise proves itself.',
  learn:`<p>Every theorem has the same skeleton: an <strong>if</strong> part you are <em>allowed to assume</em> (the <strong>hypothesis</strong>) and a <strong>then</strong> part you must <em>reach</em> (the <strong>conclusion</strong>).</p>
  <div class="formula">$$\\underbrace{P}_{\\text{hypothesis (given)}} \\;\\Rightarrow\\; \\underbrace{Q}_{\\text{conclusion (to show)}}$$</div>
  <p>A <strong>direct proof</strong> is the honest walk: <em>assume P, unpack every definition into a usable equation, push forward with algebra and logic, and recognize Q when you arrive.</em> No cleverness required for most first proofs - just refuse to skip a definition.</p>
  <p><strong>Worked example - sum of two evens.</strong> Theorem: if \\(a\\) and \\(b\\) are even, then \\(a+b\\) is even. "Even" <em>means</em> "a multiple of 2", so unpack it:</p>
  <div class="formula">$$a = 2m,\\; b = 2n \\;\\Rightarrow\\; a+b = 2m+2n = 2(m+n)$$</div>
  <p>Since \\(m+n\\) is an integer, \\(a+b\\) is twice an integer - even. Done. The whole proof was "unpack the definition, factor, re-recognize the definition."</p>
  <p><strong>Quantifiers, and why order is everything.</strong> Two little symbols decide the meaning: \\(\\forall\\) ("for all") and \\(\\exists\\) ("there exists"). Their <em>order does not commute</em>:</p>
  <div class="formula">$$\\forall x\\, \\exists y : x+y=4 \\quad\\text{(True on }\\{1,2,3\\}\\text{)} \\qquad \\exists y\\, \\forall x : x+y=4 \\quad\\text{(False)}$$</div>
  <p>"Everyone has a partner" (each x picks its own y) is not "one partner fits everyone" (a single y works for all x). Reading proofs is largely reading quantifiers in the right order and unpacking each definition they hide.</p>`,
  ml:`Every loss bound, convergence theorem and guarantee you will read in ML is a quantified implication - "<b>for all</b> step sizes below \\(1/L\\), gradient descent converges" or "<b>there exists</b> a network that approximates any continuous function." Misreading \\(\\forall\\exists\\) as \\(\\exists\\forall\\) is the single most common way people over-claim a result: a bound that holds "for each input, some constant works" is far weaker than "one constant works for every input." Unpacking definitions is exactly what you do when a paper says "by definition of Lipschitz / of convergence / of an unbiased estimator" and expects you to expand it.`,
  deeper:[
   {title:'😵 Stuck? Read it as a contract', body:'A theorem is a contract: the hypothesis is what the other party guarantees you, the conclusion is what you owe back. A direct proof just spends the guarantees. If you are stuck, you almost always have not fully <em>unpacked a definition</em> - "even", "increasing", "divides", "continuous" each hide an equation. Write that equation down and the next step usually appears. (Polya, "How to Solve It" - the habit of asking "what does this word mean, exactly?")'},
   {title:'🚀 Go deeper: composition of increasing functions', body:'Theorem: if \\(f\\) and \\(g\\) are increasing then \\(f\\circ g\\) is increasing. Unpack "increasing" = "\\(x_1<x_2 \\Rightarrow h(x_1)<h(x_2)\\)". Take \\(x_1<x_2\\); g increasing gives \\(g(x_1)<g(x_2)\\); feed that into f increasing to get \\(f(g(x_1))<f(g(x_2))\\). That is \\((f\\circ g)(x_1)<(f\\circ g)(x_2)\\). Two definition-unpackings chained - the whole proof. (Velleman, "How to Prove It", ch. 3 on proofs from definitions.)'},
   {title:'🚀 Go deeper: the triangle inequality', body:'For real numbers, \\(|a+b|\\le|a|+|b|\\). Proof by unpacking \\(|x|\\): since \\(-|a|\\le a\\le|a|\\) and \\(-|b|\\le b\\le|b|\\), add them to get \\(-(|a|+|b|)\\le a+b\\le |a|+|b|\\), which is exactly \\(|a+b|\\le|a|+|b|\\). This inequality underlies every distance and every norm you will meet in Worlds 1-4. (Hammack, "Book of Proof" - free online - ch. 4-5.)'}],
  labs:[
   {key:'quant', title:'Quantifier flipper', interactive:'pfQuantRead',
    intro:'<p>Toggle \\(\\forall\\) / \\(\\exists\\) on each variable and swap their order. Watch the truth value flip on the little set \\(\\{1,2,3\\}\\) with the rule \\(x+y=4\\). The point: \\(\\forall x\\,\\exists y\\) and \\(\\exists y\\,\\forall x\\) are different statements.</p>'},
   {key:'even', title:'Assemble: sum of two evens', interactive:'pfArrEven',
    intro:'<p>Put the direct proof of "the sum of two even integers is even" in order - hypothesis first, conclusion last. Every line must follow from the ones above it.</p>'},
   {key:'compose', title:'Assemble: increasing compositions', interactive:'pfArrCompose',
    intro:'<p>Now a proof that unpacks the same definition twice: if \\(f\\) and \\(g\\) are increasing, so is \\(f\\circ g\\). Arrange it.</p>'}],
  quiz:[
   {q:'In the theorem "if \\(n\\) is even then \\(n^2\\) is even", which part is the hypothesis?', opts:['"\\(n\\) is even" - the part you assume','"\\(n^2\\) is even" - the part you assume','Both parts are hypotheses','Neither - there is no hypothesis'], a:0,
    tag:'statement anatomy', focus:'The hypothesis is the "if" clause you are handed; the conclusion is the "then" clause you must reach.',
    why:'The "if" clause "\\(n\\) is even" is what you are given to assume; "\\(n^2\\) is even" is the "then" clause you must derive.',
    wrong:{1:'That is the conclusion (the "then" clause) - the thing you must PROVE, not assume.',2:'An implication has exactly one hypothesis (the if) and one conclusion (the then), not two hypotheses.',3:'The "if \\(n\\) is even" clause IS the hypothesis - every implication has one.'}},
   {q:'A direct proof of \\(P \\Rightarrow Q\\) proceeds by...', opts:['Assuming \\(P\\), then deriving \\(Q\\) by unpacking definitions and reasoning forward','Assuming \\(Q\\), then deriving \\(P\\)','Assuming \\(P\\) is false','Checking \\(P\\) and \\(Q\\) on a few examples'], a:0,
    tag:'hypothesis and conclusion', focus:'Direct proof: assume the hypothesis P, walk forward through definitions to the conclusion Q.',
    why:'You are allowed to assume the hypothesis \\(P\\); a direct proof spends that assumption, unpacking definitions until \\(Q\\) appears.',
    wrong:{1:'Assuming \\(Q\\) and deriving \\(P\\) proves the CONVERSE \\(Q\\Rightarrow P\\), a different (and generally not equivalent) statement.',2:'Assuming \\(P\\) is false is the start of a contrapositive/contradiction argument, not a direct proof.',3:'Examples can illustrate but never PROVE a universal claim - a proof must cover every case.'}},
   {type:'order', q:'Arrange the general skeleton of a direct proof of "\\(P \\Rightarrow Q\\)":',
    tag:'direct proof structure', focus:'The skeleton never changes: assume P, unpack its definitions, reason forward, recognize Q, close.',
    steps:[
      'State the hypothesis you are allowed to assume (the "if" part, P).',
      'Unpack every definition in the hypothesis into a usable equation.',
      'Reason forward with algebra and logic from those equations.',
      'Recognize the conclusion Q inside what you have derived.',
      'Close the proof (write QED / the box).'],
    why:'Assume P, expand its definitions into equations, push forward, re-recognize the definition of Q in your result, and close. That order is the template behind almost every first proof you will write.'},
   {q:'"\\(\\forall x\\) in the dataset, the model outputs a probability in \\((0,1)\\)" claims that...', opts:['Every single input maps to a probability in \\((0,1)\\)','At least one input maps to a probability in \\((0,1)\\)','Exactly one input does','The probabilities sum to 1'], a:0,
    tag:'universal quantifier', focus:'\\(\\forall\\) ("for all") asserts the property holds for EVERY element, with no exceptions.',
    why:'\\(\\forall x\\) means "for all x" - the property must hold for every element of the set, no exceptions.',
    wrong:{1:'"At least one" is the existential \\(\\exists\\); \\(\\forall\\) is the stronger "every single one".',2:'"Exactly one" is a still different claim (uniqueness); \\(\\forall\\) says all of them.',3:'Summing to 1 is a normalization statement about a distribution, unrelated to the \\(\\forall\\) quantifier here.'}},
   {q:'Which pair of statements can have DIFFERENT truth values (order of quantifiers matters)?', opts:['\\(\\forall x\\,\\exists y\\,P\\) versus \\(\\exists y\\,\\forall x\\,P\\)','\\(\\forall x\\,\\forall y\\,P\\) versus \\(\\forall y\\,\\forall x\\,P\\)','\\(\\exists x\\,\\exists y\\,P\\) versus \\(\\exists y\\,\\exists x\\,P\\)','\\(\\forall x\\,P\\) versus \\(\\forall x\\,P\\)'], a:0,
    tag:'quantifier order', focus:'Swapping two DIFFERENT quantifiers (a forall past an exists) can change meaning; two of the same kind commute.',
    why:'\\(\\forall x\\,\\exists y\\) ("each x has its own y") is weaker than \\(\\exists y\\,\\forall x\\) ("one y works for all x") - swapping a \\(\\forall\\) past an \\(\\exists\\) can flip the truth value.',
    wrong:{1:'Two universals commute: \\(\\forall x\\forall y = \\forall y\\forall x\\) always mean the same thing.',2:'Two existentials commute too: \\(\\exists x\\exists y = \\exists y\\exists x\\).',3:'These are literally identical statements - same truth value trivially.'}},
   {q:'A proof says "since \\(f\\) is increasing, \\(x_1<x_2\\) gives \\(f(x_1)<f(x_2)\\)." This step is an example of...', opts:['Unpacking a definition into a usable inequality','Assuming the conclusion','A proof by contradiction','A counterexample'], a:0,
    tag:'definition unpacking', focus:'"Increasing" is not magic - it MEANS \\(x_1<x_2 \\Rightarrow f(x_1)<f(x_2)\\). Using that is unpacking the definition.',
    why:'"Increasing" is defined as "\\(x_1<x_2 \\Rightarrow f(x_1)<f(x_2)\\)". The step just replaces the word with its definition - the engine of most direct proofs.',
    wrong:{1:'Nothing is being assumed about the conclusion; a defined property of \\(f\\) is being expanded.',2:'There is no contradiction hypothesis here - it is a straight forward step.',3:'A counterexample refutes a claim; this step builds toward proving one.'}},
   {type:'numeric', q:'On \\(D=\\{1,2,3,4,5\\}\\), the statement \\(\\exists y\\, \\forall x : x \\le y\\) is TRUE. Enter the smallest witness \\(y\\) that makes it true.',
    answer:5, tol:0, tag:'existential witness',
    focus:'\\(\\exists y\\,\\forall x: x\\le y\\) needs one y that is at least every x. The witness is the maximum of the set.',
    hint:'You need a single y that is \\(\\ge\\) every element. What is the largest element of the set?',
    why:'A witness \\(y\\) must satisfy \\(x\\le y\\) for all \\(x\\); the smallest such value is the maximum, \\(y=5\\). (Note \\(\\forall x\\,\\exists y\\) would be true for many y - order matters.)'},
   {q:'Why can testing "\\(P\\) holds for \\(x=1,2,3\\)" never PROVE "\\(\\forall x\\, P(x)\\)"?', opts:['A universal claim covers infinitely (or all) many cases; finitely many checks miss the rest','Because computers round the numbers','Because \\(P\\) might be false for \\(x=1\\)','It can - three examples are a valid proof'], a:0,
    tag:'proving for all', focus:'Examples support a conjecture but a universal needs an argument covering EVERY case, not a sample.',
    why:'\\(\\forall x\\) ranges over every element (often infinitely many); checking a handful leaves all the untested cases unproven. A universal needs a general argument.',
    wrong:{1:'Rounding is not the issue - even with exact arithmetic, a finite sample cannot certify an infinite claim.',2:'If \\(P\\) failed at \\(x=1\\) you would already have a counterexample; the point is the UNtested cases.',3:'Examples never prove a universal - one untested case could be the exception.'}}],
});
INTERACTIVES.pfQuantRead = (stage, api) => quantifierFlipper(stage, api, {
  prompt:'Rule: \\(x+y=4\\). Domain \\(\\{1,2,3\\}\\). Toggle the quantifiers and their order; the readout re-checks the whole finite set for you.',
  domain:[1,2,3], P:(x,y)=>x+y===4, Pdesc:'x + y = 4',
  seedQx:'∃', seedQy:'∃', seedOrder:'xy',
  missions:[
   {text:'Make the statement TRUE with some choice of quantifiers and order.', xp:15, check:s=>s.value===true},
   {text:'Show order matters: build ∀x ∃y (TRUE), then swap to ∃y ∀x and watch it flip to FALSE.', xp:25, check:s=>s.sawAE&&s.sawEA},
   {text:'Make it FALSE using TWO ∀ (universal on both x and y).', xp:20, check:s=>s.qx==='∀'&&s.qy==='∀'&&s.value===false}],
});
INTERACTIVES.pfArrEven = (stage, api) => arrangeProof(stage, api, {
  prompt:'Theorem: if \\(a\\) and \\(b\\) are even integers, then \\(a+b\\) is even.',
  steps:[
   'Assume a and b are even integers (this is the hypothesis).',
   'By definition of even, write a = 2m and b = 2n for integers m and n.',
   'Add the two equations: a + b = 2m + 2n.',
   'Factor out the 2: a + b = 2(m + n).',
   'Since m + n is an integer, a + b is 2 times an integer, hence even. QED.'],
  why:'assume the hypothesis, unpack "even" into 2m and 2n, add, factor, and re-recognize the definition of even.',
  missions:[
   {text:'Assemble the proof correctly.', xp:20, check:s=>s.solved},
   {text:'Nail it in at most 2 checks.', xp:20, check:s=>s.solved&&s.checks<=2},
   {text:'Get it on the very first check (no retries).', xp:15, check:s=>s.solved&&s.checks===1}],
});
INTERACTIVES.pfArrCompose = (stage, api) => arrangeProof(stage, api, {
  prompt:'Theorem: if \\(f\\) and \\(g\\) are increasing functions, then \\(f\\circ g\\) is increasing.',
  steps:[
   'Assume f and g are increasing (hypothesis).',
   'Take any two inputs with x1 < x2.',
   'Since g is increasing, g(x1) < g(x2).',
   'Since f is increasing, f(g(x1)) < f(g(x2)).',
   'That is (f o g)(x1) < (f o g)(x2), so f o g is increasing. QED.'],
  why:'the definition of "increasing" is unpacked twice - once for g, once for f - and the inequalities chain.',
  missions:[
   {text:'Assemble the proof correctly.', xp:20, check:s=>s.solved},
   {text:'Do it in at most 2 checks.', xp:20, check:s=>s.solved&&s.checks<=2}],
});

/* ================================================================
   LESSON 2 - proof-contra : Contrapositive & Contradiction
   ================================================================ */
registerLesson({
  id:'proof-contra', world:'pre', order:31, emoji:'🔁', title:'Contrapositive & Contradiction',
  sub:'Two escape hatches when a direct proof stalls: flip to the logically-equivalent contrapositive, or assume the opposite and hunt for an absurdity.',
  learn:`<p>Sometimes assuming \\(P\\) and marching to \\(Q\\) is awkward, but the <em>backwards</em> version is easy. Two classic moves rescue you.</p>
  <p><strong>1. Contrapositive.</strong> The statement \\(P\\Rightarrow Q\\) is <em>logically equivalent</em> to \\(\\lnot Q \\Rightarrow \\lnot P\\):</p>
  <div class="formula">$$(P \\Rightarrow Q) \\;\\equiv\\; (\\lnot Q \\Rightarrow \\lnot P)$$</div>
  <p>Same truth value, always. So you may prove either one. Beware the imposter: the <strong>converse</strong> \\(Q\\Rightarrow P\\) is <em>NOT</em> equivalent - "if it rained the ground is wet" does not give "if the ground is wet it rained." Contrapositive flips <em>and</em> negates both parts; converse only flips. Only the contrapositive is safe.</p>
  <p><strong>Example.</strong> "If \\(n^2\\) is even then \\(n\\) is even" is clumsy head-on (what does an even square tell you directly?). Its contrapositive - "if \\(n\\) is odd then \\(n^2\\) is odd" - is a one-liner: \\(n=2k+1 \\Rightarrow n^2 = 2(2k^2+2k)+1\\), odd. Done.</p>
  <p><strong>2. Contradiction.</strong> To prove a statement \\(S\\), assume \\(\\lnot S\\) and derive an <strong>absurdity</strong> (something that cannot be true). For an implication you assume \\(P \\wedge \\lnot Q\\) - the hypothesis holds but the conclusion fails - and reach nonsense.</p>
  <p><strong>The classic - \\(\\sqrt{2}\\) is irrational.</strong> Suppose not: \\(\\sqrt{2}=a/b\\) in lowest terms. Then \\(a^2=2b^2\\), so \\(a^2\\) is even, so \\(a\\) is even, \\(a=2k\\). Substituting, \\(b^2=2k^2\\), so \\(b\\) is even too. But then \\(a\\) and \\(b\\) share the factor 2 - contradicting "lowest terms." The assumption was impossible, so \\(\\sqrt{2}\\) is irrational.</p>`,
  ml:`Contradiction and contrapositive run quietly under a lot of ML theory. "No free lunch" is a contradiction-style impossibility result; many lower bounds are proved by assuming a faster/better algorithm exists and deriving an absurdity. In day-to-day reasoning the <b>converse trap</b> is the dangerous one: "if the model overfits, train loss is low" does NOT license "train loss is low, therefore it overfits" (it might just be an easy problem). Confusing \\(P\\Rightarrow Q\\) with its converse is exactly how correlation gets read as causation and how a validation metric gets over-interpreted.`,
  deeper:[
   {title:'😵 Stuck? Contrapositive vs converse vs inverse', body:'From \\(P\\Rightarrow Q\\): the <b>converse</b> is \\(Q\\Rightarrow P\\) (flip only), the <b>inverse</b> is \\(\\lnot P\\Rightarrow\\lnot Q\\) (negate only), and the <b>contrapositive</b> is \\(\\lnot Q\\Rightarrow\\lnot P\\) (flip AND negate). Only the contrapositive is logically equivalent to the original. Converse and inverse are equivalent to each other but NOT to the original. When "\\(n^2\\) even \\(\\Rightarrow\\) \\(n\\) even" feels hard, prove "\\(n\\) odd \\(\\Rightarrow\\) \\(n^2\\) odd" instead. (Velleman, "How to Prove It", ch. 3.)'},
   {title:'🚀 Go deeper: when does each shine?', body:'Reach for the <b>contrapositive</b> when the negations are more concrete than the originals - "not even" = "odd" gives you a clean \\(2k+1\\) to compute with. Reach for <b>contradiction</b> when the claim is a non-existence or an irrationality ("no such fraction exists") - assuming the thing exists hands you an object to manipulate until it self-destructs. \\(\\sqrt{2}\\) irrational is the textbook case: there is nothing to "walk toward" directly, but assuming a fraction gives you \\(a,b\\) to break. (Hammack, "Book of Proof", ch. 6.)'},
   {title:'🚀 Go deeper: contradiction needs a real absurdity', body:'A contradiction proof is only valid if what you derive is genuinely impossible - \\(a\\) and \\(b\\) both even AFTER assuming lowest terms, or \\(0=1\\), or a number both even and odd. Deriving something merely surprising is not enough. And unlike contradiction, the contrapositive introduces no "suppose not" - it is a direct proof of an equivalent statement, which many mathematicians prefer for clarity. (Lakatos, "Proofs and Refutations", on how hidden assumptions sneak into "obvious" contradictions.)'}],
  labs:[
   {key:'sqrt2', title:'Assemble: root 2 is irrational', interactive:'pfArrSqrt2',
    intro:'<p>Reconstruct the most famous proof by contradiction. Assume \\(\\sqrt2=a/b\\) in lowest terms and drive it into an impossible corner.</p>'},
   {key:'contra', title:'Assemble: contrapositive of n squared', interactive:'pfArrContrapos',
    intro:'<p>Prove "\\(n^2\\) even \\(\\Rightarrow n\\) even" the smart way - by its contrapositive "\\(n\\) odd \\(\\Rightarrow n^2\\) odd." Arrange the lines.</p>'},
   {key:'flaw', title:'Spot the flaw: converse trap', interactive:'pfFlawConverse',
    intro:'<p>Here is a plausible-looking "proof" of "\\(n^2\\) even \\(\\Rightarrow n\\) even." Exactly one step is fatally wrong. Click it.</p>'}],
  quiz:[
   {q:'The contrapositive of "\\(P \\Rightarrow Q\\)" is...', opts:['\\(\\lnot Q \\Rightarrow \\lnot P\\) - flip AND negate both parts','\\(Q \\Rightarrow P\\) - the converse','\\(\\lnot P \\Rightarrow \\lnot Q\\) - the inverse','\\(P \\Rightarrow \\lnot Q\\)'], a:0,
    tag:'contrapositive equivalence', focus:'Contrapositive = negate both parts AND swap them. It is always logically equivalent to the original.',
    why:'The contrapositive negates both parts and swaps them: \\(\\lnot Q\\Rightarrow\\lnot P\\). It has the same truth value as \\(P\\Rightarrow Q\\) in every case.',
    wrong:{1:'That is the CONVERSE - it only flips, without negating - and it is NOT equivalent to the original.',2:'That is the INVERSE (negate only). It equals the converse, but not the original statement.',3:'That just negates the conclusion; it is not any of the standard related forms and is not equivalent.'}},
   {q:'Which statement is generally NOT equivalent to "\\(P \\Rightarrow Q\\)"?', opts:['The converse \\(Q \\Rightarrow P\\)','The contrapositive \\(\\lnot Q \\Rightarrow \\lnot P\\)','\\(P \\Rightarrow Q\\) itself','Any statement with the same truth table'], a:0,
    tag:'converse is not equivalent', focus:'The converse flips without negating and can have a different truth value - the classic logical trap.',
    why:'The converse \\(Q\\Rightarrow P\\) can be false when \\(P\\Rightarrow Q\\) is true ("rained \\(\\Rightarrow\\) wet ground" but not conversely). Only the contrapositive is guaranteed equivalent.',
    wrong:{1:'The contrapositive IS equivalent - it is the safe reformulation you can always prove instead.',2:'A statement is trivially equivalent to itself.',3:'Equivalence is exactly "same truth table", so that option is equivalent by definition.'}},
   {q:'In a proof by contradiction of the implication \\(P \\Rightarrow Q\\), you begin by assuming...', opts:['\\(P\\) is true AND \\(Q\\) is false (\\(P \\wedge \\lnot Q\\))','\\(P\\) is false','\\(Q\\) is true','Both \\(P\\) and \\(Q\\) are false'], a:0,
    tag:'proof by contradiction setup', focus:'To contradict P implies Q, assume the implication fails: the hypothesis holds but the conclusion does not.',
    why:'An implication is false in exactly one way: hypothesis true, conclusion false. So you assume \\(P\\wedge\\lnot Q\\) and derive an absurdity.',
    wrong:{1:'Assuming \\(P\\) false does not target the implication - if \\(P\\) is false the implication is already (vacuously) true.',2:'Assuming \\(Q\\) true assumes the conclusion; that proves nothing.',3:'You need \\(P\\) TRUE (to keep the hypothesis) and \\(Q\\) false - not both false.'}},
   {type:'order', q:'Arrange the proof by contradiction that \\(\\sqrt{2}\\) is irrational:',
    tag:'irrationality of root two', focus:'Assume a reduced fraction, force both numerator and denominator even, and collide with "lowest terms."',
    steps:[
     'Suppose, for contradiction, that root 2 = a/b in lowest terms (a and b share no common factor).',
     'Square and rearrange: 2 = a^2 / b^2, so a^2 = 2 b^2.',
     'Then a^2 is even, which forces a to be even: write a = 2k.',
     'Substitute: (2k)^2 = 2 b^2 gives b^2 = 2 k^2, so b^2 is even and b is even.',
     'But now a and b are both even, sharing the factor 2 - contradicting "lowest terms." So root 2 is irrational. QED.'],
    why:'the assumed fraction is squeezed until both a and b must be even, which contradicts the reduced-fraction assumption. The only faulty step was assuming root 2 was rational.'},
   {q:'Why prove "\\(n^2\\) even \\(\\Rightarrow n\\) even" by its contrapositive "\\(n\\) odd \\(\\Rightarrow n^2\\) odd"?', opts:['"\\(n\\) odd" gives a concrete form \\(n=2k+1\\) you can square directly','The contrapositive is a weaker, easier claim','Because the converse is also true','To avoid using any definitions'], a:0,
    tag:'contrapositive when to use', focus:'Reach for the contrapositive when the NEGATIONS are more concrete than the originals.',
    why:'"\\(n\\) odd" hands you \\(n=2k+1\\) to square, immediately giving an odd \\(n^2\\). "\\(n^2\\) even" gives you nothing concrete to expand - so the contrapositive is far easier.',
    wrong:{1:'The contrapositive is logically EQUIVALENT, not weaker - it is exactly as strong, just easier to compute with here.',2:'The truth of the converse is irrelevant; you switch because the contrapositive is easier to work with.',3:'You still unpack the definition of "odd" - the switch just makes that unpacking productive.'}},
   {q:'The negation of the implication "\\(P \\Rightarrow Q\\)" is...', opts:['\\(P \\wedge \\lnot Q\\) - P holds but Q fails','\\(\\lnot P \\Rightarrow \\lnot Q\\)','\\(\\lnot P \\wedge \\lnot Q\\)','\\(Q \\Rightarrow P\\)'], a:0,
    tag:'negation of implication', focus:'An implication fails only when the hypothesis is true and the conclusion false: not(P implies Q) = P and not-Q.',
    why:'\\(P\\Rightarrow Q\\) is false exactly when \\(P\\) is true and \\(Q\\) is false, i.e. \\(P\\wedge\\lnot Q\\). This is precisely the assumption a contradiction proof starts from.',
    wrong:{1:'That is the inverse (an implication), not a negation - negating an implication yields a conjunction, not another implication.',2:'\\(\\lnot P\\wedge\\lnot Q\\) requires \\(P\\) false, but the implication also fails when \\(P\\) is true and \\(Q\\) false.',3:'That is the converse, a different implication entirely.'}},
   {type:'numeric', q:'At the end of the \\(\\sqrt{2}\\) proof, both \\(a\\) and \\(b\\) turn out to be even, so they share a common factor that contradicts "lowest terms." What is that common factor?',
    answer:2, tol:0, tag:'proof by contradiction setup',
    focus:'"Even" means divisible by 2; if a and b are both even they share the factor 2, breaking the reduced-fraction assumption.',
    hint:'Both numbers came out even. Even means divisible by which prime?',
    why:'Both \\(a\\) and \\(b\\) are even, so 2 divides each - a shared factor of 2, which contradicts the assumption that \\(a/b\\) was in lowest terms.'},
   {q:'A "proof" assumes \\(n\\) is even, derives that \\(n^2\\) is even, and concludes "\\(n^2\\) even \\(\\Rightarrow n\\) even." What went wrong?', opts:['It assumed the conclusion and proved the converse, not the claim','Nothing - it is a valid direct proof','It should have squared both sides','It forgot the base case'], a:0,
    tag:'converse is not equivalent', focus:'Assuming n even and getting n squared even proves n even implies n squared even - the converse, not the target.',
    why:'To prove "\\(n^2\\) even \\(\\Rightarrow n\\) even" directly you must ASSUME \\(n^2\\) even. This "proof" assumed \\(n\\) even and derived \\(n^2\\) even - that is the converse \\(n\\) even \\(\\Rightarrow n^2\\) even, a different statement.',
    wrong:{1:'It is invalid: it proves the converse, so the target implication is never established.',2:'Squaring is not the issue - assuming the wrong starting point is.',3:'Base cases belong to induction; this is a (mis-aimed) direct proof.'}}],
});
INTERACTIVES.pfArrSqrt2 = (stage, api) => arrangeProof(stage, api, {
  prompt:'Theorem: \\(\\sqrt{2}\\) is irrational. Assemble the contradiction proof.',
  steps:[
   'Suppose, for contradiction, that root2 = a/b in lowest terms (no common factor).',
   'Square and clear denominators: 2 = a^2/b^2, so a^2 = 2 b^2.',
   'Then a^2 is even, so a is even; write a = 2k.',
   'Substitute: (2k)^2 = 2 b^2, giving b^2 = 2 k^2, so b is even too.',
   'Now a and b share the factor 2, contradicting "lowest terms." Hence root2 is irrational. QED.'],
  why:'the reduced fraction is squeezed until both a and b are even, colliding with the lowest-terms assumption.',
  missions:[
   {text:'Assemble the root-2 proof correctly.', xp:25, check:s=>s.solved},
   {text:'Assemble it in at most 2 tries.', xp:25, check:s=>s.solved&&s.checks<=2},
   {text:'First-try flawless assembly.', xp:15, check:s=>s.solved&&s.checks===1}],
});
INTERACTIVES.pfArrContrapos = (stage, api) => arrangeProof(stage, api, {
  prompt:'Theorem: if \\(n^2\\) is even then \\(n\\) is even. Prove it by the contrapositive.',
  steps:[
   'To prove "n^2 even => n even", instead prove the contrapositive: "n odd => n^2 odd".',
   'Assume n is odd, so n = 2k + 1 for some integer k.',
   'Square it: n^2 = (2k+1)^2 = 4k^2 + 4k + 1.',
   'Regroup: n^2 = 2(2k^2 + 2k) + 1, which is odd.',
   'So n odd => n^2 odd; by contrapositive, n^2 even => n even. QED.'],
  why:'proving the equivalent contrapositive lets you use the concrete form n = 2k+1 and just square it.',
  missions:[
   {text:'Assemble the contrapositive proof correctly.', xp:20, check:s=>s.solved},
   {text:'Do it in at most 2 checks.', xp:20, check:s=>s.solved&&s.checks<=2}],
});
INTERACTIVES.pfFlawConverse = (stage, api) => pickOne(stage, api, {
  prompt:'Claim to prove: "if \\(n^2\\) is even then \\(n\\) is even." The "proof" below has exactly ONE fatal step. Click it.',
  label:'CLICK THE FLAWED STEP',
  numbered:true,
  cards:[
   {html:'Suppose n is even.', no:'This looks innocent, but this IS the flaw - keep it in mind. (Click it once you are sure.)'},
   {html:'Then n = 2k for some integer k.', no:'This step is a correct unpacking of "even" - it follows fine from step 1. The trouble is earlier, in what step 1 assumed.'},
   {html:'So n^2 = (2k)^2 = 4k^2 = 2(2k^2).', no:'Correct algebra - this genuinely follows from step 2.'},
   {html:'Therefore n^2 is even.', no:'True and correctly derived. The proof HAS shown "n even => n^2 even" faithfully - that is the problem.'},
   {html:'Hence "n^2 even => n even" is proved. QED.', no:'This is the false conclusion, but it is only false BECAUSE of the wrong starting assumption in step 1. The root flaw is step 1.'}],
  answer:0,
  why:'Step 1 is the fatal flaw: to prove "\\(n^2\\) even \\(\\Rightarrow n\\) even" you must ASSUME \\(n^2\\) is even. By assuming \\(n\\) is even instead, the proof establishes the CONVERSE ("\\(n\\) even \\(\\Rightarrow n^2\\) even") - a true but different statement. Every later step is valid; they just prove the wrong theorem. (The right fix: prove the contrapositive "\\(n\\) odd \\(\\Rightarrow n^2\\) odd.")',
  missions:[
   {text:'Find the flawed step.', xp:25, check:s=>s.found},
   {text:'Spot it on your first click.', xp:20, check:s=>s.found&&s.attempts===1}],
});

/* ================================================================
   LESSON 3 - proof-induction : Induction (the domino machine)
   ================================================================ */
registerLesson({
  id:'proof-induction', world:'pre', order:32, emoji:'🁫', title:'Induction: The Domino Machine',
  sub:'Prove a base case, prove each case knocks over the next, and a single argument covers infinitely many n. Skip either half and it collapses.',
  learn:`<p><strong>Induction</strong> proves a statement \\(P(n)\\) for every natural number \\(n\\) with two pieces:</p>
  <div class="formula">$$\\underbrace{P(1)}_{\\text{base case}} \\;\\text{and}\\; \\underbrace{\\big(P(k)\\Rightarrow P(k+1)\\big)}_{\\text{inductive step}} \\;\\Rightarrow\\; \\forall n\\, P(n)$$</div>
  <p>Picture a line of dominoes. The <strong>base case</strong> tips the first one over. The <strong>inductive step</strong> guarantees "if domino \\(k\\) falls, it knocks over domino \\(k+1\\)." Together they fell every domino - infinitely many - with two finite checks. <em>You need BOTH.</em> A base with no step falls one domino; a step with no base is a chain nothing ever starts.</p>
  <p><strong>Worked example - the Gauss sum</strong> (ties straight back to \\(\\Sigma\\) notation):</p>
  <div class="formula">$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$</div>
  <p>Base \\(n=1\\): \\(1 = 1\\cdot 2/2\\). Step: assume \\(\\sum_{i=1}^{k} i = k(k+1)/2\\); then \\(\\sum_{i=1}^{k+1} i = k(k+1)/2 + (k+1) = (k+1)(k+2)/2\\), which is the formula at \\(n=k+1\\). Every domino falls.</p>
  <p><strong>Second example - the geometric series</strong> (this is the discount-factor sum behind reinforcement learning):</p>
  <div class="formula">$$1 + r + r^2 + \\cdots + r^n = \\frac{1-r^{\\,n+1}}{1-r}$$</div>
  <p><strong>Strong induction</strong> is the same idea with a bigger crowbar: to prove \\(P(k+1)\\) you may assume <em>all</em> of \\(P(1),\\dots,P(k)\\), not just \\(P(k)\\). It is what proves "every integer greater than 1 factors into primes" - the factors are smaller numbers, so you lean on all previous cases at once.</p>`,
  ml:`The geometric series is not an exercise - it is the <b>discounted return</b> \\(G = \\sum_{t\\ge 0} \\gamma^t r_t\\) at the heart of reinforcement learning, and \\(\\sum_{t\\ge0}\\gamma^t = 1/(1-\\gamma)\\) is why a discount \\(\\gamma<1\\) keeps an infinite-horizon value finite. Induction itself is how you reason about anything recursive or iterative: unrolling a recurrent network through time, bounding an optimizer after \\(k\\) steps, proving a recursive algorithm correct. And the "all horses are the same color" fallacy in the lab is the exact shape of a hundred bogus ML claims - an inductive step that quietly fails at one small case and takes the whole conclusion down with it.`,
  deeper:[
   {title:'😵 Stuck? Both halves are load-bearing', body:'Induction is two promises: (1) the first domino falls (base case), and (2) every fallen domino topples the next (inductive step). Drop the base case and you can "prove" nonsense like \\(\\sum_{i=1}^n i = n(n+1)/2 + 7\\) - the step still checks, but nothing is ever true because no domino starts. Drop the step and you have verified exactly one value. Always write both, explicitly. (Hammack, "Book of Proof", ch. 10.)'},
   {title:'🚀 Go deeper: strong induction', body:'Ordinary induction assumes \\(P(k)\\) to get \\(P(k+1)\\). <b>Strong</b> induction assumes \\(P(1)\\wedge\\cdots\\wedge P(k)\\) - the entire history - to get \\(P(k+1)\\). Use it when \\(P(k+1)\\) depends on a case further back than the immediate predecessor: prime factorization (n splits into two smaller factors, both covered by the hypothesis), or the Fundamental Theorem of Arithmetic. The two forms are logically equivalent, but strong induction is the natural tool for "reduce to smaller sub-problems." (Velleman, "How to Prove It", ch. 6.)'},
   {title:'🚀 Go deeper: why "all horses same color" fails', body:'The famous fake theorem: base case (1 horse) is fine; the step "take k+1 horses, drop one then the other, the two overlapping k-sets share a horse so all match" LOOKS fine - but at \\(k+1=2\\) the two 1-horse sets do NOT overlap, so the color never transfers. One broken value of the inductive step, and the whole infinite conclusion is void. The lesson: an inductive step must hold for EVERY k in range, edge cases included. (Lakatos, "Proofs and Refutations", on hidden edge-case assumptions.)'}],
  labs:[
   {key:'gauss', title:'Assemble: the Gauss sum', interactive:'pfArrGauss',
    intro:'<p>Build the induction proof of \\(\\sum_{i=1}^{n} i = n(n+1)/2\\). Base case first, then the inductive step that adds the next term.</p>'},
   {key:'geom', title:'Assemble: the geometric series', interactive:'pfArrGeom',
    intro:'<p>Now the discount-factor sum \\(1+r+\\cdots+r^n = (1-r^{n+1})/(1-r)\\) - the backbone of RL returns. Arrange its induction proof.</p>'},
   {key:'horses', title:'Spot the flaw: all horses same color', interactive:'pfFlawHorses',
    intro:'<p>A notorious "proof" that all horses are the same color. The base case and every symbol are fine - but one inductive step is secretly false. Click it.</p>'}],
  quiz:[
   {q:'The two ingredients of a proof by induction are...', opts:['A base case AND an inductive step (P(k) => P(k+1))','Just a base case','Just an inductive step','A base case and a counterexample'], a:0,
    tag:'induction needs base and step', focus:'Induction requires BOTH: the first domino falls, and each domino topples the next. Neither alone suffices.',
    why:'You must tip the first domino (base case) and guarantee each one knocks over the next (inductive step). Both together cover all n.',
    wrong:{1:'A base case alone verifies exactly ONE value of n - it proves nothing about the rest.',2:'An inductive step alone is a chain no one ever starts - without a base case, nothing is ever established.',3:'A counterexample refutes claims; induction proves them. The second ingredient is the inductive step.'}},
   {q:'In the inductive step you assume \\(P(k)\\) (the inductive hypothesis) in order to...', opts:['Prove \\(P(k+1)\\) - that case k forces case k+1','Prove \\(P(k)\\) itself','Prove the base case','Prove \\(P(k-1)\\)'], a:0,
    tag:'inductive step', focus:'The inductive step is the implication P(k) => P(k+1): assume the k-th case, deduce the (k+1)-th.',
    why:'The step is the implication \\(P(k)\\Rightarrow P(k+1)\\): you borrow case k as an assumption and use it to establish case k+1, which propagates the truth up the chain.',
    wrong:{1:'You do not prove \\(P(k)\\) - you ASSUME it (that is the inductive hypothesis) to reach \\(P(k+1)\\).',2:'The base case is proved separately and directly; the step handles the propagation.',3:'Induction propagates upward (k to k+1), not downward to \\(P(k-1)\\).'}},
   {q:'What breaks if you prove the inductive step but forget the base case?', opts:['Nothing is ever established - the chain has no starting domino','Only the last case is proved','Only even n are proved','The step becomes a counterexample'], a:0,
    tag:'induction base case', focus:'Without a base case the implication chain never ignites - you can "prove" false formulas this way.',
    why:'The step only says "if some case holds, the next does." With no base case, no case is ever known to hold, so the whole chain stays empty - you can even "prove" a formula that is off by a constant.',
    wrong:{1:'Without a starting case, NO case is proved, not even the last.',2:'Parity is irrelevant; the issue is that the chain never starts at all.',3:'A missing base case makes the proof incomplete, not a counterexample.'}},
   {type:'order', q:'Arrange the induction proof of \\(\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\\):',
    tag:'gauss triangular sum', focus:'Base case, state the inductive hypothesis, add the next term, simplify to the formula at k+1, conclude.',
    steps:[
     'Base case n = 1: the left side is 1 and the right side is 1(2)/2 = 1, so P(1) holds.',
     'Inductive hypothesis: assume sum_{i=1}^{k} i = k(k+1)/2 for some k.',
     'Add the next term: sum_{i=1}^{k+1} i = k(k+1)/2 + (k+1).',
     'Factor out (k+1): = (k+1)(k+2)/2, which is the formula at n = k+1.',
     'So P(k) => P(k+1); with the base case, the formula holds for all n. QED.'],
    why:'verify n=1, assume the k-case, add the (k+1)-th term, simplify into the formula with n=k+1, then invoke both pieces to conclude for all n.'},
   {q:'The geometric-series formula \\(1+r+\\cdots+r^n = \\frac{1-r^{n+1}}{1-r}\\) matters in ML because...', opts:['It is the discounted-return / discount-factor sum used in reinforcement learning','It is only a pure-math curiosity','It computes matrix inverses','It defines the sigmoid'], a:0,
    tag:'geometric series sum', focus:'Discounted returns sum gamma^t; the geometric series gives 1/(1-gamma) for the infinite horizon.',
    why:'Discounted returns \\(\\sum_t \\gamma^t r_t\\) are geometric sums; \\(\\sum_{t\\ge0}\\gamma^t = 1/(1-\\gamma)\\) is exactly why a discount \\(\\gamma<1\\) keeps an infinite-horizon value finite.',
    wrong:{1:'It is directly the RL return sum - far from a mere curiosity.',2:'Matrix inversion is unrelated to this scalar series.',3:'The sigmoid is \\(1/(1+e^{-z})\\); the geometric series is a different object.'}},
   {q:'Strong induction differs from ordinary induction in that the inductive step may assume...', opts:['All previous cases P(1),...,P(k), not just P(k)','No previous cases at all','Only the base case','The statement P(k+1) it is trying to prove'], a:0,
    tag:'strong induction', focus:'Strong induction assumes the WHOLE history up to k to prove k+1 - useful when k+1 reduces to much smaller cases.',
    why:'Strong induction lets you assume \\(P(1)\\wedge\\cdots\\wedge P(k)\\) to prove \\(P(k+1)\\) - essential when the (k+1) case reduces to cases well below k (e.g. prime factorization).',
    wrong:{1:'It assumes MORE than ordinary induction (the whole history), not nothing.',2:'It uses every prior case, not just the base.',3:'Assuming what you are proving would be circular - that is never allowed.'}},
   {type:'numeric', q:'Use \\(\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\\) to compute \\(1+2+\\cdots+100\\).',
    answer:5050, tol:0, tag:'gauss triangular sum',
    focus:'Plug n = 100 into n(n+1)/2: that is 100 times 101 divided by 2.',
    hint:'n = 100, so evaluate 100(101)/2.',
    why:'\\(100\\cdot 101/2 = 10100/2 = 5050\\) - the schoolboy-Gauss answer, delivered by the closed form.'},
   {q:'The "all horses are the same color" induction is fallacious because...', opts:['Its inductive step from k=1 to k=2 fails: the two overlapping sets do not actually overlap','Its base case is false','It uses strong induction illegally','It has no conclusion'], a:0,
    tag:'broken induction horses', focus:'The overlap argument needs a shared horse between the two k-sets; at k+1 = 2 the two singletons share none.',
    why:'The step claims two overlapping k-horse subsets share a horse, transferring color. For \\(k+1=2\\) each subset has ONE horse and they overlap in none - the color never transfers, so the chain breaks at the very first step.',
    wrong:{1:'The base case (a single horse matches itself) is genuinely fine - the flaw is in the step.',2:'The form of induction is not the problem; one value of the step is simply false.',3:'It does state a conclusion ("all horses same color") - which is exactly what is wrong, because the step is invalid.'}}],
});
INTERACTIVES.pfArrGauss = (stage, api) => arrangeProof(stage, api, {
  prompt:'Theorem: \\(\\sum_{i=1}^{n} i = n(n+1)/2\\) for all \\(n\\ge 1\\). Assemble the induction proof.',
  steps:[
   'Base case n = 1: left side = 1, right side = 1(2)/2 = 1. So P(1) holds.',
   'Inductive hypothesis: assume sum_{i=1}^{k} i = k(k+1)/2.',
   'Add the (k+1)-th term: sum_{i=1}^{k+1} i = k(k+1)/2 + (k+1).',
   'Combine over a common factor (k+1): = (k+1)(k+2)/2.',
   'This is the formula with n = k+1, so P(k) => P(k+1); with the base case it holds for all n. QED.'],
  why:'base case, hypothesis, add the next term, factor, and recognize the formula at k+1.',
  missions:[
   {text:'Assemble the Gauss-sum proof correctly.', xp:20, check:s=>s.solved},
   {text:'In at most 2 checks.', xp:20, check:s=>s.solved&&s.checks<=2},
   {text:'First try, no retries.', xp:15, check:s=>s.solved&&s.checks===1}],
});
INTERACTIVES.pfArrGeom = (stage, api) => arrangeProof(stage, api, {
  prompt:'Theorem: \\(1+r+\\cdots+r^n = (1-r^{n+1})/(1-r)\\) for \\(r\\ne 1\\). Assemble the induction proof.',
  steps:[
   'Base case n = 0: left side = 1, right side = (1 - r)/(1 - r) = 1. So P(0) holds.',
   'Inductive hypothesis: assume 1 + r + ... + r^k = (1 - r^{k+1})/(1 - r).',
   'Add the next term r^{k+1} to both sides of the hypothesis.',
   'Common denominator: (1 - r^{k+1})/(1-r) + r^{k+1} = (1 - r^{k+2})/(1-r).',
   'That is the formula at n = k+1, so it holds for all n >= 0. QED.'],
  why:'base case n=0, assume the k-case, add r^{k+1}, simplify over a common denominator to the (k+1) formula.',
  missions:[
   {text:'Assemble the geometric-series proof correctly.', xp:25, check:s=>s.solved},
   {text:'In at most 2 checks.', xp:20, check:s=>s.solved&&s.checks<=2}],
});
INTERACTIVES.pfFlawHorses = (stage, api) => pickOne(stage, api, {
  prompt:'Fake theorem: "all horses are the same color." One inductive step is secretly false for a specific value of k. Click the flawed step.',
  label:'CLICK THE FLAWED STEP',
  numbered:true,
  cards:[
   {html:'Base case: any set of 1 horse is trivially all the same color.', no:'This is genuinely true - a single horse matches itself. The flaw is in the step, not the base.'},
   {html:'Inductive hypothesis: assume any set of k horses are all the same color.', no:'This is just stating the hypothesis - legitimate. The break happens when we USE it below.'},
   {html:'Take k+1 horses; remove one to get a set of k, all the same color by hypothesis.', no:'This part is fine - dropping one leaves k horses, covered by the hypothesis.'},
   {html:'Put it back, remove a different one - again k horses, all the same color.', no:'Also fine on its own - another valid k-set.'},
   {html:'The two overlapping k-sets share a horse, so all k+1 must match.', no:'This looks convincing but is the flaw: at k+1 = 2 the two 1-horse sets share NO horse, so nothing forces them to match. Click it once you are sure.'},
   {html:'By induction, all horses are the same color. QED.', no:'This is the false conclusion, but only because step 5 is invalid. The ROOT flaw is the overlap claim in step 5.'}],
  answer:4,
  why:'Step 5 is the culprit. The overlap argument needs the two k-horse subsets to share at least one horse so color can transfer. But when \\(k+1=2\\), each subset holds a SINGLE horse and they overlap in none - so the two horses are never linked. The inductive step fails at that one value of k, and a step that fails for even one k voids the entire chain.',
  missions:[
   {text:'Find the flawed step.', xp:25, check:s=>s.found},
   {text:'Spot it on your first click.', xp:20, check:s=>s.found&&s.attempts===1}],
});

/* ================================================================
   LESSON 4 - proof-counterexample : Counterexample Hunting & Repair
   ================================================================ */
registerLesson({
  id:'proof-counterexample', world:'pre', order:33, emoji:'🔍', title:'Counterexample Hunting & Conjecture Repair',
  sub:'One counterexample kills a "for all" claim outright. No pile of confirming examples can ever prove one. Then repair the claim by strengthening its hypotheses.',
  learn:`<p>There is a deep asymmetry between the two quantifiers. To <em>disprove</em> a universal claim you need exactly one bad case; to <em>prove</em> it you need an argument covering every case.</p>
  <div class="formula">$$\\exists x:\\ \\lnot P(x) \\;\\Longrightarrow\\; \\lnot\\big(\\forall x\\, P(x)\\big)$$</div>
  <p><strong>A single counterexample refutes a \\(\\forall\\) claim, permanently.</strong> "Every prime is odd" dies the instant you say <em>2</em>. And symmetrically: a thousand confirming examples <em>never</em> prove a universal - "every prime is odd" survived 3, 5, 7, 11, 13... right up until 2 killed it. Examples build confidence, not proof.</p>
  <p><strong>Where counterexamples hide - the edge cases.</strong> Bad cases love the boundary: \\(0\\), \\(1\\), negative numbers, the empty set, ties, the very first term. "\\(n^2 > n\\) for all integers \\(n\\)" looks obvious until you try \\(n=0\\) (\\(0>0\\)? no) and \\(n=1\\) (\\(1>1\\)? no). Always probe the extremes first.</p>
  <p><strong>Conjecture repair.</strong> A dead conjecture is often 90% right. Instead of discarding it, <em>strengthen the hypothesis</em> to exclude the bad cases: "\\(n^2>n\\) for all integers \\(n\\)" repairs to "for all integers \\(n\\ge 2\\)." This is how real mathematics moves - claim, counterexample, refine - a loop Lakatos called <em>proofs and refutations</em>.</p>
  <p>Three ML "rules of thumb" that a single counterexample repairs:</p>
  <div class="formula">$$\\text{more parameters always overfit} \\;\\xrightarrow{\\ \\text{double descent}\\ }\\; \\text{false}$$</div>
  <p>Bigger-than-data models can generalize <em>better</em> past the interpolation point. "Gradient descent always decreases the loss" fails when the learning rate is too large (it can diverge). "Correlation \\(0\\Rightarrow\\) independent" fails for \\(y=x^2\\) on symmetric data: zero correlation, yet fully dependent.</p>`,
  ml:`Counterexample-hunting is the core skill of reading ML critically. Every "X always helps" claim is a universal begging for a counterexample, and the famous results are often exactly those refutations: <b>double descent</b> refutes "more parameters always overfit"; adversarial examples refute "high test accuracy means robust"; \\(y=x^2\\) refutes "zero correlation means independence" (ties directly to World 3's covariance lesson). When you design an experiment, you are counterexample-hunting your own hypothesis - probing edge cases (tiny batches, extreme learning rates, degenerate data) is where models break and where the honest \\(\\forall\\) claim gets narrowed to the \\(\\forall n\\ge 2\\) version that is actually true.`,
  deeper:[
   {title:'😵 Stuck? Where to look first', body:'When hunting a counterexample, attack the boundary before the interior: \\(0\\), \\(1\\), \\(-1\\), the empty set, a single-element set, equal inputs, the largest/smallest allowed value. Most false universals fail at an extreme the author did not picture. If small cases all pass, only THEN suspect the claim might be true and switch to proving it. (Polya, "How to Solve It" - "examine special cases".)'},
   {title:'🚀 Go deeper: proofs and refutations', body:'Lakatos told the history of Euler\'s polyhedron formula \\(V-E+F=2\\) as a running battle: a conjecture, a weird counterexample (a picture frame, a hollow cube), then a repaired conjecture with an extra hypothesis ("simply connected"), then a new counterexample, and so on. Mathematics is not handed down finished - it is this loop of claim, refutation, and repair. A counterexample is not a failure; it is the most useful thing that can happen to a conjecture. (Lakatos, "Proofs and Refutations".)'},
   {title:'🚀 Go deeper: refuting vs proving are asymmetric', body:'To refute \\(\\forall x\\,P(x)\\), exhibit one \\(x\\) with \\(\\lnot P(x)\\) - a finite, checkable object. To prove it, argue over all \\(x\\) at once. That is why bug-hunting (find one failing input) is easy to communicate but correctness (works on all inputs) needs a proof or exhaustive test. Dually, to PROVE \\(\\exists x\\,P(x)\\) you exhibit a witness; to refute it you must argue no x works. Know which quantifier you face and you know which job you have. (Velleman, "How to Prove It", ch. 2 on quantifier negation.)'}],
  labs:[
   {key:'prime', title:'Hunt the counterexample', interactive:'pfHuntPrime',
    intro:'<p>Claim: "every prime number is odd." Exactly one of the numbers below refutes it. Click the counterexample.</p>'},
   {key:'repair', title:'Repair the conjecture', interactive:'pfRepair',
    intro:'<p>The claim "\\(n^2 > n\\) for all integers \\(n\\)" is false (try \\(n=0,1\\)). Pick the repair that strengthens the hypothesis to make it true - without over-restricting.</p>'},
   {key:'ml', title:'Which ML rule does double descent kill?', interactive:'pfHuntML',
    intro:'<p>Double descent is a celebrated counterexample. Click the universal ML "rule of thumb" that it refutes.</p>'}],
  quiz:[
   {q:'To DISPROVE "\\(\\forall x\\, P(x)\\)" you need...', opts:['One counterexample: a single x with P(x) false','A proof that P holds for all x','Infinitely many failing x','At least half of the x to fail'], a:0,
    tag:'one counterexample refutes', focus:'A universal is refuted by a single failing case - that lone x makes "for all" false.',
    why:'\\(\\forall x\\,P(x)\\) claims no exceptions, so producing ONE \\(x\\) with \\(\\lnot P(x)\\) is a complete refutation.',
    wrong:{1:'Proving P for all x would ESTABLISH the claim, not disprove it.',2:'One failing case already suffices - you never need infinitely many.',3:'There is no "majority" threshold; a single exception is fatal to a universal.'}},
   {q:'Why does confirming a universal claim on many examples NOT prove it?', opts:['Examples cover only tested cases; an untested one could be the exception','Examples always prove universals','Because the examples might be rounded','Because P is definitely false'], a:0,
    tag:'examples never prove', focus:'Confirming instances raise confidence but leave untested cases open - the exception may be one you did not try.',
    why:'"Every prime is odd" passed 3, 5, 7, 11... yet 2 refutes it. Confirming cases never certify the untested ones - a universal needs a general argument.',
    wrong:{1:'They do not - a universal can fail on the first case you skip.',2:'Rounding is irrelevant; the gap is logical, not numerical.',3:'P need not be false; the point is examples cannot certify it either way.'}},
   {q:'When hunting a counterexample, the smartest places to look FIRST are...', opts:['Edge cases: 0, 1, negatives, the empty set, ties','Only very large numbers','Only the middle of the range','Random deep-interior values'], a:0,
    tag:'edge cases', focus:'False universals usually break at the boundary - probe 0, 1, negatives, empty set before the interior.',
    why:'Most false universals fail at an extreme the author overlooked: \\(0\\), \\(1\\), a negative, an empty or singleton set, a tie. Probe the boundary first.',
    wrong:{1:'Large values are worth trying, but the classic breaks are at small boundary cases like 0 and 1.',2:'The middle of the range is where claims usually LOOK true; failures hide at the edges.',3:'Random interior values are less efficient than deliberately testing the known trouble spots.'}},
   {type:'order', q:'Arrange the counterexample-hunting and repair procedure for a suspicious universal claim:',
    tag:'conjecture repair', focus:'Note it is universal, probe edge cases, find one failure, declare it false, then strengthen the hypothesis to exclude that case.',
    steps:[
     'Read the claim and note it is a universal ("for all") statement.',
     'Probe small and edge cases first: 0, 1, negatives, the empty set.',
     'Find one specific case where the statement fails.',
     'Conclude the universal is false - a single counterexample suffices.',
     'Repair it by adding a hypothesis that excludes the bad case.'],
    why:'recognize the universal, attack the edges, exhibit one failure to kill it, then strengthen the hypothesis so the repaired claim excludes exactly that counterexample.'},
   {q:'"More parameters than data points ALWAYS means worse test error." This universal is refuted by...', opts:['Double descent - huge models can generalize better past the interpolation point','The chain rule','The base case of induction','Nothing - it is a theorem'], a:0,
    tag:'double descent', focus:'Double descent: test error can fall again once the model is large enough to interpolate - a real counterexample.',
    why:'Double descent shows test error can DROP again once a model is large enough to interpolate the data, directly refuting "bigger always overfits."',
    wrong:{1:'The chain rule is a calculus tool, not a counterexample to a generalization claim.',2:'Base cases belong to induction, not to refuting this claim.',3:'It is emphatically not a theorem - double descent is the counterexample that killed this folk rule.'}},
   {q:'"Correlation \\(=0\\) implies the variables are independent." A clean counterexample is...', opts:['\\(y=x^2\\) with x symmetric about 0: zero correlation but total dependence','Two independent coin flips','\\(y = 2x\\) exactly','A constant y'], a:0,
    tag:'correlation zero independence', focus:'Zero correlation only rules out LINEAR association; y = x^2 is perfectly dependent yet uncorrelated.',
    why:'For \\(y=x^2\\) with symmetric \\(x\\), the correlation is 0 (no linear trend) yet \\(y\\) is completely determined by \\(x\\) - dependent. Correlation measures only linear association. (Ties to World 3 covariance.)',
    wrong:{1:'Independent coin flips are BOTH uncorrelated and independent - they satisfy the claim, so they are not a counterexample.',2:'\\(y=2x\\) has correlation 1, not 0 - irrelevant to the claim.',3:'A constant y has zero variance and does not demonstrate the correlation-vs-independence gap.'}},
   {type:'numeric', q:'What is the smallest prime that is a counterexample to "every prime is odd"?',
    answer:2, tol:0, tag:'one counterexample refutes',
    focus:'The only even prime is 2; it refutes "every prime is odd" and is the smallest prime overall.',
    hint:'Which prime is even? It is also the smallest prime.',
    why:'2 is prime and even, so it refutes "every prime is odd." It is also the smallest prime - one counterexample is enough to kill the universal.'},
   {q:'"Gradient descent always decreases the loss." The standard counterexample is...', opts:['A learning rate too large, so a step overshoots and the loss increases (or diverges)','A loss with no minimum','Using too little data','A convex loss'], a:0,
    tag:'edge cases', focus:'With an over-large step size, GD can overshoot the valley and increase the loss - the "always" fails.',
    why:'If the learning rate exceeds the stable range, a GD step overshoots the minimum and the loss can go UP or diverge - refuting "always decreases." The repaired claim adds a small-enough step-size hypothesis.',
    wrong:{1:'Even with a well-defined minimum, too large a step still overshoots - the counterexample is about step size.',2:'Data quantity does not make a single GD step increase the loss; the step size does.',3:'A convex loss is exactly where GD works well with a small step - not a counterexample.'}}],
});
INTERACTIVES.pfHuntPrime = (stage, api) => pickOne(stage, api, {
  prompt:'Claim: "every prime number is odd." Click the one value below that is a counterexample.',
  label:'CLICK THE COUNTEREXAMPLE',
  cards:[
   {html:'3', no:'3 is an odd prime - it CONFIRMS the claim, so it cannot refute it.'},
   {html:'5', no:'5 is an odd prime - a confirming case, not a counterexample.'},
   {html:'2', no:'placeholder'},
   {html:'7', no:'7 is an odd prime - confirming, not refuting.'},
   {html:'9', no:'9 = 3x3 is odd but NOT prime, so it is not even an instance of the claim (which is about primes). Not a counterexample.'}],
  answer:2,
  why:'2 is prime AND even, so it is a prime that is not odd - a genuine counterexample that refutes "every prime is odd." (It is the only even prime.)',
  missions:[
   {text:'Find the counterexample.', xp:20, check:s=>s.found},
   {text:'Find it on your first click.', xp:20, check:s=>s.found&&s.attempts===1}],
});
INTERACTIVES.pfRepair = (stage, api) => pickOne(stage, api, {
  prompt:'The claim "\\(n^2 > n\\) for all integers \\(n\\)" is false: it fails at \\(n=0\\) (0 > 0?) and \\(n=1\\) (1 > 1?). Click the repair that makes it TRUE without over-restricting.',
  label:'CLICK THE BEST REPAIR',
  cards:[
   {html:'for all integers n &gt;= 2', no:'placeholder'},
   {html:'for all integers n &gt;= 0', no:'This still includes n = 0 and n = 1, where 0 &gt; 0 and 1 &gt; 1 both fail. It does not fix the counterexamples.'},
   {html:'for all real numbers n', no:'This makes it WORSE - now fractions like n = 0.5 (0.25 &gt; 0.5 is false) and negatives fail too. Widening the domain adds counterexamples.'},
   {html:'for all integers n &gt;= 1', no:'This still includes n = 1, where 1 &gt; 1 is false. One counterexample survives, so the repair is insufficient.'}],
  answer:0,
  why:'"for all integers \\(n\\ge 2\\)" excludes exactly the failing cases 0 and 1, and for every integer \\(n\\ge 2\\) we do have \\(n^2>n\\). It strengthens the hypothesis just enough - the essence of conjecture repair.',
  missions:[
   {text:'Pick the correct repair.', xp:25, check:s=>s.found},
   {text:'Get it on the first click.', xp:20, check:s=>s.found&&s.attempts===1}],
});
INTERACTIVES.pfHuntML = (stage, api) => pickOne(stage, api, {
  prompt:'Double descent is a famous empirical counterexample. Click the universal ML "rule of thumb" that it refutes.',
  label:'CLICK THE CLAIM DOUBLE DESCENT KILLS',
  cards:[
   {html:'"More parameters than training points always means worse test error."', no:'placeholder'},
   {html:'"Gradient descent always decreases the training loss."', no:'This IS false, but its counterexample is an over-large learning rate, not double descent. Double descent is about model SIZE vs generalization.'},
   {html:'"Zero correlation always implies independence."', no:'Also false, but refuted by examples like y = x^2 - a covariance fact, not a model-capacity one. Double descent targets a different claim.'}],
  answer:0,
  why:'Double descent shows that as a model grows PAST the interpolation threshold, test error can fall again - so "bigger than the data always overfits / always means worse test error" is false. It is specifically a model-capacity counterexample.',
  missions:[
   {text:'Identify the refuted claim.', xp:20, check:s=>s.found},
   {text:'Get it on your first click.', xp:20, check:s=>s.found&&s.attempts===1}],
});
