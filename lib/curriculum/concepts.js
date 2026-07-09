/* ================================================================
   CONCEPT REGISTRY — the KB spine (see docs/KNOWLEDGE-BASE-PLAN.md §6).
   ----------------------------------------------------------------
   Every quiz question carries a free-text q.tag (a short concept label,
   e.g. 'magnitude', 'dot product arithmetic'). This module turns that
   free text into a validated, canonical taxonomy:

     registerConcept({
       id:        'dot-product',   // slug: ^[a-z0-9-]{1,64}$, stable join key
       world:     'la',            // one of: pre | la | calc | prob | ml
       title:     'Dot product & cosine similarity',
       wikipedia: 'Dot_product',   // en.wikipedia page title (research stage)
       wolfram:   'dot product of two vectors',  // optional query seed (verify
                                                  // stage); omit for concepts
                                                  // that aren't Wolfram-checkable
       prereqs:   ['vectors', 'vector-operations'],  // concept slugs
     });

   registerConcept() is idempotent by id (re-registering replaces in place,
   same pattern as registerLesson in ./registry.js) and logs a validation
   error the moment a malformed concept is registered.

   TAG_ALIASES maps the EXISTING free-text q.tag strings used across
   lib/curriculum/*.js to their canonical concept slug, so the legacy tags
   don't have to be rewritten in every lesson file. A tag resolves if it
   is EITHER already a registered concept id OR a key in TAG_ALIASES whose
   value is a registered concept id — see resolveTag().

   validateConcepts() cross-checks the registry itself (world enum, prereq
   slugs resolve) — pure, no lesson data needed. validateLessonTags(LESSONS)
   is the second check: every q.tag on every quiz question across the whole
   curriculum must resolve. index.js calls both, after validateCurriculum(),
   once every lesson module has loaded — same "log loudly at load time, and
   let the test suite assert the same check headlessly" pattern as the rest
   of the curriculum registry.
   ================================================================ */

const SLUG_RE = /^[a-z0-9-]{1,64}$/;
const WORLDS = new Set(['pre', 'la', 'calc', 'prob', 'ml']);

export const CONCEPTS = new Map();

