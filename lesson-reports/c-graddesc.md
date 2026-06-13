# c-graddesc — Gradient Descent

## Current summary (what it teaches + what the lab does)

**Tutorial (`learn`).** Introduces the core update rule `x ← x − lr·f′(x)`, reads it aloud as "step opposite the slope, scaled by the learning rate," and walks the sign logic (positive slope → step left, negative → step right, stop when flat). Frames the learning rate as the most famous hyperparameter with three regimes (too small → crawls, too large → overshoots/diverges, just right → glides). Closes by previewing the lab's two-valley landscape and the "where you start determines where you land" idea.

**`ml` note.** "This is THE training loop." Replace `x` with billions of weights and `f` with the loss; the update rule is unchanged; SGD/momentum/Adam are "decoration on this one line"; the loss curves researchers watch are pictures of this ball rolling.

**No `deeper` cards** for this lesson (the `deeper` field is absent). Per-wrong-answer feedback lives in the `WRONG_WHY` map at `index.js:1167`.

**Quiz (3 questions).** (1) Compute one step given f′=+4, lr=0.1 (answer: left by 0.4). (2) Loss bouncing ever higher → lr too large. (3) Two runs settling in different valleys → initialization matters; GD finds local, not global, minima.

**Lab (`INTERACTIVES.graddesc`, index.js:823).** Landscape is f(x) = (x²−4)²/8 + x/2, a double well: global min at x≈−2.116 (f≈−1.03), local min at x≈1.861 (f≈0.97), local max (barrier) at x≈0.252. The learner clicks the canvas to drop a ball, then uses **Step ×1** or **Auto-run** to iterate GD, with a learning-rate slider (0.01–1.30). A gold dot marks the global min, a faint dot the decoy. A fading cyan trail shows the path; a gold tangent line is drawn at the ball. Three missions: (a) descend to any valley (|slope|<0.02), (b) reach the global (left) minimum, (c) crank lr ≥ 1.0 and make the ball diverge (|x|>6 ends the run). Verified numerically: dropping anywhere right of the x≈0.25 barrier (e.g. x=3 or x=1.5) with lr=0.1 settles in the *local* min — so the "trapped from the right" framing in the note is correct.

## Strengths

- **The one-line-rule framing is exactly right pedagogically.** Leading with `x ← x − lr·f′(x)` and explicitly reading the sign is the clearest possible on-ramp, and matches how 3Blue1Brown and CS231n introduce it.
- **Double-well landscape is a genuinely good choice.** It makes "GD is local" *visible and reproducible* rather than asserted, and the global-vs-local mission forces the learner to discover basins of attraction by hand.
- **The divergence mission is excellent.** Letting the learner *break* training with a large lr turns the most common real-world failure into muscle memory — far better than a warning paragraph.
- **`ml` note nails the scale jump.** "Replace x with 70 billion weights, the rule is unchanged" is the single most important transfer the lesson needs to make, and it lands.
- **WRONG_WHY entries are sharp** — e.g. distinguishing the divergence cause (step size, not parameter count) and reinforcing determinism vs. "bug."

## Inaccuracies / fidelity issues (each: the issue → the correct statement → source URL)

1. **"GD finds local minima, not guaranteed global ones" is the *right* lesson for the 1-D toy but the *wrong* mental model for deep learning** — and the `ml` note ("the central drama of deep learning") leans into it. The modern, well-established result is that in high-dimensional nets, sub-optimal **local minima are rare**; the dominant critical points the optimizer meets are **saddle points**, which SGD escapes easily thanks to negative-curvature directions plus minibatch noise. The "trapped in a bad local minimum" picture is largely a low-dimensional artifact. → State explicitly: in 1-D, locality bites (you saw it); in millions of dimensions, almost all critical points are saddles, and the practical worry is plateaus/saddles and conditioning, not bad local minima. Sources: https://www.beren.io/2023-07-11-Loss-landscapes-and-understanding-deep-learning/ , Dauphin et al. 2014 (https://arxiv.org/abs/1406.2572).

2. **The divergence story is incomplete: it's the *curvature*, not just "lr too large," that sets the threshold.** The lesson says large lr "overshoots... even diverges" but never names *how large*. For an L-smooth function, GD with constant step is guaranteed to decrease the objective for any lr < 2/L (and lr = 1/L is the canonical safe choice), where L is the largest curvature (Lipschitz constant of the gradient). → The stability boundary is `lr < 2/L`. In the lab this is checkable: curvature at the global min is ≈4.72 → threshold ≈0.42; at the local min ≈3.19 → threshold ≈0.63 (which is *why* the slider hits divergence reliably only well above these). Sources: Boyd & Vandenberghe §9.3 (https://web.stanford.edu/class/ee364a/lectures/unconstrained.pdf), CMU 10-725 Lecture 5 (https://www.stat.cmu.edu/~ryantibs/convexopt-S15/scribes/05-grad-descent-scribed.pdf).

