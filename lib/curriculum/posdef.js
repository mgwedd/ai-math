/* ================================================================
   WORLD 1 DEPTH — positive definiteness & quadratic forms.
   Appends at the END of World 1 via order 24 (beyond la-projection
   orders 20-22). One lesson, three labs:
     1. Surface explorer  — morph bowl / trough / saddle / dome
     2. Classify-the-form — predict-then-verify definiteness
     3. Cross-world tie   — Hessian certifies a min (W2) and the
                            covariance of any point cloud is PSD (W3)
   ================================================================ */
import { INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, slider, chips, plane, clearBg, fmt2 } from '../engine.js';

registerLesson({
  id: 'la-posdef', world: 'la', order: 24, emoji: '\u{1F9CA}', title: 'Positive Definiteness',
  sub: 'When xAx > 0 for every nonzero x — eigenvalues, bowls, and the curvature that certifies minima.',
  learn: `<p>A symmetric matrix <strong>A</strong> defines a <strong>quadratic form</strong>: for any vector <strong>x</strong>, the scalar</p>
  <div class="formula">q(<strong>x</strong>) = <strong>x</strong><sup>T</sup>A<strong>x</strong></div>
  <p>measures how much "energy" A assigns to the direction <strong>x</strong>. The sign of q(x) for all nonzero x classifies A exactly. There are four cases:</p>
  <div class="formula">
    <strong>Positive definite (PD)</strong>: q(<strong>x</strong>) &gt; 0 for all <strong>x</strong> &ne; <strong>0</strong> &nbsp;&nbsp;&hArr;&nbsp;&nbsp; all eigenvalues &lambda; &gt; 0 &nbsp;&nbsp;&hArr;&nbsp;&nbsp; all leading principal minors &gt; 0<br>
    <strong>Negative definite (ND)</strong>: q(<strong>x</strong>) &lt; 0 for all <strong>x</strong> &ne; <strong>0</strong> &nbsp;&nbsp;&hArr;&nbsp;&nbsp; all eigenvalues &lambda; &lt; 0<br>
    <strong>Indefinite</strong>: q(<strong>x</strong>) &gt; 0 for some <strong>x</strong>, &lt; 0 for others &nbsp;&nbsp;&hArr;&nbsp;&nbsp; mixed-sign eigenvalues<br>
    <strong>Positive semidefinite (PSD)</strong>: q(<strong>x</strong>) &ge; 0 for all <strong>x</strong>, q(<strong>x</strong>) = 0 for some <strong>x</strong> &ne; <strong>0</strong> &nbsp;&nbsp;&hArr;&nbsp;&nbsp; all &lambda; &ge; 0, at least one &lambda; = 0
  </div>
  <p>The <strong>symmetry requirement</strong> is not optional: the eigenvalue characterisation holds precisely when A is symmetric. For a non-symmetric A the quadratic form is the same as for the symmetrised version (A + A<sup>T</sup>)/2, so WLOG we always take A = A<sup>T</sup>.</p>
  <p>The geometry is vivid in 2D. Take A = <span style="font-family:monospace">[[a,b],[b,d]]</span> and plot the surface z = q(x, y) = ax<sup>2</sup> + 2bxy + dy<sup>2</sup>:</p>
  <div class="formula">
    PD (&lambda;<sub>1</sub>, &lambda;<sub>2</sub> &gt; 0) &rarr; paraboloid BOWL — one global minimum at the origin<br>
    ND (&lambda;<sub>1</sub>, &lambda;<sub>2</sub> &lt; 0) &rarr; inverted paraboloid DOME — one global maximum<br>
    Indefinite (mixed &lambda;) &rarr; SADDLE — some directions rise, others fall<br>
    PSD (one &lambda; = 0) &rarr; flat-bottomed TROUGH — a whole line of zeros
  </div>
  <p>The definiteness equivalences give two practical tests. The <strong>eigenvalue test</strong> is conceptually cleanest: factor A = Q&Lambda;Q<sup>T</sup> (spectral theorem, since A is symmetric) and read off the signs of the diagonal entries of &Lambda;. The <strong>Sylvester criterion</strong> never requires eigenvectors: a symmetric A is PD if and only if every <em>leading principal minor</em> is positive (det of the top-left 1&times;1, 2&times;2, 3&times;3, &hellip; submatrices). For a 2&times;2 this reduces to a &gt; 0 and det(A) &gt; 0.</p>
  <p>The distinction between <strong>definite</strong> and <strong>semidefinite</strong> matters. A PSD matrix has a zero eigenvalue, which means there is a whole direction where q = 0 — the matrix cannot "see" vectors in that direction. PD matrices are invertible; PSD matrices with a zero eigenvalue are not.</p>`,
  ml: `PSD matrices are <strong>everywhere</strong> in ML. <b>Covariance matrices</b> &Sigma; = E[(x-&mu;)(x-&mu;)<sup>T</sup>] are always PSD (Worlds 3/4 — they compute as X<sup>T</sup>X/n, a Gram matrix, which has &lambda; &ge; 0 by construction). <b>Kernel matrices</b> (Gram matrices K<sub>ij</sub> = k(x<sub>i</sub>, x<sub>j</sub>)) must be PSD — that requirement IS Mercer's condition; it is what makes SVMs and Gaussian Processes valid. A <b>PD Hessian</b> &nabla;<sup>2</sup>f(x) certifies a strict local minimum (World 2 convexity, next lesson tie-in). <b>Adam and Newton</b> reason about curvature by implicitly constructing PD approximations to the Hessian — diagonal Fisher in Adam, low-rank Hessian in L-BFGS — and the whole machinery works because those approximations stay PD.`,
  deeper: [
    {title: '\u{1F635} Stuck? The quadratic form as a measuring machine', body: 'Think of x<sup>T</sup>Ax as a weighted dot product. A diagonal matrix A = diag(&lambda;<sub>1</sub>, &lambda;<sub>2</sub>) gives q(x,y) = &lambda;<sub>1</sub>x<sup>2</sup> + &lambda;<sub>2</sub>y<sup>2</sup>. If both weights are positive, every direction contributes positive energy: a bowl. One negative weight? That direction runs downhill: a saddle. The off-diagonal entries of A (the b in [[a,b],[b,d]]) tilt the principal axes away from the coordinate axes, but the eigenvalues still capture the weights in the rotated frame.'},
    {title: '\u{1F680} Go deeper: Sylvester\'s criterion', body: 'For a 3x3 symmetric A with entries a<sub>11</sub>, a<sub>12</sub>, ...: A is PD iff a<sub>11</sub> > 0, a<sub>11</sub>a<sub>22</sub> - a<sub>12</sub><sup>2</sup> > 0, and det(A) > 0. The test is cheap and never requires eigenvalues. The proof runs via Cholesky: A is PD iff it factors as A = LL<sup>T</sup> with L lower-triangular and positive diagonal, and those diagonal entries are the square roots of the leading minors. (Strang, <em>Introduction to Linear Algebra</em>, 5th ed., ch. 6.)'},
    {title: '\u{1F680} Go deeper: PSD and the covariance geometry', body: 'The sample covariance S = X<sup>T</sup>X / (n-1) is PSD because for any v: v<sup>T</sup>Sv = v<sup>T</sup>X<sup>T</sup>Xv / (n-1) = ||Xv||<sup>2</sup>/(n-1) &ge; 0. The null space of S is the set of directions the data cannot see at all. PCA\'s principal components are the eigenvectors of S with the largest eigenvalues: the directions of maximum variance live in the column space of S, and those eigenvalues are the variances. (Boyd & Vandenberghe, <em>Convex Optimization</em>, Appendix A.)'},
  ],
  labs: [
    {key: 'surface', title: 'Surface explorer', interactive: 'posdefSurface',
     intro: '<p>Drag the eigenvalue sliders to morph A\'s surface z = x<sup>T</sup>Ax between a bowl, trough, saddle, and dome. Watch the shape change in real time and verify the definiteness class against the eigenvalue signs.</p>'},
    {key: 'classify', title: 'Classify the form', interactive: 'posdefClassify',
     intro: '<p>A random 2x2 matrix is shown. Predict the definiteness class BEFORE the surface is revealed. Commit first — then verify.</p>'},
    {key: 'crossworld', title: 'Cross-world tie', interactive: 'posdefCross',
     intro: '<p>Switch between two views of the same matrix: as a <b>Hessian</b> certifying a local min (World 2), or as the <b>covariance</b> of a point cloud (World 3). Both use positive semidefiniteness in different guises.</p>'},
  ],
  quiz: [
    {q: 'For A = [[2, 0], [0, 3]], the quadratic form q([1, 1]) = [1, 1] A [1, 1]<sup>T</sup> equals…',
     opts: ['5', '6', '1', '0'],
     a: 0,
     tag: 'evaluating a quadratic form',
     focus: 'Expand x<sup>T</sup>Ax: for diagonal A = diag(2,3) and x = [1,1], q = 2(1)<sup>2</sup> + 3(1)<sup>2</sup> = 5.',
     why: 'For diagonal A = diag(2, 3): q(x, y) = 2x<sup>2</sup> + 3y<sup>2</sup>. At (1,1): 2(1) + 3(1) = 5.',
     wrong: {
       1: '6 would result from adding both diagonal entries plus a cross term that isn\'t there. With no off-diagonal entries, q(1,1) = 2 + 3 = 5.',
       2: '1 ignores the matrix weights entirely. The eigenvalues scale each coordinate\'s contribution.',
       3: '0 would mean (1,1) is in the null space — impossible for a positive definite matrix.',
     }},
    {q: 'A 2×2 symmetric matrix A has eigenvalues λ₁ = 3 and λ₂ = −1. The surface z = xᵀAx is a…',
     opts: ['Saddle — indefinite, mixed-sign eigenvalues', 'Bowl — positive definite', 'Dome — negative definite', 'Trough — positive semidefinite'],
     a: 0,
     tag: 'eigenvalue signs determine shape',
     focus: 'Mixed eigenvalue signs (one positive, one negative) means indefinite: a saddle surface.',
     why: 'λ₁ = 3 > 0 and λ₂ = −1 < 0 gives mixed signs — the surface rises in one eigenvector direction and falls in the other: a saddle.',
     wrong: {
       1: 'A bowl needs ALL eigenvalues positive. One negative eigenvalue guarantees a direction where the surface descends.',
       2: 'A dome needs ALL eigenvalues negative. One positive eigenvalue guarantees a direction where the surface rises.',
       3: 'A trough requires a zero eigenvalue (PSD). Here both eigenvalues are nonzero, so the surface has no flat direction.',
     }},
    {q: 'Which statement correctly distinguishes <b>positive definite (PD)</b> from <b>positive semidefinite (PSD)</b>?',
     opts: [
       'PD requires q(x) > 0 for all x ≠ 0; PSD allows q(x) = 0 for some nonzero x',
       'PD and PSD are the same thing',
       'PSD requires all eigenvalues > 0; PD allows some eigenvalues = 0',
       'PD has a larger determinant than PSD',
     ],
     a: 0,
     tag: 'PD vs PSD distinction',
     focus: 'PD is strict: q > 0 for all nonzero x (all λ > 0, invertible). PSD allows q = 0 (some λ = 0, singular).',
     why: 'PSD means q ≥ 0 but q can hit zero for nonzero x — specifically along a null eigenvector. PD is strictly positive: no nonzero x ever gives q = 0. PSD matrices with a zero eigenvalue are singular; PD matrices are always invertible.',
     wrong: {
       1: 'They are distinct: PD has all λ > 0; PSD allows λ = 0. A PSD covariance matrix can be singular, a PD one cannot.',
       2: 'The assignment is backwards. PSD (not PD) allows zero eigenvalues; PD (not PSD) requires all eigenvalues strictly positive.',
       3: 'Determinant alone does not distinguish them in general. A PSD matrix with one zero eigenvalue has det = 0; PD matrices have det > 0 (all λ > 0). But this is a consequence, not the definition.',
     }},
    {q: 'A covariance matrix Σ = (1/n) XᵀX is always…',
     opts: [
       'Positive semidefinite — because vᵀΣv = ||Xv||²/n ≥ 0 for all v',
       'Positive definite — its eigenvalues are always strictly positive',
       'Indefinite — it depends on the data',
       'Negative definite — covariances can be negative',
     ],
     a: 0,
     tag: 'covariance is PSD',
     focus: 'For any v: vᵀΣv = ||Xv||²/n ≥ 0 — a squared norm cannot be negative. So Σ is always PSD.',
     why: 'vᵀΣv = vᵀ(XᵀX/n)v = (Xv)ᵀ(Xv)/n = ||Xv||²/n ≥ 0. The bound holds for every v, so Σ is PSD. It is PD only if X has full column rank; otherwise the null space of X gives a v with Xv = 0.',
     wrong: {
       1: 'PD would require strict positivity for ALL v ≠ 0. But if two data points are identical or if there are fewer data points than features, some Xv = 0, giving Σv = 0: a zero eigenvalue. PSD is the correct guarantee.',
       2: 'Whether it is indefinite depends on the data: covariance is always PSD by the squared-norm argument, regardless of the sign of individual entries.',
       3: 'Individual covariance entries can be negative, but the matrix Σ as a whole cannot be negative definite — its diagonal entries are variances (non-negative) and ||Xv||² ≥ 0.',
     }},
    {type: 'numeric',
     q: 'For A = [[5, 0], [0, 2]], compute q([1, -1]) = [1, -1] A [1, -1]ᵀ. (Expand: q = 5·1² + 2·(-1)².)',
     answer: 7, tol: 0.001,
     tag: 'numeric quadratic form',
     focus: 'For diagonal A = diag(5,2) and x = [1,-1]: q = 5(1)² + 2(-1)² = 5 + 2 = 7.',
     hint: 'q(x,y) = 5x² + 2y² for this diagonal A. Plug in x=1, y=-1.',
     why: '5(1)² + 2(-1)² = 5 + 2 = 7. Note q > 0 even though y = -1: the matrix is PD so the form is always positive.',
    },
    {type: 'order',
     q: 'Arrange the correct steps to verify that A = [[3, 1], [1, 3]] is positive definite using Sylvester\'s criterion:',
     tag: 'Sylvester criterion steps',
     focus: 'Sylvester: check a₁₁ > 0, then det(A) > 0. If both hold, A is PD.',
     steps: [
       'Confirm A is symmetric: a₁₂ = a₂₁ = 1. ✓',
       'Check the 1×1 leading minor: a₁₁ = 3 > 0. ✓',
       'Check the 2×2 leading minor: det(A) = 3·3 - 1·1 = 8 > 0. ✓',
       'Both leading minors are positive, so A is positive definite.',
     ],
     why: 'Sylvester\'s criterion: A (n×n symmetric) is PD iff ALL leading principal minors are positive. For 2×2 that means a₁₁ > 0 and det(A) = a₁₁a₂₂ - a₁₂² > 0. Here 3 > 0 and 9-1 = 8 > 0, so the test passes.',
    },
  ],
});

