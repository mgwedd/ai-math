/* ================================================================
   SCENE KIT — goals runtime  (lib/scene/goals.js)
   ----------------------------------------------------------------
   The "learn by doing" assessment core for scenes. A superset of the
   legacy missions engine (lib/engine.js makeMissions): state-predicate
   goals with HOLD-TIME, simulation/game EPISODE outcomes, and a
   VISITED combinator that replaces the "tried all variants" bookkeeping
   labs reinvent ~6×.

   RENDERER-AGNOSTIC + HEADLESS. This module is pure logic — no DOM, no
   canvas, no GPU. It is driven by dependency injection so it unit-tests
   without a browser and stays swappable when the Scene Kit CONTRACT lands:
     - persistence via an injected `store {load, save}`  (engine wires it
       to S.missions[lessonId+'::'+sceneId] + save() — SAME index→bool
       shape as today, no storage migration)
     - XP/toast/checkmark side effects via `onComplete(def, index)`
     - hold-time via injected `schedule`/`cancel` (setTimeout/clearTimeout
       by default) so a learner who STOPS interacting still completes at
       T+hold, and tests can drive it with fake timers.

   CRITICAL INVARIANT (mirrors makeMissions, pinned by test/):
   the FIRST evaluate() after a scene mounts is a BASELINE — it can never
   complete a goal. A predicate that is true for the scene's default state
   would otherwise auto-complete on load, handing the learner a goal they
   did nothing to earn. Goals are credited only on subsequent, learner-
   driven evaluations. And if EVERY goal is already saved on mount, the
   all-done callback is scheduled at 0ms (already-complete re-entry), same
   as makeMissions' `setTimeout(onAllDone,0)`.
   ================================================================ */

/* ---------- goal factories (the authorable surface) ---------- */

// State-predicate goal. `predicate(state)` reads the scene's params.
// hold: predicate must stay true for `hold` ms (drive-by passes don't count).
export function goal(text, predicate, opts = {}) {
  return {
    kind: 'state', text, predicate,
    xp: opts.xp || 0, hold: opts.hold || 0, hint: opts.hint || null,
  };
}

// Episode/outcome goal for simulation & game scenes. `predicate(ep)` reads an
// outcome object (steps-to-converge, score, survived…) reported when a run ends.
export function episode(text, outcomePredicate, opts = {}) {
  return {
    kind: 'episode', text, predicate: outcomePredicate,
    xp: opts.xp || 0, hint: opts.hint || null,
  };
}

// "Tried all variants" combinator. keyOf(state) yields the current variant key;
// the goal accumulates keys across evaluations and completes once every required
// variant has been seen. `required` is an array of expected keys OR a count.
export function visited(text, keyOf, required, opts = {}) {
  return {
    kind: 'visited', text, keyOf, required,
    xp: opts.xp || 0, hint: opts.hint || null,
  };
}

/* ---------- in-memory store (default / test fallback) ---------- */
export function memStore(initial) {
  let data = initial ? { ...initial } : {};
  return {
    load() { return { ...data }; },
    save(map) { data = { ...map }; },
    _peek() { return data; },
  };
}

