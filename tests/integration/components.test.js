import request from 'supertest';
import { test, expect, beforeEach } from 'vitest';

let app;

beforeEach(async () => {
  const { pool, resetDb } = await import('../helpers/testDb.js');
  await resetDb();
  const { createApp } = await import('../../server/index.js');
  app = createApp(pool);
});

test('creates, updates, and deletes a custom component', async () => {
  const create = await request(app)
    .post('/api/components')
    .send({ name: 'Ember Glass', rune: 'Vigour', tier: 'Low', desc: 'A test component' });
  expect(create.status).toBe(201);

  const update = await request(app)
    .put('/api/components/' + create.body.id)
    .send({ name: 'Ember Glass', rune: 'Vigour', tier: 'Mid', desc: 'Updated desc' });
  expect(update.status).toBe(200);
  expect(update.body.tier).toBe('Mid');

  const list = await request(app).get('/api/components');
  expect(list.body).toHaveLength(1);

  const del = await request(app).delete('/api/components/' + create.body.id);
  expect(del.status).toBe(204);
});

test('rejects a name that collides with a built-in component for the same rune', async () => {
  // "Heating" is a built-in Low-tier Vigour component in reference-data.js
  const res = await request(app)
    .post('/api/components')
    .send({ name: 'Heating', rune: 'Vigour', tier: 'Low', desc: 'Should be rejected' });
  expect(res.status).toBe(409);
});

test('rejects a name that collides with another custom component for the same rune', async () => {
  await request(app).post('/api/components').send({ name: 'Unique Thing', rune: 'Order', tier: 'Low', desc: 'First' });
  const dupe = await request(app)
    .post('/api/components')
    .send({ name: 'unique thing', rune: 'Order', tier: 'Mid', desc: 'Second, different case' });
  expect(dupe.status).toBe(409);
});
