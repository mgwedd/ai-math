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
