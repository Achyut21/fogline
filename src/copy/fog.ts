// Strings for the fog layer and its /design preview (Phase 1 item 4).
export const fog = {
  previewTitle: "Fog preview",
  sampleNote: "Sample data: mockup fog on MBTA lines and stations, Fall 2026 GTFS feed.",
  reveal: "Next stop",
  checking: "Checking your GPU",
  tierFailed: "Couldn't read your GPU tier. Showing 2D fog.",
  status: (renderer: string, tier: number) => `${renderer} · GPU tier ${tier}`,
  rendererName: {
    "shader-full": "3D fog, full quality",
    "shader-light": "3D fog, reduced quality",
    "map-fill": "2D fog on the map",
    svg: "2D map without WebGL",
  },
  mapLabel: (uncovered: number) =>
    `Map of Boston under fog. ${uncovered.toLocaleString("en-US")} ${uncovered === 1 ? "cell" : "cells"} uncovered.`,
} as const;
