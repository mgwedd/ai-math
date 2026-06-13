# ml-attn — Attention: Soft Lookup

## Current summary (what it teaches + what the lab does)

The lesson introduces attention as a "differentiable dictionary lookup": a query q is dot-producted against a set of key vectors k₁…kₙ, the scores are softmaxed into weights, and a weighted sum of value vectors produces the output. The `learn` section explains query/key/value roles and why softmax (rather than argmax) makes the whole thing trainable via backprop. The `ml` note mentions multi-head and self-attention in one sentence. The `deeper` cards add the cocktail-party metaphor and a brief mention of √d scaling plus causal masking.

The interactive lab (`mlattn`) places four tokens ("the", "cat", "sat", "mat") as fixed key vectors in 2-D. The learner drags a query vector and watches dot-product scores feed a softmax, visualized as arrow thickness + bar charts. Three missions: focus weight on "cat" (> 0.8), make attention nearly uniform (max−min < 0.1), then re-focus on "mat".

---

## Strengths

- The core 3-step formula (dot → softmax → blend) is stated crisply and correctly.
- Explicit connection to prior worlds (dot products from World 1, softmax/eˣ from World 2) is pedagogically strong.
- The lab's drag-the-query interaction is hands-on and directly shows query-key geometry controlling weights — the "uniform attention" mission is particularly clever because it forces the learner to reason about orthogonality.
- WRONG_WHY answers are technically accurate and instructive.
- The cocktail-party analogy is accessible and sticky.
- Quiz Q4 (softmax amplifies alignment) correctly targets a non-obvious geometric insight.

---

## Inaccuracies / fidelity issues

### 1. The `deeper` card misstates the √d scaling argument

**The issue:** "in high dimensions raw dot products grow with √d" — stated as if the dot products themselves grow proportionally to √d.

**The correct statement:** When q and k each have d components drawn from distributions with variance 1 (i.e., unit-variance initialization), their dot product q·k has **variance d** (sum of d independent unit-variance terms). Its standard deviation is therefore √d. Dividing by √d restores variance ≈ 1, keeping softmax out of saturation regions where gradients vanish. It is the *variance* that scales as d, and *std dev* as √d — the dot product's *expected magnitude* grows as √d. The current phrasing "grow with √d" is directionally correct but compressed in a way that conflates two levels and misses the key insight (variance argument → gradient health).

**Source:** Vaswani et al. (2017), "Attention Is All You Need", §3.2.1: "We suspect that for large values of dₖ, the dot products grow large in magnitude, pushing the softmax function into regions where it has extremely small gradients. To counteract this effect, we scale the dot products by 1/√dₖ." The variance argument (if each component has variance 1, dot product has variance dₖ) is standard and appears in UvA DL notebooks tutorial 6. Source: https://arxiv.org/html/1706.03762v7 and https://uvadlc-notebooks.readthedocs.io/en/latest/tutorial_notebooks/tutorial6/Transformers_and_MHAttention.html

### 2. Values are described but their origin from W_V is omitted

**The issue:** The lesson treats q/k/v as given primitives. It never explains that in a real transformer, q, k, and v are all **linear projections of the same input token embeddings** via learned weight matrices W_Q, W_K, W_V. The `ml` note introduces "multi-head" as "several q/k/v lookups in parallel" without noting that each head uses a *different* learned projection matrix.

**The correct statement:** In self-attention, for each token with embedding x, the query, key, and value vectors are computed as q = W_Q x, k = W_K x, v = W_V x. These are three separate learned linear transformations of the *same* input. Multi-head attention runs h copies of this with h distinct (W_Q^i, W_K^i, W_V^i) triples, concatenates the h outputs, then applies a final learned projection W_O. This is the mechanism that lets different heads attend to different representation subspaces simultaneously.

**Source:** Vaswani et al. (2017) §3.2.2, Illustrated Transformer (Alammar): https://jalammar.github.io/illustrated-transformer/ and https://arxiv.org/html/1706.03762v7

### 3. Values vs. keys conflated in the subtitle and lab note

**The issue:** The subtitle says "every token offers an answer (key/value)" — treating key and value as a unit. The lab note says "Gold arrows = the **keys** of four tokens" but the lab actually never shows values at all; the output vector (a blend of values) is also invisible. The learner ends the lab believing attention is entirely about query-key alignment geometry, without seeing that the actual *output content* comes from values, which can differ from keys.

**The correct statement:** Keys and values are distinct vectors. The key is what a token advertises for scoring purposes; the value is what it contributes to the output. In the original paper they are separate projections (W_K ≠ W_V) and could have different dimensionalities (d_k vs d_v). Intuitively: the key is a "label on the book spine," the value is "what's inside the book." A learner who only drags a query against keys never experiences that the output is a blend of a *third* set of vectors.

