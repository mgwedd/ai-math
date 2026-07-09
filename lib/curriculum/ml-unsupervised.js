/* ================================================================
   WORLD 4 — UNSUPERVISED LEARNING: clustering, mixtures & PCA.
   Three lessons that close the "classical ML" gap named in
   CURRICULUM-REVIEW.md (clustering/EM unshipped; PCA invoked but
   never taught). Slotted between the classification group (20-22)
   and trees (100), at orders 40 / 41 / 42.

     40 · ml-kmeans — k-means as alternating assignment/update
     41 · ml-gmm    — mixture models & EM (soft responsibilities)
     42 · ml-pca    — variance-maximizing projection

   Same registries + schema as every other module.

   IMPORTANT: Unicode symbols (σ μ π Σ √ λ ′) are fine inside string
   CONTENT, but every JS string DELIMITER stays ASCII ' or ` — smart
   quotes as delimiters pass `node --check` yet break the ESM + SWC
   build. Canvas code runs ONLY inside the render functions below,
   never at import time.
   ================================================================ */
import { INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, slider, chips, plane, clearBg, fmt2 } from '../engine.js';

/* ---------------- shared, DOM-free numerics (safe at import) ------------- */
const CLR = ['#00d4ff', '#ffc94d', '#2dd4a0', '#ff8bd0', '#b9a8ff'];
function d2(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
function assignAll(pts, cents) {
  return pts.map(p => { let bi = 0, bd = Infinity;
    for (let k = 0; k < cents.length; k++) { const d = d2(p, cents[k]); if (d < bd) { bd = d; bi = k; } }
    return bi; });
}
function inertiaOf(pts, cents, asg) { let s = 0; for (let i = 0; i < pts.length; i++) s += d2(pts[i], cents[asg[i]]); return s; }
function updateCents(pts, asg, k) {
  const c = [];
  for (let j = 0; j < k; j++) { let sx = 0, sy = 0, n = 0;
    for (let i = 0; i < pts.length; i++) if (asg[i] === j) { sx += pts[i].x; sy += pts[i].y; n++; }
    c.push(n ? { x: sx / n, y: sy / n } : null); }
  return c;
}
function lloyd(pts, init) {
  let cents = init.map(c => ({ x: c.x, y: c.y }));
  let asg = assignAll(pts, cents);
  for (let it = 0; it < 100; it++) {
    const nc = updateCents(pts, asg, cents.length).map((c, j) => c || cents[j]);
    const na = assignAll(pts, nc);
    cents = nc;
    if (na.every((v, i) => v === asg[i])) { asg = na; break; }
    asg = na;
  }
  return { cents, asg, inertia: inertiaOf(pts, cents, asg) };
}
function forgy(pts, k) {
  const idx = pts.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, k).map(i => ({ x: pts[i].x, y: pts[i].y }));
}
function bestLloyd(pts, k, restarts) {
  let best = null;
  for (let r = 0; r < restarts; r++) { const res = lloyd(pts, forgy(pts, k)); if (!best || res.inertia < best.inertia) best = res; }
  return best;
}
function gauss(x, mu, sig) { return Math.exp(-0.5 * ((x - mu) / sig) ** 2) / (sig * Math.sqrt(2 * Math.PI)); }
// one EM iteration for a 1-D two-component Gaussian mixture; LL is measured
// with the params BEFORE the update (so a sequence of these rises monotonically)
function emStep(xs, pr) {
  const p2 = 1 - pr.p1;
  const R = []; let LL = 0;
  for (const x of xs) {
    const a = pr.p1 * gauss(x, pr.mu1, pr.s1), b = p2 * gauss(x, pr.mu2, pr.s2);
    const tot = a + b; R.push(a / tot); LL += Math.log(tot);
  }
  let n1 = 0, n2 = 0, m1 = 0, m2 = 0;
  for (let i = 0; i < xs.length; i++) { n1 += R[i]; n2 += 1 - R[i]; m1 += R[i] * xs[i]; m2 += (1 - R[i]) * xs[i]; }
  const nm1 = m1 / n1, nm2 = m2 / n2;
  let v1 = 0, v2 = 0;
  for (let i = 0; i < xs.length; i++) { v1 += R[i] * (xs[i] - nm1) ** 2; v2 += (1 - R[i]) * (xs[i] - nm2) ** 2; }
  return { R, LL, np: { mu1: nm1, s1: Math.max(0.25, Math.sqrt(v1 / n1)), p1: Math.min(0.95, Math.max(0.05, n1 / xs.length)),
                        mu2: nm2, s2: Math.max(0.25, Math.sqrt(v2 / n2)) } };
}
// covariance of a 2-D point cloud + closed-form symmetric-2x2 eigensolve
function covOf(pts) {
  let mx = 0, my = 0; for (const p of pts) { mx += p.x; my += p.y; } mx /= pts.length; my /= pts.length;
  let a = 0, b = 0, c = 0;
  for (const p of pts) { const dx = p.x - mx, dy = p.y - my; a += dx * dx; b += dx * dy; c += dy * dy; }
  const n = pts.length; return { mx, my, a: a / n, b: b / n, c: c / n };
}
function eig2(a, b, c) {
  const tr = a + c, det = a * c - b * b, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
  let vx, vy;
  if (Math.abs(b) > 1e-9) { vx = l1 - c; vy = b; } else if (a >= c) { vx = 1; vy = 0; } else { vx = 0; vy = 1; }
  const nn = Math.hypot(vx, vy) || 1; vx /= nn; vy /= nn;
  return { l1, l2, vx, vy, angle: Math.atan2(vy, vx) };
}

/* ---------------- fixed data (small enough to see) ---------------------- */
// three well-separated blobs — the "clean" cloud for stepping + elbow
const CLOUD3 = [
  [-4, 2.4], [-3.2, 2.8], [-3.8, 1.5], [-2.9, 2.1], [-3.4, 3.0], [-4.2, 1.9], [-3.0, 2.6],
  [3.0, 2.2], [3.8, 2.9], [4.2, 1.8], [3.3, 3.1], [4.0, 2.4], [2.9, 1.7], [3.6, 2.7],
  [-0.4, -3.2], [0.6, -2.7], [0.0, -3.6], [-0.7, -2.5], [0.8, -3.3], [0.3, -2.9], [-0.3, -3.7],
];
// an asymmetric layout that traps a poor initialization (challenge lab)
const CLOUDX = [
  [-4.3, 0.4], [-3.7, 0.8], [-4.5, -0.5], [-3.9, -0.9], [-4.1, 0.1], [-3.5, 0.5], [-4.6, 0.9], [-3.8, -0.3],
  [2.8, 2.3], [3.5, 2.9], [3.1, 2.0], [3.7, 2.7], [2.9, 3.1], [3.3, 2.4],
  [2.9, -2.4], [3.5, -2.9], [3.1, -2.1], [3.7, -2.6], [2.8, -3.0], [3.3, -2.3],
];
const BADINIT = [{ x: -4.6, y: 0.6 }, { x: -3.4, y: -0.7 }, { x: 3.2, y: 0 }];
// 1-D two-group data for the mixture lab
const GMM1 = [-3.1, -2.6, -2.2, -1.9, -1.5, -2.8, -1.7, -2.4, -2.0, -3.0,
              1.4, 1.9, 2.3, 2.7, 3.1, 1.6, 2.5, 2.0, 2.9, 1.8];
// 1-D data straddling two means (hard/soft limit lab); no point sits at the midpoint 0
const HARDPTS = [-2.6, -2.1, -1.6, -1.1, -0.5, 0.4, 1.0, 1.5, 2.0, 2.5];
// an elongated cloud for PCA direction + reconstruction labs
const PCA_CLOUD = [
  [-3.2, -1.6], [-2.4, -1.5], [-1.8, -0.7], [-1.1, -0.9], [-0.4, -0.1], [0.2, -0.5],
  [0.9, 0.7], [1.5, 0.4], [2.2, 1.4], [2.8, 1.2], [3.4, 2.0], [-2.0, -0.6], [1.0, 0.1], [0.4, 0.6],
];
// correlated data where feature x is stored on a ~3x larger scale than y
const PCA_SCALE = [
  [-5.6, -1.6], [-4.2, -1.0], [-2.8, -1.2], [-1.4, -0.3], [0, 0.2], [1.4, -0.2],
  [2.8, 0.9], [4.2, 1.1], [5.6, 1.5], [-2.8, -0.7], [2.8, 0.4], [0.8, 0.6],
];

// a small button row for step-through interactives
function actionRow(parent, items) {
  const d = document.createElement('div'); d.className = 'ctrl';
  const row = document.createElement('div'); row.className = 'chipbtns';
  const btns = items.map(([label, fn]) => {
    const b = document.createElement('button'); b.className = 'chip'; b.innerHTML = label; b.onclick = fn; row.appendChild(b); return b;
  });
  d.appendChild(row); parent.appendChild(d); return btns;
}
function centroidMark(ctx, x, y, color) {
  ctx.save();
  ctx.fillStyle = color; ctx.strokeStyle = '#0b0f22'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#0b0f22'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke();
  ctx.restore();
}

/* ================================================================
   LESSON 1 — k-means clustering (order 40)
   ================================================================ */
