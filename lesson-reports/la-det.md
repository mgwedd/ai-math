# la-det — The Determinant

## Current summary (what it teaches + what the lab does)
The lesson (`/Users/wedd/dev/ai-math-worktrees/mystifying-clarke-7ceb80/lib/curriculum/index.js`, lines 333–383) defines the 2×2 determinant as `ad − bc` and frames it as the **area-scaling factor** of a linear map:
- `|det| = 3` → areas ×3
- `det < 0` → orientation flips (mirror)
- `det = 0` → space collapses onto a line/point; not invertible (information destroyed)
- Headline takeaway: a matrix is invertible iff det ≠ 0.

The `ml` note connects det = 0 to a layer collapsing dimensions, singular matrices breaking solvers, "near-zero determinants mean numerically unstable training," and the log-det term in normalizing flows.

The lab (`INTERACTIVES.det`) gives four sliders `a,b,c,d` ∈ [−2,2] over a 2×2 matrix. It draws the unit square's image as a parallelogram (green for det>0, red for det<0), shows î and ĵ as arrows, and reads out `det = ad−bc`, `area ×|det|`, and a "COLLAPSED — not invertible" warning when |det|<0.06. Three gated missions: (1) make det ≈ 0 with a non-zero matrix, (2) make det < −0.5 (flip), (3) make |det| ≈ 3.

