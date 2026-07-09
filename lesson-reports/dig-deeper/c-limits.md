# c-limits — Limits: Sneaking Up on a Value

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [Limits, L'Hopital's Rule, and Epsilon-Delta Definitions (3Blue1Brown)](https://www.3blue1brown.com/lessons/limits) — Companion written article to the Chapter 7 video; formalizes the epsilon-delta definition visually and introduces L'Hopital's rule. The cleanest bridge from "approaching" language to the rigorous definition that survives into real analysis.
- [Limit of a Function — Wikipedia](https://en.wikipedia.org/wiki/Limit_of_a_function) — Graduate reference covering the epsilon-delta definition, the deleted-neighborhood requirement (0 < |x − p| < delta), one-sided limits, limits at infinity, and the distinction between removable / jump / essential discontinuities. Authoritative canonical text.
- [Indeterminate Forms — Wikipedia](https://en.wikipedia.org/wiki/Indeterminate_form) — Explains why 0/0 is *indeterminate* (not simply undefined): the limit can be any value depending on the specific functions. Lists all seven indeterminate forms (0/0, inf/inf, 0·inf, inf−inf, 0^0, 1^inf, inf^0) and when L'Hopital applies. Directly addresses the most common misconception this lesson risks seeding.
- [MIT 18.01SC Session 4: Limits and Continuity](https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/pages/1.-differentiation/part-a-definition-and-basic-rules/session-4-limits-and-continuity/) — Prof. David Jerison's video clips and notes covering limits, the formal definition, and how limits define continuity (f is continuous at a iff lim_{x→a} f(x) = f(a)). MIT 18.01SC authority; closes the continuity payoff this lesson omits.

### Watch
- [Limits, L'Hopital's Rule, and Epsilon Delta Definitions | Chapter 7, Essence of Calculus (3Blue1Brown)](https://www.youtube.com/watch?v=kfF40MiS7zA) (3Blue1Brown, ~18 min) — Animates the epsilon-delta definition as a tolerance game: for any output band epsilon, find an input window delta. Makes "approaches without arriving" precise with visual guarantees. The single best video for upgrading from intuition to the rigorous definition, and it handles L'Hopital as a bonus.
- [The Essence of Calculus, Chapter 1 (3Blue1Brown)](https://www.youtube.com/watch?v=WUvTyaaNkzM) (3Blue1Brown, ~17 min) — Series introduction; motivates why limits are the foundation of all calculus and previews what the rest of the series builds. Sets context before diving into derivatives and integrals.

## Science & depth recommendations (to reach master's level)

- **0/0 labeled "undefined" seeds the dominant misconception** → the lesson currently calls 0/0 "undefined" in the learn text but the updated version already patches this to "indeterminate form." Verify it distinguishes 0/0 (could be anything; do more work) from 1/0 (diverges unambiguously). Ground in the Wikipedia Indeterminate Forms article.
- **Deleted neighborhood (0 < |x − p|) never stated in prose** → the lab operationalizes it perfectly with the "x ≠ 1" mission, but the principle is never named. Add one sentence: "The limit looks at x *near* p but never *at* p — formally, 0 < |x − p| < delta (the point p itself is excluded). That is why a hole at p is harmless." Ground in Wikipedia Limit of a Function.
- **Continuity defined via limits is absent** → f is continuous at a iff lim_{x→a} f(x) = f(a). Adding this one-line payoff connects limits to the property gradient descent relies on (no sudden cliffs in the loss). Ground in MIT 18.01SC Session 4.
- **Vanishing gradients analogy needs a label** → the ml note links vanishing gradients to the limit concept, but vanishing gradients are a product-of-factors (sequence limit as depth → inf), not a removable-discontinuity limit. Reframe as: "Two flavors of limit appear in ML: derivatives as h → 0, and vanishing gradients as a product of many small factors when depth → infinity." Ground in Wikipedia Vanishing Gradient Problem.

## Sources
- [3Blue1Brown — Limits Chapter 7, YouTube](https://www.youtube.com/watch?v=kfF40MiS7zA) — high-quality explainer, Essence of Calculus series
- [3Blue1Brown — Limits, lesson page](https://www.3blue1brown.com/lessons/limits) — companion written article
- [Wikipedia: Limit of a Function](https://en.wikipedia.org/wiki/Limit_of_a_function) — canonical reference; epsilon-delta, one-sided, infinite limits, deleted neighborhood
- [Wikipedia: Indeterminate Form](https://en.wikipedia.org/wiki/Indeterminate_form) — canonical reference; seven indeterminate forms, L'Hopital applicability
- [MIT 18.01SC Session 4: Limits and Continuity](https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/pages/1.-differentiation/part-a-definition-and-basic-rules/session-4-limits-and-continuity/) — MIT 18.01SC, university lecture with video clips
- [3Blue1Brown — Essence of Calculus Chapter 1, YouTube](https://www.youtube.com/watch?v=WUvTyaaNkzM) — high-quality explainer, series overview
