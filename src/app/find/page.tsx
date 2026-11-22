import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FindFood } from "@/components/find/find-food";
import { Button } from "@/components/ui/button";
import { find, plans } from "@/copy";
import { mapLines, mapStations } from "@/server/network";
import { currentProfile } from "@/server/profile";

export const metadata: Metadata = { title: find.pageTitle };

export default async function FindPage() {
  if (!(await currentProfile())) redirect("/welcome");
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center gap-2 px-2 pt-safe">
        <Button variant="ghost" asChild>
          <Link href="/plans">
            <ArrowLeft aria-hidden="true" />
            {plans.plan.back}
          </Link>
        </Button>
      </header>
      <main className="flex flex-1 flex-col gap-4 px-4 pb-safe">
        <h1 className="text-2xl font-extrabold tracking-tight">{find.title}</h1>
        <FindFood lines={mapLines} stations={mapStations} />
      </main>
    </div>
  );
}
