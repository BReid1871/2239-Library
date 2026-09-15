import { test, expect } from 'vitest';
import { computeReaches, simulate } from '../../public/simulation.js';

function entry(id, q, r, opts) {
  return {
    placement: Object.assign({ id: id, isEffector: false, isAntiEffector: false }, opts),
    anchor: { q: q, r: r },
    range: (opts && opts.range) || 2,
  };
}

test('computeReaches labels reaches by their origin: effector vs anti-effector', () => {
  var entries = [
    entry('a', 0, 0, { isEffector: true }),
    entry('b', 1, 0, { isAntiEffector: true }),
    entry('c', 2, 0),
  ];
  var reaches = computeReaches(entries);
  var kindByPair = {};
  reaches.forEach((r) => { kindByPair[r.from.placement.id + '>' + r.to.placement.id] = r.kind; });

  expect(kindByPair['a>b']).toBe('effector');
  expect(kindByPair['a>c']).toBe('effector');
  expect(kindByPair['b>a']).toBe('anti-effector');
  expect(kindByPair['b>c']).toBe('anti-effector');
  // c is plain — never a reach source.
  expect(reaches.some((r) => r.from.placement.id === 'c')).toBe(false);
});

test('simulate activates a chain across multiple passes', () => {
  // A -> B -> C, each an effector reaching only its immediate neighbor
  // (range 1), so C only becomes active once B is active in a later pass.
  var entries = [
    entry('a', 0, 0, { isEffector: true, range: 1 }),
    entry('b', 1, 0, { isEffector: true, range: 1 }),
    entry('c', 2, 0, { range: 1 }),
  ];
  var reaches = computeReaches(entries);
  var result = simulate(entries, reaches, 'a');

  expect(result.active).toEqual({ a: true, b: true, c: true });
  expect(result.stabilized).toBe(true);
  expect(result.passes).toHaveLength(2);
  expect(result.passes[0].effects[0]).toMatchObject({ kind: 'effector', becameActive: true });
  expect(result.passes[0].effects[0].to.placement.id).toBe('b');
  expect(result.passes[1].effects[0].to.placement.id).toBe('c');
});

test('simulate deactivates an already-active target via an anti-effector on a later pass', () => {
  // s (effector) activates m and v on pass 1. m is itself an anti-effector,
  // so once active it reaches out too — deactivating v (and s) on pass 2, a
  // no-op-free effect since v really was active beforehand.
  var entries = [
    entry('s', 0, 0, { isEffector: true, range: 3 }),
    entry('m', 1, 0, { isAntiEffector: true, range: 3 }),
    entry('v', 2, 0, { range: 3 }),
  ];
  var reaches = computeReaches(entries);
  var result = simulate(entries, reaches, 's');

  expect(result.active).toEqual({ s: false, m: true, v: false });
  expect(result.stabilized).toBe(true);
  expect(result.passes).toHaveLength(2);
  expect(result.passes[0].effects.map((e) => e.to.placement.id).sort()).toEqual(['m', 'v']);

  var pass2ToV = result.passes[1].effects.find((e) => e.to.placement.id === 'v');
  expect(pass2ToV).toMatchObject({ kind: 'anti-effector', becameActive: false });
});

test('simulate stops at the pass cap and reports stabilized: false when still changing', () => {
  var entries = [
    entry('a', 0, 0, { isEffector: true, range: 1 }),
    entry('b', 1, 0, { isEffector: true, range: 1 }),
    entry('c', 2, 0, { isEffector: true, range: 1 }),
    entry('d', 3, 0, { isEffector: true, range: 1 }),
    entry('e', 4, 0, { range: 1 }),
  ];
  var reaches = computeReaches(entries);
  var result = simulate(entries, reaches, 'a', { maxPasses: 2 });

  expect(result.stabilized).toBe(false);
  expect(result.active).toEqual({ a: true, b: true, c: true, d: false, e: false });
});

test('simulate returns null for an unknown start placement id', () => {
  var entries = [entry('a', 0, 0, { isEffector: true })];
  var reaches = computeReaches(entries);
  expect(simulate(entries, reaches, 'nope')).toBeNull();
});
