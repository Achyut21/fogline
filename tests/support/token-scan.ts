// The design-token check (PHASES standing checks, D-054): raw colors, lengths, times, springs and
// layers, arbitrary Tailwind values, Tailwind's default palette and off-scale spacing are findings.
// It reads one line at a time, so an inline style or Motion transition split over lines can slip
// through. Whole seconds ("1s") pass, so copy like "the 1990s" doesn't trip it.

export type Finding = { line: number; rule: string; match: string };

const spacingSteps = new Set(["0", "1", "2", "3", "4", "5", "6", "8", "10", "14", "18"]);

const palette =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white";
const colorUtilities =
  "bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|fill|stroke|from|to|via|outline|decoration|shadow|inset-shadow|drop-shadow|text-shadow|divide|caret|accent|placeholder";
const lengthProps =
  "margin|padding|gap|inset|top|right|bottom|left|width|height|fontSize|lineHeight|letterSpacing|borderRadius";

const rules: { rule: string; pattern: RegExp; allow?: (m: RegExpMatchArray) => boolean }[] = [
  {
    rule: "hex color",
    pattern: /(?<![\w&/])(?<!href=\{?["'])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi,
  },
  { rule: "color function", pattern: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/g },
  { rule: "pixel value", pattern: /\b\d+(?:\.\d+)?px\b/g },
  { rule: "length value", pattern: /(?<![\w.-])\d*\.?\d+(?:rem|em|vw|vh|dvh|svh|lvh)\b/g },
  { rule: "time value", pattern: /(?<![\w.-])(?:\d*\.?\d+ms|\d*\.\d+s)\b/g },
  {
    rule: "arbitrary Tailwind value",
    pattern: /(?<![\w-])[a-z][\w:-]*-\[[^\]\s]*[\d#][^\]\s]*\](?!:)/g,
  },
  {
    rule: "arbitrary Tailwind property",
    pattern: /(?<![\w\]-])\[[a-z][a-z-]*:[^\]\s]*[\d#][^\]\s]*\](?!:)/g,
  },
  {
    rule: "Tailwind palette color",
    pattern: new RegExp(`(?<![\\w-])(?:${colorUtilities})-(?:${palette})\\b`, "g"),
  },
  {
    rule: "off-scale spacing",
    pattern:
      /(?<![\w-])-?(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy])-(\d+(?:\.\d+)?)(?![\w.])/g,
    allow: (m) => spacingSteps.has(m[1]),
  },
  { rule: "raw duration", pattern: /(?<![\w-])(?:duration|delay)-\d+\b/g },
  {
    rule: "raw duration",
    pattern: /\btransition\s*[:=]\s*\{\{?[^}]*\b(?:duration|delay)\s*:\s*[^,}]*\d/g,
  },
  {
    rule: "raw duration",
    pattern: /\b(?:transition|animation)(?:Duration|Delay)\s*:\s*["'`]?\d/g,
  },
  {
    rule: "inline style length",
    pattern: new RegExp(
      `style=\\{\\{[^}]*\\b(?:${lengthProps})[A-Za-z]*\\s*:\\s*["'\`]?-?\\d*\\.?[1-9]\\d*(?![\\d.]*%)`,
      "g",
    ),
  },
  { rule: "raw spring", pattern: /\b(?:stiffness|damping|mass|bounce)\s*:\s*\d/g },
  { rule: "raw layer", pattern: /(?<![\w-])-?z-\d+\b|\bzIndex\s*:\s*-?\d/g },
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
