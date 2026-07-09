#!/usr/bin/env node
/* ================================================================
   kb:promote — review & promote the generated-question bank
   (docs/KNOWLEDGE-BASE-PLAN.md §4.3, §8 step 5, PR 7).
   ----------------------------------------------------------------
   scripts/kb-generate.mjs inserts candidates as status='verified' (schema-gate
   + Wolfram-recompute-matched). Promotion to 'live' — the status the serving
   routes (`GET /api/practice`) actually read — is a deliberate, separate step
   so a maintainer (or the conservative auto-promote policy below) reviews
   before generated content reaches a learner.

   Lifecycle reminder (see the question_bank migration): draft -> verified ->
   live -> retired. This script only ever moves verified -> live, or ANY
   status -> retired (pulling a bad item is always available, instantly).

   Modes (default is --list, the safe read-only review path):
     --list                 (default) print verified items, optionally
                            filtered by --concept=<slug>, newest first
     --promote=<uuid>       flip one verified item to 'live'
     --retire=<uuid>        flip one item (any status) to 'retired'
     --auto                 run the auto-promote POLICY (see below) instead of
                            a manual flip — conservative, OFF unless passed
     --concept=<slug>       filter --list / --auto to one concept
     --limit=<n>            cap rows listed / auto-promoted this run (default 50)
     --dry-run              print what WOULD change; no DB writes AND no DB
                            connection at all — safe with zero config (mirrors
                            kb-generate's keyless --dry-run)

   AUTO-PROMOTE POLICY (opt-in via --auto; every knob is env-configurable, and
   the defaults are deliberately conservative):
     A concept becomes eligible once it has >= KB_AUTO_PROMOTE_MIN_VERIFIED
     (default 5) verified items whose stored `verification.match` is exactly
     `true` (i.e. the Wolfram recompute in kb-generate actually confirmed the
     claimed answer — never trust a row with no verification payload). Once a
     concept is eligible, ALL of its qualifying verified items are promoted to
     'live' (they already passed the same gate; there is no reason to leave
     older verified rows behind once a concept has earned trust). --limit still
     caps the total number of rows changed in a single run, so a first run
     against a large backlog promotes incrementally rather than all at once.

   KEYLESS / DB-LESS --dry-run: like kb-generate, --dry-run never imports
   lib/db.js and never opens a database connection — it prints the plan
   (mode, filters, thresholds) and stops. Safe to run in CI or a keyless dev
   box with zero config.
   ================================================================ */
import { getConcept } from '../lib/curriculum/concepts.js';

// Auto-promote knobs — env-configurable, conservative defaults (house rule:
// tunables live in env/SCORING, never as literals deep in the logic).
const AUTO_MIN_VERIFIED = Math.max(1, parseInt(process.env.KB_AUTO_PROMOTE_MIN_VERIFIED, 10) || 5);
const AUTO_REQUIRE_MATCH = process.env.KB_AUTO_PROMOTE_REQUIRE_MATCH !== 'false'; // default true

/* ---------- arg parsing ---------- */
function parseArgs(argv) {
  const args = { dryRun: false, concept: null, limit: 50, auto: false, promote: null, retire: null };
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--auto') args.auto = true;
    else if (a.startsWith('--concept=')) args.concept = a.slice('--concept='.length);
    else if (a.startsWith('--limit=')) args.limit = Math.max(1, parseInt(a.slice('--limit='.length), 10) || 50);
    else if (a.startsWith('--promote=')) args.promote = a.slice('--promote='.length);
    else if (a.startsWith('--retire=')) args.retire = a.slice('--retire='.length);
  }
  return args;
}

/* ---------- verification-match helper (shared by policy + display) ---------- */
function verificationMatches(row) {
  const v = row.verification;
  return !!(v && v.match === true);
}

function snippet(spec, n = 80) {
  const q = spec && spec.q;
  if (typeof q !== 'string') return '(no stem)';
  const plain = q.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.length > n ? plain.slice(0, n) + '…' : plain;
}

function printRow(row) {
  const v = row.verification;
  const vDesc = v
    ? (v.match ? 'wolfram OK (' + (v.wolfram_answer ?? '?') + ' == ' + (v.claimed ?? '?') + ')' : 'wolfram MISMATCH')
    : 'no verification payload';
  console.log(
    '  [' + row.status + '] ' + row.id + '  concept=' + row.concept + ' qtype=' + row.qtype +
    ' source=' + row.source + '\n' +
    '      "' + snippet(row.spec) + '"\n' +
    '      verification: ' + vDesc + '  created=' + new Date(row.created_at).toISOString()
  );
}

