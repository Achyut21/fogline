import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SquadView } from "@/components/squad/squad-view";
import { squad as s } from "@/copy";
import type { Squad } from "@/server/squad";

const squad: Squad = {
  members: [
    { id: "me", name: "Maya", you: true },
    { id: "sam", name: "Sam", you: false },
  ],
  cells: [
    { h3: "892a3066cdbffff", state: "visited", by: "me" },
    { h3: "892a3066c9bffff", state: "seen", by: "sam" },
    { h3: "892a3066c8bffff", state: "seen", by: "sam" },
  ],
  streak: 3,
};

describe("SquadView", () => {
  it("[F12.2] maps every member's cells and tints one member's on request", () => {
    const { container } = render(<SquadView squad={squad} lines={[]} stations={[]} />);
    expect(screen.getByRole("img", { name: s.mapLabel(3) })).toBeInTheDocument();
    expect(container.querySelector('path[fill="var(--accent)"]')).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Sam" }));
    expect(screen.getByRole("status")).toHaveTextContent(s.memberCells("Sam", 2));
    expect(container.querySelector('path[fill="var(--accent)"]')).not.toBeNull();
  });

  it("[F12.3] shows the weekly squad streak and the members", () => {
    render(<SquadView squad={squad} lines={[]} stations={[]} />);
    expect(screen.getByText(s.streakLabel(3))).toBeInTheDocument();
    expect(screen.getByText(s.you("Maya"))).toBeInTheDocument();
    expect(screen.getAllByText("Sam").length).toBeGreaterThan(0);
  });
});
