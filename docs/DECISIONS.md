# Fogline decisions

One entry per decision, newest at the bottom. Format: ID, date, decision, why, consequences. Never delete an entry. Supersede it with a new one.

**D-001 · 2026-11-21 · Track: Bos(tons) of Eats and Streets.**
Why: the prompt asks for a web app for college students that uses the T to discover food, activities and the Boston aesthetic by craving, budget and location. Fogline covers every phrase. Gamification sets it apart from the expected wave of AI food recommenders.
Consequences: the product must stay a web app (PWA). Track relevance is judged against that prompt.

**D-002 · 2026-11-21 · One app combining the strongest earlier ideas.**
Why: fair meetups, last-train times, crawls, ride-mode reveals, a daily event puzzle, inspection grades and calm mode work better as features of one loop (discover, plan, go, get home, map fills in) than as separate apps.
Consequences: Ghost Kitchen (delivery) was cut because it works against going out. Calm mode and Find it are Extras.

**D-003 · 2026-11-21 · Hosting on Vercel Pro, not Vultr or EC2.**
Why: the Vultr account was stuck in manual review (up to 48 hours). Vercel deploys Next.js from git with previews per PR, and Pro allows per-minute crons and longer functions.
Consequences: the Best Use of Vultr prize isn't entered. Background work runs as Vercel Cron jobs. Functions run in `iad1`, near Tiger's us-east-1.

**D-004 · 2026-11-21 · Database: Tiger Cloud service `fogline-db` (Postgres + TimescaleDB, us-east-1).**
Why: time-series data (train positions, check-ins, ride events, noise readings) suits hypertables and continuous aggregates, and it's eligible for the Best Use of Tiger Data prize.
Consequences: credentials live only in local `.env` files and in Vercel env vars. Record the service tier in a follow-up entry.

**D-005 · 2026-11-21 · No auth provider. Anonymous profiles, invite links and a profile code.**
Why: zero-friction onboarding. iOS keeps Safari and installed-PWA storage separate, so a profile code is needed to restore a profile.
Consequences: authorization uses the profile ID in an httpOnly cookie plus invite tokens. Rate-limit profile-code attempts.

**D-006 · 2026-11-21 · Scope: subway only (Red, Orange, Blue, Green B–E, Mattapan).**
Why: the subway carries most student trips, and its realtime and GTFS data are reliable and keyless. Buses and Commuter Rail multiply the routing work.
Consequences: travel times and last trains ignore buses. Revisit after Phase 9.

**D-007 · 2026-11-21 · No chat bots (Telegram, SMS, WhatsApp, iMessage).**
Why: Telegram has low US adoption. SMS and WhatsApp need carrier or business registration that takes days. iMessage has no official bot API. Judges can't try any of these in 30 seconds.
Consequences: invites go through links with good previews (Open Graph), and sharing uses the Web Share API.

**D-008 · 2026-11-21 · AI writes words, never displayed facts.**
Why: trust. Times, distances, grades, fairness scores, leave-by times and badges must be exact and testable.
Consequences: the Mastra agent picks among solver outputs and writes blurbs, and an eval guard rejects any mismatched numbers.

**D-009 · 2026-11-21 · All times in America/New_York. GTFS service-date rules followed.**
Why: Vercel runs in UTC, the T runs past midnight, and DST shifts times.
Consequences: a shared `src/lib/time.ts` helper, and tests pinned to `America/New_York`.

**D-010 · 2026-11-21 · Design before features, and no deadlines in repo docs.**
Why: two builders with separate AI sessions drift apart without one approved design system. Deadlines in docs push agents to skip steps.
Consequences: Phase 1 must pass before feature UI. Phases end on gates, not dates. The humans decide when to run the ship kit.

**D-011 · 2026-11-21 · SpaceXSI raffle not entered.**
Why: it requires Cursor as the core AI coding agent, and both builders use Claude Code.
Consequences: none for the product.

**D-012 · 2026-11-21 · Map: MapLibre GL JS with OpenFreeMap tiles. Fog cells on H3 resolution 9.**
Why: open, key-free tiles with full style control. H3 makes per-neighborhood percentages and set operations simple.
Consequences: attribution is required on the map. The fog shader reads cell states from H3 data.

