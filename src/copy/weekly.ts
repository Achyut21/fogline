// This week's suggested plans (F10.4, F10.6).
export const weekly = {
  titles: {
    "dinner-dessert": "Dinner and dessert",
    "coffee-museum": "Coffee and a museum",
    "brunch-park": "Brunch and a park walk",
  },
  dinnerBefore: (event: string) => `Dinner before ${event}`,
} as const;