**Source:** Alammar (Illustrated Transformer), Dive into Deep Learning §11.1, https://d2l.ai/chapter_attention-mechanisms-and-transformers/queries-keys-values.html

### 4. "Gradients flow through the whole lookup" — slightly imprecise framing

**The issue:** The claim that soft attention makes gradients flow "through the whole lookup" is true but incomplete: what actually matters is that softmax is *everywhere differentiable* and that the weighted average is a smooth function of all scores. This should be distinguished from the vanishing-gradient problem that scaling fixes.

**Correct framing:** Argmax has a zero derivative almost everywhere, making credit assignment impossible. Softmax's gradient is non-zero everywhere (though it can become tiny near saturation — hence √d scaling). Saying "gradients flow through" is fine as intuition but the deeper reason is that backprop needs ∂(output)/∂(weights) to be non-zero for training to work, and a smooth weighted average provides this.

**Source:** Dive into Deep Learning §11.1 differentiability discussion; UvA tutorial 6.

---

## Conceptual gaps (what a serious learner still needs)

1. **The W_Q / W_K / W_V projection step is entirely missing.** A master's-bound learner reading any transformer paper within a week of this lesson will encounter Q = XW_Q immediately. The lesson should at minimum say "q, k, v are learned linear projections of each token's embedding."

2. **Values are not visualized.** The lab shows query-key geometry → weights, but the output (Σ wᵢ vᵢ) is a vector in a (possibly different) value space that never appears. The learner has no feel for what the attention *output* looks like geometrically.

3. **The output projection W_O after multi-head concatenation** is not mentioned anywhere. This is the matrix that stitches h heads' outputs back into model dimension — an important learned parameter.

4. **Positional encoding context.** Self-attention is *permutation-equivariant*: swap token positions and the output just swaps accordingly. Without positional encodings, attention has no idea about order. The `deeper` card mentions causal masking (which encodes some position info implicitly) but misses that vanilla attention is order-blind, which is why positional encodings (sinusoidal or RoPE) exist.

5. **Cross-attention vs. self-attention distinction.** In encoder-decoder transformers (BERT-to-translation), decoder queries attend to encoder keys/values — q and k/v come from *different* sequences. The lesson only mentions self-attention.

6. **Computational complexity: O(n²d).** Self-attention scales quadratically with sequence length, which is a central practical limitation motivating flash attention, linear attention, etc. A master's-bound learner should know this before reading transformer papers.

7. **What multi-head heads actually learn.** Heads specialize: some track syntactic dependencies, some copy (induction heads, Olsson et al. 2022), some attend to positional neighbors. The "several lookups in parallel" description undersells the richness.

8. **The lab uses the query as a raw 2-D vector, not a projection of a token embedding.** This abstracts away the W_Q projection and could leave the learner thinking q is chosen directly, not learned.

---

## Lab ideas (concrete: name the interactive, what the learner manipulates, what it reveals)

### Lab A: "Key vs. Value — what you hear vs. what you say" (upgrade to current lab)
Add a second panel alongside the current query-dragging lab. Each token has a **key vector** (shown as gold arrows, as now) and a **value vector** (shown as teal arrows, same canvas). After the learner sets attention weights by dragging q, display the **output vector** = Σ wᵢ vᵢ as a magenta arrow. Allow the learner to see how the output arrow changes even when weights stay fixed (by toggling value positions). Mission: "Identify which value contributes most to the output when weight on 'cat' = 0.9." This is the single highest-value fix — it teaches that keys score and values contribute, which the current lab cannot convey.

### Lab B: "√d scaling — watch softmax saturate" (new standalone)
A slider controls d (key dimension, 2→128). For fixed random q and k vectors scaled to unit variance, plot the distribution of softmax weights as d increases. Show how without the √d divisor the distribution collapses to one-hot (saturation) and gradients vanish. With the divisor the distribution stays diffuse. Mission: "Set d=64 without scaling — what does the max weight reach? Now enable scaling — what happens?" This makes the √d argument visceral and fixes the deeper card's hand-wavy explanation.

### Lab C: "W_Q / W_K projection — how the same input becomes Q and K" (new conceptual)
Show a single 2-D token embedding x. Provide two draggable 2×2 matrices W_Q and W_K (4 numbers each, sliders). Show q = W_Q x and k = W_K x as arrows. Show how different W matrices project the *same* x into different directions, creating the query-key distinction. Mission: "Find W_Q, W_K such that the 'cat' embedding gets high self-similarity (q·k large) and 'the' gets low self-similarity." Reveals why training W_Q and W_K is the learning — not choosing q/k by hand.

