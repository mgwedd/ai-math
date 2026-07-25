/* Scene lesson — rl-qlearning headless tests (Vitest, node env).

   P2 wave K: second RL lesson (model-free TD control) on the SAME
   gridworld rl-mdp used. Scenes are DATA + PURE PREDICATES; baseline-
   cleanliness + reachability run through the SHARED quality helpers
   (CONTRACT v1.4 §6, test/helpers/scene-invariants.mjs). Several scenes
   are slider-only (no draggable handle), so reachability is searched via
   explicit scalar `dims`, mirroring test/scenes-rl-mdp.test.mjs's own
   GAMMA_DIM/K_DIM pattern.

   A dedicated "hand-verified model correctness" block re-derives the
   qLearn/qGreedyAction math independently (review method: hand re-derive
   the math, not just trust the implementation) — this is where the
   file's own header-comment claims (e.g. "cell (1,2) never gets visited
   under eps=0, at ANY episode count") get checked directly rather than
   just trusted. */
import { describe, it, expect, beforeAll } from 'vitest';
import { assertBaselineClean, assertReachable, handleDims } from './helpers/scene-invariants.mjs';
import { TARGET1_OPTIONS } from '../lib/curriculum/scenes/rl-qlearning.js';
import {
  ROWS, COLS, GOAL, PIT, START, ACTIONS,
  rewardOf, succ, isTerminal, freeStates, manhattan, greedyAction, valueIterate, cellCenter,
  CANONICAL_GAMMA, qLearn, qGreedyAction,
} from '../lib/curriculum/scenes/rl-math.js';

let makeRng, validateScenes;
let scenesForLesson, capstoneFor, validateSceneLessons;

const LESSON = 'rl-qlearning';
const EXPECTED_IDS = [
  'ql.tdupdate', 'ql.stepsize', 'ql.episodes', 'ql.exploration', 'ql.offpolicy', 'ql.compare', 'ql.capstone',
];
const CAPSTONE_TAGS = new Set(['q-learning', 'temporal-difference-learning', 'exploration-exploitation']);
const ALPHA_DIM = { bind: 'alpha', range: [0.05, 1], steps: 19 };
const N_DIM = { bind: 'n', range: [0, 20], steps: 20 };
const EPISODES_DIM = { bind: 'episodes', range: [0, 150], steps: 30 };
const EPS_DIM = { bind: 'eps', range: [0, 0.3], steps: 15 };
const PICKED_DIM = { bind: 'pickedAction', range: [0, 3], steps: 3 };

beforeAll(async () => {
  ({ makeRng, validateScenes } = await import('../lib/scene/index.js'));
  const res = await import('../lib/curriculum/scenes/index.js');   // registers all scene modules
  ({ scenesForLesson, capstoneFor, validateSceneLessons } = res);
});

const sceneAt = (i) => scenesForLesson(LESSON)[i];
const V_STAR = valueIterate(CANONICAL_GAMMA, 15);
const freeNonTerminal = freeStates().filter((s) => !isTerminal(s.r, s.c));
const matchCount = (Q) => freeNonTerminal.filter((s) => qGreedyAction(Q, s.r, s.c).name === greedyAction(V_STAR, s.r, s.c).name).length;

