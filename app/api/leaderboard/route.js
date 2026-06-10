import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  const r = await pool.query(
    `SELECT u.username, p.xp, p.updated_at
     FROM progress p JOIN users u ON u.id = p.user_id
     ORDER BY p.xp DESC LIMIT 20`
  );
  return NextResponse.json({ leaderboard: r.rows });
}
