/* lib/scene/clock.js — tweens, easing, springs, timelines, and the scene clock
 * for the Scene Kit (VISUAL_FIRST §4 "Clock"; coordination/CONTRACT.md §5).
 *
 * OWNERSHIP: Motion & Simulation. Peers import from here; kit-core never does.
 *
 * CONTRACT SEAM (frozen, CONTRACT.md §5): kit-core owns the single rAF loop
 * (`lib/scene/driver.js`). The clock NEVER calls rAF — it attaches ONE driver
 * SOURCE while work is live and releases it when idle (dirty-flag rendering):
 *
 *     const h = driver.addSource((t, dt) => { ...advance timelines & sims... });
 *     h.release();   // when nothing is animating
 *
 *   t, dt are SECONDS. dt is wall-clock since the previous frame, clamped to
 *   ≤ 1/15 s by the driver. Param writes (atom.set) request the redraw, and the
 *   driver runs sources BEFORE render — so a tween writing a param each frame
 *   drives the picture. play/pause/scrub map onto stopping/feeding the source
 *   plus direct param writes (a scrub is a discrete write; atom.set redraws).
 *
 * DISCIPLINE: deterministic + testable. Real time never enters this module —
 * `dt` is the only time input, so a fabricated `dt` sequence reproduces any
 * animation exactly. prefers-reduced-motion is an injected boolean, not a
 * matchMedia read. Cancellation ties into scene cleanup (registerCleanup) so
 * nothing leaks across scene swaps.
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
// cubicOut is the default: a natural UI "arrive gently" feel.
const DEFAULT_EASE = 'cubicOut';
const DEFAULT_DUR = 300; // ms — matches §4's hold-time scale

function resolveEase(e) {
  if (typeof e === 'function') return e;
  if (typeof e === 'string' && EASINGS[e]) return EASINGS[e];
  return EASINGS[DEFAULT_EASE];
}

/* --------------------------------------------------------- interpolation */
// Shape-polymorphic linear interpolation, matching the contract's param value
// types (CONTRACT.md §2/§3):
//   - number                    (scalar params, k)
//   - {x, y} vec object         (vector params — vec(x,y) returns {x,y})
//   - number[] flat array       (e.g. a grid's [a,b,c,d] 2x2 matrix)
//   - nested arrays / objects   (recursive)
// A 2x2 matrix morph is element-wise entry lerp under an eased t — exactly what
// sweeps Kit Core's morphable grid smoothly from one matrix to another.
// CALLER CONTRACT: from and to must share the same shape — mismatched shapes
// yield NaN components (not validated; tween always captures/clones `from`
// off the same param it writes, so shapes match by construction).
export function interp(from, to, t) {
  if (Array.isArray(to)) return to.map((tv, i) => interp(from[i], tv, t));
  if (to && typeof to === 'object') {
    const out = {};
    for (const k in to) out[k] = interp(from[k], to[k], t);
    return out;
  }
  return from + (to - from) * t;
}
export const lerp = (a, b, t) => a + (b - a) * t;

function clone(v) {
  if (Array.isArray(v)) return v.map(clone);
  if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = clone(v[k]); return o; }
  return v;
}
function zerosLike(v) {
  if (Array.isArray(v)) return v.map(zerosLike);
  if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = zerosLike(v[k]); return o; }
  return 0;
}

/* --------------------------------------------------------------- springs */
// Damped harmonic oscillator, integrated per component. Duration-less: a spring
// settles by physics, so it is a LIVE (dt-driven) track, not a scrubbable one.
// Defaults tuned snappy-but-calm (react-spring "default": stiffness 170,
// damping 26, mass 1 — recorded in coordination/motion.md).
const SPRING_DEFAULTS = { stiffness: 170, damping: 26, mass: 1 };
const SUB_DT = 1 / 240; // internal substep (s) — keeps stiff springs stable

export function makeSpring(cfg = {}) { return { ...SPRING_DEFAULTS, ...cfg }; }

