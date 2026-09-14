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
  `CREATE TABLE IF NOT EXISTS arrays (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    \`rows\` INT NOT NULL,
    cols INT NOT NULL,
    cells JSON NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL
  )`,
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

async function initSchema(pool) {
  for (const statement of SCHEMA_STATEMENTS) {
    await pool.query(statement);
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
