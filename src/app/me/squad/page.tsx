import { UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SquadView } from "@/components/squad/squad-view";
import { EmptyState } from "@/components/system/empty-state";
import { Button } from "@/components/ui/button";
import { squad } from "@/copy";
import { mySquad } from "@/server/actions/squad";
import { mapLines, mapStations } from "@/server/network";

export const metadata: Metadata = { title: squad.pageTitle };

export default async function SquadPage() {
  const data = await mySquad();
  if (!data) redirect("/welcome");
  if (data.members.length < 2) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 pt-safe">
        <EmptyState
          icon={UsersRound}
          title={squad.empty.title}
          body={squad.empty.body}
          action={
            <Button asChild>
              <Link href="/plans/new">{squad.empty.action}</Link>
            </Button>
          }
        />
      </main>
    );
  }
  return <SquadView squad={data} lines={mapLines} stations={mapStations} />;
}
