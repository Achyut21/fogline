import { NextResponse, type NextRequest } from "next/server";
import { log } from "@/lib/log";
import { getDb } from "@/server/db/client";
import { vehiclePositions } from "@/server/db/schema";
import { vehicleFeedUrl, vehicleRows } from "@/server/mbta";

// Vercel Cron, every minute: stores each subway train's position in the vehicle_positions
// hypertable for replay (F3.5) and How it works (F15). A rerun of the same minute adds nothing,
// because (vehicle_id, ts) is unique.

const headers = { "cache-control": "no-store" };

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  }
  const response = await fetch(vehicleFeedUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    log.error("record-vehicles: feed answered", new Error(String(response.status)));
    return NextResponse.json({ error: "feed unavailable" }, { status: 502, headers });
  }
  const rows = vehicleRows(await response.json());
  const inserted =
    rows.length === 0
      ? []
      : await getDb()
          .insert(vehiclePositions)
          .values(rows)
          .onConflictDoNothing()
          .returning({ ts: vehiclePositions.ts });
  log.info("record-vehicles stored positions", { seen: rows.length, stored: inserted.length });
  return NextResponse.json({ seen: rows.length, stored: inserted.length }, { headers });
}
