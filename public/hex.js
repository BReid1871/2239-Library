// Hex-grid math shared by the array editor (public/arrays.html) and its unit
// tests. Axial coordinates (q, r), pointy-top hexagons. Same UMD wrapper
// pattern as reference-data.js so this file works both as a browser <script>
// (window.Hex) and a Node require() (server/tests).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Hex = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // Guard rails, not game rules — keep a single placement or a single
  // array board from generating an unrenderable/slow number of hexes.
  var MAX_PLACEMENT_SIZE = 8;
  var MAX_BOARD_RADIUS = 10;

  function keyOf(hex) { return hex.q + ',' + hex.r; }

  // Range a placement's effect reaches, in hex steps, derived from the
  // size it was placed at (size is a property of the placement, not the
  // ritual — the same ritual can be placed at different sizes).
  function rangeForSize(size) { return size * 2; }

  // A placement of size N occupies the hex disk of radius (N-1) around its
  // anchor: size 1 = just the anchor; size 2 = the anchor plus the 6 hexes
  // touching it (7 total); size 3 adds the next ring (19 total); etc.
  function footprintRadius(size) { return size - 1; }

  // All hexes within `radius` steps of `center`, inclusive (a "hex disk").
  function hexDisk(center, radius) {
    var results = [];
    for (var dq = -radius; dq <= radius; dq++) {
      var rMin = Math.max(-radius, -dq - radius);
      var rMax = Math.min(radius, -dq + radius);
      for (var dr = rMin; dr <= rMax; dr++) {
        results.push({ q: center.q + dq, r: center.r + dr });
      }
    }
    return results;
  }

  function footprintHexes(anchor, size) {
    return hexDisk(anchor, footprintRadius(size));
  }

  // Axial (cube) distance between two hexes, in hex steps.
  function hexDistance(a, b) {
    var dq = a.q - b.q;
    var dr = a.r - b.r;
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
  }

  // Pointy-top axial → pixel, hexSize = center-to-corner radius in px.
  function axialToPixel(hex, hexSize) {
    return {
      x: hexSize * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r),
      y: hexSize * (1.5 * hex.r),
    };
  }

  // The 6 corner points of a pointy-top hexagon centered at (cx, cy), as an
  // SVG `points` attribute string.
  function hexCornersSvgPoints(cx, cy, hexSize) {
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var angle = (Math.PI / 180) * (60 * i - 30);
      pts.push((cx + hexSize * Math.cos(angle)).toFixed(2) + ',' + (cy + hexSize * Math.sin(angle)).toFixed(2));
    }
    return pts.join(' ');
  }

  // Shifts a line segment sideways by `dist`, perpendicular to its own
  // direction. Used to draw two opposite-direction reach arrows between the
  // same pair of hexes as parallel lines instead of directly on top of each
  // other — reversing (x1,y1)/(x2,y2) flips the direction vector, so the two
  // calls for a mutual pair land on opposite sides automatically.
  function offsetSegment(x1, y1, x2, y2, dist) {
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var px = -dy / len, py = dx / len;
    return { x1: x1 + px * dist, y1: y1 + py * dist, x2: x2 + px * dist, y2: y2 + py * dist };
  }

  // Pulls each end of a segment inward along its own direction — e.g. so a
  // reach line (and its arrowhead) stops near a hex's edge instead of
  // piercing into its center.
  function shortenSegment(x1, y1, x2, y2, startPad, endPad) {
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len;
    return {
      x1: x1 + ux * startPad, y1: y1 + uy * startPad,
      x2: x2 - ux * endPad, y2: y2 - uy * endPad,
    };
  }

  return {
    MAX_PLACEMENT_SIZE: MAX_PLACEMENT_SIZE,
    MAX_BOARD_RADIUS: MAX_BOARD_RADIUS,
    keyOf: keyOf,
    rangeForSize: rangeForSize,
    footprintRadius: footprintRadius,
    hexDisk: hexDisk,
    footprintHexes: footprintHexes,
    hexDistance: hexDistance,
    axialToPixel: axialToPixel,
    hexCornersSvgPoints: hexCornersSvgPoints,
    offsetSegment: offsetSegment,
    shortenSegment: shortenSegment,
  };
});
