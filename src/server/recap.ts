import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { toMiles } from "@/lib/geo/miles";
import { adultCategories } from "@/lib/places/types";
import { live, stationIndex } from "@/lib/rides";
import { travelTime, type TravelStep } from "@/lib/solver/travel";
import { metersWalked, milesOnT, stopsCount } from "@/lib/stats";
import { dayTypeOf, hourBucketOf, toServiceTime } from "@/lib/time";
import { data } from "@/server/data";
import type { Db } from "@/server/db/client";
import {
  badgesAwarded,
  checkins,
  planParticipants,
  planStops,
  plans,
  profiles,
  revealedCells,
  rideEvents,
} from "@/server/db/schema";

// A night's recap (F9.1): the arrival podium, badges, the group's numbers, the route of everyone
// who came and the fog they cleared. Facts only; A's recap page and the share image (F9.2, F9.3)
// draw them, and the actions in src/server/actions/recap.ts decide who sees what (F9.4).

const earlyMs = 30 * 60_000;

export type Recap = {
  planId: string;
  title: string;
  startsAt: string;
  isDemo: boolean;
  /** The spot is a bar or club: hide it from anyone not known to be 21+ (F4.9). */
  adultsOnly: boolean;
  spot: { id: string; name: string; lat: number; lon: number; stationId: string } | null;
  /** Everyone who checked in at the first stop, in arrival order (F9.1 shows 1st, 2nd and last). */
  arrivals: { profileId: string; name: string; at: string }[];
  /** Including Ghost, which shows only here (DATA 3.10). */
  badges: { profileId: string; name: string; badge: string }[];
  numbers: { milesOnT: number; milesWalked: number; stops: number; newCells: number };
  /** Routes from home for people who checked in. Members only: they show home stations (F4.8). */
  routes: { profileId: string; name: string; home: string; minutes: number; steps: TravelStep[] }[];
  /** Cells the people who came cleared that night by riding or checking in. */
  clearedCells: string[];
};

/** The recap of an ended plan, or null when the plan doesn't exist or hasn't ended. */
export async function recapOf(db: Db, planId: string): Promise<Recap | null> {
  const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
  if (!plan || plan.status !== "ended" || !plan.endedAt) return null;
  const [stop] = await db
    .select()
    .from(planStops)
    .where(eq(planStops.planId, planId))
    .orderBy(asc(planStops.seq))
    .limit(1);
  if (!stop) return null;
  const place = data.places().find((p) => p.id === stop.placeId);

  const people = await db
    .select({ id: profiles.id, name: profiles.displayName, home: profiles.homeStationId })
    .from(planParticipants)
    .innerJoin(profiles, eq(profiles.id, planParticipants.profileId))
    .where(eq(planParticipants.planId, planId));
  const byId = new Map(people.map((p) => [p.id, p]));
  const from = new Date(plan.startsAt.getTime() - earlyMs);

  const [visits, awards, rides] = await Promise.all([
    db
      .select()
      .from(checkins)
      .where(and(eq(checkins.planId, planId), eq(checkins.valid, true), gte(checkins.ts, from)))
      .orderBy(asc(checkins.ts)),
    db.select().from(badgesAwarded).where(eq(badgesAwarded.planId, planId)),
    db.select().from(rideEvents).where(eq(rideEvents.planId, planId)),
  ]);
  const came = [...new Set(visits.map((v) => v.profileId))].filter((id) => byId.has(id));
  const cells =
    came.length === 0
      ? []
      : await db
          .selectDistinct({ h3: revealedCells.h3 })
          .from(revealedCells)
          .where(
            and(
              inArray(revealedCells.profileId, came),
              inArray(revealedCells.source, ["ride", "checkin"]),
              gte(revealedCells.firstAt, from),
              lte(revealedCells.firstAt, plan.endedAt),
            ),
          );

  const arrived = new Map<string, Date>();
  for (const visit of visits) {
    if (
      visit.placeId === stop.placeId &&
      byId.has(visit.profileId) &&
      !arrived.has(visit.profileId)
    ) {
      arrived.set(visit.profileId, visit.ts);
    }
  }
  const station = data.stations().find((s) => s.id === stop.stationId) ?? null;
  // One stop: each person who came walked from the station and back (DATA 3.11).
  const walkedM =
    station && place
      ? came.length *
        metersWalked([{ station, spot: place, checkedIn: true, walkedFromPrevious: false }])
      : 0;
  const { serviceDate, seconds } = toServiceTime(plan.startsAt);

  return {
    planId,
    title: plan.title,
    startsAt: plan.startsAt.toISOString(),
    isDemo: plan.isDemo,
    adultsOnly:
      place !== undefined &&
      (place.ageRule === "21plus" || adultCategories.includes(place.category)),
    spot: place
      ? {
          id: place.id,
          name: place.name,
          lat: place.lat,
          lon: place.lon,
          stationId: stop.stationId,
        }
      : null,
    arrivals: [...arrived].map(([profileId, at]) => ({
      profileId,
      name: byId.get(profileId)?.name ?? "",
      at: at.toISOString(),
    })),
    badges: awards.flatMap((a) => {
      const holder = byId.get(a.profileId);
      return holder ? [{ profileId: a.profileId, name: holder.name, badge: a.badgeId }] : [];
    }),
    numbers: {
      milesOnT: milesOnT(data.shapes(), stationIndex(data.stations()), live(rides)),
      milesWalked: toMiles(walkedM),
      stops: stopsCount(live(rides)),
      newCells: cells.length,
    },
    routes: came.flatMap((id) => {
      const person = byId.get(id);
      const trip = person
        ? travelTime(
            data.graph(),
            person.home,
            stop.stationId,
            dayTypeOf(serviceDate),
            hourBucketOf(seconds),
          )
        : null;
      return person && trip
        ? [
            {
              profileId: id,
              name: person.name,
              home: person.home,
              minutes: Math.round(trip.seconds / 60),
              steps: trip.steps,
            },
          ]
        : [];
    }),
    clearedCells: cells.map((c) => c.h3),
  };
}

/** Whether a profile sat in the plan (F9.4). */
export async function isParticipant(db: Db, planId: string, profileId: string): Promise<boolean> {
  const [seat] = await db
    .select({ id: planParticipants.id })
    .from(planParticipants)
    .where(and(eq(planParticipants.planId, planId), eq(planParticipants.profileId, profileId)))
    .limit(1);
  return seat !== undefined;
}
