# stat-perm — Hypothesis Testing & p-values

## Dig Deeper appendix (curated — graduate-authoritative)

### Read

- [MIT 18.650 Ch. 5: Parametric Hypothesis Testing Lecture Notes (PDF)](https://ocw.mit.edu/courses/18-650-statistics-for-applications-fall-2016/11b4116aa55b4e0288141bd40a39104f_MIT18_650F16_Parametric_HT.pdf) — Rigollet's 22-page graduate lecture notes on hypothesis testing: null and alternative hypotheses, Type I/II errors, level and power, the Neyman–Pearson lemma, likelihood ratio tests, and p-values under parametric assumptions. The definitive graduate-level treatment that situates the lesson's permutation test in the broader context of hypothesis testing theory. MIT 18.650 is the standard entry-level graduate statistics course for ML researchers.

- [Blitzstein & Hwang, *Introduction to Probability* (2nd ed.)](http://probabilitybook.net) — Chapter 10 covers hypothesis testing (frequentist framework) with careful treatment of Type I/II errors, significance levels, and the distinction between statistical significance and effect size. The comparison with Bayesian reasoning (posterior probability vs. p-value) is particularly important for ML practitioners. The clearest textbook treatment of why p-values cannot be interpreted as "probability the null is true."

- [Permutation test — Wikipedia](https://en.wikipedia.org/wiki/Permutation_test) — Authoritative summary of the permutation test framework: exact p-values when all permutations are enumerated, Monte Carlo approximation when they're not, assumptions (exchangeability under H₀), and comparison with parametric alternatives. The graduate-level justification for the lesson's central claim that "shuffling labels simulates H₀." Includes the theoretical basis: under H₀ the joint distribution is invariant to label permutations (exchangeability).

- [CS229 Notes — Generalization and Hypothesis Testing](https://cs229.stanford.edu/main_notes.pdf) — The Stanford graduate ML notes cover hypothesis testing in the context of model comparison: permutation tests for comparing two models on a shared test set, bootstrap confidence intervals for metric differences, and multiple comparisons in benchmark evaluation. The canonical applied reference for the A/B testing and model comparison use cases in the lesson's `ml` block.

### Watch

- [What Is A P-Value? — Clearly Explained](https://www.youtube.com/watch?v=ukcFrzt6cHk) (StatQuest / Josh Starmer) — Starmer's most-referenced video on p-values: what a p-value actually measures (how surprising the data is under H₀), the most common misinterpretations (it is not P(H₀ is true)), and the connection to significance thresholds. Best intuition-builder for the lesson's core misconception-prevention goal. Directly complements the lesson's "the p-value is a rarity score, not a truth probability" deeper card.

- [Lecture 7: Parametric Hypothesis Testing (MIT 18.650)](https://www.youtube.com/watch?v=ERbXwsrNhhE) (MIT OCW / Philippe Rigollet, ~50 min) — Graduate lecture: Type I and Type II errors, power functions, the Neyman–Pearson lemma, and the likelihood ratio test. Situates the lesson's permutation test in the parametric hypothesis testing framework and explains the mathematical basis for why 0.05 as a threshold is arbitrary (Rigollet's treatment of level vs. power is particularly clear). Essential for understanding what the permutation test is approximating.

- [False Discovery Rates, FDR, clearly explained](https://www.youtube.com/watch?v=L3nlGfSyHV0) (StatQuest / Josh Starmer) — Covers the multiple comparisons problem (p-hacking) and Benjamini–Hochberg FDR control. Directly relevant to the lesson's deeper card on "p-hacking / multiple comparisons" — but the lesson only mentions it without teaching the correction. This video is the best available explainer for why FDR control is the right tool and how it works, directly extending what the lesson introduces.

## Science & depth recommendations (to reach master's level)

- **Type I and Type II errors are unmentioned** → The lesson teaches p-values and the null hypothesis but never introduces the vocabulary of Type I error (false positive: rejecting H₀ when it's true; rate = α = significance level) and Type II error (false negative: failing to reject when H₀ is false; rate = β). Power = 1 − β. These are the essential vocabulary for understanding why a 0.05 threshold is a design choice, not a mathematical law. Grounded in MIT 18.650 Ch. 5 and Blitzstein & Hwang Ch. 10.

- **Effect size should be computed, not just mentioned** → The lesson's deeper card mentions "always report the effect size and its interval alongside p" but the lab only outputs the p-value. Computing Cohen's d = (μ_treat − μ_ctrl) / σ_pooled for the fixed dataset and displaying it alongside the p-value would make this concrete. With the lesson's fixed data (TREAT ≈ 7.5, CTRL ≈ 6.3, σ ≈ 0.65), Cohen's d ≈ 1.8 — a large effect size — which would illustrate that the effect is both statistically significant AND practically large, grounding the distinction. Grounded in CS229 notes and standard effect size reporting practice.

- **Exchangeability is the correct formal assumption, not "same distribution"** → The lesson states H₀ as "both groups are draws from the same distribution" — which is sufficient but not necessary. The permutation test's correct assumption is exchangeability under H₀: the joint distribution of all observations is invariant to relabeling. This is weaker (and more general) than "same distribution." For a graduate learner who will apply permutation tests to more complex settings (paired data, blocks), knowing the actual assumption matters. Grounded in the Permutation Test Wikipedia article and Casella & Berger Ch. 10.

- **The FDR / multiple comparisons problem is mentioned but uncorrected** → The deeper card correctly identifies p-hacking as running 20 tests at α = 0.05. But the correction — Bonferroni (divide α by number of tests) or Benjamini–Hochberg FDR (controls expected proportion of false discoveries) — is left unnamed. The StatQuest FDR video directly fills this gap. For ML practitioners doing hyperparameter searches or benchmark comparisons, FDR control is the operationally relevant tool. Grounded in Blitzstein & Hwang Ch. 10.

## Sources

- https://ocw.mit.edu/courses/18-650-statistics-for-applications-fall-2016/11b4116aa55b4e0288141bd40a39104f_MIT18_650F16_Parametric_HT.pdf — MIT 18.650 (graduate statistics course; Rigollet hypothesis testing lecture notes, 22 pages; confirmed live via OCW)
- http://probabilitybook.net — Blitzstein & Hwang *Introduction to Probability* 2nd ed. (canonical text; Ch. 10 on hypothesis testing, p-values, Type I/II errors; free online)
- https://en.wikipedia.org/wiki/Permutation_test — Wikipedia (authoritative reference; permutation test theory, exchangeability, Monte Carlo approximation; confirmed live)
- https://cs229.stanford.edu/main_notes.pdf — Stanford CS229 (canonical graduate ML notes; model comparison, permutation tests, bootstrap; freely available)
- https://www.youtube.com/watch?v=ukcFrzt6cHk — StatQuest (high-quality explainer; "What Is A P-Value? — Clearly Explained"; confirmed live)
- https://www.youtube.com/watch?v=ERbXwsrNhhE — MIT OCW 18.650 (graduate statistics lecture; Rigollet Lecture 7: Parametric Hypothesis Testing; confirmed live)
- https://www.youtube.com/watch?v=L3nlGfSyHV0 — StatQuest (high-quality explainer; "False Discovery Rates, FDR, clearly explained"; directly extends lesson's multiple-comparisons card; confirmed live)
