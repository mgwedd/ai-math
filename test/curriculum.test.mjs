/* Curriculum smoke tests (Vitest). Loads the REAL curriculum in a node
   environment with browser globals stubbed as no-ops — the interactive lab
   functions only run in the browser, and engine.js has no top-level DOM
   execution, so importing the data layer is safe here. Guards against:
   syntax/load errors (the Unicode-prime / smart-quote class), unregistered
   interactive keys, malformed quizzes, misaligned inline feedback, duplicate
   ids — before they ship. */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import katex from 'katex';
import { readFileSync, readdirSync } from 'node:fs';

// --- browser-global stubs: must exist BEFORE the curriculum imports. This is
//     insurance against a stray top-level DOM reference sneaking in. ---
const noop = () => {};
globalThis.window ??= {};
globalThis.devicePixelRatio ??= 1;
// define localStorage without READING the global first — Node 26 ships an
// experimental localStorage getter that warns on access; overwrite it outright.
try {
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: () => null, setItem: noop, removeItem: noop },
    configurable: true, writable: true,
  });
} catch { /* a non-configurable host localStorage is fine as-is */ }
globalThis.getComputedStyle ??= () => ({ fontFamily: 'sans-serif' });
globalThis.CanvasRenderingContext2D ??= function () {};
globalThis.document ??= {
  body: {}, getElementById: () => null, addEventListener: noop,
  createElement: () => ({ style: {}, classList: { add: noop, remove: noop }, appendChild: noop, setAttribute: noop }),
};

let reg, LESSONS, INTERACTIVES, registerLesson, validateCurriculum;

// removes a synthetic lesson so a repeated run stays clean
const drop = (id) => { const i = LESSONS.findIndex(l => l.id === id); if (i >= 0) LESSONS.splice(i, 1); };

beforeAll(async () => {
  await import('../lib/curriculum/index.js');          // registers every lesson + interactive
  reg = await import('../lib/curriculum/registry.js');  // same module instance → populated
  ({ LESSONS, INTERACTIVES, registerLesson, validateCurriculum } = reg);
});

describe('load', () => {
  it('imports the full curriculum without error', () => {
    expect(Array.isArray(LESSONS)).toBe(true);
    expect(typeof validateCurriculum).toBe('function');
  });
});

describe('the shipped curriculum is coherent', () => {
  it('registers at least 40 lessons', () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(40);
  });

  it('passes validateCurriculum() with zero issues', () => {
    expect(validateCurriculum()).toEqual([]);
  });

  it('has unique lesson ids', () => {
    const ids = LESSONS.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolves every interactive / labs key to a registered function', () => {
    const unresolved = [];
    for (const l of LESSONS) {
      const keys = (l.labs && l.labs.length) ? l.labs.map(x => x && x.interactive) : [l.interactive];
      for (const k of keys) if (!k || typeof INTERACTIVES[k] !== 'function') unresolved.push(`${l.id} → ${k}`);
    }
    expect(unresolved).toEqual([]);
  });

  it('has a well-formed quiz on every lesson (type-aware)', () => {
    const bad = [];
    for (const l of LESSONS) {
      if (!Array.isArray(l.quiz) || !l.quiz.length) { bad.push(`${l.id}: no quiz`); continue; }
      l.quiz.forEach((q, qi) => {
        const type = q.type ?? 'mc';
        if (type === 'mc') {
          if (!Array.isArray(q.opts) || q.opts.length < 2 || !Number.isInteger(q.a) || q.a < 0 || q.a >= q.opts.length)
            bad.push(`${l.id}[${qi}] (mc)`);
        } else if (type === 'numeric') {
          if (!Number.isFinite(q.answer) || !Number.isFinite(q.tol) || q.tol < 0) bad.push(`${l.id}[${qi}] (numeric)`);
        } else if (type === 'order') {
          if (!Array.isArray(q.steps) || q.steps.length < 2) bad.push(`${l.id}[${qi}] (order)`);
        } else {
          bad.push(`${l.id}[${qi}] unknown type ${type}`);
        }
      });
    }
    expect(bad).toEqual([]);
  });

  it('ships at least one numeric and one order question as demonstrations', () => {
    const types = LESSONS.flatMap(l => (l.quiz || []).map(q => q.type ?? 'mc'));
    expect(types).toContain('numeric');
    expect(types).toContain('order');
  });

  it('tags every lesson with a world the engine knows', () => {
    const KNOWN = new Set(['pre', 'la', 'calc', 'prob', 'ml']);
    expect(LESSONS.filter(l => !KNOWN.has(l.world)).map(l => l.id)).toEqual([]);
  });

  it('carries wrong-answer feedback INLINE on questions, with valid keys (step 2)', () => {
    let inline = 0;
    const badKeys = [];
    for (const l of LESSONS) for (const q of (l.quiz || [])) {
      if (!q.wrong) continue;
      inline++;
      for (const oi of Object.keys(q.wrong))
        if (!Number.isInteger(+oi) || +oi < 0 || +oi >= q.opts.length || +oi === q.a) badKeys.push(`${l.id} → opt ${oi}`);
    }
    expect(inline).toBeGreaterThanOrEqual(140); // regression guard: the tables were not silently dropped
    expect(badKeys).toEqual([]);
  });

  it('has no WRONG_WHY / QMETA parallel tables left in the registry', () => {
    expect('WRONG_WHY' in reg).toBe(false);
    expect('QMETA' in reg).toBe(false);
  });
});

