/* ================================================================
   MINIMA — game engine (DOM/canvas, framework-free)
   Mounted into the page by components/Minima.jsx.
   Curriculum is pure data registered into ./curriculum/registry.js
   by ./curriculum/index.js — see the schema documented there.
   ================================================================ */
import { LESSONS, INTERACTIVES, SCORING, LEVELS } from './curriculum/registry.js';
import { enhanceContent } from './content-render.js';
import { resolveTag } from './curriculum/concepts.js';
import { generatorsForLesson, generate } from './curriculum/generators/index.js';
// Practice surface (KB plan §9 / PR 6): interleaveByWorld now lives in the pure
// selection module so BOTH the daily-review queue here and the server-side
// /api/practice policy share one implementation (single source of truth).
import { interleaveByWorld } from './practice/selection.js';

// Rich answer telemetry (PR 2, docs/KNOWLEDGE-BASE-PLAN.md §4.1 / §11):
// resolve a question's free-text q.tag to its canonical concept slug for the
// quiz_answer event log — undefined (dropped by the API) when the tag is
// missing or doesn't resolve, rather than sending the raw free text.
function tagSlugOf(q){ const c = q && q.tag && resolveTag(q.tag); return c ? c.id : undefined; }
// Stable per-question content id for the static curriculum pool — forward
// compatible with generated/bank questions, which will carry their own keys.
function questionKeyOf(lessonId, qi){ return lessonId + ':' + qi; }

/* ================================================================
   MINIMA — the math beneath machine learning, learned by doing
   ----------------------------------------------------------------
   ARCHITECTURE / EXTENDING THE CURRICULUM
   Lessons are pure data. To ADD a lesson, push an object into
   LESSONS (anywhere in the array — order within a world = unlock
   order). To REMOVE one, delete it; saved progress is keyed by
   lesson `id`, so other lessons are unaffected. To CHANGE content,
   edit the object.

   Lesson schema:
   {
     id:    'la-vectors',        // stable unique key (progress key)
     world: 'la' | 'calc',       // which track it appears in
     emoji: '➡️', title: '...', sub: '...card subtitle...',
     learn: '<p>HTML body</p>',  // the LEARN step (keep it short)
     ml:    '<b>...</b> html',   // "WHY THIS MATTERS FOR AI" box
     interactive: 'vectors',     // key into INTERACTIVES registry
     quiz: [ {q:'html', opts:['a','b','c','d'], a:0, why:'html'} ]
   }

   Wrong-answer feedback lives INLINE on each question as q.wrong, a map
   from wrong-option index → an explanation of why that option is wrong
   AND the misconception that makes it tempting. Optional: missing entries
   fall back to a generic nudge.
     quiz: [ {q:'…', opts:[…], a:0, why:'…', wrong:{1:'…', 2:'…', 3:'…'}} ]

   QUESTION TYPES — each question is dispatched by q.type (default 'mc')
   through the QUESTION_TYPES registry below. All three share ONE scoring +
   event pipeline (a correct answer still earns XP after a miss; a
   quiz_answer event fires on every attempt) — a type only owns its own UI
   and answer-checking, never the economy. Shapes:
     mc      (default): {q, opts:[…], a:<idx>, why, wrong:{idx:reason}}
     numeric:           {type:'numeric', q, answer:<number>, tol:<±number>,
                         unit?, why, hint?}   — correct iff |value−answer| ≤ tol
     order:             {type:'order', q, steps:[…in CORRECT order], why?}
                         — rendered shuffled; reorder with ↑/↓; exact match.
   tag / focus (weak-area assessment) work on every type.

   Interactive schema — INTERACTIVES[key] = function(stage, api) {
     stage: DOM node to render into (use lab/canvas helpers below)
     api.missions([{text, xp, check:(s)=>bool}]) -> {update(s), allDone()}
        Call update(state) whenever state changes; missions complete
        once, award XP, and gate the "Continue" button.
        INVARIANT: the FIRST update(state) is treated as a baseline of the
        lab's initial/default render and NEVER credits a mission — completion
        requires a learner-driven state change on a later update. Labs almost
        always call update() once during initial render (to populate
        readouts), so this prevents a mission whose check() happens to be true
        for the default state from auto-completing at load. Already-saved
        completions still render as done and gate correctly on revisit.
     api.onDone(fn)  -> notified when all missions complete
     return optional cleanup function (cancel animation frames etc).
   }
   ================================================================ */

/* ---------- learner progress tools (available to everyone) ----------
   Every learner gets a ⋮ menu on each world + lesson to self-serve unlocking
   and resetting their own progress. Manual-unlock overrides live in S.unlocks
   ({unlockAll, unlocked:{id:true}}) and per-world collapse prefs in S.collapsed.
   Both are first-class persisted state: saved locally AND merged across the
   server round-trip (see mergeState) so they survive reloads and follow the
   user across devices, exactly like lesson progress. */
function unlockStore(){ if(!S.unlocks) S.unlocks = {unlockAll:false, unlocked:{}}; if(!S.unlocks.unlocked) S.unlocks.unlocked={}; return S.unlocks; }

/* ---------- persistent state ---------- */
let SAVE_KEY = 'gradient-ascent-v1'; // mount() scopes this per auth user
let S = { xp:0, done:{}, missions:{}, ach:{}, streak:1, lastDay:'', firstTry:{} };
function load(){ try{ const r=localStorage.getItem(SAVE_KEY); if(r) S=Object.assign(S,JSON.parse(r)); }catch(e){} }
function localSave(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){} }
function save(){ localSave(); scheduleSync(); }

/* ---------- server sync (postgres backend, optional) ----------
   When served over http(s), progress syncs to the API with a debounce.
   Identity comes from the Supabase session cookie — the React shell only
   mounts the engine for authenticated users, and the API derives the user
   from the cookie (no client-supplied identifiers). localStorage remains
   the offline fallback and the only store when opened as a file:// page. */
const API = (typeof location !== 'undefined' && /^https?:$/.test(location.protocol)) ? '/api' : null;
let syncTimer = null, eventQueue = [], flushing = false, onSignOutCb = null;
// Identity linking (Supabase manual linking): the account menu offers an
// email/password learner a "Link Google" action. Callback + live link state
// are set by the React shell; the menu reads them fresh each time it opens.
let onLinkIdentityCb = null, googleLinked = false, googleLinkable = false;
// Register-a-passkey action for the signed-in learner (Supabase WebAuthn).
let onRegisterPasskeyCb = null;
// Called by the React shell once getUserIdentities() resolves (and again after
// a link redirect). mount() reads opts only once, so link state lives here.
export function setAuthLinkState(s){
  s = s || {};
  googleLinked = !!s.linked; googleLinkable = !!s.linkable;
}
function setSync(st){
  const el = document.getElementById('sync-pill'); if(!el) return;
  el.innerHTML = {local:'💾 local', saving:'🟡 saving…', synced:'🟢 synced', offline:'⚪ offline'}[st];
  el.title = {local:'Progress stored in this browser only', saving:'Syncing to server…',
              synced:'Progress saved to Postgres', offline:'Server unreachable — saving locally, will retry'}[st];
}
function scheduleSync(){
  if(!API) return;
  setSync('saving'); clearTimeout(syncTimer);
  syncTimer = setTimeout(pushState, 900);
}
async function pushState(){
  try{
    const r = await fetch(API+'/state', {method:'PUT',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify({state:S})});
    if(!r.ok) throw new Error(r.status);
    flushEvents(); setSync('synced');
  }catch(e){ setSync('offline'); }
}
// Per-tag accuracy isn't stored server-side, but per-LESSON accuracy is
// (GET /api/stats). We fetch it once per session and feed it to the daily
// review queue as a low-accuracy signal. null until fetched / when off-http.
let statsCache = null;
async function fetchStats(){
  if(!API) return null;
  try{
    const r = await fetch(API+'/stats');
    if(!r.ok) return null;
    const d = await r.json();
    statsCache = Array.isArray(d.lessons) ? d.lessons : [];
    // Rebuild today's queue with the accuracy signal now that stats arrived —
    // but never yank a queue the learner is mid-way through or has finished.
    if(!S.reviewDone) reviewQueue = null;
    if(route.name==='home') renderHome();
    return statsCache;
  }catch(e){ return null; }
}
function logEvent(ev){ if(!API) return; eventQueue.push(ev); flushEvents(); }
async function flushEvents(){
  if(flushing || !eventQueue.length || !API) return;
  flushing = true;
  const batch = eventQueue.splice(0);
  try{
    const r = await fetch(API+'/events', {method:'POST',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify({events:batch})});
    if(!r.ok) throw new Error(r.status);
  }catch(e){ eventQueue.unshift(...batch); }
  flushing = false;
}
// union-merge: never lose progress from either side
function mergeState(local, remote){
  const m = Object.assign({}, local);
  m.xp = Math.max(local.xp||0, remote.xp||0);
  for(const k of ['done','ach','firstTry'])
    m[k] = Object.assign({}, remote[k]||{}, local[k]||{});
  m.missions = {};
  new Set([...Object.keys(local.missions||{}), ...Object.keys(remote.missions||{})])
    .forEach(id => m.missions[id] = Object.assign({}, (remote.missions||{})[id]||{}, (local.missions||{})[id]||{}));
  m.streak = Math.max(local.streak||1, remote.streak||1);
  // Manual-unlock overrides + collapsed-world prefs are first-class persisted
  // state: merge them like progress (union of unlocked ids, OR of unlockAll)
  // so a self-serve unlock/reset or a collapse follows the user across devices.
  m.unlocks = {
    unlockAll: !!((local.unlocks&&local.unlocks.unlockAll) || (remote.unlocks&&remote.unlocks.unlockAll)),
    unlocked: Object.assign({}, (remote.unlocks||{}).unlocked||{}, (local.unlocks||{}).unlocked||{}),
  };
  m.collapsed = Object.assign({}, remote.collapsed||{}, local.collapsed||{});
  // Daily-review markers: weak (union so a fix on either device sticks),
  // reviewLog (latest recency per lesson), and the day/done flags (prefer the
  // side that already finished today so the queue doesn't reappear).
  m.weak = Object.assign({}, remote.weak||{}, local.weak||{});
  const rl = Object.assign({}, remote.reviewLog||{}, local.reviewLog||{});
  for(const id of Object.keys(rl))
    rl[id] = Math.max((remote.reviewLog||{})[id]||0, (local.reviewLog||{})[id]||0);
  m.reviewLog = rl;
  const today = (typeof Date!=='undefined') ? new Date().toDateString() : '';
  const localToday = local.reviewDay===today, remoteToday = remote.reviewDay===today;
  m.reviewDay = localToday||remoteToday ? today : (local.reviewDay||remote.reviewDay||'');
  m.reviewDone = (localToday && local.reviewDone) || (remoteToday && remote.reviewDone) || false;
  return m;
}
// identity is handled by Supabase Auth (see components/Minima.jsx);
// the engine shows who's signed in and opens the account menu
function setUserPill(label, email){
  const pill = document.getElementById('user-pill'); if(!pill) return;
  pill.style.display = 'flex';
  pill.title = 'Account';
  const name = document.getElementById('user-name');
  if(name) name.textContent = label || 'learner';
  let menu = null;
  const close = ()=>{ if(menu){ menu.remove(); menu=null; document.removeEventListener('pointerdown', onAway); } };
  const onAway = e=>{ if(!pill.contains(e.target)) close(); };
  pill.onclick = (e)=>{
    if(e.target.closest('.user-menu')) return;   // item clicks handled below
    if(menu){ close(); return; }
    menu = document.createElement('div'); menu.className='user-menu';
    menu.innerHTML =
      '<div class="um-head" title="'+(email||'')+'">'+(email||label||'learner')+'</div>'+
      '<button class="um-item" data-act="ach">🏆 Achievements <span class="um-sub">'+
        Object.keys(S.ach).length+' / '+ACHIEVEMENTS.length+'</span></button>'+
      '<button class="um-item" data-act="lb">🏅 Leaderboard</button>'+
      (googleLinked
        ? '<div class="um-item um-dim">✓ Google linked</div>'
        : (googleLinkable && onLinkIdentityCb
            ? '<button class="um-item" data-act="link">🔗 Link Google account</button>'
            : ''))+
      (onRegisterPasskeyCb
        ? '<button class="um-item" data-act="passkey">🔑 Register a passkey</button>'
        : '')+
      (onSignOutCb
        ? '<button class="um-item um-out" data-act="out">🚪 Sign out</button>'
        : '<div class="um-item um-dim">🔧 dev session — no sign-out</div>');
    menu.addEventListener('click', ev=>{
      const act = ev.target.closest('[data-act]')?.dataset.act; if(!act) return;
      close();
      if(act==='ach'){ go('home'); document.querySelector('.ach-grid')?.scrollIntoView({behavior:'smooth', block:'center'}); }
      else if(act==='lb') showLeaderboard();
      else if(act==='link' && onLinkIdentityCb) onLinkIdentityCb();
      else if(act==='passkey' && onRegisterPasskeyCb) onRegisterPasskeyCb();
      else if(act==='out' && onSignOutCb) onSignOutCb();
    });
    pill.appendChild(menu);
    document.addEventListener('pointerdown', onAway);
  };
}
async function showLeaderboard(){
  const back = document.createElement('div'); back.className='modal-back';
  back.innerHTML = '<div class="modal lb-modal"><h2>🏅 Leaderboard</h2><div class="lb-body">loading…</div></div>';
  const dismiss = e=>{ if(e.target===back) back.remove(); };
  back.addEventListener('click', dismiss);
  document.body.appendChild(back);
  const body = back.querySelector('.lb-body');
  if(!API){ body.textContent='Leaderboard needs a server — you\'re running local-only.'; return; }
  try{
    const r = await fetch(API+'/leaderboard'); if(!r.ok) throw new Error(r.status);
    const rows = (await r.json()).leaderboard || [];
    body.innerHTML = rows.length
      ? rows.map((u,i)=>'<div class="lb-row'+((u.username||'')===(document.getElementById('user-name')?.textContent)?' me':'')+'">'+
          '<span class="lb-rank">'+(i+1)+'</span><span class="lb-name">'+(u.username||'learner')+'</span>'+
          '<span class="lb-xp">'+u.xp+' XP</span></div>').join('')
      : 'Nobody on the board yet — finish a lesson to claim the summit.';
  }catch(e){ body.textContent='Couldn\'t reach the server — try again when you\'re online.'; }
}
function initSync(){
  try{
    if(!API){ setSync('local'); return; }
    initialFetch();
  }catch(e){ console.error('sync init failed', e); setSync('offline'); }
}
async function initialFetch(){
  setSync('saving');
  try{
    const r = await fetch(API+'/state');
    if(r.ok){
      const d = await r.json();
      S = mergeState(S, d.state||{});
      S._lvl = levelInfo().n; localSave(); renderHUD();
      if(route.name==='home') renderHome();
    } else if(r.status!==404) throw new Error(r.status);
    await pushState();
    fetchStats(); // fire-and-forget: feeds low-accuracy signal to daily review
  }catch(e){ setSync('offline'); }
}
function touchStreak(){
  const today = new Date().toDateString();
  if(S.lastDay !== today){
    const y = new Date(Date.now()-864e5).toDateString();
    S.streak = (S.lastDay === y) ? S.streak+1 : 1;
    S.lastDay = today; save();
  }
}

