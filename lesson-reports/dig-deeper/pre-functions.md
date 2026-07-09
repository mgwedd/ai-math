# pre-functions — Functions: Machines & Graphs

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [Functions (Wikipedia)](https://en.wikipedia.org/wiki/Function_(mathematics)) — The canonical reference for the formal definition (domain, codomain, image/range as distinct concepts), injectivity/surjectivity/bijectivity, composition, and the distinction between f (the machine) and f(x) (a value). Covers the codomain/range split the lesson conflates, and explains why composing linear-only maps stays linear — the gap behind the nonlinearity requirement.
- [Paul's Online Math Notes — Calculus I: Functions](https://tutorial.math.lamar.edu/classes/calci/functions.aspx) — Thorough pre-calc treatment of function notation, evaluation, domain, range, and composition with worked examples; the standard reference a calculus-bound learner reaches for first. Moderately rigorous, self-contained.
- [Universal Approximation Theorem (Wikipedia)](https://en.wikipedia.org/wiki/Universal_approximation_theorem) — Graduate-level: why composing functions buys expressive power only when nonlinear activations interleave the layers. Directly grounds the lesson's claim that "deep = a long chain of composed machines" and corrects the implicit suggestion that stacking alone adds power.
- [Function Composition (Wikipedia)](https://en.wikipedia.org/wiki/Function_composition) — Covers associativity, non-commutativity, and the ∘ notation — the three structural facts about composition that the lesson's lab reveals but never names. Essential notation for any master's program.

### Watch
- [But what is a neural network? | Deep Learning, Chapter 1](https://www.youtube.com/watch?v=aircAruvnKk) (3Blue1Brown, ~19 min) — Shows exactly how a real ML model is a long chain of composed functions — neurons as functions, layers as chained machines, activation functions (sigmoid → ReLU) bending each stage. Best visual confirmation of the lesson's "deep = composition" thesis, and shows *why* nonlinearity is needed.
- [Visualizing the chain rule and product rule | Essence of Calculus Ch. 4](https://www.youtube.com/watch?v=YG15m2VwSjA) (3Blue1Brown, ~16 min) — Shows g(f(x)) geometrically and derives why composition's derivative telescopes one link at a time. Best bridge from composition (this lesson) to the chain rule (World 2), and demonstrates associativity visually.

## Science & depth recommendations (to reach master's level)

- **Codomain vs. range conflation** → Add a sentence distinguishing the codomain (declared target set, part of the function's identity) from the range/image (the outputs actually produced, a subset of the codomain). Example: f(x)=x² declared ℝ→ℝ has codomain ℝ but range [0,∞). Grounded in [Wikipedia: Function (mathematics)](https://en.wikipedia.org/wiki/Function_(mathematics)) and [Wikipedia: Codomain](https://en.wikipedia.org/wiki/Codomain).
- **ℝ→ℝ only, but ML uses ℝⁿ→ℝ** → The lesson defines functions as "number in, number out" but then the ML note maps an image vector to a probability — a contradiction. Add one clause: "inputs and outputs needn't be single numbers — they can be vectors, images, or sequences; the one-output rule is what stays fixed." Grounded in [Wikipedia: Function (mathematics)](https://en.wikipedia.org/wiki/Function_(mathematics)).
- **Nonlinearity is what composition buys** → The lesson implies stacking machines = power, but composing affine-only maps collapses to one affine map. Add explicitly: "depth matters only because a nonlinear activation (ReLU/sigmoid) sits between layers — without it, g(f(x)) of linear maps is just one linear map." Grounded in [Universal Approximation Theorem](https://en.wikipedia.org/wiki/Universal_approximation_theorem) and [Google ML Crash Course: Activation Functions](https://developers.google.com/machine-learning/crash-course/neural-networks/activation-functions).
- **Composition is associative** → The lab demonstrates non-commutativity but never names associativity — the fact that makes a deep pipeline well-defined without specifying parentheses. Add one sentence in the composition card. Grounded in [Wikipedia: Function Composition](https://en.wikipedia.org/wiki/Function_composition).
- **ReLU is the V-shape lab's piecewise twin** → The "vee" |x|−1 already shows the kinked shape; naming the connection to ReLU ("flat then linear — exactly half of this V") is a high-leverage, near-free link to the neural-network lessons ahead.

## Sources
- [Wikipedia: Function (mathematics)](https://en.wikipedia.org/wiki/Function_(mathematics)) — canonical text, formal definition, codomain/range/image, composition, injective/surjective/bijective
- [Wikipedia: Codomain](https://en.wikipedia.org/wiki/Codomain) — canonical text, formal definition distinguishing codomain from range
- [Wikipedia: Function Composition](https://en.wikipedia.org/wiki/Function_composition) — canonical text, associativity, non-commutativity, ∘ notation
- [Wikipedia: Universal Approximation Theorem](https://en.wikipedia.org/wiki/Universal_approximation_theorem) — peer-reviewed backing for nonlinearity requirement
- [Paul's Online Math Notes — Calculus I: Functions](https://tutorial.math.lamar.edu/classes/calci/functions.aspx) — high-quality explainer, standard calculus-level reference (Lamar University)
- [Google ML Crash Course: Activation Functions](https://developers.google.com/machine-learning/crash-course/neural-networks/activation-functions) — canonical industry source, activation ranges and nonlinearity motivation
- [3Blue1Brown: But what is a neural network?](https://www.youtube.com/watch?v=aircAruvnKk) — high-quality visual explainer, YouTube/3Blue1Brown
- [3Blue1Brown: Visualizing the chain rule and product rule](https://www.youtube.com/watch?v=YG15m2VwSjA) — high-quality visual explainer, Essence of Calculus series
