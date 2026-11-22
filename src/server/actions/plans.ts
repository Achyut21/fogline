"use server";

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { leaveByFor } from "@/lib/lasttrain/leave-by";
import { data } from "@/server/data";
import { getDb } from "@/server/db/client";
import { planParticipants, planStops, plans, profiles } from "@/server/db/schema";
import { sessionProfileId } from "@/server/session";

// Saved plans for the prototype's core loop (D-067): a plan with placeholder friends and one stop,
// an invite link, and joining it (F4.7, F4.8). The profile comes from the signed session (F1).

const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((b) => codeAlphabet[b % codeAlphabet.length]).join("");
}

function knownStation(id: string): boolean {
  return data.stations().some((s) => s.id === id);
}

const planInput = z.object({
  title: z.string().trim().min(1).max(80),
  startsAt: z.iso.datetime({ offset: true }),
  friends: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        station: z.string().refine(knownStation, "Unknown station"),
      }),
    )
    .max(7),
  stop: z.object({ placeId: z.string().min(1), stationId: z.string().refine(knownStation) }),
});

export async function createPlan(input: unknown) {
  const plan = planInput.parse(input);
  const creator = await sessionProfileId();
  if (!creator) return { kind: "no-profile" as const };
  if (!data.places().some((p) => p.id === plan.stop.placeId))
    return { kind: "unknown-spot" as const };
  const inviteToken = randomCode(12);
  const startsAt = new Date(plan.startsAt);
  const id = await getDb().transaction(async (tx) => {
    const [row] = await tx
      .insert(plans)
      .values({
        createdBy: creator,
        kind: "meetup",
        title: plan.title,
        startsAt,
        status: "planned",
        inviteToken,
      })
      .returning({ id: plans.id });
    await tx.insert(planParticipants).values([
      { planId: row.id, profileId: creator, rsvp: "yes" },
      ...plan.friends.map((f) => ({
        planId: row.id,
        placeholderName: f.name,
        originStationId: f.station,
      })),
    ]);
    await tx.insert(planStops).values({
      planId: row.id,
      seq: 0,
      placeId: plan.stop.placeId,
      stationId: plan.stop.stationId,
      scheduledAt: startsAt,
    });
    return row.id;
  });
  return { kind: "created" as const, id, inviteToken };
}

/** A plan by its invite token, with everyone's leave-by time home (F4.8, F5.1). */
export async function planByInvite(token: string) {
  const db = getDb();
  const [plan] = await db.select().from(plans).where(eq(plans.inviteToken, token));
  if (!plan) return null;
  const [stop] = await db
    .select()
    .from(planStops)
    .where(eq(planStops.planId, plan.id))
    .orderBy(asc(planStops.seq));
  const people = await db
    .select({
      id: planParticipants.id,
      placeholderName: planParticipants.placeholderName,
      originStationId: planParticipants.originStationId,
      rsvp: planParticipants.rsvp,
      displayName: profiles.displayName,
      homeStationId: profiles.homeStationId,
    })
    .from(planParticipants)
    .leftJoin(profiles, eq(profiles.id, planParticipants.profileId))
    .where(eq(planParticipants.planId, plan.id));
  const stations = new Map(data.stations().map((s) => [s.id, s]));
  const place = stop ? data.places().find((p) => p.id === stop.placeId) : undefined;
  const walkM = place?.stations.find((s) => s.id === stop?.stationId)?.walkM ?? 0;
  return {
    id: plan.id,
    title: plan.title,
    startsAt: plan.startsAt.toISOString(),
    status: plan.status,
    spot: place ? { id: place.id, name: place.name, lat: place.lat, lon: place.lon } : null,
    station: stop ? (stations.get(stop.stationId) ?? null) : null,
    people: people.flatMap((p) => {
      const stationId = p.homeStationId ?? p.originStationId;
      const home = stationId ? stations.get(stationId) : undefined;
      const name = p.displayName ?? p.placeholderName;
      if (!home || !name) return [];
      const leaveBy =
        stop && place
          ? leaveByFor(
              data.timetable(),
              plan.startsAt,
              [{ station: stop.stationId, at: place, walkM }],
              { station: home.id, at: home },
            )
          : null;
      return [{ id: p.id, name, station: home.id, rsvp: p.rsvp, leaveBy }];
    }),
  };
}

export async function joinPlan(token: string) {
  const profileId = await sessionProfileId();
  if (!profileId) return { kind: "no-profile" as const };
  const db = getDb();
  const [plan] = await db.select({ id: plans.id }).from(plans).where(eq(plans.inviteToken, token));
  if (!plan) return { kind: "not-found" as const };
  const [existing] = await db
    .select({ id: planParticipants.id })
    .from(planParticipants)
    .where(and(eq(planParticipants.planId, plan.id), eq(planParticipants.profileId, profileId)));
  if (!existing)
    await db.insert(planParticipants).values({ planId: plan.id, profileId, rsvp: "yes" });
  return { kind: "joined" as const, planId: plan.id };
}
