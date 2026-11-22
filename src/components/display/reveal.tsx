"use client";

import {
  type Transition,
  motion,
  useAnimationControls,
  useReducedMotionConfig,
} from "motion/react";
import { type ReactNode, createContext, use, useEffect, useState } from "react";
import { duration, ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

// A staged entrance that a tap or key press skips to the end (DESIGN section 8). Reveal starts
// every stage's animation at once, each with its own delay; a skip stops them and sets the final
// state, keeping the same elements so the tap still lands. StatCounter reads the stage's delay, so
// its count starts with the stage. Reduced motion shows the final state: through Motion's config
// once hydrated, and through revealReduce's classes in the server HTML.
type Controls = ReturnType<typeof useAnimationControls>;
const Stage = createContext<{ delay: number; skipped: boolean; controls: Controls | null }>({
  delay: 0,
  skipped: false,
  controls: null,
});
export const useStage = () => use(Stage);
export const revealReduce = "motion-reduce:opacity-100! motion-reduce:transform-none!";

export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const controls = useAnimationControls();
  const reduce = useReducedMotionConfig();
  const [skipped, setSkipped] = useState(false);
  const skip = () => setSkipped(true);

  useEffect(() => {
    if (reduce || skipped) {
      controls.stop();
      controls.set("done");
      return;
    }
    void controls.start("shown");
  }, [controls, reduce, skipped]);

  return (
    <Stage value={{ delay: 0, skipped, controls }}>
      <div onPointerDown={skip} onKeyDown={skip} className={className}>
        {children}
      </div>
    </Stage>
  );
}

/** Props for a motion element that enters `at` seconds in. Outside a Reveal it plays on mount. */
export function useEntrance() {
  const { controls } = useStage();
  const reduce = useReducedMotionConfig();
  return (
    at: number,
    {
      y = 8,
      transition = { duration: duration.base, ease: ease.standard },
    }: { y?: number; transition?: Transition } = {},
  ) => ({
    initial: reduce ? (false as const) : "hidden",
    animate: controls ?? "shown",
    variants: {
      hidden: { opacity: 0, y },
      shown: { opacity: 1, y: 0, transition: { ...transition, delay: at } },
      done: { opacity: 1, y: 0 },
    },
  });
}

export function RevealStage({
  at,
  children,
  className,
}: {
  at: number;
  children: ReactNode;
  className?: string;
}) {
  const stage = useStage();
  const entrance = useEntrance();
  return (
    <Stage value={{ ...stage, delay: at }}>
      <motion.div {...entrance(at)} className={cn(revealReduce, className)}>
        {children}
      </motion.div>
    </Stage>
  );
}