Entries D-013 to D-035 come from Builder A's kickoff review. TEAM.md requires both humans for PRD and PHASES changes, so those entries say "A agreed, B to confirm" until Builder B confirms them in PROGRESS.md.

**D-013 · 2026-11-21 · Tiger Cloud tier (follow-up to D-004).**
Decision: `fogline-db` runs on 0.5 CPU / 2 GiB RAM in us-east-1, paid from the $1,000 trial credit (about $1 a day). High availability off, connection pooling on, VPC off.
Why: avoids unknown limits on the free shared tier. Continuous aggregates and compression are what the Tiger Data judges look at.
Consequences: the app uses the pooled connection string. The trial lasts 29 days. Check on the billing page what happens when it ends, and decide before then (PROGRESS.md, Open questions).

**D-014 · 2026-11-21 · Judge path: Plan it keeps the event as the destination.**
Decision: F7.4 stays as written. The judge path shows the ranked options through Plans → New plan → Find spots. "Dinner before" a puzzle event becomes F10.6 in Phase 7.
Why: the old judge path had Plan it lead to three ranked options, which a fixed destination can't produce.
Consequences: WALKTHROUGH judge path rewritten (7 steps). PRD F10.6 and PHASES Phase 7 updated. A agreed, B to confirm.

**D-015 · 2026-11-21 · Leave-by reminders through a calendar event (F5.8).**
Decision: a "Remind me" button saves an .ics event with alarms 20 and 5 minutes before the participant's leave-by.
Why: F5.4's in-app alerts fire only while the app is open, and push is a non-goal. Calendar alarms ring on a locked phone on iOS and Android without push.
Consequences: new route `api/plans/[planId]/reminder`. Check on a real iPhone and Android phone that the alarms import. PRD and PHASES updated. A agreed, B to confirm.

**D-016 · 2026-11-21 · Mixed-age plans (F4.9).**
Decision: bar and club categories turn off once any joined participant is under 21. A plan with a bar or club stop is 21+. An under-21 profile opening its link sees "This plan is 21+" with no venue and can't join, and the Open Graph image shows "21+" instead of the spot. Placeholder friends don't affect the rule.
Why: F1.5 didn't say what happens when a 21+ organizer invites an under-21 friend.
Consequences: PRD F4.9, COPY, DESIGN screen list and WALKTHROUGH F4 updated. A agreed, B to confirm.

**D-017 · 2026-11-21 · Squad means a shared check-in on an ended plan (F12.1).**
Why: F12.1 said "joined the same plan", the glossary said "completed a plan with", and COPY said "after your first night out".
Consequences: F12.1 and the glossary updated. First Light and squad streaks use this definition. A agreed, B to confirm.

**D-018 · 2026-11-21 · Onboarding in four screens (F1.1).**
Decision: Welcome holds the name field and a "Restore profile" link. Picking a school suggests a home station. The map's first fog reveal replaces the Ready screen.
Why: F1.1 allows four screens, and DESIGN listed six.
Consequences: PRD F1 flow, DESIGN section 6 and WALKTHROUGH F1 updated. Phase 3 needs a school-to-station suggestion list. A agreed, B to confirm.

**D-019 · 2026-11-21 · Delete my data keeps shared plans intact (F1.7).**
Decision: every row the profile owns is deleted (profile, check-ins, rides, readings, badges, revealed cells, puzzle results). In shared plans the person shows as "Former member" with no name or station. Plans they organized stay for the other participants.
Why: F1.7 didn't say what happens to plans shared with others.
Consequences: PRD F1.7 and COPY updated. A agreed, B to confirm.

**D-020 · 2026-11-21 · Signed session cookie (F1.2). Supersedes the cookie detail of D-005.**
Decision: the cookie holds the profile ID signed with HMAC using `SESSION_SECRET`. A missing or bad signature counts as no profile.
Why: profile IDs reach other participants' browsers in plan data. With a raw ID in the cookie, anyone could copy someone else's ID into their own cookie.
Consequences: new env var `SESSION_SECRET` (`.env.example` and Vercel). D-005's choice of anonymous profiles is under review by A (PROGRESS.md, Open questions). A agreed, B to confirm.

