import { z } from "zod";
import { buildCrawls, type CrawlStop } from "@/lib/crawl";
import { dinnerBefore } from "@/lib/dinner-before";
import type { PuzzleEvent } from "@/lib/events";
import type { Graph, Station, Timetable } from "@/lib/gtfs/types";
import type { Place, PlaceCategory } from "@/lib/places/types";
import type { SpotFilters } from "@/lib/solver/fair";
import { addDays, mondayOf, serviceDateOf, serviceTimeToDate, zone } from "@/lib/time";

// Weekly plans (F10.4, DATA 3.17, D-073): every Monday, 3 suggested plans for the week. A puzzle
// event that week gets a Dinner before; crawl templates fill the rest. Fairness and last trains
// are checked for a mixed group from five campuses, and a plan is kept only when every check
// passes. Templates are all-ages, so every viewer can use every plan.

export const weeklyCount = 3;
export const campusStations = [
  "place-knncl",
  "place-harsq",
  "place-bucen",
  "place-nuniv",
  "place-mdftf",
] as const;

export const templates = [
  { id: "dinner-dessert", day: 4, hour: 19, stops: ["food", "dessert"] },
  { id: "coffee-museum", day: 5, hour: 14, stops: ["coffee", "culture"] },
  { id: "brunch-park", day: 6, hour: 11, stops: ["food", "park"] },
] as const satisfies readonly {
  id: string;
  /** Days after Monday. */
  day: number;
  hour: number;
  stops: readonly PlaceCategory[];
}[];
export type TemplateId = (typeof templates)[number]["id"] | "dinner-before";

const stayMinutes = 60;

const localHour = new Intl.DateTimeFormat("en-US", {
  timeZone: zone,
  weekday: "short",
  hour: "numeric",
  hourCycle: "h23",
});

function bostonClock(at: Date): { weekday: string; hour: number } {
  const parts = Object.fromEntries(localHour.formatToParts(at).map((p) => [p.type, p.value]));
  return { weekday: parts.weekday, hour: Number(parts.hour) };
}

/** The meal before an event, by the hour it starts in Boston: before 11, before 4 PM, or later. */
export function mealAt(at: Date): "breakfast" | "lunch" | "dinner" {
  const { hour } = bostonClock(at);
  if (hour < 11) return "breakfast";
  return hour < 16 ? "lunch" : "dinner";
}

/**
 * Whether the weekly cron should run now: Mondays from 6 to 11 AM in Boston. Vercel calls it
 * hourly from 10:00 to 16:00 UTC, which covers 6 AM in both EST and EDT; the hours after the
 * first are retries, and a run finds the week already made and stops (F10.4).
 */
export function weeklyCronDue(now: Date): boolean {
  const { weekday, hour } = bostonClock(now);
  return weekday === "Mon" && hour >= 6 && hour <= 11;
}

export const storedStopSchema = z.object({
  /** A place ID from places.json, or an event ID from events.json for Dinner before's event. */
  placeId: z.string(),
  stationId: z.string(),
  walkM: z.number().int().nonnegative(),
  scheduledAt: z.iso.datetime({ offset: true }),
  hours: z.enum(["open", "unknown"]),
  leg: z
    .object({ mode: z.enum(["walk", "T"]), minutes: z.number().int().nonnegative() })
    .nullable(),
});
export type StoredStop = z.infer<typeof storedStopSchema>;

export type WeeklyDraft = {
  template: TemplateId;
  eventId: string | null;
  startsAt: Date;
  stops: StoredStop[];
};

const allAges = (categories: PlaceCategory[]): SpotFilters => ({
  categories,
  budget: null,
  minGrade: null,
  under21: true,
});

function stored(stop: CrawlStop): StoredStop {
  if (stop.hours === "closed") throw new Error(`Crawl stop ${stop.place.id} is closed`);
  return {
    placeId: stop.place.id,
    stationId: stop.station,
    walkM: stop.walkM,
    scheduledAt: stop.scheduledAt.toISOString(),
    hours: stop.hours,
    leg: stop.leg,
  };
}

/** Up to three valid plans for the week that holds `now`, in the order they're shown. */
export function draftWeek(
  data: {
    stations: Station[];
    graph: Graph;
    timetable: Timetable;
    places: Place[];
    events: PuzzleEvent[];
  },
  now: Date,
): WeeklyDraft[] {
  const monday = mondayOf(serviceDateOf(now));
  const nextMonday = addDays(monday, 7);
  const byId = new Map(data.stations.map((s) => [s.id, s]));
  const participants = campusStations.flatMap((station, i) => {
    const home = byId.get(station);
    return home ? [{ id: String(i), station, home }] : [];
  });
  const drafts: WeeklyDraft[] = [];

  const events = data.events
    .filter((e) => {
      const date = serviceDateOf(new Date(e.startsAt));
      return date >= monday && date < nextMonday && new Date(e.startsAt) > now;
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  for (const event of events) {
    const result = dinnerBefore(data.graph, data.timetable, data.places, {
      participants,
      event,
      filters: allAges(["food"]),
      stayMinutes,
    });
    if (result.kind !== "dinner") continue;
    const { dinner, event: last } = result.plan;
    drafts.push({
      template: "dinner-before",
      eventId: event.id,
      startsAt: dinner.scheduledAt,
      stops: [
        stored(dinner),
        {
          placeId: event.id,
          stationId: event.station.id,
          walkM: event.station.walkM,
          scheduledAt: last.scheduledAt.toISOString(),
          hours: "open",
          leg: last.leg,
        },
      ],
    });
    break;
  }

  for (const template of templates) {
    if (drafts.length === weeklyCount) break;
    const startsAt = serviceTimeToDate(addDays(monday, template.day), template.hour * 3600);
    if (startsAt <= now) continue;
    const result = buildCrawls(data.graph, data.timetable, data.places, {
      participants,
      startsAt,
      stops: template.stops.map((c) => allAges([c])),
      stayMinutes,
    });
    if (result.kind !== "options") continue;
    const [best] = result.crawls;
    drafts.push({ template: template.id, eventId: null, startsAt, stops: best.stops.map(stored) });
  }
  return drafts;
}
