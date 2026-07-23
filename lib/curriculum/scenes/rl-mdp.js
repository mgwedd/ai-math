/* ================================================================
   SCENE LESSON — rl-mdp (Markov Decision Processes: the Gridworld).
   ----------------------------------------------------------------
   P2 wave H: founds the new `rl` world. Content harvested from PR #67's
   rl-mdp draft (prose/quiz IDEAS + the 4x4-gridworld/value-iteration/
   greedy-policy lab design) and rebuilt from scratch in the current
   Scene Kit schema — none of that PR's code is reused (it targets a dead
   repo iteration: World 4 / la-markov / order fields don't exist here).

   THE ONE IDEA: a Markov decision process is fully specified by its
   REWARDS — nothing else tells an agent what "good" means. The Bellman
   optimality backup V(s) = R(s) + gamma*max_a V(succ(s,a)) is a
   gamma-contraction: repeating it (value iteration) converges to a
   unique fixed point V*, and the OPTIMAL policy falls straight out of
   V* by one argmax per state (no separate learning step). Six scenes:

     1 rl.anatomy    meet the grid — states, rewards, TWO terminals
     2 rl.bellman    one Bellman backup only informs a terminal's
                       immediate neighbors — sweeps propagate outward
     3 rl.discount   gamma slider: horizon control (grow / shrink)
     4 rl.iteration  k slider: sweeps toward the fixed point (a
                       CONTRACTION — the residual provably shrinks)
     5 rl.policy     greedy policy = one argmax over V*, read off live
     6 rl.capstone   push gamma AND k to hit an assigned value target,
                       twice, then reach the exact fixed point

   Model, constants and pure math live in ./rl-math.js (a shared module
   for the whole `rl` world, mirroring vec-math.js's role for `la`;
   AUTHORING_SCENES.md §2 "lesson math lives with the content").

   NO KIT CHANGES. Grid layout (goal/pit/walls/START) is FIXED across
   every scene, including the capstone — only the capstone's ASSIGNED
   SIDE (which value-threshold direction to hit) is randomized, exactly
   like la-boss's CAP_SIDES. See the capstone's own header comment for
   the closed-form baseline-safety argument.
   ================================================================ */
import {
  registerScene, vec, makeRng, handle, slider,
  point, polygon, vector, label, cellGrid,
  goal,
} from '../../scene/index.js';
import {
  ROWS, COLS, GOAL, PIT, WALLS, START,
  STEP_REWARD, GOAL_REWARD, PIT_REWARD,
  rewardOf, isTerminal,
  valueIterate, residual, greedyAction, succ,
  CELL, GRID_AT, cellCenter, gridSnap, cellOf, manhattan, freeStates,
} from './rl-math.js';

const LESSON = 'rl-mdp';
const f2 = (x) => x.toFixed(2);
const f3 = (x) => x.toFixed(3);

// The lesson's canonical discount factor — used wherever gamma ISN'T the
// thing being manipulated (scenes 2 and 5), so the demo isolates the one
// knob each of those scenes is actually about.
const GAMMA = 0.9;
const K_CONVERGED = 15;   // past the k=7 exact-fixed-point step for any gamma in [0,0.9] (see rl.iteration's header note)

/* ---- shared grid dressing: reward heatmap backdrop + wall squares + terminal markers --- */
const REWARD_GRID = Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => rewardOf(r, c)));
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

/* ---- 1. ANATOMY: meet the grid — rewards + two terminals ------------ */
/* Micro-idea: the reward function IS the task. Nothing else specifies
   what the agent should do — reaching GOAL (+1) or PIT (-1) both end the
   episode; every other cell just pays a small constant living cost. */
