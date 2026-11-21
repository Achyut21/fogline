import { ReloadButton } from "@/components/system/reload-button";
import { StatusPage } from "@/components/system/status-page";
import { system } from "@/copy";

export default function OfflinePage() {
  return (
    <StatusPage title={system.offline.title} body={system.offline.body}>
      <ReloadButton label={system.offline.retry} />
    </StatusPage>
  );
}
