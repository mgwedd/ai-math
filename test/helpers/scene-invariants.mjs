/* ================================================================
   Scene Kit — SHARED INVARIANT HELPERS (quality-owned, CONTRACT v1.4 §6).
   ----------------------------------------------------------------
   The two platform invariants every migrated scene's test suite must
   assert, extracted ONCE so lessons don't copy-paste them (v1.4 §6).
   Generic over any registered scene descriptor (the object passed to
   registerScene). Pure + headless — no GPU, no mount required.

     (a) BASELINE-CLEANLINESS — a scene's mounted initial state must
         never pre-credit a goal (the learner may not walk into a
         completed goal). For a randomized capstone this holds across
         ≥1000 reroll seeds: every `randomize(makeRng(seed))` draw is
         itself baseline-clean.  → baselineViolations / assertBaselineClean

     (b) GOAL REACHABILITY — every declared goal must have at least one
         satisfying state reachable by a learner. We SEARCH the scene's
         handle/param space: handle-bound params are auto-discovered from
         the baseline display list (their `constrain` closures map grid
         points onto the manifold the learner actually drags on — circle,
         ray, track), gridded, and every combination is evaluated against
         each goal.  → reachability / unreachableGoals / assertReachable

   WHY BOTH: an auto-completing goal (baseline-dirty) and an impossible
   goal (unreachable) are twin authoring failures; the reference suite
   test/scenes-la-dot.test.mjs proved both classes exist in real content
   (a mid-scene goal true at load; a provably-impossible top-2 goal).

   ----------------------------------------------------------------
   USAGE (a migrated lesson's test file):

     import {
       assertBaselineClean, assertReachable, reachability,
     } from './helpers/scene-invariants.mjs';
     import { scenesForLesson, capstoneFor } from '../lib/curriculum/scenes/index.js';

     for (const scene of scenesForLesson('la-vecops')) {
       it(scene.id + ' is baseline-clean', () => {
         // capstone: 1000 seeds; static scenes: initial params (seeds ignored)
         assertBaselineClean(scene);
       });
       it(scene.id + ' has every goal reachable', () => {
         assertReachable(scene);                 // auto-discovers handle dims
       });
     }

   TIGHT-TOLERANCE goals (e.g. a capstone cos target at ±0.03) a coarse
   grid can miss: hand the search analytic witnesses instead of shrinking
   the step (cheaper, exact) —

     assertReachable(cap, {
       seeds: 50,
       // per base snapshot (a randomize() draw), return states to also try:
       witnesses: (base) => [
         { ...base, b: bForDotTarget(base) },
         { ...base, b: bForCosTarget(base) },
       ],
     });

   EXTRA / SLIDER dims (scalar params — e.g. the v1.4 `slider` control —
   are not handle-bound, so pass them explicitly):

     assertReachable(scene, {
       dims: [{ bind: 'lr', range: [0.01, 1], steps: 40 }],  // merged with auto handle dims
     });

   Every function is deterministic and node-safe; import the kit directly
   (no injection dance) — this file lives under test/ next to its callers.
   ================================================================ */
import { toAtoms, view, snapshot, makeRng } from '../../lib/scene/index.js';
import { normalize as normalizeHandle } from '../../lib/scene/seams/handle.js';

const round3 = (x) => Math.round(x * 1000) / 1000;

/** The scene's mounted initial snapshot {name: rawValue} (no reroll). */
export function initialSnapshot(scene) {
  return snapshot(toAtoms(scene.params || {}));
}

/** Goals array (tolerates a goals-less scene → []). */
function goalsOf(scene) {
  return Array.isArray(scene.goals) ? scene.goals : [];
}

/* ---------------------------------------------------------------- */
/* (a) BASELINE-CLEANLINESS                                          */
/* ---------------------------------------------------------------- */

/**
 * Snapshots that must ALL be baseline-clean for `scene`:
 *  - a randomized capstone: `randomize(makeRng(seed))` for seed 1..seeds
 *    (the initial params ARE the seed-1 draw, so they're covered);
 *  - a static scene: its initial params once (seeds ignored).
 * Each entry is { label, s }.
 */
