---
description: Write a handoff note into PROGRESS.md before ending a Fogline session.
---

Write a handoff entry at the top of the Log in `docs/PROGRESS.md`, then update the Now / Next / Blocked board.

The entry covers:
- **Finished:** items completed this session, with commit hashes and PR links.
- **In progress:** branch name, files touched, the exact next step, and anything half-done that must not be merged yet.
- **Blocked:** what is blocked, why, and the options.
- **For the other builder:** shared files you changed, new environment variables (names only, never values), migrations to run, new scripts, data files regenerated, design tokens changed.
- **Tests:** what passes, what fails, what is not written yet.

Then commit the docs change on your branch and push the branch.
