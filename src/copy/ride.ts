import { zone } from "@/lib/time";

// Ride mode (F3), worded as on the canvas ride artboard (direction C).

const clockFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: zone,
  hour: "numeric",
  minute: "2-digit",
});

/** "7:12 PM" in New York time, with a no-break space before AM or PM (COPY.md). */
const clock = (at: Date) => clockFormat.format(at).replace(/\s/g, " ");

const minutes = (n: number) => `${n} min`;

export const ride = {
  pageTitle: "Ride",
  back: "Back to map",
  startFrom: "Ride from here",
  mapButton: "Ride",
  list: {
    title: (station: string) => `Trips from ${station}`,
    body: "Replay a real train the MBTA tracked in the last 24 hours. Each stop clears the fog around it.",
    trip: (destination: string) => `To ${destination}`,
    detail: (boardedAt: Date, stops: number, total: number) =>
      `Left ${clock(boardedAt)} · ${stops} stops · ${minutes(total)}`,
    empty: {
      title: "No recorded trips here yet",
      body: "The recorder keeps the last 24 hours of trains. Try a busier station, or come back after the next train passes.",
    },
  },
  replay: {
    label: "Replay",
    heading: (destination: string) => `To ${destination}`,
    next: (station: string, mins: number) => `Next: ${station} · ${minutes(mins)}`,
    arrived: "Last stop",
    speed: "Replay speed",
    speedOption: (times: number) => `${times}×`,
    end: "End",
    stops: "Stops",
    passed: "Passed",
    here: "Here",
  },
  summary: {
    title: "Ride summary",
    stops: "stops passed",
    miles: "on the T",
    milesSuffix: " mi",
    minutes: "minutes",
    lines: (n: number) => (n === 1 ? "line" : "lines"),
    cells: "new cells",
    replayNote: "Replays clear fog but earn no badges.",
    done: "Back to map",
  },
  notFound: {
    title: "This trip isn't recorded anymore",
    body: "Recorded trips last 24 hours. Pick another one.",
  },
} as const;
