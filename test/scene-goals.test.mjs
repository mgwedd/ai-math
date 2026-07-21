/* Scene-goals runtime audit (Vitest).

   Proves lib/scene/goals.js honours the same completion contract as the legacy
   missions engine, PLUS the new hold-time / episode / visited behaviours:

     1. BASELINE INVARIANT — the first evaluate() after mount never credits,
        even for a predicate that is true at the default state (mirrors
        makeMissions, pinned in missions.test.mjs).
     2. HOLD-TIME — a predicate must stay true for `hold` ms; a drive-by pass
        is not credited, and a learner who stops interacting still completes via
        the armed timer.
     3. EPISODE — outcome goals credit only on an explicit reportEpisode().
     4. VISITED — accumulates variant keys across evaluations, completing once
        all required variants have been seen; suppressed at baseline.
     5. PERSISTENCE — writes the index→bool shape into the injected store, and a
        fully-saved scene fires onAllDone via schedule(…,0) (already-complete
        re-entry). */
import { describe, it, expect, vi } from 'vitest';
import { goal, episode, visited, makeGoals, memStore } from '../lib/scene/goals.js';

// A controllable clock + scheduler so hold-time is deterministic (no real waits).
function fakeTimers() {
  let t = 0;
  const pending = [];   // {at, fn, id}
  let nextId = 1;
  return {
    now: () => t,
    schedule: (fn, ms) => { const id = nextId++; pending.push({ at: t + ms, fn, id }); return id; },
    cancel: (id) => { const i = pending.findIndex((p) => p.id === id); if (i >= 0) pending.splice(i, 1); },
    advance(ms) {
      t += ms;
      // fire everything due, in time order, allowing re-arming
      let ran = true;
      while (ran) {
        ran = false;
        const due = pending.filter((p) => p.at <= t).sort((a, b) => a.at - b.at);
        if (due.length) {
          const p = due[0];
          const i = pending.indexOf(p);
          pending.splice(i, 1);
          p.fn();
          ran = true;
        }
      }
    },
  };
}

describe('makeGoals baseline invariant', () => {
  it('does NOT complete a goal whose predicate is true on the FIRST evaluate', () => {
    const store = memStore();
    const g = makeGoals([goal('always true', () => true, { xp: 20 })], { store });
    g.evaluate({});                       // baseline
    expect(g.allDone()).toBe(false);
    expect(store._peek()[0]).toBeUndefined();
  });

  it('credits a check that is already true at the default state, on a later evaluate', () => {
    const g = makeGoals([goal('true at default', (s) => s.v === 0, { xp: 20 })]);
    g.evaluate({ v: 0 });                 // baseline, default state — no credit
    expect(g.allDone()).toBe(false);
    g.evaluate({ v: 1 });                 // moved away
    expect(g.allDone()).toBe(false);
    g.evaluate({ v: 0 });                 // returned to qualifying state
    expect(g.allDone()).toBe(true);
  });

  it('completes a no-hold goal on a later learner-driven evaluate', () => {
    let interacted = false;
    const g = makeGoals([goal('after interaction', () => interacted, { xp: 20 })]);
    g.evaluate({});
    expect(g.allDone()).toBe(false);
    interacted = true;
    g.evaluate({});
    expect(g.allDone()).toBe(true);
  });
});

describe('makeGoals hold-time', () => {
  it('does not credit a drive-by pass, credits once held long enough', () => {
    const clk = fakeTimers();
    let value = 0;
    const g = makeGoals([goal('hold v>=1 for 500ms', (s) => s.v >= 1, { hold: 500 })],
      { now: clk.now, schedule: clk.schedule, cancel: clk.cancel });
    g.evaluate({ v: value });             // baseline
    value = 1; g.evaluate({ v: value });  // predicate true, clock starts (t=0)
    expect(g.allDone()).toBe(false);      // not held yet
    clk.advance(200);
    value = 0; g.evaluate({ v: value });  // dropped before hold elapsed → reset
    clk.advance(400);                     // armed timer would fire but predicate is false
    expect(g.allDone()).toBe(false);
    value = 1; g.evaluate({ v: value });  // true again, restart hold at t=600
    clk.advance(500);                     // held long enough via the armed re-check
    expect(g.allDone()).toBe(true);
  });

  it('completes via a later evaluate (poll path), independent of the armed timer', () => {
    // A scheduler that records but never auto-fires: proves the elapsed-time
    // branch in checkState completes on the NEXT evaluate, not only via timer.
    let clock = 0;
    const g = makeGoals([goal('hold', () => true, { hold: 300 })],
      { now: () => clock, schedule: () => 1, cancel: () => {} });
    g.evaluate({});                       // baseline
    g.evaluate({});                       // true, start hold at t=0
    expect(g.allDone()).toBe(false);
    clock = 299; g.evaluate({});          // not enough elapsed
    expect(g.allDone()).toBe(false);
    clock = 300; g.evaluate({});          // held long enough → credit on this poll
    expect(g.allDone()).toBe(true);
  });
});

