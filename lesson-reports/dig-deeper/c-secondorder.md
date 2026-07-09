# c-secondorder — Curvature & Newton's Method

## Dig Deeper appendix (curated — graduate-authoritative)

### Read

- [Numerical Optimization §3 — Line Search Methods (Newton's Method)](https://www.ime.unicamp.br/~pulino/MT404/TextosOnline/NocedalJ.pdf) (Nocedal & Wright, Springer, 2nd ed., free PDF) — The graduate reference on Newton's method in optimization. Covers the Newton step as minimizing a quadratic model, conditions for descent (f″ > 0 required), the damped/modified regime far from the minimum, the modified Cholesky fix for indefinite Hessians, and quadratic convergence *locally* near a strongly-convex minimum. The rigorous source for every claim in the lesson's `learn` block.

- [MIT 6.7220/15.084 Lecture 17 — Hessians, Preconditioning, and Newton's Method](https://www.mit.edu/~gfarina/2025/67220s25_L17_newton/L17.pdf) (Gabriele Farina, MIT, Spring 2025) — Current MIT graduate nonlinear-optimization lecture PDF. Covers first- to second-order Taylor approximations, Newton's method as preconditioning by the Hessian, local and global convergence guarantees (with conditions), and the failure mode of lack of curvature. Authoritative and up-to-date.

- [Identifying and Attacking the Saddle Point Problem](https://arxiv.org/abs/1406.2572) (Dauphin et al., NeurIPS 2014) — The peer-reviewed result that in non-convex losses, unmodified Newton is *attracted* to saddle points (the inverse Hessian flips the gradient component along negative-curvature directions). Introduces saddle-free Newton (using |H| rather than H). The key gap in the lesson's treatment: it mentions saddles in a deeper card but never states that raw Newton actively seeks them in non-convex settings.

- [Why Momentum Really Works](https://distill.pub/2017/momentum/) (Distill, Gabriel Goh, 2017) — Derives why ill-conditioning (high κ = λ_max/λ_min) causes GD to zigzag, proves that GD converges at rate ((κ−1)/(κ+1))^k on quadratics, and shows Newton is immune to conditioning (it effectively sets κ=1 on each step). Bridges the lesson's condition-number deeper card to the practical motivation for approximate second-order methods.

### Watch

- [Stanford EE364A Convex Optimization I — Lecture 14](https://www.youtube.com/watch?v=dAvxvA4_Euo) (Stephen Boyd / Stanford, ~1 hr) — Boyd's lecture on unconstrained minimization including Newton's method, the Newton decrement, convergence phases (damped and quadratically convergent), and cost per iteration. Graduate authoritative. Part of the [full 2023 EE364A playlist](https://www.youtube.com/playlist?list=PLoROMvodv4rMJqxxviPa4AmDClvcbHi6h).

- [Backpropagation calculus | Deep Learning Chapter 4](https://www.youtube.com/watch?v=tIeHLnjs5U8) (3Blue1Brown, ~10 min) — Connects the second-order view to deep learning: the chain rule product of derivatives along a computation graph is the mechanism that makes first-order methods (which rely on the gradient, not the Hessian) practical at scale. The counterpoint to "why not Newton": this is how gradients are actually obtained.

## Science & depth recommendations (to reach master's level)

- **Critical omission: Newton's update only finds a minimum when f″ > 0.** The lesson presents `x ← x − f′/f″` as jumping to the bottom of the local parabola, but when f″ < 0 the fitted parabola opens downward and the "bottom" is actually a maximum. → Add one sentence in `learn` after the formula: "This finds the bottom only when f″(x) > 0; with negative curvature the step goes toward a maximum instead — which is why Newton requires damping or Hessian regularization in non-convex settings." Grounded in Nocedal & Wright §3 and Wikipedia's Newton optimization article.

- **Missing: raw Newton is attracted to saddle points in non-convex problems.** For deep nets, where saddles dominate, vanilla Newton steps toward the saddle along any negative-curvature direction. → Add a `deeper` card on saddle-free Newton (|H| fix). Grounded in Dauphin et al. 2014.

- **Adam's connection to curvature is overstated.** The ml block says Adam "estimates its own curvature." Adam's second moment v_t is an EMA of squared gradients, which approximates the diagonal empirical Fisher, not the Hessian. → Correct to: "Adam rescales each parameter by recent gradient magnitudes (approximating the diagonal Fisher), giving an effect loosely analogous to curvature-awareness — distinct from true Hessian curvature." Grounded in the original Adam paper (arXiv:1412.6980) and the FAdam analysis.

- **Quadratic convergence needs the "local" qualifier.** The lesson states Newton "converges quadratically" without saying this holds only near a strongly convex minimum with Lipschitz Hessian. Far from the minimum, convergence is only linear (with line search) or may fail. → Add the qualifier to the `learn` block. Grounded in Nocedal & Wright §3 and MIT 6.7220 Lecture 17.

- **The condition number is the quantitative punchline connecting both worlds.** GD on a quadratic converges at rate ((κ−1)/(κ+1))^k; Newton is immune to conditioning near the minimum. → A `deeper` card stating this explicitly would give learners the precise reason Newton is faster on ill-conditioned problems. Grounded in the Distill momentum article and MIT 6.7220 L17.

## Sources

- [Numerical Optimization — Nocedal & Wright, 2nd ed.](https://www.ime.unicamp.br/~pulino/MT404/TextosOnline/NocedalJ.pdf) — Springer, canonical graduate textbook (free PDF)
- [MIT 6.7220 Lecture 17 — Newton's method (Spring 2025)](https://www.mit.edu/~gfarina/2025/67220s25_L17_newton/L17.pdf) — MIT graduate lecture, authoritative
- [Identifying and Attacking the Saddle Point Problem](https://arxiv.org/abs/1406.2572) — arXiv:1406.2572, Dauphin et al. NeurIPS 2014, peer-reviewed
- [Why Momentum Really Works](https://distill.pub/2017/momentum/) — Distill, high-quality peer-reviewed explainer
- [Stanford EE364A Convex Optimization I Lecture 14](https://www.youtube.com/watch?v=dAvxvA4_Euo) — Stanford/Boyd YouTube 2023, canonical graduate course
- [Stanford EE364A full playlist](https://www.youtube.com/playlist?list=PLoROMvodv4rMJqxxviPa4AmDClvcbHi6h) — Stanford/Boyd YouTube 2023
- [Backpropagation calculus | 3Blue1Brown](https://www.youtube.com/watch?v=tIeHLnjs5U8) — 3Blue1Brown YouTube, high-quality explainer
