import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { createScratchDatabase } from "./scratch-database";

const testUrl = process.env.DATABASE_URL_TEST ?? "";

async function callHealth(databaseUrl: string | undefined) {
  vi.stubEnv("DATABASE_URL", databaseUrl);
  vi.resetModules();
  const { GET } = await import("@/app/api/health/route");
  const { getDb } = await import("@/server/db/client");
  if (databaseUrl) onTestFinished(() => getDb().$client.end());
  return GET();
}

describe("GET /api/health", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.skipIf(testUrl === "")("returns 200 when the database has timescaledb", async () => {
    const response = await callHealth(testUrl);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ db: true, timescaledb: true });
  });

  it.skipIf(testUrl === "")("returns 503 when the database lacks timescaledb", async () => {
    const scratch = await createScratchDatabase(testUrl);
    onTestFinished(() => scratch.drop());
    const response = await callHealth(scratch.url);
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ db: true, timescaledb: false });
  });

  it("returns 503 and logs when the database can't be reached", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await callHealth("postgres://nobody:nothing@127.0.0.1:1/none");
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ db: false, timescaledb: false });
    expect(String(logged.mock.calls[0]?.[0])).toContain("health check failed");
  });

  it("returns 503 when DATABASE_URL isn't set", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await callHealth(undefined);
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ db: false, timescaledb: false });
  });
});
