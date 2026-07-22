/* Scene lesson — la-vecops headless tests (Vitest, node env).

   P1 migration wave 1; scalar controls retrofitted to the v1.4 `slider`
   seam in P2 wave B (semantics-preserving — same goals/targets/tags/
   anti-gaming, only the control mechanism changed). Scenes are DATA +
   PURE PREDICATES; these need no GPU. Baseline-cleanliness and
   reachability are asserted through the SHARED quality helpers (CONTRACT
   v1.4 §6, test/helpers/scene-invariants.mjs). The helpers cover baseline
   + reachability but NOT gameability, so every magnitude/determinant goal
   additionally carries a per-goal ANTI-GAMING test in the la-dot style
   (degenerate strategy stays false; legit strategy credits). Tag
   migration + the reroll seam round it out. */
import { describe, it, expect, beforeAll } from 'vitest';
import { assertBaselineClean, assertReachable } from './helpers/scene-invariants.mjs';

let makeRng, validateScenes;
let scenesForLesson, capstoneFor, validateSceneLessons;

const LESSON = 'la-vecops';
const EXPECTED_IDS = [
  'vecops.addition', 'vecops.scaling', 'vecops.combination',
  'vecops.span', 'vecops.convex', 'vecops.capstone',
];

// pure vec helpers (mirror ./vec-math) for witnesses + anti-gaming states
const mag = (v) => Math.hypot(v.x, v.y);
const dot = (a, b) => a.x * b.x + a.y * b.y;
const det2 = (a, b) => a.x * b.y - a.y * b.x;
const solve2 = (a, b, t) => ({ c1: det2(t, b) / det2(a, b), c2: det2(a, t) / det2(a, b) });

beforeAll(async () => {
  ({ makeRng, validateScenes } = await import('../lib/scene/index.js'));
  const res = await import('../lib/curriculum/scenes/index.js');   // registers all scene modules
  ({ scenesForLesson, capstoneFor, validateSceneLessons } = res);
});

const sceneAt = (i) => scenesForLesson(LESSON)[i];

describe('registration + validation', () => {
  it('registers the six la-vecops scenes in arc order', () => {
    expect(scenesForLesson(LESSON).map((s) => s.id)).toEqual(EXPECTED_IDS);
  });
  it('passes the kit per-scene validateScenes() with zero problems', () => {
    expect(validateScenes()).toEqual([]);
  });
  it('passes the flagship lesson rule (exactly one capstone, last)', () => {
    expect(validateSceneLessons()).toEqual([]);
    expect(capstoneFor(LESSON).id).toBe('vecops.capstone');
  });
  it('every scene is plane2, caption ≤ 3 sentences, 2–5 goals with text/predicate/xp', () => {
    for (const s of scenesForLesson(LESSON)) {
      expect(s.space).toBe('plane2');
      expect(typeof s.caption).toBe('string');
      expect((s.caption.match(/[.!?](\s|$)/g) || []).length).toBeLessThanOrEqual(3);
      expect(s.goals.length).toBeGreaterThanOrEqual(2);
      expect(s.goals.length).toBeLessThanOrEqual(5);
      for (const g of s.goals) {
        expect(g.text.length).toBeGreaterThan(0);
        expect(typeof g.predicate).toBe('function');
        expect(typeof g.xp).toBe('number');
      }
    }
  });
  it('EVERY goal (not just the capstone) carries a tag and a non-empty focus', () => {
    for (const s of scenesForLesson(LESSON)) {
      s.goals.forEach((g, i) => {
        expect(g.tag, s.id + ' #' + i + ' tag').toBeTruthy();
        expect(typeof g.focus === 'string' && g.focus.length > 0, s.id + ' #' + i + ' focus').toBe(true);
      });
    }
  });
  it('scalar controls are real v1.4 sliders bound to scalar params (retrofitted from the track fallback)', () => {
    const expectSlider = (scene, params) => {
      expect(Array.isArray(scene.controls)).toBe(true);
      expect(scene.controls.map((c) => c.param)).toEqual(params);
      for (const c of scene.controls) {
        expect(c.kind).toBe('slider');
        expect(typeof scene.params[c.param]).toBe('number');
      }
    };
    expectSlider(sceneAt(1), ['c']);            // scaling
    expectSlider(sceneAt(2), ['c1', 'c2']);      // combination
    expectSlider(sceneAt(4), ['temp']);          // convex
    expectSlider(capstoneFor(LESSON), ['c1', 'c2']);
  });
});

/* THE GOAL-BASELINE INVARIANT + REACHABILITY — via the shared helpers
   (CONTRACT v1.4 §6). Static scenes: initial params. Capstone: 1000 seeds.
   Tight-tolerance scenes (combination reach, capstone) hand the reachability
   search analytic witnesses a coarse grid would step over. */
describe('baseline-cleanliness (shared helper, capstone ×1000 seeds)', () => {
  for (const id of EXPECTED_IDS) {
    it(id + ' — no goal satisfied at initial params', () => {
      assertBaselineClean(scenesForLesson(LESSON).find((s) => s.id === id));
    });
  }
});

