"use client";

import { motion, useReducedMotionConfig } from "motion/react";
import { recap } from "@/copy";
import { clock } from "@/copy/plans";
import { duration, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Arrival = { profileId: string; name: string; at: string };

// 1st in the middle and tallest, 2nd on the left, last on the right (DESIGN section 9, the 2D
// podium). The blocks rise one after another, last to first; with reduced motion they fade in.
const order = [
  { place: 1, height: "h-20" },
  { place: 0, height: "h-28" },
  { place: 2, height: "h-14" },
] as const;

export function Podium({ arrivals }: { arrivals: readonly Arrival[] }) {
  const reduce = useReducedMotionConfig();
  return (
    <ol aria-labelledby="arrivals" className="grid grid-cols-3 items-end gap-2">
      {order.map(({ place, height }, i) => {
        const a = arrivals[place];
        if (!a) return <li key={place} aria-hidden="true" />;
        return (
          <motion.li
            key={a.profileId}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduce
                ? { duration: duration.fast }
                : { ...spring.bouncy, delay: (order.length - i) * duration.fast }
            }
            className="flex flex-col items-center gap-1 text-center"
          >
            <span className="w-full truncate text-sm font-bold">{a.name}</span>
            <span className="text-xs text-ink-muted tabular-nums">{clock(new Date(a.at))}</span>
            <span
              className={cn(
                "flex w-full items-start justify-center rounded-t-md pt-2 text-lg font-extrabold",
                height,
                place === 0 ? "bg-accent text-accent-ink" : "bg-surface-sunken text-ink",
              )}
            >
              {recap.places[place]}
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}
