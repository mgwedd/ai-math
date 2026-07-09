# ml-logodds — Log-Odds & the Sigmoid Link

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [CS229 Lecture Notes (Ng & Ma, 2023) — §7 "Generalized Linear Models (GLMs)"](https://cs229.stanford.edu/main_notes.pdf) — Derives logistic regression as a GLM by showing that the Bernoulli distribution belongs to the exponential family, so the logit is the natural (canonical) link function; establishes why the sigmoid is not arbitrary but is forced by the distributional family. The authoritative graduate-level source.
- [CMU Advanced Methods: Generalized Linear Models — Ryan Tibshirani (36-402)](https://www.stat.cmu.edu/~ryantibs/advmethods/notes/glm.pdf) — Rigorous lecture notes covering the three-component GLM structure (distribution, linear predictor, link function), with the canonical logit link derived for Bernoulli data; free PDF from a top-tier statistics department.
- [ESL §4.4 "Logistic Regression" and §4.1–4.3 (Hastie, Tibshirani, Friedman)](https://hastie.su.domains/ElemStatLearn/) — Connects log-odds directly to the LDA decision boundary and shows that linear discriminant analysis produces logistic regression likelihoods under Gaussian class conditionals — deepening the "why logit" story beyond the link-function argument.

### Watch
- [Locally Weighted & Logistic Regression — CS229 Lecture 3 (Autumn 2018)](https://www.youtube.com/watch?v=het9HFqo1TQ) (Stanford CS229, ~80 min) — Ng explicitly walks through the log-odds interpretation of the linear score z and motivates the sigmoid as the inversion of the logit; the graduate-level companion to this lesson.
- [StatQuest: Logistic Regression](https://youtu.be/yIYKR4sgzI8) (StatQuest / Josh Starmer, ~9 min) — The best short-form video connecting odds, log-odds, and the sigmoid graphically; ideal for building intuition before the formal GLM derivation.

## Science & depth recommendations (to reach master's level)

- **The exponential-family / GLM derivation is the real "why."** The lesson says the sigmoid "isn't arbitrary" because it's the inverse logit, but the deeper reason is that the logit is the *canonical link* for the Bernoulli exponential family — the link that makes the sufficient statistics match the natural parameters. Adding one sentence: "The logit is the canonical link for Bernoulli data because it is the natural parameter of the Bernoulli exponential family" would satisfy a mathematically trained reader. Grounded in: CS229 §7, CMU 36-402 GLM notes.
- **The odds-ratio interpretation deserves a worked example.** The lab shows the 50/50 boundary but doesn't demonstrate the multiplicative odds-ratio reading: if w = ln(2) ≈ 0.69, one unit of x doubles the odds regardless of the starting probability. A concrete table (p = 0.1 → 0.18, p = 0.5 → 0.67, p = 0.9 → 0.947) would make the non-linearity on the probability scale vivid. Grounded in: standard epidemiology / GLM texts (McCullagh & Nelder, 1989).
- **Softmax derivation deserves more than a sentence.** The deeper card says "two classes collapses to sigmoid" but doesn't show it. A one-line algebra chain (softmax with two classes, subtract log(p_2), simplify) showing the collapse is the proof that the entire multi-class output head reduces to binary logistic regression in the special case. Grounded in: CS229 §7.4, ESL §4.4.

## Sources
- [CS229 Lecture Notes (Ng & Ma)](https://cs229.stanford.edu/main_notes.pdf) — Stanford course, canonical text; §7 on GLMs.
- [CMU 36-402 GLM notes (Ryan Tibshirani)](https://www.stat.cmu.edu/~ryantibs/advmethods/notes/glm.pdf) — peer-reviewed-quality graduate lecture notes.
- [ESL — The Elements of Statistical Learning, 2nd ed. (free PDF)](https://hastie.su.domains/ElemStatLearn/) — canonical text (Hastie, Tibshirani, Friedman).
- [Stanford CS229 Lecture 3 (Autumn 2018)](https://www.youtube.com/watch?v=het9HFqo1TQ) — Stanford CS229 official lecture.
- [StatQuest: Logistic Regression](https://youtu.be/yIYKR4sgzI8) — best-in-class short explainer (StatQuest / Josh Starmer).
- [McCullagh & Nelder (1989) "Generalized Linear Models," 2nd ed.](https://www.routledge.com/Generalized-Linear-Models/McCullagh-Nelder/p/book/9780412317606) — canonical GLM textbook (Chapman & Hall); the foundational reference for link functions.
