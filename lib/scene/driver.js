/* ================================================================
   Scene Kit — the single rAF frame driver. CONTRACT.md §5.
   Owner: kit-core. THIS is the frame boundary with MOTION.

   Dirty-flag discipline: rAF runs ONLY while there is a live source
   or a pending single-frame request. Motion's clock/tween/sim never
   touch rAF — they attach per-frame sources via addSource().
   ================================================================ */

const DT_CLAMP = 1 / 15;   // s — cap per-frame dt so a tab-stall can't jump a sim

/**
 * @param {{render:(t:number,dt:number)=>void,
 *          raf?:(cb:(ms:number)=>void)=>number,
 *          caf?:(id:number)=>void}} opts
 *   render(t,dt) is kit-core's render tick, always run LAST each frame.
 *   raf/caf default to globalThis.requestAnimationFrame/cancelAnimationFrame
 *   (injectable for headless unit tests).
 * @returns FrameDriver — see CONTRACT.md §5 for the frozen surface.
 */
export function createFrameDriver({ render, raf, caf } = {}){
  const RAF = raf || (typeof globalThis !== 'undefined' && globalThis.requestAnimationFrame) || null;
  const CAF = caf || (typeof globalThis !== 'undefined' && globalThis.cancelAnimationFrame) || null;

  const sources = new Set();   // per-frame updater fns (motion tweens/sims)
  let t = 0;                   // scene time, seconds, excludes paused spans
  let lastMs = null;           // wall clock of previous frame
  let pending = false;         // a single requestFrame() is queued
  let paused = false;
  let rafId = null;
  let dead = false;

  function running(){ return rafId != null; }
  function wantFrame(){ return !paused && !dead && (sources.size > 0 || pending); }

  function start(){
    if(running() || !wantFrame() || !RAF) return;
    lastMs = null;                       // first frame after a (re)start has dt=0
    rafId = RAF(frame);
  }
  function stop(){
    if(rafId != null && CAF) CAF(rafId);
    rafId = null;
  }

  function frame(ms){
    rafId = null;
    if(!wantFrame()) return;             // nothing to do; stay stopped
    let dt = lastMs == null ? 0 : (ms - lastMs) / 1000;
    if(dt > DT_CLAMP) dt = DT_CLAMP;     // tab-stall protection
    lastMs = ms;
    t += dt;
    // advance motion's sources (they write params) BEFORE render, in order
    for(const fn of sources){ try{ fn(t, dt); }catch(e){} }
    pending = false;
    try{ render(t, dt); }catch(e){}
    if(wantFrame()) rafId = RAF(frame); // keep looping while a source/req lives
  }

  const driver = {
    /** Schedule ONE render (coalesced). Used by param.set / discrete input. */
    requestFrame(){ pending = true; start(); },
    /** Register a continuous per-frame updater fn(t,dt). @returns {{release():void}} */
    addSource(fn){
      sources.add(fn); start();
      return { release(){ sources.delete(fn); } };
    },
    /** Current scene time t (seconds, monotonic, excludes paused spans). */
    now(){ return t; },
    pause(){ if(paused) return; paused = true; stop(); },
    resume(){ if(!paused) return; paused = false; start(); },
    isPaused(){ return paused; },
    destroy(){ dead = true; stop(); sources.clear(); },
  };
  return driver;
}
