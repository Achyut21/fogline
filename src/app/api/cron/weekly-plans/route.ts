import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized } from "@/server/cron";
import { log } from "@/lib/log";
import { weeklyCronDue } from "@/lib/weekly";
import { getDb } from "@/server/db/client";
import { makeWeeklyPlans } from "@/server/weekly";

// Vercel Cron, Mondays hourly from 10:00 to 16:00 UTC (F10.4). It works from 6 to 11 AM in New
// York, so a failed 6 AM run is retried; once the week's plans exist, later runs change nothing.

const headers = { "cache-control": "no-store" };

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  }
  const now = new Date();
  if (!weeklyCronDue(now)) return NextResponse.json({ skipped: true }, { headers });
  const added = await makeWeeklyPlans(getDb(), now);
  log.info("weekly-plans made this week's plans", { added });
  return NextResponse.json({ added }, { headers });
}
