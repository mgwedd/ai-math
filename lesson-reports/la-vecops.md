# la-vecops — Adding & Scaling Vectors

## Current summary (what it teaches + what the lab does)
The lesson teaches the two core vector operations: **addition** (component-wise, "tip-to-tail" geometrically) and **scalar multiplication** (multiply every component by a number → stretch / shrink / flip), then unifies them into the **linear combination** `c·a + b`. The `ml` note maps this to a neuron's pre-activation `w₁x₁ + … + b` and frames training as "finding the right scalars."

The lab (`INTERACTIVES.vecops`, lines 97–134 of `lib/curriculum/index.js`) shows a 2D plane with two draggable vectors `a` and `b` (snapped to quarter-unit grid) and a slider for scalar `c ∈ [−2, 2]`. It renders `c·a` (purple), `b` (cyan), a faint tip-to-tail ghost of `b` from the tip of `c·a`, and the resultant `c·a+b` (green), plus a gold target box at `[4,1]`. Three missions: (1) make `a+b = [4,1]` (c=1), (2) set c negative and watch `a` flip, (3) make `c·a+b ≈ 0`.

There are no `deeper` cards. Quiz has 3 questions (component addition, effect of ×(−0.5), identifying a linear combination) with per-question `why` plus misconception-specific `WRONG_WHY` entries (lines 1047–1056).

## Strengths
- The lab's **tip-to-tail ghost arrow** is genuinely good pedagogy — it makes the geometry of addition visible rather than asserting it.
- Mission 3 (`c·a + b ≈ 0`) is subtle and excellent: it forces the learner to discover that the zero vector is reachable only when `c·a` exactly cancels `b`, which is the seed of **linear dependence** and solving `Ax = b`. This is high-value and should be leaned into, not just left implicit.
- `WRONG_WHY` is sharp: it correctly anticipates sign-dropping, "ratio 2" misreading of 0.5, and the dot-product-vs-linear-combination confusion.
- The neuron framing in `ml` is accurate and well-targeted for the audience.

