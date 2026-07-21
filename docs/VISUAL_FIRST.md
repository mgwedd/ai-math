# Visual-First: Architecture & Technical Plan

**Thesis: the visuals ARE the lesson and the exam.** Text, quizzes, and
go-deeper expanders are demoted to supporting cast. Every concept is taught by
direct manipulation of shapes, motion, and space — and assessed the same way.
This is an education platform that happens to be delightful, not edutainment
with math sprinkled on: a lesson is passed by *performing the insight*, not by
recognizing a sentence about it.

This doc is the architecture decision record + migration plan. It is grounded
in a full audit of the current codebase (numbers below are measured, not
guessed).

---

## 1. Where we are (audit summary)

- **40 lessons, 49 interactive labs** across `lib/curriculum/*.js`. Every lab
  is imperative Canvas2D built on four engine helpers (`plane`, `slider`,
  `chips`, `makeLab`).
- **The visual vocabulary is narrow**: dots (54 uses), function curves (28),
  arrows (26), grids (33), sliders (55), chips (27). Everything else —
  polygons, heatmaps, bars, graph diagrams, angle arcs, drop-lines — is
  hand-rolled per lab, some of it reinvented twice in the same file.
- **Zero animation.** No lab uses `requestAnimationFrame`; two use
  `setInterval` stepping. No tweening or easing exists anywhere. 46 of 49 labs
  are static-until-dragged.
- **Zero 3D.** The single loss-surface lesson (`c-boss`) fakes contours with
  analytically-cheated ellipses that only work because the bowl is hand-picked.
- **~400–500 lines of copy-paste** a framework would collapse: the
  pointer-drag rig is retyped ~20 times, nearest-point picking 6 times, readout
  HTML building 49 times, hint-note construction 45+ times.
- **Missions are the right seed**: every lab already funnels state into
  `m.update({...})` with 3 goal predicates. But 3 goals/lab is thin, state
  shapes are ad-hoc bags, and "tried both variants" bookkeeping is reinvented
  per lab.
- **The engine integration surface is tiny** — a lab receives
  `api.missions()` and returns a cleanup function. That's the whole contract,
  which makes this migration incremental rather than big-bang.

The diagnosis: the platform's rendering needs *look* modest because the
current labs don't try hard enough. That is the disease being treated, so the
new substrate is sized for the ambition, not the status quo.

## 2. Target experience

A lesson is an **ordered sequence of scenes**. Each scene:

- teaches ONE micro-idea visually (a morph, a manipulable construction, a
  simulation, a game round);
