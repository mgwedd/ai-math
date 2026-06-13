# prob-dist — Distributions: Shapes of Chance

## Current summary (what it teaches + what the lab does)

The lesson introduces three named distribution families — Bernoulli(p), Binomial(n, p), and Gaussian/Normal(μ, σ) — as "workhorses" covering applied probability. The `learn` block gives the Binomial PMF, describes the Gaussian by its two-knob parametrization, and previews the CLT by noting that cranking n on a binomial "becomes a bell." The `ml` note connects sigmoid → Bernoulli, softmax → categorical, and Gaussian weight initialization. Two `deeper` cards cover the "parameters as knobs" mental model and the categorical/softmax generalization.

The interactive (`probdist`) is a single-canvas shape explorer: three chip buttons select Bernoulli / Binomial / Gaussian, sliders drive p, n, μ, and σ, and the canvas redraws the PMF/PDF in real time. Missions gate on (1) symmetric binomial (p = 0.5, n ≥ 10), (2) CLT preview (n ≥ 25), and (3) a sharpened Gaussian (μ = 2.0, σ ≤ 0.5). The readout shows E[X], σ, or a density note.

There are four quiz questions targeting: which distribution counts successes (Binomial vs Bernoulli), what σ does to the bell, what the binomial at n = 30 resembles, and the Bernoulli reading of a sigmoid output.

---

## Strengths

1. **PMF formula is correct.** P(k) = C(n,k)·pᵏ·(1−p)^(n−k) is exact and well-positioned.
2. **Readout shows the right moments.** E[X] = np, σ = √(np(1−p)) for Binomial; E[X] = p, Var = p(1−p) for Bernoulli — all correct.
3. **CLT teaser is pedagogically smart.** Placing "crank n, watch the bell emerge" before the CLT lesson creates a question the learner holds. The mission enforces it kinetically.
4. **ML note is accurate and tight.** Sigmoid → Bernoulli, softmax → categorical, Gaussian init — these are the three genuine connections a master's student needs.
5. **Deeper card on categorical/softmax** is high-value; temperature scaling is the right coda for an ML audience.
6. **Missions are coherent** and don't require recalling off-screen graph values.
7. **`bars()` helper clips correctly** at `vmax` and the Gaussian branch draws via the `plane` helper, which properly handles continuous density scaling.

---

## Inaccuracies / fidelity issues

### 1. Notation: `Normal(μ, σ)` — should be `Normal(μ, σ²)`

**The issue:** The `learn` block writes "Gaussian / Normal(μ, σ)" and the lab readout says `Normal(μ = …, σ = …)`. This implies the second parameter is the standard deviation.

**The correct statement:** The universally standard notation is **N(μ, σ²)**, where the second argument is the *variance*. This is the convention in Wikipedia, Goodfellow & Bengio & Courville *Deep Learning*, Bishop *PRML*, and CS229 notes. Using N(μ, σ) is a minority convention that consistently confuses learners when they encounter the literature (e.g., they read "N(0, 0.01)" and wonder whether σ = 0.01 or σ² = 0.01 — a factor-of-10 difference in spread).

The lab Gaussian PDF is implemented correctly as `Math.exp(-(x-mu)*(x-mu)/(2*sg*sg))/(sg*Math.sqrt(2*Math.PI))` — this is N(μ, σ²) with σ as the standard deviation — so the *code* is fine. The *labeling* mismatches the literature norm.

**Fix:** Change all surface text to `Normal(μ, σ²)`, label the slider `σ — standard deviation (σ² is the variance)`, and add a one-liner: "Note: the standard notation N(μ, σ²) takes the variance as second argument."

**Sources:**
- https://en.wikipedia.org/wiki/Normal_distribution (see Notation section)
- Goodfellow et al., *Deep Learning* (2016), Ch. 3 — uses N(μ, σ²) throughout
- https://www.quora.com/Which-notation-of-the-Gaussian-distribution-is-more-popular-N-mu-sigma-or-N-mu-sigma-2 (community confirms σ² is dominant in ML literature)

### 2. Binomial → Gaussian preview lacks validity caveat

**The issue:** The `learn` block says "crank a binomial's n and the bars *become* a bell" and the quiz asks "A binomial with n = 30, p = 0.5 looks strikingly like a Gaussian bell" (correct answer: yes). This is true for p = 0.5 at n = 30, but is taught as if it holds universally.

**The correct statement:** The normal approximation to Binomial(n, p) is only reliable when **both np ≥ 5 and n(1−p) ≥ 5** (many sources use ≥ 10 for a stricter rule). For skewed p (e.g., p = 0.05, n = 30), np = 1.5 — the binomial is right-skewed and looks nothing like a bell. The Poisson approximation applies when n is large and p is small with np constant. The lesson as written implies any large-n binomial is bell-shaped regardless of p.