// One scalar spring over h seconds, substepping for stability. -> [x, v]
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
// Advance a shaped spring value (scalar | number[] | {x,y}) over h seconds.
// Pure: returns [newX, newV] with structure matching x (no mutation).
function springAdvance(x, v, target, cfg, h) {
  if (Array.isArray(x)) {
    const nx = []; const nv = [];
    for (let i = 0; i < x.length; i++) { const r = springAdvance(x[i], v[i], target[i], cfg, h); nx[i] = r[0]; nv[i] = r[1]; }
    return [nx, nv];
  }
  if (x && typeof x === 'object') {
    const nx = {}; const nv = {};
    for (const k in x) { const r = springAdvance(x[k], v[k], target[k], cfg, h); nx[k] = r[0]; nv[k] = r[1]; }
    return [nx, nv];
  }
  return stepSpringScalar(x, v, target, cfg, h);
}
function springSettled(x, v, from, to) {
  let ok = true;
  const walk = (xv, vv, fv, tv) => {
    if (!ok) return;
    if (Array.isArray(xv)) { xv.forEach((_, i) => walk(xv[i], vv[i], fv[i], tv[i])); return; }
    if (xv && typeof xv === 'object') { for (const k in xv) walk(xv[k], vv[k], fv[k], tv[k]); return; }
    const span = Math.max(1, Math.abs(tv - fv));
    if (!(Math.abs(xv - tv) < 1e-3 * span && Math.abs(vv) < 1e-2 * span)) ok = false;
  };
  walk(x, v, from, to);
  return ok;
}

