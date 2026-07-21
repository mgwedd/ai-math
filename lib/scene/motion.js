/* lib/scene/motion.js — tweens, easing, springs, timelines, and the scene
 * clock for the Scene Kit.
 *
 * OWNERSHIP: Motion & Simulation. See coordination/motion.md for the design
 * and the frame-driver seam negotiated with Kit Core.
 *
 * DISCIPLINE: deterministic + testable. Real time (Date.now/performance.now)
 * NEVER enters this module — the driver hands `now` (ms) into tick(), and every
 * tween baselines off the first tick it sees, so a fabricated `now` sequence
 * reproduces any animation exactly. prefers-reduced-motion is an injected
 * boolean, not a matchMedia read. Cancellation ties into scene cleanup so
 * nothing leaks across scene swaps.
 *
 * One-way flow: interaction -> params -> entities -> draw. Tweens are the
 * machine that writes params over time; the clock is the single thing that
 * subscribes to the driver.
 */

import { createSim } from './sim.js';

/* ------------------------------------------------------------------ easing */
// A compact, complete-enough set. Each maps t in [0,1] -> eased [0,1] with
// f(0)=0, f(1)=1. ~one screen, deliberately not a library.
const c1 = 1.70158; // back overshoot
const c2 = c1 * 1.525;
const c3 = c1 + 1;
export const EASINGS = {
  linear: (t) => t,
  quadIn: (t) => t * t,
  quadOut: (t) => 1 - (1 - t) * (1 - t),
  quadInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  cubicIn: (t) => t * t * t,
  cubicOut: (t) => 1 - Math.pow(1 - t, 3),
  cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  quartIn: (t) => t * t * t * t,
  quartOut: (t) => 1 - Math.pow(1 - t, 4),
  quartInOut: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  sineIn: (t) => 1 - Math.cos((t * Math.PI) / 2),
  sineOut: (t) => Math.sin((t * Math.PI) / 2),
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  expoIn: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  expoOut: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  expoInOut: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2,
  backIn: (t) => c3 * t * t * t - c1 * t * t,
  backOut: (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
  backInOut: (t) =>
    t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2,
};
// cubicOut is the default: a natural UI "arrive gently" feel (records in log).
const DEFAULT_EASE = 'cubicOut';
const DEFAULT_DUR = 300; // ms — matches §4's hold-time scale

function resolveEase(e) {
  if (typeof e === 'function') return e;
  if (typeof e === 'string' && EASINGS[e]) return EASINGS[e];
  return EASINGS[DEFAULT_EASE];
}

/* --------------------------------------------------------- interpolation */
// Shape-polymorphic linear interpolation. Handles number, vector (number[]),
// and matrix (number[][], e.g. 2x2 [[a,b],[c,d]]). A 2x2 matrix morph is
// element-wise entry lerp — exactly what drives Kit Core's morphable grid: an
// eased t between two matrices sweeps the grid smoothly from one to the other.
export function interp(from, to, t) {
  if (Array.isArray(to)) return to.map((tv, i) => interp(from[i], tv, t));
  return from + (to - from) * t;
}
export const lerp = (a, b, t) => a + (b - a) * t;
function clone(v) { return Array.isArray(v) ? v.map(clone) : v; }
function zerosLike(v) { return Array.isArray(v) ? v.map(zerosLike) : 0; }

/* --------------------------------------------------------------- springs */
// Damped harmonic oscillator, integrated per component. Duration-less: a spring
// settles by physics, so it is a LIVE (dt-driven) track, not a scrubbable one.
// Defaults tuned to feel snappy-but-calm (react-spring "default": stiffness
// 170, damping 26, mass 1 — recorded in coordination/motion.md).
const SPRING_DEFAULTS = { stiffness: 170, damping: 26, mass: 1 };
const SUB_DT = 1 / 240; // internal substep (s) — keeps stiff springs stable

export function makeSpring(cfg = {}) {
  return { ...SPRING_DEFAULTS, ...cfg };
}

// Integrate a single scalar spring one render-frame worth of time (h seconds),
// substepping for stability. Returns [x, v].
function stepSpringScalar(x, v, target, cfg, h) {
  const { stiffness: k, damping: c, mass: m } = cfg;
  let t = h;
  while (t > 1e-9) {
    const sub = Math.min(SUB_DT, t);
    const a = (-k * (x - target) - c * v) / m;
    v += a * sub;
    x += v * sub;
    t -= sub;
  }
  return [x, v];
}

/* --------------------------------------------------------------- params */
// A tweenable param is any { get(), set(v) }. tween() also accepts the
// convenience (obj, 'key', to, opts) form. Kit Core owns the real reactive
// atoms; this only depends on the get/set contract (see motion.md handoff).
function keyAtom(obj, key) {
  return { get: () => obj[key], set: (v) => { obj[key] = v; } };
}

/* -------------------------------------------------------- track building */
// Pure: a spec tree -> flat track list with absolute ms offsets. No clock, no
// time — fully unit-testable. Specs:
//   { param, to, dur?, ease?, delay?, spring?, from?, onUpdate?, onComplete? }
//   { sequence: [spec, ...] }  — laid end to end
//   { parallel: [spec, ...] }  — overlaid at the same base
export function build(spec, base = 0) {
  if (spec && spec.sequence) {
    let off = base;
    let end = base;
    const tracks = [];
    for (const child of spec.sequence) {
      const r = build(child, off);
      tracks.push(...r.tracks);
      off = r.end;
      end = Math.max(end, r.end);
    }
    return { tracks, start: base, end };
  }
  if (spec && spec.parallel) {
    let end = base;
    const tracks = [];
    for (const child of spec.parallel) {
      const r = build(child, base);
      tracks.push(...r.tracks);
      end = Math.max(end, r.end);
    }
    return { tracks, start: base, end };
  }
  // leaf tween
  const delay = spec.delay || 0;
  const isSpring = !!spec.spring;
  const dur = isSpring ? 0 : spec.dur != null ? spec.dur : DEFAULT_DUR;
  const start = base + delay;
  const track = {
    param: spec.param,
    to: spec.to,
    from: spec.from != null ? spec.from : null,
    _fromFrozen: spec.from != null,
    start,
    dur,
    ease: resolveEase(spec.ease),
    spring: isSpring ? makeSpring(spec.spring === true ? {} : spec.spring) : null,
    springState: null,
    onUpdate: spec.onUpdate,
    onComplete: spec.onComplete,
    _fromCaptured: false,
    _done: false,
    settled: false,
  };
  return { tracks: [track], start, end: start + dur };
}

/* ------------------------------------------------------------- Timeline */
// A scrubbable timeline: a playhead (ms) advanced by the tick dt, with tracks
// at absolute offsets. play/pause/seek/scrub all fall out of the playhead.
// Eased tracks are deterministic w.r.t. playhead (so scrub is exact); spring
// tracks are live/dt-driven and snap to target on an explicit seek.
class Timeline {
  constructor({ tracks, end, reducedMotion = false, loop = false, retain = false }) {
    this.tracks = tracks.slice().sort((a, b) => a.start - b.start);
    this.duration = end;
    this.reducedMotion = reducedMotion;
    this.loop = loop;
    this._retain = retain;
    this.playhead = 0;
    this.playing = true;
    this.lastNow = null;
    this._done = false;
    this._then = [];
    this._reattach = null; // set by clock
    this._detach = null; // set by clock
  }

  tick(now) {
    if (!this.playing || this._done) { this.lastNow = now; return; }
    if (this.lastNow == null) { this.lastNow = now; }
    let dt = now - this.lastNow;
    this.lastNow = now;
    if (dt < 0) dt = 0;

    if (this.reducedMotion) {
      // Collapse to instant-set: jump every eased track to its end, snap
      // springs to target, complete immediately.
      this.playhead = this.duration;
      this._evaluate(dt, true);
      this._complete();
      return;
    }

    this.playhead += dt;
    this._evaluate(dt, false);

    const springsSettling = this.tracks.some((t) => t.spring && !t.settled);
    if (this.playhead >= this.duration && !springsSettling) {
      if (this.loop && this.duration > 0) {
        this.playhead = this.playhead % this.duration;
        for (const t of this.tracks) { t._fromCaptured = t._fromFrozen; t._done = false; }
      } else {
        this._complete();
      }
    }
  }

  _evaluate(dt, reduced) {
    for (const t of this.tracks) {
      if (t.spring) { this._evalSpring(t, dt, reduced); continue; }
      if (this.playhead < t.start) {
        // not started yet; on rewind, forget any captured baseline
        if (!t._fromFrozen) t._fromCaptured = false;
        t._done = false;
        continue;
      }
      if (!t._fromCaptured) {
        if (!t._fromFrozen) t.from = clone(t.param.get());
        t._fromCaptured = true;
      }
      const localRaw = t.dur === 0 ? 1 : (this.playhead - t.start) / t.dur;
      const local = localRaw < 0 ? 0 : localRaw > 1 ? 1 : localRaw;
      const eased = reduced ? 1 : t.ease(local);
      const val = interp(t.from, t.to, eased);
      t.param.set(val);
      if (t.onUpdate) t.onUpdate(val, eased);
      if (local >= 1 && !t._done) { t._done = true; if (t.onComplete) t.onComplete(); }
    }
  }

  _evalSpring(t, dt, reduced) {
    if (!t._fromCaptured) {
      const from = t._fromFrozen ? t.from : clone(t.param.get());
      t.from = from;
      t.springState = { x: clone(from), v: zerosLike(from) };
      t._fromCaptured = true;
    }
    if (reduced) {
      t.param.set(clone(t.to));
      t.settled = true;
      if (!t._done) { t._done = true; if (t.onComplete) t.onComplete(); }
      return;
    }
    const s = t.springState;
    s.x = integrateSpringValue(s.x, s.v, t.to, t.spring, dt / 1000, s);
    t.param.set(clone(s.x));
    if (t.onUpdate) t.onUpdate(s.x);
    if (springSettled(s.x, s.v, t.from, t.to)) {
      t.param.set(clone(t.to));
      t.settled = true;
      if (!t._done) { t._done = true; if (t.onComplete) t.onComplete(); }
    }
  }

  _complete() {
    if (this._done) return;
    this._done = true;
    this.playing = false;
    for (const cb of this._then) { try { cb(); } catch (e) { /* isolate */ } }
    if (this._detach) this._detach();
  }

  pause() { this.playing = false; }
  play() {
    if (this._done && !this.loop) return;
    this.playing = true;
    this.lastNow = null;
    if (this._reattach) this._reattach();
  }

  // Absolute seek (ms). Deterministic for eased tracks: re-derives every value
  // from scratch at the target playhead. Springs snap to their target.
  seek(ms) {
    const target = ms < 0 ? 0 : ms > this.duration ? this.duration : ms;
    this.playhead = target;
    this.lastNow = null;
    this._done = false;
    for (const t of this.tracks) {
      if (t.spring) {
        // springs aren't scrubbable — snap to target if seeked past their start
        t.settled = target >= t.start;
        t._done = t.settled;
        if (t.settled) t.param.set(clone(t.to));
        continue;
      }
      if (!t._fromFrozen && target <= t.start) t._fromCaptured = false;
      t._done = false;
    }
    this._evaluate(0, false);
    if (this._reattach) this._reattach();
  }
  scrub(frac) { this.seek((this.duration || 0) * frac); }

  cancel() {
    this.playing = false;
    this._done = true;
    if (this._detach) this._detach();
  }

  active() {
    if (!this.playing || this._done) return false;
    if (this.reducedMotion) return true; // needs one tick to instant-set
    if (this.playhead < this.duration) return true;
    return this.tracks.some((t) => t.spring && !t.settled);
  }

  handle() {
    const tl = this;
    return {
      pause: () => { tl.pause(); return this; },
      play: () => { tl.play(); return this; },
      seek: (ms) => { tl.seek(ms); return this; },
      scrub: (f) => { tl.scrub(f); return this; },
      cancel: () => { tl.cancel(); return this; },
      then: (cb) => { tl._then.push(cb); return this; },
      get done() { return tl._done; },
      get playing() { return tl.playing; },
      get playhead() { return tl.playhead; },
      get duration() { return tl.duration; },
      _tl: tl,
    };
  }
}

function integrateSpringValue(x, v, target, cfg, h, state) {
  if (Array.isArray(x)) {
    return x.map((xi, i) => {
      const [nx, nv] = subIntegrate(xi, v[i], target[i], cfg, h);
      v[i] = nv;
      return nx;
    });
  }
  const [nx, nv] = stepSpringScalar(x, v, target, cfg, h);
  state.v = nv;
  return nx;
}
function subIntegrate(x, v, target, cfg, h) {
  if (Array.isArray(x)) {
    const nv = [];
    const nx = x.map((xi, i) => {
      const [rx, rv] = subIntegrate(xi, v[i], target[i], cfg, h);
      nv[i] = rv;
      return rx;
    });
    return [nx, nv];
  }
  return stepSpringScalar(x, v, target, cfg, h);
}
function springSettled(x, v, from, to) {
  const comps = [];
  const walk = (xv, vv, fv, tv) => {
    if (Array.isArray(xv)) { xv.forEach((_, i) => walk(xv[i], vv[i], fv[i], tv[i])); return; }
    const span = Math.max(1, Math.abs(tv - fv));
    comps.push(Math.abs(xv - tv) < 1e-3 * span && Math.abs(vv) < 1e-2 * span);
  };
  walk(x, v, from, to);
  return comps.every(Boolean);
}

/* ------------------------------------------------------------ the clock */
// createClock({ driver, reducedMotion, visibility, onCleanup })
//   driver:    the frame-driver seam — driver.add(tick) -> remove(). One and
//              only one tick is registered while work is live (dirty flag).
//   reducedMotion: injected boolean. Tweens instant-set; particle work halves.
//   visibility: injected adapter passed through to sims (auto-pause on hidden).
//   onCleanup:  e.g. engine's registerCleanup — dispose() runs on scene swap.
export function createClock(opts = {}) {
  const { driver, reducedMotion = false, visibility, onCleanup } = opts;
  const timelines = new Set();
  const sims = new Set();
  let removeTick = null;

  function anyActive() {
    for (const t of timelines) if (t.active()) return true;
    for (const s of sims) if (s.active()) return true;
    return false;
  }
  function ensureRunning() {
    if (removeTick || !driver) return;
    removeTick = driver.add(tick);
  }
  function tick(now) {
    for (const t of [...timelines]) {
      t.tick(now);
      if (t._done && !t.loop && !t._retain) timelines.delete(t);
    }
    for (const s of sims) s.tick(now);
    if (removeTick && !anyActive()) { removeTick(); removeTick = null; }
  }

  function playDescriptor(descriptor, extra = {}) {
    const tl = new Timeline({ ...descriptor, reducedMotion, ...extra });
    tl._reattach = () => { timelines.add(tl); ensureRunning(); };
    tl._detach = () => { timelines.delete(tl); };
    timelines.add(tl);
    ensureRunning();
    return tl.handle();
  }

  function tween(param, a, b, c) {
    // (param{get,set}, to, opts)  OR  (obj, key, to, opts)
    let spec;
    if (param && typeof param.get === 'function' && typeof param.set === 'function') {
      spec = { param, to: a, ...(b || {}) };
    } else {
      spec = { param: keyAtom(param, a), to: b, ...(c || {}) };
    }
    return playDescriptor(build(spec));
  }
  function sequence(...specs) {
    const list = specs.length === 1 && Array.isArray(specs[0]) ? specs[0] : specs;
    return playDescriptor(build({ sequence: list }));
  }
  function parallel(...specs) {
    const list = specs.length === 1 && Array.isArray(specs[0]) ? specs[0] : specs;
    return playDescriptor(build({ parallel: list }));
  }
  // Build a scrubbable/retained timeline you hold onto (play/pause/scrub).
  function timeline(spec, extra = {}) {
    return playDescriptor(build(spec), { retain: true, ...extra });
  }

  function sim(stepFn, simOpts = {}) {
    const s = createSim(stepFn, { visibility, wake: ensureRunning, ...simOpts });
    sims.add(s);
    const baseStop = s.stop;
    s.stop = () => { baseStop(); sims.delete(s); };
    ensureRunning();
    return s;
  }

  function dispose() {
    for (const t of [...timelines]) t.cancel();
    timelines.clear();
    for (const s of [...sims]) s.stop();
    sims.clear();
    if (removeTick) { removeTick(); removeTick = null; }
  }

  if (typeof onCleanup === 'function') onCleanup(dispose);

  return {
    tween,
    sequence,
    parallel,
    timeline,
    sim,
    dispose,
    reducedMotion,
    // prefers-reduced-motion also halves particle-ish work; the kit reads this.
    particleScale: reducedMotion ? 0.5 : 1,
    scaleParticles: (n) => (reducedMotion ? Math.ceil(n / 2) : n),
    // introspection for tests / debugging
    _timelines: timelines,
    _sims: sims,
    _active: anyActive,
    _running: () => removeTick != null,
  };
}

/* ---------------------------------------------- reduced-motion detection */
// Adapter (BOUNDARY, like the driver): reads matchMedia so the kit can pass a
// plain boolean into createClock. Never called from logic.
export function detectReducedMotion() {
  if (typeof matchMedia === 'undefined') return false;
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch (e) { return false; }
}
