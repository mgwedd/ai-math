/* ================================================================
   Scene Kit — goal/episode DESCRIPTOR factories. CONTRACT.md §7.

   SEAM: kit-core owns the descriptor SHAPE (and its structural
   validation in registry.js). The evaluation RUNTIME — hold timers,
   XP grant, the baseline-gating rule, persistence into
   S.missions[lessonId::sceneId] — lives in interaction.js (INTERACTION
   principal). These factories only build plain data.

   Baseline invariant (carried from makeMissions in lib/engine.js): a
   scene's FIRST goal evaluation is the baseline and never credits a
   goal; completion requires a learner-driven param change on a later
   evaluation. Interaction MUST honor this.

   LEARNER-INPUT GATE (CONTRACT v1.2 §7 — supersedes baseline-only):
   NO goal of ANY type (goal/episode/visited) may credit until at least
   one learner interaction has been observed since scene mount —
   controller.hasLearnerInput() must be true at crediting time. Mount
   tweens and auto-run sims can never credit (scenes are the exam).
   Input surfaces (pointer/keyboard rigs, sliders, chips, scrub) call
   controller.markLearnerInput(); controller.newAttempt() RESETS the gate.
   ================================================================ */

/**
 * State-predicate goal.
 * @param {string} text learner-facing objective
 * @param {(s:Object)=>boolean} predicate over a param snapshot (name->rawValue)
 * @param {{xp:number, hold?:number, hint?:string, tag?:string, focus?:string}} opts
 *   hold = ms the predicate must stay true (prevents drive-by passes).
 * @returns descriptor consumed by interaction's runtime.
 */
export function goal(text, predicate, opts){
  const p = opts || {};
  return { type: 'goal', text, predicate, xp: p.xp, hold: p.hold,
           hint: p.hint, tag: p.tag, focus: p.focus };
}

/**
 * Simulation/game outcome goal.
 * @param {string} text
 * @param {(ep:Object)=>boolean} outcomePredicate over an episode object
 *   (e.g. {steps, converged, score}); the scene's sim authors ep's shape.
 * @param {{xp:number, hint?:string, tag?:string, focus?:string}} opts
 */
export function episode(text, outcomePredicate, opts){
  const p = opts || {};
  return { type: 'episode', text, predicate: outcomePredicate, xp: p.xp,
           hint: p.hint, tag: p.tag, focus: p.focus };
}

/**
 * Multi-variant "tried all N" goal (CONTRACT v1.2 §7 — admitted from
 * interaction; the audit found labs reinvent this bookkeeping ~6x).
 * @param {string} text
 * @param {(s:Object)=>(string|null)} keyOf maps a param snapshot to the
 *   variant key it currently exhibits (null/undefined = none). The runtime
 *   accumulates DISTINCT keys observed on learner-driven evaluations and
 *   credits when the count reaches `required`.
 * @param {{required?:number, keys?:string[], xp:number, hold?:number,
 *          hint?:string, tag?:string, focus?:string}} opts
 *   keys: optional closed set; observed keys outside it are ignored, and
 *   `required` defaults to keys.length. Without keys, `required` is REQUIRED.
 *   VALIDATION: required must be an integer >= 1 (required=0/undefined would
 *   instant-complete — reproduced by review; rejected at registration).
 */
export function visited(text, keyOf, opts){
  const p = opts || {};
  const required = p.required ?? (Array.isArray(p.keys) ? p.keys.length : undefined);
  return { type: 'visited', text, keyOf, keys: p.keys, required, xp: p.xp,
           hold: p.hold, hint: p.hint, tag: p.tag, focus: p.focus };
}

/** Structural validity of a goal descriptor (used by validateScenes). */
export function goalProblems(g, i){
  const out = [];
  if(!g || typeof g !== 'object'){ return ['goals[' + i + '] is not an object']; }
  if(g.type !== 'goal' && g.type !== 'episode' && g.type !== 'visited')
    out.push('goals[' + i + '] type must be goal|episode|visited');
  if(typeof g.text !== 'string' || !g.text) out.push('goals[' + i + '] missing text');
  if(typeof g.xp !== 'number') out.push('goals[' + i + '] missing numeric xp');
  if(g.type === 'visited'){
    if(typeof g.keyOf !== 'function') out.push('goals[' + i + '] visited missing keyOf fn');
    if(!Number.isInteger(g.required) || g.required < 1)
      out.push('goals[' + i + '] visited `required` must be an integer >= 1 (got ' + g.required + ')');
    if(g.keys != null){
      if(!Array.isArray(g.keys) || g.keys.length < 1) out.push('goals[' + i + '] visited `keys` must be a non-empty array');
      else if(Number.isInteger(g.required) && g.required > g.keys.length)
        out.push('goals[' + i + '] visited `required` exceeds keys.length');
    }
  }else if(typeof g.predicate !== 'function'){
    out.push('goals[' + i + '] missing predicate fn');
  }
  return out;
}
