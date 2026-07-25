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
  <p><strong>Value iteration</strong> just applies that equation as an update rule, over and over, starting from \\(V_0 = 0\\): \\(V_{k+1}(s) = R(s) + \\gamma \\cdot \\max_a V_k(\\text{succ}(s,a))\\). Each sweep is a <em>contraction</em> — however far \\(V_k\\) is from the true fixed point \\(V^*\\), the next sweep is guaranteed to be closer by a factor of \\(\\gamma\\) — so no matter where you start, repeating it enough times converges to one unique \\(V^*\\). The per-action quantity being maxed has its own name, the <strong>action-value</strong> \\(Q(s,a) = R(s) + \\gamma V(\\text{succ}(s,a))\\), so \\(V(s) = \\max_a Q(s,a)\\) — and once you have \\(V^*\\) (equivalently, \\(Q^*\\)), the optimal <strong>policy</strong> costs nothing extra: \\(\\pi(s) = \\arg\\max_a Q^*(s,a)\\) — one comparison per state, no separate training run.</p>`,
  ml: `Value iteration is the ancestor of essentially every modern RL algorithm — <b>Q-learning</b> learns \\(Q(s,a)\\) the same Bellman way but from sampled experience instead of a known model; <b>deep RL</b> swaps the table for a neural network. <b>RLHF</b> (used to align chat models like this one) is a different animal — it optimizes a policy against a learned reward model with policy-gradient/actor-critic methods over UNKNOWN dynamics, not a synchronous sweep over a known MDP like this lesson's; when an actor-critic setup has a critic at all, that critic's value update is the part that stays Bellman-flavored.`,
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
    {
      type: 'order',
      q: 'Put the steps of value iteration into the correct order.',
      steps: [
        'Initialize V(s) = 0 for every state (terminal states are pinned to their own reward)',
        'For every state, compute the backed-up value of each action: R(s) + γ·V(succ(s, a))',
        'Update V(s) to the BEST of those — the max over actions',
        'Repeat the sweep until the residual (the largest change) stops shrinking',
        'Read off the greedy policy: π(s) = argmax over a of the same backed-up values',
      ],
      tag: 'value iteration',
      focus: 'Init at 0 → back up each action → keep the max as the new V → sweep to convergence → extract the argmax policy.',
      why: 'Value iteration is exactly the Bellman backup applied over and over: start from V=0, compute every action\'s one-step lookahead, keep the best (that IS the update), repeat until the contraction has converged, then read the policy straight off the converged V with one final argmax.',
    },
  ],
});

/* ================================================================
   LESSON 2 — rl-qlearning (Q-Learning: Value from Experience).
   ----------------------------------------------------------------
   P2 wave K (CONTRACT Amendment v1.15). Second RL lesson, appended after
   rl-mdp in the `rl` world (no engine changes needed — WORLD_META.rl and
   WORLD_ORDER already carry the 'rl' world from wave H; a second lesson
   in an existing world is pure data, LESSONS only).

   Content harvested from PR #67's rl-qlearning draft: its prose/quiz
   IDEAS (TD error, epsilon-greedy, "Q fills in from the goal outward",
   the off-policy/bootstrapping framing) — never its code (labs-era APIs
   don't exist here); rebuilt from scratch against the current Scene Kit
   schema, same as rl-mdp was. See lib/curriculum/scenes/rl-qlearning.js
   for the seven-scene arc; model math is rl-math.js's ADDITIVE exports
   (CANONICAL_GAMMA, qLearn, qGreedyAction) — rl-mdp's own exports are
   untouched.

   ONE CORRECTION vs the draft: PR #67's quiz claimed a purely-greedy
   (eps=0) agent "gets stuck repeating one action and never discovers the
   goal." Direct simulation against THIS grid's tie-break rule disproves
   that for the general case — the living-cost penalty on a repeated bad
   action eventually flips the tie and the agent finds the goal anyway.
   What IS true (and what ql.exploration / quiz item 3 below actually
   teach) is narrower and still real: greedy alone settles onto ONE fixed
   route and leaves (s,a) pairs off that route — e.g. cell (1,2) in the
   scene grid — at their initial value forever, since only VISITED pairs
   ever update. See flagship-content.md P2 wave K log for the full
   derivation.
   ================================================================ */
registerLesson({
  id: 'rl-qlearning',
  world: 'rl',
  emoji: '🧭',
  title: 'Q-Learning: Value from Experience',
  sub: 'Drop the model. The agent only acts, samples a reward, and bootstraps its own value estimates from the temporal-difference error.',
  learn: `<p>rl-mdp's value iteration swept a <strong>known model</strong>: every sweep queried the reward function and the transition rule for every state at once. Real agents rarely have that. <strong>Q-learning</strong> learns the action-value \\(Q(s,a)\\) from nothing but <em>sampled experience</em> — tuples \\((s,a,r,s')\\) gathered by actually acting — on this lesson's SAME gridworld, the SAME discount \\(\\gamma = 0.9\\) rl-mdp used, so the two lessons' results are directly comparable.</p>
  <p>The engine is the <strong>temporal-difference (TD) error</strong>: after taking action \\(a\\) in \\(s\\), landing in \\(s'\\) with reward \\(r\\), compare the OLD estimate \\(Q(s,a)\\) to a fresh one-step target built from the CURRENT next-state estimate:</p>
  <div class="formula">$$\\delta = \\underbrace{r + \\gamma \\max_{a'} Q(s',a')}_{\\text{TD target}} - Q(s,a)$$</div>
  <p>\\(\\delta\\) is nudged into \\(Q\\) by a fraction \\(\\alpha\\) — the <strong>learning rate</strong>, a step size:</p>
  <div class="formula">$$Q(s,a) \\leftarrow Q(s,a) + \\alpha\\,\\delta$$</div>
  <p><strong>Bootstrapping</strong> names the trick: the target leans on the CURRENT \\(Q(s',\\cdot)\\) estimate rather than waiting for a fully-realized outcome — value seeps backward one VISITED step at a time, never swept over the whole grid at once like rl-mdp's value iteration was.</p>
  <p><strong>Off-policy.</strong> The \\(\\max_{a'}\\) inside the target always reads off the BEST next action, regardless of which action the agent's exploratory behavior actually takes next. That decoupling — learning the value of the greedy policy while behaving some other way entirely — is what "off-policy" means.</p>
  <p><strong>Exploration is not optional.</strong> Only the \\((s,a)\\) pairs the agent actually VISITS ever update; a purely greedy agent can settle onto one fixed route and leave whole corners of the state space at their untrained initial value, permanently. \\(\\varepsilon\\)-greedy fixes this: act greedily most of the time, but take a uniformly random action with probability \\(\\varepsilon\\).</p>
  <p><strong>The honest caveats.</strong> Tabular Q-learning is proven to converge to the true \\(Q^{*}\\), but only under conditions Watkins &amp; Dayan (1992) made precise: every \\((s,a)\\) pair visited infinitely often, and a learning rate that decays toward zero just right. A FIXED \\(\\alpha\\) — this lesson's slider throughout — keeps \\(Q\\) responsive to new experience, but it never fully settles: it jitters near the answer rather than landing on it exactly.</p>`,
  ml: `Q-learning is the direct ancestor of Deep Q-Networks (DQN, 2015), which swapped this lesson's lookup table for a neural network \\(Q_\\theta(s,a)\\) trained to shrink the exact same TD error \\(\\delta\\). The bootstrap-and-nudge pattern — build a target from a reward plus a discounted CURRENT estimate, then regress toward it — recurs across modern RL, including the value/critic estimate inside many actor-critic and RLHF pipelines (only that critic piece is Bellman-flavored; the policy update around it is a different, policy-gradient mechanism). The exploration-exploitation tension you feel tuning \\(\\varepsilon\\) here is one of the field's permanent themes; \\(\\varepsilon\\)-greedy is the simplest member of a much larger family (optimistic initialization, upper-confidence bounds, entropy bonuses) built to manage it.`,
  scenes: [
    'ql.tdupdate', 'ql.stepsize', 'ql.episodes', 'ql.exploration', 'ql.offpolicy', 'ql.compare', 'ql.capstone',
  ],
  quiz: [
    {
      q: 'The temporal-difference error is δ = r + γ·max_a′ Q(s′,a′) − Q(s,a). What does it measure?',
      opts: [
        'The gap between the old estimate and a fresh one-step (bootstrapped) estimate',
        'The exact, fully-realized return of the whole episode',
        'The reward function of the environment, recomputed',
        'The transition probability P(s′|s,a)',
      ], a: 0,
      tag: 'temporal-difference-learning',
      focus: 'δ = (bootstrapped target) minus (current estimate) — the "surprise" that drives every update.',
      why: 'δ compares Q(s,a) (the old belief) against r + γ·max_a′Q(s′,a′) (a fresh estimate built from one real observed reward plus the discounted CURRENT value of the next state). The update moves Q a fraction α toward closing that gap.',
      wrong: {
        1: 'That is the Monte Carlo target — the actual return, available only once an episode ends. TD deliberately uses a bootstrapped one-step estimate instead, so it can update immediately, mid-episode.',
        2: 'r is one term inside δ, not the whole thing — δ is a difference of value ESTIMATES, not the reward function.',
        3: 'No transition probability appears anywhere in δ — that is the point of model-free learning. δ is built entirely from one sampled (s,a,r,s′) tuple.',
      },
    },
    {
      q: 'Q-learning is called "off-policy" because…',
      opts: [
        'It learns the value of the optimal (greedy) policy while the agent behaves with exploration',
        'It ignores rewards entirely',
        'It never updates Q until an episode ends',
        'It requires the transition model P to be known in advance',
      ], a: 0,
      tag: 'q-learning',
      focus: 'The max over next actions in the TD target evaluates optimal play even while the agent explores — behavior and target policies differ.',
      why: 'The max_a′ term in the target always evaluates the BEST next action, but the agent is free to gather data any way it likes (ε-greedy, fully random, whatever). The policy generating the data (behavior) and the policy being learned (target, always greedy) are decoupled — that decoupling is exactly what "off-policy" names.',
      wrong: {
        1: 'Rewards are central — they drive every update through δ. "Off-policy" is about the behavior/target mismatch, not about ignoring reward.',
        2: 'It updates on every single step, immediately — that immediacy (via bootstrapping) is what lets it learn online instead of waiting for episodes to end.',
        3: 'The reverse — Q-learning is model-free and needs no P at all. That freedom from a known model is exactly why it is useful.',
      },
    },
    {
      q: 'Why can a purely greedy (ε=0) Q-learning agent leave some state-action pairs stuck at their untrained initial value, no matter how long it trains?',
      opts: [
        'Because greedy action selection only ever visits states along whichever single route it currently prefers — any (s,a) pair off that route is simply never sampled, so it never updates',
        'Because the reward function makes those states unreachable',
        'Because Q-learning\'s update rule only works when α = 1',
        'Because the discount factor γ caps how many states can ever be visited',
      ], a: 0,
      tag: 'exploration-exploitation',
      focus: 'Only VISITED (s,a) pairs ever update — greedy exploitation can systematically avoid sampling some of them forever, however long training runs.',
      why: 'A Q-learning update only touches the (s,a) pair actually taken. If the greedy policy has settled onto one fixed route, any state-action pair off that route is never sampled, so its Q stays at its untrained initial value — permanently, independent of training time. Only exploration (ε > 0) can ever reach it.',
      wrong: {
        1: 'Reachability is about the grid\'s geometry (walls), not about Q-learning\'s exploration policy — a state can be perfectly reachable and still never get VISITED by a route that never leads there.',
        2: 'α only scales HOW MUCH an update moves Q once a pair is sampled — it has no bearing on whether that pair ever gets sampled in the first place.',
        3: 'γ discounts future value; it never restricts which states an agent can physically walk to.',
      },
    },
    {
      q: 'In ε-greedy action selection, with probability ε the agent…',
      opts: [
        'Takes a uniformly random action, regardless of what the current Q-table says',
        'Always takes the SECOND-best action according to Q',
        'Skips the step entirely and does not update Q',
        'Takes the greedy action, but the reward is doubled',
      ], a: 0,
      tag: 'exploration-exploitation',
      focus: 'ε-greedy = greedy most of the time, uniformly random the rest — the randomness is what samples (s,a) pairs the greedy policy would never choose.',
      why: 'ε-greedy draws a uniformly random action with probability ε (any of the four, including the current worst) and the greedy (argmax) action otherwise. The random draws are what let the agent sample state-action pairs its own current policy would otherwise never try.',
      wrong: {
        1: 'A fixed "always second-best" rule would still be entirely deterministic — it would visit exactly one alternate route, not explore broadly. ε-greedy\'s randomness reaches all four actions, not just one runner-up.',
        2: 'A step is still taken and Q still updates on the usual TD rule — ε only decides HOW the action is chosen, not whether learning happens that step.',
        3: 'Reward doubling has nothing to do with ε — the reward is whatever the environment actually pays for the (possibly random) action taken.',
      },
    },
    {
      q: 'Tabular Q-learning is guaranteed to converge to Q* under which conditions?',
      opts: [
        'Every state-action pair visited infinitely often, plus a learning rate that decays appropriately (Robbins-Monro conditions)',
        'Always, with no conditions needed',
        'Only if γ = 1',
        'Only when a neural-network function approximator is used',
      ], a: 0,
      tag: 'q-learning',
      focus: 'Watkins & Dayan 1992: infinite visitation of every (s,a) plus a properly decaying step size. Both hypotheses are load-bearing.',
      why: 'The Watkins & Dayan (1992) result needs infinite exploration (every (s,a) visited infinitely often) AND a decaying learning rate satisfying the Robbins-Monro conditions. A FIXED α, like this lesson\'s slider, keeps Q close to Q* but perpetually jittering rather than exactly converged.',
      wrong: {
        1: '"Always" drops the real hypotheses — a folk theorem. Convergence needs both sufficient exploration and a properly decaying step size.',
        2: 'γ = 1 removes the discounting that keeps the TD target bounded; the guarantee wants γ < 1, not exactly 1.',
        3: 'The clean guarantee is for the TABULAR case specifically. Swapping in a neural approximator can BREAK stability rather than strengthen the guarantee.',
      },
    },
    {
      q: 'A fixed (non-decaying) learning rate α — like the slider throughout this lesson — causes what?',
      opts: [
        'Q tracks the TD target but keeps jittering rather than settling exactly',
        'Q converges exactly and then stops changing forever',
        'Q is guaranteed to diverge to infinity',
        'Q ignores all new experience after the first update',
      ], a: 0,
      tag: 'temporal-difference-learning',
      focus: 'A constant α violates the Robbins-Monro decay condition, so Q stays usefully close to the answer but never fully damps out.',
      why: 'A constant α keeps injecting the same FRACTION of each new TD error, so Q stays responsive to new experience but never lets its updates shrink toward zero — it hovers near Q* with residual jitter instead of landing exactly on it.',
      wrong: {
        1: 'Exact, permanent convergence needs the step size to shrink over time; a fixed α never lets updates die down, so Q never fully stops moving.',
        2: 'It does not diverge for a reasonable α (α ≤ 1 here) — it stays bounded near the solution, just noisy.',
        3: 'The opposite: a fixed α keeps every new sample fully influential, forever — nothing about new experience gets ignored.',
      },
    },
    {
      type: 'numeric',
      q: 'Currently Q(s,a) = 0.20. You take action a, receive reward r = 0, and land in s′ where max_a′ Q(s′,a′) = 0.50. With α = 0.5 and γ = 0.9, what is the updated Q(s,a)?',
      answer: 0.325, tol: 0.002, unit: '',
      tag: 'temporal-difference-learning',
      focus: 'δ = r + γ·maxQ′ − Q = 0 + 0.9·0.50 − 0.20 = 0.25; new Q = 0.20 + 0.5·0.25.',
      hint: 'First the TD error: δ = 0 + 0.9·0.50 − 0.20 = 0.25. Then Q ← 0.20 + 0.5·0.25.',
      why: 'δ = 0 + 0.9(0.50) − 0.20 = 0.25; update Q ← 0.20 + 0.5(0.25) = 0.325.',
    },
    {
      type: 'order',
      q: 'Put the steps of one Q-learning update into the correct order.',
      steps: [
        'Observe the current state s',
        'Choose an action a by ε-greedy on Q(s,·)',
        'Execute a; observe reward r and next state s′',
        'Form the TD target r + γ·max over a′ of Q(s′,a′)',
        'Compute the TD error δ = target − Q(s,a)',
        'Update Q(s,a) ← Q(s,a) + α·δ, then move to s′',
      ],
      tag: 'q-learning',
      focus: 'Observe → choose (ε-greedy) → act/observe → target → TD error → nudge Q and advance.',
      why: 'Look at s, pick an action with exploration, act and observe (r, s′), build the bootstrapped target, subtract the old estimate to get the surprise (δ), and nudge Q by α times that surprise before moving on.',
    },
  ],
});
