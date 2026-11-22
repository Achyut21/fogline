# Fogline progress

This is the shared status board for both builders. Update it after every finished item, not at the end of a session. Newest log entries go on top. Never put secrets here.

## Phase status

| Phase | Status | Owner(s) |
|---|---|---|
| 0 Foundations | Passed 2026-11-21 (gate table below) | A |
| 1 Design | In progress (plan approved 2026-11-21) | A (both approve) |
| 2 Data and domain logic | In progress (plan approved 2026-11-21) | B |
| 3 Profile, map, fog, ride | Not started | A (+B recorder) |
| 4 Plans, last train, live night | Not started | B (+A UI) |
| 5 Daily puzzle and demo mode | Not started | B + A |
| 6 Badges, stats, recap, How it works | Not started | A + B |
| 7 Crawls, weekly plans, grades, squad | Not started | B (+A UI) |
| 8 Extras | Not started | A + B |
| 9 Hardening and release | Not started | A + B |

## Board

### Builder A
- **Now:** Phase 1 Design. A approved the plan below, flags included, on 2026-11-21. Each item gets its own branch and PR and follows the CLAUDE.md loop. I stop for the humans three times: the impeccable `shape` questions, the mood pick, and the final approval of the canvas and `/design`.
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
- **Next:** item 1, Direction.
- **Blocked:** none.

### Builder B
- **Now:** Phase 2, approved by B on 2026-11-21. One branch and one PR per item, in this order. Phase 2 has no UI: the 390×844, both-themes and reduced-motion check and e2e don't apply to these items. Each item is checked by running its script or function on real data and recording the result here.
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
  - B's session has no Vercel login, so B can't run `vercel ls` or `vercel inspect`. After each of B's merges, please run the production deployment check in TEAM.md's merge checklist. B starts the preview check from the PR's Vercel status URL with `gh workflow run`.
  - The recorder: move it from Phase 3 into Phase 2, right after the hypertable migration, so replay has more recorded trips? It changes PHASES and adds a cron to `vercel.json`, so both humans decide. B agrees.
- **Blocked:** none. Vercel still won't build B-authored commits, so A merges B's PRs with an admin override after CI and the critics pass, then an A docs PR deploys production (D-052). B has no previews; B's human can join the Vercel team later to change that.

## Open questions

- Move the recorder into Phase 2? See Asks for A under Builder B.
- Prices (Phase 2 item 6, D-057): OpenStreetMap has no price tags for these spots, so only fast food, food courts, ice cream and cafes count as "$" and every other price is unknown. A real price source (for example Google Places price levels through Gemini Maps grounding, shown as the place's data, not AI's) would make the budget filter (F4.5) meaningful. Decide by Phase 4.
- Vibe and the F4 category list (Phase 2 item 5, D-056): the plan builder (F4 flow) asks for food, coffee, dessert, bar, club or event, and for a vibe. The place data has `culture` and `park` too (for crawls, F10.2), and no vibe tags yet. F4.5 doesn't require vibe, so the solver ignores it for now. Decide in Phase 4 whether vibe comes from Gemini vibe tags (ARCHITECTURE section 9) or is dropped from the flow.
- Rail-replacement shuttles (Phase 2 item 4, D-055): on diversion nights the MBTA replaces subway segments with `Shuttle-*` bus routes (Fri 2026-11-20: Broadway to JFK/UMass and North Quincy). The last-train search is subway-only (D-006), so it says "no train home" there. B proposes adding shuttle routes whose stops are subway stations to `timetable.json` for the last-train search only. Both humans decide, since it touches D-006. **Deferred (B, 2026-11-22):** not a priority now; revisit at the end if needed.
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

