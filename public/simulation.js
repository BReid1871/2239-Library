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

  // Simulates a person triggering `startPlacementId`: it (and everything in
  // its reach) turns on as the first pass, then every effector/anti-effector
  // that's now active fires at once on a later pass, and so on until nothing
  // changes — so a newly-activated effector can reach further placements on
  // a later pass.
  //
  // Within one pass, all of a target's active-sourced reaches fire
  // together: they're grouped by distance (closest first) and swept in
  // that order. Distance only matters where two *opposing* kinds actually
  // conflict — a farther group of the opposite kind overrides a closer
  // one's decision, since it's acting on top of it, discarding that closer
  // decision entirely (it's been superseded, not reinforced). A farther
  // group of the *same* kind as the current decision isn't a conflict at
  // all, so it doesn't override anything — it just joins it, credited
  // alongside whatever closer same-kind sources already decided this
  // (e.g. two different anti-effectors at two different distances both
  // deactivating the same target both show up as having done so). A group
  // that mixes both kinds at the exact same distance cancels itself out
  // (effector and anti-effector arriving simultaneously do nothing) and
  // simply passes through whatever the closer groups had already decided,
  // rather than overriding it. Capped at `opts.maxPasses` (default
  // entries.length + 1) so a cyclic activate/deactivate chain can't loop
  // forever — `stabilized: false` in the result means the cap was hit
  // while things were still changing.
  function resolveTarget(edgesToTarget, before, targetId) {
    var byDistance = {};
    var distances = [];
    edgesToTarget.forEach(function (r) {
      if (!byDistance[r.distance]) { byDistance[r.distance] = []; distances.push(r.distance); }
      byDistance[r.distance].push(r);
    });
    distances.sort(function (a, b) { return a - b; });

    var kind = null;
    var credited = [];
    distances.forEach(function (d) {
      var group = byDistance[d];
      var kinds = {};
      group.forEach(function (r) { kinds[r.kind] = true; });
      var kindNames = Object.keys(kinds);
      if (kindNames.length !== 1) return; // mixed at this distance: cancels out, prior decision (if any) stands
      if (kindNames[0] === kind) {
        credited = credited.concat(group); // same kind as the running decision: joins it, doesn't override it
      } else {
        kind = kindNames[0]; // a new (or first) kind decisively takes over from here
        credited = group.slice();
      }
    });
    if (!kind) return null;

    var nextActive = kind === 'effector';
    if (before[targetId] === nextActive) return null;
    return { edges: credited, kind: kind, becameActive: nextActive };
  }

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
      var byTarget = {};
      var targetIds = [];
      edges.forEach(function (r) {
        var targetId = r.to.placement.id;
        if (!byTarget[targetId]) { byTarget[targetId] = []; targetIds.push(targetId); }
        byTarget[targetId].push(r);
      });

      var effects = [];
      targetIds.forEach(function (targetId) {
        var resolution = resolveTarget(byTarget[targetId], before, targetId);
        if (!resolution) return;
        active[targetId] = resolution.becameActive;
        effects.push({
          to: resolution.edges[0].to,
          edges: resolution.edges,
          kind: resolution.kind,
          becameActive: resolution.becameActive,
        });
      });

      if (effects.length === 0) break;
      passes.push({ pass: pass, effects: effects });
      if (pass === maxPasses) stabilized = false;
    }
    return { active: active, passes: passes, stabilized: stabilized };
  }

  return { computeReaches: computeReaches, simulate: simulate };
});
