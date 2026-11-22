import { readFileSync } from "node:fs";
import { log } from "@/lib/log";
import { graphSchema } from "@/lib/gtfs/types";
import { travelTime } from "@/lib/solver/travel";
import type { DayType } from "@/lib/time";
import { activeServices, defaultTransferSeconds, tripStops, type TripStop } from "./gtfs/build";
import { fetchFeed } from "./gtfs/feed";

// The Phase 2 gate's check of DATA 3.1: the model's expected time for known trips against a
// replay of the raw timetable. A rider arrives at each minute of the hour and catches the actual
// next trains along the trip's usual path, with transfers.txt times between platforms.

type Known = { from: string; via: string[]; to: string; dayType: DayType; hour: number };

const known: Known[] = [
  { from: "place-harsq", via: [], to: "place-pktrm", dayType: "weekday", hour: 18 },
  { from: "place-kencl", via: [], to: "place-gover", dayType: "weekday", hour: 18 },
  { from: "place-mdftf", via: [], to: "place-pktrm", dayType: "weekday", hour: 18 },
  { from: "place-harsq", via: ["place-pktrm"], to: "place-kencl", dayType: "weekday", hour: 19 },
  { from: "place-wondl", via: ["place-state"], to: "place-dwnxg", dayType: "saturday", hour: 20 },
  { from: "place-sull", via: ["place-north"], to: "place-lech", dayType: "weekday", hour: 18 },
  { from: "place-shmnl", via: ["place-jfk"], to: "place-nqncy", dayType: "weekday", hour: 18 },
];
const toleranceSeconds = 180;

const graph = graphSchema.parse(JSON.parse(readFileSync("data/graph.json", "utf8")));
const feed = await fetchFeed();
if (feed.version !== graph.feedVersion) {
  throw new Error(
    `data/graph.json is from "${graph.feedVersion}", not "${feed.version}". Run pnpm data:gtfs.`,
  );
}

const stopsByTrip = tripStops(feed);
const transferTime = new Map(feed.transfers.map((t) => [`${t.from}>${t.to}`, t.seconds]));

/** The earliest arrival at `to` on one train from `from`, boarding no earlier than `ready(stop)`. */
function nextArrival(
  trips: TripStop[][],
  from: string,
  to: string,
  ready: (stop: string) => number,
) {
  let best: { arrival: number; stop: string } | undefined;
  for (const seq of trips) {
    const i = seq.findIndex((s) => s.station === from && !s.noPickup);
    if (i === -1 || seq[i].departure < ready(seq[i].stop)) continue;
    const alight = seq.slice(i + 1).find((s) => s.station === to && !s.noDropOff);
    if (alight && (!best || alight.arrival < best.arrival)) {
      best = { arrival: alight.arrival, stop: alight.stop };
    }
  }
  return best;
}

let failures = 0;
for (const trip of known) {
  const date = graph.dates[trip.dayType];
  const active = activeServices(feed, date);
  const trips = feed.trips
    .filter((t) => active.has(t.service))
    .map((t) => stopsByTrip.get(t.id) ?? []);
  const path = [trip.from, ...trip.via, trip.to];

  const totals: number[] = [];
  for (let minute = 0; minute < 60; minute++) {
    const start = trip.hour * 3600 + minute * 60;
    let at: { arrival: number; stop: string } | undefined = { arrival: start, stop: "" };
    for (let leg = 0; leg < path.length - 1 && at; leg++) {
      const previous: { arrival: number; stop: string } = at;
      at = nextArrival(trips, path[leg], path[leg + 1], (stop) =>
        leg === 0
          ? start
          : previous.arrival +
            (transferTime.get(`${previous.stop}>${stop}`) ?? defaultTransferSeconds),
      );
    }
    if (!at) throw new Error(`No train replays ${path.join(" > ")} at ${start} s on ${date}`);
    totals.push(at.arrival - start);
  }

  const replay = totals.reduce((sum, t) => sum + t, 0) / totals.length;
  const model = travelTime(graph, trip.from, trip.to, trip.dayType, trip.hour);
  if (!model) throw new Error(`The model finds no trip ${trip.from} > ${trip.to}`);
  const difference = model.seconds - replay;
  if (Math.abs(difference) > toleranceSeconds) failures += 1;
  log.info("known trip", {
    trip: path.join(" > "),
    date,
    hour: trip.hour,
    modelMinutes: Math.round(model.seconds / 6) / 10,
    replayMinutes: Math.round(replay / 6) / 10,
    differenceMinutes: Math.round(difference / 6) / 10,
    modelPath: model.steps.map((s) => `${s.kind} ${s.from}>${s.to}`).join(", "),
  });
}

if (failures > 0) {
  log.warn("known trips outside 3 minutes", { failures });
  process.exitCode = 1;
}
