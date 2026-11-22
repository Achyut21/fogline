# Fogline design

**Status: DRAFT until the Phase 1 gate.** This file holds the brief, the rules, and starting values. Phase 1 turns it into the approved system: final tokens, the Claude Design canvas link, and the `/design` style guide. After approval, any change to tokens or components needs `design-critic` approval and an entry in `docs/DECISIONS.md`.

Approved Claude Design canvas: _(link added at the Phase 1 gate)_

Working canvas: https://claude.ai/artifact/4o3hJj7QBSBavvV4LburQR (private until A shares it from the page's Share menu).

## Direction (chosen 2026-11-21)

**Choice.** C, "the familiar option": the category standard for map apps, played straight and finished to the level of the apps below. A picked it on 2026-11-21 from three moods on the canvas. B's human confirms it before the Phase 1 gate (D-050).

**How it was chosen.** impeccable `shape` with A: tool first, play in moments, and never cute (`docs/PRODUCT.md`). impeccable's concept roll (seed `eeb14234`) assigned a harbor-chart world and dealt a departure-board challenger. The canvas showed both next to the familiar option, each as map home, ride stop card and recap, day and night, on real renders (MBTA GTFS shapes, OpenFreeMap tiles, H3 fog cells).

**Craft bar.** Apple Maps, Transit and Strava. Every screen is judged against their finish:
- Apple Maps: a live map with floating cards and sheets that snap.
- Transit: departure times and line color carry the screen, usable with one thumb.
- Strava: stats and recaps that make the numbers the reward.

**The world, as drawn on the canvas** (item 5 set the final values in section 4, D-054):
- **Map:** a muted gray basemap with white roads, a dark variant for night, official line colors with casings, stations as small white dots. Fog is a near-opaque white veil by day and a near-black veil by night over H3 cells. Seen cells are thinner fog, visited cells are clear.
- **Surfaces:** floating cards (about 20 px radius) and sheets (24 px top corners) with soft shadows over the map. Pills for chips and line letters. Cards only where they float over the map or hold a tile. No cards inside cards.
- **Color:** cool neutrals and one accent, a teal (about `#0B7A75` by day, `#3BC9BE` by night) for the primary action, the active tab and progress. Line colors only on lines and line badges.
- **Type:** one grotesque family with tabular figures (Hanken Grotesk on the canvas; impeccable `typeset` confirms or replaces it in item 5). Numbers are the largest type on each screen: the uncovered percent, minutes, leave-by times, recap stats.
- **Motion:** sheets and cards move like Apple Maps (springs, interruptible). The play lives in the fog reveal, count-ups, the badge award and the recap.

**What still holds from the brief:** the map is the hero, fog is the reward, numbers are the celebration, one primary action per screen, a night theme as good as the day theme, content before 3D. Still avoided: glassmorphism, purple-blue gradients, mascots, a dashboard of same-size cards.

**What changes in the brief:** section 1 asked to avoid "a layout that looks like a template". The humans chose the familiar layout on purpose. Fogline's identity has to come from the fog, the numbers and the copy, not from new chrome.

**Honest risk:** this direction sits closest to existing transit apps. Until the fog lifts or a recap appears, a judge may read it as another maps app. The first-run fog reveal, the ride reveals and the recap carry the identity, so they get the best motion and the most review.

## 1. Brief (input for impeccable `shape`)

- **Product:** a mobile PWA that turns Boston into a map you uncover by riding the T and going out with friends, with a planner that's fair by T time and gets everyone home on the last train.
- **Audience:** Boston college students, 18–24, on phones, often outdoors or underground, often at night.
- **Feel:** Boston at dusk with harbor fog lifting off the city. A transit map's clarity, a game's reward.
- **Words to aim for:** atmospheric, precise, warm, playful in moments.
- **Avoid:** neon cyberpunk, glassmorphism on everything, a generic SaaS dashboard look, cartoon mascots, purple-blue gradients, a layout that looks like a template.
- **Not ours to use:** the MBTA "T" logo or MBTA branding in our identity. Line colors are fine for the lines themselves. The app must not look affiliated with the MBTA.

## 2. Principles