/* ---------- levels ---------- */
// level curve lives in the curriculum registry (economy = data, not engine)
function levelInfo(){
  let i=0; while(i<LEVELS.length-1 && S.xp>=LEVELS[i+1].xp) i++;
  const cur=LEVELS[i], next=LEVELS[i+1];
  return {n:i+1, title:cur.t, pct: next? (S.xp-cur.xp)/(next.xp-cur.xp)*100 : 100, next};
}

/* ---------- achievements (registry — add freely) ---------- */
const ACHIEVEMENTS = [
  {id:'first',   ico:'🐣', name:'First Steps',        desc:'Complete your first lesson',            test:()=>Object.keys(S.done).length>=1},
  {id:'vec',     ico:'🏹', name:'Vector Victor',      desc:'Finish the first 3 linear algebra lessons', test:()=>laIds().slice(0,3).every(id=>S.done[id])},
  {id:'la-all',  ico:'🧮', name:'Matrix Master',      desc:'Complete the linear algebra world',     test:()=>laIds().every(id=>S.done[id])},
  {id:'limit',   ico:'🚀', name:'Limit Breaker',      desc:'Complete your first calculus lesson',   test:()=>calcIds().some(id=>S.done[id])},
  {id:'descent', ico:'⛷️', name:'Descent Disciple',   desc:'Complete the gradient descent lesson',  test:()=>!!S.done['c-graddesc']},
  {id:'calc-all',ico:'∫',  name:'Calculus Champion',  desc:'Complete the calculus world',           test:()=>calcIds().every(id=>S.done[id])},
  {id:'bayes',   ico:'🩺', name:'Base-Rate Believer', desc:'Complete the Bayes\' theorem lesson',   test:()=>!!S.done['prob-bayes']},
  {id:'prob-all',ico:'🎲', name:'Uncertainty Tamer',  desc:'Complete the probability world',        test:()=>probIds().length>0&&probIds().every(id=>S.done[id])},
  {id:'half',    ico:'🌗', name:'Halfway There',      desc:'Complete half of all lessons',          test:()=>Object.keys(S.done).length>=Math.ceil(LESSONS.length/2)},
  {id:'perfect', ico:'💎', name:'Perfectionist',      desc:'Ace a quiz first-try, every question',  test:()=>Object.values(S.firstTry).some(v=>v===true)},
  {id:'lv5',     ico:'🧗', name:'Gradient Climber',   desc:'Reach level 6',                         test:()=>levelInfo().n>=6},
  {id:'grad',    ico:'🎓', name:'AI Researcher',      desc:'Complete every lesson',                 test:()=>LESSONS.every(l=>S.done[l.id])},
];
const laIds   = ()=>LESSONS.filter(l=>l.world==='la').map(l=>l.id);
const calcIds = ()=>LESSONS.filter(l=>l.world==='calc').map(l=>l.id);
const probIds = ()=>LESSONS.filter(l=>l.world==='prob').map(l=>l.id);
function checkAchievements(){
  for(const a of ACHIEVEMENTS){
    if(!S.ach[a.id] && a.test()){
      S.ach[a.id]=true; save();
      toast(a.ico, 'Achievement: '+a.name, a.desc, true);
      grantXP(SCORING.achievementXP, null, true);
    }
  }
}

/* ---------- XP / HUD ---------- */
function grantXP(n, nearEl, silent){
  S.xp += n; save(); renderHUD();
  if(nearEl){
    const r = nearEl.getBoundingClientRect();
    const f = document.createElement('div');
    f.className='xpfloat'; f.textContent='+'+n+' XP';
    f.style.left=(r.left+r.width/2-20)+'px'; f.style.top=(r.top-8)+'px';
    document.body.appendChild(f); setTimeout(()=>f.remove(),1100);
  }
  const li = levelInfo();
  if(li.n !== (S._lvl||1)){
    if(li.n > (S._lvl||1)) { toast('⭐','Level '+li.n+' — '+li.title,'Keep ascending!',true); confetti(80); }
    S._lvl = li.n; save();
  }
  if(!silent) checkAchievements();
}
function renderHUD(){
  const li = levelInfo();
  document.getElementById('xp-fill').style.width = li.pct+'%';
  document.getElementById('xp-label').textContent = S.xp+' XP'+(li.next?' / '+li.next.xp:'');
  document.getElementById('lvl-title').textContent = li.title;
  document.getElementById('lvl-num').textContent = li.n;
  document.getElementById('streak').textContent = S.streak;
}

/* ---------- toasts & confetti ---------- */
function toast(ico, title, sub, gold){
  const t=document.createElement('div');
  t.className='toast'+(gold?' gold':'');
  t.innerHTML='<span class="tico">'+ico+'</span><div><div>'+title+'</div>'+(sub?'<div class="tsub">'+sub+'</div>':'')+'</div>';
  document.getElementById('toasts').appendChild(t);
  setTimeout(()=>{t.classList.add('out'); setTimeout(()=>t.remove(),320);}, 3400);
}
let fxc, fxx;
let parts=[], fxRunning=false;
function confetti(n){
  fxc.width=innerWidth; fxc.height=innerHeight;
  const cols=['#7c5cff','#00d4ff','#ffc94d','#2dd4a0','#ff5c7a','#fff'];
  for(let i=0;i<n;i++) parts.push({x:innerWidth/2+(Math.random()-.5)*240, y:innerHeight*0.32,
    vx:(Math.random()-.5)*11, vy:-Math.random()*11-3, g:.3, s:Math.random()*7+4,
    c:cols[(Math.random()*cols.length)|0], r:Math.random()*Math.PI, vr:(Math.random()-.5)*.3, life:110});
  if(!fxRunning){ fxRunning=true; fxTick(); }
}
function fxTick(){
  fxx.clearRect(0,0,fxc.width,fxc.height);
  parts = parts.filter(p=>p.life>0);
  for(const p of parts){
    p.x+=p.vx; p.y+=p.vy; p.vy+=p.g; p.r+=p.vr; p.life--;
    fxx.save(); fxx.translate(p.x,p.y); fxx.rotate(p.r);
    fxx.globalAlpha=Math.min(1,p.life/30); fxx.fillStyle=p.c;
    fxx.fillRect(-p.s/2,-p.s/2,p.s,p.s); fxx.restore();
  }
  if(parts.length){ requestAnimationFrame(fxTick); } else { fxRunning=false; fxx.clearRect(0,0,fxc.width,fxc.height); }
}

/* ---------- canvas / lab helpers (shared by interactives) ---------- */
let cleanupFns = [];
function registerCleanup(fn){ cleanupFns.push(fn); }
function runCleanups(){ cleanupFns.forEach(f=>{try{f()}catch(e){}}); cleanupFns=[]; }

function makeLab(stage, opts){
  // builds: [canvas+readout | controls column(+missions)] ; returns refs
  opts = opts||{};
  const lab=document.createElement('div'); lab.className='lab';
  const cw=document.createElement('div'); cw.className='canvas-wrap';
  const canvas=document.createElement('canvas');
  const readout=document.createElement('div'); readout.className='readout';
  cw.appendChild(canvas); cw.appendChild(readout);
  const ctrl=document.createElement('div'); ctrl.className='controls';
  lab.appendChild(cw); lab.appendChild(ctrl); stage.appendChild(lab);
  const W=opts.w||640, H=opts.h||440, dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=W*dpr; canvas.height=H*dpr; canvas.style.aspectRatio=W+'/'+H;
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
  return {lab, canvas, ctx, readout, ctrl, W, H,
    toCanvas(ev){ const r=canvas.getBoundingClientRect();
      return {x:(ev.clientX-r.left)*W/r.width, y:(ev.clientY-r.top)*H/r.height}; }
  };
}
function slider(parent, label, min, max, step, val, fmt, oninput){
  const d=document.createElement('div'); d.className='ctrl';
  const l=document.createElement('label'); const span=document.createElement('span');
  span.textContent=label; const v=document.createElement('span'); v.className='val';
  l.appendChild(span); l.appendChild(v);
  const r=document.createElement('input'); r.type='range';
  r.min=min; r.max=max; r.step=step; r.value=val;
  const upd=()=>{ v.textContent=fmt?fmt(+r.value):(+r.value).toFixed(2); };
  r.addEventListener('input',()=>{upd(); oninput(+r.value);});
  upd(); d.appendChild(l); d.appendChild(r); parent.appendChild(d);
  return {set(x){r.value=x;upd();}, get(){return +r.value;}, el:r};
}
function chips(parent, title, names, onpick){
  const d=document.createElement('div'); d.className='ctrl';
  if(title){const l=document.createElement('label');l.innerHTML='<span>'+title+'</span>';d.appendChild(l);}
  const row=document.createElement('div'); row.className='chipbtns';
  names.forEach((n,i)=>{ const b=document.createElement('button'); b.className='chip'; b.textContent=n;
    b.onclick=()=>onpick(i,b,row); row.appendChild(b); });
  d.appendChild(row); parent.appendChild(d); return row;
}
// world-coords plane (mathematical y-up) for canvas drawing
function plane(ctx, W, H, scale, ox, oy){
  ox = ox===undefined? W/2:ox; oy = oy===undefined? H/2:oy;
  const P={
    sx:x=>ox+x*scale, sy:y=>oy-y*scale,
    wx:px=>(px-ox)/scale, wy:py=>(oy-py)/scale,
    grid(){
      ctx.lineWidth=1;
      const x0=Math.floor(P.wx(0)), x1=Math.ceil(P.wx(W)), y1=Math.ceil(P.wy(0)), y0=Math.floor(P.wy(H));
      for(let x=x0;x<=x1;x++){ ctx.strokeStyle=x===0?'rgba(255,255,255,.35)':'rgba(255,255,255,.07)';
        ctx.beginPath(); ctx.moveTo(P.sx(x),0); ctx.lineTo(P.sx(x),H); ctx.stroke(); }
      for(let y=y0;y<=y1;y++){ ctx.strokeStyle=y===0?'rgba(255,255,255,.35)':'rgba(255,255,255,.07)';
        ctx.beginPath(); ctx.moveTo(0,P.sy(y)); ctx.lineTo(W,P.sy(y)); ctx.stroke(); }
    },
    arrow(x0,y0,x1,y1,color,w,label){
      ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=w||3;
      const ax=P.sx(x0),ay=P.sy(y0),bx=P.sx(x1),by=P.sy(y1);
      const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy); if(len<1)return;
      const ux=dx/len,uy=dy/len, hs=Math.min(13,len*.4);
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx-ux*hs*.7,by-uy*hs*.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx,by);
      ctx.lineTo(bx-ux*hs-uy*hs*.45, by-uy*hs+ux*hs*.45);
      ctx.lineTo(bx-ux*hs+uy*hs*.45, by-uy*hs-ux*hs*.45);
      ctx.closePath(); ctx.fill();
      if(label){ ctx.font='700 14px '+getComputedStyle(document.body).fontFamily;
        ctx.fillText(label, bx+ux*14-5, by+uy*14+5); }
    },
    dot(x,y,r,color){ ctx.fillStyle=color; ctx.beginPath(); ctx.arc(P.sx(x),P.sy(y),r,0,7); ctx.fill(); },
    fn(f,color,w,x0,x1){ // plot y=f(x)
      ctx.strokeStyle=color; ctx.lineWidth=w||2.5; ctx.beginPath();
      const a=x0===undefined?P.wx(0):x0, b=x1===undefined?P.wx(W):x1; let started=false;
      for(let px=P.sx(a); px<=P.sx(b); px+=2){
        const y=f(P.wx(px)); if(!isFinite(y)){started=false;continue;}
        const py=P.sy(y); if(py<-2000||py>2000){started=false;continue;}
        if(!started){ctx.moveTo(px,py);started=true;} else ctx.lineTo(px,py);
      }
      ctx.stroke();
    }
  };
  return P;
}
function clearBg(ctx,W,H){ ctx.fillStyle='#11152a'; ctx.fillRect(0,0,W,H); }
const fmt2 = n => (Math.abs(n)<.005?0:n).toFixed(2);

