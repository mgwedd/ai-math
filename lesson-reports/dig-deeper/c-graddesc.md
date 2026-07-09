# c-graddesc — Gradient Descent

## Dig Deeper appendix (curated — graduate-authoritative)

### Read

- [Why Momentum Really Works](https://distill.pub/2017/momentum/) (Distill, Gabriel Goh, 2017) — The definitive interactive article on conditioning and convergence. Proves that momentum gives a quadratic speedup in condition-number dependence (rate (√κ−1)/(√κ+1) vs GD's (κ−1)/(κ+1)), frames momentum as a damped harmonic oscillator, and makes the zigzag/ravine geometry fully transparent. Essential companion to any gradient-descent lesson.

- [An Overview of Gradient Descent Optimization Algorithms](https://arxiv.org/abs/1609.04747) (Ruder, arXiv:1609.04747, 2016) — Canonical survey of SGD variants: momentum, Nesterov, Adagrad, RMSprop, Adam, AdaMax, Nadam. Explains why plain GD fails on ill-conditioned problems and how each variant compensates. The go-to reference for "what are all these optimizers and why do they exist?"

- [Identifying and Attacking the Saddle Point Problem in High-Dimensional Non-Convex Optimization](https://arxiv.org/abs/1406.2572) (Dauphin et al., NeurIPS 2014) — Peer-reviewed result showing that in high-dimensional losses, critical points with high error are exponentially likely to be saddle points, not local minima. Directly corrects the "trapped in a bad valley" framing the lesson's 1-D toy encourages. Introduces saddle-free Newton as a remedy.

- [Convex Optimization §9 — Unconstrained Minimization](https://web.stanford.edu/class/ee364a/lectures/unconstrained.pdf) (Boyd & Vandenberghe, Stanford EE364a) — Establishes the stability threshold lr < 2/L (where L is the gradient Lipschitz constant), O(1/k) convergence on smooth convex, and O(ρ^k) under strong convexity. Mathematical grounding for why the lab's divergence is curvature-controlled, not arbitrary.

### Watch

- [Gradient descent, how neural networks learn | Deep Learning Chapter 2](https://www.youtube.com/watch?v=IHZwWFHWa-w) (3Blue1Brown, ~21 min) — Grant Sanderson's canonical visual walkthrough: cost function as a surface, gradient descent as hill-rolling, cost functions, and why direction matters. Best-in-class intuition for connecting the 1-D update rule to training a real network.

- [Stanford EE364A Convex Optimization I — 2023 lecture series](https://www.youtube.com/playlist?list=PLoROMvodv4rMJqxxviPa4AmDClvcbHi6h) (Stephen Boyd / Stanford, ~1 hr per lecture) — Full graduate course freely on YouTube. Lecture 1 frames optimization as the central tool of ML; later lectures (especially on unconstrained minimization) establish convergence guarantees and step-size theory that give the quantitative backing for the lesson's lr regimes.

## Science & depth recommendations (to reach master's level)

- **Missing: stability threshold is curvature-controlled, not arbitrary.** The lesson says "lr too large → diverges" without naming the bound. For an L-smooth function, GD guarantees descent for lr < 2/L; divergence begins above this. → Add one line after the three lr regimes tying divergence to curvature. Grounded in Boyd & Vandenberghe §9 (linked above).

- **Missing: saddle-point reality in high dimensions.** The quiz's "GD finds local minima, not global ones" is correct for the 1-D toy but instills the wrong mental model for deep learning. In millions of dimensions, sub-optimal local minima are exponentially rare; the dominant critical points are saddles, which SGD escapes via minibatch noise. → Add a `deeper` card correcting the high-D picture. Grounded in Dauphin et al. 2014.

- **Missing: condition number and convergence rate.** A master's student should know GD on smooth strongly-convex problems converges at O(ρ^k) with ρ = (κ−1)/(κ+1), and that ill-conditioning is the reason plain GD zigzags. This bridges directly to momentum and Adam. → Add a `deeper` card with the condition-number formula and the √κ speedup momentum provides. Grounded in the Distill momentum article.

- **The "decoration" framing of SGD/momentum/Adam undersells what matters.** SGD changes what gradient you compute (noisy minibatch → escapes saddles, enables scale); momentum and Adam fix conditioning. → Reframe as "same descent idea, but noise and preconditioning are what make it work at scale." Grounded in Ruder 2016 and the Distill article.

## Sources

- [Why Momentum Really Works](https://distill.pub/2017/momentum/) — Distill, high-quality peer-reviewed explainer
- [An Overview of Gradient Descent Optimization Algorithms](https://arxiv.org/abs/1609.04747) — arXiv:1609.04747, Ruder 2016, widely cited survey
- [Identifying and Attacking the Saddle Point Problem](https://arxiv.org/abs/1406.2572) — arXiv:1406.2572, Dauphin et al. NeurIPS 2014, peer-reviewed
- [Boyd & Vandenberghe EE364a — Unconstrained Minimization](https://web.stanford.edu/class/ee364a/lectures/unconstrained.pdf) — Stanford EE364a lecture notes, canonical text
- [Gradient descent, how neural networks learn](https://www.youtube.com/watch?v=IHZwWFHWa-w) — 3Blue1Brown YouTube, high-quality explainer
- [Stanford EE364A Convex Optimization I playlist (2023)](https://www.youtube.com/playlist?list=PLoROMvodv4rMJqxxviPa4AmDClvcbHi6h) — Stanford/Boyd YouTube, canonical graduate course
