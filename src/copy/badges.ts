// Badge names and one-line descriptions (F8.5, COPY.md "Badges"). Descriptions that carry a
// number take the real one, in whole minutes.
export const badges = {
  "first-in": { name: "First In", description: () => "Got there before everyone." },
  "fashionably-late": {
    name: "Fashionably Late",
    description: (minutesLate: number) => `Walked in ${minutesLate} min after the start.`,
  },
  "on-the-dot": { name: "On the Dot", description: () => "Arrived within 2 min of the start." },
  "long-haul": {
    name: "Long Haul",
    description: (rideMinutes: number) => `Longest ride of the night: ${rideMinutes} min.`,
  },
  "closest-call": {
    name: "Closest Call",
    description: (minutesToSpare: number) =>
      minutesToSpare < 1
        ? "Made the last train with under 1 min to spare."
        : `Made the last train with ${minutesToSpare} min to spare.`,
  },
  "night-owl": { name: "Night Owl", description: () => "Still out after midnight." },
  ghost: { name: "Ghost", description: () => "Said yes. Never showed." },
  planner: { name: "Planner", description: () => "Got everyone in one place." },
  "first-light": {
    name: "First Light",
    description: (neighborhood: string) => `Squad's first to uncover half of ${neighborhood}.`,
  },
  "all-four-lines": {
    name: "All Four Lines",
    description: () => "Rode the Red, Orange, Blue and Green.",
  },
  "fifty-stations": { name: "50 Stations", description: () => "50 stations down." },
  "every-green-branch": {
    name: "Every Green Branch",
    description: () => "B, C, D and E. All of them.",
  },
} as const;
