# Authoring Scenes — the guide

This is how you write a scene for Minima. It is aimed at the next 300+ scenes,
most of them agent-authored. Read it once, then keep
[`lib/curriculum/scenes/la-dot.js`](../lib/curriculum/scenes/la-dot.js) open as
the worked reference — every rule below is demonstrated there.

**Two hard dependencies, in this order:**

1. [`docs/CONTRACT.md`](CONTRACT.md) — the frozen v1 Scene Kit API. It is the
   law. This guide never overrides it; if they disagree, the contract wins and
   you file the discrepancy (see [Getting unblocked](#getting-unblocked)).
2. [`docs/VISUAL_FIRST.md`](VISUAL_FIRST.md) — why scenes exist. §2 (target
   experience) and §5 (game lessons) are the pedagogy this guide operationalizes.

---

## 1. What a scene is

A lesson is an **ordered list of scenes**. A scene teaches **one micro-idea** by
direct manipulation and assesses it with **goals** the learner reaches by
manipulating the scene. The last scene is the **capstone** — randomized, no
hints, tolerance + hold-time. Passing the capstone completes the lesson. **The
capstone is the exam.**

A scene is **pure data + pure predicates**. It imports geometry constructors
from the kit and lesson math from a content-side helper. It imports **no
renderer** — never `pixi.js`, `three`, canvas, or the DOM. This is what makes
scenes headless-testable and agent-authorable: `params -> entities -> display
list` is a pure function of data (CONTRACT §3), and the renderer is a layer
below you that you never touch.

```
input ──▶ params ──▶ entities(p, t) ──▶ diff ──▶ backend (Pixi)   ← you own params + entities + goals
                       │                                             ← the kit owns everything right of the arrow
                     goals(s)
```

---

## 2. The schema

`registerScene(spec)` is the single validated door (CONTRACT §1). It mirrors
`registerLesson()`: shape-checked at load with the id in the error, idempotent
by id. Full shape:

```js
registerScene({
  id: 'dot.anatomy',        // string, namespaced 'lesson.scene', globally unique
  lesson: 'la-dot',         // owning lesson id (flagship-owned resolution field)
  space: 'plane2',          // 'plane2' | 'free'  (v1; 'axes3' is later — §9)
  params: { a: vec(2.6, 0.6), b: vec(1.4, 2.4) },  // PLAIN object: name -> vec | scalar
  entities: (p, t) => [ ... ],   // PURE: (paramsView, time) -> Entity[]
  goals: [ goal(...), goal(...) ],
  caption: 'Drag the arrows...',
  capstone: false,          // exactly one scene per lesson sets this true
})
```

- **`id`** — `'<lesson>.<scene>'`, kebab lesson + short scene tag. Unique across
  the whole curriculum (it is the progress key `S.missions[lesson::scene]`).
- **`params`** — a **plain object** (CONTRACT §1 rejects a function here). Each
  value is a `vec(x, y)` or a scalar. The kit lifts them into reactive atoms;
  `entities` and goal predicates read a read-only *view/snapshot* of the raw
  values. **Never mutate a param in place** — the kit sets a new value.
- **`entities(p, t)`** — a pure function returning a display list. `p.a` is the
  *current raw value* of param `a`; `t` is scene time in seconds. Re-evaluated
  whenever a param changes (or a motion source ticks). See §4.
- **`goals`** — see §5.
- **`caption`** — see §6.

Register your scene module by importing it from
[`lib/curriculum/scenes/index.js`](../lib/curriculum/scenes/index.js) (the
flagship-owned import chain, peer of `curriculum/index.js`). That module also
owns the **lesson rule: exactly one capstone per lesson** (`validateSceneLessons()`).

### Lesson math lives with the content

The kit exports `vec` but **no math helpers** — it is geometry-agnostic. Dot
products, cosine, projection, softmax live in
[`lib/curriculum/scenes/vec-math.js`](../lib/curriculum/scenes/vec-math.js).
Import from there; add to it rather than retyping formulas per scene.

---

## 3. Entities — the vocabulary

Use only the v1 kinds (CONTRACT §3; the frozen list is `KINDS` in
`lib/scene/entities.js`): `grid, vector, point, segment, curve, area, polygon,
label, angleArc, dropLine, cellGrid, bars`. **A kind not on that list does not
exist** — adding one is a kit PR, not a scene hack (file it, don't fake it).

Signatures you will actually reach for (copy them exactly — positional args
matter):

```js
grid()                                             // reference grid
vector(v, { color, label, handle })                // arrow origin->v
point(v, { color, label, handle })
segment(a, b, { color, dashed, label })            // a and b are vecs
angleArc(u, w, { color, label })                   // arc between directions u,w at origin
dropLine(v, { to: <vec|'axes'>, color })           // perpendicular from v to a target/axes
label(textOrFn, { at: 'readout' | vec })           // 'readout' = DOM strip (a11y)
bars(values, { at: vec, labels, color })           // values is a number[]
```

**Colors are semantic tokens**, resolved by the backend for light/dark: `accent`
(the primary/learner vector), `accent2` (the secondary), `muted` (context/
scaffolding), `good`, `warn` (emphasis — used here for the angle arc and the
projection shadow), `grid`. Any raw CSS string also works, but **prefer tokens**
so a theme change is one edit in the kit, not 300 in the scenes.

**Readouts belong in `label(..., { at: 'readout' })`**, not on the canvas. The
readout strip mirrors scene state to screen readers — it is the a11y seam
(CONTRACT §3). Every scene should have one live readout.

### Handles = interaction

A learner drags a handle. Declare it on an entity that accepts one (`vector`,
`point`, `segment`, `polygon` — the frozen capability table, CONTRACT §7):

```js
vector(p.a, { color: 'accent', label: 'a', handle: 'a' })   // string sugar: bind param 'a'
vector(p.b, { handle: handle('b', { constrain: onCircle }) })  // constrained drag
```

Use `handle: '<paramName>'` — **not** the old sketch's `handle: true` (the kit
rejects param-name magic so entities stay pure). Constrain the drag with
`constrain`: `'axis-x'`, `'axis-y'`, or a **`(pt) => pt`** clamp function. The
constrain closures in `vec-math.js` are the pattern:

- `rayConstraint(dir)` — drag along a fixed direction (length-only). Scene 4
  locks `a` to its ray so scaling is isolated from rotation.
- `circleConstraint(r)` — drag around a circle (angle-only). Scene 2 locks `b`'s
  length so alignment is isolated from magnitude.
- `trackConstraint(x, lo, hi)` — a vertical "slider made of a point". Scene 6's
  temperature knob (v1 has no scalar-slider control — see
  [Getting unblocked](#getting-unblocked)).

> **Diff-friendliness:** define constrain closures and fixed guide geometry
> **once at module scope**, not inside `entities`. A fresh closure every frame
> makes the diff layer treat the entity as always-changed (CONTRACT §4). See
> `onCircle2`, `onRay4`, `A4_LINE_A` in `la-dot.js`.

---

## 4. Reactivity: static vs tween vs sim

`entities(p, t)` is re-run on demand; you compute values straight from `p`. How
the params *change* is what you choose:

- **Static (the default).** Params change only when the learner drags a handle
  or moves a control. No animation loop runs — the frame driver is idle until an
  input arrives (CONTRACT §5 dirty-flag). **Scenes 1, 3, 4, 5, 7 are static.**
  Reach for this unless motion earns its place. Most scenes are static.

- **Tween** (motion layer, `clock.js`). A time-driven param sweep: `tween(atom,
  to, { dur, ease })`. Use it to *show a relationship as one quantity varies* —
  e.g. scene 2 auto-sweeps `b` around the circle so the learner watches cos θ
  trace +1 → 0 → −1. A tween is a `driver.addSource` client; the param changing
  each frame is what redraws. Use a tween when the **insight is a trajectory**
  (how Y moves as X moves), and let the learner scrub/drag the same param.

- **Sim** (motion layer). A fixed-timestep loop, `sim(step, { hz })`, for
  free-running dynamics: a ball rolling down a loss surface, particles
  converging. Use it when the **insight is emergent over time** and the learner
  steers it. Grade sim scenes with `episode(...)` goals (outcomes: steps-to-
  converge, score, survival), not state predicates. No la-dot scene needs a sim.

Rule of thumb: **static unless the idea is inherently temporal.** A morph you
could equally express by dragging a handle should be a draggable handle.

---

## 5. Goals — the assessment

A goal is a labelled predicate over a **snapshot `s`** of raw param values, plus
reward metadata (CONTRACT §7):

```js
goal('Make the vectors orthogonal (cos θ ≈ 0)',
  (s) => Math.abs(cos(s.a, s.b)) < 0.04,
  { xp: 20, hold: 500, tag: 'sign vs angle',
    focus: 'Positive dot ⇔ angle < 90°, zero ⇔ 90°, negative ⇔ obtuse.' })
```

- **2–5 goals per scene.** One goal is thin; six is a scene that should split.
- **`xp`** required, numeric.
- **`hold`** (ms) — the predicate must stay true this long before crediting.
  Put it on precision goals so a drive-by drag through the target doesn't count
  (scenes 2, 3, and the capstone use it).
- **`tag` / `focus`** — the weak-area concept label and one actionable study
  sentence. These migrate from the retiring quiz's `q.tag`/`q.focus` and keep
  the spaced-review loop alive (VISUAL_FIRST §8). **Every capstone goal must
  carry a tag** (see §7). Mid-lesson goals should tag the concept they drill.
- **`episode(text, outcomePredicate, opts)`** — the sim/game variant; the
  predicate reads an episode outcome object, not a param snapshot.

### THE GOAL-BASELINE INVARIANT (do not violate)

> **No goal predicate may be true at the scene's initial params.**

The kit's runtime treats the first evaluation as a baseline and never credits it
(carried from `makeMissions`), but that is a safety net, not a licence. If a
goal is *satisfiable at load*, the learner walks into a completed goal having
performed no insight. Choose initial `params` so **every** `goal.predicate(s0)`
is false. This is statically testable — the la-dot test asserts it for all seven
scenes and for the capstone across 200 seeds. Write that test for your lesson.

### REACHABILITY (the other half)

> **Every goal must have at least one satisfying state** the learner can
> actually reach (respecting any handle constraint).

An impossible goal is worse than an auto-completing one — the learner is stuck
with no feedback. This bites in non-obvious ways: la-dot scene 5 originally
asked for "d1 and d3 as the top two", but d2 sits angularly between them and
always outranks one — **provably impossible**. The reachability test caught it;
it was retargeted to an adjacent, reachable pair. **Write a reachability test**
(brute-force the free params on a grid, or hand-construct a witness state per
goal). See `test/scenes-la-dot.test.mjs`.

### The game-lesson litmus test (VISUAL_FIRST §5)

A game scene is justified **only when the winning strategy IS the mathematical
insight.** Steering a ball to teach learning rate: yes (the throttle *is* the
learning rate). A quiz reskinned with a timer and confetti: no — that's
decoration, don't build it. If the fun is separable from the math, cut the game
and make a cleaner manipulation scene.

---

## 6. Captions — 1 to 3 sentences, hard cap

The caption is the **only prose** in a scene, in the corner. Depth comes from
**more scenes, never more paragraphs** (VISUAL_FIRST §2). The `deeper` expanders
are dead.

- **1–3 sentences.** The validator flags a 4th. If you need more, you have two
  micro-ideas — split the scene.
- Say **what to do** and **what to notice**, not what to conclude — the learner
  concludes by manipulating.
- Good: *"Slide a along its dashed line — only its length changes. a·b moves;
  cos θ won't budge. To flip the sign you must turn b."*
- Bad: a paragraph restating the textbook definition of the dot product.

---

## 7. Capstone — the exam

Exactly one scene per lesson is `capstone: true`. It is the assessment, so:

- **Randomized parameters per attempt.** `params` must still be a plain object
  (CONTRACT §1), so expose the re-roll as a **separate `rollParams(seed)`**
  function that returns a fresh params object, and set `params: rollParams(1)`
  as the seed-1 draw. `rollParams` rides as a tolerated extra key. **Quality's
  harness binds to the name `rollParams`** — keep it.
- **Tolerance + hold-time, no hints.** Gate each target with a band and a
  `hold`; **omit `hint`**. See `dot.capstone`.
- **Map the weak-area tags.** The capstone's goals must carry the lesson's old
  quiz tags (la-dot: `dot product arithmetic`, `cosine similarity`, `sign vs
  angle`) so the review loop survives the quiz's retirement.
- **Design the randomization so the baseline invariant holds for every seed.**
  The la-dot trick: start `b` exactly perpendicular to the random `a`, so
  cos = 0 / a·b = 0 / θ = 90°, and draw every target away from those values —
  no target is ever pre-satisfied, provably, for any seed.

---

## 8. Dos and don'ts

**Do**
- Keep `entities` pure — data in, descriptors out, no side effects.
- Use semantic color tokens.
- Put one live `label(..., { at: 'readout' })` in every scene (a11y).
- Hoist constrain closures / fixed geometry to module scope.
- Give mapped/reorderable entities a stable `key` (e.g. `key: 'doc' + i`) so the
  diff layer tracks them (CONTRACT §3/§4).
- Write two tests per lesson: **baseline-invariant** and **reachability**.

**Don't**
- Don't import a renderer, canvas, or the DOM.
- Don't invent an entity kind or use `handle: true` — both fail validation.
- Don't pass a function as `params` (use `rollParams` for the capstone).
- Don't let a goal be true at load, or be impossible to reach.
- Don't write a 4th caption sentence — split the scene instead.
- Don't build a game whose fun is separable from the math.

---

## 9. Getting unblocked

Missing an entity kind, a control (e.g. a scalar slider), a constraint, or a
clock feature? The kit surface is small and in-repo on purpose — **don't hack
around a gap.** File a precise request in your coordination log's Handoffs,
addressed to the owning peer (`kit-core`, `interaction-goals`, or `motion`), and
author the scene assuming the request lands (the way scene 6's temperature knob
stands in for a real slider control today). A contract question goes in your log;
kit-core answers in `kit-core.md`. The friction you hit is how the API gets
better — report it.
