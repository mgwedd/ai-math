# c-secondorder — Curvature & Newton's Method

## Current summary (what it teaches + what the lab does)

The lesson introduces second-order calculus as the key to faster optimization. The `learn` block covers: (1) the second-order Taylor expansion as a "best-fit parabola" near a point; (2) Newton's update rule `x ← x − f′(x)/f″(x)` as jumping to the bottom of that parabola; (3) quadratic convergence near a minimum; (4) the Hessian as the multidimensional generalisation, with eigenvalue signs classifying critical points (min/max/saddle). The `ml` block mentions Adam, L-BFGS, natural gradient/K-FAC, and ill-conditioning causing GD zig-zags.

**Lab 1 — "taylor"**: Learner drags the expansion point `a` along a mixed function `f(x) = 0.15x² + sin(1.5x)`. The canvas overlays the first-order tangent line (cyan) and the second-order parabola (gold). Missions require finding a highly curved spot (`|f″| > 1.5`), an inflection point (`f″ ≈ 0`), and a region of negative curvature (`f″ < −0.5`).

**Lab 2 — "newton"**: Learner picks a quadratic or quartic function, adjusts the starting point and GD learning rate, and watches cyan dots (GD) race gold dots (Newton) to the minimum. Missions: see Newton land on the quadratic in one step, confirm Newton finishes faster on the quartic, and crank the GD learning rate until it diverges.

---

## Strengths

- Taylor expansion is correctly stated (two-term truncation, ½f″ coefficient).
- The "kissing parabola" intuition in the `deeper` card is accurate and vivid.
- Hessian eigenvalue classification (all+ → min, all− → max, mixed → saddle) is correct.
- The ML note correctly identifies that Newton is too expensive at scale and names three real approximations (Adam, L-BFGS, K-FAC).
- Quiz Q5 (why not Newton) targets the exact right bottleneck (N² entries, N³ inversion).
- Lab 1 inflection-point mission is particularly good — watching the parabola collapse to the tangent line when f″ ≈ 0 is a memorable moment.
- Lab 2 is concrete: one-step Newton on a quadratic is a verifiable, countable fact.

---

## Inaccuracies / fidelity issues

### Issue 1 — Newton's update is presented as unconditionally correct; the requirement that f″ > 0 (positive curvature) is silent

**The issue:** The lesson states `x ← x − f′(x)/f″(x)` and says Newton "jumps to the *bottom* of the local parabola." This is only the bottom when f″(a) > 0. When f″(a) < 0, the fitted parabola opens downward and the "bottom" is actually a *maximum*; the step is an ascent direction. In the non-convex case Newton's method does not guarantee a descent direction.

**The correct statement:** For the Newton step to be a descent direction we need f″(x) > 0 (positive definite Hessian in nD). With f″ < 0, the classical update steps *toward* a maximum or saddle, not away from it. This is why damped Newton with a line search or a modified-Cholesky Hessian regularisation is used in practice — to enforce a positive-definite quadratic model. The lesson's current phrasing implies the update always finds a minimum.

**Source:** https://en.wikipedia.org/wiki/Newton%27s_method_in_optimization — "It can converge to a saddle point instead of to a local minimum. … Cholesky factorization will only work if f″(xₖ) is a positive definite matrix."

---

### Issue 2 — Newton is described as converging to a saddle only in passing (via the Hessian deeper card), but the lab silently avoids this failure mode

**The issue:** The deeper card on the Hessian says mixed-sign eigenvalues → saddle, but neither the learn text nor the lab shows the most important implication: *unmodified Newton is actively attracted to saddle points* in non-convex problems. When an eigenvalue is negative, the Newton step moves *toward* the saddle along that eigenvector (the rescaling by the inverse Hessian flips the sign of the gradient component in that direction). The Ganguli et al. (NIPS 2014) paper established this as the primary obstacle in high-dimensional neural-network optimization, not local minima.

**The correct statement:** For non-convex f, full Newton's method is a saddle-point *attractor*. The standard fix is either to use the absolute value of Hessian eigenvalues (saddle-free Newton), add a regularizer to the Hessian diagonal (Levenberg–Marquardt style), or restrict to trust-region steps. This is not mentioned at all.

**Source:** https://ganguli-gang.stanford.edu/pdf/14.SaddlePoint.NIPS.pdf — "Newton methods get attracted to saddle points and do not converge on local minima." Also Wikipedia (same link as above).

---

### Issue 3 — Adam's connection to curvature is overstated as "estimates its own curvature"

**The issue:** The `ml` block says Adam "rescales each parameter by an estimate of its own curvature." This is misleading in an important way. Adam's second moment `v_t = β₂ v_{t−1} + (1−β₂)g²` is an EMA of *squared gradients*, not an estimate of the second derivative (the true per-parameter curvature). The squared gradient tracks gradient *variance/magnitude*, not curvature. More precisely, the second moment approximates the diagonal of the *empirical Fisher information matrix*, which is related to the natural gradient, not the Hessian curvature in the Newton sense. A large squared gradient can signal either a steep landscape *or* a noisy/high-variance parameter — not necessarily high curvature.

