# Architecture

Deep-dive for contributors and agents. Project overview + how to run it:
[README](../README.md). Hosting and env config: [DEPLOYMENT.md](./DEPLOYMENT.md).

> This doc explains the **shape and the "why."** For anything that changes as the
> code evolves — exact filenames, the lesson schema, XP numbers, DB columns — it
> points you at the authoritative source in the repo instead of duplicating it
> (copied literals rot). When a section names a file, go read that file.

## Big picture

Minima is a single-page gamified curriculum where a **framework-free engine owns
all post-login rendering.** The React layer is deliberately thin: a shell in
`components/` handles Supabase auth, then dynamically imports the engine
(`lib/engine.js`), calls `mount()` once, and steps back — the engine injects HTML
into `<main>` directly, runs its own History-API router, and manages a single
serializable state object.

```
Browser
  React shell (components/)      auth gate → Supabase session cookie
        │  mounts once
        ▼
  Engine (lib/engine.js)         router · HUD · one state object S
        │                        S → localStorage + debounced sync to the API
        ▼
  Next.js API routes (app/api/)  identity from the @supabase/ssr cookie;
        │                        every row keyed by the authenticated user
        ▼
  Postgres                       progress snapshot + append-only event logs
   (local: docker compose · prod: Supabase)
```

`app/page.js` is the entry point (a few lines); the header comment in
`lib/engine.js` is the engine's own map.

## The engine (`lib/engine.js`)

Vanilla JS, framework-free. What to know:

- **One state object** holds all progress — xp, completed lessons, mission and
  achievement flags, streak, manual unlocks, collapsed worlds. Read its
  initializer near the top of the file. It loads from localStorage on mount,
  **union-merges** with the server snapshot on first fetch (max xp, union of
  flags — offline progress is never lost), writes to localStorage on every
  mutation, and debounce-syncs to the API.
- **Routing** is the engine's own — `go('home')` / `go('lesson', id)`, backed by
  the History API for real URLs and working back/forward. Re-navigating a lesson
  re-renders from scratch; per-screen cleanups run first.
- **Lesson flow** is Learn → Lab → Quiz → Done.
- **Unlocking** is sequential within a world (lesson N unlocks when N-1 is done;
  the first is always open). Learners can also self-unlock any lesson or world
  from the ⋮ tools menu, surfaced with a 🔓 badge.
- **Missions never auto-complete on load.** A lab's first `update(state)` is a
  baseline that awards nothing; a mission is only credited on a later,
  interaction-driven update. `test/missions.test.mjs` pins this invariant.

The engine also exports the canvas/lab helper kit (`makeLab`, `plane`, `slider`,
`chips`, …) that labs build on — read the signatures and doc comments in the same
file.

## Curriculum = pure data

Lessons and labs are plain data registered into shared registries; the engine
reads them at render time. This is the part you'll extend, so **read the source
of truth directly:**

- The **lesson & lab schema** is the comment block at the top of
  **`lib/curriculum/registry.js`** — kept honest by a validator, so it can't
  drift out of sync with a doc. Add a lesson by calling `registerLesson({ … })`
  (idempotent by `id`) and registering its lab function under the matching
  `interactive` key.
- Wrong-answer feedback and per-question metadata ride **inline on each quiz
  question** (not in a parallel table), so inserting or reordering questions
  can't desync them.
- After all modules load, `validateCurriculum()` cross-checks that every
  interactive resolves and every quiz is well-formed, logging problems loudly at
  load time. The test suite runs the same checks headlessly.

The five worlds (Foundations, Linear Algebra, Calculus, Probability & Statistics,
Machine Learning) are defined in `WORLD_META` in the engine; their lessons live
across one or more files in **`lib/curriculum/`** — `git ls-files lib/curriculum`
shows the current set. Progress is keyed by lesson `id`, so adding, removing, or
reordering never corrupts saved state.