/* ---------- missions engine (the "learn by doing" core) ---------- */
function makeMissions(stage, lessonId, defs, onAllDone){
  const box=document.createElement('div'); box.className='missions';
  box.innerHTML='<h3>🎯 MISSIONS — complete all to continue</h3>';
  const saved = S.missions[lessonId] || {};
  const rows = defs.map((d,i)=>{
    const row=document.createElement('div'); row.className='mission';
    row.innerHTML='<div class="mcheck"></div><div>'+d.text+'</div><div class="mxp">+'+d.xp+'</div>';
    if(saved[i]){ row.classList.add('done'); row.querySelector('.mcheck').textContent='✓'; }
    box.appendChild(row); return row;
  });
  stage.appendChild(box);
  enhanceContent(box);
  let doneCount = defs.reduce((n,_,i)=>n+(saved[i]?1:0),0);
  // The first update(state) is the lab's initial/default render. We treat it
  // as a BASELINE only: never credit a mission from it (a check() that is true
  // for the default state would otherwise auto-complete on load). Missions can
  // only be awarded on subsequent, learner-driven updates.
  let baselined = false;
  const api = {
    el: box,
    update(state){
      const isBaseline = !baselined;
      baselined = true;
      if(isBaseline) return;                // baseline render -> no credit
      defs.forEach((d,i)=>{
        if(saved[i]) return;
        let ok=false; try{ ok=d.check(state); }catch(e){}
        if(ok){
          saved[i]=true; S.missions[lessonId]=saved; save();
          rows[i].classList.add('done'); rows[i].querySelector('.mcheck').textContent='✓';
          grantXP(d.xp, rows[i]); toast('🎯','Mission complete!',d.text);
          doneCount++;
          if(doneCount===defs.length && onAllDone) onAllDone();
        }
      });
    },
    allDone(){ return doneCount===defs.length; }
  };
  if(api.allDone() && onAllDone) setTimeout(onAllDone,0);
  return api;
}

/* ---------- predict-then-verify (kills slider-sweeping) ----------
   A prediction gate the learner must commit BEFORE the lab controls unlock.
   Exploits the hypercorrection effect: committing a guess — right OR wrong —
   makes the reveal stick. Two flavors:
     def.choices : string[]        -> multiple-choice; def.answer is the index
     def.input   : true/{unit,ph}  -> numeric field;   def.answer + def.tol
   Grading is a pure function (gradePrediction) so it can be unit-tested with
   no DOM. All XP comes from SCORING.predict — the engine holds no numbers. */
function gradePrediction(def, raw){
  if(def && Array.isArray(def.choices)){
    const value = (raw|0);
    return { value, correct: value === def.answer };
  }
  // numeric input: correct when within tolerance of the true value
  const value = typeof raw === 'number' ? raw : parseFloat(raw);
  const tol = (def && typeof def.tol === 'number') ? def.tol : 1e-9;
  return { value, correct: isFinite(value) && Math.abs(value - def.answer) <= tol };
}
function makePredict(stage, lessonId, def, onCommit){
  const key = lessonId+'::predict';
  const saved = S.missions[key] || {};
  const box=document.createElement('div'); box.className='predict';
  const total = SCORING.predict.commit + SCORING.predict.hit;
  box.innerHTML='<div class="predict-head">🔮 PREDICT FIRST — commit before the controls unlock '+
    '<span class="predict-xp">+'+SCORING.predict.commit+' to commit · +'+total+' if right</span></div>'+
    '<div class="predict-prompt">'+def.prompt+'</div>';
  const body=document.createElement('div'); box.appendChild(body);
  const reveal=document.createElement('div'); reveal.className='predict-reveal'; box.appendChild(reveal);
  enhanceContent(box);
  // gate: disable every control the interactive already rendered into the stage
  const gated = [];
  function setGate(locked){
    stage.querySelectorAll('.controls input, .controls button, .controls select')
      .forEach(el=>{ if(box.contains(el)) return; el.disabled = locked; gated.push(el); });
    const lab = stage.querySelector('.lab'); if(lab) lab.classList.toggle('lab-locked', locked);
  }
  let committed = !!saved.committed;
  function doReveal(correct){
    committed = true;
    setGate(false);
    reveal.innerHTML = (correct
        ? '<span class="predict-mark hit">✓ You called it.</span> '
        : '<span class="predict-mark miss">✗ Not quite — and that\'s the point.</span> ')
      + def.reveal;
    reveal.classList.add('shown');
    enhanceContent(reveal);
    if(onCommit) onCommit(correct);
  }
  if(committed){
    // returning to an already-committed prediction: reveal, no re-award
    const correct = !!saved.correct;
    box.classList.add('committed');
    body.innerHTML = def.choices
      ? '<div class="predict-recall">Your prediction: <b>'+def.choices[saved.pick|0]+'</b></div>'
      : '<div class="predict-recall">Your prediction: <b>'+(saved.pick)+(def.unit?' '+def.unit:'')+'</b></div>';
    doReveal(correct);
  } else if(def.choices){
    const opts=document.createElement('div'); opts.className='predict-opts';
    def.choices.forEach((c,i)=>{ const btn=document.createElement('button'); btn.className='predict-opt';
      btn.innerHTML=c; btn.onclick=()=>commit(i, btn); opts.appendChild(btn); });
    body.appendChild(opts);
  } else {
    const row=document.createElement('div'); row.className='predict-input';
    const inp=document.createElement('input'); inp.type='number'; inp.step='any';
    inp.placeholder = def.placeholder || 'your prediction';
    const btn=document.createElement('button'); btn.className='btn'; btn.textContent='Lock it in';
    const go=()=>{ if(inp.value.trim()==='') { inp.focus(); return; } commit(parseFloat(inp.value), btn); };
    inp.addEventListener('keydown',e=>{ if(e.key==='Enter') go(); });
    btn.onclick=go;
    row.appendChild(inp); if(def.unit){ const u=document.createElement('span'); u.className='predict-unit'; u.textContent=def.unit; row.appendChild(u); }
    row.appendChild(btn); body.appendChild(row);
  }
  function commit(raw, srcEl){
    if(committed) return;
    const {value, correct} = gradePrediction(def, raw);
    S.missions[key] = { committed:true, correct, pick: def.choices ? (value|0) : value }; save();
    box.classList.add('committed');
    // show what they picked, freeze the input UI
    body.innerHTML = def.choices
      ? '<div class="predict-recall">Your prediction: <b>'+def.choices[value|0]+'</b></div>'
      : '<div class="predict-recall">Your prediction: <b>'+value+(def.unit?' '+def.unit:'')+'</b></div>';
    grantXP(SCORING.predict.commit, srcEl);
    if(correct) grantXP(SCORING.predict.hit, srcEl);
    toast(correct?'🎯':'🔮', correct?'Called it! +'+total+' XP':'Committed — now watch',
      correct?'The reveal will still teach you something.':'Wrong is fine; committing is what makes it stick.');
    doReveal(correct);
  }
  // prepend so the gate reads top-to-bottom: predict → (locked) lab
  stage.insertBefore(box, stage.firstChild);
  setGate(!committed);
  return { committed(){ return committed; }, el:box };
}

/* ---------- router & screens ---------- */
let view;
let route = {name:'home'};
function go(name, arg){ runCleanups(); window.scrollTo(0,0);
  // Resolve the real destination BEFORE touching history, so a click on a
  // locked/unknown lesson collapses into a single clean home navigation
  // instead of pushing a junk /lesson/<id> entry that we immediately leave.
  if(name==='lesson'){
    const l = LESSONS.find(x=>x.id===arg);
    if(!l || !isUnlocked(l)){ name='home'; arg=undefined; }
  }
  if(name==='exam' && !isWorldComplete(arg)){ name='home'; arg=undefined; }
  route={name,arg};
  syncHistory(name, arg);
  if(name==='home') renderHome();
  else if(name==='lesson') renderLesson(arg);
  else if(name==='exam') renderExam(arg); }

// Browser-history sync (deep-linkable URLs + back/forward). This is the DOM
// History API — unrelated to the pushState() progress-sync function above.
// historyMode controls how a navigation touches the history stack:
//   'push'    — normal user navigation, adds an entry (default)
//   'replace' — initial load / back-forward, swaps the current entry in place
let historyMode = 'push';
function syncHistory(name, arg){
  if (typeof window === 'undefined' || !window.history || !window.location) return;
  const url = name==='lesson' ? ('/lesson/'+encodeURIComponent(arg))
    : name==='exam' ? ('/exam/'+encodeURIComponent(arg))
    : '/';
  const state = {name, arg};
  if (historyMode === 'replace'){ window.history.replaceState(state, '', url); return; }
  // Push mode: skip a duplicate identical entry to avoid dead back-steps.
  if (window.location.pathname === url) return;
  window.history.pushState(state, '', url);
}

// order within a world = push order, unless a lesson sets `order` to
// slot itself between existing ones (e.g. order: 5.5)
function worldLessons(w){
  return LESSONS.map((l,i)=>[l, l.order ?? i]).filter(([l])=>l.world===w)
    .sort((a,b)=>a[1]-b[1]).map(([l])=>l);
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }
/* ---------- retake template mix (PR 5) ----------
   Pure, testable helpers behind SCORING.retakeTemplateShare. On a lesson
   RETAKE the engine swaps a fraction of the drawn static questions for fresh
   seeded generator variants (see curriculum/generators/). First attempts never
   call these. The seed is derived from a MONOTONIC per-lesson retake counter
   (persisted in S) hashed with the slot index — deterministic and replayable
   by question_key = 'gen:<id>:<seed>', with no Date.now()/Math.random() in the
   seed path. */
