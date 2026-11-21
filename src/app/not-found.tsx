import Link from "next/link";
import { StatusPage } from "@/components/system/status-page";
import { Button } from "@/components/ui/button";
import { system } from "@/copy";

export default function NotFound() {
  return (
    <StatusPage title={system.notFound.title} body={system.notFound.body}>
      <Button asChild size="lg">
        <Link href="/">{system.notFound.home}</Link>
      </Button>
    </StatusPage>
  );
}
