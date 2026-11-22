import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized } from "@/server/cron";
import { log } from "@/lib/log";
import { getDb } from "@/server/db/client";
import { cleanupDemo } from "@/server/demo";

// Vercel Cron, hourly: deletes demo copies older than 24 hours (F16.2).

const headers = { "cache-control": "no-store" };

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  }
  const profiles = await cleanupDemo(getDb());
  log.info("cleanup-demo deleted demo copies", { profiles });
  return NextResponse.json({ profiles }, { headers });
}
