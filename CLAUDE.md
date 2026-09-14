# 2239 Library

A website for tracking rituals, notes, custom components, and arrays in a
homebrew magic system — originally a single-file HTML app persisting to
browser `localStorage`, now a proper Node/Express + SQLite website.

Built using the same agent-driven CI/CD loop as
[CICaDa](https://github.com/BReid1871/CICaDa): an agent plans, implements,
and opens a PR; CI checks it; an agent drives it to green; a human does
final review.

## The loop

1. A task is handed to a Claude Code session.
2. The agent explores, drafts a plan, and gets it approved before writing
   any code.
3. The agent implements the change and opens a PR (using
   `.github/pull_request_template.md`).
4. `.github/workflows/ci.yml` runs four checks on the PR: `lint`, `unit`,
   `integration`, `e2e`.
5. A Claude Code session subscribes to the PR's activity and watches CI.
   When a check goes red, it root-causes and fixes it, pushing until every
   check is green. `.claude/skills/babysit/SKILL.md` has the repo-specific
   rules for that loop.
6. A human does the final review — requesting changes or merging.

## Running locally

```
npm install
npm start            # serves the app on http://localhost:3000
make ci               # run everything: lint, unit, integration, e2e
```

## Layout

- `server/index.js` — Express app: serves `public/` as static files and
  mounts the JSON API under `/api`.
- `server/db.js` — SQLite connection (`better-sqlite3`) and schema.
- `public/` — the frontend (single-page app, no build step).
- `data/` — gitignored; holds the SQLite database file, created on
  startup.
- `tests/unit`, `tests/integration`, `tests/e2e` — run via `ci/*.sh` /
  `make test-unit|test-integration|test-e2e`.
