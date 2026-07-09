# la-vectors — Vectors: Arrows & Data

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [Vectors, what even are they? — 3Blue1Brown lesson text](https://www.3blue1brown.com/lessons/vectors/) — Canonical three-perspective framing (physics arrow, CS list, math abstract add/scale object); explains why translating between the views is the *skill*. Directly addresses the "ordered list" reductionism the lesson currently has.
- [Interactive Linear Algebra ch. 2: Vectors (Margalit & Rabinoff, Georgia Tech)](https://textbooks.math.gatech.edu/ila/) — Free open textbook; covers vector equations, spans, and basis vectors with embedded interactive figures. The section "Vectors" through "Vector Equations and Spans" builds the basis-dependence of coordinates the lesson omits.
- [Johnson–Lindenstrauss Lemma — Wikipedia](https://en.wikipedia.org/wiki/Johnson%E2%80%93Lindenstrauss_lemma) — Graduate-level treatment of dimension reduction and the concentration-of-measure result that makes high-dimensional geometry counterintuitive (near-orthogonality of random vectors). The key ML payoff the lesson skips.
- [Axler, *Linear Algebra Done Right* 4th ed. (open access)](https://linear.axler.net/) — Canonical graduate text; Chapter 1 rigorously defines vector spaces via the add/scale axioms, covering what makes something a vector space beyond "list of numbers." Creative Commons BY-NC, freely available.

### Watch
- [Vectors, what even are they? | Essence of Linear Algebra Ch.1 (3Blue1Brown)](https://www.youtube.com/watch?v=fNk_zzaMoSs) — (~9 min) The three-perspective opening: physics arrow, CS coordinate, math abstract object. Best visual intuition for why magnitude = Pythagorean theorem, and what a unit vector looks like geometrically. Pairs directly with this lesson.
- [MIT 18.06 Lecture 1: The Geometry of Linear Equations (Strang)](https://www.youtube.com/watch?v=J7DzL2_Na80) — (~40 min) Strang's row-picture vs. column-picture opening; shows vectors as columns early and motivates the column-combination view that underpins all later lessons. OCW canonical, MIT 18.06.
- [ME564 Lecture 21: Inner product, norm, and linear algebra in 2D/3D (Steve Brunton, UW Eigensteve)](https://www.youtube.com/watch?v=VnaAKf6lsZA) — (~50 min) Engineering-math treatment covering inner product, norm (L2), and the geometric meaning of vector operations; situates them within physics and data science. Brunton is exceptional at tying theory to application.

## Science & depth recommendations (to reach master's level)

- **Missing: three-perspective definition of a vector** → Add a sentence presenting all three readings — arrow, coordinate list, abstract add/scale object — and stress that coordinates only exist *relative to a chosen basis and origin*. Ground in the 3Blue1Brown Ch.1 framing. Without this, the lesson teaches "list of numbers" as the definition rather than one lens.
- **Missing: normalization formula** → State `û = v / ‖v‖` explicitly. The lesson defines unit vectors but never tells learners how to *make* one. This is the load-bearing operation for cosine similarity, normalized embeddings, and layer normalization in the next lessons.
- **Missing: L2 vs other norms** → Call `√(x²+y²)` the *Euclidean (L2) norm* and acknowledge L1 (Manhattan) and L∞ exist. The quiz already invokes "Manhattan distance" as a distractor; naming L2 closes the gap.
- **Missing: basis-dependence of coordinates** → The numbers `[3, 2]` only mean "3 right, 2 up" relative to the standard basis î=[1,0], ĵ=[0,1]. A one-line teaser seeds change-of-basis and eigenvectors, the payoff concepts of later lessons.
- **Missing: high-dimensional near-orthogonality** → Two random vectors in high dimensions are almost always nearly perpendicular; volume concentrates near the "equator." This is why ML models use cosine similarity rather than raw distance, and is the most surprising fact about vectors for a newcomer. Grounded in the Johnson–Lindenstrauss lemma (Wikipedia URL confirmed).

## Sources
- [Vectors, what even are they? — 3Blue1Brown](https://www.3blue1brown.com/lessons/vectors/) — canonical text, high-quality explainer (3Blue1Brown series).
- [3Blue1Brown Ch.1 YouTube: fNk_zzaMoSs](https://www.youtube.com/watch?v=fNk_zzaMoSs) — high-quality explainer, confirmed live.
- [MIT 18.06 Lecture 1 YouTube: J7DzL2_Na80](https://www.youtube.com/watch?v=J7DzL2_Na80) — MIT 18.06, confirmed live.
- [MIT 18.06 Lecture 1 OCW page](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-1-the-geometry-of-linear-equations/) — MIT 18.06, confirmed live.
- [ME564 Lecture 21 YouTube: VnaAKf6lsZA](https://www.youtube.com/watch?v=VnaAKf6lsZA) — Steve Brunton / UW Eigensteve, confirmed live.
- [Interactive Linear Algebra — Georgia Tech (Margalit & Rabinoff)](https://textbooks.math.gatech.edu/ila/) — canonical text, confirmed live.
- [Johnson–Lindenstrauss Lemma — Wikipedia](https://en.wikipedia.org/wiki/Johnson%E2%80%93Lindenstrauss_lemma) — peer-reviewed backing, confirmed live.
- [Axler, Linear Algebra Done Right 4th ed.](https://linear.axler.net/) — canonical graduate text, open access, confirmed live.
