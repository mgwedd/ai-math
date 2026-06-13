# pre-logs — Logarithms: The Inverse Question

## Current summary (what it teaches + what the lab does)
The lesson frames a logarithm as "an exponent asked backwards": `log_b(x) = y ⟺ b^y = x`. It covers the inverse/undo relationship (`log_b(b^x) = x`), two anchor facts (`log(1)=0`, logs of fractions are negative), the product/power rules (`log(a·b)=log a + log b`, `log(aⁿ)=n·log a`), and the log-scale intuition (each +1 is a ×base jump; loss curves and learning-rate sweeps live on log axes). The `ml` note ties this to cross-entropy (−Σ log p), log-likelihood (product → safe sum), entropy/bits (log₂), and perplexity (exponentiated entropy). Three `deeper` cards: a "how many times do I divide/halve" mnemonic, change of base (`log_b x = ln x / ln b`), and bits/entropy/surprise (`−log₂ p`).

Two labs:
- **loginv** (`INTERACTIVES.loginv`): drag along `y = b^x` (base toggle 2/10). A dropline shows height vs exponent; readout says `b^x = val` and `log_b(val) = x`. Missions: land height 8 on base 2 (log₂8=3), find a height below 1 (negative log), find height 1 (log=0). Reading the curve right-to-left = taking a log.
- **logmul** (`INTERACTIVES.logmul`): pick a,b from {0.5,2,4,8}; two log₂ segments laid end-to-end (`log a` then `+log b`) land on a single `log(a·b)` segment on a number line. Missions: a=4,b=8 → log₂32=5; make logs sum to 0 (reciprocals, a·b=1); reach a·b=16 two ways.

## Strengths
- The "inverse question" framing is exactly the right mental model and is reinforced visually by reading the `b^x` curve backwards — this is pedagogically strong and matches how 3Blue1Brown/Khan teach it.
- The product-rule lab (segments adding on a number line) is the genuinely illuminating visualization: it makes "× becomes +" *spatial*, which is the historical slide-rule insight (Napier).
- Good ML grounding: cross-entropy, log-likelihood underflow, bits/entropy, perplexity, log-scale sweeps are all the right hooks for a master's-bound learner.
- The `log(a+b)` trap is explicitly called out in WRONG_WHY (quiz 3 distractor) — this is the single most common student error, so flagging it is valuable.
- Missions are well-chosen and self-contained (specific target heights / products), and the negative-log and log-of-1 anchors are drilled directly.

## Inaccuracies / fidelity issues (each: the issue -> the correct statement -> source URL)
- **No statement of the domain restriction.** The lesson never says the argument must be positive (and base > 0, ≠ 1). For a serious learner this is the #1 conceptual gap that causes real bugs (e.g. `log(0)` → −∞, `log(negative)` → NaN; cross-entropy needs ε-clamping or log-of-softmax precisely because of this). -> `log_b(x)` is defined only for `x > 0`, with base `b > 0, b ≠ 1`; as `x → 0⁺`, `log x → −∞`. -> https://en.wikipedia.org/wiki/Logarithm
- **Cross-entropy is written as "−Σ log p" without the probability weighting.** The `ml` note's "−Σ log p" is really the *negative log-likelihood* of observed data (sum over samples). True cross-entropy is `H(p,q) = −Σ_x p(x) log q(x)` — an *expectation* under the true distribution. For one-hot labels these coincide, which is why the shorthand is tolerable, but a master's learner should see the weighted form. -> Cross-entropy: `H(p,q) = −Σ_x p(x) log q(x)`; the per-example classifier loss `−log q(y_true)` is the one-hot special case. -> https://www.topbots.com/perplexity-and-entropy-in-nlp/
- **"perplexity is just an exponentiated entropy" — slightly imprecise.** Perplexity in LM eval is the exponentiated *cross-entropy* (model vs data), `PPL = b^{H(p,q)}`, not the entropy of a single distribution. -> `PPL = exp(cross-entropy)` (base e for nats, 2 for bits); it's the model's effective branching factor. -> https://en.wikipedia.org/wiki/Perplexity
- **"a loss that falls from 10 to 0.0001 is a straight slide on a log axis" — only if the decay is geometric.** A log axis turns *exponential/geometric* decay into a straight line, not any decay between those endpoints. Real loss curves are only roughly linear in log-y over limited regimes. Minor, but the phrasing implies it's automatic. -> A quantity is straight on a log axis iff it changes by a constant *ratio* per step (geometric); only then is `log y` linear. -> https://en.wikipedia.org/wiki/Logarithmic_scale
- **The log-likelihood "underflow → safe sum" claim is correct but incomplete.** Summing logs fixes the *product* underflow, but computing the logs themselves (e.g. `log softmax`) still overflows/underflows unless you use the log-sum-exp trick. The lesson presents the log as a complete fix. -> Numerical stability also requires `log-sum-exp`: `log Σ e^{x_i} = a + log Σ e^{x_i − a}` with `a = max_i x_i`; this is why frameworks expose `log_softmax`/`logsumexp` rather than `log(softmax(...))`. -> https://gregorygundersen.com/blog/2020/02/09/log-sum-exp/

