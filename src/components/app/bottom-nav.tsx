"use client";

import { CalendarCheck, CircleUser, Map, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { app } from "@/copy";

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
export function BottomNav({ path }: { path?: string }) {
  const pathname = usePathname();
  const current = path ?? pathname;
  return (
    <nav aria-label={app.nav.label} className="border-t border-rule bg-surface pb-safe">
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
    </nav>
  );
}
