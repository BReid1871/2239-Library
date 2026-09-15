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
  // so once active it reaches out too, but v (distance 2 from s, distance 1
  // from m) is reached by both s and m on pass 2 — m is closer, but s is
  // farther, so s's effector reach wins and v stays active that pass. Only
  // once m deactivates s (the closer effector) on pass 2 does m's own reach
  // to v finally go uncontested and deactivate it, on pass 3.
  var entries = [
    entry('s', 0, 0, { isEffector: true, range: 3 }),
    entry('m', 1, 0, { isAntiEffector: true, range: 3 }),
    entry('v', 2, 0, { range: 3 }),
  ];
  var reaches = computeReaches(entries);
  var result = simulate(entries, reaches, 's');

  expect(result.active).toEqual({ s: false, m: true, v: false });
  expect(result.stabilized).toBe(true);
  expect(result.passes).toHaveLength(3);

  expect(result.passes[0].effects.map((e) => e.to.placement.id)).toEqual(['m', 'v']);

  expect(result.passes[1].effects.map((e) => e.to.placement.id)).toEqual(['s']);
  expect(result.passes[1].effects[0]).toMatchObject({ kind: 'anti-effector', becameActive: false });

  expect(result.passes[2].effects.map((e) => e.to.placement.id)).toEqual(['v']);
  expect(result.passes[2].effects[0]).toMatchObject({ kind: 'anti-effector', becameActive: false });
});

test('simulate: a farther effector overrides a closer anti-effector on the same target', () => {
  // tr never reaches T directly (distance 4 is outside its range 2); T is
  // only reached once close_anti (distance 3) and far_eff (distance 4) are
  // activated on pass 1. Distance only breaks the tie between them — the
  // farther source (far_eff) wins despite close_anti being closer, so T
  // ends up active, not deactivated.
  var entries = [
    entry('tr', 0, 0, { isEffector: true, range: 2 }),
    entry('close_anti', 1, 0, { isAntiEffector: true, range: 4 }),
    entry('far_eff', 0, 2, { isEffector: true, range: 4 }),
    entry('T', 4, 0, { range: 4 }),
  ];
  var reaches = computeReaches(entries);
  var result = simulate(entries, reaches, 'tr');

  expect(result.active.T).toBe(true);
});

test('simulate: a farther anti-effector overrides closer effectors, even the trigger itself', () => {
  // tr activates close_eff and far_anti on pass 1, and also reaches T
  // directly (distance 2, uncontested) — so T starts active. On pass 2, T
  // is reached by three active sources at once: close_eff (distance 1),
  // tr itself (distance 2), and far_anti (distance 5). The farthest —
  // far_anti — wins and deactivates T, despite two closer effectors
  // (including the trigger) still reaching it too.
  var entries = [
    entry('tr', 0, 0, { isEffector: true, range: 10 }),
    entry('close_eff', 1, 0, { isEffector: true, range: 10 }),
    entry('far_anti', 0, 5, { isAntiEffector: true, range: 10 }),
    entry('T', 2, 0, { range: 10 }),
  ];
  var reaches = computeReaches(entries);
  var result = simulate(entries, reaches, 'tr');

  expect(result.passes[0].effects.find((e) => e.to.placement.id === 'T')).toMatchObject({ becameActive: true });
  expect(result.passes[1].effects.find((e) => e.to.placement.id === 'T'))
    .toMatchObject({ kind: 'anti-effector', becameActive: false });
});

test('simulate: an exact-distance effector/anti-effector conflict leaves the target unchanged', () => {
  // s_eff activates T directly (distance 2) and activates tie_anti
  // (distance 4) on pass 1. On pass 2, s_eff and tie_anti both reach T —
  // at the exact same distance (2). An effector and an anti-effector
  // arriving at once, tied on distance, cancel out: T is left exactly as
  // it was (still active from pass 1), not flipped either way.
  var entries = [
    entry('s_eff', 0, 0, { isEffector: true, range: 4 }),
    entry('tie_anti', 4, 0, { isAntiEffector: true, range: 4 }),
    entry('T', 2, 0, { range: 4 }),
  ];
  var reaches = computeReaches(entries);
  var result = simulate(entries, reaches, 's_eff', { maxPasses: 2 });

  expect(result.passes[0].effects.map((e) => e.to.placement.id).sort()).toEqual(['T', 'tie_anti']);
  // tie_anti does get activated on pass 2's edges too, but T specifically
  // has no effect logged for it this pass — the tie cancelled out.
  expect(result.passes[1].effects.some((e) => e.to.placement.id === 'T')).toBe(false);
  expect(result.active.T).toBe(true);
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

test('simulate: two same-kind sources at different distances both get credited, not just the farther one', () => {
  // A line of 4: plain(0) - trigger(1, effector) - antiNear(2, anti-effector) -
  // antiFar(3, anti-effector), each range 2. The trigger activates all three
  // others directly on pass 1. On pass 2: trigger is reached by antiNear
  // (distance 1) and antiFar (distance 2), both anti-effectors — not a
  // conflict (same kind), so BOTH should be credited for deactivating it,
  // not just antiFar because it's farther.
  var entries = [
    entry('plain', 0, 0, {}),
    entry('trigger', 1, 0, { isEffector: true, range: 2 }),
    entry('antiNear', 2, 0, { isAntiEffector: true, range: 2 }),
    entry('antiFar', 3, 0, { isAntiEffector: true, range: 2 }),
  ];
  var reaches = computeReaches(entries);
  var result = simulate(entries, reaches, 'trigger');

  expect(result.passes[0].effects.map((e) => e.to.placement.id).sort()).toEqual(['antiFar', 'antiNear', 'plain']);

  var triggerDeactivation = result.passes[1].effects.find((e) => e.to.placement.id === 'trigger');
  expect(triggerDeactivation.kind).toBe('anti-effector');
  expect(triggerDeactivation.becameActive).toBe(false);
  expect(triggerDeactivation.edges.map((e) => e.from.placement.id).sort()).toEqual(['antiFar', 'antiNear']);

  // plain, meanwhile, is a genuine conflict (not a same-kind merge): it's
  // reached by trigger (effector, distance 1) and antiNear (anti-effector,
  // distance 2) — different kinds, so the farther one (antiNear) overrides
  // and solely takes credit, deactivating it.
  var plainDeactivation = result.passes[1].effects.find((e) => e.to.placement.id === 'plain');
  expect(plainDeactivation.kind).toBe('anti-effector');
  expect(plainDeactivation.edges.map((e) => e.from.placement.id)).toEqual(['antiNear']);
  expect(result.active.plain).toBe(false);

  // antiNear itself is tied every pass it's contested (trigger, effector,
  // distance 1 vs. antiFar, anti-effector, distance 1) until trigger drops
  // out on pass 2 — only then does antiFar's now-uncontested reach resolve
  // it, on the next pass.
  expect(result.active.antiNear).toBe(false);
  expect(result.active.antiFar).toBe(false);
});
