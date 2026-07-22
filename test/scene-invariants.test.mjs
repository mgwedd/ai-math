/* ================================================================
   Teeth for the SHARED INVARIANT HELPERS (test/helpers/scene-invariants.mjs).
   ----------------------------------------------------------------
   These helpers are the platform guard every migrated lesson relies on
   (CONTRACT v1.4 §6). A guard that can't FAIL is worse than none — the
   P0 harness shipped two vacuous tests that silently passed. So this
   file proves the machinery has TEETH against inline good/bad scene
   descriptors: a baseline-dirty scene MUST be flagged, an impossible
   goal MUST be flagged, and the clean/reachable controls MUST pass.

   The helpers operate on a raw registerScene descriptor (no registry
   entry needed), so these fixtures are plain objects — nothing leaks
   into the SCENES registry.
   ================================================================ */
import { describe, it, expect } from 'vitest';
import { vec, makeRng } from '../lib/scene/index.js';
import {
  baselineViolations, assertBaselineClean,
  reachability, unreachableGoals, assertReachable, handleDims, initialSnapshot,
} from './helpers/scene-invariants.mjs';

// A minimal draggable-vector scene: entity `vector` carries handle 'a'.
const sceneWith = (params, goals, extra = {}) => ({
  id: extra.id || '__inv_fixture',
  space: 'plane2',
  params,
  entities: (p) => [{ kind: 'vector', v: p.a, handle: 'a' }],
  goals,
  ...extra,
});

describe('(a) baseline-cleanliness has teeth', () => {
  it('FLAGS a goal already satisfied at initial params', () => {
    const dirty = sceneWith({ a: vec(2, 0) }, [
      { text: 'x is positive', predicate: (s) => s.a.x > 0, xp: 10 },
    ]);
    const bad = baselineViolations(dirty);
    expect(bad.length).toBe(1);
    expect(bad[0]).toContain('#0');
    expect(() => assertBaselineClean(dirty)).toThrow(/baseline-cleanliness VIOLATED/);
  });

  it('PASSES a scene where no goal is true at load', () => {
    const clean = sceneWith({ a: vec(-2, 0) }, [
      { text: 'x is positive', predicate: (s) => s.a.x > 0, xp: 10 },
    ]);
    expect(baselineViolations(clean)).toEqual([]);
    expect(assertBaselineClean(clean)).toBe(true);
  });

  it('checks a randomized capstone across seeds and NAMES the offending seed', () => {
    // randomize sometimes draws x>0 (≈ half the seeds) → baseline-dirty.
    const cap = {
      id: '__inv_cap', capstone: true,
      space: 'plane2', params: { a: vec(0, 0) },
      entities: (p) => [{ kind: 'vector', v: p.a, handle: 'a' }],
      randomize: (rng) => ({ a: vec(rng() * 8 - 4, 0) }),
      goals: [{ text: 'x positive', predicate: (s) => s.a.x > 0, xp: 10 }],
    };
    const bad = baselineViolations(cap, { seeds: 200 });
    expect(bad.length).toBeGreaterThan(0);
    expect(bad[0]).toMatch(/seed \d+/);
  });

  it('a clean randomized capstone passes across 1000 seeds', () => {
    const cap = {
      id: '__inv_cap_clean', capstone: true,
      space: 'plane2', params: { a: vec(-1, 0) },
      entities: (p) => [{ kind: 'vector', v: p.a, handle: 'a' }],
      randomize: (rng) => ({ a: vec(-(1 + rng() * 3), 0) }),   // always x<0
      goals: [{ text: 'x positive', predicate: (s) => s.a.x > 0, xp: 10 }],
    };
    expect(assertBaselineClean(cap, { seeds: 1000 })).toBe(true);
  });

  it('FLAGS a randomized scene whose initial params diverge and are dirty, even when every seed draw is clean', () => {
    // Authoring error: params doesn't match any randomize() draw AND is
    // pre-satisfied. The seed loop would miss it; the always-checked initial
    // params must catch it.
    const cap = {
      id: '__inv_divergent', capstone: true, space: 'plane2',
      params: { a: vec(3, 0) },                              // dirty: x>0, not a draw
      entities: (p) => [{ kind: 'vector', v: p.a, handle: 'a' }],
      randomize: (rng) => ({ a: vec(-(1 + rng() * 3), 0) }), // every draw x<0 (clean)
      goals: [{ text: 'x positive', predicate: (s) => s.a.x > 0, xp: 10 }],
    };
    const bad = baselineViolations(cap, { seeds: 100 });
    expect(bad.length).toBe(1);
    expect(bad[0]).toContain('initial params');
  });

  it('a throwing predicate is treated as NOT satisfied (baseline stays clean)', () => {
    const scene = sceneWith({ a: vec(1, 1) }, [
      { text: 'boom', predicate: () => { throw new Error('boom'); }, xp: 10 },
    ]);
    expect(baselineViolations(scene)).toEqual([]);
  });
});

