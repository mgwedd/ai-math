# ml-eval — Evaluation: Beyond Accuracy

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [ESL §7.2 "Bias, Variance and Model Complexity" and §7.10 "Cross-Validation" (Hastie, Tibshirani, Friedman)](https://hastie.su.domains/ElemStatLearn/) — Places evaluation metrics in the broader context of model selection: why test-set estimation matters, how cross-validation relates to the confusion-matrix metrics, and the statistical treatment of AUC as a ranking statistic. Free PDF at the linked page.
- [Google ML Crash Course — Classification: ROC and AUC](https://developers.google.com/machine-learning/crash-course/classification/roc-and-auc) — Practical, interactive explainer from Google's production ML education; covers ROC definition, AUC as rank-probability, threshold selection, and when to prefer PR curves over ROC for imbalanced data; includes interactive exercises.
- [Davis & Goadrich (2006) "The Relationship Between Precision-Recall and ROC Curves," ICML](https://dl.acm.org/doi/10.1145/1143844.1143874) — The peer-reviewed paper proving that a classifier dominates on ROC if and only if it dominates on PR; establishes why PR-AUC and ROC-AUC are both needed and when each is the right choice for imbalanced problems.

### Watch
- [ROC and AUC, Clearly Explained!](https://youtu.be/4jRBRDbJemM) (StatQuest / Josh Starmer, ~14 min) — The single best video explanation of the ROC curve: sweeps the threshold, shows TPR vs. FPR live, defines AUC as the ranking probability, and debunks the "area" confusion. Directly mirrors what the lesson's lab visualizes.
- [The Sensitivity, Specificity, Precision, Recall Sing-a-Long!!!](https://youtu.be/PWvfrTgaPBI) (StatQuest / Josh Starmer, ~6 min) — Mnemonics and worked examples for the four confusion-matrix rates; memorable and accurate; ideal supplement to the lab's precision/recall readout.

## Science & depth recommendations (to reach master's level)

- **PR-AUC vs. ROC-AUC distinction deserves explicit treatment.** The lesson mentions both precision-recall and ROC curves in the deeper card but does not explain when each is more informative. Under heavy imbalance, ROC-AUC stays high because the denominator of FPR is dominated by the large negative class — the curve looks rosy even for a poor model. PR-AUC is sensitive to imbalance and is the honest benchmark for rare-event detection (fraud, disease, safety). Grounded in: Davis & Goadrich (2006); Google ML Crash Course classification module.
- **AUC as the Wilcoxon-Mann-Whitney statistic (rank probability) is missing.** The lesson describes AUC as "area under the curve" but the probabilistic interpretation — P(score(positive) > score(negative)) — is far more useful: it tells you exactly what AUC measures operationally. This is also why AUC is threshold-free and why it equals 0.5 for a random classifier regardless of imbalance. Grounded in: Fawcett (2006), "An introduction to ROC analysis," *Pattern Recognition Letters* 27:861–874.
- **F1 as the harmonic mean should be motivated more carefully.** The deeper card names F1 but doesn't explain why harmonic (not arithmetic) mean: the harmonic mean of precision and recall is 0 if either is 0, which forces the model to not be useless on either dimension. The arithmetic mean does not have this property. Grounded in: standard classification literature.
- **The confusion matrix itself is unnamed in the lesson.** The lesson shows TP/FP/TN/FN counts in the lab readout but never calls the 2×2 table a "confusion matrix." Naming it and noting that all binary classification metrics are derived from it sets up the learner to read model cards, sklearn docs, and leaderboards correctly. Grounded in: ESL §7, Google ML Crash Course.
- **Calibration is absent.** A model can have high AUC yet be badly calibrated (predicted p=0.9 actually fires 50% of the time). For applications like medical screening or fraud alerts, calibration matters as much as ranking. A one-sentence note connecting the lesson's probability outputs to calibration (Platt scaling, isotonic regression) rounds out the "beyond accuracy" theme. Grounded in: Platt (1999), Niculescu-Mizil & Caruana (2005).

## Sources
- [ESL — The Elements of Statistical Learning, 2nd ed. (free PDF)](https://hastie.su.domains/ElemStatLearn/) — canonical text (Hastie, Tibshirani, Friedman).
- [Google ML Crash Course: Classification — ROC and AUC](https://developers.google.com/machine-learning/crash-course/classification/roc-and-auc) — high-quality interactive explainer (Google Developers).
- [Davis & Goadrich (2006) "The Relationship Between Precision-Recall and ROC Curves," ICML](https://dl.acm.org/doi/10.1145/1143844.1143874) — peer-reviewed; establishes when PR vs. ROC is appropriate.
- [StatQuest: ROC and AUC, Clearly Explained!](https://youtu.be/4jRBRDbJemM) — best-in-class video explainer (StatQuest / Josh Starmer).
- [StatQuest: The Sensitivity, Specificity, Precision, Recall Sing-a-Long!!!](https://youtu.be/PWvfrTgaPBI) — best-in-class mnemonic explainer (StatQuest / Josh Starmer).