## Conceptual gaps (what a serious learner still needs)
- **Domain & the shape of log near 0.** That `log x → −∞` as `x → 0⁺` is the entire reason a confident-but-wrong prediction (`q(y_true) → 0`) produces an exploding loss — the gradient signal that drives learning. This deserves a sentence and ideally a visual.
- **log as the inverse *function*, not just the inverse *operation*.** `y = log_b x` is the reflection of `y = b^x` across `y = x`. The loginv lab reads the exponential curve backwards but never shows the actual log curve. Seeing both curves and the `y=x` mirror cements "inverse function."
- **Why `e` and `ln` specifically.** The change-of-base card says all logs differ by a constant, but never says *why ML defaults to `ln`*: `d/dx ln x = 1/x` (clean derivative), and softmax/sigmoid/cross-entropy gradients telescope to beautiful forms only with natural log. This is the bridge to the calculus worlds.
- **Quotient rule.** Product and power are given; `log(a/b) = log a − log b` is only mentioned as a quiz distractor. It's needed for log-ratios (KL divergence `Σ p log(p/q)`, logits = `log(p/(1−p))`).
- **Logits.** The word "logit" literally means "log-odds." A logs lesson aimed at ML should at least name-drop `logit(p) = log(p/(1−p))` as the inverse of the sigmoid — it's the single most common place an ML engineer meets a log.
- **Bits/nats unit conversion in practice.** The deeper card mentions log₂ for bits and ln elsewhere; learners should know cross-entropy reported in nats vs bits differs by `ln 2 ≈ 0.693`, and perplexity is base-invariant.

## Lab ideas (concrete: name the interactive, what the learner manipulates, what it reveals)
- **`logcurve` — the mirror (upgrade to loginv):** show `y = b^x` AND `y = log_b x` simultaneously with the dashed `y = x` mirror line. Dragging a point on the exponential reflects a linked point onto the log curve. Mission: "drag until the log point crosses the x-axis — that's `x=1, log=0`"; "push toward the y-axis and watch the log dive to −∞." Reveals inverse-function symmetry and the `→ −∞` blow-up the current lab can't show.
- **`logloss` — why a confident wrong answer hurts:** a single slider for the model's predicted probability `q` on the *true* class (0→1); plot `−log q` live. Drag `q` toward 0 and watch the loss rocket to ∞; toward 1 and it flattens to 0. Mission: "make the loss exceed 5 — how confident-and-wrong did you have to be?" Directly connects logs to the gradient that trains classifiers, and motivates the domain restriction.
- **`logscale` — linear vs log axis toggle:** plot a geometric sequence (e.g. learning rates 1e-5…1e-1, or a decaying loss) and let the learner flip the y-axis between linear and log. On linear, four of five points pile up near 0 and are unreadable; on log they're evenly spaced. Mission: "on which axis can you actually distinguish 1e-4 from 1e-5?" Reveals *why* sweeps and loss plots use log scales (currently asserted in prose, never shown).
- **`logsumexp` (stretch, ties to next lesson):** show a product of small probabilities underflowing to 0 in float, then the same computed as a sum of logs. Step three: show that `log(softmax)` of large logits still overflows, and the LSE shift (subtract the max) fixes it. High-value for the master's audience.

