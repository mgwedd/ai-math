# la-inverse — Solving Ax = b & the Inverse

## Current summary (what it teaches + what the lab does)
The lesson frames the "central question" of linear algebra: given transform A and target b, which input x lands on b, with the answer x = A⁻¹b. It states the inverse undoes A, exists exactly when det A ≠ 0 ("a collapse can't be undone"), and that singular A reaches only a line so most targets are unreachable — introducing least squares as "closest reachable point." The `ml` note ties this to regression normal equations, Kalman filters, and second-order optimizers. `deeper` cards give the un-doing intuition + the 2×2 formula, and a "solve, don't invert" (LU/QR) numerical note. Quiz: invertibility ⇔ det≠0; singular + b off the output line ⇒ no solution; A⁻¹A = I; inverse of diag([2,4]).

The lab (`INTERACTIVES.lainverse`): the learner drags an input vector **x** on a 2D plane until **Ax** (cyan arrow) covers a gold target **b**. Mission 1: hit b with the invertible A = [[2,1],[1,1]] (det 1). Mission 2: the target jumps to (1,2) and they hit it again. Mission 3: switch to the singular A = [[2,1],[4,2]] (det 0), whose reachable outputs are drawn as a dashed line (span of direction (1,2)); they get Ax within 1.9 of b=(3,2) and feel that it can never actually be reached. Readout shows A, det, and ‖Ax − b‖. Effectively the learner is computing A⁻¹b "by feel."

## Strengths
- The drag-x-until-Ax-hits-b interaction is a genuinely good embodiment of "solving = running the transform backward to find the pre-image" — it makes A⁻¹b kinesthetic rather than algebraic.
- Visualizing the singular case as an output line you can approach but never touch is the right geometric punch for unreachability → least squares.
- The "solve, don't invert" deeper card is exactly the correct numerical-computing message and rare in intro material.
- WRONG_WHY entries are sharp and correct, including the subtle point that singular A with b ON the line gives infinitely many solutions.
- Connecting unreachable-target → closest-point → least squares ties forward to World 0's regression lab cleanly.

## Inaccuracies / fidelity issues (each: the issue -> the correct statement -> source URL)
1. **Over-broad claim that singular A makes "most targets b simply unreachable."** -> True for the b-OFF-the-line generic case, but the learn text never states the flip side that the lesson's own quiz/WRONG_WHY relies on: when b DOES lie in the column space (on the line), a singular system has *infinitely many* solutions, not zero. 3Blue1Brown states it explicitly: "It's still possible that a solution exists even when there is no inverse... you have to be lucky enough to have the vector v live somewhere on that line." The learn HTML should name both branches (det=0 ⇒ either no solution OR infinitely many, never exactly one). -> https://www.3blue1brown.com/lessons/inverse-matrices/

2. **"The inverse A⁻¹ ... exists precisely when det A ≠ 0" is stated as the *definition* of solvability, but the lesson silently restricts to square A.** -> The invertibility/det story is *only* for square matrices. The `ml` note invokes regression normal equations, which are the rectangular/over-determined case where A⁻¹ does not exist at all and you use (AᵀA)⁻¹Aᵀ (the pseudoinverse). The lesson should flag that "inverse" is a square-matrix story and regression is the non-square generalization. -> https://en.wikipedia.org/wiki/Invertible_matrix (theorem is for n×n) ; https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse

3. **Least squares is described purely as "closest point on the output line," conflating the over- and under-determined cases.** -> The lab's singular 2×2 picture (square, rank-deficient) is actually the *degenerate* case; real ML least squares is the *over-determined* tall-A case (more equations than unknowns, b generically outside the column space, project b onto col(A)). The geometry "residual b − Ax ⟂ columns of A" (the normal equations) is the precise statement and is not mentioned. -> https://math.libretexts.org/Bookshelves/Linear_Algebra/Interactive_Linear_Algebra_(Margalit_and_Rabinoff)/06%3A_Orthogonality/6.5%3A_The_Method_of_Least_Squares

