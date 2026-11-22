import { adultCategories, gradedCategories, type Place } from "@/lib/places/types";

// Find it and taste of home (F14): Gemini names places with a review quote, and only the ones that
// match a spot in `data/places.json` are shown, so the age, grade and budget rules can be checked
// against our own data (F14.3) and every claim carries its quote (F14.2).

export type Grounded = { name: string; quote: string };

// Words every search shares, which would pick a line that says nothing about the dish.
const genericWords = new Set(["food", "restaurant", "restaurants", "cafe", "place"]);

/** A Maps grounding chunk: the place's title and the text Google returns about it. */
export type MapsChunk = { title: string; text?: string };

/** The bullet lines under "Generated Summary" in a Maps chunk's text: Google's review summary. */
export function reviewSummary(text: string): string[] {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.includes("**Generated Summary:**"));
  if (start < 0) return [];
  const out: string[] = [];
  let indent: number | null = null;
  for (const line of lines.slice(start + 1)) {
    const match = line.match(/^(\s*)\*\s+(.+?)\s*$/);
    // The summary ends at the next bullet that is less indented than its own lines.
    if (!match || (indent !== null && match[1].length < indent)) break;
    if (indent === null) {
      if (match[1].length === 0) break;
      indent = match[1].length;
    }
    out.push(match[2]);
  }
  return out;
}

/**
 * Each grounded place with one line of Google's review summary, word for word: the first line
 * that mentions a word of the search, else the first line (F14.2). Places without a summary are
 * left out, so every shown claim comes from Maps, not from the model's own words.
 */
export function groundedQuotes(chunks: readonly MapsChunk[], search: string): Grounded[] {
  const words = nameKey(search)
    .split(" ")
    .filter((w) => w.length >= 4 && !genericWords.has(w));
  return chunks.flatMap((chunk) => {
    const lines = reviewSummary(chunk.text ?? "");
    if (lines.length === 0) return [];
    const quote = lines.find((line) => words.some((w) => nameKey(line).includes(w))) ?? lines[0];
    return [{ name: chunk.title.replace(/\s+-\s+Google Maps$/, ""), quote }];
  });
}

/** Lowercase letters and digits only, without a leading "the", for comparing names. */
export function nameKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^the /, "")
    .trim();
}

export type FindFilters = {
  under21: boolean;
  minGrade: "A" | "B" | null;
  budget: 1 | 2 | 3 | null;
};

const gradeRank = { A: 3, B: 2, C: 1 } as const;

/** Whether a place passes the age, grade and budget rules (F14.3, F1.5, F11.5). */
export function passes(place: Place, filters: FindFilters): boolean {
  if (filters.under21 && (place.ageRule === "21plus" || adultCategories.includes(place.category)))
    return false;
  if (filters.minGrade && gradedCategories.includes(place.category)) {
    if (!place.grade || gradeRank[place.grade.letter] < gradeRank[filters.minGrade]) return false;
  }
  if (filters.budget && place.price && place.price > filters.budget) return false;
  return true;
}

/** Grounded names matched to known places near a station, in the model's order, at most `limit`. */
export function matchPlaces(
  found: readonly Grounded[],
  places: readonly Place[],
  filters: FindFilters,
  limit = 3,
): { place: Place; quote: string }[] {
  const byKey = new Map<string, Place>();
  for (const place of places) {
    if (place.stations.length > 0 && !byKey.has(nameKey(place.name))) {
      byKey.set(nameKey(place.name), place);
    }
  }
  const out: { place: Place; quote: string }[] = [];
  const used = new Set<string>();
  for (const entry of found) {
    const place = byKey.get(nameKey(entry.name));
    if (!place || used.has(place.id) || !passes(place, filters)) continue;
    used.add(place.id);
    out.push({ place, quote: entry.quote });
    if (out.length === limit) break;
  }
  return out;
}