**D-021 · 2026-11-21 · Invite links carry the invite token (F4.8, F9.4).**
Decision: links are `/p/[planId]?t=[invite_token]`. Plan pages, Open Graph images, reminders and recaps need the participant cookie or the token. The join page shows names and a count, not home stations.
Why: F4.8 said `/p/[id]`, the schema had `invite_token`, and F9.4 gated recaps on the token.
Consequences: PRD F4.8 and ARCHITECTURE section 14 updated. A agreed, B to confirm.

**D-022 · 2026-11-21 · Badge idempotency with NULLS NOT DISTINCT (F8.6).**
Decision: `badges_awarded` gets a nullable `scope` column (the neighborhood for First Light) and `UNIQUE NULLS NOT DISTINCT (profile_id, badge_id, plan_id, scope)`.
Why: Postgres treats NULLs as distinct in unique constraints, so `UNIQUE (profile_id, badge_id, plan_id)` let explorer badges, whose `plan_id` is NULL, duplicate.
Consequences: needs Postgres 15 or later. ARCHITECTURE section 6 updated. Builder B owns the migration.

**D-023 · 2026-11-21 · Daily puzzle events are all-ages (F7.1).**
Why: everyone shares one daily answer, and under-21 profiles never see bars (F1.5).
Consequences: the `data:events` curation rule requires all-ages venues. PRD F7.1 and the COPY puzzle example updated. A agreed, B to confirm.

**D-024 · 2026-11-21 · Live data refreshes every 5 seconds (F3.2, F6.3).**
Decision: `/api/mbta/*` caches for about 5 s. Vehicles poll every 5 s while riding, and live plan state polls every 5 s. Predictions stay at 30 s.
Why: a 10 s cache plus 10 s polling had a worst case near 20 s against F3.2's 15 s. 10 s live-mode polling plus network time exceeded F6.3's 10 s.
Consequences: ARCHITECTURE sections 1, 4 and 5 updated.

**D-025 · 2026-11-21 · The weekly-plans cron handles daylight saving time (F10.4).**
Decision: run the cron at 10:00 and 11:00 UTC on Mondays. The handler works only during New York's 6 AM hour.
Why: Vercel crons run in UTC, so 11:00 UTC is 7 AM Eastern from March to November.
Consequences: ARCHITECTURE section 12 updated.

**D-026 · 2026-11-21 · Plans end on a cron (F6.4).**
Decision: `/api/cron/end-plans` runs every 15 minutes. It ends a plan 2 hours after the last check-in at the last stop, or 4 hours after the last stop's scheduled time when nobody checked in there. Badges are computed when a plan ends.
Why: nothing triggered the 2-hour auto-end, and a plan with no check-ins never ended.
Consequences: PRD F6.4, ARCHITECTURE and PHASES Phase 4 updated. A agreed, B to confirm.

**D-027 · 2026-11-21 · F6.2 includes the check-in time window.**
Why: DATA 3.9 accepts check-ins from 30 minutes before the start until the plan ends, but F6.2 didn't, so no test would cover the window.
Consequences: PRD F6.2 updated. A agreed, B to confirm.

**D-028 · 2026-11-21 · "First completed action" defined (F1.6).**
Decision: the first finished puzzle, created plan or ended ride. Finishing onboarding doesn't count.
Why: install-prompt timing depended on an undefined term.
Consequences: PRD F1.6 updated. A agreed, B to confirm.

**D-029 · 2026-11-21 · Restore entry and Force 2D added to the screen list.**
Why: no screen took a profile code on a new device, and Settings lacked the Force 2D toggle that DESIGN section 9 promises.
Consequences: DESIGN section 6 updated.

**D-030 · 2026-11-21 · Copy fixes in COPY.md.**
Why: Fashionably Late's text said "after everyone else", but its rule measures from the start time (DATA 3.10). "12:22" lacked AM. "9 PM", "two minutes" and "Fifty" broke the number formats. The no-train-home line led with a 52-minute walk, which F5.7 says not to present as the default.
Consequences: those lines rewritten. "Remind me", "This plan is 21+." and "Former member" added.

**D-031 · 2026-11-21 · One demo copy per visit (F16.1, F16.2).**
Decision: each `/demo` visit clones the seed (flagged rows, new profile IDs). `/api/cron/cleanup-demo` deletes copies after 24 hours. The demo puzzle is separate from the real daily one.
Why: judges sharing one demo profile would overwrite each other's puzzle and fog.
Consequences: PRD F16.1 and F16.2, ARCHITECTURE and PHASES Phase 5 updated. A agreed, B to confirm.

