import { cn } from "@/lib/utils";

// The map's station circle at list size: a --halo body with an ink ring, as the canvas draws
// stations on the map. Transfer stations are drawn larger, 4 to 3 as on the map.
export function StationDot({
  transfer = false,
  className,
}: {
  transfer?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0 rounded-full border-2 border-ink bg-(--halo)",
        transfer ? "size-4" : "size-3",
        className,
      )}
    />
  );
}
