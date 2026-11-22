// Every foreground and background token pair used for text, as CSS variable names. /design shows
// their ratios, and a unit test holds each to WCAG AA (4.5:1) in day and night.
export const textPairs = [
  { fg: "ink", bg: "bg" },
  { fg: "ink", bg: "surface" },
  { fg: "ink", bg: "surface-raised" },
  { fg: "ink", bg: "surface-sunken" },
  { fg: "ink", bg: "accent-soft" },
  { fg: "ink-muted", bg: "bg" },
  { fg: "ink-muted", bg: "surface" },
  { fg: "ink-muted", bg: "surface-sunken" },
  { fg: "ink-subtle", bg: "surface" },
  { fg: "accent", bg: "bg" },
  { fg: "accent", bg: "surface" },
  { fg: "accent", bg: "surface-sunken" },
  { fg: "accent-ink", bg: "accent" },
  { fg: "success", bg: "surface" },
  { fg: "warning", bg: "surface" },
  { fg: "danger", bg: "surface" },
  { fg: "danger-ink", bg: "danger" },
  { fg: "line-ink", bg: "line-red" },
  { fg: "line-ink", bg: "line-green" },
  { fg: "line-ink", bg: "line-blue" },
  { fg: "line-ink-orange", bg: "line-orange" },
] as const;

export const lines = ["red", "orange", "blue", "green"] as const;
