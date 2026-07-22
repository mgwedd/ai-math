/* ================================================================
   Scene Kit — Pixi v8 backend (SINGLETON). CONTRACT.md §6. Owner: kit-core.
   *** THE ONLY FILE IN THE REPO THAT MAY import pixi.js. ***

   STATUS: M2 skeleton. The frozen shape (dynamic import, singleton,
   canvas re-parenting, context-loss recovery) is fixed here now; the
   per-kind draw implementations land in M2.

   BUNDLE DISCIPLINE: pixi is loaded via dynamic import('pixi.js') INSIDE
   createPixiBackend() so it stays OUT of the initial auth-gate chunk —
   mirroring how components/Minima.jsx does `await import('@/lib/engine.js')`
   only after auth. Never add a top-level `import ... from 'pixi.js'`.

   SINGLETON: the lesson flow shows one scene at a time, so ONE shared
   Pixi Application (single WebGL context, canvas re-parented per scene)
   serves every plane2 scene. Browser context limits never bite.

   CONTEXT-LOSS RECOVERY: params are the source of truth, so recovery is
   free — on 'webglcontextlost' we notify via onContextLost(fn); scene.js
   re-creates the singleton and re-mounts the active scene from params.
   ================================================================ */

import { makeNode, resolveColor } from './draw.js';

let _app = null;   // the shared Pixi Application (created once, lazily)
let _PIXI = null;  // the dynamically-imported pixi namespace (cached)

/**
 * Get-or-create the singleton Pixi Application via dynamic import.
 * @returns {Promise<{app:Object, PIXI:Object}>}
 */
async function getApp(){
  if(_app) return { app: _app, PIXI: _PIXI };
  _PIXI = await import(/* webpackChunkName: "pixi" */ 'pixi.js');
  const app = new _PIXI.Application();
  await app.init({ antialias: true, autoDensity: true,
                   resolution: Math.min(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1, 2),
                   backgroundAlpha: 0 });
  _app = app;
  try{ if(typeof window !== 'undefined') window.__pixiRenderer = app.renderer.type; }catch(e){}
  return { app: _app, PIXI: _PIXI };
}

/**
 * Create the Pixi-backed renderer (CONTRACT §6). Dynamic-imports pixi on
 * first call. Returns a backend implementing the interface in backend.js.
 * @returns {Promise<Object>} backend
 */
