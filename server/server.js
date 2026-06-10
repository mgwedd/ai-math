'use strict';
/* Gradient Ascent API — serves the app from /public and persists progress
   to Postgres.

   Endpoints:
     GET  /api/health                 liveness + db check
     GET  /api/state/:username        progress snapshot (404 if new user)
     PUT  /api/state/:username        upsert snapshot {state:{...}}; logs xp delta
     POST /api/events/:username       batched UI events {events:[...]}
                                        {type:'quiz_answer', lessonId, questionIdx, correct, firstTry}
                                        {type:'lesson_complete', lessonId}
     GET  /api/stats/:username        per-lesson quiz accuracy
     GET  /api/leaderboard            top 20 by xp
*/
const express = require('express');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgres://aimath:aimath_dev@localhost:5433/aimath',
});

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(express.static('public'));

const USERNAME_RE = /^[a-z0-9_-]{1,32}$/;
function cleanUsername(raw) {
  const u = String(raw || '').toLowerCase().trim();
  return USERNAME_RE.test(u) ? u : null;
}
async function getOrCreateUser(client, username) {
  const r = await client.query(
    `INSERT INTO users (username) VALUES ($1)
     ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
     RETURNING id`, [username]);
  return r.rows[0].id;
}
// async route wrapper
const h = fn => (req, res) => fn(req, res).catch(err => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

app.get('/api/health', h(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
}));

app.get('/api/state/:username', h(async (req, res) => {
  const username = cleanUsername(req.params.username);
  if (!username) return res.status(400).json({ error: 'bad username' });
  const r = await pool.query(
    `SELECT p.state, p.xp, p.updated_at
     FROM progress p JOIN users u ON u.id = p.user_id
     WHERE u.username = $1`, [username]);
  if (!r.rows.length) return res.status(404).json({ error: 'no state' });
  res.json(r.rows[0]);
}));

app.put('/api/state/:username', h(async (req, res) => {
  const username = cleanUsername(req.params.username);
  if (!username) return res.status(400).json({ error: 'bad username' });
  const state = req.body && req.body.state;
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return res.status(400).json({ error: 'body must be {state:{...}}' });
  }
  const xp = Number.isFinite(+state.xp) ? Math.max(0, Math.floor(+state.xp)) : 0;

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
       RETURNING updated_at`, [userId, state, xp]);
    if (xp !== prevXp) {
      await client.query(
        'INSERT INTO xp_events (user_id, delta, xp_after) VALUES ($1, $2, $3)',
        [userId, xp - prevXp, xp]);
    }
    await client.query('COMMIT');
    res.json({ ok: true, updated_at: r.rows[0].updated_at });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

app.post('/api/events/:username', h(async (req, res) => {
  const username = cleanUsername(req.params.username);
  if (!username) return res.status(400).json({ error: 'bad username' });
  const events = req.body && req.body.events;
  if (!Array.isArray(events) || events.length > 200) {
    return res.status(400).json({ error: 'body must be {events:[...]} (≤200)' });
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
          [userId, ev.lessonId, Math.floor(+ev.questionIdx) || 0, !!ev.correct, !!ev.firstTry]);
        stored++;
      } else if (ev.type === 'lesson_complete') {
        await client.query(
          `INSERT INTO lesson_completions (user_id, lesson_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, ev.lessonId]);
        stored++;
      }
    }
    await client.query('COMMIT');
    res.json({ ok: true, stored });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

app.get('/api/stats/:username', h(async (req, res) => {
  const username = cleanUsername(req.params.username);
  if (!username) return res.status(400).json({ error: 'bad username' });
  const r = await pool.query(
    `SELECT lesson_id, accuracy, attempts FROM lesson_accuracy
     WHERE username = $1 ORDER BY accuracy ASC`, [username]);
  res.json({ lessons: r.rows });
}));

app.get('/api/leaderboard', h(async (_req, res) => {
  const r = await pool.query(
    `SELECT u.username, p.xp, p.updated_at
     FROM progress p JOIN users u ON u.id = p.user_id
     ORDER BY p.xp DESC LIMIT 20`);
  res.json({ leaderboard: r.rows });
}));

// wait for postgres (compose healthcheck usually makes this instant)
async function start() {
  for (let i = 0; i < 30; i++) {
    try { await pool.query('SELECT 1'); break; }
    catch (e) {
      if (i === 29) { console.error('postgres unreachable, giving up'); process.exit(1); }
      console.log('waiting for postgres…');
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  app.listen(PORT, () => console.log(`Gradient Ascent up on http://localhost:${PORT}`));
}
start();
