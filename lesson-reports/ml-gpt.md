# ml-gpt — GPTs: Next-Token Prediction

## Current summary (what it teaches + what the lab does)

**Tutorial (`learn`)**: Describes GPT as producing a probability distribution over the next token via softmax, then running the loop predict → sample → append → repeat. Introduces temperature as a pre-softmax rescaling: T→0 is greedy (deterministic), high T is near-uniform (chaos). Claims the lab model is "a real (tiny) language model: bigram counts from a 14-word corpus" and that "the mechanism — distribution, temperature, sampling loop — is identical to GPT-4's."

**Why it matters for AI (`ml`)**: Ties hallucination to distribution-plausibility-without-truth-check; temperature/top-p as the API knobs; training as cross-entropy + backprop nudging.

**Deeper cards**: (1) phone-keyboard autocomplete analogy — no plan, no lookahead, planning emerges from good next-token guesses. (2) Bigrams see only 1 token back; attention widens to thousands; context window explained.

**Lab (`mlgpt` interactive)**: 
- Corpus: `"the cat sat on the mat . the dog sat on the rug . the cat saw the dog ."` (20 tokens, 14 unique words).
- Builds a bigram count table, converts to log-probabilities, divides by T, subtracts max for stability, exponentiates, normalizes → softmax distribution.
- Displays a live bar chart of the next-token distribution, updates on temperature slider.
- User clicks "Sample next token" to extend the sequence; sequence is capped at 14 tokens (oldest shift off).
- **Missions**: (1) greedy: T ≤ 0.2, sample ≥ 6 tokens; (2) chaotic: T ≥ 2, sample ≥ 6; (3) generate until `.` appears.

---

## Strengths

1. **Correct core mechanics** — the bigram → softmax → sample loop is an accurate minimal implementation of autoregressive LM generation; the temperature formula (divide logits by T, then softmax) matches the canonical form used by GPT-2/3/4.
2. **Live distribution bar chart** — showing probability bars update in real time as temperature changes is an excellent direct visualization; learners see the distribution flatten/sharpen before sampling.
3. **Hallucination explanation** — "plausible-by-distribution but wrong" is concise and accurate; no truth-check in the loop is the correct framing.
4. **Bigram-as-contrast** — using a bigram to make context-window limitations tactile is pedagogically sound; Karpathy's "makemore" series takes the same approach for the same reason (cs.stanford.edu makemore, Karpathy zero-to-hero).
5. **`ml` box** is dense with value: correctly names cross-entropy, backprop, temperature/top-p as API levers.
6. **Quiz question 4** (bigram derails mid-sentence because it sees only 1 token) is sharp and directly testable.

---

## Inaccuracies / fidelity issues

### 1. "Identical to GPT-4's mechanism" overstates the bigram's equivalence
**Issue**: The lesson claims "the mechanism — distribution, temperature, sampling loop — is identical to GPT-4's; only the model inside differs." This is partially true but misleading for a master's-bound learner. A bigram operates on a raw count table with no learned parameters, no embeddings, no subword tokenization (it splits on spaces), and—critically—it applies the temperature formula to `log(count)` rather than neural logits. The "model inside" difference is enormous: GPT-4's output logits are the result of billions of parameters composing multi-head attention and MLP layers, not a lookup table. Calling them the same "mechanism" elides the distinction between the distributional machinery (sample from softmax(logits/T) — identical) and the process that produces the logits (completely different).

**Correct statement**: The *sampling loop* (predict distribution → apply temperature → sample → append → repeat) is identical. The process producing that distribution is what everything in the course is about. The distinction should be explicit: the lesson should say "the sampling loop and temperature formula are identical; what differs is how the distribution is computed — a lookup table here vs. a learned neural network in GPT-4."

**Source**: Jay Alammar, "The Illustrated GPT-2", https://jalammar.github.io/illustrated-gpt2/ — distinguishes the forward pass (attention + MLP producing output logits) from the sampling step. Karpathy makemore series explicitly labels the bigram a "baseline" before scaling to neural models (https://karpathy.ai/zero-to-hero.html).

---

### 2. Temperature formula applied to log(counts), not logits — undisclosed approximation
**Issue**: In the lab code, `logits = toks.map(t => Math.log(counts[t]))` — so the "logits" fed to the temperature-softmax are natural logs of bigram counts. This is an unconventional choice. Standard bigram LMs work in probability space (divide counts by total) and optionally apply temperature to the resulting probabilities, not to their logs. Applying temperature to log-counts is neither standard nor identical to the GPT formula (which applies temperature to the raw unnormalized neural logits before any log). The result is mathematically fine as a demonstration (it still produces a valid temperature-scaled distribution) but the conceptual mapping is off: learners may wrongly conclude that GPT's logits are log-probabilities.