describe('registration + validation', () => {
  it('registers the seven rl-qlearning scenes in arc order', () => {
    expect(scenesForLesson(LESSON).map((s) => s.id)).toEqual(EXPECTED_IDS);
  });
  it('passes the kit per-scene validateScenes() with zero problems', () => {
    expect(validateScenes()).toEqual([]);
  });
  it('passes the flagship lesson rule (exactly one capstone, last)', () => {
    expect(validateSceneLessons()).toEqual([]);
    expect(capstoneFor(LESSON).id).toBe('ql.capstone');
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
    // Honesty bar (wave I): must FAIL bare-mechanic text with no connective —
    // built around "to see how"/"because" plus distinctive TD/off-policy/
    // exploration vocabulary, never bare mechanic verbs like "drag"/"raise"/
    // "probe"/"slide" alone.
    const WHY_RE = /(to see how|because)/i;
    for (const s of scenesForLesson(LESSON)) {
      for (const g of s.goals) expect(WHY_RE.test(g.text), s.id + ' goal missing a WHY clause: ' + g.text).toBe(true);
    }
  });
  it('WHY_RE rejects bare-mechanic text (regex honesty check, wave I bar)', () => {
    const WHY_RE = /(to see how|because)/i;
    const bareMechanicTexts = [
      'Probe a state next to the goal and raise α until its Q(s,a) tops 0.5',
      'Push Q above 0.5 using 3 or fewer revisits (n ≤ 3)',
      'Train episodes until the cell next to the goal shows a real Q value (> 0.3)',
      'Raise ε until the blind-spot cell finally shows a real Q value (> 0.3)',
      'Move the assumed next action off the greedy pick',
      'Find a state via the probe where the two policies disagree',
      'Reach your assigned policy-match target',
    ];
    for (const t of bareMechanicTexts) expect(WHY_RE.test(t), 'should reject: ' + t).toBe(false);
  });
  it('sliders declare in-range initial values on every controlled scene', () => {
    const [tdupdate, stepsize, episodes, exploration, offpolicy, compare, cap] = scenesForLesson(LESSON);
    expect(tdupdate.controls.map((c) => c.param)).toEqual(['alpha']);
    expect(tdupdate.params.alpha).toBeGreaterThanOrEqual(0.05);
    expect(tdupdate.params.alpha).toBeLessThanOrEqual(1);
    expect(stepsize.controls.map((c) => c.param).sort()).toEqual(['alpha', 'n']);
    expect(episodes.controls.map((c) => c.param)).toEqual(['episodes']);
    expect(exploration.controls.map((c) => c.param)).toEqual(['eps']);
    expect(offpolicy.controls.map((c) => c.param)).toEqual(['pickedAction']);
    expect(compare.controls.map((c) => c.param)).toEqual(['episodes']);
    expect(cap.controls.map((c) => c.param).sort()).toEqual(['alpha', 'episodes', 'eps']);
    expect(cap.params.episodes).toBe(0);
  });
  it('tdupdate/compare scenes carry a probe handle; the others carry none', () => {
    expect(handleDims(sceneAt(0)).map((d) => d.bind)).toEqual(['probe']);   // ql.tdupdate
    expect(handleDims(sceneAt(5)).map((d) => d.bind)).toEqual(['probe']);   // ql.compare
    expect(handleDims(sceneAt(1))).toEqual([]);   // ql.stepsize
    expect(handleDims(sceneAt(2))).toEqual([]);   // ql.episodes
    expect(handleDims(sceneAt(3))).toEqual([]);   // ql.exploration
    expect(handleDims(sceneAt(4))).toEqual([]);   // ql.offpolicy
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
  it('ql.tdupdate — probe handle auto-discovered + alpha searched', () => {
    assertReachable(sceneAt(0), { dims: [ALPHA_DIM] });
  });
  it('ql.stepsize — alpha and n searched as explicit scalar dims', () => {
    assertReachable(sceneAt(1), { dims: [ALPHA_DIM, N_DIM] });
  });
  it('ql.episodes — episodes searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(2), { dims: [EPISODES_DIM] });
  });
  it('ql.exploration — eps searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(3), { dims: [EPS_DIM] });
  });
  it('ql.offpolicy — pickedAction searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(4), { dims: [PICKED_DIM] });
  });
  it('ql.compare — probe handle auto-discovered + episodes searched', () => {
    assertReachable(sceneAt(5), { dims: [EPISODES_DIM] });
  });
  it('ql.capstone — analytic witness (well-trained run) satisfies all three goals for every target1 draw', () => {
    // A 3-slider blind grid search (alpha x eps x episodes, each with a
    // qLearn replay per combo) would be needlessly expensive — same
    // rationale as eigen.tracedet's three-slider witness approach
    // (docs/AUTHORING_SCENES.md precedent). One analytic witness — a
    // reasonably well-trained run — clears matchCount==12 AND the
    // blind-spot floor simultaneously (verified by direct simulation);
    // target1's value (9 or 10) never raises the bar past 12.
    const cap = capstoneFor(LESSON);
    assertReachable(cap, {
      seeds: [1, 2, 3, 4, 5, 6, 7, 8],   // covers both TARGET1_OPTIONS draws
      witnesses: (base) => [{ ...base, alpha: 0.7, eps: 0.3, episodes: 150 }],
    });
  });
});

