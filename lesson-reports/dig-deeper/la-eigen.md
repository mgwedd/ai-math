# la-eigen — Eigenvectors & Eigenvalues

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [Eigenvectors and eigenvalues — 3Blue1Brown lesson](https://www.3blue1brown.com/lessons/eigenvalues/) — Interactive companion to ch. 14; covers the characteristic-polynomial method (det(M−λI)=0), eigenbasis simplification (the Fibonacci example), and special cases (rotation → no real eigenvectors; shear → defective). Fills the biggest conceptual gap in the lesson.
- [MIT 18.06 Lecture 21: Eigenvalues and Eigenvectors — OCW](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-21-eigenvalues-and-eigenvectors/) — Strang's canonical treatment: characteristic polynomial, trace = Σλ, det = Πλ, diagonalization M = PDP⁻¹. Authoritative, matches the lesson's example matrix exactly.
- [MIT 18.065 Lecture 4: Eigenvalues and Eigenvectors — OCW](https://ocw.mit.edu/courses/mathematics/18-065-matrix-methods-in-data-analysis-signal-processing-and-machine-learning-spring-2018/video-lectures/lecture-4-eigenvalues-and-eigenvectors/) — Strang's graduate follow-up from "Matrix Methods in Data Analysis" (2018); connects eigenvalues to symmetric positive-definite matrices, PCA, and covariance matrices. The bridge from the lesson to master's-level ML usage.
- [Change of basis — 3Blue1Brown lesson, ch. 13](https://www.3blue1brown.com/lessons/change-of-basis/) — Essential prerequisite to eigenbasis; shows how M = PDP⁻¹ is literally a change of coordinates into the eigendirections. Understanding this closes the diagonalization gap and reveals why PCA's axes being orthogonal matters.

### Watch
- [Eigenvectors and eigenvalues | Essence of Linear Algebra, ch. 14 — 3Blue1Brown](https://www.youtube.com/watch?v=PFDu9oVAE-g) (3Blue1Brown, ~17 min) — Best visual treatment of eigenvectors as fixed-span directions; includes the characteristic polynomial, eigenbasis motivation, and the rotation-has-no-real-eigenvectors case. Fills the lesson's existence/non-existence gap with unforgettable animation.
- [MIT 18.065 Lecture 4 — Strang on YouTube](https://www.youtube.com/playlist?list=PLUl4u3cNGP63oMNUHXqIUcrkS2PivhN3k) (MIT 18.065 playlist, lecture 4, ~50 min) — Strang connects eigenvalues to symmetric matrices, the spectral theorem, and positive definiteness — the rigorous foundation for why PCA's covariance eigendecomposition works.

## Science & depth recommendations (to reach master's level)

- **Characteristic polynomial is absent.** Eigenvalues are asserted, never derived. Adding "solve det(M−λI)=0: for [[2,1],[1,2]] that's (2−λ)²−1=0, giving λ=3,1" wires the lesson to the determinant lesson and removes the "magic numbers" feel. Grounded in Strang MIT 18.06 Lec. 21.
- **The spectral theorem is the missing bridge to PCA.** The lesson uses a symmetric matrix and gestures at covariance matrices but never states the theorem: symmetric ⇒ real eigenvalues + orthogonal eigenvectors. Without it the learner cannot explain *why* PCA's principal axes are perpendicular. Add one sentence; ground in 3B1B lesson or Strang 18.065 Lec. 4.
- **Existence caveat is missing.** "Special directions a matrix can't rotate — only stretch" implies all matrices have real eigenvectors. Rotations (λ = ±i) and shears (defective: one repeated eigenvalue, insufficient eigenvectors) are the canonical counterexamples a master's learner must know. Grounded in 3B1B ch. 14 and the characteristic polynomial treatment.
- **Diagonalization / M = PDP⁻¹ payoff is missing.** This is why eigenvectors matter beyond curiosity: M^k = PD^kP⁻¹ (raise eigenvalues to a power), which governs PageRank convergence rate (λ₂/λ₁ per step), RNN stability (|λ|>1 explodes), and PCA whitening. Add a `deeper` card. Grounded in Strang 18.06 Lec. 22.
- **Power iteration narrative needs tightening.** The phrase "every other vector gets rotated toward the dominant eigendirection" applies to repeated application (M^k), not a single multiply. Change to "repeatedly applying M pulls almost any vector toward the dominant direction" — the exact PageRank mechanism. Grounded in Strang 18.06.

## Sources
- [3Blue1Brown, Eigenvectors and eigenvalues (ch. 14)](https://www.3blue1brown.com/lessons/eigenvalues/) — high-quality explainer, canonical visual treatment
- [3Blue1Brown, Change of basis (ch. 13)](https://www.3blue1brown.com/lessons/change-of-basis/) — high-quality explainer, canonical visual treatment
- [3Blue1Brown, Eigenvectors and eigenvalues YouTube](https://www.youtube.com/watch?v=PFDu9oVAE-g) — high-quality explainer, ~17 min
- [MIT 18.06, Lecture 21: Eigenvalues and Eigenvectors — OCW](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-21-eigenvalues-and-eigenvectors/) — MIT 18.06, canonical text
- [MIT 18.065, Lecture 4: Eigenvalues and Eigenvectors — OCW](https://ocw.mit.edu/courses/mathematics/18-065-matrix-methods-in-data-analysis-signal-processing-and-machine-learning-spring-2018/video-lectures/lecture-4-eigenvalues-and-eigenvectors/) — MIT 18.065, graduate-level
- [MIT 18.065, YouTube playlist](https://www.youtube.com/playlist?list=PLUl4u3cNGP63oMNUHXqIUcrkS2PivhN3k) — MIT 18.065, peer-reviewed course
