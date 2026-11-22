import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { puzzleFor } from "@/lib/puzzle";
import { calendarDateOf } from "@/lib/time";
import { submitGuess } from "@/server/actions/daily";
import { data } from "@/server/data";
import { createDb, type Db } from "@/server/db/client";
import { puzzleResults } from "@/server/db/schema";
import { insertProfile } from "@/server/profile";
import { stationById } from "@/server/stations";
import { createScratchDatabase } from "./scratch-database";

const session = vi.hoisted(() => ({ db: null as unknown, viewer: null as string | null }));

vi.mock("@/server/db/client", async (original) => ({
  ...(await original<typeof import("@/server/db/client")>()),
  getDb: () => session.db,
}));
vi.mock("@/server/session", async (original) => ({
  ...(await original<typeof import("@/server/session")>()),
  sessionProfileId: async () => session.viewer,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}));

const testUrl = process.env.DATABASE_URL_TEST ?? "";
const answer = puzzleFor(data.events(), calendarDateOf(new Date()))?.word ?? "";
const wrong = data
  .words()
  .words.filter((w) => w !== answer)
  .slice(0, 12);

describe.skipIf(testUrl === "" || answer === "")("daily puzzle guesses", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    session.db = db;
    await migrate(db, { migrationsFolder: "drizzle" });
    const home = stationById("place-pktrm");
    if (!home) throw new Error("Park Street missing");
    const { id } = await insertProfile(db, {
      name: "Maya",
      school: "Boston University",
      home,
      ageBand: "under21",
    });
    session.viewer = id;
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  it("[F7.2] keeps six guesses when many are sent at once", async () => {
    const results = await Promise.all(wrong.slice(0, 10).map((guess) => submitGuess({ guess })));
    expect(results.filter((r) => r.kind === "played")).toHaveLength(6);
    expect(results.filter((r) => r.kind === "rejected")).toHaveLength(4);
    const [row] = await db
      .select()
      .from(puzzleResults)
      .where(eq(puzzleResults.profileId, session.viewer ?? ""));
    expect(row.guesses).toHaveLength(6);
    expect(row.solved).toBe(false);
    expect(await submitGuess({ guess: answer })).toEqual({ kind: "rejected", error: "finished" });
  });
});
