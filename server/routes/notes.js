const express = require('express');
const crypto = require('crypto');

function notesRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const [rows] = await db.query('SELECT * FROM notes ORDER BY created_at DESC');
    res.json(rows);
  });

  router.post('/', async (req, res) => {
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      title: (req.body && req.body.title) || 'Untitled note',
      body: (req.body && req.body.body) || '',
      created_at: now,
      updated_at: now,
    };
    await db.query('INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
      row.id,
      row.title,
      row.body,
      row.created_at,
      row.updated_at,
    ]);
    res.status(201).json(row);
  });

  router.put('/:id', async (req, res) => {
    const [existingRows] = await db.query('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    if (existingRows.length === 0) return res.status(404).json({ error: 'Note not found.' });
    const existing = existingRows[0];
    const title = req.body && req.body.title !== undefined ? req.body.title : existing.title;
    const body = req.body && req.body.body !== undefined ? req.body.body : existing.body;
    const updated_at = new Date().toISOString();
    await db.query('UPDATE notes SET title=?, body=?, updated_at=? WHERE id=?', [title, body, updated_at, req.params.id]);
    const [updatedRows] = await db.query('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    res.json(updatedRows[0]);
  });

  router.delete('/:id', async (req, res) => {
    const [result] = await db.query('DELETE FROM notes WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Note not found.' });
    res.status(204).end();
  });

  return router;
}

module.exports = { notesRouter };
