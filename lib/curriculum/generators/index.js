/* ================================================================
   GENERATOR REGISTRY — barrel + lesson↔generator bridge (KB plan §7, PR 5).

   Importing this module registers every launch generator (side-effect
   imports below) and re-exports the registry surface the engine uses:
   GENERATORS, generate(), getGenerator().

   THE RETAKE BRIDGE
   -----------------
   The engine's retake mixer needs to know which generators drill the
   concepts a given lesson teaches. Generators are tagged with a concept
   SLUG (e.g. 'determinant'); lesson quiz questions carry a free-text
   q.tag (e.g. 'det formula'). A later PR introduces the canonical concept
   registry that formally maps one to the other; until it lands we DON'T
   import it (keeps PR 5 independent of PR 1). Instead we keep a small,
   explicit, self-contained table of just the lesson tags our launch
   generators serve → their concept slug. Anything not in the table simply
   doesn't get a generated variant — a safe, additive default.
   ================================================================ */
import { GENERATORS, generate, getGenerator } from './registry.js';

// side-effect registration of every launch generator, grouped by world
import './linear-algebra.js';
import './calculus.js';
import './probability.js';
import './foundations.js';

export { GENERATORS, generate, getGenerator };

// Free-text lesson q.tag  →  the concept slug our generators use. Scoped to
// the tags the launch generators actually cover; extend as generators grow.
export const LESSON_TAG_CONCEPT = {
  // determinant
  'det formula': 'determinant',
  'det = 0 collapse': 'determinant',
  'negative det': 'determinant',
  // matrix inverse
  'inverse meaning': 'matrix-inverse',
  'computing inverses': 'matrix-inverse',
  'singular systems': 'matrix-inverse',
  // dot product
  'dot product arithmetic': 'dot-product',
  'sign vs angle': 'dot-product',
  'similarity meaning': 'dot-product',
  // matrix multiplication / shape
  'matrix-vector multiply': 'matrix-multiplication',
  'non-commutativity': 'matrix-multiplication',
  // derivative (power) rules
  'power rule': 'derivative-rules',
  'constants': 'derivative-rules',
  'evaluating a derivative': 'derivative-rules',
  'term-by-term': 'derivative-rules',
  // chain rule
  'chain rule': 'chain-rule',
  'gradient direction': 'chain-rule',
  'vanishing gradients': 'chain-rule',
  // bayes
  'base rates': 'bayes-theorem',
  'bayes structure': 'bayes-theorem',
  'posterior computation': 'bayes-theorem',
  // expectation
  'expectation': 'expectation-random-variables',
  'random variables': 'expectation-random-variables',
  'law of large numbers': 'expectation-random-variables',
  'expectation vs outcome': 'expectation-random-variables',
  // logarithms
  'definition of log': 'logarithms',
  'evaluating a log': 'logarithms',
  'log rules': 'logarithms',
  'log scale': 'logarithms',
  'logs of fractions': 'logarithms',
  // exponents & scale
  'multiplying powers': 'exponents-and-scale',
  'negative exponents': 'exponents-and-scale',
  'fractional exponents': 'exponents-and-scale',
  'scientific notation': 'exponents-and-scale',
  'orders of magnitude': 'exponents-and-scale',
};

// The set of concept slugs a lesson teaches, inferred from its quiz tags.
export function conceptsForLesson(lesson){
  const out = new Set();
  for(const q of (lesson && Array.isArray(lesson.quiz) ? lesson.quiz : [])){
    const c = q && q.tag && LESSON_TAG_CONCEPT[q.tag];
    if(c) out.add(c);
  }
  return out;
}

// Every registered generator whose concept the lesson teaches. Pure; the
// engine calls this once per retake to decide whether a generated variant is
// available and, if so, which generators to draw from.
export function generatorsForLesson(lesson){
  const concepts = conceptsForLesson(lesson);
  if(!concepts.size) return [];
  return [...GENERATORS.values()].filter(g => concepts.has(g.concept));
}
