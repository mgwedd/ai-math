#!/usr/bin/env node
/* Dev-only checker for lesson .formula blocks — NOT part of the build or test
   suite (see test/curriculum.test.mjs for the permanent regression guard).
   Verifies every <div class="formula">$$...$$</div> in the curriculum parses
   as valid KaTeX. Pass one or more lesson ids as argv to scope the check
   (useful mid-migration, before every file has been converted); with no argv
   it checks every lesson. */
import katex from 'katex';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const noop = () => {};
globalThis.window ??= {};
globalThis.devicePixelRatio ??= 1;
globalThis.getComputedStyle ??= () => ({ fontFamily: 'sans-serif' });
globalThis.CanvasRenderingContext2D ??= function () {};
globalThis.document ??= {
  body: {}, getElementById: () => null, addEventListener: noop,
  createElement: () => ({ style: {}, classList: { add: noop, remove: noop }, appendChild: noop, setAttribute: noop }),
};
try {
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: () => null, setItem: noop, removeItem: noop }, configurable: true, writable: true,
  });
} catch { /* fine as-is */ }

await import('../lib/curriculum/index.js');
const { LESSONS } = await import('../lib/curriculum/registry.js');

const scope = new Set(process.argv.slice(2));
const FORMULA_RE = /<div class="formula">([\s\S]*?)<\/div>/g;

function formulasIn(html, id, where, out) {
  if (!html || typeof html !== 'string') return;
  let m; FORMULA_RE.lastIndex = 0;
  while ((m = FORMULA_RE.exec(html))) out.push({ id, where, f: m[1] });
}

const found = [];
for (const l of LESSONS) {
  if (scope.size && !scope.has(l.id)) continue;
  formulasIn(l.learn, l.id, 'learn', found);
  formulasIn(l.ml, l.id, 'ml', found);
  (l.deeper || []).forEach((d, i) => formulasIn(d.body, l.id, `deeper[${i}]`, found));
  (l.labs || []).forEach((lab, i) => formulasIn(lab.intro, l.id, `labs[${i}].intro`, found));
}

let errors = 0;
for (const { id, where, f } of found) {
  const m = f.match(/^\$\$([\s\S]*)\$\$$/);
  if (!m) {
    errors++;
    console.error(`[no-delims] ${id} (${where}): not wrapped in $$...$$ → ${f.slice(0, 90)}`);
    continue;
  }
  const tex = m[1];
  if (/[\x00-\x09\x0b\x0c\x0e-\x1f]/.test(tex)) {
    errors++;
    console.error(`[control-char] ${id} (${where}): stray control char — check for \\n instead of \\\\n → ${JSON.stringify(tex).slice(0, 120)}`);
    continue;
  }
  try {
    katex.renderToString(tex, { throwOnError: true, displayMode: true });
  } catch (e) {
    errors++;
    console.error(`[katex] ${id} (${where}): ${e.message}\n  formula: ${tex}`);
  }
}

// Inline math: \(...\) can appear anywhere in learn/ml/deeper/labs text, not
// just inside a .formula div. Validate every one found, and separately flag
// any <code>...</code> span that still contains raw unicode math notation
// (a sign it hasn't been converted to \(...\) yet) — a heuristic hint, not
// a hard error, since a handful of plain identifiers are fine to leave as-is.
const INLINE_RE = /\\\(([\s\S]*?)\\\)/g;
const CODE_RE = /<code>([^<]*)<\/code>/g;
const MATH_HINT_RE = /[·‖ᵀ√Σ∏∈∞±≥≤≠≈λμσθδΔρη→←↦⟂⊥×∫∂∇]|<su[bp]>/;
// Genuine code/API identifiers correctly left as plain <code>, not math.
const CODE_NOT_MATH = new Set(['+=', 'for', 'ddof', 'var', 'nn.CrossEntropyLoss', 'sparse_categorical_crossentropy', 'numpy.linalg.lstsq', 'linalg.solve(A, b)']);
const BRACKET_VECTOR_RE = /\[[-\d.,\s]+\]/; // e.g. "[6, 8]", "[[2,0],[0,1]]" — no unicode operator needed to be math
const LETTER_EQUALS_BRACKET_RE = /^[a-zA-Z]\w*\s*=\s*\[/; // e.g. "v = [6, 8]", "M = [[2,0],[0,1]]"

function looksLikeMath(content) {
  if (CODE_NOT_MATH.has(content)) return false;
  return MATH_HINT_RE.test(content) || BRACKET_VECTOR_RE.test(content) || LETTER_EQUALS_BRACKET_RE.test(content);
}

let inlineChecked = 0;
let unconvertedHints = 0;
for (const l of LESSONS) {
  if (scope.size && !scope.has(l.id)) continue;
  const fields = [
    ['learn', l.learn], ['ml', l.ml],
    ...(l.deeper || []).map((d, i) => [`deeper[${i}]`, d.body]),
    ...(l.labs || []).map((lab, i) => [`labs[${i}].intro`, lab.intro]),
  ];
  for (const [where, html] of fields) {
    if (!html || typeof html !== 'string') continue;
    let m;
    INLINE_RE.lastIndex = 0;
    while ((m = INLINE_RE.exec(html))) {
      inlineChecked++;
      const tex = m[1];
      if (/[\x00-\x09\x0b\x0c\x0e-\x1f]/.test(tex)) {
        errors++;
        console.error(`[control-char-inline] ${l.id} (${where}): stray control char → ${JSON.stringify(tex).slice(0, 120)}`);
        continue;
      }
      try {
        katex.renderToString(tex, { throwOnError: true, displayMode: false });
      } catch (e) {
        errors++;
        console.error(`[katex-inline] ${l.id} (${where}): ${e.message}\n  formula: ${tex}`);
      }
    }
    CODE_RE.lastIndex = 0;
    let cm;
    while ((cm = CODE_RE.exec(html))) {
      if (looksLikeMath(cm[1])) {
        unconvertedHints++;
        console.error(`[unconverted-hint] ${l.id} (${where}): <code> still has raw math notation → ${cm[1].slice(0, 60)}`);
      }
    }
  }
}

// Raw-source sweep: authored math also lives OUTSIDE the LESSONS data —
// interactive labs registered as INTERACTIVES.xxx = function(stage, api){...}
// pass HTML strings straight to api.predict()/api.missions() as function-call
// arguments, never touching the LESSONS array the checks above walk. A
// <code> span with math notation in there is invisible to any scan that only
// walks LESSONS (this is exactly how lib/curriculum/la-core-labs.js's 12
// unconverted vector/matrix spans shipped unnoticed). Scan every curriculum
// file's raw text instead, so authoring location can't hide anything.
const curriculumDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'curriculum');
let rawHints = 0;
for (const file of readdirSync(curriculumDir)) {
  if (!file.endsWith('.js')) continue;
  const text = readFileSync(join(curriculumDir, file), 'utf8');
  CODE_RE.lastIndex = 0;
  let m;
  while ((m = CODE_RE.exec(text))) {
    if (looksLikeMath(m[1])) {
      rawHints++;
      console.error(`[raw-source-hint] ${file}: <code> still has unconverted math notation → ${m[1].slice(0, 60)}`);
    }
  }
}

console.log(`Checked ${found.length} formula(s), ${inlineChecked} inline \\(...\\) span(s)${scope.size ? ` (scoped to ${[...scope].join(', ')})` : ''}, ${errors} error(s), ${unconvertedHints} unconverted <code> hint(s) (LESSONS-scoped), ${rawHints} unconverted <code> hint(s) (whole-repo raw-source sweep).`);
process.exit(errors || rawHints ? 1 : 0);
