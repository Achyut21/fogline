# Fogline progress

This is the shared status board for both builders. Update it after every finished item, not at the end of a session. Newest log entries go on top. Never put secrets here.

## Phase status

| Phase | Status | Owner(s) |
|---|---|---|
| 0 Foundations | Passed 2026-11-21 (gate table below) | A |
| 1 Design | Next | A (both approve) |
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
- **Now:** nothing in progress. Phase 0 passed its gate on `main` at `4b7aa05`.
- **Waiting on A (human):**
  - Check the Vercel GitHub app at github.com/settings/installations → Vercel. If it shows a request for updated permissions, accept it, so Vercel's `repository_dispatch` events can start the deployment check on their own (D-043).
  - Optional: delete the local branch `gate/phase-0`; its work reached `main` through #1–#9.
- **Next:** Phase 1 Design. Start it in a fresh session with `/phase-start 1`.
- **Blocked:** none.

### Builder B
- **Now:**
- **Next:** Phase 2 data scripts. `main` has the scaffold, Vitest, Drizzle and the CI TimescaleDB container. First read D-013 to D-044 in DECISIONS.md and confirm or object here, especially the PRD and PHASES changes in D-014 to D-033.
- **Blocked:**

## Open questions

- Anonymous profiles (D-005) or a sign-in step? A is weighing it. Decide before Phase 3, which builds F1.
- GoDaddy Registry domain: not registered yet.
- The Tiger trial credit runs 29 days. Check the Tiger billing page for what happens when it ends, and decide before then.
- Does either builder have a mid-range Android phone for the Phase 1 fog frame-rate check? Chrome's CPU throttle doesn't slow the GPU, and the fog runs mostly on the GPU.
- Why doesn't the service worker activate behind Vercel protection, and why did installability fail on the protected production URL but pass on a protected preview (D-043, D-044)? Investigate in Phase 9's PWA polish.
- If Vercel's `repository_dispatch` event starts arriving, its production runs will target the protected generated URL and fail. The workflow would then have to send production events to `fogline-mu.vercel.app` (D-044). A guard in `tests/e2e/deployment-url.ts` that accepts only that domain for `production` would turn those 14 confusing failures into one clear error (code-critic NIT).
- Branch protection doesn't require branches to be up to date before merging. #7 and #8 merged a minute apart without being tested together. Turn on "require up to date" if that keeps happening (A's call: it adds a rebase before each merge).
- **For Builder B** (from A's kickoff review and the Phase 0 gate):
  - `places` stores only the nearest station. A spot 300 m from Park Street but closer to Downtown Crossing never shows up for Park Street. Store every station within 600 m walking.
  - Drizzle runs all pending migrations in one transaction (confirmed in `drizzle-orm/pg-core/dialect.js`, 0.45), and creating a continuous aggregate `WITH DATA` fails inside a transaction. Use `WITH NO DATA` plus a refresh policy.
  - Drizzle decides what's pending by migration timestamp only, not content. Never edit a migration that has been applied anywhere shared; add a new one.
  - Your tables go in `src/server/db/schema.ts`, which is empty for now.
    - `pnpm db:generate` for schema changes.
    - `pnpm db:generate --custom --name=<name>` for hypertable SQL.
    - `MIGRATE_DATABASE_URL=<target> pnpm db:migrate` applies migrations. Keep that key out of `.env`, because drizzle-kit loads `.env` (D-043, TEAM.md git flow).
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

### Phase 0 gate

Run 2026-11-21 by Builder A on `main` at `4b7aa05`. Second pass, after the D-043 fixes.

| Check | Result | Evidence |
|---|---|---|
| typecheck / lint / unit / e2e / build | PASS | Local, with the test database: typecheck, lint and `format:check` clean. Vitest 24 passed, 1 skipped (the live `fogline-db` check, which needs `LIVE_DATABASE_URL`); `src/lib` line coverage 96.3%. Playwright 39 passed, 12 skipped (Chromium-only specs on WebKit, deployment-only specs). Build compiled. CI on the `main` push (run 44961077823) green. |
| token check | PASS | 8 matches, all in `src/components/ui` (shadcn, D-037). 0 anywhere else. |
| code-critic | PASS | Third pass, on `7ba398f` and the D-044 change, with run logs and `curl` checked. No BLOCKING. The SHOULD FIX (the production alias isn't tied to a commit) is handled by the compare step in TEAM.md's merge checklist. Three of four NITs are fixed on `a/phase0-handoff`. The fourth, a production-domain guard, is under Open questions. Earlier passes: first FAIL, second PASS (D-043). |
| test-auditor | PASS | Second pass, on the D-043 fixes. The installability test now has a negative control that sees `no-manifest`, and the `/api` cache test failed against a mutant `sw.ts`. |
| design-critic (if UI) | N/A | Phase 0 UI is placeholder. design-critic starts in Phase 1 (PHASES.md). |
| copy-critic (if copy) | PASS | Manifest, metadata, offline, error and 404 copy. The offline wording was corrected (D-043). |
| axe | PASS | 0 serious or critical violations on `/`, `/offline` and the 404 page, in desktop-chrome, iphone and pixel: locally, in CI, and on production (run 44961601553). |
| docs current | PASS | This log covers PHASES items 1–10 and both gate passes. DECISIONS has D-036 to D-044. WALKTHROUGH: Phase 0 builds no PRD feature (F1–F16), so no entry is due. DATA: no data source or algorithm yet. |
| Fresh clone | PASS | `gh repo clone` of `main` at `4b7aa05` into an empty folder, then `pnpm install && pnpm exec playwright install && pnpm test && pnpm test:e2e && pnpm build`, exit 0. Vitest 21 passed, 4 skipped (a fresh clone has no test database). Playwright 37 passed, 14 skipped. Build compiled. |
| CI green on a PR; preview at 390×844 on iPhone and Pixel | PASS | PR #9 `check` (run 44960796806) and the Vercel build passed. Deployment check on #9's protected preview (run 44959800680, `bdcf7f6`): 28 passed, including the smoke test at 390×844 on iphone (WebKit) and pixel. The later `7ba398f` changed no app code. |
| Manifest valid; installable in Chrome; manual install | PASS | Manifest fields, icon sizes and `Page.getInstallabilityErrors` with no errors passed on #9's preview (run 44959800680) and on production (run 44961601553). The negative control saw `no-manifest`. A installed it by hand in desktop Chrome from `https://fogline-mu.vercel.app`, and it opened as a standalone "Fogline" window. |
| `/api/health` returns `timescaledb: true` on a deployment | PASS | `deployment.spec.ts` on #9's preview (run 44959800680) and production (run 44961601553): 200, `no-store`, `{ db: true, timescaledb: true }`. |
| Hooks, `/phase-start`, `.env` ignored | PASS | `.claude/settings.json` has the PostToolUse formatter, the Stop reminder (both tested in #8; the formatter ran on every edit this session) and four `.env` deny rules. `/phase-start` ran this session. `git check-ignore` matches `.env` and `.env.local` (`.gitignore` lines 15–16), and `.env.example` is the only tracked env file. |
| Production works at phone size | PASS | Production check on `https://fogline-mu.vercel.app` (run 44961601553, `4b7aa05`): 40 passed, 11 skipped, including the smoke test at 390×844 and all 12 service-worker tests (font precache included). The same deployment's generated URL failed 14 tests behind protection (run 44961127767), so production checks now target the production domain (D-044). |

## Log

Format: `YYYY-MM-DD HH:MM ET · Builder A|B · what changed (commits) · tests · next`.

- 2026-11-21 18:30 ET · Builder A · Phase 0 gate passed. Handoff:
  - **Finished:**
    - Phase 0 PRs on `main`: [#1](https://github.com/Achyut21/fogline/pull/1) `f3351ea`, [#2](https://github.com/Achyut21/fogline/pull/2) `fe8c9ea`, [#3](https://github.com/Achyut21/fogline/pull/3) `d2363ce`, [#4](https://github.com/Achyut21/fogline/pull/4) `f9cba34`, [#5](https://github.com/Achyut21/fogline/pull/5) `17a1f05`, [#6](https://github.com/Achyut21/fogline/pull/6) `859b85d`, [#7](https://github.com/Achyut21/fogline/pull/7) `71825a8`, [#8](https://github.com/Achyut21/fogline/pull/8) `07f3191`, [#9](https://github.com/Achyut21/fogline/pull/9) `4b7aa05` (the gate fixes).
    - Gate second pass: every row PASS (table above).
    - Found at the gate: the production check failed 14 tests on the production deployment's generated URL, because that URL is protected too. On `fogline-mu.vercel.app` it passed 40 and skipped 11. Production checks now target the production domain (D-044; TEAM, TESTING, ARCHITECTURE, PHASES and the workflow's input description updated).
  - **In progress:** none. `a/phase0-handoff` holds this docs change, the workflow input description, and a comment and assertion-message change in `tests/e2e/pwa.spec.ts`.
  - **Blocked:** none.
  - **For Builder B:**
    - Shared files from Phase 0: `package.json` scripts, `vitest.config.ts`, `playwright.config.ts`, `.github/workflows/ci.yml` and `deployment.yml`, `src/server/db/`, `drizzle/`, `drizzle.config.ts`, `.claude/settings.json` (hooks and deny rules).
    - Environment variable names: `DATABASE_URL_TEST`, `LIVE_DATABASE_URL`, `MIGRATE_DATABASE_URL` (command line only, never `.env`), `NEXT_PUBLIC_FLAGS`. `VERCEL_AUTOMATION_BYPASS_SECRET` is a GitHub Actions secret only.
    - Migrations: only `drizzle/0000_timescaledb.sql` (`create extension if not exists timescaledb`, no tables). I haven't confirmed whether it has been applied to `fogline-db`. It's safe to apply.
    - Scripts: `db:generate`, `db:migrate`, `icons`, `format:check`, `test:e2e:deployment`. The `data:*` scripts exit 1 until Phase 2.
    - Hooks load on your next session: Prettier on each edited file, and a Stop reminder when code changed without PROGRESS.md. Turn hooks off before reviewing a fork branch (D-042).
    - Design tokens: none yet. Phase 1 adds them.
  - **Tests:** all pass (gate table). WebKit skips the service-worker and installability specs, because Playwright WebKit has no service workers and no Chrome DevTools Protocol. Nothing is left unwritten for Phase 0.
  - **Next:** Phase 1 Design in a fresh session: `/phase-start 1`.

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
