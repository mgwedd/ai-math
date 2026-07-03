# Curriculum Review & Recommendations

*Written from the perspective of a graduate ML/math professor evaluating
Gradient Ascent as preparation for an MS/PhD-track AI program. Reviewed at
commit `e336b03` — 40 lessons across 5 worlds, per-lesson audit in
`lesson-reports/`.*

---

## 1. Overall assessment

**What this curriculum gets right is rare and worth protecting.** Most "math
for ML" resources are either passive video or notation-first textbooks. This
one is built on three sound learning-science pillars:

1. **Interaction with gated progress** — the missions system forces *doing*
   before advancing (testing effect, active learning).
2. **Misconception-targeted feedback** — `WRONG_WHY` explains not just the
   right answer but *why the tempting wrong answer tempts*. This is the single
   most under-used technique in math education, and it is implemented here per
   distractor. Keep investing in it.
3. **Anchored transfer** — every lesson ends in "why this matters for AI,"
   which is exactly the retrieval cue a learner needs when the concept
   reappears in a paper.

The recent fidelity pass (saddle points vs. local minima, Newton's positive-
curvature requirement, 𝒩(μ,σ²) conventions, scaled attention) moved the
content from "enthusiast-accurate" to "instructor-accurate." That standard
must be maintained: a curriculum that teaches one outdated mental model
(e.g. "training gets stuck in local minima") costs the student more than a
missing lesson would.

**The honest ceiling:** as it stands, this is an excellent *intuition
bootstrap* — roughly the first 40% of the mathematical maturity an MS program
assumes. The gaps are not more sliders; they are (a) missing subject matter
(statistics, multivariable calculus proper, orthogonality/projection,
classical ML), and (b) missing *modes of work* (derivation, computation by
hand, proof, reading/critiquing experiments). Recognition-based multiple
choice, however well-crafted, cannot certify the ability to *produce*
mathematics — and graduate school is a production environment.

Grade as a self-contained artifact: **A−**. Grade as complete MS preparation:
**C+, incomplete by design** — the roadmap already acknowledges this
(items 4–6). The recommendations below turn that acknowledgment into a
concrete syllabus.

---

## 2. Critique by area

### 2.1 Coverage

