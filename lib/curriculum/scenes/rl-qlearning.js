/* ================================================================
   SCENE LESSON — rl-qlearning (Q-Learning: Value from Experience).
   ----------------------------------------------------------------
   P2 wave K: second RL lesson, appended after rl-mdp in the `rl` world.
   Content harvested from PR #67's rl-qlearning draft (prose/quiz IDEAS —
   the TD-error/epsilon-greedy/"Q fills in from the goal outward" framing)
   and rebuilt from scratch against the current Scene Kit schema; none of
   that PR's code is reused (labs-era APIs don't exist here).

   THE ONE IDEA (the model-FREE contrast with rl-mdp): value iteration
   swept a KNOWN model (P and R queried analytically, every state at
   once). Q-learning learns Q(s,a) from SAMPLED transitions alone — the
   SAME gridworld, the SAME discount gamma=0.9 (rl-math.js's
   CANONICAL_GAMMA), so the two lessons' results are directly comparable.
   The engine is the TD error:
     delta = r + gamma * max_a' Q(s',a') - Q(s,a)
     Q(s,a) <- Q(s,a) + alpha * delta
   off-policy because max_a' is independent of whichever action the
   epsilon-greedy BEHAVIOR actually takes next; exploration matters
   because only VISITED (s,a) pairs ever update. Seven scenes:

     1 ql.tdupdate    ONE observed transition: the TD error and update,
                        seen on a single (s,a,r,s') sample
     2 ql.stepsize    repeating the SAME transition: alpha as a step
                        size blending old estimate toward the TD target
     3 ql.episodes    epsilon-greedy episodes: Q fills in from the goal
                        outward as sampled experience accumulates
     4 ql.exploration a cell greedy alone never visits — exploration is
                        the only thing that ever teaches it
     5 ql.offpolicy   the TD target uses max_a', never the action the
                        exploring agent actually takes next
     6 ql.compare     Q-learning's greedy policy vs rl-mdp's
                        value-iteration policy, side by side
     7 ql.capstone    tune alpha/epsilon/episodes to a policy-quality
                        target, then cover the exploration blind spot

   Model/pure math live in ./rl-math.js — CANONICAL_GAMMA, qLearn,
   qGreedyAction are P2 wave K's ADDITIVE exports (rl-mdp's own exports
   are untouched). NO KIT CHANGES.
   ================================================================ */
import {
  registerScene, vec, makeRng, handle, slider,
  point, polygon, vector, label, cellGrid, bars, curve,
  goal,
} from '../../scene/index.js';
import {
  ROWS, COLS, GOAL, PIT, WALLS, START,
  STEP_REWARD, GOAL_REWARD, PIT_REWARD,
  ACTIONS, rewardOf, isTerminal, succ, manhattan,
  valueIterate, greedyAction,
  CELL, GRID_AT, cellCenter, gridSnap, cellOf, freeStates,
  CANONICAL_GAMMA, qLearn, qGreedyAction,
} from './rl-math.js';

const LESSON = 'rl-qlearning';
const f2 = (x) => x.toFixed(2);
const f3 = (x) => x.toFixed(3);
const fInt = (v) => String(Math.round(v));

// Canonical demo replay params shared by the fixed-alpha/fixed-eps scenes
// (3, 4, 6) — ONE seed, so "the same learning process" is what a learner
// sees from different angles across the arc (episodes/exploration/compare).
const DEMO_SEED = 1;
const DEMO_ALPHA = 0.5;
const DEMO_EPS = 0.25;
// rl-mdp's own converged value function, for the "compare policies" scenes
// (5, 6) — SAME grid, SAME CANONICAL_GAMMA, so Q-learning's greedy policy is
// directly comparable to value iteration's, action for action.
const V_STAR = valueIterate(CANONICAL_GAMMA, 15);

