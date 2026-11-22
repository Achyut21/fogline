import { describe, expect, it } from "vitest";
import { checkRewrite, cityWords, violationWords } from "@/lib/violations";
import { data } from "@/server/data";

describe("plain-English violations", () => {
  it("[F11.2] accepts one plain sentence and rejects hype, dashes and invented numbers", () => {
    const source = cityWords("Hand Drying Provision (Pf)");
    expect(source).toBe("Hand Drying Provision");
    expect(checkRewrite("No paper towels or hand dryer at the sink.", source)).toBeNull();
    expect(checkRewrite("No paper towels at the sink", source)).toMatch(/period/);
    expect(checkRewrite("Towels missing. Sink dirty.", source)).toMatch(/one sentence/);
    expect(checkRewrite("Hand drying was missing — a crucial lapse.", source)).not.toBeNull();
    expect(checkRewrite("Found 3 sinks without towels.", source)).toMatch(/number 3/);
    expect(checkRewrite("x".repeat(91) + ".", source)).toMatch(/over 90/);
  });

  it("[F11.2] keeps only checked rewrites of real city descriptions", () => {
    const file = data.violations();
    const texts = new Set(
      data.places().flatMap((p) => (p.grade ? p.grade.violations.map((v) => v.text) : [])),
    );
    for (const [text, rewrite] of Object.entries(file.rewrites)) {
      expect(texts.has(text), text).toBe(true);
      expect(checkRewrite(rewrite, cityWords(text)), text).toBeNull();
    }
  });

  it("[F11.2] falls back to the city's words when there is no rewrite", () => {
    expect(violationWords("Backflow Prevention (P)", { model: "m", rewrites: {} })).toBe(
      "Backflow Prevention",
    );
  });
});
