/* Shared harness for the Scene Kit test suite (test/scene-*.test.mjs).
 *
 * Provides, against the FROZEN v1 CONTRACT (coordination/CONTRACT.md):
 *   - kitPresent() / motionPresent() / interactionPresent(): feature-detect
 *     which peer modules have landed so real-kit tests skipIf-absent and the
 *     base suite stays green before integration.
 *   - installSceneDom(): rich DOM + canvas + WebGL/GPU stubs so a Pixi/headless
 *     backend and mountScene run in node (extends the missions.test.mjs stub set
 *     with WebGL context + navigator so pixi's feature-probes don't throw).
 *   - poisonGlobals()/restoreGlobals(): swap document/window/navigator/global
 *     canvas ctors for TRAPS that throw on any access — used to PROVE entity
 *     purity (§3: constructors touch no DOM/GPU, read no globals). A pure
 *     entities(p,t) runs clean while poisoned; an impure one throws.
 *   - assertPlainData(x): recursive check that a value is inert display data —
 *     no DOM nodes, no class instances beyond {}/[]/vec, functions only where
 *     the contract allows (label(fn) keeps a ()->string).
 *   - fakeClock(): a deterministic driver-time source for tween/sim determinism
 *     tests (§5) — you feed the dt sequence, nothing reads wall time.
 *
 * These helpers are consumed by scene-kit.test.mjs (real kit) and proven to have
 * teeth by scene-harness.test.mjs (inline fixtures, no kit needed).
 */
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');

/* ----------------------------- feature detect ----------------------------- */
export const kitPresent = () => existsSync(join(REPO, 'lib/scene/registry.js'));
export const scenePresent = (rel) => existsSync(join(REPO, 'lib/scene', rel));
// CONTRACT §0 names clock.js / interaction.js; motion's log plans motion.js+sim.js
// and interaction shipped interact.js+goals.js (drift flagged in review) — detect both.
export const motionPresent = () => ['clock.js', 'motion.js'].some(scenePresent);
export const interactionPresent = () => ['interaction.js', 'interact.js'].some(scenePresent);

/** Dynamic-import a kit module by path under lib/scene, or null if absent. */
export async function importScene(rel) {
  const p = join(REPO, 'lib/scene', rel);
  return existsSync(p) ? import(p) : null;
}

/* ------------------------------- DOM stubs -------------------------------- */
const noop = () => {};

export function makeNode(tag = 'div') {
  const node = {
    tagName: (tag || 'div').toUpperCase(),
    nodeType: 1, style: {}, dataset: {}, className: '',
    _text: '', _html: '', _value: '', children: [],
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      toggle() {}, contains(c) { return this._s.has(c); },
    },
    get textContent() { return this._text; }, set textContent(v) { this._text = v; },
    get innerHTML() { return this._html; }, set innerHTML(v) { this._html = v; },
    get value() { return this._value; }, set value(v) { this._value = v; },
    appendChild(c) { this.children.push(c); return c; },
    prepend(c) { this.children.unshift(c); return c; },
    removeChild: noop, remove: noop,
    insertBefore(c) { this.children.push(c); return c; },
    setAttribute(k, v) { this[k] = v; }, getAttribute() { return null; },
    addEventListener: noop, removeEventListener: noop,
    setPointerCapture: noop, releasePointerCapture: noop,
    querySelector() { return makeNode(); }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, right: 640, bottom: 440, width: 640, height: 440 }; },
    getContext(kind) { return /webgl/i.test(kind) ? webglStub() : canvas2dStub(); },
    focus: noop, click: noop,
  };
  return node;
}

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
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(Math.max(0, (w | 0) * (h | 0) * 4)), width: w | 0, height: h | 0 }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(0, (w | 0) * (h | 0) * 4)), width: w | 0, height: h | 0 }),
  };
  return new Proxy(target, { get(t, p) { return p in t ? t[p] : noop; }, set() { return true; } });
}

// Minimal WebGL context stub: enough that a renderer's capability probe
// (getParameter, getExtension, createShader...) does not throw headlessly.
function webglStub() {
  const target = {
    canvas: { width: 0, height: 0 },
    getParameter: () => 0, getExtension: () => null, getShaderPrecisionFormat: () => ({ precision: 1, rangeMin: 1, rangeMax: 1 }),
    createBuffer: () => ({}), createTexture: () => ({}), createProgram: () => ({}), createShader: () => ({}),
    createFramebuffer: () => ({}), createRenderbuffer: () => ({}), createVertexArray: () => ({}),
    getContextAttributes: () => ({ alpha: true }), isContextLost: () => false,
    getSupportedExtensions: () => [],
  };
  return new Proxy(target, { get(t, p) { return p in t ? t[p] : noop; }, set() { return true; } });
}