**D-032 · 2026-11-21 · MapView lives in the `(app)` layout.**
Why: ARCHITECTURE put the map in `(app)/page.tsx`, which unmounts on every tab switch, while DESIGN says tab switches never re-mount the map.
Consequences: `(app)/layout.tsx` holds MapView, and tab pages render sheets over it. ARCHITECTURE section 3 updated.

**D-033 · 2026-11-21 · Phase 0 gate checks that can run.**
Why: Lighthouse 12 removed its PWA category, so "Lighthouse installability passes" can't be met. Running the TimescaleDB check "from the preview's server" needed a route. CI ran only on PRs, while the standing check wants it green on `main`. `vercel.json` can't disable a cron entry.
Consequences: installability is a Playwright test using `Page.getInstallabilityErrors`, plus a manual install. `/api/health` returns `{ db, timescaledb }` booleans. CI also runs on pushes to `main`. `vercel.json` sets `regions`, and each cron arrives with its route. CI tests previews through Vercel's Protection Bypass for Automation. PHASES, TESTING, PWA and ARCHITECTURE updated. A agreed, B to confirm.

**D-034 · 2026-11-21 · Two database variables for tests.**
Decision: the read-only TimescaleDB check uses `DATABASE_URL`. Integration tests that write use `DATABASE_URL_TEST`, which is a TimescaleDB container in CI and never `fogline-db`.
Why: PHASES and TESTING named different variables for skipping database tests, and nothing said where write tests run.
Consequences: PHASES, TESTING and ARCHITECTURE section 11 updated.

**D-035 · 2026-11-21 · Small corrections.**
- `tests/integration/` added to ARCHITECTURE's folder list.
- `src/lib/time.ts` assigned to Builder B in TEAM.md.
- "Tufts/Medford" corrected to "Medford/Tufts" in DATA.md.
- Fresh clones run `pnpm exec playwright install`.
- Phase 0's placeholder UI skips design-critic because there's no canvas yet. copy-critic still reviews Phase 0 strings.
- Visual baselines are generated in Playwright's Docker image to match CI.
- DESIGN notes T-line casings for WCAG 1.4.11, the theme-color question for Phase 1, and that the puzzle gets its own look.

**D-036 · 2026-11-21 · Scaffold choices (Phase 0 item 1).**
Decision:
- Next.js 16.4 with Turbopack, React 19.3 and Tailwind 4.3. Tailwind loads through `@tailwindcss/turbopack`, the create-next-app default.
- Cache Components off.
- shadcn on the Radix base (its Drawer is built on vaul, as ARCHITECTURE says) with the `nova` preset, which Phase 1 replaces. `cn()` comes from shadcn's `cn` package.
- Feature flags come from `NEXT_PUBLIC_FLAGS`, a comma list of feature IDs such as `F1,F2`.
- `pnpm typecheck` runs `next typegen` first, so route types exist on a fresh clone.
- Node 24 is pinned in `.nvmrc` and `engines`.
Why: create-next-app 16.4 turns Cache Components on by default, but no doc plans for its caching model. Flag names that match PRD feature IDs need no separate registry.
Consequences: turning Cache Components on later needs its own decision. Builders set `NEXT_PUBLIC_FLAGS` in `.env` and in Vercel to see unfinished features.

**D-037 · 2026-11-21 · Token check exempts stock shadcn primitives until Phase 1.**
Decision: `src/components/ui/` is exempt from the token grep until Phase 1 restyles those files with design tokens. The exemption ends at the Phase 1 gate.
Why: the stock Button, Tabs and Drawer use px values (`p-[3px]`, `w-[100px]`, `ring-[3px]`). Picking replacements before the design direction exists would be guessing.
Consequences: the Phase 0 gate runs the grep with `src/components/ui` excluded. The Phase 1 gate runs it without the exclusion.

**D-038 · 2026-11-21 · Tests can't reach `fogline-db` by default. Supersedes the test half of D-034.**
Decision: Vitest gives the integration project only the test database, as both `DATABASE_URL_TEST` and `DATABASE_URL`. The read-only check against `fogline-db` runs only when the shell exports `LIVE_DATABASE_URL`.
Why: code-critic found that loading `DATABASE_URL` from `.env` into integration tests pointed `getDb()` at production, so the first test of a Server Action would have written rows to `fogline-db` on every builder's machine.
Consequences: PHASES Phase 0 item 5 and TESTING updated. `/api/health` on a deployment checks `fogline-db` for the gate.

