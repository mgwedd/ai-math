/* ================================================================
   KB SOURCE ADAPTERS — shared interface (docs/KNOWLEDGE-BASE-PLAN.md §3, §5).
   ----------------------------------------------------------------
   Each external wellspring (Wikipedia = research, Wolfram|Alpha = verify/
   compute) is wrapped by ONE adapter object with the same shape, so the cache
   layer (lib/kb/cache.js) and the bundle builder (lib/kb/index.js) can treat
   them interchangeably:

     const adapter = {
       source: 'wikipedia',                // cache partition + kb_cache.source

       // Derive the cache/query key for a concept from the REGISTRY entry only.
       // Returns null when this adapter does not apply to the concept (e.g. a
       // concept with no `wolfram` seed). NEVER derives keys from user input —
       // this is what makes "no free-form proxying" (§10) structural.
       queryKey(concept) -> string | null,

       // Pure: normalize a raw upstream JSON response into the adapter's stable
       // shape. Unit-tested directly against committed fixtures (no network).
       parse(raw) -> normalized,

       // Network: fetch(queryKey) + parse(). Throws on non-2xx / transport
       // error / missing credentials so the cache layer can serve stale or
       // degrade. `opts.fetchImpl` (default global fetch) is injectable for
       // tests; adapters that need a key also read it from opts / env.
       async fetch(queryKey, opts) -> normalized,
     };

   Keys are SERVER-SIDE ONLY (§10). The client never calls a wellspring; it
   only ever reaches /api/kb/*, which builds queryKeys from the registry.
   ================================================================ */

// Wikimedia's 2026 API policy requires a descriptive, contactable User-Agent
// on every request (https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits).
// Wolfram is happy with any UA; we send the same one for consistency.
export const USER_AGENT =
  'Minima/2.0 (AI-math learning app; +https://github.com/mgwedd/ai-math) kb-service-layer';
