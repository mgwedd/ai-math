/* ================================================================
   SCENE KIT — goals runtime  (lib/scene/goals.js)  Owner: INTERACTION
   ----------------------------------------------------------------
   The evaluation RUNTIME for goal/episode descriptors (CONTRACT §7).
   The descriptor SHAPES + factories are kit-core's (seams/goals.js):
     goal(...)    -> { type:'goal',    text, predicate, xp, hold, hint, tag, focus }
     episode(...) -> { type:'episode', text, predicate, xp, hint, tag, focus }
   This runtime dispatches on `type` and carries tag/focus through
   untouched (they ride on the descriptor object handed to onComplete).

   Also home to visited() — NOT in CONTRACT v1 (§9 "open/later"): the
   descriptor is built here, consumed only by this runtime, and NOT
   exported through lib/scene/index.js. v1.2 admission requested in
   interaction-goals.md Handoffs -> kit-core.

   RENDERER-AGNOSTIC + HEADLESS: pure logic, dependency-injected
   (store / clock / scheduler / side-effect hooks) — unit-tests without
   a browser. Engine wires persistence to S.missions[lessonId::sceneId]
   (same index→bool shape as missions, no storage migration) and XP/
   toast/checkmarks via onComplete.

   CREDITING RULES (architect ruling, binding — supersedes the plain
   baseline rule and is pinned by test/):
   1. BASELINE: the FIRST evaluate() after mount never credits anything
      (carried from makeMissions; a predicate true at the default state
      must not auto-complete on load).
   2. LEARNER-INPUT GATE: no goal of ANY kind (goal/episode/visited)
      credits until markLearnerInput() has fired since mount — a pointer
      grab, keyboard nudge, or kit-control change. This closes the
      animated-scene holes: an auto-run sim reporting an episode at
      load, or a mount tween sweeping params through a qualifying
      region, credits nothing until the learner actually acts.
   3. Already-all-done on mount: onAllDone is scheduled at 0ms (same
      re-entry behavior as makeMissions' setTimeout(onAllDone,0)); the
      token is cancelled by dispose() so a quick navigation away can't
      fire a stale callback over the next screen.
   ================================================================ */

/* ---------- visited() combinator (v1.2 candidate; runtime-internal) ----------
   "Tried all variants" bookkeeping labs reinvent ~6×. keyOf(state) yields the
   current variant key; the goal accumulates keys across evaluations and
   completes once every required variant has been seen (or `required` distinct
   keys, in the count form). Completion is subject to rules 1+2 above. */
