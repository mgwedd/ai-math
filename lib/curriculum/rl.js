/* ================================================================
   WORLD 4 — REINFORCEMENT LEARNING (intro arc, 3 lessons).
   ----------------------------------------------------------------
   Slots AFTER trees/eval (order 100-102) at order 103/104/105.
   Prereq: la-markov (transition matrices / stationary distributions)
   is shipped; this arc cashes it in.

   The arc:
     rl-mdp       MDPs, value functions, the Bellman optimality
                  equation, value iteration (a known model P, R).
     rl-qlearning model-free TD control: Q-learning, the TD error,
                  off-policy learning, exploration vs exploitation.
     rl-policy    why tables do not scale -> softmax policies +
                  REINFORCE (Williams 1992) -> the RLHF objective
                  reward - beta*KL as an intuition-level bridge.

   Same registries + schema as every other world. Canvas/DOM code
   lives ONLY inside INTERACTIVES render functions, so the module
   imports cleanly in node. String delimiters are ASCII ' / backtick.
   ================================================================ */
import { INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, slider, chips, clearBg, registerCleanup } from '../engine.js';

/* NOTE (KB spine, PR #53): once the concept registry lands, register
   these concept ids so the q.tags below resolve — markov-decision-process,
   bellman-equation, value-iteration, temporal-difference-learning,
   q-learning, exploration-exploitation, policy-gradient, rlhf. */

/* ================================================================
   PURE MDP HELPERS (no DOM — safe at module load / under node).
   A 4x4 gridworld shared by lessons 1 and 2:
     ★ goal (+1) top-right, ☠ pit (-1) just below it, one WALL,
     start bottom-left. Actions: up, down, left, right.
   ================================================================ */
const GW = { R:4, C:4, goal:[0,3], pit:[1,3], walls:[[1,2]], start:[3,0] };
const ACTS = [[-1,0],[1,0],[0,-1],[0,1]];   // up, down, left, right (row,col deltas)
const ANAME = ['up','down','left','right'];
const PERP = [[2,3],[2,3],[0,1],[0,1]];     // perpendicular action indices per action

const isWall = (r,c)=>GW.walls.some(w=>w[0]===r&&w[1]===c);
const isGoal = (r,c)=>r===GW.goal[0]&&c===GW.goal[1];
const isPit  = (r,c)=>r===GW.pit[0]&&c===GW.pit[1];
const isTerm = (r,c)=>isGoal(r,c)||isPit(r,c);
const reward = (r,c)=>isGoal(r,c)?1:isPit(r,c)?-1:0;

// Deterministic move (bumping a wall / edge keeps you in place).
function stepCell(r,c,a){
  const nr=r+ACTS[a][0], nc=c+ACTS[a][1];
  if(nr<0||nr>=GW.R||nc<0||nc>=GW.C||isWall(nr,nc)) return [r,c];
  return [nr,nc];
}
// Noisy transition model P(s'|s,a): 0.8 intended, 0.1 each perpendicular.
// This IS a per-action column of a Markov transition matrix (la-markov).
function transitions(r,c,a){
  const acc={};
  const add=(cell,p)=>{ const k=cell[0]+','+cell[1]; acc[k]=(acc[k]||0)+p; };
  add(stepCell(r,c,a),0.8);
  add(stepCell(r,c,PERP[a][0]),0.1);
  add(stepCell(r,c,PERP[a][1]),0.1);
  return Object.entries(acc).map(([k,p])=>{ const [r2,c2]=k.split(',').map(Number); return [r2,c2,p]; });
}
function qOfAction(V,r,c,a,gamma){ // Q(s,a) = r(s) + gamma * sum_s' P V(s^{\prime})
  let s=0; for(const [r2,c2,p] of transitions(r,c,a)) s+=p*V[r2][c2];
  return reward(r,c)+gamma*s;
}
function initV(){ // terminals pinned to their reward, everything else 0
  const V=[]; for(let r=0;r<GW.R;r++){ V.push([]); for(let c=0;c<GW.C;c++) V[r].push(isTerm(r,c)?reward(r,c):0); }
  return V;
}
// One synchronous Bellman-optimality backup: V(s) <- max_a Q(s,a). Returns the
// new V and the residual (max change) — the thing that shrinks by gamma each sweep.
function bellmanSweep(V,gamma){
  const nV=V.map(row=>row.slice()); let residual=0;
  for(let r=0;r<GW.R;r++)for(let c=0;c<GW.C;c++){
    if(isWall(r,c)){ nV[r][c]=0; continue; }
    if(isTerm(r,c)){ nV[r][c]=reward(r,c); continue; }
    let best=-Infinity;
    for(let a=0;a<4;a++){ let s=0; for(const [r2,c2,p] of transitions(r,c,a)) s+=p*V[r2][c2]; if(s>best)best=s; }
    nV[r][c]=gamma*best; // reward(non-terminal)=0
    residual=Math.max(residual, Math.abs(nV[r][c]-V[r][c]));
  }
  return { V:nV, residual };
}
function solveV(gamma,iters){ let V=initV(); for(let k=0;k<(iters||400);k++) V=bellmanSweep(V,gamma).V; return V; }
function greedyAction(V,r,c,gamma){
  let best=-Infinity, ba=0;
  for(let a=0;a<4;a++){ const q=qOfAction(V,r,c,a,gamma); if(q>best){best=q;ba=a;} }
  return ba;
}
function argmax(arr){ let b=0; for(let i=1;i<arr.length;i++) if(arr[i]>arr[b]) b=i; return b; }

/* ---------- shared canvas helpers ---------- */
const FONT = ()=>getComputedStyle(document.body).fontFamily;
function vFill(v){
  const t=Math.max(-1,Math.min(1,v));
  return t>=0 ? 'rgba(45,212,160,'+(0.10+0.60*t).toFixed(3)+')'
              : 'rgba(255,92,122,'+(0.10+0.60*(-t)).toFixed(3)+')';
}
function paintCell(ctx,px,py,cell,r,c,fill){
  if(isWall(r,c)) ctx.fillStyle='#242a40';
  else if(isGoal(r,c)) ctx.fillStyle='rgba(45,212,160,.9)';
  else if(isPit(r,c)) ctx.fillStyle='rgba(255,92,122,.9)';
  else ctx.fillStyle=fill;
  ctx.fillRect(px,py,cell,cell);
  ctx.strokeStyle='rgba(255,255,255,.14)'; ctx.lineWidth=1.5; ctx.strokeRect(px,py,cell,cell);
  ctx.textAlign='center';
  if(isGoal(r,c)){ ctx.fillStyle='#04160f'; ctx.font='bold 20px '+FONT(); ctx.fillText('★',px+cell/2,py+24);
    ctx.font='bold 12px '+FONT(); ctx.fillText('+1',px+cell/2,py+cell-9); }
  else if(isPit(r,c)){ ctx.fillStyle='#1a0308'; ctx.font='bold 19px '+FONT(); ctx.fillText('☠',px+cell/2,py+25);
    ctx.font='bold 12px '+FONT(); ctx.fillText('-1',px+cell/2,py+cell-9); }
  else if(isWall(r,c)){ ctx.fillStyle='#5a6288'; ctx.font='bold 11px '+FONT(); ctx.fillText('WALL',px+cell/2,py+cell/2+4); }
  ctx.textAlign='left';
}
function drawPolicyArrow(ctx,cx,cy,a,len,w,color){
  const dx=ACTS[a][1], dy=ACTS[a][0];
  const ex=cx+dx*len, ey=cy+dy*len;
  ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=w;
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(ex,ey); ctx.stroke();
  const h=Math.min(8,len*0.5);
  ctx.beginPath(); ctx.moveTo(ex,ey);
  ctx.lineTo(ex-dx*h-dy*h*0.5, ey-dy*h+dx*h*0.5);
  ctx.lineTo(ex-dx*h+dy*h*0.5, ey-dy*h-dx*h*0.5);
  ctx.closePath(); ctx.fill();
}

/* ================================================================
   LESSON 1 — rl-mdp : MDPs, value functions & the Bellman equation
   ================================================================ */
