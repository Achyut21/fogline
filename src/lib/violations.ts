import { z } from "zod";

// Plain-English violations (F11.2, DATA 2, item 8). The city's descriptions are a short fixed list, so
// `pnpm data:violations` has Gemini reword each one once into `data/violations.json`. The app
// shows the rewrite when there is one and the city's words otherwise. The level, date and points
// shown beside it come from the inspection record, never from the AI.

export const violationMaxLength = 90;

export const violationsFileSchema = z.object({
  model: z.string(),
  rewrites: z.record(z.string(), z.string().min(1).max(violationMaxLength)),
});
export type ViolationsFile = z.infer<typeof violationsFileSchema>;

/** The city's description without its code-category suffix: "(P)", "(Pf)" or "(C)". */
export function cityWords(text: string): string {
  return text.replace(/\s*\((?:P|Pf|C)\)\s*$/, "").trim();
}

const banned =
  /\b(unlock|unleash|elevate|seamless(ly)?|effortless(ly)?|journey|embark|delve|vibrant|bustling|curated|robust|cutting-edge|world-class|immersive|iconic|boasts|ensure[sd]?|crucial|essential|vital)\b/i;

/**
 * Why a rewrite can't be shown, or null when it can: one plain sentence of 90 characters or
 * fewer, no em dashes or exclamation marks, no hype words, and no number the city didn't write.
 */
export function checkRewrite(sentence: string, source: string): string | null {
  const s = sentence.trim();
  if (s.length === 0) return "empty";
  if (s.length > violationMaxLength) return `${s.length} characters, over ${violationMaxLength}`;
  if (!/[.]$/.test(s)) return "doesn't end with a period";
  if (/[.!?]\s+[A-Z0-9]/.test(s.slice(0, -1))) return "more than one sentence";
  if (/[—!]|\s–\s/.test(s)) return "has a dash between clauses or an exclamation mark";
  const word = banned.exec(s);
  if (word) return `uses "${word[0]}"`;
  const missing = (s.match(/\d+/g) ?? []).find((n) => !source.includes(n));
  if (missing !== undefined) return `the number ${missing} isn't in the city's words`;
  return null;
}

/** The words to show for a violation: the checked rewrite, or the city's own. */
export function violationWords(text: string, file: ViolationsFile): string {
  return file.rewrites[text] ?? cityWords(text);
}
