import { legal } from "./legal";

// The How it works page (F15.1). Credits follow DATA.md section 1 and COPY.md's legal lines.
export const howItWorks = {
  title: "How it works",
  intro:
    "Fogline runs on live MBTA data and a TimescaleDB database. These numbers update every minute.",
  liveHeading: "Live from the database",
  rows: {
    vehicle_positions: "Train positions recorded",
    checkins: "Check-ins",
    ride_events: "Ride events",
    noise_readings: "Noise readings",
  },
  compression: "Compression",
  compressionNone: "No compressed data yet",
  ratio: (ratio: number) => `${ratio.toFixed(1)}× smaller`,
  lastRun: "Last train recorded",
  lastRunNone: "No trains recorded yet",
  solver: "Fair meetup solver",
  solverNone: "Test plan found no spots",
  milliseconds: (ms: number) => `${ms.toLocaleString("en-US")} ms`,
  solverNote: "BU, Harvard and Tufts, next Friday at 7:00 PM.",
  sourcesHeading: "Data sources",
  sources: [
    {
      name: "MBTA schedules and live trains",
      credit: legal.mbta,
      url: "https://www.mbta.com/developers",
    },
    {
      name: "Food inspections and neighborhood boundaries",
      credit: "City of Boston",
      url: "https://data.boston.gov/",
    },
    {
      name: "Places near stations",
      credit: "© OpenStreetMap contributors",
      url: "https://www.openstreetmap.org/copyright",
    },
    {
      name: "Stop card facts and photos",
      credit: "Text: Wikipedia, CC BY-SA. Photos credited on each card.",
      url: "https://www.wikipedia.org/",
    },
    {
      name: "Map tiles",
      credit: legal.mapData,
      url: "https://openfreemap.org/",
    },
    {
      name: "Cambridge, Somerville and Brookline boundaries",
      credit: "US Census Bureau",
      url: "https://tigerweb.geo.census.gov/",
    },
    {
      name: "Words on stop cards",
      credit: "Written by Gemini from Wikipedia",
      url: "https://ai.google.dev/",
    },
    {
      name: "Puzzle events",
      credit: "Checked by hand, linked on each puzzle",
      url: "https://www.boston.gov/calendar",
    },
    {
      name: "Puzzle word list",
      credit: "dwyl/english-words, The Unlicense",
      url: "https://github.com/dwyl/english-words",
    },
  ],
} as const;
