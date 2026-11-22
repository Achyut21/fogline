"use client";

import { CircleCheck, Info, Loader, OctagonX, TriangleAlert } from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// Toasts sit at the top, clear of the bottom nav and sheets, on the toast layer.
function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="top-center"
      className="z-(--layer-toast)"
      icons={{
        success: <CircleCheck className="size-5 text-success" />,
        info: <Info className="size-5 text-accent" />,
        warning: <TriangleAlert className="size-5 text-warning" />,
        error: <OctagonX className="size-5 text-danger" />,
        loading: <Loader className="size-5 text-ink-muted" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-md bg-surface-raised px-4 py-3 text-ink shadow-md",
          title: "text-base font-bold",
          description: "text-sm text-ink-muted",
          actionButton:
            "ml-auto h-11 rounded-full bg-accent px-4 text-base font-bold text-accent-ink",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
