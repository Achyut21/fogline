import { describe, expect, it } from "vitest";
import { openAt } from "@/lib/places/hours";
import { campusStations, draftWeek, templates, weeklyCount } from "@/lib/weekly";
import { data } from "@/server/data";

const files = () => ({
  stations: data.stations(),
  graph: data.graph(),
  timetable: data.timetable(),
  places: data.places(),
  events: data.events(),
});
// Monday 2026-11-23, 6:00 AM in Boston: the cron's run.
const monday6am = new Date("2026-11-23T06:00:00-05:00");

describe("weekly plans", () => {
  const drafts = draftWeek(files(), monday6am);

  it("[F10.4] makes 3 plans for the week, Dinner before an event first", () => {
    expect(drafts).toHaveLength(weeklyCount);
    const [first] = drafts;
    expect(first.template).toBe("dinner-before");
    const event = data.events().find((e) => e.id === first.eventId);
    expect(event?.startsAt).toBeDefined();
    expect(first.stops.at(-1)?.placeId).toBe(event?.id);
    expect(drafts.slice(1).map((d) => d.template)).toEqual(
      templates.slice(0, weeklyCount - 1).map((t) => t.id),
    );
  });

  it("[F10.4] keeps only plans that pass every check: open, 10-minute legs, all-ages", () => {
    const places = new Map(data.places().map((p) => [p.id, p]));
    for (const draft of drafts) {
      expect(draft.startsAt.getTime()).toBeGreaterThan(monday6am.getTime());
      expect(draft.stops.length).toBeGreaterThanOrEqual(2);
      draft.stops.slice(1).forEach((stop) => {
        expect(stop.leg?.minutes).toBeLessThanOrEqual(10);
      });
      for (const stop of draft.stops) {
        const place = places.get(stop.placeId);
        if (!place) continue;
        expect(place.ageRule).toBe("all");
        expect(openAt(place.hours, new Date(stop.scheduledAt))).not.toBe("closed");
      }
    }
  });

  it("[F10.4] scores fairness from the five campuses and skips a slot already past", () => {
    expect(campusStations).toHaveLength(5);
    const sunday = draftWeek(files(), new Date("2026-11-29T12:00:00-05:00"));
    expect(sunday.every((d) => d.startsAt > new Date("2026-11-29T12:00:00-05:00"))).toBe(true);
    expect(sunday.some((d) => d.template === "dinner-dessert")).toBe(false);
  });
});