**D-039 · 2026-11-21 · Database client limits.**
Decision: postgres.js runs with `prepare: false`, at most 3 connections per instance, a 10 s connect timeout and a 15 s `query_timeout`, which counts waiting for a connection too. Server notices go through `src/lib/log.ts`.
Why: Tiger's pooler can't keep prepared statements across transactions. Without a query timeout, a stalled pooler would hang requests until the function timed out.
Consequences: Vercel's `attachDatabasePool` doesn't support postgres.js, so a suspended instance can hold up to 3 pooler client slots until it resumes. Watch connection counts in the Tiger console after deploys.

**D-040 · 2026-11-21 · PWA skeleton choices (Phase 0 item 6).**
Decision:
- Serwist through `@serwist/turbopack`. It builds the worker in a route handler at `/serwist/sw.js`, and the Next config is wrapped with `withSerwist`.
- `skipWaiting` is off, so a new version waits until every tab closes. The "Update ready" toast that lets users apply it sooner arrives with Phase 9's PWA polish, as PHASES lists.
- A pnpm override pins `browserslist` to 4.29.6.
- Manifest shortcuts and screenshots wait for their routes and real screens (Phase 3 and later).
- Placeholder icons come from `public/icons/icon.svg` through `pnpm icons`. The artwork stays inside the maskable safe zone, so one 512 file serves both purposes.
- The Button `lg` size is 44 px tall, the touch minimum, until Phase 1 restyles the components.
- `SerwistProvider` runs with `reloadOnOnline` and `cacheOnNavigation` off. Its defaults reload every tab when the connection returns, against PWA.md's "never reload without asking", and re-fetch the full page on every client navigation.
- Same-origin `/api/*` is network-only. Serwist's default would answer it from a 24-hour cache, so `/api/health` could look healthy during an outage.
- The precache holds Next's static chunks, the two preloaded Latin font files and the PNG icons. Its revision changes on every build.
- `/serwist/[path]` is a route handler outside `app/api/`. This is a named exception to the CLAUDE.md rule, because Serwist serves the worker from that path.
Why: `@serwist/turbopack` pins `browserslist` exactly, which made pnpm install two copies of `serwist`. Serwist attaches its offline fallback only to handlers that pass an `instanceof Strategy` check, so with two copies the fallback was silently dropped. The e2e offline test caught it. code-critic found the reload, the `/api` caching, the missing fonts and the stale revision.
Consequences: when upgrading Serwist, re-check the override and keep the offline e2e tests. Serwist's default rules cache pages loaded in full (not ones reached through client-side links) for 24 hours (32 entries), so they load offline. Pages you haven't opened show `/offline`. Phase 3 adds the offline map and saved plans properly. PWA.md's manifest list is only partly done until shortcuts and screenshots land.

**D-041 · 2026-11-21 · Deployment checks and branch protection (Phase 0 items 7 and 8).**
Decision:
- After every successful Vercel deployment, Vercel's `vercel.deployment.success` `repository_dispatch` event runs the read-only e2e specs (`pnpm test:e2e:deployment`) against it and reports an `e2e on <environment>` commit status.
- A Playwright global setup uses the protection-bypass secret once to get Vercel's bypass cookie, and masks that cookie in the Actions log. The secret is never sent as a header on every request.
- No test report is uploaded, because Playwright error messages contain request headers.
- The workflow skips commits that aren't on a branch of this repo, which excludes forks.
- `main` requires a PR, the CI `check` job and the Vercel build. History stays linear, and force-pushes and deletion are blocked. No approving review is required, and admins can override.
Why: Vercel doesn't create GitHub Deployments for this repo, so D-033's `deployment_status` trigger would never fire. code-critic found that a per-request header would leak the secret to third-party origins and into uploaded artifacts on a public repo. Specs that write data must never run against production. Requiring an approving review would block a builder whenever the other one is away. A approved branch protection on 2026-11-21.
Consequences: GitHub runs `repository_dispatch` workflows from `main`, so the deployment check starts with the first deployment after this lands. A spec joins `test:e2e:deployment` only if it writes nothing. The `e2e on preview` status isn't required yet; make it required once it has run reliably on a few PRs. To debug a failed deployment run, reproduce it locally with the secret.

