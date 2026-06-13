# pre-sigma — Sigma Notation & Reading Formulas

## Current summary (what it teaches + what the lab does)
The lesson frames Σ as the single biggest notation hurdle for engineers reading ML papers, and decodes it as "add up a list." It reads the symbol in three parts (index start, top limit, term expression), draws the analogy to a `for` loop, and gives three worked ML instances: mean `x̄ = (1/n) Σ xᵢ`, dot product `a·b = Σ aᵢbᵢ`, and squared-error loss `(1/n) Σ (errorᵢ)²`. The `ml` note generalizes: nearly every loss/metric/expectation is a Σ (MSE, cross-entropy, `E[X] = Σ p(x)·x`), introduces Π as the multiply-cousin, and previews the log-likelihood trick (log turns Π into Σ). The `deeper` cards cover (1) the for-loop framing, (2) the dummy index + double sums as nested loops, and (3) Π and the log trick against underflow.

Two labs, both wired in `extra.js`:
- **`sigma`** (`INTERACTIVES.sigma`, line 963): pick an expression (Σ i, Σ i², Σ aᵢ over data `[3,1,4,1,5,9,2,6]`), slide the upper limit n (1–8); terms light up and accumulate to a running total. Missions: make Σ i = 15, set Σ i² with n=3, include all 8 data terms.
- **`sigmamean`** (`INTERACTIVES.sigmamean`, line 1006): a 1-D number line with three draggable points and a gold fulcrum at the mean. Missions: balance mean at 0, push mean > 1, drag a point past x>4 and watch the fulcrum chase it (outlier sensitivity).

## Strengths
- The "Σ is a for-loop" framing is genuinely the best on-ramp for a coding audience and is reinforced with real pseudocode.
- The dummy-index point and "double sum = nested loop" framing are exactly the right next concepts and are rarely taught explicitly.
- The log-likelihood / underflow card is a real, load-bearing ML fact (not filler) and the quiz question on it is excellent — it targets the genuine misconception that logs are an *approximation* or a *speedup*.
- The mean-as-fulcrum lab is physically correct and the outlier mission builds real intuition.
- Quiz answer 1 (`Σ_{i=1}^4 i = 10`) with the "stops AT 4, no +5" gloss directly attacks the most common off-by-one error.

## Inaccuracies / fidelity issues (each: the issue -> the correct statement -> source URL)
- **The lower limit is hard-coded to 1 everywhere; the lesson never says it can be anything.** The learn text says "the index i starts at the bottom value" but every example uses i=1, and the `sigma` lab fixes the start at 1. A master's-bound learner will immediately meet `Σ_{i=0}^{n}` (zero-indexed, polynomials, DFT), `Σ_{k}` (sum over a whole set), and `Σ_{x∈X}` (sum over a set, as in the lesson's own `E[X]=Σ p(x)·x`). Correct statement: the lower bound is an arbitrary starting value m (or even an index-set membership condition), not always 1. -> https://en.wikipedia.org/wiki/Summation
- **Empty-sum convention is missing.** By definition `Σ_{i=a}^{b} = 0` when b < a (the empty sum is 0; the empty product is 1). This is not pedantry — it's why edge cases in code/recurrences are clean, and it's the dual fact to "empty product = 1" used in the Π card. -> https://en.wikipedia.org/wiki/Summation
- **`E[X] = Σ p(x)·x` is stated without naming what the sum ranges over.** The index here is *not* "1 to n over a list" — it's a sum over the support (set of values x). Presenting it next to list-style Σ without flagging the change of index style can reinforce the misconception that Σ is always `1..n`. Correct: `E[X] = Σ_{x∈𝒳} x·P(X=x)`, a sum over the value set. -> https://web.stanford.edu/class/archive/cs/cs109/cs109.1218/files/student_drive/3.2.pdf
- **The "term is a constant" misconception is not addressed.** A documented top-3 error is treating the summand as constant, e.g. `Σ_{i=2}^{4}(3+i)` read as `3+3+3` instead of `5+6+7`. The lesson's terms always depend trivially on i (i, i², or a lookup), so this trap is never surfaced. -> https://brightchamps.com/en-us/math/algebra/sigma-notation
- **Minor: cross-entropy called "a sum of logs" is loose.** Cross-entropy is `−Σ p(x) log q(x)` — a sum of `p·log q` products, weighted by the target distribution; the negative sign and the weighting are the whole point. "Sum of logs" undersells it and blurs it with log-likelihood. -> https://en.wikipedia.org/wiki/Cross-entropy

