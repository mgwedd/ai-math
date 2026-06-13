# c-optim — Optimization: Hunting Flat Spots

## Current summary (what it teaches + what the lab does)
The lesson introduces **critical points** in 1-D: points where `f′ = 0` are
candidates for extrema, and you classify them with the **first-derivative test**
(sign change of the slope through the point: − → 0 → + is a min, + → 0 → − is a
max). It uses `f(x) = x³/3 − x`, so `f′(x) = x² − 1`, with critical points at
x = ±1 (a peak and a valley). It flags the local-vs-global distinction and, in
the `ml` note, connects "flat spot" to `∇L = 0`, loss landscapes full of local
minima and saddle points, and why optimizers like Adam exist.

The lab (`INTERACTIVES.optim`) lets the learner **drag a point along the curve**.
A color-coded tangent line shows climbing (gold), descending (red), or flat
(green). A readout prints x, f′(x), and a CRITICAL POINT badge near slope 0. Two
faint dots mark the buried critical points. Three missions: stand on the local
min (x≈1), stand on the local max (x≈−1), and find a spot with slope exactly 3.

The `deeper` cards correctly contrast a 1-D saddle/inflection (slope keeps the
same sign on both sides, like x³ at 0) with a true minimum, and note that no
learning rate escapes a genuinely-zero gradient. The follow-on lessons
`c-graddesc` (gradient descent), `c-convex` (convexity), and `c-secondorder`
(curvature / Newton / Hessian / saddle classification by eigenvalues) carry the
second-order machinery, so c-optim should stay the first-derivative-test entry
point and *preview* — not duplicate — those.

## Strengths
- The drag-the-tangent lab is the right pedagogy: it makes "f′ = 0 is flat" a
  felt fact, and the color coding maps sign-of-slope directly onto geometry.
- The first-derivative test is stated correctly and is the appropriate tool here
  (it works without f″, and it correctly handles the inconclusive-second-derivative
  cases the next lesson will hit).
- The "slope 3" mission is a nice touch — it forces reading the derivative as a
  number, not just a sign, foreshadowing gradient *magnitude*.
- The deeper cards already distinguish inflection/saddle from a true min using
  the x³ example — accurate and well chosen.
- The local-vs-global warning is planted early and paid off in `c-graddesc`.

## Inaccuracies / fidelity issues (each: the issue -> the correct statement -> source URL)
- **"saddle point" offered as a 1-D quiz option without it ever being defined
  in-lesson.** Quiz 1's distractors include "A saddle point," and the WRONG_WHY
  card 2 introduces the term, but the `learn` text never defines a saddle. In
  strict 1-D, what `learn` describes (slope keeps the same sign, like x³ at 0) is
  an **inflection point with horizontal tangent**; "saddle point" is the
  *multivariable* generalization (min in some directions, max in others). The
  lesson conflates the two without saying so. -> State it plainly: in 1-D a
  `f′=0` point that is neither min nor max is a *horizontal inflection* (e.g. x³
  at 0); its higher-dimensional cousin — down in some directions, up in others —
  is the *saddle point*, which the lab can't show because it needs ≥2 dimensions.
  -> https://en.wikipedia.org/wiki/Saddle_point ,
  https://en.wikipedia.org/wiki/Second_derivative_test
- **"Loss landscapes are full of local minima" overstates a contested claim.**
  The modern, well-grounded view (Dauphin et al., NeurIPS 2014; Goodfellow DLB
  ch. 8) is that in high dimensions the dominant obstacle is **saddle points, not
  local minima** — most critical points of a random high-D function are saddles,
  and local minima tend to cluster near the global value. -> Correct the `ml`
  note: "In high dimensions the trouble is mostly *saddle points*, not local
  minima — almost every critical point of a large network is a saddle, and most
  local minima have loss close to the global best." ->
  https://arxiv.org/abs/1406.2572 ,
  https://www.deeplearningbook.org/contents/optimization.html