describe('cumulative qualifying-exam pool + retake nudges (P0 #7)', () => {
  let engine, SCORING;
  beforeAll(async () => {
    engine = await import('../lib/engine.js'); // no top-level DOM exec → safe under stubs
    SCORING = engine.SCORING;
  });

  it('exposes an exam scoring knob with sane bounds', () => {
    expect(SCORING.exam).toBeTruthy();
    expect(SCORING.exam.draw).toBeGreaterThanOrEqual(1);
    expect(SCORING.exam.passPct).toBeGreaterThan(0);
    expect(SCORING.exam.passPct).toBeLessThanOrEqual(1);
    expect(SCORING.exam.pass).toBeGreaterThan(0);
  });

  it('draws the exam pool CUMULATIVELY from this world and all prior worlds', () => {
    const { examPoolFor, WORLD_ORDER, worldLessons } = engine;
    let prevLen = -1;
    for (const w of WORLD_ORDER) {
      const pool = examPoolFor(w, WORLD_ORDER, worldLessons);
      for (const r of pool) {                       // every ref resolves to a real question
        const l = LESSONS.find(x => x.id === r.lessonId);
        expect(l).toBeTruthy();
        expect(l.quiz[r.qi]).toBeTruthy();
      }
      expect(pool.length).toBeGreaterThanOrEqual(prevLen); // cumulative → monotonically grows
      prevLen = pool.length;
    }
  });

  it('the LAST world pool includes questions from the FIRST world', () => {
    const { examPoolFor, WORLD_ORDER, worldLessons } = engine;
    const first = WORLD_ORDER[0], last = WORLD_ORDER[WORLD_ORDER.length - 1];
    const firstIds = new Set(worldLessons(first).map(l => l.id));
    const lastPool = examPoolFor(last, WORLD_ORDER, worldLessons);
    expect(lastPool.some(r => firstIds.has(r.lessonId))).toBe(true);
  });

  it('an unknown world yields an empty pool', () => {
    const { examPoolFor, WORLD_ORDER, worldLessons } = engine;
    expect(examPoolFor('does-not-exist', WORLD_ORDER, worldLessons)).toEqual([]);
  });

  it('examNudge escalates day → week → month; null before/without a pass', () => {
    const { examNudge } = engine;
    const now = 1_000_000_000_000;
    const DAY = 24 * 60 * 60 * 1000;
    expect(examNudge(null, now)).toBeNull();          // never passed
    expect(examNudge(now, now)).toBeNull();           // just passed
    expect(examNudge(now, now + DAY - 1)).toBeNull(); // not quite a day
    expect(examNudge(now, now + DAY).key).toBe('day');
    expect(examNudge(now, now + 7 * DAY).key).toBe('week');
    expect(examNudge(now, now + 45 * DAY).key).toBe('month'); // strongest due tier wins
  });
});

