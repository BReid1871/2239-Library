import os from 'os';
import path from 'path';
import fs from 'fs';
import request from 'supertest';
import { test, expect, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  const dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'library-db-')), 'test.db');
  process.env.LIBRARY_DB_PATH = dbPath;
});

afterEach(() => {
  delete process.env.LIBRARY_DB_PATH;
});

test('GET /api/health reports a working DB connection', async () => {
  const { createApp } = await import('../../server/index.js');
  const app = createApp();
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true });
});
