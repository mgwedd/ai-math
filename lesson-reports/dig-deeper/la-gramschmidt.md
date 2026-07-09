# la-gramschmidt — Gram–Schmidt: Straighten a Basis

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [MIT 18.06 Lecture 17: Orthogonal Matrices and Gram–Schmidt — OCW](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-17-orthogonal-matrices-and-gram-schmidt/) — Strang's canonical treatment: orthonormal bases, the Gram–Schmidt procedure step-by-step, and QR decomposition A = QR. Shows why "many calculations become simpler when performed using orthonormal vectors" and why Q makes the least-squares formula x̂ = Rˉ¹Qᵀb numerically superior to the normal equations. The authoritative companion to this lesson.
- [MIT 18.065 Lecture 9: Four Ways to Solve Least Squares — OCW](https://ocw.mit.edu/courses/18-065-matrix-methods-in-data-analysis-signal-processing-and-machine-learning-spring-2018/resources/lecture-9-four-ways-to-solve-least-squares-problems/) — Strang's graduate-level treatment showing QR as the second of four least-squares methods: x̂ = R⁻¹Qᵀb is numerically stable where normal equations may fail (when AᵀA is ill-conditioned). Directly connects Gram–Schmidt to the previous lesson (la-leastsq) and the lesson arc's climax.
- [Stanford EE263 Lecture 4: Orthonormal Sets and QR — Stephen Boyd](https://see.stanford.edu/materials/lsoeldsee263/04-qr.pdf) — Boyd's lecture notes covering orthonormal sets of vectors, Gram–Schmidt, QR decomposition, and the connection to least squares. Compact, rigorous, and ties to real applications (signal processing, control). A clean graduate-level source complementary to Strang.

### Watch
- [MIT 18.06 Lecture 17: Orthogonal Matrices and Gram–Schmidt — YouTube](https://www.youtube.com/watch?v=0MtwqhIwdrI) (MIT OpenCourseWare, ~50 min) — Strang's lecture walking through the procedure column-by-column, with explicit numerics for a 3-column example. Shows exactly how each orthogonalization step is a projection residual — the lesson's key insight made concrete.
- [Gram–Schmidt Orthogonalization and QR Factorization — YouTube](https://www.youtube.com/watch?v=0Z1XWXakToM) (MIT lecture, ~45 min) — A worked-example-heavy lecture showing Gram–Schmidt on 2D and 3D cases with numerical verification that the resulting Q has orthonormal columns. Good complement to Strang's theoretical treatment for learners who want to see more concrete arithmetic.

## Science & depth recommendations (to reach master's level)

- **Why QR is numerically superior to normal equations should be stated.** The lesson teaches Gram–Schmidt as an elegant procedure but doesn't say when to use QR over normal equations. The key fact: AᵀA squares the condition number of A (κ(AᵀA) = κ(A)²), so when A is even mildly ill-conditioned, normal equations amplify floating-point errors badly. QR avoids squaring the condition number. This is why NumPy's lstsq uses QR/SVD internally. Grounded in Strang 18.065 Lec. 9.
- **Classical vs. modified Gram–Schmidt distinction is worth one sentence.** Classical Gram–Schmidt is numerically unstable (round-off errors can destroy orthogonality in floating point); modified Gram–Schmidt (reorthogonalize against already-computed qᵢ) is what practitioners use. Flagging this teaches the learner that the textbook algorithm and the production algorithm differ — a real-world gotcha. Grounded in the UCI modified Gram–Schmidt notes.
- **Q's columns form an orthonormal basis for the column space — and the connection to SVD.** The Q from QR is the same idea as the U (or V) from SVD: orthonormal columns spanning a subspace. Strang 18.065 Lec. 9 explicitly shows that the four least-squares methods converge on the same answer via different decompositions (QR, SVD, pseudoinverse). Making this explicit closes the three-lesson projection arc (la-projection → la-leastsq → la-gramschmidt) into a unified picture.
- **Orthonormal columns of Q make QᵀQ = I, which simplifies everything.** The lesson teaches this but should emphasize *why*: QᵀQ = I is what makes x̂ = Rˉ¹Qᵀb so clean (Qᵀ inverts Q without a matrix solve), and it's why PCA's principal components can be freely projected onto — each component does not "contaminate" the others. Grounded in Strang 18.06 Lec. 17.

## Sources
- [MIT 18.06, Lecture 17: Orthogonal Matrices and Gram–Schmidt — OCW](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-17-orthogonal-matrices-and-gram-schmidt/) — MIT 18.06, canonical course
- [MIT 18.06, Lecture 17 — YouTube](https://www.youtube.com/watch?v=0MtwqhIwdrI) — MIT 18.06, peer-reviewed course video
- [MIT 18.065, Lecture 9: Four Ways to Solve Least Squares — OCW](https://ocw.mit.edu/courses/18-065-matrix-methods-in-data-analysis-signal-processing-and-machine-learning-spring-2018/resources/lecture-9-four-ways-to-solve-least-squares-problems/) — MIT 18.065, graduate-level
- [Stanford EE263, Lecture 4: QR and Orthonormal Sets — Boyd](https://see.stanford.edu/materials/lsoeldsee263/04-qr.pdf) — Stanford EE263, canonical text
- [Gram–Schmidt Orthogonalization and QR Factorization — YouTube](https://www.youtube.com/watch?v=0Z1XWXakToM) — MIT lecture, high-quality explainer
- [MIT 18.065 YouTube playlist](https://www.youtube.com/playlist?list=PLUl4u3cNGP63oMNUHXqIUcrkS2PivhN3k) — MIT 18.065, peer-reviewed course