describe('(b) reachability search has teeth', () => {
  it('FLAGS an impossible goal (no state in handle space satisfies it)', () => {
    const scene = sceneWith({ a: vec(0, 0) }, [
      { text: 'unreachable', predicate: (s) => s.a.x > 1000, xp: 10 },
    ]);
    const bad = unreachableGoals(scene);
    expect(bad).toEqual([{ index: 0, text: 'unreachable' }]);
    expect(() => assertReachable(scene)).toThrow(/reachability VIOLATED/);
  });

  it('PASSES a goal reachable somewhere in the [-4,4] grid', () => {
    const scene = sceneWith({ a: vec(0, 0) }, [
      { text: 'x over 2', predicate: (s) => s.a.x > 2, xp: 10 },
    ]);
    expect(reachability(scene).met).toEqual([true]);
    expect(assertReachable(scene)).toBe(true);
  });

  it('auto-discovers the handle-bound dim from the display list', () => {
    const scene = sceneWith({ a: vec(0, 0) }, []);
    expect(handleDims(scene).map((d) => d.bind)).toEqual(['a']);
  });

  it('applies a handle constrain closure so search covers the manifold', () => {
    // a is clamped to the circle r=3 → x>2 is reachable ON the circle,
    // x>5 is NOT (radius caps it). Proves the search rides the constraint.
    const onCircle = (pt) => {
      const m = Math.hypot(pt.x, pt.y) || 1;
      return { x: (pt.x / m) * 3, y: (pt.y / m) * 3 };
    };
    const scene = {
      id: '__inv_circle', space: 'plane2', params: { a: vec(3, 0) },
      entities: (p) => [{ kind: 'vector', v: p.a, handle: { bind: 'a', constrain: onCircle } }],
      goals: [
        { text: 'reachable on circle', predicate: (s) => s.a.x > 2, xp: 10 },
        { text: 'past the radius', predicate: (s) => s.a.x > 5, xp: 10 },
      ],
    };
    expect(reachability(scene).met).toEqual([true, false]);
  });

  it('finds a tight goal only via caller-supplied witnesses', () => {
    // predicate true only in a razor-thin band the 0.5 grid steps over.
    const scene = sceneWith({ a: vec(0, 0) }, [
      { text: 'needle', predicate: (s) => Math.abs(s.a.x - 1.234) < 0.001, xp: 10 },
    ]);
    expect(reachability(scene).met).toEqual([false]);         // grid misses it
    const withWitness = reachability(scene, {
      witnesses: () => [{ a: vec(1.234, 0) }],
    });
    expect(withWitness.met).toEqual([true]);                  // witness nails it
  });

  it('supports explicit scalar (slider-style) dims not bound to a handle', () => {
    // forward-compat for the v1.4 `slider` control: a scalar param the
    // search must vary even though no entity carries a handle for it.
    const scene = {
      id: '__inv_scalar', space: 'plane2', params: { a: vec(0, 0), lr: 0.01 },
      entities: (p) => [{ kind: 'vector', v: p.a, handle: 'a' }],
      goals: [{ text: 'lr high', predicate: (s) => s.lr > 0.9, xp: 10 }],
    };
    expect(reachability(scene).met).toEqual([false]);          // lr never varied → misses
    const withDim = reachability(scene, { dims: [{ bind: 'lr', range: [0, 1], steps: 20 }] });
    expect(withDim.met).toEqual([true]);
  });

  it('requires reachability across ALL capstone seeds (AND semantics)', () => {
    // goal reachable for some seeds' base but impossible for others → NOT reachable.
    const cap = {
      id: '__inv_seedgate', capstone: true, space: 'plane2', params: { a: vec(0, 0) },
      entities: (p) => [{ kind: 'vector', v: p.a, handle: 'a' }],
      randomize: (rng) => ({ a: vec(0, 0), cap: rng() < 0.5 ? 1 : 100 }),
      // reachable only when the drawn cap is small (a.x can exceed it within ±4)
      goals: [{ text: 'beat cap', predicate: (s) => s.a.x > s.cap, xp: 10 }],
    };
    expect(reachability(cap, { seeds: 20 }).met).toEqual([false]);
  });

  it('throws (no silent partial search) when the space exceeds maxCombos', () => {
    const scene = {
      id: '__inv_blowup', space: 'plane2', params: { a: vec(0, 0), b: vec(0, 0) },
      entities: (p) => [
        { kind: 'vector', v: p.a, handle: 'a' },
        { kind: 'vector', v: p.b, handle: 'b' },
      ],
      goals: [{ text: 'x', predicate: (s) => s.a.x > 2, xp: 10 }],
    };
    expect(() => reachability(scene, { step: 0.1, maxCombos: 1000 }))
      .toThrow(/exceeds maxCombos/);
  });

  it('a goal-less scene reports no violations and nothing unreachable', () => {
    const scene = sceneWith({ a: vec(0, 0) }, []);
    expect(baselineViolations(scene)).toEqual([]);
    expect(unreachableGoals(scene)).toEqual([]);
    expect(reachability(scene).met).toEqual([]);
  });
});

describe('initialSnapshot', () => {
  it('returns the raw param values as a plain snapshot', () => {
    const s = initialSnapshot(sceneWith({ a: vec(2, 3) }, []));
    expect(s).toEqual({ a: { x: 2, y: 3 } });
  });
});
