import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// What a screen shows when it has nothing yet: what's missing and the one step that fills it.
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <h3 className="text-xl font-extrabold tracking-tight">{title}</h3>
      <p className="max-w-prose text-ink-muted">{body}</p>
      {action}
    </div>
  );
}