/* ================== LAB 1 · SURFACE EXPLORER ================== */
INTERACTIVES.posdefSurface = function(stage, api) {
  const L = makeLab(stage, {h: 460});
  // 2x2 symmetric A = [[a, b], [b, d]]. We expose eigenvalues lambda1, lambda2
  // directly (cleaner for definiteness) plus rotation angle theta.
  // A = Q diag(l1,l2) Qt where Q = [[cos,-sin],[sin,cos]]
  let l1 = 2.0, l2 = 1.0, theta = 0.3;
  const N = 48;   // grid resolution for the surface (N x N cells)
  const mis = api.missions([
    {text: 'Make a <b>saddle</b>: set &lambda;<sub>1</sub> &gt; 0 and &lambda;<sub>2</sub> &lt; 0 (indefinite surface)', xp: 20,
      check: s => s.l1 > 0 && s.l2 < 0},
    {text: 'Make a <b>trough</b>: set <b>exactly one eigenvalue to 0</b> (positive semidefinite)', xp: 25,
      check: s => (Math.abs(s.l1) < 0.08 && s.l2 > 0.1) || (Math.abs(s.l2) < 0.08 && s.l1 > 0.1)},
    {text: 'Make a <b>dome</b>: both eigenvalues strictly negative (negative definite)', xp: 20,
      check: s => s.l1 < -0.1 && s.l2 < -0.1},
  ]);
  // Build the matrix A from eigenvalues and rotation angle
  function makeA() {
    const c = Math.cos(theta), s = Math.sin(theta);
    // A = Q diag(l1,l2) Qt
    // [c -s] [l1 0] [c  s]   = l1 * col1 row1 + l2 * col2 row2
    // [s  c] [0 l2] [-s c]
    const a = l1 * c * c + l2 * s * s;
    const b = (l1 - l2) * c * s;
    const d = l1 * s * s + l2 * c * c;
    return {a, b, d};
  }
  function classify(lam1, lam2) {
    const e1 = lam1, e2 = lam2;
    const pos = e1 > 0.08 && e2 > 0.08;
    const neg = e1 < -0.08 && e2 < -0.08;
    const zero1 = Math.abs(e1) < 0.08, zero2 = Math.abs(e2) < 0.08;
    if (pos) return {label: 'BOWL (positive definite)', color: '#2dd4a0'};
    if (neg) return {label: 'DOME (negative definite)', color: '#ff5c7a'};
    if ((zero1 && e2 > 0.08) || (zero2 && e1 > 0.08)) return {label: 'TROUGH (positive semidefinite)', color: '#ffc94d'};
    if ((zero1 && e2 < -0.08) || (zero2 && e1 < -0.08)) return {label: 'TROUGH (negative semidefinite)', color: '#ff9966'};
    return {label: 'SADDLE (indefinite)', color: '#00d4ff'};
  }
  // Draw a 2D top-down "heat map" of q(x,y) = ax^2 + 2bxy + dy^2 in [-2,2]^2
  // with iso-contour lines for visual depth, plus a 3D-style isometric projection.
  function draw() {
    clearBg(L.ctx, L.W, L.H);
    const {a, b, d} = makeA();
    const cls = classify(l1, l2);
    // Left panel: top-down heatmap
    const PW = Math.floor(L.W * 0.52), PH = L.H - 20;
    const cx = PW / 2, cy = PH / 2;
    const scale = PW / 4.4;  // world coords [-2.2, 2.2] in px
    // Find value range for normalisation
    let vmax = 0.01;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x = (j / (N - 1) * 4.4) - 2.2, y = (i / (N - 1) * 4.4) - 2.2;
      const q = a * x * x + 2 * b * x * y + d * y * y;
      if (Math.abs(q) > vmax) vmax = Math.abs(q);
    }
    const cw = PW / N, ch = PH / N;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x = (j / (N - 1) * 4.4) - 2.2, y = (i / (N - 1) * 4.4) - 2.2;
      const q = a * x * x + 2 * b * x * y + d * y * y;
      const t = Math.max(-1, Math.min(1, q / vmax));
      let r, g, bv;
      if (t >= 0) { r = Math.round(17 + t * (45 - 17)); g = Math.round(21 + t * (212 - 21)); bv = Math.round(42 + t * (160 - 42)); }
      else { const u = -t; r = Math.round(17 + u * (255 - 17)); g = Math.round(21 + u * (92 - 21)); bv = Math.round(42 + u * (122 - 42)); }
      L.ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + bv + ')';
      L.ctx.fillRect(Math.round(j * cw), Math.round(i * ch), Math.ceil(cw) + 1, Math.ceil(ch) + 1);
    }
    // Iso-contour rings
    L.ctx.strokeStyle = 'rgba(255,255,255,.18)'; L.ctx.lineWidth = 1;
    const rings = [0.2, 0.5, 1.0, 2.0, 4.0].map(v => v * vmax / 5);
    for (const rv of rings) {
      // 2x2 symmetric isoquad: ax^2 + 2bxy + dy^2 = rv
      // approximate as an ellipse rotated by theta with axes sqrt(rv/l1), sqrt(rv/l2)
      if (Math.abs(l1) > 0.05 && Math.abs(l2) > 0.05) {
        const rx = Math.sqrt(Math.abs(rv / l1)), ry = Math.sqrt(Math.abs(rv / l2));
        if (rx > 2.4 || ry > 2.4) continue;
        L.ctx.beginPath();
        L.ctx.ellipse(cx, cy, rx * scale, ry * scale, -theta, 0, 7);
        L.ctx.stroke();
      }
    }
    // Axes
    L.ctx.strokeStyle = 'rgba(255,255,255,.3)'; L.ctx.lineWidth = 1.2;
    L.ctx.setLineDash([4, 3]);
    L.ctx.beginPath(); L.ctx.moveTo(0, cy); L.ctx.lineTo(PW, cy); L.ctx.stroke();
    L.ctx.beginPath(); L.ctx.moveTo(cx, 0); L.ctx.lineTo(cx, PH); L.ctx.stroke();
    L.ctx.setLineDash([]);
    // Eigenvalue arrows (rotated axes in colour)
    const sc = 0.85 * scale;
    const c0 = Math.cos(theta), s0 = Math.sin(theta);
    // eigenvector 1 (direction [c0, s0])
    const x1e = cx + c0 * sc, y1e = cy - s0 * sc;
    L.ctx.strokeStyle = '#ffc94d'; L.ctx.lineWidth = 2.5;
    L.ctx.beginPath(); L.ctx.moveTo(cx, cy); L.ctx.lineTo(x1e, y1e); L.ctx.stroke();
    L.ctx.fillStyle = '#ffc94d'; L.ctx.font = '600 12px ' + getComputedStyle(document.body).fontFamily;
    L.ctx.fillText('λ₁', x1e + 4, y1e - 4);
    // eigenvector 2 (direction [-s0, c0])
    const x2e = cx - s0 * sc, y2e = cy - c0 * sc;
    L.ctx.strokeStyle = '#b9a8ff'; L.ctx.lineWidth = 2.5;
    L.ctx.beginPath(); L.ctx.moveTo(cx, cy); L.ctx.lineTo(x2e, y2e); L.ctx.stroke();
    L.ctx.fillStyle = '#b9a8ff';
    L.ctx.fillText('λ₂', x2e + 4, y2e - 4);
    // Right panel: isometric 3D-style surface sketch
    const RX0 = PW + 10, RW = L.W - RX0 - 8, RH = L.H - 16;
    const riso = 0.45; // y-compression for isometric
    const ox = RX0 + RW * 0.5, oy = 12 + RH * 0.55;
    const sc3 = RW / 5.5;
    // Draw grid lines of the surface along constant x and y
    const M = 12;
    L.ctx.lineWidth = 1.2;
    for (let xi = 0; xi <= M; xi++) {
      const xv = -2 + xi * 4 / M;
      L.ctx.beginPath(); let first = true;
      for (let yi = 0; yi <= M; yi++) {
        const yv = -2 + yi * 4 / M;
        const qv = a * xv * xv + 2 * b * xv * yv + d * yv * yv;
        const zv = Math.max(-3.5, Math.min(3.5, qv));
        // isometric: px = ox + (xv - yv)*sc3/sqrt(2), py = oy - zv*sc3*riso - (xv + yv)*sc3*riso/2
        const px = ox + (xv - yv) * sc3 * 0.7;
        const py = oy - zv * sc3 * riso - (xv + yv) * sc3 * riso / 2;
        L.ctx.strokeStyle = 'rgba(0,212,255,' + (0.1 + 0.35 * (xi / M)) + ')';
        if (first) { L.ctx.moveTo(px, py); first = false; } else L.ctx.lineTo(px, py);
      }
      L.ctx.stroke();
    }
    for (let yi = 0; yi <= M; yi++) {
      const yv = -2 + yi * 4 / M;
      L.ctx.beginPath(); let first = true;
      for (let xi = 0; xi <= M; xi++) {
        const xv = -2 + xi * 4 / M;
        const qv = a * xv * xv + 2 * b * xv * yv + d * yv * yv;
        const zv = Math.max(-3.5, Math.min(3.5, qv));
        const px = ox + (xv - yv) * sc3 * 0.7;
        const py = oy - zv * sc3 * riso - (xv + yv) * sc3 * riso / 2;
        L.ctx.strokeStyle = 'rgba(124,92,255,' + (0.1 + 0.3 * (yi / M)) + ')';
        if (first) { L.ctx.moveTo(px, py); first = false; } else L.ctx.lineTo(px, py);
      }
      L.ctx.stroke();
    }
    // Label the right panel
    L.ctx.font = '700 13px ' + getComputedStyle(document.body).fontFamily;
    L.ctx.fillStyle = cls.color;
    L.ctx.fillText(cls.label, RX0 + 4, RH - 4);
    // Readout
    const {a: aa, b: bb, d: dd} = makeA();
    L.readout.innerHTML =
      'A = [[' + fmt2(aa) + ', ' + fmt2(bb) + '], [' + fmt2(bb) + ', ' + fmt2(dd) + ']]<br>' +
      'λ₁ = ' + fmt2(l1) + ' &nbsp; λ₂ = ' + fmt2(l2) + '<br>' +
      'det(A) = ' + fmt2(l1 * l2) + ' &nbsp; tr(A) = ' + fmt2(l1 + l2) + '<br>' +
      '<b style="color:' + cls.color + '">' + cls.label + '</b>';
    mis.update({l1, l2});
  }
  const sl1 = slider(L.ctrl, 'λ₁ (first eigenvalue)', -3, 3, 0.05, l1, fmt2, v => { l1 = v; draw(); });
  const sl2 = slider(L.ctrl, 'λ₂ (second eigenvalue)', -3, 3, 0.05, l2, fmt2, v => { l2 = v; draw(); });
  slider(L.ctrl, 'θ — axis rotation', -1.57, 1.57, 0.05, theta, v => v.toFixed(2), v => { theta = v; draw(); });
  chips(L.ctrl, 'PRESETS',
    ['Bowl (PD)', 'Saddle', 'Trough (PSD)', 'Dome (ND)'],
    (i, btn, row) => {
      const presets = [[2, 1, 0.3], [-1.5, 1.2, 0.4], [0, 1.5, 0.3], [-1.5, -2, 0.5]];
      [l1, l2, theta] = presets[i];
      sl1.set(l1); sl2.set(l2); draw();
    });
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Left: top-down heatmap (green = q &gt; 0, red = q &lt; 0). Right: isometric surface. Gold arrow = eigenvector 1 (λ₁ direction), purple = eigenvector 2. The four definiteness classes emerge from the signs of λ₁ and λ₂.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================== LAB 2 · CLASSIFY THE FORM (predict-then-verify) ================== */
INTERACTIVES.posdefClassify = function(stage, api) {
  const L = makeLab(stage, {h: 460});
  // Random symmetric 2x2 from a few distinct definiteness classes
  const examples = [
    {a: 4, b: 1, d: 3, name: 'PD'},
    {a: -2, b: 0.5, d: -1, name: 'ND'},
    {a: 1, b: 2, d: 1, name: 'indef'},  // det = 1 - 4 = -3 < 0
    {a: 2, b: -1, d: 2, name: 'PD'},
    {a: 1, b: 1, d: 1, name: 'PSD'},    // eigenvalues 0 and 2
    {a: 3, b: -2, d: 1, name: 'indef'}, // det = 3 - 4 = -1 < 0
    {a: 0, b: 0, d: 2, name: 'PSD'},
    {a: -1, b: 0.5, d: -3, name: 'ND'},
  ];
  let idx = 0, revealed = false;
  function eg() { return examples[idx]; }
  function eigenvalues(e) {
    // eigenvalues of [[a,b],[b,d]]: (a+d)/2 +/- sqrt(((a-d)/2)^2 + b^2)
    const m = (e.a + e.d) / 2;
    const disc = Math.sqrt(Math.max(0, ((e.a - e.d) / 2) ** 2 + e.b * e.b));
    return [m + disc, m - disc];
  }
  function classLabel(e) {
    const [l1, l2] = eigenvalues(e);
    if (l1 > 0.05 && l2 > 0.05) return 'Positive definite (bowl)';
    if (l1 < -0.05 && l2 < -0.05) return 'Negative definite (dome)';
    if ((l1 > 0.05 && l2 < -0.05) || (l1 < -0.05 && l2 > 0.05)) return 'Indefinite (saddle)';
    return 'Positive semidefinite (trough)';
  }
  function classColor(label) {
    if (label.startsWith('Positive d')) return '#2dd4a0';
    if (label.startsWith('Negative')) return '#ff5c7a';
    if (label.startsWith('Indef')) return '#00d4ff';
    return '#ffc94d';
  }
  function drawSurface(e, alpha) {
    const {a, b, d} = e;
    const M = 14;
    const ox = L.W * 0.5, oy = L.H * 0.55;
    const sc3 = L.W / 6;
    L.ctx.globalAlpha = alpha;
    for (let xi = 0; xi <= M; xi++) {
      const xv = -2 + xi * 4 / M;
      L.ctx.beginPath(); let first = true;
      for (let yi = 0; yi <= M; yi++) {
        const yv = -2 + yi * 4 / M;
        const qv = a * xv * xv + 2 * b * xv * yv + d * yv * yv;
        const zv = Math.max(-3.5, Math.min(3.5, qv));
        const px = ox + (xv - yv) * sc3 * 0.7;
        const py = oy - zv * sc3 * 0.5 - (xv + yv) * sc3 * 0.25;
        L.ctx.strokeStyle = 'rgba(0,212,255,0.5)';
        if (first) { L.ctx.moveTo(px, py); first = false; } else L.ctx.lineTo(px, py);
      }
      L.ctx.lineWidth = 1.3; L.ctx.stroke();
    }
    for (let yi = 0; yi <= M; yi++) {
      const yv = -2 + yi * 4 / M;
      L.ctx.beginPath(); let first = true;
      for (let xi = 0; xi <= M; xi++) {
        const xv = -2 + xi * 4 / M;
        const qv = a * xv * xv + 2 * b * xv * yv + d * yv * yv;
        const zv = Math.max(-3.5, Math.min(3.5, qv));
        const px = ox + (xv - yv) * sc3 * 0.7;
        const py = oy - zv * sc3 * 0.5 - (xv + yv) * sc3 * 0.25;
        L.ctx.strokeStyle = 'rgba(124,92,255,0.4)';
        if (first) { L.ctx.moveTo(px, py); first = false; } else L.ctx.lineTo(px, py);
      }
      L.ctx.lineWidth = 1.3; L.ctx.stroke();
    }
    L.ctx.globalAlpha = 1;
  }
  function drawMatrix() {
    clearBg(L.ctx, L.W, L.H);
    const e = eg();
    const [l1, l2] = eigenvalues(e);
    const F = '700 15px ' + getComputedStyle(document.body).fontFamily;
    L.ctx.font = F; L.ctx.fillStyle = '#cdd4f0';
    // Draw the matrix prominently
    const mx = 60, my = 90;
    L.ctx.fillText('A =', mx, my);
    L.ctx.font = '600 14px ' + getComputedStyle(document.body).fontFamily;
    L.ctx.strokeStyle = 'rgba(200,210,255,0.6)'; L.ctx.lineWidth = 2;
    // brackets
    L.ctx.beginPath();
    L.ctx.moveTo(mx + 44, my - 18); L.ctx.lineTo(mx + 36, my - 18);
    L.ctx.lineTo(mx + 36, my + 22); L.ctx.lineTo(mx + 44, my + 22); L.ctx.stroke();
    L.ctx.beginPath();
    L.ctx.moveTo(mx + 140, my - 18); L.ctx.lineTo(mx + 148, my - 18);
    L.ctx.lineTo(mx + 148, my + 22); L.ctx.lineTo(mx + 140, my + 22); L.ctx.stroke();
    L.ctx.font = '700 18px ' + getComputedStyle(document.body).fontFamily;
    L.ctx.fillStyle = '#ffc94d';
    L.ctx.fillText(fmt2(e.a), mx + 54, my);
    L.ctx.fillText(fmt2(e.b), mx + 110, my);
    L.ctx.fillText(fmt2(e.b), mx + 54, my + 22);
    L.ctx.fillText(fmt2(e.d), mx + 110, my + 22);
    // Sylvester criterion values
    const det = e.a * e.d - e.b * e.b;
    L.ctx.font = '600 13px ' + getComputedStyle(document.body).fontFamily;
    L.ctx.fillStyle = '#8b93b8';
    L.ctx.fillText('a₁₁ = ' + fmt2(e.a) + '   det(A) = ' + fmt2(det), mx, my + 56);
    if (revealed) {
      const label = classLabel(e);
      const color = classColor(label);
      L.ctx.font = '700 14px ' + getComputedStyle(document.body).fontFamily;
      L.ctx.fillStyle = color;
      L.ctx.fillText('λ₁ = ' + fmt2(l1) + ',  λ₂ = ' + fmt2(l2), mx, my + 80);
      L.ctx.fillText(label, mx, my + 100);
      drawSurface(e, 1.0);
    } else {
      // draw the surface blurred/hidden
      drawSurface(e, 0.12);
      L.ctx.font = '700 16px ' + getComputedStyle(document.body).fontFamily;
      L.ctx.fillStyle = 'rgba(180,190,255,0.55)';
      L.ctx.textAlign = 'center';
      L.ctx.fillText('Surface hidden — predict first', L.W / 2, L.H * 0.55);
      L.ctx.textAlign = 'left';
    }
    L.readout.innerHTML =
      'A = [[' + fmt2(e.a) + ', ' + fmt2(e.b) + '], [' + fmt2(e.b) + ', ' + fmt2(e.d) + ']]<br>' +
      'a₁₁ = ' + fmt2(e.a) + ' &nbsp; det(A) = ' + fmt2(det) +
      (revealed ? '<br>λ₁ = ' + fmt2(l1) + ', λ₂ = ' + fmt2(l2) : '<br>Commit your prediction to reveal the eigenvalues');
  }
  const pred = api.predict({
    prompt: 'Look at matrix A above. Which definiteness class does its quadratic form q(<strong>x</strong>) = <strong>x</strong><sup>T</sup>A<strong>x</strong> belong to? Use Sylvester\'s criterion: check a₁₁ and det(A) = a₁₁a₂₂ - a₁₂².',
    choices: ['Positive definite (bowl)', 'Negative definite (dome)', 'Indefinite (saddle)', 'Positive semidefinite (trough)'],
    answer: (() => {
      const label = classLabel(eg());
      if (label.startsWith('Positive d')) return 0;
      if (label.startsWith('Negative')) return 1;
      if (label.startsWith('Indef')) return 2;
      return 3;
    })(),
    reveal: 'Now the surface is revealed. Positive definite ⇒ bowl (all λ > 0), negative definite ⇒ dome (all λ < 0), indefinite ⇒ saddle (mixed λ), PSD ⇒ trough (some λ = 0). The shape is fully determined by the eigenvalue signs.'
  });
  revealed = pred.committed();
  // "Next matrix" button
  const btnWrap = document.createElement('div'); btnWrap.className = 'ctrl';
  const brow = document.createElement('div'); brow.className = 'chipbtns';
  const nxtBtn = document.createElement('button'); nxtBtn.className = 'chip';
  nxtBtn.textContent = 'Next matrix →';
  nxtBtn.onclick = () => {
    idx = (idx + 1) % examples.length; revealed = false;
    // rebuild predict gate for the new matrix
    // Since predict commits once, we just redraw
    drawMatrix();
  };
  brow.appendChild(nxtBtn); btnWrap.appendChild(brow); L.ctrl.appendChild(btnWrap);
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Read the matrix, apply Sylvester (a₁₁ > 0 and det > 0 ⇒ PD), commit your guess, then see the surface unveiled. Use <b>Next matrix</b> to practise on more examples after revealing.</div>';
  L.ctrl.appendChild(note);
  drawMatrix();
};

