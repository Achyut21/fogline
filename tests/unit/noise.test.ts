import { describe, expect, it } from "vitest";
import { floorDb, frameLevel, loudnessOf, segmentLevels } from "@/lib/noise";

describe("noise levels", () => {
  it("[F13.1] turns samples into one dBFS number per frame", () => {
    expect(frameLevel(new Float32Array(512).fill(1))).toBe(0);
    expect(frameLevel(new Float32Array(512).fill(0.1))).toBeCloseTo(-20, 5);
    expect(frameLevel(new Float32Array(512))).toBe(floorDb);
    expect(frameLevel([])).toBe(floorDb);
  });

  it("[F13.1] averages a segment by energy and keeps its peak", () => {
    expect(segmentLevels([-20, -20])).toEqual({ avg: -20, peak: -20 });
    // One loud frame among quiet ones pulls the energy average far above the decibel average.
    const levels = segmentLevels([-60, -60, -60, -10]);
    expect(levels?.peak).toBe(-10);
    expect(levels?.avg).toBeGreaterThan(-20);
    expect(segmentLevels([])).toBeNull();
  });

  it("[F13.3] places a segment on a relative scale", () => {
    const all = [-50, -45, -40, -35, -30, -25];
    expect(loudnessOf(-52, all)).toBe("quieter");
    expect(loudnessOf(-38, all)).toBe("typical");
    expect(loudnessOf(-20, all)).toBe("louder");
    expect(loudnessOf(-20, [-30])).toBe("typical");
  });
});
