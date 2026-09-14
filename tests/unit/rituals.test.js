import { test, expect } from 'vitest';
import { ritualsMatch } from '../../server/lib/rituals.js';

test('ritualsMatch is true for identical purpose/primary/subs regardless of sub order', () => {
  const a = { purpose: 'Boon', primary: 'Aether', subs: ['Ruin', 'Coda'] };
  const b = { purpose: 'Boon', primary: 'Aether', subs: ['Coda', 'Ruin'] };
  expect(ritualsMatch(a, b)).toBe(true);
});

test('ritualsMatch is false when purpose differs', () => {
  const a = { purpose: 'Boon', primary: 'Aether', subs: [] };
  const b = { purpose: 'Evocation', primary: 'Aether', subs: [] };
  expect(ritualsMatch(a, b)).toBe(false);
});

test('ritualsMatch is false when primary rune differs', () => {
  const a = { purpose: 'Boon', primary: 'Aether', subs: [] };
  const b = { purpose: 'Boon', primary: 'Chaos', subs: [] };
  expect(ritualsMatch(a, b)).toBe(false);
});

test('ritualsMatch is false when subs differ', () => {
  const a = { purpose: 'Boon', primary: 'Aether', subs: ['Ruin'] };
  const b = { purpose: 'Boon', primary: 'Aether', subs: ['Coda'] };
  expect(ritualsMatch(a, b)).toBe(false);
});
