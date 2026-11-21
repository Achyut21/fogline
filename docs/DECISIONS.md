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
