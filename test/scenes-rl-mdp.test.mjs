/* Scene lesson — rl-mdp headless tests (Vitest, node env).

   P2 wave H: founds the `rl` world. Scenes are DATA + PURE PREDICATES; no
   GPU needed. Baseline-cleanliness + reachability run through the SHARED
   quality helpers (CONTRACT v1.4 §6, test/helpers/scene-invariants.mjs).
   Three scenes (anatomy, bellman, policy) use a probe POINT handle
   (auto-discovered by the helper); three (discount, iteration, capstone)
   are slider-only (gamma/k), so reachability is searched via explicit
   scalar `dims`, mirroring test/scenes-la-boss.test.mjs's W_DIMS pattern.

   The capstone's baseline-safety proof (see rl-mdp.js's own header
   comment) is checked exhaustively here across BOTH possible `side` draws
   (the capstone's only randomized dimension — grid layout is fixed). A
   separate block hand-verifies the rl-math.js model itself (value
   iteration against known closed-form facts, the greedy policy never
   stepping into the pit anywhere on the grid, gridSnap/cellOf roundtrip)
   since "hand re-derive all the math" is the review method for this file. */
import { describe, it, expect, beforeAll } from 'vitest';
import { assertBaselineClean, assertReachable, handleDims } from './helpers/scene-invariants.mjs';
import { CAP_SIDES } from '../lib/curriculum/scenes/rl-mdp.js';
import {
  ROWS, COLS, GOAL, PIT, WALLS, START, STEP_REWARD,
  rewardOf, isWall, isTerminal, freeStates,
  valueIterate, residual, greedyAction, succ,
  cellCenter, gridSnap, cellOf, manhattan,
} from '../lib/curriculum/scenes/rl-math.js';

let makeRng, validateScenes;
let scenesForLesson, capstoneFor, validateSceneLessons;

const LESSON = 'rl-mdp';
const EXPECTED_IDS = [
  'rl.anatomy', 'rl.bellman', 'rl.discount', 'rl.iteration', 'rl.policy', 'rl.capstone',
];
const CAPSTONE_TAGS = new Set(['discounting', 'value iteration', 'bellman equation']);
const GAMMA_DIM = { bind: 'gamma', range: [0, 0.9], steps: 18 };
const K_DIM = { bind: 'k', range: [0, 10], steps: 10 };

beforeAll(async () => {
  ({ makeRng, validateScenes } = await import('../lib/scene/index.js'));
  const res = await import('../lib/curriculum/scenes/index.js');   // registers all scene modules
  ({ scenesForLesson, capstoneFor, validateSceneLessons } = res);
});

const sceneAt = (i) => scenesForLesson(LESSON)[i];

