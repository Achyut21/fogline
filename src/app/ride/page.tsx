import { ArrowLeft, TrainFront } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isLine, LineBadge } from "@/components/display/line-badge";
import { EmptyState } from "@/components/system/empty-state";
import { Button } from "@/components/ui/button";
import { ride } from "@/copy";
import { getDb } from "@/server/db/client";
import { currentProfile } from "@/server/profile";
import { recordedRides } from "@/server/replay";
import { stationById } from "@/server/stations";

export const metadata: Metadata = { title: ride.pageTitle };

const query = z.object({ from: z.string().max(40) });

// Recorded trips to replay from a station (F3.5), opened from its sheet's Ride button.
export default async function RidePage({ searchParams }: PageProps<"/ride">) {
  const profile = await currentProfile();
  if (!profile) redirect("/welcome");
  const parsed = query.safeParse(await searchParams);
  const station = parsed.success ? stationById(parsed.data.from) : undefined;
  if (!station) redirect("/");
  const trips = await recordedRides(getDb(), station.id);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center gap-2 px-2 pt-safe">
        <Button variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft aria-hidden="true" />
            {ride.back}
          </Link>
        </Button>
      </header>
      <main className="flex flex-1 flex-col gap-4 px-4 pb-safe">
        <h1 className="text-2xl font-extrabold tracking-tight">{ride.list.title(station.name)}</h1>
        <p className="text-ink-muted">{ride.list.body}</p>
        {trips.length === 0 ? (
          <EmptyState icon={TrainFront} title={ride.list.empty.title} body={ride.list.empty.body} />
        ) : (
          <ul className="flex flex-col divide-y divide-rule rounded-lg bg-surface shadow-sm">
            {trips.map((trip) => {
              const last = trip.stops[trip.stops.length - 1];
              const total = Math.round((last.at.getTime() - trip.stops[0].at.getTime()) / 60_000);
              return (
                <li key={trip.tripId}>
                  <Link
                    href={`/ride/${encodeURIComponent(trip.tripId)}?from=${encodeURIComponent(station.id)}`}
                    className="flex min-h-11 items-center gap-3 px-4 py-3"
                  >
                    {isLine(trip.route) && <LineBadge line={trip.route} />}
                    <span className="flex flex-1 flex-col">
                      <span className="font-bold">
                        {ride.list.trip(stationById(last.station)?.name ?? last.station)}
                      </span>
                      <span className="text-sm text-ink-muted">
                        {ride.list.detail(trip.stops[0].at, trip.stops.length - 1, total)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
