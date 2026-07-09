/* Parameterized-generator fuzz suite (Vitest) — KB plan §7 / PR 5.

   For EVERY registered generator, over 200 seeds:
     · the output passes the SHARED question validator (the same
       questionProblems() the curriculum registry validates authored
       questions with);
     · generation is DETERMINISTIC (same seed → identical question);
     · every `mc` carries a COMPLETE wrong-answer map (a reason for every
       non-correct option, and never a key on the correct index).

   For each numeric/computable generator we INDEPENDENTLY recompute the answer
   from the operands parsed out of the rendered question — a different code
   path from the generator's own arithmetic — and assert it matches within the
   question's own `tol`. This is the correctness gate: a wrong formula in a
   generator fails here regardless of how self-consistent it is. */
import { describe, it, expect } from 'vitest';
import { GENERATORS, generate } from '../lib/curriculum/generators/index.js';
import { questionProblems } from '../lib/curriculum/registry.js';

const SEEDS = Array.from({ length: 200 }, (_, i) => i * 2654435761 >>> 0);

// ---- parsing helpers (independent recompute reads the QUESTION text) ----
// normalize the display glyphs the generators use back to ASCII operators
const norm = (s) => s.replace(/−/g, '-').replace(/·/g, '*').replace(/÷/g, '/').replace(/×/g, 'x');
// all signed integers/decimals in order of appearance
const nums = (s) => (norm(s).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
const mat2 = (a, b, c, d) => '<code>[[' + a + ', ' + b + '], [' + c + ', ' + d + ']]</code>';

// Independent verifiers keyed by generator id. Each returns nothing but
// asserts; absent id → only the structural + determinism checks apply.
const VERIFY = {
  det2x2(q){
    const [a, b, c, d] = nums(q.q);
    expect(Number(q.opts[q.a])).toBe(a * d - b * c);
  },
  inv2x2(q){
    const [a, b, c, d] = nums(q.q);           // first four numbers are the matrix
    expect(a * d - b * c).not.toBe(0);         // must be invertible for the framing
    expect(q.opts[q.a]).toBe(mat2(d, -b, -c, a));
  },
  dot2d(q){
    const [u1, u2, v1, v2] = nums(q.q);
    expect(Math.abs(q.answer - (u1 * v1 + u2 * v2))).toBeLessThanOrEqual(q.tol);
  },
  'dot-angle-sign'(q){
    const [u1, u2, v1, v2, shown] = nums(q.q);
    const dot = u1 * v1 + u2 * v2;
    expect(dot).toBe(shown);                   // the stem's stated dot product is right
    const label = dot > 0 ? 'Acute — less than 90°' : dot < 0 ? 'Obtuse — more than 90°' : 'Right — exactly 90°';
    expect(q.opts[q.a]).toBe(label);
  },
  'matmul-shape'(q){
    const [m, n, p, k] = nums(q.q);            // A is m×n, B is p×k
    const label = (n === p) ? ('Defined — the result is ' + m + '×' + k)
                            : 'Not defined — the inner dimensions disagree';
    expect(q.opts[q.a]).toBe(label);
  },
  'power-rule'(q){
    const s = norm(q.q);
    const a = Number(s.match(/=\s*(-?\d+)\s*\*x\^/)[1]);
    const n = Number(s.match(/\*x\^(\d+)/)[1]);
    const bm = s.match(/\^\d+\s*([+-])\s*(\d+)\s*\*x(?!\^)/);
    const b = (bm[1] === '-' ? -1 : 1) * Number(bm[2]);
    const c = nums(q.q).pop();                          // the f′(·) argument is the last number
    const expected = a * n * Math.pow(c, n - 1) + b;   // f'(x)=a·n·x^(n-1)+b
    expect(Math.abs(q.answer - expected)).toBeLessThanOrEqual(q.tol);
  },
  'chain-rule'(q){
    const s = norm(q.q);
    const m = s.match(/\(\s*(-?\d+)\s*\*x\s*([+-])\s*(\d+)\s*\)\^(\d+)/);
    const a = Number(m[1]);
    const b = (m[2] === '-' ? -1 : 1) * Number(m[3]);
    const n = Number(m[4]);
    const c = nums(q.q).pop();                             // the f′(·) argument is the last number
    const expected = n * Math.pow(a * c + b, n - 1) * a;  // f'(x)=n·(ax+b)^(n-1)·a
    expect(Math.abs(q.answer - expected)).toBeLessThanOrEqual(q.tol);
  },
  'bayes-posterior'(q){
    const [prior, sens, fpr] = (q.q.match(/(-?\d+(?:\.\d+)?)%/g) || []).map(p => parseFloat(p) / 100);
    const joint = sens * prior;
    const expected = joint / (joint + fpr * (1 - prior));
    expect(Math.abs(q.answer - expected)).toBeLessThanOrEqual(q.tol);
  },
  'expectation-discrete'(q){
    const re = /value\s+<b>(\d+)<\/b>\s+with probability\s+(\d+)\/(\d+)/g;
    let m, sum = 0, W = 0;
    while ((m = re.exec(q.q))) { sum += Number(m[1]) * Number(m[2]); W = Number(m[3]); }
    expect(Math.abs(q.answer - sum / W)).toBeLessThanOrEqual(q.tol);
  },
  'log-law'(q){
    const s = norm(q.q);
    const p = Number(s.match(/log_b\(x\)\s*=\s*(-?\d+)/)[1]);
    const qq = Number(s.match(/log_b\(y\)\s*=\s*(-?\d+)/)[1]);
    const expr = s.match(/evaluate <code>log_b\(([^)]*)\)/)[1];
    const mm = expr.match(/x\^(-?\d+)/); const nn = expr.match(/y\^(-?\d+)/);
    const m = mm ? Number(mm[1]) : 1;
    const n = nn ? Number(nn[1]) : 1;
    expect(Math.abs(q.answer - (m * p + n * qq))).toBeLessThanOrEqual(q.tol);
  },
  'exponent-law'(q){
    const s = norm(q.q);
    const m = s.match(/(\d+)\^(-?\d+)\s*\*\s*(\d+)\^(-?\d+)\s*\/\s*(\d+)\^(-?\d+)/);
    const [, , me, , ne, , ke] = m;
    expect(q.answer).toBe(Number(me) + Number(ne) - Number(ke));
  },
};

