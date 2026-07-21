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

let _app = null;   // the shared Pixi Application (created once, lazily)

/**
 * Get-or-create the singleton Pixi Application via dynamic import.
 * @returns {Promise<Object>} the Pixi Application
 */
async function getApp(){
  if(_app) return _app;
  const PIXI = await import(/* webpackChunkName: "pixi" */ 'pixi.js');
  const app = new PIXI.Application();
  await app.init({ antialias: true, autoDensity: true,
                   resolution: Math.min(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1, 2),
                   backgroundAlpha: 0 });
  _app = app;
  return _app;
}

/**
 * Create the Pixi-backed renderer (CONTRACT §6). Dynamic-imports pixi on
 * first call. Returns a backend implementing the interface in backend.js.
 * @returns {Promise<Object>} backend
 */
export async function createPixiBackend(){
  const app = await getApp();
  const objects = new Map();     // entity key -> Pixi display object
  let space = null, lostCb = null;

  // WebGL context-loss hook — see recovery note in the header.
  const canvas = app.canvas;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if(lostCb) lostCb(); });

  return {
    mountCanvas(parentEl){ parentEl.appendChild(app.canvas); },
    resize(w, h, dpr){ app.renderer.resolution = Math.min(dpr || 1, 2); app.renderer.resize(w, h); },
    setSpace(s){ space = s; },
    apply(ops){
      // M2: map each op to Pixi Graphics/Mesh per entity kind, using
      // space.toScreen for world->px. add -> create+stage; update ->
      // redraw changed props; remove -> destroy+unstage.
      throw new Error('createPixiBackend.apply: implemented in M2');
    },
    clear(){ for(const o of objects.values()) o.destroy && o.destroy(); objects.clear(); },
    onContextLost(fn){ lostCb = fn; },
    unmount(){ if(app.canvas.parentNode) app.canvas.parentNode.removeChild(app.canvas); },
    destroy(){ this.clear(); },
  };
}

/** Tear down the singleton entirely (rare — e.g. hard context-loss recovery). */
export function destroyPixiSingleton(){
  if(_app){ _app.destroy(true); _app = null; }
}
