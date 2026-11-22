import { badges as badgeCopy, recap as copy } from "@/copy";
import type { Recap } from "@/server/recap";

// What the recap share image draws (F9.3), from the recap this viewer may see (F9.4). Ghost stays
// inside the app (DATA 3.10), and the badge list is capped so the image never clips.

export const maxChips = 6;

const zone = "America/New_York";
const day = new Intl.DateTimeFormat("en-US", {
  timeZone: zone,
  weekday: "short",
  month: "short",
  day: "numeric",
});
const clock = new Intl.DateTimeFormat("en-US", {
  timeZone: zone,
  hour: "numeric",
  minute: "2-digit",
});
// COPY.md joins a time and its AM or PM with a no-break space. Intl puts a narrow one there.
const clockTime = (iso: string) => clock.format(new Date(iso)).replace(/\s(?=[AP]M)/u, " ");

function isBadge(id: string): id is keyof typeof badgeCopy {
  return id in badgeCopy;
}

export type Stat = { prefix: string | null; value: string; unit: string | null; label: string };

export function recapCard(night: Recap) {
  const { arrivals } = night;
  const podium = (
    arrivals.length <= 3 ? arrivals : [arrivals[0], arrivals[1], arrivals[arrivals.length - 1]]
  ).map((a, i) => ({
    id: a.profileId,
    place: copy.places[i],
    name: a.name,
    time: clockTime(a.at),
  }));

  const spot = night.spot?.name ?? (night.adultsOnly ? copy.adultsSpot : null);
  const { milesOnT, milesWalked, stops, newCells } = night.numbers;
  const stats: Stat[] = [
    { prefix: null, value: copy.miles(milesOnT), unit: copy.mi, label: copy.onT },
    { prefix: copy.about, value: copy.miles(milesWalked), unit: copy.mi, label: copy.walked },
    { prefix: null, value: copy.count(stops), unit: null, label: copy.stops(stops) },
    { prefix: null, value: copy.count(newCells), unit: null, label: copy.cells(newCells) },
  ];

  const awards = night.badges.flatMap((b) =>
    b.badge !== "ghost" && isBadge(b.badge) ? [copy.award(badgeCopy[b.badge].name, b.name)] : [],
  );
  const chips =
    awards.length <= maxChips
      ? awards
      : [...awards.slice(0, maxChips - 1), copy.more(awards.length - maxChips + 1)];

  return {
    demo: night.isDemo,
    title: night.title,
    dateLine: copy.dateLine(day.format(new Date(night.startsAt)), spot),
    podium,
    stats,
    chips,
  };
}
