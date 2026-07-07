# c-jacobian — The Chain Rule with Jacobians

## Dig Deeper appendix (curated — graduate-authoritative)

### Read

- [Derivatives, Backpropagation, and Vectorization](https://cs231n.stanford.edu/handouts/derivatives.pdf) (Justin Johnson, Stanford CS231n) — The canonical graduate-level handout connecting total derivatives, Jacobian matrices, and backpropagation in neural networks. Derives the Jacobian as the best linear map for a vector function, shows how chaining maps multiplies Jacobians, and explains why computing explicit Jacobians is infeasible at scale — instead we compute vector–Jacobian products (reverse mode). Directly formalizes what the lesson teaches in exactly the right notation.

- [MIT 18.02SC Session 32 — Total Differentials and the Chain Rule](https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/pages/2.-partial-derivatives/part-b-chain-rule-gradient-and-directional-derivatives/session-32-total-differentials-and-the-chain-rule/) (MIT OCW 18.02, Denis Auroux) — The multivariable chain rule derived as a matrix product of partial derivatives. Establishes the total derivative as the best linear map, then shows composition → multiplication. The mathematical precursor to the lesson's pipeline diagram.

- [Backpropagation for a Linear Layer](https://cs231n.stanford.edu/handouts/linear-backprop.pdf) (Justin Johnson, Stanford CS231n) — A worked-out derivation of the Jacobian-product structure for a single linear layer y = Wx. Shows exactly which matrix multiplications correspond to which Jacobian factors in the chain, making the abstract "J₂·J₁" formula concrete and verifiable. Essential supplement for students who want to check the lesson's pipeline lab by hand.

- [The Backpropagation Algorithm for a Math Student](https://arxiv.org/pdf/2301.09977) (arXiv:2301.09977, 2023) — Rigorous mathematical treatment of backprop as a systematic application of the chain rule for Jacobians, covering the vanishing/exploding gradient problem in terms of singular-value products. Goes further than the lesson's lab by treating arbitrary computation graphs, not just linear pipelines.

### Watch

- [Backpropagation calculus | Deep Learning Chapter 4](https://www.youtube.com/watch?v=tIeHLnjs5U8) (3Blue1Brown, ~10 min) — Grant Sanderson's visual derivation of how the chain rule for partial derivatives gives backprop. Shows the "multiply the slopes along the chain" picture for scalar networks, then explains how this extends to the matrix/Jacobian product for vector networks. The clearest visual introduction to what the lesson formalizes.

- [MIT 18.02 Lecture 11 — Chain Rule](https://ocw.mit.edu/courses/18-02-multivariable-calculus-fall-2007/resources/lecture-11-chain-rule/) (MIT OCW 18.02 Fall 2007, Denis Auroux, ~50 min) — Full lecture on the multivariable chain rule as a product of partial derivatives, with worked examples. The authoritative video treatment of the mathematics underlying the lesson.

## Science & depth recommendations (to reach master's level)

- **Missing: why reverse-mode is cheap (the associativity argument).** The lesson explains that "right-to-left keeps a small row vector," but the *reason* this is valid — matrix multiplication is associative so you may re-bracket freely — deserves one explicit sentence. → Add to `learn`: "Matrix multiplication is associative: (J₃·J₂)·J₁ = J₃·(J₂·J₁). Both give the same Jacobian; reverse-mode picks the right-to-left bracketing that keeps every intermediate result a cheap vector." Grounded in CS231n handout.

- **Missing: forward mode vs reverse mode.** The lesson mentions reverse mode but not forward mode (Jacobian–vector product), which is cheaper when the network has many outputs but few inputs. A master's student will encounter both in JAX (which offers both natively). → Add a `deeper` card: "Forward mode (vjp vs jvp in JAX): cheap when outputs >> inputs; reverse mode: cheap when inputs >> outputs — which is why training (scalar loss, many weights) always uses reverse mode." Grounded in the CS231n handout.

- **Layer Jacobians for concrete activation functions are absent.** The lesson mentions that activations (ReLU, sigmoid) have diagonal Jacobians, but never writes them down: ReLU's Jacobian is diag(1[x>0]), sigmoid's is diag(σ(1−σ)). These are the specific matrices that determine vanishing/exploding behavior. → A `deeper` card with these formulas grounds the singular-value story in actual network math. Grounded in CS231n handout and Ruder 2016.

- **The non-commutativity warning is correct but could be paired with the associativity contrast.** Learners often conflate "can't reorder" with "can't re-bracket." One sentence clarifying the distinction (non-commutative, but associative) would prevent a common confusion. → Add to the quiz or `learn`. Grounded in CS231n handout.

## Sources

- [Derivatives, Backpropagation, and Vectorization — Justin Johnson, CS231n](https://cs231n.stanford.edu/handouts/derivatives.pdf) — Stanford CS231n, canonical course handout
- [MIT 18.02SC Session 32 — Total Differentials and the Chain Rule](https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/pages/2.-partial-derivatives/part-b-chain-rule-gradient-and-directional-derivatives/session-32-total-differentials-and-the-chain-rule/) — MIT 18.02, canonical text
- [Backpropagation for a Linear Layer — Justin Johnson, CS231n](https://cs231n.stanford.edu/handouts/linear-backprop.pdf) — Stanford CS231n, canonical course handout
- [The Backpropagation Algorithm for a Math Student](https://arxiv.org/pdf/2301.09977) — arXiv:2301.09977, 2023, peer-reviewed equivalent
- [Backpropagation calculus | 3Blue1Brown](https://www.youtube.com/watch?v=tIeHLnjs5U8) — 3Blue1Brown YouTube, high-quality explainer
- [MIT 18.02 Lecture 11 — Chain Rule](https://ocw.mit.edu/courses/18-02-multivariable-calculus-fall-2007/resources/lecture-11-chain-rule/) — MIT OCW Fall 2007, canonical text
