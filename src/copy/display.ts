// Strings for the display components in src/components/display (Phase 1 item 6). Line names follow
// COPY.md: the full name for screen readers, the color or branch letter on the badge.
export const display = {
  lines: {
    Red: { short: "Red", name: "Red Line" },
    Orange: { short: "Orange", name: "Orange Line" },
    Blue: { short: "Blue", name: "Blue Line" },
    Green: { short: "Green", name: "Green Line" },
    "Green-B": { short: "B", name: "Green Line B" },
    "Green-C": { short: "C", name: "Green Line C" },
    "Green-D": { short: "D", name: "Green Line D" },
    "Green-E": { short: "E", name: "Green Line E" },
    Mattapan: { short: "Mattapan", name: "Mattapan Trolley" },
  },
  minutes: "min",
  percent: "%",
  leaveBy: "Leave by",
  badgeLocked: (name: string) => `${name}, locked`,
  more: (count: number) => `+${count}`,
  people: (names: readonly string[]) => {
    const last = names.slice(-1).join("");
    const rest = names.slice(0, -1).join(", ");
    return rest ? `${rest} and ${last}` : last;
  },
} as const;
