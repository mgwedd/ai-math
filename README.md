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

Gamified, interactive math curriculum aimed at engineers heading toward AI
research. Next.js (App Router) + a framework-free canvas game engine,
Postgres-backed progress, wired together with Docker Compose.

---

## Architecture (read this first — agents and humans alike)

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│                                                                 │
│  GradientAscent.jsx — thin React shell (auth gate + mount)      │
│  │                                                              │
│  │  Supabase Auth  ──►  session cookie                          │
│  │       │                                                      │
│  │       ▼  (dynamic import, runs once)                         │
│  │  lib/engine.js ─────────────────────────────────────────┐   │
│  │  │  router   go('home') / go('lesson', id)              │   │
│  │  │  HUD      xp, level, streak (DOM elements in <header>)│   │
│  │  │  state S  ──► localStorage (offline)                  │   │
│  │  │              ──► PUT /api/state  (~1 s debounce)      │   │
│  │  │                                                       │   │
│  │  │  registry reads at render time:                       │   │
│  │  │    LESSONS[]        lesson metadata + quiz pools      │   │
│  │  │    INTERACTIVES{}   canvas lab functions              │   │
│  │  │    WRONG_WHY{}      per-wrong-answer feedback         │   │
│  │  │    SCORING / LEVELS XP economy + level curve         │   │
│  │  └───────────────────────────────────────────────────────┘   │
│  │                                                              │
│  └──────────────── fetch /api/* ──────────────────────────────► │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────▼────────────────┐
                │  Next.js API routes (app/api/) │
                │  auth: @supabase/ssr cookie    │
                │  no client-supplied user IDs   │
                │                                │
                │  GET/PUT /api/state            │
                │  POST    /api/events           │
                │  GET     /api/stats            │
                │  GET     /api/leaderboard      │
                │  GET     /api/health           │
                └───────────────┬────────────────┘
                                │
                ┌───────────────▼────────────────┐
                │  Postgres                      │
                │  local: compose  /  prod: SB   │
                │                                │
                │  profiles  progress            │
                │  xp_events  quiz_answers       │
                │  lesson_completions            │
                │  lesson_accuracy (view)        │
                └────────────────────────────────┘
```

### Technical Description

This is a **single-page gamified curriculum** where a framework-free game
engine owns all post-login rendering. The React layer is intentionally thin:
`GradientAscent.jsx` handles auth state, then calls `engine.mount()` and
never touches the DOM again. The engine injects HTML into `<main id="view">`
directly, uses its own URL-less router (`go('home') / go('lesson', id)`
exposed on `window.go`), and manages a single serializable state object `S`.

**Engine** (`lib/engine.js`) — ~600 lines of vanilla JS. Key behaviors:
- `S` = `{ xp, done, missions, ach, streak, lastDay, firstTry }`. Loaded
  from localStorage on mount, union-merged with the server snapshot on
  initial fetch, written to localStorage on every mutation, debounce-synced
  to Postgres. The merge strategy is additive (max xp, union of done/ach
  flags) — offline progress is never lost.
- `renderHome()` reads `WORLD_ORDER` and `WORLD_META` (both defined inline
  in engine.js, near `renderHome`) to build the lesson map. To add a world,
  insert an entry in both constants and push lessons with that world id.
- `renderLesson(id)` drives the four-step flow: Learn → Lab → Quiz → Done.
  It is fully re-entrant; calling `go('lesson', id)` again re-renders from
  scratch (cleanups run first via `runCleanups()`).
- Lesson unlock = sequential within a world: lesson N unlocks when lesson
  N-1 is in `S.done`. First lesson in each world is always unlocked.

**Curriculum = pure data** registered into shared registries from
`lib/curriculum/registry.js`. The engine reads these at render time. To add a
lesson, call `registerLesson({…})` (the single validated entry point — it
checks lesson shape and is idempotent by id, so hot-reload can't duplicate
lessons) and assign its `INTERACTIVES[key]` function. After all modules load,
`index.js` calls `validateCurriculum()` to cross-check that every interactive
key resolves and the feedback tables line up with the quiz pools — problems
are logged loudly to the console at load time. Curriculum files load via
dynamic import in `index.js` to guarantee registration order (static imports
hoist and would race with the top-level `registerLesson` calls).

- `LESSONS[]` — ordered array of lesson objects. Schema:
  ```js
  {
    id:          'prob-bayes',       // stable key (progress key, never reuse)
    world:       'prob',             // world tag — must match WORLD_META key
    order:       5.5,                // optional float for mid-list insertion
    emoji:       '🎲',
    title:       'Bayes\' Theorem',
    sub:         'one-line card subtitle',
    learn:       '<p>HTML…</p>',     // LEARN step content
    ml:          '<b>HTML…</b>',     // "WHY THIS MATTERS FOR AI" sidebar
    deeper:      [{title, body}],    // optional expandable go-deeper cards
    interactive: 'bayes',            // key into INTERACTIVES{}
    quizDraw:    4,                  // optional override of SCORING.quizDraw
    quiz: [
      { q:'<html>', opts:['a','b','c','d'], a:0, why:'<html>',
        tag:'concept label', focus:'one sentence — what to study' }
    ]
  }
  ```

- `INTERACTIVES{}` — functions keyed by `lesson.interactive`. Contract:
  ```js
  INTERACTIVES['bayes'] = function(stage, api) {
    // stage: DOM node to render into (use makeLab / plane / slider helpers)
    // api.missions([{text, xp, check:(state)=>bool}])
    //   → call missions.update(state) on every draw tick
    //   → all missions complete → engine enables the "Continue" button
    return optionalCleanup; // called by runCleanups() on navigation
  }
  ```

- `WRONG_WHY{}` — keyed `[lessonId][questionIdx][wrongOptIdx]` → HTML
  string explaining the specific misconception behind that wrong choice.
  Falls back to a generic nudge when the entry is absent.

- `QMETA{}` — optional per-question tags: `[lessonId][qi] = {tag, focus}`.
  Used for post-quiz weak-area assessment and the REVIEW chip on lesson
  cards. Inline `q.tag`/`q.focus` take precedence over QMETA.

**XP economy** (all knobs in `SCORING`, `LEVELS` — `registry.js`, not
engine.js):
- Quiz first attempt: 25 XP correct / 10 XP after a miss.
- Quiz retake: 10 XP / 5 XP after a miss.
- Lesson first-completion bonus: 50 XP.
- Mission XP: defined per-mission in the `INTERACTIVES` function.
- Achievement XP: 50 XP each. Achievement tests run after every XP grant.
- Level curve: `LEVELS = [{xp, t}]`. "AI Researcher" threshold ≈ 4400 XP
  (one clean pass of the full curriculum).

**Curriculum worlds** (current + planned — defined in `engine.js`):
| world id | name | lessons in |
|---|---|---|
| `pre` | World 0 — Foundations | `extra.js` |
| `la` | World 1 — Linear Algebra | `index.js` (core) + `la-depth.js` (rank/SVD/matrix calculus) |
| `calc` | World 2 — Calculus | `index.js` (core) + `calc-depth.js` (convexity/second-order) |
| `prob` | World 3 — Probability & Statistics | `prob.js` |
| `ml` | World 4 — Machine Learning | `ml.js` |

**Canvas lab helpers** (exported from `engine.js`):
- `makeLab(stage, opts?)` — builds `[canvas + readout | controls]` layout,
  returns `{canvas, ctx, readout, ctrl, W, H, toCanvas(ev)}`.
- `plane(ctx, W, H, scale, ox?, oy?)` — mathematical-y-up coordinate
  system. Returns `{sx, sy, wx, wy, grid(), arrow(), dot(), fn()}`.
- `slider(parent, label, min, max, step, val, fmt?, oninput)` — styled
  range input, returns `{set(x), get(), el}`.
- `chips(parent, title, names, onpick)` — button group, returns the row el.
- `clearBg(ctx, W, H)` — fills canvas with the dark background (#11152a).
- `fmt2(n)` — formats a number to 2 decimal places, returning 0 (not -0).
- `registerCleanup(fn)` — registers a function called on navigation away.

**Dev shortcut:** `NEXT_PUBLIC_DEV_AUTH=1` bypasses Supabase entirely
(hardcoded session in `GradientAscent.jsx`). Hot-reload against compose db:
`docker compose up db -d && npm run dev`.

---

## File structure

```
ai-math/
├── Dockerfile                              # multi-stage build → next standalone runtime
├── docker-compose.yml                      # postgres:16 + next app, healthcheck-gated
├── next.config.mjs                         # App Router, output: standalone
├── jsconfig.json                           # path aliases: @/ → project root
├── package.json
├── ROADMAP.md                              # sequenced curriculum expansion plan
│
├── app/
│   ├── layout.js                           # root layout (html, body, title)
│   ├── page.js                             # renders <GradientAscent /> — nothing else
│   ├── globals.css                         # all CSS: game UI, auth modal, canvas labs
│   └── api/
│       ├── health/route.js                 # GET  /api/health  — liveness + db check (public)
│       ├── state/route.js                  # GET  /api/state   — progress snapshot (404 = new user)
│       │                                   # PUT  /api/state   — {state:{…}} upsert; logs xp delta
│       ├── events/route.js                 # POST /api/events  — {events:[{type,…}]} batch log
│       ├── stats/route.js                  # GET  /api/stats   — per-lesson accuracy, worst first
│       └── leaderboard/route.js            # GET  /api/leaderboard — top 20 by xp
│
├── components/
│   └── GradientAscent.jsx                  # auth gate (Supabase) + engine mount point
│                                           # DEV_MODE=1 short-circuits auth
│
├── lib/
│   ├── auth-server.js                      # createServerClient helper for API routes
│   ├── supabase-browser.js                 # createBrowserClient singleton
│   ├── db.js                               # pg Pool — DATABASE_URL or POSTGRES_URL
│   │                                       # optional DATABASE_SSL_CA / DATABASE_SSL=no-verify
│   ├── engine.js                           # entire game engine (~600 lines, framework-free)
│   │                                       #   exports: mount, go, S, levelInfo
│   │                                       #           makeLab, slider, chips, plane,
│   │                                       #           clearBg, fmt2, registerCleanup
│   │                                       #           LESSONS, INTERACTIVES, WRONG_WHY,
│   │                                       #           QMETA, SCORING
│   │                                       #   defines: WORLD_META{}, WORLD_ORDER[]
│   │
│   └── curriculum/
│       ├── registry.js                     # shared mutable registries + economy constants
│       │                                   #   LESSONS[], INTERACTIVES{}, WRONG_WHY{},
│       │                                   #   QMETA{}, SCORING{}, LEVELS[]
│       ├── index.js                        # World 1 (la) + World 2 (calc) core lessons
│       │                                   # dynamically imports extra.js then ml.js
│       ├── extra.js                        # World 0 (pre) lessons, QMETA tags,
│       │                                   # go-deeper cards for la/calc lessons,
│       │                                   # extra lessons (la-inverse, c-exp)
│       ├── la-depth.js                     # World 1 depth: rank & four subspaces,
│       │                                   # SVD (image compression), matrix calculus
│       │                                   # (slot between la-eigen and la-boss via order:)
│       ├── prob.js                         # World 3 (prob): 6 lessons, RVs → entropy/KL
│       └── ml.js                           # World 3 (ml): 6 lessons from learning to GPTs
│
├── db/
│   └── init/
│       ├── 00-local-auth-shim.sql          # creates auth schema for plain postgres (compose only)
│       └── 01-apply-migrations.sh          # runs supabase/migrations/*.sql in filename order
│
└── supabase/
    └── migrations/
        └── *.sql                           # schema history, source of truth
                                            # applied by: supabase db push (cloud)
                                            #             01-apply-migrations.sh (local)
```

---

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

## Tests & the pre-push gate

`npm test` runs `test/smoke.mjs` — a zero-dependency smoke test that loads the
real curriculum in Node and asserts it's coherent (imports without error,
`validateCurriculum()` clean, unique ids, every interactive resolves, every
quiz well-formed, plus `registerLesson` shape/idempotency unit tests). It
needs only Node, no database or `node_modules`.

A tracked `pre-push` hook in `.githooks/` runs these before every push. Enable
it once per clone:

```bash
npm run hooks        # git config core.hooksPath .githooks
```

(Bypass in an emergency with `git push --no-verify`.)

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
