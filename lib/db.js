import { Pool } from 'pg';

// one pool per process (survives Next.js dev hot-reload via globalThis)
const connectionString =
  process.env.DATABASE_URL ||
  'postgres://aimath:aimath_dev@localhost:5433/aimath';

const g = globalThis;
export const pool =
  g.__aimathPool ??
  (g.__aimathPool = new Pool({
    connectionString,
    // Serverless (Vercel): keep per-instance connections minimal and point
    // DATABASE_URL at your provider's *pooled* endpoint (pgbouncer).
    max: Number(process.env.PG_POOL_MAX || (process.env.VERCEL ? 1 : 10)),
    // `?sslmode=require` in the URL covers providers with valid certs
    // (Neon, Supabase pooler). Set DATABASE_SSL=no-verify only if your
    // provider's chain doesn't validate.
    ssl: process.env.DATABASE_SSL === 'no-verify'
      ? { rejectUnauthorized: false }
      : undefined,
  }));

// Reject oversized payloads before JSON.parse (Vercel functions are billed
// by time; don't let anyone feed you 4MB blobs).
export const MAX_BODY_BYTES = 256 * 1024;
export async function readJson(req) {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return { tooLarge: true };
  try { return { body: JSON.parse(raw) }; } catch { return { body: null }; }
}

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
