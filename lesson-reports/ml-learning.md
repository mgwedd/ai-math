# ml-learning — What Learning Is: Fit & Overfit

## Current summary (what it teaches + what the lab does)

The lesson introduces the core ML framing: a model is a function chosen to fit training data, but judged on held-out test data. It names the two failure modes — underfitting (too little capacity) and overfitting (too much) — and maps them to the bias–variance language in the deeper card. The `learn` block explains the concept in prose with a formula callout; the `ml` note ties it to real-world benchmarks; the `deeper` cards cover the student-memorization metaphor and the bias–variance U-curve.

**Lab (INTERACTIVES.mlfit):** An interactive canvas with 8 gold training points and 6 green test points drawn from a sine-like curve. A single "model capacity (poly degree)" slider from 0–7 controls a least-squares polynomial fitted via Gauss-Jordan elimination on the normal equations. The learner sees both MSE values update live. Three missions: (1) observe underfitting at degree ≤ 1; (2) find test error < 0.05 (the sweet spot); (3) manufacture overfitting at degree 7 with train < 0.001. The curve is drawn across the full x range, making oscillation visible for high degrees.

---

## Strengths

- The lab is mechanically sound: normal-equations least-squares is exactly right for polynomial fitting; Gauss-Jordan with pivoting handles near-singular matrices gracefully. The interpolation at degree 7 (8 coefficients, 8 training points) correctly drives train MSE to machine-zero.
- The mission sequence is well-ordered: see both errors high → find the sweet spot → deliberately overfit. This mirrors how practitioners actually diagnose models.
- The color coding (gold = train, green = test) with live readout is clear and minimal.
- The "student who memorizes" metaphor in `deeper` is the single most cited analogy in the literature (Goodfellow Ch. 5, CS229 notes, Ng's lectures) — keeping it is right.
- The WRONG_WHY explanations are specific and accurate.
- The quiz question "Both train AND test error are high" correctly identifies underfitting; the distractor "Leaking test data" in the wrong-why is sharp.

---

## Inaccuracies / fidelity issues

### Issue 1: The lesson conflates validation set and test set
**Current text:** "you're judged on **test data** the model never saw" and the lab calls its held-out points "test data." In practice the data the model "never saw" used to pick the sweet-spot degree is a *validation* set. Using it to choose degree 4 over 5 means the validation error is no longer unbiased — a true test set must be held out from model selection entirely.

**Correct statement:** There are three roles: training set (fits parameters), validation/dev set (selects hyperparameters and architecture — this is what the lab slider sweep actually uses), and test set (one-shot honest evaluation at the end). The lesson's binary train/test framing, while common in introductory contexts, is the most prevalent misconception that causes practitioners to report optimistically biased benchmarks. A master's-bound learner needs this distinction explicitly.

**Sources:**
- Wikipedia, "Training, validation, and test data sets": https://en.wikipedia.org/wiki/Training,_validation,_and_test_sets
- Statology, "Validation Set vs. Test Set": https://www.statology.org/validation-set-vs-test-set/
- Goodfellow, Bengio & Courville, *Deep Learning* Ch. 5 (model selection requires a separate validation set from the test set)

### Issue 2: The deeper card overstates the universality of the bias–variance U-curve
**Current text:** "Regularization … pulling the test curve's U-shape minimum toward you."

**Correct statement:** The classical U-shaped bias–variance curve applies in the classical (underparameterized) regime. Modern deep networks are massively overparameterized and exhibit *double descent*: after the interpolation threshold (where train error hits zero), test error can *descend again* rather than exploding. The lesson presents the U-shape as a universal law when it is really a regime-specific heuristic. The deeper card should acknowledge this without dwelling on it — a single sentence alert is enough to prevent the learner from carrying a wrong mental model into a DL context.

**Sources:**
- Belkin et al. (2019), "Reconciling modern machine learning practice and the classical bias-variance trade-off": the term "double descent" and the two-regime picture
- MLU-Explain, "Double Descent": https://mlu-explain.github.io/double-descent/
- CS229 Learning Theory notes (Aman.ai mirror): https://aman.ai/cs229/learning-theory/ — notes explicitly that the classical tradeoff does not describe ERM for many modern algorithms

### Issue 3: "Memorizes noise" is the only stated cause of overfitting; it is incomplete
**Current text:** "memorizes noise; training error ≈ 0 while test error explodes"

**Correct (fuller) statement:** Overfitting has two distinguishable sub-causes: (a) fitting the noise/irreducible error in the labels, and (b) fitting the particular sample — even noiseless data has a gap between training and test error when the model is complex relative to the sample size. The sample-size dimension is absent from the lesson. A key insight a serious learner needs: the same model degree that overfits on 8 points may generalize fine on 800. The formula from CS229's learning theory notes makes this precise: the variance penalty scales as O(√(k/m)) where k is hypothesis class size and m is sample count.

**Source:** CS229 notes archived on aman.ai: https://aman.ai/cs229/learning-theory/

### Issue 4: Lab degree-0 behavior is unlabeled and counterintuitive
The slider starts at degree 0 (a constant function — the mean of y-values). This is mathematically a valid model but its behavior surprises learners who expect "degree 0 = no model." The readout shows "degree = 0" with no label explaining what a degree-0 polynomial is. This is not an error but a usability gap that creates confusion during mission 1.

---

## Conceptual gaps (what a serious learner still needs)

1. **Train / validation / test three-way split.** The lab only has two sets. A learner heading into real ML practice must know the difference between hyperparameter tuning (uses validation error) and final reporting (uses a virgin test set). This is the single highest-priority gap.

2. **Sample size as the other axis.** The lesson teaches capacity as the only dial. But overfitting is determined by the ratio of model complexity to training set size — fitting a degree-5 polynomial to 500 points is fine; to 6 points it memorizes. Adding a second slider for `n` (number of training points) would make this viscerally clear. This is also what makes regularization make sense: it's equivalent to reducing effective capacity, which is equivalent to having more data.

3. **Double descent / the modern picture.** The U-curve narrative is incomplete for DL. A single sentence in the deeper card noting that overparameterized networks can *re-descend* on the test curve — and attributing it to implicit regularization from SGD — prevents the learner from being confused when they later train a 100M-parameter model on 50k examples and watch it generalize.

4. **What "generalization gap" is precisely.** The lesson uses the concept but never names it. `generalization gap = test error − train error` is worth naming; it is the quantity that every regularization technique is trying to shrink.

5. **Why MSE specifically?** The lab shows MSE but never says why squared error rather than absolute error. A brief note that MSE is mathematically convenient (links to likelihood under Gaussian noise, enables normal equations) sets up the gradient-descent and probabilistic lessons to come.

6. **Runge's phenomenon connection.** The oscillations visible in the degree-7 curve at the interval edges are a named phenomenon (Runge 1901) directly analogous to overfitting: adding polynomial degree on equally-spaced nodes worsens fit between nodes even while hitting all training points. Naming it deepens the insight and connects to numerical analysis that a master's student likely encounters.

---

## Lab ideas

### Lab idea A (upgrade): Add a training-set-size slider
**Name:** `mlfit-sample` (extends `mlfit` canvas)
**What the learner manipulates:** Two sliders — existing `degree` (0–10) + new `n_train` (4–20 training points sampled from the same underlying sine curve with fixed noise).
**What it reveals:** With 4 points and degree 5 the learner sees catastrophic overfitting. Dragging `n_train` to 20 while keeping degree 5 shows it generalize cleanly. The lesson that *the same capacity can overfit or not depending on data volume* is not learnable from the current lab. This is the core insight missing.

### Lab idea B (new): Three-way split visualizer
**Name:** `mlfit-split`
**What the learner manipulates:** A slider for polynomial degree; a second set of color-coded points (gold = train, orange = validation, red = test). Three readout numbers (train MSE, val MSE, test MSE). The learner is told to "pick the best degree using the validation set" and then "check honesty on the test set." Missions: (1) find degree that minimizes val error; (2) observe that test error is close but not identical to val error; (3) if they peek at test error to pick the degree, the test number becomes "tainted" — the lab could flash a warning when the learner clicks "use test to decide."
**What it reveals:** The train/val/test distinction; why you can't use the same held-out set for both selection and reporting.

### Lab idea C (deeper card): Noise level slider
**Name:** `mlfit-noise`
**What the learner manipulates:** A `σ` (noise level) slider. At σ = 0 (clean signal), a degree-3 or 4 polynomial tracks the true sine perfectly — there is nothing to memorize because there is no noise. At σ = 0.5 the high-degree polynomial starts oscillating wildly.
**What it reveals:** Distinguishes "memorizing noise" from "memorizing sample variation" — clarifies the two sub-causes of overfitting.

---

## Content improvements

### `learn` block
- Add a sentence distinguishing validation from test: "In practice you need a *three-way* split: **training** (fits parameters), **validation** (picks the best degree or other hyperparameter — what the slider sweep does), and **test** (a single honest read at the very end). Using your test set to choose hyperparameters taints it; the score is no longer honest."
- Add: "Overfitting gets worse as `n` shrinks — the same model that overfits 8 points may generalize fine on 800. Capacity and data volume are the two dials, not capacity alone."
- The formula callout `good model = lowest TEST error, not lowest train error` should say `good model = lowest VALIDATION error during tuning; lowest TEST error when reporting` — or acknowledge that "test" here means held-out data used only once.

### `ml` note
Add one sentence: "The benchmark scores you read online are only honest if the test set was truly untouched during development — leaderboard overfitting (fitting to the test set through repeated submission) has caused several high-profile benchmark inflations."

### `deeper` cards
**Bias–variance card:** Add after the existing text: "Note: this U-curve is a classical regime picture. Modern overparameterized networks (GPT-scale) can exhibit *double descent* — after the train error hits zero, test error descends *again* with further capacity. The mechanism is implicit regularization from gradient descent. The U-curve remains essential for understanding the classical regime and regularization."

**Add a third deeper card:** "📐 What 'generalization gap' means precisely: `generalization gap = test error − train error`. A zero gap at high train error = underfit. A large gap at low train error = overfit. Regularization (L2 weight decay, dropout, early stopping) all work by shrinking the gap — they trade a small increase in train error for a larger decrease in test error."

---

## Quiz improvements

The current 4 questions are sound. Specific additions and adjustments:

### Replace or augment Q4's "sweep the degree slider" focus hint
Current focus: "Sweep the degree slider start→end and watch the test curve's U." This implies the learner saw a U — but if they swept quickly they may only see it falling. Rewrite: "The test error first falls (degree 1→3: real structure captured) then rises (degree 5→7: noise memorized). Both phases must be observed to see the U." This makes the question self-contained.

### New Q5 (target misconception: validation ≠ test)
**Q:** "You tune your model by sweeping a complexity slider and choosing the setting with lowest held-out error, then report that held-out error as your 'test score.' What's wrong?"
**opts:** ['Nothing — that is the correct procedure', 'That held-out set is now a validation set, not a test set — you need a separate unseen test set', 'You should use train error, not held-out error, to select the model', 'Nothing, as long as the held-out set is large enough']
**a:** 1
**why:** Using held-out data to *select* hyperparameters makes it a validation set. Its error then underestimates true generalization error. A virgin test set, never touched during selection, is required for honest reporting.

### New Q6 (target misconception: capacity is the only dial)
**Q:** "A degree-5 polynomial overfit 8 training points badly. You have the same architecture but 200 training points now. What do you expect?"
**opts:** ['Still bad — degree-5 always overfits', 'Better generalization — more data shrinks the variance term', 'Worse — more data makes overfitting harder to detect', 'Same — only regularization can fix overfitting']
**a:** 1
**why:** The bias–variance penalty scales as ~√(complexity/n). With 25× more data, the variance term shrinks dramatically. More data is one of the two levers against overfitting (the other is reduced capacity or regularization).

### New Q7 (target misconception: train error 0 = model is useless)
**Q:** "A large neural network achieves near-zero training loss yet still generalizes well on the test set. This contradicts…"
**opts:** ['The bias–variance U-curve in its classical form', 'The definition of overfitting', 'The need for a test set', 'The concept of generalization']
**a:** 0
**why:** Classical bias-variance theory predicts test error rises once train error hits zero. Modern overparameterized networks can violate this — the phenomenon is called double descent. Generalization from near-zero train error is possible when the optimizer finds a smooth, low-norm solution (implicit regularization)."

---

## Sources

1. Wikipedia — Training, validation, and test data sets: https://en.wikipedia.org/wiki/Training,_validation,_and_test_sets
2. Statology — Validation Set vs. Test Set: https://www.statology.org/validation-set-vs-test-set/
3. CS229 Learning Theory notes (aman.ai): https://aman.ai/cs229/learning-theory/
4. MLU-Explain — Double Descent: https://mlu-explain.github.io/double-descent/
5. Goodfellow, Bengio & Courville — Deep Learning, Chapter 5 Machine Learning Basics (slides): https://www.deeplearningbook.org/slides/05_ml.pdf
6. Wikipedia — Runge's Phenomenon: https://en.wikipedia.org/wiki/Runge%27s_phenomenon
7. CS229 main notes (Andrew Ng & Tengyu Ma): https://cs229.stanford.edu/main_notes.pdf
8. Scikit-learn — Underfitting vs. Overfitting example: https://scikit-learn.org/stable/auto_examples/model_selection/plot_underfitting_overfitting.html