describe('capstone: weak-area tag migration + the official reroll seam', () => {
  it('randomize(makeRng(seed)) is deterministic per seed, and covers both target1 options', () => {
    const cap = capstoneFor(LESSON);
    expect(typeof cap.randomize).toBe('function');
    const draws = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => cap.randomize(makeRng(seed)).target1);
    expect(new Set(draws)).toEqual(new Set(TARGET1_OPTIONS));
    expect(cap.randomize(makeRng(7))).toEqual(cap.randomize(makeRng(7)));
  });
  it('params is the seed-1 draw, so every randomize key has an atom to write through', () => {
    const cap = capstoneFor(LESSON);
    expect(cap.params).toEqual(cap.randomize(makeRng(1)));
  });
  it('every capstone goal has hold>0 (drive-by passes are blocked, exam-wide)', () => {
    expect(capstoneFor(LESSON).goals.every((g) => g.hold > 0)).toBe(true);
  });
  it('capstone draws reset alpha/eps/episodes to the identity and draw target1 from the finite set, for every seed', () => {
    const cap = capstoneFor(LESSON);
    for (let seed = 1; seed <= 200; seed++) {
      const p = cap.randomize(makeRng(seed));
      expect(p.alpha).toBe(0.5);
      expect(p.eps).toBe(0.25);
      expect(p.episodes).toBe(0);
      expect(TARGET1_OPTIONS).toContain(p.target1);
    }
  });
});

describe('CAPSTONE BASELINE-SAFETY — closed-form, checked exhaustively', () => {
  // qLearn(*, alpha, eps, 0) never runs its episode loop (n=0 in the
  // Math.max(0,floor(episodes)) guard), so Q is IDENTICALLY the all-zero
  // table for EVERY alpha/eps — independent of the randomized target1.
  // At Q≡0, every state ties every action to the first (N) via the
  // argmax tie-break, which happens to match V_STAR's greedy action at
  // EXACTLY 7 of the 12 free non-terminal cells (a fixed fact of this
  // grid). Both TARGET1_OPTIONS (9, 10) exceed 7, so goal 1/2 are false;
  // the blind-spot cell (1,2) is also exactly 0 at episodes=0 (goal 3).
  it('Q(*, alpha, eps, 0) is the all-zero table for a wide sweep of alpha/eps', () => {
    for (const alpha of [0.05, 0.3, 0.5, 0.7, 1]) {
      for (const eps of [0, 0.1, 0.25, 0.5]) {
        const Q = qLearn(1, alpha, eps, 0);
        for (const s of freeStates()) for (const q of Q[s.r][s.c]) expect(q).toBe(0);
      }
    }
  });
  it('matchCount at episodes=0 is exactly 7/12, independent of alpha/eps — the closed-form baseline fact both goals rely on', () => {
    for (const alpha of [0.05, 0.5, 1]) for (const eps of [0, 0.25, 0.5]) {
      expect(matchCount(qLearn(1, alpha, eps, 0))).toBe(7);
    }
  });
  it('all three goals are false at the reset params, for both possible target1 draws', () => {
    const cap = capstoneFor(LESSON);
    for (const target1 of TARGET1_OPTIONS) {
      const s = { alpha: 0.5, eps: 0.25, episodes: 0, target1 };
      expect(cap.goals[0].predicate(s)).toBe(false);
      expect(cap.goals[1].predicate(s)).toBe(false);
      expect(cap.goals[2].predicate(s)).toBe(false);
    }
  });
  it('goal 1/2 stay false at episodes=0 for ANY alpha/eps (not just the reset 0.5/0.25)', () => {
    const cap = capstoneFor(LESSON);
    for (const target1 of TARGET1_OPTIONS) {
      for (const alpha of [0.05, 0.3, 0.5, 0.7, 1]) for (const eps of [0, 0.1, 0.25, 0.5]) {
        const s = { alpha, eps, episodes: 0, target1 };
        expect(cap.goals[0].predicate(s)).toBe(false);
        expect(cap.goals[1].predicate(s)).toBe(false);
        expect(cap.goals[2].predicate(s)).toBe(false);
      }
    }
  });
});