// Free-text q.tag (as authored in lib/curriculum/*.js) -> canonical concept
// slug. A handful of lessons reuse the exact same tag string for the exact
// same idea (e.g. 'vanishing gradients' in both c-chain and c-jacobian) —
// those map to one shared concept, which is correct, not a collision. The
// one genuine collision found during the tag audit ('chain rule' meaning
// the CALCULUS chain rule in c-chain vs the PROBABILITY chain rule
// P(X,Y)=P(Y)P(X|Y) in prob-structure.js) was resolved by renaming the
// probability lesson's tag to 'probability chain rule' at the source
// (mechanical, one-line edit) rather than forcing an ambiguous alias.
export const TAG_ALIASES = {
  'CI meaning': 'confidence-intervals',
  'CI width vs n': 'confidence-intervals',
  'CIs in ML': 'confidence-intervals',
  'L1 sparsity': 'regularization',
  'L2 ↔ Gaussian': 'regularization',
  'MAP = regularized MLE': 'regularization',
  'NLL = MLE': 'logistic-regression',
  'PCA connection': 'eigenvectors-eigenvalues',
  'PD vs PSD distinction': 'positive-definite-matrices',
  'Pythagoras for the split': 'vector-projection',
  'QR vs normal equations': 'gram-schmidt-qr',
  'ROC axes': 'classifier-evaluation',
  'ReLU geometry': 'neural-networks-mlp',
  'Riemann convergence': 'integrals',
  'Sylvester criterion steps': 'positive-definite-matrices',
  'accuracy trap': 'classifier-evaluation',
  'analogy arithmetic': 'embeddings',
  'architecture': 'transformer-architecture',
  'attention mechanics': 'attention-mechanism',
  'attention output': 'attention-mechanism',
  'axis-aligned bias': 'decision-trees',
  'base rates': 'bayes-theorem',
  'base-rate fallacy': 'bayes-theorem',
  'bayes structure': 'bayes-theorem',
  'bessel correction': 'estimator-bias-variance',
  'bias definition': 'estimator-bias-variance',
  'bias-variance': 'ensemble-methods',
  'binomial→gaussian': 'probability-distributions',
  'block structure': 'transformer-architecture',
  'boundary is linear': 'log-odds-logistic-link',
  'capacity tradeoff': 'overfitting-generalization',
  'capacity/overfitting': 'training-dynamics-capacity',
  'ce decomposition': 'cross-entropy-nll',
  'ce floor is H(p)': 'cross-entropy-nll',
  'ce numeric': 'cross-entropy-nll',
  'chain rule': 'chain-rule',
  'choosing distributions': 'probability-distributions',
  'chord test': 'convexity',
  'classifying critical points': 'critical-points-optimization',
  'clt in training': 'central-limit-theorem',
  'clt statement': 'central-limit-theorem',
  'columns rule': 'matrices-as-transformations',
  'composition': 'functions',
  'composition order': 'matrix-multiplication',
  'computing inverses': 'matrix-inverse',
  'computing rank': 'rank-and-nullspace',
  'computing slope': 'slope-and-linear-fit',
  'computing slopes': 'derivative',
  'conditional independence': 'independence-conditional-independence',
  'conditioning': 'joint-distributions',
  'confident-and-wrong': 'logistic-regression',
  'constants': 'derivative-rules',
  'context length': 'language-models-sampling',
  'convex vs non-convex models': 'convexity',
  'convexity rules': 'convexity',
  'correlation limits': 'covariance-correlation',
  'correlation vs independence': 'independence-conditional-independence',
  'cosine similarity': 'dot-product',
  'covariance is PSD': 'positive-definite-matrices',
  'critical points': 'derivative',
  'cross-entropy': 'entropy-cross-entropy',
  'decorrelation': 'ensemble-methods',
  'definition of e': 'exponential-function',
  'definition of function': 'functions',
  'definition of log': 'logarithms',
  'derivative meaning': 'derivative',
  'design matrix for a line': 'least-squares',
  'det = 0 collapse': 'determinant',
  'det formula': 'determinant',
  'diagonal matrices': 'eigenvectors-eigenvalues',
  'differentiability': 'attention-mechanism',
  'differentiability vs partials': 'partial-derivatives-gradient',
  'distance': 'vectors',
  'dot product arithmetic': 'dot-product',
  'eckart–young': 'svd',
  'eigen definition': 'eigenvectors-eigenvalues',
  'eigenvalue signs determine shape': 'positive-definite-matrices',
  'estimators in ML': 'estimator-bias-variance',
  'evaluating a derivative': 'derivative-rules',
  'evaluating a log': 'logarithms',
  'evaluating a quadratic form': 'positive-definite-matrices',
  'evaluating a sum': 'summation-notation',
  'evaluating functions': 'functions',
  'expectation': 'expectation-random-variables',
  'expectation vs outcome': 'expectation-random-variables',
  'exponential derivatives': 'exponential-function',
  'finding critical points': 'critical-points-optimization',
  'finding stationary distribution': 'markov-chains',
  'forest vs deep tree': 'ensemble-methods',
  'fractional exponents': 'exponents-and-scale',
  'fundamental theorem': 'integrals',
  'gaussian mle': 'maximum-likelihood-estimation',
  'gaussian parameters': 'probability-distributions',
  'generalization': 'overfitting-generalization',
  'global guarantee': 'convexity',
  'gradient as total derivative': 'partial-derivatives-gradient',
  'gradient direction': 'chain-rule',
  'gradient shapes': 'matrix-calculus',
  'gradient vs level sets': 'partial-derivatives-gradient',
  'gradients at scale': 'gradient-descent-at-scale',
  'greedy splitting': 'decision-trees',
  'hallucination': 'language-models-sampling',
  'high dimensions': 'vectors',
  'impurity extremes': 'decision-trees',
  'independence test': 'independence-conditional-independence',
  'indeterminate forms': 'limits',
  'information loss': 'representation-learning',
  'initialization': 'gradient-descent',
  'intercept': 'slope-and-linear-fit',
  'interpreting large p': 'hypothesis-testing-p-values',
  'inverse meaning': 'matrix-inverse',
  'invertibility': 'matrix-inverse',
  'irreducibility': 'markov-chains',
  'jacobian chain rule': 'jacobian-multivariable-chain-rule',
  'jacobian definition': 'jacobian-multivariable-chain-rule',
  'jacobian shape': 'matrix-calculus',
  'joint normalization': 'joint-distributions',
  'kl basics': 'entropy-cross-entropy',
  'lagrange condition': 'lagrange-multipliers',
  'lagrange in ML': 'lagrange-multipliers',
  'law of large numbers': 'expectation-random-variables',
  'learning rate': 'gradient-descent',
  'limit vs value': 'limits',
  'linear combinations': 'vector-operations',
  'local vs global': 'critical-points-optimization',
  'log rules': 'exponential-function',
  'log scale': 'logarithms',
  'log-likelihood': 'maximum-likelihood-estimation',
  'log-sum trick': 'summation-notation',
  'logs of fractions': 'logarithms',
  'lora': 'svd',
  'loss landscape': 'slope-and-linear-fit',
  'lr divergence': 'training-dynamics-capacity',
  'lr too low': 'training-dynamics-capacity',
  'magnitude': 'vectors',
  'marginalization': 'joint-distributions',
  'matrix-vector multiply': 'matrices-as-transformations',
  'max entropy': 'entropy-cross-entropy',
  'mean formula': 'summation-notation',
  'metric choice': 'classifier-evaluation',
  'mi as uncertainty reduction': 'mutual-information',
  'mi numeric': 'mutual-information',
  'mi symmetry': 'mutual-information',
  'mi zero iff independent': 'mutual-information',
  'ml as distributions': 'probability-distributions',
  'mle in ml': 'maximum-likelihood-estimation',
  'mle principle': 'maximum-likelihood-estimation',
  'model output': 'language-models-sampling',
  'multiplying powers': 'exponents-and-scale',
  'n=1 edge case': 'central-limit-theorem',
  'negative det': 'determinant',
  'negative exponents': 'exponents-and-scale',
  'newton on quadratics': 'second-order-methods',
  'nll = kl derivation': 'cross-entropy-nll',
  'non-commutativity': 'matrix-multiplication',
  'null space meaning': 'rank-and-nullspace',
  'numeric one-step computation': 'markov-chains',
  'numeric quadratic form': 'positive-definite-matrices',
  'one-sided limits': 'limits',
  'one-step update': 'markov-chains',
  'orders of magnitude': 'exponents-and-scale',
  'orthogonalisation step': 'gram-schmidt-qr',
  'orthonormal set': 'gram-schmidt-qr',
  'outer product shape': 'independence-conditional-independence',
  'overfitting': 'overfitting-generalization',
  'p-value definition': 'hypothesis-testing-p-values',
  'parameters → geometry': 'neural-networks-mlp',
  'partial derivatives': 'partial-derivatives-gradient',
  'permutation logic': 'hypothesis-testing-p-values',
  'posterior computation': 'bayes-theorem',
  'power rule': 'derivative-rules',
  'probability chain rule': 'joint-distributions',
  'probability densities': 'integrals',
  'product entries': 'matrix-multiplication',
  'product notation': 'summation-notation',
  'product rule': 'logarithms',
  'projection depends on direction, not length': 'vector-projection',
  'query-key geometry': 'attention-mechanism',
  'random variables': 'expectation-random-variables',
  'rank bounds': 'rank-and-nullspace',
  'rank of the update': 'matrix-calculus',
  'rank–nullity': 'rank-and-nullspace',
  'reading graphs': 'functions',
  'reading the limits': 'summation-notation',
  'reading transformations': 'matrices-as-transformations',
  'regression': 'slope-and-linear-fit',
  'representation learning': 'representation-learning',
  'residual is orthogonal': 'vector-projection',
  'retrieval': 'embeddings',
  'reverse-mode efficiency': 'jacobian-multivariable-chain-rule',
  'ridge / regularisation': 'least-squares',
  'roots': 'functions',
  'scalar multiplication': 'vector-operations',
  'scalar projection': 'vector-projection',
  'scale': 'embeddings',
  'scale invariance': 'covariance-correlation',
  'scientific notation': 'exponents-and-scale',
  'second-derivative test': 'convexity',
  'shadow price': 'lagrange-multipliers',
  'sigmoid at the boundary': 'logistic-regression',
  'sigmoid → softmax': 'log-odds-logistic-link',
  'sign of covariance': 'covariance-correlation',
  'sign vs angle': 'dot-product',
  'significance vs size': 'hypothesis-testing-p-values',
  'similarity meaning': 'embeddings',
  'singular systems': 'matrix-inverse',
  'slope sign': 'slope-and-linear-fit',
  'softmax behavior': 'exponential-function',
  'standard error': 'central-limit-theorem',
  'stationary distribution definition': 'markov-chains',
  'steepest direction': 'partial-derivatives-gradient',
  'storage arithmetic': 'svd',
  'svd anatomy': 'svd',
  'tangency picture': 'lagrange-multipliers',
  'taylor terms': 'second-order-methods',
  'temperature': 'language-models-sampling',
  'term-by-term': 'derivative-rules',
  'the Hessian': 'second-order-methods',
  'the lagrangian': 'lagrange-multipliers',
  'the linear-layer gradient': 'matrix-calculus',
  'the normal equations': 'least-squares',
  'the optimization recipe': 'critical-points-optimization',
  'threshold tradeoff': 'classifier-evaluation',
  'training loop': 'training-dynamics-capacity',
  'training objective': 'transformer-architecture',
  'tree overfitting': 'decision-trees',
  'two views, one method': 'regularization',
  'underfitting': 'overfitting-generalization',
  'unit vectors': 'vectors',
  'universal approximation': 'neural-networks-mlp',
  'update rule': 'gradient-descent',
  'vanishing gradients': 'chain-rule',
  'variance bias': 'estimator-bias-variance',
  'vector addition': 'vector-operations',
  'weak learners': 'ensemble-methods',
  'weights as odds ratios': 'log-odds-logistic-link',
  'what is learned': 'transformer-architecture',
  'what is random': 'confidence-intervals',
  'what training actually minimizes': 'cross-entropy-nll',
  'what training changes': 'representation-learning',
  'why R is upper-triangular': 'gram-schmidt-qr',
  'why correlation': 'covariance-correlation',
  'why hidden layer': 'training-dynamics-capacity',
  'why least squares exists': 'least-squares',
  'why nonlinearity': 'neural-networks-mlp',
  'why not Newton': 'second-order-methods',
  'why squared error': 'slope-and-linear-fit',
  'why the sigmoid': 'logistic-regression',
  'z is the log-odds': 'log-odds-logistic-link',
  'zero entropy': 'entropy-cross-entropy',
  // World 4 numerics module (numerics.js, #39)
  'float overflow': 'log-sum-exp',
  'shift invariance': 'log-sum-exp',
  'stable cross-entropy': 'log-sum-exp',
  'LSE cross-entropy recipe': 'log-sum-exp',
  'uniform logits → uniform softmax': 'log-sum-exp',
  'computing condition number': 'numerical-conditioning',
  'condition number bound': 'numerical-conditioning',
  'ill-conditioned least-squares recipe': 'numerical-conditioning',
  'normal equations vs QR': 'numerical-conditioning',
  'solve vs invert': 'numerical-conditioning',
  // Kernels module (ml-kernels.js: ml-margin, ml-kernels)
  'the widest street': 'max-margin-svm',
  'margin width formula': 'max-margin-svm',
  'margin width numeric': 'max-margin-svm',
  'support vectors': 'max-margin-svm',
  'non-support invariance': 'max-margin-svm',
  'soft-margin C': 'max-margin-svm',
  'hinge loss': 'max-margin-svm',
  'svm vs logistic regression': 'max-margin-svm',
  'max-margin derivation': 'max-margin-svm',
  'the feature map': 'kernel-methods',
  'lifting to linear separability': 'kernel-methods',
  'the kernel trick': 'kernel-methods',
  'the RBF kernel': 'kernel-methods',
  'RBF bandwidth': 'kernel-methods',
  'RBF similarity numeric': 'kernel-methods',
  'RBF is infinite-dimensional': 'kernel-methods',
  'Mercer and PSD kernels': 'kernel-methods',
  // Convolution module (ml-conv.js, #63)
  'sliding dot product': 'convolution',
  'cross-correlation vs convolution': 'convolution',
  'kernel as feature detector': 'convolution',
  'edge kernel on flat region': 'convolution',
  'parameter sharing': 'convolution',
  'output size formula': 'convolution',
  'stride and downsampling': 'convolution',
  'padding': 'convolution',
  'parameter count': 'convolution',
  'inductive bias': 'convolution',
  'strided conv vs pooling': 'convolution',
  'feature hierarchy': 'convolutional-networks',
  'receptive field growth': 'convolutional-networks',
  'stacked 3x3 vs 5x5': 'convolutional-networks',
  'translation equivariance': 'convolutional-networks',
  'pooling invariance': 'convolutional-networks',
};

