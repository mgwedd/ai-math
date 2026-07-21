/* Fixed-timestep simulation loop (lib/scene/sim.js).
 *
 * Every test drives a fabricated `now` (ms) sequence — no real time — proving
 * the loop is deterministic: accumulator behaviour at odd deltas, the panic
 * cap, the spiral-of-death guard, pause/resume, and visibility auto-pause. */
import { describe, it, expect } from 'vitest';
import { createSim, defaultVisibility } from '../lib/scene/sim.js';

// A test visibility adapter we can flip by hand.
function fakeVisibility() {
  let hidden = false;
  let cb = null;
  return {
    hidden: () => hidden,
    subscribe(fn) { cb = fn; return () => { cb = null; }; },
    set(v) { hidden = v; if (cb) cb(v); },
  };
}

describe('createSim — fixed timestep', () => {
  it('runs exactly N steps for N*dt of elapsed time', () => {
    const dt = 1 / 60; // ~16.667 ms
    let calls = 0;
    const s = createSim(() => { calls += 1; }, { dt });
    // first tick just baselines (dt=0)
    s.tick(0);
    // advance exactly 10 frames of dt
    for (let i = 1; i <= 10; i++) s.tick(i * dt * 1000);
    expect(calls).toBe(10);
    expect(s.steps).toBe(10);
  });

  it('passes the fixed dt (seconds) to the step fn, not the frame delta', () => {
    const dt = 1 / 50;
    const seen = [];
    const s = createSim((d) => seen.push(d), { dt });
    s.tick(0);
    s.tick(100); // 100ms of real frame => 5 steps of 20ms
    expect(seen).toHaveLength(5);
    expect(seen.every((d) => d === dt)).toBe(true);
  });

  it('carries the accumulator remainder across ticks', () => {
    const dt = 1 / 100; // 10 ms step
    let calls = 0;
    const s = createSim(() => { calls += 1; }, { dt });
    s.tick(0);
    s.tick(7); // acc=7  -> 0 steps
    expect(calls).toBe(0);
    s.tick(14); // acc=14 -> 1 step, remainder 4
    expect(calls).toBe(1);
    s.tick(20); // +6 -> acc 10 -> 1 step
    expect(calls).toBe(2);
    // alpha reflects leftover accumulator in [0,1)
    expect(s.alpha).toBeGreaterThanOrEqual(0);
    expect(s.alpha).toBeLessThan(1);
  });

  it('caps a huge frame delta (panic cap) instead of catching up forever', () => {
    const dt = 1 / 60; // 16.667 ms
    let calls = 0;
    // generous maxSteps so the cap (not the step guard) is what limits us
    const s = createSim(() => { calls += 1; }, { dt, maxFrame: 0.25, maxSteps: 1000 });
    s.tick(0);
    s.tick(5000); // 5 seconds stalled -> clamped to 250ms
    // 250ms / (1000/60)ms = exactly 15 steps, not 300
    expect(calls).toBe(15);
  });

  it('drops backlog when maxSteps is hit (no spiral of death)', () => {
    const dt = 1 / 60;
    let calls = 0;
    const s = createSim(() => { calls += 1; }, { dt, maxFrame: 10, maxSteps: 3 });
    s.tick(0);
    s.tick(1000); // would be 60 steps; capped at 3, backlog dropped
    expect(calls).toBe(3);
    // accumulator was reset, so the next normal frame yields ~1 step
    s.tick(1000 + dt * 1000);
    expect(calls).toBe(4);
  });

  it('does not step while paused and rebaselines on resume (no burst)', () => {
    const dt = 1 / 60;
    let calls = 0;
    const s = createSim(() => { calls += 1; }, { dt });
    s.tick(0);
    s.tick(dt * 1000); // 1 step
    expect(calls).toBe(1);
    s.pause();
    s.tick(10000); // huge gap while paused -> ignored
    expect(calls).toBe(1);
    expect(s.active()).toBe(false);
    s.resume();
    s.tick(10000); // resume baseline, dt=0
    s.tick(10000 + dt * 1000); // one clean step
    expect(calls).toBe(2);
  });

  it('auto-pauses when the document goes hidden and resumes without catch-up', () => {
    const dt = 1 / 60;
    const vis = fakeVisibility();
    let calls = 0;
    const s = createSim(() => { calls += 1; }, { dt, visibility: vis });
    s.tick(0);
    s.tick(dt * 1000);
    expect(calls).toBe(1);
    vis.set(true); // hidden
    expect(s.active()).toBe(false);
    s.tick(60000); // a minute in the background
    expect(calls).toBe(1); // nothing accumulated
    vis.set(false); // visible again -> rebaselined
    expect(s.active()).toBe(true);
    s.tick(60000); // baseline
    s.tick(60000 + dt * 1000); // one step, NOT 3600
    expect(calls).toBe(2);
  });

  it('is deterministic: identical now-sequences produce identical step counts', () => {
    const dt = 1 / 60;
    const nows = [0, 5, 22, 40, 41, 100, 250, 251, 900];
    const run = () => {
      let c = 0;
      const s = createSim(() => { c += 1; }, { dt });
      nows.forEach((n) => s.tick(n));
      return c;
    };
    expect(run()).toBe(run());
  });

  it('active() reflects the dirty-flag state for the driver', () => {
    const s = createSim(() => {}, {});
    expect(s.active()).toBe(true);
    s.pause();
    expect(s.active()).toBe(false);
    s.resume();
    expect(s.active()).toBe(true);
    s.stop();
    expect(s.active()).toBe(false);
  });

  it('never reads real time (imports cleanly, ticks with injected now only)', () => {
    // A smoke check: no visibility adapter, node env has no document; the
    // default adapter must degrade gracefully.
    const vis = defaultVisibility();
    expect(vis.hidden()).toBe(false);
    const s = createSim(() => {}, {});
    expect(() => s.tick(0)).not.toThrow();
  });
});
