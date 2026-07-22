/* renderScenes branch audit (Vitest).

   Drives the REAL engine end-to-end headlessly: engine.mount() against the
   stub DOM, a `scenes:[...]` lesson whose scenes are REAL kit specs, the REAL
   kit-core mountScene with the null backend injected through setSceneBackend,
   and REAL learner input — synthetic pointer events on the scene surface that
   flow pointer → interact.js handle → param atom → goals → XP → advance gate.
   Pins:
     - await-mountScene wiring: controller mounted per scene, interaction
       attached, resize called (toWorld has scale)
     - a live drag completes a goal and arms the next button (input gate opens
       via the pointer grab; param sweeps without input never credit)
     - CAPSTONE (last scene) gates lesson completion: S.done flips with NO
       quiz interaction; no double lesson-bonus XP on revisit
     - a MID-SEQUENCE capstone is demoted to a normal scene (position guard)
     - a scenes lesson WITHOUT a capstone routes its last scene to the quiz
     - goals persist under lessonId::sceneId (index→bool)
     - legacy lessons (no scenes) still render the Learn step */
import { describe, it, expect, beforeAll } from 'vitest';

/* ---------- stub DOM ----------
   missions.test.mjs pattern, plus: (a) querySelector caches per selector so
   re-queried nodes (#next, #scene-canvas) are stable within one render, and
   the cache clears when innerHTML is assigned (a real re-render replaces
   children); (b) every node records listeners and supports dispatch() so
   synthetic pointer events can drive interact.js. */
const noop = () => {};
function makeNode(tag = 'div') {
  const node = {
    tagName: (tag || 'div').toUpperCase(), nodeType: 1, style: {}, dataset: {}, className: '',
    _text: '', _html: '', _qcache: {}, _listeners: {}, children: [], tabIndex: -1,
    classList: { _s: new Set(), add(...c){c.forEach(x=>this._s.add(x));}, remove(...c){c.forEach(x=>this._s.delete(x));}, toggle(){}, contains(c){return this._s.has(c);} },
    get textContent(){return this._text;}, set textContent(v){this._text=v;},
    get innerHTML(){return this._html;},
    set innerHTML(v){this._html=v; this._qcache={}; this.children=[];},
    appendChild(c){this.children.push(c);return c;}, prepend(c){this.children.unshift(c);return c;},
    removeChild(){}, remove(){}, insertBefore(c){this.children.push(c);return c;},
    setAttribute(k,v){this[k]=v;}, getAttribute(){return null;},
    addEventListener(t,fn){ (this._listeners[t] ??= []).push(fn); },
    removeEventListener(t,fn){ const a=this._listeners[t]; if(a){ const i=a.indexOf(fn); if(i>=0)a.splice(i,1);} },
    dispatch(t,ev){ (this._listeners[t]||[]).slice().forEach(fn=>fn(ev)); },
    setPointerCapture: noop, releasePointerCapture: noop,
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

let engine, S, go, LESSONS, SCORING;
let vec, point, kitGoal, kitVisited;

beforeAll(async () => {
  await import('../lib/curriculum/index.js');
  const params = await import('../lib/scene/params.js');
  const ents = await import('../lib/scene/entities.js');
  const seams = await import('../lib/scene/seams/goals.js');
  const backend = await import('../lib/scene/renderer/backend.js');
  vec = params.vec; point = ents.point; kitGoal = seams.goal; kitVisited = seams.visited;
  engine = await import('../lib/engine.js');
  ({ S, go, LESSONS, SCORING } = engine);
  engine.setSceneBackend(() => backend.createNullBackend());   // headless: no pixi
  engine.mount({});     // sets view/fx, routes home; API null so no network
  S.unlocks = { unlockAll: true, unlocked: {} };
});

const stepBody = () => hudNodes['stepbody'];
const nextBtn = () => stepBody().querySelector('#next');
const sceneCanvas = () => stepBody().querySelector('#scene-canvas');
// interact.js attaches to container.querySelector('canvas'):
const surfaceEl = () => sceneCanvas().querySelector('canvas');
const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms));

// world -> client px, replicating plane2 sizing for the 640x440 stub stage.
function clientAt(world, extent) {
  const scale = Math.min(640, 440) / (2 * extent);
  return { clientX: 320 + world.x * scale, clientY: 220 - world.y * scale,
    pointerId: 1, preventDefault() {} };
}
function dragTo(extent, from, to) {
  surfaceEl().dispatch('pointerdown', clientAt(from, extent));
  surfaceEl().dispatch('pointermove', clientAt(to, extent));
  surfaceEl().dispatch('pointerup', clientAt(to, extent));
}

