const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');

function resolveDbPath() {
  return process.env.LIBRARY_DB_PATH || path.join(DATA_DIR, 'library.db');
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS rituals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  primary_rune TEXT NOT NULL,
  subs TEXT NOT NULL DEFAULT '[]',
  tier TEXT NOT NULL,
  effect TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_components (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rune TEXT NOT NULL,
  tier TEXT NOT NULL,
  desc TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS arrays (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rows INTEGER NOT NULL,
  cols INTEGER NOT NULL,
  cells TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

function openDb() {
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  return db;
}

module.exports = { openDb, resolveDbPath };
