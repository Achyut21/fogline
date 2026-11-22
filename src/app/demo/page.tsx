import type { Metadata } from "next";
import { DemoStart } from "@/components/app/demo-start";
import Link from "next/link";
import { DemoChip } from "@/components/system/demo-chip";
import { currentProfile } from "@/server/profile";
import { demo } from "@/copy";

export const metadata: Metadata = { title: demo.page.title };

export default async function DemoPage() {
  const profile = await currentProfile();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-4 pt-safe pb-safe">
      <DemoChip className="self-start" />
      <h1 className="text-2xl font-extrabold tracking-tight">{demo.page.title}</h1>
      <p className="text-ink-muted">{demo.page.body}</p>
      {profile && !profile.isDemo && (
        <p role="status" className="rounded-md bg-surface-sunken px-4 py-3 text-sm">
          {demo.page.signedIn(profile.displayName)}{" "}
          <Link href="/me" className="font-bold underline">
            {demo.page.me}
          </Link>
        </p>
      )}
      <DemoStart />
    </main>
  );
}
