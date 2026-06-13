# ml-embed — Embeddings: Meaning as Geometry

## Current summary (what it teaches + what the lab does)

The lesson introduces embeddings as the idea that tokens become vectors in a learned space where geometric proximity encodes semantic similarity. The `learn` section covers: cosine/distance as similarity, clusters for categories, and directions for relations — illustrated by the king − man + woman ≈ queen analogy. The `ml` note ties embeddings to semantic search/RAG. Two `deeper` cards offer the city-map metaphor and a brief on how embeddings are learned (distributional hypothesis, Firth 1957). Four quiz questions cover cosine similarity meaning, analogy arithmetic, RAG retrieval, and dimensionality.

The single lab (`mlembed`) places 8 hard-coded 2D word vectors (man, woman, king, queen, cat, dog, car, truck) on a canvas. The learner drags a purple "query" point; a dashed line tracks the nearest neighbor (Euclidean distance). Three missions: drag to cat's neighborhood, park the query at king−man+woman ≈ (2.6, 3.1) manually reading the hint coordinates from the note, and visit the vehicle cluster. No analogy computation is shown; the learner is told the exact coordinates in the note text and just parks there.

---

## Strengths

- The map metaphor is excellent — spatial intuition for semantic clusters is well-established pedagogy.
- Connecting back to World 1 dot products is the right cross-lesson hook.
- Mentioning the distributional hypothesis (Firth 1957) grounds the "why does this work?" question historically.
- The cluster trio (royals, animals, vehicles) is immediately readable at a glance.
- Tying embeddings to RAG/semantic search is the most practically motivating use-case for an ML engineer audience.
- The quiz correctly targets the key idea: cosine similarity reflects usage context, not surface form.

---

## Inaccuracies / fidelity issues

### 1. The analogy formula is presented as straightforwardly true

**Issue:** The lesson states "king − man + woman ≈ queen" as a reliable, general fact about learned embeddings. The `learn` section says "you'll verify it by hand in the lab," implying the property is robust. The quiz says it works because "the man→woman relation is a consistent direction in the space" with no caveats.

**Correct statement:** The analogy works for this cherry-picked example in large pretrained word2vec/GloVe models, but it is notoriously unreliable in practice. Multiple independent researchers have shown that many analogies from the original word2vec paper only produce the correct answer if (a) the query word itself is excluded from the nearest-neighbor search, and (b) the model is large enough with the right corpus. Even the gender offset is not consistent across all word pairs — it reflects corpus biases (the famous counter-example: "doctor − man + woman ≈ nurse" encodes stereotypes). Academic analysis (Allen & Hospedales, 2019) gives a rigorous account of *when* it works, but it requires independence assumptions that frequently fail. Calling it "computable arithmetic on learned vectors" without any caveat overclaims.

**Recommended caveat:** Add a sentence acknowledging the analogy is approximate and data-dependent, and that it famously encodes training-data biases (e.g., gender stereotypes in professional roles).

**Source URLs:**
- https://mikexcohen.substack.com/p/king-man-woman-queen-is-fake-news
- https://blog.esciencecenter.nl/king-man-woman-king-9a7fd2935a85
- https://p.migdal.pl/blog/2017/01/king-man-woman-queen-why/
- https://arxiv.org/abs/1901.09813

---

### 2. Cosine vs. Euclidean distance — the lab uses Euclidean but the lesson teaches cosine

**Issue:** The `learn` section says "Similarity = closeness (cosine / distance)" and the quiz question talks about "cosine similarity 0.97." However, the lab's nearest-neighbor computation uses plain Euclidean distance: `Math.hypot(q.x-x, q.y-y)`. In a 2D toy space with unnormalized vectors, these can disagree meaningfully. The mission targeting (2.6, 3.1) uses Euclidean proximity (`Math.hypot(s.x-2.6, s.y-3.1) < 0.3`) — not cosine. This is a direct contradiction between what the lesson teaches and what the lab computes. It also glosses over a real distinction: in production, the choice between cosine and dot-product (which equals cosine for unit-norm vectors) matters and is model-dependent.

**Correct statement:** In the toy 2D space, for pedagogical clarity the lab should either (a) normalize all vectors and note that cosine = dot product when norms = 1, or (b) display both Euclidean and cosine similarity in the readout and explicitly say which one the real-world system uses and why. Production embedding models often normalize vectors so cosine and dot product coincide, but un-normalized vectors make cosine different from distance.

