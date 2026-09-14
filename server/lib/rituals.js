function ritualsMatch(a, b) {
  if (a.purpose !== b.purpose) return false;
  if (a.primary !== b.primary) return false;
  const as = (a.subs || []).slice().sort().join(',');
  const bs = (b.subs || []).slice().sort().join(',');
  return as === bs;
}

module.exports = { ritualsMatch };
