# c-chain — The Chain Rule = Backprop

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [CS231n: Backpropagation, Intuitions — Stanford](https://cs231n.github.io/optimization-2/) — Stanford's Deep Learning for Computer Vision notes on backprop as repeated application of the chain rule through a computation graph. Covers the local-gradient / upstream-gradient gate model (add gate copies, multiply gate swaps-and-scales, max gate routes), fan-out summation (partial L/partial x = sum over downstream paths), and numeric gradient checking. The authoritative ML-specific treatment of the chain rule.
- [Backpropagation Calculus — 3Blue1Brown](https://www.3blue1brown.com/lessons/backpropagation-calculus/) — Companion written article to the video below. Shows the chain-rule-as-backprop derivation for a multi-layer network, layer by layer, with the dC/dw = dC/da · da/dz · dz/dw structure. Connects this lesson's 2-stage pipeline to a real network.
- [Automatic Differentiation in Machine Learning: A Survey — Baydin et al. 2018](https://arxiv.org/abs/1502.05767) — The authoritative academic survey of automatic differentiation. Explains why reverse-mode AD (backprop) computes the full gradient of an R^n → R function in one backward pass while forward-mode would need n passes. The "why reverse, not forward" answer every ML practitioner should know.

### Watch
- [Backpropagation Calculus | Deep Learning Chapter 4 (3Blue1Brown)](https://www.youtube.com/watch?v=tIeHLnjs5U8) (3Blue1Brown, ~14 min) — The canonical visual treatment of chain rule as backprop: shows dC/dw = dC/da · da/dz · dz/dw computed layer by layer with animation for a 3-layer network. Directly extends this lesson's 2-stage pipeline to a real deep network.
- [The Spelled-Out Intro to Neural Networks and Backpropagation: Building Micrograd (Andrej Karpathy)](https://www.youtube.com/watch?v=VMj-3S1tku0) (Andrej Karpathy / YouTube, ~2.5 hr) — Builds a scalar-valued autograd engine from scratch in Python, deriving every backward pass manually from the chain rule. The best source for seeing chain rule = backprop in working code. Part of "Neural Networks: Zero to Hero."

## Science & depth recommendations (to reach master's level)

- **Fan-out summation (multivariable chain rule) is absent** → this is the most important generalization missing from this lesson. When a weight feeds multiple downstream nodes, its gradient is the *sum* over paths: partial L/partial x = sum_i (partial L/partial u_i)(partial u_i/partial x). In code this is the `+=` accumulation rule. Without it, learners cannot understand real computation graphs. Add one paragraph after the 2-stage example: "When w feeds several downstream paths, its gradient is the sum over those paths — in code, `+=`. Real networks are graphs, not lines." Ground in CS231n optimization-2.
- **"Why reverse, not forward" is absent** → for f: R^n → R (many weights, one scalar loss), reverse mode computes the entire gradient in one backward pass; forward mode needs one pass per input. This is the fundamental reason backprop exists and the explanation for "one backward pass per training step." Ground in Baydin et al. 2018 survey.
- **Vanishing gradient cause is misattributed** → the lesson attributes vanishing gradients to "many slopes < 1 multiplying" but the *first-line* cause is saturating activations: sigmoid's derivative peaks at 0.25, so each sigmoid layer shrinks the gradient by 0.75x. ReLU (derivative = 1 on the active side) is the dominant fix — before skip connections or LSTMs. Reframe: "The classical cause is sigmoid saturation (derivative at most 0.25); ReLU's derivative = 1 on the active side is why it replaced sigmoid. Skip connections (ResNets) and gating (LSTMs) are architectural reinforcement for deeper networks." Ground in CS231n and standard DL references.

## Sources
- [CS231n: Backpropagation Intuitions (Stanford)](https://cs231n.github.io/optimization-2/) — peer-reviewed course notes; gate-level backprop, fan-out summation, gradient checking
- [3Blue1Brown — Backpropagation Calculus, YouTube](https://www.youtube.com/watch?v=tIeHLnjs5U8) — high-quality explainer, Deep Learning Ch. 4
- [3Blue1Brown — Backpropagation Calculus, lesson page](https://www.3blue1brown.com/lessons/backpropagation-calculus/) — companion written article
- [Karpathy — Micrograd (Building Backprop from Scratch), YouTube](https://www.youtube.com/watch?v=VMj-3S1tku0) — high-quality explainer; chain rule in working Python code
- [Baydin et al. 2018 — Automatic Differentiation Survey (arXiv)](https://arxiv.org/abs/1502.05767) — peer-reviewed; reverse-mode vs forward-mode AD, the foundational academic reference
- [MIT 18.01SC Session 11: Chain Rule](https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/pages/1.-differentiation/part-a-definition-and-basic-rules/session-11-chain-rule/) — MIT 18.01SC university lecture; formal chain rule with video clips and worked examples
