const express = require('express');
const crypto = require('crypto');
const { MAX_BOARD_RADIUS } = require('../../public/hex');
const { validatePlacements } = require('../lib/arrays');
const { asyncHandler } = require('../lib/asyncHandler');

function rowToArray(row) {
  return {
    id: row.id,
    name: row.name,
    radius: row.radius,
    placements: row.placements,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Radius is a board-size guard rail (see rituals.js's parseSize for the
// same idea on ritual size); placement contents (coordinates, size,
// ritualId, overlap) are checked by validatePlacements below.
function parseRadius(value, fallback) {
  const n = parseInt(value, 10);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(Math.max(n, 1), MAX_BOARD_RADIUS);
}

function parsePlacements(value, fallback) {
  return Array.isArray(value) ? value : fallback;
}

function statesEqual(a, b) {
  return a.name === b.name && a.radius === b.radius && JSON.stringify(a.placements) === JSON.stringify(b.placements);
}

async function validRitualIdSet(db) {
  const [rows] = await db.query('SELECT id FROM rituals');
  return new Set(rows.map((r) => r.id));
}

async function canRedo(db, arrayId, historySeq) {
  const [rows] = await db.query('SELECT 1 FROM array_history WHERE array_id = ? AND seq = ? LIMIT 1', [arrayId, historySeq + 1]);
  return rows.length > 0;
}

async function withHistoryFlags(db, row) {
  return {
    ...rowToArray(row),
    canUndo: row.history_seq > 0,
    canRedo: await canRedo(db, row.id, row.history_seq),
  };
}

function arraysRouter(db) {
  const router = express.Router();

  router.get('/', asyncHandler(async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) {
      const [rows] = await db.query('SELECT * FROM arrays ORDER BY created_at DESC');
      return res.json(rows.map(rowToArray));
    }
    const [rows] = await db.query('SELECT * FROM arrays WHERE name LIKE ? ORDER BY created_at DESC', [`%${q}%`]);
    res.json(rows.map(rowToArray));
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const now = new Date().toISOString();
    const body = req.body || {};
    const row = {
      id: crypto.randomUUID(),
      name: body.name || 'Untitled Array',
      radius: parseRadius(body.radius, 3),
      placements: parsePlacements(body.placements, []),
      created_at: now,
      updated_at: now,
      history_seq: 0,
    };

    const validIds = await validRitualIdSet(db);
    const validationError = validatePlacements(row.placements, row.radius, validIds);
    if (validationError) return res.status(400).json({ error: validationError });

    await db.query('INSERT INTO arrays (id, name, radius, placements, created_at, updated_at, history_seq) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      row.id,
      row.name,
      row.radius,
      JSON.stringify(row.placements),
      row.created_at,
      row.updated_at,
      row.history_seq,
    ]);
    await db.query('INSERT INTO array_history (array_id, seq, name, radius, placements, created_at) VALUES (?, 0, ?, ?, ?, ?)', [
      row.id,
      row.name,
      row.radius,
      JSON.stringify(row.placements),
      row.created_at,
    ]);
    res.status(201).json({ ...rowToArray(row), canUndo: false, canRedo: false });
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    const [existingRows] = await db.query('SELECT * FROM arrays WHERE id = ?', [req.params.id]);
    if (existingRows.length === 0) return res.status(404).json({ error: 'Array not found.' });
    const existing = existingRows[0];

    const body = req.body || {};
    const name = body.name !== undefined ? body.name : existing.name;
    const radius = parseRadius(body.radius, existing.radius);
    const placements = parsePlacements(body.placements, existing.placements);

    const validIds = await validRitualIdSet(db);
    const validationError = validatePlacements(placements, radius, validIds);
    if (validationError) return res.status(400).json({ error: validationError });

    const newState = { name, radius, placements };
    if (statesEqual(newState, { name: existing.name, radius: existing.radius, placements: existing.placements })) {
      return res.json(await withHistoryFlags(db, existing));
    }

    const updated_at = new Date().toISOString();
    const nextSeq = existing.history_seq + 1;

    await db.query('DELETE FROM array_history WHERE array_id = ? AND seq > ?', [req.params.id, existing.history_seq]);
    await db.query('INSERT INTO array_history (array_id, seq, name, radius, placements, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
      req.params.id,
      nextSeq,
      name,
      radius,
      JSON.stringify(placements),
      updated_at,
    ]);
    await db.query('UPDATE arrays SET name=?, radius=?, placements=?, updated_at=?, history_seq=? WHERE id=?', [
      name,
      radius,
      JSON.stringify(placements),
      updated_at,
      nextSeq,
      req.params.id,
    ]);

    const [updatedRows] = await db.query('SELECT * FROM arrays WHERE id = ?', [req.params.id]);
    res.json(await withHistoryFlags(db, updatedRows[0]));
  }));

  router.post('/:id/undo', asyncHandler(async (req, res) => {
    const [existingRows] = await db.query('SELECT * FROM arrays WHERE id = ?', [req.params.id]);
    if (existingRows.length === 0) return res.status(404).json({ error: 'Array not found.' });
    const existing = existingRows[0];

    if (existing.history_seq === 0) return res.status(409).json({ error: 'Nothing to undo.' });

    const [snapshotRows] = await db.query('SELECT * FROM array_history WHERE array_id = ? AND seq = ?', [req.params.id, existing.history_seq - 1]);
    const snapshot = snapshotRows[0];
    const updated_at = new Date().toISOString();
    await db.query('UPDATE arrays SET name=?, radius=?, placements=?, updated_at=?, history_seq=? WHERE id=?', [
      snapshot.name,
      snapshot.radius,
      JSON.stringify(snapshot.placements),
      updated_at,
      existing.history_seq - 1,
      req.params.id,
    ]);

    const [updatedRows] = await db.query('SELECT * FROM arrays WHERE id = ?', [req.params.id]);
    res.json(await withHistoryFlags(db, updatedRows[0]));
  }));

  router.post('/:id/redo', asyncHandler(async (req, res) => {
    const [existingRows] = await db.query('SELECT * FROM arrays WHERE id = ?', [req.params.id]);
    if (existingRows.length === 0) return res.status(404).json({ error: 'Array not found.' });
    const existing = existingRows[0];

    const [snapshotRows] = await db.query('SELECT * FROM array_history WHERE array_id = ? AND seq = ?', [req.params.id, existing.history_seq + 1]);
    if (snapshotRows.length === 0) return res.status(409).json({ error: 'Nothing to redo.' });
    const snapshot = snapshotRows[0];

    const updated_at = new Date().toISOString();
    await db.query('UPDATE arrays SET name=?, radius=?, placements=?, updated_at=?, history_seq=? WHERE id=?', [
      snapshot.name,
      snapshot.radius,
      JSON.stringify(snapshot.placements),
      updated_at,
      existing.history_seq + 1,
      req.params.id,
    ]);

    const [updatedRows] = await db.query('SELECT * FROM arrays WHERE id = ?', [req.params.id]);
    res.json(await withHistoryFlags(db, updatedRows[0]));
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const [result] = await db.query('DELETE FROM arrays WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Array not found.' });
    await db.query('DELETE FROM array_history WHERE array_id = ?', [req.params.id]);
    res.status(204).end();
  }));

  return router;
}

module.exports = { arraysRouter, rowToArray };
