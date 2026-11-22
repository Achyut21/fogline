import { describe, expect, it } from "vitest";
import { checkInValidity, type CheckinAttempt, type CheckinTarget } from "@/lib/checkin";

const metersPerDegreeLat = 111_195.08;
const spot = { lat: 42.356395, lon: -71.062424 };
const north = (meters: number) => ({ lat: spot.lat + meters / metersPerDegreeLat, lon: spot.lon });

const target: CheckinTarget = {
  spot,
  startsAt: new Date("2026-11-20T20:00:00-05:00"),
  endedAt: new Date("2026-11-20T23:00:00-05:00"),
};
const attempt = (overrides: Partial<CheckinAttempt>): CheckinAttempt => ({
  at: spot,
  accuracyM: 20,
  time: new Date("2026-11-20T20:05:00-05:00"),
  ...overrides,
});

describe("checkInValidity", () => {
  it("[F6.2] accepts a position up to 150 m from the spot and refuses one farther", () => {
    expect(checkInValidity(attempt({ at: north(149.99) }), target)).toEqual({ valid: true });
    expect(checkInValidity(attempt({ at: north(150.01) }), target)).toEqual({
      valid: false,
      reason: "too-far",
      distanceM: 151,
    });
  });

  it("[F6.2] needs accuracy of 100 m or better", () => {
    expect(checkInValidity(attempt({ accuracyM: 100 }), target)).toEqual({ valid: true });
    expect(checkInValidity(attempt({ accuracyM: 100.4 }), target)).toEqual({
      valid: false,
      reason: "low-accuracy",
      accuracyM: 101,
    });
    expect(checkInValidity(attempt({ accuracyM: Number.NaN }), target)).toMatchObject({
      valid: false,
    });
  });

  it("[F6.2] reports the time first, then accuracy, then distance", () => {
    const early = new Date("2026-11-20T19:00:00-05:00");
    expect(
      checkInValidity(attempt({ at: north(400), accuracyM: 300, time: early }), target),
    ).toMatchObject({ reason: "too-early" });
    expect(checkInValidity(attempt({ at: north(400), accuracyM: 300 }), target)).toMatchObject({
      reason: "low-accuracy",
    });
  });

  it("[F6.2] opens 30 minutes before the start", () => {
    const opensAt = new Date("2026-11-20T19:30:00-05:00");
    expect(checkInValidity(attempt({ time: opensAt }), target)).toEqual({ valid: true });
    expect(checkInValidity(attempt({ time: new Date(opensAt.getTime() - 1000) }), target)).toEqual({
      valid: false,
      reason: "too-early",
      opensAt,
    });
  });

  it("[F6.2] closes when the plan ends, and stays open while it hasn't", () => {
    const endedAt = new Date("2026-11-20T23:00:00-05:00");
    expect(checkInValidity(attempt({ time: endedAt }), target)).toEqual({ valid: true });
    const late = attempt({ time: new Date(endedAt.getTime() + 1000) });
    expect(checkInValidity(late, target)).toEqual({ valid: false, reason: "plan-ended", endedAt });
    expect(checkInValidity(late, { ...target, endedAt: null })).toEqual({ valid: true });
  });
});