function conceptShapeProblems(c){
  const p = [];
  if(!c || typeof c !== 'object') return ['concept is not an object'];
  if(!c.id || typeof c.id !== 'string' || !SLUG_RE.test(c.id))
    p.push('missing/invalid id (must match ^[a-z0-9-]{1,64}$): '+JSON.stringify(c && c.id));
  if(!WORLDS.has(c.world))
    p.push('invalid world '+JSON.stringify(c.world)+' (must be one of pre,la,calc,prob,ml)');
  if(!c.title || typeof c.title !== 'string') p.push('missing/invalid title');
  if(!c.wikipedia || typeof c.wikipedia !== 'string') p.push('missing/invalid wikipedia page title');
  if(c.wolfram !== undefined && c.wolfram !== null && typeof c.wolfram !== 'string')
    p.push('wolfram must be a string when present');
  if(c.prereqs !== undefined && !Array.isArray(c.prereqs)) p.push('prereqs must be an array of concept slugs');
  return p;
}

// registerConcept — the single validated door into CONCEPTS, mirroring
// registerLesson()'s contract in ./registry.js: structural validation at
// registration time (logs loudly, with the id, the moment something is
// malformed) and idempotent-by-id (re-registering REPLACES in place).
export function registerConcept(concept){
  const problems = conceptShapeProblems(concept);
  if(problems.length){
    const id = (concept && concept.id) || '(unknown id)';
    console.error('[concepts] concept "'+id+'" failed validation:\n  \u00b7 '+problems.join('\n  \u00b7 '));
  }
  const normalized = { prereqs: [], wolfram: undefined, ...concept };
  CONCEPTS.set(normalized.id, normalized);
  return normalized;
}

