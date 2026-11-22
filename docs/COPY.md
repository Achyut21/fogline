# Fogline copy guide

Every string a user sees lives in `src/copy/`, grouped by feature. `copy-critic` reviews changes against this file. Use the `no-ai-slop` or `avoid-ai-writing` skill for a second pass when available.

## Voice

A friend who has lived in Boston for four years, knows when the last B train leaves, and doesn't oversell anything. Dry, specific, sometimes funny, never cute.

## Rules

1. **Numbers first.** "Leave by 12:14 AM", not "Make sure you leave in time".
2. **Short.** Buttons are one or two words. Headings are under six words. Badge descriptions are 60 characters or fewer.
3. **Sentence case** everywhere: "Plan a night", not "Plan A Night".
4. **Second person, active voice.** "You uncovered 3 stops." "Sam checked in."
5. **One idea per line.**
6. **Specific errors.** Say what failed, what still works and what to do. Never "Something went wrong" or "Oops!".
7. **No hype.** No exclamation marks in UI copy, with one allowed exception: the recap headline.
8. **No emoji in UI copy.** The share grid uses colored squares only.
9. **No rhetorical questions** in headings.
10. **Plain words.** "Use" not "utilize". "Start" not "embark".

## Banned words and patterns

unlock, unleash, elevate, seamless, seamlessly, effortless, effortlessly, journey, embark, delve, dive in, discover the magic, hidden gem, vibrant, bustling, curated, tapestry, game-changer, revolutionize, supercharge, empower, leverage, utilize, robust, cutting-edge, next-level, world-class, immersive, experience (as a verb), "Whether you're … or …", "Say goodbye to", "Get ready to", "It's not just X, it's Y", "Look no further", "In today's fast-paced world", "Let's go", "Oops", dramatic em-dash reveals.

## Formats

| Thing | Format | Example |
|---|---|---|
| Miles | one decimal, "mi" | 2.3 mi |
| Walking distance | "about" + one decimal | about 0.4 mi |
| Minutes | whole number, "min" | 14 min |
| Clock time | 12-hour, no leading zero, AM/PM after a no-break space (U+00A0), so the two never split across lines | 12:14 AM |
| Date | short weekday, month, day | Fri, Nov 27 |
| Percent | whole number | 38% |
| Ratio | one decimal, "×" and what it measures | 7.6× smaller |
| Milliseconds | whole number with a thousands separator, "ms" | 21 ms |
| Counts | thousands separator | 1,204 |
| Lines | full name on first mention, then the color | Green Line E, then "the E" |

Numbers in the UI use tabular figures.

## Patterns by element

**Buttons:** Ride · Plan it · Find spots · Check in · I'm on the train · Remind me · Share · Join · End night · Try again

**Empty states:** one line saying what's missing, then the one next step.
- Plans: "No plans yet. Pick a night and add two friends."
- Squad: "Your squad shows up after your first night out."
- Badges: "Badges come from nights out and rides."

**Errors:** what failed, what still works, what to do.
- MBTA feed: "Train data is 2 min old. The MBTA feed isn't answering."
- Check-in too far: "You're 420 m from Tasty Burger. Check in when you're there."
- Low accuracy: "Your location is fuzzy (±180 m). Step outside and try again."
- Offline: "You're offline. Your map and saved plans still work."
- No option found: "No spot works for everyone under $$. Try $$$ or allow grade B."

**Last train:**
- "Leave by 12:14 AM. Last Green Line E to Medford/Tufts is 12:22 AM."
- "No train home for Sam after 12:31 AM."
- "No train home after 12:50 AM. Split a ride, or walk 52 min." (The walk never comes first, F5.7.)

**Plans:**
- "This plan is 21+."
- "Former member" (someone who deleted their data)

**Ride:**
- "Next: Kenmore · 2 min"
- "You passed 6 stops. 2.3 mi on the Green Line."
- "We lost your train in the feed. Still on it?"

**Fog and progress:** "Fenway 38% uncovered" · "3 new stops uncovered" · "Boston 7% uncovered"

**Puzzle:**
- "Not in the word list."
- "Solved in 4. Tonight: Jazz at the Boston Public Library, 7:00 PM, 3 min from Copley." (Daily events are all-ages.)

## Badges

| Badge | Description |
|---|---|
| First In | Got there before everyone. |
| Fashionably Late | Walked in 14 min after the start. (Uses the real number.) |
| On the Dot | Arrived within 2 min of the start. |
| Long Haul | Longest ride of the night: 31 min. |
| Closest Call | Made the last train with 2 min to spare. (Under 1 min: "Made the last train with under 1 min to spare.") |
| Night Owl | Still out after midnight. |
| Ghost | Said yes. Never showed. |
| Planner | Got everyone in one place. |
| First Light | Squad's first to uncover half of Allston. (Fits the longest name, South Boston Waterfront, in 60 characters.) |
| All Four Lines | Rode the Red, Orange, Blue and Green. |
| 50 Stations | 50 stations down. |
| Every Green Branch | B, C, D and E. All of them. |

## Accessibility copy

- `aria-label`s describe purpose, not appearance: "Ride from Kenmore", not "Green button".
- Map elements have text equivalents: "Kenmore, Green Line B, C and D, uncovered".
- Live regions announce stop changes and countdown thresholds once, without repeating every second.

## Legal and data lines (exact wording)

- "Unofficial grade from City of Boston inspection records."
- "Train data: MBTA. Not affiliated with the MBTA."
- "Map data © OpenStreetMap contributors. Tiles by OpenFreeMap."
  - On the map itself, the attribution control shows OpenFreeMap's credit as its TileJSON sends it ("OpenFreeMap © OpenMapTiles Data from OpenStreetMap"), plus the MBTA line above. That credit also names OpenMapTiles, which OpenFreeMap's vector tiles use. The line above stays for `/how-it-works` (D-058).
- "Photo: {author}, {license}, via Wikimedia Commons."
