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
import './la-vecops.js';
import './la-matrix.js';
import './la-matmul.js';
import './la-det.js';
import './la-eigen.js';
import './la-vectors.js';
import './rl-mdp.js';
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
 * per-scene). Every lesson that has scenes must have EXACTLY ONE capstone,
 * AND — CONTRACT §7.1 — that capstone must be the LAST scene in arc order
 * (registration order, mirrored by scenesForLesson). A mid-sequence capstone
 * completes the lesson early and silently strands every scene after it; the
 * earlier version of this check validated the COUNT but not the POSITION,
 * so that authoring mistake could still ship undetected (review-confirmed
 * defect). Returns a list of human-readable problems ([] = clean).
 */
export function validateSceneLessons() {
  const problems = [];
  for (const lesson of lessonsWithScenes()) {
    const scenes = scenesForLesson(lesson);
    const caps = scenes.filter((s) => s.capstone === true);
    if (caps.length === 0) problems.push('lesson "' + lesson + '" has scenes but no capstone (capstone is the exam)');
    if (caps.length > 1) problems.push('lesson "' + lesson + '" has ' + caps.length + ' capstones (expected exactly 1)');
    if (caps.length === 1) {
      const lastIdx = scenes.length - 1;
      const capIdx = scenes.findIndex((s) => s.capstone === true);
      if (capIdx !== lastIdx)
        problems.push('lesson "' + lesson + '": capstone scene "' + scenes[capIdx].id + '" must be the LAST scene (found at index ' + capIdx + ' of ' + lastIdx + ') — scenes after the capstone are unreachable');
    }
    // CONTRACT v1.3 §4 (mirrors validateCurriculum): a capstone must declare
    // >= 1 goal — makeGoals([]) is vacuously all-done at construction, so an
    // empty-goals capstone would instantly complete the lesson. Non-capstone
    // scenes may have zero goals (decorative).
    for (const c of caps) {
      if (!Array.isArray(c.goals) || c.goals.length === 0)
        problems.push('lesson "' + lesson + '": capstone scene "' + c.id + '" declares no goals — an empty-goals capstone is vacuously complete and would instantly finish the lesson (CONTRACT v1.3 §4)');
    }
  }
  return problems;
}
