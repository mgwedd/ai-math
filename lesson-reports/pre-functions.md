# pre-functions — Functions: Machines & Graphs

## Current summary (what it teaches + what the lab does)
The lesson introduces a function as a "machine": one number in, exactly one number out, with `f(x) = x² − 2` cast as both recipe and name. It teaches reading a graph (roots, height, steepness as the seed of derivatives, the one-output rule), the vertical-line test, and composition `g(f(x))` framed as "deep = a long chain of composed machines." The `ml` note ties every model to a function and lists ReLU/sigmoid/loss curve/LR schedule as functions-on-a-graph. `deeper` cards cover the vending-machine intuition + vertical-line test, domain & range (with activation-range motivation), and order-dependence of composition.

Three labs (all small canvas interactives in `extra.js`):
- `prefn` — drag a point along x on one of three machines (line / parabola / vee); dashed lines trace input→output. Missions: find a root on the parabola, hit f(x)=3 on the line, inspect all three.
- `prefn_vlt` — sweep a vertical line across four relations (parabola, circle, sideways parabola, line); gold dots mark every output at that x. Missions: get a double crossing on the circle and on the sideways parabola, inspect all four.
- `prefn_compose` — pick machines f and g from {+1, ×2, square, −3} and an x slider; shows g(f(x)) vs f(g(x)) side by side with a "commute / order matters" verdict. Missions: read g(f(2))=5 for f=square,g=+1; find an order-matters pair; find a commuting pair.

## Strengths
- The machine metaphor + "graph is the complete biography" framing is genuinely good and matches how 3Blue1Brown and intro courses motivate functions.
- Three complementary labs hit the three hard ideas (evaluation, single-valuedness, composition) interactively rather than by prose — aligns with the curriculum-depth memory note.
- The composition lab's live g(f(x)) vs f(g(x)) comparison with a commute/no-commute verdict is the right way to make non-commutativity *felt*, and it correctly seeds the chain rule.
- Quiz distractors are well-targeted (the g(f(2)) vs f(g(2)) confusion, root vs y-intercept, height-read-backwards) and WRONG_WHY explanations are specific and corrective.
- The deeper card on domain/range correctly motivates activation ranges (sigmoid → (0,1), ReLU → [0,∞)).

## Inaccuracies / fidelity issues (each: the issue -> the correct statement -> source URL)
1. **Range vs codomain conflated.** The deeper card says "the **range** is every output it can produce." This silently collapses the codomain/range (image) distinction. A function is formally a triple (domain, codomain, rule); the *codomain* is the declared target set and is part of the definition, the *range/image* is the subset actually hit. Example: f(x)=2x over the integers has codomain ℤ but range = even integers. For a master's-bound learner this matters (surjectivity, softmax codomain = the simplex, etc.). -> State both: "domain = legal inputs; codomain = the declared output set (part of the function's identity); range/image = the outputs actually produced (a subset of the codomain)." -> https://en.wikipedia.org/wiki/Function_(mathematics) and https://en.wikipedia.org/wiki/Codomain

2. **Function defined only as "number in, number out."** The whole lesson treats functions as ℝ→ℝ. The `ml` note then says a model maps an image (a *vector*) to "cat: 0.97" — i.e. ℝ^n → ℝ — which the ℝ→ℝ definition doesn't cover. The modern definition is set-to-set: each element of the domain maps to exactly one element of the codomain, for arbitrary sets. -> Add one sentence generalizing: "inputs and outputs need not be single numbers — they can be vectors, images, or whole sequences; the one-output rule is what stays fixed." This also de-risks the jump to multivariable functions later. -> https://en.wikipedia.org/wiki/Function_(mathematics)

3. **Vertical-line test presented as the definition rather than a 2D-graph visualization.** The vending-machine card says "the vertical-line test is just that rule, drawn" — true for ℝ→ℝ Cartesian graphs only. It is a visualization tool, not the definition, and it breaks for vector-valued or parametric inputs. -> Keep it as the picture of single-valuedness *for real-input/real-output graphs*, but name it as such so the learner doesn't over-generalize. -> https://en.wikipedia.org/wiki/Function_(mathematics)

4. **"Deep literally means a deep chain of composed functions" is incomplete.** Composition of *affine-only* maps collapses to a single affine map; "depth" only buys expressive power because of the *nonlinear* activation between layers. As written, the lesson implies stacking = power, which is the exact misconception the universal approximation literature exists to correct. -> Add: depth matters only because each layer interleaves a nonlinearity (ReLU/sigmoid); without it, g(f(x)) of linear maps is just one linear map. -> https://en.wikipedia.org/wiki/Universal_approximation_theorem and https://developers.google.com/machine-learning/crash-course/neural-networks/activation-functions

5. **Total vs partial / domain-restriction is asserted via examples but never named.** The domain card says "√x rejects negatives; 1/x rejects 0" but never says these are *domain restrictions* that make the function total on a restricted domain (vs. partial on all of ℝ). Minor, but the precise vocabulary (total/partial) is worth one clause for this audience. -> https://en.wikipedia.org/wiki/Function_(mathematics)

(No arithmetic errors found: f(3)=7, g(f(2))=9, root/height/composition quiz answers all check out.)

