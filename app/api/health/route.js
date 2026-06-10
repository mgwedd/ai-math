import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    await pool.query('SELECT 1');
    return NextResponse.json({ ok: true });
  } catch (e) {
    // log the real cause (code + message + host, never credentials)
    console.error('health check db error:', e.code, e.message);
    const host = (() => {
      try {
        const cs = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
        return cs ? new URL(cs.replace(/^postgres(ql)?:/, 'http:')).hostname : 'no env var set';
      } catch { return 'unparseable'; }
    })();
    console.error('health check target host:', host);
    return NextResponse.json(
      { ok: false, error: 'db unreachable', code: e.code || null },
      { status: 503 }
    );
  }
}
