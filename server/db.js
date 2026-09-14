const mysql = require('mysql2/promise');

const TABLES = ['rituals', 'notes', 'custom_components', 'arrays'];

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS rituals (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    purpose VARCHAR(64) NOT NULL,
    primary_rune VARCHAR(64) NOT NULL,
    subs JSON NOT NULL,
    tier VARCHAR(16) NOT NULL,
    effect TEXT NOT NULL,
    created_at VARCHAR(32) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS notes (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS custom_components (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rune VARCHAR(64) NOT NULL,
    tier VARCHAR(16) NOT NULL,
    \`desc\` TEXT NOT NULL
  )`,
  // Hex-grid board: `radius` hex-rings out from the center, `placements` is
  // a JSON list of { id, ritualId, q, r } — see public/hex.js. Arrays used
  // to be a rectangular rows/cols/cells grid; the migrations below (see
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
];

// Real MySQL (unlike MariaDB) never supported ADD/DROP COLUMN ... IF
// [NOT] EXISTS, so these are applied conditionally in JS instead, each
// checked against information_schema first.
const MIGRATIONS = [
  // How many hexes a ritual occupies/reaches in an array — see
  // public/hex.js. Added after the initial rituals table.
  { table: 'rituals', column: 'size', kind: 'add', ddl: 'ALTER TABLE rituals ADD COLUMN size INT NOT NULL DEFAULT 1' },
  { table: 'arrays', column: 'radius', kind: 'add', ddl: 'ALTER TABLE arrays ADD COLUMN radius INT NOT NULL DEFAULT 3' },
  { table: 'arrays', column: 'placements', kind: 'add', ddl: "ALTER TABLE arrays ADD COLUMN placements JSON NOT NULL DEFAULT ('[]')" },
  { table: 'arrays', column: 'rows', kind: 'drop', ddl: 'ALTER TABLE arrays DROP COLUMN `rows`' },
  { table: 'arrays', column: 'cols', kind: 'drop', ddl: 'ALTER TABLE arrays DROP COLUMN cols' },
  { table: 'arrays', column: 'cells', kind: 'drop', ddl: 'ALTER TABLE arrays DROP COLUMN cells' },
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