## Inaccuracies / fidelity issues (each: the issue -> the correct statement -> source URL)
- **Slider label "scalar c (stretches a)" is misleading for |c|<1.** The label and the `learn` text both lead with "stretches"; a scalar with |c|<1 *shrinks* (compresses) and c<0 *reflects*. The lab's own slider range includes |c|<1 and negatives, so the label undersells what the learner sees. -> A scalar scales: |c|>1 stretches, |c|<1 compresses, c<0 reflects through the origin, c=0 collapses to the zero vector. -> https://en.wikipedia.org/wiki/Scalar_multiplication and https://www.3blue1brown.com/lessons/span/
- **The `learn` omits c=0.** It lists stretch/shrink/flip but not the degenerate case c=0 → the zero vector, which is conceptually important (it's why span "through the origin" always contains 0) and is exactly what Mission 3 probes. -> Multiplying any vector by 0 yields the zero vector; this is why every span/subspace contains the origin. -> https://www.3blue1brown.com/lessons/span/
- **No statement that these two operations *define* a vector space.** For a master's-bound learner, the lesson should name that closure under addition and scalar multiplication (plus the existence of 0 and inverses) *is* the definition of a vector space — not an incidental fact. -> A vector space is precisely a set closed under vector addition and scalar multiplication satisfying the eight axioms; verifying a subset is a subspace reduces to closure under both operations and containing 0. -> https://dummit.cos.northeastern.edu/teaching_sp23_4571/linalgthy_1_vector_spaces_v3.50.pdf
- **`ml` overstates the king−queen framing risk (latent, not present, but worth pre-empting).** The lesson doesn't yet cite word analogies, but if added naively it would propagate a known oversimplification: "king − man + woman = queen" only works after *excluding the input words* from the nearest-neighbor search, and is far less clean than popularly claimed. -> Linear word-analogy arithmetic is approximate and only recovers "queen" because the query words are excluded from candidates; it is not exact vector algebra. -> https://mikexcohen.substack.com/p/king-man-woman-queen-is-fake-news and https://arxiv.org/pdf/1810.04882

## Conceptual gaps (what a serious learner still needs)
- **Span.** The single biggest missing idea. The lesson stops at "a linear combination," but the payoff concept — *the set of all linear combinations of a fixed set is its span* (a line, plane, or all of ℝⁿ through the origin) — is never named. 3B1B builds the entire chapter 2 around this. The lab already varies `c`; sweeping it traces the span of `a`. -> https://www.3blue1brown.com/lessons/span/
- **Linear dependence / independence.** Mission 3 secretly demonstrates that `a` and `b` here are *independent* (you can't make `c·a = −b` for any single scalar unless they're parallel), but the learner is never told this is what they discovered, or what it means for redundancy/dimension. -> https://sites.lafayette.edu/thompsmc/files/2016/02/U2_S3.pdf
- **Affine vs convex vs linear combinations.** Crucial for ML and never mentioned. Coefficients summing to 1 = affine (the line/plane *through* the points, not the origin); non-negative and summing to 1 = convex (weighted average / the segment between points). Convex combinations underlie attention weights (softmax outputs a convex combination of value vectors), mixup augmentation, and ensemble weighting. -> https://en.wikipedia.org/wiki/Convex_combination
- **Coordinates ARE linear combinations of basis vectors.** The deep reframe — `[3,−2]` *means* `3·î + (−2)·ĵ` — is the bridge to bases, change of basis, and why matrices are "where the basis vectors land." -> https://www.3blue1brown.com/lessons/span/
- **Dimension-independence of the operations.** Worth stating explicitly that everything generalizes verbatim to ℝⁿ (the 2D picture is a crutch, not the definition) — the audience will live in 768-D / 1536-D embedding spaces.

## Lab ideas (concrete: name the interactive, what the learner manipulates, what it reveals)
- **"Span tracer" (extend `vecops`).** Add a toggle/button that animates `c` across its full range and leaves a fading trail of the tip of `c·a`. The learner *sees* the span of `a` is a line through the origin. Add a second slider `d` for `b` so the resultant is `c·a + d·b`; sweeping both reveals that two non-parallel vectors span the whole plane — and that when `a∥b` the trail collapses to a line (linear dependence made visible). This directly delivers the missing span/dependence concepts using the existing render code.
- **"Convex / affine slider" lab.** Two fixed points `a`, `b`; one slider `t ∈ [−1, 2]` controlling `(1−t)·a + t·b`. Show three colored regions: `t∈[0,1]` = convex (segment between, "weighted average"), the full line = affine, and annotate that softmax-attention outputs always land in the convex hull. A mission: "place the result exactly at the midpoint (the average of a and b)" reveals `t=0.5`.
- **"Reach the target" generalization of Mission 1.** Randomize the gold target and require the learner to find `c, d` such that `c·a + d·b = target`. This is solving a 2×2 linear system by hand/dragging — a concrete preview of `Ax = b` and a much richer version of the current single fixed target.

## Content improvements (specific learn/ml/deeper text upgrades)
- **Fix the scaling description** in `learn`: lead with "scales" not "stretches," and explicitly include all four cases: stretch (|c|>1), compress (|c|<1), reflect (c<0), collapse to **0** (c=0).
- **Add a span sentence** to `learn`: "Sweep the scalar across all values and the tips of `c·a` trace a *line through the origin* — that line is the **span** of `a`. Two non-parallel vectors span the whole plane. This 'set of all linear combinations' is the central object of linear algebra."
- **Reframe coordinates** in `learn`: note that `[3,−2]` is itself the linear combination `3·î − 2·ĵ` of the standard basis — so coordinates and linear combinations are the same thing seen twice.
- **Relabel the slider** from `scalar c (stretches a)` to `scalar c (scales/flips a)`.
- **Add `deeper` cards** (currently none):
  1. *Vector space in one line* — closure under + and ·, plus 0 and inverses, IS the definition; subspaces always pass through the origin.
  2. *Affine vs convex* — coefficients summing to 1 (affine) vs non-negative-and-sum-to-1 (convex = weighted average); name attention/softmax and mixup as convex combinations.
  3. *It all works in n-D* — the 2D arrows are a crutch; the definitions are identical in 768-D embedding space.
- **Enrich `ml`** with the attention angle: an attention output is a *convex* combination of value vectors (softmax weights ≥ 0, sum to 1) — i.e. a weighted average of contexts. Optionally add a one-line, *correctly caveated* embedding-arithmetic mention (analogies are approximate, require excluding the query words), citing the "fake news" caveat so the learner isn't misled.

## Quiz improvements (specific misconceptions to target; keep questions self-contained — never require recalling lab-graph data)
- **Add a span/dependence question:** "Sweeping all real scalars `c`, the set of vectors `c·[2,1]` forms…" → (a) the whole plane, (b) **a line through the origin**, (c) a single point, (d) a circle. Targets the misconception that one vector's span fills 2D.
- **Add a zero-scalar question:** "What is `0·[7,−3]`?" → `[0,0]`, targeting the gap that the lesson never states c=0 explicitly.
- **Add a convex-vs-linear question (self-contained):** "Weights that are all ≥ 0 and sum to 1 produce a…" → **convex combination (a weighted average)**, with distractors "any linear combination," "dot product," "affine combination (can be negative)." Reinforces the ML-critical distinction.
- **Sharpen Q2 (×−0.5):** the current options are fine; consider adding a distractor "shrinks length to one-quarter" to catch learners who confuse the scalar with its square (a real magnitude/norm-scaling confusion that recurs in later lessons).
- Keep all new questions arithmetic/conceptual and self-contained — none should require reading a specific position off the lab canvas (per the quiz-self-contained memory note).

## Sources (the real URLs you consulted)
- 3Blue1Brown — Linear combinations, span, and basis vectors: https://www.3blue1brown.com/lessons/span/
- Wikipedia — Scalar multiplication: https://en.wikipedia.org/wiki/Scalar_multiplication
- Wikipedia — Convex combination: https://en.wikipedia.org/wiki/Convex_combination
- Evan Dummit, Linear Algebra Part 1: Vector Spaces (axioms, subspaces): https://dummit.cos.northeastern.edu/teaching_sp23_4571/linalgthy_1_vector_spaces_v3.50.pdf
- Lafayette College notes — Linear Combinations, Spanning, and Linear Independence: https://sites.lafayette.edu/thompsmc/files/2016/02/U2_S3.pdf
- Mike X Cohen — "King − man + woman = queen is fake news" (analogy caveat): https://mikexcohen.substack.com/p/king-man-woman-queen-is-fake-news
- Allen & Hospedales, "Towards Understanding Linear Word Analogies" (arXiv 1810.04882): https://arxiv.org/pdf/1810.04882
