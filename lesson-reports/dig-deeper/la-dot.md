# la-dot — Dot Product & Similarity

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [Dot products and duality — 3Blue1Brown lesson text](https://www.3blue1brown.com/lessons/dot-products/) — Canonical two-part treatment: the projection ("shadow") interpretation of `a·b̂` as a signed length, then the duality argument showing why a row vector is a linear map to ℝ. These two ideas — projection and duality — are the conceptual gaps the lesson most needs.
- [Vaswani et al., "Attention Is All You Need" (arXiv 1706.03762)](https://arxiv.org/abs/1706.03762) — The original transformer paper (sec. 3.2.1) defines scaled dot-product attention: `softmax(QK^T / √d_k) V`. Authoritative source for why the `√d_k` divisor exists (variance control). Every claim the lesson makes about Q·Kᵀ should trace back here.
- [Steck, Ekanadham & Kallus, "Is Cosine-Similarity of Embeddings Really About Similarity?" (arXiv 2403.05440, Netflix/2024)](https://arxiv.org/abs/2403.05440) — Peer-reviewed (WWWW 2024); shows that cosine similarity of *learned* embeddings can be arbitrary and that the unnormalized dot product sometimes outperforms it. Directly grounds the lesson's "cosine is the workhorse" overclaim.
- [Dot product: Geometric definition — Wikipedia](https://en.wikipedia.org/wiki/Dot_product#Geometric_definition) — Establishes that the coordinate-sum is the definition and `‖a‖‖b‖cos θ` is derived via the law of cosines — not a second definition. Needed to close the lesson's implicit conflation of definition and theorem.

### Watch
- [Dot products and duality | Essence of Linear Algebra Ch.9 (3Blue1Brown)](https://www.youtube.com/watch?v=LyGKycYT2v0) — (~14 min) The projection-shadow intuition for `a·b̂`, then the duality symmetry argument. The single best explanation of why `a·b = b·a` is surprising and what it means that a vector *is* a linear map to ℝ. Essential for master's-level understanding.
- [ME564 Lecture 21: Inner product, norm, cross product (Steve Brunton, UW Eigensteve)](https://www.youtube.com/watch?v=VnaAKf6lsZA) — (~50 min) Engineering-math treatment covering inner products, norms, and geometric interpretation; situates the dot product within physics and data analysis. Brunton bridges theory to applications that 3B1B omits.
- [MIT 18.065 Lecture 1: The Column Space of A Contains All Vectors Ax (Strang, 2018)](https://www.youtube.com/watch?v=YiqIkSHSmyc) — (~45 min) Strang's ML-era lecture introduces dot products, projections, and column spaces in the context of data analysis. From MIT 18.065 "Matrix Methods in Data Analysis," a more modern companion to 18.06.

## Science & depth recommendations (to reach master's level)

- **Missing: projection interpretation** → `a·b̂` is the signed length of the shadow of `a` onto `b`'s direction. This is the geometric meaning that makes the dot product a measurement, and is the bridge to least-squares projections and PCA. The 3Blue1Brown lesson text covers it precisely. Without this, learners see the dot product as "just arithmetic."
- **Fix the scaled-attention claim** → The lesson's `ml` note says attention "scores every query against every key with a dot product." Real attention is `softmax(QKᵀ / √d_k) V` — the `√d_k` is not cosmetic; without it, the dot products have variance `d_k` (for unit-variance components), saturating softmax into near-one-hot outputs with vanishing gradients. Source: Vaswani et al. 2017 §3.2.1 (confirmed live).
- **Soften "cosine similarity is the workhorse"** → Cosine is one choice; the unnormalized dot product is used in attention and sometimes outperforms cosine in retrieval. Cosine of learned embeddings can be artifact-driven. Source: Steck et al. 2024 (arXiv 2403.05440, confirmed live).
- **Add: the geometric identity is a theorem, not a definition** → The coordinate sum is the definition; `‖a‖‖b‖cos θ` is proved via the law of cosines. In high dimensions, this is how angle is *defined*. Without the distinction, a circular-definition confusion lurks.
- **Add: `a·a = ‖a‖²`** → The self dot product equals the squared norm — a one-line fact that connects the dot product to L2 norms, energy, and the motivation for the `√d_k` scaling. Currently missing.

## Sources
- [Dot products and duality — 3Blue1Brown](https://www.3blue1brown.com/lessons/dot-products/) — canonical text / high-quality explainer, confirmed live.
- [3Blue1Brown Ch.9 YouTube: LyGKycYT2v0](https://www.youtube.com/watch?v=LyGKycYT2v0) — high-quality explainer, confirmed live.
- [ME564 Lecture 21 YouTube: VnaAKf6lsZA](https://www.youtube.com/watch?v=VnaAKf6lsZA) — Steve Brunton / UW Eigensteve, confirmed live.
- [MIT 18.065 Lecture 1 YouTube: YiqIkSHSmyc](https://www.youtube.com/watch?v=YiqIkSHSmyc) — MIT 18.065 (Strang, 2018), confirmed live.
- [Vaswani et al. 2017, "Attention Is All You Need" — arXiv 1706.03762](https://arxiv.org/abs/1706.03762) — seminal paper / peer-reviewed (NeurIPS), confirmed live.
- [Steck, Ekanadham & Kallus 2024 — arXiv 2403.05440](https://arxiv.org/abs/2403.05440) — peer-reviewed (WWW 2024 / Netflix Research), confirmed live.
- [Dot product geometric definition — Wikipedia](https://en.wikipedia.org/wiki/Dot_product#Geometric_definition) — confirmed live.
