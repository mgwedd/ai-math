# Scene Kit — quality, perf & bundle harness

Owned by the **quality** principal (`ai/p0-quality`). Everything here is
CI-ready: standalone node scripts + vitest files, no GPU, no browser.

## Bundle discipline (VISUAL_FIRST §8: "initial auth-gate bundle unchanged")

The app is a single page (`/`) whose lesson code — and therefore the Scene Kit,
pixi.js and later three.js — is loaded via a **post-auth `import()`** in
`components/Minima.jsx` (the dynamic import fires only when `session` is truthy).
So pixi/three must never appear in the initial chunk set for route `/`.

```bash
npm run build
node bench/bundle-guard.mjs --first-load-kb 172   # exit 1 on regression
```

`bundle-guard.mjs` reads `.next/app-build-manifest.json` for the `/page` initial
chunk list and enforces, against `bundle-baseline.json`:

1. **Forbidden-marker scan (primary):** no initial chunk contains pixi/three
   renderer code (`PixiJS`, `ParticleContainer`, `WebGLRenderer`, `THREE.*`,
   `OrbitControls`, …). A single leaked static import trips this. Verified to
   have teeth (fails on an injected marker, passes clean).
2. **Size guard (secondary):** total initial-chunk disk bytes stay within
   tolerance of baseline.

Pass `--first-load-kb N` with the Next-reported "First Load JS" for `/` to also
assert that metric (authoritative). Re-baseline after an intentional shell
change: `node bench/bundle-guard.mjs --update --first-load-kb N`.

### Baseline (measured pre-Scene-Kit, on `origin/ai/scene-kit-p0`)

| metric | value |
|---|---|
| route `/` First Load JS | **172 kB** |
| `/page` initial JS chunks | 7 |
| initial chunk bytes on disk | 611,624 |

This is the number the kit must not regress once pixi lands.

## Perf envelope (VISUAL_FIRST §3: 60 fps, 50×50 grid morph + point field)

```bash
node bench/entity-diff-bench.mjs [--frames 600] [--grid 50] [--points 1000]
```

Measures the **CPU slice** of a frame — `entities(p,t)` rebuild + keyed diff —
which must be a small fraction of the 16.67 ms budget (the GPU does the draw).
Auto-detects `lib/scene/` and drives the real diff when present; otherwise runs a
faithful PROXY (2500-vertex morphing grid + 1000 points, whole list changing
every frame). Exits 1 if p95 build+diff exceeds 50% of budget (superlinear
regression tripwire).

### Baseline (PROXY, pre-kit)

| stage | p95 |
|---|---|
| `entities()` build | 0.10 ms |
| keyed diff | 0.67 ms |
| **build+diff total** | **0.73 ms = 4.4% of 16.67 ms** |

Re-run once `lib/scene/diff.js` lands to replace proxy numbers with real ones.

## Invariant test harness

- `test/scene-harness.mjs` — DOM/WebGL stubs, purity poisoning, `assertPlainData`,
  `fakeClock`, feature-detect helpers.
- `test/scene-harness.test.mjs` — proves the harness has teeth (runs now).
- `test/scene-kit.test.mjs` — the real-kit invariants (CONTRACT §1/§3/§4/§5/§7/§8);
  `skipIf` the peer module is absent, so green before integration.

Activate the real-kit tests against a peer branch from this worktree:

```bash
git checkout origin/ai/p0-kit-core -- lib/scene   # or fetch+merge the branch
npx vitest run test/scene-kit.test.mjs
```
