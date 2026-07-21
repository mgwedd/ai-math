/* Interaction-controller audit (Vitest) for lib/scene/interact.js.

   Drives the pure controller with a fake surface + synthetic events (no
   browser). Surface follows CONTRACT §6: toWorld takes ONE canvas-local
   {px,py} point; the controller converts client → local via
   el.getBoundingClientRect(). Covers the behaviours the ~20 hand-rolled drag
   rigs need — and what NONE of them have (keyboard nudging, multi-touch
   correctness):
     - nearest-pick among multiple handles (per-candidate hitRadius)
     - snap: grid step AND allowed-value list (number[])
     - constrain 'axis-x'/'axis-y' (locks the perpendicular coord to the
       grab-time value) + function constraint (circle)
     - MULTI-TOUCH: the grabbing pointerId owns the drag; a second finger
       can't steal it, other-pointer moves are ignored, and lifting another
       finger doesn't end the drag (reviewer-reproduced bug)
     - keyboard arrow nudging (y-up), keyStep, and the fallback to the next
       enabled handle when the focused one is disabled
     - onInput observer fires on grab + key nudge (the goals crediting gate)
     - hover probe vs drag exclusivity
     - dispose(): all listeners removed, mid-drag capture released, tabIndex
       restored */
import { describe, it, expect } from 'vitest';
import { makeInteraction, _internal } from '../lib/scene/interact.js';

// Minimal DOM-EventTarget stub: records listeners, lets us dispatch by type.
function fakeEl() {
  const map = {};
  const captured = [], released = [];
  return {
    tabIndex: -1,
    listeners: map,
    captured, released,
    addEventListener(type, fn) { (map[type] ??= []).push(fn); },
    removeEventListener(type, fn) { const a = map[type]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
    setPointerCapture(id) { captured.push(id); },
    releasePointerCapture(id) { released.push(id); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 640, height: 440 }; },
    dispatch(type, ev) { (map[type] || []).forEach((fn) => fn(ev)); },
    count(type) { return (map[type] || []).length; },
  };
}

// Identity world mapping: canvas-local px ARE world coords (left/top are 0, so
// client coords == local px == world). Keeps assertions simple.
function fakeSurface() {
  const el = fakeEl();
  let draws = 0;
  return { el, toWorld: (pt) => ({ x: pt.px, y: pt.py }), requestDraw: () => { draws++; }, drawCount: () => draws };
}

// A param atom backed by a plain object.
function atomOf(x, y) {
  const v = { x, y };
  return { get: () => ({ ...v }), set: (p) => { v.x = p.x; v.y = p.y; } };
}

const pd = (x, y, id = 1) => ({ clientX: x, clientY: y, pointerId: id, preventDefault() {} });

describe('nearest-pick among multiple handles', () => {
  it('drags the closer handle and ignores the far one', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(0, 0), b = atomOf(5, 5);
    ix.handle(a, { hitRadius: 1 });
    ix.handle(b, { hitRadius: 1 });
    s.el.dispatch('pointerdown', pd(0.2, 0.1));
    s.el.dispatch('pointermove', pd(1, 1));
    expect(a.get()).toEqual({ x: 1, y: 1 });
    expect(b.get()).toEqual({ x: 5, y: 5 });
    s.el.dispatch('pointerup', pd(1, 1));
  });

  it('a close small-radius handle cannot shadow a reachable larger-radius one', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const small = atomOf(0, 0), big = atomOf(2, 0);
    ix.handle(small, { hitRadius: 0.2 });
    ix.handle(big, { hitRadius: 1.5 });
    s.el.dispatch('pointerdown', pd(0.8, 0));   // outside small's radius, inside big's
    s.el.dispatch('pointermove', pd(3, 1));
    expect(big.get()).toEqual({ x: 3, y: 1 });
    expect(small.get()).toEqual({ x: 0, y: 0 });
  });

  it('ignores a pointerdown outside every hit radius', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(0, 0);
    ix.handle(a, { hitRadius: 0.5 });
    s.el.dispatch('pointerdown', pd(3, 3));
    s.el.dispatch('pointermove', pd(1, 1));
    expect(a.get()).toEqual({ x: 0, y: 0 });
  });
});

