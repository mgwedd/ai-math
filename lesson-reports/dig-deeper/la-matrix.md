# la-matrix — Matrices = Transformations

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [Linear transformations and matrices — 3Blue1Brown lesson text](https://www.3blue1brown.com/lessons/linear-transformations/) — Canonical "columns are where basis vectors land" derivation; introduces the two linearity axioms (T(u+v)=T(u)+T(v) and T(cu)=cT(u)), the origin-stays-fixed constraint, and the degenerate column-parallel collapse case. Directly delivers the lesson's three biggest missing concepts.
- [Interactive Linear Algebra ch. 3: Matrix Transformations and Linear Transformations (Margalit & Rabinoff)](https://textbooks.math.gatech.edu/ila/) — Free Georgia Tech open textbook; covers formal linearity definition, m×n matrices mapping ℝⁿ → ℝᵐ, and the Invertible Matrix Theorem. Adds the non-square / dimension-changing framing the lesson omits.
- [Transformation matrix — Wikipedia](https://en.wikipedia.org/wiki/Transformation_matrix) — Covers all standard 2×2 forms (rotation, scaling, shear, reflection), standard vocabulary and sign conventions. Useful reference for distinguishing stretch from shear.
- [Axler, *Linear Algebra Done Right* 4th ed. ch. 3 (open access)](https://linear.axler.net/) — The rigorous linear maps chapter; defines linear maps axiomatically, covers null space, range, and the Fundamental Theorem of Linear Maps (rank–nullity). Builds the formal scaffolding behind "columns are where basis vectors land."

### Watch
- [Linear transformations and matrices | Essence of Linear Algebra Ch.3 (3Blue1Brown)](https://www.youtube.com/watch?v=kYB8IZa5AuE) — (~11 min) The must-watch companion to this lesson. Shows gridlines-stay-parallel as the visual test for linearity, derives the column rule by plugging î and ĵ into T(x,y) = x·T(î) + y·T(ĵ), and demonstrates the collapse (rank-drop) case when columns are parallel. Precisely what the lesson needs to add.
- [MIT 18.06 Lecture 1: The Geometry of Linear Equations (Strang)](https://www.youtube.com/watch?v=J7DzL2_Na80) — (~40 min) Strang's column-picture framing: matrices as collections of columns, Ax as a linear combination of columns. The foundation for why the column view of matrices is the right geometric handle.
- [MIT 18.065 Lecture 1: The Column Space of A Contains All Vectors Ax (Strang, 2018)](https://www.youtube.com/watch?v=YiqIkSHSmyc) — (~45 min) Strang's updated "Matrix Methods in Data Analysis" opening lecture; treats matrices as data-processing objects and builds the column-space view for ML applications.

## Science & depth recommendations (to reach master's level)

- **Missing: the two linearity axioms** → The lesson uses the word "linear" without defining it. Add: a transformation is linear iff `T(u+v) = T(u)+T(v)` and `T(cu) = cT(u)`. These two properties are what force gridlines to stay parallel and the origin to stay fixed — the column rule is a *consequence*, not the definition. Source: 3Blue1Brown Ch.3 lesson text (confirmed).
- **Missing: the origin-stays-fixed constraint** → Linear maps pin the origin: `T(0) = 0`. Translations move the origin and are therefore *affine*, not linear — which is exactly why neural network layers are `Wx + b` (the bias `b` is the translation term that linear maps cannot do). This is the highest-value addition for an ML learner.
- **Missing: the collapse/rank-drop case** → When columns are linearly dependent, the matrix collapses 2D onto a line (or a point). The sliders in the lab can produce this, but it is never named. One sentence — "if the columns point along the same line (det = 0), everything collapses to that line" — seeds the determinant lesson.
- **Missing: non-square matrices** → The lesson equates "matrix" with "square / same-space map." An m×n matrix maps ℝⁿ → ℝᵐ and can change dimension. NN weight matrices are almost never square. At minimum, name the general case.
- **Upgrade the `ml` note** → "A layer is `Wx + b`" — explicitly say the matrix `W` does the linear warp, and the bias `b` shifts the origin (the one thing a linear map cannot do). This ties directly to the missing axiom and corrects the implicit "layer = matrix" oversimplification.

## Sources
- [Linear transformations and matrices — 3Blue1Brown](https://www.3blue1brown.com/lessons/linear-transformations/) — canonical text / high-quality explainer, confirmed live.
- [3Blue1Brown Ch.3 YouTube: kYB8IZa5AuE](https://www.youtube.com/watch?v=kYB8IZa5AuE) — high-quality explainer, confirmed live.
- [MIT 18.06 Lecture 1 YouTube: J7DzL2_Na80](https://www.youtube.com/watch?v=J7DzL2_Na80) — MIT 18.06, confirmed live.
- [MIT 18.065 Lecture 1 YouTube: YiqIkSHSmyc](https://www.youtube.com/watch?v=YiqIkSHSmyc) — MIT 18.065 (Strang, 2018), confirmed live.
- [Interactive Linear Algebra — Georgia Tech (Margalit & Rabinoff)](https://textbooks.math.gatech.edu/ila/) — canonical text, confirmed live.
- [Transformation matrix — Wikipedia](https://en.wikipedia.org/wiki/Transformation_matrix) — confirmed live.
- [Axler, Linear Algebra Done Right 4th ed.](https://linear.axler.net/) — canonical graduate text, open access, confirmed live.
