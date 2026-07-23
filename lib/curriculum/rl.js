/* ================================================================
   WORLD 5: REINFORCEMENT LEARNING — founding lesson (rl-mdp).
   ----------------------------------------------------------------
   P2 wave H (CONTRACT Amendment v1.12). Founds the new `world:'rl'`
   track with its first lesson, scenes-first from the start (no
   old-format `labs`/`interactive` — see lib/curriculum/scenes/rl-mdp.js
   for the six-scene arc ending in a randomized capstone).

   Content harvested from PR #67's rl-mdp draft: its prose/quiz IDEAS and
   its lab DESIGN (4x4 gridworld, goal/pit/wall, gamma discount, value
   iteration, greedy policy extraction) — never its code, which targets a
   dead repo iteration (World 4 / la-markov / order fields don't exist
   here). Q-learning and policy-gradient lessons are LATER waves.
   ================================================================ */
import { registerLesson } from './registry.js';

registerLesson({
  id: 'rl-mdp',
  world: 'rl',
  emoji: '🤖',
  title: 'Markov Decision Processes: The Gridworld',
  sub: 'Rewards, discounting, and the Bellman backup that turns a reward function into an optimal policy.',
  learn: `<p>A <strong>Markov decision process</strong> (MDP) is how you specify a task for an agent that acts over time: a set of <strong>states</strong>, a set of <strong>actions</strong>, and — the only thing that actually defines "good" — a <strong>reward function</strong> \\(R(s)\\). Nothing else tells the agent what to do. In this lesson's gridworld, most cells pay a small constant <em>living cost</em> every turn, and two are <strong>terminal</strong>: reach the goal and collect \\(+1\\), fall in the pit and take \\(-1\\).</p>
  <p>The <strong>value</strong> of a state, \\(V(s)\\), is the total discounted reward an optimal agent expects from there onward. It obeys the <strong>Bellman optimality equation</strong>:</p>
  <div class="formula">$$V(s) = R(s) + \\gamma \\cdot \\max_a V(\\text{succ}(s, a))$$</div>
  <p>— today's reward, plus the best of tomorrow's value, shrunk by the <strong>discount factor</strong> \\(\\gamma \\in [0, 1)\\). A high \\(\\gamma\\) makes the agent farsighted, willing to trek toward a distant reward; a low \\(\\gamma\\) makes it myopic, barely able to see past the next step.</p>
  <p><strong>Value iteration</strong> just applies that equation as an update rule, over and over, starting from \\(V_0 = 0\\): \\(V_{k+1}(s) = R(s) + \\gamma \\cdot \\max_a V_k(\\text{succ}(s,a))\\). Each sweep is a <em>contraction</em> — however far \\(V_k\\) is from the true fixed point \\(V^*\\), the next sweep is guaranteed to be closer by a factor of \\(\\gamma\\) — so no matter where you start, repeating it enough times converges to one unique \\(V^*\\). And once you have \\(V^*\\), the optimal <strong>policy</strong> costs nothing extra: \\(\\pi(s) = \\arg\\max_a V^*(\\text{succ}(s,a))\\) — one comparison per state, no separate training run.</p>`,
  ml: `Value iteration is the ancestor of essentially every modern RL algorithm — <b>Q-learning</b> learns \\(Q(s,a)\\) the same Bellman way but from sampled experience instead of a known model; <b>deep RL</b> swaps the table for a neural network; <b>RLHF</b> (used to align chat models like this one) fits a learned reward model, then optimizes a policy against it — same backup logic, a very different reward signal. Discounting also shows up outside RL: it's why a training loss curve gets "impatient" with hyperparameters tuned for short horizons.`,
  scenes: [
    'rl.anatomy', 'rl.bellman', 'rl.discount', 'rl.iteration', 'rl.policy', 'rl.capstone',
  ],
  quiz: [
    {
      q: 'For a NON-terminal state s, the Bellman optimality backup is V(s) = …',
      opts: [
        'R(s) + γ · max_a V(succ(s, a))',
        'max_a R(s, a) only — value never looks ahead',
        'γ · R(s), discounting the immediate reward itself',
        'V(s) − R(s), subtracting out the reward already earned',
      ], a: 0,
      tag: 'bellman equation',
      focus: 'The backup is immediate reward PLUS the discounted best next-state value — both terms matter, every sweep.',
      why: 'V(s) = R(s) + γ·max_a V(succ(s,a)): today\'s reward, plus the best of tomorrow\'s (already-discounted) value. Both pieces are required — drop either one and it stops being the Bellman equation.',
      wrong: {
        1: 'This ignores the future entirely — it\'s the k=0 case (or γ=0), not the general backup. Value iteration only converges to the RIGHT answer because it keeps the discounted max-over-next-state term.',
        2: 'Discounting applies to the FUTURE term, never to the reward you\'re collecting right now — R(s) is paid at full value the instant you\'re in state s.',
        3: 'That would make V(s) shrink every time you add reward, which is backwards: value should go UP the closer you are to a big future payoff, not down.',
      },
    },
    {
      q: 'Turning the discount factor γ down toward 0 makes the agent…',
      opts: [
        'More farsighted — it starts chasing distant reward harder',
        'Effectively myopic — only the immediate reward matters',
        'Guaranteed to converge to the optimal policy faster',
        'Unable to ever reach a terminal state',
      ], a: 1,
      tag: 'discounting',
      focus: 'γ is a knob on the agent\'s EFFECTIVE HORIZON — low γ crushes the weight of anything more than a step or two away.',
      why: 'As γ → 0, γ^k → 0 fast for any k ≥ 1, so every future term in the backup gets discounted into irrelevance — V(s) collapses toward just R(s). The agent behaves as if only the next step exists.',
      wrong: {
        0: 'Backwards: a HIGH γ is what makes an agent farsighted (future reward barely shrinks). A low γ does the opposite — it flattens the far future to near-zero weight.',
        2: 'Value iteration always converges for γ < 1 regardless of its exact value (it\'s a γ-contraction either way) — a smaller γ actually converges in FEWER sweeps, but it converges to a more myopic, not more "correct", policy.',
        3: 'Discounting only changes how much future value is WORTH — it never changes which states are reachable. The agent can still walk straight into either terminal at any γ.',
      },
    },
    {
      q: 'Repeating the Bellman backup across every state (value iteration), starting from V₀ = 0, is guaranteed to…',
      opts: [
        'Converge to one unique fixed-point value function V*',
        'Produce a different final answer depending on V₀',
        'Only work correctly if the gridworld has zero walls',
        'Skip straight to the optimal POLICY, without ever computing V',
      ], a: 0,
      tag: 'value iteration',
      focus: 'The Bellman backup is a γ-contraction: it\'s mathematically guaranteed to converge to the SAME V*, no matter the starting guess.',
      why: 'The contraction-mapping theorem guarantees a γ-contraction (γ < 1) has exactly one fixed point, and repeated application from ANY starting value converges to it. V₀ = 0 is just a convenient, common choice — not a requirement.',
      wrong: {
        1: 'A contraction always converges to the SAME fixed point regardless of the starting guess — a different V₀ only changes how many sweeps it takes, never the final V*.',
        2: 'Walls just change succ(s,a) (a blocked move bumps back in place) — the contraction argument doesn\'t care about the transition structure, only that γ < 1.',
        3: 'Value iteration computes V — the policy is a SEPARATE step (one argmax per state) applied AFTER V has converged, not a byproduct skipped along the way.',
      },
    },
    {
      q: 'Once you have the converged value function V*, how do you get the optimal ACTION at a state s?',
      opts: [
        'π(s) = argmax over a of V*(succ(s, a)) — one comparison, no extra training',
        'Train a brand-new policy network from scratch on top of V*',
        'Average the rewards of all four neighboring cells',
        'Re-run the reward function R(s) and read the action off its sign',
      ], a: 0,
      tag: 'value iteration',
      focus: 'A policy costs nothing extra once V* is known — it IS the argmax, read directly off values you already computed.',
      why: 'π(s) = argmax_a V*(succ(s,a)): check each action\'s resulting state\'s value and take the best one. No further learning or training is required — the optimal policy is a deterministic function of V*.',
      wrong: {
        1: 'That describes policy-gradient methods (a later wave) — value iteration\'s whole appeal is that once V* exists, the policy is FREE: a single argmax, no separate training loop.',
        2: 'Averaging ignores exactly the information that matters — which neighbor is BEST. The optimal action is the argmax, not a blend of all four options.',
        3: 'R(s) is the reward for being in the CURRENT state — it says nothing about which neighboring state is most valuable. The action comparison needs V*(succ(s,a)), not R(s) alone.',
      },
    },
  ],
});
