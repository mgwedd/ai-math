import { Pool } from 'pg';

// one pool per process (survives Next.js dev hot-reload via globalThis)
const g = globalThis;
export const pool =
  g.__aimathPool ??
  (g.__aimathPool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgres://aimath:aimath_dev@localhost:5433/aimath',
  }));

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
