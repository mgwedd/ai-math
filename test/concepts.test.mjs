/* Concept registry tests (Vitest) — PR 1 of the knowledge-base plan
   (docs/KNOWLEDGE-BASE-PLAN.md §6). Loads the REAL curriculum (which loads
   the REAL concept registry as a side effect, same as test/curriculum.test.mjs)
   in a node environment with browser globals stubbed as no-ops, and asserts
   the concept taxonomy is coherent: every q.tag across every lesson resolves
   to a registered concept (directly or via TAG_ALIASES), concept slugs are
   unique and well-formed, prereqs resolve, and every world is represented. */
import { describe, it, expect, beforeAll, vi } from 'vitest';

// --- browser-global stubs: must exist BEFORE the curriculum imports (same
//     insurance as test/curriculum.test.mjs — importing lib/curriculum/index.js
//     pulls in every lesson module, some of which reference these at
//     top-level-adjacent scope inside interactive functions that are merely
//     *defined*, not run, here). ---
const noop = () => {};
globalThis.window ??= {};
globalThis.devicePixelRatio ??= 1;
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

let LESSONS, concepts;

beforeAll(async () => {
  await import('../lib/curriculum/index.js');            // registers every lesson + concept
  const reg = await import('../lib/curriculum/registry.js');
  concepts = await import('../lib/curriculum/concepts.js'); // same module instance → populated
  ({ LESSONS } = reg);
});

describe('concept registry (PR 1 — KB spine)', () => {
  it('registers a healthy number of concepts', () => {
    expect(concepts.CONCEPTS.size).toBeGreaterThanOrEqual(40);
  });

  it('passes validateConcepts() with zero issues', () => {
    expect(concepts.validateConcepts()).toEqual([]);
  });

  it('passes validateLessonTags(LESSONS) with zero issues', () => {
    expect(concepts.validateLessonTags(LESSONS)).toEqual([]);
  });

  it('has unique, well-formed concept slugs (^[a-z0-9-]{1,64}$)', () => {
    const SLUG_RE = /^[a-z0-9-]{1,64}$/;
    const ids = [...concepts.CONCEPTS.keys()];
    expect(new Set(ids).size).toBe(ids.length);
    const bad = ids.filter(id => !SLUG_RE.test(id));
    expect(bad).toEqual([]);
  });

  it('gives every concept a valid world, a title, and a wikipedia page title', () => {
    const KNOWN = new Set(['pre', 'la', 'calc', 'prob', 'ml']);
    const bad = [];
    for (const c of concepts.CONCEPTS.values()) {
      if (!KNOWN.has(c.world)) bad.push(`${c.id}: bad world ${JSON.stringify(c.world)}`);
      if (!c.title) bad.push(`${c.id}: missing title`);
      if (!c.wikipedia) bad.push(`${c.id}: missing wikipedia page title`);
    }
    expect(bad).toEqual([]);
  });

  it('covers all five worlds', () => {
    const worlds = new Set([...concepts.CONCEPTS.values()].map(c => c.world));
    expect(worlds).toEqual(new Set(['pre', 'la', 'calc', 'prob', 'ml']));
  });

  it('every prereq slug resolves to a registered concept', () => {
    const bad = [];
    for (const c of concepts.CONCEPTS.values()) {
      for (const pr of (c.prereqs || [])) {
        if (!concepts.CONCEPTS.has(pr)) bad.push(`${c.id} -> ${pr}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every q.tag across every lesson resolves via resolveTag() (direct id or TAG_ALIASES)', () => {
    const bad = [];
    let tagged = 0;
    for (const l of LESSONS) {
      for (const q of (l.quiz || [])) {
        if (!q.tag) continue;
        tagged++;
        if (!concepts.resolveTag(q.tag)) bad.push(`${l.id}: tag ${JSON.stringify(q.tag)}`);
      }
    }
    expect(tagged).toBeGreaterThan(0); // regression guard: tags weren't silently dropped
    expect(bad).toEqual([]);
  });

  it('every TAG_ALIASES value points at a registered concept', () => {
    const bad = Object.entries(concepts.TAG_ALIASES)
      .filter(([, slug]) => !concepts.CONCEPTS.has(slug))
      .map(([tag, slug]) => `${JSON.stringify(tag)} -> ${slug}`);
    expect(bad).toEqual([]);
  });

  it('getConcept() returns a registered concept by id, undefined for an unknown id', () => {
    const [firstId] = concepts.CONCEPTS.keys();
    expect(concepts.getConcept(firstId)).toBe(concepts.CONCEPTS.get(firstId));
    expect(concepts.getConcept('__does_not_exist__')).toBeUndefined();
  });
});

describe('registerConcept — validation + idempotency', () => {
  it('logs a validation error for a malformed concept (bad slug, unknown world)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(noop);
    concepts.registerConcept({ id: 'Not A Slug!', world: 'nope', title: 'x', wikipedia: 'x', prereqs: [] });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    concepts.CONCEPTS.delete('Not A Slug!');
  });

  it('is idempotent by id — re-registering replaces in place', () => {
    concepts.registerConcept({ id: '__smoke_concept__', world: 'pre', title: 'v1', wikipedia: 'X', prereqs: [] });
    const n = concepts.CONCEPTS.size;
    concepts.registerConcept({ id: '__smoke_concept__', world: 'pre', title: 'v2', wikipedia: 'X', prereqs: [] });
    expect(concepts.CONCEPTS.size).toBe(n); // no duplicate entry
    expect(concepts.getConcept('__smoke_concept__').title).toBe('v2');
    concepts.CONCEPTS.delete('__smoke_concept__');
  });
});

describe('validateLessonTags — unit behavior (synthetic lessons, not the real curriculum)', () => {
  it('flags a tag that resolves to nothing', () => {
    const bad = concepts.validateLessonTags([
      { id: '__smoke_lesson__', quiz: [{ q: '?', tag: '__no_such_tag__' }] },
    ]);
    expect(bad.length).toBe(1);
    expect(bad[0]).toContain('__smoke_lesson__');
  });

  it('accepts a tag that is already a direct concept id', () => {
    const [firstId] = concepts.CONCEPTS.keys();
    const bad = concepts.validateLessonTags([
      { id: '__smoke_lesson__', quiz: [{ q: '?', tag: firstId }] },
    ]);
    expect(bad).toEqual([]);
  });

  it('accepts a tag that resolves via TAG_ALIASES', () => {
    const [firstTag] = Object.keys(concepts.TAG_ALIASES);
    const bad = concepts.validateLessonTags([
      { id: '__smoke_lesson__', quiz: [{ q: '?', tag: firstTag }] },
    ]);
    expect(bad).toEqual([]);
  });

  it('ignores questions with no tag at all', () => {
    const bad = concepts.validateLessonTags([{ id: '__smoke_lesson__', quiz: [{ q: '?' }] }]);
    expect(bad).toEqual([]);
  });
});
