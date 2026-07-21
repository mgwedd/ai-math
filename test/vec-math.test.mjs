/* Unit coverage for lib/curriculum/scenes/vec-math.js — the content-side
   vector math shared by every la-dot / calc-* scene (kit-core exports no
   math; see the module's own header note). Previously zero coverage on the
   constraint closures, softmax, mapRange, and projVec (review-confirmed
   gap) even though la-dot's scene tests exercise them indirectly through
   full scenes. These tests hit each helper directly, in isolation. */
import { describe, it, expect } from 'vitest';
import {
  dot, mag, add, sub, scale, clamp, norm, cos, angleDeg, proj, projVec,
  softmax, mapRange, rayConstraint, circleConstraint, trackConstraint,
  minMagConstraint,
} from '../lib/curriculum/scenes/vec-math.js';

describe('vec-math: core arithmetic', () => {
  it('dot / mag / add / sub / scale', () => {
    expect(dot({ x: 2, y: 3 }, { x: 4, y: -1 })).toBe(5);
    expect(mag({ x: 3, y: 4 })).toBe(5);
    expect(add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 });
    expect(sub({ x: 5, y: 5 }, { x: 2, y: 1 })).toEqual({ x: 3, y: 4 });
    expect(scale({ x: 2, y: -3 }, 2)).toEqual({ x: 4, y: -6 });
  });

  it('clamp', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('norm returns a unit vector, and the zero-length input safely', () => {
    const u = norm({ x: 3, y: 4 });
    expect(u.x).toBeCloseTo(0.6);
    expect(u.y).toBeCloseTo(0.8);
    expect(norm({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe('vec-math: angle/similarity — degenerate inputs never NaN', () => {
  it('cos: aligned / orthogonal / opposed anchors', () => {
    expect(cos({ x: 1, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(1);
    expect(cos({ x: 1, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(0);
    expect(cos({ x: 1, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(-1);
  });

  it('cos: a zero-length vector defensively returns 0, not NaN', () => {
    expect(cos({ x: 0, y: 0 }, { x: 1, y: 2 })).toBe(0);
    expect(cos({ x: 1, y: 2 }, { x: 0, y: 0 })).toBe(0);
    expect(cos({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
  });

  it('angleDeg: 0/90/180 anchors', () => {
    expect(angleDeg({ x: 1, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0);
    expect(angleDeg({ x: 1, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90);
    expect(angleDeg({ x: 1, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(180);
  });
});

describe('vec-math: proj / projVec (scalar + vector projection)', () => {
  it('proj: scalar shadow length of a onto b, sign follows alignment', () => {
    expect(proj({ x: 2, y: 0 }, { x: 0, y: 5 })).toBeCloseTo(0);       // perpendicular
    expect(proj({ x: 3, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(3);       // aligned, b unit-ish
    expect(proj({ x: -3, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(-3);     // opposed
    expect(proj({ x: 1, y: 2 }, { x: 0, y: 0 })).toBe(0);              // degenerate b -> 0, no NaN
  });

  it('projVec: vector projection lands ON the line through b', () => {
    const foot = projVec({ x: 2, y: 2 }, { x: 4, y: 0 });
    expect(foot).toEqual({ x: 2, y: 0 });                              // shadow of (2,2) onto the x-axis
    expect(projVec({ x: 1, y: 1 }, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 }); // degenerate b -> origin, no NaN
  });

  it('projVec of a onto b is unaffected by b\'s own magnitude (direction only)', () => {
    const a = { x: 3, y: 1 };
    const short = projVec(a, { x: 1, y: 0 });
    const long = projVec(a, { x: 10, y: 0 });
    expect(short).toEqual(long);
  });
});

describe('vec-math: softmax (with temperature)', () => {
  it('sums to 1 and matches uniform on equal logits', () => {
    const w = softmax([1, 1, 1, 1]);
    expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(1);
    w.forEach((x) => expect(x).toBeCloseTo(0.25));
  });

  it('a higher logit gets a higher weight, at temperature 1', () => {
    const w = softmax([1, 2, 0]);
    expect(w[1]).toBeGreaterThan(w[0]);
    expect(w[0]).toBeGreaterThan(w[2]);
  });

  it('low temperature sharpens toward one-hot; high temperature flattens toward uniform', () => {
    const sharp = softmax([3, 1, 0], 0.2);
    const flat = softmax([3, 1, 0], 10);
    expect(Math.max(...sharp)).toBeGreaterThan(Math.max(...flat));
    expect(Math.max(...flat)).toBeLessThan(0.4);
  });

  it('non-positive temperature does not divide by zero / produce NaN', () => {
    const w = softmax([1, 2, 3], 0);
    expect(w.every((x) => Number.isFinite(x))).toBe(true);
    expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(1);
  });

  it('is numerically stable on large logits (no overflow to Infinity/NaN)', () => {
    const w = softmax([1000, 1001, 999]);
    expect(w.every((x) => Number.isFinite(x))).toBe(true);
    expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(1);
  });
});

describe('vec-math: mapRange (linear remap)', () => {
  it('maps endpoints and midpoint', () => {
    expect(mapRange(0, 0, 10, 100, 200)).toBeCloseTo(100);
    expect(mapRange(10, 0, 10, 100, 200)).toBeCloseTo(200);
    expect(mapRange(5, 0, 10, 100, 200)).toBeCloseTo(150);
  });

  it('is unclamped — extrapolates outside [a0,a1]', () => {
    expect(mapRange(-5, 0, 10, 100, 200)).toBeCloseTo(50);
    expect(mapRange(15, 0, 10, 100, 200)).toBeCloseTo(250);
  });

  it('supports an inverted output range (b0 > b1)', () => {
    expect(mapRange(0, 0, 10, 5, -5)).toBeCloseTo(5);
    expect(mapRange(10, 0, 10, 5, -5)).toBeCloseTo(-5);
  });
});

describe('vec-math: handle-constrain closures (pointer world-point clampers)', () => {
  it('rayConstraint: locks direction, keeps only the (positive) length component', () => {
    const onRay = rayConstraint({ x: 2, y: 0 });
    expect(onRay({ x: 5, y: 5 })).toEqual({ x: 5, y: 0 });     // projects onto the ray, drops y
    const clamped = onRay({ x: -5, y: 0 });                     // negative side clamped to the positive ray
    expect(clamped.x).toBeGreaterThanOrEqual(0);
  });

  it('circleConstraint: any pointer maps to a fixed-radius point in its own direction', () => {
    const onCircle = circleConstraint(5);
    const p1 = onCircle({ x: 3, y: 4 });          // already length 5, same direction
    expect(p1.x).toBeCloseTo(3);
    expect(p1.y).toBeCloseTo(4);
    const p2 = onCircle({ x: 1, y: 0 });          // short pointer still lands on radius 5
    expect(mag(p2)).toBeCloseTo(5);
    expect(p2.x).toBeCloseTo(5);
    expect(p2.y).toBeCloseTo(0);
  });

  it('trackConstraint: pins x, clamps y into [lo,hi]', () => {
    const onTrack = trackConstraint(7, -4, 4);
    expect(onTrack({ x: 100, y: 0 })).toEqual({ x: 7, y: 0 });
    expect(onTrack({ x: 7, y: 999 })).toEqual({ x: 7, y: 4 });
    expect(onTrack({ x: 7, y: -999 })).toEqual({ x: 7, y: -4 });
  });

  it('minMagConstraint: passes through anything already at/above the floor', () => {
    const onMinMag = minMagConstraint(0.5);
    expect(onMinMag({ x: 3, y: 4 })).toEqual({ x: 3, y: 4 });   // mag 5, well above floor
  });

  it('minMagConstraint: pushes a too-short pointer out to the floor, same direction', () => {
    const onMinMag = minMagConstraint(0.5);
    const out = onMinMag({ x: 0.03, y: 0.04 });                 // mag 0.05, direction (0.6, 0.8)
    expect(mag(out)).toBeCloseTo(0.5);
    expect(out.x).toBeCloseTo(0.3);
    expect(out.y).toBeCloseTo(0.4);
  });

  it('minMagConstraint: a pointer exactly at the origin gets a defined default direction, not NaN', () => {
    const onMinMag = minMagConstraint(0.5);
    const out = onMinMag({ x: 0, y: 0 });
    expect(Number.isFinite(out.x)).toBe(true);
    expect(Number.isFinite(out.y)).toBe(true);
    expect(mag(out)).toBeCloseTo(0.5);
  });
});
