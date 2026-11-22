"use client";

import { motion } from "motion/react";
import { revealReduce, useEntrance } from "@/components/display/reveal";
import { recap } from "@/copy";
import { clock } from "@/copy/plans";
import { duration, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { recapStage } from "./stages";

type Arrival = { profileId: string; name: string; at: string };

// 1st in the middle and tallest, 2nd on the left, last on the right (DESIGN section 9, the 2D
// podium). The list stays in place order for screen readers; grid columns place the blocks.
// The blocks rise last to first, then the names and times appear.
const slots = [
  { column: "col-start-2", height: "h-28" },
  { column: "col-start-1", height: "h-20" },
  { column: "col-start-3", height: "h-14" },
] as const;

export function Podium({ arrivals }: { arrivals: readonly Arrival[] }) {
  const entrance = useEntrance();
  return (
    <ol aria-labelledby="arrivals" className="grid grid-cols-3 items-end gap-2">
      {arrivals.slice(0, slots.length).map((a, place) => {
        const { column, height } = slots[place];
        return (
          <li
            key={a.profileId}
            className={cn("row-start-1 flex flex-col items-center gap-1 text-center", column)}
          >
            <motion.span
              {...entrance(recapStage.names)}
              className={cn("flex w-full flex-col", revealReduce)}
            >
              <span className="truncate text-sm font-bold">{a.name}</span>
              <span className="text-xs text-ink-muted tabular-nums">{clock(new Date(a.at))}</span>
            </motion.span>
            <motion.span
              {...entrance((slots.length - place) * duration.fast, {
                y: 24,
                transition: spring.bouncy,
              })}
              className={cn(
                "flex w-full items-start justify-center rounded-t-md pt-2 text-lg font-extrabold",
                height,
                place === 0 ? "bg-accent text-accent-ink" : "bg-surface-sunken text-ink",
                revealReduce,
              )}
            >
              {recap.places[place]}
            </motion.span>
          </li>
        );
      })}
    </ol>
  );
}
