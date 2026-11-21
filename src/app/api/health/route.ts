import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { getDb } from "@/server/db/client";
import { timescaleVersion } from "@/server/db/health";

const headers = { "cache-control": "no-store" };

export async function GET() {
  try {
    const timescaledb = (await timescaleVersion(getDb())) !== null;
    return NextResponse.json(
      { db: true, timescaledb },
      { status: timescaledb ? 200 : 503, headers },
    );
  } catch (error) {
    log.error("health check failed", error);
    return NextResponse.json({ db: false, timescaledb: false }, { status: 503, headers });
  }
}
