const express = require('express');
const crypto = require('crypto');
const { COMPONENTS } = require('../../public/reference-data');

function componentsRouter(db) {
  const router = express.Router();

  function nameTaken(name, rune, excludeId) {
    const lower = name.toLowerCase();
    const builtinClash = COMPONENTS.some((c) => c.rune === rune && c.name.toLowerCase() === lower);
    if (builtinClash) return true;
    const customRows = db.prepare('SELECT * FROM custom_components WHERE rune = ?').all(rune);
    return customRows.some((c) => c.id !== excludeId && c.name.toLowerCase() === lower);
  }

  router.get('/', (req, res) => {
    res.json(db.prepare('SELECT * FROM custom_components').all());
  });

  router.post('/', (req, res) => {
    const { name, rune, tier, desc } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Please enter a name.' });
    if (!rune) return res.status(400).json({ error: 'Please select a rune.' });
    if (!tier) return res.status(400).json({ error: 'Please select a tier.' });
    if (!desc || !String(desc).trim()) return res.status(400).json({ error: 'Please enter a description.' });

    if (nameTaken(String(name).trim(), rune, null)) {
      return res.status(409).json({ error: `A component with this name already exists for ${rune}.` });
    }

    const row = {
      id: crypto.randomUUID(),
      name: String(name).trim(),
      rune,
      tier,
      desc: String(desc).trim(),
    };
    db.prepare('INSERT INTO custom_components (id, name, rune, tier, desc) VALUES (@id, @name, @rune, @tier, @desc)').run(row);
    res.status(201).json(row);
  });

  router.put('/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM custom_components WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Component not found.' });

    const { name, rune, tier, desc } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Please enter a name.' });
    if (!rune) return res.status(400).json({ error: 'Please select a rune.' });
    if (!tier) return res.status(400).json({ error: 'Please select a tier.' });
    if (!desc || !String(desc).trim()) return res.status(400).json({ error: 'Please enter a description.' });

    if (nameTaken(String(name).trim(), rune, req.params.id)) {
      return res.status(409).json({ error: `A component with this name already exists for ${rune}.` });
    }

    db.prepare('UPDATE custom_components SET name=?, rune=?, tier=?, desc=? WHERE id=?').run(
      String(name).trim(),
      rune,
      tier,
      String(desc).trim(),
      req.params.id
    );
    res.json(db.prepare('SELECT * FROM custom_components WHERE id = ?').get(req.params.id));
  });

  router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM custom_components WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Component not found.' });
    res.status(204).end();
  });

  return router;
}

module.exports = { componentsRouter };