**Source URLs:**
- https://milvus.io/ai-quick-reference/why-might-one-choose-dot-product-as-a-similarity-metric-for-certain-applications-such-as-embeddings-that-are-not-normalized-and-how-does-it-relate-to-cosine-similarity-mathematically
- https://arxiv.org/abs/2403.05440

---

### 3. The lesson conflates word2vec-style static embeddings with "LLM embeddings"

**Issue:** The `ml` note says "The 2D map in the lab is a real embedding space, just small enough to see" and earlier says embeddings are "the input layer of every LLM." This slides between two very different things: (a) static word embeddings (word2vec, GloVe — one fixed vector per word regardless of context) and (b) contextualized token embeddings in transformers (BERT, GPT — a word gets a *different* vector depending on its sentence). The analogy arithmetic works for static embeddings. In transformer LLMs, the "embedding" layer is just the lookup table (one vector per token ID), but the representations that actually matter are the hidden states after attention layers, which are fully contextual. Saying the 2D map "is" what LLMs use is misleading.

**Correct statement:** There are two importantly different things: (1) *static* embeddings (word2vec, GloVe) where king − man + woman ≈ queen; (2) *contextual* embeddings (BERT/GPT hidden states) where a word's representation changes with context (solving the bank = river-bank vs. bank = financial-institution polysemy problem). Modern semantic search typically uses *sentence* embeddings from encoder models (e.g., sentence-transformers), not the raw token embedding table. The lesson should name this distinction.

**Source URLs:**
- https://milvus.io/ai-quick-reference/how-do-contextual-embeddings-like-bert-differ-from-traditional-embeddings
- https://medium.com/@alexbuzunov/how-the-representation-era-connected-word2vec-to-transformers-768665eccf9d

---

### 4. Dimensionality claim: "d=768–4096+" is the range stated

**Issue (minor):** The quiz correct-answer explanation says "production embeddings are d=768–4096+." This is roughly right for transformer hidden dimensions (BERT-base = 768, GPT-3 = 12288, GPT-4 presumably larger), but the relevant embedding dimension for *semantic search* vectors (the use case mentioned in `ml`) can be very different — sentence-transformer models like `text-embedding-ada-002` use d=1536; `text-embedding-3-small` produces d=1536; open-source embedding models range widely. Citing "768–4096" without qualification could confuse learners who encounter 1536-d or 3072-d sentence embeddings and think something is wrong.

**Source URLs:**
- https://newsletter.vickiboykis.com/archive/how-big-are-our-embeddings-now-and-why/

---

### 5. The "1957" distributional hypothesis attribution is slightly imprecise

**Issue (minor):** The `deeper` card says "distributional semantics put it in 1957." The famous quote "you shall know a word by the company it keeps" is Firth (1957, p.179). However, the core distributional hypothesis is often attributed to Zellig Harris (1954). The conflation is forgivable in casual teaching but worth noting for a master's-bound audience.

**Correct statement:** Zellig Harris (1954) first articulated the distributional hypothesis formally; Firth's 1957 slogan popularized it. Either attribution is defensible; crediting only "1957" (implying Firth) loses Harris.

**Source:** https://arxiv.org/pdf/2205.07750

---

## Conceptual gaps (what a serious learner still needs)

1. **Static vs. contextual embeddings** — the biggest gap. The lesson's entire framing is word2vec-era static embeddings, yet every modern production system the learner will encounter uses contextual representations. Even a sentence naming this distinction would close the gap ("word2vec gives one vector per word; BERT gives a different vector per occurrence depending on context — that's why 'bank' near 'river' differs from 'bank' near 'loan'").

2. **How training actually works (objective function)** — the `deeper` card says "models learn them by prediction" but doesn't name skip-gram vs. CBOW, or the negative-sampling trick. For a master's-bound learner, knowing that word2vec is a binary classifier (does this word appear near that word, yes/no?) trained with noise-contrastive pairs is the key insight. It explains *why* semantic proximity emerges — not magic, just: words forced to share a context-prediction vector end up sharing the vector.

3. **The geometry of the full space** — in real high-dimensional embeddings, the space is highly anisotropic (vectors are not uniformly distributed; they cluster on a narrow cone). "Distance" and "cosine" behave counterintuitively in high dimensions (curse of dimensionality). The 2D toy hides this completely. A sentence warning the learner that the 2D picture is cleaner than reality helps calibrate expectations.

4. **What 2D visualizations actually show** — the lab's 2D map is presented as "a real embedding space, just small." But real embedding visualizations shown in papers (e.g., the famous t-SNE plots) are *projections* of hundreds of dimensions down to 2D, which distorts distances and can create spurious clusters. This is a common misunderstanding: learners assume the 2D visualization is geometrically accurate, when really only local neighborhood structure is roughly preserved.

