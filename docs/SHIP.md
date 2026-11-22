# Ship kit

Devpost text and a 1-minute video script for BostonHacks 2026 (PHASES Phase 10, item 7). The README covers what Fogline is, how to run it and the data credits. Regenerate this from `WALKTHROUGH.md` when the judge path changes. Every number here has to be true of the app on the day it's submitted.

## Devpost

**Tagline:** Boston starts in fog. Ride the T with friends to clear it, and never miss your last train home.

### Inspiration

Most of us don't have cars. A night out with friends at three different campuses starts with a group chat arguing about where to meet. Whoever lives near the spot wins, and somebody's trip home is an hour on a train that stopped running twenty minutes ago. Maps apps answer "how far," not "is this fair," and they give one time for the whole group, not one per person.

### What it does

- **Fair plans:** add your friends' home stations, and Fogline ranks meetup stations by how even the T trip is for everyone, then lists open spots near the best ones. Every person sees their own minutes and their own leave-by time for their own last train.
- **Last trains that hold up:** leave-by times come from the real MBTA timetable, from wherever the night ends. If an MBTA alert touches your way home, the plan shows it. "Remind me" saves a calendar event with alarms 20 and 5 minutes before you have to leave.
- **Crawls and weekly plans:** 2 to 4 stops, each within 10 minutes of the last and open when you get there. Every Monday there are three fair plans for the week, one of them a meal before a real Boston event.
- **A city you uncover:** Boston starts in fog. Riding, checking in at spots and solving the daily puzzle clear hexagons of the map, and your squad shares a map and a weekly streak.
- **A daily puzzle:** a five-letter word tied to something happening in Boston that day. Solving it reveals the event and offers to plan a night around it.
- **The rest of the night:** live check-ins and arrival order, badges, a recap with a share image, unofficial food grades from city inspections, a calm mode for quieter routes, and finding a dish from a photo.

### How we built it

- **Data:** MBTA GTFS gives a station graph with travel times per day type and hour, and a compact timetable for the last-train search. OpenStreetMap supplies the spots, City of Boston inspections the grades, and Wikipedia the stop card facts.
- **The solvers are plain TypeScript and tested against the real schedule:**
  - a fairness score that weighs the slowest trip and the gap between trips;
  - a backward round-based search for each person's last train;
  - a crawl builder that checks opening hours and whether trains still run;
  - H3 cells for the fog.
- **The app:** Next.js 16 on Vercel, installable as a PWA, with a three.js fog over MapLibre.
- **The database:** Tiger Cloud (Postgres with TimescaleDB). A cron job records every subway train's position each minute into a compressed hypertable, which powers ride replays and the live numbers on How it works.
- **No accounts:** an anonymous profile in a signed cookie, invite links, and a code to move to another phone.
- **AI writes words, never facts:** Gemini writes stop card sentences and plain-English inspection violations, and each output is checked before it's shown. Times, distances, grades and scores always come from code.
- **Two builders:** we worked in parallel with Claude Code, coordinated through a shared progress board, with code, design and copy review passes on every change.

### Challenges

- **Last trains:** a train's day doesn't end at midnight, and trips past 24:00 belong to the previous service date. We also check that the station still has a train boarding at that hour, not just that a route exists.
- **Fair, not just close:** a spot ten minutes from one friend and fifty from another isn't fair. We tuned the score so the slowest trip and the gap both count.
- **Opening hours:** OpenStreetMap's format is a small language of its own. We parse the common forms and flag the rest as unknown rather than guess.
- **Privacy:** leave-by times reveal where you live, so only plan members see them. A 21+ venue never shows to anyone not known to be 21+, including in link previews.

### Accomplishments

- Every leave-by time is per person, from the night's last stop, on the real timetable.
- The whole judge path runs in demo mode on a phone in about three minutes.
- Real data end to end: no fake trains, no made-up spots.

### What we learned

Fairness is a product decision before it's an algorithm. And a "last train" feature is only as good as its worst night, so we spent our time on the edge cases: midnight, holidays, branches and walks to another station.

### What's next

Live train positions on the map, rate limits before opening it widely, and more campuses' events in the daily puzzle.

### Built with

Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Motion, three.js, MapLibre GL, OpenFreeMap, H3, Drizzle, Tiger Cloud (TimescaleDB), Vercel, Gemini (AI SDK), Zod, Vitest, Playwright, MBTA GTFS and realtime, OpenStreetMap, Analyze Boston, Wikipedia.

## Video script (1 minute)

Shot on a phone at 390×844 in demo mode. Voiceover in plain words, numbers on screen.

| Time | Screen | Voiceover |
|---|---|---|
| 0:00–0:06 | `/demo` opens: Boston under fog, "3% uncovered", Demo chip | "Boston starts covered in fog. You clear it by riding the T and going out with friends." |
| 0:06–0:15 | Daily tab: solve the word; the event card appears and the map flies to the venue as the fog burns off | "Every day there's a puzzle tied to something real happening in the city." |
| 0:15–0:30 | Plan it, then Find spots with Priya at Harvard and Sam at Tufts. Three options with minutes bars; the top one is 17, 18 and 19 minutes | "Fogline finds the spot that's fair by T time for everyone, not just the closest one to whoever's planning." |
| 0:30–0:40 | The plan page: each person's leave-by time, Remind me | "And everyone gets their own last train home, from wherever the night ends." |
| 0:40–0:50 | Recap: podium, numbers counting up, badges, share image | "After the night: who got there first, how far you rode, and what you uncovered." |
| 0:50–1:00 | Ride replay: the fog lifting stop by stop, then the Me tab | "Real MBTA data, all the way down. Fogline." |

Before recording, check each number on screen against the app, and keep the Demo chip visible in every shot.
