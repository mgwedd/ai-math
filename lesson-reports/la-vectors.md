# la-vectors — Vectors: Arrows & Data

## Current summary (what it teaches + what the lab does)
The lesson defines a vector as "an ordered list of numbers," gives the two readings (point vs. movement), states magnitude as `‖v‖ = √(x²+y²)` (Pythagoras), and defines a unit vector as magnitude 1. The `ml` note frames "everything is a vector" in ML — embeddings, tokens as thousand-dimensional vectors. There are no `deeper` cards.

The lab (`INTERACTIVES.vectors`) is a single 2D canvas where the learner drags the tip of one arrow from the origin. It draws component legs (x and y dashed), the arrow, and a live readout of `v = [x, y]` and `‖v‖`. Coordinates snap to quarter-units. Three gated missions: (1) drag to `[3,2]`, (2) make magnitude > 4.5, (3) point into the third quadrant (both components negative).

Quiz: (1) magnitude of `[−4,3]` (= 5, 3-4-5 triangle); (2) a 1,536-number vector is a point in 1,536-D space; (3) which of four vectors is a unit vector (`[0.6,0.8]`). WRONG_WHY is thorough and misconception-targeted (Manhattan vs Euclidean, stopping at x²+y² before the root, [1,1] trap).

## Strengths
- The "two ways to read the same object" (point vs movement) is exactly the physics-vs-CS framing 3Blue1Brown uses, and is the right opening idea.
- The magnitude-as-Pythagoras grounding is correct and the [−4,3] → 5 quiz with Manhattan-distance distractor is genuinely good pedagogy.
- WRONG_WHY entries are specific and name the misconception (the `[1,1]` "components are 1 so length is 1" trap is the single most common unit-vector error; it's handled well).
- The lab's live component legs make the coordinates-as-instructions idea visible.
- The 1,536-D question correctly normalizes "you can't draw it but the math is identical," which is the key mindset for an ML-bound learner.

## Inaccuracies / fidelity issues (each: the issue -> the correct statement -> source URL)
- **"A vector IS just an ordered list of numbers."** This collapses the three-perspective distinction that the canonical treatment insists on. The list-of-numbers view is the *computer-science* perspective; the *physics* view is an arrow with length+direction (movable); the *mathematician's* view is "anything you can add and scale." The whole power of linear algebra is translating between them, not picking one. -> State it as: a vector has (at least) three equivalent readings — arrow, coordinate list, and abstract add/scale object — and coordinates only exist *relative to a chosen basis/origin*. -> https://www.3blue1brown.com/lessons/vectors/
- **Point vs movement conflated without the affine caveat.** Treating "a point" and "a displacement" as the same object is the classic affine-vs-vector confusion. A point lives in an affine space (no privileged origin, you cannot add two points or scale a point); a displacement lives in the associated vector space (addable, scalable). The lesson silently picks "tail at origin" without saying coordinates require that choice. -> Add one sentence: coordinates describe a point only *after* fixing an origin; the arrow is really the displacement from origin to point. Adding two position vectors is meaningful only because we secretly fixed an origin. -> https://en.wikipedia.org/wiki/Affine_space
- **Unit vector defined but normalization never given.** The lesson says "magnitude 1 = unit vector" but never tells the learner how to *make* one. The operation `û = v/‖v‖` (normalization) is the load-bearing fact for ML (cosine similarity, normalized embeddings, layer-norm intuition). -> Add: any nonzero vector is unit-ized by dividing by its magnitude, `û = v/‖v‖`; this is "keep the direction, throw away the size." -> https://en.wikipedia.org/wiki/Unit_vector
- **`‖v‖ = √(x²+y²)` presented as THE definition rather than the L2/Euclidean instance.** For an ML audience this is an oversimplification: "magnitude" depends on the chosen norm (L1/Manhattan, L2/Euclidean, L∞). The WRONG_WHY already invokes "Manhattan distance" — so the lesson implicitly knows other norms exist but never names L2. -> Note that this is the *Euclidean (L2) norm*, `‖v‖₂ = √(Σ xᵢ²)`, one of a family (L1, L∞); L2 is the default but not the only one. -> https://en.wikipedia.org/wiki/Norm_(mathematics)

## Conceptual gaps (what a serious learner still needs)
- **Coordinates depend on a basis.** The single most important idea this lesson omits: `[3,2]` only means "3 right, 2 up" relative to the standard basis î=[1,0], ĵ=[0,1]. This sets up every later lesson (change of basis, eigenvectors, SVD). Even a one-line teaser ("these numbers are amounts of the standard basis vectors") pays off massively.
- **Generalization to n dimensions, made concrete.** The quiz gestures at 1,536-D but the `learn` body never does. State explicitly: magnitude generalizes to `√(x₁²+…+xₙ²)`, addition/scaling are still component-wise, and *nothing* about the algebra needs a picture.
- **Normalization and why direction-only matters in ML.** Cosine similarity, normalized embeddings, and the fact that for many models *only direction carries meaning* (magnitude is partly an artifact). This is the bridge to the very next dot-product lesson.
- **High-dimensional geometry is weird (the headline ML payoff).** Two random high-dimensional vectors are *almost always nearly orthogonal*; volume concentrates near the "equator"/shell; L2 distances bunch up (curse of dimensionality). This is the most genuinely surprising and ML-relevant fact about vectors and is completely absent. -> https://en.wikipedia.org/wiki/Curse_of_dimensionality
- **The zero vector and "no origin for points" subtlety** — worth a `deeper` card given the affine caveat above.

## Lab ideas (concrete: name the interactive, what the learner manipulates, what it reveals)
- **"Normalize it" mission (extend current `vectors` lab).** Add a fourth mission: drag the tip anywhere, then add a button/slider that projects the arrow onto the unit circle, and require the learner to land a *separate* normalized arrow on the unit circle. Draw a faint unit circle. Reveals `û = v/‖v‖` geometrically — direction preserved, length forced to 1. Reuses existing `plane`/`arrow`/`dot` helpers plus one `slider`.
- **"Coordinates = amounts of basis vectors" lab (new `vectors-basis`).** Show î and ĵ as two highlighted unit arrows. Two sliders set how many î's and how many ĵ's to add (tip-to-tail), building the target vector as a linear combination of the basis. Mission: build `[3,2]` using exactly 3 î and 2 ĵ. Reveals that the coordinate list is literally "scalars on the standard basis" — the conceptual seed for change-of-basis. Uses `slider` + `plane` only.
- **"High-D angles" mini-lab (new `vectors-highd`).** A slider sets dimension n (2 → 200). On each tick, sample two random vectors in ℝⁿ and plot the histogram of the angle between them; show the mean converging to 90°. Reveals near-orthogonality / curse of dimensionality — the single most memorable ML fact about vectors. Canvas histogram; no new helpers needed beyond drawing rectangles.
- **L1 vs L2 "reachable set" toggle.** With the arrow tip draggable, overlay the set of points at the same magnitude under L1 (diamond) vs L2 (circle) vs L∞ (square). Toggling the norm reshapes the "unit ball." Reveals that "length" is norm-dependent — directly motivates the WRONG_WHY's Manhattan reference.

## Content improvements (specific learn/ml/deeper text upgrades)
- **Rewrite the opening line** from "A vector is just an ordered list of numbers" to present all three readings: arrow (length+direction, movable), coordinate list (CS), and abstract add/scale object (math) — and stress the *skill* is translating between them. Cite the 3B1B framing implicitly.
- **Add a normalization sentence** after the unit-vector line: "To turn any nonzero vector into a unit vector, divide by its magnitude: `û = v/‖v‖`. Same direction, length 1." 
- **Name the norm:** call `√(x²+y²)` the *Euclidean (L2) norm* and note L1 (Manhattan) and L∞ exist; this also retro-justifies the quiz distractor.
- **Add a basis teaser:** "Those two numbers are really *amounts of the standard basis vectors* î=[1,0], ĵ=[0,1]. Change the basis and the same arrow gets new coordinates — the engine behind everything later in this world."
- **Strengthen the `ml` note** with the high-dimensional twist: in thousands of dimensions, two random embeddings are almost always nearly perpendicular and L2 distances cluster — which is exactly why models lean on *cosine similarity (direction)* rather than raw distance. This also bridges to the next lesson.
- **Add `deeper` cards** (lesson currently has none): (1) "Point vs displacement: the affine subtlety" — why you can't add two points but can add displacements; (2) "Norms are a family" — L1/L2/L∞ and their unit balls; (3) "Why high dimensions are strange" — near-orthogonality and concentration of measure with the JL-lemma payoff named.

## Quiz improvements (specific misconceptions to target; keep questions self-contained — never require recalling lab-graph data)
- **Normalization question (new):** "To convert `[3,4]` into a unit vector you should…" — options: divide each component by 5 [correct], subtract 1 from each, divide by 7, it's already unit. Targets the "make a unit vector" gap; self-contained (‖[3,4]‖=5).
- **Basis-dependence question (new):** "The coordinates `[3,2]` describe an arrow only after we've chosen…" — options: an origin and basis [correct], a unit of time, a matrix, a color. Targets the silent origin/basis assumption.
- **Point-vs-vector question (new):** "Which operation does NOT make sense for two *points* (as opposed to displacement vectors)?" — options: adding the two points together [correct], finding the displacement from one to the other, taking their midpoint, measuring the distance. Targets the affine confusion. Self-contained.
- **High-dimensional intuition question (new):** "Pick two random vectors in 1,000-dimensional space. The angle between them is most likely close to…" — options: 90° [correct], 0°, 180°, 45°. Targets the curse-of-dimensionality surprise; pure reasoning, no graph needed.
- Keep all three existing questions — they are strong and already self-contained.

## Sources (the real URLs you consulted)
- 3Blue1Brown — "Vectors, what even are they?" (Essence of Linear Algebra, Ch.1): https://www.3blue1brown.com/lessons/vectors/
- Wikipedia — Affine space (points vs displacement vectors, no privileged origin): https://en.wikipedia.org/wiki/Affine_space
- Wikipedia — Unit vector (normalization û = u/‖u‖, versor, standard basis notation): https://en.wikipedia.org/wiki/Unit_vector
- Wikipedia — Curse of dimensionality (near-orthogonality, distance concentration): https://en.wikipedia.org/wiki/Curse_of_dimensionality
- Johnson–Lindenstrauss lemma / concentration of measure (high-D near-orthogonality, volume near equator): https://en.wikipedia.org/wiki/Johnson%E2%80%93Lindenstrauss_lemma
- Wikipedia — Vector (mathematics and physics) (multiple equivalent meanings): https://en.wikipedia.org/wiki/Vector_(mathematics_and_physics)
- CMU 15-850 notes on JL lemma & dimension reduction (concentration on the sphere): https://www.cs.cmu.edu/afs/cs.cmu.edu/academic/class/15850-f20/www/notes/lec10v2.pdf
