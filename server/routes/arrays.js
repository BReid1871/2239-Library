const express = require('express');
const crypto = require('crypto');
const { MAX_BOARD_RADIUS } = require('../../public/hex');
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
// same idea on ritual size); placements are trusted as shaped by the
// client the same way `cells` was before — the editor is responsible for
// valid hex coordinates and non-overlapping footprints.
function parseRadius(value, fallback) {
  const n = parseInt(value, 10);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(Math.max(n, 1), MAX_BOARD_RADIUS);
}

function parsePlacements(value, fallback) {
  return Array.isArray(value) ? value : fallback;
}

function arraysRouter(db) {
  const router = express.Router();

  router.get('/', asyncHandler(async (req, res) => {
    const [rows] = await db.query('SELECT * FROM arrays ORDER BY created_at DESC');
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
    };
    await db.query('INSERT INTO arrays (id, name, radius, placements, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [
      row.id,
      row.name,
      row.radius,
      JSON.stringify(row.placements),
      row.created_at,
      row.updated_at,
    ]);
    res.status(201).json(rowToArray(row));
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    const [existingRows] = await db.query('SELECT * FROM arrays WHERE id = ?', [req.params.id]);
    if (existingRows.length === 0) return res.status(404).json({ error: 'Array not found.' });
    const existing = existingRows[0];

    const body = req.body || {};
    const name = body.name !== undefined ? body.name : existing.name;
    const radius = parseRadius(body.radius, existing.radius);
    const placements = parsePlacements(body.placements, existing.placements);
    const updated_at = new Date().toISOString();

    await db.query('UPDATE arrays SET name=?, radius=?, placements=?, updated_at=? WHERE id=?', [
      name,
      radius,
      JSON.stringify(placements),
      updated_at,
      req.params.id,
    ]);
    const [updatedRows] = await db.query('SELECT * FROM arrays WHERE id = ?', [req.params.id]);
    res.json(rowToArray(updatedRows[0]));
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const [result] = await db.query('DELETE FROM arrays WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Array not found.' });
    res.status(204).end();
  }));

  return router;
}

module.exports = { arraysRouter, rowToArray };
