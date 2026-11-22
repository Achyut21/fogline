import { describe, expect, it } from "vitest";
import { buildCrawls, minutesByT, ridesFor, type CrawlRequest } from "@/lib/crawl";
import { walkM, walkMinutes } from "@/lib/geo/distance";
import { boardingSpans } from "@/lib/gtfs/service";
import { leaveByFor } from "@/lib/lasttrain/leave-by";
import { openAt } from "@/lib/places/hours";
import type { PlaceCategory } from "@/lib/places/types";
import { rankStations, spotsNear, type SpotFilters } from "@/lib/solver/fair";
import { crawlInput, planCrawl, type CrawlInput } from "@/server/crawl";
import { data } from "@/server/data";

const stations = new Map(data.stations().map((s) => [s.id, s]));
const person = (id: string, station: string) => {
  const home = stations.get(station);
  if (!home) throw new Error(`no station ${station}`);
  return { id, station, home };
};
const people = [person("priya", "place-bucen"), person("sam", "place-harsq")];
const filters = (category: PlaceCategory, more: Partial<SpotFilters> = {}): SpotFilters => ({
  categories: [category],
  budget: null,
  minGrade: null,
  under21: true,
  ...more,
});
const friday7pm = new Date("2026-11-27T19:00:00-05:00");
const request = (more: Partial<CrawlRequest> = {}): CrawlRequest => ({
  participants: people,
  startsAt: friday7pm,
  stops: [filters("food"), filters("dessert")],
  stayMinutes: 60,
  ...more,
});
const crawl = (more: Partial<CrawlRequest> = {}) => {
  const result = buildCrawls(data.graph(), data.timetable(), data.places(), request(more));
  if (result.kind !== "options") throw new Error(`expected crawls, got ${result.blockedBy}`);
  return result.crawls;
};

