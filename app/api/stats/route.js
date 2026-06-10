import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const r = await pool.query(
    `SELECT lesson_id, accuracy, attempts FROM lesson_accuracy
     WHERE user_id = $1 ORDER BY accuracy ASC`,
    [user.id]
  );
  return NextResponse.json({ lessons: r.rows });
}