export function getConcept(id){
  return CONCEPTS.get(id);
}

// A q.tag resolves if it is directly a registered concept id, or a key in
// TAG_ALIASES whose value is a registered concept id. Returns the concept
// (or undefined if it doesn't resolve).
export function resolveTag(tag){
  if(CONCEPTS.has(tag)) return CONCEPTS.get(tag);
  const aliased = TAG_ALIASES[tag];
  return aliased ? CONCEPTS.get(aliased) : undefined;
}

// Cross-reference checks over the concept registry ITSELF (no lesson data
// needed): every concept's world is a known enum value, its id is a valid
// slug, and every prereq slug resolves to another registered concept.
export function validateConcepts(){
  const errs = [];
  for(const c of CONCEPTS.values()){
    if(!SLUG_RE.test(c.id)) errs.push('concept "'+c.id+'": id does not match slug format ^[a-z0-9-]{1,64}$');
    if(!WORLDS.has(c.world)) errs.push('concept "'+c.id+'": invalid world '+JSON.stringify(c.world));
    if(!c.wikipedia || typeof c.wikipedia !== 'string') errs.push('concept "'+c.id+'": missing wikipedia page title');
    for(const pr of (c.prereqs || [])){
      if(!CONCEPTS.has(pr)) errs.push('concept "'+c.id+'": prereq "'+pr+'" is not a registered concept');
    }
  }
  if(errs.length)
    console.error('[concepts] validateConcepts found '+errs.length+' issue(s):\n  \u00b7 '+errs.join('\n  \u00b7 '));
  else
    console.info('[concepts] '+CONCEPTS.size+' concepts registered — validation clean.');
  return errs;
}

