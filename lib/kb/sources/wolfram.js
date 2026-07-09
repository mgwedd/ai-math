/* Wolfram|Alpha adapter — the VERIFY & COMPUTE stage
   (docs/KNOWLEDGE-BASE-PLAN.md §3). Hits the Full Results API (JSON output),
   flattens the pod/subpod tree into a compact { pods } shape, and carries the
   required "Powered by Wolfram|Alpha" attribution (§10 "Licensing").

   Requires WOLFRAM_APP_ID (server-side only). When the key is absent the
   adapter is a no-op by contract: fetch() throws and the cache layer / bundle
   builder degrade gracefully (§10 "Graceful degradation is a hard requirement").
   See ./_shared.js for the adapter contract. */
import { USER_AGENT } from './_shared.js';

const FULL_RESULTS = 'https://api.wolframalpha.com/v2/query';

const ATTRIBUTION = {
  source: 'Wolfram|Alpha',
  text: 'Powered by Wolfram|Alpha',
  url: 'https://www.wolframalpha.com/',
};

export function wolframAppId() {
  return process.env.WOLFRAM_APP_ID || null;
}

export const wolfram = {
  source: 'wolfram',

  queryKey(concept) {
    if (!concept || typeof concept.wolfram !== 'string' || !concept.wolfram) return null;
    return concept.wolfram; // registry-supplied query seed, e.g. 'dot product of (2,3) and (4,-1)'
  },

  // Pure normalization of a Full Results API JSON body into { pods, attribution }.
  // Each pod -> { title, subpods:[{ title, plaintext }] }; empty subpods dropped.
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
    if (!appId) throw new Error('wolfram: WOLFRAM_APP_ID not configured');
    const url =
      FULL_RESULTS +
      '?appid=' + encodeURIComponent(appId) +
      '&output=json&format=plaintext&input=' + encodeURIComponent(queryKey);
    const res = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (!res.ok) throw new Error('wolfram: HTTP ' + res.status + ' for ' + queryKey);
    return wolfram.parse(await res.json());
  },
};
