/* Interaction-controller audit (Vitest) for lib/scene/interact.js.

   Drives the pure controller with a fake surface + synthetic events (no
   browser). Covers the behaviours the ~20 hand-rolled drag rigs need — and the
   keyboard nudging NONE of them have:
     - nearest-pick among multiple handles
     - snap-to-grid on drag
     - axis constraint (locks the perpendicular coord to grab-time value)
     - function constraint (constrain-to-circle)
     - keyboard arrow nudging with y-up sign convention
     - hover probe → readout while nothing is dragged
     - dispose() detaches every listener */
import { describe, it, expect } from 'vitest';
import { makeInteraction, _internal } from '../lib/scene/interact.js';

// Minimal DOM-EventTarget stub: records listeners, lets us dispatch by type.
function fakeEl() {
  const map = {};
  return {
    tabIndex: -1,
    listeners: map,
    addEventListener(type, fn) { (map[type] ??= []).push(fn); },
    removeEventListener(type, fn) { const a = map[type]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
    setPointerCapture() {}, releasePointerCapture() {},
    dispatch(type, ev) { (map[type] || []).forEach((fn) => fn(ev)); },
    count(type) { return (map[type] || []).length; },
  };
}

// Identity world mapping: clientX/Y ARE world coords (keeps assertions simple).
function fakeSurface() {
  const el = fakeEl();
  let draws = 0;
  return { el, toWorld: (x, y) => ({ x, y }), requestDraw: () => { draws++; }, drawCount: () => draws };
}

// A param atom backed by a plain object.
function atomOf(x, y) {
  const v = { x, y };
  return { get: () => ({ ...v }), set: (p) => { v.x = p.x; v.y = p.y; }, _v: v };
}

const pd = (x, y) => ({ clientX: x, clientY: y, pointerId: 1, preventDefault() {} });

describe('nearest-pick among multiple handles', () => {
  it('drags the closer handle and ignores the far one', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(0, 0), b = atomOf(5, 5);
    ix.handle(a, { hitRadius: 1 });
    ix.handle(b, { hitRadius: 1 });
    s.el.dispatch('pointerdown', pd(0.2, 0.1));   // nearest to a
    s.el.dispatch('pointermove', pd(1, 1));
    expect(a.get()).toEqual({ x: 1, y: 1 });
    expect(b.get()).toEqual({ x: 5, y: 5 });      // untouched
    s.el.dispatch('pointerup', pd(1, 1));
  });

  it('a close small-radius handle cannot shadow a reachable larger-radius one', () => {
    // Regression (verifier finding): nearest() used to take the global min-
    // distance handle and THEN check its radius — a nearby tiny-radius handle
    // swallowed the pick even when a farther handle's radius contained the
    // pointer. The radius check must be per-candidate.
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const small = atomOf(0, 0), big = atomOf(2, 0);
    ix.handle(small, { hitRadius: 0.2 });
    ix.handle(big, { hitRadius: 1.5 });
    // Pointer at (0.8, 0): dist to small = 0.8 (outside its 0.2 radius),
    // dist to big = 1.2 (inside its 1.5 radius) → big must be picked.
    s.el.dispatch('pointerdown', pd(0.8, 0));
    s.el.dispatch('pointermove', pd(3, 1));
    expect(big.get()).toEqual({ x: 3, y: 1 });
    expect(small.get()).toEqual({ x: 0, y: 0 });
  });

  it('ignores a pointerdown outside every hit radius', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(0, 0);
    ix.handle(a, { hitRadius: 0.5 });
    s.el.dispatch('pointerdown', pd(3, 3));       // too far
    s.el.dispatch('pointermove', pd(1, 1));
    expect(a.get()).toEqual({ x: 0, y: 0 });      // no drag started
  });
});

