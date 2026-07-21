/* ================================================================
   SCENE KIT — interaction runtime  (lib/scene/interaction.js)
   Owner: INTERACTION (contracted file, CONTRACT §0/§7/§8).
   ----------------------------------------------------------------
   The declarative layer between a mounted scene and the learner:

   - HANDLES: discovers `.handle` descriptors on the entities returned
     by controller.evaluate(), normalizes them via seams/handle.js, and
     wires pointer-capture + nearest-pick + keyboard nudging through
     lib/scene/interact.js (the low-level controller). The pointer maps
     through controller.space.toWorld (canvas-local px, §6) and writes
     the bound param via controller.params[bind].set — one-way flow.

   - GOALS: drives lib/scene/goals.js (the makeGoals runtime) off
     controller.snapshot(): one BASELINE evaluate at attach (never
     credits, §7), then re-evaluates on every param change. All
     crediting is additionally gated on observed learner input
     (goals.markLearnerInput()), which this runtime fires from its own
     pointer/keyboard observers; kit controls (slider/chips) that live
     outside the canvas report through api.markLearnerInput().

   Handle position rule (v1): the dragged point IS the current value of
   the bound param (a vec). This covers the frozen capability table —
   vector tip, point, segment endpoint, polygon vertex — as long as the
   bound param holds that vec (kit guarantees the display list carries
   the resolved handle + stable key, §7).

   constrain:'curve' resolution: the descriptor names no function, so
   this runtime resolves it against the display list — the dragged
   point is projected onto the FIRST `curve` entity's fn (y = fn(x)).
   Scenes with several curves should use a function constraint instead.
   ================================================================ */

import { normalize } from './seams/handle.js';
import { makeInteraction } from './interact.js';
import { makeGoals } from './goals.js';

/* ---------- goals runtime factory (quality's probe surface) ----------
   attachGoals({goals, params, snapshot, onGoal, ...}) -> runtime with
   .evaluate() — evaluates the CURRENT snapshot (no argument needed).   */
export function attachGoals(cfg) {
  const snapshot = cfg.snapshot || (() => ({}));
  const rt = makeGoals(cfg.goals || [], {
    store: cfg.store,
    onComplete: (def, i) => { if (cfg.onGoal) cfg.onGoal(def, i); },
    onAllDone: cfg.onAllDone,
    now: cfg.now, schedule: cfg.schedule, cancel: cfg.cancel,
  });
  return {
    defs: rt.defs,
    evaluate() { rt.evaluate(snapshot()); },
    reportEpisode(ep) { rt.reportEpisode(ep); },
    markLearnerInput() { rt.markLearnerInput(); },
    bindLearnerInput(fn) { rt.bindLearnerInput(fn); },
    allDone() { return rt.allDone(); },
    isDone(i) { return rt.isDone(i); },
    remaining() { return rt.remaining(); },
    dispose() { rt.dispose(); },
  };
}

// Resolve a descriptor's constrain field into what interact.js understands.
function resolveConstrain(c, displayList) {
  if (c === 'axis-x' || c === 'axis-y' || typeof c === 'function' || c == null) return c;
  if (c === 'curve') {
    const cv = displayList.find((e) => e.kind === 'curve' && typeof e.fn === 'function');
    if (!cv) return null;                       // no curve to project onto
    return (pt) => ({ x: pt.x, y: cv.fn(pt.x) });
  }
  return null;                                  // unknown token: no constraint
}

