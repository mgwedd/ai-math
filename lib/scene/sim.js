/* lib/scene/sim.js — fixed-timestep simulation loop for the Scene Kit.
 *
 * OWNERSHIP: Motion & Simulation. This is what makes game/free-running scenes
 * (steering the descent ball, episode outcomes) first-class — the replacement
 * for the two hand-rolled setInterval labs in lib/curriculum/index.js.
 *
 * DISCIPLINE (see coordination/motion.md): all clock logic is deterministic.
 * Real time NEVER enters here directly — no Date.now()/performance.now(). The
 * only input is the `now` (ms) handed in by the frame driver's tick, so a
 * fabricated `now` sequence makes the whole loop unit-testable. Visibility is
 * an injected adapter, not a direct `document` read.
 *
 * The accumulator + panic cap is the canonical "fix your timestep" pattern
 * (gafferongames): render frames come at arbitrary deltas, but the physics
 * step is always exactly `dt`, so behaviour is frame-rate independent and
 * reproducible. A long stall (tab switch, GC pause) is clamped so we never try
 * to "catch up" with thousands of steps (the spiral of death).
 */

// Default visibility adapter. Reads `document` — this is a BOUNDARY, mirroring
// the driver adapter, not logic. Guarded so the module imports cleanly in node.
export function defaultVisibility() {
  if (typeof document === 'undefined') {
    return { hidden: () => false, subscribe: () => () => {} };
  }
  return {
    hidden: () => document.hidden,
    subscribe(cb) {
      const h = () => cb(document.hidden);
      document.addEventListener('visibilitychange', h);
      return () => document.removeEventListener('visibilitychange', h);
    },
  };
}

/* createSim(stepFn, opts)
 *   stepFn(dtSeconds, info)  — called once per fixed step; info = { step }
 *   opts:
 *     dt        fixed timestep in SECONDS (default 1/60)
 *     maxFrame  panic cap: largest render delta consumed per tick, SECONDS
 *               (default 0.25 → after a long stall we run at most ~15 steps)
 *     maxSteps  hard cap on steps per tick; on hit, remaining backlog is
 *               dropped (spiral-of-death guard). default 5
 *     visibility injected adapter { hidden(), subscribe(cb) }
 *     wake      callback to nudge the driver awake when we resume/unhide
 *     autoStart whether the sim begins running (default true)
 */
const STEP_EPS = 1e-9;

export function createSim(stepFn, opts = {}) {
  const dtSec = opts.dt != null ? opts.dt : 1 / 60;
  const dtMs = dtSec * 1000;
  const maxFrameMs = (opts.maxFrame != null ? opts.maxFrame : 0.25) * 1000;
  const maxSteps = opts.maxSteps != null ? opts.maxSteps : 5;
  const wake = typeof opts.wake === 'function' ? opts.wake : () => {};
  const vis = opts.visibility || defaultVisibility();

  let running = opts.autoStart === false ? false : true;
  let paused = false;
  let hidden = vis.hidden();
  let lastNow = null; // null => rebaseline on next tick (dt of 0, no burst)
  let acc = 0;
  let stepCount = 0;
  let alpha = 0;

  // Auto-pause on document hidden; rebaseline + wake on return so there is no
  // catch-up burst of steps for the wall-clock time spent hidden.
  const unsub = vis.subscribe((isHidden) => {
    hidden = isHidden;
    if (!hidden) {
      lastNow = null;
      if (running && !paused) wake();
    }
  });

  function tick(now) {
    if (!running || paused || hidden) {
      lastNow = now; // keep a fresh baseline while idle...
      return;
    }
    if (lastNow == null) {
      lastNow = now; // ...first live tick just baselines, contributes no dt
      return;
    }
    let frame = now - lastNow;
    lastNow = now;
    if (frame < 0) frame = 0;
    if (frame > maxFrameMs) frame = maxFrameMs; // panic cap
    acc += frame;
    let steps = 0;
    // EPS absorbs sub-nanosecond FP jitter at the step boundary so a frame of
    // essentially-one-dt reliably yields exactly one step (deterministic).
    while (acc >= dtMs - STEP_EPS && steps < maxSteps) {
      stepFn(dtSec, { step: stepCount });
      acc -= dtMs;
      steps += 1;
      stepCount += 1;
    }
    if (acc < 0) acc = 0;
    if (steps >= maxSteps && acc >= dtMs - STEP_EPS) {
      acc = 0; // dropped backlog — never spiral
    }
    alpha = dtMs > 0 ? acc / dtMs : 0;
  }

  function pause() {
    if (paused) return;
    paused = true;
    lastNow = null;
  }
  function resume() {
    if (!paused) return;
    paused = false;
    lastNow = null;
    if (running && !hidden) wake();
  }
  function stop() {
    running = false;
    lastNow = null;
    unsub();
  }
  function start() {
    if (running) return;
    running = true;
    lastNow = null;
    if (!paused && !hidden) wake();
  }

  // active() drives the clock's dirty flag: only ask the driver for frames
  // while we genuinely need them.
  function active() {
    return running && !paused && !hidden;
  }

  return {
    tick,
    pause,
    resume,
    stop,
    start,
    active,
    // introspection (render interpolation + episode bookkeeping)
    get steps() { return stepCount; },
    get alpha() { return alpha; },
    get running() { return running; },
    get paused() { return paused; },
    get hidden() { return hidden; },
    _setHidden(v) { // test seam when a visibility adapter isn't wired
      hidden = v;
      if (!hidden) { lastNow = null; if (running && !paused) wake(); }
    },
  };
}
