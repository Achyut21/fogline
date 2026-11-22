import { describe, expect, it } from "vitest";
import { departuresFrom, parseTrips, type Trip } from "@/lib/predictions";
import { stationById, stationOfStop } from "@/server/stations";
import feed from "../fixtures/mbta/trip-updates.json";

// A real TripUpdates snapshot, 2026-11-22 01:00 ET, cut to the trips through Kenmore plus one
// canceled Red Line trip.
const now = feed.header.timestamp;
const kenmore = stationById("place-kencl");

function kenmoreDepartures(trips = parseTrips(feed).trips, at = now) {
  if (!kenmore) throw new Error("Kenmore missing from data/stations.json");
  return departuresFrom(trips, kenmore.id, stationOfStop, at);
}

describe("predictions", () => {
  it("[F2.5] lists a station's next trains soonest first, three each way, with their end station", () => {
    expect(kenmoreDepartures()).toEqual([
      { route: "Green-D", direction: 0, destination: "place-river", departs: 1795327409 },
      { route: "Green-C", direction: 1, destination: "place-gover", departs: 1795327567 },
      { route: "Green-C", direction: 0, destination: "place-clmnl", departs: 1795327608 },
      { route: "Green-B", direction: 1, destination: "place-gover", departs: 1795327727 },
      { route: "Green-D", direction: 1, destination: "place-unsqu", departs: 1795327995 },
      { route: "Green-D", direction: 0, destination: "place-river", departs: 1795328191 },
    ]);
  });

  it("[F2.5] leaves out non-revenue trips, canceled trips and skipped stops", () => {
    const { trips } = parseTrips(feed);
    expect(trips.some((t) => t.route === "Red")).toBe(false);
    expect(trips).toHaveLength(10);
    const skipping = {
      ...feed,
      entity: feed.entity.map((e) => ({
        ...e,
        trip_update: {
          ...e.trip_update,
          stop_time_update: e.trip_update.stop_time_update.map((u) =>
            u.stop_id === "70151" ? { ...u, schedule_relationship: "SKIPPED" } : u,
          ),
        },
      })),
    };
    const left = kenmoreDepartures(parseTrips(skipping).trips);
    expect(left.length).toBeGreaterThan(0);
    expect(left.some((d) => ["Green-C", "Green-D"].includes(d.route) && d.direction === 0)).toBe(
      false,
    );
  });

  it("[F2.5] drops a train that already left and one that ends at the station", () => {
    const later = kenmoreDepartures(undefined, 1795327600);
    expect(later.map((d) => d.departs)).not.toContain(1795327409);
    expect(later.map((d) => d.departs)).not.toContain(1795327567);
    const ending = parseTrips(feed).trips.map((t) => ({
      ...t,
      stops: [...t.stops.filter((s) => s.stop !== "70151"), { stop: "70151", departs: null }],
    }));
    expect(kenmoreDepartures(ending).every((d) => d.direction === 1)).toBe(true);
  });

  it("[F2.5] skips an entity it can't read instead of failing the whole feed", () => {
    const broken = { ...feed, entity: [{ id: "x", trip_update: { trip: {} } }, ...feed.entity] };
    expect(parseTrips(broken).trips).toHaveLength(10);
  });

  it("[F2.5] counts the train waiting on a terminal track as leaving that station", () => {
    const waiting: Trip = {
      route: "Red",
      direction: 0,
      stops: [
        { stop: "Alewife-01", departs: now + 60 },
        { stop: "70075", departs: now + 1500 },
        { stop: "70094", departs: null },
      ],
    };
    expect(departuresFrom([waiting], "place-alfcl", stationOfStop, now)).toEqual([
      { route: "Red", direction: 0, destination: "place-asmnl", departs: now + 60 },
    ]);
  });

  it("[F2.5] keeps three trains for each line and direction at a station two lines share", () => {
    const green = [60, 120, 180].map((offset): Trip => ({
      route: "Green-D",
      direction: 0,
      stops: [
        { stop: "70196", departs: now + offset },
        { stop: "70161", departs: null },
      ],
    }));
    const red: Trip = {
      route: "Red",
      direction: 0,
      stops: [
        { stop: "70075", departs: now + 200 },
        { stop: "70094", departs: null },
      ],
    };
    const leaving = departuresFrom([...green, red], "place-pktrm", stationOfStop, now);
    expect(leaving.map((d) => d.route)).toEqual(["Green-D", "Green-D", "Green-D", "Red"]);
  });
});
