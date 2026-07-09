# prob-mle — Maximum Likelihood Estimation

## Dig Deeper appendix (curated — graduate-authoritative)

### Read

- [MIT 18.650 Lecture 3–5 Notes: Maximum Likelihood Estimation (PDF)](https://ocw.mit.edu/courses/18-650-statistics-for-applications-fall-2016/36624c2682b346b07cab3da416b752a7_MIT18_650F16_Maximum_LE.pdf) — Philippe Rigollet's graduate lecture notes (~24 pages) covering the likelihood function, log-likelihood, Cramér–Rao bound, consistency, asymptotic efficiency, and Fisher information. The definitive treatment connecting the MLE's optimality properties (efficiency, consistency, invariance) to the formulas the lesson introduces. MIT 18.650 is a graduate statistics course; these notes are the standard reference for understanding why MLE is not merely convenient but provably optimal.

- [CS229 Lecture Notes — Supervised Learning (Andrew Ng & Tengyu Ma)](https://cs229.stanford.edu/main_notes.pdf) — Stanford's graduate ML course notes, Part I. Section on "Probabilistic Interpretation of Linear Regression" derives MSE from Gaussian MLE directly; Section on "Logistic Regression" derives cross-entropy from categorical MLE. The canonical ML-side proof that loss functions are log-likelihoods. Freely available from Stanford; the most-cited ML course notes online.

- [Eli Bendersky, "Cross-entropy and KL divergence" (2025)](https://eli.thegreenplace.net/2025/cross-entropy-and-kl-divergence/) — Mathematically rigorous blog post deriving the relationship MLE = minimizing KL(data ‖ model), with formal proofs and numerical examples. Includes L'Hôpital derivation for the 0·log(0) = 0 convention. Confirms and extends the lesson's deeper card ("MLE = minimizing KL") with clean derivations. Highly reliable; Bendersky is a well-known systems engineer and technical writer.

- [Goodfellow, Bengio & Courville, *Deep Learning* Ch. 3 & Ch. 5.5](https://www.deeplearningbook.org/contents/prob.html) — Section 5.5 derives MLE from first principles, states the i.i.d. assumption explicitly, and connects MLE to minimizing KL divergence. Section 5.6 covers MAP as the extension with a prior. The canonical graduate reference for MLE in ML context.

### Watch

- [Maximum Likelihood, clearly explained!!!](https://www.youtube.com/watch?v=XepXtl9YKwc) (StatQuest / Josh Starmer, ~7 min) — Builds MLE from scratch using a coin-flip example: likelihood function, log-likelihood, and why the derivative finds the maximum. Best first-exposure video for the concept before formalism; particularly good at the "why log?" intuition. StatQuest is the standard recommendation for statistical intuition in ML curricula.

- [Lecture 5: Maximum Likelihood Estimation (MIT 18.650)](https://www.youtube.com/watch?v=iM5tUkqKb9U) (MIT OCW / Philippe Rigollet, ~50 min) — Graduate-level lecture covering asymptotic normality of the MLE, Fisher information, the Cramér–Rao lower bound, and the relationship between consistency and efficiency. The step from the lesson's "summit-finding" intuition to a rigorous understanding of why MLE is provably good. MIT 18.650 is the standard graduate statistics course used by ML researchers.

## Science & depth recommendations (to reach master's level)

- **The i.i.d. assumption is implicit but never stated** → The product rule `Π p(xᵢ|θ)` holds only when samples are independent and identically distributed. When data is correlated (time series, language model sequences, panel data) the joint likelihood cannot be factored this way. Adding "Note: this product form assumes independent samples — for correlated data, use the chain rule of probability instead" is essential for ML practitioners. Grounded in CS229 notes and MIT 18.650 Lecture 3.

- **The bias of the MLE variance estimator deserves explicit treatment** → The lesson mentions it briefly but the "go deeper" card on Bessel's correction is the natural place to show: E[σ²_MLE] = ((n−1)/n)σ², so bias = −σ²/n, vanishing as n→∞. This is why ML practitioners encounter `ddof=0` vs `ddof=1` in NumPy/pandas. Grounded in MIT 18.650 Lecture Notes Ch. 3 and the stat-estimator lesson (which covers this in detail).

- **Cramér–Rao and asymptotic efficiency are the "why MLE" answer** → The lesson explains MLE heuristically ("make data least surprising") but never says why MLE is the method of choice over alternatives. The answer — MLE is asymptotically efficient (no unbiased estimator has lower variance in the large-n limit) — requires Fisher information and the Cramér–Rao bound. These are covered in MIT 18.650 Lecture 5 and in Casella & Berger Ch. 7 and are the correct graduate-level answer to "why use MLE?" 

- **Likelihood is not a probability distribution over θ** → The lesson writes P(data|θ) and can leave students thinking the likelihood normalizes over θ. A one-sentence clarification — "L(θ) is not a distribution over θ: it does not integrate to 1, and calling it a probability over θ is a Bayesian statement that requires a prior" — prevents one of the most common statistical confusions. Grounded in Goodfellow Ch. 5.5 and Casella & Berger Ch. 6.

## Sources

- https://ocw.mit.edu/courses/18-650-statistics-for-applications-fall-2016/36624c2682b346b07cab3da416b752a7_MIT18_650F16_Maximum_LE.pdf — MIT 18.650 (graduate statistics course; Rigollet lecture notes on MLE; confirmed live via OCW)
- https://cs229.stanford.edu/main_notes.pdf — Stanford CS229 (canonical graduate ML notes; Ng & Ma; freely available from Stanford)
- https://eli.thegreenplace.net/2025/cross-entropy-and-kl-divergence/ — high-quality explainer (Bendersky 2025; mathematically rigorous; confirmed live)
- https://www.deeplearningbook.org/contents/prob.html — canonical text (Goodfellow et al. *Deep Learning*; Ch. 3 & 5; freely hosted by authors)
- https://www.youtube.com/watch?v=XepXtl9YKwc — StatQuest (high-quality explainer; Josh Starmer; MLE clearly explained, ~7 min; confirmed live)
- https://www.youtube.com/watch?v=iM5tUkqKb9U — MIT OCW 18.650 (graduate statistics course lecture; Rigollet MLE Lecture 5; confirmed live)
