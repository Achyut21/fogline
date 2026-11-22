import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Podium } from "@/components/recap/podium";
import { recap } from "@/copy";
import { clock } from "@/copy/plans";

const arrivals = [
  { profileId: "a", name: "Maya", at: "2026-11-21T19:58:00-05:00" },
  { profileId: "b", name: "Sam", at: "2026-11-21T20:04:00-05:00" },
  { profileId: "c", name: "Jo", at: "2026-11-21T20:21:00-05:00" },
];

describe("Podium", () => {
  it("[F9.1] lists 1st, 2nd and last in place order with arrival times", () => {
    render(
      <>
        <h2 id="arrivals">{recap.page.arrivals}</h2>
        <Podium arrivals={arrivals} />
      </>,
    );
    const items = within(screen.getByRole("list", { name: recap.page.arrivals })).getAllByRole(
      "listitem",
    );
    expect(items.map((li) => li.textContent)).toEqual(
      arrivals.map((a, i) => `${a.name}${clock(new Date(a.at))}${recap.places[i]}`),
    );
    expect(clock(new Date(arrivals[0].at))).toBe("7:58\u00a0PM");
    expect(items[0]).toHaveClass("col-start-2");
    expect(items[1]).toHaveClass("col-start-1");
    expect(items[2]).toHaveClass("col-start-3");
  });

  it("[F9.1] shows only the places that exist", () => {
    render(<Podium arrivals={arrivals.slice(0, 1)} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText(recap.places[0])).toBeInTheDocument();
  });
});
