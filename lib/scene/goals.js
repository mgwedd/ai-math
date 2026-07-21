/* ================================================================
   SCENE KIT — goals runtime  (lib/scene/goals.js)  Owner: INTERACTION
   ----------------------------------------------------------------
   The evaluation RUNTIME for goal/episode descriptors (CONTRACT §7).
   The descriptor SHAPES + factories are kit-core's (seams/goals.js):
     goal(...)    -> { type:'goal',    text, predicate, xp, hold, hint, tag, focus }
     episode(...) -> { type:'episode', text, predicate, xp, hint, tag, focus }
   This runtime dispatches on `type` and carries tag/focus through
   untouched (they ride on the descriptor object handed to onComplete).

   visited() (CONTRACT v1.2 §7) is now an ADMITTED third goal type. Its
   DESCRIPTOR factory is kit-core's (seams/goals.js, exported via
   lib/scene/index.js); we re-export it below so importers of this
   runtime keep one import site. Shape:
     visited(text, keyOf, {required|keys, xp, hold, hint, tag, focus})
       -> { type:'visited', text, keyOf, keys?, required, xp, ... }
   This runtime accumulates DISTINCT observed keys (filtered to `keys`
   when a closed set is given) and credits once the count reaches
   `required` — subject to the baseline + learner-input gate below.

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

/* ---------- visited() descriptor — re-export kit-core's canonical factory ----------
   CONTRACT v1.2 §7: the descriptor SHAPE is kit-core's (seams/goals.js). We
   re-export it so callers of this runtime (and the test suite) have a single
   import site; the SHAPE is authoritative there, the RUNTIME (accumulate +
   credit) is here. */
export { visited } from './seams/goals.js';

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

  // Defensive validation (the runtime is the last line of defense — makeGoals
  // is also called outside registerScene, e.g. engine.mountGoals + tests).
  // A visited() with required not an integer >= 1 would instant-complete on the
  // first post-gate evaluate; reject it loudly at construction (CONTRACT §7).
  defs.forEach((d, i) => {
    if (d && d.type === 'visited' && !(Number.isInteger(d.required) && d.required >= 1)) {
      throw new Error('makeGoals: visited goal[' + i + '] `required` must be an integer >= 1 (got ' + d.required + ')');
    }
  });

  const saved = store.load() || {};          // {index: true}
  const seen = defs.map(() => new Set());     // visited() accumulators
  const holdSince = defs.map(() => null);     // ms timestamp predicate went true
  const holdTimer = defs.map(() => null);     // pending T+hold re-check token
  let baselined = false;
  let learnerInput = false;                   // rule 2 (standalone flag)
  // The learner-input gate (rule 2) is canonically the CONTROLLER's flag
  // (CONTRACT v1.2 §7/§8: controller.hasLearnerInput()). When bound via
  // bindLearnerInput() the runtime consults it so newAttempt()'s reset flows
  // through; standalone runtimes (tests, quality's probe) fall back to the
  // local flag driven by markLearnerInput().
  let gateFn = null;
  let lastState = null;
  let disposed = false;
  let doneCount = defs.reduce((n, _, i) => n + (saved[i] ? 1 : 0), 0);

  function hasLearnerInput() { return gateFn ? !!gateFn() : learnerInput; }
  // May goals be credited right now? (rules 1 + 2)
  function creditable() { return baselined && hasLearnerInput(); }

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
    // `seen[i]` only ever holds keys inside the closed set (filtered at
    // accumulation), so distinct-count reaching `required` is the sole test —
    // covers both the count form and the keys form (required = keys.length).
    if (seen[i].size >= defs[i].required) complete(i);
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
    // nudge, or a kit control change. Idempotent. Used by STANDALONE runtimes
    // (no controller); when bound (bindLearnerInput) the controller's flag wins.
    markLearnerInput() { learnerInput = true; },

    // Bind the crediting gate to the controller's canonical flag (CONTRACT
    // v1.2 §7/§8). interaction.js calls this with () => controller.hasLearnerInput()
    // so newAttempt()'s reset of the gate flows through to crediting.
    bindLearnerInput(fn) { gateFn = fn || null; },

    // Feed the current param snapshot. First call after mount is the baseline.
    // CONTRACT v1.2 §7 (frozen): while hasLearnerInput() is false, evaluations
    // still run (readouts update) but "nothing credits, no hold-timer arms, and
    // no visited() key is accumulated." So visited keys accrue ONLY on
    // learner-driven evaluations — a mount tween / auto-run sim / newAttempt
    // reroll that sweeps a keyOf param through variants pre-input records
    // NOTHING, closing the same hole the gate closes for goal/episode.
    evaluate(state) {
      if (disposed) return;
      lastState = state;
      const isBaseline = !baselined;
      baselined = true;
      // The baseline itself never banks a key either (it is the mount state,
      // not a learner-driven observation — matters for standalone runtimes
      // where markLearnerInput() may fire before the first evaluate).
      if (!isBaseline && hasLearnerInput()) {
        defs.forEach((d, i) => {
          if (saved[i] || d.type !== 'visited') return;
          try {
            const k = d.keyOf(state);
            // Ignore keys outside a declared closed set (CONTRACT §7).
            if (k != null && (!d.keys || d.keys.includes(k))) seen[i].add(k);
          } catch (e) { /* skip */ }
        });
      }
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
      if (disposed || !hasLearnerInput()) return;
      defs.forEach((d, i) => {
        if (saved[i] || d.type !== 'episode') return;
        let ok = false;
        try { ok = !!d.predicate(ep); } catch (e) { ok = false; }
        if (ok) complete(i);
      });
    },

    // Attempt boundary (CONTRACT v1.3 §1). Clears per-goal TRANSIENT state —
    // hold clocks + armed timers, visited key accumulation — and re-arms the
    // baseline, WITHOUT touching persisted completion (credit already earned
    // stays earned; episodes have no in-flight state: they credit immediately
    // and persist). Also re-closes the STANDALONE gate flag, mirroring
    // controller.newAttempt()'s reset (bound runtimes read the controller's
    // flag, which newAttempt already resets). Callers pair it (v1.3 §2):
    //   controller.newAttempt(seed) → resetAttempt() → baseline re-eval.
    resetAttempt() {
      defs.forEach((_, i) => clearHold(i));
      seen.forEach((s) => s.clear());
      baselined = false;
      learnerInput = false;
      lastState = null;
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
