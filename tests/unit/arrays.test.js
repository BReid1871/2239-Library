import { test, expect } from 'vitest';
import { validatePlacements } from '../../server/lib/arrays.js';

const validIds = new Set(['r1', 'r2']);

test('validatePlacements accepts an empty board', () => {
  expect(validatePlacements([], 3, validIds)).toBeNull();
});

test('validatePlacements accepts a well-formed placement fully on the board', () => {
  const placements = [{ id: 'p1', ritualId: 'r1', q: 0, r: 0, size: 1 }];
  expect(validatePlacements(placements, 3, validIds)).toBeNull();
});

test('validatePlacements rejects a placement referencing a nonexistent ritual', () => {
  const placements = [{ id: 'p1', ritualId: 'missing', q: 0, r: 0, size: 1 }];
  expect(validatePlacements(placements, 3, validIds)).toMatch(/no longer exists/);
});

test('validatePlacements rejects a placement whose footprint extends past the board radius', () => {
  const placements = [{ id: 'p1', ritualId: 'r1', q: 3, r: 0, size: 2 }];
  expect(validatePlacements(placements, 3, validIds)).toMatch(/outside the board/);
});

test('validatePlacements rejects an invalid size', () => {
  const placements = [{ id: 'p1', ritualId: 'r1', q: 0, r: 0, size: 0 }];
  expect(validatePlacements(placements, 3, validIds)).toMatch(/invalid size/);
});

test('validatePlacements rejects non-integer coordinates', () => {
  const placements = [{ id: 'p1', ritualId: 'r1', q: 0.5, r: 0, size: 1 }];
  expect(validatePlacements(placements, 3, validIds)).toMatch(/invalid coordinates/);
});

test('validatePlacements rejects overlapping footprints', () => {
  const placements = [
    { id: 'p1', ritualId: 'r1', q: 0, r: 0, size: 1 },
    { id: 'p2', ritualId: 'r2', q: 0, r: 0, size: 1 },
  ];
  expect(validatePlacements(placements, 3, validIds)).toMatch(/overlap/);
});

test('validatePlacements accepts adjacent, non-overlapping footprints', () => {
  const placements = [
    { id: 'p1', ritualId: 'r1', q: 0, r: 0, size: 1 },
    { id: 'p2', ritualId: 'r2', q: 2, r: 0, size: 1 },
  ];
  expect(validatePlacements(placements, 3, validIds)).toBeNull();
});
