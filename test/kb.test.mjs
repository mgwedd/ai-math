/* KB service-layer tests (Vitest) — PR 3 of the knowledge-base plan
   (docs/KNOWLEDGE-BASE-PLAN.md §4.2, §5, §10).
   ----------------------------------------------------------------
   NO live network and NO database: the source adapters are unit-tested against
   committed FIXTURE JSON, the cache-first / serve-stale logic runs against an
   in-memory fake store, and the route is exercised with mocked auth + db + a
   rejecting global fetch to prove keyless graceful degradation. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { wikipedia } from '../lib/kb/sources/wikipedia.js';
import { wolfram } from '../lib/kb/sources/wolfram.js';
import { cachedFetch, ttlFor } from '../lib/kb/cache.js';
import { buildConceptBundle, buildRelated } from '../lib/kb/index.js';
import { getConcept } from '../lib/curriculum/concepts.js';

// db + auth are mocked file-wide so importing the KB layer never constructs a
// real pg Pool and the route test can run without a database or session.
vi.mock('@/lib/db', () => ({
  pool: { query: async () => ({ rows: [] }) },
  logRouteError: () => 'DB_QUERY',
}));
vi.mock('@/lib/auth-server', () => ({
  getAuthUser: async () => ({ id: 'test-user' }),
}));

const fixture = (name) =>
  JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/' + name, import.meta.url)), 'utf8'));
const WIKI = fixture('wikipedia-dot-product.json');
const WOLF = fixture('wolfram-dot-product.json');

// A fake fetch returning a fixture; records the headers it was called with.
function fakeFetch(payload, { ok = true, status = 200 } = {}) {
  const calls = [];
  const impl = async (url, opts) => {
    calls.push({ url, opts });
    return { ok, status, json: async () => payload };
  };
  impl.calls = calls;
  return impl;
}

// In-memory cache store with the same (source, query_key) contract as pgStore.
function fakeStore(seed = []) {
  const map = new Map();
  for (const [source, key, row] of seed) map.set(source + '|' + key, row);
  return {
    map,
    calls: { get: 0, set: 0 },
    async get(source, key) {
      this.calls.get++;
      return map.get(source + '|' + key) || null;
    },
    async set(source, key, payload, expiresAt) {
      this.calls.set++;
      map.set(source + '|' + key, { payload, fetched_at: new Date(), expires_at: expiresAt });
    },
  };
}

const CONCEPT = {
  id: 'dot-product',
  world: 'la',
  title: 'Dot product & cosine similarity',
  wikipedia: 'Dot_product',
  wolfram: 'dot product of (2,3) and (4,-1)',
  prereqs: ['vectors'],
};

describe('wikipedia adapter', () => {
  it('parses a REST page/summary body into { summary, title, url, attribution }', () => {
    const out = wikipedia.parse(WIKI);
    expect(out.title).toBe('Dot product');
    expect(out.summary).toMatch(/dot product/i);
    expect(out.url).toBe('https://en.wikipedia.org/wiki/Dot_product');
    expect(out.attribution.license).toBe('CC BY-SA 4.0');
    expect(out.attribution.url).toBe('https://en.wikipedia.org/wiki/Dot_product');
  });

  it('derives its query key from the concept.wikipedia title (null when absent)', () => {
    expect(wikipedia.queryKey(CONCEPT)).toBe('Dot_product');
    expect(wikipedia.queryKey({ id: 'x', world: 'la' })).toBeNull();
  });

  it('fetch() sends a descriptive User-Agent and returns the normalized shape', async () => {
    const f = fakeFetch(WIKI);
    const out = await wikipedia.fetch('Dot_product', { fetchImpl: f });
    expect(out.summary).toMatch(/scalar product/i);
    expect(f.calls[0].url).toContain('/page/summary/Dot_product');
    expect(f.calls[0].opts.headers['User-Agent']).toMatch(/Minima/);
  });

  it('fetch() throws on a non-2xx response (so the cache can serve stale / degrade)', async () => {
    await expect(wikipedia.fetch('Nope', { fetchImpl: fakeFetch({}, { ok: false, status: 404 }) }))
      .rejects.toThrow(/wikipedia/);
  });
});

describe('wolfram adapter', () => {
  it('flattens pods, drops empty subpods, and carries attribution', () => {
    const out = wolfram.parse(WOLF);
    // Input + Result survive; the empty-subpod "Vectors" pod is dropped.
    expect(out.pods.map((p) => p.title)).toEqual(['Input', 'Result']);
    expect(out.pods[1].subpods[0].plaintext).toBe('5');
    expect(out.attribution.text).toBe('Powered by Wolfram|Alpha');
  });

  it('returns empty pods for an unsuccessful queryresult', () => {
    expect(wolfram.parse({ queryresult: { success: false } }).pods).toEqual([]);
  });

  it('queryKey is null when the concept has no wolfram seed', () => {
    expect(wolfram.queryKey({ id: 'x', world: 'la', wikipedia: 'X' })).toBeNull();
    expect(wolfram.queryKey(CONCEPT)).toBe('dot product of (2,3) and (4,-1)');
  });

  it('fetch() throws when no appId is configured (keyless => omitted)', async () => {
    await expect(wolfram.fetch('q', { fetchImpl: fakeFetch(WOLF), appId: null }))
      .rejects.toThrow(/WOLFRAM_APP_ID/);
  });

  it('fetch() includes the appId and input in the URL', async () => {
    const f = fakeFetch(WOLF);
    await wolfram.fetch('dot product', { fetchImpl: f, appId: 'SECRET' });
    expect(f.calls[0].url).toContain('appid=SECRET');
    expect(f.calls[0].url).toContain('input=dot%20product');
  });
});

describe('cache — cache-first + serve-stale (fake store, no DB)', () => {
  const future = () => new Date(Date.now() + 86_400_000);
  const past = () => new Date(Date.now() - 86_400_000);

  it('returns a FRESH cache hit without calling upstream', async () => {
    const store = fakeStore([['wikipedia', 'Dot_product', { payload: { summary: 'cached' }, expires_at: future() }]]);
    const never = () => { throw new Error('upstream must not be called on a fresh hit'); };
    const out = await cachedFetch({ adapter: wikipedia, concept: CONCEPT, store, fetchOpts: { fetchImpl: never } });
    expect(out).toEqual({ summary: 'cached' });
    expect(store.calls.set).toBe(0);
  });

  it('on a MISS fetches upstream and writes through', async () => {
    const store = fakeStore();
    const out = await cachedFetch({ adapter: wikipedia, concept: CONCEPT, store, fetchOpts: { fetchImpl: fakeFetch(WIKI) } });
    expect(out.summary).toMatch(/dot product/i);
    expect(store.calls.set).toBe(1);
    expect(store.map.get('wikipedia|Dot_product')).toBeTruthy();
  });

  it('serves STALE payload when the upstream fetch fails', async () => {
    const store = fakeStore([['wikipedia', 'Dot_product', { payload: { summary: 'stale but valid' }, expires_at: past() }]]);
    const boom = async () => { throw new Error('upstream 503'); };
    const out = await cachedFetch({ adapter: wikipedia, concept: CONCEPT, store, fetchOpts: { fetchImpl: boom } });
    expect(out).toEqual({ summary: 'stale but valid' });
  });

  it('returns null on a miss when upstream is also down (nothing to serve)', async () => {
    const store = fakeStore();
    const boom = async () => { throw new Error('offline'); };
    const out = await cachedFetch({ adapter: wikipedia, concept: CONCEPT, store, fetchOpts: { fetchImpl: boom } });
    expect(out).toBeNull();
  });

  it('returns null (no upstream call) when the adapter does not apply to the concept', async () => {
    const store = fakeStore();
    const out = await cachedFetch({ adapter: wolfram, concept: { id: 'x', world: 'la', wikipedia: 'X' }, store });
    expect(out).toBeNull();
    expect(store.calls.get).toBe(0);
  });

  it('uses long, source-specific TTLs (math content is stable)', () => {
    expect(ttlFor('wolfram')).toBeGreaterThanOrEqual(30 * 86_400_000);
    expect(ttlFor('wikipedia')).toBeGreaterThanOrEqual(30 * 86_400_000);
  });
});

describe('buildConceptBundle — assembly + graceful degradation', () => {
  it('always includes registry-derived related concepts (prereqs + world siblings)', () => {
    const rel = buildRelated(getConcept('dot-product'));
    expect(rel.some((r) => r.id === 'vectors')).toBe(true); // a prereq
    expect(rel.every((r) => r.id !== 'dot-product')).toBe(true); // never self
  });

  it('includes Wikipedia summary; omits pods when NO key is configured', async () => {
    const store = fakeStore();
    const bundle = await buildConceptBundle(getConcept('dot-product'), {
      store,
      wolframAppId: null, // keyless
      wikiFetchOpts: { fetchImpl: fakeFetch(WIKI) },
    });
    expect(bundle.summary).toMatch(/dot product/i);
    expect(bundle.attribution.wikipedia).toBeTruthy();
    expect(bundle.pods).toBeUndefined();
    expect(bundle.attribution.wolfram).toBeUndefined();
    expect(Array.isArray(bundle.related)).toBe(true);
  });

  it('includes Wolfram pods when a key AND a seed are present', async () => {
    const store = fakeStore();
    const bundle = await buildConceptBundle(getConcept('dot-product'), {
      store,
      wolframAppId: 'TESTKEY',
      wikiFetchOpts: { fetchImpl: fakeFetch(WIKI) },
      wolframFetchOpts: { fetchImpl: fakeFetch(WOLF) },
    });
    expect(bundle.pods.length).toBe(2);
    expect(bundle.attribution.wolfram.text).toBe('Powered by Wolfram|Alpha');
  });

  it('degrades to a keyless { related } bundle when every upstream fails', async () => {
    const store = fakeStore();
    const boom = async () => { throw new Error('offline'); };
    const bundle = await buildConceptBundle(getConcept('dot-product'), {
      store,
      wolframAppId: null,
      wikiFetchOpts: { fetchImpl: boom },
    });
    expect(bundle.summary).toBeUndefined();
    expect(bundle.pods).toBeUndefined();
    expect(bundle.attribution).toEqual({});
    expect(bundle.related.length).toBeGreaterThan(0);
  });
});

describe('GET /api/kb/concept/[slug] — route degradation', () => {
  const origKey = process.env.WOLFRAM_APP_ID;
  beforeEach(() => {
    delete process.env.WOLFRAM_APP_ID; // prove the keyless path
    // no network in CI: any real fetch attempt rejects, exercising degradation
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline in CI'); }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (origKey !== undefined) process.env.WOLFRAM_APP_ID = origKey;
  });

  async function callGET(slug) {
    const { GET } = await import('@/app/api/kb/concept/[slug]/route.js');
    return GET(new Request('http://localhost/api/kb/concept/' + slug), { params: Promise.resolve({ slug }) });
  }

  it('returns 200 with a keyless bundle (related present, no summary/pods) when upstreams are unreachable', async () => {
    const res = await callGET('dot-product');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.related)).toBe(true);
    expect(body.related.length).toBeGreaterThan(0);
    expect(body.summary).toBeUndefined();
    expect(body.pods).toBeUndefined();
  });

  it('404s an unknown slug', async () => {
    const res = await callGET('not-a-real-concept');
    expect(res.status).toBe(404);
  });

  it('400s a malformed slug', async () => {
    const res = await callGET('Not A Slug');
    expect(res.status).toBe(400);
  });
});