**Fix:** Add a single sentence in `learn`: "This works best when p stays near 0.5 — extreme p values skew the bars asymmetrically and the bell only appears at much larger n." Add a mission or slider challenge: "Observe what happens with p = 0.05, n = 40 — is it a bell?"

**Sources:**
- https://stats.libretexts.org/…/6.05 (rule of thumb: np ≥ 5 and n(1−p) ≥ 5)
- https://en.wikipedia.org/wiki/Binomial_distribution (Normal approximation conditions: np and n(1−p) both ≥ 9 preferred)

### 3. Bernoulli variance formula: `p(1−p)` — correct, but maximum is silently omitted

**The issue:** The readout shows `Var = p(1−p)` which is correct. However, the lesson never notes that this variance is maximized at p = 0.5 (Var = 0.25) and minimized toward 0 near the extremes. This is the most important qualitative fact about Bernoulli variance — it matters directly for label imbalance in ML (a 99%-positive dataset has nearly zero label entropy/variance in the target).

**The correct statement:** Var[Bernoulli(p)] = p(1−p) ∈ [0, 0.25], maximized at p = 0.5. The readout already computes this; it just never frames why the number matters.

**Fix:** Tiny readout annotation: "max variance = 0.25 at p = 0.5." Add to the Bernoulli deeper card or `learn` paragraph.

**Source:** https://en.wikipedia.org/wiki/Bernoulli_distribution

### 4. Quiz Q4 answer explanation conflates two separate claims

**The issue:** Quiz Q4: "A model outputs 0.83 from a sigmoid for 'spam'. The right probabilistic reading is… Spam ~ Bernoulli(0.83)." The `why` says "The output parameterizes a Bernoulli over the label. Accuracy is a property of the model overall, not of this prediction." The answer is correct but the explanation misses the cleanest statement of the connection: the sigmoid is the canonical link function of the Bernoulli GLM, and minimizing binary cross-entropy is exactly MLE under Bernoulli(σ(logit)) likelihood.

**Fix (minor):** Add to `why`: "Formally, logistic regression is a GLM with Bernoulli family and logit link — the sigmoid inverts the logit to recover p."

**Source:** https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7512723/ (Deconstructing Cross-Entropy for Probabilistic Binary Classifiers)

---

## Conceptual gaps (what a serious learner still needs)

### A. The maximum-entropy characterization of the Gaussian is absent

The Gaussian is presented as "it appears whenever many small independent effects add up" (CLT story). This is one reason — but the other, equally important reason is that the Gaussian is the **maximum-entropy distribution given a fixed mean and variance**. This means: if you know only μ and σ² and nothing else, the Gaussian is the *least-assuming* distribution you can write down. This is why Gaussian priors, Gaussian noise models, and Gaussian weight init are the default: they smuggle in the fewest hidden assumptions beyond second-moment constraints.

The formula: H[N(μ, σ²)] = ½ log(2πeσ²). This is a genuinely important insight for a master's-bound engineer who will encounter "why Gaussian?" constantly.

### B. Bernoulli(p) = Binomial(1, p) is implicit but never stated

The lesson treats Bernoulli and Binomial as siblings. The algebraic fact that Bernoulli is Binomial(n=1) is never stated. Making this explicit closes the loop: the PMF P(k) = C(1,k)·p^k·(1−p)^(1−k) reduces to p when k=1 and (1−p) when k=0. This would also rationalize why the Binomial readout formula for E[X]=np and σ=√(np(1−p)) reduces perfectly to Bernoulli's E[X]=p and Var=p(1−p) at n=1.

### C. No Poisson — the discrete cousin with its own ML role

The "three shapes cover half of applied probability" framing is fair as a claim, but a master's student will immediately encounter Poisson in: count regression, discrete diffusion models, Poisson process event modeling, and (surprisingly) the Poisson approximation to Binomial when p is tiny. A fourth card in `deeper` or a brief mention in `ml` would cover this gap without expanding the lesson.

### D. The exponential family connection is mentioned nowhere

The `deeper` categorical/softmax card is excellent but doesn't name the unifying structure: Bernoulli, Binomial, Gaussian, Poisson, and Categorical are all *exponential family* distributions. This is the algebraic reason softmax generalizes sigmoid, why conjugate priors exist, and why sufficient statistics are tractable. A one-liner pointing the learner toward this would pay dividends when they hit PRML Chapter 2.

### E. The continuity correction for Binomial → Normal approximation

