# Fogline walkthrough

How every feature works and how to use it, step by step. Each entry starts as the planned flow. When a feature works in the app, run `/walkthrough F#` to replace the plan with what the app actually does, add screenshots (`docs/walkthrough/F#/`), list the tests that cover it, and mark it verified.

Status values: **Planned** → **Built** → **Verified (date, builder)**.

---

## Judge path (3 minutes, demo mode)

Status: Planned. An e2e test runs this whole path (Phase 5 gate).

1. The judge scans the QR code at the table. It opens `/demo` on their phone, showing a fogged Boston with the Demo chip and "Boston 3% uncovered".
2. **Daily** tab: they solve today's puzzle (the demo answer is easy). The event card appears, the map flies to the venue, the pin drops and the fog around it burns off.
3. They tap **Plan it**. Two demo friends are already in: Priya (Harvard, Red Line) and Sam (Tufts, Green Line E). They tap **Find spots**. Three options appear, the top one with fairness bars showing 17, 18 and 19 min, and everyone's leave-by time.
4. They choose it and open **Recap** for the demo's completed night: the podium (Priya First In, Sam Fashionably Late), the night's numbers counting up, badges, and the share card.
5. **Ride** replay: a recorded Green Line ride. The fog lifts stop by stop with stop cards, ending with a summary of miles, stops and new cells.
6. Close on the Me tab: lifetime stats and badges.

## Full tour (10 minutes)

Status: Planned. Every feature below, in order F1 → F16, using a real profile instead of demo mode.

---

## F1. Onboarding and profile

Status: Planned
- **Why:** set up in under 30 seconds without an account.
- **Entry:** first visit to `/`.
- **Steps:** Welcome → name → school → home station (search) → age band → map, with only the home station's area uncovered.
- **Also:** Me → profile code → copy. In the installed app, enter the code to restore the profile. Settings → delete my data.
- **Edge cases:** location denied later; restoring with a wrong code; reload after onboarding; iOS installed app with no profile.
- **How to demo:** onboard as yourself, then show the profile code restore in the installed app.
- **Tests:** _(fill in criteria IDs)_
- **Screenshots:** _(fill in)_

## F2. Fog map

Status: Planned
- **Why:** see what you've uncovered and where the lines lead.
- **Entry:** Map tab (home).
- **Steps:** look at the header percentage → tap a station → the sheet shows lines, live departures, the stop card if seen, nearby spots → open the neighborhoods sheet → toggle the list view.
- **Edge cases:** WebGL off (2D fog); stale feed (age shown); offline (cached map).
- **How to demo:** drag a finger across the fog and watch it part; tap Kenmore.
- **Tests:**
- **Screenshots:**

## F3. Ride mode

Status: Planned
- **Why:** turn the ride into a reveal of the city above.
- **Entry:** Ride button on the map, or "Ride from here" on a station sheet.
- **Steps:** pick a station → pick a train → watch the train move → a stop card appears at each stop as the fog lifts → End → summary.
- **Edge cases:** train lost from the feed; replay mode; wake lock; screen rotation.
- **How to demo:** replay at 10× on the Green Line.
- **Tests:**
- **Screenshots:**

## F4. Fair plans

Status: Planned
- **Why:** a spot that's fair by T time for friends at different campuses.
- **Entry:** Plans → New plan, or Plan it from the puzzle.
- **Steps:** when → who (invite link or placeholder with a station) → what, budget, vibe, grade → Find spots → compare options (fairness bars) → choose → share the invite link.
- **Edge cases:** no option (constraint named); under-21 participant; one participant; a station with no service at that hour.
- **How to demo:** BU + Harvard + Tufts on Friday at 7 PM.
- **Tests:**
- **Screenshots:**

## F5. Last train

Status: Planned
- **Why:** everyone knows when to leave.
- **Entry:** plan detail and live mode.
- **Steps:** see each person's leave-by → in live mode, the countdown → alerts at 20 and 5 minutes.
- **Edge cases:** plan after the last train (warning); no train home (neutral options); after-midnight service date; an alert on the route home.
- **How to demo:** set the plan time to 11:45 PM and show the warnings.
- **Tests:**
- **Screenshots:**

## F6. Live night and check-ins

