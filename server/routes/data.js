const express = require('express');
const crypto = require('crypto');
const { rowToRitual } = require('./rituals');
const { rowToArray } = require('./arrays');
const { ritualsMatch } = require('../lib/rituals');
const { getTier } = require('../../public/reference-data');

function dataRouter(db) {
  const router = express.Router();

  router.get('/export', (req, res) => {
    const rituals = db.prepare('SELECT * FROM rituals ORDER BY created_at DESC').all().map(rowToRitual);
    const notes = db.prepare('SELECT * FROM notes ORDER BY created_at DESC').all();
    const arrays = db.prepare('SELECT * FROM arrays ORDER BY created_at DESC').all().map(rowToArray);
    res.json({ rituals, notes, arrays });
  });

  router.post('/import', (req, res) => {
    const parsed = req.body || {};
    const importedRituals = Array.isArray(parsed) ? parsed : parsed.rituals || [];
    const importedNotes = Array.isArray(parsed) ? [] : parsed.notes || [];
    const importedArrays = Array.isArray(parsed) ? [] : parsed.arrays || [];

    const insertRitual = db.prepare(
      'INSERT INTO rituals (id, name, purpose, primary_rune, subs, tier, effect, created_at) VALUES (@id, @name, @purpose, @primary_rune, @subs, @tier, @effect, @created_at)'
    );
    const insertNote = db.prepare(
      'INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (@id, @title, @body, @created_at, @updated_at)'
    );
    const insertArray = db.prepare(
      'INSERT INTO arrays (id, name, rows, cols, cells, created_at, updated_at) VALUES (@id, @name, @rows, @cols, @cells, @created_at, @updated_at)'
    );

    let addedR = 0;
    let skippedR = 0;
    let dupesR = 0;
    const currentRituals = db.prepare('SELECT * FROM rituals').all().map(rowToRitual);
    importedRituals.forEach((r) => {
      if (!r.name || !r.purpose || !r.primary || !r.effect) { skippedR++; return; }
      const isDupe = currentRituals.some((existing) => ritualsMatch(existing, r));
      if (isDupe) { dupesR++; return; }
      const subs = r.subs || [];
      const row = {
        id: r.id || crypto.randomUUID(),
        name: r.name,
        purpose: r.purpose,
        primary_rune: r.primary,
        subs: JSON.stringify(subs),
        tier: r.tier || getTier(subs.length),
        effect: r.effect,
        created_at: r.createdAt || new Date().toISOString(),
      };
      insertRitual.run(row);
      currentRituals.push(rowToRitual(row));
      addedR++;
    });

    let addedN = 0;
    const existingNoteIds = new Set(db.prepare('SELECT id FROM notes').all().map((n) => n.id));
    importedNotes.forEach((n) => {
      const id = n.id || crypto.randomUUID();
      if (existingNoteIds.has(id)) return;
      const now = new Date().toISOString();
      insertNote.run({ id, title: n.title || '', body: n.body || '', created_at: n.createdAt || now, updated_at: n.updatedAt || now });
      existingNoteIds.add(id);
      addedN++;
    });

    let addedA = 0;
    const existingArrayIds = new Set(db.prepare('SELECT id FROM arrays').all().map((a) => a.id));
    importedArrays.forEach((a) => {
      const id = a.id || crypto.randomUUID();
      if (existingArrayIds.has(id)) return;
      const now = new Date().toISOString();
      insertArray.run({
        id,
        name: a.name || 'Untitled Array',
        rows: Number.isInteger(a.rows) ? a.rows : 4,
        cols: Number.isInteger(a.cols) ? a.cols : 4,
        cells: JSON.stringify(a.cells || {}),
        created_at: a.createdAt || now,
        updated_at: a.updatedAt || now,
      });
      existingArrayIds.add(id);
      addedA++;
    });

    res.json({ addedR, skippedR, dupesR, addedN, addedA });
  });

  return router;
}

module.exports = { dataRouter };
