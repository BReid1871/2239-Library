const path = require('path');
const express = require('express');
const { openDb, initSchema } = require('./db');
const { ritualsRouter } = require('./routes/rituals');
const { notesRouter } = require('./routes/notes');
const { componentsRouter } = require('./routes/components');
const { arraysRouter } = require('./routes/arrays');
const { asyncHandler } = require('./lib/asyncHandler');

function createApp(db) {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/health', asyncHandler(async (req, res) => {
    const [rows] = await db.query('SELECT 1 AS ok');
    res.json({ ok: rows[0].ok === 1 });
  }));

  app.use('/api/rituals', ritualsRouter(db));
  app.use('/api/notes', notesRouter(db));
  app.use('/api/components', componentsRouter(db));
  app.use('/api/arrays', arraysRouter(db));

  // Catches errors passed to next() by asyncHandler — without this,
  // Express 4's default error handler still applies, but this gives a
  // consistent JSON error shape and always logs server-side so a bad
  // query shows up in logs instead of just a client-side 500/502.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}

async function start() {
  const db = openDb();
  await initSchema(db);
  const app = createApp(db);
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`2239-library listening on port ${port}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { createApp };
