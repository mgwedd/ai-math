# ml-logreg — Logistic Regression: Maximum Likelihood

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [CS229 Lecture Notes (Ng & Ma, 2023) — §1 "Logistic regression" and the GLM section](https://cs229.stanford.edu/main_notes.pdf) — Derives the logistic regression model from Bernoulli MLE first principles, shows the gradient is (p − y)·x, proves convexity, and connects the model to the exponential family / GLM framework; the authoritative graduate treatment.
- [ESL §4.4 "Logistic Regression" (Hastie, Tibshirani, Friedman)](https://hastie.su.domains/ElemStatLearn/) — The standard graduate textbook chapter: maximum likelihood estimation, Newton-Raphson (IRLS), multi-class generalization to softmax, and the connection to discriminant analysis; free PDF at the linked page.

### Watch
- [StatQuest: Logistic Regression](https://youtu.be/yIYKR4sgzI8) (StatQuest / Josh Starmer, ~9 min) — Builds intuition for why the sigmoid fits a probability to a binary outcome; the best first-watch before the MLE derivation.
- [Logistic Regression Details Pt 2: Maximum Likelihood](https://youtu.be/BfKanl1aSG0) (StatQuest / Josh Starmer, ~9 min) — Walks through the log-likelihood maximization for logistic regression step by step, making the NLL = cross-entropy connection concrete; the single best video on why log loss is the right objective.
- [Locally Weighted & Logistic Regression — CS229 Lecture 3 (Autumn 2018)](https://www.youtube.com/watch?v=het9HFqo1TQ) (Stanford CS229, ~80 min) — Andrew Ng's lecture deriving logistic regression from MLE, motivating the sigmoid, and arriving at the gradient update; canonical graduate-level depth.

## Science & depth recommendations (to reach master's level)

- **Gradient saturation under squared error is understated.** The deeper card mentions that squared-error pairs "badly" with the sigmoid but doesn't name the mechanism precisely: when a point is confidently wrong, the sigmoid is near its flat tail, so `(σ(z) − y)² · σ'(z)` → 0 — gradient vanishes exactly where the model most needs to correct itself. Cross-entropy's gradient `(p − y)·x` has no sigmoid factor and never saturates this way. Grounding this with the actual formula deepens the "why NLL and not MSE" answer. Grounded in: CS229 notes §1, ESL §4.4.
- **Convexity claim should be stated with a proof sketch.** The deeper card says NLL is convex but offers no support. A one-line argument (Hessian = X^T W X with W = diag(p_i(1−p_i)) ≥ 0) makes the claim falsifiable and shows that the positive-semidefiniteness comes from the sigmoid's bounded derivative. Grounded in: CS229 notes, ESL §4.4.3.
- **Multi-class softmax connection is hinted in ml-logodds but belongs here too.** The lesson teaches the binary case; adding a one-sentence note that the multi-class generalization replaces the single sigmoid with a softmax over K linear scores bridges directly to neural network output layers. Grounded in: CS229 notes §1 (multi-class), ESL §4.4.

## Sources
- [CS229 Lecture Notes (Ng & Ma)](https://cs229.stanford.edu/main_notes.pdf) — Stanford course, canonical text.
- [ESL — The Elements of Statistical Learning, 2nd ed. (free PDF)](https://hastie.su.domains/ElemStatLearn/) — canonical text (Hastie, Tibshirani, Friedman).
- [StatQuest: Logistic Regression](https://youtu.be/yIYKR4sgzI8) — best-in-class short explainer (StatQuest / Josh Starmer).
- [StatQuest: Logistic Regression Details Pt 2: Maximum Likelihood](https://youtu.be/BfKanl1aSG0) — best-in-class MLE explainer (StatQuest / Josh Starmer).
- [Stanford CS229 Lecture 3 (Autumn 2018)](https://www.youtube.com/watch?v=het9HFqo1TQ) — Stanford CS229 official lecture.
