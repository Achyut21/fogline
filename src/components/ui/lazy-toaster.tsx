"use client";

import dynamic from "next/dynamic";

// Toasts only answer things people do, so sonner loads after first paint instead of in every
// page's app shell (PRD section 7's 200 KB budget).
const Toaster = dynamic(() => import("./sonner").then((m) => m.Toaster), { ssr: false });

export function LazyToaster() {
  return <Toaster />;
}
