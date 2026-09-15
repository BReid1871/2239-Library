import { test, expect } from 'vitest';
import { rangeForSize, footprintHexes, hexDistance, hexDisk, offsetSegment, shortenSegment } from '../../public/hex.js';

test.each([
  [1, 2],
  [2, 4],
  [3, 6],
])('rangeForSize(%i) === %i', (size, expected) => {
  expect(rangeForSize(size)).toBe(expected);
});

test.each([
  [1, 1],
  [2, 7],
  [3, 19],
  [4, 37],
])('footprintHexes for size %i covers %i hexes', (size, expected) => {
  expect(footprintHexes({ q: 0, r: 0 }, size)).toHaveLength(expected);
});

test('footprint of a size-2 ritual is its anchor plus its 6 neighbors', () => {
  var hexes = footprintHexes({ q: 0, r: 0 }, 2);
  var keys = hexes.map((h) => h.q + ',' + h.r).sort();
  expect(keys).toEqual(
    ['-1,0', '-1,1', '0,-1', '0,0', '0,1', '1,-1', '1,0'].sort()
  );
});

test('hexDistance is 0 for the same hex and symmetric', () => {
  var a = { q: 1, r: -2 };
  var b = { q: -3, r: 1 };
  expect(hexDistance(a, a)).toBe(0);
  expect(hexDistance(a, b)).toBe(hexDistance(b, a));
});

test('hexDistance between adjacent hexes is 1', () => {
  var center = { q: 0, r: 0 };
  hexDisk(center, 1)
    .filter((h) => !(h.q === 0 && h.r === 0))
    .forEach((neighbor) => expect(hexDistance(center, neighbor)).toBe(1));
});

test('hexDisk radius 0 returns only the center', () => {
  expect(hexDisk({ q: 5, r: -5 }, 0)).toEqual([{ q: 5, r: -5 }]);
});

test('offsetSegment shifts a horizontal line perpendicular to itself', () => {
  var seg = offsetSegment(0, 0, 10, 0, 3);
  expect(seg).toEqual({ x1: 0, y1: 3, x2: 10, y2: 3 });
});

test('offsetSegment puts a mutual pair of reversed segments on opposite sides', () => {
  var forward = offsetSegment(0, 0, 10, 0, 3);
  var reverse = offsetSegment(10, 0, 0, 0, 3);
  expect(forward.y1).toBe(3);
  expect(reverse.y1).toBe(-3);
});

test('shortenSegment pulls both ends inward along the line', () => {
  var seg = shortenSegment(0, 0, 10, 0, 2, 3);
  expect(seg).toEqual({ x1: 2, y1: 0, x2: 7, y2: 0 });
});