// How many of n drawn slots become generated variants for the given share.
// >=1 whenever share>0 and there is at least one slot, but never all of them
// unless the share rounds that high — retakes stay anchored to the vetted pool.
function templateSlotCount(n, share){
  if(!(share > 0) || n <= 0) return 0;
  return Math.min(n, Math.max(1, Math.round(n * share)));
}
// FNV-1a hash of (lessonId, retake counter, slot) → uint32 seed.
function genSeed(lessonId, seq, slot){
  let h = 2166136261 >>> 0;
  const s = String(lessonId) + ':' + seq + ':' + slot;
  for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// per-question concept metadata: inline q.tag / q.focus, else sensible defaults
function metaOf(l, qi){
  const q=l.quiz[qi];
  return { tag: q.tag || l.title,
           focus: q.focus || ('Re-read the lesson "'+l.title+'" — especially its Go-deeper notes.') };
}
/* ================================================================
   QUESTION TYPE REGISTRY — the enabling refactor behind mixed-format
   assessment. Every quiz question is dispatched by q.type (default 'mc')
   through QUESTION_TYPES[type].render(root, q, ctx).

   The engine owns the ECONOMY and the EVENT LOG; a type owns only its own
   UI + answer-checking. That contract is `ctx`:
     ctx.miss(nearEl, whyHtml, chosen?)  — record a wrong attempt: logs a
        quiz_answer{correct:false} event (with the concept tag, question
        type, and — when the type passes it — the option text/value that
        was `chosen`), marks the question "tried" (so a later correct answer
        earns the after-miss rate), and renders inline feedback next to
        nearEl. Call once per wrong attempt.
     ctx.correct(nearEl)        — record the right answer: grants XP via
        SCORING (first vs afterMiss / quiz vs retake), logs
        quiz_answer{correct:true}, then shows q.why + the Next button.
        Call exactly once; the type should lock its own inputs first.
   No type ever references SCORING or XP numbers — those live in the
   registry, keeping engine.js content-agnostic.
   ================================================================ */
export const QUESTION_TYPES = {
  // Multiple choice — the historical default. Behavior is byte-for-byte the
  // old renderQ(): options shuffled, a miss disables that option and shows its
  // inline q.wrong[i] reason, a correct answer disables all + still earns XP.
  mc: {
    render(root, q, ctx){
      const order = shuffle(q.opts.map((_,i)=>i));
      root.innerHTML = '<div class="opts">'+
        order.map(i=>'<button class="opt" data-i="'+i+'">'+q.opts[i]+'</button>').join('')+'</div>';
      root.querySelectorAll('.opt').forEach(btn=>{
        btn.onclick=()=>{
          const i=+btn.dataset.i;
          if(i===q.a){
            root.querySelectorAll('.opt').forEach(x=>x.disabled=true);
            btn.classList.add('correct');
            ctx.correct(btn);
          } else {
            btn.classList.add('wrong'); btn.disabled=true;
            const why = (q.wrong && q.wrong[i]) ||
              'Not this one. Re-read what the question is actually asking, eliminate this option, and try again.';
            ctx.miss(btn, why, q.opts[i]);
          }
        };
      });
    },
  },
  // Numeric input — correct iff |value − answer| ≤ tol. A miss shows q.hint
  // (or a default nudge) and leaves the input live for another attempt.
  numeric: {
    render(root, q, ctx){
      const unit = q.unit ? ' <span class="num-unit">'+q.unit+'</span>' : '';
      root.innerHTML = '<div class="num-row"><input class="num-in" type="number" step="any" '+
        'inputmode="decimal" placeholder="your answer" aria-label="numeric answer">'+unit+
        '<button class="btn" id="numsub">Submit</button></div>';
      const input = root.querySelector('.num-in');
      const sub = root.querySelector('#numsub');
      function submit(){
        const raw = input.value.trim();
        const v = Number(raw);
        if(raw==='' || !Number.isFinite(v)){
          ctx.miss(sub, 'Enter a number first, then submit.');
          return;
        }
        if(Math.abs(v - q.answer) <= q.tol){
          input.disabled = true; sub.disabled = true;
          input.classList.add('correct');
          ctx.correct(sub);
        } else {
          input.classList.add('wrong');
          const hint = q.hint ||
            'Not within tolerance. Redo the computation carefully — watch signs and which value you are plugging in.';
          ctx.miss(sub, hint, raw);
        }
      }
      sub.onclick = submit;
      input.onkeydown = e => { if(e.key==='Enter') submit(); };
    },
  },
  // Derivation ordering — steps are authored in the CORRECT order and shown
  // shuffled. A robust ↑/↓ reorder UI (no fragile HTML5 drag). Correct iff the
  // current order matches the authored order exactly.
  order: {
    render(root, q, ctx){
      const n = q.steps.length;
      // shuffle indices into the authored `steps`; guarantee a non-identity
      // start so the learner always has something to arrange.
      let cur = shuffle(q.steps.map((_,i)=>i));
      if(n>1 && cur.every((v,i)=>v===i)){ [cur[0],cur[1]]=[cur[1],cur[0]]; }
      const list = document.createElement('div');
      list.className = 'order-list';
      function paint(){
        list.innerHTML = cur.map((si,pos)=>
          '<div class="order-item" data-pos="'+pos+'">'+
            '<span class="order-num">'+(pos+1)+'</span>'+
            '<span class="order-text">'+q.steps[si]+'</span>'+
            '<span class="order-ctrls">'+
              '<button class="order-btn" data-dir="up" data-pos="'+pos+'" '+(pos===0?'disabled':'')+' aria-label="Move up">▲</button>'+
              '<button class="order-btn" data-dir="down" data-pos="'+pos+'" '+(pos===n-1?'disabled':'')+' aria-label="Move down">▼</button>'+
            '</span></div>').join('');
        list.querySelectorAll('.order-btn').forEach(btn=>{
          btn.onclick = () => {
            const pos=+btn.dataset.pos, dir=btn.dataset.dir;
            const j = dir==='up' ? pos-1 : pos+1;
            if(j<0 || j>=n) return;
            [cur[pos],cur[j]]=[cur[j],cur[pos]];
            paint();
          };
        });
      }
      root.innerHTML = '';
      root.appendChild(list);
      paint();
      const bar = document.createElement('div');
      bar.className = 'btn-row'; bar.style.marginTop='14px';
      bar.innerHTML = '<button class="btn" id="ordsub">Check order →</button>';
      root.appendChild(bar);
      const sub = bar.querySelector('#ordsub');
      sub.onclick = () => {
        if(cur.every((si,pos)=>si===pos)){
          sub.disabled = true;
          list.querySelectorAll('.order-btn').forEach(x=>x.disabled=true);
          list.classList.add('correct');
          ctx.correct(sub);
        } else {
          ctx.miss(sub, 'Not the right order yet. Trace the derivation from what you are given to what you want — each line should follow from the one above.',
            cur.map(si=>q.steps[si]).join(' → '));
        }
      };
    },
  },
};
/* ---------- daily review: spaced-repetition queue (P0 #7) ----------
   Cross-world review drawn from the learner's weak areas — union of
   S.weak tags and the lowest-accuracy lessons from /api/stats. Pure,
   testable selection lives in buildReviewQueue(); the DOM flow (renderReview)
   reuses the same per-question rendering shape as the lesson quiz.

   Spacing: candidates are scored by (a) weak-tag presence, (b) low accuracy,
   and (c) staleness (how long since last reviewed, from S.reviewLog[id]).
   No full SM-2 — recency + accuracy ordering — but reviewLog leaves a clean
   seam for real intervals later. */
function todayStr(){ return new Date().toDateString(); }

// Score & rank COMPLETED lessons as review candidates, then draw one question
// each (favoring weak-tagged questions), interleaved across worlds. Pure over
// its inputs so it can be unit-tested with a seeded rng.
//   lessons  : the LESSONS array (only `done` ones are eligible)
//   state    : { done, weak, reviewLog } snapshot
//   stats    : [{lesson_id, accuracy, attempts}] from /api/stats, or null
//   opts     : { size, now, rng }  (now = ms epoch for staleness; rng ∈ [0,1))
function buildReviewQueue(lessons, state, stats, opts){
  opts = opts || {};
  const size = opts.size || 5;
  const now = opts.now || Date.now();
  const rng = opts.rng || Math.random;
  const weak = state.weak || {};
  const done = state.done || {};
  const log = state.reviewLog || {};
  const accById = {};
  for(const row of (stats || [])) accById[row.lesson_id] = row.accuracy;
  // eligible = completed lessons that carry at least one quiz question
  const eligible = lessons.filter(l => done[l.id] && Array.isArray(l.quiz) && l.quiz.length);
  const scored = eligible.map(l => {
    const weakTags = weak[l.id] && weak[l.id].length ? [...new Set(weak[l.id])] : [];
    // accuracy in [0,1]; unknown → treat as 1 (nothing to fix from stats)
    const acc = (l.id in accById) ? Math.max(0, Math.min(1, accById[l.id])) : 1;
    const lastMs = log[l.id] || 0;
    const daysSince = lastMs ? (now - lastMs) / 864e5 : 999; // never reviewed → very stale
    // priority: weak tags dominate, then low accuracy, then staleness, then a
    // small jitter so ties don't always pick the same lesson.
    const score = weakTags.length * 100 + (1 - acc) * 40 + Math.min(daysSince, 30) + rng() * 0.5;
    return { lesson: l, weakTags, acc, daysSince, score };
  }).sort((a, b) => b.score - a.score);
  // take the top `size` candidates, then pick one question per lesson
  const picked = scored.slice(0, size).map(c => {
    const l = c.lesson;
    // prefer a question whose tag is in the weak set; else any question
    let pool = l.quiz.map((_, i) => i);
    if(c.weakTags.length){
      const weakQ = pool.filter(i => c.weakTags.includes(metaOf(l, i).tag));
      if(weakQ.length) pool = weakQ;
    }
    const qi = pool[(rng() * pool.length) | 0];
    return { lessonId: l.id, world: l.world, qi, tag: metaOf(l, qi).tag };
  });
  return interleaveByWorld(picked, rng);
}

// interleaveByWorld is imported from ./practice/selection.js (PR 6) — the daily
// review queue and the practice policy share the one pure implementation.

function isUnlocked(lesson){
  if(S.unlocks?.unlockAll || S.unlocks?.unlocked?.[lesson.id]) return true;
  return isNaturallyUnlocked(lesson);
}
// Unlocked by the real prereq rule (first in world, or previous lesson done) —
// ignores any manual override. Used to tell a manual unlock apart for the 🔓 badge.
function isNaturallyUnlocked(lesson){
  const list = worldLessons(lesson.world);
  const i = list.indexOf(lesson);
  return i===0 || !!S.done[list[i-1].id];
}
// True when a lesson is reachable ONLY because of a manual unlock override
// (its prereqs aren't met) — surfaced as a 🔓 badge so it isn't confusing.
function isManualUnlock(lesson){
  return !!(S.unlocks?.unlockAll || S.unlocks?.unlocked?.[lesson.id]) && !isNaturallyUnlocked(lesson);
}
const WORLD_META = {
  pre:  {name:'🌱 World 0 — Foundations', desc:''},
  la:   {name:'🌌 World 1 — Linear Algebra', desc:''},
  calc: {name:'🌋 World 2 — Calculus', desc:''},
  prob: {name:'🎲 World 3 — Probability & Statistics', desc:''},
  ml:   {name:'🤖 World 4 — Machine Learning', desc:''},
};
const WORLD_ORDER = ['pre','la','calc','prob','ml'];

/* ---------- cumulative "qualifying exam" boss (per world) ----------
   Each world ends in a boss exam that unlocks once every lesson in the world
   is complete. It draws questions CUMULATIVELY from the world's own pool plus
   every PRIOR world's pool (per WORLD_ORDER), so later bosses re-test the whole
   journey so far. Passing (>= SCORING.exam.passPct) records a timestamp in
   S.exams and grants XP; on later visits a spaced retake nudge appears at
   ~1 day / 1 week / 1 month after the last pass.

   The pool-building and nudge logic are pure functions (no DOM, no globals
   beyond the injected lesson list) so they can be unit-tested directly. */

// All {lessonId, qi} question references reachable in `world` and every world
// before it in `order`. Pure: takes the lesson list + a worldLessons resolver.
// Skips lessons without a usable quiz so a malformed lesson can't poison a draw.
function examPoolFor(world, order, worldLessonsFn){
  const idx = order.indexOf(world);
  if(idx < 0) return [];
  const refs = [];
  for(let i=0;i<=idx;i++){
    for(const l of worldLessonsFn(order[i])){
      if(!Array.isArray(l.quiz)) continue;
      for(let qi=0; qi<l.quiz.length; qi++) refs.push({lessonId:l.id, qi});
    }
  }
  return refs;
}
// Draw `n` distinct question refs from the cumulative pool (shuffled). Thin,
// non-pure wrapper over examPoolFor (uses the module shuffle for randomness).
function drawExam(world, n){
  const pool = examPoolFor(world, WORLD_ORDER, worldLessons);
  return shuffle(pool.slice()).slice(0, Math.min(n, pool.length));
}
// Every lesson in the world complete? (Empty world => not exam-eligible.)
function isWorldComplete(world){
  const list = worldLessons(world);
  return list.length>0 && list.every(l=>!!S.done[l.id]);
}
// Spaced-retake nudge tiers, in ms. Pure: given the last pass timestamp and
// "now", returns the strongest due tier ({key,label,ms}) or null. A tier is
// "due" once `now` is at least that far past the pass; the largest elapsed tier
// wins so a month-old pass shows the monthly nudge, not the daily one.
const EXAM_NUDGES = [
  {key:'day',   label:'Reviewed a day ago — a quick retake locks it in',      ms: 24*60*60*1000},
  {key:'week',  label:'It has been a week — retake to keep this world sharp', ms: 7*24*60*60*1000},
  {key:'month', label:'A month on — retake the boss to prove it stuck',       ms: 30*24*60*60*1000},
];
function examNudge(passedAt, now){
  if(!passedAt) return null;
  const elapsed = now - passedAt;
  let due = null;
  for(const t of EXAM_NUDGES) if(elapsed >= t.ms) due = t;
  return due;
}

/* ---------- progress mutations (reachable from any learner's ⋮ menu) ----------
   All mutate S then persist via save() (localStorage + debounced server
   sync) and re-render the current route. */
function afterToolAction(){ save(); go(route.name, route.arg); }
// Drop any earned achievement whose test() no longer holds after a reset.
// This cleanly re-locks world-specific achievements (their test inspects
// that world's S.done) without needing to hard-code a world→achievement map.
function pruneAchievements(){
  for(const a of ACHIEVEMENTS){
    if(S.ach[a.id]){ let ok=false; try{ ok=a.test(); }catch(e){} if(!ok) delete S.ach[a.id]; }
  }
}
// Collapse/expand a world on the home map (persisted in S.collapsed so the
// preference survives reloads and syncs). Purely visual — never touches progress.
function toggleWorldCollapse(w){
  if(!S.collapsed) S.collapsed = {};
  if(S.collapsed[w]) delete S.collapsed[w]; else S.collapsed[w] = true;
  save(); if(route.name==='home') renderHome();
}
function toolUnlockAll(){ unlockStore().unlockAll = true; afterToolAction(); }
function toolUnlockLesson(id){ unlockStore().unlocked[id] = true; afterToolAction(); }
function resetLessonProgress(id){
  delete S.done[id]; delete S.missions[id]; delete S.firstTry[id];
  if(S.weak) delete S.weak[id];
  if(S.unlocks?.unlocked) delete S.unlocks.unlocked[id];
}
function toolResetLesson(id){
  if(!confirm('Reset all progress for this lesson? (XP is kept)')) return;
  resetLessonProgress(id); pruneAchievements(); afterToolAction();
}
function toolResetWorld(w){
  const list = worldLessons(w);
  if(!confirm('Reset ALL progress and achievements for '+(WORLD_META[w]?.name||w)+'? '+
    'This re-locks every lesson in the world. XP is kept.')) return;
  // Also drop the world-wide unlock override so the world re-locks.
  if(S.unlocks) S.unlocks.unlockAll = false;
  list.forEach(l=>resetLessonProgress(l.id));
  pruneAchievements();
  afterToolAction();
}

// Lightweight tools popover (vanilla DOM, mirrors .user-menu styling).
// items: [{label, danger?, run}]. Anchored under `btn`.
function openToolsMenu(btn, items){
  document.querySelectorAll('.tools-menu').forEach(m=>m.remove());
  const menu = document.createElement('div'); menu.className='user-menu tools-menu';
  menu.innerHTML = items.map((it,i)=>
    '<button class="um-item'+(it.danger?' um-out':'')+'" data-i="'+i+'">'+it.label+'</button>').join('');
  const close = ()=>{
    menu.remove();
    document.removeEventListener('pointerdown', onAway, true);
    window.removeEventListener('scroll', close, true);
    window.removeEventListener('resize', close);
  };
  const onAway = e=>{ if(!menu.contains(e.target) && e.target!==btn) close(); };
  menu.addEventListener('click', e=>{
    e.stopPropagation();
    const el = e.target.closest('[data-i]'); if(!el) return;
    close(); items[+el.dataset.i].run();
  });
  // Anchor as a fixed-position popover on <body>, right-aligned under the
  // button. Appending inside the card would clip it (.lcard overflow:hidden) —
  // which is why the menu previously appeared to "do nothing". Append first so
  // we can measure its width, then clamp within the viewport.
  menu.style.position = 'fixed';
  menu.style.visibility = 'hidden';
  document.body.appendChild(menu);
  const r = btn.getBoundingClientRect();
  const mw = menu.offsetWidth || 180;
  const left = Math.max(8, Math.min(r.right - mw, window.innerWidth - mw - 8));
  menu.style.left = left + 'px';
  menu.style.right = 'auto';
  menu.style.top = (r.bottom + 6) + 'px';
  menu.style.visibility = '';
  setTimeout(()=>{
    document.addEventListener('pointerdown', onAway, true);
    window.addEventListener('scroll', close, true); // fixed popover shouldn't drift
    window.addEventListener('resize', close);
  }, 0);
}
// Delegated handler for the ⋮ tool buttons rendered into home (avoids inline
// handlers so it plays nicely with the data-driven renderHome markup).
function onToolsClick(e){
  const collapseBtn = e.target.closest('.world-collapse');
  if(collapseBtn){ e.stopPropagation(); e.preventDefault(); toggleWorldCollapse(collapseBtn.dataset.cw); return; }
  const btn = e.target.closest('.tools-dots'); if(!btn) return;
  e.stopPropagation(); e.preventDefault();
  const world = btn.dataset.world, lesson = btn.dataset.lesson;
  if(world){
    openToolsMenu(btn, [
      {label:'🔓 Unlock all', run:toolUnlockAll},
      {label:'♻️ Reset world', danger:true, run:()=>toolResetWorld(world)},
    ]);
  } else if(lesson){
    openToolsMenu(btn, [
      {label:'🔓 Unlock lesson', run:()=>toolUnlockLesson(lesson)},
      {label:'♻️ Reset lesson', danger:true, run:()=>toolResetLesson(lesson)},
    ]);
  }
}

// Self-contained boss-exam card for a world's lessons grid. Kept isolated so
// concurrent renderHome edits (e.g. a daily-review section) merge cleanly.
function examCardHTML(world){
  const complete = isWorldComplete(world);
  const rec = (S.exams && S.exams[world]) || null;
  const passed = !!(rec && rec.passedAt);
  const nudge = passed ? examNudge(rec.passedAt, Date.now()) : null;
  const poolSize = examPoolFor(world, WORLD_ORDER, worldLessons).length;
  const draw = SCORING.exam.draw;
  const passPctLabel = Math.round(SCORING.exam.passPct*100);
  let statusTag, note;
  if(!complete){
    statusTag = '<span class="tag">LOCKED</span>';
    note = 'Finish every lesson in this world to unlock the qualifying exam.';
  } else if(passed){
    statusTag = '<span class="tag done">PASSED</span>' + (nudge?'<span class="tag weak">RETAKE</span>':'');
    note = nudge ? nudge.label
      : ('Boss cleared. '+draw+' cumulative questions from this world and every world before it.');
  } else {
    statusTag = '<span class="tag">READY</span><span class="tag xp">+'+SCORING.exam.pass+' XP</span>';
    note = draw+' questions drawn from this world and all prior worlds ('+poolSize+' in the pool). Pass at '+passPctLabel+'%+.';
  }
  const clickable = complete;
  return '<div class="lcard exam-card'+(clickable?'':' locked')+(passed?' done-card':'')+'" '+
    (clickable?('onclick="go(\'exam\',\''+world+'\')"'):'')+'>'+
    (passed?'<div class="check">🏆</div>':(complete?'':'<div class="lock">🔒</div>'))+
    '<div class="lemoji">🏆</div><h3>Qualifying Exam</h3>'+
    '<div class="lsub">'+note+'</div>'+
    '<div class="lmeta">'+statusTag+'</div></div>';
}
/* ---------- daily review surface (home map) ----------
   Self-contained section + flow so it merges cleanly alongside other
   renderHome additions. State markers on S:
     S.reviewDay   — toDateString() of the day the current queue was built
     S.reviewDone  — true once today's queue is finished
     S.reviewLog   — { lessonId: lastReviewedMs } (staleness seam for SM-2) */
let reviewQueue = null; // today's drawn queue, cached for the session

function currentReviewQueue(){
  const today = todayStr();
  // rebuild when the day rolls over (or first build)
  if(S.reviewDay !== today){
    S.reviewDay = today;
    S.reviewDone = false;
    reviewQueue = null;
    save();
  }
  if(!reviewQueue){
    reviewQueue = buildReviewQueue(LESSONS, S,
      statsCache, { size: SCORING.review.size });
  }
  return reviewQueue;
}

// Returns the review section HTML (empty string when there's nothing to review,
// e.g. no lessons completed yet). Kept localized so it slots into renderHome.
function reviewSectionHTML(){
  const q = currentReviewQueue();
  if(!q.length) return ''; // nothing completed yet → no review surface
  const done = !!S.reviewDone;
  const tags = [...new Set(q.map(x=>x.tag))].slice(0,4);
  const inner = done
    ? '<div class="review-done">✅ <b>Done for today.</b> You reviewed '+q.length+
      ' question'+(q.length>1?'s':'')+' across your weak spots. Come back tomorrow for a fresh set.</div>'
    : '<div class="review-body"><p>A quick '+q.length+'-question mixed-world set drawn from where you\'ve slipped'+
      (tags.length?': <b>'+tags.join('</b>, <b>')+'</b>':'')+'. Interleaved on purpose — that\'s what makes it stick.</p>'+
      '<button class="btn" id="start-review">Start daily review →</button></div>';
  return '<section class="world review-world"><div class="world-head">'+
    '<h2>🔁 Daily Review</h2>'+
    '<span class="wprog">'+(done?'complete':q.length+' questions')+'</span></div>'+
    '<div class="review-card'+(done?' done':'')+'">'+inner+'</div></section>';
}

// Wire the "Start daily review" button after renderHome writes the DOM.
function bindReviewSection(){
  const btn = document.getElementById('start-review');
  if(btn) btn.onclick = startReview;
}

// Review quiz flow — mirrors renderLesson's showQuiz per-question shape
// (option shuffle, wrong-answer feedback, XP on correct) but pulls questions
// cross-lesson from the daily queue instead of a single lesson's pool.
function startReview(){
  runCleanups();
  const queue = currentReviewQueue();
  if(!queue.length){ go('home'); return; }
  route = {name:'review'};
  syncHistory('home'); // review is a home overlay; URL stays at /
  let qn = 0;
  view.innerHTML =
    '<div class="lesson-top"><button class="backbtn" id="rvback">← Map</button>'+
    '<div class="lesson-title">🔁 Daily Review</div></div>'+
    '<div id="stepbody"><div class="panel" id="qpanel"></div></div>';
  document.getElementById('rvback').onclick = ()=>go('home');
  const qp = document.getElementById('qpanel');
  function renderRQ(){
    const item = queue[qn];
    const l = LESSONS.find(x=>x.id===item.lessonId);
    if(!l){ qn++; if(qn<queue.length) renderRQ(); else finishReview(); return; }
    const q = l.quiz[item.qi];
    const order = shuffle(q.opts.map((_,i)=>i));
    qp.innerHTML='<div class="quiz-prog">REVIEW '+(qn+1)+' / '+queue.length+
      ' · '+l.emoji+' '+l.title+'</div>'+
      '<div class="quiz-q">'+q.q+'</div><div class="opts">'+
      order.map(i=>'<button class="opt" data-i="'+i+'">'+q.opts[i]+'</button>').join('')+'</div><div id="ex"></div>';
    enhanceContent(qp);
    let tried=false;
    qp.querySelectorAll('.opt').forEach(btn=>{
      btn.onclick=()=>{
        const i=+btn.dataset.i;
        if(i===q.a){
          qp.querySelectorAll('.opt').forEach(x=>x.disabled=true);
          btn.classList.add('correct');
          const gain = tried ? SCORING.review.afterMiss : SCORING.review.correct;
          grantXP(gain, btn);
          // reviewing this lesson clears its weak flag for the reviewed tag and
          // stamps recency so it deprioritizes tomorrow (spacing seam).
          S.reviewLog = S.reviewLog || {};
          S.reviewLog[l.id] = Date.now();
          if(!tried && S.weak && S.weak[l.id]){
            S.weak[l.id] = S.weak[l.id].filter(t => t !== item.tag);
            if(!S.weak[l.id].length) delete S.weak[l.id];
          }
          save();
          logEvent({type:'quiz_answer', lessonId:l.id, questionIdx:item.qi, correct:true, firstTry:!tried, review:true,
            tag:tagSlugOf(q), qtype:q.type ?? 'mc', question_key:questionKeyOf(l.id, item.qi), context:'review'});
          qp.querySelector('#ex').innerHTML='<div class="explain">💡 '+q.why+'</div>'+
            '<div class="btn-row" style="margin-top:14px"><button class="btn" id="nq">'+
            (qn<queue.length-1?'Next question →':'Finish review 🏁')+'</button></div>';
          enhanceContent(qp.querySelector('#ex'));
          qp.querySelector('#nq').onclick=()=>{ qn++; if(qn<queue.length) renderRQ(); else finishReview(); };
        } else {
          tried=true; btn.classList.add('wrong'); btn.disabled=true;
          logEvent({type:'quiz_answer', lessonId:l.id, questionIdx:item.qi, correct:false, firstTry:false, review:true,
            tag:tagSlugOf(q), qtype:q.type ?? 'mc', chosen:q.opts[i], question_key:questionKeyOf(l.id, item.qi), context:'review'});
          const why = (q.wrong && q.wrong[i]) ||
            'Not this one. Re-read what the question is actually asking, eliminate this option, and try again.';
          const w = document.createElement('div'); w.className='wrongex';
          w.innerHTML = '❌ ' + why + ' <i style="color:#8b93b8">Try again — a correct answer still earns XP.</i>';
          btn.insertAdjacentElement('afterend', w);
          enhanceContent(w);
        }
      };
    });
  }
  function finishReview(){
    S.reviewDone = true; save();
    grantXP(SCORING.review.dailyBonus); confetti(120);
    checkAchievements();
    view.innerHTML =
      '<div class="lesson-top"><button class="backbtn" id="rvback2">← Map</button>'+
      '<div class="lesson-title">🔁 Daily Review</div></div>'+
      '<div id="stepbody"><div class="panel complete"><div class="big">🎉</div>'+
      '<h2>Review complete!</h2><div class="gain">+'+SCORING.review.dailyBonus+' XP daily-review bonus</div>'+
      '<div class="assess clean"><h3>✨ That\'s today\'s set</h3>'+
      '<div class="focus-tip">Spacing beats cramming — a fresh mixed set unlocks tomorrow.</div></div>'+
      '<div class="btn-row" style="justify-content:center;margin-top:18px">'+
      '<button class="btn" id="rvhome">Back to map</button></div></div></div>';
    document.getElementById('rvback2').onclick = ()=>go('home');
    document.getElementById('rvhome').onclick = ()=>go('home');
  }
  renderRQ();
}

/* ---------- practice surface: cross-curriculum weak-concept drill ----------
   The HEADLINE feature (KB plan §7/§9, PR 6). A SIBLING of the daily-review
   section: a home card whose "Start practice" fetches /api/practice — the
   server runs the pure selection policy over the learner's concept_accuracy +
   the live question bank and returns a mixed list of DESCRIPTORS. The engine
   resolves each descriptor to a real question and runs it through the EXISTING
   quiz flow (QUESTION_TYPES + the shared miss/correct ctx), logging every
   result through the existing quiz_answer event with context:'practice'. XP
   comes from SCORING.practice (never literals here — house rule).
     ref      → look up the static-pool question (LESSONS[lessonId].quiz[qi])
     template → generate(generator, seed) (deterministic, replayable)
     bank     → spec is already engine-schema; render directly */
// Resolve one §7 descriptor to a renderable question + its telemetry ids, or
// null if it can't be resolved (stale lesson id / unknown generator).
function resolvePracticeItem(d){
  if(!d || typeof d!=='object') return null;
  if(d.kind==='ref'){
    const l = LESSONS.find(x=>x.id===d.lessonId); if(!l) return null;
    const q = Array.isArray(l.quiz) ? l.quiz[d.qi] : null; if(!q) return null;
    return { q, key: questionKeyOf(l.id, d.qi), tag: tagSlugOf(q), qtype: q.type ?? 'mc',
             label: l.emoji+' '+l.title, evLessonId: l.id, evIdx: d.qi };
  }
  if(d.kind==='template'){
    let q; try{ q = generate(d.generator, d.seed); }catch(e){ return null; }
    if(!q) return null;
    return { q, key: q.key || ('gen:'+d.generator+':'+d.seed), tag: tagSlugOf(q), qtype: q.type ?? 'mc',
             label: '🎲 Generated drill', evLessonId: 'practice', evIdx: 0 };
  }
  if(d.kind==='bank'){
    const q = d.spec; if(!q || typeof q!=='object') return null;
    // bank tag may be a concept slug already (registered) — resolveTag handles
    // that; fall back to the descriptor's concept.
    return { q, key: 'bank:'+d.id, tag: tagSlugOf(q) || d.concept, qtype: q.type ?? 'mc',
             label: '🏦 Bank question', evLessonId: 'practice', evIdx: 0 };
  }
  return null;
}

// Home card (sibling of reviewSectionHTML). Empty until the learner has
// completed a lesson AND the server is reachable — practice is personalized
// from server-side concept_accuracy, so it's a no-op offline / on a fresh
// account (additive, exactly like the rest of the KB surface).
function practiceSectionHTML(){
  if(!API) return '';                          // needs server-side concept_accuracy
  if(!Object.keys(S.done).length) return '';   // nothing to personalize from yet
  return '<section class="world review-world"><div class="world-head">'+
    '<h2>🎯 Practice</h2>'+
    '<span class="wprog">weak-concept drill</span></div>'+
    '<div class="review-card"><div class="review-body">'+
    '<p>A personalized set targeting the concepts you\'ve slipped on <b>across the whole curriculum</b> — mixed with fresh generated and bank questions, interleaved by world.</p>'+
    '<button class="btn" id="start-practice">Start practice →</button></div></div></section>';
}
function bindPracticeSection(){
  const btn = document.getElementById('start-practice');
  if(btn) btn.onclick = startPractice;
}

// Practice quiz flow — fetches the descriptor list, then reuses the lesson
// quiz's per-question shape (QUESTION_TYPES dispatch + the shared ctx) so mc,
// numeric AND order bank/generated questions all render through one path.
async function startPractice(){
  runCleanups();
  route = {name:'practice'};
  syncHistory('home'); // practice is a home overlay; URL stays at /
  view.innerHTML =
    '<div class="lesson-top"><button class="backbtn" id="pback">← Map</button>'+
    '<div class="lesson-title">🎯 Practice</div></div>'+
    '<div id="stepbody"><div class="panel" id="qpanel"><div class="review-body"><p>Building your personalized set…</p></div></div></div>';
  document.getElementById('pback').onclick = ()=>go('home');

  let descriptors = [];
  try{
    const r = await fetch(API+'/practice');
    if(r.ok){ const d = await r.json(); descriptors = Array.isArray(d.practice) ? d.practice : []; }
  }catch(e){ /* offline / server error → empty set, handled below */ }
  if(route.name!=='practice') return; // learner navigated away during the fetch
  const qp = document.getElementById('qpanel'); if(!qp) return;

  const items = descriptors.map(resolvePracticeItem).filter(Boolean);
  if(!items.length){
    qp.innerHTML = '<div class="review-done">✨ <b>No weak spots to drill right now.</b> '+
      'Complete a few more lessons (and let a miss or two slip through) and your personalized '+
      'set will fill in. The daily review and lesson retakes keep you sharp in the meantime.</div>'+
      '<div class="btn-row" style="margin-top:14px"><button class="btn" id="phome">Back to map</button></div>';
    qp.querySelector('#phome').onclick=()=>go('home');
    return;
  }

  let qn=0;
  function renderPQ(){
    const item=items[qn], q=item.q;
    const type = QUESTION_TYPES[q.type ?? 'mc'] || QUESTION_TYPES.mc;
    qp.innerHTML='<div class="quiz-prog">PRACTICE '+(qn+1)+' / '+items.length+' · '+item.label+'</div>'+
      '<div class="quiz-q">'+q.q+'</div><div id="qbody"></div><div id="ex"></div>';
    // Scoring + events live HERE, once, for every question type — a type only
    // reports outcomes through ctx (identical contract to the lesson quiz).
    let tried=false;
    const ctx={
      miss(nearEl, why, chosen){
        tried=true;
        logEvent({type:'quiz_answer', lessonId:item.evLessonId, questionIdx:item.evIdx, correct:false, firstTry:false,
          tag:item.tag, qtype:item.qtype, chosen, question_key:item.key, context:'practice'});
        const w=document.createElement('div'); w.className='wrongex';
        w.innerHTML = '❌ ' + why + ' <i style="color:#8b93b8">Try again — a correct answer still earns XP.</i>';
        if(nearEl && nearEl.insertAdjacentElement) nearEl.insertAdjacentElement('afterend', w);
        else qp.querySelector('#ex').appendChild(w);
        enhanceContent(w);
      },
      correct(nearEl){
        grantXP(tried ? SCORING.practice.afterMiss : SCORING.practice.correct, nearEl);
        logEvent({type:'quiz_answer', lessonId:item.evLessonId, questionIdx:item.evIdx, correct:true, firstTry:!tried,
          tag:item.tag, qtype:item.qtype, question_key:item.key, context:'practice'});
        qp.querySelector('#ex').innerHTML='<div class="explain">💡 '+(q.why||'Correct.')+'</div>'+
          '<div class="btn-row" style="margin-top:14px"><button class="btn" id="nq">'+
          (qn<items.length-1?'Next question →':'Finish practice 🏁')+'</button></div>';
        enhanceContent(qp.querySelector('#ex'));
        qp.querySelector('#nq').onclick=()=>{ qn++; if(qn<items.length) renderPQ(); else finishPractice(); };
      },
    };
    type.render(qp.querySelector('#qbody'), q, ctx);
    enhanceContent(qp);
  }
  function finishPractice(){
    grantXP(SCORING.practice.dailyBonus); confetti(120); checkAchievements();
    view.innerHTML =
      '<div class="lesson-top"><button class="backbtn" id="pback2">← Map</button>'+
      '<div class="lesson-title">🎯 Practice</div></div>'+
      '<div id="stepbody"><div class="panel complete"><div class="big">🎉</div>'+
      '<h2>Practice complete!</h2><div class="gain">+'+SCORING.practice.dailyBonus+' XP practice bonus</div>'+
      '<div class="assess clean"><h3>✨ Weak spots drilled</h3>'+
      '<div class="focus-tip">Personalized from where you\'ve slipped across the whole curriculum. Come back anytime for a fresh set.</div></div>'+
      '<div class="btn-row" style="justify-content:center;margin-top:18px">'+
      '<button class="btn" id="phome2">Back to map</button></div></div></div>';
    document.getElementById('pback2').onclick=()=>go('home');
    document.getElementById('phome2').onclick=()=>go('home');
  }
  renderPQ();
}

function renderHome(){
  // No marketing hero on the authed home — the map goes straight to the worlds.
  // The descriptive hero lives on the signed-out landing page (see Minima.jsx).
  let h = '';
  // Daily spaced-repetition prompt at the top of the map (empty string until
  // the learner has completed a lesson, so it never shows on a fresh account).
  h += reviewSectionHTML();
  // Personalized practice surface (PR 6) — sibling of daily review. Empty on a
  // fresh account / offline; drills cross-curriculum weak concepts otherwise.
  h += practiceSectionHTML();
  for(const w of WORLD_ORDER){
    const list=worldLessons(w);
    if(!list.length) continue;
    const done=list.filter(l=>S.done[l.id]).length;
    const collapsed = !!(S.collapsed && S.collapsed[w]);
    h+='<section class="world'+(collapsed?' collapsed':'')+'"><div class="world-head">'+
       '<button class="world-collapse" data-cw="'+w+'" aria-expanded="'+(!collapsed)+'" '+
         'title="'+(collapsed?'Expand world':'Collapse world')+'" aria-label="'+(collapsed?'Expand world':'Collapse world')+'">'+(collapsed?'▸':'▾')+'</button>'+
       '<h2>'+WORLD_META[w].name+'</h2>'+
       '<span class="wprog">'+done+' / '+list.length+' complete</span>'+
       '<button class="tools-dots" data-world="'+w+'" title="World tools" aria-label="World tools">⋮</button>'+
       '</div>';
    if(collapsed){ h+='</section>'; continue; }
    h+='<div class="lessons-grid">';
    for(const l of list){
      const unlocked=isUnlocked(l), done_=!!S.done[l.id];
      // A status badge (✓ / 🔓 / 🔒) occupies the top-right corner only in some
      // states; when there's none, the ⋮ sits flush in the corner instead of
      // floating inset beside an absent badge.
      const hasBadge = done_ || isManualUnlock(l) || !unlocked;
      h+='<div class="lcard'+(unlocked?'':' locked')+(done_?' done-card':'')+'" '+
         (unlocked?('onclick="go(\'lesson\',\''+l.id+'\')"'):'')+'>'+
         '<button class="tools-dots tools-dots-card'+(hasBadge?'':' corner')+'" data-lesson="'+l.id+'" title="Lesson tools" aria-label="Lesson tools">⋮</button>'+
         (done_?'<div class="check">✓</div>'
            :(isManualUnlock(l)?'<div class="unlock-badge" title="Manually unlocked — prerequisites not yet complete">🔓</div>'
              :(unlocked?'':'<div class="lock">🔒</div>')))+
         '<div class="lemoji">'+l.emoji+'</div><h3>'+l.title+'</h3><div class="lsub">'+l.sub+'</div>'+
         '<div class="lmeta">'+(done_?'<span class="tag done">COMPLETE · RETAKE FOR XP</span>':'<span class="tag">'+(unlocked?'READY':'LOCKED')+'</span>')+
         (S.weak&&S.weak[l.id]&&S.weak[l.id].length?'<span class="tag weak">REVIEW</span>':'<span class="tag xp">~150 XP</span>')+'</div></div>';
    }
    h+=examCardHTML(w);
    h+='</div></section>';
  }
  // achievements
  h+='<section class="world"><div class="world-head"><h2>🏆 Achievements</h2>'+
     '<span class="wprog">'+Object.keys(S.ach).length+' / '+ACHIEVEMENTS.length+'</span></div><div class="ach-grid">';
  for(const a of ACHIEVEMENTS){
    h+='<div class="ach'+(S.ach[a.id]?'':' locked')+'"><div class="aico">'+a.ico+'</div>'+
       '<div><div class="aname">'+a.name+'</div><div class="adesc">'+a.desc+'</div></div></div>';
  }
  h+='</div></section>';
  view.innerHTML=h;
  bindReviewSection();
  bindPracticeSection();
}

/* ---------- lesson flow: Learn -> Lab(missions) -> Quiz -> Done ---------- */
function renderLesson(id){
  const l = LESSONS.find(x=>x.id===id); if(!l){go('home');return;}
  if(!isUnlocked(l)){ go('home'); return; }
  let step = 0; // 0 learn, 1 lab, 2 quiz, 3 done
  function shell(inner){
    view.innerHTML =
      '<div class="lesson-top"><button class="backbtn" onclick="go(\'home\')">← Map</button>'+
      '<div class="lesson-title">'+l.emoji+' '+l.title+'</div></div>'+
      '<div class="steps">'+[0,1,2,3].map(i=>'<div class="step-dot'+(i<step?' done':i===step?' active':'')+'"></div>').join('')+'</div>'+
      '<div id="stepbody"></div>';
    const b=document.getElementById('stepbody'); b.innerHTML=inner; enhanceContent(b); return b;
  }
  function showLearn(){
    runCleanups(); step=0;
    // expandable enrichment/remediation cards (lesson.deeper = [{title, body}])
    const weak = (S.weak&&S.weak[l.id])||[];
    const deeper = (l.deeper||[]).map((d,i)=>
      '<details class="deep"'+(weak.length&&i===0?' open':'')+'><summary>'+d.title+'</summary>'+
      '<div class="deep-body">'+d.body+'</div></details>').join('');
    const weakNote = weak.length
      ? '<div class="assess" style="margin-top:14px"><h3>🔍 From your last quiz</h3><div class="focus-tip">You missed: <b>'+
        [...new Set(weak)].join('</b>, <b>')+'</b>. The expandables below are a good place to start.</div></div>'
      : '';
    const b=shell('<div class="panel"><h2>📖 Learn</h2><div class="learn-body">'+l.learn+
      '<div class="mlnote"><div class="mltitle">🤖 WHY THIS MATTERS FOR AI</div>'+l.ml+'</div>'+
      weakNote + deeper + '</div></div>'+
      '<div class="btn-row">'+
      (S.done[l.id]?'<button class="btn ghost" id="rq">Retake quiz (fresh draw) →</button>':'')+
      '<button class="btn" id="next">Try it yourself →</button></div>');
    b.querySelector('#next').onclick=showLab;
    const rq=b.querySelector('#rq'); if(rq) rq.onclick=showQuiz;
  }
  // Lab step. A lesson may declare a single `interactive` (legacy) OR a
  // `labs` array of {key, title, intro, interactive} — a sequence of distinct
  // mini-labs the learner steps through before the quiz unlocks. Each lab has
  // its own missions, namespaced so progress doesn't collide across labs.
  function showLab(){
    runCleanups(); step=1;
    const labs = (l.labs && l.labs.length)
      ? l.labs
      : [{interactive:l.interactive}];
    let li = 0;
    function showOne(){
      runCleanups();
      const lab = labs[li], multi = labs.length>1, last = li===labs.length-1;
      const head = multi
        ? '<div class="lab-prog">LAB '+(li+1)+' / '+labs.length+(lab.title?' · '+lab.title:'')+
          '</div><div class="lab-dots">'+labs.map((_,i)=>
            '<span class="lab-dot'+(i<li?' done':i===li?' active':'')+'"></span>').join('')+'</div>'
        : '';
      const intro = lab.intro ? '<div class="lab-intro">'+lab.intro+'</div>' : '';
      const b=shell('<div class="panel"><h2>🧪 Lab — learn by doing</h2>'+head+intro+'<div id="stage"></div></div>'+
        '<div class="btn-row"><button class="btn ghost" id="back">← '+(li===0?'Re-read':'Previous lab')+'</button>'+
        '<button class="btn" id="next" disabled>Complete missions to continue</button></div>');
      const nextBtn=b.querySelector('#next');
      b.querySelector('#back').onclick = li===0 ? showLearn : ()=>{ li--; showOne(); };
      nextBtn.onclick = last ? showQuiz : ()=>{ li++; showOne(); };
      const stage=b.querySelector('#stage');
      const mkey = multi ? l.id+'::'+(lab.key||li) : l.id;
      // A lab may gate on missions, on a predict-then-verify commit, or both.
      // "next" only unlocks once every gate that was created is satisfied.
      let missionsDone=true, needPredict=false, predictDone=false, missionsGate=false;
      function unlock(){
        if(missionsGate && !missionsDone) return;
        if(needPredict && !predictDone) return;
        nextBtn.disabled=false;
        nextBtn.textContent = last ? 'Take the quiz →' : 'Next lab →';
        confetti(35);
      }
      const api={
        missions:(defs)=>{ missionsGate=true; missionsDone=false;
          return makeMissions(stage,mkey,defs,()=>{ missionsDone=true; unlock(); }); },
        // predict({prompt, choices?, input?, answer, tol?, unit?, reveal}) —
        // gates the lab's controls until a prediction is committed.
        predict:(def)=>{ needPredict=true;
          return makePredict(stage,mkey,def,()=>{ predictDone=true; unlock(); }); },
      };
      const fn = INTERACTIVES[lab.interactive];
      if(!fn){ stage.innerHTML='<div class="lab-intro">Missing interactive: '+lab.interactive+'</div>'; nextBtn.disabled=false; return; }
      const cleanup = fn(stage, api);
      if(cleanup) registerCleanup(cleanup);
    }
    showOne();
  }
  function showQuiz(){
    runCleanups(); step=2;
    const retake = !!S.done[l.id];
    // turnstile: draw 3 random questions from the pool; option order is
    // shuffled too, so retakes test understanding, not memorized positions
    const draw = l.quizDraw || SCORING.quizDraw;
    const n = Math.min(draw, l.quiz.length);
    // Each drawn slot is an ITEM: a static pool question ({gen:false}), or — on
    // a RETAKE only — a fresh seeded generator variant ({gen:true}) for a
    // concept this lesson teaches. First attempts are pure static pool.
    const items = shuffle(l.quiz.map((_,i)=>i)).slice(0, n).map(qi => ({ q:l.quiz[qi], qi, gen:false }));
    if(retake){
      const gens = generatorsForLesson(l);
      const k = gens.length ? templateSlotCount(n, SCORING.retakeTemplateShare) : 0;
      if(k > 0){
        S.genSeq = S.genSeq || {};
        const seq = (S.genSeq[l.id] = (S.genSeq[l.id] || 0) + 1);   // monotonic per lesson
        shuffle(items.map((_,i)=>i)).slice(0, k).forEach((slot, j) => {
          const g = gens[(seq + j) % gens.length];
          const seed = genSeed(l.id, seq, slot);
          items[slot] = { q: generate(g.id, seed), qi:-1, gen:true, generator:g.id, seed };
        });
      }
    }
    const results = [];
    let qn=0;
    const b=shell('<div class="panel" id="qpanel"></div>');
    const qp=b.querySelector('#qpanel');
    function renderQ(){
      const item=items[qn], q=item.q;
      // Telemetry content id (PR 2 × PR 5): generated variants carry their own
      // replayable 'gen:<id>:<seed>' key; static pool questions use lessonId:qi.
      const qkey = item.gen ? (item.q.key || ('gen:'+item.generator+':'+item.seed)) : questionKeyOf(l.id, item.qi);
      const type = QUESTION_TYPES[q.type ?? 'mc'] || QUESTION_TYPES.mc;
      qp.innerHTML='<div class="quiz-prog">QUESTION '+(qn+1)+' / '+items.length+
        (retake?' · RETAKE — fresh draw from a pool of '+l.quiz.length+(item.gen?' + a generated variant':''):'')+'</div>'+
        '<div class="quiz-q">'+q.q+'</div><div id="qbody"></div><div id="ex"></div>';
      // Scoring + events live HERE, once, for every question type. A type only
      // reports outcomes through ctx; it never touches SCORING or the event log.
      let tried=false;
      const ctx={
        miss(nearEl, why, chosen){
          tried=true;
          logEvent({type:'quiz_answer', lessonId:l.id, questionIdx:item.qi, correct:false, firstTry:false,
            tag:tagSlugOf(q), qtype:q.type ?? 'mc', chosen, question_key:qkey, context:'lesson'});
          const w = document.createElement('div'); w.className='wrongex';
          w.innerHTML = '❌ ' + why + ' <i style="color:#8b93b8">Try again — a correct answer still earns XP.</i>';
          if(nearEl && nearEl.insertAdjacentElement) nearEl.insertAdjacentElement('afterend', w);
          else qp.querySelector('#ex').appendChild(w);
          enhanceContent(w);
        },
        correct(nearEl){
          const sc = retake ? SCORING.retake : SCORING.quiz;
          const gain = tried ? sc.afterMiss : sc.first;
          grantXP(gain, nearEl);
          results.push({item, firstTry:!tried});
          logEvent({type:'quiz_answer', lessonId:l.id, questionIdx:item.qi, correct:true, firstTry:!tried,
            tag:tagSlugOf(q), qtype:q.type ?? 'mc', question_key:qkey, context:'lesson'});
          qp.querySelector('#ex').innerHTML='<div class="explain">💡 '+(q.why||'Correct.')+'</div>'+
            '<div class="btn-row" style="margin-top:14px"><button class="btn" id="nq">'+
            (qn<items.length-1?'Next question →':'Finish quiz 🏁')+'</button></div>';
          enhanceContent(qp.querySelector('#ex'));
          qp.querySelector('#nq').onclick=()=>{ qn++; if(qn<items.length) renderQ(); else finish(); };
        },
      };
      type.render(qp.querySelector('#qbody'), q, ctx);
      enhanceContent(qp);
    }
    function finish(){
      const firstComplete = !S.done[l.id];
      if(firstComplete) logEvent({type:'lesson_complete', lessonId:l.id});
      S.done[l.id]=true;
      const missed = results.filter(r=>!r.firstTry);
      if(!missed.length && !retake) S.firstTry[l.id]=true;
      // weak-area snapshot: concept tags missed this attempt (cleared by a
      // clean attempt). Drives the REVIEW chip + focus panel + learn note.
      // Generated items carry their own q.tag; static items fall back via the
      // lesson title (metaOf) when a question has no inline tag.
      S.weak = S.weak || {};
      if(missed.length) S.weak[l.id] = missed.map(r => r.item.q.tag || (r.item.qi>=0 ? metaOf(l, r.item.qi).tag : l.title));
      else delete S.weak[l.id];
      save();
      if(firstComplete) grantXP(SCORING.lessonBonus);
      checkAchievements(); confetti(missed.length?40:120);
      showDone(firstComplete, missed);
    }
    renderQ();
  }
  function showDone(firstComplete, missed){
    step=3;
    const li=levelInfo();
    const list=worldLessons(l.world), i=list.indexOf(l), next=list[i+1];
    missed = missed||[];
    // post-quiz assessment: name the concepts you stumbled on and say
    // exactly what to study before the next attempt
    let assess='';
    if(missed.length){
      const seen={};
      // meta rides on the item: generated variants carry their own tag/focus;
      // static items resolve through metaOf() (inline tag or lesson title).
      const metaOfResult = r => (r.item.qi>=0)
        ? metaOf(l, r.item.qi)
        : { tag: r.item.q.tag || l.title, focus: r.item.q.focus || ('Re-read the lesson "'+l.title+'" — especially its Go-deeper notes.') };
      assess='<div class="assess"><h3>🔍 Where to focus before a retake</h3>'+
        missed.map(r=>{ const m=metaOfResult(r);
          if(seen[m.tag]) return ''; seen[m.tag]=1;
          return '<div class="focus-item"><b>'+m.tag+'</b><div>'+m.focus+'</div></div>'; }).join('')+
        '<div class="focus-tip">Open the lesson\'s <b>Go deeper</b> notes (they auto-expand now), replay the lab, then retake — every attempt draws fresh questions from the pool.</div></div>';
    } else {
      assess='<div class="assess clean"><h3>✨ Clean run — every question first try</h3>'+
        '<div class="focus-tip">'+(l.quiz.length>3?'The pool holds '+l.quiz.length+' questions; retake later for a different draw to make it stick.':'Retake later to make it stick — option order reshuffles every time.')+'</div></div>';
    }
    const b=shell('<div class="panel complete"><div class="big">'+(missed.length?'💪':'🎉')+'</div><h2>'+l.title+' — '+(firstComplete?'complete!':'retake finished!')+'</h2>'+
      '<div class="gain">'+(firstComplete?'+'+SCORING.lessonBonus+' XP lesson bonus · ':'')+'Level '+li.n+' — '+li.title+'</div>'+
      assess+
      '<div class="btn-row" style="justify-content:center;margin-top:18px">'+
      (missed.length?'<button class="btn" id="rr">Review & retake →</button>':'')+
      (next&&!missed.length?'<button class="btn" id="nl">Next: '+next.emoji+' '+next.title+' →</button>':'')+
      '<button class="btn ghost" onclick="go(\'home\')">Back to map</button></div></div>');
    if(next&&!missed.length) b.querySelector('#nl').onclick=()=>go('lesson',next.id);
    const rr=b.querySelector('#rr'); if(rr) rr.onclick=showLearn;
  }
  showLearn();
}

/* ---------- cumulative qualifying-exam flow (boss) ----------
   Reuses the lesson quiz interaction (shuffled options, inline wrong-answer
   feedback, XP per correct answer) but scores the whole set against
   SCORING.exam.passPct and records a per-world pass timestamp for the spaced
   retake nudges. Questions come from drawExam() — this world's pool plus every
   prior world's. */
function renderExam(world){
  if(!isWorldComplete(world)){ go('home'); return; }
  runCleanups();
  const meta = WORLD_META[world] || {name:world};
  const already = !!(S.exams && S.exams[world] && S.exams[world].passedAt);
  const draw = SCORING.exam.draw;
  // Resolve each {lessonId, qi} ref to its live lesson + question object.
  const drawn = drawExam(world, draw)
    .map(r => ({ l: LESSONS.find(x=>x.id===r.lessonId), qi: r.qi }))
    .filter(x => x.l && x.l.quiz && x.l.quiz[x.qi]);
  const total = drawn.length;
  const need = Math.ceil(total * SCORING.exam.passPct);
  let qn=0, correct=0;
  function shell(inner){
    view.innerHTML =
      '<div class="lesson-top"><button class="backbtn" onclick="go(\'home\')">← Map</button>'+
      '<div class="lesson-title">🏆 '+meta.name+' — Qualifying Exam</div></div>'+
      '<div id="stepbody"></div>';
    const b=document.getElementById('stepbody'); b.innerHTML=inner; enhanceContent(b); return b;
  }
  if(!total){ shell('<div class="panel"><h2>No questions available yet</h2></div>'); return; }
  function intro(){
    const b=shell('<div class="panel"><div class="big">🏆</div><h2>'+meta.name+' — Qualifying Exam</h2>'+
      '<div class="learn-body"><p>This boss draws <b>'+total+' questions</b> cumulatively from this world '+
      'and every world before it. Score <b>'+need+' / '+total+'</b> ('+Math.round(SCORING.exam.passPct*100)+'%) to pass.</p>'+
      '<p>'+(already?'You have already passed — a clean retake keeps the world sharp and earns +'+SCORING.exam.retake+' XP.'
                    :'Pass to certify this world and earn +'+SCORING.exam.pass+' XP.')+'</p></div>'+
      '<div class="btn-row" style="justify-content:center"><button class="btn" id="start">Begin exam →</button></div></div>');
    b.querySelector('#start').onclick=run;
  }
  function run(){
    const b=shell('<div class="panel" id="qpanel"></div>');
    const qp=b.querySelector('#qpanel');
    function renderQ(){
      const {l, qi}=drawn[qn], q=l.quiz[qi];
      const order = shuffle(q.opts.map((_,i)=>i));
      qp.innerHTML='<div class="quiz-prog">QUESTION '+(qn+1)+' / '+total+' · SCORE '+correct+' / '+total+' · from '+l.title+'</div>'+
        '<div class="quiz-q">'+q.q+'</div><div class="opts">'+
        order.map(i=>'<button class="opt" data-i="'+i+'">'+q.opts[i]+'</button>').join('')+'</div><div id="ex"></div>';
      enhanceContent(qp);
      let tried=false;
      qp.querySelectorAll('.opt').forEach(btn=>{
        btn.onclick=()=>{
          const i=+btn.dataset.i;
          if(i===q.a){
            qp.querySelectorAll('.opt').forEach(x=>x.disabled=true);
            btn.classList.add('correct');
            // First-try correct counts toward the pass threshold; a correct
            // answer after a miss still earns a little XP but not a "point".
            if(!tried){ correct++; grantXP(already?SCORING.retake.first:SCORING.quiz.afterMiss, btn); }
            else grantXP(SCORING.retake.afterMiss, btn);
            logEvent({type:'quiz_answer', lessonId:l.id, questionIdx:qi, correct:true, firstTry:!tried,
              tag:tagSlugOf(q), qtype:q.type ?? 'mc', question_key:questionKeyOf(l.id, qi), context:'exam'});
            qp.querySelector('#ex').innerHTML='<div class="explain">💡 '+q.why+'</div>'+
              '<div class="btn-row" style="margin-top:14px"><button class="btn" id="nq">'+
              (qn<total-1?'Next question →':'Finish exam 🏁')+'</button></div>';
            enhanceContent(qp.querySelector('#ex'));
            qp.querySelector('#nq').onclick=()=>{ qn++; if(qn<total) renderQ(); else finish(); };
          } else {
            tried=true; btn.classList.add('wrong'); btn.disabled=true;
            logEvent({type:'quiz_answer', lessonId:l.id, questionIdx:qi, correct:false, firstTry:false,
              tag:tagSlugOf(q), qtype:q.type ?? 'mc', chosen:q.opts[i], question_key:questionKeyOf(l.id, qi), context:'exam'});
            const why = (q.wrong && q.wrong[i]) ||
              'Not this one. Re-read what the question is actually asking, eliminate this option, and try again.';
            const w = document.createElement('div'); w.className='wrongex';
            w.innerHTML = '❌ ' + why + ' <i style="color:#8b93b8">A first-try miss won\'t count toward passing — try again.</i>';
            btn.insertAdjacentElement('afterend', w);
            enhanceContent(w);
          }
        };
      });
    }
    renderQ();
  }
  function finish(){
    const passed = correct >= need;
    if(passed){
      S.exams = S.exams || {};
      const prev = S.exams[world] || {passes:0, best:0};
      const firstPass = !prev.passedAt;
      S.exams[world] = {
        passedAt: Date.now(),
        passes: (prev.passes||0) + 1,
        best: Math.max(prev.best||0, correct),
      };
      save();
      logEvent({type:'exam_pass', world, score:correct, total, firstPass});
      grantXP(firstPass ? SCORING.exam.pass : SCORING.exam.retake);
      checkAchievements(); confetti(140);
    } else {
      confetti(30);
    }
    const pct = Math.round(correct/total*100);
    const b=shell('<div class="panel complete"><div class="big">'+(passed?'🏆':'💪')+'</div>'+
      '<h2>'+meta.name+' — '+(passed?'passed!':'not yet')+'</h2>'+
      '<div class="gain">Score '+correct+' / '+total+' ('+pct+'%) · need '+Math.round(SCORING.exam.passPct*100)+'%</div>'+
      '<div class="assess'+(passed?' clean':'')+'"><h3>'+(passed?'✨ World certified':'🔍 Close the gaps')+'</h3>'+
      '<div class="focus-tip">'+(passed
        ? 'You just re-tested this world and everything before it. Come back later for a retake — a nudge will remind you.'
        : 'Replay the weaker lessons in this world (and earlier ones), then retake — every attempt draws fresh questions from the cumulative pool.')+'</div></div>'+
      '<div class="btn-row" style="justify-content:center;margin-top:18px">'+
      '<button class="btn" id="rt">'+(passed?'Retake':'Try again')+' →</button>'+
      '<button class="btn ghost" onclick="go(\'home\')">Back to map</button></div></div>');
    b.querySelector('#rt').onclick=()=>renderExam(world);
  }
  intro();
}

/* ---------- mount (idempotent; called from the React client component) ---------- */
let mounted = false;
export function mount(opts){
  if (mounted || typeof document === 'undefined') return; mounted = true;
  opts = opts || {};
  if (opts.storageKey) SAVE_KEY = opts.storageKey; // per-user local cache
  onSignOutCb = opts.onSignOut || null;
  onLinkIdentityCb = opts.onLinkIdentity || null;
  onRegisterPasskeyCb = opts.onRegisterPasskey || null;
  if (opts.userLabel) setUserPill(opts.userLabel, opts.userEmail);
  if (!CanvasRenderingContext2D.prototype.roundRect){
    CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){
      this.moveTo(x+r,y); this.arcTo(x+w,y,x+w,y+h,r); this.arcTo(x+w,y+h,x,y+h,r);
      this.arcTo(x,y+h,x,y,r); this.arcTo(x,y,x+w,y,r); this.closePath(); return this; };
  }
  fxc = document.getElementById('fx'); fxx = fxc.getContext('2d');
  fxc.width = innerWidth; fxc.height = innerHeight;
  view = document.getElementById('view');
  window.go = go; // inline onclick handlers in rendered HTML use this
  // ⋮ tool menus: capture-phase delegation so the click never reaches the
  // lesson card's onclick=go('lesson', …) navigation.
  view.addEventListener('click', onToolsClick, true);
  load(); touchStreak(); S._lvl = levelInfo().n; renderHUD();
  // Browser back/forward: re-navigate to the entry's state. Registered once
  // (mount is idempotent via `mounted`, plus the popstateBound belt-and-braces).
  if (typeof window !== 'undefined' && !popstateBound){
    popstateBound = true;
    window.addEventListener('popstate', e => {
      const st = e.state || {name:'home'};
      // Browser already moved the URL to match this entry; use replace so a
      // locked-lesson bounce to home corrects the URL without a new push.
      historyMode = 'replace';
      try { go(st.name, st.arg); } finally { historyMode = 'push'; }
    });
  }
  // Parse the initial URL so deep-links load the right screen (instead of
  // always going home). Replace mode seeds the entry with structured state.
  initialNav();
  initSync();
  window.addEventListener('resize', ()=>{ fxc.width = innerWidth; fxc.height = innerHeight; });
}

