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
});
