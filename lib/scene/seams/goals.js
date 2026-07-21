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

/** Structural validity of a goal/episode descriptor (used by validateScenes). */
export function goalProblems(g, i){
  const out = [];
  if(!g || typeof g !== 'object'){ return ['goals[' + i + '] is not an object']; }
  if(g.type !== 'goal' && g.type !== 'episode') out.push('goals[' + i + '] type must be goal|episode');
  if(typeof g.text !== 'string' || !g.text) out.push('goals[' + i + '] missing text');
  if(typeof g.predicate !== 'function') out.push('goals[' + i + '] missing predicate fn');
  if(typeof g.xp !== 'number') out.push('goals[' + i + '] missing numeric xp');
  return out;
}