5. **Bias in embeddings** — mentioned in no current content. The famous "doctor − man + woman ≈ nurse" result from Bolukbasi et al. (2016) is a concrete, memorable demonstration that embeddings encode societal stereotypes from training data. For an ML engineer, knowing that deployed embeddings carry bias (and that debiasing is an active research area) is practically important.

6. **Sentence embeddings vs. word embeddings** — the `ml` note describes RAG/semantic search but doesn't mention that modern retrieval uses *sentence* or *passage* embeddings (e.g., from sentence-BERT or OpenAI's embedding APIs), not individual word vectors. The king−queen analogy is a word2vec-era result; in production retrieval, you encode entire queries and documents.

7. **GloVe** — word2vec is the implicit model throughout, but GloVe (Pennington et al., 2014) is equally prominent in practice and uses a fundamentally different training approach (global co-occurrence matrix factorization rather than local context prediction). Naming it gives the learner vocabulary for reading papers.

---

## Lab ideas

### Lab A (upgrade current lab): "Vector arithmetic — show the work"
Instead of giving the learner the computed coordinates in a hint note, have the lab display an interactive "arithmetic panel": learner clicks tokens "king", "man", "woman" to see their 2D vectors, then clicks +/- buttons to build the sum king−man+woman live. The resulting vector is plotted on the canvas in a distinct color (e.g., dashed orange). The learner then observes which token is nearest to that computed point (not dragging to a hint coordinate). This makes the analogy *computed*, not just spatially navigated. Missions: (1) compute king−man+woman, observe nearest neighbor; (2) try a second analogy pair (e.g., dog−cat+man); (3) find a pair that *fails* — a built-in demonstration that the property is approximate. This directly confronts the "it always works" misconception.

### Lab B (new, harder): "The cosine vs. Euclidean split"
A small space with 4–6 vectors of explicitly different magnitudes (some short, some long). The learner switches between Euclidean distance and cosine similarity using a toggle, observing that the nearest-neighbor ranking *changes*. One token is engineered to be the cosine-nearest but Euclidean-far (high-frequency word with large norm). Mission: find the word that ranks #1 by cosine but #3 by Euclidean. Teaches: why normalization matters; why production vector databases choose the metric they do.

### Lab C (new): "Analogy parallelogram"
Draw the 4 vectors as points. The learner drags lines between man→woman and king→queen and sees they are near-parallel (visually a parallelogram). A "parallel-ness score" (cosine between the two offset vectors) is shown live. Then let the learner try alternative pairs (cat→kitten, dog→puppy?) to see which offset is parallel to which. Teaches: the geometric claim underlying analogy arithmetic, not just the arithmetic result.

### Lab D (new, stretch): "Static vs. contextual"
Show the word "bank" in two sentences. A slider controls "context" — as the learner slides context from "river bank" to "bank account," the plotted position of "bank" moves (animated) toward different clusters. Contrasts word2vec (single fixed point) with BERT-style contextual embeddings (dynamic position). High value for the key gap this lesson currently ignores.

---

## Content improvements

### `learn` section
- After the analogy formula, add: *"This arithmetic is approximate and data-dependent — in some models and for some pairs it holds beautifully; for others it breaks down. It also mirrors training-data biases: the same gender direction that maps king→queen can map doctor→nurse."*
- Add a fourth bullet: *"Static vs. contextual: word2vec gives every token one fixed vector regardless of context ('bank' = same vector whether it means a river bank or a financial institution). Modern transformer models produce different vectors per occurrence — the embedding layer is just the starting point; attention layers rewrite it."*
- Replace "cosine / distance" with *"cosine similarity (the angle between vectors, ignoring magnitude) — this is why two short vs. two long vectors pointing the same direction are equally 'similar.'"*

### `ml` note
- Add: *"In production semantic search (OpenAI's text-embedding-* models, sentence-BERT), whole sentences or passages are embedded — not individual words. The resulting 1536- or 3072-d vectors encode the full query or document. The toy lab illustrates the geometry; real RAG encodes chunks of text."*
- Replace "just small enough to see" with *"projected to 2D for visibility — real embedding spaces are 768–3072 dimensions, and projection distorts distances, which is why t-SNE/UMAP visualizations must be read cautiously."*

