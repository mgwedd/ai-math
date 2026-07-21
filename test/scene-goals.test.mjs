/* Scene-goals runtime audit (Vitest).

   Proves lib/scene/goals.js (the runtime for kit-core's CONTRACT §7 goal/
   episode descriptors) honours the crediting rules, which SUPERSEDE the plain
   missions baseline (architect ruling):

     1. BASELINE — the first evaluate() after mount never credits, even for a
        predicate true at the default state (mirrors makeMissions).
     2. LEARNER-INPUT GATE — nothing credits (goal/episode/visited) until
        markLearnerInput() has fired: an auto-run sim reporting an episode at
        load, or a mount tween sweeping params through a qualifying region,
        credits NOTHING pre-input. Post-input everything behaves as before.
     3. HOLD-TIME — predicate must stay true `hold` ms; drop-then-reacquire
        resets; a learner who stops interacting still completes via the armed
        timer.
     4. PERSISTENCE — index→bool shape in the injected store; already-complete
        re-entry schedules onAllDone at 0ms, and dispose() BEFORE the tick
        cancels it (stale-confetti leak finding).
     5. visited() — accumulates variant keys (baseline included), completes
        only post-gate; throws at construction on a missing/zero requirement. */
import { describe, it, expect } from 'vitest';
import { goal, episode } from '../lib/scene/seams/goals.js';
import { visited, makeGoals, memStore } from '../lib/scene/goals.js';

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
      let ran = true;
      while (ran) {
        ran = false;
        const due = pending.filter((p) => p.at <= t).sort((a, b) => a.at - b.at);
        if (due.length) {
          const p = due[0];
          pending.splice(pending.indexOf(p), 1);
          p.fn();
          ran = true;
        }
      }
    },
    pendingCount: () => pending.length,
  };
}

describe('baseline invariant (rule 1)', () => {
  it('does NOT complete a goal whose predicate is true on the FIRST evaluate', () => {
    const store = memStore();
    const g = makeGoals([goal('always true', () => true, { xp: 20 })], { store });
    g.markLearnerInput();                 // even with input observed...
    g.evaluate({});                       // ...the first evaluate is the baseline
    expect(g.allDone()).toBe(false);
    expect(store._peek()[0]).toBeUndefined();
  });

  it('credits a check true at the default state only on a later, post-input evaluate', () => {
    const g = makeGoals([goal('true at default', (s) => s.v === 0, { xp: 20 })]);
    g.evaluate({ v: 0 });                 // baseline
    g.markLearnerInput();
    g.evaluate({ v: 1 });                 // moved away
    expect(g.allDone()).toBe(false);
    g.evaluate({ v: 0 });                 // returned to qualifying state
    expect(g.allDone()).toBe(true);
  });
});

describe('learner-input gate (rule 2, architect ruling)', () => {
  it('a tween sweeping params through a qualifying region pre-input never credits', () => {
    // Simulates a mount animation: per-frame evaluates walk v across the
    // qualifying region with ZERO learner input. Nothing may credit.
    const g = makeGoals([goal('reach v≈5', (s) => Math.abs(s.v - 5) < 1, { xp: 20 })]);
    for (let v = 0; v <= 10; v++) g.evaluate({ v });   // frame sweep, incl. v=5
    expect(g.allDone()).toBe(false);
    g.markLearnerInput();                 // learner finally acts
    g.evaluate({ v: 5 });
    expect(g.allDone()).toBe(true);
  });

  it('an auto-run episode pre-input never credits; a post-input run does', () => {
    const g = makeGoals([episode('converge ≤ 8 steps', (ep) => ep.steps <= 8 && ep.converged, { xp: 30 })]);
    g.reportEpisode({ steps: 3, converged: true });    // auto-run sim at load
    expect(g.allDone()).toBe(false);                   // gated: no input yet
    g.markLearnerInput();
    g.reportEpisode({ steps: 12, converged: true });   // learner's run, outcome misses
    expect(g.allDone()).toBe(false);
    g.reportEpisode({ steps: 5, converged: true });    // learner's run, qualifies
    expect(g.allDone()).toBe(true);
  });

  it('visited() cannot complete pre-input even after seeing all variants', () => {
    const g = makeGoals([visited('try both', (s) => s.variant, ['a', 'b'], { xp: 15 })]);
    g.evaluate({ variant: 'a' });         // baseline (records 'a')
    g.evaluate({ variant: 'b' });         // auto-sweep records 'b' — but no input
    expect(g.allDone()).toBe(false);
    g.markLearnerInput();
    g.evaluate({ variant: 'a' });         // post-input evaluate → both seen → done
    expect(g.allDone()).toBe(true);
  });

  it('an episode reported before the first evaluate does not consume the baseline', () => {
    // Regression (earlier verifier finding), restated under the gate: whatever
    // reportEpisode does, the FIRST evaluate must still be the baseline.
    const g = makeGoals([
      goal('true at default', (s) => s.v === 0, { xp: 20 }),
      episode('any outcome', () => true, { xp: 10 }),
    ]);
    g.markLearnerInput();                 // input observed before any evaluate
    g.reportEpisode({});                  // episode credits (input already seen)
    expect(g.isDone(1)).toBe(true);
    g.evaluate({ v: 0 });                 // FIRST evaluate — still the baseline
    expect(g.isDone(0)).toBe(false);
    g.evaluate({ v: 1 });
    g.evaluate({ v: 0 });
    expect(g.isDone(0)).toBe(true);
  });
});

