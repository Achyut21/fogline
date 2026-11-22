import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { departuresFrom } from "@/lib/predictions";
import { currentTrips } from "@/server/predictions";
import { stationById, stationOfStop } from "@/server/stations";

// Next departures from one station (F2.5, F3.1). Times are absolute, so a response stays right
// while it is cached; `updatedAt` is the feed's own timestamp, which the sheet shows as its age.

const query = z.object({ station: z.string().max(40) });

export async function GET(request: NextRequest) {
  const parsed = query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  const station = parsed.success ? stationById(parsed.data.station) : undefined;
  if (!station) {
    return NextResponse.json(
      { error: "unknown station" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
  const trips = await currentTrips();
  if (!trips) {
    return NextResponse.json(
      { error: "feed unavailable" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
  const departures = departuresFrom(
    trips.trips,
    station.id,
    stationOfStop,
    Math.floor(Date.now() / 1000),
  );
  return NextResponse.json(
    { station: station.id, updatedAt: trips.updatedAt, departures },
    { headers: { "cache-control": "public, max-age=0, s-maxage=5" } },
  );
}