describe('registration + validation', () => {
  it('registers the six rl-mdp scenes in arc order', () => {
    expect(scenesForLesson(LESSON).map((s) => s.id)).toEqual(EXPECTED_IDS);
  });
  it('passes the kit per-scene validateScenes() with zero problems', () => {
    expect(validateScenes()).toEqual([]);
  });
  it('passes the flagship lesson rule (exactly one capstone, last)', () => {
    expect(validateSceneLessons()).toEqual([]);
    expect(capstoneFor(LESSON).id).toBe('rl.capstone');
  });
  it('every scene is plane2, caption ≤ 3 sentences, 2–5 goals with text/predicate/xp', () => {
    for (const s of scenesForLesson(LESSON)) {
      expect(s.space).toBe('plane2');
      expect(typeof s.caption).toBe('string');
      expect((s.caption.match(/[.!?](\s|$)/g) || []).length).toBeLessThanOrEqual(3);
      expect(s.goals.length).toBeGreaterThanOrEqual(2);
      expect(s.goals.length).toBeLessThanOrEqual(5);
      for (const g of s.goals) {
        expect(g.text.length).toBeGreaterThan(0);
        expect(typeof g.predicate).toBe('function');
        expect(typeof g.xp).toBe('number');
      }
    }
  });
  it('every goal on every scene carries a non-empty tag + focus stating the payoff', () => {
    for (const s of scenesForLesson(LESSON)) {
      s.goals.forEach((g, i) => {
        expect(g.tag, s.id + ' #' + i + ' tag').toBeTruthy();
        expect(typeof g.focus === 'string' && g.focus.length > 0, s.id + ' #' + i + ' focus').toBe(true);
      });
    }
  });
  it('the capstone carries exactly the three migrated tags', () => {
    const tags = capstoneFor(LESSON).goals.map((g) => g.tag);
    expect(new Set(tags)).toEqual(CAPSTONE_TAGS);
  });
  it('R-CONTENT invariant (g): every goal text states a conceptual payoff, not just the mechanical action', () => {
    // Cheap, honest proxy (mirrors test/scenes-c-limits.test.mjs): every
    // goal text must carry a WHY connective or a domain term, not stop at
    // the bare mechanical instruction. Every goal here was authored with a
    // "... to see how <concept>" clause. Captions are NOT required to
    // repeat it (goal-level only, same as the c-limits precedent).
    const WHY_RE = /(to see how|to see|proving|confirming|the same|exactly (how|the)|why|bellman|contraction|fixed point|discount|horizon|argmax|propagat)/i;
    for (const s of scenesForLesson(LESSON)) {
      for (const g of s.goals) expect(WHY_RE.test(g.text), s.id + ' goal missing a WHY clause: ' + g.text).toBe(true);
    }
  });
  it('rl.discount and rl.iteration/rl.capstone declare their sliders with in-range initial values', () => {
    const discount = sceneAt(2), iteration = sceneAt(3), cap = capstoneFor(LESSON);
    expect(discount.controls.map((c) => c.param)).toEqual(['gamma']);
    expect(iteration.controls.map((c) => c.param)).toEqual(['k']);
    expect(cap.controls.map((c) => c.param).sort()).toEqual(['gamma', 'k']);
    expect(discount.params.gamma).toBeGreaterThanOrEqual(0);
    expect(discount.params.gamma).toBeLessThanOrEqual(0.9);
    expect(iteration.params.k).toBeGreaterThanOrEqual(0);
    expect(iteration.params.k).toBeLessThanOrEqual(10);
  });
  it('anatomy/bellman/policy scenes carry a probe handle; discount/iteration/capstone carry none', () => {
    expect(handleDims(sceneAt(0)).map((d) => d.bind)).toEqual(['probe']);
    expect(handleDims(sceneAt(1)).map((d) => d.bind)).toEqual(['probe']);
    expect(handleDims(sceneAt(4)).map((d) => d.bind)).toEqual(['probe']);
    expect(handleDims(sceneAt(2))).toEqual([]);
    expect(handleDims(sceneAt(3))).toEqual([]);
    expect(handleDims(capstoneFor(LESSON))).toEqual([]);
  });
});

describe('baseline-cleanliness (shared helper, capstone ×1000 seeds)', () => {
  for (const id of EXPECTED_IDS) {
    it(id + ' — no goal satisfied at initial params', () => {
      assertBaselineClean(scenesForLesson(LESSON).find((s) => s.id === id));
    });
  }
});

describe('reachability (shared helper)', () => {
  it('rl.anatomy — probe handle auto-discovered', () => {
    assertReachable(sceneAt(0));
  });
  it('rl.bellman — probe handle auto-discovered', () => {
    assertReachable(sceneAt(1));
  });
  it('rl.discount — gamma searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(2), { dims: [GAMMA_DIM] });
  });
  it('rl.iteration — k searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(3), { dims: [K_DIM] });
  });
  it('rl.policy — probe handle auto-discovered', () => {
    assertReachable(sceneAt(4));
  });
  it('rl.capstone — gamma+k searched, every target reachable for BOTH side draws', () => {
    // Don't rely on seed luck: seeds 1 and 2 both happen to draw side:-1
    // (side:1 first appears at seed 7), so a plain `seeds:2` never actually
    // reachability-tests the side:1 goals (review-confirmed defect). Find
    // one seed per side dynamically instead of hardcoding a magic seed.
    const cap = capstoneFor(LESSON);
    const seedForSide = (want) => {
      for (let seed = 1; seed <= 50; seed++) if (cap.randomize(makeRng(seed)).side === want) return seed;
      throw new Error('no seed found drawing side ' + want + ' within 50 tries');
    };
    const seeds = CAP_SIDES.map(seedForSide);
    expect(new Set(seeds.map((seed) => cap.randomize(makeRng(seed)).side))).toEqual(new Set(CAP_SIDES));
    assertReachable(cap, { dims: [GAMMA_DIM, K_DIM], seeds });
  });
});

