# Ship kit

Devpost text and a 1-minute video script for BostonHacks 2026 (PHASES Phase 10, item 7). The README covers what Fogline is, how to run it and the data credits.

This version describes only what a person can reach in the app today. Server work without a screen yet is left out until Phase 9 ships it: Remind me, route alerts, weekly plans, the recap screen, and stats and badges on Me. Regenerate this from `WALKTHROUGH.md` after Phase 9, and check every number on screen against the app before recording.

## Devpost

**Tagline:** Boston starts in fog. Ride the T with friends to clear it, and make your own last train home.

### Inspiration

Most of us don't have cars. A night out with friends at 3 different campuses starts with a group chat arguing about where to meet. Whoever lives near the spot wins, and somebody's trip home is an hour on a train that stopped running 20 minutes ago. Maps apps answer "how far," not "is this fair," and they give one time for the whole group, not one per person.

### What it does

- **Fair plans:** add your friends' home stations, and Fogline ranks meetup stations by how even the T trip is for everyone, then lists spots near the best ones. Every person sees their own minutes and their own leave-by time for their own last train, from wherever the night ends.
- **Crawls:** 2 to 4 stops, each within 10 minutes of the last and open when you get there where hours are known.
- **A city you uncover:** Boston starts in fog. Riding, checking in at spots and solving the daily puzzle clear hexagons of the map. Ride replays lift the fog stop by stop on a recorded train, and your squad shares a map and a weekly streak.
- **A daily puzzle:** a five-letter word tied to something happening in Boston that day. Solving it reveals the event and offers to plan a night around it.
- **The rest of the night:** live check-ins and arrival order, unofficial food grades from city inspections, noise measured by riders on each stretch, and finding a dish from a photo.

### How we built it

- **Data:** MBTA GTFS gives a station graph with travel times per day type and hour, and a compact timetable for the last-train search. OpenStreetMap supplies the spots, City of Boston inspections the grades, and Wikipedia the stop card facts.
- **The solvers are plain TypeScript and tested against the real schedule:**
  - a fairness score that weighs the slowest trip and the gap between trips;
  - a backward round-based search for each person's last train;
  - a crawl builder that checks opening hours and whether trains still run;
  - H3 cells for the fog.
- **The app:** Next.js 16 on Vercel, installable as a PWA, with three.js fog over MapLibre.
- **The database:** Tiger Cloud (Postgres with TimescaleDB). A cron job records every subway train's position each minute into a compressed hypertable, which powers ride replays and the live numbers on How it works.
- **No accounts:** an anonymous profile in a signed cookie, invite links, and a code to move to another phone.
- **AI writes words, never facts:** Gemini writes stop card sentences and identifies dishes, and each output is checked before it's shown. Times, distances, grades and scores always come from code.
- **Two builders:** we worked in parallel with Claude Code, coordinated through a shared progress board, with a code review on every pull request.

### Challenges

- **Last trains:** a train's day doesn't end at midnight, and trips past 24:00 belong to the previous service date. We also check that a station still has a train boarding at that hour, not only that a route exists.
- **Fair beats close:** a spot 10 minutes from one friend and 50 from another isn't fair. The score counts both the slowest trip and the gap.
- **Opening hours:** OpenStreetMap's format is a small language of its own. We parse the common forms and flag the rest as unknown rather than guess.
- **Privacy:** leave-by times reveal where you live, so only plan members see them. A 21+ venue never shows to anyone not known to be 21+, including in link previews.

### Accomplishments

- Every leave-by time is per person, from the night's last stop, on the real timetable.
- Real data end to end: no fake trains, no made-up spots.

### What we learned

Fairness is a product decision before it's an algorithm. A last-train feature is only as good as its worst night, so we spent our time on the edge cases: midnight, holidays, branches and walks to another station.

### What's next

Reminders and MBTA alerts on the plan page, weekly plans, the night recap, live train positions on the map, and rate limits before opening it widely.

### Built with

Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Motion, three.js, MapLibre GL, OpenFreeMap, Serwist, H3, Drizzle, Tiger Cloud (TimescaleDB), Vercel, Gemini (AI SDK), Google Maps (grounding), Zod, Vitest, Playwright, MBTA GTFS and realtime, OpenStreetMap, Analyze Boston, Wikipedia.

## Video script (1 minute)

Shot on a phone at 390×844 in demo mode. Voiceover in plain words, numbers on screen.

| Time | Screen | Voiceover |
|---|---|---|
| 0:00–0:06 | `/demo`, tap Start demo: Boston under fog, the uncovered share, the Demo chip | "Boston starts covered in fog. You clear it by riding the T and going out with friends." |
| 0:06–0:15 | Daily tab: solve the word; the event card appears with its station | "Every day there's a puzzle tied to something real happening in the city." |
| 0:15–0:30 | Plans, New plan with Priya at Harvard and Sam at Tufts, Find spots: 3 options with minutes bars | "Fogline finds the spot that's fair by T time for everyone, not only the closest one to whoever's planning." |
| 0:30–0:40 | The chosen option: each person's leave-by time | "And everyone gets their own last train home, from wherever the night ends." |
| 0:40–0:52 | Ride: a recorded Green Line trip, the fog lifting stop by stop with stop cards | "Ride a real recorded train and the fog lifts station by station." |
| 0:52–1:00 | Me, then Squad: the shared map and streak | "Every time on screen comes from MBTA data. Fogline." |

Keep the Demo chip visible in every shot.
