/* ================================================================
   Scene Kit — space factory registry. CONTRACT.md §6. Owner: kit-core.

   createSpace(name, opts) lets a scene name its space by string; 'axes3'
   (three.js) slots in here later without touching call sites.
   ================================================================ */

import { createPlane2 } from './plane2.js';

const FACTORIES = {
  plane2: createPlane2,
  // free:  DOM block — no rendered space (scene runs in a DOM container).
  // axes3: reserved (three.js, CONTRACT §9) — added in a later phase.
};

/**
 * @param {'plane2'|'free'} name
 * @param {Object} [opts]
 * @returns space (CONTRACT §6) or null for 'free' (DOM-only scene).
 */
export function createSpace(name, opts){
  if(name === 'free') return null;
  const f = FACTORIES[name];
  if(!f) throw new Error('createSpace: unknown space `' + name + '`');
  return f(opts);
}
