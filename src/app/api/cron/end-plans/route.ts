import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized } from "@/server/cron";
import { log } from "@/lib/log";
import { getDb } from "@/server/db/client";
import { endDuePlans } from "@/server/end-plans";

// Vercel Cron, every 15 minutes: ends plans by F6.4's automatic rules and awards their badges.

const headers = { "cache-control": "no-store" };

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  }
  const ended = await endDuePlans(getDb(), new Date());
  log.info("end-plans ended plans", { ended: ended.length });
  return NextResponse.json({ ended: ended.length }, { headers });
}
