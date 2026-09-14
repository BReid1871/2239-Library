import request from 'supertest';
import { test, expect, beforeEach } from 'vitest';

let app;

beforeEach(async () => {
  const { pool, resetDb } = await import('../helpers/testDb.js');
  await resetDb();
  const { createApp } = await import('../../server/index.js');
  app = createApp(pool);
});

test('creates an array with defaults, places a ritual in a cell, and deletes it', async () => {
  const ritual = await request(app)
    .post('/api/rituals')
    .send({ name: 'Test Ritual', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E' });

  const create = await request(app).post('/api/arrays').send({});
  expect(create.status).toBe(201);
  expect(create.body.rows).toBe(4);
  expect(create.body.cols).toBe(4);
  expect(create.body.cells).toEqual({});

  const update = await request(app)
    .put('/api/arrays/' + create.body.id)
    .send({ name: 'My Grid', rows: 4, cols: 4, cells: { '0,0': ritual.body.id } });
  expect(update.status).toBe(200);
  expect(update.body.cells['0,0']).toBe(ritual.body.id);

  const del = await request(app).delete('/api/arrays/' + create.body.id);
  expect(del.status).toBe(204);
  const list = await request(app).get('/api/arrays');
  expect(list.body).toHaveLength(0);
});
