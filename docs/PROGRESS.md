# Fogline progress

This is the shared status board for both builders. Update it after every finished item, not at the end of a session. Newest log entries go on top. Never put secrets here.

## Phase status

| Phase | Status | Owner(s) |
|---|---|---|
| 0 Foundations | Gate running (second pass after fixes) | A |
| 1 Design | Next, after the Phase 0 gate | A (both approve) |
| 2 Data and domain logic | Ready to start (needs the Phase 0 scaffold, now on `main`) | B |
| 3 Profile, map, fog, ride | Not started | A (+B recorder) |
| 4 Plans, last train, live night | Not started | B (+A UI) |
| 5 Daily puzzle and demo mode | Not started | B + A |
| 6 Badges, stats, recap, How it works | Not started | A + B |
| 7 Crawls, weekly plans, grades, squad | Not started | B (+A UI) |
| 8 Extras | Not started | A + B |
| 9 Hardening and release | Not started | A + B |

## Board

### Builder A
- **Now:** Phase 0 gate. Everything Phase 0 needed is on `main`:
  - #1 kickoff docs;
  - #2 scaffold (PHASES items 1, 2, 3, 10);
  - #3 test harness (item 4);
  - #4 database and `/api/health` (item 5);
  - #5 PWA skeleton (item 6);
  - #6 deployment check and branch protection (items 7, 8);
  - #7 manual deployment trigger;
  - #8 Claude Code hooks (item 9).
  The first gate pass failed code-critic and test-auditor (D-043). Their fixes are on `a/phase0-gate-fixes`, and the gate re-runs on them.
- **Waiting on A (human):**
  - Check the Vercel GitHub app at github.com/settings/installations → Vercel. If it shows a request for updated permissions, accept it, so Vercel's `repository_dispatch` events can start the deployment check on their own (D-043).
  - Optional: `scratchpad/mutant` from the test audit can be deleted by hand.
- **Next:** Phase 1 Design, once the Phase 0 gate passes.
- **Blocked:** none.

### Builder B
- **Now:**
- **Next:** Phase 2 data scripts. `main` has the scaffold, Vitest, Drizzle and the CI TimescaleDB container. First read D-013 to D-043 in DECISIONS.md and confirm or object here, especially the PRD and PHASES changes in D-014 to D-033.
- **Blocked:**

## Open questions

