import { test, expect } from 'vitest';
import { ritualsMatch, findRuneConflict } from '../../server/lib/rituals.js';

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

const IGNORES = { A: ['B'], B: [], C: [] };

test('findRuneConflict finds a conflict between primary and a sub', () => {
  expect(findRuneConflict('A', ['C', 'B'], IGNORES)).toEqual({ a: 'A', b: 'B' });
});

test('findRuneConflict checks the reverse direction too, since IGNORES entries are not always symmetric', () => {
  expect(findRuneConflict('B', ['A'], IGNORES)).toEqual({ a: 'B', b: 'A' });
});

test('findRuneConflict finds a conflict between two subs', () => {
  expect(findRuneConflict('C', ['A', 'B'], IGNORES)).toEqual({ a: 'A', b: 'B' });
});

test('findRuneConflict returns null for a clean combination', () => {
  expect(findRuneConflict('C', ['A'], IGNORES)).toBeNull();
});

test('findRuneConflict returns null with no subs and no self-conflict', () => {
  expect(findRuneConflict('A', [], IGNORES)).toBeNull();
});
