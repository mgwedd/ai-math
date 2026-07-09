# c-optim — Optimization: Hunting Flat Spots

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [Critical Points — Paul's Online Math Notes](https://tutorial.math.lamar.edu/classes/calcI/CriticalPoints.aspx) — Formal definition: a critical point occurs where f'(c) = 0 or f'(c) is undefined. Seven worked examples across polynomial, trigonometric, and exponential functions, with domain validity explicitly checked. The clearest reference for the mechanics of finding critical points and why kinks (undefined derivative) are candidates too.
- [Identifying and Attacking the Saddle Point Problem in High-Dimensional Non-Convex Optimization — Dauphin et al. 2014](https://arxiv.org/abs/1406.2572) — NeurIPS 2014 paper establishing that in high-dimensional loss landscapes, critical points are almost all saddle points (not local minima), and that local minima cluster near the global loss value. The primary citation for the corrected ML claim: "the real obstacle is saddle points, not bad local minima."
- [Deep Learning Book Chapter 8: Optimization for Training Deep Models — Goodfellow, Bengio, Courville](https://www.deeplearningbook.org/contents/optimization.html) — Graduate textbook chapter covering critical points, saddle points, ill-conditioning, SGD, momentum, and adaptive methods. Dedicated section "How Learning Differs from Pure Optimization." The authoritative pedagogical treatment connecting 1-D calculus to the full ML optimization story.

### Watch
- [Essence of Calculus — Full Playlist (3Blue1Brown)](https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr) (3Blue1Brown) — The 12-chapter series provides the visual derivative foundation (chapters 2–3) and the area/FTC connection (chapters 8–9) that frames optimization geometrically. Note: there is no dedicated Essence of Calculus video on finding extrema or critical points; the playlist is the best 3B1B foundation for the surrounding calculus.
- [MIT 18.01SC Session 29: Optimization Problems](https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/pages/unit-2-applications-of-differentiation/part-b-optimization-related-rates-and-newtons-method/session-29-optimization-problems/) (MIT OCW, video clips) — Prof. David Jerison's lecture on finding extrema via derivative analysis: graphical approach, critical points, boundary candidates, and worked optimization examples. The rigorous university treatment of everything this lesson teaches.

## Science & depth recommendations (to reach master's level)

- **"Saddle point" used in quiz without definition** → the learn text never defines saddle points, but they appear as a quiz distractor. Clarify the 1-D vs. multi-D distinction: in 1-D, a flat spot that is neither min nor max is a *horizontal inflection* (like x³ at 0); its higher-dimensional cousin — downhill in some directions, uphill in others — is a *saddle point*. The lesson can't show a true saddle with one variable. Ground in Wikipedia Saddle Point article and the Dauphin 2014 paper.
- **"Loss landscapes are full of local minima" overstates a contested claim** → the modern, well-grounded view (Dauphin 2014, DL Book Ch. 8) is that the dominant obstacle is *saddle points*, not bad local minima. Most local minima of large networks have loss near the global best. Update the ml note: "In high dimensions the real obstacle is saddle points — almost every critical point of a large network is a saddle, and most local minima sit near the global loss." Ground in Dauphin 2014.
- **Necessary vs. sufficient is never stated** → f'(c) = 0 is *necessary* for an interior extremum, not *sufficient* (x³ at 0 is flat but neither min nor max). This single logical point is the most important thing to add: "A flat spot is a *candidate* — you must check the slope's sign on both sides. f' = 0 is necessary, not sufficient." Ground in Paul's Notes and Wikipedia Second Derivative Test.

## Sources
- [Paul's Online Math Notes — Critical Points](https://tutorial.math.lamar.edu/classes/calcI/CriticalPoints.aspx) — canonical text; formal definition, seven worked examples
- [Dauphin et al. 2014 — Saddle Point Problem (arXiv)](https://arxiv.org/abs/1406.2572) — peer-reviewed (NeurIPS 2014); saddles dominate, not local minima
- [Deep Learning Book Ch. 8 — Optimization](https://www.deeplearningbook.org/contents/optimization.html) — canonical textbook; critical points, saddles, SGD, adaptive methods
- [MIT 18.01SC Session 29: Optimization Problems](https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/pages/unit-2-applications-of-differentiation/part-b-optimization-related-rates-and-newtons-method/session-29-optimization-problems/) — MIT 18.01SC university lecture; optimization problems with video clips
- [3Blue1Brown — Essence of Calculus Playlist](https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr) — high-quality explainer series; derivative foundation for optimization
- [Wikipedia: Second Derivative Test](https://en.wikipedia.org/wiki/Second_derivative_test) — canonical reference; first/second-derivative tests, f''=0 inconclusive case, saddle classification