4. **"Inverse = the words reversed" intuition is correct but the determinant-as-information framing ("no information was destroyed") is loose.** -> Better/precise: det = 0 ⇔ columns linearly dependent ⇔ nontrivial null space ⇔ the map collapses a whole direction to 0, so pre-images are not unique. "Information destroyed" is a fine metaphor but should be anchored to the null space (which the lesson never names) to be rigorous and to set up rank/eigen later. -> https://www.3blue1brown.com/lessons/inverse-matrices/

5. **Missing the condition-number caveat behind "solve, don't invert."** -> The deeper card says inverting is "numerically safer" but doesn't say *why*: a near-singular A (small det but det≠0) can be technically invertible yet have a huge condition number, so A⁻¹ amplifies error catastrophically. det≠0 is binary; conditioning is the continuous reality that matters in practice. -> https://en.wikipedia.org/wiki/Condition_number

## Conceptual gaps (what a serious learner still needs)
- **Null space / kernel is never named.** It is the missing third of the rank–nullity picture and the precise reason inverses fail and solutions are non-unique. A master's-bound learner must connect det=0 ⇔ nontrivial null space ⇔ {one particular solution + any null-space vector}.
- **Column space framing of solvability.** "Ax = b is solvable ⇔ b ∈ col(A)" is the cleanest universal statement (covers square and rectangular). The lesson only gives the square det test.
- **The full solution-count trichotomy.** Square non-singular ⇒ exactly one; singular/rectangular ⇒ zero (b ∉ col A) or infinitely many (b ∈ col A). Currently only two of three branches are taught.
- **Normal equations / projection.** AᵀAx = Aᵀb, residual ⟂ col(A), and why this is the closed form for regression — the `ml` note name-drops it without the geometry.
- **Pseudoinverse A⁺ as the unifier.** Over-determined ⇒ least-squares solution; under-determined ⇒ minimum-norm solution; both = A⁺b, computed via SVD. This is the bridge to the SVD lessons already in the curriculum.
- **Conditioning vs invertibility.** Why numerical practice cares about κ(A), not just det ≠ 0.
- **What "undoing" means for non-square / rank-deficient maps** (left vs right inverse) — at least a pointer.

