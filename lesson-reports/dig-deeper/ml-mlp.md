# ml-mlp — Neurons & MLPs: Bend the Line

## Dig Deeper appendix (curated — graduate-authoritative)
### Read
- [Deep Learning (Goodfellow, Bengio, Courville) — Ch. 6: Deep Feedforward Networks](https://www.deeplearningbook.org/contents/mlp.html) — the canonical graduate treatment of the MLP forward pass `h = g(Wx + b)`, universal approximation, and depth-vs-width; the source of the piecewise-linear-region argument this lesson gestures at.
- [CS231n — Neural Networks Part 1 (Stanford)](https://cs231n.github.io/neural-networks-1/) — the standard course notes on neurons and activation functions; explicitly covers the "dying ReLU" failure mode (up to ~40% of a net can die at a bad learning rate) and Leaky ReLU as the fix, filling the lesson's biggest gap.
- [Universal Approximation Theorem (Wikipedia, graduate-level survey)](https://en.wikipedia.org/wiki/Universal_approximation_theorem) — separates the two theorems the lesson conflates: the width-unbounded single-layer result (Cybenko 1989 / Hornik 1991) vs. the bounded-width, depth-unbounded result — and states the compact-domain caveat.

### Watch
- [But what is a neural network? | Deep learning, chapter 1](https://www.youtube.com/watch?v=aircAruvnKk) (3Blue1Brown, ~19 min) — builds the neuron → layer → network picture visually; the best single intuition primer for how weighted sums plus a nonlinearity compose into a function.
- [The spelled-out intro to neural networks and backpropagation: building micrograd](https://www.youtube.com/watch?v=VMj-3S1tku0) (Andrej Karpathy, ~2h 25m) — implements a scalar autograd engine from scratch, showing exactly how the backprop the lesson mentions in a "deeper" card actually assigns a gradient to every weight.

## Science & depth recommendations (to reach master's level)
- The neuron formula `w·relu(x − b)` is a non-standard 1D factoring → teach the standard `relu(w·x + b)` alongside it and state the kink sits at `x = −b/w`, so learners aren't blindsided by `nn.Linear`/PyTorch code, grounded in CS231n and the Deep Learning book Ch. 6.
- The matrix form of a layer is never written → add the display formula `h = relu(W₁x + b₁), y = W₂h + b₂` to bridge the 1D hinge story to the actual N-dimensional MLP, grounded in Deep Learning Ch. 6.
- Dying ReLU is absent → name it and the Leaky ReLU / GELU fixes; it is a week-1 practical failure mode, grounded in CS231n Neural Networks Part 1.
- The UAT is stated without its caveats → clarify it is an *existence* result on a *compact domain* that says nothing about how many neurons, trainability, or extrapolation, grounded in the Universal Approximation Theorem survey.
- The depth-vs-width claim is stated as if the exponential region count is always realized → add the caveat that it is an *upper bound* rarely saturated by randomly initialized nets (Montúfar et al. 2014), grounded in Deep Learning Ch. 6.
- Transformers use GELU, not ReLU → one sentence in the `ml` note that GELU ≈ x·Φ(x) is a smooth "soft hinge" avoiding dead neurons keeps the piecewise-linear intuition while preparing learners for real transformer code.

## Sources
- https://www.deeplearningbook.org/contents/mlp.html — canonical graduate text (Goodfellow, Bengio, Courville)
- https://cs231n.github.io/neural-networks-1/ — Stanford CS231n course notes
- https://en.wikipedia.org/wiki/Universal_approximation_theorem — graduate-level reference survey
- https://www.youtube.com/watch?v=aircAruvnKk — 3Blue1Brown, high-quality explainer
- https://www.youtube.com/watch?v=VMj-3S1tku0 — Andrej Karpathy (ex-Tesla/OpenAI), authoritative from-scratch lecture
