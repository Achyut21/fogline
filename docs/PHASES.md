# Fogline phases

Phases run in order, and a phase ends only when every check in its gate passes (`/phase-gate <n>`). There are no dates in this plan. Quality gates decide when a phase is done. Never cut scope or skip a gate to move faster. If a phase grows too big, split it here and log the split in `docs/DECISIONS.md`.

Builder letters and ownership are in `docs/TEAM.md`. Items marked **A** or **B** can run in parallel across builders. Phase 2 (data) can start while Phase 1 (design) is underway, because it has no UI.

## Standing checks (part of every gate)

- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` (all Playwright projects) and `pnpm build` pass.
- **Token check:** the "finds no raw colors, pixels, arbitrary values, palette colors or off-scale spacing in src" test in `tests/unit/design-tokens.test.ts` passes, so it runs with every `pnpm test` and CI run. It scans every `.ts`, `.tsx` and `.css` file under `src/` except the exemptions recorded in DECISIONS.md (D-054). It replaced the Phase 0 grep in Phase 1.
- `code-critic` and `test-auditor` verdicts are PASS. `design-critic` and `copy-critic` are PASS when UI or copy changed.
- axe finds zero serious or critical violations on every route touched.
- `docs/PROGRESS.md`, `docs/WALKTHROUGH.md` and `docs/DECISIONS.md` are current.
- CI is green on `main`, and the production deployment works on a phone-sized viewport.

---

## Phase 0: Foundations (A leads, B reviews)

**Read:** `ARCHITECTURE.md`, `TESTING.md`, `PWA.md`, `TEAM.md`.

Phase 0 UI is placeholder (a home stub and the offline page). `design-critic` starts in Phase 1, when there's a canvas to compare against. `copy-critic` still reviews Phase 0 strings (manifest, metadata, offline page).

**Items**
1. **Scaffold** Next.js (App Router, TypeScript strict, Tailwind, ESLint, `src/` directory, pnpm).
   - `create-next-app` refuses a folder that already has files. Scaffold into a temporary folder (for example `pnpm create next-app@latest .scaffold`), move its contents into the repo root without overwriting `docs/`, `.claude/`, `CLAUDE.md`, `MASTER_PROMPT.md`, `.gitignore` or `.env.example` (merge `.gitignore`), then delete the temporary folder.
2. **Tooling:** Prettier, the ESLint flat config, and `package.json` scripts: `dev`, `build`, `start`, `typecheck`, `lint`, `format`, `test`, `test:watch`, `test:e2e`, `test:e2e:ui`, and `data:*` placeholders that fail clearly until Phase 2.
3. **shadcn/ui** initialized. Add Button, Drawer (vaul), Sonner, Input, Tabs only for now. They get restyled in Phase 1.
4. **Test harness:**
   - Vitest with React Testing Library and MSW, with `TZ=America/New_York` pinned.
   - Playwright projects: `desktop-chrome`, `iphone` (WebKit, `iPhone 15`), `pixel` (Chromium, `Pixel 7`), plus `@axe-core/playwright`.
   - One smoke test per layer.
5. **Database:**
   - Drizzle with the `postgres` driver against `DATABASE_URL` (Tiger's pooled string).
   - A first migration, plus a check query `select extversion from pg_extension where extname = 'timescaledb'`, wrapped as a read-only test that is skipped when `LIVE_DATABASE_URL` is absent (D-038).
   - `/api/health` runs the same check and returns only `{ db, timescaledb }` booleans, so the gate can run it from a deployment.
   - Integration tests that write use `DATABASE_URL_TEST`: a TimescaleDB container in CI, never `fogline-db`.
6. **PWA skeleton:** `app/manifest.ts`, placeholder icons (192, 512, maskable 512, apple-touch 180), a service worker setup (Serwist or a hand-written worker, see `ARCHITECTURE.md`), and an offline page.
7. **GitHub:**
   - The public repo `Achyut21/fogline` with `main` as the default branch.
   - A GitHub Actions workflow on pull requests and pushes to `main`: install, typecheck, lint, unit tests, build, and Playwright (Chromium and WebKit) with reports uploaded.
8. **Vercel:** link the project, add env vars for Production and Preview, and add a `vercel.json` that sets the function region to `iad1` and has no crons yet (`vercel.json` can't disable an entry, so each cron arrives with its route, starting in Phase 3). Set up Protection Bypass for Automation so CI can test previews. Confirm preview deployments work on PRs.
9. **Claude Code project setup:**
   - Use the `update-config` skill to add hooks: format changed files after edits, and a reminder when a session stops with code changes but no `docs/PROGRESS.md` change.
   - Confirm `.claude/agents` and `.claude/commands` load (`/phase-start` shows up).
   - Keep `.claude/settings.json` deny rules for `.env` files.
10. **`src/lib/log.ts`, `src/lib/flags.ts`** (env-driven feature flags for unfinished features), and **`src/copy/`** with an index.

**Gate**
- A fresh clone runs `pnpm install && pnpm exec playwright install && pnpm test && pnpm test:e2e && pnpm build` successfully.
- CI is green on a PR, and the PR's Vercel preview loads at 390×844 in iPhone and Pixel emulation.
- The manifest is valid, and the preview is installable in Chrome: a Playwright test gets no errors from the DevTools command `Page.getInstallabilityErrors`, and a manual install works. (Lighthouse 12 removed its PWA audits.)
- `/api/health` on the preview deployment returns `timescaledb: true`.
- Hooks work, `/phase-start` is available, and `.env` is ignored by git.

---

## Phase 1: Design (A leads; both humans approve)

**Read:** `DESIGN.md` (all of it), `PRD.md`, `COPY.md`.

**Items:** follow `DESIGN.md` section 12 in order.
1. Direction with impeccable `shape`, design-taste-frontend and frontend-design. Write it into DESIGN.md.
2. Claude Design canvas: 2–3 mood directions, the humans pick one, then every key screen at 390×844 in both themes.
3. Motion storyboards for every choreography row.
4. The 3D fog spike, approaches A and B, measured under 4× CPU throttling. Pick one and log it in DECISIONS.
5. Final tokens in DESIGN.md, `src/styles/tokens.css` and the Tailwind theme. Fonts and icons.
6. Base components and the `/design` living style guide (tokens with contrast ratios, every component and state, motion demos, 3D previews with tier and reduced-motion toggles, theme toggle).
7. Microcopy drafted in `src/copy/` for every screen in DESIGN.md section 6.
8. Playwright visual baselines for `/design` at 390×844 and 1440×900 in both themes.

**Gate**
- Both humans have approved the canvas and `/design`. The canvas link is recorded in DESIGN.md and DECISIONS.md.
- `design-critic` and `copy-critic` PASS on `/design`.
- The token check passes.
- The fog layer holds 45 fps or better on the mid tier under 4× CPU throttling with mobile emulation, and the 2D fallback renders when WebGL is disabled.
- Visual baselines are committed.

---

## Phase 2: Data and domain logic (B)

**Read:** `DATA.md` (all of it), `ARCHITECTURE.md` sections 6–7.

**Items**
1. The pipelines `data:gtfs`, `data:places`, `data:grades`, `data:cards`, `data:neighborhoods`, `data:events` and `data:words`, with generated files committed under `data/`.
2. Pure functions in `src/lib/` for travel time, the fair score, last-train search, miles, walking, H3 helpers, the grade formula, badge rules, stats and puzzle logic.
3. The Drizzle schema and migrations, including custom SQL for hypertables, continuous aggregates, and compression and retention policies.
4. Unit tests for every function, covering the edge cases in `DATA.md` section 4.

**Gate**
- Re-running every pipeline reproduces the same files, apart from upstream data changes.
- Five known trips land within 3 minutes of the MBTA schedule, and three known last trains match the timetable. Both comparisons are recorded in PROGRESS.md.
- The grade distribution is recorded in DECISIONS.md.
- The station cards for the demo lines have been checked by a human (listed in PROGRESS.md).
- Migrations apply cleanly on Tiger, and `timescaledb_information.hypertables` lists the four hypertables.
- `test-auditor` PASS.

---

## Phase 3: Profile, map, fog, ride (A; B builds the recorder)

**Read:** `PRD.md` F1–F3, `DESIGN.md` sections 5–10, `PWA.md` (install and permissions).

**Items**
1. **F1:** onboarding, profile, profile code restore, permission primers, install prompts, delete my data.
2. **F2:** map, fog layer and 2D fallback, station sheet with live departures, neighborhoods sheet, list view.
3. **F3:** ride mode live and replay, stop cards, reveals, summary, wake lock, ride events.
4. **Recorder (B):** `/api/cron/record-vehicles` writing to `vehicle_positions`, with the cron enabled in `vercel.json`. Record at least one full trip on each demo line for replay.

**Gate**
- Every F1–F3 criterion has a test.
- An e2e test (iPhone and Pixel projects) runs onboarding, opens the map, replays a recorded ride past three stops, and sees the fog lift and the summary numbers.
- WALKTHROUGH entries F1–F3 are verified.
- Lighthouse mobile performance budgets from PRD section 7 hold on the map route.

---

## Phase 4: Plans, last train, live night (B; A supports the UI)

**Read:** `PRD.md` F4–F6, `DATA.md` sections 3.1–3.3 and 3.9, `ARCHITECTURE.md` section 9.

**Items**
1. **F4:** plan builder, solver integration, options with fairness bars, invite links, join page, Open Graph images, Mastra planner agent with its eval guard.
2. **F5:** leave-by times, warnings, live countdown with alerts, Remind me calendar reminders (F5.8), alert-text display, the no-train-home path.
3. **F6:** live mode, check-ins with validity rules, arrival order, plan end (organizer and the `end-plans` cron).

**Gate**
- Every F4–F6 criterion has a test.
- An e2e test creates a plan with two placeholder friends, checks fairness ordering and leave-by times against fixtures, joins through the invite link in a second browser context, checks in with mocked geolocation, and ends the plan.
- WALKTHROUGH entries F4–F6 are verified.

---

## Phase 5: Daily puzzle and demo mode (B: puzzle logic; A: puzzle motion and demo mode)

**Read:** `PRD.md` F7 and F16, `WALKTHROUGH.md` judge path.

**Items**
1. **F7:** puzzle, validation, feedback, event reveal and pin, Plan it, share grid, streaks.
2. **F16:** the `/demo` seed copied per visit, data isolation, the `cleanup-demo` cron, the Demo chip, cached AI outputs, and a recorded replay.

**Gate**
- Every F7 and F16 criterion has a test.
- **An e2e test runs the entire judge path from WALKTHROUGH.md in demo mode on the iPhone and Pixel projects.** This is the core loop.
- WALKTHROUGH entries F7 and F16 are verified, and the judge path section is filled in with screenshots.

---

## Phase 6: Badges, stats, recap, How it works

**Read:** `PRD.md` F8, F9, F15, `DATA.md` sections 3.10–3.11.

**Items**
1. **F8 (B: rules and stats; A: badge tokens, count-ups):** badges, stats, Me screen.
2. **F9 (A: 3D podium and choreography; B: recap data and the Open Graph share image):** night recap.
3. **F15 (B):** the How it works page.

**Gate:** every F8, F9 and F15 criterion has a test, badge idempotency is tested, the recap's 3D scene and its fallback both pass design-critic, and the WALKTHROUGH entries are verified.

---

## Phase 7: Crawls, weekly plans, grades, squad (B leads; A on UI)

**Read:** `PRD.md` F10–F12, `DATA.md` sections 3.6–3.7.

**Items:** F10 crawls and the weekly cron, including "Dinner before" from a puzzle event (F10.6), F11 grade badges with plain-English summaries, F12 squad map and streaks.

**Gate:** every F10–F12 criterion has a test, the weekly cron is tested with fixtures, and the WALKTHROUGH entries are verified.

---

## Phase 8: Extras (both)

**Read:** `PRD.md` F13–F14.

**Items:** F13 calm mode (microphone primer, on-device decibel sampling, the noise hypertable and aggregate, calm layer, calm routing preference, sensory previews), and F14 Find it and taste of home.

**Gate:** every F13 and F14 criterion has a test. A privacy check confirms no audio leaves the device (network inspection in an e2e test). The WALKTHROUGH entries are verified.

---

## Phase 9: Hardening and release (both)

**Items**
1. **PWA polish** from `PWA.md`: iOS splash screens, install flows on real devices, offline behavior, the update toast, and why the service worker doesn't activate behind Vercel protection, and why installability failed on one protected URL but not another (D-043, D-044).
2. **Performance:** Lighthouse CI budgets, bundle analysis, 3D quality tiers on a real mid-range Android.
3. **Accessibility:** a full keyboard and screen-reader pass, axe on every route.
4. **Security:** run the `security-review` skill and fix its findings. Rate limits verified.
5. **Copy:** a `copy-critic` pass on all of `src/copy/`, then a `no-ai-slop` pass.
6. **WALKTHROUGH.md** complete for every feature, plus the 10-minute full tour.
7. **Ship kit:** README (what it is, how to run it, architecture summary, data credits), Devpost text, a 1-minute video script, screenshots, Open Graph images.

**Gate:** every standing check passes on production, every WALKTHROUGH entry is verified, the README is complete, and both humans sign off.

## Ship kit

Phase 9 item 7 can run any time after Phase 5 passes, and again at the end. A builder can generate the README, Devpost text and video script from the current WALKTHROUGH.md whenever the humans ask for it.
