/* Per-user KB rate-limit helper tests (Vitest) — PR 7 hardening
   (docs/KNOWLEDGE-BASE-PLAN.md §10, PR 7 section in §11).
   ----------------------------------------------------------------
   NO live network and NO database: lib/kb/rate-limit.js takes an injectable
   `store` (mirrors lib/kb/cache.js's fake-store pattern), so the fail-open
   behavior and the over-cap block are exercised against a plain in-memory
   fake — never Postgres. */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, capFor } from '../lib/kb/rate-limit.js';

// In-memory fake with the same (userId, route, day) -> incrementing count
// contract as pgUsageStore. `throwOn` lets a test simulate a DB/table failure.
function fakeStore({ seed = {}, throwOn = false } = {}) {
  const map = new Map(Object.entries(seed));
  return {
    calls: 0,
    async increment(userId, route, day) {
      this.calls++;
      if (throwOn) throw new Error('kb_usage table not migrated');
      const key = userId + '|' + route + '|' + day;
      const next = (map.get(key) || 0) + 1;
      map.set(key, next);
      return next;
    },
  };
}

describe('checkRateLimit — under cap', () => {
  it('allows a request under the cap and returns the incremented count', async () => {
    const store = fakeStore();
    const out = await checkRateLimit({ userId: 'u1', route: 'kb-concept', store, cap: 5, day: '2026-07-07' });
    expect(out).toEqual({ allowed: true, count: 1, cap: 5 });
  });

  it('increments independently per user/route/day', async () => {
    const store = fakeStore();
    await checkRateLimit({ userId: 'u1', route: 'kb-concept', store, cap: 5, day: '2026-07-07' });
    await checkRateLimit({ userId: 'u1', route: 'kb-concept', store, cap: 5, day: '2026-07-07' });
    const other = await checkRateLimit({ userId: 'u2', route: 'kb-concept', store, cap: 5, day: '2026-07-07' });
    const otherRoute = await checkRateLimit({ userId: 'u1', route: 'practice', store, cap: 5, day: '2026-07-07' });
    const otherDay = await checkRateLimit({ userId: 'u1', route: 'kb-concept', store, cap: 5, day: '2026-07-08' });
    expect(other.count).toBe(1);
    expect(otherRoute.count).toBe(1);
    expect(otherDay.count).toBe(1);
  });
});

describe('checkRateLimit — over cap', () => {
  it('blocks once the count exceeds the cap', async () => {
    const store = fakeStore({ seed: { 'u1|kb-concept|2026-07-07': 5 } });
    const out = await checkRateLimit({ userId: 'u1', route: 'kb-concept', store, cap: 5, day: '2026-07-07' });
    expect(out.allowed).toBe(false);
    expect(out.count).toBe(6);
    expect(out.cap).toBe(5);
  });

  it('allows exactly at the cap boundary (count === cap)', async () => {
    const store = fakeStore({ seed: { 'u1|kb-concept|2026-07-07': 4 } });
    const out = await checkRateLimit({ userId: 'u1', route: 'kb-concept', store, cap: 5, day: '2026-07-07' });
    expect(out.allowed).toBe(true);
    expect(out.count).toBe(5);
  });
});

describe('checkRateLimit — fail-open (hard requirement)', () => {
  it('allows the request when the store throws (e.g. table not migrated / DB down)', async () => {
    const store = fakeStore({ throwOn: true });
    const errors = [];
    const out = await checkRateLimit({
      userId: 'u1', route: 'kb-concept', store, cap: 5, day: '2026-07-07',
      onError: (e) => errors.push(e),
    });
    expect(out.allowed).toBe(true);
    expect(out.failedOpen).toBe(true);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/not migrated/);
  });

  it('never throws even if onError itself throws', async () => {
    const store = fakeStore({ throwOn: true });
    await expect(checkRateLimit({
      userId: 'u1', route: 'kb-concept', store, cap: 5,
      onError: () => { throw new Error('logging exploded'); },
    })).resolves.toMatchObject({ allowed: true, failedOpen: true });
  });

  it('a non-positive cap disables the check without touching the store', async () => {
    const store = fakeStore();
    const out = await checkRateLimit({ userId: 'u1', route: 'kb-concept', store, cap: 0 });
    expect(out.allowed).toBe(true);
    expect(store.calls).toBe(0);
  });
});

describe('capFor — env-configurable caps', () => {
  const KEYS = ['KB_CONCEPT_DAILY_CAP', 'KB_STEPS_DAILY_CAP', 'PRACTICE_DAILY_CAP', 'KB_RATE_LIMIT_DEFAULT_CAP'];
  const saved = {};
  beforeEach(() => { for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; } });
  afterEach(() => { for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

  it('has a positive built-in default for every known route', () => {
    expect(capFor('kb-concept')).toBeGreaterThan(0);
    expect(capFor('kb-steps')).toBeGreaterThan(0);
    expect(capFor('practice')).toBeGreaterThan(0);
  });

  it('an unknown route falls back to the generic default cap', () => {
    expect(capFor('some-future-route')).toBe(capFor('some-future-route')); // stable
    expect(capFor('some-future-route')).toBeGreaterThan(0);
  });

  it('a per-route env var overrides the built-in default', () => {
    process.env.KB_CONCEPT_DAILY_CAP = '2';
    expect(capFor('kb-concept')).toBe(2);
  });
});