/*
  attachInteraction(controller, opts) -> detachable runtime.
  controller: the frozen §8 surface from mountScene.
  opts:
    el          DOM element for pointer/keyboard (default: the canvas inside
                the mount container if opts.container given, else container)
    container   the element mountScene mounted into (fallback for el)
    goals       an EXTERNAL goals runtime (engine's mountGoals) — evaluate/
                reportEpisode/markLearnerInput are driven through it. OR:
    goalDefs    descriptor array — an internal attachGoals runtime is built
                (opts.onGoal/onAllDone/store forwarded), owned + disposed here.
  Returns { goals, interaction, refresh, markLearnerInput, reportEpisode,
            dispose }.
*/
export function attachInteraction(controller, opts = {}) {
  const container = opts.container || null;
  const el = opts.el
    || (container && container.querySelector && container.querySelector('canvas'))
    || container;

  const ownGoals = !opts.goals && Array.isArray(opts.goalDefs);
  const goals = opts.goals || (ownGoals ? attachGoals({
    goals: opts.goalDefs, snapshot: () => controller.snapshot(),
    onGoal: opts.onGoal, onAllDone: opts.onAllDone, store: opts.store,
    now: opts.now, schedule: opts.schedule, cancel: opts.cancel,
  }) : null);

  // Bind the goals crediting gate to the controller's canonical flag
  // (CONTRACT v1.2 §7/§8). Input surfaces below call controller.markLearnerInput();
  // the goals runtime consults controller.hasLearnerInput() through this bind,
  // so controller.newAttempt()'s gate reset (fresh capstone attempt) flows
  // through to crediting. Works for both the internal attachGoals wrapper and
  // an external engine-owned makeGoals runtime.
  if (goals && typeof goals.bindLearnerInput === 'function') {
    goals.bindLearnerInput(() => controller.hasLearnerInput());
  }

  // Works for both runtime shapes: makeGoals.evaluate(state) consumes the
  // snapshot; attachGoals' evaluate() ignores the argument and re-snapshots
  // (same value, one-way flow).
  const feed = goals ? () => goals.evaluate(controller.snapshot()) : () => {};

  // ---- pointer/keyboard wiring (needs a space to map pointers; 'free'
  // scenes have none — their inputs are DOM controls reporting through
  // markLearnerInput, so handle wiring is skipped, goals still run) ----
  let ix = null;
  if (el && controller.space) {
    ix = makeInteraction({
      el,
      toWorld: (pt) => controller.space.toWorld(pt),
      requestDraw: () => controller.driver && controller.driver.requestFrame(),
    }, {
      // Genuine learner input (pointer grab, keyboard nudge) opens the gate on
      // the CONTROLLER — the one canonical flag (CONTRACT v1.2 §7). The goals
      // runtime reads it through the bind above. Programmatic param writes
      // (tweens/sims) never reach here, so they never credit.
      onInput: () => controller.markLearnerInput(),
      // param writes already re-feed goals via the atom subscriptions below;
      // onAny left free for scene-level hooks in a later rev.
    });
  }

  let installed = [];   // interact.js handle objects, for refresh()

  function discover() {
    installed.forEach((h) => h.remove());
    installed = [];
    if (!ix) return;
    let list = [];
    try { list = controller.evaluate() || []; } catch (e) { list = []; }
    for (const e of list) {
      const norm = normalize(e.handle);
      if (!norm) continue;
      const atom = controller.params[norm.bind];
      if (!atom) {
        if (typeof console !== 'undefined') console.error('[interaction] handle binds unknown param `' + norm.bind + '`');
        continue;
      }
      installed.push(ix.handle(atom, {
        snap: norm.snap,
        constrain: resolveConstrain(norm.constrain, list),
        keyStep: norm.keyStep,
        hitRadius: norm.hitRadius,      // not contract-frozen; tolerated extra
      }));
    }
  }

  // ---- goals: baseline at attach, re-evaluate on every param change ----
  const unsubs = [];
  if (goals) {
    feed();                                             // BASELINE (§7)
    for (const k in controller.params) {
      unsubs.push(controller.params[k].subscribe(() => feed()));
    }
  }

  discover();

  return {
    goals,
    interaction: ix,
    /** Re-scan entities for handles (after newAttempt or structural change). */
    refresh() { discover(); },
    /** Kit controls outside the canvas (slider/chips/buttons) report here —
        routed to the controller's canonical gate (CONTRACT v1.2 §7). */
    markLearnerInput() { controller.markLearnerInput(); },
    reportEpisode(ep) { if (goals) goals.reportEpisode(ep); },
    dispose() {
      unsubs.forEach((u) => { try { u(); } catch (e) { /* isolate */ } });
      unsubs.length = 0;
      if (ix) ix.dispose();
      if (ownGoals && goals) goals.dispose();           // external goals: caller owns
    },
  };
}
