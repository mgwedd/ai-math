#!/usr/bin/env node
/* Perf-envelope bench for the Scene Kit's entity-diff layer (node proxy).
 *
 * The plan (docs/VISUAL_FIRST.md §3) states the target envelope: "60 fps morphs
 * of a 50×50 grid" plus particle/point fields, "one full-screen scene at a
 * time". 60 fps => a 16.67 ms frame budget. The GPU (Pixi/three) does the draw;
 * the CPU work every frame is:
 *     params change  ->  entities(p, t) rebuilds the display list  ->  the kit
 *     diffs that list against the retained scene graph  ->  draw layer applies.
 * The build + diff is the part that runs in JS on the main thread, so it must be
 * a small slice of 16.67 ms to leave headroom for the GPU submit. This bench
 * measures exactly that slice in node, where no browser/GPU is available.
 *
 * Two modes, auto-selected:
 *   - REAL:  if lib/scene/ exports entities-building + a diff/reconcile fn, we
 *            drive the kit itself. (Wired to try several likely export names;
 *            falls back to PROXY and says so if the kit isn't present yet.)
 *   - PROXY: a faithful stand-in — a 50×50 morphable grid (2500 vertices) + a
 *            1000-point field, rebuilt and keyed-diffed every frame with animated
 *            params. This models the CPU shape of the real layer so we have a
 *            concrete number before the kit lands, and a regression tripwire
 *            after.
 *
 * Usage:  node bench/entity-diff-bench.mjs [--frames 600] [--grid 50] [--points 1000]
 */
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');

const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? Number(process.argv[i + 1]) : def;
};
const FRAMES = arg('frames', 600);
const GRID = arg('grid', 50);
const POINTS = arg('points', 1000);
const BUDGET_MS = 1000 / 60; // 16.67

/* ------------------------------- proxy model ------------------------------- */
// A display-list entity is { key, kind, ...props } (CONTRACT §3). The grid morph animates every
// vertex; the point field animates every point. This is the worst-ish case: the
// whole list changes each frame, so the diff can't skip anything.

function buildDisplayList(t, grid, points) {
  const list = [];
  // Grid vertices morphed under a time-varying shear/rotation matrix.
  const a = Math.cos(t), b = -Math.sin(t) * 0.6, c = Math.sin(t) * 0.6, d = Math.cos(t);
  for (let iy = 0; iy < grid; iy++) {
    for (let ix = 0; ix < grid; ix++) {
      const x0 = ix / (grid - 1) * 2 - 1;
      const y0 = iy / (grid - 1) * 2 - 1;
      list.push({
        key: 'g' + iy * grid + ix,
        kind: 'gridVertex',
        x: a * x0 + b * y0,
        y: c * x0 + d * y0,
        color: 'accent',
      });
    }
  }
  // Point field: 1000 points drifting on Lissajous-ish paths.
  for (let i = 0; i < points; i++) {
    const ph = i * 0.023;
    list.push({
      key: 'p' + i,
      kind: 'point',
      x: Math.sin(t + ph) * 0.9,
      y: Math.cos(t * 1.3 + ph) * 0.9,
      r: 2,
      color: 'accent2',
    });
  }
  return list;
}

// Reference keyed diff (PROXY mode): reconcile next list against prev retained
// map by key, counting add / remove / update ops — the shape a retained-mode
// draw layer needs. O(n) with a Map, shallow prop compare.
function keyedDiff(prevMap, nextList) {
  const seen = new Set();
  let adds = 0, updates = 0, removes = 0;
  const nextMap = new Map();
  for (const e of nextList) {
    nextMap.set(e.key, e);
    seen.add(e.key);
    const prev = prevMap.get(e.key);
    if (!prev) { adds++; continue; }
    // shallow compare props (the reconcile has to detect what changed)
    let changed = false;
    for (const k in e) { if (e[k] !== prev[k]) { changed = true; break; } }
    if (!changed) for (const k in prev) { if (!(k in e)) { changed = true; break; } }
    if (changed) updates++;
  }
  for (const key of prevMap.keys()) if (!seen.has(key)) removes++;
  return { nextMap, adds, updates, removes };
}

/* Mode adapters — unify the runner loop over both diff shapes.
 * PROXY carries a Map as retained state. REAL follows CONTRACT §4 exactly:
 * diff(prevList, nextList) -> ops[], op = {type:'add'|'update'|'remove', ...},
 * so its retained state is simply the previous entity ARRAY. */
