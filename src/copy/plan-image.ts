// The link preview for a plan's invite link (F4.8): title, time, spot and number of people.
export const planImage = {
  brand: "Fogline",
  /** A 21+ plan's title can name its venue, so a preview that can't check age shows this. */
  hiddenTitle: "A 21+ night out",
  hiddenSpot: "21+ spot",
  moreStops: (n: number) => (n === 1 ? "+1 more stop" : `+${n} more stops`),
  /** Every seat that hasn't said no, answered or not, so it doesn't claim they're all going. */
  people: (n: number) => (n === 1 ? "1 person" : `${n} people`),
} as const;
