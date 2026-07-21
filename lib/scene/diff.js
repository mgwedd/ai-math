/* ================================================================
   Scene Kit — display-list diff. CONTRACT.md §4. Owner: kit-core.

   entities(p,t) is re-evaluated each render. diff(prev,next) matches by
   key and emits add/update/remove ops the backend applies. This is the
   seam between the pure world and the renderer — a backend implements
   these three ops per entity kind and knows nothing else.
   ================================================================ */

// Positional fallback key when an entity omits `key`. Stable only while the
// entity's ordinal-within-kind is stable — authors must set `key` on anything
// reorderable/addable/removable (CONTRACT.md §3).
function keyOf(e, kindCounts){
  if(e.key != null) return String(e.key);
  const n = kindCounts[e.kind] = (kindCounts[e.kind] || 0) + 1;
  return e.kind + '#' + (n - 1);
}

function indexByKey(list){
  const map = new Map();
  const counts = {};
  for(const e of list){
    const k = keyOf(e, counts);
    // Duplicate keys are an AUTHORING error, not a silent-drop: two entities at
    // the same key make one clobber the other in the display list (reviewer-
    // reproduced). Fail loudly with the offending key (VISUAL_FIRST §8).
    if(map.has(k))
      throw new Error('diff: duplicate entity key `' + k + '` — two entities resolved to the same key; give them distinct `key`s');
    map.set(k, e);
  }
  return map;
}

// Value equality for entity props. entities(p,t) rebuilds descriptors every
// frame, so value props (vecs {x,y}, number arrays, nested plain objects) are
// FRESH references with equal contents — Object.is would call them "changed"
// every frame and defeat dirty-flag diffing. So compare structurally by value.
// Function props (curve fn, label textFn) are fresh closures each eval and
// can't be value-compared -> treated as always-changed (those entities redraw
// each frame they're present; they're not the particle-field hot path).
function propEqual(a, b){
  if(Object.is(a, b)) return true;
  if(typeof a === 'function' || typeof b === 'function') return false;
  if(a && b && typeof a === 'object' && typeof b === 'object'){
    const aArr = Array.isArray(a), bArr = Array.isArray(b);
    if(aArr || bArr){
      if(!aArr || !bArr || a.length !== b.length) return false;
      for(let i = 0; i < a.length; i++) if(!propEqual(a[i], b[i])) return false;
      return true;
    }
    const ka = Object.keys(a), kb = Object.keys(b);
    if(ka.length !== kb.length) return false;
    for(const k of ka) if(!propEqual(a[k], b[k])) return false;
    return true;
  }
  return false;
}

// Which own-prop names differ between two entity descriptors by VALUE
// (`key`/`kind` excluded). Used to build op.changed.
function changedProps(a, b){
  const out = [];
  const seen = new Set();
  for(const k in a){ if(k === 'key' || k === 'kind') continue; seen.add(k);
    if(!propEqual(a[k], b[k])) out.push(k); }
  for(const k in b){ if(k === 'key' || k === 'kind' || seen.has(k)) continue;
    if(!propEqual(a[k], b[k])) out.push(k); }
  return out;
}

/**
 * @param {Array} prev previous entity list (or [] on first mount)
 * @param {Array} next current entity list
 * @returns {Array<{type:'add'|'update'|'remove', key:string, entity?:Object, changed?:string[]}>}
 *   Unchanged entities emit no op. A kind change at the same key emits
 *   remove+add (a display object cannot morph across kinds).
 */
export function diff(prev, next){
  const before = indexByKey(prev || []);
  const after = indexByKey(next || []);
  const ops = [];
  for(const [key, e] of after){
    const p = before.get(key);
    if(!p){ ops.push({ type: 'add', key, entity: e }); continue; }
    if(p.kind !== e.kind){
      ops.push({ type: 'remove', key });
      ops.push({ type: 'add', key, entity: e });
      continue;
    }
    const changed = changedProps(p, e);
    if(changed.length) ops.push({ type: 'update', key, entity: e, changed });
  }
  for(const key of before.keys()){
    if(!after.has(key)) ops.push({ type: 'remove', key });
  }
  return ops;
}
