import Link from "next/link";
import { ReloadButton } from "@/components/system/reload-button";
import { Button } from "@/components/ui/button";
import { StatusPage } from "@/components/system/status-page";
import { system } from "@/copy";

export default function OfflinePage() {
  return (
    <StatusPage title={system.offline.title} body={system.offline.body}>
      <ReloadButton label={system.offline.retry} />
      <Button asChild variant="ghost">
        <Link href="/">{system.offline.map}</Link>
      </Button>
    </StatusPage>
  );
}