describe('predict-then-verify primitive', () => {
  let gradePrediction, SCORING;
  beforeAll(async () => {
    ({ gradePrediction, SCORING } = await import('../lib/engine.js'));
  });

  it('exposes a SCORING.predict economy knob (no XP hardcoded in the engine)', () => {
    expect(SCORING.predict).toBeTruthy();
    expect(typeof SCORING.predict.commit).toBe('number');
    expect(typeof SCORING.predict.hit).toBe('number');
  });

  it('grades multiple-choice predictions by index', () => {
    const def = { choices: ['a', 'b', 'c'], answer: 1 };
    expect(gradePrediction(def, 1)).toEqual({ value: 1, correct: true });
    expect(gradePrediction(def, 0)).toEqual({ value: 0, correct: false });
    expect(gradePrediction(def, 2).correct).toBe(false);
  });

  it('grades numeric predictions within tolerance', () => {
    const def = { input: true, answer: 3, tol: 0.5 };
    expect(gradePrediction(def, 3).correct).toBe(true);
    expect(gradePrediction(def, 3.4).correct).toBe(true);
    expect(gradePrediction(def, 2.6).correct).toBe(true);
    expect(gradePrediction(def, 4).correct).toBe(false);
    expect(gradePrediction(def, '3.2').correct).toBe(true); // parses string input
    expect(gradePrediction(def, 'nope').correct).toBe(false); // NaN never matches
  });

  it('numeric grading defaults to an exact match when no tolerance is given', () => {
    const def = { input: true, answer: 5 };
    expect(gradePrediction(def, 5).correct).toBe(true);
    expect(gradePrediction(def, 5.1).correct).toBe(false);
  });

  it('is demonstrated on a real lab: the newton interactive owns a gradeable predict def', () => {
    // the newton lab (calc second-order lesson) is our reference wiring. We
    // capture the predict def by driving the interactive with a stub stage +
    // api; grading it against its own answer must succeed.
    const lesson = LESSONS.find(l =>
      l.interactive === 'newton' || (l.labs || []).some(x => x.interactive === 'newton'));
    expect(lesson, 'a lesson should use the newton interactive').toBeTruthy();

    // a stage stub rich enough for makeLab()/chips()/slider() to run headless
    const stageStub = () => {
      const node = {
        style: {}, className: '', innerHTML: '',
        classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
        appendChild: noop, insertBefore: noop, setAttribute: noop,
        addEventListener: noop, firstChild: null,
        querySelectorAll: () => [], querySelector: () => null,
        getContext: () => new Proxy({}, { get: () => (() => {}) }),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 440 }),
        // chips() does `.children[0].classList.add('on')`, so hand back a stub
        get children() { return [stageStub()]; },
      };
      return node;
    };
    const origCreate = document.createElement;
    document.createElement = () => stageStub();
    let predictDef = null;
    const stubApi = {
      missions: () => ({ update: noop, allDone: () => false, el: {} }),
      predict: (def) => { predictDef = def; return { committed: () => false, el: {} }; },
    };
    try {
      INTERACTIVES.newton(stageStub(), stubApi);
    } finally {
      document.createElement = origCreate;
    }
    expect(predictDef, 'newton lab should call api.predict').toBeTruthy();
    expect(predictDef.prompt).toBeTruthy();
    expect(Array.isArray(predictDef.choices)).toBe(true);
    expect(predictDef.answer).toBeGreaterThanOrEqual(0);
    expect(predictDef.answer).toBeLessThan(predictDef.choices.length);
    expect(gradePrediction(predictDef, predictDef.answer).correct).toBe(true);
  });
});

