/* Curriculum registries. Lesson modules push/assign into these;
   the engine renders whatever is registered. To remove a lesson,
   delete its block in index.js — saved progress is keyed by lesson
   id, so other lessons are unaffected. */
export const LESSONS = [];
export const INTERACTIVES = {};
// Per-question concept metadata (used in the post-quiz weak-area assessment and
// the REVIEW chip) rides INLINE on each question as q.tag / q.focus:
//   tag:   short concept label ("magnitude", "chain rule direction")
//   focus: one actionable sentence — what to study before retaking
// Both are optional; metaOf() in the engine falls back to the lesson title.

// All scoring/economy knobs live here — the engine contains no XP numbers.
// Lessons may override quizDraw via lesson.quizDraw.
export const SCORING = {
  quiz:        { first: 25, afterMiss: 10 },   // first take of a lesson
  retake:      { first: 10, afterMiss: 5 },    // any later attempt
  lessonBonus: 50,                             // first completion only
  achievementXP: 50,
  quizDraw: 3,                                 // questions drawn per attempt
  // Per-world cumulative "qualifying exam" (boss). Draws `draw` questions
  // spread across the world's pool AND all prior worlds' pools; passing at
  // >= passPct grants `pass` XP (once), retakes grant `retake` XP.
  exam:        { draw: 8, passPct: 0.8, pass: 200, retake: 40 },
};

// Level curve. Sized so "AI Researcher" ≈ one clean pass of the full
// curriculum (quizzes + missions + bonuses + most achievements, ~6050 XP
// after World 1 depth added ~550) — finishing sloppily means retaking
// quizzes to mastery to summit.
export const LEVELS = [
  {xp:0,    t:'Math Novice'},
  {xp:150,  t:'Function Fledgling'},
  {xp:400,  t:'Vector Cadet'},
  {xp:750,  t:'Matrix Apprentice'},
  {xp:1200, t:'Transformation Tamer'},
  {xp:1700, t:'Derivative Detective'},
  {xp:2300, t:'Gradient Climber'},
  {xp:2950, t:'Eigen Hunter'},
  {xp:3650, t:'Calculus Conjurer'},
  {xp:4500, t:'Probability Prophet'},
  {xp:5250, t:'Tensor Wrangler'},
  {xp:6000, t:'AI Researcher 🎓'},
];

/* ================================================================
   registerLesson / validateCurriculum — the single validated door
   into the LESSONS registry (architecture ladder, step 1).

   Lesson modules call registerLesson({...}) instead of LESSONS.push().
   Benefits over a bare push:
   - STRUCTURAL VALIDATION at registration: catches a malformed lesson
     (bad quiz shape, answer index out of range, no interactive/labs)
     the moment it loads, with the lesson id in the message — instead of
     a silent failure when that lesson later tries to render.
   - IDEMPOTENT BY ID: re-registering an id REPLACES it in place rather
     than appending a duplicate. This makes hot-reload safe (a re-run
     module no longer duplicates or shuffles lessons).
   Cross-file references (does `interactive` resolve? do the feedback
   tables line up with the quiz pool?) can only be checked once every
   module has loaded, so they live in validateCurriculum(), which
   index.js calls after its dynamic-import chain resolves.
   ================================================================ */

function lessonShapeProblems(l){
  const p = [];
  if(!l || typeof l !== 'object') return ['lesson is not an object'];
  if(!l.id || typeof l.id !== 'string') p.push('missing/invalid id');
  if(!l.world) p.push('missing world');
  if(!l.title) p.push('missing title');
  const hasLabs = Array.isArray(l.labs) && l.labs.length > 0;
  if(!l.interactive && !hasLabs) p.push('needs an `interactive` key or a non-empty `labs` array');
  if(l.labs !== undefined && !Array.isArray(l.labs)) p.push('`labs` must be an array');
  if(hasLabs) l.labs.forEach((lab,i)=>{
    if(!lab || typeof lab.interactive !== 'string') p.push('labs['+i+'] missing string `interactive`');
  });
  if(!Array.isArray(l.quiz) || l.quiz.length === 0) p.push('`quiz` must be a non-empty array');
  else l.quiz.forEach((q,qi)=>{
    if(!Array.isArray(q.opts) || q.opts.length < 2) p.push('quiz['+qi+'] needs an `opts` array of length ≥ 2');
    else if(!Number.isInteger(q.a) || q.a < 0 || q.a >= q.opts.length)
      p.push('quiz['+qi+'] answer index a='+JSON.stringify(q.a)+' is out of range for '+q.opts.length+' options');
  });
  return p;
}

export function registerLesson(lesson){
  const problems = lessonShapeProblems(lesson);
  if(problems.length){
    const id = (lesson && lesson.id) || '(unknown id)';
    console.error('[curriculum] lesson "'+id+'" failed validation:\n  · '+problems.join('\n  · '));
  }
  // idempotent by id: replace in place so hot-reload can't duplicate lessons
  const i = LESSONS.findIndex(l => l.id === lesson.id);
  if(i >= 0) LESSONS[i] = lesson; else LESSONS.push(lesson);
  return lesson;
}

// Cross-reference checks — run once, after every curriculum module has loaded.
export function validateCurriculum(){
  const errs = [];
  const seen = new Set();
  for(const l of LESSONS){
    if(seen.has(l.id)) errs.push('duplicate lesson id "'+l.id+'"');
    seen.add(l.id);
    // every interactive/labs key must resolve to a registered function
    const keys = (l.labs && l.labs.length) ? l.labs.map(x => x && x.interactive) : [l.interactive];
    for(const k of keys){
      if(k && typeof INTERACTIVES[k] !== 'function')
        errs.push('"'+l.id+'": interactive "'+k+'" is not registered in INTERACTIVES');
    }
    // inline wrong-answer feedback: every key must be a valid wrong-option index.
    // (Feedback lives ON the question now — no index-parallel table to misalign.)
    (Array.isArray(l.quiz) ? l.quiz : []).forEach((q,qi)=>{
      if(!q || !q.wrong) return;
      if(typeof q.wrong !== 'object' || Array.isArray(q.wrong))
        errs.push('"'+l.id+'": quiz['+qi+'].wrong must be an {optionIndex: reason} object');
      else for(const oi of Object.keys(q.wrong)){
        if(!Number.isInteger(+oi) || +oi < 0 || +oi >= q.opts.length)
          errs.push('"'+l.id+'": quiz['+qi+'].wrong references option '+oi+', out of range');
        else if(+oi === q.a)
          errs.push('"'+l.id+'": quiz['+qi+'].wrong explains option '+oi+', which is the CORRECT answer');
      }
    });
  }
  if(errs.length)
    console.error('[curriculum] validateCurriculum found '+errs.length+' issue(s):\n  · '+errs.join('\n  · '));
  else
    console.info('[curriculum] '+LESSONS.length+' lessons registered — validation clean.');
  return errs;
}
