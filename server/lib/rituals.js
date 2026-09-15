function ritualsMatch(a, b) {
  if (a.purpose !== b.purpose) return false;
  if (a.primary !== b.primary) return false;
  const as = (a.subs || []).slice().sort().join(',');
  const bs = (b.subs || []).slice().sort().join(',');
  return as === bs;
}

// Checks a ritual's full rune set (primary + subs) against reference-data's
// IGNORES map, which is defined per-rune but not necessarily symmetric in
// the source data — so each pair is checked in both directions. Returns the
// first conflicting pair found, or null if the combination is clean.
function findRuneConflict(primary, subs, ignores) {
  const runes = [primary, ...(subs || [])];
  for (let i = 0; i < runes.length; i++) {
    for (let j = i + 1; j < runes.length; j++) {
      const a = runes[i];
      const b = runes[j];
      const aIgnoresB = (ignores[a] || []).includes(b);
      const bIgnoresA = (ignores[b] || []).includes(a);
      if (aIgnoresB || bIgnoresA) return { a, b };
    }
  }
  return null;
}

module.exports = { ritualsMatch, findRuneConflict };
