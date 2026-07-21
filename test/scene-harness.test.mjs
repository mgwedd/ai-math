/* Harness self-verification — proves the Scene Kit test harness has TEETH.
 *
 * A skipped test verifies nothing. Until the peer kit modules land, the real
 * invariant tests in scene-kit.test.mjs skipIf-absent — so THIS file exercises
 * the harness's assertion machinery against known-good and known-bad inline
 * fixtures, with no dependency on lib/scene. If assertPlainData /
 * poisonGlobals / fakeClock can't tell a violation from a clean case here, they
 * can't guard the kit there either. Runs on every `npm test`, stays green.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  assertPlainData, poisonGlobals, restoreGlobals, makeNode, fakeClock,
} from './scene-harness.mjs';

describe('harness: assertPlainData accepts inert display data', () => {
  it('accepts a plain entity descriptor (contract §3 shape)', () => {
    const vector = { kind: 'vector', key: 'a', x: 2.5, y: 1, color: 'accent', label: 'a' };
    expect(() => assertPlainData(vector)).not.toThrow();
  });
  it('accepts nested plain arrays/objects (grid matrix, polygon pts)', () => {
    const grid = { kind: 'grid', matrix: [1, 0, 0, 1], color: 'grid' };
    const poly = { kind: 'polygon', pts: [{ x: 0, y: 0 }, { x: 1, y: 0 }], fill: 'muted' };
    expect(() => assertPlainData(grid)).not.toThrow();
    expect(() => assertPlainData(poly)).not.toThrow();
  });
  it('accepts a function prop where the contract allows it (label(fn), curve(fn))', () => {
    const label = { kind: 'label', text: () => `cos = 0.5`, at: 'readout' };
    const curve = { kind: 'curve', fn: (x) => x * x, domain: [-1, 1] };
    expect(() => assertPlainData(label)).not.toThrow();
    expect(() => assertPlainData(curve)).not.toThrow();
  });
});

describe('harness: assertPlainData catches impure leaks (TEETH)', () => {
  it('rejects a DOM node embedded in an entity', () => {
    const bad = { kind: 'label', el: makeNode('span') };
    expect(() => assertPlainData(bad)).toThrow(/DOM node/);
  });
  it('rejects a class instance (a live handle / display object leaking in)', () => {
    class PixiSprite { constructor() { this.texture = {}; } }
    const bad = { kind: 'point', _display: new PixiSprite() };
    expect(() => assertPlainData(bad)).toThrow(/non-plain object/);
  });
  it('rejects a nested non-plain object deep in the tree', () => {
    class Atom {}
    const bad = { kind: 'vector', props: { color: 'accent', src: new Atom() } };
    expect(() => assertPlainData(bad)).toThrow(/non-plain object/);
  });
});

describe('harness: poisonGlobals catches global reads (purity TEETH)', () => {
  afterEach(() => restoreGlobals());

  it('a PURE constructor runs clean while globals are poisoned', () => {
    const pureVector = (v, opts = {}) => ({ kind: 'vector', x: v.x, y: v.y, ...opts });
    poisonGlobals();
    let out;
    expect(() => { out = pureVector({ x: 1, y: 2 }, { color: 'accent' }); }).not.toThrow();
    restoreGlobals();
    expect(out).toMatchObject({ kind: 'vector', x: 1, y: 2 });
  });

  it('an IMPURE constructor that reads document is caught', () => {
    const impure = (v) => { const c = document.createElement('canvas'); return { kind: 'point', x: v.x, y: v.y, c }; };
    poisonGlobals();
    expect(() => impure({ x: 0, y: 0 })).toThrow(/not pure/);
  });

  it('an IMPURE constructor that reads window is caught', () => {
    const impure = (v) => ({ kind: 'point', x: v.x * window.devicePixelRatio });
    poisonGlobals();
    expect(() => impure({ x: 1 })).toThrow(/not pure/);
  });

  it('restoreGlobals puts the real stubs back', () => {
    poisonGlobals();
    restoreGlobals();
    // after restore, touching document must not throw (whatever the host had)
    expect(() => (typeof document)).not.toThrow();
  });
});

describe('harness: fakeClock is deterministic', () => {
  it('integrates a dt sequence identically across runs', () => {
    const run = (dts) => { const c = fakeClock(); return dts.map((d) => c.tick(d)); };
    const seq = [0.016, 0.016, 0.033, 0.008];
    expect(run(seq)).toEqual(run(seq));
    expect(run(seq).at(-1)).toBeCloseTo(0.073, 6);
  });
});
