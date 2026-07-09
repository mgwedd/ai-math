# prob-bayes — Bayes' Theorem: Updating Beliefs

## Dig Deeper appendix (curated — graduate-authoritative)

### Read

- [Bayes' theorem — 3Blue1Brown written lesson](https://www.3blue1brown.com/lessons/bayes-theorem/) — Grant Sanderson's full geometric-area treatment of Bayes. Derives the formula from representative-population reasoning (the same approach the lesson's lab uses), introduces the Kahneman–Tversky base-rate neglect research, and connects to ML. Authoritative because it is the canonical visual reference and accompanies two standalone videos.

- [MIT 6.041SC Lecture 2: Conditioning and Bayes' Rule — lecture page with notes](https://ocw.mit.edu/courses/6-041sc-probabilistic-systems-analysis-and-applied-probability-fall-2013/pages/unit-i/lecture-2/) — Prof. Tsitsiklis's 51-minute rigorous treatment covering conditional probability, the multiplication rule, total-probability theorem, and Bayes' rule. Includes PDF slides and recitation problems (Monty Hall, coin puzzles). Canonical MIT undergraduate probability course (6.041SC), widely used as a graduate reference for the formal foundations.

- [Blitzstein & Hwang, *Introduction to Probability* (2nd ed.) — free online edition](http://probabilitybook.net) — The textbook behind Harvard Stat 110. Chapter 2 (Conditional Probability) derives Bayes' theorem with the LOTP and works through medical diagnosis, the prosecutor's fallacy, and conjugate priors. Chapter 8 covers Bayesian inference. The free online 2nd edition is the most pedagogically rigorous undergraduate/graduate text on Bayesian reasoning available freely; Blitzstein's treatment of the transposed conditional is definitive.

- [Goodfellow, Bengio & Courville, *Deep Learning* Ch. 3 — Probability and Information Theory](https://www.deeplearningbook.org/contents/prob.html) — Section 3.9 on Bayes' rule and its use in defining posterior distributions over parameters is the canonical ML reference for connecting Bayesian reasoning to model inference. Authoritative as the standard graduate deep-learning textbook (freely hosted by the authors).

### Watch

- [Bayes theorem, the geometry of changing beliefs](https://www.youtube.com/watch?v=HZGCoVF3YvM) (3Blue1Brown, ~15 min) — Derives Bayes by dividing areas in a probability rectangle — the visual that makes the formula inevitable rather than memorized. Best-in-class for geometric intuition; referenced by the lesson's population-strip approach.

- [The medical test paradox, and redesigning Bayes' rule](https://www.youtube.com/watch?v=lG4VkPoG3ko) (3Blue1Brown, ~21 min) — Takes the disease/test scenario from the lesson and extends it to Bayes factors (likelihood ratios), showing how to redesign the intuition around odds. Directly relevant: covers exactly the false-positive problem the lesson's lab demonstrates, then goes further.

- [Lecture 4: Conditional Probability | Statistics 110](https://www.youtube.com/watch?v=P7NE4WF8j-Q) (Harvard Stat 110 / Joe Blitzstein, ~50 min) — The formal probability course treatment: LOTP, Bayes' rule with continuous and discrete cases, sequential updating, and the prosecutor's fallacy by name. Rigorous enough for graduate study; Blitzstein's storytelling makes even the formal proof memorable.

## Science & depth recommendations (to reach master's level)

- **P(E) as the marginal likelihood (LOTP) is unnamed** → Add one sentence after the formula: "P(E) = P(E|H)·P(H) + P(E|¬H)·P(¬H) — the law of total probability summed over all hypotheses, the normalizing constant that forces the posterior to 1." Without this, students cannot understand why computing posteriors is computationally hard in general (e.g., why variational inference exists), grounded in MIT 6.041SC Lecture 2 and Blitzstein Ch. 2.

- **The prosecutor's fallacy / transposed conditional is unnamed** → The lesson correctly identifies the error (P(E|H) ≠ P(H|E)) but never gives it a name. Adding "this is called the prosecutor's fallacy or inverse fallacy" makes the concept retrievable and connects to ML calibration discussions. Grounded in Blitzstein & Hwang Ch. 2 and the 3Blue1Brown medical-test video.

- **MAP estimation connection is understated** → The lesson should explicitly bridge to MAP: "Maximizing P(θ|data) ∝ P(data|θ)·P(θ) is Bayes applied to parameters. A Gaussian prior produces L2 (weight decay); a Laplace prior produces L1. This is why regularization is not a hack — it is a Bayesian prior." The prob-mle lesson mentions MAP but the derivation belongs here. Grounded in Goodfellow Ch. 3 and Blitzstein Ch. 8.

- **The odds-form card skips the odds-to-probability conversion** → "Posterior odds ≈ 20:99 ≈ 17%" skips the step P = odds/(1+odds). A graduate learner using the odds form in practice will need to convert back. Add the explicit step: "odds 20:99 → P = (20/99)/(1+20/99) ≈ 0.168 ≈ 17%." Grounded in the odds-form section of Blitzstein Ch. 2.

- **Specificity slider minimum of 90% hides the most dramatic regime** → At specificity 80%, sensitivity 99%, prevalence 1%, the posterior is ~4.7% — 95% of positives are false alarms. Lowering the specificity floor to 75% would let learners find the most visceral failure mode, grounded in the lesson's own Bayesian arithmetic.

## Sources

- https://www.3blue1brown.com/lessons/bayes-theorem/ — 3Blue1Brown (high-quality explainer; canonical geometric/area framing, references Kahneman–Tversky)
- https://www.youtube.com/watch?v=HZGCoVF3YvM — 3Blue1Brown YouTube (high-quality explainer; geometric Bayes, ~15 min; confirmed live)
- https://www.youtube.com/watch?v=lG4VkPoG3ko — 3Blue1Brown YouTube (high-quality explainer; Bayes factors and medical test paradox, ~21 min; confirmed live)
- https://ocw.mit.edu/courses/6-041sc-probabilistic-systems-analysis-and-applied-probability-fall-2013/pages/unit-i/lecture-2/ — MIT OCW 6.041SC (canonical MIT probability course; Tsitsiklis Lecture 2 on Conditioning and Bayes' Rule; confirmed live)
- http://probabilitybook.net — Blitzstein & Hwang *Introduction to Probability* 2nd ed. (canonical text; Harvard Stat 110 textbook; free online edition)
- https://www.youtube.com/watch?v=P7NE4WF8j-Q — Harvard Stat 110 Lecture 4: Conditional Probability (canonical text's accompanying lecture; Blitzstein, ~50 min; confirmed live)
- https://www.deeplearningbook.org/contents/prob.html — Goodfellow et al. *Deep Learning* Ch. 3 (canonical graduate ML text; Bayes' rule in Ch. 3.9, MAP in Ch. 5.7; freely hosted)
