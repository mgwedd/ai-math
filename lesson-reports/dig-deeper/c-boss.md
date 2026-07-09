# c-boss — BOSS: Gradients in 2D

## Dig Deeper appendix (curated — graduate-authoritative)

### Read

- [MIT 18.02SC Session 35 — Gradient: Definition, Perpendicular to Level Curves](https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/pages/2.-partial-derivatives/part-b-chain-rule-gradient-and-directional-derivatives/session-35-gradient-definition-perpendicular-to-level-curves/) (MIT OCW 18.02, Denis Auroux) — The lecture notes and proof that ∇f is perpendicular to every level curve at every point (via the chain-rule argument on a parameterized level curve). Also covers the directional derivative D_u f = ∇f·u = ‖∇f‖ cos θ, which is the formula that explains *why* ∇f is the steepest-ascent direction — the key missing justification in the lesson.

- [Session 36 — Proof: Gradient ⊥ Level Curves](https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/resources/mit18_02sc_notes_19/) (MIT OCW 18.02, Denis Auroux) — The complete written proof with notes; companion to Session 35. Authoritative and concise.

- [An Overview of Gradient Descent Optimization Algorithms](https://arxiv.org/abs/1609.04747) (Ruder, arXiv:1609.04747, 2016) — Surveys SGD, momentum, Adam, and their geometric motivations. The "complete mental model of deep learning" claim in the ml box deserves the supplement that adaptive methods (Adam, RMSprop) exist precisely because gradient direction alone is insufficient for ill-conditioned surfaces — this is the survey that explains why.

- [Identifying and Attacking the Saddle Point Problem](https://arxiv.org/abs/1406.2572) (Dauphin et al., NeurIPS 2014) — The peer-reviewed result that in high-dimensional nets, ∇f ≈ 0 usually means saddle point, not minimum. Corrects the lesson's "complete mental model" claim that omits this crucial high-D reality.

### Watch

- [Gradient descent, how neural networks learn | Deep Learning Chapter 2](https://www.youtube.com/watch?v=IHZwWFHWa-w) (3Blue1Brown, ~21 min) — Shows how the 2-D gradient generalizes to network weight-space; visualizes the cost surface, gradient direction, and the descent step in a way that directly extends the lesson's bowl lab to real training. Best visual bridge from the 2-D boss to backprop.

- [MIT 18.02 Lecture 12 — Gradient](https://ocw.mit.edu/courses/18-02-multivariable-calculus-fall-2007/resources/lecture-12-gradient/) (MIT OCW 18.02 Fall 2007, Denis Auroux) — Full lecture covering gradient definition, ⊥ to level sets, and directional derivatives with geometric proofs. Provides the rigorous foundation the lesson asserts but does not justify.

## Science & depth recommendations (to reach master's level)

- **Missing: the justification for why ∇f is the steepest-ascent direction.** The lesson states this as a definition, but it is a theorem: D_u f = ∇f · u = ‖∇f‖ cos θ is maximized when θ = 0, i.e., u aligns with ∇f. → Add one sentence in `learn` with this dot-product argument, or a `deeper` card. Grounded in MIT 18.02 Session 35/38.

- **Missing: ∇f is perpendicular to level curves — the most visually memorable gradient property.** The lab ellipses make this visually verifiable (the red arrows cross the white contours at right angles), but the lesson never mentions it. → Add a sentence in `learn` and a `deeper` card with the chain-rule proof. Grounded in MIT 18.02 Session 35–36.

- **Missing: ill-conditioning and zig-zag oscillation.** The lab bowl (condition number ≈ 1.6) nearly hides the zig-zag behavior that motivates Adam and momentum. → A `deeper` card showing that when Hessian eigenvalues differ widely (κ >> 1), gradient descent bounces across the narrow axis. Grounded in the Distill momentum article and Ruder 2016.

- **The "complete mental model of deep learning" claim oversells what the lesson covers.** It omits backprop (computing ∇L through a computational graph), saddle points as the dominant high-D critical point, and ill-conditioning. → Soften to: "the geometric foundation — in practice, backprop computes ∇L efficiently through the chain rule, and the landscape in 70B dimensions is dominated by saddles, not valleys." Grounded in Dauphin et al. 2014 and Ruder 2016.

## Sources

- [MIT 18.02SC Session 35 — Gradient perpendicular to level curves](https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/pages/2.-partial-derivatives/part-b-chain-rule-gradient-and-directional-derivatives/session-35-gradient-definition-perpendicular-to-level-curves/) — MIT 18.02, canonical text
- [MIT 18.02SC Session 36 Proof notes](https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/resources/mit18_02sc_notes_19/) — MIT 18.02, canonical text
- [An Overview of Gradient Descent Optimization Algorithms](https://arxiv.org/abs/1609.04747) — arXiv:1609.04747, Ruder 2016, widely cited survey
- [Identifying and Attacking the Saddle Point Problem](https://arxiv.org/abs/1406.2572) — arXiv:1406.2572, Dauphin et al. NeurIPS 2014, peer-reviewed
- [Gradient descent, how neural networks learn](https://www.youtube.com/watch?v=IHZwWFHWa-w) — 3Blue1Brown YouTube, high-quality explainer
- [MIT 18.02 Lecture 12 — Gradient](https://ocw.mit.edu/courses/18-02-multivariable-calculus-fall-2007/resources/lecture-12-gradient/) — MIT OCW Fall 2007, canonical text
