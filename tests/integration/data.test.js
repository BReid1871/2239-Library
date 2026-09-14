import os from 'os';
import path from 'path';
import fs from 'fs';
import request from 'supertest';
import { test, expect, beforeEach, afterEach } from 'vitest';

let app;

beforeEach(async () => {
  const dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'library-db-')), 'test.db');
  process.env.LIBRARY_DB_PATH = dbPath;
  const { createApp } = await import('../../server/index.js');
  app = createApp();
});

afterEach(() => {
  delete process.env.LIBRARY_DB_PATH;
});

test('export reflects current rituals/notes/arrays', async () => {
  await request(app).post('/api/rituals').send({ name: 'R1', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E' });
  await request(app).post('/api/notes').send({ title: 'N1', body: 'body' });

  const exported = await request(app).get('/api/export');
  expect(exported.status).toBe(200);
  expect(exported.body.rituals).toHaveLength(1);
  expect(exported.body.notes).toHaveLength(1);
  expect(exported.body.arrays).toHaveLength(0);
});

test('import adds new rituals/notes/arrays, skips invalid, and skips duplicate rituals', async () => {
  const existing = await request(app)
    .post('/api/rituals')
    .send({ name: 'Existing', purpose: 'Boon', primary: 'Aether', subs: ['Ruin'], effect: 'E' });

  const result = await request(app)
    .post('/api/import')
    .send({
      rituals: [
        { name: 'New Ritual', purpose: 'Evocation', primary: 'Chaos', subs: [], effect: 'New effect' },
        { name: 'Missing fields' }, // invalid, should be skipped
        { name: 'Dupe of existing', purpose: 'Boon', primary: 'Aether', subs: ['Ruin'], effect: 'Different text' },
      ],
      notes: [{ title: 'Imported note', body: 'x' }],
      arrays: [],
    });

  expect(result.status).toBe(200);
  expect(result.body.addedR).toBe(1);
  expect(result.body.skippedR).toBe(1);
  expect(result.body.dupesR).toBe(1);
  expect(result.body.addedN).toBe(1);

  const rituals = await request(app).get('/api/rituals');
  expect(rituals.body).toHaveLength(2); // existing + the one new import
  expect(existing.status).toBe(201);
});

test('import with the old bare-array format only imports rituals', async () => {
  const result = await request(app)
    .post('/api/import')
    .send([{ name: 'Old Format', purpose: 'Boon', primary: 'Genesis', subs: [], effect: 'E' }]);

  expect(result.status).toBe(200);
  expect(result.body.addedR).toBe(1);
  expect(result.body.addedN).toBe(0);
});
