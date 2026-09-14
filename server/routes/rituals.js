const express = require('express');
const crypto = require('crypto');
const { getTier } = require('../../public/reference-data');
const { ritualsMatch } = require('../lib/rituals');

function rowToRitual(row) {
  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose,
    primary: row.primary_rune,
    subs: JSON.parse(row.subs),
    tier: row.tier,
    effect: row.effect,
    createdAt: row.created_at,
  };
}

function ritualsRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const rows = db.prepare('SELECT * FROM rituals ORDER BY created_at DESC').all();
    res.json(rows.map(rowToRitual));
  });

  router.post('/', (req, res) => {
    const { name, purpose, primary, subs, effect } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Please enter a ritual name.' });
    if (!purpose) return res.status(400).json({ error: 'Please select a purpose.' });
    if (!primary) return res.status(400).json({ error: 'Please select a primary rune.' });
    if (!effect || !String(effect).trim()) return res.status(400).json({ error: 'Please describe the effect.' });

    const candidate = { purpose, primary, subs: subs || [] };
    const existing = db.prepare('SELECT * FROM rituals').all().map(rowToRitual);
    const dupe = existing.find((r) => ritualsMatch(r, candidate));
    if (dupe) {
      return res.status(409).json({ error: `Duplicate: "${dupe.name}" already uses this purpose + rune combination.` });
    }

    const row = {
      id: crypto.randomUUID(),
      name: String(name).trim(),
      purpose,
      primary_rune: primary,
      subs: JSON.stringify(subs || []),
      tier: getTier((subs || []).length),
      effect: String(effect).trim(),
      created_at: new Date().toISOString(),
    };
    db.prepare(
      'INSERT INTO rituals (id, name, purpose, primary_rune, subs, tier, effect, created_at) VALUES (@id, @name, @purpose, @primary_rune, @subs, @tier, @effect, @created_at)'
    ).run(row);
    res.status(201).json(rowToRitual(row));
  });

  router.put('/:id', (req, res) => {
    const existingRow = db.prepare('SELECT * FROM rituals WHERE id = ?').get(req.params.id);
    if (!existingRow) return res.status(404).json({ error: 'Ritual not found.' });

    const { name, purpose, primary, subs, effect } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Please enter a ritual name.' });
    if (!purpose) return res.status(400).json({ error: 'Please select a purpose.' });
    if (!primary) return res.status(400).json({ error: 'Please select a primary rune.' });
    if (!effect || !String(effect).trim()) return res.status(400).json({ error: 'Please describe the effect.' });

    const candidate = { purpose, primary, subs: subs || [] };
    const others = db.prepare('SELECT * FROM rituals WHERE id != ?').all(req.params.id).map(rowToRitual);
    const dupe = others.find((r) => ritualsMatch(r, candidate));
    if (dupe) {
      return res.status(409).json({ error: `Duplicate: "${dupe.name}" already uses this purpose + rune combination.` });
    }

    db.prepare(
      'UPDATE rituals SET name=@name, purpose=@purpose, primary_rune=@primary_rune, subs=@subs, tier=@tier, effect=@effect WHERE id=@id'
    ).run({
      id: req.params.id,
      name: String(name).trim(),
      purpose,
      primary_rune: primary,
      subs: JSON.stringify(subs || []),
      tier: getTier((subs || []).length),
      effect: String(effect).trim(),
    });
    res.json(rowToRitual(db.prepare('SELECT * FROM rituals WHERE id = ?').get(req.params.id)));
  });

  router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM rituals WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Ritual not found.' });
    res.status(204).end();
  });

  return router;
}

module.exports = { ritualsRouter, rowToRitual };
