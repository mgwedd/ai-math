/* KB service layer — public entry (docs/KNOWLEDGE-BASE-PLAN.md §4.2, §5, PR 3).
   ----------------------------------------------------------------
   buildConceptBundle(concept) assembles the enrichment bundle served by
   GET /api/kb/concept/[slug]:

     {
       related:     [{ id, title, world }, ...],   // always present (registry-only)
       summary?:    string,                         // Wikipedia extract
       title?:      string,                         // Wikipedia article title
       url?:        string,                         // Wikipedia article URL
       pods?:       [{ title, subpods:[...] }],     // Wolfram, only when configured
       attribution: { wikipedia?, wolfram? },        // per-source, only for what's present
     }

   GRACEFUL DEGRADATION IS A HARD REQUIREMENT (§10): a missing WOLFRAM_APP_ID,
   an upstream failure, a rate-limit, or a DB hiccup drops the affected field
   and leaves the rest of the bundle intact. The worst case is `{ related, ... }`
   with nothing external — never an error. NO free-form proxying: every query
   is derived from the REGISTRY concept, never from user input. */
import { getConcept, CONCEPTS } from '../curriculum/concepts.js';
import { wikipedia } from './sources/wikipedia.js';
import { wolfram, wolframAppId } from './sources/wolfram.js';
import { wolframSteps } from './sources/wolfram-steps.js';
import { cachedFetch } from './cache.js';

export { wikipedia, wolfram, wolframSteps, wolframAppId, cachedFetch };

// Max "concepts sharing this world" to append after the (always-included)
// prereqs, to keep `related` a useful shortlist rather than a world dump.
const MAX_WORLD_SIBLINGS = 6;

// related = the concept's prereqs (the pedagogically-nearest neighbours) plus a
// few same-world siblings. Registry-only: pure, synchronous, never fails.
export function buildRelated(concept) {
  const out = [];
  const seen = new Set([concept.id]);
  const add = (id) => {
    if (seen.has(id)) return;
    const c = getConcept(id);
    if (!c) return;
    seen.add(id);
    out.push({ id: c.id, title: c.title, world: c.world });
  };
  for (const pr of concept.prereqs || []) add(pr);
  let siblings = 0;
  for (const c of CONCEPTS.values()) {
    if (siblings >= MAX_WORLD_SIBLINGS) break;
    if (c.world === concept.world && !seen.has(c.id)) {
      add(c.id);
      siblings++;
    }
  }
  return out;
}

/**
 * Build the enrichment bundle for a registry concept. Cache-first; every
 * external lookup is best-effort and omitted on failure.
 *
 * @param {object} concept          a registry concept (from getConcept)
 * @param {object} [opts]
 * @param {object} [opts.store]     cache store override (tests)
 * @param {() => number} [opts.now] clock override (tests)
 * @param {object} [opts.wikiFetchOpts]    passed to the Wikipedia adapter.fetch
 * @param {object} [opts.wolframFetchOpts] passed to the Wolfram adapter.fetch
 * @param {string|null} [opts.wolframAppId] force a key on/off (tests); defaults to env
 */
export async function buildConceptBundle(concept, opts = {}) {
  const bundle = { related: buildRelated(concept), attribution: {} };
  const store = opts.store;
  const now = opts.now;

  // RESEARCH: Wikipedia summary (no key required).
  const wiki = await cachedFetch({
    adapter: wikipedia,
    concept,
    store,
    now,
    fetchOpts: opts.wikiFetchOpts,
  });
  if (wiki && wiki.summary) {
    bundle.summary = wiki.summary;
    bundle.title = wiki.title;
    bundle.url = wiki.url;
    bundle.attribution.wikipedia = wiki.attribution;
  }

  // VERIFY & COMPUTE: Wolfram pods — ONLY when the concept has a `wolfram` seed
  // AND a key is configured. No seed or no key => silently omitted.
  const appId = opts.wolframAppId !== undefined ? opts.wolframAppId : wolframAppId();
  if (concept.wolfram && appId) {
    const w = await cachedFetch({
      adapter: wolfram,
      concept,
      store,
      now,
      fetchOpts: { appId, ...(opts.wolframFetchOpts || {}) },
    });
    if (w && Array.isArray(w.pods) && w.pods.length) {
      bundle.pods = w.pods;
      bundle.attribution.wolfram = w.attribution;
    }
  }

  return bundle;
}

/**
 * Build the Wolfram Show-Steps bundle for a single registry-derived query
 * (a question's `wolfram` hint), served by POST /api/kb/steps (PR 4).
 * Cache-first via the `wolfram_steps` partition; keyless / upstream-failure /
 * empty-result all degrade to `{}` (§10 — the UI shows nothing, staying
 * pixel-identical). The `query` is NEVER user text: the route resolves it from
 * the curriculum registry before calling here (§10 "No free-form proxying").
 *
 * @param {string} query                 the registry-derived Show-Steps query
 * @param {object} [opts]
 * @param {object} [opts.store]          cache store override (tests)
 * @param {() => number} [opts.now]      clock override (tests)
 * @param {object} [opts.wolframFetchOpts] passed to the adapter.fetch
 * @param {string|null} [opts.wolframAppId] force a key on/off (tests); default env
 * @returns {Promise<{steps?, attribution?}>} `{}` when nothing renderable
 */
export async function buildStepsBundle(query, opts = {}) {
  if (typeof query !== 'string' || !query) return {};
  const appId = opts.wolframAppId !== undefined ? opts.wolframAppId : wolframAppId();
  if (!appId) return {}; // no key => steps are simply unavailable

  const w = await cachedFetch({
    adapter: wolframSteps,
    concept: { wolfram: query },
    store: opts.store,
    now: opts.now,
    fetchOpts: { appId, ...(opts.wolframFetchOpts || {}) },
  });
  if (w && Array.isArray(w.pods) && w.pods.length) {
    return { steps: w.pods, attribution: { wolfram: w.attribution } };
  }
  return {};
}
