/* ================================================================
   Scene Kit — SCENES registry + registerScene + validateScenes.
   CONTRACT.md §1. Owner: kit-core.

   Mirrors registerLesson()/validateCurriculum() in
   lib/curriculum/registry.js:
   - STRUCTURAL VALIDATION at registration (throws with the scene id).
   - IDEMPOTENT BY ID: re-registering an id REPLACES it in place
     (hot-reload safe — no duplicates).
   Cross-cutting checks that need every module loaded (baseline eval)
   live in validateScenes(), called after the scene-import chain resolves.
   ================================================================ */

import { toAtoms, view } from './params.js';
import { KINDS } from './entities.js';
import { goalProblems } from './seams/goals.js';
import { handleProblems } from './seams/handle.js';
import { controlProblems, controlBindProblems } from './seams/controls.js';

/** The scene registry. Scene modules call registerScene() into this. */
export const SCENES = [];

const SPACES = new Set(['plane2', 'free']);   // 'axes3' reserved (CONTRACT §9)
const KIND_SET = new Set(KINDS);

// Structural problems with a scene spec (no cross-file / eval checks here).
function sceneShapeProblems(spec){
  const p = [];
  if(!spec || typeof spec !== 'object') return ['scene is not an object'];
  if(!spec.id || typeof spec.id !== 'string') p.push('missing/invalid id');
  if(!spec.space || !SPACES.has(spec.space)) p.push('space must be one of ' + [...SPACES].join('|'));
  if(spec.params != null && (typeof spec.params !== 'object' || Array.isArray(spec.params))) p.push('`params` must be a plain object');
  if(typeof spec.entities !== 'function') p.push('`entities` must be a function');
  if(spec.goals != null){
    if(!Array.isArray(spec.goals)) p.push('`goals` must be an array');
    else spec.goals.forEach((g, i) => p.push(...goalProblems(g, i)));
  }
  if(spec.controls != null){
    if(!Array.isArray(spec.controls)) p.push('`controls` must be an array');
    else spec.controls.forEach((c, i) => p.push(...controlProblems(c, i)));
  }
  if(spec.caption != null && typeof spec.caption !== 'string') p.push('`caption` must be a string');
  if(spec.randomize != null && typeof spec.randomize !== 'function') p.push('`randomize` must be a function (rng)=>partialParams');
  return p;
}

/**
 * The single validated door into SCENES. @see CONTRACT.md §1.
 * Throws (with the scene id) on a malformed spec. Idempotent by id.
 * @param {Object} spec
 * @returns {Object} the registered spec
 */
export function registerScene(spec){
  const problems = sceneShapeProblems(spec);
  if(problems.length){
    const id = (spec && spec.id) || '(unknown)';
    throw new Error('registerScene(' + id + '): ' + problems.join('; '));
  }
  const i = SCENES.findIndex(s => s.id === spec.id);
  if(i >= 0) SCENES[i] = spec; else SCENES.push(spec);   // idempotent by id
  return spec;
}

/**
 * Cross-cutting validation — call after all scene modules have loaded.
 * Re-runs shape checks, HEADLESSLY evaluates each scene's entities(p,0)
 * against a baseline params snapshot (no GPU), and validates entity kinds
 * + handle capability. Returns a list of human-readable problems ([] = clean).
 * Flagship owns lesson<->scene-list resolution + capstone-present rules.
 * @returns {string[]}
 */
export function validateScenes(){
  const problems = [];
  const seen = new Set();
  for(const spec of SCENES){
    const tag = 'scene ' + (spec.id || '(unknown)') + ': ';
    if(seen.has(spec.id)) problems.push(tag + 'duplicate id'); else seen.add(spec.id);
    sceneShapeProblems(spec).forEach(m => problems.push(tag + m));

    // Atoms are needed for BOTH the baseline entities eval and the slider
    // param cross-check; toAtoms won't throw for a plain params object, so
    // hoist it out of the try (the control check then runs even if entities do).
    const atoms = toAtoms(spec.params || {});

    // Control bind-check (v1.4): slider binds a DECLARED, numeric param whose
    // initial value is in-range; no duplicate sliders on one param.
    controlBindProblems(spec.controls, atoms).forEach(m => problems.push(tag + m));

    // Baseline eval: entities(view(params), 0) must not throw and must
    // return an array of known-kind descriptors with valid handles.
    let list;
    try{
      list = spec.entities(view(atoms), 0);
    }catch(e){
      problems.push(tag + 'entities(p,0) threw: ' + (e && e.message));
      continue;
    }
    if(!Array.isArray(list)){ problems.push(tag + 'entities(p,0) did not return an array'); continue; }
    list.forEach((e, i) => {
      if(!e || !KIND_SET.has(e.kind)){ problems.push(tag + 'entities[' + i + '] unknown kind: ' + (e && e.kind)); return; }
      handleProblems(e.kind, e.handle).forEach(m => problems.push(tag + 'entities[' + i + '] ' + m));
    });
  }
  return problems;
}
