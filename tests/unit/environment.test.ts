import { expect, it } from "vitest";
import { unhandled } from "../msw/server";

it("runs tests in America/New_York", () => {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("America/New_York");
  expect(new Date("2026-07-01T16:00:00Z").getHours()).toBe(12);
});

it("blocks and records an unmocked request instead of reaching the network", async () => {
  const url = "https://cdn.mbta.com/realtime/VehiclePositions_enhanced.json";
  const response = await fetch(url);
  expect(response.ok).toBe(false);
  expect(unhandled.splice(0).join("\n")).toContain(url);
});