registerLesson({
  id:'rl-mdp', world:'ml', order:103, emoji:'\u{1F3B2}', title:'MDPs & Value: Planning with a Known World',
  sub:'States, actions, rewards, and a discount. The value of a state is the reward you can expect to collect from it — and the Bellman equation lets you solve for it.',
  learn:`<p>Reinforcement learning studies an <strong>agent</strong> that acts in an environment, collects <strong>reward</strong>, and tries to maximize the total it gathers over time. The standard model is a <strong>Markov Decision Process (MDP)</strong> — five pieces:</p>
  <ul style="line-height:1.9">
    <li><strong>States</strong> \\(s \\in S\\) — where the agent can be (here, cells of a grid).</li>
    <li><strong>Actions</strong> \\(a \\in A\\) — what it can do (up / down / left / right).</li>
    <li><strong>Transitions</strong> \\(P(s' \\mid s, a)\\) — the probability of landing in \\(s'\\) after taking \\(a\\) in \\(s\\). This is exactly a <strong>Markov transition matrix</strong> (la-markov), one column per (state, action): the next state depends only on the current one, not the whole history.</li>
    <li><strong>Reward</strong> \\(r(s)\\) — a number collected for being in a state (+1 at the goal, \\(-1\\) in the pit, 0 elsewhere).</li>
    <li><strong>Discount</strong> \\(\\gamma \\in [0,1)\\) — how much a reward one step later is worth now.</li>
  </ul>
  <p>A <strong>policy</strong> \\(\\pi\\) maps states to actions. Its <strong>value function</strong> is the expected discounted return you collect by following it from \\(s\\):</p>
  <div class="formula">$$V^{\\pi}(s) = \\mathbb{E}_{\\pi}\\!\\left[\\, \\sum_{k=0}^{\\infty} \\gamma^{k}\\, r_{t+k} \\,\\Big|\\, s_t = s \\right]$$</div>
  <p>The discount is doing real work: \\(\\gamma\\) close to 1 means the agent plans far ahead (a distant goal is still worth chasing); \\(\\gamma\\) near 0 makes it myopic (only nearby reward counts). Because \\(\\gamma < 1\\), the infinite sum is <em>finite</em>.</p>
  <p>The best you can do is the <strong>optimal value</strong> \\(V^{*}\\), and it satisfies the <strong>Bellman optimality equation</strong> — the value of a state is the reward there plus the discounted value of the best action's expected next state:</p>
  <div class="formula">$$V(s) = \\max_{a} \\left[\\, r + \\gamma \\sum_{s^{\prime}} P(s' \\mid s, a)\\, V(s^{\prime}) \\right]$$</div>
  <p>This is a fixed-point equation: \\(V\\) appears on both sides. <strong>Value iteration</strong> solves it by turning it into an update — start with \\(V=0\\), then repeatedly apply the right-hand side as a <em>backup</em>. Each full pass is one <strong>sweep</strong>. The largest change across a sweep is the <strong>residual</strong>; watch it shrink toward zero.</p>
  <p><strong>V versus Q.</strong> \\(V(s)\\) scores a <em>state</em>; the closely-related <strong>action value</strong> \\(Q(s,a) = r + \\gamma \\sum_{s^{\prime}} P(s'\\mid s,a)\\,V(s^{\prime})\\) scores a <em>state-action pair</em>. Value iteration computes \\(Q\\) for every action internally and keeps the max as \\(V\\). Once \\(V\\) has converged, the <strong>greedy policy</strong> \\(\\pi(s) = \\arg\\max_a Q(s,a)\\) reads straight off it — those are the arrows you will extract in the lab.</p>`,
  ml:`MDPs are the backbone of every RL system, from game-playing agents to robot control to the RL step in training a chatbot. The value function is the object a model spends its compute estimating: AlphaGo/AlphaZero learn a value network that scores board positions exactly like \\(V(s)\\); actor-critic methods learn a "critic" that is a value function. And the transition matrix \\(P(s'\\mid s,a)\\) is the same column-stochastic object you met in Markov chains — RL just adds a choice of action and a reward on top. Planning when you <em>know</em> \\(P\\) and \\(R\\) (this lesson) is the warm-up; the next lesson drops that assumption.`,
  deeper:[
   {title:'\u{1F635} Stuck? V(s) vs Q(s,a)', body:'\\(V(s)\\) answers "how good is it to be HERE, then act well?" \\(Q(s,a)\\) answers "how good is it to be here and take THIS action, then act well?" They are linked: \\(V(s) = \\max_a Q(s,a)\\), and \\(Q(s,a) = r + \\gamma \\sum_{s\'} P(s\'\\mid s,a) V(s\')\\). Value iteration works with V but needs the Q of each action to take the max; the greedy policy \\(\\arg\\max_a Q\\) is what you actually execute. Next lesson learns Q directly, without ever knowing P — which is why Q is the star there.'},
   {title:'\u{1F680} Go deeper: why value iteration converges (the gamma-contraction)', body:'The Bellman optimality backup is a <em>contraction</em> in the sup-norm: if you apply it to two different value tables, the maximum gap between them shrinks by a factor of \\(\\gamma\\) every sweep. By the Banach fixed-point theorem, a contraction has a unique fixed point and iterating converges to it geometrically — the residual you watch falls like \\(\\gamma^k\\). This is exactly why \\(\\gamma < 1\\) matters: at \\(\\gamma = 1\\) the backup is no longer a contraction and convergence is not guaranteed. Sutton & Barto, <em>Reinforcement Learning: An Introduction</em> (2nd ed., 2018), Ch. 4 (Dynamic Programming).'},
   {title:'\u{1F680} Go deeper: Bellman 1957 and the curse of dimensionality', body:'The recursive decomposition "value now = reward now + discounted value of what comes next" is Richard Bellman\'s <em>principle of optimality</em>, from <em>Dynamic Programming</em> (Bellman, 1957) — the same book that coined "curse of dimensionality" for why a table over all states blows up as the state space grows. Value iteration is tractable on a 16-cell grid; it is hopeless on a chessboard, which is precisely the pressure that pushes RL toward function approximation (lesson 3).'},
   {title:'\u{1F680} Go deeper: the transition matrix connection', body:'Fix a policy \\(\\pi\\) and the MDP collapses to a plain Markov chain: the action at each state is determined, so \\(P(s\'\\mid s,\\pi(s))\\) is a single column-stochastic transition matrix (la-markov). Policy evaluation — computing \\(V^\\pi\\) — is then solving the linear system \\(V^\\pi = r + \\gamma P_\\pi V^\\pi\\), i.e. \\((I - \\gamma P_\\pi)V^\\pi = r\\). Value iteration is the iterative alternative to inverting that matrix, and it interleaves a max over actions between chain steps.'}],
  labs:[
   {key:'grid', title:'Gridworld, values & the discount', interactive:'rlGrid',
    intro:'<p>The optimal value \\(V^{*}(s)\\) of every cell is shown as a heatmap (green = valuable, red = dangerous) with its number. Click a cell to move the agent there, then press <b>Step</b> to let it follow the value-greedy policy toward the \\u2605 goal. Then work the <b>\\u03b3</b> slider: watch how the discount decides how far the goal\\u2019s pull reaches.</p>'},
   {key:'vi', title:'Value iteration: make the Bellman backup visible', interactive:'rlValueIter',
    intro:'<p>Now build \\(V\\) yourself. Everything starts at 0 (except the pinned terminals). Each press of <b>Sweep</b> applies one Bellman backup \\(V(s)\\!\\leftarrow\\!\\max_a[r+\\gamma\\sum P\\,V]\\) to every cell; the <b>residual</b> is the largest change that sweep. Watch it collapse, then reveal the <b>greedy policy</b> arrows.</p>'},
  ],
  quiz:[
   {q:'In an MDP, the transition function \\(P(s\' \\mid s, a)\\) encodes…', opts:['The probability of the next state given the current state and chosen action','The reward collected in each state','The agent\'s policy','The discount factor'], a:0,
    tag:'markov-decision-process', focus:'P(s\'|s,a) is a Markov transition matrix with one column per (state,action): next state depends only on the current state and action.',
    why:'\\(P(s\'\\mid s,a)\\) is the environment\'s dynamics — a Markov transition matrix indexed by the action. It says nothing about reward, policy, or discount; those are separate pieces of the MDP.',
    wrong:{1:'Reward is the separate function \\(r(s)\\) (or \\(r(s,a)\\)). Transitions are about <i>where you land</i>, not <i>what you collect</i>.',2:'The policy \\(\\pi\\) is the agent\'s choice of action; \\(P\\) is the environment\'s response to that choice — a property of the world, not the agent.',3:'The discount \\(\\gamma\\) is a single scalar in [0,1); \\(P\\) is a whole probability distribution over next states.'}},
   {q:'A high discount factor \\(\\gamma\\) close to 1 makes the agent…', opts:['Care only about immediate reward','Weigh distant future rewards almost as much as immediate ones','Ignore the goal entirely','Move faster on the grid'], a:1,
    tag:'markov-decision-process', focus:'gamma multiplies each future reward by gamma^k. Near 1 keeps far rewards heavy (far-sighted); near 0 crushes them (myopic).',
    why:'A reward \\(k\\) steps away is worth \\(\\gamma^{k}\\) now. With \\(\\gamma\\) near 1, \\(\\gamma^{k}\\) stays large even for big \\(k\\), so the agent plans far ahead; with \\(\\gamma\\) near 0 only the next reward matters.',
    wrong:{0:'That is <i>small</i> \\(\\gamma\\) (myopic). Near 1, distant rewards keep almost their full weight.',2:'The goal is still worth chasing — more so, in fact. High \\(\\gamma\\) is what lets a far goal reach back and raise the value of distant cells.',3:'\\(\\gamma\\) changes what the agent <i>values</i>, not the physics of movement. Each step is still one cell.'}},
   {q:'What is the difference between \\(V(s)\\) and \\(Q(s,a)\\)?', opts:['They are the same thing','V scores a state (acting well thereafter); Q scores a state together with a specific action','Q is always larger than V','V is model-free, Q needs the model'], a:1,
    tag:'bellman-equation', focus:'V(s)=max_a Q(s,a). V rates a state; Q rates a state-action pair. The greedy policy is argmax_a Q.',
    why:'\\(Q(s,a)\\) fixes the first action, then assumes optimal play; \\(V(s) = \\max_a Q(s,a)\\) already optimizes that first action. Q carries the extra "which action" index that lets you read off a policy.',
    wrong:{0:'They are tightly linked but not equal: \\(V(s)=\\max_a Q(s,a)\\). Q has an extra action argument.',2:'For the optimal action \\(Q(s,a^*) = V(s)\\); for worse actions \\(Q < V\\). Q is never <i>larger</i> than V at the same state.',3:'Both can be model-based or model-free. The real distinction is that Q indexes an action, which is exactly why the next lesson learns Q without a model.'}},
   {q:'Value iteration repeatedly applies the Bellman backup \\(V(s)\\leftarrow\\max_a[r+\\gamma\\sum_{s^{\prime}}P\\,V(s^{\prime})]\\). Under what condition is convergence guaranteed?', opts:['Always, for any \\(\\gamma\\)','When \\(\\gamma < 1\\) (the backup is a \\(\\gamma\\)-contraction)','Only when the grid has no walls','Only if the policy is already optimal'], a:1,
    tag:'value-iteration', focus:'The backup is a sup-norm contraction with factor gamma; a unique fixed point and geometric convergence need gamma<1.',
    why:'The optimality backup shrinks the gap between any two value tables by a factor \\(\\gamma\\) each sweep, so it converges geometrically to a unique fixed point — but only because \\(\\gamma < 1\\). At \\(\\gamma = 1\\) it is no longer a contraction.',
    wrong:{0:'Not "always" — the guarantee rests on the \\(\\gamma\\)-contraction, which fails at \\(\\gamma = 1\\). Stating "always converges" is a folk theorem; the condition is real.',2:'Walls change the geometry but not the contraction argument. Convergence depends on \\(\\gamma\\), not the layout.',3:'Value iteration does not need to start from the optimal policy — it starts from \\(V=0\\) and converges regardless.'}},
   {q:'On the first Bellman sweep from \\(V=0\\) (terminals pinned to \\(\\pm 1\\)), which non-terminal cell is the first to gain positive value?', opts:['The start cell, far from the goal','The cell directly next to the \\u2605 goal','Every cell rises equally','No cell changes on the first sweep'], a:1,
    tag:'value-iteration', focus:'Value radiates outward one cell per sweep from the goal. Only a cell that can reach the goal in one step gains value first.',
    why:'A backup only lifts a cell if one of its actions already reaches a valued neighbor. On sweep 1 only the goal has value, so only the cell that can step into the goal (its neighbor) rises; value then radiates outward one ring per sweep.',
    wrong:{0:'The start cell is many steps away — its value stays 0 until the "wave" of value propagates back to it over several sweeps.',2:'Cells far from the goal cannot rise yet: their neighbors are all still 0. Only the goal-adjacent cell sees a valued neighbor on sweep 1.',3:'The goal-adjacent cell does change — its best action lands on the +1 goal, so it jumps to about \\(0.8\\gamma\\) on the very first sweep.'}},
   {q:'Once value iteration has converged, how do you extract the policy the agent should follow?', opts:['Pick the action that maximizes \\(Q(s,a)=r+\\gamma\\sum P\\,V(s^{\prime})\\) in each state','Pick a random action in each state','Pick the action toward the highest raw reward, ignoring \\(V\\)','Re-run the sweeps forever'], a:0,
    tag:'value-iteration', focus:'Greedy policy: pi(s)=argmax_a Q(s,a), using the converged V inside the one-step lookahead.',
    why:'The greedy policy is \\(\\pi(s)=\\arg\\max_a Q(s,a)\\), computing each \\(Q\\) as a one-step lookahead through \\(P\\) into the converged \\(V\\). Those are the arrows the lab draws.',
    wrong:{1:'Random actions ignore everything you computed. The whole point of \\(V\\) is to make a <i>good</i> choice at each state.',2:'Chasing raw immediate reward is myopic and can walk you straight past the pit. \\(V\\) already folds in the discounted future — use it.',3:'Re-running sweeps after convergence changes nothing (the residual is ~0). Extraction is a single greedy pass.'}},
   {type:'numeric', q:'A cell\'s best action reaches the \\u2605 goal (\\(V=+1\\)) with probability 0.8 and otherwise stays put (\\(V=0\\)) with probability 0.2. Non-terminal cells have reward 0. With \\(\\gamma = 0.9\\), what is \\(Q\\) for that action? \\(Q = r + \\gamma\\sum_{s^{\prime}}P\\,V(s^{\prime})\\).',
    answer:0.72, tol:0.005, unit:'',
    tag:'bellman-equation', focus:'Q = 0 + 0.9*(0.8*1 + 0.2*0). Plug the transition probabilities into the one-step lookahead.',
    hint:'r is 0 here. Compute the expected next value 0.8*1 + 0.2*0 = 0.8, then multiply by gamma = 0.9.',
    why:'\\(Q = 0 + 0.9\\,(0.8\\cdot 1 + 0.2\\cdot 0) = 0.9 \\times 0.8 = 0.72\\). This is exactly the value the goal-adjacent cell takes on the first sweep.'},
   {type:'order', q:'Put the steps of value iteration into the correct order.',
    steps:[
     'Initialize V(s)=0 for all states (pin terminal states to their reward)',
     'For every state and action, compute Q(s,a)=r+\\u03b3\\u00b7\\u03a3 P(s\\u2032|s,a)\\u00b7V(s\\u2032)',
     'Update each state to its best action: V(s) \\u2190 max over a of Q(s,a)',
     'Repeat the sweep until the residual (largest change) drops below tolerance',
     'Read off the greedy policy: \\u03c0(s)=argmax over a of Q(s,a)'],
    why:'Start from V=0, back up each state with a one-step lookahead, keep the max over actions, iterate until the contraction has converged, then extract the greedy policy.',
    tag:'value-iteration', focus:'Init -> compute Q per action -> take the max as the new V -> sweep to convergence -> extract argmax policy.'},
  ],
});

