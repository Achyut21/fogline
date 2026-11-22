// Find it and taste of home (F14).

export const find = {
  pageTitle: "Find food",
  title: "Find food",
  open: "Find a dish",
  photo: {
    title: "Find it",
    body: "Upload a photo of a dish. Fogline finds up to 3 spots in reach by T that serve it.",
    label: "Food photo",
    note: "The photo is used for this search only and isn't saved.",
    submit: "Find this dish",
  },
  home: {
    title: "Taste of home",
    body: "Name a place or a cuisine. Each spot shows what Google's review summary says.",
    label: "Place or cuisine",
    placeholder: "Sichuan, Lagos, Oaxaca",
    submit: "Search",
  },
  filters: { grade: "Food grade", budget: "Budget", any: "Any" },
  searching: "Searching Google Maps reviews. This can take a minute.",
  dish: (dish: string) => `Looks like ${dish}.`,
  results: "Spots",
  none: "No spots near the T matched. Try another dish or loosen the filters.",
  minutes: (n: number) => `${n} min by T from home`,
  walk: (meters: number) => `about ${Math.max(1, Math.round(meters / 80))} min walk`,
  review: "Google Maps review summary",
  mapLabel: (n: number) => `Map with ${n === 1 ? "1 spot" : `${n} spots`} pinned.`,
  errors: {
    "not-food": "That photo doesn't show food. Try another one.",
    "bad-image": "Use a JPEG, PNG, WebP or HEIC photo under 5 MB.",
    "no-profile": "Make a profile first.",
    unavailable: "Search isn't available right now. Try again later.",
    busy: "Too many searches this hour. Try again later.",
  },
} as const;
