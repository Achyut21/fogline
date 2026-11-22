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
  // The station sheet (F2.5), worded as on the canvas station artboard.
  sheet: {
    home: "Your home station",
    fromHome: (minutes: number) => `${minutes} min by T from home`,
    trains: "Next trains",
    loading: "Loading train times",
    minutes: (minutes: number) => (minutes < 1 ? "Now" : `${minutes} min`),
    direction: (route: string, direction: 0 | 1) => {
      if (route === "Red" || route === "Orange")
        return direction === 0 ? "Southbound" : "Northbound";
      if (route === "Mattapan") return direction === 0 ? "Outbound" : "Inbound";
      return direction === 0 ? "Westbound" : "Eastbound";
    },
    empty: {
      title: "No trains listed",
      body: "The MBTA feed lists no departures from here. Late at night, service may be over.",
    },
    error: {
      title: "Train times didn't load",
      body: "The MBTA feed isn't answering. Nearby spots still show below.",
    },
    offline: "You're offline. Train times come back when you reconnect.",
    offlineCached: "You're offline. These are the last times you loaded.",
    agedOut: (minutes: number) =>
      `Train data is ${minutes} min old. The MBTA feed isn't answering.`,
    card: "Stop card",
    source: (title: string) => `Based on Wikipedia: ${title}, CC BY-SA`,
    nearby: "Nearby",
    walk: (meters: number) => `about ${Math.max(1, Math.round(meters / 80))} min walk`,
    grade: (letter: string) => `Grade ${letter}`,
    category: {
      food: "Food",
      coffee: "Coffee",
      dessert: "Dessert",
      bar: "Bar",
      club: "Club",
      culture: "Culture",
      park: "Park",
    },
    noSpots: (meters: number) => `No spots within about ${(meters / 1609.344).toFixed(1)} mi.`,
    meta: (parts: readonly string[]) => parts.join(" · "),
    close: "Close",
  },
} as const;
