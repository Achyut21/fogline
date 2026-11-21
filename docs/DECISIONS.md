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