INTERACTIVES.rlGrid = function(stage, api){
  const L=makeLab(stage,{h:470});
  let gamma=0.9, V=solveV(gamma), agent=GW.start.slice(), reachedGoal=false, showPol=false;
  const cell=80, gx=40, gy=60;
  const M=api.missions([
    {text:'Click a cell, then press <b>Step</b> to walk the value-greedy policy into the ★ goal', xp:20,
     check:s=>s.reachedGoal},
    {text:'Raise <b>γ to 0.95 or more</b> — distant cells start "seeing" the goal (start-cell value &gt; 0.3)', xp:25,
     check:s=>s.gamma>=0.95 && s.vStart>0.3},
    {text:'Drop <b>γ to 0.6 or below</b> — the goal’s pull collapses to nearby cells (start-cell value &lt; 0.1)', xp:20,
     check:s=>s.gamma<=0.6 && s.vStart<0.1},
  ]);
  function draw(){
    const ctx=L.ctx; clearBg(ctx,L.W,L.H);
    for(let r=0;r<GW.R;r++)for(let c=0;c<GW.C;c++){
      const px=gx+c*cell, py=gy+r*cell;
      paintCell(ctx,px,py,cell,r,c,vFill(V[r][c]));
      if(!isWall(r,c)&&!isTerm(r,c)){
        ctx.fillStyle='#e8ecff'; ctx.font='700 15px '+FONT(); ctx.textAlign='center';
        ctx.fillText(V[r][c].toFixed(2), px+cell/2, py+cell/2+5); ctx.textAlign='left';
        if(showPol){ const a=greedyAction(V,r,c,gamma);
          drawPolicyArrow(ctx,px+cell/2,py+cell-16,a,15,3,'rgba(124,92,255,.95)'); }
      }
    }
    const [ar,ac]=agent;
    ctx.fillStyle='#00d4ff'; ctx.strokeStyle='#0b0f22'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(gx+ac*cell+cell/2, gy+ar*cell+cell/2, 15, 0, 7); ctx.fill(); ctx.stroke();
    ctx.textAlign='left'; ctx.fillStyle='#8b93b8'; ctx.font='12px '+FONT();
    ctx.fillText('γ = '+gamma.toFixed(2), gx, 40);
    ctx.fillText('green = high value · red = danger', gx+120, 40);
    L.readout.innerHTML='γ = '+gamma.toFixed(2)+' &nbsp; V(start) = <b>'+V[GW.start[0]][GW.start[1]].toFixed(3)+'</b>'+
      '<br>agent at ('+ar+','+ac+')'+(isGoal(ar,ac)?' &nbsp;<b style="color:#2dd4a0">★ reached the goal!</b>':'');
    M.update({gamma, vStart:V[GW.start[0]][GW.start[1]], reachedGoal});
  }
  function stepAgent(){
    let [r,c]=agent;
    if(isTerm(r,c)){ agent=GW.start.slice(); reachedGoal=false; draw(); return; }
    const a=greedyAction(V,r,c,gamma);
    const ts=transitions(r,c,a); let u=Math.random(), acc=0, dest=ts[0];
    for(const t of ts){ acc+=t[2]; if(u<=acc){ dest=t; break; } }
    agent=[dest[0],dest[1]];
    if(isGoal(agent[0],agent[1])) reachedGoal=true;
    draw();
  }
  L.canvas.addEventListener('pointerdown',e=>{
    const p=L.toCanvas(e); const c=Math.floor((p.x-gx)/cell), r=Math.floor((p.y-gy)/cell);
    if(r>=0&&r<GW.R&&c>=0&&c<GW.C&&!isWall(r,c)&&!isTerm(r,c)){ agent=[r,c]; draw(); }
  });
  const row=document.createElement('div'); row.className='ctrl';
  const stepBtn=document.createElement('button'); stepBtn.className='btn'; stepBtn.textContent='Step ▶';
  stepBtn.style.marginRight='8px'; stepBtn.onclick=stepAgent;
  const resetBtn=document.createElement('button'); resetBtn.className='btn ghost'; resetBtn.textContent='Reset agent';
  resetBtn.onclick=()=>{ agent=GW.start.slice(); reachedGoal=false; draw(); };
  row.appendChild(stepBtn); row.appendChild(resetBtn); L.ctrl.appendChild(row);
  slider(L.ctrl,'γ — discount factor',0.5,0.99,0.01,0.9,v=>v.toFixed(2),v=>{ gamma=v; V=solveV(gamma); draw(); });
  chips(L.ctrl,'GREEDY POLICY',['hide arrows','show arrows'],(i,btn,r)=>{ showPol=(i===1);
    [...r.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); }).children[0].classList.add('on');
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The number in each cell is its optimal value \\(V^{*}(s)\\), recomputed live by value iteration for the current γ. <b style="color:#00d4ff">Blue dot</b> = agent. Movement is noisy (0.8 intended, 0.1 each side), so even a greedy agent can slip — that is the transition model \\(P(s\\u2032\\mid s,a)\\) at work.</div>';
  L.ctrl.appendChild(note);
  draw();
};