- carries **goals** — predicates or episode outcomes the learner must achieve
  by manipulating the scene (superset of today's missions);
- has a 1–3 sentence **caption** in the corner — the only prose. Depth =
  *more scenes*, never more paragraphs. The `deeper` expanders die; their
  content is either promoted into scenes or deleted.

The lesson ends with a **capstone scene**: same visual vocabulary, randomized
parameters, no hints, tolerance + hold-time requirements. Passing the capstone
completes the lesson. **The capstone is the exam.** Quizzes survive short-term
as optional XP bonuses and are removed per-world as capstones prove out.

Target density: **6–10 scenes per lesson** (today: 1–3 labs), each with 2–5
goals. Across 40 lessons that is roughly **300–450 scenes** — the scale that
dictates every architecture choice below.

## 3. Rendering substrate — options considered

Evaluated against: (a) authoring cost per scene at 300+ scene scale, (b) a
perf envelope of *10k+ animated particles, 60 fps morphs of a 50×50 grid,
trails/glow, one full-screen scene at a time*, (c) 3D where idiomatic, (d)
agent-authorable API surface, (e) bundle discipline behind the existing
post-auth dynamic-import split.

| Option | Verdict | Why |
|---|---|---|
| **Full game engines** — Phaser, melonJS, Impact, Crafty, Cocos2d, GDevelop, Kiwi, QiCi, Isogenic | ❌ | They solve sprites, tilemaps, audio, asset pipelines, collision — none of which is our problem. Our problem (math-viz vocabulary: coordinate planes, vectors, function plots, goal predicates, annotations) they don't touch. We'd fight their loop/scene opinions AND still build the math layer, plus ~1 MB of unused engine. |
| **DOM/SVG frameworks** (mafs-style) | ❌ | Dense animated scenes (morphing grids, particle fields) choke the DOM; React coupling conflicts with the vanilla engine. |
| **Video-timeline frameworks** (Motion Canvas, manim ports) | ❌ | Built for rendering *videos*, not learner-driven interaction. Right aesthetic, wrong interaction model. |
| **Physics engines** (Matter.js, Planck.js) | 🔶 later | Optional spice via dynamic import for 1–2 scenes (momentum ball on a loss surface). Never a foundation. |
| **Hand-rolled Canvas2D retained layer** | ❌ (was the initial lean) | Sized for today's thin labs — survivorship bias. At the stated perf envelope (10k particles, full-grid morphs, glow) Canvas2D is near its ceiling. Choosing it would quietly cap the ambition. |
| **PixiJS v8 as the 2D backend inside our Scene Kit** | ✅ **CHOSEN** | Exactly the layer we'd otherwise hand-roll: retained-mode scene graph, per-object pointer events, WebGL/WebGPU speed, `ParticleContainer` for particle fields, mesh/vertex warps for grid morphs (near-free on GPU), filter pipeline for glow/trails. Mature, TypeScript, tree-shakeable. ~100–150 KB gz, loaded post-auth. |
| **three.js for 3D scenes** | ✅ **CHOSEN** | Smallest tree-shaken core for "surface + orbit controls + arrows"; dominant mindshare means maximal reference code for agent authoring. Loaded per-lesson only when a scene declares a 3D space. Babylon (game-engine scale), PlayCanvas (editor-centric), Whitestorm/Goo/Taro (thin/dormant) rejected. |

Two hard rules that keep these dependencies cheap:

1. **Singleton renderers.** The lesson flow shows one active scene at a time,
   so one shared Pixi `Application` (single WebGL context, canvas re-parented
   per scene) + one lazily-created three.js renderer = 2 GPU contexts total.
   Browser context limits never bite.
2. **Renderer-agnostic entity spec.** Content authors — human or agent — never
   touch Pixi or three.js. They write entity data against the Scene Kit. Only
   the kit's draw layer knows the renderer. This keeps the authorable API
   small and in-repo (agents read it in one file), makes scenes headless-
   testable (params → entity list is pure data, no GPU), and leaves the
   backend swappable if Pixi ever disappoints.

**HTML/CSS stays** for what DOM is best at: the shell (worlds map, HUD),
captions, readouts, and the handful of legitimately-DOM scenes (pipeline
builders, token-probability tables). The engine stays vanilla JS. No React in
the lesson core.

## 4. The Scene Kit (`lib/scene/`)

A small owned framework, ~1.5–2k lines, replacing the 4-helper kit. Public
surface:

```js
registerScene({
  id: 'dot.orthogonal',            // namespaced, like lesson ids
  space: 'plane2',                 // plane2 | axes3 | free (DOM/none)
  params: { a: vec(2.5, 1), b: vec(1, 2.5) },     // reactive atoms
  entities: (p, t) => [            // PURE: params (+ clock) → display list
    grid(),
    vector(p.a, { color: 'accent', label: 'a', handle: true }),
    vector(p.b, { color: 'accent2', label: 'b', handle: true }),
    angleArc(p.a, p.b),
    label(() => `cos θ = ${cos(p.a, p.b).toFixed(3)}`, { at: 'readout' }),
  ],
  goals: [
    goal('Make them orthogonal', s => Math.abs(cos(s.a, s.b)) < .04,
         { xp: 20, hold: 500 }),
    episode('Converge in ≤ 8 steps', ep => ep.steps <= 8 && ep.converged,
            { xp: 30 }),               // for simulation/game scenes
  ],
  caption: 'Drag the arrow tips. Watch cos θ — it only cares about angle.',
})
```

Modules:

- **Spaces** — `plane2` (world coords, y-up, optional pan/zoom; Pixi backend),
  `axes3` (three.js, orbit controls, mobile-degrades to slower orbit + capped
  DPR), `free` (DOM block; the 4 existing pure-DOM labs stay legitimate).
- **Entities** (declarative, diffed against the retained graph): `vector`,
  `point`, `segment`, `curve`, `area`, `polygon`, `grid` (morphable under a
  matrix), `cellGrid`/`heatmap`, `bars`, `distribution`, `graph` (nodes+edges),
  `angleArc`, `dropLine`, `label`, `particleField`, `trajectory`, and 3D:
  `surface3`, `trajectory3`, `ellipsoid3`, `vector3`. Each entity ships once,
  killing the audit's duplication list (the drop-line pattern alone collapses
  14 hand-rolled copies; `poly`, `cellGrid`, `bars` were each reinvented 2–3×).
