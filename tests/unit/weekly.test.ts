import { describe, expect, it } from "vitest";
import { weekly } from "@/copy";
import { openAt } from "@/lib/places/hours";
import {
  campusStations,
  draftWeek,
  mealAt,
  templates,
  weeklyCount,
  weeklyCronDue,
} from "@/lib/weekly";
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

  it("[F10.4] runs the Monday cron in exactly one of its two UTC runs, in EST and EDT", () => {
    // Nov 23 2026 is in EST; Mar 15 2027 is in EDT.
    expect(weeklyCronDue(new Date("2026-11-23T10:00:00Z"))).toBe(false);
    expect(weeklyCronDue(new Date("2026-11-23T11:00:00Z"))).toBe(true);
    expect(weeklyCronDue(new Date("2027-03-15T10:00:00Z"))).toBe(true);
    expect(weeklyCronDue(new Date("2027-03-15T11:00:00Z"))).toBe(false);
    expect(weeklyCronDue(new Date("2026-11-24T11:00:00Z"))).toBe(false);
  });

  it("[F10.6] names the meal before an event by the hour", () => {
    expect(mealAt(new Date("2026-11-28T08:20:00-05:00"))).toBe("breakfast");
    expect(mealAt(new Date("2026-11-22T13:50:00-05:00"))).toBe("lunch");
    expect(mealAt(new Date("2026-11-27T18:20:00-05:00"))).toBe("dinner");
  });

  it("[F10.4] keeps every weekly title a heading under six words", () => {
    const titles = [
      ...Object.values(weekly.titles),
      ...data.events().map((e) => weekly.beforeEvent(weekly.meals.dinner, e.venue)),
    ];
    for (const title of titles) expect(title.split(/\s+/).length, title).toBeLessThan(6);
    expect(weekly.beforeEvent("Dinner", "Symphony Hall")).toBe("Dinner, then Symphony Hall");
    expect(weekly.beforeEvent("Lunch", "Harvard Science Center, Hall B")).toBe(
      "Lunch, then the event",
    );
    expect(weekly.beforeEvent("Lunch", "The Huntington Theatre")).toBe(
      "Lunch, then the Huntington Theatre",
    );
  });
});