**D-042 · 2026-11-21 · Claude Code project hooks (Phase 0 item 9).**
Decision: `.claude/settings.json` runs two Node scripts from `.claude/hooks/`.
- After every Edit, Write or MultiEdit, `format-edited-file.mjs` runs the repo's own Prettier on the file. It checks the real path, so only files inside the repo are touched. `.prettierignore` decides what's skipped (`docs/`, `.claude/skills/`, Markdown). A file Prettier can't parse yet is left alone without an error.
- At Stop, `progress-reminder.mjs` compares the branch against `origin/main` plus uncommitted and untracked files. If code outside `docs/` and `.claude/` changed and `docs/PROGRESS.md` didn't, it blocks the stop with a reason, at most once per turn (`stop_hook_active`). It keeps doing so each turn until the branch has a PROGRESS change.
- The `.env` deny rules stay.
Why: Node is guaranteed on every builder's machine and `jq` isn't. Blocking once makes the reminder impossible to miss without trapping a session that has a reason to skip it.
Consequences: on Node 24.7, an ES module that reads stdin and then calls `process.exit` can segfault (exit 139), so the hook scripts end without `process.exit`. The scripts are linted and format-checked like the rest of the repo. Both builders get the hooks on their next session after this merges. Hooks run code from the checked-out branch, so before reviewing someone else's fork branch with Claude Code, set `"disableAllHooks": true` in `.claude/settings.local.json`.

**D-043 · 2026-11-21 · Phase 0 gate fixes.**
The first gate run failed code-critic and test-auditor. These fixes come out of it:
- **Installability is tested in full Chromium.** Both Chromium projects use `channel: "chromium"`, because the headless shell reports no installability errors even for a page with no manifest. The test ignores `in-incognito`, which every Playwright context reports, and a negative control must see `no-manifest`. It no longer waits for the service worker, because installability doesn't need one.
- **The e2e server gets `DATABASE_URL` from `DATABASE_URL_TEST`**, never `fogline-db` from `.env`. The `/api` cache test first requires a 200 from `/api/health`, and a mutant service worker without the network-only rule now fails it.
- **Service workers are blocked in Playwright** except in the service-worker specs, so `page.route` mocks see every request.
- **On protected previews the service worker never activates**, even with the bypass cookie, while production passed every service-worker test except the font precache, which this fix addresses. The production deployment check after merge confirms it. The service-worker specs skip on previews, and production deployments and CI run them. Finding the cause is an open item for Phase 9's PWA polish.
- **Vercel's `vercel.deployment.success` `repository_dispatch` event has never arrived** for this repo. That's four deployments since D-041. Until it does, a builder runs the deployment check with `gh workflow run deployment.yml`, and A checks whether the Vercel GitHub app needs updated permissions. The manual run only accepts this project's own Vercel URLs over HTTPS, takes `environment` as a choice, and fails loudly on a commit that isn't a branch head.
- **Migrations need an explicit target.** `pnpm db:migrate` reads only `MIGRATE_DATABASE_URL`. drizzle-kit loads `.env`, so keep that key out of `.env` and set it on the command line. A migration PR merges first. Then the builder who merged it applies it to `fogline-db`. Then the code that needs it merges. Previews share `fogline-db`, so they only work after that.
- **`src/styles/theme-color.ts` may hold raw hex** for the manifest and the `theme-color` meta tags, which need literal colors. This extends D-037. Phase 1 derives the values from the tokens.
- **The offline copy now says "This page isn't saved for offline use."** Serwist's default rules do cache visited pages for 24 hours, and an e2e test proves a visited page opens offline. This corrects D-040.
Why: two gate tests couldn't fail. The e2e server reached `fogline-db` from laptops. Three docs described an automatic trigger that had never run.
Consequences: the gate re-runs code-critic and test-auditor on these fixes. Making `e2e on preview` a required check waits until the automatic trigger works.

