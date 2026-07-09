-- Per-user daily usage counters for the KB routes (PR 7, hardening — see
-- docs/KNOWLEDGE-BASE-PLAN.md §10 "Rate limiting" and the PR 7 section in
-- §11). The app is serverless (many concurrent function instances), so an
-- in-memory counter per instance would not enforce a real per-user cap; this
-- tiny durable table is the shared counter every instance increments against.
--
-- One row per (user, day, route); `count` is incremented on every request and
-- compared against a route's cap in lib/kb/rate-limit.js. A new day/route
-- pair starts a fresh row (no cleanup job needed — rows are cheap and a
-- maintainer can prune old ones with a plain DELETE on a cron if the table
-- ever grows large enough to matter).
--
-- SERVER-ONLY TABLE, same shape as kb_cache / question_bank: holds no content,
-- only ever touched by the app's server-side pg role (which OWNS the table and
-- BYPASSES RLS). RLS is enabled with NO policies so the Supabase Data API path
-- (anon/authenticated roles) is default-deny.
--
-- FAIL-OPEN BY DESIGN: lib/kb/rate-limit.js treats any error reading/writing
-- this table (not yet migrated, DB hiccup) as "allow the request" — a rate
-- limiter must never turn an infra blip into an outage for every user.
CREATE TABLE public.kb_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day     DATE NOT NULL,
  route   TEXT NOT NULL,          -- 'kb-concept' | 'kb-steps' | 'practice'
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, route)
);

-- RLS enabled, intentionally NO policies (see header comment): server-only,
-- owner bypasses RLS, Data API gets nothing.
ALTER TABLE public.kb_usage ENABLE ROW LEVEL SECURITY;
