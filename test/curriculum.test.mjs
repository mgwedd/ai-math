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
