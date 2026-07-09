/* ================================================================
   PRACTICE SELECTION POLICY — the personalized-drill scorer
   (docs/KNOWLEDGE-BASE-PLAN.md §9, PR 6).
   ----------------------------------------------------------------
   The headline feature's brain: given the learner's cross-curriculum
   concept_accuracy (the durable "what did I get wrong everywhere" signal
   from PR 2's view) and the live question bank, pick which concepts to
   drill and emit a mixed list of question DESCRIPTORS (not rendered HTML —
   the engine stays the single renderer, §7).

   PURE + UNIT-TESTED, mirroring buildReviewQueue()'s style in engine.js:
   every input (clock, rng, weights, the concept-accuracy rows, and the
   registry/lesson/generator/bank resolvers) is injected, so the whole
   policy runs headlessly against synthetic fakes with no DB, no network,
   and no DOM (see test/practice.test.mjs).

       score(concept) = miss_weight   × recent_miss_rate      (concept_accuracy)
                      + staleness      × days_since_last_seen  (spaced repetition)
                      + coverage_bias  × never_practiced       (breadth)

   Top-K weakest concepts, each contributing a small mix of descriptors
   (a `ref` from a lesson that teaches it, a `template` generator variant,
   and a `bank` item when live rows exist), interleaved by world, with a
   ~20% sprinkle of already-strong concepts so it isn't pure-weakness
   grinding.
   ================================================================ */

// All tunables have defaults here so the pure function is self-contained for
// tests; the route feeds the real values from SCORING.practice (registry.js).
export const PRACTICE_DEFAULTS = {
  concepts: 6,            // how many concepts to target per session
  perConcept: 3,          // max descriptors drawn per concept (ref/template/bank)
  size: 9,                // hard cap on total descriptors returned
  threshold: 0.8,         // accuracy at/above this ⇒ "strong" (sprinkle pool)
  sprinkleShare: 0.2,     // ~20% of targeted concepts come from the strong pool
  maxStaleDays: 30,       // staleness contribution saturates here
  weights: { miss: 100, staleness: 1, coverage: 40 },
};

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

// Normalize a last_seen value (PG Date object, ISO string, or ms number) to ms.
function toMs(v) {
  if (v == null) return 0;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}

// score a single concept-accuracy row. Never-practiced concepts (attempts 0,
// as the route appends for registry concepts absent from the view) get the
// full miss weight + coverage bias so breadth is represented.
export function scoreConcept(row, opts = {}) {
  const o = { ...PRACTICE_DEFAULTS, ...opts, weights: { ...PRACTICE_DEFAULTS.weights, ...(opts.weights || {}) } };
  const now = typeof o.now === 'function' ? o.now() : (o.now || Date.now());
  const attempts = Number(row.attempts) || 0;
  const acc = attempts ? clamp01(row.accuracy == null ? 1 : Number(row.accuracy)) : 0;
  const missRate = attempts ? 1 - acc : 1;             // unseen ⇒ maximal
  const lastMs = toMs(row.last_seen);
  const daysSince = lastMs ? (now - lastMs) / 864e5 : o.maxStaleDays;
  const neverPracticed = attempts ? 0 : 1;
  return o.weights.miss * missRate
    + o.weights.staleness * Math.min(Math.max(daysSince, 0), o.maxStaleDays)
    + o.weights.coverage * neverPracticed;
}

// A concept counts as "weak" (worth drilling) when it's never been practiced or
// its accuracy sits below the mastery threshold; otherwise it's "strong" and
// only enters via the sprinkle.
function isWeak(row, threshold) {
  const attempts = Number(row.attempts) || 0;
  if (!attempts) return true;
  return clamp01(Number(row.accuracy == null ? 1 : row.accuracy)) < threshold;
}

// Interleave so consecutive items favor different worlds (interleaving is a
// known retention win). Greedy: repeatedly emit from the world that isn't the
// previous one and has the most remaining. Pure; identical to the daily-review
// interleaver so engine.js imports THIS one (single source of truth).
export function interleaveByWorld(items, rng) {
  rng = rng || Math.random;
  const byWorld = {};
  for (const it of items) { (byWorld[it.world] ||= []).push(it); }
  const out = [];
  let prev = null;
  const remaining = () => Object.keys(byWorld).filter(w => byWorld[w].length);
  while (out.length < items.length) {
    const worlds = remaining();
    const others = worlds.filter(w => w !== prev);
    const pickFrom = others.length ? others : worlds;
    pickFrom.sort((a, b) => byWorld[b].length - byWorld[a].length || (rng() - 0.5));
    const w = pickFrom[0];
    out.push(byWorld[w].shift());
    prev = w;
  }
  return out;
}

