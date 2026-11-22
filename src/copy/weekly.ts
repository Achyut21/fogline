// This week's suggested plans (F10.4, F10.6). Titles stay short: the event's own name goes on
// its own line in the UI.
export const weekly = {
  titles: {
    "dinner-dessert": "Dinner, then dessert",
    "coffee-museum": "Coffee, then a museum or show",
    "brunch-park": "Brunch, then a park walk",
  },
  meals: { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" },
  beforeEvent: (meal: string, venue: string) => `${meal}, then ${venue}`,
} as const;
