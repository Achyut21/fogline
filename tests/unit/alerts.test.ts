import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { alertsOnRoute, parseAlerts } from "@/lib/alerts";
import type { LastTrainLeg } from "@/lib/lasttrain/search";
import { passes } from "@/server/alerts";
import { data } from "@/server/data";

// Three alerts recorded from Alerts_enhanced.json on 2026-11-22: Symphony's E Branch station
// closure (severe), an escalator closure and an info notice.
const recorded: unknown = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "../fixtures/mbta/alerts.json"), "utf8"),
);
const parents = new Map(data.stations().flatMap((s) => s.stops.map((c) => [c, s.id] as const)));
const parentOf = (stop: string) => parents.get(stop) ?? stop;
const tonight = new Date("2026-11-27T23:30:00-05:00");

const ride = (route: string, from: string, to: string): LastTrainLeg => ({
  kind: "ride",
  trip: "t",
  route,
  from,
  to,
  departs: 0,
  arrives: 0,
});

describe("MBTA alerts on the route home", () => {
  const alerts = parseAlerts(recorded, parentOf);

  it("[F5.6] keeps disruptions and drops accessibility and info notices", () => {
    expect(alerts).toHaveLength(1);
    expect(alerts[0].text).toMatch(/Symphony station is closed/);
    expect(alerts[0].stations.get("Green-E")).toEqual(new Set(["place-symcl"]));
  });

  it("[F5.6] shows the text when the trip boards or leaves at a named station", () => {
    const legs = [ride("Green-E", "place-symcl", "place-pktrm")];
    expect(alertsOnRoute(alerts, legs, tonight, () => [])).toEqual({
      kind: "disrupted",
      texts: [alerts[0].text],
    });
  });

  it("[F5.6] says check MBTA alerts only when the train passes a named station", () => {
    const legs = [ride("Green-E", "place-pktrm", "place-hsmnl")];
    const through = () => ["place-coecl", "place-symcl", "place-nuniv"];
    const short = () => ["place-boyls", "place-armnl"];
    expect(alertsOnRoute(alerts, legs, tonight, through)).toEqual({ kind: "check" });
    expect(alertsOnRoute(alerts, legs, tonight, short)).toEqual({ kind: "clear" });
    expect(alertsOnRoute(alerts, legs, tonight, () => null)).toEqual({ kind: "check" });
    expect(
      alertsOnRoute(alerts, [ride("Red", "place-harsq", "place-pktrm")], tonight, () => []),
    ).toEqual({ kind: "clear" });
  });

  it("[F5.6] reads the stations a recorded trip passes from the timetable", () => {
    const trip = data.timetable().trips.find((t) => t.route === "Green-E" && t.direction === 0);
    if (!trip) throw new Error("no outbound E trip");
    const tt = data.timetable();
    const stations = tt.patterns[trip.pattern].map((i) => tt.stations[i]);
    const between = passes({ trip: trip.id, from: stations[0], to: stations[3] });
    expect(between).toEqual(stations.slice(1, 3));
    expect(passes({ trip: "no-such-trip", from: stations[0], to: stations[3] })).toBeNull();
  });

  it("[F5.6] counts a line-wide alert only while it's active", () => {
    const lineWide = parseAlerts(
      {
        entity: [
          {
            id: "shuttle",
            alert: {
              effect: "DETOUR",
              effect_detail: "SHUTTLE",
              severity: 7,
              active_period: [{ start: 1_795_000_000, end: 1_795_100_000 }],
              informed_entity: [{ route_id: "Red" }],
              header_text: { translation: [{ text: "Red Line shuttle buses.", language: "en" }] },
            },
          },
        ],
      },
      parentOf,
    );
    const legs = [ride("Red", "place-harsq", "place-pktrm")];
    expect(alertsOnRoute(lineWide, legs, new Date(1_795_050_000_000), () => []).kind).toBe(
      "disrupted",
    );
    expect(alertsOnRoute(lineWide, legs, new Date(1_795_200_000_000), () => []).kind).toBe("clear");
  });

  it("[F5.6] treats an alert with no active period as always active", () => {
    const always = parseAlerts(
      {
        entity: [
          {
            id: "open-ended",
            alert: {
              effect: "REDUCED_SERVICE",
              severity: 7,
              active_period: [],
              informed_entity: [{ route_id: "Orange" }],
              header_text: { translation: [{ text: "Orange Line delays." }] },
            },
          },
        ],
      },
      parentOf,
    );
    const legs = [ride("Orange", "place-dwnxg", "place-forhl")];
    expect(alertsOnRoute(always, legs, tonight, () => []).kind).toBe("disrupted");
  });
});
