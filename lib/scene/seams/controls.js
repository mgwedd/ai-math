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

/**
 * Cross-control / bind-time checks that need the resolved param atoms:
 * a slider must bind a DECLARED, NUMERIC param whose current value lies in
 * [min,max], and no two sliders may bind the SAME param (they would fight over
 * one atom). Returns problem strings ([] = ok). Used by validateScenes (a
 * registered scene) and mountScene (an inline object spec). Shape problems are
 * `controlProblems`'s job — this assumes each control already passed that, and
 * skips anything that didn't (guards defensively so it never throws itself).
 * @param {*} controls spec.controls
 * @param {Object<string,{get:Function}>} atoms resolved param atoms
 */
export function controlBindProblems(controls, atoms){
  const out = [];
  if(!Array.isArray(controls)) return out;
  const seen = new Set();
  controls.forEach((c, i) => {
    if(!c || c.kind !== 'slider' || typeof c.param !== 'string') return;
    const at = 'controls[' + i + ']';
    if(seen.has(c.param)) out.push(at + ' duplicate slider on param `' + c.param + '` (two sliders would fight over one atom)');
    seen.add(c.param);
    const atom = atoms && atoms[c.param];
    if(!atom){ out.push(at + ' slider param `' + c.param + '` is not a declared param'); return; }
    const val = atom.get();
    if(typeof val !== 'number'){ out.push(at + ' slider param `' + c.param + '` must be a numeric (scalar) param'); return; }
    if(typeof c.min === 'number' && typeof c.max === 'number' && (val < c.min || val > c.max))
      out.push(at + ' slider param `' + c.param + '` initial value ' + val + ' is outside [min,max]=[' + c.min + ',' + c.max + ']');
  });
  return out;
}