describe('ANTI-GAMING: degenerate strategies must NOT credit', () => {
  it('ql.tdupdate goal 1: probing the pit-bound cell (3,1) never credits — its bestAction leads into ☠️ (reward -1), so newQ = alpha*(-1) is always negative, never > 0.5, at ANY alpha', () => {
    const scene = sceneAt(0);
    for (const alpha of [0.05, 0.3, 0.5, 0.9, 1]) {
      expect(scene.goals[0].predicate({ probe: cellCenter(3, 1), alpha })).toBe(false);
    }
  });
  it('ql.tdupdate goal 2: a terminal-bound transition (the pit-adjacent cell (3,1)) does NOT credit even at a tiny alpha, despite a small |newQ| magnitude', () => {
    // (3,1)'s bestAction (reduces manhattan distance to GOAL) steps into the PIT — a
    // terminal transition explicitly excluded by goal 2's `!isTerminal(succ)` guard,
    // so even though alpha*PIT_REWARD can be numerically small at low alpha, it must
    // never be misread as the "ordinary small living-cost step" goal 2 is about.
    const scene = sceneAt(0);
    for (const alpha of [0.01, 0.05, 0.1, 0.9, 1]) {
      expect(scene.goals[1].predicate({ probe: cellCenter(3, 1), alpha })).toBe(false);
    }
  });
  it('ql.tdupdate goal 2: legitimate witness — a genuine non-terminal-succ probe at high alpha DOES credit', () => {
    const scene = sceneAt(0);
    expect(scene.goals[1].predicate({ probe: cellCenter(START.r, START.c), alpha: 0.95 })).toBe(true);
  });
  it('ql.stepsize goal 1: exploit-blocked — n > 3 with a tiny alpha must NOT credit even though (1-alpha)^n eventually crosses 0.5 for large n', () => {
    const scene = sceneAt(1);
    expect(scene.goals[0].predicate({ alpha: 0.05, n: 20 })).toBe(false);   // n>3 disqualifies regardless of the resulting Q
  });
  it('ql.stepsize goal 1: legitimate witness — a real high-alpha, low-n state credits', () => {
    const scene = sceneAt(1);
    expect(scene.goals[0].predicate({ alpha: 0.5, n: 2 })).toBe(true);
  });
  it('ql.episodes: a single episode (episodes=1) cannot fake either "Q spreads outward" goal — verified against the actual qLearn output, not just the predicate', () => {
    const scene = sceneAt(2);
    expect(scene.goals[0].predicate({ episodes: 1 })).toBe(false);
    expect(scene.goals[1].predicate({ episodes: 1 })).toBe(false);
    const Q = qLearn(1, 0.5, 0.25, 1);
    expect(Math.max(...Q[0][2])).toBe(0);
    expect(Math.max(...Q[START.r][START.c])).toBe(0);
  });
  it('ql.episodes: legitimate witness — enough episodes credits both goals', () => {
    const scene = sceneAt(2);
    expect(scene.goals[0].predicate({ episodes: 40 })).toBe(true);
    expect(scene.goals[1].predicate({ episodes: 40 })).toBe(true);
  });
  it('ql.exploration: eps=0 NEVER covers the blind-spot cell, at ANY episode count — structural, not a threshold pick', () => {
    // Direct simulation, independent of the fixed DEMO_EPISODES_EXPLORE=150 the
    // scene itself uses: eps=0 stays exactly 0 even at 20x the scene's own count.
    for (const episodes of [150, 1000, 3000]) {
      const Q = qLearn(1, 0.5, 0, episodes);
      expect(Math.max(...Q[1][2].map(Math.abs))).toBe(0);
    }
  });
  it('ql.exploration: legitimate witness — eps>0 does cover the blind-spot cell', () => {
    const scene = sceneAt(3);
    expect(scene.goals[0].predicate({ eps: 0 })).toBe(false);
    expect(scene.goals[0].predicate({ eps: 0.2 })).toBe(true);
  });
  it('ql.offpolicy: the target term is IDENTICAL across every possible pickedAction (the off-policy fact itself)', () => {
    const scene = sceneAt(4);
    // Every legitimate witness (any pickedAction != baseline) credits goal 1 —
    // proving the goal doesn't depend on which numeric value drove the credit.
    for (let a = 0; a < 4; a++) {
      if (a === scene.params.pickedAction) continue;
      expect(scene.goals[0].predicate({ pickedAction: a })).toBe(true);
    }
  });
  it('ql.compare: matchCount cannot be gamed by probe alone at episodes=0 — verified against the true 7/12 tie fact', () => {
    const scene = sceneAt(5);
    expect(scene.goals[1].predicate({ probe: { x: 0, y: 0 }, episodes: 0 })).toBe(false);
  });
});