INTERACTIVES.rlValueIter = function(stage, api){
  const L=makeLab(stage,{h:470});
  const gamma=0.9;
  let V=initV(), sweeps=0, residual=1, showPol=false;
  const cell=80, gx=40, gy=60;
  const M=api.missions([
    {text:'Press <b>Sweep</b> once and confirm only the cell next to the ★ goal gained value', xp:20,
     check:s=>s.sweeps>=1},
    {text:'Keep sweeping until the <b>residual drops below 0.01</b> (the backup has converged)', xp:25,
     check:s=>s.residual<0.01 && s.sweeps>=6},
    {text:'Turn on the <b>greedy policy</b> arrows and see them route around the pit toward the goal', xp:20,
     check:s=>s.showPol && s.residual<0.05},
  ]);
  api.predict({
    prompt:'You are about to run value iteration from \\(V=0\\) (only the ★ goal =+1 and ☠ pit =−1 are pinned). <br><br>After the <b>first</b> Bellman sweep, which non-terminal cell is the first to gain positive value?',
    choices:['The start cell (bottom-left), far from the goal','The cell directly to the left of the ★ goal','All cells rise together on sweep 1','No cell changes on the first sweep'],
    answer:1,
    reveal:'Value radiates outward one ring per sweep. On sweep 1 only the goal carries value, so only its neighbour — the cell just left of the ★ — can back up a valued next state, jumping to \\(0.8\\gamma = 0.72\\). Everything else waits for the wave to reach it.',
  });
  function draw(){
    const ctx=L.ctx; clearBg(ctx,L.W,L.H);
    for(let r=0;r<GW.R;r++)for(let c=0;c<GW.C;c++){
      const px=gx+c*cell, py=gy+r*cell;
      paintCell(ctx,px,py,cell,r,c,vFill(V[r][c]));
      if(!isWall(r,c)&&!isTerm(r,c)){
        ctx.fillStyle='#e8ecff'; ctx.font='700 15px '+FONT(); ctx.textAlign='center';
        ctx.fillText(V[r][c].toFixed(2), px+cell/2, py+cell/2+5); ctx.textAlign='left';
        if(showPol){ const a=greedyAction(V,r,c,gamma);
          drawPolicyArrow(ctx,px+cell/2,py+cell-16,a,15,3,'rgba(124,92,255,.95)'); }
      }
    }
    ctx.textAlign='left'; ctx.fillStyle='#8b93b8'; ctx.font='12px '+FONT();
    ctx.fillText('sweeps: '+sweeps+'   residual: '+residual.toFixed(4)+(residual<0.01?'  ✓ converged':''), gx, 40);
    L.readout.innerHTML='γ = '+gamma.toFixed(2)+' &nbsp; sweeps = <b>'+sweeps+'</b>'+
      '<br>residual ‖V<sub>new</sub> − V<sub>old</sub>‖ = <b>'+residual.toFixed(4)+'</b>'+
      (residual<0.01?' &nbsp;<b style="color:#2dd4a0">✓ converged</b>':'');
    M.update({sweeps, residual, showPol});
  }
  function sweep(){ const out=bellmanSweep(V,gamma); V=out.V; residual=out.residual; sweeps++; draw(); }
  const row=document.createElement('div'); row.className='ctrl';
  const sweepBtn=document.createElement('button'); sweepBtn.className='btn'; sweepBtn.textContent='Sweep (one backup)';
  sweepBtn.style.marginRight='8px'; sweepBtn.onclick=sweep;
  const sweep5=document.createElement('button'); sweep5.className='btn'; sweep5.textContent='Sweep ×5';
  sweep5.onclick=()=>{ for(let i=0;i<5;i++) sweep(); };
  const resetBtn=document.createElement('button'); resetBtn.className='btn ghost'; resetBtn.style.marginLeft='8px';
  resetBtn.textContent='Reset V=0'; resetBtn.onclick=()=>{ V=initV(); sweeps=0; residual=1; draw(); };
  row.appendChild(sweepBtn); row.appendChild(sweep5); row.appendChild(resetBtn); L.ctrl.appendChild(row);
  chips(L.ctrl,'GREEDY POLICY',['hide arrows','show arrows'],(i,btn,r)=>{ showPol=(i===1);
    [...r.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); }).children[0].classList.add('on');
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Each <b>Sweep</b> replaces every cell’s value with \\(\\max_a[r+\\gamma\\sum_{s\\u2032}P\\,V(s\\u2032)]\\). The <b>residual</b> is the biggest change that sweep — it shrinks by roughly \\(\\gamma\\) each time (the contraction), so it never quite hits 0 but collapses fast. When it is tiny, \\(V\\) has converged and the arrows are optimal.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================================================================
   LESSON 2 — rl-qlearning : learning from experience (TD & Q-learning)
   Deterministic transitions here (no slip) so exploration is isolated
   from environment noise and the epsilon=0 trap is provable.
   ================================================================ */
registerLesson({
  id:'rl-qlearning', world:'ml', order:104, emoji:'\u{1F579}\u{FE0F}', title:'Q-Learning: Value from Experience',
  sub:'Drop the model. The agent no longer knows P or R — it just acts, sees rewards, and bootstraps its own value estimates from the temporal-difference error.',
  learn:`<p>Value iteration needed the full model: the transition probabilities \\(P(s'\\mid s,a)\\) and the reward function. Real agents rarely have that. <strong>Q-learning</strong> learns the action-value \\(Q(s,a)\\) directly from <em>experience</em> — tuples \\((s, a, r, s^{\prime})\\) collected by actually moving — with no model at all.</p>
  <p>The engine is the <strong>temporal-difference (TD) error</strong>. After taking action \\(a\\) in \\(s\\), receiving reward \\(r\\), and landing in \\(s'\\), compare what you <em>thought</em> the pair was worth, \\(Q(s,a)\\), against a fresh one-step estimate, \\(r + \\gamma \\max_{a^{\prime}} Q(s^{\prime},a^{\prime})\\):</p>
  <div class="formula">$$\\delta = \\underbrace{r + \\gamma \\max_{a^{\prime}} Q(s^{\prime},a^{\prime})}_{\\text{TD target}} - Q(s,a)$$</div>
  <p>\\(\\delta\\) is the surprise. Nudge the old estimate a fraction \\(\\alpha\\) (the <strong>learning rate</strong>) toward the target:</p>
  <div class="formula">$$Q(s,a) \\leftarrow Q(s,a) + \\alpha\\,\\delta$$</div>
  <p>That is the whole algorithm. The word <strong>bootstrapping</strong> names the key trick: the target uses the current estimate \\(Q(s',\\cdot)\\) instead of waiting for the true return — you learn a guess from a slightly better guess. Reward information seeps backward one step per update, so after enough visits \\(Q\\) fills in from the goal outward, just like value iteration’s sweeps — but driven by samples, not a known \\(P\\).</p>
  <p><strong>Off-policy.</strong> The \\(\\max_{a^{\prime}}\\) in the target is the crucial detail: Q-learning learns the value of the <em>optimal</em> policy while the agent is free to behave differently — exploring, acting randomly, whatever. The behavior that gathers data and the policy being learned are decoupled. That is what "off-policy" means.</p>
  <p><strong>Exploration vs exploitation.</strong> If the agent always takes the current best action (greedy), it can lock onto a mediocre route and never discover a better one — it never gathers the data that would correct it. <strong>\\(\\varepsilon\\)-greedy</strong> fixes this: act greedily with probability \\(1-\\varepsilon\\), but take a random action with probability \\(\\varepsilon\\). Some exploration is not optional; it is a precondition for learning the right values.</p>
  <p><strong>The honest caveats.</strong> Tabular Q-learning is proven to converge to the optimal \\(Q^{*}\\), but only under conditions: every state-action pair must be visited infinitely often (hence exploration), and the learning rate must decay just right — \\(\\sum_t \\alpha_t = \\infty\\) but \\(\\sum_t \\alpha_t^{2} < \\infty\\) (the Robbins-Monro schedule). A fixed \\(\\alpha\\), like the slider here, keeps \\(Q\\) usefully close but forever jittering — good enough to see learning happen.</p>`,
  ml:`Q-learning is the ancestor of the algorithm that first cracked Atari from raw pixels: <b>Deep Q-Networks (DQN, 2015)</b> replaced the lookup table with a neural network \\(Q_\\theta(s,a)\\) and trained it to shrink exactly this TD error. The bootstrap-and-nudge pattern — target = reward + discounted estimate of the future, then regress toward it — recurs across modern RL (double-DQN, actor-critic critics, and the value baselines used in RLHF). The tension you will feel between exploration and exploitation is one of the field’s permanent themes, and \\(\\varepsilon\\)-greedy is the simplest of a whole family of strategies (optimistic initialization, UCB, entropy bonuses) built to manage it.`,
  deeper:[
   {title:'\u{1F635} Stuck? What "off-policy" means', body:'Two policies are in play. The <em>behavior</em> policy chooses the actions that generate data — here \\(\\varepsilon\\)-greedy, which sometimes acts randomly. The <em>target</em> policy is the one whose value you are learning — the greedy optimum, captured by the \\(\\max_{a\'}\\) in the TD target. Q-learning is <b>off-policy</b> because these differ: you can behave exploratively (even badly) and still converge to the value of optimal play. SARSA, its on-policy cousin, uses the action actually taken instead of the max, and learns the value of the \\(\\varepsilon\\)-greedy policy itself.'},
   {title:'\u{1F680} Go deeper: Watkins’ convergence result', body:'Q-learning is due to Chris Watkins (PhD thesis, 1989); the convergence proof is Watkins & Dayan, "Q-learning", <em>Machine Learning</em> 8 (1992). The theorem: tabular Q-learning converges to \\(Q^{*}\\) with probability 1 provided every state-action pair is visited infinitely often and the step sizes satisfy the Robbins-Monro conditions \\(\\sum\\alpha_t=\\infty,\\ \\sum\\alpha_t^{2}<\\infty\\). Both hypotheses matter: drop infinite exploration and you can converge to the wrong thing; keep \\(\\alpha\\) fixed and \\(Q\\) never fully settles. Stating "Q-learning always converges" without these is a folk theorem.'},
   {title:'\u{1F680} Go deeper: TD vs Monte Carlo (bootstrapping)', body:'A Monte Carlo method waits until an episode ends and updates toward the <em>actual</em> return — unbiased but high-variance, and useless until the episode finishes. TD instead updates immediately toward \\(r+\\gamma\\max_{a\'}Q(s\',a\')\\), a <em>bootstrapped</em> target that reuses the current estimate. That introduces some bias but slashes variance and lets learning happen online, step by step — the trade Sutton & Barto build Ch. 6 around. The \\(\\delta\\) you watch printed each step is the atom of that method.'},
   {title:'\u{1F680} Go deeper: the deadly triad', body:'The clean convergence guarantee is for the <em>tabular</em> case. Combine three things — function approximation (a neural net for Q), bootstrapping (TD targets), and off-policy training — and stability can break; Sutton & Barto call this the "deadly triad" (Ch. 11). DQN’s tricks (a frozen target network, a replay buffer) are engineering to tame exactly that instability. Worth knowing that the table you are training is the well-behaved special case.'}],
  labs:[
   {key:'learn', title:'Watch Q(s,a) fill in from experience', interactive:'rlQlearn',
    intro:'<p>No model now — the agent only samples \\((s,a,r,s\\u2032)\\). The four arrows in each cell are the four \\(Q(s,a)\\) values; they fatten and turn green as they grow. Set \\(\\alpha\\) and \\(\\varepsilon\\), press <b>Run</b>, and watch the printed TD error \\(\\delta\\) each step. (Keep \\(\\varepsilon > 0\\) — with no exploration the agent never finds the goal.)</p>'},
   {key:'explore', title:'Exploration vs exploitation: two agents race', interactive:'rlExplore',
    intro:'<p>Two Q-learners run side by side on the same grid: one pure-greedy (\\(\\varepsilon=0\\)) and one exploring (\\(\\varepsilon=0.25\\)). The chart is their cumulative reward. Predict first, then run and watch which one ever learns anything.</p>'},
  ],
  quiz:[
   {q:'The temporal-difference error is \\(\\delta = r + \\gamma\\max_{a^{\prime}}Q(s^{\prime},a^{\prime}) - Q(s,a)\\). What does it measure?', opts:['The exact final return of the episode','The gap between the old estimate and a fresh one-step (bootstrapped) estimate','The reward function of the environment','The transition probability'], a:1,
    tag:'temporal-difference-learning', focus:'delta = (bootstrapped target) minus (current estimate). It is the "surprise" that drives each update.',
    why:'\\(\\delta\\) compares \\(Q(s,a)\\) (the old belief) with \\(r+\\gamma\\max_{a\'}Q(s\',a\')\\) (a fresh estimate that uses one real reward plus the discounted current value of the next state). The update moves \\(Q\\) a fraction \\(\\alpha\\) toward closing that gap.',
    wrong:{0:'That is the Monte Carlo target — the <i>actual</i> return, available only after the episode ends. TD deliberately uses a bootstrapped one-step estimate instead, so it can update immediately.',2:'\\(r\\) is one term inside \\(\\delta\\); the error itself is a difference of value estimates, not the reward function.',3:'No transition probabilities appear — that is the whole point of model-free learning. \\(\\delta\\) is built from sampled experience.'}},
   {q:'Q-learning is called "off-policy" because…', opts:['It ignores rewards','It learns the value of the optimal (greedy) policy while behaving with exploration','It never updates Q','It requires the transition model P'], a:1,
    tag:'q-learning', focus:'The max over next actions in the target means Q-learning evaluates optimal play even while the agent explores. Behavior and target policies differ.',
    why:'The \\(\\max_{a\'}\\) in the target evaluates the greedy (optimal) policy, but the agent is free to gather data any way it likes — randomly, \\(\\varepsilon\\)-greedily, etc. Behavior policy and learned policy are decoupled; that is "off-policy".',
    wrong:{0:'Rewards are central — they drive every update through \\(\\delta\\). "Off-policy" is about the mismatch between behaving and learning, not ignoring reward.',2:'It updates on every step; that is how \\(Q\\) fills in.',3:'The opposite — Q-learning is model-free and needs no \\(P\\). That freedom is exactly why it is useful.'}},
   {q:'With \\(\\varepsilon = 0\\) (pure greedy) and \\(Q\\) initialized to all zeros in a deterministic gridworld, what happens?', opts:['It finds the shortest path immediately','It can get stuck repeating one action and never discover the goal','It always falls in the pit','It converges faster than \\(\\varepsilon > 0\\)'], a:1,
    tag:'exploration-exploitation', focus:'No exploration + flat Q = deterministic tie-break -> the agent repeats one move and never samples the reward, so nothing is learned.',
    why:'With all \\(Q=0\\) every action ties, so greedy picks the same one every time; in a deterministic world that traces one fixed path (often into a wall) and never reaches the goal. No reward is ever sampled, \\(\\delta\\) stays 0, and nothing is learned. Exploration is a precondition, not a luxury.',
    wrong:{0:'It has no idea where the goal is — \\(Q\\) is blank. Without exploration it cannot even stumble onto the reward that would teach it a path.',2:'It need not hit the pit specifically; the failure is subtler — it simply loops on one tie-broken action and learns nothing.',3:'The reverse: \\(\\varepsilon=0\\) here learns <i>nothing</i>, so it is infinitely slower than an exploring agent that eventually finds the goal.'}},
   {q:'Tabular Q-learning is guaranteed to converge to \\(Q^{*}\\) under which conditions?', opts:['Always, no conditions needed','Every state-action pair visited infinitely often, and a decaying learning rate (\\(\\sum\\alpha=\\infty,\\ \\sum\\alpha^2<\\infty\\))','Only if \\(\\gamma = 1\\)','Only with a neural-network approximator'], a:1,
    tag:'q-learning', focus:'Watkins & Dayan 1992: infinite visitation of all (s,a) plus Robbins-Monro step sizes. Both hypotheses are load-bearing.',
    why:'The Watkins & Dayan (1992) result needs infinite exploration (every \\((s,a)\\) visited infinitely often) and Robbins-Monro step sizes \\(\\sum\\alpha_t=\\infty,\\ \\sum\\alpha_t^{2}<\\infty\\). A fixed \\(\\alpha\\) keeps \\(Q\\) close but jittering rather than exactly converged.',
    wrong:{0:'"Always" drops the real hypotheses — a folk theorem. Convergence needs both exploration and a decaying step size.',2:'\\(\\gamma=1\\) actually removes the discounting that keeps the target bounded; the guarantee wants \\(\\gamma<1\\), not equal to 1.',3:'The theorem is for the <i>tabular</i> case. Adding a neural approximator can <i>break</i> stability (the deadly triad), it does not enable the guarantee.'}},
   {q:'A fixed (non-decaying) learning rate \\(\\alpha\\), like the slider in the lab, causes what?', opts:['Q converges exactly and then stops changing','Q tracks the target but keeps jittering rather than settling exactly','Q is guaranteed to diverge','Q ignores new experience'], a:1,
    tag:'temporal-difference-learning', focus:'Constant alpha violates the Robbins-Monro sum-of-squares condition, so estimates stay usefully close but never fully settle.',
    why:'A constant \\(\\alpha\\) keeps injecting a fixed fraction of each new TD error, so \\(Q\\) stays responsive but never fully damps out — it hovers near \\(Q^{*}\\) with residual jitter. Useful in practice and fine for watching learning, but not exact convergence.',
    wrong:{0:'Exact convergence needs the step size to shrink over time; a fixed \\(\\alpha\\) never lets the updates die down.',2:'It does not diverge for reasonable \\(\\alpha\\) — it stays bounded near the solution, just noisy.',3:'A large fixed \\(\\alpha\\) does the opposite — it overweights the newest experience.'}},
   {q:'Why do reward values "propagate backward" from the goal over many updates?', opts:['Because the TD target uses the next state\'s value, so value seeps one step back per visit','Because the agent physically carries the reward','Because \\(P\\) is known','Because \\(\\varepsilon\\) increases over time'], a:0,
    tag:'q-learning', focus:'Bootstrapping: Q(s,a) leans on Q(s\',.), so once a state near the goal has value, its predecessors inherit it on their next visit.',
    why:'Each update pulls \\(Q(s,a)\\) toward \\(r+\\gamma\\max_{a\'}Q(s\',a\')\\). Once cells near the goal acquire value, their predecessors inherit a discounted share the next time they are visited — so value flows outward from the goal, one ring per round of visits.',
    wrong:{1:'Nothing is physically carried; it is the <i>estimates</i> that update, through bootstrapping.',2:'\\(P\\) is unknown here — the propagation happens through sampled next states, not a known model.',3:'\\(\\varepsilon\\) scheduling affects how thoroughly you explore, not the backward flow of value, which comes from the bootstrap.'}},
   {type:'numeric', q:'Currently \\(Q(s,a)=0.20\\). You take action \\(a\\), receive reward \\(r=0\\), and land in \\(s\'\\) where \\(\\max_{a^{\prime}}Q(s^{\prime},a^{\prime})=0.50\\). With \\(\\alpha=0.5\\) and \\(\\gamma=0.9\\), what is the updated \\(Q(s,a)\\)?',
    answer:0.325, tol:0.002, unit:'',
    tag:'q-learning', focus:'delta = r + gamma*maxQ′ - Q = 0 + 0.9*0.5 - 0.2 = 0.25; new Q = 0.20 + 0.5*0.25.',
    hint:'First the TD error: delta = 0 + 0.9*0.50 - 0.20 = 0.25. Then Q <- 0.20 + 0.5 * 0.25.',
    why:'\\(\\delta = 0 + 0.9(0.50) - 0.20 = 0.25\\); update \\(Q \\leftarrow 0.20 + 0.5(0.25) = 0.325\\).'},
   {type:'order', q:'Put the steps of one Q-learning update into the correct order.',
    steps:[
     'Observe the current state s',
     'Choose an action a by \\u03b5-greedy on Q(s,\\u00b7)',
     'Execute a; observe reward r and next state s\\u2032',
     'Form the TD target r + \\u03b3\\u00b7max over a\\u2032 of Q(s\\u2032,a\\u2032)',
     'Compute the TD error \\u03b4 = target \\u2212 Q(s,a)',
     'Update Q(s,a) \\u2190 Q(s,a) + \\u03b1\\u00b7\\u03b4, then move to s\\u2032'],
    why:'Look at s, pick an action with exploration, act and observe (r, s\\u2032), build the bootstrapped target, subtract the old estimate to get the surprise, and nudge Q by alpha times that surprise.',
    tag:'q-learning', focus:'Observe -> choose (epsilon-greedy) -> act/observe -> target -> TD error -> nudge Q and advance.'},
  ],
});

INTERACTIVES.rlQlearn = function(stage, api){
  const L=makeLab(stage,{h:470});
  const gamma=0.9;
  let alpha=0.5, eps=0.2;
  let Q=Array.from({length:GW.R},()=>Array.from({length:GW.C},()=>[0,0,0,0]));
  let state=GW.start.slice(), steps=0, goalReaches=0, last=null, timer=null;
  const cell=80, gx=40, gy=60;
  const M=api.missions([
    {text:'Let it learn: run until the agent has reached the ★ goal at least <b>5 times</b>', xp:20,
     check:s=>s.goalReaches>=5},
    {text:'Watch value propagate back: get the best \\(Q\\) at the cell left of the goal <b>above 0.5</b>', xp:25,
     check:s=>s.q02>0.5},
    {text:'Run <b>250+ learning steps</b> total', xp:20, check:s=>s.steps>=250},
  ]);
  function maxAbsQ(){ let m=0.001; for(let r=0;r<GW.R;r++)for(let c=0;c<GW.C;c++)for(let a=0;a<4;a++) m=Math.max(m,Math.abs(Q[r][c][a])); return m; }
  function qStep(){
    const [r,c]=state;
    const a = Math.random()<eps ? (Math.random()*4|0) : argmax(Q[r][c]);
    const [r2,c2]=stepCell(r,c,a);
    const rew=reward(r2,c2);
    const mx = isTerm(r2,c2) ? 0 : Math.max(...Q[r2][c2]);
    const delta = rew + gamma*mx - Q[r][c][a];
    Q[r][c][a] += alpha*delta;
    last={r,c,a,rew,r2,c2,delta};
    steps++;
    if(isGoal(r2,c2)) goalReaches++;
    state = isTerm(r2,c2) ? GW.start.slice() : [r2,c2];
    draw();
  }
  function draw(){
    const ctx=L.ctx; clearBg(ctx,L.W,L.H);
    const m=maxAbsQ();
    for(let r=0;r<GW.R;r++)for(let c=0;c<GW.C;c++){
      const px=gx+c*cell, py=gy+r*cell;
      paintCell(ctx,px,py,cell,r,c,'#171c33');
      if(!isWall(r,c)&&!isTerm(r,c)){
        const cx=px+cell/2, cy=py+cell/2;
        for(let a=0;a<4;a++){
          const q=Q[r][c][a], mag=Math.abs(q)/m;
          const col = q>=0 ? 'rgba(45,212,160,'+(0.2+0.75*mag).toFixed(3)+')' : 'rgba(255,92,122,'+(0.2+0.75*mag).toFixed(3)+')';
          drawPolicyArrow(ctx,cx,cy,a,12+22*mag,1+3.5*mag,col);
        }
      }
    }
    const [ar,ac]=state;
    ctx.fillStyle='#00d4ff'; ctx.strokeStyle='#0b0f22'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(gx+ac*cell+cell/2, gy+ar*cell+cell/2, 12, 0, 7); ctx.fill(); ctx.stroke();
    ctx.textAlign='left'; ctx.fillStyle='#8b93b8'; ctx.font='12px '+FONT();
    ctx.fillText('steps: '+steps+'   goal reaches: '+goalReaches, gx, 40);
    const q02=Math.max(...Q[0][2]);
    let dstr='—';
    if(last) dstr='δ = '+last.delta.toFixed(3)+'  (took '+ANAME[last.a]+', r='+last.rew+')';
    L.readout.innerHTML='α = '+alpha.toFixed(2)+' &nbsp; ε = '+eps.toFixed(2)+' &nbsp; steps = <b>'+steps+'</b>'+
      '<br>last update: '+dstr+
      '<br>best Q left-of-goal = <b>'+q02.toFixed(3)+'</b>';
    M.update({steps, goalReaches, q02});
  }
  function run(){ if(timer){ stopRun(); return; } timer=setInterval(()=>{ for(let i=0;i<3;i++) qStep(); }, 90); runBtn.textContent='⏸ Pause'; }
  function stopRun(){ if(timer){ clearInterval(timer); timer=null; } runBtn.textContent='▶ Run'; }
  const row=document.createElement('div'); row.className='ctrl';
  const runBtn=document.createElement('button'); runBtn.className='btn'; runBtn.textContent='▶ Run'; runBtn.style.marginRight='8px'; runBtn.onclick=run;
  const stepBtn=document.createElement('button'); stepBtn.className='btn'; stepBtn.textContent='Step ×1'; stepBtn.onclick=()=>{ qStep(); };
  const resetBtn=document.createElement('button'); resetBtn.className='btn ghost'; resetBtn.style.marginLeft='8px'; resetBtn.textContent='Reset Q';
  resetBtn.onclick=()=>{ stopRun(); Q=Array.from({length:GW.R},()=>Array.from({length:GW.C},()=>[0,0,0,0])); state=GW.start.slice(); steps=0; goalReaches=0; last=null; draw(); };
  row.appendChild(runBtn); row.appendChild(stepBtn); row.appendChild(resetBtn); L.ctrl.appendChild(row);
  slider(L.ctrl,'α — learning rate',0.05,0.9,0.05,0.5,v=>v.toFixed(2),v=>{ alpha=v; });
  slider(L.ctrl,'ε — exploration rate',0,0.6,0.05,0.2,v=>v.toFixed(2),v=>{ eps=v; });
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Four arrows per cell = the four \\(Q(s,a)\\); longer/greener = higher value. The agent \\(\\varepsilon\\)-greedily follows them, and every step prints the TD error \\(\\delta\\). Transitions are deterministic here, so all the wandering you see is <b>exploration</b>, not slip.</div>';
  L.ctrl.appendChild(note);
  registerCleanup(stopRun);
  draw();
};

INTERACTIVES.rlExplore = function(stage, api){
  const L=makeLab(stage,{h:470});
  const gamma=0.9, alpha=0.5;
  function newQ(){ return Array.from({length:GW.R},()=>Array.from({length:GW.C},()=>[0,0,0,0])); }
  let Qg=newQ(), Qe=newQ();                 // greedy (eps=0) vs explore (eps=0.25)
  let sg=GW.start.slice(), se=GW.start.slice();
  let cumG=0, cumE=0, goalsG=0, goalsE=0, steps=0;
  let histG=[], histE=[], timer=null;
  function agentStep(Q,s,eps){
    const [r,c]=s;
    const a = Math.random()<eps ? (Math.random()*4|0) : argmax(Q[r][c]);
    const [r2,c2]=stepCell(r,c,a);
    const rew=reward(r2,c2);
    const mx = isTerm(r2,c2) ? 0 : Math.max(...Q[r2][c2]);
    Q[r][c][a] += alpha*(rew + gamma*mx - Q[r][c][a]);
    const ns = isTerm(r2,c2) ? GW.start.slice() : [r2,c2];
    return { ns, rew, hitGoal:isGoal(r2,c2) };
  }
  const M=api.missions([
    {text:'Run <b>400+ steps</b> and watch the exploring agent (ε=0.25) reach the goal repeatedly', xp:25,
     check:s=>s.steps>=400 && s.goalsE>=5},
    {text:'Confirm the pure-greedy agent (ε=0) <b>never reaches the goal</b> — its cumulative reward stays ≈ 0', xp:25,
     check:s=>s.steps>=400 && s.goalsG===0 && s.cumG<0.5},
  ]);
  api.predict({
    prompt:'The greedy agent starts with \\(Q=0\\) everywhere and \\(\\varepsilon=0\\), so it always picks the same tie-broken action. Transitions are deterministic. <br><br>Will it ever reach the ★ goal?',
    choices:['Yes — greedy is optimal, so it heads straight there','No — with nothing learned and no exploration it repeats one move and never finds the reward','Only if we lower the learning rate','It reaches the ☠ pit instead'],
    answer:1,
    reveal:'With a flat \\(Q\\) every action ties, greedy locks onto one, and in a deterministic world that traces a fixed path into a wall — it never samples the goal, so \\(\\delta\\) stays 0 and it learns nothing. The exploring agent, by occasionally acting randomly, eventually stumbles onto the +1 and value propagates back. That is why the greedy curve stays flat while the explorer climbs.',
  });
  function draw(){
    const ctx=L.ctx; clearBg(ctx,L.W,L.H);
    const x0=70, y0=60, w=500, h=310;
    ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x0,y0+h); ctx.lineTo(x0+w,y0+h); ctx.stroke();
    ctx.fillStyle='#8b93b8'; ctx.font='12px '+FONT(); ctx.textAlign='center';
    ctx.fillText('learning steps →', x0+w/2, y0+h+34);
    ctx.save(); ctx.translate(x0-42, y0+h/2); ctx.rotate(-Math.PI/2);
    ctx.fillText('cumulative reward →', 0, 0); ctx.restore();
    const maxX=Math.max(50, histG.length);
    const maxY=Math.max(4, cumE+1);
    const px=i=>x0 + (i/(maxX-1||1))*w;
    const py=v=>y0+h - (v/maxY)*h;
    ctx.textAlign='right';
    for(let g=0;g<=maxY;g+=Math.max(1,Math.ceil(maxY/5))){ const yy=py(g);
      ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.beginPath(); ctx.moveTo(x0,yy); ctx.lineTo(x0+w,yy); ctx.stroke();
      ctx.fillStyle='#5a6079'; ctx.fillText(''+g, x0-6, yy+4); }
    function line(hist,color){ ctx.strokeStyle=color; ctx.lineWidth=2.5; ctx.beginPath();
      hist.forEach((v,i)=>{ const X=px(i),Y=py(v); i?ctx.lineTo(X,Y):ctx.moveTo(X,Y); }); ctx.stroke(); }
    line(histG,'#ff5c7a'); line(histE,'#2dd4a0');
    ctx.textAlign='left'; ctx.font='700 13px '+FONT();
    ctx.fillStyle='#ff5c7a'; ctx.fillText('— greedy ε=0  (reward '+cumG.toFixed(0)+', goals '+goalsG+')', x0+10, y0+18);
    ctx.fillStyle='#2dd4a0'; ctx.fillText('— explore ε=0.25  (reward '+cumE.toFixed(0)+', goals '+goalsE+')', x0+10, y0+40);
    L.readout.innerHTML='steps = <b>'+steps+'</b>'+
      '<br><b style="color:#ff5c7a">greedy ε=0</b>: reward '+cumG.toFixed(0)+', goals '+goalsG+
      '<br><b style="color:#2dd4a0">explore ε=0.25</b>: reward '+cumE.toFixed(0)+', goals '+goalsE;
    M.update({steps, cumG, cumE, goalsG, goalsE});
  }
  function stepBoth(){
    const g=agentStep(Qg,sg,0); sg=g.ns; cumG+=g.rew; if(g.hitGoal) goalsG++;
    const e=agentStep(Qe,se,0.25); se=e.ns; cumE+=e.rew; if(e.hitGoal) goalsE++;
    steps++; histG.push(cumG); histE.push(cumE);
    if(histG.length>1200){ histG.shift(); histE.shift(); }
  }
  function run(){ if(timer){ stopRun(); return; } timer=setInterval(()=>{ for(let i=0;i<5;i++) stepBoth(); draw(); }, 60); runBtn.textContent='⏸ Pause'; }
  function stopRun(){ if(timer){ clearInterval(timer); timer=null; } runBtn.textContent='▶ Run'; }
  const row=document.createElement('div'); row.className='ctrl';
  const runBtn=document.createElement('button'); runBtn.className='btn'; runBtn.textContent='▶ Run'; runBtn.style.marginRight='8px'; runBtn.onclick=run;
  const resetBtn=document.createElement('button'); resetBtn.className='btn ghost'; resetBtn.textContent='Reset';
  resetBtn.onclick=()=>{ stopRun(); Qg=newQ(); Qe=newQ(); sg=GW.start.slice(); se=GW.start.slice(); cumG=cumE=goalsG=goalsE=steps=0; histG=[]; histE=[]; draw(); };
  row.appendChild(runBtn); row.appendChild(resetBtn); L.ctrl.appendChild(row);
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Same grid, same \\(\\alpha\\), same \\(\\gamma\\) — the <b>only</b> difference is \\(\\varepsilon\\). The <b style="color:#ff5c7a">greedy</b> agent exploits a blank table and learns nothing; the <b style="color:#2dd4a0">exploring</b> agent occasionally acts randomly, finds the goal, and its reward compounds. Exploration is what turns experience into learning.</div>';
  L.ctrl.appendChild(note);
  registerCleanup(stopRun);
  draw();
};

