"use client";

import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import { useSyncExternalStore } from "react";
import { display } from "@/copy";
import { duration, ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

const second = 1000;
const minute = 60 * second;

const tones = {
  calm: "text-ink",
  warning: "text-warning",
  danger: "text-danger",
} as const;

// F5.4: warning from 20 minutes out, danger from 5. Minutes round up, so the color changes at the
// moment the 20 and 5 minute alerts fire.
function toneOf(minutes: number): keyof typeof tones {
  if (minutes <= 5) return "danger";
  if (minutes <= 20) return "warning";
  return "calm";
}

function subscribe(tick: () => void) {
  const id = setInterval(tick, second);
  return () => clearInterval(id);
}

const clock = () => Math.floor(Date.now() / second) * second;

// The server and the phone disagree about "now", so the countdown renders only on the client:
// the server and hydration see no clock (null), then the first client render fills it in.
export function Countdown({ to, className }: { to: Date; className?: string }) {
  const reduce = useReducedMotionConfig();
  const now = useSyncExternalStore(subscribe, clock, () => null);
  if (now === null) return null;

  const minutes = Math.max(0, Math.ceil((to.getTime() - now) / minute));
  const tone = toneOf(minutes);

  return (
    <span
      role="timer"
      data-tone={tone}
      className={cn("inline-flex items-baseline gap-1", tones[tone], className)}
    >
      <span className="relative inline-flex overflow-hidden text-3xl font-extrabold tracking-tight tabular-nums">
        {reduce ? (
          minutes
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={minutes}
              className="inline-block"
              initial={{ y: "-100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{
                y: "100%",
                opacity: 0,
                transition: { duration: duration.base, ease: ease.exit },
              }}
              transition={{ duration: duration.base, ease: ease.standard }}
            >
              {minutes}
            </motion.span>
          </AnimatePresence>
        )}
      </span>{" "}
      <span className="text-base font-semibold">{display.minutes}</span>
    </span>
  );
}