describe('parameterized generators', () => {
  it('registers the launch set across worlds', () => {
    // 11 launch generators (LA×5, calc×2, prob×2, foundations×2)
    expect(GENERATORS.size).toBeGreaterThanOrEqual(10);
  });

  for (const [id, g] of GENERATORS) {
    describe(`generator: ${id} (${g.concept} / ${g.qtype})`, () => {
      it('every seed yields a validator-clean question', () => {
        const bad = [];
        for (const seed of SEEDS) {
          const q = generate(id, seed);
          const problems = questionProblems(q);
          if (problems.length) bad.push(`seed ${seed}: ${problems.join('; ')}`);
          if ((q.type ?? 'mc') !== g.qtype) bad.push(`seed ${seed}: type ${q.type} != declared ${g.qtype}`);
        }
        expect(bad).toEqual([]);
      });

      it('is deterministic (same seed → identical question)', () => {
        for (const seed of SEEDS.slice(0, 40)) {
          expect(generate(id, seed)).toEqual(generate(id, seed));
        }
      });

      if (g.qtype === 'mc') {
        it('every mc has a complete wrong map (all non-correct options, none on the answer)', () => {
          for (const seed of SEEDS) {
            const q = generate(id, seed);
            expect(q.opts.length).toBeGreaterThanOrEqual(2);
            expect(q.a).toBeGreaterThanOrEqual(0);
            expect(q.a).toBeLessThan(q.opts.length);
            const expected = q.opts.map((_, i) => i).filter(i => i !== q.a);
            const got = Object.keys(q.wrong).map(Number).sort((x, y) => x - y);
            expect(got).toEqual(expected);
            expect(Object.keys(q.wrong).map(Number)).not.toContain(q.a);
            for (const w of Object.values(q.wrong)) expect(typeof w).toBe('string');
          }
        });
      }

      if (VERIFY[id]) {
        it('answer independently recomputes within tol on every seed', () => {
          for (const seed of SEEDS) VERIFY[id](generate(id, seed));
        });
      }

      it('stamps a replayable question_key gen:<id>:<seed>', () => {
        expect(generate(id, 91).key).toBe(`gen:${id}:91`);
      });
    });
  }

  it('every generator has an independent verifier (correctness is checked, not just shape)', () => {
    const unverified = [...GENERATORS.keys()].filter(id => !VERIFY[id]);
    expect(unverified).toEqual([]);
  });
});
