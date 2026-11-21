"use client";

import { StatusPage } from "@/components/system/status-page";
import { Button } from "@/components/ui/button";
import { app, system } from "@/copy";
import "./globals.css";

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <title>{app.name}</title>
        <StatusPage title={system.appError.title} body={system.appError.body}>
          <Button size="lg" onClick={retry}>
            {system.appError.retry}
          </Button>
        </StatusPage>
      </body>
    </html>
  );
}
