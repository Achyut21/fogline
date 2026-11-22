import { describe, expect, it } from "vitest";
import { dinnerBefore } from "@/lib/dinner-before";
import { walkM, walkMinutes } from "@/lib/geo/distance";
import { leaveByFor } from "@/lib/lasttrain/leave-by";
import { matchesFilters, rankStations, type SpotFilters } from "@/lib/solver/fair";
import { data } from "@/server/data";
import {
  dinnerBeforeInput,
  planDinnerBefore,
  type DinnerBeforeInput,
} from "@/server/dinner-before";

const stations = new Map(data.stations().map((s) => [s.id, s]));
const person = (id: string, station: string) => {
  const home = stations.get(station);
  if (!home) throw new Error(`no station ${station}`);
  return { id, station, home };
};
const people = [person("0", "place-bucen"), person("1", "place-harsq")];
const food: SpotFilters = { categories: ["food"], budget: null, minGrade: null, under21: true };
const event = data.events().find((e) => e.venue === "Symphony Hall");
if (!event) throw new Error("no Symphony Hall event in data/events.json");
const stay = 60;

describe("Dinner before", () => {
  const result = dinnerBefore(data.graph(), data.timetable(), data.places(), {
    participants: people,
    event,
    filters: food,
    stayMinutes: stay,
  });
  if (result.kind !== "dinner") throw new Error(`expected dinner, got ${result.blockedBy}`);
  const { dinner, score, event: last, leaveBy } = result.plan;
  const start = new Date(event.startsAt);

  it("[F10.6] puts dinner within 10 minutes of the venue, timed to reach the event", () => {
    expect(dinner.place.category).toBe("food");
    expect(last.leg.minutes).toBeLessThanOrEqual(10);
    expect(last.scheduledAt).toEqual(start);
    expect(dinner.scheduledAt.getTime()).toBe(start.getTime() - (stay + last.leg.minutes) * 60_000);
    expect(dinner.hours).not.toBe("closed");
  });

  it("[F10.6] picks the fairest spot: no matching spot a short walk away has a fairer station", () => {
    const rough = new Date(start.getTime() - (stay + 10) * 60_000);
    const fair = new Map(rankStations(data.graph(), people, rough).map((r) => [r.station, r]));
    expect(fair.get(dinner.station)?.score).toBe(score);
    const walkable = data
      .places()
      .filter((p) => matchesFilters(p, food) && walkMinutes(walkM(p, event)) <= 10);
    for (const place of walkable) {
      for (const near of place.stations) {
        const other = fair.get(near.id)?.score;
        if (other !== undefined) expect(other).toBeGreaterThanOrEqual(score);
      }
    }
  });

  it("[F10.6] times each person's last train from the event", () => {
    for (const p of people) {
      const expected = leaveByFor(
        data.timetable(),
        dinner.scheduledAt,
        [{ station: event.station.id, at: event, walkM: event.station.walkM }],
        { station: p.station, at: p.home },
      );
      expect(leaveBy.find((l) => l.participant === p.id)?.leaveBy).toEqual(expected);
    }
  });

  it("[F10.6] answers Plan it with the dinner, the event and everyone's trip", () => {
    const input: DinnerBeforeInput = {
      people: [
        { name: "Priya", station: "place-bucen" },
        { name: "Sam", station: "place-harsq" },
      ],
      eventId: event.id,
      budget: null,
      minGrade: null,
      under21: true,
      stayMinutes: stay,
    };
    expect(dinnerBeforeInput.safeParse(input).success).toBe(true);
    const files = {
      stations: data.stations(),
      graph: data.graph(),
      timetable: data.timetable(),
      places: data.places(),
      events: data.events(),
    };
    const plan = planDinnerBefore(input, files);
    if (plan.kind !== "dinner") throw new Error(`expected dinner, got ${plan.kind}`);
    expect(plan.dinner.id).toBe(dinner.place.id);
    expect(plan.event.id).toBe(event.id);
    expect(plan.people.map((p) => p.name)).toEqual(["Priya", "Sam"]);
    expect(planDinnerBefore({ ...input, eventId: "no-such-event" }, files)).toEqual({
      kind: "unknown-event",
    });
  });
});
