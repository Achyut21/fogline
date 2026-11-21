export const features = [
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "F10",
  "F11",
  "F12",
  "F13",
  "F14",
  "F15",
  "F16",
] as const;

export type Feature = (typeof features)[number];

function isFeature(value: string): value is Feature {
  return features.some((feature) => feature === value);
}

export function parseFlags(raw: string | undefined): ReadonlySet<Feature> {
  const on = new Set<Feature>();
  for (const part of (raw ?? "").split(",")) {
    const id = part.trim().toUpperCase();
    if (isFeature(id)) on.add(id);
  }
  return on;
}

const enabled = parseFlags(process.env.NEXT_PUBLIC_FLAGS);

export function isEnabled(feature: Feature): boolean {
  return enabled.has(feature);
}
