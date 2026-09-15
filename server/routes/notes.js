const express = require('express');
const crypto = require('crypto');
const { asyncHandler } = require('../lib/asyncHandler');

const LINK_TYPES = ['ritual', 'array', 'component'];

function sanitizeLinks(links) {
  if (!Array.isArray(links)) return [];
  return links
    .filter((l) => l && LINK_TYPES.includes(l.type))
    .map((l) => {
      if (l.type === 'component') {
        if (typeof l.rune !== 'string' || typeof l.name !== 'string' || !l.name.trim()) return null;
        return { type: 'component', rune: l.rune, name: l.name.trim() };
      }
      if (typeof l.id !== 'string' || !l.id.trim()) return null;
      return { type: l.type, id: l.id };
    })
    .filter(Boolean);
}

function notesRouter(db) {
  const router = express.Router();

  router.get('/', asyncHandler(async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) {
      const [rows] = await db.query('SELECT * FROM notes ORDER BY created_at DESC');
      return res.json(rows);
    }
    const like = `%${q}%`;
    const [rows] = await db.query(
      'SELECT * FROM notes WHERE title LIKE ? OR body LIKE ? ORDER BY created_at DESC',
      [like, like]
    );
    res.json(rows);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      title: (req.body && req.body.title) || 'Untitled note',
      body: (req.body && req.body.body) || '',
      created_at: now,
      updated_at: now,
      links: sanitizeLinks(req.body && req.body.links),
    };
    await db.query('INSERT INTO notes (id, title, body, created_at, updated_at, links) VALUES (?, ?, ?, ?, ?, ?)', [
      row.id,
      row.title,
      row.body,
      row.created_at,
      row.updated_at,
      JSON.stringify(row.links),
    ]);
    res.status(201).json(row);
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    const [existingRows] = await db.query('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    if (existingRows.length === 0) return res.status(404).json({ error: 'Note not found.' });
    const existing = existingRows[0];
    const title = req.body && req.body.title !== undefined ? req.body.title : existing.title;
    const body = req.body && req.body.body !== undefined ? req.body.body : existing.body;
    const links = req.body && req.body.links !== undefined ? sanitizeLinks(req.body.links) : existing.links;
    const updated_at = new Date().toISOString();
    await db.query('UPDATE notes SET title=?, body=?, updated_at=?, links=? WHERE id=?', [
      title,
      body,
      updated_at,
      JSON.stringify(links),
      req.params.id,
    ]);
    const [updatedRows] = await db.query('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    res.json(updatedRows[0]);
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const [result] = await db.query('DELETE FROM notes WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Note not found.' });
    res.status(204).end();
  }));

  return router;
}

module.exports = { notesRouter };
