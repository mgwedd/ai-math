/* ================================================================
   WORLD 1 DEPTH — Markov Chains & the Stationary Distribution.
   Appends at the END of World 1 via order 23 (higher than
   la-projection's 20/21/22). Same registries, same schema.

   The arc: transition matrix P (column-stochastic) + the Markov
   property  ->  power iteration IS chain convergence  ->  the
   stationary distribution pi is the lambda=1 eigenvector  ->
   irreducible + aperiodic conditions needed for guarantee.

   ML hooks: PageRank, MCMC, RL state transitions, diffusion.
   ================================================================ */
import { INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, chips, clearBg, fmt2 } from '../engine.js';

registerLesson({
  id: 'la-markov', world: 'la', order: 23, emoji: '\u{1F501}', title: 'Markov Chains',
  sub: 'Random walks on states — and why they always settle into the same equilibrium.',
  learn: `<p>A <strong>Markov chain</strong> is a sequence of states where the only thing that determines tomorrow is today — not the whole history. That one sentence, the <strong>Markov property</strong>, makes the math tractable and the model surprisingly powerful.</p>
  <p>Encode the chain as a <strong>transition matrix P</strong>. Entry P<sub>ij</sub> is the probability of jumping from state j to state i. Each column of P is a probability distribution (all entries &ge; 0, column sums = 1). This is the <strong>column-stochastic</strong> convention used throughout: the state vector x<sub>t</sub> is a column, and one time-step is a matrix-vector product:</p>
  <div class="formula">$$x_{t+1} = P x_t$$</div>
  <p>After k steps: x<sub>k</sub> = P<sup>k</sup> x<sub>0</sub>. Power iteration on P is not an algorithm you invoke separately &mdash; it literally <em>is</em> the chain running forward in time.</p>
  <p>A distribution <strong>&pi;</strong> is called <strong>stationary</strong> (or steady-state) when the chain leaves it unchanged:</p>
  <div class="formula">$$P\\pi = \\pi$$</div>
  <p>That equation says &pi; is an <strong>eigenvector of P for eigenvalue &lambda; = 1</strong>. Every column-stochastic P has &lambda; = 1 as an eigenvalue (proof: each column sums to 1, so each row of P<sup>T</sup> sums to 1, making (1,1,&hellip;,1) an eigenvector of P<sup>T</sup>). The stationary distribution is the corresponding eigenvector normalized to sum to 1.</p>
  <p>Will the chain actually <em>converge</em> to &pi;? Only under two extra conditions:</p>
  <ul style="line-height:1.9">
    <li><strong>Irreducible</strong> &mdash; every state can reach every other state (the graph of the chain is strongly connected). Otherwise the chain can get trapped in part of the state space.</li>
    <li><strong>Aperiodic</strong> &mdash; no state forces returns only at multiples of some period &gt; 1. A chain with period 2 oscillates forever instead of converging.</li>
  </ul>
  <p>Under both conditions the chain converges to &pi; from <em>any</em> starting distribution &mdash; that path-independence is what makes the stationary distribution a genuine equilibrium, not just a fixed point for one lucky start.</p>`,
  ml: `Markov chains underlie some of the most important structures in ML. <b>PageRank</b> finds the stationary distribution of a random-walk on the web graph: pages that attract many high-quality links get a high stationary probability. <b>MCMC</b> (Markov Chain Monte Carlo) deliberately designs a chain whose stationary distribution is a target posterior &mdash; running the chain long enough gives samples from a distribution you can't sample directly. <b>Reinforcement learning</b> models the environment as a Markov Decision Process, and evaluating a policy amounts to finding the stationary distribution of the induced chain. Even <b>diffusion / score-based generative models</b> borrow the language of Markov chains: the forward noising process is a chain, and sampling runs it in reverse.`,
  deeper: [
    {title: '\u{1F635} Stuck? Why lambda = 1 is special', body: 'Every column-stochastic matrix P has lambda = 1 as an eigenvalue. Here\'s the one-line proof: the rows of P sum to... wait, no. The COLUMNS sum to 1, so the all-ones vector 1 satisfies P^T * 1 = 1, meaning 1 is an eigenvector of P^T for lambda = 1. By the definition of eigenvalues, P and P^T share the same eigenvalues, so P has lambda = 1 too. The corresponding eigenvector of P (not P^T) is pi. Normalise it to sum to 1 and that\'s your stationary distribution.'},
    {title: '\u{1F680} Go deeper: the Perron-Frobenius theorem', body: 'For an irreducible, aperiodic chain P, the Perron-Frobenius theorem guarantees that lambda = 1 is a SIMPLE eigenvalue (multiplicity 1) and that all other eigenvalues have |lambda| < 1. That\'s why power iteration converges: the lambda = 1 component survives and every other component decays geometrically. The second-largest |lambda| controls the mixing time --- how many steps until the chain is close to stationarity. Levin & Peres, <em>Markov Chains and Mixing Times</em> (2nd ed., AMS 2017) treats this in full detail. Freely available at: math.uchicago.edu/~shmuel/OriginalMCMT.pdf'},
    {title: '\u{1F680} Go deeper: detailed balance (reversibility)', body: 'A chain satisfies detailed balance if pi_i * P_ji = pi_j * P_ij for all i, j: the probability flux from i to j equals the flux from j to i. This implies P * pi = pi (pi is stationary) but is strictly stronger. MCMC methods like Metropolis-Hastings are designed to satisfy detailed balance with the desired posterior as pi --- then the chain is provably stationary at the target, by construction, without ever computing a normalising constant.'},
  ],
  labs: [
    {
      key: 'stepping',
      title: 'Chain stepping & convergence',
      interactive: 'markovstepping',
      intro: '<p>Watch a 3-state chain evolve one step at a time. The transition matrix P is column-stochastic (each column sums to 1). Step forward from different starting distributions and see whether they all converge to the same limit &mdash; the stationary distribution &pi;.</p>',
    },
    {
      key: 'eigenvector',
      title: 'λ = 1 eigenvector view',
      interactive: 'markoveigen',
      intro: '<p>Predict what the power-iteration limit will be before stepping. Then run the iteration and verify that the result satisfies P&pi; = &pi; &mdash; confirming the stationary distribution is the eigenvector of P for eigenvalue 1.</p>',
    },
    {
      key: 'broken',
      title: 'Break the assumptions',
      interactive: 'markovbroken',
      intro: '<p>The convergence guarantee requires the chain to be <strong>irreducible</strong> (every state reachable from every other) AND <strong>aperiodic</strong> (no forced oscillation). This lab lets you break each condition and see what goes wrong.</p>',
    },
  ],
  quiz: [
    {
      q: 'A 3-state Markov chain has transition matrix P (column-stochastic). After one step from x<sub>0</sub> = [1, 0, 0]<sup>T</sup> (start in state 1), the new state distribution is&hellip;',
      opts: [
        'The first column of P',
        'The first row of P',
        'P<sup>T</sup>x<sub>0</sub>',
        'The average of all columns of P',
      ],
      a: 0,
      tag: 'one-step update',
      focus: 'x_{t+1} = P x_t. When x_0 is the basis vector e_1, that product selects column 1 of P.',
      why: 'P x_0 = P * e_1 = first column of P. The column-stochastic convention means column j holds the probability distribution over next states given you are in state j right now.',
      wrong: {
        1: 'The rows of P (in the column-stochastic convention) are NOT the outgoing distributions. Each COLUMN is the outgoing distribution from the column index state.',
        2: 'P^T x_0 would be correct under a row-stochastic convention. Here P is column-stochastic, so the update is P x_t, not P^T x_t.',
        3: 'Averaging all columns would give the update from the uniform distribution, not from starting in state 1 specifically.',
      },
    },
    {
      q: 'The stationary distribution &pi; of a column-stochastic matrix P satisfies which equation?',
      opts: [
        'P&pi; = &pi; (eigenvector of P for &lambda; = 1)',
        'P&pi; = 0 (in the null space)',
        '&pi; = P<sup>-1</sup>&pi; (inverse fixed point)',
        'P<sup>T</sup>&pi; = 0',
      ],
      a: 0,
      tag: 'stationary distribution definition',
      focus: 'Stationary means applying P leaves the distribution unchanged: P*pi = pi, so pi is an eigenvector of P for lambda = 1.',
      why: 'Stationarity means the distribution does not change after one step: x_{t+1} = P x_t = x_t, which is exactly the eigenvector equation P*pi = 1*pi. Every column-stochastic P has lambda = 1 as an eigenvalue, so this always has a solution.',
      wrong: {
        1: 'P*pi = 0 would put pi in the null space, meaning P annihilates it. A probability distribution cannot be zero, and the null space eigenvector has lambda = 0, not lambda = 1.',
        2: 'P^{-1}*pi = pi would mean pi is an eigenvector of P^{-1} for lambda = 1, which is equivalent to P*pi = pi. Rewriting this way adds no content, and many P are not invertible.',
        3: 'P^T * pi = 0 would put pi in the null space of the TRANSPOSE, which makes pi = 0. The all-ones vector satisfies P^T * ones = ones (not zero).',
      },
    },
    {
      type: 'numeric',
      q: 'P = [[0.5, 0.3], [0.5, 0.7]] (column-stochastic 2x2, columns sum to 1). Start at x_0 = [1, 0]^T. After ONE step, what is the probability of being in state 1 (the first component of x_1)?',
      answer: 0.5,
      tol: 0.005,
      unit: '',
      hint: 'x_1 = P * x_0. With x_0 = [1, 0]^T this is just the first column of P. Read off the (1,1) entry.',
      why: 'x_1 = P * [1, 0]^T = first column of P = [0.5, 0.5]^T. The probability of state 1 is 0.5.',
      tag: 'numeric one-step computation',
      focus: 'Apply x_1 = P * x_0. When x_0 = e_1, the result is just the first column of P.',
    },
    {
      q: 'A Markov chain on 3 states has two disconnected groups: {A, B} and {C}. States A and B only talk to each other; state C is absorbing. This chain is NOT&hellip;',
      opts: [
        'Irreducible &mdash; you cannot get from C back to A or B',
        'Aperiodic &mdash; A and B oscillate with period 2',
        'Column-stochastic &mdash; the columns do not sum to 1',
        'Described by a matrix &mdash; the transition graph is too disconnected',
      ],
      a: 0,
      tag: 'irreducibility',
      focus: 'Irreducible means every state is reachable from every other. An absorbing state breaks that.',
      why: 'Once in state C you can never leave, so C cannot reach A or B. That breaks irreducibility. The chain can still be stochastic and described by a matrix; it just may not have a unique stationary distribution that everything converges to.',
      wrong: {
        1: 'Aperiodicity is about self-loops and cycle lengths, not about reachability. An absorbing state (self-loop at C) is actually aperiodic.',
        2: 'Being disconnected says nothing about whether columns sum to 1. You can have a perfectly valid column-stochastic P for a disconnected chain.',
        3: 'Any finite Markov chain is described by a matrix regardless of connectivity. The matrix just will not have a unique stationary distribution that all starts converge to.',
      },
    },
    {
      type: 'order',
      q: 'Put these steps in order to find the stationary distribution of a column-stochastic P from first principles.',
      steps: [
        'Write down the column-stochastic transition matrix P',
        'Set up the eigenvector equation Pπ = π, i.e. (P − I)π = 0',
        'Solve for π in the null space of (P − I)',
        'Normalise: divide by the sum of entries so π sums to 1',
      ],
      why: 'Start with P, translate stationarity into the lambda=1 eigenvector equation, find the null space of (P-I), then normalize to get a proper probability distribution.',
      tag: 'finding stationary distribution',
      focus: 'The stationary distribution is the normalized lambda=1 eigenvector. Write P, form (P-I), solve, normalize.',
    },
  ],
});

