# pre-sigma — Sigma Notation & Reading Formulas

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [Summation (Wikipedia)](https://en.wikipedia.org/wiki/Summation) — The canonical reference for the formal recursive definition, dummy-index rules, the empty-sum convention (Σ_{i=a}^{b} = 0 when b < a), double sums, distributivity, index splitting, and reindexing. The lesson never shows a non-1 lower bound or the empty-sum case; both are here and matter for any ML derivation.
- [MIT 18.657: Mathematics of Machine Learning (OCW)](https://ocw.mit.edu/courses/18-657-mathematics-of-machine-learning-fall-2015/) — Graduate-level course (Philippe Rigollet, MIT) showing sigma notation in its natural habitat: empirical risk E[L] = (1/n) Σ ℓ(yᵢ, f(xᵢ)), concentration inequalities, Rademacher complexity. The authoritative context for why reading Σ fluently unlocks ML theory papers. (MIT graduate course, peer-reviewed methods.)
- [Wikipedia: Cross-Entropy](https://en.wikipedia.org/wiki/Cross-entropy) — The formal H(p,q) = −Σ_x p(x) log q(x) definition with explicit index-set notation, showing Σ ranging over the support rather than 1..n. Directly corrects the lesson's loose "cross-entropy is a sum of logs" and demonstrates the weighted-sum structure learners must decode in every classification paper.

### Watch
- [3Blue1Brown: But what is a neural network? | Deep Learning, Chapter 1](https://www.youtube.com/watch?v=aircAruvnKk) (3Blue1Brown, ~19 min) — Shows Σ in its most consequential ML context: the weighted sum of activations Σ wᵢaᵢ that defines each neuron, written first in sigma notation and then as a matrix product. Best visual demonstration that reading Σ fluently literally unlocks the formula on every layer of a real network.
- [StatQuest: Gradient Descent, Step-by-Step](https://www.youtube.com/watch?v=sDv4f4s2SB8) (StatQuest/Josh Starmer, ~24 min) — Builds gradient descent from (1/n) Σ (yᵢ − ŷᵢ)² — the MSE loss written as a sigma sum — and differentiates it term by term. The best bridge from "Σ is a for-loop" to "Σ enables every gradient calculation." Directly motivates why linearity of Σ matters (the 1/n constant can float outside).

### Watch (supplemental)
- [MIT 18.06 Lecture 16: Projection Matrices and Least Squares](https://www.youtube.com/watch?v=osh80YCg_GM) (MIT OCW/Gilbert Strang, ~48 min) — Shows the double-sum Σᵢ Σⱼ xᵢ Aᵢⱼ xⱼ that defines a quadratic form, and how Σ notation telescopes into the matrix product AᵀA at the heart of the normal equation. Excellent for the double-sum → matrix multiply bridge the lesson's deeper card gestures at.

## Science & depth recommendations (to reach master's level)

- **Lower bound is always 1 — but learners will immediately meet 0** → Every lesson example and lab uses i=1..n, but ML formulas routinely start at 0 (zero-indexed layers, polynomial coefficients, DFT), and theoretical notation uses Σ_{x∈X} (sum over a set). Add one line in `learn`: "The bottom needn't be 1 — Σ_{i=0} starts at zero, and Σ_{x∈X} sums over every item in a set (as in the expectation below)." Grounded in [Wikipedia: Summation](https://en.wikipedia.org/wiki/Summation).
- **Empty-sum convention** → By definition, Σ_{i=a}^{b} = 0 when b < a (an empty sum). This keeps edge cases in code and recurrences clean — the dual of "empty product = 1" the Π card introduces. Worth one clause in the dummy-index deeper card. Grounded in [Wikipedia: Summation](https://en.wikipedia.org/wiki/Summation).
- **Linearity is the workhorse of every ML derivation** → The lesson never states Σ c·aᵢ = c·Σ aᵢ and Σ(aᵢ+bᵢ) = Σaᵢ + Σbᵢ. Linearity is why 1/n floats outside the mean, why the gradient of a summed loss is a sum of gradients, and why linearity of expectation E[Σ aᵢXᵢ] = Σ aᵢE[Xᵢ] holds even without independence. Add a short deeper card or in-line clause. Grounded in the [IIT-Delhi Linearity of Expectation notes](https://www.cse.iitd.ac.in/~mohanty/col106/Resources/linearity_expectation.pdf) and [Wikipedia: Summation](https://en.wikipedia.org/wiki/Summation).
- **Cross-entropy is a weighted sum, not just a sum of logs** → The ml note says "cross-entropy (a sum of logs)" — this misses the probability weighting p(x). Fix to: "cross-entropy H(p,q) = −Σ p(x) log q(x), a weighted sum of log-probabilities." The lesson's existing quiz question on log-probabilities already teaches the right thing; the ml note should match. Grounded in [Wikipedia: Cross-Entropy](https://en.wikipedia.org/wiki/Cross-entropy).
- **Mean as the argmin of squared error** → The fulcrum lab shows balance beautifully, but never names the deeper fact: x̄ = argmin_c Σ(xᵢ−c)². This is the bridge from "mean" to "MSE loss" — why the optimal constant prediction is the average, and why MSE's optimum is the data mean. Add as a deeper card or lab extension. Grounded in standard statistics (derivation: differentiate Σ(xᵢ−c)² with respect to c, set to 0).

## Sources
- [Wikipedia: Summation](https://en.wikipedia.org/wiki/Summation) — canonical text, recursive definition, dummy index, empty sum, distributivity, double sums, index shifting
- [Wikipedia: Cross-Entropy](https://en.wikipedia.org/wiki/Cross-entropy) — canonical text, H(p,q) = −Σ p(x) log q(x), one-hot NLL special case
- [MIT 18.657: Mathematics of Machine Learning (OCW)](https://ocw.mit.edu/courses/18-657-mathematics-of-machine-learning-fall-2015/) — MIT graduate course, Philippe Rigollet; Σ in its natural ML-theory context
- [IIT-Delhi COL106: Linearity of Expectation](https://www.cse.iitd.ac.in/~mohanty/col106/Resources/linearity_expectation.pdf) — high-quality course notes, E[Σ aᵢXᵢ] = Σ aᵢE[Xᵢ] without independence
- [Lei Mao: LogSumExp and Its Numerical Stability](https://leimao.github.io/blog/LogSumExp/) — high-quality technical blog, log-of-a-sum trick beyond ln Π = Σ ln
- [3Blue1Brown: But what is a neural network? (YouTube)](https://www.youtube.com/watch?v=aircAruvnKk) — high-quality visual explainer, Σ wᵢaᵢ in context
- [StatQuest: Gradient Descent, Step-by-Step (YouTube)](https://www.youtube.com/watch?v=sDv4f4s2SB8) — high-quality explainer, MSE = (1/n) Σ (yᵢ−ŷᵢ)² differentiated
- [MIT 18.06 Lecture 16: Projection Matrices and Least Squares (YouTube)](https://www.youtube.com/watch?v=osh80YCg_GM) — MIT OCW / Gilbert Strang, double-sum → quadratic form → matrix product
