import { z } from "zod";
import { buildCrawls, crawlStops, type CrawlBlocker, type CrawlLeg } from "@/lib/crawl";
import type { Graph, Station, Timetable } from "@/lib/gtfs/types";
import type { LeaveBy } from "@/lib/lasttrain/leave-by";
import type { OpenState } from "@/lib/places/hours";
import { placeCategories, type Place } from "@/lib/places/types";

/** What the crawl builder sends (F10.1, F10.2): the people, the start, and each stop's kinds. */
export const crawlInput = z.object({
  people: z
    .array(z.object({ name: z.string().trim().min(1).max(40), station: z.string().min(1) }))
    .min(1)
    .max(8),
  startsAt: z.iso.datetime({ offset: true }),
  stops: z
    .array(
      z.object({
        categories: z.array(z.enum(placeCategories)).min(1).max(placeCategories.length),
      }),
    )
    .min(crawlStops.min)
    .max(crawlStops.max),
  budget: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
  minGrade: z.enum(["A", "B"]).nullable(),
  under21: z.boolean(),
  stayMinutes: z.number().int().min(30).max(180).default(60),
});
export type CrawlInput = z.infer<typeof crawlInput>;

export type CrawlOption = {
  /** The fairness score S(d) of the first stop's station, in whole minutes (F10.3). */
  scoreMinutes: number;
  stops: {
    id: string;
    name: string;
    category: Place["category"];
    grade: string | null;
    lat: number;
    lon: number;
    station: { id: string; name: string };
    walkM: number;
    scheduledAt: string;
    hours: OpenState;
    leg: CrawlLeg | null;
  }[];
  /** Each person's trip to the first stop and leave-by time home from the last (F10.3). */
  people: { name: string; station: string; minutes: number; leaveBy: LeaveBy }[];
};

export type CrawlPlan =
  | { kind: "options"; crawls: CrawlOption[] }
  | { kind: "none"; blockedBy: CrawlBlocker }
  | { kind: "unknown-station"; station: string };

/** Crawl options for a group (F10.1–F10.3). Facts come from `src/lib`; nothing is AI-written. */
export function planCrawl(
  input: CrawlInput,
  data: { stations: Station[]; graph: Graph; timetable: Timetable; places: Place[] },
): CrawlPlan {
  const byId = new Map(data.stations.map((s) => [s.id, s]));
  const homes = input.people.map((p) => byId.get(p.station));
  const missing = input.people.find((_, i) => !homes[i]);
  if (missing) return { kind: "unknown-station", station: missing.station };
  const participants = input.people.flatMap((p, i) => {
    const home = homes[i];
    return home ? [{ id: String(i), station: p.station, home }] : [];
  });
  const shared = { budget: input.budget, minGrade: input.minGrade, under21: input.under21 };
  const result = buildCrawls(data.graph, data.timetable, data.places, {
    participants,
    startsAt: new Date(input.startsAt),
    stops: input.stops.map((s) => ({ ...shared, categories: s.categories })),
    stayMinutes: input.stayMinutes,
  });
  if (result.kind === "none") return result;
  return {
    kind: "options",
    crawls: result.crawls.map((crawl) => ({
      scoreMinutes: Math.round(crawl.first.score / 60),
      stops: crawl.stops.map((stop) => ({
        id: stop.place.id,
        name: stop.place.name,
        category: stop.place.category,
        grade: stop.place.grade?.letter ?? null,
        lat: stop.place.lat,
        lon: stop.place.lon,
        station: { id: stop.station, name: byId.get(stop.station)?.name ?? stop.station },
        walkM: stop.walkM,
        scheduledAt: stop.scheduledAt.toISOString(),
        hours: stop.hours,
        leg: stop.leg,
      })),
      people: crawl.first.times.map((time) => {
        const i = Number(time.participant);
        const leaveBy = crawl.leaveBy.find((l) => l.participant === time.participant);
        if (!leaveBy) throw new Error(`No leave-by for participant ${time.participant}`);
        return {
          name: input.people[i].name,
          station: input.people[i].station,
          minutes: Math.round(time.travel.seconds / 60),
          leaveBy: leaveBy.leaveBy,
        };
      }),
    })),
  };
}
