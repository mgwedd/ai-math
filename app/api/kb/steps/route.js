/* POST /api/kb/steps — Wolfram Show-Steps for a missed numeric question
   (docs/KNOWLEDGE-BASE-PLAN.md §5, §10, PR 4).
   ----------------------------------------------------------------
   Auth-gated (same pattern as the other routes: getAuthUser + coarse codes).

   NO FREE-FORM PROXYING (§10): the client sends only a `question_key`
   (`<lessonId>:<qi>`) — an identifier into the curriculum registry, never a
   Wolfram query. The route resolves that key to the question's server-side
   `wolfram` hint and sends THAT to Wolfram. A key that doesn't resolve, or a
   question with no `wolfram` hint, is 404 — users can never steer Wolfram with
   arbitrary text or burn quota on unhinted questions.

   GET /api/kb/steps is a keyless capability probe: `{ available }` reflects
   only whether WOLFRAM_APP_ID is configured (a boolean, never the key). The
   engine uses it to decide whether to surface the "Show the steps" button at
   all, so a keyless deployment stays pixel-identical to today.

   Graceful degradation is a hard requirement: no key / upstream failure / empty
   result all return 200 `{}` — the caller renders nothing. */
import { NextResponse } from 'next/server';
import { logRouteError, readJson } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import { wolframAppId } from '@/lib/kb/sources/wolfram.js';
import { buildStepsBundle } from '@/lib/kb/index.js';
import { checkRateLimit } from '@/lib/kb/rate-limit.js';
// Importing the curriculum index runs its registerLesson() side effects, so
// LESSONS is populated when we resolve a question_key -> `wolfram` hint.
import '@/lib/curriculum/index.js';
import { LESSONS } from '@/lib/curriculum/registry.js';

const QKEY_RE = /^([a-z0-9-]{1,64}):(\d{1,4})$/i;

// Resolve `<lessonId>:<qi>` to the question's registry-side `wolfram` hint.
// Returns the hint string, or null when the key is unknown / the question
// declares no hint (=> not eligible for steps; no arbitrary query is possible).
function hintForQuestionKey(key) {
  const m = typeof key === 'string' ? key.match(QKEY_RE) : null;
  if (!m) return null;
  const lesson = LESSONS.find((l) => l.id === m[1]);
  if (!lesson || !Array.isArray(lesson.quiz)) return null;
  const q = lesson.quiz[Number(m[2])];
  if (!q || typeof q.wolfram !== 'string' || !q.wolfram) return null;
  return q.wolfram;
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  // Capability only — never the key itself.
  return NextResponse.json({ available: !!wolframAppId() });
}

export async function POST(req) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { body, tooLarge } = await readJson(req);
  if (tooLarge) return NextResponse.json({ error: 'payload too large' }, { status: 413 });

  // The ONLY accepted input is a registry identifier. Any `query`/`input` field
  // a client might send is ignored — the query comes from the registry alone.
  const questionKey = body && body.question_key;
  const hint = hintForQuestionKey(questionKey);
  if (!hint) return NextResponse.json({ error: 'no steps for this question' }, { status: 404 });

  // Per-user daily cap on the Wolfram-hitting path (PR 7 pre-wired this once the
  // steps route from PR 4 landed). Fails open on any store error.
  const rl = await checkRateLimit({
    userId: user.id,
    route: 'kb-steps',
    onError: (e) => logRouteError('/api/kb/steps', 'POST', user.id, e),
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'daily steps limit reached', code: 'RATE_LIMIT' }, { status: 429 });
  }

  try {
    const bundle = await buildStepsBundle(hint);
    return NextResponse.json(bundle); // {} when keyless / degraded / empty
  } catch (e) {
    // buildStepsBundle already swallows upstream/cache failures; degrade to {}
    // rather than 500 — steps are always additive.
    logRouteError('/api/kb/steps', 'POST', user.id, e);
    return NextResponse.json({});
  }
}
