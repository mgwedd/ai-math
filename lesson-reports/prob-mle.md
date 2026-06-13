# prob-mle — Maximum Likelihood Estimation

## Current summary (what it teaches + what the lab does)

**Tutorial (`learn`):** Introduces MLE as the argmax of the product of per-sample likelihoods, motivates the log-likelihood equivalence (monotone transform preserves argmax, products become sums), states the Gaussian MLE closed-form answer (μ = sample mean, σ² = sample variance), and flags the "overconfidence is punished" intuition for tight σ.

**ML note:** Claims MSE derives from Gaussian MLE, cross-entropy from categorical MLE, and weight decay from MAP with a Gaussian prior—three pillars, one principle.

**Deeper cards:**
1. "Surprise dial" — log p(x) as un-surprise; drag bell, total surprise falls.
2. "MLE → loss functions" — sketches the derivation: −log Gaussian = squared error; −log categorical = cross-entropy; add log-prior = MAP = weight decay.

**Quiz (4 questions):** MLE principle, why log-likelihood, Gaussian MLE for μ, GPT training as MLE.

**Lab (`probmle`):** 8 fixed Gaussian data points (mean 1.2, σ ≈ 0.497). Learner drags two sliders (μ, σ); a real-time Gaussian PDF is drawn with vertical likelihood stems from each data point to the curve. A log-likelihood meter bar fills; readout shows log L, max possible. Three missions: center bell within 0.05 of 1.2, reach summit (log L within 0.05 of max), observe log L crater when σ ≤ 0.2.

---

## Strengths

1. **Log-likelihood motivation is clean and correct.** The lesson gives both reasons (underflow from small products, easier differentiation) and correctly states that the argmax is invariant to monotone transforms.

2. **Overconfidence mission is genuinely illuminating.** Squeezing σ below the data spread and watching log L crater to −15 builds a lasting visceral intuition for why variance matters and why a too-confident model is penalized.

3. **ML connections in the `deeper` card are accurate and compact.** The chain −log Gaussian → MSE → −log categorical → cross-entropy → MAP → weight decay is the most important unification in applied ML and the lesson names it correctly.

4. **Lab instrumentation is well-chosen.** Likelihood stems from each data point to the curve let the learner see individual contributions, not just an aggregate score. The log-likelihood meter provides immediate feedback.

5. **Readout shows max possible log L.** This anchors the learner's exploration—they know what "summit" means numerically.

---

## Inaccuracies / fidelity issues

### 1. The MLE of σ² divides by n, not n — and is **biased** (not mentioned)

**Issue:** The lesson states "the MLE of μ is the sample mean, and of σ² the sample variance" without qualification. In standard usage "sample variance" often means the *unbiased* estimator (dividing by n−1). The MLE for σ² actually divides by **n** — not n−1 — and is a *biased* downward estimator: E[σ̂²_MLE] = ((n−1)/n)σ², with bias −σ²/n.

