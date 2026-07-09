# la-projection — Projection onto a Line

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [MIT 18.06 Lecture 15: Projections onto Subspaces — OCW](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-15-projections-onto-subspaces/) — Strang's canonical lecture on projection: scalar and vector projection, the projection matrix P = A(AᵀA)⁻¹Aᵀ, and the key property P² = P (projecting twice is idempotent). The geometric motivation ("the algebra of finding best-fit solutions begins with projection") exactly matches the lesson's arc from line projection to subspace projection.
- [Dot products and duality — 3Blue1Brown, ch. 9](https://www.3blue1brown.com/lessons/dot-products/) — Shows why the dot product is a projection measurement: w·x is the scalar projection of x onto w (when w is a unit vector). This is the geometric foundation the lesson's `ml` note uses ("a single neuron computes w·x — an unnormalized scalar projection") and the clearest available visual explanation.
- [Strang, "Introduction to Linear Algebra," 5th ed., Ch. 4 (§4.2 Projections)](https://math.mit.edu/~gs/linearalgebra/ila5/indexila5.html) — Chapter 4 covers orthogonality, projections, least squares, and Gram–Schmidt in a unified arc (§4.1–4.4). The projection section derives the formula, the residual orthogonality condition, and the projection matrix in the same notation the lesson uses. The authoritative textbook source for the lesson's three topics.

### Watch
- [MIT 18.06 Lecture 15: Projections onto Subspaces — YouTube](https://www.youtube.com/watch?v=Y_Ac6KiQ1t0) (MIT OpenCourseWare, ~50 min) — Strang's lecture covering the perpendicularity proof (a·r = 0 ↔ Pythagorean theorem), projection matrix derivation, and the geometric picture of subspace projection. Best authoritative video for the lesson topic.
- [Dot products and duality | Essence of Linear Algebra, ch. 9 — 3Blue1Brown](https://www.youtube.com/watch?v=LyGKycYT2v0) (3Blue1Brown, ~14 min) — Gives the visual intuition for the dot product as a projection measurement, including the "shadow" picture the lesson's `deeper` flashlight card references. Connects to the lesson's `ml` note on attention scores.

## Science & depth recommendations (to reach master's level)

- **Projection matrix P = A(AᵀA)⁻¹Aᵀ is in the `deeper` card but not derived.** The lesson states the formula without showing where it comes from: find p = αa to minimize ‖b − p‖², which gives α = (aᵀb)/(aᵀa), then P = aaᵀ/(aᵀa). This derivation is the conceptual bridge to least squares and should be one of the lesson's main learning moments, not a footnote. Grounded in Strang 18.06 Lec. 15.
- **Idempotence P² = P and symmetry Pᵀ = P are not explained.** These two properties characterize projection matrices and are used everywhere in statistics (hat matrix in regression), signal processing, and kernel methods. A `deeper` card deriving P² = P from (A(AᵀA)⁻¹Aᵀ)² = … would be compact and high-value. Grounded in Strang Ch. 4.
- **The `ml` connection to attention scores deserves a formula.** The lesson says "attention scores are dot products (projections of a query onto keys)" but gives no formula. Adding Attention(Q, K) = QKᵀ/√d and noting each row is a set of scalar projections of one query onto all keys would make the connection concrete and memorable. Grounded in the original Transformer paper (Vaswani et al. 2017).
- **The residual stream in transformers (mentioned in `ml`) is a rich analogy.** In residual architectures, each layer adds its output to the stream (x ← x + F(x)), so the "unprocessed" component passes through unchanged — exactly the residual-is-orthogonal-to-projection picture from this lesson. Making this explicit would make the `ml` note much more memorable for transformer learners.

## Sources
- [MIT 18.06, Lecture 15: Projections onto Subspaces — OCW](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-15-projections-onto-subspaces/) — MIT 18.06, canonical course
- [MIT 18.06, Lecture 15 — YouTube](https://www.youtube.com/watch?v=Y_Ac6KiQ1t0) — MIT 18.06, peer-reviewed course video
- [3Blue1Brown, Dot products and duality (ch. 9)](https://www.3blue1brown.com/lessons/dot-products/) — high-quality explainer
- [3Blue1Brown, Dot products and duality — YouTube](https://www.youtube.com/watch?v=LyGKycYT2v0) — high-quality explainer, ~14 min
- [Strang, Introduction to Linear Algebra, 5th ed. — MIT course page](https://math.mit.edu/~gs/linearalgebra/ila5/indexila5.html) — canonical textbook (Wellesley-Cambridge Press, 2016)
