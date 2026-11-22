"use client";

import { Inbox, LocateFixed, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { BottomNav } from "@/components/app/bottom-nav";
import { DemoChip } from "@/components/system/demo-chip";
import { EmptyState } from "@/components/system/empty-state";
import { ErrorState } from "@/components/system/error-state";
import { OfflineBanner } from "@/components/system/offline-banner";
import { StaleChip } from "@/components/system/stale-chip";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  sheetSnaps,
} from "@/components/ui/drawer";
import { FilterChips } from "@/components/ui/filter-chips";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { Stepper } from "@/components/ui/stepper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { design } from "@/copy";

const d = design.demo;

const views = [
  { value: "map", label: d.views.map },
  { value: "list", label: d.views.list },
] as const;

const chips = [
  { value: "food", label: d.chips.food },
  { value: "bars", label: d.chips.bars },
  { value: "music", label: d.chips.music },
  { value: "late", label: d.chips.late },
] as const;

type Chip = (typeof chips)[number]["value"];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold text-ink-muted">{title}</h3>
      {children}
    </div>
  );
}

export function ComponentsDemo() {
  const [view, setView] = useState<"map" | "list">("map");
  const [friends, setFriends] = useState(4);
  const [filters, setFilters] = useState<ReadonlySet<Chip>>(new Set(["food"]));
  const [snap, setSnap] = useState<number | string | null>(sheetSnaps[0]);

  function toggle(chip: Chip) {
    setFilters((current) => {
      const next = new Set(current);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-ink-muted">{design.sampleNote}</p>

      <Group title={d.buttons}>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">{d.primary}</Button>
          <Button variant="secondary">{d.secondary}</Button>
          <Button variant="ghost">{d.ghost}</Button>
          <Button variant="danger">{d.danger}</Button>
          <Button disabled>{d.disabled}</Button>
        </div>
      </Group>

      <Group title={d.iconButtons}>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex justify-center rounded-lg bg-(--map-land) p-4">
            <IconButton label={d.locate} icon={LocateFixed} tone="raised" />
          </div>
          <div className="flex justify-center rounded-lg bg-surface p-4">
            <IconButton label={d.close} icon={X} />
          </div>
        </div>
      </Group>

      <Group title={d.inputs}>
        <div className="flex flex-col gap-4 rounded-lg bg-surface p-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold">{d.nameLabel}</span>
            <Input placeholder={d.namePlaceholder} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold">{d.codeLabel}</span>
            <Input
              aria-invalid="true"
              aria-describedby="code-error"
              defaultValue={d.codeValue}
              className="h-14 text-2xl font-extrabold tracking-wide"
            />
            <span id="code-error" className="text-sm text-danger">
              {d.codeError}
            </span>
          </label>
        </div>
      </Group>

      <Group title={d.controls}>
        <SegmentedControl
          label={d.viewLabel}
          options={views}
          value={view}
          onValueChange={setView}
        />
        <Tabs defaultValue="upcoming">
          <TabsList aria-label={d.tabsLabel}>
            <TabsTrigger value="upcoming">{d.tabs.upcoming}</TabsTrigger>
            <TabsTrigger value="past">{d.tabs.past}</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming">{d.tabBody.upcoming}</TabsContent>
          <TabsContent value="past">{d.tabBody.past}</TabsContent>
        </Tabs>
        <Stepper label={d.groupLabel} value={friends} min={2} max={8} onValueChange={setFriends} />
        <FilterChips label={d.chipsLabel} chips={chips} selected={filters} onToggle={toggle} />
      </Group>

      <Group title={d.sheetsAndToasts}>
        <div className="flex flex-wrap gap-3">
          <Drawer
            snapPoints={sheetSnaps}
            activeSnapPoint={snap}
            setActiveSnapPoint={setSnap}
            fadeFromIndex={1}
          >
            <DrawerTrigger asChild>
              <Button variant="secondary">{d.openSheet}</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="flex-row items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <DrawerTitle>{d.sheetTitle}</DrawerTitle>
                  <DrawerDescription>{d.sheetBody}</DrawerDescription>
                </div>
                <DrawerClose asChild>
                  <IconButton label={d.close} icon={X} />
                </DrawerClose>
              </DrawerHeader>
            </DrawerContent>
          </Drawer>
          <Button variant="secondary" onClick={() => toast(d.toast, { description: d.toastBody })}>
            {d.showToast}
          </Button>
        </div>
      </Group>

      <Group title={d.states}>
        <div aria-busy="true" className="flex flex-col gap-2 rounded-lg bg-surface p-4">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-11 w-full rounded-full" />
        </div>
        <div className="rounded-lg bg-surface">
          <EmptyState
            icon={Inbox}
            title={d.emptyTitle}
            body={d.emptyBody}
            action={<Button>{d.emptyAction}</Button>}
          />
        </div>
        <div className="rounded-lg bg-surface">
          <ErrorState title={d.errorTitle} body={d.errorBody} onRetry={() => toast(d.retrying)} />
        </div>
        <div className="overflow-hidden rounded-lg">
          <OfflineBanner offline />
        </div>
      </Group>

      <Group title={d.statusChips}>
        <div className="flex flex-wrap gap-2">
          <StaleChip minutes={0} stale={false} />
          <StaleChip minutes={6} stale />
          <DemoChip />
        </div>
      </Group>

      <Group title={d.nav}>
        {/* The transform makes this frame the fixed nav's containing block. */}
        <div className="transform-gpu overflow-hidden rounded-lg">
          <BottomNav path="/" />
        </div>
      </Group>
    </div>
  );
}