**Correct statement:** The MLE for σ² is (1/n)Σ(xᵢ−x̄)², which underestimates the true variance by a factor of (n−1)/n. The unbiased estimator uses n−1 (Bessel's correction). For large n the difference is negligible, but confusing the two is a very common error in ML code and papers.

**Why it matters here:** The lab itself computes SIG = sqrt(Σ(xᵢ−MEAN)²/n), i.e. the MLE (biased) estimator — correct for the optimization target, but the lesson text doesn't flag this distinction. A master's-bound learner will encounter this immediately in statistics coursework and in numpy (ddof=0 vs ddof=1).

**Source:** https://statproofbook.github.io/P/resvar-bias.html ; https://en.wikipedia.org/wiki/Maximum_likelihood_estimation#Gaussian_distribution

---

### 2. The MLE formula in `learn` silently assumes i.i.d. data — the assumption is unmentioned

**Issue:** The product rule `Π p(xᵢ | θ)` holds *only* when the xᵢ are **independent** (and identically distributed). The lesson presents this as the definition of MLE without stating the i.i.d. assumption. For a master's learner who will immediately encounter time series, language model token sequences, or correlated measurements, this gap is consequential.

**Correct statement:** MLE for i.i.d. data decomposes as a product of individual likelihoods. When data are not independent (e.g., autoregressive sequences, panel data), the joint likelihood cannot be factored this way; the product formula is a special case, not the definition.

**Source:** Wikipedia MLE article, "Discrete distribution, finite parameter space" section; general statistical inference texts.

---

### 3. The likelihood function is not a probability distribution — not mentioned

**Issue:** The lesson writes `P(data | θ)` and `p(xᵢ | θ)` using probability notation, which can leave students thinking the likelihood integrates/sums to 1 over θ. The likelihood function L(θ) is the same mathematical expression viewed as a function of θ with the data fixed — it is generally **not** a probability distribution over θ (it doesn't normalize). This is one of the most persistent confusions in statistics education.

**Correct statement:** L(θ) = p(data | θ) as a function of θ is called the likelihood function. It shares the same formula as the conditional probability but its domain is θ-space, not data-space. It need not integrate to 1. Treating it as a probability over θ leads directly to the base-rate fallacy variant that confuses P(data|θ) with P(θ|data) — exactly the error Bayes' theorem (lesson 3) corrects.

**Source:** https://towardsdatascience.com/on-probability-versus-likelihood-83386b81ad83/ ; Wikipedia MLE

---

### 4. Claim "Minimizing MSE = MLE under Gaussian noise" is true but silently assumes *known* σ²

**Issue:** The `ml` section and `deeper` card say "minimizing MSE = MLE under Gaussian noise." This is correct *when σ² is treated as fixed/known* — because the 1/σ² and log σ terms are then constants. But if σ² is also being optimized (as in the lab!), the full negative log-likelihood is Σ[log σ + (xᵢ−μ)²/(2σ²)], which reduces to MSE only after fixing σ. This subtlety is why MLE jointly optimizing both μ and σ is not the same as pure MSE minimization.

**Correct statement:** Minimizing MSE with respect to μ alone equals MLE for μ under Gaussian noise with fixed σ². When σ is free, the MLE objective is richer.

**Source:** CS229 notes; any Gaussian MLE derivation showing the full log-likelihood.

---

## Conceptual gaps (what a serious learner still needs)

### A. The likelihood-as-function-of-θ visualization (the "likelihood surface")
The lab fixes 8 data points and varies (μ, σ). A **2D contour plot** of the log-likelihood surface over the (μ, σ) plane — showing the unique summit and the ridges — would make concrete what "maximization" means geometrically and reveal how the shape encodes parameter uncertainty (Fisher information). Currently the lab is 1D-in-each-parameter with separate sliders, missing the joint landscape.

### B. MLE is a **point estimate** — uncertainty not represented
The lesson never says that MLE produces a single parameter value, not a distribution. The summit is a point; nearby regions of the log-likelihood surface encode uncertainty (via Fisher information / standard errors). A master's learner needs to know: what if the data are scarce? MLE gives an unstable peak. This leads directly to MAP (lesson mentions it) and full Bayesian posteriors. The "flat likelihood" vs "sharp likelihood" scenario should be named.

### C. MLE is **consistent and asymptotically efficient** — but not necessarily good at small n
MLE's theoretical appeal is its asymptotic properties: as n→∞, it converges to the true parameter (consistency) and achieves the Cramér–Rao lower bound (efficiency). These guarantees are what make MLE the default — but they require large n. At small n, MLE can be badly biased (the σ² example is the canonical case). The lesson mentions the σ trick in passing but doesn't give the master's learner the vocabulary to situate it.

### D. **Invariance property** of MLE
If θ̂ is the MLE of θ, then g(θ̂) is the MLE of g(θ) for any function g. This is elegant and practically important — e.g., the MLE of σ is sqrt(σ̂²_MLE), and the MLE of the log-odds is the log-odds of the MLE probability. Worth one sentence.

### E. MLE = minimizing KL divergence to the empirical distribution
MLE over a dataset is mathematically equivalent to minimizing KL(p_data ‖ p_θ) where p_data is the empirical distribution. This bridges lessons 4 and 6 (entropy/KL). The `deeper` card mentions cross-entropy = H(data) + KL(data‖model); one more sentence connecting this back to MLE would close the loop. Currently the lesson sequence teaches MLE before KL, so the forward pointer should at minimum say "we'll prove this in the next lesson."

### F. The i.i.d. assumption and what happens when it breaks
GPT's training objective is listed as MLE — but GPT's data are *not* i.i.d. tokens; they are autoregressive sequences. The product decomposes as a chain rule product P(w₁)P(w₂|w₁)…, which is a different factorization (still valid by the chain rule of probability, but not a product of marginals). This nuance is absent and will trip up a careful learner.

### G. Numerical optimization in practice
The lesson implies that MLE always has a closed-form solution (Gaussian case). For master's-bound learners: Gaussian MLE is exceptional. Most models (logistic regression, neural networks) require gradient ascent on the log-likelihood, and multiple local optima can exist (mixture models). A sentence here and in the `deeper` card would prevent the misconception that MLE is always analytically tractable.

---

## Lab ideas

### Lab A (existing, upgraded): "The 2D Likelihood Landscape" 
**What:** Add a second panel showing a **contour heatmap** of log L(μ, σ) over a grid, with the current (μ, σ) position marked as a moving dot. **What the learner manipulates:** same sliders as now. **What it reveals:** the unique global maximum, the elongated ridge in the σ direction when data is sparse, and how the curvature (steepness) encodes uncertainty. This is the single most illuminating visualization for MLE intuition — seeing the "bowl" shape of −log L (convexity) connects directly to gradient descent.

### Lab B (new): "Coin-flip MLE: watch the likelihood function grow"
**What:** Learner flips a biased coin (hidden p). After each flip, the lab draws the full **likelihood function L(p) for p ∈ [0,1]** as a curve, updating in real time. **What the learner manipulates:** a "Flip" button; also slider to set the true hidden p (revealed only at the end). **What it reveals:** (1) with 0 flips, the likelihood is flat (no information); (2) each flip sharpens the curve; (3) the peak converges to the true p; (4) 3 heads out of 3 gives a likelihood that peaks at p=1 (a degenerate/boundary MLE — a great discussion hook); (5) the width of the peak tracks uncertainty. This is the canonical MLE demonstration, recommended in every statistics course because the 1D parameter space is fully visible.

### Lab C (new): "MLE vs MAP slider"
**What:** Same Gaussian setup as current lab but adds a **prior strength slider** (Gaussian prior on μ centered at 0). As prior strength increases, the optimal μ is pulled toward 0 — the learner can watch MAP trade off likelihood against prior. **What it reveals:** MAP as regularization; the MLE is the zero-prior limit; strong prior = weight decay. Bridges directly to the `deeper` card content with a live demonstration.

---

## Content improvements

### `learn` section

1. **Flag the i.i.d. assumption explicitly:** After the product formula, add: *"This product is valid when samples are independent and identically distributed (i.i.d.) — the Gaussian bell with fixed μ, σ applies equally to every xᵢ with no dependencies between them."*

2. **Correct the σ² description:** Change "the MLE of σ² [is] the sample variance" to "the MLE of σ² is (1/n)Σ(xᵢ−x̄)², which divides by n — not n−1. This is a *biased* estimator (it systematically underestimates σ²), but it is the true maximum of the likelihood function. In practice numpy defaults to dividing by n (ddof=0, the MLE); many textbooks quote n−1 (Bessel's correction, unbiased but not MLE)."

3. **Add one sentence on what MLE does NOT do:** "MLE returns a point estimate — a single best-fit θ. It doesn't quantify how confident to be in that estimate (that requires Fisher information or a Bayesian posterior)."

### `ml` section

1. **Qualify MSE = Gaussian MLE:** "Minimizing MSE with respect to the *mean* (treating σ as fixed) equals MLE under Gaussian noise. When σ is also unknown, the full MLE objective has an additional log σ term."

2. **Be precise about GPT's factorization:** "GPT is trained to maximize Σ log P(wₜ | w₁…wₜ₋₁) — the log-probability of each token given its context. This is MLE over the chain-rule factorization of the text distribution, not over i.i.d. tokens."

### `deeper` cards

1. **Card 2 ("MLE → loss functions"):** Add the KL divergence connection: "There's a cleaner way to say all of this: maximizing log-likelihood over a dataset is identical to minimizing KL(p_data ‖ p_θ) — the divergence between the empirical data distribution and the model. The data's entropy is a constant; gradient descent can only reduce the KL term. You'll see this formalized in the next lesson on entropy & KL."

2. **Add card 3: "Asymptotic efficiency — why MLE is the default":** "Under regularity conditions, MLE is *consistent* (converges to the true parameter as n→∞) and *asymptotically efficient* (achieves the minimum possible variance, given by the inverse Fisher information / Cramér-Rao bound). No consistent estimator can beat it in the limit. This is why MLE is the workhorse of statistics — not tradition, but a theorem."

3. **Add a sentence on the invariance property** in card 2: "Bonus: if θ̂ is the MLE of θ, then g(θ̂) is the MLE of g(θ) for any function g. So the MLE of the standard deviation is sqrt(σ̂²), the MLE of the log-odds is log(p̂/(1−p̂)), etc."

---

## Quiz improvements

### Current gaps
- No question targets the **biased vs unbiased σ² distinction** — arguably the most common practical mistake.
- No question addresses **what MLE does NOT give you** (uncertainty, posterior).
- No question tests the **likelihood vs probability** distinction.
- No question targets the **i.i.d. assumption**.
- Question 3 (Gaussian MLE for μ = sample mean) is correct but the answer framing "you verified it by dragging" makes it slightly lab-data-dependent if the learner didn't do the lab. Reframe to make it self-contained.

### Suggested new/replacement questions (all self-contained)

**Q-new-1 (replace Q3 or add): Biased σ² MLE**
> "The MLE of σ² for a Gaussian with n samples is (1/n)Σ(xᵢ−x̄)². Its expected value is…"
> Options: [(n−1)/n · σ²] [σ²] [(n+1)/n · σ²] [0]
> Answer: 0 (the biased estimator)
> Why: The MLE σ² divides by n, not n−1 (Bessel's correction). It systematically underestimates: E[σ̂²] = (n−1)/n · σ². For large n the bias is tiny; for n=3 it misses by 33%.
> WRONG_WHY: {1: "σ² would require dividing by n−1 — that's the unbiased estimator, not MLE.", 2: "(n+1)/n would actually OVER-estimate — MLE goes the other way.", 3: "The MLE is non-trivial; calculus delivers (1/n)Σ(xᵢ−x̄)², not zero."}

**Q-new-2: Likelihood is not a probability distribution**
> "The likelihood function L(θ) = P(data | θ), viewed as a function of θ, is…"
> Options: ["A function over θ-space that generally does not integrate to 1", "A probability distribution over parameters", "Always between 0 and 1", "The posterior distribution"]
> Answer: 0
> Why: L(θ) is the same formula as the conditional probability, but now θ varies and data is fixed. It lives in parameter-space and has no requirement to sum to 1 — that's the posterior's job, requiring a prior.
> WRONG_WHY: {1: "A probability distribution over θ would be the posterior P(θ|data) — that requires a prior. MLE doesn't compute it.", 2: "Individual likelihood values are probabilities (or densities), so each is in [0,1] — but their integral over θ need not be 1.", 3: "The posterior is P(θ|data) = L(θ)·P(θ)/P(data). MLE finds the peak of L(θ) only."}

**Q-new-3: What MLE gives you (point estimate)**
> "MLE returns…"
> Options: ["A single point estimate — the parameter value making the data most probable", "A distribution over parameters", "The probability that the parameters are correct", "The parameter minimizing test error"]
> Answer: 0
> Why: MLE is an argmax — it returns one number (or vector). It says nothing about confidence around that value. For a distribution over parameters, you need Bayesian inference with a prior.
> WRONG_WHY: {1: "A distribution over parameters is a posterior — Bayesian inference. MLE finds the peak, not the shape.", 2: "P(θ|data) is the posterior — it equals P(data|θ)·P(θ)/P(data). MLE discards the prior and normalizer.", 3: "Test error governs generalization; MLE optimizes the training likelihood. Related but distinct."}

**Q-new-4 (reframe Q3 to be self-contained): Gaussian MLE for μ**
> "To find the MLE of μ for a Gaussian, you differentiate Σ −(xᵢ−μ)²/(2σ²) with respect to μ and set to zero. The result is…"
> Options: ["The sample mean x̄ = (1/n)Σxᵢ", "The sample median", "Always μ = 0", "It depends on σ"]
> Answer: 0
> Why: d/dμ of Σ(xᵢ−μ)² = −2Σ(xᵢ−μ) = 0 → Σxᵢ = nμ → μ̂ = x̄. The bell's optimal center is the data's center of mass, regardless of σ.
> WRONG_WHY: {1: "The median minimizes Σ|xᵢ−μ| (L1), not Σ(xᵢ−μ)² (L2). Different objective, different answer.", 2: "μ = 0 only if the data happens to be centered at zero. MLE follows the data.", 3: "Differentiating with respect to μ and setting to zero: the σ² terms cancel. The answer is independent of σ."}

---

## Sources

- Wikipedia — Maximum Likelihood Estimation: https://en.wikipedia.org/wiki/Maximum_likelihood_estimation
- Stanford CS229 main notes (Ng & Ma): https://cs229.stanford.edu/main_notes.pdf
- StatProofBook — MLE variance estimator is biased: https://statproofbook.github.io/P/resvar-bias.html
- Dawen Liang — MLE variance bias proof: https://dawenl.github.io/files/mle_biased.pdf
- Jake Tae — MLE and KL Divergence: https://jaketae.github.io/study/kl-mle/
- Stanford CS228 notes — Learning in directed models: https://ermongroup.github.io/cs228-notes/learning/directed/
- EECS 398 MLE guide (UCSD): https://practicaldsc.org/guides/machine-learning/mle/
- Towards Data Science — Probability vs Likelihood: https://towardsdatascience.com/on-probability-versus-likelihood-83386b81ad83/
- Medium — MLE and Cross-Entropy link: https://medium.com/intro-to-artificial-intelligence/the-link-between-maximum-likelihood-estimation-mle-and-cross-entropy-599cc1414753
- Wikipedia — Maximum a posteriori estimation (MAP): https://en.wikipedia.org/wiki/Maximum_a_posteriori_estimation
- Stanford Stats 200, Lecture 14 — Consistency and asymptotic normality: https://web.stanford.edu/class/archive/stats/stats200/stats200.1172/Lecture14.pdf