## Lab ideas (concrete: name the interactive, what the learner manipulates, what it reveals)
1. **"Three fates of Ax = b" (upgrade the existing lab).** Add a third matrix button and a draggable target. The learner drags b around while the lab live-labels the regime: green "unique" (det≠0), amber "infinitely many" when b snaps onto the dashed column-line of the singular A (and draws the *whole line of valid x's* as the null-space-shifted set), red "no solution" off the line. Mission: with singular A, place b ON the line and observe that x is no longer unique (show two different x arrows that both map to b). This fixes the biggest conceptual gap with one new mission.
2. **"Least squares = drop a perpendicular" (new).** Tall A: a fixed 2D column space (a plane/line) drawn in the ambient space, b sitting off it. Learner drags x; Ax slides along col(A). A live perpendicular dashed segment from b to Ax shows the residual; the mission is to minimize ‖residual‖ and watch it become exactly perpendicular to col(A) at the minimum — visually deriving the normal equations.
3. **"Conditioning amplifier" (new, small).** A near-singular A with a det slider approaching 0. Learner nudges b by a tiny fixed amount and watches the solved x⁻¹ jump wildly as det → 0; readout shows κ(A) exploding. Reveals why det≠0 is not the same as "safe to invert."
4. **"Inverse as reversed words" (micro).** Two sliders: rotation angle and scale. Show A's arrow and A⁻¹'s arrow simultaneously (−angle, 1/scale). Mission: make A⁻¹ undo A so a test vector returns home — reinforces the deeper card visually.

## Content improvements (specific learn/ml/deeper text upgrades)
- In `learn`, after the singular sentence, add the missing branch: "When det = 0 the outputs collapse onto a line (the **column space**), and the squashed direction — the **null space** — is exactly what makes solutions non-unique. So a singular system has *either* no solution (b off the line) *or infinitely many* (b on the line) — never exactly one." This makes the learn text consistent with the quiz.
- Add one line naming the universal rule: "Ax = b has a solution exactly when **b lies in the column space of A** — true for any A, square or not."
- In `ml`, distinguish square-inverse from regression: "Square A with det≠0 inverts directly; regression's A is *tall* (more data rows than features) so A⁻¹ doesn't exist — you solve the **normal equations** AᵀAx = Aᵀb, geometrically projecting b onto the column space. The general object is the **pseudoinverse** A⁺ = (AᵀA)⁻¹Aᵀ, computed via SVD."
- In the "solve, don't invert" deeper card, add the conditioning reason: "Even when det≠0, a near-singular A has a large **condition number** κ(A); forming A⁻¹ amplifies rounding error by roughly κ, while LU/QR factor-and-solve keeps it controlled."
- Replace "no information was destroyed" with a null-space-anchored phrasing, or add a parenthetical: "(equivalently, the **null space** is just {0} — no direction got crushed to zero)."
- Consider a forward pointer to the existing SVD lesson: the pseudoinverse and least squares are SVD in disguise.

## Quiz improvements (specific misconceptions to target; keep questions self-contained — never require recalling lab-graph data)
- The current Q2 ("singular, b OFF the line ⇒ no solution") is good. **Add a complementary Q** targeting the under-taught branch: "A is singular (det = 0) and b DOES lie on the line A's outputs cover. Then Ax = b has…" → answer: *Infinitely many solutions*. Distractors: exactly one / no solution / only x = 0. This forces the learner to hold the full trichotomy. (Self-contained — phrased in words, no graph recall.)
- **Add a non-square / regression-flavored Q**: "Why can't you solve a tall regression system Ax = b by computing A⁻¹?" → answer: *A isn't square, so A⁻¹ doesn't exist; you minimize ‖Ax − b‖ via the normal equations instead.* Distractors: A⁻¹ exists but is slow / det is negative / b is always zero.
- **Add a conditioning Q**: "A has det = 0.0001 (nonzero). Solving Ax = b is…" → answer: *technically invertible but numerically dangerous — tiny errors in b blow up in x (large condition number).* Targets the det≠0 ⇒ "fine" misconception.
- The "fix the WRONG_WHY for Q2" is already excellent; mirror that quality for any new singular-case question (call out that infinitely-many ≠ unhealthy, it's the "b lucky enough to be reachable" case).
- Edit Q4's `why` to name the principle generally ("diagonal matrices invert entrywise to reciprocals; off-diagonal zeros stay zero") so it doesn't read as a one-off computation.

## Sources (the real URLs you consulted)
- 3Blue1Brown — Inverse matrices, column space and null space (Essence of Linear Algebra ch.7): https://www.3blue1brown.com/lessons/inverse-matrices/
- Wikipedia — Invertible matrix (Invertible Matrix Theorem, 2×2 formula, left/right inverses): https://en.wikipedia.org/wiki/Invertible_matrix
- Wikipedia — Moore–Penrose inverse (pseudoinverse, min-norm vs least-squares): https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse
- Interactive Linear Algebra (Margalit & Rabinoff) §6.5 The Method of Least Squares (residual ⟂ col(A), normal equations, infinitely many least-squares solutions when rank-deficient): https://math.libretexts.org/Bookshelves/Linear_Algebra/Interactive_Linear_Algebra_(Margalit_and_Rabinoff)/06%3A_Orthogonality/6.5%3A_The_Method_of_Least_Squares
- MIT OCW 18.06SC — Ax=b and the four subspaces / column space and nullspace: https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/ax-b-and-the-four-subspaces/column-space-and-nullspace
- Wikipedia — Condition number (why det≠0 ≠ safe to invert): https://en.wikipedia.org/wiki/Condition_number
