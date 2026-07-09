# c-rules — The Power Rule (Slopes for Free)

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [Power Rule — Wikipedia](https://en.wikipedia.org/wiki/Power_rule) — Canonical reference covering the statement, domain (natural/integer/rational/real exponents, domain caveats for irrational powers requiring x > 0), multiple proofs (binomial theorem, limit factorization, logarithmic differentiation), and the 0^0 edge case. The authoritative single-page reference.
- [Proof of Various Derivative Properties — Paul's Online Math Notes](https://tutorial.math.lamar.edu/classes/calci/DerivativeProofs.aspx) — Three rigorous proofs of the power rule: (1) binomial theorem expansion, (2) factorization of x^n − a^n, (3) logarithmic differentiation. Also proves sum/difference rule and constant-multiple rule from the limit definition. The best single reference for the binomial theorem proof that shows *why* the exponent becomes the coefficient.
- [MIT 18.01SC — Part A: Definition and Basic Rules](https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/pages/1.-differentiation/part-a-definition-and-basic-rules/) — MIT 18.01SC's full differentiation unit: Sessions 1–11 cover the limit definition, power rule derivation, sum/constant-multiple rules, and chain rule. Lecture clips + recitation videos by Prof. David Jerison. University-level treatment with worked examples and problem sets.

### Watch
- [Derivative Formulas Through Geometry | Chapter 3, Essence of Calculus (3Blue1Brown)](https://www.youtube.com/watch?v=S0_qX4VJhMQ) (3Blue1Brown, ~18 min) — Derives the power rule geometrically: nudging the side of a square or cube by dx produces 2x·dx or 3x²·dx strips (the (dx)² corner is negligible). Makes the binomial-theorem argument visual and shows why the exponent becomes the coefficient. Also covers 1/x and extends to fractional exponents geometrically. The canonical visual proof.

## Science & depth recommendations (to reach master's level)

- **No derivation is provided** → the single most valuable upgrade for a master's-bound learner. The binomial nudge argument (a square of side x grows by 2x·dx strips plus a (dx)² corner that vanishes) is exactly what 3Blue1Brown Ch. 3 and Paul's Notes Proof 1 show. Add a short paragraph: "Nudge x by a tiny dx. A square of side x gains two strips of area 2x·dx plus a corner (dx)² that becomes negligible. Divide by dx, let dx → 0: only 2x survives — that's the rule for x²." Grounds the rule as discovered, not memorized.
- **Domain of the power rule is unstated** → for irrational/real exponents, x^r = e^{r ln x} requires x > 0. Negative-integer exponents (x^{−1} → −x^{−2}) and fractional exponents (√x = x^{1/2} → ½x^{−1/2}) are extremely common in ML (attention scaling by 1/√d, layer normalization) and the lesson never covers them. Add examples: "The rule extends to all real exponents: x^{−1} → −x^{−2} (reciprocals), √x = x^{1/2} → ½x^{−1/2} (square roots). For non-integer powers, restrict to x > 0."
- **ReLU subgradient omitted** → the lesson says "ReLU's derivative is 1 (if x > 0) or 0" without noting ReLU is non-differentiable at 0 and frameworks use a subgradient (conventionally 0) there. This is a real fidelity gap: PyTorch explicitly returns 0 for ReLU at x = 0. Add a parenthetical: "At x = 0 ReLU has no classical derivative; autograd uses a subgradient (PyTorch returns 0 there)." Ground in Wikipedia Rectifier article.

## Sources
- [Wikipedia: Power Rule](https://en.wikipedia.org/wiki/Power_rule) — canonical reference; statement, domain, proofs, 0^0 and negative-base caveats
- [Paul's Online Math Notes — Derivative Proofs](https://tutorial.math.lamar.edu/classes/calci/DerivativeProofs.aspx) — canonical text; three proofs of power rule including binomial theorem expansion
- [3Blue1Brown — Derivative Formulas Through Geometry, YouTube](https://www.youtube.com/watch?v=S0_qX4VJhMQ) — high-quality explainer, Essence of Calculus Ch. 3; geometric derivation
- [3Blue1Brown — lesson page](https://www.3blue1brown.com/lessons/derivatives-power-rule/) — companion written article
- [MIT 18.01SC — Part A: Definition and Basic Rules](https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/pages/1.-differentiation/part-a-definition-and-basic-rules/) — MIT 18.01SC university lecture; power rule and differentiation rules unit
