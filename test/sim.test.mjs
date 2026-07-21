/* Fixed-timestep simulation loop (lib/scene/sim.js).
 *
 * The sim is a driver SOURCE: the driver calls advance(dt) with dt in SECONDS
 * (CONTRACT.md §5). Every test drives a fabricated dt sequence — no real time —
 * proving determinism: accumulator behaviour at odd deltas, the panic cap, the
 * spiral-of-death guard, pause/resume, and visibility auto-pause. */
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
  it('runs exactly N steps for N frames of one dt', () => {
    const dt = 1 / 60;
    let calls = 0;
    const s = createSim(() => { calls += 1; }, { dt });
    for (let i = 0; i < 10; i++) s.advance(dt);
    expect(calls).toBe(10);
    expect(s.steps).toBe(10);
  });

  it('accepts {hz} as an alternative to {dt}', () => {
    let calls = 0;
    const s = createSim(() => { calls += 1; }, { hz: 50 }); // dt = 20ms
    s.advance(0.1); // 100ms -> 5 steps
    expect(calls).toBe(5);
  });

  it('passes the fixed dt (seconds) to the step fn, not the frame delta', () => {
    const dt = 1 / 50;
    const seen = [];
    const s = createSim((d) => seen.push(d), { dt });
    s.advance(0.1); // 100ms frame -> 5 steps of 20ms
    expect(seen).toHaveLength(5);
    expect(seen.every((d) => d === dt)).toBe(true);
  });

  it('carries the accumulator remainder across frames', () => {
    const dt = 1 / 100; // 10 ms step
    let calls = 0;
    const s = createSim(() => { calls += 1; }, { dt });
    s.advance(0.007); // acc 7ms -> 0 steps
    expect(calls).toBe(0);
    s.advance(0.007); // acc 14ms -> 1 step, remainder 4ms
    expect(calls).toBe(1);
    s.advance(0.006); // acc 10ms -> 1 step
    expect(calls).toBe(2);
    expect(s.alpha).toBeGreaterThanOrEqual(0);
    expect(s.alpha).toBeLessThan(1);
  });

  it('caps a huge frame delta (panic cap) instead of catching up forever', () => {
    const dt = 1 / 60;
    let calls = 0;
    const s = createSim(() => { calls += 1; }, { dt, maxFrame: 0.25, maxSteps: 1000 });
    s.advance(5.0); // 5s stall (unclamped) -> clamped to 250ms
    // 250ms / (1000/60)ms = exactly 15 steps, not 300
    expect(calls).toBe(15);
  });

  it('drops backlog when maxSteps is hit (no spiral of death)', () => {
    const dt = 1 / 60;
    let calls = 0;
    const s = createSim(() => { calls += 1; }, { dt, maxFrame: 10, maxSteps: 3 });
    s.advance(1.0); // would be 60 steps; capped at 3, backlog dropped
    expect(calls).toBe(3);
    s.advance(dt); // clean frame -> ~1 step
    expect(calls).toBe(4);
  });

  it('does not step while paused and resumes without a burst', () => {
    const dt = 1 / 60;
    let calls = 0;
    const s = createSim(() => { calls += 1; }, { dt });
    s.advance(dt); // 1 step
    expect(calls).toBe(1);
    s.pause();
    s.advance(10); // huge gap while paused -> ignored
    expect(calls).toBe(1);
    expect(s.active()).toBe(false);
    s.resume();
    s.advance(dt); // one clean step, no catch-up
    expect(calls).toBe(2);
  });

  it('auto-pauses when the document goes hidden and resumes without catch-up', () => {
    const dt = 1 / 60;
    const vis = fakeVisibility();
    let calls = 0;
    const s = createSim(() => { calls += 1; }, { dt, visibility: vis });
    s.advance(dt);
    expect(calls).toBe(1);
    vis.set(true); // hidden
    expect(s.active()).toBe(false);
    s.advance(60); // a minute in the background -> nothing
    expect(calls).toBe(1);
    vis.set(false); // visible again
    expect(s.active()).toBe(true);
    s.advance(dt); // one step, NOT 3600
    expect(calls).toBe(2);
  });

  it('is deterministic: identical dt sequences produce identical step counts', () => {
    const dt = 1 / 60;
    const deltas = [0.005, 0.017, 0.018, 0.001, 0.059, 0.25, 0.001, 0.9];
    const run = () => {
      let c = 0;
      const s = createSim(() => { c += 1; }, { dt });
      deltas.forEach((d) => s.advance(d));
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

  it('ignores zero / negative dt and never reads real time', () => {
    const vis = defaultVisibility();
    expect(vis.hidden()).toBe(false); // node: no document
    let calls = 0;
    const s = createSim(() => { calls += 1; }, { dt: 1 / 60 });
    s.advance(0);
    s.advance(-1);
    expect(calls).toBe(0);
  });
});
