# c-integrals — Integrals: Area Under the Curve

## Current summary (what it teaches + what the lab does)

The lesson introduces the definite integral as a limit of Riemann sums (left and right endpoint variants), states the Fundamental Theorem of Calculus (FTC) as `∫ₐᵇ f′(x) dx = f(b) − f(a)`, and connects integrals to probability density, AUC metrics, and diffusion models. The ML blurb mentions those three ML uses.

The lab (`INTERACTIVES.integrals`) visualizes `f(x) = x²/4 + ½` over [0, 4] with exact value 7.333 (correctly computed as `x³/12 + x/2` evaluated at 4). A slider adjusts n (2–60 rectangles); chips toggle left-edge vs right-edge sampling. The readout shows the running Riemann sum, exact value, and percentage error live. Three missions: reach n ≥ 24, get error < 2%, and try both modes to observe which overestimates.

There are no `deeper` expansion cards in this lesson object (the schema supports them but none are defined here).

---

## Strengths

1. **Correct integral computation.** The exact value `64/12 + 2 = 7.333…` is computed correctly; the code comment and arithmetic are both right.
2. **Live error percentage** shown in the readout ties the abstract "limit" concept to a concrete converging number — good learning design.
3. **Left vs right mode toggle with a mission** forces the learner to notice asymmetric over/underestimation on a monotone-increasing curve.
4. **Quiz Q3 WRONG_WHY is excellent:** correctly states that density values can exceed 1 on narrow intervals — a notoriously common misconception.
5. **FTC formula is stated correctly** for Part 2 (the evaluation theorem): `∫ₐᵇ f′(x) dx = f(b) − f(a)`.

---

## Inaccuracies / fidelity issues

### 1. Over/underestimation rule is function-specific, not just "left undershoots, right overshoots"

**The issue:** The lab note says "Left-edge rectangles undershoot a rising curve; right-edge overshoot. Both converge to the same truth as n grows." This is true for the specific function used (`f(x) = x²/4 + ½`, which is monotone increasing on [0,4]). But the lesson teaches this as if it is a universal law, and neither the learn text nor the WRONG_WHY anywhere qualifies it.

**The correct statement:** For a monotone *increasing* function, left sums underestimate and right sums overestimate. For a monotone *decreasing* function, the situation reverses. For a non-monotone function, neither rule holds cleanly. The deeper rule involves *concavity*: for concave-up functions the midpoint sum underestimates and the trapezoidal rule overestimates (and vice versa for concave-down). Teaching only one case risks installing a durable wrong mental model.

**Source:** https://en.wikipedia.org/wiki/Riemann_sum — "The left Riemann sum amounts to an overestimation if f is monotonically decreasing on this interval, and an underestimation if it is monotonically increasing."  
https://calcworkshop.com/integrals/riemann-sum/ — explicit table for increasing vs decreasing cases.

---

### 2. The FTC as presented conflates Part 1 and Part 2

**The issue:** The learn text presents exactly one formula: `∫ₐᵇ f′(x) dx = f(b) − f(a)` and calls it "the Fundamental Theorem." This is FTC Part 2 (the evaluation theorem). FTC Part 1 — `d/dx ∫ₐˣ f(t) dt = f(x)` — is entirely absent. For an ML master's candidate, Part 1 is actually more important: it is the theoretical backbone of the statement "integration and differentiation are inverses," and it appears explicitly in continuous normalizing flows and in the score-function / SDE framing of diffusion models.

**The correct statement:** The FTC has two distinct parts. Part 1 says the derivative of an accumulation function equals the integrand: `F(x) = ∫ₐˣ f(t) dt ⟹ F′(x) = f(x)`. Part 2 says how to evaluate: `∫ₐᵇ f(x) dx = F(b) − F(a)` for any antiderivative F. The lesson only teaches Part 2.

**Source:** https://en.wikipedia.org/wiki/Fundamental_theorem_of_calculus — "Part 1 establishes that if you define F(x) = ∫ₐˣ f(t)dt, then F′(x) = f(x)." Also note: "not all integrable functions have antiderivatives," which makes Part 2 dependent on finding an antiderivative — a limitation worth naming.

