#!/usr/bin/env node
/* ================================================================
   kb:generate — batch LLM→Wolfram question-generation pipeline
   (docs/KNOWLEDGE-BASE-PLAN.md §8, PR 6).
   ----------------------------------------------------------------
   The maintainer-run job that fills the verified question_bank. Stages:

     1. TARGET SELECTION  global miss-rate (quiz_answers across all users)
                          + a coverage floor (concepts with < N live items).
     2. RESEARCH          the concept's Wikipedia summary (PR 3 adapter) +
                          the registry entry + 2–3 exemplar questions from
                          the static pool (with their `wrong` rationales —
                          the style guide is the curriculum itself).
     3. GENERATE          Claude authors N candidates in the EXACT engine
                          question schema, each with a `wolfram_check`
                          {query, answer}.
     4. SCHEMA GATE       reuse the shared questionProblems() validator.
     5. WOLFRAM GATE      recompute wolfram_check.query via the PR 3 adapter;
                          require a match with the claimed answer.
     6. DEDUP             reject near-duplicates (normalized stem) of the
                          static pool + existing bank rows.
     7. STORE             insert as status='verified' with the verification
                          payload. Promotion to 'live' is a separate flip.

   KEYLESS DRY-RUN: `--dry-run` runs the WHOLE plan with NO API keys and NO
   network — it prints the target list and the exact per-concept Claude
   prompts/plans to stdout, then stops before any live call. ALL network is
   guarded behind key presence (ANTHROPIC_API_KEY / WOLFRAM_APP_ID) and the
   --dry-run flag, so this is safe to run in CI / a keyless dev box. The
   Anthropic SDK is imported LAZILY (dynamic import) only on the live path, so
   neither the app nor the test suite ever require it at runtime.

   Usage:
     npm run kb:generate -- --dry-run                 # keyless plan + prompts
     npm run kb:generate -- --dry-run --concept=dot-product
     npm run kb:generate -- --count=8 --limit=10      # LIVE (needs keys + DB)
   ================================================================ */
import { CONCEPTS, getConcept, resolveTag } from '../lib/curriculum/concepts.js';
import { LESSONS, questionProblems } from '../lib/curriculum/registry.js';
import '../lib/curriculum/index.js'; // side-effect: populate LESSONS
import { wolfram } from '../lib/kb/sources/wolfram.js';
import { wikipedia } from '../lib/kb/sources/wikipedia.js';

// Generation model is configurable so the pipeline can be tuned for cost vs.
// quality without a code change; defaults to a current mid-tier Claude.
const MODEL = process.env.KB_GENERATE_MODEL || 'claude-sonnet-5';
const COVERAGE_FLOOR = 10;       // concepts with < this many live bank items are eligible

/* ---------- arg parsing ---------- */
function parseArgs(argv) {
  const args = { dryRun: false, count: 6, limit: 8, concept: null };
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a.startsWith('--count=')) args.count = Math.max(1, parseInt(a.slice(8), 10) || 6);
    else if (a.startsWith('--limit=')) args.limit = Math.max(1, parseInt(a.slice(8), 10) || 8);
    else if (a.startsWith('--concept=')) args.concept = a.slice(10);
  }
  return args;
}

/* ---------- research helpers (pure over the registry) ---------- */
// Up to `n` exemplar questions from the static pool that teach this concept —
// full objects incl. their `wrong` rationales (the quality bar the LLM copies).
function exemplarsFor(slug, n = 3) {
  const out = [];
  for (const l of LESSONS) {
    for (const q of (Array.isArray(l.quiz) ? l.quiz : [])) {
      const c = q && q.tag && resolveTag(q.tag);
      if (c && c.id === slug) { out.push(q); if (out.length >= n) return out; }
    }
  }
  return out;
}

