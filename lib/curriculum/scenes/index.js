/* ================================================================
   Scene curriculum — flagship-owned lesson<->scene resolution.
   ----------------------------------------------------------------
   CONTRACT §1: "Flagship owns the lesson<->scene-list resolution +
   capstone-present rule." The kit's validateScenes() checks per-scene
   shape + headless eval; THIS module owns the lesson-level rules
   (every lesson with scenes resolves in order and has exactly one
   capstone — the exam that gates completion, VISUAL_FIRST §2).

   Import this to register every scene module (the import chain mirrors
   curriculum/index.js's). During P0 only la-dot is converted.
   ================================================================ */
import { SCENES } from '../../scene/index.js';

import './la-dot.js';
// future scene modules append here as worlds convert (P1+).

/** Scenes belonging to a lesson, in registration order. */
export const scenesForLesson = (lessonId) => SCENES.filter((s) => s.lesson === lessonId);

/** The single capstone scene for a lesson (or undefined). */
export const capstoneFor = (lessonId) =>
  scenesForLesson(lessonId).find((s) => s.capstone === true);

/** Lesson ids that have at least one scene. */
export const lessonsWithScenes = () => [...new Set(SCENES.map((s) => s.lesson))];

/**
 * Lesson-level cross-checks (peer of the kit's validateScenes, which is
 * per-scene). Every lesson that has scenes must have EXACTLY ONE capstone.
 * Returns a list of human-readable problems ([] = clean).
 */
export function validateSceneLessons() {
  const problems = [];
  for (const lesson of lessonsWithScenes()) {
    const scenes = scenesForLesson(lesson);
    const caps = scenes.filter((s) => s.capstone === true);
    if (caps.length === 0) problems.push('lesson "' + lesson + '" has scenes but no capstone (capstone is the exam)');
    if (caps.length > 1) problems.push('lesson "' + lesson + '" has ' + caps.length + ' capstones (expected exactly 1)');
  }
  return problems;
}