// Cross-reference check over the LOADED CURRICULUM: every q.tag on every
// quiz question (across every lesson) must resolve to a registered concept,
// directly or via TAG_ALIASES. Called from index.js once every lesson
// module has loaded (same timing as validateCurriculum()), so it needs the
// live LESSONS array passed in rather than importing it itself.
export function validateLessonTags(lessons){
  const errs = [];
  for(const l of (lessons || [])){
    for(const q of (Array.isArray(l.quiz) ? l.quiz : [])){
      if(!q || !q.tag) continue; // q.tag is optional per-question metadata
      if(!resolveTag(q.tag))
        errs.push('"'+l.id+'": quiz tag '+JSON.stringify(q.tag)+' does not resolve to a registered concept (directly or via TAG_ALIASES)');
    }
  }
  if(errs.length)
    console.error('[concepts] validateLessonTags found '+errs.length+' issue(s):\n  \u00b7 '+errs.join('\n  \u00b7 '));
  else
    console.info('[concepts] all lesson quiz tags resolve to registered concepts.');
  return errs;
}

/* ================================================================
   CONCEPT DEFINITIONS — one per lesson's core idea (a lesson's several
   q.tag facets almost always cluster around a single teachable concept;
   TAG_ALIASES above fans them back in). Grouped by world, in curriculum
   order.
   ================================================================ */

/* ================== FOUNDATIONS ================== */
registerConcept({
  id: 'functions', world: 'pre', title: 'Functions & function notation',
  wikipedia: 'Function_(mathematics)',
  wolfram: 'evaluate f(x) = x^2 - 4x at x = 3',
  prereqs: [],
});
registerConcept({
  id: 'slope-and-linear-fit', world: 'pre', title: 'Slope & fitting a line',
  wikipedia: 'Slope',
  wolfram: 'slope of line through two points',
  prereqs: ['functions'],
});
registerConcept({
  id: 'exponents-and-scale', world: 'pre', title: 'Exponents, roots & scientific notation',
  wikipedia: 'Exponentiation',
  wolfram: 'simplify x^3 * x^5',
  prereqs: [],
});
registerConcept({
  id: 'logarithms', world: 'pre', title: 'Logarithms',
  wikipedia: 'Logarithm',
  wolfram: 'log base 2 of 8',
  prereqs: ['exponents-and-scale'],
});
registerConcept({
  id: 'summation-notation', world: 'pre', title: 'Sigma notation & sums',
  wikipedia: 'Summation',
  wolfram: 'sum of i from 1 to 10',
  prereqs: [],
});

