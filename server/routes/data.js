const express = require('express');
const crypto = require('crypto');
const { rowToRitual, parseSize } = require('./rituals');
const { rowToArray } = require('./arrays');
const { ritualsMatch } = require('../lib/rituals');
const { getTier } = require('../../public/reference-data');
const { MAX_BOARD_RADIUS } = require('../../public/hex');
const { asyncHandler } = require('../lib/asyncHandler');

function dataRouter(db) {
  const router = express.Router();

  router.get('/export', asyncHandler(async (req, res) => {
    const [ritualRows] = await db.query('SELECT * FROM rituals ORDER BY created_at DESC');
    const [noteRows] = await db.query('SELECT * FROM notes ORDER BY created_at DESC');
    const [arrayRows] = await db.query('SELECT * FROM arrays ORDER BY created_at DESC');
    res.json({
      rituals: ritualRows.map(rowToRitual),
      notes: noteRows,
      arrays: arrayRows.map(rowToArray),
    });
  }));

  router.post('/import', asyncHandler(async (req, res) => {
    const parsed = req.body || {};
    const importedRituals = Array.isArray(parsed) ? parsed : parsed.rituals || [];
    const importedNotes = Array.isArray(parsed) ? [] : parsed.notes || [];
    const importedArrays = Array.isArray(parsed) ? [] : parsed.arrays || [];

    let addedR = 0;
    let skippedR = 0;
    let dupesR = 0;
    const [currentRitualRows] = await db.query('SELECT * FROM rituals');
    const currentRituals = currentRitualRows.map(rowToRitual);
    for (const r of importedRituals) {
      if (!r.name || !r.purpose || !r.primary || !r.effect) { skippedR++; continue; }
      const isDupe = currentRituals.some((existing) => ritualsMatch(existing, r));
      if (isDupe) { dupesR++; continue; }
      const subs = r.subs || [];
      const row = {
        id: r.id || crypto.randomUUID(),
        name: r.name,
        purpose: r.purpose,
        primary_rune: r.primary,
        subs,
        tier: r.tier || getTier(subs.length),
        effect: r.effect,
        size: parseSize(r.size),
        created_at: r.createdAt || new Date().toISOString(),
      };
      await db.query(
        'INSERT INTO rituals (id, name, purpose, primary_rune, subs, tier, effect, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [row.id, row.name, row.purpose, row.primary_rune, JSON.stringify(row.subs), row.tier, row.effect, row.size, row.created_at]
      );
      currentRituals.push(rowToRitual(row));
      addedR++;
    }

    let addedN = 0;
    const [existingNoteRows] = await db.query('SELECT id FROM notes');
    const existingNoteIds = new Set(existingNoteRows.map((n) => n.id));
    for (const n of importedNotes) {
      const id = n.id || crypto.randomUUID();
      if (existingNoteIds.has(id)) continue;
      const now = new Date().toISOString();
      await db.query('INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
        id,
        n.title || '',
        n.body || '',
        n.createdAt || now,
        n.updatedAt || now,
      ]);
      existingNoteIds.add(id);
      addedN++;
    }

    let addedA = 0;
    const [existingArrayRows] = await db.query('SELECT id FROM arrays');
    const existingArrayIds = new Set(existingArrayRows.map((a) => a.id));
    for (const a of importedArrays) {
      const id = a.id || crypto.randomUUID();
      if (existingArrayIds.has(id)) continue;
      const now = new Date().toISOString();
      const radius = Number.isInteger(a.radius) ? Math.min(Math.max(a.radius, 1), MAX_BOARD_RADIUS) : 3;
      await db.query('INSERT INTO arrays (id, name, radius, placements, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [
        id,
        a.name || 'Untitled Array',
        radius,
        JSON.stringify(Array.isArray(a.placements) ? a.placements : []),
        a.createdAt || now,
        a.updatedAt || now,
      ]);
      existingArrayIds.add(id);
      addedA++;
    }

    res.json({ addedR, skippedR, dupesR, addedN, addedA });
  }));

  return router;
}

module.exports = { dataRouter };