registerLesson({
  id: 'ml-kmeans', world: 'ml', order: 40, emoji: '🎯', title: 'Clustering: k-means',
  sub: 'No labels — just find the groups. k-means alternates two cheap steps: assign every point to its nearest centroid, then move each centroid to the mean of its points.',
  learn: `<p><strong>Clustering</strong> is unsupervised: you get points with <em>no</em> labels and must discover the groups yourself. <strong>k-means</strong> is the workhorse. You pick a number of clusters <strong>k</strong>, and the algorithm partitions the data by minimizing the <strong>within-cluster sum of squares</strong> (WCSS), also called the <strong>inertia</strong> or distortion:</p>
  <div class="formula">$$J = \\sum_{k=1}^{K} \\sum_{i \\in C_k} \\lVert x_i - \\mu_k \\rVert^2$$</div>
  <p>Here \\(\\mu_k\\) is the centroid (mean) of cluster \\(C_k\\). J is the total squared distance from each point to its own cluster's center — smaller J means tighter clusters. Minimizing J jointly over the assignments AND the centroids is NP-hard, so we use <strong>Lloyd's algorithm</strong>, which alternates two steps that each lower J:</p>
  <p>• <strong>Assignment step</strong> — with the centroids fixed, put each point in the cluster whose centroid is nearest. This is the best you can do for J holding the centroids still.<br>
  • <strong>Update step</strong> — with the assignments fixed, move each centroid to the <em>mean</em> of the points assigned to it. The mean is exactly the point that minimizes the sum of squared distances, so this is the best you can do for J holding the assignments still.</p>
  <p>Because <em>each</em> step can only decrease (or leave unchanged) J, and there are finitely many possible assignments, the algorithm is guaranteed to converge in a finite number of steps. But — and this is the whole personality of k-means — it converges to a <strong>local</strong> minimum, not necessarily the global one. Where it lands depends entirely on the initial centroids.</p>
  <p>Two practical consequences you will meet in the labs:</p>
  <p>• <strong>Initialization matters.</strong> A bad start can strand the algorithm in a poor clustering. The standard fix is <strong>k-means++</strong>, which seeds centroids far apart (probability of picking a point as the next seed grows with its squared distance to the nearest existing seed), then runs Lloyd. It usually finds a much better optimum.<br>
  • <strong>Choosing k.</strong> J always shrinks as you add clusters (with k = N, every point is its own centroid and J = 0), so you cannot just minimize J. The <strong>elbow method</strong> plots J against k and looks for the "elbow" — the k after which extra clusters barely help. That bend is your estimate of the natural number of groups.</p>`,
  ml: `k-means is the first thing people reach for to <b>find structure in unlabeled data</b>: customer segments, color quantization (compressing an image to k colors is literally k-means on pixel RGB vectors), document topic grouping, and vector-quantization codebooks. It is also the classic warm-up for the deeper idea in the next lesson — the assignment/update loop is a <b>hard-assignment special case of the Expectation-Maximization algorithm</b>. And the "minimize squared distance to a center" objective is the same least-squares geometry you have seen since fitting a line: the mean is the least-squares point, which is exactly why the update step uses the mean.`,
  deeper: [
    { title: '😵 Stuck? Why does the mean minimize squared distance?', body: 'Fix a set of points and ask: what single point c minimizes the sum of squared distances Σ‖x − c‖²? Take the derivative with respect to c and set it to zero: Σ 2(c − x) = 0, so c = (1/n) Σ x — the mean. That is the entire justification for the update step. k-means uses squared (not absolute) distance precisely because the minimizer is the easy-to-compute mean; if you used absolute distance you would get k-medians and the update would move to the median instead.' },
    { title: '🚀 Go deeper: why it can only ever go downhill', body: 'Think of J as a function of two things: the assignments and the centroids. The assignment step minimizes J over assignments with centroids frozen; the update step minimizes J over centroids with assignments frozen. This is <b>coordinate descent</b> — alternating exact minimizations over two blocks. Each block-minimization cannot raise J, so J is non-increasing and, being bounded below by 0, must converge. What it does NOT guarantee is the global minimum: coordinate descent stops at the first configuration where neither step can improve, which may be a local trap. Reference: Bishop, <em>Pattern Recognition and Machine Learning</em>, §9.1; Lloyd (1982), "Least squares quantization in PCM".' },
    { title: '🚀 Go deeper: k-means++ and the elbow, honestly', body: 'k-means++ (Arthur & Vassilvitskii, 2007) gives an O(log k) expected-approximation guarantee just from the smarter seeding — a rare case where a tiny initialization change comes with real theory. The elbow method, by contrast, is a heuristic with no guarantee; the bend is often ambiguous. More principled alternatives include the <b>silhouette score</b> and the <b>gap statistic</b> (Tibshirani et al.), which compare within-cluster tightness to a null reference. See Hastie, Tibshirani & Friedman, <em>The Elements of Statistical Learning</em>, §14.3.' },
  ],
  labs: [
    { key: 'step', title: 'Step through Lloyd\'s algorithm', interactive: 'km-step',
      intro: '<p>Three blobs, three centroids that start out of place. Click <b>Assign</b> (color each point by its nearest centroid) then <b>Move centroids</b> (slide each centroid to its cluster mean), and repeat. Watch the distortion curve in the corner: it only ever falls, and the centroids stop moving once you reach a local optimum.</p>' },
    { key: 'failure', title: 'Failure modes: wrong k & local minima', interactive: 'km-init',
      intro: '<p>k-means has two ways to disappoint you. First predict the local-minimum question, then explore: sweep <b>k</b> to see the elbow, and <b>Reseed</b> at k = 3 until a run lands in a visibly worse clustering — proof that where you start decides where you finish.</p>' },
    { key: 'challenge', title: 'Challenge: beat the algorithm by hand', interactive: 'km-challenge',
      intro: '<p>The algorithm was started from a poor initialization and got stuck. You have three centroids to drag. Can you place them so your distortion beats the algorithm\'s — and land within a whisker of the true global optimum? This is what a good initialization buys you.</p>' },
  ],
  quiz: [
    { q: 'What objective does k-means minimize?',
      opts: ['The within-cluster sum of squared distances (inertia / WCSS)', 'The number of clusters k', 'The distance between different clusters\' centroids', 'The classification accuracy against the true labels'],
      a: 0, tag: 'what k-means optimizes',
      focus: 'k-means minimizes J = Σ over clusters Σ over their points of ‖x − μ‖² — total squared distance to each point\'s own centroid.',
      why: 'k-means minimizes J = Σ_k Σ_{i∈C_k} ‖x_i − μ_k‖², the total squared distance from every point to its assigned centroid. Smaller J = tighter clusters.',
      wrong: { 1: 'k is a fixed input you choose, not something k-means optimizes — indeed J keeps falling as k grows, which is why choosing k needs a separate method (the elbow).',
               2: 'k-means never looks at between-centroid distances; its objective is purely the within-cluster spread. Maximizing between-cluster separation is a different criterion.',
               3: 'Clustering is unsupervised — there are no true labels to score against. k-means only sees the points and their squared distances.' } },
    { q: 'In the assignment step, with the centroids held fixed, each point is put in the cluster whose centroid is…',
      opts: ['Nearest to it', 'Farthest from it', 'The one with the fewest points so far', 'Chosen at random each iteration'],
      a: 0, tag: 'assignment step',
      focus: 'Assignment step: with centroids frozen, nearest-centroid assignment is the exact minimizer of J over assignments.',
      why: 'With centroids frozen, J is minimized by sending each point to its nearest centroid — any other choice would add a larger squared distance. That is the exact best assignment.',
      wrong: { 1: 'Assigning to the farthest centroid would maximize distances and blow up J — the opposite of the goal.',
               2: 'k-means does not balance cluster sizes; it only cares about squared distance. Clusters can end up very uneven.',
               3: 'Assignment is deterministic given the centroids (nearest wins). Randomness only enters at initialization.' } },
    { q: 'In the update step, with the assignments held fixed, each centroid moves to…',
      opts: ['The mean of the points assigned to it', 'The median of its points', 'The point in the cluster closest to the origin', 'A random point in the cluster'],
      a: 0, tag: 'centroid update',
      focus: 'Update step: the mean minimizes Σ‖x − c‖², so the centroid moves to the mean of its assigned points.',
      why: 'The mean is the unique point minimizing the sum of squared distances to a set (set the derivative Σ 2(c − x) = 0 to get c = mean). So moving to the mean is the exact best centroid for that objective.',
      wrong: { 1: 'The median minimizes the sum of ABSOLUTE distances — that is k-medians, a different algorithm. Squared distance gives the mean.',
               2: 'The origin is irrelevant; the centroid is defined only by the cluster\'s own points, via their mean.',
               3: 'The update is deterministic: the mean. Randomness would break the monotonic decrease in J.' } },
    { type: 'order',
      q: 'Arrange the steps of one full iteration of Lloyd\'s algorithm (k-means), starting from a set of centroids:',
      tag: 'lloyd iteration order',
      steps: [
        'Assign every point to its nearest current centroid.',
        'Recompute each centroid as the mean of the points now assigned to it.',
        'Check whether any assignment changed this round.',
        'If assignments changed, repeat; if none changed, the algorithm has converged.',
      ],
      why: 'One Lloyd iteration is: assign points to nearest centroids, move centroids to their cluster means, then test for a change. No change means a stable local optimum has been reached.' },
    { q: 'Two runs of k-means on the SAME data with the SAME k but DIFFERENT random initial centroids can…',
      opts: ['Converge to different clusterings, because k-means only finds a local optimum', 'Only ever produce identical results — the answer is unique', 'Never converge, looping forever', 'Always find the global optimum regardless of the start'],
      a: 0, tag: 'local minima',
      focus: 'k-means is coordinate descent to a LOCAL optimum; the initialization determines which local optimum you reach.',
      why: 'k-means descends to a local optimum, and which one depends on where the centroids start. Different initializations can land in different valleys with different distortions — that is why practitioners run it several times and keep the best.',
      wrong: { 1: 'The clustering is not unique; the objective is non-convex and has many local minima reachable from different starts.',
               2: 'It always converges in finitely many steps — J strictly decreases until assignments stabilize, and there are finitely many assignments.',
               3: 'It finds a LOCAL, not global, optimum. Reaching the global one is not guaranteed; better seeding (k-means++) or multiple restarts just make it more likely.' } },
    { q: 'What problem does k-means++ initialization address?',
      opts: ['Poor local minima from a bad random start, by seeding centroids spread far apart', 'The number of clusters being unknown', 'Points having too many features', 'The update step being too slow to compute a mean'],
      a: 0, tag: 'k-means++ init',
      focus: 'k-means++ seeds centroids far apart (probability ∝ squared distance to nearest seed) to avoid poor local optima.',
      why: 'k-means++ chooses initial centroids to be spread out — each new seed is picked with probability proportional to its squared distance from the nearest existing seed — which reliably avoids the bad local minima a naive random start can fall into.',
      wrong: { 1: 'k-means++ still needs you to supply k; it improves the STARTING POSITIONS, not the choice of how many clusters.',
               2: 'High dimensionality is a separate concern (and often handled by PCA first). k-means++ is purely a seeding strategy.',
               3: 'Computing a mean is already trivial and fast; the bottleneck k-means++ fixes is solution QUALITY, not update speed.' } },
    { type: 'numeric',
      q: 'A cluster contains the four 1-D points {2, 4, 4, 10}. After the update step, where does its centroid move? (Enter the new centroid value.)',
      answer: 5, tol: 0.01, tag: 'computing a centroid',
      hint: 'The update step sets the centroid to the mean of the assigned points: (2 + 4 + 4 + 10) / 4.',
      why: 'The centroid is the mean of its assigned points: (2 + 4 + 4 + 10)/4 = 20/4 = 5. The mean is the value minimizing the sum of squared distances, which is exactly what the update step optimizes.' },
    { q: 'You plot inertia J against k and see it drop steeply from k = 1 to k = 3, then flatten out. The elbow method suggests…',
      opts: ['k ≈ 3 — the point after which extra clusters barely reduce J', 'The largest k you tried, since J is smallest there', 'k = 1, since that is where J is largest', 'Any k — the plot carries no information'],
      a: 0, tag: 'choosing k elbow',
      focus: 'The elbow is the k where J\'s decrease sharply flattens; adding clusters past it buys little. Here that is k ≈ 3.',
      why: 'J always decreases with k, so you cannot just minimize it. The elbow — where the curve bends from steep to shallow — marks the point where new clusters stop capturing real structure. A steep drop through k = 3 then a plateau points to k ≈ 3.',
      wrong: { 1: 'J is always smallest at the largest k (at k = N it hits 0), so "smallest J" would always pick the most clusters — over-fitting the data into singletons.',
               2: 'k = 1 gives the LARGEST J (one center for everything). The elbow is about where the improvement flattens, not where J is biggest.',
               3: 'The shape is exactly the information: a clear bend at k = 3 is the estimate of the natural number of groups.' } },
    { q: 'Why is k-means guaranteed to converge (stop) but NOT guaranteed to find the best possible clustering?',
      opts: ['Each step lowers J and assignments are finite (so it must stop), but it stops at a local — not necessarily global — minimum', 'It uses a fixed learning rate that always reaches the global optimum', 'It never actually converges; it is stopped by a time limit', 'It is convex, so the local minimum is always global'],
      a: 0, tag: 'convergence guarantee',
      focus: 'Monotonic decrease + finitely many assignments forces convergence; non-convexity of J means it is only a local optimum.',
      why: 'Both steps are exact block-minimizations, so J never increases; since there are finitely many possible assignments, J cannot decrease forever and must settle. But the objective is non-convex, so the settling point is only a local minimum.',
      wrong: { 1: 'k-means has no learning rate — the update jumps straight to the mean. And nothing guarantees the global optimum.',
               2: 'It genuinely converges (assignments stop changing); a time limit is not what stops it.',
               3: 'The WCSS objective over assignments-and-centroids is non-convex — that is exactly why local minima exist and initialization matters.' } },
  ],
});

