-- Gradient Ascent schema. Runs automatically on first `docker compose up`
-- (via /docker-entrypoint-initdb.d). To re-run from scratch:
--   docker compose down -v && docker compose up

CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  username   TEXT NOT NULL UNIQUE
             CHECK (username ~ '^[a-z0-9_-]{1,32}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One JSONB snapshot per user. The app state (xp, completed lessons,
-- missions, achievements, streak) is stored as a blob; xp is denormalized
-- for cheap leaderboard queries.
CREATE TABLE progress (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state      JSONB   NOT NULL DEFAULT '{}'::jsonb,
  xp         INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only XP history: every sync that changes xp logs a row.
-- Handy later for charts ("xp over time") or spaced-repetition logic.
CREATE TABLE xp_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta      INTEGER NOT NULL,
  xp_after   INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX xp_events_user_time_idx ON xp_events (user_id, created_at);
CREATE INDEX progress_xp_idx ON progress (xp DESC);

-- Granular UI events, modeled relationally (the JSONB snapshot can't answer
-- "which questions does Michael keep missing?" — these tables can).

CREATE TABLE quiz_answers (
  id           BIGSERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id    TEXT    NOT NULL,            -- e.g. 'la-vectors' (lesson registry key)
  question_idx INTEGER NOT NULL,
  correct      BOOLEAN NOT NULL,            -- was this click the right answer
  first_try    BOOLEAN NOT NULL,            -- answered right with no misses
  answered_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX quiz_answers_user_lesson_idx ON quiz_answers (user_id, lesson_id);

CREATE TABLE lesson_completions (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id    TEXT    NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)          -- first completion only
);

-- Convenience view: per-lesson quiz accuracy per user.
CREATE VIEW lesson_accuracy AS
SELECT u.username,
       qa.lesson_id,
       count(*) FILTER (WHERE qa.correct)::float / count(*) AS accuracy,
       count(*) AS attempts
FROM quiz_answers qa
JOIN users u ON u.id = qa.user_id
GROUP BY u.username, qa.lesson_id;
