# la-dot — Dot Product & Similarity

## Current summary (what it teaches + what the lab does)
The lesson (`/Users/wedd/dev/ai-math-worktrees/mystifying-clarke-7ceb80/lib/curriculum/index.js`, lesson object at line 137, interactive `INTERACTIVES.dot` at line 157) introduces the dot product two ways: the algebraic definition `a·b = a₁b₁ + a₂b₂` and the geometric identity `a·b = ‖a‖‖b‖cos θ`. It frames the dot product as a measure of **alignment** (positive = same general direction, zero = orthogonal/unrelated, negative = opposed), then defines **cosine similarity** = cos θ as the length-normalized score in [−1, 1].

The `ml` note connects this to semantic search (rank by cosine similarity of embeddings) and to transformer attention (`Q·Kᵀ` scores every query against every key).

The lab `dot` is a single 2D canvas where the learner **drags the tips of two arrows a and b**. A live readout shows `a·b`, `cos θ` (color-coded green/red/gold), and `θ` in degrees, plus an angle arc. Three gated missions: make them orthogonal (`|cos| < .04`), nearly identical (`cos > .97`), and opposed (`cos < −.9`). A note tells the learner to think of `a` as a query and `b` as a document.

There are **no `deeper` cards** for this lesson (unlike `la-matrix` and others). The quiz has 3 questions (numeric dot product; cos ≈ 0 meaning; sign of dot product vs angle) with full WRONG_WHY misconception feedback at line 1057.

## Strengths
- Clean dual presentation (algebraic + geometric) with the correct identity up front.
- The interactive directly ties the abstract angle to a draggable, color-coded readout — strong embodied intuition for the sign/alignment story.
- The query/document framing in the lab is exactly the right hook toward retrieval and attention.
- WRONG_WHY entries are genuinely misconception-targeted (sign slips, "stopping at component-wise multiplication," the 90° boundary), not generic.
- The cos ≈ 0 = "unrelated/strangers" framing (Q2) correctly distinguishes orthogonal from opposite — a common confusion handled well.

## Inaccuracies / fidelity issues (each: the issue -> the correct statement -> source URL)
1. **"Orthogonal — completely unrelated directions" overstates the semantics.** The lesson says zero dot product means "completely unrelated directions." Geometrically orthogonal is correct, but the *semantic* gloss is misleading for embeddings: in modern transformer embedding spaces, vectors are **anisotropic** (they collapse into a narrow cone), so cos ≈ 0 is rare and "unrelated" text often still has substantially positive cosine. Orthogonality ≠ semantic independence in practice. -> State: orthogonal means *geometrically* no alignment; whether that equals "unrelated meaning" depends on how the embedding space is shaped. -> https://arxiv.org/abs/2403.05440 and https://aclanthology.org/2020.emnlp-main.733/ (anisotropy / representation degeneration).

2. **The `ml` note conflates attention scores with raw dot products.** It says attention "scores every query against every key with a dot product … Q·Kᵀ." Real transformer attention uses **scaled** dot-product attention: `softmax(Q·Kᵀ / √d_k)·V`. The `√d_k` divisor is not cosmetic — without it, for independent unit-variance components the dot product has variance `d_k`, which saturates softmax into near-one-hot outputs with vanishing gradients. -> State: attention uses the *scaled* dot product `Q·Kᵀ/√d_k`. -> https://arxiv.org/abs/1706.03762 (sec 3.2.1) and https://dev.to/samyak112/scaling-is-all-you-need-understanding-sqrtd-in-self-attention-29pk.

3. **Implicit claim that cosine similarity is the canonical embedding metric.** The lesson presents cosine similarity as *the* alignment score and "the workhorse," but does not note that (a) attention/QK uses the *unnormalized* dot product (magnitude matters there), and (b) cosine similarity of learned embeddings can be "arbitrary" because regularization choices silently rescale latent dimensions. -> State: cosine similarity is one choice; the unnormalized dot product is often used and sometimes outperforms it; cosine results can be artifact-driven. -> https://research.netflix.com/publication/is-cosine-similarity-of-embeddings-really-about-similarity (Steck, Ekanadham, Kallus, 2024).

