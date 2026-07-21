#!/usr/bin/env node
/* Bundle discipline guard (CI-able).
 *
 * The plan (docs/VISUAL_FIRST.md §8) requires: "pixi.js rides the existing
 * post-auth import() split; three.js loads per-lesson on axes3. CI check:
 * initial auth-gate bundle unchanged." The split point is
 * components/Minima.jsx: curriculum + engine (and therefore the Scene Kit and
 * pixi/three that they pull in) are dynamically import()ed only after `session`
 * becomes truthy. So the initial chunk set for route '/' — everything the
 * browser loads BEFORE auth — must never contain pixi/three, and must not grow
 * materially.
 *
 * This guard reads the Next build output (.next/app-build-manifest.json for the
 * initial chunk list of '/page') and enforces two invariants against
 * bench/bundle-baseline.json:
 *   1. FORBIDDEN-MARKER SCAN (primary, robust): no initial '/page' chunk file
 *      contains pixi/three renderer code. A single leaked static import of
 *      pixi.js anywhere reachable from the pre-auth shell trips this.
 *   2. SIZE GUARD (secondary): total initial-chunk disk bytes stay within a
 *      tolerance of baseline (coarse; catches a large leak the marker scan
 *      might miss if a dep is renamed/minified past recognition).
 *
 * Usage:
 *   npm run build && node bench/bundle-guard.mjs          # verify (exit 1 on regression)
 *   node bench/bundle-guard.mjs --update                  # rewrite baseline from current build
 *   node bench/bundle-guard.mjs --first-load-kb 172       # also assert Next First Load JS
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const NEXT = join(REPO, '.next');
const MANIFEST = join(NEXT, 'app-build-manifest.json');
const BASELINE = join(__dirname, 'bundle-baseline.json');
const PAGE = '/page'; // the sole auth-gate route (single-page app; see next.config)

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const flagVal = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };

function fail(msg) { console.error('BUNDLE GUARD FAIL: ' + msg); process.exit(1); }

if (!existsSync(MANIFEST)) {
  fail(`no build manifest at ${MANIFEST}. Run \`npm run build\` first.`);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const chunks = manifest.pages?.[PAGE];
if (!Array.isArray(chunks) || chunks.length === 0) {
  fail(`manifest has no chunk list for ${PAGE}. Did the route change?`);
}

// Only .js chunks carry code; sum their on-disk bytes and scan their contents.
const jsChunks = chunks.filter((c) => c.endsWith('.js'));
let totalBytes = 0;
const perChunk = [];
for (const c of jsChunks) {
  const p = join(NEXT, c);
  const bytes = existsSync(p) ? statSync(p).size : 0;
  totalBytes += bytes;
  perChunk.push({ chunk: c, bytes, path: p });
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : null;
// Distinctive substrings only — bare 'pixi'/'three' are ordinary-word-adjacent
// and would false-positive on minified app code; the regex signature scan below
// is the primary detector.
const forbidden = baseline?.forbiddenInInitialChunks ?? ['pixi.js', '@pixi', 'three.module'];

// --- 1. forbidden-marker scan -------------------------------------------------
// Look for the actual renderer runtime, not just any occurrence of the substring
// (the string "three" appears in ordinary English/minified identifiers). We use
// distinctive tokens that pixi/three emit into their bundles.
const RENDERER_SIGNATURES = [
  /PixiJS/, /pixi\.js/i, /ParticleContainer/, /WebGLRenderer/, /THREE\.[A-Z]/,
  /OrbitControls/, /BufferGeometry/, /__PIXI_/,
];
const leaks = [];
for (const { chunk, path } of perChunk) {
  if (!existsSync(path)) continue;
  const src = readFileSync(path, 'utf8');
  const hitSig = RENDERER_SIGNATURES.filter((re) => re.test(src)).map(String);
  const hitName = forbidden.filter((n) => src.includes(n));
  if (hitSig.length || hitName.length) {
    leaks.push({ chunk, signatures: hitSig, names: hitName });
  }
}

// --- update mode --------------------------------------------------------------
if (has('--update')) {
  // Never normalize a leaked build into the baseline: if renderer code is in
  // the initial chunks, updating would bless the regression permanently.
  if (leaks.length && !has('--force')) {
    for (const l of leaks) console.error(`  leak: ${l.chunk}  matched ${[...l.signatures, ...l.names].join(', ')}`);
    fail('refusing --update: renderer code present in initial chunks (see above). Fix the leak, or pass --force if this is a deliberate policy change.');
  }
  const next = {
    ...(baseline ?? {}),
    _comment: baseline?._comment ?? 'Auth-gate bundle baseline. Regenerate: npm run build && node bench/bundle-guard.mjs --update.',
    measuredAt: new Date().toISOString().slice(0, 10),
    route: PAGE,
    initialChunkBytesOnDisk: totalBytes,
    initialChunkCount: jsChunks.length,
    forbiddenInInitialChunks: forbidden,
  };
  const fl = flagVal('--first-load-kb');
  if (fl) next.firstLoadJsKB = Number(fl);
  writeFileSync(BASELINE, JSON.stringify(next, null, 2) + '\n');
  console.log(`baseline updated: ${jsChunks.length} chunks, ${totalBytes.toLocaleString()} bytes.`);
  process.exit(0);
}

// --- report -------------------------------------------------------------------
console.log(`Auth-gate route ${PAGE}: ${jsChunks.length} initial JS chunks, ${totalBytes.toLocaleString()} bytes on disk.`);
for (const { chunk, bytes } of perChunk) console.log(`  ${bytes.toString().padStart(9)}  ${chunk}`);

let bad = false;
if (leaks.length) {
  bad = true;
  console.error('\nRenderer code leaked into the pre-auth chunk set:');
  for (const l of leaks) console.error(`  ${l.chunk}  matched ${[...l.signatures, ...l.names].join(', ')}`);
  console.error('  -> pixi/three must be reached only via the post-auth import() in components/Minima.jsx.');
}

if (baseline) {
  const maxPct = baseline.tolerance?.diskBytesMaxGrowthPct ?? 8;
  const base = baseline.initialChunkBytesOnDisk ?? totalBytes;
  const growthPct = ((totalBytes - base) / base) * 100;
  console.log(`\nDisk-byte drift vs baseline: ${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}% (limit +${maxPct}%).`);
  if (growthPct > maxPct) {
    bad = true;
    console.error(`  -> initial chunk grew ${growthPct.toFixed(1)}% > ${maxPct}% tolerance.`);
  }

  const flArg = flagVal('--first-load-kb');
  const flMax = baseline.tolerance?.firstLoadJsKBMax;
  if (flArg && flMax != null) {
    const fl = Number(flArg);
    console.log(`Next First Load JS: ${fl} kB (limit ${flMax} kB).`);
    if (fl > flMax) { bad = true; console.error(`  -> First Load JS ${fl} kB > ${flMax} kB.`); }
  }
}

if (bad) { console.error('\nBUNDLE GUARD FAIL'); process.exit(1); }
console.log('\nBUNDLE GUARD PASS');
