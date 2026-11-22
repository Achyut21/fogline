import { DemoMark } from "@/components/app/demo-mark";
import { TrainFront } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { RideReplay } from "@/components/ride/ride-replay";
import { EmptyState } from "@/components/system/empty-state";
import { Button } from "@/components/ui/button";
import { ride } from "@/copy";
import { rideMiles } from "@/lib/geo/miles";
import { getDb } from "@/server/db/client";
import { currentProfile } from "@/server/profile";
import { data } from "@/server/data";
import { recordedRide } from "@/server/replay";
import { stopCard } from "@/server/station-sheet";
import { stationById } from "@/server/stations";

export const metadata: Metadata = { title: ride.pageTitle };

const query = z.object({ from: z.string().max(40) });

// A recorded trip played back from the station the rider picked (F3.5).
export default async function ReplayPage({ params, searchParams }: PageProps<"/ride/[trip]">) {
  const profile = await currentProfile();
  if (!profile) redirect("/welcome");
  const { trip } = await params;
  const parsed = query.safeParse(await searchParams);
  if (!parsed.success) redirect("/");
  const from = parsed.data.from;
  const recorded = await recordedRide(getDb(), decodeURIComponent(trip), from);
  if (!recorded) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4">
        <DemoMark className="self-center" />
        <EmptyState
          icon={TrainFront}
          title={ride.notFound.title}
          body={ride.notFound.body}
          action={
            <Button asChild variant="secondary">
              <Link href={`/ride?from=${encodeURIComponent(from)}`}>{ride.back}</Link>
            </Button>
          }
        />
      </main>
    );
  }
  const name = (id: string) => stationById(id)?.name ?? id;
  const last = recorded.stops[recorded.stops.length - 1].station;
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <RideReplay
        tripId={recorded.tripId}
        from={from}
        route={recorded.route}
        destination={name(last)}
        stops={recorded.stops.map((s, i) => ({
          station: s.station,
          name: name(s.station),
          at: s.at.getTime(),
          card: stopCard(s.station),
          miles: i === 0 ? 0 : rideMiles(data.shapes(), recorded.route, from, s.station),
        }))}
      />
    </div>
  );
}
