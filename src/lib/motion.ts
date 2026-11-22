// Motion tokens for Motion (`motion/react`) and R3F. The durations and easings mirror the
// --duration-* and --motion-* variables in src/styles/tokens.css; a unit test keeps them equal.

export const duration = {
  instant: 0.08,
  fast: 0.16,
  base: 0.24,
  slow: 0.4,
  reveal: 0.9,
  count: 1.2,
} as const;

export const ease = {
  standard: [0.2, 0, 0, 1],
  exit: [0.4, 0, 1, 1],
} as const;

export const spring = {
  snappy: { type: "spring", stiffness: 520, damping: 34 },
  smooth: { type: "spring", stiffness: 260, damping: 30 },
  bouncy: { type: "spring", stiffness: 380, damping: 18 },
} as const;

export const stagger = {
  list: 0.035,
  maxItems: 8,
} as const;