---

### 3. Diffusion model claim is imprecise

**The issue:** The ML blurb states: "Diffusion models (image generators) are trained around integrals of noise processes." This is true at the SDE/continuous-time level (the forward/reverse processes are described by SDEs whose solutions involve path integrals), but the actual *training objective* of DDPM is a discrete MSE loss between predicted and actual noise — no integration is computed during training. Saying they are "trained around integrals" is misleading for someone actually studying DDPM.

**The correct statement:** Diffusion models can be *derived* from a continuous-time SDE (the score-based / Song et al. 2020 formulation), where the reverse SDE involves the score function whose *integral* defines the probability path. The ELBO objective for VAEs is a cleaner and more direct example of integrals in deep learning training (KL divergence is `∫ q(z) log[q(z)/p(z)] dz`; the ELBO itself is an integral over latent space). Mention both.

**Source:** https://trappedflux.substack.com/p/why-denoising-diffusion-probabilistic — score function and SDE connection explained. https://mpatacchiola.github.io/blog/2021/01/25/intro-variational-inference.html — ELBO = `∫ q(z) log[p(x,z)/q(z)] dz`.

---

## Conceptual gaps (what a serious learner still needs)

1. **Signed vs. total area.** The current function is always positive on [0,4]. A master's-bound learner must understand that `∫ₐᵇ f(x) dx` is the *net signed area* — regions below the x-axis contribute negatively. This matters enormously in practice (displacement vs. distance, log-likelihood ratios, signed contributions to gradients). Neither the learn text, lab, nor quiz addresses this.

2. **FTC Part 1 / accumulation function.** The concept of an accumulation function `F(x) = ∫ₐˣ f(t) dt` whose derivative is `f(x)` is omitted. This is the theoretical heart of why the theorem is called "fundamental" and is the lens through which continuous normalizing flows and neural ODEs are understood.

3. **Indefinite integrals and antiderivatives.** The lesson jumps from Riemann sums to the evaluation formula without defining `∫ f(x) dx` (indefinite form) or explaining what an antiderivative is independently of the FTC. A student asked to compute `∫ x³ dx` has no framework from this lesson.

4. **Midpoint and trapezoidal rules.** Only left and right endpoint sums are shown. Midpoint sums converge as O(1/n²) vs. O(1/n) for left/right — a factor of n better. The trapezoidal rule (average of left and right) and Simpson's rule are standard in numerical methods and appear in ML contexts (numerical integration of ODEs, quadrature in Gaussian processes).

5. **Improper integrals.** `∫₀^∞ f(x) dx` appears constantly in probability (e.g., the normalization constant of the Gaussian, entropy, KL divergence). The lesson never signals that integration extends to infinite domains.

6. **Integration in higher dimensions.** A one-sentence acknowledgment that the concept extends — `∫∫ p(x,y) dx dy = 1` for joint densities, path integrals in continuous models — would prepare the learner for the ML content they will encounter.

7. **The +C constant and why it cancels in definite integrals.** The lesson silently assumes the learner understands antiderivatives. Many learners are confused about why `+C` disappears; the WRONG_WHY for Q1 doesn't address this.

---

## Lab ideas

### Lab A — "Signed Area Explorer" (highest value; addresses biggest gap)
**What the learner manipulates:** A slider shifts a sinusoidal or mixed curve `f(x) = sin(x) + c` up/down across the x-axis over [0, 2π]. A second slider picks the integration interval.  
**What it reveals:** The readout shows both *net signed area* (∫f dx, can be negative or zero) and *total area* (∫|f| dx, always positive). When the function dips below the x-axis, rectangles below are shaded red with negative labels. Mission: set the curve so the net signed area is exactly 0 (a zero integral on a non-zero function — a common surprise). This directly addresses the gap that the current lab's always-positive function hides.

