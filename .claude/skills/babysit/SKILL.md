---
name: babysit
description: Repo-specific conventions for driving this repo's PRs to green.
---

# Babysitting PRs

This is a Node/Express + SQLite app. `npm run lint|test:unit|test:integration|test:e2e`
are wrapped by `ci/*.sh` and invoked via the `Makefile`
(`make lint|test-unit|test-integration|test-e2e|ci`), which is what
`.github/workflows/ci.yml` runs. Treat a red check by reproducing it locally
with the matching `make` target, root-causing it in `server/`, `public/`, or
`tests/`, fixing it, confirming with `make ci`, then pushing.

## Conventions
- **Merge conflicts**: merge the base branch in (`git merge`), never rebase
  or force-push. Regenerate `package-lock.json` with `npm install` (never
  hand-edit it) if it conflicts.
- **The SQLite file** (`data/*.db`) is gitignored and created fresh by
  `server/db.js` on startup — it is never checked in and never needs
  regenerating by hand.
- **Autofix posture**: fix small, obvious CI failures (a wrong assertion, a
  missing await, an off-by-one in a route handler, a lint violation)
  autonomously, including pushing, without asking first. A failure that
  implies a real design question (e.g. the DB schema needs a column that
  doesn't exist) is a design change — propose it instead of pushing it.
- **e2e tests**: run against a real server + a temp SQLite file
  (`playwright.config.js`'s `webServer`), not a mock — a red e2e check is a
  real regression, not infra flakiness, unless it fails to start at all
  (port in use, missing dependency).
