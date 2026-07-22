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
import { controlProblems, controlBindProblems } from './seams/controls.js';

// label(at:'readout') entities mirror canvas state into the DOM for screen
// readers (CONTRACT §3) — pulled out here so the backend only ever sees
// on-canvas entities.
function isReadout(e){ return e.kind === 'label' && e.at === 'readout'; }
function readoutText(e){ return typeof e.text === 'function' ? e.text() : e.text; }

// Decimal places implied by a slider step, so quantized atom values stay clean:
// 0.1-step snapping otherwise writes 0.30000000000000004 into the atom (goal
// predicates read that) and the default readout shows it. Capped for safety.
function stepDecimals(step){
  const s = String(step);
  if(s.indexOf('e') >= 0 || s.indexOf('E') >= 0) return 6;   // scientific notation → fallback
  const dot = s.indexOf('.');
  return dot < 0 ? 0 : Math.min(s.length - dot - 1, 12);
}

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

  // INLINE-SPEC GUARD (v1.4): registered scenes are validated at registerScene +
  // validateScenes, but engine.js passes INLINE scene OBJECTS from a lesson's
  // scenes:[...] straight to mountScene (lib/engine.js) — those bypass BOTH.
  // Re-validate controls here (shape + bind) for an object spec so a min>max /
  // out-of-range / duplicate slider fails LOUD at mount, before any backend is
  // acquired, instead of rendering a permanently-stuck control.
  if(typeof idOrSpec !== 'string' && spec.controls != null){
    const cp = [];
    if(!Array.isArray(spec.controls)) cp.push('`controls` must be an array');
    else spec.controls.forEach((c, i) => cp.push(...controlProblems(c, i)));
    cp.push(...controlBindProblems(spec.controls, atoms));
    if(cp.length) throw new Error('mountScene(' + (spec.id || 'inline') + '): ' + cp.join('; '));
  }

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
        // Re-arm the headless control seam on the FRESH backend (a rebuilt null
        // backend has no sliderSink) so setSliderValue keeps working post-recovery.
        if(controls.length && backend._bindControls) backend._bindControls(driveSlider);
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

  // CONTROL OVERLAY (CONTRACT §3, Amendment v1.4): `slider` controls render as
  // accessible DOM <input type="range"> overlays under the container. They write
  // THROUGH the bound atom (one-way flow) and COUNT AS LEARNER INPUT — a move
  // opens the gate. The atom is the SINGLE source of truth: the input position
  // follows the atom (so a newAttempt() reroll or any other write moves the
  // slider) with NO shadow state. Built once at mount; disposed in destroy()
  // (no leaked nodes/listeners across scene switches).
  const controls = Array.isArray(spec.controls) ? spec.controls : [];
  let controlsEl = null;
  const controlSubs = [];   // atom subscriptions that sync input positions -> unwired on destroy

  // The SINGLE apply path shared by a real <input> event and the headless
  // setSliderValue() seam: clamp -> snap -> re-clamp, mark learner input, write
  // the atom (which schedules a frame via the one-way-flow subscription above).
  function applySlider(desc, raw){
    const atom = atoms[desc.param];
    if(!atom) return;
    let v = +raw;
    if(!Number.isFinite(v)) return;
    if(desc.step > 0){
      v = desc.min + Math.round((v - desc.min) / desc.step) * desc.step;
      v = +v.toFixed(stepDecimals(desc.step));   // kill 0.30000000000000004 float noise in the ATOM
    }
    if(v < desc.min) v = desc.min;
    if(v > desc.max) v = desc.max;
    learnerInput = true;      // a slider move IS learner input (opens the gate)
    atom.set(v);
  }
  function driveSlider(key, value){
    const desc = controls.find(c => c.kind === 'slider' && c.param === key);
    if(!desc) throw new Error('setSliderValue: no slider bound to param `' + key + '`');
    applySlider(desc, value);
  }
  // Headless drive: a null/DOM backend exposes _bindControls so tests can call
  // backend.setSliderValue(key, value) with no <input> present.
  if(controls.length && backend._bindControls) backend._bindControls(driveSlider);

  // Real-DOM overlay (only with a container + a document; a headless run drives
  // sliders through the backend seam instead). Deferred into a function CALLED
  // after the controller exists — it runs author code (desc.format via the
  // initial sync), and a throw there must tear the whole controller down (F1),
  // which only exists below.
  function mountControlOverlay(){
    if(!(controls.length && container && typeof document !== 'undefined')) return;
    controlsEl = document.createElement('div');
    controlsEl.className = 'scene-controls';
    for(const desc of controls){
      if(desc.kind !== 'slider') continue;
      const atom = atoms[desc.param];
      if(!atom) continue;
      const labelText = desc.label || desc.param;
      const wrap = document.createElement('label');
      wrap.className = 'scene-control scene-control-slider';
      const name = document.createElement('span');
      name.className = 'scene-control-label'; name.textContent = labelText;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(desc.min); input.max = String(desc.max);
      // Native <input type=range> defaults to step=1; an author who omits step
      // wants a CONTINUOUS track, so declare step="any" (not the browser default).
      input.step = desc.step > 0 ? String(desc.step) : 'any';
      input.setAttribute('aria-label', labelText);
      const valEl = document.createElement('span');
      valEl.className = 'scene-control-value';
      const fmt = (v) => desc.format ? desc.format(v) : String(v);
      // A range input's thumb can only sit in [min,max]; if the atom holds an
      // out-of-range value (a stray randomize draw, say) the browser clamps the
      // thumb — so clamp the READOUT to the SAME value so they never diverge (F2).
      const clamp = (v) => v < desc.min ? desc.min : (v > desc.max ? desc.max : v);
      const sync = (v) => { const shown = clamp(v), s = String(shown); if(input.value !== s) input.value = s; valEl.textContent = fmt(shown); };
      sync(atom.get());
      input.addEventListener('input', () => applySlider(desc, input.valueAsNumber));
      // Atom is the source of truth: external writes (newAttempt, other controls)
      // reflect back into the slider WITHOUT re-marking learner input.
      controlSubs.push(atom.subscribe(sync));
      wrap.appendChild(name); wrap.appendChild(input); wrap.appendChild(valEl);
      controlsEl.appendChild(wrap);
    }
    container.appendChild(controlsEl);
  }

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
    destroy(){ driver.destroy(); unsubs.forEach(u => u()); controlSubs.forEach(u => u()); if(controlsEl && controlsEl.remove) controlsEl.remove(); if(readoutEl && readoutEl.remove) readoutEl.remove(); backend.unmount(); backend.destroy && backend.destroy(); },
  };

  // F1: build the DOM overlay now that a controller exists to tear down. The
  // overlay runs author code (desc.format); a throw after the backend is mounted
  // and the atom/recovery listeners are armed would otherwise leak all of them.
  try{ mountControlOverlay(); }
  catch(e){ controller.destroy(); throw e; }

  driver.requestFrame();   // baseline render
  return controller;
}
