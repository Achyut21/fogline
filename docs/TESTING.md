# Fogline testing

Every acceptance criterion in `docs/PRD.md` has at least one test, with its ID in the test name: `it('[F5.2] subtracts walk time and a 5 minute buffer', ...)`. The `test-auditor` subagent checks this at every gate.

## Layers

| Layer | Tool | What it covers | Where |
|---|---|---|---|
| Unit | Vitest | pure logic: travel time, fair score, last-train search, miles, walking, H3 helpers, grades, matching, badges, stats, puzzle, time helpers, data-pipeline transforms | `tests/unit/` |
| Component | Vitest + React Testing Library | UI states: loading, empty, error, offline, interactions, accessible names, reduced-motion branches | `tests/component/` |
| Integration | Vitest + a test database schema | Server Actions and queries against Postgres: authorization, idempotency, hypertable writes | `tests/integration/` |
| End to end | Playwright | feature flows on real browsers and device emulation, visual baselines, axe | `tests/e2e/` |
| Performance | Lighthouse CI | PRD section 7 budgets on key routes | CI |

## Commands

- A fresh clone runs `pnpm exec playwright install` once to get the browsers.
- `pnpm test`: unit, component and integration tests. Integration tests skip when `DATABASE_URL_TEST` is absent. It points at a throwaway TimescaleDB (a container in CI, Docker locally), never at `fogline-db`.
  - The integration project also receives that URL as `DATABASE_URL`, so code that calls `getDb()` can never reach `fogline-db` from a test.
  - The read-only check against `fogline-db` runs only when the shell exports `LIVE_DATABASE_URL`.
  - Local test database: `docker run -d --rm --name fogline-tsdb-test -e POSTGRES_PASSWORD=postgres -p 54329:5432 timescale/timescaledb:2.32.1-pg18`, then `DATABASE_URL_TEST=postgres://postgres:postgres@localhost:54329/postgres pnpm test`.
- `pnpm test:watch`
- `pnpm test:e2e`: all Playwright projects. Add `--project=iphone` or `--project=pixel` to run one.
- `pnpm test:e2e:ui`: Playwright UI mode for debugging.

## Rules

- **No real network** in unit, component or integration tests. Use MSW handlers and recorded fixtures (`tests/fixtures/mbta/*.json`: real feed snapshots trimmed to a few vehicles, plus a small GTFS slice).
- **No real timers or sleeps.** Use fake timers, `expect.poll` and Playwright's auto-waiting.
- **Time zone pinned** to `America/New_York` (`process.env.TZ` in the Vitest config and Playwright `timezoneId`). Include tests on DST-change dates and for GTFS times past 24:00:00.
- **Test behavior, not internals.** Query by role and accessible name. No assertion-free tests. No tests that only check a mock was called.
- **Snapshots** only for visual baselines and small, stable serialized outputs. Never as the only check on logic.
- **Flakes:** CI gets one retry, local runs none. A test that needs its retry is a bug: fix it or log it under Blocked.
- **Coverage:** `src/lib/` keeps at least 90% line coverage (enforced in the Vitest config). Elsewhere, criterion coverage matters more than percentages.

## Playwright setup

- **Projects:** `desktop-chrome` (1440×900), `iphone` (WebKit, the `iPhone 15` descriptor), `pixel` (Chromium, the `Pixel 7` descriptor).
- **Geolocation:** `context.grantPermissions(['geolocation'])` and `context.setGeolocation({ latitude, longitude, accuracy })` for check-ins and the nearest station. Also test denied permission and low accuracy.
- **Offline:** `context.setOffline(true)` to check the offline page, cached map state and saved plans.
- **Reduced motion:** `page.emulateMedia({ reducedMotion: 'reduce' })` on every flow test at least once.
- **Themes:** `colorScheme: 'dark'` plus the app's theme override.
- **WebGL fallback:** a Chromium project or test launched with `--disable-gpu` (and with WebGL unavailable) must show the 2D fallbacks for fog, ride and recap.
- **Visual baselines:** `expect(page).toHaveScreenshot()` for `/design` and each key screen at 390×844 in both themes, with a small `maxDiffPixelRatio`. Mask dynamic regions (times, live data). Update baselines only with a reason in the commit message, after design-critic approval. Fonts render differently on macOS and Linux, so baselines are generated and updated in Playwright's Docker image to match CI.
- **Accessibility:** run `@axe-core/playwright` on every route. Zero serious or critical violations.
- **PWA checks:** the manifest's fields and icons, service worker registration, the offline page, installability (no errors from the DevTools command `Page.getInstallabilityErrors` in Chromium), and the `beforeinstallprompt` handling in Chromium.
- **Multi-user flows:** use two browser contexts (organizer and friend) for invites, joins, check-ins and arrival order.
- **Network control:** route MBTA proxy calls to fixtures in most tests. Keep one `@live` tagged smoke test that hits the real feeds and is excluded from CI.

## What each phase adds

| Phase | Required tests |
|---|---|
| 0 | one smoke test per layer, TimescaleDB check, manifest test, installability test |
| 1 | `/design` visual baselines (both themes, two viewports), axe on `/design`, reduced-motion rendering of every motion pattern, WebGL-fallback test for the fog |
| 2 | unit tests for every algorithm in `DATA.md` with all section 4 edge cases, pipeline transform tests on fixtures, migration test |
| 3 | F1–F3 criteria, the replay ride e2e, the offline map state |
| 4 | F4–F6 criteria, the two-context plan e2e, the Mastra eval guard (rejects mismatched numbers) |
| 5 | F7 and F16 criteria, **the full judge-path e2e in demo mode on iPhone and Pixel** |
| 6 | F8, F9 and F15 criteria, badge idempotency, Open Graph image route returns a 1080×1350 PNG |
| 7 | F10–F12 criteria, weekly cron with fixtures |
| 8 | F13 and F14 criteria, an e2e check that no audio payload is ever sent |
| 9 | Lighthouse CI budgets, full regression on production |

## CI (GitHub Actions)

On every pull request and every push to `main`: install with pnpm cache, typecheck, lint, unit, component and integration tests (against a TimescaleDB service container), build, then Playwright on `desktop-chrome`, `iphone` and `pixel` against the built app, uploading reports and traces on failure. Lighthouse CI runs against the Vercel preview URL (with the protection-bypass secret) once Phase 3 has a real map route.
