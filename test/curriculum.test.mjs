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
