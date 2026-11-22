import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// 16 px text so iOS doesn't zoom. Inputs sit on --surface, where --field-border reaches 3:1; focus
// adds a 1 px accent ring to the 1 px accent border, 2 px in all (DESIGN section 4).
function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-md border border-field-border bg-field px-4 text-base font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-muted focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-1 aria-invalid:ring-danger",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
