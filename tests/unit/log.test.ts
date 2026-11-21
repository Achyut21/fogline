import { afterEach, describe, expect, it, vi } from "vitest";
import { log } from "@/lib/log";

function onlyLine(spy: { mock: { calls: unknown[][] } }): unknown {
  expect(spy.mock.calls).toHaveLength(1);
  return JSON.parse(String(spy.mock.calls[0]?.[0]));
}

describe("log", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes one JSON line with level, message, time and context", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    log.info("feed fetched", { route: "Red", vehicles: 12 });
    expect(onlyLine(spy)).toMatchObject({
      level: "info",
      message: "feed fetched",
      route: "Red",
      vehicles: 12,
      time: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    });
  });

  it("keeps its own fields when the context uses the same keys", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    log.warn("stale feed", { time: 1700000000, level: "debug", message: "other" });
    expect(onlyLine(spy)).toMatchObject({
      level: "warn",
      message: "stale feed",
      time: expect.any(String),
    });
  });

  it("includes the error's cause chain", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new TypeError("fetch failed", { cause: new Error("connect ECONNREFUSED") });
    log.error("MBTA feed down", error, { feed: "vehicles" });
    expect(onlyLine(spy)).toMatchObject({
      feed: "vehicles",
      error: {
        name: "TypeError",
        message: "fetch failed",
        cause: { name: "Error", message: "connect ECONNREFUSED" },
      },
    });
  });

  it("stops following causes after three levels", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    let error = new Error("level 0");
    for (let depth = 1; depth <= 5; depth += 1) {
      error = new Error(`level ${depth}`, { cause: error });
    }
    log.error("deep", error);
    const line = onlyLine(spy);
    expect(line).toMatchObject({
      error: { message: "level 5", cause: { cause: { cause: { message: "level 2" } } } },
    });
    expect(line).not.toHaveProperty("error.cause.cause.cause.cause");
  });

  it("serializes thrown objects that aren't Errors", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    log.error("odd throw", { code: "E_FEED", status: 503 });
    expect(onlyLine(spy)).toMatchObject({
      error: { name: "NonError", message: '{"code":"E_FEED","status":503}', stack: null },
    });
  });

  it("falls back to String() for values JSON can't serialize", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    log.error("bigint throw", BigInt(10));
    expect(onlyLine(spy)).toMatchObject({ error: { name: "NonError", message: "10" } });
  });
});
