/* KB Show-Steps tests (Vitest) — PR 4 of the knowledge-base plan
   (docs/KNOWLEDGE-BASE-PLAN.md §5, §10).
   ----------------------------------------------------------------
   NO live network and NO database: the wolfram-steps adapter is unit-tested
   against a committed FIXTURE, buildStepsBundle runs against an in-memory fake
   store, and POST /api/kb/steps is exercised with mocked auth + db + a
   rejecting global fetch to prove keyless graceful degradation AND the
   no-free-form-proxying guard (only a registry-resolved question_key works). */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { wolframSteps } from '../lib/kb/sources/wolfram-steps.js';
import { buildStepsBundle } from '../lib/kb/index.js';

// db + auth are mocked file-wide so importing the KB layer never constructs a
// real pg Pool and the route test can run without a database or session.
vi.mock('@/lib/db', () => ({
  pool: { query: async () => ({ rows: [] }) },
  readJson: async (req) => ({ body: JSON.parse(await req.text()) }),
  logRouteError: () => 'DB_QUERY',
}));
vi.mock('@/lib/auth-server', () => ({
  getAuthUser: async () => ({ id: 'test-user' }),
}));

const fixture = (name) =>
  JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/' + name, import.meta.url)), 'utf8'));
const STEPS = fixture('wolfram-steps-derivative.json');

function fakeFetch(payload, { ok = true, status = 200 } = {}) {
  const calls = [];
  const impl = async (url, opts) => {
    calls.push({ url, opts });
    return { ok, status, json: async () => payload };
  };
  impl.calls = calls;
  return impl;
}

function fakeStore(seed = []) {
  const map = new Map();
  for (const [source, key, row] of seed) map.set(source + '|' + key, row);
  return {
    map,
    calls: { get: 0, set: 0 },
    async get(source, key) { this.calls.get++; return map.get(source + '|' + key) || null; },
    async set(source, key, payload, expiresAt) {
      this.calls.set++;
      map.set(source + '|' + key, { payload, fetched_at: new Date(), expires_at: expiresAt });
    },
  };
}

describe('wolfram-steps adapter', () => {
  it('flattens step pods, drops empty subpods, and carries attribution', () => {
    const out = wolframSteps.parse(STEPS);
    // Input + Result survive; the empty-subpod "Plots" pod is dropped.
    expect(out.pods.map((p) => p.title)).toEqual(['Input', 'Result']);
    expect(out.pods[1].subpods[0].plaintext).toMatch(/= 3 x\^2/);
    expect(out.attribution.text).toBe('Powered by Wolfram|Alpha');
  });

  it('returns empty pods for an unsuccessful queryresult', () => {
    expect(wolframSteps.parse({ queryresult: { success: false } }).pods).toEqual([]);
  });

  it('derives its query key from the `wolfram` field (null when absent)', () => {
    expect(wolframSteps.queryKey({ wolfram: 'derivative of x^3 at x = 2' })).toBe('derivative of x^3 at x = 2');
    expect(wolframSteps.queryKey({ wolfram: '' })).toBeNull();
    expect(wolframSteps.queryKey({})).toBeNull();
  });

  it('fetch() throws when no appId is configured (keyless => omitted)', async () => {
    await expect(wolframSteps.fetch('q', { fetchImpl: fakeFetch(STEPS), appId: null }))
      .rejects.toThrow(/WOLFRAM_APP_ID/);
  });

  it('fetch() requests the Step-by-step pod state and includes the input', async () => {
    const f = fakeFetch(STEPS);
    await wolframSteps.fetch('derivative of x^3', { fetchImpl: f, appId: 'SECRET' });
    expect(f.calls[0].url).toContain('appid=SECRET');
    expect(f.calls[0].url).toContain('podstate=Step-by-step');
    expect(f.calls[0].url).toContain('input=derivative%20of%20x%5E3');
  });
});

describe('buildStepsBundle — assembly + graceful degradation', () => {
  it('returns {} with NO key configured (keyless => steps unavailable)', async () => {
    const store = fakeStore();
    const out = await buildStepsBundle('derivative of x^3 at x = 2', { store, wolframAppId: null });
    expect(out).toEqual({});
    expect(store.calls.get).toBe(0); // never even touches the cache
  });

  it('returns {} for an empty/blank query', async () => {
    expect(await buildStepsBundle('', { wolframAppId: 'K' })).toEqual({});
    expect(await buildStepsBundle(undefined, { wolframAppId: 'K' })).toEqual({});
  });

  it('returns { steps, attribution } when a key + fixture are present', async () => {
    const store = fakeStore();
    const out = await buildStepsBundle('derivative of x^3 at x = 2', {
      store, wolframAppId: 'TESTKEY', wolframFetchOpts: { fetchImpl: fakeFetch(STEPS) },
    });
    expect(out.steps.length).toBe(2);
    expect(out.attribution.wolfram.text).toBe('Powered by Wolfram|Alpha');
    expect(store.map.get('wolfram_steps|derivative of x^3 at x = 2')).toBeTruthy();
  });

  it('degrades to {} when the upstream fetch fails with no cached copy', async () => {
    const store = fakeStore();
    const boom = async () => { throw new Error('offline'); };
    const out = await buildStepsBundle('q', { store, wolframAppId: 'K', wolframFetchOpts: { fetchImpl: boom } });
    expect(out).toEqual({});
  });
});

describe('POST /api/kb/steps — degradation + no-free-form-proxying guard', () => {
  const origKey = process.env.WOLFRAM_APP_ID;
  beforeEach(() => {
    delete process.env.WOLFRAM_APP_ID; // prove the keyless path
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline in CI'); }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (origKey !== undefined) process.env.WOLFRAM_APP_ID = origKey;
  });

  async function callPOST(body) {
    const { POST } = await import('@/app/api/kb/steps/route.js');
    return POST(new Request('http://localhost/api/kb/steps', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }));
  }
  async function callGET() {
    const { GET } = await import('@/app/api/kb/steps/route.js');
    return GET();
  }

  it('GET reports capability=false when no key is configured (keyless probe)', async () => {
    const res = await callGET();
    expect(res.status).toBe(200);
    expect((await res.json()).available).toBe(false);
  });

  it('resolves a real hinted question_key but degrades to 200 {} when keyless', async () => {
    // la-vectors quiz[0] is the magnitude numeric that carries a `wolfram` hint.
    const res = await callPOST({ question_key: 'la-vectors:0' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
  });

  it('404s a question that declares no `wolfram` hint (no arbitrary query possible)', async () => {
    // la-vectors quiz[1] is an mc magnitude question — no hint => not eligible.
    const res = await callPOST({ question_key: 'la-vectors:1' });
    expect(res.status).toBe(404);
  });

  it('404s an unknown lesson / malformed key', async () => {
    expect((await callPOST({ question_key: 'no-such-lesson:0' })).status).toBe(404);
    expect((await callPOST({ question_key: 'not a key' })).status).toBe(404);
    expect((await callPOST({ question_key: 'la-vectors:999' })).status).toBe(404);
  });

  it('IGNORES any client-supplied free-form query (only question_key is honored)', async () => {
    // A raw Wolfram query in the body must NOT be proxied: with no resolvable
    // question_key the route 404s regardless of what `query`/`input` say.
    const res = await callPOST({ query: 'delete all the things', input: '2+2' });
    expect(res.status).toBe(404);
  });
});
