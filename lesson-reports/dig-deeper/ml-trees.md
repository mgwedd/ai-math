# ml-trees — Decision Trees: Greedy Splits

## Dig Deeper appendix (curated — graduate-authoritative)

### Read
- [ESL §9.2 "Tree-Based Methods" (Hastie, Tibshirani, Friedman)](https://hastie.su.domains/ElemStatLearn/) — The definitive graduate treatment of CART: binary recursive partitioning, the Gini-entropy comparison, cost-complexity pruning (the weakest-link algorithm), and the statistical argument for why greedy search is used instead of globally optimal tree search. Free PDF at the linked page.
- [Breiman et al. (1984) *Classification and Regression Trees* (CART) — original monograph; see also Breiman (2001) "Random Forests," *Machine Learning* 45:5–32, DOI 10.1023/A:1010933404324](https://link.springer.com/article/10.1023/A:1010933404324) — The 2001 paper is open-access on Springer; it introduces the random forest extension and contains a concise restatement of the CART algorithm, making it the best single paper to read after the ESL chapter.

### Watch
- [Decision and Classification Trees, Clearly Explained!!!](https://youtu.be/_L39rN6gz7Y) (StatQuest / Josh Starmer, ~18 min) — Builds a classification tree step by step using Gini impurity; shows how splits are evaluated, when to stop, and how a leaf's class label is determined. The best first-watch on CART mechanics.
- [Stanford CS229 Lecture — Trees, Ensembles and Boosting](https://www.youtube.com/playlist?list=PLoROMvodv4rMiGQp3WXShtMGgzqpfVfbU) (Stanford CS229 Autumn 2018, full course) — The trees-and-ensemble lecture in the 2018 playlist covers greedy splits, overfitting, and the motivation for ensembles at graduate depth; access by navigating to the relevant lecture in the playlist.

## Science & depth recommendations (to reach master's level)

- **Cost-complexity pruning (post-hoc pruning) is entirely absent.** The lesson mentions "real trees are pruned or depth-limited" but explains neither mechanism. Cost-complexity pruning (α-pruning from the CART monograph, also in ESL §9.2.5) is the standard algorithm: grow the full tree, then iteratively collapse the subtree whose removal gives the smallest per-leaf increase in impurity, sweeping α to produce a regularization path analogous to lasso's λ path. This is what `min_impurity_decrease` and `ccp_alpha` implement in scikit-learn. Grounded in: ESL §9.2.5.
- **The concavity argument for why Gini/entropy beat misclassification error is underdeveloped.** The deeper card says Gini and entropy are "concave" without explaining why concavity matters: a concave impurity measure rewards splits that create one very-pure child even at the expense of the other, while misclassification error (piecewise linear, not strictly concave) cannot distinguish these splits. A sentence connecting concavity to the "second-order improvement" a split can make closes this gap. Grounded in: ESL §9.2.3.
- **Instability of single trees is not demonstrated.** A key insight motivating ensembles is that a small change in the training data can produce a radically different tree (high variance). The lab could show this by offering a "resample data" button — re-rolling the random seed produces a different tree boundary — foreshadowing why random forests exist. Grounded in: Breiman (2001), §1; ESL §9.2.6.
- **Relation to axis-aligned halfspace learning.** The "axis-aligned staircase" limitation is explained but not linked to the formal concept of the VC dimension of axis-aligned halfspaces. Mentioning that the VC dimension of a depth-d tree over p binary features is O(d·log p) connects the overfitting story to learning theory. Grounded in: ESL §9.2, CS229 learning theory notes.

## Sources
- [ESL — The Elements of Statistical Learning, 2nd ed. (free PDF)](https://hastie.su.domains/ElemStatLearn/) — canonical text; §9.2 covers CART in full.
- [Breiman (2001) "Random Forests," Machine Learning 45:5–32](https://link.springer.com/article/10.1023/A:1010933404324) — peer-reviewed, seminal paper; open access via Springer.
- [StatQuest: Decision and Classification Trees, Clearly Explained!!!](https://youtu.be/_L39rN6gz7Y) — best-in-class explainer (StatQuest / Josh Starmer).
- [Stanford CS229 Autumn 2018 full course playlist](https://www.youtube.com/playlist?list=PLoROMvodv4rMiGQp3WXShtMGgzqpfVfbU) — Stanford CS229 official lectures.
