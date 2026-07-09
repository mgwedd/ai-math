import { NextResponse } from 'next/server';
import { pool, logRouteError } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    // Two independent read-only aggregates over the same append-only log —
    // per-lesson (existing) and per-concept (PR 2, concept_accuracy view,
    // docs/KNOWLEDGE-BASE-PLAN.md §4.1): the durable "what did I get wrong
    // across the whole curriculum" signal. Weakest concept first.
    const [lessons, concepts] = await Promise.all([
      pool.query(
        `SELECT lesson_id, accuracy, attempts FROM lesson_accuracy
         WHERE user_id = $1 ORDER BY accuracy ASC`,
        [user.id]
      ),
      pool.query(
        `SELECT tag, accuracy, attempts, misses, last_seen FROM concept_accuracy
         WHERE user_id = $1 ORDER BY accuracy ASC`,
        [user.id]
      ),
    ]);
    return NextResponse.json({ lessons: lessons.rows, concepts: concepts.rows });
  } catch (e) {
    const code = logRouteError('/api/stats', 'GET', user.id, e);
    return NextResponse.json({ error: 'internal error', code }, { status: 500 });
  }
}
