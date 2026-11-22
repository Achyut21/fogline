import { adultCategories, gradedCategories, type Place } from "@/lib/places/types";

// Find it and taste of home (F14): Gemini names places with a review quote, and only the ones that
// match a spot in `data/places.json` are shown, so the age, grade and budget rules can be checked
// against our own data (F14.3) and every claim carries its quote (F14.2).

export type Grounded = { name: string; quote: string };

/** Lines like `Name | "quote"` from the model. Lines without both parts are dropped. */
export function parseGrounded(text: string): Grounded[] {
  return text.split("\n").flatMap((line) => {
    const [rawName, ...rest] = line.split("|");
    const name = rawName?.replace(/^[\s*\-\d.)]+/, "").trim() ?? "";
    const quote = rest
      .join("|")
      .trim()
      .replace(/^["“]|["”]$/g, "")
      .trim();
    return name.length > 1 && quote.length > 3 ? [{ name, quote }] : [];
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
