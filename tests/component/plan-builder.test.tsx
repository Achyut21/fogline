import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeaveByLine } from "@/components/plans/option-card";
import { PlanBuilder } from "@/components/plans/plan-builder";
import { grades, map, plans } from "@/copy";

const find = vi.hoisted(() => vi.fn());
vi.mock("@/server/actions/core-loop", () => ({ findMeetup: find }));
vi.mock("@/server/actions/plans", () => ({ createPlan: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const b = plans.builder;
const at = "2026-11-24T20:00:00.000Z";

function renderBuilder(under21 = true) {
  render(
    <PlanBuilder
      you={{ name: "Maya", station: "place-bucen", stationName: "Boston University Central" }}
      under21={under21}
      stations={[{ id: "place-davis", name: "Davis", lines: ["Red"] }]}
      times={[at]}
      event={null}
    />,
  );
}

function fillFriend() {
  fireEvent.change(screen.getByLabelText(b.friendName), { target: { value: "Sam" } });
  fireEvent.change(screen.getByLabelText(b.friendStation), { target: { value: "place-davis" } });
}

beforeEach(() => find.mockReset());

describe("PlanBuilder", () => {
  it("[F4.6] names the constraint that blocked the search and offers to relax it", async () => {
    find.mockResolvedValueOnce({ kind: "none", blockedBy: ["categories"] });
    find.mockResolvedValueOnce({ kind: "none", blockedBy: ["time"] });
    renderBuilder();
    fillFriend();
    fireEvent.click(screen.getByRole("button", { name: b.find }));
    expect(await screen.findByText(b.none.blocker.categories)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: b.none.relax }));
    expect(await screen.findByText(b.none.blocker.time)).toBeInTheDocument();
    expect(find.mock.calls[1][0].categories).not.toContain("bar");
    expect(find.mock.calls[1][0].categories).toContain("park");
  });

  it("[F11.5] sends the minimum food grade and offers to drop it when it blocks", async () => {
    find.mockResolvedValueOnce({ kind: "none", blockedBy: ["minGrade"] });
    find.mockResolvedValueOnce({ kind: "none", blockedBy: ["time"] });
    renderBuilder();
    fillFriend();
    fireEvent.click(screen.getByRole("radio", { name: grades.minGradeOptions.A }));
    fireEvent.click(screen.getByRole("button", { name: b.find }));
    expect(await screen.findByText(b.none.blocker.minGrade)).toBeInTheDocument();
    expect(find.mock.calls[0][0].minGrade).toBe("A");
    fireEvent.click(screen.getByRole("button", { name: b.none.relaxGrade }));
    expect(await screen.findByText(b.none.blocker.time)).toBeInTheDocument();
    expect(find.mock.calls[1][0].minGrade).toBeNull();
  });

  it("[F4.9] hides bars and clubs from an under-21 profile", () => {
    renderBuilder(true);
    expect(screen.queryByRole("button", { name: map.sheet.category.bar })).not.toBeInTheDocument();
  });

  it("[F4.1] asks for every friend's name and station before searching", () => {
    renderBuilder();
    fireEvent.click(screen.getByRole("button", { name: b.find }));
    expect(screen.getByRole("alert")).toHaveTextContent(b.needName);
    expect(find).not.toHaveBeenCalled();
  });
});

describe("LeaveByLine", () => {
  it("[F5.3] warns when the plan starts after someone's last train", () => {
    const leaveBy = new Date("2026-11-25T05:31:00.000Z");
    render(
      <LeaveByLine
        name="Sam"
        leaveBy={{
          kind: "train",
          departs: leaveBy,
          firstTrain: leaveBy,
          leaveBy,
          legs: [],
          transfers: [],
          startsAfterLeaveBy: true,
        }}
      />,
    );
    // Testing Library reads the no-break space before AM/PM as a plain one.
    expect(screen.getByText(b.noTrain("Sam", leaveBy).replace(/\s/g, " "))).toBeInTheDocument();
  });

  it("[F5.7] shows the walk home and a rideshare when no train runs", () => {
    render(<LeaveByLine name="Sam" leaveBy={{ kind: "no-train", walkHomeMinutes: 95 }} />);
    expect(screen.getByText(b.noTrainAtAll("Sam", 95))).toBeInTheDocument();
  });
});
