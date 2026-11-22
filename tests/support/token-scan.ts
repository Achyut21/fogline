// The design-token check (PHASES standing checks, D-054): raw colors, pixel values, arbitrary
// Tailwind values, Tailwind's default palette, off-scale spacing and raw durations are findings.

export type Finding = { line: number; rule: string; match: string };

const spacingSteps = new Set(["0", "1", "2", "3", "4", "5", "6", "8", "10", "14", "18"]);

const rules: { rule: string; pattern: RegExp; allow?: (m: RegExpMatchArray) => boolean }[] = [
  { rule: "hex color", pattern: /(?<![\w&/])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi },
  { rule: "color function", pattern: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/g },
  { rule: "pixel value", pattern: /\b\d+(?:\.\d+)?px\b/g },
  {
    rule: "arbitrary Tailwind value",
    pattern: /(?<![\w-])[a-z][\w:-]*-\[[^\]\s]*[\d#][^\]\s]*\]/g,
  },
  {
    rule: "Tailwind palette color",
    pattern:
      /\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|decoration|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)\b/g,
  },
  {
    rule: "off-scale spacing",
    pattern:
      /(?<![\w-])-?(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy])-(\d+(?:\.\d+)?)(?![\w.])/g,
    allow: (m) => spacingSteps.has(m[1]),
  },
  { rule: "raw duration", pattern: /(?<![\w-])(?:duration|delay)-\d+\b/g },
];

export function scan(text: string): Finding[] {
  const findings: Finding[] = [];
  text.split("\n").forEach((content, index) => {
    for (const { rule, pattern, allow } of rules) {
      for (const m of content.matchAll(pattern)) {
        if (allow?.(m)) continue;
        findings.push({ line: index + 1, rule, match: m[0] });
      }
    }
  });
  return findings;
}
