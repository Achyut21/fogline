import { CalendarPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/app/bottom-nav";
import { EmptyState } from "@/components/system/empty-state";
import { Button } from "@/components/ui/button";
import { plans } from "@/copy";
import { getDb } from "@/server/db/client";
import { myPlans, type PlanSummary } from "@/server/plans";
import { currentProfile } from "@/server/profile";

export const metadata: Metadata = { title: plans.pageTitle };

const l = plans.list;

function PlanList({ title, items }: { title: string; items: PlanSummary[] }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-bold text-ink-muted">{title}</h2>
      <ul className="flex flex-col divide-y divide-rule rounded-lg bg-surface shadow-sm">
        {items.map((plan) => (
          <li key={plan.id}>
            <Link
              href={`/p/${plan.id}?t=${plan.inviteToken}`}
              className="flex min-h-11 flex-col gap-1 px-4 py-3"
            >
              <span className="font-bold">{plan.title}</span>
              <span className="text-sm text-ink-muted">
                {l.when(plan.startsAt)} · {l.people(plan.people)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function PlansPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/welcome");
  const { upcoming, past } = await myPlans(getDb(), profile.id);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex flex-1 flex-col gap-6 px-4 pt-safe pb-6">
        <div className="flex items-center justify-between gap-3 pt-4">
          <h1 className="text-2xl font-extrabold tracking-tight">{l.title}</h1>
          <Button asChild>
            <Link href="/plans/new">
              <CalendarPlus aria-hidden="true" />
              {l.new}
            </Link>
          </Button>
        </div>
        {upcoming.length + past.length === 0 ? (
          <EmptyState
            icon={Users}
            title={l.empty.title}
            body={l.empty.body}
            action={
              <Button asChild>
                <Link href="/plans/new">{l.new}</Link>
              </Button>
            }
          />
        ) : (
          <>
            <PlanList title={l.upcoming} items={upcoming} />
            <PlanList title={l.past} items={past} />
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
