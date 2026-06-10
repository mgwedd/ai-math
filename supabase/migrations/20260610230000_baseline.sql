-- Baseline schema (squashed 2026-06-10, pre-launch: replaces the
-- username-era migrations). All data keys to auth.users (uuid); profiles
-- are auto-provisioned on signup; RLS restricts every table to its owner.
-- From here on, history is append-only — never edit or squash applied
-- migrations once any environment you can't rewrite depends on them.

CREATE TABLE profiles (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT NOT NULL UNIQUE
             CHECK (username ~ '^[a-z0-9_-]{1,32}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE progress (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state      JSONB   NOT NULL DEFAULT '{}'::jsonb,
  xp         INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE xp_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta      INTEGER NOT NULL,
  xp_after   INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX xp_events_user_time_idx ON xp_events (user_id, created_at);
CREATE INDEX progress_xp_idx ON progress (xp DESC);

CREATE TABLE quiz_answers (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id    TEXT    NOT NULL,
  question_idx INTEGER NOT NULL,
  correct      BOOLEAN NOT NULL,
  first_try    BOOLEAN NOT NULL,
  answered_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX quiz_answers_user_lesson_idx ON quiz_answers (user_id, lesson_id);

CREATE TABLE lesson_completions (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id    TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE VIEW lesson_accuracy WITH (security_invoker = true) AS
SELECT qa.user_id,
       qa.lesson_id,
       count(*) FILTER (WHERE qa.correct)::float / count(*) AS accuracy,
       count(*) AS attempts
FROM quiz_answers qa
GROUP BY qa.user_id, qa.lesson_id;

-- ----------------------------------------------------------------
-- Auto-provision a profile when a user signs up.
-- security definer + pinned search_path per Supabase guidance.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  base text;
BEGIN
  base := left(regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_-]', '', 'g'), 24);
  IF base IS NULL OR base = '' THEN base := 'learner'; END IF;

  INSERT INTO public.profiles (user_id, username)
  VALUES (new.id, base)
  ON CONFLICT DO NOTHING;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (user_id, username)
    VALUES (new.id, base || '-' || left(md5(new.id::text), 6))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------
-- RLS: each authenticated user touches only their own rows.
-- The app's server-side pg connection (table owner) bypasses RLS;
-- these policies govern the Supabase Data API and any future
-- client-side supabase-js data access.
-- ----------------------------------------------------------------
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress           ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own profile" ON profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "read own progress" ON progress
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "insert own progress" ON progress
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "update own progress" ON progress
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "read own xp_events" ON xp_events
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "insert own xp_events" ON xp_events
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "read own quiz_answers" ON quiz_answers
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "insert own quiz_answers" ON quiz_answers
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "read own lesson_completions" ON lesson_completions
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "insert own lesson_completions" ON lesson_completions
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

-- Only the auth.users trigger may run the provisioning function
-- (it is SECURITY DEFINER; Data API /rpc must not expose it).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
