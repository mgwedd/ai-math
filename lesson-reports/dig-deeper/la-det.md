# la-det — The Determinant

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [The determinant — 3Blue1Brown lesson text](https://www.3blue1brown.com/lessons/determinant/) — Canonical visual treatment: area/volume as the core idea, geometric derivation of why `ad−bc` is the signed area of the parallelogram, and the multiplicative law `det(AB) = det(A)det(B)` derived from "areas scale compose." Closes the lesson's geometric derivation gap.
- [MIT 18.06 Lecture 18: Properties of Determinants (Strang, OCW)](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-18-properties-of-determinants/) — Three defining properties → seven derived properties including `det(AB) = det(A)det(B)` and `det(Aⁿ) = det(A)ⁿ`. Multilinearity and why `det(A+B) ≠ det(A)+det(B)` are covered. The authoritative source for the lesson's missing multiplicative law.
- [Axler, *Linear Algebra Done Right* 4th ed. ch. 10 (open access)](https://linear.axler.net/) — Determinants as alternating multilinear forms — the algebraically clean graduate treatment that avoids the Sarrus/cofactor expansion trap. Covers the product rule and relation to eigenvalues.
- [John D. Cook: "Making a singular matrix non-singular"](https://www.johndcook.com/blog/2012/06/13/matrix-condition-number/) — Highly-cited practitioner post distinguishing |det| from the condition number. Shows by scaling that det(kA) = kⁿ·det(A) while conditioning is unchanged — directly fixes the `ml` note's erroneous "near-zero det = unstable" claim.

### Watch
- [The determinant | Essence of Linear Algebra Ch.6 (3Blue1Brown)](https://www.youtube.com/watch?v=Ip3X9LOh2dk) — (~11 min) The definitive visual proof that determinant = signed area scaling; shows why det < 0 means orientation flip and det = 0 means collapse onto a line. Includes an elegant geometric argument for `ad−bc`. Pairs directly with the lesson's lab.
- [MIT 18.06 Lecture 18: Properties of Determinants (Strang, YouTube)](https://www.youtube.com/watch?v=srxexLishgY) — (~50 min) Strang derives all determinant properties from three axioms, including `det(AB) = det(A)det(B)` and multilinearity vs. non-additivity. The rigorous companion to 3B1B's geometric argument. (Note: the direct YouTube link for Lecture 18 is embedded within the OCW page confirmed above; the playlist link is https://www.youtube.com/playlist?list=PL49CF3715CB9EF31D.)
- [ME564 Lecture 21: Linear algebra — inner product, norm (Steve Brunton, Eigensteve)](https://www.youtube.com/watch?v=VnaAKf6lsZA) — (~50 min) Brunton's engineering-math context for determinants within systems of equations and invertibility; pairs with the `ml` note's connections to singular systems and normalizing flows.

## Science & depth recommendations (to reach master's level)

- **Fix the `ml` note's determinant-vs-conditioning conflation** → "Near-zero determinants mean numerically unstable training" is factually wrong. The determinant scales as `kⁿ` when the matrix is scaled by `k`, while numerical stability (the condition number) is invariant to scaling. The correct claim is: det = 0 is exact/algebraic non-invertibility; the condition number (ratio of largest to smallest singular value) is the numerical measure. Source: John D. Cook post (confirmed live).
- **Missing: the multiplicative law `det(AB) = det(A)det(B)`** → One of the most-used determinant facts: areas scale compose. It gives `det(A⁻¹) = 1/det(A)` and `det(Aⁿ) = det(A)ⁿ`, and is why log-det is additive across normalizing-flow layers. Source: Strang Lecture 18, OCW (confirmed live).
- **Missing: det = product of eigenvalues** → The bridge to the next lessons on eigenvalues and SVD. State it as a teaser: "det equals the product of the eigenvalues — which is why det = 0 exactly when at least one eigenvalue is zero (the matrix squashes a whole direction to nothing)."
- **Missing: `det(A+B) ≠ det(A)+det(B)` — the non-additivity** → A classic exam trap and a real source of bugs. The determinant is multilinear in the rows, but this does not mean additive over whole matrices. One sentence prevents a persistent error. Source: Strang Lecture 18 (confirmed live).
- **Name the Jacobian in the flows sentence** → The lesson says "log-det appears in normalizing flows" but never names the Jacobian. The correct statement: `log p(x) = log p(z) + log|det J|` where J is the Jacobian of the transform; the multiplicative law makes log-det additive across composed flow layers.

## Sources
- [The determinant — 3Blue1Brown](https://www.3blue1brown.com/lessons/determinant/) — canonical text / high-quality explainer, confirmed live.
- [3Blue1Brown Ch.6 YouTube: Ip3X9LOh2dk](https://www.youtube.com/watch?v=Ip3X9LOh2dk) — high-quality explainer, confirmed live.
- [MIT 18.06 Lecture 18 OCW page](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-18-properties-of-determinants/) — MIT 18.06, confirmed live.
- [MIT 18.06 full lecture playlist (Strang)](https://www.youtube.com/playlist?list=PL49CF3715CB9EF31D) — MIT 18.06, confirmed live.
- [ME564 Lecture 21 YouTube: VnaAKf6lsZA](https://www.youtube.com/watch?v=VnaAKf6lsZA) — Steve Brunton / UW Eigensteve, confirmed live.
- [John D. Cook: determinant vs. condition number](https://www.johndcook.com/blog/2012/06/13/matrix-condition-number/) — high-quality practitioner explainer, confirmed live.
- [Axler, Linear Algebra Done Right 4th ed.](https://linear.axler.net/) — canonical graduate text, open access, confirmed live.
