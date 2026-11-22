import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrast } from "@/lib/contrast";
import { duration, ease } from "@/lib/motion";
import { parseTokens } from "@/lib/tokens";
import { lines, textPairs } from "@/styles/pairs";
import { themeColor } from "@/styles/theme-color";
import { scan } from "../support/token-scan";

const root = path.resolve(import.meta.dirname, "../..");
const css = readFileSync(path.join(root, "src/styles/tokens.css"), "utf8");

const themes = parseTokens(css);
const { day } = themes;

// Raw values are allowed only in the token files and, until item 6 restyles them, in the stock
// shadcn primitives (D-037, extended by D-053).
const exempt = ["src/styles/tokens.css", "src/styles/theme-color.ts", "src/components/ui/"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|css)$/.test(entry.name) ? [full] : [];
  });
}

describe("design tokens", () => {
  it("finds no raw colors, pixels, arbitrary values, palette colors or off-scale spacing in src", () => {
    const findings = sourceFiles(path.join(root, "src"))
      .map((file) => path.relative(root, file))
      .filter((file) => !exempt.some((prefix) => file.startsWith(prefix)))
      .flatMap((file) =>
        scan(readFileSync(path.join(root, file), "utf8")).map(
          (f) => `${file}:${f.line} ${f.rule}: ${f.match}`,
        ),
      );
    expect(findings).toEqual([]);
  });

  it("flags each kind of raw value and lets token classes through", () => {
    const rules = (text: string) => scan(text).map((f) => f.rule);
    expect(rules('style={{ color: "#0b7a75" }}')).toEqual(["hex color"]);
    expect(rules("color: rgb(0 0 0 / 0.4);")).toEqual(["color function"]);
    expect(rules('className="h-12px"')).toEqual(["pixel value"]);
    expect(rules('className="w-[100px] p-[3px]"')).toContain("arbitrary Tailwind value");
    expect(rules('className="duration-[300ms]"')).toEqual(["arbitrary Tailwind value"]);
    expect(rules('className="bg-red-500 text-white"')).toEqual([
      "Tailwind palette color",
      "Tailwind palette color",
    ]);
    expect(rules('className="p-7 gap-0.5 mt-9"')).toEqual([
      "off-scale spacing",
      "off-scale spacing",
      "off-scale spacing",
    ]);
    expect(rules('className="duration-300"')).toEqual(["raw duration"]);
    expect(
      scan(
        'className="bg-accent text-ink p-4 gap-6 mt-14 rounded-lg duration-(--duration-fast) data-[state=open]:p-2"',
      ),
    ).toEqual([]);
  });

  it.each(Object.entries(themes))("meets WCAG AA for every text pair in %s", (_, tokens) => {
    const failing = textPairs
      .map(({ fg, bg }) => ({ pair: `${fg} on ${bg}`, ratio: contrast(tokens[fg], tokens[bg]) }))
      .filter(({ ratio }) => ratio < 4.5);
    expect(failing).toEqual([]);
  });

  it("[F2.3] keeps the official MBTA line colors", () => {
    expect([day["line-red"], day["line-orange"], day["line-blue"], day["line-green"]]).toEqual([
      "#da291c",
      "#ed8b00",
      "#003da5",
      "#00843d",
    ]);
  });

  it.each(Object.entries(themes))(
    "[F2.3] makes every line stand out from the %s basemap at 3:1, on its own or through its casing",
    (_, t) => {
      const failing = lines.filter((name) => {
        const line = t[`line-${name}`];
        const casing = t[`line-${name}-casing`];
        const ground = [t["map-land"], t["map-water"]];
        const alone = ground.every((g) => contrast(line, g) >= 3);
        const cased = contrast(line, casing) >= 3 && ground.every((g) => contrast(casing, g) >= 3);
        return !alone && !cased;
      });
      expect(failing).toEqual([]);
    },
  );

  it("gives the browser chrome the background color of each theme", () => {
    expect(themeColor.day).toBe(themes.day.bg);
    expect(themeColor.night).toBe(themes.night.bg);
  });

  it("exports the same durations and easings to Motion as the CSS tokens", () => {
    for (const [name, seconds] of Object.entries(duration)) {
      expect(`${Math.round(seconds * 1000)}ms`).toBe(day[`duration-${name}`]);
    }
    expect(`cubic-bezier(${ease.standard.join(", ")})`).toBe(day["motion-standard"]);
    expect(`cubic-bezier(${ease.exit.join(", ")})`).toBe(day["motion-exit"]);
  });

  it("rejects colors that aren't opaque hex", () => {
    expect(() => contrast("rgb(0 0 0)", "#ffffff")).toThrow("Not an opaque hex color");
    expect(contrast("#000", "#fff")).toBeCloseTo(21);
  });
});
