/* ================================================================
   Scene Kit — control SEAM: slider. CONTRACT.md §3 (Amendment v1.4).

   A control is a DOM OVERLAY input (accessible, keyboard-operable),
   NOT a canvas entity — it renders as a real <input type="range"> under
   the scene container, never drawn on the GPU canvas. kit-core owns the
   descriptor SHAPE + structural validation (here) and the DOM overlay
   lifecycle (in scene.js). The evaluation of goals stays with interaction.

   A slider writes THROUGH the bound param atom (one-way flow preserved:
   input -> params -> entities -> draw) and COUNTS AS LEARNER INPUT — its
   first interaction opens the learner-input gate
   (controller.markLearnerInput(), CONTRACT §7). The bound atom is the
   SINGLE source of truth: the slider position follows the atom (so a
   newAttempt() reroll moves the slider) with no internal shadow state.

   Distinct from the legacy lib/engine.js `slider()` (imperative lab kit:
   positional args + an onChange callback that mutates lab-local state).
   THIS slider is a declarative descriptor bound to a scene param atom.
   ================================================================ */

/**
 * A scalar slider control bound to a scene param.
 * @param {string} paramKey name of the scalar (numeric) param this slider writes
 * @param {{min:number, max:number, step?:number, label?:string,
 *          format?:(v:number)=>string}} opts
 *   min/max: required track bounds (min < max). step: optional snap
 *   increment (> 0). label: optional visible + aria label (defaults to
 *   paramKey). format: optional value formatter for the readout span.
 * @returns descriptor consumed by mountScene's control overlay.
 */
export function slider(paramKey, opts){
  const o = opts || {};
  return { kind: 'slider', param: paramKey,
           min: o.min, max: o.max, step: o.step,
           label: o.label, format: o.format };
}

/**
 * Structural validity of a control descriptor. Returns problem strings
 * ([] = ok). Used by registerScene (throws) and validateScenes.
 * @param {*} c a control descriptor
 * @param {number} i its index in spec.controls (for the message)
 */
export function controlProblems(c, i){
  const at = 'controls[' + i + ']';
  if(!c || typeof c !== 'object') return [at + ' is not an object'];
  if(c.kind !== 'slider') return [at + ' unknown control kind: ' + c.kind];
  const p = [];
  if(typeof c.param !== 'string' || !c.param) p.push(at + ' slider missing `param` name');
  const minOk = typeof c.min === 'number' && Number.isFinite(c.min);
  const maxOk = typeof c.max === 'number' && Number.isFinite(c.max);
  if(!minOk) p.push(at + ' slider `min` must be a finite number');
  if(!maxOk) p.push(at + ' slider `max` must be a finite number');
  if(minOk && maxOk && !(c.min < c.max)) p.push(at + ' slider `min` must be < `max`');
  if(c.step != null && (typeof c.step !== 'number' || !(c.step > 0))) p.push(at + ' slider `step` must be a positive number');
  if(c.label != null && typeof c.label !== 'string') p.push(at + ' slider `label` must be a string');
  if(c.format != null && typeof c.format !== 'function') p.push(at + ' slider `format` must be a function');
  return p;
}
