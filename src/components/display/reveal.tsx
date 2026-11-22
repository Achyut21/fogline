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

// A staged entrance that a tap or key press anywhere skips to the end (DESIGN section 8). Reveal
// starts every stage's animation at once, each with its own delay; a skip stops them and sets the
// final state on the same elements. A stage stays inert until it has appeared, so a tap can't land
// on a control nobody can see yet. StatCounter reads the stage's delay, so its count starts with
// the stage. Every stage starts hidden, as in the server HTML; reduced motion then jumps to the
// final state, and revealReduce's classes show it before hydration.
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

  useEffect(() => {
    if (skipped) return;
    const skip = () => setSkipped(true);
    document.addEventListener("pointerdown", skip);
    document.addEventListener("keydown", skip);
    return () => {
      document.removeEventListener("pointerdown", skip);
      document.removeEventListener("keydown", skip);
    };
  }, [skipped]);

  useEffect(() => {
    if (reduce || skipped) {
      controls.stop();
      controls.set("done");
      return;
    }
    void controls.start("shown");
  }, [controls, reduce, skipped]);

  return (
    <Stage value={{ delay: 0, skipped: skipped || Boolean(reduce), controls }}>
      <div className={className}>{children}</div>
    </Stage>
  );
}

/** Props for a motion element that enters `at` seconds in. Outside a Reveal it plays on mount. */
export function useEntrance() {
  const { controls } = useStage();
  const reduce = useReducedMotionConfig();
  const standalone = reduce ? "done" : "shown";
  return (
    at: number,
    {
      y = 8,
      transition = { duration: duration.base, ease: ease.standard },
    }: { y?: number; transition?: Transition } = {},
  ) => ({
    initial: "hidden",
    animate: controls ?? standalone,
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
  const [appeared, setAppeared] = useState(false);
  return (
    <Stage value={{ ...stage, delay: at }}>
      <motion.div
        {...entrance(at)}
        inert={!(appeared || stage.skipped)}
        onAnimationComplete={(name) => name === "shown" && setAppeared(true)}
        className={cn(revealReduce, className)}
      >
        {children}
      </motion.div>
    </Stage>
  );
}