- **"why optimizers like Adam exist" is a loose causal claim.** Adam was not
  designed to escape local minima; it adapts a per-parameter step size from
  gradient first/second-moment estimates (a curvature-flavored rescaling). What
  actually helps escape saddles is **stochasticity (SGD noise) and momentum**;
  curvature-aware methods (saddle-free Newton) attack saddles directly. -> Reframe:
  "SGD's noise and momentum help nudge past flat saddles; Adam adapts the step
  per parameter." -> https://arxiv.org/abs/1412.6980 (Adam),
  https://arxiv.org/abs/1406.2572 (saddle-free)
- **Slope-3 mission is unreachable on the stated branch description.** `f′=x²−1=3`
  gives x=±2; the lab clamps x to [−3,3] and starts at x=2.2, so x=2 is fine —
  not a bug, but note the learner can satisfy it at x=−2 too (descending steeply),
  which contradicts the mission text "the curve **climbs** at slope 3." At x=−2
  the slope is +3 (climbing) as well, so it's fine — but worth confirming the
  prose says "slope +3" (a value), since slope 3 is climbing at both x=±2. No
  correction needed beyond wording; flagging for precision. (Verified:
  f′(−2)=4−1=3>0, climbing.)

## Conceptual gaps (what a serious learner still needs)
- **Boundary extrema / endpoints.** Critical points are only *interior*
  candidates. On a closed domain, extrema can occur at the boundary where f′ need
  not be zero. A master's-bound learner optimizing constrained losses must know
  "candidates = critical points ∪ boundary ∪ non-differentiable points."
- **Non-differentiable optima.** ReLU networks, L1/lasso, and hinge loss have
  kinks where the minimum sits at a point with *no derivative* (subgradient
  territory). "f′ = 0" is not the universal optimality condition. The curriculum
  already teaches hinges visually elsewhere — c-optim should at least name this.
- **The first-derivative test vs the second-derivative test, and *why* you'd
  pick one.** The first-derivative test always works (including x⁴ at 0, where
  f″=0); the second-derivative test is faster but inconclusive when f″=0. c-optim
  uses the first-derivative test but never says it's the more robust tool —
  setting up `c-secondorder` cleanly.
- **Necessary vs sufficient.** f′=0 is *necessary* for an interior extremum, not
  *sufficient* (x³ at 0). This is the single most important logical point and is
  implied but never stated as "necessary, not sufficient."
- **Why flat spots stall gradient descent — quantitatively.** Near a critical
  point the step `lr·f′` → 0, so progress crawls; on a saddle's plateau this is
  the "high-error plateau" stalling effect. Connect the dot the `ml` note gestures
  at to the actual step-size argument.

## Lab ideas (concrete: name the interactive, what the learner manipulates, what it reveals)
- **Upgrade `optim` with a curve selector ("flat-spot zoo").** Add 3–4
  swappable curves with a chip row: the current cubic (min+max), `x³` (horizontal
  inflection — f′=0 but NOT an extremum), `x⁴` (min where f″=0, so the
  *second*-derivative test fails but slope still flips), and a quartic with two
  minima of *different depth* (local vs global). A mission: "find a flat spot
  that is NOT a min or max" (lands on x³ at 0). This directly teaches
  necessary-not-sufficient and previews the next lesson's f″=0 caveat — the single
  highest-value upgrade.
- **New 2-D companion lab `saddle2d`.** A small heatmap/contour of
  `f(x,y)=x²−y²` with a draggable point and two readout slopes ∂f/∂x, ∂f/∂y. At
  (0,0) both partials are zero yet it's a min along x and a max along y — the
  learner *sees* why a saddle needs two dimensions and can't appear in the 1-D
  lab. Mission: "stand where both slopes are zero but it isn't a min." This is
  the honest way to introduce the word "saddle" that quiz 1 already uses.
- **Sign-of-slope strip.** Below the curve, render a number line shaded
  red(−)/green(0)/gold(+) by sign of f′(x). The first-derivative test becomes
  literally reading where the strip flips color — turning the test from prose into
  a glanceable artifact.

## Content improvements (specific learn/ml/deeper text upgrades)
- In `learn`, add one sentence: "f′ = 0 is *necessary* for an interior min/max,
  but not *sufficient* — x³ is flat at 0 yet keeps rising. So a flat spot is a
  *candidate*, and you must check the slope's sign on both sides (the
  first-derivative test)."
