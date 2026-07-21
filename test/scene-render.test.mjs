/* renderScenes branch audit (Vitest) — verifier finding #2.

   Drives the REAL engine end-to-end headlessly: mount() against the stub DOM,
   register a `scenes:[...]` lesson, stub the kit renderer through the
   setSceneRuntime seam, navigate with go('lesson', id), and complete goals via
   the makeGoals instance the runtime receives. Pins:
     - the runtime seam receives (spec, canvasEl, {goals}) per scene
     - scene advance is gated on goals (next button armed only by onAllGoals)
     - scene cleanup runs on every swap (registerCleanup contract)
     - CAPSTONE gates lesson completion: S.done flips with NO quiz interaction
       (quiz becomes optional XP for scenes lessons with a capstone)
     - no double lesson-bonus XP on revisit of a completed scenes lesson
     - a scenes lesson WITHOUT a capstone routes its last scene to the quiz
     - goals persist under lessonId::sceneId (index→bool) */
import { describe, it, expect, beforeAll } from 'vitest';

/* ---------- stub DOM (missions.test.mjs pattern + cached querySelector) ----
   renderScenes re-queries #next/#back/#scene-goals per render, so querySelector
   caches per selector — a stable node per (element, selector) — and the cache
   clears whenever innerHTML is assigned (a re-render in the real DOM replaces
   children). That mirrors real behavior closely enough to pin button wiring. */
