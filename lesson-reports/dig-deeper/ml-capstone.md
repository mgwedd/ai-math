# ml-capstone — CAPSTONE: Train an MLP in the Browser

## Dig Deeper appendix (curated — graduate-authoritative)
### Read
- [Neural Networks and Deep Learning (Michael Nielsen) — Ch. 1–2](http://neuralnetworksanddeeplearning.com/) — the canonical free textbook on exactly this loop: gradient descent, the backpropagation equations derived from first principles, and cross-entropy vs quadratic cost (Ch. 3 explains why cross-entropy avoids the sigmoid learning slowdown the lab's deeper card names). Note: served over **http:// only** (no valid TLS certificate), so some browsers warn.
- [Deep Learning (Goodfellow, Bengio, Courville) — Ch. 6: Deep Feedforward Networks](https://www.deeplearningbook.org/contents/mlp.html) — the graduate treatment of the forward pass, cross-entropy loss, and back-propagation (§6.5), plus the capacity / under- vs over-fitting tradeoff the lab reproduces live.
- [Learning representations by back-propagating errors (Rumelhart, Hinton & Williams, 1986)](https://doi.org/10.1038/323533a0) — the seminal backprop paper the earlier ml-mlp lesson cites. **Paywalled on Nature** (DOI given for citation); a widely mirrored author copy is at https://www.cs.toronto.edu/~hinton/absps/naturebp.pdf.

### Watch
- [The spelled-out intro to neural networks and backpropagation: building micrograd](https://www.youtube.com/watch?v=VMj-3S1tku0) (Andrej Karpathy, ~2h 25m) — builds a scalar autograd engine and trains a tiny MLP by hand, mirroring the lab's "forward → loss → backprop → update" loop with no libraries; the single best companion to this capstone.
- [Backpropagation calculus | Deep learning, chapter 4](https://www.youtube.com/watch?v=tIeHLnjs5U8) (3Blue1Brown, ~10 min) — visualizes the chain rule sending gradients backward through the network, making the ∂loss/∂w the lab computes concrete.

## Science & depth recommendations (to reach master's level)
- The output-layer gradient `ŷ − y` is stated but not derived → show that sigmoid + binary cross-entropy makes the logit gradient collapse to (predicted − target), and that sigmoid + squared error instead vanishes when confidently wrong, grounded in Nielsen Ch. 3.
- Learning rate is framed as a Goldilocks dial → connect it to the second-order picture: the safe step size relates to the loss curvature, and modern optimizers (Adam, warmup, LR schedules) are machinery for not guessing η, grounded in Deep Learning Ch. 8.
- The two-moons dataset is used without provenance → note it is the standard `sklearn.datasets.make_moons` non-linearly-separable benchmark, so learners can reproduce the experiment in Python.
- Underfitting vs overfitting is shown only via capacity → tie the U-shaped bias–variance tradeoff to regularization (weight decay, early stopping) that the lab could later expose, grounded in Deep Learning Ch. 5.
- tanh is chosen for smooth gradients at toy scale → note real nets use ReLU/GELU and that the training loop is identical regardless of activation, grounded in Nielsen Ch. 1 and the ml-mlp lesson.

## Sources
- http://neuralnetworksanddeeplearning.com/ — canonical free textbook (Michael Nielsen); **http-only**, TLS cert invalid
- https://www.deeplearningbook.org/contents/mlp.html — canonical graduate text (Goodfellow, Bengio, Courville)
- https://doi.org/10.1038/323533a0 — seminal peer-reviewed paper (Rumelhart, Hinton & Williams, Nature 1986); **paywalled** — author mirror: https://www.cs.toronto.edu/~hinton/absps/naturebp.pdf
- https://www.youtube.com/watch?v=VMj-3S1tku0 — Andrej Karpathy, authoritative from-scratch lecture
- https://www.youtube.com/watch?v=tIeHLnjs5U8 — 3Blue1Brown, high-quality explainer
