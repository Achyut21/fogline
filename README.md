# Fogline

Boston starts covered in fog. You clear it by riding the T, going out with friends and solving a daily puzzle.

Under the game is a planner for college students without cars. It finds a meetup spot that's fair by T minutes for friends at different campuses, builds crawls, and tells each person when to leave to catch their own last train home.

Built for BostonHacks 2026, "Bos(tons) of Eats and Streets" track. Live at [fogline.boston](https://www.fogline.boston); try it with sample data at [/demo](https://www.fogline.boston/demo).

## What it does

- **Fair plans:** friends pick their home stations, and Fogline ranks meetup stations by how even the T trip is for everyone, not by map distance. Each person sees their own minutes and their own leave-by time for their last train home, from the plan's last stop.
- **Crawls:** 2 to 4 stops, each within 10 minutes of the last by walk or T, open at its time where its hours are known.
- **The fog:** riding, checking in and solving the daily puzzle uncover hexagons of the city. Ride replays lift the fog stop by stop on a recorded train. Squads share a map and a weekly streak.
- **The daily puzzle:** a five-letter word tied to a real event in Boston that day. Solving it reveals the event and offers to plan a night around it.
- **Live night:** check-ins at the spot and the arrival order.
- **Grades:** an unofficial letter grade from City of Boston food inspections, with the violations listed.
- **Calm mode and Find food:** noise measured by riders on each stretch with a sensory preview, and finding a dish from a photo.
- **How it works:** live counts from the database and every data source with its credit.

Facts (times, distances, grades, scores) always come from code. AI only writes words.

## Run it locally

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

### Checks

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

### Data

The static data in `data/` is committed. Rebuild it with the pipelines in `scripts/`, in this order: `pnpm data:gtfs`, `data:places`, `data:grades`, `data:cards`, `data:violations`, `data:neighborhoods`, `data:events`, `data:words`. `docs/DATA.md` describes each one and every algorithm.

## Architecture

- **Next.js 16** App Router, React 19, TypeScript, Tailwind CSS 4 with shadcn/ui, Motion, and three.js for the fog. Installable as a PWA (Serwist).
- **Tiger Cloud** (Postgres with TimescaleDB) through Drizzle. Train positions, check-ins, rides and noise readings are hypertables with compression. How it works shows their live row counts.
- **Solvers in plain TypeScript** (`src/lib/`):
  - travel times over a station graph built from MBTA GTFS;
  - a fairness score `max(t) + 0.5 × (max(t) − min(t))`;
  - a reverse round-based search for each person's last train;
  - the crawl builder;
  - H3 cells for the fog.
- **Vercel** hosting (region iad1, next to the database). Vercel Cron records train positions every minute, ends plans, cleans up demo copies and makes the weekly plans.
- **No accounts:** an anonymous profile in a signed cookie, invite links with tokens, and a profile code to move to another device.
- **Gemini** through the AI SDK for station card facts and Find food. Every AI output is checked or cached before it's shown.

`docs/ARCHITECTURE.md` has the full picture, `docs/PRD.md` the features and acceptance criteria, and `docs/DECISIONS.md` the reasons behind each choice.

## Data and credits

- Train data: MBTA. Not affiliated with the MBTA. Schedules from MBTA GTFS; live positions and predictions from MBTA's realtime feeds.
- Map data © OpenStreetMap contributors. Tiles by OpenFreeMap, styles from OpenMapTiles. Spots from OpenStreetMap through Overpass.
- Unofficial grades from City of Boston inspection records (Analyze Boston). Neighborhood boundaries from the BPDA; Cambridge, Somerville and Brookline from the US Census Bureau (TIGERweb).
- Stop card facts from Wikipedia (CC BY-SA), and photos from Wikimedia Commons with each author and license shown.
- Find food: places and review summaries from Google Maps, through Gemini grounding.
- Puzzle words from dwyl/english-words (The Unlicense). Events are checked by hand against each venue's own listing.
- Font: Hanken Grotesk (SIL Open Font License).

## Team

Built by [@Achyut21](https://github.com/Achyut21) and [@Anand283](https://github.com/Anand283) with Claude Code, coordinated through `docs/PROGRESS.md`.