/* ---- shared grid dressing (same as rl-mdp.js) ------------------------ */
const wallSquare = (r, c, key) => {
  const { x: cx, y: cy } = cellCenter(r, c), h = CELL / 2;
  return polygon(
    [vec(cx - h, cy + h), vec(cx + h, cy + h), vec(cx + h, cy - h), vec(cx - h, cy - h)],
    { color: 'muted', fill: 'muted', alpha: 0.85, closed: true, key },
  );
};
const wallEntities = () => WALLS.map((w, i) => wallSquare(w.r, w.c, 'wall' + i));
const terminalMarkers = () => [
  label('🏁', { at: cellCenter(GOAL.r, GOAL.c), key: 'goalmark' }),
  label('☠️', { at: cellCenter(PIT.r, PIT.c), key: 'pitmark' }),
];
/** max_a Q(r,c,a) grid for cellGrid (mirrors rl-mdp's V heatmaps). */
const qValueGrid = (Q) => Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => Math.max(...Q[r][c])));

/* ---- 1. TD UPDATE: one observed transition, the whole formula -------- */
/* Micro-idea: delta = r + gamma*max_a' Q(s',a') - Q(s,a); Q <- Q + alpha*delta.
   A FRESH table (Q=0 everywhere) means maxNext=0 too, so this ONE step
   reduces to newQ = alpha * R(s') — the cleanest possible first look at the
   update rule. bestAction(r,c) is a simple, LOCAL (not exported — only this
   scene needs it) helper: the action that most reduces manhattan distance to
   GOAL, tying no other scene to it. NOTE (anti-gaming, hand-verified): one
   cell, (3,1), has bestAction landing IN the pit (its shortest path to GOAL
   runs straight through it) — goal 2 explicitly excludes any terminal-bound
   transition so that cell can't be misread as a "small step" witness. */
function bestAction(r, c) {
  let best = ACTIONS[0], bestDist = Infinity;
  for (const a of ACTIONS) {
    const d = manhattan(succ(r, c, a), GOAL);
    if (d < bestDist - 1e-9) { bestDist = d; best = a; }
  }
  return best;
}
registerScene({
  id: 'ql.tdupdate',
  lesson: LESSON,
  space: 'plane2',
  extent: 4.3,
  params: { probe: vec(cellCenter(START.r, START.c).x, cellCenter(START.r, START.c).y), alpha: 0.1 },
  controls: [slider('alpha', { min: 0.05, max: 1, step: 0.05, label: 'α (learning rate)', format: f2 })],
  entities: (p) => {
    const cell = cellOf(p.probe);
    const term = isTerminal(cell.r, cell.c);
    const a = term ? null : bestAction(cell.r, cell.c);
    const ns = a ? succ(cell.r, cell.c, a) : null;
    const delta = a ? rewardOf(ns.r, ns.c) : 0;   // maxNext=0: a fresh table, s' not yet visited
    const newQ = p.alpha * delta;
    return [
      cellGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(0)), { at: GRID_AT, cell: CELL, min: PIT_REWARD, max: GOAL_REWARD }),
      ...wallEntities(),
      ...terminalMarkers(),
      point(p.probe, { color: 'accent', label: '●', handle: handle('probe', { constrain: gridSnap }), key: 'probe' }),
      label(term
        ? 'state (' + cell.r + ',' + cell.c + ') — TERMINAL, nothing to sample from here'
        : 'observed (' + cell.r + ',' + cell.c + ') --' + a.name + '--> (' + ns.r + ',' + ns.c + ')   δ = ' + f3(delta) + '   Q ← 0 + α·δ = ' + f3(newQ),
        { at: 'readout' }),
    ];
  },
  goals: [
    goal('Probe a state next to 🏁 and raise α until its Q(s,a) tops 0.5, to see how sampled TD experience — not a swept model — writes a value straight into the table',
      (s) => { const c = cellOf(s.probe); if (isTerminal(c.r, c.c)) return false; const a = bestAction(c.r, c.c); const ns = succ(c.r, c.c, a); return ns.r === GOAL.r && ns.c === GOAL.c && s.alpha * rewardOf(ns.r, ns.c) > 0.5; },
      { xp: 20, hold: 400, tag: 'temporal-difference-learning',
        focus: 'δ = R(s\') + γ·max0 − 0 = R(s\') when the table is fresh; Q ← α·δ. Only a terminal-bound sample makes δ big — this is the whole update rule, seen once.' }),
    goal('Now probe a state whose one-step move lands somewhere ordinary (no terminal) and push α to its max, to see how one sample alone barely nudges Q when no reward signal was actually observed',
      (s) => { const c = cellOf(s.probe); if (isTerminal(c.r, c.c)) return false; const a = bestAction(c.r, c.c); const ns = succ(c.r, c.c, a); return !isTerminal(ns.r, ns.c) && s.alpha >= 0.9 && Math.abs(s.alpha * rewardOf(ns.r, ns.c)) <= 0.03; },
      { xp: 20, hold: 400, tag: 'temporal-difference-learning',
        focus: 'With no bootstrapped neighbor value yet (maxNext = 0) and no terminal reward, δ is just the tiny living cost — even α = 1 can\'t manufacture a big update out of one uninformative sample.' }),
  ],
  caption: 'Drag the dot, then raise α: watch a single observed transition turn into a TD update, Q ← Q + α·δ. No model was ever consulted — just this one sampled (s,a,r,s′).',
});