export async function createPixiBackend(){
  const { app, PIXI } = await getApp();
  const nodes = new Map();        // entity key -> { node, redraw, destroy, frame }
  const layer = new PIXI.Container();   // this scene's MAIN display objects (one to clear/swap)
  app.stage.addChild(layer);
  let space = null, lostCb = null;
  let lastSize = { w: 0, h: 0, dpr: 1 };

  // INSET SUB-SPACE (CONTRACT Amendment v1.6 §6). A second container in the SAME
  // WebGL context / rAF, with its own transform (translated to the rect), a clip
  // mask, and a subtle grid-token chrome. frame:'inset' entities route here.
  let insetSpace = null, insetRect = null;
  let insetContainer = null, insetMask = null, insetChrome = null;

  // Resolve routing: an 'inset' frame only counts when an inset is live, else it
  // falls back to main (validateScenes rejects the mismatch; the backend stays
  // graceful). spaceFor/containerFor pick the draw transform + parent.
  const frameOf = (e) => (e && e.frame === 'inset' && insetContainer) ? 'inset' : 'main';
  const spaceFor = (frame) => (frame === 'inset' && insetSpace) ? insetSpace : space;
  const containerFor = (frame) => (frame === 'inset' && insetContainer) ? insetContainer : layer;

  // Position + size the inset from its fraction-of-canvas rect against the last
  // known canvas size: size the sub-space to the rect's pixel box (origin
  // centered in it), translate the container to the rect's top-left, redraw the
  // chrome, and rebuild the mask in stage coords. Idempotent; called by both
  // setInset and resize. A degenerate/zero size is a no-op (keeps last good).
  function applyInsetGeometry(){
    if(!insetContainer || !insetRect) return;
    const { w, h, dpr } = lastSize;
    if(!(w > 0) || !(h > 0)) return;
    const [fx, fy, fw, fh] = insetRect;
    const rx = fx * w, ry = fy * h, rw = fw * w, rh = fh * h;
    if(insetSpace && insetSpace.resize) insetSpace.resize(rw, rh, dpr);
    insetContainer.x = rx; insetContainer.y = ry;
    // chrome: subtle fill + 1px border tracing the rect (grid/axis token family),
    // in container-local coords [0..rw]x[0..rh].
    insetChrome.clear();
    insetChrome.rect(0, 0, rw, rh).fill({ color: resolveColor('grid'), alpha: 0.14 });
    insetChrome.rect(0.5, 0.5, rw - 1, rh - 1).stroke({ width: 1, color: resolveColor('axis'), alpha: 0.5 });
    // mask: the rect region in STAGE coords (clips the container to the box).
    insetMask.clear();
    insetMask.rect(rx, ry, rw, rh).fill(0xffffff);
  }

  // WebGL context-loss hook — see recovery note in the header. The handler is
  // kept as a named ref and removed on unmount/destroy (DEFECT: the old code
  // added a listener to the SHARED singleton canvas on EVERY mount and never
  // removed it — after N mounts a single real context-loss fired N racing
  // recovery closures). Exactly one live listener per active backend now.
  const canvas = app.canvas;
  const onContextLostEvt = (e) => { if(e && e.preventDefault) e.preventDefault(); if(lostCb) lostCb(); };
  canvas.addEventListener('webglcontextlost', onContextLostEvt);
  let listenerLive = true;
  function detachListener(){
    if(!listenerLive) return;
    listenerLive = false;
    if(canvas && canvas.removeEventListener) canvas.removeEventListener('webglcontextlost', onContextLostEvt);
  }

  function teardownInset(){
    if(!insetContainer) return;
    insetContainer.mask = null;
    if(insetMask.parent) insetMask.parent.removeChild(insetMask);
    insetMask.destroy();
    if(insetContainer.parent) insetContainer.parent.removeChild(insetContainer);
    insetContainer.destroy({ children: true });   // chrome + any orphaned inset nodes
    insetContainer = insetMask = insetChrome = null;
    insetSpace = insetRect = null;
  }

  return {
    mountCanvas(parentEl){ parentEl.appendChild(app.canvas); },
    resize(w, h, dpr){ lastSize = { w, h, dpr: Math.min(dpr || 1, 2) }; app.renderer.resolution = lastSize.dpr; app.renderer.resize(w, h); applyInsetGeometry(); },
    setSpace(s){ space = s; },
    // INSET SUB-SPACE (v1.6): create the second container (transform + clip mask
    // + chrome) once and place it ABOVE the main layer in the SAME context/rAF.
    setInset(s, rect){
      insetSpace = s; insetRect = rect;
      if(!insetContainer){
        insetContainer = new PIXI.Container();
        insetChrome = new PIXI.Graphics();
        insetContainer.addChild(insetChrome);      // chrome under the inset entities
        insetMask = new PIXI.Graphics();
        app.stage.addChild(insetMask);             // mask must live in the display tree
        insetContainer.mask = insetMask;
        app.stage.addChild(insetContainer);        // above main layer -> draws on top
      }
      applyInsetGeometry();
    },
    clearInset(){ teardownInset(); },
    apply(ops){
      // Diff ops (CONTRACT §4) -> Pixi. Simple by design (clear+redraw the one
      // Graphics per entity): CPU is ~4% of budget, so keep paths short. v1.6:
      // route each entity to its frame's container/space; a frame CHANGE
      // re-parents the display object (no diff partitioning — §4).
      for(const op of ops){
        if(op.type === 'add'){
          const frame = frameOf(op.entity);
          const n = makeNode(PIXI, op.entity, spaceFor(frame));
          n.frame = frame;
          nodes.set(op.key, n); containerFor(frame).addChild(n.node);
        }else if(op.type === 'update'){
          const n = nodes.get(op.key); if(!n) continue;
          const frame = frameOf(op.entity);
          if(n.frame !== frame){                    // re-parent across frames
            containerFor(n.frame).removeChild(n.node);
            n.frame = frame;
            containerFor(frame).addChild(n.node);
          }
          n.redraw(op.entity, spaceFor(frame));
        }else if(op.type === 'remove'){
          const n = nodes.get(op.key);
          if(n){ containerFor(n.frame).removeChild(n.node); n.destroy(); nodes.delete(op.key); }
        }
      }
    },
    clear(){ for(const n of nodes.values()){ containerFor(n.frame).removeChild(n.node); n.destroy(); } nodes.clear(); },
    onContextLost(fn){ lostCb = fn; },
    unmount(){ detachListener(); if(app.canvas && app.canvas.parentNode) app.canvas.parentNode.removeChild(app.canvas); },
    destroy(){ detachListener(); this.clear(); teardownInset(); if(layer.parent) layer.parent.removeChild(layer); layer.destroy({ children: true }); },
    // dev/test introspection (NOT part of the frozen backend interface): the
    // Pixi Application, so a headless perf harness can force GPU submits in a
    // tab where rAF/the ticker is throttled.
    _app: app,
    // v1.6 inset introspection: the live inset container/mask/chrome/space/rect
    // (null when no inset), and an entity's resolved frame, so tests assert the
    // second-space plumbing without reaching into the shared singleton stage.
    get _inset(){ return insetContainer ? { container: insetContainer, mask: insetMask, chrome: insetChrome, space: insetSpace, rect: insetRect } : null; },
    // resolved frame per entity — SAME seam name as the null backend (_frameOf)
    // so tests read routing the same way on either backend.
    _frameOf(key){ const n = nodes.get(key); return n && n.frame; },
  };
}

/** Tear down the singleton entirely (rare — e.g. hard context-loss recovery). */
export function destroyPixiSingleton(){
  if(_app){ _app.destroy(true); _app = null; }
}

// CONTRACT §6 names the renderer factory `createRenderer`. The implementation
// grew up as `createPixiBackend`; export the contract name as an alias (both
// stay valid) so call sites can bind to the frozen name without a rename churn.
export { createPixiBackend as createRenderer };