- Anonymous profiles (D-005) or a sign-in step? A is weighing it. Decide before Phase 3, which builds F1.
- GoDaddy Registry domain: not registered yet.
- The Tiger trial credit runs 29 days. Check the Tiger billing page for what happens when it ends, and decide before then.
- Does either builder have a mid-range Android phone for the Phase 1 fog frame-rate check? Chrome's CPU throttle doesn't slow the GPU, and the fog runs mostly on the GPU.
- Why doesn't the service worker activate on protected previews (D-043)? Investigate in Phase 9's PWA polish.
- Branch protection doesn't require branches to be up to date before merging. #7 and #8 merged a minute apart without being tested together. Turn on "require up to date" if that keeps happening (A's call: it adds a rebase before each merge).
- **For Builder B** (from A's kickoff review and the Phase 0 gate):
  - `places` stores only the nearest station. A spot 300 m from Park Street but closer to Downtown Crossing never shows up for Park Street. Store every station within 600 m walking.
  - Drizzle runs all pending migrations in one transaction (confirmed in `drizzle-orm/pg-core/dialect.js`, 0.45), and creating a continuous aggregate `WITH DATA` fails inside a transaction. Use `WITH NO DATA` plus a refresh policy.
  - Drizzle decides what's pending by migration timestamp only, not content. Never edit a migration that has been applied anywhere shared; add a new one.
  - Your tables go in `src/server/db/schema.ts`, which is empty for now.
    - `pnpm db:generate` for schema changes.
    - `pnpm db:generate --custom --name=<name>` for hypertable SQL.
    - `MIGRATE_DATABASE_URL=<target> pnpm db:migrate` applies migrations. It never reads `.env` (D-043, TEAM.md git flow).
    - Integration tests run against `DATABASE_URL_TEST`: a TimescaleDB container in CI, or locally `docker run -d --rm -e POSTGRES_PASSWORD=postgres -p 54329:5432 timescale/timescaledb:2.32.1-pg18` with `DATABASE_URL_TEST=postgres://postgres:postgres@localhost:54329/postgres`.
    - Your first table test needs migrations applied to the test database first, for example a Vitest `globalSetup` for the integration project that runs `migrate()`.
  - Unique indexes on hypertables must include `ts`, so a unique constraint on `checkins` can't stop duplicate check-ins.
  - The schema has nowhere to store friend status (F6.1) or "I'm on the train" taps (Closest Call, last trains caught).
  - The recorder samples once a minute, so trains move several stops between samples. "Passed" should cover every stop between two observed stop sequences (F3.3, F3.5). A and B agree on this before Phase 3.
  - "Beyond" has no fixed number of cells, so it shouldn't show a percentage.
  - F10.4 mentions "crawl templates", but nothing defines them.
  - Turning the recorder on as soon as the hypertable migration lands, rather than in Phase 3, gives replay more data.

## Gate results

Copy this table for each phase when its gate runs.

### Phase _n_ gate

| Check | Result | Evidence |
|---|---|---|
| typecheck / lint / unit / e2e / build | | |
| token check | | |
| code-critic | | |
| test-auditor | | |
| design-critic (if UI) | | |
| copy-critic (if copy) | | |
| axe | | |
| docs current | | |
| phase-specific checks | | |

## Log

Format: `YYYY-MM-DD HH:MM ET · Builder A|B · what changed (commits) · tests · next`.

- 2026-11-21 18:01 ET · Builder A · Phase 0 gate, first pass, plus fixes on `a/phase0-gate-fixes` (D-043):
  - Standing checks passed on the final `main` content: typecheck, lint, format, 24 Vitest, 32 e2e, build, and 0 token-grep matches. The fresh clone ran the gate's exact sequence.
  - copy-critic: PASS. It noted Serwist caches visited pages, so the offline copy and D-040 were corrected.
  - code-critic: FAIL. Blocking: the service worker never activates on protected previews (manual run 44958512304); Vercel's dispatch event has never fired, though the docs said it runs every time. Plus 8 SHOULD FIX items.
  - test-auditor: FAIL. The installability and `/api` cache tests couldn't fail.
  - Fixes:
    - full Chromium for installability, with a negative control;
    - the e2e server on the test database, with a mutant `sw.ts` now caught;
    - service workers blocked by default;
    - service-worker specs skipped on protected previews;
    - a manual trigger with a URL allowlist;
    - `db:migrate` needs an explicit target;
    - an offline-visited-page test;
    - the reload test proves the `online` event fired;
    - the 180 px icon checked;
    - browser time zone asserted;
    - the MSW guard uses `.invalid`;
    - the migration count read from the journal;
    - docs (ARCHITECTURE, TESTING, PWA, TEAM, DECISIONS, PROGRESS).
  - #7 (manual deployment trigger) and #8 (hooks) merged.
- 2026-11-21 17:39 ET · Builder A · Phase 0 hooks (PHASES item 9) built on `a/claude-hooks`:
  - Prettier formats each edited file.
  - A once-per-stop reminder fires when code changed without a PROGRESS.md change.
  - The deny rules are kept (D-042).
  - Verified:
    - Formatter: given a badly formatted file it rewrote it, and it left `docs/` untouched. In this session, an Edit to a probe file came back formatted.
    - Reminder, in a throwaway worktree of `main`: it blocks when code changed without PROGRESS, stays quiet when PROGRESS changed too, stays quiet on a clean tree, and stays quiet when `stop_hook_active` is set. Five clean runs each after removing `process.exit`.
    - `/phase-start` and the four critics load (used this session).
  - code-critic: PASS. The SHOULD FIX item is fixed: Prettier failures no longer throw. Nits fixed: real-path check, non-ASCII paths, accurate wording, fork-review warning, and hook scripts now linted. Edge cases re-tested.
  - PR #6 merged. PR #7 opened: a manual trigger for the deployment check, because Vercel's `repository_dispatch` event didn't arrive for the first production deployment.
- 2026-11-21 17:36 ET · Builder A · Phase 0 GitHub and Vercel (PHASES items 7, 8) built on `a/ci-vercel`:
  - Deployment workflow on Vercel's `repository_dispatch` event, with a bypass cookie from a global setup instead of a per-request secret header. No uploaded report, fork commits skipped, 20-minute timeout, and a cancelled run reports an error instead of leaving "pending".
  - Read-only specs only (`test:e2e:deployment`).
  - Branch protection on `main` turned on (A approved).
  - PR #5 (PWA) merged.
  - Tests: local e2e 32 pass. In remote mode against production, smoke and `/api/health` pass (8), and `/api/health` returns `{"db":true,"timescaledb":true}` from the deployed function.
  - Not yet run: the bypass-cookie path against a protected preview. It runs for the first time on the PR after this merges.
  - code-critic: first pass FAIL. Two BLOCKING items fixed: the secret could leak through the report artifact, and the docs claimed protection that wasn't on yet. SHOULD FIX items fixed: forks, cross-origin header, stuck pending status, full suite on production, docs. Nits: URL scheme check, empty base URL, health check run once.
- 2026-11-21 17:20 ET · Builder A · Phase 0 PWA item (PHASES item 6) built on `a/pwa`:
  - `app/manifest.ts`, the viewport (`viewport-fit=cover`, light and dark `theme-color`) and iOS metadata.
  - Placeholder icons (192, 512 for any and maskable, apple-touch 180).
  - A Serwist service worker that precaches static chunks, the preloaded fonts, the icons and `/offline`, falls back to `/offline` for documents, keeps `/api/*` network-only, and never reloads a page on its own.
  - Offline, error, global-error (Next 16 `retry`) and 404 pages, with copy in `src/copy/system.ts`. The offline page's "Try again" reloads the same address.
  - Tests: 22 Vitest and 32 e2e pass. 7 service-worker tests are skipped on WebKit because Playwright WebKit has no service worker support. Chromium covers:
    - manifest fields and icons at their stated sizes;
    - iOS tags;
    - axe on `/offline` and the 404 page;
    - 44 px actions;
    - worker control;
    - offline fallback plus a retry of the same address;
    - no reload on reconnect (the test fails when the reload is turned back on);
    - `/api` never served from cache;
    - fonts and icons precached;
    - no installability errors.
  - Found and fixed: duplicate `serwist` copies silently dropped the offline fallback (D-040).
  - code-critic: first pass FAIL. BLOCKING fixed: the reload on reconnect. All SHOULD FIX items fixed: navigation caching, `/api` caching, revision, fonts, copy, and axe on the 404 page.
  - copy-critic: first pass FAIL on the offline and error wording. Rewritten, then re-reviewed.
  - Seen at 390×844: `/offline` and the 404 page. Dark mode is unchanged until Phase 1.
  - PR #4 (database) merged at 17:18 ET.
- 2026-11-21 16:08 ET · Builder A · Phase 0 database item (PHASES item 5) built on `a/db`:
  - Drizzle 0.45 plus the `postgres` 4.1 client (`prepare: false`, at most 3 connections, 10 s connect timeout).
  - First migration `drizzle/0000_timescaledb.sql` (`create extension if not exists timescaledb`, no tables).
  - `/api/health` returns `{ db, timescaledb }` with `no-store`, and 503 when the database fails.
  - `db:generate` and `db:migrate` scripts. A TimescaleDB 2.32.1 on Postgres 18 service in CI.
  - Tests: integration tests ran against a local TimescaleDB container.
    - Migrations on a fresh database from `template0` install TimescaleDB and record one row, even when run twice.
    - Health returns 200; 503 without TimescaleDB; 503 when unreachable; and 503 when `DATABASE_URL` is unset.
    - The read-only check against `fogline-db` passed before D-038 and now needs `LIVE_DATABASE_URL`.
  - code-critic: PASS. All 5 SHOULD FIX items fixed (D-038, D-039, the migration and health tests), plus the nits.
  - `/api/health` in the dev server returns `{"db":true,"timescaledb":true}` from `fogline-db`.
  - PR #3 (test harness) merged.
- 2026-11-21 15:49 ET · Builder A · Phase 0 test harness (PHASES item 4) built on `a/test-harness`:
  - Vitest 5 projects for unit, component and integration, in `TZ=America/New_York`, with 90% line coverage required on `src/lib`.
  - MSW 3 blocks and records every unmocked request and fails the test that made it. MSW 3's own "error" strategy lets `.json` URLs through, and every MBTA feed URL ends in `.json`.
  - Playwright projects: desktop-chrome 1440×900, iphone (WebKit) and pixel, both at 390×844. The server runs in UTC, like Vercel. axe runs, plus a horizontal-scroll check.
  - CI runs the tests and Playwright, and uploads reports on any run that isn't cancelled.
  - Tests: 14 Vitest and 6 e2e pass. `src/lib` line coverage is 96%.
  - code-critic: FAIL on the first pass (unmocked requests became a silent 500). Fixed and proven with a throwaway failing test.
  - Also: PR #2 merged after `vercel.json` set the framework to Next.js. The Vercel project, created when the repo held only docs, had looked for a static `public` folder.
- 2026-11-21 15:33 ET · Builder A · Phase 0 scaffold (PHASES items 1, 2, 3, 10) built on `a/scaffold`:
  - Next 16.4.6 (Turbopack, Cache Components off), React 19.3, Tailwind 4.3.
  - Prettier and the ESLint flat config (rules for `no-console`, `no-debugger`, `eqeqeq` and `no-explicit-any`), plus `data:*` scripts that exit 1.
  - shadcn (Radix base): Button, Drawer, Sonner, Input, Tabs.
  - `src/lib/log.ts` (JSON lines, error causes), `src/lib/flags.ts` (`NEXT_PUBLIC_FLAGS`), `src/copy/`, the home stub, and the first CI workflow (format, typecheck, lint, build).
  - Checks: `pnpm format:check`, `typecheck`, `lint` and `build` pass. The token grep is clean outside `src/components/ui` (D-037). code-critic PASS (both SHOULD FIX items fixed) and copy-critic PASS (both suggestions applied). Home stub seen at 390×844.
  - Not done: one theme only, because dark mode is class-based until Phase 1. No tests yet; the harness is item 2.
  - Next: PR, CI, Vercel preview, merge, then `a/test-harness`.
- 2026-11-21 15:17 ET · Builder A · Kickoff review. A's answers are logged as D-013 to D-035. Updated PRD (F1.1–F1.7, F4.8–F4.9, F5.8, F6.2, F6.4, F7.1, F10.6, F12.1, F16.1–F16.2, glossary), DESIGN, ARCHITECTURE, DATA, PHASES, TESTING, PWA, COPY, TEAM (A = Achyut21, B = Anand283) and WALKTHROUGH (judge path) on branch `a/kickoff-docs`. No code. Next: A approves the Phase 0 plan.
- 2026-11-21 · setup · Repo docs, Claude Code agents, commands and settings created. Tiger Cloud service `fogline-db` exists (credentials in each builder's local `.env` only). Vercel Pro and the Gemini key are ready. GitHub CLI logged in as Achyut21. Next: Phase 0.
