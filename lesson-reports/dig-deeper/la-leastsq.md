# la-leastsq — Least Squares = Projection

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [MIT 18.06 Lecture 16: Projection Matrices and Least Squares — OCW](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-16-projection-matrices-and-least-squares/) — Strang's lecture deriving least squares as projection: b is projected onto col(A), the residual is orthogonal to col(A), and setting Aᵀ(Ax−b)=0 gives the normal equations AᵀAx̂=Aᵀb. Exactly the arc the lesson follows. The authoritative source for every step of the derivation.
- [MIT 18.065 Lecture 9: Four Ways to Solve Least Squares — OCW](https://ocw.mit.edu/courses/18-065-matrix-methods-in-data-analysis-signal-processing-and-machine-learning-spring-2018/resources/lecture-9-four-ways-to-solve-least-squares-problems/) — Strang's graduate-level treatment showing four approaches to least squares: normal equations (AᵀAx̂=Aᵀb), QR (x̂=R⁻¹Qᵀb), pseudoinverse (x̂=A⁺b), and ridge regularization (limit of (AᵀA+δI)⁻¹Aᵀb as δ→0). Directly connects to SVD and Gram–Schmidt, bridging the three projection-lesson arc.
- [Stanford EE263 Lecture 5: Least Squares — Stephen Boyd](https://see.stanford.edu/materials/lsoeldsee263/05-ls.pdf) — Boyd's tightly-written lecture notes on least squares: geometric derivation (projection of b onto col(A)), the normal equations, and the geometric interpretation "Ax̂ is the point in range(A) closest to b." Also covers BLUE (best linear unbiased estimator) and weighted least squares — the statistical grounding the lesson's linear-regression tie-back benefits from.

### Watch
- [MIT 18.06 Lecture 16: Projection Matrices and Least Squares — YouTube](https://www.youtube.com/watch?v=osh80YCg_GM) (MIT OpenCourseWare, ~50 min) — Strang's complete walkthrough: why linear regression is a projection, how Aᵀr = 0 yields AᵀAx̂ = Aᵀb, and how to fit a line to data via the normal equations. The best single video for connecting the "shadow onto col(A)" picture to the algebra.
- [MIT 18.065 Playlist — Strang, Matrix Methods](https://www.youtube.com/playlist?list=PLUl4u3cNGP63oMNUHXqIUcrkS2PivhN3k) (MIT OCW, ~50 min/lecture) — Lecture 9 (four ways) and surrounding lectures connect least squares to SVD (pseudoinverse via A⁺=VΣ⁺Uᵀ) and ridge regression. Gives the graduate-level unified view the lesson points toward.

## Science & depth recommendations (to reach master's level)

- **The normal equations need a derivation, not just a statement.** The lesson states AᵀAx̂ = Aᵀb but does not show why: the residual b − Ax̂ must be perpendicular to every column of A (it lies in the left null space), so Aᵀ(b−Ax̂)=0. This single step connects projection geometry to the matrix algebra of least squares and is the lesson's core insight. Grounded in Strang 18.06 Lec. 16.
- **AᵀA invertibility condition is not stated.** The formula x̂ = (AᵀA)⁻¹Aᵀb requires AᵀA to be invertible, which happens precisely when A has full column rank (no null space). When A is rank-deficient, there are infinitely many solutions — this is the connection back to the rank lesson. A one-sentence flag prevents the all-too-common "normal equations failed, why?" confusion. Grounded in Strang 18.06 and Boyd EE263.
- **Pseudoinverse and SVD connection is the natural capstone.** x̂ = A⁺b = VΣ⁺Uᵀb is the most general and numerically stable solution; Σ⁺ inverts only the nonzero singular values and simply zeros the rest. This ties the lesson to both la-svd (singular values) and la-gramschmidt (QR as Gram–Schmidt). A `deeper` card or `ml` note mention would complete the arc. Grounded in Strang 18.065 Lec. 9.
- **The statistical framing (linear regression as projection) could be made more explicit.** Fitting the line ŷ = ax + b through data is literally projecting the vector of observations b onto the column space of A (the Vandermonde-like matrix of [x 1] columns). Making this explicit turns the abstract projection matrix into a concrete data-science operation the learner has already done. Grounded in Strang 18.06 Lec. 16 and Boyd EE263 Lec. 5.

## Sources
- [MIT 18.06, Lecture 16: Projection Matrices and Least Squares — OCW](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-16-projection-matrices-and-least-squares/) — MIT 18.06, canonical course
- [MIT 18.06, Lecture 16 — YouTube](https://www.youtube.com/watch?v=osh80YCg_GM) — MIT 18.06, peer-reviewed course video
- [MIT 18.065, Lecture 9: Four Ways to Solve Least Squares — OCW](https://ocw.mit.edu/courses/18-065-matrix-methods-in-data-analysis-signal-processing-and-machine-learning-spring-2018/resources/lecture-9-four-ways-to-solve-least-squares-problems/) — MIT 18.065, graduate-level
- [Stanford EE263, Lecture 5: Least Squares — Boyd](https://see.stanford.edu/materials/lsoeldsee263/05-ls.pdf) — Stanford EE263, canonical text (Boyd & Vandenberghe tradition)
- [MIT 18.065 YouTube playlist](https://www.youtube.com/playlist?list=PLUl4u3cNGP63oMNUHXqIUcrkS2PivhN3k) — MIT 18.065, peer-reviewed course
