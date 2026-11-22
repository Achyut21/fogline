"use client";

import { animate, motion, useMotionValue, useReducedMotionConfig } from "motion/react";
import { useLayoutEffect } from "react";
import { duration, ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useStage } from "./reveal";

function formatStat(value: number, decimals: number, suffix: string) {
  const digits = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  return value.toLocaleString("en-US", digits) + suffix;
}

// Counts up to `value` over duration.count (F8.4), starting when its RevealStage does. Screen
// readers get the final value at once, and an invisible copy of it holds the width so the digits
// don't shift as they count. With the OS set to reduced motion, CSS shows that copy instead, so the
// server HTML already has the final value.
export function StatCounter({
  value,
  decimals = 0,
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const reduce = useReducedMotionConfig();
  const { delay, skipped } = useStage();
  const instant = reduce || skipped;
  const count = useMotionValue(0);
  const text = useMotionValue(formatStat(0, decimals, suffix));
  const final = formatStat(value, decimals, suffix);

  useLayoutEffect(() => {
    if (instant) {
      count.jump(value);
      text.jump(formatStat(value, decimals, suffix));
      return;
    }
    const controls = animate(count, value, {
      duration: duration.count,
      ease: ease.standard,
      delay,
      onUpdate: (latest) => text.set(formatStat(latest, decimals, suffix)),
    });
    return () => controls.stop();
  }, [count, text, value, decimals, suffix, instant, delay]);

  return (
    <span className={cn("inline-grid tabular-nums", className)}>
      <span className="sr-only">{final}</span>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 motion-reduce:visible">
        {final}
      </span>
      <motion.span
        aria-hidden="true"
        className="col-start-1 row-start-1 text-right motion-reduce:invisible"
      >
        {text}
      </motion.span>
    </span>
  );
}