/** Install the browser-global stub set (idempotent). Safe to call in beforeAll. */
export function installSceneDom() {
  globalThis.window ??= {};
  globalThis.window.addEventListener ??= noop;
  globalThis.window.removeEventListener ??= noop;
  globalThis.window.innerWidth ??= 1024;
  globalThis.window.innerHeight ??= 768;
  globalThis.window.devicePixelRatio ??= 2;
  globalThis.innerWidth ??= 1024;
  globalThis.innerHeight ??= 768;
  globalThis.devicePixelRatio ??= 2;
  globalThis.requestAnimationFrame ??= () => 0; // never actually run raf loops
  globalThis.cancelAnimationFrame ??= noop;
  globalThis.getComputedStyle ??= () => ({ fontFamily: 'sans-serif', getPropertyValue: () => '' });
  globalThis.CanvasRenderingContext2D ??= function () {};
  globalThis.navigator ??= { userAgent: 'node', maxTouchPoints: 0, hardwareConcurrency: 4 };
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: { getItem: () => null, setItem: noop, removeItem: noop },
      configurable: true, writable: true,
    });
  } catch { /* host localStorage is fine */ }
  const hudNodes = {};
  globalThis.document ??= {};
  Object.assign(globalThis.document, {
    body: makeNode('body'),
    createElement: (t) => makeNode(t),
    createElementNS: (_ns, t) => makeNode(t),
    getElementById: (id) => (hudNodes[id] ??= makeNode()),
    querySelector: () => makeNode(),
    querySelectorAll: () => [],
    addEventListener: noop, removeEventListener: noop,
  });
}

/* --------------------------- purity poisoning ----------------------------- */
// Replace the browser globals with traps that throw on ANY property access, so
// that a pure entities(p,t) — which must touch no DOM/GPU and read no globals —
// runs clean, while an impure one is caught. document/window/navigator are the
// realistic leak surfaces for an entity constructor.
const POISONED = ['document', 'window', 'navigator', 'localStorage'];
let _saved = null;

function trap(name) {
  return new Proxy({}, {
    get(_t, p) { throw new Error(`entity constructor touched global ${name}.${String(p)} — not pure (CONTRACT §3)`); },
    set(_t, p) { throw new Error(`entity constructor wrote global ${name}.${String(p)} — not pure (CONTRACT §3)`); },
    apply() { throw new Error(`entity constructor called global ${name}() — not pure`); },
  });
}

export function poisonGlobals() {
  if (_saved) return; // already poisoned
  _saved = {};
  for (const g of POISONED) {
    _saved[g] = Object.getOwnPropertyDescriptor(globalThis, g);
    try { Object.defineProperty(globalThis, g, { value: trap(g), configurable: true, writable: true }); } catch { /* non-configurable host global */ }
  }
}

export function restoreGlobals() {
  if (!_saved) return;
  for (const g of POISONED) {
    if (_saved[g]) Object.defineProperty(globalThis, g, _saved[g]);
    else { try { delete globalThis[g]; } catch { /* noop */ } }
  }
  _saved = null;
}

/* ---------------------------- plain-data check ---------------------------- */
// A display entity must be inert data the diff layer can shallow-compare and the
// backend can apply: plain objects/arrays, primitives, and — per the contract —
// a function ONLY where label(textOrFn) legitimately carries ()->string. We
// allow functions but forbid DOM nodes and class instances (a Pixi DisplayObject,
// a canvas, an atom with methods) that would mean the "pure descriptor" leaked a
// live handle.
export function assertPlainData(x, path = 'entity', seen = new Set()) {
  const t = typeof x;
  if (x == null || t === 'string' || t === 'number' || t === 'boolean') return;
  if (t === 'function') return; // allowed: label(()->string), curve(fn), area(fn), constrain(fn)
  if (t !== 'object') throw new Error(`${path}: unexpected ${t}`);
  if (seen.has(x)) return;
  seen.add(x);
  // DOM node?
  if (x.nodeType != null && typeof x.appendChild === 'function') throw new Error(`${path}: contains a DOM node (impure)`);
  // class instance (not a plain object or array)?
  const proto = Object.getPrototypeOf(x);
  const isPlain = proto === Object.prototype || proto === null || Array.isArray(x);
  if (!isPlain) throw new Error(`${path}: non-plain object (prototype ${proto?.constructor?.name}) — likely a live handle (impure)`);
  for (const k of Object.keys(x)) assertPlainData(x[k], `${path}.${k}`, seen);
}

/* ------------------------------ fake clock -------------------------------- */
// Deterministic time source for driver/tween/sim determinism tests. You push a
// dt sequence; now() integrates it. No wall-clock, no rAF — same feed => same
// trajectory, every run.
export function fakeClock() {
  let t = 0;
  return {
    now: () => t,
    /** advance by dt seconds, return the new t */
    tick(dt) { t += dt; return t; },
    reset() { t = 0; },
  };
}

export { noop };