/* ================================================================
   LESSON 3 — rl-policy : from Q-tables to policy gradients & RLHF
   ================================================================ */
registerLesson({
  id:'rl-policy', world:'ml', order:105, emoji:'\u{1F3B0}', title:'Policy Gradients & the RLHF Bridge',
  sub:'When states are too many to tabulate, make the policy a differentiable object and push on it directly — the idea behind REINFORCE, and behind the RL step that aligns modern chatbots.',
  learn:`<p>A Q-table has one entry per state-action pair. That works for 16 cells; it is hopeless for a Go board (\\(10^{170}\\) states) or a language model, whose "state" is the entire text so far. Two problems: the table does not <em>fit</em>, and it does not <em>generalize</em> — nothing learned about one state helps a similar one. The fix is to make the policy a <strong>parameterized, differentiable function</strong> and optimize its parameters with gradient ascent, exactly like any other model.</p>
  <p>Start with the smallest case: one state, three actions (a <strong>bandit</strong>). Keep a <strong>preference</strong> \\(h_a\\) per action and turn preferences into probabilities with a <strong>softmax</strong> (the same map as a classifier’s output head):</p>
  <div class="formula">$$\\pi(a) = \\frac{e^{h_a}}{\\sum_b e^{h_b}}$$</div>
  <p>Now we cannot backprop a "correct action" — we only get a reward for the action we sampled. <strong>REINFORCE</strong> (Williams, 1992) gives the gradient anyway: increase the log-probability of actions in proportion to the reward they earned.</p>
  <div class="formula">$$\\nabla_{\\theta} J = \\mathbb{E}\\big[(R - b)\\,\\nabla_{\\theta}\\log \\pi_{\\theta}(a)\\big]$$</div>
  <p>For the softmax bandit this becomes a simple nudge: after sampling action \\(a\\) and seeing reward \\(R\\), push its preference up and the others down, scaled by how much better than a <strong>baseline</strong> \\(b\\) the reward was:</p>
  <div class="formula">$$h_a \\leftarrow h_a + \\alpha\\,(R - b)\\,\\big(1 - \\pi(a)\\big)$$</div>
  <p><strong>The baseline earns its keep.</strong> Subtracting a baseline \\(b\\) (say the running-average reward) does <em>not</em> change the direction of the gradient in expectation — because \\(\\mathbb{E}[\\,b\\,\\nabla\\log\\pi\\,]=0\\), it is <strong>unbiased</strong> — but it dramatically cuts the <em>variance</em> of the updates. Without it, every positive reward inflates every sampled action, and the policy lurches around; with it, only better-than-expected actions get promoted. You will see the jitter shrink when you toggle it on.</p>
  <p><strong>The RLHF bridge.</strong> Aligning a language model with human preferences (InstructGPT / ChatGPT) is this idea at scale. A <strong>reward model</strong> \\(r_\\phi\\), trained on human comparisons, scores responses; the policy (the LLM) is then improved by policy-gradient RL to raise that score. But a reward model is an imperfect proxy — push too hard and the policy finds <strong>reward-hacking</strong> outputs that score high yet are bad. The standard guard is a <strong>KL penalty</strong> that keeps the policy close to the original reference model \\(\\pi_{\\text{ref}}\\):</p>
  <div class="formula">$$J(\\pi) = \\mathbb{E}_{\\pi}\\big[r_\\phi\\big] - \\beta\\,\\mathrm{KL}\\!\\big(\\pi \\,\\|\\, \\pi_{\\text{ref}}\\big)$$</div>
  <p>That KL term is the very same relative entropy from the info-theory lesson — here it measures how far the fine-tuned policy has drifted from the base model. The coefficient \\(\\beta\\) sets the tug-of-war: too small and the policy reward-hacks; too large and it barely improves. The second lab lets you feel that trade-off directly.</p>`,
  ml:`Policy-gradient methods (REINFORCE → actor-critic → PPO) are how you train an agent whose action space is enormous or continuous — including a language model choosing among tens of thousands of next tokens. The RLHF recipe — supervised fine-tune, train a reward model on human comparisons, then optimize the policy against reward minus a \\(\\beta\\)-weighted KL to the reference — is the alignment step behind InstructGPT and the assistants that followed. The KL leash is not a detail: it is what keeps a model fluent and on-distribution while it chases a fallible reward signal, and it is a direct application of the KL divergence you already met in information theory.`,
  deeper:[
   {title:'\u{1F635} Stuck? Why not just keep using a Q-table?', body:'Two walls. <b>Size</b>: the number of states is astronomical (every possible text, every board), so a table cannot be stored, let alone visited. <b>Generalization</b>: a table treats each state independently — learning that one board is good tells it nothing about a nearly identical board. A parameterized policy \\(\\pi_\\theta\\) (a neural net) solves both: finite parameters, and similar inputs produce similar outputs by construction. Value methods can also be parameterized (that is DQN), but for huge or continuous action spaces it is often cleaner to parameterize and push on the <em>policy</em> directly.'},
   {title:'\u{1F680} Go deeper: REINFORCE and the score-function trick', body:'Williams, "Simple statistical gradient-following algorithms for connectionist reinforcement learning", <em>Machine Learning</em> 8 (1992), introduced REINFORCE. The math is the score-function / likelihood-ratio identity: \\(\\nabla_\\theta \\mathbb{E}[R] = \\mathbb{E}[R\\,\\nabla_\\theta \\log \\pi_\\theta(a)]\\). It lets you differentiate through a sampling step you could not otherwise backprop. Subtracting a baseline \\(b\\) leaves the gradient unbiased because \\(\\mathbb{E}[b\\,\\nabla_\\theta\\log\\pi_\\theta]=b\\,\\nabla_\\theta\\sum_a\\pi_\\theta(a)=b\\,\\nabla_\\theta 1 = 0\\), while shrinking variance — the single most important practical trick in the whole family.'},
   {title:'\u{1F680} Go deeper: the RLHF objective in full', body:'Ouyang et al., "Training language models to follow instructions with human feedback" (InstructGPT, 2022), and the earlier Christiano et al., "Deep reinforcement learning from human preferences" (2017), formalize the objective this lab caricatures: maximize \\(\\mathbb{E}_{\\pi}[r_\\phi(x,y)] - \\beta\\,\\mathrm{KL}(\\pi_\\theta(y\\mid x)\\,\\|\\,\\pi_{\\text{ref}}(y\\mid x))\\), optimized with PPO. The reward model \\(r_\\phi\\) is trained from human pairwise comparisons (a Bradley-Terry model), and the KL term — literally the information-theory relative entropy — is what stops the policy from collapsing onto degenerate high-reward text. Set \\(\\beta\\) too low and you get reward hacking; too high and the model never improves.'},
   {title:'\u{1F680} Go deeper: reward models are proxies (Goodhart)', body:'A reward model approximates human judgment from finite comparisons, so optimizing it hard is a textbook case of Goodhart’s law: "when a measure becomes a target, it ceases to be a good measure." The policy will find inputs where the reward model is wrong but confident — verbose, sycophantic, or format-gaming outputs that score high and read badly. The KL leash and periodic reward-model refreshes are mitigations, not cures; keeping a human in the loop remains necessary. This is why the lab plots a hidden "true quality" that peaks and then falls even as the reward-model score keeps rising.'}],
  labs:[
   {key:'bandit', title:'A 3-arm bandit learns a softmax policy', interactive:'rlBandit',
    intro:'<p>One state, three arms with hidden mean rewards. The policy is a softmax over three <b>preferences</b>; each pull nudges the sampled arm by \\((R-b)\\). Pull repeatedly and watch the probabilities concentrate on the best arm — then toggle the <b>baseline</b> off and watch the updates get noisier.</p>'},
   {key:'rlhf', title:'RLHF: reward vs the KL leash', interactive:'rlRlhf',
    intro:'<p>Slide how far the policy drifts from the reference model and set the KL penalty \\(\\beta\\). The reward-model score rises with drift, but so does the KL cost. The objective is \\(r_\\phi - \\beta\\,\\mathrm{KL}\\); a hidden "true quality" curve shows where reward-hacking begins. Find the \\(\\beta\\) that lands the optimum on the sweet spot.</p>'},
  ],
  quiz:[
   {q:'Why do value tables (one entry per state-action) fail for problems like Go or language modeling?', opts:['The states are too few','The number of states is astronomical and tables do not generalize across similar states','Tables cannot store negative numbers','Rewards are unavailable'], a:1,
    tag:'policy-gradient', focus:'Table size explodes with the state space, and each entry is independent so nothing transfers between similar states. Parameterized policies fix both.',
    why:'The state count is astronomically large (every board, every text prefix), so the table neither fits in memory nor gets visited enough; and because entries are independent, learning about one state never transfers to a similar one. A parameterized policy solves both.',
    wrong:{0:'The opposite — there are far too <i>many</i> states, not too few.',2:'Storage of negatives is a non-issue; the problems are scale and generalization.',3:'Rewards still exist (a reward model provides them in RLHF). The failure is the tabular representation, not missing reward.'}},
   {q:'A softmax policy \\(\\pi(a)=e^{h_a}/\\sum_b e^{h_b}\\) over action preferences is differentiable, which lets you…', opts:['Avoid ever sampling actions','Push on the policy parameters directly with gradient ascent','Guarantee the optimal action every time','Eliminate the need for reward'], a:1,
    tag:'policy-gradient', focus:'A differentiable policy means you can take gradients of expected reward w.r.t. the parameters and ascend them — the essence of policy-gradient methods.',
    why:'Because \\(\\pi\\) is a smooth function of its parameters, you can compute \\(\\nabla_\\theta \\mathbb{E}[R]\\) and ascend it — optimizing the policy itself, the way REINFORCE and PPO do.',
    wrong:{0:'You still sample actions — REINFORCE is built precisely to get a gradient <i>through</i> that sampling step.',2:'It makes the good action more <i>probable</i>, never guaranteed; exploration remains.',3:'Reward is the signal that drives the gradient; differentiability does not remove the need for it.'}},
   {q:'In REINFORCE, subtracting a baseline \\(b\\) from the reward before the update…', opts:['Biases the gradient toward the baseline','Reduces the variance of the updates without changing the gradient in expectation','Is required for the policy to be valid','Speeds up the softmax computation'], a:1,
    tag:'policy-gradient', focus:'E[b\\u00b7\\u2207log\\u03c0]=0, so a baseline is unbiased; it cuts variance by promoting only better-than-expected actions.',
    why:'Because \\(\\mathbb{E}[b\\,\\nabla\\log\\pi]=0\\), the baseline leaves the expected gradient unchanged (unbiased) while shrinking its variance — only actions that beat the baseline get promoted, so the policy stops lurching on every positive reward.',
    wrong:{0:'It is provably <i>un</i>biased — that is the whole appeal. The expected gradient is identical with or without \\(b\\).',2:'The policy is valid regardless; the baseline is a variance-reduction option, not a requirement.',3:'It has nothing to do with softmax speed; it changes the statistics of the gradient estimate.'}},
   {q:'The RLHF objective is \\(\\mathbb{E}_{\\pi}[r_\\phi] - \\beta\\,\\mathrm{KL}(\\pi\\,\\|\\,\\pi_{\\text{ref}})\\). What is the KL term doing?', opts:['Maximizing the reward model score','Penalizing how far the policy drifts from the reference model','Adding more training data','Replacing the reward model'], a:1,
    tag:'rlhf', focus:'KL(pi || pi_ref) is the relative entropy from info-theory; it leashes the policy to the base model so it does not reward-hack.',
    why:'\\(\\mathrm{KL}(\\pi\\,\\|\\,\\pi_{\\text{ref}})\\) is the relative entropy (info-theory lesson) between the fine-tuned policy and the frozen reference model; subtracting \\(\\beta\\) times it penalizes drift, keeping the model fluent and on-distribution while it chases reward.',
    wrong:{0:'The first term \\(\\mathbb{E}[r_\\phi]\\) does the reward-maximizing; the KL term pulls the <i>other</i> way, as a leash.',2:'It adds no data — it is a regularizer computed against a fixed reference policy.',3:'It complements the reward model, it does not replace it — the two terms trade off.'}},
   {q:'Making \\(\\beta\\) (the KL coefficient) too small tends to cause…', opts:['The policy to stay identical to the reference','Reward hacking — high reward-model score but degraded real quality','Faster convergence to the true optimum','The reward model to vanish'], a:1,
    tag:'rlhf', focus:'Small beta = weak leash = the policy over-optimizes an imperfect reward proxy (Goodhart), scoring high while true quality falls.',
    why:'A weak KL penalty lets the policy over-optimize an imperfect reward proxy — it drifts far from the reference to find outputs the reward model scores high but humans would not (Goodhart’s law). That is reward hacking.',
    wrong:{0:'Staying identical to the reference is what a <i>large</i> \\(\\beta\\) causes — the leash too tight to improve.',2:'Over-optimizing a proxy moves <i>away</i> from true quality, not toward it.',3:'\\(\\beta\\) changes the trade-off weight; it never removes the reward model.'}},
   {q:'A reward model in RLHF is trained from human comparisons, so treating its score as ground truth is risky because…', opts:['It is a perfect oracle','It is an imperfect proxy, and hard optimization exploits its errors (Goodhart\'s law)','It has no parameters','It only outputs zero'], a:1,
    tag:'rlhf', focus:'The reward model approximates human judgment from finite data; optimizing it hard finds where it is wrong. A measure that becomes a target stops being a good measure.',
    why:'The reward model only approximates human judgment from finite comparisons. Optimize it hard and the policy finds inputs where it is confidently wrong — the classic Goodhart failure where a proxy target degrades once it is maximized.',
    wrong:{0:'It is explicitly <i>not</i> an oracle — that imperfection is the whole risk.',2:'It is a full model with many parameters (often another transformer).',3:'It outputs meaningful scalar scores; the issue is that those scores are an imperfect proxy.'}},
   {type:'numeric', q:'Three arms have preferences \\(h = [1, 1, 2]\\). Under the softmax \\(\\pi(a)=e^{h_a}/\\sum_b e^{h_b}\\), what probability does arm 3 (with \\(h=2\\)) get? Use \\(e\\approx 2.718\\).',
    answer:0.576, tol:0.01, unit:'',
    tag:'policy-gradient', focus:'Softmax: e^2 / (e^1 + e^1 + e^2). Exponentiate each preference, then normalize.',
    hint:'e^1 = 2.718, e^1 = 2.718, e^2 = 7.389. Arm 3 probability = 7.389 / (2.718 + 2.718 + 7.389).',
    why:'\\(\\pi(3) = e^{2}/(e^{1}+e^{1}+e^{2}) = 7.389/12.826 \\approx 0.576\\). The largest preference gets the largest share, but the others keep nonzero probability — that residual is exploration.'},
   {type:'order', q:'Put the steps of one REINFORCE-style softmax bandit update into the correct order.',
    steps:[
     'Initialize the preferences h to zero (a uniform softmax policy)',
     'Sample an action a from the policy \\u03c0 = softmax(h)',
     'Observe the reward R for the chosen action',
     'Update the baseline b (the running-average reward)',
     'Nudge preferences: push h_a up by \\u03b1(R\\u2212b)(1\\u2212\\u03c0(a)) and the others down',
     'Recompute \\u03c0 = softmax(h) and repeat'],
    why:'Start uniform, sample from the current policy, see the reward, update the baseline, move the sampled action\\u2019s preference by the baseline-adjusted reward, and renormalize through the softmax.',
    tag:'policy-gradient', focus:'Init h=0 -> sample from softmax -> observe R -> update baseline -> nudge preferences by (R-b) -> renormalize.'},
  ],
});