1. **The map is the hero.** Everything else floats over it in sheets and chips.
2. **Fog is the reward.** Every meaningful action visibly clears fog. Reveals get the best motion in the app.
3. **Numbers are the celebration.** Miles, minutes, percentages and leave-by times are the biggest type on screen, set in tabular figures, and they count up into place.
4. **One primary action per screen.** Ride, Plan it, Check in, Share. Everything else is secondary.
5. **Built for night.** A dark theme that's comfortable at 1 AM is a first-class theme.
6. **Fast first, fancy second.** Content renders before 3D loads. Every 3D or heavy effect has a 2D version that still looks intentional.

## 3. Themes

Two themes from the same token set:
- **Day:** light, fog in warm off-white with grain, a muted basemap.
- **Night:** deep blue-black, fog in cool gray, a dark basemap, line colors glow slightly.

Default: follow the OS setting (`prefers-color-scheme`). Settings offers System, Day and Night. An iPhone set to Automatic already switches at sunset, people who need dark mode all day keep it, and the `theme-color` media tags stay correct without runtime work. Only a manual override updates `theme-color` at runtime (D-051). This replaces the earlier `suncalc` default.

## 4. Tokens (final, D-054)

Values live in `src/styles/tokens.css` as CSS variables: day in `:root`, night in `.dark`. Springs and the list stagger, which only Motion and R3F use, live in `src/lib/motion.ts`. `src/app/globals.css` maps the CSS tokens into the Tailwind theme and resets Tailwind's default palette, type sizes, tracking, radii, shadows and easings, so only tokens exist as classes. Components never use raw values. `tests/unit/design-tokens.test.ts` enforces this on every `pnpm test` (D-054). `/design` shows every token, with contrast ratios, and a unit test checks that every color token appears there.

### Color roles

| Token | Day | Night | Role |
|---|---|---|---|
| `--bg` | `#F4F5F7` | `#0E1013` | app background; `theme-color` (D-043) |
| `--surface` | `#FFFFFF` | `#1E2227` | cards and sheets |
| `--surface-raised` | `#FFFFFF` | `#262B31` | menus and popovers above a sheet |
| `--surface-sunken` | `#EEF1F4` | `#2A3037` | chips and segmented-control tracks. At night it is lighter than `--surface-raised`, as on the canvas: chips read lighter than cards. |
| `--rule` | `#E3E6EA` | `#2E343B` | dividers |
| `--field` | `#F4F5F7` | `#15181C` | input fill. At night it is darker than the card, as on the canvas. |
| `--field-border` | `#848C95` | `#6B737D` | input border, 3:1 against `--surface` (WCAG 1.4.11). Focused inputs use a 2 px `--accent` border. |
| `--ink` | `#15181C` | `#EEF1F4` | primary text |
| `--ink-muted` | `#5B636D` | `#A3ACB6` | secondary text |
| `--ink-subtle` | `#6B737D` | `#8A939E` | metadata, on `--surface` only |
| `--accent` / `--accent-ink` | `#0B7A75` / `#FFFFFF` | `#3BC9BE` / `#071615` | primary action, active tab, progress |
| `--accent-soft` | `#DCEFED` | `#233B3A` | selected rows and chips, with `--ink` text (accent on accent-soft is 4.34:1 by day), text selection |
| `--success` | `#1B7348` | `#4CC38A` | arrived, checked in |
| `--warning` | `#A35600` | `#F2A93B` | countdown at 20 min or less |
| `--danger` / `--danger-ink` | `#C2321F` / `#FFFFFF` | `#FF7A66` / `#071615` | countdown at 5 min or less, errors |
| `--focus` | `#0B7A75` | `#3BC9BE` | focus ring |
| `--scrim` | ink at 12% | black at 30% | behind modal sheets |
| `--fog` / `--fog-thin` | `#FCFCFD` / 45% | `#08090B` / 45% | fog and seen cells (shader uniforms) |
| `--fog-edge` | accent at 45% | `#96ECE4` at 70% | the bright edge of the burn-off reveal (shader uniform) |
| `--halo` | `#FFFFFF` | `#08090B` | map label halos and station-dot rings |
| `--map-land` / `--map-water` / `--map-park` / `--map-road` | `#E6E9EC` / `#B6D0EA` / `#CCE6C6` / `#FFFFFF` | `#1D2126` / `#122030` / `#1B2A21` / `#30353C` | basemap restyle (section 10) |
| `--line-red`, `--line-orange`, `--line-blue`, `--line-green` | `#DA291C`, `#ED8B00`, `#003DA5`, `#00843D` | same | MBTA line colors, only on lines and line badges (Mattapan uses red) |
| `--line-ink` / `--line-ink-orange` | `#FFFFFF` / `#15181C` | same | text on line badges |
| `--line-*-casing` | white; ink for orange | `#0E1013`; `#EEF1F4` for blue | line casings |