4. **No mention that the geometric identity is a *theorem*, not a definition.** Presenting `a·b = ‖a‖‖b‖cos θ` flatly next to the coordinate formula can leave the learner thinking they are the same definition. They are connected by the law of cosines (in coordinates) — worth flagging so the learner doesn't think cos θ is *defined* by the dot product circularly. -> State: the coordinate sum is the definition; the cosine form is derived via the law of cosines (and is how cos θ is *defined* in n > 3 dimensions). -> https://en.wikipedia.org/wiki/Dot_product#Geometric_definition.

## Conceptual gaps (what a serious learner still needs)
- **Projection interpretation.** The single most illuminating intuition (3Blue1Brown) is missing: `a·b̂` is the signed length of the shadow of `a` onto `b`'s direction. This is what makes the dot product a *measurement* and is the bridge to least squares, PCA projections, and the QKV mechanism. Source: https://www.3blue1brown.com/lessons/dot-products/
- **Symmetry surprise + duality.** Why is `a·b = b·a` even though "projecting a onto b" looks different from the reverse? 3B1B's duality framing — a vector *is* a linear map to the number line, and its matrix is its transpose row — is exactly the `1×n · n×1` view that explains why a row of a weight matrix dotted with an input is "one neuron." A master's-bound learner needs this row-vector-as-functional view.
- **n-dimensional generality.** The whole lesson is 2D. The payoff (embeddings, attention) lives in hundreds/thousands of dimensions, where cos θ is the *definition* of "angle." Should state the formula generalizes to `Σ aᵢbᵢ`.
- **Dot product vs cosine vs Euclidean.** When do you normalize? `‖a−b‖² = ‖a‖² + ‖b‖² − 2a·b` ties all three together and is worth one line — it shows Euclidean distance, dot product, and cosine are three readings of the same geometry.
- **Magnitude carries information.** The lesson silently throws away magnitude by jumping to cosine. In attention and unnormalized retrieval, ‖q‖ and ‖k‖ matter (a "confident"/high-norm token attends more strongly). Learners should know *why* you'd keep vs discard magnitude.
- **Self dot product = squared norm.** `a·a = ‖a‖²` is never stated; it's the link to L2 norms, energy, and the variance interpretation behind the √d_k scaling.

## Lab ideas (concrete: name the interactive, what the learner manipulates, what it reveals)
1. **`dot` upgrade — projection shadow.** In the existing 2-arrow lab, draw the perpendicular dropped from `a`'s tip onto `b`'s line and shade the projection segment, labeling its signed length `a·b̂`. Add a readout line "shadow of a on b = X". This turns the abstract cos θ into the visible shadow and directly teaches the projection meaning. Add a mission: "make the shadow length zero without making either vector zero" (forces orthogonality through the projection lens).
2. **New lab `cossim-rank` — retrieval toy.** Show a fixed query word and ~6 candidate "document" vectors (2D, pre-placed) as dots on the plane. Learner drags the **query** arrow; the candidates re-rank live by cosine similarity into a sorted list with bars. Reveals that ranking depends only on *angle*, not distance — and a toggle "use raw dot product instead" makes a long-but-misaligned vector jump to the top, viscerally showing magnitude's effect (and why normalization changes the winner).
3. **New lab `attention-row` — one attention head in 2D.** A single query vector and 3 key vectors; show raw scores `q·kᵢ`, then a slider for `d`-like temperature (or a √d_k toggle) feeding a softmax bar chart of attention weights, then the resulting weighted-sum "context" vector drawn on the plane. Reveals (a) dot product → relevance, (b) softmax → a convex combination, (c) why scaling/temperature sharpens or flattens attention. This is the highest-value new interactive: it makes Q·Kᵀ→softmax→V concrete in the same 2D plane the learner already understands.

