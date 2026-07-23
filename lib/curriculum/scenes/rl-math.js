/* ================================================================
   RL WORLD — shared gridworld MDP math (lib/curriculum/scenes/rl-math.js).
   ----------------------------------------------------------------
   Pure, renderer-free, headless-testable — the AUTHORING_SCENES.md rule
   "lesson math lives with the content" (§2), mirroring vec-math.js's role
   for the LA world. Shared by every rl-mdp scene.

   THE MODEL (a small, fully-deterministic 4x4 gridworld — the classic
   intro-RL MDP, e.g. Sutton & Barto / CS188 style):
     - States: (row, col), row/col in [0, ROWS/COLS). Two are BLOCKED
       (WALLS) — not real states, an action into one bumps back in place.
     - Two TERMINAL states: GOAL (reward +1) and PIT (reward -1). Reaching
       either ends the episode; their value is fixed at their reward
       forever (Bellman backup never revisits a terminal).
     - Every other state pays a small constant STEP_REWARD on every
       timestep it is occupied (the "living cost" — mechanistically this
       is what makes a *shorter* path preferable once a path exists).
     - Actions = {N, E, S, W}, deterministic: move one cell in that
       direction, or BUMP (stay in place, still paying STEP_REWARD) if the
       target is off-grid or a wall.
     - Bellman OPTIMALITY backup (value iteration):
         V_{k+1}(s) = R(s) + gamma * max_a V_k(succ(s, a))   (s non-terminal)
         V_{k+1}(term) = R(term)                              (absorbing)
       Starting from V_0 = 0 (terminals fixed at their reward from the
       start). This operator is a gamma-contraction in sup-norm — it
       converges to a unique fixed point V* regardless of V_0 (Bellman
       optimality theorem); `residual()` exposes the contraction directly
       via ||V_k - V_{k-1}||_inf, which is what scene rl.iteration drives
       toward zero.
     - The GREEDY policy at V is pi(s) = argmax_a V(succ(s,a)) — reading a
       policy off a value function needs no separate learning step, which
       is the whole point of scene rl.policy.
   ================================================================ */

export const ROWS = 4;
export const COLS = 4;
export const GOAL = { r: 0, c: 3 };
export const PIT = { r: 2, c: 1 };
export const WALLS = [{ r: 1, c: 1 }, { r: 2, c: 2 }];
export const START = { r: 3, c: 0 };

export const STEP_REWARD = -0.02;
export const GOAL_REWARD = 1;
export const PIT_REWARD = -1;

export const ACTIONS = [
  { name: 'N', dr: -1, dc: 0 },
  { name: 'E', dr: 0, dc: 1 },
  { name: 'S', dr: 1, dc: 0 },
  { name: 'W', dr: 0, dc: -1 },
];

const inBounds = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
export const isWall = (r, c) => WALLS.some((w) => w.r === r && w.c === c);
export const isGoal = (r, c) => r === GOAL.r && c === GOAL.c;
export const isPit = (r, c) => r === PIT.r && c === PIT.c;
export const isTerminal = (r, c) => isGoal(r, c) || isPit(r, c);

/** The reward R(s) received for occupying (r,c) — the ONLY thing that defines the task. */
export function rewardOf(r, c) {
  if (isGoal(r, c)) return GOAL_REWARD;
  if (isPit(r, c)) return PIT_REWARD;
  return STEP_REWARD;
}

/** succ(s,a): the deterministic next state, or a BUMP (stay put) off-grid/into a wall. */
export function succ(r, c, a) {
  const nr = r + a.dr, nc = c + a.dc;
  if (!inBounds(nr, nc) || isWall(nr, nc)) return { r, c };
  return { r: nr, c: nc };
}

/** Every valid (non-wall) state, row-major. */
export function allStates() {
  const out = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!isWall(r, c)) out.push({ r, c });
  return out;
}

/** Every non-wall, non-terminal state — the ones a learner can meaningfully probe/steer through. */
export function freeStates() {
  return allStates().filter((s) => !isTerminal(s.r, s.c));
}

/**
 * Value iteration: k synchronous Bellman-OPTIMALITY sweeps from V_0 = 0
 * (terminals fixed at their own reward throughout). Pure, deterministic,
 * cheap (16 states) — safe to recompute fresh on every call (no memoization
 * needed; `entities(p,t)` re-derives it from `p.gamma`/`p.k` every render).
 * @returns {number[][]} V, ROWS x COLS (wall cells hold 0, never read)
 */
export function valueIterate(gamma, k) {
  let V = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  V[GOAL.r][GOAL.c] = GOAL_REWARD;
  V[PIT.r][PIT.c] = PIT_REWARD;
  const n = Math.max(0, Math.floor(k));
  for (let step = 0; step < n; step++) {
    const Vn = V.map((row) => row.slice());
    for (const { r, c } of freeStates()) {
      let best = -Infinity;
      for (const a of ACTIONS) { const s = succ(r, c, a); best = Math.max(best, V[s.r][s.c]); }
      Vn[r][c] = STEP_REWARD + gamma * best;
    }
    V = Vn;
  }
  return V;
}

/** Bellman residual ||V_k - V_{k-1}||_inf at (gamma,k) — the contraction shrinking to 0. k<1 -> Infinity (undefined/not yet run). */
export function residual(gamma, k) {
  if (k < 1) return Infinity;
  const Vk = valueIterate(gamma, k), Vk1 = valueIterate(gamma, k - 1);
  let m = 0;
  for (const { r, c } of freeStates()) m = Math.max(m, Math.abs(Vk[r][c] - Vk1[r][c]));
  return m;
}

/** Greedy action at (r,c) under value function V: argmax_a V(succ(s,a)), first-wins tie-break. */
export function greedyAction(V, r, c) {
  let best = ACTIONS[0], bestVal = -Infinity;
  for (const a of ACTIONS) {
    const s = succ(r, c, a);
    if (V[s.r][s.c] > bestVal + 1e-9) { bestVal = V[s.r][s.c]; best = a; }
  }
  return best;
}

/* ---- grid <-> world-space placement (shared by every scene's entities) --- */
export const CELL = 1.4;
export const GRID_AT = { x: -(COLS * CELL) / 2, y: (ROWS * CELL) / 2 };   // top-left corner (cellGrid's `at`)

/** World-space CENTER of cell (r,c) — matches cellGrid's own top-left-corner + row/col stride convention exactly. */
export function cellCenter(r, c) {
  return { x: GRID_AT.x + c * CELL + CELL / 2, y: GRID_AT.y - r * CELL - CELL / 2 };
}

const ALL_CENTERS = allStates().map((s) => ({ ...s, pt: cellCenter(s.r, s.c) }));

/** Snap ANY world point to the nearest valid (non-wall) cell CENTER — the probe's drag constraint. Module-scope closure (diff-friendly, AUTHORING_SCENES.md §3). */
export function gridSnap(pt) {
  let best = ALL_CENTERS[0].pt, bd = Infinity;
  for (const s of ALL_CENTERS) {
    const d = Math.hypot(pt.x - s.pt.x, pt.y - s.pt.y);
    if (d < bd) { bd = d; best = s.pt; }
  }
  return best;
}

/** Inverse of cellCenter — nearest valid cell to a (snapped) world point. */
export function cellOf(pt) {
  let best = ALL_CENTERS[0], bd = Infinity;
  for (const s of ALL_CENTERS) {
    const d = Math.hypot(pt.x - s.pt.x, pt.y - s.pt.y);
    if (d < bd) { bd = d; best = s; }
  }
  return { r: best.r, c: best.c };
}

export const manhattan = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