When approximating a discrete PMF with a continuous PDF, P(X = k) ≈ P(k − 0.5 < X < k + 0.5). The lesson doesn't mention this, which is fine for intuition — but it should be flagged as "the bars don't perfectly align with the bell for finite n; this is normal."

### F. Gaussian closure properties (relevant for the learner headed to VAEs/GPs)

The Gaussian is closed under affine transformations, conditioning, and marginalization. This is what makes it tractable in Kalman filters, Gaussian processes, and VAE latent spaces. A one-liner in `deeper`: "Sum two independent Gaussians → Gaussian. Condition a joint Gaussian → Gaussian. This closure is why Gaussian priors are computationally friendly."

---

## Lab ideas

### Lab idea 1: Shape explorer with validity-boundary overlay (upgrade of current lab)

**Name:** "Distribution Shape Explorer with Normal Approximation Overlay"

**What the learner manipulates:** Same as current (Bernoulli/Binomial/Gaussian chips, p, n, μ, σ sliders). **New:** on the Binomial panel, draw the approximating N(np, np(1−p)) density curve over the bars in a contrasting color. Add a validity indicator: "Normal approximation: GOOD (np=15, n(1-p)=15 ≥ 5)" or "POOR (np=1.5 < 5)."

**What it reveals:** The learner directly sees where the approximation is tight (p ≈ 0.5, large n) and where it breaks (small p, small n). They also see the continuity alignment issue. This turns the CLT teaser from "trust me it's a bell" into "here's exactly when and why it is."

**Mission addition:** "Find the smallest n at p = 0.1 where the binomial and its normal approximation both satisfy np ≥ 5." (Answer: n = 50.)

### Lab idea 2: Variance-surprise visualizer for Bernoulli

**Name:** "The Cost of Certainty"

**What the learner manipulates:** A single p slider. The canvas shows: (1) the Bernoulli PMF bar chart, (2) a separate gauge for H(p) = −p log₂ p − (1−p) log₂ (1−p) (entropy) and Var = p(1−p) plotted as a function of p, with a moving dot tracking the current p.

**What it reveals:** Both entropy and variance peak at p = 0.5 and collapse to 0 at the extremes. This unifies the "uniform = maximum uncertainty" intuition from the entropy lesson with the distribution perspective. It also viscerally demonstrates why a 99%-spam dataset has a near-zero target variance — the label is almost determined before the model even looks at features.

### Lab idea 3: Maximum-entropy Gaussian sandbox

**Name:** "Why Gaussian? The Maximum Entropy Argument"

**What the learner manipulates:** Fix μ = 0, σ = 1. The canvas shows: (a) the N(0, 1) bell, (b) a manually-shaped comparison distribution (learner drags 4–6 control points to define an arbitrary distribution with the same μ and σ). Entropy of both distributions is computed and displayed in real time.

**What it reveals:** No matter how the learner reshapes the comparison distribution while keeping μ and σ fixed, the Gaussian always has higher entropy. This makes the maximum-entropy characterization visceral rather than a theorem to trust. The learner discovers WHY the Gaussian is the "least-assuming" choice.

---

## Content improvements

### `learn` block

1. **Notation fix (critical):** Change "Gaussian / Normal(μ, σ)" to "Gaussian / Normal(μ, σ²)" and add: "The second parameter is the *variance* (σ² = spread²) — standard notation in the literature, so μ±σ means one standard deviation, but the distribution is written N(μ, σ²)."

2. **Add maximum-entropy sentence:** After "It appears whenever many small independent effects add up," add: "There's a second reason it's everywhere: given only a fixed mean and variance, the Gaussian is the *maximum-entropy* distribution — it smuggles in no hidden assumptions beyond those two numbers. When you don't know the shape, Gaussian is the mathematically honest choice."

3. **Add Binomial validity bound:** After "Watch in the lab: crank a binomial's n and the bars become a bell," add: "This convergence is fast near p = 0.5 but slow near the extremes — try p = 0.05 and see how skewed the bars stay."

4. **State Bernoulli = Binomial(1, p):** After the Bernoulli paragraph, add: "Equivalently, Bernoulli(p) is Binomial(1, p) — one trial, two outcomes."

### `ml` note

The current note is accurate and tight. One addition worth making: "The *binary cross-entropy loss* — minimized by every binary classifier — is the negative log-likelihood of a Bernoulli model, making the sigmoid not just a squashing function but the *canonical link* of this probabilistic family."

### `deeper` cards

**Card 1 (Parameters as knobs):** Solid. Add: "At n = 1 the Binomial's knobs produce exactly the Bernoulli — a useful sanity check."