**The correct statement:** Adam preconditions by the square root of the EMA of squared gradients (an approximation to the diagonal empirical Fisher / gradient second moment). This is a *gradient-magnitude-based* adaptive learning rate, not a true curvature estimate in the Hessian sense. L-BFGS, Gauss-Newton, and K-FAC are closer to actual curvature approximations. A technically careful phrasing: "Adam rescales each parameter's step by its recent gradient magnitudes (approximating the diagonal of the Fisher information matrix), giving an effect loosely analogous to curvature-awareness."

**Source:** https://arxiv.org/abs/2405.12807 (FAdam paper) — "Adam is a natural gradient optimizer using diagonal empirical Fisher information" (showing it approximates the Fisher, not the Hessian); also https://arxiv.org/pdf/1412.6980 (original Adam paper distinguishes g² from curvature).

---

### Issue 4 — Quadratic convergence is stated without the critical "near the minimum / local" qualifier

**The issue:** The learn text says Newton "converges quadratically — the error roughly squares each step." This is only guaranteed when (a) the starting point is sufficiently close to a true minimum (the "local" regime) and (b) the Hessian is positive definite and Lipschitz continuous there. Far from the minimum, Newton can diverge, cycle, or converge to a maximum. The lesson presents quadratic convergence as a property of Newton in general, not as a local property conditional on proximity to a convex region.

**The correct statement:** Newton converges quadratically *in a neighbourhood* of a strongly convex minimum with a Lipschitz Hessian, satisfying `‖xₖ₊₁ − x*‖ ≤ ½‖xₖ − x*‖²`. Outside that neighbourhood (the "damped" regime), convergence is only linear (with line search). Without line search it can fail to converge.

**Source:** https://en.wikipedia.org/wiki/Newton%27s_method_in_optimization (convergence analysis section); also https://blogs.sas.com/content/iml/2025/04/14/newtons-minimization-method.html.

---

### Issue 5 — The quartic lab function's Newton trajectory may behave unexpectedly near the local maximum at x=0 (where f″=−2 < 0), but the lab does not call attention to this

**The issue:** The quartic `f(x) = 0.25x⁴ − x²` has a local *maximum* at x = 0 with f″(0) = −2. If the learner starts very close to x = 0, the Newton step (with negative denominator) flips direction and steps toward the maximum, not a minimum — the exact issue 1/2 above. The lab silently clips out-of-bounds trajectories (`|x| > 8`) but does not surface this as a teachable moment.

**The correct statement:** This is actually a golden missed-teaching-opportunity rather than a bug: showing the learner that starting near x = 0 on the quartic causes Newton to fly toward the maximum (or diverge) demonstrates the negative-curvature failure mode concretely.

---

## Conceptual gaps (what a serious learner still needs)

1. **Newton's method requires f″ > 0 — the descent guarantee.** Nowhere does the lesson say the step is a descent direction only under positive curvature. This is the most important caveat for any practitioner. A one-sentence addition in the `learn` block (after the formula) would suffice: "This only finds the *bottom* when f″(x) > 0; with negative curvature the step goes toward a maximum instead."

2. **The saddle-point attractor problem.** For non-convex f (which is all of deep learning), vanilla Newton is actively attracted to saddle points because the inverse Hessian *flips the gradient component* along negative-curvature directions. The Ganguli et al. result (2014) showed saddle points, not local minima, are the dominant obstacle in high-dimensional non-convex optimization. This makes "why we don't use Newton" more nuanced than just cost.

3. **Damped Newton / trust-region intuition.** Real second-order methods (including the Hessian-free methods mentioned in the deeper card) add either a line-search step size or a trust-region radius to handle the two failure modes above. This is the bridge between "pure Newton" and the practical methods the learner will encounter.

4. **The condition number connects both worlds.** The `ml` block mentions ill-conditioning causes GD zig-zags, but doesn't state that the convergence rate of GD on a quadratic is `((κ−1)/(κ+1))^k` where κ = λ_max/λ_min is the Hessian condition number. Newton is immune to conditioning (its convergence rate near the minimum does not depend on κ), which is the precise reason it is faster on ill-conditioned problems. This is the quantitative punchline of the lesson.

5. **The "one-step on quadratic" is exact, not approximate.** The lesson is correct but could add a one-liner explanation of *why* it's exact: for a quadratic, the second-order Taylor expansion *is* the function (all higher derivatives are zero), so the fitted parabola equals f exactly, making Newton's single step land on the true vertex.

