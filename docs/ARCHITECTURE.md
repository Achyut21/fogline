# Fogline architecture

Check current docs before using any library API listed here (Context7 or the `docs-lookup` agent). Versions change. Record any deviation from this file in `docs/DECISIONS.md`.

## 1. System overview

```
Phone (PWA)                       Vercel (Next.js, region iad1)                 External
-----------                       ------------------------------                --------
App shell + service worker  --->  Server Components, Server Actions  ------->  Tiger Cloud (Postgres + TimescaleDB, us-east-1)
MapLibre + fog (R3F)        --->  /api/mbta/* (cached proxy, ~5 s)  -------->  MBTA realtime feeds (keyless JSON)
Motion UI, puzzle, plans    --->  /api/og/* (share images), /api/health
                                  /api/cron/record-vehicles (every minute) -->  MBTA VehiclePositions -> hypertable
                                  /api/cron/end-plans (every 15 min)
                                  /api/cron/weekly-plans (Mondays)
                                  /api/cron/cleanup-demo (daily)
                                  Mastra planner + AI SDK (Gemini) ---------->  Gemini API
Static data (JSON, precached) <-- data/*.json built by scripts/ from GTFS, OSM, Analyze Boston, Wikipedia
```

## 2. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js App Router, React, TypeScript strict, pnpm |
| Styling and components | Tailwind CSS, shadcn/ui (cva + `cn()`), vaul (sheets), sonner (toasts), lucide icons |
| Animation | Motion (`motion/react`) |
| 3D | three.js, `@react-three/fiber`, `@react-three/drei`, `detect-gpu` |
| Map | MapLibre GL JS (with `react-map-gl/maplibre` if it fits), OpenFreeMap style, `h3-js` |
| Client data | TanStack Query (polling live data), Zustand (map and ride UI state) |
| Validation | Zod |
| Database | Tiger Cloud, Drizzle ORM, `postgres` driver through Tiger's connection pooler |
| AI | AI SDK + `@ai-sdk/google` (Gemini), Mastra (planner agent) |
| Dates | date-fns with `@date-fns/tz` (or Temporal with a polyfill), always `America/New_York` |
| PWA | `app/manifest.ts`. Service worker through Serwist if it supports the Next.js version and bundler in use; otherwise a hand-written `public/sw.js` following the Next.js PWA guide |
| Share images | `next/og` (`ImageResponse`) |
| Tests | Vitest, React Testing Library, MSW, Playwright, `@axe-core/playwright`, Lighthouse CI |
| Hosting | Vercel Pro, functions in `iad1`, Vercel Cron |

## 3. Folder structure

```
src/
  app/
    (app)/                 # tabbed app shell: map, daily, plans, me
      layout.tsx           # holds MapView, so tab switches never re-mount the map
      page.tsx             # Map tab (sheets over the map)
      daily/  plans/  me/  squad/
    ride/                  # ride mode (full screen)
    p/[planId]/            # plan, join page, live/, recap/
    onboarding/
    design/                # living style guide (Phase 1)
    how-it-works/
    demo/
    api/
      health/route.ts             # { db, timescaledb } booleans, nothing else
      mbta/vehicles/route.ts      # cached proxy of the vehicle feed
      mbta/predictions/route.ts   # cached proxy of trip updates for a station
      og/plan/[planId]/route.tsx
      og/recap/[planId]/route.tsx
      plans/[planId]/reminder/route.ts  # .ics with leave-by alarms (F5.8)
      cron/record-vehicles/route.ts
      cron/end-plans/route.ts
      cron/weekly-plans/route.ts
      cron/cleanup-demo/route.ts
    manifest.ts
    offline/page.tsx
    error.tsx  global-error.tsx  not-found.tsx
    sw.ts                  # service worker source (Serwist)
    serwist/[path]/route.ts  # builds and serves /serwist/sw.js (D-040)
  components/
    ui/        # shadcn primitives, styled with tokens
    map/  ride/  plans/  puzzle/  recap/  badges/  system/
  three/       # scenes/, shaders/, materials/, hooks/
  copy/        # every user-facing string, grouped by feature
  lib/
    time.ts        # America/New_York helpers, GTFS service dates
    gtfs/          # data file schemas (types.ts), whether trains run (service.ts)
    solver/        # travel times, fair meetup scoring, crawl building
    places/        # place schema for data/places.json
    lasttrain/     # backward timetable search
    geo/           # haversine, ride miles, walking estimate, H3 helpers
    grades.ts  badges.ts  stats.ts  puzzle.ts  flags.ts  motion.ts  log.ts
  server/
    db/            # drizzle schema, client, queries
    actions/       # Server Actions (Zod-validated)
    ai/            # Gemini calls, prompts, Mastra agent and tools, eval guard
    mbta.ts        # feed fetch and parse
  styles/
    tokens.css  theme-color.ts   # theme-color.ts: browser-chrome colors for the manifest and meta tags
  app/globals.css      # Tailwind and shadcn base styles (components.json points here)
scripts/           # data pipelines (see docs/DATA.md), run with pnpm data:*
data/              # generated JSON, committed
drizzle/           # migrations, including custom SQL for hypertables
tests/
  unit/  component/  integration/  e2e/  fixtures/   # fixtures: recorded MBTA JSON, small GTFS slices
public/
  icons/  splash/
```

