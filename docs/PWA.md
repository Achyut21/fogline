# Fogline as a PWA on Android and iOS

Fogline must install and feel native on Android (Chrome) and iOS (Safari). The two platforms behave differently, so each item below says which one it's for.

## Manifest (`app/manifest.ts`)

- `name: "Fogline"`, `short_name: "Fogline"`, `id: "/"`, `start_url: "/?source=pwa"`, `scope: "/"`, `display: "standalone"`, `orientation: "portrait"`.
- `background_color` and `theme_color` from the tokens. Use the day values, and set a second `theme-color` meta tag with `media="(prefers-color-scheme: dark)"` for night.
- **Icons:** 192×192 and 512×512 (`purpose: "any"`), plus a 512×512 maskable icon (`purpose: "maskable"`, key shapes inside the central safe zone).
- `shortcuts`: Ride (`/ride`), Daily (`/daily`), New plan (`/plans/new`).
- `screenshots`: at least one narrow (mobile) and one wide. Android uses them for the richer install dialog.
- `categories: ["travel", "social", "games"]`.

## iOS (Safari)

- **Tags in the root layout metadata:**
  - `apple-touch-icon` 180×180;
  - `apple-mobile-web-app-title`;
  - `apple-mobile-web-app-status-bar-style: black-translucent`;
  - the web-app-capable meta tag that matches the current Next.js metadata API (check the docs).
- **Splash screens:** `apple-touch-startup-image` links for current iPhone sizes in both orientations, generated from the app icon and background color (for example with `pwa-asset-generator`), in day and night variants using `media` queries.
- **Viewport:** `width=device-width, initial-scale=1, viewport-fit=cover`. Use `env(safe-area-inset-*)` for padding. Use `100dvh` (not `100vh`) for full-height layouts.
- **No install event.** iOS has no `beforeinstallprompt`. Detect Safari on iOS when not standalone (`navigator.standalone !== true` and no `display-mode: standalone` match), then show the InstallSheet with the real steps: Share button, then "Add to Home Screen". Show it only after the first completed action (F1.6).
- **Separate storage.** Safari tabs and the installed PWA don't share cookies or storage. The profile code (F1.3) restores a profile inside the installed app. The InstallSheet tells users to copy their code first.
- **Storage eviction.** Safari can clear script-writable storage for sites that haven't been used in a while when they aren't installed. Keep the server as the source of truth. Call `navigator.storage.persist()` where supported.
- **No Vibration API.** Use visual feedback instead of haptics.
- **Permissions** may be asked again in standalone mode. Primers should handle a repeat request.
- **Push notifications** only work in installed PWAs on iOS 16.4 and later. They're out of scope for now.
- **Inputs:** a font size of at least 16 px prevents zoom on focus. Use `touch-action: manipulation` on controls to remove the double-tap zoom delay. Use `overscroll-behavior: none` on the app shell so the page doesn't bounce under the map.
- **Keyboard:** use the `visualViewport` API to keep the puzzle keyboard and sheet inputs visible.

## Android (Chrome)

- Catch `beforeinstallprompt`, keep the event, and show our own Install button at the right moment (F1.6). Call `prompt()` on tap, then record the outcome.
- Maskable icon and theme color as above. Screenshots in the manifest enable the richer install sheet.
- `navigator.vibrate` for haptics, using the patterns in `DESIGN.md` section 8.
- After install, check standalone display with `matchMedia('(display-mode: standalone)')` and hide install prompts.

## Service worker and offline

- **Precache:** the app shell, fonts, icons, the offline page, and the static data files the client needs (`stations.json`, `shapes.json`, `neighborhoods-h3.json`, `station-cards.json`, `words.json`).
- **Runtime caching:**
  - map tiles cache-first, with a size cap and expiry;
  - Wikimedia images stale-while-revalidate, with a cap;
  - `/api/mbta/*` network-first with a short timeout, falling back to the last response, labeled with its age in the UI;
  - Server Actions never cached.
- **Offline:** the map shows cached tiles and your uncovered cells, saved plans open read-only, and the OfflineBanner says what still works. Check-ins and guesses made offline are queued and sent when the connection returns (IndexedDB).
- **Updates:** when a new service worker is waiting, show the "Update ready" toast with a Refresh action. Never reload the page without asking.

## Device APIs

| API | Use | Support notes |
|---|---|---|
| Geolocation | check-ins, nearest station | ask only on user action, after a primer |
| Screen Wake Lock | keep the screen on during rides | iOS Safari 16.4+, Android Chrome; re-acquire after `visibilitychange` |
| Web Share (with files) | share puzzle grid, recap image, invite link | fall back to copy link or download |
| Web Audio (`getUserMedia`) | calm mode decibel sampling | opt-in only; process on device; never record or send audio |
| Vibration | haptics | Android only |

## Checklist before Phase 9 sign-off

- [ ] Installs from Chrome on a real Android phone, opens standalone with the right icon, splash and theme color.
- [ ] Installs from Safari on a real iPhone, opens standalone with the right icon, splash and status bar, and profile restore by code works.
- [ ] Safe areas are correct on a notched iPhone in portrait. Nothing sits under the home indicator.
- [ ] Offline: the app opens, the map shows cached state, saved plans open, the banner is correct, and queued actions send on reconnect.
- [ ] The update toast appears after a new deploy, and refresh loads the new version.
- [ ] Chrome reports no installability errors (DevTools `Page.getInstallabilityErrors`; Lighthouse 12 removed its PWA audits), and the mobile budgets in PRD section 7 hold.
