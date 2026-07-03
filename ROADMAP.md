# Roadmap: MS-readiness increments

Each increment = one session of work, shippable on its own. Order matters —
later items depend on earlier vocabulary.

Why this shape: see `CURRICULUM-REVIEW.md` (professor-level critique). The
short version: the shipped 40 lessons are an excellent intuition bootstrap —
the right *first half*. The distance to real MS readiness is four missing
subject areas (projection, multivariable/constrained optimization,
statistics, classical ML), one missing assessment mode (production, not just
recognition), and one missing habit loop (spaced review + paper problem
sets). Target end-state: ~65–70 lessons ≈ 120–150 hours with problem sets —
three semester courses, honestly priced. Per-lesson improvement queue lives
in `lesson-reports/` (web-grounded audit; chip away between increments).

---

## Shipped (the first half)

- **World 0 — Foundations** (5 lessons, `extra.js`): functions & graphs ·
  slope/fitting-lines (loss-is-a-bowl) · powers/roots/scale · logarithms ·
  sigma notation. 12 labs via the multi-lab engine.
- **Multi-lab engine**: lessons take a `labs:[…]` array — a sub-stepper of
  2–3 interactives per lesson, each with its own missions. The depth
  standard for all new content.
- **World 1 depth** (`la-depth.js`): rank & four subspaces · SVD compression
  · matrix calculus (shapes-first, δxᵀ heatmap).
- **World 2 depth** (`calc-depth.js`): convexity (chord test, GD traps) ·
  curvature & Newton (Taylor line-vs-parabola, Newton-vs-GD race).
- **World 3 — Probability** (`prob.js`, 6 lessons): RVs & expectation →
  distributions → Bayes → MLE → CLT → entropy/KL. Promoted to its own world
  (ml is now World 4).
- **Fidelity + depth passes** from the 40-lesson audit: saddle-points-not-
  local-minima, Newton needs f″>0, Adam ≠ curvature, 𝒩(μ,σ²), biased σ²
  MLE, scaled attention Q·Kᵀ/√d, multivariable chain rule (+= across paths),
  gradient ⟂ contours, q/k/v projections, pre-norm/positional encoding, etc.
  Standing rules: quiz stems self-contained (never lab-recall);
  instructor-grade fidelity (no folk theorems).

---

## Next up (P0 — required for credible MS prep)

## 1. World 4 breadth: classical ML + evaluation
4 lessons before the transformer arc: logistic regression **as MLE** (cashes
in World 3; sigmoid + NLL surface lab) · regularization as priors (L2↔
Gaussian, L1↔Laplace; sparsity-path lab) · trees & ensembles (build a stump
forest interactively) · evaluation methodology (precision/recall/ROC
threshold slider — reuse quiz_answers data for realism). An MS program
quizzes these before it ever says "attention."

## 2. Capstone: train a real model in-browser
Boss world: tiny MLP trained live — visible loss curve, weight trajectories,
decision boundary bending; learner sets lr/batch/epochs and reproduces the
failure modes they've met (lr divergence, dead ReLUs, overfitting). Do this
*early* — it's the motivational payoff where every world converges.

## 3. Engine: production-mode assessment (small, highest leverage)
- **Numeric-input questions** (input + tolerance): ≥1 per quiz pool.
  Converts recognition into production — "compute f′(2)" typed, not picked.
- **Predict-then-verify missions**: commit a prediction (click/value) before
  the controls unlock, then the lab reveals. Kills slider-sweeping;
  exploits the hypercorrection effect.
- **Derivation-step ordering** ("arrange the proof" / "spot the flaw"):
  stepping stone toward proof literacy inside the engine.

## 4. World 1: orthogonality & projection (the biggest conceptual hole)
3 lessons slotted after la-dot: projection onto a line/subspace (drag b,
watch shadow + residual; residual ⟂ column space) · least squares as
projection + normal equations (closes the loop opened by pre-slope and
la-inverse) · Gram–Schmidt/QR at intuition level. The curriculum currently
invokes PCA twice and least squares once without ever teaching projection.

## 5. World 3.5 — Statistics & Evidence (new world; the biggest coverage hole)
4 lessons: estimators & their bias/variance (reuse the CLT lab machinery) ·
confidence intervals (simulation: 100 CIs, ~95 cover) · hypothesis tests &
p-values (permutation-test lab — simulation-first, no formula soup) ·
reading an ML experiments table (error bars, seeds, multiple comparisons,
ablations). Nothing currently distinguishes "the number went up" from "the
number went up significantly."

## 6. World 2: multivariable proper + constrained optimization
3 lessons: the gradient as best linear approximation (tangent-plane lab) ·
chain rule with Jacobians (2→2→1 pipeline; formalizes la-matcalc) ·
**Lagrange multipliers** (tangency lab: ∇f ∥ ∇g at the constrained optimum —
the most visualizable theorem in calculus; prereq for SVMs, RLHF's KL
constraint, projected GD).

## 7. Engine: spaced repetition + cumulative exams
- Spaced-repetition review queue on the home map fed by /api/stats
  (per-tag accuracy → daily 5-question cross-world review; interleaving for
  free). Promoted from wishlist: biggest evidence-backed win available.
- Cumulative "qualifying exam" boss per world, drawing from all prior
  worlds' pools; delayed-retake nudges at 1 day / 1 week / 1 month.

## 8. World 3 depth: joint & conditional structure
2–3 lessons: joint/marginal/conditional via a 2-D heatmap (slice =
condition, sum = marginalize) · independence & conditional independence ·
covariance/correlation (draggable point-cloud; feeds PCA and n-D Gaussians).
The substrate of graphical models and of the chain rule of probability that
defines LLM training.

