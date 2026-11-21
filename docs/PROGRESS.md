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
  1. **Scaffold, tooling, shadcn, lib helpers (items 1, 2, 3, 10) · branch `a/scaffold`**
     - Run `pnpm create next-app@latest .scaffold` with TypeScript, Tailwind, ESLint, App Router, `--src-dir`, the `@/*` alias and pnpm. Move it into the repo root without touching `docs/`, `.claude/`, `CLAUDE.md`, `MASTER_PROMPT.md` or `.env.example`, merge `.gitignore`, and delete `.scaffold/`.
     - Turn Cache Components off. create-next-app 16.4 enables it by default, and no doc plans for it. Log this as a decision.
     - Add Prettier and the ESLint flat config. Next 16 removed `next lint`, so `pnpm lint` runs `eslint .`.
     - Pin `.nvmrc` to 24 and set `packageManager` to pnpm 10.33.
     - Add the scripts `dev`, `build`, `start`, `typecheck`, `lint`, `format`, `test`, `test:watch`, `test:e2e` and `test:e2e:ui`, plus `data:*` scripts that exit 1 with a message that they arrive in Phase 2.
     - Run `shadcn init` (new-york style, Tailwind v4 CSS variables) and add Button, Drawer, Sonner, Input and Tabs. They stay unstyled until Phase 1.
     - Add `src/lib/log.ts` (a server logger that adds context), `src/lib/flags.ts` (env-driven feature flags), `src/copy/index.ts`, and a home stub page whose strings live in `src/copy/`.
     - Add the first CI workflow (typecheck, lint, build) on PRs and pushes to `main`, so every later PR runs CI.
  2. **Test harness (item 4) · `a/test-harness`**
     - Set up Vitest with jsdom, React Testing Library and MSW. Pin `TZ=America/New_York` and require 90% line coverage on `src/lib/**`.
     - Add Playwright projects `desktop-chrome`, `iphone` (WebKit, iPhone 15) and `pixel` (Chromium, Pixel 7), with `timezoneId` pinned and `@axe-core/playwright`.
     - Smoke tests:
       - unit: `log` and `flags`;
       - component: the home stub's heading, found by role;
       - integration: skips without `DATABASE_URL_TEST`;
       - e2e: the home page at 390×844 in every project, with zero serious or critical axe violations.
     - CI gains the unit, component and integration tests (against a TimescaleDB service container) and Playwright on Chromium and WebKit, uploading reports and traces.
  3. **Database (item 5) · `a/db`**
     - Add a Drizzle client in `src/server/db/client.ts` using the `postgres` driver for Tiger's pooled string (`prepare: false`, small pool), plus `drizzle.config.ts`.
     - Create the first migration with `drizzle-kit generate --custom`. It creates no tables, because B owns the schema in Phase 2. It only runs `create extension if not exists timescaledb`.
     - Wrap the TimescaleDB check in a read-only test that skips without `DATABASE_URL`, and add `/api/health` returning `{ db, timescaledb }` booleans.
     - Verify: run the check against `fogline-db` locally, and the migration against a local TimescaleDB container.
  4. **PWA skeleton (item 6) · `a/pwa`**
     - Add `app/manifest.ts` following PWA.md, the `viewport` export (`viewport-fit=cover`, light and dark `theme-color`) and `appleWebApp` metadata. Shortcuts and screenshots arrive with their routes, because `/ride`, `/daily` and `/plans/new` don't exist yet.
     - Generate placeholder icons (192, 512, maskable 512, apple-touch 180) with a `sharp` script. ImageMagick isn't installed on this machine.
     - Use Serwist for the service worker if its Turbopack setup works with Next 16.4 (check its `next-turbo-basic` example first). Otherwise, write the worker by hand following the Next.js PWA guide. It precaches the shell and the offline page.
     - Add `app/offline/page.tsx` with its copy in `src/copy/`.
     - Tests:
       - manifest e2e: fields are present and the icons resolve;
       - the service worker registers in a production build;
       - offline navigation shows the offline page;
       - installability: no errors from `Page.getInstallabilityErrors` on Chromium.
  5. **GitHub and Vercel (items 7, 8) · `a/ci-vercel`**
     - Finish CI: PRs and pushes to `main`, pnpm cache, every suite, Playwright reports.
     - Add `vercel.json` with `regions: ["iad1"]` and no crons.
     - Add a CI job on Vercel's `deployment_status` event that runs the smoke, installability and `/api/health` checks against the preview, sending the protection-bypass header.
     - Turn on branch protection for `main`, requiring CI, once A says yes.
  6. **Claude Code hooks (item 9) · `a/claude-hooks`**
     - Use the `update-config` skill to add two hooks: Prettier formats each file after an Edit or Write, and at Stop a reminder fires when code changed without a `docs/PROGRESS.md` change.
     - Keep the `.env` deny rules. Confirm `.claude/agents` and `.claude/commands` load.
     - Trigger each hook once to prove it works.
- **Waiting on A (human):**
  - Connect the GitHub repo to a Vercel project in the dashboard. The Vercel CLI isn't installed, and signing in is yours to do.
  - Add `DATABASE_URL` to Vercel for Production and Preview.
  - Create the Protection Bypass for Automation secret (Vercel → Settings → Deployment Protection), then run `gh secret set VERCEL_AUTOMATION_BYPASS_SECRET` yourself.
  - Add `SESSION_SECRET=` to `.env.example`, and change the `DATABASE_URL_TEST` comment to say it's a throwaway TimescaleDB, never `fogline-db`. Claude can't edit `.env.example`, because the global settings deny reads of `.env.*`.
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
  - Drizzle runs migrations in one transaction (unconfirmed in the docs; check the migrator source), and creating a continuous aggregate `WITH DATA` fails inside a transaction. Use `WITH NO DATA` plus a refresh policy.
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

- 2026-11-21 15:17 ET · Builder A · Kickoff review. A's answers are logged as D-013 to D-035. Updated PRD (F1.1–F1.7, F4.8–F4.9, F5.8, F6.2, F6.4, F7.1, F10.6, F12.1, F16.1–F16.2, glossary), DESIGN, ARCHITECTURE, DATA, PHASES, TESTING, PWA, COPY, TEAM (A = Achyut21, B = Anand283) and WALKTHROUGH (judge path) on branch `a/kickoff-docs`. No code. Next: A approves the Phase 0 plan.
- 2026-11-21 · setup · Repo docs, Claude Code agents, commands and settings created. Tiger Cloud service `fogline-db` exists (credentials in each builder's local `.env` only). Vercel Pro and the Gemini key are ready. GitHub CLI logged in as Achyut21. Next: Phase 0.
