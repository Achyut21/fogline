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

**D-048 · 2026-11-21 · Hour buckets before 5 AM, and day type versus service.**
Decision: GTFS service-day times before 05:00:00 use the 5 AM travel-time bucket, and 24:00:00 and later is "late". The day type (weekday, Saturday, Sunday) only picks representative travel times. The trips that run on a given date always come from that date's `calendar.txt` and `calendar_dates.txt` services.
Why: DATA 3.1 left times before 5 AM without a bucket. The first trains of the day run at 5 AM headways, while "late" holds after-midnight trips. code-critic noted that a weekday-only rule would give Thanksgiving weekday trains, while the MBTA usually runs a Sunday schedule that day.
Consequences: DATA 3.1 updated. A plan between 3:00 and 4:59 AM gets 5 AM travel times, so the solvers (items 3 to 5) check whether trains run before offering an option.

**D-049 · 2026-11-21 · Core table rules (Phase 2 item 2).**
Decision:
- Allowed values are `text` columns with check constraints, built from one `as const` list per column that also types the column. No Postgres enums.
- `plans.ended_at` is new. A check keeps it set exactly when `status` is `ended`. `puzzle_results` does the same for `solved` and `solved_at`.
- A seat in `plan_participants` is one of three things, enforced by a check: a joined profile with no name or station on the row (its station is the profile's home station), a placeholder with both, or a former member with neither. `unique (plan_id, profile_id)` keeps NULLs distinct, so several placeholders and former members can share a plan.
- Deleting a profile sets `plans.created_by` and the seat's `profile_id` to null, and cascades to the profile's cells, badges and puzzle results. `plan_participants` has its own `id`, and `badges_awarded` an identity `id`.
- Indexes on `plan_participants(profile_id)`, `plans(created_by)` and `badges_awarded(plan_id)`.
- Each integration test file migrates its own scratch database in `beforeAll`, instead of one Vitest `globalSetup`.
- `drizzle/meta/` is in `.prettierignore`.
Why: Drizzle applies every pending migration in one transaction, and Postgres can't use a new enum value inside the transaction that adds it. A type-only enum list next to a hand-written check would drift: drizzle-kit sees no change when only the type changes. Storing a joined person's station on the seat would keep it after they delete their data, against D-019. DATA 3.9's check-in window needs the plan's end time. Scratch databases keep test files from seeing each other's rows. drizzle-kit writes meta files Prettier rejects, and every `db:generate` rewrites them.
Consequences: ARCHITECTURE section 6 updated. Joined participants' origin comes from `profiles.home_station_id` (F4.1, F5.1). `deleteMyData` (Phase 3) also deletes plans whose only participant was the person, since D-019 keeps plans for other participants and there are none. Weekly plans (F10.4) need their own marker column; a null `created_by` means the organizer deleted their data. A person who changes their home station also changes where past plans place them, so the recap (F9.1) draws past routes from `ride_events` if that matters.

**D-050 · 2026-11-21 · Phase 1 direction: the familiar option.**
Decision: Fogline follows the category standard for map apps, played straight, with Apple Maps, Transit and Strava as the craft bar. The world is written in DESIGN.md, "Direction".
Why: A compared three moods on the Claude Design canvas (https://claude.ai/artifact/4o3hJj7QBSBavvV4LburQR): a harbor-chart world (assigned by impeccable's concept roll, seed `eeb14234`), a departure-board world (the competitive challenger), and the familiar option. A picked the familiar option. The shape round set "tool first, play in moments" and "never cute".
Consequences:
- DESIGN section 1's "avoid a layout that looks like a template" no longer applies to layout. The identity has to come from the fog, the numbers and the copy, so the fog reveals and the recap get the best motion and the most review.
- `docs/PRODUCT.md` exists because impeccable's concept roll refuses to run without a product record. It defers to PRD.md. This changes the approved Phase 1 plan, which said there would be no PRODUCT.md. A approved the change.
- B's human confirms the direction before the Phase 1 gate. Until then round 2 of the canvas proceeds on this direction.

**D-051 · 2026-11-21 · Theme follows the OS (Phase 1 flag 2). Supersedes the `suncalc` default in DESIGN section 3.**
Decision: the theme follows `prefers-color-scheme`. Settings offers System, Day and Night. Only a manual override updates the `theme-color` meta at runtime.
Why: an iPhone set to Automatic already switches at sunset. Some people need dark mode at all hours. The `theme-color` media tags stay correct without runtime work, and visual tests stay deterministic.
Consequences: no `suncalc` dependency. Item 5 builds the override with next-themes (class strategy). The profile's `theme_pref` column stores `system`, `light` or `dark`, the values in B's schema (#14). Settings labels them System, Day and Night.

**D-052 · 2026-11-21 · Builder B's PRs merge with an admin override until B can deploy on Vercel.**
Decision: once a B PR's CI `check` and code-critic pass, A's session merges it with `gh pr merge --admin --squash`. The Vercel build is the only required check it skips. A chose this over inviting B to the Vercel team, which costs a Pro seat.
Why: Vercel refuses to build commits by Anand283 ("You don't have permission to create a Preview Deployment for this Vercel project"), and the Vercel build is a required check on `main`.
Consequences:
- Vercel decides by the author of the newest commit. A B-authored commit on `main` doesn't deploy to production either: #12, #13 and #14 each got "Deployment failed" and no deployment. Production catches up at the next A-authored commit on `main`, which includes B's changes. So after each B merge, A lands a docs PR (the PROGRESS entry for that merge) and runs the production check on that deployment (TEAM.md).
- Merging as A with `gh pr merge --author-email` didn't change the author; GitHub kept B. It probably needs an email verified on the merging account, which wasn't checked because `gh` lacks the `user` scope.
- A PR whose newest commit is A's gets a Vercel preview, so a merge commit from A on B's branch makes its preview build.
- Stacked PRs: retarget the child to `main` before deleting the parent's branch. Deleting it closed #13, which had to be reopened.
- Merge conflicts still block an admin merge. B rebases B's own branches. A resolved #12 and #13 with merge commits on B's branches (no force-push).
- B applies B's own migrations to `fogline-db` after they merge, from B's terminal.

**D-053 · 2026-11-21 · Hypertables, aggregates and policies (Phase 2 item 2b).**
Decision:
- Drizzle defines the four hypertables' columns (migration `0002_hypertable_columns`), and custom SQL (`0003_hypertables`) converts them with `create_hypertable(..., by_range('ts', ...))`. Chunks are 1 day for `vehicle_positions` and 7 days for the others.
- The hypertables have foreign keys. `profile_id` cascades from `profiles` on `checkins`, `ride_events` and `noise_readings`. `checkins.plan_id` cascades from `plans`, and `ride_events.plan_id` is set to null.
- `vehicle_positions` is unique on `(vehicle_id, ts)`, so a recorder run that Vercel Cron delivers twice adds nothing. This works only when the recorder stores the feed's per-vehicle `timestamp` as `ts`, not its own fetch time, and inserts with `on conflict do nothing`.
- `noise_readings` gets `is_demo`, like `checkins` and `ride_events`.
- Compression uses the columnstore with `add_columnstore_policy`. `vehicle_positions` compresses after 1 day, segmented by `route_id`. `ride_events` compresses after 7 days by `profile_id`, `noise_readings` after 7 days by `route_id`, and `checkins` after 7 days unsegmented. All are ordered by `ts DESC`. `vehicle_positions` is dropped after 30 days.
- Continuous aggregates, created `WITH NO DATA` with real-time aggregation on:
  - `vehicle_activity_5m`: distinct vehicles and samples per route per 5 minutes. It refreshes every 5 minutes over the last 2 days.
  - `checkins_daily`: check-ins and valid check-ins per New York day, demo rows excluded. Hourly over the last 7 days.
  - `segment_noise_hourly`: average, peak and count per segment per hour, demo rows excluded. Hourly over the last 7 days.
- `ride_events` has a check for `board`, `pass`, `alight` and `on_train`, and an index on `(plan_id, ts)` for live-plan status.
Why:
- Drizzle applies every pending migration in one transaction, where creating an aggregate `WITH DATA` fails.
- Real-time aggregation adds rows newer than the last refresh, which F15.2 needs. It doesn't add older rows that a refresh skipped. With a window of hours, a stalled scheduler would have left a permanent hole; a refresh only recomputes changed ranges, so a window of days costs little.
- code-critic measured `checkins` segmented by `plan_id` at a 0.97 compression ratio, larger than uncompressed, against 4.0 unsegmented. Version 2.32 builds bloom filters on `plan_id` and `profile_id` from the existing indexes, so lookups stay fast.
- Without foreign keys, a deleted person's still-signed cookie (D-020) could write rows for a profile that no longer exists, and nothing would ever delete them. With them, deleting a profile (F1.7, demo cleanup) cascades, compressed chunks included, on TimescaleDB 2.32.
- New York days match how the app shows dates. Demo rows stay out of real stats (F16.2, D-045).
Consequences:
- The integration test pauses the scratch database's jobs, reads the aggregates in real time, and runs one manual refresh.
- Deletes older than a refresh window (delete my data) don't reach the aggregates. Those hold only anonymous counts and averages.
- `recordNoise` refuses replays (F3.5). Its readings would describe a recorded trip, not a ride.
- Retention drops `vehicle_positions` after 30 days, so the demo's recorded replay (F3.5, F16.1) must be exported to `data/` or a seed outside retention when it's recorded (Phase 3 recorder, Phase 5 demo).
- TimescaleDB copies each foreign key onto every chunk, so each chunk adds triggers on `profiles` and `plans`: about 300 and 200 after a year of 7-day chunks. They fire only when a profile or plan is deleted. 7-day chunks are kept so compression after 7 days stays meaningful.
- The Phase 2 gate checks `timescaledb_information.hypertables` on `fogline-db` after B applies `0002` and `0003`.



**D-054 · 2026-11-21 · Final design tokens, type roles, token check and app icon (Phase 1 item 5, flag 4).**
Decision:
- The tokens in DESIGN section 4 are final. They live in `src/styles/tokens.css`, except springs and the list stagger, which only Motion and R3F use (`src/lib/motion.ts`). `src/app/globals.css` maps them into Tailwind and resets Tailwind's default palette, type sizes, tracking, radii, shadows (inset, drop and text shadows too) and easings, so a stock class like `bg-red-500` or `rounded-2xl` doesn't exist.
- Where the tokens differ from the canvas:
  - Day `--warning` is `#A35600` instead of the canvas's `#B25E00`, which reaches 4.28:1 on `--bg` and 4.12:1 on `--surface-sunken`. The new value reaches 4.95 and 4.76.
  - Day `--success` is `#1B7348` instead of `#1E7F4F`, which reaches 4.41:1 on `--surface-sunken`. The new value reaches 5.16.
  - Chips are pills (`rounded-full`), as drawn. DESIGN section 4's 6 px chip radius is gone. A new 8 px `--radius-small` serves segmented-control thumbs, inset in a 12 px track with 4 px padding. The canvas's 14 px inputs and rows use 12, and its 22 and 28 px button radii are pills.
  - Night elevations add a hairline light ring (6, 8 and 10% ink). DESIGN section 4 asked for light borders at night, a black shadow barely shows on near-black, and night `--surface` (`#1E2227`) is almost night `--map-land` (`#1D2126`), so a card over cleared fog would lose its edge.
  - The canvas's `--field`, `--halo` and `--edge` variables become tokens: `--field` (input fill, darker than the card at night as drawn), `--halo` (label halos, station rings) and `--fog-edge` (the reveal's bright edge, a shader uniform). `--field-border` is new: the canvas draws no resting input border, and WCAG 1.4.11 needs a 3:1 control boundary.
  - Type: the canvas uses about 18 sizes. They map to the scale (10–12 px → `xs`, 13–14 → `sm`, 15–17 → `base`, 18 → `lg`, 20–22 → `xl`, 24–30 → `2xl`, 40 → `3xl`), and `text-3xl` moved from 36 to 40 px to match the map's hero number. The type roles in DESIGN section 4 come from the canvas: primary buttons are `text-lg` bold (18/700), not `text-sm` semibold as first written. Three tracking tokens follow the canvas: -0.02em, -0.01em and 0.18em.
- One font family: Hanken Grotesk (OFL), variable, through `next/font`, replacing Geist. impeccable `typeset` confirmed it: one grotesque fits the Direction's "one family", the detector scan was clean, and its figures are tabular by default. Numbers still carry `tabular-nums`, which matters if a fallback font renders: with `system-ui`, "1111" and "0000" differ by 26 px without it.
- The token check (flag 4) is a Vitest test, `tests/unit/design-tokens.test.ts` with the rules in `tests/support/token-scan.ts`. It scans every `.ts`, `.tsx` and `.css` file under `src/` for hex colors, color functions, `px` and `rem` values, `ms` and `s` times, arbitrary Tailwind values and properties containing a digit or `#`, Tailwind palette colors, off-scale spacing, raw durations (classes, Motion `transition` objects, inline styles), numeric inline style lengths and raw `z-` layers. It reads one line at a time, so a style or transition object split over lines can slip through. Exempt: `src/styles/tokens.css`, `src/styles/theme-color.ts` (the manifest and meta tags need literal colors, D-043), `src/lib/motion.ts` (the Motion token source) and `src/components/ui/` (the D-037 exemption, kept until item 6 restyles those primitives).
- The same test file checks AA for every text pair in both themes, F2.3 line visibility, `theme-color` against `--bg`, Motion values against the CSS tokens in both directions, and that `/design` shows every color token once (`src/styles/swatches.ts`).
- F2.3 reads WCAG 1.4.11 literally: a line needs 3:1 against its adjacent color. Where a ground (land, water, park, road, fog) is too close to the line color, the casing is the adjacent color, so the line needs 3:1 against the casing there. The first version also required the casing to reach 3:1 against the ground. WCAG doesn't ask that. With roads added it would have forced light casings onto night red and green only, while the canvas draws dark casings over lighter roads at night, as Apple Maps does. Night red and green reach 3.91 and 3.96 against their casings.
- Theme switching: next-themes, class strategy, default `system` (D-051). A small client component rewrites the `theme-color` meta tags only when the user picks Day or Night, and again whenever `<head>` changes, because Next puts the server values back on every in-app navigation. The toggle marks the stored theme only after hydration: the server can't know it, and React doesn't patch a mismatched attribute.
- App icon: seven H3 cells on the night background. A teal line enters from the lower right and ends at a station dot in the center. The cells it crossed are cleared (tinted `--accent-soft`), the cells beside them hold thin fog, and the rest full fog. The first draft put two white cells on either side of a diagonal line, and at 32 to 60 px it read as a percent sign. Every shape is within 195 px of the center (the maskable safe zone is 205 px). The wordmark is "Fogline" in `text-xl font-extrabold tracking-snug`, not a separate file.
- COPY.md: a time and its AM or PM are joined by a no-break space.
Why: the approved Phase 1 plan (item 5 and flag 4), and the item 5 review: design-critic, copy-critic and code-critic each failed the first pass. The PHASES grep skipped `.ts` and `.css` files and missed arbitrary values, palette classes, off-scale spacing and raw durations, while flagging any `#` followed by hex-looking text. The canvas values were drawn before AA was checked against every background.
Consequences:
- PHASES standing checks, CLAUDE.md and `/phase-gate` now name the Vitest check instead of the grep.
- The plan named the test file `tests/unit/tokens.test.ts`. It is `design-tokens.test.ts`, because it covers more than the scan.
- Changes to the approved plan, which A approved on 2026-11-21: two type families became one; the D-037 exemption for `src/components/ui/` stays until item 6 instead of ending here; the custom line and station glyphs land with LineBadge and StationDot in item 6.
- Item 6 restyles `src/components/ui/`, then removes that exemption. Input uses `--field` and `--field-border`, SegmentedControl bolds the selected label (and becomes a radiogroup), and the app shell adds safe-area padding.
- The canvas still shows `#B25E00`, `#1E7F4F` and off-scale sizes. New artboards use the token values.
- `--layer-*` tokens are used as `z-(--layer-sheet)`. The stock shadcn Drawer still uses `z-50` until item 6.
- Numbering: B's PR #16 uses D-053 for the hypertables, so this entry is D-054. B's #17, #18 and #19 used D-054 to D-056 and were renumbered to D-055 to D-057 when they merged.

**D-055 · 2026-11-21 · Travel time over direct rides, and data scripts run with tsx (Phase 2 item 3).**
Decision:
- `graph.json` holds one entry per pair of stations that a single train serves in order, with the median ride, the expected wait and the routes for each day type and hour bucket. The search runs over stations: a ride costs its wait plus its ride, a ride after another ride adds the station's transfer time, and walks between stations come from `transfers.txt`. This replaces DATA 3.1's (station, route, direction) nodes and supersedes D-047's description of `graph.json`.
- The expected wait is the sum of squared gaps over twice their sum, not half the median gap. A train's gap is the time since the previous departure, capped at an hour.
- Each day type uses the feed date whose set of running subway services is the most common for that day type (Mon 2026-11-16, Sat 2026-11-28 and Sun 2026-11-29 for the current feed).
- `timetable.json` keeps every subway trip with its service, and the services running on each date the feed covers, so the last-train search follows Fridays, diversions and holidays exactly.
- A station's transfer time is the median over its subway platform pairs in `transfers.txt`, and a walk between two stations is the median over their subway platform pairs on different lines. A ride counts departures from every platform at the station.
- The data files' shapes are Zod schemas in `src/lib/gtfs/types.ts`, the types come from them, and readers parse the JSON against them. The hour bucket is checked: 5 to 23 or late.
- `pnpm check:trips` replays the raw timetable for the known trips and fails beyond 3 minutes.
- `pnpm data:*` scripts run with `tsx`, which resolves the `@/` alias, so scripts and the app share `src/lib`. The zip is read with `fflate` and the CSV files are streamed with `csv-parse`.
Why: the MBTA feed has branches that share track: Green B, C and D from Kenmore, and two Red Line branch patterns under one route. A per-route wait made a Kenmore rider wait for one branch when any westbound train would do. Median gaps understated waits where trains are scheduled close together (Kenmore at 6 PM: 0.5 min by median, 3.0 min by the random-arrival formula). Service differs by date: Friday late trips, weekend diversions and Thanksgiving. Node's type stripping doesn't resolve `@/`.
Consequences: seven known trips land within 2.8 minutes of a replay of the raw timetable (PROGRESS, 2026-11-21). The first code-critic pass found commuter-rail and bus transfers inflating North Station and JFK/UMass by about 2.5 minutes. Counting departures from every platform is optimistic where branches use separate platforms (JFK/UMass northbound: 3.1 min against about 6 at 9 PM). After a transfer the model assumes a random wait, while the schedule often times connections, so trips with a transfer come out pessimistic: Savin Hill → North Quincy is 6.0 min modeled for the JFK/UMass walk and wait against 3.5 in the replay. A new feed could push such a trip past 3 minutes, and `pnpm check:trips` would catch it. The late bucket uses the representative Monday, so Friday's later trains don't change it. `graph.json` is about 2.9 MB and `timetable.json` 3.4 MB. Both are server-only, and each regeneration adds them to git history. The travel time still uses one bucket for the whole trip, even when a long trip crosses into the next hour.

**D-056 · 2026-11-21 · Last-train search (Phase 2 item 4).**
Decision:
- `src/lib/lasttrain/search.ts` runs a backward round-based search with at most three rides over the service date's trips in `timetable.json`. It uses the station transfer times and walks from D-055, which `timetable.json` now carries too. Each round keeps a board time and an arrive-by-train time per station, and walks into home count.
- The result says which case applies: a train, no train needed (home is the same station or a walk away), no timetable for that date, or none. A date outside the feed is "no timetable", never "no train home".
- `src/lib/lasttrain/leave-by.ts` takes the plan's last stop (F5.5): `leave_by = departure − walk − 5 min` (F5.2). It flags a plan that starts after the leave-by (F5.3), and gives the walking minutes home when there's no train (F5.7).
- An unknown station is an error, not "no train". A broken trace throws instead of returning partial legs.
- A train result gives `departs` (the last moment to leave the plan's station, possibly the start of a walk) and `firstTrain` (the first train's departure).
- `pnpm check:last-trains [date]` compares three known last trains with the MBTA V3 schedules API.
Why: saying "no train home" for a date with no timetable would be false. Callers need to tell "home is next door" apart from "stranded". code-critic's first pass found that one time per station plus a walked flag mixed "board here" with "walk on from here": the trace could return an impossible connection (Kenmore → Assembly listed a 2-minute change at Park Street, below its 154 s transfer time), and walks into home were skipped, making some leave-by times up to 58 minutes too early.
Consequences: on Monday 2026-11-23, all three match to the second. On Friday 2026-11-20 a Red Line diversion turns trains at Broadway and shuttle buses run to JFK/UMass and North Quincy. The subway-only search (D-006) then reports no train from Harvard to Ashmont while the MBTA lists a 1:30 AM trip to Broadway. F5.6's alert text covers this in Phase 4. Including rail-replacement shuttles is deferred until the end of the project (PROGRESS, Open questions).

Why: saying "no train home" for a date with no timetable would be false. Callers need to tell "home is next door" apart from "stranded".
Consequences: on Monday 2026-11-23, all three match to the second. On Friday 2026-11-20 a Red Line diversion turns trains at Broadway and shuttle buses run to JFK/UMass and North Quincy. The subway-only search (D-006) then reports no train from Harvard to Ashmont while the MBTA lists a 1:30 AM trip to Broadway. F5.6's alert text covers this in Phase 4. Including rail-replacement shuttles is an open question.

**D-057 · 2026-11-21 · Fair options, spot filters and the blocking filter (Phase 2 item 5).**
Decision:
- `rankStations` ranks every station everyone can reach within 75 minutes by `S(d)`, then `sum(t_i)`, then station ID. It runs one travel search per participant over every station.
- `fairOptions` walks down that ranking and keeps the first 3 stations with at least one matching spot within 600 m walking, instead of taking the top 3 stations and then looking for spots.
- Spot filters: an unknown price passes the budget. A spot with a grade must meet the minimum; a spot with no inspection match fails it only in food, coffee and dessert. Bars, clubs and other 21+ spots are dropped once anyone joined is under 21, and the place schema requires bars and clubs to be 21+.
- `fairOptions` checks that every participant's station has a train to board in the hour before the plan's start (`trainsRunning`, D-048), answering "no trains" otherwise. A date past the feed is checked against its day type's representative date, as travel times are. An unknown station is an error.
- When nothing fits, the result names what to relax: one of budget, minimum grade or category (the first whose relaxing gives options), else the fewest that work together (all three relaxed, then dropped from the end while options remain), else time, no trains or spots. The age rule is never relaxed.
- `src/lib/places/types.ts` holds the place schema that `data:places` (item 6) writes.
Why: a top-ranked station with no matching spot isn't an option the UI can show. OpenStreetMap rarely tags prices, so failing unknown prices would empty most results. Parks and museums have no food inspections. F4.6 needs a single constraint to offer relaxing.
Consequences: DATA 3.2 and 3.4 updated. Vibe isn't a filter yet: F4.5 doesn't require it and no place data carries vibe tags (Open questions). Walking down the ranking has no fairness floor beyond 75 minutes, so a strict filter can return an option much less fair than the top station without F4.6 firing; that is within the spec. code-critic's first pass found the missing service check (a 3:30 AM plan got options), unknown stations reported as "time", and a bar marked all-ages passing for under-21 groups. Its second pass found the check looked at the hour after the start, so 3:45–4:59 AM plans still got options. Its third pass found that any train anywhere counted (a 2:30 AM plan for Harvard and Tufts got options from trains finishing their runs elsewhere) and that the named filters could fail together. A real-data check on the walkthrough's demo plan (BU, Harvard and Tufts, Friday 7 PM) puts Government Center first at 26, 19 and 25 minutes.

**D-058 · 2026-11-21 · The fog is a MapLibre custom layer (approach A). Phase 1 item 4.**
Decision:
- three.js draws the fog into MapLibre's own WebGL context as a custom layer (`src/three/fog-layer.ts`), added before the T-line layers. Approach B, a React Three Fiber canvas over the map, is deleted, and `@react-three/fiber` and `@react-three/drei` with it. The first R3F scene adds them back.
- One shader (`src/three/shaders/fog.ts`) samples two density masks, before and after the latest reveal. `src/three/mask.ts` rasterizes them from H3 cell states at 256² over Boston, Cambridge, Somerville and Brookline: fog 255, seen 110, visited 0. Drift is FBM noise, 3 octaves on tier 3 and 2 on tier 2. A reveal burns outward to the farthest pixel that lost fog over `duration.reveal`, with a `--fog-edge` edge. A finger or pointer thins the fog under it.
- Tiers: `detect-gpu` with its benchmark files copied into `public/detect-gpu/` (flag 6). They must be copied again when the package updates. Tier 0–1 and Force 2D get a MapLibre fill layer (fog at 0.92 opacity, seen at 0.45). No WebGL gets an SVG map with the same cells, lines and stations (`src/components/map/fog-fallback.tsx`). The map's pixel ratio is clamped to 1.5 on tier 2 and 2 on tier 3. The fog draws into the map's canvas, so the clamp covers the whole map.
- Reduced motion: the drift stops and a reveal crossfades over `duration.fast` (160 ms). DESIGN section 8 says 200 ms, but no 200 ms token exists and D-054 bans raw durations.
- The map repaints every frame while the fog drifts or a reveal runs, and stops while `document.hidden`. With reduced motion it repaints only for map moves and the crossfade.
- Token colors reach the shader through `getComputedStyle`. The CSS build rewrites them as 3, 4, 6 or 8-digit hex (`--fog-edge` arrives as `#0b7a7573`), so `colorVector` reads every hex length.
Why: F2.3 puts every line and station above the fog. A custom layer draws between the basemap and the lines in one canvas. An overlay canvas covers the lines: in the spike they washed out under the fog. A also uses one WebGL context instead of two and can't lag the map camera, because it draws in the same frame. Performance didn't separate them. `tests/perf/fog-fps.ts`: headed Chromium, Pixel 7 emulation, 4× CPU throttle, 20 s of scripted pans, zooms and reveals, Apple M4 Pro (ANGLE Metal).

| Run | Mean frame | p95 | Frames over 22 ms |
|---|---|---|---|
| A, tier 3 | 1.3 ms | 3 ms | 7 of 15,836 |
| A, tier 2 | 1.3 ms | 3 ms | 6 of 15,340 |
| B, tier 3 | 1.1 ms | 3 ms | 9 of 18,892 |
| B, tier 2 | 1.1 ms | 3 ms | 11 of 18,861 |
| 2D fill, tier 1 | 2.3 ms | 17 ms | 0 of 8,722 |

These runs had vsync off. With vsync on, every run, `about:blank` included, held exactly 30 fps: the Mac was on battery below 20%, where Chromium caps frames at 30. Vsync off shows the real cost of a frame.
Consequences:
- A laptop GPU flatters a phone, and the CPU throttle doesn't slow the GPU (flag 5). The 45 fps gate line passes on this Mac. The real check is the Android phone when A has it (Phase 9 item 2 re-checks on one). drei's `PerformanceMonitor` (DESIGN section 9) doesn't fit a custom layer. If the phone drops frames, the layer measures its own frame time and steps down from tier 3 to tier 2 settings.
- The 2D fill's p95 (17 ms) is higher than the shader's. Not investigated. Recheck on the phone.
- The drift keeps the map repainting at the display rate while the map is open. Measure battery on the phone. Fallback: drift at 30 fps.
- The layer is 2D and north-up: rotation and pitch stay off. Globe projection isn't supported.
- `/design/fog` is the spike's preview page (`noindex`, sample data labeled). `?tier=0` to `?tier=3` overrides detection. Item 6 moves the fog layer and fallback into `/design` with a tier toggle.
- Fog covers the mask area plus 1° on every side. Outside the mask, the shader and the 2D fill draw plain fog. The 2D fill keeps pockets of fog enclosed by uncovered cells (`src/components/map/fill-fog.ts`).
- Left for Phase 3, where the real map is built (from code-critic and design-critic, item 4 review): the 256² mask covers only Boston, Cambridge, Somerville and Brookline and gets blocky past zoom 13, so outer stations (Ashmont, Braintree, Oak Grove, Riverside) can't clear in 3D and street zoom needs a finer or tiled mask; build the mask from a cached pixel-to-cell index (65,536 `latLngToCell` calls take about 30 ms on an M4 Pro); the reveal edge should read as a continuous eased ring like the canvas `onb-reveal` artboard; restyle the map when the theme flips; add fog on `style.load` and keep the latest states for a reveal pressed before load; load three.js only for the shader tiers; fall back to SVG if MapLibre fails to start; fog opacities as tokens (`--fog-thin` is unused); a crossfade for tier 0–1 reveals; style the attribution control (44 px toggle, safe-area inset, night colors, stays expanded); an F2.3 test of the layer order; line names and a live region for screen readers (F2.7).
- Credits: the map's attribution control keeps OpenFreeMap's own credit from its TileJSON, because it also names OpenMapTiles, and adds "Train data: MBTA. Not affiliated with the MBTA." from `src/copy/legal.ts`. The SVG fallback shows the MBTA line in a corner. COPY.md notes the difference from its OpenFreeMap line.
- Numbering: B's open PRs use D-053 to D-056, and #17's D-054 collides with D-054 on `main`. B renumbers on rebase: #17, #18 and #19 take D-055 to D-057, so this entry is D-058.

**D-059 · 2026-11-21 · Base components, first half (Phase 1 item 6a).**
Decision:
- Item 6 ships as two PRs: 6a restyles the shadcn primitives and adds the controls and state components; 6b adds the transit and data components (LineBadge, StationDot, StatCounter, StatTile, Countdown, LeaveByChip, BadgeChip, AvatarStack, ParticipantChip) and the motion demos.
- Buttons have four variants (primary, secondary, ghost, danger) and two sizes: `lg` (56 px, `text-lg`) for primary actions and `md` (44 px, `text-base`). shadcn's `outline` and `link` variants are gone.
- SegmentedControl is a Radix radiogroup (D-054). The theme toggle on `/design` uses it, so its e2e tests look for radios and `aria-checked`.
- The Sheet is vaul's drawer with snap points as fractions of the screen (`sheetSnaps`: 0.3, 0.55, 1), so no raw px reaches the code. The scrim shows from the half snap up.
- The sheet moves on `duration.slow` and `ease.standard` instead of `spring.smooth`: vaul animates with CSS, which has no springs. `globals.css` overrides vaul's own 0.5 s curve, and with reduced motion the sheet fades instead of sliding. Focus moves into the sheet on open, and a tap on the grabber moves to the next snap point (WCAG 2.5.7). The `/design` sheet is modal at every snap; map sheets in Phase 3 decide whether peek stays non-modal (vaul `modal={false}`) so the map takes taps.
- Toasts and the full-height sheet stay below the status bar (`sheet-full` utility, toast offset with the safe-area inset).
- The Toaster mounts once in the root layout, top center, on `--layer-toast`, unstyled sonner with token classes.
- Skeletons are still blocks. No shimmer: it would be one more looping animation with a reduced-motion branch, for little gain.
- `pt-safe` and `pb-safe` utilities in `globals.css` add the safe-area insets. BottomNav and the Sheet use them; the app shell adopts them when the first screens land.
- The token check no longer exempts `src/components/ui/` (D-037, D-054).
- `.claude/worktrees/` (agent worktrees) is ignored by git and ESLint.
Why: the approved item 6 plan, D-054's consequences, and A's request to move faster.

**D-060 · 2026-11-21 · Phase 1 scope cut for the hackathon deadline.**
Decision (A, 2026-11-21): A has about 10 hours left in the hackathon and asked to skip the canvas wherever possible and not run parallel subagents. Phase 1 closes with:
- Item 2 (canvas): stops at the three moods, Onboarding and Map. Ride, Daily, Plans, Me, Squad and System aren't drawn. `/design` and its components are the visual reference for those screens.
- Item 3 (motion storyboards): cut. `/design`'s live demos (count-up, countdown, sheet, toast, reduced-motion switch, fog reveal on `/design/fog`) stand in.
- Item 7 (microcopy): deferred. Each feature adds its strings to `src/copy/` with the feature, and copy-critic reviews them there. `src/copy/badges.ts` and its `[F8.5]` test come with F8.
- Item 8 (visual baselines): deferred to Phase 9.
- The gate keeps the token check, the fog frame-rate and fallback checks, one design-critic and copy-critic pass on `/design`, and both humans' approval of `/design` and the canvas as cut. B's human still confirms direction C.
Why: the hackathon ends in about 10 hours, and the remaining canvas pages and storyboards were the largest part of the 6–8 hours left in Phase 1.
Consequences: features in Phases 3–8 are designed in code against `/design` and DESIGN.md, without a canvas artboard to compare against. design-critic reviews them against DESIGN.md, the Direction and the canvas pages that exist.

**D-061 · 2026-11-21 · Places, grades and their calibration (Phase 2 item 6).**
Decision:
- `pnpm data:places` queries Overpass in a 3 × 3 grid of tiles over a box around every station, caching each tile under `.cache/overpass/`. It tries `overpass-api.de`, then the `maps.mail.ru` mirror, with up to 5 tries when Overpass answers busy (429 or 504). Spots are deduped by name within 50 m, and the kept copy is 21+ if either copy was.
- Under-21 (F1.5): OSM tags some bars as restaurants. A spot is also 21+ when OSM gives `min_age` 21, when its name has a bar word, when OSM tags it as a brewery or hookah, or when it's on a reviewed list ("21st Amendment", "Hurricane's at the Garden", "Lolita", "Club Café"), DATA 2.2. In the current data that hides 72 restaurants and cafes from under-21 profiles, among them Beantown Pub, Dive Bar, Tip Tap Room, Democracy Brewing, both Lolitas, Habibi's Lounge and Tap 151. The rule errs toward hiding: a few are coffee shops or restaurants that aren't bars ("Nine Bar Espresso", "Linden Lounge", "PURO ceviche bar"). "Club" isn't a bar word: it would hide Juliet Social Club and Northeast Eating Club.
- Price: OpenStreetMap carries almost no price tags (none in the current data). Fast food, food courts, ice cream and cafes are "$" by what they are; every other spot's price is unknown and passes the budget filter (D-057).
- Grades come from each active establishment's latest routine inspection, the latest one with no other inspection of that license in the 30 days before it, closures included. Violations cited as failed count, once per distinct inspector comment. Points (2, 5, 10) and cutoffs (A up to 13, B up to 27, C above) stay as DATA 3.6 started them. The selection runs as SQL on the Analyze Boston datastore, and an integration test runs that same SQL on Postgres.
- Matching (DATA 3.7) compares words, not whole names: every distinctive word of the shorter name equal to a word of the other, or a typo away for words of 8 letters or more (Jaro-Winkler 0.9), names equal without spaces, or names that differ only by generic words. The city's counter numbers ("No. 822") are dropped first. Address matches must be within 2 km, and a tie between two licenses is no match. Only food, coffee, dessert, bar and club spots are matched.
Why:
- The plain latest inspection is usually a re-inspection days after a failed one, which marks the same violations "Pass": 4,043 of 4,092 establishments (98.8%) graded A that way. Leaving closures out did the same after a closure: DaCoopas, closed with 8 failed violations, graded A from its pass 8 days later.
- Comparing whole names matched different businesses on a shared first word or prefix: "Monica's Mercato and Salumeria" took Monica's Trattoria's C, "Starbucks" took Star Market's grade, "Boston Döner" took a Dunkin's. Generic compass words made Stetson East and West identical. A wrong grade is worse than "No inspection match" (F11.4).
**Calibration (PHASES Phase 2 gate), Analyze Boston inspections read 2026-11-21:**
- Citywide, the 4,092 active establishments grade A 2,991 (73.1%), B 705 (17.2%) and C 396 (9.7%), with no point changes.
- Of 2,327 spots near stations (OSM data of 2026-11-22T02:19Z), 1,883 are in inspected categories. 809 matched: A 516, B 167, C 126.
- Against the first version, 29 matches were dropped, 6 gained and 4 moved to another license. The dropped ones include every false match found in review and about 20 real businesses whose two names share too little ("Pixlcat Coffee & Butter Mochi" and "Pixlcat Coffee - Upper Level", "Ashur" and "Anshur Restauruant"); those now show "No inspection match".
- The unmatched spots are mostly in Cambridge, Somerville and Brookline, which Boston doesn't inspect.
Consequences:
- DATA 2.2, 2.3, 3.6 and 3.7 updated.
- The budget filter excludes nothing today: every known price is "$" (1) and the smallest budget is 1, so F4.6 can't name budget as the blocker until a price source exists (Open questions). The UI must label "$" for cafes as an estimate.
- In this development environment the Claude Code sandbox blocks `overpass-api.de`, so `data:places` runs with the sandbox off. Reruns read the tile cache and reproduce `places.json` byte for byte, as does a second `data:grades`.

**D-062 · 2026-11-21 · Neighborhood regions (Phase 2 item 7).**
Decision:
- `pnpm data:neighborhoods` builds `data/neighborhoods-h3.json` from Boston's BPDA neighborhood boundaries (Analyze Boston, 26 neighborhoods including the Harbor Islands) and the US Census TIGERweb boundaries of Cambridge, Somerville and Brookline, one region each.
- Each region holds the resolution-9 cells whose centers fall inside it. A cell inside two boundaries goes to the first region listed (Boston's neighborhoods by name, then Cambridge, Somerville, Brookline).
- `src/lib/geo/regions.ts` gives each region's uncovered share, Boston's share as the union of its neighborhoods, and "Beyond" for any other cell, with no share.
Why: DATA named Cambridge and Somerville portals that were never checked, and Brookline had no source. TIGERweb answers for all three in one query and is public domain. Assigning shared cells once keeps each percentage honest.
Consequences:
- 29 regions and 1,593 cells, 1,158 of them in Boston (about 122 km², close to Boston's land area). The smallest neighborhoods, Bay Village and the Leather District, are smaller than one cell and have one cell each, so their percentage jumps from 0 to 100%.
- First Light (F8.2) counts only regions of 3 cells or more, where reaching 50% takes at least 2 cells. Otherwise a home station at South Station or a ride past Arlington would earn it for a neighborhood the person never entered. Only Bay Village and the Leather District are left out. Rides alone can still clear small neighborhoods such as Chinatown; that is the game working, since riding clears fog.
- A region's ID is its name as a slug, and `badges_awarded.scope` stores it for First Light. If BPDA renames a neighborhood, keep its old ID.
- `data:neighborhoods` refuses to write a file in which a region has no cell.
- A rerun reproduces the file byte for byte. DATA section 1 now lists TIGERweb and credits the US Census Bureau.

**D-063 · 2026-11-21 · Check-ins, badges, stats and squads (Phase 2 item 10).**
Decision:
- Check-in validity (DATA 3.9) checks time, then accuracy, then distance, and returns the first failure with its number rounded up. A fuzzy position is reported as fuzzy, not as far away, and a refused 150.3 m never reads "150 m".
- A night badge that compares people needs at least 2 people in its own comparison, not only 2 people checked in anywhere on the plan. First In compares arrivals at the first stop, Long Haul people with a travel time, Closest Call people who caught their last train. Exact ties share.
- Ties: First In goes to everyone within 30 s of the earliest arrival. Fashionably Late goes to everyone within 30 s of the latest who is also 10 minutes late, except people who got First In. Night Owl means a check-in from 12:00 AM to before 5:00 AM New York time.
- The ride home is the first live "I'm on the train" tap or board event after both the person's last valid check-in and the last stop's scheduled time, so neither the ride to the plan nor a ride between crawl stops counts. It counts as catching the last train when it comes before the first train of the last-train trip leaves, or up to 10 minutes after on that same trip (or with a tap that names no trip), with 0 to spare. Closest Call is the smallest of those margins, awarded only once every last train has left plus 10 minutes: night badges are computed at the plan's end and again then, adding awards only.
- Ghost needs at least one person checked in, so a plan called off before anyone arrived gives nobody Ghost.
- A ride's own summary counts its events, replay or not (F3.5). Night and lifetime totals and badges count live ride events only. First Light and percent uncovered follow `revealed_cells`, which replays write under F3.5, so they count replay reveals until Phase 3 decides (Open questions).
- Every Green Branch counts a branch at a station that branch alone serves, from a board, pass or alight event.
- Miles walked counts a walking leg between two checked-in crawl stops instead of both station walks. DATA 3.11 had added the leg on top of `2 × walk_m` for each stop, counting the same street twice. Nights are summed in meters and converted once. Miles on the T sums each ride's miles already rounded to 0.1 mi.
- First Light compares when each person's share of a region reached 50%, from `revealed_cells.first_at`; mates within 30 s share it. Cells revealed by the home station don't count: picking Longwood Medical Area as home would otherwise reach 50% of Longwood at onboarding. A profile with no squad is its own first, and regions under 3 cells don't count (D-062). Awards are only ever added (F8.6), so mates who each earned it before meeting both keep it.
- Squad membership is pairwise and not transitive.
- All of this is pure functions in `src/lib/` (`checkin.ts`, `rides.ts`, `badges.ts`, `stats.ts`, `squad.ts`). Phase 6 reads the rows and writes `badges_awarded`.
Why:
- "First In" among one person, or "Closest Call" with one margin, says nothing.
- The last train often runs late at night, and people tap once seated; a rule of strictly before the timetable would deny the badge to the people it is for.
- A ride from stop 1 to stop 2 of a crawl isn't the ride home.
- A replay is watching a recorded trip, not riding it, so its miles and lines would be false lifetime numbers; its own summary is the trip's.
- A board up to 10 minutes late on a different trip isn't the last train: it can miss the connection home.
- Most rides home happen after the organizer ends the plan, so Closest Call computed at the end would see none.
- Every Green Branch is about the branches; any B, C, D or E train between Kenmore and Government Center would otherwise earn it.
- Taking a badge back after showing it is worse than two people holding a "first".
Consequences:
- DATA 3.9 to 3.11 updated, and DATA 3.12 (squad) added.
- `ride_events.stop_id` may hold a station ID or a platform stop ID; both map to the station through `stations.json`.
- The crawl builder (F10, Phase 7) must store whether each leg between stops is walked, since `plan_stops` doesn't say. Until then, miles walked is exact only for one-stop plans.
- A squad streak (F12.3) needs its own definition of the squad, since mates are pairwise. Decide in Phase 7.
- F8.1 now says the `end-plans` cron recomputes a night's badges once every last train has left plus 10 minutes (Phase 6 builds it).
- Phase 6 shows each badge's number (minutes late, minutes to spare) from the same inputs it passed to `nightAwards`. A late last train has 0 to spare, so the copy needs a wording for it (copy-critic).

**D-064 · 2026-11-21 · Daily puzzle rules, words and events (Phase 2 item 8).**
Decision:
- The puzzle date is the New York calendar date, changing at midnight (`calendarDateOf`), not the 3 AM service date the trains use.
- Feedback marks correct letters first; a repeated letter is present only as often as the answer has it left over.
- A guess must be 5 letters a to z (any case, trimmed) and in `words.json`. No guess is taken after a solve or the sixth guess.
- Solving reveals the event and clears fog; failing reveals the event only (F7.3, F7.7).
- A streak counts consecutive solved dates ending today, or ending yesterday while today's puzzle is still open. A failed or missed day resets it.
- Valid guesses: dwyl/english-words `words_alpha.txt`, The Unlicense, pinned commit, 15,921 five-letter words. It includes rare words, which only makes more guesses valid.
- Events: a hand-written list in `scripts/events/curated.json` with `allAges: true` and a `checked` flag the human sets per event. `data:events` publishes nothing until every entry is checked and valid. An event serves the puzzle date it's on or up to 3 days before it, so a multi-day run can fill a date.
- `events.json` is server-only because it holds the answers.
- `data:events` also refuses a gap between published dates (a date without a puzzle would break every streak) and an answer used twice. Guesses past six are ignored.
- An event can start earlier on its puzzle date than someone solves it (three of the first 14 start before noon). The reveal shows its time, so a late solver sees it has passed. Accepted to keep the list to real, all-ages events.
Why: everyone shares one answer per date (F7.1), so the date must not depend on the server's zone. A human check is the only way to know a real event's date, venue and age policy are right (DATA 2.6).
Consequences: DATA 2.6 and 2.7 and the ARCHITECTURE lib tree and static-data note updated. Rerun `data:events` weekly with a new checked list (DATA 5).


**D-065 · 2026-11-22 · Profile-code restore ships without a rate limit for now (Phase 3 item 1).**
Decision: `restoreProfile` checks the code but doesn't yet limit attempts. D-005 asks for a limit and ARCHITECTURE puts a token-bucket table with restore. That table needs a new migration on B's schema and B applying it to `fogline-db`, so it lands as a follow-up, not in item 1.
Why: the hackathon deadline (D-060). Codes have about 39.6 bits of randomness (8 characters from 31), so guessing one takes on the order of 10^11 tries per existing profile.
Consequences: the limit stays open on the Phase 9 hardening list until it ships. Needs A's sign-off as an accepted risk until then.

**D-066 · 2026-11-21 · Station cards (Phase 2 item 9).**
Decision:
- The card's article is the longest of the 20 nearest Wikipedia articles within 600 m that isn't about transit, a bar or nightclub (F1.5), a violent event, a list or a disambiguation, with an intro of 150 characters or more, and not used by another card. Length stands in for notability; the exclusions keep tragedies and bars off cards everyone sees.
- An image is kept only when it's Creative Commons or public domain, not non-free, and credits an author.
- Gemini writes the sentence from the intro alone. Code checks it: 140 characters, one sentence, no dash between clauses, exclamation mark or COPY.md banned word, and every number must appear in the intro. A failed check retries with the reason, 3 times at most.
- The spot is all-ages, rotating categories by station, grade A first.
- Model: `gemini-3.1-flash-lite` through AI SDK 7 with a 120 s limit per call, retries included. `gemini-2.5-flash` answered 404 ("no longer available to new users"), and the Flash models answered 503 under load or stalled; Flash-Lite answered in about a second. One checked sentence doesn't need a bigger model.
- Wikipedia responses and Gemini answers are cached, so reruns are reproducible and free.
Why: DATA 2.4 asks for one notable article and a fact grounded in it; checks in code keep AI output to the rules COPY.md sets (ARCHITECTURE: AI writes words, never facts beyond the source).
Consequences: DATA 2.4 and ARCHITECTURE updated; `.env.example` names `gemini-3.1-flash-lite`. The demo-line cards are listed in PROGRESS for B's check, and copy-critic reviews the sentences.

**D-067 · 2026-11-22 · Prototype track to 4:00 AM (B's human).**
Decision:
- Until a presentable prototype runs (target 2026-11-22 04:00 ET), each item gets one code-critic pass, and only findings that would break the prototype or show wrong facts are fixed. Docs are updated once at the end of the track. This relaxes CLAUDE.md's "never skip a review" for the track only; the full loop resumes after it, starting with the deferred findings listed in PROGRESS.
- Proposed scope for the prototype, the core loop:
  - a profile with a home station
  - the map with fog (2D)
  - a plan with 2 or 3 friends showing fair options and leave-by times
  - the daily puzzle and its reveal
- Proposed deferrals: live ride mode (F3), live check-ins (F6), badges, recap and 3D (F8, F9), crawls, grades UI and squads (F10–F12), noise (F13), Find it (F14), How it works (F15), demo mode (F16), the Mastra planner, OG images, PWA install, Lighthouse budgets.
Why: B's human set a 4:00 AM deadline for a working prototype. In Phase 2 about 40% of the time went to repeated review passes. Every domain rule the core loop needs is already built and tested.
Consequences: scope and phase order (feature UI before the Phase 1 gate) need A's agreement; see Asks for A in PROGRESS.

**D-068 · 2026-11-22 · Station sheet departures (Phase 3 item 3).**
Decision:
- A departure's destination is the station of its trip's last listed stop, because TripUpdates has no headsign. Directions use MBTA's names per line (DATA 3.13), not "toward downtown" from the canvas sample, since `direction_id` doesn't mean downtown from every station.
- The sheet's steady parts (minutes from home, 3 nearest spots, the stop card once uncovered) come with the map page's data, so the sheet opens with them at once. Live trains come from `/api/mbta/predictions` through TanStack Query, every 30 s while open; polling stops when the tab is hidden.
- `/api/mbta/*` is network-first in the service worker with the last answer as the offline fallback (ARCHITECTURE section 10); every other `/api/*` stays network-only.
- `next.config.ts` traces `data/*.json` into every function, because `src/server/data.ts` reads them at runtime.
- "Ride from here" lands with item 4's ride flow, so item 3 ships no button that leads nowhere.
Why: F2.5 asks for live departures within 2 s and the stop card if seen; the feed's shape decides the rest.
Consequences: DATA 3.13 added. The map page's RSC payload measured 187 KB uncompressed for a new profile, about 40 KB of it the 361 nearby spots; cards come only for uncovered stations. The 110 KB of line shapes in the same payload (code-critic on #32) is the bigger cost. F3.1's trains list reuses the route.

**D-069 · 2026-11-22 · Ride replay timeline (Phase 3 item 4).**
Decision:
- A recorded trip is one `vehicle_positions` row a minute, so a train moves several stops between rows. Every station on the route's shape between two rows counts as passed, timed by its distance between them (DATA 3.14). This settles the "passed" open question.
- The Red Line branch comes from the shape that holds the most stations the trip was seen at.
- A replay lists trips that left the station in the last 24 hours and pass at least three more stops.
- Each stop goes through `recordReplayStop`, which rebuilds the ride on the server from the recorded rows, so the client only sends how far it got. It writes a `ride_events` row with `is_replay` and marks the k=1 cells as seen. D-063 stands: replays clear fog, earn no badges and stay out of night and lifetime totals.
Why: F3.5 needs a ride to work at any hour, and one-a-minute positions can't time each stop directly.
Consequences: live trains (F3.1, F3.2) and train-lost (F3.6) come after the gate. Replaying the same trip twice writes its ride events again; they stay out of totals.

**D-070 · 2026-11-22 · Recap share image (Phase 6, F9.3).**
Decision:
- `/api/og/recap/[planId]` renders with next/og, which can't read CSS variables or Tailwind classes. Its colors live in `src/styles/share-colors.ts`, literal copies of the day tokens kept equal by a unit test, like `theme-color.ts` (D-043). Its sizes are literal.
- The token check exempts `src/styles/share-colors.ts` and that one route file, nothing wider (this extends D-054's exempt list).
- The image is for members only, through `recapForPlan`. Invite-token viewers see the recap page but get no image.
- Ghost is left off the image, because DATA 3.10 keeps it inside the plan's recap. Badges cap at 6 chips with "+N more"; titles, names and the spot line clamp, so nothing clips.
- Hanken Grotesk 400/700/800 static TTFs (OFL) are vendored in `assets/fonts/`, because next/og takes only ttf, otf or woff. The build traces them into the function.
Why: F9.3 wants a 1080×1350 image with the recap's numbers; the three critics' first pass (all FAIL) asked for the Ghost, 21+ and overflow fixes.
Consequences: a new og image reuses `share-colors.ts` and adds its own file to the exempt list.

**D-071 · 2026-11-22 · Squad, crawls and Dinner before (Phase 7, F10.1–F10.3, F10.6, F12.2, F12.3).**
Decision:
- A squad is defined per person: you and your mates (DATA 3.12). The streak counts Monday-to-Sunday weeks with an ended plan you shared with a mate, and an empty current week doesn't break it until the week ends. This settles D-063's open question.
- Crawls follow DATA 3.15: fairness for the first stop only, then a matching spot within 10 minutes by walk or T (known hours first, then the shortest leg), and last trains from the last stop. A crawl is dropped when anyone has to leave before the full stay at the last stop ends, so nobody turns around on arrival. T legs need a train still boarding at that hour.
- Opening hours come from OSM's `opening_hours`, read by a small parser for the common forms (";" replaces, "," adds, as OSM defines); anything else is "unknown" and flagged, as F10.1 allows. 967 of the 1,000 spots with hours parse.
- Dinner before follows DATA 3.16: the fairest food spot within 10 minutes of the venue.
- Vibe and calm (F10.2) aren't crawl filters yet: places carry no vibe tags (D-057), and calm mode (F13) is an Extra.
Why: F10 and F12 left these rules open. Fairness for the first stop and last trains from the last are what F10.3 asks for.
Consequences: the crawl result already says whether each leg is walked. It goes into `plan_stops` with the Phase 7 migration (DATA 3.11).

**D-072 · 2026-11-22 · Calm mode measures a named stretch; Find it shows only spots we know (Phase 8, F13, F14).**
Decision:
- Calm mode (F13.1) measures one stretch the rider names (line, from, to) between Start at the doors closing and Stop at the next station. Rides in the app are replays, played anywhere, so sampling during a replay would label room noise as a train's. Each 250 ms frame becomes one dBFS level on the phone; only the stretch's energy average and peak are sent, through `recordNoise`, which checks the stations are adjacent on that line and allows one reading a minute per profile. Levels are uncalibrated, so they are only shown on a relative scale (quieter, typical, louder by thirds).
- The calm layer (F13.3) is the "Measured by riders" list on `/calm`, not a map layer yet. The sensory preview (F13.5) shows measured sound and the quietest hour, and says "no data" for crowds and the quietest place to wait, which have no source. The calm preference in plans (F13.4) waits for solver work (B).
- Find it and taste of home (F14) ask Gemini for places with a quoted Google Maps review through Maps grounding, then show only names that match a spot in `data/places.json` near a station, so the age, grade and budget rules run on our data (F14.3). A photo is sent to Gemini for that one call and isn't stored. Answers are cached in `ai_cache` by model and prompt. Pins use the SVG map.
Why: honest data (CLAUDE.md: no fake data) and F14.3's filters need fields Gemini doesn't return.
Grounded search uses `GEMINI_GROUNDING_MODEL` (default `gemini-3.5-flash`): on 2026-11-22 Maps grounding returned place data on `gemini-3.5-flash` and `gemini-3.6-flash` (about 40 s), while `gemini-3.1-flash-lite` answered from memory with no grounding data. The quote shown is a line of Google's "Generated Summary" for the place, taken word for word from the grounding data (real review text isn't returned), labeled "Google Maps review summary"; the model's own reply is never shown. Places without a summary are left out.
Consequences: needs `GEMINI_MODEL` (B moved to `gemini-3.7-flash`), optionally `GEMINI_GROUNDING_MODEL`, and a Gemini key with quota; on 2026-11-22 the key answered 429 quota exceeded for every model, so F14 shows "Search isn't available right now" until that's fixed.

**D-073 · 2026-11-22 · Weekly plans (Phase 7, F10.4, F10.5).**
Decision:
- Weekly plans are fair for a group from five campuses (Kendall/MIT, Harvard, BU Central, Northeastern, Medford/Tufts), because the Monday cron runs before anyone joins. Inviting friends copies the plan, and leave-by times then follow the real group.
- "Crawl templates" (F10.4) are a fixed list of stop categories with a start time: dinner, then dessert on Friday at 7 PM; coffee, then museum or show on Saturday at 2 PM; brunch, then a park walk on Sunday at 11 AM. A meal before the week's first puzzle event comes first, named by its hour: breakfast before 11 AM, lunch before 4 PM, dinner after. Titles are headings under six words: the venue when it's short ("Dinner, then Symphony Hall"), "the event" otherwise. The event's title isn't sent, because it can give away a coming day's puzzle word. All are all-ages, and a plan whose stop leaves the data or turns 21+ is hidden.
- `weekly_plans` stores each week's 3 plans, with their stops as JSON. Migration `0004_phase7_weekly_plans` also adds `plan_stops.walked_from_previous` (DATA 3.11).
Why: F10.4 asks for plans "from events and crawl templates" that pass every check, and nothing defined the templates or whose stations to use. B's human chose campus stations over no fairness or cutting the feature.
Consequences: B's human applies migration 0004 to fogline-db. A's plan page has to handle an event ID as a stop's place (ARCHITECTURE section 6 already allows it).

**D-074 · 2026-11-22 · Plan end cron, Remind me and route alerts (Phase 4 leftovers: F6.4, F5.8, F5.6).**
Decision:
- `end-plans` runs every 15 minutes and sets `ended_at` to the rule's time (DATA 3.19), then awards badges.
- "Remind me" is a route handler, `/api/plans/[planId]/remind`, that answers only the signed-in participant, because the file names their last train home.
- Route alerts follow DATA 3.18. An alert that names a station the train stops at between where the person boards and gets off says "Check MBTA alerts" rather than guessing which trains it affects.
- Known limit: Google Calendar's import drops an .ics file's alarms and uses the person's default notifications, and its Android app doesn't open .ics files. Apple Calendar keeps both alarms. The in-app 20 and 5 minute alerts (F5.4) still cover people with the app open.
- The reminder's description names the first train home, its line, station and time ("Last Green Line E from Kenmore is 12:22 AM"), since a trip home can start with a walk to another station.
Why: F6.4, F5.8 and F5.6 were the open Phase 4 server items.
Consequences: A adds the Remind me button and shows `people[].alerts` on the plan page. 

**D-075 · 2026-11-22 · Phase 9 split: PWA polish and UI/UX (A), hardening and release as Phase 10 (B).**
Decision:
- A's human asked that Phase 9 hold only PWA polish and a pass over the whole app's UI and UX, with the rest pushed to a new Phase 10 that B runs.
- Phase 9 (A): `PWA.md`'s polish list and checklist, `design-critic` on every route, screens for server work that has no UI yet (Me stats and badges, recap, weekly plans, Remind me and route alerts, leave-by alerts, plain-English violations), the Phase 3 UI left over (location primer, Settings with delete my data), navigation and screen states, map polish.
- Phase 10 (B): performance, accessibility, security with the rate limits (D-065), copy, WALKTHROUGH, visual baselines (from Phase 1, D-060) and the ship kit. B can start it now; its gate runs last, on the final app.
Why: the hackathon deadline. Both builders work at once instead of one phase waiting on the other.
Consequences: PHASES sections 9 and 10 rewritten, the PROGRESS phase table updated. Earlier decisions that point at "Phase 9" items (D-043, D-044 protected previews, the update toast) stay with Phase 9; performance (D-058's Android check), rate limits (D-065) and visual baselines now belong to Phase 10.

**D-076 · 2026-11-22 · Weekly cron retries; one weekly-plan copy per person (F10.4, F10.5). Replaces D-025's single run.**
Decision:
- The weekly-plans cron runs hourly from 10:00 to 16:00 UTC on Mondays and works from 6 to 11 AM in New York. The 6 AM run makes the plans; the rest are retries that stop when the week's plans exist. F10.4's "6:00 AM Eastern" stays the target.
- "Invite friends" on a weekly plan makes one copy per person. Asking again, from a double tap or another tab, returns that copy until it ends. A transaction-scoped advisory lock keyed on the person and the weekly plan stops two taps at once from both making one.
Why: A's review of #44 found that one failed 6 AM run left the week empty, and that a double tap made two plans.
Consequences: ARCHITECTURE section 11 and DATA 3.17 updated. A copy is recognized by creator, title and start time, so no migration is needed.
