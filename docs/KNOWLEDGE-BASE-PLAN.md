# Knowledge Base & Dynamic Question Generation — Technical Plan

> Status: **proposed** · Owner: @mgwedd · Implementing agents should read
> [ARCHITECTURE.md](./ARCHITECTURE.md) first, then the PR they're assigned below.
> Each PR section is written to be executable independently by a lower-cost agent.

## 1. Goal

Make the curriculum **evergreen**. Today every lesson, quiz question, and
feedback string is static JavaScript compiled into the client bundle. Retaking a
lesson reshuffles a fixed pool; the curriculum can never surprise you twice.

This plan adds a **knowledge base (KB) layer** so that:

1. **Lessons draw dynamic enrichment content** — concept summaries, related
   ideas, worked step-by-step solutions — from external wellsprings instead of
   only hand-written `deeper` cards.
2. **Questions can be generated, not just drawn** — parameterized templates and
   an LLM pipeline produce fresh, *verified* variants, so retakes and reviews
   stay novel forever.
3. **The running list of what a user got wrong — across the whole curriculum —
   becomes a first-class, queryable signal** that drives a personalized practice
   surface ("drill my weak concepts"), not just the current per-lesson daily
   review.

### The wellspring pipeline

The core architecture is a three-stage content pipeline, each stage doing the
one thing its source is actually good at:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│   RESEARCH   │ ──▶ │   GENERATE   │ ──▶ │  VERIFY & COMPUTE    │
│  Wikipedia / │     │  LLM authors │     │  Wolfram|Alpha checks │
│  Wikidata    │     │  questions & │     │  every math claim;    │
│  concept     │     │  distractor  │     │  Show Steps supplies  │
│  context     │     │  rationales  │     │  worked solutions     │
└──────────────┘     └──────────────┘     └──────────────────────┘
                                                      │
                                          only verified items enter
                                          the question bank / lesson UI
