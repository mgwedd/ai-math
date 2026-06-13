# ml-boss — BOSS: Assemble the Transformer

## Current summary (what it teaches + what the lab does)

The lesson presents a high-level GPT forward pass (`tokenize → embed → [attention → MLP] × N → softmax → sample`) and annotates each stage with the building-block concepts from earlier lessons: vectors for embeddings, dot products + softmax for attention, matrices + ReLU for MLPs. The `ml` note points learners toward the original "Attention Is All You Need" paper and scaling laws. Two `deeper` cards cover tracing one word through the system and listing deliberately omitted topics (residual connections, LayerNorm, positional encodings, KV cache). The quiz tests pipeline-order knowledge and the distinction between learned and fixed stages.

The lab (`mlboss`) is a three-phase ordering exercise: (1) click the six pipeline stages in the correct forward-pass order; (2) repeat in under 20 seconds; (3) identify the two stages with no learned parameters (tokenizer, sampler). Wrong clicks reset the chain. There is no graphical simulation, no data flowing through the diagram, and no parameter inspection.

## Strengths

- The pipeline formula (`tokenize → embed → [attention → MLP] × N → softmax → sample`) is clean and memorable; the `× N` bracket elegantly shows block repetition.
- Correctly labels the tokenizer and sampler as the two stages with no learned parameters — a distinction many intro courses blur.
- The `deeper` card honestly catalogues what was left out (residual connections, LayerNorm, positional encodings, KV caching) rather than hiding the gaps.
- The `ml` note pointing directly to real papers ("Attention Is All You Need," scaling laws, RLHF) is appropriately aspirational for a master's-bound learner.
- The ordering-under-time-pressure mechanic (mission 2) turns rote vocabulary into fluency, which is genuinely useful.

## Inaccuracies / fidelity issues

### 1. The "softmax head" is listed as a learned stage — the lesson implies it is not

**The issue.** The lesson's `learned` object in `INTERACTIVES.mlboss` omits `'softmax head'` (it lists `embeddings`, `attention`, `MLP`), implying the softmax head has no learned parameters. Quiz Q1 reinforces this: the "correct" two unlearned stages are `tokenizer` and `sampler`, and the softmax head is nowhere mentioned as either learned or fixed.

**The correct statement.** The "softmax head" in a GPT-style model consists of two parts: (a) a **linear projection** (the "unembedding" or `lm_head`) that maps the final residual-stream vector to a logit for each vocabulary token — this matrix is large (~768 × 50,257 for GPT-2 small, 38.6M parameters) and IS learned; and (b) the **softmax operation itself**, which is a fixed normalization with no parameters. In GPT-2 the linear projection is weight-tied to the input embedding matrix (they share the same weights), so strictly speaking the weights are learned (just shared with the embedding layer). In many modern billion-parameter models (LLaMA 3, Qwen3, OLMo 2) weight tying is dropped and a fully independent learned matrix is used. The lesson conflates the projection matrix with the subsequent softmax, implicitly treating the entire stage as parameter-free — this is wrong.

**Recommended fix.** Split the label: call it "output projection + softmax" in the pipeline formula. In the `learn` text, note that the output projection is a large learned matrix (the "unembedding") and that the softmax after it is a fixed normalization. In the lab's `learned` registry, add `'softmax head'` (since it includes the learned projection), or better yet split into `'output projection'` (learned) and relabel the fixed softmax step explicitly.

**Source:** https://amaarora.github.io/posts/2020-02-18-annotatedGPT2.html — "the final input vectors are multiplied with a vocabulary matrix [768 × 50,257], then softmax is applied"; https://mbrenndoerfer.com/writing/weight-tying-shared-embeddings-transformers — discusses the weight tying relationship.

---

### 2. Positional encoding is entirely absent from the forward pass formula and the `learn` text

**The issue.** The pipeline reads `tokenize → embed → [attention → MLP] × N → softmax → sample`. There is no positional encoding step shown. The `deeper` card mentions positional encodings exist, but frames them as "deliberately missing" advanced material. For a master's-bound learner this is a meaningful gap: attention is order-blind by construction, and without positional encoding the model cannot distinguish "the cat sat on the mat" from "the mat sat on the cat."

**The correct statement.** Positional encoding is not optional advanced material — it is a *mandatory* part of the forward pass. The correct pipeline for GPT-style models is `tokenize → embed + positional encoding → [attention → MLP] × N → layer_norm → output_projection → softmax → sample`. The original "Attention Is All You Need" (Vaswani et al., 2017) uses fixed sinusoidal encodings. GPT-2 onward uses **learned positional embeddings** (a separate embedding matrix indexed by position, not a sinusoidal function). This is a factual omission from the primary pipeline formula shown to learners.

