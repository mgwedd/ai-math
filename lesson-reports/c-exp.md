# c-exp — e and Exponentials

## Current summary (what it teaches + what the lab does)
The lesson teaches that exponentials `aˣ` grow multiplicatively and that their derivative is **proportional to the function itself**, with the proportionality constant `ln a`: `d/dx aˣ = aˣ·ln a`. It identifies **e ≈ 2.718** as the unique base where that constant is exactly 1, so `d/dx eˣ = eˣ`. It introduces `ln` as the inverse that turns products into sums (`ln(ab) = ln a + ln b`) and motivates this with log-likelihood summation in ML. The `ml` note connects eˣ to softmax, sigmoid `1/(1+e⁻ˣ)`, and cross-entropy, and asserts that softmax+cross-entropy backprops to `(prediction − truth)`. Two `deeper` cards cover the compound-interest origin of e (yearly $2, monthly $2.61, daily $2.71, continuous $e) and the "ln as area under 1/t" definition plus log-space underflow avoidance.

The single lab (`INTERACTIVES.cexp`) plots `f(x) = aˣ` (purple) and its derivative `aˣ·ln a` (cyan) on a shared plane with one slider for the base `a ∈ [1.2, 4]`. The readout shows `f′/f = ln(a)` and flashes "✨ THIS IS e!" when `|ln a − 1| < 0.02`. Three missions: (1) slide until derivative lies on top of the function (discover e), (2) set a=2 to read `ln 2 ≈ 0.693`, (3) push the growth ratio `ln a` above 1.3.

## Strengths
- The **discover-e-by-sliding** mechanic is genuinely the right pedagogy: it operationalizes 3Blue1Brown's defining property ("slope = height at every point") as something the learner physically tunes until the two curves coincide. This is the best possible hook for the self-derivative idea.
- The `f′/f = ln(a)` readout is excellent — it makes the proportionality constant a *visible, manipulable number*, which is exactly the quantity 3Blue1Brown spends the video building toward.
- All numerical claims check out: monthly `(1+1/12)¹² ≈ 2.613`, daily `(1+1/365)³⁶⁵ ≈ 2.7146`, continuous `= e` — verified against Wikipedia.
- The product-to-sum log identity is correctly tied to its real ML payoff (summing log-probabilities), not taught in a vacuum.
- The softmax "amplifies differences into ratios" quiz framing (`e^gap`) is a sophisticated and correct intuition.

## Inaccuracies / fidelity issues (each: the issue -> the correct statement -> source URL)
- **"d/dx eˣ = eˣ … makes all their gradients beautifully simple — softmax + cross-entropy backprops to just (prediction − truth)."** The result `∂L/∂zᵢ = pᵢ − yᵢ` is correct, but the *reason* stated is misleading. The clean gradient comes from the **log-sum-exp structure of cross-entropy combined with softmax**, not merely from eˣ being its own derivative. Specifically `L = −log p_correct = logsumexp(z) − z_correct`, and `∂ logsumexp(z)/∂zᵢ = softmaxᵢ(z) = pᵢ`. The self-derivative of eˣ is one ingredient, but attributing the entire cancellation to it is an oversimplification. -> State it as: cross-entropy is `logsumexp(z) − z_y`, whose gradient is `softmax(z) − onehot(y) = p − y`. URL: https://academic.oup.com/imajna/article/41/4/2311/5893596
- **The lab is silent on x < 0 behavior and the y-axis crossing.** The single most defining visual fact — that *every* `aˣ` passes through (0,1), and that at x=0 the cyan curve's height equals `ln a` while the purple curve's height equals 1 — is never highlighted. 3Blue1Brown's entire definition is "e is the base passing through (0,1) with slope 1." The lab should mark the point (0,1) and the tangent slope there. -> Add a tangent-line / slope-at-x=0 indicator. URL: https://www.3blue1brown.com/lessons/eulers-number/
- **"Below e the derivative runs under the function; above e it overtakes."** True for the *full curve* only where the function is positive (always), since the sign of `aˣ(ln a − 1)` is governed by `ln a − 1`. This is fine, but the note risks implying the curves cross at a point; they never cross — one is a uniform vertical scaling of the other by `ln a`. -> Clarify: the cyan curve is the purple curve *scaled vertically by ln a*; at a=e the scale factor is 1 so they coincide everywhere. (Minor wording, not a hard error.)
- **`ml` note: "eˣ per logit, normalized".** Numerically correct but omits that practical softmax subtracts `max(z)` first (`e^{zᵢ−max z}`) for numerical stability — a fidelity gap for an ML master's audience who *will* hit overflow. -> Mention the max-subtraction shift. URL: https://academic.oup.com/imajna/article/41/4/2311/5893596