function proxyStep(prevState, nextList) {
  const r = keyedDiff(prevState, nextList);
  return { state: r.nextMap, adds: r.adds, updates: r.updates, removes: r.removes };
}
function makeRealStep(diff) {
  return (prevState, nextList) => {
    const ops = diff(prevState, nextList);   // CONTRACT §4: (prev[], next[]) -> op[]
    let adds = 0, updates = 0, removes = 0;
    for (const op of ops) {
      if (op.type === 'add') adds++;
      else if (op.type === 'update') updates++;
      else if (op.type === 'remove') removes++;
    }
    return { state: nextList, adds, updates, removes };
  };
}

/* ------------------------------ real kit probe ----------------------------- */
async function tryLoadKit() {
  const candidates = ['lib/scene/index.js', 'lib/scene/index.mjs', 'lib/scene/kit.js'];
  for (const rel of candidates) {
    if (existsSync(join(REPO, rel))) {
      try {
        const mod = await import(join(REPO, rel));
        // Look for a diff/reconcile export and an entities-eval helper. Names are
        // guesses against the CONTRACT; adjust when the kit's real API lands.
        const diff = mod.diffEntities || mod.reconcile || mod.diff;
        if (typeof diff === 'function') return { mod, diff, rel };
      } catch (e) {
        console.warn(`kit present at ${rel} but failed to import: ${e.message}`);
      }
    }
  }
  return null;
}

/* --------------------------------- runner ---------------------------------- */
function pct(sorted, p) { return sorted[Math.min(sorted.length - 1, Math.floor(p / 100 * sorted.length))]; }

async function main() {
  const kit = await tryLoadKit();
  const mode = kit ? `REAL (kit.diff from ${kit.rel})` : 'PROXY (kit not present yet)';
  console.log(`entity-diff bench — mode: ${mode}`);
  console.log(`workload: ${GRID}x${GRID} grid (${GRID * GRID} vertices) + ${POINTS} points = ${GRID * GRID + POINTS} entities/frame, ${FRAMES} frames, budget ${BUDGET_MS.toFixed(2)} ms/frame\n`);

  const step = kit ? makeRealStep(kit.diff) : proxyStep;
  const freshState = () => (kit ? [] : new Map());
  const buildTimes = [], diffTimes = [], totalTimes = [];
  let state = freshState();
  let lastOps = null;

  // warm up JIT
  for (let i = 0; i < 30; i++) { const l = buildDisplayList(i * 0.01, GRID, POINTS); state = step(state, l).state; }
  state = freshState();

  for (let f = 0; f < FRAMES; f++) {
    const t = f * 0.016;
    const b0 = performance.now();
    const list = buildDisplayList(t, GRID, POINTS);
    const b1 = performance.now();
    const res = step(state, list);
    const b2 = performance.now();
    state = res.state;
    lastOps = res;
    buildTimes.push(b1 - b0);
    diffTimes.push(b2 - b1);
    totalTimes.push(b2 - b0);
  }

  const rep = (arr, label) => {
    const s = [...arr].sort((x, y) => x - y);
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    console.log(`${label.padEnd(14)} mean ${mean.toFixed(3)}ms  p50 ${pct(s, 50).toFixed(3)}ms  p95 ${pct(s, 95).toFixed(3)}ms  p99 ${pct(s, 99).toFixed(3)}ms  max ${s[s.length - 1].toFixed(3)}ms`);
  };
  rep(buildTimes, 'entities()');
  rep(diffTimes, 'diff');
  rep(totalTimes, 'build+diff');

  const s = [...totalTimes].sort((x, y) => x - y);
  const p95 = pct(s, 95);
  const budgetFrac = (p95 / BUDGET_MS) * 100;
  console.log(`\nlast-frame diff ops: +${lastOps.adds} ~${lastOps.updates} -${lastOps.removes}`);
  console.log(`CPU build+diff p95 = ${p95.toFixed(3)}ms = ${budgetFrac.toFixed(1)}% of the 16.67ms frame budget (leaves ${(BUDGET_MS - p95).toFixed(2)}ms for GPU submit + everything else).`);
  if (!kit) console.log('NOTE: PROXY numbers. The real kit may add per-entity allocation the draw layer amortizes; re-run once lib/scene lands.');

  // Regression tripwire: the CPU slice should be a minority of the frame. Fail
  // loudly if the proxy ever exceeds half the budget (something got quadratic).
  if (p95 > BUDGET_MS * 0.5) {
    console.error(`\nPERF WARN: build+diff p95 ${p95.toFixed(2)}ms exceeds 50% of frame budget — the diff layer may be superlinear.`);
    process.exit(1);
  }
}

main();
