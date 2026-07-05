/* ================================================================
   GRADIENT ASCENT — game engine (DOM/canvas, framework-free)
   Mounted into the page by components/GradientAscent.jsx.
   Curriculum is pure data registered into ./curriculum/registry.js
   by ./curriculum/index.js — see the schema documented there.
   ================================================================ */
import { LESSONS, INTERACTIVES, SCORING, LEVELS } from './curriculum/registry.js';

/* ================================================================
   GRADIENT ASCENT — gamified linear algebra + calculus
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

   Interactive schema — INTERACTIVES[key] = function(stage, api) {
     stage: DOM node to render into (use lab/canvas helpers below)
     api.missions([{text, xp, check:(s)=>bool}]) -> {update(s), allDone()}
        Call update(state) whenever state changes; missions complete
        once, award XP, and gate the "Continue" button.
     api.onDone(fn)  -> notified when all missions complete
     return optional cleanup function (cancel animation frames etc).
   }
   ================================================================ */

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
  return m;
}
// identity is handled by Supabase Auth (see components/GradientAscent.jsx);
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
      (onSignOutCb
        ? '<button class="um-item um-out" data-act="out">🚪 Sign out</button>'
        : '<div class="um-item um-dim">🔧 dev session — no sign-out</div>');
    menu.addEventListener('click', ev=>{
      const act = ev.target.closest('[data-act]')?.dataset.act; if(!act) return;
      close();
      if(act==='ach'){ go('home'); document.querySelector('.ach-grid')?.scrollIntoView({behavior:'smooth', block:'center'}); }
      else if(act==='lb') showLeaderboard();
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
  let doneCount = defs.reduce((n,_,i)=>n+(saved[i]?1:0),0);
  const api = {
    el: box,
    update(state){
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
  route={name,arg};
  syncHistory(name, arg);
  if(name==='home') renderHome(); else if(name==='lesson') renderLesson(arg); }

// Browser-history sync (deep-linkable URLs + back/forward). This is the DOM
// History API — unrelated to the pushState() progress-sync function above.
// historyMode controls how a navigation touches the history stack:
//   'push'    — normal user navigation, adds an entry (default)
//   'replace' — initial load / back-forward, swaps the current entry in place
let historyMode = 'push';
function syncHistory(name, arg){
  if (typeof window === 'undefined' || !window.history || !window.location) return;
  const url = name==='home' ? '/' : name==='lesson' ? ('/lesson/'+encodeURIComponent(arg)) : '/';
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
// per-question concept metadata: inline q.tag / q.focus, else sensible defaults
function metaOf(l, qi){
  const q=l.quiz[qi];
  return { tag: q.tag || l.title,
           focus: q.focus || ('Re-read the lesson "'+l.title+'" — especially its Go-deeper notes.') };
}
function isUnlocked(lesson){
  const list = worldLessons(lesson.world);
  const i = list.indexOf(lesson);
  return i===0 || !!S.done[list[i-1].id];
}
const WORLD_META = {
  pre:  {name:'🌱 World 0 — Foundations', desc:''},
  la:   {name:'🌌 World 1 — Linear Algebra', desc:''},
  calc: {name:'🌋 World 2 — Calculus', desc:''},
  prob: {name:'🎲 World 3 — Probability & Statistics', desc:''},
  ml:   {name:'🤖 World 4 — Machine Learning', desc:''},
};
const WORLD_ORDER = ['pre','la','calc','prob','ml'];
function renderHome(){
  let h = '<div class="hero"><h1>Become the engineer who <span>speaks math</span></h1>'+
    '<p>An interactive journey through the math that powers AI. Complete missions to earn XP and ascend to AI mastery.</p></div>';
  for(const w of WORLD_ORDER){
    const list=worldLessons(w);
    if(!list.length) continue;
    const done=list.filter(l=>S.done[l.id]).length;
    h+='<section class="world"><div class="world-head"><h2>'+WORLD_META[w].name+'</h2>'+
       '<span class="wprog">'+done+' / '+list.length+' complete</span></div><div class="lessons-grid">';
    for(const l of list){
      const unlocked=isUnlocked(l), done_=!!S.done[l.id];
      h+='<div class="lcard'+(unlocked?'':' locked')+(done_?' done-card':'')+'" '+
         (unlocked?('onclick="go(\'lesson\',\''+l.id+'\')"'):'')+'>'+
         (done_?'<div class="check">✓</div>':(unlocked?'':'<div class="lock">🔒</div>'))+
         '<div class="lemoji">'+l.emoji+'</div><h3>'+l.title+'</h3><div class="lsub">'+l.sub+'</div>'+
         '<div class="lmeta">'+(done_?'<span class="tag done">COMPLETE · RETAKE FOR XP</span>':'<span class="tag">'+(unlocked?'READY':'LOCKED')+'</span>')+
         (S.weak&&S.weak[l.id]&&S.weak[l.id].length?'<span class="tag weak">REVIEW</span>':'<span class="tag xp">~150 XP</span>')+'</div></div>';
    }
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
    const b=document.getElementById('stepbody'); b.innerHTML=inner; return b;
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
      const api={
        missions:(defs)=>makeMissions(stage,mkey,defs,()=>{
          nextBtn.disabled=false;
          nextBtn.textContent = last ? 'Take the quiz →' : 'Next lab →';
          confetti(35);
        }),
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
    const drawn = shuffle(l.quiz.map((_,i)=>i)).slice(0, Math.min(draw, l.quiz.length));
    const results = [];
    let qn=0;
    const b=shell('<div class="panel" id="qpanel"></div>');
    const qp=b.querySelector('#qpanel');
    function renderQ(){
      const qi=drawn[qn], q=l.quiz[qi];
      const order = shuffle(q.opts.map((_,i)=>i));
      qp.innerHTML='<div class="quiz-prog">QUESTION '+(qn+1)+' / '+drawn.length+
        (retake?' · RETAKE — fresh draw from a pool of '+l.quiz.length:'')+'</div>'+
        '<div class="quiz-q">'+q.q+'</div><div class="opts">'+
        order.map(i=>'<button class="opt" data-i="'+i+'">'+q.opts[i]+'</button>').join('')+'</div><div id="ex"></div>';
      let tried=false;
      qp.querySelectorAll('.opt').forEach(btn=>{
        btn.onclick=()=>{
          const i=+btn.dataset.i;
          if(i===q.a){
            qp.querySelectorAll('.opt').forEach(x=>x.disabled=true);
            btn.classList.add('correct');
            const sc = retake ? SCORING.retake : SCORING.quiz;
            const gain = tried ? sc.afterMiss : sc.first;
            grantXP(gain, btn);
            results.push({qi, firstTry:!tried});
            logEvent({type:'quiz_answer', lessonId:l.id, questionIdx:qi, correct:true, firstTry:!tried});
            qp.querySelector('#ex').innerHTML='<div class="explain">💡 '+q.why+'</div>'+
              '<div class="btn-row" style="margin-top:14px"><button class="btn" id="nq">'+
              (qn<drawn.length-1?'Next question →':'Finish quiz 🏁')+'</button></div>';
            qp.querySelector('#nq').onclick=()=>{ qn++; if(qn<drawn.length) renderQ(); else finish(); };
          } else {
            tried=true; btn.classList.add('wrong'); btn.disabled=true;
            logEvent({type:'quiz_answer', lessonId:l.id, questionIdx:qi, correct:false, firstTry:false});
            const why = (q.wrong && q.wrong[i]) ||
              'Not this one. Re-read what the question is actually asking, eliminate this option, and try again.';
            const w = document.createElement('div'); w.className='wrongex';
            w.innerHTML = '❌ ' + why + ' <i style="color:#8b93b8">Try again — a correct answer still earns XP.</i>';
            btn.insertAdjacentElement('afterend', w);
          }
        };
      });
    }
    function finish(){
      const firstComplete = !S.done[l.id];
      if(firstComplete) logEvent({type:'lesson_complete', lessonId:l.id});
      S.done[l.id]=true;
      const missed = results.filter(r=>!r.firstTry);
      if(!missed.length && !retake) S.firstTry[l.id]=true;
      // weak-area snapshot: concept tags missed this attempt (cleared by a
      // clean attempt). Drives the REVIEW chip + focus panel + learn note.
      S.weak = S.weak || {};
      if(missed.length) S.weak[l.id] = missed.map(r=>metaOf(l, r.qi).tag);
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
      assess='<div class="assess"><h3>🔍 Where to focus before a retake</h3>'+
        missed.map(r=>{ const m=metaOf(l, r.qi);
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

/* ---------- mount (idempotent; called from the React client component) ---------- */
let mounted = false;
export function mount(opts){
  if (mounted || typeof document === 'undefined') return; mounted = true;
  opts = opts || {};
  if (opts.storageKey) SAVE_KEY = opts.storageKey; // per-user local cache
  onSignOutCb = opts.onSignOut || null;
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
  }
  // Replace mode: seed the initial history entry with structured state and
  // correct the URL if a deep-linked lesson bounces home (locked/unknown).
  historyMode = 'replace';
  try { go(name, arg); } finally { historyMode = 'push'; }
}

export { go, S, levelInfo, makeLab, slider, chips, plane, clearBg, fmt2, registerCleanup };
export { LESSONS, INTERACTIVES, SCORING };
