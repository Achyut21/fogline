import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { SettingsForm } from "@/components/me/settings-form";
import { app, me } from "@/copy";
import { currentProfile } from "@/server/profile";

export const metadata: Metadata = { title: me.settings.title };

export default async function SettingsPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/welcome");
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <PageHeader back={{ href: "/me", label: app.nav.me }} />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-safe">
        <h1 className="text-2xl font-extrabold tracking-tight">{me.settings.title}</h1>
        <SettingsForm ageBand={profile.ageBand} />
      </main>
    </div>
  );
}
