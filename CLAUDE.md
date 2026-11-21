# Fogline: rules for every Claude Code session

Fogline is a mobile-first PWA for Boston college students. Boston starts covered in fog. You clear it by riding the T, going out with friends and solving a daily puzzle. The app finds meetup spots that are fair by T time for friends at different campuses, builds crawls, and tells every person when to leave to catch their last train home. It is entered in the BostonHacks 2026 "Bos(tons) of Eats and Streets" track.

The files in `docs/` are the source of truth. If code and docs disagree, stop and resolve it: fix the code, or update the doc and log the change in `docs/DECISIONS.md`.

## Read before touching code (every session)

1. `docs/PROGRESS.md`: current phase, who owns what, blockers, last handoff.
2. `docs/PHASES.md`: scope and exit gate of the current phase.
3. `docs/PRD.md`: the features you are working on (IDs F1–F16, acceptance criteria F#.#).
4. `docs/DESIGN.md`: before any UI, motion or 3D work.
5. `docs/ARCHITECTURE.md` and `docs/DATA.md`: before backend, data or algorithm work.
6. `docs/COPY.md`: before writing any text a user will see.
7. `docs/TEAM.md`: ownership, branches, handoffs.

## Operating loop

- Phases run in order. A phase ends only when its exit gate passes. This repo has no deadlines. Never cut scope, skip a test, skip a review or fake a result to go faster. If a phase is too big, split it and record the split in `docs/PHASES.md`.
- At the start of a phase or item: write a 3–6 bullet plan under your builder letter in `docs/PROGRESS.md`, show it to your human, and wait for a yes. After the yes, carry out the whole plan without asking at each step. Ask again only if the plan has to change.
- Work in thin vertical slices: one behavior, its tests, a check in the running app at 390×844, a commit.
- Update `docs/PROGRESS.md` after every finished item, not at the end of the session.
- End every session with `/handoff`.

### Definition of done (all required for every item)

1. `pnpm typecheck`, `pnpm lint`, `pnpm test` pass. `pnpm test:e2e` passes for any user-facing change.
2. Each acceptance criterion you touched has a test whose name contains its ID, e.g. `it('[F4.3] ranks options by fairness score', ...)`.
3. You saw it working in the running app at 390×844 (Claude Browser pane, Kapture, or a Playwright screenshot), in both themes, and with `prefers-reduced-motion: reduce`.
4. The `code-critic` subagent reviewed the diff and every BLOCKING finding is fixed. UI changes also pass `design-critic`. New or changed strings also pass `copy-critic`.
5. Docs updated: `PROGRESS.md` log entry, `WALKTHROUGH.md` for user-facing features (run `/walkthrough F#`), `DECISIONS.md` for any decision, `DATA.md` if a data source or algorithm changed.
6. Committed on your branch with a conventional commit message.

Never write "done" for something you have not run and seen.

## Engineering principles (Karpathy guidelines)

- **Think before coding.** State your assumptions. If a request has two readings, ask. Say so when a simpler approach exists.
- **Simplicity first.** Write the least code that solves the problem. No speculative features, no single-use abstractions, no config options nobody asked for.
- **Surgical changes.** Touch only what the task needs and match the surrounding style. Note unrelated problems in `PROGRESS.md` instead of fixing them on the side.
- **Goal-driven execution.** Turn each task into a check you can run (a test, a screenshot, a command) and loop until it passes.

(Adapted from forrestchang/andrej-karpathy-skills.)

## Code rules

- TypeScript strict. No `any`. No `as` to silence the compiler.
- No comments that restate the code. No buzzword comments ("optimized", "robust").
- No try/catch unless you catch a specific error and do something with it. No empty catch blocks.
- No `console.log` or `debugger` left in. Server-side errors go through `src/lib/log.ts`.
- No `// TODO` stubs, no placeholder implementations, no fake data in production code paths. Demo data lives only behind demo mode (F16) and is labeled as demo in the UI.
- No `=== true` / `=== false`. No `return;` at the end of void functions. No `Promise.all([single])`.
- Short, real names. No factory/strategy/visitor patterns for small problems.
- Write general code. Never write code that only makes one test pass.
- Every user-facing string lives in `src/copy/` so copy review covers one place.

## Stack decisions (these override any global defaults)

- Next.js App Router, React, TypeScript, pnpm. Server Components by default. `'use client'` only where state, effects or browser APIs are needed.
- Mutations go through Server Actions validated with Zod. Route handlers live at `app/api/*/route.ts` with typed params and Zod validation (use the `next-route-handler` skill when installed).
- Database: Tiger Cloud (Postgres + TimescaleDB) through Drizzle ORM. Hypertables, continuous aggregates and compression policies go in custom SQL migrations.
- UI: Tailwind CSS + shadcn/ui (cva + `cn()`). Bottom sheets with vaul (shadcn Drawer). Toasts with sonner.
- Animation: Motion (`motion` package, import from `motion/react`).
- 3D: three.js through `@react-three/fiber` and `@react-three/drei`. Custom shaders in `src/three/shaders/`.
- Map: MapLibre GL JS with OpenFreeMap tiles. Spatial cells with `h3-js`.
- AI: Gemini through the AI SDK Google provider. Mastra for the planner agent. AI writes words, never the facts shown to users (times, distances, grades, scores come from code).
- Hosting: Vercel Pro (functions in region `iad1`, next to Tiger's us-east-1). Vercel Cron runs the train recorder. Not EC2 or Vultr for this project.
- No auth provider. Anonymous profiles, invite links and a profile code for restoring a profile on another device or in the installed PWA.
- All times are computed in `America/New_York`. Vercel servers run in UTC.
- Before using any library API, check its current docs (Context7 MCP if authorized, or the `docs-lookup` agent). Versions move. Do not code library APIs from memory.

## UI rules

- Design comes first. No feature UI before the Phase 1 gate passes and the `/design` style-guide route exists.
- Components use design tokens only (CSS variables and the Tailwind theme). No raw hex values, no one-off spacing, no one-off durations. A grep check runs at every phase gate.
- Every screen has loading, empty, error and offline states.
- Motion animates transform and opacity only, can be interrupted, uses the motion tokens, and has a `prefers-reduced-motion` version.
- 3D is lazy-loaded, checks the GPU tier, has a 2D fallback, and stops rendering when hidden or off-screen.
- Mobile first. 390×844 is the reference viewport. Respect safe areas. Touch targets are at least 44 px. Text inputs are at least 16 px so iOS does not zoom.

## Copy rules

Follow `docs/COPY.md`: short, concrete, numbers first, sentence case. Its banned-word list is enforced by `copy-critic`.

## Skills, subagents and commands

- Design: `impeccable` (vendored in `.claude/skills/`; subcommands `shape`, `critique`, `audit`, `animate`, `typeset`, `layout`, `adapt`, `polish`, `harden`, `delight`), `design-taste-frontend`, `frontend-design:frontend-design`, `web-design-guidelines`.
- Claude Design: draft screens on a Design canvas with the Artifact tool (see `docs/DESIGN.md`, Phase 1 process).
- Building: `shadcn-component-author`, `next-route-handler`, `run` (launch the app and look at it), `dataviz` (stat tiles, fairness bars, charts).
- Quality: `code-review`, `simplify`, `security-review`, `anti-slop-review`. Copy: `no-ai-slop`, `avoid-ai-writing`.
- Git: `commit-message`, `pr-description`.
- Subagents in `.claude/agents/`: `code-critic`, `design-critic`, `copy-critic`, `test-auditor`.
- Commands in `.claude/commands/`: `/phase-start`, `/phase-gate`, `/handoff`, `/walkthrough`.

A skill may not be installed on every machine. When one is missing, follow the matching rules in these docs instead and say so in your plan.

## Secrets

`.env` holds `DATABASE_URL`, `GOOGLE_GENERATIVE_AI_API_KEY` and the other keys in `.env.example`. Never commit it, print it, read it into the conversation, or paste values into docs, tests or `PROGRESS.md`. Only `NEXT_PUBLIC_*` values reach the browser, and those are never secrets.

## Git

`main` is always deployable. Work on a branch per item (`a/<topic>` or `b/<topic>`), open a PR, check the Vercel preview, run the critics, then squash-merge. Details in `docs/TEAM.md`.