/* ---------- runtime ---------- */
/*
  makeGoals(defs, cfg) — defs: array from goal()/episode()/visited().
  cfg:
    store      {load():map, save(map)}    persistence (default: memStore)
    onComplete (def, index) => void       side effects (XP, toast, checkmark)
    onAllDone  () => void                 fired once all goals complete
    now        () => number               clock (default: Date.now)
    schedule   (fn, ms) => token          timer (default: setTimeout)
    cancel     (token) => void            (default: clearTimeout)
  Returns { evaluate, reportEpisode, allDone, isDone, remaining, defs, dispose }.
*/
export function makeGoals(defs, cfg = {}) {
  defs = defs || [];
  const store = cfg.store || memStore();
  const onComplete = cfg.onComplete || (() => {});
  const onAllDone = cfg.onAllDone;
  const now = cfg.now || (() => Date.now());
  const schedule = cfg.schedule || ((fn, ms) => setTimeout(fn, ms));
  const cancel = cfg.cancel || clearTimeout;

  const saved = store.load() || {};          // {index: true}
  const seen = defs.map(() => new Set());     // visited() accumulators
  const holdSince = defs.map(() => null);     // ms timestamp predicate went true
  const holdTimer = defs.map(() => null);     // pending T+hold re-check token
  let baselined = false;
  let lastState = null;
  let disposed = false;
  let doneCount = defs.reduce((n, _, i) => n + (saved[i] ? 1 : 0), 0);

  function clearHold(i) {
    holdSince[i] = null;
    if (holdTimer[i] != null) { cancel(holdTimer[i]); holdTimer[i] = null; }
  }

  function complete(i) {
    if (saved[i]) return;
    saved[i] = true;
    store.save(saved);
    clearHold(i);
    doneCount++;
    try { onComplete(defs[i], i); } catch (e) { /* side-effect isolation */ }
    if (doneCount === defs.length && onAllDone) onAllDone();
  }

  function checkVisited(i) {
    const d = defs[i];
    const need = Array.isArray(d.required)
      ? d.required.every((k) => seen[i].has(k))
      : seen[i].size >= (d.required | 0);
    if (need) complete(i);
  }

  function checkState(i, state) {
    const d = defs[i];
    let ok = false;
    try { ok = !!d.predicate(state); } catch (e) { ok = false; }
    if (!ok) { clearHold(i); return; }
    if (d.hold > 0) {
      if (holdSince[i] == null) {
        // Predicate just went true: start the clock and arm a re-check that
        // fires even if the learner never triggers another evaluate().
        holdSince[i] = now();
        holdTimer[i] = schedule(() => {
          holdTimer[i] = null;
          if (saved[i] || holdSince[i] == null) return;
          let still = false;
          try { still = !!d.predicate(lastState); } catch (e) { still = false; }
          if (still && (now() - holdSince[i]) >= d.hold) complete(i);
          else holdSince[i] = null;
        }, d.hold);
      } else if ((now() - holdSince[i]) >= d.hold) {
        complete(i);
      }
      // else: still holding, not enough elapsed — wait for the armed timer /
      // the next evaluate().
    } else {
      complete(i);
    }
  }

  const api = {
    defs,

    // Feed the current param snapshot. First call after mount is the baseline
    // (accumulates visited keys but credits nothing). Later calls credit.
    evaluate(state) {
      if (disposed) return;
      lastState = state;
      const isBaseline = !baselined;
      baselined = true;
      // Accumulate visited keys ALWAYS (baseline included: the starting variant
      // legitimately counts as visited). Completion is still gated below.
      defs.forEach((d, i) => {
        if (saved[i] || d.kind !== 'visited') return;
        try { const k = d.keyOf(state); if (k != null) seen[i].add(k); } catch (e) { /* skip */ }
      });
      if (isBaseline) return;                 // baseline render → no credit
      defs.forEach((d, i) => {
        if (saved[i]) return;
        if (d.kind === 'state') checkState(i, state);
        else if (d.kind === 'visited') checkVisited(i);
      });
    },

    // Report a finished simulation/game run. Episode outcomes are inherently
    // learner-driven (a run must be played to end), so they are not subject to
    // the baseline suppression — a mount cannot fabricate an episode outcome.
    // NOTE: an episode must NOT consume the state-goal baseline (`baselined`
    // stays untouched here). If a sim scene reports an episode before the
    // mount's first evaluate(), that first evaluate is STILL the baseline —
    // otherwise a state predicate true at the default state would be credited
    // on load. Pinned by test/scene-goals.test.mjs.
    reportEpisode(ep) {
      if (disposed) return;
      defs.forEach((d, i) => {
        if (saved[i] || d.kind !== 'episode') return;
        let ok = false;
        try { ok = !!d.predicate(ep); } catch (e) { ok = false; }
        if (ok) complete(i);
      });
    },

    allDone() { return doneCount === defs.length; },
    isDone(i) { return !!saved[i]; },
    remaining() { return defs.length - doneCount; },
    dispose() { disposed = true; defs.forEach((_, i) => clearHold(i)); },
  };

  // Already-complete re-entry: enable "continue" on a scene the learner finished
  // in a prior session, deferred a tick like makeMissions does (so callers can
  // wire onAllDone after construction returns).
  if (api.allDone() && onAllDone) schedule(onAllDone, 0);

  return api;
}
