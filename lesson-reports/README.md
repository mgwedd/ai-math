# Curriculum fidelity & depth audit — backlog

One web-grounded report per lesson (40 total, `<lesson-id>.md`), produced by a
per-lesson research pass (read the lesson + its interactive, research the topic
against authoritative sources, propose fidelity fixes / depth gaps / richer
labs). Each report has: Current summary · Strengths · Inaccuracies · Conceptual
gaps · Lab ideas · Content improvements · Quiz improvements · Sources.

Use these as the work queue. Chip away lesson-by-lesson; the reports cite real
URLs so claims can be checked before editing.

## Already actioned
- **Fidelity wave** (commit `2a1ed4b`): ~18 correctness fixes across all worlds
  — saddle-points-not-local-minima (c-convex/c-optim/c-graddesc/c-boss),
  Newton-needs-f″>0 & Adam≠curvature (c-secondorder), 𝒩(μ,σ²) & biased σ² MLE
  (prob), det≠conditioning / scaled attention / eigenvector-existence /
  linear-collapse / LoRA α·r (LA), train-val-test & double-descent & dying-ReLU
  & embedding over-claims & "20-token" corpus (ML), 0/0 indeterminate & FTC
  two-parts & signed area (calc).
- **Depth wave 1** (this commit): 6 high-ROI `deeper` cards — multivariable
  chain rule / += accumulation (c-chain), gradient ⟂ contours + steepest-ascent
  proof (c-boss), linearity of expectation (prob-rv), q/k/v projections + key vs
  value + √d variance (ml-attn), positional-encoding/pre-norm/unembedding
  (ml-boss).

## Remaining — depth content (cheap; text & `deeper` cards, no new code)
Highest-value gaps still open (see each report's "Conceptual gaps"):
- **la-rank**: null space = orthogonal complement of the row space (the
  Fundamental Theorem); column rank = row rank.
- **la-eigen**: eigendecomposition M = PDP⁻¹ and why Mᵏ is then trivial.
- **la-matrix**: define linearity (T(u+v)=…, T(cu)=…); origin-fixed ⇒ bias makes
  a layer *affine*.
- **la-inverse**: singular ⇒ *no* solution OR *infinitely many*; pseudoinverse
  for non-square / least squares.
- **la-svd**: Eckart–Young Frobenius error √(Σσ²) + uniqueness gap; thin SVD.
- **prob-mle**: i.i.d. assumption stated; NLL ⇔ cross-entropy bridge.
- **prob-bayes**: MAP ⇒ L2 regularization; sequential updating.
- **c-deriv / c-rules**: differentiability caveat (corners), power-rule domain.
- **ml-learning**: sample-size dimension of overfitting.
- **ml-gpt**: T=1 as the neutral reference; top-p vs temperature.

## Remaining — new interactive labs (expensive; canvas builds + verify)
Top proposals, by ROI (see each report's "Lab ideas"):
- **c-boss**: ill-conditioned-bowl GD with a condition-number slider (shows
  zig-zag → "why Adam exists").
- **c-secondorder**: "Newton fails on negative curvature" toggle (raw vs
  saddle-free) near the quartic's local max.
- **c-integrals**: signed-area explorer (slide a sinusoid across the axis; net
  vs total area).
- **prob-mle**: likelihood-curve lab (watch L(p) sharpen to a peak per flip;
  boundary-MLE degenerate case).
- **prob-bayes**: sequential Bayes updater (posterior becomes next prior).
- **prob-dist**: overlay N(np, np(1−p)) on the binomial bars with an np≥5
  validity badge.
- **prob-rv**: draggable per-face probability editor (E[X] updates live).
- **c-convex**: tangent-plane lower-bound (first-order condition) visualizer.

## Conventions when editing (learned the hard way)
- Quiz stems must be **self-contained** — never require recalling lab-graph data
  or "your run" state.
- Derivatives in source use Unicode primes `′ ″` (ASCII `'` breaks
  single-quoted strings; SWC catches what `node --check` won't).
- Curriculum is pure data; lessons share files, so edit serially and verify in
  the browser (`npm run dev`, DEV_AUTH).
