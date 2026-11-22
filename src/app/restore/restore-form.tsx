"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { onboarding } from "@/copy";
import { restoreProfile } from "@/server/actions/profile";

const r = onboarding.restore;

export function RestoreForm() {
  const [state, action, pending] = useActionState(restoreProfile, { error: null });
  const [code, setCode] = useState("");
  return (
    <form
      action={action}
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pt-safe pb-safe"
    >
      <header className="flex h-14 items-center">
        <Button asChild variant="ghost" className="-ml-3 px-3">
          <Link href="/welcome">
            <ArrowLeft aria-hidden="true" />
            {onboarding.back}
          </Link>
        </Button>
      </header>
      <div className="flex flex-1 flex-col gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">{r.title}</h1>
        <p className="text-ink-muted">{r.body}</p>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold">{r.label}</span>
          {/* Controlled, so a code that wasn't found stays in the field to fix. */}
          <Input
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={state.error ? true : undefined}
            aria-describedby="code-help"
            className="h-14 text-2xl font-extrabold tracking-wide uppercase"
          />
          <span id="code-help" className="text-sm text-ink-muted">
            {r.help}
          </span>
        </label>
        {state.error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {state.error}
          </p>
        )}
      </div>
      <footer className="pb-4">
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {r.submit}
        </Button>
      </footer>
    </form>
  );
}
