# Deployment (Vercel + Supabase)

The app is a Next.js 15 App Router app deployed on **Vercel** (serverless
functions) backed by **Supabase**: Supabase Auth for login and Supabase
Postgres for the `progress` / `xp_events` / `quiz_answers` /
`lesson_completions` / `profiles` tables.

Auth (the Supabase session cookie, validated server-side by
`lib/auth-server.js`) and the database connection (`lib/db.js`) are configured
independently. A failure in one does **not** imply a failure in the other — see
the troubleshooting section for how to tell them apart.

## Required environment variables (Vercel Project Settings → Environment Variables)

Set these for the **Production** (and Preview, if used) environments.

### Auth — Supabase

| Variable | Value / format | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Public project URL. Used by both the browser client and the server auth helper. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase **publishable** key (`sb_publishable_...`) | Preferred. `lib/auth-server.js` also accepts `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY` as fallbacks. |

If `NEXT_PUBLIC_SUPABASE_URL` and a key are both missing, `getAuthUser()`
returns `null` and every protected route answers **401** (not 500). A visible,
succeeding request to `https://<project-ref>.supabase.co/auth/v1/user` in the
browser Network tab means auth is configured and working.

### Database — Supabase Postgres connection string

| Variable | Value / format | Notes |
| --- | --- | --- |
| `DATABASE_URL` **or** `POSTGRES_URL` | Supabase **pooler** connection string (see below) | `lib/db.js` reads `DATABASE_URL` first, then `POSTGRES_URL` (the name the Vercel↔Supabase integration sets). |

**Use the Supabase connection pooler, not the direct connection, on Vercel.**
Get the string from Supabase Dashboard → **Project Settings → Database →
Connection string → Transaction pooler**. It looks like:

```
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require
```

Key points:

- **Host `...pooler.supabase.com`, port `6543`** — this is Supavisor in
  **transaction mode**. The direct connection (`db.<ref>.supabase.co:5432`) is
  **IPv6-only** and is generally **unreachable from Vercel's serverless
  runtime**, which is the classic cause of a 500 / connection timeout on DB
  routes. Always use the pooler on Vercel.
- **`?sslmode=require`** — Supabase requires TLS. Keeping `sslmode=require` in
  the URL makes `lib/db.js` enable SSL (see SSL knobs below).
- Username for the pooler is `postgres.<project-ref>` (tenant-qualified), not
  bare `postgres`.

#### Transaction-pooling compatibility

Supavisor transaction mode does **not** support session-level state or
server-side named prepared statements across statements. The app's queries are
safe here: `pg` sends parameterized queries unnamed by default, and the
multi-statement `PUT /api/state` / `POST /api/events` transactions run inside an
explicit `BEGIN`/`COMMIT` on a single checked-out client (`pool.connect()`), so
all statements in a transaction land on the same pooled backend. Do not
introduce `PREPARE`/`DEALLOCATE`, `SET`/`LISTEN`/`NOTIFY`, advisory locks held
across requests, or `pg` prepared-statement `name:` options.

### SSL knobs in `lib/db.js`

