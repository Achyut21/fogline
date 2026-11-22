"use client";

import { isServer, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Polled live data (ARCHITECTURE section 4). One client per browser tab, a new one per server
// render. Polling stops on its own while the tab is hidden (refetchIntervalInBackground is off).
function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
}

let browserClient: QueryClient | undefined;

function client() {
  if (isServer) return makeClient();
  browserClient ??= makeClient();
  return browserClient;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client()}>{children}</QueryClientProvider>;
}
