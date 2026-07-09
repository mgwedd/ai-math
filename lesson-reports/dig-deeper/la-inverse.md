# la-inverse — Solving Ax = b & the Inverse

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [Inverse matrices, column space and null space — 3Blue1Brown lesson text](https://www.3blue1brown.com/lessons/inverse-matrices/) — Covers the full trichotomy of Ax = b (unique / infinitely many / no solution) via the column space and null space, and explains why singular A can still have solutions when b lies in the column space. Directly fills the lesson's biggest gap (the missing "infinitely many" branch and the null space).
- [Interactive Linear Algebra §6.5: The Method of Least Squares (Margalit & Rabinoff)](https://math.libretexts.org/Bookshelves/Linear_Algebra/Interactive_Linear_Algebra_(Margalit_and_Rabinoff)/06%3A_Orthogonality/6.5%3A_The_Method_of_Least_Squares) — Free open textbook chapter; derives the normal equations AᵀAx = Aᵀb from the residual-perpendicular-to-col(A) geometry. The authoritative source for the lesson's least-squares claim.
- [Moore–Penrose Inverse — Wikipedia](https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse) — Graduate-rigorous treatment of the pseudoinverse A⁺ as the unifier: over-determined (least-squares) and under-determined (minimum-norm) cases. Shows A⁺ = (AᵀA)⁻¹Aᵀ for full column-rank. Bridges to the SVD lessons in the curriculum.
- [Condition number — Wikipedia](https://en.wikipedia.org/wiki/Condition_number) — Defines κ(A) = ‖A‖·‖A⁻¹‖ (or equivalently σ_max / σ_min), explains why det ≠ 0 does not imply numerical safety, and why forming A⁻¹ explicitly amplifies rounding error by ~κ. The "solve, don't invert" principle needs this grounding.

### Watch
- [Inverse matrices, column space and null space | Essence of Linear Algebra Ch.7 (3Blue1Brown)](https://www.youtube.com/watch?v=uQhTuRlWMxw) — (~12 min) The canonical geometric treatment: inverse as "undoing" a transformation, column space as the reachable targets, null space as the collapsed directions. Shows all three solution-count cases (unique, infinitely many, none) visually. The single most important watch for this lesson's gaps.
- [MIT 18.06 Lecture 6: Column Space and Nullspace (Strang, YouTube)](https://www.youtube.com/watch?v=8o5Cmfpeo6g) — (~45 min) Strang defines column space and null space formally, proves when Ax = b is solvable (b ∈ col(A)), and describes the complete solution structure (particular + null-space vectors). Directly delivers the missing conceptual gaps.
- [MIT 18.06 Lecture 3: Multiplication and Inverse Matrices (Strang, YouTube)](https://www.youtube.com/watch?v=FX4C-JpTFgY) — (~50 min) Strang's treatment of matrix inverses: the 2×2 formula, why Gauss–Jordan (not explicit inversion) is the numerical method, and properties of inverses including (AB)⁻¹ = B⁻¹A⁻¹. The authoritative source for the "solve, don't invert" mantra.

## Science & depth recommendations (to reach master's level)

- **Missing: the full solution trichotomy** → The lesson only covers two cases (unique / no solution for singular A with b off the line). The third — infinitely many solutions when det = 0 AND b lies in the column space — is never stated in the `learn` text, though the quiz touches it. Add: "When det = 0 the system has either no solution (b off the column space) or infinitely many (b on the column space) — never exactly one." Source: 3Blue1Brown Ch.7 (confirmed live).
- **Missing: null space** → The lesson refers to "the direction that got squashed to zero" without naming it. The null space (kernel) of A is the set of all x with Ax = 0; when it is non-trivial (det = 0), solutions are non-unique because any null-space vector can be added to a particular solution. Naming it seeds rank–nullity and the SVD lessons. Source: Strang Lecture 6 (confirmed live).
- **Missing: column space as the universal solvability condition** → "Ax = b is solvable ⟺ b ∈ col(A)" is the cleanest statement that works for any A, square or not. The lesson only gives the det test (square case only). Source: Strang Lecture 6 (confirmed live).
- **Missing: least squares for tall (over-determined) A** → The `ml` note names regression normal equations but without the geometry: residual b − Ax is perpendicular to col(A) at the minimum, giving AᵀAx = Aᵀb. The lab's singular-A picture is the square/rank-deficient case, not the tall/over-determined case where regression lives. Source: Margalit & Rabinoff §6.5 (confirmed live).
- **Add conditioning caveat to the "solve, don't invert" card** → det ≠ 0 is binary invertibility; a near-singular matrix (large κ) amplifies rounding errors by ~κ even when technically invertible. LU/QR factor-and-solve keeps this controlled. Source: Condition number Wikipedia (confirmed live).

## Sources
- [Inverse matrices, column space and null space — 3Blue1Brown](https://www.3blue1brown.com/lessons/inverse-matrices/) — canonical text / high-quality explainer, confirmed live.
- [3Blue1Brown Ch.7 YouTube: uQhTuRlWMxw](https://www.youtube.com/watch?v=uQhTuRlWMxw) — high-quality explainer, confirmed live.
- [MIT 18.06 Lecture 6 YouTube: 8o5Cmfpeo6g](https://www.youtube.com/watch?v=8o5Cmfpeo6g) — MIT 18.06, confirmed live.
- [MIT 18.06 Lecture 3 YouTube: FX4C-JpTFgY](https://www.youtube.com/watch?v=FX4C-JpTFgY) — MIT 18.06, confirmed live.
- [MIT 18.06 Lecture 6 OCW page](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-6-column-space-and-nullspace/) — MIT 18.06, confirmed live.
- [Interactive Linear Algebra §6.5 Least Squares (Margalit & Rabinoff)](https://math.libretexts.org/Bookshelves/Linear_Algebra/Interactive_Linear_Algebra_(Margalit_and_Rabinoff)/06%3A_Orthogonality/6.5%3A_The_Method_of_Least_Squares) — canonical text, confirmed live.
- [Moore–Penrose Inverse — Wikipedia](https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse) — confirmed live.
- [Condition number — Wikipedia](https://en.wikipedia.org/wiki/Condition_number) — confirmed live.
