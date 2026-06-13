# la-matrix — Matrices = Transformations

## Current summary (what it teaches + what the lab does)
The lesson reframes a matrix away from "grid of numbers" toward **a function that warps space**, and lands the single most important idea cleanly: the **columns of a 2×2 matrix are where the basis vectors î=[1,0] and ĵ=[0,1] go**. It states the linearity payoff `M[x,y] = x·(Mî) + y·(Mĵ)` and lists rotation/stretch/shear/reflection as choices of the four numbers a,b,c,d. The `ml` note connects this to NN layers (each layer is a matrix transform, training nudges entries, a 7B LLM is mostly stacked matrices).

The lab (`INTERACTIVES.matrix`) renders the original grid faintly plus the transformed grid, the image of the unit square, and two arrows for î→ and ĵ→. Four sliders set a,b,c,d directly (labeled by their geometric role, e.g. "a — î's x landing"); preset chips give Identity / Rotate 45° / Flip x / Squash. Three gated missions: build a 90° rotation, build a horizontal shear (k≥0.5), and stretch x by 2×.

Quiz (3 Qs): read off a rotation from its columns; apply [[2,0],[0,1]] to [3,4]; "how do you read a matrix instantly" (columns, not rows). WRONG_WHY cards give misconception-specific feedback (notably calling out the rows-vs-columns "transpose trap" and the "matrices add to vectors" error).

## Strengths
- **The central pedagogy is exactly right and matches 3Blue1Brown's "Essence of Linear Algebra."** "Columns are where the basis vectors land" is the load-bearing insight, and the lab makes the columns *literally* the slider values and the arrows.
- Slider labels tie each entry to its geometric meaning rather than to an abstract position — excellent for building intuition.
- The lab visualizes the transformed grid *and* the unit-square image simultaneously, so area/orientation change is visible even before determinants are introduced (good scaffolding into la-det/la-eigen).
- WRONG_WHY cards are genuinely diagnostic (transpose trap, add-vs-transform) rather than generic.
- `ml` note is concrete and motivating for the target audience.

## Inaccuracies / fidelity issues (each: the issue -> the correct statement -> source URL)
1. **Linearity is asserted but never *defined*; the two defining properties are missing.** The lesson says "transformation is linear" and uses `M[x,y] = x·(Mî) + y·(Mĵ)` but never states what "linear" means. -> A transformation is linear iff it preserves addition and scalar multiplication: `T(u+v)=T(u)+T(v)` and `T(cu)=cT(u)`. The column formula is a *consequence* of these, not a definition. -> https://textbooks.math.gatech.edu/ila/linear-transformations.html , https://www.3blue1brown.com/lessons/linear-transformations/

