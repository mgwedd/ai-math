# Roadmap: MS-readiness increments

Each increment = one session of work, shippable on its own. Order matters —
later items depend on earlier vocabulary.

## 1. World 3 — Probability & Statistics (the disqualifying gap) ✅ SHIPPED
`lib/curriculum/prob.js` — 6 lessons: random variables & expectation (dice-simulator lab) · common
distributions (parameter sliders) · Bayes' theorem (medical-test lab) ·
MLE (drag a Gaussian over data, watch log-likelihood climb) · sampling &
CLT (watch means converge) · entropy & KL divergence (distribution-vs-
distribution lab). Rewires ml-gpt's "probability" language to be earned.

## 2. World 1 depth: SVD + matrix calculus ✅ SHIPPED
`lib/curriculum/la-depth.js` — 3 lessons: rank & the four subspaces
(collapse-the-plane lab with a draggable null-space probe) · SVD
(image-compression lab: real Jacobi SVD in-browser, slider over kept
singular values, mission thresholds verified numerically) · matrix
calculus (Jacobian shape explorer + ∂L/∂W = δxᵀ outer-product heatmap).
Unlocks reading real backprop derivations + LoRA.

## 3. World 2 depth: convexity + Taylor/Hessian ✅ SHIPPED
`lib/curriculum/calc-depth.js` — 2 lessons, slotted after gradient descent
(order 13.3/13.6): convexity (chord-test lab proving non-convexity on a
double-well · GD-traps lab showing start-dependent minima vs the convex
bowl) · the second-order view (Taylor line-vs-parabola lab reading f″ as
curvature · Newton-vs-GD race lab — Newton nails a quadratic in one step
while GD crawls). Sets up the Hessian/eigenvalue view of optimization.

## 4. World 3 breadth: classical ML + evaluation
3 lessons: logistic regression (as MLE — ties world 3) · trees & ensembles
(build a stump forest interactively) · evaluation methodology (precision/
recall/ROC threshold slider — reuse quiz_answers data for realism).

## 5. Capstone: train a real model in-browser
Boss world: tiny MLP trained live with visible loss curve, weight updates,
and the user setting lr/batch/epochs. Everything previously learned, running.

## 6. Beyond the app (the part admissions actually weighs)
- From-scratch numpy backprop notebook, committed to a public repo
- One small-paper reproduction with a writeup
- The app itself as portfolio: write a README section framing it as
  "designed/shipped a 26-lesson interactive ML curriculum"
- Proof literacy: work through a proofs-based linear algebra text chapter
  alongside (Axler ch. 1–3), since no slider teaches proof-writing.

## Engine wishlist (supports all of the above)
- Spaced-repetition review queue on the home map fed by /api/stats
- Content extraction to JSON (CMS-lite, agreed deferred)
- Verified TLS via pooler CA pin (see README TODO)
