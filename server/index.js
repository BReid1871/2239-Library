const path = require('path');
const express = require('express');
const { openDb } = require('./db');

function createApp() {
  const app = express();
  const db = openDb();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/health', (req, res) => {
    const row = db.prepare('SELECT 1 AS ok').get();
    res.json({ ok: row.ok === 1 });
  });

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
