import { grades } from "@/copy";
import { cn } from "@/lib/utils";

/**
 * A food spot's unofficial grade and its inspection date (F11.1), or "No inspection match" for a
 * food spot with no record (F11.4). The unofficial label (F11.3) goes once under each list.
 */
export function GradeBadge({
  letter,
  inspected,
  className,
}: {
  letter: string | null;
  inspected: string | null;
  className?: string;
}) {
  if (!letter || !inspected) {
    return <span className={cn("text-sm text-ink-muted", className)}>{grades.noMatch}</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <span
        aria-hidden="true"
        className="flex size-6 items-center justify-center rounded-full border-2 border-ink text-xs font-extrabold"
      >
        {letter}
      </span>
      <span>
        <span className="font-bold">{grades.letter(letter)}</span>
        <span className="text-ink-muted">, {grades.inspected(inspected)}</span>
      </span>
    </span>
  );
}
