import { app } from "@/copy";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-3xl font-semibold">{app.name}</h1>
      <p className="text-balance text-muted-foreground">{app.homeBody}</p>
    </main>
  );
}
