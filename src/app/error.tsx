"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StatusPage } from "@/components/system/status-page";
import { Button } from "@/components/ui/button";
import { system } from "@/copy";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  const onHomePage = usePathname() === "/";
  return (
    <StatusPage title={system.error.title} body={system.error.body}>
      <Button size="lg" onClick={retry}>
        {system.error.retry}
      </Button>
      {!onHomePage && (
        <Button asChild size="lg" variant="outline">
          <Link href="/">{system.error.home}</Link>
        </Button>
      )}
    </StatusPage>
  );
}