describe("crawl builder", () => {
  it("[F10.1] chains 2–4 stops, each within 10 minutes and open at its time or flagged", () => {
    for (const count of [2, 3, 4]) {
      const stops = [filters("food"), filters("dessert"), filters("coffee"), filters("culture")];
      const crawls = crawl({
        stops: stops.slice(0, count),
        startsAt: new Date("2026-11-28T13:00:00-05:00"),
      });
      for (const { stops: chain } of crawls) {
        expect(chain).toHaveLength(count);
        chain.slice(1).forEach((stop, i) => {
          const prev = chain[i];
          expect(stop.leg?.minutes).toBeLessThanOrEqual(10);
          expect(stop.scheduledAt.getTime()).toBe(
            prev.scheduledAt.getTime() + (60 + (stop.leg?.minutes ?? 0)) * 60_000,
          );
          if (stop.leg?.mode === "walk") {
            expect(stop.leg.minutes).toBe(Math.ceil(walkMinutes(walkM(prev.place, stop.place))));
          }
        });
        for (const stop of chain) {
          expect(stop.hours).toBe(openAt(stop.place.hours, stop.scheduledAt));
          expect(stop.hours).not.toBe("closed");
        }
        expect(new Set(chain.map((s) => s.place.id)).size).toBe(count);
      }
    }
  });

  it("[F10.2] keeps each stop's category and the shared budget, grade and age filters", () => {
    const crawls = crawl({
      stops: [
        filters("food", { minGrade: "A", budget: 2 }),
        filters("dessert", { minGrade: "A", budget: 2 }),
      ],
    });
    for (const { stops } of crawls) {
      expect(stops.map((s) => s.place.category)).toEqual(["food", "dessert"]);
      for (const { place } of stops) {
        expect(place.ageRule).toBe("all");
        expect(place.price === null || place.price <= 2).toBe(true);
        expect(place.grade === null || place.grade.letter === "A").toBe(true);
      }
    }
  });

  it("[F10.3] starts at fair stations in order and times the last train from the last stop", () => {
    const crawls = crawl();
    const ranked = rankStations(data.graph(), people, friday7pm)
      .filter((r) => spotsNear(data.places(), r.station, filters("food")).length > 0)
      .map((r) => r.station);
    const firsts = crawls.map((c) => c.first.station);
    expect(firsts).toEqual(ranked.filter((s) => firsts.includes(s)));
    expect(firsts[0]).toBe(ranked[0]);
    expect(new Set(firsts).size).toBe(firsts.length);

    const [{ stops, leaveBy }] = crawls;
    const last = stops[stops.length - 1];
    for (const p of people) {
      const expected = leaveByFor(
        data.timetable(),
        friday7pm,
        [{ station: last.station, at: last.place, walkM: last.walkM }],
        { station: p.station, at: p.home },
      );
      expect(leaveBy.find((l) => l.participant === p.id)?.leaveBy).toEqual(expected);
    }
  });

  it("[F10.3] drops crawls where someone can't stay the full time at the last stop", () => {
    const result = buildCrawls(
      data.graph(),
      data.timetable(),
      data.places(),
      request({
        startsAt: new Date("2026-11-27T23:30:00-05:00"),
        stops: [filters("food"), filters("food"), filters("food"), filters("food")],
      }),
    );
    expect(result).toEqual({ kind: "none", blockedBy: "last-train" });
  });

  it("[F10.1] times a T leg as the walk to a boarding station, the ride and the walk on", () => {
    const crawls = crawl();
    const legs = crawls.flatMap((c) =>
      c.stops.slice(1).map((stop, i) => ({ stop, prev: c.stops[i] })),
    );
    const byT = legs.filter(({ stop }) => stop.leg?.mode === "T");
    expect(byT.length).toBeGreaterThan(0);
    const rides = ridesFor(data.graph(), data.timetable(), friday7pm);
    for (const { stop, prev } of byT) {
      const leaves = new Date(prev.scheduledAt.getTime() + 60 * 60_000);
      const toStation = minutesByT(rides, prev.place, leaves).get(stop.station);
      if (toStation === undefined) throw new Error("no T time to the stop's station");
      expect(stop.leg?.minutes).toBe(Math.ceil(toStation + walkMinutes(stop.walkM)));
      expect(walkMinutes(walkM(prev.place, stop.place))).toBeGreaterThan(
        toStation + walkMinutes(stop.walkM),
      );
    }
  });

  it("[F10.1] walks once trains stop for the night", () => {
    // A date past the timetable: no last train is known, so only the leg check guards the T.
    const late = new Date("2027-01-15T23:30:00-05:00");
    const result = buildCrawls(
      data.graph(),
      data.timetable(),
      data.places(),
      request({
        startsAt: late,
        stops: [filters("food"), filters("food"), filters("food"), filters("food")],
      }),
    );
    if (result.kind !== "options") throw new Error(`expected crawls, got ${result.blockedBy}`);
    const spans = boardingSpans(data.timetable(), data.graph().dates.weekday);
    const origin = new Date("2027-01-15T00:00:00-05:00").getTime();
    for (const { stops } of result.crawls) {
      stops.slice(1).forEach((stop, i) => {
        if (stop.leg?.mode !== "T") return;
        const leaves = stops[i].scheduledAt.getTime() + 60 * 60_000;
        const latest = Math.max(...[...spans.values()].map((s) => s.last));
        expect((leaves - origin) / 1000).toBeLessThanOrEqual(latest);
      });
    }
  });

  it("[F10.1] says when no train runs, or when no spots fit", () => {
    expect(
      buildCrawls(
        data.graph(),
        data.timetable(),
        data.places(),
        request({ startsAt: new Date("2026-11-17T04:00:00-05:00") }),
      ),
    ).toEqual({ kind: "none", blockedBy: "no-trains" });
    expect(
      buildCrawls(
        data.graph(),
        data.timetable(),
        data.places(),
        request({ stops: [filters("club"), filters("bar")] }),
      ),
    ).toEqual({ kind: "none", blockedBy: "spots" });
  });

  it("[F10.1] rejects a crawl with fewer than 2 or more than 4 stops", () => {
    expect(() => crawl({ stops: [filters("food")] })).toThrow();
    expect(() => crawl({ stops: Array.from({ length: 5 }, () => filters("food")) })).toThrow();
  });
});

describe("crawl Server Action logic", () => {
  const files = () => ({
    stations: data.stations(),
    graph: data.graph(),
    timetable: data.timetable(),
    places: data.places(),
  });
  const input = (more: Partial<CrawlInput> = {}): CrawlInput => ({
    people: [
      { name: "Priya", station: "place-bucen" },
      { name: "Sam", station: "place-harsq" },
    ],
    startsAt: "2026-11-27T19:00:00-05:00",
    stops: [{ categories: ["food"] }, { categories: ["dessert"] }],
    budget: null,
    minGrade: null,
    under21: true,
    stayMinutes: 60,
    ...more,
  });

  it("[F10.3] gives each crawl's stops, trips to the first stop and leave-by times home", () => {
    const result = planCrawl(input(), files());
    if (result.kind !== "options") throw new Error(`expected crawls, got ${result.kind}`);
    const [first] = result.crawls;
    expect(first.stops.map((s) => s.category)).toEqual(["food", "dessert"]);
    expect(first.stops[0].leg).toBeNull();
    expect(first.people.map((p) => p.name)).toEqual(["Priya", "Sam"]);
    expect(first.people.every((p) => p.minutes > 0 && p.leaveBy.kind === "train")).toBe(true);
  });

  it("[F10.1] names an unknown station and rejects a one-stop crawl", () => {
    const people = [{ name: "Priya", station: "place-nowhere" }];
    expect(planCrawl(input({ people }), files())).toEqual({
      kind: "unknown-station",
      station: "place-nowhere",
    });
    expect(crawlInput.safeParse(input({ stops: [{ categories: ["food"] }] })).success).toBe(false);
  });
});
