# ml-boss — BOSS: Assemble the Transformer

## Dig Deeper appendix (curated — graduate-authoritative)
### Read
- [The Illustrated GPT-2 (Jay Alammar)](https://jalammar.github.io/illustrated-gpt2/) — the definitive visual assembly of the full decoder-only stack: token + positional embeddings, masked self-attention, per-token FFN, final LayerNorm, and the output projection — exactly the pipeline the lesson names.
- [The Annotated GPT-2 (Aman Arora)](https://amaarora.github.io/posts/2020-02-18-annotatedGPT2.html) — a code-level PyTorch walkthrough confirming the details the lesson simplifies: pre-norm LayerNorm inside each block, the learned position embeddings (`wpe`), and the `[d_model × 50257]` output projection (unembedding) before softmax.
- [Attention Is All You Need (Vaswani et al., 2017)](https://arxiv.org/abs/1706.03762) — the seminal source for the block structure (attention → FFN, residual connections, LayerNorm) and sinusoidal positional encoding; the paper the lesson tells learners they can now read.
- [Scaling Laws for Neural Language Models (Kaplan et al., 2020)](https://arxiv.org/abs/2001.08361) — the paper behind the lesson's "scaling laws are ml-learning's capacity story at planetary size" claim: loss falls as a power law in model size, data, and compute.

### Watch
- [Let's build GPT: from scratch, in code, spelled out](https://www.youtube.com/watch?v=kCc8FmEb1nY) (Andrej Karpathy, ~1h 56m) — assembles the entire GPT forward pass in code following "Attention Is All You Need": embeddings, positional encoding, stacked blocks with residuals and pre-norm, the causal mask, and the output head. The single best "put it all together" resource.
- [But what is a GPT? Visual intro to transformers | Chapter 5, Deep Learning](https://www.youtube.com/watch?v=wjZofJX0v4M) (3Blue1Brown, ~27 min) — animates the whole pipeline end to end, showing how a token flows from embedding through blocks to a next-token distribution.

## Science & depth recommendations (to reach master's level)
- Positional encoding is missing from the pipeline formula → it is mandatory, not "deliberately missing": amend to `tokenize → embed (token + position) → [attention → MLP] × N → final LN → output projection → softmax → sample`; GPT-2 uses *learned* position embeddings, grounded in the Illustrated GPT-2 and Annotated GPT-2.
- The "softmax head" conflates a learned projection with the fixed softmax → split it: the output projection (unembedding, ~768×50257 in GPT-2 small, weight-tied to the input embedding) is learned; the softmax is parameter-free, grounded in the Annotated GPT-2.
- Pre-norm vs post-norm is omitted → state that GPT-2+ apply LayerNorm *before* each sub-block (`x + attn(LN(x))`), which is what makes very deep models trainable, grounded in the Annotated GPT-2 and Vaswani et al.
- Causal masking is never stated → each token attends only to itself and earlier tokens; this is what makes GPT a left-to-right generator rather than a bidirectional encoder, grounded in the Illustrated GPT-2.
- The residual stream framing is under-used → beyond a gradient fix, residual connections form a shared workspace that every block reads from and adds to additively, which explains why the `attention → MLP` depth pattern composes, grounded in the transformer-circuits framing (Elhage et al., 2021).
- The FFN's 4× expansion and weight tying deserve a sentence each → the block's FFN expands to 4·d_model then projects back (scratch space; key-value memory, Geva et al. 2021), and GPT-2 ties the input embedding and output projection, grounded in the Annotated GPT-2.

## Sources
- https://jalammar.github.io/illustrated-gpt2/ — high-quality canonical explainer (Jay Alammar)
- https://amaarora.github.io/posts/2020-02-18-annotatedGPT2.html — code-level walkthrough (Aman Arora, high-quality explainer)
- https://arxiv.org/abs/1706.03762 — seminal peer-reviewed paper (Vaswani et al., NeurIPS 2017)
- https://arxiv.org/abs/2001.08361 — peer-reviewed paper (Kaplan et al., scaling laws)
- https://www.youtube.com/watch?v=kCc8FmEb1nY — Andrej Karpathy, authoritative from-scratch lecture
- https://www.youtube.com/watch?v=wjZofJX0v4M — 3Blue1Brown, high-quality explainer
