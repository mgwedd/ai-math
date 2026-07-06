/* Mission-completion audit (Vitest).

   PURPOSE: prove the invariant "no lab auto-completes a mission at load".
   A lab renders its initial/default graph state and calls the missions
   api.update(state) once during that first render (to populate readouts).
   Before the fix, any mission whose check(state) was true for the default
   state got credited immediately — the learner walked into a completed
   mission having done nothing. See makeMissions() in lib/engine.js.

   Two layers of coverage:
     1. FOCUSED UNIT TESTS on the real makeMissions(): first update is a
        baseline (no credit), later updates credit, saved completions render.
     2. HEADLESS LAB AUDIT: initialize EVERY registered INTERACTIVE against a
        stubbed DOM + canvas and the REAL missions engine, and assert zero
        missions are completed immediately after initial render. */
import { describe, it, expect, beforeAll } from 'vitest';

/* ---------- browser-global + DOM/canvas stubs (before curriculum import) ----
   Rich enough to let the lab functions run their initial render headlessly:
   makeLab builds a canvas, plane() draws a grid, sliders/chips build controls,
   and the lab calls m.update(initialState). None of it needs pixels — every
   canvas 2D op is a no-op — but the DOM shape must be faithful. */
const noop = () => {};

// A permissive stub DOM node. Any property read that isn't explicitly modelled
// returns another stub node (so chains like el.querySelector('x').textContent
// never throw), and any method call is a no-op that returns a stub node.
function makeNode(tag = 'div') {
  const node = {
    tagName: (tag || 'div').toUpperCase(),
    nodeType: 1,
    style: {},
    dataset: {},
    className: '',
    _text: '',
    _html: '',
    _value: '',
    children: [],
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      toggle() {},
      contains(c) { return this._s.has(c); },
    },
    get textContent() { return this._text; },
    set textContent(v) { this._text = v; },
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = v; },
    get value() { return this._value; },
    set value(v) { this._value = v; },
    appendChild(c) { this.children.push(c); return c; },
    prepend(c) { this.children.unshift(c); return c; },
    removeChild() {},
    remove() {},
    insertBefore(c) { this.children.push(c); return c; },
    setAttribute(k, v) { this[k] = v; },
    getAttribute() { return null; },
    addEventListener: noop,
    removeEventListener: noop,
    setPointerCapture: noop,
    releasePointerCapture: noop,
    // A lab may query for a child element it just created; return a fresh stub
    // rather than null so downstream .textContent / .style access is safe.
    querySelector() { return makeNode(); },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, right: 640, bottom: 440, width: 640, height: 440 }; },
    getContext() { return canvas2dStub(); },
    focus: noop,
    click: noop,
  };
  return node;
}

// A 2D canvas context where every method is a no-op and every property is
// freely settable. Built via Proxy so we never have to enumerate the API.
function canvas2dStub() {
  const target = {
    canvas: { width: 0, height: 0 },
    save: noop, restore: noop, scale: noop, translate: noop, rotate: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, arc: noop,
    rect: noop, fill: noop, stroke: noop, fillRect: noop, strokeRect: noop,
    clearRect: noop, fillText: noop, strokeText: noop, setLineDash: noop,
    quadraticCurveTo: noop, bezierCurveTo: noop, ellipse: noop, clip: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    measureText: () => ({ width: 10 }),
    setTransform: noop, resetTransform: noop, drawImage: noop, putImageData: noop,
    // heat-map labs write pixels into img.data — hand back a real typed array
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(Math.max(0, (w | 0) * (h | 0) * 4)), width: w | 0, height: h | 0 }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(0, (w | 0) * (h | 0) * 4)), width: w | 0, height: h | 0 }),
  };
  return new Proxy(target, {
    get(t, p) { return p in t ? t[p] : noop; },
    set() { return true; },
  });
}

globalThis.window ??= {};
globalThis.window.addEventListener ??= noop;
globalThis.window.innerWidth ??= 1024;
globalThis.window.innerHeight ??= 768;
globalThis.innerWidth ??= 1024;
globalThis.innerHeight ??= 768;
globalThis.devicePixelRatio ??= 1;
globalThis.requestAnimationFrame ??= () => 0;   // never actually run raf loops
globalThis.cancelAnimationFrame ??= noop;
try {
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: () => null, setItem: noop, removeItem: noop },
    configurable: true, writable: true,
  });
} catch { /* host localStorage is fine */ }
globalThis.getComputedStyle ??= () => ({ fontFamily: 'sans-serif' });
globalThis.CanvasRenderingContext2D ??= function () {};

const hudNodes = {};   // getElementById('xp-fill') etc. return persistent stubs
globalThis.document ??= {};
Object.assign(globalThis.document, {
  body: makeNode('body'),
  createElement: (t) => makeNode(t),
  createElementNS: (_ns, t) => makeNode(t),
  getElementById: (id) => (hudNodes[id] ??= makeNode()),
  querySelector: () => makeNode(),
  querySelectorAll: () => [],
  addEventListener: noop,
  removeEventListener: noop,
});

