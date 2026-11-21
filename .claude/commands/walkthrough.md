---
description: Walk through a Fogline feature in the running app and update its WALKTHROUGH.md entry with steps, screenshots and test IDs.
argument-hint: <feature id, e.g. F4>
---

Verify feature $ARGUMENTS end to end and document it.

1. Make sure the app is running (`pnpm dev`, or the Vercel preview URL for the branch).
2. Open the feature in the browser at 390×844. Follow every step listed for $ARGUMENTS in `docs/WALKTHROUGH.md`, then the edge cases listed there.
3. Take a screenshot at each key state. Save them to `docs/walkthrough/$ARGUMENTS/` with names like `01-entry.png`, `02-result.png`.
4. Update the $ARGUMENTS entry in `docs/WALKTHROUGH.md`:
   - the steps exactly as the app behaves now,
   - links to the screenshots,
   - the edge cases you checked and what happened,
   - the test names that cover it (criteria IDs),
   - `Status: Verified (<date>, Builder <A|B>)`.
5. If the app differs from `docs/PRD.md`, either fix the code or record the change in `docs/DECISIONS.md` and update the PRD. Do not leave them disagreeing.
