/* ================================================================
   Scene Kit — mountScene runtime: the integration surface.
   CONTRACT.md §8. Owner: kit-core.

   Wires space + renderer backend + frame driver + params into one
   controller. Motion attaches tween/sim sources to controller.driver;
   interaction attaches handles/goals using controller.space +
   controller.params. The render tick is evaluate -> diff -> backend.apply,
   installed as the driver's render(); a param write schedules a frame
   (one-way flow: input -> params -> entities -> draw).
   ================================================================ */

import { toAtoms, view, snapshot } from './params.js';
import { createSpace } from './space/index.js';
import { createFrameDriver } from './driver.js';
import { diff } from './diff.js';
import { createPixiBackend } from './renderer/pixi.js';
import { SCENES } from './registry.js';

/**
 * @param {string|Object} idOrSpec a registered scene id or a spec object
 * @param {HTMLElement} container DOM node to mount the canvas into
 * @param {{ backend?:Object|(()=>Promise<Object>), hooks?:{onGoal?:Function,onError?:Function} }} [opts]
 *   backend: a backend instance, a factory returning one, or omitted (default
 *   Pixi singleton). Tests inject createNullBackend() for headless runs.
 * @returns {Promise<Object>} controller (CONTRACT §8)
 */
export async function mountScene(idOrSpec, container, opts){
  const spec = typeof idOrSpec === 'string'
    ? SCENES.find(s => s.id === idOrSpec)
    : idOrSpec;
  if(!spec) throw new Error('mountScene: no scene `' + idOrSpec + '`');
  const o = opts || {};

  const atoms = toAtoms(spec.params || {});
  const pView = view(atoms);
  const space = createSpace(spec.space, { extent: spec.extent });

  // Resolve the backend (instance | factory | default pixi).
  let backend;
  if(o.backend && typeof o.backend.apply === 'function') backend = o.backend;
  else if(typeof o.backend === 'function') backend = await o.backend();
  else backend = await createPixiBackend();

  if(space) backend.setSpace(space);
  if(container) backend.mountCanvas(container);

  let prev = [];   // last evaluated display list; [] means "first eval = baseline"

  function evaluate(t){ return spec.entities(pView, t); }

  // The driver's render tick: pure eval -> diff -> apply.
  function render(t){
    let next;
    try{ next = evaluate(t); }
    catch(e){ if(o.hooks && o.hooks.onError) o.hooks.onError(e); return; }
    backend.apply(diff(prev, next));
    prev = next;
  }

  const driver = createFrameDriver({ render });

  // One-way flow: any param write schedules a frame.
  const unsubs = Object.values(atoms).map(a => a.subscribe(() => driver.requestFrame()));

  // Context-loss recovery: params are the source of truth, so re-mount is
  // free — re-create the backend and replay from the current params.
  backend.onContextLost(async () => {
    try{
      backend = await createPixiBackend();
      if(space) backend.setSpace(space);
      if(container) backend.mountCanvas(container);
      prev = [];                 // force a full re-add from current params
      driver.requestFrame();
    }catch(e){ if(o.hooks && o.hooks.onError) o.hooks.onError(e); }
  });

  const controller = {
    params: atoms,
    driver,
    space,
    /** Pure: entities(paramsView, now). */
    evaluate(){ return evaluate(driver.now()); },
    /** Param snapshot for goal predicates (CONTRACT §7). */
    snapshot(){ return snapshot(atoms); },
    resize(w, h, dpr){ if(space) space.resize(w, h, dpr); backend.resize(w, h, dpr); driver.requestFrame(); },
    destroy(){ driver.destroy(); unsubs.forEach(u => u()); backend.unmount(); backend.destroy && backend.destroy(); },
  };

  driver.requestFrame();   // baseline render
  return controller;
}
