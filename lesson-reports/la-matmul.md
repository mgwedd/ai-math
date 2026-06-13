# la-matmul — Matrix Multiplication = Composition

## Current summary (what it teaches + what the lab does)

The lesson (`/Users/wedd/dev/ai-math-worktrees/mystifying-clarke-7ceb80/lib/curriculum/index.js`, lesson object at line 263, interactive at line 280) teaches three things:

1. **B·A = composition**, read right-to-left: apply A first, then B, like nested calls `B(A(x))`.
2. **Entry rule**: `(B·A)ᵢⱼ = (row i of B) · (column j of A)` — a dot product.
3. **Non-commutativity**: `B·A ≠ A·B` in general; rotate-then-shear ≠ shear-then-rotate.

The `ml` note frames a deep net as a chain of compositions `output = W₃·σ(W₂·σ(W₁·x))` and stresses that layer order matters.

**The lab (`INTERACTIVES.matmul`)**: The learner picks "STEP 1 — apply first" and "STEP 2 — apply second" from four fixed transforms (Rotate 90° CCW = `[0,-1,1,0]`, Shear→ = `[1,1,0,1]`, Scale ½, Flip x), plus a "Swap order" button. An "F" polygon is drawn at three stages: grey (original), cyan (after step 1, i.e. A), green (after both, i.e. C = B·A). The î→/ĵ→ columns of C are drawn as arrows, and a readout prints the 2×2 product. Three missions gate progress: (1) compose to a 180° rotation (C = -I), (2) run both Rotate→Shear and Shear→Rotate to "prove order matters", (3) compose back to the identity (undo).

There is **no `deeper` field** in this lesson object — the curriculum schema here uses `learn` / `ml` / `quiz` / `interactive` only. The "WRONG_WHY" wrong-answer rationales live in a separate map keyed `'la-matmul'` at line 1077.

## Strengths

- The composition-first framing (not "memorize the algorithm") matches the canonical 3Blue1Brown pedagogy exactly — composition is the *reason* the entry rule exists, and the lesson leads with it.
- The lab makes non-commutativity *experiential* via a dedicated mission, rather than asserting it. This is the single best teaching move in the lesson; 3B1B explicitly says order-matters is "the kind of thing you can do in your head by visualizing."
- The F-polygon (an asymmetric, chiral shape) is a good choice — it reveals flips/orientation that a symmetric square would hide.
- The "undo / identity" mission quietly introduces the inverse concept and that some transforms are self-inverse (Flip x twice), seeding `la-det` and inverses.
- WRONG_WHY rationales are genuinely diagnostic (e.g. naming the Hadamard-product trap and the transpose/row-vs-column trap by name).

## Inaccuracies / fidelity issues (each: the issue -> the correct statement -> source URL)

1. **The lab's stage colors mislabel which matrix is which.** The readout calls the product `C = B·A` where (per the chips) `first` = A and `second` = B. But the cyan stage is drawn as `T(A, …)` = "after step 1" = after the *first* transform — correct. The green is `T(C, …)` — correct. This is internally consistent, BUT the on-screen wording "1st: …  →  2nd: …" combined with "C = B·A" can read as if B is applied first (B is written leftmost). Worth an explicit caption: "leftmost in B·A is applied **last**." -> Composition reads right-to-left: in B·A, A acts first. -> https://www.3blue1brown.com/lessons/matrix-multiplication/

2. **Quiz Q2 leans on lab recall ("You proved this in the lab")** in the `why`. That phrasing is fine, but the *question itself* names "R rotates 90° CCW, S shears horizontally" without telling the learner what shear matrix is meant — the answer is correct regardless, so this is acceptable, but the `why` should not assume the learner remembers a specific lab outcome. -> Keep questions self-contained; non-commutativity follows from composition order, provable without lab memory. -> (memory note: quiz-self-contained)

3. **Missing precondition for "B·A ≠ A·B": both products must even exist / be square.** The lesson states non-commutativity generally but never notes that for non-square matrices A·B can be defined while B·A is not, or has different shape. For a master's-bound learner this is a real fidelity gap. -> Two matrices commute only when both products are defined and equal; in general AB and BA may differ in existence, shape, or value. -> https://en.wikipedia.org/wiki/Matrix_multiplication

