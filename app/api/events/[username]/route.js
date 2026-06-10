import { NextResponse } from 'next/server';
import { pool, cleanUsername, getOrCreateUser, readJson } from '@/lib/db';

export async function POST(req, { params }) {
  const { username: raw } = await params;
  const username = cleanUsername(raw);
  if (!username) return NextResponse.json({ error: 'bad username' }, { status: 400 });

  const { body, tooLarge } = await readJson(req);
  if (tooLarge) return NextResponse.json({ error: 'payload too large' }, { status: 413 });
  const events = body && body.events;
  if (!Array.isArray(events) || events.length > 200) {
    return NextResponse.json({ error: 'body must be {events:[...]} (≤200)' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userId = await getOrCreateUser(client, username);
    let stored = 0;
    for (const ev of events) {
      if (!ev || typeof ev.lessonId !== 'string' || ev.lessonId.length > 64) continue;
      if (ev.type === 'quiz_answer') {
        await client.query(
          `INSERT INTO quiz_answers (user_id, lesson_id, question_idx, correct, first_try)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, ev.lessonId, Math.floor(+ev.questionIdx) || 0, !!ev.correct, !!ev.firstTry]
        );
        stored++;
      } else if (ev.type === 'lesson_complete') {
        await client.query(
          `INSERT INTO lesson_completions (user_id, lesson_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, ev.lessonId]
        );
        stored++;
      }
    }
    await client.query('COMMIT');
    return NextResponse.json({ ok: true, stored });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  } finally {
    client.release();
  }
}
