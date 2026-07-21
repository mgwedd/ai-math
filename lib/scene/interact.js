/* ================================================================
   SCENE KIT — interaction controller  (lib/scene/interact.js)
   ----------------------------------------------------------------
   ONE implementation of the pointer-drag rig that the audit found
   retyped ~20× across lib/curriculum/*.js (pointerdown → setPointerCapture
   → move → up, with nearest-point picking reinvented 6×). It adds what
   NONE of those rigs have: keyboard arrow-key nudging (a11y) and hover
   probes.

   RENDERER-AGNOSTIC + HEADLESS. Pure controller — it never touches Pixi,
   three.js, or a specific canvas. It is driven by two injected interfaces
   the Scene Kit's SPACE provides (see CONTRACT / my Handoffs):

     surface = {
       el,                              // DOM element receiving pointer+keyboard
       toWorld(clientX, clientY): {x,y},// screen px → world coords (y-up)
       requestDraw?(),                  // mark the scene dirty after a write
     }

     atom = { get(): {x,y}, set({x,y}) }   // a reactive param accessor; the
                                           // handle reads/writes the point here.
   Angle/scalar handles supply an adapter atom that maps to a tip point.

   Interaction flow is strictly one-way: input → atom.set → requestDraw. The
   controller owns exactly one set of listeners on `surface.el` and dispatches
   pointer events to the nearest registered handle, so multi-handle scenes get
   correct picking for free.
   ================================================================ */

const DEFAULT_HIT_RADIUS = 0.6;   // world units; generous for touch

function snapScalar(v, s) { return Math.round(v / s) * s; }

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
  if (c === 'x') out = { x: out.x, y: lock ? lock.y : h.atom.get().y };
  else if (c === 'y') out = { x: lock ? lock.x : h.atom.get().x, y: out.y };
  else if (typeof c === 'function') {
    const r = c(out, { lock, atom: h.atom });
    if (r) out = { x: r.x, y: r.y };
  }
  if (typeof h.snap === 'number' && h.snap > 0) {
    out = { x: snapScalar(out.x, h.snap), y: snapScalar(out.y, h.snap) };
  } else if (typeof h.snap === 'function') {
    const r = h.snap(out);
    if (r) out = { x: r.x, y: r.y };
  }
  return out;
}

/*
  makeInteraction(surface, cfg) → controller.
  cfg.onAny(handle, point)  optional: fired after ANY handle write (drag or key).

  controller.handle(atom, opts) registers a draggable/nudgeable handle:
    hitRadius  world-unit pick radius              (default 0.6)
    snap       number grid step | fn(p)->p         (default none)
    constrain  'x' | 'y' | fn(p,{lock,atom})->p    (default none)
    nudge      keyboard step in world units        (default: snap step or 0.1)
    onChange   (point) => void                     per-write hook
    onGrab / onRelease  () => void
  Returns the handle object; disable via handle.disabled = true, or handle.remove().

  controller.probe(readout) registers a hover→readout callback: readout(worldPoint, ev)
  runs on pointer moves while nothing is being dragged.

  controller.dispose() removes all listeners (respect on scene swap / cleanup).
*/
export function makeInteraction(surface, cfg = {}) {
  const el = surface.el;
  const onAny = cfg.onAny || (() => {});
  const handles = [];
  const probes = [];
  let active = null;      // handle currently being dragged
  let focused = null;     // last-touched handle (keyboard target)

  function worldOf(ev) { return surface.toWorld(ev.clientX, ev.clientY); }

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
    const w = worldOf(ev);
    const h = nearest(w);
    if (!h) return;
    active = h; focused = h;
    h._lock = { ...h.atom.get() };
    if (el.setPointerCapture && ev.pointerId != null) {
      try { el.setPointerCapture(ev.pointerId); } catch (e) { /* jsdom/stub */ }
    }
    if (h.onGrab) { try { h.onGrab(); } catch (e) { /* isolate */ } }
    write(h, w);
    if (ev.preventDefault) ev.preventDefault();
  }

  function onMove(ev) {
    if (active) { write(active, worldOf(ev)); if (ev.preventDefault) ev.preventDefault(); return; }
    if (probes.length) {
      const w = worldOf(ev);
      probes.forEach((fn) => { try { fn(w, ev); } catch (e) { /* isolate */ } });
    }
  }

  function onUp(ev) {
    if (!active) return;
    const h = active; active = null;
    if (el.releasePointerCapture && ev && ev.pointerId != null) {
      try { el.releasePointerCapture(ev.pointerId); } catch (e) { /* stub */ }
    }
    if (h.onRelease) { try { h.onRelease(); } catch (e) { /* isolate */ } }
  }

  function onKey(ev) {
    const h = focused || handles.find((x) => !x.disabled);
    if (!h || h.disabled) return;
    const step = (h.nudge != null) ? h.nudge
      : (typeof h.snap === 'number' && h.snap > 0 ? h.snap : 0.1);
    let dx = 0, dy = 0;
    switch (ev.key) {
      case 'ArrowLeft': dx = -step; break;
      case 'ArrowRight': dx = step; break;
      case 'ArrowUp': dy = step; break;      // world is y-up
      case 'ArrowDown': dy = -step; break;
      default: return;
    }
    const p0 = h.atom.get();
    h._lock = { ...p0 };                       // so axis constraints keep the fixed coord
    write(h, { x: p0.x + dx, y: p0.y + dy });
    if (ev.preventDefault) ev.preventDefault();
  }

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('keydown', onKey);
  // Focusable so it can receive keyboard nudges (audit: zero keyboard support).
  if (el.tabIndex == null || el.tabIndex < 0) el.tabIndex = 0;

  return {
    handle(atom, opts = {}) {
      const h = {
        atom,
        hitRadius: opts.hitRadius != null ? opts.hitRadius : DEFAULT_HIT_RADIUS,
        snap: opts.snap != null ? opts.snap : null,
        constrain: opts.constrain != null ? opts.constrain : null,
        nudge: opts.nudge != null ? opts.nudge : null,
        onChange: opts.onChange || null,
        onGrab: opts.onGrab || null,
        onRelease: opts.onRelease || null,
        disabled: false,
        _lock: null,
        remove() { const i = handles.indexOf(h); if (i >= 0) handles.splice(i, 1); if (active === h) active = null; if (focused === h) focused = null; },
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
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('keydown', onKey);
      handles.length = 0; probes.length = 0; active = null; focused = null;
    },
  };
}

// Exported for unit tests + reuse by kit spaces that need the same snap/constrain
// math outside the controller.
export const _internal = { project, snapScalar };