/* ================== LAB 1: chain stepping & convergence ================== */

INTERACTIVES.markovstepping = function(stage, api) {
  const L = makeLab(stage, {h: 460});

  // Default 3-state column-stochastic chain (rows: to-state, cols: from-state)
  // P = [[0.5, 0.1, 0.3], [0.3, 0.7, 0.2], [0.2, 0.2, 0.5]]
  const PRESETS = [
    {
      name: 'default',
      P: [[0.5, 0.1, 0.3], [0.3, 0.7, 0.2], [0.2, 0.2, 0.5]],
    },
    {
      name: 'fast mix',
      P: [[0.4, 0.35, 0.25], [0.35, 0.3, 0.35], [0.25, 0.35, 0.4]],
    },
    {
      name: 'sticky 2',
      P: [[0.05, 0.05, 0.9], [0.9, 0.05, 0.05], [0.05, 0.9, 0.05]],
    },
  ];

  const STARTS = [
    {name: 'start A', x: [1, 0, 0]},
    {name: 'start B', x: [0, 1, 0]},
    {name: 'start C', x: [0, 0, 1]},
  ];

  let preset = 0, startIdx = 0, steps = 0;
  let P = PRESETS[0].P.map(r => r.slice());
  let x = STARTS[0].x.slice();

  // Compute stationary distribution via power iteration (100 steps)
  function stationary(P) {
    let v = [1/3, 1/3, 1/3];
    for (let k = 0; k < 120; k++) v = matVec(P, v);
    const s = v[0] + v[1] + v[2] || 1;
    return v.map(vi => vi / s);
  }

  function matVec(M, v) {
    return [
      M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2],
      M[1][0]*v[0] + M[1][1]*v[1] + M[1][2]*v[2],
      M[2][0]*v[0] + M[2][1]*v[1] + M[2][2]*v[2],
    ];
  }

  function tvdist(a, b) {
    return 0.5 * (Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]));
  }

  const M = api.missions([
    {text: 'Step forward 10+ times from <b>start A</b> — watch the bar chart settle', xp: 20,
      check: s => s.steps >= 10},
    {text: 'Switch to <b>start B</b> or <b>start C</b> and step 15+ times — confirm they converge to the <b>same</b> &pi; (TV distance &lt; 0.05)', xp: 30,
      check: s => s.steps >= 15 && s.startIdx !== 0 && s.tvd < 0.05},
    {text: 'Try <b>sticky 2</b> preset &mdash; it still converges but takes <b>30+ steps</b>', xp: 25,
      check: s => s.preset === 2 && s.steps >= 30 && s.tvd < 0.05},
  ]);

  // --- drawing ---
  const COLORS = ['#7c5cff', '#ffc94d', '#2dd4a0'];
  const LABELS = ['A', 'B', 'C'];
  const BAR_W = 80, BAR_H = 180, BAR_GAP = 40;
  const BAR_X0 = 80;
  const BAR_Y0 = 320;

  function draw() {
    const ctx = L.ctx;
    clearBg(ctx, L.W, L.H);
    const pi = stationary(P);
    const tvd = tvdist(x, pi);

    // bar chart: x (current distribution) vs pi (stationary)
    for (let i = 0; i < 3; i++) {
      const bx = BAR_X0 + i * (BAR_W + BAR_GAP);
      // stationary pi (faint outline)
      const piH = pi[i] * BAR_H;
      ctx.strokeStyle = COLORS[i];
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(bx, BAR_Y0 - piH, BAR_W, piH);
      ctx.setLineDash([]);
      // current x (solid bar)
      const xH = x[i] * BAR_H;
      ctx.fillStyle = COLORS[i];
      ctx.globalAlpha = 0.85;
      ctx.fillRect(bx, BAR_Y0 - xH, BAR_W, xH);
      ctx.globalAlpha = 1;
      // label
      ctx.fillStyle = COLORS[i];
      ctx.font = 'bold 16px ' + getComputedStyle(document.body).fontFamily;
      ctx.textAlign = 'center';
      ctx.fillText('State ' + LABELS[i], bx + BAR_W/2, BAR_Y0 + 22);
      ctx.fillStyle = '#cdd4f0';
      ctx.font = '13px ' + getComputedStyle(document.body).fontFamily;
      ctx.fillText(fmt2(x[i]), bx + BAR_W/2, BAR_Y0 - xH - 6);
    }

    // pi readout legend
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px ' + getComputedStyle(document.body).fontFamily;
    ctx.textAlign = 'left';
    ctx.fillText('dashed outline = π (stationary)', BAR_X0, BAR_Y0 + 48);

    // axis label
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(BAR_X0 - 6, BAR_Y0);
    ctx.lineTo(BAR_X0 + 3*(BAR_W + BAR_GAP) - BAR_GAP + 6, BAR_Y0);
    ctx.stroke();

    // TV distance indicator
    const conv = tvd < 0.05;
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px ' + getComputedStyle(document.body).fontFamily;
    ctx.fillStyle = conv ? '#2dd4a0' : '#ffc94d';
    ctx.fillText(conv ? '✔ Converged to π (TV < 0.05)' : 'TV distance to π: ' + fmt2(tvd), BAR_X0, 60);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#cdd4f0';
    ctx.font = '13px ' + getComputedStyle(document.body).fontFamily;
    ctx.fillText('Steps: ' + steps, BAR_X0, 88);
    ctx.fillText('π ≈ [' + fmt2(pi[0]) + ', ' + fmt2(pi[1]) + ', ' + fmt2(pi[2]) + ']', BAR_X0, 112);

    L.readout.innerHTML = 'x = [' + fmt2(x[0]) + ', ' + fmt2(x[1]) + ', ' + fmt2(x[2]) + ']<br>'
      + 'π = [' + fmt2(pi[0]) + ', ' + fmt2(pi[1]) + ', ' + fmt2(pi[2]) + ']<br>'
      + 'TV dist = ' + fmt2(tvd) + (conv ? ' &nbsp;<b style="color:#2dd4a0">✓ converged</b>' : '');

    M.update({steps, tvd, startIdx, preset});
  }

  function reset() {
    x = STARTS[startIdx].x.slice();
    P = PRESETS[preset].P.map(r => r.slice());
    steps = 0;
    draw();
  }

  function step() {
    x = matVec(P, x);
    steps++;
    draw();
  }

  // step button
  const btnRow = document.createElement('div');
  btnRow.className = 'ctrl';
  const stepBtn = document.createElement('button');
  stepBtn.className = 'btn';
  stepBtn.textContent = 'Step forward (x = Px)';
  stepBtn.style.marginRight = '8px';
  stepBtn.onclick = step;
  const step10Btn = document.createElement('button');
  step10Btn.className = 'btn';
  step10Btn.textContent = 'Step ×10';
  step10Btn.onclick = () => { for (let i = 0; i < 10; i++) { x = matVec(P, x); steps++; } draw(); };
  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn ghost';
  resetBtn.style.marginLeft = '8px';
  resetBtn.textContent = 'Reset';
  resetBtn.onclick = reset;
  btnRow.appendChild(stepBtn);
  btnRow.appendChild(step10Btn);
  btnRow.appendChild(resetBtn);
  L.ctrl.appendChild(btnRow);

  chips(L.ctrl, 'START', STARTS.map(s => s.name), (i) => {
    startIdx = i; reset();
  });
  chips(L.ctrl, 'PRESET', PRESETS.map(p => p.name), (i) => {
    preset = i; reset();
  });

  const note = document.createElement('div');
  note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Each step computes x = Px. The <b>dashed outlines</b> show the stationary distribution π. Switch starting states and confirm they all converge to the same π &mdash; that is path-independence.</div>';
  L.ctrl.appendChild(note);

  reset();
};

