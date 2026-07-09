# ml-gpt — GPTs: Next-Token Prediction

## Dig Deeper appendix (curated — graduate-authoritative)
### Read
- [The Illustrated GPT-2 (Jay Alammar)](https://jalammar.github.io/illustrated-gpt2/) — the definitive visual walkthrough of decoder-only generation: how the model produces logits, masked self-attention, and the predict → sample → append loop; distinguishes the forward pass from the sampling step the lesson claims is "identical to GPT-4's."
- [The Curious Case of Neural Text Degeneration (Holtzman et al., 2019)](https://arxiv.org/abs/1904.09751) — the paper that introduced nucleus (top-p) sampling; the authoritative source for the top-k / top-p truncation the lesson mentions but doesn't derive, and for why pure greedy/high-T decoding degenerates.
- [Language Models are Unsupervised Multitask Learners (Radford et al., 2019 — GPT-2)](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf) — the GPT-2 paper: the real autoregressive LM whose sampling loop the lab miniaturizes, with byte-pair encoding and the scaling behavior the lesson alludes to.

### Watch
- [But what is a GPT? Visual intro to transformers | Chapter 5, Deep Learning](https://www.youtube.com/watch?v=wjZofJX0v4M) (3Blue1Brown, ~27 min) — the clearest visual account of the predict-sample-repeat loop, softmax over the vocabulary, and temperature reshaping the distribution.
- [The spelled-out intro to language modeling: building makemore](https://www.youtube.com/watch?v=PaCmpygFfXo) (Andrej Karpathy, ~1h 57m) — builds exactly the bigram baseline the lab uses (count table → softmax → sample) and then shows why it derails, motivating context and attention; the direct source for the lab's pedagogy.

## Science & depth recommendations (to reach master's level)
- "Identical to GPT-4's mechanism" overstates the bigram equivalence → state precisely that the *sampling loop* is identical but the process producing the distribution differs (count lookup vs billions of trained parameters), grounded in the Illustrated GPT-2.
- The lab applies temperature to `log(count)`, not neural logits → clarify that GPT logits are raw pre-softmax scores, so `p = softmax(logits/T)`; the log-count trick is a toy-only approximation and learners shouldn't infer GPT logits are log-probabilities, grounded in the Illustrated GPT-2.
- T = 1 is never named as the neutral reference → add that T = 1 samples the model's learned distribution unchanged, T < 1 sharpens, T > 1 flattens, grounded in the standard temperature-softmax definition.
- Top-p / top-k are mentioned but not defined → define nucleus sampling (smallest set with cumulative probability ≥ p) and top-k, and that they act only at sampling time, grounded in Holtzman et al. (2019).
- Cross-entropy, teacher forcing, and BPE tokenization are under-covered → connect cross-entropy loss (−ln p, gradient = predicted − target), teacher forcing (ground-truth previous token during training), and that real tokenizers use subword BPE not space-splitting, grounded in the GPT-2 paper and Karpathy's makemore.

## Sources
- https://jalammar.github.io/illustrated-gpt2/ — high-quality canonical explainer (Jay Alammar)
- https://arxiv.org/abs/1904.09751 — peer-reviewed paper (Holtzman et al., ICLR 2020, nucleus sampling)
- https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf — seminal paper (Radford et al., OpenAI GPT-2)
- https://www.youtube.com/watch?v=wjZofJX0v4M — 3Blue1Brown, high-quality explainer
- https://www.youtube.com/watch?v=PaCmpygFfXo — Andrej Karpathy, authoritative from-scratch lecture
