import { cn } from "@/lib/utils";

// An initial disc. It is decorative: AvatarStack and ParticipantChip carry the name.
export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-base font-extrabold text-ink",
        className,
      )}
    >
      {Array.from(name.trim())[0]?.toUpperCase()}
    </span>
  );
}
