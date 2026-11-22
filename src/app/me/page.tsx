import { ChevronRight, Ear, Info, Settings, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/app/bottom-nav";
import { BadgeChip } from "@/components/display/badge-chip";
import { StatTile } from "@/components/display/stat-tile";
import { app, badges, me, onboarding, squad } from "@/copy";
import { myStats } from "@/server/actions/me";
import { currentProfile } from "@/server/profile";
import { formatProfileCode } from "@/server/profile-code";
import { stationById } from "@/server/stations";

const m = onboarding.me;

type BadgeId = keyof typeof badges;
const isBadgeId = (id: string): id is BadgeId => id in badges;

/** A badge's line when it needs no number, else null. */
function plainLine(id: BadgeId): string | null {
  switch (id) {
    case "fashionably-late":
    case "long-haul":
    case "closest-call":
    case "first-light":
      return null;
    default:
      return badges[id].description();
  }
}

export const metadata: Metadata = { title: m.title };

export default async function MePage() {
  const profile = await currentProfile();
  if (!profile) redirect("/welcome");
  const stats = await myStats();
  // Badges whose line needs a number (minutes late, a neighborhood) show their name alone: awards
  // don't store the number yet.
  const earned = (stats?.badges ?? []).flatMap((b, i) => {
    if (!isBadgeId(b.badge)) return [];
    const copy = badges[b.badge];
    return [{ key: `${b.badge}-${i}`, name: copy.name, description: plainLine(b.badge) }];
  });
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex flex-1 flex-col gap-6 px-4 pt-safe">
        <h1 className="pt-4 text-2xl font-extrabold tracking-tight">{profile.displayName}</h1>
        <dl className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-sm text-ink-muted">{m.school}</dt>
            <dd className="text-sm font-bold">{profile.school}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-sm text-ink-muted">{m.home}</dt>
            <dd className="text-sm font-bold">{stationById(profile.homeStationId)?.name}</dd>
          </div>
        </dl>
        {stats ? (
          <>
            <section aria-labelledby="stats" className="flex flex-col gap-3">
              <h2 id="stats" className="text-sm font-bold text-ink-muted">
                {me.stats.title}
              </h2>
              <dl className="grid grid-cols-2 gap-2">
                <StatTile
                  label={me.stats.uncovered}
                  value={Math.round(stats.shareUncovered * 1000) / 10}
                  decimals={1}
                  suffix={me.stats.percent}
                  accent
                  className="col-span-2"
                />
                <StatTile
                  label={me.stats.miles}
                  value={stats.milesOnT}
                  decimals={1}
                  suffix={me.stats.milesSuffix}
                />
                <StatTile
                  label={me.stats.stations(stats.stationsTotal)}
                  value={stats.stationsVisited}
                />
                <StatTile label={me.stats.stops} value={stats.stops} />
                <StatTile label={me.stats.lines} value={stats.linesRidden.length} />
                <StatTile label={me.stats.nights} value={stats.nightsOut} />
              </dl>
            </section>
            <section aria-labelledby="badges" className="flex flex-col gap-3">
              <h2 id="badges" className="text-sm font-bold text-ink-muted">
                {me.badges.title}
              </h2>
              {earned.length === 0 ? (
                <p className="text-sm">{me.badges.empty}</p>
              ) : (
                <ul className="flex flex-col divide-y divide-rule rounded-lg bg-surface shadow-sm">
                  {earned.map((b) => (
                    <li key={b.key} className="flex flex-col gap-1 px-4 py-3">
                      <BadgeChip name={b.name} earned className="self-start" />
                      {b.description && <p className="text-sm text-ink-muted">{b.description}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <p role="alert" className="text-sm text-danger">
            {me.stats.error}
          </p>
        )}
        <section
          aria-labelledby="code-label"
          className="flex flex-col gap-2 rounded-lg bg-surface p-4 shadow-sm"
        >
          <h2 id="code-label" className="text-sm font-bold">
            {m.codeLabel}
          </h2>
          <p className="text-2xl font-extrabold tracking-wide" data-testid="profile-code">
            {formatProfileCode(profile.profileCode)}
          </p>
          <p className="text-sm text-ink-muted">{m.codeHelp}</p>
        </section>
        <nav aria-label={app.more.label}>
          <ul className="flex flex-col divide-y divide-rule rounded-lg bg-surface shadow-sm">
            {[
              { href: "/me/squad", label: squad.open, icon: UsersRound },
              { href: "/me/settings", label: me.settings.open, icon: Settings },
              { href: "/calm", label: app.more.calm, icon: Ear },
              { href: "/how-it-works", label: app.more.howItWorks, icon: Info },
            ].map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="flex min-h-12 items-center gap-3 px-4 font-semibold">
                  <Icon aria-hidden="true" className="size-5 text-accent" />
                  <span className="flex-1">{label}</span>
                  <ChevronRight aria-hidden="true" className="size-5 text-ink-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
      <BottomNav />
    </div>
  );
}
