/* Scene lesson — la-vecops headless tests (Vitest, node env).

   P1 migration wave 1. Scenes are DATA + PURE PREDICATES; these need no
   GPU. They guard the same non-negotiable properties the authoring guide
   (docs/AUTHORING_SCENES.md) makes law for every migrated lesson, against
   the frozen Scene Kit CONTRACT v1:

   - registration + kit validation clean (per-scene shape + baseline eval);
   - flagship lesson rule: exactly one capstone, last (mirrors la-dot);
   - THE GOAL-BASELINE INVARIANT: no goal satisfied at initial params —
     every scene, and the randomized capstone across 1000 seeds;
   - REACHABILITY: every goal has at least one satisfying, reachable state;
   - weak-area TAG MIGRATION: the capstone carries the old quiz's three tags;
   - the OFFICIAL reroll seam (CONTRACT v1.1 §1/§8) determinism/distinctness;
   - ANTI-GAMING: degenerate (zero-vector / cool-query) strategies never credit. */
import { describe, it, expect, beforeAll } from 'vitest';

let SCENES, validateScenes, toAtoms, view, snapshot;
let makeRng, registerScene;
let scenesForLesson, capstoneFor, validateSceneLessons;

const LESSON = 'la-vecops';
const EXPECTED_IDS = [
  'vecops.addition', 'vecops.scaling', 'vecops.combination',
  'vecops.span', 'vecops.convex', 'vecops.capstone',
];

// pure vec helpers (mirror ./vec-math) for building witness states
const mag = (v) => Math.hypot(v.x, v.y);
const dot = (a, b) => a.x * b.x + a.y * b.y;
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (v, k) => ({ x: v.x * k, y: v.y * k });
const lincomb = (c1, a, c2, b) => add(scale(a, c1), scale(b, c2));
const det2 = (a, b) => a.x * b.y - a.y * b.x;
const solve2 = (a, b, t) => ({ c1: det2(t, b) / det2(a, b), c2: det2(a, t) / det2(a, b) });
const mapRange = (x, a0, a1, b0, b1) => b0 + ((x - a0) / (a1 - a0)) * (b1 - b0);

// track constants (replicated from la-vecops.js — module-scoped there)
const SC_X = 5.4, SC_LO = -4, SC_HI = 4, C_MIN = -2.5, C_MAX = 2.5;
const yForCS = (c) => mapRange(c, C_MIN, C_MAX, SC_LO, SC_HI);
const C1_X = 5.0, C2_X = 5.9, CB_LO = -4, CB_HI = 4, K_MIN = -3, K_MAX = 3;
const yForK = (k) => mapRange(k, K_MIN, K_MAX, CB_LO, CB_HI);
const A_C = { x: 2, y: 1 }, B_C = { x: 1, y: 3 };
const VALS = [{ x: -2.4, y: -1.2 }, { x: 2.6, y: -0.8 }, { x: 0.2, y: 2.8 }];
const CV_X = 5.4, CV_LO = -4, CV_HI = 4;
const CAP_C1_X = 5.0, CAP_C2_X = 5.9, CAP_LO = -4, CAP_HI = 4, CAP_KMIN = -2.6, CAP_KMAX = 2.6;
const capYForK = (k) => mapRange(k, CAP_KMIN, CAP_KMAX, CAP_LO, CAP_HI);

beforeAll(async () => {
  const kit = await import('../lib/scene/index.js');
  ({ SCENES, validateScenes, toAtoms, view, snapshot, makeRng, registerScene } = kit);
  const res = await import('../lib/curriculum/scenes/index.js');   // registers all scene modules
  ({ scenesForLesson, capstoneFor, validateSceneLessons } = res);
});

const initialSnapshot = (scene) => snapshot(toAtoms(scene.params || {}));
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
  it('every scene evaluates to a non-empty pure display list at baseline', () => {
    for (const s of scenesForLesson(LESSON)) {
      const list = s.entities(view(toAtoms(s.params || {})), 0);
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const e of list) expect(typeof e.kind).toBe('string');
    }
  });
});

