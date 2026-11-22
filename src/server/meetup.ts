import { z } from "zod";
import type { Graph, Station, Timetable } from "@/lib/gtfs/types";
import { leaveByFor, type LeaveBy } from "@/lib/lasttrain/leave-by";
import { placeCategories, type Place } from "@/lib/places/types";
import { fairOptions, type Blocker } from "@/lib/solver/fair";

/** What the plan builder sends (F4.1, F4.5). */
export const meetupInput = z.object({
  people: z
    .array(z.object({ name: z.string().trim().min(1).max(40), station: z.string().min(1) }))
    .min(1)
    .max(8),
  startsAt: z.iso.datetime({ offset: true }),
  categories: z.array(z.enum(placeCategories)).min(1),
  budget: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
  minGrade: z.enum(["A", "B"]).nullable(),
  under21: z.boolean(),
});
export type MeetupInput = z.infer<typeof meetupInput>;

const spotsShown = 5;

export type MeetupOption = {
  station: { id: string; name: string; lat: number; lon: number };
  /** The fairness score S(d) and each person's trip, in whole minutes (F4.3). */
  scoreMinutes: number;
  people: {
    name: string;
    station: string;
    minutes: number;
    transfers: number;
    leaveBy: LeaveBy;
  }[];
  spots: {
    id: string;
    name: string;
    category: Place["category"];
    grade: string | null;
    inspected: string | null;
    walkM: number;
    lat: number;
    lon: number;
  }[];
};

export type MeetupResult =
  | { kind: "options"; options: MeetupOption[] }
  | { kind: "none"; blockedBy: Blocker[] }
  | { kind: "unknown-station"; station: string };

/**
 * The fair meetup options for a group, with each person's trip and leave-by time home from the
 * first spot (F4.3, F4.4, F5.1, F5.2). Facts come from `src/lib`; nothing here is AI-written.
 */
export function planMeetup(
  input: MeetupInput,
  data: { stations: Station[]; graph: Graph; timetable: Timetable; places: Place[] },
): MeetupResult {
  const byId = new Map(data.stations.map((s) => [s.id, s]));
  const unknown = input.people.find((p) => !byId.has(p.station));
  if (unknown) return { kind: "unknown-station", station: unknown.station };
  const startsAt = new Date(input.startsAt);
  const participants = input.people.map((p, i) => ({ id: String(i), station: p.station }));
  const result = fairOptions(data.graph, data.timetable, data.places, participants, startsAt, {
    categories: input.categories,
    budget: input.budget,
    minGrade: input.minGrade,
    under21: input.under21,
  });
  if (result.kind === "none") return result;
  return {
    kind: "options",
    options: result.options.flatMap((option) => {
      const station = byId.get(option.station);
      const [first] = option.spots;
      if (!station || !first) return [];
      return [
        {
          station: { id: station.id, name: station.name, lat: station.lat, lon: station.lon },
          scoreMinutes: Math.round(option.score / 60),
          people: option.times.map((time) => {
            const person = input.people[Number(time.participant)];
            const home = byId.get(person.station) ?? station;
            return {
              name: person.name,
              station: person.station,
              minutes: Math.round(time.travel.seconds / 60),
              transfers: time.travel.transfers.length,
              leaveBy: leaveByFor(
                data.timetable,
                startsAt,
                [{ station: station.id, at: first.place, walkM: first.walkM }],
                { station: home.id, at: home },
              ),
            };
          }),
          spots: option.spots.slice(0, spotsShown).map(({ place, walkM }) => ({
            id: place.id,
            name: place.name,
            category: place.category,
            grade: place.grade?.letter ?? null,
            inspected: place.grade?.date ?? null,
            walkM,
            lat: place.lat,
            lon: place.lon,
          })),
        },
      ];
    }),
  };
}
