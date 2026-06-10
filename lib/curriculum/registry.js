/* Curriculum registries. Lesson modules push/assign into these;
   the engine renders whatever is registered. To remove a lesson,
   delete its block in index.js — saved progress is keyed by lesson
   id, so other lessons are unaffected. */
export const LESSONS = [];
export const INTERACTIVES = {};
export const WRONG_WHY = {};
// QMETA[lessonId][questionIdx] = {tag, focus}
//   tag:   short concept label ("magnitude", "chain rule direction") used in
//          the post-quiz weak-area assessment and the REVIEW chip
//   focus: one actionable sentence — what to study before retaking
// Questions may instead carry inline q.tag / q.focus (takes precedence).
export const QMETA = {};

// All scoring/economy knobs live here — the engine contains no XP numbers.
// Lessons may override quizDraw via lesson.quizDraw.
export const SCORING = {
  quiz:        { first: 25, afterMiss: 10 },   // first take of a lesson
  retake:      { first: 10, afterMiss: 5 },    // any later attempt
  lessonBonus: 50,                             // first completion only
  achievementXP: 50,
  quizDraw: 3,                                 // questions drawn per attempt
};

// Level curve. Sized so "AI Researcher" ≈ one clean pass of the full
// curriculum (quizzes + missions + bonuses + most achievements, ~4400 XP)
// — finishing sloppily means retaking quizzes to mastery to summit.
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
  {xp:4400, t:'AI Researcher 🎓'},
];