describe('capstone: weak-area tag migration + the official reroll seam', () => {
  it('randomize(makeRng(seed)) is deterministic per seed, and covers both sides', () => {
    const cap = capstoneFor(LESSON);
    expect(typeof cap.randomize).toBe('function');
    const sides = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => cap.randomize(makeRng(seed)).side);
    expect(new Set(sides)).toEqual(new Set(CAP_SIDES));
    expect(cap.randomize(makeRng(7))).toEqual(cap.randomize(makeRng(7)));
  });
  it('params is the seed-1 draw, so every randomize key has an atom to write through', () => {
    const cap = capstoneFor(LESSON);
    expect(cap.params).toEqual(cap.randomize(makeRng(1)));
  });
  it('every capstone goal has hold>0 (drive-by passes are blocked, exam-wide)', () => {
    expect(capstoneFor(LESSON).goals.every((g) => g.hold > 0)).toBe(true);
  });
  it('capstone draws reset gamma/k to the identity and draw side from the finite set, for every seed', () => {
    const cap = capstoneFor(LESSON);
    for (let seed = 1; seed <= 200; seed++) {
      const p = cap.randomize(makeRng(seed));
      expect(p.gamma).toBe(0.7);
      expect(p.k).toBe(0);
      expect(CAP_SIDES).toContain(p.side);
    }
  });
});

describe('CAPSTONE BASELINE-SAFETY — exhaustive enumeration of the finite parameter space', () => {
  // Mirrors rl-mdp.js's header-comment proof: valueIterate(*, 0) performs
  // ZERO sweeps, so V(start) = 0 for every gamma (the sweep loop never
  // runs) and residual(*, 0) = +Infinity by definition (k<1 guard) —
  // every capstone goal is false at k=0 regardless of gamma or side. The
  // only randomized dimension is `side` (2 possible values); enumerate both.
  it('all three goals are false at the reset params, for both possible side draws', () => {
    const cap = capstoneFor(LESSON);
    for (const side of CAP_SIDES) {
      const s = { gamma: 0.7, k: 0, side };
      expect(cap.goals[0].predicate(s)).toBe(false);
      expect(cap.goals[1].predicate(s)).toBe(false);
      expect(cap.goals[2].predicate(s)).toBe(false);
    }
  });
  it('goal 1/2 stay false at k=0 for ANY gamma (not just the reset 0.7) — the closed-form argument does not depend on gamma', () => {
    const cap = capstoneFor(LESSON);
    for (const side of CAP_SIDES) {
      for (let gamma = 0; gamma <= 0.9 + 1e-9; gamma += 0.1) {
        const s = { gamma, k: 0, side };
        expect(cap.goals[0].predicate(s)).toBe(false);
        expect(cap.goals[1].predicate(s)).toBe(false);
      }
    }
  });
});

describe('ANTI-GAMING: degenerate strategies must NOT credit', () => {
  it('rl.bellman goal 1: parking the probe ON the terminal itself must NOT credit (V[GOAL]=1 is fixed at init, never swept)', () => {
    const bellman = sceneAt(1);
    const onGoal = { probe: cellCenter(GOAL.r, GOAL.c) };
    const onPit = { probe: cellCenter(PIT.r, PIT.c) };
    expect(bellman.goals[0].predicate(onGoal)).toBe(false);
    expect(bellman.goals[0].predicate(onPit)).toBe(false);
    // legitimate witness: a real goal-adjacent, non-terminal neighbor still credits
    const adjacent = { probe: cellCenter(GOAL.r, GOAL.c - 1) };   // (0,2), non-terminal
    expect(bellman.goals[0].predicate(adjacent)).toBe(true);
  });
});