### Lab B — "Accumulation Function Tracer" (teaches FTC Part 1)
**What the learner manipulates:** A fixed curve `f(t)` is displayed. The learner drags a vertical slider x along the t-axis. The lab shades the region [0, x] in real time and plots a second curve `F(x) = ∫₀ˣ f(t) dt` below.  
**What it reveals:** When f(t) > 0, F(x) is increasing. When f(t) < 0, F(x) is decreasing. When f(t) = 0, F(x) has a local extremum. The learner physically sees `F′(x) = f(x)`. Mission: find two values of x where F has local max and min; identify where f crosses zero. This directly teaches FTC Part 1 without symbolic computation.

### Lab C — "Method Comparison" (addresses midpoint/trapezoidal gap)
**What the learner manipulates:** Four chips toggle between Left, Right, Midpoint, and Trapezoidal rules on the same curve. A slider controls n. The readout shows error for all four methods simultaneously on a small leaderboard.  
**What it reveals:** At n = 10, midpoint and trapezoidal are dramatically more accurate than left/right. The learner can see the O(1/n) vs O(1/n²) convergence difference visually by watching error columns as n grows.

---

## Content improvements

### `learn` text

**Add a signed area paragraph** (critical gap):
> A subtle point: if f(x) dips below the x-axis, rectangles below have negative heights, so they subtract from the sum. The definite integral gives **net signed area** — above-axis regions positive, below-axis regions negative. Total area (always positive) requires ∫|f(x)| dx. Both concepts appear constantly in ML.

