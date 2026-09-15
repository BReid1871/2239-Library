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

test('rejects a primary/sub rune combination that IGNORES marks as conflicting, on both create and update', async () => {
  // reference-data.js: IGNORES.Chaos includes Order.
  const create = await request(app)
    .post('/api/rituals')
    .send({ name: 'Conflicted', purpose: 'Boon', primary: 'Chaos', subs: ['Order'], effect: 'E' });
  expect(create.status).toBe(400);
  expect(create.body.error).toMatch(/ignore each other/);

  const ok = await request(app)
    .post('/api/rituals')
    .send({ name: 'Fine', purpose: 'Boon', primary: 'Chaos', subs: ['Ruin'], effect: 'E' });
  expect(ok.status).toBe(201);

  const update = await request(app)
    .put('/api/rituals/' + ok.body.id)
    .send({ name: 'Fine', purpose: 'Boon', primary: 'Chaos', subs: ['Order'], effect: 'E' });
  expect(update.status).toBe(400);
  expect(update.body.error).toMatch(/ignore each other/);
});

test('search matches name, effect, and rune fields, and returns everything for an empty query', async () => {
  await request(app).post('/api/rituals').send({ name: 'Veil of Pale Embers', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'Warms the room' });
  await request(app).post('/api/rituals').send({ name: 'Other', purpose: 'Boon', primary: 'Genesis', subs: [], effect: 'Grows a plant' });

  const byName = await request(app).get('/api/rituals').query({ q: 'pale embers' });
  expect(byName.body.map((r) => r.name)).toEqual(['Veil of Pale Embers']);

  const byEffect = await request(app).get('/api/rituals').query({ q: 'grows' });
  expect(byEffect.body.map((r) => r.name)).toEqual(['Other']);

  const byRune = await request(app).get('/api/rituals').query({ q: 'Aether' });
  expect(byRune.body.map((r) => r.name)).toEqual(['Veil of Pale Embers']);

  const none = await request(app).get('/api/rituals').query({ q: 'nonexistent term' });
  expect(none.body).toHaveLength(0);

  const all = await request(app).get('/api/rituals');
  expect(all.body).toHaveLength(2);
});
