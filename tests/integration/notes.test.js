import request from 'supertest';
import { test, expect, beforeEach } from 'vitest';

let app;

beforeEach(async () => {
  const { pool, resetDb } = await import('../helpers/testDb.js');
  await resetDb();
  const { createApp } = await import('../../server/index.js');
  app = createApp(pool);
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

test('search matches title or body', async () => {
  await request(app).post('/api/notes').send({ title: 'Meeting notes', body: 'Talked about runes' });
  await request(app).post('/api/notes').send({ title: 'Shopping list', body: 'Eggs, milk' });

  const byTitle = await request(app).get('/api/notes').query({ q: 'meeting' });
  expect(byTitle.body.map((n) => n.title)).toEqual(['Meeting notes']);

  const byBody = await request(app).get('/api/notes').query({ q: 'eggs' });
  expect(byBody.body.map((n) => n.title)).toEqual(['Shopping list']);

  const none = await request(app).get('/api/notes').query({ q: 'nonexistent' });
  expect(none.body).toHaveLength(0);
});
