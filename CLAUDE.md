# 2239 Library

A website for tracking rituals, notes, custom components, and arrays in a
homebrew magic system — originally a single-file HTML app persisting to
browser `localStorage`, now a proper Node/Express + MySQL website. Deployed
on Railway, with a Railway-provisioned MySQL database.

Built using the same agent-driven CI/CD loop as
[CICaDa](https://github.com/BReid1871/CICaDa): an agent plans, implements,
and opens a PR; CI checks it; an agent drives it to green; a human does
final review.

## The loop

1. A task is handed to a Claude Code session.
2. The agent explores, drafts a plan, and gets it approved before writing
   any code. The plan should call out the change's non-functional
   implications, not just functional ones.
3. The agent implements the change and opens a PR — always, without
   waiting to be asked — using the format in
   `.github/pull_request_template.md` — Summary, Non-functional
   considerations, Test plan — filling in every section. Never skip the
   template. If a PR already exists for the same work (e.g. a follow-up
   fix or review comment), push to that branch instead of opening a new
   one.
4. `.github/workflows/ci.yml` runs four checks on the PR: `lint`, `unit`,
   `integration`, `e2e`.
5. A Claude Code session subscribes to the PR's activity and watches CI.
   When a check goes red, it root-causes and fixes it, pushing until every
   check is green. `.claude/skills/babysit/SKILL.md` has the repo-specific
   rules for that loop.
6. A human does the final review — requesting changes or merging.

## Non-functional considerations

Every plan and PR addresses these alongside functional correctness:

- **Security**: new inputs, auth/permission checks, secrets handling, and
  injection risk (SQL/command/XSS) — flag anything touching the OWASP Top
  10.
- **Accessibility**: for any UI change — semantic markup, keyboard
  navigation, color contrast, ARIA labels.
- **Performance**: new queries, loops, or payloads that scale badly (N+1
  queries, unbounded loops, large payloads).
- **Observability**: logging/metrics for new failure paths, especially
  anything needed to debug a future CI failure.
- **Backward compatibility**: API/schema/config changes that break
  existing callers or need a migration.
- **Test coverage**: new branches or edge cases actually covered, not
  just the happy path.

If none apply to a change, say so explicitly in the PR rather than
omitting the section.

## Running locally

Needs a reachable MySQL server. Copy `.env.example` to `.env` (or export
the same vars) and point it at a local MySQL, or at a Railway database if
you have one — see `.env.example` for `MYSQL_URL` vs. the discrete
`MYSQL*` vars.

```
npm install
npm start            # serves the app on http://localhost:3000
make ci               # run everything: lint, unit, integration, e2e
```

`make test-integration` and `make test-e2e` also need a reachable MySQL —
they default to `library_test` on localhost if no env vars are set.

## Layout

- `server/index.js` — Express app: serves `public/` as static files and
  mounts the JSON API under `/api`.
- `server/db.js` — MySQL connection pool (`mysql2/promise`), schema DDL
  (`rituals`, `notes`, `custom_components`, `arrays`), and a
  `truncateAll` helper used by tests to reset state between runs.
- `server/routes/` — one Express router per resource.
- `server/lib/rituals.js` — shared duplicate-ritual check.
- `public/index.html` — the frontend (single-page app, no build step);
  talks to the API via `fetch()`, no client-side storage.
- `public/reference-data.js` — static app config (runes, tier rules,
  built-in components) shared between server and browser — not user data,
  so it isn't in the DB.
- `public/hex.js` — hex-grid math (axial coordinates, distance, footprint,
  pixel layout, line offset/shorten for drawing reach arrows) shared
  between `arrays.html`'s hex board, the `server/routes/arrays.js`/`data.js`
  board-radius guard rail, and its own unit tests. Ritual size is a
  property of an array *placement* (`{ id, ritualId, q, r, size,
  isEffector, isAntiEffector }` in `arrays.placements`), not of the ritual
  itself — the same ritual can be placed at different sizes. `isEffector`
  and `isAntiEffector` (both default false, mutually exclusive) mark which
  placements originate directional reach lines to other rituals within
  range — most placements just sit there and can be reached, but don't
  reach out themselves. An effector *activates* what it reaches; an
  anti-effector *deactivates* it.
- `public/simulation.js` — shared with `hex.js`'s UMD pattern: computes the
  reach graph (`computeReaches`, generalizing effector/anti-effector
  reaches with a `kind`) and simulates what happens when a person triggers
  one placement (`simulate`), propagating activate/deactivate effects
  pass-by-pass until nothing changes. `rituals.triggerable` (default true)
  gates who can *start* a simulation — a non-triggerable ritual can still
  be activated by an effector, just not directly by a person — so
  `arrays.html`'s Simulations panel only offers one simulation per
  triggerable placement in the array. Within a pass, all of a target's
  active-sourced reaches fire at once, grouped by distance closest-first;
  distance only matters where two *opposing* kinds actually conflict — a
  farther group of the opposite kind overrides a closer one's decision
  entirely (it's superseded, not reinforced), and a group that mixes both
  kinds at the exact same distance cancels out and changes nothing,
  leaving whatever the closer groups had already decided. A farther group
  of the *same* kind as the current decision isn't a conflict, so it
  doesn't override — it joins it, credited alongside every other same-kind
  source that already decided this (e.g. two different anti-effectors at
  two different distances both deactivating one target both show up as
  having done so, in the Simulations panel's per-pass log).
- `tests/helpers/testDb.js` — the shared MySQL pool integration tests use,
  reset with `TRUNCATE` in each test's `beforeEach` (see
  `vitest.config.js`'s `fileParallelism: false` — test files run
  sequentially since they share one database).
- `tests/unit`, `tests/integration`, `tests/e2e` — run via `ci/*.sh` /
  `make test-unit|test-integration|test-e2e`.