Contrast rules (each one is a unit test):
- Every text pair in `src/styles/pairs.ts` meets WCAG 2.2 AA (4.5:1) in both themes. Add a pair there before using a new text and background combination.
- Input borders and focus rings reach 3:1 against what sits next to them (`controlPairs` in `src/styles/pairs.ts`, WCAG 1.4.11). `--field-border` falls under 3:1 on `--surface-sunken` and, at night, on `--surface-raised`, so inputs sit on `--surface`.
- White on the Orange Line fails AA, so orange badges use `--line-ink-orange`. White on red (4.87:1), green (4.81:1) and blue (9.50:1) passes.
- Every T line reaches 3:1 against land, water, park, road and fog in both themes (WCAG 1.4.11), or against its casing where a ground is too close. A cased line's adjacent color is its casing. Orange gets an ink casing by day, blue a light casing by night, and the others dark casings by night, as on the canvas. The line colors don't change. `/design` draws every line on every ground, and above the fog (F2.3).

### Type

- One family: **Hanken Grotesk** (OFL), a variable font at weights 400 to 800, loaded with `next/font` (Latin subset) as `--font-hanken`. impeccable `typeset` confirmed it (D-054). Its figures are tabular by default and it has no proportional set. Numbers still carry `tabular-nums`, so a fallback font lines up too.
- Roles, taken from the canvas (direction C, onboarding and Map pages):

| Role | Classes | Canvas |
|---|---|---|
| Hero number (map card, countdown) | `text-3xl font-extrabold tracking-tight tabular-nums` | 40/800, -0.02em |
| Recap and first-reveal hero | `text-4xl` or `text-5xl font-extrabold tracking-tight tabular-nums` | not drawn yet |
| Title (screen and sheet) | `text-2xl font-extrabold tracking-tight` | 24–30/800, -0.02em |
| Section heading (inside a sheet or page) | `text-xl font-extrabold tracking-tight` | 22/800 |
| Stat | `text-xl font-extrabold tabular-nums` | 17–20/800 |
| Wordmark | `text-xl font-extrabold tracking-snug` | 22/800, -0.01em |
| Primary button | `text-lg font-bold` | 18/700 |
| Secondary button, link, selected segment | `text-base font-bold` (unselected segments `font-semibold`) | 15/700 and 15/600 |
| Row title | `text-base font-bold` | 16/700 |
| Body and input text | `text-base` (inputs `font-semibold`) | 16, inputs 16–17/600 |
| Label | `text-sm font-bold` | 14/700 |
| Helper and meta | `text-sm`, `--ink-muted` | 13 |
| Caption (stat and nav labels, units, line letters) | `text-xs`, weight 500 to 800 | 11–12 |
| Profile code | `text-2xl font-extrabold tracking-wide` | 24/800, 0.18em |

