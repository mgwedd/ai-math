import { NextResponse } from 'next/server';
import { pool, logRouteError } from '@/lib/db';

export async function GET() {
  try {
    await pool.query('SELECT 1');
    return NextResponse.json({ ok: true });
  } catch (e) {
    // log the real cause (code + message + host, never credentials)
    const code = logRouteError('/api/health', 'GET', null, e);
    return NextResponse.json(
      { ok: false, error: 'db unreachable', code },
      { status: 503 }
    );
  }
}