- **Params** — reactive atoms; entities and goals read them, interaction
  writes them. One-way flow: input → params → entities → draw. Dirty-flag
  rendering: rAF runs only while a tween, simulation, or drag is live.
- **Clock** — two first-class time sources: a **tween timeline**
  (`tween(param, to, {dur, ease|spring})`, `sequence()`, morphs; play/pause/
  scrub) and a **fixed-timestep simulation loop** (`sim(dt => {...})`,
  pausable) so free-running and game scenes are native, not bolted on.
- **Interaction** — `handle()` on any point/vector-tip/angle entity (snap,
  constrain-to-curve/axis), written ONCE with pointer capture + nearest-pick +
  keyboard arrow-nudging (today: 20 hand-rolled drag rigs, 0 keyboard support).
  Plus `scrub`, `probe` (hover→readout), and the existing DOM `slider`/`chips`
  restyled as kit controls.
- **Goals** — `goal(text, predicate, {xp, hold, hint})` for state predicates
  (hold-time prevents drive-by passes) and `episode(text, outcomePredicate)`
  for simulation/game outcomes (steps-to-converge, score, survival). Both
  persist into the existing `S.missions[lessonId::sceneId]` shape — no
  migration of saved progress. The "tried all variants" bookkeeping labs
  reinvent today becomes a built-in `visited(...)` combinator.
