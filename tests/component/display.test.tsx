import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AvatarStack } from "@/components/display/avatar-stack";
import { BadgeChip } from "@/components/display/badge-chip";
import { Countdown } from "@/components/display/countdown";
import { LeaveByChip } from "@/components/display/leave-by-chip";
import { LineBadge, lines } from "@/components/display/line-badge";
import { ParticipantChip } from "@/components/display/participant-chip";
import { StatCounter } from "@/components/display/stat-counter";
import { StatTile } from "@/components/display/stat-tile";
import { StationDot } from "@/components/display/station-dot";
import { display } from "@/copy";

const reduced = vi.hoisted(() => ({ current: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotionConfig: () => reduced.current,
}));

const minute = 60_000;

describe("display components", () => {
  afterEach(() => {
    reduced.current = false;
    vi.useRealTimers();
  });

  it("[F8.4] StatCounter counts up to its value", async () => {
    render(<StatCounter value={46} />);
    const digits = screen.getByText("0");
    await waitFor(() => expect(digits).toHaveTextContent("46"), { timeout: 3000 });
  });

  it("[F8.4] StatCounter shows the final value at once with reduced motion", () => {
    reduced.current = true;
    render(<StatCounter value={12.1} decimals={1} suffix={" mi"} />);
    expect(screen.queryByText(/^0/)).not.toBeInTheDocument();
    expect(screen.getAllByText("12.1 mi", { normalizer: (text) => text })).toHaveLength(3);
  });

  it("StatTile pairs its label with its value", () => {
    reduced.current = true;
    render(
      <dl>
        <StatTile label="new cells" value={1204} />
      </dl>,
    );
    expect(screen.getByRole("term")).toHaveTextContent("new cells");
    expect(screen.getByRole("definition")).toHaveTextContent("1,204");
  });

  it("[F5.4] Countdown turns warning at 20 min and danger at 5 min", () => {
    vi.useFakeTimers({ now: new Date("2026-11-21T23:00:00-05:00") });
    render(<Countdown to={new Date("2026-11-21T23:21:00-05:00")} />);
    const timer = screen.getByRole("timer");
    expect(timer).toHaveAttribute("data-tone", "calm");
    expect(screen.getByText("21")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(minute));
    expect(timer).toHaveAttribute("data-tone", "warning");
    expect(screen.getByText("20")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(14 * minute));
    expect(timer).toHaveAttribute("data-tone", "warning");

    act(() => vi.advanceTimersByTime(minute));
    expect(timer).toHaveAttribute("data-tone", "danger");
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("Countdown changes digits in place with reduced motion", () => {
    reduced.current = true;
    vi.useFakeTimers({ now: new Date("2026-11-21T23:00:00-05:00") });
    render(<Countdown to={new Date("2026-11-21T23:06:00-05:00")} />);
    act(() => vi.advanceTimersByTime(minute));
    expect(screen.getByRole("timer")).toHaveTextContent(/^5min$/);
  });

  it("[F2.3] LineBadge names its line for screen readers", () => {
    render(
      <>
        {lines.map((line) => (
          <LineBadge key={line} line={line} />
        ))}
      </>,
    );
    for (const line of lines) {
      const { short, name } = display.lines[line];
      expect(screen.getByText(name)).toHaveClass("sr-only");
      for (const el of screen.getAllByText(short)) {
        expect(el).toHaveAttribute("aria-hidden", "true");
      }
    }
  });

  it("StationDot draws transfer stations larger and stays out of the accessibility tree", () => {
    const { container } = render(
      <>
        <StationDot />
        <StationDot transfer />
      </>,
    );
    const [single, transfer] = container.children;
    expect(single).toHaveClass("size-3");
    expect(transfer).toHaveClass("size-4");
    expect(single).toHaveAttribute("aria-hidden", "true");
  });

  it("LeaveByChip shows the time in Boston with a no-break space before AM or PM", () => {
    const { container } = render(<LeaveByChip at={new Date("2026-11-22T05:14:00Z")} />);
    expect(container.textContent).toBe("Leave by 12:14 AM");
  });

  it("BadgeChip tells screen readers when a badge is locked", () => {
    render(
      <>
        <BadgeChip name="First In" earned />
        <BadgeChip name="Night Owl" earned={false} />
      </>,
    );
    expect(screen.getByText("First In")).toHaveAttribute("data-earned", "true");
    expect(screen.queryByText("First In, locked")).not.toBeInTheDocument();
    expect(screen.getByText("Night Owl, locked")).toHaveClass("sr-only");
  });

  it("AvatarStack names everyone and shows the overflow as +N", () => {
    render(<AvatarStack names={["Priya", "Maya", "Sam", "Jordan", "Lee"]} />);
    expect(
      screen.getByRole("img", { name: "Priya, Maya, Sam, Jordan and Lee" }),
    ).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("P")).toBeInTheDocument();
    expect(screen.queryByText("J")).not.toBeInTheDocument();
  });

  it("ParticipantChip shows the name and status, with the initial hidden from screen readers", () => {
    render(<ParticipantChip name="Sam" status="On the way" />);
    expect(screen.getByText("Sam")).toBeInTheDocument();
    expect(screen.getByText("On the way")).toBeInTheDocument();
    expect(screen.getByText("S")).toHaveAttribute("aria-hidden", "true");
  });
});
