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
  const applied = [];            // op history — only populated when record=true
  let space = null, lostCb = null, size = { w: 0, h: 0, dpr: 1 };

  return {
    mountCanvas(){ /* no-op */ },
    resize(w, h, dpr){ size = { w, h, dpr }; },
    setSpace(s){ space = s; },
    apply(ops){
      for(const op of ops){
        if(record) applied.push(op);
        if(op.type === 'add' || op.type === 'update') objects.set(op.key, op.entity);
        else if(op.type === 'remove') objects.delete(op.key);
      }
    },
    clear(){ objects.clear(); },
    onContextLost(fn){ lostCb = fn; },
    unmount(){ /* no-op */ },
    destroy(){ objects.clear(); applied.length = 0; },
    // test-only introspection (not part of the frozen backend interface):
    _objects: objects, _applied: applied,
    get _space(){ return space; }, get _size(){ return size; },
    _emitContextLost(){ if(lostCb) lostCb(); },
  };
}
