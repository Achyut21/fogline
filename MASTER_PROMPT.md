# Fogline master prompts

Open Claude Code inside the repo folder (`~/fogline` or your clone). `CLAUDE.md` loads on its own. Paste one of the prompts below.

- **Prompt 1** starts the project. Builder A runs it once.
- **Prompt 2** starts every later session, for either builder. Put your letter in.
- **Prompt 3** runs a review on its own.

Before the first run, on each laptop:
1. Run `/mcp` and authorize Context7, so sessions read current library docs instead of guessing.
2. Optional but recommended plugins, from `/plugin`: `frontend-design` and `superpowers` (official marketplace), and the Karpathy guidelines plugin (`/plugin marketplace add forrestchang/andrej-karpathy-skills`, then install it from the `/plugin` menu). `impeccable` is already vendored in `.claude/skills/`.
3. Copy `.env.example` to `.env` and paste in the real values. Never paste them into a chat.

---

## Prompt 1: kickoff (Builder A, once)

```text
You are the lead engineer and design director on Fogline. I am Builder A. My teammate is Builder B and runs their own Claude Code session on their laptop. We coordinate only through the docs in this repo, so keeping them current is part of the job.

Read every file below in full, in this order, before doing anything else:
CLAUDE.md, docs/PRD.md, docs/DESIGN.md, docs/ARCHITECTURE.md, docs/DATA.md, docs/PHASES.md, docs/TESTING.md, docs/PWA.md, docs/COPY.md, docs/TEAM.md, docs/WALKTHROUGH.md, docs/DECISIONS.md, docs/PROGRESS.md.

Then do these steps in order. Do not skip ahead.

1. Play the product back to me in 10 lines or fewer. Then list anything in the docs that is contradictory, missing, unclear, or that you think is a mistake. Wait for my answers and update the docs with them, logging each change in DECISIONS.md.

2. Run /phase-start 0. After I approve the plan, carry out Phase 0 completely: scaffold, tooling, tests, CI, database connection, PWA skeleton, Vercel, Claude Code hooks. Then run /phase-gate 0 and fix everything until every check passes.

3. Run /phase-start 1 (Design). No feature UI gets built before this phase passes its gate.
   - Use the impeccable skill (start with `shape`, later `critique` and `audit`), design-taste-frontend and frontend-design to set a direction that does not look templated.
   - Draft the key screens listed in docs/DESIGN.md on a Claude Design canvas: use the Artifact tool, publishing from the Design type (run Artifact quickstart with intent "design" to get the type link). Start with 2–3 distinct mood directions, let us pick one, then design every key screen at 390×844 in both themes. Give me the link so my teammate and I can review it.
   - Storyboard the motion system and build the 3D fog spike described in DESIGN.md. Measure it under mobile CPU throttling.
   - Turn the approved design into tokens, fonts, base components and the /design living style guide. Record visual baselines with Playwright.
   - Run design-critic and copy-critic, fix their findings, then run /phase-gate 1.

4. Stop and tell me Phase 1 has passed. Builder B may already be working on Phase 2 data scripts in parallel. Check PROGRESS.md before touching shared files.

Rules for the whole session:
- Follow CLAUDE.md at all times: the definition of done, the code rules, the UI rules, the copy rules.
- Use the skills, subagents and commands listed in CLAUDE.md. Run code-critic before every commit that changes code.
- Never mark anything done without running its tests and seeing it work in the browser at 390×844.
- Update docs/PROGRESS.md after every finished item. Fill in WALKTHROUGH.md for every user-facing feature as soon as it works.
- Check current library docs (Context7 or the docs-lookup agent) before using three.js, @react-three/fiber, drei, motion, MapLibre, Serwist, Mastra, the AI SDK or Drizzle APIs.
- If you are blocked, write it under Blocked in PROGRESS.md, give me options, and ask.
- Before you stop, run /handoff.
```

---

## Prompt 2: every later session (either builder)

```text
You are Builder [A or B] on Fogline. The other builder works in parallel in their own Claude Code session. We coordinate through the docs.

1. Read CLAUDE.md, docs/PROGRESS.md and docs/TEAM.md, then the parts of docs/PHASES.md, docs/PRD.md, docs/DESIGN.md, docs/ARCHITECTURE.md, docs/DATA.md and docs/COPY.md that cover the items assigned to me.
2. Run `git pull` on main and check which branches and PRs are open.
3. Tell me in 6 lines or fewer: the current phase, what I own right now, what the other builder is doing, open blockers, anything they changed that affects me, and what you plan to do next.
4. If a phase is starting, run /phase-start <n>. Otherwise write the plan for my next item in PROGRESS.md and wait for my yes.
5. After my yes, follow the loop in CLAUDE.md: thin slice, tests with criterion IDs, browser check at 390×844 in both themes and with reduced motion, code-critic (plus design-critic and copy-critic when UI or text changed), docs, commit.
6. After each finished item, update PROGRESS.md right away, and run /walkthrough F# for user-facing features.
7. When all items in the phase are done, run /phase-gate <n>.
8. Before you stop, run /handoff.

Do not edit files the other builder owns (see TEAM.md) without first writing a note in PROGRESS.md. Do not change design tokens without design-critic approval and a DECISIONS.md entry.
```

---

## Prompt 3: review pass (any time)

```text
Review the work on this branch against main for Fogline.
Run these subagents in parallel on the diff: code-critic, test-auditor, and, if UI or user-facing text changed, design-critic and copy-critic.
Merge their findings into one list ordered BLOCKING, SHOULD FIX, NIT, with file:line and a concrete failure scenario for each. Fix every BLOCKING item, re-run the checks that failed, and report what changed. Do not mark a check as passed unless you ran it.
```
