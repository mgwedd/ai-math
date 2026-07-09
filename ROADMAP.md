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
- **Curriculum architecture — ladder steps 1–2** (`registry.js`, PR #1): a
  single validated entry point `registerLesson()` (idempotent by id → HMR-
  safe; loud load-time errors instead of silent render-time failures), and
  the death of the index-parallel feedback tables — `WRONG_WHY`/`QMETA` are
  gone; feedback now rides inline on the question (`q.wrong`, `q.tag`,
  `q.focus`). `validateCurriculum()` enforces shape + inline-key validity.
- **Test + CI gate** (PR #1): a zero-config Vitest smoke suite (`npm test` →
  `test/curriculum.test.mjs`) — asserts the curriculum loads, validation is
  clean, and inline feedback is well-formed — wired to a pre-push hook and a
  GitHub Actions matrix (Node 22/24).

### In flight (this wave — MS-gap closure endgame)

**Knowledge-base pipeline — COMPLETE, all seven PRs on main** (docs/
KNOWLEDGE-BASE-PLAN.md): #53 concept registry · #54 answer telemetry · #56
service layer · #57 parameterized generators · #58 enrichment UI · #70
(landed PR 6 practice surface + PR 7 hardening/evergreen loop together),
plus #55 KaTeX pass, #52/#68/#69 challenge-lab passes, and #71 (registered
the conv/CNN concepts #63 needed). All four migrations (`kb_cache`,
`answer_telemetry`, `question_bank`, `kb_usage`) are in the tree — apply to
the live DB at deploy time. The kb-steps rate cap from #60's runbook is
wired.

**Standing rule the registry created**: `validateLessonTags()` now gates CI
— every new lesson's `q.tag` must resolve to a registered concept in
`lib/curriculum/concepts.js` (directly or via `TAG_ALIASES`). New-module
PRs must ship their concept registrations in the same PR.

**MS-gap closure wave** (per CURRICULUM-REVIEW.md): #63 `ml-conv` is
merged. Open PRs — each refreshed with current main + its concept
registrations, all 189 tests green on the combined tree. Safe merge order
(verified by sequential merge simulation):
1. #33 Next 16 bump — High-severity security fixes; merges clean
2. #61 research depth-pass — 10 audit items; the c-graddesc card was
   re-merged around #52's labs restructure
3. #62 `ml-unsupervised` — k-means · GMM/EM · PCA (3 lessons)
4. #64 `ml-kernels` — max-margin/SVM geometry · the kernel trick (2 lessons)
5. #65 `proofs` — proof-literacy micro-course (4 lessons; the P1 item)
6. #67 `rl` — MDPs/value iteration · Q-learning · policy gradients→RLHF (3
   lessons)
Steps 5–6 will show a trivial one-hunk `index.js` conflict at merge time
(both append an import after `ml-kernels.js`) — keep both lines, or merge
main into the branch first.
The nine dig-deeper research-report PRs (#40–48) are merged; their remaining
recommendations landed as #61.

---

## P0 — all eight shipped ✅

Every P0 item is now on main: (1) classical-ML breadth
(`ml-classification.js`, `ml-trees-eval.js`) · (2) in-browser MLP capstone
(`ml-capstone.js`) · (3) production-mode assessment (question-type registry
mc/numeric/order + predict-then-verify gates, PRs #21–22) · (4)
orthogonality/projection (`la-projection.js`) · (5) statistics & evidence
(`stat.js`) · (6) multivariable + Lagrange (`calc-multivariable.js`) · (7)
spaced-repetition daily review + per-world cumulative exams with retake
nudges (PRs #20, #23, #27) · (8) joint/conditional structure
(`prob-structure.js`). Original item specs preserved below for reference
until the wave above merges, then prune.

<details>
<summary>Original P0 specs (archived)</summary>

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

</details>

---

## Then (P1 — differentiating depth)

Shipped: numerics for ML (`numerics.js`, #39) · info-theory bridge
(`info-theory.js`, #38) · Markov chains (`markov.js`, #36) · positive
definiteness (`posdef.js`, #37) · CNNs (`ml-conv.js`, #63). In flight:
proof-writing micro-course (#65) · clustering/EM, PCA, kernels/SVM, RL
(see wave above).

Remaining:
- **Backlog labs** from `lesson-reports/README.md`: ill-conditioned-bowl GD
  (condition-number slider), saddle-free Newton toggle, signed-area
  explorer, MLE likelihood-curve, sequential Bayes updater.
- **Graphical-models taste** (1–2): Bayes nets as factored joints (rides on
  prob-joint/prob-independence); d-separation at intuition level.
- **Generative-models bridge** (1–2): VAE/diffusion intuition (rides on
  prob, info-theory, ml-mlp) — modern MS programs expect exposure.

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

1. ✅ **DONE (PR #1) — `registerLesson()` as the single validated entry
   point.** Replaced bare `LESSONS.push({…})`; checks unique id ·
   `interactive`/`labs` keys resolve · quiz shape · inline feedback indices
   valid. Idempotent by id (fixes HMR duplicate/vanishing-lesson). Silent
   render-time failures are now loud load-time errors via `validateCurriculum()`.
2. ✅ **DONE (PR #1) — killed the index-parallel feedback tables.**
   `WRONG_WHY[id][qi][opt]` and `QMETA[id][qi]` were index-keyed (insert one
   question → every later entry misaligns). Migrated inline onto the question
   object (`q.wrong = {1:…}`, `q.tag`, `q.focus`); registries removed. (Watch
   item for future migrations: sub-agents editing Unicode-heavy files can
   swap ASCII `'` string *delimiters* for smart quotes — passes `node --check`
   but breaks the real ESM import + SWC build; guard with a real-import +
   smart-quote-count self-check.)
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
  string *delimiters* stay ASCII `'`/backtick (smart quotes ' " pass
  `node --check` but break the ESM import + SWC build); verify in the running
  dev server, not just node.
- Every new lesson meets the multi-lab bar: 2–3 labs, meaty learn text,
  inline `q.wrong` per distractor, ml-note anchoring.