**D-044 · 2026-11-21 · The production deployment check runs on the production domain.**
- **Every generated deployment URL is protected, production ones included.** Only `fogline-mu.vercel.app` is public. The generated URL of `4b7aa05`'s production deployment answered 302.
- **On that generated URL the production check failed 14 tests** (run 44961127767): all 12 service-worker tests ("never took control") and the installability test on both Chromium projects (`manifest-parsing-or-network-error`, `no-manifest`). The same deployment on `fogline-mu.vercel.app` passed 40 and skipped 11 (run 44961601553), font precache included. So the D-043 symptom comes from protection, not from preview builds.
- **PR #9's protected preview passed installability** (run 44959800680). Why protection breaks installability on one protected URL and not another is unknown. It joins the Phase 9 protection item.
- **A builder runs the production check on `https://fogline-mu.vercel.app`** with `environment=production`. Previews keep their own URL. The workflow's URL allowlist already accepts the production domain.
- **The alias isn't tied to a commit**, so before dispatching, the builder checks that `vercel inspect fogline-mu.vercel.app` shows the deployment `vercel ls --meta githubCommitSha=<sha>` lists (TEAM.md). Without that check, a run started before the new build is live would test the old deployment and post a green status on the new commit. A check inside the run would need `/api/health` to report the commit, and that route returns only booleans by design (PHASES item 5).
Why: the check should test what users open. The generated URL fails for a reason users never hit.
Consequences: if Vercel's `repository_dispatch` event starts arriving, its production runs will target the generated URL and fail the same way. The workflow would then have to send production events to the production domain. This is listed under Open questions in PROGRESS.md.

**D-045 · 2026-11-21 · Builder B confirms D-013 to D-044, with two amendments.**
Decision: B (Anand283) confirms D-013 to D-044, including the PRD and PHASES changes in D-014 to D-033.
- D-031 is amended by D-046: demo copies write `checkins` and `ride_events` rows, so those tables carry `is_demo`, and F15's counts and the continuous aggregates leave demo rows out.
- D-018's school-to-station suggestion list belongs to B. It ships as `data/schools.json` in Phase 2.
- Notes, not objections:
  - D-019 deletes rows that may sit in compressed hypertable chunks. An integration test proves that works on TimescaleDB 2.32 before F1.7 is built.
  - D-022 needs Postgres 15 or later on Tiger. Applying the schema migration confirms it.
  - D-015's calendar alarms are fixed when the file is saved. The event text should say that and link to the plan (Phase 4).
Why: F16.2 says demo data never shows up in real stats, but nothing marked demo rows in the hypertables. D-018 asked for a list without naming who builds it.
Consequences: every "A agreed, B to confirm" entry is now agreed by both builders.

**D-046 · 2026-11-21 · Phase 2 data model.**
Decision:
- Places and events live in `data/places.json` and `data/events.json`, not in database tables. `plan_stops.place_id`, `checkins.place_id` and `daily_puzzles.event_id` hold the files' stable text IDs.
- Each place lists every station within 600 m walking, each with its `walk_m`.
- `checkins` and `ride_events` get `is_demo` (default false).
- `ride_events` gets a nullable `plan_id` and an `on_train` event for the "I'm on the train" tap. Phase 4 derives friend status (F6.1) from those rows and from check-ins.
- Duplicate check-ins: a hypertable's unique indexes must include `ts`, so the check-in action skips a second valid check-in for the same person and stop, and queries use each person's earliest valid check-in per stop.
Why: ARCHITECTURE listed `places` and `events` tables while DATA built JSON files, and nothing loaded one into the other. A's kickoff review found that a place stored only its nearest station, and that friend status and on-train taps had nowhere to go.
Consequences: ARCHITECTURE section 6 and DATA section 2 updated. Plan and check-in rows can't use a foreign key to a place; the server checks place IDs against `places.json`.

**D-047 · 2026-11-21 · Travel-time graph, service-date cutoff and demo lines.**
Decision:
- `graph.json` stores ride edges (median run time per day type and hour bucket), headways and transfer edges. Travel time runs a shortest-path search on request and returns minutes plus the lines and transfer stations on the path. This replaces DATA 3.1's all-pairs precompute.
- A moment from midnight to before 3:00 AM New York time belongs to the previous service date.
- The demo lines are the Red Line and Green Line E (the judge path's Priya and Sam), plus the line of the recorded replay.
Why: an all-pairs matrix gives minutes but not the lines and transfers F4.4 shows. The service-date rule needed a cutoff. PHASES' Phase 2 gate named demo lines that no doc defined.
Consequences: DATA sections 2, 3.1 and 3.3 updated.
