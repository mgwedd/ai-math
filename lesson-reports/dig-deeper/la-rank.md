# la-rank — Rank & the Four Subspaces

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [Strang, "The Four Fundamental Subspaces: 4 Lines" — MIT 18.06 essay](https://web.mit.edu/18.06/www/Essays/newpaper_ver3.pdf) — Strang's own short essay on the theorem: orthogonality of the four subspaces (row space ⊥ null space in ℝⁿ; column space ⊥ left null space in ℝᵐ), the dimension table (r, n−r, r, m−r), and why column rank = row rank. The most direct source for the lesson's biggest gap.
- [MIT 18.06 Lecture 10: The Four Fundamental Subspaces — OCW](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-10-the-four-fundamental-subspaces/) — Strang's video lecture walking through the subspace structure, rank, and the Fundamental Theorem; includes elimination to find bases for all four subspaces. The canonical graduate-level treatment.
- [LoRA: Low-Rank Adaptation of Large Language Models — arXiv 2106.09685](https://arxiv.org/abs/2106.09685) — Seminal paper by Hu et al. (2021): the "intrinsic rank hypothesis" that fine-tuning updates ΔW are empirically low-rank, motivating ΔW = BA. Directly grounds the lesson's LoRA `ml` note in primary literature. Rank(AB) ≤ min(rank A, rank B) is the key algebraic fact linking this paper to the lesson.

### Watch
- [MIT 18.06 Lecture 10: The Four Fundamental Subspaces — YouTube](https://www.youtube.com/watch?v=YzZUIYRCE38) (MIT OpenCourseWare, ~50 min) — Strang's original lecture showing how elimination reveals all four subspaces simultaneously and proves the dimension table. Seeing the orthogonal pairs emerge from a concrete matrix makes the abstract theorem tangible.
- [MIT 18.065 Playlist — Strang, Matrix Methods](https://www.youtube.com/playlist?list=PLUl4u3cNGP63oMNUHXqIUcrkS2PivhN3k) (MIT OpenCourseWare, ~50 min/lecture) — Lectures 1–2 extend rank to the data-science setting: singular-value spectrum, numerical rank, low-rank approximations, and how rank bounds the expressive power of every layer downstream. The bridge from the lesson's LoRA `ml` note to the SVD lesson.

## Science & depth recommendations (to reach master's level)

- **Orthogonality of the four subspaces is never stated.** The lab draws the null-space line perpendicular to the row direction but never says why: Ax=0 ⟺ x is orthogonal to every row, so null space = (row space)⊥. This is Strang's Fundamental Theorem Part 2 and the single most important structural fact in the lesson. Add one sentence to `learn`: "Ax=0 means x is perpendicular to every row — so the null space is exactly the orthogonal complement of the row space (and the same story holds on the output side)." Grounded in Strang's essay and MIT 18.06 Lec. 10.
- **Column rank = row rank is asserted (via the dimension table) but never flagged as a theorem.** This non-obvious fact — that the number of independent columns always equals the number of independent rows — is *why* there is a single number called "rank." A one-sentence mention converts it from a mysterious coincidence into a landmark result. Grounded in Strang 18.06.
- **Numerical rank needs a caveat.** The lab uses a fixed absolute threshold (0.045) to decide rank, but professional practice uses a relative tolerance σ_max · max(m,n) · ε (as in numpy.linalg.matrix_rank). A `deeper` card noting "rank is a numerical judgment, not a yes/no fact once floats are involved" corrects a real misconception a master's learner will encounter immediately. Grounded in NumPy documentation.
- **rank(AB) ≤ min(rank A, rank B) is not stated but is load-bearing for LoRA.** The `ml` note claims "a single low-rank bottleneck caps the rank of everything downstream" — this is the inequality that makes that true. Worth one line in the `ml` note or a `deeper` card. Grounded in arXiv 2106.09685 and the rank Wikipedia article.

## Sources
- [Strang, "The Four Fundamental Subspaces: 4 Lines"](https://web.mit.edu/18.06/www/Essays/newpaper_ver3.pdf) — MIT 18.06, canonical text by the author
- [MIT 18.06, Lecture 10: The Four Fundamental Subspaces — OCW](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-10-the-four-fundamental-subspaces/) — MIT 18.06, canonical course
- [MIT 18.06, Lecture 10 — YouTube](https://www.youtube.com/watch?v=YzZUIYRCE38) — MIT 18.06, peer-reviewed course video
- [LoRA: Low-Rank Adaptation of Large Language Models — arXiv 2106.09685](https://arxiv.org/abs/2106.09685) — seminal paper, peer-reviewed (ICLR 2022)
- [MIT 18.065 YouTube playlist — Matrix Methods](https://www.youtube.com/playlist?list=PLUl4u3cNGP63oMNUHXqIUcrkS2PivhN3k) — MIT 18.065, peer-reviewed course
