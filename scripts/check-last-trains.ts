import { readFileSync } from "node:fs";
import { z } from "zod";
import { log } from "@/lib/log";
import { timetableSchema } from "@/lib/gtfs/types";
import { lastTrain } from "@/lib/lasttrain/search";
import { toServiceTime } from "@/lib/time";

// The Phase 2 gate's check of DATA 3.3: the last-train search on the committed timetable against
// the MBTA's published schedule (V3 API, no key) for known last trains.

type Known = { route: string; stop: string; direction: 0 | 1; home: string };

const known: Known[] = [
  { route: "Green-E", stop: "place-pktrm", direction: 1, home: "place-mdftf" },
  { route: "Red", stop: "place-harsq", direction: 0, home: "place-asmnl" },
  { route: "Orange", stop: "place-dwnxg", direction: 0, home: "place-forhl" },
];

const scheduleSchema = z.object({
  data: z.array(
    z.object({ attributes: z.object({ departure_time: z.iso.datetime({ offset: true }) }) }),
  ),
});

const date = process.argv[2] ?? "2026-11-23";
const timetable = timetableSchema.parse(JSON.parse(readFileSync("data/timetable.json", "utf8")));

let failures = 0;
for (const train of known) {
  const url = new URL("https://api-v3.mbta.com/schedules");
  url.searchParams.set("filter[route]", train.route);
  url.searchParams.set("filter[stop]", train.stop);
  url.searchParams.set("filter[direction_id]", String(train.direction));
  url.searchParams.set("filter[date]", date);
  url.searchParams.set("sort", "-departure_time");
  url.searchParams.set("page[limit]", "1");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`MBTA schedules failed: ${response.status} for ${train.route}`);
  const [last] = scheduleSchema.parse(await response.json()).data;
  if (!last)
    throw new Error(`The MBTA lists no ${train.route} departures from ${train.stop} on ${date}`);

  const published = toServiceTime(new Date(last.attributes.departure_time));
  const found = lastTrain(timetable, train.stop, train.home, date);
  const searched = found.kind === "train" ? found.departs : null;
  const matches = published.serviceDate === date && searched === published.seconds;
  if (!matches) failures += 1;
  log.info("known last train", {
    route: train.route,
    from: train.stop,
    home: train.home,
    date,
    published: last.attributes.departure_time,
    publishedSeconds: published.seconds,
    searchedSeconds: searched,
    matches,
  });
}

if (failures > 0) {
  log.warn("known last trains that don't match", { failures });
  process.exitCode = 1;
}