describe('multi-touch pointer ownership', () => {
  it('a second finger cannot steal the active drag, and its moves are ignored', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(0, 0), b = atomOf(5, 5);
    ix.handle(a, { hitRadius: 1 });
    ix.handle(b, { hitRadius: 1 });
    s.el.dispatch('pointerdown', pd(0, 0, 1));      // finger 1 grabs a
    s.el.dispatch('pointerdown', pd(5, 5, 2));      // finger 2 lands on b — ignored
    s.el.dispatch('pointermove', pd(9, 9, 2));      // finger 2 moves — must not write
    expect(a.get()).toEqual({ x: 0, y: 0 });
    expect(b.get()).toEqual({ x: 5, y: 5 });
    s.el.dispatch('pointermove', pd(2, 2, 1));      // finger 1 still drives a
    expect(a.get()).toEqual({ x: 2, y: 2 });
  });

  it('lifting another finger does not end the drag', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(0, 0);
    ix.handle(a, { hitRadius: 1 });
    s.el.dispatch('pointerdown', pd(0, 0, 1));
    s.el.dispatch('pointerup', pd(5, 5, 2));        // finger 2 up — drag survives
    s.el.dispatch('pointermove', pd(3, 3, 1));
    expect(a.get()).toEqual({ x: 3, y: 3 });
    s.el.dispatch('pointerup', pd(3, 3, 1));        // owner up — drag ends
    s.el.dispatch('pointermove', pd(9, 9, 1));
    expect(a.get()).toEqual({ x: 3, y: 3 });
  });
});

describe('snap + constrain (contract vocabulary)', () => {
  it('snaps a dragged point to the grid (number)', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(0, 0);
    ix.handle(a, { hitRadius: 2, snap: 0.25 });
    s.el.dispatch('pointerdown', pd(0, 0));
    s.el.dispatch('pointermove', pd(1.31, -0.62));
    expect(a.get()).toEqual({ x: 1.25, y: -0.5 });
  });

  it('snaps to the nearest allowed value (number[] form)', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(0, 0);
    ix.handle(a, { hitRadius: 9, snap: [0, 1, 4] });
    s.el.dispatch('pointerdown', pd(0, 0));
    s.el.dispatch('pointermove', pd(2.9, 0.6));
    expect(a.get()).toEqual({ x: 4, y: 1 });     // 2.9→4 (vs 1: |2.9-4|=1.1<1.9), 0.6→1
    s.el.dispatch('pointermove', pd(1.9, 0.4));
    expect(a.get()).toEqual({ x: 1, y: 0 });     // 1.9→1, 0.4→0
  });

  it("constrain:'axis-x' locks y to the grab-time value while x tracks the pointer", () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(2, 3);
    ix.handle(a, { hitRadius: 2, constrain: 'axis-x' });
    s.el.dispatch('pointerdown', pd(2, 3));
    s.el.dispatch('pointermove', pd(9, 8));
    expect(a.get()).toEqual({ x: 9, y: 3 });
  });

  it('function constraint projects onto a circle of radius 2', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(2, 0);
    const toCircle = (p) => { const m = Math.hypot(p.x, p.y) || 1; return { x: p.x / m * 2, y: p.y / m * 2 }; };
    ix.handle(a, { hitRadius: 3, constrain: toCircle });
    s.el.dispatch('pointerdown', pd(2, 0));
    s.el.dispatch('pointermove', pd(3, 4));      // direction (3,4), radius 5 → scaled to 2
    expect(a.get().x).toBeCloseTo(1.2, 6);
    expect(a.get().y).toBeCloseTo(1.6, 6);
  });
});

describe('client → canvas-local px conversion', () => {
  it('subtracts the element rect before calling toWorld', () => {
    const el = fakeEl();
    el.getBoundingClientRect = () => ({ left: 100, top: 50, width: 640, height: 440 });
    const seen = [];
    const surface = { el, toWorld: (pt) => { seen.push(pt); return { x: pt.px, y: pt.py }; } };
    const ix = makeInteraction(surface);
    ix.handle(atomOf(20, 30), { hitRadius: 5 });
    el.dispatch('pointerdown', pd(120, 80));     // client (120,80) → local (20,30)
    expect(seen[0]).toEqual({ px: 20, py: 30 });
  });
});

