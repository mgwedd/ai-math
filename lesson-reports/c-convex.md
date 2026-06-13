# c-convex — Convexity: One Bowl, No Traps

## Current summary (what it teaches + what the lab does)

The lesson introduces convexity through the chord test (the line segment between any two points on the graph lies on or above the curve), states the second-derivative equivalence (f″ ≥ 0), and explains the payoff: any local minimum is the global minimum, so gradient descent from any start is guaranteed to converge. It lists three preservation rules (sums, max of convex), names the convex classical models (linear/ridge regression, logistic regression, SVMs), and contrasts these with non-convex deep-net losses.

**Lab 1 (convchord)** — Learner drags two points along one of four functions (bowl x²/3, double-well, |x|, concave hill) to place a chord. Color indicates whether the chord dips below the curve. Three missions: catch non-convexity on the double-well, spread the bowl chord wide, catch the concave hill.

**Lab 2 (convtraps)** — Learner slides a starting position and picks between a convex bowl and a tilted double-well. A deterministic GD trajectory (lr=0.12, 240 steps) runs from that start and the resting point is displayed. Three missions: get trapped in the shallow local min, reach the deep global min, confirm the bowl always converges.

---

## Strengths

- The chord-test framing is exactly the standard definition (Boyd & Vandenberghe §3.1) translated into tactile interaction — best possible first intuition.
- The convchord lab includes `|x|` (the absolute value / ReLU family), which is a non-smooth but convex function — a correct and ML-relevant example that most introductions skip.
- Lab 2 demonstrates the operational consequence (start-dependence) directly, which is more memorable than prose.
- The deeper cards correctly distinguish strict convexity (f″ > 0 → unique minimizer) from strong convexity (f″ ≥ m > 0 → quantitative convergence rate) and gesture at the Hessian generalization.
- Preservation under nonneg weighted sums (critical for ridge = loss + λ‖w‖²) and max are called out correctly.
- The quiz WRONG_WHY explanations are accurate and target real confusions (f″ ≤ 0 is concave, f′ ≥ 0 is monotone not convex).

---

## Inaccuracies / fidelity issues

### 1. "Gradient descent — from ANY start — is guaranteed to find the global optimum" — unqualified

**Issue:** The learn text states this without caveats. A convex function does not even have to attain a minimum (e.g., f(x) = eˣ over ℝ is convex but has no minimizer). Even when a minimizer exists, gradient descent is only guaranteed to converge with appropriate learning-rate choice (not any fixed learning rate) and under a Lipschitz-gradient assumption. The claim is also about GD on finite-dimensional parameter vectors; stochastic variants require additional conditions.

**Correct statement:** On a convex function *that attains its minimum* (coercive, or constrained domain), gradient descent with a step size satisfying the Armijo/Wolfe conditions, or with step size ≤ 1/L (where L is the gradient Lipschitz constant), converges to the global minimum. The existence of a minimum and the correct step size are both necessary prerequisites, not consequences of convexity alone. The d2l.ai treatment explicitly notes: "the function f(x) = exp(x) does not attain a minimum value on ℝ."

**Source:** https://d2l.ai/chapter_optimization/convexity.html (§12.2: "Local minima of convex functions are also global minima" but also "not all convex functions attain their minimum")

---

### 2. "The sum of convex functions is convex" — the stated preservation rules are incomplete and the lesson misses the most important one for composition

**Issue:** The lesson lists only two operations: sum and max. It does not mention the composition rule, which is the most mechanically important one for building ML losses. Students immediately encounter log(sigmoid(w·x)) (logistic loss) and need to know *why* it is convex: h is convex and nonincreasing (−log is convex & nonincreasing), composed with g = sigmoid(w·x) which is concave — that matches the rule "h nonincreasing, g concave → h∘g convex." Without this rule learners can't verify convexity of any real model loss themselves.

**Correct statement:** Convexity is preserved under: (a) nonneg weighted sum, (b) pointwise max over any index set, (c) composition h(g(x)) when h is convex & nondecreasing and g is convex, OR when h is convex & nonincreasing and g is concave. Also: affine substitution f(Ax+b). Partial minimization over a convex set also preserves convexity (less critical here).