// normalized stem for dedup: strip tags/markup, lowercase, collapse whitespace.
function normStem(q) {
  return String((q && q.q) || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\\[()[\]]/g, ' ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim().toLowerCase();
}

/* ---------- prompt construction ---------- */
function buildPrompt(concept, research, count) {
  const system =
    'You are a mathematics assessment author for Minima, an AI-math learning app. ' +
    'You write quiz questions in a STRICT JSON schema. You NEVER assert a numeric or symbolic ' +
    'answer you are not certain of — every question must carry a `wolfram_check` whose `query` a ' +
    'computer-algebra system can evaluate to confirm the correct answer. Match the pedagogical ' +
    'style of the provided exemplars: plausible distractors, and for multiple-choice a full `wrong` ' +
    'map explaining the misconception behind each wrong option.';

  const schema =
    'Return ONLY a JSON array of ' + count + ' question objects. Each object is one of:\n' +
    '  mc:      {"type":"mc","q":"<html>","opts":["a","b","c","d"],"a":<correctIndex>,' +
    '"why":"<html>","wrong":{"<idx>":"<html>"},"tag":"' + concept.id + '","focus":"<one sentence>",' +
    '"wolfram_check":{"query":"<CAS query>","answer":<number|string>}}\n' +
    '  numeric: {"type":"numeric","q":"<html>","answer":<number>,"tol":<number>,"why":"<html>",' +
    '"tag":"' + concept.id + '","focus":"<one sentence>","wolfram_check":{"query":"<CAS query>","answer":<number>}}\n' +
    '  order:   {"type":"order","q":"<html>","steps":["<step1>",...],"why":"<html>",' +
    '"tag":"' + concept.id + '","focus":"<one sentence>"}\n' +
    'For mc: exactly 4 options, `a` is the 0-based correct index, and `wrong` has an entry for EVERY ' +
    'non-correct option index (never the correct one). Phrase mc `wolfram_check.query` so the CAS ' +
    'confirms the CORRECT option. Drop any question whose answer a CAS cannot verify.';

  const summary = research.summary
    ? 'Wikipedia summary:\n' + research.summary + '\n\n'
    : '';
  const prereqs = (concept.prereqs && concept.prereqs.length)
    ? 'Prerequisite concepts: ' + concept.prereqs.join(', ') + '\n'
    : '';
  const exemplars = research.exemplars.length
    ? 'Exemplar questions (match this style/quality):\n' +
      research.exemplars.map((q, i) => (i + 1) + '. ' + JSON.stringify(q)).join('\n') + '\n\n'
    : '';

  const user =
    'Concept: "' + concept.title + '" (slug: ' + concept.id + ', world: ' + concept.world + ')\n' +
    prereqs + '\n' + summary + exemplars +
    'Author ' + count + ' NEW, distinct questions drilling this concept.\n\n' + schema;

  return { system, user };
}

/* ---------- stage 1: target selection ---------- */
// LIVE: concepts ranked by global miss volume, plus any below the coverage
// floor. DRY-RUN: no DB — target the --concept, else concepts that have a
// Wolfram seed (the checkable ones), capped at `limit`.
async function selectTargets(args, db) {
  if (args.concept) {
    const c = getConcept(args.concept);
    if (!c) { console.error('unknown concept slug: ' + args.concept); process.exit(1); }
    return [c.id];
  }
  if (args.dryRun || !db) {
    return [...CONCEPTS.values()].filter(c => c.wolfram).map(c => c.id).slice(0, args.limit);
  }
  // global miss-rate across all users (the concept appears wherever it's tagged)
  const miss = await db.query(
    `SELECT tag, count(*) FILTER (WHERE NOT correct) AS misses, count(*) AS attempts
       FROM quiz_answers WHERE tag IS NOT NULL GROUP BY tag
       ORDER BY (count(*) FILTER (WHERE NOT correct))::float DESC`
  );
  const cover = await db.query(
    `SELECT concept, count(*) AS live FROM question_bank WHERE status='live' GROUP BY concept`
  );
  const liveByConcept = new Map(cover.rows.map(r => [r.concept, Number(r.live)]));
  const ranked = miss.rows.map(r => r.tag).filter(t => getConcept(t));
  const belowFloor = [...CONCEPTS.keys()].filter(id => (liveByConcept.get(id) || 0) < COVERAGE_FLOOR);
  // union: miss-ranked first, then any coverage-floor concept not already present
  const seen = new Set();
  const targets = [];
  for (const id of [...ranked, ...belowFloor]) {
    if (getConcept(id) && !seen.has(id)) { seen.add(id); targets.push(id); }
    if (targets.length >= args.limit) break;
  }
  return targets;
}

/* ---------- stage 2: research ---------- */
async function research(concept, args) {
  const exemplars = exemplarsFor(concept.id);
  let summary = null;
  // network guarded: only fetch a live summary off the dry-run path.
  if (!args.dryRun) {
    try {
      const wiki = await wikipedia.fetch(wikipedia.queryKey(concept), {});
      summary = wiki && wiki.summary ? wiki.summary : null;
    } catch { /* research is best-effort; generation proceeds without it */ }
  }
  return { exemplars, summary };
}

/* ---------- stage 3: generate (LIVE ONLY — lazy SDK import) ---------- */
async function generateCandidates(prompt, _count) {
  // Dynamic import so neither the app nor the test suite ever require the SDK.
  let Anthropic;
  try { ({ default: Anthropic } = await import('@anthropic-ai/sdk')); }
  catch { throw new Error('@anthropic-ai/sdk not installed — run `npm i -D @anthropic-ai/sdk` for live generation'); }
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    system: prompt.system,
    messages: [{ role: 'user', content: prompt.user }],
  });
  const text = (res.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return parseCandidates(text);
}

// tolerant JSON extraction: pull the first top-level [...] array from the reply.
function parseCandidates(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) return [];
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

/* ---------- stage 4: schema gate ---------- */
function schemaOk(candidate) {
  // strip the pipeline-only field before the shared validator sees it
  const { wolfram_check: _wolfram_check, ...q } = candidate;
  return questionProblems(q).length === 0;
}

