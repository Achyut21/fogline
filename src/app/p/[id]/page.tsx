import { CalendarX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PlanView } from "@/components/plans/plan-view";
import { EmptyState } from "@/components/system/empty-state";
import { Button } from "@/components/ui/button";
import { plans } from "@/copy";
import { planByInvite } from "@/server/actions/plans";
import { currentProfile } from "@/server/profile";

export const metadata: Metadata = { title: plans.plan.pageTitle, robots: { index: false } };

// A plan by its invite link (F4.8): `/p/[planId]?t=[invite_token]`. The token is what grants
// access; the ID must match it so a link can't be pointed at another plan.
export default async function PlanPage({ params, searchParams }: PageProps<"/p/[id]">) {
  const { id } = await params;
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : null;
  const plan = token ? await planByInvite(token) : null;
  if (!token || !plan || plan.id !== id) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4">
        <EmptyState
          icon={CalendarX}
          title={plans.plan.notFound.title}
          body={plans.plan.notFound.body}
          action={
            <Button asChild variant="secondary">
              <Link href="/plans">{plans.plan.back}</Link>
            </Button>
          }
        />
      </main>
    );
  }
  const profile = await currentProfile();
  return <PlanView plan={plan} token={token} signedIn={profile !== null} />;
}
