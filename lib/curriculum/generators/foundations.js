/* Foundations generators: the log laws and the exponent laws, drilled as a
   single combined-exponent computation so the answer is one verifiable number.
   Correct-by-construction over a seeded rng. */
import { registerGenerator, makeRng, numeric } from './registry.js';

// signed multiplier prefix for a term: 1·X → "X", -1·X → "−X", 3·X → "3X"
const coefTerm = (c, sym) => {
  if(c === 1)  return sym;
  if(c === -1) return '−' + sym;
  return c + sym;
};
// join two signed terms readably: "mp" and "nq" → "mp + nq" / "mp − |n|q"
const joinTerms = (t1, c2, sym2) => {
  const t2 = coefTerm(Math.abs(c2), sym2);
  return t1 + (c2 < 0 ? ' − ' : ' + ') + t2;
};

/* ---- log laws: log_b(xᵐ · yⁿ) = m·log_b x + n·log_b y = m·p + n·q ----
   Given log_b x = p and log_b y = q, combine the product + power laws
   (n < 0 exercises the quotient law).                                    */
registerGenerator({
  id: 'log-law', concept: 'logarithms', qtype: 'numeric',
  make(seed){
    const r = makeRng(seed);
    const p = r.nonzero(-5, 5);       // log_b x
    const q = r.nonzero(-5, 5);       // log_b y
    const m = r.nonzero(-4, 4);       // exponent on x
    const n = r.nonzero(-4, 4);       // exponent on y (negative ⇒ quotient)
    const ans = m * p + n * q;
    const expr = 'x' + (m === 1 ? '' : '^' + m) + '·y' + (n === 1 ? '' : '^' + n);
    return numeric({
      q: 'Given <code>log_b(x) = ' + p + '</code> and <code>log_b(y) = ' + q + '</code>, '
       + 'evaluate <code>log_b(' + expr + ')</code>.',
      answer: ans, tol: 1e-9,
      hint: 'Product law splits the log of a product into a sum; power law pulls each exponent out front: log_b(xᵐ·yⁿ) = m·log_b x + n·log_b y.',
      why: 'log_b(' + expr + ') = ' + joinTerms(coefTerm(m, '·log_b x'), n, '·log_b y')
         + ' = ' + joinTerms(coefTerm(m, '·(' + p + ')'), n, '·(' + q + ')')
         + ' = <b>' + ans + '</b>.',
      tag: 'log rules',
      focus: 'Log laws: log(xy) = log x + log y, log(x/y) = log x − log y, and log(xᵏ) = k·log x. Combine them, keeping signs.',
    });
  },
});

/* ---- exponent laws: aᵐ · aⁿ ÷ aᵏ = a^(m+n−k) ---- */
registerGenerator({
  id: 'exponent-law', concept: 'exponents-and-scale', qtype: 'numeric',
  make(seed){
    const r = makeRng(seed);
    const base = r.int(2, 6);
    const m = r.int(-3, 5);
    const n = r.int(-3, 5);
    const k = r.int(-3, 5);
    const E = m + n - k;              // combined exponent
    return numeric({
      q: 'Write <code>' + base + '^' + m + ' · ' + base + '^' + n + ' ÷ ' + base + '^' + k + '</code> '
       + 'as a single power <code>' + base + '^E</code>. What is the exponent E?',
      answer: E, tol: 0,
      hint: 'Same base: multiplying adds exponents, dividing subtracts them. E = m + n − k.',
      why: 'aᵐ·aⁿ = a^(m+n) and dividing subtracts k, so E = ' + m + ' + ' + n + ' − (' + k + ') = <b>' + E + '</b>.',
      tag: 'multiplying powers',
      focus: 'Exponent laws on a shared base: aᵐ·aⁿ = a^(m+n), aᵐ÷aⁿ = a^(m−n). Track the signs of every exponent.',
    });
  },
});
