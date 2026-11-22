// This week's suggested plans (F10.4, F10.6). Titles are headings, so they stay under six words.
// A meal before an event names the venue when it's short; the event's own title isn't sent,
// since it can give away a coming day's puzzle word.
const shortVenue = (venue: string) => !venue.includes(",") && venue.split(/\s+/).length <= 3;

export const weekly = {
  titles: {
    "dinner-dessert": "Dinner, then dessert",
    "coffee-museum": "Coffee, then museum or show",
    "brunch-park": "Brunch, then a park walk",
  },
  meals: { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" },
  beforeEvent: (meal: string, venue: string) =>
    `${meal}, then ${shortVenue(venue) ? venue.replace(/^The /, "the ") : "the event"}`,
} as const;