/* ---- 2. STEP SIZE: repeating the SAME transition, α as a blend ------- */
/* Micro-idea: applying Q <- Q + alpha*(1 - Q) to the SAME fixed target
   (imagine a transition that always pays the full goal reward) n times in a
   row gives a closed form, Q_n = 1 - (1-alpha)^n — an exact, hand-checkable
   picture of what "step size" means: alpha blends the OLD estimate toward
   the target every time it's revisited, geometrically. This is a
   deliberately simplified TOY (one fixed, never-moving target) to isolate
   alpha alone; scenes 3+ show the real moving-target case via qLearn. */
const Qn = (alpha, n) => 1 - Math.pow(1 - alpha, n);
const N_MAX = 20;                                    // slider's max repeated-visit count
const nToX = (n) => (n / N_MAX) * 2 - 1;             // compress n in [0,20] onto world x in [-1,1]
const xToN = (x) => ((x + 1) / 2) * N_MAX;           // inverse — so the curve/point stay inside a small extent
registerScene({
  id: 'ql.stepsize',
  lesson: LESSON,
  space: 'plane2',
  extent: 1.3,
  params: { alpha: 0.3, n: 0 },
  controls: [
    slider('alpha', { min: 0.05, max: 1, step: 0.05, label: 'α (learning rate)', format: f2 }),
    slider('n', { min: 0, max: 20, step: 1, label: 'repeated visits (n)', format: fInt }),
  ],
  entities: (p) => [
    curve((x) => Qn(p.alpha, xToN(x)), { domain: [-1, 1], samples: 40, color: 'muted' }),
    point(vec(nToX(p.n), Qn(p.alpha, p.n)), { color: 'accent', key: 'now' }),
    label('Q after n=' + Math.round(p.n) + ' revisits of the SAME transition, α=' + f2(p.alpha) + ':  Q = 1 − (1−α)ⁿ = ' + f3(Qn(p.alpha, p.n)), { at: 'readout' }),
  ],
  goals: [
    goal('Push Q above 0.5 using 3 or fewer revisits (n ≤ 3), to see how a LARGE α snaps the estimate toward the target in just a handful of samples',
      (s) => s.n <= 3 && Qn(s.alpha, s.n) > 0.5,
      { xp: 20, hold: 400, tag: 'learning rate',
        focus: 'Each revisit multiplies the remaining gap by (1−α) — a big α collapses that gap fast, in only a few samples.' }),
    goal('Now drop α to 0.15 or below and dial n up to 10+ to reach the same level, to see how a SMALL α needs many more samples for the identical result',
      (s) => s.alpha <= 0.15 && s.n >= 10 && Qn(s.alpha, s.n) > 0.5,
      { xp: 25, hold: 400, tag: 'learning rate',
        focus: 'A tiny α only chips away a small fraction of the gap each time — the same final value now costs many more revisits. That trade (fast-but-jittery vs slow-but-steady) is exactly what tuning α means.' }),
  ],
  caption: 'The SAME transition, revisited n times: watch Q climb toward the target as 1 − (1−α)ⁿ. A big α closes the gap in a few visits; a small α needs far more.',
});

