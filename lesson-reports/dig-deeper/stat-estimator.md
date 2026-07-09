# stat-estimator — Estimators, Bias & Variance

## Dig Deeper appendix (curated — graduate-authoritative)

### Read

- [Casella & Berger, *Statistical Inference* — Ch. 7: Point Estimation](https://www.routledge.com/Statistical-Inference/Casella-Berger/p/book/9781032593036) — The canonical graduate statistics textbook for point estimation. Chapter 7 covers unbiasedness, MSE decomposition (bias² + variance), sufficiency, completeness, the Cramér–Rao lower bound, and the Rao–Blackwell theorem. The source cited in the lesson's existing "why statisticians love MLE" deeper card. For a master's-bound learner, Ch. 7 is the definitive reference for bias, variance, and efficiency.

- [MIT 18.650 Ch. 2: Parametric Inference Lecture Notes (PDF)](https://ocw.mit.edu/courses/18-650-statistics-for-applications-fall-2016/335fd85c0a2ecffc49c781502b3d9b95_MIT18_650F16_Parametric_Inf.pdf) — Rigollet's graduate lecture notes on parametric inference covering estimators, bias, variance, MSE, consistency, and the delta method. The most concise and rigorous treatment of exactly the lesson's content at the graduate level. MIT 18.650 is the standard entry-level graduate statistics course for ML researchers.

- [CS229 Lecture Notes (Ng & Ma) — Section on Bias-Variance Tradeoff](https://cs229.stanford.edu/main_notes.pdf) — Ch. 5 of Stanford's graduate ML notes derives the bias–variance decomposition for prediction error in the ML context: E[(y−ŷ)²] = bias² + variance + noise. Connects the lesson's statistical estimator framework directly to model selection and regularization, closing the gap between statistical theory and ML practice.

### Watch

- [Machine Learning Fundamentals: Bias and Variance](https://www.youtube.com/watch?v=EuBBz3bI-aA) (StatQuest / Josh Starmer) — Josh Starmer's visual breakdown of bias and variance using the bull's-eye analogy: bias = systematic offset from target, variance = spread of estimates. Particularly good at distinguishing "bias of an estimator" (statistical) from "bias in a model" (ML), which is the exact conceptual bridge the lesson's `ml` block attempts. Best intuition-builder for this topic.

- [MIT 18.650 Lecture 3: Parametric Inference](https://www.youtube.com/watch?v=TSkDZbGS94k) (MIT OCW / Philippe Rigollet, ~50 min) — Graduate lecture covering sampling distributions, bias, variance, MSE, and why the sample mean is UMVUE (uniformly minimum variance unbiased estimator). Provides the rigorous underpinning for everything the lesson's lab demonstrates with simulation. The formal statement of why ÷(n−1) is optimal, not just a correction.

- [Population and Estimated Parameters, Clearly Explained!!!](https://www.youtube.com/watch?v=vikkiwjQqfU) (StatQuest / Josh Starmer) — Covers the critical distinction between population parameters (true μ, σ²) and sample estimates, and why estimates have sampling distributions. The best short (~7 min) explainer for the conceptual foundation the lesson builds on.

## Science & depth recommendations (to reach master's level)

- **MSE = bias² + variance decomposition should be stated explicitly** → The lesson teaches bias and variance separately but never writes MSE = bias² + variance. This decomposition is the key result: it shows why accepting bias to reduce variance (regularization, shrinkage) can lower total error. Add it to the deeper card on "unbiased is not sacred (MSE)" with a one-line derivation: MSE = E[(θ̂−θ)²] = (E[θ̂]−θ)² + Var(θ̂). Grounded in Casella & Berger Ch. 7.3 and MIT 18.650 notes Ch. 2.

- **James–Stein estimator / shrinkage should be named as the applied payoff** → The deeper card says "shrinkage and regularization" but doesn't name the James–Stein estimator, which is the landmark result: for estimating a mean vector of dimension ≥ 3, the sample mean is inadmissible — a biased shrinkage estimator always has lower MSE. This is why ridge regression works. The result is counterintuitive and memorable. Grounded in Casella & Berger Ch. 7.5 and mentioned in CS229 notes.

- **Consistency vs. unbiasedness should be distinguished** → The lesson covers unbiasedness but not consistency (the estimator converges to the true parameter as n→∞). These are different: a biased estimator can be consistent (MLE of σ² divides by n but converges to σ²). Distinguishing them is standard in graduate statistics (MIT 18.650 Lecture 3). A one-sentence note — "Unbiased means correct on average; consistent means correct in the limit as n→∞; they're independent properties" — prevents a common confusion.

- **The `ml` block's bias–variance tradeoff conflates two different uses** → The lesson notes that "this is also the bias–variance tradeoff in disguise: a high-capacity model has low bias but high variance across training sets." This is correct but may be confusing because the estimator-level bias–variance (about θ̂) is different from the model-level bias–variance (about prediction error). A clear separation — "same math, two different objects: the estimator θ̂ has statistical bias/variance; the prediction function f(x) has approximation bias and estimation variance" — would clarify rather than gloss. Grounded in CS229 Ch. 5 and Bishop PRML Ch. 3.

## Sources

- https://www.routledge.com/Statistical-Inference/Casella-Berger/p/book/9781032593036 — Casella & Berger *Statistical Inference* (canonical graduate text; 2nd ed.; Ch. 7 on point estimation, bias, MSE, Cramér–Rao; standard reference)
- https://ocw.mit.edu/courses/18-650-statistics-for-applications-fall-2016/335fd85c0a2ecffc49c781502b3d9b95_MIT18_650F16_Parametric_Inf.pdf — MIT 18.650 (graduate statistics course; Rigollet lecture notes Ch. 2 on parametric inference and estimators; confirmed live via OCW)
- https://cs229.stanford.edu/main_notes.pdf — Stanford CS229 (canonical graduate ML notes; bias–variance tradeoff in model context; freely available)
- https://www.youtube.com/watch?v=EuBBz3bI-aA — StatQuest (high-quality explainer; Starmer "Machine Learning Fundamentals: Bias and Variance"; confirmed live)
- https://www.youtube.com/watch?v=TSkDZbGS94k — MIT OCW 18.650 (graduate statistics lecture; Rigollet Lecture 3: Parametric Inference; ~50 min; confirmed live)
- https://www.youtube.com/watch?v=vikkiwjQqfU — StatQuest (high-quality explainer; "Population and Estimated Parameters, Clearly Explained!!!"; confirmed live)