describe('THE GOAL-BASELINE INVARIANT: nothing is satisfied at load', () => {
  it('no goal predicate is true at any scene’s initial params', () => {
    const offenders = [];
    for (const s of scenesForLesson(LESSON)) {
      const s0 = initialSnapshot(s);
      s.goals.forEach((g, i) => { if (g.predicate(s0)) offenders.push(s.id + ' #' + i); });
    }
    expect(offenders).toEqual([]);
  });
  it('the randomized capstone is baseline-clean for 1000 seeds', () => {
    const cap = capstoneFor(LESSON);
    const offenders = [];
    for (let seed = 1; seed <= 1000; seed++) {
      const s0 = cap.randomize(makeRng(seed));
      cap.goals.forEach((g, i) => { if (g.predicate(s0)) offenders.push(seed + '#' + i); });
    }
    expect(offenders).toEqual([]);
  });
});

describe('REACHABILITY: every goal has a satisfying, reachable state', () => {
  // Coarse grid over a scene's free vec params → candidate snapshots.
  function gridReach(scene, freeVecs, lo = -4, hi = 4, step = 0.5) {
    const base = initialSnapshot(scene);
    const axis = [];
    for (let v = lo; v <= hi + 1e-9; v += step) axis.push(+v.toFixed(3));
    const pts = [];
    for (const x of axis) for (const y of axis) pts.push({ x, y });
    const met = scene.goals.map(() => false);
    const rec = (k, s) => {
      if (k === freeVecs.length) {
        scene.goals.forEach((g, i) => { if (!met[i] && g.predicate(s)) met[i] = true; });
        return;
      }
      for (const pt of pts) rec(k + 1, { ...s, [freeVecs[k]]: pt });
    };
    rec(0, { ...base });
    return met;
  }

  it('vecops.addition — all goals reachable (free a, b)', () => {
    expect(gridReach(sceneAt(0), ['a', 'b'])).toEqual([true, true, true]);
  });
  it('vecops.span — all goals reachable (free b)', () => {
    expect(gridReach(sceneAt(3), ['b'])).toEqual([true, true, true]);
  });

  // Track-scalar scenes: explicit witnesses respecting the track constraint.
  it('vecops.scaling — reachable via the scalar track', () => {
    const s = sceneAt(1);
    expect(s.goals[0].predicate({ ck: { x: SC_X, y: yForCS(2.4) } })).toBe(true);   // c>2
    expect(s.goals[1].predicate({ ck: { x: SC_X, y: yForCS(-1) } })).toBe(true);    // c<-0.5
    expect(s.goals[2].predicate({ ck: { x: SC_X, y: yForCS(0.3) } })).toBe(true);   // 0.1<c<0.5
  });
  it('vecops.combination — each target reachable via the two scalar tracks', () => {
    const s = sceneAt(2);
    const at = (c1, c2) => ({ c1k: { x: C1_X, y: yForK(c1) }, c2k: { x: C2_X, y: yForK(c2) } });
    expect(s.goals[0].predicate(at(2, 1))).toBe(true);    // reach A = 2a+b
    expect(s.goals[1].predicate(at(-1, 2))).toBe(true);   // reach B = -a+2b (c1<0)
    expect(s.goals[2].predicate(at(2, -1))).toBe(true);   // reach C = 2a-b (c2<0)
  });
  it('vecops.convex — reachable via query + temperature knob', () => {
    const s = sceneAt(4);
    expect(s.goals[0].predicate({ q: VALS[0], tk: { x: CV_X, y: CV_LO } })).toBe(true);  // v1 weight
    expect(s.goals[1].predicate({ q: VALS[2], tk: { x: CV_X, y: CV_LO } })).toBe(true);  // v3 weight
    expect(s.goals[2].predicate({ q: { x: 1.6, y: 1.0 }, tk: { x: CV_X, y: CV_HI } })).toBe(true); // blend
  });
  it('vecops.capstone — every target reachable for many seeds', () => {
    const cap = capstoneFor(LESSON);
    for (let seed = 1; seed <= 50; seed++) {
      const p = cap.randomize(makeRng(seed));
      const coord = solve2(p.a, p.b, p.T);                                  // true (c1,c2) of the star
      const g0 = { ...p, c1k: { x: CAP_C1_X, y: capYForK(p.sTarget) } };    // scalar target
      const g1 = { ...p, c1k: { x: CAP_C1_X, y: capYForK(1) }, c2k: { x: CAP_C2_X, y: capYForK(1) } };
      const g2 = { ...p, c1k: { x: CAP_C1_X, y: capYForK(coord.c1) }, c2k: { x: CAP_C2_X, y: capYForK(coord.c2) } };
      expect(cap.goals[0].predicate(g0)).toBe(true);
      expect(cap.goals[1].predicate(g1)).toBe(true);
      expect(cap.goals[2].predicate(g2)).toBe(true);
    }
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
  it('the capstone uses a rotated ORTHOGONAL basis (‖a·c1+b·c2‖ bounded away from 0)', () => {
    const cap = capstoneFor(LESSON);
    for (let seed = 1; seed <= 200; seed++) {
      const p = cap.randomize(makeRng(seed));
      expect(Math.abs(dot(p.a, p.b))).toBeLessThan(1e-9);   // a ⟂ b
      expect(mag(p.T)).toBeGreaterThan(1);                  // star never near the origin baseline
    }
  });
});

describe('ANTI-GAMING: degenerate strategies must NOT credit', () => {
  it('vecops.addition g2 (cancel to 0): shrinking both arrows to nothing must NOT credit', () => {
    const s = sceneAt(0);
    expect(s.goals[2].predicate({ a: { x: 0, y: 0 }, b: { x: 0, y: 0 } })).toBe(false);
    expect(s.goals[2].predicate({ a: { x: 0.1, y: 0 }, b: { x: -0.1, y: 0 } })).toBe(false); // both < MIN_MAG
    // legitimate: two real, opposite arrows
    expect(s.goals[2].predicate({ a: { x: 2, y: 1 }, b: { x: -2, y: -1 } })).toBe(true);
  });
  it('vecops.scaling g2 (shrink): collapsing c toward 0 must NOT credit as "shrunk"', () => {
    const s = sceneAt(1);
    expect(s.goals[2].predicate({ ck: { x: SC_X, y: yForCS(0.05) } })).toBe(false); // c<0.1, near-zero arrow
    expect(s.goals[2].predicate({ ck: { x: SC_X, y: yForCS(0.3) } })).toBe(true);   // a real half-length shrink
  });
  it('vecops.span g2/collapse: shrinking b to near-zero must NOT credit the parallel goal', () => {
    const s = sceneAt(3);
    // b tiny & parallel to a → det ≈ 0 but b is not a real vector
    expect(s.goals[1].predicate({ b: { x: 0.02, y: 0.01 } })).toBe(false);
    // legitimate: b a real vector genuinely parallel to a = [2,1]
    expect(s.goals[1].predicate({ b: { x: 2, y: 1 } })).toBe(true);
  });
  it('vecops.convex g2 (blend): zeroing the query must NOT credit; raising temperature does', () => {
    const s = sceneAt(4);
    // zero query → every score 0 → uniform 1/3 weights under ANY temperature, "flat" for free
    expect(s.goals[2].predicate({ q: { x: 0, y: 0 }, tk: { x: CV_X, y: CV_HI } })).toBe(false);
    // real but cool query must not credit either — the goal is specifically about heat
    expect(s.goals[2].predicate({ q: { x: 1.6, y: 1.0 }, tk: { x: CV_X, y: CV_LO } })).toBe(false);
    // legitimate: real query, temperature genuinely raised
    expect(s.goals[2].predicate({ q: { x: 1.6, y: 1.0 }, tk: { x: CV_X, y: CV_HI } })).toBe(true);
  });
});
