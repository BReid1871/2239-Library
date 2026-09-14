---
name: babysit
description: Repo-specific conventions for driving this repo's PRs to green.
---

# Babysitting PRs

This is a Node/Express + MySQL app (deployed on Railway). `npm run
lint|test:unit|test:integration|test:e2e` are wrapped by `ci/*.sh` and
invoked via the `Makefile` (`make lint|test-unit|test-integration|test-e2e|ci`),
which is what `.github/workflows/ci.yml` runs. Treat a red check by
reproducing it locally with the matching `make` target, root-causing it in
`server/`, `public/`, or `tests/`, fixing it, confirming with `make ci`,
then pushing.

## Conventions
- **Merge conflicts**: merge the base branch in (`git merge`), never rebase
  or force-push. Regenerate `package-lock.json` with `npm install` (never
  hand-edit it) if it conflicts.
- **MySQL is required for `test-integration` and `test-e2e`**: they need a
  reachable MySQL server (see `.env.example`; CI provides one via a
  `services:` container in `.github/workflows/ci.yml`, `test-unit` doesn't
  need one). If a red integration/e2e check is actually "can't connect to
  MySQL," that's an environment problem to fix (or report), not the PR's
  logic — but confirm that first rather than assuming it.
- **Schema changes** go through the DDL in `server/db.js`
  (`SCHEMA_STATEMENTS`) — there's no separate migration tool. Keep
  `created_at`/`updated_at` as ISO-8601 strings (not `DATETIME`) unless a
  task explicitly asks to change that; the API's date handling and
  string-sort-by-date logic depend on it.
- **Autofix posture**: fix small, obvious CI failures (a wrong assertion, a
  missing await, an off-by-one in a route handler, a lint violation)
  autonomously, including pushing, without asking first. A failure that
  implies a real design question (e.g. the DB schema needs a column that
  doesn't exist) is a design change — propose it instead of pushing it.
- **e2e tests**: run against a real server + the same MySQL test database
  as the integration tests (`playwright.config.js`'s `webServer` +
  `globalSetup`), not a mock — a red e2e check is a real regression, not
  infra flakiness, unless it fails to start at all (port in use, MySQL
  unreachable).
- **Integration tests share one MySQL database**, reset with `TRUNCATE`
  in each test's `beforeEach` (`tests/helpers/testDb.js`). That's why
  `vitest.config.js` sets `fileParallelism: false` — don't remove that
  without also changing the isolation strategy, or test files will race
  on the same tables.
- **Every route handler must be wrapped in `asyncHandler`**
  (`server/lib/asyncHandler.js`) — Express 4 does not catch a rejected
  promise thrown by a bare `async (req, res) => {...}` handler; an
  unhandled rejection just hangs the request until the platform's proxy
  (Railway) times it out as an opaque 502, instead of the clean 500 the
  error-handling middleware in `server/index.js` returns. New route
  handlers need `asyncHandler(...)` too, not just the existing ones.
- **`server/db.js`'s `CREATE TABLE IF NOT EXISTS` never alters an
  existing table.** If the live database's schema has drifted from
  `SCHEMA_STATEMENTS` (e.g. someone hand-edited a column directly on
  Railway), deploying new code won't fix it — the mismatch has to be
  corrected with an explicit `ALTER TABLE`/`CHANGE COLUMN` against the
  live database, not just a code change.
