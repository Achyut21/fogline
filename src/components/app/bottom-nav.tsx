"use client";

import { CalendarCheck, CircleUser, Map, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { app } from "@/copy";
import { cn } from "@/lib/utils";
import { DemoChip } from "@/components/system/demo-chip";
import { useDemo } from "./demo-mark";

const tabs: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: app.nav.map, icon: Map },
  { href: "/daily", label: app.nav.daily, icon: CalendarCheck },
  { href: "/plans", label: app.nav.plans, icon: Users },
  { href: "/me", label: app.nav.me, icon: CircleUser },
];

function isCurrent(href: string, path: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}

// The four tabs (DESIGN section 5). `path` overrides the current route, for /design.
// The bar is fixed to the screen's bottom edge, and an in-flow spacer of the same height keeps
// content clear of it. Viewport units can't place it: installed iOS apps report the dynamic
// viewport height short by the status bar (WebKit 254868), and an in-flow bar scrolls away on
// long screens. In demo mode the bar gains a top row with the Demo chip, and the spacer grows by
// the same height.
export function BottomNav({ path }: { path?: string }) {
  const pathname = usePathname();
  const current = path ?? pathname;
  const demo = useDemo();
  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "box-content h-14 shrink-0 border-t border-transparent pb-safe",
          demo && "pt-8",
        )}
      />
      <nav
        aria-label={app.nav.label}
        className="fixed inset-x-0 bottom-0 z-(--layer-chips) border-t border-rule bg-surface pb-safe"
      >
        <div className="mx-auto max-w-md">
          {demo && (
            <div className="flex h-8 items-end px-4">
              <DemoChip />
            </div>
          )}
          <ul className="grid grid-cols-4">
            {tabs.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isCurrent(href, current) ? "page" : undefined}
                  className="flex h-14 flex-col items-center justify-center gap-1 text-xs font-semibold text-ink-muted aria-[current=page]:font-bold aria-[current=page]:text-accent"
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}