4. **No statement that matrix multiplication IS associative** even though the lab/quiz lean on "non-commutative." A learner can wrongly generalize "order doesn't matter for matrices ever." Associativity (AB)C = A(BC) is the property that *makes deep nets well-defined* and is "trivial when viewed as composition." -> Matrix multiplication is associative (and distributive over addition) but not commutative. -> https://www.3blue1brown.com/lessons/matrix-multiplication/

5. **The `ml` note overstates with "you can't shuffle a network's layers."** True for the trained weights, but the deeper point is non-obvious: even *identically-shaped* linear layers don't commute, AND without nonlinearity the whole stack *collapses to one matrix* regardless of order. The note never says the collapse fact, which is the load-bearing ML insight. -> A composition of linear maps is itself a single linear map; depth only buys expressive power once nonlinearities are interleaved. -> https://medium.com/@david_55326/understanding-linear-layer-collapse-how-neural-networks-fail-8ffe735cea1f

## Conceptual gaps (what a serious learner still needs)

- **Why the entry rule = dot of row·column is forced by composition** (not arbitrary). The product's j-th column is `B·(j-th column of A)` — i.e. "where does A's image of êⱼ land after B." The lesson states the entry rule and the composition story side by side but never derives one from the other. This derivation is the whole point.
- **Associativity + matrix chain ordering.** (AB)C = A(BC) as values, but FLOP cost differs wildly by parenthesization (the matrix-chain-multiplication DP problem). Directly relevant: in `Wx` where x is a batch, grouping matters for cost; in attention, `(QKᵀ)V` vs `Q(KᵀV)` changes complexity.
- **Shapes / conformability**: (m×n)(n×p) = (m×p); the inner dimensions must match. The lab only ever uses 2×2, so the learner never confronts non-square composition (e.g. a 3→2 layer feeding a 2→4 layer).
- **Composition collapse without nonlinearity** — the central ML reason σ exists. The `ml` note shows σ but never explains what removing it does.
- **Special commuting cases**: scalar multiples of I commute with everything; diagonal matrices commute with each other; a matrix commutes with its own powers and inverse. Knowing *when* order doesn't matter is as important as knowing it usually does.
- **Computational cost**: naïve n³, Strassen ≈ n^2.807 (ω = log₂7), and that GPU training is dominated by matmul FLOPs. A one-liner grounds "deep = many compositions" in real cost.
- **Linearity ⇒ matrix**: the reason every composition is again representable by a matrix is that the composition of linear maps is linear, and linear maps on finite-dim spaces are exactly matrices.

## Lab ideas (concrete: name the interactive, what the learner manipulates, what it reveals)

1. **"Column tracker" overlay (upgrade existing `matmul` lab).** Add a toggle that, alongside the green composite F, draws *two* sub-arrows showing column 1 of the product being built: first draw `A·ê₁` (cyan dashed), then `B·(A·ê₁)` landing on the green î→. Caption: "column j of B·A = B applied to column j of A." This makes the entry rule *visibly* a consequence of composition rather than a separate fact. Learner manipulates: the same two chips; new reveal: the dot-product rule's geometric origin.

2. **"Does it commute?" detector.** Add a small panel that computes and displays both `B·A` and `A·B` numerically and a green/red badge "commute?" Learner flips between any two of the four transforms; reveals the rare commuting pairs (Scale ½ commutes with everything; Flip x and Rotate 90° do NOT). Directly drills "when does order NOT matter."

3. **"Stack collapse" mini-lab (new interactive, ML bridge).** Let the learner stack up to 3 linear layers and toggle a σ (ReLU) checkbox between them. With σ off, show the resulting transform on a swirl/grid is *still a straight-line grid* and print "equivalent single matrix M = W₃W₂W₁." With σ on, the grid bends. Mission: "make the output non-linear" → forces them to turn on at least one σ. Reveals the collapse theorem viscerally and motivates the next world.

4. **"Associativity vs cost" puzzle (stretch).** Three rectangular matrices with given shapes (e.g. 50×5, 5×40, 40×3); learner chooses parenthesization, lab shows identical result but different multiply count. Mission: pick the cheaper grouping. Teaches associativity + matrix-chain cost in one move.

## Content improvements (specific learn/ml/deeper text upgrades)

