/* Engine ↔ Scene Kit integration audit (Vitest).

   Proves the engine-side wiring of the visual-first scenes path, using the same
   headless DOM/canvas stubs as missions.test.mjs (the scenes path is additive;
   the legacy Learn/Lab/Quiz flow is guarded byte-identical by the existing
   suite). Coverage:
     - mountGoals() persists into S.missions[lessonId+'::'+sceneId] in the SAME
       index→bool shape as missions — no storage migration.
     - The baseline invariant survives the full engine wiring (grantXP/toast via
       onComplete): a goal true at the default state does NOT complete on load.
     - onAllDone gates advance and fires once all goals complete.
     - An already-complete scene re-entry schedules onAllDone (deferred).
     - setSceneRuntime is exported for Kit Core to register its renderer. */
import { describe, it, expect, beforeAll } from 'vitest';

const noop = () => {};
function makeNode(tag = 'div') {
  const node = {
    tagName: (tag || 'div').toUpperCase(), nodeType: 1, style: {}, dataset: {}, className: '',
    _text: '', _html: '', children: [],
    classList: { _s: new Set(), add(...c){c.forEach(x=>this._s.add(x));}, remove(...c){c.forEach(x=>this._s.delete(x));}, toggle(){}, contains(c){return this._s.has(c);} },
    get textContent(){return this._text;}, set textContent(v){this._text=v;},
    get innerHTML(){return this._html;}, set innerHTML(v){this._html=v;},
    appendChild(c){this.children.push(c);return c;}, prepend(c){this.children.unshift(c);return c;},
    removeChild(){}, remove(){}, insertBefore(c){this.children.push(c);return c;},
    setAttribute(k,v){this[k]=v;}, getAttribute(){return null;},
    addEventListener: noop, removeEventListener: noop, setPointerCapture: noop, releasePointerCapture: noop,
    querySelector(){return makeNode();}, querySelectorAll(){return [];},
    getBoundingClientRect(){return {left:0,top:0,right:640,bottom:440,width:640,height:440};},
    getContext(){return canvas2dStub();}, focus: noop, click: noop,
  };
  return node;
}
function canvas2dStub(){
  const t={ canvas:{width:0,height:0}, measureText:()=>({width:10}),
    createLinearGradient:()=>({addColorStop:noop}), createRadialGradient:()=>({addColorStop:noop}),
    createImageData:(w,h)=>({data:new Uint8ClampedArray(Math.max(0,(w|0)*(h|0)*4))}),
    getImageData:(w,h)=>({data:new Uint8ClampedArray(Math.max(0,(w|0)*(h|0)*4))}) };
  return new Proxy(t,{get(o,p){return p in o?o[p]:noop;}, set(){return true;}});
}
globalThis.window ??= {}; globalThis.window.addEventListener ??= noop;
globalThis.innerWidth ??= 1024; globalThis.innerHeight ??= 768; globalThis.devicePixelRatio ??= 1;
globalThis.requestAnimationFrame ??= () => 0; globalThis.cancelAnimationFrame ??= noop;
try { Object.defineProperty(globalThis, 'localStorage', { value: { getItem:()=>null, setItem:noop, removeItem:noop }, configurable:true, writable:true }); } catch {}
globalThis.getComputedStyle ??= () => ({ fontFamily: 'sans-serif' });
globalThis.CanvasRenderingContext2D ??= function(){};
const hudNodes = {};
globalThis.document ??= {};
Object.assign(globalThis.document, {
  body: makeNode('body'), createElement: (t)=>makeNode(t), createElementNS: (_n,t)=>makeNode(t),
  getElementById: (id)=>(hudNodes[id] ??= makeNode()), querySelector: ()=>makeNode(),
  querySelectorAll: ()=>[], addEventListener: noop, removeEventListener: noop,
});

let engine, mountGoals, setSceneRuntime, S;
beforeAll(async () => {
  await import('../lib/curriculum/index.js');
  engine = await import('../lib/engine.js');
  mountGoals = engine.mountGoals; setSceneRuntime = engine.setSceneRuntime; S = engine.S;
});

// goal defs shaped like lib/scene/goals.js goal() output (mountGoals reads text/xp
// and hands the def array straight to makeGoals).
const g = (text, predicate, xp = 10, extra = {}) => ({ kind:'state', text, predicate, xp, hold:0, hint:null, ...extra });

describe('mountGoals persistence + baseline through the full engine wiring', () => {
  const key = () => 'scene-test::' + Math.random().toString(36).slice(2);

  it('persists completions under the lessonId::sceneId key in index→bool shape', () => {
    const k = key(); delete S.missions[k];
    const { g: rt } = mountGoals(makeNode(), k, [g('reach v=1', s => s.v === 1, 25)]);
    rt.evaluate({ v: 0 });            // baseline
    expect(S.missions[k]).toBeUndefined();
    rt.evaluate({ v: 1 });           // learner-driven → credit
    expect(S.missions[k]).toEqual({ 0: true });
  });

  it('does NOT complete a goal that is true at the default state on the FIRST evaluate', () => {
    const k = key(); delete S.missions[k];
    let done = false;
    const { g: rt } = mountGoals(makeNode(), k, [g('true at default', s => s.v === 0, 20)], () => { done = true; });
    rt.evaluate({ v: 0 });           // baseline, default state — must NOT credit
    expect(rt.allDone()).toBe(false);
    expect(done).toBe(false);
    expect(S.missions[k]).toBeUndefined();
  });

  it('fires onAllDone once every goal completes (advance gate)', () => {
    const k = key(); delete S.missions[k];
    let gated = false;
    const { g: rt } = mountGoals(makeNode(), k, [
      g('a', s => s.a, 10), g('b', s => s.b, 10),
    ], () => { gated = true; });
    rt.evaluate({});                 // baseline
    rt.evaluate({ a: true });        // one down
    expect(gated).toBe(false);
    rt.evaluate({ a: true, b: true });
    expect(gated).toBe(true);
    expect(S.missions[k]).toEqual({ 0: true, 1: true });
  });

  it('schedules onAllDone for an already-complete scene re-entry', () => {
    const k = key();
    S.missions[k] = { 0: true };     // simulate a persisted revisit
    let fired = false;
    const { g: rt } = mountGoals(makeNode(), k, [g('a', () => false, 10)], () => { fired = true; });
    expect(rt.allDone()).toBe(true);
    return new Promise((res) => setTimeout(() => { expect(fired).toBe(true); res(); }, 5));
  });
});

describe('scene runtime seam', () => {
  it('exports setSceneRuntime for Kit Core to register a renderer', () => {
    expect(typeof setSceneRuntime).toBe('function');
    let received = null;
    const fakeRuntime = { mount: (spec, el, ctx) => { received = { spec, el, ctx }; return () => {}; } };
    // Registration must not throw; the renderer is consumed by renderScenes when
    // a `scenes:[...]` lesson is routed (exercised in-app / by the flagship P0).
    expect(() => setSceneRuntime(fakeRuntime)).not.toThrow();
    setSceneRuntime(null);           // reset so it can't leak into other suites
  });
});