describe('snap + constrain', () => {
  it('snaps a dragged point to the grid', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(0, 0);
    ix.handle(a, { hitRadius: 2, snap: 0.25 });
    s.el.dispatch('pointerdown', pd(0, 0));
    s.el.dispatch('pointermove', pd(1.31, -0.62));
    expect(a.get()).toEqual({ x: 1.25, y: -0.5 });
  });

  it("axis:'x' locks y to the grab-time value while x tracks the pointer", () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(2, 3);
    ix.handle(a, { hitRadius: 2, constrain: 'x' });
    s.el.dispatch('pointerdown', pd(2, 3));       // lock y = 3
    s.el.dispatch('pointermove', pd(9, 8));       // pointer y ignored
    expect(a.get()).toEqual({ x: 9, y: 3 });
  });

  it('function constraint projects onto a circle of radius 2', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(2, 0);
    const toCircle = (p) => { const m = Math.hypot(p.x, p.y) || 1; return { x: p.x / m * 2, y: p.y / m * 2 }; };
    ix.handle(a, { hitRadius: 3, constrain: toCircle });
    s.el.dispatch('pointerdown', pd(2, 0));
    s.el.dispatch('pointermove', pd(10, 0));      // far out on +x
    expect(a.get().x).toBeCloseTo(2, 6);
    expect(a.get().y).toBeCloseTo(0, 6);
    s.el.dispatch('pointermove', pd(3, 4));       // direction (3,4), radius 5 → scaled to 2
    expect(a.get().x).toBeCloseTo(1.2, 6);
    expect(a.get().y).toBeCloseTo(1.6, 6);
  });
});

describe('keyboard arrow nudging', () => {
  it('nudges the focused handle by the snap step, y-up', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(0, 0);
    ix.handle(a, { snap: 0.25 });                 // nudge defaults to snap step
    s.el.dispatch('keydown', { key: 'ArrowUp', preventDefault() {} });
    expect(a.get()).toEqual({ x: 0, y: 0.25 });   // up increases y
    s.el.dispatch('keydown', { key: 'ArrowLeft', preventDefault() {} });
    expect(a.get()).toEqual({ x: -0.25, y: 0.25 });
    s.el.dispatch('keydown', { key: 'ArrowDown', preventDefault() {} });
    expect(a.get()).toEqual({ x: -0.25, y: 0 });  // down decreases y
  });

  it('keyboard targets the last-dragged handle', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(0, 0), b = atomOf(5, 5);
    ix.handle(a, { hitRadius: 1, nudge: 1 });
    ix.handle(b, { hitRadius: 1, nudge: 1 });
    s.el.dispatch('pointerdown', pd(5, 5));       // focus b
    s.el.dispatch('pointerup', pd(5, 5));
    s.el.dispatch('keydown', { key: 'ArrowRight', preventDefault() {} });
    expect(b.get()).toEqual({ x: 6, y: 5 });
    expect(a.get()).toEqual({ x: 0, y: 0 });
  });

  it('sets tabIndex so the surface can receive key events', () => {
    const s = fakeSurface();
    makeInteraction(s);
    expect(s.el.tabIndex).toBe(0);
  });
});

describe('hover probe', () => {
  it('fires readout on move while nothing is dragged, not during a drag', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(0, 0);
    ix.handle(a, { hitRadius: 1 });
    const seen = [];
    ix.probe((w) => seen.push(w));
    s.el.dispatch('pointermove', pd(2, 2));       // hover
    expect(seen).toEqual([{ x: 2, y: 2 }]);
    s.el.dispatch('pointerdown', pd(0, 0));        // start dragging a
    s.el.dispatch('pointermove', pd(1, 1));        // this move drags, no probe
    expect(seen).toEqual([{ x: 2, y: 2 }]);
  });
});

describe('requestDraw + dispose', () => {
  it('requests a redraw on every write', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    ix.handle(atomOf(0, 0), { hitRadius: 2 });
    s.el.dispatch('pointerdown', pd(0, 0));
    s.el.dispatch('pointermove', pd(1, 1));
    expect(s.drawCount()).toBe(2);                 // down write + move write
  });

  it('dispose() removes all listeners', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    ix.handle(atomOf(0, 0), { hitRadius: 2 });
    ix.dispose();
    ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'keydown']
      .forEach((t) => expect(s.el.count(t)).toBe(0));
    // a post-dispose event is inert
    s.el.dispatch('pointerdown', pd(0, 0));
    expect(s.drawCount()).toBe(0);
  });
});

describe('_internal.project math', () => {
  it('snaps and constrains as a pure function', () => {
    const atom = atomOf(0, 5);
    const h = { atom, constrain: 'y', snap: 0.5 };
    // constrain 'y' keeps x from lock; snap both
    expect(_internal.project(h, { x: 9, y: 2.2 }, { x: 1, y: 5 })).toEqual({ x: 1, y: 2 });
  });
});
