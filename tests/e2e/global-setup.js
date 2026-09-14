module.exports = async function globalSetup() {
  process.env.MYSQLDATABASE = process.env.MYSQLDATABASE || 'library_test';
  const { openDb, initSchema, truncateAll } = require('../../server/db');
  const pool = openDb();
  await initSchema(pool);
  await truncateAll(pool);
  await pool.end();
};