describe('hold-time (rule 3)', () => {
  it('drive-by pass never credits; drop resets; sustained hold credits at T+hold', () => {
    const clk = fakeTimers();
    let value = 0;
    const g = makeGoals([goal('hold v>=1 for 500ms', (s) => s.v >= 1, { xp: 10, hold: 500 })],
      { now: clk.now, schedule: clk.schedule, cancel: clk.cancel });
    g.evaluate({ v: value });             // baseline
    g.markLearnerInput();
    value = 1; g.evaluate({ v: value });  // true, clock starts (t=0)
    expect(g.allDone()).toBe(false);
    clk.advance(200);
    value = 0; g.evaluate({ v: value });  // dropped before hold elapsed → reset
    clk.advance(400);                     // armed timer fires but predicate false
    expect(g.allDone()).toBe(false);
    value = 1; g.evaluate({ v: value });  // true again, hold restarts
    clk.advance(500);                     // armed re-check at T+hold → credit
    expect(g.allDone()).toBe(true);       // learner STOPPED interacting — still completes
  });

  it('completes via a later evaluate (poll path), independent of the armed timer', () => {
    let clock = 0;
    const g = makeGoals([goal('hold', () => true, { xp: 5, hold: 300 })],
      { now: () => clock, schedule: () => 1, cancel: () => {} });
    g.evaluate({});                       // baseline
    g.markLearnerInput();
    g.evaluate({});                       // true, start hold at t=0
    clock = 299; g.evaluate({});
    expect(g.allDone()).toBe(false);
    clock = 300; g.evaluate({});          // held long enough → credit on this poll
    expect(g.allDone()).toBe(true);
  });

  it('the armed hold timer cannot credit pre-input', () => {
    const clk = fakeTimers();
    const g = makeGoals([goal('hold', () => true, { xp: 5, hold: 100 })],
      { now: clk.now, schedule: clk.schedule, cancel: clk.cancel });
    g.evaluate({});                       // baseline
    g.evaluate({});                       // pre-input: crediting path is gated
    clk.advance(1000);
    expect(g.allDone()).toBe(false);
  });
});

describe('visited() construction validation', () => {
  it('throws on undefined / 0 / empty-array required', () => {
    expect(() => visited('bad', () => 1, undefined)).toThrow();
    expect(() => visited('bad', () => 1, 0)).toThrow();
    expect(() => visited('bad', () => 1, [])).toThrow();
    expect(() => visited('ok', () => 1, 1)).not.toThrow();
    expect(() => visited('ok', () => 1, ['a'])).not.toThrow();
  });

  it('count form requires distinct keys', () => {
    const g = makeGoals([visited('visit 3 cells', (s) => s.cell, 3, { xp: 5 })]);
    g.evaluate({ cell: 1 });        // baseline
    g.markLearnerInput();
    g.evaluate({ cell: 2 });
    g.evaluate({ cell: 2 });        // dup ignored
    expect(g.allDone()).toBe(false);
    g.evaluate({ cell: 3 });        // 3 distinct → done
    expect(g.allDone()).toBe(true);
  });
});

describe('persistence + re-entry + dispose (rule 4)', () => {
  it('persists index→bool and hands the FULL descriptor (tag/focus intact) to onComplete', () => {
    const store = memStore();
    const seen = [];
    const defs = [
      goal('a', (s) => s.ok, { xp: 20, tag: 'dot product', focus: 'study cosine' }),
      goal('b', (s) => s.ok2, { xp: 10 }),
    ];
    const g = makeGoals(defs, { store, onComplete: (d, i) => seen.push([i, d.tag, d.focus]) });
    g.evaluate({});
    g.markLearnerInput();
    g.evaluate({ ok: true });
    expect(store._peek()).toEqual({ 0: true });
    expect(seen).toEqual([[0, 'dot product', 'study cosine']]);   // tag/focus ride through
    expect(g.remaining()).toBe(1);
  });

  it('schedules onAllDone when every goal is already saved on mount (deferred)', () => {
    const clk = fakeTimers();
    const store = memStore({ 0: true, 1: true });
    let fired = false;
    const g = makeGoals([goal('a', () => false, { xp: 1 }), goal('b', () => false, { xp: 1 })], {
      store, onAllDone: () => { fired = true; },
      now: clk.now, schedule: clk.schedule, cancel: clk.cancel,
    });
    expect(g.allDone()).toBe(true);
    expect(fired).toBe(false);
    clk.advance(0);
    expect(fired).toBe(true);
  });

  it('dispose() before the deferred tick cancels the stale onAllDone (leak finding)', () => {
    const clk = fakeTimers();
    const store = memStore({ 0: true });
    let fired = false;
    const g = makeGoals([goal('a', () => false, { xp: 1 })], {
      store, onAllDone: () => { fired = true; },
      now: clk.now, schedule: clk.schedule, cancel: clk.cancel,
    });
    g.dispose();                          // navigate away before the tick
    clk.advance(0);
    expect(fired).toBe(false);            // no confetti over the next screen
    expect(clk.pendingCount()).toBe(0);   // token actually cancelled
  });

  it('does not double-credit an already-saved goal', () => {
    const store = memStore({ 0: true });
    let calls = 0;
    const g = makeGoals([goal('a', () => true, { xp: 20 })], { store, onComplete: () => calls++ });
    g.evaluate({});
    g.markLearnerInput();
    g.evaluate({});
    expect(calls).toBe(0);
    expect(g.allDone()).toBe(true);
  });
});