- Canvas sizes map to the scale like this: 10–12 px → `xs`, 13–14 → `sm`, 15–17 → `base`, 18 → `lg`, 20–22 → `xl`, 24–30 → `2xl`, 40 → `3xl`. The role table wins over this mapping: the canvas's 17 px recap stats are Stats (`text-xl`), because numbers are the biggest type (principle 3). New artboards use the scale sizes.
- Tracking: `tracking-tight` (-0.02em) for titles and hero numbers, `tracking-snug` (-0.01em) for the wordmark, `tracking-wide` (0.18em) for profile codes. Tailwind's other tracking classes are reset.
- A time and its AM or PM are joined by a no-break space, so "12:14 AM" never splits (COPY.md).
- Scale (rem, so it follows the user's font size), with line heights:

| Class | Size | Line height |
|---|---|---|
| `text-xs` | 0.75rem (12) | 1rem |
| `text-sm` | 0.875rem (14) | 1.25rem |
| `text-base` | 1rem (16) | 1.5rem |
| `text-lg` | 1.125rem (18) | 1.625rem |
| `text-xl` | 1.375rem (22) | 1.75rem |
| `text-2xl` | 1.75rem (28) | 2.125rem |
| `text-3xl` | 2.5rem (40) | 1 |
| `text-4xl` | 3rem (48) | 1 |
| `text-5xl` | 4rem (64) | 1 |

### Space, radius, elevation, layers

- Spacing: Tailwind's 4 px steps, limited to 0, 1, 2, 3, 4, 5, 6, 8, 10, 14 and 18 (0 to 72 px) for padding, margin, gap and space. The token check rejects other steps.
- Radius:
  - `rounded-sm`, 8 px (`--radius-small`): segmented-control thumbs (the canvas draws 10) and swatches.
  - `rounded-md`, 12 px (`--radius-tile`): inputs and list rows (the canvas draws 14), segmented-control tracks and tiles.
  - `rounded-lg`, 20 px (`--radius-card`): floating cards.
  - `rounded-xl`, 24 px (`--radius-sheet`): sheet top corners.
  - `rounded-full`: buttons, icon buttons, chips, line badges, grabbers, progress bars and avatars. The canvas draws these as pills (radius half the height: 22 for 44 px, 28 for 56 px).
- Elevation: `shadow-sm`, `shadow-md` and `shadow-lg` (`--elevation-1` to `--elevation-3`). Level 3 casts upward, for bottom sheets. Night adds a hairline light ring to each level, because a black shadow barely shows on near-black and night `--surface` is almost the color of night `--map-land`.
- Layers, bottom to top, as `z-(--layer-*)`: map 0, fog 1, overlay 2 (lines, stations, pins), chips 10, sheet 20, toast 30, modal 40.

### Motion

| Token | Value | Use |
|---|---|---|
| `duration.instant` | 80 ms | press feedback |
| `duration.fast` | 160 ms | small state changes, tab crossfade |
| `duration.base` | 240 ms | most transitions |
| `duration.slow` | 400 ms | large surfaces |
| `duration.reveal` | 900 ms | fog burn-off |
| `duration.count` | 1200 ms | number count-up |
| `ease.standard` | `cubic-bezier(0.2, 0, 0, 1)` | enter and move |
| `ease.exit` | `cubic-bezier(0.4, 0, 1, 1)` | leave |
| `spring.snappy` | stiffness 520, damping 34 | buttons, chips |
| `spring.smooth` | stiffness 260, damping 30 | sheets, cards |
| `spring.bouncy` | stiffness 380, damping 18 | pin drop, badge award |
| `stagger.list` | 35 ms (stagger the first 8 items, show the rest together) | lists |

CSS uses `duration-(--duration-fast)`, `ease-standard` and `ease-exit`. `src/lib/motion.ts` exports the same values for Motion and R3F, and a unit test keeps the two equal.

## 5. Layout and navigation

- The app shell has a bottom navigation with four tabs: **Map**, **Daily**, **Plans**, **Me**. Ride is the primary floating action on the Map tab. Squad lives under Me.
- Content opens in bottom sheets (vaul) with snap points (peek, half, full). The map stays alive underneath. Tab switches never re-mount the map.
- Use safe-area insets everywhere. Nothing sits under the notch or the home indicator.
- Reference viewport: 390×844. Also supported: 360×780 (small Android), 430×932 (large iPhone). Tablet and desktop get a centered phone-width column, with the map filling the rest.

## 6. Screens and states

Each screen needs default, loading (skeleton), empty, error and offline states unless marked otherwise.

1. **Onboarding:** Welcome (fog hero with the name field and a "Restore profile" link), School, Home station (suggested from the school), Age band, then the map's first fog reveal in place of a Ready screen. Restore: enter a profile code.
2. **Map (home):** progress header, map with fog, Ride button, station sheet, neighborhoods sheet, list view.
3. **Ride:** station picker, upcoming trains, riding view (3D and 2D), stop card, train-lost state, ride summary.
4. **Daily:** puzzle, invalid-word feedback, solved with event card, failed, already played, streak. The puzzle gets its own look: no tiles, colors or layout borrowed from other word games.
5. **Plans:**
   - plans list (upcoming, this week's suggestions, past) and the builder steps;
   - options result with fairness bars and leave-by times;
   - plan detail with invite and Remind me, and the join page for invitees (including the 21+ state for under-21 profiles);
   - live mode, check-in states (success, too far, low accuracy, permission denied), recap.
6. **Me:** stats, badges, profile code, settings (theme, force 2D, calm mode, age band, delete my data), install.
7. **Squad:** squad map, members, streak.
8. **System:** offline banner, stale-data chip, error page, 404, iOS install sheet, permission primers (location, microphone), update-available toast, demo chip.
9. **`/design`:** the living style guide.
10. **`/how-it-works`:** live data and attribution page.

## 7. Component inventory

App shell, BottomNav, ProgressHeader, Sheet, MapView, FogLayer (3D), FogFallback (2D), LineBadge, StationDot, StationSheet, StopCard, TrainRow, RideScene (3D), RideProgress (2D), SummaryStats, StatCounter, StatTile, FairnessBars, OptionCard, PlanCard, AvatarStack, ParticipantChip, LeaveByChip, Countdown, CheckInButton, ArrivalPodium (3D and 2D), BadgeToken (3D), BadgeChip (2D), BadgeGrid, GradeBadge, PuzzleGrid, PuzzleKeyboard, EventCard, SegmentedControl, Stepper, StationSearch, FilterChips, Button (primary, secondary, ghost, danger), IconButton, Toast, EmptyState, ErrorState, OfflineBanner, StaleChip, Skeleton, InstallSheet, PermissionPrimer, ShareButton, DemoChip.

Every component appears on `/design` in every variant and state, in both themes.

## 8. Motion choreography

| Moment | Motion | Reduced motion |
|---|---|---|
| Station tap | the station dot pulses (`spring.bouncy`), sheet rises (`spring.smooth`), map dims to 30% | sheet fades in |
| Fog reveal | fog burns off radially from the point with a bright edge (`duration.reveal`) | 200 ms crossfade of cell states |
| Puzzle solved | tiles bounce in a wave, map flies to the venue (about 1.2 s), pin drops (`spring.bouncy`) with a small ring | pin appears, map jumps |
| Count-up numbers | digits count to their value (`duration.count`), tabular figures keep width fixed | final value shown at once |
| Badge award | token flips in (3D, or 2D scale and rotate), one glow pulse, Android haptic | badge fades in |
| Puzzle typing | each letter flips with a 120 ms stagger; an invalid word shakes horizontally (300 ms) | color change only |
| Card to detail | shared-element transition (Motion `layoutId`) | crossfade |
| Tab switch | content crossfade (`duration.fast`); the map never animates | instant |
| Countdown | digits roll like an odometer; color moves to warning, then danger | digits change in place |
| Recap | podium rises one block at a time, then names, then numbers count up, then badges, then Share. 4 s or less, tap to skip | final state shown |
| Ride | the train glides between stops (interpolated from schedule between feed updates), stop card slides up, fog parts | position jumps, card fades |

Rules:
- Animate only transform and opacity.
- Every animation can be interrupted, and input is never blocked.
- One hero motion per screen.

**Haptics:** Android supports `navigator.vibrate` (tap 10 ms, success `[10, 40, 20]`, warning `[30, 60, 30]`). iOS Safari has no vibration API, so the same moments rely on motion and sound-free visual cues.

## 9. 3D system (three.js via React Three Fiber)

Where 3D is used, and why:

| Scene | What it does | 2D fallback |
|---|---|---|
| Fog layer | Volumetric-looking fog over the map: FBM noise (2–3 octaves), slow drift, a density mask from the cell states, a bright edge during reveals, parting slightly under the finger | MapLibre fill layer of fog cells with a CSS grain texture |
| Ride scene | The line as a tube along the GTFS shape, stations as instanced rings, a low-poly train, a damped follow camera, fog around the track | SVG line with a moving dot |
| Recap podium | Three blocks, initial discs for avatars, instanced confetti (300 instances at most), soft lighting; goes static after 4 s | Motion-animated 2D podium |
| Badge tokens | Coin-like tokens with a clearcoat material and a slow idle turn while visible | 2D badge chips |
| Onboarding hero | Fog particles parting to reveal a Boston skyline silhouette | Static illustration with a CSS fade |

**Integrating the fog with MapLibre:** Phase 1 builds a spike and picks one approach.
- (A) A MapLibre custom layer that renders three.js into the map's WebGL context, following MapLibre's three.js custom-layer example.
- (B) A separate R3F canvas above the map, synced to the map camera every frame.

Measure both under Chrome's 4× CPU throttle with mobile emulation, then record the choice in `docs/DECISIONS.md`.

**Budgets and rules:**
- Device pixel ratio clamped to 1–2 (1–1.5 on mid tier).
- 100 draw calls or fewer per scene, 150k triangles or fewer, textures 1024² or smaller.
- No shadows on mobile. Post-processing only on the top tier, off by default.
- Use `frameloop="demand"` when idle. Stop rendering when `document.hidden` or when the canvas is off-screen.
- Use drei's `PerformanceMonitor` to step quality down when frames drop.
- Dispose geometries, materials and textures on unmount.

**GPU tiers:** use `detect-gpu`. Tier 0–1 gets the 2D fallback, tier 2 reduced effects, tier 3 everything. Users can force 2D in Settings.

**Code layout:**
- `src/three/scenes/`, `src/three/shaders/`, `src/three/materials/`, `src/three/hooks/`.
- Scenes load with `next/dynamic` and `ssr: false`, and their Suspense fallback is the 2D version.

## 10. Map style

- Start from an OpenFreeMap style and restyle it: muted land and water, low label density, no POI icons (we draw our own), plus a night variant.
- Draw T lines from GTFS shapes as our own layers, so color, width and order are ours. Draw stations as circles that grow at higher zoom.
- Line casings stay at least 2 CSS px wide on each side at every zoom where the line draws. A line's 3:1 contrast against roads and parks comes through its casing (section 4, D-054), so a casing that interpolates below a pixel drops it to about 2.5:1.
- The attribution control stays visible: OpenFreeMap, OpenStreetMap contributors.

## 11. Imagery and icons

- Icons: lucide, plus custom line and station glyphs, which arrive with LineBadge and StationDot in Phase 1 item 6.
- Stop-card photos come from Wikimedia Commons, with author and license shown on the card.
- App icon (`public/icons/icon.svg`, PNGs from `pnpm icons`): seven H3 cells on the night background. A teal line enters from the lower right and ends at a station dot in the center. The two cells it crossed are cleared (tinted `--accent-soft`), the cells beside them hold thin fog, and the rest full fog. Colors are tokens (night `--bg`, `--accent-soft` and `--accent`, day `--fog`), and every shape sits inside the central 80%, so the same file works as a maskable icon. No MBTA marks (D-054).
- Wordmark: "Fogline" in `text-xl font-extrabold tracking-snug`, in `--ink`. It is type, not a separate logo file.

## 12. Phase 1 process (design before any feature UI)

1. **Direction.** Read `docs/PRD.md` and `docs/COPY.md`. Run impeccable `shape` with the brief in section 1 and write the result into a "Direction" section at the top of this file.
2. **Claude Design canvas.** Create a Design artifact with the Artifact tool. Run `quickstart` with intent `design` to get the Design type link, then publish from that type with the title "Fogline design".
   - First artboards: 2–3 clearly different mood directions, each showing map home, a ride stop card and the recap. The humans pick one.
   - Then every screen in section 6 at 390×844, in both themes, including empty, error and offline examples.
3. **Motion storyboards.** For each row in section 8, add frames or notes to the canvas: start state, end state, timing token.
4. **3D spike.** Build the fog layer with approaches A and B. Measure frame time under throttling. Pick one and write a DECISIONS entry.
5. **Tokens.** Put final values into section 4, into `src/styles/tokens.css` and into the Tailwind theme. Set up fonts and icons.
6. **Base components and `/design`.** Build the base components and the `/design` route. It shows every token (with contrast ratios), every component in every state, play buttons for each motion pattern, 3D previews with a tier toggle, a theme toggle and a reduced-motion toggle.
7. **Baselines.** Record Playwright visual baselines for `/design` at 390×844 and 1440×900 in both themes.
8. **Review.** Run `design-critic` and `copy-critic` and fix what they find. The humans approve the canvas and `/design`. Record the canvas link and the approval here and in `docs/DECISIONS.md`.

## 13. Review checklist (short form; the full list is in `.claude/agents/design-critic.md`)

- Tokens only, in both themes, with AA contrast.
- One primary action, with numbers as the visual hero.
- All five states present.
- Motion from tokens, interruptible, with a reduced-motion version.
- 3D has a fallback and stays within budget.
- Safe areas respected and touch targets of 44 px or more.
- Matches the approved canvas, and copy follows `docs/COPY.md`.