`lib/db.js` parses the connection string manually and sets `ssl`
authoritatively (a bare `?sslmode=require` in the URL alone does not configure
Node TLS the way you'd expect — see the comment in that file). TLS is enabled
when the URL contains an `sslmode`, or `DATABASE_SSL_CA` is set, or
`DATABASE_SSL=no-verify`:

| Variable | Effect |
| --- | --- |
| *(none of the below)* + `sslmode=require` in URL | TLS **on, unverified** (`rejectUnauthorized: false`). |
| `DATABASE_SSL_CA` | PEM of a root CA → TLS **on, chain verified** (`rejectUnauthorized: true`). Preferred when both are set. |
| `DATABASE_SSL=no-verify` | Forces TLS on, unverified. |

> **Current production setting:** `DATABASE_SSL=no-verify` (TLS encrypted, chain
> verification disabled). Pinning `prod-ca-2021.crt` via `DATABASE_SSL_CA`
> against the pooler failed with `SELF_SIGNED_CERT_IN_CHAIN` because the
> Supavisor pooler presents a chain rooted differently from the
> direct-connection CA. To restore verification, capture the pooler's real root
> with `openssl s_client -starttls postgres -connect <pooler-host>:6543
> -showcerts`, pin the last cert via `DATABASE_SSL_CA`, and remove
> `DATABASE_SSL`.

### Optional / tuning

| Variable | Default | Notes |
| --- | --- | --- |
| `PG_POOL_MAX` | `1` on Vercel, `10` otherwise | Per-instance pool cap. Keep it small (1) on serverless — each function instance holds its own pool and the pooler multiplexes across them. |
| `DEV_AUTH` | unset | `DEV_AUTH=1` bypasses Supabase auth with a fixed dev identity. **Hard-disabled when `VERCEL` is set** — never trusted in production. Local docker-compose only. |

## Troubleshooting a 500 on `/api/state`

The route talks to Postgres. A 500 (as opposed to 401) means auth passed and
the **database call failed**. Work through these in order:

1. **Read the Vercel function logs.** Every API route (`/api/state`,
   `/api/events`, `/api/stats`, `/api/leaderboard`, `/api/health`) logs one
   greppable, single-line JSON object on failure:
   `[api] route error {"route":"/api/state","method":"GET","userId":"...","clientCode":"DB_CONN","pgCode":"ETIMEDOUT","message":"...","detail":"...","routine":"...","host":"...pooler.supabase.com"}`.
   The `pgCode`/`message`/`routine`/`detail` fields identify the exact failure.
   Also logged once per function cold start: a redacted pool summary —
   `[db] pool init {"host":"...","port":6543,"ssl":"on/no-verify ...","poolMax":1,"vercel":true}`
   — which answers "is prod actually on the pooler (6543) with TLS?" from the
   logs alone. Idle-connection drops log `[db] pool idle-client error {...}`;
   real auth-layer failures (not just a missing cookie) log
   `[auth] getUser error {...}`. Credentials, keys, and the full URL are never
   logged.
2. **Read the client `code`.** The 500/503 response body carries a coarse,
   stable code so the browser Network tab hints at the failure class without
   leaking internals:
   - `DB_CONN` — couldn't reach or authenticate to Postgres (network, TLS,
     wrong password/db). **This is the expected code for the pooler/SSL
     misconfig.**
   - `DB_QUERY` — connected, but a query failed (missing table/column, etc.).
   - `AUTH` — a real auth-layer error (logged server-side; the route still
     returns 401 to the client).
3. **Hit `/api/health`.** It's the only unauthenticated DB route. `200 {ok:true}`
   means the pool can reach Postgres (the 500 is elsewhere). `503 {ok:false,
   code:"DB_CONN"}` confirms a connection problem; read the logged `pgCode`.
4. **Interpret the `pgCode` in the logs:**
   - `ETIMEDOUT` / `ECONNREFUSED` / `ENETUNREACH` / `ENOTFOUND` →
     **wrong host or direct (non-pooler) connection.** Verify `DATABASE_URL` /
     `POSTGRES_URL` points at `...pooler.supabase.com:6543`, not
     `db.<ref>.supabase.co:5432`. This is the most common cause on Vercel.
   - TLS errors (`SELF_SIGNED_CERT_IN_CHAIN`, `CERT_HAS_EXPIRED`,
     `ERR_TLS_CERT_ALTNAME_INVALID`, `UNABLE_TO_VERIFY_LEAF_SIGNATURE`) →
     **SSL misconfig.** Ensure `sslmode=require` is in the URL. If you pinned
     `DATABASE_SSL_CA`, it may not match the pooler chain — fall back to
     `DATABASE_SSL=no-verify` (see SSL knobs) and redeploy.
   - `28P01` → **wrong password**, or the username isn't the pooler-qualified
     `postgres.<project-ref>`.
   - `3D000` → **wrong database name** (should be `postgres`).
   - `42P01` (undefined table) / `42703` (undefined column) → **migrations not
     applied** to this project. Apply `supabase/migrations/*.sql`. (These log
     with `clientCode: DB_QUERY`.)
5. **Confirm the env var is set for the right environment.** A value set only for
   Preview won't apply to Production, and vice-versa. Redeploy after changing env
   vars — Vercel bakes them at build/deploy time.
