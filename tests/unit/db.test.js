import os from 'os';
import path from 'path';
import fs from 'fs';
import { test, expect, beforeEach, afterEach } from 'vitest';

let dbPath;

beforeEach(() => {
  dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'library-db-')), 'test.db');
  process.env.LIBRARY_DB_PATH = dbPath;
});

afterEach(() => {
  delete process.env.LIBRARY_DB_PATH;
});

test('openDb returns a working SQLite connection', async () => {
  const { openDb } = await import('../../server/db.js');
  const db = openDb();
  const row = db.prepare('SELECT 1 AS ok').get();
  expect(row.ok).toBe(1);
  db.close();
});
