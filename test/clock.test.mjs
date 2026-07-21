/* Tweens, easing, springs, timelines, and the scene clock (lib/scene/clock.js).
 *
 * All timing is driven by a fabricated (t, dt) sequence — dt in SECONDS —
 * through a manual driver matching CONTRACT.md §5. No real time, so every
 * animation is reproduced exactly. */
import { describe, it, expect } from 'vitest';
import {
  EASINGS, interp, lerp, build, createClock, detectReducedMotion,
} from '../lib/scene/clock.js';

/* ---- test doubles ---- */
// The frozen frame-driver seam (CONTRACT.md §5). step(dt) drives one frame.
function manualDriver() {
  let t = 0;
  let framesRequested = 0;
  const sources = new Set();
  return {
    addSource(fn) { sources.add(fn); return { release() { sources.delete(fn); } }; },
    requestFrame() { framesRequested += 1; },
    now() { return t; },
    pause() {}, resume() {}, isPaused() { return false; }, destroy() { sources.clear(); },
    // test control: advance one frame of dt seconds
    step(dt) { t += dt; for (const fn of [...sources]) fn(t, dt); },
    get sources() { return sources.size; },
    get running() { return sources.size > 0; },
    get frames() { return framesRequested; },
  };
}
// A minimal atom matching the { get, set } contract (kit-core's is a superset).
function atom(v) {
  let val = v;
  return { get: () => val, set: (x) => { val = x; } };
}

describe('easing set', () => {
  it('every easing pins the endpoints f(0)=0, f(1)=1', () => {
    for (const [name, fn] of Object.entries(EASINGS)) {
      expect(fn(0), `${name}(0)`).toBeCloseTo(0, 6);
      expect(fn(1), `${name}(1)`).toBeCloseTo(1, 6);
    }
  });
  it('cubicInOut is symmetric about the midpoint', () => {
    for (let t = 0; t <= 0.5; t += 0.1) {
      expect(EASINGS.cubicInOut(t) + EASINGS.cubicInOut(1 - t)).toBeCloseTo(1, 6);
    }
  });
  it('cubicOut differs from linear and decelerates (default is genuinely eased)', () => {
    expect(EASINGS.cubicOut(0.5)).not.toBeCloseTo(0.5, 3);
    expect(EASINGS.cubicOut(0.5)).toBeGreaterThan(0.5);
  });
});

describe('interpolation (morph)', () => {
  it('lerps scalars', () => { expect(lerp(0, 10, 0.25)).toBe(2.5); });
  it('lerps {x,y} vec objects (the contract vector type)', () => {
    expect(interp({ x: 0, y: 0 }, { x: 4, y: 8 }, 0.5)).toEqual({ x: 2, y: 4 });
  });
  it('lerps a flat [a,b,c,d] 2x2 matrix element-wise (drives the morphable grid)', () => {
    const I = [1, 0, 0, 1];
    const R = [0, -1, 1, 0];
    expect(interp(I, R, 0.5)).toEqual([0.5, -0.5, 0.5, 0.5]);
  });
  it('lerps nested arrays too', () => {
    expect(interp([[1, 0], [0, 1]], [[0, -1], [1, 0]], 0.5)).toEqual([[0.5, -0.5], [0.5, 0.5]]);
  });
  it('does not mutate the endpoints', () => {
    const from = { x: 1, y: 2 }; const to = { x: 3, y: 4 };
    interp(from, to, 0.5);
    expect(from).toEqual({ x: 1, y: 2 });
    expect(to).toEqual({ x: 3, y: 4 });
  });
});

describe('build() — pure track layout', () => {
  const p = atom(0);
  it('lays a sequence end to end', () => {
    const r = build({ sequence: [
      { param: p, to: 1, dur: 100 },
      { param: p, to: 2, dur: 200 },
    ] });
    expect(r.tracks.map((t) => t.start)).toEqual([0, 100]);
    expect(r.end).toBe(300);
  });
  it('overlays a parallel at the same base', () => {
    const r = build({ parallel: [
      { param: p, to: 1, dur: 100 },
      { param: p, to: 2, dur: 250 },
    ] });
    expect(r.tracks.map((t) => t.start)).toEqual([0, 0]);
    expect(r.end).toBe(250);
  });
  it('honours delay offsets and nests', () => {
    const r = build({ sequence: [
      { param: p, to: 1, dur: 100, delay: 50 },
      { parallel: [{ param: p, to: 2, dur: 100 }, { param: p, to: 3, dur: 400 }] },
    ] });
    expect(r.tracks.map((t) => t.start)).toEqual([50, 150, 150]);
    expect(r.end).toBe(550);
  });
});

