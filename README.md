# ai-math — Gradient Ascent

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

First load asks for a username (no password — local learning tool). Progress
syncs to Postgres with a ~1s debounce; the HUD pill shows 💾 local / 🟡 saving /
🟢 synced / ⚪ offline. When offline, progress lives in localStorage and
union-merges back into the DB when the server returns — nothing is lost.

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
  curriculum/index.js     all 16 lessons + labs + wrong-answer feedback
```

## Data model

| table | purpose |
|---|---|
| `users` | username → id |
| `progress` | one JSONB state snapshot per user, xp denormalized |
| `xp_events` | append-only xp history (for future charts) |
| `quiz_answers` | every quiz click: lesson, question, correct?, first try? |
| `lesson_completions` | first completion timestamp per lesson |
| `lesson_accuracy` (view) | per-lesson accuracy per user |

Poke at it:

```bash
docker compose exec db psql -U aimath -d aimath
aimath=# SELECT * FROM lesson_accuracy WHERE username='michael' ORDER BY accuracy;
aimath=# SELECT delta, xp_after, created_at FROM xp_events ORDER BY id DESC LIMIT 20;
```

## API

```
GET  /api/health
GET  /api/state/:username      progress snapshot (404 for new users)
PUT  /api/state/:username      {state:{...}} upsert; logs xp delta
POST /api/events/:username     {events:[{type:'quiz_answer'|'lesson_complete', ...}]}
GET  /api/stats/:username      per-lesson quiz accuracy (worst first)
GET  /api/leaderboard          top 20 by xp
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

Defaults work out of the box. Override via `.env` (see `.env.example`):
`APP_PORT` (3000), `POSTGRES_PORT` (5433 on the host), `POSTGRES_USER`,
`POSTGRES_PASSWORD`, `POSTGRES_DB`. The app reads `DATABASE_URL`.

To wipe all progress: `docker compose down -v`.
