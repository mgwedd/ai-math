-- KB response cache (docs/KNOWLEDGE-BASE-PLAN.md §4.2, PR 3).
--
-- A GLOBAL (not per-user) cache of external wellspring responses so the free
-- tiers of Wikipedia / Wolfram|Alpha survive real traffic. Every KB route is
-- cache-first; `expires_at` is a REFRESH HINT (when to re-fetch), not a hard
-- gate — on an upstream failure the service serves the stale payload instead
-- of erroring. Math content is stable, so TTLs are long (30–90 days; the
-- per-source values live in lib/kb/cache.js).
--
-- SERVER-ONLY TABLE. Unlike the per-user tables in the baseline (which grant
-- owner-scoped policies to `authenticated`), this table holds no user data and
-- is only ever touched by the app's server-side pg role — which OWNS the table
-- and therefore BYPASSES RLS. We still ENABLE row level security so that the
-- Supabase Data API path (anon / authenticated roles, which are NOT the owner)
-- is default-deny: with RLS on and NO policies defined, those roles can read
-- and write exactly nothing. This keeps cached third-party payloads (and any
-- future non-public content) off the public Data API entirely.
CREATE TABLE public.kb_cache (
  source     TEXT NOT NULL,          -- 'wikipedia' | 'wolfram' | 'wolfram_steps'
  query_key  TEXT NOT NULL,          -- normalized query string (registry-derived)
  payload    JSONB NOT NULL,         -- normalized adapter response
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,   -- refresh hint, not a hard expiry
  PRIMARY KEY (source, query_key)
);

-- RLS enabled, intentionally NO policies (see header comment): server-only,
-- owner bypasses RLS, Data API gets nothing.
ALTER TABLE public.kb_cache ENABLE ROW LEVEL SECURITY;
