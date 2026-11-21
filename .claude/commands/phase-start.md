---
description: Start a Fogline phase. Reads its scope, writes the plan into PROGRESS.md, and waits for approval.
argument-hint: <phase number>
---

Start Phase $ARGUMENTS of Fogline.

1. Read `CLAUDE.md`, the Phase $ARGUMENTS section of `docs/PHASES.md`, `docs/PROGRESS.md`, `docs/TEAM.md`, and every doc that Phase $ARGUMENTS lists under "Read".
2. List the items in this phase that belong to my builder letter (TEAM.md). For each item give:
   - the PRD feature and criteria IDs it covers,
   - the files you expect to create or change,
   - the tests you will write (unit, component, e2e), named with the criteria IDs,
   - how you will verify it in the running app.
3. Flag anything that depends on the other builder's work, and anything in the docs that looks wrong or unclear.
4. Write the plan (3–6 bullets per item) under "Now" for my builder letter in `docs/PROGRESS.md`, and set the phase status to "In progress".
5. Show me the plan and wait for my yes. After the yes, work through the items one at a time using the loop and definition of done in `CLAUDE.md`, updating `docs/PROGRESS.md` after each item.
