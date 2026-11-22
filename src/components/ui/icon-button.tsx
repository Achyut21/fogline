import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// A 44 px round button with an icon and no visible text, so `label` is required: it becomes the
// accessible name. "raised" sits on the map, "sunken" inside cards and sheets.
export function IconButton({
  label,
  icon: Icon,
  tone = "sunken",
  className,
  ...props
}: Omit<ComponentProps<"button">, "aria-label" | "children"> & {
  label: string;
  icon: LucideIcon;
  tone?: "sunken" | "raised";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition-transform duration-(--duration-fast) ease-standard active:scale-95 disabled:pointer-events-none disabled:opacity-50 aria-disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100",
        tone === "sunken" ? "bg-surface-sunken" : "bg-surface shadow-md",
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}
