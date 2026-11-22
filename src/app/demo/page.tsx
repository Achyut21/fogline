import type { Metadata } from "next";
import { DemoStart } from "@/components/app/demo-start";
import { DemoChip } from "@/components/system/demo-chip";
import { demo } from "@/copy";

export const metadata: Metadata = { title: demo.page.title };

export default function DemoPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-4 pt-safe pb-safe">
      <DemoChip />
      <h1 className="text-2xl font-extrabold tracking-tight">{demo.page.title}</h1>
      <p className="text-ink-muted">{demo.page.body}</p>
      <DemoStart />
    </main>
  );
}