describe('daily review queue — buildReviewQueue / interleaveByWorld', () => {
  let buildReviewQueue, interleaveByWorld, SCORING;
  // deterministic rng: cycles a fixed sequence so tie-breaks are reproducible
  const seededRng = () => { let i = 0; const s = [0.1, 0.9, 0.3, 0.7, 0.5, 0.2, 0.8, 0.4, 0.6, 0.05]; return () => s[i++ % s.length]; };

  beforeAll(async () => {
    const eng = await import('../lib/engine.js');
    ({ buildReviewQueue, interleaveByWorld, SCORING } = eng);
  });

  const lessons = [
    { id: 'la-1', world: 'la', title: 'LA one', quiz: [{ q: '?', opts: ['a', 'b'], a: 0, tag: 'magnitude' }, { q: '?', opts: ['a', 'b'], a: 1, tag: 'direction' }] },
    { id: 'la-2', world: 'la', title: 'LA two', quiz: [{ q: '?', opts: ['a', 'b'], a: 0, tag: 'dot product' }] },
    { id: 'calc-1', world: 'calc', title: 'Calc one', quiz: [{ q: '?', opts: ['a', 'b'], a: 0, tag: 'chain rule' }] },
    { id: 'prob-1', world: 'prob', title: 'Prob one', quiz: [{ q: '?', opts: ['a', 'b'], a: 0, tag: 'bayes' }] },
    { id: 'not-done', world: 'ml', title: 'Locked', quiz: [{ q: '?', opts: ['a', 'b'], a: 0, tag: 'x' }] },
  ];
  const allDone = { 'la-1': true, 'la-2': true, 'calc-1': true, 'prob-1': true };

  it('only draws from COMPLETED lessons', () => {
    const q = buildReviewQueue(lessons, { done: allDone }, null, { size: 10, rng: seededRng() });
    expect(q.map(x => x.lessonId).sort()).toEqual(['calc-1', 'la-1', 'la-2', 'prob-1']);
    expect(q.find(x => x.lessonId === 'not-done')).toBeUndefined();
  });

  it('caps the queue at the requested size', () => {
    const q = buildReviewQueue(lessons, { done: allDone }, null, { size: 2, rng: seededRng() });
    expect(q.length).toBe(2);
  });

  it('prioritizes lessons with weak tags, and picks the weak-tagged question', () => {
    const state = { done: allDone, weak: { 'la-1': ['direction'] } };
    const q = buildReviewQueue(lessons, state, null, { size: 1, rng: seededRng() });
    expect(q.length).toBe(1);
    expect(q[0].lessonId).toBe('la-1');
    expect(q[0].tag).toBe('direction'); // the weak-tagged question, not 'magnitude'
  });

  it('prioritizes low-accuracy lessons from stats when there are no weak tags', () => {
    const stats = [
      { lesson_id: 'calc-1', accuracy: 0.2, attempts: 5 },
      { lesson_id: 'la-1', accuracy: 0.95, attempts: 5 },
    ];
    const q = buildReviewQueue(lessons, { done: allDone }, stats, { size: 1, rng: () => 0 });
    expect(q[0].lessonId).toBe('calc-1');
  });

  it('falls back to weak-only selection when stats is null (logged-out case)', () => {
    const state = { done: allDone, weak: { 'prob-1': ['bayes'] } };
    const q = buildReviewQueue(lessons, state, null, { size: 1, rng: () => 0 });
    expect(q[0].lessonId).toBe('prob-1');
  });

  it('deprioritizes recently-reviewed lessons (spacing/recency)', () => {
    const now = Date.now();
    // two equal-priority lessons; the stale one should rank ahead of the fresh one
    const two = lessons.filter(l => ['calc-1', 'prob-1'].includes(l.id));
    const state = { done: { 'calc-1': true, 'prob-1': true }, reviewLog: { 'calc-1': now, 'prob-1': now - 20 * 864e5 } };
    const q = buildReviewQueue(two, state, null, { size: 1, now, rng: () => 0 });
    expect(q[0].lessonId).toBe('prob-1'); // reviewed 20 days ago > reviewed just now
  });

  it('returns an empty queue when nothing is completed', () => {
    const q = buildReviewQueue(lessons, { done: {} }, null, { size: 5, rng: seededRng() });
    expect(q).toEqual([]);
  });

  it('interleaves worlds so consecutive items differ when possible', () => {
    const items = [
      { world: 'la', lessonId: 'a', qi: 0, tag: 't' },
      { world: 'la', lessonId: 'b', qi: 0, tag: 't' },
      { world: 'la', lessonId: 'c', qi: 0, tag: 't' },
      { world: 'calc', lessonId: 'd', qi: 0, tag: 't' },
      { world: 'prob', lessonId: 'e', qi: 0, tag: 't' },
    ];
    const out = interleaveByWorld([...items], () => 0.5);
    expect(out.length).toBe(items.length);
    // no two adjacent share a world unless a world genuinely dominates the tail
    let adjacentSame = 0;
    for (let i = 1; i < out.length; i++) if (out[i].world === out[i - 1].world) adjacentSame++;
    // 3×la + 1 calc + 1 prob forces at most one la-la adjacency at the tail
    expect(adjacentSame).toBeLessThanOrEqual(1);
  });

  it('exposes a review scoring knob', () => {
    expect(SCORING.review).toBeTruthy();
    expect(typeof SCORING.review.size).toBe('number');
    expect(typeof SCORING.review.dailyBonus).toBe('number');
  });
});