**learn** — add three sentences:
- Derive the entry rule from composition: "Why row·column? Column j of B·A is just B applied to column j of A — where A sends êⱼ, then where B sends *that*. Compute each output coordinate as (a row of B)·(that column), and you get the dot-product rule for free."
- Add the missing properties: "Matrix multiplication **is associative** — (AB)C = A(BC), so a chain `W₃W₂W₁x` is unambiguous — and distributes over addition. It just isn't commutative."
- Add the shape rule: "Sizes must match: (m×n)(n×p) → (m×p). The inner dimensions cancel; the outer ones survive. This is also why AB can exist while BA doesn't."

**ml** — replace/augment with the collapse insight:
- "Here's the catch: stack linear layers with *no* nonlinearity and `W₃W₂W₁x` collapses to a single matrix `Mx` — 100 layers buy you nothing. The σ between layers is what stops the composition from flattening, turning depth into real expressive power. So a deep net is a composition of *alternating* linear maps and nonlinearities — and because matrices are associative, the linear parts chain cleanly; because they don't commute, layer order is part of the learned function."
- Add a cost aside: "Each `Wx` is the matmul that dominates training FLOPs; naïvely it's O(n³) for n×n, the reason GPUs and tricks like Strassen (≈ n^2.81) exist."

**(no `deeper` field exists in this schema)** — if one is added later, good card topics: (a) "When DOES order not matter?" (scalar·I, diagonals, a matrix with its inverse/powers); (b) "Associativity is free under the composition view"; (c) "Matrix-chain ordering: same answer, different cost — and attention's (QKᵀ)V vs Q(KᵀV)."

## Quiz improvements (specific misconceptions to target; keep questions self-contained)

- **Keep** the three existing questions; they target the right early traps (right-to-left, non-commutativity, row·column).
- **Add: associativity vs commutativity discrimination.** "For square matrices, which is ALWAYS true?" → opts: "AB = BA", "(AB)C = A(BC)", "A+B is undefined", "AB = 0 only if A or B is 0". Correct: associativity. WRONG_WHY for "AB=BA": "That's commutativity, which fails in general; associativity is the one that always holds." This directly fixes the "order never/always matters" overgeneralization.
- **Add: the collapse fact (ML).** "Stacking three linear layers with no nonlinearity between them is equivalent to…" → "a single linear layer", "a nonlinear function", "three times the capacity", "an undefined operation". Correct: single linear layer. Self-contained, no lab recall.
- **Add: shape conformability.** "A is 3×2, B is 2×4. Which product is defined and what shape?" → "AB, 3×4", "BA, 4×3", "both, 3×4", "neither". Correct: "AB, 3×4". Targets the inner-dimension-must-match rule the 2×2-only lab never exercises.
- **Tighten Q2's `why`** so it does not rely on "You proved this in the lab" — restate the reason intrinsically: "Composition order changes the geometric result; e.g. rotate-then-shear lands a shape differently than shear-then-rotate. Multiplication is associative but not commutative."

## Sources (the real URLs you consulted)

- 3Blue1Brown — Matrix multiplication as composition (Essence of Linear Algebra, ch. 4): https://www.3blue1brown.com/lessons/matrix-multiplication/
- 3Blue1Brown — Linear transformations and matrices (ch. 3): https://www.3blue1brown.com/lessons/linear-transformations/
- Wikipedia — Matrix multiplication (definition, non-commutativity, associativity, conformability): https://en.wikipedia.org/wiki/Matrix_multiplication
- Wikipedia — Computational complexity of matrix multiplication (O(n³), Strassen ω≈2.807): https://en.wikipedia.org/wiki/Computational_complexity_of_matrix_multiplication
- MIT 18.06 (Strang), §1.4 Matrix Multiplication AB and CR: https://math.mit.edu/~gs/linearalgebra/ila6/ila6_1_4.pdf
- Georgia Tech Interactive Linear Algebra — Matrix multiplication: https://textbooks.math.gatech.edu/ila/matrix-multiplication.html
- "Understanding Linear Layer Collapse" (composition of linear maps collapses to one matrix): https://medium.com/@david_55326/understanding-linear-layer-collapse-how-neural-networks-fail-8ffe735cea1f
- Towards Data Science — "A Bird's-Eye View of Linear Algebra: Why Is Matrix Multiplication Like That?": https://towardsdatascience.com/a-birds-eye-view-of-linear-algebra-why-is-matrix-multiplication-like-that/
