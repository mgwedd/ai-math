/* GET /api/practice — personalized drill set (PR 6, docs/KNOWLEDGE-BASE-PLAN.md
   §7 + §9).
   ----------------------------------------------------------------
   Auth-gated (same pattern as the other routes: getAuthUser + pool +
   logRouteError + coarse codes). Runs the §9 selection policy — a PURE,
   unit-tested function (lib/practice/selection.js) — over the learner's
   concept_accuracy (PR 2's cross-curriculum weak-signal view) plus the LIVE
   question bank, and returns a mixed list of question DESCRIPTORS, never
   rendered HTML (§7 — the engine stays the single renderer):

     { kind:'ref',      lessonId, qi }        // static-pool question
     { kind:'template', generator, seed }     // client-side seeded generation
     { kind:'bank',     id, spec }            // LLM-generated, verified, LIVE

   Only status='live' bank rows are ever served. Degrades gracefully: if the
   bank query fails (e.g. table not migrated yet), practice still serves
   ref+template descriptors — the static curriculum is untouched.

   Per-user daily rate cap (PR 7, docs/KNOWLEDGE-BASE-PLAN.md §10): practice
   sets are cheap to compute but still bounded per user per day
   (lib/kb/rate-limit.js). Over-cap => 429. FAILS OPEN: a rate-limiter infra
   error never blocks a practice request. */
import { NextResponse } from 'next/server';
import { pool, logRouteError } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import { SCORING, LESSONS } from '@/lib/curriculum/registry.js';
import '@/lib/curriculum/index.js'; // side-effect: register every lesson into LESSONS
import { CONCEPTS, getConcept, resolveTag } from '@/lib/curriculum/concepts.js';
import { GENERATORS } from '@/lib/curriculum/generators/index.js';
import { buildPracticeQueue } from '@/lib/practice/selection.js';
import { checkRateLimit } from '@/lib/kb/rate-limit.js';

// Lesson refs (lessonId:qi) that teach a given concept, resolved through the
// canonical tag registry. Memoized once per process — the curriculum is static.
let REFS_BY_CONCEPT = null;
function refsByConcept() {
  if (REFS_BY_CONCEPT) return REFS_BY_CONCEPT;
  const map = new Map();
  for (const l of LESSONS) {
    const quiz = Array.isArray(l.quiz) ? l.quiz : [];
    for (let qi = 0; qi < quiz.length; qi++) {
      const c = quiz[qi] && quiz[qi].tag && resolveTag(quiz[qi].tag);
      if (!c) continue;
      if (!map.has(c.id)) map.set(c.id, []);
      map.get(c.id).push({ lessonId: l.id, qi });
    }
  }
  REFS_BY_CONCEPT = map;
  return map;
}

// Generator ids grouped by the concept slug they drill (from the PR 5 registry).
let GENS_BY_CONCEPT = null;
function gensByConcept() {
  if (GENS_BY_CONCEPT) return GENS_BY_CONCEPT;
  const map = new Map();
  for (const g of GENERATORS.values()) {
    if (!map.has(g.concept)) map.set(g.concept, []);
    map.get(g.concept).push(g.id);
  }
  GENS_BY_CONCEPT = map;
  return map;
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rl = await checkRateLimit({
    userId: user.id,
    route: 'practice',
    onError: (e) => logRouteError('/api/practice', 'GET', user.id, e),
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'daily practice limit reached', code: 'RATE_LIMIT' }, { status: 429 });
  }

  try {
    // The learner's per-concept accuracy (PR 2 view). Weakest first is not
    // required — the policy scores independently — but keeps the query cheap.
    const acc = await pool.query(
      `SELECT tag, accuracy, attempts, misses, last_seen FROM concept_accuracy
       WHERE user_id = $1`,
      [user.id]
    );

    // LIVE bank rows grouped by concept. Best-effort: a failure here (table not
    // yet migrated, or empty) simply means practice serves ref+template only.
    const bankByConcept = new Map();
    try {
      const bank = await pool.query(
        `SELECT id, concept, spec FROM question_bank WHERE status = 'live'`
      );
      for (const row of bank.rows) {
        if (!bankByConcept.has(row.concept)) bankByConcept.set(row.concept, []);
        bankByConcept.get(row.concept).push({ id: row.id, spec: row.spec });
      }
    } catch (e) {
      logRouteError('/api/practice', 'GET(bank)', user.id, e);
    }

    // Seed the candidate set with the accuracy rows, then append every
    // registry concept the learner has NEVER answered (attempts 0) so the
    // coverage bias can surface un-drilled areas.
    const seen = new Set();
    const candidates = [];
    for (const row of acc.rows) {
      if (!getConcept(row.tag)) continue; // ignore stale/legacy tags
      seen.add(row.tag);
      candidates.push(row);
    }
    for (const slug of CONCEPTS.keys()) {
      if (!seen.has(slug)) candidates.push({ tag: slug, accuracy: null, attempts: 0, misses: 0, last_seen: null });
    }

    const resolve = {
      worldOf: (slug) => { const c = getConcept(slug); return c && c.world; },
      refsFor: (slug) => refsByConcept().get(slug) || [],
      generatorsFor: (slug) => gensByConcept().get(slug) || [],
      bankFor: (slug) => bankByConcept.get(slug) || [],
    };

    const s = SCORING.practice || {};
    const practice = buildPracticeQueue({
      concepts: candidates,
      resolve,
      opts: {
        concepts: s.concepts, perConcept: s.perConcept, size: s.size,
        threshold: s.threshold, sprinkleShare: s.sprinkleShare,
        maxStaleDays: s.maxStaleDays, weights: s.weights,
      },
    });

    return NextResponse.json({ practice });
  } catch (e) {
    const code = logRouteError('/api/practice', 'GET', user.id, e);
    return NextResponse.json({ error: 'internal error', code }, { status: 500 });
  }
}
