const express = require('express');
const crypto = require('crypto');
const { getTier } = require('../../public/reference-data');
const { MAX_RITUAL_SIZE } = require('../../public/hex');
const { ritualsMatch } = require('../lib/rituals');
const { asyncHandler } = require('../lib/asyncHandler');

function rowToRitual(row) {
  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose,
    primary: row.primary_rune,
    subs: row.subs,
    tier: row.tier,
    effect: row.effect,
    size: row.size,
    createdAt: row.created_at,
  };
}

// How many hexes this ritual occupies/reaches in an array (public/hex.js).
// Defaults to 1 and clamps to a sane range rather than rejecting bad input,
// matching how the rest of this route treats optional fields.
function parseSize(value) {
  const n = parseInt(value, 10);
  if (!Number.isInteger(n)) return 1;
  return Math.min(Math.max(n, 1), MAX_RITUAL_SIZE);
}

function ritualsRouter(db) {
  const router = express.Router();

  router.get('/', asyncHandler(async (req, res) => {
    const [rows] = await db.query('SELECT * FROM rituals ORDER BY created_at DESC');
    res.json(rows.map(rowToRitual));
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const { name, purpose, primary, subs, effect, size } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Please enter a ritual name.' });
    if (!purpose) return res.status(400).json({ error: 'Please select a purpose.' });
    if (!primary) return res.status(400).json({ error: 'Please select a primary rune.' });
    if (!effect || !String(effect).trim()) return res.status(400).json({ error: 'Please describe the effect.' });

    const candidate = { purpose, primary, subs: subs || [] };
    const [existingRows] = await db.query('SELECT * FROM rituals');
    const existing = existingRows.map(rowToRitual);
    const dupe = existing.find((r) => ritualsMatch(r, candidate));
    if (dupe) {
      return res.status(409).json({ error: `Duplicate: "${dupe.name}" already uses this purpose + rune combination.` });
    }

    const row = {
      id: crypto.randomUUID(),
      name: String(name).trim(),
      purpose,
      primary_rune: primary,
      subs: subs || [],
      tier: getTier((subs || []).length),
      effect: String(effect).trim(),
      size: parseSize(size),
      created_at: new Date().toISOString(),
    };
    await db.query(
      'INSERT INTO rituals (id, name, purpose, primary_rune, subs, tier, effect, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [row.id, row.name, row.purpose, row.primary_rune, JSON.stringify(row.subs), row.tier, row.effect, row.size, row.created_at]
    );
    res.status(201).json(rowToRitual(row));
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    const [existingRows] = await db.query('SELECT * FROM rituals WHERE id = ?', [req.params.id]);
    if (existingRows.length === 0) return res.status(404).json({ error: 'Ritual not found.' });

    const { name, purpose, primary, subs, effect, size } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Please enter a ritual name.' });
    if (!purpose) return res.status(400).json({ error: 'Please select a purpose.' });
    if (!primary) return res.status(400).json({ error: 'Please select a primary rune.' });
    if (!effect || !String(effect).trim()) return res.status(400).json({ error: 'Please describe the effect.' });

    const candidate = { purpose, primary, subs: subs || [] };
    const [otherRows] = await db.query('SELECT * FROM rituals WHERE id != ?', [req.params.id]);
    const others = otherRows.map(rowToRitual);
    const dupe = others.find((r) => ritualsMatch(r, candidate));
    if (dupe) {
      return res.status(409).json({ error: `Duplicate: "${dupe.name}" already uses this purpose + rune combination.` });
    }

    await db.query(
      'UPDATE rituals SET name=?, purpose=?, primary_rune=?, subs=?, tier=?, effect=?, size=? WHERE id=?',
      [
        String(name).trim(),
        purpose,
        primary,
        JSON.stringify(subs || []),
        getTier((subs || []).length),
        String(effect).trim(),
        parseSize(size),
        req.params.id,
      ]
    );
    const [updatedRows] = await db.query('SELECT * FROM rituals WHERE id = ?', [req.params.id]);
    res.json(rowToRitual(updatedRows[0]));
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const [result] = await db.query('DELETE FROM rituals WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Ritual not found.' });
    res.status(204).end();
  }));

  return router;
}

module.exports = { ritualsRouter, rowToRitual, parseSize };
