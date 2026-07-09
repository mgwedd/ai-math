/* Practice selection-policy unit tests (Vitest) — PR 6 of the knowledge-base
   plan (docs/KNOWLEDGE-BASE-PLAN.md §9).
   ----------------------------------------------------------------
   PURE function, NO network / NO DB / NO DOM: the §9 policy is exercised with
   synthetic concept_accuracy rows + fake registry/content/bank resolvers, a
   fixed clock, and a deterministic rng. Asserts weakness ranking, interleaving,
   the ~20% strong-concept sprinkle, the live-only bank behavior, and the
   descriptor shapes the engine renders. */
import { describe, it, expect } from 'vitest';
import {
  buildPracticeQueue,
  scoreConcept,
  interleaveByWorld,
  PRACTICE_DEFAULTS,
} from '../lib/practice/selection.js';

const NOW = 1_700_000_000_000;
const DAY = 864e5;

// small deterministic rng (LCG) so every run is byte-identical
function seededRng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

// world map + resolvers for a synthetic 5-concept universe across 4 worlds.
const WORLD = {
  'weak-la': 'la', 'strong-la': 'la',
  'weak-calc': 'calc', 'weak-ml': 'ml', 'never-prob': 'prob',
};
function makeResolve({ bankFor = () => [], generatorsFor, refsFor } = {}) {
  return {
    worldOf: (slug) => WORLD[slug],
    refsFor: refsFor || ((slug) => [{ lessonId: slug + '-lesson', qi: 0 }]),
    generatorsFor: generatorsFor || ((slug) => ['gen-' + slug]),
    bankFor,
  };
}

// concept_accuracy-shaped rows
const ROWS = [
  { tag: 'weak-la',   accuracy: 0.2,  attempts: 10, misses: 8, last_seen: NOW - 10 * DAY },
  { tag: 'weak-calc', accuracy: 0.3,  attempts: 6,  misses: 4, last_seen: NOW - 2 * DAY },
  { tag: 'weak-ml',   accuracy: 0.4,  attempts: 8,  misses: 5, last_seen: NOW - 5 * DAY },
  { tag: 'strong-la', accuracy: 0.95, attempts: 20, misses: 1, last_seen: NOW - 1 * DAY },
  { tag: 'never-prob', accuracy: null, attempts: 0, misses: 0, last_seen: null },
];

const baseOpts = () => ({ now: () => NOW, rng: seededRng(7) });

describe('scoreConcept', () => {
  it('ranks a low-accuracy concept above a high-accuracy one', () => {
    const weak = scoreConcept(ROWS[0], baseOpts());   // acc 0.2
    const strong = scoreConcept(ROWS[3], baseOpts()); // acc 0.95
    expect(weak).toBeGreaterThan(strong);
  });

  it('gives never-practiced concepts the coverage bias (outranks a mastered one)', () => {
    const never = scoreConcept(ROWS[4], baseOpts());  // attempts 0
    const strong = scoreConcept(ROWS[3], baseOpts());
    expect(never).toBeGreaterThan(strong);
  });

  it('staleness saturates at maxStaleDays', () => {
    const veryStale = scoreConcept({ tag: 'x', accuracy: 0.5, attempts: 2, last_seen: NOW - 999 * DAY },
      { now: () => NOW, maxStaleDays: 30 });
    const atCap = scoreConcept({ tag: 'x', accuracy: 0.5, attempts: 2, last_seen: NOW - 30 * DAY },
      { now: () => NOW, maxStaleDays: 30 });
    expect(veryStale).toBe(atCap);
  });
});

describe('buildPracticeQueue — weakness ranking', () => {
  it('targets the weak concepts and suppresses strong ones when sprinkle is off', () => {
    const q = buildPracticeQueue({
      concepts: ROWS,
      resolve: makeResolve(),
      opts: { ...baseOpts(), concepts: 3, perConcept: 1, sprinkleShare: 0, size: 20 },
    });
    const concepts = new Set(q.map(d => d.concept));
    expect(concepts.has('weak-la')).toBe(true);
    expect(concepts.has('strong-la')).toBe(false); // strong excluded with no sprinkle
    expect(q.length).toBe(3);
  });

  it('includes a strong concept via the sprinkle', () => {
    // 5 targeted concepts, 20% sprinkle => 1 strong slot. strong-la is the only
    // strong concept, so it must appear.
    const q = buildPracticeQueue({
      concepts: ROWS,
      resolve: makeResolve(),
      opts: { ...baseOpts(), concepts: 5, perConcept: 1, sprinkleShare: 0.2, size: 20 },
    });
    expect(new Set(q.map(d => d.concept)).has('strong-la')).toBe(true);
  });

  it('drops concepts whose world cannot be resolved', () => {
    const q = buildPracticeQueue({
      concepts: [...ROWS, { tag: 'ghost', accuracy: 0, attempts: 3 }],
      resolve: makeResolve(),
      opts: { ...baseOpts(), concepts: 6, perConcept: 1, size: 50 },
    });
    expect(q.every(d => d.concept !== 'ghost')).toBe(true);
  });
});

