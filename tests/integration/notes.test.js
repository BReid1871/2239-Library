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

test('round-trips links through create and update, dropping malformed entries', async () => {
  const ritual = await request(app).post('/api/rituals').send({
    name: 'Veil of Pale Embers',
    purpose: 'Boon',
    primary: 'Aether',
    subs: [],
    effect: 'Test effect',
  });

  const create = await request(app).post('/api/notes').send({
    title: 'Research',
    body: 'Notes on the veil',
    links: [
      { type: 'ritual', id: ritual.body.id },
      { type: 'component', rune: 'Aether', name: 'Chaotic Objects' },
      { type: 'not-a-type', id: 'x' },
      { type: 'ritual' },
    ],
  });
  expect(create.status).toBe(201);
  expect(create.body.links).toEqual([
    { type: 'ritual', id: ritual.body.id },
    { type: 'component', rune: 'Aether', name: 'Chaotic Objects' },
  ]);

  const update = await request(app)
    .put('/api/notes/' + create.body.id)
    .send({ links: [] });
  expect(update.status).toBe(200);
  expect(update.body.links).toEqual([]);

  const bodyOnlyUpdate = await request(app)
    .put('/api/notes/' + create.body.id)
    .send({ body: 'Updated body only' });
  expect(bodyOnlyUpdate.body.links).toEqual([]);
});

test('omitting links on create defaults to an empty array', async () => {
  const create = await request(app).post('/api/notes').send({ title: 'x', body: 'y' });
  expect(create.body.links).toEqual([]);
});

test('undo/redo round-trips through an edit, and reports when there is nothing to undo/redo', async () => {
  const create = await request(app).post('/api/notes').send({ title: 'Original', body: 'First draft' });
  expect(create.body.canUndo).toBe(false);
  expect(create.body.canRedo).toBe(false);

  const noUndo = await request(app).post('/api/notes/' + create.body.id + '/undo');
  expect(noUndo.status).toBe(409);

  const edit = await request(app)
    .put('/api/notes/' + create.body.id)
    .send({ title: 'Renamed', body: 'Second draft' });
  expect(edit.status).toBe(200);
  expect(edit.body.title).toBe('Renamed');
  expect(edit.body.canUndo).toBe(true);
  expect(edit.body.canRedo).toBe(false);

  const undo = await request(app).post('/api/notes/' + create.body.id + '/undo');
  expect(undo.status).toBe(200);
  expect(undo.body.title).toBe('Original');
  expect(undo.body.body).toBe('First draft');
  expect(undo.body.canUndo).toBe(false);
  expect(undo.body.canRedo).toBe(true);

  const noUndoAgain = await request(app).post('/api/notes/' + create.body.id + '/undo');
  expect(noUndoAgain.status).toBe(409);

  const redo = await request(app).post('/api/notes/' + create.body.id + '/redo');
  expect(redo.status).toBe(200);
  expect(redo.body.title).toBe('Renamed');
  expect(redo.body.body).toBe('Second draft');
  expect(redo.body.canUndo).toBe(true);
  expect(redo.body.canRedo).toBe(false);

  const noRedo = await request(app).post('/api/notes/' + create.body.id + '/redo');
  expect(noRedo.status).toBe(409);
});

test('a PUT that changes nothing does not add a history entry', async () => {
  const create = await request(app).post('/api/notes').send({ title: 'Steady', body: 'Unchanged' });
  const noop = await request(app)
    .put('/api/notes/' + create.body.id)
    .send({ title: 'Steady', body: 'Unchanged' });
  expect(noop.body.canUndo).toBe(false);
});

test('a new edit after an undo discards the old redo branch', async () => {
  const create = await request(app).post('/api/notes').send({ title: 'A', body: '' });
  await request(app).put('/api/notes/' + create.body.id).send({ title: 'B', body: '' });
  await request(app).post('/api/notes/' + create.body.id + '/undo');

  const edit = await request(app).put('/api/notes/' + create.body.id).send({ title: 'C', body: '' });
  expect(edit.body.title).toBe('C');
  expect(edit.body.canRedo).toBe(false);

  const redo = await request(app).post('/api/notes/' + create.body.id + '/redo');
  expect(redo.status).toBe(409);
});

test('undo/redo 404 for a note that does not exist', async () => {
  const undo = await request(app).post('/api/notes/nope/undo');
  expect(undo.status).toBe(404);
  const redo = await request(app).post('/api/notes/nope/redo');
  expect(redo.status).toBe(404);
});
