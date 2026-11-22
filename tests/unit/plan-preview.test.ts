import { describe, expect, it } from "vitest";
import { planPreview } from "@/server/plan-preview";

const plan = {
  title: "Friday dinner",
  startsAt: "2026-11-27T19:00:00-05:00",
  isDemo: false,
  adultsOnly: false,
  spot: { name: "Cocobeet" },
  stops: [{ name: "Cocobeet" }, { name: "J.P. Licks" }, { name: "Museum of Fine Arts" }],
  people: [{ rsvp: "yes" }, { rsvp: "pending" }, { rsvp: "no" }],
};

describe("invite link preview", () => {
  it("[F4.8] shows the title, time, spot and how many are going", () => {
    expect(planPreview(plan)).toEqual({
      demo: false,
      title: "Friday dinner",
      when: expect.stringMatching(/Fri.*7:00 PM/) as string,
      spot: "Cocobeet",
      more: "+2 more stops",
      going: "2 people going",
    });
    expect(
      planPreview({ ...plan, stops: [{ name: "Cocobeet" }], people: [{ rsvp: "yes" }] }),
    ).toMatchObject({ more: null, going: "1 person going" });
  });

  it("[F4.9] hides a 21+ plan's title and venue from every preview", () => {
    expect(planPreview({ ...plan, adultsOnly: true })).toMatchObject({
      title: "A 21+ night out",
      spot: "21+ spot",
      more: null,
    });
  });

  it("[F16.3] marks a demo plan", () => {
    expect(planPreview({ ...plan, isDemo: true }).demo).toBe(true);
  });
});
