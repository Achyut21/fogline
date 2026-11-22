import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized } from "@/server/cron";
import { log } from "@/lib/log";
import { weeklyCronDue } from "@/lib/weekly";
import { getDb } from "@/server/db/client";
import { makeWeeklyPlans } from "@/server/weekly";

// Vercel Cron, Mondays at 10:00 and 11:00 UTC (F10.4). It works only in the run that's 6 AM in
// New York, which one of the two is in both EST and EDT (ARCHITECTURE section 11).

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
