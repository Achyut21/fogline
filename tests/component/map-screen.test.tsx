import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { MapScreen } from "@/components/map/map-screen";
import { map, ride } from "@/copy";
import type { MapData } from "@/server/map-data";

vi.mock("next/dynamic", () => ({ default: () => () => null }));

const data: MapData = {
  cells: [["892a3066cdbffff", "seen"]],
  share: 0.003,
  regions: [
    { id: "fenway", name: "Fenway", share: 0.15 },
    { id: "allston", name: "Allston", share: 0 },
  ],
  home: { lat: 42.35, lon: -71.1 },
  firstVisit: true,
  stations: [
    {
      id: "place-bucen",
      name: "Boston University Central",
      lines: ["Green-B"],
      uncovered: true,
      home: true,
      minutes: 0,
      spots: [],
      card: null,
    },
    {
      id: "place-kencl",
      name: "Kenmore",
      lines: ["Green-B", "Green-C", "Green-D"],
      uncovered: false,
      home: false,
      minutes: 4,
      spots: [],
      card: null,
    },
  ],
  lines: [],
  mapStations: [],
};

it("[F2.4] shows Boston's uncovered share and the first-reveal card", () => {
  localStorage.clear();
  render(<MapScreen data={data} homeStation="place-bucen" />);
  expect(screen.getByText("0.3%")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: map.firstReveal.title })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: map.firstReveal.dismiss }));
  expect(screen.queryByRole("heading", { name: map.firstReveal.title })).toBeNull();
});

it("[F2.4] shows the first-reveal card once per device, then the Ride button", () => {
  localStorage.clear();
  const first = render(<MapScreen data={data} homeStation="place-bucen" />);
  fireEvent.click(screen.getByRole("button", { name: map.firstReveal.dismiss }));
  first.unmount();
  render(<MapScreen data={data} homeStation="place-bucen" />);
  expect(screen.queryByRole("heading", { name: map.firstReveal.title })).toBeNull();
  expect(screen.getByRole("link", { name: ride.mapButton })).toHaveAttribute(
    "href",
    "/ride?from=place-bucen",
  );
});

it("[F2.7] [F2.3] lists neighborhoods and stations with line names and fog state", () => {
  render(<MapScreen data={data} homeStation="place-bucen" />);
  fireEvent.click(screen.getByRole("radio", { name: map.view.list }));
  expect(screen.getByText("Fenway").closest("li")).toHaveTextContent("15%");
  const kenmore = screen.getByText("Kenmore").closest("li");
  if (!kenmore) throw new Error("Kenmore row missing");
  expect(within(kenmore).getByText("Green Line C")).toBeInTheDocument();
  expect(kenmore).toHaveTextContent(map.list.fog);
  expect(screen.getByText("Boston University Central").closest("li")).toHaveTextContent(
    map.list.uncovered,
  );
});
