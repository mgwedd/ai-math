/* lib/scene/sim.js — fixed-timestep simulation loop for the Scene Kit.
 *
 * OWNERSHIP: Motion & Simulation (internal to clock.js). This is what makes
 * game/free-running scenes (steering the descent ball, episode outcomes)
 * first-class — the replacement for the two hand-rolled setInterval labs in
 * lib/curriculum/index.js.
 *
 * CONTRACT (coordination/CONTRACT.md §5): the kit-core frame driver is the
 * single rAF loop. A sim is a driver SOURCE — the driver calls `advance(dt)`
 * once per frame with `dt` in SECONDS, already clamped to ≤ 1/15 s (so a long
 * tab stall can never produce a catch-up burst). Real time never enters here:
 * `dt` is the only input, so a fabricated `dt` sequence makes the loop fully
 * deterministic and unit-testable. Visibility is an injected adapter, not a
 * direct `document` read.
 *
 * The accumulator is the canonical "fix your timestep" pattern
 * (gafferongames): render frames arrive at arbitrary dt, but the physics step
 * is always exactly the fixed `dt`, so behaviour is frame-rate independent and
 * reproducible. maxFrame (belt-and-suspenders over the driver's own clamp) plus
 * maxSteps guard the spiral of death.
 */

// Default visibility adapter. Reads `document` — a BOUNDARY (like the driver),
// not logic. Guarded so the module imports cleanly in node/vitest.
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

const STEP_EPS = 1e-9; // absorbs sub-nanosecond FP jitter at the step boundary

/* createSim(stepFn, opts)
 *   stepFn(dtSeconds, info)  — called once per fixed step; info = { step }
 *   opts:
 *     dt        fixed timestep in SECONDS (default 1/60)
 *     hz        alternative to dt: steps per second (dt = 1/hz)
 *     maxFrame  clamp on the incoming frame dt, SECONDS (default 0.25) — the
 *               driver already clamps to 1/15 s; this is defense in depth so
 *               the sim honours the charter's own panic-cap requirement
 *     maxSteps  hard cap on steps per frame; on hit the backlog is dropped
 *               (spiral-of-death guard). default 5
 *     visibility injected adapter { hidden(), subscribe(cb) } — auto-pause
 *     wake      callback to wake the driver when we resume/unhide
 *     autoStart whether the sim begins running (default true)
 */
export function createSim(stepFn, opts = {}) {
  const dtSec = opts.dt != null ? opts.dt : opts.hz != null ? 1 / opts.hz : 1 / 60;
  // A non-positive/non-finite step (hz <= 0, dt <= 0, NaN) makes the while-loop
  // condition ill-defined and pins the frame source: reject at construction.
  if (!Number.isFinite(dtSec) || !(dtSec > 0)) throw new Error(`sim: requires a positive finite step (dt in s or hz > 0); got dt=${dtSec}`);
  const maxFrame = opts.maxFrame != null ? opts.maxFrame : 0.25;
  const maxSteps = opts.maxSteps != null ? opts.maxSteps : 5;
  const wake = typeof opts.wake === 'function' ? opts.wake : () => {};
  const vis = opts.visibility || defaultVisibility();

  let running = opts.autoStart === false ? false : true;
  let paused = false;
  let hidden = vis.hidden();
  let acc = 0;
  let stepCount = 0;
  let alpha = 0;

  // Auto-pause on document hidden; wake on return. dt is clamped upstream and
  // we keep no wall-clock baseline, so return simply resumes accumulating —
  // there is no catch-up burst for the time spent hidden.
  const unsub = vis.subscribe((isHidden) => {
    hidden = isHidden;
    if (!hidden && running && !paused) wake();
  });

  // advance(dt): dt in SECONDS (the driver source signature). t is ignored —
  // the sim owns its own accumulator.
  function advance(dt) {
    if (!running || paused || hidden) return;
    let frame = dt;
    if (!(frame > 0)) return; // 0 / negative / NaN -> nothing to integrate
    if (frame > maxFrame) frame = maxFrame; // panic cap
    acc += frame;
    let steps = 0;
    while (acc >= dtSec - STEP_EPS && steps < maxSteps) {
      stepFn(dtSec, { step: stepCount });
      acc -= dtSec;
      steps += 1;
      stepCount += 1;
    }
    if (acc < 0) acc = 0;
    if (steps >= maxSteps && acc >= dtSec - STEP_EPS) acc = 0; // drop backlog
    alpha = dtSec > 0 ? acc / dtSec : 0;
  }

  function pause() { paused = true; }
  function resume() {
    if (!paused) return;
    paused = false;
    if (running && !hidden) wake();
  }
  function stop() { running = false; unsub(); }
  function start() {
    if (running) return;
    running = true;
    if (!paused && !hidden) wake();
  }

  // active() drives the clock's dirty flag: only request frames while we need
  // them (running, not paused, not hidden).
  function active() { return running && !paused && !hidden; }

  return {
    advance,
    pause,
    resume,
    stop,
    start,
    active,
    get steps() { return stepCount; },     // total fixed steps taken
    get alpha() { return alpha; },          // leftover accumulator in [0,1) for render lerp
    get running() { return running; },
    get paused() { return paused; },
    get hidden() { return hidden; },
    _setHidden(v) {                         // test seam when no adapter is wired
      hidden = v;
      if (!hidden && running && !paused) wake();
    },
  };
}
