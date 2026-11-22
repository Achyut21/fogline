# Fogline data and algorithms

"Checked" means a council research agent confirmed the source on 2026-11-20. "Verify" means nobody has checked it yet. Do that first and update this file.

## 1. Sources

| Source | Access | Status | Used for | Attribution / license |
|---|---|---|---|---|
| MBTA GTFS static: `https://cdn.mbta.com/MBTA_GTFS.zip` | no key | checked | stations, routes, trips, stop times, shapes, transfers, calendars | MBTA developer terms; credit "Data: MBTA" |
| MBTA realtime: `https://cdn.mbta.com/realtime/VehiclePositions_enhanced.json`, `TripUpdates_enhanced.json`, `Alerts_enhanced.json` (also `.pb` and plain `.json`) | no key | checked (all returned 200) | live train positions, predictions, alerts. Per-car crowding (Orange Line) is in `multi_carriage_details`, with a few seconds of lag | MBTA |
| MBTA V3 API: `https://api-v3.mbta.com` | key optional (20 req/min without, 1,000 with; a key can take a day) | checked | optional; prefer the CDN feeds | MBTA |
| MBTA LAMP performance data: `https://performancedata.mbta.com/` | no key | checked | optional: real travel-time medians, replay of past days (daily parquet, subway on-time performance) | MBTA |
| MBTA Open Data Portal (ArcGIS Hub) | no key | checked (dataset list) | Gated Station Entries for crowding by hour (F13). Verify granularity | MBTA |
| Analyze Boston (CKAN): `https://data.boston.gov/api/3/action/` with `datastore_search` and `datastore_search_sql` | no key | checked | Food Establishment Inspections (909,653 rows; fields include `result`, `violdesc`, `viol_level`, `resultdttm`, address), food licenses, neighborhood boundaries (verify dataset) | City of Boston open data; credit "City of Boston" |
| OpenStreetMap via Overpass: `https://overpass-api.de/api/interpreter` | no key, rate-limited | verify usage limits | places near stations (food, bars, activities) | ODbL; credit "© OpenStreetMap contributors" |
| Wikipedia API (geosearch, extracts, page images) and Wikimedia Commons (`imageinfo` + `extmetadata`) | no key | verify | stop-card facts and photos | text CC BY-SA; images per file license; show author and license |
| OpenFreeMap tiles and styles (`https://tiles.openfreemap.org/styles/liberty`) | no key | verify | basemap | credit OpenFreeMap and OpenStreetMap contributors |
| Cambridge and Somerville open data portals | no key | verify | neighborhood boundaries outside Boston (fallback: treat each city as one region) | per portal |
| Gemini API (Google AI Studio) | key | key created | text, vision, Maps grounding (free on 2.5 Flash as of 2026-11-20; verify) | Google terms |

Show every credit on `/how-it-works` and in the map's attribution control. Add "Not affiliated with the MBTA."

## 2. Pipelines (`scripts/`, run with `pnpm data:<name>`)

Every script is idempotent, writes to `data/`, logs counts, and has a unit test for its parsing and transform logic using a small fixture under `tests/fixtures/`.

1. **`data:gtfs`.** Download GTFS. Keep subway routes only: `route_type` 1 (Red, Orange, Blue) and 0 (Green Line B, C, D, E and Mattapan). Build:
   - `stations.json`: parent stations (`location_type = 1`) with coordinates, served routes and child stop IDs.
   - `graph.json`: direct rides between station pairs with their median ride, expected wait and routes per day type and hour bucket, plus transfer and walking times (section 3.1).
   - `timetable.json`: a compact timetable for the last-train search (section 3.3): every subway trip with its service, station pattern and times, plus the services running on each date the feed covers.
   - `shapes.json`: the shape of each canonical route pattern (`route_patterns.txt` typicality 1, so both Red Line branches), plus each station's distance along it (for miles).
2. **`data:places`.** Run an Overpass query within 600 m of each station for:
   - `amenity` in restaurant, cafe, fast_food, bar, pub, nightclub, ice_cream, food_court, biergarten, arts_centre, theatre, cinema;
   - `tourism` in museum, gallery;
   - `leisure=park`.

   Normalize, dedupe, attach every station within 600 m walking with its walking distance (not only the nearest, D-046), and set `age_rule = 21plus` for bar, pub, nightclub and biergarten. Run it once and cache. Don't hit Overpass at runtime.
