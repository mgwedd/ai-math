-- Rich answer telemetry (PR 2, see docs/KNOWLEDGE-BASE-PLAN.md §4.1). The
-- running list of what a learner gets wrong is already durable per-lesson
-- (quiz_answers) but discards the concept tag, which distractor was picked,
-- and which flow produced the attempt. This makes it a first-class,
-- queryable cross-curriculum signal instead.
--
-- All new columns are nullable or defaulted so rows written by OLD clients
-- (no new fields on the quiz_answer event) keep inserting unchanged.

ALTER TABLE quiz_answers
  ADD COLUMN tag          TEXT,            -- concept slug (lib/curriculum/concepts.js), NULL for legacy rows / untagged questions
  ADD COLUMN qtype        TEXT,            -- 'mc' | 'numeric' | 'order'
  ADD COLUMN chosen       TEXT,            -- distractor text/value the learner picked (wrong answers only)
  ADD COLUMN question_key TEXT,            -- stable content id: 'la-dot:2' (lessonId:questionIdx for static pool questions)
  ADD COLUMN context      TEXT NOT NULL DEFAULT 'lesson'
    CHECK (context IN ('lesson','review','exam','practice'));

CREATE INDEX quiz_answers_user_tag_idx ON quiz_answers (user_id, tag);

-- "What does this user get wrong, across the whole curriculum" — the
-- durable, queryable version of the per-lesson client-side S.weak map.
-- security_invoker mirrors lesson_accuracy above: RLS on the base table
-- (owner-only) governs who can read through this view.
CREATE VIEW concept_accuracy WITH (security_invoker = true) AS
SELECT qa.user_id,
       qa.tag,
       count(*)                                  AS attempts,
       avg(qa.correct::int)::float                AS accuracy,
       count(*) FILTER (WHERE NOT qa.correct)     AS misses,
       max(qa.answered_at)                        AS last_seen
FROM quiz_answers qa
WHERE qa.tag IS NOT NULL
GROUP BY qa.user_id, qa.tag;
