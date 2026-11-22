import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { alertsUrl, currentAlerts, resetAlerts } from "@/server/alerts";

const recorded = readFileSync(
  path.join(import.meta.dirname, "../fixtures/mbta/alerts.json"),
  "utf8",
);
const t0 = new Date("2026-11-27T23:00:00-05:00").getTime();

function serve(...answers: (string | number)[]) {
  const fetch = vi.fn(async (url: string) => {
    expect(url).toBe(alertsUrl);
    const answer = answers.shift() ?? 500;
    return typeof answer === "number"
      ? new Response("down", { status: answer })
      : new Response(answer, { status: 200, headers: { "content-type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const at = async (ms: number) => {
  vi.setSystemTime(ms);
  return currentAlerts();
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  resetAlerts();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("alerts feed", () => {
  it("[F5.6] fetches once a minute and serves the copy in between", async () => {
    const fetch = serve(recorded, recorded);
    expect(await at(t0)).toHaveLength(1);
    expect(await at(t0 + 30_000)).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await at(t0 + 61_000)).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("[F5.6] keeps the last good copy when the feed fails, and null when it never answered", async () => {
    serve(500);
    expect(await at(t0)).toBeNull();
    resetAlerts();
    const fetch = serve(recorded, 503);
    expect(await at(t0)).toHaveLength(1);
    expect(await at(t0 + 61_000)).toHaveLength(1);
    // The failure is remembered for a minute, so the next call doesn't fetch again.
    expect(await at(t0 + 62_000)).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("[F5.6] shares one fetch between callers that arrive together", async () => {
    const fetch = serve(recorded);
    vi.setSystemTime(t0);
    const [a, b] = await Promise.all([currentAlerts(), currentAlerts()]);
    expect(a).toEqual(b);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