3. **`data:grades`.** Pull inspections, compute a grade per establishment (section 3.6), match to places (section 3.7), and write the grades and violation lists into `places.json`.
4. **`data:cards`.** For each station:
   - Wikipedia geosearch (600 m radius). Pick one notable non-station article and fetch its intro extract, page image, and the image's author and license.
   - Gemini writes one sentence of 140 characters or fewer using only facts in the extract.
   - Add one nearby spot, preferring grade A and varying the category.

   Write `station-cards.json` with source URLs, then list the cards for the demo lines in `PROGRESS.md` for a human check.
5. **`data:neighborhoods`.** Fill boundaries with H3 resolution-9 cells into `neighborhoods-h3.json` (Boston neighborhoods, plus Cambridge, Somerville and Brookline as regions; cells outside these go into a region called "Beyond").
6. **`data:events`.** A curated, human-checked list of real events for the coming two weeks: title, venue, coordinates, start time, URL, source and a 5-letter puzzle word. All-ages venues only, because everyone shares one daily answer (F7.1) and under-21 profiles never see bars (F1.5). Store facts and links only. Don't copy event descriptions.
7. **`data:words`.** Answers come from the event words. Valid guesses come from an openly licensed English word list (verify the license). Don't copy another game's word list.

## 3. Algorithms (the tests in `tests/unit/` follow these definitions)

### 3.1 Travel time `t(o, d, dayType, hour)`

