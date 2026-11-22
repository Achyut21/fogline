# Product

<!-- impeccable:product-schema 1 -->

impeccable's product record for Fogline, added in Phase 1. `docs/PRD.md` is the source of truth. When the two disagree, PRD.md wins and this file gets fixed.

## Platform

web

## Users

Boston college students, 18–24, at BU, Northeastern, Harvard, MIT, Tufts and other campuses. They don't have cars. They ride the subway and open Fogline on their phones: outdoors, underground with no GPS, in a hurry, often at night. Personas are in PRD section 3. Visitors such as parents and tourists use ride mode.

## Product Purpose

Boston starts covered in fog. Riding the T, going out with friends and solving a daily puzzle clear it. Under the game sits a planner: a meetup spot that's fair by T time for friends at different campuses, multi-stop crawls, and each person's own leave-by time for their last train home.

Success at the hackathon: a judge goes from puzzle to plan to recap in demo mode in under 3 minutes, on their own phone. After it: squads keep planning nights and make their last trains.

## Positioning

Fair by T minutes, not map distance. Everyone's own last train, not one time for the group. A city you uncover by riding it. Real MBTA, City of Boston and OpenStreetMap data, and AI never produces the numbers.

## Operating Context

One hand, on a platform or a train, or walking out at 12:40 AM. Glanced at between other things. Plans travel as invite links and share images in group chats. Installed as a PWA on iOS and Android.

## Capabilities and Constraints

- Subway only: Red, Orange, Blue, Green B–E and Mattapan.
- Anonymous profiles with a profile code. No accounts or passwords.
- Under-21 profiles never see bars or clubs.
- AI writes words. Times, distances, grades, scores and badges come from code.
- Mobile first at 390×844. Works offline for the app shell, saved plans and the last map state.
- Every 3D scene has a 2D version, and content renders before 3D loads.

## Brand Commitments

- Name: Fogline. Voice: a friend who has lived in Boston for four years. Dry, specific, sometimes funny, never cute (`docs/COPY.md`).
- Tool first, play in moments. Map, plans and leave-by times read like a precise instrument. Fog reveals, count-ups, badges and the recap carry the play (A, 2026-11-21).
- Never cute: no bubbly, illustrated or mascot energy (A, 2026-11-21).
- No MBTA "T" logo or MBTA branding in the identity, and nothing that looks affiliated with the MBTA. Official line colors appear only on the lines.
- No emoji in UI copy. No exclamation marks except the recap headline.
- Familiar by choice: Fogline follows the category standard for map apps, played straight. Apple Maps, Transit and Strava set the bar for craft. The identity comes from the fog, the numbers and the copy (A, 2026-11-21; D-050).

## Evidence on Hand

- Data: MBTA GTFS and realtime feeds, City of Boston food inspections, OpenStreetMap places, Wikipedia and Wikimedia Commons (`docs/DATA.md`).
- No photography, illustration, logo or wordmark yet beyond the placeholder icons in `public/icons/`. The domain isn't registered.
- No users, testimonials or usage numbers. Don't invent any.

## Product Principles

1. Every number is exact. Times, minutes and grades come from code and can be checked.
2. Fog is the reward. Every meaningful action visibly clears some.
3. Numbers are the celebration. Minutes, miles and leave-by times get the biggest type.
4. One primary action per screen.
5. It works at 1 AM, underground, with one hand.

## Accessibility & Inclusion

WCAG 2.2 AA in both themes. Zero serious or critical axe violations. Touch targets of 44 px or more and text inputs of 16 px. Every animation has a reduced-motion version. Color is never the only signal: puzzle feedback and line badges carry a second cue.
