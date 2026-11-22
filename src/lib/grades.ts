import { haversineM, type LatLon } from "@/lib/geo/distance";
import type { Grade } from "@/lib/places/types";

export type ViolationLevel = "*" | "**" | "***";

/** DATA 3.6: points per violation level, and NYC's cutoffs. */
const levelPoints: Record<ViolationLevel, number> = { "*": 2, "**": 5, "***": 10 };

export function inspectionPoints(levels: readonly ViolationLevel[]): number {
  return levels.reduce((sum, level) => sum + levelPoints[level], 0);
}

export function gradeFor(points: number): Grade {
  if (points <= 13) return "A";
  if (points <= 27) return "B";
  return "C";
}

const nameSuffixes = new Set(["inc", "llc", "corp", "corporation", "co", "ltd", "company"]);

/** DATA 3.7: lowercase, no accents, "&" becomes "and", no punctuation, no company suffixes. */
export function normalizeName(name: string): string {
  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replaceAll("&", " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  while (words.length > 1 && nameSuffixes.has(words[words.length - 1])) words.pop();
  return words.join(" ");
}

// Words that say what a place is, or where, rather than which place it is.
const genericWords = new Set([
  ...["and", "the", "of", "at", "cafe", "caffe", "coffee", "restaurant", "ristorante", "grill"],
  ...["kitchen", "bar", "pub", "house", "pizza", "pizzeria", "sushi", "thai", "food"],
  ...["market", "deli", "bakery", "tavern", "express", "bistro", "diner", "taqueria"],
  ...["burger", "cuisine", "tea", "shop", "eatery", "place", "room", "lounge", "club"],
  ...["hall", "dining", "center", "bbq", "chinese", "japanese", "mexican", "italian"],
  ...["indian", "korean", "noodle", "wine", "beer", "brewery", "cafeteria", "steakhouse"],
  ...["hotel", "street", "square", "avenue", "park", "common"],
  ...["boston", "cambridge", "somerville", "brookline", "medford", "quincy", "newton"],
  ...["newbury", "boylston", "beacon", "hill", "harvard", "kenmore", "fenway", "brighton"],
  ...["allston", "dorchester", "charlestown", "roxbury", "jamaica", "plain", "back"],
  ...["south", "north", "east", "west", "downtown", "broadway", "tremont", "washington"],
  ...["central", "porter", "davis", "kendall", "union", "seaport", "chinatown"],
]);

/** The words that name this place in particular, singular, four letters or more. */
export function distinctiveWords(name: string): string[] {
  return normalizeName(name)
    .split(" ")
    .map((word) => (word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word))
    .filter((word) => word.length >= 4 && !genericWords.has(word));
}

/** The name without its generic words, for comparing spellings; the whole name if none are left. */
function core(name: string): string {
  const words = distinctiveWords(name);
  return words.length > 0 ? words.join(" ") : normalizeName(name);
}

/** How alike two names are once generic words are set aside, from 0 to 1. */
export function nameSimilarity(a: string, b: string): number {
  return jaroWinkler(core(a), core(b));
}

/**
 * Whether two names plausibly belong to one business: their distinctive words spelled alike
 * (Jaro-Winkler at least `minimum`), or every distinctive word of one name appearing in the other.
 */
export function sameBusiness(a: string, b: string, minimum: number): boolean {
  if (nameSimilarity(a, b) >= minimum) return true;
  const [fewer, more] = [new Set(distinctiveWords(a)), new Set(distinctiveWords(b))].sort(
    (x, y) => x.size - y.size,
  );
  return fewer.size > 0 && [...fewer].every((word) => more.has(word));
}

const streetSuffixes: Record<string, string> = {
  street: "st",
  avenue: "ave",
  av: "ave",
  road: "rd",
  boulevard: "blvd",
  place: "pl",
  square: "sq",
  drive: "dr",
  lane: "ln",
  terrace: "ter",
  highway: "hwy",
  parkway: "pkwy",
};

/** A street name in one spelling: lowercase, no punctuation, the last word's suffix abbreviated. */
export function normalizeStreet(street: string): string {
  const words = street
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const last = words.length - 1;
  if (last > 0 && words[last] in streetSuffixes) words[last] = streetSuffixes[words[last]];
  return words.join(" ");
}

/** Jaro-Winkler similarity from 0 to 1, with the standard 0.1 prefix weight over 4 characters. */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatched = new Array<boolean>(a.length).fill(false);
  const bMatched = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - window); j < Math.min(b.length, i + window + 1); j++) {
      if (!bMatched[j] && a[i] === b[j]) {
        aMatched[i] = true;
        bMatched[j] = true;
        matches++;
        break;
      }
    }
  }
  if (matches === 0) return 0;
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  const jaro =
    (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < 4 && prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

export type Establishment = {
  license: string;
  name: string;
  /** House number and normalized street, when the record has both. */
  address: { number: string; street: string } | null;
  at: LatLon | null;
};

export type MatchTarget = {
  name: string;
  address: { number: string; street: string } | null;
  at: LatLon;
};

const addressSimilarity = 0.85;
const nearbySimilarity = 0.8;
const nearbyM = 50;

/**
 * DATA 3.7: an establishment at the same house number and street with the same business name
 * (spelling at least 0.85 similar, or the distinctive words agreeing), else one within 50 m
 * (spelling at least 0.8 similar, or the distinctive words agreeing), most similar first.
 * Null means no inspection match (F11.4).
 */
export function matchEstablishment<T extends Establishment>(
  place: MatchTarget,
  byAddress: ReadonlyMap<string, T[]>,
  nearby: readonly T[],
): T | null {
  const best = (candidates: readonly T[], minimum: number) => {
    let found: { establishment: T; score: number } | null = null;
    for (const establishment of candidates) {
      if (!sameBusiness(place.name, establishment.name, minimum)) continue;
      const score = nameSimilarity(place.name, establishment.name);
      if (!found || score > found.score) found = { establishment, score };
    }
    return found?.establishment ?? null;
  };
  if (place.address) {
    const match = best(byAddress.get(addressKey(place.address)) ?? [], addressSimilarity);
    if (match) return match;
  }
  const close = nearby.filter((e) => e.at !== null && haversineM(e.at, place.at) <= nearbyM);
  return best(close, nearbySimilarity);
}

export function addressKey(address: { number: string; street: string }): string {
  return `${address.number.toLowerCase()} ${normalizeStreet(address.street)}`;
}
