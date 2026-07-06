# ml-learning — What Learning Is: Fit & Overfit

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [CS229 Lecture Notes (Ng & Ma, 2023) — §4 "The bias-variance tradeoff" and §5 "Double descent"](https://cs229.stanford.edu/main_notes.pdf) — The canonical graduate-level treatment: derives the bias-variance decomposition formally and explicitly names the double-descent regime for overparameterized models; the PDF is maintained by Stanford and updated regularly.
- [Belkin et al. (2019) "Reconciling modern machine-learning practice and the classical bias–variance trade-off" — PNAS](https://arxiv.org/abs/1812.11118) — The peer-reviewed paper that coined "double descent" and showed a unified performance curve spanning classical and overparameterized regimes; essential for understanding why the U-curve is regime-specific, not universal.
- [MLU-Explain: Bias–Variance Tradeoff (Wilber & Werness, Amazon, 2021)](https://mlu-explain.github.io/bias-variance/) — Interactive visual explainer: sweeps LOESS smoothness and KNN's k to animate the bias-variance decomposition live; the clearest visual demonstration of the U-curve available online.
- [MLU-Explain: Double Descent (2021)](https://mlu-explain.github.io/double-descent/) — Two-part visual essay that walks through the interpolation threshold and the second descent; directly extends the U-curve story into the modern overparameterized regime that the lesson's deeper card only hints at.

### Watch
- [Machine Learning Fundamentals: Bias and Variance](https://youtu.be/EuBBz3bI-aA) (StatQuest with Josh Starmer, ~6 min) — The clearest short-form visual explanation of bias and variance as distinct error sources; builds intuition for the "too rigid vs. too variable" framing before the math.
- [Stanford CS229 Lecture 10 — Bias/Variance, Regularization (2022)](https://www.youtube.com/watch?v=7AQYw5FOVcw) (Stanford CS229, ~75 min) — Andrew Ng's full lecture deriving the bias-variance decomposition, connecting it to regularization, and contextualizing the double-descent regime; the graduate-level companion to the written notes.

## Science & depth recommendations (to reach master's level)

- **The train/validation/test three-way split is absent.** The lesson uses "test data" for both hyperparameter selection (sweeping degree) and final evaluation — conflating validation and test sets. A master's-bound learner must know that the data used to pick model complexity is a *validation* set, not a virgin test set; reporting the best validation error as a final score produces optimistically biased benchmarks. Add a brief paragraph or a third color-coded point cloud (val) to the lab. Grounded in: Goodfellow, Bengio & Courville *Deep Learning* §5.3, and CS229 notes §4.
- **Sample size as the other axis.** Overfitting depends on the ratio of capacity to sample size, not capacity alone. A degree-5 polynomial overfits 6 points but generalizes fine on 600. A second "n_train" slider in the lab (sampling from the same underlying curve) would make this viscerally clear and sets up regularization as "effective capacity reduction." Grounded in: CS229 learning theory notes (aman.ai mirror) — sample complexity scales as O(√(k/m)).
- **The U-curve caveat is missing.** The deeper card presents the U-shaped bias-variance tradeoff as universal. A single sentence acknowledging that massively overparameterized networks exhibit double descent — test error re-descending past the interpolation threshold — prevents the learner from carrying a wrong mental model into any DL context. Grounded in: Belkin et al. (2019), arXiv:1812.11118.
- **"Memorizes noise" is incomplete as the sole cause of overfitting.** Even noiseless data has a train/test gap when model complexity outpaces sample size (the variance component). Naming the two sub-causes — fitting label noise vs. fitting the particular sample — gives the learner the vocabulary to distinguish them. Grounded in: bias-variance decomposition in CS229 §4.

## Sources
- [CS229 Lecture Notes (Ng & Ma)](https://cs229.stanford.edu/main_notes.pdf) — Stanford course, canonical text; updated 2023.
- [Belkin et al. (2019), arXiv:1812.11118](https://arxiv.org/abs/1812.11118) — peer-reviewed (PNAS); seminal double-descent paper.
- [MLU-Explain: Bias–Variance Tradeoff](https://mlu-explain.github.io/bias-variance/) — high-quality interactive explainer (Amazon MLU).
- [MLU-Explain: Double Descent](https://mlu-explain.github.io/double-descent/) — high-quality interactive explainer (Amazon MLU).
- [StatQuest: Machine Learning Fundamentals: Bias and Variance](https://youtu.be/EuBBz3bI-aA) — best-in-class short explainer (StatQuest / Josh Starmer).
- [Stanford CS229 Lecture 10 (2022) — Bias/Variance, Regularization](https://www.youtube.com/watch?v=7AQYw5FOVcw) — Stanford CS229 official lecture.
- [Aman.ai CS229 Learning Theory mirror](https://aman.ai/cs229/learning-theory/) — high-quality annotated notes; covers formal sample-complexity bounds.
