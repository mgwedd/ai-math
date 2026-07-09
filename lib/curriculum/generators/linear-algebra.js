/* Linear-algebra generators: 2×2 determinant, 2×2 inverse (adjugate),
   dot product (numeric), dot-product sign → angle, and matrix-multiply
   shape compatibility. All correct-by-construction over a seeded rng.
   Concept slugs are chosen to line up with the curriculum's concept taxonomy
   so the engine's retake mixer (see generators/index.js) can match a lesson
   to the generators for the concepts it teaches. */
import { registerGenerator, makeRng, mc, numeric } from './registry.js';

const mat2 = (a, b, c, d) => '<code>[[' + a + ', ' + b + '], [' + c + ', ' + d + ']]</code>';

/* ---- 2×2 determinant: det = ad − bc ---- */
registerGenerator({
  id: 'det2x2', concept: 'determinant', qtype: 'mc',
  make(seed){
    const r = makeRng(seed);
    let a, b, c, d, det, w1, w2, w3;
    // reject until the correct value and all three distractors are distinct,
    // so every option represents a genuinely different (wrong) procedure.
    do {
      a = r.nonzero(-6, 6); b = r.nonzero(-6, 6); c = r.nonzero(-6, 6); d = r.nonzero(-6, 6);
      det = a * d - b * c;   // correct
      w1  = a * d + b * c;   // added instead of subtracted
      w2  = a * c - b * d;   // multiplied the wrong pairs
      w3  = b * c - a * d;   // right pairs, sign reversed
    } while(new Set([det, w1, w2, w3]).size !== 4);
    return mc(r, {
      q: 'What is the determinant of ' + mat2(a, b, c, d) + '?',
      correct: det,
      distractors: [
        { text: w1, why: 'That <b>adds</b> the two products. The determinant <b>subtracts</b>: ad − bc = (' + a + ')(' + d + ') − (' + b + ')(' + c + ') = ' + det + '.' },
        { text: w2, why: 'Those are the wrong pairs. Multiply the <b>main diagonal</b> a·d and the <b>anti-diagonal</b> b·c: ad − bc = ' + det + '.' },
        { text: w3, why: 'Right magnitude, flipped sign — you computed bc − ad. The order is main-diagonal minus anti-diagonal: ad − bc = ' + det + '.' },
      ],
      why: 'det = ad − bc = (' + a + ')(' + d + ') − (' + b + ')(' + c + ') = <b>' + det + '</b>.',
      tag: 'det formula',
      focus: 'Drill the 2×2 rule det = ad − bc: main diagonal product minus anti-diagonal product, minding signs.',
    });
  },
});

/* ---- 2×2 inverse: M⁻¹ = (1/det)·adj(M), adj = [[d,−b],[−c,a]] ---- */
registerGenerator({
  id: 'inv2x2', concept: 'matrix-inverse', qtype: 'mc',
  make(seed){
    const r = makeRng(seed);
    let a, b, c, d, det, correct, w1, w2, w3;
    do {
      a = r.nonzero(-6, 6); b = r.nonzero(-6, 6); c = r.nonzero(-6, 6); d = r.nonzero(-6, 6);
      det = a * d - b * c;            // require det ≠ 0 so the inverse framing is valid
      correct = mat2(d, -b, -c, a);   // the adjugate: swap diagonal, negate off-diagonal
      w1 = mat2(a, b, c, d);          // M itself — no transform applied
      w2 = mat2(d, b, c, a);          // swapped diagonal but forgot to negate off-diagonal
      w3 = mat2(a, -b, -c, d);        // negated off-diagonal but forgot to swap the diagonal
    } while(det === 0 || new Set([correct, w1, w2, w3]).size !== 4);
    return mc(r, {
      q: 'For M = ' + mat2(a, b, c, d) + ' (det = ' + det + '), the inverse is (1/det)·A. '
       + 'Which matrix is the adjugate A?',
      correct,
      distractors: [
        { text: w1, why: 'That is M itself. The adjugate <b>swaps</b> the main-diagonal entries and <b>negates</b> the off-diagonal ones: [[d, −b], [−c, a]].' },
        { text: w2, why: 'You swapped the diagonal (a↔d) but left the off-diagonal alone. Those must be negated: −b and −c.' },
        { text: w3, why: 'You negated the off-diagonal correctly but kept a and d in place. The main diagonal must also swap → d top-left, a bottom-right.' },
      ],
      why: 'adj(M) = [[d, −b], [−c, a]] = ' + correct + ', and M⁻¹ = (1/det)·adj(M).',
      tag: 'inverse meaning',
      focus: 'Memorize the 2×2 inverse recipe: swap the main diagonal, negate the off-diagonal, divide by the determinant.',
    });
  },
});