**Source:** Boyd & Vandenberghe EE364A lecture notes §3 (https://web.stanford.edu/class/ee364a/lectures/functions.pdf); bolundai0216.github.io summary (https://bolundai0216.github.io/2021/01/14/opts_preserve_convex.html)

---

### 3. The formal definition is stated in shorthand only; the Jensen inequality form is absent

**Issue:** The lesson gives the chord test as intuition and f″ ≥ 0 as the analytic test, but never states the inequality definition: f(λx + (1−λ)y) ≤ λf(x) + (1−λ)f(y) for λ ∈ [0,1]. This is the form used in every proof. It is also the finite form of **Jensen's inequality**, E[f(X)] ≥ f(E[X]), which recurs constantly in ML (variational inference, information theory, EM algorithm). A master's-bound learner will see Jensen cited weekly and needs to recognize it as "convexity applied to expectations."

**Correct statement:** The formal definition is the inequality above; Jensen's inequality is the expectation generalization and is foundational for deriving ELBO in VAEs, proving KL ≥ 0, and bounding log-likelihoods in EM.

**Source:** d2l.ai §12.2 (https://d2l.ai/chapter_optimization/convexity.html); Boyd & Vandenberghe

---

### 4. Deep-net landscape description overstates "many valleys"

**Issue:** The learn text says deep nets have "ridges, saddles, many valleys." This reproduces an outdated early-2010s intuition. The Dauphin et al. (2014) result — confirmed by subsequent high-dimensional analysis — shows that in very high dimensions, critical points with high error are *exponentially likely* to be saddle points rather than local minima. Poor local minima (non-global, high-loss) are far rarer than saddle points. The dominant challenge at scale is **saddle points and flat regions**, not a proliferation of deep distinct valleys.

**Correct statement:** In high-dimensional parameter spaces, the loss landscape is dominated by saddle points (mixed-sign Hessian eigenvalues), not by many distinct bad local minima. Poor local minima do exist (and the Goodfellow/Bengio/Courville DL book notes empirically that local minima found in practice are close in loss to global), but the main obstruction is saddle points and pathologically flat regions, which is why momentum (escaping saddles) and learning-rate warmup (crossing flat zones) matter. The deeper card already mentions saddle points, but the learn text contradicts it.

**Source:** Dauphin et al. 2014 "Identifying and attacking the saddle point problem in high-dimensional non-convex optimization" (discussed at https://data-intelligence.hashnode.dev/high-dimensionality-saddle-points-deep-learning); Kawaguchi 2016 "Deep Learning without Poor Local Minima" (https://arxiv.org/abs/1605.07110)

---

### 5. Logistic regression / softmax claim is accurate but the proof path is missing

**Issue:** The ml note says logistic regression and softmax cross-entropy are "convex in their weights" — this is correct — but the lesson gives no hint of *why*, leaving a credibility gap for a serious learner who has just been told to verify things. The proof is a straightforward application of the second-derivative test (Hessian of NLL = Xᵀ diag(p(1−p)) X which is PSD) or the composition rule (log-sum-exp is convex).

**Correct statement:** Binary cross-entropy loss −[y log σ(w·x) + (1−y) log(1−σ(w·x))] is convex in w; its Hessian is σ(w·x)(1−σ(w·x))xxᵀ, which is PSD. Softmax cross-entropy Hessian is p_k(δ_kj−p_j) (PSD by Cauchy-Schwarz). A one-sentence pointer to the second-derivative proof would satisfy the learner.

**Source:** Rohan Paul ML interview series (https://www.rohan-paul.com/p/ml-interview-q-series-what-makes); CMU 10-725 scribe notes

---

## Conceptual gaps (what a serious learner still needs)

1. **Jensen's inequality as a named, usable tool.** Every graduate-level ML paper cites Jensen. The lesson should at minimum name it and give one use: "this is why the ELBO in a VAE is a lower bound on the log-likelihood" or "why log E[X] ≥ E[log X] for positive X."

2. **Convex functions need not attain their minimum.** The lesson's "GD always wins" narrative glosses over that a convex function without a minimizer (f(x) = eˣ) has no fixed point for GD. The safe version of the guarantee requires *coercivity* (f(x) → ∞ as ‖x‖ → ∞) or a compact domain. Worth one sentence.

3. **Quasi-convexity and sublevel sets.** The lesson says sublevel sets of convex functions are convex (implicit). The important nuance is the converse is false: quasi-convex functions (convex sublevel sets) are NOT necessarily convex. Students confuse these, especially when reading papers about quasi-convex objectives in ML.

4. **The composition rule for building losses.** As noted under inaccuracies, this is the practically essential rule: log(softmax), cross-entropy, hinge — all require composition reasoning to verify convexity.

5. **First-order condition for convexity.** The lesson gives the chord (0th order) and f″ ≥ 0 (2nd order) conditions but skips the *first-order* condition: f is convex iff f(y) ≥ f(x) + ∇f(x)ᵀ(y−x) for all x, y. This tangent-plane lower bound is used constantly (it's exactly what makes GD's convergence proof work) and is visually beautiful — the tangent line at any point lies entirely below the convex curve.

6. **Convergence rate hierarchy.** The deeper card mentions strong convexity but doesn't give the rate numbers: vanilla convex GD → O(1/k) sublinear; strongly convex GD → O(cᵏ) linear (exponentially faster). The gap between these rates explains why L2 regularization (making loss strongly convex) dramatically speeds up solvers in classical ML.

7. **Distinguishing "many local minima" from "saddle-point-dominated landscape."** The current framing repeats the historically common but partially inaccurate narrative; the correct picture (saddles dominate) should be in the main text, not just a passing remark in a deeper card.

---

## Lab ideas

### Lab A: First-order condition visualizer ("Tangent-plane lower bound")
**What the learner manipulates:** Expansion point on a convex function; the tangent line is drawn. Learner can switch to a concave or non-convex function.
**What it reveals:** For a convex function the tangent line *always* lies below the curve — the function globally dominates its own linear approximation. For a concave function it's the opposite. This is visually striking and is the exact property that makes GD converge: each step moves to a point that is *provably* lower than predicted by the local linear model.
**Mission ideas:** Find the point where the tangent line is closest to the curve at a distant point (minimum curvature / near-linear region); verify the tangent always stays below by dragging across the whole domain.

### Lab B: Jensen's inequality visualizer ("Average vs. average")
**What the learner manipulates:** A probability distribution over x (two-point distribution: slide mass between x₁ and x₂); a convex function (switchable).
**What it reveals:** f(E[X]) vs E[f(X)] — the learner drags the probability and watches the two quantities. The gap is Jensen's gap: always ≥ 0 for convex f. A switch to a concave function flips the inequality.
**Mission ideas:** Make Jensen's gap > 2; find a case where the gap is zero (when the distribution is a point mass); switch to log (concave) and verify the inequality reverses.

### Lab C: Convergence rate comparison ("Strong vs weak convexity")
**What the learner manipulates:** A slider for regularization strength λ (making MSE loss strongly convex); runs GD and plots loss-vs-iteration on a log scale.
**What it reveals:** Without regularization (pure convex), convergence is sublinear — the loss curve bends slowly on the log scale. Adding λ > 0 (strong convexity) produces a straight line on the log scale (linear convergence / exponential decay). The learner directly sees why regularization speeds training, not just "prevents overfitting."

### Enhancement to existing lab 2 (convtraps):
Show a **loss-vs-iteration curve** alongside the spatial trajectory. Currently the learner only sees the final resting point; the trajectory dots don't convey *speed* differences. Adding a small inset plot of f(xₜ) vs t would let the learner see that the convex bowl GD curve is monotone and smooth, while the non-convex run has a flat plateau (near-saddle region) before the final drop.

---

## Content improvements

### learn text

1. Add the formal inequality definition in a `<div class="formula">` block before or after the chord-test paragraph:
   > f(λx + (1−λ)y) ≤ λf(x) + (1−λ)f(y) &nbsp;&nbsp; for all λ ∈ [0,1]
   Label it "the algebraic chord test" to connect it to the visual version.

2. Add the first-order condition:
   > f is convex ⟺ f(y) ≥ f(x) + f′(x)(y − x) for all x, y
   One sentence: "Every tangent line lies entirely below a convex function — GD's convergence guarantee is built on exactly this."

3. Replace "many valleys" in the non-convex paragraph with a more accurate framing:
   > Real neural-network losses are wildly **non-convex** — dominated by **saddle points** (directions of positive and negative curvature simultaneously) rather than a forest of distinct local minima. In high dimensions, poor local minima are rarer than expected; the challenge is saddle regions and flat plateaus, which is why **momentum** and **learning-rate warmup** matter.

4. Add one sentence on Jensen: "The chord test, extended to any weighted average of points, becomes **Jensen's inequality**: E[f(X)] ≥ f(E[X]) — a workhorse of probabilistic ML (variational inference, information theory, EM)."

5. Add a note that convex functions do not necessarily attain a minimum (e.g., f(x)=eˣ over ℝ), and the GD guarantee requires the loss to be *coercive* (goes to ∞ as ‖w‖ → ∞) — satisfied in practice by L2 regularization.

### ml note

Add the composition rule as the mechanism: "The reason logistic cross-entropy is convex is a composed-function rule: −log is convex and nonincreasing; the sigmoid σ(w·x) is concave in w (for fixed x); composing a convex nonincreasing function with a concave function preserves convexity. The Hessian Xᵀ diag(p(1−p))X is positive semidefinite — provable from first principles."

Also add: "Knowing the convergence-rate hierarchy matters for system design: a plain convex loss gives sublinear O(1/k) convergence; adding L2 regularization (making the loss **strongly convex**) jumps to linear O(cᵏ) convergence — which is why classical ML solvers run much faster than an unregularized fit."

### deeper cards

- In the "strict, strong & convergence speed" card: add the actual rate numbers — "strongly convex GD reaches ε-accuracy in O(log 1/ε) iterations vs O(1/ε) for plain convex — an exponential gap."
- Add a fourth deeper card on the first-order condition / tangent-lower-bound: "The secret inside GD's convergence proof" — the picture of a tangent line always below the curve, so every gradient step provably reduces the function by at least (step-size × gradient-norm²).
- Add a fifth deeper card on Jensen's inequality with the variational inference / EM connection.

---

## Quiz improvements

The existing five questions are solid. Targeted additions/improvements:

**Q6 (new) — first-order condition:**
> Q: For a convex function, where does the tangent line at any point lie relative to the function?
> Options: [Always on or below the function / Always on or above the function / Sometimes above, sometimes below / Exactly equal to the function everywhere]
> A: 1 (always on or below — the function dominates its tangent)
> Focus: The tangent-plane lower bound is a core property used in convergence proofs.
> Why: Convexity ⟺ f(y) ≥ f(x) + f′(x)(y−x). The tangent underestimates the function at every point.

**Q7 (new) — Jensen's inequality:**
> Q: Jensen's inequality states that, for a convex function f and a random variable X…
> Options: [E[f(X)] ≥ f(E[X]) / E[f(X)] ≤ f(E[X]) / E[f(X)] = f(E[X]) / f is always linear in X]
> A: 0
> Focus: Jensen is the chord test extended to expectations — foundational in probabilistic ML.
> Why: For convex f the expectation of the function output is at least the function of the expected input — a direct consequence of the definition applied to weighted combinations.

**Q existing — Q3 refinement:**
Current: "GD from any start is guaranteed to find the global optimum." This is stated as absolute truth in the answer. Tighten the `why` to note: "…provided the loss attains its minimum (e.g., is coercive) and the learning rate is well chosen." The current `why` is not wrong but is incomplete.

**Q existing — Q4 note:**
The question asks which loss is "NOT generally convex." A potential distractor confusion: the question treats "logistic-regression cross-entropy" as a single option, but students sometimes confuse logistic regression (convex in weights) with a neural net with sigmoid outputs (non-convex in weights). Consider adding: "…logistic-regression (one layer, no hidden layers) cross-entropy" to make the scope explicit.

**Self-containment check:** All questions are self-contained — none require recalling lab graph values. This is correct and should be maintained.

---

## Sources (the real URLs consulted)

- https://d2l.ai/chapter_optimization/convexity.html — D2L "Dive into Deep Learning" §12.2 Convexity (Zhang, Lipton, Li, Smola et al.) — formal definition, Jensen, existence of minimizer caveat
- https://web.stanford.edu/class/ee364a/lectures/functions.pdf — Boyd & Vandenberghe EE364A lecture slides §3: Convex Functions — composition rules, operations preserving convexity
- https://bolundai0216.github.io/2021/01/14/opts_preserve_convex.html — Summary of Boyd & Vandenberghe operations preserving convexity (nonneg sum, pointwise max, composition, affine, partial min)
- https://arxiv.org/abs/1605.07110 — Kawaguchi (2016) "Deep Learning without Poor Local Minima" — deep linear nets: every local min is global, critical points are saddles or global minima
- https://data-intelligence.hashnode.dev/high-dimensionality-saddle-points-deep-learning — Dauphin et al. 2014 "Identifying and attacking the saddle point problem" — saddles dominate high-dim non-convex landscapes
- https://www.rohan-paul.com/p/ml-interview-q-series-what-makes — convexity of binary cross-entropy loss; Hessian = Xᵀ diag(p(1−p))X is PSD
- https://www.stat.cmu.edu/~ryantibs/convexopt-F13/scribes/lec6.pdf — CMU 10-725 Convex Optimization (Tibshirani) — convergence rates O(1/k) convex vs O(cᵏ) strongly convex
- https://healy.econ.ohio-state.edu/kcb/Ec181/Lecture07.pdf — Quasi-convex functions vs convex functions; sublevel-set confusion
- https://www.quora.com/Can-a-convex-function-have-no-minimum-value — Confirms f(x)=eˣ is convex with no minimizer; local min = global min but minimum need not exist
