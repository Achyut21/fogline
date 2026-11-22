# Fogline team workflow

Two builders, each with their own Claude Code session on their own laptop. The repo docs are the only shared memory between the sessions, so `docs/PROGRESS.md` must stay current.

## People

| Letter | GitHub |
|---|---|
| A | Achyut21 |
| B | Anand283 |

## Ownership

| Area | Owner | Notes |
|---|---|---|
| Design system: tokens, fonts, base components, `/design` | A | Changes need design-critic approval and a DECISIONS entry |
| Map, fog layer, ride mode, 3D scenes, motion | A | |
| App shell, PWA (manifest, service worker, install flows) | A | |
| Onboarding and profile (F1), demo mode (F16) | A | |
| Data pipelines (`scripts/`, `data/`) | B | |
| Domain logic (`src/lib/solver`, `lasttrain`, `geo`, `time.ts`, `grades.ts`, `badges.ts`, `stats.ts`, `puzzle.ts`) | B | |
| Database schema and migrations (`src/server/db`, `drizzle/`) | B | A asks B before changing them |
| Plans, last train, live night (F4–F6), puzzle logic (F7) | B | A helps with UI and motion |
| AI (`src/server/ai`, Mastra agent) | B | |
| How it works (F15), recorder cron | B | |
| `src/copy/` | both | Whoever adds a string runs copy-critic |
| `docs/` | both | PRD and PHASES changes need both humans' agreement |

To change a file the other builder owns, first write a note under your Board entry in `PROGRESS.md` saying which file and why, and tell your teammate.

## Git flow

- `main` is always deployable and protected by CI. Never push to it directly.
- One branch per item: `a/<topic>` or `b/<topic>`, for example `a/fog-layer`, `b/fair-solver`.
- Before starting: `git checkout main && git pull`, then branch. Rebase on `main` before opening the PR.
- Commits follow conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`). Use the `commit-message` skill.
- Open small PRs (one item each). Write the description with the `pr-description` skill and include the criteria IDs covered.
- **Merge checklist:**
  - CI green;
  - Vercel preview checked at 390×844;
  - code-critic PASS (plus design-critic and copy-critic when relevant);
  - the deployment check passed on the PR's preview. Until Vercel's event arrives, start it by hand: `gh workflow run deployment.yml -f url=<the preview's own URL> -f sha=<head sha> -f environment=preview`. After merging, run it on the production domain (D-044):
    1. `pnpm dlx vercel ls fogline --scope achyut-katiyars-projects --meta githubCommitSha=<full 40-character merge sha>` lists the merge's production deployment (a short SHA finds nothing). Wait until it's Ready.
    2. `pnpm dlx vercel inspect fogline-mu.vercel.app --scope achyut-katiyars-projects` must show that same deployment URL. The alias moves with every production deployment, so it is the only proof the run tests the merge.
    3. Right away: `gh workflow run deployment.yml -f url=https://fogline-mu.vercel.app -f sha=<merge sha> -f environment=production`.
    A production deployment's own URL is protected too, and the service-worker and installability tests fail there.
  - PROGRESS and WALKTHROUGH updated.
  - Until B can deploy on Vercel, B's PRs skip the Vercel preview items. A merges them with `gh pr merge --admin --squash` once CI `check` and code-critic pass, then lands an A-authored docs PR so production deploys, and runs the production check on that deployment (D-052).

  Then squash-merge.
- Database migrations go in their own PR, merged before the code that depends on them. Say so in the handoff.
  - After the migration PR merges, the builder who merged it applies it to `fogline-db`: `MIGRATE_DATABASE_URL=<pooled fogline-db URL> pnpm db:migrate`. Keep `MIGRATE_DATABASE_URL` out of `.env` (drizzle-kit loads it), so the command can't run against production by accident (D-043).
  - Previews share `fogline-db`, so code that needs a new migration only works on a preview once that migration is applied.

## Session rhythm

1. Start with Prompt 2 from `MASTER_PROMPT.md`.
2. Pull `main` and read `PROGRESS.md` for the other builder's handoff.
3. Work the loop in `CLAUDE.md`, updating `PROGRESS.md` after each item.
4. End with `/handoff`, then push your branch.

## Setup for each builder

1. Clone: `gh repo clone Achyut21/fogline`, then `pnpm install` and `pnpm exec playwright install`.
2. **`.env`:** copy `.env.example` to `.env`. Builder A shares the values directly (a private message, never a group chat or the repo).
3. **Tiger Cloud:** Builder A invites Builder B under Members in the Tiger console.
4. **Vercel:** Builder A invites Builder B to the Vercel team and project.
5. **GitHub:** Builder A adds Builder B as a collaborator.
6. **Claude Code:**
   - run `/mcp` and authorize Context7;
   - optionally install `frontend-design` and `superpowers` from the official marketplace (`/plugin`), and the Karpathy guidelines plugin (`/plugin marketplace add forrestchang/andrej-karpathy-skills`).
   - `impeccable` is vendored in `.claude/skills/`. Other skills named in `CLAUDE.md` (design-taste-frontend, web-design-guidelines, no-ai-slop, shadcn-component-author, next-route-handler) are optional. When one is missing, the docs' rules apply.
7. **Check it works:** `pnpm test`, `pnpm dev`, open `http://localhost:3000` at 390×844.
8. **Project hooks** load from `.claude/settings.json` (D-042), and they need `pnpm install` to have run.
   - After each Edit or Write, Prettier formats the file.
   - When Claude finishes a turn on a branch whose code changed without a `docs/PROGRESS.md` change, it's asked to update PROGRESS, at most once per turn.
   - Hooks run code from the checked-out branch. Before reviewing a fork branch with Claude Code, set `"disableAllHooks": true` in `.claude/settings.local.json`.

## Talking to each other

- `PROGRESS.md` is the record. Chat is for quick pings.
- Ping your teammate when you: change a shared file, add an env var, merge a migration, change tokens or components, or get blocked on their work.
