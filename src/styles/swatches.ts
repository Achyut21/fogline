// The color tokens /design shows, by group. A unit test checks that every color in
// src/styles/tokens.css appears here exactly once.
export const colorGroups = [
  {
    id: "surfaces",
    names: ["bg", "surface", "surface-raised", "surface-sunken", "rule", "scrim"],
  },
  { id: "fields", names: ["field", "field-border"] },
  { id: "ink", names: ["ink", "ink-muted", "ink-subtle"] },
  { id: "accent", names: ["accent", "accent-ink", "accent-soft", "focus"] },
  { id: "states", names: ["success", "warning", "danger", "danger-ink"] },
  {
    id: "map",
    names: ["fog", "fog-thin", "fog-edge", "map-land", "map-water", "map-park", "map-road", "halo"],
  },
  {
    id: "lines",
    names: ["line-red", "line-orange", "line-blue", "line-green", "line-ink", "line-ink-orange"],
  },
  {
    id: "casings",
    names: ["line-red-casing", "line-orange-casing", "line-blue-casing", "line-green-casing"],
  },
] as const;
