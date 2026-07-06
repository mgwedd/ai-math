import { NextResponse } from 'next/server';
import { pool, logRouteError } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const r = await pool.query(
      `SELECT pr.username, p.xp, p.updated_at
       FROM progress p JOIN profiles pr ON pr.user_id = p.user_id
       ORDER BY p.xp DESC LIMIT 20`
    );
    return NextResponse.json({ leaderboard: r.rows });
  } catch (e) {
    const code = logRouteError('/api/leaderboard', 'GET', user.id, e);
    return NextResponse.json({ error: 'internal error', code }, { status: 500 });
  }
}