6. **Taylor radius of validity.** The lesson says the parabola "hugs the curve far longer" than the tangent line, but doesn't say *when* the approximation breaks down (when |x − a| is large relative to the next-order term). This is why Newton can take catastrophically large steps when far from the minimum — the parabola stops being a good model.

7. **Natural gradient vs Newton.** The lesson mentions K-FAC in the `ml` block. A sentence explaining the Fisher information matrix as "curvature of the loss in probability-distribution space (KL divergence)" vs the Hessian as "curvature in parameter space" would give the learner a handle on why these are different things. This is a gap an ML-master's candidate will quickly encounter in the literature.

---

## Lab ideas

### Lab idea A — "Newton Fails: Negative Curvature" (new)
**What the learner manipulates:** Start position on a function with a mix of positive and negative curvature (e.g., the quartic from lab 2, or a sinusoidal). A toggle switches between: (1) raw Newton (uses the signed f″), and (2) modified Newton (uses |f″| — saddle-free). A readout shows `f″(x)` at each step and whether the step was "descent" or "ascent."
**What it reveals:** When f″ < 0, raw Newton moves toward the maximum. Modified Newton correctly escapes downhill. This makes the biggest gap in the lesson viscerally concrete and teachable, rather than hiding it.

### Lab idea B — "Condition Number Race" (new or replace/extend lab 2)
**What the learner manipulates:** A slider controls the condition number κ of a 2D quadratic bowl (ratio of eigenvalues). The canvas shows the level-set ellipses getting more elongated as κ grows. Two trajectories run side by side: GD (zig-zagging across the narrow valley) and Newton (going straight to the minimum in constant steps).
**What it reveals:** Quantifies the qualitative claim in the ML note. Learner can see that doubling κ roughly doubles GD's steps while Newton is unaffected. Makes "curvature-aware" tangible.

### Lab idea C — "Taylor Validity Window" (extend lab 1)
**What to add:** Add a shaded region around the expansion point that shows where the second-order approximation is within ε (e.g., 10%) of the true function. A second slider controls ε. As the learner moves a to a more-curved region, the validity window shrinks.
**What it reveals:** The parabola breaks down faster when curvature is high. This motivates *why* Newton needs to be "near" the minimum — a direct, visual answer.

### Lab idea D — "One Step vs Many: Visualise the Parabola" (enhance lab 2)
**What to add:** When Newton takes a step, briefly overlay the fitted parabola (gold curve) before the dot moves to its minimum. The learner watches Newton "fit, then jump" at each iteration rather than seeing only the trajectory dots.
**What it reveals:** Connects the taylor lab (parabola) to the newton lab (optimization step) — closing the conceptual loop between the two labs in one visual gesture.

---

## Content improvements

### `learn` block — add descent-direction caveat immediately after the formula

After "x ← x − f′(x)/f″(x)", add:

> **One catch:** this only finds the *bottom* of the parabola when f″(x) > 0. If the curvature is negative (the parabola opens downward), the same step vaults to the *top* — an ascent toward a maximum. In practice, Newton is always paired with a safeguard (a line search or Hessian regularisation) to prevent this.

### `learn` block — strengthen the saddle-point problem

Add to the Hessian paragraph:

> In non-convex landscapes like neural networks, vanilla Newton's method is not just expensive — it is actively attracted to saddle points. When the Hessian has a negative eigenvalue at a saddle, the inverse-Hessian step *flips the gradient direction* along that axis, pushing the iterate toward the saddle rather than away. This is the deeper reason real second-order methods (L-BFGS, K-FAC, Gauss-Newton) use modifications that enforce a positive-definite quadratic model.

### `learn` block — tighten the convergence rate claim

Change "converges quadratically — the error roughly squares each step" to:

> "Converges *quadratically near a minimum* — once close, the error roughly squares each step. Far from a minimum, convergence is not guaranteed without a step-size safeguard."

### `ml` block — fix Adam description

Change "Adam rescales each parameter by an estimate of its own curvature" to:

> Adam rescales each parameter's step by its recent *gradient magnitudes* (specifically, an exponential moving average of g², approximating the diagonal of the Fisher information matrix). This gives an effect loosely analogous to curvature-awareness, adapting step sizes to how active each parameter has been — but it is tracking gradient variance, not Hessian curvature directly.

### `ml` block — add condition-number punchline

Add:

> The convergence rate of gradient descent on a quadratic is ((κ−1)/(κ+1))^k, where κ = λ_max/λ_min is the Hessian condition number. Newton is *immune* to this: its local quadratic convergence rate near the minimum is independent of conditioning. That is the precise reason ill-conditioned problems (such as layers with very different gradient scales) benefit most from second-order methods.

### `deeper` cards — add a "Newton's dangerous side" card

