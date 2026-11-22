import { redirect } from "next/navigation";
import { app } from "@/copy";
import { currentProfile } from "@/server/profile";

// New visitors start onboarding (F1.1). The map replaces this screen in Phase 3 item 2.
export default async function Home() {
  if (!(await currentProfile())) redirect("/welcome");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight">{app.name}</h1>
      <p className="text-balance text-ink-muted">{app.homeBody}</p>
    </main>
  );
}