## 4. Rendering and state

- **Server Components** render data pages: plans list, plan detail, recap, how-it-works.
- **Client islands:** MapView with FogLayer, the ride view, the puzzle, the plan builder, live mode, and every 3D scene.
- **Heavy libraries** (MapLibre, three.js, R3F, drei) load with `next/dynamic` and `ssr: false`, after first paint.
- **The server is the source of truth** for profiles, plans, check-ins, cells, badges and stats. Client state holds only UI state (Zustand) and polled live data (TanStack Query).
- **Polling** (F3.2 allows 15 s from a feed change to the screen, F6.3 allows 10 s):
  - vehicles every 5 s while riding;
  - predictions every 30 s while a station sheet or the trains list is open;
  - plan live state every 5 s in live mode.
  - All polling stops when the tab is hidden.
- **Optimistic UI** for check-ins and cell reveals, reconciled with the server response.

## 5. Live MBTA data

- Feeds (no key): `https://cdn.mbta.com/realtime/VehiclePositions_enhanced.json`, `TripUpdates_enhanced.json`, `Alerts_enhanced.json`.
- The browser never calls them directly. `/api/mbta/*` route handlers fetch, parse to small typed shapes, and cache for about 5 s. That keeps payloads small and survives feed hiccups by serving the last good response with its age.
- **Recorder:** Vercel Cron calls `/api/cron/record-vehicles` every minute. It checks the `CRON_SECRET` header, fetches the vehicle feed and inserts subway vehicles into the `vehicle_positions` hypertable. This feeds replay mode (F3.5) and the How it works page (F15).
- The V3 API (`https://api-v3.mbta.com`) is optional. Without a key it allows about 20 requests a minute, so use the CDN feeds.

## 6. Database (Tiger Cloud)

Drizzle owns the regular tables and the hypertables' columns. Allowed values are `text` columns with check constraints rather than Postgres enums, because Drizzle applies every pending migration in one transaction and a new enum value can't be used in the transaction that adds it. Deleting a profile cascades to its cells, badges, puzzle results, check-ins, rides and noise readings. Custom SQL migrations (`drizzle-kit generate --custom`) create hypertables, continuous aggregates, compression and retention.

