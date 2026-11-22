import { readFileSync } from "node:fs";
import { z } from "zod";
import { log } from "@/lib/log";
import { timetableSchema } from "@/lib/gtfs/types";
import { lastTrain } from "@/lib/lasttrain/search";
import { toServiceTime } from "@/lib/time";

// The Phase 2 gate's check of DATA 3.3: the last-train search on the committed timetable against
// the MBTA's published schedule (V3 API, no key) for known last trains. Pass a service date
// (YYYY-MM-DD); without one it uses the first Monday the timetable covers.

type Known = { route: string; stop: string; direction: 0 | 1; headsign: string; home: string };

const known: Known[] = [
  {
    route: "Green-E",
    stop: "place-pktrm",
    direction: 1,
    headsign: "Medford/Tufts",
    home: "place-mdftf",
  },
  { route: "Red", stop: "place-harsq", direction: 0, headsign: "Ashmont", home: "place-asmnl" },
  {
    route: "Orange",
    stop: "place-dwnxg",
    direction: 0,
    headsign: "Forest Hills",
    home: "place-forhl",
  },
];

const scheduleSchema = z.object({
  data: z.array(
    z.object({
      attributes: z.object({ departure_time: z.iso.datetime({ offset: true }).nullable() }),
      relationships: z.object({ trip: z.object({ data: z.object({ id: z.string() }) }) }),
    }),
  ),
  included: z
    .array(z.object({ id: z.string(), attributes: z.object({ headsign: z.string() }) }))
    .default([]),
});

const timetable = timetableSchema.parse(JSON.parse(readFileSync("data/timetable.json", "utf8")));
const firstMonday = Object.keys(timetable.dates)
  .sort()
  .find((d) => new Date(`${d}T12:00:00Z`).getUTCDay() === 1);
const date = process.argv[2] ?? firstMonday;
if (!date) throw new Error("The timetable covers no Monday; pass a service date");

let failures = 0;
for (const train of known) {
  const url = new URL("https://api-v3.mbta.com/schedules");
  url.searchParams.set("filter[route]", train.route);
  url.searchParams.set("filter[stop]", train.stop);
  url.searchParams.set("filter[direction_id]", String(train.direction));
  url.searchParams.set("filter[date]", date);
  url.searchParams.set("sort", "-departure_time");
  url.searchParams.set("page[limit]", "10");
  url.searchParams.set("include", "trip");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`MBTA schedules failed: ${response.status} for ${train.route}`);
  const schedule = scheduleSchema.parse(await response.json());
  const headsigns = new Map(schedule.included.map((t) => [t.id, t.attributes.headsign]));
  const last = schedule.data.find(
    (s) =>
      s.attributes.departure_time && headsigns.get(s.relationships.trip.data.id) === train.headsign,
  )?.attributes.departure_time;
  if (!last) throw new Error(`The MBTA lists no ${train.route} to ${train.headsign} on ${date}`);

  const published = toServiceTime(new Date(last));
  const found = lastTrain(timetable, train.stop, train.home, date);
  const searched = found.kind === "train" ? found.firstTrain : null;
  const matches = published.serviceDate === date && searched === published.seconds;
  if (!matches) failures += 1;
  log.info("known last train", {
    route: train.route,
    from: train.stop,
    home: train.home,
    date,
    published: last,
    publishedSeconds: published.seconds,
    searchedSeconds: searched,
    matches,
  });
}

if (failures > 0) {
  log.warn("known last trains that don't match", { failures });
  process.exitCode = 1;
}