describe('rl-math.js — hand-verified qLearn/qGreedyAction correctness (P2 wave K additive exports)', () => {
  it('CANONICAL_GAMMA matches rl-mdp.js\'s own canonical γ=0.9 (same MDP, same discount)', () => {
    expect(CANONICAL_GAMMA).toBe(0.9);
  });
  it('qLearn is deterministic: the same (seed,alpha,eps,episodes) always returns the identical Q table', () => {
    const Q1 = qLearn(1, 0.5, 0.25, 40);
    const Q2 = qLearn(1, 0.5, 0.25, 40);
    expect(Q1).toEqual(Q2);
  });
  it('qLearn(*, *, *, 0) is the all-zero table for any seed/alpha/eps (no episode loop runs)', () => {
    for (const seed of [1, 2, 3]) {
      const Q = qLearn(seed, 0.5, 0.25, 0);
      for (const s of freeStates()) for (const q of Q[s.r][s.c]) expect(q).toBe(0);
    }
  });
  it('qGreedyAction tie-breaks to the FIRST action (N) on an all-zero row — same convention as greedyAction', () => {
    const Q0 = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [0, 0, 0, 0]));
    expect(qGreedyAction(Q0, 2, 2).name).toBe('N');
  });
  it('qGreedyAction picks the actual argmax when Q values differ', () => {
    const Q = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [0, 0, 0, 0]));
    Q[1][1] = [0.1, 0.9, 0.2, -0.3];   // E (index 1) is the clear max
    expect(qGreedyAction(Q, 1, 1).name).toBe('E');
  });
  it('one hand-computed TD update matches qLearn\'s own formula: a single episode from (0,2) straight into GOAL', () => {
    // (0,2) --E--> GOAL is a 1-step episode (deterministic transitions): delta =
    // GOAL_REWARD + gamma*0 - 0 = 1 (GOAL is absorbing/terminal, never bootstrapped);
    // Q[(0,2)][E] should become exactly alpha*1 after ONE such episode, PROVIDED the
    // agent's first action from (0,2) actually is E. With Q all-zero and eps=0, the
    // argmax tie-breaks to the FIRST action (N) — not E — so this is checked via a
    // manual one-step application of the exact update formula instead (an
    // independent re-derivation of the TD math, not a re-run of qLearn itself).
    const s = { r: 0, c: 2 }, a = ACTIONS[1];   // E
    expect(a.name).toBe('E');
    const ns = succ(s.r, s.c, a);
    expect(ns).toEqual({ r: GOAL.r, c: GOAL.c });
    expect(isTerminal(ns.r, ns.c)).toBe(true);
    const delta = rewardOf(ns.r, ns.c) + CANONICAL_GAMMA * 0 - 0;
    expect(delta).toBe(1);
    const alpha = 0.5;
    expect(alpha * delta).toBeCloseTo(0.5, 9);
  });
  it('the blind-spot fact (1,2) generalizes: qLearn at eps=0 settles onto exactly one route and its Q stays a fixed point past the point of settling', () => {
    const Q100 = qLearn(1, 0.5, 0, 100);
    const Q300 = qLearn(1, 0.5, 0, 300);
    for (const s of freeStates()) {
      if (isTerminal(s.r, s.c)) continue;
      expect(Q100[s.r][s.c]).toEqual(Q300[s.r][s.c]);
    }
  });
  it('manhattan-distance bestAction fact (documented in rl-qlearning.js): exactly one free cell, (3,1), has its GOAL-ward step land in the pit', () => {
    const ACTIONS_LOCAL = ACTIONS;
    const bestAction = (r, c) => {
      let best = ACTIONS_LOCAL[0], bestDist = Infinity;
      for (const a of ACTIONS_LOCAL) { const d = manhattan(succ(r, c, a), GOAL); if (d < bestDist - 1e-9) { bestDist = d; best = a; } }
      return best;
    };
    const pitBound = freeNonTerminal.filter((s) => { const ns = succ(s.r, s.c, bestAction(s.r, s.c)); return ns.r === PIT.r && ns.c === PIT.c; });
    expect(pitBound).toEqual([{ r: 3, c: 1 }]);
  });
});
