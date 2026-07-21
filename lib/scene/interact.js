/* ================================================================
   SCENE KIT — pointer/keyboard controller  (lib/scene/interact.js)
   Owner: INTERACTION. Internal engine of lib/scene/interaction.js —
   the contracted runtime (CONTRACT §0/§7/§8) builds on this.
   ----------------------------------------------------------------
   ONE implementation of the pointer-drag rig that the audit found
   retyped ~20× across lib/curriculum/*.js (pointerdown → setPointerCapture
   → move → up, with nearest-point picking reinvented 6×). It adds what
   NONE of those rigs have: keyboard arrow-key nudging (a11y) and hover
   probes.

   RENDERER-AGNOSTIC + HEADLESS. Pure controller — never touches Pixi
   or a specific canvas. Driven by two injected interfaces:

     surface = {
       el,                        // DOM element receiving pointer+keyboard
       toWorld({px, py}): {x,y},  // CANVAS-LOCAL px -> world (CONTRACT §6:
                                  //   space.toWorld takes one {px,py} point;
                                  //   this controller converts client -> local
                                  //   via el.getBoundingClientRect())
       requestDraw?(),            // mark the scene dirty after a write
     }

     atom = { get(): {x,y}, set({x,y}) }   // param accessor the handle writes.
   Non-tip handles (segment endpoint, polygon vertex) supply an adapter
   atom mapping to the dragged point — built by interaction.js.

   Handle options follow the CONTRACT §7 descriptor vocabulary:
     constrain: 'axis-x' | 'axis-y' | (pt, {lock, atom}) => pt
       ('curve' from the descriptor is resolved by interaction.js into a
        projection function before it reaches this layer.)
     snap:      number (grid step) | number[] (allowed values, per component)
                | (pt) => pt
     keyStep:   arrow-key nudge step in world units (default: snap step or 0.1)

   MULTI-TOUCH: one drag at a time. The grabbing pointerId is captured on
   pointerdown; move/up events from any other pointer are ignored, and a
   second finger cannot steal the active drag (reviewer-reproduced bug:
   without this, finger 2 reassigned `active` and finger 1's moves wrote
   to the wrong handle).

   One-way flow: input → atom.set → requestDraw.
   ================================================================ */

const DEFAULT_HIT_RADIUS = 0.6;   // world units; generous for touch

function snapScalar(v, s) { return Math.round(v / s) * s; }
function snapToList(v, list) {
  let best = list[0], bd = Infinity;
  for (const x of list) { const d = Math.abs(v - x); if (d < bd) { bd = d; best = x; } }
  return best;
}

// Project a candidate world point under a handle's snap + constrain rules.
// `lock` is the point captured at grab-time, used by axis constraints so a
// horizontal drag keeps its original y (and vertical keeps its x).
// ORDERING (intentional): constrain first, THEN snap. Snapping last preserves
// the on-grid feel a curriculum scene expects (every rendered value lands on
// the grid). Consequence: an axis lock taken from an OFF-grid start gets
// snapped off the locked value — acceptable because kit scenes start handles
// on-grid; a scene that needs an off-grid lock should use a function
// constraint that re-imposes the lock after its own rounding.
function project(h, p, lock) {
  let out = { x: p.x, y: p.y };
  const c = h.constrain;
  if (c === 'axis-x') out = { x: out.x, y: lock ? lock.y : h.atom.get().y };
  else if (c === 'axis-y') out = { x: lock ? lock.x : h.atom.get().x, y: out.y };
  else if (typeof c === 'function') {
    const r = c(out, { lock, atom: h.atom });
    if (r) out = { x: r.x, y: r.y };
  }
  if (typeof h.snap === 'number' && h.snap > 0) {
    out = { x: snapScalar(out.x, h.snap), y: snapScalar(out.y, h.snap) };
  } else if (Array.isArray(h.snap) && h.snap.length) {
    out = { x: snapToList(out.x, h.snap), y: snapToList(out.y, h.snap) };
  } else if (typeof h.snap === 'function') {
    const r = h.snap(out);
    if (r) out = { x: r.x, y: r.y };
  }
  return out;
}

