import { describe, expect, it } from "vitest";
import { planPreview, previewMetadata } from "@/server/plan-preview";

const plan = {
  id: "5a7e4b44-7d3d-4b49-9a57-1d64b9f8e0a1",
  title: "Friday dinner",
  startsAt: new Date("2026-11-27T19:00:00-05:00"),
  isDemo: false,
  adultsOnly: false,
  stops: ["Cocobeet", "J.P. Licks", "Museum of Fine Arts"],
  seats: 2,
};

describe("invite link preview", () => {
  it("[F4.8] shows the title, time, spot and how many people are in", () => {
    expect(planPreview(plan)).toEqual({
      demo: false,
      title: "Friday dinner",
      when: expect.stringMatching(/Fri.*7:00\u00a0PM/) as string,
      spot: "Cocobeet",
      more: "+2 more stops",
      people: "2 people",
    });
    expect(planPreview({ ...plan, stops: ["Cocobeet"], seats: 1 })).toMatchObject({
      more: null,
      people: "1 person",
    });
    expect(planPreview({ ...plan, stops: [] }).spot).toBeNull();
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

  it("[F4.8] points the link's og:image and large card at the image, with the token", () => {
    const meta = previewMetadata(plan, "ABCDEFGHJK23");
    const url = `/api/og/plan/${plan.id}?t=ABCDEFGHJK23`;
    expect(meta.openGraph?.images).toEqual([{ url, width: 1200, height: 630 }]);
    expect(meta.openGraph?.title).toBe("Friday dinner");
    expect(meta.openGraph?.description).toMatch(/7:00\u00a0PM · Cocobeet · 2 people$/);
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", title: "Friday dinner" });
  });
});