/* ================== LINEAR ALGEBRA ================== */
registerConcept({
  id: 'vectors', world: 'la', title: 'Vectors & magnitude',
  wikipedia: 'Euclidean_vector',
  wolfram: 'magnitude of vector (5, 12)',
  prereqs: [],
});
registerConcept({
  id: 'vector-operations', world: 'la', title: 'Vector addition & scalar multiplication',
  wikipedia: 'Linear_combination',
  wolfram: '2*(3,1) + (1,2)',
  prereqs: ['vectors'],
});
registerConcept({
  id: 'dot-product', world: 'la', title: 'Dot product & cosine similarity',
  wikipedia: 'Dot_product',
  wolfram: 'dot product of (2,3) and (4,-1)',
  prereqs: ['vectors', 'vector-operations'],
});
registerConcept({
  id: 'matrices-as-transformations', world: 'la', title: 'Matrices as linear transformations',
  wikipedia: 'Linear_map',
  wolfram: 'apply matrix {{1,0},{0,-1}} to vector (3,4)',
  prereqs: ['vectors', 'vector-operations'],
});
registerConcept({
  id: 'matrix-multiplication', world: 'la', title: 'Matrix multiplication & composition',
  wikipedia: 'Matrix_multiplication',
  wolfram: 'multiply matrices {{0,-1},{1,0}} and {{1,1},{0,1}}',
  prereqs: ['matrices-as-transformations'],
});
registerConcept({
  id: 'determinant', world: 'la', title: 'The determinant',
  wikipedia: 'Determinant',
  wolfram: 'determinant of {{3,1},{2,2}}',
  prereqs: ['matrices-as-transformations'],
});
registerConcept({
  id: 'eigenvectors-eigenvalues', world: 'la', title: 'Eigenvectors & eigenvalues',
  wikipedia: 'Eigenvalues_and_eigenvectors',
  wolfram: 'eigenvalues of {{2,1},{1,2}}',
  prereqs: ['matrices-as-transformations', 'determinant'],
});
registerConcept({
  id: 'matrix-inverse', world: 'la', title: 'Solving Ax = b & the matrix inverse',
  wikipedia: 'Invertible_matrix',
  wolfram: 'inverse of {{2,1},{1,1}}',
  prereqs: ['determinant', 'matrices-as-transformations'],
});
registerConcept({
  id: 'rank-and-nullspace', world: 'la', title: 'Rank & the null space',
  wikipedia: 'Rank_(linear_algebra)',
  wolfram: 'rank of {{1,2},{2,4}}',
  prereqs: ['matrices-as-transformations'],
});
registerConcept({
  id: 'svd', world: 'la', title: 'Singular value decomposition',
  wikipedia: 'Singular_value_decomposition',
  wolfram: 'singular value decomposition of {{1,0},{0,2}}',
  prereqs: ['eigenvectors-eigenvalues', 'rank-and-nullspace'],
});
registerConcept({
  id: 'matrix-calculus', world: 'la', title: 'Matrix calculus: gradients & Jacobians of linear layers',
  wikipedia: 'Matrix_calculus',
  wolfram: 'gradient of A x with respect to x',
  prereqs: ['matrices-as-transformations'],
});
registerConcept({
  id: 'vector-projection', world: 'la', title: 'Vector projection',
  wikipedia: 'Vector_projection',
  wolfram: 'projection of (1,2) onto (3,0)',
  prereqs: ['dot-product'],
});
registerConcept({
  id: 'least-squares', world: 'la', title: 'Least squares regression',
  wikipedia: 'Least_squares',
  wolfram: 'least squares fit for points (1,1),(2,2),(3,4)',
  prereqs: ['vector-projection', 'matrix-inverse'],
});
registerConcept({
  id: 'gram-schmidt-qr', world: 'la', title: 'Gram–Schmidt orthogonalization & QR decomposition',
  wikipedia: 'Gram–Schmidt_process',
  wolfram: 'QR decomposition of {{1,1},{0,1}}',
  prereqs: ['vector-projection', 'least-squares'],
});
registerConcept({
  id: 'markov-chains', world: 'la', title: 'Markov chains & stationary distributions',
  wikipedia: 'Markov_chain',
  wolfram: 'stationary distribution of markov chain {{0.9,0.1},{0.2,0.8}}',
  prereqs: ['matrices-as-transformations'],
});
registerConcept({
  id: 'representation-learning', world: 'la', title: 'Representation learning: matrices as learned transformations',
  wikipedia: 'Feature_learning',
  prereqs: ['matrices-as-transformations', 'determinant'],
});
registerConcept({
  id: 'positive-definite-matrices', world: 'la', title: 'Positive-definite matrices & quadratic forms',
  wikipedia: 'Definite_matrix',
  wolfram: 'eigenvalues of {{2,1},{1,2}}',
  prereqs: ['eigenvectors-eigenvalues'],
});

/* ================== CALCULUS ================== */
registerConcept({
  id: 'derivative', world: 'calc', title: 'The derivative',
  wikipedia: 'Derivative',
  wolfram: 'derivative of x^2 - 4x',
  prereqs: ['slope-and-linear-fit'],
});
registerConcept({
  id: 'derivative-rules', world: 'calc', title: 'Derivative rules (power, sum, constant)',
  wikipedia: 'Differentiation_rules',
  wolfram: 'derivative of 3x^4 + 2x',
  prereqs: ['derivative'],
});
registerConcept({
  id: 'chain-rule', world: 'calc', title: 'The chain rule',
  wikipedia: 'Chain_rule',
  wolfram: 'derivative of sin(x^2) using chain rule',
  prereqs: ['derivative-rules'],
});
registerConcept({
  id: 'limits', world: 'calc', title: 'Limits',
  wikipedia: 'Limit_of_a_function',
  wolfram: 'limit of sin(x)/x as x approaches 0',
  prereqs: ['functions'],
});
registerConcept({
  id: 'exponential-function', world: 'calc', title: 'e and exponential derivatives',
  wikipedia: 'Exponential_function',
  wolfram: 'derivative of e^x',
  prereqs: ['exponents-and-scale', 'logarithms'],
});
registerConcept({
  id: 'gradient-descent', world: 'calc', title: 'Gradient descent',
  wikipedia: 'Gradient_descent',
  prereqs: ['derivative'],
});
registerConcept({
  id: 'critical-points-optimization', world: 'calc', title: 'Finding & classifying critical points',
  wikipedia: 'Maxima_and_minima',
  wolfram: 'critical points of x^3 - 3x',
  prereqs: ['derivative'],
});
registerConcept({
  id: 'convexity', world: 'calc', title: 'Convexity & the second-derivative test',
  wikipedia: 'Convex_function',
  wolfram: 'second derivative of x^4 - 2x^2',
  prereqs: ['critical-points-optimization'],
});
registerConcept({
  id: 'second-order-methods', world: 'calc', title: 'Taylor terms, the Hessian & Newton\'s method',
  wikipedia: 'Newton\'s_method',
  wolfram: 'newton\'s method for x^2 - 2',
  prereqs: ['convexity'],
});
registerConcept({
  id: 'integrals', world: 'calc', title: 'Integrals & the fundamental theorem of calculus',
  wikipedia: 'Fundamental_theorem_of_calculus',
  wolfram: 'integral of x^2 from 0 to 3',
  prereqs: ['derivative'],
});
registerConcept({
  id: 'partial-derivatives-gradient', world: 'calc', title: 'Partial derivatives & the gradient',
  wikipedia: 'Gradient',
  wolfram: 'gradient of x^2 + y^2',
  prereqs: ['derivative'],
});
registerConcept({
  id: 'jacobian-multivariable-chain-rule', world: 'calc', title: 'The Jacobian & multivariable chain rule',
  wikipedia: 'Jacobian_matrix_and_determinant',
  wolfram: 'Jacobian of (x^2+y, x*y)',
  prereqs: ['partial-derivatives-gradient', 'chain-rule', 'matrix-multiplication'],
});
registerConcept({
  id: 'lagrange-multipliers', world: 'calc', title: 'Lagrange multipliers',
  wikipedia: 'Lagrange_multiplier',
  wolfram: 'lagrange multipliers maximize x*y subject to x+y=10',
  prereqs: ['partial-derivatives-gradient'],
});
registerConcept({
  id: 'gradient-descent-at-scale', world: 'calc', title: 'Gradient descent in many dimensions',
  wikipedia: 'Gradient_descent',
  prereqs: ['gradient-descent', 'partial-derivatives-gradient'],
});