## Conceptual gaps (what a serious learner still needs)
- **Variable lower bound and sum-over-a-set notation.** `Σ_{i=0}`, `Σ_{k=1}^{m}`, `Σ_{x∈X}`, `Σ_{i≠j}` — the four notational forms they'll actually meet. The current lesson only shows `1..n`.
- **Linearity / pulling constants out.** `Σ c·aᵢ = c·Σ aᵢ` and `Σ(aᵢ+bᵢ) = Σaᵢ + Σbᵢ`. This is the single most-used Σ algebra in ML derivations (it's why the `1/n` floats outside the mean, why gradients of a summed loss are a sum of gradients, and underlies linearity of expectation `E[Σ aᵢXᵢ] = Σ aᵢ E[Xᵢ]` — which holds *even without independence*). -> https://www.cse.iitd.ac.in/~mohanty/col106/Resources/linearity_expectation.pdf
- **Double sums and index ordering.** The deeper card mentions nested loops but never shows that `ΣᵢΣⱼ aᵢⱼ = ΣⱼΣᵢ aᵢⱼ` (Fubini for finite sums) and that this is literally matrix multiply / a quadratic form `xᵀAx = Σᵢ Σⱼ xᵢ Aᵢⱼ xⱼ`. A worked 2×2 double-sum-to-matrix-multiply would pay off in World 1.
- **Index shifting / reindexing.** `Σ_{n=s}^{t} f(n) = Σ_{n=s+p}^{t+p} f(n−p)`. Shows up constantly in series manipulation and is the kind of "rename the loop variable" move that trips people. -> https://en.wikipedia.org/wiki/Summation
- **Σ vs ∫ as the same idea.** The mean (Σ) and the expectation of a continuous variable (∫) are the discrete/continuous twins; flagging this now primes the calculus worlds.
- **The mean is the minimizer of squared error.** The fulcrum lab shows balance; the deeper fact is `x̄ = argmin_c Σ(xᵢ−c)²`. That's the bridge from "mean" to "least squares / MSE loss," i.e., why MSE's optimum is the average. Currently implicit.
- **The log trick's general form (log-sum-exp).** The card stops at `ln Π = Σ ln`. The very next thing they hit is computing a *log of a sum* of exponentials (softmax denominator, cross-entropy, marginal likelihood), which needs the max-subtraction LSE trick `a + log Σ e^{xᵢ−a}`. Worth at least a forward-pointer. -> https://leimao.github.io/blog/LogSumExp/

## Lab ideas (concrete: name the interactive, what the learner manipulates, what it reveals)
- **`sigmadecode` — "Read the limits."** Upgrade `sigma` to expose the *lower* bound too. Give two sliders (start m, stop n) plus the expression chips, and add a chip `Σ(c+i)` whose term depends on i non-trivially. Reveals: changing m re-indexes the sum; the empty-sum case (set m > n) shows total = 0 with a "this is the empty sum" badge. Directly fixes the "always starts at 1" and "term is constant" gaps.
- **`sigmalinearity` — "Pull the constant out."** Two stacked sums side by side: left shows `Σ c·aᵢ`, right shows `c·Σ aᵢ`, with a slider for c and editable aᵢ. They watch both totals stay identical as c changes, then a second toggle proves `Σ(aᵢ+bᵢ)=Σaᵢ+Σbᵢ`. Reveals linearity viscerally — the workhorse identity for every loss-gradient derivation.
- **`meanminimizer` — upgrade `sigmamean`.** Add a draggable guess marker c and live-plot `SSE(c)=Σ(xᵢ−c)²` as a parabola underneath. As they drag c, the parabola's height updates; the minimum sits exactly at the fulcrum. Mission: "drag c to minimize total squared error — where does it land?" Reveals mean = argmin of squared error, the MSE-loss connection.
- **`doublesum` — "Two loops = one matrix."** A 3×3 grid of cells aᵢⱼ; two index pointers i (row) and j (col) sweep in nested order, accumulating `ΣᵢΣⱼ aᵢⱼ`. Toggle the loop order (i-outer vs j-outer) and show the total is unchanged (Fubini), then highlight that summing `xᵢ·Aᵢⱼ·xⱼ` is the quadratic form. Bridges to World 1.

## Content improvements (specific learn/ml/deeper text upgrades)
- In `learn`, after the three-part read, add one line on the **lower bound**: "The bottom needn't be 1 — `Σ_{i=0}` starts at zero, and `Σ_{x∈X}` sums over every item in a set (you'll see this in the expectation below)."
- Add a short **linearity** beat to `learn` or a new deeper card: "Two moves unlock every derivation: pull constants out (`Σ c·aᵢ = c Σ aᵢ`) and split sums of sums (`Σ(aᵢ+bᵢ)=Σaᵢ+Σbᵢ`). That `1/n` in the mean is just a constant pulled outside the Σ."
- In `ml`, tighten cross-entropy: "cross-entropy `−Σ p(x) log q(x)` (a *weighted* sum of log-probabilities, not just a sum of logs)" and add that linearity of expectation `E[Σ aᵢXᵢ] = Σ aᵢE[Xᵢ]` holds even when the variables are correlated — a fact that surprises most engineers. -> https://www.cse.iitd.ac.in/~mohanty/col106/Resources/linearity_expectation.pdf
- Extend the **log-trick** card with the forward-pointer: "When you instead need the log of a *sum* of exponentials (softmax denominator, cross-entropy), the same spirit gives the log-sum-exp trick: factor out the max, `a + log Σ e^{xᵢ−a}`, to avoid overflow." -> https://leimao.github.io/blog/LogSumExp/
- Add the **empty-sum** fact to the dummy-index card: "Edge case: if the top limit is below the bottom, the sum is 0 by convention (an empty sum) — the dual of the empty product being 1, which keeps recurrences and code clean."
- Promote the **mean = argmin SSE** fact into the mean lab intro or a deeper card so the fulcrum has a loss-function meaning.

## Quiz improvements (specific misconceptions to target; keep questions self-contained — never require recalling lab-graph data)
- **Add a "term depends on i" item** to kill the constant-summand error: "What does `Σ_{i=1}^{3} (i + 2)` equal?" options `3+4+5=12` (correct), `2+2+2=6` (treats term as constant), `1+2+3=6`, `9`. WRONG_WHY: option for 6 → "You must substitute each i into the whole term: (1+2)+(2+2)+(3+2)." This is fully self-contained.
- **Add a lower-bound item**: "`Σ_{i=0}^{3} 1` equals…" options `4` (correct — four terms: i=0,1,2,3), `3`, `0`, `1`. Targets the "always starts at 1 / count the terms" gap, self-contained.
- **Add a linearity item**: "`Σ_{i=1}^{n} 3·xᵢ` is the same as…" options `3·Σxᵢ` (correct), `Σxᵢ + 3`, `(Σxᵢ)³`, `3 + Σxᵢ`. Targets pulling constants out, self-contained.
- **Optionally add an empty-sum item**: "`Σ_{i=5}^{3} aᵢ` equals…" → `0` (empty sum), with distractors. Self-contained and reinforces a fact code-heavy learners appreciate.
- Keep the existing five — they're strong. The log-probability question is a model of a good conceptual quiz item.

## Sources (the real URLs you consulted)
- Wikipedia, *Summation* (formal recursive definition, dummy index, empty sum, double sums, distributivity/index-shift/splitting identities): https://en.wikipedia.org/wiki/Summation
- BrightCHAMPS, *Sigma Notation – Definition, Formula & Examples* (documented common misconceptions: bound confusion, treating summand as constant, wrong formula): https://brightchamps.com/en-us/math/algebra/sigma-notation
- Stanford CS109, *Discrete Random Variables 3.2: More on Expectation* (`E[X]=Σ_{x∈𝒳} x P(X=x)` as a sum over the support): https://web.stanford.edu/class/archive/cs/cs109/cs109.1218/files/student_drive/3.2.pdf
- IIT-Delhi COL106, *Linearity of Expectation* (`E[Σ aᵢXᵢ]=Σ aᵢE[Xᵢ]`, holds without independence): https://www.cse.iitd.ac.in/~mohanty/col106/Resources/linearity_expectation.pdf
- Lei Mao, *LogSumExp and Its Numerical Stability* (`a + log Σ e^{xᵢ−a}`, the general log-of-a-sum trick beyond `ln Π = Σ ln`): https://leimao.github.io/blog/LogSumExp/
- Wikipedia, *Cross-entropy* (`−Σ p(x) log q(x)` definition): https://en.wikipedia.org/wiki/Cross-entropy
