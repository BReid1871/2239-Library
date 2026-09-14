import { test, expect, beforeEach } from 'vitest';

beforeEach(async () => {
  const { resetDb } = await import('../helpers/testDb.js');
  await resetDb();
});

test('the MySQL pool connects and the schema is initialized', async () => {
  const { pool } = await import('../helpers/testDb.js');
  const [rows] = await pool.query('SELECT 1 AS ok');
  expect(rows[0].ok).toBe(1);

  const [tables] = await pool.query('SHOW TABLES');
  const tableNames = tables.map((row) => Object.values(row)[0]);
  expect(tableNames).toEqual(expect.arrayContaining(['rituals', 'notes', 'custom_components', 'arrays']));
});
