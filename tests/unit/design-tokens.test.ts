import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrast } from "@/lib/contrast";
import { duration, ease } from "@/lib/motion";
import { parseTokens } from "@/lib/tokens";
import { lines, textPairs } from "@/styles/pairs";
import { colorGroups } from "@/styles/swatches";
import { themeColor } from "@/styles/theme-color";
import { scan } from "../support/token-scan";

const root = path.resolve(import.meta.dirname, "../..");
const css = readFileSync(path.join(root, "src/styles/tokens.css"), "utf8");

const themes = parseTokens(css);
const { day } = themes;

// Raw values are allowed only in the token files and, until item 6 restyles them, in the stock
// shadcn primitives (D-037, extended by D-054).
const exempt = [
  "src/styles/tokens.css",
  "src/styles/theme-color.ts",
  "src/lib/motion.ts",
  "src/components/ui/",
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|css)$/.test(entry.name) ? [full] : [];
  });
}

describe("design tokens", () => {
  it("finds no raw colors, lengths, times, layers, arbitrary values, palette colors or off-scale spacing in src", () => {
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
    expect(rules('className="duration-[300ms]"')).toContain("arbitrary Tailwind value");
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
    expect(rules("transition: opacity 300ms ease;")).toEqual(["time value"]);
    expect(rules('style={{ transitionDuration: "0.3s" }}')).toContain("raw duration");
    expect(rules("transition={{ duration: 0.3 }}")).toEqual(["raw duration"]);
    expect(rules('className="[transition-duration:300ms]"')).toContain(
      "arbitrary Tailwind property",
    );
    expect(rules("style={{ marginTop: 12 }}")).toEqual(["inline style length"]);
    expect(rules('style={{ padding: "0.3rem" }}')).toContain("rem value");
    expect(rules('className="z-50"')).toEqual(["raw layer"]);
    expect(rules("zIndex: 40,")).toEqual(["raw layer"]);
    expect(rules('className="divide-gray-200 border-t-red-500 caret-white"')).toEqual([
      "Tailwind palette color",
      "Tailwind palette color",
      "Tailwind palette color",
    ]);
    expect(
      scan(
        'className="bg-accent text-ink p-4 gap-6 mt-14 rounded-lg duration-(--duration-fast) z-(--layer-sheet) data-[state=open]:p-2 nth-[3]:gap-1"',
      ),
    ).toEqual([]);
    expect(scan('<a href="#add">')).toEqual([]);
    expect(scan("transition={{ duration: duration.fast, ease: ease.standard }}")).toEqual([]);
    expect(scan('style={{ background: "var(--fog)", flex: 1 }}')).toEqual([]);
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

  // WCAG 1.4.11 asks for 3:1 against adjacent colors. Where a line is too close to the ground,
  // its casing is the adjacent color, so the line needs 3:1 against the casing there (D-054).
  it.each(Object.entries(themes))(
    "[F2.3] keeps every line at 3:1 against each %s map ground, or against its casing",
    (_, t) => {
      const grounds = ["map-land", "map-water", "map-park", "map-road", "fog"];
      const failing = lines.flatMap((name) => {
        const line = t[`line-${name}`];
        const casing = t[`line-${name}-casing`];
        return grounds
          .filter((g) => contrast(line, t[g]) < 3 && contrast(line, casing) < 3)
          .map((g) => `${name} on ${g}`);
      });
      expect(failing).toEqual([]);
    },
  );

  it("gives the browser chrome the background color of each theme", () => {
    expect(themeColor.day).toBe(themes.day.bg);
    expect(themeColor.night).toBe(themes.night.bg);
  });

  it("exports the same durations and easings to Motion as the CSS tokens", () => {
    const css = (prefix: string) =>
      Object.fromEntries(
        Object.entries(day)
          .filter(([name]) => name.startsWith(prefix))
          .map(([name, value]) => [name.slice(prefix.length), value]),
      );
    expect(css("duration-")).toEqual(
      Object.fromEntries(
        Object.entries(duration).map(([name, s]) => [name, `${Math.round(s * 1000)}ms`]),
      ),
    );
    expect(css("motion-")).toEqual(
      Object.fromEntries(
        Object.entries(ease).map(([name, curve]) => [name, `cubic-bezier(${curve.join(", ")})`]),
      ),
    );
  });

  it("shows every color token on /design exactly once", () => {
    const colors = Object.keys(day)
      .filter((name) => /^(#|rgb\()/.test(day[name]))
      .sort();
    const shown = colorGroups.flatMap((group) => group.names).sort();
    expect(shown).toEqual(colors);
  });

  it("reads tokens past comments, with night overriding day", () => {
    const parsed = parseTokens(
      ":root { /* a } and --gone: #123; */ --a: #ffffff; --b: 1rem; } .dark { --a: #000000; }",
    );
    expect(parsed).toEqual({
      day: { a: "#ffffff", b: "1rem" },
      night: { a: "#000000", b: "1rem" },
    });
  });

  it("rejects colors that aren't opaque hex", () => {
    expect(() => contrast("rgb(0 0 0)", "#ffffff")).toThrow("Not an opaque hex color");
    expect(contrast("#000", "#fff")).toBeCloseTo(21);
  });
});
