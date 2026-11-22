import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/app/bottom-nav";
import { MapScreen } from "@/components/map/map-screen";
import { map } from "@/copy";
import { mapData } from "@/server/map-data";
import { currentProfile } from "@/server/profile";

export const metadata: Metadata = { title: map.pageTitle };

// The map home. New visitors start onboarding (F1.1).
export default async function Home() {
  const profile = await currentProfile();
  if (!profile) redirect("/welcome");
  return (
    <div className="flex h-dvh flex-col">
      <MapScreen data={await mapData(profile)} homeStation={profile.homeStationId} />
      <BottomNav />
    </div>
  );
}
