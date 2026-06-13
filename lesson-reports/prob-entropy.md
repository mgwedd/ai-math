# prob-entropy — Entropy & KL Divergence

## Current summary (what it teaches + what the lab does)

The lesson covers two quantities: Shannon entropy H(P) as average surprise/bits, and KL divergence KL(P‖Q) as the extra bits paid for using the wrong distribution Q. It connects both to the cross-entropy loss used in training via the decomposition H(P,Q) = H(P) + KL(P‖Q). The `learn` tutorial gives the formulas in log₂, names the asymmetry of KL, and the `ml` note ties cross-entropy minimization directly to KL reduction. Two `deeper` cards cover the 20-questions entropy intuition and the mode-seeking / mode-covering asymmetry story.

The interactive (`probent`) shows a 4-outcome discrete distribution P (shaped by 4 sliders) and a second belief distribution Q (set by one of four preset chip buttons: Uniform / Sure-A / Sure-D / Copy-P). It displays grouped bars for P and Q, then reads out H(P), KL(P‖Q), and KL(Q‖P) in bits. Three missions: (1) push H(P) ≥ 1.99 bits, (2) push H(P) ≤ 0.3 bits, (3) push KL(P‖Q) ≥ 2 bits.

## Strengths

- The cross-entropy decomposition is stated correctly: CE(P,Q) = H(P) + KL(P‖Q), and the quiz correctly identifies that only the KL term is optimizable by the model.
- The lab makes the asymmetry viscerally observable (the readout shows both KL directions; a warning fires when they differ by > 0.3 bits).
- The 20-questions framing in the `deeper` card is a classic and effective pedagogical anchor.
- The RLHF mention in the `deeper` card naming "direction chosen deliberately" is forward-looking and appropriate for an ML-bound learner.
- The `ml` note accurately states that "minimizing cross-entropy IS minimizing KL to the true distribution."
- Quiz Q3 correctly cites Gibbs' inequality as the reason KL ≥ 0, and WRONG_WHY correctly handles the "KL = 0 only at uniform" misconception.

## Inaccuracies / fidelity issues

### 1. Log base inconsistency: lesson uses log₂ (bits); real ML uses ln (nats)
**Issue:** The `learn` formulas write log₂ explicitly, the lab computes entropy/KL in bits (Math.log2), and the quiz reinforces bits. But every ML framework (PyTorch `nn.CrossEntropyLoss`, TensorFlow `tf.keras.losses.CategoricalCrossentropy`) uses the natural logarithm — the loss is measured in nats, not bits. Training logs, perplexity calculations, and research papers universally use nats. A student who carries the log₂ convention into ML code will be confused by the numerical mismatch (loss ≈ 0.69 for a 2-class uniform, not 1.0).

**Correct statement:** The choice of log base is a convention that rescales by a constant factor (1 nat = log₂(e) ≈ 1.443 bits). Information-theory pedagogy traditionally uses log₂ for "bits"; ML practice universally uses ln for "nats." The lesson should name this explicitly, e.g. "In ML frameworks the natural log is standard — values come out in nats. 1 nat ≈ 1.44 bits; the math is identical."

**Sources:**
- PyTorch CrossEntropyLoss documentation uses ln: https://sebastianraschka.com/faq/docs/pytorch-crossentropy.html
- Eli Bendersky (2025): "the mathematical relationships hold for any base" — https://eli.thegreenplace.net/2025/cross-entropy-and-kl-divergence/
- D2L.ai information theory chapter: uses log₂ pedagogically but notes ln in implementations — https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/information-theory.html

### 2. KL asymmetry deeper card: direction labeling for RLHF is imprecise
**Issue:** The `deeper` card says "In RLHF, the KL penalty keeps the tuned model from drifting too far from the base model — direction chosen deliberately." This is accurate in spirit but too vague. The RLHF penalty is specifically KL(π_θ ‖ π_ref) — the reverse KL with respect to the tuned policy — which is mode-seeking. This is the direction where the penalty explodes if the tuned model samples tokens the base model would never generate. Without naming the direction, the card leaves students with only a vague "direction matters" takeaway.

**Correct statement:** In RLHF/PPO the standard penalty is KL(π_tuned ‖ π_base) — called the forward KL from the base's perspective but reverse from the tuner's. It fires large penalties when the tuned policy places probability mass on tokens the reference model essentially never outputs. This is reverse-KL / mode-seeking, causing the policy to stay near a mode of the base distribution rather than cover all of it.