**Recommended fix.** Amend the pipeline formula to `tokenize → embed (token + position) → [attention → MLP] × N → ...` and add one sentence in the `learn` text: "Attention has no sense of order — the same vector no matter where in the sequence. Position is injected by adding a learned position embedding to each token embedding before the first block."

**Source:** https://jalammar.github.io/illustrated-gpt2/ — "the trained model has a matrix that contains a positional encoding vector for each of the 1,024 positions"; https://jalammar.github.io/illustrated-transformer/ — explains why positional encoding is needed ("One thing that's missing from the model as we have described it so far is a way to account for the order of the words").

---

### 3. Pre-norm vs. post-norm: the lesson implies a generic "attention → MLP" block, omitting that GPT-2+ use pre-norm with LayerNorm *inside* the block

**The issue.** The lesson says residual connections and LayerNorm are "deliberately missing" advanced topics. But for the learner reading GPT-2 code or the actual paper, the *precise* block formula is central to understanding how stacking works. The lesson's block is presented as bare `attention → MLP`, which matches neither the original transformer (post-norm: `LN(x + attention(x))` → `LN(x + FFN(x))`) nor GPT-2 (pre-norm: `x + attention(LN(x))` → `x + FFN(LN(x))`). The original GPT used post-norm; GPT-2 switched to pre-norm specifically for training stability at depth, and essentially all modern LLMs (GPT-3, LLaMA, Mistral, Falcon) use pre-norm. This is not a minor detail — it is why training very deep transformers works.

**The correct statement.** Each GPT-2 transformer block is: `x = x + attention(LayerNorm(x))`, then `x = x + FFN(LayerNorm(x))`. The pre-norm placement means gradients flow cleanly through the additive residual path even in 96-layer models. The lesson's existing `deeper` card mentions "add the input back so gradients flow" but does not mention pre-norm, which is the more important engineering insight.

**Recommended fix.** In the `deeper` card about residual connections, add: "Modern GPTs (GPT-2 onward) apply LayerNorm *before* each sub-block (pre-norm), not after. This small change made it possible to train 96-layer models stably — the residual path is always a clean identity shortcut."

**Source:** https://medium.com/@ashutoshs81127/why-pre-norm-became-the-default-in-transformers-4229047e2620; https://apxml.com/courses/how-to-build-a-large-language-model/chapter-11-scaling-transformers-architectural-choices/normalization-layer-placement.

---

### 4. GPT's "softmax head" step is missing the final LayerNorm

**The issue.** The GPT-2 architecture includes a **final LayerNorm** applied to the residual stream *before* the output projection, not just within each block. The formula is: `ln_f(x) → lm_head(x) → softmax`. The lesson's pipeline `softmax head → sampler` omits this final normalization, which is architecturally meaningful — without it the output distribution can become numerically ill-conditioned.

**The correct statement.** In GPT-2, after the N transformer blocks, there is a separate final `LayerNorm` (`ln_f`) applied once, then the output projection matrix, then softmax. This final LN has its own learned scale (γ) and shift (β) parameters.

**Recommended fix.** Optionally, this can stay in the "deliberately missing" category, but it should be listed there explicitly alongside KV caching, since it affects how a learner reads the actual model code.

**Source:** https://sararavi14.medium.com/gpt-2-architecture-demystified-a-step-by-step-breakdown-74b1c5c80d17; https://amaarora.github.io/posts/2020-02-18-annotatedGPT2.html.

---

## Conceptual gaps

**1. The residual stream as a communication channel.** The lesson frames residual connections purely as a gradient fix (anti-vanishing-gradient). The Anthropic circuits framework (Elman, Olah et al., 2021) reveals a deeper framing: the residual stream is a shared workspace that all components read from and write to additively. Attention heads and MLPs don't *transform* the stream — they *add* to it. This view is now standard in interpretability research and makes it much clearer *why* the depth pattern `attention → MLP → attention → MLP → ...` works: each block reads the accumulated context, enriches it, and passes the richer stream forward.

**2. Causal masking.** The lesson omits that GPT-style attention is *masked*: each token can only attend to itself and earlier tokens. The `deeper` card says "attention mixes in context" but doesn't say that future tokens are masked. A learner reading the original paper will encounter the term "masked self-attention" immediately and will have no framework for it.

**3. Multi-head attention — what the "multi" means.** The lesson says "dot products + softmax" for attention but never explains what multi-head attention adds. Each head learns a different Q/K/V projection into a lower-dimensional subspace, allowing the model to attend along multiple independent axes simultaneously (e.g., syntactic role AND coreference). A single sentence on this would connect to the matrix/subspace content from World 1.

