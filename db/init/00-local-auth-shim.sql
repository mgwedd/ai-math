-- LOCAL DOCKER ONLY (never runs on Supabase).
-- Plain postgres:16 lacks Supabase's auth roles and helper functions. This
-- shim creates ONLY the prerequisites that GoTrue does NOT create for itself:
--   * the `auth` schema (GoTrue runs its own migrations *inside* it, creating
--     auth.users / identities / sessions / … — we must NOT create auth.users
--     ourselves or GoTrue's migrations conflict with it),
--   * the `auth.uid()` helper the app migrations' RLS policies reference,
--   * the `anon` / `authenticated` roles those policies GRANT to.
-- The real `auth.users` table is owned by GoTrue (the `auth` service); the
-- one-shot `migrate` service applies the app's supabase/migrations AFTER GoTrue
-- has created it (see docker-compose.yml). Login works locally against GoTrue.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- GoTrue's own migrations GRANT SELECT on auth tables to `postgres` and
-- reference `service_role` / `supabase_auth_admin`. On real Supabase those roles
-- exist; on plain postgres they don't, so GoTrue's migration aborts with
-- `role "postgres" does not exist`. Create them as inert NOLOGIN roles so the
-- grants resolve. (The app connects as $POSTGRES_USER, not these.)
DO $$ BEGIN
  CREATE ROLE postgres NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE ROLE supabase_auth_admin NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
