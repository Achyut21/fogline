import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { StationSheet } from "@/components/map/station-sheet";
import { grades, legal, map, system } from "@/copy";
import type { MapData } from "@/server/map-data";
import { server } from "../msw/server";

type Station = MapData["stations"][number];

const kenmore: Station = {
  id: "place-kencl",
  name: "Kenmore",
  lines: ["Green-B", "Green-C", "Green-D"],
  uncovered: true,
  home: false,
  minutes: 4,
  spots: [
    {
      id: "osm:1",
      name: "Pavement Coffeehouse",
      category: "coffee",
      walkM: 160,
      grade: "A",
      inspected: "2026-04-09",
    },
    {
      id: "osm:2",
      name: "Fenway Park",
      category: "park",
      walkM: 400,
      grade: null,
      inspected: null,
    },
  ],
  card: {
    story: {
      title: "Fenway Park",
      url: "https://en.wikipedia.org/wiki/Fenway_Park",
      fact: "Fenway Park opened in 1912.",
    },
    image: null,
  },
};

const names = new Map([
  ["place-kencl", "Kenmore"],
  ["place-river", "Riverside"],
  ["place-gover", "Government Center"],
]);

function answer(updatedAt: number, departures: object[]) {
  server.use(
    http.get("*/api/mbta/predictions", () =>
      HttpResponse.json({ station: "place-kencl", updatedAt, departures }),
    ),
  );
}

function open(station: Station = kenmore) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <StationSheet station={station} names={names} onClose={() => {}} />
    </QueryClientProvider>,
  );
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

it("[F2.5] shows the station, its lines, minutes from home and live trains by direction", async () => {
  const now = nowSeconds();
  answer(now - 10, [
    { route: "Green-D", direction: 0, destination: "place-river", departs: now + 150 },
    { route: "Green-C", direction: 1, destination: "place-gover", departs: now + 400 },
  ]);
  open();
  expect(screen.getByRole("heading", { name: "Kenmore" })).toBeInTheDocument();
  expect(screen.getByText(map.sheet.fromHome(4))).toBeInTheDocument();
  expect(screen.getByText("Green Line B")).toBeInTheDocument();

  const west = await screen.findByRole("region", { name: map.sheet.direction("Green-D", 0) });
  expect(within(west).getByText("Riverside").closest("li")).toHaveTextContent("2 min");
  const east = screen.getByRole("region", { name: map.sheet.direction("Green-C", 1) });
  expect(within(east).getByText("Government Center").closest("li")).toHaveTextContent("6 min");
  expect(screen.getByText(system.stale(0))).toBeInTheDocument();
  expect(screen.getByText(legal.mbta)).toBeInTheDocument();
});

it("[F2.5] marks train times older than 90 s as stale and shows their age", async () => {
  answer(nowSeconds() - 4 * 60, []);
  open();
  const chip = await screen.findByText(system.stale(4));
  expect(chip.closest("[data-stale]")).toHaveAttribute("data-stale", "true");
  expect(screen.getByText(map.sheet.empty.title)).toBeInTheDocument();
});

it("[F2.5] [F11.3] says train times failed and keeps the spots, with the unofficial grade label", async () => {
  server.use(http.get("*/api/mbta/predictions", () => new HttpResponse(null, { status: 502 })));
  open();
  expect(await screen.findByText(map.sheet.error.title)).toBeInTheDocument();
  const coffee = screen.getByText("Pavement Coffeehouse").closest("li");
  expect(coffee).toHaveTextContent(
    map.sheet.meta([map.sheet.category.coffee, map.sheet.walk(160)]),
  );
  expect(coffee).toHaveTextContent(`${grades.letter("A")}, ${grades.inspected("2026-04-09")}`);
  expect(screen.getByText("Fenway Park").closest("li")).not.toHaveTextContent(grades.noMatch);
  expect(screen.getByText(legal.grade)).toBeInTheDocument();
});

it("[F2.5] shows the stop card only once the station is uncovered", async () => {
  answer(nowSeconds(), []);
  const { unmount } = open();
  expect(screen.getByText("Fenway Park opened in 1912.")).toBeInTheDocument();
  await screen.findByText(map.sheet.empty.title);
  unmount();
  open({ ...kenmore, uncovered: false, card: null });
  await screen.findByText(map.sheet.empty.title);
  expect(screen.queryByRole("heading", { name: map.sheet.card })).toBeNull();
});

it("[F2.5] drops trains that already left, even when the times are old", async () => {
  const now = nowSeconds();
  answer(now - 600, [
    { route: "Green-D", direction: 0, destination: "place-river", departs: now - 300 },
  ]);
  open();
  expect(await screen.findByText(map.sheet.agedOut)).toBeInTheDocument();
  expect(screen.queryByText("Riverside")).toBeNull();
});
