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

test('round-trips tags and components through create, get, and update', async () => {
  const create = await request(app).post('/api/rituals').send({
    name: 'Veil of Pale Embers',
    purpose: 'Boon',
    primary: 'Aether',
    subs: [],
    effect: 'Test effect',
    tags: ['  combat  ', 'utility', ''],
    components: [{ rune: 'Aether', name: 'Chaotic Objects' }, { rune: 'Aether' }, { notRune: true }],
  });
  expect(create.status).toBe(201);
  expect(create.body.tags).toEqual(['combat', 'utility']);
  expect(create.body.components).toEqual([{ rune: 'Aether', name: 'Chaotic Objects' }]);

  const get = await request(app).get('/api/rituals');
  expect(get.body[0].tags).toEqual(['combat', 'utility']);
  expect(get.body[0].components).toEqual([{ rune: 'Aether', name: 'Chaotic Objects' }]);

  const update = await request(app)
    .put('/api/rituals/' + create.body.id)
    .send({
      name: 'Veil of Pale Embers',
      purpose: 'Boon',
      primary: 'Aether',
      subs: [],
      effect: 'Test effect',
      tags: ['solo'],
      components: [],
    });
  expect(update.status).toBe(200);
  expect(update.body.tags).toEqual(['solo']);
  expect(update.body.components).toEqual([]);
});

test('omitting tags and components defaults them to empty arrays', async () => {
  const create = await request(app).post('/api/rituals').send({
    name: 'Plain Ritual',
    purpose: 'Boon',
    primary: 'Aether',
    subs: [],
    effect: 'Test effect',
  });
  expect(create.status).toBe(201);
  expect(create.body.tags).toEqual([]);
  expect(create.body.components).toEqual([]);
});

test('search matches a tag and a component name', async () => {
  await request(app).post('/api/rituals').send({
    name: 'Veil of Pale Embers',
    purpose: 'Boon',
    primary: 'Aether',
    subs: [],
    effect: 'Warms the room',
    tags: ['combat'],
    components: [{ rune: 'Aether', name: 'Chaotic Objects' }],
  });
  await request(app).post('/api/rituals').send({ name: 'Other', purpose: 'Boon', primary: 'Genesis', subs: [], effect: 'Grows a plant' });

  const byTag = await request(app).get('/api/rituals').query({ q: 'combat' });
  expect(byTag.body.map((r) => r.name)).toEqual(['Veil of Pale Embers']);

  const byComponent = await request(app).get('/api/rituals').query({ q: 'Chaotic Objects' });
  expect(byComponent.body.map((r) => r.name)).toEqual(['Veil of Pale Embers']);
});

test('undo/redo round-trips through an edit, and reports when there is nothing to undo/redo', async () => {
  const create = await request(app).post('/api/rituals').send({
    name: 'Original', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E1',
  });
  expect(create.body.canUndo).toBe(false);
  expect(create.body.canRedo).toBe(false);

  const noUndo = await request(app).post('/api/rituals/' + create.body.id + '/undo');
  expect(noUndo.status).toBe(409);

  const edit = await request(app)
    .put('/api/rituals/' + create.body.id)
    .send({ name: 'Renamed', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E1' });
  expect(edit.status).toBe(200);
  expect(edit.body.name).toBe('Renamed');
  expect(edit.body.canUndo).toBe(true);
  expect(edit.body.canRedo).toBe(false);

  const undo = await request(app).post('/api/rituals/' + create.body.id + '/undo');
  expect(undo.status).toBe(200);
  expect(undo.body.name).toBe('Original');
  expect(undo.body.canUndo).toBe(false);
  expect(undo.body.canRedo).toBe(true);

  const noUndoAgain = await request(app).post('/api/rituals/' + create.body.id + '/undo');
  expect(noUndoAgain.status).toBe(409);

  const redo = await request(app).post('/api/rituals/' + create.body.id + '/redo');
  expect(redo.status).toBe(200);
  expect(redo.body.name).toBe('Renamed');
  expect(redo.body.canUndo).toBe(true);
  expect(redo.body.canRedo).toBe(false);

  const noRedo = await request(app).post('/api/rituals/' + create.body.id + '/redo');
  expect(noRedo.status).toBe(409);
});

test('a PUT that changes nothing does not add a history entry', async () => {
  const create = await request(app).post('/api/rituals').send({
    name: 'Steady', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E1',
  });
  const noop = await request(app)
    .put('/api/rituals/' + create.body.id)
    .send({ name: 'Steady', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E1' });
  expect(noop.body.canUndo).toBe(false);
});

test('a new edit after an undo discards the old redo branch', async () => {
  const create = await request(app).post('/api/rituals').send({
    name: 'A', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E1',
  });
  await request(app).put('/api/rituals/' + create.body.id).send({ name: 'B', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E1' });
  await request(app).post('/api/rituals/' + create.body.id + '/undo');

  const edit = await request(app)
    .put('/api/rituals/' + create.body.id)
    .send({ name: 'C', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E1' });
  expect(edit.body.name).toBe('C');
  expect(edit.body.canRedo).toBe(false);

  const redo = await request(app).post('/api/rituals/' + create.body.id + '/redo');
  expect(redo.status).toBe(409);
});

test('undo/redo 404 for a ritual that does not exist', async () => {
  const undo = await request(app).post('/api/rituals/nope/undo');
  expect(undo.status).toBe(404);
  const redo = await request(app).post('/api/rituals/nope/redo');
  expect(redo.status).toBe(404);
});

test('triggerable defaults to true when omitted, and persists false when sent', async () => {
  const defaulted = await request(app).post('/api/rituals').send({
    name: 'Defaulted', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E1',
  });
  expect(defaulted.body.triggerable).toBe(true);

  const nonTriggerable = await request(app).post('/api/rituals').send({
    name: 'Non-triggerable', purpose: 'Boon', primary: 'Genesis', subs: [], effect: 'E1', triggerable: false,
  });
  expect(nonTriggerable.body.triggerable).toBe(false);

  const get = await request(app).get('/api/rituals');
  const found = get.body.find((r) => r.id === nonTriggerable.body.id);
  expect(found.triggerable).toBe(false);

  const update = await request(app)
    .put('/api/rituals/' + nonTriggerable.body.id)
    .send({ name: 'Non-triggerable', purpose: 'Boon', primary: 'Genesis', subs: [], effect: 'E1', triggerable: true });
  expect(update.body.triggerable).toBe(true);
});

test('triggerable round-trips through undo/redo', async () => {
  const create = await request(app).post('/api/rituals').send({
    name: 'Toggle', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E1', triggerable: true,
  });

  const edit = await request(app)
    .put('/api/rituals/' + create.body.id)
    .send({ name: 'Toggle', purpose: 'Boon', primary: 'Aether', subs: [], effect: 'E1', triggerable: false });
  expect(edit.body.triggerable).toBe(false);

  const undo = await request(app).post('/api/rituals/' + create.body.id + '/undo');
  expect(undo.body.triggerable).toBe(true);

  const redo = await request(app).post('/api/rituals/' + create.body.id + '/redo');
  expect(redo.body.triggerable).toBe(false);
});