/* ================== PROBABILITY & STATISTICS ================== */
registerConcept({
  id: 'joint-distributions', world: 'prob', title: 'Joint distributions & the chain rule of probability',
  wikipedia: 'Joint_probability_distribution',
  prereqs: [],
});
registerConcept({
  id: 'independence-conditional-independence', world: 'prob', title: 'Independence & conditional independence',
  wikipedia: 'Independence_(probability_theory)',
  prereqs: ['joint-distributions'],
});
registerConcept({
  id: 'covariance-correlation', world: 'prob', title: 'Covariance & correlation',
  wikipedia: 'Covariance',
  wolfram: 'covariance of (1,2,3) and (2,4,5)',
  prereqs: ['expectation-random-variables'],
});
registerConcept({
  id: 'expectation-random-variables', world: 'prob', title: 'Random variables & expectation',
  wikipedia: 'Expected_value',
  wolfram: 'expected value of a fair six-sided die',
  prereqs: [],
});
registerConcept({
  id: 'probability-distributions', world: 'prob', title: 'Choosing probability distributions',
  wikipedia: 'Probability_distribution',
  prereqs: ['expectation-random-variables'],
});
registerConcept({
  id: 'bayes-theorem', world: 'prob', title: 'Bayes\' theorem',
  wikipedia: 'Bayes\'_theorem',
  wolfram: 'bayes theorem P(A|B) given P(B|A)=0.9, P(A)=0.01, P(B)=0.1',
  prereqs: ['joint-distributions'],
});
registerConcept({
  id: 'maximum-likelihood-estimation', world: 'prob', title: 'Maximum likelihood estimation',
  wikipedia: 'Maximum_likelihood_estimation',
  prereqs: ['probability-distributions'],
});
registerConcept({
  id: 'central-limit-theorem', world: 'prob', title: 'The central limit theorem',
  wikipedia: 'Central_limit_theorem',
  prereqs: ['expectation-random-variables'],
});
registerConcept({
  id: 'entropy-cross-entropy', world: 'prob', title: 'Entropy & cross-entropy',
  wikipedia: 'Entropy_(information_theory)',
  wolfram: 'entropy of probability distribution {0.5, 0.5}',
  prereqs: ['probability-distributions'],
});
registerConcept({
  id: 'estimator-bias-variance', world: 'prob', title: 'Estimators: bias & variance',
  wikipedia: 'Bias_of_an_estimator',
  prereqs: ['expectation-random-variables'],
});
registerConcept({
  id: 'confidence-intervals', world: 'prob', title: 'Confidence intervals',
  wikipedia: 'Confidence_interval',
  prereqs: ['central-limit-theorem', 'estimator-bias-variance'],
});
registerConcept({
  id: 'hypothesis-testing-p-values', world: 'prob', title: 'Hypothesis testing & p-values',
  wikipedia: 'P-value',
  prereqs: ['confidence-intervals'],
});
registerConcept({
  id: 'cross-entropy-nll', world: 'prob', title: 'Cross-entropy loss & negative log-likelihood',
  wikipedia: 'Cross_entropy',
  prereqs: ['entropy-cross-entropy', 'maximum-likelihood-estimation'],
});
registerConcept({
  id: 'mutual-information', world: 'prob', title: 'Mutual information',
  wikipedia: 'Mutual_information',
  prereqs: ['entropy-cross-entropy', 'independence-conditional-independence'],
});

