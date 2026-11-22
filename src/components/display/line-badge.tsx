import { display } from "@/copy";
import { cn } from "@/lib/utils";

// GTFS route ids, plus the Green Line trunk for stations every branch shares.
export const lines = [
  "Red",
  "Orange",
  "Blue",
  "Green",
  "Green-B",
  "Green-C",
  "Green-D",
  "Green-E",
  "Mattapan",
] as const;

export type Line = (typeof lines)[number];

export const isLine = (route: string): route is Line => lines.some((line) => line === route);

// The line's own color as a fill, for lines and dots drawn in it.
export const lineFill: Record<Line, string> = {
  Red: "bg-line-red",
  Orange: "bg-line-orange",
  Blue: "bg-line-blue",
  Green: "bg-line-green",
  "Green-B": "bg-line-green",
  "Green-C": "bg-line-green",
  "Green-D": "bg-line-green",
  "Green-E": "bg-line-green",
  Mattapan: "bg-line-red",
};

const green = "bg-line-green text-line-ink";

// White fails AA on orange, so orange takes --line-ink-orange (DESIGN section 4). Mattapan is red.
const colors: Record<Line, string> = {
  Red: "bg-line-red text-line-ink",
  Orange: "bg-line-orange text-line-ink-orange",
  Blue: "bg-line-blue text-line-ink",
  Green: green,
  "Green-B": green,
  "Green-C": green,
  "Green-D": green,
  "Green-E": green,
  Mattapan: "bg-line-red text-line-ink",
};

export function LineBadge({ line, className }: { line: Line; className?: string }) {
  const { short, name } = display.lines[line];
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-2 text-xs font-extrabold",
        colors[line],
        className,
      )}
    >
      <span aria-hidden="true">{short}</span>
      <span className="sr-only">{name}</span>
    </span>
  );
}
