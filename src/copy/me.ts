// Me: stats and badges (F8), and Settings (F1.7).

export const me = {
  stats: {
    title: "Your numbers",
    uncovered: "of Boston uncovered",
    miles: "miles on the T",
    stops: "stops passed",
    stations: (total: number) => `of ${total} stations`,
    lines: "lines ridden",
    nights: "nights out",
    percent: "%",
    milesSuffix: " mi",
    error: "Couldn't load your numbers. Pull to refresh or try again later.",
  },
  badges: {
    title: "Badges",
    empty: "No badges yet. Ride a few lines or go out with friends to earn some.",
    earned: (n: number) => (n === 1 ? "1 badge" : `${n} badges`),
  },
  settings: {
    open: "Settings",
    title: "Settings",
    theme: "Theme",
    map: "Map",
    mapOptions: { auto: "Automatic", flat: "Always 2D" },
    mapHelp: "Automatic shows 3D fog when your phone can. 2D saves battery and works on any phone.",
    age: "Age",
    ageOptions: { under21: "Under 21", "21plus": "21 or older" },
    ageHelp: "Plans for under-21 profiles never include bars or clubs. Nobody checks an ID.",
    ageSaved: "Saved.",
    delete: {
      title: "Delete my data",
      body: "This deletes your profile, map, rides, check-ins, noise readings, badges and puzzle results. Plans you're in stay for your friends and show you as a former member. It can't be undone.",
      start: "Delete my data",
      confirm: "Yes, delete everything",
      cancel: "Keep my data",
      deleting: "Deleting",
    },
  },
} as const;
