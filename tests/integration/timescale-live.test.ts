import { afterAll, describe, expect, it } from "vitest";
import { createDb } from "@/server/db/client";
import { timescaleVersion } from "@/server/db/health";

const url = process.env.LIVE_DATABASE_URL ?? "";

describe.skipIf(url === "")("fogline-db, read-only", () => {
  const db = createDb(url);
  afterAll(() => db.$client.end());

  it("has the timescaledb extension installed", async () => {
    expect(await timescaleVersion(db)).toMatch(/^\d+\.\d+\.\d+/);
  });
});
