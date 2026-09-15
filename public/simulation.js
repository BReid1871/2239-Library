// Array activation simulation: which placements reach which others (effector
// = activates, anti-effector = deactivates), and what happens when a single
// triggerable placement is activated by a person and the effect propagates.
// Same UMD wrapper pattern as hex.js so this works both as a browser
// <script> (window.Simulation) and a Node require() (server/tests). Domain-
// agnostic: callers pass plain placement-entry objects shaped like
// { placement: { id, isEffector, isAntiEffector }, anchor: { q, r }, range },
// same shape arrays.html's livePlacements() already builds — no knowledge of
// rituals or the DOM lives here.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./hex'));
  } else {
    root.Simulation = factory(root.Hex);
  }
})(typeof self !== 'undefined' ? self : this, function (Hex) {
  // Every directed "reach": an effector or anti-effector placement's effect
  // touches another placement's anchor within its range. Purely geometric —
  // independent of any activation state — so the board can always show the
  // full potential reach graph while editing. Sorted closest-first, which is
  // also the order same-pass conflicts on one target resolve in (see
  // simulate() below).
  function computeReaches(entries) {
    var reaches = [];
    var sources = entries.filter(function (p) { return p.placement.isEffector || p.placement.isAntiEffector; });
    sources.forEach(function (a) {
      entries.forEach(function (b) {
        if (a === b) return;
        var dist = Hex.hexDistance(a.anchor, b.anchor);
        if (dist <= a.range) {
          reaches.push({ from: a, to: b, distance: dist, kind: a.placement.isAntiEffector ? 'anti-effector' : 'effector' });
        }
      });
    });
    reaches.sort(function (x, y) {
      if (x.distance !== y.distance) return x.distance - y.distance;
      var xk = x.from.placement.id + '>' + x.to.placement.id;
      var yk = y.from.placement.id + '>' + y.to.placement.id;
      return xk < yk ? -1 : xk > yk ? 1 : 0;
    });
    reaches.forEach(function (reach, i) { reach.order = i + 1; });
    return reaches;
  }

  // Simulates a person triggering `startPlacementId`: everything else starts
  // inactive, then repeatedly applies effects from currently-active
  // effector/anti-effector placements (effector activates its target,
  // anti-effector deactivates it) until nothing changes, so a
  // newly-activated effector can reach further placements on a later pass.
  // Within one pass, a target reached by more than one active source is
  // resolved by the closest source (reaches are pre-sorted that way, with
  // the same distance/id tie-break as their `order`) — later, farther
  // reaches to an already-decided target this pass are superseded, not
  // applied on top of it; they can still fire on a later pass if things
  // change again. Capped at `opts.maxPasses` (default entries.length + 1)
  // so a cyclic activate/deactivate chain can't loop forever —
  // `stabilized: false` in the result means the cap was hit while things
  // were still changing.
  function simulate(entries, reaches, startPlacementId, opts) {
    var maxPasses = (opts && opts.maxPasses) || entries.length + 1;
    var active = {};
    entries.forEach(function (e) { active[e.placement.id] = false; });
    if (!(startPlacementId in active)) return null;
    active[startPlacementId] = true;

    var passes = [];
    var stabilized = true;
    for (var pass = 1; pass <= maxPasses; pass++) {
      var before = Object.assign({}, active);
      var edges = reaches.filter(function (r) { return before[r.from.placement.id]; });
      var decided = {};
      var effects = [];
      edges.forEach(function (r) {
        var targetId = r.to.placement.id;
        if (decided[targetId]) return;
        decided[targetId] = true;
        var nextActive = r.kind === 'effector';
        if (before[targetId] !== nextActive) {
          effects.push({ from: r.from, to: r.to, kind: r.kind, distance: r.distance, becameActive: nextActive });
        }
        active[targetId] = nextActive;
      });
      if (effects.length === 0) break;
      passes.push({ pass: pass, effects: effects });
      if (pass === maxPasses) stabilized = false;
    }
    return { active: active, passes: passes, stabilized: stabilized };
  }

  return { computeReaches: computeReaches, simulate: simulate };
});