describe('tween — writes params through the driver', () => {
  it('linear tween hits the midpoint at half duration and completes at dur', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d });
    const p = atom(0);
    clock.tween(p, 10, { dur: 100, ease: 'linear' }); // 100ms
    d.step(0.05); // 50ms -> half
    expect(p.get()).toBeCloseTo(5, 6);
    d.step(0.05); // end
    expect(p.get()).toBeCloseTo(10, 6);
    expect(d.running).toBe(false); // source released (dirty flag)
  });

  it('applies the default (cubicOut) easing when none is given', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d });
    const p = atom(0);
    clock.tween(p, 1, { dur: 100 });
    d.step(0.05);
    expect(p.get()).toBeCloseTo(EASINGS.cubicOut(0.5), 6);
  });

  it('supports the (obj, key, to, opts) convenience form', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d });
    const state = { x: 0 };
    clock.tween(state, 'x', 8, { dur: 80, ease: 'linear' });
    d.step(0.04);
    expect(state.x).toBeCloseTo(4, 6);
  });

  it('tweens {x,y} vectors and flat 2x2 matrices', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d });
    const v = atom({ x: 0, y: 0 });
    const m = atom([1, 0, 0, 1]);
    clock.tween(v, { x: 10, y: 20 }, { dur: 100, ease: 'linear' });
    clock.tween(m, [0, -1, 1, 0], { dur: 100, ease: 'linear' });
    d.step(0.05);
    expect(v.get()).toEqual({ x: 5, y: 10 });
    expect(m.get()).toEqual([0.5, -0.5, 0.5, 0.5]);
  });

  it('respects delay', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d });
    const p = atom(0);
    clock.tween(p, 10, { dur: 100, delay: 50, ease: 'linear' });
    d.step(0.05); // playhead 50 = start of the tween
    expect(p.get()).toBeCloseTo(0, 6);
    d.step(0.05); // playhead 100 -> half of the 100ms tween
    expect(p.get()).toBeCloseTo(5, 6);
  });

  it('fires the completion callback via then()', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d });
    const p = atom(0);
    let done = false;
    clock.tween(p, 1, { dur: 50, ease: 'linear' }).then(() => { done = true; });
    d.step(0.05);
    expect(done).toBe(true);
  });
});

describe('sequence & parallel combinators', () => {
  it('sequence chains: the second tween starts from where the first ended', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d });
    const p = atom(0);
    clock.sequence(
      { param: p, to: 10, dur: 100, ease: 'linear' },
      { param: p, to: 20, dur: 100, ease: 'linear' },
    );
    d.step(0.1); // end of first leg
    expect(p.get()).toBeCloseTo(10, 6);
    d.step(0.05); // halfway through second leg: 10 -> 20
    expect(p.get()).toBeCloseTo(15, 6);
    d.step(0.05);
    expect(p.get()).toBeCloseTo(20, 6);
  });

  it('parallel animates two params simultaneously', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d });
    const a = atom(0); const b = atom(0);
    clock.parallel(
      { param: a, to: 100, dur: 100, ease: 'linear' },
      { param: b, to: 200, dur: 200, ease: 'linear' },
    );
    d.step(0.1);
    expect(a.get()).toBeCloseTo(100, 6); // a done
    expect(b.get()).toBeCloseTo(100, 6); // b halfway
    d.step(0.1);
    expect(b.get()).toBeCloseTo(200, 6);
  });
});

describe('play / pause / scrub on a timeline', () => {
  it('pause halts progress; play resumes without a jump', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d });
    const p = atom(0);
    const h = clock.timeline({ param: p, to: 100, dur: 100, ease: 'linear' });
    d.step(0.03);
    expect(p.get()).toBeCloseTo(30, 6);
    h.pause();
    d.step(5.0); // long gap while paused
    expect(p.get()).toBeCloseTo(30, 6);
    h.play();
    d.step(0.02); // +20ms -> playhead 50
    expect(p.get()).toBeCloseTo(50, 6);
  });

  it('scrub sets a deterministic value regardless of frame history', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d });
    const p = atom(0);
    const h = clock.timeline({ param: p, to: 100, dur: 100, ease: 'linear' });
    h.scrub(0.25); expect(p.get()).toBeCloseTo(25, 6);
    h.scrub(0.9); expect(p.get()).toBeCloseTo(90, 6);
    h.scrub(0.25); expect(p.get()).toBeCloseTo(25, 6); // idempotent on rewind
    h.seek(50); expect(p.get()).toBeCloseTo(50, 6);
  });
});