/* ---- dot product in 2D: u·v = u₁v₁ + u₂v₂ (numeric) ---- */
registerGenerator({
  id: 'dot2d', concept: 'dot-product', qtype: 'numeric',
  make(seed){
    const r = makeRng(seed);
    const u1 = r.nonzero(-7, 7), u2 = r.nonzero(-7, 7);
    const v1 = r.nonzero(-7, 7), v2 = r.nonzero(-7, 7);
    const ans = u1 * v1 + u2 * v2;
    return numeric({
      q: 'Compute the dot product <code>u · v</code> for u = <code>[' + u1 + ', ' + u2 + ']</code> and v = <code>[' + v1 + ', ' + v2 + ']</code>.',
      answer: ans, tol: 1e-6,
      hint: 'Multiply matching components, then add: u₁v₁ + u₂v₂. Watch the signs.',
      why: 'u·v = (' + u1 + ')(' + v1 + ') + (' + u2 + ')(' + v2 + ') = ' + (u1 * v1) + ' + ' + (u2 * v2) + ' = <b>' + ans + '</b>.',
      tag: 'dot product arithmetic',
      focus: 'Practice u·v = Σ uᵢvᵢ — component-wise products summed, keeping sign of each term.',
    });
  },
});

/* ---- dot-product sign fixes the angle class (mc) ---- */
const ANGLE = {
  acute: { label: 'Acute — less than 90°', why: (x) => 'A positive dot product (u·v = ' + x + ' > 0) means the vectors point broadly the same way: the angle is acute.' },
  right: { label: 'Right — exactly 90°',   why: (x) => 'A right angle needs u·v = 0 exactly; here u·v = ' + x + ', so it is not 90°.' },
  obtuse:{ label: 'Obtuse — more than 90°', why: (x) => 'A negative dot product (u·v = ' + x + ' < 0) means the vectors oppose; here the sign says otherwise.' },
};
registerGenerator({
  id: 'dot-angle-sign', concept: 'dot-product', qtype: 'mc',
  make(seed){
    const r = makeRng(seed);
    const mode = r.pick(['acute', 'right', 'obtuse']);
    let u1, u2, v1, v2, dot;
    if(mode === 'right'){
      // build v perpendicular to u: v = k·(−u₂, u₁) ⇒ u·v = 0 exactly
      u1 = r.nonzero(-6, 6); u2 = r.nonzero(-6, 6);
      const k = r.nonzero(-3, 3);
      v1 = -u2 * k; v2 = u1 * k; dot = 0;
    } else {
      do {
        u1 = r.nonzero(-6, 6); u2 = r.nonzero(-6, 6);
        v1 = r.nonzero(-6, 6); v2 = r.nonzero(-6, 6);
        dot = u1 * v1 + u2 * v2;
      } while(mode === 'acute' ? dot <= 0 : dot >= 0);
    }
    const key = dot > 0 ? 'acute' : dot < 0 ? 'obtuse' : 'right';
    const others = ['acute', 'right', 'obtuse'].filter(k => k !== key);
    const distractors = others.map(k => ({ text: ANGLE[k].label, why: ANGLE[k].why(dot) }));
    distractors.push({
      text: 'Impossible to tell without the exact angle',
      why: 'The <b>sign</b> of the dot product alone decides acute / right / obtuse — you never need the angle itself. Here u·v = ' + dot + '.',
    });
    return mc(r, {
      q: 'For u = <code>[' + u1 + ', ' + u2 + ']</code> and v = <code>[' + v1 + ', ' + v2 + ']</code>, the dot product is u·v = <b>' + dot + '</b>. What kind of angle is between them?',
      correct: ANGLE[key].label,
      distractors,
      why: 'sign(u·v) fixes the angle class: positive → acute, zero → right, negative → obtuse. Here u·v = ' + dot + ' → ' + ANGLE[key].label.toLowerCase() + '.',
      tag: 'sign vs angle',
      focus: 'Link the dot-product sign to the angle: >0 acute, =0 perpendicular, <0 obtuse.',
    });
  },
});

