# ml-attn — Attention: Soft Lookup

## Dig Deeper appendix (curated — graduate-authoritative)
### Read
- [Attention Is All You Need (Vaswani et al., 2017)](https://arxiv.org/abs/1706.03762) — the seminal transformer paper; §3.2 defines scaled dot-product attention `softmax(QKᵀ/√dₖ)V` and multi-head attention exactly as the lesson teaches, and §3.2.1 gives the √d-scaling argument the lesson's deeper card compresses.
- [The Illustrated Transformer (Jay Alammar)](https://jalammar.github.io/illustrated-transformer/) — the definitive visual walkthrough of how q, k, v are learned projections of the same embedding, how multi-head attention concatenates and re-projects with W_O, and where the value blend comes from — filling the lesson's key/value and W_Q/W_K/W_V gaps.
- [Attention? Attention! (Lilian Weng)](https://lilianweng.github.io/posts/2018-06-24-attention/) — a rigorous graduate survey of attention variants (additive, dot-product, scaled dot-product, self-attention) with the math laid out; good bridge from the lesson's intuition to formal notation.

### Watch
- [Attention in transformers, visually explained | Chapter 6, Deep Learning](https://www.youtube.com/watch?v=eMlx5fFNoYc) (3Blue1Brown, ~26 min) — the clearest visual account of how queries and keys interact through dot products and how the value vectors are blended; directly animates the mechanism the lab makes you drag.
- [Let's build GPT: from scratch, in code, spelled out](https://www.youtube.com/watch?v=kCc8FmEb1nY) (Andrej Karpathy, ~1h 56m) — codes self-attention line by line, including the √d scaling and the causal mask, showing q/k/v as matrix multiplies rather than hand-chosen vectors.

## Science & depth recommendations (to reach master's level)
- The √d scaling is stated as "dot products grow with √d" → sharpen it: for unit-variance components q·k has *variance* d (std √d); dividing by √d restores variance ≈ 1 and keeps softmax out of the saturated, tiny-gradient regime, grounded in Vaswani et al. §3.2.1.
- q, k, v are treated as given primitives → state that each is a learned linear projection of the same token embedding (`q = W_Q x`, `k = W_K x`, `v = W_V x`), and that multi-head runs several such triples then concatenates and projects with W_O, grounded in the Illustrated Transformer and Vaswani §3.2.2.
- Keys and values are conflated in the subtitle and lab → distinguish them: the key scores the lookup, the value is the separate content blended into the output ("label on the spine" vs "what's inside the book"); the lab never shows values, grounded in the Illustrated Transformer.
- Self-attention is order-blind → note it is permutation-equivariant, which is *why* positional encodings exist; the lesson mentions causal masking but never this, grounded in Vaswani et al. §3.5.
- The O(n²) cost and cross-attention are under-covered → keep the O(n²) deeper card and add that encoder-decoder cross-attention has queries and keys/values from *different* sequences, grounded in Vaswani et al. and Lilian Weng.

## Sources
- https://arxiv.org/abs/1706.03762 — seminal peer-reviewed paper (Vaswani et al., NeurIPS 2017)
- https://jalammar.github.io/illustrated-transformer/ — high-quality canonical explainer (Jay Alammar)
- https://lilianweng.github.io/posts/2018-06-24-attention/ — high-quality graduate survey (Lilian Weng, OpenAI)
- https://www.youtube.com/watch?v=eMlx5fFNoYc — 3Blue1Brown, high-quality explainer
- https://www.youtube.com/watch?v=kCc8FmEb1nY — Andrej Karpathy, authoritative from-scratch lecture
