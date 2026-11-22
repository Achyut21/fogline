# Fogline PRD

Status: approved direction. Feature IDs (F1–F16) and acceptance-criteria IDs (F#.#) are stable. Tests reference them by ID. Change a criterion only through `docs/DECISIONS.md`.

## 1. Summary

Fogline turns Boston into a map you uncover. The city starts under fog. Riding the T lifts it stop by stop. Going out with friends colors places in. A daily puzzle points to real things happening this week. Underneath the game is a planner that does what Google Maps can't:

- picks a meetup spot that is fair by **T time** (not map distance) for friends at different campuses,
- builds multi-stop crawls,
- tells **each person** when to leave to make **their own** last train,
- shows the city's inspection record on every food spot,
- keeps score: who got there first, who was late, how many miles everyone rode and walked.

It is a mobile-first PWA for Android and iOS, built for the BostonHacks 2026 track **Bos(tons) of Eats and Streets**, and meant to keep working after the hackathon.

## 2. Problem

- Boston students don't have cars. The T is how they get anywhere, and most know three stops: their campus, Park Street and one more.
- Friends spread across BU, Northeastern, Harvard, MIT and Tufts can't agree where to meet. Someone always rides 40 minutes while someone else walks five.
- The T stops around 12:30–1 AM, and the last train differs per person and per line. People find out by missing it.
- Food apps show reviews, not the city's inspection results.
- Nothing makes the daily ride or a night out feel like progress.

## 3. Users

| Persona | Situation | What they need |
|---|---|---|
| Maya, BU sophomore | Lives near the Green Line B branch. Friends at Harvard and Tufts. | A spot fair for all three, decided fast. |
| Priya, Harvard junior | Red Line. Has missed the last train before. | Her own leave-by time, with a warning. |
| Sam, Tufts senior, 21+ | Green Line E. Plans the group's nights out. | Crawls that end near a late train for everyone. |
| Leo, Northeastern first-year from Ohio | Knows three stops. | A reason and a way to see the rest of the city. |
| Visitors (parents, tourists) | Riding the T without context. | Ride mode: what's above them at each stop. |

## 4. Goals and non-goals

**Goals**
- One app for discovering, planning, going out and getting home, with progress you can see.
- Plans that are measurably fair and get everyone home.
- Fluid, polished, animated UI that feels native on phones.
- Real data only: MBTA, City of Boston, OpenStreetMap, Wikipedia. AI writes words and never invents the facts.

**Non-goals (for now)**
- Native apps, accounts with passwords, payments.
- Delivery or "ghost kitchen" features.
- Chat bots (Telegram, SMS, WhatsApp, iMessage).
- Push notifications (iOS allows them only for installed PWAs; revisit after Phase 8).
- Buses and Commuter Rail. Scope is the subway: Red, Orange, Blue, Green (B, C, D, E) and the Mattapan trolley.

## 5. Track fit and prizes

**Track: Bos(tons) of Eats and Streets.** The prompt asks for "a web application for college students that leverages the public transit systems of Boston to help them discover and navigate food spots, local activities, and the Boston aesthetic based on their cravings, budget, and location."

| Prompt phrase | Fogline feature |
|---|---|
| web application for college students | Mobile-first PWA (F1–F16) |
| leverages public transit | Fair T-time solver (F4), last trains (F5), ride mode (F3) |
| discover food spots | Plans and crawls (F4, F10), grade badges (F11), Find it (F14) |
| local activities | Daily puzzle events (F7), weekly plans (F10) |
| the Boston aesthetic | Ride mode stop cards (F3), the fog map (F2) |
| cravings, budget, location | Plan filters (F4, F10), Find it (F14), home station (F1) |

**MLH sponsor prizes we enter honestly:**
- **Best Use of Tiger Data:** `vehicle_positions`, `checkins`, `ride_events` and `noise_readings` are hypertables with continuous aggregates, compression and retention policies. The How it works page (F15) shows them working live.
- **Best Use of Gemini API:** station cards, plain-English inspection summaries, vibe tags, Find it (vision plus Maps grounding).
- **Best Use of Mastra:** the planner agent calls the deterministic solvers as tools, and an eval rejects any text whose numbers don't match them.
- **Best Domain Name from GoDaddy Registry.**

**Not entered:** Vultr (account stuck in manual review; hosting moved to Vercel), SpaceXSI raffle (requires Cursor as the core coding agent; we use Claude Code), Solana, Spark! subtrack.

## 6. Features

Priority tiers: **Core** = the demo loop. **Should** = expected in the submitted app. **Extra** = after everything else passes.

| ID | Feature | Tier |
|---|---|---|
| F1 | Onboarding and profile | Core |
| F2 | Fog map | Core |
| F3 | Ride mode | Core |
| F4 | Fair plans | Core |
| F5 | Last train | Core |
| F6 | Live night and check-ins | Core |
| F7 | Daily puzzle | Core |
| F16 | Demo mode | Core |
| F8 | Badges and stats | Should |
| F9 | Night recap | Should |
| F10 | Crawls and weekly plans | Should |
| F11 | Grade badges | Should |
| F12 | Squad | Should |
| F15 | How it works | Should |
| F13 | Calm mode | Extra |
| F14 | Find it and taste of home | Extra |

---

### F1. Onboarding and profile

**Story:** As a new user, I'm set up in under 30 seconds without making an account.

**Flow:** Welcome (fog hero with the display name field) → school → home station (suggested from the school) → age band (under 21 / 21+) → map, where the fog burns off around the home station. Welcome also has a "Restore profile" link that takes a profile code. Permission primers appear only when a feature needs them. The install prompt appears after the first completed action.

Schools list: Boston University, Northeastern, Harvard, MIT, Tufts, Boston College, Emerson, Suffolk, Berklee, UMass Boston, Simmons, Wentworth, MassArt, Other.

**Acceptance criteria**
- **F1.1** A new visitor creates a profile (name, school, home station, age band) in four screens or fewer, with no email or password.
- **F1.2** The profile persists across reloads: a row in `profiles`, plus an httpOnly cookie holding the profile ID signed with `SESSION_SECRET` (HMAC). A cookie with a missing or bad signature counts as no profile.
- **F1.3** The Me screen shows a profile code (8 characters, no ambiguous letters). Entering it on another device, or in the installed PWA, restores the same profile. (iOS keeps Safari and installed-PWA storage separate, so this is required.)
- **F1.4** Location and microphone are never requested on first load. Each request is preceded by a primer that says why it's needed and what is stored.
- **F1.5** Under-21 profiles never see bars, pubs or nightclubs anywhere: plans, crawls, stop cards, weekly plans, search.
- **F1.6** Android Chrome shows a custom Install button driven by `beforeinstallprompt`. iOS Safari, when not standalone, shows an Add to Home Screen instruction sheet. Neither appears before the first completed action (the first finished puzzle, created plan or ended ride; finishing onboarding doesn't count), and a dismissal is remembered for 7 days.
- **F1.7** Settings let a user delete their data after a confirmation: profile, check-ins, rides, readings, badges, revealed cells and puzzle results. In plans shared with others, the person shows as "Former member" with no name or station. Plans they organized stay for the other participants.

### F2. Fog map

**Story:** When I open the app I see how much of Boston I've uncovered, and the T lines that lead to the rest.

**Behavior:** A full-screen map with fog over everything not uncovered. T lines and stations draw above the fog in line colors. The world is divided into H3 resolution-9 cells, each in one of three states: fog, seen (thinned fog) or visited (clear, full color). The header shows "Boston 7% uncovered", and a neighborhoods list shows each percentage. Tapping a station opens its sheet. The fog parts slightly under a finger.

**Acceptance criteria**
- **F2.1** On first open, only cells around the home station (`gridDisk(k=1)`) are uncovered (seen).
- **F2.2** Fog cells render as opaque fog, seen cells as thinned fog, visited cells clear and in full color.
- **F2.3** Every subway line and station renders above the fog in official line colors. Line names are available to screen readers.
- **F2.4** Neighborhood percentage = uncovered cells / total cells in that neighborhood, as defined in `docs/DATA.md`.
- **F2.5** A station sheet shows the station name, lines, live next departures (from TripUpdates) within 2 s on a normal connection, the stop card if seen, nearby spots, and "Ride from here". Stale data shows its age.
- **F2.6** Without WebGL, or on a low GPU tier, a 2D fog fallback shows the same cell states.
- **F2.7** A list view of stations and neighborhoods gives keyboard and screen-reader users the same information as the map.

### F3. Ride mode ("Above Ground")

**Story:** On the train, I follow my train and the city above me appears one stop at a time.

**Flow:** Ride → pick a station (nearest, if location is allowed, or search) → upcoming trains by direction → pick a train → riding view: train progress along the line (3D on capable devices, 2D otherwise), current and next stop, ETA → at each stop, a stop card (one photo, one fact, one spot nearby) while the cells around that station become seen → the ride ends when you pass your exit or tap End → summary.

The train's position comes from the MBTA vehicle feed matched by trip ID, so no GPS is needed underground.

**Acceptance criteria**
- **F3.1** Upcoming trains show route, destination and minutes away from live predictions, refresh every 30 s, and show the data's age when it's older than 90 s.
- **F3.2** After picking a train, the riding view updates its current stop within 15 s of the vehicle feed changing.
- **F3.3** Arriving at or passing each stop shows that stop's card and marks `gridDisk(k=1)` cells around the station as seen.
- **F3.4** The ride summary shows miles on the T (method in `docs/DATA.md`, 0.1 mi precision), stops passed, minutes, lines and new cells.
- **F3.5** Replay mode plays a recorded trip from `vehicle_positions` at 1× to 20×, produces the same reveals and summary as a live ride, and is labeled "Replay".
- **F3.6** If the trip disappears from the feed for 3 minutes, the view says so and offers "I'm still on it" (continue on the schedule) or "End ride".
- **F3.7** The screen stays awake during a ride where the Wake Lock API is supported.
- **F3.8** Each board, pass and alight event is written to the `ride_events` hypertable.

### F4. Fair plans

**Story:** Friends at different campuses get a spot that takes everyone about the same time by T.

**Flow:** Plans → New plan → when → who (me plus friends who join by invite link, or placeholder friends with a station) → what (food, coffee, dessert, bar, club, event), budget ($, $$, $$$), vibe (quiet or lively), minimum food grade (A, B or any) → Find spots → up to 3 options → choose → plan created → share the invite link.

**Acceptance criteria**
- **F4.1** Participants can be added by invite link (they join with their own profile) or as a named placeholder with a station.
- **F4.2** For every candidate destination station `d`, the solver computes each participant's time `t_i` from the travel-time matrix for the plan's day type and hour (`docs/DATA.md`).
- **F4.3** Options are ranked by `S(d) = max(t_i) + 0.5 × (max(t_i) − min(t_i))`, ties broken by `sum(t_i)`. Any station where some `t_i` exceeds 75 minutes is excluded.
- **F4.4** Up to 3 options at different stations are shown. Each shows every participant's minutes, lines and transfers, and the walk time from station to spot.
- **F4.5** Spots are within 600 m walking distance (straight line × 1.25) of the option's station and match category, budget, minimum grade and the age rule (F1.5).
- **F4.6** When no option exists, the UI names the constraint that blocked it and offers to relax it.
- **F4.7** The Mastra planner agent may write the one-line description and choose among valid options. Every number shown comes from the solver, and an eval rejects agent text whose numbers don't match.
- **F4.8** Creating a plan returns an invite link `/p/[planId]?t=[invite_token]`. Viewing the plan, its Open Graph image or its recap needs the participant cookie or a valid token. The join page shows the plan, participants' names and count (no home stations) and a Join button. The link preview (Open Graph image) shows title, time, spot and number of people.
- **F4.9** Bar and club categories are unavailable once any joined participant is under 21. A plan with a bar or club stop is 21+: an under-21 profile opening its link sees "This plan is 21+" with no venue and can't join, and its Open Graph image shows "21+" instead of the spot. Placeholder friends don't affect the age rule.

### F5. Last train

**Story:** Everyone knows exactly when to leave to get home on the T.

**Acceptance criteria**
- **F5.1** For each participant, the latest departure from the plan's station that still reaches their home station on the plan's service date is found by backward search over the timetable (`docs/DATA.md`), handling GTFS times of 24:00:00 and later.
- **F5.2** `leave_by = departure − walk time (spot to station) − 5 min`, shown for every participant on the plan.
- **F5.3** If the plan starts after a participant's last train, the builder warns before the plan is created, e.g. "No train home for Sam after 12:31 AM."
- **F5.4** In live mode each participant sees a countdown to their leave-by. At 20 and 5 minutes before, an in-app alert appears (with vibration on Android).
- **F5.5** For crawls, leave-by uses the last stop's station.
- **F5.6** If MBTA alerts report a disruption on a participant's route home, the plan shows the alert text. When the effect on the last train can't be determined, it says "Check MBTA alerts" instead of guessing.
- **F5.7** When no train home exists, the plan shows the walking time and suggests a rideshare neutrally. It never presents a long late-night walk as the default.
- **F5.8** A "Remind me" button on the plan saves a calendar event (.ics) with alarms 20 and 5 minutes before that participant's leave-by, so the reminder fires with the app closed and the phone locked.

### F6. Live night and check-ins

**Acceptance criteria**
- **F6.1** "Go" switches the plan to live mode: directions to the station (line, direction, stops), a countdown to the start time, and each friend's status (not left, on the way, here).
- **F6.2** A check-in is accepted only when the device reports a position within 150 m of the spot with accuracy of 100 m or better, between 30 minutes before the plan's start and the plan's end (`docs/DATA.md` section 3.9). Otherwise the app explains and offers a retry.
- **F6.3** A valid check-in writes a `checkins` row, marks `gridDisk(k=2)` cells around the spot as visited, and updates the arrival order for everyone within 10 s.
- **F6.4** The plan ends when the organizer taps End, 2 hours after the last check-in at the last stop, or 4 hours after the last stop's scheduled time when nobody checked in there. A cron job applies the automatic rules every 15 minutes. When the plan ends, the recap opens.

### F7. Daily puzzle

**Acceptance criteria**
- **F7.1** One 5-letter puzzle per `America/New_York` date. Everyone gets the same answer, so the linked event is at an all-ages venue. It resets at midnight Eastern.
- **F7.2** Six guesses. Only words in the valid-guess list are accepted. Each letter gets correct, present or absent feedback shown by color and by a second cue (shape or label).
- **F7.3** Solving reveals the linked real event (title, venue, date and time, nearest station, T minutes from home, source link), pins it on the map, and marks `gridDisk(k=1)` cells around the venue as seen.
- **F7.4** "Plan it" opens the plan builder with the event as the destination and its time filled in.
- **F7.5** The result can be shared as a spoiler-free grid of squares through Web Share or copy.
- **F7.6** A streak counts consecutive solved days. Missing a day resets it.
- **F7.7** Failing all six guesses still reveals the event, without the fog reveal.

### F8. Badges and stats

**Acceptance criteria**
- **F8.1** Night badges are computed on the server when a plan ends, from valid check-ins, using the rules in `docs/DATA.md`: First In, Fashionably Late, On the Dot, Long Haul, Closest Call, Night Owl, Ghost, Planner. Closest Call needs the rides home, so the `end-plans` cron computes the night's badges again once every participant's last train home has left plus 10 minutes, adding only new awards (D-059).
- **F8.2** Explorer badges: First Light (first in the squad to uncover 50% of a neighborhood), All Four Lines (Red, Orange, Blue and Green ridden), 50 Stations, Every Green Branch (B, C, D and E ridden).
- **F8.3** Stats are kept per ride, per night and lifetime: miles on the T, miles walked (labeled "about"), stops, stations visited out of the total, percent of Boston uncovered, lines ridden, nights out, last trains caught.
- **F8.4** Numbers count up into place, except with reduced motion, where they appear at their final value.
- **F8.5** Every badge's name and one-line description come from `src/copy/badges.ts`.
- **F8.6** Awards are idempotent: recomputing a recap never duplicates a badge.

### F9. Night recap

**Acceptance criteria**
- **F9.1** The recap shows the arrival podium (1st, 2nd, last) with times, badges awarded, the night's numbers (group miles on the T, miles walked, stops, new cells), everyone's routes converging on the spot, and the fog that was cleared.
- **F9.2** A 3D podium with confetti renders on capable devices, a 2D version otherwise. With reduced motion, the final state appears without animation.
- **F9.3** A share image is generated at `/api/og/recap/[planId]` (1080×1350) with the same numbers, and shared through Web Share or downloaded.
- **F9.4** Only participants can see a recap (invite token or participant profile).

### F10. Crawls and weekly plans

**Acceptance criteria**
- **F10.1** A crawl has 2–4 stops. Consecutive stops are within 10 minutes of each other (walk or T). Spots are open at their scheduled times where hours are known, and unknown hours are flagged.
- **F10.2** Filters: category per stop, budget, vibe, age rule, minimum grade, calm.
- **F10.3** Fairness (F4.3) applies to the first stop. The last train (F5.5) applies to the last stop.
- **F10.4** A Vercel Cron job every Monday at 6:00 AM Eastern generates 3 plans for the week from events and crawl templates. Each passes every validity check before it's shown.
- **F10.5** One tap invites friends to a weekly plan, creating a copy with its own invite link.
- **F10.6** "Plan it" on a puzzle event also offers "Dinner before": a 2-stop crawl whose first stop is the fairest spot within 10 minutes of the venue and whose last stop is the event.

### F11. Grade badges

**Acceptance criteria**
- **F11.1** Food spots matched to inspection records show an unofficial letter grade (formula in `docs/DATA.md`) and the inspection date.
- **F11.2** The detail view lists the latest inspection's violations in plain English (Gemini rewrite, cached), with a link to the city record.
- **F11.3** Every grade carries the label "Unofficial grade from City of Boston inspection records".
- **F11.4** Unmatched spots show "No inspection match" instead of a grade.
- **F11.5** Plan and crawl filters can require a minimum grade.

### F12. Squad

**Acceptance criteria**
- **F12.1** Two profiles become squad members once both have a valid check-in on the same ended plan.
- **F12.2** The squad map shows the union of members' uncovered cells, with an option to color them by who uncovered them.
- **F12.3** A squad streak counts consecutive weeks with at least one completed plan.
- **F12.4** (Extra) A school leaderboard shows the percent of Boston uncovered by each school's profiles.

### F13. Calm mode (Extra)

**Acceptance criteria**
- **F13.1** Opt-in microphone sampling during rides computes decibel levels on the device. Audio is never stored or sent. Only per-segment numbers (average, peak) are uploaded.
- **F13.2** Readings go into the `noise_readings` hypertable, with a continuous aggregate per segment and hour.
- **F13.3** A calm layer colors segments by measured loudness on a relative scale, labeled "measured by riders".
- **F13.4** The calm preference in plans favors quieter segments, less crowded hours (gated station entries) and spots tagged quiet.
- **F13.5** Each station has a sensory preview (sound, crowded hours, quietest place to wait) built from measured data. Stations without data say so.

### F14. Find it and taste of home (Extra)

**Acceptance criteria**
- **F14.1** A user uploads a food screenshot. Gemini identifies the dish, and the app finds up to 3 spots in reach by T and adds them as pins.
- **F14.2** Taste-of-home search takes a place or cuisine. Results quote review evidence from Gemini Maps grounding, and never claim authenticity without a quote.
- **F14.3** Both respect budget, age and grade filters.

### F15. How it works

**Acceptance criteria**
- **F15.1** `/how-it-works` shows live row counts for `vehicle_positions`, `checkins`, `ride_events` and `noise_readings`, the compression ratio, the last recorder run, the fairness solver's query time, and every data source with attribution.
- **F15.2** The numbers come from live queries cached for at most 60 s.

### F16. Demo mode

**Acceptance criteria**
- **F16.1** `/demo` loads a seeded profile, a seeded squad (Priya at Harvard, Sam at Tufts), a recorded ride replay, a completed night with its recap, and an unsolved demo puzzle that is separate from the real daily puzzle.
- **F16.2** Each `/demo` visit gets its own copy of the seed (flagged rows, separate profile IDs), so judges never share state. Copies are deleted after 24 hours. Demo data never shows up in real users' views or stats.
- **F16.3** A visible "Demo" chip shows on every screen in demo mode.
- **F16.4** The judge path in `docs/WALKTHROUGH.md` runs end to end in demo mode using cached AI outputs. Live MBTA data is used when available and replayed when not.

## 7. Non-functional requirements

- **Performance:**
  - Lighthouse mobile LCP of 2.5 s or less on a simulated mid-range Android over 4G.
  - App-shell JavaScript of 200 KB gzip or less; 3D and map chunks load after first paint.
  - UI animation holds 60 fps on a mid-range phone; 3D scenes hold 45 fps on the mid GPU tier or fall back.
- **Accessibility:** WCAG 2.2 AA. Zero serious or critical axe violations on every route.
- **PWA:** installable on Android and iOS; works offline for the app shell, saved plans and the last known map state (`docs/PWA.md`).
- **Privacy:**
  - Location is used only on user action (check-in, nearest station, starting a ride) and never in the background.
  - The microphone is used only in calm mode, after opt-in.
  - Delete-my-data really deletes (F1.7).
- **Security:** Zod on every input, a signed session cookie, invite tokens on plan pages, rate limits on AI routes, server-only secrets, `CRON_SECRET` on cron routes.
- **Safety and age:** no bars or clubs for under-21 profiles, no copy that encourages drinking, neutral options when no train home exists (F5.7).
- **Attribution:** MBTA, City of Boston, OpenStreetMap contributors, Wikipedia and Wikimedia Commons authors, and OpenFreeMap are credited on the map and on `/how-it-works`.

## 8. Success measures

- **At the hackathon:** a judge goes from puzzle to plan to recap in demo mode in under 3 minutes, on their own phone.
- **After it:** weekly active squads, plans completed per squad, the share of participants who make their last train, daily puzzle streaks.

## 9. Glossary

- **Cell:** an H3 resolution-9 hexagon (about 0.1 km²).
- **Seen / visited:** cell states. Seen comes from riding past or solving a puzzle. Visited comes from checking in.
- **Uncovered:** seen or visited.
- **Plan:** a meetup (one stop) or a crawl (2–4 stops) with participants.
- **Squad:** everyone who checked in with you on an ended plan.
- **Leave-by:** the time a participant must leave the spot to make their last train.
- **Service date:** the GTFS operating day. Trains after midnight belong to the previous date.
