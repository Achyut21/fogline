import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { redirect } from "next/navigation";
import { FindFood } from "@/components/find/find-food";
import { find, plans } from "@/copy";
import { mapLines, mapStations } from "@/server/network";
import { currentProfile } from "@/server/profile";

export const metadata: Metadata = { title: find.pageTitle };

export default async function FindPage() {
  if (!(await currentProfile())) redirect("/welcome");
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <PageHeader back={{ href: "/plans", label: plans.plan.back }} />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-safe">
        <h1 className="text-2xl font-extrabold tracking-tight">{find.title}</h1>
        <FindFood lines={mapLines} stations={mapStations} />
      </main>
    </div>
  );
}
