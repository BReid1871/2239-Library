const { openDb, initSchema, truncateAll } = require('../../server/db');

if (!process.env.MYSQL_URL && !process.env.DATABASE_URL && !process.env.MYSQLDATABASE) {
  process.env.MYSQLDATABASE = 'library_test';
}

const pool = openDb();
let readyPromise = null;

function ensureReady() {
  if (!readyPromise) readyPromise = initSchema(pool);
  return readyPromise;
}

async function resetDb() {
  await ensureReady();
  await truncateAll(pool);
}

module.exports = { pool, resetDb };
