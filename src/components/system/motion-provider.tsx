"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

// Motion follows the OS reduced-motion setting everywhere. Components read it with
// useReducedMotionConfig, so /design can force it on for a subtree.
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