- **Registration & validation** — `registerScene()` mirrors
  `registerLesson()`: shape-validated at load, idempotent by id, cross-checked
  by `validateCurriculum()` (every lesson's scene list resolves; every goal
  has text/xp; capstone present). The existing test invariants (validation
  clean, idempotent re-registration, missions-don't-autocomplete-on-load)
  carry over — a scene's first `entities()` evaluation is the goal baseline,
  same as today's missions rule.

## 5. Game lessons

Games are a first-class scene type, not a skin. **Litmus test: a game is
justified when the winning strategy IS the mathematical insight.** If the game
is decoration around a quiz, it's forced — don't build it.

Archetypes (each maps to kit features, no bespoke engines):

- **Steering** — drive the ball down the loss surface with limited fuel;
  learning-rate intuition is the throttle. (`sim` + `episode` goals)
- **Aim/compose** — hit the target shape in ≤ N transform moves; matmul as
  combo-moves, order matters. (`tween` morphs + `episode`)
- **Estimation duel** — place your Gaussian before the likelihood meter beats
  you; MLE as marksmanship. (`goal` with tolerance + timer)
- **Allocation puzzles** — distribute probability mass to minimize KL; entropy
  as a budget. (`goal` predicates over param vectors)

First homes: the three boss lessons. `ml-boss` is the flagship candidate — the
audit ranked it the thinnest lab in the curriculum (pure button-sequencing, no
canvas), and "assemble the transformer" wants to be a game.

## 6. 3D policy — only where idiomatic

3D must show something 2D cannot; every 3D scene ships orbit controls, a 2D
fallback readout, and mobile degradation. From the audit:

**Strong (build in 3D):** gradient descent on a true `z = f(x,y)` surface with
rolling-ball trajectories (replaces `c-boss`'s faked contours — the canonical
case); partial derivatives as surface slices; determinant as volume; SVD as
unit sphere → ellipsoid (the audit found this visual conspicuously absent —
`lasvd` only shows image compression); projection onto a plane / least
squares; saddle points & convexity in two variables; joint densities with
marginalization-as-flattening; ML loss landscapes with SGD trails.

**Stay 2D (correctly so):** 1-variable calculus curves, Σ-notation, logs, 1D
distributions, attention heatmaps, 2×2 eigen hunting, entropy bars. Vectors
intro stays 2D-first with a 3D *second* scene to teach "same rules, any
dimension."

## 7. Migration plan (world 0 → N, in order)

Old and new coexist: `INTERACTIVES` labs keep working untouched; a lesson
switches to `scenes: [...]` when its world converts. Each phase is a PR wave.

- **P0 — Scene Kit core + flagship lesson.** Kit (plane2 space, core entities,
  params, goals, tween basics, Pixi singleton) + convert `la-dot` end-to-end
  into ~7 scenes incl. capstone. This is the reference implementation and the
  authoring guide. Adds deps: `pixi.js` (post-auth split). Exit criteria:
  60 fps on a mid-tier phone, scene authoring ≤ ~25 lines each, all existing
  tests green, capstone gates completion for this one lesson.
- **P1 — World 0 (5 lessons, all 2D).** Proves authoring velocity at scale
  (~35 scenes). Kit gains: `distribution`, `bars`, morph/sequence polish,
  `visited()` combinator. Measure scenes/day — this number calibrates P2–P5.
- **P2 — World 1 LA (12 lessons).** First 3D: `axes3` space + `surface3`/
  `ellipsoid3` (det-as-volume, SVD sphere→ellipsoid, projection). Adds
  `three` (per-lesson dynamic import). First game conversion: `la-boss`.
- **P3 — World 2 Calc (11 lessons).** The 3D crown jewels: gradient surfaces,
  descent trajectories, Newton-vs-GD races. `c-boss` becomes the steering
  game.
- **P4 — World 3 Prob (6 lessons).** `particleField` earns its keep: sampling
  clouds, CLT convergence as raining points, Bayes as mass flowing between
  regions.
- **P5 — World 4 ML (6 lessons).** Loss landscapes, decision boundaries
  forming live, attention flows as particle streams; `ml-boss` becomes the
  transformer-assembly game. Quiz gate retired platform-wide; quizzes remain
  as optional XP.

Per-world definition of done: every lesson ≥ 6 scenes, capstone gates
completion, `deeper` expanders deleted (content promoted or cut), old labs
removed, tests green.

## 8. Risks & mitigations

- **WebGL context loss** (backgrounded tabs, GPU resets) → Pixi/three both
  emit events; kit re-creates the singleton and re-mounts the active scene
  from params (params are the source of truth — recovery is free by design).
- **Bundle creep** → Pixi rides the existing post-auth `import()` split;
  three.js loads per-lesson on `axes3`. CI check: initial auth-gate bundle
  unchanged.
- **Authoring velocity misses** (300+ scenes is the real risk) → P0/P1 exist
  to measure it before committing the back worlds; the entity spec is designed
  for agent authoring (small, in-repo, data-first), and scene specs are
  validated at load so bad generated scenes fail loudly in dev, not silently
  in prod.
- **Mobile/a11y regression** → keyboard nudging on all handles (new — today
  there is none), DOM captions/readouts mirror canvas state for screen
  readers, capped DPR + reduced particle counts under
  `prefers-reduced-motion` and low-end heuristics.
- **Assessment integrity** (capstone replaces quiz) → randomized parameters
  per attempt, tolerance + hold-time, no hints; weak-area tags (`tag`/`focus`)
  move from quiz questions onto capstone goals so the review loop survives.

## 9. What success looks like

- A learner can complete an entire lesson without reading a paragraph.
- Every lesson: 6–10 scenes, 12+ goals, one capstone exam performed in the
  visual language itself.
- One entity vocabulary powers all 40 lessons; adding a scene is a ~20-line
  data change; adding an entity is a kit PR, not a lesson hack.
- 3D where the concept lives in 3D — and nowhere else.
