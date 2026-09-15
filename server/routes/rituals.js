const express = require('express');
const crypto = require('crypto');
const { getTier, IGNORES } = require('../../public/reference-data');
const { ritualsMatch, findRuneConflict } = require('../lib/rituals');
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
    createdAt: row.created_at,
    tags: row.tags || [],
    components: row.components || [],
  };
}

function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map((t) => String(t).trim()).filter(Boolean);
}

function sanitizeComponents(components) {
  if (!Array.isArray(components)) return [];
  return components
    .filter((c) => c && typeof c.rune === 'string' && typeof c.name === 'string' && c.name.trim())
    .map((c) => ({ rune: c.rune, name: c.name.trim() }));
}

function ritualsRouter(db) {
  const router = express.Router();

  router.get('/', asyncHandler(async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) {
      const [rows] = await db.query('SELECT * FROM rituals ORDER BY created_at DESC');
      return res.json(rows.map(rowToRitual));
    }
    const like = `%${q}%`;
    const [rows] = await db.query(
      `SELECT * FROM rituals
       WHERE name LIKE ? OR purpose LIKE ? OR primary_rune LIKE ? OR effect LIKE ?
          OR JSON_SEARCH(subs, 'one', ?) IS NOT NULL
          OR JSON_SEARCH(tags, 'one', ?) IS NOT NULL
          OR JSON_SEARCH(components, 'one', ?) IS NOT NULL
       ORDER BY created_at DESC`,
      [like, like, like, like, like, like, like]
    );
    res.json(rows.map(rowToRitual));
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const { name, purpose, primary, subs, effect, tags, components } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Please enter a ritual name.' });
    if (!purpose) return res.status(400).json({ error: 'Please select a purpose.' });
    if (!primary) return res.status(400).json({ error: 'Please select a primary rune.' });
    if (!effect || !String(effect).trim()) return res.status(400).json({ error: 'Please describe the effect.' });

    const conflict = findRuneConflict(primary, subs || [], IGNORES);
    if (conflict) {
      return res.status(400).json({ error: `${conflict.a} and ${conflict.b} ignore each other and cannot be combined in the same ritual.` });
    }

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
      created_at: new Date().toISOString(),
      tags: sanitizeTags(tags),
      components: sanitizeComponents(components),
    };
    await db.query(
      'INSERT INTO rituals (id, name, purpose, primary_rune, subs, tier, effect, created_at, tags, components) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        row.id,
        row.name,
        row.purpose,
        row.primary_rune,
        JSON.stringify(row.subs),
        row.tier,
        row.effect,
        row.created_at,
        JSON.stringify(row.tags),
        JSON.stringify(row.components),
      ]
    );
    res.status(201).json(rowToRitual(row));
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    const [existingRows] = await db.query('SELECT * FROM rituals WHERE id = ?', [req.params.id]);
    if (existingRows.length === 0) return res.status(404).json({ error: 'Ritual not found.' });

    const { name, purpose, primary, subs, effect, tags, components } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Please enter a ritual name.' });
    if (!purpose) return res.status(400).json({ error: 'Please select a purpose.' });
    if (!primary) return res.status(400).json({ error: 'Please select a primary rune.' });
    if (!effect || !String(effect).trim()) return res.status(400).json({ error: 'Please describe the effect.' });

    const conflict = findRuneConflict(primary, subs || [], IGNORES);
    if (conflict) {
      return res.status(400).json({ error: `${conflict.a} and ${conflict.b} ignore each other and cannot be combined in the same ritual.` });
    }

    const candidate = { purpose, primary, subs: subs || [] };
    const [otherRows] = await db.query('SELECT * FROM rituals WHERE id != ?', [req.params.id]);
    const others = otherRows.map(rowToRitual);
    const dupe = others.find((r) => ritualsMatch(r, candidate));
    if (dupe) {
      return res.status(409).json({ error: `Duplicate: "${dupe.name}" already uses this purpose + rune combination.` });
    }

    await db.query(
      'UPDATE rituals SET name=?, purpose=?, primary_rune=?, subs=?, tier=?, effect=?, tags=?, components=? WHERE id=?',
      [
        String(name).trim(),
        purpose,
        primary,
        JSON.stringify(subs || []),
        getTier((subs || []).length),
        String(effect).trim(),
        JSON.stringify(sanitizeTags(tags)),
        JSON.stringify(sanitizeComponents(components)),
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

module.exports = { ritualsRouter, rowToRitual };