// Build the mix of descriptors for one concept from the resolvers. Priority
// bank → template → ref (richest first), capped at perConcept, each stamped
// with its concept + world so telemetry and interleaving have what they need.
// Descriptor shapes are exactly §7:
//   { kind:'ref',      lessonId, qi }
//   { kind:'template', generator, seed }
//   { kind:'bank',     id, spec }
function mixFor(slug, world, resolve, rng, perConcept) {
  const out = [];
  const bank = (resolve.bankFor && resolve.bankFor(slug)) || [];
  const gens = (resolve.generatorsFor && resolve.generatorsFor(slug)) || [];
  const refs = (resolve.refsFor && resolve.refsFor(slug)) || [];
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  if (bank.length) {
    const b = pick(bank);
    out.push({ kind: 'bank', id: b.id, spec: b.spec, concept: slug, world });
  }
  if (gens.length) {
    const g = pick(gens);
    // seed is logged into the replayable question_key ('gen:<id>:<seed>'), so a
    // uint32 derived from the injected rng keeps the whole policy deterministic.
    const seed = Math.floor(rng() * 0xffffffff) >>> 0;
    out.push({ kind: 'template', generator: g, seed, concept: slug, world });
  }
  if (refs.length) {
    const r = pick(refs);
    out.push({ kind: 'ref', lessonId: r.lessonId, qi: r.qi, concept: slug, world });
  }
  return out.slice(0, perConcept);
}

/**
 * buildPracticeQueue — the §9 policy, pure over its inputs.
 *
 * @param {object}   args
 * @param {object[]} args.concepts   concept_accuracy-shaped rows
 *   { tag, accuracy, attempts, misses, last_seen }. The route appends
 *   registry concepts absent from the view as {tag, attempts:0} so breadth
 *   (coverage bias) is represented.
 * @param {object}   args.resolve    registry/content resolvers:
 *   { worldOf(slug)->world, refsFor(slug)->[{lessonId,qi}],
 *     generatorsFor(slug)->[generatorId], bankFor(slug)->[{id,spec}] }
 * @param {object}  [args.opts]      overrides for PRACTICE_DEFAULTS
 *   (+ now: ()=>ms, rng: ()=>[0,1)).
 * @returns {object[]} interleaved descriptor list (≤ opts.size).
 */
export function buildPracticeQueue({ concepts = [], resolve = {}, opts = {} } = {}) {
  const o = {
    ...PRACTICE_DEFAULTS, ...opts,
    weights: { ...PRACTICE_DEFAULTS.weights, ...(opts.weights || {}) },
  };
  const rng = o.rng || Math.random;
  const worldOf = resolve.worldOf || (() => undefined);

  // Score every candidate, dropping concepts whose world can't be resolved
  // (unknown slug — can't interleave or serve it).
  const scored = concepts
    .map(row => ({ row, slug: row.tag, world: worldOf(row.tag), score: scoreConcept(row, o), weak: isWeak(row, o.threshold) }))
    .filter(c => c.slug && c.world)
    .sort((a, b) => b.score - a.score);

  const weak = scored.filter(c => c.weak);
  const strong = scored.filter(c => !c.weak);

  // Mostly weak, with a ~sprinkleShare tail of already-strong (stalest-first,
  // since strong concepts are ranked by staleness) so it isn't pure grinding.
  const nStrong = Math.min(strong.length, Math.round(o.concepts * o.sprinkleShare));
  const nWeak = o.concepts - nStrong;
  const chosen = [
    ...weak.slice(0, nWeak),
    ...strong.slice(0, nStrong),
  ];
  // Backfill if one pool ran dry, so a session is never thinner than it needs.
  if (chosen.length < o.concepts) {
    for (const c of [...weak.slice(nWeak), ...strong.slice(nStrong)]) {
      if (chosen.length >= o.concepts) break;
      chosen.push(c);
    }
  }

  // Expand each chosen concept into its descriptor mix, then interleave + cap.
  const descriptors = [];
  for (const c of chosen) {
    for (const d of mixFor(c.slug, c.world, resolve, rng, o.perConcept)) descriptors.push(d);
  }
  return interleaveByWorld(descriptors, rng).slice(0, o.size);
}
