import { NextResponse } from 'next/server';
import { pool, logRouteError } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const r = await pool.query(
      `SELECT lesson_id, accuracy, attempts FROM lesson_accuracy
       WHERE user_id = $1 ORDER BY accuracy ASC`,
      [user.id]
    );
    return NextResponse.json({ lessons: r.rows });
  } catch (e) {
    const code = logRouteError('/api/stats', 'GET', user.id, e);
    return NextResponse.json({ error: 'internal error', code }, { status: 500 });
  }
}
