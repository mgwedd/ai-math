# la-boss — BOSS: Build a Neural Layer

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [Neural Networks, Manifolds, and Topology — Christopher Olah](https://colah.github.io/posts/2014-03-NN-Manifolds-Topology/) — The canonical source for the "layers untangle data" picture: each invertible layer (W + bias + tanh) is a homeomorphism; det=0 collapses classes irreversibly; concentric rings require lifting to a higher dimension. Directly motivates the boss lab's det=0 sabotage mission and reveals what the lab cannot yet show (nonlinearity + dimensionality).
- [Stanford CS231n: Linear Classification notes](https://cs231n.github.io/linear-classify/) — Authoritative treatment of what the boss lab actually computes: rows of W as per-class weight vectors, the hyperplane decision boundary, and the critical role of bias (without b, every boundary passes through the origin). Essential reading to understand the scope and limits of the lab.
- [But what is a neural network? — 3Blue1Brown, Deep Learning ch. 1](https://www.3blue1brown.com/lessons/neural-networks/) — Best visual introduction to the full layer formula σ(Wx+b): what neurons compute, why the nonlinearity is non-negotiable, and how stacking layers creates composable representations. Grounds the boss lab in its proper place in the deep-learning pipeline.

### Watch
- [But what is a neural network? | Deep Learning, ch. 1 — 3Blue1Brown](https://www.youtube.com/watch?v=aircAruvnKk) (3Blue1Brown, ~19 min) — Shows the full affine + activation picture the boss lab approximates; the neuron-as-dot-product framing plus the role of sigmoid/ReLU is precisely what the lesson's formula block promises but the lab doesn't deliver. Best intuition-builder for the missing nonlinearity.
- [MIT 18.065 YouTube playlist — Strang, Matrix Methods](https://www.youtube.com/playlist?list=PLUl4u3cNGP63oMNUHXqIUcrkS2PivhN3k) (MIT OpenCourseWare, ~50 min/lecture) — Lectures 1–3 connect linear maps to deep networks: why composing linear layers collapses to one matrix (W₂W₁x = Wx), and how rank bounds the expressivity of a bottleneck layer. The rigorous complement to Olah's geometric intuition.

## Science & depth recommendations (to reach master's level)

- **The lab only demonstrates a linear classifier, not representation learning.** The two clusters are already linearly separable in raw space; any W can only realign the separating hyperplane to x=0. The lesson's claim "this is what learning IS" overstates what the lab shows. To reach master's level, add a second dataset (concentric rings or interlocking moons) where no linear W can separate the classes — then demonstrate that adding a nonlinearity + bias does. Grounded in Olah 2014 and CS231n.
- **Composition of linear maps is not addressed.** W₂(W₁x) = (W₂W₁)x = Wx: stacking linear layers adds zero expressive power. This algebraic fact — the single most important gap in the boss lesson — is why nonlinearities between layers are mandatory, not optional. Worth a `deeper` card. Grounded in CS231n linear-classify notes.
- **Bias is absent from both the lab and the learn text.** Without b, every decision boundary is forced through the origin. The formula block shows "(+ bias)" but the lab silently drops it. A `deeper` card explaining b's geometric role (translate the boundary off the origin) is a quick, high-ROI addition. Grounded in CS231n.
- **det is a square-matrix-only concept; rectangular layers need rank.** Real layers are 784×128; there is no determinant. The det=0 intuition is valuable for the 2×2 toy but should be flagged as a special case. The correct generalisation is low rank = collapsed information, which the next lesson (la-rank) makes precise. Grounded in SVD/rank theory.

## Sources
- [Christopher Olah, "Neural Networks, Manifolds, and Topology" (2014)](https://colah.github.io/posts/2014-03-NN-Manifolds-Topology/) — high-quality explainer, canonical blog (Anthropic/Google Brain)
- [Stanford CS231n, Linear Classification notes](https://cs231n.github.io/linear-classify/) — canonical text, peer-reviewed course
- [3Blue1Brown, "But what is a neural network?" lesson](https://www.3blue1brown.com/lessons/neural-networks/) — high-quality explainer
- [3Blue1Brown YouTube, Deep Learning ch. 1](https://www.youtube.com/watch?v=aircAruvnKk) — high-quality explainer, ~19 min
- [MIT 18.065 YouTube playlist](https://www.youtube.com/playlist?list=PLUl4u3cNGP63oMNUHXqIUcrkS2PivhN3k) — MIT 18.065, peer-reviewed course
