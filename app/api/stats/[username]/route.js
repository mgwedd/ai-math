import { NextResponse } from 'next/server';
import { pool, cleanUsername } from '@/lib/db';

export async function GET(_req, { params }) {
  const { username: raw } = await params;
  const username = cleanUsername(raw);
  if (!username) return NextResponse.json({ error: 'bad username' }, { status: 400 });
  const r = await pool.query(
    `SELECT lesson_id, accuracy, attempts FROM lesson_accuracy
     WHERE username = $1 ORDER BY accuracy ASC`,
    [username]
  );
  return NextResponse.json({ lessons: r.rows });
}
