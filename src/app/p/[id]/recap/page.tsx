import { CalendarX } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { BadgeChip } from "@/components/display/badge-chip";
import { StatTile } from "@/components/display/stat-tile";
import { Podium } from "@/components/recap/podium";
import { ShareRecap } from "@/components/recap/share-recap";
import { StatCounter } from "@/components/display/stat-counter";
import { EmptyState } from "@/components/system/empty-state";
import { badges, plans, recap } from "@/copy";
import { recapByInvite } from "@/server/actions/recap";
import { getDb } from "@/server/db/client";
import { currentProfile } from "@/server/profile";
import { isParticipant } from "@/server/recap";

export const metadata: Metadata = { title: recap.page.title, robots: { index: false } };

const r = recap.page;
const day = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  month: "short",
  day: "numeric",
});
const isBadge = (id: string): id is keyof typeof badges => id in badges;
const badgeName = (id: string) => (isBadge(id) ? badges[id].name : null);

/** The night recap (F9): who got there first, the night in numbers, badges, and the share image. */
export default async function RecapPage({ params, searchParams }: PageProps<"/p/[id]/recap">) {
  const { id } = await params;
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : null;
  const night = token ? await recapByInvite(token) : null;
  const back = { href: token ? `/p/${id}?t=${token}` : "/plans", label: r.back };
  if (!night || night.planId !== id) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
        <PageHeader back={back} />
        <main className="flex flex-1 flex-col justify-center px-4">
          <EmptyState icon={CalendarX} title={r.notReady.title} body={r.notReady.body} />
        </main>
      </div>
    );
  }
  // 1st, 2nd and last (F9.1).
  const arrivals = night.arrivals;
  const podium =
    arrivals.length <= 3 ? arrivals : [arrivals[0], arrivals[1], arrivals[arrivals.length - 1]];
  const title = night.title ?? plans.plan.hiddenTitle;
  // The share image is for participants (F9.4); someone holding only the link sees the page.
  const viewer = await currentProfile();
  const member = viewer !== null && (await isParticipant(getDb(), night.planId, viewer.id));
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <PageHeader back={back} />
      <main className="flex flex-1 flex-col gap-6 px-4 pb-safe">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          <p className="text-ink-muted">
            {recap.dateLine(
              day.format(new Date(night.startsAt)),
              night.spot?.name ?? (night.adultsOnly ? recap.adultsSpot : null),
            )}
          </p>
        </div>

        <section aria-labelledby="arrivals" className="flex flex-col gap-2">
          <h2 id="arrivals" className="text-sm font-bold text-ink-muted">
            {r.arrivals}
          </h2>
          {podium.length === 0 ? (
            <p className="text-sm">{recap.noArrivals}</p>
          ) : (
            <Podium arrivals={podium} />
          )}
        </section>

        <section aria-labelledby="numbers" className="flex flex-col gap-2">
          <h2 id="numbers" className="text-sm font-bold text-ink-muted">
            {r.numbers}
          </h2>
          <p className="flex items-baseline gap-2">
            <StatCounter
              value={night.numbers.newCells}
              className="text-4xl font-extrabold tracking-tight text-accent"
            />
            <span className="text-ink-muted">{recap.cells(night.numbers.newCells)}</span>
          </p>
          <dl className="grid grid-cols-2 gap-2">
            <StatTile
              label={recap.onT}
              value={night.numbers.milesOnT}
              decimals={1}
              suffix={` ${recap.mi}`}
            />
            <StatTile
              label={`${recap.walked}, ${recap.about}`}
              value={night.numbers.milesWalked}
              decimals={1}
              suffix={` ${recap.mi}`}
            />
            <StatTile label={recap.stops(night.numbers.stops)} value={night.numbers.stops} />
          </dl>
        </section>

        {night.badges.length > 0 && (
          <section aria-labelledby="night-badges" className="flex flex-col gap-2">
            <h2 id="night-badges" className="text-sm font-bold text-ink-muted">
              {recap.badgesHeading}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {night.badges.flatMap((b) => {
                const name = badgeName(b.badge);
                return name
                  ? [
                      <li key={`${b.profileId}-${b.badge}`}>
                        <BadgeChip name={recap.award(name, b.name)} earned />
                      </li>,
                    ]
                  : [];
              })}
            </ul>
          </section>
        )}

        <div className="mt-auto pb-4">
          {member && <ShareRecap planId={night.planId} title={title} />}
        </div>
      </main>
    </div>
  );
}
