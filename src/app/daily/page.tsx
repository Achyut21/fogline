import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/app/bottom-nav";
import { DailyPuzzle } from "@/components/daily/daily-puzzle";
import { daily } from "@/copy";
import { dailyState } from "@/server/daily";
import { getDb } from "@/server/db/client";
import { currentProfile } from "@/server/profile";

export const metadata: Metadata = { title: daily.pageTitle };

export default async function DailyPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/welcome");
  const state = await dailyState(getDb(), profile);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <DailyPuzzle initial={state} />
      <BottomNav />
    </div>
  );
}
