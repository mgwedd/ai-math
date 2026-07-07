/* Wolfram|Alpha Show-Steps adapter — the "worked solution" side of the
   VERIFY & COMPUTE stage (docs/KNOWLEDGE-BASE-PLAN.md §3, §5 /api/kb/steps).
   ----------------------------------------------------------------
   The Show Steps API is an EXTENSION of the Full Results API: the same
   endpoint, but requesting the "Step-by-step solution" pod state so the
   response carries a worked derivation rather than just the final pods. This
   adapter mirrors ./wolfram.js (same endpoint, same attribution, same
   contract in ./_shared.js) but partitions its cache under `wolfram_steps`
   (see lib/kb/cache.js TTL_MS) so steps and full-results never collide.

   Requires WOLFRAM_APP_ID (server-side only). Keyless => fetch() throws and
   the cache layer / route degrade to nothing (§10 "Graceful degradation is a
   hard requirement"). The queryKey is ALWAYS a registry-derived string (a
   question's `wolfram` hint), NEVER raw user text — this is what keeps
   /api/kb/steps free of free-form proxying (§10). */
import { USER_AGENT } from './_shared.js';
import { wolframAppId } from './wolfram.js';

const FULL_RESULTS = 'https://api.wolframalpha.com/v2/query';

// The pod state that turns a Full Results query into a Show-Steps query.
const STEP_PODSTATE = 'Step-by-step solution';

const ATTRIBUTION = {
  source: 'Wolfram|Alpha',
  text: 'Powered by Wolfram|Alpha',
  url: 'https://www.wolframalpha.com/',
};

export const wolframSteps = {
  source: 'wolfram_steps',

  // The query is supplied on a `wolfram` field — a registry concept's seed OR
  // a question's `wolfram` hint. Either way it is server-derived, never user
  // input. Returns null when there is no query, so the cache layer no-ops.
  queryKey(src) {
    if (!src || typeof src.wolfram !== 'string' || !src.wolfram) return null;
    return src.wolfram;
  },

  // Pure normalization of a Full Results (Show-Steps) JSON body into
  // { pods, attribution }. Each pod -> { title, subpods:[{ title, plaintext }] };
  // empty subpods dropped. Step-by-step content arrives as a subpod whose
  // plaintext holds the newline-separated worked derivation.
  parse(raw) {
    const qr = raw && raw.queryresult;
    if (!qr || qr.success === false || qr.error) {
      return { pods: [], attribution: ATTRIBUTION };
    }
    const pods = (Array.isArray(qr.pods) ? qr.pods : [])
      .map((p) => ({
        id: p.id || null,
        title: p.title || '',
        primary: !!p.primary,
        subpods: (Array.isArray(p.subpods) ? p.subpods : [])
          .map((s) => ({ title: s.title || '', plaintext: typeof s.plaintext === 'string' ? s.plaintext : '' }))
          .filter((s) => s.plaintext),
      }))
      .filter((p) => p.subpods.length);
    return { pods, attribution: ATTRIBUTION };
  },

  async fetch(queryKey, { fetchImpl = fetch, appId = wolframAppId() } = {}) {
    if (!appId) throw new Error('wolfram-steps: WOLFRAM_APP_ID not configured');
    const url =
      FULL_RESULTS +
      '?appid=' + encodeURIComponent(appId) +
      '&output=json&format=plaintext' +
      '&podstate=' + encodeURIComponent(STEP_PODSTATE) +
      '&input=' + encodeURIComponent(queryKey);
    const res = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (!res.ok) throw new Error('wolfram-steps: HTTP ' + res.status + ' for ' + queryKey);
    return wolframSteps.parse(await res.json());
  },
};