- Add a 1-D caveat naming the inflection-vs-saddle distinction so the quiz term
  isn't orphaned: "A flat spot that's neither min nor max is a *horizontal
  inflection* in 1-D (like x³ at 0); its multi-dimensional cousin — downhill some
  ways, uphill others — is a *saddle point*, which we'll meet once we have more
  than one variable."
- Add one line about candidates beyond f′=0: "Real losses also hit minima at
  *kinks* (ReLU, L1) where the derivative doesn't exist, and at domain
  *boundaries* — so 'set the derivative to zero' is the start of the hunt, not the
  whole of it."
- Rewrite `ml` to the saddle-dominant view: "Training = minimizing a loss over
  millions of dimensions; 'flat spot' becomes ∇L = 0. In high dimensions the real
  obstacle is *saddle points*, not local minima — almost every critical point of a
  big network is a saddle (Dauphin 2014), and most local minima sit near the
  global loss. SGD's noise and momentum help slide past flat saddles; that's part
  of why plain gradient descent isn't the end of the story."
- The deeper card 2 ("1-D saddle/inflection") is good but call it what it is:
  change "1D saddle/inflection" to "horizontal inflection (the 1-D stand-in for a
  saddle)" so terminology stays clean.

## Quiz improvements (specific misconceptions to target; keep questions self-contained — never require recalling lab-graph data)
- **Necessary-not-sufficient (new).** "f′(c) = 0. Which is guaranteed?" → options:
  "c is a local min", "c is a local max", "c is a *candidate* — it could be a min,
  a max, or neither (like x³ at 0)" [correct], "c is the global minimum." Targets
  the most common error: treating f′=0 as proof of an extremum.
- **f″ = 0 inconclusive (new, self-contained).** "At a critical point f″(c) = 0.
  The second-derivative test then says…" → "definitely a min", "definitely a
  saddle", "*inconclusive* — could be min, max, or inflection (x⁴ vs x³ at 0)"
  [correct], "the point isn't critical." Pre-teaches why the first-derivative test
  is the safer tool and bridges to c-secondorder. Fully self-contained (uses
  named functions, not lab data).
- **Fix quiz 2's lab dependency.** Question 2's WRONG_WHY says "You stood on both
  in the lab" — per the project rule (quiz-self-contained memory), drop the
  lab-recall phrasing; the math (x²−1=0 ⇒ x=±1) is already self-contained, so just
  remove "You stood on both in the lab."
- **Saddle vs local minimum in high-D (new, optional, self-contained).** "In a
  high-dimensional loss landscape, the most common kind of critical point is a…"
  → "global minimum", "local minimum", "saddle point" [correct], "maximum."
  Cements the corrected `ml` claim; no graph recall needed.
- Keep quiz 1 but only after `learn` defines the first-derivative test pattern
  explicitly (it does) — and ensure "saddle point" as a distractor is now a *known*
  word thanks to the new `learn` sentence.

## Sources (the real URLs you consulted)
- https://en.wikipedia.org/wiki/Second_derivative_test (first/second-derivative tests; f″=0 inconclusive; x³ vs x⁴)
- https://en.wikipedia.org/wiki/Saddle_point (saddle = multivariable; min some directions, max others)
- https://arxiv.org/abs/1406.2572 — Dauphin, Pascanu, Gülçehre, Cho, Ganguli, Bengio, "Identifying and attacking the saddle point problem in high-dimensional non-convex optimization" (NeurIPS 2014): saddles dominate, not local minima
- https://www.deeplearningbook.org/contents/optimization.html — Goodfellow, Bengio, Courville, *Deep Learning*, ch. 8 (critical points, saddles, plateaus, why most local minima are near-global)
- https://arxiv.org/abs/1412.6980 — Kingma & Ba, "Adam" (adaptive per-parameter step sizes; not a local-minimum escape mechanism)
- https://math.libretexts.org/Bookshelves/Calculus/Map%3A_University_Calculus_(Hass_et_al)/13%3A_Partial_Derivatives/13.7%3A_Extreme_Values_and_Saddle_Points (D-test / classification incl. saddle, inconclusive case)
