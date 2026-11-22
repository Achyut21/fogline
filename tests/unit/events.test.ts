import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { eventSchema, wordsFileSchema } from "@/lib/events";
import { stationSchema } from "@/lib/gtfs/types";
import type { Station } from "@/lib/gtfs/types";
import { curatedSchema, toEvents, type CuratedEvent } from "../../scripts/events/build";

const parkStreet: Station = {
  id: "place-pktrm",
  name: "Park Street",
  lat: 42.356395,
  lon: -71.062424,
  routes: ["Red", "Green-B"],
  stops: [],
};
const words = new Set(["light", "skate", "carol"]);

const event = (overrides: Partial<CuratedEvent> = {}): CuratedEvent => ({
  id: "common-tree-lighting",
  date: "2026-12-03",
  title: "Tree lighting",
  venue: "Boston Common",
  lat: 42.3551,
  lon: -71.0656,
  startsAt: "2026-12-03T18:00:00-05:00",
  url: "https://www.boston.gov/",
  source: "City of Boston",
  word: "light",
  allAges: true,
  checked: true,
  ...overrides,
});

describe("data:events", () => {
  it("[F7.1] publishes checked events with the nearest station, in date order", () => {
    const later = event({
      id: "skating",
      date: "2026-12-04",
      word: "skate",
      startsAt: "2026-12-06T10:00:00-05:00",
    });
    const boylston: Station = { ...parkStreet, id: "place-boyls", lat: 42.35302, lon: -71.06459 };
    const [first, second] = toEvents([later, event()], [parkStreet, boylston], words);
    expect(first).toMatchObject({ id: "common-tree-lighting", station: { id: "place-boyls" } });
    expect(first.station.walkM).toBeGreaterThan(0);
    expect(first.station.walkM).toBeLessThan(600);
    expect(first).not.toHaveProperty("checked");
    expect(first).not.toHaveProperty("allAges");
    expect(second.id).toBe("skating");
  });

  it("[F7.1] accepts only all-ages events", () => {
    expect(curatedSchema.safeParse({ ...event(), allAges: false }).success).toBe(false);
    expect(curatedSchema.safeParse(event()).success).toBe(true);
  });

  it("[F7.1] refuses to publish anything while an event is unchecked or invalid", () => {
    const problems = [
      event({ id: "unchecked", checked: false }),
      event({ id: "same-day", word: "carol" }),
      event({
        id: "not-a-word",
        date: "2026-12-05",
        word: "qzxvb",
        startsAt: "2026-12-05T18:00:00-05:00",
      }),
      event({ id: "too-late", date: "2026-12-06", startsAt: "2026-12-10T00:30:00-05:00" }),
      event({ id: "too-early", date: "2026-12-08", startsAt: "2026-12-07T23:30:00-05:00" }),
      event({
        id: "far",
        date: "2026-12-09",
        lat: 42.2513,
        lon: -71.0051,
        startsAt: "2026-12-09T18:00:00-05:00",
      }),
    ];
    expect(() => toEvents(problems, [parkStreet], words)).toThrow(
      /unchecked: not checked yet[\s\S]*same-day: a second event for 2026-12-03[\s\S]*not-a-word: "qzxvb" isn't in words.json[\s\S]*too-late: starts 2026-12-10[\s\S]*too-early: starts 2026-12-07[\s\S]*far: \d+ m from the nearest station/,
    );
  });

  it("[F7.1] [F7.6] refuses a gap between dates and a repeated answer", () => {
    const gap = event({
      id: "gap",
      date: "2026-12-05",
      word: "skate",
      startsAt: "2026-12-05T18:00:00-05:00",
    });
    expect(() => toEvents([event(), gap], [parkStreet], words)).toThrow(
      /no event between 2026-12-03 and 2026-12-05/,
    );
    const again = event({ id: "again", date: "2026-12-04", startsAt: "2026-12-04T18:00:00-05:00" });
    expect(() => toEvents([event(), again], [parkStreet], words)).toThrow(
      /"light" is already an answer/,
    );
    expect(curatedSchema.safeParse({ ...event(), date: "2026-02-30" }).success).toBe(false);
  });

  it("[F7.1] counts an event that starts up to 3 days after its puzzle date", () => {
    const run = event({ startsAt: "2026-12-06T23:59:00-05:00" });
    expect(toEvents([run], [parkStreet], words)).toHaveLength(1);
  });
});

describe("committed events.json", () => {
  it("[F7.1] has one event a day from Nov 22 to Dec 5, each answer a valid word near a real station", () => {
    const read = (name: string): unknown =>
      JSON.parse(readFileSync(path.join(import.meta.dirname, "../../data", name), "utf8"));
    const events = z.array(eventSchema).parse(read("events.json"));
    const valid = new Set(wordsFileSchema.parse(read("words.json")).words);
    const stations = new Set(
      z
        .array(stationSchema)
        .parse(read("stations.json"))
        .map((s) => s.id),
    );
    expect(events.map((e) => e.date)).toEqual(
      Array.from({ length: 14 }, (_, i) =>
        new Date(Date.UTC(2026, 10, 22 + i)).toISOString().slice(0, 10),
      ),
    );
    expect(new Set(events.map((e) => e.word)).size).toBe(events.length);
    expect(events.every((e) => valid.has(e.word) && stations.has(e.station.id))).toBe(true);
  });
});

describe("committed words.json", () => {
  it("[F7.2] lists the valid 5-letter guesses with their source and license", () => {
    const file = path.join(import.meta.dirname, "../../data/words.json");
    const list = wordsFileSchema.parse(JSON.parse(readFileSync(file, "utf8")));
    expect(list.license).toBe("The Unlicense");
    expect(list.words.length).toBeGreaterThan(10_000);
    expect(new Set(list.words).size).toBe(list.words.length);
    expect(list.words).toEqual([...list.words].sort());
    for (const word of ["light", "skate", "carol", "hoops"]) expect(list.words).toContain(word);
  });
});
