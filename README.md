# Fogline

Boston starts covered in fog. You clear it by riding the T, going out with friends and solving a daily puzzle.

Under the game is a planner for college students without cars. It finds a meetup spot that's fair by T minutes for friends at different campuses, builds crawls, and tells each person when to leave to catch their own last train home.

Built for BostonHacks 2026, "Bos(tons) of Eats and Streets" track. Live at [fogline.boston](https://www.fogline.boston). Try it with sample data at [fogline.boston/demo](https://www.fogline.boston/demo).


https://github.com/user-attachments/assets/3f57cc7e-6f7d-48b2-a177-bb6a465d9e83


## Contents

- [Features](#features)
  - [Start in 30 seconds](#start-in-30-seconds)
  - [The fog map](#the-fog-map)
  - [Station sheets](#station-sheets)
  - [Ride replay](#ride-replay)
  - [Fair plans and the last train home](#fair-plans-and-the-last-train-home)
  - [Crawls](#crawls)
  - [The daily puzzle](#the-daily-puzzle)
  - [The night recap](#the-night-recap)
  - [How it works](#how-it-works)
  - [Also in the app](#also-in-the-app)
- [Technical](#technical)
  - [Architecture](#architecture)
  - [The algorithms](#the-algorithms)
  - [Data and credits](#data-and-credits)
  - [Run it locally](#run-it-locally)
  - [Tests](#tests)
  - [Deployment](#deployment)
- [Team](#team)

## Features

Every clip below is the real app at phone size, in demo mode, with sample people (Maya, Priya and Sam).

### Start in 30 seconds

No account. Type your first name, pick your school and your home station (Fogline suggests the nearest one), and say whether you're under 21. The fog around your home station clears and you land on the map.

To use the same profile on another phone, copy your profile code from Me and enter it under Restore profile.

<p align="center"><img src="docs/readme/onboarding.gif" width="270" alt="Onboarding: name, school, home station, age, then the map" /></p>

### The fog map

Boston starts under fog, with the T lines drawn over it. The big number is how much of the city you've uncovered.

Switch to **List** to see each neighborhood's share and every station, uncovered or still in fog. Tap a station on the map or in the list to open it.

<p align="center"><img src="docs/readme/map.gif" width="270" alt="The fog map and the neighborhood list" /></p>

### Station sheets

A station's sheet shows the next trains live from the MBTA, by direction, with how old the times are. Pull it up to see the stop card (a fact about the area from Wikipedia, with its photo credit) and the three closest spots.

<p align="center"><img src="docs/readme/station.gif" width="270" alt="Kenmore's sheet with live trains, its stop card and nearby spots" /></p>

### Ride replay

Pick a station, then a train the MBTA tracked there in the last 24 hours. Watch it move stop by stop at up to 20× speed. Each stop clears the fog around it and shows its stop card. At the end you get the miles, stops and new cells.

<p align="center"><img src="docs/readme/ride.gif" width="270" alt="A recorded Green Line train passing Kenmore, Fenway and Longwood" /></p>

### Fair plans and the last train home

Plans → New plan. Add friends and their home stations, pick what kind of spot, and tap **Find fair spots**. Fogline scores each meetup station by its longest ride plus half the gap between the longest and shortest, so nobody gets stuck with the 50-minute trip. Each spot near the station shows its unofficial grade from City of Boston food inspections, with the violations a tap away.

Choose one and share the invite link. Everyone sees their own minutes and their own **Leave by** time for their last train home. If an MBTA alert touches someone's way home, the plan shows it. **Remind me** saves a calendar event with alarms 20 and 5 minutes before you have to leave.

<p align="center"><img src="docs/readme/plan.gif" width="270" alt="Adding Sam at Davis, the fairest options, and the plan with everyone's leave-by time" /></p>

### Crawls

Switch the builder to **Crawl** and pick 2 to 4 kinds of stop. Each stop is within 10 minutes of the last by walk or T, and open when you get there where its hours are known. The last train home is worked out from the last stop.

Every Monday the Plans tab also suggests up to 3 fair plans for the week, usually including a meal before a Boston event.

<p align="center"><img src="docs/readme/crawl.gif" width="270" alt="A two-stop crawl: food, then dessert" /></p>

### The daily puzzle

Guess the 5-letter word in six tries. The answer is tied to something happening in Boston that day. Solving it reveals the event, clears the fog around the venue and offers **Plan it**, which starts a plan with the event as the destination.

<p align="center"><img src="docs/readme/daily.gif" width="270" alt="Guessing CRANE, STOUT and then NOTES, which reveals tonight's event" /></p>

### The night recap

When a plan ends, the recap shows who got there first, the night in numbers (new cells, miles on the T, miles walked, stops) and the badges people earned. **Share the recap** makes an image for the group chat. Tap anywhere to skip the animation.

<p align="center"><img src="docs/readme/recap.gif" width="270" alt="The podium, the night in numbers and the badges" /></p>

### How it works

How it works shows live row counts from the database (train positions, check-ins, rides, noise readings), how long the fair-spot solver took, and every data source with its credit.

<p align="center"><img src="docs/readme/how.gif" width="270" alt="Live numbers from the database and every data source with its credit" /></p>

### Also in the app

- **Live night and check-in:** during a plan, check in at the spot (your location is checked once, when you tap). Everyone sees the arrival order live, and a countdown runs to each person's leave-by time, with in-app alerts at 20 and 5 minutes.
- **Me:** your share of Boston, miles on the T, stations, nights out, and the badges you've earned. Settings has the theme, a 2D map switch, your age band and **Delete my data**.
- **Squad:** friends you've gone out with share a map of the nights you spent together and a weekly streak.
- **Calm mode:** measure how loud a stretch of the T is with your phone's microphone. Only the average and peak loudness leave the phone, never audio. Riders' readings build a sensory preview for each stretch.
- **Find food:** search a cuisine ("Sichuan", "Lagos") or upload a photo of a dish, and Fogline finds places near the T, quoting Google Maps review summaries.
- **Demo mode:** [/demo](https://www.fogline.boston/demo) gives every visitor their own copy of a sample profile with friends, an ended night and a recap. Everything in it is labeled Demo.
- **Install:** add Fogline to your home screen on iPhone or Android. It works offline for screens you've opened, and train times fall back to the last answer with its age.

## Technical

### Architecture

- **Next.js 16** App Router, React 19, TypeScript, Tailwind CSS 4 with shadcn/ui, Motion, and three.js for the fog, with a 2D fallback. MapLibre with OpenFreeMap tiles. Installable as a PWA (Serwist).
- **Tiger Cloud** (Postgres with TimescaleDB) through Drizzle. Train positions, check-ins, rides and noise readings are hypertables with compression. How it works shows their live row counts.
- **Solvers in plain TypeScript** (`src/lib/`), tested against the real schedule. See [The algorithms](#the-algorithms).
- **Vercel** hosting (region iad1, next to the database). Vercel Cron records train positions every minute, ends plans, cleans up demo copies and makes the weekly plans.
- **No accounts:** an anonymous profile in a signed cookie, invite links with tokens, and a profile code to move to another device.
- **Gemini** through the AI SDK for station card sentences and Find food. AI only writes words. Times, distances, grades and scores always come from code, and every AI output is checked or cached before it's shown.

`docs/ARCHITECTURE.md` has the full picture, `docs/PRD.md` the features and acceptance criteria, `docs/DATA.md` every data source and algorithm, and `docs/DECISIONS.md` the reasons behind each choice.

### The algorithms

- **Travel times:** a station graph built from MBTA GTFS, with travel times per day type and hour.
- **Fairness:** each meetup station scores `max(t) + 0.5 × (max(t) − min(t))` over everyone's T minutes, so the slowest trip and the gap between trips both count. Lowest wins.
- **Last train:** a backward round-based search (reverse RAPTOR, at most 2 transfers) from each person's home station, with the end of the service day as the deadline. It finds the latest departure from the plan's last stop that still gets them home. Trips past midnight belong to the previous service date.
- **Crawls:** each next stop within 10 minutes by walk or T, open at its time where OpenStreetMap hours parse, and the last train worked out from the last stop.
- **The fog:** H3 cells at resolution 9. Your home station and every stop a ride passes clear the ring around them, a check-in clears two rings around the spot, and solving the puzzle clears the ring around the venue.

### Data and credits

- Train data: MBTA. Not affiliated with the MBTA. Schedules from MBTA GTFS; live positions and predictions from MBTA's realtime feeds.
- Map data © OpenStreetMap contributors. Tiles by OpenFreeMap, styles from OpenMapTiles. Spots from OpenStreetMap through Overpass.
- Unofficial grades from City of Boston inspection records (Analyze Boston). Neighborhood boundaries from the BPDA; Cambridge, Somerville and Brookline from the US Census Bureau (TIGERweb).
- Stop card facts from Wikipedia (CC BY-SA), and photos from Wikimedia Commons with each author and license shown.
- Find food: places and review summaries from Google Maps, through Gemini grounding.
- Puzzle words from dwyl/english-words (The Unlicense). Events are checked by hand against each venue's own listing.
- Font: Hanken Grotesk (SIL Open Font License).

### Run it locally

Requires Node 24 and pnpm.

```bash
pnpm install
cp .env.example .env   # fill in the values; never commit .env
pnpm dev               # http://localhost:3000
```

`.env.example` lists every variable. The app needs `DATABASE_URL` (Postgres with TimescaleDB), `SESSION_SECRET` and `CRON_SECRET`. Gemini features need `GOOGLE_GENERATIVE_AI_API_KEY` and `GEMINI_MODEL`.

Apply migrations to a database by naming it on the command line, so the URL stays out of `.env`:

```bash
MIGRATE_DATABASE_URL=<postgres url> pnpm db:migrate
```

The static data in `data/` is committed. Rebuild it with the pipelines in `scripts/`, in this order: `pnpm data:gtfs`, `data:places`, `data:grades`, `data:cards`, `data:violations`, `data:neighborhoods`, `data:events`, `data:words`.

### Tests

```bash
pnpm typecheck
pnpm lint
pnpm test        # unit, component and integration
pnpm test:e2e    # Playwright on desktop Chrome, iPhone and Pixel
```

Integration tests run against a throwaway TimescaleDB and are skipped when `DATABASE_URL_TEST` isn't set:

```bash
docker run -d --rm --name fogline-tsdb-test -e POSTGRES_PASSWORD=postgres -p 54329:5432 timescale/timescaledb:2.32.1-pg18
DATABASE_URL_TEST=postgres://postgres:postgres@localhost:54329/postgres pnpm test
```

Test names carry the acceptance criterion they cover, for example `[F4.3]`, so `docs/PRD.md` maps straight to the suite.

### Deployment

Pushes to `main` deploy to Vercel, and every pull request gets a preview. CI runs typecheck, lint, format, the unit and integration suites and the e2e suite on three devices, then checks the production deployment.

## Team

Built by [@Achyut21](https://github.com/Achyut21) and [@Anand283](https://github.com/Anand283) with Claude Code, coordinated through `docs/PROGRESS.md`.