// v1.4 §1: EVERY lesson (scenes included) opens on the Learn step. The scene
// arc replaces the labs step and is entered via Learn's "Try it yourself"
// (#next). This helper walks Learn → scene arc, then lets the async mount
// settle — the standard entry a learner takes.
const learnNext = () => stepBody().querySelector('#next');
async function enterScenes(id) {
  go('lesson', id);
  learnNext().onclick();      // "Try it yourself →" → renderScenes
  await tick();
}

// A real kit scene spec: one draggable point, one goal (drag it above y=2).
const EXT = 5.5;
function mkScene(id, opts = {}) {
  return {
    id, space: 'plane2', extent: EXT,
    params: { p: vec(2, 1) },
    entities: (pv) => [point(pv.p, { key: 'pt', handle: 'p' })],
    goals: [kitGoal('drag the point above y = 2', (s) => s.p.y > 2, { xp: 10 })],
    caption: 'drag it', ...opts,
  };
}
function addScenesLesson(id, scenes, quiz) {
  LESSONS.push({ id, world: 'pre', emoji: '🧪', title: 'Scene test ' + id, sub: '', learn: '<p>x</p>', ml: 'x',
    interactive: '__none__', scenes, quiz: quiz || [] });
}

describe('renderScenes: real mountScene + live pointer input', () => {
  it('drag completes a goal, arms advance; input gate blocks param sweeps', async () => {
    addScenesLesson('sc-live', [mkScene('a'), mkScene('cap', { capstone: true })]);
    delete S.missions['sc-live::a']; delete S.missions['sc-live::cap']; delete S.done['sc-live'];
    await enterScenes('sc-live');                   // Learn → scene arc, mount settles
    expect(nextBtn().textContent).toBe('');         // gated before any input
    dragTo(EXT, { x: 2, y: 1 }, { x: 2, y: 4 });    // real pointer flow
    expect(S.missions['sc-live::a']).toEqual({ 0: true });   // lessonId::sceneId
    expect(nextBtn().disabled).toBe(false);
    expect(nextBtn().textContent).toBe('Next scene →');
  });

  it('CAPSTONE (last) completes the lesson with no quiz; no double XP on refinish', async () => {
    // continues: advance to the capstone scene
    nextBtn().onclick();
    await tick();
    expect(stepBody().querySelector('#qpanel').innerHTML).toBe('');   // no quiz rendered
    dragTo(EXT, { x: 2, y: 1 }, { x: 0, y: 3 });
    expect(nextBtn().textContent).toBe('Finish 🏁');
    expect(S.done['sc-live']).toBeUndefined();
    const xpBeforeFinish = S.xp;
    nextBtn().onclick();                            // advanceToDone
    expect(S.done['sc-live']).toBe(true);           // quiz never involved
    expect(S.xp).toBeGreaterThanOrEqual(xpBeforeFinish + SCORING.lessonBonus);

    // Revisit: saved goals arm advance via the deferred tick; refinish grants 0.
    await enterScenes('sc-live');
    expect(nextBtn().disabled).toBe(false);
    nextBtn().onclick();                            // → capstone
    await tick();
    const xpAfterFirst = S.xp;
    expect(nextBtn().textContent).toBe('Finish 🏁');
    nextBtn().onclick();
    expect(S.xp).toBe(xpAfterFirst);                // no double lesson bonus
  });

  it('a MID-SEQUENCE capstone is demoted to a normal scene (position guard)', async () => {
    addScenesLesson('sc-midcap', [mkScene('early', { capstone: true }), mkScene('after')]);
    delete S.missions['sc-midcap::early']; delete S.missions['sc-midcap::after']; delete S.done['sc-midcap'];
    await enterScenes('sc-midcap');
    dragTo(EXT, { x: 2, y: 1 }, { x: 2, y: 4 });
    // NOT 'Finish 🏁' — the mid capstone must not end the lesson and skip scene 2
    expect(nextBtn().textContent).toBe('Next scene →');
    nextBtn().onclick();
    await tick();
    expect(S.done['sc-midcap']).toBeUndefined();    // lesson still in progress
    dragTo(EXT, { x: 2, y: 1 }, { x: 2, y: 4 });    // last scene (no capstone flag)
    expect(nextBtn().textContent).toBe('Finish 🏁');// no quiz on this lesson
  });

  it('a scenes lesson WITHOUT a capstone routes its last scene to the quiz gate', async () => {
    addScenesLesson('sc-quiz', [mkScene('only')], [{ q: '2+2?', opts: ['3', '4'], a: 1, why: '.' }]);
    delete S.missions['sc-quiz::only']; delete S.done['sc-quiz'];
    await enterScenes('sc-quiz');
    dragTo(EXT, { x: 2, y: 1 }, { x: 2, y: 4 });
    expect(nextBtn().textContent).toBe('Take the quiz →');
    const btn = nextBtn();
    btn.onclick();                                  // → showQuiz
    expect(stepBody().querySelector('#qpanel').innerHTML).toContain('QUESTION');
    expect(S.done['sc-quiz']).toBeUndefined();      // completion owned by the quiz
  });

  it('a zero-goal scene arms advance with no goals box and no mission entry (v1.3 §4)', async () => {
    addScenesLesson('sc-deco', [mkScene('deco', { goals: [] }), mkScene('real')]);
    delete S.missions['sc-deco::deco']; delete S.missions['sc-deco::real']; delete S.done['sc-deco'];
    await enterScenes('sc-deco');
    expect(nextBtn().disabled).toBe(false);            // decorative: nothing to gate
    expect(nextBtn().textContent).toBe('Next scene →');
    expect(S.missions['sc-deco::deco']).toBeUndefined();
    expect(stepBody().querySelector('#scene-goals').children.length).toBe(0);   // no GOALS box
    expect(stepBody().querySelector('#reattempt').onclick).toBeUndefined();     // non-capstone: no retry affordance
  });

  it('capstone New attempt: reroll + in-flight reset, attempt-1 progress does not carry (v1.3 §2–3)', async () => {
    const capSpec = mkScene('vcap', {
      capstone: true,
      randomize: () => ({ p: vec(2, 1) }),             // deterministic re-start
      goals: [kitVisited('visit up and down', (s) => (s.p.y > 2 ? 'up' : s.p.y < -2 ? 'down' : null),
        { keys: ['up', 'down'], xp: 10 })],
    });
    addScenesLesson('sc-retry', [capSpec]);
    delete S.missions['sc-retry::vcap']; delete S.done['sc-retry'];
    await enterScenes('sc-retry');
    const rb = stepBody().querySelector('#reattempt');
    expect(typeof rb.onclick).toBe('function');        // affordance rendered on capstones
    dragTo(EXT, { x: 2, y: 1 }, { x: 2, y: 4 });       // attempt 1: banks 'up'
    expect(S.missions['sc-retry::vcap']).toBeUndefined();
    rb.onclick();                                      // newAttempt → resetAttempt → baseline
    dragTo(EXT, { x: 2, y: 1 }, { x: 2, y: -4 });      // attempt 2: 'down' alone
    expect(S.missions['sc-retry::vcap']).toBeUndefined();   // attempt-1 'up' must not carry
    dragTo(EXT, { x: 2, y: -4 }, { x: 2, y: 4 });      // 'up' within attempt 2 → complete
    expect(S.missions['sc-retry::vcap']).toEqual({ 0: true });
    expect(nextBtn().textContent).toBe('Finish 🏁');
  });

  it('legacy lessons (no scenes) still render the Learn step', () => {
    const legacy = LESSONS.find(l => !l.scenes);
    go('lesson', legacy.id);
    expect(stepBody().innerHTML).toContain('Learn');
  });
});

