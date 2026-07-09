# c-deriv — The Derivative: Slope, Live

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [The Definition of the Derivative — Paul's Online Math Notes](https://tutorial.math.lamar.edu/classes/calci/defnofderivative.aspx) — Rigorous worked-example walkthrough of f'(x) = lim_{h→0}[f(x+h)−f(x)]/h. Explicitly frames f' as a *new function* (not just a value at a point), shows three concrete worked examples, and covers where derivatives fail to exist (including |x| at 0 and vertical tangents). The best written companion to the visual lab.
- [Continuity and Differentiability — CalcWorkshop](https://calcworkshop.com/derivatives/continuity-and-differentiability/) — Directly addresses the key gap: all differentiable functions are continuous, but not vice versa. Works through |x| at x = 0 via one-sided limits (left slope = −1, right slope = +1, so no derivative exists). Essential for understanding why ReLU's derivative is undefined at 0 and why subgradients exist.
- [MIT 18.01SC Session 1: Introduction to Derivatives](https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/pages/1.-differentiation/part-a-definition-and-basic-rules/session-1-introduction-to-derivatives/) — Prof. David Jerison's formal university treatment: secant-to-tangent limit, the Secant Approximation interactive mathlet, formal definition, and recitation videos on graphing a derivative function. MIT 18.01SC authority.

### Watch
- [The Paradox of the Derivative | Chapter 2, Essence of Calculus (3Blue1Brown)](https://www.youtube.com/watch?v=9vKqVkMQHKk) (3Blue1Brown, ~17 min) — Resolves the "instantaneous rate of change" paradox using a car/distance example. Visually shows secant lines tipping into tangents as h → 0. Directly matches the lab mechanic and names the conceptual tension the lesson should acknowledge.
- [Limits and the Definition of Derivatives | Chapter 7, Essence of Calculus (3Blue1Brown)](https://www.youtube.com/watch?v=kfF40MiS7zA) (3Blue1Brown, ~18 min) — Formalizes the limit notation used in the derivative definition and introduces L'Hopital's rule as a bonus. Good follow-up once the lab intuition is in place and the learner is ready for the epsilon-delta framing.

## Science & depth recommendations (to reach master's level)

- **Differentiability vs continuity is absent** → the most important missing concept for ML practitioners. ReLU is continuous everywhere but non-differentiable at 0; frameworks use a subgradient (conventionally 0) there. Add: "The difference quotient limit must agree from both sides; where left and right slopes disagree (|x| at 0: slopes −1 and +1), no derivative exists — these are the kinks PyTorch handles with subgradients." Ground in CalcWorkshop and Paul's Notes.
- **"Best linear approximation" framing is absent** → f(a+h) ≈ f(a) + f'(a)·h is the payoff of the derivative and the bridge to gradient descent, Taylor series, and Newton's method. The lesson shows the tangent line but never names it "the best straight-line approximation near a." This single sentence connects every gradient step in training back to this lesson. Ground in 3Blue1Brown Chapter 2.
- **Finite-difference accuracy is unexplored** → the lab uses forward differences (O(h) accurate); making h too small causes catastrophic cancellation in floating point. Central differences (f(a+h)−f(a−h))/(2h) are O(h²) and degrade more gracefully. This is directly relevant to gradient checking (the standard ML debugging tool). Ground in Paul's Notes error analysis material.

## Sources
- [3Blue1Brown — Derivative Paradox, YouTube](https://www.youtube.com/watch?v=9vKqVkMQHKk) — high-quality explainer, Essence of Calculus Ch. 2
- [3Blue1Brown — Derivative Paradox, lesson page](https://www.3blue1brown.com/lessons/derivatives) — companion written article with additional context
- [Paul's Online Math Notes — Definition of Derivative](https://tutorial.math.lamar.edu/classes/calci/defnofderivative.aspx) — canonical text, three worked examples, non-differentiable cases
- [CalcWorkshop — Continuity and Differentiability](https://calcworkshop.com/derivatives/continuity-and-differentiability/) — high-quality explainer, differentiability vs continuity with |x| worked through
- [MIT 18.01SC Session 1: Introduction to Derivatives](https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/pages/1.-differentiation/part-a-definition-and-basic-rules/session-1-introduction-to-derivatives/) — MIT 18.01SC university lecture with video and mathlet
- [3Blue1Brown — Limits Chapter 7, YouTube](https://www.youtube.com/watch?v=kfF40MiS7zA) — Essence of Calculus, formalizes the limit definition underlying the derivative
