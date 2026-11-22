---
description: Run the exit gate for a Fogline phase. Runs every check, records evidence in PROGRESS.md, and reports PASS or FAIL.
argument-hint: <phase number>
---

Run the exit gate for Phase $ARGUMENTS of Fogline.

1. Read the gate checklist for Phase $ARGUMENTS in `docs/PHASES.md` and the standing checks at the top of that file.
2. Run, and paste any failure output:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm test`
   - `pnpm test:e2e` (all projects, including iPhone and Pixel)
   - `pnpm build`
   - the token check described in `docs/PHASES.md` (part of `pnpm test`)
3. Run these subagents in parallel:
   - `code-critic` on everything merged or changed since the phase started,
   - `test-auditor` on the phase's criteria,
   - `design-critic` and `copy-critic` if the phase touched UI or user-facing text.
4. Check the docs:
   - `docs/PROGRESS.md` log covers every item in the phase,
   - `docs/WALKTHROUGH.md` has a "Verified" entry for every user-facing feature in the phase,
   - `docs/DECISIONS.md` records every decision made,
   - `docs/DATA.md` matches any data or algorithm changes.
5. Fill the gate table for Phase $ARGUMENTS in `docs/PROGRESS.md`: one row per check, PASS or FAIL, with evidence (command output summary, screenshot path, critic verdict).
6. If any check fails, fix it and re-run that check. Repeat until every check passes.

The phase is done only when every row is PASS. Never write PASS for a check you did not run in this session.