```

- **Wikipedia/Wikidata (research):** free, well-licensed concept summaries and
  concept-graph edges. Grounds LLM generation and fills "go deeper" cards.
- **LLM (generate):** the only source that can *author* pedagogy — question
  stems, plausible distractors, and the per-wrong-option `why` rationales that
  are this repo's quality bar. Never trusted on math facts.
- **Wolfram|Alpha (verify & compute):** the math oracle. Every numeric/symbolic
  answer in generated content is recomputed by Wolfram before the item can go
  live; the Show Steps API supplies step-by-step remediation for missed
  questions.
- **Parameterized generators (internal, zero-cost):** seeded templates
  (`derivative of ax^n + b`, `2×2 determinant`, `Bayes with given priors`)
  produce unlimited correct-by-construction drill variants with no API calls.
  These are the volume backbone; the LLM pipeline is the novelty/richness layer.

### Non-goals (this phase)

- No vector search / embeddings / RAG store. The concept taxonomy is small
  (~100 tags) and hand-mappable; semantic retrieval is overkill.
- No per-user real-time LLM calls in the request path. Generation is batch,
  into a moderated bank; personalization happens at *selection* time.
- No CMS. The static curriculum stays the spine (roadmap ladder step 7 is
  untouched); the KB *augments* it.
- No changes to auth, XP economy mechanics, or the lab/mission system.

## 2. Current state (what the KB must build on)

Findings from the backend exploration — implementing agents can trust these:

- **Curriculum = pure data.** ~57 lessons across `lib/curriculum/*.js`, each
  registered via `registerLesson()` into `lib/curriculum/registry.js` and
  validated by `validateCurriculum()`. Question types `mc` / `numeric` / `order`
  dispatch through `QUESTION_TYPES` in `lib/engine.js` — the designed seam for
  new question kinds.
- **A concept taxonomy already exists de facto:** every question carries
  `q.tag` (concept label) and `q.focus` (what to study). It is unregistered,
  free-text, and client-side only.
- **Wrong answers are already persisted server-side** in the append-only
  `quiz_answers` table — but only as `(user_id, lesson_id, question_idx,
  correct, first_try, answered_at)`. The concept tag and which distractor was
  chosen are **discarded**. The content-rich weak signal (`S.weak` tag map)
  lives only in the client `progress.state` JSONB.
- **API pattern:** thin route handlers in `app/api/*/route.js`; `getAuthUser()`
  for identity; `pool` from `lib/db.js`; `logRouteError` for errors; every row
  keyed by the authenticated user. No external service is called at runtime
  today (Supabase auth + Postgres only).
- **Migrations:** `supabase/migrations/*.sql` applied in filename order; local
  compose applies them via the `schema_migrations` ledger script. New tables
  need owner-only RLS (or no policies for server-only tables) to match the
  baseline.
- **Tests:** `npm test` (Vitest, node env, no DB) — the curriculum coherence
  suite in `test/curriculum.test.mjs` must stay green; it asserts ≥40 lessons,
  validator-clean, type-aware quiz shape, ≥140 inline `wrong` maps, unique ids.
- **Review features already shipped:** daily review queue
  (`buildReviewQueue`), per-world cumulative exams (`examPoolFor`), retakes
  drawing `SCORING.quizDraw` random questions. The KB practice surface extends
  this family; it does not replace it.

## 3. Source evaluation

| Source | Strength | Weakness | Role | Cost/licensing |
|---|---|---|---|---|
| **Wolfram\|Alpha** ([Full Results](https://products.wolframalpha.com/api), [Show Steps](https://products.wolframalpha.com/show-steps-api/documentation)) | Authoritative computation; step-by-step solutions across algebra/calculus/linear-algebra/stats | Cannot author pedagogy (stems, distractors, rationales); free tier is small | **Verify & compute** stage; steps for remediation | Free ≈2,000 calls/mo non-commercial; Show Steps is a paid add-on. Minima is free, but confirm ToS fit; attribution required |
| **Wikipedia / Wikimedia REST** | Free, broad, good summaries; `page/summary` endpoint is one GET | Prose not pedagogy; math notation inconsistent; [2026 rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits) require a descriptive User-Agent | **Research** stage; "go deeper" concept cards | Free; CC BY-SA — attribute + link on every rendered card |
| **Wikidata** | Structured concept graph (prerequisite/related edges) | Sparse for pedagogy | Optional enrichment of the concept registry (deferred) | Free, CC0 |
| **LLM (Anthropic API)** | Only source that authors questions in this repo's format, incl. distractor `wrong` rationales; can target a user's actual misses | Hallucinates math; costs money; output must be gated | **Generate** stage — batch, verified, moderated | Pay-per-token; batch generation keeps it bounded |
| **Internal parameterized generators** | Correct by construction, free, offline, instant | Bounded novelty (template-shaped) | Volume backbone for drills | Free |

**Decision:** all four, in the pipeline roles above. No single source suffices:
Wolfram can't write questions, Wikipedia can't do math, the LLM can't be
trusted on math, and templates can't be rich. Chained, each covers the others'
gap.

## 4. Data model

New migration files under `supabase/migrations/` (one per PR, filename-ordered).
Sketches below are authoritative for intent; implementing agents finalize
types/indexes to match the baseline style.

### 4.1 Enrich the miss log (PR 2)

```sql
ALTER TABLE public.quiz_answers
  ADD COLUMN tag          TEXT,            -- concept slug (q.tag), NULL for legacy rows
  ADD COLUMN qtype        TEXT,            -- 'mc' | 'numeric' | 'order'
  ADD COLUMN chosen       TEXT,            -- distractor text/value the user picked (wrong answers)
  ADD COLUMN question_key TEXT,            -- stable content id: 'la-dot:2' or 'gen:det2x2:s91' or 'bank:<uuid>'
  ADD COLUMN context      TEXT NOT NULL DEFAULT 'lesson'
    CHECK (context IN ('lesson','review','exam','practice'));

CREATE INDEX quiz_answers_user_tag_idx ON public.quiz_answers (user_id, tag);

CREATE VIEW public.concept_accuracy WITH (security_invoker = true) AS
  SELECT user_id, tag,
         COUNT(*)                                  AS attempts,
         AVG(correct::int)::float                  AS accuracy,
         COUNT(*) FILTER (WHERE NOT correct)       AS misses,
         MAX(answered_at)                          AS last_seen
  FROM public.quiz_answers
  WHERE tag IS NOT NULL
  GROUP BY user_id, tag;
```

This is the "running list of questions the user gets wrong across the whole
curriculum," made durable and queryable. `question_idx` stays for back-compat;
`question_key` is the forward-looking stable id (index-based ids break when a
question pool is edited, and generated items have no index).

### 4.2 KB cache (PR 3)

Global (not per-user) response cache so external free tiers survive real
traffic. Server-only: RLS enabled with **no** policies (the app's pg role is
table owner and bypasses RLS; the Supabase Data API path gets nothing).

```sql
CREATE TABLE public.kb_cache (
  source     TEXT NOT NULL,         -- 'wolfram' | 'wolfram_steps' | 'wikipedia'
  query_key  TEXT NOT NULL,         -- normalized query string
  payload    JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (source, query_key)
);
ALTER TABLE public.kb_cache ENABLE ROW LEVEL SECURITY;
```

Math content is stable → long TTLs (30–90 days). Serve stale on upstream
failure (`expires_at` is a refresh hint, not a hard gate).

### 4.3 Generated-question bank (PR 6)

```sql
CREATE TABLE public.question_bank (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept      TEXT NOT NULL,             -- concept slug from the registry
  lesson_id    TEXT,                      -- optional anchor lesson
  spec         JSONB NOT NULL,            -- full question object (engine schema: q/opts/a/why/wrong/tag/focus or numeric/order shape)
  qtype        TEXT NOT NULL CHECK (qtype IN ('mc','numeric','order')),
  status       TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','verified','live','retired')),
  source       TEXT NOT NULL,             -- 'llm:claude-*' | 'template:<generator-id>'
  verification JSONB,                     -- {wolfram_query, wolfram_answer, checked_at, match:true}
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;  -- server-only, no policies
CREATE INDEX question_bank_concept_live_idx ON public.question_bank (concept) WHERE status = 'live';
```

Lifecycle: `draft` (LLM emitted) → `verified` (schema-validated + Wolfram
recompute matched) → `live` (eligible for serving; flipped by the maintainer or
auto-promoted once trust is established) → `retired`.

## 5. API surface

New routes follow the existing pattern (`getAuthUser()`, `pool`,
`logRouteError`, coarse error codes). All KB keys live server-side only.

| Route | Method | PR | Purpose |
|---|---|---|---|
| `/api/kb/concept/[slug]` | GET | 3 | Enrichment bundle for a concept: Wikipedia summary (+ attribution), related concepts from the registry, cached Wolfram pods where configured. Cache-first; graceful `{}` degradation. |
| `/api/kb/steps` | POST | 4 | `{query}` → Wolfram Show Steps for a missed numeric/derivation question, cached. Only reachable for questions that declare a `wolfram` hint (no free-form proxying of user input). |
| `/api/practice` | GET | 6 | Personalized drill set: selection policy over `concept_accuracy` + spacing → returns a mixed list of question *descriptors* (see §7). |
| `/api/practice` (extend `/api/events`) | POST | 6 | Practice results ride the existing `quiz_answer` event with `context:'practice'` + `question_key`. No new write route. |

## 6. Concept registry — the KB spine (PR 1)

`q.tag` free-text becomes a canonical, validated registry:

```js
// lib/curriculum/concepts.js
registerConcept({
  id: 'dot-product',            // slug; q.tag values map to these
  world: 'la',
  title: 'Dot product',
  wikipedia: 'Dot_product',     // en.wikipedia page title (research stage key)
  wolfram: 'dot product of two vectors',  // optional query seed (verify stage key)
  prereqs: ['vectors', 'vector-operations'],
})
```

- `validateCurriculum()` gains a check: every `q.tag` in every lesson resolves
  to a registered concept (a legacy alias map eases migration).
- This registry is the join key across the entire system: quiz telemetry
  (`quiz_answers.tag`), enrichment (`/api/kb/concept/dot-product`), generation
  (bank rows keyed by concept), and selection (`concept_accuracy`).
- Pure client-bundle data — no DB table needed; the server receives slugs via
  events and validates format only (`^[a-z0-9-]{1,64}$`).

## 7. Question descriptors & the engine seam

`/api/practice` returns descriptors, not rendered HTML — the engine stays the
single renderer:

```js
{ kind: 'ref',      lessonId: 'la-dot', qi: 2 }                    // static pool item
{ kind: 'template', generator: 'det2x2', seed: 91 }                // client-side generation
{ kind: 'bank',     id: '<uuid>', spec: { ...question object... } } // LLM-generated, verified
```

- `ref` → engine looks up the real question (already how exams work).
- `template` → engine calls the generator registry (see PR 5) with the seed;
  deterministic, so the server can log/replay by `question_key`.
- `bank` → `spec` is already in engine question-schema shape; render directly
  through `QUESTION_TYPES`. The server only serves `status='live'` rows.

All three answer through the existing quiz UI and log through the existing
`quiz_answer` event with their `question_key` and `context:'practice'`.

## 8. Generation pipeline (PR 6, batch job — not request path)

A maintainer-run script (`npm run kb:generate`), later a scheduled job:

1. **Target selection:** query global miss rates (`quiz_answers` aggregated
   across users) → concepts ranked by miss volume; plus any concept below a
   coverage floor (e.g. <10 live bank items).
2. **Research:** pull the concept's Wikipedia summary + the registry entry
   (prereqs, focus strings, 2–3 exemplar questions from the static pool
   including their `wrong` rationales — the style guide is the existing
   curriculum itself).
3. **Generate:** Claude authors N candidate questions in the exact engine
   schema (mc with 4 opts + full `wrong` map, or numeric with `answer`/`tol`,
   or `order` with steps), each with a `wolfram_check` field: a Wolfram-ready
   query string plus the expected answer.
4. **Verify:**
   - Schema gate: run the candidate through the same validation
     `validateCurriculum()` applies (shared as a pure function).
   - Math gate: send `wolfram_check.query` to the Full Results API; parse the
     result pod; require match with the claimed answer (numeric within `tol`).
     `mc` questions must phrase their check so the *correct option* is what
     Wolfram confirms; candidates whose checks aren't Wolfram-expressible are
     dropped (template generators cover non-checkable shapes instead).
   - Dedup gate: reject near-duplicates of static-pool or existing bank items
     (normalized-stem comparison is sufficient at this scale).
5. **Store:** insert as `verified` with the full `verification` payload;
   promotion to `live` is a maintainer flip (SQL or a tiny admin script) until
   the pipeline earns auto-promote.

Cost envelope: ~100 concepts × 10 items ≈ 1,000 LLM calls + 1,000 Wolfram
verifications **one-time**, then incremental top-ups — comfortably inside the
Wolfram free tier when spread across a month, and single-digit dollars of LLM
usage. Nothing scales with user count; serving is all Postgres.

## 9. Selection policy (PR 6)

Server-side, in the `/api/practice` route (pure function + unit tests,
mirroring `buildReviewQueue`'s style):

```
score(concept) = miss_weight   × recent_miss_rate      (from concept_accuracy)
               + staleness     × days_since_last_seen  (spaced repetition)
               + coverage_bias × never_practiced
```

Top K concepts → for each, draw a mix (default: 1 `ref` from a lesson that
teaches it, 1 `template`, 1 `bank` when live items exist), interleaved by world
(reuse `interleaveByWorld`). Sprinkle 20% below-threshold concepts to avoid
pure-weakness grinding. XP rides new `SCORING.practice` entries in
`registry.js` (all tunables stay in `SCORING`, never in the engine — house
rule).

## 10. Security, cost, failure modes

- **Keys server-side only** (`WOLFRAM_APP_ID`, `ANTHROPIC_API_KEY` in
  `.env.example` as documented optional knobs). The client never talks to a
  wellspring directly.
- **No free-form proxying:** `/api/kb/steps` and `/api/kb/concept` only accept
  registry-derived keys/queries, so users can't burn quota or exfiltrate via
  arbitrary Wolfram queries.
- **Graceful degradation is a hard requirement:** every KB feature is additive.
  Wolfram down / quota exhausted / no API key configured → enrichment cards
  simply don't render, practice serves `ref` + `template` only, and the static
  curriculum is untouched. Local compose and OSS forks work with zero keys.
- **Rate limiting:** per-user daily caps on KB routes (simple count in the
  route), cache-first always; Wikimedia calls send a descriptive `User-Agent`
  per their 2026 policy.
- **Licensing:** Wikipedia cards render attribution + CC BY-SA link. Wolfram
  attribution ("Powered by Wolfram|Alpha" + link) on steps/pods. Confirm the
  free-tier non-commercial ToS covers a free product before launch; budget for
  the paid tier as fallback (~cheap at this volume).
- **LLM content safety:** bank items go through schema + math verification and
  human promotion; provenance (`source`, `verification`) is stored on every
  row, and `question_key` in `quiz_answers` makes any bad item's blast radius
  auditable and revocable (`status='retired'` pulls it instantly).

## 11. PR breakdown

Seven PRs, each independently shippable, reviewable, and sized for a lower-cost
agent. Dependencies: 1 → 2 → {3, 5} → 4 → 6 → 7 (3 and 5 are parallel).

| # | PR | Size | Touches | Depends on |
|---|---|---|---|---|
| 1 | Concept registry | S | `lib/curriculum/` + tests | — |
| 2 | Rich answer telemetry | M | migration, `/api/events`, engine log calls, `/api/stats` | 1 |
| 3 | KB service layer + adapters + cache | M | migration, `lib/kb/`, `/api/kb/concept` | 1 |
| 4 | Enrichment UI (deeper cards + steps) | M | engine render fns, `/api/kb/steps` | 3 |
| 5 | Parameterized generators | M | `lib/curriculum/generators/`, engine draw path, tests | 1 |
| 6 | Practice surface + generation pipeline | L | migration, `/api/practice`, engine home section, `kb:generate` script | 2, 3, 5 |
| 7 | Auto-promotion + scheduled top-ups | S | script hardening, docs | 6 |

### PR 1 — Concept registry (the spine)

- Add `lib/curriculum/concepts.js` with `registerConcept()` +
  `CONCEPTS` map + alias table for existing free-text `q.tag` values.
- Wire a `validateCurriculum()` check: every `q.tag` resolves (via alias map)
  to a registered concept; every concept's `world` is valid; prereq slugs
  resolve.
- Normalize the worst-offending free-text tags in lesson files to slugs
  (mechanical, validator-driven).
- Populate `wikipedia` titles for all concepts; `wolfram` seeds where sensible.
- Tests: registry validation unit tests + coherence suite still green.
- **Acceptance:** `npm test` green; zero unregistered tags; no engine changes.

### PR 2 — Rich answer telemetry (make the miss list real)

- Migration §4.1 (columns + index + `concept_accuracy` view).
- `/api/events`: accept + validate the new optional fields (`tag` slug format,
  `qtype` enum, `chosen` ≤ 256 chars, `question_key` ≤ 128, `context` enum);
  unknown/legacy events unchanged. Body cap unchanged.
- Engine: include `tag`, `qtype`, `chosen`, `question_key`
  (`lessonId + ':' + qi` for static questions), and `context` in every
  `quiz_answer` event (lesson/review/exam paths).
- `/api/stats`: add `concepts` array from `concept_accuracy`.
- **Acceptance:** old clients' events still insert (all new columns nullable);
  new events round-trip; view returns per-concept accuracy in local compose.

### PR 3 — KB service layer (research + compute adapters)

- Migration §4.2 (`kb_cache`).
- `lib/kb/sources/wikipedia.js` (REST `page/summary`, proper User-Agent),
  `lib/kb/sources/wolfram.js` (Full Results, pod parsing), behind one adapter
  interface; `lib/kb/cache.js` (cache-first, serve-stale-on-error, TTLs).
- `GET /api/kb/concept/[slug]`: registry lookup → cached bundle
  `{summary, attribution, related, pods?}`. 404 unknown slug; `{}` degraded.
- `.env.example`: `WOLFRAM_APP_ID` (optional), docs note in DEPLOYMENT.md.
- Tests: adapters unit-tested against fixture JSON (no live calls in CI).
- **Acceptance:** route returns enrichment with a key configured, degrades to
  `{}` without; zero client changes.

### PR 4 — Enrichment UI

- Engine: lazy-fetch `/api/kb/concept/<tag>` when a lesson's deeper section
  expands (or on weak-tag auto-expand); render as appended KB cards with
  attribution, following existing DOM-helper conventions. No fetch → UI
  identical to today.
- `POST /api/kb/steps` + a "show the steps" button on missed `numeric`
  questions whose lesson/question declares a `wolfram` hint (new optional
  question field, validator-checked).
- **Acceptance:** with keys set, deeper cards show Wikipedia summary + Wolfram
  steps on a hinted miss; with no keys, pixel-identical to main.

### PR 5 — Parameterized generators (zero-cost dynamic questions)

- `lib/curriculum/generators/registry.js`: `registerGenerator({id, concept,
  qtype, make(seed) → question})` + seeded PRNG (mulberry32) so
  `question_key = 'gen:<id>:<seed>'` is replayable.
- ~10 launch generators across worlds (2×2 determinant/inverse, dot product &
  angle sign, power-rule/chain-rule derivatives, Bayes table, expectation of a
  die-style RV, log/exponent laws, matrix shape compatibility).
- Fuzz tests: 200 seeds per generator → every output passes the shared
  question validator; numeric answers recomputed independently in the test.
- Engine: lesson retakes mix in template variants for concepts the lesson
  teaches (behind `SCORING.retakeTemplateShare`, default conservative).
- **Acceptance:** tests green incl. fuzz; retake shows a generated variant.

### PR 6 — Practice surface + LLM generation pipeline (the headline)

- Migration §4.3 (`question_bank`).
- `scripts/kb-generate.mjs` (`npm run kb:generate`): the §8 pipeline —
  research → Claude generation → schema gate → Wolfram gate → dedup → insert
  `verified`. Model + prompt templates in-script; `ANTHROPIC_API_KEY` env.
- `GET /api/practice`: §9 selection policy (pure function + unit tests) over
  `concept_accuracy` + `live` bank items.
- Engine: "Practice" home section (sibling of daily review) → descriptor list →
  existing quiz flow; results logged `context:'practice'`; `SCORING.practice`
  XP.
- **Acceptance:** end-to-end in local compose: seed misses → `/api/practice`
  returns weakness-ranked mixed descriptors → answering logs correctly;
  `kb:generate` dry-run mode works without keys (emits drafts to stdout).

### PR 7 — Hardening & evergreen loop

- Promotion tooling (`npm run kb:promote` reviewing `verified` items),
  optional auto-promote policy (e.g. after N verified items per concept with
  spot-check), scheduled top-up guidance (GitHub Action cron, monthly),
  per-user rate caps on KB routes, DEPLOYMENT.md runbook section.
- **Acceptance:** documented operator loop; caps enforced; runbook complete.

## 12. Open questions (flagging, not blocking)

1. **Wolfram ToS:** does "free product, non-commercial project" qualify for the
   free tier long-term? If not, Show Steps + paid tier pricing needs a look —
   PR 3/4 isolate all Wolfram surface behind the adapter, so the answer changes
   config, not architecture.
2. **Bank item review UX:** SQL-flip promotion is fine for one maintainer;
   if contributors grow, a review UI could become PR 8.
3. **Per-user LLM generation** (variants targeting *your* specific distractor
   history): deliberately deferred — the selection policy already personalizes
   which concepts you drill; per-user generation multiplies cost for uncertain
   marginal value. Revisit with usage data.
