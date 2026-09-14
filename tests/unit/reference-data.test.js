import { test, expect } from 'vitest';
import { getTier } from '../../public/reference-data.js';

test.each([
  [0, 'Low'],
  [4, 'Low'],
  [5, 'Mid'],
  [9, 'Mid'],
  [10, 'High'],
  [14, 'High'],
  [15, 'Adept'],
  [18, 'Adept'],
])('getTier(%i) === %s', (count, expected) => {
  expect(getTier(count)).toBe(expected);
});
