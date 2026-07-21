/* ================================================================
   Scene Kit — mountScene runtime: the integration surface.
   CONTRACT.md §8. Owner: kit-core.

   Wires space + renderer backend + frame driver + params into one
   controller. Motion attaches tween/sim sources to controller.driver;
   interaction attaches handles/goals using controller.space +
   controller.params. The render tick is: evaluate -> partition readout
   labels to the DOM strip -> diff canvas entities -> backend.apply,
   installed as the driver's render(). A param write schedules a frame
   (one-way flow: input -> params -> entities -> draw).
   ================================================================ */

import { toAtoms, view, snapshot, makeRng } from './params.js';
import { createSpace } from './space/index.js';
import { createFrameDriver } from './driver.js';
import { diff } from './diff.js';
import { createPixiBackend } from './renderer/pixi.js';
import { createNullBackend } from './renderer/backend.js';
import { SCENES } from './registry.js';

// label(at:'readout') entities mirror canvas state into the DOM for screen
// readers (CONTRACT §3) — pulled out here so the backend only ever sees
// on-canvas entities.
function isReadout(e){ return e.kind === 'label' && e.at === 'readout'; }
function readoutText(e){ return typeof e.text === 'function' ? e.text() : e.text; }

/**
 * @param {string|Object} idOrSpec a registered scene id or a spec object
 * @param {HTMLElement} container DOM node to mount the canvas + readout into
 * @param {{ backend?:Object|(()=>Promise<Object>),
 *           hooks?:{onGoal?:Function,onError?:Function,onReadout?:(string[])=>void} }} [opts]
 *   backend: a backend instance, a factory, or omitted. A 'plane2' scene
 *   defaults to the Pixi singleton; a 'free' scene defaults to the null
 *   backend so a pure-DOM lesson never triggers the pixi dynamic import.
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
  const space = createSpace(spec.space, { extent: spec.extent });   // null for 'free'

  // Resolve the backend. Explicit wins; else 'free' -> null backend (NO pixi
  // import — bundle discipline), 'plane2' -> Pixi singleton.
  let backend;
  if(o.backend && typeof o.backend.apply === 'function') backend = o.backend;
  else if(typeof o.backend === 'function') backend = await o.backend();
  else if(spec.space === 'free') backend = createNullBackend();
  else backend = await createPixiBackend();

  if(space) backend.setSpace(space);
  if(container) backend.mountCanvas(container);

  // DOM readout strip (a11y): lazily created under the container.
  let readoutEl = null;
  function writeReadout(items){
    if(o.hooks && o.hooks.onReadout) o.hooks.onReadout(items);
    if(!container) return;
    if(!readoutEl && items.length){
      readoutEl = (typeof document !== 'undefined') ? document.createElement('div') : null;
      if(readoutEl){ readoutEl.className = 'scene-readout'; readoutEl.setAttribute('aria-live', 'polite'); container.appendChild(readoutEl); }
    }
    if(readoutEl) readoutEl.textContent = items.join('  ·  ');
  }

  let prev = [];   // last canvas entity list; [] means "first eval = baseline"

  function evaluate(t){ return spec.entities(pView, t); }

  // Driver render tick: pure eval -> split readout -> diff canvas -> apply.
  function render(t){
    let next;
    try{ next = evaluate(t); }
    catch(e){ if(o.hooks && o.hooks.onError) o.hooks.onError(e); return; }
    const canvas = [], reads = [];
    for(const e of next){ if(isReadout(e)) reads.push(readoutText(e)); else canvas.push(e); }
    writeReadout(reads);
    backend.apply(diff(prev, canvas));
    prev = canvas;
  }

  // raf/caf may be injected (test seam) so a headless run can pump frames.
  const driver = createFrameDriver({ render, raf: o.raf, caf: o.caf });

  // One-way flow: any param write schedules a frame.
  const unsubs = Object.values(atoms).map(a => a.subscribe(() => driver.requestFrame()));

  // Context-loss recovery: params are the source of truth, so re-mount is free
  // — re-create the backend and replay from the current params. (Pixi only.)
  if(spec.space !== 'free') backend.onContextLost(async () => {
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
    /**
     * Reroll params for a fresh capstone attempt (CONTRACT §1/§8). Calls the
     * scene's optional randomize(rng) with a SEEDABLE rng (deterministic under
     * an explicit seed, for tests) and writes results through the atoms so the
     * one-way flow + baseline re-eval hold. No-op when the scene has no
     * randomize. @param {number} [seed] @returns the applied snapshot.
     */
    newAttempt(seed){
      if(typeof spec.randomize === 'function'){
        const patch = spec.randomize(makeRng(seed)) || {};
        for(const k in patch){ if(atoms[k]) atoms[k].set(patch[k]); }
      }
      return snapshot(atoms);
    },
    resize(w, h, dpr){ if(space) space.resize(w, h, dpr); backend.resize(w, h, dpr); driver.requestFrame(); },
    destroy(){ driver.destroy(); unsubs.forEach(u => u()); if(readoutEl && readoutEl.remove) readoutEl.remove(); backend.unmount(); backend.destroy && backend.destroy(); },
  };

  driver.requestFrame();   // baseline render
  return controller;
}
