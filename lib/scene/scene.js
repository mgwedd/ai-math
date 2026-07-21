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
import { createPixiBackend, destroyPixiSingleton } from './renderer/pixi.js';
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

  // CONTRACT §8 types the third param as `hooks` ({onGoal, onError}); the repo's
  // internal call sites pass an OPTS object ({backend, raf, caf, hooks:{...}}).
  // Conform to both: hook fns are read from `o.hooks` when present, else from `o`
  // directly (a plain contract-style hooks object). backend/raf/caf stay on `o`.
  const hooks = o.hooks || o;

  const atoms = toAtoms(spec.params || {});
  const pView = view(atoms);
  const space = createSpace(spec.space, { extent: spec.extent });   // null for 'free'

  // Resolve the backend + a REBUILD strategy for context-loss recovery.
  // DEFECT: the old instance-vs-factory test was `typeof o.backend.apply ===
  // 'function'` — but EVERY function has Function.prototype.apply, so a backend
  // FACTORY was mis-detected as an instance and setSpace() threw. Check the
  // factory (a function) FIRST; a backend instance is a plain object.
  let backend, rebuild = null;   // rebuild: () => backend|Promise<backend>, or null (fixed instance)
  if(typeof o.backend === 'function'){
    rebuild = o.backend;                          // injected factory: reuse it on recovery
    backend = await rebuild();
  }else if(o.backend && typeof o.backend.apply === 'function'){
    backend = o.backend;                          // fixed instance: cannot rebuild a fresh one
  }else if(spec.space === 'free'){
    rebuild = () => createNullBackend();
    backend = rebuild();
  }else{
    backend = await createPixiBackend();          // Pixi singleton (dynamic-imported)
    // On recovery, tear the lost singleton DOWN before re-creating it —
    // getApp() returns the cached _app otherwise, so a lost context would never
    // actually be replaced (destroyPixiSingleton was dead code before this).
    rebuild = async () => { destroyPixiSingleton(); return createPixiBackend(); };
  }

  if(space) backend.setSpace(space);
  if(container) backend.mountCanvas(container);

  // DOM readout strip (a11y): lazily created under the container.
  let readoutEl = null;
  function writeReadout(items){
    if(hooks.onReadout) hooks.onReadout(items);
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
  // `prev` is committed ONLY after a clean apply — a throw anywhere (evaluate,
  // a label text fn, diff, or backend.apply) must NOT leave `prev` advanced past
  // what the backend actually holds (the old code swallowed the error and the
  // next diff desynced). onError is notified, then the error propagates.
  function render(t){
    let reads;
    try{
      const next = evaluate(t);
      const canvas = []; reads = [];
      for(const e of next){ if(isReadout(e)) reads.push(readoutText(e)); else canvas.push(e); }
      const ops = diff(prev, canvas);
      backend.apply(ops);
      prev = canvas;                 // commit only on a fully successful apply
    }catch(e){
      if(hooks.onError) hooks.onError(e);
      throw e;                       // let it propagate — do not silently continue
    }
    writeReadout(reads);
  }

  // raf/caf may be injected (test seam) so a headless run can pump frames.
  const driver = createFrameDriver({ render, raf: o.raf, caf: o.caf });

  // One-way flow: any param write schedules a frame.
  const unsubs = Object.values(atoms).map(a => a.subscribe(() => driver.requestFrame()));

  // Context-loss recovery (CONTRACT §6/§8): params are the source of truth, so
  // re-mount is free — on loss, UNMOUNT the old backend (else its layer + its
  // context-lost listener leak), REBUILD a fresh backend (for Pixi this tears
  // down and re-creates the singleton), remount, RE-ARM recovery on the new
  // backend, and replay the whole display list from current params exactly once.
  let recovering = false;
  async function recover(){
    if(recovering) return;                 // one recovery at a time
    recovering = true;
    try{
      if(rebuild){
        const old = backend;
        old.unmount();                     // detach old canvas + remove its one listener
        backend = await rebuild();         // fresh Application / backend instance
        if(space) backend.setSpace(space);
        if(container) backend.mountCanvas(container);
        armRecovery();                     // exactly one live listener follows the active backend
      }
      prev = [];                           // force a full re-add from current params
      driver.requestFrame();
    }catch(e){ if(hooks.onError) hooks.onError(e); }
    finally{ recovering = false; }
  }
  function armRecovery(){
    if(spec.space === 'free') return;      // null/DOM backend has no WebGL context to lose
    if(backend.onContextLost) backend.onContextLost(recover);
  }
  armRecovery();

  // LEARNER-INPUT GATE (CONTRACT v1.2 §7): no goal of any type may credit
  // until >=1 learner interaction has been observed since mount. Input
  // surfaces (interaction's pointer/keyboard rigs, kit sliders/chips/scrub)
  // call markLearnerInput(); goal runtimes consult hasLearnerInput() at
  // crediting time. Mount tweens / auto-run sims never mark it.
  let learnerInput = false;

  const controller = {
    params: atoms,
    driver,
    space,
    /** Pure: entities(paramsView, now). */
    evaluate(){ return evaluate(driver.now()); },
    /** Param snapshot for goal predicates (CONTRACT §7). */
    snapshot(){ return snapshot(atoms); },
    /** Record a learner interaction (CONTRACT v1.2 §7). Called by input surfaces only. */
    markLearnerInput(){ learnerInput = true; },
    /** True once a learner interaction has occurred since mount / last newAttempt. */
    hasLearnerInput(){ return learnerInput; },
    /**
     * Reroll params for a fresh capstone attempt (CONTRACT §1/§8). Calls the
     * scene's optional randomize(rng) with a SEEDABLE rng (deterministic under
     * an explicit seed, for tests) and writes results through the atoms so the
     * one-way flow + baseline re-eval hold. No-op when the scene has no
     * randomize. @param {number} [seed] @returns the applied snapshot.
     */
    newAttempt(seed){
      learnerInput = false;   // v1.2: fresh attempt requires fresh learner input
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