2. **The "origin stays fixed" constraint is never mentioned — the key boundary against affine/translation.** A serious learner needs to know *what is excluded*. -> Linear maps force `T(0)=0`; the origin is pinned. Translations move the origin and are therefore **not** linear (they're affine). This is exactly why NN layers are `Wx + b`, not `Wx`. The lesson's own `ml` note skips that the bias `b` is what makes a layer affine rather than linear. -> https://www.3blue1brown.com/lessons/linear-transformations/ , https://deepai.org/machine-learning-glossary-and-terms/affine-layer

3. **"All of linear algebra" / "warps all of space" with no mention of the degenerate (collapse) case.** The lesson implies every 2×2 matrix gives a full 2D warp. -> When the two columns are linearly dependent (one a scalar multiple of the other, i.e. det=0), the transformation **squishes all of 2D space onto a line (or a point)** — a rank drop. This is a genuine outcome the learner can produce with the sliders and should be named. -> https://www.3blue1brown.com/lessons/linear-transformations/

4. **The 2×2 framing silently equates "matrix" with "square / same-space."** -> A matrix is `m×n`: it maps ℝⁿ → ℝᵐ, columns = images of the n standard basis vectors, and it can change dimension. NN weight matrices are almost never square (e.g. 4096→11008). The lesson never signals that 2×2 is a special case. -> https://textbooks.math.gatech.edu/ila/linear-transformations.html

5. **Quiz Q2 "why" calls [[2,0],[0,1]] "A pure horizontal stretch."** Minor: a stretch along x is usually called a *horizontal scaling/stretch*, which is fine, but the phrasing could be confused with a *shear*. -> Prefer "scaling the x-axis by 2 (a non-uniform / anisotropic scaling)" to avoid blurring stretch vs. shear, which is a documented student confusion. -> https://en.wikipedia.org/wiki/Transformation_matrix

## Conceptual gaps (what a serious learner still needs)
- **The formal linearity axioms** and the explicit "origin fixed → no translations → that's why layers add a bias b" bridge. This is the single highest-value addition for an ML-bound learner.
- **The forward map as row-wise dot products.** The lesson gives the column (basis-image) view but never says output coordinate i = (row i)·(input). Both views matter: columns explain *geometry*, rows explain *the arithmetic you actually code* (`y[i] = Σ_j W[i,j] x[j]`). This also pre-empts the rows-vs-columns trap by clarifying that rows ARE used — to *compute*, not to *read off geometry*.
- **Determinant preview as area/orientation** is visually present (unit-square image) but never named — a one-line forward pointer to la-det would cement it.
- **The collapse/rank case** (det=0, dimension drop) — both as geometry and as the reason singular matrices aren't invertible.
- **Non-square / dimension-changing maps** — needed before the learner sees real weight matrices.
- **Composition preview**: that doing one matrix then another is multiplication (handled in la-matmul, but a forward link helps).
- **What is NOT linear**: curving lines, moving the origin, `x²`, biases, activations. Naming the boundary makes the definition stick.

## Lab ideas (concrete: name the interactive, what the learner manipulates, what it reveals)
1. **"Collapse detector" overlay (extend `INTERACTIVES.matrix`).** Compute `det = a·d − b·c` live in the readout; when |det|<0.05, flash the unit-square image red and label "SPACE COLLAPSED → everything squished onto a line (rank 1)." Add a 4th mission: "Make the columns parallel — collapse 2D space onto a line (det → 0)." Reveals the degenerate case and seeds la-det.
2. **"Drag a point, watch it ride" mode.** Let the learner drag a single test vector v on the canvas; draw v faintly and `Mv` boldly, plus the decomposition `Mv = x·(Mî) + y·(Mĵ)` as two chained arrows. Reveals *why* the columns determine everything — the parallelogram rule made literal.
3. **"Linear vs. not" toggle / counterexample card.** A button that tries to add a translation (b-vector) and shows the grid lines staying parallel but the **origin moving off (0,0)** — labeled "this is AFFINE, not linear; this is the bias term in `Wx+b`." Directly ties geometry to the NN layer.
4. **"Rectangular matrix" stretch goal (new interactive `matrix32` or `matrix23`).** A 2×3 or 3×2 lab: show input ℝ³ → output ℝ² (or vice versa) with 3 input basis arrows mapping to 2D, making "columns = images of basis vectors, matrix is m×n" tangible and dimension-changing. Mission: "project 3D onto a plane."
5. **Determinant-as-area readout.** Shade the unit-square image and print its signed area = det; flip the shading color when orientation reverses (det<0). Sets up la-det without leaving this lesson.

## Content improvements (specific learn/ml/deeper text upgrades)
- **Add the definition box** right after the opening sentence: "Linear means two things hold: `T(u+v)=T(u)+T(v)` and `T(cu)=cT(u)`. Geometrically: gridlines stay parallel and evenly spaced, **and the origin never moves.** Everything below follows from these."
- **Add the row view** alongside the column view: "Columns tell you the *geometry* (where î, ĵ land). Rows tell you the *arithmetic*: output coordinate i is row i dotted with the input — `(Mv)_i = Σ_j M[i,j]·v_j`. Same matrix, two readings."
- **Name the collapse case**: one sentence — "If the two columns point along the same line, the matrix squishes all of 2D onto that line (or to a point) — a *collapse*. You'll measure exactly when this happens with the determinant next lesson."
- **Generalize beyond 2×2**: "A 2×2 maps the plane to the plane, but an `m×n` matrix maps ℝⁿ→ℝᵐ — its n columns are the images of the n basis vectors, and it can *change dimension*. Real NN weight matrices are tall/wide, not square."
- **Upgrade the `ml` note**: explicitly say "A layer is `Wx + b`: the matrix `W` does the linear warp (rotate/stretch/shear/project), and the bias `b` *shifts the origin* — that shift is the one thing a linear map can't do, which is precisely why the bias exists." This corrects the implicit "layer = matrix" oversimplification and ties to misconception #2.

## Quiz improvements (specific misconceptions to target; keep questions self-contained — never require recalling lab-graph data)
- **Target the linearity boundary** (currently untested): "Which of these is NOT a linear transformation of the plane? (a) rotation by 30° (b) scaling x by 3 (c) translation by [2,1] / shifting every point right-and-up (d) reflection over the y-axis." Answer: c — it moves the origin. WRONG_WHY for a/b/d: each keeps the origin fixed and preserves the grid; only translation fails `T(0)=0`.
- **Target the collapse/rank case**: "A matrix has columns [1,2] and [2,4]. What does it do to the plane?" Answer: squishes all of 2D onto a single line (the columns are parallel). Distractors: rotates / doubles area / leaves the plane unchanged. Self-contained (columns are given in the question text).
- **Target dimension change**: "An m×n matrix maps which space to which?" Answer: ℝⁿ → ℝᵐ (n columns = images of the n input basis vectors). Distractors flip m/n or assume square.
- **Reinforce row vs. column without lab recall**: keep current Q3 but add a WRONG_WHY nuance for the rows option clarifying rows ARE used to *compute* entries (dot products), just not to *read off* where basis vectors land.
- Q2 "why" wording tweak: change "A pure horizontal stretch" to "scaling the x-axis by 2 (y untouched)".

## Sources (the real URLs you consulted)
- 3Blue1Brown — Linear transformations and matrices: https://www.3blue1brown.com/lessons/linear-transformations/
- 3Blue1Brown — Matrix multiplication as composition (degenerate/collapse + column intuition context): https://www.3blue1brown.com/lessons/matrix-multiplication/
- Georgia Tech Interactive Linear Algebra — Linear transformations (formal definition, matrix↔transformation, m×n, columns = T(eᵢ)): https://textbooks.math.gatech.edu/ila/linear-transformations.html
- DeepAI — Affine Layer (Wx+b, bias = translation, affine vs linear): https://deepai.org/machine-learning-glossary-and-terms/affine-layer
- Wikipedia — Transformation matrix (scaling vs shear vocabulary, standard 2×2 forms): https://en.wikipedia.org/wiki/Transformation_matrix
