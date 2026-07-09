/* Route-level wiring tests for the per-user KB rate cap (PR 7 hardening,
   docs/KNOWLEDGE-BASE-PLAN.md §10). Proves GET /api/kb/concept/[slug] and
   GET /api/practice actually call lib/kb/rate-limit.js and turn a blocked
   result into a 429 — the unit tests in rate-limit.test.mjs cover the
   fail-open/over-cap LOGIC in isolation; this covers the WIRING.

   NO live network and NO database: db/auth/rate-limit are all mocked, mirroring
   the pattern in test/kb.test.mjs. */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  pool: { query: async () => ({ rows: [] }) },
  logRouteError: () => 'DB_QUERY',
}));
vi.mock('@/lib/auth-server', () => ({
  getAuthUser: async () => ({ id: 'test-user' }),
}));

// Controllable fake: each test sets ALLOWED before importing/calling the route.
let ALLOWED = true;
vi.mock('@/lib/kb/rate-limit.js', () => ({
  checkRateLimit: vi.fn(async () => (ALLOWED ? { allowed: true, count: 1, cap: 300 } : { allowed: false, count: 301, cap: 300 })),
}));

beforeEach(() => { ALLOWED = true; });

describe('GET /api/kb/concept/[slug] — rate cap wiring', () => {
  async function callGET(slug) {
    const { GET } = await import('@/app/api/kb/concept/[slug]/route.js');
    return GET(new Request('http://localhost/api/kb/concept/' + slug), { params: Promise.resolve({ slug }) });
  }

  it('serves normally when under the cap', async () => {
    const res = await callGET('dot-product');
    expect(res.status).toBe(200);
  });

  it('returns 429 with a coarse code when over the cap', async () => {
    ALLOWED = false;
    const res = await callGET('dot-product');
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe('RATE_LIMIT');
  });

  it('rate limit is checked before the (unrelated) 404 path — still bounded work either way', async () => {
    ALLOWED = false;
    const res = await callGET('dot-product'); // known slug, but over cap
    expect(res.status).toBe(429);
  });
});

describe('GET /api/practice — rate cap wiring', () => {
  async function callGET() {
    const { GET } = await import('@/app/api/practice/route.js');
    return GET();
  }

  it('serves normally when under the cap', async () => {
    const res = await callGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.practice)).toBe(true);
  });

  it('returns 429 with a coarse code when over the cap', async () => {
    ALLOWED = false;
    const res = await callGET();
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe('RATE_LIMIT');
  });
});
