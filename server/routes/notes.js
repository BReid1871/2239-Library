const express = require('express');
const crypto = require('crypto');

function notesRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(db.prepare('SELECT * FROM notes ORDER BY created_at DESC').all());
  });

  router.post('/', (req, res) => {
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      title: (req.body && req.body.title) || 'Untitled note',
      body: (req.body && req.body.body) || '',
      created_at: now,
      updated_at: now,
    };
    db.prepare(
      'INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (@id, @title, @body, @created_at, @updated_at)'
    ).run(row);
    res.status(201).json(row);
  });

  router.put('/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Note not found.' });
    const title = req.body && req.body.title !== undefined ? req.body.title : existing.title;
    const body = req.body && req.body.body !== undefined ? req.body.body : existing.body;
    const updated_at = new Date().toISOString();
    db.prepare('UPDATE notes SET title=?, body=?, updated_at=? WHERE id=?').run(title, body, updated_at, req.params.id);
    res.json(db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id));
  });

  router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Note not found.' });
    res.status(204).end();
  });

  return router;
}

module.exports = { notesRouter };
