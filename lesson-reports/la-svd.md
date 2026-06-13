# la-svd — SVD: Compress Anything

## Current summary (what it teaches + what the lab does)
The lesson factors any matrix as A = UΣVᵀ (rotate · stretch · rotate), defines singular values σ₁ ≥ σ₂ ≥ … ≥ 0, ties rank to the count of nonzero σ's, and presents the sum-of-rank-1-layers form A = Σ σᵣuᵣvᵣᵀ. It states Eckart–Young (truncated SVD is the best rank-k approximation) and gives the storage cost k(m+n+1). The `ml` note connects to LoRA (ΔW = BA), PCA (SVD of centered data), and recommender factorization. Two `deeper` cards cover the layer-cake intuition and SVD-vs-eigendecomposition (V = eigenvectors of AᵀA, U = eigenvectors of AAᵀ, σ² = shared eigenvalues). Four quiz items: Σ anatomy, Eckart–Young, storage arithmetic (rank-20 1000×1000 ≈ 4%), and what LoRA does.

Lab (`INTERACTIVES.lasvd`): a 40×40 deterministic test image (gradient sky + sun + striped ground + noise) is SVD'd once via Jacobi eigendecomposition of AᵀA. A slider sets k (1..40); the canvas shows original vs rank-k reconstruction side by side, plus a 20-bar chart of σ's (cyan = kept). Clicking a bar isolates that single rank-1 layer σᵣuᵣvᵣᵀ (recentered on gray since it's signed). Readout shows k, energy kept %, reconstruction error %, and storage vs N². Three missions: (1) k ≤ 4 holding ≥99% energy, (2) error ≤ 5% with storage < half of N², (3) k = 1.

## Strengths
- The "rotate · stretch · rotate" framing plus the explicit dual view (layer-cake sum) is exactly how the best sources teach it (3B1B, Strang 18.06). Offering both pictures is genuinely high-value.
- Eckart–Young is named and stated correctly in spirit; the storage formula k(m+n+1) is right and the rank-20 arithmetic checks out (40,020 vs 1,000,000 ≈ 4%).
- The lab's click-a-bar-to-isolate-one-layer interaction is the single best feature: seeing layer 1 = broad structure and tail layers = texture is the core intuition made tactile.
- The SVD-vs-eigendecomposition card correctly explains the AᵀA / AAᵀ connection and why PCA people conflate the two — a real source of learner confusion, well handled.
- Distinguishing "energy kept" from "reconstruction error" in the readout is good; missions force the learner to feel that 99% energy ≠ 99% of pixels.

## Inaccuracies / fidelity issues (each: the issue -> the correct statement -> source URL)
1. **Eckart–Young is stated without its norm and without the uniqueness gap condition.** The lesson says "best possible rank-k approximation" but the truncated SVD is optimal specifically in *any unitarily invariant norm* (Frobenius, spectral, nuclear), with error ‖A − Aₖ‖_F = √(σ²_{k+1}+…+σ²_r) and ‖A − Aₖ‖₂ = σ_{k+1}. It is the **unique** minimizer iff σ_k > σ_{k+1} (a strict gap); with a tie the minimizer is non-unique. -> State at least the Frobenius error formula and the σ_k > σ_{k+1} uniqueness caveat for a master's-bound learner. Source: https://en.wikipedia.org/wiki/Low-rank_approximation
2. **"energy" is never defined; the lab silently equates it with Σσ²-fraction.** The lab computes energy = Σ_{r≤k}σ²ᵣ / Σσ²ᵣ. This is the fraction of squared Frobenius norm captured, and 1 − energy = (relative Frobenius error)². The lesson text never tells the learner that "energy" means squared-σ fraction or that it is the *square* of the error metric — so the two readout numbers look unrelated when they're algebraically tied. -> Define energy explicitly and state relErr = √(1 − energy). Source: https://blogs.sas.com/content/iml/2017/08/30/svd-low-rank-approximation.html
3. **The compression story omits the practical caveat that SVD rarely beats real image codecs and that compression only happens when k < mn/(m+n+1).** Per-channel SVD of a photo is a pedagogical device, not how JPEG works (JPEG uses block DCT + quantization + entropy coding). Naive learners conclude SVD is a competitive image format. -> Add a one-line honesty note: SVD compresses only when k is small relative to mn/(m+n+1), and it's a teaching model, not a production codec. Source: https://www.math.umd.edu/~immortal/MATH401/book/ch_image_compression.pdf
4. **The `ml` note's LoRA formula drops the α/r scaling.** Real LoRA computes h = W₀x + (α/r)·BAx; the scaling factor is load-bearing (decouples learning rate from rank). -> Mention the α/r scale, or at least note the update is scaled. Source: https://en.wikipedia.org/wiki/LoRA_(machine_learning)
5. **"A = UΣVᵀ … for any matrix" is true but the lab only ever shows the square (N×N) case**, so the learner never sees the defining strength of SVD — that it works for non-square A. The thin-vs-full SVD distinction (U is m×r, Σ is r×r in the economy form) is also never mentioned, yet it's what makes the storage count k(m+n+1) correct. -> Note thin/economy SVD and ideally show a non-square example. Source: https://en.wikipedia.org/wiki/Singular_value_decomposition

## Conceptual gaps (what a serious learner still needs)
- **Why σ's decay fast for natural data.** The whole compression payoff hinges on rapid singular-value decay (smooth/correlated images, low-rank-ish data). The lesson asserts compression works but never says *when it fails* (white noise has a flat spectrum — incompressible). This is the key generalization a master's learner needs.
- **Geometric meaning of σ's as semi-axes.** σᵢ are the lengths of the semi-axes of the ellipse/ellipsoid that A maps the unit sphere to; vᵢ are pre-image axes, uᵢ image axes. This is the 3B1B/Strang geometric anchor and it's missing.
- **σ₁ = ‖A‖₂ (spectral norm = operator 2-norm), and condition number = σ₁/σ_r.** These connect SVD to numerical stability and to the spectral-norm version of Eckart–Young the learner will meet in optimization/ML.
- **PCA tie-up is one sentence but never quantitative.** That principal components are right-singular-vectors of the centered data and explained-variance ratio = σᵢ²/Σσ² (literally the lab's "energy") is the bridge to the data-science world; worth making explicit.
- **Relationship to the previous lessons' rank/SVD readout** is asserted ("the σ's you met") but the deeper "rank = number of σ above a numerical tolerance" (numerical vs exact rank) is a real subtlety for noisy matrices.
- **Pseudoinverse / least squares.** A⁺ = VΣ⁺Uᵀ is the natural next application of SVD and the one most relevant to ML (normal equations, ridge). Even a pointer would raise the ceiling.

## Lab ideas (concrete: name the interactive, what the learner manipulates, what it reveals)
1. **"Spectrum decides compressibility" toggle** — add buttons to swap the source matrix between the current structured image, a low-rank pattern, and pure white noise. Same k slider. Reveals: structured/low-rank images collapse to a few layers; noise needs nearly all N layers (flat bar chart, error barely drops). This teaches the single most important generalization (decay ⇒ compressibility) with one control.
2. **"σ as ellipse axes"** — a small companion panel showing the unit circle mapped by a 2×2 A into an ellipse, with σ₁,σ₂ drawn as the semi-axis lengths and v₁,v₂→u₁,u₂ as the rotated axes. Drag A's entries; watch the ellipse and the bars move together. Connects the algebra to geometry.
3. **Cumulative-energy curve overlay** on the bar chart — a line tracing Σ_{r≤k}σ²/total as k grows, with the learner's current k marked. Makes the "diminishing returns / pick the elbow" decision visual and ties energy to relErr (annotate relErr = √(1−energy)).
4. **Non-square mode** — let the image be 60×30 to make U, Σ, V different shapes visible, reinforcing that SVD needs no square/invertible matrix and that storage is k(m+n+1), not k(2N+1).
5. **LoRA mini-demo** — show a target ΔW and let the learner pick rank r for BA; display ‖ΔW − BA‖ vs r. Drives home that "useful updates are low-rank" is an empirical bet, not a theorem.

## Content improvements (specific learn/ml/deeper text upgrades)
- In `learn`, after Eckart–Young, add the Frobenius error formula and the σ_k > σ_{k+1} uniqueness gap: "the error you leave behind is exactly √(σ²_{k+1}+…), and the truncation is the unique best unless two singular values tie at the cut."
- Add one sentence on **σ decay being the precondition**: "Compression works only because σ's of natural data plummet; a matrix with a flat spectrum (pure noise) can't be compressed this way."
- Add the **geometric line**: "σ's are the lengths of the axes of the ellipsoid A stretches the unit sphere into — σ₁ is the biggest stretch, and σ₁ = ‖A‖₂."
- In `ml`, fix LoRA to include scaling: "ΔW = (α/r)·BA, added to a frozen W" and note PCA's explained-variance ratio = σ²/Σσ² is the same "energy" number the lab shows.
- In the storage paragraph, add the honesty caveat: "SVD only compresses when k < mn/(m+n+1); it's a teaching model, not a rival to JPEG (which uses DCT + quantization)."
- New `deeper` card: **"SVD is the Swiss-army knife"** — pseudoinverse A⁺ = VΣ⁺Uᵀ for least squares, σ₁/σ_r as condition number, ‖A‖₂ = σ₁. One card unlocking three downstream uses.

## Quiz improvements (specific misconceptions to target; keep questions self-contained — never require recalling lab-graph data)
- **Energy vs error misconception.** "If a rank-k truncation keeps 96% of the energy (Σσ² fraction), the relative Frobenius reconstruction error is about…" → √(1−0.96) ≈ 20%. Targets the very common belief that 96% energy means 4% error. Self-contained (numbers given in the stem).
- **When SVD compression fails.** "Which matrix is *least* compressible by truncated SVD?" options: a smooth gradient image / a rank-3 matrix / a matrix of independent random noise / a constant matrix → noise. Teaches the decay precondition.
- **Eckart–Young norm scope.** "The truncated SVD is the best rank-k approximation in…" → "every unitarily invariant norm (Frobenius, spectral, nuclear)" vs distractors ("only the Frobenius norm", "only when A is square", "only when A is symmetric"). Corrects the silent norm assumption.
- **σ₁ = operator norm.** "The largest singular value σ₁ equals…" → "the matrix's spectral (operator 2-) norm — the most it can stretch any unit vector" vs "its determinant", "its trace", "its largest entry".
- Consider replacing or supplementing the current LoRA quiz `why` to mention the α/r scaling so the explanation is fully correct.

## Sources (the real URLs you consulted)
- Eckart–Young–Mirsky theorem, error formulas, uniqueness gap: https://en.wikipedia.org/wiki/Low-rank_approximation
- Low-rank approximation & σ-decay intuition (energy/error): https://blogs.sas.com/content/iml/2017/08/30/svd-low-rank-approximation.html
- SVD image-compression storage threshold (k < mn/(m+n+1)) and color-channel handling: https://www.math.umd.edu/~immortal/MATH401/book/ch_image_compression.pdf
- LoRA formulation, intrinsic-rank hypothesis, α/r scaling: https://en.wikipedia.org/wiki/LoRA_(machine_learning)
- LoRA original paper (Hu et al. 2021): https://www.semanticscholar.org/paper/LoRA:-Low-Rank-Adaptation-of-Large-Language-Models-Hu-Shen/a8ca46b171467ceb2d7652fbfb67fe701ad86092
- SVD definition, thin/economy form, non-square applicability: https://en.wikipedia.org/wiki/Singular_value_decomposition
