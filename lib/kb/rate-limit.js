/* Per-user daily rate caps for the KB routes (PR 7, hardening — see
   docs/KNOWLEDGE-BASE-PLAN.md §10 "Rate limiting" and the PR 7 section in
   §11).
   ----------------------------------------------------------------
   The app is serverless (many concurrent function instances), so an
   in-process counter can't enforce a real per-user cap — this module
   increments a tiny durable counter (public.kb_usage, one row per
   user/day/route) and compares it against a generous, env-configurable cap.

   FAIL-OPEN IS A HARD REQUIREMENT: a rate limiter is infrastructure hardening,
   not a feature — if the usage table isn't migrated yet, or the DB hiccups, we
   must not turn that into a 500/429 storm for every user. Any store error
   resolves to "allowed", exactly like lib/kb/cache.js never lets a cache
   failure break a request.

   The store is injectable ({ increment(userId, route, day) -> count }) so this
   logic is unit-testable with a plain in-memory fake — no database. */
import { pool } from '../db.js';

// Generous defaults, overridable per-route via env so an operator can tune
// caps without a code change (house rule: tunables live in SCORING/env, never
// as literals in the route). A cap of 0 (or unset + no default) disables the
// check for that route.
const DEFAULT_CAP = numEnv('KB_RATE_LIMIT_DEFAULT_CAP', 300);
const ROUTE_ENV = {
  'kb-concept': 'KB_CONCEPT_DAILY_CAP',
  'kb-steps': 'KB_STEPS_DAILY_CAP',
  practice: 'PRACTICE_DAILY_CAP',
};
// Per-route fallback defaults when the specific env var is unset (kept
// conservative-but-generous — normal usage of the app is nowhere near these).
const ROUTE_DEFAULT = {
  'kb-concept': 300,
  'kb-steps': 200,
  practice: 100,
};

function numEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

// The cap in effect for a route: ROUTE_ENV override -> ROUTE_DEFAULT -> DEFAULT_CAP.
export function capFor(route) {
  const envVar = ROUTE_ENV[route];
  if (envVar && process.env[envVar] != null && process.env[envVar] !== '') {
    return numEnv(envVar, ROUTE_DEFAULT[route] ?? DEFAULT_CAP);
  }
  return ROUTE_DEFAULT[route] ?? DEFAULT_CAP;
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

// Default store: the public.kb_usage table (migration 20260707140000). The
// app's server pg role owns the table and bypasses RLS; no policy grants
// needed (mirrors kb_cache / question_bank).
export const pgUsageStore = {
  async increment(userId, route, day) {
    const r = await pool.query(
      `INSERT INTO kb_usage (user_id, day, route, count)
         VALUES ($1, $2, $3, 1)
       ON CONFLICT (user_id, day, route)
         DO UPDATE SET count = kb_usage.count + 1
       RETURNING count`,
      [userId, day, route]
    );
    return r.rows[0].count;
  },
};

/**
 * Check + increment a user's daily usage counter for `route`. Fails OPEN: any
 * store error (table missing, DB down) is logged (via the caller-supplied
 * `onError`) and treated as allowed, never a block.
 *
 * @param {object} a
 * @param {string} a.userId
 * @param {string} a.route      one of 'kb-concept' | 'kb-steps' | 'practice'
 * @param {object} [a.store]    { increment(userId, route, day) -> count } — defaults to pgUsageStore
 * @param {number} [a.cap]      override the cap; defaults to capFor(route)
 * @param {string} [a.day]      override the UTC day key (tests); defaults to today
 * @param {(e: Error) => void} [a.onError] called (not thrown) on a store failure
 * @returns {Promise<{allowed: boolean, count: number, cap: number, failedOpen?: boolean}>}
 */
export async function checkRateLimit({
  userId,
  route,
  store = pgUsageStore,
  cap,
  day = todayUTC(),
  onError,
} = {}) {
  const limit = cap != null ? cap : capFor(route);
  if (!Number.isFinite(limit) || limit <= 0) {
    // A non-positive cap disables the check entirely for this route.
    return { allowed: true, count: 0, cap: limit };
  }
  try {
    const count = await store.increment(userId, route, day);
    return { allowed: count <= limit, count, cap: limit };
  } catch (e) {
    if (onError) {
      try { onError(e); } catch { /* logging must never itself throw */ }
    }
    return { allowed: true, count: 0, cap: limit, failedOpen: true };
  }
}
