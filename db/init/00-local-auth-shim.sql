-- LOCAL DOCKER ONLY (never runs on Supabase).
-- Plain postgres:16 lacks Supabase's auth schema and roles; this shim
-- provides just enough of them for the migrations in /migrations to apply,
-- so `docker compose up` still gives you a working local database.
-- NOTE: there is no local auth server — login against the compose stack
-- isn't possible; use cloud Supabase for full-stack local dev (README).

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id    UUID PRIMARY KEY,
  email TEXT
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
