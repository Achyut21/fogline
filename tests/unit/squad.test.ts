import { describe, expect, it } from "vitest";
import { squadCells, squadStreak } from "@/lib/squad";

const at = (local: string) => new Date(`${local}-05:00`);

describe("squad map and streak", () => {
  it("[F12.2] merges members' cells, visited wins and the first to uncover gets the cell", () => {
    expect(
      squadCells([
        { profileId: "sam", h3: "a", state: "seen", firstAt: at("2026-11-20T19:00:00") },
        { profileId: "maya", h3: "a", state: "visited", firstAt: at("2026-11-20T20:00:00") },
        { profileId: "priya", h3: "b", state: "seen", firstAt: at("2026-11-20T19:00:00") },
        { profileId: "maya", h3: "b", state: "seen", firstAt: at("2026-11-20T19:00:00") },
        { profileId: "maya", h3: "c", state: "visited", firstAt: at("2026-11-19T19:00:00") },
      ]),
    ).toEqual([
      { h3: "a", state: "visited", by: "sam" },
      { h3: "b", state: "seen", by: "maya" },
      { h3: "c", state: "visited", by: "maya" },
    ]);
  });

  it("[F12.3] counts weeks in a row with a shared night, Monday to Sunday", () => {
    const nights = [
      at("2026-11-20T19:00:00"), // Fri, week of Nov 16
      at("2026-11-15T19:00:00"), // Sun, week of Nov 9
      at("2026-11-09T19:00:00"), // Mon, week of Nov 9 again
      at("2026-11-04T19:00:00"), // Wed, week of Nov 2
      at("2026-10-21T19:00:00"), // a gap: week of Oct 19
    ];
    expect(squadStreak(nights, at("2026-11-21T12:00:00"))).toBe(3);
  });

  it("[F12.3] keeps the streak through an empty week until it ends, then resets", () => {
    const nights = [at("2026-11-20T19:00:00"), at("2026-11-13T19:00:00")];
    expect(squadStreak(nights, at("2026-11-23T12:00:00"))).toBe(2);
    expect(squadStreak(nights, at("2026-11-30T12:00:00"))).toBe(0);
    expect(squadStreak([], at("2026-11-23T12:00:00"))).toBe(0);
  });

  it("[F12.3] puts a night past midnight in the week of its service date", () => {
    // Monday 1:30 AM belongs to Sunday night's service date, the week of Nov 16.
    const nights = [at("2026-11-23T01:30:00"), at("2026-11-13T19:00:00")];
    expect(squadStreak(nights, at("2026-11-23T12:00:00"))).toBe(2);
  });
});