describe('buildPracticeQueue — descriptor kinds & shapes', () => {
  it('emits ref / template / bank in the right shapes', () => {
    const q = buildPracticeQueue({
      concepts: [ROWS[0]],
      resolve: makeResolve({
        bankFor: (slug) => slug === 'weak-la' ? [{ id: 'uuid-1', spec: { type: 'mc', q: 'x?', opts: ['a', 'b'], a: 0 } }] : [],
      }),
      opts: { ...baseOpts(), concepts: 1, perConcept: 3, size: 20 },
    });
    const byKind = Object.fromEntries(q.map(d => [d.kind, d]));
    expect(byKind.bank).toMatchObject({ kind: 'bank', id: 'uuid-1' });
    expect(byKind.bank.spec).toBeTypeOf('object');
    expect(byKind.template).toMatchObject({ kind: 'template', generator: 'gen-weak-la' });
    expect(Number.isInteger(byKind.template.seed)).toBe(true);
    expect(byKind.ref).toMatchObject({ kind: 'ref', lessonId: 'weak-la-lesson', qi: 0 });
    // every descriptor carries concept + world for telemetry + interleaving
    for (const d of q) { expect(d.concept).toBeTruthy(); expect(d.world).toBeTruthy(); }
  });

  it('serves a bank descriptor ONLY when live rows exist for the concept', () => {
    // bankFor returns [] for every concept => no bank descriptors anywhere.
    const q = buildPracticeQueue({
      concepts: ROWS,
      resolve: makeResolve({ bankFor: () => [] }),
      opts: { ...baseOpts(), concepts: 6, perConcept: 3, size: 50 },
    });
    expect(q.some(d => d.kind === 'bank')).toBe(false);
    expect(q.some(d => d.kind === 'ref')).toBe(true);
    expect(q.some(d => d.kind === 'template')).toBe(true);
  });

  it('caps the queue at opts.size', () => {
    const q = buildPracticeQueue({
      concepts: ROWS,
      resolve: makeResolve(),
      opts: { ...baseOpts(), concepts: 5, perConcept: 3, size: 4 },
    });
    expect(q.length).toBe(4);
  });
});

describe('interleaveByWorld', () => {
  it('alternates worlds when balanced', () => {
    const items = [
      { world: 'la', n: 1 }, { world: 'la', n: 2 },
      { world: 'calc', n: 3 }, { world: 'calc', n: 4 },
    ];
    const out = interleaveByWorld(items, seededRng(3));
    for (let i = 1; i < out.length; i++) expect(out[i].world).not.toBe(out[i - 1].world);
    expect(out.length).toBe(4);
  });

  it('is stable when only one world is present', () => {
    const items = [{ world: 'la', n: 1 }, { world: 'la', n: 2 }];
    expect(interleaveByWorld(items, seededRng(1)).length).toBe(2);
  });

  it('the built practice queue interleaves worlds (no long same-world runs)', () => {
    const q = buildPracticeQueue({
      concepts: ROWS,
      resolve: makeResolve(),
      opts: { ...baseOpts(), concepts: 5, perConcept: 1, size: 20 },
    });
    // with 4 distinct worlds and one descriptor each, the first several should
    // never be three-in-a-row of the same world.
    let run = 1, maxRun = 1;
    for (let i = 1; i < q.length; i++) {
      run = q[i].world === q[i - 1].world ? run + 1 : 1;
      maxRun = Math.max(maxRun, run);
    }
    expect(maxRun).toBeLessThan(3);
  });
});

describe('PRACTICE_DEFAULTS', () => {
  it('exposes the tunables the route/SCORING mirror', () => {
    expect(PRACTICE_DEFAULTS.weights).toMatchObject({ miss: expect.any(Number) });
    expect(PRACTICE_DEFAULTS.threshold).toBeGreaterThan(0);
  });
});
