// Strings for the fog layer and its /design preview (Phase 1 item 4).
export const fog = {
  previewTitle: "Fog preview",
  sampleNote: "Sample data: MBTA subway shapes and stations from the Fall 2026 GTFS feed.",
  reveal: "Clear fog at the next stop",
  tier: {
    label: "GPU tier",
    detected: (tier: number) => `Detected tier ${tier}`,
  },
  rendererName: {
    "shader-full": "3D fog, full quality",
    "shader-light": "3D fog, light",
    "map-fill": "2D fog on the map",
    svg: "2D map without WebGL",
  },
  mapLabel: (uncovered: number) => `Map of Boston under fog. ${uncovered} cells uncovered.`,
} as const;
