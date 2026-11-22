import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { z } from "zod";
import { planImage as copy, plans as planCopy } from "@/copy";
import type { Db } from "@/server/db/client";
import { planParticipants, planStops, plans } from "@/server/db/schema";
import { stopSpot } from "@/server/stop-spot";

// The invite link's preview (F4.8, DATA 3.20): title, time, spot and how many people are in. It's
// the same for everyone who holds the link, so a cache can't hand one viewer's version to another,
// and a 21+ plan always hides its title and venue (F4.9). Link previews are fetched by crawlers
// with short timeouts, so this reads only what the preview shows.

const tokenShape = z.string().regex(/^[A-HJ-NP-Z2-9]{12}$/);

export type PreviewPlan = {
  id: string;
  title: string;
  startsAt: Date;
  isDemo: boolean;
  adultsOnly: boolean;
  stops: string[];
  seats: number;
};

/** The plan behind an invite link, or null when the token doesn't open the plan with this ID. */
export async function previewPlan(
  db: Db,
  planId: unknown,
  token: unknown,
): Promise<PreviewPlan | null> {
  const id = z.uuid().safeParse(planId);
  const t = tokenShape.safeParse(token);
  if (!id.success || !t.success) return null;
  const [plan] = await db.select().from(plans).where(eq(plans.inviteToken, t.data));
  if (!plan || plan.id !== id.data) return null;
  const [stops, seats] = await Promise.all([
    db.select().from(planStops).where(eq(planStops.planId, plan.id)).orderBy(asc(planStops.seq)),
    db
      .select({ rsvp: planParticipants.rsvp })
      .from(planParticipants)
      .where(eq(planParticipants.planId, plan.id)),
  ]);
  const spots = stops.flatMap((s) => {
    const spot = stopSpot(s.placeId, s.stationId);
    return spot ? [spot] : [];
  });
  return {
    id: plan.id,
    title: plan.title,
    startsAt: plan.startsAt,
    isDemo: plan.isDemo,
    adultsOnly: spots.some((s) => s.ageRule === "21plus"),
    stops: spots.map((s) => s.name),
    seats: seats.filter((s) => s.rsvp !== "no").length,
  };
}

/** What the preview image and text show. `spot` is null when no stop can be named. */
export function planPreview(plan: Omit<PreviewPlan, "id">) {
  const hidden = plan.adultsOnly;
  const [first, ...rest] = plan.stops;
  return {
    demo: plan.isDemo,
    title: hidden ? copy.hiddenTitle : plan.title,
    when: planCopy.plan.when(plan.startsAt),
    spot: hidden ? copy.hiddenSpot : (first ?? null),
    more: !hidden && rest.length > 0 ? copy.moreStops(rest.length) : null,
    people: copy.people(plan.seats),
  };
}

/** The plan page's link preview metadata: the image, and the same facts as text. */
export function previewMetadata(plan: PreviewPlan, token: string): Metadata {
  const card = planPreview(plan);
  const image = { url: `/api/og/plan/${plan.id}?t=${token}`, width: 1200, height: 630 };
  const description = [card.when, card.spot, card.people].filter((p) => p !== null).join(" · ");
  return {
    openGraph: { title: card.title, description, images: [image] },
    twitter: { card: "summary_large_image", title: card.title, description, images: [image] },
  };
}