export function visited(text, keyOf, required, opts = {}) {
  const okArray = Array.isArray(required) && required.length >= 1;
  const okCount = typeof required === 'number' && required >= 1;
  if (!okArray && !okCount) {
    // A missing/0 requirement would complete on the first post-gate evaluate —
    // silently, which is worse than loudly. Fail at authoring time.
    throw new Error('visited(): `required` must be a non-empty array or a count >= 1');
  }
  return {
    type: 'visited', text, keyOf, required,
    xp: opts.xp || 0, hint: opts.hint || null, tag: opts.tag, focus: opts.focus,
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
  makeGoals(defs, cfg) — defs: descriptor array (seams/goals.js goal()/
  episode(), plus visited() above).
  cfg:
    store      {load():map, save(map)}    persistence (default: memStore)
    onComplete (def, index) => void       side effects (XP, toast, checkmark)
    onAllDone  () => void                 fired once all goals complete
    now        () => number               clock (default: Date.now)
    schedule   (fn, ms) => token          timer (default: setTimeout)
    cancel     (token) => void            (default: clearTimeout)
  Returns { evaluate, reportEpisode, markLearnerInput, allDone, isDone,
            remaining, defs, dispose }.
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
  let learnerInput = false;                   // rule 2: nothing credits before this
  let lastState = null;
  let disposed = false;
  let doneCount = defs.reduce((n, _, i) => n + (saved[i] ? 1 : 0), 0);

  // May goals be credited right now? (rules 1 + 2)
  function creditable() { return baselined && learnerInput; }

  function clearHold(i) {
    holdSince[i] = null;
    if (holdTimer[i] != null) { cancel(holdTimer[i]); holdTimer[i] = null; }
  }

  function complete(i) {
    if (saved[i] || disposed) return;
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
      : seen[i].size >= d.required;
    if (need) complete(i);
  }

  function checkState(i, state) {
    const d = defs[i];
    let ok = false;
    try { ok = !!d.predicate(state); } catch (e) { ok = false; }
    if (!ok) { clearHold(i); return; }
    const hold = d.hold || 0;
    if (hold > 0) {
      if (holdSince[i] == null) {
        // Predicate just went true: start the clock and arm a re-check that
        // fires even if the learner never triggers another evaluate().
        holdSince[i] = now();
        holdTimer[i] = schedule(() => {
          holdTimer[i] = null;
          if (disposed || saved[i] || holdSince[i] == null) return;
          if (!creditable()) { holdSince[i] = null; return; }
          let still = false;
          try { still = !!d.predicate(lastState); } catch (e) { still = false; }
          if (still && (now() - holdSince[i]) >= hold) complete(i);
          else holdSince[i] = null;
        }, hold);
      } else if ((now() - holdSince[i]) >= hold) {
        complete(i);
      }
      // else: still holding — the armed timer or the next evaluate finishes it.
    } else {
      complete(i);
    }
  }

  // Deferred already-done token — cancelled by dispose (leak finding: a stale
  // onAllDone tick must not fire confetti over whatever screen came next).
  let allDoneToken = null;

  const api = {
    defs,

    // Rule 2's input observers call this: pointer grab on a handle, keyboard
    // nudge, or a kit control change. Idempotent.
    markLearnerInput() { learnerInput = true; },

    // Feed the current param snapshot. First call after mount is the baseline
    // (accumulates visited keys but credits nothing); crediting additionally
    // requires markLearnerInput() to have fired (rule 2).
    evaluate(state) {
      if (disposed) return;
      lastState = state;
      const isBaseline = !baselined;
      baselined = true;
      // Accumulate visited keys ALWAYS (baseline included: the starting variant
      // legitimately counts as visited). Completion is still gated below.
      defs.forEach((d, i) => {
        if (saved[i] || d.type !== 'visited') return;
        try { const k = d.keyOf(state); if (k != null) seen[i].add(k); } catch (e) { /* skip */ }
      });
      if (isBaseline || !creditable()) return;   // rules 1 + 2 → no credit
      defs.forEach((d, i) => {
        if (saved[i]) return;
        if (d.type === 'goal') checkState(i, state);
        else if (d.type === 'visited') checkVisited(i);
      });
    },

    // Report a finished simulation/game run. Gated on learner input (rule 2):
    // an auto-run sim that converges during the mount animation credits
    // NOTHING — a run only counts once the learner has actually acted.
    // (Does not consume the evaluate() baseline either way.)
    reportEpisode(ep) {
      if (disposed || !learnerInput) return;
      defs.forEach((d, i) => {
        if (saved[i] || d.type !== 'episode') return;
        let ok = false;
        try { ok = !!d.predicate(ep); } catch (e) { ok = false; }
        if (ok) complete(i);
      });
    },

    allDone() { return doneCount === defs.length; },
    isDone(i) { return !!saved[i]; },
    remaining() { return defs.length - doneCount; },
    dispose() {
      disposed = true;
      defs.forEach((_, i) => clearHold(i));
      if (allDoneToken != null) { cancel(allDoneToken); allDoneToken = null; }
    },
  };

  // Already-complete re-entry: enable "continue" on a scene the learner
  // finished in a prior session, deferred a tick like makeMissions does (so
  // callers can wire onAllDone after construction returns). Tracked + guarded
  // so dispose() before the tick swallows it.
  if (api.allDone() && onAllDone) {
    allDoneToken = schedule(() => { allDoneToken = null; if (!disposed) onAllDone(); }, 0);
  }

  return api;
}
