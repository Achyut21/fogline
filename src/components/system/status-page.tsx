import type { ReactNode } from "react";
import { DemoMark } from "@/components/app/demo-mark";

export function StatusPage({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <DemoMark />
      <h1 className="text-2xl font-extrabold tracking-tight text-balance">{title}</h1>
      <p className="max-w-sm text-balance text-muted-foreground">{body}</p>
      <div className="flex items-center gap-2">{children}</div>
    </main>
  );
}