## Content improvements (specific learn/ml/deeper text upgrades)
- **Add the projection sentence to `learn`:** "Geometrically, `a·b` is the length of `a`'s shadow on `b` (times ‖b‖) — a signed measurement of how far `a` reaches along `b`." Tie the color story to the shadow's sign.
- **Note the identity is derived, not defined:** one clause — "the coordinate sum is the definition; `‖a‖‖b‖cos θ` follows from the law of cosines, and in high dimensions it's how we *define* the angle."
- **Add `a·a = ‖a‖²` and the n-D generalization** (`Σ aᵢbᵢ`) so the 2D lab doesn't read as the whole story.
- **Fix the `ml` note** to say attention uses the **scaled** dot product `softmax(QKᵀ/√d_k)V`, with a one-line why (variance grows like d_k, scaling keeps softmax gradients healthy). Add that attention uses the *raw* (unnormalized) dot product, so magnitude matters there — contrast with cosine-based search.
- **Add `deeper` cards** (this lesson currently has none, unlike its siblings). Suggested cards:
  - *Cosine vs dot vs Euclidean*: `‖a−b‖² = ‖a‖²+‖b‖²−2a·b` — three views of one geometry; normalize → cosine.
  - *Why cosine isn't sacred*: the Netflix result — cosine of learned embeddings can be arbitrary; unnormalized dot product sometimes wins. URL in card.
  - *Anisotropy*: real embedding spaces are a narrow cone, so "cos ≈ 0 = unrelated" rarely happens; raw cosines run high.
  - *Duality*: a row vector is a linear map to ℝ; one neuron = one dot product. Bridges to `la-matrix`.

## Quiz improvements (specific misconceptions to target; keep questions self-contained — never require recalling lab-graph data)
Keep the three existing questions (they're solid and self-contained). Add/swap toward these, all self-contained:
1. **Projection meaning (new):** "Unit vector `b̂` = [1, 0]. For `a` = [3, 4], what is `a·b̂`, and what does it represent?" Answer: 3 — the length of `a`'s shadow on the x-axis. Targets the misconception that the dot product is "just a number" with no geometric meaning.
2. **Normalize-or-not (new):** "Two document embeddings point in *exactly* the same direction but one has twice the magnitude. Their **cosine similarity** is ___ and their **raw dot product** is ___." Answer: cosine = 1 (identical); raw dot product = larger for the longer vector. Targets the magnitude-discarding blind spot and the cosine-vs-dot distinction.
3. **Self dot product (new):** "`a·a` equals…" → `‖a‖²`. Targets the missing norm connection. Self-contained, no lab data.
4. **Scaled attention (optional, ties to `ml`):** "In transformer attention, the raw scores `Q·Kᵀ` are divided by `√d_k` mainly to…" → keep softmax gradients healthy / control variance (not "normalize to unit vectors," not "speed up matmul"). Targets the conflation flagged in inaccuracy #2.
- For Q2's WRONG_WHY, soften "completely unrelated" toward "geometrically orthogonal — no directional alignment," to avoid teaching the overclaim that orthogonal embeddings = unrelated meaning.

## Sources (the real URLs you consulted)
- 3Blue1Brown — Dot products and duality: https://www.3blue1brown.com/lessons/dot-products/
- Vaswani et al., "Attention Is All You Need" (scaled dot-product attention, §3.2.1): https://arxiv.org/abs/1706.03762
- Why √d_k scaling (variance/gradient explanation): https://dev.to/samyak112/scaling-is-all-you-need-understanding-sqrtd-in-self-attention-29pk
- Steck, Ekanadham, Kallus (Netflix), "Is Cosine-Similarity of Embeddings Really About Similarity?" (2024): https://research.netflix.com/publication/is-cosine-similarity-of-embeddings-really-about-similarity and https://arxiv.org/abs/2403.05440
- Anisotropy of embedding spaces (representation degeneration): https://aclanthology.org/2020.emnlp-main.733/ and https://medium.com/@pralaynawasare/your-embedding-model-has-a-geometry-problem-anisotropy-and-why-cosine-similarity-may-be-measuring-b6b9a4859595
- Dot product geometric definition / law of cosines: https://en.wikipedia.org/wiki/Dot_product#Geometric_definition
- Cosine vs dot vs Euclidean in vector search: https://medium.com/data-science-collective/cosine-distance-vs-dot-product-vs-euclidean-in-vector-similarity-search-227a6db32edb