### `deeper` cards
- In the "how embeddings get learned" card, add after the Firth quote: *"Specifically, word2vec trains a binary classifier: given a (word, candidate) pair, predict whether the candidate actually appeared nearby (positive) or was randomly sampled (negative). After training, words with shared contexts end up sharing similar vectors — not by design, but as a byproduct of fitting this prediction task. The clever insight: you never need labeled semantic data; the text itself is the supervision."*
- Add a third `deeper` card: *"Bias is geometry too — because embeddings capture statistical regularities in training text, they also capture stereotypes. 'Doctor − man + woman' was shown to yield 'nurse' in models trained on 2010s web text (Bolukbasi et al., 2016). Debiasing embeddings — without destroying their semantic structure — is an active research problem, and understanding it is prerequisite for deploying embeddings responsibly."*

### Quiz
- Quiz Q2 (analogy arithmetic): add a note in the `why` that the result is approximate: *"A learned parallelogram — approximately, not exactly. The result may be queen or a near-synonym, and it can fail for pairs where the relationship isn't linearly encoded."*
- Quiz Q4 (scale): expand the explanation to distinguish static word embeddings (d=100–300 for word2vec/GloVe) from modern sentence-embedding models (d=768–3072) and LLM hidden states (d=768–12288+), so the learner understands the range is wide.

---

## Quiz improvements

### Specific misconceptions to target (add or replace one question)

**Replacement for current Q4 (dimensionality):** The current Q4 is accurate but passive ("mainly differ by having thousands of dimensions"). A better target:

> **Q: In word2vec, the word "bank" has one fixed embedding vector. In a BERT-style model, the same word in "river bank" vs. "bank account" would have…**
> Options: (a) Two different representation vectors, shaped by context / (b) The same vector, because the word is spelled the same / (c) No vector — BERT doesn't use embeddings / (d) A longer vector
> Correct: (a)
> Why: Transformer models re-compute each token's representation through layers of attention, so the same word ID maps to entirely different output vectors depending on surrounding context. This is the fundamental difference between static (word2vec/GloVe) and contextual embeddings.

**Self-contained misconception question to add:**

> **Q: You train a word embedding model on 1990s newspaper text. You then compute "programmer − man + woman." The nearest result is most likely…**
> Options: (a) A word encoding the same era's occupational gender patterns / (b) "Programmer" unchanged / (c) A purely grammatical word / (d) Unpredictable — embeddings don't encode social data
> Correct: (a)
> Why: Embeddings learn from the company words keep in training data. If "programmer" co-occurred predominantly with male-coded contexts in that corpus, the gender offset will reflect that — not objective truth.

**Improved wrong-answer feedback for Q1 (cosine 0.97):**
Current wrong answers don't address the "dot product vs. cosine" distinction. Add a distractor: "Their dot product is large" — with wrong-why: "Dot product grows with vector magnitude AND angle; cosine isolates just the angle. A frequent word can have a large dot product with everything without being semantically related."

---

## Sources (the real URLs you consulted)

1. Mike X Cohen — "King − man + woman = queen is fake news": https://mikexcohen.substack.com/p/king-man-woman-queen-is-fake-news
2. Piotr Migdał — "king − man + woman is queen; but why?": https://p.migdal.pl/blog/2017/01/king-man-woman-queen-why/
3. Allen & Hospedales (2019) — "Analogies Explained: Towards Understanding Word Embeddings" (arXiv): https://arxiv.org/abs/1901.09813
4. Jay Alammar — "The Illustrated Word2Vec": https://jalammar.github.io/illustrated-word2vec/
5. Stanford CS224c slides on word embeddings: https://web.stanford.edu/class/cs224c/slides/s6_word_embedding.pdf
6. Milvus — "How do contextual embeddings like BERT differ from traditional embeddings?": https://milvus.io/ai-quick-reference/how-do-contextual-embeddings-like-bert-differ-from-traditional-embeddings
7. Jiang et al. (2024) — "Is Cosine-Similarity of Embeddings Really About Similarity?" (arXiv 2403.05440): https://arxiv.org/abs/2403.05440
8. Vicki Boykis — "How big are our embeddings now and why?": https://newsletter.vickiboykis.com/archive/how-big-are-our-embeddings-now-and-why/
9. Florian Huber / Netherlands eScience Center — "King − man + woman = King?": https://blog.esciencecenter.nl/king-man-woman-king-9a7fd2935a85
10. Allen & Hospedales, University of Edinburgh research page: https://informatics.ed.ac.uk/news-events/news/news-archive/king-man-woman-queen-the-hidden-algebraic-struct
11. Firth/Harris distributional hypothesis — arxiv survey: https://arxiv.org/pdf/2205.07750