**Add FTC Part 1** alongside Part 2 (currently absent):
> The FTC actually has two faces. **Part 1** says: define an accumulation function `F(x) = ∫ₐˣ f(t) dt`. Then `F′(x) = f(x)` — the rate of accumulation at x equals the function value there. **Part 2** (the one you've seen) lets you evaluate: `∫ₐᵇ f(x) dx = F(b) − F(a)` for any antiderivative F. Part 1 is why "integration and differentiation are inverses" is a theorem, not a metaphor.

**Qualify the left/right rule:**
Change "Left-edge rectangles undershoot a rising curve; right-edge overshoot" to "On a rising curve, left-edge rectangles undershoot and right-edge overshoot. On a falling curve the roles swap. Monotonicity — not which edge you pick — determines the direction of error."

### `ml` blurb

Replace the diffusion model line with a more accurate and richer set of examples:

> - **Probability densities:** Every PDF must integrate to 1: `∫ p(x) dx = 1`. Expected values `E[f(X)] = ∫ f(x)p(x) dx` are integrals. Both are the backbone of Bayesian ML.  
> - **KL divergence and the ELBO:** Training a VAE minimizes `KL(q||p) = ∫ q(z) log[q(z)/p(z)] dz` — a genuine integral over latent space. Optimizing the ELBO instead is "turning an integration problem into an optimization problem."  
> - **AUC-ROC:** Literally the integral of the TPR-vs-FPR curve — the trapezoidal rule in disguise.  
> - **Continuous normalizing flows and neural ODEs:** The forward pass is `z(T) = z(0) + ∫₀ᵀ f_θ(z(t), t) dt` — a definite integral solved numerically by ODE solvers. FTC Part 1 underpins why this is well-defined.

### `deeper` cards (currently none — add at least two)

**Card 1 — "The +C mystery":**  
Why do we drop the constant of integration in definite integrals? Because `[F(x)+C]` evaluated at b minus a gives `F(b)+C − F(a)−C = F(b)−F(a)`. The C always cancels. This is why any antiderivative works and why you can safely set C=0 for definite integrals.

**Card 2 — "Midpoint beats Left/Right by a factor of n":**  
Left and right sums have error ∝ 1/n. Midpoint rule has error ∝ 1/n². That's why n=100 midpoint beats n=10,000 left-endpoint in practice — relevant for numerical methods in ML (Gaussian process quadrature, Monte Carlo integration).

---

## Quiz improvements

### Q1 — keep, it is good

The FTC evaluation question is solid. The WRONG_WHY for option 0 ("6 is the height at the endpoint, not the accumulated area") is precise.

**Minor improvement:** Add to the `why` string a parenthetical: "(Hint question glosses over antiderivative mechanics — note that the +C cancels when you subtract F(a) from F(b).)"

### Q2 — current question is fine but add a harder follow-up question about monotonicity

**New Q2 (replaces or supplements existing Q2):**  
> f(x) is monotone decreasing on [a, b]. Which statement is true?
> - (A) Left-endpoint sum overestimates; right-endpoint sum underestimates.
> - (B) Left-endpoint sum underestimates; right-endpoint sum overestimates.
> - (C) Both sums overestimate the integral.
> - (D) Both sums converge, but neither reliably over- or underestimates.

Answer: A. `why`: "On a decreasing curve, the left endpoint is the highest point in each strip — the rectangle overshoots. The right endpoint is the lowest — it undershoots. The direction reverses compared to an increasing curve. Only monotonicity determines over/undershoot; left vs right alone says nothing."

This directly targets the misconception that "left always undershoots" which the current lesson accidentally installs.

### Q3 — keep; the WRONG_WHY for option 0 (density can exceed 1) is the best piece of misconception-busting in the lesson

**One addition:** Add a WRONG_WHY for option 2 ("It must be a straight line"): "No shape constraint at all — bell curves, spikes, uniform distributions, bimodal bumps. The only requirement is the area: ∫ p(x) dx = 1."

### New Q4 — Signed area (addresses the critical gap)

> `∫₋π^π sin(x) dx = ?`
> - (A) 2π
> - (B) 0
> - (C) 4 (total area)
> - (D) −2π

Answer: B. `why`: "sin(x) is symmetric around 0: the positive lobe [0, π] contributes +2, the negative lobe [−π, 0] contributes −2. Net signed area = 0. The definite integral measures *net* accumulation; to get total area you'd need ∫|sin(x)| dx = 4."  
(Self-contained: no lab data needed. The function is fully specified in the question.)

### New Q5 — FTC Part 1 (addresses the other critical gap)

> Define `F(x) = ∫₀ˣ t² dt`. What is `F′(x)`?
> - (A) x³/3
> - (B) x²
> - (C) 2x
> - (D) ∫₀ˣ 2t dt

Answer: B. `why`: "FTC Part 1: the derivative of an accumulation function equals the integrand evaluated at the upper limit — d/dx ∫₀ˣ t² dt = x². No antiderivative computation needed; just read off the integrand."  
(Self-contained: the function is defined in the question.)

---

## Sources

- 3Blue1Brown: "Integration and the fundamental theorem of calculus" — https://www.3blue1brown.com/lessons/integration/
- Wikipedia: Riemann sum (over/underestimation conditions, convergence rates, types) — https://en.wikipedia.org/wiki/Riemann_sum
- Wikipedia: Fundamental theorem of calculus (two parts, pedagogical confusion, antiderivative requirement) — https://en.wikipedia.org/wiki/Fundamental_theorem_of_calculus
- Calcworkshop: Riemann sums (concavity-based over/underestimation table) — https://calcworkshop.com/integrals/riemann-sum/
- Lumen Learning (Calculus I): Area and the Definite Integral (net signed area vs total area) — https://courses.lumenlearning.com/calculus1/chapter/area-and-the-definite-integral/
- Patacchiola blog: Intro to Variational Inference (KL divergence and ELBO as integrals, VAE) — https://mpatacchiola.github.io/blog/2021/01/25/intro-variational-inference.html
- MIT OCW 18.01: Single Variable Calculus course overview — https://ocw.mit.edu/courses/18-01-calculus-i-single-variable-calculus-fall-2020/
- Trapped Flux (Substack): Why DDPMs are Score-Based Models (SDE formulation; integrals in diffusion theory vs DDPM training loss) — https://trappedflux.substack.com/p/why-denoising-diffusion-probabilistic
- MLU-Explain: ROC and AUC (AUC as integral of the ROC curve) — https://mlu-explain.github.io/roc-auc/