let engine, INTERACTIVES, makeMissions, S;

beforeAll(async () => {
  await import('../lib/curriculum/index.js');       // registers every lesson + interactive
  engine = await import('../lib/engine.js');
  INTERACTIVES = engine.INTERACTIVES;
  makeMissions = engine.makeMissions;
  S = engine.S;
});

/* ============================ focused unit tests ========================== */
describe('makeMissions() invariant: first update never credits', () => {
  // isolate progress storage per test so completions don't leak between them
  const freshLesson = () => 'unit-test-' + Math.random().toString(36).slice(2);

  it('does NOT complete a mission whose check is true on the FIRST update', () => {
    const stage = makeNode();
    const id = freshLesson();
    const m = makeMissions(stage, id, [
      { text: 'always true', xp: 20, check: () => true },
    ]);
    m.update({});                       // this is the lab's initial/default render
    expect(m.allDone()).toBe(false);    // baseline must not credit
    expect(S.missions[id]).toBeUndefined();
  });

  it('DOES complete a mission on a later (learner-driven) update', () => {
    const stage = makeNode();
    const id = freshLesson();
    let interacted = false;
    const m = makeMissions(stage, id, [
      { text: 'true after interaction', xp: 20, check: () => interacted },
    ]);
    m.update({});                       // baseline: check() is false here anyway
    expect(m.allDone()).toBe(false);
    interacted = true;
    m.update({});                       // learner changed state -> credit now
    expect(m.allDone()).toBe(true);
    expect(S.missions[id][0]).toBe(true);
  });

  it('credits a check that is already true at the default state, on a later update', () => {
    // The realistic auto-complete shape: true at the default state. Baseline
    // suppresses it; a subsequent update with a qualifying state credits it,
    // because by then the learner has driven at least one interaction.
    const stage = makeNode();
    const id = freshLesson();
    const m = makeMissions(stage, id, [
      { text: 'true at default', xp: 20, check: (s) => s.v === 0 },
    ]);
    m.update({ v: 0 });                 // baseline, default state — no credit
    expect(m.allDone()).toBe(false);
    m.update({ v: 1 });                 // learner moved away
    expect(m.allDone()).toBe(false);
    m.update({ v: 0 });                 // learner returned to the qualifying state
    expect(m.allDone()).toBe(true);
  });

  it('renders previously-saved completions as done and gates continue', () => {
    const id = freshLesson();
    S.missions[id] = { 0: true, 1: true };   // simulate a persisted revisit
    let allDoneFired = false;
    const stage = makeNode();
    const m = makeMissions(stage, id, [
      { text: 'a', xp: 20, check: () => false },
      { text: 'b', xp: 20, check: () => false },
    ], () => { allDoneFired = true; });
    expect(m.allDone()).toBe(true);          // both already done -> continue enabled
    // onAllDone is scheduled via setTimeout(...,0) for an already-complete revisit
    return new Promise((res) => setTimeout(() => { expect(allDoneFired).toBe(true); res(); }, 5));
  });
});

/* =========================== headless lab audit ========================== */
describe('no lab auto-completes a mission at load', () => {
  it('has interactives registered', () => {
    expect(Object.keys(INTERACTIVES).length).toBeGreaterThan(20);
  });

  // Drive one lab's initial render and report how many missions completed.
  // We wrap api.missions with the REAL makeMissions but under a throwaway
  // lesson id, then read that id's saved map — makeMissions writes saved[i]
  // BEFORE granting XP, so this captures completions even if the (deliberately
  // stubbed) award path is a no-op.
  function runLabInitialRender(key) {
    const stage = makeNode();
    const missionId = 'audit::' + key;
    delete S.missions[missionId];
    S.xp = 0;                            // keep grantXP below any level-up threshold
    let missionCount = 0;
    const api = {
      missions(defs) {
        missionCount = defs.length;
        return makeMissions(stage, missionId, defs);
      },
      onDone: noop,
    };
    let error = null;
    try {
      const cleanup = INTERACTIVES[key](stage, api);
      if (typeof cleanup === 'function') cleanup();
    } catch (e) {
      error = e;
    }
    const saved = S.missions[missionId] || {};
    const completed = Object.keys(saved).filter((i) => saved[i]).length;
    return { key, missionCount, completed, error };
  }

  it('completes zero missions across ALL interactives immediately after initial render', () => {
    const offenders = [];
    const errored = [];
    for (const key of Object.keys(INTERACTIVES)) {
      const r = runLabInitialRender(key);
      if (r.error) errored.push({ key, message: r.error.message });
      else if (r.completed > 0) offenders.push({ key, completed: r.completed, of: r.missionCount });
    }
    // A lab that fails to render headlessly can't be audited — surface it loudly
    // rather than letting it silently pass. (Kept separate from the pass/fail
    // assertion so a stub gap is diagnosable.)
    if (errored.length) {
      console.warn('labs that could not be driven headlessly:', errored);
    }
    expect(errored).toEqual([]);
    expect(offenders).toEqual([]);
  });
});
