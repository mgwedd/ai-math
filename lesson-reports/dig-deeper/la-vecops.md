# la-vecops — Adding & Scaling Vectors

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [Linear combinations, span, and basis vectors — 3Blue1Brown lesson text](https://www.3blue1brown.com/lessons/span/) — The canonical treatment of span as "the set of all linear combinations"; introduces linear dependence/independence and shows that two non-parallel vectors span the whole plane. Directly delivers the biggest conceptual gap in the lesson.
- [Interactive Linear Algebra ch. 2: Vector Equations and Spans (Margalit & Rabinoff)](https://textbooks.math.gatech.edu/ila/) — Free open textbook; defines span formally, links it to solution sets of Ax = b, and covers linear independence with worked examples. Graduate-rigorous and free.
- [Axler, *Linear Algebra Done Right* 4th ed. ch. 1 (open access)](https://linear.axler.net/) — Chapter 1 defines vector spaces axiomatically (closure under addition and scalar multiplication, with the eight axioms); makes precise why "a set closed under these two operations, containing 0" is a subspace. Covers the c=0 → zero-vector case explicitly.
- [Convex combination — Wikipedia](https://en.wikipedia.org/wiki/Convex_combination) — Peer-reviewed reference for the distinction between linear, affine, and convex combinations (non-negative coefficients summing to 1). Critical for understanding softmax-weighted attention as a convex combination of value vectors.

### Watch
- [Linear combinations, span, and basis vectors | Essence of Linear Algebra Ch.2 (3Blue1Brown)](https://www.youtube.com/watch?v=k7RM-ot2NWY) — (~10 min) The canonical visual argument that sweeping a scalar traces a line (span of one vector) and two non-parallel vectors span a plane. Directly fills the span gap in the lesson and shows the zero-vector as the origin.
- [ME564 Lecture 21: Inner product, norm, linear algebra 2D/3D (Steve Brunton, UW Eigensteve)](https://www.youtube.com/watch?v=VnaAKf6lsZA) — (~50 min) Brunton covers vector operations (addition, scaling) grounded in engineering applications, connecting to norms and linear systems. Good complement to the visual 3B1B approach for learners who want the applied angle.

## Science & depth recommendations (to reach master's level)

- **Missing: span** → The single biggest gap. Sweeping scalar `c` across all reals traces a line through the origin — the span of `a`. Two non-parallel vectors span the plane. This is the "set of all linear combinations" concept the lesson names briefly but does not develop. Source: 3Blue1Brown Ch.2 (confirmed).
- **Missing: linear dependence/independence** → Mission 3 in the lab secretly demonstrates that `a` and `b` here are independent (you can't make `c·a = −b` for one scalar unless they're parallel), but the lesson never names this. Independence = no vector in the set is a linear combination of the others = "no redundancy in directions." Grounded in Margalit & Rabinoff §2.
- **Missing: convex vs. affine vs. linear combinations** → Coefficients summing to 1 give an affine combination (a line through both points, not necessarily through origin); non-negative and summing to 1 give a convex combination (weighted average, between the points). Softmax attention outputs a convex combination of value vectors — this is the ML bridge the lesson misses. Source: Wikipedia Convex combination (confirmed).
- **Missing: the c=0 → zero vector case** → The lesson lists stretch/shrink/flip but not the degenerate case c=0 → **0**, which is why every span and every subspace contains the origin. Without this, the vector space axiom for the zero element has no grounding here.
- **Fix the slider label** → "scalar c (stretches a)" understates: |c|<1 compresses, c<0 reflects, c=0 collapses. Label should say "scales/flips a."

## Sources
- [Linear combinations, span, and basis vectors — 3Blue1Brown](https://www.3blue1brown.com/lessons/span/) — canonical text / high-quality explainer, confirmed live.
- [3Blue1Brown Ch.2 YouTube: k7RM-ot2NWY](https://www.youtube.com/watch?v=k7RM-ot2NWY) — high-quality explainer, confirmed live.
- [ME564 Lecture 21 YouTube: VnaAKf6lsZA](https://www.youtube.com/watch?v=VnaAKf6lsZA) — Steve Brunton / UW Eigensteve, confirmed live.
- [Interactive Linear Algebra — Georgia Tech (Margalit & Rabinoff)](https://textbooks.math.gatech.edu/ila/) — canonical text, confirmed live.
- [Axler, Linear Algebra Done Right 4th ed.](https://linear.axler.net/) — canonical graduate text, open access, confirmed live.
- [Convex combination — Wikipedia](https://en.wikipedia.org/wiki/Convex_combination) — peer-reviewed reference, confirmed live.
