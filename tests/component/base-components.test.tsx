import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BottomNav } from "@/components/app/bottom-nav";
import { OfflineBanner } from "@/components/system/offline-banner";
import { StaleChip } from "@/components/system/stale-chip";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Stepper } from "@/components/ui/stepper";
import { app, system } from "@/copy";

vi.mock("next/navigation", () => ({ usePathname: () => "/plans/abc" }));

const views = [
  { value: "map", label: "Map" },
  { value: "list", label: "List" },
] as const;

describe("base components", () => {
  it("SegmentedControl is a radiogroup that reports the picked option", () => {
    const change = vi.fn();
    render(<SegmentedControl label="View" options={views} value="map" onValueChange={change} />);
    const group = screen.getByRole("radiogroup", { name: "View" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Map" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "List" }));
    expect(change).toHaveBeenCalledWith("list");
  });

  it("Stepper stays between min and max", () => {
    const change = vi.fn();
    render(<Stepper label="Friends" value={8} min={2} max={8} onValueChange={change} />);
    expect(screen.getByRole("button", { name: system.stepper.increase("Friends") })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: system.stepper.decrease("Friends") }));
    expect(change).toHaveBeenCalledWith(7);
  });

  it("OfflineBanner appears when the browser goes offline", () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole("status")).toBeNull();
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(system.offlineBanner);
    online.mockRestore();
  });

  it("[F2.5] StaleChip shows the data's age and turns warning once it is stale", () => {
    const { rerender } = render(<StaleChip minutes={1} />);
    expect(screen.getByText(system.stale(1))).toHaveAttribute("data-stale", "false");
    rerender(<StaleChip minutes={5} />);
    expect(screen.getByText(system.stale(5))).toHaveAttribute("data-stale", "true");
  });

  it("BottomNav marks the tab of the current route", () => {
    render(<BottomNav />);
    const nav = screen.getByRole("navigation", { name: app.nav.label });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: app.nav.plans })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: app.nav.map })).not.toHaveAttribute("aria-current");
  });
});
