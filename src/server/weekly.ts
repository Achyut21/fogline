import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { weekly as copy } from "@/copy";
import { inviteToken } from "@/lib/invite-token";
import type { OpenState } from "@/lib/places/hours";
import type { PlaceCategory } from "@/lib/places/types";
import { mondayOf, serviceDateOf } from "@/lib/time";
import { draftWeek, storedStopSchema } from "@/lib/weekly";
import { data } from "@/server/data";
import type { Db } from "@/server/db/client";
import { planParticipants, planStops, plans, weeklyPlans } from "@/server/db/schema";

const storedStops = z.array(storedStopSchema).min(2);

/**
 * Makes this week's plans once (F10.4); a second run in the same week changes nothing. Returns
 * how many plans it added.
 */
export async function makeWeeklyPlans(db: Db, now: Date): Promise<number> {
  const weekOf = mondayOf(serviceDateOf(now));
  const drafts = draftWeek(
    {
      stations: data.stations(),
      graph: data.graph(),
      timetable: data.timetable(),
      places: data.places(),
      events: data.events(),
    },
    now,
  );
  if (drafts.length === 0) return 0;
  const added = await db
    .insert(weeklyPlans)
    .values(drafts.map((d, seq) => ({ weekOf, seq, ...d })))
    .onConflictDoNothing()
    .returning({ id: weeklyPlans.id });
  return added.length;
}

export type WeeklyPlan = {
  id: string;
  title: string;
  startsAt: string;
  stops: {
    id: string;
    name: string;
    category: PlaceCategory | "event";
    grade: string | null;
    lat: number;
    lon: number;
    station: { id: string; name: string };
    scheduledAt: string;
    hours: OpenState;
    leg: { mode: "walk" | "T"; minutes: number } | null;
  }[];
};

function titleOf(template: string, eventTitle: string | null): string {
  if (template === "dinner-before") return copy.dinnerBefore(eventTitle ?? "");
  const known = Object.entries(copy.titles).find(([id]) => id === template);
  return known ? known[1] : template;
}

/** This week's plans with their spots' names and places, in order (F10.4). */
export async function weeklyPlansFor(db: Db, now: Date): Promise<WeeklyPlan[]> {
  const rows = await db
    .select()
    .from(weeklyPlans)
    .where(eq(weeklyPlans.weekOf, mondayOf(serviceDateOf(now))))
    .orderBy(asc(weeklyPlans.seq));
  const places = new Map(data.places().map((p) => [p.id, p]));
  const events = new Map(data.events().map((e) => [e.id, e]));
  const stations = new Map(data.stations().map((s) => [s.id, s]));
  return rows.flatMap((row) => {
    const parsed = storedStops.safeParse(row.stops);
    if (!parsed.success) return [];
    const stops = parsed.data.flatMap((s) => {
      const place = places.get(s.placeId);
      const event = events.get(s.placeId);
      const spot = place ?? event;
      if (!spot) return [];
      return [
        {
          id: s.placeId,
          name: place ? place.name : (event?.venue ?? s.placeId),
          category: place ? place.category : ("event" as const),
          grade: place?.grade?.letter ?? null,
          lat: spot.lat,
          lon: spot.lon,
          station: { id: s.stationId, name: stations.get(s.stationId)?.name ?? s.stationId },
          scheduledAt: s.scheduledAt,
          hours: s.hours,
          leg: s.leg,
        },
      ];
    });
    if (stops.length !== parsed.data.length) return [];
    const eventTitle = row.eventId ? (events.get(row.eventId)?.title ?? null) : null;
    return [
      {
        id: row.id,
        title: titleOf(row.template, eventTitle),
        startsAt: row.startsAt.toISOString(),
        stops,
      },
    ];
  });
}

/**
 * "Invite friends" on a weekly plan (F10.5): a copy as the viewer's own crawl with its own invite
 * link. Leave-by times are worked out for the people who join, like any plan.
 */
export async function copyWeeklyPlan(
  db: Db,
  weeklyId: string,
  creator: { id: string; isDemo: boolean },
): Promise<{ id: string; inviteToken: string } | null> {
  const [row] = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, weeklyId));
  if (!row) return null;
  const stops = storedStops.parse(row.stops);
  const eventTitle = row.eventId
    ? (data.events().find((e) => e.id === row.eventId)?.title ?? null)
    : null;
  const token = inviteToken();
  const id = await db.transaction(async (tx) => {
    const [plan] = await tx
      .insert(plans)
      .values({
        createdBy: creator.id,
        kind: "crawl",
        title: titleOf(row.template, eventTitle),
        startsAt: row.startsAt,
        status: "planned",
        inviteToken: token,
        isDemo: creator.isDemo,
      })
      .returning({ id: plans.id });
    await tx
      .insert(planParticipants)
      .values({ planId: plan.id, profileId: creator.id, rsvp: "yes" });
    await tx.insert(planStops).values(
      stops.map((s, seq) => ({
        planId: plan.id,
        seq,
        placeId: s.placeId,
        stationId: s.stationId,
        scheduledAt: new Date(s.scheduledAt),
        walkedFromPrevious: s.leg?.mode === "walk",
      })),
    );
    return plan.id;
  });
  return { id, inviteToken: token };
}