const noop = () => {};
function makeNode(tag = 'div') {
  const node = {
    tagName: (tag || 'div').toUpperCase(), nodeType: 1, style: {}, dataset: {}, className: '',
    _text: '', _html: '', _qcache: {}, children: [],
    classList: { _s: new Set(), add(...c){c.forEach(x=>this._s.add(x));}, remove(...c){c.forEach(x=>this._s.delete(x));}, toggle(){}, contains(c){return this._s.has(c);} },
    get textContent(){return this._text;}, set textContent(v){this._text=v;},
    get innerHTML(){return this._html;},
    set innerHTML(v){this._html=v; this._qcache={}; this.children=[];},
    appendChild(c){this.children.push(c);return c;}, prepend(c){this.children.unshift(c);return c;},
    removeChild(){}, remove(){}, insertBefore(c){this.children.push(c);return c;},
    setAttribute(k,v){this[k]=v;}, getAttribute(){return null;},
    addEventListener: noop, removeEventListener: noop, setPointerCapture: noop, releasePointerCapture: noop,
    querySelector(sel){ return (this._qcache[sel] ??= makeNode()); },
    querySelectorAll(){return [];},
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
globalThis.window ??= {};
globalThis.window.addEventListener ??= noop;
globalThis.window.scrollTo ??= noop;
globalThis.scrollTo ??= noop;
globalThis.innerWidth ??= 1024; globalThis.innerHeight ??= 768; globalThis.devicePixelRatio ??= 1;
globalThis.requestAnimationFrame ??= () => 0; globalThis.cancelAnimationFrame ??= noop;
try { Object.defineProperty(globalThis, 'localStorage', { value: { getItem:()=>null, setItem:noop, removeItem:noop }, configurable:true, writable:true }); } catch {}
globalThis.getComputedStyle ??= () => ({ fontFamily: 'sans-serif' });
globalThis.CanvasRenderingContext2D ??= function(){ };
globalThis.CanvasRenderingContext2D.prototype ??= {};
const hudNodes = {};
globalThis.document ??= {};
Object.assign(globalThis.document, {
  body: makeNode('body'), createElement: (t)=>makeNode(t), createElementNS: (_n,t)=>makeNode(t),
  getElementById: (id)=>(hudNodes[id] ??= makeNode()),
  querySelector: ()=>makeNode(), querySelectorAll: ()=>[],
  addEventListener: noop, removeEventListener: noop,
});

let engine, S, go, LESSONS, setSceneRuntime, SCORING;
// per-mount captures from the stubbed kit runtime
let mounts = [];        // {spec, el, goals}
let cleanups = 0;       // scene cleanup invocations

beforeAll(async () => {
  await import('../lib/curriculum/index.js');
  engine = await import('../lib/engine.js');
  ({ S, go, LESSONS, setSceneRuntime, SCORING } = engine);
  setSceneRuntime({
    mount(spec, el, ctx){ mounts.push({ spec, el, goals: ctx.goals }); return () => { cleanups++; }; },
  });
  engine.mount({});     // sets view/fx, routes home; API is null so no network
  S.unlocks = { unlockAll: true, unlocked: {} };   // make test lessons reachable
});

const g = (text, pred, xp = 10) => ({ kind:'state', text, predicate: pred, xp, hold: 0, hint: null });
const stepBody = () => hudNodes['stepbody'];
const nextBtn = () => stepBody().querySelector('#next');
const lastMount = () => mounts[mounts.length - 1];
const tick = () => new Promise((r) => setTimeout(r, 5));

function addScenesLesson(id, scenes, quiz){
  LESSONS.push({ id, world:'pre', emoji:'🧪', title:'Scene test '+id, sub:'', learn:'<p>x</p>', ml:'x',
    interactive:'__none__', scenes, quiz: quiz || [] });
}

describe('renderScenes: runtime seam + goal-gated advance + cleanup', () => {
  it('mounts each scene through the seam, gates next on goals, cleans up on swap', () => {
    addScenesLesson('sc-two', [
      { id:'a', title:'Scene A', caption:'drag', goals:[g('reach v=1', s=>s.v===1, 10)] },
      { id:'b', title:'Scene B', capstone:true, goals:[g('reach w=2', s=>s.w===2, 15)] },
    ]);
    mounts = []; cleanups = 0;
    delete S.missions['sc-two::a']; delete S.missions['sc-two::b']; delete S.done['sc-two'];
    go('lesson','sc-two');
    expect(mounts.length).toBe(1);
    expect(lastMount().spec.id).toBe('a');
    // advance is not armed before goals complete
    expect(nextBtn().textContent).toBe('');
    const goals = lastMount().goals;
    goals.evaluate({ v: 1 });                   // BASELINE — even though true
    expect(nextBtn().textContent).toBe('');     // still gated (baseline never credits)
    goals.evaluate({ v: 0 });
    goals.evaluate({ v: 1 });                   // learner-driven → completes
    expect(S.missions['sc-two::a']).toEqual({ 0: true });   // lessonId::sceneId, index→bool
    expect(nextBtn().disabled).toBe(false);
    expect(nextBtn().textContent).toBe('Next scene →');
    nextBtn().onclick();                        // swap to scene B
    expect(cleanups).toBe(1);                   // scene A runtime cleanup ran
    expect(mounts.length).toBe(2);
    expect(lastMount().spec.id).toBe('b');
  });

  it('CAPSTONE completion completes the lesson with no quiz interaction, once', async () => {
    // continues from the state above: we are on capstone scene B
    const xpBeforeGoals = S.xp;
    const goals = lastMount().goals;
    goals.evaluate({ w: 0 });                   // baseline
    goals.evaluate({ w: 2 });                   // completes the capstone goal
    expect(nextBtn().textContent).toBe('Finish 🏁');
    expect(S.done['sc-two']).toBeUndefined();   // not complete until Finish
    nextBtn().onclick();                        // advanceToDone → completeLesson
    expect(S.done['sc-two']).toBe(true);        // lesson complete — quiz never rendered
    // XP: at least capstone goal xp + lesson bonus (checkAchievements may add
    // achievement XP on top — engine-owned, not asserted exactly here)
    expect(S.xp).toBeGreaterThanOrEqual(xpBeforeGoals + 15 + SCORING.lessonBonus);

    // Revisit: already-saved goals arm the button via the deferred all-done
    // path; finishing again must NOT re-grant the lesson bonus (no double XP).
    const xpAfterFirst = S.xp;
    mounts = [];
    go('lesson','sc-two');
    expect(lastMount().spec.id).toBe('a');      // sequence restarts at scene 1
    await tick();                               // deferred onAllDone for saved goals
    expect(nextBtn().disabled).toBe(false);
    nextBtn().onclick();                        // → capstone
    await tick();
    expect(nextBtn().textContent).toBe('Finish 🏁');
    nextBtn().onclick();                        // finish again
    expect(S.done['sc-two']).toBe(true);
    expect(S.xp).toBe(xpAfterFirst);            // no double lesson bonus / goal XP
  });

  it('a scenes lesson WITHOUT a capstone routes its last scene to the quiz gate', async () => {
    addScenesLesson('sc-quiz', [
      { id:'only', title:'Solo scene', goals:[g('move', s=>s.m===1, 10)] },
    ], [ { q:'2+2?', opts:['3','4'], a:1, why:'.' } ]);
    mounts = [];
    delete S.missions['sc-quiz::only']; delete S.done['sc-quiz'];
    go('lesson','sc-quiz');
    const goals = lastMount().goals;
    goals.evaluate({ m: 0 });                   // baseline
    goals.evaluate({ m: 1 });
    expect(nextBtn().textContent).toBe('Take the quiz →');
    const btn = nextBtn();                      // capture before quiz re-render clears cache
    btn.onclick();                              // → showQuiz
    // the quiz panel rendered a question — the legacy quiz gate is in charge now
    expect(stepBody().querySelector('#qpanel').innerHTML).toContain('QUESTION');
    expect(S.done['sc-quiz']).toBeUndefined();  // completion still owned by the quiz
  });

  it('legacy lessons (no scenes) never touch the scene runtime', () => {
    mounts = [];
    const legacy = LESSONS.find(l => !l.scenes && l.id !== 'sc-two' && l.id !== 'sc-quiz');
    go('lesson', legacy.id);
    expect(mounts.length).toBe(0);              // scenes path never entered
  });
});
