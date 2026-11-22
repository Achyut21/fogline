"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { inviteToken } from "@/lib/invite-token";
import { leaveByFor } from "@/lib/lasttrain/leave-by";
import { alertsOnRoute } from "@/lib/alerts";
import { currentAlerts, passes } from "@/server/alerts";
import { data } from "@/server/data";
import { stopSpot } from "@/server/stop-spot";
import { getDb } from "@/server/db/client";
import { checkins, planParticipants, planStops, plans, profiles } from "@/server/db/schema";
import { currentProfile } from "@/server/profile";

// Saved plans for the prototype's core loop (D-067): a plan with placeholder friends and one stop,
// an invite link, and joining it (F4.7, F4.8). The profile comes from the signed session (F1).

const tokenInput = z.string().regex(/^[A-HJ-NP-Z2-9]{12}$/);

/** A plan with any bar or club stop is 21+ (F4.9). */
const adultsOnly = (stops: readonly { placeId: string; stationId: string }[]) =>
  stops.some((s) => stopSpot(s.placeId, s.stationId)?.ageRule === "21plus");

function knownStation(id: string): boolean {
  return data.stations().some((s) => s.id === id);
}

const stopInput = z.object({
  placeId: z.string().min(1),
  stationId: z.string().refine(knownStation),
});

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
  stop: stopInput.optional(),
  /** A crawl's 2–4 stops in order (F10.1), each with its own time. */
  stops: z
    .array(stopInput.extend({ scheduledAt: z.iso.datetime({ offset: true }) }))
    .min(1)
    .max(4)
    .optional(),
});

export async function createPlan(input: unknown) {
  const plan = planInput.parse(input);
  const creator = await currentProfile();
  if (!creator) return { kind: "no-profile" as const };
  const startsAt = new Date(plan.startsAt);
  const chosen = plan.stops ?? (plan.stop ? [{ ...plan.stop, scheduledAt: plan.startsAt }] : []);
  if (chosen.length === 0) return { kind: "unknown-spot" as const };
  // A crawl's stops run in order within one night from the plan's start.
  const times = chosen.map((stop) => new Date(stop.scheduledAt).getTime());
  const night = startsAt.getTime() + 12 * 60 * 60_000;
  if (times.some((t, i) => t < startsAt.getTime() || t > night || (i > 0 && t < times[i - 1])))
    return { kind: "unknown-spot" as const };
  // A stop is a spot near its station, or a puzzle event at its own station (Dinner before).
  for (const stop of chosen) {
    const spot = stopSpot(stop.placeId, stop.stationId);
    if (!spot || spot.walkM === null) return { kind: "unknown-spot" as const };
    if (spot.ageRule === "21plus" && creator.ageBand !== "21plus")
      return { kind: "adults-only" as const };
  }
  const token = inviteToken();
  const id = await getDb().transaction(async (tx) => {
    const [row] = await tx
      .insert(plans)
      .values({
        createdBy: creator.id,
        kind: chosen.length > 1 ? "crawl" : "meetup",
        title: plan.title,
        startsAt,
        status: "planned",
        inviteToken: token,
        isDemo: creator.isDemo,
      })
      .returning({ id: plans.id });
    await tx.insert(planParticipants).values([
      { planId: row.id, profileId: creator.id, rsvp: "yes" },
      ...plan.friends.map((f) => ({
        planId: row.id,
        placeholderName: f.name,
        originStationId: f.station,
      })),
    ]);
    await tx.insert(planStops).values(
      chosen.map((stop, seq) => ({
        planId: row.id,
        seq,
        placeId: stop.placeId,
        stationId: stop.stationId,
        scheduledAt: new Date(stop.scheduledAt),
      })),
    );
    return row.id;
  });
  return { kind: "created" as const, id, inviteToken: token };
}

/**
 * A plan by its invite token (F4.8). Anyone with the token sees names and count; only
 * participants see home stations and leave-by times (F5.1). A plan with a 21+ stop hides its
 * venue from anyone not known to be 21+ (F4.9).
 */
