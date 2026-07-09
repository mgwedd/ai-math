/* GET /api/kb/concept/[slug] — concept enrichment bundle
   (docs/KNOWLEDGE-BASE-PLAN.md §5, PR 3).
   ----------------------------------------------------------------
   Auth-gated (same pattern as the other routes: getAuthUser + coarse codes).
   The slug is looked up in the concept REGISTRY — a 404 for anything not
   registered — so users can only ever enrich real concepts; there is NO
   free-form proxying of arbitrary Wikipedia/Wolfram queries (§10).

   Graceful degradation is a hard requirement: with no WOLFRAM_APP_ID, an
   upstream failure, or a cache/DB hiccup, the route still returns 200 with the
   registry-derived `related` list (and Wikipedia summary when reachable) —
   never a 500 for missing enrichment.

   Per-user daily rate cap (PR 7, docs/KNOWLEDGE-BASE-PLAN.md §10): a durable,
   generous cap on how many enrichment lookups one user can trigger per day
   (lib/kb/rate-limit.js). Over-cap => 429 with a coarse `code`. FAILS OPEN: a
   rate-limiter infra error (usage table not migrated, DB hiccup) never blocks
   the request — enrichment stays additive even when its own guardrail breaks. */
import { NextResponse } from 'next/server';
import { logRouteError } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import { getConcept } from '@/lib/curriculum/concepts.js';
import { buildConceptBundle, buildRelated } from '@/lib/kb/index.js';
import { checkRateLimit } from '@/lib/kb/rate-limit.js';

const SLUG_RE = /^[a-z0-9-]{1,64}$/;

export async function GET(_req, { params }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { slug } = await params; // Next 15: params is async
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'invalid concept slug' }, { status: 400 });
  }

  const concept = getConcept(slug);
  if (!concept) return NextResponse.json({ error: 'unknown concept' }, { status: 404 });

  const rl = await checkRateLimit({
    userId: user.id,
    route: 'kb-concept',
    onError: (e) => logRouteError('/api/kb/concept', 'GET', user.id, e),
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'daily enrichment limit reached', code: 'RATE_LIMIT' }, { status: 429 });
  }

  try {
    const bundle = await buildConceptBundle(concept);
    return NextResponse.json(bundle);
  } catch (e) {
    // buildConceptBundle already swallows upstream/cache failures; reaching
    // here means something unexpected. Degrade to the keyless bundle rather
    // than 500 — enrichment is always additive.
    logRouteError('/api/kb/concept', 'GET', user.id, e);
    return NextResponse.json({ related: buildRelated(concept), attribution: {} });
  }
}