/* v1.4 §1 — scenes-lesson SEQUENCING: Learn step FIRST, scene arc REPLACES the
   labs step, capstone gates completion, retake = capstone re-attempt, earlier
   scenes stay completed, progress persists per lessonId::sceneId across reload
   and back-navigation. */
describe('v1.4 §1 sequencing: Learn-first shell around the scene arc', () => {
  it('a scenes lesson OPENS on the Learn step, not the scene canvas', async () => {
    addScenesLesson('sq-seq', [mkScene('s1'), mkScene('cap', { capstone: true })]);
    delete S.missions['sq-seq::s1']; delete S.missions['sq-seq::cap']; delete S.done['sq-seq'];
    go('lesson', 'sq-seq');
    // Learn renders first: learn/ml body present, scene surface NOT mounted.
    expect(stepBody().innerHTML).toContain('📖 Learn');
    expect(stepBody().innerHTML).not.toContain('scene-canvas');
    // "Try it yourself →" enters the arc; entry credits nothing (learner-input gate).
    learnNext().onclick();
    await tick();
    expect(stepBody().innerHTML).toContain('scene-canvas');
    expect(S.missions['sq-seq::s1']).toBeUndefined();   // no credit on a step transition
    expect(nextBtn().textContent).toBe('');             // advance still gated
  });

  it('full arc learn→scene1→scene2→capstone→complete, then New attempt KEEPS completion', async () => {
    addScenesLesson('sq-arc', [
      mkScene('s1'), mkScene('s2'),
      mkScene('cap', { capstone: true, randomize: () => ({ p: vec(2, 1) }) }),
    ]);
    ['s1', 's2', 'cap'].forEach((k) => delete S.missions['sq-arc::' + k]);
    delete S.done['sq-arc'];
    await enterScenes('sq-arc');                        // Learn → scene 1
    dragTo(EXT, { x: 2, y: 1 }, { x: 2, y: 4 });        // scene 1 goals
    expect(S.missions['sq-arc::s1']).toEqual({ 0: true });
    expect(nextBtn().textContent).toBe('Next scene →');
    nextBtn().onclick(); await tick();                 // → scene 2
    dragTo(EXT, { x: 2, y: 1 }, { x: 2, y: 4 });        // scene 2 goals
    expect(S.missions['sq-arc::s2']).toEqual({ 0: true });
    nextBtn().onclick(); await tick();                 // → capstone
    expect(typeof stepBody().querySelector('#reattempt').onclick).toBe('function');
    dragTo(EXT, { x: 2, y: 1 }, { x: 2, y: 4 });        // pass the capstone
    expect(nextBtn().textContent).toBe('Finish 🏁');
    nextBtn().onclick();                               // capstone gates completion
    expect(S.done['sq-arc']).toBe(true);
    const xpAfter = S.xp;

    // Retake = capstone re-attempt. Revisit, walk to the capstone, reroll, re-pass.
    await enterScenes('sq-arc');                        // Learn → scene 1 (saved → re-arms)
    nextBtn().onclick(); await tick();                 // → scene 2 (saved → re-arms)
    nextBtn().onclick(); await tick();                 // → capstone
    stepBody().querySelector('#reattempt').onclick();  // newAttempt → resetAttempt → baseline
    dragTo(EXT, { x: 2, y: 1 }, { x: 2, y: 4 });        // re-pass in the fresh attempt
    expect(nextBtn().textContent).toBe('Finish 🏁');
    nextBtn().onclick();
    expect(S.done['sq-arc']).toBe(true);               // STILL complete after retake
    expect(S.missions['sq-arc::s1']).toEqual({ 0: true });  // earlier scenes stay complete
    expect(S.xp).toBe(xpAfter);                        // no second lesson bonus / no double credit
  });

  it('scene completion SURVIVES a reload mid-arc and resumes (persist per lessonId::sceneId)', async () => {
    addScenesLesson('sq-reload', [mkScene('s1'), mkScene('s2'), mkScene('cap', { capstone: true })]);
    ['s1', 's2', 'cap'].forEach((k) => delete S.missions['sq-reload::' + k]);
    delete S.done['sq-reload'];
    await enterScenes('sq-reload');
    dragTo(EXT, { x: 2, y: 1 }, { x: 2, y: 4 });        // complete scene 1
    expect(S.missions['sq-reload::s1']).toEqual({ 0: true });
    // "reload": tear down to the map (runCleanups disposes the controller), re-enter.
    go('home');
    await enterScenes('sq-reload');                    // Learn → scene 1 again
    await tick();                                      // deferred onAllDone from the saved goal
    expect(S.missions['sq-reload::s1']).toEqual({ 0: true });   // survived the reload
    expect(nextBtn().disabled).toBe(false);            // saved goal re-arms advance — no re-drag
    expect(S.done['sq-reload']).toBeUndefined();       // not falsely completed by the resume
  });

  it('§2: the REAL la-dot lesson opens on Learn, then its scene arc replaces the labs step', async () => {
    const lesson = LESSONS.find((l) => l.id === 'la-dot');
    expect(lesson.labs, 'la-dot must have no legacy labs (scenes-first)').toBeUndefined();
    go('lesson', 'la-dot');
    expect(stepBody().innerHTML).toContain('📖 Learn');           // Learn step first
    expect(stepBody().innerHTML).toContain('dot product');        // real learn body
    expect(stepBody().innerHTML).not.toContain('scene-canvas');   // arc not mounted yet
    learnNext().onclick();
    await tick();
    expect(stepBody().innerHTML).toContain('scene-canvas');       // real scene arc = the labs step
    expect(S.done['la-dot']).toBeUndefined();                     // entering the arc completes nothing
  });

  it('back from the FIRST scene returns to Learn; revisiting a completed scene never un-completes or double-credits', async () => {
    addScenesLesson('sq-back', [mkScene('s1'), mkScene('s2')]);
    delete S.missions['sq-back::s1']; delete S.missions['sq-back::s2']; delete S.done['sq-back'];
    await enterScenes('sq-back');
    dragTo(EXT, { x: 2, y: 1 }, { x: 2, y: 4 });        // complete scene 1
    expect(S.missions['sq-back::s1']).toEqual({ 0: true });
    const xp1 = S.xp;
    nextBtn().onclick(); await tick();                 // → scene 2
    // back to the completed scene 1: stays complete, no re-credit.
    stepBody().querySelector('#back').onclick(); await tick();
    expect(S.missions['sq-back::s1']).toEqual({ 0: true });
    expect(S.xp).toBe(xp1);
    // back from the first scene lands on the Learn step (v1.4 §1), not the Map.
    stepBody().querySelector('#back').onclick();
    expect(stepBody().innerHTML).toContain('📖 Learn');
  });
});