| Area | State | Gap for a graduate program |
|---|---|---|
| Foundations (W0) | Strong | Add summation *manipulation* (index shifts, double sums) — reading Σ is taught; *rearranging* Σ is what papers demand. |
| Linear algebra (W1) | Good breadth, one structural hole | **No orthogonality/projection lesson.** Projection is the geometric heart of least squares, PCA, Gram–Schmidt/QR, and attention-as-projection intuition. The curriculum invokes PCA twice and least squares once without ever teaching projection. Also missing: positive (semi)definiteness (needed for Hessians, covariance, kernels), norms as a family, trace. |
| Calculus (W2) | Deep in 1-D, thin in n-D | ~90% of the world is single-variable; real ML math is multivariable and matrix-valued from day one. Missing: gradient as *the* linear approximation (total derivative), n-D Taylor, chain rule as Jacobian products (only touched in la-matcalc), **Lagrange multipliers / constrained optimization** (SVMs, RLHF's KL constraint, projected GD). |
| Probability (W3) | Solid first course, missing second half | Missing: **joint / marginal / conditional distributions and (conditional) independence** — the substrate of every graphical model and of the chain rule of probability that defines LLM training. Missing: covariance/correlation (invoked by PCA!), law of total expectation, Markov chains (RL, MCMC), a taste of concentration inequalities (why generalization bounds exist). |
| **Statistics** | **Absent entirely** | The largest single gap. A graduate student must read experiment sections: estimators and their bias/variance, standard errors, confidence intervals, hypothesis tests, multiple comparisons, ablation methodology. Nothing in the curriculum currently distinguishes "the number went up" from "the number went up significantly." |
| Classical ML (W4) | Deep-learning-first | Roadmap item 4 is correctly scoped and should be promoted: logistic regression *as MLE* (ties W3→W4), regularization (L1/L2 as priors), bias–variance quantitatively, trees/ensembles, clustering/EM, kernels at intuition level. An MS curriculum quizzes these before transformers. |
| Information theory | Entropy/KL only | Add cross-entropy = NLL as its own bridging lesson (it is *the* loss), mutual information at intuition level. |
| Numerical computing | Scattered mentions | One dedicated lesson pays for itself: floating point, overflow/underflow, log-sum-exp, conditioning, why we vectorize. The curriculum already teaches the log-trick informally — formalize it. |
| Discrete math | Absent | Light-touch: counting for probability; big-O for the costs that shape architectures (matmul O(n³), attention O(n²·d)). |

### 2.2 Pedagogy

1. **The MCQ ceiling.** Every assessment is 4-option recognition. The
   engine's turnstile (fresh draws, shuffled options) prevents memorization
   *of answers* but cannot elicit *generation*. Bloom's levels above
   "understand/apply" — analyze, evaluate, create — are structurally
   unreachable with the current question type.
2. **Missions can be goodharted.** Several mission checks are satisfiable by
   sweeping a slider until the checkmark fires, without forming the concept.
   Missions that require a *prediction before manipulation* ("set the slider
   to where you think the minimum is, then verify") close this hole cheaply.
3. **Blocked practice only.** Worlds are studied in blocks; there is no
   interleaving or spaced review. Fifty years of retrieval-practice
   literature says this is the biggest free win available (the roadmap's
   spaced-repetition wishlist item should be promoted to a priority).
4. **No cumulative assessment.** Nothing ever tests World 1 material once
   World 2 begins. Graduate qualifying exams are cumulative by design.
5. **No proof literacy.** Correctly acknowledged in roadmap item 6. No
   slider teaches quantifiers, contrapositive, or "show that" — but the
   curriculum can *scaffold* it (see §4.3) even if the real work happens on
   paper.

---

## 3. Recommended modules

Priorities: **P0** = required for credible MS preparation; **P1** = strongly
differentiating; **P2** = enrichment.

### P0 — fill the structural holes

| Module | Lessons | Notes |
|---|---|---|
| **W1: Orthogonality & Projection** | 3 | (a) Orthogonality, projection onto a line/subspace (interactive: drag b, watch its shadow and residual — residual ⟂ column space); (b) Least squares as projection + normal equations (closes the loop opened in pre-slope and la-inverse); (c) Gram–Schmidt/QR at intuition level. |
| **W2: Multivariable calculus proper** | 3 | (a) The gradient as best linear approximation (total derivative; tangent-plane lab); (b) Chain rule with Jacobians (2→2→1 pipeline lab; formalizes la-matcalc); (c) **Lagrange multipliers** (constrained-optimum lab: gradient of objective ∥ gradient of constraint at the tangency — one of the most visualizable theorems in all of calculus). |
| **W3: Joint & conditional structure** | 2–3 | Joint/marginal/conditional with a 2-D heatmap lab (slice = condition, sum = marginalize); independence & conditional independence; covariance/correlation with a draggable point-cloud (feeds PCA back in W1 and sets up Gaussians in n-D). |
| **W3.5 (new world): Statistics & Evidence** | 4 | Estimators (bias/variance of the *estimator* — reuse the CLT lab machinery); confidence intervals (simulation lab: watch 100 CIs, ~95 cover); hypothesis testing & p-values (permutation-test lab — modern, simulation-first, avoids formula soup); reading an ML experiments table (error bars, seeds, multiple comparisons, ablations). |
| **W4: Classical ML** (roadmap item 4, expanded) | 4 | Logistic regression as MLE; regularization as priors (L2↔Gaussian, L1↔Laplace, sparsity lab); trees & ensembles (stump-forest lab); evaluation methodology (precision/recall/ROC threshold slider). |
| **W5: Capstone — train a real model** (roadmap item 5) | 1 boss | Tiny MLP trained live in-browser; learner sets lr/batch/epochs, watches loss curves, weight trajectories, and the decision boundary bend. This is where every world converges. |

### P1 — differentiation and depth

| Module | Lessons | Notes |
|---|---|---|
| **Numerical computing for ML** | 2 | Floating point & the log-sum-exp trick (softmax overflow lab); conditioning & stability (revisit the ill-conditioned bowl; "solve, don't invert" made quantitative). |
| **Information theory bridge** | 2 | Cross-entropy = NLL = KL + entropy, as its own lesson (the single most load-bearing identity in deep learning); mutual information at intuition level. |
| **W3: Markov chains** | 1 | State-diagram lab with stationary distribution converging under powers of the transition matrix — reuses eigenvectors (λ=1) from W1. Prerequisite for RL and MCMC. |
| **Backlog labs** (`lesson-reports/README.md`) | — | The top audit proposals are P1: ill-conditioned-bowl GD, saddle-free Newton toggle, signed-area explorer, MLE likelihood-curve, sequential Bayes updater. |
| **Positive definiteness** | 1 | xᵀAx as a landscape (bowl/saddle/dome lab); ties Hessian classification (W2) to covariance (W3) to kernels (W4). |

### P2 — enrichment

- Complex numbers & Fourier at intuition level (rotations, why eigenvalues
  go complex; positional encodings).
- Concentration inequalities (Hoeffding, simulation-first).
- Kernels & the feature-map trick; SVM geometry.
- Big-O of the architectures (attention's O(n²) lab: slide sequence length,
  watch compute grow).
- Double descent lab (the ml-learning deeper card, made interactive).

---

## 4. Recommended methods (how, not just what)

### 4.1 Assessment beyond recognition (engine work, highest leverage)

1. **Numeric-input questions.** Cheap to build (one input + tolerance check)
   and it converts recognition into production: "Compute f′(2)" typed, not
   picked. Target: ≥1 numeric item per quiz pool.
2. **Predict-then-verify missions.** Before a slider is enabled, the learner
   commits a prediction ("where is the minimum?" → click), then the lab
   reveals. This defeats slider-sweeping and exploits the hypercorrection
   effect (confident errors, corrected, are remembered best).
3. **Derivation-step ordering.** Present a worked derivation as shuffled
   steps to drag into order; a stepping stone toward proof without needing a
   CAS. ("Spot the flaw" variants: one step contains a planted error.)
4. **Cumulative world exams.** A "qualifying exam" boss per world drawing
   from *all* prior worlds' pools; unlocks the next world's badge.

### 4.2 Scheduling (learning-science free wins)

5. **Spaced-repetition queue** on the home map (promote the roadmap wishlist
   item): feed per-tag accuracy from `quiz_answers` into a daily 5-question
   review drawn across all completed lessons. Interleaving falls out for free.
6. **Delayed retakes prompted at 1 day / 1 week / 1 month** — the engine
   already supports fresh-draw retakes; add the nudge.

### 4.3 The paper bridge (what no slider can do — roadmap item 6, specified)

7. **Companion problem sets** (PDF or repo notebooks) keyed to lessons:
   Strang exercises for W1, Axler ch. 1–3 for proof literacy, MIT 18.05-style
   problems for W3/3.5. The app links to them at each world's end; "done" is
   an honor-system checkbox that gates the world badge.
8. **From-scratch ladder:** in-browser MLP capstone → numpy backprop
   notebook in a public repo → one small-paper reproduction with a write-up.
   Each rung is portfolio-visible; admissions committees weight exactly this.
9. **Proof-writing micro-course** (4–6 short lessons, no canvas): direct
   proof, contrapositive, induction, counterexample-hunting — assessed by
   derivation-ordering and flaw-spotting (see 4.1.3), with the *real* writing
   done on paper against the Axler sets.

### 4.4 Process

10. **Keep the audit loop.** The `lesson-reports/` mechanism (web-grounded,
    per-lesson, source-cited) is a genuine editorial process; re-run it on
    every new module before shipping, and keep the two standing rules —
    self-contained quiz stems; instructor-grade fidelity (no folk theorems
    like "stuck in local minima").
11. **Cite sources in `deeper` cards.** One link per card (3B1B, Strang
    lecture, paper) turns each card into an on-ramp for real study.

---

## 5. Sequencing & scale

Recommended world order after expansion:

```
W0 Foundations (5) → W1 Linear Algebra (+4 → 16) → W2 Calculus (+3 → 14)
→ W3 Probability (+4 → 10) → W3.5 Statistics (4, new)
→ W4 Classical ML (+4) then Deep Learning (6) → W5 Capstone (1–2)
+ cross-cutting: Numerics (2), Info-theory bridge (2), Proof micro-course (4–6)
```

Target: **~65–70 lessons ≈ 120–150 hours** with problem sets — comparable to
three semester courses, which is what "math readiness for an AI master's"
honestly costs. The current 40 lessons are the right first half.

**Suggested build order** (each increment shippable, consistent with the
existing roadmap):
1. W4 Classical ML (roadmap item 4 — already scoped, unlocks the capstone)
2. W5 Capstone MLP (roadmap item 5 — the motivational payoff; do it early)
3. Numeric-input questions + predict-then-verify missions (engine, small)
4. W1 Orthogonality & Projection (biggest single conceptual hole)
5. W3.5 Statistics & Evidence (biggest single coverage hole)
6. W2 Multivariable + Lagrange
7. Spaced-repetition queue
8. W3 Joint/conditional + covariance; then P1 items and the backlog labs

---

## 6. Summary for the maintainer

The engine and editorial process are the assets; protect them. The curriculum
teaches *intuition* at a quality most graduate TAs would envy — the remaining
distance to "complete education" is (1) four missing subject areas
(projection, multivariable/constrained optimization, statistics, classical
ML), (2) one missing assessment mode (production: numeric input, derivation
ordering, cumulative exams), and (3) one missing habit loop (spaced,
interleaved review + paper problem sets). None of these require abandoning
the visual-first identity — they require pointing it at the second half of
the syllabus and letting the learner's hands do more than drag.