function baselineStates(scene, seeds) {
  // The actual mounted state is ALWAYS scene.params — check it unconditionally.
  // For a randomized capstone params SHOULD equal randomize(makeRng(1)) (CONTRACT
  // §1), but an author who diverges the two would otherwise ship an unchecked
  // initial state; including it here catches that mistake.
  const out = [{ label: 'initial params', s: initialSnapshot(scene) }];
  if (typeof scene.randomize === 'function') {
    for (let seed = 1; seed <= seeds; seed++) {
      out.push({ label: 'seed ' + seed, s: scene.randomize(makeRng(seed)) });
    }
  }
  return out;
}

/**
 * Every (state, goal) pair where the goal predicate is ALREADY true —
 * i.e. the goal would credit before the learner touches anything.
 * @returns {Array<string>} offender labels, [] when clean.
 */
export function baselineViolations(scene, opts = {}) {
  const seeds = opts.seeds ?? 1000;
  const goals = goalsOf(scene);
  const offenders = [];
  for (const { label, s } of baselineStates(scene, seeds)) {
    goals.forEach((g, i) => {
      if (safePredicate(g, s)) offenders.push(scene.id + ' [' + label + '] #' + i);
    });
  }
  return offenders;
}

/** Throw (with the full offender list) unless the scene is baseline-clean. */
export function assertBaselineClean(scene, opts = {}) {
  const offenders = baselineViolations(scene, opts);
  if (offenders.length) {
    throw new Error(
      'baseline-cleanliness VIOLATED — goal(s) satisfied at initial params:\n  ' +
      offenders.slice(0, 20).join('\n  ') +
      (offenders.length > 20 ? '\n  …and ' + (offenders.length - 20) + ' more' : ''),
    );
  }
  return true;
}

/* ---------------------------------------------------------------- */
/* (b) REACHABILITY — search over handle/param space                */
/* ---------------------------------------------------------------- */

/**
 * Auto-discover the learner-controllable VEC dims from the baseline
 * display list: every entity carrying a `handle` (writes a vec per the
 * HANDLE_KINDS capability table). Each dim is { bind, constrain? } where
 * constrain is the frozen §7 pointer clamp (a `(pt)=>pt` closure, or a
 * string kind we leave as identity — the plane grid already covers it).
 * De-duplicated by bound param; first handle wins.
 */
export function handleDims(scene) {
  let list;
  try { list = scene.entities(view(toAtoms(scene.params || {})), 0); }
  catch { return []; }
  const dims = [];
  for (const e of Array.isArray(list) ? list : []) {
    if (!e || e.handle == null) continue;
    const h = normalizeHandle(e.handle);
    if (!h || dims.some((d) => d.bind === h.bind)) continue;
    dims.push({ bind: h.bind, constrain: typeof h.constrain === 'function' ? h.constrain : null });
  }
  return dims;
}

/** Grid of vec candidates over [lo,hi]², mapped through constrain + deduped. */
function vecCandidates({ lo, hi, step, constrain }) {
  const axis = [];
  for (let v = lo; v <= hi + 1e-9; v += step) axis.push(round3(v));
  const seen = new Set();
  const out = [];
  for (const x of axis) for (const y of axis) {
    let pt = { x, y };
    if (constrain) pt = constrain(pt);
    const key = round3(pt.x) + ',' + round3(pt.y);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pt);
  }
  return out;
}

/** Linspace scalar candidates over [min,max] (for slider / scalar dims). */
function scalarCandidates(range, steps) {
  const [min, max] = range;
  const n = Math.max(1, steps | 0);
  if (n === 1) return [min];
  const out = [];
  for (let i = 0; i <= n; i++) out.push(round3(min + ((max - min) * i) / n));
  return out;
}

/** Materialize candidate values for one dim (vec or scalar). */
function dimCandidates(dim, grid) {
  if (dim.range) return scalarCandidates(dim.range, dim.steps ?? 40);
  if (dim.values) return dim.values;
  return vecCandidates({ lo: grid.lo, hi: grid.hi, step: dim.step ?? grid.step, constrain: dim.constrain });
}

function safePredicate(g, s) {
  // A predicate that throws on a candidate is NOT a satisfying state.
  try { return g.predicate(s) === true; } catch { return false; }
}