registerScene({
  id: 'rl.anatomy',
  lesson: LESSON,
  space: 'plane2',
  extent: 4.3,
  params: { probe: vec(cellCenter(START.r, START.c).x, cellCenter(START.r, START.c).y) },
  entities: (p) => {
    const cell = cellOf(p.probe);
    const term = isTerminal(cell.r, cell.c);
    return [
      cellGrid(REWARD_GRID, { at: GRID_AT, cell: CELL, min: PIT_REWARD, max: GOAL_REWARD }),
      ...wallEntities(),
      ...terminalMarkers(),
      point(p.probe, { color: 'accent', label: '●', handle: handle('probe', { constrain: gridSnap }), key: 'probe' }),
      label('state (' + cell.r + ',' + cell.c + ')   R(s) = ' + f2(rewardOf(cell.r, cell.c)) + (term ? '  — TERMINAL: episode ends here' : ''), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Drag the probe onto the goal 🏁',
      (s) => { const c = cellOf(s.probe); return c.r === GOAL.r && c.c === GOAL.c; },
      { xp: 20, hold: 300, tag: 'markov decision process',
        focus: 'The reward function is the ONLY specification of the task — 🏁 pays +1 and ends the episode. Nothing else tells the agent this is the goal.' }),
    goal('Now find the pit ☠️',
      (s) => { const c = cellOf(s.probe); return c.r === PIT.r && c.c === PIT.c; },
      { xp: 20, hold: 300, tag: 'markov decision process',
        focus: 'A negative terminal is just as real a signal as a positive one — the agent learns to avoid ☠️ purely from this number, never from an explicit rule.' }),
  ],
  caption: 'Drag the dot across the grid — every cell has a reward, and two are terminal: land on 🏁 (+1) or ☠️ (−1) and the episode ends right there. This reward function is the entire task specification.',
});

/* ---- 2. BELLMAN: one backup only reaches immediate neighbors -------- */
/* Micro-idea: V1(s) = R(s) + gamma*max(neighbor V0) — after exactly ONE
   sweep, only states touching a terminal have any useful information;
   everywhere else still reads the bare living cost. Sets up scene 4's
   "sweeps propagate outward" idea. gamma is FIXED here (0.9) — this
   scene is about the BACKUP MECHANIC, not the discount. */
registerScene({
  id: 'rl.bellman',
  lesson: LESSON,
  space: 'plane2',
  extent: 4.3,
  params: { probe: vec(cellCenter(START.r, START.c).x, cellCenter(START.r, START.c).y) },
  entities: (p) => {
    const V1 = valueIterate(GAMMA, 1);
    const cell = cellOf(p.probe);
    const v1 = V1[cell.r][cell.c];
    return [
      cellGrid(V1, { at: GRID_AT, cell: CELL, min: PIT_REWARD, max: GOAL_REWARD }),
      ...wallEntities(),
      ...terminalMarkers(),
      point(p.probe, { color: 'accent', label: '●', handle: handle('probe', { constrain: gridSnap }), key: 'probe' }),
      label('state (' + cell.r + ',' + cell.c + ')   V₁(s) = R(s) + γ·max(neighbor V₀) = ' + f3(v1), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Probe a state right next to 🏁 and watch V₁ light up (V₁ > 0.5)',
      (s) => valueIterate(GAMMA, 1)[cellOf(s.probe).r][cellOf(s.probe).c] > 0.5,
      { xp: 20, hold: 400, tag: 'bellman equation',
        focus: 'Only a terminal-adjacent state has a terminal in its max — one backup barely moved it from 0, but that jump is real: R(s) + γ·1 ≈ 0.88.' }),
    goal('Now probe a state 3–4 steps from 🏁 — after just one sweep it is UNCHANGED (still ≈ the bare living cost)',
      (s) => { const c = cellOf(s.probe), d = manhattan(c, GOAL); return d >= 3 && d <= 4 && Math.abs(valueIterate(GAMMA, 1)[c.r][c.c] - STEP_REWARD) < 0.005; },
      { xp: 20, hold: 400, tag: 'bellman equation',
        focus: 'A single backup only reads CURRENT neighbor values — states two hops or more from a terminal still see all-zero neighbors, so V₁ is just R(s). Information has to sweep outward one hop per backup.' }),
  ],
  caption: 'One Bellman backup only updates a state from its immediate neighbors’ CURRENT values. Drag next to 🏁 and watch V₁ jump; drag farther away and it still reads the bare living cost.',
});

/* ---- 3. DISCOUNT: gamma as horizon control (grow / shrink) ---------- */
/* Micro-idea: the far corner's value only grows once gamma is high
   enough to make the discounted +1 outweigh the accumulated living
   cost along the way — and collapses back to ~STEP_REWARD once gamma
   drops. k is fixed high enough to always be fully converged (this
   scene is about gamma, not sweep count). */
registerScene({
  id: 'rl.discount',
  lesson: LESSON,
  space: 'plane2',
  extent: 4.3,
  params: { gamma: 0.7 },
  controls: [slider('gamma', { min: 0, max: 0.9, step: 0.05, label: 'γ (discount)', format: f2 })],
  entities: (p) => {
    const V = valueIterate(p.gamma, K_CONVERGED);
    return [
      cellGrid(V, { at: GRID_AT, cell: CELL, min: PIT_REWARD, max: GOAL_REWARD }),
      ...wallEntities(),
      ...terminalMarkers(),
      label('γ = ' + f2(p.gamma) + '    V(start) = ' + f3(V[START.r][START.c]) + '    (start is the farthest cell from either terminal)', { at: 'readout' }),
    ];
  },
  goals: [
    goal('Raise γ until the goal’s pull reaches all the way to start: V(start) > 0.1',
      (s) => valueIterate(s.gamma, K_CONVERGED)[START.r][START.c] > 0.1,
      { xp: 25, hold: 500, tag: 'discounting',
        focus: 'A higher γ weighs distant future reward more — raise it enough and the discounted +1, propagated hop by hop, finally outweighs six hops of living cost.' }),
    goal('Now lower γ until start goes back to (nearly) the bare living cost: V(start) < 0',
      (s) => valueIterate(s.gamma, K_CONVERGED)[START.r][START.c] < 0,
      { xp: 25, hold: 500, tag: 'discounting',
        focus: 'Low γ discounts the far-off +1 into irrelevance — the agent effectively can’t see past a step or two, so all that is left is the immediate cost of existing.' }),
  ],
  caption: 'Slide γ, the discount factor — it sets how far into the future the agent bothers to look. Push it up and the goal’s value reaches the far corner; push it down and only the living cost survives.',
});

/* ---- 4. ITERATION: sweeps toward the fixed point (the contraction) -- */
/* Micro-idea: k counts synchronous Bellman sweeps from V0=0. The Bellman
   operator is a gamma-contraction, so ||V_k - V_{k-1}|| shrinks toward 0
   — for THIS finite grid it reaches EXACT zero once the wavefront has
   swept the full 6-hop radius (k=7, independent of gamma: it's the
   grid's eccentricity, not a rate). gamma is fixed at the lesson's
   canonical 0.9 (this scene is about sweep count, not discount). */
registerScene({
  id: 'rl.iteration',
  lesson: LESSON,
  space: 'plane2',
  extent: 4.3,
  params: { k: 0 },
  controls: [slider('k', { min: 0, max: 10, step: 1, label: 'sweeps (k)', format: (v) => String(Math.round(v)) })],
  entities: (p) => {
    const V = valueIterate(GAMMA, p.k);
    const r = residual(GAMMA, p.k);
    return [
      cellGrid(V, { at: GRID_AT, cell: CELL, min: PIT_REWARD, max: GOAL_REWARD }),
      ...wallEntities(),
      ...terminalMarkers(),
      label('k = ' + Math.round(p.k) + ' sweeps    V(start) = ' + f3(V[START.r][START.c]) + '    Δ = ‖V_k − V_(k−1)‖ = ' + (p.k < 1 ? '—' : f3(r)), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Advance k until the goal’s value finally reaches start (V(start) > 0)',
      (s) => valueIterate(GAMMA, s.k)[START.r][START.c] > 0,
      { xp: 25, hold: 400, tag: 'bellman equation',
        focus: 'Each sweep propagates value one hop further from a terminal — start is 6 hops from 🏁, so it takes that many sweeps before any of it reaches this far.' }),
    goal('Push further until the residual hits (numerically) zero — you’ve reached the exact fixed point',
      (s) => residual(GAMMA, s.k) < 1e-6,
      { xp: 30, hold: 400, tag: 'value iteration',
        focus: 'Once every state’s best neighbor stops changing, another sweep recomputes the SAME values — that is the fixed point value iteration is guaranteed to converge to.' }),
  ],
  caption: 'Each tick of k is one more synchronous Bellman sweep across every state at once. Watch the heatmap’s wavefront crawl outward from 🏁/☠️ until it stops changing — that is the fixed point.',
});

/* ---- 5. POLICY: the greedy policy is one argmax over V* ------------- */
/* Micro-idea: reading off a policy needs no separate learning step —
   pi(s) = argmax_a V*(succ(s,a)), computed once V* is known. gamma/k are
   fixed at the lesson's converged canonical values; the probe is purely
   for exploring the (already-drawn) policy field. */
const V_STAR = valueIterate(GAMMA, K_CONVERGED);
const ARROW_LEN = CELL * 0.32;
const policyArrows = () => freeStates()
  .filter((s) => !isTerminal(s.r, s.c))
  .map((s) => {
    const a = greedyAction(V_STAR, s.r, s.c);
    const c = cellCenter(s.r, s.c);
    const tip = vec(c.x + a.dc * ARROW_LEN, c.y - a.dr * ARROW_LEN);
    return vector(tip, { from: vec(c.x, c.y), color: 'good', key: 'pol' + s.r + '-' + s.c });
  });
registerScene({
  id: 'rl.policy',
  lesson: LESSON,
  space: 'plane2',
  extent: 4.3,
  params: { probe: vec(cellCenter(START.r, START.c).x, cellCenter(START.r, START.c).y) },
  entities: (p) => {
    const cell = cellOf(p.probe);
    const a = isTerminal(cell.r, cell.c) ? null : greedyAction(V_STAR, cell.r, cell.c);
    return [
      cellGrid(V_STAR, { at: GRID_AT, cell: CELL, min: PIT_REWARD, max: GOAL_REWARD }),
      ...wallEntities(),
      ...policyArrows(),
      ...terminalMarkers(),
      point(p.probe, { color: 'accent', label: '●', handle: handle('probe', { constrain: gridSnap }), key: 'probe' }),
      label('state (' + cell.r + ',' + cell.c + ')' + (a ? '   greedy action = ' + a.name + ' (argmax over neighbor values in V∗)' : '   TERMINAL — no action taken'), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Find a state whose greedy arrow points E, straight toward the goal’s column',
      (s) => { const c = cellOf(s.probe); return !isTerminal(c.r, c.c) && greedyAction(V_STAR, c.r, c.c).name === 'E'; },
      { xp: 25, hold: 400, tag: 'greedy policy',
        focus: 'The policy is read straight off V* — no separate learning step: whichever neighbor has the highest value IS the action, every time.' }),
    goal('Now find a state next to ☠️ and confirm its arrow steers AROUND the pit, never into it',
      (s) => { const c = cellOf(s.probe); if (isTerminal(c.r, c.c) || manhattan(c, PIT) !== 1) return false; const a = greedyAction(V_STAR, c.r, c.c); const nxt = succ(c.r, c.c, a); return !(nxt.r === PIT.r && nxt.c === PIT.c); },
      { xp: 25, hold: 400, tag: 'greedy policy',
        focus: 'V*(☠️) = −1 always loses the argmax against any other neighbor — the optimal policy avoids the pit purely because its value says so, with no explicit "don’t step here" rule.' }),
  ],
  caption: 'Every arrow is read straight off V* with one argmax — no separate policy network, no extra learning step. Explore a few states and notice the flow curls toward 🏁 and steers wide of ☠️.',
});

/* ---- 6. CAPSTONE: the exam ------------------------------------------- */
/* THE EXAM. Grid layout is FIXED (same as every other scene) — only the
   ASSIGNED SIDE is randomized (mirrors la-boss's CAP_SIDES exactly: a
   single, cleanly-provable randomized dimension rather than a
   combinatorial threshold sweep). gamma/k reset to the identity (0.7, 0)
   every attempt.

   CAPSTONE BASELINE-SAFETY (closed-form, holds for BOTH possible
   draws): valueIterate(*, 0) performs ZERO sweeps and returns V(start) =
   0 for EVERY gamma (the loop body never runs) — so goal 1 and goal 2
   (which both compare V(start) against a nonzero threshold, in either
   direction) are false at k=0 regardless of gamma or side. Goal 3
   requires residual(*, k) < 1e-6, and residual(*, 0) = +Infinity BY
   DEFINITION (k<1 guard in rl-math.js) — also false regardless of
   gamma/side. All three goals are therefore false at the reset params
   for both possible `side` draws, with no simulation required. */
export const CAP_SIDES = [1, -1];
const V_HIGH_1 = 0.05, V_HIGH_2 = 0.15;   // side=1: push V(start) up past these, in order
const V_LOW_1 = -0.01, V_LOW_2 = -0.025;  // side=-1: push V(start) down past these, in order
const vAt = (gamma, k) => valueIterate(gamma, k)[START.r][START.c];
function randomize(rng) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  return { gamma: 0.7, k: 0, side: pick(CAP_SIDES) };
}
registerScene({
  id: 'rl.capstone',
  lesson: LESSON,
  capstone: true,
  randomize,
  space: 'plane2',
  extent: 4.3,
  params: randomize(makeRng(1)),
  controls: [
    slider('gamma', { min: 0, max: 0.9, step: 0.05, label: 'γ (discount)', format: f2 }),
    slider('k', { min: 0, max: 10, step: 1, label: 'sweeps (k)', format: (v) => String(Math.round(v)) }),
  ],
  entities: (p) => {
    const V = valueIterate(p.gamma, p.k);
    const r = residual(p.gamma, p.k);
    const target = p.side === 1 ? ('V(start) > ' + f2(V_HIGH_1) + ' → ' + f2(V_HIGH_2)) : ('V(start) < ' + f2(V_LOW_1) + ' → ' + f2(V_LOW_2));
    return [
      cellGrid(V, { at: GRID_AT, cell: CELL, min: PIT_REWARD, max: GOAL_REWARD }),
      ...wallEntities(),
      ...terminalMarkers(),
      label('γ = ' + f2(p.gamma) + '   k = ' + Math.round(p.k) + '   V(start) = ' + f3(V[START.r][START.c]) + '   target: ' + target + '   Δ = ' + (p.k < 1 ? '—' : f3(r)), { at: 'readout' }),
    ];
  },
  goals: [
    goal('Hit your assigned value target for start',
      (s) => (s.side === 1 ? vAt(s.gamma, s.k) > V_HIGH_1 : vAt(s.gamma, s.k) < V_LOW_1),
      { xp: 40, hold: 700, tag: 'discounting',
        focus: 'Both knobs matter: γ decides whether the terminal reward is worth carrying this far, and k decides whether it has had time to arrive.' }),
    goal('Push further — the same target, doubled distance from zero',
      (s) => (s.side === 1 ? vAt(s.gamma, s.k) > V_HIGH_2 : vAt(s.gamma, s.k) < V_LOW_2),
      { xp: 40, hold: 700, tag: 'value iteration',
        focus: 'A more extreme value needs a more extreme γ (or a still-unconverged k penalizing you) — this is the same two knobs, tuned harder.' }),
    goal('Finally, drive the sweep all the way to the exact fixed point (residual < 1e-6)',
      (s) => residual(s.gamma, s.k) < 1e-6,
      { xp: 40, hold: 700, tag: 'bellman equation',
        focus: 'The Bellman backup is a contraction: repeating it enough times always lands on the same unique fixed point, no matter where you started or which γ you chose.' }),
  ],
  caption: 'No hints now. Push γ and the sweep count k to hit your assigned value target, twice — then drive the sweep all the way to the exact fixed point.',
});
