/* KB cache layer — cache-first reads with serve-stale-on-error
   (docs/KNOWLEDGE-BASE-PLAN.md §4.2, §10).
   ----------------------------------------------------------------
   Wraps the source adapters (lib/kb/sources/*) with the public.kb_cache table:

     1. Read the cached payload for (source, query_key).
     2. FRESH (expires_at in the future) -> return it, no upstream call.
     3. STALE or MISS -> try the adapter's upstream fetch:
          - success -> write through with a fresh expires_at, return it.
          - failure -> SERVE STALE if we have any cached payload, else null.

   `expires_at` is a REFRESH HINT, not a hard gate: an expired row is still a
   valid fallback when the upstream is down / rate-limited / unconfigured. This
   is why the whole KB surface degrades instead of erroring (§10).

   The `store` is injectable (default: Postgres via `pgStore`) so the logic is
   unit-testable against a plain in-memory fake with no database. */
import { pool } from '../db.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Math content is stable, so TTLs are long (§4.2: 30–90 days). Per source:
export const TTL_MS = {
  wikipedia: 30 * DAY_MS, // prose can be lightly edited; refresh monthly
  wolfram: 90 * DAY_MS, // deterministic computation; effectively immutable
  wolfram_steps: 90 * DAY_MS,
};
const DEFAULT_TTL_MS = 30 * DAY_MS;

export function ttlFor(source) {
  return TTL_MS[source] || DEFAULT_TTL_MS;
}

// Default store: the public.kb_cache table. The app's server pg role owns the
// table and bypasses RLS (see the migration); no policy grants are needed.
export const pgStore = {
  async get(source, queryKey) {
    const r = await pool.query(
      'SELECT payload, fetched_at, expires_at FROM kb_cache WHERE source = $1 AND query_key = $2',
      [source, queryKey]
    );
    return r.rows[0] || null;
  },
  async set(source, queryKey, payload, expiresAt) {
    await pool.query(
      `INSERT INTO kb_cache (source, query_key, payload, fetched_at, expires_at)
         VALUES ($1, $2, $3, now(), $4)
       ON CONFLICT (source, query_key)
         DO UPDATE SET payload = EXCLUDED.payload, fetched_at = now(), expires_at = EXCLUDED.expires_at`,
      [source, queryKey, JSON.stringify(payload), expiresAt]
    );
  },
};

function isFresh(row, nowMs) {
  if (!row || row.expires_at == null) return false;
  const exp = row.expires_at instanceof Date ? row.expires_at.getTime() : new Date(row.expires_at).getTime();
  return Number.isFinite(exp) && exp > nowMs;
}

/**
 * Cache-first fetch for one adapter + concept. Returns the normalized payload,
 * or null when the adapter doesn't apply / upstream fails with no stale copy.
 * NEVER throws for upstream or cache-IO problems — degradation is a hard
 * requirement, so all such failures resolve to a served-stale payload or null.
 *
 * @param {object}  a
 * @param {object}  a.adapter    a source adapter (lib/kb/sources/*)
 * @param {object}  a.concept    a registry concept (source of the queryKey)
 * @param {object} [a.store]     { get, set } — defaults to pgStore
 * @param {number} [a.ttlMs]     override TTL; defaults to ttlFor(adapter.source)
 * @param {() => number} [a.now] clock (ms); injectable for tests
 * @param {object} [a.fetchOpts] passed to adapter.fetch (e.g. { fetchImpl, appId })
 */
export async function cachedFetch({ adapter, concept, store = pgStore, ttlMs, now = Date.now, fetchOpts } = {}) {
  const queryKey = adapter && adapter.queryKey(concept);
  if (queryKey == null) return null; // adapter not applicable to this concept

  const nowMs = now();
  let cached = null;
  try {
    cached = await store.get(adapter.source, queryKey);
  } catch {
    cached = null; // cache read failure must not break the request
  }

  if (isFresh(cached, nowMs)) return cached.payload;

  // Stale or miss: attempt upstream.
  try {
    const payload = await adapter.fetch(queryKey, fetchOpts);
    const expiresAt = new Date(nowMs + (ttlMs != null ? ttlMs : ttlFor(adapter.source)));
    try {
      await store.set(adapter.source, queryKey, payload, expiresAt);
    } catch {
      /* write-through is best-effort; a cache-write failure still serves fresh data */
    }
    return payload;
  } catch {
    // Serve-stale-on-upstream-error: an expired row still beats nothing.
    return cached ? cached.payload : null;
  }
}