**XP economy:** every tunable number — per-attempt XP, completion bonus,
achievement XP, and the level curve — lives in `SCORING` and `LEVELS` in
`registry.js`. First attempts beat retakes, first completion pays a bonus, and
achievements grant a flat amount re-tested after every XP change. Tune the
economy there, never in the engine.

## Auth & persistence

Access is gated by **Supabase Auth** — passkey, Google, or email/password. The
shell gates the UI behind a session; API routes validate the `@supabase/ssr`
session cookie and key every row by the authenticated user's uuid — the client
never sends an identifier (no BOLA). A DB trigger provisions a profile on signup
and RLS restricts every table to its owner.

Progress syncs to Postgres on a ~1s debounce; the HUD pill shows local / saving /
synced / offline. Offline, progress stays in localStorage (scoped per user) and
union-merges back when the server returns — nothing is lost.

**Local dev has no auth server:** the compose stack auto-signs-in a seeded dev
user (`DEV_AUTH` / `NEXT_PUBLIC_DEV_AUTH`) and persists to the docker Postgres, so
the real providers (passkeys / Google / email) only work against the hosted app
or your own cloud Supabase project. See [DEPLOYMENT.md](./DEPLOYMENT.md).

## API

Routes live in `app/api/*/route.js`; all but `/api/health` require the session
cookie and act only on the authenticated user. Today's set: a progress snapshot
(`GET`/`PUT /api/state`), a batch event log (`POST /api/events`), read-only
`stats` and `leaderboard`, and a public `health` check. Every route logs one
structured line on error (route, method, user, Postgres `code`/`message`/
`routine`) and returns a coarse client code (`DB_CONN` / `DB_QUERY` / `AUTH`) —
see [DEPLOYMENT.md](./DEPLOYMENT.md) for the troubleshooting runbook.

## Data model & migrations

`supabase/migrations/*.sql` is the **source of truth** for the schema, applied in
filename order — read it there. Conceptually: a `progress` JSONB snapshot per
user (xp denormalized), append-only `xp_events` and `quiz_answers` logs, a
`lesson_completions` table, a `profiles` table, and a `lesson_accuracy` view.
Everything keys on `auth.users(id)` with cascade delete and owner-only RLS.

- **Cloud:** apply via the Supabase CLI (`supabase db push`).
- **Local compose:** a fresh volume applies the migrations automatically, after a
  shim that fakes the `auth` schema plain Postgres lacks plus a dev-user seed.

Inspect the local DB:

```bash
docker compose exec db psql -U aimath -d aimath
```

## Tests

`npm test` runs the Vitest suite in `test/` — no database required. It loads the
real curriculum in a stubbed-DOM node environment and asserts it's coherent
(imports cleanly — catching the Unicode-prime / smart-quote-delimiter class of
breakage — validator clean, unique ids, every interactive resolves, quizzes
well-formed, feedback inline and valid) plus unit tests for `registerLesson` and
the mission-baseline invariant. A tracked `pre-push` hook runs it before every
push; enable once with `npm run hooks` (bypass in a pinch with `--no-verify`).

## Config

`.env.example` documents the knobs, and compose works with defaults. The app
reads a Postgres connection string (`DATABASE_URL` or `POSTGRES_URL`) with
optional SSL controls, plus the Supabase URL + publishable key for auth. Full
details — including the serverless pooler guidance — are in
[DEPLOYMENT.md](./DEPLOYMENT.md).

> **TODO (security):** production (Vercel → Supabase) currently runs with
> `DATABASE_SSL=no-verify` — TLS-encrypted but with chain verification disabled,
> because pinning the direct-connection CA failed with `SELF_SIGNED_CERT_IN_CHAIN`
> (the Supavisor pooler presents a differently-rooted chain). To fix: capture the
> pooler's real root with `openssl s_client -starttls postgres -connect
> <pooler-host>:6543 -showcerts`, pin the last cert via `DATABASE_SSL_CA`, drop
> `DATABASE_SSL`, redeploy, and confirm `/api/health` is 200. The code already
> prefers `DATABASE_SSL_CA` when both are set (`lib/db.js`).
