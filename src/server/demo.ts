import { TZDate } from "@date-fns/tz";
import { lt, and, eq } from "drizzle-orm";
import { revealAround } from "@/lib/geo/cells";
import { zone } from "@/lib/time";
import { awardNightBadges } from "@/server/badges";
import { data } from "@/server/data";
import type { Db } from "@/server/db/client";
import {
  checkins,
  planParticipants,
  planStops,
  plans,
  profiles,
  revealedCells,
} from "@/server/db/schema";
import { planMeetup } from "@/server/meetup";
import { newProfileCode } from "@/server/profile-code";

// Demo mode's seed (F16.1, F16.2): every /demo visit gets its own copy, with rows flagged
// is_demo and fresh profile IDs, so judges never share state. The night is planned by the real
// solver and badged by the real rules; only the people and check-in times are set here.

const keepHours = 24;

const people = [
  { name: "You", school: "Boston University", station: "place-bucen" },
  { name: "Priya", school: "Harvard", station: "place-harsq" },
  { name: "Sam", school: "Tufts", station: "place-mdftf" },
] as const;

/** Check-in times relative to the start, in minutes: early, on time, fashionably late. */
const arrivals = [-3, 1, 12];

/** Last Friday at 7:00 PM New York time, at least a day before `now`. */
export function lastFridayEvening(now: Date): Date {
  const local = new TZDate(now.getTime() - 24 * 3600 * 1000, zone);
  local.setDate(local.getDate() - ((local.getDay() + 2) % 7));
  local.setHours(19, 0, 0, 0);
  return new Date(local.getTime());
}

/** Seeds one demo copy and returns the demo profile to sign in as. */
export async function seedDemo(db: Db, now = new Date()): Promise<{ profileId: string }> {
  const stations = new Map(data.stations().map((s) => [s.id, s]));
  const startsAt = lastFridayEvening(now);
  const meetup = planMeetup(
    {
      people: people.map((p) => ({ name: p.name, station: p.station })),
      startsAt: startsAt.toISOString(),
      categories: ["food"],
      budget: null,
      minGrade: null,
      under21: true,
    },
    {
      stations: data.stations(),
      graph: data.graph(),
      timetable: data.timetable(),
      places: data.places(),
    },
  );
  const option = meetup.kind === "options" ? meetup.options[0] : undefined;
  const spot = option?.spots[0];
  if (!option || !spot) throw new Error("The demo night found no meetup option");

  const planId = await db.transaction(async (tx) => {
    const ids: string[] = [];
    for (const person of people) {
      const home = stations.get(person.station);
      if (!home) throw new Error(`Unknown demo station ${person.station}`);
      const [row] = await tx
        .insert(profiles)
        .values({
          displayName: person.name,
          school: person.school,
          homeStationId: home.id,
          ageBand: "under21",
          profileCode: newProfileCode(),
          isDemo: true,
        })
        .returning({ id: profiles.id });
      ids.push(row.id);
      const seen = revealAround("home", home);
      const visited = revealAround("checkin", spot);
      await tx.insert(revealedCells).values([
        ...seen.cells
          .filter((h3) => !visited.cells.includes(h3))
          .map((h3) => ({ profileId: row.id, h3, state: seen.state, source: "home" as const })),
        ...visited.cells.map((h3) => ({
          profileId: row.id,
          h3,
          state: visited.state,
          source: "checkin" as const,
        })),
      ]);
    }
    const [plan] = await tx
      .insert(plans)
      .values({
        createdBy: ids[0],
        kind: "meetup",
        title: "Friday dinner",
        startsAt,
        endedAt: new Date(startsAt.getTime() + 3 * 3600 * 1000),
        status: "ended",
        inviteToken: `demo-${newProfileCode()}${newProfileCode()}`,
        isDemo: true,
      })
      .returning({ id: plans.id });
    await tx
      .insert(planParticipants)
      .values(ids.map((profileId) => ({ planId: plan.id, profileId, rsvp: "yes" as const })));
    await tx.insert(planStops).values({
      planId: plan.id,
      seq: 0,
      placeId: spot.id,
      stationId: option.station.id,
      scheduledAt: startsAt,
    });
    await tx.insert(checkins).values(
      ids.map((profileId, i) => ({
        ts: new Date(startsAt.getTime() + arrivals[i] * 60_000),
        profileId,
        planId: plan.id,
        placeId: spot.id,
        lat: spot.lat,
        lon: spot.lon,
        accuracyM: 15,
        valid: true,
        isDemo: true,
      })),
    );
    return { plan: plan.id, you: ids[0] };
  });
  await awardNightBadges(planId.plan, db);
  return { profileId: planId.you };
}

/** Deletes demo copies older than 24 hours; their rows cascade from the profiles (F16.2). */
export async function cleanupDemo(db: Db, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - keepHours * 3600 * 1000);
  await db.delete(plans).where(and(eq(plans.isDemo, true), lt(plans.createdAt, cutoff)));
  const gone = await db
    .delete(profiles)
    .where(and(eq(profiles.isDemo, true), lt(profiles.createdAt, cutoff)))
    .returning({ id: profiles.id });
  return gone.length;
}