**Regular tables**
- `profiles`: id (uuid), display_name, school, home_station_id, age_band (`under21` | `21plus`), profile_code (unique), theme_pref (`system` | `light` | `dark`), is_demo, created_at.
- `plans`: id, created_by (set to null when the organizer deletes their data), kind (`meetup` | `crawl`), title, starts_at (timestamptz), ended_at (when the plan ended, for the check-in window; set exactly when status is `ended`), status (`draft` | `planned` | `live` | `ended`), budget (1–3, null for any), vibe (`quiet` | `lively`), calm, min_grade (`A` | `B`, null for any), invite_token, is_demo, created_at.
- `plan_participants`: id, plan_id, profile_id (nullable for placeholders, set to null when the person deletes their data), placeholder_name, origin_station_id, rsvp (`pending` | `yes` | `no`), joined_at. A seat is a joined profile (no name or station on the row: the station is the profile's home station), a placeholder (name and station), or a former member (none of the three, F1.7). A profile sits in a plan once.
- `plan_stops`: plan_id, seq, place_id (text ID from `places.json`, or an event ID from `events.json`), station_id, scheduled_at.
- `revealed_cells`: profile_id, h3 (text), state (`seen` | `visited`), source (`home` | `ride` | `checkin` | `puzzle`), first_at. Primary key (profile_id, h3).
- `badges_awarded`: id, profile_id, badge_id, plan_id (nullable), scope (nullable: the neighborhood for First Light), awarded_at, meta (jsonb). Unique `NULLS NOT DISTINCT (profile_id, badge_id, plan_id, scope)` for idempotency. A plain unique constraint treats NULLs as distinct and would let explorer badges duplicate.
- `daily_puzzles`: date (America/New_York), word, event_id (text ID from `events.json`).
- `puzzle_results`: profile_id, date, guesses (jsonb), solved, solved_at (set exactly when solved).
- `ai_cache`: key, model, output (jsonb), created_at.
- Rate limits (sections 9 and 14) get a token-bucket table when the first limited route lands: profile-code restore in Phase 3.

**Hypertables (time column first)**
- `vehicle_positions`: ts, vehicle_id, trip_id, route_id, direction_id, stop_id, current_status, lat, lon, bearing, occupancy (jsonb, per-car when present). Unique on (vehicle_id, ts).
- `checkins`: ts, profile_id, plan_id, place_id, lat, lon, accuracy_m, valid, is_demo.
- `ride_events`: ts, profile_id, plan_id (nullable), trip_id, route_id, stop_id, event (`board` | `pass` | `alight` | `on_train`), is_replay, is_demo. `on_train` is the "I'm on the train" tap in live mode.

Places and events aren't tables. They live in `data/places.json` and `data/events.json`, and rows refer to them by their text IDs (D-046). Unique indexes on a hypertable must include `ts`, so nothing in the schema stops a second check-in: the check-in action skips it, and queries use each person's earliest valid check-in per stop. Row counts and continuous aggregates leave out `is_demo` rows (F16.2).
- `noise_readings` (F13): ts, profile_id, route_id, from_stop_id, to_stop_id, db_avg, db_peak, is_demo.

**Continuous aggregates**
- `segment_noise_hourly`: avg and peak per segment per hour (F13).
- `vehicle_activity_5m`: vehicles seen per route per 5 minutes (How it works).
- `checkins_daily`: check-ins per day (How it works).

**Policies:** compress `vehicle_positions` after 1 day and keep it 30 days. Compress the other hypertables after 7 days.

Migration `0003_hypertables` sets these up (D-053). Chunks are 1 day for `vehicle_positions` and 7 days for the others. Columnstore segments by `route_id` (`vehicle_positions`, `noise_readings`) and `profile_id` (`ride_events`); `checkins` isn't segmented, because a plan has too few check-ins per chunk to compress well. Everything is ordered by `ts DESC`. The hypertables' foreign keys cascade from `profiles` and `plans` like the regular tables (a deleted plan only clears `ride_events.plan_id`), so deleting a profile reaches compressed chunks too. `vehicle_positions` is unique on `(vehicle_id, ts)`, so a duplicated recorder run adds nothing. The continuous aggregates refresh over windows of days and use real-time aggregation: reads add raw rows newer than the last refresh. `checkins_daily` buckets by New York day, and `checkins_daily` and `segment_noise_hourly` leave out demo rows.

**Connections:** use Tiger's pooled connection string in `DATABASE_URL`. Keep the driver's connection count low (serverless).

## 7. Static data

Built by `scripts/` (see `docs/DATA.md`), committed under `data/`, imported by server code, and precached by the service worker where the client needs them:
- `stations.json`, `graph.json` (direct rides with median ride times, expected waits and routes by day type and hour, plus transfer and walk times), `timetable.json` (compact departures for last-train search), `shapes.json`;
- `places.json`, `station-cards.json`, `neighborhoods-h3.json`, `events.json`, `words.json`.

Keep each client-facing file small. Split by line or load lazily where needed. `graph.json` (about 2.9 MB) and `timetable.json` (about 3.4 MB) are server-only: the solvers run on the server.

## 8. Server Actions and routes

**Server Actions** (all Zod-validated, all check that the caller's profile may act on the target):
- `createProfile`, `updateProfile`, `restoreProfile(code)`, `deleteMyData`;
- `revealCells`, `recordRideEvent`;
- `createPlan`, `joinPlan`, `rsvp`, `startLive`, `checkIn`, `endPlan`;
- `submitGuess`, `recordNoise`.

**Route handlers:** listed in the folder structure. Every handler validates params with Zod and returns typed JSON.

## 9. AI boundaries

- Gemini runs through the AI SDK Google provider. Model IDs come from env (`GEMINI_MODEL`). Use the Flash tier for speed. Maps grounding has been free on 2.5 Flash; check current terms in AI Studio.
- AI writes words: stop-card facts (grounded in the Wikipedia extract), plain-English violation summaries, vibe tags, plan blurbs, dish identification (F14).
- AI never produces the facts shown as numbers or verdicts: times, distances, grades, fairness scores, leave-by times, badges. Those come from code.
- **Mastra planner agent:** its tools are `solveFairMeetup`, `buildCrawl`, `lastTrains`, `searchPlaces` and `gradeFor`. It picks among valid options and writes the blurb. An eval guard extracts every number from the agent's text and rejects the output if any number doesn't match a tool result.
- Every AI output is cached (`ai_cache`, or built into `data/` files). Demo mode uses only cached output.
- AI routes are rate-limited per profile and per IP (a token bucket in the database is enough).

## 10. PWA

See `docs/PWA.md`. In short:
- Manifest in `app/manifest.ts`, with iOS meta tags and splash screens.
- The service worker precaches the app shell and the static data, and caches images and map tiles at runtime within limits.
- `/api/*` is network-only for now (D-040). Phase 3 adds a network-first rule for `/api/mbta/*` with a stale fallback that shows its age, placed before the `/api/*` rule.
- An offline page, and an update toast when a new version is ready.

## 11. Environment variables

See `.env.example`. Secrets stay server-side. Only `NEXT_PUBLIC_*` values reach the browser, and those are never secret.
- `SESSION_SECRET` signs the profile cookie.
- `NEXT_PUBLIC_FLAGS` turns on unfinished features by ID, for example `F1,F2` (`src/lib/flags.ts`).
- `DATABASE_URL_TEST` points integration tests at a throwaway TimescaleDB (a container in CI), never at `fogline-db`.

## 12. Deployment

- The Vercel project is linked to the GitHub repo. Every PR gets a preview deployment. `main` deploys to production.
- Set the environment variables in Vercel for Production and Preview.
- Run functions in region `iad1`, near Tiger's us-east-1 (`regions` in `vercel.json`).
- Crons run in UTC and only on production deployments. `vercel.json` can't disable an entry, so each cron is added when its route exists:
  - `record-vehicles` every minute (Phase 3, Pro plan);
  - `end-plans` every 15 minutes (Phase 4);
  - `cleanup-demo` daily (Phase 5);
  - `weekly-plans` at 10:00 and 11:00 UTC on Mondays (Phase 7). The handler runs only when it's 6 AM in New York, which covers both EST and EDT.
- Every generated deployment URL, preview or production, is behind Vercel Authentication. Only the production domain `fogline-mu.vercel.app` is public. Automated checks against a protected URL send the Protection Bypass for Automation secret, stored as a GitHub Actions secret.
- After a deployment, the read-only e2e specs run against it in GitHub Actions (TESTING.md, CI). Vercel's `vercel.deployment.success` `repository_dispatch` event is meant to start that run, but it hasn't arrived for this repo yet. Until it does, a builder starts the run with `gh workflow run deployment.yml` (D-043).
- `main` is protected: changes arrive through PRs, the CI `check` job and the Vercel build must pass, the history stays linear (squash merges), and force-pushes and deletion are blocked. Admins can override in an emergency.
- Custom domain: the GoDaddy Registry domain is added in Vercel, with DNS records copied into GoDaddy.

## 13. Errors and observability

- Each route segment has an `error.tsx` and a `loading.tsx`.
- Server-side errors go through `src/lib/log.ts`, a thin wrapper that adds context. No `console.log` elsewhere.
- Vercel logs and Speed Insights for real-user web vitals.

## 14. Security

- Zod on every input. Authorization checks on every action (profile ID from the signed httpOnly cookie, never from the client body).
- Plan pages, Open Graph images, reminders and recaps need the participant cookie or the plan's invite token.
- The cron routes require `CRON_SECRET`.
- Rate limits on AI routes and on profile-code restore attempts.
- Image domains allowlisted (e.g. `upload.wikimedia.org`).
- Run the `security-review` skill before the final release.
