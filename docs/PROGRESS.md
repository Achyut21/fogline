# Fogline progress

This is the shared status board for both builders. Update it after every finished item, not at the end of a session. Newest log entries go on top. Never put secrets here.

## Phase status

| Phase | Status | Owner(s) |
|---|---|---|
| 0 Foundations | In progress (plan waiting for A's yes) | A |
| 1 Design | Not started | A (both approve) |
| 2 Data and domain logic | Not started | B |
| 3 Profile, map, fog, ride | Not started | A (+B recorder) |
| 4 Plans, last train, live night | Not started | B (+A UI) |
| 5 Daily puzzle and demo mode | Not started | B + A |
| 6 Badges, stats, recap, How it works | Not started | A + B |
| 7 Crawls, weekly plans, grades, squad | Not started | B (+A UI) |
| 8 Extras | Not started | A + B |
| 9 Hardening and release | Not started | A + B |

## Board

### Builder A
- **Now:** Phase 0 Foundations. The plan below is waiting for A's yes. Builder B reviews each PR.
  Phase 0 has no PRD criteria, so its tests are named after the gate check they prove. Every item ends with code-critic before each commit, copy-critic on new strings, a look in the Browser pane at 390×844 in both color schemes and with reduced motion, a PR, and a squash-merge after CI passes. After item 6, `/phase-gate 0`.
  1. **Scaffold, tooling, shadcn, lib helpers (items 1, 2, 3, 10) · branch `a/scaffold` · merged (#2).** Actual: shadcn uses the Radix base with the `nova` preset (`new-york` is gone from the CLI). The test scripts arrive with item 2. D-036 and D-037 record the choices.
     - Run `pnpm create next-app@latest .scaffold` with TypeScript, Tailwind, ESLint, App Router, `--src-dir`, the `@/*` alias and pnpm. Move it into the repo root without touching `docs/`, `.claude/`, `CLAUDE.md`, `MASTER_PROMPT.md` or `.env.example`, merge `.gitignore`, and delete `.scaffold/`.
     - Turn Cache Components off. create-next-app 16.4 enables it by default, and no doc plans for it. Log this as a decision.
     - Add Prettier and the ESLint flat config. Next 16 removed `next lint`, so `pnpm lint` runs `eslint .`.
     - Pin `.nvmrc` to 24 and set `packageManager` to pnpm 10.33.
     - Add the scripts `dev`, `build`, `start`, `typecheck`, `lint`, `format`, `test`, `test:watch`, `test:e2e` and `test:e2e:ui`, plus `data:*` scripts that exit 1 with a message that they arrive in Phase 2.
     - Run `shadcn init` (new-york style, Tailwind v4 CSS variables) and add Button, Drawer, Sonner, Input and Tabs. They stay unstyled until Phase 1.
     - Add `src/lib/log.ts` (a server logger that adds context), `src/lib/flags.ts` (env-driven feature flags), `src/copy/index.ts`, and a home stub page whose strings live in `src/copy/`.
     - Add the first CI workflow (typecheck, lint, build) on PRs and pushes to `main`, so every later PR runs CI.
  2. **Test harness (item 4) · `a/test-harness` · merged (#3).** Change from the approved plan: the integration smoke test and the CI TimescaleDB container move to item 3, because they need the Postgres driver, and an integration test that only skips asserts nothing. The phone projects run at 390×844.
     - Set up Vitest with jsdom, React Testing Library and MSW. Pin `TZ=America/New_York` and require 90% line coverage on `src/lib/**`.
     - Add Playwright projects `desktop-chrome`, `iphone` (WebKit, iPhone 15) and `pixel` (Chromium, Pixel 7), with `timezoneId` pinned and `@axe-core/playwright`.
     - Smoke tests:
       - unit: `log` and `flags`;
       - component: the home stub's heading, found by role;
       - integration: skips without `DATABASE_URL_TEST`;
       - e2e: the home page at 390×844 in every project, with zero serious or critical axe violations.
     - CI gains the unit, component and integration tests (against a TimescaleDB service container) and Playwright on Chromium and WebKit, uploading reports and traces.
  3. **Database (item 5) · `a/db` · merged (#4).** Actual: `src/server/db/schema.ts` exists but is empty, because drizzle-kit won't run without a schema file; B adds the tables there. CI runs a `timescale/timescaledb:2.32.1-pg18` service, the same versions as `fogline-db` (Postgres 18.7, TimescaleDB 2.32.1).
     - Add a Drizzle client in `src/server/db/client.ts` using the `postgres` driver for Tiger's pooled string (`prepare: false`, small pool), plus `drizzle.config.ts`.
     - Create the first migration with `drizzle-kit generate --custom`. It creates no tables, because B owns the schema in Phase 2. It only runs `create extension if not exists timescaledb`.
     - Wrap the TimescaleDB check in a read-only test that skips without `DATABASE_URL`, and add `/api/health` returning `{ db, timescaledb }` booleans.
     - Verify: run the check against `fogline-db` locally, and the migration against a local TimescaleDB container.
  4. **PWA skeleton (item 6) · `a/pwa` · built, in review.** D-040 records the choices: Serwist through Turbopack, no reload on reconnect, network-only `/api/*`, update toast deferred to Phase 9, a `browserslist` override, shortcuts and screenshots deferred, 44 px `lg` buttons.
     - Add `app/manifest.ts` following PWA.md, the `viewport` export (`viewport-fit=cover`, light and dark `theme-color`) and `appleWebApp` metadata. Shortcuts and screenshots arrive with their routes, because `/ride`, `/daily` and `/plans/new` don't exist yet.
     - Generate placeholder icons (192, 512, maskable 512, apple-touch 180) with a `sharp` script. ImageMagick isn't installed on this machine.
     - Use Serwist for the service worker if its Turbopack setup works with Next 16.4 (check its `next-turbo-basic` example first). Otherwise, write the worker by hand following the Next.js PWA guide. It precaches the shell and the offline page.
     - Add `app/offline/page.tsx`, plus a root `error.tsx` and `not-found.tsx`, with their copy in `src/copy/` (code-critic found Next's default English error text outside `src/copy/`).
     - Tests:
       - manifest e2e: fields are present and the icons resolve;
       - the service worker registers in a production build;
       - offline navigation shows the offline page;
       - installability: no errors from `Page.getInstallabilityErrors` on Chromium.
  5. **GitHub and Vercel (items 7, 8) · `a/ci-vercel` · built, in review.** As built (D-041):
     - CI runs on PRs and pushes to `main`, with a pnpm cache and every suite. `vercel.json` sets `iad1` and the framework, and has no crons (merged in #2–#4).
     - Vercel sends no GitHub Deployments, so `.github/workflows/deployment.yml` runs on its `vercel.deployment.success` `repository_dispatch` event. It runs only the read-only specs (`pnpm test:e2e:deployment`: smoke, PWA, `/api/health`) and posts an `e2e on <environment>` status.
     - A global setup trades the bypass secret for Vercel's bypass cookie and masks it. No report is uploaded. Fork commits are skipped. The workflow takes effect once it's on `main`.
     - Branch protection on `main` (A approved 2026-11-21): PR required, the `check` and Vercel checks required, linear history, no force-push or deletion, admins can override.
  6. **Claude Code hooks (item 9) · `a/claude-hooks` · built, in review.** As built (D-042): two Node scripts in `.claude/hooks/`, wired up in `.claude/settings.json`.
     - Use the `update-config` skill to add two hooks: Prettier formats each file after an Edit or Write, and at Stop a reminder fires when code changed without a `docs/PROGRESS.md` change.
     - Keep the `.env` deny rules. Confirm `.claude/agents` and `.claude/commands` load.
     - Trigger each hook once to prove it works.
- **Waiting on A (human):**
  - Done 2026-11-21: Vercel project `fogline` connected to the repo (production at `fogline-mu.vercel.app`), env vars added, bypass secret stored as `VERCEL_AUTOMATION_BYPASS_SECRET` in GitHub.
  - In Vercel, set `NEXT_PUBLIC_APP_URL` to `https://fogline-mu.vercel.app` for Production, remove it from Preview, and mark the secrets Sensitive.
  - Done 2026-11-21: A edited `.env.example` (`SESSION_SECRET`, `NEXT_PUBLIC_FLAGS`, the `DATABASE_URL_TEST` comment). Claude can't read the file, so A commits it.
  - Done 2026-11-21: `NEXT_PUBLIC_APP_URL` (Production) and `NEXT_PUBLIC_MAP_STYLE_URL` (Production, Preview) recreated as Config through the Vercel CLI.
- **Next:** Phase 1 Design.
- **Blocked:** none yet. Item 5 needs the Vercel steps above.

### Builder B
- **Now:**
- **Next:** Phase 2 data scripts, once `a/scaffold`, `a/test-harness` and `a/db` merge (they bring `package.json`, Vitest and the Drizzle client). It can overlap Phase 1. First read D-013 to D-035 in DECISIONS.md and confirm or object here.
- **Blocked:**

## Open questions

- Anonymous profiles (D-005) or a sign-in step? A is weighing it. Decide before Phase 3, which builds F1.
- GoDaddy Registry domain: not registered yet.
- The Tiger trial credit runs 29 days. Check the Tiger billing page for what happens when it ends, and decide before then.
- Does either builder have a mid-range Android phone for the Phase 1 fog frame-rate check? Chrome's CPU throttle doesn't slow the GPU, and the fog runs mostly on the GPU.
- B: confirm the PRD and PHASES changes in D-014 to D-033, or object here.
- **For Builder B** (from A's kickoff review):
  - `places` stores only the nearest station. A spot 300 m from Park Street but closer to Downtown Crossing never shows up for Park Street. Store every station within 600 m walking.
  - Drizzle runs all pending migrations in one transaction (confirmed in `drizzle-orm/pg-core/dialect.js`, 0.45), and creating a continuous aggregate `WITH DATA` fails inside a transaction. Use `WITH NO DATA` plus a refresh policy.
  - Your tables go in `src/server/db/schema.ts`, which is empty for now. Use `pnpm db:generate` for schema changes and `pnpm db:generate --custom --name=<name>` for hypertable SQL. Integration tests run against `DATABASE_URL_TEST`: a TimescaleDB container in CI, or locally `docker run -d --rm -e POSTGRES_PASSWORD=postgres -p 54329:5432 timescale/timescaledb:2.32.1-pg18` with `DATABASE_URL_TEST=postgres://postgres:postgres@localhost:54329/postgres`.
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