/* ================== LAB 2: lambda=1 eigenvector & P*pi = pi verify ================== */

INTERACTIVES.markoveigen = function(stage, api) {
  const L = makeLab(stage, {h: 460});

  // Fixed P for predictability
  const P = [[0.6, 0.1, 0.25], [0.2, 0.8, 0.1], [0.2, 0.1, 0.65]];

  function matVec(M, v) {
    return [
      M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2],
      M[1][0]*v[0] + M[1][1]*v[1] + M[1][2]*v[2],
      M[2][0]*v[0] + M[2][1]*v[1] + M[2][2]*v[2],
    ];
  }
  function norm1(v) { const s = v[0]+v[1]+v[2] || 1; return v.map(vi => vi/s); }

  // True stationary
  let pi_true = [1/3, 1/3, 1/3];
  for (let k = 0; k < 200; k++) pi_true = norm1(matVec(P, pi_true));

  // Compute P*pi - pi residual
  function residual(v) {
    const Pv = matVec(P, v);
    return [Pv[0]-v[0], Pv[1]-v[1], Pv[2]-v[2]];
  }
  function resNorm(v) { const r = residual(v); return Math.sqrt(r[0]*r[0]+r[1]*r[1]+r[2]*r[2]); }

  let x = [1, 0, 0];
  let steps = 0;

  // Predict gate: commit a guess for pi[0] (state A probability in the limit)
  api.predict({
    prompt: 'P = [[0.6, 0.1, 0.25], [0.2, 0.8, 0.1], [0.2, 0.1, 0.65]] (column-stochastic). Start in state A (x = [1, 0, 0]). <br><br>After many steps the distribution settles to &pi;. Predict &pi;<sub>A</sub> (state A\'s probability in the limit) to 1 decimal place.',
    input: true,
    placeholder: '0.0 – 1.0',
    answer: Math.round(pi_true[0] * 10) / 10,
    tol: 0.08,
    unit: '',
    reveal: 'The true π<sub>A</sub> ≈ ' + pi_true[0].toFixed(3) + '. Now step forward and watch x converge to π. Then read the residual ‖Pπ − π‖ — it should collapse to ~0, confirming the eigenvector equation Pπ = π.',
  });

  const M = api.missions([
    {text: 'Run 20+ steps until the residual ‖Pπ − π‖ drops <b>below 0.01</b>', xp: 25,
      check: s => s.steps >= 20 && s.resNorm < 0.01},
    {text: 'Confirm path-independence: reset, switch to <b>start B</b> (x=[0,1,0]), run 20+ steps &mdash; same π', xp: 30,
      check: s => s.startB && s.steps >= 20 && s.resNorm < 0.01},
  ]);

  let startB = false;

  const COLORS = ['#7c5cff', '#ffc94d', '#2dd4a0'];
  const LABELS = ['A', 'B', 'C'];
  const BAR_W = 80, BAR_H = 180, BAR_GAP = 40, BAR_X0 = 80, BAR_Y0 = 310;

  function draw() {
    const ctx = L.ctx;
    clearBg(ctx, L.W, L.H);
    const rn = resNorm(x);

    for (let i = 0; i < 3; i++) {
      const bx = BAR_X0 + i * (BAR_W + BAR_GAP);
      // true pi dashed
      const piH = pi_true[i] * BAR_H;
      ctx.strokeStyle = COLORS[i];
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(bx, BAR_Y0 - piH, BAR_W, piH);
      ctx.setLineDash([]);
      // current x
      const xH = x[i] * BAR_H;
      ctx.fillStyle = COLORS[i];
      ctx.globalAlpha = 0.85;
      ctx.fillRect(bx, BAR_Y0 - xH, BAR_W, xH);
      ctx.globalAlpha = 1;
      ctx.fillStyle = COLORS[i];
      ctx.font = 'bold 15px ' + getComputedStyle(document.body).fontFamily;
      ctx.textAlign = 'center';
      ctx.fillText('State ' + LABELS[i], bx + BAR_W/2, BAR_Y0 + 22);
      ctx.fillStyle = '#cdd4f0';
      ctx.font = '12px ' + getComputedStyle(document.body).fontFamily;
      ctx.fillText(fmt2(x[i]), bx + BAR_W/2, BAR_Y0 - xH - 6);
    }

    // Residual display
    const res = residual(x);
    const conv = rn < 0.01;
    ctx.textAlign = 'left';
    ctx.fillStyle = conv ? '#2dd4a0' : '#ffc94d';
    ctx.font = 'bold 13px ' + getComputedStyle(document.body).fontFamily;
    ctx.fillText('‖Pπ − π‖ = ' + rn.toFixed(4) + (conv ? '  ✔ Pπ = π confirmed' : ''), BAR_X0, 55);

    ctx.fillStyle = '#cdd4f0';
    ctx.font = '12px ' + getComputedStyle(document.body).fontFamily;
    ctx.fillText('Pπ − π = [' + res.map(v => v.toFixed(3)).join(', ') + ']', BAR_X0, 78);
    ctx.fillText('Steps: ' + steps, BAR_X0, 100);
    ctx.fillText('π_true = [' + pi_true.map(v => v.toFixed(3)).join(', ') + '] (dashed)', BAR_X0, 122);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(BAR_X0 - 6, BAR_Y0);
    ctx.lineTo(BAR_X0 + 3*(BAR_W + BAR_GAP) - BAR_GAP + 6, BAR_Y0);
    ctx.stroke();

    L.readout.innerHTML = 'x = [' + x.map(v => v.toFixed(3)).join(', ') + ']<br>'
      + '‖Pπ − π‖ = ' + rn.toFixed(5) + (conv ? ' &nbsp;<b style="color:#2dd4a0">✓ eigenvector verified</b>' : '');

    M.update({steps, resNorm: rn, startB});
  }

  function stepFwd() {
    x = norm1(matVec(P, x));
    steps++;
    draw();
  }

  const btnRow = document.createElement('div');
  btnRow.className = 'ctrl';
  const stepBtn = document.createElement('button');
  stepBtn.className = 'btn';
  stepBtn.textContent = 'Step (x = Px, normalize)';
  stepBtn.style.marginRight = '8px';
  stepBtn.onclick = stepFwd;
  const step5Btn = document.createElement('button');
  step5Btn.className = 'btn';
  step5Btn.textContent = 'Step ×5';
  step5Btn.onclick = () => { for (let i = 0; i < 5; i++) { x = norm1(matVec(P, x)); steps++; } draw(); };
  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn ghost';
  resetBtn.style.marginLeft = '8px';
  resetBtn.textContent = 'Reset to A';
  resetBtn.onclick = () => { x = [1, 0, 0]; steps = 0; startB = false; draw(); };
  btnRow.appendChild(stepBtn);
  btnRow.appendChild(step5Btn);
  btnRow.appendChild(resetBtn);
  L.ctrl.appendChild(btnRow);

  chips(L.ctrl, 'START', ['start A', 'start B', 'start C'], (i) => {
    x = [[1,0,0],[0,1,0],[0,0,1]][i].slice();
    steps = 0;
    startB = (i === 1);
    draw();
  });

  const note = document.createElement('div');
  note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Each step normalises x after multiplying by P, tracing power iteration explicitly. The residual ‖Pπ − π‖ measures how far x is from being a true eigenvector. Watch it collapse to ~0.</div>';
  L.ctrl.appendChild(note);

  draw();
};

