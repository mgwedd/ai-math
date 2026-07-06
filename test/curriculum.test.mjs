/* Curriculum smoke tests (Vitest). Loads the REAL curriculum in a node
   environment with browser globals stubbed as no-ops — the interactive lab
   functions only run in the browser, and engine.js has no top-level DOM
   execution, so importing the data layer is safe here. Guards against:
   syntax/load errors (the Unicode-prime / smart-quote class), unregistered
   interactive keys, malformed quizzes, misaligned inline feedback, duplicate
   ids — before they ship. */
import { describe, it, expect, beforeAll, vi } from 'vitest';

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

  it('has a well-formed quiz on every lesson', () => {
    const bad = [];
    for (const l of LESSONS) {
      if (!Array.isArray(l.quiz) || !l.quiz.length) { bad.push(`${l.id}: no quiz`); continue; }
      l.quiz.forEach((q, qi) => {
        if (!Array.isArray(q.opts) || q.opts.length < 2 || !Number.isInteger(q.a) || q.a < 0 || q.a >= q.opts.length)
          bad.push(`${l.id}[${qi}]`);
      });
    }
    expect(bad).toEqual([]);
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