describe('rl-math.js — hand-verified model correctness', () => {
  it('the grid has exactly 16 cells, 2 walls, 2 terminals, 12 free non-terminal states', () => {
    expect(ROWS * COLS).toBe(16);
    expect(WALLS.length).toBe(2);
    expect(isTerminal(GOAL.r, GOAL.c)).toBe(true);
    expect(isTerminal(PIT.r, PIT.c)).toBe(true);
    expect(freeStates().length).toBe(16 - WALLS.length - 2);
  });
  it('start, goal and pit are mutually distinct, non-wall cells', () => {
    expect(isWall(START.r, START.c)).toBe(false);
    expect(isWall(GOAL.r, GOAL.c)).toBe(false);
    expect(isWall(PIT.r, PIT.c)).toBe(false);
    expect(START).not.toEqual(GOAL);
    expect(START).not.toEqual(PIT);
    expect(GOAL).not.toEqual(PIT);
  });
  it('rewardOf: terminals pay their own reward, every other cell pays the fixed living cost', () => {
    expect(rewardOf(GOAL.r, GOAL.c)).toBe(1);
    expect(rewardOf(PIT.r, PIT.c)).toBe(-1);
    for (const s of freeStates()) if (!isTerminal(s.r, s.c)) expect(rewardOf(s.r, s.c)).toBe(STEP_REWARD);
  });
  it('valueIterate(gamma, 0) is exactly the zero grid except the two fixed terminals, for ANY gamma', () => {
    for (const gamma of [0, 0.3, 0.7, 0.9]) {
      const V = valueIterate(gamma, 0);
      expect(V[GOAL.r][GOAL.c]).toBe(1);
      expect(V[PIT.r][PIT.c]).toBe(-1);
      for (const s of freeStates()) if (!isTerminal(s.r, s.c)) expect(V[s.r][s.c]).toBe(0);
    }
  });
  it('residual(gamma, k) is +Infinity for k<1, and strictly decreasing-to-zero for k=1..7 at gamma=0.9', () => {
    expect(residual(0.9, 0)).toBe(Infinity);
    let prev = Infinity;
    for (let k = 1; k <= 6; k++) { const r = residual(0.9, k); expect(r).toBeLessThan(prev); prev = r; }
    expect(residual(0.9, 7)).toBeLessThan(1e-9);
  });
  it('value iteration converges to the SAME fixed point regardless of how many extra sweeps you run past convergence', () => {
    for (const gamma of [0.3, 0.6, 0.9]) {
      const v15 = valueIterate(gamma, 15), v30 = valueIterate(gamma, 30);
      for (const s of freeStates()) expect(v15[s.r][s.c]).toBeCloseTo(v30[s.r][s.c], 9);
    }
  });
  it('ANTI-GAMING / correctness: the converged greedy policy NEVER steps into the pit, from any free non-terminal state', () => {
    const V = valueIterate(0.9, 15);
    for (const s of freeStates()) {
      if (isTerminal(s.r, s.c)) continue;
      const a = greedyAction(V, s.r, s.c);
      const next = succ(s.r, s.c, a);
      expect(next.r === PIT.r && next.c === PIT.c, 'state (' + s.r + ',' + s.c + ') greedily steps into the pit').toBe(false);
    }
  });
  it('the converged greedy policy from START reaches the goal within a bounded number of steps (no cycles)', () => {
    const V = valueIterate(0.9, 15);
    let cur = { r: START.r, c: START.c };
    const seen = new Set();
    let steps = 0;
    while (!isTerminal(cur.r, cur.c) && steps < ROWS * COLS) {
      const key = cur.r + ',' + cur.c;
      expect(seen.has(key), 'greedy policy cycled back to ' + key).toBe(false);
      seen.add(key);
      cur = succ(cur.r, cur.c, greedyAction(V, cur.r, cur.c));
      steps++;
    }
    expect(isTerminal(cur.r, cur.c)).toBe(true);
    expect(cur).toEqual(GOAL);   // this layout's optimal policy never prefers the pit
  });
  it('gridSnap + cellOf roundtrip: every cell center snaps to itself and cellOf recovers its own (r,c)', () => {
    for (const s of freeStates()) {
      const c = cellCenter(s.r, s.c);
      const snapped = gridSnap({ x: c.x + 0.1, y: c.y - 0.1 });
      expect(snapped.x).toBeCloseTo(c.x, 9);
      expect(snapped.y).toBeCloseTo(c.y, 9);
      expect(cellOf(c)).toEqual({ r: s.r, c: s.c });
    }
  });
  it('manhattan distance is symmetric and zero only for identical cells', () => {
    expect(manhattan(START, GOAL)).toBe(manhattan(GOAL, START));
    expect(manhattan(START, START)).toBe(0);
    expect(manhattan(START, GOAL)).toBeGreaterThan(0);
  });
});