No outright factual *errors* in the math statements themselves — `d/dx aˣ = aˣ ln a`, the value of e, and the log identity are all correct.

## Conceptual gaps (what a serious learner still needs)
- **Where ln a comes from in the limit.** The derivative formula appears as a fact. The learner never sees `ln a = lim_{h→0}(aʰ−1)/h` — the bracketed limit 3Blue1Brown derives. This is the bridge between "growth proportional to size" and the *specific* constant ln a.
- **The defining ODE.** `f′ = f, f(0)=1 ⇒ f = eˣ` is the cleanest characterization and the one that recurs everywhere in ML (residual streams, Neural ODEs, exponential moving averages, learning-rate decay). The lesson states f′=f but never frames it as the unique-solution-to-an-ODE that *defines* eˣ.
- **e^{ct} as "proportional growth rate c".** 3Blue1Brown's key payoff: rewrite any `aˣ = e^{(ln a)x}`, so the exponent's coefficient *is* the continuous growth rate. This unifies decay (c<0), half-life, and learning-rate schedules. Currently absent.
- **Sigmoid ↔ softmax-of-2 ↔ log-odds.** The `ml` note lists sigmoid and softmax side by side but never states that `σ(z) = softmax([z,0])` and that the logit `z = ln(p/(1−p))` is the **log-odds**. This is foundational for logistic regression and the whole "logits" vocabulary. URL: https://chrisyeh96.github.io/2018/06/11/logistic-regression.html
- **Temperature.** Softmax with temperature `softmax(z/T)` interpolates between argmax (T→0) and uniform (T→∞). A master's-bound learner meets this in sampling/distillation/attention; it is the natural extension of "eˣ amplifies gaps." URL: https://www.emergentmind.com/topics/log-sum-exp-objective
- **e is irrational and transcendental** (Lindemann–Weierstrass) and `e = Σ 1/n!` — at least a one-line nod for the curious; the series view also explains the lab's "discover by tuning" from a different angle. URL: https://en.wikipedia.org/wiki/E_(mathematical_constant)

## Lab ideas (concrete: name the interactive, what the learner manipulates, what it reveals)
1. **Tangent-at-a-point overlay (upgrade to existing `cexp`).** Add a draggable point on the purple `aˣ` curve. Draw the tangent line there and live-display its slope and the function height, plus their ratio (= ln a, constant across all x). Reveals: slope/height ratio is the *same everywhere* and equals exactly 1 only at a=e. This directly teaches the 3B1B definition and fixes the "passes through (0,1) with slope 1" gap. Mark (0,1) explicitly.
2. **"Compound-interest → e" stepper.** Slider for compounding count n ∈ {1,2,4,12,365,…,∞}; show `(1+1/n)ⁿ` climbing toward a dashed line at e=2.718. Mission: "make it exceed 2.71" then "drag n to ∞." Reveals e as a limit, grounding the deeper-card prose in a manipulable visual.
3. **Softmax-temperature sandbox.** Three or four fixed logits as bars; slider for temperature T. Show `e^{zᵢ/T}` and the normalized probabilities. Missions: "cool to T→0 to get one-hot (argmax)", "heat to T→∞ to get uniform", "find T where the gap of +2 logits becomes a ×7.4 probability ratio." Reveals the softmax quiz claim viscerally and previews temperature/attention.
4. **Sigmoid-as-softmax-of-two.** Slider for a single logit z; plot `σ(z)` and simultaneously `softmax([z,0])` and show they are identical, with readout `z = ln(p/(1−p))` (log-odds). Reveals the sigmoid↔softmax↔log-odds triangle.