/* ================== LAB 3: break the assumptions ================== */

INTERACTIVES.markovbroken = function(stage, api) {
  const L = makeLab(stage, {h: 460});

  // Two broken chains + one good reference
  const SCENARIOS = [
    {
      name: 'reducible (absorbing)',
      // State C is absorbing; A and B can reach each other but not C once there
      // Columns: from A, from B, from C
      P: [[0.5, 0.5, 0], [0.5, 0.5, 0], [0, 0, 1]],
      broken: true,
      why: 'State C is absorbing (P[C][C]=1) and unreachable from A,B. The chain is reducible: not all states communicate. The limit depends on the start — NOT path-independent.',
    },
    {
      name: 'periodic (2-cycle)',
      // States A, B alternate perfectly: P[B][A]=1, P[A][B]=1, C self-loops
      // A -> B -> A -> ... (period 2). Not aperiodic.
      P: [[0, 1, 0], [1, 0, 0], [0, 0, 1]],
      broken: true,
      why: 'States A and B alternate with period 2. The chain never converges from [1,0,0] — it oscillates [1,0,0] → [0,1,0] → [1,0,0] → … forever. Not aperiodic.',
    },
    {
      name: 'good (irreducible + aperiodic)',
      P: [[0.5, 0.1, 0.3], [0.3, 0.7, 0.2], [0.2, 0.2, 0.5]],
      broken: false,
      why: 'Irreducible (all states communicate) and aperiodic (self-loops in every diagonal). Converges to a unique π from any start.',
    },
  ];

  let si = 0, x = [1, 0, 0], steps = 0;

  function matVec(M, v) {
    return [
      M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2],
      M[1][0]*v[0] + M[1][1]*v[1] + M[1][2]*v[2],
      M[2][0]*v[0] + M[2][1]*v[1] + M[2][2]*v[2],
    ];
  }

  // Oscillation metric: max difference over last two consecutive distributions
  let prevX = null, oscillation = 0;

  const M = api.missions([
    {text: 'On <b>reducible</b>: start in state C (x=[0,0,1]) and step 10+ times &mdash; show it stays stuck at C', xp: 20,
      check: s => s.si === 0 && s.x2 > 0.9 && s.steps >= 10},
    {text: 'On <b>periodic</b>: start at A (x=[1,0,0]) and step 6+ times &mdash; the chain oscillates (never converges)', xp: 25,
      check: s => s.si === 1 && s.oscillation > 0.6 && s.steps >= 6},
    {text: 'Switch to the <b>good</b> chain &mdash; confirm it converges from any start (TV distance &lt; 0.05 after 20+ steps)', xp: 20,
      check: s => s.si === 2 && s.tvd < 0.05 && s.steps >= 20},
  ]);

  function stationary(P) {
    let v = [1/3, 1/3, 1/3];
    for (let k = 0; k < 150; k++) { const nv = matVec(P, v); const s = nv[0]+nv[1]+nv[2]||1; v = nv.map(vi=>vi/s); }
    return v;
  }

  function tvdist(a, b) {
    return 0.5*(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+Math.abs(a[2]-b[2]));
  }

  const COLORS = ['#7c5cff', '#ffc94d', '#2dd4a0'];
  const LABELS = ['A', 'B', 'C'];
  const BAR_W = 80, BAR_H = 160, BAR_GAP = 40, BAR_X0 = 80, BAR_Y0 = 310;

  function draw() {
    const ctx = L.ctx;
    clearBg(ctx, L.W, L.H);
    const sc = SCENARIOS[si];
    const pi = stationary(sc.P);
    const tvd = tvdist(x, pi);

    for (let i = 0; i < 3; i++) {
      const bx = BAR_X0 + i * (BAR_W + BAR_GAP);
      const piH = pi[i] * BAR_H;
      ctx.strokeStyle = COLORS[i];
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(bx, BAR_Y0 - piH, BAR_W, piH);
      ctx.setLineDash([]);
      const xH = x[i] * BAR_H;
      ctx.fillStyle = COLORS[i];
      ctx.globalAlpha = 0.85;
      ctx.fillRect(bx, BAR_Y0 - xH, BAR_W, xH);
      ctx.globalAlpha = 1;
      ctx.fillStyle = COLORS[i];
      ctx.font = 'bold 15px ' + getComputedStyle(document.body).fontFamily;
      ctx.textAlign = 'center';
      ctx.fillText('State ' + LABELS[i], bx + BAR_W/2, BAR_Y0 + 22);
      ctx.fillStyle = '#cdd4f0';
      ctx.font = '12px ' + getComputedStyle(document.body).fontFamily;
      ctx.fillText(fmt2(x[i]), bx + BAR_W/2, BAR_Y0 - xH - 6);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(BAR_X0 - 6, BAR_Y0);
    ctx.lineTo(BAR_X0 + 3*(BAR_W + BAR_GAP) - BAR_GAP + 6, BAR_Y0);
    ctx.stroke();

    // status line
    const isBroken = sc.broken;
    ctx.textAlign = 'left';
    ctx.fillStyle = isBroken ? '#ff5c7a' : '#2dd4a0';
    ctx.font = 'bold 13px ' + getComputedStyle(document.body).fontFamily;
    ctx.fillText(isBroken ? '⚠ BROKEN: ' + (si === 0 ? 'reducible' : 'periodic') : '✔ good chain (converges)', BAR_X0, 52);

    ctx.fillStyle = '#cdd4f0';
    ctx.font = '12px ' + getComputedStyle(document.body).fontFamily;

    const lines = sc.why.split(' — ');
    let lineY = 76;
    for (const line of lines) {
      const words = line.split(' ');
      let row = '';
      for (const w of words) {
        const test = row ? row + ' ' + w : w;
        if (test.length > 72) { ctx.fillText(row, BAR_X0, lineY); lineY += 18; row = w; }
        else row = test;
      }
      if (row) { ctx.fillText(row, BAR_X0, lineY); lineY += 18; }
    }

    ctx.fillText('Steps: ' + steps + '  |  TV dist to π: ' + fmt2(tvd), BAR_X0, BAR_Y0 + 50);
    ctx.fillText('oscillation metric: ' + fmt2(oscillation), BAR_X0, BAR_Y0 + 70);

    L.readout.innerHTML = 'x = [' + x.map(v => v.toFixed(3)).join(', ') + ']<br>'
      + 'TV dist = ' + fmt2(tvd) + '<br>'
      + (isBroken ? '<b style="color:#ff5c7a">' + sc.name + ' — no convergence guarantee</b>' : '<b style="color:#2dd4a0">converges normally</b>');

    M.update({si, steps, tvd, oscillation, x0: x[0], x1: x[1], x2: x[2]});
  }

  function reset() {
    x = [1, 0, 0];
    prevX = null;
    oscillation = 0;
    steps = 0;
    draw();
  }

  function stepFwd() {
    prevX = x.slice();
    x = matVec(SCENARIOS[si].P, x);
    // oscillation: how much x alternates from the previous-previous state
    if (prevX) {
      oscillation = 0.5 * (Math.abs(x[0]-prevX[0]) + Math.abs(x[1]-prevX[1]) + Math.abs(x[2]-prevX[2]));
    }
    steps++;
    draw();
  }

  const btnRow = document.createElement('div');
  btnRow.className = 'ctrl';
  const stepBtn = document.createElement('button');
  stepBtn.className = 'btn';
  stepBtn.textContent = 'Step (x = Px)';
  stepBtn.style.marginRight = '8px';
  stepBtn.onclick = stepFwd;
  const step5Btn = document.createElement('button');
  step5Btn.className = 'btn';
  step5Btn.textContent = 'Step ×5';
  step5Btn.onclick = () => { for (let i = 0; i < 5; i++) stepFwd(); };
  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn ghost';
  resetBtn.style.marginLeft = '8px';
  resetBtn.textContent = 'Reset';
  resetBtn.onclick = reset;
  btnRow.appendChild(stepBtn);
  btnRow.appendChild(step5Btn);
  btnRow.appendChild(resetBtn);
  L.ctrl.appendChild(btnRow);

  chips(L.ctrl, 'SCENARIO', SCENARIOS.map(s => s.name), (i) => {
    si = i; reset();
  });

  chips(L.ctrl, 'START', ['A', 'B', 'C'], (i) => {
    x = [[1,0,0],[0,1,0],[0,0,1]][i].slice();
    prevX = null;
    oscillation = 0;
    steps = 0;
    draw();
  });

  const note = document.createElement('div');
  note.className = 'ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Try each broken scenario from different starts. On the <b style="color:#ff5c7a">reducible</b> chain the long-run distribution depends on where you start. On the <b style="color:#ff5c7a">periodic</b> chain it oscillates forever. The <b style="color:#2dd4a0">good chain</b> converges from all starts.</div>';
  L.ctrl.appendChild(note);

  reset();
};
