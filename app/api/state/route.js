import { NextResponse } from 'next/server';
import { pool, readJson, logRouteError } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const r = await pool.query(
      'SELECT state, xp, updated_at FROM progress WHERE user_id = $1',
      [user.id]
    );
    if (!r.rows.length) return NextResponse.json({ error: 'no state' }, { status: 404 });
    return NextResponse.json(r.rows[0]);
  } catch (e) {
    const code = logRouteError('/api/state', 'GET', user.id, e);
    return NextResponse.json({ error: 'internal error', code }, { status: 500 });
  }
}

export async function PUT(req) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { body, tooLarge } = await readJson(req);
  if (tooLarge) return NextResponse.json({ error: 'payload too large' }, { status: 413 });
  const state = body && body.state;
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return NextResponse.json({ error: 'body must be {state:{...}}' }, { status: 400 });
  }
  const xp = Number.isFinite(+state.xp)
    ? Math.min(10_000_000, Math.max(0, Math.floor(+state.xp))) : 0;

  let client;
  try {
    // pool.connect() itself throws when the DB is unreachable (bad pooler URL,
    // SSL failure, wrong credentials) — the common prod-500 cause — so it must
    // be inside the try, or the error escapes unlogged.
    client = await pool.connect();
    await client.query('BEGIN');
    const prev = await client.query(
      'SELECT xp FROM progress WHERE user_id = $1 FOR UPDATE', [user.id]);
    const prevXp = prev.rows.length ? prev.rows[0].xp : 0;
    const r = await client.query(
      `INSERT INTO progress (user_id, state, xp, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id)
       DO UPDATE SET state = EXCLUDED.state, xp = EXCLUDED.xp, updated_at = now()
       RETURNING updated_at`,
      [user.id, state, xp]
    );
    if (xp !== prevXp) {
      await client.query(
        'INSERT INTO xp_events (user_id, delta, xp_after) VALUES ($1, $2, $3)',
        [user.id, xp - prevXp, xp]
      );
    }
    await client.query('COMMIT');
    return NextResponse.json({ ok: true, updated_at: r.rows[0].updated_at });
  } catch (e) {
    if (client) { try { await client.query('ROLLBACK'); } catch { /* connection already dead */ } }
    const code = logRouteError('/api/state', 'PUT', user.id, e);
    return NextResponse.json({ error: 'internal error', code }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
