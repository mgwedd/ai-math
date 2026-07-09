# la-svd — SVD: Compress Anything

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [MIT 18.065 Lecture 6: Singular Value Decomposition — OCW](https://ocw.mit.edu/courses/18-065-matrix-methods-in-data-analysis-signal-processing-and-machine-learning-spring-2018/resources/lecture-6-singular-value-decomposition-svd/) — Strang's graduate-level SVD lecture from "Matrix Methods in Data Analysis" (2018): the geometric picture (σᵢ = semi-axis lengths of the ellipsoid A maps the unit sphere to), the Eckart–Young theorem with Frobenius error ‖A−Aₖ‖_F = √(σ²_{k+1}+…), and the connection to eigenvalues of AᵀA. The authoritative companion to the lesson.
- [LoRA: Low-Rank Adaptation of Large Language Models — arXiv 2106.09685](https://arxiv.org/abs/2106.09685) — The seminal paper by Hu et al. (2021) that grounds the lesson's LoRA `ml` note in primary literature: the intrinsic-rank hypothesis, ΔW = (α/r)·BA (note the α/r scaling the lesson omits), and empirical evidence that useful weight updates are low-rank. Essential reading for any ML student who will use LoRA.
- [Low-rank approximation — Wikipedia (Eckart–Young–Mirsky theorem)](https://en.wikipedia.org/wiki/Low-rank_approximation) — Rigorous statement of Eckart–Young: truncated SVD minimizes ‖A−B‖ over all rank-k matrices B in *any* unitarily invariant norm (Frobenius, spectral, nuclear); error = σ_{k+1} (spectral) or √(Σ_{j>k}σ²_j) (Frobenius); minimizer is unique iff σ_k > σ_{k+1}. Fills the lesson's biggest technical gap.

### Watch
- [ME 565 Lecture 27: SVD Part 1 — Steve Brunton, U. Washington](https://www.youtube.com/watch?v=yA66KsFqUAE) (eigensteve / UW ME565, ~50 min) — Best graduate-level geometric treatment of SVD: σ as ellipse semi-axes, U/V as rotations, rank-1 layer decomposition, and the connection to data compression. Brunton's style is especially good at building intuition before formulas.
- [SVD Playlist — Brunton & Kutz, Data-Driven Science and Engineering](https://www.youtube.com/playlist?list=PLMrJAkhIeNNSVjnsviglFoY2nXildDCcv) (eigensteve, 7-hour series) — The definitive video series on SVD for ML practitioners: image compression, PCA, pseudoinverse, randomized SVD, and the Netflix Prize. Exactly the breadth the lesson's compression story promises.
- [MIT 18.065 Lecture 6 — Strang on YouTube (18.065 playlist)](https://www.youtube.com/playlist?list=PLUl4u3cNGP63oMNUHXqIUcrkS2PivhN3k) (MIT OCW, ~50 min) — Strang's own lecture: "the SVD separates a matrix into rank-one pieces and those pieces come in order of importance." Teaches the geometric picture and Eckart–Young in the same session, tying back to the lesson's layer-cake view.

## Science & depth recommendations (to reach master's level)

- **Eckart–Young error formula is missing.** The lesson names the theorem but never states the Frobenius error: ‖A−Aₖ‖_F = √(σ²_{k+1}+…+σ²_r). The lab's "energy" is 1 − (this error squared / total), but the connection is never made explicit — learners believe "96% energy ≈ 4% error" when in fact the Frobenius error is √(1−0.96) ≈ 20%. Add the formula and the uniqueness condition σ_k > σ_{k+1}. Grounded in Wikipedia Low-rank approximation and Strang 18.065 Lec. 6.
- **The geometric picture (σ = ellipse semi-axis, σ₁ = ‖A‖₂) is absent.** σᵢ are the lengths of the axes of the ellipsoid A maps the unit sphere to; this is the visual anchor 3B1B-style courses and Brunton both lead with. Also, σ₁ = ‖A‖₂ (spectral norm) and σ₁/σ_r = condition number are facts every ML practitioner needs. A `deeper` card or one sentence in `learn` would close this gap. Grounded in Brunton ME565 Lec. 27.
- **LoRA's α/r scaling is omitted.** Real LoRA adds h = W₀x + (α/r)·BAx; the α/r factor decouples learning rate from rank choice and is present in every practical implementation. The lesson's formula drops it. Fix the `ml` note. Grounded in arXiv 2106.09685 Sec. 4.
- **Singular-value decay as compressibility prerequisite is not stated.** The lesson implies SVD always compresses, but compression only works when σ's decay rapidly (smooth/correlated data). Pure white noise has a flat spectrum and is incompressible by SVD. Adding "compression works only when σ's plummet — a matrix of random noise can't be compressed" teaches the single most important generalization. Grounded in Brunton series and Strang 18.065.

## Sources
- [MIT 18.065, Lecture 6: SVD — OCW](https://ocw.mit.edu/courses/18-065-matrix-methods-in-data-analysis-signal-processing-and-machine-learning-spring-2018/resources/lecture-6-singular-value-decomposition-svd/) — MIT 18.065, canonical course
- [LoRA: Low-Rank Adaptation of Large Language Models — arXiv 2106.09685](https://arxiv.org/abs/2106.09685) — seminal paper, peer-reviewed (ICLR 2022)
- [Low-rank approximation — Wikipedia (Eckart–Young–Mirsky theorem)](https://en.wikipedia.org/wiki/Low-rank_approximation) — canonical reference
- [ME 565 Lecture 27: SVD Part 1 — Steve Brunton, YouTube](https://www.youtube.com/watch?v=yA66KsFqUAE) — high-quality explainer, UW engineering course
- [SVD Playlist — Brunton & Kutz, YouTube](https://www.youtube.com/playlist?list=PLMrJAkhIeNNSVjnsviglFoY2nXildDCcv) — high-quality explainer, comprehensive series
- [MIT 18.065 YouTube playlist](https://www.youtube.com/playlist?list=PLUl4u3cNGP63oMNUHXqIUcrkS2PivhN3k) — MIT 18.065, peer-reviewed course
