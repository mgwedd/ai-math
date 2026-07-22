/* ================================================================
   Scene Kit — params: reactive atoms + one-way flow.
   CONTRACT.md §2. Owner: kit-core.

   Flow is one-way: input -> params -> entities -> draw. A param write
   (atom.set) is the ONLY thing that marks a scene dirty. Values are
   treated as immutable — always set a new value, never mutate in place.
   ================================================================ */

/**
 * A 2D vector param value. GUARANTEE: returns a PLAIN object literal {x,y} —
 * never a class instance (quality's purity gate rejects non-plain prototypes).
 * @returns {{x:number,y:number}}
 */
export function vec(x, y){ return { x: +x, y: +y }; }

/**
 * Seedable PRNG (mulberry32) for deterministic capstone param rerolls.
 * @param {number} [seed] omit for a time-seeded (non-deterministic) stream.
 * @returns {() => number} rng() -> float in [0,1)
 */
export function makeRng(seed){
  // An EXPLICIT seed (including 0) is honored as-is — mulberry32 tolerates a 0
  // state and produces a distinct stream. Only the time-seed path (seed omitted)
  // falls back to a nonzero constant, and only if Date.now() masks to 0.
  let a = (seed == null ? (Date.now() >>> 0) : (seed >>> 0));
  if(seed == null && a === 0) a = 0x9e3779b9;
  return function(){
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isVec(v){ return v && typeof v === 'object' && typeof v.x === 'number' && typeof v.y === 'number'; }

// Equality: Object.is on scalars, shallow x/y on vecs. Setting an equal value
// is a no-op (no notify, no frame). Keeps the dirty flag honest.
function same(a, b){
  if(isVec(a) && isVec(b)) return Object.is(a.x, b.x) && Object.is(a.y, b.y);
  return Object.is(a, b);
}

/**
 * A reactive atom. @see CONTRACT.md §2.
 * @template T
 * @param {T} initial
 * @returns {{get():T, set(v:T):void, update(fn:(v:T)=>T):void,
 *            subscribe(fn:(v:T)=>void):()=>void, peek():T}}
 */
export function param(initial){
  let value = initial;
  const subs = new Set();
  const atom = {
    get(){ return value; },
    peek(){ return value; },              // === get in v1 (no dep tracking yet)
    set(v){
      if(same(value, v)) return;          // no-op on equal write
      value = v;
      subs.forEach(fn => { try{ fn(value); }catch(e){} });
    },
    update(fn){ atom.set(fn(value)); },
    subscribe(fn){ subs.add(fn); return () => subs.delete(fn); },
  };
  // Test-only introspection (non-enumerable, underscore-prefixed — not part of
  // the frozen §2 atom surface; mirrors the null backend's `_objects`). Lets
  // leak tests assert that mount teardown unsubscribed every listener.
  Object.defineProperty(atom, '_subCount', { value: () => subs.size });
  return atom;
}

// True when x looks like an atom produced by param() (duck-typed so a scene
// spec may hand us either atoms or plain values in its `params:` object).
function isAtom(x){ return x && typeof x === 'object' && typeof x.get === 'function' && typeof x.subscribe === 'function'; }

/**
 * Wrap a scene spec's `params:` object (name -> atom | plain value) into a
 * uniform map of atoms. Plain values (incl. vecs) are lifted via param().
 * @param {Object} specParams
 * @returns {Object<string, ReturnType<typeof param>>}
 */
export function toAtoms(specParams){
  const out = {};
  for(const k in specParams){
    const v = specParams[k];
    out[k] = isAtom(v) ? v : param(v);
  }
  return out;
}

/**
 * A read-only VIEW over an atom map: `p.a` yields the current raw value.
 * Passed to entities(p,t). Never write through it — writes go via atoms.
 * @param {Object<string, ReturnType<typeof param>>} atoms
 */
export function view(atoms){
  const v = {};
  for(const k in atoms){
    Object.defineProperty(v, k, { get: () => atoms[k].get(), enumerable: true });
  }
  return v;
}

/**
 * Plain snapshot {name: rawValue} of an atom map — the `s` argument to goal
 * predicates. @see CONTRACT.md §7.
 */
export function snapshot(atoms){
  const s = {};
  for(const k in atoms) s[k] = atoms[k].get();
  return s;
}