describe('makeGoals episode outcomes', () => {
  it('an episode reported BEFORE the first evaluate does not consume the baseline', () => {
    // Regression (verifier finding): reportEpisode used to set baselined=true,
    // so a sim scene reporting an outcome during mount made the mount's first
    // evaluate() a CREDITING pass — a state goal true at the default state
    // auto-completed on load. Episodes must leave the state-goal baseline alone.
    const g = makeGoals([
      goal('true at default', (s) => s.v === 0, { xp: 20 }),
      episode('any outcome', () => true, { xp: 10 }),
    ]);
    g.reportEpisode({});                  // episode lands before first evaluate
    expect(g.isDone(1)).toBe(true);       // episode itself credits (learner-driven)
    g.evaluate({ v: 0 });                 // FIRST evaluate — still the baseline
    expect(g.isDone(0)).toBe(false);      // must NOT credit the state goal
    g.evaluate({ v: 1 });
    g.evaluate({ v: 0 });                 // learner returns to qualifying state
    expect(g.isDone(0)).toBe(true);
  });

  it('credits only on reportEpisode, never on evaluate', () => {
    const g = makeGoals([episode('converge ≤ 8 steps', (ep) => ep.steps <= 8 && ep.converged, { xp: 30 })]);
    g.evaluate({ steps: 3, converged: true });   // evaluate must not touch episodes
    expect(g.allDone()).toBe(false);
    g.reportEpisode({ steps: 12, converged: true });
    expect(g.allDone()).toBe(false);             // outcome doesn't satisfy
    g.reportEpisode({ steps: 5, converged: true });
    expect(g.allDone()).toBe(true);
  });
});

describe('visited() combinator', () => {
  it('completes once all required variants seen (array form), not at baseline', () => {
    const store = memStore();
    const g = makeGoals([visited('try both', (s) => s.variant, ['a', 'b'], { xp: 15 })], { store });
    g.evaluate({ variant: 'a' });   // baseline: records 'a' but cannot complete
    expect(g.allDone()).toBe(false);
    g.evaluate({ variant: 'a' });   // still only one variant
    expect(g.allDone()).toBe(false);
    g.evaluate({ variant: 'b' });   // both now seen → complete
    expect(g.allDone()).toBe(true);
    expect(store._peek()[0]).toBe(true);
  });

  it('supports a count form', () => {
    const g = makeGoals([visited('visit 3 cells', (s) => s.cell, 3)]);
    g.evaluate({ cell: 1 });        // baseline
    g.evaluate({ cell: 2 });
    g.evaluate({ cell: 2 });        // dup ignored
    expect(g.allDone()).toBe(false);
    g.evaluate({ cell: 3 });
    g.evaluate({ cell: 4 });        // 3 distinct post-baseline (1,2,3,4 → size≥3)
    expect(g.allDone()).toBe(true);
  });
});

describe('makeGoals persistence + already-complete re-entry', () => {
  it('persists the index→bool shape and fires onComplete with the def', () => {
    const store = memStore();
    const seen = [];
    const defs = [goal('a', (s) => s.ok, { xp: 20 }), goal('b', (s) => s.ok2, { xp: 10 })];
    const g = makeGoals(defs, { store, onComplete: (d, i) => seen.push([i, d.text]) });
    g.evaluate({});                 // baseline
    g.evaluate({ ok: true });
    expect(store._peek()).toEqual({ 0: true });
    expect(seen).toEqual([[0, 'a']]);
    expect(g.remaining()).toBe(1);
  });

  it('schedules onAllDone when every goal is already saved on mount', () => {
    const clk = fakeTimers();
    const store = memStore({ 0: true, 1: true });
    let fired = false;
    const g = makeGoals([goal('a', () => false), goal('b', () => false)], {
      store, onAllDone: () => { fired = true; },
      now: clk.now, schedule: clk.schedule, cancel: clk.cancel,
    });
    expect(g.allDone()).toBe(true);
    expect(fired).toBe(false);      // deferred, not synchronous
    clk.advance(0);
    expect(fired).toBe(true);
  });

  it('does not double-credit an already-saved goal', () => {
    const store = memStore({ 0: true });
    let calls = 0;
    const g = makeGoals([goal('a', () => true, { xp: 20 })], { store, onComplete: () => calls++ });
    g.evaluate({});
    g.evaluate({});
    expect(calls).toBe(0);
    expect(g.allDone()).toBe(true);
  });
});
