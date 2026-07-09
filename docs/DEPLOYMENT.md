# Deployment (Vercel + Supabase)

> Looking to run Minima on your own machine with no cloud Supabase? Jump to
> [Self-hosting with local email/password auth](#self-hosting-with-local-emailpassword-auth).


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
| `WOLFRAM_APP_ID` | unset | **Optional** knowledge-base enrichment key (server-side only). When set, `GET /api/kb/concept/[slug]` adds cached Wolfram\|Alpha pods to concept cards. Free non-commercial AppID: https://developer.wolframalpha.com/. |

### Knowledge-base enrichment is optional (zero keys required)

The KB layer (`lib/kb/`, `GET /api/kb/concept/[slug]`) is **purely additive and
degrades gracefully**. With **no keys at all** the app behaves exactly as
before: Wikipedia summaries (the REST `page/summary` endpoint needs no key) and
registry-derived "related concepts" still render, and any Wolfram field is
simply omitted. Set `WOLFRAM_APP_ID` to add computed/verification pods. An
upstream outage or rate-limit never surfaces an error — responses fall back to
the long-lived `kb_cache` (serve-stale) or drop the field. All keys stay
server-side; the browser never talks to a wellspring directly.

## Knowledge base operations

The full plan is [`docs/KNOWLEDGE-BASE-PLAN.md`](./KNOWLEDGE-BASE-PLAN.md); this
section is the maintainer-facing operator runbook for the pieces that need a
human (or a scheduled job) to run something — the generate → verify → promote
loop that keeps the question bank (`question_bank`) evergreen, and the per-user
rate caps that protect the KB routes. None of this is required to run the app:
every knob below is optional and the app/tests/build all work with zero keys.

### Env vars at a glance

| Variable | Used by | Default | Notes |
| --- | --- | --- | --- |
| `WOLFRAM_APP_ID` | `GET /api/kb/concept/[slug]`, `kb:generate` | unset | Server-side only. Enrichment pods when set; also the Wolfram recompute gate in the generation pipeline. Free non-commercial AppID: https://developer.wolframalpha.com/. |
| `ANTHROPIC_API_KEY` | `kb:generate` (maintainer script only) | unset | Never read by the running app/routes — only the batch generation script. Required for a LIVE `kb:generate` run; **not** required for `--dry-run`. |
| `KB_GENERATE_MODEL` | `kb:generate` | a current mid-tier Claude model | Lets you tune generation cost/quality without a code change. |
| `KB_AUTO_PROMOTE_MIN_VERIFIED` | `kb:promote --auto` | `5` | Minimum qualifying verified items a concept needs before auto-promote touches it. |
| `KB_AUTO_PROMOTE_REQUIRE_MATCH` | `kb:promote --auto` | `true` | When true, only verified items whose stored `verification.match === true` count toward the threshold / get promoted. |
| `KB_CONCEPT_DAILY_CAP` | `GET /api/kb/concept/[slug]` | `300`/user/day | Per-user daily cap; see "Rate caps" below. |
| `KB_STEPS_DAILY_CAP` | `POST /api/kb/steps` (when that route lands) | `200`/user/day | Same cap mechanism, pre-wired for the Show Steps route. |
| `PRACTICE_DAILY_CAP` | `GET /api/practice` | `100`/user/day | Same mechanism for the practice-set route. |
| `KB_RATE_LIMIT_DEFAULT_CAP` | any KB route not listed above | `300`/user/day | Fallback used by `lib/kb/rate-limit.js` for a route with no specific env var. |

### The generate → verify → promote loop

1. **Generate** (`npm run kb:generate`) runs the §8 pipeline: pick target
   concepts (global miss-rate + a coverage floor), pull a Wikipedia summary +
   exemplar questions, have Claude author candidates in the exact engine
   question schema, run the shared schema validator, recompute every claim
   through Wolfram|Alpha, dedup against the static pool + existing bank rows,
   and insert survivors as `question_bank.status = 'verified'`.
   - `npm run kb:generate -- --dry-run` runs the **whole plan with zero keys
     and zero network** — it prints the target concepts and the exact
     per-concept prompts, then stops. Good for sanity-checking targeting
     before spending API calls.
   - `npm run kb:generate -- --dry-run --concept=<slug>` to preview one concept.
   - A LIVE run needs `ANTHROPIC_API_KEY` (and `WOLFRAM_APP_ID` — without it
     every mc/numeric candidate is dropped at the Wolfram gate) and a reachable
     `DATABASE_URL`/`POSTGRES_URL`.
2. **Review** (`npm run kb:promote`, no flags — the default is a read-only
   list) prints every `verified` row: id, concept, qtype, source, a stem
   snippet, and the stored verification (Wolfram query/answer/match). Nothing
   is written in this mode.
   - `npm run kb:promote -- --concept=<slug>` to scope the review to one concept.
3. **Promote or retire** a specific item once you've eyeballed it:
   - `npm run kb:promote -- --promote=<uuid>` flips one `verified` row to `live`
     (the status the serving routes actually read).
   - `npm run kb:promote -- --retire=<uuid>` pulls any row (any status) to
     `retired` instantly — the fix for a bad item that slipped through, since
     every `quiz_answers.question_key` makes its blast radius auditable.
4. **Auto-promote** (`npm run kb:promote -- --auto`, **off by default** —
   nothing is auto-promoted unless you pass `--auto`) is a conservative trust
   policy: once a concept has `>= KB_AUTO_PROMOTE_MIN_VERIFIED` (default 5)
   verified items whose Wolfram verification actually matched
   (`verification.match === true`, unless `KB_AUTO_PROMOTE_REQUIRE_MATCH=false`),
   *all* of that concept's qualifying verified items are promoted to `live` in
   one pass. `--limit=<n>` caps how many rows a single run will change, so a
   first pass against a large backlog can be applied incrementally.
   - Both scripts support `--dry-run`, which for `kb:promote` means **no DB
     connection is ever opened** (not just no writes) — it prints the plan
     (query filters, thresholds, or the single UPDATE it would run) and exits.

### Rate caps on the KB routes

The app is serverless — many concurrent function instances, no shared memory —
so a per-user daily cap needs a **durable** counter, not an in-process one.
Migration `20260707140000_kb_usage.sql` adds `kb_usage (user_id, day, route,
count)`, a server-only table (RLS enabled, no policies — same shape as
`kb_cache`/`question_bank`; the app's pg role owns it and bypasses RLS).
`lib/kb/rate-limit.js` increments the row for `(user, today, route)` on every
request and compares it to that route's cap (table above).

- Over cap → the route returns **`429`** with a coarse `{ code: 'RATE_LIMIT' }`
  body, the same coarse-code convention as the `DB_CONN`/`DB_QUERY` codes
  documented below.
- Wired into `GET /api/kb/concept/[slug]` (route `kb-concept`) and
  `GET /api/practice` (route `practice`). `POST /api/kb/steps` (route
  `kb-steps`) is pre-wired in `lib/kb/rate-limit.js` — that route ships in the
  enrichment-UI PR; when it lands, call `checkRateLimit({ userId, route:
  'kb-steps', ... })` the same way the other two routes do.
- **Fails OPEN, always**: if the usage table isn't migrated yet or a query
  fails for any reason, `checkRateLimit` logs the error (via the same
  `logRouteError` convention as every other route) and returns `allowed: true`
  — a rate limiter must never turn an infra blip into an outage for every user.
  This mirrors `lib/kb/cache.js`'s serve-stale-on-error philosophy.
- Caps are intentionally generous defaults (hundreds of requests/user/day) —
  they exist to blunt a runaway client or scraping, not to throttle normal use.

### Scheduled top-up

`.github/workflows/kb-topup.yml` runs `npm run kb:generate` then
`npm run kb:promote -- --auto` on a monthly cron (`workflow_dispatch` also
available for an on-demand run). It reads `ANTHROPIC_API_KEY`, `WOLFRAM_APP_ID`,
and `DATABASE_URL` from **repository secrets** — set all three (Settings →
Secrets and variables → Actions) to enable it.

**No-ops gracefully without secrets:** the job has a job-level
`if: secrets.ANTHROPIC_API_KEY != '' && secrets.WOLFRAM_APP_ID != '' &&
secrets.DATABASE_URL != ''` — on a fork, or in this repo before an operator
configures the secrets, the job is **skipped**, not failed. This is on top of
(not instead of) the fact that both scripts are independently keyless-safe via
`--dry-run`, and CI's own `test`/`build` jobs never touch either secret.

### Open item carried from the plan (§12)

**Wolfram ToS**: whether "free product, non-commercial project" qualifies for
the Wolfram|Alpha free tier long-term is still an open question — flagged, not
blocking. All Wolfram calls are isolated behind the `lib/kb/sources/wolfram.js`
adapter, so if the answer turns out to be "no," the fix is a config/billing
change (a paid AppID), not an architecture change.

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

---

## Self-hosting with local email/password auth

You can run the entire app on your own machine — **register and sign in with
email + password, with no cloud Supabase** — using Docker Compose:

```bash
docker compose up -d --build
```

Then open <http://localhost:3000>, create an account with email + password, and
your progress persists to a local Postgres. Nothing leaves your machine.

### What `docker compose up` starts

| Service | Image | Role |
| --- | --- | --- |
| `db` | `postgres:16-alpine` | Postgres. Init scripts (`db/init/`) create the `auth` schema, `auth.uid()`, and the `anon`/`authenticated`/`postgres`/`service_role`/`supabase_auth_admin` roles — **but not `auth.users`** (GoTrue owns that). |
| `auth` | `supabase/gotrue:v2.177.0` | **GoTrue**, Supabase's auth server. Runs its own migrations to create `auth.users`/`identities`/`sessions`/… and issues session JWTs. `GOTRUE_MAILER_AUTOCONFIRM=true` means no SMTP is needed — signups are confirmed instantly. |
| `migrate` | `postgres:16-alpine` | One-shot. Applies `supabase/migrations/*.sql` **after** GoTrue created `auth.users` (so the app's FKs/triggers resolve), then exits. `app` waits for it to complete. |
| `proxy` | `nginx:alpine` | Reverse proxy. The Supabase JS client calls `${SUPABASE_URL}/auth/v1/*`; GoTrue serves at its root. `db/proxy/nginx.conf` maps `/auth/v1/ → http://auth:9999/`. Published on host port `8000`. |
| `app` | built from `./Dockerfile` | The Next.js app. |

Startup order is enforced with healthchecks and `depends_on`:
`db` (healthy) → `auth` (healthy) → `migrate` (completed) → `app`.

> **`auth` crash-loops with `no schema has been selected to create in`
> (SQLSTATE `3F000`)?** GoTrue is trying to create its tables in the `auth`
> schema, but that schema is missing. The schema is created by the `db/init/`
> scripts, which Postgres runs **only on a fresh data directory** — so a
> **`pgdata` volume left over from before the GoTrue integration** never got it
> (the db log shows `Skipping initialization`). Fix: `docker compose down -v`
> once to drop the stale volume, then `up --build` re-initialises it. (This
> wipes local progress; it only affects volumes predating local auth.)

### Browser-vs-server URL split (why there are two Supabase URLs)

`NEXT_PUBLIC_SUPABASE_URL` is baked into the **browser** bundle at build time and
must be reachable from your host, so it's `http://localhost:8000` (the proxy).
The app's **server** code runs inside the compose network and reaches the proxy
at `http://proxy:8000`, set at runtime as `SUPABASE_URL`. `lib/auth-server.js`
prefers `SUPABASE_URL` over `NEXT_PUBLIC_SUPABASE_URL` for exactly this reason
(harmless in prod, where only `NEXT_PUBLIC_SUPABASE_URL` is set).

### Verifying it works from the command line

```bash
ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.F_rDxRTPE8OU83L_CNgEGXfmirMXmMMugT29Cvc8ygQ"
curl -s -X POST http://localhost:8000/auth/v1/signup \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"password1234"}'
```

A `200` with an `access_token` means auth is live. (In the browser you'd just
use the sign-up form instead.)

### What is NOT available locally (by design)

**Passkeys and Google sign-in are cloud-only.** They require a public domain
and/or OAuth credentials that a local machine doesn't have. Use email/password
locally. The app still exposes those buttons, but they won't complete against
the local stack — that's expected.

### Data persistence — your progress survives restarts

Progress lives in a Docker **named volume** (`pgdata`).

- `docker compose stop` / `docker compose down` — **KEEP** the volume. Your
  account and progress survive; `docker compose up` again picks up where you
  left off. This is the normal way to stop.
- `docker compose down -v` — **WIPES** the volume (the `-v` deletes it). Reserve
  this for a deliberate full reset; it deletes every account and all progress.

#### Optional: persistence that survives even a full `down -v`

If you want your data to outlive an accidental `down -v`, use an **external**
named volume (Docker won't delete external volumes on `down -v`). Create it once,
then always include the override file:

```bash
docker volume create minima-pgdata
docker compose -f docker-compose.yml -f docker-compose.persist.yml up -d --build
```

To actually delete that data later: `docker volume rm minima-pgdata`.
(A gitignored host bind-mount is a fine alternative if you'd rather see the files
on disk; point `db.volumes` at `./.pgdata:/var/lib/postgresql/data`. `.pgdata/`
is already gitignored.)

### Optional: zero-login dev bypass

To hack on the app **without** registering, bring up the opt-in override, which
trusts a fixed dev identity (`dev@astrealabs.com`) and skips GoTrue entirely:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev-auth.yml up -d --build
```

This flips the app to `DEV_AUTH=1`. The bypass is **hard-disabled on Vercel**
(`lib/auth-server.js` refuses it when `VERCEL` is set), so it can never leak into
production.

### Optional: a pretty HTTPS hostname instead of localhost ports

By default the stack is served over plain HTTP at `http://localhost:3000` (app)
and `http://localhost:8000` (auth proxy) — zero setup. If you'd rather develop
against a single HTTPS origin that mirrors production
(`https://minima.local.astrealabs.com`), layer on the HTTPS override.

**No host setup needed — `minima.local.astrealabs.com` resolves to `127.0.0.1`
via public DNS** (a permanent `A` record on the `astrealabs.com` zone, the same
"loopback hostname" trick as `lvh.me` / `localtest.me`). Just bring the stack up
with the override:

```bash
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build
```

<details>
<summary>Offline, or DNS blocked? Add a local <code>/etc/hosts</code> entry.</summary>

The public record is only a convenience — if you're offline or your resolver
blocks it, point the hostname at loopback yourself:

```bash
echo '127.0.0.1 minima.local.astrealabs.com' | sudo tee -a /etc/hosts
```

Maintainers: the record is `minima.local  A  127.0.0.1` in Cloudflare, **DNS-only
(not proxied)** — Cloudflare won't proxy a loopback target, and proxying would
break TLS to the local stack anyway.
</details>

Open <https://minima.local.astrealabs.com> and **trust the self-signed cert
once** (the browser warns because it's not signed by a public CA — expected for
a local front door). The cert is generated in-container on first start and lives
in a named volume (`proxy-certs`); it's never committed.

What the override changes: the `proxy` also listens on `:443` and fronts the
whole app at one origin (`/auth/v1/*` → GoTrue, everything else → the Next app),
and the browser bundle + GoTrue's external URLs point at that origin — so the
app is same-origin with its auth endpoint, exactly like production. The internal
`:8000` path is unchanged (server-side code still reaches `http://proxy:8000`).

**Passkeys still don't work locally** even over HTTPS — self-hosted GoTrue has no
WebAuthn support. This override is purely for a clean URL and TLS parity; use
email/password.

### Optional: access over Tailscale (real cert, any device)

If you're on [Tailscale](https://tailscale.com/), you can reach the stack from
any device on your tailnet at a **real, browser-trusted HTTPS URL** — no public
DNS record, no `/etc/hosts`, and **no self-signed-cert warning**. Tailscale's
[MagicDNS](https://tailscale.com/kb/1081/magicdns) gives your machine a name and
[`tailscale serve`](https://tailscale.com/kb/1242/tailscale-serve) fronts it with
an auto-provisioned Let's Encrypt cert. (Enable **MagicDNS** and **HTTPS
certificates** in the tailnet admin console first.)

This reuses the HTTPS override — Tailscale terminates TLS with the trusted cert
and proxies to the local self-signed nginx, so the self-signed cert never reaches
a browser. `FRONTDOOR_URL` points the browser bundle and GoTrue at your node's
name instead of the local DNS hostname.

```bash
# 1. Your node's MagicDNS name (drop the trailing dot):
NODE=$(tailscale status --json | python3 -c 'import sys,json;print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')
echo "$NODE"   # e.g. my-mac.tailnet-abcd.ts.net

# 2. Build + run the HTTPS override with that origin:
FRONTDOOR_URL="https://$NODE" \
  docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build

# 3. Front it with a trusted Tailscale cert (proxies to the local self-signed nginx):
tailscale serve --bg https+insecure://localhost:443

# 4. Open https://$NODE from any device on your tailnet — real cert, no warning.
```

Notes:

- If host port `443` needs privileges on your machine, publish nginx elsewhere
  (`HTTPS_PORT=8443 …`) and point serve at it: `https+insecure://localhost:8443`.
- `tailscale serve` keeps the stack **private to your tailnet**. To expose it to
  the public internet, swap `serve` → `funnel` — but don't, while the stack still
  uses the demo JWT secret / anon key (see the security note below).
- **Passkeys still won't work** — a trusted cert and real origin remove the
  browser-side blockers, but self-hosted GoTrue has no WebAuthn endpoints at all.

### ⚠️ Security: the local secrets are demo values — change them for any real deployment

The compose stack hardcodes the **well-known Supabase local demo** JWT secret and
a matching `anon` key:

- `GOTRUE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long`
- the local `anon` JWT (see `docker-compose.yml`).

These are **fine for a laptop but are public and MUST be regenerated for any
real / internet-facing deployment.** If you ever expose this stack beyond
localhost, you must at minimum:

1. Replace `GOTRUE_JWT_SECRET` with a fresh 32+ char secret.
2. Mint a new `anon` JWT signed with that secret (role `anon`) and update both
   the `app` build arg `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the runtime
   `SUPABASE_ANON_KEY`.
3. Change `POSTGRES_PASSWORD` (and thus the `DATABASE_URL` / GoTrue DB URL).
4. Set real `GOTRUE_SITE_URL` / `API_EXTERNAL_URL` to your public domain, front
   the stack with TLS, and configure SMTP (turn off `GOTRUE_MAILER_AUTOCONFIRM`
   so emails are actually verified).

For a managed, production-grade deployment, prefer cloud Supabase (top of this
doc) over self-hosting GoTrue.
