# c-convex — Convexity: One Bowl, No Traps

## Dig Deeper appendix (curated — graduate-authoritative)

### Read

- [Convex Optimization §3 — Convex Functions](https://web.stanford.edu/~boyd/cvxbook/bv_cvxbook.pdf) (Boyd & Vandenberghe, Cambridge University Press, free PDF) — The canonical graduate reference on convexity. Chapter 3 covers the formal definition (the Jensen inequality form), the second-derivative test, preservation operations (sum, max, composition — the composition rule that certifies logistic loss is convex), and the first-order condition (tangent-plane lower bound). The actual text underlying the lesson's deeper cards.

- [12.2 Convexity — Dive into Deep Learning](https://d2l.ai/chapter_optimization/convexity.html) (d2l.ai, Zhang et al., 2023) — Graduate-level online textbook chapter that covers convex sets and functions with executable code examples, Jensen's inequality, local-minima-are-global, and ML applications (weight decay, gradient clipping). Explicitly notes that a convex function need not attain its minimum (the e^x counterexample) — fixing the lesson's unqualified GD convergence claim. Peer-reviewed and widely used.

- [Stanford EE364A — Convexity Lecture Notes](https://web.stanford.edu/class/ee364a/lectures/functions.pdf) (Boyd, Stanford EE364a) — Lecture slides covering every operation that preserves convexity: nonneg weighted sum, pointwise max, composition (the critical rule for building real losses), and affine substitution. The composition rule (h convex and nondecreasing + g convex → h∘g convex) is absent from the lesson and is the machine that certifies logistic loss and softmax cross-entropy.

### Watch

- [Stanford EE364A Convex Optimization I — Lecture 3](https://www.youtube.com/watch?v=1menqhfNzzo) (Stephen Boyd / Stanford, ~1 hr) — Boyd's lecture on convex functions: chord test, second-derivative test, Jensen's inequality, and preservation rules, all in one graduate lecture. The primary authoritative video source for this lesson's content. Part of the [full 2023 EE364A playlist](https://www.youtube.com/playlist?list=PLoROMvodv4rMJqxxviPa4AmDClvcbHi6h).

- [Gradient descent, how neural networks learn | Deep Learning Chapter 2](https://www.youtube.com/watch?v=IHZwWFHWa-w) (3Blue1Brown, ~21 min) — Covers why gradient descent can get stuck in non-convex losses and why convexity of classical models matters; pairs naturally with the lesson's "convex vs non-convex" trap lab.

## Science & depth recommendations (to reach master's level)

- **Unqualified GD convergence claim needs two caveats.** "Gradient descent is guaranteed to find the global optimum" requires (1) the function attains a minimum (e^x is convex but has none), and (2) the step size satisfies lr ≤ 1/L. → Add both caveats explicitly, citing d2l.ai §12.2 which states them plainly.

- **Missing: the composition rule for building ML losses.** The lesson lists sum and max as convexity-preserving operations but omits composition — the rule that certifies logistic cross-entropy and softmax. → Add a `deeper` card (the lesson already has a good one on this, but the formal statement h convex + nondecreasing + g convex → h∘g convex is not in `learn`). Grounded in Boyd & Vandenberghe §3.2.4.

- **Missing: the formal Jensen's inequality form.** The lesson only gives the chord test and f″≥0. The definition f(λx+(1−λ)y) ≤ λf(x)+(1−λ)f(y) is the finite form of Jensen's inequality E[f(X)] ≥ f(E[X]), which recurs weekly in ML: KL ≥ 0, the VAE's ELBO, EM. → The lesson's deeper card alludes to this but the formal statement should appear in `learn`. Grounded in d2l.ai §12.2 and Boyd & Vandenberghe §3.1.

- **High-dimensional landscape description is outdated.** The learn text says "many valleys" for non-convex losses. Dauphin et al. 2014 established that high-dimensional critical points are overwhelmingly saddles, not bad local minima. The existing deeper card is correct; the `learn` text contradicts it. → Align `learn` with the deeper card: "the landscape is dominated by saddle points, not many distinct bad valleys." Grounded in Dauphin et al. 2014.

## Sources

- [Convex Optimization (full textbook PDF)](https://web.stanford.edu/~boyd/cvxbook/bv_cvxbook.pdf) — Boyd & Vandenberghe, Cambridge University Press, canonical text (free PDF)
- [Stanford EE364A Convexity Lecture Notes §3](https://web.stanford.edu/class/ee364a/lectures/functions.pdf) — Stanford EE364a, canonical text
- [12.2 Convexity — Dive into Deep Learning](https://d2l.ai/chapter_optimization/convexity.html) — d2l.ai, peer-reviewed graduate textbook
- [Identifying and Attacking the Saddle Point Problem](https://arxiv.org/abs/1406.2572) — arXiv:1406.2572, Dauphin et al. NeurIPS 2014, peer-reviewed
- [Stanford EE364A Convex Optimization I Lecture 3](https://www.youtube.com/watch?v=1menqhfNzzo) — Stanford/Boyd YouTube 2023, canonical graduate course
- [Stanford EE364A full playlist](https://www.youtube.com/playlist?list=PLoROMvodv4rMJqxxviPa4AmDClvcbHi6h) — Stanford/Boyd YouTube 2023
- [Gradient descent, how neural networks learn](https://www.youtube.com/watch?v=IHZwWFHWa-w) — 3Blue1Brown YouTube, high-quality explainer
