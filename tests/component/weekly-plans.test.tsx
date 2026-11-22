import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WeeklyPlans } from "@/components/plans/weekly-plans";
import { plans } from "@/copy";
import type { WeeklyPlan } from "@/server/weekly";

const push = vi.hoisted(() => vi.fn());
const invite = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/server/actions/weekly", () => ({ inviteToWeeklyPlan: invite }));

const w = plans.weekly;
const plan: WeeklyPlan = {
  id: "8b6a3d58-61d5-4b51-8a3a-6b0b8f9e0d11",
  title: "Dinner, then dessert",
  startsAt: "2026-11-27T19:00:00-05:00",
  stops: [
    {
      id: "osm:1",
      name: "JiangNan",
      category: "food",
      grade: "B",
      lat: 42.35,
      lon: -71.06,
      station: { id: "place-boyls", name: "Boylston" },
      scheduledAt: "2026-11-27T19:00:00-05:00",
      hours: "open",
      leg: null,
    },
    {
      id: "osm:2",
      name: "Mike's Pastry",
      category: "dessert",
      grade: null,
      lat: 42.36,
      lon: -71.05,
      station: { id: "place-haecl", name: "Haymarket" },
      scheduledAt: "2026-11-27T20:15:00-05:00",
      hours: "unknown",
      leg: { mode: "T", minutes: 8 },
    },
  ],
};

describe("WeeklyPlans", () => {
  it("[F10.4] lists this week's plans with their stops", () => {
    render(<WeeklyPlans weekly={[plan]} />);
    expect(screen.getByRole("heading", { name: plan.title })).toBeInTheDocument();
    expect(screen.getByText("JiangNan")).toBeInTheDocument();
    expect(screen.getByText(plans.builder.crawl.hours.unknown)).toBeInTheDocument();
  });

  it("[F10.5] copies a weekly plan and opens its invite link", async () => {
    invite.mockResolvedValueOnce({ kind: "created", id: "p1", inviteToken: "ABCDEFGHJKLM" });
    render(<WeeklyPlans weekly={[plan]} />);
    fireEvent.click(screen.getByRole("button", { name: w.invite }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/p/p1?t=ABCDEFGHJKLM"));
    expect(invite).toHaveBeenCalledWith(plan.id);
  });

  it("[F10.4] says when this week's plans come out", () => {
    render(<WeeklyPlans weekly={[]} />);
    expect(screen.getByText(w.empty)).toBeInTheDocument();
  });
});
