/* Post-processes freshly-injected lesson HTML: renders LaTeX math (KaTeX) and
   syntax-highlights fenced code blocks (Prism). The engine builds lesson views
   as raw innerHTML strings (see engine.js), so this runs as a DOM pass right
   after each injection rather than as part of a component tree.

   Prism is loaded lazily via dynamic import — its core has a top-level
   `window.setTimeout(...)` auto-highlight hook that assumes a real browser
   `window`/`document` and throws under the plain-node stubs the curriculum
   tests run against (see test/curriculum.test.mjs), so it must never load
   as a static import in engine.js's module graph. */
import renderMathInElement from 'katex/contrib/auto-render';

const MATH_DELIMITERS = [
  { left: '$$', right: '$$', display: true },
  { left: '\\(', right: '\\)', display: false },
];

let prismPromise;
function loadPrism() {
  if (!prismPromise) {
    // Must load strictly in sequence: prism-core sets the `Prism` global that
    // language components (prism-python.js) assign onto directly with no
    // import of their own — loading them in parallel races the two chunks
    // and the language component throws "Prism is not defined".
    prismPromise = import('prismjs')
      .then((core) => import('prismjs/components/prism-python').then(() => core.default));
  }
  return prismPromise;
}

// Prism's core assumes a real DOM (`instanceof Element` checks) — under the
// node-with-DOM-stubs environment the curriculum/mission tests run in,
// `Element` is never defined, so skip loading it there entirely.
const canHighlightCode = () => typeof Element !== 'undefined';

export function enhanceContent(root) {
  if (!root) return;
  try {
    renderMathInElement(root, { delimiters: MATH_DELIMITERS, throwOnError: false });
  } catch { /* a malformed formula in one lesson shouldn't break the view */ }
  if (!canHighlightCode()) return;
  loadPrism().then((Prism) => Prism.highlightAllUnder(root)).catch(() => {});
}