let popstateBound = false;
function initialNav(){
  let name = 'home', arg;
  if (typeof window !== 'undefined' && window.location){
    const path = window.location.pathname || '/';
    const m = path.match(/^\/lesson\/([^/]+)\/?$/);
    if (m){
      const id = decodeURIComponent(m[1]);
      if (LESSONS.find(l => l.id === id)){ name = 'lesson'; arg = id; }
    }
    const me = path.match(/^\/exam\/([^/]+)\/?$/);
    if (me){
      const w = decodeURIComponent(me[1]);
      if (WORLD_ORDER.includes(w)){ name = 'exam'; arg = w; }
    }
  }
  // Replace mode: seed the initial history entry with structured state and
  // correct the URL if a deep-linked lesson bounces home (locked/unknown).
  historyMode = 'replace';
  try { go(name, arg); } finally { historyMode = 'push'; }
}

export { go, S, levelInfo, makeLab, slider, chips, plane, clearBg, fmt2, registerCleanup };
export { gradePrediction };
export { LESSONS, INTERACTIVES, SCORING };
// Pure helpers for the cumulative qualifying exam (unit-tested directly).
export { examPoolFor, examNudge, EXAM_NUDGES, WORLD_ORDER, worldLessons };
export { makeMissions, buildReviewQueue, interleaveByWorld }; // pure selection logic (unit-tested)
