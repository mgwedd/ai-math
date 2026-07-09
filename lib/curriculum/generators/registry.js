/* ================================================================
   PARAMETERIZED QUESTION GENERATORS — the zero-cost novelty backbone
   (Knowledge-Base plan §7 + PR 5).

   A generator is a correct-by-construction template:

     registerGenerator({ id, concept, qtype, make })
       id      — stable slug, used in the replayable question key
                 'gen:<id>:<seed>'
       concept — kebab-case concept slug (taxonomy naming; a later PR owns
                 the concept registry, so we DON'T import it — just keep the
                 strings consistent, e.g. 'dot-product', 'determinant')
       qtype   — 'mc' | 'numeric' | 'order' (matches QUESTION_TYPES)
       make    — (seed:int) -> a full question object in the EXACT engine
                 question schema. Must be a PURE function of the seed:
                 identical seed -> byte-identical question, so the server can
                 log and replay any generated item by its key.

   Determinism comes from a seeded PRNG (mulberry32) — never Math.random()
   inside make(). The engine layer supplies the varying seed; make() only
   ever sees a fixed integer.
   ================================================================ */

export const GENERATORS = new Map();

export function registerGenerator(def){
  if(!def || typeof def !== 'object') throw new Error('registerGenerator needs a definition object');
  const { id, concept, qtype, make } = def;
  if(!id || typeof id !== 'string') throw new Error('generator needs a string id');
  if(!concept || typeof concept !== 'string') throw new Error('generator "'+id+'" needs a concept slug');
  if(typeof make !== 'function') throw new Error('generator "'+id+'" needs a make(seed) function');
  GENERATORS.set(id, { id, concept, qtype: qtype || 'mc', make });
  return GENERATORS.get(id);
}

export function getGenerator(id){ return GENERATORS.get(id); }

// generate(id, seed) -> question object, tagged with its replayable key.
// Coerces the seed to a uint32 so the PRNG is stable regardless of how the
// caller derived it.
export function generate(id, seed){
  const g = GENERATORS.get(id);
  if(!g) throw new Error('unknown generator "'+id+'"');
  const s = seed >>> 0;
  const q = g.make(s);
  // stamp the replayable content id (KB plan §4.1 question_key). Non-enumerable
  // in spirit but plain here so it round-trips through JSON/logging.
  q.key = 'gen:' + id + ':' + s;
  return q;
}

/* ---------- seeded PRNG (mulberry32) ---------- */
// Small, fast, well-distributed 32-bit PRNG. Deterministic: same seed ->
// same stream. Returns a function producing floats in [0, 1).
export function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convenience wrapper around a seeded stream with the draws generators need.
export function makeRng(seed){
  const next = mulberry32(seed);
  const api = {
    next,
    // inclusive integer in [lo, hi]
    int(lo, hi){ return lo + Math.floor(next() * (hi - lo + 1)); },
    // inclusive integer in [lo, hi] excluding 0
    nonzero(lo, hi){ let v; do { v = api.int(lo, hi); } while(v === 0); return v; },
    pick(arr){ return arr[Math.floor(next() * arr.length)]; },
    sign(){ return next() < 0.5 ? -1 : 1; },
    bool(){ return next() < 0.5; },
    // Fisher–Yates over a copy, using this stream (deterministic).
    shuffle(arr){ const a = arr.slice();
      for(let i=a.length-1;i>0;i--){ const j=Math.floor(next()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
      return a; },
  };
  return api;
}

/* ---------- question builders (produce validator-clean shapes) ---------- */

// Multiple-choice. Pass the correct answer text plus distractor objects
// {text, why}. Options are shuffled deterministically with the generator's own
// rng; the returned question has a correct index `a` and a complete `wrong`
// map keyed by the FINAL option indices (never the correct one).
//   r           : a makeRng() instance (drives the option shuffle)
//   q           : question HTML
//   correct     : correct option text
//   distractors : [{text, why}] — one plausible mistake each
//   why, tag, focus : per the engine schema
export function mc(r, { q, correct, distractors, why, tag, focus }){
  const marked = [{ text: String(correct), why: null, ok: true },
                  ...distractors.map(d => ({ text: String(d.text), why: d.why, ok: false }))];
  const order = r.shuffle(marked);
  const a = order.findIndex(o => o.ok);
  const wrong = {};
  order.forEach((o, i) => { if(!o.ok) wrong[i] = o.why; });
  return { type: 'mc', q, opts: order.map(o => o.text), a, wrong, why, tag, focus };
}

export function numeric({ q, answer, tol, unit, hint, why, tag, focus }){
  const out = { type: 'numeric', q, answer, tol, why, tag, focus };
  if(unit != null) out.unit = unit;
  if(hint != null) out.hint = hint;
  return out;
}

export function order({ q, steps, why, tag, focus }){
  return { type: 'order', q, steps, why, tag, focus };
}

/* ---------- small formatting helpers ---------- */
// signed term for readable expressions: 3 -> "+ 3", -3 -> "− 3"
export function signed(n){ return (n < 0 ? '− ' : '+ ') + Math.abs(n); }
// a linear factor "ax + b" with tidy signs, e.g. "3x − 2"
export function linear(a, b){
  const bx = b === 0 ? '' : ' ' + signed(b);
  return a + 'x' + bx;
}
// round to `d` decimals, returned as a Number (drops trailing zeros)
export function round(x, d = 4){ const p = Math.pow(10, d); return Math.round(x * p) / p; }