export async function planByInvite(token: unknown) {
  const parsed = tokenInput.safeParse(token);
  if (!parsed.success) return null;
  const db = getDb();
  const [plan] = await db.select().from(plans).where(eq(plans.inviteToken, parsed.data));
  if (!plan) return null;
  // F5.6: ask for the alerts feed now so it loads while the queries below run (it's cached).
  const alertsSoon = currentAlerts();
  const viewer = await currentProfile();
  const stops = await db
    .select()
    .from(planStops)
    .where(eq(planStops.planId, plan.id))
    .orderBy(asc(planStops.seq));
  const people = await db
    .select({
      id: planParticipants.id,
      profileId: planParticipants.profileId,
      placeholderName: planParticipants.placeholderName,
      originStationId: planParticipants.originStationId,
      rsvp: planParticipants.rsvp,
      displayName: profiles.displayName,
      homeStationId: profiles.homeStationId,
    })
    .from(planParticipants)
    .leftJoin(profiles, eq(profiles.id, planParticipants.profileId))
    .where(eq(planParticipants.planId, plan.id));
  const member = viewer !== null && people.some((p) => p.profileId === viewer.id);
  // Arrival order (F6.3): each participant's first valid check-in, earliest first.
  const arrived = await db
    .select({ profileId: checkins.profileId, ts: sql<Date>`min(${checkins.ts})` })
    .from(checkins)
    .where(and(eq(checkins.planId, plan.id), eq(checkins.valid, true)))
    .groupBy(checkins.profileId)
    .orderBy(sql`min(${checkins.ts})`);
  const hidden = adultsOnly(stops) && viewer?.ageBand !== "21plus";
  const stations = new Map(data.stations().map((s) => [s.id, s]));
  const stop = stops.at(0);
  const place = stop ? stopSpot(stop.placeId, stop.stationId) : null;
  // Leave-by uses the last stop (F5.5), so a crawl's riders leave from where the night ends. A
  // stop can be a puzzle event's venue (Dinner before, weekly plans).
  const route = stops.flatMap((st) => {
    const at = stopSpot(st.placeId, st.stationId);
    if (!at) return [];
    return [
      {
        station: st.stationId,
        at,
        walkM: at.walkM ?? 0,
        name: at.name,
        scheduledAt: st.scheduledAt,
      },
    ];
  });
  // Only members see trips home (F5.1).
  const feed = await alertsSoon;
  const alerts = member && route.length > 0 ? feed : null;
  return {
    id: plan.id,
    // A 21+ plan's title may name its venue, so it's hidden with the venue (F4.9).
    title: hidden ? null : plan.title,
    inviteToken: member ? plan.inviteToken : null,
    viewer: { member, organizer: viewer !== null && plan.createdBy === viewer.id },
    arrivals: (member ? arrived : []).flatMap((a) => {
      const p = people.find((x) => x.profileId === a.profileId);
      return p?.displayName
        ? [{ id: p.id, name: p.displayName, at: new Date(a.ts).toISOString() }]
        : [];
    }),
    startsAt: plan.startsAt.toISOString(),
    status: plan.status,
    adultsOnly: adultsOnly(stops),
    spot:
      place && !hidden ? { id: place.id, name: place.name, lat: place.lat, lon: place.lon } : null,
    station: stop && !hidden ? (stations.get(stop.stationId) ?? null) : null,
    stops: hidden
      ? []
      : route.map((r) => ({
          id: r.at.id,
          name: r.name,
          station: stations.get(r.station)?.name ?? r.station,
          scheduledAt: r.scheduledAt.toISOString(),
        })),
    people: people.flatMap((p) => {
      // A seat whose profile was deleted keeps no name or station (F1.7).
      const former = p.profileId === null && p.placeholderName === null;
      const name = p.displayName ?? p.placeholderName;
      if (!name && !former) return [];
      const stationId = member ? (p.homeStationId ?? p.originStationId) : null;
      const home = stationId ? stations.get(stationId) : undefined;
      const leaveBy =
        home && route.length > 0
          ? leaveByFor(
              data.timetable(),
              route.at(-1)?.scheduledAt ?? plan.startsAt,
              route.map(({ station, at, walkM }) => ({ station, at, walkM })),
              { station: home.id, at: home },
            )
          : null;
      return [
        {
          id: p.id,
          name: former ? null : name,
          former,
          you: viewer !== null && p.profileId === viewer.id,
          placeholder: p.profileId === null && !former,
          rsvp: p.rsvp,
          station: home?.id ?? null,
          leaveBy,
          // F5.6: what MBTA alerts say about this person's trip home; null when the feed is down.
          alerts:
            leaveBy?.kind === "train" && alerts
              ? alertsOnRoute(alerts, leaveBy.legs, leaveBy.departs, passes)
              : null,
        },
      ];
    }),
  };
}

export async function joinPlan(token: unknown) {
  const parsed = tokenInput.safeParse(token);
  if (!parsed.success) return { kind: "not-found" as const };
  const viewer = await currentProfile();
  if (!viewer) return { kind: "no-profile" as const };
  const db = getDb();
  const [plan] = await db
    .select({ id: plans.id, status: plans.status, isDemo: plans.isDemo })
    .from(plans)
    .where(eq(plans.inviteToken, parsed.data));
  // Demo and real never mix (F16.2): a real student in a demo plan would lose their check-ins when
  // the demo copy is cleaned up, and a demo profile in a real plan would count in real stats.
  if (!plan || plan.isDemo !== viewer.isDemo) return { kind: "not-found" as const };
  if (plan.status === "ended") return { kind: "ended" as const };
  const stops = await db
    .select({ placeId: planStops.placeId, stationId: planStops.stationId })
    .from(planStops)
    .where(eq(planStops.planId, plan.id));
  if (adultsOnly(stops) && viewer.ageBand !== "21plus") return { kind: "adults-only" as const };
  await db
    .insert(planParticipants)
    .values({ planId: plan.id, profileId: viewer.id, rsvp: "yes" })
    .onConflictDoNothing();
  return { kind: "joined" as const, planId: plan.id };
}