There is no `deeper` field (this codebase doesn't use one for this lesson). WRONG_WHY entries exist for all three quiz questions (lines 1087–1096).

## Strengths
- The central area-scaling intuition is exactly the right pedagogical core (matches 3Blue1Brown's framing precisely).
- The lab is genuinely good: directly manipulating the four entries and watching the unit-square image deform — including the color flip on negative det and the collapse warning at det≈0 — is the single best way to internalize sign and singularity.
- The det=0 → "two different inputs share an output, no way back" framing ties geometry to invertibility/information loss cleanly.
- WRONG_WHY entries are sharp and target the actual arithmetic traps (ad+bc, stopping at ad, sign reversal).
- The mission that forces a *non-trivial* singular matrix (sum of |entries| > 1) is a nice touch — prevents the trivial all-zero answer.

## Inaccuracies / fidelity issues (each: the issue -> the correct statement -> source URL)
1. **"near-zero determinants mean numerically unstable training" — this conflates determinant magnitude with conditioning, which is a genuine error.** -> A small determinant does NOT mean a matrix is ill-conditioned, and a large determinant does NOT mean it is well-conditioned. The determinant scales by `kⁿ` when you scale a matrix by `k`, while numerical difficulty is unchanged. The correct measure of "hard to invert / unstable" is the **condition number** (ratio of largest to smallest singular value), not |det|. A perfectly well-conditioned matrix like `0.01·I` has a tiny determinant (`0.01ⁿ`) but condition number 1. -> https://www.johndcook.com/blog/2012/06/13/matrix-condition-number/

2. **"singular matrices break solvers" is fine, but the lesson never states det is basis/scale dependent in a way that matters.** -> Worth making explicit that |det| measures area scaling *as a ratio* and is independent of the chosen basis (it equals the product of eigenvalues = product of singular values up to sign), whereas the *entries* a,b,c,d are basis-dependent. -> https://www.3blue1brown.com/lessons/determinant/

3. **The 2D-only treatment is left implicit.** -> The learn text says "the determinant of a 2×2 matrix measures area." A master's-bound learner needs the generalization stated: in n-D the determinant is the **signed n-volume scaling factor** (parallelepiped volume in 3D), and det = 0 means collapse to a lower-dimensional subspace in any dimension. -> https://www.3blue1brown.com/lessons/determinant/

4. **The log-det claim is correct but under-specified.** -> In normalizing flows the relevant quantity is `log|det J|` of the **Jacobian** of the transform (change-of-variables: `log p(x) = log p(z) + log|det ∂z/∂x|`), and for composed flows the total log-det is the **sum** of per-layer log-dets (chain rule). The lesson should name the Jacobian, not leave "log-det" floating. -> https://www.emergentmind.com/topics/normalizing-flows

## Conceptual gaps (what a serious learner still needs)
- **det = product of eigenvalues** (and = product of singular values up to sign). This is the bridge to the very next lesson (la-eigen) and to PCA. Currently never stated.
- **The multiplicative law `det(AB) = det(A)·det(B)`** — areas-scale-compose. This is one of the most-used facts (and gives `det(A⁻¹) = 1/det(A)`, `det(Aⁿ) = det(A)ⁿ`). Absent.
- **Why ad − bc geometrically** — `ad` is the box from the diagonal entries; `bc` subtracts the shear "overhang." The lesson presents the formula as a black box. 3B1B gives a clean visual derivation.
- **det is multilinear / NOT additive**: `det(A+B) ≠ det A + det B`, but det IS linear in each row separately. This is a classic exam trap and a real source of bugs. -> https://web.mit.edu/18.06/www/Spring17/Determinants.pdf
- **Sign = orientation as one bit of information** — already hinted, but tie it to the right-hand rule / handedness in 3D and to "swap two rows negates det."
- **Volume scaling under composition is exactly why log-det is additive across flow layers** — connect the multiplicative law to the additive log-det, closing the ML loop.
- **Determinant vs. invertibility vs. conditioning** as three distinct ideas: det≠0 is exact/algebraic invertibility; condition number is the *numerical* version. This is the single most valuable distinction for an engineer.

## Lab ideas (concrete: name the interactive, what the learner manipulates, what it reveals)
1. **Upgrade the existing `det` lab with a live eigen/conditioning readout.** Add a second readout line showing the two singular values σ₁, σ₂ (from SVD of the 2×2) and `cond = σ₁/σ₂`. Add a mission: "Build a matrix with |det| > 1 but condition number > 20 (well-stretched in area, yet nearly singular along one direction)." This *makes the det-vs-conditioning distinction tactile* — the parallelogram looks fat but is razor-thin in one direction. Directly fixes inaccuracy #1.
2. **"Compose two transforms" mode (`det-compose`).** Two sets of sliders (A and B) plus a toggle to apply A, then B. Show det(A), det(B), and det(AB), letting the learner verify `det(AB) = det(A)det(B)` by watching the unit square scale twice. Mission: "Make A halve area and B triple it — confirm the composite scales ×1.5."
3. **"Watch the box" derivation overlay.** A button on the current lab that animates the `ad` rectangle and the `bc` shear-overhang being subtracted, so the formula stops being a black box (3B1B-style).
4. **Drag-a-blob area check.** Let the learner draw/drag a non-square shape (e.g. a triangle) and show its pre/post area ratio equals |det| — reinforces that |det| scales *all* areas, not just the unit square.

## Content improvements (specific learn/ml/deeper text upgrades)
- **Fix the `ml` note.** Replace "near-zero determinants mean numerically unstable training" with: "Don't confuse a *small* determinant with an *unstable* matrix — scaling a matrix by 0.01 shrinks det by 0.01ⁿ but doesn't change how hard it is to invert. The real stability measure is the **condition number** (ratio of largest to smallest singular value). Determinant = 0 is the exact/algebraic failure of invertibility; a large condition number is the *numerical* one."
- **Name the Jacobian in the flows sentence:** "...the log-det of the **Jacobian** appears in normalizing flows: the change-of-variables formula adds `log|det J|` to the log-likelihood, and because det multiplies across layers, these log-dets simply **add up**."
- **Add to `learn`:** one line generalizing to n-D ("In 3D it's the signed volume of the transformed unit cube; in n-D, signed n-volume. det = 0 always means a collapse to fewer dimensions.") and one line stating **det = product of eigenvalues** as a teaser for the next lesson.
- **Add a short geometric note on why `ad − bc`:** `ad` is the diagonal box; subtract `bc`, the shear overhang. Optionally add the multiplicative law `det(AB)=det A·det B` as a one-liner since it underlies the flow claim.

## Quiz improvements (specific misconceptions to target; keep questions self-contained — never require recalling lab-graph data)
- **Keep all three existing questions** (good arithmetic + sign + collapse coverage). They are self-contained.
- **Add: determinant vs. conditioning.** "A matrix has det = 0.0001. Is it nearly impossible to invert numerically?" Options: (a) Yes — a tiny determinant always means ill-conditioned; (b) Not necessarily — det shrinks just from scaling the matrix; numerical difficulty is measured by the condition number; (c) Yes — det < 1 means information is lost; (d) No — any nonzero det inverts perfectly with no error. Answer: (b). Targets the exact misconception in the current `ml` text.
- **Add: multiplicative law.** "If det(A) = 2 and det(B) = 3, what is det(AB)?" Options: 5 / 6 / 1 / can't tell. Answer: 6, with WRONG_WHY for 5 ("you added — det multiplies: areas scale twice, so the factors multiply").
- **Add: not additive.** "True or false: det(A + B) = det(A) + det(B)?" Answer: False — the determinant is multilinear in the rows but is NOT additive over whole matrices. Classic trap.
- **Optional: det = product of eigenvalues** as a bridge question, but only after that fact is added to the learn text (otherwise it'd require unseen knowledge).

## Sources (the real URLs you consulted)
- 3Blue1Brown — The determinant (area/volume scaling, sign/orientation, det=0 collapse, ad−bc geometry, det(M₁M₂)=det(M₁)det(M₂)): https://www.3blue1brown.com/lessons/determinant/
- John D. Cook — "Making a singular matrix non-singular" (why |det| is a bad measure of singularity; condition number is the right one; scaling argument): https://www.johndcook.com/blog/2012/06/13/matrix-condition-number/
- MIT 18.06 — Determinants notes (three defining properties, multilinearity, det(A+B) ≠ det A + det B, big formula/cofactors): https://web.mit.edu/18.06/www/Spring17/Determinants.pdf
- MIT 18.06 OCW — Lecture 18: Properties of determinants: https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-18-properties-of-determinants/
- Normalizing flows / change-of-variables (log|det J| of the Jacobian, additive log-det across composed layers, O(D³) cost): https://www.emergentmind.com/topics/normalizing-flows