- 2026-11-21 21:31 ET · Builder B · Phase 2 item 6, places and grades, on `b/places-grades` (stacked on `b/fair-solver`):
  - `pnpm data:places` writes `data/places.json`: 2,327 named spots within 600 m walking of a station, from 5,154 OSM elements (data of 2026-11-22T02:19Z).
    - By category: food 1,341, coffee 320, park 290, bar 162, culture 154, dessert 43, club 17.
    - Every nearby station is kept with its walking distance.
  - `pnpm data:grades` adds inspection grades from Analyze Boston. `src/lib/grades.ts` holds points, cutoffs, name and street normalization, Jaro-Winkler and matching (D-057).
  - **Grade distribution (PHASES gate, also in D-057):**
    - Citywide, 4,092 active establishments: A 3,010 (73.6%), B 697 (17.0%), C 385 (9.4%).
    - Matched to spots: 832 of 1,883 inspectable spots, A 532, B 170, C 130.
    - The plain latest inspection would have given 98.8% A, because re-inspections mark violations corrected; the grade uses the latest routine inspection instead.
  - Match quality: I read the weakest matches by hand and tightened the rule until the false ones were gone. Pairs that share an address or a generic word no longer match ("Peet's Coffee" ↔ "Capital One Cafe", "Joe's on Newbury" ↔ "Stephanie's on Newbury", "Caffé Pompei" ↔ "Caffe Vittoria"). Real ones still do ("Starbucks" ↔ "BREADWINNERS/STARBUCK'S", "Warren Towers Dining Hall" ↔ "B.U. Warren Tower Cafe").
  - Reproducible: rerunning either pipeline from the cache gave byte-identical `places.json`.
  - Environment note: the Claude Code sandbox blocks `overpass-api.de` and two mirrors. The one reachable mirror answered 504 when busy, so `data:places` ran once with the sandbox off. `.cache/` is ignored by git (shared file `.gitignore`).
  - Tests: 23 unit tests (22 for the pipelines, 1 for the committed data).
    - Grade points and cutoffs, violations worst first, inspection rows (failed only, deduped).
    - Locations and addresses, normalization, Jaro-Winkler against published values, and the real match and non-match cases above.
    - OSM kinds, the 600 m edge, 21+ kinds, "$" kinds, centers and addresses, duplicates, tiles and the merge.
    - The committed `places.json` checked against its schema.
  - Next: code-critic, then item 7 (neighborhoods).
- 2026-11-21 20:55 ET · Builder B · Phase 2 item 5, fair solver and miles, on `b/fair-solver` (stacked on `b/last-train`):
  - `src/lib/solver/fair.ts`: `rankStations`, `spotsNear` and `fairOptions` (D-056).
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
  - `src/lib/lasttrain/leave-by.ts`: the F5.2 buffer, the F5.3 warning, the F5.5 last stop, the F5.7 walk home. Results also give `firstTrain`. D-055.
  - `timetable.json` now carries transfer times and walks, regenerated from the same feed.
  - **Known last trains (PHASES gate).** `pnpm check:last-trains 2026-11-23` against the MBTA V3 schedules API, matching by headsign:

    | Last train | Service date | MBTA schedule | Search |
    |---|---|---|---|
    | Green Line E, Park Street → Medford/Tufts | Mon 2026-11-23 | 1:20 AM | 1:20 AM |
    | Red Line, Harvard → Ashmont | Mon 2026-11-23 | 12:37 AM | 12:37 AM |
    | Orange Line, Downtown Crossing → Forest Hills | Mon 2026-11-23 | 12:45 AM | 12:45 AM |

    - All three match to the second. On Saturday 2026-11-28 they match too (2:14 AM, 1:36 AM, 1:45 AM).
    - On Friday 2026-11-20, E and Orange match (2:18 AM, 1:41 AM). A Red Line diversion turns trains at Broadway with shuttle buses beyond, so the search finds no train to Ashmont while the MBTA lists a 1:30 AM trip to Broadway (D-055, Open questions, deferred).
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
  - `src/lib/solver/travel.ts`: shortest path over direct rides, with lines, waits and transfer stations. `src/lib/gtfs/types.ts` holds Zod schemas for the four files (D-054).
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

    All seven are within 3 minutes. JFK/UMass is the closest because the model assumes a random wait after a transfer, while the schedule times the Ashmont-to-Braintree connection: 6.0 min modeled for the walk and wait at JFK against 3.5 in the replay. Harvard → Kenmore is high for the same reason (D-054).
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
  - Second pass: PASS. Its SHOULD FIX corrected the reason given for the JFK trip, above and in D-054. Nits fixed:
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
