import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GradeBadge } from "@/components/display/grade-badge";
import { InspectionDetails } from "@/components/display/inspection-details";
import { grades } from "@/copy";

const inspection = vi.hoisted(() => vi.fn());
vi.mock("@/server/actions/inspection", () => ({ spotInspection: inspection }));

describe("grades", () => {
  it("[F11.1] shows the letter with its inspection date", () => {
    render(<GradeBadge letter="B" inspected="2026-04-09" />);
    expect(screen.getByText(grades.letter("B"))).toBeInTheDocument();
    expect(screen.getByText(`, ${grades.inspected("2026-04-09")}`)).toBeInTheDocument();
    expect(grades.inspected("2026-04-09")).toBe("inspected Apr 9, 2026");
  });

  it("[F11.4] says no inspection match instead of a grade", () => {
    render(<GradeBadge letter={null} inspected={null} />);
    expect(screen.getByText(grades.noMatch)).toBeInTheDocument();
  });

  it("lists the city's cited violations when opened (F11.2's plain-English rewrite is still to come)", async () => {
    inspection.mockResolvedValue({
      letter: "C",
      date: "2026-04-09",
      violations: [
        { level: "***", text: "Backflow Prevention (P)" },
        { level: "*", text: "Clean non-food contact surfaces" },
      ],
    });
    const { container } = render(<InspectionDetails spotId="osm:node/1" />);
    const details = container.querySelector("details");
    if (!details) throw new Error("no details");
    details.open = true;
    fireEvent(details, new Event("toggle"));
    expect(await screen.findByText(grades.violations(2))).toBeInTheDocument();
    expect(screen.getByText("Backflow Prevention (P)")).toBeInTheDocument();
    expect(screen.getByText(grades.level["***"])).toBeInTheDocument();
    expect(inspection).toHaveBeenCalledWith("osm:node/1");
  });
});

it("offers a retry when the inspection fails to load", async () => {
  inspection.mockRejectedValueOnce(new Error("offline"));
  inspection.mockResolvedValueOnce({ letter: "A", date: "2026-04-09", violations: [] });
  const { container } = render(<InspectionDetails spotId="osm:node/2" />);
  const details = container.querySelector("details");
  if (!details) throw new Error("no details");
  details.open = true;
  fireEvent(details, new Event("toggle"));
  fireEvent.click(await screen.findByRole("button", { name: grades.retry }));
  expect(await screen.findByText(grades.none)).toBeInTheDocument();
});