**Correct statement**: GPT's logits are raw pre-softmax scores from a linear projection, not log-probabilities. The correct pipeline is: `softmax(logits / T)`. For the bigram lab, a cleaner formulation would be: compute probabilities `p[t] = counts[t] / sum(counts)`, then define logits as these probabilities (or their logs) and apply temperature to them explicitly with a note that this is an approximation used only in this toy setting.

**Source**: Machine Learning Mastery, "The Statistics of Token Selection: Logits, Temperature, and Top-P", https://machinelearningmastery.com/the-statistics-of-token-selection-logits-temperature-and-top-p-walkthrough/ — makes clear logits are raw pre-softmax scores, not log-probabilities.

---

### 3. "14-word corpus" description is inaccurate
**Issue**: The corpus is `'the cat sat on the mat . the dog sat on the rug . the cat saw the dog .'` — which is 20 tokens (space-split). The lesson calls it "14-word corpus." The number 14 appears to be the `seq.shift()` cap (the display window), not the corpus size.

**Correct statement**: The corpus is 20 tokens (19 bigram transitions), containing 8 unique word types (the, cat, sat, on, mat, dog, rug, saw, `.`). The sequence display is capped at 14 tokens for readability. These are two different numbers and conflating them creates confusion.

---

### 4. Missing: T=1 as the "neutral" reference point
**Issue**: The tutorial explains T→0 (greedy) and high T (flat) but never mentions T=1, which is special: at T=1, the softmax is unchanged from the model's raw distribution — the model samples exactly what it learned. This is a meaningful landmark that helps learners reason about the parameter.

**Correct statement**: T=1 means "sample exactly the model's learned distribution, unchanged." T<1 sharpens it (less surprise), T>1 flattens it (more surprise). The slider starts at T=1 in the lab code but this significance is unexplained.

**Source**: Nigel Gebodh, "Why Does My LLM Have A Temperature?", https://ngebodh.github.io/projects/Short_dive_posts/LLM_temp/LLM_temp.html — explicitly defines T=1 as the "unaltered output of the Softmax function."

---

### 5. Missing: top-p / nucleus sampling (mentioned in `ml` box but never explained)
**Issue**: The `ml` box says "temperature/top-p are the knobs you'll set in every API call" but top-p is never defined or contrasted with temperature anywhere in the lesson. A master's-bound learner heading to production APIs needs to understand that top-p (nucleus sampling) is a different mechanism: it filters to the smallest set of tokens whose cumulative probability ≥ p, then renormalizes and samples. It is commonly recommended over temperature alone for production use.

**Correct statement**: Top-p and temperature are orthogonal controls. Temperature reshapes the whole distribution; top-p truncates the long tail. Both can be set simultaneously (e.g., GPT-4 API allows both). This distinction is not hair-splitting — it changes which tokens can appear at all.

**Source**: Wikipedia, "Top-p sampling", https://en.wikipedia.org/wiki/Top-p_sampling; also: Holtzman et al. 2019, "The Curious Case of Neural Text Degeneration" — original top-p paper.

---

### 6. "No lookahead — any apparent planning EMERGES" — slightly too strong / underdated
**Issue**: The deeper card says "No plan, no lookahead — any apparent planning EMERGES from very good next-token guesses." This was conventional wisdom pre-2023. Research in 2023-2025 (including the "Pitfalls of Next-Token Prediction" paper, Bachmann & Nagarajan 2024) and evidence from chain-of-thought work suggests that modern LLMs do plan in a non-trivial sense: they form partial predictions in intermediate residual stream layers (the logit lens shows this), and the "planning" that emerges is real enough to need careful framing. Saying "no plan" may cause learners to dismiss reasoning capabilities that are relevant for understanding RLHF and CoT prompting.

**Correct statement**: "No explicit lookahead algorithm — the model doesn't search a tree of futures. But research shows intermediate layers do develop partial next-token predictions that are refined across depth (the 'logit lens'). Any coherent multi-step behavior emerges from the composition of these per-token predictions."

**Source**: nostalgebraist, "interpreting GPT: the logit lens", https://www.lesswrong.com/posts/AcKRB8wDpdaN6v6ru/interpreting-gpt-the-logit-lens; Bachmann & Nagarajan 2024, "The Pitfalls of Next-Token Prediction", https://arxiv.org/pdf/2403.06963.

