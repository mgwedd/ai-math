import { NextResponse } from 'next/server';
import { pool, cleanUsername, getOrCreateUser, readJson } from '@/lib/db';

export async function GET(_req, { params }) {
  const { username: raw } = await params;
  const username = cleanUsername(raw);
  if (!username) return NextResponse.json({ error: 'bad username' }, { status: 400 });
  const r = await pool.query(
    `SELECT p.state, p.xp, p.updated_at
     FROM progress p JOIN users u ON u.id = p.user_id
     WHERE u.username = $1`,
    [username]
  );
  if (!r.rows.length) return NextResponse.json({ error: 'no state' }, { status: 404 });
  return NextResponse.json(r.rows[0]);
}

export async function PUT(req, { params }) {
  const { username: raw } = await params;
  const username = cleanUsername(raw);
  if (!username) return NextResponse.json({ error: 'bad username' }, { status: 400 });

  const { body, tooLarge } = await readJson(req);
  if (tooLarge) return NextResponse.json({ error: 'payload too large' }, { status: 413 });
  const state = body && body.state;
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return NextResponse.json({ error: 'body must be {state:{...}}' }, { status: 400 });
  }
  const xp = Number.isFinite(+state.xp)
    ? Math.min(10_000_000, Math.max(0, Math.floor(+state.xp))) : 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userId = await getOrCreateUser(client, username);
    const prev = await client.query(
      'SELECT xp FROM progress WHERE user_id = $1 FOR UPDATE', [userId]);
    const prevXp = prev.rows.length ? prev.rows[0].xp : 0;
    const r = await client.query(
      `INSERT INTO progress (user_id, state, xp, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id)
       DO UPDATE SET state = EXCLUDED.state, xp = EXCLUDED.xp, updated_at = now()
       RETURNING updated_at`,
      [userId, state, xp]
    );
    if (xp !== prevXp) {
      await client.query(
        'INSERT INTO xp_events (user_id, delta, xp_after) VALUES ($1, $2, $3)',
        [userId, xp - prevXp, xp]
      );
    }
    await client.query('COMMIT');
    return NextResponse.json({ ok: true, updated_at: r.rows[0].updated_at });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  } finally {
    client.release();
  }
}
