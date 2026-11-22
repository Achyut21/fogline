import { z } from "zod";
import type { LastTrainLeg } from "@/lib/lasttrain/search";

// MBTA service alerts on a route home (F5.6, DATA 3.18). An alert counts when it's active when the
// person leaves, has severity 3 or more, and isn't about accessibility, parking or bikes. It
// affects a ride when it covers the ride's whole line or the station where the ride starts or
// ends; when it names only other stations on that line, its effect on this train can't be told,
// so the answer is "check".

export type Alert = {
  id: string;
  text: string;
  /** Line-wide routes, and the stations it names per route (parent station IDs). */
  lines: Set<string>;
  stations: Map<string, Set<string>>;
  periods: { start: number; end: number | null }[];
};

export type RouteAlerts =
  { kind: "clear" } | { kind: "disrupted"; texts: string[] } | { kind: "check" };

const translated = z.object({
  translation: z.array(z.object({ text: z.string(), language: z.string().optional() })),
});
const alertSchema = z.object({
  id: z.string(),
  alert: z.object({
    effect: z.string(),
    effect_detail: z.string().optional(),
    severity: z.number().optional(),
    active_period: z
      .array(z.object({ start: z.number().optional(), end: z.number().optional() }))
      .optional(),
    informed_entity: z.array(
      z.object({ route_id: z.string().optional(), stop_id: z.string().optional() }),
    ),
    header_text: translated,
  }),
});
const feedSchema = z.object({ entity: z.array(z.unknown()) });

const ignoredDetail = /PARKING|BIKE|ELEVATOR|ESCALATOR|ACCESS/;

/**
 * The disruptions in an Alerts_enhanced.json feed. `parentOf` turns a platform stop ID into its
 * station; a stop it doesn't know is kept as is. Entities that don't parse are skipped.
 */
export function parseAlerts(feed: unknown, parentOf: (stop: string) => string): Alert[] {
  const alerts: Alert[] = [];
  for (const raw of feedSchema.parse(feed).entity) {
    const parsed = alertSchema.safeParse(raw);
    if (!parsed.success) continue;
    const { id, alert } = parsed.data;
    if (alert.effect === "ACCESSIBILITY_ISSUE" || (alert.severity ?? 0) < 3) continue;
    if (alert.effect_detail && ignoredDetail.test(alert.effect_detail)) continue;
    const text =
      alert.header_text.translation.find((t) => (t.language ?? "en") === "en")?.text ??
      alert.header_text.translation[0]?.text;
    if (!text) continue;
    const lines = new Set<string>();
    const stations = new Map<string, Set<string>>();
    for (const entity of alert.informed_entity) {
      if (!entity.route_id) continue;
      if (!entity.stop_id) {
        lines.add(entity.route_id);
        continue;
      }
      const named = stations.get(entity.route_id) ?? new Set<string>();
      named.add(parentOf(entity.stop_id));
      stations.set(entity.route_id, named);
    }
    const periods = (alert.active_period ?? [{}]).map((p) => ({
      start: p.start ?? 0,
      end: p.end ?? null,
    }));
    alerts.push({ id, text, lines, stations, periods });
  }
  return alerts;
}

const activeAt = (alert: Alert, at: Date) => {
  const seconds = at.getTime() / 1000;
  return alert.periods.some((p) => p.start <= seconds && (p.end === null || seconds < p.end));
};

/** What the alerts say about a trip home that leaves at `at` (F5.6). */
export function alertsOnRoute(alerts: Alert[], legs: LastTrainLeg[], at: Date): RouteAlerts {
  const texts: string[] = [];
  let unsure = false;
  for (const alert of alerts) {
    if (!activeAt(alert, at)) continue;
    for (const leg of legs) {
      if (leg.kind !== "ride") continue;
      const named = alert.stations.get(leg.route);
      if (alert.lines.has(leg.route) || named?.has(leg.from) || named?.has(leg.to)) {
        if (!texts.includes(alert.text)) texts.push(alert.text);
      } else if (named) {
        unsure = true;
      }
    }
  }
  if (texts.length > 0) return { kind: "disrupted", texts };
  return unsure ? { kind: "check" } : { kind: "clear" };
}
