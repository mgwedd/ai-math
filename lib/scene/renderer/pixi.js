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

import { makeNode } from './draw.js';

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
  const nodes = new Map();        // entity key -> { node, redraw, destroy }
  const layer = new PIXI.Container();   // this scene's display objects (one to clear/swap)
  app.stage.addChild(layer);
  let space = null, lostCb = null;

  // WebGL context-loss hook — see recovery note in the header.
  const canvas = app.canvas;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if(lostCb) lostCb(); });

  return {
    mountCanvas(parentEl){ parentEl.appendChild(app.canvas); },
    resize(w, h, dpr){ app.renderer.resolution = Math.min(dpr || 1, 2); app.renderer.resize(w, h); },
    setSpace(s){ space = s; },
    apply(ops){
      // Diff ops (CONTRACT §4) -> Pixi. Simple by design (clear+redraw the
      // one Graphics per entity): CPU is ~4% of budget, so keep paths short.
      for(const op of ops){
        if(op.type === 'add'){
          const n = makeNode(PIXI, op.entity, space);
          nodes.set(op.key, n); layer.addChild(n.node);
        }else if(op.type === 'update'){
          const n = nodes.get(op.key); if(n) n.redraw(op.entity, space);
        }else if(op.type === 'remove'){
          const n = nodes.get(op.key);
          if(n){ layer.removeChild(n.node); n.destroy(); nodes.delete(op.key); }
        }
      }
    },
    clear(){ for(const n of nodes.values()){ layer.removeChild(n.node); n.destroy(); } nodes.clear(); },
    onContextLost(fn){ lostCb = fn; },
    unmount(){ if(app.canvas.parentNode) app.canvas.parentNode.removeChild(app.canvas); },
    destroy(){ this.clear(); if(layer.parent) layer.parent.removeChild(layer); layer.destroy({ children: true }); },
    // dev/test introspection (NOT part of the frozen backend interface): the
    // Pixi Application, so a headless perf harness can force GPU submits in a
    // tab where rAF/the ticker is throttled.
    _app: app,
  };
}

/** Tear down the singleton entirely (rare — e.g. hard context-loss recovery). */
export function destroyPixiSingleton(){
  if(_app){ _app.destroy(true); _app = null; }
}
