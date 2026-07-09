# la-matcalc — Matrix Calculus: Shapes First

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [The Matrix Calculus You Need For Deep Learning — Parr & Howard](https://explained.ai/matrix-calculus/) — The definitive practical reference (arXiv 1802.01528). Covers numerator vs. denominator layout conventions, the Jacobian, element-wise activation gradients (diagonal Jacobian), the full layer backward pass with bias, and the chain rule in matrix form. Directly addresses every gap identified in the lesson: convention clash, activation gradients, bias, and the layout-dependent transpose.
- [Backpropagation through a Fully-Connected Layer — Eli Bendersky](https://eli.thegreenplace.net/2018/backpropagation-through-a-fully-connected-layer/) — Rigorous, element-level derivation showing why the exact Jacobian ∂y/∂W is a 4D tensor that is never materialized; the outer product δxᵀ is the contracted result. Also derives ∂L/∂b = δ and the batched form dW = XᵀδY. The most explicit treatment of the "why outer product" question.
- [LoRA: Low-Rank Adaptation of Large Language Models — arXiv 2106.09685](https://arxiv.org/abs/2106.09685) — Grounds the lesson's LoRA `ml` note: ΔW = (α/r)·BA, where the gradient update across a batch sums rank-1 outer products δ⁽ᵇ⁾x⁽ᵇ⁾ᵀ (batch rank ≤ B). The connection from the lesson's "rank-1 update" framing to a real ML system.

### Watch
- [MIT 18.065 Playlist — Strang, Matrix Methods](https://www.youtube.com/playlist?list=PLUl4u3cNGP63oMNUHXqIUcrkS2PivhN3k) (MIT OCW, ~50 min/lecture) — Lectures covering backpropagation from first principles in the data-science context: how ∂L/∂W = δxᵀ arises from the chain rule, the batched form, and the connection to the SVD / low-rank structure of gradient updates. Strang's treatment makes the algebra rigorous without losing the ML intuition.
- [But what is a neural network? | Deep Learning, ch. 1 — 3Blue1Brown](https://www.youtube.com/watch?v=aircAruvnKk) (3Blue1Brown, ~19 min) — Best visual context for what the affine layer formula means end-to-end (y = σ(Wx+b)) before diving into its gradient. Ensures the learner understands *what* they are differentiating before studying *how* — a prerequisite the lesson assumes but many learners lack.

## Science & depth recommendations (to reach master's level)

- **Convention clash between gradient and numerator layout is silently present.** The lesson writes ∇ₓL ∈ ℝⁿ (column, same shape as x — denominator/gradient convention) but also shows Jacobian ∂y/∂x as m×n (numerator layout). These coexist without explanation, which confuses learners who then read papers using the other convention. Add one sentence: "We use the gradient convention — the derivative of a scalar has the shape of the variable it's taken with respect to. Numerator layout (common in many papers) transposes this." Grounded in Parr & Howard.
- **Bias gradient and the batched form are absent.** Real layers compute y = Wx + b; ∂L/∂b = δ (trivial but essential). The batched gradient dW = XᵀδY (a matmul, not a loop of outer products) is the practical form in every framework (PyTorch's X.T @ dout). Both are one-line additions with outsized value. Grounded in Bendersky and CS231n.
- **Element-wise activation Jacobian is diagonal but never stated.** Backprop through a = σ(z) gives δ_z = δ_a ⊙ σ'(z) — the gradient is gated element-wise, not mixed. This is the distinguishing structural fact of activation gradients versus weight gradients, and without it the learner cannot assemble a full backward pass through multiple layers. Grounded in Parr & Howard section on element-wise ops.
- **Why the full Jacobian ∂y/∂W is never materialized needs explaining.** The lesson jumps straight to δxᵀ without saying why. Bendersky's derivation makes it explicit: the exact Jacobian is a 4D tensor with >160M elements for a modest layer (mostly zeros); δxᵀ is the result of contracting δ against it. One sentence in `learn` or a `deeper` card closes this gap and teaches the "never materialize the Jacobian" principle that governs efficient backprop.

## Sources
- [The Matrix Calculus You Need For Deep Learning — Parr & Howard (explained.ai)](https://explained.ai/matrix-calculus/) — canonical text, highly cited; also at [arXiv 1802.01528](https://arxiv.org/pdf/1802.01528)
- [Backpropagation through a Fully-Connected Layer — Eli Bendersky](https://eli.thegreenplace.net/2018/backpropagation-through-a-fully-connected-layer/) — high-quality explainer, rigorous derivation
- [LoRA: Low-Rank Adaptation of Large Language Models — arXiv 2106.09685](https://arxiv.org/abs/2106.09685) — seminal paper, peer-reviewed (ICLR 2022)
- [MIT 18.065 YouTube playlist](https://www.youtube.com/playlist?list=PLUl4u3cNGP63oMNUHXqIUcrkS2PivhN3k) — MIT 18.065, peer-reviewed course
- [3Blue1Brown, Deep Learning ch. 1 — YouTube](https://www.youtube.com/watch?v=aircAruvnKk) — high-quality explainer