- **Rides.** For every pair of stations `(a, b)` that one train serves in order (boarding allowed at `a`, alighting at `b`), collect every departure from `a` on a train that later stops at `b`, whatever its route or platform. One train ride is one edge, so a trunk shared by branches (Green B, C and D from Kenmore; both Red Line branches) counts every train that goes your way (D-055). Where branches leave from separate platforms this is optimistic: at JFK/UMass northbound the model's wait to Park Street at 9 PM is 3.1 min, against about 6 min for a rider who picks one platform.
- **Day types:** weekday, Saturday, Sunday. Each uses one representative date from the feed: the date whose set of running subway services is the most common for that day type, so a one-off diversion or holiday doesn't set typical times.
- **Hour buckets:** one per hour from 5 to 23, plus "late" (00:00 to end of service). Buckets count GTFS service-day time: 24:00:00 and later is late, and times before 05:00:00 use the 5 AM bucket (D-048). A bucket doesn't say whether trains run at that moment, so the solvers check service separately.
- **Day type** comes from the day of the week, and only picks which representative travel times to use. Which trips run on a given date (holidays, diversions) always comes from `calendar.txt` plus `calendar_dates.txt` for that date, never from the day type.
- **Ride time** per pair and bucket is the median scheduled ride (arrival at `b` minus departure from `a`).
- **Expected wait** per pair and bucket is the average wait for someone arriving at a random moment: the sum of squared gaps over twice the sum of gaps, where a train's gap is the time since the previous departure (the next one for the first train of the day), capped at an hour. With even service this is half the headway; with uneven service it's longer.
- **Transfers:** before a ride that follows another ride, add the station's transfer time: the median `min_transfer_time` between its subway platforms in `transfers.txt` (commuter-rail platforms and bus bays don't count), or 3 minutes when it has none. Walks between stations listed in `transfers.txt` (Downtown Crossing and Park Street) take the median over their subway platform pairs on different lines (a train already joins the same line's platforms) and add no further transfer time.
- `t(o, d)` is the shortest path from `o` to `d` over these rides and walks for the day type and bucket. It runs on request over `graph.json` (about 125 stations, well under a millisecond) and returns the minutes plus each ride's lines and waits, and the transfer stations: where the trip leaves one train for another, perhaps walking to the next station. F4.4 shows these (D-047, D-055). The bucket must be 5 to 23 or late; anything else is an error.
- **Check before relying on it:** five known trips (for example Harvard to Park Street, Kenmore to Government Center, Medford/Tufts to Park Street) must land within 3 minutes of the MBTA schedule. The reference replays the raw timetable: a rider arriving at each minute of the hour catches the actual next trains, with `transfers.txt` times. `pnpm check:trips` runs it against the committed `graph.json` and fails beyond 3 minutes. Record the comparison in `PROGRESS.md`.

### 3.2 Fair meetup score (F4.3)

- `S(d) = max(t_i) + 0.5 × (max(t_i) − min(t_i))`. Lower is better. Break ties by `sum(t_i)`, then by station ID. `t_i` uses the plan's day type and hour bucket (section 3.1).
- Exclude `d` when any participant can't reach it or any `t_i` is over 75 minutes.
- Walk down the ranking and keep the first 3 stations that have at least one spot within 600 m walking (section 3.5) matching the filters (D-057). Spots are listed nearest first.
- **Filters (F4.5):** category; budget (a spot's price band at most the budget; an unknown price passes and is shown as unknown); minimum grade (A, or A and B): a spot with a grade must meet it, and a spot with no inspection match fails it only in food, coffee and dessert; and the age rule (no bars, clubs or other 21+ spots once any joined participant is under 21, F1.5, F4.9).
- **No trains:** check that every participant's station has a train to board in the hour before the plan's start on its service date, when friends would ride there (D-048). When one doesn't, the answer is "no trains". A date the timetable doesn't cover is checked against its day type's representative date. Only the plan's own service date is read, so a weekend plan just after 3 AM says "no trains" even if the previous night's last trains are still running; that errs on the safe side.
- **Nothing fits (F4.6):** relax one filter at a time, in the order budget, minimum grade, category, and name the first whose relaxing gives options. If none does alone, relax all three and drop them again from the end (category first) while the rest still give options, and name what's left. When no station is within 75 minutes for everyone, the blocker is time; when everything relaxed still gives no spots, it's spots. The age rule is never relaxed. An unknown station is an error.

### 3.3 Last train (F5)

- `timetable.json` holds every subway trip as a station pattern with times in seconds since the service-day origin, the services running on each date the feed covers, and the same transfer times and walks as `graph.json`. GTFS times can pass 86,400 (24:00:00) for after-midnight trips.
- Per the GTFS spec, times count from "noon minus 12 hours" of the service date. That keeps DST-change days correct. Use it when converting to wall-clock time in `America/New_York`.
- **Search:** a backward round-based search (reverse RAPTOR, at most 2 transfers) from the participant's home station `h`, with the end of the service day as the arrival deadline. It finds the latest departure from the plan's station `d` that still reaches `h`. Return the departure time, the trips and the transfer stations.
- Each round keeps two times per station: the latest train to board there, and the latest arrival by train there. The arrival time is the board time minus the station's transfer time, a walk on to another station's board time, or any time when home is that station or a walk from it. Stops marked no pickup or no drop-off are skipped. The route returned is traced through the same rounds, so every connection in it was checked.
- **Results:** a train (the last moment to leave the plan's station, which is the start of a walk when the trip begins with one, the first train's departure, the rides, walks and transfer stations); no train needed (home is the same station or a walk away); no timetable (the date is outside the feed, so the last train isn't known); or none (no train reaches home that night, and the plan shows the walk home, F5.7).
- `leave_by = latest_departure − walk_time(spot → station) − 5 minutes`, using the plan's last stop (F5.5). The builder warns when the plan starts after a participant's leave-by (F5.3). `margin = leave_by − now`.
- A plan whose start time is after midnight and before 3:00 AM belongs to the previous service date (D-047).
- **Check:** three known last trains (for example the last Green Line E from Park Street toward Medford/Tufts on a weekday, the last Red Line from Harvard toward Ashmont, the last Orange Line from Downtown Crossing toward Forest Hills) must match the published timetable. `pnpm check:last-trains [date]` compares them with the MBTA's published schedule (V3 API). Record them in `PROGRESS.md`.

### 3.4 Miles on the T (F3.4, F8.3)

Project the board and alight stops onto the route's shape and sum the haversine distances between consecutive shape points between them. Round to 0.1 mile. `shapes.json` stores each station's distance along each canonical pattern, so a ride's miles are the difference between the alighting and boarding stations on a pattern of that route that passes both in that order (`src/lib/geo/miles.ts`).

### 3.5 Walking distance

`walk_m = haversine(a, b) × 1.25`. Walking time assumes 80 m per minute. Always label the result "about" in the UI.

### 3.6 Grade formula (F11)

- Use the most recent inspection date for each establishment.
- **Points:** `viol_level` "*" = 2, "**" = 5, "***" = 10 (starting values; verify the level values in the data).
- **Grade:** A for 13 points or fewer, B for 14–27, C for 28 or more (the same cutoffs NYC uses).
- **Calibrate:** compute the citywide distribution, record it in `docs/DECISIONS.md`, and adjust points only with a recorded reason. Publish the formula on `/how-it-works`.

### 3.7 Matching inspections to places

1. Normalize names: lowercase, strip punctuation, "&" becomes "and", drop suffixes like "inc" and "llc".
2. Match on street number plus street name when OSM has address tags.
3. Otherwise accept a candidate within 50 m when name similarity is 0.8 or higher (Jaro-Winkler).
4. Unmatched places get no grade (F11.4).

### 3.8 Fog cells (F2, F3, F6, F7)

- H3 resolution 9.
- The home station reveals `gridDisk(k=1)` around the station's cell as seen.
- A ride passing a stop reveals `gridDisk(k=1)` around that station as seen.
- A valid check-in reveals `gridDisk(k=2)` around the spot as visited.
- Solving the puzzle reveals `gridDisk(k=1)` around the venue as seen.
- Visited always wins over seen. Uncovered means seen or visited.
- **Neighborhood percent** = uncovered cells in the neighborhood ÷ all cells in the neighborhood. **Boston percent** uses the union of Boston neighborhoods.

### 3.9 Check-in validity (F6.2)

Valid when the distance from the reported position to the spot is 150 m or less, the reported accuracy is 100 m or better, and the time falls between 30 minutes before the plan's start and the plan's end.

### 3.10 Badge rules (F8)

**Night badges**, computed when a plan ends. Valid check-ins only. Badges that compare people need at least 2 people checked in.

| Badge | Rule |
|---|---|
| First In | earliest check-in at the first stop. Check-ins within 30 s of each other share it |
| Fashionably Late | latest check-in at the first stop, if 10 minutes or more after the start time |
| On the Dot | check-in within 2 minutes of the start time, either side (more than one person can get it) |
| Long Haul | the largest `t_i` to the first stop among people who checked in |
| Closest Call | the smallest positive margin between "I'm on the train" (a tap in live mode, or a recorded board event) and that person's last-train departure |
| Night Owl | any check-in after 12:00 AM |
| Ghost | said yes, never checked in. Shown only inside the plan's recap |
| Planner | the creator, when the plan ends with at least 2 people checked in |

**Explorer badges**, computed whenever cells, ride events or check-ins change:

| Badge | Rule |
|---|---|
| First Light | first squad member to reach 50% uncovered in a neighborhood (one per neighborhood) |
| All Four Lines | board events on Red, Orange, Blue and Green |
| 50 Stations | 50 distinct stations boarded, passed, alighted, or nearest to a valid check-in |
| Every Green Branch | board or pass events on Green-B, Green-C, Green-D and Green-E |

### 3.11 Stats (F8.3)

| Stat | Definition |
|---|---|
| miles on the T | sum of ride miles (section 3.4) |
| miles walked (about) | for each stop with a valid check-in, `2 × walk_m` from the station, plus walking legs between crawl stops |
| stops | board, pass and alight events |
| stations visited | as in 50 Stations, out of the total in `stations.json` |
| percent uncovered | section 3.8 |
| lines ridden | distinct Red, Orange, Blue, Green, Mattapan |
| nights out | ended plans with a valid check-in by the profile |
| last trains caught | "I'm on the train" events before the last-train departure |

## 4. Edge cases every algorithm test covers

- GTFS times of 24:00:00 and later. Service date versus calendar date after midnight.
- DST change days. Tests run with `TZ=America/New_York` pinned.
- Stations with several child stops and platforms (Park Street, Downtown Crossing, Government Center, North Station, Haymarket, State).
- Green Line branches and the shared trunk. Mattapan.
- Unreachable stations, a participant with no home station, a single participant, ties.
- Empty or stale realtime feeds, a trip missing from the feed, shuttle-bus diversions in alerts.
- Geolocation denied, low accuracy, or a position outside Boston.
- Under-21 filtering everywhere places appear.
- Places with unknown opening hours or price.

## 5. Refreshing data

GTFS changes with service changes. Rerun `pnpm data:gtfs` when the MBTA publishes a new feed. Rerun `data:places` and `data:grades` monthly. Rerun `data:events` weekly (curated). Log each regeneration in `PROGRESS.md` with counts.
