# Fogline progress

This is the shared status board for both builders. Update it after every finished item, not at the end of a session. Newest log entries go on top. Never put secrets here.

## Phase status

| Phase | Status | Owner(s) |
|---|---|---|
| 0 Foundations | Passed 2026-11-21 (gate table below) | A |
| 1 Design | In progress (plan approved 2026-11-21) | A (both approve) |
| 2 Data and domain logic | Gate passed for code 2026-11-22 (two human checks open, see log) | B |
| 3 Profile, map, fog, ride | Not started | A (+B recorder) |
| 4 Plans, last train, live night | Not started | B (+A UI) |
| 5 Daily puzzle and demo mode | Not started | B + A |
| 6 Badges, stats, recap, How it works | Not started | A + B |
| 7 Crawls, weekly plans, grades, squad | Not started | B (+A UI) |
| 8 Extras | Not started | A + B |
| 9 Hardening and release | Not started | A + B |

## Board

### Builder A
- **Now:** Phase 3 (profile, map, fog, ride), approved by A on 2026-11-22. Order, sized for the hackathon's remaining ~9 hours:
  1. **F1 onboarding and profile** (`a/onboarding`): the four canvas screens (name, school, home station, age band), `createProfile` and `restoreProfile` Server Actions with Zod, an HMAC-signed httpOnly cookie (`SESSION_SECRET`), home cells revealed (F2.1), Me with the profile code (F1.3), restore by code. Tests `[F1.1]`, `[F1.2]`, `[F1.3]`, `[F2.1]`.
  2. **F2 map**: the real network from `data/stations.json` and `shapes.json`, the D-058 fog layer from the profile's `revealed_cells`, the 2D fallbacks, the station list view (F2.7).
  3. **F2.5 station sheet** (`a/station-sheet`). Plan shown to A on 2026-11-22; A said to continue with Phase 3:
     - `/api/mbta/predictions`: Zod-checked station, TripUpdates parsed to subway revenue trips, about 5 s shared cache, last good copy served with its age when the feed fails.
     - Service worker: network-first for `/api/mbta/*` with a stale fallback, before the `/api/*` rule.
     - StationSheet on the vaul Sheet: name, lines, minutes from home, departures by direction, MBTA credit, stop card once uncovered, 3 nearest spots (F1.5). TanStack Query polls every 30 s and stops while hidden; stale past 90 s. Loading, empty, error and offline states. Opens from the map and the list.
     - "Ride from here" lands with item 4's ride route (no dead button).
     - Tests `[F2.5]`: parser on a recorded snapshot, route cache and failure, sheet data, sheet states, e2e at 390×844.
     - **Status 2026-11-22 01:44 ET:** merged as `a07c680` ([#34](https://github.com/Achyut21/fogline/pull/34)); production check passed (run 44995127019).
  4. **F3 ride replay** (`a/ride-replay`). A approved this plan on 2026-11-22, and kept D-063 (replays clear fog, earn no badges and stay out of night and lifetime totals):
     - `src/lib/replay.ts`: a trip's one-a-minute `vehicle_positions` rows become board, pass and alight times. Every station along the route's shape between two rows counts as passed, timed by its distance between them (this settles the "passed" open question). `src/server/replay.ts` lists recent recorded trips from a station.
     - `/ride?from=` (opened by "Ride from here" on the station sheet) lists trips recorded from the station in the last 24 hours. Live trains (F3.1–F3.2) and train-lost (F3.6) come after the gate.
     - Riding view (2D): line, "To Riverside", current stop, "Next: Hynes · 2 min", 1× to 20×, Replay label, End, the stop card at each stop, the stop list. Each stop goes through the `recordReplayStop` Server Action: a `ride_events` row with `is_replay` and its k=1 cells as seen (F3.3, F3.8). Wake lock while playing (F3.7).
     - Summary: stops passed, miles on the T, minutes, lines, new cells, back to the map (F3.4).
     - Tests `[F3.3]` `[F3.4]` `[F3.5]` `[F3.8]`, and the gate e2e at 390×844.
     - **Status 2026-11-22 03:13 ET:** PR [#35](https://github.com/Achyut21/fogline/pull/35). Component test and the gate e2e (`tests/e2e/ride.spec.ts`, also item 5) pass on desktop-chrome, iphone and pixel. D-069, DATA 3.14, WALKTHROUGH F3.
  5. **Gate e2e** (iPhone and Pixel): onboarding, map, a replay past three stops, fog lifting, the summary.
  - Deferred to the end of the phase or later: F1.4 primers (no location request in Phase 3), F1.6 install prompts, F1.7 delete my data, F2.4 neighborhoods sheet.
  - Tests stay on the acceptance criteria. One code-critic pass per item, no parallel subagents (D-060).
- **Then (done):** Phase 1 Design. A approved the plan below, flags included, on 2026-11-21. Each item gets its own branch and PR and follows the CLAUDE.md loop. I stop for the humans three times: the impeccable `shape` questions, the mood pick, and the final approval of the canvas and `/design`.
  - **Status 2026-11-21 23:05 ET:** item 4 (fog spike) built on `a/fog-spike`, critics running. Approach A, the MapLibre custom layer, won on F2.3 layering; both approaches ran far inside the frame budget (D-058). A asked to keep tests to the important parts to save time: the item 4 plan's component test (rendering stops while `document.hidden`) and the reduced-motion e2e are dropped; reduced motion was checked with headless screenshots.
  - **Status 2026-11-21 21:49 ET (handoff, session ends; the next session runs under another Claude account):** items 1 and 5 are done. Item 5 is on `main` ([#20](https://github.com/Achyut21/fogline/pull/20), `c6ccaad`), with its production check passed. The 20:32 order change stands: code now, canvas alongside. Items 2 and 3 (canvas, storyboards) are partly done; items 4, 6, 7 and 8 haven't started. See the 21:49 log entry.
    - **A approved three changes to the item 5 plan (2026-11-21, D-054):** one type family instead of two; the D-037 exemption for `src/components/ui/` stays until item 6 restyles those files; the custom line and station glyphs land with LineBadge and StationDot in item 6.
    - **Dev servers:** a stale `next dev` from the previous session still runs on :3001 and serves old CSS. Check UI against `fogline-prod` (`.claude/launch.json`, port 3200) or restart the dev server.
    - **Canvas:** onboarding page done (6 artboards). The Map page has map home, station sheet, neighborhoods sheet and list view. Next is the Map states artboard (`map-states.dc.html` is listed in the canvas index but has no file yet), then Ride, Daily, Plans, Me, Squad, System and the motion storyboards.
    - **Canvas access:** the canvas belongs to the Claude account that made it. This session's account can't open it: the Artifact tool says it isn't shared with this account, even with the `sk` link. Item 5 was checked against A's HTML exports (onboarding, round 1, Map) and the artboard sources in `.canvas-work/canvas/project/`. To draw more pages from this account, A shares the canvas with edit access to it. Otherwise the canvas batches run from A's own account.
    - **Tooling:** `.canvas-work/` (git-ignored, on A's Mac) holds the map renderer (`render/map.html`, `shoot2.mjs` for direction C renders, `qa.mjs` local artboard check), the canvas sources (`canvas/project/`), the GTFS extractor (`tools/`) and `round2-plan.md` (screen list and C token values). `render/out*/positions.json` has the pixel positions used for map labels.
  - **Status 2026-11-21 20:18 ET:** item 1 done on `a/design-direction`. A picked mood C, the familiar option, with Apple Maps, Transit and Strava as the craft bar (DESIGN "Direction", D-050). Theme follows the OS (D-051). `docs/PRODUCT.md` added for impeccable. **B's human: confirm the direction here before the Phase 1 gate.** Item 2 round 2 is under way: the Onboarding page is on the canvas (6 screens, both themes).
    - Canvas: https://claude.ai/artifact/4o3hJj7QBSBavvV4LburQR. It is private until A shares it from the page's Share menu. Round 1 (three moods) stays on it for the record.
    - The canvas maps are real renders: MBTA GTFS canonical shapes, OpenFreeMap tiles and H3 resolution-9 fog cells. Names, times and numbers on the artboards are sample data (PRD personas).
  - **For Builder B (answers to B's Blocked and Asks):**
    - A chose admin merges (D-052). #12, #13 and #14 are on `main`. Vercel still won't deploy a B-authored commit to production, so each B merge is followed by an A docs PR; production then deploys both.
    - #12 and #13 got a merge commit from A on B's branches to clear conflicts. #13 was closed by mistake when its base branch was deleted, then reopened and retargeted to `main`.
    - `b/schema-tables` is kept because #16 is stacked on it. Retarget #16 to `main` (or rebase it) before deleting that branch.
    - `0001_core_tables` is merged: apply it to `fogline-db` from your terminal.
    - The recorder move into Phase 2 is still open for both humans.
  1. **Direction** (`a/design-direction`). No PRD criteria.
     - Run impeccable `shape` (one round of questions to A), then design-taste-frontend and frontend-design. impeccable reads `docs/PRD.md` and `docs/DESIGN.md` as its context. No separate `PRODUCT.md`.
     - Write a "Direction" section at the top of DESIGN.md: the visual world, color and type intent, fog and map character, motion personality, anti-references.
     - Settle the theme default (flag 2) in DESIGN section 3 and DECISIONS.
     - Check: A approves the Direction text.
  2. **Claude Design canvas** (docs on `a/design-canvas`).
     - Artifact `quickstart` with intent `design`, then publish "Fogline design" from the Design type. The link goes into DESIGN.md and DECISIONS.md.
     - Round 1: three mood directions, each showing map home, a ride stop card and the recap, in day and night. Both humans pick one.
     - Round 2: every DESIGN section 6 screen at 390×844 in day and night (about 55 screens), with empty, error and offline examples. This includes the visual specs for F2.2 cell states, F3.6 train lost, F4.9 the 21+ join page, F5.4 countdown colors, F6.2 check-in states, F7.2 the puzzle's second cue, F1.6 the install sheet and F16.3 the demo chip.
     - Maps use real geography: subway shapes and stations from `MBTA_GTFS.zip` (19.8 MB, `https://cdn.mbta.com/MBTA_GTFS.zip`), downloaded once into the session scratchpad and not committed.
     - Check: every artboard screenshotted at 390×844 in the browser pane.
  3. **Motion storyboards** (on the canvas).
     - One storyboard per DESIGN section 8 row (11 rows): start frame, end frame, timing token, behavior when interrupted, and the reduced-motion version.
     - Each names where it gets built: `/design` in item 6 (count-up, countdown, sheet, tab switch, fog reveal) or its feature phase (puzzle, recap, ride, badge award, card to detail).
     - Check: reviewed with the canvas.
  4. **3D fog spike** (`a/fog-spike`). F2.2 and F2.6 at component level (the map wiring is Phase 3), plus PRD section 7's 45 fps.
     - Approach A: a MapLibre custom layer drawing three.js into the map's WebGL context, under the T-line layers. Approach B: an R3F canvas over the map, synced to the map camera every frame. One shader for both: 2–3 octave FBM, drift, a density mask rasterized from H3 cell states, the burn-off reveal with a bright edge, parting under the finger.
     - Files: `src/three/` (scenes, shaders, materials, hooks), `src/components/map/fog-layer.tsx`, `src/components/map/fog-fallback.tsx`. Loaded with `next/dynamic` (`ssr: false`), rendered on demand, stopped when hidden or off-screen, disposed on unmount. GPU tier from `detect-gpu` with its benchmark files served from `public/` (flag 6): tier 0–1 gets 2D, tier 2 gets DPR ≤ 1.5 and two octaves, tier 3 gets everything.
     - Measure A and B with a Playwright script: headed Chromium on the Mac GPU, Pixel 7 emulation, CDP 4× CPU throttle, 20 s of scripted pan, zoom and reveal. Report mean fps, p95 frame time and frames over 22 ms at tier 2 and tier 3. Also compare layering (T lines above the fog), WebGL context count and camera lag. Pick one, log the numbers in DECISIONS, delete the other.
     - Tests: unit `[F2.2] rasterizes fog, seen and visited cells into three densities`, `[F2.2] visited wins over seen`, `[F2.6] tier 0–1 and no WebGL choose the 2D fog`. e2e `[F2.6] shows the 2D fog when WebGL is unavailable` (Chromium with WebGL off), and the reveal becomes a 200 ms crossfade with reduced motion. Component: rendering stops while `document.hidden`.
     - Check: the fog preview at 390×844 in both themes, with reduced motion, and with WebGL off.
  5. **Tokens, fonts, icons** (`a/design-tokens`).
     - Final values in DESIGN section 4 and `src/styles/tokens.css`: color roles per theme, a rem type scale, spacing, radius, elevation, layers, motion. Mapped into the Tailwind theme and shadcn's variables in `src/app/globals.css`. `src/lib/motion.ts` exports the motion values for Motion and R3F (A's file per ARCHITECTURE, not domain logic).
     - Two OFL families with tabular figures, picked with impeccable `typeset` and loaded with `next/font`, replacing Geist. The service worker's font precache and its PWA test follow. Lucide plus custom line and station glyphs. Final app icon and wordmark in `public/icons/icon.svg`, PNGs from `pnpm icons`.
     - Theme switching with next-themes (already installed) on the class strategy. `theme-color` updates at runtime only when the user overrides the OS. A test checks `src/styles/theme-color.ts` against `--bg` (D-043).
     - The token check becomes `tests/unit/tokens.test.ts`, so every `pnpm test` and CI run enforces it (flag 4). The D-037 exemption for `src/components/ui` ends.
     - Tests: unit `every text color pair meets WCAG AA in day and night`, `[F2.3] line colors are MBTA's and line casings reach 3:1 on both basemaps`, `theme-color matches --bg`. e2e: the theme override survives a reload and updates `theme-color`.
     - First slice of `/design`: tokens with contrast ratios and a theme toggle. Check at 390×844 in both themes.
  6. **Base components and `/design`** (`a/design-components`, two PRs if the diff gets big).
     - Restyle Button (primary, secondary, ghost, danger), Drawer as Sheet (peek, half, full), Sonner as Toast, Input (16 px text) and Tabs.
     - Add IconButton, SegmentedControl, Stepper, FilterChips, Skeleton, EmptyState, ErrorState, OfflineBanner, StaleChip, DemoChip, LineBadge, StationDot, StatCounter, StatTile, Countdown, LeaveByChip, BadgeChip, AvatarStack, ParticipantChip and BottomNav, plus FogLayer and FogFallback from item 4. Feature components come with their features (flag 3).
     - `/design` shows every component in every state, a play button per motion pattern, the fog preview with a tier toggle, and theme and reduced-motion toggles. It is `noindex`, and its sample data is labeled "Sample data" (flag 7). Motion uses `motion/react`, transform and opacity only, token values, interruptible, with a reduced-motion branch.
     - Tests: component `[F8.4] StatCounter counts up to its value`, `[F8.4] StatCounter shows the final value at once with reduced motion`, `[F5.4] Countdown turns warning at 20 min and danger at 5 min`, `[F2.3] LineBadge names its line for screen readers`, plus states and accessible names for every component. e2e on `/design`: axe in both themes, the final state of every motion demo with reduced motion, 44 px targets, no horizontal scroll at 390 px.
     - Check: `/design` at 390×844, 768×1024 and 1440×900, both themes, reduced motion.
  7. **Microcopy** (`a/design-copy`).
     - Strings for every DESIGN section 6 screen in `src/copy/`, grouped by feature: titles, buttons, empty, error and offline lines, aria labels. `src/copy/badges.ts` from the COPY.md table.
     - Drafted while drawing the canvas, so the artboards and the code use the same words.
     - Tests: unit `[F8.5] every badge has a name and a description of 60 characters or fewer`, and a COPY.md check: no banned words, no exclamation marks outside the recap headline, no emoji.
     - copy-critic, then a no-ai-slop pass.
  8. **Visual baselines** (`a/design-baselines`).
     - `tests/e2e/design-visual.spec.ts`: `/design` at 390×844 (iphone, pixel) and 1440×900 (desktop-chrome), day and night, motion settled, the WebGL canvas masked.
     - Generated in Playwright's Docker image to match CI (D-035). Docker 29.2 is on A's Mac.
     - Check: `pnpm test:e2e` passes locally and in CI.
  - **Gate:** design-critic (with impeccable `critique` and `audit`), copy-critic, code-critic and test-auditor, with every BLOCKING item fixed. Both humans approve the canvas and `/design`, recorded in DESIGN.md and DECISIONS.md. Then `/phase-gate 1`.
  - **Depends on B:** nothing blocks.
    - Station coordinates, shapes and neighborhood cells come from B's Phase 2 files. Until then the spike and `/design` use a small, labeled sample of real GTFS coordinates. Phase 3 switches to `data/`.
    - I'm adding `h3-js`, `maplibre-gl`, `three`, `@react-three/fiber`, `@react-three/drei`, `detect-gpu` and `motion` to `package.json`. B's `src/lib/geo` should reuse that `h3-js`.
    - B's human approves the canvas and `/design` at the gate.
    - D-016, D-018 and D-029, which B hasn't confirmed yet, shape the screens I draw.
  - **Flags** (my recommendation; A's yes accepts it, and each lands in DECISIONS):
    1. **No-WebGL fallback.** DESIGN section 9's 2D fog is a MapLibre fill layer, but MapLibre needs WebGL, so with WebGL off nothing renders. The gate and F2.6 both require that case. Recommendation: a low GPU tier gets the MapLibre fill layer. No WebGL gets an SVG map of lines, stations and cells, next to the F2.7 list view.
    2. **Theme default.** DESIGN section 3 follows Boston's sunset through `suncalc`. Recommendation: follow the OS setting (an iPhone on Automatic already switches at sunset), with a Settings override of System, Day or Night. People who need dark mode all day get it, the `theme-color` media tags stay right without runtime work, and screenshots stay deterministic.
    3. **Component scope.** DESIGN section 7 reads as if all ~50 components land in Phase 1, while CLAUDE.md bans feature UI before the gate. Recommendation: Phase 1 builds the base set in item 6. StationSheet, PuzzleGrid, FairnessBars, RideScene and the other feature components arrive with their features and join `/design` then.
    4. **Token check.** The PHASES grep skips `.ts` and `.css` files, misses Tailwind arbitrary values (`p-[3px]`, `duration-[300ms]`), palette classes (`bg-red-500`), off-scale spacing and raw durations, and flags any `#` followed by hex-looking text, such as a `#faced` anchor. Recommendation: the Vitest check in item 5, with PHASES reworded to match.
    5. **Fog frame rate.** Chrome's CPU throttle doesn't slow the GPU, and the fog is GPU work, so a MacBook run flatters a mid-range phone. I'll run the gate check as written and also report runs at the phone's full pixel count. A real mid-range Android would settle it (Open questions). Phase 9 item 2 re-checks on one.
    6. **detect-gpu** loads its benchmark data from unpkg at runtime by default. Recommendation: serve those files from `public/`, so tier detection works offline and calls no CDN.
    7. **`/design` on production** ships with every deployment. Recommendation: keep it reachable with `noindex` and label its sample data, since CLAUDE.md bans unlabeled fake data.
- **Waiting on A (human):**
  - Check the Vercel GitHub app at github.com/settings/installations → Vercel. If it shows a request for updated permissions, accept it, so Vercel's `repository_dispatch` events can start the deployment check on their own (D-043).
  - For canvas batches from another Claude account: share the canvas with edit access to that account from the page's Share menu. Until then, only the account that made it can draw new artboards.
- **Next:** merge #35, then the core-loop screens for Phases 4 and 5 on B's existing actions (plan builder, plan page with leave-by and check-in, daily puzzle, demo entry). B is taking Phase 6 alone (`b/recap`). Still open from Phase 1: B's human approves `/design` and direction C.
- **Blocked:** none. Waiting on A: sign-off on D-065 (restore without a rate limit, now live on production).

### Builder B
- **Now (2026-11-22 00:20):** Phase 2 code is done and its gate passes (two human checks open). The prototype track (D-067) server side is on `b/core-loop` (#31). B is waiting for A to merge the stack and build the screens.
- **Now (00:45):** demo seed and How it works numbers are built on `b/demo-seed`, under review. Waiting on B's human for migrations 0002 and 0003.
- **Next:** fix review findings and open the `b/demo-seed` PR; when A's screens land, wire them to the actions in #31 and fix what the click-through shows; then Phase 4's remaining server work (Closest Call rerun, live friend status).
- **Earlier plan (Phase 2):** approved by B on 2026-11-21. One branch and one PR per item, in this order. Phase 2 has no UI: the 390×844, both-themes and reduced-motion check and e2e don't apply to these items. Each item is checked by running its script or function on real data and recording the result here.
  1. **Time, geo and H3 helpers** (`b/time-geo`; F2.1, F2.4, F3.3, F4.5, F5.1, F6.3, F7.3)
     - `src/lib/time.ts`: New York clock time to and from GTFS service-day seconds (noon minus 12 h, times past 24:00:00), the service date of a moment, day type and hour bucket.
     - `src/lib/geo/`: haversine, `walk_m = straight line × 1.25`, minutes at 80 m/min, H3 res-9 reveals (k=1 seen, k=2 visited, visited wins), neighborhood and Boston percent.
     - Unit tests `[F5.1]`, `[F4.5]`, `[F2.1]`, `[F3.3]`, `[F6.3]`, `[F7.3]`, `[F2.4]`, including the DST days 2026-03-08 and 2026-11-01 and times like 25:30:00.
     - h3-js and the date library checked in Context7 before use.
  2. **Schema and migrations** (`b/schema-tables`, then `b/schema-hypertables`; F3.8, F6.3, F8.6, F13.2, F15.1)
     - Regular tables from ARCHITECTURE section 6 in `src/server/db/schema.ts`, migration from `pnpm db:generate`. `badges_awarded` unique `NULLS NOT DISTINCT` (D-022).
     - Custom SQL: four hypertables, three continuous aggregates `WITH NO DATA` plus refresh policies, compression (`vehicle_positions` after 1 day, the rest after 7) and 30-day retention on `vehicle_positions`.
     - Each integration test file migrates its own scratch database (D-049). Integration tests: the four hypertables exist, `[F8.6]` a duplicate badge is rejected, the aggregates refresh, migrating twice is a no-op.
     - Each migration PR merges on its own. B applies it to `fogline-db` from B's own terminal, then we check `timescaledb_information.hypertables`.
  3. **GTFS pipeline and travel time** (`b/gtfs`; F4.2)
     - `pnpm data:gtfs`: download the feed, keep `route_type` 0 and 1, write `stations.json`, `graph.json`, `timetable.json` and `shapes.json`, and log counts.
     - `src/lib/gtfs/` loads them. `src/lib/solver/travel.ts` returns `t(o, d, dayType, hour)` plus the lines and transfers on the path.
     - A small GTFS fixture in `tests/fixtures/gtfs/`: Park Street child stops, the Green trunk and branches, Mattapan, a trip past 24:00:00, a `calendar_dates` exception.
     - Tests `[F4.2]`. Five known trips against the MBTA schedule recorded here (gate). A second run must produce identical files.
  4. **Last train** (`b/last-train`; F5.1, F5.2, F5.3, F5.5, F5.7)
     - `src/lib/lasttrain/`: backward round-based search with at most 2 transfers. It returns the latest departure from `d` that reaches `h`, with trips and transfer stations, or nothing.
     - `leave_by = departure − walk − 5 min` and the margin. Crawls use the last stop.
     - Tests `[F5.1]` (after midnight, DST, Green branches, child stops), `[F5.2]`, `[F5.3]`, `[F5.5]`, `[F5.7]`.
     - Three known last trains against the published timetable recorded here (gate).
  5. **Fair solver and miles** (`b/fair-solver`; F1.5, F3.4, F4.3, F4.4, F4.5, F4.6)
     - `src/lib/solver/fair.ts`: `S(d)`, the `sum(t_i)` tie-break, exclusion over 75 min or unreachable, top 3 distinct stations, spots within 600 m that match filters and the age rule, and the blocking constraint when nothing fits.
     - `src/lib/geo/miles.ts`: board and alight stops projected onto the shape, rounded to 0.1 mi.
     - Tests `[F4.3]`, `[F4.4]`, `[F4.5]`, `[F4.6]`, `[F1.5]`, `[F3.4]`, plus one participant, no home station and ties.
  6. **Places and grades** (`b/places-grades`; F1.5, F4.5, F11.1, F11.3, F11.4)
     - `pnpm data:places`: one Overpass query, raw response cached, normalized and deduped, every station within 600 m walking (not only the nearest), `age_rule`.
     - `pnpm data:grades`: Analyze Boston inspections, `src/lib/grades.ts` (points and cutoffs after checking the real `viol_level` values) and matching (address, else Jaro-Winkler ≥ 0.8 within 50 m).
     - Fixture tests `[F11.1]`, `[F11.4]`, `[F1.5]`. Citywide grade distribution in DECISIONS (gate).
  7. **Neighborhoods** (`b/neighborhoods`; F2.4)
     - `pnpm data:neighborhoods`: Boston neighborhoods plus Cambridge, Somerville and Brookline as regions, filled with res-9 cells into `neighborhoods-h3.json`.
     - Tests `[F2.4]`: each cell in one region, and "Beyond" has no percent.
  8. **Events, words and puzzle** (`b/puzzle-data`; F7.1, F7.2, F7.5, F7.6, F7.7)
     - `pnpm data:events` validates a hand-written list that B checks event by event (all-ages, real link), adds the nearest station and writes `events.json`.
     - `pnpm data:words` from an openly licensed list, with the license recorded in DATA.md.
     - `src/lib/puzzle.ts`: the answer for a New York date, guess validation, feedback with repeated letters, the share grid, streaks.
     - Tests `[F7.1]` (midnight Eastern, DST), `[F7.2]`, `[F7.5]`, `[F7.6]`, `[F7.7]`.
  9. **Station cards** (`b/station-cards`; F3.3)
     - `pnpm data:cards`: Wikipedia geosearch within 600 m, the extract, the page image with author and license, one Gemini sentence of 140 characters or fewer that uses only the extract, and one nearby spot (grade A first).
     - Gemini output cached so a rerun makes no new calls. Fixture tests for article choice, length and license fields.
     - copy-critic on the sentences. Demo-line cards listed here for B's check (gate).
  10. **Check-ins, badges and stats** (`b/badges-stats`; F6.2, F8.1, F8.2, F8.3, F8.6, F12.1)
      - `src/lib/checkin.ts` (150 m, accuracy 100 m or better, time window), `src/lib/badges.ts` (night and explorer rules), `src/lib/stats.ts`.
      - Tests `[F6.2]`, `[F8.1]` for each badge (30 s tie, 2-person minimum), `[F8.2]`, `[F8.3]`, `[F12.1]`.
  - Then `/phase-gate 2`.
- **Decisions:** B confirms D-013 to D-044, with D-031 amended (demo rows flagged in the hypertables) and D-018's school list taken by B (D-045). B's Phase 2 answers are D-046 (data model) and D-047 (graph, service-date cutoff, demo lines).
- **Asks for A:**
  - **Prototype by 4:00 AM (D-067), from B's human.** Please do three things:
    1. Merge B's stack now, in order: #16 (then B's human applies migrations 0002 and 0003), #17, #18, #19, #21, #22, #23, #26, then the station-cards PR.
    2. Say whether you agree to the core-loop scope and to building feature UI before the Phase 1 gate.
    3. If yes, build the screens: profile with home station, map with fog in 2D, plan builder with options and leave-by, puzzle. B wires Server Actions and route handlers to the existing `src/lib` rules.
  - B's session has no Vercel login, so B can't run `vercel ls` or `vercel inspect`. After each of B's merges, please run the production deployment check in TEAM.md's merge checklist. B starts the preview check from the PR's Vercel status URL with `gh workflow run`.
  - The recorder: move it from Phase 3 into Phase 2, right after the hypertable migration, so replay has more recorded trips? It changes PHASES and adds a cron to `vercel.json`, so both humans decide. B agrees.
- **Blocked:** none. Vercel still won't build B-authored commits, so A merges B's PRs with an admin override after CI and the critics pass, then an A docs PR deploys production (D-052). B has no previews; B's human can join the Vercel team later to change that.

## Open questions

- Move the recorder into Phase 2? See Asks for A under Builder B.
- Replays and fog (Phase 3, D-063): F3.5 says replay reveals cells like a live ride, so replays clear fog without riding. A replay's own ride summary counts its events, as F3.5 asks, but its events earn no badges and don't count in night or lifetime totals. The cells it clears do count toward percent uncovered and First Light. Keep that, or make replays reveal nothing? Decide before Phase 3's ride work.
- Prices (Phase 2 item 6, D-061): OpenStreetMap has no price tags for these spots, so only fast food, food courts, ice cream and cafes count as "$" and every other price is unknown. The budget filter therefore excludes nothing today. A real price source (for example Google Places price levels through Gemini Maps grounding, shown as the place's data, not AI's) would make the budget filter (F4.5) meaningful. Decide by Phase 4.
- Vibe and the F4 category list (Phase 2 item 5, D-057): the plan builder (F4 flow) asks for food, coffee, dessert, bar, club or event, and for a vibe. The place data has `culture` and `park` too (for crawls, F10.2), and no vibe tags yet. F4.5 doesn't require vibe, so the solver ignores it for now. Decide in Phase 4 whether vibe comes from Gemini vibe tags (ARCHITECTURE section 9) or is dropped from the flow.
- Rail-replacement shuttles (Phase 2 item 4, D-056): on diversion nights the MBTA replaces subway segments with `Shuttle-*` bus routes (Fri 2026-11-20: Broadway to JFK/UMass and North Quincy). The last-train search is subway-only (D-006), so it says "no train home" there. B proposes adding shuttle routes whose stops are subway stations to `timetable.json` for the last-train search only. Both humans decide, since it touches D-006. **Deferred (B, 2026-11-22):** not a priority now; revisit at the end if needed.
- Anonymous profiles (D-005) or a sign-in step? A is weighing it. Decide before Phase 3, which builds F1.
- GoDaddy Registry domain: not registered yet.
- The Tiger trial credit runs 29 days. Check the Tiger billing page for what happens when it ends, and decide before then.
- Does either builder have a mid-range Android phone for the Phase 1 fog frame-rate check? Chrome's CPU throttle doesn't slow the GPU, and the fog runs mostly on the GPU. A will say when one is ready (2026-11-21).
- Why doesn't the service worker activate behind Vercel protection, and why did installability fail on the protected production URL but pass on a protected preview (D-043, D-044)? Investigate in Phase 9's PWA polish.
- If Vercel's `repository_dispatch` event starts arriving, its production runs will target the protected generated URL and fail. The workflow would then have to send production events to `fogline-mu.vercel.app` (D-044). A guard in `tests/e2e/deployment-url.ts` that accepts only that domain for `production` would turn those 14 confusing failures into one clear error (code-critic NIT).
- Branch protection doesn't require branches to be up to date before merging. #7 and #8 merged a minute apart without being tested together. Turn on "require up to date" if that keeps happening (A's call: it adds a rebase before each merge).
- **For Builder B** (from A's kickoff review and the Phase 0 gate):
  - `places` stores only the nearest station. A spot 300 m from Park Street but closer to Downtown Crossing never shows up for Park Street. Store every station within 600 m walking. (Done in D-046.)
  - Drizzle runs all pending migrations in one transaction (confirmed in `drizzle-orm/pg-core/dialect.js`, 0.45), and creating a continuous aggregate `WITH DATA` fails inside a transaction. Use `WITH NO DATA` plus a refresh policy.
  - Drizzle decides what's pending by migration timestamp only, not content. Never edit a migration that has been applied anywhere shared; add a new one.
  - Your tables go in `src/server/db/schema.ts`, which is empty for now.
    - `pnpm db:generate` for schema changes.
    - `pnpm db:generate --custom --name=<name>` for hypertable SQL.
    - `MIGRATE_DATABASE_URL=<target> pnpm db:migrate` applies migrations. Keep that key out of `.env`, because drizzle-kit loads `.env` (D-043, TEAM.md git flow).
    - Integration tests run against `DATABASE_URL_TEST`: a TimescaleDB container in CI, or locally `docker run -d --rm -e POSTGRES_PASSWORD=postgres -p 54329:5432 timescale/timescaledb:2.32.1-pg18` with `DATABASE_URL_TEST=postgres://postgres:postgres@localhost:54329/postgres`.
    - Your first table test needs migrations applied to the test database first, for example a Vitest `globalSetup` for the integration project that runs `migrate()`.
  - Unique indexes on hypertables must include `ts`, so a unique constraint on `checkins` can't stop duplicate check-ins. (Handled in D-046.)
  - The schema has nowhere to store friend status (F6.1) or "I'm on the train" taps (Closest Call, last trains caught). (Handled in D-046.)
  - The recorder samples once a minute, so trains move several stops between samples. "Passed" should cover every stop between two observed stop sequences (F3.3, F3.5). A and B agree on this before Phase 3.
  - "Beyond" has no fixed number of cells, so it shouldn't show a percentage.
  - F10.4 mentions "crawl templates", but nothing defines them.
  - Turning the recorder on as soon as the hypertable migration lands, rather than in Phase 3, gives replay more data.

## Gate results

Copy this table for each phase when its gate runs.

### Phase _n_ gate

| Check | Result | Evidence |
|---|---|---|
| typecheck / lint / unit / e2e / build | | |
| token check | | |
| code-critic | | |
| test-auditor | | |
| design-critic (if UI) | | |
| copy-critic (if copy) | | |
| axe | | |
| docs current | | |
| phase-specific checks | | |

### Phase 1 gate

Run 2026-11-21 by Builder A. Code at `main` `957c3c4` (local runs on `2ed9c2c`, the same tree before the squash), then this PR's small follow-ups. Scope as cut by D-060.

| Check | Result | Evidence |
|---|---|---|
| typecheck / lint / unit / e2e / build | PASS | Local on `2ed9c2c`: typecheck and lint clean. Vitest 95 passed, 1 skipped (the live DB check). Playwright 59 passed, 13 skipped (deployment-only specs, and Chromium-only specs on WebKit). Build compiled (`.next/BUILD_ID` 23:41:46, from the e2e web server). CI green on #24, #25 and #27, and on #16 (re-run, 3m28s) after Phase 2 joined. This PR: vitest 250 passed. |
| token check | PASS | `design-tokens.test.ts` scan: 0 findings across `src/`. The `src/components/ui/` exemption is gone (D-059). AA for every text pair, 3:1 for controls and F2.3 lines, day and night. |
| code-critic | PASS | Every item reviewed: item 4 FAIL, then narrow re-check PASS (`8a3be98`); 6a FAIL, 6b FAIL, then a narrow re-check of the fix commits `c1642ed`, `16e3348`, `bfa6a5f` and `2ed9c2c` PASS: all four blocking items fixed (safe areas for toast and sheet, tab-panel focus, a string outside `src/copy/`, the `/design` hydration mismatch), no new blocking bug. B's Phase 2 PRs each record their own code-critic PASS. |
| test-auditor | PASS | Audited by Builder A, not the subagent (D-060, credits). Every criterion Phase 1 touched has a named test that runs: F2.2 (4 tests), F2.3 (3, plus LineBadge names), F2.5 (StaleChip), F2.6 (4, including the WebGL-off e2e), F5.4 (Countdown tones), F8.4 (count-up and reduced motion). F2.3's layer-order test belongs to the Phase 3 map (D-058). |
| design-critic (if UI) | PASS | Gate pass on `/design` and `/design/fog`, run on production (`main` `957c3c4`): 390×844 day and night, 360, 768 and 1440 with no horizontal scroll, every target 44 px or more, every contrast pair AA, sheet focus and tap-to-snap, toast, chips, stepper, tabs, count-up, countdown tones, fog reveal on tiers 3, 2 and 1. No BLOCKING. Its should-fix: two pairs added to `pairs.ts` and the night offline banner softened (this PR); the rest is logged below. Earlier item passes: 4 FAIL, fixed; 6a FAIL, fixed. |
| copy-critic (if copy) | PASS | The gate's design-critic pass covered copy (D-060): no BLOCKING. "Delete my data" became "Delete data" in this PR. Earlier copy-critic runs: item 4 FAIL, fixed; item 6 FAIL, fixed. |
| axe | PASS | `design.spec.ts`: 0 serious or critical violations on `/design` with the OS in light and in dark, on desktop-chrome, iphone and pixel. |
| docs current | PASS | This log covers items 1, 4, 5 and 6 and the D-060 cut of items 2, 3, 7 and 8. DECISIONS has D-050 to D-064 (B's numbers renumbered at merge). WALKTHROUGH: Phase 1 ships no PRD feature, so no entry is due. DATA: no data source or algorithm changed in Phase 1. |
| Fog frame rate and 2D fallback | PASS | D-058: tier 3 and tier 2 mean 1.3 ms, p95 3 ms under 4× CPU throttle with Pixel 7 emulation (M4 Pro, vsync off). The real phone check waits on A's Android phone. `[F2.6]` e2e renders the SVG fog with WebGL disabled. |
| Visual baselines | DEFERRED | Moved to Phase 9 (D-060). |
| Both humans approve the canvas (as cut) and `/design` | A: PASS. B: WAITING | A approved `/design` and the canvas as cut on 2026-11-21 23:58 ET, in chat. B's human approves here and confirms direction C. Canvas: https://claude.ai/artifact/4o3hJj7QBSBavvV4LburQR |
| Production works at phone size | WAITING | Runs on the production deployment after this PR merges (the first A-authored commit after Phase 2, D-052). |

### Phase 0 gate

Run 2026-11-21 by Builder A on `main` at `4b7aa05`. Second pass, after the D-043 fixes.

| Check | Result | Evidence |
|---|---|---|
| typecheck / lint / unit / e2e / build | PASS | Local, with the test database: typecheck, lint and `format:check` clean. Vitest 24 passed, 1 skipped (the live `fogline-db` check, which needs `LIVE_DATABASE_URL`); `src/lib` line coverage 96.3%. Playwright 39 passed, 12 skipped (Chromium-only specs on WebKit, deployment-only specs). Build compiled. CI on the `main` push (run 44961077823) green. |
| token check | PASS | 8 matches, all in `src/components/ui` (shadcn, D-037). 0 anywhere else. |
| code-critic | PASS | Third pass, on `7ba398f` and the D-044 change, with run logs and `curl` checked. No BLOCKING. The SHOULD FIX (the production alias isn't tied to a commit) is handled by the compare step in TEAM.md's merge checklist. Three of four NITs are fixed on `a/phase0-handoff`. The fourth, a production-domain guard, is under Open questions. Earlier passes: first FAIL, second PASS (D-043). |
| test-auditor | PASS | Second pass, on the D-043 fixes. The installability test now has a negative control that sees `no-manifest`, and the `/api` cache test failed against a mutant `sw.ts`. |
| design-critic (if UI) | N/A | Phase 0 UI is placeholder. design-critic starts in Phase 1 (PHASES.md). |
| copy-critic (if copy) | PASS | Manifest, metadata, offline, error and 404 copy. The offline wording was corrected (D-043). |
| axe | PASS | 0 serious or critical violations on `/`, `/offline` and the 404 page, in desktop-chrome, iphone and pixel: locally, in CI, and on production (run 44961601553). |
| docs current | PASS | This log covers PHASES items 1–10 and both gate passes. DECISIONS has D-036 to D-044. WALKTHROUGH: Phase 0 builds no PRD feature (F1–F16), so no entry is due. DATA: no data source or algorithm yet. |
| Fresh clone | PASS | `gh repo clone` of `main` at `4b7aa05` into an empty folder, then `pnpm install && pnpm exec playwright install && pnpm test && pnpm test:e2e && pnpm build`, exit 0. Vitest 21 passed, 4 skipped (a fresh clone has no test database). Playwright 37 passed, 14 skipped. Build compiled. |
| CI green on a PR; preview at 390×844 on iPhone and Pixel | PASS | PR #9 `check` (run 44960796806) and the Vercel build passed. Deployment check on #9's protected preview (run 44959800680, `bdcf7f6`): 28 passed, including the smoke test at 390×844 on iphone (WebKit) and pixel. The later `7ba398f` changed no app code. |
| Manifest valid; installable in Chrome; manual install | PASS | Manifest fields, icon sizes and `Page.getInstallabilityErrors` with no errors passed on #9's preview (run 44959800680) and on production (run 44961601553). The negative control saw `no-manifest`. A installed it by hand in desktop Chrome from `https://fogline-mu.vercel.app`, and it opened as a standalone "Fogline" window. |
| `/api/health` returns `timescaledb: true` on a deployment | PASS | `deployment.spec.ts` on #9's preview (run 44959800680) and production (run 44961601553): 200, `no-store`, `{ db: true, timescaledb: true }`. |
| Hooks, `/phase-start`, `.env` ignored | PASS | `.claude/settings.json` has the PostToolUse formatter, the Stop reminder (both tested in #8; the formatter ran on every edit this session) and four `.env` deny rules. `/phase-start` ran this session. `git check-ignore` matches `.env` and `.env.local` (`.gitignore` lines 15–16), and `.env.example` is the only tracked env file. |
| Production works at phone size | PASS | Production check on `https://fogline-mu.vercel.app` (run 44961601553, `4b7aa05`): 40 passed, 11 skipped, including the smoke test at 390×844 and all 12 service-worker tests (font precache included). The same deployment's generated URL failed 14 tests behind protection (run 44961127767), so production checks now target the production domain (D-044). |

## Log

Format: `YYYY-MM-DD HH:MM ET · Builder A|B · what changed (commits) · tests · next`.

- 2026-11-22 04:20 ET · Builder A · Phase 5 daily puzzle (`a/daily`) and #37 merged:
  - #37 (plans) squash `49aed51` after code-critic FAIL → fixes (arrival order refreshes every 8 s while live, `[F6.3]` e2e; arrivals only to members; live mode closes 4 h after start; keys) → PASS. CI first failed on `format:check` (Prettier not run before push); fixed, and format:check is now in A's pre-push checks.
  - **For B (SHOULD FIX from code-critic):** `checkIn` accepts check-ins until `endedAt` is set, and nothing ends a plan automatically yet (F6.4 cron). Either the cron or a 4 h cap in `checkInValidity`.
  - `/daily`: the board as stops on a line (filled = right spot, ringed = wrong spot, dashed = not in the word; DESIGN asks for no borrowed word-game tiles), on-screen and hardware keyboard, guesses stored in `puzzle_results` through `submitGuess` (`src/server/actions/daily.ts`), k=1 cells around the venue on a solve, the event card with station, walk, minutes from home and source, Plan it (prefills the builder's time), share grid, streak. `src/server/daily.ts` replays stored guesses.
  - Tests: e2e `tests/e2e/daily.spec.ts` (`[F7.2]` `[F7.3]` `[F7.4]` `[F7.5]` `[F7.7]`) 6/6; screenshots at 390×844 in both themes.

- 2026-11-22 03:50 ET · Builder A · Phase 4 screens, plan builder and plan page (`a/plan-builder`):
  - `/plans` (upcoming and past), `/plans/new` (friends with stations, start time, kinds of spot → up to 3 fair options with minutes bars, leave-by and no-train warnings, spots → createPlan), `/p/[id]?t=` (spot, people, leave-by for members, Join, invite link, live mode 30 min before the start with countdown, check-in with location and its failure lines, arrival order, End for the organizer).
  - **Note for B (your file):** `planByInvite` in `src/server/actions/plans.ts` now also returns `inviteToken` (members only), `viewer` (member, organizer), `arrivals` (first valid check-in per person) and per-person `you` and `placeholder`. `src/server/plans.ts` adds `myPlans`.
  - Tests: `tests/component/plan-builder.test.tsx` (`[F4.6]` `[F4.9]` `[F4.1]` `[F5.3]` `[F5.7]`), e2e `tests/e2e/plans.spec.ts` (Phase 4 gate run: build, create, join in a second context, check in with mocked location, end) 3/3 on desktop-chrome, iphone, pixel.
  - Not built: F4.7 agent text, F5.4 20/5-minute alerts, F5.6 alerts text, F5.8 .ics, Open Graph images, F6.1 directions to the station.

- 2026-11-22 03:20 ET · Builder A · Phase 3 item 4, F3 ride replay ([#35](https://github.com/Achyut21/fogline/pull/35), `a/ride-replay`):
  - Rebased onto `main` (`7ef3feb`); replay reads shapes through `data.shapes()`. Component test `tests/component/ride-replay.test.tsx` (`[F3.3]` `[F3.4]` `[F3.5]` `[F3.8]`) and the Phase 3 gate e2e `tests/e2e/ride.spec.ts` (seeded Green-D trip, onboarding, sheet → Ride from here → 20× past three stops → summary → stations uncovered; plus End with reduced motion). e2e 15/15 with onboarding and the sheet on desktop-chrome, iphone, pixel; 350 unit/component/integration passed; lint and typecheck clean.
  - Seen at 390×844 in night theme on a local build against the test DB; fixed "1 lines" in the summary.
  - code-critic: PASS, no BLOCKING. Fixed two SHOULD FIX: trip IDs repeat daily, so a 30-minute gap now starts a new run and only the latest is kept (test fails on the old code); the stop action allows 2 h past the 24 h list window so a replay started from the list keeps recording.
  - Logged, not fixed: a stop whose `recordReplayStop` call fails (offline in a tunnel) is not retried and the summary undercounts new cells without saying so.
  - Speed (A, 2026-11-22): design-critic and copy-critic run once over all the new core-loop screens instead of per item. B is taking Phase 6 alone.

- 2026-11-22 01:52 ET · Builder A · Handoff (session limit; the next session runs under another Claude account):
  - **Finished this session:**
    - #29 onboarding, squash `28babbf`; preview check (run 44989873205) and production check (run 44990097301) passed. It ships D-065 (restore without a rate limit); A's sign-off is still open.
    - #31 (with #30's station cards), admin squash `f61e868` (D-052) after A merged `main` into `b/core-loop` and fixed code-critic's 3 BLOCKING findings (unsigned profile cookie, non-member check-ins, home stations shown to non-members, 21+ rule). #30 closed as included. B's D-061 and D-062 became D-066 and D-067.
    - #32 fog map, squash `3926558`, after fixing code-critic's BLOCKING fog-mask bug (`3e4a496`, `fa9faef`); production check passed (run 44993413583).
    - #34 station sheet, squash `a07c680`, after code-critic (3 BLOCKING) and copy-critic (4 BLOCKING) fixes; production check passed (run 44995127019). Predictions route on production: 0.67 s cold, 0.2 s warm.
    - A applied migrations 0000–0003 to `fogline-db` at about 06:28 UTC. Production had none recorded, so 0001 (`profiles`, `revealed_cells`) probably landed then too: onboarding on production could not have saved a profile before. The recorder has stored trains every minute since 06:29 UTC.
  - **In progress: item 4, F3 ride replay, on `a/ride-replay` (pushed, `e1d6bc6`, based on `main` `a07c680`). Not ready to merge.**
    - Files: `src/lib/replay.ts`, `src/lib/geo/along.ts` (a copy of the pipeline's along-the-shape projection), `src/server/replay.ts`, `src/server/actions/ride.ts`, `src/app/ride/page.tsx`, `src/app/ride/[trip]/page.tsx`, `src/components/ride/ride-replay.tsx`, `src/components/map/stop-card.tsx` (moved out of the sheet), "Ride from here" in `station-sheet.tsx`, `src/copy/ride.ts`, `tests/support/recorded-trip.ts`, `tests/unit/replay.test.ts`, `tests/integration/replay.test.ts`.
    - Seen working at 390×844 (light only) on a local build against the test database with a seeded trip: list "To Chestnut Hill · Left 1:11 AM · 7 stops · 13 min", the riding view with stop cards advancing at 20×, and the summary (7 stops, 4.4 mi, 13 min, 1 line, 50 new cells).
    - **Exact next steps:**
      1. Component test for `RideReplay` (`[F3.4]` summary numbers, `[F3.5]` speed and the Replay label, the stop card per stop, reduced motion).
      2. e2e `tests/e2e/ride.spec.ts`: seed a trip with `recordedTripRows` into `DATABASE_URL_TEST`, onboard, open a station sheet → Ride from here → the trip → 20× → past three stops → summary → back on the map with the passed stations uncovered in the list view. Run it on desktop-chrome, iphone and pixel. This is also item 5's gate e2e.
      3. Check night theme and reduced motion in the running app; run `pnpm test`, typecheck, lint.
      4. Rebase onto `main` (`7ef3feb`, #33 is in). #33 added `data.shapes()` to `src/server/data.ts`; switch `src/server/replay.ts` from its static `shapes.json` import to it.
      5. code-critic, then design-critic (first ride UI) and copy-critic (`src/copy/ride.ts`, the "Ride from here" button). Open the PR, run the preview check, merge, run the production check.
      6. Docs: DATA (replay timeline rule), DECISIONS (the "passed" rule, D-063 kept), WALKTHROUGH F3.
    - Known gaps to settle in review: the wake-lock request's rejection handler does nothing (a browser may refuse the lock); summary "lines" is always 1; replays on the same trip can be recorded twice.
  - **B's #33** (demo seed, How it works, #31 review fixes): A merged `main` into `b/demo-seed` (`31d38b1`, conflicts in PROGRESS and `src/server/data.ts`), B pushed `137f519` and `c05a458` on top, CI passed, and A admin-squashed it as `7ef3feb` (D-052). Vercel won't deploy a B-authored commit, so production picks it up with the next A merge; run the production check then.
  - **For B:** the recorder works; migrations are on `fogline-db`. TimescaleDB warned during 0003 that `vehicle_id` should be used for segmenting or ordering `vehicle_positions` compression. `maxWalkM` moved from `src/lib/solver/fair.ts` to `src/lib/places/types.ts`. `src/server/stations.ts` has `stationOfStop` (terminal track IDs map by station name). `next.config.ts` traces `data/*.json` into every function, which your runtime `data.ts` reads need. No new environment variables, no new migrations, no regenerated data files, no design tokens changed. New dependency: `@tanstack/react-query`.
  - **Tests:** `main` passes everything (CI and production checks above). On `a/ride-replay`: `tests/unit/replay.test.ts` (4) and `tests/integration/replay.test.ts` (3) pass locally; no component test or e2e yet; full suite not rerun since the last commit.
  - **Local setup for the next session:** another chat's `next dev` (port 3003) serves `/Users/achyutkatiyar/fogline` with `.env`, which is `fogline-db`; don't sign up there. This session ran the app from a scratch git worktree against the test database (`DATABASE_URL=postgres://postgres:postgres@localhost:54329/postgres` plus a throwaway `SESSION_SECRET`, `next dev -p 3300`). That worktree is in this account's scratchpad and may be gone; make a new one with `git worktree add --detach <dir> a/ride-replay`, then `git worktree prune` afterwards.

- 2026-11-22 01:40 ET · Builder A · Phase 3 item 3, F2.5 station sheet ([#34](https://github.com/Achyut21/fogline/pull/34), `a/station-sheet`):
  - Built: `/api/mbta/predictions` (TripUpdates parsed to subway revenue trips, one fetch per 5 s for every station, last good copy with its age on failure, failures remembered for 5 s), a network-first service-worker rule for `/api/mbta/*`, TanStack Query scoped to the map, and the StationSheet (lines, minutes by T from home, trains by line direction, stale chip, stop card once uncovered, 3 nearest spots with the F1.5 rule, all states). Opens from the map and the list. `next.config.ts` traces `data/*.json` for B's runtime reads. DATA 3.13, D-068, WALKTHROUGH F2.
  - code-critic: FAIL, 3 BLOCKING (terminal track IDs like `Alewife-01` hid the train on the platform; the per-direction cap was shared across lines, hiding the Red Line at Park Street; departed trains read "Now" on old data), all fixed. Re-check PASS; its two SHOULD FIX (a body cut off mid-read gave a 500; a hanging feed was retried by most requests) fixed with tests that fail on the old code.
  - copy-critic: FAIL (MBTA and photo credits not COPY.md's exact lines, grades without the unofficial label, walks without "about"), all fixed. Re-check PASS; its notes applied (the aged-out line no longer blames the MBTA when the user may be offline; `maxWalkM` moved to `src/lib/places/types.ts` so the client sheet doesn't import the solver).
  - Tests: `[F2.5]` parser (recorded snapshot, terminal track, two-line cap), route (cache, failure memory, cut-off body), sheet data, sheet states, `[F11.3]` label, e2e sheet with axe and with reduced motion, offline train times in `pwa.spec.ts`. 327 unit/component/integration passed locally; sheet e2e 6/6 on desktop-chrome, iphone, pixel.
  - Checked at 390×844 day and night with live trains (Kenmore, Park Street both lines); route 0.24 s on a fresh feed fetch, 4 ms cached (local).
  - Logged for later (critics' NITs): track IDs map by station name, not GTFS `parent_station`; the e2e depends on the live feed; the map page's RSC payload is 187 KB uncompressed (spots about 40 KB).

- 2026-11-22 01:21 ET · Builder A · Merged #32, the fog map home (`3926558`):
  - code-critic (first recorded pass): FAIL, 1 BLOCKING. The 3D fog's mask stopped at Boston, Cambridge, Somerville and Brookline, so 21 outer home stations (Ashmont, Braintree, Oak Grove, Riverside and others) sat under solid fog on tiers 2–3 while the card said they were clear. Fixed in `3e4a496` (mask covers every station plus about 1.2 km; test `[F2.1] [F2.2] the map's mask shows the home cells of every station`), with the reveal band, finger radius and grain scaled back to their Phase 1 size and the map and list made keyboard- and screen-reader-friendly (`fa9faef`). Re-check PASS. Checked at 390×844 with home Braintree, day and night.
  - CI, preview check (`fa9faef`) and production check (run 44993413583) passed.
  - Logged from code-critic for later: the map ignores fog changes after load unless `revealAt` changes; the first-reveal card comes back on every visit; 110 KB of line shapes ride in every home response; MapLibre's controls inside the map region need an axe pass on `/`; the list collapses seen and visited; the SVG fallback ignores the home center; List → Map remounts the renderer and its probe WebGL context; `/` has no offline banner, no catch on the MapLibre chunk and no `loading.tsx`; `mapData` has no direct test; theme flips don't restyle the map.
  - **For B (blocking the recorder):** production logs show `/api/cron/record-vehicles` failing every minute with `relation "vehicle_positions" does not exist`. Migrations 0002 and 0003 aren't on `fogline-db` yet. Apply them: `MIGRATE_DATABASE_URL=<pooled fogline-db URL> pnpm db:migrate`, then check `timescaledb_information.hypertables`.

- 2026-11-22 00:45 ET · Builder B · Prototype track (D-067) on `b/demo-seed`, from `main` after A merged #31:
  - `src/server/demo.ts`: `seedDemo(db)`, B's half of demo mode (F16.1, F16.2).
    - Every `/demo` visit gets its own flagged copy: the visitor, plus Priya at Harvard and Sam at Tufts.
    - The copy holds last Friday's dinner, planned by the real fair solver, with check-ins and the cleared fog.
    - Badges come from the real rules: First In, Fashionably Late, On the Dot, Planner.
  - `cleanupDemo` with `/api/cron/cleanup-demo` (hourly, `CRON_SECRET`): deletes copies older than 24 hours and never touches real profiles.
  - `src/server/how-it-works.ts`: `cachedHowItWorks(db)` for F15.1 and F15.2, cached 60 s.
    - Row counts for the four hypertables, without demo rows.
    - The compression ratio, the last recorder run, and the fair solver's time.
  - `awardNightBadges` takes a database handle.
  - Tests: 5 integration tests against the test database (two copies isolated, badges present, cleanup only of expired demo rows, counts without demo rows, the 60 s cache).
  - Reviews (one pass each, D-067):
    - #31's server code: PASS.
    - Demo seed: PASS.
    - How it works: FAIL. The solver timer counted data loading, so the first load showed ~256 ms for a ~20 ms solve.
  - Fixed:
    - A demo visitor's plans and check-ins carry `is_demo`, so they stay out of real stats (F16.2).
    - `endPlan` awards badges again on retry.
    - `myStats` reads only the profile's own plans, and every data file goes through `src/server/data.ts`.
    - The recorder skips a bad train instead of losing the minute.
    - The solver is timed warm, as the median of 3 runs on next Friday's plan, and reports null if the run finds no options.
    - Demo names live in `src/copy/demo.ts`.
    - Tests now check who gets each badge (the visitor also earns Long Haul from BU), that real plans and check-ins survive cleanup, demo rows in every hypertable, and a real columnstore ratio.
  - Second review of the fix commit (asked for by B's human): FAIL. `joinPlan` let demo and real plans mix: a real student in a demo plan would lose their check-ins at cleanup, and a demo profile in a real plan would count in real stats.
    - Fixed: `joinPlan` refuses across the demo/real line.
    - Also fixed: a second End tap keeps the first end time, and `myStats` skips the query without check-ins.
    - New tests: `[F16.2]` both directions, `[F6.4] [F8.6]` creator-only end and no duplicate badges, `[F8.3]` nights out, and next-Friday timing across clock changes (runs without a database).
  - Deferred (prototype): the puzzle is stateless until `puzzle_results` is stored, so the six-guess limit is client-side for now.
  - **For A:** `solverMs` is null when the timed plan finds no options. The How it works page needs a string for that case.
  - **For A:** `tests/unit/design-tokens.test.ts` fails on Windows only. `path.relative` returns backslashes, so the `exempt` prefixes never match. Using `path.posix` or normalizing separators would fix it.
  - **For A:** `/demo` calls `seedDemo(getDb())` and then `startSession(profileId)`. Also needed from A: the Demo chip, the How it works page reading `cachedHowItWorks(getDb())`, and the data-source credits in `src/copy`.
- 2026-11-22 00:57 ET · Builder A · Merged Phase 3 item 1 and B's prototype server work:
  - **#29 onboarding:** squash `28babbf`. Preview check (run 44989873205) and production check (run 44990097301) passed. Merging it ships D-065 (restore without a rate limit); A's sign-off is still open.
  - **#31 core loop, with #30's station cards:** admin squash `f61e868` (D-052). The Phase 2 commits under #30 were already on `main` through #16, so A merged `main` into `b/core-loop` keeping `main`'s side (`1ce35a5`). #30 is closed as included.
  - **Renumbered:** B's D-061 (station cards) is now D-066 and D-062 (prototype track) is D-067. B's new lines citing D-057 and D-059 now cite D-061 and D-063.
  - **Fixed on `b/core-loop` before merging:**
    - Prettier on `plans.ts` had stopped CI before the tests ran.
    - `f5f2769`: plan, check-in and stats actions read an unsigned `fogline_profile` cookie holding the raw profile ID. They now use `sessionProfileId()`. B's duplicate `createProfile` and `myProfile` are gone; onboarding and `currentProfile()` cover them.
    - `ef03f8d`, `c64362e` (code-critic FAIL, 3 BLOCKING):
      - `checkIn` needs a seat in the plan, and night badges count only members' check-ins (F6.2, F8.1).
      - `planByInvite` shows home stations and leave-by times to members only (F4.8).
      - A 21+ stop hides the venue from anyone not known to be 21+, and under-21 profiles can't create or join such a plan (F4.9). `findMeetup` takes the age rule from the profile, not the request (F1.5).
      - Smaller fixes: every puzzle guess is checked, so earlier guesses can't probe letters (F7.2); `createPlan` checks the stop's station; `joinPlan` validates the token, refuses ended plans and ignores a double tap.
    - Tests: `tests/integration/plans.test.ts` (`[F4.8]`, `[F4.9]`, `[F6.2]`, `[F1.5]`) and a `[F7.2]` unit test. 305 passed locally with the test database; the `[F6.2]` test fails with the participant check removed. code-critic re-check PASS. CI green on `c64362e`.
  - **Known limits, not fixed (code-critic):**
    - `myStats` reads every ended plan in the database on each call.
    - `vehicleRows` parses the whole feed at once, so one malformed entity loses that minute.
    - The cron's bearer check isn't timing-safe.
    - `checkIn` has no rate limit, and invalid attempts are stored too.
    - Badges awarded after `endPlan` commits have no retry.
    - `me.ts` has its own data-file loader.
    - `findMeetup` now needs the database to read the profile.
    - `data.ts` reads `data/*.json` at runtime, so the first page that calls these actions needs `outputFileTracingIncludes` for `data/**` in `next.config.ts` (B's ask).
  - **Production:** the recorder cron (`/api/cron/record-vehicles`, every minute) goes live with #32's deployment. `CRON_SECRET` is set in Vercel. **For B:** confirm migrations 0002 and 0003 are applied to `fogline-db`; until they are, the recorder logs an error every minute.
  - **Next:** merge #32 (fog map), production check, then item 3 (F2.5 station sheet, plan awaiting A's yes).

- 2026-11-22 00:27 ET · Builder A · Handoff (session limit; the next session runs under another Claude account):
  - **Done this session:** Phase 1 closed on A's side (gate table above; B's human still approves `/design` and confirms direction C). Items 4, 6a, 6b merged (#24, #25, #27), gate docs #28, B's Phase 2 stack merged as #16 (`7dadf7d`), production check passed on `1e7ba16`. A set `SESSION_SECRET` in Vercel (Production and Preview) and redeployed.
  - **Open PRs:** [#29](https://github.com/Achyut21/fogline/pull/29) Phase 3 item 1, onboarding (`a/onboarding`, CI re-running after the code-critic fixes and the last-train timeout). [#32](https://github.com/Achyut21/fogline/pull/32) item 2, the fog map home, stacked on #29 (`a/map`): retarget to `main` after #29 squash-merges, then rebase onto `main`. B's #30 (cards) and #31 (core loop) are open; merge them the D-052 way.
  - **B:** applying migrations 0002 and 0003 to `fogline-db` now (B's message); B confirms through `/api/health` and the board.
  - **Pending A's word:** D-065 (restore without a rate limit until after the hackathon). Recommended: accept; fix = one `rate_limits` table keyed by IP, about 10 attempts per 15 min, in `restoreProfile`.
  - **Exact next step:** merge #29 when CI is green, check onboarding on production at 390×844, retarget and merge #32, then item 3: the station sheet (F2.5) with `/api/mbta/predictions`. `FogMap` already takes `onStation(id)`; `MapScreen` doesn't pass it yet.
  - **Local dev:** `pnpm dev` reads `DATABASE_URL` from `.env`, which is `fogline-db`. Don't submit onboarding there. To see a signed-in map, run next dev with `DATABASE_URL` set to `DATABASE_URL_TEST` (a node launcher that reads `.env` and spawns `next dev -p $PORT`); only one `next dev` per folder.

- 2026-11-22 00:20 ET · Builder B · **Handoff**
  - **Finished this session.** Each item is a stacked PR into the one before it; merge in this order, retargeting each to `main` as the one below it merges:
    1. #16 hypertables
    2. #17 GTFS
    3. #18 last train
    4. #19 fair solver
    5. #21 places and grades (`ab581ee`)
    6. #22 neighborhoods (`94a7041`)
    7. #23 check-ins, badges, stats (`b844786`)
    8. #26 puzzle (`fe194c2`, `983b3a2`)
    9. #30 station cards (`eb98cd9`, rebased)
    10. #31 core-loop Server Actions and the recorder
  - **In progress:** none half-done. Every branch is pushed and its checks pass.
  - **Blocked:**
    - B's PRs need A's admin merge (Vercel won't build B-authored commits, D-052).
    - The prototype needs A's screens. B's human chose to wait for A rather than have B build UI.
  - **For A:**
    - Shared files changed:
      - `package.json`: `data:events`, `data:words` and `data:cards` scripts; `ai` and `@ai-sdk/google` dependencies.
      - `vercel.json`: a `record-vehicles` cron every minute.
      - `.env.example`: `GEMINI_MODEL` is now `gemini-3.1-flash-lite`.
      - PHASES Phase 7 reading list, PRD F8.1.
    - Environment variables (names only): `CRON_SECRET` (already listed), `GEMINI_MODEL`.
    - Migrations: 0002 and 0003 (in #16); B's human applies them to fogline-db.
    - New data files: `events.json`, `words.json`, `station-cards.json`. `places.json` was regenerated.
    - Needed on Vercel: `outputFileTracingIncludes` for `data/**` in `next.config.ts`.
    - Decisions to read: D-063, D-064, D-066 and D-067.
  - **Tests:** 253 pass and 1 is skipped (the live Tiger check). `pnpm build` passes. No e2e for B's work (no UI). The database Server Actions haven't run against Tiger yet.
- 2026-11-22 00:18 ET · Builder B · **Phase 2 gate** on `b/core-loop` (the whole stack, items 1–10, plus the core-loop server work):
  - `pnpm typecheck` and `pnpm lint` pass. `pnpm test` with the test database: 253 passed, 1 skipped (the live Tiger check), with integration tests running; `src/lib` line coverage 99.85%. `pnpm build` passes.
  - Evidence:
    - known trips within 3 minutes (item 3);
    - known last trains match the MBTA schedule (item 4);
    - grade calibration recorded in D-061;
    - every pipeline rebuilds byte-identical files.
  - test-auditor: FAIL on F11.3 only, which moved to Phase 7 (D-061). Its weak tests are fixed.
  - Still open, both for B's human:
    - apply migrations 0002 and 0003 to fogline-db once #16 merges, so the hypertables exist on Tiger;
    - check the 47 demo-line station cards listed in the item 9 entry.
- 2026-11-22 00:18 ET · Builder B · Prototype track (D-067), server side on `b/core-loop`:
  - `src/server/actions/core-loop.ts`: `findMeetup` (fair options with each friend's trip and leave-by time), `todaysPuzzle`, `playPuzzle` (the answer never leaves the server).
  - `src/server/actions/plans.ts`: `createProfile` (cookie, no auth), `myProfile`, `createPlan`, `planByInvite` (with everyone's leave-by), `joinPlan`.
  - `src/server/actions/live.ts`: `checkIn` (validity rules, reveals 2 rings of cells), `endPlan` (awards night badges).
  - `src/server/actions/me.ts`: `myStats` (miles, stops, stations, percent of Boston, neighborhoods, lines, nights out, badges).
  - `/api/cron/record-vehicles` every minute (`vercel.json`), protected by `CRON_SECRET`.
  - Data loads from `data/*.json` through `process.cwd()`. **Ask for A:** on Vercel, add `outputFileTracingIncludes` for `data/**` in `next.config.ts`.
  - Tests: 6 unit tests (meetup, puzzle, recorder). The database actions haven't been run against Tiger yet; they need migrations 0002 and 0003.
- 2026-11-22 00:10 ET · Builder B · Phase 2 item 9, station cards, on `b/station-cards` (stacked on `b/puzzle-data`):
  - `pnpm data:cards` writes `data/station-cards.json`. All 125 stations have a card: 119 with a fact, 100 with a freely licensed image, and 123 with an all-ages spot (D-066).
  - The Gemini sentences come from `gemini-3.1-flash-lite`, and code checks them: 140 characters, one sentence, no banned words, and every number must be in the Wikipedia intro. Articles about bars, nightclubs and violent events are left out (F1.5).
  - Tests: 11 unit tests, including the committed file (one card per station, all-ages spots).
  - code-critic: one pass (D-067). Its blocking findings are fixed: bar articles, ungrounded numbers. Deferred under D-067: a reviewed exclusion list beyond the violent-event filter.
  - **Demo-line cards for B's check** (Red Line and Green Line E, 47 cards). Each line is the station, then the article and its fact, then the spot:
    - Alewife | Alewife Brook Reservation: Established in 1900, this Massachusetts state park and urban wild is located in Cambridge, Arlington, and Somerville. | Dunkin' (food)
    - Andrew | Old Harbor Housing Project: The 27-acre Mary Ellen McCormack Project is located opposite Joe Moakley Park in South Boston. | Dunkin' (food A)
    - Arlington | Arlington Street Church: The main sanctuary space has 16 large-scale stained-glass windows installed by Tiffany Studios from 1899 to 1930. | Tatte Bakery & Cafe (coffee A)
    - Ashmont | Parish of All Saints Ashmont: The Parish of All Saints is located at 209 Ashmont Street in the Dorchester neighborhood of Boston. | Peabody Square (park)
    - Ball Square | Powder House Square: The square is a six-way intersection of College Avenue, Broadway, Warner Street, and Powder House Boulevard. | Kelly's Diner (food)
    - Back of the Hill | Mission Hill, Boston: The neighborhood population was estimated at 15,883 in 2011. | Dunkin' (food A)
    - Boylston | Colonial Theatre (Boston): Opened in 1900, the Colonial Theatre is located at 106 Boylston Street on Boston Common. | Boston Common (park)
    - Broadway | South Bay Interchange: The South Bay Interchange occupies a 10-acre site between Chinatown and the Leather District. | Dunkin' (food A)
    - Brigham Circle | Boston Children's Hospital: It is the main pediatric training and research hospital of Harvard Medical School. | Thea and James M. Stoneman Centennial Park (park)
    - Braintree | Braintree, Massachusetts: The population of Braintree was 39,143 at the 2020 census. | Daily Soccer Field (park)
    - Charles/MGH | Massachusetts General Hospital: Massachusetts General Hospital is the third-oldest general hospital in the United States with a patient capacity of 999 beds. | Dunkin' (food A)
    - Central | Harvard Graduate Students Union: The bargaining unit comprises about 5,000 student employees at Harvard University. | Veterans of Foreign Wars Memorial Park (park)
    - Copley | Boston Public Library: Founded in 1848, the Boston Public Library contains approximately 24 million items. | Chick-fil-A (food A)
    - Davis | Davis Square: The Red Line was extended to Davis in 1984. | Somerville Theater (culture)
    - Downtown Crossing | Jordan Marsh: Eben Dyer Jordan and Benjamin L. Marsh founded the department store chain in 1841. | Winthrop Square (park)
    - East Somerville | Inner Belt District: The Inner Belt District is a 126-acre industrial district located in the southeastern portion of Somerville, Massachusetts. | Life Drawing Boston (culture)
    - Fenwood Road | Harvard T.H. Chan School of Public Health: The school was named after Chan Tseng-hsi in 2014 following a US$350 million donation. | Thea and James M. Stoneman Centennial Park (park)
    - Fields Corner | Fields Corner Municipal Building: Built in 1875, this building is located at 1 Arcadia Street and 195 Adams Street in the Dorchester neighborhood of Boston. | AKOKO - Coco Leaf Dorchester (coffee A)
    - Gilman Square | Somerville, Massachusetts: The city had a total population of 81,045 people as of the 2020 United States census. | Central Hill Memorial Park (park)
    - Government Center | Boston City Hall: Groundbreaking for the nine-story building took place on September 18, 1963. | Old City Hall Grounds (park)
    - Haymarket | John F. Kennedy Federal Building: Completed in 1966, this building consists of two 26-story towers and a four-story low-rise wing. | Civic Amphitheatre Steps (culture)
    - Harvard | Harvard John A. Paulson School of Engineering and Applied Sciences: The school assumed its current structure in 2007 and was renamed after John Paulson in June 2015 following his US$400 million gift. | Kyōyo Haus (dessert)
    - Heath Street | New England Baptist Hospital: New England Baptist Hospital is a 141-bed adult medical-surgical hospital in Boston specializing in orthopedic care. | Dunkin' (food A)
    - JFK/UMass | Dorchester, Boston: Dorchester was annexed to Boston in 1870 when it had a population of 12,000. | Sharon's Park (park)
    - Kendall/MIT | Abdul Latif Jameel Poverty Action Lab: As of 2020, the J-PAL network consisted of 500 researchers and 400 staff, and its programs had impacted over 400 million people globally. | Ripple Cafe (coffee)
    - Lechmere | Hult International Business School: The Arthur D. Little School of Management was founded in 1964 in Cambridge, Massachusetts. | The Common at CX (park)
    - Longwood Medical Area | Isabella Stewart Gardner Museum theft: On March 18, 1990, 13 works of art were stolen from the Isabella Stewart Gardner Museum. | Dunkin' (food A)
    - Medford/Tufts | Tufts University: Tufts University was founded in 1852 as Tufts College. | Dunkin' (food)
    - Museum of Fine Arts | Museum of Fine Arts, Boston: The museum was founded in 1870 in Copley Square and moved to its current Fenway location in 1909. | Dunkin' (food A)
    - Magoun Square | Magoun Square: Playwright John Shea is a notable resident of this neighborhood. | Zaruma Gold (coffee)
    - Mission Park | Beth Israel Deaconess Medical Center: Beth Israel Deaconess Medical Center was formed out of the 1996 merger of Beth Israel Hospital and New England Deaconess Hospital. | Brookline Avenue Playground (park)
    - North Station | Boston Garden: The arena opened on November 17, 1928, and was demolished in 1998. | Chip City Cookies West End (dessert A)
    - North Quincy | North Quincy High School: North Quincy High School serves grades 9 through 12 and has an enrollment of over 1,200 students. | Bear Hug Park (park)
    - Northeastern University | New England Conservatory of Music: Approximately 750 students pursue undergraduate and graduate studies at the New England Conservatory of Music. | Boston Shawarma (food A)
    - Park Street | Boston Christmas Tree: A tree has been lit each year since 1941. | Old City Hall Grounds (park)
    - Porter | Yume Wo Katare: Yume Wo Katare is a ramen shop located at 1923 Massachusetts Avenue in the Porter Square neighborhood of Cambridge, Massachusetts. | Phinista Café Cambridge (food)
    - Prudential | WBMX: The 104.1 MHz facility went on the air in 1958 as WBCN. | Thornton's Restaurant (food A)
    - Quincy Adams | S. H. Barnicoat Monuments: The granite workshop at 114 Columbia Street featured a derrick more than 90 feet tall. | Paul Vincent Grasso Memorial Park (park)
    - Quincy Center | Quincy College: Founded in 1958, this public community college enrolls approximately 3,500 students at campuses in Quincy and Plymouth, Massachusetts. | The QArts Gallery (culture)
    - Riverway | Boston Psychopathic Hospital: The Boston Psychopathic Hospital was established at 74 Fenwood Road in 1912. | Brookline Avenue Playground (park)
    - Savin Hill | Cristo Rey Boston High School: The school has 376 students in grades 9-12. | McKenna's Cafe (coffee A)
    - Shawmut | Dorchester High School for Girls: Dorchester High School for Girls served students in ninth through twelfth grades from 1925 to 1953. | Dr. Loesch Family Park (park)
    - Science Park/West End | Ether Dome: The Ether Dome served as the hospital's operating room from 1821 until 1867. | Dunkin' (food A)
    - South Station | Occupy Boston: Protesters settled on Dewey Square in the Financial District on September 30, 2011. | Gong Cha (coffee A)
    - Symphony | Matthews Arena: Matthews Arena was the original home of the NHL's Boston Bruins, the NBA's Boston Celtics, and the WHA's New England Whalers. | Symphony Hall (culture)
    - Union Square | Union Square (Somerville): Union Square served as a recruitment and mustering site for the Union Army during the Civil War. | Life Alive (food)
    - Wollaston | Wollaston (Quincy, Massachusetts): Wollaston Station is served by the B branch of the MBTA Red Line. | Fairy Cafe (coffee)

- 2026-11-22 00:09 ET · Builder A · Phase 3 item 1, F1 onboarding and profile (`a/onboarding`): `/welcome` (name, school, home station, age, as on the canvas), `/restore`, `/me` with the profile code, and `/` sending new visitors to onboarding. `createProfile` and `restoreProfile` Server Actions (Zod) call `insertProfile` and `profileIdByCode` in `src/server/profile.ts`. The cookie is the profile ID plus an HMAC under `SESSION_SECRET` (`src/server/session.ts`). Codes use 31 characters without 0, O, 1, I or L. The school list (12 campuses) lives in `src/server/schools.ts`, and `src/server/stations.ts` parses `data/stations.json` with B's `stationSchema`. E2e global setup now migrates the local test database, and the e2e server gets a test-only `SESSION_SECRET` when none is set. Tests: `[F1.2]` and `[F1.3]` unit, `[F2.1]` and `[F1.3]` integration, `[F1.1] [F1.2] [F1.3]` e2e on desktop-chrome, iphone and pixel. Checked at 390×844.
  - **For B:** `[F5.1] returns only possible routes on the real timetable` in your `tests/unit/lasttrain.test.ts` now has a 20 s timeout. It timed out at 5 s on CI twice (5.2 s and 5.4 s); the test itself is unchanged.
  - **Production needs:** `SESSION_SECRET` in Vercel's environment (A), and B's migrations applied to `fogline-db` so `profiles` and `revealed_cells` exist (B).

- 2026-11-21 23:57 ET · Builder A · Merged item 6b ([#27](https://github.com/Achyut21/fogline/pull/27), `957c3c4`) and, at A's request, all of B's open Phase 2 PRs as one admin squash ([#16](https://github.com/Achyut21/fogline/pull/16), `7dadf7d`, D-052): #17, #18, #19, #22, #23 and #26 were merged into their parent branches first, then `main` was merged into `b/schema-hypertables` (A's merge commits `4dc0069`, `b0a6cce`, no force-push). #21's commits rode in with #16, so it was closed with a note. Each B PR records a code-critic PASS in its description. B's decisions were renumbered: D-054 to D-056 became D-055 to D-057, and D-057 to D-060 became D-061 to D-064, in every file that cites them. #16's CI first failed on a timeout in `[F5.1] returns only possible routes on the real timetable` (5 s, slow runner); the re-run passed. This PR is the A-authored commit that deploys it all to production (D-052).
  - **For B:** apply the new migrations to `fogline-db` from your terminal, then check `timescaledb_information.hypertables` (your #16 note).
  - Logged from the gate's design-critic for later: `/design` doesn't show StatTile `outlined`, disabled Input and IconButton, or success, warning and error toasts; Countdown announces nothing at 20 and 5 min (F5.4, Phase 4); the BottomNav demo links to routes that don't exist yet; the "lines above fog" swatch hides the fog states at 390 px; "1200 ms" lacks a separator; toasts use `rounded-md`. vaul's `isIPad()` treats the Mac pane's mobile emulation as iPadOS, so check tap-to-snap on a real phone.

- 2026-11-21 23:37 ET · Builder A · A cut Phase 1 for the deadline (D-060): no more canvas pages or storyboards, microcopy goes with each feature, visual baselines move to Phase 9, and no parallel subagents. Item 6a got code-critic and design-critic fixes (safe areas, sheet focus and tap-to-snap, token motion for vaul, chip selection, copy). 6b (display components, `/design` demos, root MotionConfig) got copy-critic fixes; it skips its own design-critic run to save credits (I checked it at 390×844 in both themes), and the gate's design-critic pass covers it.

- 2026-11-21 23:16 ET · Builder A · Item 4 merged ([#24](https://github.com/Achyut21/fogline/pull/24), `7dcc9c0`). code-critic's narrow re-check passed all three blocking fixes. Its one new note goes to Phase 3 with the rest: full fog's opacity drifts between 0.72 and 0.97 inside the mask but is a flat 0.92 outside, so a seam may show at the mask edge. Item 6 split in two (D-059): 6a on `a/design-base` (restyled primitives, controls, state components, BottomNav), 6b built in parallel by a subagent in its own worktree.

- 2026-11-21 23:05 ET · Builder A · Phase 1 item 4, the 3D fog spike (`a/fog-spike`, `ad6c0bf`, `ec63c59`):
  - Built both approaches on one shader, measured them with `tests/perf/fog-fps.ts`, kept A (custom layer, fog under the T lines) and deleted B (R3F overlay, which covered the lines) with `@react-three/fiber` and `@react-three/drei`. Numbers and reasons in D-058; DESIGN section 9 updated.
  - Measuring: with vsync on, every run held exactly 30 fps, `about:blank` included. The Mac was on battery below 20%, where Chromium caps frames at 30. The recorded runs have vsync off.
  - Fixed on the way: the reveal front now travels to the farthest cell that lost fog (it was a fixed 2 km, so a ride's reveal finished in about 0.1 s); `--fog-edge` arrives from the CSS build as 8-digit hex and was read as gray; R3F's inline styles had put the overlay below the map.
  - Tests: unit `[F2.2]` mask and reveal reach, `[F2.6]` tier mapping, token color parsing; e2e `[F2.6] shows the 2D fog map with the same cell states when WebGL is unavailable` (pixel, desktop-chrome; WebKit can't turn WebGL off). typecheck, lint, unit (60) pass.
  - Checked at 390×844: day and night on tier 3 and 2, tier 1 fill, reveal edge, reduced-motion crossfade (headless).
  - Review: code-critic, design-critic and copy-critic each failed the first pass. Fixed: fog stopped at the mask rectangle; the 2D fill cleared fog pockets enclosed by uncovered cells (`[F2.6]` test added); two `as` casts; button copy ("Next stop"); no MBTA credit; casings under 2 px per side; pointer thinning didn't repaint with reduced motion; GPU resources weren't disposed on unmount. A asked to move on, so the rest of both lists is recorded for Phase 3 in D-058's consequences.
  - Open: the real frame rate needs the Android phone (Waiting on A). The 2D fill's p95 (17 ms) is higher than the shader's (3 ms). Not investigated.

- 2026-11-21 21:49 ET · Builder A · Handoff (session ends; the next one runs under another Claude account):
  - **Finished:**
    - Phase 1 item 5, tokens, type, theme switching, token check, app icon and the first `/design` slice: [#20](https://github.com/Achyut21/fogline/pull/20), squash `c6ccaad` on `main`. Branch commits: `728efc0` (the previous session's WIP), then `f43c333`, `8275e94`, `a05bc84`, `2544cf3`, `9121596`, `d18d2c6`, `e3cb31a`, `90ca503`, `ed4af5b`, `d9796a5`, `f341f07`, `d590414`, `40f1300`, `2bd16ca`. Production check passed on `fogline-mu.vercel.app` (run 44977110387).
    - code-critic, design-critic and copy-critic PASS (D-054 lists the decisions, the 21:18 entry the review rounds).
    - A approved the three item 5 plan changes (D-054).
  - **In progress:**
    - `a/design-components` (pushed) holds only PROGRESS commits: `3ab4402` (merge log) and this handoff. No code. Nothing half-done, nothing to hold back from a merge.
    - Exact next step: start item 4 (fog spike) per the Builder A plan above, branched from `a/design-components`. Read D-054's consequences before item 6: Input uses `--field` and `--field-border`, SegmentedControl bolds the selected label and becomes a radiogroup, the app shell adds safe-area padding, the `src/components/ui/` token-check exemption ends, and the stock Drawer's `z-50` moves to `z-(--layer-sheet)`.
    - Canvas: the Map states artboard is next (`map-states.dc.html` is listed in the canvas index but has no file). This session's account couldn't open the canvas. Design checks used A's HTML exports in `~/Downloads` and the artboard sources in `.canvas-work/canvas/project/`.
    - Local servers: a stale `next dev` from the earlier session still runs on :3001 with old CSS. This session started `fogline-prod` (`.claude/launch.json`, a production build on :3200). Use that, or restart the dev server, before judging UI.
    - Deferred, recorded: `/favicon.ico` returns 404, and the icon doesn't read below 32 px (Phase 9 PWA polish). Line casings must stay at least 2 px wide at every zoom (DESIGN section 10, Phase 3).
  - **Blocked:** nothing. Canvas batches from another account need A to share the canvas with edit access (under Waiting on A).
  - **For Builder B:**
    - The token check (`tests/unit/design-tokens.test.ts`, run by `pnpm test`) now scans every `.ts`, `.tsx` and `.css` file under `src/`, `src/lib` and `src/server` included. It flags:
      - hex colors and color functions;
      - `px`, `rem`, `em` and viewport units;
      - `ms` and decimal-second times;
      - Motion `transition` objects with literal durations or delays on one line;
      - `stiffness`, `damping`, `mass` or `bounce` with a number;
      - raw `z-` layers.
      `main` passes today. After rebasing #16 and #17, run `pnpm test`: a comment like "// 500ms" or a hex string in your code is a finding. The exemptions are listed in D-054.
    - Shared files changed:
      - `src/app/globals.css`: Tailwind's palette, type sizes, tracking, radii, shadows and easings are reset to tokens, so classes like `bg-red-500` or `text-2xl` at Tailwind's default size don't exist.
      - `src/app/layout.tsx`: Hanken Grotesk and the theme provider.
      - `package.json`: `test:e2e:deployment` now includes `tests/e2e/design.spec.ts`.
      - `.claude/launch.json`: new `fogline-prod` entry.
      - `CLAUDE.md` and `.claude/commands/phase-gate.md`: token-check wording.
      - Docs: `docs/COPY.md`, `docs/TESTING.md`, `docs/PHASES.md`, `docs/DESIGN.md`.
    - COPY.md: a clock time joins its AM or PM with a no-break space. Write `"12:14\u00a0AM"` in last-train and puzzle strings.
    - Decision numbers: #16 keeps D-053, and this work took D-054. #17 numbers its entries D-050 and D-051 on an old base, so they need new numbers (D-055 and up) when it rebases.
    - No new environment variables, no migrations, no new scripts. Regenerated: the icon PNGs in `public/icons/`. Design tokens: all of them are final (DESIGN section 4, D-054), and `text-3xl` is now 40 px.
  - **Tests:**
    - Passing:
      - Local: typecheck, lint and `format:check` clean. Vitest 71 passed, 1 skipped (the live `fogline-db` check). Playwright 57 passed, 12 skipped.
      - Preview check on `2bd16ca`: 46 passed, 23 skipped.
      - Production check: 58 passed, 11 skipped.
    - Failing: none.
    - Not written yet:
      - Item 4: `[F2.2]` and `[F2.6]` fog tests, and the WebGL-off e2e.
      - Item 6: component tests, including `[F8.4]` StatCounter, `[F5.4]` Countdown and `[F2.3]` LineBadge.
      - Item 7: `[F8.5]` badge copy.
      - Item 8: the visual baselines.
      - `/design` has no explicit 768×1024 run. The Playwright projects cover 390×844 and 1440×900.

- 2026-11-21 21:41 ET · Builder A · Phase 1 item 5 merged: [#20](https://github.com/Achyut21/fogline/pull/20), squash `c6ccaad`.
  - PR head `2bd16ca`: CI `check` passed (run 44976393167). The deployment check on its own preview `fogline-n4h2afh4k` passed 46 and skipped 23 (run 44976482857), `/design` spec included; the service-worker specs skip on previews (D-043).
  - Production: `vercel ls --meta githubCommitSha=c6ccaad…` showed `fogline-ely18wk3l` Ready, and `vercel inspect fogline-mu.vercel.app` showed the same deployment. The production check on `fogline-mu.vercel.app` passed 58 and skipped 11 (run 44977110387).
  - `test:e2e:deployment` now includes `tests/e2e/design.spec.ts` (it writes nothing).
  - A approved the three item 5 plan changes (D-054).
  - Next: item 6.

- 2026-11-21 21:18 ET · Builder A · Phase 1 item 5 review rounds on `a/design-tokens` (`d18d2c6`, `e3cb31a`, `90ca503`, `ed4af5b`, `d9796a5`, `f341f07`):
  - code-critic pass 1 FAIL. BLOCKING: a manual theme lost its `theme-color` after an in-app navigation, because Next swaps in fresh meta tags with the server values. The sync now reruns when `<head>` changes. A new e2e follows a link from the 404 page and waits for the tag swap; it failed without the fix on both phones. SHOULD FIX, all fixed: the scanner missed inline and Motion durations, `rem`, `em` and viewport units, raw `z-` layers and one-off springs; the F2.3 test skipped park, road and fog; an `as` in `contrast.ts`; `/design` didn't show every token (now a test checks it). Pass 2 PASS; its SHOULD FIX (fog drawn over the lines on `/design`) is fixed.
  - design-critic pass 1 FAIL. BLOCKING: the type roles didn't match the canvas. DESIGN section 4 now has canvas-derived roles and a px-to-token mapping, `text-3xl` is 40 px and three tracking tokens exist. Also fixed: the icon read as a percent sign (redrawn), new tokens `--field`, `--field-border`, `--halo` and `--fog-edge`, a map-ground strip, the bold selected segment, more tested pairs, and a no-break space before AM. Pass 2 PASS (18/20); its two SHOULD FIX items are fixed.
  - copy-critic pass 1 FAIL (strings in JSX, an inaccurate intro, a passive note); pass 2 FAIL on a six-word heading. Both fixed, pass 3 PASS.
  - F2.3 now reads WCAG 1.4.11 through the casing: a line needs 3:1 against the ground or against its casing (D-054). code-critic and design-critic agreed. DESIGN section 10 asks for casings of at least 2 px at every zoom.
  - Tests: Vitest 71 passed, 1 skipped (live `fogline-db`). Playwright 57 passed, 12 skipped. typecheck, lint and `format:check` clean. Checked on a production build at 320, 360 and 390 px in day and night: no overflow.
  - Deferred: `/favicon.ico` 404 and the icon below 32 px (Phase 9 PWA polish); safe-area padding and radiogroup semantics (item 6).
  - Next: PR, Vercel preview check at 390×844.

- 2026-11-21 20:52 ET · Builder A · Phase 1 item 5, tokens, fonts and icon, on `a/design-tokens` (`f43c333`, `8275e94`, `a05bc84`, `2544cf3` on top of the WIP `728efc0`):
  - Found at 390×844: the theme toggle hydrated with a mismatched `aria-pressed`, so after a reload no option looked selected. It now marks the stored theme after hydration.
  - Checked against the canvas exports: chips are pills (new 8 px `--radius-small` instead of the 6 px chip radius), night elevations get a hairline ring, and day warning and success are darker than the canvas for AA (D-054).
  - `/design` lists every token: easings, springs, stagger and layers added. Contrast chips no longer break across lines. New icon and wordmark section.
  - impeccable `typeset`: detector scan clean; Hanken Grotesk confirmed as the one family. Its figures are tabular by default.
  - App icon drawn (seven H3 cells, three cleared along a teal line), PNGs regenerated with `pnpm icons`.
  - Tests: `tests/e2e/design.spec.ts`: axe in both OS themes, a manual theme kept across a reload with `theme-color` rewritten, no horizontal scroll, tabular figures. Mutants: a broken `theme-color` sync and the old toggle each failed the theme test; the sample in `system-ui` without `tabular-nums` failed the tabular test by 26 px. Full run: typecheck, lint and `format:check` clean; Vitest 67 passed, 1 skipped (live `fogline-db`); Playwright 54 passed, 12 skipped; build compiled.
  - Seen at 390×844 in day and night, each with and without reduced motion: no overflow, no console errors.
  - Docs: DESIGN section 4 final, section 11 icon and wordmark, D-054 (D-053 is taken by B's open #16), PHASES, CLAUDE.md and `/phase-gate` token check wording.
  - Moved within the plan: the custom line and station glyphs land with LineBadge and StationDot in item 6. The test file is `design-tokens.test.ts`, not `tokens.test.ts`.
  - Next: critics (see the 21:18 entry).

- 2026-11-21 20:32 ET · Builder A · Merged #15 (`e7c28c5`), which brought production up to date after B's #12 to #14; the production check (run 44971213723) passed on `fogline-mu.vercel.app`. Started item 5 on `a/design-tokens` (WIP, see the handoff under Builder A). Canvas Map page: 4 of 5 artboards. Session handed off at its usage limit.

- 2026-11-21 23:30 ET · Builder B · Phase 2 item 8, puzzle, on `b/puzzle-data` (stacked on `b/badges-stats`), in progress:
  - `src/lib/puzzle.ts`: the puzzle for a New York date, guess checks, feedback with repeated letters, game state and reveals, the share grid, streaks (F7.1, F7.2, F7.5, F7.6, F7.7). `calendarDateOf` and `addDays` in `src/lib/time.ts`.
  - `pnpm data:words`: 15,921 five-letter guesses from dwyl/english-words (The Unlicense), pinned (D-064).
  - `pnpm data:events`: publishes only checked, all-ages events near a station, one per date (D-064).
  - Tests: 16 unit tests, including the midnight reset under a UTC server clock and on both DST days, repeated letters, streaks, and every reason `data:events` refuses.
  - `data/events.json`: 14 events, one a day from Nov 22 to Dec 5. They include city tree lightings, a holiday market, Bruins, Celtics, Messiah, the Holiday Pops, a Harvard Book Store talk and the Huntington's new opera. Every answer is distinct.
  - Event check: Claude's research found 2 to 4 candidates a day and confirmed each 2026 date on the organizer's page. B accepted that list to save time, without opening each link, and the entries are marked checked on that basis. 13 of the 14 pages print the 2026 date. The Holiday Pops page (Dec 4) shows the date without a year; its address says 2026. Few pages state an age policy; none of these events is 21+. Thanksgiving's puzzle points to Messiah on Nov 27.
  - code-critic: PASS. Its notes are fixed: summer-time midnight tests, gaps and repeated answers refused, stricter dates, guesses past six ignored.
- 2026-11-21 22:20 ET · Builder B · Phase 2 item 10, check-ins, badges and stats, on `b/badges-stats` (stacked on `b/neighborhoods`):
  - `src/lib/checkin.ts`: check-in validity with the reason and number for a refusal (F6.2, DATA 3.9).
  - `src/lib/rides.ts`: rides, lines and visited stations from ride events, and `live()` to leave replays out of totals and badges.
  - `src/lib/badges.ts`: the 8 night badges and 4 explorer badges, including when a region reached 50% for First Light (F8.1, F8.2).
  - `src/lib/stats.ts`: miles on the T, stops, lines, miles walked, nights out, last trains caught (F8.3). `src/lib/squad.ts`: squad mates (F12.1).
  - Rules the docs left open are in D-063:
    - comparing badges need 2 people in their own comparison, and how ties share
    - the ride home starts after the last check-in and the last stop's time
    - a late last train counts within 10 minutes
    - replays, and Green branches off the trunk
    - walks between crawl stops counted once
    - First Light awards are never taken back
  - Tests: 40 unit tests.
    - `[F6.2]`: 150 m, 100 m accuracy, the time window and the order of refusal reasons.
    - `[F8.1]`: each badge, the 30 s ties, the 2-person minimum, Night Owl under a UTC server clock and on the DST day, the late last train, crawl rides.
    - `[F8.6]`: no duplicate awards.
    - `[F8.2]`: each explorer badge, the 50% moment and the 3-cell minimum.
    - `[F8.3]`: rides, miles, stops, lines, walking, nights out, last trains.
    - `[F12.1]`: squads.
  - Full suite 199 passed; `src/lib` line coverage 99.8%.
  - code-critic: the first pass failed. The docs said replays never count, though First Light and percent uncovered follow fog that replays clear; the ride home could be a crawl ride; a late last train didn't count; and the Night Owl test passed with a server-time bug. All fixed, with tests (D-063).
  - code-critic, second pass: failed. F3.5 needs a replay's own ride summary to count, the 10-minute grace accepted a different trip, and Closest Call ran before the rides home. Now:
    - a ride summary counts replays; totals and badges use live events;
    - the grace needs the last train's trip;
    - Closest Call waits for every last train plus 10 minutes;
    - Every Green Branch counts alights;
    - more tests for the ride home, ride boundaries and summer Night Owl.
  - code-critic, third pass: PASS. Its notes are done too: home-station cells don't count for First Light, F8.1 names the cron rerun for Closest Call, and stale replay notes are fixed.
  - Next: item 8 (events, words and puzzle).
- 2026-11-21 21:34 ET · Builder B · Phase 2 item 7, neighborhoods, on `b/neighborhoods` (stacked on `b/places-grades`):
  - `pnpm data:neighborhoods` writes `data/neighborhoods-h3.json`: Boston's 26 BPDA neighborhoods (Analyze Boston) plus Cambridge, Somerville and Brookline (TIGERweb), 29 regions and 1,593 resolution-9 cells, 1,158 in Boston. Each cell is in one region. Cells outside all of them are "Beyond", with no percentage (D-062).
  - `src/lib/geo/regions.ts`: region lookup, each region's uncovered share, and Boston's share as the union of its neighborhoods (F2.4).
  - A second run produced a byte-identical file.
  - Tests: 8 unit tests.
    - `[F2.4]` polygon fill, holes and multipolygons, the first region keeping a shared cell.
    - Region shares, Boston's union, Beyond.
    - The committed file: 26 neighborhoods and 3 cities, each cell once, unique IDs, and six known stations in the right region (Harvard, Davis, Coolidge Corner, Kenmore, Park Street, and Quincy Center in Beyond).
  - code-critic: the share tests used one share for every region, so wrong formulas still passed. They now use different shares. The script now validates the file before writing it, and First Light leaves out the two regions smaller than a cell (D-062).
  - Next: item 10 (check-ins, badges and stats), then item 8 (events, words and puzzle).
- 2026-11-21 21:31 ET · Builder B · Phase 2 item 6, places and grades, on `b/places-grades` (stacked on `b/fair-solver`):
  - `pnpm data:places` writes `data/places.json`: 2,327 named spots within 600 m walking of a station, from 5,154 OSM elements (data of 2026-11-22T02:19Z).
    - By category: food 1,341, coffee 320, park 290, bar 162, culture 154, dessert 43, club 17.
    - Every nearby station is kept with its walking distance.
  - `pnpm data:grades` adds inspection grades from Analyze Boston. `src/lib/grades.ts` holds points, cutoffs, name and street normalization, Jaro-Winkler and matching (D-061).
  - **Grade distribution (PHASES gate, also in D-061):**
    - Citywide, 4,092 active establishments: A 2,991 (73.1%), B 705 (17.2%), C 396 (9.7%).
    - Matched to spots: 809 of 1,883 inspectable spots, A 516, B 167, C 126.
    - The plain latest inspection would have given 98.8% A, because re-inspections mark violations corrected; the grade uses the latest routine inspection instead.
  - Match quality: I read the weakest matches by hand and tightened the rule until the false ones were gone. Pairs that share an address, a generic word or a first word no longer match ("Peet's Coffee" ↔ "Capital One Cafe", "Caffé Pompei" ↔ "Caffe Vittoria", "Monica's Mercato" ↔ "Monica's Trattoria", "Starbucks" ↔ "Star Market"). Real ones still do ("Starbucks" ↔ "BREADWINNERS/STARBUCK'S", "Warren Towers Dining Hall" ↔ "B.U. Warren Tower Cafe", "Outtakes at Stetson West" ↔ "N.U. Stetson Hall West").
  - code-critic: the first pass failed.
    - Closures weren't counted as inspections, so 45 establishments were graded from the pass right after a closure (DaCoopas A instead of B).
    - The inspection SQL had no test.
    - Whole-name similarity left false matches.
    - Bars that OSM tags as restaurants were all-ages.
    - All fixed with tests: an integration test runs the inspection SQL on Postgres, and the reruns and calibration above are from the fixed code (D-061).
  - code-critic, second pass: failed on OSM `min_age=21` being ignored (Lolita was all-ages). Also fixed: more bar words, short words must match exactly ("Mario's" no longer matches "Maria's"), the city's counter numbers dropped, and blank comments not counted as a second citation. Rebuilt twice with identical output.
  - Reproducible: rerunning either pipeline from the cache gave byte-identical `places.json`.
  - Environment note: the Claude Code sandbox blocks `overpass-api.de` and two mirrors. The one reachable mirror answered 504 when busy, so `data:places` ran once with the sandbox off. `.cache/` is ignored by git (shared file `.gitignore`).
  - Tests: 33 unit tests (32 for the pipelines, 1 for the committed data) and 1 integration test.
    - Grade points per level and cutoffs, violations worst first, inspection rows (failed only, one per citation).
    - The routine-inspection SQL on Postgres: a pass after a failure or a closure, inspections far apart, a chain, rows that aren't inspections, inactive licenses and the New York date.
    - Locations and addresses, the city's street spellings, normalization, Jaro-Winkler against published values, the real match and non-match cases above, the 50 m edge, ties and far addresses.
    - OSM kinds, the 600 m edge, 21+ kinds and bar names, duplicates keeping 21+, "$" kinds, centers and addresses, tiles and the merge.
    - The committed `places.json` checked against its schema.
  - Next: code-critic, then item 7 (neighborhoods).
- 2026-11-21 20:55 ET · Builder B · Phase 2 item 5, fair solver and miles, on `b/fair-solver` (stacked on `b/last-train`):
  - `src/lib/solver/fair.ts`: `rankStations`, `spotsNear` and `fairOptions` (D-057).
    - `rankStations`: S(d), with the sum and then the station as tie-breaks, and the 75-minute cut. Unknown stations throw.
    - `spotsNear`: grades, and no bars, clubs or 21+ spots for under-21 groups.
    - `fairOptions`: 3 stations that have matching spots. When nothing fits it names a blocker, a pair of blockers, or no trains.
  - `src/lib/gtfs/service.ts`: `trainsRunning` checks that every participant's station has a train to board in the hour before the plan, on its service date or its day type's representative date (D-048).
  - `src/lib/solver/travel.ts` searches once per origin (`travelTimesFrom`). `src/lib/geo/miles.ts` gives ride miles along canonical shapes. `src/lib/places/types.ts` holds the place schema for item 6.
  - Real data: the demo plan (BU, Harvard, Tufts, Friday 7 PM) ranks Government Center first (26, 19 and 25 min), then Aquarium, Bowdoin and Park Street (23, 11 and 28 min). Miles: Harvard → Park Street 3.3, Medford/Tufts → Park Street 5.1, JFK/UMass → Braintree 8.7.
  - Tests: 18 unit tests on hand-built networks whose scores were worked out by hand.
    - `[F4.2]` per-friend times, the plan's day type, hour bucket and after-midnight service date.
    - `[F4.3]` ranking, both tie-breaks, exactly 75 minutes, a lone participant, unknown stations.
    - `[F4.4]` 3 options, and skipping a well-ranked station with no spot. `[F4.5]` 600 m exactly, nearest first, budget.
    - `[F11.5]` grades on graded and unmatched spots. `[F1.5]` `[F4.9]` the under-21 rule, mislabeled bars included.
    - `[F4.6]` each blocker, the relax order, filters that only work together (named only when set and needed), no trains (3:30, 4:30 AM, 7 PM, Thanksgiving, a date past the feed), and the age rule never relaxed. `[F3.4]` miles.
  - code-critic: first pass FAIL. Three BLOCKING items fixed:
    - No check that trains run at the plan's start: a 3:30 AM Saturday plan got options.
    - An unknown station was reported as "time".
    - The under-21 rule relied only on `ageRule`.
    All three SHOULD FIX items fixed too: filters relaxed together, grades on every graded spot, and tests that could pass while broken. Nits fixed: exact boundaries, spot tie order, the lib tree in ARCHITECTURE.
  - Log times on B's Phase 2 entries corrected to the real commit times; earlier stamps ran ahead of the clock.
  - Second pass: FAIL on one BLOCKING item, fixed. The train check looked at the hour after the start, so a 4:30 AM plan still got options; it now looks at the hour before. Its SHOULD FIX items are fixed too:
    - A date past the feed is checked against its representative date instead of skipped.
    - Tests now cover trains only earlier in the evening, and a covered date (Thanksgiving) whose services don't run.
    Nits fixed: station and spot ID tie-break tests, naming only filters that were set and needed, and one bar-and-club list.
  - Third pass: PASS. Real data: Tuesday 3:30 and 4:30 AM give no trains; 4:50 AM gives options (first train 4:45). Its two SHOULD FIX items are fixed:
    - Any train in the system counted. Now every friend's own station needs one, so a 2:30 AM Harvard and Tufts plan gives no trains.
    - The named filters could fail together. Greedy pruning now always leaves a set that works.
    Nits fixed: a departure exactly at the start doesn't count, the uncovered-date error is tested, and the weekend after-3-AM limit is noted in DATA 3.2.
  - Next: item 6 (places and grades).

- 2026-11-21 20:42 ET · Builder B · Phase 2 item 4, last train, on `b/last-train`:
  - `src/lib/lasttrain/search.ts`: backward round-based search with two times per station (board, arrive by train), at most two transfers, walks into home and between stations, and no-pickup or no-drop-off stops skipped.
  - `src/lib/lasttrain/leave-by.ts`: the F5.2 buffer, the F5.3 warning, the F5.5 last stop, the F5.7 walk home. Results also give `firstTrain`. D-056.
  - `timetable.json` now carries transfer times and walks, regenerated from the same feed.
  - **Known last trains (PHASES gate).** `pnpm check:last-trains 2026-11-23` against the MBTA V3 schedules API, matching by headsign:

    | Last train | Service date | MBTA schedule | Search |
    |---|---|---|---|
    | Green Line E, Park Street → Medford/Tufts | Mon 2026-11-23 | 1:20 AM | 1:20 AM |
    | Red Line, Harvard → Ashmont | Mon 2026-11-23 | 12:37 AM | 12:37 AM |
    | Orange Line, Downtown Crossing → Forest Hills | Mon 2026-11-23 | 12:45 AM | 12:45 AM |

    - All three match to the second. On Saturday 2026-11-28 they match too (2:14 AM, 1:36 AM, 1:45 AM).
    - On Friday 2026-11-20, E and Orange match (2:18 AM, 1:41 AM). A Red Line diversion turns trains at Broadway with shuttle buses beyond, so the search finds no train to Ashmont while the MBTA lists a 1:30 AM trip to Broadway (D-056, Open questions, deferred).
  - Tests: 22 unit tests: 21 on hand-built timetables, and 1 checking that every route returned for sampled real station pairs is possible and never rides past home.
    - `[F5.1]`: past 24:00:00, transfer time, at most two transfers, a walk without the transfer time, a route checked through the right rounds, a walk on when a transfer is too tight, walking home, a walk at the start, no-board and no-alight stops, a tie, holiday service, the 3 AM rule.
    - `[F5.2]` (including the night the clocks fall back), `[F5.3]`, `[F5.5]`, `[F5.7]`. No train needed, no timetable, unknown stations, the margin.
  - code-critic: first pass FAIL. Two BLOCKING items fixed:
    - The trace could return a connection the search never checked (Kenmore → Assembly listed a 2-minute change at Park Street).
    - Walks into home were skipped (Boylston → Downtown Crossing on Friday said 1:21 AM; it's 2:16 AM).
    The two-time rewrite also fixes the SHOULD FIX about mixing board and walk times. Also fixed: the walk test can now fail, a DST and a tie case, and a broken trace throws. The live check matches by headsign and defaults to the next Monday inside the feed.
  - Second pass: FAIL on one new BLOCKING item, fixed: the rewrite let a station a walk from home win over home as the stop to get off. South Station → Downtown Crossing rode on to Park Street and walked back. Home now always wins, and the route check fails any ride that passes home.
  - Third pass: PASS. Against an independent two-time search over all 15,500 station pairs on six dates, it found no later or earlier departure and no impossible route. Its nits are fixed: the route check also confirms each ride's stations and times on its trip.
  - Next: item 5's fixes.

- 2026-11-21 20:17 ET · Builder B · Phase 2 item 3, GTFS pipeline and travel time, on `b/gtfs`:
  - `pnpm data:gtfs` (tsx) downloads the MBTA feed ("Fall 2026, 2026-11-19T01:01:13+00:00, version D", valid 2026-11-12 to 2026-12-12) and writes `data/stations.json` (125 stations), `graph.json` (3,446 weekday station pairs), `timetable.json` (19,807 trips, 42 station patterns) and `shapes.json` (18 canonical patterns). Representative dates: Mon 2026-11-16, Sat 2026-11-28, Sun 2026-11-29. A second run produced byte-identical files (sha256).
  - `src/lib/solver/travel.ts`: shortest path over direct rides, with lines, waits and transfer stations. `src/lib/gtfs/types.ts` holds Zod schemas for the four files (D-055).
  - **Known trips (PHASES gate).** `pnpm check:trips` compares the model with a replay of the raw timetable: a rider arriving at each minute of the hour catches the actual next trains along the usual path, with `transfers.txt` times. Minutes:

    | Trip | When | Model | Timetable replay | Difference |
    |---|---|---|---|---|
    | Harvard → Park Street (Red) | Mon 6 PM | 11.3 | 11.0 | +0.3 |
    | Kenmore → Government Center (Green B/C/D) | Mon 6 PM | 19.0 | 18.3 | +0.7 |
    | Medford/Tufts → Park Street (Green E) | Mon 6 PM | 28.0 | 27.4 | +0.6 |
    | Harvard → Kenmore (Red, then Green at Park Street) | Mon 7 PM | 30.4 | 28.4 | +2.0 |
    | Wonderland → Downtown Crossing (Blue, then Orange at State) | Sat 8 PM | 27.2 | 28.4 | −1.2 |
    | Sullivan Square → Lechmere (Orange, then Green at North Station) | Mon 6 PM | 16.8 | 16.0 | +0.8 |
    | Savin Hill → North Quincy (Ashmont branch, then Braintree at JFK/UMass) | Mon 6 PM | 19.4 | 16.6 | +2.8 |

    All seven are within 3 minutes. JFK/UMass is the closest because the model assumes a random wait after a transfer, while the schedule times the Ashmont-to-Braintree connection: 6.0 min modeled for the walk and wait at JFK against 3.5 in the replay. Harvard → Kenmore is high for the same reason (D-055).
  - Data notes: Symphony is marked "no drop-off" on all but one trip in this feed, so it's never a destination or a home with a last train. 1,221 Green Line E trips carry that `noAlight`. Items 4 and 5 should say so rather than fail.
  - Tests: 28 unit tests on a synthetic GTFS slice (`tests/fixtures/gtfs/`) and a hand-built graph.
    - Feed: the subway filter, quoted fields, missing columns, Thanksgiving's `calendar_dates` swap, a diversion on the first Monday and Saturday, canonical trips on a service that never runs.
    - Graph: child stops, the shared Green trunk, stops with no boarding or no alighting, trips past 24:00:00, subway-only transfers with a bus bay ignored, median walks, waits.
    - Travel search: transfer stations for ride, walk, ride; a walk at the start; no service; unreachable; late night; invalid buckets.
    - Timetable, shape distances, identical second runs, and the committed data files against their schemas. `src/lib` line coverage 99.4%.
  - code-critic: first pass FAIL. BLOCKING fixed: transfer times counted commuter-rail and bus transfers (North Station 255 s against 117 s subway-only). SHOULD FIX items:
    - Walks now use the median, not the shortest platform pair.
    - Transfer stations count train changes only.
    - Hour buckets are validated.
    - The representative-date test can now fail.
    - The fixture matches the real feed's canonical trips and boarding rules.
    - The known-trip check is committed, with North Station and JFK trips.
    - Combining platforms is kept and documented with the JFK figure.
    Nits fixed too: one `bucketIndex`, the dead tie-break, `tripStops` built once, and typed loading through Zod.
  - Second pass: PASS. Its SHOULD FIX corrected the reason given for the JFK trip, above and in D-055. Nits fixed:
    - Walks only count platform pairs on different lines.
    - The data-file test checks every index range.
    - One default transfer constant, a `meters` schema, and a warning log.
    For items 4 and 5: parse the data files once per process, which costs about 50 ms for `graph.json` and 35 ms for `timetable.json`.
  - Next: item 4 (last train).
- 2026-11-21 20:12 ET · Builder B · Phase 2 item 2b, hypertables, on `b/schema-hypertables` (migrations `0002_hypertable_columns` and `0003_hypertables`, its own PR, stacked on 2a):
  - `vehicle_positions`, `checkins`, `ride_events` and `noise_readings` as hypertables with foreign keys, columnstore and retention policies, and three continuous aggregates with refresh policies (D-053).
  - Tests: 11 integration tests.
    - The four hypertables are listed (the gate's check).
    - Each compression and retention interval, segmentby and orderby. Each aggregate's refresh window.
    - `[F16.2]` check-ins per New York day without demo rows, including the night the clocks fell back.
    - A manual refresh materializes the days. Distinct vehicles per 5 minutes, and duplicate samples rejected.
    - `[F13.2]` noise per segment and hour without demo readings. `[F3.8]` the four event kinds.
    - Rows for a missing profile are refused. A profile delete cascades through compressed chunks of all three tables. A plan delete drops its check-ins and keeps ride events.
  - code-critic: PASS with 6 SHOULD FIX, all fixed before 0002 and 0003 were applied anywhere:
    - refresh windows of days, since a 1-hour window would lose data after a stall;
    - unsegmented `checkins` (0.97 compression ratio before);
    - foreign keys on the hypertables;
    - noise and event tests that can fail;
    - a refresh test;
    - the replay retention consequence.
    Its nits are fixed too: `is_demo` on noise readings, a unique `(vehicle_id, ts)`, date-bounded reads, a segmentby check, a fall-back test, and delete-versus-aggregate notes.
  - Second pass: PASS. Its nits are fixed: a check-in at 00:30 EDT on the fall-back day, the recorder's `ts` rule, the trigger count note, a plan delete through compressed chunks, the migration comment and the delete list in ARCHITECTURE.
  - Next: B applies `0002` and `0003` to `fogline-db` after the PR merges, then checks `timescaledb_information.hypertables`.
- 2026-11-21 20:18 ET · Builder A · Merged B's #12, #13 and #14 (D-052); canvas round 2 started:
  - #12 (Phase 2 plan) and #13 (time, geo, H3 helpers) merged after A's merge commits cleared PROGRESS and DECISIONS conflicts; A's head commit let Vercel build their previews. #14 (core tables) admin-merged after its CI passed.
  - None of the three B-authored squash commits deployed to production ("Deployment failed"). `--author-email` didn't change the author. This PR is the A-authored commit that brings production up to date (D-052).
  - Canvas round 2, Onboarding page: welcome, school, home station, age, first fog reveal, restore (wrong-code error in night). One local render pass; the day burn-off ring was invisible and is now accent-tinted.
  - Next: canvas Map and Ride pages.
- 2026-11-21 19:43 ET · Builder B · Phase 2 item 2a, core tables, on `b/schema-tables` (migration `0001_core_tables`, its own PR):
  - Nine regular tables from ARCHITECTURE section 6: profiles, plans, plan_participants, plan_stops, revealed_cells, badges_awarded, daily_puzzles, puzzle_results, ai_cache. Rules in D-049.
  - Tests: 7 integration tests on a scratch TimescaleDB. `[F8.6]` explorer and night badges once each. Every allowed value accepted and one outside value rejected per check. Plan end and puzzle-solved pairs stay in step. Seat rules. A profile delete keeps shared plans with an empty seat.
  - code-critic: first pass FAIL. BLOCKING fixed: drizzle-kit's meta files failed Prettier on Linux (`drizzle/meta/` now ignored). All 6 SHOULD FIX items fixed and 0001 regenerated, since it's applied nowhere yet: the station left on a deleted member's seat, `ended_at` versus `status`, one value list per column, the seat test, the foreign-key indexes and D-049. Second pass: PASS. Its nits are fixed too: every allowed value is written once in the test, so a list passed to the wrong column fails, and the puzzle check is tested both ways.
  - Shared file changed: `.prettierignore`.
  - Next: B applies `0001_core_tables` to `fogline-db` after the PR merges. Then item 2b, the hypertables migration.
- 2026-11-21 20:05 ET · Builder A · Phase 1 item 1, Direction, on `a/design-direction`:
  - impeccable `shape` round with A: tool first, play in moments; "never cute" is the one hard no.
  - `docs/PRODUCT.md` added: impeccable's concept roll refuses to run without it (plan change, A approved).
  - The roll (seed `eeb14234`) assigned a harbor-chart world and dealt six challengers. One was competitive (a departure board); five were declined.
  - Canvas round 1 published: three moods × (map home, ride stop card, recap) × (day, night), on real map renders. One local render pass found one defect (recap stats wrapping under Share), fixed and re-checked.
  - A picked C, the familiar option. Craft bar: Apple Maps, Transit, Strava. DESIGN "Direction" written, DESIGN section 3 theme default changed, D-050 and D-051 added.
  - Docs only, no tests. B's human still confirms the direction.
- 2026-11-21 19:28 ET · Builder B · Phase 2 item 1, time, geo and H3 helpers, on `b/time-geo`:
  - `src/lib/time.ts`: GTFS times past 24:00:00, the service-day origin (noon minus 12 h), the service date of a moment (3 AM cutoff, D-047), day type and hour buckets (D-048). Uses `@date-fns/tz` 1.5.
  - `src/lib/geo/distance.ts` (haversine, walking ×1.25 at 80 m/min) and `src/lib/geo/cells.ts` (H3 res 9 reveals, visited over seen, uncovered share). Uses `h3-js` 4.5.
  - Tests: 26 unit tests, including both 2026 DST nights, the second 1:30 AM on 2026-11-01 (26:30:00) and dates that don't exist. `src/lib` line coverage 98.8%. No UI, so no 390×844 check.
  - code-critic: PASS. All 4 SHOULD FIX and 4 NITs fixed: tests on the fall-back night, an east-west distance test, D-048 and DATA 3.1 for buckets and holidays, rounding down, and date validation.
  - Next: item 2, schema and migrations.
- 2026-11-21 19:15 ET · Builder A · Phase 1 started. A approved the plan under Builder A, including the seven flags (no-WebGL fallback, OS theme default, base component scope, token check as a Vitest test, fog frame-rate caveat, self-hosted detect-gpu benchmarks, `/design` on production). Each flag gets its DECISIONS entry when its item lands. Docs only, no tests. Next: item 1, Direction.

- 2026-11-21 18:30 ET · Builder A · Phase 0 gate passed. Handoff:
  - **Finished:**
    - Phase 0 PRs on `main`: [#1](https://github.com/Achyut21/fogline/pull/1) `f3351ea`, [#2](https://github.com/Achyut21/fogline/pull/2) `fe8c9ea`, [#3](https://github.com/Achyut21/fogline/pull/3) `d2363ce`, [#4](https://github.com/Achyut21/fogline/pull/4) `f9cba34`, [#5](https://github.com/Achyut21/fogline/pull/5) `17a1f05`, [#6](https://github.com/Achyut21/fogline/pull/6) `859b85d`, [#7](https://github.com/Achyut21/fogline/pull/7) `71825a8`, [#8](https://github.com/Achyut21/fogline/pull/8) `07f3191`, [#9](https://github.com/Achyut21/fogline/pull/9) `4b7aa05` (the gate fixes).
    - Gate second pass: every row PASS (table above).
    - Found at the gate: the production check failed 14 tests on the production deployment's generated URL, because that URL is protected too. On `fogline-mu.vercel.app` it passed 40 and skipped 11. Production checks now target the production domain (D-044; TEAM, TESTING, ARCHITECTURE, PHASES and the workflow's input description updated).
  - **In progress:** none. `a/phase0-handoff` holds this docs change, the workflow input description, and a comment and assertion-message change in `tests/e2e/pwa.spec.ts`.
  - **Blocked:** none.
  - **For Builder B:**
    - Shared files from Phase 0: `package.json` scripts, `vitest.config.ts`, `playwright.config.ts`, `.github/workflows/ci.yml` and `deployment.yml`, `src/server/db/`, `drizzle/`, `drizzle.config.ts`, `.claude/settings.json` (hooks and deny rules).
    - Environment variable names: `DATABASE_URL_TEST`, `LIVE_DATABASE_URL`, `MIGRATE_DATABASE_URL` (command line only, never `.env`), `NEXT_PUBLIC_FLAGS`. `VERCEL_AUTOMATION_BYPASS_SECRET` is a GitHub Actions secret only.
    - Migrations: only `drizzle/0000_timescaledb.sql` (`create extension if not exists timescaledb`, no tables). I haven't confirmed whether it has been applied to `fogline-db`. It's safe to apply.
    - Scripts: `db:generate`, `db:migrate`, `icons`, `format:check`, `test:e2e:deployment`. The `data:*` scripts exit 1 until Phase 2.
    - Hooks load on your next session: Prettier on each edited file, and a Stop reminder when code changed without PROGRESS.md. Turn hooks off before reviewing a fork branch (D-042).
    - Design tokens: none yet. Phase 1 adds them.
  - **Tests:** all pass (gate table). WebKit skips the service-worker and installability specs, because Playwright WebKit has no service workers and no Chrome DevTools Protocol. Nothing is left unwritten for Phase 0.
  - **Next:** Phase 1 Design in a fresh session: `/phase-start 1`.

- 2026-11-21 18:01 ET · Builder A · Phase 0 gate, first pass, plus fixes on `a/phase0-gate-fixes` (D-043):
  - Standing checks passed on the final `main` content: typecheck, lint, format, 24 Vitest, 32 e2e, build, and 0 token-grep matches. The fresh clone ran the gate's exact sequence.
  - copy-critic: PASS. It noted Serwist caches visited pages, so the offline copy and D-040 were corrected.
  - code-critic: FAIL. Blocking: the service worker never activates on protected previews (manual run 44958512304); Vercel's dispatch event has never fired, though the docs said it runs every time. Plus 8 SHOULD FIX items.
  - test-auditor: FAIL. The installability and `/api` cache tests couldn't fail.
  - Fixes:
    - full Chromium for installability, with a negative control;
    - the e2e server on the test database, with a mutant `sw.ts` now caught;
    - service workers blocked by default;
    - service-worker specs skipped on protected previews;
    - a manual trigger with a URL allowlist;
    - `db:migrate` needs an explicit target;
    - an offline-visited-page test;
    - the reload test proves the `online` event fired;
    - the 180 px icon checked;
    - browser time zone asserted;
    - the MSW guard uses `.invalid`;
    - the migration count read from the journal;
    - docs (ARCHITECTURE, TESTING, PWA, TEAM, DECISIONS, PROGRESS).
  - #7 (manual deployment trigger) and #8 (hooks) merged.
- 2026-11-21 17:39 ET · Builder A · Phase 0 hooks (PHASES item 9) built on `a/claude-hooks`:
  - Prettier formats each edited file.
  - A once-per-stop reminder fires when code changed without a PROGRESS.md change.
  - The deny rules are kept (D-042).
  - Verified:
    - Formatter: given a badly formatted file it rewrote it, and it left `docs/` untouched. In this session, an Edit to a probe file came back formatted.
    - Reminder, in a throwaway worktree of `main`: it blocks when code changed without PROGRESS, stays quiet when PROGRESS changed too, stays quiet on a clean tree, and stays quiet when `stop_hook_active` is set. Five clean runs each after removing `process.exit`.
    - `/phase-start` and the four critics load (used this session).
  - code-critic: PASS. The SHOULD FIX item is fixed: Prettier failures no longer throw. Nits fixed: real-path check, non-ASCII paths, accurate wording, fork-review warning, and hook scripts now linted. Edge cases re-tested.
  - PR #6 merged. PR #7 opened: a manual trigger for the deployment check, because Vercel's `repository_dispatch` event didn't arrive for the first production deployment.
- 2026-11-21 17:36 ET · Builder A · Phase 0 GitHub and Vercel (PHASES items 7, 8) built on `a/ci-vercel`:
  - Deployment workflow on Vercel's `repository_dispatch` event, with a bypass cookie from a global setup instead of a per-request secret header. No uploaded report, fork commits skipped, 20-minute timeout, and a cancelled run reports an error instead of leaving "pending".
  - Read-only specs only (`test:e2e:deployment`).
  - Branch protection on `main` turned on (A approved).
  - PR #5 (PWA) merged.
  - Tests: local e2e 32 pass. In remote mode against production, smoke and `/api/health` pass (8), and `/api/health` returns `{"db":true,"timescaledb":true}` from the deployed function.
  - Not yet run: the bypass-cookie path against a protected preview. It runs for the first time on the PR after this merges.
  - code-critic: first pass FAIL. Two BLOCKING items fixed: the secret could leak through the report artifact, and the docs claimed protection that wasn't on yet. SHOULD FIX items fixed: forks, cross-origin header, stuck pending status, full suite on production, docs. Nits: URL scheme check, empty base URL, health check run once.
- 2026-11-21 17:20 ET · Builder A · Phase 0 PWA item (PHASES item 6) built on `a/pwa`:
  - `app/manifest.ts`, the viewport (`viewport-fit=cover`, light and dark `theme-color`) and iOS metadata.
  - Placeholder icons (192, 512 for any and maskable, apple-touch 180).
  - A Serwist service worker that precaches static chunks, the preloaded fonts, the icons and `/offline`, falls back to `/offline` for documents, keeps `/api/*` network-only, and never reloads a page on its own.
  - Offline, error, global-error (Next 16 `retry`) and 404 pages, with copy in `src/copy/system.ts`. The offline page's "Try again" reloads the same address.
  - Tests: 22 Vitest and 32 e2e pass. 7 service-worker tests are skipped on WebKit because Playwright WebKit has no service worker support. Chromium covers:
    - manifest fields and icons at their stated sizes;
    - iOS tags;
    - axe on `/offline` and the 404 page;
    - 44 px actions;
    - worker control;
    - offline fallback plus a retry of the same address;
    - no reload on reconnect (the test fails when the reload is turned back on);
    - `/api` never served from cache;
    - fonts and icons precached;
    - no installability errors.
  - Found and fixed: duplicate `serwist` copies silently dropped the offline fallback (D-040).
  - code-critic: first pass FAIL. BLOCKING fixed: the reload on reconnect. All SHOULD FIX items fixed: navigation caching, `/api` caching, revision, fonts, copy, and axe on the 404 page.
  - copy-critic: first pass FAIL on the offline and error wording. Rewritten, then re-reviewed.
  - Seen at 390×844: `/offline` and the 404 page. Dark mode is unchanged until Phase 1.
  - PR #4 (database) merged at 17:18 ET.
- 2026-11-21 16:08 ET · Builder A · Phase 0 database item (PHASES item 5) built on `a/db`:
  - Drizzle 0.45 plus the `postgres` 4.1 client (`prepare: false`, at most 3 connections, 10 s connect timeout).
  - First migration `drizzle/0000_timescaledb.sql` (`create extension if not exists timescaledb`, no tables).
  - `/api/health` returns `{ db, timescaledb }` with `no-store`, and 503 when the database fails.
  - `db:generate` and `db:migrate` scripts. A TimescaleDB 2.32.1 on Postgres 18 service in CI.
  - Tests: integration tests ran against a local TimescaleDB container.
    - Migrations on a fresh database from `template0` install TimescaleDB and record one row, even when run twice.
    - Health returns 200; 503 without TimescaleDB; 503 when unreachable; and 503 when `DATABASE_URL` is unset.
    - The read-only check against `fogline-db` passed before D-038 and now needs `LIVE_DATABASE_URL`.
  - code-critic: PASS. All 5 SHOULD FIX items fixed (D-038, D-039, the migration and health tests), plus the nits.
  - `/api/health` in the dev server returns `{"db":true,"timescaledb":true}` from `fogline-db`.
  - PR #3 (test harness) merged.
- 2026-11-21 15:49 ET · Builder A · Phase 0 test harness (PHASES item 4) built on `a/test-harness`:
  - Vitest 5 projects for unit, component and integration, in `TZ=America/New_York`, with 90% line coverage required on `src/lib`.
  - MSW 3 blocks and records every unmocked request and fails the test that made it. MSW 3's own "error" strategy lets `.json` URLs through, and every MBTA feed URL ends in `.json`.
  - Playwright projects: desktop-chrome 1440×900, iphone (WebKit) and pixel, both at 390×844. The server runs in UTC, like Vercel. axe runs, plus a horizontal-scroll check.
  - CI runs the tests and Playwright, and uploads reports on any run that isn't cancelled.
  - Tests: 14 Vitest and 6 e2e pass. `src/lib` line coverage is 96%.
  - code-critic: FAIL on the first pass (unmocked requests became a silent 500). Fixed and proven with a throwaway failing test.
  - Also: PR #2 merged after `vercel.json` set the framework to Next.js. The Vercel project, created when the repo held only docs, had looked for a static `public` folder.
- 2026-11-21 15:33 ET · Builder A · Phase 0 scaffold (PHASES items 1, 2, 3, 10) built on `a/scaffold`:
  - Next 16.4.6 (Turbopack, Cache Components off), React 19.3, Tailwind 4.3.
  - Prettier and the ESLint flat config (rules for `no-console`, `no-debugger`, `eqeqeq` and `no-explicit-any`), plus `data:*` scripts that exit 1.
  - shadcn (Radix base): Button, Drawer, Sonner, Input, Tabs.
  - `src/lib/log.ts` (JSON lines, error causes), `src/lib/flags.ts` (`NEXT_PUBLIC_FLAGS`), `src/copy/`, the home stub, and the first CI workflow (format, typecheck, lint, build).
  - Checks: `pnpm format:check`, `typecheck`, `lint` and `build` pass. The token grep is clean outside `src/components/ui` (D-037). code-critic PASS (both SHOULD FIX items fixed) and copy-critic PASS (both suggestions applied). Home stub seen at 390×844.
  - Not done: one theme only, because dark mode is class-based until Phase 1. No tests yet; the harness is item 2.
  - Next: PR, CI, Vercel preview, merge, then `a/test-harness`.
- 2026-11-21 15:17 ET · Builder A · Kickoff review. A's answers are logged as D-013 to D-035. Updated PRD (F1.1–F1.7, F4.8–F4.9, F5.8, F6.2, F6.4, F7.1, F10.6, F12.1, F16.1–F16.2, glossary), DESIGN, ARCHITECTURE, DATA, PHASES, TESTING, PWA, COPY, TEAM (A = Achyut21, B = Anand283) and WALKTHROUGH (judge path) on branch `a/kickoff-docs`. No code. Next: A approves the Phase 0 plan.
- 2026-11-21 · setup · Repo docs, Claude Code agents, commands and settings created. Tiger Cloud service `fogline-db` exists (credentials in each builder's local `.env` only). Vercel Pro and the Gemini key are ready. GitHub CLI logged in as Achyut21. Next: Phase 0.