## Content improvements (specific learn/ml/deeper text upgrades)
- In `learn`, add one sentence deriving the constant: "Why `ln a`? Because `d/dx aˣ = aˣ · lim_{h→0}(aʰ−1)/h`, and that limit *is* `ln a` — the only number e makes it equal 1." This closes the biggest conceptual gap with one line.
- Add the ODE characterization: "Equivalently, eˣ is the **only** function equal to its own derivative with `f(0)=1` (`f′=f`). That single equation reappears as exponential decay, EMAs, and learning-rate schedules throughout ML."
- Add the `e^{ct}` reframing: "Rewrite any base via `aˣ = e^{(ln a)x}`; the coefficient on x in the exponent is literally the continuous growth rate — positive for growth, negative for decay/half-life."
- In `ml`, correct the gradient attribution to: "cross-entropy of a softmax is `logsumexp(z) − z_y`, and its gradient is exactly `softmax(z) − onehot(y) = p − y`." Also add: "In practice softmax subtracts `max(z)` first (`e^{zᵢ−max z}`) so the exponentials never overflow — same probabilities, safe arithmetic."
- Add a `deeper` card on **sigmoid = softmax of two**: `σ(z) = e^z/(e^z+e^0) = softmax([z,0])₀`, and the logit `z = ln(p/(1−p))` is the log-odds — the bedrock of logistic regression.
- Optional `deeper` nod: "e is irrational and transcendental (Lindemann–Weierstrass), and equals `Σ 1/n!` — the same number reachable as a limit, a series, or the base your lab just tuned to."

## Quiz improvements (specific misconceptions to target; keep questions self-contained — never require recalling lab-graph data)
- **Replace/repair the lab-data dependency.** Q3's `why` says "matching your lab readout at a = 2" and Q1/Q4 reference "found in your lab" / "your lab readout." These violate the self-contained rule. Strip lab references; the questions themselves are fine, just make the explanations stand alone (e.g. "2ˣ·ln 2 ≈ 0.693·2ˣ" without invoking the lab).
- **Add: power-rule-vs-exponential confusion (the #1 stall).** "Which is `d/dx xⁿ` vs `d/dx nˣ`?" with options that force distinguishing `n·xⁿ⁻¹` (variable base) from `nˣ·ln n` (variable exponent). The current Q3 distractor `x·2ˣ⁻¹` hints at this but a dedicated question nails the misconception.
- **Add: the defining ODE.** "Which function satisfies `f′ = f` with `f(0) = 1`?" Options: `eˣ` / `x²` / `2ˣ` / `1/x`. Targets the characterization the lesson should add.
- **Add: sigmoid/log-odds.** "If `σ(z) = 0.5`, what is z, and what does z represent?" Answer `z = 0` = log-odds of 0 (even odds). Self-contained, reinforces the new content.
- **Add: numerical stability.** "Why does production softmax compute `e^{zᵢ − max(z)}` instead of `e^{zᵢ}`?" Answer: prevents overflow of the exponentials; the max cancels in the ratio so probabilities are unchanged. Targets a real practitioner misconception.
- Strengthen WRONG_WHY for any new sigmoid item: the classic trap is thinking the logit is a probability rather than a log-odds.

## Sources (the real URLs you consulted)
- https://www.3blue1brown.com/lessons/eulers-number/ — defining property (slope = height), the `(aʰ−1)/h → ln a` limit, `e^{ct}` growth-rate framing, the "growth-per-day ≠ derivative" misconception.
- https://en.wikipedia.org/wiki/E_(mathematical_constant) — compound-interest values (2.613, 2.7146, e), limit and series definitions, irrationality/transcendence.
- https://academic.oup.com/imajna/article/41/4/2311/5893596 — log-sum-exp and softmax numerical stability (max-subtraction shift).
- https://www.emergentmind.com/topics/log-sum-exp-objective — temperature `logsumexp_γ(u)=γ·logsumexp(u/γ)`, T→0 argmax / T→∞ uniform.
- https://chrisyeh96.github.io/2018/06/11/logistic-regression.html — sigmoid as softmax of two classes; logit = log-odds.
- https://mbernste.github.io/posts/eulers_number/ — supporting derivation of Euler's number / self-derivative.