/* ---- 3. EPISODES: Q fills in from the goal outward ------------------- */
/* Micro-idea: raising the episode count is the sampled-experience analogue
   of rl-mdp's sweep count (rl.iteration) — but here nothing is swept over
   every state at once; only states the episodes actually VISIT update, and
   value has to bootstrap backward one episode's worth of visits at a time.
   alpha/eps/seed fixed (DEMO_*) so the ONE exposed knob is episode count. */
registerScene({
  id: 'ql.episodes',
  lesson: LESSON,
  space: 'plane2',
  extent: 4.3,
  params: { episodes: 0 },
  controls: [slider('episodes', { min: 0, max: 150, step: 1, label: 'episodes trained', format: fInt })],
  entities: (p) => {
    const Q = qLearn(DEMO_SEED, DEMO_ALPHA, DEMO_EPS, p.episodes);
    const near = { r: 0, c: 2 };   // adjacent to GOAL
    return [
      cellGrid(qValueGrid(Q), { at: GRID_AT, cell: CELL, min: PIT_REWARD, max: GOAL_REWARD }),
      ...wallEntities(),
      ...terminalMarkers(),
      label('episodes = ' + Math.round(p.episodes) + '    max Q near 🏁 (0,2) = ' + f3(Math.max(...Q[near.r][near.c])) + '    max Q at start (3,0) = ' + f3(Math.max(...Q[START.r][START.c])), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Train episodes until the cell next to 🏁 shows a real Q value (> 0.3), to see how sampled experience — not a swept model — is what first fills in a value near the reward',
      (s) => { const Q = qLearn(DEMO_SEED, DEMO_ALPHA, DEMO_EPS, s.episodes); return Math.max(...Q[0][2]) > 0.3; },
      { xp: 20, hold: 400, tag: 'temporal-difference-learning',
        focus: 'A cell next to the goal gets sampled early and often — its Q jumps as soon as an episode actually reaches 🏁 from there.' }),
    goal('Keep training until value has reached all the way back to START (max Q there > 0.1), to see how bootstrapping carries the reward backward one episode\'s visits at a time',
      (s) => { const Q = qLearn(DEMO_SEED, DEMO_ALPHA, DEMO_EPS, s.episodes); return Math.max(...Q[START.r][START.c]) > 0.1; },
      { xp: 25, hold: 400, tag: 'temporal-difference-learning',
        focus: 'START is 6 hops from 🏁 — its Q can only grow once the CELLS BETWEEN already carry some value for it to bootstrap from. A single lucky episode can\'t manufacture that; it takes repeated visits building up hop by hop.' }),
  ],
  caption: 'Train more episodes and watch the heatmap brighten outward from 🏁 — not swept over every state like rl-mdp, but filled in only where sampled experience actually walked.',
});

/* ---- 4. EXPLORATION: the cell greedy alone never visits -------------- */
/* Micro-idea: with THIS grid and THIS deterministic tie-break, pure-greedy
   (eps=0) quickly settles onto one fixed near-optimal route and — verified
   by direct simulation, stable from 150 to 10,000 episodes at DEMO_ALPHA —
   NEVER visits (1,2), a corner off that route: its Q stays EXACTLY 0
   forever. Only real exploration (eps > 0) ever reaches it. episodes fixed
   at DEMO_EPISODES so cranking episodes alone (with eps=0) cannot fake
   coverage — the anti-gaming floor is structural, not a threshold pick. */
const DEMO_EPISODES_EXPLORE = 150;
const BLIND_SPOT = { r: 1, c: 2 };
registerScene({
  id: 'ql.exploration',
  lesson: LESSON,
  space: 'plane2',
  extent: 4.3,
  params: { eps: 0 },
  controls: [slider('eps', { min: 0, max: 0.3, step: 0.02, label: 'ε (exploration rate)', format: f2 })],
  entities: (p) => {
    const Q = qLearn(DEMO_SEED, DEMO_ALPHA, p.eps, DEMO_EPISODES_EXPLORE);
    return [
      cellGrid(qValueGrid(Q), { at: GRID_AT, cell: CELL, min: PIT_REWARD, max: GOAL_REWARD }),
      ...wallEntities(),
      ...terminalMarkers(),
      label('ε = ' + f2(p.eps) + '   Q at the blind-spot cell (1,2) = ' + f3(Math.max(...Q[BLIND_SPOT.r][BLIND_SPOT.c])) + '  (after ' + DEMO_EPISODES_EXPLORE + ' episodes)', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Raise ε until the blind-spot cell (1,2) finally shows a real Q value (> 0.3), to see how only VISITED (s,a) pairs ever learn — greedy alone would leave this cell exactly 0 no matter how long you trained it',
      (s) => Math.max(...qLearn(DEMO_SEED, DEMO_ALPHA, s.eps, DEMO_EPISODES_EXPLORE)[BLIND_SPOT.r][BLIND_SPOT.c]) > 0.3,
      { xp: 30, hold: 500, tag: 'exploration-exploitation',
        focus: 'At ε=0 the greedy policy locks onto one fixed route and this cell sits off it — its Q is stuck at exactly 0, forever, no matter the episode count. Exploration is the ONLY thing that ever samples it.' }),
    goal('Push ε past 0.15 to drive that same cell above 0.7, to see how exploration is a DIAL, not a one-time fix — more of it samples the grid more thoroughly, not just enough to nudge a stuck cell off zero',
      (s) => s.eps >= 0.15 && Math.max(...qLearn(DEMO_SEED, DEMO_ALPHA, s.eps, DEMO_EPISODES_EXPLORE)[BLIND_SPOT.r][BLIND_SPOT.c]) > 0.7,
      { xp: 25, hold: 500, tag: 'exploration-exploitation',
        focus: 'A little exploration reaches the cell at all; more exploration means it gets visited often enough for its Q to actually approach the value a fully-covered cell would have.' }),
  ],
  caption: 'This corner cell sits off the greedy route — at ε = 0 its Q never leaves 0, no matter how long you train. Raise ε to see exploration finally reach it.',
});

/* ---- 5. OFF-POLICY: the target uses max, never the action taken ------ */
/* Micro-idea: Q(s',.) here is a REAL, already-trained value (qLearn at a
   fixed checkpoint) with genuinely different entries per action — the
   learner cycles through "which action the exploring agent assumes it
   takes next" and watches the TD target (which always uses max_a') never
   move. That decoupling of the BEHAVIOR (whatever action gets picked next)
   from the TARGET (always the best one) is exactly what "off-policy" means. */
const QPRIME = qLearn(DEMO_SEED, DEMO_ALPHA, DEMO_EPS, 40)[0][1];   // a real, mixed Q(s',.) — cell (0,1)
const QPRIME_MAX_IDX = QPRIME.indexOf(Math.max(...QPRIME));
const R_SAMPLE = STEP_REWARD;   // the (fixed, illustrative) reward on the transition INTO s'
const tdTarget = () => R_SAMPLE + CANONICAL_GAMMA * Math.max(...QPRIME);   // independent of pickedAction, by construction
// bars() draws bar i at world x in [AT.x + i*(W+GAP), AT.x + i*(W+GAP) + W] (draw.js
// defaults W=0.6, GAP=0.4 — not overridden below); the "picked" marker below re-derives
// that same per-bar center so it sits on top of the bar it is highlighting.
const BARS_AT = vec(-2, -1.4);
const BAR_W = 0.6, BAR_GAP = 0.4;
const barCenterX = (i) => BARS_AT.x + i * (BAR_W + BAR_GAP) + BAR_W / 2;
registerScene({
  id: 'ql.offpolicy',
  lesson: LESSON,
  space: 'plane2',
  extent: 3,
  params: { pickedAction: QPRIME_MAX_IDX },
  controls: [slider('pickedAction', { min: 0, max: 3, step: 1, label: 'assumed next action', format: (v) => ACTIONS[Math.round(v)].name })],
  entities: (p) => {
    const picked = Math.round(p.pickedAction);
    return [
      bars(QPRIME, { at: BARS_AT, labels: ACTIONS.map((a) => a.name), color: 'accent2' }),
      point(vec(barCenterX(picked), BARS_AT.y + QPRIME[picked]), { color: 'warn', label: 'picked', key: 'picked' }),
      label('Q(s\', ' + ACTIONS[picked].name + ') = ' + f3(QPRIME[picked]) + '    TD target = r + γ·max_a′Q(s′,a′) = ' + f3(tdTarget()) + '  (unchanged)', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Move the assumed next action off the greedy pick (' + ACTIONS[QPRIME_MAX_IDX].name + ') to see how the TD target holds steady — off-policy means the target never depends on which action the exploring agent actually takes next',
      (s) => Math.round(s.pickedAction) !== QPRIME_MAX_IDX,
      { xp: 20, tag: 'q-learning',
        focus: 'The bars change as you cycle actions — the target readout never does. It always uses max_a′Q(s′,a′), regardless of what gets picked next.' }),
    goal('Now land on the WORST action (the lowest bar) to confirm the target is unmoved even at that extreme, to see how the behavior and the value being learned are fully decoupled',
      (s) => Math.round(s.pickedAction) === QPRIME.indexOf(Math.min(...QPRIME)),
      { xp: 25, hold: 400, tag: 'q-learning',
        focus: 'Even parked on the worst possible next action, the target term is exactly the same number — it was never computed from whatever the agent does next, only from the BEST option available.' }),
  ],
  caption: 'Q(s′,·) is a real, already-learned value — cycle through which action the exploring agent assumes it takes next. The TD target only ever reads off the max: that is what makes Q-learning off-policy.',
});

/* ---- 6. COMPARE: Q-learning's greedy policy vs value iteration's ----- */
/* Micro-idea: the lesson's core payoff — sampled experience alone (this
   scene's Q) converges onto the SAME greedy policy value iteration
   computed analytically from a known model (rl-mdp's V_STAR). matches
   counts states where argmax_a Q(s,a) agrees with V_STAR's greedy action;
   verified: matches=7/12 at episodes=0 for ANY alpha/eps (Q≡0 ties every
   state to the first action, a fixed fact independent of the sliders —
   the baseline-safety argument goal 2 relies on), climbing to 12/12 by
   ~episode 20 and STABLE through episode 300 (isolated jitter at ep 11/14
   only — an honest glimpse of "fixed alpha never fully settles"). */
const freeNonTerminal = freeStates().filter((s) => !isTerminal(s.r, s.c));
const matchCount = (Q) => freeNonTerminal.filter((s) => qGreedyAction(Q, s.r, s.c).name === greedyAction(V_STAR, s.r, s.c).name).length;
registerScene({
  id: 'ql.compare',
  lesson: LESSON,
  space: 'plane2',
  extent: 4.3,
  params: { probe: vec(cellCenter(START.r, START.c).x, cellCenter(START.r, START.c).y), episodes: 0 },
  controls: [slider('episodes', { min: 0, max: 100, step: 1, label: 'episodes trained', format: fInt })],
  entities: (p) => {
    const Q = qLearn(DEMO_SEED, DEMO_ALPHA, DEMO_EPS, p.episodes);
    const cell = cellOf(p.probe);
    const term = isTerminal(cell.r, cell.c);
    const qA = term ? null : qGreedyAction(Q, cell.r, cell.c);
    const vA = term ? null : greedyAction(V_STAR, cell.r, cell.c);
    const arrows = freeNonTerminal.map((s) => {
      const a = qGreedyAction(Q, s.r, s.c);
      const c0 = cellCenter(s.r, s.c);
      const len = CELL * 0.32;
      const match = a.name === greedyAction(V_STAR, s.r, s.c).name;
      return vector(vec(c0.x + a.dc * len, c0.y - a.dr * len), { from: vec(c0.x, c0.y), color: match ? 'good' : 'warn', key: 'pol' + s.r + '-' + s.c });
    });
    return [
      cellGrid(qValueGrid(Q), { at: GRID_AT, cell: CELL, min: PIT_REWARD, max: GOAL_REWARD }),
      ...wallEntities(),
      ...arrows,
      ...terminalMarkers(),
      point(p.probe, { color: 'accent', label: '●', handle: handle('probe', { constrain: gridSnap }), key: 'probe' }),
      label((term ? 'TERMINAL' : 'Q-learned action = ' + qA.name + ', value-iteration action = ' + vA.name + (qA.name === vA.name ? ' (agree)' : ' (DISAGREE)')) + '    matches V* elsewhere: ' + matchCount(Q) + '/' + freeNonTerminal.length, { at: 'readout' }),
    ];
  },
  goals: [
    goal('Find a state (via the probe) where the two policies still disagree, to see how an under-visited (s,a) pair can point the wrong way even after some training',
      (s) => { const c = cellOf(s.probe); return !isTerminal(c.r, c.c) && qGreedyAction(qLearn(DEMO_SEED, DEMO_ALPHA, DEMO_EPS, s.episodes), c.r, c.c).name !== greedyAction(V_STAR, c.r, c.c).name; },
      { xp: 25, tag: 'greedy policy',
        focus: 'A disagreement means that cell hasn\'t sampled enough of its own neighbors\' values yet — sampled learning fixes this gradually, not all at once like a swept model would.' }),
    goal('Now train episodes until EVERY state agrees with value iteration\'s policy, to see how sampled experience alone converges onto the SAME optimal policy a known-model sweep computed analytically',
      (s) => matchCount(qLearn(DEMO_SEED, DEMO_ALPHA, DEMO_EPS, s.episodes)) === freeNonTerminal.length,
      { xp: 35, hold: 500, tag: 'q-learning',
        focus: 'Value iteration knew P and R and swept every state at once; Q-learning only ever saw sampled (s,a,r,s\') tuples — yet here they land on the identical greedy policy.' }),
  ],
  caption: 'Green arrows agree with rl-mdp\'s value-iteration policy; orange disagree. Probe a disagreement, then train until every arrow turns green — model-free learning catching up to the known-model answer.',
});

/* ---- 7. CAPSTONE: tune (α, ε, episodes) to a policy-quality target --- */
/* THE EXAM. Reset ALWAYS pins episodes=0 (mirrors rl-mdp's k=0 reset) —
   CLOSED-FORM BASELINE SAFETY: qLearn(*, *, *, 0) never runs its episode
   loop, so Q stays IDENTICALLY the zero table for EVERY alpha/eps (verified
   directly against the implementation, not just by construction). At Q≡0,
   every state ties every action to the first (N), which happens to match
   V_STAR's greedy action at EXACTLY 7 of the 12 free non-terminal cells —
   a fixed fact of this grid, independent of alpha/eps/target. Goal 1/2
   require matchCount > 7 (both draws of `target1` are 9 and 10, both > 7),
   so they are false at reset for EVERY alpha/eps. Goal 3 requires the
   blind-spot cell's Q > 0.3, and Q≡0 there too at episodes=0 — false
   regardless of alpha/eps. All three goals are therefore false at the
   reset params for BOTH possible target1 draws, with no simulation
   required (checked exhaustively in the test file as belt-and-suspenders,
   same style as rl-mdp's capstone). */
export const TARGET1_OPTIONS = [9, 10];
function randomize(rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  return { alpha: 0.5, eps: 0.25, episodes: 0, target1: pick(TARGET1_OPTIONS) };
}
registerScene({
  id: 'ql.capstone',
  lesson: LESSON,
  capstone: true,
  randomize,
  space: 'plane2',
  extent: 4.3,
  params: randomize(makeRng(1)),
  controls: [
    slider('alpha', { min: 0.05, max: 1, step: 0.05, label: 'α (learning rate)', format: f2 }),
    slider('eps', { min: 0, max: 0.5, step: 0.02, label: 'ε (exploration rate)', format: f2 }),
    slider('episodes', { min: 0, max: 150, step: 1, label: 'episodes trained', format: fInt }),
  ],
  entities: (p) => {
    const Q = qLearn(DEMO_SEED, p.alpha, p.eps, p.episodes);
    return [
      cellGrid(qValueGrid(Q), { at: GRID_AT, cell: CELL, min: PIT_REWARD, max: GOAL_REWARD }),
      ...wallEntities(),
      ...terminalMarkers(),
      label('α=' + f2(p.alpha) + ' ε=' + f2(p.eps) + ' episodes=' + Math.round(p.episodes) + '   matches V*: ' + matchCount(Q) + '/' + freeNonTerminal.length + ' (target ≥ ' + p.target1 + ')   blind-spot Q(1,2)=' + f3(Math.max(...Q[BLIND_SPOT.r][BLIND_SPOT.c])), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Reach your assigned policy-match target (≥ your assigned count) to see how enough sampled experience alone matches a policy quality close to value iteration\'s known-model answer',
      (s) => matchCount(qLearn(DEMO_SEED, s.alpha, s.eps, s.episodes)) >= s.target1,
      { xp: 40, hold: 700, tag: 'q-learning',
        focus: 'All three knobs matter: α sets how fast each sample updates Q, ε sets how much of the grid ever gets sampled, and episodes sets how long you\'ve been running.' }),
    goal('Push further: match value iteration\'s policy at EVERY free state, to see how sampled experience alone closes the LAST gaps a known-model sweep would have gotten for free',
      (s) => matchCount(qLearn(DEMO_SEED, s.alpha, s.eps, s.episodes)) === freeNonTerminal.length,
      { xp: 40, hold: 700, tag: 'temporal-difference-learning',
        focus: 'The hardest disagreements are usually the least-visited corners — the same knobs, tuned harder, are what closes them.' }),
    goal('Finally, raise ε enough to light up the exploration blind-spot cell (1,2) too (Q > 0.3), to see how exploration alone reaches what greedy exploitation would leave permanently unlearned',
      (s) => Math.max(...qLearn(DEMO_SEED, s.alpha, s.eps, s.episodes)[BLIND_SPOT.r][BLIND_SPOT.c]) > 0.3,
      { xp: 40, hold: 700, tag: 'exploration-exploitation',
        focus: 'No amount of α or episodes substitutes for ε here — a cell that\'s never sampled never updates, no matter how long you run.' }),
  ],
  caption: 'No hints now. Tune α, ε, and episode count to hit your assigned policy-match target, then match value iteration everywhere, then light up the one cell that only exploration ever reaches.',
});