/* ---------- orchestration ---------- */
async function main() {
  const args = parseArgs(process.argv);

  console.log('== kb:promote ==');
  console.log('mode        : ' + (args.dryRun ? 'DRY-RUN (no DB connection, no writes)' : 'LIVE'));
  if (args.concept) {
    if (!getConcept(args.concept)) { console.error('unknown concept slug: ' + args.concept); process.exit(1); }
    console.log('concept     : ' + args.concept);
  }
  console.log('limit       : ' + args.limit);
  if (args.auto) console.log('policy      : AUTO-PROMOTE min_verified=' + AUTO_MIN_VERIFIED + ' require_match=' + AUTO_REQUIRE_MATCH);
  if (args.promote) console.log('action      : promote ' + args.promote);
  if (args.retire) console.log('action      : retire ' + args.retire);

  if (args.dryRun) {
    // Keyless/DB-less: never construct a pg Pool on this path (mirrors
    // kb-generate.mjs). Describe the plan instead of executing it.
    console.log('\nDRY-RUN: would query question_bank for status=\'verified\'' +
      (args.concept ? ' AND concept=\'' + args.concept + '\'' : '') + ', limited to ' + args.limit + ' rows.');
    if (args.auto) {
      console.log('DRY-RUN: would group verified rows by concept, and for any concept with >= ' +
        AUTO_MIN_VERIFIED + ' verified rows' + (AUTO_REQUIRE_MATCH ? ' having verification.match === true' : '') +
        ', flip all of that concept\'s qualifying verified rows to \'live\' (up to ' + args.limit + ' total).');
    }
    if (args.promote) console.log('DRY-RUN: would UPDATE question_bank SET status=\'live\' WHERE id=\'' + args.promote + '\' AND status=\'verified\'.');
    if (args.retire) console.log('DRY-RUN: would UPDATE question_bank SET status=\'retired\' WHERE id=\'' + args.retire + '\'.');
    console.log('\nDRY-RUN complete — no network, no DB connection, no writes.');
    return;
  }

  // LIVE: only now does the script touch Postgres (dynamic import so dry-run
  // never constructs a pg Pool, exactly like kb-generate.mjs).
  const { pool } = await import('../lib/db.js');

  try {
    if (args.promote) {
      const r = await pool.query(
        `UPDATE question_bank SET status = 'live' WHERE id = $1 AND status = 'verified' RETURNING id, concept`,
        [args.promote]
      );
      if (r.rowCount === 0) console.log('no verified row with id=' + args.promote + ' (already promoted, retired, or unknown id)');
      else console.log('promoted ' + r.rows[0].id + ' (concept=' + r.rows[0].concept + ') to live');
      return;
    }

    if (args.retire) {
      const r = await pool.query(
        `UPDATE question_bank SET status = 'retired' WHERE id = $1 AND status != 'retired' RETURNING id, concept`,
        [args.retire]
      );
      if (r.rowCount === 0) console.log('no row with id=' + args.retire + ' to retire (unknown id or already retired)');
      else console.log('retired ' + r.rows[0].id + ' (concept=' + r.rows[0].concept + ')');
      return;
    }

    // Fetch verified rows (optionally scoped to one concept) for --list / --auto.
    const params = [];
    let where = `status = 'verified'`;
    if (args.concept) { params.push(args.concept); where += ` AND concept = $${params.length}`; }
    params.push(args.limit);
    const { rows } = await pool.query(
      `SELECT id, concept, lesson_id, spec, qtype, status, source, verification, created_at
         FROM question_bank WHERE ${where}
         ORDER BY created_at DESC LIMIT $${params.length}`,
      params
    );

    if (!args.auto) {
      console.log('\nVERIFIED items (' + rows.length + '):');
      for (const row of rows) printRow(row);
      if (!rows.length) console.log('  (none — nothing pending review)');
      console.log('\nPromote one with: npm run kb:promote -- --promote=<id>');
      console.log('Retire one with:  npm run kb:promote -- --retire=<id>');
      return;
    }

    // AUTO-PROMOTE: group by concept, count qualifying rows, promote whole
    // concepts that clear the threshold — up to `limit` total rows this run.
    const byConcept = new Map();
    for (const row of rows) {
      if (!byConcept.has(row.concept)) byConcept.set(row.concept, []);
      byConcept.get(row.concept).push(row);
    }

    let promoted = 0;
    for (const [concept, conceptRows] of byConcept) {
      const qualifying = AUTO_REQUIRE_MATCH ? conceptRows.filter(verificationMatches) : conceptRows;
      if (qualifying.length < AUTO_MIN_VERIFIED) {
        console.log('  ' + concept + ': ' + qualifying.length + '/' + AUTO_MIN_VERIFIED + ' qualifying verified — not yet eligible');
        continue;
      }
      let promotedForConcept = 0;
      for (const row of qualifying) {
        if (promoted >= args.limit) break;
        const r = await pool.query(
          `UPDATE question_bank SET status = 'live' WHERE id = $1 AND status = 'verified' RETURNING id`,
          [row.id]
        );
        if (r.rowCount) { promoted++; promotedForConcept++; }
      }
      console.log('  ' + concept + ': eligible (' + qualifying.length + ' qualifying) — promoted ' + promotedForConcept + ' this run');
      if (promoted >= args.limit) break;
    }
    console.log('\nDONE — auto-promoted ' + promoted + ' item(s) to live.');
  } finally {
    if (pool.end) await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
