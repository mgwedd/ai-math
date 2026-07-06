import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL || // Vercel↔Supabase integration's var name
  'postgres://aimath:aimath_dev@localhost:5433/aimath';

/* IMPORTANT: we parse the URL ourselves instead of passing connectionString
   to pg. node-postgres merges parsed connection-string params OVER the
   config object, so a `?sslmode=require` in the URL silently overrides any
   `ssl` option you pass — which breaks both CA pinning and no-verify.
   Parsing manually makes our ssl config authoritative. */
export function pgConfig(cs) {
  const u = new URL(cs);
  const urlWantsTls = /\bsslmode=(prefer|require|verify-ca|verify-full|no-verify)\b/.test(cs);
  const wantsTls = urlWantsTls || !!process.env.DATABASE_SSL_CA || process.env.DATABASE_SSL === 'no-verify';
  // TLS, strictest first:
  // 1. DATABASE_SSL_CA (PEM) -> full chain verification against that CA
  // 2. otherwise            -> encrypted, unverified (Supabase chains are
  //    self-signed; see README TODO about restoring verification)
  const ssl = !wantsTls
    ? undefined
    : process.env.DATABASE_SSL_CA
      ? { ca: process.env.DATABASE_SSL_CA, rejectUnauthorized: true }
      : { rejectUnauthorized: false };
  return {
    host: u.hostname,
    port: Number(u.port) || 5432,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, '') || 'postgres',
    ssl,
    // Serverless (Vercel): keep per-instance connections minimal and use the
    // provider's pooled endpoint (pgbouncer/supavisor).
    max: Number(process.env.PG_POOL_MAX || (process.env.VERCEL ? 1 : 10)),
  };
}

// Describe the SSL config actually in effect, in words safe to log (no key
// material). Mirrors the branching in pgConfig().
function sslSummary() {
  if (process.env.DATABASE_SSL_CA) return 'verify-ca (DATABASE_SSL_CA pinned)';
  if (process.env.DATABASE_SSL === 'no-verify') return 'on/no-verify (DATABASE_SSL)';
  const cs = process.env.DATABASE_URL || process.env.POSTGRES_URL || connectionString;
  if (/\bsslmode=(prefer|require|verify-ca|verify-full|no-verify)\b/.test(cs)) return 'on/no-verify (sslmode in URL)';
  return 'off';
}

// one pool per process (survives Next.js dev hot-reload via globalThis)
const g = globalThis;
export const pool = g.__aimathPool ?? (g.__aimathPool = new Pool(pgConfig(connectionString)));

// Attach a pool-level error handler and log a redacted startup summary exactly
// once per process. `pool.on('error')` catches failures on IDLE clients (e.g.
// the pooler dropping an idle connection) that would otherwise crash the
// function with an unhandled 'error' event and no context.
if (!g.__aimathPoolInit) {
  g.__aimathPoolInit = true;
  const cfg = pgConfig(connectionString);
  // Redacted: host, port, ssl mode, pool max — NEVER password or full URL.
  // Answers "is prod on the pooler (6543) with TLS?" from logs alone.
  console.log(
    '[db] pool init ' + JSON.stringify({
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,          // role name only; not sensitive, aids 28P01 debugging
      ssl: sslSummary(),
      poolMax: cfg.max,
      vercel: !!process.env.VERCEL,
    })
  );
  pool.on('error', (e) => {
    console.error(
      '[db] pool idle-client error ' + JSON.stringify({
        code: e && e.code, message: e && e.message,
        routine: e && e.routine, host: dbTargetHost(),
      })
    );
  });
}

export function dbTargetHost() {
  try {
    const cs = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
    // rewrite scheme so URL() parses it; strips credentials, keeps host:port
    return cs ? new URL(cs.replace(/^postgres(ql)?:/, 'http:')).hostname : 'no env var set';
  } catch { return 'unparseable'; }
}

// Postgres/driver error codes that mean "couldn't reach/authenticate to the DB"
// (network + connection-time failures) rather than a bad query. Used to pick a
// coarse client-facing code so the browser network tab hints at the failure
// class without leaking internals.
const CONN_ERROR_CODES = new Set([
  'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH', 'EHOSTUNREACH',
  'ECONNRESET', 'EPIPE',
  '28P01', // invalid_password
  '28000', // invalid_authorization_specification
  '3D000', // invalid_catalog_name (wrong database)
  '08006', '08001', '08003', '08004', // connection exceptions
  '53300', // too_many_connections
  '57P01', '57P03', // admin shutdown / cannot connect now
]);

function coarseCode(e) {
  const c = e && e.code;
  if (c && CONN_ERROR_CODES.has(c)) return 'DB_CONN';
  // TLS handshake failures surface as messages, not pg codes.
  if (e && typeof e.message === 'string' && /\b(self.signed|certificate|SSL|TLS|cert)\b/i.test(e.message)) return 'DB_CONN';
  return 'DB_QUERY';
}

// Log a DB/route failure to the server (Vercel function logs) as ONE greppable,
// single-line JSON object with the pg fields that actually identify the
// failure — code, message, detail, routine — plus route/method/user context.
// Never logs credentials. Returns a coarse, stable client-facing code
// (DB_CONN | DB_QUERY) so the 500 response body can hint at the failure class.
export function logRouteError(route, method, userId, e) {
  const code = coarseCode(e);
  console.error(
    '[api] route error ' + JSON.stringify({
      route,
      method,
      userId: userId || null,
      clientCode: code,
      pgCode: (e && e.code) || null,
      message: (e && e.message) || String(e),
      detail: (e && e.detail) || undefined,
      routine: (e && e.routine) || undefined,
      host: dbTargetHost(),
    })
  );
  return code;
}

// Reject oversized payloads before JSON.parse (Vercel functions are billed
// by time; don't let anyone feed you 4MB blobs).
export const MAX_BODY_BYTES = 256 * 1024;
export async function readJson(req) {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return { tooLarge: true };
  try { return { body: JSON.parse(raw) }; } catch { return { body: null }; }
}