describe('display formulas render as valid KaTeX (math accuracy regression guard)', () => {
  // Lesson authors write display math as <div class="formula">$$...$$</div>;
  // lib/content-render.js renders it with KaTeX at view time. Catches two
  // classes of authoring mistake before they ship: (a) a formula body that
  // isn't wrapped in $$...$$ delimiters, so KaTeX never touches it and it
  // renders as literal dollar-sign-wrapped text; (b) invalid LaTeX inside the
  // delimiters (most commonly an unescaped backslash in the JS source —
  // writing \nabla instead of \\nabla turns into a newline + "abla").
  const FORMULA_RE = /<div class="formula">([\s\S]*?)<\/div>/g;

  // A handful of .formula blocks are multi-line diagrams or prose (flowcharts,
  // side-by-side comparison tables) rather than a single equation — KaTeX adds
  // nothing there, so they intentionally stay plain HTML. Keep this list in
  // sync with lib/curriculum/*.js; anything not on it must be $$...$$-wrapped.
  const INTENTIONALLY_PLAIN = new Set([
    'pre-functions (learn)', // labeled input/output flow diagram, not an equation
    'ml-learning (learn)', // pure English sentence, no math symbols
    'ml-gpt (learn)',      // labeled pipeline diagram (predict → sample → …)
    'ml-boss (learn)',     // labeled pipeline diagram (tokenize → embed → …)
  ]);
  // la-posdef also carries a converted formula in `learn`, so its two plain
  // blocks (a PD/ND/Indefinite/PSD criteria table and its BOWL/DOME/SADDLE/
  // TROUGH geometry counterpart) are matched by content, not position.
  const LA_POSDEF_PLAIN_MARKERS = ['Positive definite (PD)', 'paraboloid BOWL'];

  function formulasIn(html) {
    const out = [];
    if (!html || typeof html !== 'string') return out;
    let m;
    FORMULA_RE.lastIndex = 0;
    while ((m = FORMULA_RE.exec(html))) out.push(m[1]);
    return out;
  }

  function allFormulas() {
    const found = [];
    for (const l of LESSONS) {
      formulasIn(l.learn).forEach((f) => found.push({ id: l.id, where: 'learn', f }));
      formulasIn(l.ml).forEach((f) => found.push({ id: l.id, where: 'ml', f }));
      (l.deeper || []).forEach((d, i) => formulasIn(d.body).forEach((f) => found.push({ id: l.id, where: `deeper[${i}]`, f })));
      (l.labs || []).forEach((lab, i) => formulasIn(lab.intro).forEach((f) => found.push({ id: l.id, where: `labs[${i}].intro`, f })));
    }
    return found;
  }

  // Filters out the intentionally-plain blocks above (by key, or by content
  // marker for la-posdef, which also has a real converted formula in `learn`).
  function convertibleFormulas() {
    return allFormulas().filter(({ id, where, f }) => {
      const key = `${id} (${where})`;
      if (INTENTIONALLY_PLAIN.has(key)) return false;
      if (key === 'la-posdef (learn)' && LA_POSDEF_PLAIN_MARKERS.some((m) => f.includes(m))) return false;
      return true;
    });
  }

  it('ships at least one .formula block (regression guard: not silently emptied)', () => {
    expect(allFormulas().length).toBeGreaterThan(0);
  });

  it('every non-diagram .formula block is wrapped in $$...$$ display delimiters', () => {
    const bad = convertibleFormulas().filter(({ f }) => !/^\$\$[\s\S]*\$\$$/.test(f));
    expect(bad.map(({ id, where, f }) => `${id} (${where}): ${f.slice(0, 60)}`)).toEqual([]);
  });

  it('every .formula block parses as valid KaTeX with no stray control characters', () => {
    const bad = [];
    for (const { id, where, f } of allFormulas()) {
      const m = f.match(/^\$\$([\s\S]*)\$\$$/);
      if (!m) continue; // already reported by the delimiter test above
      const tex = m[1];
      if (/[\x00-\x09\x0b\x0c\x0e-\x1f]/.test(tex)) {
        bad.push(`${id} (${where}): stray control character — check for an unescaped backslash (\\n instead of \\\\n) in the JS source`);
        continue;
      }
      try {
        katex.renderToString(tex, { throwOnError: true, displayMode: true });
      } catch (e) {
        bad.push(`${id} (${where}): ${e.message} — formula: ${tex}`);
      }
    }
    expect(bad).toEqual([]);
  });

  // Inline math: authors write \(...\) directly in prose and quiz text (not
  // just inside .formula divs). Collect every text field a lesson can carry,
  // including quiz q/opts/why/wrong, since that's where most inline math ends
  // up (answer choices, explanations).
  function allTextFields() {
    const fields = [];
    for (const l of LESSONS) {
      fields.push([`${l.id} (learn)`, l.learn], [`${l.id} (ml)`, l.ml]);
      (l.deeper || []).forEach((d, i) => fields.push([`${l.id} (deeper[${i}])`, d.body]));
      (l.labs || []).forEach((lab, i) => fields.push([`${l.id} (labs[${i}].intro)`, lab.intro]));
      (l.expositions || []).forEach((e, i) => fields.push(
        [`${l.id} (expositions[${i}].title)`, e.title], [`${l.id} (expositions[${i}].caption)`, e.caption]));
      (l.quiz || []).forEach((q, qi) => {
        fields.push([`${l.id} (quiz[${qi}].q)`, q.q], [`${l.id} (quiz[${qi}].why)`, q.why]);
        (q.opts || []).forEach((o, oi) => fields.push([`${l.id} (quiz[${qi}].opts[${oi}])`, o]));
        if (q.wrong) Object.entries(q.wrong).forEach(([oi, w]) => fields.push([`${l.id} (quiz[${qi}].wrong[${oi}])`, w]));
      });
    }
    return fields;
  }

  const INLINE_RE = /\\\(([\s\S]*?)\\\)/g;
  const CODE_RE = /<code>([^<]*)<\/code>/g;
  // Presence of any of these inside a <code> span (untouched by \(...\)) is a
  // strong sign it's still raw Unicode notation rather than converted KaTeX.
  const MATH_HINT_RE = /[·‖ᵀ√Σ∏∈∞±≥≤≠≈λμσθδΔρη→←↦⟂⊥×∫∂∇]|<su[bp]>/;
  // Genuine code/API identifiers that are correctly left as plain <code>, not math.
  const CODE_NOT_MATH = new Set(['+=', 'for', 'ddof', 'var', 'nn.CrossEntropyLoss', 'sparse_categorical_crossentropy', 'numpy.linalg.lstsq', 'linalg.solve(A, b)']);
  // A bracketed number list ("[6, 8]", "[[2,0],[0,1]]") is math even with no
  // Unicode operator character — this is what MATH_HINT_RE alone missed in
  // lib/curriculum/la-core-labs.js's predict prompts (e.g. "v = [6, 8]").
  const BRACKET_VECTOR_RE = /\[[-\d.,\s]+\]/;
  const LETTER_EQUALS_BRACKET_RE = /^[a-zA-Z]\w*\s*=\s*\[/;
  function looksLikeMath(content) {
    if (CODE_NOT_MATH.has(content)) return false;
    return MATH_HINT_RE.test(content) || BRACKET_VECTOR_RE.test(content) || LETTER_EQUALS_BRACKET_RE.test(content);
  }

  it('every inline \\(...\\) span parses as valid KaTeX with no stray control characters', () => {
    const bad = [];
    for (const [where, html] of allTextFields()) {
      if (!html || typeof html !== 'string') continue;
      let m;
      INLINE_RE.lastIndex = 0;
      while ((m = INLINE_RE.exec(html))) {
        const tex = m[1];
        if (/[\x00-\x09\x0b\x0c\x0e-\x1f]/.test(tex)) {
          bad.push(`${where}: stray control character — check for an unescaped backslash (\\n instead of \\\\n) in the JS source`);
          continue;
        }
        try {
          katex.renderToString(tex, { throwOnError: true, displayMode: false });
        } catch (e) {
          bad.push(`${where}: ${e.message} — inline math: ${tex}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('no <code> span still carries raw Unicode math notation (should be \\(...\\) KaTeX)', () => {
    const bad = [];
    for (const [where, html] of allTextFields()) {
      if (!html || typeof html !== 'string') continue;
      let m;
      CODE_RE.lastIndex = 0;
      while ((m = CODE_RE.exec(html))) {
        if (looksLikeMath(m[1])) bad.push(`${where}: <code>${m[1].slice(0, 60)}</code>`);
      }
    }
    expect(bad).toEqual([]);
  });

  // Authored math also lives OUTSIDE the LESSONS data the tests above walk:
  // interactive labs (INTERACTIVES.xxx = function(stage, api){...}) pass HTML
  // straight to api.predict()/api.missions() as function-call arguments,
  // never touching a lesson's learn/ml/deeper/labs/quiz fields. That's
  // exactly how lib/curriculum/la-core-labs.js shipped 12 unconverted
  // vector/matrix <code> spans unnoticed. Sweep every curriculum file's raw
  // source text directly so authoring location can never hide a <code> span
  // from this guard again.
  it('no <code> span anywhere in lib/curriculum/*.js source carries raw math notation', () => {
    const dir = new URL('../lib/curriculum/', import.meta.url);
    const bad = [];
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.js')) continue;
      const text = readFileSync(new URL(file, dir), 'utf8');
      CODE_RE.lastIndex = 0;
      let m;
      while ((m = CODE_RE.exec(text))) {
        if (looksLikeMath(m[1])) bad.push(`${file}: <code>${m[1].slice(0, 60)}</code>`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('registerLesson — validation + idempotency', () => {
  it('logs a validation error for a malformed lesson', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(noop);
    registerLesson({ id: '__smoke_bad__', world: 'pre', title: 'x', quiz: [{ q: '?', opts: ['a', 'b'], a: 9 }] });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    drop('__smoke_bad__');
  });

  it('is idempotent by id — re-registering replaces in place, replacement wins', () => {
    INTERACTIVES.__smoke_i__ = noop;
    const lesson = (title, a) => ({ id: '__smoke_dup__', world: 'pre', title, interactive: '__smoke_i__', quiz: [{ q: '?', opts: ['a', 'b'], a }] });
    registerLesson(lesson('v1', 0));
    const n = LESSONS.length;
    registerLesson(lesson('v2', 1));
    expect(LESSONS.length).toBe(n); // no duplicate appended
    expect(LESSONS.find(l => l.id === '__smoke_dup__').title).toBe('v2');
    drop('__smoke_dup__');
  });
});

describe('expositions — validation (the visual-exposition mechanism)', () => {
  it('rejects an exposition entry missing a string figure', () => {
    INTERACTIVES.__smoke_ei__ = noop;
    const spy = vi.spyOn(console, 'error').mockImplementation(noop);
    registerLesson({ id: '__smoke_e__', world: 'pre', title: 't', interactive: '__smoke_ei__',
      expositions: [{ title: 'no figure here' }], quiz: [{ q: '?', opts: ['a', 'b'], a: 0 }] });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    drop('__smoke_e__');
  });

  it('flags an exposition figure key that is not registered in INTERACTIVES', () => {
    INTERACTIVES.__smoke_ei2__ = noop;
    registerLesson({ id: '__smoke_e2__', world: 'pre', title: 't', interactive: '__smoke_ei2__',
      expositions: [{ key: 'a', figure: '__no_such_figure__' }], quiz: [{ q: '?', opts: ['a', 'b'], a: 0 }] });
    expect(validateCurriculum().join(' ')).toContain('__no_such_figure__');
    drop('__smoke_e2__');
  });
});

describe('type-aware quiz-shape validation (numeric + order)', () => {
  // registerLesson only logs on a malformed shape, so we assert on the
  // console.error firing (bad) vs staying silent (good).
  const withSpy = (lesson) => {
    INTERACTIVES.__smoke_qi__ = noop;
    const spy = vi.spyOn(console, 'error').mockImplementation(noop);
    registerLesson({ id: '__smoke_q__', world: 'pre', title: 't', interactive: '__smoke_qi__', ...lesson });
    const called = spy.mock.calls.length > 0;
    spy.mockRestore();
    drop('__smoke_q__');
    return called;
  };

  it('accepts a valid numeric question', () => {
    expect(withSpy({ quiz: [{ type: 'numeric', q: '?', answer: 12, tol: 0.001, why: 'x' }] })).toBe(false);
  });

  it('rejects a numeric question missing answer / tol', () => {
    expect(withSpy({ quiz: [{ type: 'numeric', q: '?', tol: 0.5 }] })).toBe(true);
    expect(withSpy({ quiz: [{ type: 'numeric', q: '?', answer: 3 }] })).toBe(true);
    expect(withSpy({ quiz: [{ type: 'numeric', q: '?', answer: 3, tol: -1 }] })).toBe(true);
  });

  it('accepts a valid order question', () => {
    expect(withSpy({ quiz: [{ type: 'order', q: '?', steps: ['a', 'b', 'c'] }] })).toBe(false);
  });

  it('rejects an order question with fewer than 2 steps', () => {
    expect(withSpy({ quiz: [{ type: 'order', q: '?', steps: ['only one'] }] })).toBe(true);
    expect(withSpy({ quiz: [{ type: 'order', q: '?' }] })).toBe(true);
  });

  it('rejects an unknown question type', () => {
    expect(withSpy({ quiz: [{ type: 'mystery', q: '?' }] })).toBe(true);
  });

  it('still requires opts + valid a for an mc (or untyped) question', () => {
    expect(withSpy({ quiz: [{ q: '?', opts: ['a', 'b'], a: 0 }] })).toBe(false);
    expect(withSpy({ quiz: [{ q: '?', opts: ['a', 'b'], a: 5 }] })).toBe(true);
    expect(withSpy({ quiz: [{ type: 'mc', q: '?', opts: ['a'], a: 0 }] })).toBe(true);
  });

  // Optional `wolfram` Show-Steps hint (KB PR 4): a non-empty string when present.
  it('accepts an optional `wolfram` hint that is a non-empty string', () => {
    expect(withSpy({ quiz: [{ type: 'numeric', q: '?', answer: 12, tol: 0.001, why: 'x', wolfram: 'derivative of x^3 at x = 2' }] })).toBe(false);
  });

  it('rejects a `wolfram` hint that is not a non-empty string', () => {
    expect(withSpy({ quiz: [{ type: 'numeric', q: '?', answer: 12, tol: 0.001, wolfram: '' }] })).toBe(true);
    expect(withSpy({ quiz: [{ type: 'numeric', q: '?', answer: 12, tol: 0.001, wolfram: 42 }] })).toBe(true);
  });
});
