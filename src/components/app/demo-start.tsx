"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { demo } from "@/copy";
import { startDemo } from "@/server/actions/demo";

export function DemoStart() {
  const [, action, pending] = useActionState(startDemo, undefined);
  return (
    <form action={action}>
      <Button size="lg" type="submit" disabled={pending} className="w-full">
        {pending ? demo.page.starting : demo.page.start}
      </Button>
    </form>
  );
}
