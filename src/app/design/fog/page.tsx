import type { Metadata } from "next";
import { fog } from "@/copy";
import { FogPreview } from "./fog-preview";

export const metadata: Metadata = {
  title: fog.previewTitle,
  robots: { index: false, follow: false },
};

export default async function FogPage({ searchParams }: PageProps<"/design/fog">) {
  const params = await searchParams;
  const tier =
    typeof params.tier === "string" && /^[0-3]$/.test(params.tier) ? Number(params.tier) : null;
  return <FogPreview tierOverride={tier} />;
}
