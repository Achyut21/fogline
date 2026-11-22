// The night recap's share image (F9.3).
export const recap = {
  brand: "Fogline",
  places: ["1st", "2nd", "Last"],
  dateLine: (date: string, spot: string | null) => (spot === null ? date : `${date} · ${spot}`),
  adultsSpot: "21+ spot",
  noArrivals: "Nobody checked in at the spot.",
  miles: (miles: number) => miles.toFixed(1),
  mi: "mi",
  about: "about",
  onT: "on the T",
  walked: "walked",
  stops: (n: number) => (n === 1 ? "stop" : "stops"),
  cells: (n: number) => (n === 1 ? "cell uncovered" : "cells uncovered"),
  count: (n: number) => n.toLocaleString("en-US"),
  badgesHeading: "Badges",
  award: (badge: string, name: string) => `${badge} · ${name}`,
  more: (n: number) => `+${n} more`,
} as const;
