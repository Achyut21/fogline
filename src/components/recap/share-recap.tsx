"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { recap } from "@/copy";

const r = recap.page;

/** Shares the recap image (F9.3), or downloads it where the browser can't share files. */
export function ShareRecap({ planId, title }: { planId: string; title: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function share() {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/og/recap/${planId}`);
      if (!response.ok) throw new Error(String(response.status));
      const file = new File([await response.blob()], r.imageName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
      } else {
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = r.imageName;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      // Closing the share sheet rejects with AbortError; that isn't a failure.
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (!(e instanceof Error)) throw e;
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" disabled={busy} onClick={share}>
        <Share2 aria-hidden="true" />
        {busy ? r.sharing : r.share}
      </Button>
      {failed && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {r.shareFailed}
        </p>
      )}
    </div>
  );
}
