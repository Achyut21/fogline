"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { demo } from "@/copy";
import { startDemo, type DemoState } from "@/server/actions/demo";

export function DemoStart() {
  const [state, action, pending] = useActionState<DemoState>(startDemo, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      {state && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {demo.page[state.error]}
        </p>
      )}
      <Button size="lg" type="submit" disabled={pending} className="w-full">
        {pending ? demo.page.starting : demo.page.start}
      </Button>
    </form>
  );
}
