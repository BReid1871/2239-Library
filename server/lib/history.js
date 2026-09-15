// Generic undo/redo history: one snapshot per edit in `historyTable`, keyed
// by a per-row sequence number. The row's own `history_seq` column (managed
// by the caller) points at which snapshot is "current" — undo/redo just move
// that pointer and copy the snapshot's tracked columns back onto the row. A
// new edit after an undo discards any snapshots ahead of the pointer (the
// old redo branch). Originally inline in routes/arrays.js; extracted so
// rituals and notes can reuse the same mechanics against their own tables.
function makeHistory(db, { historyTable, idColumn, columns }) {
  async function insertSnapshot(id, seq, values, createdAt) {
    const cols = [idColumn, 'seq', ...columns.map((c) => c.name), 'created_at'];
    const params = [
      id,
      seq,
      ...columns.map((c) => (c.json ? JSON.stringify(values[c.name]) : values[c.name])),
      createdAt,
    ];
    await db.query(
      `INSERT INTO ${historyTable} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      params
    );
  }

  async function hasSeq(id, seq) {
    const [rows] = await db.query(`SELECT 1 FROM ${historyTable} WHERE ${idColumn} = ? AND seq = ? LIMIT 1`, [id, seq]);
    return rows.length > 0;
  }

  async function flags(id, historySeq) {
    return { canUndo: historySeq > 0, canRedo: await hasSeq(id, historySeq + 1) };
  }

  function unchanged(existing, values) {
    return columns.every((c) => {
      if (c.json) return JSON.stringify(existing[c.name]) === JSON.stringify(values[c.name]);
      return existing[c.name] === values[c.name];
    });
  }

  // Records a new edit if `values` (new tracked-column values) differ from
  // `existing` (the current DB row): prunes any redo branch ahead of the
  // current seq, inserts the new snapshot, and returns the next seq for the
  // caller to persist on the row. Returns null (no history write) if nothing
  // tracked actually changed.
  async function recordEdit(id, existing, values, timestamp) {
    if (unchanged(existing, values)) return null;
    const nextSeq = existing.history_seq + 1;
    await db.query(`DELETE FROM ${historyTable} WHERE ${idColumn} = ? AND seq > ?`, [id, existing.history_seq]);
    await insertSnapshot(id, nextSeq, values, timestamp);
    return nextSeq;
  }

  // Returns the history-table row at existingSeq + direction (-1 undo, +1
  // redo), or null if that seq doesn't exist — callers return 409 in that
  // case.
  async function shift(id, existingSeq, direction) {
    const targetSeq = existingSeq + direction;
    if (targetSeq < 0) return null;
    const [rows] = await db.query(`SELECT * FROM ${historyTable} WHERE ${idColumn} = ? AND seq = ?`, [id, targetSeq]);
    return rows[0] || null;
  }

  return { insertSnapshot, flags, recordEdit, shift };
}

module.exports = { makeHistory };
