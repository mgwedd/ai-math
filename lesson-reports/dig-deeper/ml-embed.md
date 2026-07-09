# ml-embed — Embeddings: Meaning as Geometry

## Dig Deeper appendix (curated — graduate-authoritative)
### Read
- [Efficient Estimation of Word Representations in Vector Space (Mikolov et al., 2013)](https://arxiv.org/abs/1301.3781) — the seminal word2vec paper: the CBOW / skip-gram architectures and the source of the `king − man + woman ≈ queen` analogy result the lesson teaches.
- [The Illustrated Word2vec (Jay Alammar)](https://jalammar.github.io/illustrated-word2vec/) — the best-in-class visual walkthrough of embeddings, cosine similarity, skip-gram vs CBOW, and the negative-sampling training trick — exactly the "how are these learned?" story the lesson only gestures at.
- [Analogies Explained: Towards Understanding Word Embeddings (Allen & Hospedales, 2019)](https://arxiv.org/abs/1901.09813) — a rigorous account of *when* the analogy arithmetic actually holds and the independence assumptions it needs, grounding the lesson's honesty caveat that the trick is over-sold.
- [GloVe: Global Vectors for Word Representation (Pennington et al., 2014)](https://nlp.stanford.edu/pubs/glove.pdf) — the other canonical static-embedding method, trained by factorizing a global co-occurrence matrix rather than local context prediction; vocabulary a paper-reading learner needs.

### Watch
- [Stanford CS224n (2024) — Lecture 2: Word Vectors and Language Models](https://www.youtube.com/watch?v=nBor4jfWetQ) (Stanford Online / Christopher Manning, ~1h 20m) — the authoritative graduate lecture on word2vec objectives, the distributional hypothesis, and the geometry of the embedding space.
- [But what is a GPT? Visual intro to transformers | Chapter 5, Deep Learning](https://www.youtube.com/watch?v=wjZofJX0v4M) (3Blue1Brown, ~27 min) — its opening sections give the clearest visual account of how tokens become high-dimensional vectors and how directions in that space carry meaning.

## Science & depth recommendations (to reach master's level)
- Static vs contextual embeddings is the biggest gap → state that word2vec/GloVe give one fixed vector per word (where the analogy lives), while BERT/GPT give a *different* vector per occurrence (river "bank" vs savings "bank"), grounded in CS224n and the contextual-embeddings literature.
- The lab computes Euclidean distance while the lesson teaches cosine → reconcile them: normalize the toy vectors and note cosine = dot product for unit-norm vectors, and that production retrieval scores with cosine because embedding norm often tracks frequency, not meaning, grounded in the Illustrated Word2vec cosine section.
- The analogy is presented as robust → keep and sharpen the caveat that it only lands when the input words are excluded from the search and that it encodes corpus bias ("doctor − man + woman → nurse", Bolukbasi et al. 2016), grounded in Allen & Hospedales (2019).
- Training objective is only gestured at → name skip-gram vs CBOW and the negative-sampling trick (a binary "does this word appear near that word?" classifier), which is *why* semantic proximity emerges, grounded in Mikolov et al. and the Illustrated Word2vec.
- Retrieval uses sentence/passage embeddings, not word vectors → note that RAG encodes whole queries and documents (sentence-transformers / embedding APIs), distinct from the word2vec-era analogy, grounded in CS224n.
- GloVe is never named → add it as the co-occurrence-factorization alternative to word2vec's local prediction, grounded in Pennington et al. (2014).

## Sources
- https://arxiv.org/abs/1301.3781 — seminal peer-reviewed paper (word2vec, Mikolov et al.)
- https://jalammar.github.io/illustrated-word2vec/ — high-quality canonical explainer (Jay Alammar)
- https://arxiv.org/abs/1901.09813 — peer-reviewed analysis (Allen & Hospedales, ICML 2019)
- https://nlp.stanford.edu/pubs/glove.pdf — seminal peer-reviewed paper (GloVe, Stanford NLP)
- https://www.youtube.com/watch?v=nBor4jfWetQ — Stanford CS224n lecture (Christopher Manning)
- https://www.youtube.com/watch?v=wjZofJX0v4M — 3Blue1Brown, high-quality explainer
