import { mkdir, writeFile } from "node:fs/promises";
import { log } from "@/lib/log";
import { buildGraph, buildShapes, buildStations, buildTimetable } from "./gtfs/build";
import { fetchFeed } from "./gtfs/feed";

const feed = await fetchFeed();

const stations = buildStations(feed);
const graph = buildGraph(feed, stations);
const timetable = buildTimetable(feed, stations);
const shapes = buildShapes(feed);

await mkdir("data", { recursive: true });
await writeFile("data/stations.json", `${JSON.stringify(stations, null, 2)}\n`);
await writeFile("data/graph.json", `${JSON.stringify(graph)}\n`);
await writeFile("data/timetable.json", `${JSON.stringify(timetable)}\n`);
await writeFile("data/shapes.json", `${JSON.stringify(shapes)}\n`);

log.info("data:gtfs wrote data/stations.json, graph.json, timetable.json and shapes.json", {
  feedVersion: feed.version,
  stations: stations.length,
  trips: timetable.trips.length,
  patterns: timetable.patterns.length,
  weekdayLegs: graph.legs.weekday.length,
  shapes: shapes.length,
  weekday: graph.dates.weekday,
  saturday: graph.dates.saturday,
  sunday: graph.dates.sunday,
});