---

## Content improvements (specific learn/ml/deeper text upgrades)

### `learn` section additions

After "Output: a blend of values, weighted by relevance", add:

> In a real transformer q, k, and v are never chosen by hand — they are **learned linear projections** of each token's embedding x: q = W_Q x, k = W_K x, v = W_V x. Three separate weight matrices map the same input into three roles. Training adjusts W_Q, W_K, and W_V so that similar-meaning tokens end up with high q·k scores.

### `ml` note upgrade

Replace the current sentence:

> "Multi-head" = several q/k/v lookups in parallel

with:

> "Multi-head" = h independent (W_Q, W_K, W_V) triples applied to the same input, each head free to attend to different semantic relationships. Outputs of all h heads are concatenated and passed through a final learned projection W_O before hitting the MLP. Self-attention means Q, K, V all come from the same sequence; cross-attention (encoder-decoder models) has Q from one sequence and K, V from another.

### `deeper` card — fix the √d card

Replace "in high dimensions raw dot products grow with √d" with:

> When q and k each have d unit-variance components, their dot product q·k has **variance d** and standard deviation √d — scores drift far from zero as dimension grows. Dividing by √d restores variance ≈ 1, keeping softmax in a healthy gradient regime. Skip this and at d=512 every head is effectively one-hot: a hard lookup that can't be trained.

### Add a new `deeper` card: "The permutation trap"

> Self-attention is **permutation-equivariant**: swap "the cat sat" to "sat cat the" and every token's context vector just shuffles along with it. The model is order-blind by design. Positional encodings (sinusoidal, learned, or rotary/RoPE) inject order information so that token 3 and token 300 feel different even if their embeddings are identical. Without them, "John loves Mary" and "Mary loves John" would be indistinguishable.

---

## Quiz improvements (specific misconceptions to target; keep questions self-contained)

### Existing quiz is adequate but misses critical misconceptions. Add or replace:

**New Q — targeting the W_Q/W_K/W_V gap:**
> In self-attention, query and key vectors are produced by…
> A) Applying separate learned weight matrices (W_Q, W_K) to each token's embedding ✓
> B) Copying the token embedding twice
> C) Randomly sampling from the embedding space
> D) Averaging adjacent token embeddings
>
> *Why:* The same input token generates q, k, and v through three distinct linear projections — this is where the learning actually lives, and it's the single most-misunderstood step.

**New Q — targeting keys vs. values distinction:**
> What is the difference between a key vector and a value vector for the same token?
> A) The key determines how much attention the token receives; the value is what it contributes to the output ✓
> B) They are the same vector
> C) The key is the output; the value is the score
> D) Values are only used during training, not inference
>
> *Why:* Learners frequently treat key/value as synonyms. Keys and values are separate projections (W_K ≠ W_V) with distinct roles.

**New Q — targeting positional encoding need:**
> If you fed self-attention the words "the cat sat" and "sat the cat" (same tokens, different order), without positional encodings the outputs would be…
> A) Identical except reordered — attention is order-blind ✓
> B) Completely different — attention tracks position naturally
> C) Zero — the model would refuse to process scrambled input
> D) Identical — word order never matters in English
>
> *Why:* Permutation-equivariance is counterintuitive and directly motivates positional encodings, a ubiquitous concept in transformer papers.

**Replace or supplement Q3** (current Q3 about output being a weighted average — correct and useful, keep it). The focus note could add: "Note that values, not keys, are what get blended."

---

## Sources (the real URLs you consulted)

1. Vaswani et al. (2017), "Attention Is All You Need" (original paper, HTML version): https://arxiv.org/html/1706.03762v7
2. Jay Alammar, "The Illustrated Transformer": https://jalammar.github.io/illustrated-transformer/
3. Dive into Deep Learning §11.1 "Queries, Keys, and Values": https://d2l.ai/chapter_attention-mechanisms-and-transformers/queries-keys-values.html
4. UvA Deep Learning Tutorial 6 — Transformers & Multi-Head Attention: https://uvadlc-notebooks.readthedocs.io/en/latest/tutorial_notebooks/tutorial6/Transformers_and_MHAttention.html
5. Stanford CS224N 2026 Lecture 5 (Transformers) slides: https://web.stanford.edu/class/cs224n/slides_w26/cs224n-2026-lecture05-transformers.pdf
6. Machine Learning Mastery — The Transformer Attention Mechanism: https://machinelearningmastery.com/the-transformer-attention-mechanism/
7. Olsson et al. (2022), "In-context Learning and Induction Heads": https://arxiv.org/pdf/2209.11895