/**
 * REACHABILITY search. For each base state (a randomize() draw per seed,
 * or the initial snapshot for a static scene), grid-search the product of
 * the scene's dims and mark which goals become satisfiable; optionally
 * also test caller-supplied analytic witnesses. A goal counts as reachable
 * only if reachable for EVERY base state tested (so a capstone target must
 * be reachable for every seed, not just one lucky draw).
 *
 * @param {object} scene   a registerScene descriptor
 * @param {object} [opts]
 *   dims       extra dims merged with auto-discovered handle dims:
 *              {bind, range:[min,max], steps?} scalar, or {bind, constrain?, step?} vec,
 *              or {bind, values:[...]} explicit.
 *   lo,hi,step grid box + resolution for vec dims (default -4, 4, 0.5)
 *   seeds      randomized capstone: number of seeds (default 8) or an
 *              explicit array of seeds. Ignored for a static scene.
 *   witnesses  (base) => snapshot[]: extra full states to test per base.
 *   maxCombos  guard against a combinatorial blowup (default 2_000_000);
 *              exceeding it THROWS (pick a coarser step or use witnesses)
 *              rather than silently searching a partial space.
 * @returns {{ met: boolean[], goals: number, dims: string[] }}
 */
export function reachability(scene, opts = {}) {
  const goals = goalsOf(scene);
  const grid = { lo: opts.lo ?? -4, hi: opts.hi ?? 4, step: opts.step ?? 0.5 };
  const dims = [...handleDims(scene), ...(opts.dims || [])];
  // dedupe explicit dims that shadow an auto dim (explicit wins).
  const byBind = new Map();
  for (const d of dims) byBind.set(d.bind, d);
  const finalDims = [...byBind.values()];

  const candLists = finalDims.map((d) => ({ bind: d.bind, values: dimCandidates(d, grid) }));
  const combos = candLists.reduce((n, c) => n * Math.max(1, c.values.length), 1);
  const bases = randomizeBases(scene, opts.seeds ?? 8);
  const maxCombos = opts.maxCombos ?? 2_000_000;
  if (combos * bases.length > maxCombos) {
    throw new Error(
      'reachability search space ' + combos + '×' + bases.length + ' bases exceeds maxCombos ' +
      maxCombos + ' (' + scene.id + ') — coarsen `step`, narrow dims, or supply `witnesses`.',
    );
  }

  const met = goals.map(() => true); // AND across bases: start true, clear on any base that fails
  for (const base of bases) {
    const hit = goals.map(() => false);
    // caller witnesses first (cheap, exact)
    if (typeof opts.witnesses === 'function') {
      for (const st of opts.witnesses(base) || []) {
        goals.forEach((g, i) => { if (!hit[i] && safePredicate(g, st)) hit[i] = true; });
      }
    }
    // then the product grid search
    const rec = (k, s) => {
      if (hit.every(Boolean)) return;               // early out — all goals hit for this base
      if (k === candLists.length) {
        goals.forEach((g, i) => { if (!hit[i] && safePredicate(g, s)) hit[i] = true; });
        return;
      }
      const { bind, values } = candLists[k];
      for (const val of values) {
        rec(k + 1, { ...s, [bind]: val });
        if (hit.every(Boolean)) return;
      }
    };
    rec(0, { ...base });
    met.forEach((_, i) => { if (!hit[i]) met[i] = false; });
  }
  return { met, goals: goals.length, dims: finalDims.map((d) => d.bind) };
}

/** Base states to search from: a randomize() draw per seed, or the initial snapshot. */
function randomizeBases(scene, seedsOpt) {
  if (typeof scene.randomize !== 'function') return [initialSnapshot(scene)];
  const seeds = Array.isArray(seedsOpt)
    ? seedsOpt
    : Array.from({ length: seedsOpt }, (_, i) => i + 1);
  return seeds.map((seed) => scene.randomize(makeRng(seed)));
}

/** Goals with NO reachable satisfying state — [{ index, text }]. [] = all reachable. */
export function unreachableGoals(scene, opts = {}) {
  const { met } = reachability(scene, opts);
  const goals = goalsOf(scene);
  const out = [];
  met.forEach((ok, i) => { if (!ok) out.push({ index: i, text: goals[i]?.text ?? '' }); });
  return out;
}

/** Throw (naming the unreachable goals) unless every goal is reachable. */
export function assertReachable(scene, opts = {}) {
  const bad = unreachableGoals(scene, opts);
  if (bad.length) {
    throw new Error(
      'reachability VIOLATED — goal(s) with NO satisfying state in ' + scene.id + ':\n  ' +
      bad.map((b) => '#' + b.index + ' ' + JSON.stringify(b.text)).join('\n  '),
    );
  }
  return true;
}