**Card 2 (categorical/softmax):** Add a sentence on the maximum-entropy angle: "The Gaussian isn't just the CLT limit — it's the maximum-entropy distribution when you fix mean and variance. That's why Gaussian priors in Bayesian modeling are the 'least opinionated' choice."

**Card 3 (new — recommended):** Add a "Go deeper: the exponential family" card: "Bernoulli, Binomial, Gaussian, Poisson, and Categorical are all members of the *exponential family* — a common algebraic form that explains why they share tractable MLE formulas, why softmax generalizes sigmoid, and why conjugate priors exist. If you go deep into PRML or probabilistic ML, this is the thread."

---

## Quiz improvements

### Existing questions — keep with minor tweaks

- **Q1** (Binomial vs Bernoulli for head-count): Good. WRONG_WHY for option 2 (Gaussian) is correct.
- **Q2** (σ increases → widens bell): Good. `why` can add: "Total area = 1 always, so width × height is constant — wider means shorter peak."
- **Q3** (n=30, p=0.5 → bell): Good, but add a note in the focus: "This works because np = 15 and n(1−p) = 15 are both ≥ 5 — the approximation is valid here."
- **Q4** (sigmoid → Bernoulli): Good.

### New questions to add (targeting real misconceptions)

**New Q5 — Notation trap:**
> The standard notation N(μ, σ²) uses variance as the second parameter. A weight matrix is initialized with N(0, 0.01). Its standard deviation is…
> (A) 0.1  (B) 0.01  (C) 0.0001  (D) 1.0
> Correct: A (σ = √0.01 = 0.1)
> Tag: gaussian notation
> Why: N(0, 0.01) means μ=0, σ²=0.01, so σ = √0.01 = 0.1. Confusing σ and σ² is one of the most common practical errors when reading paper initialization sections.

**New Q6 — Maximum entropy intuition:**
> You know a continuous distribution has mean 0 and variance 1 but nothing else. The "least-assuming" distribution is…
> (A) Gaussian — it has maximum entropy given those two constraints  (B) Uniform — equal probability everywhere  (C) Laplace — heavier tails are safer  (D) You need more information to choose
> Correct: A
> Tag: maximum entropy gaussian
> Why: Among all distributions with fixed mean and variance, the Gaussian uniquely maximizes entropy — it encodes only those two facts and nothing more. This is why Gaussian priors and noise models are the default in probabilistic ML.

**New Q7 — Binomial approximation validity:**
> Binomial(n=20, p=0.02): does it look approximately Gaussian?
> (A) No — np = 0.4, far below the np ≥ 5 threshold; the distribution is right-skewed  (B) Yes — n = 20 is large enough  (C) Yes — p < 0.5 makes it symmetric  (D) It depends only on the number of outcomes, not p
> Correct: A
> Tag: binomial approximation validity
> Why: The rule of thumb requires np ≥ 5 AND n(1−p) ≥ 5. Here np = 0.4. The Poisson approximation is more appropriate when p is tiny and np is moderate.

All questions are fully self-contained — no reference to lab graph values.

---

## Sources

1. https://en.wikipedia.org/wiki/Normal_distribution — parameter convention (N(μ, σ²)), 68-95-99.7 rule exact values, common misconceptions
2. https://en.wikipedia.org/wiki/Binomial_distribution — PMF, mean/variance, normal approximation conditions (np and n(1−p) ≥ 5 or 9)
3. https://en.wikipedia.org/wiki/Bernoulli_distribution — PMF, mean p, variance p(1−p), Bernoulli = Binomial(1,p) relationship
4. https://stats.libretexts.org/Courses/Las_Positas_College/Math_40:_Statistics_and_Probability/06:_Continuous_Random_Variables_and_the_Normal_Distribution/6.05:_Normal_Approximation_to_the_Binomial_Distribution — rule-of-thumb thresholds, continuity correction
5. https://andrewcharlesjones.github.io/journal/maxent-distributions.html — Gaussian as maximum entropy distribution given mean and variance; H = ½log(2πeσ²)
6. https://sgfin.github.io/2017/03/16/Deriving-probability-distributions-using-the-Principle-of-Maximum-Entropy/ — maximum entropy derivation of Gaussian and exponential distributions; pedagogical framing
7. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7512723/ — sigmoid / Bernoulli / binary cross-entropy canonical link connection
8. https://distill.pub/2019/visual-exploration-gaussian-processes/ — Gaussian closure properties (conditioning, marginalization), N(μ, Σ) covariance notation
9. https://jonathan-hui.medium.com/probability-distributions-in-machine-learning-deep-learning-b0203de88bdf — exponential family unification of Bernoulli/Binomial/Gaussian; categorical as Bernoulli generalization
