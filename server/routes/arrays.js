const express = require('express');
const crypto = require('crypto');

function rowToArray(row) {
  return {
    id: row.id,
    name: row.name,
    rows: row.rows,
    cols: row.cols,
    cells: JSON.parse(row.cells),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function arraysRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(db.prepare('SELECT * FROM arrays ORDER BY created_at DESC').all().map(rowToArray));
  });

  router.post('/', (req, res) => {
    const now = new Date().toISOString();
    const body = req.body || {};
    const row = {
      id: crypto.randomUUID(),
      name: body.name || 'Untitled Array',
      rows: Number.isInteger(body.rows) ? body.rows : 4,
      cols: Number.isInteger(body.cols) ? body.cols : 4,
      cells: JSON.stringify(body.cells || {}),
      created_at: now,
      updated_at: now,
    };
    db.prepare(
      'INSERT INTO arrays (id, name, rows, cols, cells, created_at, updated_at) VALUES (@id, @name, @rows, @cols, @cells, @created_at, @updated_at)'
    ).run(row);
    res.status(201).json(rowToArray(row));
  });

  router.put('/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM arrays WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Array not found.' });

    const body = req.body || {};
    const name = body.name !== undefined ? body.name : existing.name;
    const rows = Number.isInteger(body.rows) ? body.rows : existing.rows;
    const cols = Number.isInteger(body.cols) ? body.cols : existing.cols;
    const cells = body.cells !== undefined ? JSON.stringify(body.cells) : existing.cells;
    const updated_at = new Date().toISOString();

    db.prepare('UPDATE arrays SET name=?, rows=?, cols=?, cells=?, updated_at=? WHERE id=?').run(
      name,
      rows,
      cols,
      cells,
      updated_at,
      req.params.id
    );
    res.json(rowToArray(db.prepare('SELECT * FROM arrays WHERE id = ?').get(req.params.id)));
  });

  router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM arrays WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Array not found.' });
    res.status(204).end();
  });

  return router;
}

module.exports = { arraysRouter, rowToArray };