/* ---- matrix-multiply shape compatibility (mc) ---- */
registerGenerator({
  id: 'matmul-shape', concept: 'matrix-multiplication', qtype: 'mc',
  make(seed){
    const r = makeRng(seed);
    const compatible = r.bool();
    const m = r.int(1, 5), n = r.int(1, 5), q = r.int(1, 5);
    let p;
    if(compatible){ p = n; }
    else { do { p = r.int(1, 5); } while(p === n); }
    const dims = (rows, cols) => rows + '×' + cols;
    const stem = 'A is a <b>' + dims(m, n) + '</b> matrix and B is a <b>' + dims(p, q) + '</b> matrix. '
               + 'What can you say about the product <code>A·B</code>?';
    if(compatible){
      return mc(r, {
        q: stem,
        correct: 'Defined — the result is ' + dims(m, q),
        distractors: [
          { text: 'Defined — the result is ' + dims(n, q), why: 'The product keeps the <b>outer</b> dimensions: rows of A (' + m + ') × cols of B (' + q + ') = ' + dims(m, q) + ', not ' + dims(n, q) + '.' },
          { text: 'Defined — the result is ' + dims(p, n), why: 'Shape is rows-of-A × cols-of-B in that order = ' + dims(m, q) + ', not ' + dims(p, n) + '.' },
          { text: 'Not defined — the inner dimensions disagree', why: 'The inner dimensions match here (A has ' + n + ' columns, B has ' + p + ' rows, and ' + n + ' = ' + p + '), so the product IS defined.' },
        ],
        why: 'A·B is defined because A\'s columns (' + n + ') equal B\'s rows (' + p + '); the result takes the outer dimensions ' + dims(m, q) + '.',
        tag: 'matrix-vector multiply',
        focus: 'Matrix product rule: (m×n)(n×q) → m×q; the shared inner dimension must match and it cancels.',
      });
    }
    return mc(r, {
      q: stem,
      correct: 'Not defined — the inner dimensions disagree',
      distractors: [
        { text: 'Defined — the result is ' + dims(m, q), why: 'Multiplication first requires the inner dimensions to match: A has ' + n + ' columns but B has ' + p + ' rows (' + n + ' ≠ ' + p + '), so A·B is undefined.' },
        { text: 'Defined — the result is ' + dims(n, q), why: 'It is undefined at all: A\'s ' + n + ' columns must equal B\'s ' + p + ' rows first, and ' + n + ' ≠ ' + p + '.' },
        { text: 'Defined — the result is ' + dims(m, p), why: 'No product exists: the inner dimensions ' + n + ' and ' + p + ' disagree, which is exactly the compatibility condition that fails.' },
      ],
      why: 'A·B needs A\'s columns (' + n + ') to equal B\'s rows (' + p + '). Here ' + n + ' ≠ ' + p + ', so the product is undefined.',
      tag: 'matrix-vector multiply',
      focus: 'Before multiplying, check inner dimensions: (m×n)(p×q) is defined only when n = p.',
    });
  },
});