> **🚀 Go deeper: Newton is a saddle attractor**  
> Unmodified Newton's method doesn't just fail to converge to saddle points — in non-convex problems it actively *seeks* them. When a Hessian eigenvalue is negative, multiplying by H⁻¹ flips the gradient's sign along that direction, turning what would be an escape step into an approach. The landmark Dauphin et al. (NIPS 2014) paper showed that in high dimensions virtually all critical points are saddles, not local minima — so this is the primary obstacle, not getting stuck in a "bad" local minimum. The fix: replace H with |H| (saddle-free Newton) or add λI to ensure positive definiteness (Levenberg–Marquardt regularisation).

---

## Quiz improvements

### Current quiz is largely correct. Suggested additions/modifications:

**Replace or add: the descent-direction caveat (currently absent)**

> Q: Newton's update x ← x − f′(x)/f″(x) is guaranteed to move *downhill* only when…
> A: f″(x) > 0 (positive curvature)
> Distractors: "f′(x) > 0" / "f″(x) < 0 (negative curvature)" / "f(x) is small"
> WRONG_WHY for negative curvature: "Negative f″ means the parabola opens downward — Newton steps toward its *top*, not its bottom. This is the saddle-point attractor problem."

**Improve Q2 (quadratic one-step) to explain *why* it's one step:**

> Current: "On a perfect quadratic it reaches the minimum in… One step."
> Add to `why`: "For a quadratic, all derivatives of order 3 and higher are zero, so the second-order Taylor expansion IS the function — the fitted parabola equals f exactly, and its minimum is the true minimum."

**Add: condition number and GD convergence (missing)**

> Q: When the Hessian's largest eigenvalue is 100× its smallest (condition number κ = 100), gradient descent convergence compared to a well-conditioned problem is…
> A: Much slower — the landscape is a narrow ravine and GD zig-zags across it
> Distractors: "Faster — larger eigenvalues mean larger gradient signals" / "Unchanged — condition number only affects Newton" / "Slower only for non-convex functions"
> Focus: "Condition number = width-to-depth ratio of the loss bowl. High κ = narrow ravine = GD zig-zag. Newton is immune."

**Check Q3 (Jacobian vs Hessian) — correct but could mention the connection between Newton's method and applying root-finding to f′.** Current phrasing is fine; no change required.

**Check Q4 (saddle = mixed-sign eigenvalues) — correct.**

**Self-containedness:** All five current questions are self-contained (no lab-graph data required). The new questions above are also self-contained.

---

## Sources

1. Wikipedia — Newton's method in optimization: https://en.wikipedia.org/wiki/Newton%27s_method_in_optimization
   — Convergence conditions, saddle-point attractor, damped Newton, one-step quadratic fact.

2. Ganguli et al., "Identifying and attacking the saddle point problem in high-dimensional non-convex optimization" (NIPS 2014): https://ganguli-gang.stanford.edu/pdf/14.SaddlePoint.NIPS.pdf
   — Newton as saddle attractor; saddle points dominate over local minima in high dimensions.

3. FAdam paper (2024) — "Adam is a natural gradient optimizer using diagonal empirical Fisher information": https://arxiv.org/abs/2405.12807
   — Adam approximates diagonal Fisher (squared gradients), not Hessian curvature.

4. Original Adam paper (Kingma & Ba, 2015): https://arxiv.org/pdf/1412.6980
   — Second moment = EMA of g², distinct from second derivative.

5. SAS blog — Newton's minimization method (2025): https://blogs.sas.com/content/iml/2025/04/14/newtons-minimization-method.html
   — Connection between root-finding (applied to f′) and minimization; failure when f″ ≈ 0 or small.

6. Globally Convergent Newton Methods for Ill-conditioned problems: https://www.di.ens.fr/ulysse.marteau/assets/newton/main.pdf
   — Convergence domain shrinks under ill-conditioning; damping and line-search required.

7. Medium — "Why Gradient Descent Struggles: The Hidden Role of Condition Numbers": https://medium.com/@ashitiz8697/why-gradient-descent-struggles-the-hidden-role-of-condition-numbers-4796eb949ec2
   — Convergence rate formula ((κ−1)/(κ+1))^k; geometric zig-zag intuition.

8. A survey of deep learning optimizers — first and second order methods (2022): https://arxiv.org/pdf/2211.15596
   — L-BFGS memory scaling, stochastic vs batch Newton, quasi-Newton in DL.

9. David Stutz notes on Goodfellow Ch. 8 (saddle points, ill-conditioning): https://davidstutz.de/deep-learning-chapter-8-goodfellow-bengio-courville/
   — "In high-dimensional spaces, saddle points become much more frequent than local minima."

10. Arxiv — Pascanu et al. "On the saddle point problem for non-convex optimization": https://arxiv.org/pdf/1405.4604
    — Newton step flips gradient sign along negative-curvature eigenvectors, making saddles attractors.
