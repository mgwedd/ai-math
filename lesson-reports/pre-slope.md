# pre-slope — Slope & Fitting Lines

## Current summary (what it teaches + what the lab does)
Teaches `y = mx + b` (slope = rise/run, intercept = value at x=0), the constancy of slope along a line, then pivots to the real payoff: fitting a line to noisy data by minimizing **squared error (SSE)**, framed as the first machine-learning model (linear regression) and the first hand-done "loss minimization." The `ml` note ties knob-turning to training and previews gradient descent. `deeper` cards cover coordinate descent ("anchor then tilt"), why squared error (no cancellation, penalize big misses, clean derivative → normal equation), and convexity (parabola, global min guaranteed, real nets non-convex).

Three labs, all read off the same 4-point dataset `[[0,0.6],[1,1.6],[2,3.0],[3,4.0]]`:
- **`preslope_rise`**: drag two points A/B; dashed run/rise triangle; readout shows `m = rise/run`. Missions: hit m=2, make a downhill line, make a flat line. Handles vertical (m = ∞).
- **`preslope`**: two sliders (m in [−2,3], b in [−2,4]); purple line over gold data dots, red dashed vertical residuals; readout shows equation + SSE. Missions: SSE < 0.3, SSE < 0.06, "sabotage" (m<0 and SSE>5).
- **`preslope_loss`**: plots **SSE vs. slope m** with intercept fixed at b=0.5; convex parabola, draggable blue dot, dashed green line at the true optimum `mStar = 33.2/28 ≈ 1.186` (verified exact). Missions: reach bottom (E<0.1), push m≤−0.5, push m≥3.

## Strengths
- The three-lab arc is genuinely well-designed: *concept (rise/run) → action (you are the optimizer) → reframe (loss landscape)*. This is the right pedagogical sequence and matches how 3B1B/CS229 motivate gradient descent.
- The loss-landscape lab is the standout — making the parabola tangible and labeling its bottom is exactly the intuition that pays off in World 2.
- `mStar` is numerically exact (33.2/28 = 1.18571…, confirmed by minimizing SSE in m with b=0.5), so the "best" marker is honest, not eyeballed.
- WRONG_WHY entries are specific and correct, including the subtle ones (x-crossing = −b/m; vertical slope undefined not −2; 1/3 is run-over-rise inverted).
- The convexity card correctly flags that real nets are non-convex — sets up World 2 without overclaiming.

## Inaccuracies / fidelity issues (each: the issue -> the correct statement -> source URL)
1. **"linear regression, the first machine-learning model ever"** (learn) and **"the original supervised learning algorithm" / "first machine learning model"** (quiz `why`, ml note). -> Overclaim. Least squares dates to Legendre (1805) and Gauss (c. 1795–1809) as a method of *astronomical/geodetic estimation*, long predating "machine learning." It is fair to call it the *simplest* supervised model or the *prototypical* / *oldest* regression method, but "the first ML model ever" is historically loose. Soften to "the oldest and simplest supervised-learning model." -> https://en.wikipedia.org/wiki/Least_squares (history: Legendre 1805, Gauss).
2. **"the best m, b can be solved in one shot ... That closed-form solution is the normal equation"** (deeper card 2) — correct but the lesson never gives the actual scalar formula, leaving a master's-bound learner without the punchline. -> For simple regression: `m = cov(x,y)/var(x) = Σ(xᵢ−x̄)(yᵢ−ȳ) / Σ(xᵢ−x̄)²` and `b = ȳ − m·x̄`, and the line **always passes through (x̄, ȳ)**. (For this lab's data the full OLS fit is m=1.16, b=0.56.) -> https://en.wikipedia.org/wiki/Simple_linear_regression
3. **Residuals are vertical, and this is never stated as a choice.** The `preslope` lab draws vertical residual dashes (correct for OLS) but the text treats "the error" as if it were the only natural notion of distance. -> OLS minimizes *vertical* distances (errors assumed in y only), which makes it **asymmetric** — regressing y-on-x gives a different line than x-on-y. Minimizing *perpendicular* distance is a different method (total least squares / orthogonal regression), used when both variables have error. A serious learner should know the residual is vertical *by assumption*. -> https://en.wikipedia.org/wiki/Total_least_squares and https://www.cs.bu.edu/fac/snyder/cs132-book/L23LinearModels.html
4. **"clean derivative, so the best m, b can be solved in one shot"** conflates two distinct virtues of squaring.** The *closed form* comes from the loss being **quadratic/convex** (linear normal equations), not merely from being differentiable; MAE is also (sub)differentiable yet has no closed form. -> Squaring gives a *quadratic* loss whose gradient is *linear* in the parameters, so setting it to zero yields a linear system solvable in one shot. -> https://kenndanielso.github.io/mlrefined/blog_posts/8_Linear_regression/8_2_Probabilistic_least_squares.html
5. **No mention of *why* squared error is the principled choice, only mechanical reasons.** The deeper card lists "no cancellation / penalize big misses / clean derivative" but omits the real justification. -> Minimizing SSE is **maximum-likelihood estimation under i.i.d. Gaussian noise**; it is exactly equivalent. This is *the* reason squared error is the default, and it also explains MSE's sensitivity to outliers (Gaussian tails are thin, so the model refuses to ignore far points). -> https://jramkiss.github.io/2022/01/05/MLE-loss-regression/