/* ================== MACHINE LEARNING ================== */
registerConcept({
  id: 'training-dynamics-capacity', world: 'ml', title: 'Training dynamics: learning rate & capacity',
  wikipedia: 'Learning_rate',
  prereqs: ['gradient-descent'],
});
registerConcept({
  id: 'logistic-regression', world: 'ml', title: 'Logistic regression',
  wikipedia: 'Logistic_regression',
  wolfram: 'sigmoid function at x=2',
  prereqs: ['cross-entropy-nll'],
});
registerConcept({
  id: 'regularization', world: 'ml', title: 'Regularization: L1, L2 & MAP',
  wikipedia: 'Regularization_(mathematics)',
  prereqs: ['maximum-likelihood-estimation'],
});
registerConcept({
  id: 'log-odds-logistic-link', world: 'ml', title: 'Log-odds & the logistic link function',
  wikipedia: 'Logit',
  wolfram: 'logit(0.8)',
  prereqs: ['logistic-regression'],
});
registerConcept({
  id: 'decision-trees', world: 'ml', title: 'Decision trees',
  wikipedia: 'Decision_tree_learning',
  prereqs: ['entropy-cross-entropy'],
});
registerConcept({
  id: 'ensemble-methods', world: 'ml', title: 'Ensemble methods: bagging & boosting',
  wikipedia: 'Ensemble_learning',
  prereqs: ['decision-trees', 'estimator-bias-variance'],
});
registerConcept({
  id: 'classifier-evaluation', world: 'ml', title: 'Evaluating classifiers: ROC & thresholds',
  wikipedia: 'Receiver_operating_characteristic',
  prereqs: ['logistic-regression'],
});

/* --- Kernels module (lib/curriculum/ml-kernels.js: ml-margin, ml-kernels) --- */
registerConcept({
  id: 'max-margin-svm', world: 'ml', title: 'Max-margin classification & support vector machines',
  wikipedia: 'Support_vector_machine',
  prereqs: ['logistic-regression', 'dot-product', 'lagrange-multipliers'],
});
registerConcept({
  id: 'kernel-methods', world: 'ml', title: 'The kernel trick & feature maps',
  wikipedia: 'Kernel_method',
  prereqs: ['max-margin-svm', 'positive-definite-matrices'],
});
registerConcept({
  id: 'overfitting-generalization', world: 'ml', title: 'Overfitting, underfitting & generalization',
  wikipedia: 'Overfitting',
  prereqs: [],
});
registerConcept({
  id: 'neural-networks-mlp', world: 'ml', title: 'Multilayer perceptrons & nonlinearity',
  wikipedia: 'Multilayer_perceptron',
  prereqs: ['logistic-regression', 'chain-rule'],
});
registerConcept({
  id: 'embeddings', world: 'ml', title: 'Embeddings',
  wikipedia: 'Word_embedding',
  prereqs: ['dot-product', 'vectors'],
});
registerConcept({
  id: 'attention-mechanism', world: 'ml', title: 'Attention mechanism',
  wikipedia: 'Attention_(machine_learning)',
  prereqs: ['dot-product', 'embeddings'],
});
registerConcept({
  id: 'language-models-sampling', world: 'ml', title: 'Language models: sampling & context',
  wikipedia: 'Large_language_model',
  prereqs: ['attention-mechanism'],
});
registerConcept({
  id: 'transformer-architecture', world: 'ml', title: 'Transformer architecture (capstone)',
  wikipedia: 'Transformer_(deep_learning_architecture)',
  prereqs: ['attention-mechanism', 'language-models-sampling'],
});

/* --- Convolution module (lib/curriculum/ml-conv.js: ml-conv, ml-cnn) --- */
registerConcept({
  id: 'convolution', world: 'ml', title: 'Convolution & kernels',
  wikipedia: 'Kernel_(image_processing)',
  prereqs: ['dot-product', 'neural-networks-mlp'],
});
registerConcept({
  id: 'convolutional-networks', world: 'ml', title: 'Convolutional neural networks',
  wikipedia: 'Convolutional_neural_network',
  prereqs: ['convolution', 'neural-networks-mlp'],
});

/* --- World 4 numerics module (lib/curriculum/numerics.js, added in #39) --- */
registerConcept({
  id: 'log-sum-exp', world: 'ml', title: 'Log-sum-exp & numerically stable softmax',
  wikipedia: 'LogSumExp',
  wolfram: 'log(exp(1000) + exp(1001))',
  prereqs: ['exponential-function', 'cross-entropy-nll'],
});
registerConcept({
  id: 'numerical-conditioning', world: 'ml', title: 'Condition number & numerical stability',
  wikipedia: 'Condition_number',
  wolfram: 'condition number of {{2, 1}, {1, 2}}',
  prereqs: ['least-squares', 'matrix-inverse'],
});

