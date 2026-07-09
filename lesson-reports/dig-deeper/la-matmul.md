# la-matmul — Matrix Multiplication = Composition

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [Matrix multiplication as composition — 3Blue1Brown lesson text](https://www.3blue1brown.com/lessons/matrix-multiplication/) — The definitive composition-first derivation: shows why the entry rule (row·column = dot product) is a *consequence* of composition, not a separate fact. Covers non-commutativity, associativity, and how the j-th column of BA is B applied to column j of A.
- [Interactive Linear Algebra ch. 3: Matrix Multiplication (Margalit & Rabinoff)](https://textbooks.math.gatech.edu/ila/) — Free Georgia Tech open textbook; covers conformability (m×n times n×p → m×p), associativity, and non-commutativity with formal proofs. Adds the shape-rule and non-square case the lesson's 2×2-only lab omits.
- [Matrix multiplication — Wikipedia](https://en.wikipedia.org/wiki/Matrix_multiplication) — Comprehensive reference covering definition, non-commutativity, associativity, conformability rules, and computational complexity (O(n³) naïve, Strassen). Graduate-authoritative for fidelity checks.
- [MIT 18.06 Lecture 3: Multiplication and Inverse Matrices (Strang)](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-3-multiplication-and-inverse-matrices/) — OCW lecture notes plus video; Strang's treatment of matrix multiplication from five perspectives (row, column, column-row, blocks), a richer view than the single dot-product entry rule.

### Watch
- [Matrix multiplication as composition | Essence of Linear Algebra Ch.4 (3Blue1Brown)](https://www.youtube.com/watch?v=XkY2DOUCWMU) — (~10 min) The canonical composition-first explanation. Shows that multiplying matrices means doing one transformation after another, derives the entry rule from composition, and viscerally demonstrates non-commutativity with a rotation-then-shear example. Pairs exactly with this lesson.
- [MIT 18.06 Lecture 3: Multiplication and Inverse Matrices (Strang, YouTube)](https://www.youtube.com/watch?v=FX4C-JpTFgY) — (~50 min) Strang's five-view treatment of matrix multiplication: row, column, column-row outer product, block, and inverse. Essential for mastering the many faces of the operation.
- [MIT 18.065 Lecture 1: The Column Space of A Contains All Vectors Ax (Strang, 2018)](https://www.youtube.com/watch?v=YiqIkSHSmyc) — (~45 min) Strang's ML-era perspective on why matrix composition is the central operation in data science; frames deep networks as chains of matrix multiplications.

## Science & depth recommendations (to reach master's level)

- **Missing: why the entry rule follows from composition** → The lesson states the row·column rule alongside the composition story but never derives one from the other. The j-th column of BA is B applied to the j-th column of A — i.e., "where A sends êⱼ, then where B sends that result." The dot-product formula is forced by this, not arbitrary. Source: 3Blue1Brown Ch.4 lesson text (confirmed).
- **Missing: associativity** → The lesson stresses non-commutativity (correctly) but never states that matrix multiplication IS associative: (AB)C = A(BC). A learner can wrongly generalize "order never matters." Associativity is what makes a chain like `W₃W₂W₁x` unambiguous and deep nets well-defined.
- **Missing: the linear-collapse theorem** → Stacking linear layers with no nonlinearity yields `W₃W₂W₁x` = a single matrix — depth buys nothing without σ. The `ml` note shows σ but never explains what removing it does. This is the central ML reason activation functions exist.
- **Missing: conformability** → The 2×2 lab never forces learners to think about shapes. (m×n)(n×p) → (m×p); the inner dimensions must match. Real NN layers are almost never square. One sentence with an example (4096×2048 times 2048×1) ties theory to practice.
- **Tighten Q2's `why`** → The current rationale says "You proved this in the lab" — violates the quiz-self-contained rule. Restate as: "Composition order changes the geometric result: rotating-then-shearing lands a shape differently than shearing-then-rotating, because each transform changes what the other acts on."

## Sources
- [Matrix multiplication as composition — 3Blue1Brown](https://www.3blue1brown.com/lessons/matrix-multiplication/) — canonical text / high-quality explainer, confirmed live.
- [3Blue1Brown Ch.4 YouTube: XkY2DOUCWMU](https://www.youtube.com/watch?v=XkY2DOUCWMU) — high-quality explainer, confirmed live.
- [MIT 18.06 Lecture 3 YouTube: FX4C-JpTFgY](https://www.youtube.com/watch?v=FX4C-JpTFgY) — MIT 18.06, confirmed live.
- [MIT 18.06 Lecture 3 OCW page](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-3-multiplication-and-inverse-matrices/) — MIT 18.06, confirmed live.
- [MIT 18.065 Lecture 1 YouTube: YiqIkSHSmyc](https://www.youtube.com/watch?v=YiqIkSHSmyc) — MIT 18.065 (Strang, 2018), confirmed live.
- [Interactive Linear Algebra — Georgia Tech (Margalit & Rabinoff)](https://textbooks.math.gatech.edu/ila/) — canonical text, confirmed live.
- [Matrix multiplication — Wikipedia](https://en.wikipedia.org/wiki/Matrix_multiplication) — confirmed live.
