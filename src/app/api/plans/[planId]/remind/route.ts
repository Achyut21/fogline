import { NextResponse } from "next/server";
import { z } from "zod";
import { reminder as copy } from "@/copy";
import { getDb } from "@/server/db/client";
import { reminderFor } from "@/server/reminder";
import { sessionProfileId } from "@/server/session";

// "Remind me" (F5.8): the signed-in participant's leave-by as a calendar file. The plan page links
// here; the browser sends the session cookie, and nobody else gets the file.

const headers = { "cache-control": "private, no-store" };

export async function GET(_: Request, { params }: { params: Promise<{ planId: string }> }) {
  const parsed = z.uuid().safeParse((await params).planId);
  if (!parsed.success) return NextResponse.json({ error: "not-found" }, { status: 404, headers });
  const me = await sessionProfileId();
  if (!me) return NextResponse.json({ error: "no-profile" }, { status: 401, headers });
  const result = await reminderFor(getDb(), parsed.data, me, new Date());
  if (result.kind === "not-found") {
    return NextResponse.json({ error: "not-found" }, { status: 404, headers });
  }
  if (result.kind !== "ics") {
    return NextResponse.json({ error: result.kind }, { status: 409, headers });
  }
  return new Response(result.body, {
    headers: {
      ...headers,
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${copy.filename}"`,
    },
  });
}
