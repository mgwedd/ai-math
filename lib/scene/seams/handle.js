/* ================================================================
   Scene Kit — handle SEAM. CONTRACT.md §7.

   A handle is declared as an entity option; kit-core owns the SHAPE and
   its validation. The wiring RUNTIME (pointer capture, nearest-pick,
   keyboard nudging, mapping pointer -> param via space.toWorld and
   params[bind].set) lives in interaction.js (INTERACTION principal).

   Frozen shape:
     handle: <paramName>
           | { bind:<paramName>, constrain?, snap?, keyStep? }
   Note vs VISUAL_FIRST §4: the sketch's `handle:true` is frozen as the
   explicit `handle:'a'` form so entities stay pure/headless (no
   param-name magic to infer).
   ================================================================ */

import { HANDLE_KINDS } from '../entities.js';

/** Sugar for the verbose form. handle('a', {snap:.5}) -> {bind:'a', snap:.5}. */
export function handle(bind, opts){ return Object.assign({ bind }, opts || {}); }

/** Normalize an entity's `handle` option (string sugar -> descriptor) or null. */
export function normalize(h){
  if(h == null) return null;
  if(typeof h === 'string') return { bind: h };
  if(typeof h === 'object' && typeof h.bind === 'string') return { ...h };
  return null; // malformed
}

/**
 * Structural validity of an entity's handle, given its kind. Returns problem
 * strings ([] = ok). Used by validateScenes.
 * @param {string} kind entity kind
 * @param {*} h the entity's raw `handle` option
 */
export function handleProblems(kind, h){
  if(h == null) return [];
  const norm = normalize(h);
  if(!norm) return ['handle must be a param name or {bind, ...}'];
  if(!HANDLE_KINDS[kind]) return ['entity kind `' + kind + '` does not accept a handle'];
  return [];
}