/* ---------- stage 5: Wolfram verify gate (LIVE ONLY) ---------- */
// Extract the first finite number from the Wolfram pods (primary pod first).
function numberFromPods(pods) {
  const flat = [];
  for (const p of (pods || [])) {
    for (const s of (p.subpods || [])) if (s.plaintext) flat.push({ primary: p.primary, text: s.plaintext });
  }
  flat.sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));
  for (const f of flat) {
    const m = f.text.match(/-?\d+(?:\.\d+)?/);
    if (m) return Number(m[0]);
  }
  return null;
}

async function wolframOk(candidate, appId) {
  const check = candidate.wolfram_check;
  if (!check || !check.query) return { match: false, reason: 'no wolfram_check' };
  const payload = await wolfram.fetch(check.query, { appId });
  const got = numberFromPods(payload.pods);
  const want = Number(check.answer);
  if (got == null || !Number.isFinite(want)) return { match: false, reason: 'unparseable', got };
  const tol = Math.max(1e-6, Math.abs(want) * 1e-3);
  const match = Math.abs(got - want) <= tol;
  return {
    match, got,
    verification: { wolfram_query: check.query, wolfram_answer: got, claimed: want, checked_at: new Date().toISOString(), match },
  };
}

/* ---------- stage 6: dedup ---------- */
function makeDedup(existingStems) {
  const seen = new Set(existingStems);
  return (q) => {
    const s = normStem(q);
    if (!s || seen.has(s)) return false;
    seen.add(s);
    return true;
  };
}

/* ---------- orchestration ---------- */
async function main() {
  const args = parseArgs(process.argv);
  const haveAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const haveWolfram = !!process.env.WOLFRAM_APP_ID;

  console.log('== kb:generate ==');
  console.log('mode        : ' + (args.dryRun ? 'DRY-RUN (no network, no keys)' : 'LIVE'));
  console.log('model       : ' + MODEL);
  console.log('per concept : ' + args.count + '   concept limit: ' + args.limit);
  console.log('keys        : anthropic=' + haveAnthropic + ' wolfram=' + haveWolfram);

  // DB only on the live path (dynamic import so dry-run constructs no pg Pool).
  let db = null;
  if (!args.dryRun) {
    if (!haveAnthropic) { console.error('\nLIVE run needs ANTHROPIC_API_KEY. Use --dry-run for a keyless plan.'); process.exit(1); }
    ({ pool: db } = await import('../lib/db.js'));
  }

  const targets = await selectTargets(args, db);
  console.log('\nTARGETS (' + targets.length + '): ' + targets.join(', ') + '\n');

  // existing stems for dedup (static pool always; live bank rows when connected)
  const existingStems = LESSONS.flatMap(l => (Array.isArray(l.quiz) ? l.quiz : []).map(normStem)).filter(Boolean);
  if (db) {
    try {
      const rows = await db.query('SELECT spec FROM question_bank');
      for (const r of rows.rows) existingStems.push(normStem(r.spec));
    } catch { /* table may not exist yet */ }
  }
  const isNovel = makeDedup(existingStems);

  let inserted = 0, dropped = 0;
  for (const slug of targets) {
    const concept = getConcept(slug);
    const info = await research(concept, args);
    const prompt = buildPrompt(concept, info, args.count);

    if (args.dryRun) {
      console.log('──────── concept: ' + slug + ' ────────');
      console.log('exemplars drawn : ' + info.exemplars.length);
      console.log('[SYSTEM]\n' + prompt.system + '\n');
      console.log('[USER]\n' + prompt.user + '\n');
      continue;
    }

    // LIVE: generate → schema gate → Wolfram gate → dedup → insert verified.
    let candidates = [];
    try { candidates = await generateCandidates(prompt, args.count); }
    catch (e) { console.error('  ! generation failed for ' + slug + ': ' + e.message); continue; }

    for (const cand of candidates) {
      if (!schemaOk(cand)) { dropped++; continue; }
      const { wolfram_check: _wolfram_check, ...q } = cand;

      // Wolfram gate: mc/numeric must verify; order questions aren't CAS-checkable
      // (template generators cover those shapes) so they're dropped here.
      let verification = null;
      if (q.type === 'order') { dropped++; continue; }
      if (!haveWolfram) { dropped++; continue; }
      try {
        const v = await wolframOk(cand, process.env.WOLFRAM_APP_ID);
        if (!v.match) { dropped++; continue; }
        verification = v.verification;
      } catch { dropped++; continue; }

      if (!isNovel(q)) { dropped++; continue; }

      await db.query(
        `INSERT INTO question_bank (concept, lesson_id, spec, qtype, status, source, verification)
         VALUES ($1, $2, $3, $4, 'verified', $5, $6)`,
        [slug, concept.anchorLesson || null, JSON.stringify(q), q.type || 'mc', 'llm:' + MODEL, JSON.stringify(verification)]
      );
      inserted++;
    }
    console.log('  ' + slug + ': inserted so far ' + inserted + ', dropped ' + dropped);
  }

  if (args.dryRun) {
    console.log('DRY-RUN complete — ' + targets.length + ' concept prompt(s) emitted. No network calls, no DB writes.');
  } else {
    console.log('\nDONE — inserted ' + inserted + ' verified, dropped ' + dropped + '. Promote with a status flip to go live.');
    if (db && db.end) await db.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