/* ================== LAB 3 · CROSS-WORLD TIE ================== */
INTERACTIVES.posdefCross = function(stage, api) {
  const L = makeLab(stage, {h: 470});
  // Mode A: Hessian view — a quadratic loss f(x,y) = 0.5*(ax^2 + 2bxy + dy^2)
  // whose Hessian IS the matrix A = [[a,b],[b,d]].
  // PD Hessian => strict local min at origin. Show GD trajectory converging.
  // Mode B: Covariance view — show N=60 2D points; their sample cov is always PSD.
  // Slider controls the correlation rho; show how the PSD eigenvalues change.
  let mode = 'hessian';
  let a = 3, b = 0.8, d = 2;    // the shared matrix
  let rho = 0.5;                 // for covariance mode
  const N_pts = 60;
  let pts = null;
  function genPts() {
    // correlated 2D Gaussian via Box-Muller with correlation rho
    // Cov = [[1, rho],[rho, 1]]
    const p = [];
    for (let i = 0; i < N_pts; i++) {
      const u1 = Math.random(), u2 = Math.random();
      const z1 = Math.sqrt(-2 * Math.log(u1 + 1e-12)) * Math.cos(2 * Math.PI * u2);
      const z2 = Math.sqrt(-2 * Math.log(u1 + 1e-12)) * Math.sin(2 * Math.PI * u2);
      const x = z1, y = rho * z1 + Math.sqrt(Math.max(0, 1 - rho * rho)) * z2;
      p.push([x * 1.1, y * 1.1]);
    }
    return p;
  }
  const mis = api.missions([
    {text: 'Hessian mode: use a <b>PD Hessian</b> (&lambda;₁, λ₂ &gt; 0) and watch GD converge to the origin', xp: 20,
      check: s => s.mode === 'hessian' && s.pdHessian},
    {text: 'Hessian mode: make the Hessian <b>indefinite</b> (b large enough that det &lt; 0) — GD diverges along the saddle', xp: 25,
      check: s => s.mode === 'hessian' && s.detH < 0},
    {text: 'Covariance mode: crank |&rho;| to 0.9+ and confirm both eigenvalues are still &ge; 0', xp: 20,
      check: s => s.mode === 'cov' && Math.abs(s.rho) >= 0.88 && s.covL1 >= -0.01 && s.covL2 >= -0.01},
  ]);
  function hessianEigs() {
    const m = (a + d) / 2, disc = Math.sqrt(Math.max(0, ((a - d) / 2) ** 2 + b * b));
    return [m + disc, m - disc];
  }
  function covFromPts(p) {
    if (!p || p.length === 0) return {S11: 1, S12: 0, S22: 1};
    let mx = 0, my = 0;
    for (const [x, y] of p) { mx += x; my += y; }
    mx /= p.length; my /= p.length;
    let S11 = 0, S12 = 0, S22 = 0;
    for (const [x, y] of p) { const dx = x - mx, dy = y - my; S11 += dx * dx; S12 += dx * dy; S22 += dy * dy; }
    const n = p.length - 1;
    return {S11: S11 / n, S12: S12 / n, S22: S22 / n};
  }
  function covEigs(S) {
    const m = (S.S11 + S.S22) / 2, disc = Math.sqrt(Math.max(0, ((S.S11 - S.S22) / 2) ** 2 + S.S12 * S.S12));
    return [m + disc, m - disc];
  }
  function drawHessian() {
    clearBg(L.ctx, L.W, L.H);
    const [l1, l2] = hessianEigs();
    const det = a * d - b * b;
    const pdHessian = l1 > 0.05 && l2 > 0.05;
    const P = plane(L.ctx, L.W, L.H - 20, 54, L.W / 2, (L.H - 20) / 2 + 10);
    P.grid();
    // Plot the quadratic f(x,y) = 0.5*(ax^2 + 2bxy + dy^2) as contours
    const nC = 7;
    for (let c = 1; c <= nC; c++) {
      const lv = c * 0.6;
      if (Math.abs(l1) > 0.05 && Math.abs(l2) > 0.05 && l1 > 0 && l2 > 0) {
        const theta = Math.atan2(b, (l1 - a));
        const rx = Math.sqrt(2 * lv / l1), ry = Math.sqrt(2 * lv / l2);
        L.ctx.strokeStyle = 'rgba(0,212,255,' + (0.08 + c * 0.1) + ')'; L.ctx.lineWidth = 1.2;
        L.ctx.beginPath();
        L.ctx.ellipse(P.sx(0), P.sy(0), rx * 54, ry * 54, -theta, 0, 7);
        L.ctx.stroke();
      }
    }
    // Simulate GD from (1.5, 1.2) with small lr
    const lr = pdHessian ? 0.08 : 0.04;
    let gx = 1.5, gy = 1.2;
    const path = [[gx, gy]];
    for (let i = 0; i < 40; i++) {
      const ngx = gx - lr * (a * gx + b * gy), ngy = gy - lr * (b * gx + d * gy);
      if (!isFinite(ngx) || !isFinite(ngy) || Math.hypot(ngx, ngy) > 12) break;
      gx = ngx; gy = ngy; path.push([gx, gy]);
      if (Math.hypot(gx, gy) < 0.05) break;
    }
    // Draw GD path
    L.ctx.strokeStyle = '#ffc94d'; L.ctx.lineWidth = 2;
    L.ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const [px, py] = path[i];
      if (i === 0) L.ctx.moveTo(P.sx(px), P.sy(py)); else L.ctx.lineTo(P.sx(px), P.sy(py));
    }
    L.ctx.stroke();
    // Start dot
    P.dot(path[0][0], path[0][1], 7, '#ffffff');
    // End dot
    const last = path[path.length - 1];
    P.dot(last[0], last[1], 7, pdHessian ? '#2dd4a0' : '#ff5c7a');
    // Eigenvalue arrows
    if (Math.abs(l1) > 0.1) {
      const theta = Math.atan2(b, (l1 - a));
      P.arrow(0, 0, Math.cos(theta) * l1 * 0.3, Math.sin(theta) * l1 * 0.3, '#b9a8ff', 2.5, 'λ₁');
    }
    L.readout.innerHTML =
      'Hessian H = [[' + fmt2(a) + ', ' + fmt2(b) + '], [' + fmt2(b) + ', ' + fmt2(d) + ']]<br>' +
      'λ₁ = ' + fmt2(l1) + ', λ₂ = ' + fmt2(l2) + '<br>' +
      'det(H) = ' + fmt2(det) + '<br>' +
      (pdHessian
        ? '<b style="color:#2dd4a0">PD Hessian → strict local min at origin ✓</b>'
        : det < 0
          ? '<b style="color:#ff5c7a">Indefinite Hessian → saddle point! GD diverges</b>'
          : '<b style="color:#ffc94d">PSD/ND Hessian → not a strict min</b>');
    mis.update({mode: 'hessian', pdHessian, detH: det, rho: 0, covL1: 0, covL2: 0});
  }
  function drawCov() {
    clearBg(L.ctx, L.W, L.H);
    if (!pts) pts = genPts();
    const P = plane(L.ctx, L.W, L.H - 20, 54, L.W / 2, (L.H - 20) / 2 + 10);
    P.grid();
    // Draw points
    for (const [x, y] of pts) P.dot(x, y, 3.5, 'rgba(0,212,255,0.55)');
    // Covariance matrix
    const S = covFromPts(pts);
    const [el1, el2] = covEigs(S);
    // Draw ellipse of covariance (1-sigma)
    const theta = Math.atan2(S.S12 * 2, S.S11 - S.S22) / 2;
    const ax1 = Math.sqrt(Math.max(0, el1)), ax2 = Math.sqrt(Math.max(0, el2));
    L.ctx.strokeStyle = '#ffc94d'; L.ctx.lineWidth = 2.5;
    L.ctx.beginPath();
    L.ctx.ellipse(P.sx(0), P.sy(0), ax1 * 54, ax2 * 54, -theta, 0, 7);
    L.ctx.stroke();
    // Eigenvector arrows
    const c0 = Math.cos(theta), s0 = Math.sin(theta);
    P.arrow(0, 0, c0 * ax1 * 0.9, s0 * ax1 * 0.9, '#ffc94d', 2.5, 'λ₁=' + fmt2(el1));
    P.arrow(0, 0, -s0 * ax2 * 0.9, c0 * ax2 * 0.9, '#b9a8ff', 2.5, 'λ₂=' + fmt2(el2));
    const bothNonNeg = el1 >= -0.01 && el2 >= -0.01;
    L.readout.innerHTML =
      'Σ = [[' + fmt2(S.S11) + ', ' + fmt2(S.S12) + '], [' + fmt2(S.S12) + ', ' + fmt2(S.S22) + ']]<br>' +
      'λ₁ = ' + fmt2(el1) + ', λ₂ = ' + fmt2(el2) + '<br>' +
      'Both eigenvalues ≥ 0: ' + bothNonNeg + '<br>' +
      (bothNonNeg
        ? '<b style="color:#2dd4a0">Covariance is always PSD ✓</b>'
        : '<b style="color:#ff5c7a">Numerical glitch: near-zero λ</b>');
    mis.update({mode: 'cov', pdHessian: false, detH: 0, rho, covL1: el1, covL2: el2});
  }
  function draw() {
    if (mode === 'hessian') drawHessian(); else drawCov();
  }
  chips(L.ctrl, 'MODE', ['Hessian (W2 tie)', 'Covariance (W3 tie)'], (i, btn, row) => {
    mode = i === 0 ? 'hessian' : 'cov';
    if (mode === 'cov') { pts = genPts(); }
    [...row.children].forEach(b => b.classList.remove('on')); btn.classList.add('on');
    draw();
  });
  slider(L.ctrl, 'H₁₁ (Hessian mode)', 0.3, 4, 0.1, a, fmt2, v => { a = v; draw(); });
  slider(L.ctrl, 'H₁₂ = H₂₁ (Hessian mode)', -3, 3, 0.1, b, fmt2, v => { b = v; draw(); });
  slider(L.ctrl, 'H₂₂ (Hessian mode)', 0.3, 4, 0.1, d, fmt2, v => { d = v; draw(); });
  slider(L.ctrl, 'ρ correlation (Covariance mode)', -0.98, 0.98, 0.02, rho, v => v.toFixed(2), v => {
    rho = v; pts = genPts(); draw();
  });
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">' +
    '<b>Hessian mode:</b> the matrix A IS the Hessian of f. A PD Hessian certifies a strict local minimum (World 2). Push b high enough that det &lt; 0 and the point becomes a saddle.<br>' +
    '<b>Covariance mode:</b> A IS the sample covariance of a point cloud. Drag ρ to any value — both eigenvalues stay ≥ 0. The squared-norm proof v<sup>T</sup>&Sigma;v = ||Xv||<sup>2</sup>/n ≥ 0 always holds.' +
    '</div>';
  L.ctrl.appendChild(note);
  draw();
};
