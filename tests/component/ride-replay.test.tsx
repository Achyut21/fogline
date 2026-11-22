import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RideReplay, type ReplayStop } from "@/components/ride/ride-replay";
import { ride } from "@/copy";

const record = vi.hoisted(() => vi.fn());
vi.mock("@/server/actions/ride", () => ({ recordReplayStop: record }));

const reduced = vi.hoisted(() => ({ current: false }));
vi.mock("motion/react", async (original) => ({
  ...(await original<typeof import("motion/react")>()),
  useReducedMotionConfig: () => reduced.current,
  // jsdom never finishes an exit animation, so cards swap at once here.
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
}));

const minute = 60_000;
const t0 = new Date("2026-11-22T01:00:00-05:00").getTime();
const story = (title: string) => ({
  story: { title, url: `https://en.wikipedia.org/wiki/${title}`, fact: `${title} fact.` },
  image: null,
});

const stops: ReplayStop[] = [
  { station: "place-kencl", name: "Kenmore", at: t0, card: story("Kenmore"), miles: 0 },
  {
    station: "place-fenwy",
    name: "Fenway",
    at: t0 + 2 * minute,
    card: story("Fenway"),
    miles: 0.6,
  },
  { station: "place-longw", name: "Longwood", at: t0 + 4 * minute, card: null, miles: 1.1 },
  {
    station: "place-bvmnl",
    name: "Brookline Village",
    at: t0 + 6 * minute,
    card: story("Brookline"),
    miles: 1.7,
  },
];

function renderReplay() {
  return render(
    <RideReplay
      tripId="trip-1"
      from="place-kencl"
      route="Green-D"
      destination="Riverside"
      stops={stops}
    />,
  );
}

/** Advance the replay clock by this many recorded minutes at the given speed. */
async function play(minutes: number, speed: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync((minutes * minute) / speed);
  });
}

const stat = (label: string) => {
  const term = screen.getByText(label, { selector: "dt" });
  const tile = term.parentElement;
  if (!tile) throw new Error(`no tile for ${label}`);
  return within(tile).getByText(/\d/, { selector: ".sr-only" }).textContent;
};

beforeEach(() => {
  vi.useFakeTimers();
  reduced.current = false;
  record.mockReset();
  record.mockResolvedValue({ kind: "recorded", newCells: ["a", "b", "c"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("RideReplay", () => {
  it("[F3.5] labels the ride as a replay and plays faster at a higher speed", async () => {
    renderReplay();
    expect(screen.getAllByText(ride.replay.label).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Kenmore");
    expect(screen.getByText(ride.replay.next("Fenway", 2))).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: ride.replay.speedOption(20) }));
    await play(2, 20);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Fenway");
  });

  it("[F3.3] shows the stop card for the stop the train is at", async () => {
    renderReplay();
    expect(screen.getByText("Kenmore fact.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: ride.replay.speedOption(20) }));
    await play(2, 20);
    expect(screen.getByText("Fenway fact.")).toBeInTheDocument();
    expect(screen.queryByText("Kenmore fact.")).not.toBeInTheDocument();
  });

  it("[F3.8] records every stop it reaches once, in order", async () => {
    renderReplay();
    fireEvent.click(screen.getByRole("radio", { name: ride.replay.speedOption(20) }));
    await play(6, 20);
    expect(record.mock.calls.map(([input]) => input.index)).toEqual([0, 1, 2, 3]);
    expect(record).toHaveBeenCalledWith({ tripId: "trip-1", from: "place-kencl", index: 3 });
  });

  it("[F3.4] ends at the last stop with stops, miles, minutes and new cells", async () => {
    reduced.current = true;
    renderReplay();
    fireEvent.click(screen.getByRole("radio", { name: ride.replay.speedOption(20) }));
    await play(6, 20);
    expect(screen.getByRole("heading", { name: ride.summary.title })).toBeInTheDocument();
    expect(stat(ride.summary.stops)).toBe("3");
    expect(stat(ride.summary.miles)).toBe(`1.7${ride.summary.milesSuffix}`);
    expect(stat(ride.summary.minutes)).toBe("6");
    expect(stat(ride.summary.cells)).toBe("12");
    expect(screen.getByRole("link", { name: ride.summary.done })).toHaveAttribute("href", "/");
  });

  it("[F3.4] End stops the replay early and sums only the stops passed", async () => {
    reduced.current = true;
    renderReplay();
    fireEvent.click(screen.getByRole("radio", { name: ride.replay.speedOption(20) }));
    await play(2, 20);
    fireEvent.click(screen.getByRole("button", { name: ride.replay.end }));
    expect(screen.getByRole("heading", { name: ride.summary.title })).toBeInTheDocument();
    expect(stat(ride.summary.stops)).toBe("1");
    expect(stat(ride.summary.minutes)).toBe("2");
    await play(10, 20);
    expect(record).toHaveBeenCalledTimes(2);
  });
});
