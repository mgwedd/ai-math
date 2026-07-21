/* ================================================================
   Scene Kit — public surface. CONTRACT.md. Owner: kit-core.

   The one file scene authors (human or agent) import from. Renderer-
   agnostic: nothing here reaches for pixi/three. See CONTRACT.md for the
   frozen v1 API; docs/VISUAL_FIRST.md §4 for intent.
   ================================================================ */

// Registration + validation (mirrors curriculum registerLesson/validate).
export { SCENES, registerScene, validateScenes } from './registry.js';

// Params (reactive atoms + one-way flow).
export { param, vec, toAtoms, view, snapshot, makeRng } from './params.js';

// Entity constructors (PURE descriptors) + capability tables.
export {
  grid, vector, point, segment, curve, area, polygon,
  label, angleArc, dropLine, cellGrid, bars,
  KINDS, HANDLE_KINDS,
} from './entities.js';

// Goal / handle seams (descriptor shapes; runtime owned by interaction).
export { goal, episode, visited } from './seams/goals.js';
export { handle } from './seams/handle.js';

// Runtime: mount a scene end-to-end (space + backend + driver + params).
export { mountScene } from './scene.js';

// Lower-level pieces peers build against (motion: driver; tests: diff/backend).
export { createFrameDriver } from './driver.js';
export { diff } from './diff.js';
export { createSpace } from './space/index.js';
export { createNullBackend } from './renderer/backend.js';

// Renderer factory under its CONTRACT §6 name (`createRenderer`); dynamic-imports
// pixi on first CALL, so re-exporting the name here pulls no pixi into the graph.
export { createRenderer } from './renderer/pixi.js';
