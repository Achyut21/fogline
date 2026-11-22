import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { onboarding } from "@/copy";
import { currentProfile } from "@/server/profile";
import { RestoreForm } from "./restore-form";

export const metadata: Metadata = { title: onboarding.restore.title };

export default async function RestorePage() {
  if (await currentProfile()) redirect("/");
  return <RestoreForm />;
}
