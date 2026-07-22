/* ================================================================
   Scene Kit — renderer-backend interface + null/headless backend.
   CONTRACT.md §6. Owner: kit-core.

   RENDERER-AGNOSTIC RULE: only renderer/pixi.js may import pixi.js.
   Everything upstream deals in plain data (entity descriptors + diff
   ops). A backend consumes diff ops (CONTRACT §4) and knows nothing
   else. The interface below is the frozen surface every backend
   implements.

   Backend interface (informative — enforced by duck typing, not a class):
     mountCanvas(parentEl)   re-parent the shared canvas into the scene
     resize(w, h, dpr)
     setSpace(space)         world->screen transform source (CONTRACT §6)
     setInset(space, rect)   declare the inset sub-space (v1.6) — rect is
                             fraction-of-canvas [x,y,w,h]; frame:'inset'
                             entities route here at apply time
     clearInset()            drop the inset sub-space
     apply(ops)              consume diff ops (add/update/remove)
     clear()                 remove all display objects
     onContextLost(fn)       register a WebGL-context-lost callback
     unmount()               detach canvas, keep the singleton alive
     destroy()               tear down (rare)
   ================================================================ */

/**
 * Headless backend for tests and the purity harness: records apply() ops and
 * holds a mirror of the current display list, with no GPU/DOM. Lets diff +
 * scene-runtime tests run in the node vitest env.
 */
export function createNullBackend(opts){
  // Op-history recording is OPT-IN: a `free`-space production scene running an
  // endless animation would otherwise grow `applied` without bound (a real leak
  // — the null backend is the SHIPPING backend for pure-DOM lessons, not just a
  // test double). Tests that introspect the op stream pass `{ record: true }`.
  const record = !!(opts && opts.record);
  const objects = new Map();     // key -> latest entity descriptor (always kept)
  const frames = new Map();      // key -> resolved frame ('main'|'inset') — headless seam (v1.6)
  const applied = [];            // op history — only populated when record=true
  let space = null, lostCb = null, size = { w: 0, h: 0, dpr: 1 };
  let inset = null;              // { space, rect } when an inset is declared (v1.6)
  let sliderSink = null;         // apply path wired by mountScene (control seam)

  // Resolve an entity's frame the SAME way the pixi backend routes it: an
  // `inset` frame only counts when an inset is actually declared, else it falls
  // back to `main` (mirrors real routing; validateScenes rejects the mismatch).
  const resolveFrame = (e) => (e && e.frame === 'inset' && inset) ? 'inset' : 'main';

  return {
    mountCanvas(){ /* no-op */ },
    resize(w, h, dpr){ size = { w, h, dpr }; },
    setSpace(s){ space = s; },
    // INSET SUB-SPACE (CONTRACT Amendment v1.6 §6): the null backend has no GPU,
    // so it just mirrors the two calls and records each entity's resolved frame
    // (the headless seam tests assert routing against).
    setInset(s, rect){ inset = { space: s, rect }; },
    clearInset(){ inset = null; },
    apply(ops){
      for(const op of ops){
        if(record) applied.push(op);
        if(op.type === 'add' || op.type === 'update'){ objects.set(op.key, op.entity); frames.set(op.key, resolveFrame(op.entity)); }
        else if(op.type === 'remove'){ objects.delete(op.key); frames.delete(op.key); }
      }
    },
    clear(){ objects.clear(); frames.clear(); },
    onContextLost(fn){ lostCb = fn; },
    unmount(){ /* no-op */ },
    destroy(){ objects.clear(); frames.clear(); applied.length = 0; sliderSink = null; inset = null; },
    // CONTROL SEAM (CONTRACT §3, Amendment v1.4): headless drive path so peers
    // can exercise sliders in the node vitest env with NO DOM. mountScene binds
    // the real apply path via _bindControls; a test injects this null backend
    // and calls setSliderValue(key, value) to simulate a learner moving a
    // slider — same path as a real <input> (writes the atom + opens the gate).
    setSliderValue(key, value){ if(sliderSink) sliderSink(key, value); },
    _bindControls(fn){ sliderSink = fn; },   // kit-internal (mountScene -> backend)
    // test-only introspection (not part of the frozen backend interface):
    _objects: objects, _applied: applied, _frames: frames,
    _frameOf(key){ return frames.get(key); },     // resolved frame per entity (v1.6 headless seam)
    get _space(){ return space; }, get _size(){ return size; },
    get _inset(){ return inset; },
    _emitContextLost(){ if(lostCb) lostCb(); },
  };
}
