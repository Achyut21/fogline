// Squad (F12): friends who checked in together on an ended plan.

export const squad = {
  pageTitle: "Squad",
  title: "Your squad",
  back: "Me",
  open: "Squad",
  streakLabel: (weeks: number) =>
    weeks === 1 ? "week in a row with a night out" : "weeks in a row with a night out",
  cells: "cells uncovered together",
  members: "Members",
  you: (name: string) => `${name} (you)`,
  colorBy: "Show cells",
  everyone: "Everyone",
  mapLabel: (cells: number) =>
    `Map of Boston with ${cells.toLocaleString("en-US")} ${cells === 1 ? "cell" : "cells"} your squad uncovered.`,
  memberCells: (name: string, n: number) =>
    n === 1
      ? `${name} uncovered 1 cell first`
      : `${name} uncovered ${n.toLocaleString("en-US")} cells first`,
  empty: {
    title: "No squad yet",
    body: "Check in at a plan's spot with friends. Once the plan ends, you're a squad.",
    action: "Plan a night",
  },
} as const;
