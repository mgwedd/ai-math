/* Curriculum smoke tests — zero dependencies, run by the pre-push hook and
   `npm test`. Loads the real curriculum in Node (browser globals stubbed as
   no-ops, since interactive functions only run in the browser) and asserts
   the data layer is coherent. Catches: syntax/load errors (the Unicode-prime
   / unterminated-string class), unregistered interactive keys, misaligned
   feedback tables, duplicate ids, malformed quizzes — before they ship.

   Exit code 0 = pass, 1 = fail. */

// --- minimal browser-global stubs (nothing here is exercised at import; this
//     is insurance against a stray top-level DOM reference sneaking in) ---
const noop = () => {};
globalThis.window ??= {};
globalThis.devicePixelRatio ??= 1;
globalThis.localStorage ??= { getItem: () => null, setItem: noop, removeItem: noop };
globalThis.getComputedStyle ??= () => ({ fontFamily: 'sans-serif' });
globalThis.CanvasRenderingContext2D ??= function () {};
globalThis.document ??= {
  body: {}, getElementById: () => null, addEventListener: noop,
  createElement: () => ({ style: {}, classList: { add: noop, remove: noop }, appendChild: noop, setAttribute: noop }),
};

let failures = 0;
const ok = (cond, msg) => { if (cond) { console.log('  ✓ ' + msg); } else { failures++; console.error('  ✗ ' + msg); } };
const section = (t) => console.log('\n' + t);

// ---------------------------------------------------------------- load
section('load: the full curriculum imports without error');
let reg;
try {
  await import('../lib/curriculum/index.js');       // registers every lesson + interactive
  reg = await import('../lib/curriculum/registry.js'); // same module instance → populated
  ok(true, 'curriculum + registry modules loaded');
} catch (e) {
  console.error('  ✗ import threw:', e && e.stack || e);
  process.exit(1);
}
const { LESSONS, INTERACTIVES, WRONG_WHY, QMETA, registerLesson, validateCurriculum } = reg;

// ---------------------------------------------------- real-data integrity
section('data: the shipped curriculum is coherent');
ok(LESSONS.length >= 40, `lesson count ${LESSONS.length} ≥ 40`);
ok(validateCurriculum().length === 0, 'validateCurriculum() reports zero issues');

const ids = LESSONS.map(l => l.id);
ok(new Set(ids).size === ids.length, 'all lesson ids are unique');

let badInteractive = 0, badQuiz = 0;
for (const l of LESSONS) {
  const keys = (l.labs && l.labs.length) ? l.labs.map(x => x && x.interactive) : [l.interactive];
  for (const k of keys) if (!k || typeof INTERACTIVES[k] !== 'function') badInteractive++;
  if (!Array.isArray(l.quiz) || !l.quiz.length) { badQuiz++; continue; }
  for (const q of l.quiz)
    if (!Array.isArray(q.opts) || q.opts.length < 2 || !Number.isInteger(q.a) || q.a < 0 || q.a >= q.opts.length) badQuiz++;
}
ok(badInteractive === 0, `every lesson's interactive/labs resolve (${badInteractive} unresolved)`);
ok(badQuiz === 0, `every quiz question is well-formed (${badQuiz} malformed)`);

// every world tag is one the engine knows about
const KNOWN_WORLDS = new Set(['pre', 'la', 'calc', 'prob', 'ml']);
ok(LESSONS.every(l => KNOWN_WORLDS.has(l.world)), 'every lesson has a known world tag');

// ---------------------------------------------------- registerLesson unit
section('unit: registerLesson validation + idempotency');
const before = LESSONS.length;
const origErr = console.error; let errLogged = false;
console.error = () => { errLogged = true; };            // capture the expected shape warning
registerLesson({ id: '__smoke_bad__', world: 'pre', title: 'x', quiz: [{ q: '?', opts: ['a', 'b'], a: 9 }] });
console.error = origErr;
ok(errLogged, 'a malformed lesson logs a validation error at registration');

INTERACTIVES.__smoke_i__ = () => {};
registerLesson({ id: '__smoke_dup__', world: 'pre', title: 'v1', interactive: '__smoke_i__', quiz: [{ q: '?', opts: ['a', 'b'], a: 0 }] });
const afterFirst = LESSONS.length;
registerLesson({ id: '__smoke_dup__', world: 'pre', title: 'v2', interactive: '__smoke_i__', quiz: [{ q: '?', opts: ['a', 'b'], a: 1 }] });
ok(LESSONS.length === afterFirst, 're-registering an id replaces in place (no duplicate)');
ok(LESSONS.find(l => l.id === '__smoke_dup__').title === 'v2', 'the replacement wins');
// tidy the synthetic lessons back out so a repeated in-process run stays clean
for (const id of ['__smoke_bad__', '__smoke_dup__']) { const i = LESSONS.findIndex(l => l.id === id); if (i >= 0) LESSONS.splice(i, 1); }
void before; void QMETA; void WRONG_WHY;

// -------------------------------------------------------------- report
console.log('\n' + (failures ? `SMOKE TESTS FAILED — ${failures} assertion(s)` : `SMOKE TESTS PASSED — ${LESSONS.length} lessons`));
process.exit(failures ? 1 : 0);
