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

test('creates, updates, and deletes a note', async () => {
  const create = await request(app).post('/api/notes').send({ title: 'Untitled note', body: '' });
  expect(create.status).toBe(201);
  expect(create.body.id).toBeTruthy();

  const update = await request(app)
    .put('/api/notes/' + create.body.id)
    .send({ title: 'My note', body: 'Some text' });
  expect(update.status).toBe(200);
  expect(update.body.title).toBe('My note');
  expect(update.body.body).toBe('Some text');

  const list = await request(app).get('/api/notes');
  expect(list.body).toHaveLength(1);

  const del = await request(app).delete('/api/notes/' + create.body.id);
  expect(del.status).toBe(204);

  const listAfter = await request(app).get('/api/notes');
  expect(listAfter.body).toHaveLength(0);
});

test('404s updating or deleting a note that does not exist', async () => {
  const update = await request(app).put('/api/notes/nope').send({ title: 'x' });
  expect(update.status).toBe(404);
  const del = await request(app).delete('/api/notes/nope');
  expect(del.status).toBe(404);
});