---

## Conceptual gaps (what a serious learner still needs)

1. **Perplexity** — the standard quantitative evaluation metric for LMs. Perplexity = exp(cross-entropy loss) and measures how many equally-probable tokens the model is "choosing between" on average. GPT-4-level perplexity on WikiText-103 is ~16; the bigram on this 20-token corpus would have perplexity of the order of 3-5 (few next-token choices exist). Connecting the lab bigram's visible distribution to this formula makes training loss tangible. Source: The Gradient, "Evaluation Metrics for Language Models", https://thegradient.pub/understanding-evaluation-metrics-for-language-models/.

2. **Teacher forcing** — during training, the model sees the ground-truth previous token at every step, not its own (potentially wrong) prediction. At inference it feeds its own outputs back. This mismatch (exposure bias) is why fine-tuned models sometimes degrade in long-form generation and why RLHF / DPO matter. The `ml` box mentions training but doesn't name this distinction.

3. **Tokenization is not word-splitting** — the lab splits on spaces. Real GPTs use byte-pair encoding (BPE), producing subword tokens. "cat" might be one token; "unbelievable" might be three. This affects everything the learner will do with real APIs. Karpathy dedicates a full lecture to it.

4. **Top-k sampling** — widely used; should be defined alongside top-p. Top-k keeps only the k highest-probability tokens; top-p keeps a variable number summing to p. Both are available in every production API.

5. **Repetition loops at T→0** — the greedy mission shows loops but doesn't explain *why*: with bigrams, if `.` → `the` → `cat` → `saw` → `the` → `cat` loops because these are the highest-probability transitions. Real GPTs use repetition penalties or top-p to avoid this. The lab could name this pattern.

6. **The logit lens / layer-by-layer refinement** — intermediate transformer layers make increasingly good next-token guesses (nostalgebraist 2020). Visualizing this is the most striking interpretability result accessible at this level and makes the "the model refines a guess" framing vivid.

7. **Autoregressive vs. masked (BERT-style) objectives** — GPTs are causal/autoregressive; BERTs are masked language models. A one-sentence contrast prevents the common misconception that "all LLMs do next-token prediction."

---

## Lab ideas

### A. "Temperature Microscope" — existing lab upgrade
**What learner manipulates**: Current lab, but add: (1) a second readout showing entropy H = −Σ p·log₂(p) of the current distribution alongside the bar chart; (2) a "T=1 reference" line on each bar showing the unscaled probability, so learners see directly how temperature moves each bar away from the T=1 baseline.
**What it reveals**: Makes temperature's effect on uncertainty/entropy quantitative, not just visual. Learner sees that T=2 roughly doubles entropy; T=0.5 halves it.

### B. "Perplexity Tracker" — add to existing lab
**What learner manipulates**: After generating a sequence, show the sequence's perplexity under the bigram model: PPL = exp(−(1/N) Σ log p(token_i | token_{i-1})). Let the learner compare perplexity of a "lucky" coherent sentence vs. a chaotic T=2 sequence.
**What it reveals**: Makes the training objective (minimize cross-entropy = minimize perplexity) tangible; connects lab to the loss function mentioned in the `ml` box.

### C. "Trigram vs. Bigram" context-window demo
**What learner manipulates**: Side-by-side: same corpus, same sequence start, bigram on the left (1 token context), trigram on the right (2 token context). Slider for temperature, same seed.
**What it reveals**: More context = more coherent continuations. Learner directly sees why attention (effectively n→∞-gram) matters. Extends the existing context-length deeper card into a hands-on experience.

### D. "Repetition Loop Escape" — decoding strategies
**What learner manipulates**: Set T=0 (greedy), watch the model loop (e.g., "the cat saw the cat saw…"). Then toggle top-k=3 and/or add a repetition penalty slider. Watch loops break.
**What it reveals**: The failure mode of pure greedy decoding; why production systems never use T=0 alone; the role of top-p/top-k in practice. Directly connected to the `ml` box mention of "top-p."

---

## Content improvements

### `learn` section
- **Fix the corpus description**: Change "14-word corpus" to "20-token corpus (8 unique words)."
- **Add T=1 reference**: After "T→0 always takes the top token (greedy — deterministic, repetitive); high T flattens toward uniform (creative → gibberish)", add: "T=1 is the neutral setting: the model samples exactly its learned distribution, unmodified."
- **Clarify "identical to GPT-4's"**: Change to: "The sampling loop — apply temperature, sample from the distribution, append, repeat — is identical to GPT-4's. What differs is everything that produces the distribution: here it's a count table; in GPT-4 it's billions of trained parameters."
- **Add a formula box**: Show `p(token) = softmax(logits / T)` explicitly, naming each term. The `learn` section mentions softmax but never writes the temperature formula.

