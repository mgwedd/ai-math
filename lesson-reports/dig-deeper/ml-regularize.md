# ml-regularize — Regularization as Priors

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [CS229 Lecture Notes (Ng & Ma, 2023) — §6 "Bayesian statistics and regularization"](https://cs229.stanford.edu/main_notes.pdf) — Derives the MAP-regularization equivalence formally: shows that a Gaussian prior N(0, τ²I) on weights produces L2 regularization and a Laplace prior produces L1; the canonical graduate derivation.
- [Tibshirani (1996) "Regression Shrinkage and Selection via the Lasso" — JRSSB 58:267–288](https://www.scirp.org/reference/referencespapers?referenceid=3572855) — The seminal paper introducing L1 regularization for regression (lasso); establishes sparsity as the key feature distinguishing L1 from L2 and remains the foundational reference for feature selection via penalization. (Full text accessible via institutional library or the author's Stanford page.)
- [ESL §3.4 "Shrinkage Methods" (Hastie, Tibshirani, Friedman)](https://hastie.su.domains/ElemStatLearn/) — The graduate textbook treatment: ridge regression as SVD shrinkage, lasso as constrained-optimization geometry (the diamond corner story), elastic net, and cross-validation for λ; free PDF at the linked page.

### Watch
- [Regularization Part 1: Ridge (L2) Regression](https://youtu.be/Q81RR3yKn30) (StatQuest / Josh Starmer, ~20 min) — Builds the ridge penalty from first principles, shows smooth-shrinkage behavior, and visualizes the bias-variance tradeoff; the clearest introductory video on L2.
- [Regularization Part 2: Lasso (L1) Regression](https://youtu.be/NGf0voTMlcs) (StatQuest / Josh Starmer, ~8 min) — Explains why lasso drives coefficients to exactly zero (the diamond corner geometry) while ridge never does; paired with Ridge vs Lasso Visualized for a complete picture.
- [Ridge vs Lasso Regression, Visualized!!!](https://youtu.be/Xm2C_gTAl8c) (StatQuest / Josh Starmer, ~10 min) — Side-by-side geometric visualization of the circular (L2) vs. diamond (L1) constraint contours; the most concise explanation of why L1 produces exact zeros.

## Science & depth recommendations (to reach master's level)

- **The geometric / KKT explanation of L1 sparsity could be tightened.** The lesson describes the diamond corner qualitatively but doesn't mention that L1 is non-differentiable at zero — the subdifferential at zero contains 0 — which is the precise reason the optimizer can satisfy the KKT conditions with a weight exactly at 0, whereas L2's smooth gradient at w=0 is 0 only when the NLL gradient is also exactly 0 (which it never is except at the optimum). A one-sentence addition: "L1 is non-differentiable at zero; the subdifferential includes 0, which is why the constraint is satisfied at the corner." Grounded in: ESL §3.4.4.
- **Cross-validation for λ is absent.** The lesson treats λ as given, but choosing it is the central practical task. A brief note that λ is selected by cross-validation on the validation set (not the test set) closes a gap between theory and practice. Grounded in: CS229 notes §6, ESL §3.4.3.
- **Elastic net is unmentioned.** A note that Elastic Net combines L1+L2 (grouping correlated features while still selecting) completes the taxonomy, especially because ElasticNet is common in practice (scikit-learn default for many penalized models). Grounded in: Zou & Hastie (2005), *JRSSB* 67:301–320.
- **AdamW / weight decay in deep learning.** The lesson's `ml` callout mentions weight decay but doesn't spell out that modern optimizers (AdamW) implement decoupled weight decay, not the naive L2 penalty folded into the gradient — these differ for adaptive-rate optimizers. A sentence distinguishing them would prevent a common confusion. Grounded in: Loshchilov & Hutter, "Decoupled Weight Decay Regularization" (arXiv:1711.05101).

## Sources
- [CS229 Lecture Notes (Ng & Ma)](https://cs229.stanford.edu/main_notes.pdf) — Stanford course, canonical text.
- [Tibshirani (1996) JRSSB — seminal lasso paper](https://www.scirp.org/reference/referencespapers?referenceid=3572855) — peer-reviewed, foundational.
- [ESL — The Elements of Statistical Learning, 2nd ed. (free PDF)](https://hastie.su.domains/ElemStatLearn/) — canonical text (Hastie, Tibshirani, Friedman).
- [StatQuest: Regularization Part 1: Ridge (L2)](https://youtu.be/Q81RR3yKn30) — best-in-class explainer (StatQuest / Josh Starmer).
- [StatQuest: Regularization Part 2: Lasso (L1)](https://youtu.be/NGf0voTMlcs) — best-in-class explainer (StatQuest / Josh Starmer).
- [StatQuest: Ridge vs Lasso Visualized](https://youtu.be/Xm2C_gTAl8c) — best-in-class geometric visualization (StatQuest / Josh Starmer).
- [Aman.ai CS229 Regularization notes](https://aman.ai/cs229/regularization/) — annotated notes covering Bayesian MAP derivation.
