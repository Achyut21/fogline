import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// A still placeholder block. The region that is loading carries aria-busy, not the blocks.
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn("rounded-md bg-surface-sunken", className)}
      {...props}
    />
  );
}