## Content improvements (specific learn/ml/deeper text upgrades)
- Add one sentence in `learn` on **domain**: "Logs only accept positive inputs (base `b>0, b≠1`); as `x` shrinks toward 0 the log dives toward −∞ — the fact behind a confidently-wrong classifier's exploding loss."
- Add the **quotient rule** beside the product rule: `log(a/b) = log a − log b`, and note `log(1/a) = −log a` (which already underlies the negative-log fact).
- In `ml`, correct cross-entropy to the weighted form and distinguish it from NLL: "Cross-entropy `H(p,q) = −Σ p(x) log q(x)`; for one-hot labels this collapses to `−log q(y_true)` per example." Fix perplexity to "exponentiated **cross-entropy**, the effective branching factor."
- Add a `deeper` card on **logits / log-odds**: `logit(p) = log(p/(1−p))` is the inverse of the sigmoid; a network's raw outputs are *literally* called logits because they live in log-odds space. This is the highest-leverage ML connection currently missing.
- Strengthen the change-of-base card with the **"why ln in ML"** payoff: `d/dx ln x = 1/x`, the cleanest derivative, which is why log-likelihood and cross-entropy gradients simplify.
- Optionally note the **log-sum-exp** caveat in the likelihood discussion so learners don't think `log(softmax(...))` is automatically safe.
- Historical hook (optional, motivating): Napier invented logs in 1614 precisely to turn multiplication into addition — the slide-rule idea the `logmul` lab visualizes.

## Quiz improvements (specific misconceptions to target; keep questions self-contained — never require recalling lab-graph data)
Existing five are solid and self-contained. Suggested additions/targets:
- **Domain / log near 0:** "As x decreases toward 0 (staying positive), `log x`…" → options: "heads to −∞", "heads to 0", "heads to +∞", "stays undefined the whole way". Targets the misconception that small ≠ negative-large.
- **Quotient rule:** "`log(a/b)` equals…" → `log a − log b` correct; distractors `log a / log b`, `log a + log b`, `log(a−b)`. Pairs naturally with the existing product-rule item.
- **Cross-entropy intuition (self-contained):** "A classifier puts probability 0.01 on the correct label. Its `−log` loss for that example is…" → "large/positive (about 4.6 in nats)", "near 0", "negative", "exactly 0.01". Tests `−log p` of a small probability and the sign without needing any graph.
- **Change-of-base invariance:** "Switching a log's base (say log₂ to ln) changes the value by…" → "a constant multiplicative factor", "an additive constant", "nothing at all", "an unpredictable amount". Targets the belief that bases are incompatible.
- Consider tightening the WRONG_WHY for quiz 4 distractor 2 ("0 is log of 1") — already good; could add that `log` of any input ≥1 is ≥0 and <1 is <0, reinforcing the sign rule.

## Sources (the real URLs you consulted)
- Logarithm definition, domain, identities, change of base, Napier/slide-rule history — https://en.wikipedia.org/wiki/Logarithm
- Logarithmic scale (straight line ⟺ geometric change) — https://en.wikipedia.org/wiki/Logarithmic_scale
- Perplexity = exponentiated cross-entropy, base-invariance, branching factor — https://en.wikipedia.org/wiki/Perplexity
- Cross-entropy vs entropy, bits/nats, perplexity in NLP — https://www.topbots.com/perplexity-and-entropy-in-nlp/
- Log-sum-exp trick / numerical stability of log-softmax & cross-entropy — https://gregorygundersen.com/blog/2020/02/09/log-sum-exp/
- Log-sum-exp in ML (underflow/overflow, max-shift) — https://raw.org/math/the-log-sum-exp-trick-in-machine-learning/
- Common student logarithm errors incl. `log(a+b)≠log a+log b`, domain traps — https://www.researchgate.net/publication/328236959_What_are_the_common_errors_made_by_students_in_solving_logarithm_problems