## Conceptual gaps (what a serious learner still needs)
- **The closed-form slope/intercept formulas** — the lesson promises "one shot" but never shows `m = cov/var`, `b = ȳ − m·x̄`, or the through-the-mean property. This is the single biggest gap for the target audience.
- **Loss is a 2-D surface, not a 1-D curve.** The loss lab fixes b and shows a parabola; the true loss `E(m,b)` is a *bowl in 3-D* (an elliptic paraboloid). The learner should see that gradient descent moves in the (m,b) plane, and that the 1-D slice is just a cross-section. (Without this, the jump to "millions of knobs" is unmotivated.)
- **MSE vs. MAE / robustness.** Squaring's downside (outlier sensitivity) is the natural counterpoint to the deeper card; absolute error → median, squared error → mean. -> https://medium.com/data-science/comparing-robustness-of-mae-mse-and-rmse-6d69da870828
- **The Gaussian/MLE story** linking the loss to probability (gap #5 above) — the bridge to World 3 (probability) and to cross-entropy later.
- **Vertical vs. perpendicular residuals** and OLS asymmetry (gap #3).
- **What "fits best" optimizes toward** — that the residuals at the optimum sum to ~0 and are uncorrelated with x (the geometry of projection onto the column space, foreshadowing the normal-equation card).

## Lab ideas (concrete: name the interactive, what the learner manipulates, what it reveals)
1. **`preslope_surface` — the loss as a 2-D bowl (upgrade the headline lab).** Show a heatmap/contour of `E(m,b)` over the (m,b) plane with a draggable marker; overlay the current line + residuals in a small inset. Reveal: the loss is an elliptic paraboloid with one global minimum at the OLS solution; the existing 1-D parabola is just a horizontal slice. Mission: walk the marker to the basin (E below threshold); optional "follow the negative gradient" ghost arrow to preview descent.
2. **`preslope_fit` — add a "Solve it" button + closed-form reveal.** Keep the manual sliders, but add a button that snaps to the exact OLS line and prints `m = cov/var = 1.16`, `b = 0.56`, and draws the point (x̄, ȳ) the line pivots through. Reveal: hand-tuning converges to a formula; the line always passes through the data's center of mass.
3. **`preslope_outlier` — drag one point far away.** Let the learner drag a single data point and watch the OLS line swing toward it disproportionately; toggle "minimize |error|" (MAE) to see the line barely move. Reveal: squared error's outlier sensitivity and the MSE-mean / MAE-median distinction — concrete, visceral, and self-contained.
4. **`preslope_perp` (stretch) — toggle vertical vs. perpendicular residuals.** Same cloud, switch the residual definition; show the two best-fit lines differ. Reveal: OLS minimizes vertical error by *assumption*; orthogonal regression is a different model. Good "deeper" extension, not required for the core mission.

## Content improvements (specific learn/ml/deeper text upgrades)
- **learn**: Replace "the first machine-learning model ever" with "the oldest and simplest supervised-learning model — Gauss and Legendre used least squares to track planets two centuries before computers." Add one sentence: "The best-fit line always passes through the data's center of mass (x̄, ȳ)."
- **learn / deeper**: State explicitly that residuals are measured **vertically** (errors in y), and that this is a modeling choice — one line of foreshadowing for total least squares.
- **deeper card 2 (normal equation)**: Give the scalar formula before the matrix one: `m = cov(x,y)/var(x)`, `b = ȳ − m·x̄`. The matrix `XᵀXw = Xᵀy` form can stay as the "many-feature generalization."
- **deeper card 2/3**: Add a short "🚀 Go deeper: why squared error is *principled*" card — minimizing SSE = maximum likelihood under Gaussian noise; this is why it's the default, and why it over-reacts to outliers (preview of MAE / robust loss).
- **ml note**: Soften "first loss-minimization ... first machine learning model" and add the 2-D point: "Here you turn *two* knobs; the loss is really a bowl over the (m,b) plane. Real nets turn millions of knobs, and the bowl is no longer convex."
- **deeper card 3 (convex)**: Correct the implied claim that differentiability gives the closed form; attribute it to the loss being **quadratic** (linear normal equations).

## Quiz improvements (specific misconceptions to target; keep questions self-contained — never require recalling lab-graph data)
- **Add: through-the-mean property.** "The least-squares line is guaranteed to pass through which point?" → (x̄, ȳ) / the data's average. Distractors: the origin; the first data point; the steepest point. Targets the misconception that the fit is anchored at the origin or an arbitrary point.
- **Add: vertical vs. perpendicular residuals.** "Ordinary least squares measures each point's error as…" → the *vertical* gap to the line (in y). Distractors: the perpendicular distance; the horizontal gap; the straight-line distance to the nearest data point. Self-contained; targets the very common "shortest distance" intuition.
- **Add: MSE vs. MAE robustness.** "Compared with summing *absolute* errors, summing *squared* errors makes the fit…" → more sensitive to a single far-off outlier. Distractors: less sensitive to outliers; identical; unaffected by outliers. Reinforces the deeper-card content.
- **Add: closed form vs. iteration.** "For a straight-line fit, the best slope and intercept can be found by…" → a direct formula (one shot), *and* iteratively by gradient descent — both. Distractors that pick only one or "only trial and error" target the misconception that all ML requires iteration.
- **Refine existing #3 `why`**: drop "the original supervised learning algorithm" → "the prototypical / oldest supervised-learning algorithm."
- Keep all questions phrased generically (slopes, points, definitions) — none should require the learner to read a value off a specific lab graph, per the self-contained-quiz rule.

## Sources (the real URLs you consulted)
- https://en.wikipedia.org/wiki/Simple_linear_regression — closed-form slope `cov/var`, intercept `ȳ − m·x̄`, through-the-mean, uniqueness condition (var(x) ≠ 0)
- https://en.wikipedia.org/wiki/Least_squares — history (Legendre 1805, Gauss); residual sign cancellation rationale
- https://en.wikipedia.org/wiki/Total_least_squares — vertical vs. perpendicular residuals; OLS asymmetry
- https://www.cs.bu.edu/fac/snyder/cs132-book/L23LinearModels.html — geometric/linear-algebra view of least squares; residuals as projections
- https://jramkiss.github.io/2022/01/05/MLE-loss-regression/ — MSE = MLE under Gaussian noise
- https://kenndanielso.github.io/mlrefined/blog_posts/8_Linear_regression/8_2_Probabilistic_least_squares.html — probabilistic least squares / quadratic loss → closed form
- https://medium.com/data-science/comparing-robustness-of-mae-mse-and-rmse-6d69da870828 — MSE outlier sensitivity, mean-vs-median estimators
