/* Calculus generators: power-rule and chain-rule derivatives, evaluated at a
   point so the answer is a single verifiable number. Correct-by-construction
   over a seeded rng. */
import { registerGenerator, makeRng, numeric } from './registry.js';

// tidy "+ k" / "− k" term, with the leading sign
const term = (coef, sym) => (coef < 0 ? ' − ' : ' + ') + Math.abs(coef) + sym;

/* ---- power rule: d/dx[a·xⁿ + b·x] = a·n·xⁿ⁻¹ + b, evaluated at x = c ---- */
registerGenerator({
  id: 'power-rule', concept: 'derivative-rules', qtype: 'numeric',
  make(seed){
    const r = makeRng(seed);
    const a = r.nonzero(-5, 5);
    const n = r.int(2, 5);
    const b = r.nonzero(-6, 6);
    const c = r.nonzero(-3, 3);
    // f(x) = a x^n + b x  ⇒  f'(x) = a n x^(n-1) + b
    const dCoef = a * n;                    // coefficient of x^(n-1) in f'
    const ans = dCoef * Math.pow(c, n - 1) + b;
    const fx = '<code>f(x) = ' + a + '·x^' + n + term(b, '·x') + '</code>';
    return numeric({
      q: 'For ' + fx + ', use the power rule to find <code>f′(' + c + ')</code>.',
      answer: ans, tol: 1e-6,
      hint: 'Power rule term-by-term: d/dx[a·xⁿ] = a·n·xⁿ⁻¹, and d/dx[b·x] = b. Then substitute x = ' + c + '.',
      why: 'f′(x) = ' + a + '·' + n + '·x^' + (n - 1) + term(b, '') + ' = ' + dCoef + '·x^' + (n - 1) + term(b, '') +
           '. At x = ' + c + ': ' + dCoef + '·(' + c + ')^' + (n - 1) + term(b, '') + ' = <b>' + ans + '</b>.',
      tag: 'power rule',
      focus: 'Power rule: bring the exponent down as a factor and decrement it (a·xⁿ → a·n·xⁿ⁻¹); differentiate each term separately.',
    });
  },
});

/* ---- chain rule: d/dx[(a·x + b)ⁿ] = n·(a·x + b)ⁿ⁻¹·a, evaluated at x = c ---- */
registerGenerator({
  id: 'chain-rule', concept: 'chain-rule', qtype: 'numeric',
  make(seed){
    const r = makeRng(seed);
    const a = r.nonzero(-3, 3);
    const b = r.nonzero(-4, 4);
    const n = r.int(2, 3);
    const c = r.int(-2, 2);
    const inner = a * c + b;                     // (a·c + b)
    // f(x) = (a x + b)^n  ⇒  f'(x) = n (a x + b)^(n-1) · a
    const ans = n * Math.pow(inner, n - 1) * a;
    const bsign = b < 0 ? ' − ' + Math.abs(b) : ' + ' + b;
    const expr = '(' + a + '·x' + bsign + ')^' + n;   // (a·x ± b)^n
    return numeric({
      q: 'For <code>f(x) = ' + expr + '</code>, use the chain rule to find <code>f′(' + c + ')</code>.',
      answer: ans, tol: 1e-6,
      hint: 'Outer power rule times inner derivative: f′ = n·(inner)ⁿ⁻¹ · (inner)′, and the inner derivative of a·x + b is a. Then substitute x = ' + c + '.',
      why: 'f′(x) = ' + n + '·(' + a + 'x' + bsign + ')^' + (n - 1) + '·' + a +
           '. Inner at x = ' + c + ' is ' + a + '·' + c + bsign.trim() + ' = ' + inner +
           ', so f′(' + c + ') = ' + n + '·(' + inner + ')^' + (n - 1) + '·' + a + ' = <b>' + ans + '</b>.',
      tag: 'chain rule',
      focus: 'Chain rule: differentiate the outer function at the inner value, then multiply by the inner function’s derivative — don’t forget the ×a.',
    });
  },
});
