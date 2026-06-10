# ai-math — Gradient Ascent

Gamified, interactive linear algebra + calculus course aimed at engineers heading
toward AI research. Single-page app (vanilla JS canvas), Postgres-backed progress,
all wired together with Docker Compose.

## Quickstart

```bash
docker compose up --build
# → http://localhost:3000
```

First load asks for a username (no password — this is a local learning tool).
Progress syncs to Postgres with a ~1s debounce; the HUD pill shows
💾 local / 🟡 saving / 🟢 synced / ⚪ offline. Offline (or opening
`public/index.html` directly as a file) falls back to localStorage, and merges
back into the DB the next time the server is reachable — merge is a union, so
progress is never lost.

## Layout

```
docker-compose.yml      postgres:16 + node app, healthcheck-gated startup
db/init/01-schema.sql   schema, auto-applied on first boot
server/                 express API + static host (Dockerfile, server.js)
public/index.html       the entire app — lessons, labs, quizzes, sync client
```

`./public` is volume-mounted into the app container, so editing
`public/index.html` only needs a browser refresh, no rebuild.

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

Lessons are pure data — see the architecture comment at the top of the
`<script>` in `public/index.html`. Add a lesson by pushing an object into
`LESSONS` and registering its lab in `INTERACTIVES`; wrong-answer feedback
lives in `WRONG_WHY` keyed by lesson id. Progress is keyed by lesson `id`,
so adding/removing/reordering lessons never corrupts saved state.

## Config

Defaults work out of the box. Override via `.env` (see `.env.example`):
`APP_PORT` (3000), `POSTGRES_PORT` (5433 on the host), `POSTGRES_USER`,
`POSTGRES_PASSWORD`, `POSTGRES_DB`.

To wipe all progress: `docker compose down -v`.