describe('springs', () => {
  it('settles at the target and then completes (releases the driver)', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d });
    const p = atom(0);
    let settled = false;
    clock.tween(p, 100, { spring: true }).then(() => { settled = true; });
    for (let i = 0; i < 240; i++) d.step(1 / 60); // 4s at 60fps
    expect(p.get()).toBeCloseTo(100, 3);
    expect(settled).toBe(true);
    expect(d.running).toBe(false);
  });

  it('a stiff spring stays finite (stable integration at 60fps)', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d });
    const p = atom(0);
    clock.tween(p, 1, { spring: { stiffness: 2000, damping: 20, mass: 1 } });
    for (let i = 0; i < 300; i++) {
      d.step(1 / 60);
      expect(Number.isFinite(p.get())).toBe(true);
    }
    expect(p.get()).toBeCloseTo(1, 2);
  });

  it('springs a {x,y} vector to its target', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d });
    const v = atom({ x: 0, y: 0 });
    clock.tween(v, { x: 3, y: -2 }, { spring: true });
    for (let i = 0; i < 300; i++) d.step(1 / 60);
    expect(v.get().x).toBeCloseTo(3, 2);
    expect(v.get().y).toBeCloseTo(-2, 2);
  });
});

describe('reduced motion', () => {
  it('collapses a tween to an instant set on the first frame', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d, reducedMotion: true });
    const p = atom(0);
    let done = false;
    clock.tween(p, 42, { dur: 1000, ease: 'linear' }).then(() => { done = true; });
    d.step(1 / 60);
    expect(p.get()).toBe(42); // straight to target, no interpolation
    expect(done).toBe(true);
    expect(d.running).toBe(false);
  });
  it('snaps a spring straight to target too', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d, reducedMotion: true });
    const p = atom(0);
    clock.tween(p, 9, { spring: true });
    d.step(1 / 60);
    expect(p.get()).toBe(9);
  });
  it('exposes the particle-halving flag the kit reads', () => {
    const full = createClock({ driver: manualDriver() });
    const reduced = createClock({ driver: manualDriver(), reducedMotion: true });
    expect(full.reducedMotion).toBe(false);
    expect(full.particleScale).toBe(1);
    expect(full.scaleParticles(1000)).toBe(1000);
    expect(reduced.particleScale).toBe(0.5);
    expect(reduced.scaleParticles(1000)).toBe(500);
  });
});

describe('driver dirty flag', () => {
  it('attaches a source only while work is live and releases when idle', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d });
    expect(d.running).toBe(false); // nothing to do yet
    const p = atom(0);
    clock.tween(p, 1, { dur: 100, ease: 'linear' });
    expect(d.running).toBe(true);
    d.step(0.1);
    expect(d.running).toBe(false); // released after completion
  });

  it('attaches exactly one source for many concurrent tweens', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d });
    const a = atom(0); const b = atom(0); const c = atom(0);
    clock.tween(a, 1, { dur: 100 });
    clock.tween(b, 1, { dur: 100 });
    clock.tween(c, 1, { dur: 100 });
    expect(d.sources).toBe(1); // one driver source, not three
  });
});

describe('cancellation & scene cleanup', () => {
  it('handle.cancel() freezes the param and releases the driver', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d });
    const p = atom(0);
    const h = clock.tween(p, 100, { dur: 100, ease: 'linear' });
    d.step(0.03);
    h.cancel();
    d.step(0.1);
    expect(p.get()).toBeCloseTo(30, 6); // frozen where it was
    expect(d.running).toBe(false);
  });

  it('onCleanup receives dispose; dispose tears down every tween and sim', () => {
    const d = manualDriver();
    let disposer = null;
    const clock = createClock({ driver: d, onCleanup: (fn) => { disposer = fn; } });
    const p = atom(0);
    clock.tween(p, 100, { dur: 100, ease: 'linear' });
    clock.sim(() => {}, { dt: 1 / 60 });
    d.step(1 / 60);
    expect(d.running).toBe(true);
    expect(typeof disposer).toBe('function');
    disposer(); // scene swap
    expect(d.running).toBe(false);
    expect(clock._active()).toBe(false);
  });

  it('a sim registered on the clock keeps frames flowing and idles on pause', () => {
    const d = manualDriver();
    const clock = createClock({ driver: d });
    let steps = 0;
    const s = clock.sim(() => { steps += 1; }, { dt: 1 / 60 });
    expect(d.running).toBe(true);
    d.step(0.1); // ~6 steps
    expect(steps).toBeGreaterThan(0);
    s.pause();
    expect(clock._active()).toBe(false);
  });
});

describe('detectReducedMotion adapter', () => {
  it('degrades to false when matchMedia is unavailable (node)', () => {
    expect(detectReducedMotion()).toBe(false);
  });
});
