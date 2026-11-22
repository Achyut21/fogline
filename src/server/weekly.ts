import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { weekly as copy } from "@/copy";
import { inviteToken } from "@/lib/invite-token";
import type { OpenState } from "@/lib/places/hours";
import type { PlaceCategory } from "@/lib/places/types";
import { mondayOf, serviceDateOf } from "@/lib/time";
import { draftWeek, mealAt, storedStopSchema } from "@/lib/weekly";
import { data } from "@/server/data";
import { stopSpot } from "@/server/stop-spot";
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

type Row = typeof weeklyPlans.$inferSelect;

function titleOf(row: Row, firstStop: string, venue: string | undefined): string | null {
  if (row.template === "dinner-before") {
    if (venue === undefined) return null;
    return copy.beforeEvent(copy.meals[mealAt(new Date(firstStop))], venue);
  }
  const known = Object.entries(copy.titles).find(([id]) => id === row.template);
  return known ? known[1] : null;
}

/**
 * A stored plan as it can be shown now, or null when it can't: a stop that left the data, a stop
 * that's now 21+ (weekly plans are all-ages, F4.9), or a title the copy doesn't have.
 */
function shown(row: Row): WeeklyPlan | null {
  const parsed = storedStops.safeParse(row.stops);
  if (!parsed.success) return null;
  const stations = new Map(data.stations().map((s) => [s.id, s]));
  const stops: WeeklyPlan["stops"] = [];
  for (const s of parsed.data) {
    const spot = stopSpot(s.placeId, s.stationId);
    if (!spot || spot.ageRule !== "all") return null;
    const place = data.places().find((p) => p.id === s.placeId);
    stops.push({
      id: spot.id,
      name: spot.name,
      category: place ? place.category : "event",
      grade: place?.grade?.letter ?? null,
      lat: spot.lat,
      lon: spot.lon,
      station: { id: s.stationId, name: stations.get(s.stationId)?.name ?? s.stationId },
      scheduledAt: s.scheduledAt,
      hours: s.hours,
      leg: s.leg,
    });
  }
  const venue = row.eventId ? stops.at(-1)?.name : undefined;
  const title = titleOf(row, parsed.data[0].scheduledAt, venue);
  if (title === null) return null;
  return { id: row.id, title, startsAt: row.startsAt.toISOString(), stops };
}

/** This week's plans with their spots' names and places, in order (F10.4). */
export async function weeklyPlansFor(db: Db, now: Date): Promise<WeeklyPlan[]> {
  const rows = await db
    .select()
    .from(weeklyPlans)
    .where(eq(weeklyPlans.weekOf, mondayOf(serviceDateOf(now))))
    .orderBy(asc(weeklyPlans.seq));
  return rows.flatMap((row) => {
    const plan = shown(row);
    return plan ? [plan] : [];
  });
}

/**
 * "Invite friends" on one of this week's plans (F10.5): a copy as the viewer's own crawl with its
 * own invite link. Leave-by times are worked out for the people who join, like any plan. Null for
 * a plan from another week or one that can't be shown any more.
 */
export async function copyWeeklyPlan(
  db: Db,
  weeklyId: string,
  creator: { id: string; isDemo: boolean },
  now: Date,
): Promise<{ id: string; inviteToken: string } | null> {
  const [row] = await db.select().from(weeklyPlans).where(eq(weeklyPlans.id, weeklyId));
  if (!row || row.weekOf !== mondayOf(serviceDateOf(now))) return null;
  const plan = shown(row);
  if (!plan) return null;
  const stops = storedStops.parse(row.stops);
  const token = inviteToken();
  const id = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(plans)
      .values({
        createdBy: creator.id,
        kind: "crawl",
        title: plan.title,
        startsAt: row.startsAt,
        status: "planned",
        inviteToken: token,
        isDemo: creator.isDemo,
      })
      .returning({ id: plans.id });
    await tx
      .insert(planParticipants)
      .values({ planId: created.id, profileId: creator.id, rsvp: "yes" });
    await tx.insert(planStops).values(
      stops.map((s, seq) => ({
        planId: created.id,
        seq,
        placeId: s.placeId,
        stationId: s.stationId,
        scheduledAt: new Date(s.scheduledAt),
        walkedFromPrevious: s.leg?.mode === "walk",
      })),
    );
    return created.id;
  });
  return { id, inviteToken: token };
}