**Sources:**
- "A crucial component of RLHF is the use of a reference model to compute a Reverse KL divergence penalty" — https://apxml.com/courses/rlhf-reinforcement-learning-human-feedback/chapter-4-rl-ppo-fine-tuning/kl-divergence-penalty-role
- RLHF overview (2025 arXiv): https://arxiv.org/pdf/2504.12501

### 3. Cross-entropy loss direction: the lesson uses KL(data ‖ model); practice also uses KL(model ‖ data) in some settings
**Issue:** The quiz and `ml` note state "minimizing cross-entropy IS minimizing KL(data ‖ model)" — KL(P‖Q) where P is the data distribution and Q is the model. This is correct for standard supervised cross-entropy loss (MLE). However the `deeper` card on asymmetry mentions mode-covering vs mode-seeking without clarifying *which* direction the standard loss uses. For a master's-bound learner this is critical: forward KL (KL(P‖Q)) is mode-covering (what MLE/CE does), while reverse KL (KL(Q‖P)) is mode-seeking (what VAEs and variational inference do). The lesson is not wrong, but it's incomplete in a way that causes downstream confusion when students meet VAEs.

**Correct statement:** Standard cross-entropy / MLE minimizes KL(P_data ‖ Q_model) — forward KL — which is mode-covering: the model must put probability mass everywhere the data does. VAEs and variational inference instead minimize KL(Q_approx ‖ P_posterior) — reverse KL — which is mode-seeking: the approximate posterior concentrates on one mode rather than covering all. Both are legitimate; the direction is a deliberate design choice.

**Sources:**
- rancheng.github.io forward-reverse KL: https://rancheng.github.io/forward-reverse-kl-divergence/
- TensorTonic KL divergence: https://www.tensortonic.com/ml-math/information-theory/kl-divergence
- andrewcharlesjones.github.io on KL(q||p): https://andrewcharlesjones.github.io/journal/klqp.html

### 4. Entropy formula reads "−Σ pᵢ log₂ pᵢ" — the 0·log(0) convention is silently handled but not taught
**Issue:** The code correctly guards `(x>0 ? x*Math.log2(x) : 0)` — i.e. the convention 0·log(0) = 0. But the `learn` text never mentions this. For a learner who tries to compute H by hand with a zero probability and takes out a calculator, 0·log(0) = 0·(−∞) is undefined arithmetically. The convention must be stated.

