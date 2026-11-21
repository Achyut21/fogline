import type { ReactNode } from "react";

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
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      <p className="max-w-sm text-balance text-muted-foreground">{body}</p>
      <div className="flex gap-2">{children}</div>
    </main>
  );
}
