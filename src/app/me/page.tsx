import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/app/bottom-nav";
import { onboarding } from "@/copy";
import { currentProfile } from "@/server/profile";
import { formatProfileCode } from "@/server/profile-code";
import { stationById } from "@/server/stations";

const m = onboarding.me;

export const metadata: Metadata = { title: m.title };

export default async function MePage() {
  const profile = await currentProfile();
  if (!profile) redirect("/welcome");
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
      </main>
      <BottomNav />
    </div>
  );
}
