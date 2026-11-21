import { afterEach, describe, expect, it, vi } from "vitest";
import { parseFlags } from "@/lib/flags";

async function loadFlags(raw: string | undefined) {
  vi.stubEnv("NEXT_PUBLIC_FLAGS", raw);
  vi.resetModules();
  return import("@/lib/flags");
}

describe("parseFlags", () => {
  it("reads a comma list of feature IDs, ignoring case and spaces", () => {
    expect([...parseFlags(" f1 , F2,,f16")]).toEqual(["F1", "F2", "F16"]);
  });

  it("ignores IDs that aren't features", () => {
    expect([...parseFlags("F99,F4.3,ride")]).toEqual([]);
  });

  it("turns nothing on when the variable is unset", () => {
    expect(parseFlags(undefined).size).toBe(0);
  });
});

describe("isEnabled", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("turns on only the features listed in NEXT_PUBLIC_FLAGS", async () => {
    const { isEnabled } = await loadFlags("F1,F7");
    expect(isEnabled("F1")).toBe(true);
    expect(isEnabled("F7")).toBe(true);
    expect(isEnabled("F2")).toBe(false);
  });

  it("turns every feature off when NEXT_PUBLIC_FLAGS is unset", async () => {
    const { features, isEnabled } = await loadFlags(undefined);
    expect(features.filter((feature) => isEnabled(feature))).toEqual([]);
  });
});