## Conceptual gaps (what a serious learner still needs)
- **Composition is associative but not commutative.** The lab nails "not commutative" but never states associativity — which is *why* we can write g∘f∘h with no parentheses and why a deep net is well-defined as a single pipeline. This pairs naturally with the chain-rule teaser. (Source: https://en.wikipedia.org/wiki/Function_(mathematics) / https://en.wikipedia.org/wiki/Function_composition)
- **Injective / surjective / bijective + inverses.** Not mentioned at all. Even a one-line teaser ("one-to-one functions can be undone — that's what an inverse is; sigmoid is invertible, ReLU is not") connects to logit/inverse-link and to invertible-network ideas later.
- **Why nonlinearity is the whole game.** The single most load-bearing idea for the ML transition: a composition of linear maps is linear. The lesson should plant this seed explicitly (see inaccuracy #4).
- **Piecewise-defined functions / kinks.** The "vee" |x|−1 already *is* piecewise-linear with a kink — ReLU's shape exactly — but the lesson never names the connection. A pointer ("ReLU is exactly half of this vee — flat then linear") is a high-leverage, near-free link to World 1's ml-mlp lesson.
- **Notation literacy:** f: X → Y, the ∘ symbol for composition, and the difference between f (the machine) and f(x) (an output value). The lesson gestures at "f is a name" but never shows the arrow notation a master's program assumes on day one.

## Lab ideas (concrete: name the interactive, what the learner manipulates, what it reveals)
1. **Upgrade `prefn_compose` into a 3-stage pipeline ("Depth = composition").** Add a third machine slot h and let one of the machine choices be a *nonlinear* one (square or a toy ReLU `max(0,x)`). Show the *composed graph* g(f(h(x))) plotted as a curve alongside the per-stage values. Reveal: stacking only **+1/×2/−3** (affine) gives a straight line no matter how many you stack; the instant you insert `square` or `ReLU` the composite curve bends. This makes "depth needs nonlinearity" visceral and directly motivates activations. (Grounds: universal-approximation / activation-function sources.)
2. **`prefn_inverse` — undo a machine.** Pick a machine, drag x; a second "inverse" track tries to recover x from f(x). For `square` it visibly fails (two preimages light up) — showing non-injective ⇒ no inverse. Reveal: the vertical-line test's mirror image (horizontal-line test) and the meaning of one-to-one. Cheap reuse of the existing `prefn` canvas.
3. **`prefn_domain` — drag the input bar past the cliff.** On √x and 1/x, dragging x into the illegal region turns the point red and the readout says "undefined — outside the domain." Reveal: domain as a real constraint, not a footnote; sets up activation-range intuition.
4. **Codomain-vs-range overlay in `prefn`.** Add a shaded band on the y-axis showing the *range actually reached* as the learner sweeps x. Reveal concretely that sigmoid only ever lands in (0,1) — the range is a strict subset of all reals (the codomain).

## Content improvements (specific learn/ml/deeper text upgrades)
- In `learn`, after "returns exactly one number f(x)," add a generalizing clause: "(Inputs and outputs needn't be single numbers — later they're vectors, images, even sentences. What never changes: one input, one output.)"
- Add formal notation once: "We write `f: X → Y` — domain X, codomain Y. `f` is the machine; `f(x)` is the number it spits out." Distinguishing f from f(x) prevents a persistent confusion.
- Fix the domain/range deeper card to separate **codomain** (declared target, part of the definition) from **range/image** (subset actually produced), with the f(x)=2x over ℤ example.
- In the composition card and `ml` note, insert the nonlinearity caveat: "Stacking affine machines collapses to one affine machine — depth only adds power because a nonlinear activation sits between layers. That's the whole reason ReLU/sigmoid exist."
- Name associativity in the composition card: "Composition is associative (g∘f∘h needs no parentheses) but not commutative (order matters) — exactly the two facts that make a deep pipeline both well-defined and order-sensitive."
- Connect the existing "vee" to ReLU explicitly: "That kinked V is one step from ReLU — flat for negatives, linear for positives; you'll stack thousands of them in World 1."

## Quiz improvements (specific misconceptions to target; keep questions self-contained — never require recalling lab-graph data)
- Add a **codomain vs range** item: "f(x)=x² for all real x. Which is true?" → "Its outputs are never negative (range = [0,∞)), even though we may declare its codomain to be all of ℝ." Targets the conflation in inaccuracy #1. Self-contained.
- Add a **nonlinearity/composition-collapses** item: "You stack three machines that each compute `2x+1`. The overall machine is…" → "still just a single straight-line (affine) machine — no amount of stacking linear pieces creates a bend." Targets the depth misconception (#4). Fully self-contained (formulas given inline).
- Add an **inverse / one-to-one** item: "Which machine cannot be reliably 'undone' (has no inverse)?" opts: `f(x)=x²` (correct — two inputs share an output), `f(x)=2x+1`, `f(x)=x−3`, `f(x)=x/5`. Targets injectivity. Self-contained.
- Tighten the existing "Which is NOT a function" item: keep it, but ensure the stem gives the relation as an equation (it does: `x²+y²=1`) so it never relies on a lab graph — good as-is.
- Optionally add an **associativity** discriminator: "g∘f∘h is unambiguous because composition is ___." → "associative" (distractor: "commutative"). Reinforces the corrected content.

## Sources (the real URLs you consulted)
- https://en.wikipedia.org/wiki/Function_(mathematics)
- https://en.wikipedia.org/wiki/Codomain
- https://en.wikipedia.org/wiki/Range_of_a_function
- https://en.wikipedia.org/wiki/Function_composition
- https://en.wikipedia.org/wiki/Universal_approximation_theorem
- https://developers.google.com/machine-learning/crash-course/neural-networks/activation-functions
- https://www.mathsisfun.com/sets/domain-range-codomain.html
- https://math.libretexts.org/Bookshelves/Calculus/The_Calculus_of_Functions_of_Several_Variables_(Sloughter)/01:_Geometry_of_R/1.05:_Linear_and_Affine_Functions