/* ---------- Lab 1a — step through Lloyd's algorithm ---------- */
INTERACTIVES['km-step'] = function (stage, api) {
  const L = makeLab(stage, { h: 470 });
  const P = plane(L.ctx, L.W, L.H, 42);
  const pts = CLOUD3.map(p => ({ x: p[0], y: p[1] }));
  const init = [{ x: -1.5, y: 3.4 }, { x: 1.6, y: 3.4 }, { x: 0, y: -0.6 }];
  const target = lloyd(pts, init).inertia;            // converged distortion for this init
  let cents, asg, nA, nM, hist, everUp, lastInertia, converged;
  function reset() {
    cents = init.map(c => ({ x: c.x, y: c.y }));
    asg = pts.map(() => -1);
    nA = 0; nM = 0; hist = []; everUp = false; lastInertia = Infinity; converged = false;
    draw();
  }
  function record() {
    let inr = 0; for (let i = 0; i < pts.length; i++) if (asg[i] >= 0) inr += d2(pts[i], cents[asg[i]]);
    if (isFinite(lastInertia) && inr > lastInertia + 1e-6) everUp = true;
    lastInertia = inr; hist.push(inr); if (hist.length > 80) hist.shift();
    return inr;
  }
  function doAssign() {
    const na = assignAll(pts, cents);
    const changed = na.some((v, i) => v !== asg[i]);
    asg = na; nA++;
    if (nM >= 1 && !changed) converged = true;
    record(); draw();
  }
  function doMove() {
    if (asg.every(a => a < 0)) return;                // must assign before first move
    const nc = updateCents(pts, asg, cents.length);
    for (let k = 0; k < cents.length; k++) if (nc[k]) cents[k] = nc[k];
    nM++; record(); draw();
  }
  const m = api.missions([
    { text: 'Run one full round: click <b>Assign</b>, then <b>Move centroids</b>', xp: 20, check: s => s.nA >= 1 && s.nM >= 1 },
    { text: 'Keep alternating until the centroids stop moving — reach <b>convergence</b>', xp: 25, check: s => s.converged },
    { text: 'Confirm the distortion only ever falls: drive inertia down to the converged clustering', xp: 20, check: s => s.nA >= 2 && s.inertia <= target * 1.08 && !s.everUp },
  ]);
  function draw() {
    clearBg(L.ctx, L.W, L.H); P.grid();
    // membership lines + points colored by current assignment
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], a = asg[i];
      if (a >= 0) {
        L.ctx.strokeStyle = 'rgba(255,255,255,.12)'; L.ctx.lineWidth = 1.2;
        L.ctx.beginPath(); L.ctx.moveTo(P.sx(p.x), P.sy(p.y)); L.ctx.lineTo(P.sx(cents[a].x), P.sy(cents[a].y)); L.ctx.stroke();
      }
      P.dot(p.x, p.y, 6, a < 0 ? '#6b7394' : CLR[a]);
    }
    for (let k = 0; k < cents.length; k++) centroidMark(L.ctx, P.sx(cents[k].x), P.sy(cents[k].y), CLR[k]);
    // distortion sparkline inset (top-right)
    if (hist.length > 1) {
      const bx = L.W - 168, by = 14, bw = 150, bh = 66;
      L.ctx.fillStyle = 'rgba(10,14,34,.82)'; L.ctx.fillRect(bx, by, bw, bh);
      L.ctx.strokeStyle = 'rgba(255,255,255,.18)'; L.ctx.strokeRect(bx, by, bw, bh);
      const mx = Math.max(...hist), mn = Math.min(...hist), rng = Math.max(1e-6, mx - mn);
      L.ctx.strokeStyle = '#2dd4a0'; L.ctx.lineWidth = 2; L.ctx.beginPath();
      hist.forEach((v, i) => { const x = bx + 8 + (bw - 16) * i / (hist.length - 1), y = by + 10 + (bh - 22) * (1 - (v - mn) / rng);
        i ? L.ctx.lineTo(x, y) : L.ctx.moveTo(x, y); });
      L.ctx.stroke();
      L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '600 10px ' + getComputedStyle(document.body).fontFamily;
      L.ctx.fillText('distortion J (only falls)', bx + 8, by + bh - 4);
    }
    const phase = converged ? 'converged — assignments stable' : (nA === 0 ? 'click Assign to begin' : (nA > nM ? 'assigned — now Move centroids' : 'centroids moved — Assign again'));
    L.readout.innerHTML = 'assign steps = ' + nA + ' · update steps = ' + nM +
      '<br><span style="color:#2dd4a0">inertia J = ' + (nA ? lastInertia.toFixed(2) : '—') + '</span>' +
      '<br>' + phase;
    m.update({ nA, nM, inertia: lastInertia, converged, everUp });
  }
  actionRow(L.ctrl, [['① Assign points', doAssign], ['② Move centroids', doMove], ['↺ Reset', reset]]);
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Each <b>Assign</b> recolors points by nearest centroid; each <b>Move</b> slides a centroid (the +) to its cluster mean. Neither step can raise the distortion J — the sparkline can only go down or flat. When an Assign changes nothing, you have hit a local optimum.</div>';
  L.ctrl.appendChild(note);
  reset();
};

