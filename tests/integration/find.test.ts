import { APICallError } from "ai";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { findFromPhoto, tasteOfHome } from "@/server/actions/find";
import { createDb, type Db } from "@/server/db/client";
import { insertProfile } from "@/server/profile";
import { stationById } from "@/server/stations";
import { createScratchDatabase } from "./scratch-database";

const session = vi.hoisted(() => ({ db: null as unknown, viewer: null as string | null }));
const gemini = vi.hoisted(() => vi.fn());

vi.mock("ai", async (original) => ({
  ...(await original<typeof import("ai")>()),
  generateText: gemini,
}));
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
const maps = (titles: string[]) => ({
  google: { groundingMetadata: { groundingChunks: titles.map((title) => ({ maps: { title } })) } },
});
const grounded = [
  'Wusong Road Tiki Bar | "Great dumplings with the drinks."',
  'Studio No 3 | "The soup dumplings are the best I have had here."',
  'Nowhere Noodles | "Fantastic."',
  'Cafe Luna | "Dumplings on the brunch menu."',
].join("\n");

function photoForm(type = "image/png", bytes = 64) {
  const form = new FormData();
  form.set("photo", new File([new Uint8Array(bytes)], "dish.png", { type }));
  return form;
}

describe.skipIf(testUrl === "")("find it and taste of home", () => {
  let scratch: Awaited<ReturnType<typeof createScratchDatabase>>;
  let db: Db;

  beforeAll(async () => {
    scratch = await createScratchDatabase(testUrl);
    db = createDb(scratch.url);
    session.db = db;
    await migrate(db, { migrationsFolder: "drizzle" });
    const home = stationById("place-pktrm");
    if (!home) throw new Error("Park Street missing");
    ({ id: session.viewer } = await insertProfile(db, {
      name: "Maya",
      school: "Boston University",
      home,
      ageBand: "under21",
    }));
  });

  afterAll(async () => {
    await db.$client.end();
    await scratch.drop();
  });

  beforeEach(() => gemini.mockReset());

  it("[F14.1] [F14.2] [F14.3] turns a photo into known spots with their review quotes", async () => {
    gemini
      .mockResolvedValueOnce({ output: { food: true, dish: "soup dumplings" } })
      .mockResolvedValueOnce({
        text: grounded,
        // Cafe Luna is in the text but not in the grounding data, so it's dropped.
        providerMetadata: maps(["Wusong Road Tiki Bar", "Studio No 3", "Nowhere Noodles"]),
      });
    const result = await findFromPhoto(null, photoForm());
    if (result.kind !== "spots") throw new Error(`got ${result.kind}`);
    expect(result.dish).toBe("soup dumplings");
    // The bar is left out for an under-21 profile, and the unknown place isn't shown.
    expect(result.spots.map((s) => s.name)).toEqual(["Studio No 3"]);
    expect(result.spots[0].quote).toBe("The soup dumplings are the best I have had here.");
    expect(gemini.mock.calls[0][0].messages[0].content[1]).toMatchObject({
      type: "file",
      mediaType: "image/png",
    });
  });

  it("[F14.2] answers a repeat search from the cache", async () => {
    gemini.mockResolvedValueOnce({ output: { food: true, dish: "soup dumplings" } });
    const result = await findFromPhoto(null, photoForm());
    expect(result.kind).toBe("spots");
    expect(gemini).toHaveBeenCalledTimes(1);
  });

  it("[F14.1] refuses files that aren't small photos, and photos without food", async () => {
    expect(await findFromPhoto(null, photoForm("application/pdf"))).toEqual({ kind: "bad-image" });
    expect(await findFromPhoto(null, photoForm("image/png", 6 * 1024 * 1024))).toEqual({
      kind: "bad-image",
    });
    gemini.mockResolvedValueOnce({ output: { food: false, dish: "" } });
    expect(await findFromPhoto(null, photoForm())).toEqual({ kind: "not-food" });
  });

  it("[F14.2] says search is unavailable when Gemini fails", async () => {
    gemini.mockRejectedValueOnce(
      new APICallError({
        message: "quota",
        url: "https://generativelanguage.googleapis.com",
        requestBodyValues: {},
        statusCode: 429,
      }),
    );
    const form = new FormData();
    form.set("query", "Shanghai");
    expect(await tasteOfHome(null, form)).toEqual({ kind: "unavailable" });
  });

  it("[F14.1] stops a profile after 10 searches in an hour", async () => {
    gemini.mockResolvedValue({ output: { food: false, dish: "" } });
    const results = [];
    for (let i = 0; i < 8; i++) results.push((await findFromPhoto(null, photoForm())).kind);
    // Four searches ran in the tests above, so the 7th here is the 11th this hour.
    expect(results.slice(0, 6).every((kind) => kind === "not-food")).toBe(true);
    expect(results.slice(6)).toEqual(["busy", "busy"]);
  });
});
