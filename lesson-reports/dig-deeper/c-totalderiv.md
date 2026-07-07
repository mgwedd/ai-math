# c-totalderiv — The Gradient = Best Linear Approximation

## Dig Deeper appendix (curated — graduate-authoritative)

### Read

- [MIT 18.02SC Session 35 — Gradient: Definition, Perpendicular to Level Curves](https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/pages/2.-partial-derivatives/part-b-chain-rule-gradient-and-directional-derivatives/session-35-gradient-definition-perpendicular-to-level-curves/) (MIT OCW 18.02, Denis Auroux) — Lecture notes and clip proving that ∇f is perpendicular to level curves at every point (via the chain-rule argument on a parameterized level curve), plus the directional-derivative formula D_u f = ∇f·u = ‖∇f‖ cos θ that explains *why* ∇f is the steepest-ascent direction. The precise mathematical foundation for the lesson's two main geometric claims.

- [MIT 18.02SC Session 36 — Proof: Gradient ⊥ Level Curves](https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/resources/mit18_02sc_notes_19/) (MIT OCW 18.02, Denis Auroux) — The written proof PDF companion to Session 35. Establishes the result rigorously: parameterize any level curve r(t) with f(r(t)) = c, differentiate, apply chain rule to get ∇f · r′(t) = 0. Short, clean, authoritative.

- [Convex Optimization §3.1 — First-Order Conditions](https://web.stanford.edu/~boyd/cvxbook/bv_cvxbook.pdf) (Boyd & Vandenberghe, Cambridge University Press, free PDF) — Chapter 3 establishes the tangent-plane lower bound: for a convex differentiable f, f(y) ≥ f(x) + ∇f(x)ᵀ(y−x) for all x,y. This is the formal statement that gradient descent always trusts a valid lower bound on the true loss — the theoretical guarantee behind every descent step in ML. Also introduces the notion that ∇f = 0 is an optimality certificate on convex functions.

- [Dive into Deep Learning §12.1 — Optimization and Deep Learning](https://d2l.ai/chapter_optimization/optimization-intro.html) (d2l.ai, Zhang et al., 2023) — Graduate-level online text chapter connecting the tangent-plane / gradient view to the actual training loop: loss surface, gradient as local linear model, why re-linearizing at each step is both the power and the limitation. Peer-reviewed and widely used.

### Watch

- [MIT 18.02 Lecture 12 — Gradient](https://ocw.mit.edu/courses/18-02-multivariable-calculus-fall-2007/resources/lecture-12-gradient/) (MIT OCW 18.02 Fall 2007, Denis Auroux, ~50 min) — Full lecture on gradient definition, directional derivatives, the D_u f = ∇f·u formula, ⊥ to level curves, and geometric interpretation. Denis Auroux's treatment is precise and visual; this is the primary authoritative video for the lesson's content.

- [Gradient descent, how neural networks learn | Deep Learning Chapter 2](https://www.youtube.com/watch?v=IHZwWFHWa-w) (3Blue1Brown, ~21 min) — Shows how the gradient-as-best-linear-approximation scales from 2-D surfaces to millions-of-parameter loss landscapes. Directly extends the lesson's tangent-plane idea to the actual training context: each optimizer step replaces the nonlinear surface with its local linear model, steps downhill, and re-linearizes.

## Science & depth recommendations (to reach master's level)

- **The "why" of steepest ascent is stated but not proved.** The lesson asserts ∇f points steepest uphill; the proof is one line — D_u f = ∇f·u = ‖∇f‖ cos θ, maximized when cos θ = 1 (u aligns with ∇f). → Add this dot-product argument in `learn` or in a `deeper` card. It also immediately explains why ‖∇f‖ equals the maximum rate of change. Grounded in MIT 18.02 Session 35/38.

- **The gradient-⊥-contours proof is visually demonstrable in the lab but never stated.** The lab's contour map visually shows the gold ∇f arrows crossing the contour ticks at right angles, yet the text never mentions this or proves it. The chain-rule proof (d/dt f(r(t)) = 0 → ∇f·r′ = 0) is a one-liner that gives students a mini-theorem of their own. → Add a `deeper` card with the proof. Grounded in MIT 18.02 Sessions 35–36.

- **The differentiability-vs-partials distinction is mentioned but the standard counterexample is missing.** The lesson correctly states that having both partials is not enough for a genuine tangent plane, but gives no example. The classic counterexample f(x,y) = xy/(x²+y²) (with f(0,0)=0) has both partials equal to 0 at the origin yet is not even continuous there. → Add this as a concrete example in the existing deeper card. Grounded in standard multivariable analysis texts (Rudin, Spivak).

- **The first-order optimality condition (tangent-plane lower bound) is absent.** For convex f, f(y) ≥ f(x) + ∇f·(y−x) everywhere — this is why gradient descent steps always follow valid local descent directions on convex losses, and why ∇f(x)=0 is an optimality certificate. → Add a `deeper` card. Grounded in Boyd & Vandenberghe §3.1.3.

## Sources

- [MIT 18.02SC Session 35 — Gradient: Definition, Perpendicular to Level Curves](https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/pages/2.-partial-derivatives/part-b-chain-rule-gradient-and-directional-derivatives/session-35-gradient-definition-perpendicular-to-level-curves/) — MIT 18.02, canonical text
- [MIT 18.02SC Session 36 Proof notes](https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/resources/mit18_02sc_notes_19/) — MIT 18.02, canonical text
- [Boyd & Vandenberghe Convex Optimization §3.1](https://web.stanford.edu/~boyd/cvxbook/bv_cvxbook.pdf) — Cambridge University Press, canonical text (free PDF)
- [Dive into Deep Learning §12.1](https://d2l.ai/chapter_optimization/optimization-intro.html) — d2l.ai, peer-reviewed graduate textbook
- [MIT 18.02 Lecture 12 — Gradient](https://ocw.mit.edu/courses/18-02-multivariable-calculus-fall-2007/resources/lecture-12-gradient/) — MIT OCW Fall 2007, canonical text
- [Gradient descent, how neural networks learn](https://www.youtube.com/watch?v=IHZwWFHWa-w) — 3Blue1Brown YouTube, high-quality explainer
