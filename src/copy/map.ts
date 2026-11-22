// The map home (F2), worded as on the canvas map and first-reveal artboards.
const percent = (share: number) => {
  const value = share * 100;
  return value < 10 ? value.toFixed(1).replace(/\.0$/, "") : String(Math.round(value));
};

export const map = {
  pageTitle: "Map",
  percent,
  uncovered: (share: number) => `${percent(share)}%`,
  uncoveredLabel: "of Boston uncovered",
  view: { label: "View", map: "Map", list: "List" },
  label: (share: number) => `Map of Boston under fog. ${percent(share)}% of Boston uncovered.`,
  firstReveal: {
    title: "Your home station is clear.",
    body: "Ride the T to clear more. Every stop you pass clears the fog around it.",
    dismiss: "Got it",
  },
  list: {
    label: "Neighborhoods and stations",
    neighborhoods: "Neighborhoods",
    stations: "Stations",
    uncovered: "Uncovered",
    fog: "In fog",
    beyondNote: "Cambridge, Somerville and Brookline count as one region each.",
  },
} as const;