**Correct statement:** The formula adopts the convention 0 log 0 := 0, justified by the limit lim_{p→0⁺} p log p = 0 (L'Hôpital). This convention makes H continuous at the boundary and is universally adopted. A zero-probability outcome contributes nothing to entropy — it can't surprise you if it never happens.

**Sources:**
- Wikipedia on Cross-entropy, section on entropy: https://en.wikipedia.org/wiki/Cross-entropy
- D2L.ai: https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/information-theory.html

## Conceptual gaps (what a serious learner still needs)

1. **Nats vs. bits distinction and ML-framework reality.** As above — not just a footnote but a prerequisite for reading any paper that reports "bits per dimension" vs. a framework that reports "nats per token." The lesson should teach the conversion explicitly.

2. **Forward KL = mode-covering, Reverse KL = mode-seeking — with a visual.** The `deeper` card names the asymmetry but stops short of the key behavioural consequence: fitting with forward KL spreads mass to cover all modes (blurry but complete); fitting with reverse KL collapses to one mode (sharp but incomplete). This determines VAE posterior blurriness, flow model diversity, and RLHF behavior — all central to the learner's world. A 2-Gaussian bimodal example would make this click.

3. **KL divergence is not a distance / metric.** The lesson notes KL is asymmetric but doesn't name the precise property it violates: the triangle inequality also fails. The symmetric approximation (Jensen-Shannon divergence = ½KL(P‖Q) + ½KL(Q‖P)) exists and is bounded, finite everywhere, and is the quantity GANs were once related to. A sentence naming JSD as a "fixed" symmetric version adds depth without bloat.

4. **The 0·log(0) = 0 convention** — see inaccuracy #4 above.

5. **Mutual information as KL divergence.** I(X;Y) = KL(P(X,Y) ‖ P(X)P(Y)) — the divergence between the joint and the product-of-marginals. This is a stunning unification (KL measures dependence) and directly relevant when the learner hits attention mechanisms or feature selection.

6. **Perplexity** = 2^H (bits) or e^H (nats) — the exponential of entropy, used everywhere in LLM evaluation. A model with perplexity 100 is as uncertain as a uniform distribution over 100 outcomes. The lesson teaches cross-entropy loss but never mentions the metric form of it that ML papers actually report.

7. **KL divergence can be infinite.** If Q assigns zero probability to an event that P says is real (q_i = 0, p_i > 0), then KL(P‖Q) = +∞. This matters practically: Laplace smoothing and label-smoothing exist precisely to prevent this catastrophe in ML models.

## Lab ideas

### Lab A: Forward vs. Reverse KL — mode-covering vs. mode-seeking (upgrade to current lab)
**Name:** "Forward vs. Reverse KL on a bimodal target"
**What the learner manipulates:** P is fixed as a bimodal distribution (two peaks at A and D). The learner controls a unimodal Q by dragging a "center of mass" slider. Two panels show KL(P‖Q) and KL(Q‖P) simultaneously as the slider moves.
**What it reveals:** When minimizing KL(P‖Q) (forward), the optimal Q spreads to cover both peaks — it sits between them. When minimizing KL(Q‖P) (reverse), the optimal Q collapses onto one peak. This directly explains why standard training (forward KL) produces mode-covering models while variational inference (reverse KL) produces mode-seeking posteriors.
**Mission:** "Find the Q that minimizes KL(P‖Q) — notice it lands between the peaks. Now find the Q that minimizes KL(Q‖P) — notice it picks a side."

### Lab B: Coding-length intuition (optional second lab)
**Name:** "Design your own Huffman code"
**What the learner manipulates:** A 4-symbol distribution P (sliders). The lab shows optimal code lengths (-log₂ p for each symbol, rounded to integers) as bar heights, and computes the expected message length. A second distribution Q (fixed preset) shows the suboptimal code length when you encode P's symbols using Q's lengths.
**What it reveals:** Entropy H(P) is the optimal (minimum) average code length. Cross-entropy H(P,Q) is what you pay when you use Q's code. The gap is KL(P‖Q). This makes the abstract formula physically concrete.

### Lab C: Perplexity meter (small addition to current lab)
Add a line to the existing readout: "Perplexity = 2^H(P) = X.X outcomes-equivalent." Learners can directly see that H = 2 bits ↔ perplexity = 4, H = 0 bits ↔ perplexity = 1 (certainty). This costs one line of code and immediately translates bits to the metric they'll see in every LLM paper.

## Content improvements

### `learn` text
1. After the entropy formula, add: "Note the convention 0 log 0 := 0 — a zero-probability outcome contributes zero surprise, since it never occurs. Calculators will balk; take the limit: lim_{p→0} p·log p = 0."
2. After "Not symmetric: KL(P‖Q) ≠ KL(Q‖P)", add: "Standard ML training (MLE / cross-entropy) minimizes the forward KL — KL(data ‖ model) — which forces the model to cover all outcomes the data produces. Variational inference flips to reverse KL — KL(model ‖ data) — which makes approximate posteriors sharp but mode-seeking."
3. Add a sentence on log base: "Formulas here use log₂ (bits). ML frameworks (PyTorch, TensorFlow) use ln (nats). 1 nat ≈ 1.44 bits — only the unit changes, not the math."
4. Add one sentence on infinity: "If Q says 'impossible' (q_i = 0) where P says 'real' (p_i > 0), KL = ∞. Label smoothing and Laplace smoothing exist to prevent exactly this."

### `ml` note
Replace the current sentence "When a loss curve goes down, you are literally watching KL(data ‖ model) shrink, bit by bit." with: "When a loss curve goes down, you are watching KL(data ‖ model) shrink — in nats per token for language models, or in bits per dimension for image models. The eval metric you'll see in papers is **perplexity** = e^(cross-entropy in nats), which translates loss into an 'effective vocabulary size the model is uncertain over.'"

### `deeper` cards
**Card 1 ("20-questions"):** Add at the end: "In nats: H = ln(k) for uniform-over-k. PyTorch reports H in nats — divide by ln(2) ≈ 0.693 to convert to bits."

**Card 2 ("Why KL is asymmetric"):** Extend: "Concretely: forward KL (KL(P‖Q), what MLE does) is mode-covering — Q must spread mass wherever P does. Reverse KL (KL(Q‖P), what VAEs do in their ELBO) is mode-seeking — Q concentrates on one mode and ignores the rest. In RLHF the penalty is KL(π_tuned ‖ π_ref), the reverse direction — it detonates if the tuned policy generates tokens the base model essentially never would, keeping fine-tuning anchored."

## Quiz improvements

### New Q1: nats vs. bits (target the log-base confusion)
> "PyTorch's `nn.CrossEntropyLoss` on a 2-class problem with a perfectly uncertain model outputs approximately…"
> Options: ["0.693", "1.0", "2.0", "0.0"]  Answer: 0 (0.693 nats ≈ ln(2))
> Why: Frameworks use ln (nats). For uniform-over-2: H = ln(2) ≈ 0.693, not 1.0 bit. Confusing nats and bits is the #1 unit error ML engineers make reading loss curves.
> WRONG_WHY: 1.0 is 1 bit (log₂ 2) — right math, wrong base; 2.0 is neither; 0.0 means certainty.

### New Q2: forward vs. reverse KL behavior
> "A VAE encoder minimizes KL(q(z|x) ‖ p(z)) — the reverse KL. Compared with a model trained by minimizing KL(p(z) ‖ q(z|x)) (forward), the VAE posterior tends to be…"
> Options: ["More mode-seeking — it concentrates on one region rather than covering all", "More mode-covering — it spreads to match all of p(z)", "Identical — KL direction doesn't affect the optimum", "Wider and more diffuse"]  Answer: 0
> Why: Reverse KL penalizes q placing mass where p is low, collapsing q to a single mode.

### Existing Q3 (KL = 0 when P = Q)
Strengthen the WRONG_WHY for option 3 ("Never — KL is always positive"): Add "The proof that KL ≥ 0 is Gibbs' inequality, proved via Jensen's inequality on the concave log function (or via ln(x) ≤ x−1). The bound is tight: KL = 0 iff Q = P everywhere."

### Existing Q4 (cross-entropy decomposition)
Add a follow-up that tests perplexity: "If cross-entropy loss (in nats) drops from 4.0 to 2.0, model perplexity drops from…" [e⁴ ≈ 54.6 to e² ≈ 7.4 | 4 to 2 | 8 to 4 | unchanged]  Answer: 0. Keeps question self-contained; no lab data required.

### Self-containedness check
All existing quiz questions are self-contained (no lab-graph recall required). The new questions proposed above are also self-contained — they embed the numerical scenario in the question stem.

## Sources (real URLs consulted)

- Eli Bendersky — Cross-entropy and KL divergence (2025): https://eli.thegreenplace.net/2025/cross-entropy-and-kl-divergence/
- Colah's blog — Visual Information Theory: https://colah.github.io/posts/2015-09-Visual-Information/
- D2L.ai — Information Theory chapter: https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/information-theory.html
- Lei Mao — Cross-Entropy, KL Divergence, MLE: https://leimao.github.io/blog/Cross-Entropy-KL-Divergence-MLE/
- Andrew Charles Jones — KL(q||p) is mode-seeking: https://andrewcharlesjones.github.io/journal/klqp.html
- rancheng.github.io — Forward and Reverse KL divergence: https://rancheng.github.io/forward-reverse-kl-divergence/
- TensorTonic — KL divergence: https://www.tensortonic.com/ml-math/information-theory/kl-divergence
- Wikipedia — Cross-entropy: https://en.wikipedia.org/wiki/Cross-entropy
- Wikipedia — Gibbs' inequality: https://en.wikipedia.org/wiki/Gibbs%27_inequality
- RLHF KL penalty in PPO: https://apxml.com/courses/rlhf-reinforcement-learning-human-feedback/chapter-4-rl-ppo-fine-tuning/kl-divergence-penalty-role
- Sebastian Raschka — PyTorch CrossEntropyLoss: https://sebastianraschka.com/faq/docs/pytorch-crossentropy.html
- statproofbook — Non-negativity of KL divergence: https://statproofbook.github.io/P/kl-nonneg.html
