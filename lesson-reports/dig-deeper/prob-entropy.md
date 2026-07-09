# prob-entropy — Entropy & KL Divergence

## Dig Deeper appendix (curated — graduate-authoritative)

### Read

- [MacKay, *Information Theory, Inference, and Learning Algorithms* — Chapters 2–4 (free)](https://www.inference.org.uk/itprnn/book.pdf) — The graduate-authoritative textbook on information theory for ML researchers. Chapter 2 defines Shannon entropy; Chapter 8 covers the relationship between MLE, minimum description length, and entropy; Chapters 26–28 cover KL divergence in the context of inference and variational methods. Released free by the author (Cambridge University Press, 2003). The single most comprehensive graduate treatment of entropy and KL divergence with direct ML relevance.

- [Goodfellow, Bengio & Courville, *Deep Learning* Ch. 3.13–3.14](https://www.deeplearningbook.org/contents/prob.html) — Section 3.13 defines Shannon entropy and cross-entropy; 3.14 defines KL divergence, states non-negativity (with proof sketch), and derives the cross-entropy loss decomposition CE = H + KL. This is the canonical ML reference for exactly the decomposition the lesson teaches, by the authors who popularized it in deep learning. Freely hosted.

- [Chris Olah, "Visual Information Theory" (2015)](https://colah.github.io/posts/2015-09-Visual-Information/) — ~5,000-word essay with extensive diagrams building entropy, cross-entropy, KL divergence, and mutual information entirely from coding/compression intuition. The best visual treatment available: it shows how entropy is the minimum average code length, cross-entropy is the average code length under the wrong distribution, and KL is the gap between them. Highly reliable; Olah is a co-founder of Anthropic and a distinguished researcher in interpretability.

- [Eli Bendersky, "Cross-entropy and KL divergence" (2025)](https://eli.thegreenplace.net/2025/cross-entropy-and-kl-divergence/) — Precise derivation: H(P,Q) = H(P) + KL(P‖Q); proof that minimizing CE is equivalent to minimizing KL; the 0·log(0)=0 convention proven via L'Hôpital; the nats-vs-bits distinction stated explicitly. Confirms the lesson's decomposition with code examples and formal proofs. Complements the visual Olah post with algebraic rigor.

### Watch

- [Dive into Deep Learning Ch. 22.11: Information Theory](https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/information-theory.html) — Comprehensive written+video chapter covering self-information, entropy, mutual information, KL divergence, and cross-entropy with runnable code in PyTorch/TensorFlow/JAX. The D2L.ai book is openly licensed and widely used as a graduate ML reference; this chapter is the most implementation-grounded treatment available alongside the theory.

- [3Blue1Brown playlist on Bayes / Information](https://www.youtube.com/playlist?list=PLk4N6AFvLWe3xCHuOs0siWp0q2F43Cslh) (3Blue1Brown, multiple videos) — Grant Sanderson has videos building from conditional probability to entropy through geometric intuition. Particularly relevant for the "20-questions" entropy framing the lesson's deeper card uses, rendered visually. Best for building intuition before the MacKay formalism.

## Science & depth recommendations (to reach master's level)

- **Log base inconsistency with ML frameworks** → The lesson uses log₂ (bits) throughout, but PyTorch `nn.CrossEntropyLoss`, TensorFlow, and all ML frameworks use the natural log (nats). A learner reading a training log where the loss is 0.69 (≈ ln 2 nats, not 1.0 bits) will be confused. Add one sentence: "ML frameworks use the natural log — values come out in nats. 1 nat ≈ 1.44 bits; the formulas are identical up to a constant factor." Grounded in Bendersky (2025) and the D2L.ai chapter.

- **The 0·log(0) = 0 convention is silently used but untaught** → The lab correctly guards `(x>0 ? x*Math.log2(x) : 0)` but the learn text never mentions this convention. A student computing entropy by hand gets 0·(−∞), which is arithmetically undefined. One sentence — "we adopt 0 log 0 := 0 by the limit lim_{p→0⁺} p log p = 0" — removes the gap. Grounded in Bendersky (2025) and D2L.ai Ch. 22.11.

- **RLHF KL direction should be named precisely** → The deeper card says "direction chosen deliberately" about RLHF but does not say which direction. The RLHF penalty is KL(π_tuned ‖ π_base) — reverse KL, mode-seeking — which fires large penalties when the tuned policy samples tokens the base model essentially never generates. Naming the direction (and why it is mode-seeking) makes the asymmetry concrete rather than abstract. Grounded in the RLHF PPO literature and referenced in the existing audit.

- **Forward vs. reverse KL behavioral difference is the key insight for VAEs** → The lesson correctly notes asymmetry but does not distinguish forward KL (mode-covering; what standard CE/MLE minimizes) from reverse KL (mode-seeking; what VAEs minimize). A master's learner who immediately encounters VAEs will be confused about why VAE training "collapses" to one mode — that is exactly the reverse-KL behavior. A one-paragraph explanation of this distinction (with a pointer to MacKay Ch. 33 on variational methods) would close a major gap. Grounded in MacKay ITILA and Goodfellow Ch. 19.

- **Cross-entropy perplexity connection for language models** → GPT and other LMs report perplexity = exp(cross-entropy), so a model with CE loss 2.3 nats has perplexity ≈ 10 (it is "as uncertain as a uniform over 10 choices"). This is the most practically important consequence of the lesson's cross-entropy section for LLM practitioners. Adding "perplexity = exp(CE in nats), measuring effective vocabulary size of uncertainty" would complete the ML connection. Grounded in CS229 notes and Goodfellow Ch. 10.

## Sources

- https://www.inference.org.uk/itprnn/book.pdf — MacKay ITILA (canonical graduate text; Cambridge University Press 2003; free by author permission; Chs. 2, 8, 26–28 cover entropy/KL/inference)
- https://www.deeplearningbook.org/contents/prob.html — canonical text (Goodfellow et al.; Chs. 3.13–3.14 on entropy, cross-entropy, KL; freely hosted)
- https://colah.github.io/posts/2015-09-Visual-Information/ — high-quality explainer (Chris Olah 2015; visual information theory; ~5,000 words with diagrams; confirmed live)
- https://eli.thegreenplace.net/2025/cross-entropy-and-kl-divergence/ — high-quality explainer (Bendersky 2025; algebraically rigorous; confirmed live)
- https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/information-theory.html — D2L.ai (openly licensed graduate ML textbook; Ch. 22.11; implementation-grounded with runnable code; confirmed live)
- https://www.youtube.com/playlist?list=PLk4N6AFvLWe3xCHuOs0siWp0q2F43Cslh — 3Blue1Brown Bayes/Information playlist (high-quality explainer; entropy and geometric probability; confirmed live)
