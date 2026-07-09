# c-exp — e and Exponentials

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [e (Mathematical Constant) — Wikipedia](https://en.wikipedia.org/wiki/E_(mathematical_constant)) — Authoritative reference covering all definitions of e: compound-interest limit, series sum (1 + 1/1! + 1/2! + …), the unique base where d/dx a^x = a^x, and the ODE characterization f' = f, f(0) = 1. Also covers irrationality/transcendence. The compound-interest values in the lesson (monthly ≈ 2.613, daily ≈ 2.7146) are confirmed here.
- [What's So Special About Euler's Number e? — 3Blue1Brown](https://www.3blue1brown.com/lessons/eulers-number) — Companion written article to the Essence of Calculus video on e. Derives why d/dx a^x = a^x · C(a) where C(a) = lim_{h→0}(a^h − 1)/h, explains why e is the unique base making C = 1, and introduces the e^{ct} growth-rate reframing. Addresses the missing "where does ln a come from?" gap in the lesson.
- [MIT 18.01SC — Log and Exponent Derivatives (Session 17)](https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/resources/log-and-exponent-derivatives/) — Prof. David Jerison's lecture clip on derivatives of exponential and logarithmic functions. Covers d/dx e^x = e^x, d/dx ln x = 1/x, and the inverse-function relationship. MIT 18.01SC authority.

### Watch
- [What's So Special About Euler's Number e? | Essence of Calculus (3Blue1Brown)](https://www.youtube.com/watch?v=m2MIpDrF7Es) (3Blue1Brown, ~13 min) — Defines e via the limit C(a) = lim_{h→0}(a^h − 1)/h and shows geometrically why e is the unique base where slope = height at every point. The best visual treatment of the self-derivative property and the one that covers what the lesson's lab operationalizes.
- [Visualizing the Chain Rule and Product Rule | Chapter 4, Essence of Calculus (3Blue1Brown)](https://www.youtube.com/watch?v=YG15m2VwSjA) (3Blue1Brown, ~16 min) — Covers how to differentiate e^{f(x)} compositions; the chain rule applied to exponentials is the engine behind softmax and sigmoid gradients. Bridges from this lesson to c-chain.

## Science & depth recommendations (to reach master's level)

- **The constant ln a is asserted, not derived** → the lesson states d/dx a^x = a^x · ln a as fact without showing where ln a comes from. Add one sentence: "Why ln a? Because d/dx a^x = a^x · lim_{h→0}(a^h − 1)/h, and that limit *is* ln a — the only value e makes equal to 1." Ground in 3Blue1Brown lesson page and Wikipedia e article.
- **The ODE characterization is absent** → f' = f with f(0) = 1 has e^x as its unique solution. This equation recurs throughout ML: exponential moving averages, learning-rate decay, Neural ODEs, residual streams. Add: "e^x is the *unique* function satisfying f' = f, f(0) = 1 — the same equation that describes exponential decay, EMAs, and continuous learning-rate schedules." Ground in Wikipedia e article.
- **The e^{ct} growth-rate reframing is missing** → any exponential a^x = e^{(ln a)x}, so the coefficient on x in the exponent is the continuous growth rate (positive for growth, negative for decay/half-life). This unifies all exponential behavior in one form and is the natural entry point for learning-rate schedules and exponential smoothing. Ground in 3Blue1Brown lesson page.
- **Softmax numerical stability is omitted** → production softmax computes e^{z_i − max(z)} rather than e^{z_i} to prevent overflow. The max cancels in the normalization ratio, leaving identical probabilities. This is a real practitioner skill. Add to the ml note: "In practice, subtract max(z) first: e^{z_i − max z} prevents overflow and gives identical probabilities."

## Sources
- [3Blue1Brown — Euler's Number e, YouTube](https://www.youtube.com/watch?v=m2MIpDrF7Es) — high-quality explainer, Essence of Calculus
- [3Blue1Brown — Euler's Number, lesson page](https://www.3blue1brown.com/lessons/eulers-number) — companion written article with the C(a) limit derivation
- [Wikipedia: e (Mathematical Constant)](https://en.wikipedia.org/wiki/E_(mathematical_constant)) — canonical reference; limit, series, ODE, irrationality, compound-interest values
- [MIT 18.01SC — Log and Exponent Derivatives](https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/resources/log-and-exponent-derivatives/) — MIT 18.01SC university lecture clip
- [3Blue1Brown — Chain Rule and Product Rule, YouTube](https://www.youtube.com/watch?v=YG15m2VwSjA) — high-quality explainer; chain rule applied to exponentials, bridges to softmax/sigmoid gradients
