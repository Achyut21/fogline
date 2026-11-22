# Fogline walkthrough

How every feature works and how to use it, step by step. Each entry starts as the planned flow. When a feature works in the app, run `/walkthrough F#` to replace the plan with what the app actually does, add screenshots (`docs/walkthrough/F#/`), list the tests that cover it, and mark it verified.

Status values: **Planned** → **Built** → **Verified (date, builder)**.

---

## Judge path (3 minutes, demo mode)

Status: Planned. An e2e test runs this whole path (Phase 5 gate).

1. The judge scans the QR code at the table. It opens `/demo` on their phone, showing a fogged Boston with the Demo chip and "Boston 3% uncovered".
2. **Daily** tab: they solve today's puzzle (the demo answer is easy). The event card appears, the map flies to the venue, the pin drops and the fog around it burns off.
3. They tap **Plan it**. The event is the destination and its time is filled in. Two demo friends are already in: Priya (Harvard, Red Line) and Sam (Tufts, Green Line E). Everyone's minutes to the venue and leave-by time show.
4. **Plans → New plan** with the same friends, then **Find spots**. Three options appear, the top one with fairness bars (for example 17, 18 and 19 min) and everyone's leave-by time. They choose it.
5. They open **Recap** for the demo's completed night: the podium (Priya First In, Sam Fashionably Late), the night's numbers counting up, badges, and the share card.
6. **Ride** replay: a recorded Green Line ride. The fog lifts stop by stop with stop cards, ending with a summary of miles, stops and new cells.
7. Close on the Me tab: lifetime stats and badges.

## Full tour (10 minutes)

Status: Planned. Every feature below, in order F1 → F16, using a real profile instead of demo mode.

---

## F1. Onboarding and profile

Status: Planned
- **Why:** set up in under 30 seconds without an account.
- **Entry:** first visit to `/`.
- **Steps:** Welcome (name) → school → home station (suggested from the school, or search) → age band → map, where the fog burns off around the home station.
- **Also:** Me → profile code → copy. In the installed app, Welcome → Restore profile → enter the code. Settings → delete my data.
- **Edge cases:** location denied later; restoring with a wrong code; reload after onboarding; iOS installed app with no profile.
- **How to demo:** onboard as yourself, then show the profile code restore in the installed app.
- **Tests:** _(fill in criteria IDs)_
- **Screenshots:** _(fill in)_

## F2. Fog map

