"use client";

import { Button } from "@/components/ui/button";

export function ReloadButton({ label }: { label: string }) {
  return (
    <Button size="lg" onClick={() => window.location.reload()}>
      {label}
    </Button>
  );
}
