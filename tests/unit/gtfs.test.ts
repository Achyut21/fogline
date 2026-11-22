import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { strToU8, zipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { haversineM } from "@/lib/geo/distance";
import type { Graph } from "@/lib/gtfs/types";
import { travelTime } from "@/lib/solver/travel";
import {
  activeServices,
  buildGraph,
  buildShapes,
  buildStations,
  buildTimetable,
  expectedWait,
  representativeDates,
} from "../../scripts/gtfs/build";
import { isoDate, readFeed, type Feed } from "../../scripts/gtfs/feed";

const fixtureDir = path.join(import.meta.dirname, "../fixtures/gtfs");
const bucket18 = 13;
const lateBucket = 19;

function fixtureZip(replace: Record<string, string> = {}): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  for (const name of readdirSync(fixtureDir)) {
    files[name] = strToU8(replace[name] ?? readFileSync(path.join(fixtureDir, name), "utf8"));
  }
  return zipSync(files);
}

describe("GTFS pipeline", () => {
  let feed: Feed;
  let graph: Graph;

  beforeAll(async () => {
    feed = await readFeed(fixtureZip());
    graph = buildGraph(feed, buildStations(feed));
  });

  const legOf = (from: string, to: string, dayType: "weekday" | "saturday" = "weekday") => {
    const leg = graph.legs[dayType].find(
      (l) => graph.stations[l.from] === from && graph.stations[l.to] === to,
    );
    if (!leg) throw new Error(`no leg ${from} > ${to}`);
    return leg;
  };

  describe("readFeed", () => {
    it("keeps only subway routes (types 0 and 1), their trips and their stop times", () => {
      expect(feed.routes).toEqual(["Green-B", "Green-C", "Mattapan", "Red"]);
      expect(feed.trips.map((t) => t.id)).not.toContain("X1");
      expect(feed.trips).toHaveLength(30);
      expect(feed.stopTimes.some((st) => st.trip === "X1")).toBe(false);
    });

    it("reads quoted fields, GTFS dates and only timed transfers", () => {
      expect(feed.version).toBe("Fixture, 2026-11-15, version A");
      expect([feed.start, feed.end]).toEqual(["2026-11-16", "2026-12-06"]);
      expect(feed.transfers).toHaveLength(8);
      expect(feed.shapes.has("bus-1")).toBe(false);
    });

    it("names the column when the feed lacks one", async () => {
      const trips = readFileSync(path.join(fixtureDir, "trips.txt"), "utf8").replace(
        ",route_pattern_id",
        ",pattern",
      );
      await expect(readFeed(fixtureZip({ "trips.txt": trips }))).rejects.toThrow(
        'GTFS column "route_pattern_id" is missing',
      );
    });

    it("rejects dates that aren't YYYYMMDD", () => {
      expect(isoDate("20261126")).toBe("2026-11-26");
      expect(() => isoDate("2026-11-26")).toThrow('Not a GTFS date: "2026-11-26"');
    });
  });

  describe("services and dates", () => {
    it("[F5.1] applies calendar_dates: Thanksgiving runs Sunday service instead of weekday", () => {
      expect([...activeServices(feed, "2026-11-25")]).toEqual(["WKD"]);
      expect([...activeServices(feed, "2026-11-26")]).toEqual(["SUN"]);
      expect([...activeServices(feed, "2026-11-28")]).toEqual(["SAT"]);
      expect([...activeServices(feed, "2026-11-16")]).toEqual(["DIV"]);
    });

    it("[F4.2] picks each day type's most common service set, so a diversion or holiday never sets typical times", () => {
      expect(representativeDates(feed)).toEqual({
        weekday: "2026-11-17",
        saturday: "2026-11-28",
        sunday: "2026-11-22",
      });
    });
  });

  describe("stations", () => {
    it("groups child stops under their parent station with every route that stops there", () => {
      const stations = buildStations(feed);
      expect(stations.map((s) => s.id)).toEqual([
        "place-asmnl",
        "place-boyls",
        "place-bucen",
        "place-dwnxg",
        "place-harsq",
        "place-kencl",
        "place-matt",
        "place-pktrm",
        "place-smary",
      ]);
      expect(stations.find((s) => s.id === "place-pktrm")).toEqual({
        id: "place-pktrm",
        name: "Park Street",
        lat: 42.356395,
        lon: -71.062424,
        routes: ["Green-B", "Green-C", "Red"],
        stops: ["70075", "70196", "70197"],
      });
    });
  });

  describe("graph", () => {
    it("[F4.2] times a ride by its median and its wait from the gaps between departures", () => {
      const leg = legOf("place-harsq", "place-pktrm");
      expect(leg.ride[bucket18]).toBe(540);
      expect(leg.wait[bucket18]).toBe(180);
      expect(graph.routeSets[leg.routes[bucket18] ?? -1]).toEqual(["Red"]);
      expect(leg.ride[bucket18 + 2]).toBeNull();
    });

    it("[F4.2] skips stops where riders can't board", () => {
      expect(legOf("place-harsq", "place-pktrm").wait[bucket18 + 1]).toBe(900);
      expect(legOf("place-pktrm", "place-dwnxg").ride[bucket18 + 1]).toBeNull();
    });

    it("leaves the never-running canonical trips out of travel times and the timetable", () => {
      const timetable = buildTimetable(feed, buildStations(feed));
      expect(timetable.trips.some((t) => t.id.startsWith("canonical-"))).toBe(false);
      expect(timetable.trips).toHaveLength(26);
      expect(legOf("place-harsq", "place-pktrm").ride[0]).toBeNull();
    });

    it("[F4.2] lets riders on a shared trunk take the first train of any branch", () => {
      const trunk = legOf("place-pktrm", "place-kencl");
      expect(trunk.wait[bucket18]).toBe(150);
      expect(trunk.ride[bucket18]).toBe(720);
      expect(graph.routeSets[trunk.routes[bucket18] ?? -1]).toEqual(["Green-B", "Green-C"]);
      expect(legOf("place-pktrm", "place-bucen").wait[bucket18]).toBe(300);
    });

    it("[F4.2] skips stops where riders can't get off", () => {
      const toPark = legOf("place-harsq", "place-pktrm");
      const toDowntown = legOf("place-harsq", "place-dwnxg");
      expect(toPark.wait[bucket18]).toBe(180);
      expect(toDowntown.wait[bucket18]).toBe(expectedWait([360, 360, 360, 360, 360, 360, 600]));
    });

    it("[F5.1] puts trips past 24:00:00 in the late bucket, counting a lone late train as hourly", () => {
      const leg = legOf("place-harsq", "place-pktrm");
      expect(leg.ride[lateBucket]).toBe(540);
      expect(leg.wait[lateBucket]).toBe(1800);
    });

    it("builds Saturday times from Saturday trips", () => {
      const leg = legOf("place-harsq", "place-pktrm", "saturday");
      expect(leg.wait[bucket18]).toBe(360);
      expect(graph.legs.sunday.length).toBeGreaterThan(0);
    });

    it("takes subway-to-subway transfer times from transfers.txt, with 3 minutes when a station has none, and walks only between lines", () => {
      const at = (id: string) => graph.transferSeconds[graph.stations.indexOf(id)];
      expect(at("place-pktrm")).toBe(250);
      expect(at("place-kencl")).toBe(180);
      expect(graph.walks).toEqual([
        {
          from: graph.stations.indexOf("place-dwnxg"),
          to: graph.stations.indexOf("place-pktrm"),
          seconds: 310,
        },
        {
          from: graph.stations.indexOf("place-pktrm"),
          to: graph.stations.indexOf("place-dwnxg"),
          seconds: 300,
        },
      ]);
    });

    it("weights the expected wait by how long each gap is", () => {
      expect(expectedWait([300, 300, 300])).toBe(150);
      expect(expectedWait([60, 540])).toBe(246);
      expect(expectedWait([0, 0])).toBe(0);
    });

    it("produces identical output on a second run", async () => {
      const again = await readFeed(fixtureZip());
      expect(JSON.stringify(buildGraph(again, buildStations(again)))).toBe(JSON.stringify(graph));
      expect(JSON.stringify(buildTimetable(again, buildStations(again)))).toBe(
        JSON.stringify(buildTimetable(feed, buildStations(feed))),
      );
    });
  });

  describe("travelTime", () => {
    it("[F4.2] adds waits, rides and the transfer time, and names lines and transfer stations", () => {
      const trip = travelTime(graph, "place-harsq", "place-kencl", "weekday", 18);
      expect(trip).toEqual({
        seconds: 180 + 540 + 250 + 150 + 720,
        transfers: ["place-pktrm"],
        steps: [
          {
            kind: "ride",
            from: "place-harsq",
            to: "place-pktrm",
            routes: ["Red"],
            waitSeconds: 180,
            rideSeconds: 540,
          },
          {
            kind: "ride",
            from: "place-pktrm",
            to: "place-kencl",
            routes: ["Green-B", "Green-C"],
            waitSeconds: 150,
            rideSeconds: 720,
          },
        ],
      });
    });

    it("[F4.2] walks between stations when that's faster than riding around", () => {
      const trip = travelTime(graph, "place-dwnxg", "place-kencl", "weekday", 18);
      expect(trip?.steps.map((s) => s.kind)).toEqual(["walk", "ride"]);
      expect(trip?.seconds).toBe(310 + 150 + 720);
      expect(trip?.transfers).toEqual([]);
    });

    it("[F4.2] is zero for the same station and null when no train runs", () => {
      expect(travelTime(graph, "place-harsq", "place-harsq", "weekday", 18)).toEqual({
        seconds: 0,
        steps: [],
        transfers: [],
      });
      expect(travelTime(graph, "place-harsq", "place-kencl", "weekday", 20)).toBeNull();
      expect(travelTime(graph, "place-harsq", "place-matt", "weekday", 18)).toBeNull();
      expect(travelTime(graph, "place-nowhere", "place-matt", "weekday", 18)).toBeNull();
    });

    it("refuses an hour bucket that doesn't exist", () => {
      for (const bucket of [1, 4, 24, 25, 18.5]) {
        expect(() => travelTime(graph, "place-harsq", "place-pktrm", "weekday", bucket)).toThrow(
          `Not an hour bucket: ${bucket}`,
        );
      }
    });

    it("[F4.2] uses late-night service after midnight", () => {
      expect(travelTime(graph, "place-harsq", "place-pktrm", "weekday", "late")?.seconds).toBe(
        1800 + 540,
      );
    });
  });

  describe("timetable", () => {
    it("[F5.1] keeps every trip with times past 24:00:00 and the services of each date", () => {
      const timetable = buildTimetable(feed, buildStations(feed));
      expect(timetable.services).toEqual(["DIV", "DIVS", "SAT", "SUN", "WKD"]);
      expect(timetable.dates["2026-11-26"]).toEqual([3]);
      expect(timetable.dates["2026-11-25"]).toEqual([4]);
      expect(timetable.dates["2026-11-16"]).toEqual([0]);
      expect(timetable.patterns).toHaveLength(5);
      const late = timetable.trips.find((t) => t.id === "R7");
      expect(late).toMatchObject({ route: "Red", start: 90_600, offsets: [0, 540, 600] });
      expect(timetable.patterns[late?.pattern ?? -1]?.map((i) => timetable.stations[i])).toEqual([
        "place-harsq",
        "place-pktrm",
        "place-dwnxg",
      ]);
      expect(timetable.trips.find((t) => t.id === "R8")?.noAlight).toEqual([1]);
      expect(timetable.trips.find((t) => t.id === "R9")?.noBoard).toEqual([1]);
      expect(late?.noAlight).toBeUndefined();
      expect(late?.noBoard).toBeUndefined();
    });
  });

  describe("shapes", () => {
    it("[F3.4] measures each station's distance along its canonical pattern's shape", () => {
      const shapes = buildShapes(feed);
      expect(shapes.map((s) => s.pattern)).toEqual([
        "Green-B-1-0",
        "Green-C-1-0",
        "Mattapan-1-0",
        "Red-1-0",
      ]);
      const red = shapes.find((s) => s.pattern === "Red-1-0");
      const harvard = { lat: 42.373362, lon: -71.118956 };
      const bend = { lat: 42.3651, lon: -71.1035 };
      const park = { lat: 42.356395, lon: -71.062424 };
      const downtown = { lat: 42.355518, lon: -71.060225 };
      const toPark = haversineM(harvard, bend) + haversineM(bend, park);
      expect(red?.stops).toEqual([
        { station: "place-harsq", meters: 0 },
        { station: "place-pktrm", meters: Math.round(toPark) },
        { station: "place-dwnxg", meters: Math.round(toPark + haversineM(park, downtown)) },
      ]);
      expect(red?.points).toHaveLength(4);
    });
  });
});