**4. The MLP's 4× expansion.** The FFN in each block expands to 4× the model dimension before projecting back (e.g., 768 → 3,072 → 768 in GPT-2 small). This is not arbitrary: the expanded dimension provides a large "scratch space" for per-token computation, and research increasingly frames this layer as a key-value memory (Geva et al., 2021). The lesson's "per-token hinge-bending" intuition is correct but undersells this.

**5. Weight tying as an interesting architectural insight.** GPT-2 reuses the input embedding matrix as the output projection (transposed). This means the model is forced to express output token predictions in the same vector space as input token representations — a significant constraint that has measurable effects on learning. Large modern models drop this constraint. Worth a sentence.

**6. Autoregressive generation vs. parallel training.** During training, all token predictions are made in parallel (with causal masking). During inference, tokens are generated one at a time. The lesson describes `sample → next token` but doesn't explain why generation is sequential while training is batched — this is the core of what makes KV caching useful and why inference is slower than training per-token.

---

## Lab ideas

### Lab A — "Data Flows Through" pipeline visualizer (upgrade of existing mlboss)
Replace or extend the ordering exercise with an animated pipeline that shows a real token (e.g., "cat") flowing through each stage. At each stage, a small panel shows what changes: the embedding vector gets a position vector added (stage 2), the attention head draws colored weight arrows to nearby tokens (stage 3), the FFN transforms the vector (stage 4). The learner clicks each stage to advance the token. Missions: (1) identify at which stage the token first "knows" its position; (2) observe that after the last block the residual stream vector is projected into a 50,257-dimensional space; (3) adjust temperature and watch the softmax sharpen/flatten.

**What it reveals:** positional encoding isn't optional — the token is identical without it; attention is the only stage that looks at *other* tokens; MLP acts independently per token.

### Lab B — "Attention mask" explorer
Show a small 5-token sequence. Render the 5×5 attention score matrix. Toggle between "unmasked" (encoder-style, all tokens see all others) and "masked" (GPT-style, each token sees only itself and earlier tokens). Let the learner see the upper triangle zeroed out. Mission: predict which token has the most influence on the final-position token.

**What it reveals:** GPT is decoder-only precisely because of causal masking; BERT uses the encoder without masking. This is the single architectural choice that defines the GPT family.

### Lab C — "Multi-head decomposition" (complementing existing attention lesson)
Show a single 4-token sentence processed by 2 attention heads simultaneously. Each head produces a different attention weight matrix. Let the learner observe that head 1 might attend strongly to syntactic head words while head 2 tracks recency. Concatenate the outputs and show the projection back to model dimension.

**What it reveals:** multi-head is not just "more capacity" — it's parallel processing in different representational subspaces.

### Lab D — "Residual stream write-read" (the Anthropic circuits intuition)
Show the residual stream as a horizontal ribbon. At each layer, an attention delta vector and an MLP delta vector are visually "added" to the ribbon (small arrows of varying length and direction). Show that without residuals the ribbon is replaced at each layer; with residuals it accumulates. The learner toggles residuals on/off and observes gradient flow degrade.

**What it reveals:** residual connections are not just a gradient trick — they create a shared communication bus that later layers can read without overwriting early information.

---

## Content improvements

### `learn` text
1. **Add positional encoding to the pipeline formula:** Change `tokenize → embed → [attention → MLP] × N → softmax → sample` to `tokenize → embed (token + position) → [attention → MLP] × N → output projection → softmax → sample`. Add one sentence: "Before the first block, each token's embedding is summed with a learned position vector — attention has no sense of order, so position has to be injected explicitly."

2. **Clarify the softmax head:** Current text says "Softmax head: vector → next-token distribution." This merges two things. Write: "Output projection: the residual stream vector is multiplied by a large learned matrix (vocab_size × d_model) to produce one logit per token — this matrix has as many rows as there are words in the vocabulary. Softmax turns those logits into a probability distribution." This disambiguates the learned projection from the fixed normalization operation.

3. **Add one sentence on causal masking:** "Attention in GPT is *causal*: each token can only attend to itself and tokens to its left. This masking is what makes GPT a generator rather than a bidirectional encoder like BERT."

### `ml` note
Add: "One concrete exercise: open the GPT-2 model card on Hugging Face and count the parameters by layer. The embedding table and output projection together account for ~30% of all parameters in GPT-2 small — understanding weight tying explains why."

