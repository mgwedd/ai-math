/* Probability generators: Bayes posterior from a prior + likelihoods, and the
   expectation of a small discrete random variable. Both numeric so the answer
   is independently verifiable. Correct-by-construction over a seeded rng. */
import { registerGenerator, makeRng, numeric, round } from './registry.js';

const pct = (x) => round(x * 100, 2) + '%';

/* ---- Bayes: posterior P(D|+) from prior, sensitivity, false-positive rate ----
   P(D|+) = P(+|D)P(D) / [ P(+|D)P(D) + P(+|¬D)P(¬D) ]                          */
registerGenerator({
  id: 'bayes-posterior', concept: 'bayes-theorem', qtype: 'numeric',
  make(seed){
    const r = makeRng(seed);
    const prior = r.pick([0.001, 0.005, 0.01, 0.02, 0.05, 0.1]); // base rate P(D)
    const sens  = r.pick([0.8, 0.9, 0.95, 0.99]);                // P(+|D)  sensitivity
    const fpr   = r.pick([0.02, 0.05, 0.08, 0.1, 0.2]);          // P(+|¬D) false-positive rate
    const joint = sens * prior;                 // P(+, D)
    const evid  = joint + fpr * (1 - prior);    // P(+)
    const post  = joint / evid;                 // P(D|+)
    return numeric({
      q: 'A condition affects <b>' + pct(prior) + '</b> of people. A test detects it '
       + '<b>' + pct(sens) + '</b> of the time when present (sensitivity), but also flags '
       + '<b>' + pct(fpr) + '</b> of healthy people (false-positive rate). '
       + 'A random person tests positive. What is the probability they actually have the condition? '
       + '(Give a decimal in [0, 1].)',
      answer: post, tol: 1e-3,
      hint: 'Bayes: P(D|+) = P(+|D)·P(D) / [P(+|D)·P(D) + P(+|¬D)·P(¬D)]. The false-positive term uses P(¬D) = 1 − prior.',
      why: 'P(D|+) = (' + sens + '·' + prior + ') / (' + sens + '·' + prior + ' + ' + fpr + '·' + round(1 - prior, 4) + ') = '
         + round(joint, 6) + ' / ' + round(evid, 6) + ' = <b>' + round(post, 4) + '</b>. '
         + 'Low base rates keep the posterior small even after a positive — the base-rate effect.',
      tag: 'posterior computation',
      focus: 'Bayes with a base rate: weigh the true-positive mass P(+|D)P(D) against the false-positive mass P(+|¬D)P(¬D).',
    });
  },
});

/* ---- expectation of a discrete RV: E[X] = Σ vᵢ·(wᵢ/W) ---- */
registerGenerator({
  id: 'expectation-discrete', concept: 'expectation-random-variables', qtype: 'numeric',
  make(seed){
    const r = makeRng(seed);
    const k = r.int(3, 4);                    // number of outcomes
    const vals = [], wts = [];
    for(let i = 0; i < k; i++){ vals.push(r.int(1, 10)); wts.push(r.int(1, 5)); }
    const W = wts.reduce((s, w) => s + w, 0);
    const ans = vals.reduce((s, v, i) => s + v * wts[i], 0) / W;  // Σ vᵢ wᵢ / W
    const rows = vals.map((v, i) => 'value <b>' + v + '</b> with probability ' + wts[i] + '/' + W).join('; ');
    return numeric({
      q: 'A random variable X takes ' + k + ' values: ' + rows + '. What is the expected value E[X]?',
      answer: ans, tol: 1e-6,
      hint: 'E[X] = Σ (value × its probability). With probabilities wᵢ/' + W + ', that is (Σ valueᵢ·wᵢ) / ' + W + '.',
      why: 'E[X] = ' + vals.map((v, i) => v + '·' + wts[i] + '/' + W).join(' + ') + ' = '
         + vals.reduce((s, v, i) => s + v * wts[i], 0) + '/' + W + ' = <b>' + round(ans, 4) + '</b>.',
      tag: 'expectation',
      focus: 'Expectation is a probability-weighted average: multiply each outcome by its probability and sum — not a plain mean of the values.',
    });
  },
});