describe('keyboard arrow nudging', () => {
  it('nudges by the snap step by default, y-up', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(0, 0);
    ix.handle(a, { snap: 0.25 });
    s.el.dispatch('keydown', { key: 'ArrowUp', preventDefault() {} });
    expect(a.get()).toEqual({ x: 0, y: 0.25 });
    s.el.dispatch('keydown', { key: 'ArrowLeft', preventDefault() {} });
    expect(a.get()).toEqual({ x: -0.25, y: 0.25 });
    s.el.dispatch('keydown', { key: 'ArrowDown', preventDefault() {} });
    expect(a.get()).toEqual({ x: -0.25, y: 0 });
  });

  it('keyStep overrides the nudge step (contract name)', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(0, 0);
    ix.handle(a, { snap: 0.25, keyStep: 1 });
    s.el.dispatch('keydown', { key: 'ArrowRight', preventDefault() {} });
    expect(a.get()).toEqual({ x: 1, y: 0 });      // stepped by keyStep, still on-grid
  });

  it('keyboard targets the last-dragged handle', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(0, 0), b = atomOf(5, 5);
    ix.handle(a, { hitRadius: 1, keyStep: 1 });
    ix.handle(b, { hitRadius: 1, keyStep: 1 });
    s.el.dispatch('pointerdown', pd(5, 5));
    s.el.dispatch('pointerup', pd(5, 5));
    s.el.dispatch('keydown', { key: 'ArrowRight', preventDefault() {} });
    expect(b.get()).toEqual({ x: 6, y: 5 });
    expect(a.get()).toEqual({ x: 0, y: 0 });
  });

  it('falls back to the next enabled handle when the focused one is disabled', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    const a = atomOf(0, 0), b = atomOf(5, 5);
    const ha = ix.handle(a, { keyStep: 1 });      // first handle becomes focused
    ix.handle(b, { keyStep: 1 });
    ha.disabled = true;                           // reviewer finding: used to lock ALL keys out
    s.el.dispatch('keydown', { key: 'ArrowUp', preventDefault() {} });
    expect(b.get()).toEqual({ x: 5, y: 6 });      // fallback handle moved
    expect(a.get()).toEqual({ x: 0, y: 0 });
  });

  it('sets tabIndex so the surface can receive key events', () => {
    const s = fakeSurface();
    makeInteraction(s);
    expect(s.el.tabIndex).toBe(0);
  });
});

describe('onInput observer (goals crediting gate)', () => {
  it('fires on pointer grab and keyboard nudge, not on hover', () => {
    const s = fakeSurface();
    let inputs = 0;
    const ix = makeInteraction(s, { onInput: () => inputs++ });
    ix.handle(atomOf(0, 0), { hitRadius: 1, keyStep: 1 });
    s.el.dispatch('pointermove', pd(3, 3));       // hover: not learner input on a handle
    expect(inputs).toBe(0);
    s.el.dispatch('pointerdown', pd(0, 0));       // grab
    expect(inputs).toBe(1);
    s.el.dispatch('pointerup', pd(0, 0));
    s.el.dispatch('keydown', { key: 'ArrowUp', preventDefault() {} });
    expect(inputs).toBe(2);
  });
});

describe('hover probe', () => {
  it('fires readout on move while nothing is dragged, not during a drag', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    ix.handle(atomOf(0, 0), { hitRadius: 1 });
    const seen = [];
    ix.probe((w) => seen.push(w));
    s.el.dispatch('pointermove', pd(2, 2));
    expect(seen).toEqual([{ x: 2, y: 2 }]);
    s.el.dispatch('pointerdown', pd(0, 0));
    s.el.dispatch('pointermove', pd(1, 1));
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
    expect(s.drawCount()).toBe(2);
  });

  it('dispose() removes all listeners and restores tabIndex', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    ix.handle(atomOf(0, 0), { hitRadius: 2 });
    expect(s.el.tabIndex).toBe(0);
    ix.dispose();
    ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'keydown']
      .forEach((t) => expect(s.el.count(t)).toBe(0));
    expect(s.el.tabIndex).toBe(-1);               // original value restored
    s.el.dispatch('pointerdown', pd(0, 0));
    expect(s.drawCount()).toBe(0);
  });

  it('dispose() mid-drag releases the pointer capture (Pixi-canvas reuse leak)', () => {
    const s = fakeSurface();
    const ix = makeInteraction(s);
    ix.handle(atomOf(0, 0), { hitRadius: 2 });
    s.el.dispatch('pointerdown', pd(0, 0, 7));
    expect(s.el.captured).toEqual([7]);
    ix.dispose();                                 // teardown while dragging
    expect(s.el.released).toEqual([7]);
  });
});

describe('_internal.project math', () => {
  it('constrains then snaps as a pure function (documented ordering)', () => {
    const atom = atomOf(0, 5);
    const h = { atom, constrain: 'axis-y', snap: 0.5 };
    expect(_internal.project(h, { x: 9, y: 2.2 }, { x: 1, y: 5 })).toEqual({ x: 1, y: 2 });
  });
  it('snapToList picks the nearest allowed value', () => {
    expect(_internal.snapToList(2.9, [0, 1, 4])).toBe(4);
    expect(_internal.snapToList(1.9, [0, 1, 4])).toBe(1);
  });
});