### `deeper` cards
- In card 2 ("what's deliberately missing"), change "Residual connections (add the input back so gradients flow — the vanishing-gradient fix from c-chain)" to: "Residual connections create a shared **residual stream** — a vector every layer reads from and writes to additively. Attention heads and MLPs don't replace the stream, they add to it. Modern GPTs (GPT-2+) apply LayerNorm *before* each sub-block (pre-norm), not after, making very deep models trainable." This preserves the gradient-flow insight while adding the more important communication-channel framing.
- Add to the "deliberately missing" list: "Causal masking (GPT attends only leftward — the thing that makes it a generator, not an encoder); multi-head attention (parallel attention in multiple subspaces simultaneously); weight tying between input embedding and output projection; KV caching."

---

## Quiz improvements

**Current Q1** ("Which two pipeline stages have NO learned parameters?") is correct but misses a teachable tension: the softmax *operation* has no parameters, but the preceding linear projection *does*. A better question exposes this distinction.

**Proposed replacement Q1:**
> Q: The "output head" of a GPT converts the final hidden vector into a next-token distribution. Which step in that head is parameter-free?
> opts: ['The softmax normalization', 'The linear projection to vocabulary size', 'Both steps — the head is entirely fixed', 'Neither — softmax has a learned temperature']
> a: 0 (softmax normalization is fixed; the linear projection is a large learned matrix)
> why: "Softmax is a fixed operation (eˣ / Σeˣ). The linear layer before it — the 'unembedding' matrix — is one of the largest learned matrices in the model."

**Proposed new Q5 — causal masking:**
> Q: GPT-style transformers use *causal* (masked) attention. What does the mask enforce?
> opts: ["Each token attends only to itself and earlier tokens", "Each token attends only to later tokens", "Tokens attend only to their nearest neighbors", "The mask removes padding tokens from attention"]
> a: 0
> why: "The upper triangle of the attention matrix is set to −∞ before softmax, zeroing out future-token weights. This is why GPT can generate left-to-right without 'seeing' the answer."

**Proposed new Q6 — positional encoding:**
> Q: Why do transformers need positional encoding at all?
> opts: ["Self-attention is permutation-invariant — it gives the same output regardless of token order", "Embeddings are too small to store positional information", "Backpropagation requires ordered inputs", "Token IDs already encode position"]
> a: 0
> why: "Dot-product attention scores depend only on vector content, not slot position. Swap two tokens and their attention scores swap symmetrically. Positional encoding breaks this symmetry."

**Proposed new Q7 — multi-head purpose:**
> Q: Why use *multiple* attention heads rather than one large head?
> opts: ["Different heads can attend along different axes simultaneously (e.g., syntax and coreference)", "More heads always means lower perplexity", "Multiple heads are needed to handle long sequences", "Single-head attention is numerically unstable"]
> a: 0
> why: "Each head projects Q/K/V into a separate subspace, so heads specialize: one might track grammatical structure, another might resolve pronouns. This is not just capacity — it's parallel decomposition."

---

## Sources

- Jay Alammar, "The Illustrated Transformer": https://jalammar.github.io/illustrated-transformer/
- Jay Alammar, "The Illustrated GPT-2": https://jalammar.github.io/illustrated-gpt2/
- Vaswani et al., "Attention Is All You Need" (2017): https://arxiv.org/pdf/1706.03762
- Elhage et al., "A Mathematical Framework for Transformer Circuits" (Anthropic, 2021): https://transformer-circuits.pub/2021/framework/index.html
- Polo Club, "Transformer Explainer" (live GPT-2 in-browser): https://poloclub.github.io/transformer-explainer/
- Aman Arora, "The Annotated GPT-2": https://amaarora.github.io/posts/2020-02-18-annotatedGPT2.html
- Ashutosh, "Why Pre-Norm Became the Default in Transformers": https://medium.com/@ashutoshs81127/why-pre-norm-became-the-default-in-transformers-4229047e2620
- Michael Brenndoerfer, "Pre-Norm vs Post-Norm": https://mbrenndoerfer.com/writing/pre-norm-vs-post-norm
- Michael Brenndoerfer, "Weight Tying": https://mbrenndoerfer.com/writing/weight-tying-shared-embeddings-transformers
- Stanford CS224N Lecture 8 (2024): https://web.stanford.edu/class/archive/cs/cs224n/cs224n.1244/slides/cs224n-2024-lecture08-transformers.pdf
- Wikipedia, "Transformer (deep learning architecture)": https://en.wikipedia.org/wiki/Transformer_(deep_learning_architecture)
- apxml.com, "Normalization Layer Placement (Pre-LN vs Post-LN)": https://apxml.com/courses/how-to-build-a-large-language-model/chapter-11-scaling-transformers-architectural-choices/normalization-layer-placement
