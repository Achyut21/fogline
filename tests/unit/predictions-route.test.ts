import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/mbta/predictions/route";
import { resetTrips, tripUpdatesUrl } from "@/server/predictions";
import { server } from "../msw/server";
import feed from "../fixtures/mbta/trip-updates.json";

const snapshot = feed.header.timestamp * 1000;

const ask = (station: string) =>
  GET(new NextRequest(`http://localhost/api/mbta/predictions?station=${station}`));

describe("GET /api/mbta/predictions", () => {
  beforeEach(() => {
    resetTrips();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(snapshot);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("[F2.5] answers a station's next departures and the feed's own time", async () => {
    server.use(http.get(tripUpdatesUrl, () => HttpResponse.json(feed)));
    const response = await ask("place-kencl");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.updatedAt).toBe(feed.header.timestamp);
    expect(body.departures).toHaveLength(6);
    expect(body.departures[0]).toEqual({
      route: "Green-D",
      direction: 0,
      destination: "place-river",
      departs: 1795327409,
    });
  });

  it("[F2.5] reads the feed once for every station asking within 5 s", async () => {
    const calls = vi.fn();
    server.use(
      http.get(tripUpdatesUrl, () => {
        calls();
        return HttpResponse.json(feed);
      }),
    );
    await Promise.all([ask("place-kencl"), ask("place-pktrm"), ask("place-harsq")]);
    vi.setSystemTime(snapshot + 4_000);
    await ask("place-kencl");
    expect(calls).toHaveBeenCalledTimes(1);
  });

  it("[F2.5] serves the last good feed with its old time when the MBTA feed fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    server.use(http.get(tripUpdatesUrl, () => HttpResponse.json(feed), { once: true }));
    await ask("place-kencl");
    server.use(http.get(tripUpdatesUrl, () => new HttpResponse(null, { status: 503 })));
    vi.setSystemTime(snapshot + 60_000);
    const response = await ask("place-kencl");
    expect(response.status).toBe(200);
    expect((await response.json()).updatedAt).toBe(feed.header.timestamp);
  });

  it("answers 502 when the feed has never answered, and 400 for an unknown station", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    server.use(http.get(tripUpdatesUrl, () => HttpResponse.error()));
    expect((await ask("place-kencl")).status).toBe(502);
    expect((await ask("place-nowhere")).status).toBe(400);
  });
});
