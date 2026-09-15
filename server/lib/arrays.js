const Hex = require('../../public/hex');

// Validates an array's placements against its board radius and the set of
// rituals that actually exist, so a saved reach line always originates from
// a real ritual sitting fully on the visible board. Returns an error
// message string on the first violation found, or null if placements are
// clean.
function validatePlacements(placements, radius, validRitualIds) {
  const occupied = new Set();

  for (const placement of placements || []) {
    const { id, ritualId, q, r, size } = placement || {};

    if (!validRitualIds.has(ritualId)) {
      return `Placement ${id || '(unknown)'} references a ritual that no longer exists.`;
    }
    if (!Number.isInteger(q) || !Number.isInteger(r)) {
      return `Placement ${id || '(unknown)'} has invalid coordinates.`;
    }
    if (!Number.isInteger(size) || size < 1 || size > Hex.MAX_PLACEMENT_SIZE) {
      return `Placement ${id || '(unknown)'} has an invalid size.`;
    }

    const footprint = Hex.footprintHexes({ q, r }, size);
    for (const hex of footprint) {
      if (Hex.hexDistance({ q: 0, r: 0 }, hex) > radius) {
        return `Placement ${id || '(unknown)'} extends outside the board.`;
      }
      const key = Hex.keyOf(hex);
      if (occupied.has(key)) {
        return `Placements overlap at (${hex.q}, ${hex.r}).`;
      }
      occupied.add(key);
    }
  }

  return null;
}

module.exports = { validatePlacements };
