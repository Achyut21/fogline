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
| Analyze Boston (CKAN): `https://data.boston.gov/api/3/action/` with `datastore_search` and `datastore_search_sql` | no key | checked | Food Establishment Inspections (909,653 rows; fields include `result`, `violdesc`, `viol_level`, `resultdttm`, address), food licenses, BPDA neighborhood boundaries (`bpda-neighborhood-boundaries`, ODC-PDDL) | City of Boston open data; credit "City of Boston" |
| OpenStreetMap via Overpass: `https://overpass-api.de/api/interpreter` | no key, rate-limited | verify usage limits | places near stations (food, bars, activities) | ODbL; credit "© OpenStreetMap contributors" |
| Wikipedia API (geosearch, extracts, page images) and Wikimedia Commons (`imageinfo` + `extmetadata`) | no key | verify | stop-card facts and photos | text CC BY-SA; images per file license; show author and license |
| OpenFreeMap tiles and styles (`https://tiles.openfreemap.org/styles/liberty`) | no key | verify | basemap | credit OpenFreeMap and OpenStreetMap contributors |
| US Census TIGERweb (`tigerweb.geo.census.gov`, county subdivisions) | no key | checked | Cambridge, Somerville and Brookline boundaries, each one region | public domain (US government); credit "US Census Bureau" |
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

   `pnpm data:places [--refresh]` queries a box around every station in a 3 × 3 grid of tiles and caches each tile under `.cache/overpass/`, so a rerun fetches only missing tiles (`--refresh` fetches them all again). It tries `overpass-api.de` first, then the `maps.mail.ru` mirror, retrying when Overpass says it's busy (429 or 504). It never calls Overpass at runtime. Named spots only. Each spot keeps every station within 600 m walking with its walking distance, nearest first (D-046); spots near no station are dropped. A spot mapped twice (a point and its building) within 50 m under the same name is kept once, the copy with more tags, and it's 21+ if either copy is. Categories: food (restaurant, fast_food, food_court), coffee (cafe), dessert (ice_cream), bar (bar, pub, biergarten), club (nightclub), culture (arts_centre, theatre, cinema, museum, gallery) and park. `age_rule = 21plus` for bars and clubs, and for other spots that are bars in practice: OSM `min_age` of 21 or more, a name with a bar word (pub, bar, tavern, tap, taproom, tap room, saloon, lounge, spirits, hookah, brewing, brewery, brewpub, beer hall, beer garden, biergarten, alehouse, ale house, speakeasy, cocktail; a juice, salad, oyster, sushi, coffee or similar bar doesn't count, though another bar word in the same name does), an OSM brewery or hookah tag, or a reviewed list (D-061). OpenStreetMap carries almost no prices: fast food, food courts, ice cream and cafes are "$", every other spot's price is unknown (D-061). `places.json` is written one spot per line.
3. **`data:grades`.** Pull inspections from Analyze Boston's datastore SQL, compute a grade per active establishment (section 3.6), match food, coffee, dessert, bar and club spots to them (section 3.7), and write the grades, license numbers and violation lists into `places.json`. Run it after `data:places`, which writes every grade as null.
4. **`data:cards`.** For each station:
   - Wikipedia geosearch (600 m radius). Pick one notable non-station article and fetch its intro extract, page image, and the image's author and license. Notable means the longest of the 20 nearest articles within 600 m that isn't about transit (station, line, tunnel, bus and the like), a bar or nightclub (F1.5), a violent event (bombing, shooting and the like), a list or a disambiguation, with an intro of 150 characters or more, and not already on another station's card. When an article yields no good sentence, the next one is tried, up to 3.
   - The image is kept only when it's Creative Commons or public domain, not marked non-free, and has an author to credit. The card stores its URL, file page, author, license and license link.
   - Gemini writes one sentence of 140 characters or fewer using only facts in the extract. The sentence is checked: one sentence, ending with a period, no dash between clauses or exclamation mark, none of COPY.md's banned words, and every number in it present in the intro, so the AI adds no facts. A failed check asks again with the reason, up to 3 times; with no good sentence the card has no story and no image.
   - Add one nearby all-ages spot (cards are the same for everyone, F1.5): categories rotate by station (food, coffee, culture, dessert, park), grade A first, then ungraded, then B and C, each nearest first.

   Wikipedia responses are cached under `.cache/wiki/` and Gemini answers under `.cache/cards/` by model and prompt, so a rerun makes no new calls and gives the same file. Wikipedia is called with a generic client name. The model comes from `GEMINI_MODEL`; the package script loads `.env` itself. Write `station-cards.json` with source URLs, then list the cards for the demo lines in `PROGRESS.md` for a human check.
5. **`data:neighborhoods`.** Fill boundaries with H3 resolution-9 cells (cell centers inside the boundary) into `neighborhoods-h3.json`: Boston's 26 BPDA neighborhoods from Analyze Boston, then Cambridge, Somerville and Brookline as one region each from TIGERweb. A cell belongs to the first region listed that contains it, so no cell counts twice. Cells outside every region are "Beyond", which has no percentage (D-062).
6. **`data:events`.** A curated, human-checked list of real events for the coming two weeks: title, venue, coordinates, start time, URL, source and a 5-letter puzzle word. All-ages venues only, because everyone shares one daily answer (F7.1) and under-21 profiles never see bars (F1.5). Store facts and links only. Don't copy event descriptions. The list is `scripts/events/curated.json`; a person opens each link, confirms the date, time, venue and age policy, then sets `"checked": true`. `pnpm data:events` refuses to write anything while an entry is unchecked, two events share a date, an answer isn't in `words.json`, an event starts before its puzzle date or more than 3 days after it, or a venue is more than 600 m walking from a station. It adds the nearest station and writes `data/events.json` (D-064).
7. **`data:words`.** Answers come from the event words. Valid guesses are every 5-letter word in dwyl/english-words' `words_alpha.txt` (The Unlicense, public domain), pinned to commit `20f5cc9b` so a rerun gives the same 15,921 words. Not another game's list (D-064).

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

- Use each active establishment's latest routine inspection: the latest inspection with no other inspection of that license in the 30 days before it. Closures (`HE_VolClos`, `HE_Closure`) and failed re-inspections (`HE_FAILNOR`) are inspections; not-required, out-of-business, miscellaneous, hold and data-error rows are not. A re-inspection days after a failed one marks the same violations "Pass", so the plain latest inspection would grade almost everyone A (D-061).
- **Points:** violations cited as failed (`viol_status` "Fail") at that inspection, by `viol_level`: "*" = 2, "**" = 5, "***" = 10. The data uses exactly these three levels. A violation counts once for each distinct inspector comment on it, and once when no row has a comment.
- **Grade:** A for 13 points or fewer, B for 14–27, C for 28 or more (the same cutoffs NYC uses).
- **Calibrate:** compute the citywide distribution, record it in `docs/DECISIONS.md`, and adjust points only with a recorded reason. Publish the formula on `/how-it-works`.

### 3.7 Matching inspections to places

1. Normalize names: lowercase, no accents, no counter number at the end (the city's "No. 822", "SpaceNo. 13", "Space No. 8", "(StoreNo. 80845)"), strip punctuation, "&" becomes "and", drop suffixes like "inc" and "llc". A name's distinctive words are its words of four letters or more, made singular, without generic words that say what or where a place is ("cafe", "grill", "pizza", "boston", "newbury" and the like).
2. Two names are the same business when any of these holds:
   - they're equal once spaces are removed ("Gong Cha" and "Gongcha");
   - one name's words all appear in the other, whose extra words are generic ("Thai Place" and "Thai Place Restaurant");
   - every distinctive word of the name with fewer of them is spelled alike by a word of the other ("Starbucks" and "BREADWINNERS/STARBUCK'S"). Alike means equal, or a typo apart: both 8 letters or more, at most 2 letters apart in length, Jaro-Winkler 0.9 or more. Shorter words must be equal, since a shared prefix lifts short pairs past 0.9 ("Mario" and "Maria").
3. Match on house number plus street name when OSM has both, within 2 km (city geocodes can be a kilometer off; the same address in another city is farther). Streets are compared in one spelling: a leading direction and the suffix abbreviated the way the city writes them (West → w, Plaza → plz for "PZ", Boulevard → blvd for "BL", Way, Wharf, Highway, Parkway, Park and the usual street, avenue, road).
4. Otherwise accept a candidate within 50 m. The most similar name (Jaro-Winkler on the names without generic words) wins, and a tie between two licenses is no match.
5. Unmatched places get no grade (F11.4). Only Boston inspects these records, so spots in Cambridge, Somerville and Brookline stay unmatched.

### 3.8 Fog cells (F2, F3, F6, F7)

- H3 resolution 9.
- The home station reveals `gridDisk(k=1)` around the station's cell as seen.
- A ride passing a stop reveals `gridDisk(k=1)` around that station as seen.
- A valid check-in reveals `gridDisk(k=2)` around the spot as visited.
- Solving the puzzle reveals `gridDisk(k=1)` around the venue as seen.
- Visited always wins over seen. Uncovered means seen or visited.
- **Neighborhood percent** = uncovered cells in the neighborhood ÷ all cells in the neighborhood. **Boston percent** uses the union of Boston neighborhoods.

### 3.9 Check-in validity (F6.2)

Valid when the distance from the reported position to the spot is 150 m or less, the reported accuracy is 100 m or better, and the time falls between 30 minutes before the plan's start and the plan's end. A refusal names the first failed rule, in the order time, accuracy, distance, with its number rounded up (151 m, never "150 m" for a refused 150.3 m), so the app can explain it (`src/lib/checkin.ts`).

### 3.10 Badge rules (F8)

**Night badges**, computed when a plan ends and again once every participant's last train home has left plus 10 minutes, when the rides home are in (awards are only added, F8.6). Valid check-ins only. A badge that compares people (First In, Fashionably Late, Long Haul, Closest Call) needs at least 2 people in its comparison. Exact ties share a badge. Times are New York times (`src/lib/badges.ts`, D-063).

| Badge | Rule |
|---|---|
| First In | earliest check-in at the first stop. Everyone within 30 s of the earliest shares it. Each person counts with their first valid check-in there |
| Fashionably Late | latest check-in at the first stop, if 10 minutes or more after the start time. Everyone within 30 s of the latest who is also 10 minutes or more late shares it, except people who got First In |
| On the Dot | check-in at the first stop within 2 minutes of the start time, either side (more than one person can get it) |
| Long Haul | the largest `t_i` to the first stop among people who checked in |
| Closest Call | the smallest margin among people who caught their last train (see "last trains caught" in 3.11): the departure of the first train of their last-train trip home minus their ride home's first "I'm on the train" tap or board event. Late on the last train counts as 0 to spare. Awarded only once every last train has left plus 10 minutes |
| Night Owl | any check-in from 12:00 AM to before 5:00 AM |
| Ghost | said yes, never checked in, on a plan where at least one person checked in. Shown only inside the plan's recap |
| Planner | the creator, when the plan ends with at least 2 people checked in |

**Explorer badges**, computed whenever cells, ride events or check-ins change. Only live ride events count, not replays (`is_replay`), because the person didn't ride. First Light follows the fog, and F3.5 lets a replay clear fog, so it counts replay reveals until Phase 3 decides (D-063).

| Badge | Rule |
|---|---|
| First Light | first squad member to reach 50% uncovered in a neighborhood (one per neighborhood). The moment is the `first_at` of the cell that took the share to 50%. Cells revealed by the home station (`source = 'home'`) don't count, so choosing a home earns nothing. Mates who reached it within 30 s of each other share it, and a profile without a squad is its own first. Awards are never taken back, so two people who each got it before becoming mates both keep it. Regions under 3 cells don't count (D-062) |
| All Four Lines | board events on Red, Orange, Blue and Green |
| 50 Stations | 50 distinct stations boarded, passed, alighted, or nearest to a valid check-in (a platform stop ID counts as its station) |
| Every Green Branch | board, pass or alight events on Green-B, Green-C, Green-D and Green-E, each at a station only that branch serves (not on the shared trunk) |

### 3.11 Stats (F8.3)

| Stat | Definition |
|---|---|
| miles on the T | sum of ride miles (section 3.4), each rounded to 0.1 mi first so the total matches the ride summaries. A ride runs from a board event to the last pass or alight event of the same trip |
| miles walked (about) | for each stop with a valid check-in, `walk_m` from its station and back. A walking leg between two checked-in crawl stops replaces the walk back to the station from the first and the walk out to the second. Whether a leg is walked comes from the crawl builder (F10), which must store it with the plan's stops. Sum in meters, then convert once |
| stops | board, pass and alight events |
| stations visited | as in 50 Stations (live rides only), out of the total in `stations.json`. A night and lifetime stat; a ride's summary shows stops instead |
| percent uncovered | section 3.8 |
| lines ridden | distinct Red, Orange, Blue, Green, Mattapan, from board events |
| nights out | ended plans with a valid check-in by the profile |
| last trains caught | nights where the person's ride home began before the first train of their last-train trip home left, or up to 10 minutes after on that same trip (or with a tap that names no trip), since the last train often runs late. The ride home is their first live "I'm on the train" tap or board event after both their last valid check-in and the last stop's scheduled time, so a ride between crawl stops never counts. Read the profile's events from then on, with or without the plan's ID |

A ride's own summary (F3.4, F3.5) counts its events, replay or not, so a replay shows the same numbers as the live ride. Night and lifetime totals count live events only. Percent uncovered follows the fog, which replays clear under F3.5 (D-063). Each stat is a function in `src/lib/stats.ts` applied to one ride's, one night's or a lifetime's rows; percent uncovered is `bostonShare` in `src/lib/geo/regions.ts`.

### 3.12 Squad (F12.1)

Two profiles are squad mates once both have a valid check-in on the same ended plan (`src/lib/squad.ts`). The relation isn't transitive: a mate's mate is not a mate.

- **Your squad** is you and your mates (D-071).
- **Squad map (F12.2):** the union of the squad's revealed cells. A cell is visited when any member visited it, and it's credited to the member who uncovered it first (ties by profile ID), for the color-by-person option.
- **Squad streak (F12.3):** consecutive weeks, Monday to Sunday by service date in Boston, with at least one ended plan where you and a mate both have a valid check-in. This week counts once it has such a night; until then the count runs to last week, so a streak breaks only when a week ends without one.

### 3.13 Next departures (F2.5, F3.1)

From `TripUpdates_enhanced.json` (`src/lib/predictions.ts`):

- Keep subway trips (`Red`, `Orange`, `Blue`, `Mattapan`, `Green-B` to `Green-E`). Drop non-revenue trips (`revenue: false`), `CANCELED` trips and `SKIPPED` stops. An entity that doesn't parse is skipped, not the whole feed.
- A trip leaves a stop at its `departure.time`, or its `arrival.time` when the stop isn't the trip's last. The last listed stop has no departure.
- A station's departures are the trips that leave one of its child stops at or after now. A trip that ends at the station isn't a departure. The destination is the station of the trip's last listed stop, since the feed has no headsign.
- Soonest first, at most 3 per `direction_id`. Directions are named per line: Red and Orange 0 Southbound, 1 Northbound; Blue and Green 0 Westbound, 1 Eastbound; Mattapan 0 Outbound, 1 Inbound (checked against the live feed's terminals, 2026-11-22).
- `/api/mbta/predictions` fetches the feed once for every station for 5 s, and serves the last good copy when the feed fails. Its `updatedAt` is the feed header's timestamp, so the sheet shows the data's own age; past 90 s it shows as stale.

### 3.14 Ride replay timeline (F3.5)

From `vehicle_positions` (`src/lib/replay.ts`, `src/server/replay.ts`):

- A trip's rows are projected onto its route and direction's shape (`src/lib/geo/along.ts`, the same scale as `scripts/gtfs/build.ts`). For the Red Line, the shape with the most stations the trip was seen at wins.
- Between two rows, each station mark on the shape is reached at a time linear in its distance between the two positions. A train within 150 m of a mark is at that station.
- The ride starts at the boarding station; the first stop is `board`, the last `alight`, the rest `pass`. A trip makes a replay when it passes at least three stops after boarding. Trips older than 24 hours aren't listed.
- Miles come from `rideMiles` along the same shape.

### 3.15 Crawls (F10.1–F10.3)

- A crawl has 2 to 4 stops. Each stop has its own categories; budget, minimum grade and the age rule apply to every stop (F10.2). Vibe and calm aren't filters yet: places have no vibe tags (D-057) and calm mode (F13) isn't built.
- **First stop:** stations ranked by the fair score (section 3.2) at the crawl's start. The first stop is a matching spot within 600 m of that station, nearest first (F10.3).
- **Next stops:** the matching spot, not already in the crawl and within 600 m of some station, with the shortest leg from the previous spot. A leg is the shorter of walking (section 3.5) and the T: walk to a station near the previous spot, ride (section 3.1, for the hour the group leaves), and walk from the station near the next spot. A leg over 10 minutes doesn't count (F10.1). Whether a leg is walked is stored with the stop (section 3.11).
- **Times:** the first stop is at the start time. Each next stop is at the previous stop's time, plus the stay (60 minutes by default, 30 to 180), plus the leg rounded up to whole minutes.
- **Hours:** a spot is checked at its scheduled time against its OpenStreetMap `opening_hours`. A spot that is closed then is skipped. A spot whose hours are missing or can't be read is kept but flagged as unknown (F10.1). Spots with known hours win ties over unknown ones, then the shorter leg, then name and ID. The reader (`src/lib/places/hours.ts`) handles days, day ranges and lists, several spans a day, closings past midnight (written "01:00" or "25:00"), "off" and "24/7"; a later rule replaces earlier ones on its days. It skips "PH" and calls anything else unknown (months, sunrise, comments, fallbacks): 967 of the 1,000 spots with hours parse.
- **Last train:** each person's leave-by uses the last stop (section 3.3, F10.3). A crawl is dropped when anyone with a train home has to leave before the crawl reaches its last stop.
- **Options:** up to 3 crawls, each starting at a different station, fairest first. For each station the builder tries its 5 nearest open first spots, and it stops after 10 stations with a matching first spot, so a request that fits nothing answers quickly. With no crawl, the blocker is "time" (no station within 75 minutes for everyone), "no-trains" (section 3.2), "last-train" (every crawl found ends too late) or "spots".

### 3.16 Dinner before (F10.6)

- A 2-stop crawl for a puzzle event: dinner (food, with the plan's budget, grade and age filters), then the event.
- Candidates are matching spots within 10 minutes of the venue by walk or T (legs as in section 3.15, the T leg ending with the walk from the event's station to the venue).
- Each candidate is scored by the fair score (section 3.2) of the group to the station near it, computed for a dinner that starts the stay plus 10 minutes before the event. The fairest wins, then the shorter leg to the venue, then name and ID.
- Dinner is at the event's start minus the stay minus the leg. A spot closed then is skipped; unknown hours are flagged.
- Leave-by times run from the event's station (section 3.3). A dinner is dropped when anyone with a train home has to leave before the event starts. With none left, the blocker is "time", "no-trains", "last-train" or "spots", as for crawls.

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
