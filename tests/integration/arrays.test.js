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

  const placements = [{ id: 'p1', ritualId: ritual.body.id, q: 0, r: 0, size: 1 }];
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

test('allows placing the same ritual more than once, each at its own size, and clamps an out-of-range radius', async () => {
  const ritual = await request(app)
    .post('/api/rituals')
    .send({ name: 'Repeatable', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E' });

  const create = await request(app).post('/api/arrays').send({ radius: 999 });
  expect(create.status).toBe(201);
  expect(create.body.radius).toBe(10); // clamped to MAX_BOARD_RADIUS

  const placements = [
    { id: 'p1', ritualId: ritual.body.id, q: 0, r: 0, size: 1 },
    { id: 'p2', ritualId: ritual.body.id, q: 5, r: -5, size: 3 },
  ];
  const update = await request(app)
    .put('/api/arrays/' + create.body.id)
    .send({ placements });
  expect(update.status).toBe(200);
  expect(update.body.placements).toHaveLength(2);
  expect(update.body.placements[0].size).toBe(1);
  expect(update.body.placements[1].size).toBe(3);
});

test('search matches array name', async () => {
  await request(app).post('/api/arrays').send({ name: 'Ward Grid' });
  await request(app).post('/api/arrays').send({ name: 'Signal Web' });

  const found = await request(app).get('/api/arrays').query({ q: 'ward' });
  expect(found.body.map((a) => a.name)).toEqual(['Ward Grid']);
});

test('rejects placements that reference a ritual that does not exist', async () => {
  const create = await request(app).post('/api/arrays').send({ radius: 3 });
  const update = await request(app)
    .put('/api/arrays/' + create.body.id)
    .send({ placements: [{ id: 'p1', ritualId: 'nope', q: 0, r: 0, size: 1 }] });
  expect(update.status).toBe(400);
  expect(update.body.error).toMatch(/no longer exists/);
});

test('rejects placements whose footprint extends outside the board radius', async () => {
  const ritual = await request(app).post('/api/rituals').send({ name: 'R', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E' });
  const create = await request(app).post('/api/arrays').send({ radius: 1 });
  const update = await request(app)
    .put('/api/arrays/' + create.body.id)
    .send({ placements: [{ id: 'p1', ritualId: ritual.body.id, q: 1, r: 0, size: 2 }] });
  expect(update.status).toBe(400);
  expect(update.body.error).toMatch(/outside the board/);
});

test('rejects overlapping placement footprints', async () => {
  const ritual = await request(app).post('/api/rituals').send({ name: 'R', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E' });
  const create = await request(app).post('/api/arrays').send({ radius: 3 });
  const update = await request(app)
    .put('/api/arrays/' + create.body.id)
    .send({
      placements: [
        { id: 'p1', ritualId: ritual.body.id, q: 0, r: 0, size: 1 },
        { id: 'p2', ritualId: ritual.body.id, q: 0, r: 0, size: 1 },
      ],
    });
  expect(update.status).toBe(400);
  expect(update.body.error).toMatch(/overlap/);
});

test('undo/redo round-trips through an edit, and reports when there is nothing to undo/redo', async () => {
  const ritual = await request(app).post('/api/rituals').send({ name: 'R', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E' });
  const create = await request(app).post('/api/arrays').send({ radius: 3 });
  expect(create.body.canUndo).toBe(false);
  expect(create.body.canRedo).toBe(false);

  const noUndo = await request(app).post('/api/arrays/' + create.body.id + '/undo');
  expect(noUndo.status).toBe(409);

  const placements = [{ id: 'p1', ritualId: ritual.body.id, q: 0, r: 0, size: 1 }];
  const edit = await request(app).put('/api/arrays/' + create.body.id).send({ placements });
  expect(edit.status).toBe(200);
  expect(edit.body.canUndo).toBe(true);
  expect(edit.body.canRedo).toBe(false);

  const undo = await request(app).post('/api/arrays/' + create.body.id + '/undo');
  expect(undo.status).toBe(200);
  expect(undo.body.placements).toEqual([]);
  expect(undo.body.canUndo).toBe(false);
  expect(undo.body.canRedo).toBe(true);

  const noUndoAgain = await request(app).post('/api/arrays/' + create.body.id + '/undo');
  expect(noUndoAgain.status).toBe(409);

  const redo = await request(app).post('/api/arrays/' + create.body.id + '/redo');
  expect(redo.status).toBe(200);
  expect(redo.body.placements).toEqual(placements);
  expect(redo.body.canUndo).toBe(true);
  expect(redo.body.canRedo).toBe(false);

  const noRedo = await request(app).post('/api/arrays/' + create.body.id + '/redo');
  expect(noRedo.status).toBe(409);
});

test('a new edit after an undo discards the old redo branch', async () => {
  const ritual = await request(app).post('/api/rituals').send({ name: 'R', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E' });
  const create = await request(app).post('/api/arrays').send({ radius: 3 });

  const first = [{ id: 'p1', ritualId: ritual.body.id, q: 0, r: 0, size: 1 }];
  await request(app).put('/api/arrays/' + create.body.id).send({ placements: first });
  await request(app).post('/api/arrays/' + create.body.id + '/undo');

  const second = [{ id: 'p2', ritualId: ritual.body.id, q: 1, r: 0, size: 1 }];
  const edit = await request(app).put('/api/arrays/' + create.body.id).send({ placements: second });
  expect(edit.body.placements).toEqual(second);
  expect(edit.body.canRedo).toBe(false);

  const redo = await request(app).post('/api/arrays/' + create.body.id + '/redo');
  expect(redo.status).toBe(409);
});

test('undo/redo 404 for an array that does not exist', async () => {
  const undo = await request(app).post('/api/arrays/nope/undo');
  expect(undo.status).toBe(404);
  const redo = await request(app).post('/api/arrays/nope/redo');
  expect(redo.status).toBe(404);
});
