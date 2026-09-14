const path = require('path');
const express = require('express');
const { openDb, initSchema } = require('./db');
const { ritualsRouter } = require('./routes/rituals');
const { notesRouter } = require('./routes/notes');
const { componentsRouter } = require('./routes/components');
const { arraysRouter } = require('./routes/arrays');
const { dataRouter } = require('./routes/data');

function createApp(db) {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/health', async (req, res) => {
    const [rows] = await db.query('SELECT 1 AS ok');
    res.json({ ok: rows[0].ok === 1 });
  });

  app.use('/api/rituals', ritualsRouter(db));
  app.use('/api/notes', notesRouter(db));
  app.use('/api/components', componentsRouter(db));
  app.use('/api/arrays', arraysRouter(db));
  app.use('/api', dataRouter(db));

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
