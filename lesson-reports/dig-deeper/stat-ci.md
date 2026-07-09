# stat-ci — Confidence Intervals

## Dig Deeper appendix (curated — graduate-authoritative)

### Read

- [MIT 18.650 Ch. 2: Parametric Inference Lecture Notes (PDF)](https://ocw.mit.edu/courses/18-650-statistics-for-applications-fall-2016/335fd85c0a2ecffc49c781502b3d9b95_MIT18_650F16_Parametric_Inf.pdf) — Rigollet's graduate lecture notes covering the construction of confidence intervals via the delta method, asymptotic CIs based on the CLT, and the pivot method. This is the formal treatment behind the lesson's "95% CI = x̄ ± 1.96·σ/√n" formula: Rigollet derives when and why the Gaussian approximation is valid, what breaks it, and how the delta method extends CIs to nonlinear functions of parameters. The standard graduate statistics reference for CI construction.

- [Blitzstein & Hwang, *Introduction to Probability* (2nd ed.)](http://probabilitybook.net) — Chapter 10 covers confidence intervals with careful frequentist interpretation (the interval is random, the parameter is fixed) and Bayesian credible intervals as an explicit contrast. The comparison between "95% of intervals made this way contain θ" (frequentist) and "95% posterior probability θ is here" (Bayesian) is one of the clearest treatments in any textbook. Essential for a master's-bound learner who will encounter both.

- [MIT 18.05 Introduction to Probability and Statistics, Spring 2022 — Readings](https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/) — The MIT undergraduate probability and statistics course that precedes 18.650. Its readings on frequentist inference, confidence intervals, and the difference from Bayesian credible intervals are freely available and are the most careful pedagogical treatment of the "what is random?" question the lesson correctly addresses but where many students remain confused.

### Watch

- [Confidence Intervals, Clearly Explained!!!](https://www.youtube.com/watch?v=TqOeMYtOc1w) (StatQuest / Josh Starmer) — Starmer's clearest explanation of the frequentist interpretation: the interval is an arrow, the parameter is the target, and "95% confidence" describes the arrow-making machine across many experiments — not this one interval. Explicitly shows the bootstrap as an alternative to the Gaussian formula. Best intuition video for the core conceptual confusion the lesson addresses; the procedure-vs-realization distinction is made vivid.

- [MIT 18.650 Lecture 3: Parametric Inference](https://www.youtube.com/watch?v=TSkDZbGS94k) (MIT OCW / Philippe Rigollet, ~50 min) — Derives confidence intervals from the asymptotic normality of the MLE, introduces the delta method for CIs on nonlinear parameter functions, and discusses coverage. The formal graduate-level treatment that answers why the formula works, not just how to use it. Covers bootstrap CIs as the non-parametric alternative.

- [Harvard Stat 110 Lecture 4: Conditional Probability](https://www.youtube.com/watch?v=P7NE4WF8j-Q) (Harvard Stat 110 / Joe Blitzstein, ~50 min) — While primarily about conditional probability and Bayes, Blitzstein's careful treatment of "what is random, what is fixed" is the essential foundation for understanding the frequentist interpretation of CIs. His framing — frequentists treat the parameter as a fixed unknown constant while Bayesians treat it as a random variable with a prior — is the clearest in any lecture series.

## Science & depth recommendations (to reach master's level)

- **The Bayesian credible interval contrast is one sentence; it deserves more** → The lesson's deeper card mentions "coverage vs. Bayesian credible interval" but the comparison is cryptic. A credible interval genuinely says "P(θ ∈ [a,b] | data) = 0.95" — a probability statement about the parameter — because θ is treated as a random variable with a prior. The frequentist CI makes no such claim. The practical difference: bootstrap CIs and Gaussian CIs are often numerically similar to credible intervals under flat priors, which is why the distinction is routinely confused. Grounded in Blitzstein & Hwang Ch. 10 and MIT 18.650.

- **Coverage failure modes are untaught** → The lesson correctly states the 95% coverage interpretation but never explains when it fails: correlated samples, heavy-tailed distributions, or an underestimated σ can give "95% CIs" with real coverage of 80% or less. The bootstrap CI is more robust because it resamples the actual data rather than trusting the Gaussian approximation. A one-sentence note — "If your noise isn't Gaussian or your samples are correlated, the stated 95% can be wrong — bootstrap resampling is more robust" — prevents dangerous over-trust. Grounded in MIT 18.650 and Casella & Berger Ch. 9.

- **The delta method for CIs on nonlinear functions is unmentioned** → ML practitioners regularly need CIs on nonlinear parameter functions (e.g., CI on the ratio of two conversion rates, on exp(β) in logistic regression). The delta method — g(θ̂) ± z·|g'(θ̂)|·SE(θ̂) — is the standard tool. Adding a one-card mention ("for nonlinear functions of a parameter, the delta method extends the CI via a first-order approximation") would complete the picture. Grounded in MIT 18.650 Lecture 3 and Rigollet's notes.

- **"95% of data falls inside the interval" misconception is not explicitly addressed** → The quiz does not include a question targeting this specific error (confusing a CI for the mean with a prediction interval for raw data). A CI for μ shrinks like 1/√n; an interval containing 95% of raw data does not shrink this way. Adding a quiz question distinguishing these would address one of the most common practical misuses of CIs in ML benchmark reporting. Grounded in MIT 18.05 readings.

## Sources

- https://ocw.mit.edu/courses/18-650-statistics-for-applications-fall-2016/335fd85c0a2ecffc49c781502b3d9b95_MIT18_650F16_Parametric_Inf.pdf — MIT 18.650 (graduate statistics course; Rigollet parametric inference notes including CIs and delta method; confirmed live via OCW)
- http://probabilitybook.net — Blitzstein & Hwang *Introduction to Probability* 2nd ed. (canonical text; Harvard Stat 110 textbook; Ch. 10 on CIs and credible intervals; free online)
- https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/ — MIT 18.05 (canonical MIT probability/statistics course; frequentist CI interpretation readings; freely available)
- https://www.youtube.com/watch?v=TqOeMYtOc1w — StatQuest (high-quality explainer; Starmer "Confidence Intervals, Clearly Explained!!!"; confirmed live)
- https://www.youtube.com/watch?v=TSkDZbGS94k — MIT OCW 18.650 (graduate statistics lecture; Rigollet Lecture 3: Parametric Inference covering CIs; confirmed live)
- https://www.youtube.com/watch?v=P7NE4WF8j-Q — Harvard Stat 110 (canonical course lecture; Blitzstein Lecture 4: Conditional Probability, foundational for "what is random?"; confirmed live)
