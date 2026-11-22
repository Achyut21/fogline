import { NextResponse, type NextRequest } from "next/server";
import { log } from "@/lib/log";
import { zone } from "@/lib/time";
import { getDb } from "@/server/db/client";
import { makeWeeklyPlans } from "@/server/weekly";

// Vercel Cron, Mondays at 10:00 and 11:00 UTC (F10.4). It works only when it's 6 AM Monday in
// New York, which one of the two runs is in both EST and EDT (ARCHITECTURE section 11).

const headers = { "cache-control": "no-store" };
const local = new Intl.DateTimeFormat("en-US", {
  timeZone: zone,
  weekday: "short",
  hour: "numeric",
  hourCycle: "h23",
});

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  }
  const now = new Date();
  const parts = Object.fromEntries(local.formatToParts(now).map((p) => [p.type, p.value]));
  if (parts.weekday !== "Mon" || parts.hour !== "6") {
    return NextResponse.json({ skipped: true }, { headers });
  }
  const added = await makeWeeklyPlans(getDb(), now);
  log.info("weekly-plans made this week's plans", { added });
  return NextResponse.json({ added }, { headers });
}
