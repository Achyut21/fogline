import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DemoMark } from "./demo-mark";

/**
 * The header of every screen below a tab: a back link to where it came from, then optional
 * actions on the right. The screen's own h1 follows in its content.
 */
export function PageHeader({
  back,
  action,
}: {
  back: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <header className="flex min-h-14 items-center justify-between gap-2 px-2 pt-safe">
      <Button variant="ghost" asChild>
        <Link href={back.href}>
          <ArrowLeft aria-hidden="true" />
          {back.label}
        </Link>
      </Button>
      <div className="flex items-center gap-2 pr-2">
        <DemoMark />
        {action}
      </div>
    </header>
  );
}
