import request from 'supertest';
import { test, expect, beforeEach } from 'vitest';

let app;

beforeEach(async () => {
  const { pool, resetDb } = await import('../helpers/testDb.js');
  await resetDb();
  const { createApp } = await import('../../server/index.js');
  app = createApp(pool);
});

test('creates an array with defaults, places a ritual, and deletes it', async () => {
  const ritual = await request(app)
    .post('/api/rituals')
    .send({ name: 'Test Ritual', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E' });

  const create = await request(app).post('/api/arrays').send({});
  expect(create.status).toBe(201);
  expect(create.body.radius).toBe(3);
  expect(create.body.placements).toEqual([]);

  const placements = [{ id: 'p1', ritualId: ritual.body.id, q: 0, r: 0 }];
  const update = await request(app)
    .put('/api/arrays/' + create.body.id)
    .send({ name: 'My Array', radius: 3, placements });
  expect(update.status).toBe(200);
  expect(update.body.placements).toEqual(placements);

  const del = await request(app).delete('/api/arrays/' + create.body.id);
  expect(del.status).toBe(204);
  const list = await request(app).get('/api/arrays');
  expect(list.body).toHaveLength(0);
});

test('allows placing the same ritual more than once and clamps an out-of-range radius', async () => {
  const ritual = await request(app)
    .post('/api/rituals')
    .send({ name: 'Repeatable', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E' });

  const create = await request(app).post('/api/arrays').send({ radius: 999 });
  expect(create.status).toBe(201);
  expect(create.body.radius).toBe(10); // clamped to MAX_BOARD_RADIUS

  const placements = [
    { id: 'p1', ritualId: ritual.body.id, q: 0, r: 0 },
    { id: 'p2', ritualId: ritual.body.id, q: 5, r: -5 },
  ];
  const update = await request(app)
    .put('/api/arrays/' + create.body.id)
    .send({ placements });
  expect(update.status).toBe(200);
  expect(update.body.placements).toHaveLength(2);
});
