import request from 'supertest';
import { test, expect, beforeEach } from 'vitest';

let app;

beforeEach(async () => {
  const { pool, resetDb } = await import('../helpers/testDb.js');
  await resetDb();
  const { createApp } = await import('../../server/index.js');
  app = createApp(pool);
});

test('creates, lists, updates, and deletes a ritual', async () => {
  const create = await request(app).post('/api/rituals').send({
    name: 'Veil of Pale Embers',
    purpose: 'Boon',
    primary: 'Aether',
    subs: ['Ruin', 'Coda'],
    effect: 'Test effect',
  });
  expect(create.status).toBe(201);
  expect(create.body.tier).toBe('Low');
  expect(create.body.id).toBeTruthy();

  const list = await request(app).get('/api/rituals');
  expect(list.status).toBe(200);
  expect(list.body).toHaveLength(1);

  const update = await request(app)
    .put('/api/rituals/' + create.body.id)
    .send({ name: 'Renamed', purpose: 'Boon', primary: 'Aether', subs: ['Ruin', 'Coda'], effect: 'Updated' });
  expect(update.status).toBe(200);
  expect(update.body.name).toBe('Renamed');

  const del = await request(app).delete('/api/rituals/' + create.body.id);
  expect(del.status).toBe(204);

  const listAfter = await request(app).get('/api/rituals');
  expect(listAfter.body).toHaveLength(0);
});

test('defaults size to 1 and clamps an out-of-range size', async () => {
  const defaulted = await request(app).post('/api/rituals').send({
    name: 'Default Size', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E',
  });
  expect(defaulted.body.size).toBe(1);

  const oversized = await request(app).post('/api/rituals').send({
    name: 'Huge Ritual', purpose: 'Evocation', primary: 'Chaos', subs: [], effect: 'E', size: 999,
  });
  expect(oversized.body.size).toBe(8); // clamped to MAX_RITUAL_SIZE

  const update = await request(app)
    .put('/api/rituals/' + oversized.body.id)
    .send({ name: 'Huge Ritual', purpose: 'Evocation', primary: 'Chaos', subs: [], effect: 'E', size: 3 });
  expect(update.body.size).toBe(3);
});

test('rejects a duplicate purpose+primary+subs combination', async () => {
  const payload = { name: 'First', purpose: 'Boon', primary: 'Aether', subs: ['Ruin'], effect: 'E1' };
  const first = await request(app).post('/api/rituals').send(payload);
  expect(first.status).toBe(201);

  const dupe = await request(app)
    .post('/api/rituals')
    .send({ ...payload, name: 'Second' });
  expect(dupe.status).toBe(409);
  expect(dupe.body.error).toMatch(/Duplicate/);
});

test('rejects a ritual missing required fields', async () => {
  const res = await request(app).post('/api/rituals').send({ name: '', purpose: 'Boon', primary: 'Aether', effect: 'E' });
  expect(res.status).toBe(400);
});
