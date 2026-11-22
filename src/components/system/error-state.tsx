import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { system } from "@/copy";

// A failed load inside a screen. `body` says what failed and what still works (COPY.md rule 6).
export function ErrorState({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-sunken text-danger">
        <TriangleAlert aria-hidden="true" className="size-6" />
      </span>
      <h3 className="text-xl font-extrabold tracking-tight">{title}</h3>
      <p className="max-w-prose text-ink-muted">{body}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {system.error.retry}
        </Button>
      )}
    </div>
  );
}
