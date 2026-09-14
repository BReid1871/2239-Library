const path = require('path');
const express = require('express');
const { openDb } = require('./db');
const { ritualsRouter } = require('./routes/rituals');
const { notesRouter } = require('./routes/notes');
const { componentsRouter } = require('./routes/components');
const { arraysRouter } = require('./routes/arrays');
const { dataRouter } = require('./routes/data');

function createApp() {
  const app = express();
  const db = openDb();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/health', (req, res) => {
    const row = db.prepare('SELECT 1 AS ok').get();
    res.json({ ok: row.ok === 1 });
  });

  app.use('/api/rituals', ritualsRouter(db));
  app.use('/api/notes', notesRouter(db));
  app.use('/api/components', componentsRouter(db));
  app.use('/api/arrays', arraysRouter(db));
  app.use('/api', dataRouter(db));

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`2239-library listening on port ${port}`);
  });
}

module.exports = { createApp };
