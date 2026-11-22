import { describe, expect, it } from "vitest";
import type { Recap } from "@/server/recap";
import { maxChips, recapCard } from "@/server/recap-card";

const night: Recap = {
  planId: "p",
  title: "Friday dinner",
  startsAt: "2026-11-20T23:00:00Z",
  isDemo: false,
  adultsOnly: false,
  spot: { id: "s", name: "Cocobeet", lat: 0, lon: 0, stationId: "place-dwnxg" },
  arrivals: ["Maya", "Priya", "Sam", "Lee"].map((name, i) => ({
    profileId: name,
    name,
    at: new Date(Date.UTC(2026, 10, 20, 23, 57 + i * 5)).toISOString(),
  })),
  badges: [
    { profileId: "Maya", name: "Maya", badge: "first-in" },
    { profileId: "Sam", name: "Sam", badge: "ghost" },
  ],
  numbers: { milesOnT: 12.06, milesWalked: 0.84, stops: 1, newCells: 2481 },
  routes: [],
  clearedCells: [],
};

describe("recap share card", () => {
  it("[F9.3] draws the podium, numbers and badges from the recap", () => {
    const card = recapCard(night);
    expect(card.dateLine).toBe("Fri, Nov 20 · Cocobeet");
    expect(card.podium.map((p) => `${p.place} ${p.name} ${p.time}`)).toEqual([
      "1st Maya 6:57 PM",
      "2nd Priya 7:02 PM",
      "Last Lee 7:12 PM",
    ]);
    expect(
      card.stats.map((s) =>
        [s.prefix, s.value, s.unit, s.label].filter((w) => w !== null).join(" "),
      ),
    ).toEqual(["12.1 mi on the T", "about 0.8 mi walked", "1 stop", "2,481 cells uncovered"]);
  });

  it("[F9.3] keeps Ghost off the shared image", () => {
    expect(recapCard(night).chips).toEqual(["First In · Maya"]);
  });

  it("[F9.3] caps the badges with a count of the rest", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      profileId: `p${i}`,
      name: `P${i}`,
      badge: "on-the-dot",
    }));
    const chips = recapCard({ ...night, badges: many }).chips;
    expect(chips).toHaveLength(maxChips);
    expect(chips.at(-1)).toBe("+4 more");
  });

  it("[F4.9] says 21+ only for an adults-only spot, and nothing for a missing one", () => {
    expect(recapCard({ ...night, spot: null, adultsOnly: true }).dateLine).toBe(
      "Fri, Nov 20 · 21+ spot",
    );
    expect(recapCard({ ...night, spot: null }).dateLine).toBe("Fri, Nov 20");
  });
});
