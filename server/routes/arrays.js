const express = require('express');
const crypto = require('crypto');

function rowToArray(row) {
  return {
    id: row.id,
    name: row.name,
    rows: row.rows,
    cols: row.cols,
    cells: row.cells,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function arraysRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const [rows] = await db.query('SELECT * FROM arrays ORDER BY created_at DESC');
    res.json(rows.map(rowToArray));
  });

  router.post('/', async (req, res) => {
    const now = new Date().toISOString();
    const body = req.body || {};
    const row = {
      id: crypto.randomUUID(),
      name: body.name || 'Untitled Array',
      rows: Number.isInteger(body.rows) ? body.rows : 4,
      cols: Number.isInteger(body.cols) ? body.cols : 4,
      cells: body.cells || {},
      created_at: now,
      updated_at: now,
    };
    await db.query('INSERT INTO arrays (id, name, `rows`, cols, cells, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      row.id,
      row.name,
      row.rows,
      row.cols,
      JSON.stringify(row.cells),
      row.created_at,
      row.updated_at,
    ]);
    res.status(201).json(rowToArray(row));
  });

  router.put('/:id', async (req, res) => {
    const [existingRows] = await db.query('SELECT * FROM arrays WHERE id = ?', [req.params.id]);
    if (existingRows.length === 0) return res.status(404).json({ error: 'Array not found.' });
    const existing = existingRows[0];

    const body = req.body || {};
    const name = body.name !== undefined ? body.name : existing.name;
    const rows = Number.isInteger(body.rows) ? body.rows : existing.rows;
    const cols = Number.isInteger(body.cols) ? body.cols : existing.cols;
    const cells = body.cells !== undefined ? body.cells : existing.cells;
    const updated_at = new Date().toISOString();

    await db.query('UPDATE arrays SET name=?, `rows`=?, cols=?, cells=?, updated_at=? WHERE id=?', [
      name,
      rows,
      cols,
      JSON.stringify(cells),
      updated_at,
      req.params.id,
    ]);
    const [updatedRows] = await db.query('SELECT * FROM arrays WHERE id = ?', [req.params.id]);
    res.json(rowToArray(updatedRows[0]));
  });

  router.delete('/:id', async (req, res) => {
    const [result] = await db.query('DELETE FROM arrays WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Array not found.' });
    res.status(204).end();
  });

  return router;
}

module.exports = { arraysRouter, rowToArray };
