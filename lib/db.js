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

// one pool per process (survives Next.js dev hot-reload via globalThis)
const g = globalThis;
export const pool = g.__aimathPool ?? (g.__aimathPool = new Pool(pgConfig(connectionString)));

export const USERNAME_RE = /^[a-z0-9_-]{1,32}$/;

export function cleanUsername(raw) {
  const u = String(raw || '').toLowerCase().trim();
  return USERNAME_RE.test(u) ? u : null;
}

export async function getOrCreateUser(client, username) {
  const r = await client.query(
    `INSERT INTO users (username) VALUES ($1)
     ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
     RETURNING id`,
    [username]
  );
  return r.rows[0].id;
}

// Reject oversized payloads before JSON.parse (Vercel functions are billed
// by time; don't let anyone feed you 4MB blobs).
export const MAX_BODY_BYTES = 256 * 1024;
export async function readJson(req) {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return { tooLarge: true };
  try { return { body: JSON.parse(raw) }; } catch { return { body: null }; }
}