/* --------------------------------------------------------------- params */
// A tweenable param is any { get(), set(v) } (the contract's atom is a superset:
// get/set/update/subscribe/peek). tween() also accepts (obj, 'key', to, opts).
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
  const delay = spec.delay || 0;
  const isSpring = !!spec.spring;
  const dur = isSpring ? 0 : spec.dur != null ? spec.dur : DEFAULT_DUR;
  const start = base + delay;
  const track = {
    param: spec.param,
    to: spec.to,
    from: spec.from != null ? spec.from : null,
    _fromFrozen: spec.from != null,
    _from0: undefined, // permanent baseline, pinned at FIRST capture (see _evaluate)
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
// A scrubbable timeline: a playhead (ms) advanced by the frame dt, with tracks
// at absolute offsets. play/pause/seek/scrub all fall out of the playhead.
// Eased tracks are deterministic w.r.t. playhead (scrub is exact); spring
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
    this._done = false;
    this._then = [];
    this._reattach = null; // set by clock
    this._detach = null; // set by clock
  }

  // advance by dt SECONDS (driver source signature). Playhead is in ms.
  advance(dt) {
    if (!this.playing || this._done) return;

    if (this.reducedMotion) {
      // Collapse to instant-set: jump every eased track to its end, snap
      // springs to target, complete immediately.
      this.playhead = this.duration;
      this._evaluate(dt, true);
      this._complete();
      return;
    }

    this.playhead += (dt > 0 ? dt : 0) * 1000;
    this._evaluate(dt, false);

    const springsSettling = this.tracks.some((t) => t.spring && !t.settled);
    if (this.playhead >= this.duration && !springsSettling) {
      if (this.loop && this.duration > 0) {
        this.playhead %= this.duration;
        // re-arm every track; recapture re-derives from _from0, not live values
        for (const t of this.tracks) { t._fromCaptured = false; t._done = false; }
      } else {
        this._complete();
      }
    }
  }

  _evaluate(dt, reduced) {
    for (const t of this.tracks) {
      if (t.spring) { this._evalSpring(t, dt, reduced); continue; }
      if (this.playhead < t.start) {
        t._fromCaptured = false; // re-derived from _from0 on the next crossing
        t._done = false;
        continue;
      }
      if (!t._fromCaptured) {
        // FIRST-ever capture pins the permanent baseline _from0. Any later
        // re-capture (rewind, loop) re-derives from _from0 — NEVER from the
        // live param, which already holds a tweened value; reading it would
        // repollute the baseline (scrub(.5)->scrub(0)->scrub(.5) must give
        // 50, 0, 50 — not 50, 50, 75).
        if (t._from0 === undefined) {
          t._from0 = t._fromFrozen ? clone(t.from) : clone(t.param.get());
        }
        t.from = clone(t._from0);
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
    if (this.playhead < t.start) {
      // Not reached yet (springs sit at sequence offsets, dur 0): don't pull
      // early, and re-arm so a rewound spring replays on the next crossing.
      t._fromCaptured = false;
      t.settled = false;
      t._done = false;
      return;
    }
    if (!t._fromCaptured) {
      // Same permanent-baseline rule as eased tracks (see _evaluate).
      if (t._from0 === undefined) {
        t._from0 = t._fromFrozen ? clone(t.from) : clone(t.param.get());
      }
      t.from = clone(t._from0);
      t.springState = { x: clone(t.from), v: zerosLike(t.from) };
      t._fromCaptured = true;
    }
    if (reduced) {
      t.param.set(clone(t.to));
      t.settled = true;
      if (!t._done) { t._done = true; if (t.onComplete) t.onComplete(); }
      return;
    }
    const s = t.springState;
    const [nx, nv] = springAdvance(s.x, s.v, t.to, t.spring, dt > 0 ? dt : 0);
    s.x = nx; s.v = nv;
    t.param.set(clone(nx));
    if (t.onUpdate) t.onUpdate(nx);
    if (springSettled(nx, nv, t.from, t.to)) {
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
    if (this._reattach) this._reattach();
  }

  // Absolute seek (ms). Deterministic for eased tracks: re-derives every value
  // from scratch. Springs snap to target if seeked past their start.
  seek(ms) {
    const target = ms < 0 ? 0 : ms > this.duration ? this.duration : ms;
    this.playhead = target;
    this._done = false;
    for (const t of this.tracks) {
      if (t.spring) {
        if (target >= t.start) {
          // springs aren't scrubbable — snap to target once past their start
          t.settled = true;
          t._done = true;
          t.param.set(clone(t.to));
        } else {
          // rewound before its start — re-arm for a live replay
          t.settled = false;
          t._done = false;
          t._fromCaptured = false;
          t.springState = null;
        }
        continue;
      }
      if (target <= t.start) t._fromCaptured = false; // re-derived from _from0
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
    if (this.reducedMotion) return true; // needs one frame to instant-set
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

/* ------------------------------------------------------------ the clock */
// createClock({ driver, reducedMotion, visibility, onCleanup })
//   driver:     the frame driver (CONTRACT.md §5). One source is attached while
//               work is live and released when idle (dirty flag).
//   reducedMotion: injected boolean. Tweens instant-set; particle work halves.
//   visibility: injected adapter forwarded to sims (auto-pause on hidden).
//   onCleanup:  e.g. engine's registerCleanup — dispose() runs on scene swap.
export function createClock(opts = {}) {
  const { driver, reducedMotion = false, visibility, onCleanup } = opts;
  const timelines = new Set();
  const sims = new Set();
  let source = null; // { release() } from driver.addSource

  function anyActive() {
    for (const t of timelines) if (t.active()) return true;
    for (const s of sims) if (s.active()) return true;
    return false;
  }
  function ensureRunning() {
    if (source || !driver) return;
    source = driver.addSource(onFrame);
  }
  function onFrame(_t, dt) {
    for (const t of [...timelines]) {
      t.advance(dt);
      if (t._done && !t.loop && !t._retain) timelines.delete(t);
    }
    for (const s of sims) s.advance(dt);
    if (source && !anyActive()) { source.release(); source = null; }
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
    // (atom{get,set}, to, opts)  OR  (obj, key, to, opts)
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
  // A scrubbable/retained timeline you hold onto (play/pause/scrub).
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
    if (source) { source.release(); source = null; }
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
    _running: () => source != null,
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