Status: Built (F2.1–F2.7 except F2.4's neighborhoods sheet, which the list view covers for now). Not yet verified on a real phone.
- **Why:** see what you've uncovered and where the lines lead.
- **Entry:** Map tab (home), after onboarding.
- **Steps:**
  1. The header shows Boston's uncovered share ("0.3%", "of Boston uncovered"). The map centers on the home station, its cells showing through thinned fog. A card says "Your home station is clear." until Got it.
  2. Tap a station on the map, or switch to **List** and tap a station row. Its sheet opens halfway: name, line badges, and "N min from home" (or "Your home station").
  3. **Next trains** loads live from the MBTA within about a second: trains grouped Westbound/Eastbound (Green, Blue), Northbound/Southbound (Red, Orange) or Inbound/Outbound (Mattapan), each with its line, the station it ends at and minutes away. A chip says how old the data is; past 90 s it turns amber. It refreshes every 30 s while open.
  4. Tap the grabber or drag up for the full sheet: the **Stop card** (a Wikipedia fact, its source and the photo credit) once the station is uncovered, then **Nearby**: the three closest spots with category, walk and grade. Under-21 profiles never see bars or clubs here.
  5. The list view shows each neighborhood's share and every station's lines and whether it's uncovered or in fog.
- **Edge cases:** WebGL off or GPU tier 0–1 (2D fog); MBTA feed down (the last good times with their age, or "Train times didn't load" with Try again); offline (last times from the service worker, with their age); late at night ("No trains listed").
- **How to demo:** onboard with home Boston University Central, tap Kenmore in the list, pull the sheet up.
- **Tests:** `[F2.1]` `[F2.2]` fog mask and home cells (`tests/unit/fog.test.ts`, `tests/integration/profile.test.ts`); `[F2.4]` `[F2.7]` `[F2.3]` (`tests/component/map-screen.test.tsx`); `[F2.5]` parser, route, sheet data, sheet states and the end-to-end sheet (`tests/unit/predictions*.test.ts`, `tests/unit/station-sheet.test.ts`, `tests/component/station-sheet.test.tsx`, `tests/e2e/station-sheet.spec.ts`) and offline train times (`tests/e2e/pwa.spec.ts`); `[F2.6]` (`tests/e2e/fog.spec.ts`).
- **Screenshots:** checked at 390×844 in day and night on a local build against the test database (2026-11-22). Saved screenshots: not yet.

## F3. Ride mode

Status: Replay built (F3.3, F3.4, F3.5, F3.7, F3.8); live trains and train lost after the Phase 3 gate
- **Why:** turn the ride into a reveal of the city above.
- **Entry:** Ride button on the map, or "Ride from here" on a station sheet.
- **Steps:** pick a station → pick a train → watch the train move → a stop card appears at each stop as the fog lifts → End → summary.
- **Edge cases:** train lost from the feed; replay mode; wake lock; screen rotation.
- **How to demo:** open Kenmore from the list view → Ride from here → pick a trip → 20× → watch the stop cards change → summary → Back to map; the passed stations read Uncovered.
- **Tests:** `tests/unit/replay.test.ts`, `tests/integration/replay.test.ts`, `tests/component/ride-replay.test.tsx` (`[F3.3]` `[F3.4]` `[F3.5]` `[F3.8]`), `tests/e2e/ride.spec.ts` (the Phase 3 gate run, desktop-chrome, iphone, pixel).
- **Screenshots:**

## F4. Fair plans

Status: Builder, options and invite link built (F4.1 placeholders, F4.3–F4.6, F4.8, F4.9); agent text (F4.7) and Open Graph images not built
- **Why:** a spot that's fair by T time for friends at different campuses.
- **Entry:** Plans → New plan, or Plan it from the puzzle.
- **Steps:** when → who (invite link or placeholder with a station) → what, budget, vibe, grade → Find spots → compare options (fairness bars) → choose → share the invite link.
- **Edge cases:** no option (constraint named); under-21 participant (bars and clubs off); under-21 profile opening a 21+ plan's link; one participant; a station with no service at that hour.
- **How to demo:** BU + Harvard + Tufts on Friday at 7 PM.
- **Tests:** `tests/component/plan-builder.test.tsx` (`[F4.1]` `[F4.6]` `[F4.9]`), `tests/e2e/plans.spec.ts` (`[F4.1]` `[F4.4]` `[F4.8]`, Phase 4 gate run), B's `tests/integration/plans.test.ts`.
- **Screenshots:**

## F5. Last train

Status: Leave-by, warnings, no-train path and the live countdown built (F5.1–F5.3, F5.7); 20 and 5 minute alerts (F5.4), alert text (F5.6) and Remind me (F5.8) not built
- **Why:** everyone knows when to leave.
- **Entry:** plan detail and live mode.
- **Steps:** see each person's leave-by → Remind me saves a calendar event with alarms → in live mode, the countdown → alerts at 20 and 5 minutes.
- **Edge cases:** plan after the last train (warning); no train home (neutral options); after-midnight service date; an alert on the route home.
- **How to demo:** set the plan time to 11:45 PM and show the warnings.
- **Tests:** `tests/component/plan-builder.test.tsx` (`[F5.3]` `[F5.7]`), `tests/e2e/plans.spec.ts` (`[F5.2]`), B's last-train unit tests.
- **Screenshots:**

## F6. Live night and check-ins

Status: Live mode from 30 min before the start, check-in, arrival order and End built (F6.2–F6.4 organizer end); directions (F6.1) and the auto-end cron not built
- **Why:** get there, prove it, see who's where.
- **Entry:** plan detail → Go.
- **Steps:** directions → countdown → friends' statuses → Check in at the spot → arrival order updates for everyone → End night.
- **Edge cases:** too far; low accuracy; permission denied; two check-ins at once; offline check-in queued.
- **How to demo:** mocked location in demo mode.
- **Tests:** `tests/e2e/plans.spec.ts` (`[F6.2]` `[F6.3]` `[F6.4]`: join in a second browser, check in with a mocked location, the organizer sees the arrival within 10 s, End).
- **Screenshots:**

## F7. Daily puzzle

Status: Built (F7.1–F7.7); Plan it fills in the time, not the venue
- **Why:** a 30-second daily habit that points to something real to do.
- **Entry:** Daily tab.
- **Steps:** guess → feedback → solve → event card → pin and fog reveal → Plan it or Share.
- **Edge cases:** invalid word; six misses (event still revealed); already played today; midnight Eastern rollover; streak reset.
- **How to demo:** the demo puzzle.
- **Tests:** `tests/e2e/daily.spec.ts` (`[F7.2]` `[F7.3]` `[F7.4]` `[F7.5]` `[F7.7]`), `tests/integration/daily.test.ts` (`[F7.2]` parallel guesses), B's `tests/unit/puzzle.test.ts`.
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
- **Steps:** choose categories per stop → filters → build → review stops and leave-by → invite; or tap a weekly plan → invite friends; or Plan it on a puzzle event → Dinner before.
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

Status: Measuring a named stretch, the measured list and the sensory preview built (F13.1, F13.2, F13.5, F13.3 as a list); calm routing (F13.4) not built
- **Why:** quieter routes and spots for people who need them.
- **Entry:** Settings → Calm mode; the map's calm layer; the calm toggle in plans.
- **Steps:** opt in → microphone primer → ride with sampling → calm layer updates → plan with calm on → sensory preview on a station sheet.
- **Edge cases:** microphone denied; a station with no data; checking that no audio leaves the device.
- **How to demo:** the calm layer on the Green Line near Park Street.
- **Tests:** `tests/unit/noise.test.ts` (`[F13.1]` `[F13.3]`), `tests/integration/noise.test.ts` (`[F13.1]` `[F13.2]` `[F13.5]`), `[F13.5]` in `tests/component/station-sheet.test.tsx`, `tests/e2e/calm.spec.ts` (fake microphone; checks no request carries audio or leaves the origin).
- **Screenshots:**

## F14. Find it and taste of home

Status: Built (F14.1–F14.3); needs a Gemini key with quota
- **Why:** turn a food screenshot or a craving for home into a place you can reach.
- **Entry:** Map → Find it.
- **Steps:** upload a screenshot → dish identified → up to 3 spots pinned; or enter a cuisine or hometown → results with review quotes.
- **Edge cases:** not food; no matches; under-21 and grade filters.
- **How to demo:** a judge's own food screenshot.
- **Tests:** `tests/unit/find.test.ts` (`[F14.1]` `[F14.2]` `[F14.3]`), `tests/integration/find.test.ts` (Gemini mocked: photo to spots, cache, refusals, unavailable), `tests/e2e/find.spec.ts`.
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

Status: `/demo` start page, a separate copy per start and the Demo chip built (F16.1–F16.3)
- **Why:** a reliable 3-minute path for judges, with no real data mixed in.
- **Entry:** `/demo` (QR code at the table).
- **Steps:** the judge path above.
- **Edge cases:** Gemini unavailable (cached output used); MBTA feed down (replay used); demo data never showing in real views; two judges at once (each visit gets its own copy).
- **Tests:** `tests/e2e/demo.spec.ts` (`[F16.1]` `[F16.3]`, a second visitor gets a separate copy), B's `tests/integration/demo.test.ts`.
- **Screenshots:**