---

## Then (P1 — differentiating depth)

- **Numerics for ML** (2): floating point + log-sum-exp (softmax overflow
  lab) · conditioning & stability ("solve, don't invert" made quantitative).
- **Info-theory bridge** (2): cross-entropy = NLL = KL + entropy as its own
  lesson (THE identity of deep learning) · mutual information intuition.
- **Markov chains** (1): stationary distribution as the λ=1 eigenvector —
  reuses power iteration from la-eigen; prereq for RL/MCMC.
- **Positive definiteness** (1): xᵀAx landscapes (bowl/saddle/dome); ties
  Hessians (W2) to covariance (W3) to kernels (W4).
- **Backlog labs** from `lesson-reports/README.md`: ill-conditioned-bowl GD
  (condition-number slider), saddle-free Newton toggle, signed-area
  explorer, MLE likelihood-curve, sequential Bayes updater.
- **Proof-writing micro-course** (4–6 short lessons, no canvas): direct
  proof, contrapositive, induction, counterexample-hunting — assessed via
  derivation-ordering/flaw-spotting; real writing happens on paper (below).

## Beyond the app (the part admissions actually weighs)

The capstone ladder — each rung portfolio-visible:
1. In-browser MLP capstone (item 2 above)
2. From-scratch numpy backprop notebook, committed to a public repo
3. One small-paper reproduction with a writeup
4. Companion problem sets keyed to worlds: Strang exercises (W1), Axler
   ch. 1–3 for proof literacy, 18.05-style problems (W3/3.5) — linked at
   each world's end; honor-system checkbox gates the world badge.
5. The app itself as portfolio: README section framing it as "designed and
   shipped a 40+-lesson interactive ML curriculum with a web-grounded
   editorial audit process."

## P2 enrichment (when the above is done)
Complex numbers & Fourier intuition · concentration inequalities
(simulation-first Hoeffding) · kernels/SVM geometry · big-O of architectures
(attention's O(n²) lab) · interactive double descent.

## Engine architecture: modularity & extensibility (code-review findings)

The engine itself is healthy (651 lines, content-agnostic rendering). The
debt is in the curriculum layer: files carry three concerns at once (lesson
data, canvas interactives, feedback tables), and several implicit couplings
have already caused real failures this cycle. Refactor ladder, ordered by
leverage — each step one session, shippable alone, zero behavior change:

1. **`registerLesson()` as the single entry point (validate at load).**
   Replace bare `LESSONS.push({…})` with a registry function that checks:
   unique id · `interactive`/`labs` keys resolve in INTERACTIVES · quiz
   shape (4 opts, `a` in range) · feedback indices align with pool length.
   Make it idempotent by id (replace, not append) — which also fixes the
   HMR duplicate/vanishing-lesson problem that currently forces dev-server
   restarts. ~40 lines in registry.js; turns silent render-time failures
   (typo'd interactive key, missing import) into loud load-time errors.
2. **Kill the index-parallel feedback tables.** `WRONG_WHY[id][qi][opt]`
   and `QMETA[id][qi]` are keyed by question *index* — inserting one quiz
   question silently misaligns every entry after it. Move both inline onto
   the question object (`q.wrongWhy = {1:…}`; `q.tag`/`q.focus` already
   take precedence today). Mechanical migration, no engine change.
3. **Move `WORLD_META`/`WORLD_ORDER` from engine.js into registry.js.**
   Adding a world currently means editing the engine — the one standing
   violation of "curriculum is pure data."
4. **One file per world, manifest-ordered loading.** index.js (1,207 lines)
   still bundles Worlds 1+2; extra.js (1,047) mixes World 0, cross-world
   `deepen()` cards, and pool expansions. Split per world and drive the
   dynamic imports from a manifest (or give every lesson an explicit
   `order` and drop load-order significance entirely) — the current
   `await import()` chain silently dropped two lessons once already when a
   link went missing.
5. **Lab toolkit: extract the plumbing every interactive hand-rolls.**
   Measured across curriculum files: pointer-drag wiring ×20, chip
   active-state toggling ×23, note panels ×47. Three helpers —
   `drag(canvas, onMove)`, `chipGroup(…)` with managed active state,
   `note(parent, html)` — delete ~300 lines and make every future roadmap
   lab meaningfully cheaper to build.
6. **Question-type registry (the extensibility play).** `renderQ` hardcodes
   multiple-choice. Introduce `QUESTION_TYPES = {mc, numeric, order}` keyed
   by `q.type ?? 'mc'`, each with `render`/`check`. This is the enabling
   refactor for P0 item 3 (numeric input, derivation ordering) — ship it as
   that item's first commit.
7. **Content → JSON (CMS-lite, still deferred)** — but note steps 1–2 are
   its prerequisites: once lessons flow through `registerLesson` with
   inline feedback, the data half of each file is serializable, and content
   edits can no longer break JS parsing (the Unicode-prime incident becomes
   structurally impossible).

## Engine wishlist (unchanged)
- Verified TLS via pooler CA pin (see README TODO)

## Process rules (hold the line)
- Re-run the per-lesson audit (`lesson-reports/` pattern, sonnet agents) on
  every new module before shipping; cite one source per `deeper` card.
- Quiz stems self-contained; derivatives use Unicode primes ′ ″ in source;
  verify in the running dev server (SWC catches what node --check won't).
- Every new lesson meets the multi-lab bar: 2–3 labs, meaty learn text,
  WRONG_WHY per distractor, ml-note anchoring.
