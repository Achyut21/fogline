import { z } from "zod";
import type { CrawlLeg } from "@/lib/crawl";
import { dinnerBefore } from "@/lib/dinner-before";
import type { PuzzleEvent } from "@/lib/events";
import type { Graph, Station, Timetable } from "@/lib/gtfs/types";
import type { LeaveBy } from "@/lib/lasttrain/leave-by";
import type { OpenState } from "@/lib/places/hours";
import type { Place } from "@/lib/places/types";

/** What "Plan it" sends for Dinner before (F10.6): the people and the puzzle event's ID. */
export const dinnerBeforeInput = z.object({
  people: z
    .array(z.object({ name: z.string().trim().min(1).max(40), station: z.string().min(1) }))
    .min(1)
    .max(8),
  eventId: z.string().regex(/^[a-z0-9-]+$/),
  budget: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
  minGrade: z.enum(["A", "B"]).nullable(),
  under21: z.boolean(),
  stayMinutes: z.number().int().min(30).max(180),
});
export type DinnerBeforeInput = z.infer<typeof dinnerBeforeInput>;

export type DinnerBeforePlan =
  | {
      kind: "dinner";
      scoreMinutes: number;
      dinner: {
        id: string;
        name: string;
        grade: string | null;
        lat: number;
        lon: number;
        station: { id: string; name: string };
        walkM: number;
        scheduledAt: string;
        hours: OpenState;
      };
      event: { id: string; title: string; venue: string; startsAt: string; leg: CrawlLeg };
      people: { name: string; station: string; minutes: number; leaveBy: LeaveBy }[];
    }
  | { kind: "none"; blockedBy: "time" | "no-trains" | "spots" | "last-train" }
  | { kind: "unknown-station"; station: string }
  | { kind: "unknown-event" };

/** Dinner near a puzzle event, then the event (F10.6). Facts come from `src/lib`. */
export function planDinnerBefore(
  input: DinnerBeforeInput,
  data: {
    stations: Station[];
    graph: Graph;
    timetable: Timetable;
    places: Place[];
    events: PuzzleEvent[];
  },
): DinnerBeforePlan {
  const event = data.events.find((e) => e.id === input.eventId);
  if (!event) return { kind: "unknown-event" };
  const byId = new Map(data.stations.map((s) => [s.id, s]));
  const homes = input.people.map((p) => byId.get(p.station));
  const missing = input.people.find((_, i) => !homes[i]);
  if (missing) return { kind: "unknown-station", station: missing.station };
  const participants = input.people.flatMap((p, i) => {
    const home = homes[i];
    return home ? [{ id: String(i), station: p.station, home }] : [];
  });
  const result = dinnerBefore(data.graph, data.timetable, data.places, {
    participants,
    event,
    filters: {
      categories: ["food"],
      budget: input.budget,
      minGrade: input.minGrade,
      under21: input.under21,
    },
    stayMinutes: input.stayMinutes,
  });
  if (result.kind === "none") return result;
  const { dinner, score, times, leaveBy } = result.plan;
  return {
    kind: "dinner",
    scoreMinutes: Math.round(score / 60),
    dinner: {
      id: dinner.place.id,
      name: dinner.place.name,
      grade: dinner.place.grade?.letter ?? null,
      lat: dinner.place.lat,
      lon: dinner.place.lon,
      station: { id: dinner.station, name: byId.get(dinner.station)?.name ?? dinner.station },
      walkM: dinner.walkM,
      scheduledAt: dinner.scheduledAt.toISOString(),
      hours: dinner.hours,
    },
    event: {
      id: event.id,
      title: event.title,
      venue: event.venue,
      startsAt: event.startsAt,
      leg: result.plan.event.leg,
    },
    people: times.map((time) => {
      const i = Number(time.participant);
      const home = leaveBy.find((l) => l.participant === time.participant);
      if (!home) throw new Error(`No leave-by for participant ${time.participant}`);
      return {
        name: input.people[i].name,
        station: input.people[i].station,
        minutes: Math.round(time.travel.seconds / 60),
        leaveBy: home.leaveBy,
      };
    }),
  };
}
