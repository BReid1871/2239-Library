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
  // a later pass. A pass's *roster* of sources — who is active and an
  // effector/anti-effector when the pass begins — is fixed for the whole
  // pass: everyone on it keeps acting (or stops, if deactivated) using that
  // same roster until nothing changes anymore, however many rounds that
  // takes internally, all reported together as one pass. A new numbered
  // pass only starts once a placement outside that roster — someone who
  // wasn't already active and an effector/anti-effector when the pass
  // began — newly turns on and joins the ranks; that's the only thing that
  // can make some *other* target newly reachable, which is what the pass
  // boundary is really tracking.
  //
  // Within a round, all of a target's currently-active-sourced reaches
  // fire together: they're grouped by distance (closest first) and swept
  // in that order. Distance only matters where two *opposing* kinds
  // actually conflict — a farther group of the opposite kind overrides a
  // closer one's decision, since it's acting on top of it, discarding that
  // closer decision entirely (it's been superseded, not reinforced). A
  // farther group of the *same* kind as the current decision isn't a
  // conflict at all, so it doesn't override anything — it just joins it,
  // credited alongside whatever closer same-kind sources already decided
  // this (e.g. two different anti-effectors at two different distances
  // both deactivating the same target both show up as having done so). A
  // group that mixes both kinds at the exact same distance cancels itself
  // out (effector and anti-effector arriving simultaneously do nothing)
  // and simply passes through whatever the closer groups had already
  // decided, rather than overriding it.
  //
  // Both loops are capped — rounds within a pass at `entries.length + 1`,
  // passes at `opts.maxPasses` (default `entries.length + 1`) — so neither
  // a within-roster oscillation nor an ever-growing chain of newly-joining
  // sources can loop forever; `stabilized: false` in the result means a cap
  // was hit while things were still changing.
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
    var maxRounds = entries.length + 1;
    var active = {};
    entries.forEach(function (e) { active[e.placement.id] = false; });
    if (!(startPlacementId in active)) return null;
    active[startPlacementId] = true;

    function activeSourceIds() {
      var ids = {};
      entries.forEach(function (e) {
        if (active[e.placement.id] && (e.placement.isEffector || e.placement.isAntiEffector)) ids[e.placement.id] = true;
      });
      return ids;
    }

    // One round: every currently-active member of `roster` fires at once;
    // returns this round's effects (empty once nothing changes).
    function runRound(roster) {
      var before = Object.assign({}, active);
      var edges = reaches.filter(function (r) { return roster[r.from.placement.id] && before[r.from.placement.id]; });
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
      return effects;
    }

    var passes = [];
    var stabilized = true;
    var roster = activeSourceIds();
    for (var pass = 1; pass <= maxPasses; pass++) {
      var passEffects = [];
      var roundStabilized = true;
      for (var round = 1; round <= maxRounds; round++) {
        var roundEffects = runRound(roster);
        if (roundEffects.length === 0) break;
        passEffects = passEffects.concat(roundEffects);
        if (round === maxRounds) roundStabilized = false;
      }
      if (passEffects.length === 0) break;
      passes.push({ pass: pass, effects: passEffects });
      if (!roundStabilized) { stabilized = false; break; }

      var nextRoster = activeSourceIds();
      var grew = Object.keys(nextRoster).some(function (id) { return !roster[id]; });
      if (!grew) break; // same roster would just repeat the same, now-stable, resolution
      roster = nextRoster;
      if (pass === maxPasses) stabilized = false;
    }
    return { active: active, passes: passes, stabilized: stabilized };
  }

  return { computeReaches: computeReaches, simulate: simulate };
});