Status: Planned
- **Why:** get there, prove it, see who's where.
- **Entry:** plan detail → Go.
- **Steps:** directions → countdown → friends' statuses → Check in at the spot → arrival order updates for everyone → End night.
- **Edge cases:** too far; low accuracy; permission denied; two check-ins at once; offline check-in queued.
- **How to demo:** mocked location in demo mode.
- **Tests:**
- **Screenshots:**

## F7. Daily puzzle

Status: Planned
- **Why:** a 30-second daily habit that points to something real to do.
- **Entry:** Daily tab.
- **Steps:** guess → feedback → solve → event card → pin and fog reveal → Plan it or Share.
- **Edge cases:** invalid word; six misses (event still revealed); already played today; midnight Eastern rollover; streak reset.
- **How to demo:** the demo puzzle.
- **Tests:**
- **Screenshots:**

## F8. Badges and stats

Status: Planned
- **Why:** make progress and nights out countable.
- **Entry:** Me tab, recap.
- **Steps:** view lifetime stats → badges grid → badge detail.
- **Edge cases:** ties for First In; recap recomputed (no duplicate badges); reduced motion (no count-up).
- **How to demo:** the demo profile's badges.
- **Tests:**
- **Screenshots:**

## F9. Night recap

Status: Planned
- **Why:** end the night with a story and a shareable card.
- **Entry:** automatically when a plan ends, or the plan detail's Recap.
- **Steps:** podium → numbers → badges → routes converging → Share card.
- **Edge cases:** 2D fallback; a single attendee; a non-participant opening the link (blocked).
- **How to demo:** the demo night.
- **Tests:**
- **Screenshots:**

## F10. Crawls and weekly plans

Status: Planned
- **Why:** multi-stop nights and ready-made plans each week.
- **Entry:** Plans → New crawl; Plans → This week.
- **Steps:** choose categories per stop → filters → build → review stops and leave-by → invite; or tap a weekly plan → invite friends.
- **Edge cases:** a stop with unknown hours; an under-21 participant; no valid crawl.
- **How to demo:** a 3-stop dinner, dessert and music crawl.
- **Tests:**
- **Screenshots:**

## F11. Grade badges

Status: Planned
- **Why:** see the city's inspection record where you'd eat.
- **Entry:** any food spot, plan options, filters.
- **Steps:** see the grade → tap for plain-English violations and the date → link to the city record.
- **Edge cases:** no inspection match; an old inspection date.
- **How to demo:** a well-known spot near Kenmore.
- **Tests:**
- **Screenshots:**

## F12. Squad

Status: Planned
- **Why:** shared progress with the people you go out with.
- **Entry:** Me → Squad.
- **Steps:** the squad map (color by person toggle) → members → streak.
- **Edge cases:** an empty squad; a member who deleted their data.
- **How to demo:** the demo squad.
- **Tests:**
- **Screenshots:**

## F13. Calm mode

Status: Planned
- **Why:** quieter routes and spots for people who need them.
- **Entry:** Settings → Calm mode; the map's calm layer; the calm toggle in plans.
- **Steps:** opt in → microphone primer → ride with sampling → calm layer updates → plan with calm on → sensory preview on a station sheet.
- **Edge cases:** microphone denied; a station with no data; checking that no audio leaves the device.
- **How to demo:** the calm layer on the Green Line near Park Street.
- **Tests:**
- **Screenshots:**

## F14. Find it and taste of home

Status: Planned
- **Why:** turn a food screenshot or a craving for home into a place you can reach.
- **Entry:** Map → Find it.
- **Steps:** upload a screenshot → dish identified → up to 3 spots pinned; or enter a cuisine or hometown → results with review quotes.
- **Edge cases:** not food; no matches; under-21 and grade filters.
- **How to demo:** a judge's own food screenshot.
- **Tests:**
- **Screenshots:**

## F15. How it works

Status: Planned
- **Why:** show the data and engineering, and credit the sources.
- **Entry:** `/how-it-works` (linked from Me and the footer).
- **Steps:** live row counts → compression → recorder status → solver timing → sources and credits.
- **Edge cases:** database unreachable (cached numbers with their age).
- **How to demo:** open it after the judge path.
- **Tests:**
- **Screenshots:**

## F16. Demo mode

Status: Planned
- **Why:** a reliable 3-minute path for judges, with no real data mixed in.
- **Entry:** `/demo` (QR code at the table).
- **Steps:** the judge path above.
- **Edge cases:** Gemini unavailable (cached output used); MBTA feed down (replay used); demo data never showing in real views.
- **Tests:**
- **Screenshots:**