INTERACTIVES.rlBandit = function(stage, api){
  const L=makeLab(stage);
  const means=[0.8, 1.6, 0.5];          // arm 2 is best (hidden from learner up front)
  let alpha=0.3, baselineOn=true, h=[0,0,0], Rbar=0, n=0, pulls=0, sawNoBaseline=false, lastR=0, lastA=-1, timer=null;
  function softmax(hh){ const m=Math.max(...hh); const e=hh.map(x=>Math.exp(x-m)); const s=e.reduce((a,b)=>a+b,0); return e.map(x=>x/s); }
  const M=api.missions([
    {text:'Pull enough to drive the <b>best arm’s probability above 0.65</b>', xp:20,
     check:s=>s.pBest>0.65 && s.bestIsTwo},
    {text:'Toggle the <b>baseline OFF</b> and pull at least 15 more — feel the updates get noisier', xp:25,
     check:s=>s.sawNoBaseline && s.pulls>=25},
    {text:'Concentrate the policy: get the best arm’s probability <b>above 0.9</b>', xp:20,
     check:s=>s.pBest>0.9 && s.bestIsTwo},
  ]);
  function pull(){
    const pi=softmax(h);
    let u=Math.random(), a=0, acc=0; for(;a<3;a++){ acc+=pi[a]; if(u<=acc) break; } if(a>2) a=2;
    const R=means[a]+(Math.random()*2-1)*0.5;
    const base=baselineOn?Rbar:0;
    for(let i=0;i<3;i++){ if(i===a) h[i]+=alpha*(R-base)*(1-pi[i]); else h[i]-=alpha*(R-base)*pi[i]; }
    n++; Rbar+=(R-Rbar)/n; pulls++; lastR=R; lastA=a;
    if(!baselineOn) sawNoBaseline=true;
    draw();
  }
  function draw(){
    const ctx=L.ctx; clearBg(ctx,L.W,L.H);
    const pi=softmax(h);
    const cols=['#7c5cff','#ffc94d','#2dd4a0'];
    const bx0=90, bw=110, gap=70, base=330, ph=210;
    for(let i=0;i<3;i++){
      const x=bx0+i*(bw+gap);
      const hgt=pi[i]*ph;
      ctx.fillStyle=cols[i]; ctx.globalAlpha=(lastA===i?1:0.85); ctx.fillRect(x, base-hgt, bw, hgt); ctx.globalAlpha=1;
      ctx.fillStyle='#e8ecff'; ctx.font='700 15px '+FONT(); ctx.textAlign='center';
      ctx.fillText((pi[i]*100).toFixed(0)+'%', x+bw/2, base-hgt-8);
      ctx.fillStyle=cols[i]; ctx.font='bold 14px '+FONT();
      ctx.fillText('arm '+(i+1), x+bw/2, base+22);
      ctx.fillStyle='#8b93b8'; ctx.font='12px '+FONT();
      ctx.fillText('h = '+h[i].toFixed(2), x+bw/2, base+42);
      if(lastA===i){ ctx.fillStyle='#ffc94d'; ctx.fillText('▲ last pull', x+bw/2, base+62); }
    }
    ctx.strokeStyle='rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(bx0-10,base); ctx.lineTo(bx0+3*(bw+gap)-gap+10,base); ctx.stroke();
    ctx.textAlign='left'; ctx.fillStyle='#8b93b8'; ctx.font='12px '+FONT();
    ctx.fillText('pulls: '+pulls+'   baseline: '+(baselineOn?'ON (R̄='+Rbar.toFixed(2)+')':'OFF'), bx0-10, 44);
    if(lastA>=0){ ctx.fillStyle='#cdd4f0'; ctx.fillText('last: pulled arm '+(lastA+1)+', reward '+lastR.toFixed(2), bx0-10, 66); }
    const bIdx=argmax(pi), pBest=pi[bIdx];
    L.readout.innerHTML='π = ['+pi.map(p=>p.toFixed(2)).join(', ')+'] &nbsp; pulls = <b>'+pulls+'</b>'+
      '<br>baseline '+(baselineOn?'<b style="color:#2dd4a0">ON</b>':'<b style="color:#ff5c7a">OFF</b>')+
      ' &nbsp; leading arm: <b>'+(bIdx+1)+'</b> at '+(pBest*100).toFixed(0)+'%';
    M.update({pulls, pBest, bestIsTwo:(bIdx===1), sawNoBaseline});
  }
  function run(){ if(timer){ stopRun(); return; } timer=setInterval(pull, 120); runBtn.textContent='⏸ Pause'; }
  function stopRun(){ if(timer){ clearInterval(timer); timer=null; } runBtn.textContent='▶ Auto-pull'; }
  const row=document.createElement('div'); row.className='ctrl';
  const pullBtn=document.createElement('button'); pullBtn.className='btn'; pullBtn.textContent='Pull ×1'; pullBtn.style.marginRight='8px'; pullBtn.onclick=pull;
  const pull25=document.createElement('button'); pull25.className='btn'; pull25.textContent='Pull ×25'; pull25.onclick=()=>{ for(let i=0;i<25;i++) pull(); };
  const runBtn=document.createElement('button'); runBtn.className='btn ghost'; runBtn.style.marginLeft='8px'; runBtn.textContent='▶ Auto-pull'; runBtn.onclick=run;
  row.appendChild(pullBtn); row.appendChild(pull25); row.appendChild(runBtn); L.ctrl.appendChild(row);
  slider(L.ctrl,'α — step size',0.05,0.6,0.05,0.3,v=>v.toFixed(2),v=>{ alpha=v; });
  chips(L.ctrl,'BASELINE (variance reduction)',['baseline ON','baseline OFF'],(i,btn,r)=>{ baselineOn=(i===0);
    [...r.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw(); }).children[0].classList.add('on');
  const resetBtn=document.createElement('button'); resetBtn.className='btn ghost'; resetBtn.textContent='Reset';
  resetBtn.onclick=()=>{ stopRun(); h=[0,0,0]; Rbar=0; n=0; pulls=0; lastA=-1; lastR=0; sawNoBaseline=false; draw(); };
  const rr=document.createElement('div'); rr.className='ctrl'; rr.appendChild(resetBtn); L.ctrl.appendChild(rr);
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Bars are the softmax action probabilities \\(\\pi(a)\\). Each pull nudges the sampled arm by \\((R-b)\\): with the <b>baseline ON</b>, only better-than-average rewards promote an arm, so the policy settles smoothly. Turn it <b>OFF</b> and every reward inflates whatever was sampled — the same optimum, much noisier.</div>';
  L.ctrl.appendChild(note);
  registerCleanup(stopRun);
  draw();
};

INTERACTIVES.rlRlhf = function(stage, api){
  const L=makeLab(stage);
  let x=0.3, beta=1.0;
  const RM = t=>1.5*t;                        // reward-model score: keeps rewarding drift
  const KL = t=>t*t;                          // KL(pi||pi_ref): 0 at the reference, grows with drift
  const trueQ = t=>1-1.8*(t-0.55)*(t-0.55);   // hidden human "true quality": peaks near 0.55
  const J = (t,b)=>RM(t)-b*KL(t);
  const xstar = b=>Math.max(0, Math.min(1.5, 0.75/Math.max(b,1e-6)));  // argmax_x J for given beta
  const XMAX=1.5;
  api.predict({
    prompt:'The reward model keeps scoring higher the further the policy drifts from the reference, but the hidden human "true quality" peaks and then falls. With <b>no KL penalty</b> (\\(\\beta=0\\)), where does maximizing the reward model push the policy?',
    choices:['To the true-quality peak','Far into reward-hacking territory (max drift), where true quality is low','It stays exactly at the reference','It oscillates forever'],
    answer:1,
    reveal:'With \\(\\beta=0\\) the objective is just the reward-model score, which is monotonically increasing in drift — so the optimum runs to maximum drift, exactly where the reward model is wrong and true quality has collapsed. That is reward hacking, and it is why the KL leash exists.',
  });
  const M=api.missions([
    {text:'<b>Reward-hack it</b>: set \\(\\beta \\le 0.1\\) and push drift \\(x \\ge 1.2\\) — reward-model score high, true quality low', xp:20,
     check:s=>s.beta<=0.1 && s.x>=1.2 && s.trueQ<0.3},
    {text:'<b>Find the sweet spot</b>: choose \\(\\beta\\) so the objective’s optimum \\(x^{*}\\) lands within 0.1 of the true-quality peak (0.55)', xp:30,
     check:s=>Math.abs(s.xstar-0.55)<0.1},
    {text:'<b>Over-leash it</b>: raise \\(\\beta \\ge 2.5\\) so the optimum collapses back toward the reference (\\(x^{*} &lt; 0.35\\))', xp:20,
     check:s=>s.beta>=2.5 && s.xstar<0.35},
  ]);
  function draw(){
    const ctx=L.ctx; clearBg(ctx,L.W,L.H);
    const x0=64, y0=50, w=510, h=300;
    const sx=t=>x0+(t/XMAX)*w;
    const yLo=-1.2, yHi=2.6;
    const sy=v=>y0+h-((v-yLo)/(yHi-yLo))*h;
    ctx.strokeStyle='rgba(255,255,255,.28)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x0,y0+h); ctx.lineTo(x0+w,y0+h); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(x0,sy(0)); ctx.lineTo(x0+w,sy(0)); ctx.stroke();
    ctx.fillStyle='#8b93b8'; ctx.font='12px '+FONT(); ctx.textAlign='center';
    ctx.fillText('policy drift from reference  (KL grows →)', x0+w/2, y0+h+34);
    function curve(f,color,w2,dash){ ctx.strokeStyle=color; ctx.lineWidth=w2; ctx.setLineDash(dash||[]); ctx.beginPath();
      for(let t=0;t<=XMAX+1e-9;t+=XMAX/240){ const X=sx(t),Y=sy(f(t)); (t===0?ctx.moveTo(X,Y):ctx.lineTo(X,Y)); } ctx.stroke(); ctx.setLineDash([]); }
    curve(RM,'#2dd4a0',2.5);
    curve(t=>beta*KL(t),'#ff5c7a',2.5);
    curve(t=>J(t,beta),'#7c5cff',3);
    curve(trueQ,'#ffc94d',2,[6,5]);
    const xs=xstar(beta);
    ctx.strokeStyle='rgba(0,212,255,.9)'; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(sx(x),y0); ctx.lineTo(sx(x),y0+h); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.setLineDash([2,4]); ctx.beginPath(); ctx.moveTo(sx(xs),y0); ctx.lineTo(sx(xs),y0+h); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='#00d4ff'; ctx.beginPath(); ctx.arc(sx(x),sy(J(x,beta)),5,0,7); ctx.fill();
    ctx.textAlign='left'; ctx.font='700 12px '+FONT();
    ctx.fillStyle='#2dd4a0'; ctx.fillText('— reward model rφ', x0+8, y0+16);
    ctx.fillStyle='#ff5c7a'; ctx.fillText('— β·KL penalty', x0+8, y0+34);
    ctx.fillStyle='#7c5cff'; ctx.fillText('— objective J = rφ − β·KL', x0+8, y0+52);
    ctx.fillStyle='#ffc94d'; ctx.fillText('·· hidden true quality', x0+8, y0+70);
    ctx.fillStyle='#8b93b8'; ctx.font='11px '+FONT();
    ctx.fillText('J-optimum x* ≈ '+xs.toFixed(2), sx(xs)+6, y0+90);
    L.readout.innerHTML='drift x = '+x.toFixed(2)+' &nbsp; β = '+beta.toFixed(2)+
      '<br>reward rφ = <b style="color:#2dd4a0">'+RM(x).toFixed(2)+'</b> &nbsp; β·KL = <b style="color:#ff5c7a">'+(beta*KL(x)).toFixed(2)+'</b>'+
      ' &nbsp; J = <b style="color:#b9a8ff">'+J(x,beta).toFixed(2)+'</b>'+
      '<br>true quality = <b style="color:#ffc94d">'+trueQ(x).toFixed(2)+'</b> &nbsp; objective optimum x* = <b>'+xs.toFixed(2)+'</b>';
    M.update({x, beta, xstar:xs, trueQ:trueQ(x)});
  }
  slider(L.ctrl,'x — policy drift from the reference',0,XMAX,0.05,0.3,v=>v.toFixed(2),v=>{ x=v; draw(); });
  slider(L.ctrl,'β — KL penalty weight',0,3,0.05,1.0,v=>v.toFixed(2),v=>{ beta=v; draw(); });
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The <b style="color:#7c5cff">objective</b> is the reward-model score minus \\(\\beta\\) times the KL distance to the reference model. The <b style="color:#00d4ff">blue dot</b> is your current policy; the white dashed line is the \\(\\beta\\)-dependent optimum \\(x^{*}\\). The <b style="color:#ffc94d">dashed gold</b> curve — real human quality — is what the reward model is only an imperfect proxy for. Too little \\(\\beta\\): the optimum runs right past the peak into reward-hacking.</div>';
  L.ctrl.appendChild(note);
  draw();
};
