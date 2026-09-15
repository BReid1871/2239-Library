const mysql = require('mysql2/promise');

const TABLES = ['rituals', 'notes', 'custom_components', 'arrays', 'array_history', 'ritual_history', 'note_history'];

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS rituals (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    purpose VARCHAR(64) NOT NULL,
    primary_rune VARCHAR(64) NOT NULL,
    subs JSON NOT NULL,
    tier VARCHAR(16) NOT NULL,
    effect TEXT NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    tags JSON NOT NULL DEFAULT ('[]'),
    components JSON NOT NULL DEFAULT ('[]'),
    triggerable TINYINT(1) NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS notes (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    links JSON NOT NULL DEFAULT ('[]')
  )`,
  `CREATE TABLE IF NOT EXISTS custom_components (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rune VARCHAR(64) NOT NULL,
    tier VARCHAR(16) NOT NULL,
    \`desc\` TEXT NOT NULL
  )`,
  // Hex-grid board: `radius` hex-rings out from the center, `placements` is
  // a JSON list of { id, ritualId, q, r, size } — see public/hex.js. Size
  // is per-placement, not a property of the ritual: the same ritual can be
  // placed at different sizes (or placed more than once at different
  // sizes) across different arrays, or within one array. Arrays used to be
  // a rectangular rows/cols/cells grid; the migrations below (see
  // MIGRATIONS) handle an existing deployment's table shape, but
  // placements are position data tied to the old square coordinates and
  // can't be translated onto a hex board, so any previously-placed
  // rituals are dropped (name/timestamps are kept).
  `CREATE TABLE IF NOT EXISTS arrays (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    radius INT NOT NULL DEFAULT 3,
    placements JSON NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL
  )`,
  // Undo/redo history for arrays: one snapshot per edit, keyed by a
  // per-array sequence number. `arrays.history_seq` (added below) points at
  // which snapshot is "current" — undo/redo just move that pointer and copy
  // the snapshot's state back onto the array row; a new edit after an undo
  // deletes any snapshots ahead of the pointer (the old redo branch).
  `CREATE TABLE IF NOT EXISTS array_history (
    array_id VARCHAR(36) NOT NULL,
    seq INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    radius INT NOT NULL,
    placements JSON NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    PRIMARY KEY (array_id, seq)
  )`,
  // Same undo/redo history mechanics as array_history (see server/lib/history.js),
  // applied to rituals. `rituals.history_seq` (added below) points at which
  // snapshot is current.
  `CREATE TABLE IF NOT EXISTS ritual_history (
    ritual_id VARCHAR(36) NOT NULL,
    seq INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    purpose VARCHAR(64) NOT NULL,
    primary_rune VARCHAR(64) NOT NULL,
    subs JSON NOT NULL,
    tier VARCHAR(16) NOT NULL,
    effect TEXT NOT NULL,
    tags JSON NOT NULL,
    components JSON NOT NULL,
    triggerable TINYINT(1) NOT NULL DEFAULT 1,
    created_at VARCHAR(32) NOT NULL,
    PRIMARY KEY (ritual_id, seq)
  )`,
  // Same undo/redo history mechanics as array_history, applied to notes.
  // `notes.history_seq` (added below) points at which snapshot is current.
  `CREATE TABLE IF NOT EXISTS note_history (
    note_id VARCHAR(36) NOT NULL,
    seq INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    links JSON NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    PRIMARY KEY (note_id, seq)
  )`,
];

// Real MySQL (unlike MariaDB) never supported ADD/DROP COLUMN ... IF
// [NOT] EXISTS, so these are applied conditionally in JS instead, each
// checked against information_schema first.
const MIGRATIONS = [
  // A `size` column briefly lived on rituals before size became a
  // per-placement property of an array instead (see the `arrays` comment
  // above) — drop it if an earlier deploy already added it.
  { table: 'rituals', column: 'size', kind: 'drop', ddl: 'ALTER TABLE rituals DROP COLUMN size' },
  { table: 'arrays', column: 'radius', kind: 'add', ddl: 'ALTER TABLE arrays ADD COLUMN radius INT NOT NULL DEFAULT 3' },
  { table: 'arrays', column: 'placements', kind: 'add', ddl: "ALTER TABLE arrays ADD COLUMN placements JSON NOT NULL DEFAULT ('[]')" },
  { table: 'arrays', column: 'rows', kind: 'drop', ddl: 'ALTER TABLE arrays DROP COLUMN `rows`' },
  { table: 'arrays', column: 'cols', kind: 'drop', ddl: 'ALTER TABLE arrays DROP COLUMN cols' },
  { table: 'arrays', column: 'cells', kind: 'drop', ddl: 'ALTER TABLE arrays DROP COLUMN cells' },
  { table: 'arrays', column: 'history_seq', kind: 'add', ddl: 'ALTER TABLE arrays ADD COLUMN history_seq INT NOT NULL DEFAULT 0' },
  { table: 'rituals', column: 'tags', kind: 'add', ddl: "ALTER TABLE rituals ADD COLUMN tags JSON NOT NULL DEFAULT ('[]')" },
  { table: 'rituals', column: 'components', kind: 'add', ddl: "ALTER TABLE rituals ADD COLUMN components JSON NOT NULL DEFAULT ('[]')" },
  { table: 'notes', column: 'links', kind: 'add', ddl: "ALTER TABLE notes ADD COLUMN links JSON NOT NULL DEFAULT ('[]')" },
  { table: 'rituals', column: 'history_seq', kind: 'add', ddl: 'ALTER TABLE rituals ADD COLUMN history_seq INT NOT NULL DEFAULT 0' },
  { table: 'notes', column: 'history_seq', kind: 'add', ddl: 'ALTER TABLE notes ADD COLUMN history_seq INT NOT NULL DEFAULT 0' },
  { table: 'rituals', column: 'triggerable', kind: 'add', ddl: 'ALTER TABLE rituals ADD COLUMN triggerable TINYINT(1) NOT NULL DEFAULT 1' },
  { table: 'ritual_history', column: 'triggerable', kind: 'add', ddl: 'ALTER TABLE ritual_history ADD COLUMN triggerable TINYINT(1) NOT NULL DEFAULT 1' },
];

function resolveConnectionConfig() {
  const connectionString = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (connectionString) return connectionString;

  return {
    host: process.env.MYSQLHOST || '127.0.0.1',
    port: process.env.MYSQLPORT ? Number(process.env.MYSQLPORT) : 3306,
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'library',
  };
}

function openDb() {
  const config = resolveConnectionConfig();
  const poolOptions = typeof config === 'string' ? config : { ...config, waitForConnections: true, connectionLimit: 10 };
  return mysql.createPool(poolOptions);
}

async function columnExists(pool, table, column) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]
  );
  return rows[0].cnt > 0;
}

async function initSchema(pool) {
  for (const statement of SCHEMA_STATEMENTS) {
    await pool.query(statement);
  }
  for (const migration of MIGRATIONS) {
    const exists = await columnExists(pool, migration.table, migration.column);
    const needsRun = migration.kind === 'add' ? !exists : exists;
    if (needsRun) await pool.query(migration.ddl);
  }
}

async function truncateAll(pool) {
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of TABLES) {
    await pool.query(`TRUNCATE TABLE ${table}`);
  }
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
}

module.exports = { openDb, initSchema, truncateAll, resolveConnectionConfig };
