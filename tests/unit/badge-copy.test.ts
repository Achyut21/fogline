import { describe, expect, it } from "vitest";
import { explorerBadges, nightBadges } from "@/lib/badges";
import { badges } from "@/copy/badges";

describe("badge copy", () => {
  it("[F8.5] names and describes every badge the rules award, in 60 characters or fewer", () => {
    const ids = [...nightBadges, ...explorerBadges];
    expect(Object.keys(badges).sort()).toEqual([...ids].sort());
    const longest = [
      badges["first-in"].description(),
      badges["fashionably-late"].description(120),
      badges["on-the-dot"].description(),
      badges["long-haul"].description(120),
      badges["closest-call"].description(59),
      badges["night-owl"].description(),
      badges.ghost.description(),
      badges.planner.description(),
      badges["first-light"].description("South Boston Waterfront"),
      badges["all-four-lines"].description(),
      badges["fifty-stations"].description(),
      badges["every-green-branch"].description(),
    ];
    for (const text of longest) expect(text.length).toBeLessThanOrEqual(60);
    for (const id of ids) expect(badges[id].name.length).toBeGreaterThan(0);
  });

  it("[F8.5] uses the real number, and says just in time when nothing was to spare", () => {
    expect(badges["fashionably-late"].description(14)).toBe("Walked in 14 min after the start.");
    expect(badges["long-haul"].description(31)).toBe("Longest ride of the night: 31 min.");
    expect(badges["closest-call"].description(2)).toBe("Made the last train with 2 min to spare.");
    expect(badges["closest-call"].description(0)).toBe("Made the last train just in time.");
  });
});
