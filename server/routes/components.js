const express = require('express');
const crypto = require('crypto');
const { COMPONENTS } = require('../../public/reference-data');
const { asyncHandler } = require('../lib/asyncHandler');

function componentsRouter(db) {
  const router = express.Router();

  async function nameTaken(name, rune, excludeId) {
    const lower = name.toLowerCase();
    const builtinClash = COMPONENTS.some((c) => c.rune === rune && c.name.toLowerCase() === lower);
    if (builtinClash) return true;
    const [customRows] = await db.query('SELECT * FROM custom_components WHERE rune = ?', [rune]);
    return customRows.some((c) => c.id !== excludeId && c.name.toLowerCase() === lower);
  }

  router.get('/', asyncHandler(async (req, res) => {
    const [rows] = await db.query('SELECT * FROM custom_components');
    res.json(rows);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const { name, rune, tier, desc } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Please enter a name.' });
    if (!rune) return res.status(400).json({ error: 'Please select a rune.' });
    if (!tier) return res.status(400).json({ error: 'Please select a tier.' });
    if (!desc || !String(desc).trim()) return res.status(400).json({ error: 'Please enter a description.' });

    if (await nameTaken(String(name).trim(), rune, null)) {
      return res.status(409).json({ error: `A component with this name already exists for ${rune}.` });
    }

    const row = {
      id: crypto.randomUUID(),
      name: String(name).trim(),
      rune,
      tier,
      desc: String(desc).trim(),
    };
    await db.query('INSERT INTO custom_components (id, name, rune, tier, `desc`) VALUES (?, ?, ?, ?, ?)', [
      row.id,
      row.name,
      row.rune,
      row.tier,
      row.desc,
    ]);
    res.status(201).json(row);
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    const [existingRows] = await db.query('SELECT * FROM custom_components WHERE id = ?', [req.params.id]);
    if (existingRows.length === 0) return res.status(404).json({ error: 'Component not found.' });

    const { name, rune, tier, desc } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Please enter a name.' });
    if (!rune) return res.status(400).json({ error: 'Please select a rune.' });
    if (!tier) return res.status(400).json({ error: 'Please select a tier.' });
    if (!desc || !String(desc).trim()) return res.status(400).json({ error: 'Please enter a description.' });

    if (await nameTaken(String(name).trim(), rune, req.params.id)) {
      return res.status(409).json({ error: `A component with this name already exists for ${rune}.` });
    }

    await db.query('UPDATE custom_components SET name=?, rune=?, tier=?, `desc`=? WHERE id=?', [
      String(name).trim(),
      rune,
      tier,
      String(desc).trim(),
      req.params.id,
    ]);
    const [updatedRows] = await db.query('SELECT * FROM custom_components WHERE id = ?', [req.params.id]);
    res.json(updatedRows[0]);
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const [result] = await db.query('DELETE FROM custom_components WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Component not found.' });
    res.status(204).end();
  }));

  return router;
}

module.exports = { componentsRouter };
