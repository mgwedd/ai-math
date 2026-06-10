# ai-math — Gradient Ascent

> **TODO (security):** Production (Vercel → Supabase) currently runs with
> `DATABASE_SSL=no-verify` — TLS encrypted but **chain verification disabled**,
> because pinning `prod-ca-2021.crt` via `DATABASE_SSL_CA` failed with
> `SELF_SIGNED_CERT_IN_CHAIN`. Likely cause: the Supavisor pooler
> (`*.pooler.supabase.com:6543`) presents a chain rooted differently from the
> direct-connection CA we pinned. To fix: capture the pooler's real root —
> `openssl s_client -starttls postgres -connect <pooler-host>:6543 -showcerts`
> — pin the last cert in the output via `DATABASE_SSL_CA`, remove
> `DATABASE_SSL`, redeploy, confirm `/api/health` is 200. Code already
> prefers `DATABASE_SSL_CA` when both are set (see `lib/db.js`).

Gamified, interactive linear algebra + calculus course aimed at engineers heading
toward AI research. Next.js (App Router) + a framework-free canvas game engine,
Postgres-backed progress, wired together with Docker Compose.

## Quickstart

```bash
docker compose up --build
# → http://localhost:3000
```

Local dev (hot reload) against the compose database:

```bash
docker compose up db -d
npm install
npm run dev          # DATABASE_URL defaults to localhost:5433
```

## Auth

Access requires a **Supabase Auth** account (email + password). The React
shell gates the app behind a session; API routes validate the session cookie
via `@supabase/ssr` and key all data by the authenticated user's uuid — the
client never sends an identifier (no BOLA). A DB trigger auto-provisions a
`profiles` row on signup, and RLS restricts every table to its owner.
Sign out via the 👤 pill.

Progress syncs to Postgres with a ~1s debounce; the HUD pill shows 💾 local /
🟡 saving / 🟢 synced / ⚪ offline. When offline, progress lives in
localStorage (scoped per user id) and union-merges into the DB when the
server returns — nothing is lost.

## Migrations (git-ops)

`supabase/migrations/*.sql` is the source of truth, applied in filename
order. Cloud: apply via Supabase MCP/CLI (`supabase db push`) — history is
tracked in `supabase_migrations.schema_migrations`. Local compose: a fresh
volume applies them automatically via `db/init/01-apply-migrations.sh`
(after `00-local-auth-shim.sql`, which fakes the `auth` schema that plain
Postgres lacks — note the compose stack has **no auth server**, so login
only works against cloud Supabase).

## Layout

```
docker-compose.yml        postgres:16 + next app, healthcheck-gated startup
Dockerfile                multi-stage build → next standalone runtime
db/init/01-schema.sql     schema, auto-applied on first boot
app/
  page.js, layout.js      Next.js App Router shell
  globals.css             all styling
  api/.../route.js        API route handlers (state, events, stats, leaderboard, health)
components/GradientAscent.jsx   client component that mounts the engine
lib/
  db.js                   pg pool + shared helpers
  engine.js               game engine: HUD, router, missions, quiz, canvas labs, sync
  curriculum/registry.js  LESSONS / INTERACTIVES / WRONG_WHY registries
  curriculum/index.js     all lessons + labs + wrong-answer feedback (see also extra.js)
```

## Data model

All tables key on `auth.users(id)` (uuid) with `ON DELETE CASCADE` and
owner-only RLS policies.

| table | purpose |
|---|---|
| `profiles` | display username, auto-provisioned on signup by trigger |
| `progress` | one JSONB state snapshot per user, xp denormalized |
| `xp_events` | append-only xp history (for future charts) |
| `quiz_answers` | every quiz click: lesson, question, correct?, first try? |
| `lesson_completions` | first completion timestamp per lesson |
| `lesson_accuracy` (view) | per-lesson accuracy per user (security_invoker) |

Poke at it:

```bash
docker compose exec db psql -U aimath -d aimath
aimath=# SELECT * FROM lesson_accuracy WHERE username='michael' ORDER BY accuracy;
aimath=# SELECT delta, xp_after, created_at FROM xp_events ORDER BY id DESC LIMIT 20;
```

## API

All routes (except `/api/health`) require a Supabase session cookie and
operate on the authenticated user only:

```
GET  /api/health         liveness + db check (public)
GET  /api/state          progress snapshot (404 for new users)
PUT  /api/state          {state:{...}} upsert; logs xp delta
POST /api/events         {events:[{type:'quiz_answer'|'lesson_complete', ...}]}
GET  /api/stats          per-lesson quiz accuracy (worst first)
GET  /api/leaderboard    top 20 by xp (usernames from profiles)
```

## Extending the curriculum

Lessons are pure data — see the schema comment at the top of
`lib/curriculum/index.js`. Add a lesson by pushing an object into `LESSONS`
and registering its lab in `INTERACTIVES`; wrong-answer feedback lives in
`WRONG_WHY` keyed by lesson id → question → wrong option. Progress is keyed
by lesson `id`, so adding/removing/reordering lessons never corrupts saved
state. New lesson modules can also live in their own files — import them
from `lib/curriculum/index.js`.

## Config

Defaults work out of the box for compose. Override via `.env` (see
`.env.example`): `APP_PORT` (3000), `POSTGRES_PORT` (5433 on the host),
`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.

The app reads: `DATABASE_URL` (or `POSTGRES_URL` — the Vercel↔Supabase
integration's name), optional `DATABASE_SSL_CA` (PEM, verified TLS) or
`DATABASE_SSL=no-verify`, and for auth `NEXT_PUBLIC_SUPABASE_URL` +
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `..._ANON_KEY`). For local
`npm run dev`, put the Supabase URL + publishable key in `.env.local`
(they're public values, from the dashboard's API settings).

To wipe all progress: `docker compose down -v`.