describe('reachability (shared helper — search over handle/param space)', () => {
  it('vecops.addition — free a, b', () => { assertReachable(sceneAt(0)); });
  it('vecops.scaling — scalar c searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(1), { dims: [{ bind: 'c', range: [-2.5, 2.5], steps: 100 }] });
  });
  it('vecops.span — free b', () => { assertReachable(sceneAt(3)); });
  it('vecops.convex — query (handle) + temperature searched as an explicit scalar dim', () => {
    assertReachable(sceneAt(4), { dims: [{ bind: 'temp', range: [0.2, 5], steps: 60 }] });
  });

  it('vecops.combination — three targets via analytic witnesses', () => {
    assertReachable(sceneAt(2), {
      witnesses: (base) => [
        { ...base, c1: 2, c2: 1 },
        { ...base, c1: -1, c2: 2 },
        { ...base, c1: 2, c2: -1 },
      ],
    });
  });
  it('vecops.capstone — every target reachable for every seed (analytic witnesses)', () => {
    assertReachable(capstoneFor(LESSON), {
      seeds: 50,
      witnesses: (base) => {
        const coord = solve2(base.a, base.b, base.T);   // true (c1,c2) of the star
        return [
          { ...base, c1: base.sTarget },                                  // scalar target
          { ...base, c1: 1, c2: 1 },                                      // plain a+b
          { ...base, c1: coord.c1, c2: coord.c2 },                        // reach star
        ];
      },
    });
  });
});

describe('capstone: weak-area tag migration + the official reroll seam', () => {
  it('carries the old quiz’s three weak-area tags', () => {
    const tags = capstoneFor(LESSON).goals.map((g) => g.tag);
    expect(new Set(tags)).toEqual(new Set(['vector addition', 'scalar multiplication', 'linear combinations']));
    for (const g of capstoneFor(LESSON).goals) expect(typeof g.focus).toBe('string');
  });
  it('randomize(makeRng(seed)) is deterministic per seed, distinct across seeds', () => {
    const cap = capstoneFor(LESSON);
    expect(typeof cap.randomize).toBe('function');
    const draws = [1, 2, 3, 4, 5].map((seed) => JSON.stringify(cap.randomize(makeRng(seed))));
    expect(new Set(draws).size).toBe(draws.length);
    expect(cap.randomize(makeRng(7))).toEqual(cap.randomize(makeRng(7)));
  });
  it('params is the seed-1 draw, so every randomize key has an atom to write through', () => {
    const cap = capstoneFor(LESSON);
    expect(cap.params).toEqual(cap.randomize(makeRng(1)));
  });
  it('every capstone goal has hold>0 (drive-by passes are blocked, exam-wide)', () => {
    expect(capstoneFor(LESSON).goals.every((g) => g.hold > 0)).toBe(true);
  });
  it('the capstone uses a rotated ORTHOGONAL basis (‖c₁a+c₂b‖ bounded away from 0)', () => {
    const cap = capstoneFor(LESSON);
    for (let seed = 1; seed <= 200; seed++) {
      const p = cap.randomize(makeRng(seed));
      expect(Math.abs(dot(p.a, p.b))).toBeLessThan(1e-9);   // a ⟂ b
      expect(mag(p.T)).toBeGreaterThan(1);                  // star never near the origin baseline
    }
  });
});

/* ANTI-GAMING — the helpers prove baseline-clean + reachable but NOT
   ungameable (quality's explicit carve-out). Every magnitude/determinant
   goal: degenerate strategy stays false; legit strategy credits. */
describe('ANTI-GAMING: degenerate strategies must NOT credit', () => {
  it('vecops.addition g1 (cancel the height): two already-flat arrows must NOT credit; a real up/down pair does', () => {
    const s = sceneAt(0);
    // two flat horizontal arrows sum flat without any cancellation happening
    expect(s.goals[1].predicate({ a: { x: 2, y: 0 }, b: { x: 2, y: 0 } })).toBe(false);
    // one flat, one carrying all the height — still not an opposing cancellation
    expect(s.goals[1].predicate({ a: { x: 3, y: 0 }, b: { x: 1, y: 0.05 } })).toBe(false);
    // legitimate: genuine opposing vertical components that cancel to a flat sum
    expect(s.goals[1].predicate({ a: { x: 2, y: 1 }, b: { x: 1, y: -1 } })).toBe(true);
  });
  it('vecops.addition g2 (cancel to 0): shrinking both arrows to nothing must NOT credit', () => {
    const s = sceneAt(0);
    expect(s.goals[2].predicate({ a: { x: 0, y: 0 }, b: { x: 0, y: 0 } })).toBe(false);
    expect(s.goals[2].predicate({ a: { x: 0.1, y: 0 }, b: { x: -0.1, y: 0 } })).toBe(false); // both < MIN_MAG
    expect(s.goals[2].predicate({ a: { x: 2, y: 1 }, b: { x: -2, y: -1 } })).toBe(true);      // real, opposite
  });
  it('vecops.scaling g2 (shrink): collapsing c toward 0 must NOT credit as "shrunk"', () => {
    const s = sceneAt(1);
    expect(s.goals[2].predicate({ c: 0.05 })).toBe(false); // c<0.1, near-zero arrow
    expect(s.goals[2].predicate({ c: 0.3 })).toBe(true);   // a real half-length shrink
  });
  it('vecops.span (collapse): shrinking b to near-zero must NOT credit the parallel goal', () => {
    const s = sceneAt(3);
    expect(s.goals[1].predicate({ b: { x: 0.02, y: 0.01 } })).toBe(false);  // tiny & ~parallel — not a real vector
    expect(s.goals[1].predicate({ b: { x: 2, y: 1 } })).toBe(true);         // real vector genuinely parallel to a
  });
  it('vecops.convex g2 (blend): zeroing the query must NOT credit; raising temperature does', () => {
    const s = sceneAt(4);
    expect(s.goals[2].predicate({ q: { x: 0, y: 0 }, temp: 5 })).toBe(false);    // zero q flattens for free
    expect(s.goals[2].predicate({ q: { x: 1.6, y: 1.0 }, temp: 0.2 })).toBe(false); // real but cool
    expect(s.goals[2].predicate({ q: { x: 1.6, y: 1.0 }, temp: 5 })).toBe(true);    // real + hot
  });
});