3. **"Step opposite the slope" is correct in 1-D but the lesson never says the multivariate gradient points in the direction of steepest *ascent*** (and −∇f is steepest descent only locally, and only because it's the negated gradient). This matters because the very next boss lesson tests exactly this ("northeast is ascent; go southwest"). The 1-D lesson should plant that the rule generalizes via the gradient vector, not just "the slope." → −∇f is the direction of locally steepest descent; in n-D the update is **x ← x − lr·∇f(x)**. Source: https://web.stanford.edu/class/ee364a/lectures/unconstrained.pdf .

4. **"Everything else (SGD, momentum, Adam) is decoration on this one line" undersells the difference that actually matters in practice.** SGD changes *what gradient you compute* (a noisy minibatch estimate, which is itself why saddles are escaped and why we can afford to train at all); momentum and Adam change the *effective conditioning* and can give a quadratic speedup on ill-conditioned problems. → Reframe as: same descent *idea*, but the noise (SGD) and the preconditioning/averaging (momentum, Adam) are what make it *work at scale* — not mere cosmetics. Sources: https://distill.pub/2017/momentum/ , https://www.beren.io/2023-07-11-Loss-landscapes-and-understanding-deep-learning/ .

## Conceptual gaps (what a serious learner still needs)

- **Convergence rate & the role of the condition number.** A master's-bound learner should know GD on smooth convex problems converges at O(1/k) (O(ρ^k) with strong convexity, ρ tied to κ = L/μ), and that ill-conditioning (long narrow valleys) is *the* reason plain GD zigzags. This is the bridge to momentum/Adam. (Distill momentum; CMU 10-725.)
- **Saddle points and the curse/blessing of dimensionality.** The single biggest upgrade: the high-dimensional reality differs from the 1-D toy. Saddles dominate; they're escaped by noise; local minima are rarely the problem. (Beren; Dauphin et al.)
- **Why SGD specifically — variance, batch size, and the noise-as-regularizer view.** The learner should see that the "stochastic" in SGD is a feature (escapes saddles, biases toward flat/wide minima that generalize), not just a speed hack.
- **Step-size selection beyond a fixed slider.** Line search (exact / backtracking with the Armijo condition), lr schedules/warmup/decay, and the lr ≈ 1/L heuristic. The lesson presents lr as a magic dial; it should at least name that there's principled machinery. (Boyd & Vandenberghe §9.2–9.3.)
- **Flat vs. sharp minima and generalization.** Two minima with equal loss are not equally good; flatter basins occupy exponentially more volume and tend to generalize better. This reframes "which valley" as more than just depth.
- **Gradient is not the loss, and the Hessian is not the gradient.** A pre-emption of the boss-lesson confusion: ∇f is a vector (one slope per parameter), the Hessian is the second-derivative matrix (too big to form for large nets) — which is *why* we use first-order methods.

## Lab ideas (concrete: name the interactive, what the learner manipulates, what it reveals)

1. **`graddesc-2d` — the zigzag / conditioning lab (highest value).** A 2-D contour plot of an elongated quadratic bowl f(x,y) = ½(a·x² + b·y²) with a slider for the **condition number** κ = a/b and the learning rate. The learner watches GD zigzag down the narrow valley, sees that the max stable lr is set by the *steep* axis while progress is throttled by the *flat* axis, then toggles **momentum** (β slider) and watches the oscillations cancel. Reveals: why plain GD is slow, what κ means geometrically, and what momentum actually buys — directly grounding the "decoration" claim. (Mirrors Distill's momentum demo.)

2. **`graddesc-saddle` — escaping a saddle.** A 2-D surface with a saddle at the origin (e.g. f = x² − y²-style, or a monkey saddle). Drop a ball near the saddle; with deterministic GD it stalls (gradient ≈ 0) for a long time; toggle **gradient noise (SGD)** and watch it slip off the ridge. Reveals the single most important high-dimensional correction to the 1-D "trapped in local min" story.

3. **`graddesc-lr-sweep` — the stability boundary.** Keep the existing 1-D double well but add a live readout of the local curvature f″(x) and the implied `2/f″` threshold, plus a "sweep lr" button that runs the same start across lr ∈ {0.05 … 1.3} and plots final loss vs. lr. Reveals the U-shaped "too small / just right / diverges" curve quantitatively, and ties divergence to curvature rather than to a vague "too big."

4. **Upgrade to the existing lab (cheap win).** Add a **second ball with a different lr** (or different start) running simultaneously, so the learner sees the race between a crawling small-lr ball and a fast (or diverging) large-lr ball in one view — converting the three prose regimes into one animated comparison.

## Content improvements (specific learn/ml/deeper text upgrades)

- **Add the stability threshold to `learn`.** After the three lr regimes, add one line: "How large is too large? Roughly when `lr > 2/(curvature)` — steps then leap *past* the valley and land higher each time. That's the divergence you'll trigger in the lab." This turns a qualitative warning into a checkable rule.
- **Correct the high-dimensional framing in `ml`.** Replace/extend "the central drama of deep learning" so it reads: "In 1-D, GD really can get stuck in a worse valley (you'll feel it). But in a million dimensions the story flips: almost every flat spot is a **saddle** — uphill in some directions, downhill in others — and the random noise in SGD slides you right off it. The practical enemy isn't bad local minima; it's saddles, plateaus, and badly conditioned (long, narrow) valleys."
- **Rescue the "decoration" line.** Change to: "SGD, momentum, and Adam don't change this one line — they change *which* gradient you feed it (a noisy minibatch estimate) and *how* you precondition the step. That noise and preconditioning are exactly what make training at scale possible."
- **Plant the gradient generalization** in `learn`: one sentence noting that in many dimensions "slope" becomes the **gradient vector** ∇f, and the rule is the same: `x ← x − lr·∇f(x)`, stepping along −∇f, the direction of steepest descent. (Sets up the boss lesson.)
- **Add `deeper` cards** (currently none): (i) **Convergence & conditioning** — O(1/k) on smooth convex, why long narrow valleys zigzag, κ = L/μ. (ii) **Saddle points** — why high-D critical points are mostly saddles and how SGD escapes. (iii) **Choosing lr** — line search / Armijo, schedules, lr ≈ 1/L. (iv) **Flat vs sharp minima** — equal loss ≠ equal generalization.

## Quiz improvements (specific misconceptions to target; keep questions self-contained)

Keep the three current questions (all solid and self-contained), but tighten Q3's `why` to add the high-dimensional caveat, and add two:

- **Target the saddle misconception (new).** "In a deep network with millions of parameters, the most common kind of point where the gradient is ≈ 0 during training is a…" — options: A local minimum better than the global / A **saddle point (some directions up, some down)** [correct] / The global minimum / A point of infinite curvature. `why`: in high dimensions almost all critical points are saddles, not minima — and noisy SGD steps slide off them. (Self-contained; corrects the 1-D-only intuition the lesson otherwise instills.)

- **Target the stability-threshold misconception (new).** "Halving the learning rate while keeping everything else fixed makes a *converging* run…" — options: Diverge / **Take more steps but still converge** [correct] / Converge in half the steps / Find a different minimum. `why`: smaller steps are slower, not unstable; divergence comes from steps *too large* relative to curvature, not too small. (Pre-empts the common "smaller lr is safer-but-also-faster" muddle.)

- **Optional fix to Q3's `why`:** append "— in 1-D. In very high dimensions, sub-optimal local minima are actually rare; the real obstacles are saddle points and ill-conditioned valleys." (Avoids cementing the over-broad claim.)

All proposed questions reference only the update rule and general behavior, never lab-graph data the learner must have memorized.

## Sources (the real URLs you consulted)

- Boyd & Vandenberghe, *Convex Optimization*, Ch. 9 Unconstrained minimization (gradient descent, exact/backtracking line search, convergence): https://web.stanford.edu/class/ee364a/lectures/unconstrained.pdf
- CMU 10-725 Convex Optimization, Lecture 5 — Gradient Descent (step size, 1/L, 2/L, O(1/k)): https://www.stat.cmu.edu/~ryantibs/convexopt-S15/scribes/05-grad-descent-scribed.pdf
- Distill, "Why Momentum Really Works" (conditioning, zigzag, quadratic speedup): https://distill.pub/2017/momentum/
- Beren Millidge, "Thoughts on loss landscapes and why deep learning works" (saddles dominate, local minima rare, flat-minima volume argument): https://www.beren.io/2023-07-11-Loss-landscapes-and-understanding-deep-learning/
- Dauphin et al., "Identifying and attacking the saddle point problem in high-dimensional non-convex optimization" (NeurIPS 2014): https://arxiv.org/abs/1406.2572
