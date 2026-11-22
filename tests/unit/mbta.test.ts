import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { vehicleRows } from "@/server/mbta";

const feed: unknown = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "../fixtures/mbta/vehicle-positions.json"), "utf8"),
);

describe("recorder", () => {
  it("[F3.5] keeps subway trains only, timestamped by the train's own report", () => {
    const rows = vehicleRows(feed);
    expect(rows.map((r) => r.routeId)).toEqual(["Red", "Green-B"]);
    for (const row of rows) {
      expect(row.vehicleId).toBeTruthy();
      expect(row.ts.getUTCFullYear()).toBe(2026);
      expect(Math.abs(row.lat - 42.36)).toBeLessThan(0.3);
    }
  });
});
