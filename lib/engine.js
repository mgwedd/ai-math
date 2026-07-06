/* ================================================================
   MINIMA — game engine (DOM/canvas, framework-free)
   Mounted into the page by components/Minima.jsx.
   Curriculum is pure data registered into ./curriculum/registry.js
   by ./curriculum/index.js — see the schema documented there.
   ================================================================ */
import { LESSONS, INTERACTIVES, SCORING, LEVELS } from './curriculum/registry.js';

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

// Interleave so consecutive items favor different worlds (spacing/interleaving
// is a known retention win). Greedy: repeatedly emit from the world that isn't
// the previous one and has the most remaining.
function interleaveByWorld(items, rng){
  rng = rng || Math.random;
  const byWorld = {};
  for(const it of items){ (byWorld[it.world] ||= []).push(it); }
  const out = [];
  let prev = null;
  const remaining = () => Object.keys(byWorld).filter(w => byWorld[w].length);
  while(out.length < items.length){
    let worlds = remaining();
    const others = worlds.filter(w => w !== prev);
    const pickFrom = others.length ? others : worlds;
    // among candidate worlds, prefer the one with the most items left (with jitter)
    pickFrom.sort((a, b) => byWorld[b].length - byWorld[a].length || (rng() - 0.5));
    const w = pickFrom[0];
    out.push(byWorld[w].shift());
    prev = w;
  }
  return out;
}

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
          logEvent({type:'quiz_answer', lessonId:l.id, questionIdx:item.qi, correct:true, firstTry:!tried, review:true});
          qp.querySelector('#ex').innerHTML='<div class="explain">💡 '+q.why+'</div>'+
            '<div class="btn-row" style="margin-top:14px"><button class="btn" id="nq">'+
            (qn<queue.length-1?'Next question →':'Finish review 🏁')+'</button></div>';
          qp.querySelector('#nq').onclick=()=>{ qn++; if(qn<queue.length) renderRQ(); else finishReview(); };
        } else {
          tried=true; btn.classList.add('wrong'); btn.disabled=true;
          logEvent({type:'quiz_answer', lessonId:l.id, questionIdx:item.qi, correct:false, firstTry:false, review:true});
          const why = (q.wrong && q.wrong[i]) ||
            'Not this one. Re-read what the question is actually asking, eliminate this option, and try again.';
          const w = document.createElement('div'); w.className='wrongex';
          w.innerHTML = '❌ ' + why + ' <i style="color:#8b93b8">Try again — a correct answer still earns XP.</i>';
          btn.insertAdjacentElement('afterend', w);
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

function renderHome(){
  // No marketing hero on the authed home — the map goes straight to the worlds.
  // The descriptive hero lives on the signed-out landing page (see Minima.jsx).
  let h = '';
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
  }
  // Replace mode: seed the initial history entry with structured state and
  // correct the URL if a deep-linked lesson bounces home (locked/unknown).
  historyMode = 'replace';
  try { go(name, arg); } finally { historyMode = 'push'; }
}

export { go, S, levelInfo, makeLab, slider, chips, plane, clearBg, fmt2, registerCleanup };
export { gradePrediction };
export { LESSONS, INTERACTIVES, SCORING };
export { makeMissions, buildReviewQueue, interleaveByWorld }; // pure selection logic (unit-tested)