### `ml` (why it matters) section
- **Define top-p in one sentence**: "Top-p (nucleus sampling) restricts sampling to the smallest set of tokens whose cumulative probability ≥ p — a truncation that prevents the long tail of improbable tokens from ever being sampled, regardless of temperature."
- **Add teacher forcing note**: "Training uses teacher forcing: at each step, the model sees the ground-truth previous token, not its own prediction — so training and inference differ, and this gap is why fine-tuning and RLHF exist."

### `deeper` cards
- **Card 2 revision** ("Go deeper: context windows"): Add the logit lens observation — "Modern interpretability research (the 'logit lens') shows intermediate transformer layers form increasingly good next-token guesses, refined toward the final layer. The model isn't a black box — it refines a prediction across depth."
- **Add card 3**: "🔬 Go deeper: decoding strategies" — contrast greedy / temperature / top-k / top-p / beam search in 3-4 sentences, pointing learner to OpenAI's API docs. This is the practical knowledge they need for every API call they'll ever make.

---

## Quiz improvements

### Keep all 4 existing questions (they are accurate and test real misconceptions)

### Add / replace with stronger misconception-targeting questions:

**New Q5** (replacing or adding):
> Temperature = 1 does what to the model's probability distribution?
> - (a) Leaves it exactly as the model learned it — unmodified  [CORRECT]
> - (b) Makes it uniform (equal probability for all tokens)
> - (c) Selects only the single top token
> - (d) Doubles entropy relative to T=0.5
> Why: T=1 is the neutral/baseline case. Most learners never think about it; they only know "low=deterministic, high=random" without the reference point.
> Wrong-why b: Uniform distribution requires T→∞, not T=1. c: That's T→0 (greedy). d: Entropy at T=0 is zero (deterministic), so T=0.5 has more entropy than T=0 — the comparison is undefined.

**New Q6**:
> Top-p (nucleus) sampling and temperature are…
> - (a) Orthogonal controls — one reshapes the distribution, the other truncates the tail  [CORRECT]
> - (b) Two names for the same mechanism
> - (c) Only available in open-source models, not GPT APIs
> - (d) Used at training time, not inference time
> Why: The `ml` box mentions top-p without explaining it; this forces learners to distinguish the two mechanisms they'll use in every API call.

**Revise Q3 slightly** (hallucination):
Current phrasing is good. Consider adding a fourth distractor: "Low temperature (more deterministic) eliminates hallucinations" — this is a common real-world misconception (the wrong-why already mentions this, but making it a quiz option tests it harder).

**Self-containment check**: All existing questions and the new proposed questions require no recall of lab graph data — they test conceptual understanding. No changes needed on this dimension.

---

## Sources (real URLs consulted)

1. Jay Alammar, "The Illustrated GPT-2" — https://jalammar.github.io/illustrated-gpt2/
2. Andrej Karpathy, "Neural Networks: Zero to Hero" (makemore + GPT series) — https://karpathy.ai/zero-to-hero.html
3. Jurafsky & Martin, "N-Gram Language Models" (SLP3, Ch. 3) — https://web.stanford.edu/~jurafsky/slp3/3.pdf
4. Machine Learning Mastery, "The Statistics of Token Selection: Logits, Temperature, and Top-P" — https://machinelearningmastery.com/the-statistics-of-token-selection-logits-temperature-and-top-p-walkthrough/
5. Nigel Gebodh, "Why Does My LLM Have A Temperature?" — https://ngebodh.github.io/projects/Short_dive_posts/LLM_temp/LLM_temp.html
6. nostalgebraist, "interpreting GPT: the logit lens" — https://www.lesswrong.com/posts/AcKRB8wDpdaN6v6ru/interpreting-gpt-the-logit-lens
7. Bachmann & Nagarajan, "The Pitfalls of Next-Token Prediction" (2024) — https://arxiv.org/pdf/2403.06963
8. Wikipedia, "Top-p sampling" — https://en.wikipedia.org/wiki/Top-p_sampling
9. The Gradient, "Evaluation Metrics for Language Models" (perplexity) — https://thegradient.pub/understanding-evaluation-metrics-for-language-models/
10. Paulo Salem, "'It's just predicting the next token'" (on emergence) — https://medium.com/@paulosalem/its-just-predicting-the-next-token-c05b8cbe4eea
