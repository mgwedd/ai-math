-- Generated-question bank (PR 6, docs/KNOWLEDGE-BASE-PLAN.md §4.3).
--
-- The moderated store the batch generation pipeline (scripts/kb-generate.mjs)
-- fills: LLM-authored questions that have passed a schema gate AND a Wolfram
-- recompute gate. Rows are keyed by concept slug (the join key across the whole
-- KB system — quiz_answers.tag, concept_accuracy, /api/kb/concept, and the
-- practice selection policy). `spec` holds a full question object in the exact
-- engine schema (mc / numeric / order — see lib/curriculum/registry.js
-- questionProblems()), so the engine can render a bank item directly through
-- QUESTION_TYPES with no transform.
--
-- Lifecycle (status): draft (LLM emitted) -> verified (schema-valid + Wolfram
-- match, the pipeline's output) -> live (eligible for serving; a maintainer
-- flip, or later an auto-promote policy) -> retired (pulled instantly; makes a
-- bad item's blast radius revocable). Only status='live' rows are ever served
-- by GET /api/practice.
--
-- SERVER-ONLY TABLE. Like public.kb_cache, it holds no per-user data and is
-- only ever touched by the app's server-side pg role (which OWNS the table and
-- BYPASSES RLS). RLS is enabled with NO policies so the Supabase Data API path
-- (anon / authenticated roles, not the owner) is default-deny — unmoderated /
-- draft LLM content never leaks onto the public API.
CREATE TABLE public.question_bank (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept      TEXT NOT NULL,             -- concept slug from lib/curriculum/concepts.js
  lesson_id    TEXT,                      -- optional anchor lesson
  spec         JSONB NOT NULL,            -- full engine-schema question object
  qtype        TEXT NOT NULL CHECK (qtype IN ('mc','numeric','order')),
  status       TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','verified','live','retired')),
  source       TEXT NOT NULL,             -- 'llm:claude-*' | 'template:<generator-id>'
  verification JSONB,                     -- {wolfram_query, wolfram_answer, checked_at, match:true}
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS enabled, intentionally NO policies (server-only; owner bypasses RLS).
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- Serving path is always "live rows for a concept" — a partial index keeps that
-- lookup cheap and small (draft/verified/retired rows are never in it).
CREATE INDEX question_bank_concept_live_idx ON public.question_bank (concept) WHERE status = 'live';