/* ---------- Lab 1b — wrong k (elbow) & local minima ---------- */
INTERACTIVES['km-init'] = function (stage, api) {
  const L = makeLab(stage, { h: 470 });
  const P = plane(L.ctx, L.W, L.H, 42);
  const pts = CLOUD3.map(p => ({ x: p[0], y: p[1] }));
  // reference elbow curve: best-of-restarts distortion for k = 1..6
  const elbow = [0]; for (let kk = 1; kk <= 6; kk++) elbow[kk] = bestLloyd(pts, kk, 12).inertia;
  let k = 2, run = lloyd(pts, forgy(pts, k));
  const bestAtK = {}; let badSeen = false;
  function reseed() {
    run = lloyd(pts, forgy(pts, k));
    if (bestAtK[k] === undefined || run.inertia < bestAtK[k]) bestAtK[k] = run.inertia;
    if (k === 3 && run.inertia > elbow[3] * 1.35) badSeen = true;
    draw();
  }
  api.predict({
    prompt: 'Same data, same k = 3, but two DIFFERENT random initial centroids. Will Lloyd\'s algorithm always drive both to the SAME final clustering?',
    choices: [
      'Yes — the objective has one answer, so both must converge to it',
      'No — different starts can land in different local minima',
      'Yes, but only if you run enough iterations',
      'No — one of the two will simply fail to converge',
    ],
    answer: 1,
    reveal: 'No. The WCSS objective is <b>non-convex</b>, so Lloyd descends to whichever local minimum is nearest its starting point. Two initializations can converge to genuinely different clusterings with different distortions. Running longer does not help — each run has already converged; it is just converged to a different valley. This is why k-means is run multiple times (or seeded with k-means++) and the lowest-distortion result is kept.',
  });
  const m = api.missions([
    { text: 'Sweep <b>k</b> and stop at the elbow — the k where the curve bends from steep to flat. Set <b>k = 3</b>', xp: 22, check: s => s.k === 3 },
    { text: 'At k = 3, hit <b>Reseed</b> until a run lands in a clearly worse local minimum (well above the best distortion)', xp: 25, check: s => s.badSeen },
  ]);
  function draw() {
    clearBg(L.ctx, L.W, L.H); P.grid();
    for (let i = 0; i < pts.length; i++) P.dot(pts[i].x, pts[i].y, 6, CLR[run.asg[i] % CLR.length]);
    for (let j = 0; j < run.cents.length; j++) centroidMark(L.ctx, P.sx(run.cents[j].x), P.sy(run.cents[j].y), CLR[j % CLR.length]);
    // elbow bar chart inset (bottom-left)
    const bx = 16, by = L.H - 92, bw = 176, bh = 76;
    L.ctx.fillStyle = 'rgba(10,14,34,.82)'; L.ctx.fillRect(bx, by, bw, bh);
    L.ctx.strokeStyle = 'rgba(255,255,255,.18)'; L.ctx.strokeRect(bx, by, bw, bh);
    const mx = elbow[1];
    for (let kk = 1; kk <= 6; kk++) {
      const x = bx + 12 + (kk - 1) * 26, h = (bh - 26) * elbow[kk] / mx;
      L.ctx.fillStyle = kk === k ? '#ffc94d' : 'rgba(124,92,255,.7)';
      L.ctx.fillRect(x, by + bh - 12 - h, 18, h);
      L.ctx.fillStyle = '#8b93b8'; L.ctx.font = '600 10px ' + getComputedStyle(document.body).fontFamily;
      L.ctx.fillText('' + kk, x + 5, by + bh - 2);
    }
    L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = '700 11px ' + getComputedStyle(document.body).fontFamily;
    L.ctx.fillText('distortion vs k', bx + 8, by + 14);
    const bestHere = bestAtK[k] !== undefined ? bestAtK[k] : run.inertia;
    L.readout.innerHTML = 'k = ' + k + ' · this run\'s distortion = <b>' + run.inertia.toFixed(2) + '</b>' +
      '<br>best seen at k = ' + k + ': ' + bestHere.toFixed(2) +
      '<br><span style="color:#ff9db1">' + (badSeen ? 'caught a bad local minimum!' : 'k-means only finds LOCAL optima') + '</span>';
    m.update({ k, inertia: run.inertia, badSeen });
  }
  slider(L.ctrl, 'k — number of clusters', 2, 6, 1, k, v => '' + v, v => { k = v; reseed(); });
  actionRow(L.ctrl, [['🎲 Reseed initialization', reseed]]);
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The inset bars are the best distortion at each k — notice the steep drop to k = 3, then a plateau (the <b>elbow</b>). At a fixed k, <b>Reseed</b> restarts Lloyd from new random centroids; most restarts find the good clustering, but some get trapped higher. Same k, same data, different answer.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ---------- Lab 1c — beat the algorithm by hand ---------- */
INTERACTIVES['km-challenge'] = function (stage, api) {
  const L = makeLab(stage, { h: 470 });
  const P = plane(L.ctx, L.W, L.H, 40);
  const pts = CLOUDX.map(p => ({ x: p[0], y: p[1] }));
  const algo = lloyd(pts, BADINIT).inertia;           // stuck-from-a-poor-start distortion
  const globalBest = bestLloyd(pts, 3, 60).inertia;   // best of many restarts
  let cents = [{ x: -2, y: 3.6 }, { x: 0, y: 3.6 }, { x: 2, y: 3.6 }];
  let drag = null;
  function state() {
    const asg = assignAll(pts, cents);
    const sizes = [0, 0, 0]; for (const a of asg) sizes[a]++;
    return { asg, sizes, inertia: inertiaOf(pts, cents, asg) };
  }
  const m = api.missions([
    { text: 'Give every centroid some points — no empty clusters (all three sizes &gt; 0)', xp: 18, check: s => Math.min(...s.sizes) > 0 },
    { text: 'Beat the stuck algorithm: get your distortion <b>below</b> its poor-start value', xp: 25, check: s => s.inertia < algo },
    { text: 'Nail the global optimum: land within <b>5%</b> of the best-possible distortion', xp: 22, check: s => s.inertia <= globalBest * 1.05 },
  ]);
  function draw() {
    clearBg(L.ctx, L.W, L.H); P.grid();
    const st = state();
    for (let i = 0; i < pts.length; i++) P.dot(pts[i].x, pts[i].y, 6, CLR[st.asg[i]]);
    for (let k = 0; k < cents.length; k++) centroidMark(L.ctx, P.sx(cents[k].x), P.sy(cents[k].y), CLR[k]);
    const beat = st.inertia < algo;
    L.readout.innerHTML = 'your distortion = <b style="color:' + (beat ? '#2dd4a0' : '#ff9db1') + '">' + st.inertia.toFixed(2) + '</b>' +
      '<br>algorithm (poor start, stuck) = ' + algo.toFixed(2) +
      '<br>global optimum (best of 60 restarts) = ' + globalBest.toFixed(2);
    m.update(st);
  }
  L.canvas.addEventListener('pointerdown', e => {
    const c = L.toCanvas(e); let bi = -1, bd = 22 * 22;
    for (let k = 0; k < cents.length; k++) { const dx = c.x - P.sx(cents[k].x), dy = c.y - P.sy(cents[k].y), d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = k; } }
    drag = bi; if (bi >= 0) { L.canvas.setPointerCapture(e.pointerId); move(e); }
  });
  L.canvas.addEventListener('pointermove', move);
  L.canvas.addEventListener('pointerup', () => drag = null);
  function move(e) { if (drag < 0 || drag == null) return; const c = L.toCanvas(e);
    cents[drag] = { x: Math.round(P.wx(c.x) * 4) / 4, y: Math.round(P.wy(c.y) * 4) / 4 }; draw(); }
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Drag the three <b>+</b> markers. Points recolor to their nearest centroid live. The algorithm started with two centroids crowded into the left blob and one between the right pair — a trap it never escaped. Put one centroid in the heart of each of the three real groups and you will crush its distortion.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================================================================
   LESSON 2 — Mixture models & EM (order 41)
   ================================================================ */
registerLesson({
  id: 'ml-gmm', world: 'ml', order: 41, emoji: '🌫️', title: 'Mixture Models & EM',
  sub: 'k-means makes hard calls: this point is cluster 2, full stop. A Gaussian mixture is honest about doubt — each point gets a soft responsibility split across clusters, fit by Expectation-Maximization.',
  learn: `<p>k-means draws hard boundaries. But a point sitting between two clusters is genuinely ambiguous, and pretending otherwise throws away information. A <strong>Gaussian mixture model</strong> (GMM) instead treats the data as generated by K Gaussian "components", each with its own mean \\(\\mu_k\\), variance \\(\\Sigma_k\\), and a <strong>mixing weight</strong> \\(\\pi_k\\) (the components\' prior probabilities, which sum to 1):</p>
  <div class="formula">$$p(x) = \\sum_{k=1}^{K} \\pi_k\\, \\mathcal{N}(x \\mid \\mu_k, \\Sigma_k)$$</div>
  <p>To "cluster", we ask a softer question than k-means: given a point x, what is the probability it came from component k? That posterior is the <strong>responsibility</strong>:</p>
  <div class="formula">$$r_{ik} = \\frac{\\pi_k\\, \\mathcal{N}(x_i \\mid \\mu_k, \\Sigma_k)}{\\sum_{j} \\pi_j\\, \\mathcal{N}(x_i \\mid \\mu_j, \\Sigma_j)}$$</div>
  <p>Each point\'s responsibilities across the K components sum to 1 — a soft membership, not a hard label. A point squarely inside one bump gets responsibility ≈ 1 there; a point on the fence gets something like 0.5 / 0.5.</p>
  <p>We fit the parameters by <strong>maximum likelihood</strong> — maximize the log-likelihood of the data, \\(\\sum_i \\log \\sum_k \\pi_k \\mathcal{N}(x_i \\mid \\mu_k, \\Sigma_k)\\). That log-of-a-sum has no closed-form maximum, so we use <strong>Expectation-Maximization (EM)</strong>, which alternates two steps:</p>
  <p>• <strong>E-step</strong> — with parameters fixed, compute every responsibility \\(r_{ik}\\) (the equation above). This is the "soft assignment".<br>
  • <strong>M-step</strong> — with responsibilities fixed, re-estimate the parameters as responsibility-weighted statistics:</p>
  <div class="formula">$$N_k = \\sum_i r_{ik}, \\qquad \\pi_k = \\frac{N_k}{N}, \\qquad \\mu_k = \\frac{1}{N_k}\\sum_i r_{ik}\\, x_i, \\qquad \\Sigma_k = \\frac{1}{N_k}\\sum_i r_{ik}\\,(x_i - \\mu_k)(x_i - \\mu_k)^{\\!\\top}$$</div>
  <p>These are just the ordinary mean/variance/weight formulas, except every point is counted <em>fractionally</em> by how much it belongs to component k. Crucially, <strong>EM never decreases the log-likelihood</strong>: the E-step builds a tight lower bound on the likelihood at the current parameters, and the M-step maximizes that bound. So the likelihood climbs (or holds) every iteration and converges — to a local maximum.</p>
  <p>Finally, the link back to lesson 1: <strong>k-means is EM in the hard-assignment limit.</strong> Fix every component to a shared spherical covariance \\(\\Sigma_k = \\sigma^2 I\\) and let \\(\\sigma \\to 0\\). The responsibilities become winner-take-all — the nearest mean gets \\(r = 1\\), the rest get 0 — so the E-step collapses into k-means\' assignment step, and the weighted M-step collapses into "move to the cluster mean". k-means is the crisp shadow that a Gaussian mixture casts as its uncertainty vanishes.</p>`,
  ml: `EM and mixture models are foundational far beyond clustering. The <b>soft-assignment</b> idea — responsibilities instead of hard labels — is the ancestor of attention weights and of the "expected sufficient statistics" trick used throughout probabilistic ML. EM itself trains hidden Markov models (classical speech recognition), fits topic models, and imputes missing data. The deeper object it optimizes, the <b>evidence lower bound (ELBO)</b>, is exactly the quantity variational autoencoders and modern variational inference maximize — EM is the special case where the E-step can be solved exactly. Understanding "climb a lower bound you can compute, then tighten it" is understanding a huge slice of how latent-variable models are trained.`,
  deeper: [
    { title: '😵 Stuck? Responsibility vs. hard label', body: 'A hard label says "point 7 is in cluster 2." A responsibility says "point 7 is 80% cluster 2, 20% cluster 1." The responsibility is literally a posterior probability: r_ik = P(component k | point i), computed by Bayes\' rule with the mixing weights as the prior and the Gaussian densities as the likelihood. Summing over k gives 1 because the point came from SOME component. When the components are far apart every responsibility is near 0 or 1 and the soft picture looks hard; the softness only matters where bumps overlap.' },
    { title: '🚀 Go deeper: why EM can never go downhill', body: 'The log-likelihood is log Σ_k π_k N — a log of a sum, hard to maximize directly. EM introduces the responsibilities to build a lower bound (via Jensen\'s inequality) that touches the true log-likelihood exactly at the current parameters. The <b>E-step</b> makes the bound tight (equality) at the current θ; the <b>M-step</b> moves θ to maximize that bound. Since the bound never exceeds the true likelihood but the M-step raised the bound above its old tight value, the true likelihood must have risen at least as much. Hence monotone ascent. This is the ELBO decomposition: log p(x) = ELBO(q, θ) + KL(q ‖ posterior); the E-step zeroes the KL term, the M-step climbs the ELBO. Reference: Bishop, <em>PRML</em>, §9.2–9.4; Dempster, Laird & Rubin (1977).' },
    { title: '🚀 Go deeper: GMM beats k-means on stretched clusters', body: 'Because k-means only tracks means and uses plain Euclidean distance, it implicitly assumes round, equally-sized blobs — it slices space with straight perpendicular bisectors. A full GMM learns each component\'s <em>covariance</em>, so it can model elongated or differently-scaled clusters and its boundaries curve. The price is more parameters to estimate and a genuine risk of degeneracy: a component can collapse onto a single point, sending its variance to 0 and the likelihood to +∞. Practical fixes cap or regularize the covariance. See Hastie, Tibshirani & Friedman, <em>ESL</em>, §8.5 and §14.3.7.' },
  ],
  labs: [
    { key: 'em', title: 'Fit a two-Gaussian mixture with EM', interactive: 'gmm-em',
      intro: '<p>Twenty points on a line, split into two groups. Set a rough initial guess with the sliders, then alternate <b>E-step</b> (shade each point by its responsibility) and <b>M-step</b> (re-estimate μ, σ, π from the weighted points). Watch the log-likelihood in the corner climb — and never fall — until it converges.</p>' },
    { key: 'limit', title: 'k-means as the σ → 0 limit of EM', interactive: 'gmm-hardlimit',
      intro: '<p>Two fixed means, and one knob: the shared component width σ. In <b>soft</b> mode, shrink σ toward 0 and watch every responsibility collapse to 0 or 1 — the E-step turning into k-means\' nearest-mean assignment. Then toggle <b>hard</b> mode to see the crisp limit directly.</p>' },
  ],
  quiz: [
    { q: 'In a Gaussian mixture, the responsibility r_ik of component k for point x_i is…',
      opts: ['The posterior probability that x_i was generated by component k', 'The Euclidean distance from x_i to component k\'s mean', 'A hard 0/1 label of which cluster x_i belongs to', 'The mixing weight π_k, the same for every point'],
      a: 0, tag: 'responsibilities',
      focus: 'r_ik = π_k N(x_i|μ_k,Σ_k) / Σ_j π_j N(x_i|μ_j,Σ_j) — a Bayes posterior, summing to 1 over k for each point.',
      why: 'By Bayes\' rule with the mixing weights as prior and the Gaussians as likelihood, r_ik = π_k N(x_i|μ_k) / Σ_j π_j N(x_i|μ_j). It is the posterior probability that point i came from component k, and over k it sums to 1.',
      wrong: { 1: 'Responsibility is a probability built from Gaussian DENSITIES, not a raw distance. Distance appears only inside the exponent of the Gaussian.',
               2: 'The whole point of a mixture is SOFT membership — r_ik lives in [0,1] and splits across components; it is not a 0/1 label.',
               3: 'π_k is the prior weight shared by all points; the responsibility also depends on where x_i falls, so it varies from point to point.' } },
    { q: 'The key difference between k-means assignments and GMM responsibilities is that responsibilities are…',
      opts: ['Soft — each point is split fractionally across components, summing to 1', 'Always exactly 0 or 1, like k-means', 'Computed only for the training set\'s first point', 'Independent of the component variances'],
      a: 0, tag: 'soft vs hard assignment',
      focus: 'GMM gives soft memberships (fractions summing to 1); k-means gives hard 0/1 assignments.',
      why: 'A responsibility spreads a point across components as probabilities that sum to 1, capturing genuine ambiguity near overlapping bumps. k-means forces a single winner (0/1). Softness is exactly what a mixture adds.',
      wrong: { 1: 'That describes k-means (hard 0/1). GMM responsibilities are generally fractional; they only approach 0/1 when components are far apart or variances are tiny.',
               2: 'Responsibilities are computed for every point, not one.',
               3: 'They depend strongly on the variances — narrower components make responsibilities sharper (more decisive).' } },
    { type: 'order',
      q: 'Arrange the Expectation-Maximization procedure for fitting a Gaussian mixture:',
      tag: 'EM step order',
      steps: [
        'Initialize the parameters μ_k, Σ_k, π_k (e.g. from a k-means warm start).',
        'E-step: with parameters fixed, compute every responsibility r_ik.',
        'M-step: with responsibilities fixed, update π_k, μ_k, Σ_k as responsibility-weighted statistics.',
        'Repeat E and M until the log-likelihood stops increasing (convergence).',
      ],
      why: 'EM initializes the parameters, then alternates the E-step (soft assignments given parameters) and M-step (parameters given soft assignments), iterating until the monotonically-rising log-likelihood levels off.' },
    { q: 'Across EM iterations, the data log-likelihood is guaranteed to…',
      opts: ['Never decrease (rise or stay equal) each iteration, converging to a local maximum', 'Strictly increase to the global maximum every time', 'Oscillate up and down until stopped by hand', 'Decrease, since EM minimizes the likelihood'],
      a: 0, tag: 'EM monotonic likelihood',
      focus: 'EM is monotone ascent on the log-likelihood: E-step tightens a lower bound, M-step maximizes it; it converges to a LOCAL max.',
      why: 'The E-step builds a lower bound on the log-likelihood that is tight at the current parameters; the M-step maximizes that bound. So the true likelihood never falls and converges — but only to a local maximum, since the surface is non-convex.',
      wrong: { 1: 'Only monotone ascent is guaranteed, not reaching the GLOBAL maximum — EM can get stuck in a local optimum, just like k-means.',
               2: 'It does not oscillate: the likelihood is non-decreasing every step, which is what guarantees convergence.',
               3: 'EM MAXIMIZES the likelihood (it is a maximum-likelihood method); the likelihood rises, it does not fall.' } },
    { q: 'How is k-means recovered as a special case of EM for a Gaussian mixture?',
      opts: ['Tie all components to a shared spherical covariance σ²I and let σ → 0, so responsibilities become hard 0/1', 'Use a single component (K = 1)', 'Replace the Gaussians with uniform distributions', 'Skip the M-step entirely'],
      a: 0, tag: 'kmeans as EM limit',
      focus: 'With Σ_k = σ²I shared and σ → 0, responsibilities collapse to nearest-mean 0/1 — EM becomes k-means.',
      why: 'As the shared spherical variance σ² → 0, the Gaussian for the nearest mean dominates completely, so each responsibility tends to 1 for the closest component and 0 for the rest. The E-step becomes nearest-centroid assignment and the weighted M-step becomes "move to the mean" — exactly k-means.',
      wrong: { 1: 'K = 1 is just one big cluster — no partitioning at all, not k-means.',
               2: 'Uniform distributions have no notion of a nearest mean; the limit that yields k-means is the vanishing-variance Gaussian, not a uniform.',
               3: 'k-means still has both steps (assign = E, update = M). You take the σ → 0 limit, you do not drop a step.' } },
    { type: 'numeric',
      q: 'Two equal-weight components (π₁ = π₂ = 0.5). For point x, the Gaussian densities are N₁(x) = 0.30 and N₂(x) = 0.10. What is the responsibility r₁ of component 1? (Enter a decimal.)',
      answer: 0.75, tol: 0.01, tag: 'computing a responsibility',
      hint: 'r₁ = π₁N₁ / (π₁N₁ + π₂N₂). With equal weights the 0.5 factors cancel: 0.30 / (0.30 + 0.10).',
      why: 'r₁ = π₁N₁ / (π₁N₁ + π₂N₂) = (0.5·0.30) / (0.5·0.30 + 0.5·0.10) = 0.15 / 0.20 = 0.75. The equal weights cancel, leaving 0.30 / 0.40 = 0.75.' },
    { q: 'In the M-step, the updated mean μ_k of a component is…',
      opts: ['A responsibility-weighted average of all points: Σ_i r_ik x_i / Σ_i r_ik', 'The plain average of only the points hard-assigned to k', 'Left unchanged from the previous iteration', 'The point with the largest responsibility for k'],
      a: 0, tag: 'M-step updates',
      focus: 'M-step updates are responsibility-weighted statistics: μ_k = Σ r_ik x_i / Σ r_ik, and similarly for π_k and Σ_k.',
      why: 'Every point contributes to μ_k in proportion to its responsibility r_ik, giving μ_k = Σ_i r_ik x_i / Σ_i r_ik — the soft-count analog of a cluster mean. π_k and Σ_k are updated the same weighted way.',
      wrong: { 1: 'GMM uses SOFT counts — every point contributes fractionally by r_ik, not a hard subset. Hard-assigning is the k-means special case.',
               2: 'The whole purpose of the M-step is to move the parameters; leaving μ_k fixed would stall EM.',
               3: 'It is a weighted average over ALL points, not a single winner. Picking one point would ignore the rest of the mass.' } },
    { q: 'EM, like k-means, is sensitive to initialization because…',
      opts: ['The log-likelihood is non-convex, so EM converges to a local — not necessarily global — maximum', 'It has a learning rate that must be tuned', 'The Gaussians are not differentiable', 'Responsibilities can exceed 1'],
      a: 0, tag: 'EM local optima',
      focus: 'The mixture log-likelihood is non-convex; EM climbs to a local maximum determined by the starting parameters.',
      why: 'The mixture log-likelihood has many local maxima. EM is monotone ascent, so it settles in the basin it starts in — different initializations give different fits. A common remedy is to warm-start EM from a k-means solution and run several restarts.',
      wrong: { 1: 'EM has no learning rate; the M-step is a closed-form maximization, not a gradient step.',
               2: 'Gaussian densities are perfectly smooth and differentiable; non-convexity, not non-differentiability, is the issue.',
               3: 'Responsibilities are probabilities in [0,1] that sum to 1 — they never exceed 1.' } },
    { q: 'The main reason to use a Gaussian mixture instead of k-means is that it…',
      opts: ['Models cluster shape/size via covariances and reports uncertainty through soft responsibilities', 'Is always faster to run than k-means', 'Removes the need to choose the number of components', 'Guarantees the global optimum'],
      a: 0, tag: 'mixture model purpose',
      focus: 'A GMM adds per-component covariance (shape/scale) and soft, probabilistic membership — a full density model, not just centers.',
      why: 'A GMM learns each component\'s covariance (so clusters can be elongated or unequal) and assigns points softly, yielding both a probabilistic clustering AND a generative density p(x). k-means offers neither.',
      wrong: { 1: 'A GMM is generally SLOWER: more parameters (covariances) and the same iterate-to-convergence loop, often warm-started by k-means itself.',
               2: 'You still pick K (the number of components) for a GMM, just as you pick k for k-means.',
               3: 'Like k-means, EM only reaches a local optimum — no global guarantee.' } },
  ],
});

/* ---------- Lab 2a — fit a two-Gaussian mixture with EM ---------- */
INTERACTIVES['gmm-em'] = function (stage, api) {
  const L = makeLab(stage, { h: 470 });
  const xs = GMM1.slice();
  const W = L.W, H = L.H, base = H - 70, cx = W / 2, sX = 44, sD = 360;
  const px = x => cx + x * sX, pd = d => base - d * sD;
  const c1 = '#00d4ff', c2 = '#ffc94d';
  let pr = { mu1: -1, s1: 1.4, p1: 0.5, mu2: 1, s2: 1.4 };
  let nE = 0, nM = 0, lastLL = null, converged = false;
  // converged log-likelihood from this init (target for mission 3)
  let tp = { ...pr }, targetLL = -Infinity;
  for (let t = 0; t < 300; t++) { const r = emStep(xs, tp); targetLL = r.LL; tp = r.np; }
  function curLL() { let LL = 0; const p2 = 1 - pr.p1; for (const x of xs) LL += Math.log(pr.p1 * gauss(x, pr.mu1, pr.s1) + p2 * gauss(x, pr.mu2, pr.s2)); return LL; }
  function resp(x) { const a = pr.p1 * gauss(x, pr.mu1, pr.s1), b = (1 - pr.p1) * gauss(x, pr.mu2, pr.s2); return a / (a + b); }
  let sMu1, sS1, sP1, sMu2, sS2;
  function syncSliders() { sMu1.set(pr.mu1); sS1.set(pr.s1); sP1.set(pr.p1); sMu2.set(pr.mu2); sS2.set(pr.s2); }
  function doE() { nE++; draw(); }
  function doM() { const r = emStep(xs, pr); pr = { ...r.np }; nM++; const LL = curLL();
    if (nM >= 2 && lastLL != null && Math.abs(LL - lastLL) < 1e-3) converged = true; lastLL = LL; syncSliders(); draw(); }
  const m = api.missions([
    { text: 'Run one <b>E-step</b> (shade the points) and one <b>M-step</b> (move the params)', xp: 20, check: s => s.nE >= 1 && s.nM >= 1 },
    { text: 'Alternate E and M until the log-likelihood stops rising — reach <b>convergence</b>', xp: 25, check: s => s.converged },
    { text: 'Confirm EM climbed to a good fit: log-likelihood within reach of the maximum', xp: 20, check: s => s.nM >= 2 && s.LL >= targetLL - 0.6 },
  ]);
  function draw() {
    clearBg(L.ctx, L.W, L.H);
    // baseline axis
    L.ctx.strokeStyle = 'rgba(255,255,255,.25)'; L.ctx.lineWidth = 1.5;
    L.ctx.beginPath(); L.ctx.moveTo(0, base); L.ctx.lineTo(W, base); L.ctx.stroke();
    // component curves (weighted) + mixture
    const p2 = 1 - pr.p1;
    L.ctx.lineWidth = 2;
    L.ctx.strokeStyle = 'rgba(0,212,255,.6)'; L.ctx.beginPath();
    for (let xx = -7; xx <= 7; xx += 0.05) { const y = pd(pr.p1 * gauss(xx, pr.mu1, pr.s1)); (xx === -7) ? L.ctx.moveTo(px(xx), y) : L.ctx.lineTo(px(xx), y); } L.ctx.stroke();
    L.ctx.strokeStyle = 'rgba(255,201,77,.6)'; L.ctx.beginPath();
    for (let xx = -7; xx <= 7; xx += 0.05) { const y = pd(p2 * gauss(xx, pr.mu2, pr.s2)); (xx === -7) ? L.ctx.moveTo(px(xx), y) : L.ctx.lineTo(px(xx), y); } L.ctx.stroke();
    L.ctx.strokeStyle = '#e8ecff'; L.ctx.lineWidth = 2.5; L.ctx.beginPath();
    for (let xx = -7; xx <= 7; xx += 0.05) { const y = pd(pr.p1 * gauss(xx, pr.mu1, pr.s1) + p2 * gauss(xx, pr.mu2, pr.s2)); (xx === -7) ? L.ctx.moveTo(px(xx), y) : L.ctx.lineTo(px(xx), y); } L.ctx.stroke();
    // mean markers
    [[pr.mu1, c1], [pr.mu2, c2]].forEach(([mu, col]) => { L.ctx.strokeStyle = col; L.ctx.setLineDash([4, 4]); L.ctx.lineWidth = 1.5;
      L.ctx.beginPath(); L.ctx.moveTo(px(mu), base); L.ctx.lineTo(px(mu), 30); L.ctx.stroke(); L.ctx.setLineDash([]); });
    // points shaded by responsibility (only after an E-step, else neutral)
    for (const x of xs) {
      let col = '#8b93b8';
      if (nE >= 1) { const r = resp(x); const mix = t => Math.round(parseInt(c1.slice(1 + t * 2, 3 + t * 2), 16) * r + parseInt(c2.slice(1 + t * 2, 3 + t * 2), 16) * (1 - r));
        col = 'rgb(' + mix(0) + ',' + mix(1) + ',' + mix(2) + ')'; }
      L.ctx.fillStyle = col; L.ctx.beginPath(); L.ctx.arc(px(x), base + 16, 6, 0, 7); L.ctx.fill();
    }
    const LL = curLL();
    L.readout.innerHTML = 'E-steps = ' + nE + ' · M-steps = ' + nM +
      '<br><span style="color:#2dd4a0">log-likelihood = ' + LL.toFixed(3) + '</span> ' + (nM >= 2 ? (LL >= lastLL - 1e-6 ? '↑' : '') : '') +
      '<br>' + (converged ? 'converged' : (nE >= 1 ? 'points shaded by responsibility' : 'set an init, then E-step'));
    m.update({ nE, nM, LL, converged });
  }
  sMu1 = slider(L.ctrl, 'μ₁ — mean of component 1', -5, 5, 0.1, pr.mu1, fmt2, v => { pr.mu1 = v; draw(); });
  sS1 = slider(L.ctrl, 'σ₁ — width of component 1', 0.3, 3, 0.05, pr.s1, fmt2, v => { pr.s1 = v; draw(); });
  sP1 = slider(L.ctrl, 'π₁ — mixing weight of component 1', 0.05, 0.95, 0.01, pr.p1, fmt2, v => { pr.p1 = v; draw(); });
  sMu2 = slider(L.ctrl, 'μ₂ — mean of component 2', -5, 5, 0.1, pr.mu2, fmt2, v => { pr.mu2 = v; draw(); });
  sS2 = slider(L.ctrl, 'σ₂ — width of component 2', 0.3, 3, 0.05, pr.s2, fmt2, v => { pr.s2 = v; draw(); });
  actionRow(L.ctrl, [['E-step (shade)', doE], ['M-step (re-fit)', doM]]);
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Point color blends <b style="color:#00d4ff">cyan</b> (responsibility of component 1) and <b style="color:#ffc94d">gold</b> (component 2). The <b>M-step</b> drags the sliders for you — that is EM re-estimating μ, σ, π from the soft-weighted points. The log-likelihood never dips.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ---------- Lab 2b — k-means as the σ → 0 limit ---------- */
INTERACTIVES['gmm-hardlimit'] = function (stage, api) {
  const L = makeLab(stage, { h: 460 });
  const xs = HARDPTS.slice();
  const W = L.W, H = L.H, base = H - 80, cx = W / 2, sX = 60;
  const px = x => cx + x * sX;
  const mu1 = -2, mu2 = 2, c1 = '#00d4ff', c2 = '#ffc94d';
  let sigma = 1.6, soft = true;
  function respSoft(x) { const a = gauss(x, mu1, sigma), b = gauss(x, mu2, sigma); return a / (a + b); }
  function respOf(x) { return soft ? respSoft(x) : (Math.abs(x - mu1) < Math.abs(x - mu2) ? 1 : 0); }
  function stats() {
    let minConf = 1, hasFuzzy = false;
    for (const x of xs) { const r = respOf(x); minConf = Math.min(minConf, Math.max(r, 1 - r)); if (r > 0.4 && r < 0.6) hasFuzzy = true; }
    return { minConf, hasFuzzy, soft, sigma };
  }
  const m = api.missions([
    { text: 'In <b>soft</b> mode, shrink σ toward 0 until every point is essentially decided (all responsibilities past 0.98)', xp: 22, check: s => s.soft && s.minConf > 0.98 },
    { text: 'Toggle <b>hard</b> mode: responsibilities snap to exact 0/1 — the k-means assignment step', xp: 20, check: s => !s.soft },
    { text: 'Back in <b>soft</b> mode with a wide σ (≥ 1.3), find the genuinely fuzzy points (responsibility near 0.5)', xp: 20, check: s => s.soft && s.sigma >= 1.3 && s.hasFuzzy },
  ]);
  function draw() {
    clearBg(L.ctx, L.W, L.H);
    L.ctx.strokeStyle = 'rgba(255,255,255,.25)'; L.ctx.lineWidth = 1.5;
    L.ctx.beginPath(); L.ctx.moveTo(0, base); L.ctx.lineTo(W, base); L.ctx.stroke();
    // two component bumps (only meaningful in soft mode; draw faintly always)
    L.ctx.lineWidth = 2;
    [[mu1, 'rgba(0,212,255,.5)'], [mu2, 'rgba(255,201,77,.5)']].forEach(([mu, col]) => {
      L.ctx.strokeStyle = col; L.ctx.beginPath();
      for (let xx = -5; xx <= 5; xx += 0.05) { const y = base - gauss(xx, mu, sigma) * 200; (xx === -5) ? L.ctx.moveTo(px(xx), y) : L.ctx.lineTo(px(xx), y); }
      L.ctx.stroke();
      L.ctx.strokeStyle = col; L.ctx.setLineDash([4, 4]); L.ctx.lineWidth = 1.4;
      L.ctx.beginPath(); L.ctx.moveTo(px(mu), base); L.ctx.lineTo(px(mu), 40); L.ctx.stroke(); L.ctx.setLineDash([]); L.ctx.lineWidth = 2;
    });
    // midline
    L.ctx.strokeStyle = 'rgba(255,255,255,.2)'; L.ctx.setLineDash([2, 5]);
    L.ctx.beginPath(); L.ctx.moveTo(px(0), base); L.ctx.lineTo(px(0), 40); L.ctx.stroke(); L.ctx.setLineDash([]);
    for (const x of xs) {
      const r = respOf(x);
      const mix = t => Math.round(parseInt(c1.slice(1 + t * 2, 3 + t * 2), 16) * r + parseInt(c2.slice(1 + t * 2, 3 + t * 2), 16) * (1 - r));
      L.ctx.fillStyle = 'rgb(' + mix(0) + ',' + mix(1) + ',' + mix(2) + ')';
      L.ctx.beginPath(); L.ctx.arc(px(x), base + 18, 7, 0, 7); L.ctx.fill();
      L.ctx.fillStyle = '#cdd4f0'; L.ctx.font = '600 10px ' + getComputedStyle(document.body).fontFamily; L.ctx.textAlign = 'center';
      L.ctx.fillText(r.toFixed(2), px(x), base + 40); L.ctx.textAlign = 'left';
    }
    const st = stats();
    L.readout.innerHTML = 'mode = <b>' + (soft ? 'soft (EM E-step)' : 'hard (k-means)') + '</b>' +
      '<br>σ = ' + sigma.toFixed(2) + (soft ? '' : '  (ignored in hard mode)') +
      '<br>most-uncertain point\'s confidence = ' + st.minConf.toFixed(3);
    m.update(st);
  }
  chips(L.ctrl, 'ASSIGNMENT', ['Soft (responsibilities)', 'Hard (nearest mean)'], (i, btn, row) => {
    soft = i === 0; [...row.children].forEach(b => b.classList.remove('on')); btn.classList.add('on'); draw();
  }).children[0].classList.add('on');
  slider(L.ctrl, 'σ — shared component width (→ 0 makes it hard)', 0.15, 2.5, 0.05, sigma, fmt2, v => { sigma = v; draw(); });
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The number under each point is its responsibility for the <b style="color:#00d4ff">left</b> component. As σ shrinks, the nearer bump towers over the farther one, so responsibilities race to 0 or 1 — the soft E-step becoming k-means\' hard nearest-mean call. Hard mode is just the σ → 0 endpoint.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ================================================================
   LESSON 3 — PCA: variance-maximizing projection (order 42)
   ================================================================ */
registerLesson({
  id: 'ml-pca', world: 'ml', order: 42, emoji: '🧭', title: 'PCA: Variance-Maximizing Projection',
  sub: 'Which single direction keeps the most of your data? PCA rotates to the axis of greatest spread — the top eigenvector of the covariance matrix — and lets you throw the rest away with minimal loss.',
  learn: `<p><strong>Principal component analysis</strong> is the canonical dimensionality reducer: it finds a new set of axes — the <strong>principal components</strong> — ordered so the first captures as much of the data\'s variance as possible, the second as much of what remains (while staying orthogonal to the first), and so on. Project onto the top few and you compress high-dimensional data with the least possible loss.</p>
  <p>Start by <strong>centering</strong> the data (subtract the mean — PCA is about spread <em>around</em> the center, so this step is mandatory). Now ask for the unit direction u that maximizes the variance of the projections \\(u^{\\!\\top} x\\). That variance is a quadratic form in the sample <strong>covariance matrix</strong> \\(\\Sigma\\) (World 3):</p>
  <div class="formula">$$\\text{Var}(u^{\\!\\top} x) = u^{\\!\\top} \\Sigma\\, u \\qquad \\text{maximize subject to } \\lVert u \\rVert = 1$$</div>
  <p>Maximizing a quadratic form on the unit sphere is a Lagrange-multiplier problem, and its solution is a landmark result: the stationary directions satisfy \\(\\Sigma u = \\lambda u\\). The maximizer is the <strong>top eigenvector</strong> of the covariance matrix, and the variance it captures is its <strong>eigenvalue</strong> \\(\\lambda\\):</p>
  <div class="formula">$$\\Sigma u = \\lambda u \\qquad \\Rightarrow \\qquad \\text{principal components are eigenvectors of } \\Sigma,\\ \\text{variance along each} = \\lambda$$</div>
  <p>So the whole method is: build the covariance matrix, take its eigenvectors, sort by eigenvalue. Because \\(\\Sigma\\) is symmetric, the eigenvectors are mutually <strong>orthogonal</strong> — the new axes are a clean rotation of the old ones. This is exactly the projection geometry from <em>la-projection</em>: projecting a point onto the PC1 line splits it into a component along the line (kept) and a residual perpendicular to it (discarded), and by Pythagoras <strong>total variance = projected variance + residual variance</strong>. Maximizing the projected part is the same as minimizing the residual (reconstruction) error.</p>
  <p>Two more facts you will use constantly:</p>
  <p>• <strong>PCA via the SVD.</strong> Stack the centered data as rows of a matrix X and take its singular value decomposition \\(X = U S V^{\\!\\top}\\) (<em>la-svd</em>). The columns of V are precisely the principal components, and the singular values satisfy \\(s_k^2 / N = \\lambda_k\\). In practice PCA is computed by SVD of the centered data, not by forming \\(\\Sigma\\) explicitly (better numerically). Keeping the top r components is the best rank-r approximation of X (Eckart–Young) — the same compression story as <em>la-svd</em>.<br>
  • <strong>Variance explained.</strong> The fraction of total variance a component captures is \\(\\lambda_k / \\sum_j \\lambda_j\\). A scree plot of these ratios tells you how many components to keep.</p>
  <p>One sharp warning: <strong>PCA is not scale-invariant.</strong> Covariance is measured in the data\'s units, so a feature recorded in a larger unit (dollars vs. thousands of dollars, millimeters vs. meters) has inflated variance and can dominate PC1 for no real reason. When features live on different scales you standardize first (z-score each feature, i.e. run PCA on the correlation matrix instead of the covariance matrix).</p>`,
  ml: `PCA is the most-used unsupervised tool in all of ML: it visualizes high-dimensional embeddings in 2-D, whitens and decorrelates inputs before training, denoises by dropping low-variance components, and compresses. It is the linear ancestor of every representation-learning method — an autoencoder with linear layers and squared-error loss learns exactly the PCA subspace. The eigenvector/SVD machinery is identical to what powers <b>la-svd</b> compression and <b>prob-covariance</b>; PCA is where projection (<b>la-projection</b>), eigenvectors (<b>la-eigen</b>), the covariance matrix, and the SVD all converge on one wildly practical procedure. When someone reduces 768-dimensional embeddings to 50 dimensions "with PCA", this variance-maximizing rotation is what they ran.`,
  deeper: [
    { title: '😵 Stuck? Why the eigenvector of the covariance?', body: 'You want the unit direction u where the data spreads the most. Spread along u is the variance of the projections, uᵀΣu. Maximize uᵀΣu subject to ‖u‖ = 1 with a Lagrange multiplier: ∇(uᵀΣu − λ(uᵀu − 1)) = 0 gives 2Σu − 2λu = 0, i.e. Σu = λu. So the best direction is an eigenvector of Σ, and plugging back, the variance it captures is uᵀΣu = λ. Biggest variance = biggest eigenvalue = top eigenvector. This is Lagrange multipliers (World 2) meeting the covariance matrix (World 3).' },
    { title: '🚀 Go deeper: PCA = SVD of the centered data, and Eckart–Young', body: 'Let X be the centered data (points in rows). Then Σ = XᵀX / N. If X = U S Vᵀ is the SVD, then XᵀX = V S² Vᵀ, so V\'s columns are the eigenvectors of Σ (the principal components) and λ_k = s_k²/N. Truncating to the top r singular values gives the best rank-r approximation of X in both the Frobenius and spectral norms — the <b>Eckart–Young theorem</b> — which is exactly why "keep the top r PCs" is optimal compression. Reference: Strang, <em>Introduction to Linear Algebra</em>, ch. 7; Shlens, "A Tutorial on Principal Component Analysis" (2014).' },
    { title: '🚀 Go deeper: reconstruction error is the discarded variance', body: 'Project each centered point onto the top r principal components and reconstruct. The expected squared reconstruction error equals the sum of the DISCARDED eigenvalues, Σ_{k>r} λ_k. With 2-D data and r = 1, the error is exactly λ₂ — the variance along the direction you threw away. This is the precise sense in which "maximize kept variance" and "minimize reconstruction error" are the same optimization, and it is the objective a linear autoencoder minimizes. See Bishop, <em>PRML</em>, §12.1, for both the maximum-variance and minimum-error derivations landing on the same eigenvectors.' },
  ],
  labs: [
    { key: 'direction', title: 'Find the max-variance direction by hand', interactive: 'pca-direction',
      intro: '<p>A cloud of points and a line through their mean that you can rotate. The readout shows the <b>projected variance</b> (spread along the line) and the <b>residual variance</b> (leftover perpendicular spread). Hunt for the angle that maximizes projection — and confirm it matches the top eigenvector of the covariance matrix. Drag points to reshape the cloud and the answer moves with it.</p>' },
    { key: 'reconstruct', title: 'Reconstruction: keep 1 of 2 components', interactive: 'pca-reconstruct',
      intro: '<p>Switch between keeping both principal components (lossless) and keeping only PC1. With one component, every point collapses onto the PC1 line and the reconstruction error equals exactly the discarded eigenvalue λ₂. This is la-svd compression in two dimensions.</p>' },
    { key: 'scale', title: 'The scaling trap', interactive: 'pca-scale',
      intro: '<p>Here feature x is stored on a much larger scale than feature y. Predict which way PC1 will point on the raw data, then toggle standardization and watch it swing to the genuine correlation direction. PCA answers a question about variance — and variance depends on your units.</p>' },
  ],
  quiz: [
    { q: 'The first principal component is the direction that…',
      opts: ['Maximizes the variance of the data projected onto it', 'Minimizes the variance of the projected data', 'Passes through the two farthest-apart points', 'Is always the original x-axis'],
      a: 0, tag: 'variance maximization',
      focus: 'PC1 maximizes projected variance uᵀΣu over unit u — the direction of greatest spread.',
      why: 'PCA seeks the unit direction u maximizing Var(uᵀx) = uᵀΣu. PC1 is that maximum-variance direction; each later PC maximizes remaining variance while staying orthogonal to the earlier ones.',
      wrong: { 1: 'Minimizing projected variance gives the LAST component (least spread), not the first.',
               2: 'PCA uses the whole covariance structure, not two extreme points; outliers do not define PC1 by themselves.',
               3: 'PC1 is generally a rotated direction determined by the data; it equals the x-axis only in the special case where the data already varies most along x.' } },
    { q: 'Concretely, the principal components are…',
      opts: ['The eigenvectors of the covariance matrix, ordered by eigenvalue', 'The rows of the raw data matrix', 'The residuals left after fitting a line', 'The columns with the largest means'],
      a: 0, tag: 'principal component eigenvector',
      focus: 'Maximizing uᵀΣu on the unit sphere yields Σu = λu: PCs are eigenvectors of Σ, variance captured = λ.',
      why: 'Maximizing uᵀΣu subject to ‖u‖ = 1 (Lagrange) gives Σu = λu. So each principal component is an eigenvector of the covariance matrix, and its eigenvalue is the variance it captures — sort by eigenvalue to order them.',
      wrong: { 1: 'Raw data rows are the samples themselves, not the axes PCA constructs. PCs come from the covariance of those rows.',
               2: 'Residuals are what PCA DISCARDS (perpendicular to the kept components), not the components.',
               3: 'A large mean says nothing about spread — and PCA centers the data first, removing the means entirely.' } },
    { q: 'Projecting a point onto the PC1 line splits it into a kept part (along the line) and a residual (perpendicular). These satisfy…',
      opts: ['total variance = projected variance + residual variance (Pythagoras)', 'total variance = projected variance − residual variance', 'projected variance = residual variance always', 'the residual is parallel to PC1'],
      a: 0, tag: 'variance decomposition',
      focus: 'Projection ⟂ residual, so by Pythagoras total variance splits additively into kept + discarded.',
      why: 'Because the residual is orthogonal to the projection (la-projection), their squared lengths add: total variance = projected + residual. Maximizing the projected part is therefore identical to minimizing the residual (reconstruction) error.',
      wrong: { 1: 'The pieces ADD (they are perpendicular), they do not subtract — that is the Pythagorean split.',
               2: 'They are equal only in a knife-edge symmetric case; in general PC1 captures MORE than the residual direction.',
               3: 'The residual is orthogonal (perpendicular) to PC1 by construction, never parallel.' } },
    { q: 'The fraction of the data\'s total variance captured by the k-th principal component equals…',
      opts: ['Its eigenvalue divided by the sum of all eigenvalues, λ_k / Σ_j λ_j', 'Its eigenvalue times the number of samples', '1 / (number of components), always equal', 'The k-th largest data value'],
      a: 0, tag: 'variance explained ratio',
      focus: 'Variance explained by component k = λ_k / Σ_j λ_j; a scree plot of these ratios guides how many to keep.',
      why: 'Each eigenvalue λ_k is the variance along that component, and the eigenvalues sum to the total variance. So the explained-variance ratio is λ_k / Σ_j λ_j — the basis of the scree plot.',
      wrong: { 1: 'Multiplying by N gives an unnormalized scatter, not a fraction of variance; you need to divide by the total.',
               2: 'Components carry UNEQUAL variance (that is the whole point of ordering them); they are not each 1/K.',
               3: 'Variance explained comes from eigenvalues of the covariance, not from any single raw data value.' } },
    { q: 'How is PCA related to the singular value decomposition of the centered data X = U S Vᵀ?',
      opts: ['The columns of V are the principal components, with λ_k = s_k² / N', 'PCA and SVD are unrelated methods', 'The columns of U are the principal components', 'The singular values are the eigenvalues of X'],
      a: 0, tag: 'pca via svd',
      focus: 'For centered X = USVᵀ: V\'s columns are the PCs and s_k²/N = λ_k; PCA is usually computed via SVD.',
      why: 'For centered X, XᵀX = V S² Vᵀ and Σ = XᵀX/N, so V\'s columns are the eigenvectors of Σ (the principal components) and each eigenvalue is s_k²/N. Computing PCA via SVD is more numerically stable than forming Σ.',
      wrong: { 1: 'They are intimately related — SVD is the standard way to compute PCA.',
               2: 'U holds the left singular vectors (coordinates of samples in PC space), not the component DIRECTIONS; those are in V.',
               3: 'Singular values are non-negative roots (up to scaling) of the eigenvalues of XᵀX, not eigenvalues of X itself (which need not even be square).' } },
    { type: 'numeric',
      q: 'A 2-D dataset has covariance eigenvalues λ₁ = 9 and λ₂ = 1. What fraction of the total variance does the first principal component explain? (Enter a decimal.)',
      answer: 0.9, tol: 0.01, tag: 'computing variance explained',
      hint: 'Explained variance ratio = λ₁ / (λ₁ + λ₂) = 9 / (9 + 1).',
      why: 'The ratio is λ₁ / (λ₁ + λ₂) = 9 / 10 = 0.9. PC1 captures 90% of the variance, so reducing to one dimension keeps most of the structure.' },
    { q: 'Why must you center the data (subtract the mean) before computing PCA?',
      opts: ['PCA measures variance about the mean; without centering, the components chase the offset from the origin instead of the spread', 'Centering makes all eigenvalues equal', 'It converts the data to integers', 'Centering is optional and never changes the result'],
      a: 0, tag: 'centering the data',
      focus: 'PCA maximizes variance about the mean, so the data must be centered; otherwise the mean offset contaminates the components.',
      why: 'Variance is defined as spread around the mean. If you skip centering, the covariance (really a second moment about the origin) is dominated by how far the cloud sits from the origin, and PC1 points toward the mean rather than along the true spread.',
      wrong: { 1: 'Centering does not equalize eigenvalues — it removes the mean so the eigenvalues reflect genuine spread.',
               2: 'Centering shifts values (subtracting a real-valued mean); it has nothing to do with making them integers.',
               3: 'It is mandatory and changes the result substantially when the data is far from the origin.' } },
    { q: 'You run PCA on data where "income" is in dollars (range ~50000) and "age" is in years (range ~50), without standardizing. PC1 will…',
      opts: ['Point almost entirely along income, because its raw variance dwarfs age\'s — a scale artifact', 'Be unaffected, since PCA is scale-invariant', 'Point along age, the smaller-scale feature', 'Be exactly 45° between the two features'],
      a: 0, tag: 'pca scale sensitivity',
      focus: 'PCA is NOT scale-invariant: a larger-unit feature has inflated variance and dominates PC1. Standardize when scales differ.',
      why: 'Covariance is measured in the features\' units, so income\'s huge numeric range gives it enormous variance and it captures PC1 by default — a units artifact, not real structure. Standardizing (z-scoring each feature, i.e. PCA on the correlation matrix) fixes it.',
      wrong: { 1: 'PCA is explicitly NOT scale-invariant — that is the entire warning. Rescaling a feature changes the components.',
               2: 'The large-scale feature dominates, not the small one; age\'s tiny variance makes it nearly invisible to raw PCA.',
               3: 'There is no reason for a 45° result; the direction is pulled toward whichever feature has the larger raw variance.' } },
    { type: 'order',
      q: 'Arrange the steps to compute PCA and reduce data to its top r components:',
      tag: 'pca procedure order',
      steps: [
        'Center the data by subtracting the mean of each feature (and standardize if feature scales differ).',
        'Form the covariance matrix Σ (or take the SVD of the centered data directly).',
        'Find the eigenvectors and eigenvalues of Σ, sorting eigenvectors by descending eigenvalue.',
        'Project the centered data onto the top r eigenvectors to get the reduced representation.',
      ],
      why: 'PCA: center (and optionally standardize), build the covariance / SVD, take and sort the eigenvectors by eigenvalue, then project onto the leading r of them. The eigenvalue order is what makes "top r" the maximum-variance choice.' },
    { q: 'If you keep only PC1 of a 2-D dataset, the reconstruction error (squared, averaged) equals…',
      opts: ['λ₂, the variance along the discarded second component', 'λ₁, the variance you kept', 'zero, always', 'the total variance λ₁ + λ₂'],
      a: 0, tag: 'reconstruction error',
      focus: 'Reconstruction error of a rank-r PCA = sum of discarded eigenvalues; for 2-D keeping 1, that is λ₂.',
      why: 'Reconstructing from the top r components loses exactly the variance in the dropped directions: Σ_{k>r} λ_k. For 2-D data keeping PC1, the discarded direction is PC2, so the error is λ₂ — the same "kept variance vs. discarded variance" split as compression.',
      wrong: { 1: 'λ₁ is the variance you KEPT (it lands on the line with no error); the error comes from what you dropped.',
               2: 'Error is zero only if λ₂ = 0 (the data already lies on a line). Otherwise the perpendicular spread is lost.',
               3: 'The total variance is kept-plus-discarded; only the discarded part (λ₂) becomes reconstruction error.' } },
  ],
});

/* ---------- Lab 3a — find the max-variance direction ---------- */
INTERACTIVES['pca-direction'] = function (stage, api) {
  const L = makeLab(stage, { h: 480 });
  const P = plane(L.ctx, L.W, L.H, 46);
  const pts = PCA_CLOUD.map(p => ({ x: p[0], y: p[1] }));
  let theta = 0.0;                                    // radians, direction of the line
  let drag = null;
  function analysis() {
    const cv = covOf(pts); const e = eig2(cv.a, cv.b, cv.c);
    const ux = Math.cos(theta), uy = Math.sin(theta);
    const projVar = cv.a * ux * ux + 2 * cv.b * ux * uy + cv.c * uy * uy;
    const total = cv.a + cv.c;                         // = l1 + l2
    return { cv, e, ux, uy, projVar, residVar: total - projVar, total };
  }
  const m = api.missions([
    { text: 'Rotate to <b>maximize</b> the projected variance — match the top eigenvector (within ~3%)', xp: 22, check: s => s.projVar >= s.e.l1 * 0.97 },
    { text: 'At that angle, read the split: projected variance is at least <b>85%</b> of the total spread', xp: 20, check: s => s.projVar / s.total >= 0.85 },
    { text: 'Rotate ~90° to <b>PC2</b>: now the projected variance is at its MINIMUM (within ~5% of λ₂)', xp: 22, check: s => s.projVar <= s.e.l2 * 1.05 + s.total * 0.02 },
  ]);
  function draw() {
    clearBg(L.ctx, L.W, L.H); P.grid();
    const A = analysis(); const cx = A.cv.mx, cy = A.cv.my;
    // the rotatable line through the mean
    const ex = A.ux, ey = A.uy;
    L.ctx.strokeStyle = '#7c5cff'; L.ctx.lineWidth = 3;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(cx - ex * 8), P.sy(cy - ey * 8)); L.ctx.lineTo(P.sx(cx + ex * 8), P.sy(cy + ey * 8)); L.ctx.stroke();
    // residual segments (point to its foot on the line)
    for (const p of pts) {
      const t = (p.x - cx) * ex + (p.y - cy) * ey;     // scalar projection
      const fx = cx + t * ex, fy = cy + t * ey;
      L.ctx.strokeStyle = 'rgba(0,212,255,.5)'; L.ctx.lineWidth = 1.6;
      L.ctx.beginPath(); L.ctx.moveTo(P.sx(p.x), P.sy(p.y)); L.ctx.lineTo(P.sx(fx), P.sy(fy)); L.ctx.stroke();
      P.dot(fx, fy, 3, '#2dd4a0');
      P.dot(p.x, p.y, 6, '#ffc94d');
    }
    // the true PC1 direction (faint gold), for feedback
    const gx = Math.cos(A.e.angle), gy = Math.sin(A.e.angle);
    L.ctx.strokeStyle = 'rgba(255,201,77,.35)'; L.ctx.setLineDash([6, 6]); L.ctx.lineWidth = 2;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(cx - gx * 8), P.sy(cy - gy * 8)); L.ctx.lineTo(P.sx(cx + gx * 8), P.sy(cy + gy * 8)); L.ctx.stroke(); L.ctx.setLineDash([]);
    P.dot(cx, cy, 5, '#e8ecff');
    const pct = (A.projVar / A.total * 100).toFixed(0);
    L.readout.innerHTML = 'line angle = ' + (theta * 180 / Math.PI).toFixed(0) + '°' +
      '<br><span style="color:#7c5cff">projected variance = ' + A.projVar.toFixed(2) + '</span> (' + pct + '% of total)' +
      '<br><span style="color:#00d4ff">residual variance = ' + A.residVar.toFixed(2) + '</span>' +
      '<br>eigenvalues of Σ: λ₁ = ' + A.e.l1.toFixed(2) + ', λ₂ = ' + A.e.l2.toFixed(2);
    m.update(A);
  }
  slider(L.ctrl, 'θ — rotate the line', -90, 90, 1, 0, v => v.toFixed(0) + '°', v => { theta = v * Math.PI / 180; draw(); });
  // drag points to reshape the cloud
  L.canvas.addEventListener('pointerdown', e => {
    const c = L.toCanvas(e); let bi = -1, bd = 16 * 16;
    for (let i = 0; i < pts.length; i++) { const dx = c.x - P.sx(pts[i].x), dy = c.y - P.sy(pts[i].y), d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } }
    drag = bi; if (bi >= 0) { L.canvas.setPointerCapture(e.pointerId); }
  });
  L.canvas.addEventListener('pointermove', e => { if (drag == null || drag < 0) return; const c = L.toCanvas(e);
    pts[drag] = { x: Math.round(P.wx(c.x) * 4) / 4, y: Math.round(P.wy(c.y) * 4) / 4 }; draw(); });
  L.canvas.addEventListener('pointerup', () => drag = null);
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The <b style="color:#00d4ff">cyan sticks</b> are residuals — the perpendicular distances lost when you project onto the <b style="color:#7c5cff">purple line</b>. Rotate to shrink them and the projected variance grows; total = projected + residual holds at every angle. The <b style="color:#ffc94d">faint gold line</b> is the true PC1 (top eigenvector of Σ). Drag points to reshape the cloud.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ---------- Lab 3b — reconstruction: keep 1 of 2 components ---------- */
INTERACTIVES['pca-reconstruct'] = function (stage, api) {
  const L = makeLab(stage, { h: 470 });
  const P = plane(L.ctx, L.W, L.H, 46);
  const pts = PCA_CLOUD.map(p => ({ x: p[0], y: p[1] }));
  const cv = covOf(pts); const e = eig2(cv.a, cv.b, cv.c);
  const retained = e.l1 / (e.l1 + e.l2);
  let mode = 'pc1';                                    // 'pc1' (keep 1) | 'pc2' (keep both)
  function mse() {
    if (mode === 'pc2') return 0;
    let s = 0; const px = -e.vy, py = e.vx;             // unit vector ⟂ PC1
    for (const p of pts) { const r = (p.x - cv.mx) * px + (p.y - cv.my) * py; s += r * r; }
    return s / pts.length;                              // == λ₂
  }
  const m = api.missions([
    { text: 'Switch to <b>keep 1 (PC1)</b> and watch every point snap onto the principal-component line', xp: 20, check: s => s.mode === 'pc1' },
    { text: 'Read the loss: with one component the reconstruction error equals the discarded eigenvalue λ₂. Confirm the variance retained is at least <b>85%</b>', xp: 20, check: s => s.mode === 'pc1' && s.retained >= 0.85 },
    { text: 'Keep <b>both</b> components and drive the reconstruction error to <b>0</b> (lossless)', xp: 20, check: s => s.mode === 'pc2' && s.mse < 1e-6 },
  ]);
  function draw() {
    clearBg(L.ctx, L.W, L.H); P.grid();
    const ex = e.vx, ey = e.vy;
    // PC1 line through mean
    L.ctx.strokeStyle = '#7c5cff'; L.ctx.lineWidth = 3;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(cv.mx - ex * 8), P.sy(cv.my - ey * 8)); L.ctx.lineTo(P.sx(cv.mx + ex * 8), P.sy(cv.my + ey * 8)); L.ctx.stroke();
    for (const p of pts) {
      let rx, ry;
      if (mode === 'pc1') { const t = (p.x - cv.mx) * ex + (p.y - cv.my) * ey; rx = cv.mx + t * ex; ry = cv.my + t * ey; }
      else { rx = p.x; ry = p.y; }
      if (mode === 'pc1') { L.ctx.strokeStyle = 'rgba(255,92,122,.6)'; L.ctx.lineWidth = 1.6;
        L.ctx.beginPath(); L.ctx.moveTo(P.sx(p.x), P.sy(p.y)); L.ctx.lineTo(P.sx(rx), P.sy(ry)); L.ctx.stroke(); }
      P.dot(p.x, p.y, 6, 'rgba(255,201,77,.45)');       // original (faint)
      P.dot(rx, ry, 5, '#2dd4a0');                       // reconstruction (bright)
    }
    P.dot(cv.mx, cv.my, 5, '#e8ecff');
    const er = mse();
    L.readout.innerHTML = 'mode = <b>' + (mode === 'pc1' ? 'keep PC1 only (1 of 2)' : 'keep both (lossless)') + '</b>' +
      '<br><span style="color:#2dd4a0">reconstruction error (MSE) = ' + er.toFixed(3) + '</span>' +
      '<br>discarded eigenvalue λ₂ = ' + e.l2.toFixed(3) + (mode === 'pc1' ? '  ← equal!' : '') +
      '<br>variance retained = ' + (retained * 100).toFixed(0) + '%';
    m.update({ mode, mse: er, retained });
  }
  chips(L.ctrl, 'COMPONENTS KEPT', ['Keep PC1 only', 'Keep both'], (i, btn, row) => {
    mode = i === 0 ? 'pc1' : 'pc2'; [...row.children].forEach(b => b.classList.remove('on')); btn.classList.add('on'); draw();
  }).children[0].classList.add('on');
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b style="color:#2dd4a0">Green</b> dots are the reconstructions; <b style="color:#ffc94d">faint gold</b> are the originals. Keeping only PC1 flattens every point onto the <b style="color:#7c5cff">purple line</b>, and the <b style="color:#ff5c7a">red</b> gaps are the reconstruction error — whose average is exactly λ₂, the variance you discarded. Keep both and the error vanishes. This is la-svd compression in 2-D.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ---------- Lab 3c — the scaling trap (predict-then-verify) ---------- */
INTERACTIVES['pca-scale'] = function (stage, api) {
  const L = makeLab(stage, { h: 470 });
  const P = plane(L.ctx, L.W, L.H, 46);
  const raw = PCA_SCALE.map(p => ({ x: p[0], y: p[1] }));
  // per-feature std for standardization
  const cvRaw = covOf(raw); const sx = Math.sqrt(cvRaw.a), sy = Math.sqrt(cvRaw.c);
  let mode = 'raw';
  function pc1Display() {
    if (mode === 'raw') { const e = eig2(cvRaw.a, cvRaw.b, cvRaw.c); return { dx: e.vx, dy: e.vy }; }
    // standardized: eig of correlation matrix, then map direction back to display units
    const zs = raw.map(p => ({ x: (p.x - cvRaw.mx) / sx, y: (p.y - cvRaw.my) / sy }));
    const cz = covOf(zs); const ez = eig2(cz.a, cz.b, cz.c);
    let dx = ez.vx * sx, dy = ez.vy * sy; const n = Math.hypot(dx, dy) || 1; return { dx: dx / n, dy: dy / n };
  }
  api.predict({
    prompt: 'On this raw data, feature x is stored on a much larger scale than feature y (its numeric spread is far bigger). Which way will PC1 point?',
    choices: [
      'Almost horizontal — along x, the large-scale feature',
      'Along the diagonal correlation between x and y',
      'Almost vertical — along y, the small-scale feature',
      'It cannot be predicted from the scales',
    ],
    answer: 0,
    reveal: 'PC1 points almost horizontally, along the <b>large-scale x feature</b>. PCA maximizes variance measured in the raw units, and x\'s inflated numeric range gives it far more variance than y — so it captures PC1 regardless of the true x-y relationship. Toggle <b>Standardize</b> to z-score each feature onto a common scale, and PC1 swings to the genuine diagonal correlation. Same data, different answer: PCA is not scale-invariant.',
  });
  const m = api.missions([
    { text: 'On the <b>raw</b> data, confirm PC1 is nearly aligned with the large-scale x-axis (a scale artifact)', xp: 22, check: s => s.mode === 'raw' && Math.abs(s.angle) < 12 },
    { text: 'Turn on <b>Standardize</b> and watch PC1 rotate toward the true correlation (angle well off the x-axis)', xp: 23, check: s => s.mode === 'standardized' && Math.abs(s.angle) > 20 },
  ]);
  function draw() {
    clearBg(L.ctx, L.W, L.H); P.grid();
    const d = pc1Display(); const ang = Math.atan2(d.dy, d.dx) * 180 / Math.PI;
    for (const p of raw) P.dot(p.x, p.y, 6, '#ffc94d');
    L.ctx.strokeStyle = '#7c5cff'; L.ctx.lineWidth = 3;
    L.ctx.beginPath(); L.ctx.moveTo(P.sx(cvRaw.mx - d.dx * 9), P.sy(cvRaw.my - d.dy * 9)); L.ctx.lineTo(P.sx(cvRaw.mx + d.dx * 9), P.sy(cvRaw.my + d.dy * 9)); L.ctx.stroke();
    P.dot(cvRaw.mx, cvRaw.my, 5, '#e8ecff');
    L.readout.innerHTML = 'mode = <b>' + (mode === 'raw' ? 'raw (covariance)' : 'standardized (correlation)') + '</b>' +
      '<br>PC1 angle = ' + ang.toFixed(0) + '°  ' + (Math.abs(ang) < 12 ? '(≈ along x — scale-dominated)' : '(tilted — true structure)') +
      '<br>feature std: x = ' + sx.toFixed(2) + ', y = ' + sy.toFixed(2);
    m.update({ mode, angle: ang });
  }
  chips(L.ctrl, 'PREPROCESSING', ['Raw (as stored)', 'Standardize (z-score)'], (i, btn, row) => {
    mode = i === 0 ? 'raw' : 'standardized'; [...row.children].forEach(b => b.classList.remove('on')); btn.classList.add('on'); draw();
  }).children[0].classList.add('on');
  const note = document.createElement('div'); note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The points are stretched wide because x is on a big scale. On <b>raw</b> data PC1 lies flat along x — it is just chasing the biggest raw numbers. <b>Standardize</b> rescales both features to unit variance, and PC1 finally points along the real correlation. Always standardize when features have different units.</div>';
  L.ctrl.appendChild(note);
  draw();
};