/*
  makeInteraction(surface, cfg) → controller.
  cfg.onAny(handle, point)  fired after ANY handle write (drag or key).
  cfg.onInput()             fired on every LEARNER input observation (pointer
                            grab, keyboard nudge) — the goals runtime's
                            markLearnerInput() plugs in here (crediting gate).

  controller.handle(atom, opts) registers a draggable/nudgeable handle:
    hitRadius  world-unit pick radius              (default 0.6)
    snap       number | number[] | fn(p)->p        (default none)
    constrain  'axis-x' | 'axis-y' | fn(p,{lock,atom})->p   (default none)
    keyStep    keyboard step in world units        (default: snap step or 0.1)
    onChange   (point) => void                     per-write hook
    onGrab / onRelease  () => void
  Returns the handle; disable via handle.disabled = true, or handle.remove().

  controller.probe(readout) registers a hover→readout callback:
    readout(worldPoint, ev) on pointer moves while nothing is being dragged.

  controller.dispose() removes listeners, releases a mid-drag pointer capture,
  and restores the element's original tabIndex.
*/
export function makeInteraction(surface, cfg = {}) {
  const el = surface.el;
  const onAny = cfg.onAny || (() => {});
  const onInput = cfg.onInput || (() => {});
  const handles = [];
  const probes = [];
  let active = null;           // handle currently being dragged
  let activePointer = null;    // pointerId that owns the drag (multi-touch guard)
  let focused = null;          // last-touched handle (keyboard target)

  function worldOf(ev) {
    // client px -> canvas-local px -> world (space.toWorld contract, §6)
    const r = el.getBoundingClientRect ? el.getBoundingClientRect() : { left: 0, top: 0 };
    return surface.toWorld({ px: ev.clientX - r.left, py: ev.clientY - r.top });
  }

  // Nearest handle among those whose OWN hitRadius contains the pointer. The
  // radius check is per-candidate (not applied after a global min) so a close
  // small-radius handle can never shadow a farther-but-reachable large-radius
  // one — verifier finding, pinned in test/scene-interact.test.mjs.
  function nearest(w) {
    let best = null, bd = Infinity;
    for (const h of handles) {
      if (h.disabled) continue;
      const p = h.atom.get();
      const d = Math.hypot(p.x - w.x, p.y - w.y);
      if (d <= h.hitRadius && d < bd) { bd = d; best = h; }
    }
    return best;
  }

  function write(h, worldPoint) {
    const p = project(h, worldPoint, h._lock);
    h.atom.set(p);
    if (h.onChange) { try { h.onChange(p); } catch (e) { /* isolate */ } }
    if (surface.requestDraw) surface.requestDraw();
    onAny(h, p);
  }

  function onDown(ev) {
    if (active) return;                       // a second finger can't steal the drag
    const w = worldOf(ev);
    const h = nearest(w);
    if (!h) return;
    active = h; focused = h;
    activePointer = ev.pointerId != null ? ev.pointerId : null;
    h._lock = { ...h.atom.get() };
    if (el.setPointerCapture && ev.pointerId != null) {
      try { el.setPointerCapture(ev.pointerId); } catch (e) { /* jsdom/stub */ }
    }
    onInput();                                // learner acted (crediting gate)
    if (h.onGrab) { try { h.onGrab(); } catch (e) { /* isolate */ } }
    write(h, w);
    if (ev.preventDefault) ev.preventDefault();
  }

  function samePointer(ev) {
    return activePointer == null || ev.pointerId == null || ev.pointerId === activePointer;
  }

  function onMove(ev) {
    if (active) {
      if (!samePointer(ev)) return;           // other fingers don't drive the drag
      write(active, worldOf(ev));
      if (ev.preventDefault) ev.preventDefault();
      return;
    }
    if (probes.length) {
      const w = worldOf(ev);
      probes.forEach((fn) => { try { fn(w, ev); } catch (e) { /* isolate */ } });
    }
  }

  function onUp(ev) {
    if (!active || !samePointer(ev)) return;  // lifting another finger ends nothing
    const h = active; active = null; activePointer = null;
    if (el.releasePointerCapture && ev && ev.pointerId != null) {
      try { el.releasePointerCapture(ev.pointerId); } catch (e) { /* stub */ }
    }
    if (h.onRelease) { try { h.onRelease(); } catch (e) { /* isolate */ } }
  }

  function onKey(ev) {
    // Keyboard target: the focused handle, falling back to the first ENABLED
    // handle when the focused one is disabled/removed (reviewer finding: a
    // disabled focused handle used to lock keyboard access out entirely).
    let h = focused && !focused.disabled ? focused : handles.find((x) => !x.disabled);
    if (!h) return;
    const step = (h.keyStep != null) ? h.keyStep
      : (typeof h.snap === 'number' && h.snap > 0 ? h.snap : 0.1);
    let dx = 0, dy = 0;
    switch (ev.key) {
      case 'ArrowLeft': dx = -step; break;
      case 'ArrowRight': dx = step; break;
      case 'ArrowUp': dy = step; break;      // world is y-up
      case 'ArrowDown': dy = -step; break;
      default: return;
    }
    focused = h;
    onInput();                                // learner acted (crediting gate)
    const p0 = h.atom.get();
    h._lock = { ...p0 };                      // axis constraints keep the fixed coord
    write(h, { x: p0.x + dx, y: p0.y + dy });
    if (ev.preventDefault) ev.preventDefault();
  }

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('keydown', onKey);
  // Focusable so it can receive keyboard nudges (audit: zero keyboard support
  // in the hand-rolled rigs). Original value restored on dispose.
  const prevTabIndex = el.tabIndex;
  if (el.tabIndex == null || el.tabIndex < 0) el.tabIndex = 0;

  return {
    handle(atom, opts = {}) {
      const h = {
        atom,
        hitRadius: opts.hitRadius != null ? opts.hitRadius : DEFAULT_HIT_RADIUS,
        snap: opts.snap != null ? opts.snap : null,
        constrain: opts.constrain != null ? opts.constrain : null,
        keyStep: opts.keyStep != null ? opts.keyStep : null,
        onChange: opts.onChange || null,
        onGrab: opts.onGrab || null,
        onRelease: opts.onRelease || null,
        disabled: false,
        _lock: null,
        remove() {
          const i = handles.indexOf(h); if (i >= 0) handles.splice(i, 1);
          if (active === h) { active = null; activePointer = null; }
          if (focused === h) focused = null;
        },
      };
      handles.push(h);
      if (!focused) focused = h;
      return h;
    },
    probe(readout) {
      probes.push(readout);
      return { remove() { const i = probes.indexOf(readout); if (i >= 0) probes.splice(i, 1); } };
    },
    focus(h) { if (h && handles.includes(h)) focused = h; },
    handles,
    dispose() {
      // Mid-drag teardown must release the capture (masked today by DOM
      // replacement; real once a persistent Pixi canvas is reused across
      // scenes) and restore the element's focusability state.
      if (active && activePointer != null && el.releasePointerCapture) {
        try { el.releasePointerCapture(activePointer); } catch (e) { /* stub */ }
      }
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('keydown', onKey);
      if (prevTabIndex == null || prevTabIndex < 0) {
        try { el.tabIndex = prevTabIndex != null ? prevTabIndex : -1; } catch (e) { /* stub */ }
      }
      handles.length = 0; probes.length = 0;
      active = null; activePointer = null; focused = null;
    },
  };
}

// Exported for unit tests + reuse by interaction.js (same snap/constrain math
// outside the controller).
export const _internal = { project, snapScalar, snapToList };
