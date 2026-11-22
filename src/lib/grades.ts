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

// The city numbers chain counters and food-hall stalls at the end of a name: "CinnabonNo.  106694",
// "Starbucks Coffee No.  822", "Hangover B&B  SpaceNo. 13", "Baby Cafe - Space No. 8",
// "Chick-Fil-A (StoreNo. 80845)".
const counterSuffix = /\(?\s*(?:space|stall|store)?\s*no\.\s*\d+[a-z]?\s*\)?\s*$/;

/** DATA 3.7: lowercase, no accents, no counter number, "&" becomes "and", no punctuation, no company suffixes. */
export function normalizeName(name: string): string {
  const words = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(counterSuffix, "")
    .replaceAll("&", " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  while (words.length > 1 && nameSuffixes.has(words[words.length - 1])) words.pop();
  return words.join(" ");
}

// Words that say what a place is, or where, rather than which place it is. Compass words stay
// distinctive: "Stetson East" and "Stetson West" are different dining halls.
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
  ...["downtown", "broadway", "tremont", "washington"],
  ...["central", "porter", "davis", "kendall", "union", "seaport", "chinatown"],
]);

/** The words that name this place in particular, singular, four letters or more. */
export function distinctiveWords(name: string): string[] {
  return normalizeName(name)
    .split(" ")
    .filter((word) => !genericWords.has(word))
    .map((word) => (word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word))
    .filter((word) => word.length >= 4 && !genericWords.has(word));
}

/** The name without its generic words, for comparing spellings; the whole name if none are left. */
function core(name: string): string {
  const words = distinctiveWords(name);
  return words.length > 0 ? words.join(" ") : normalizeName(name);
}

/** How alike two names are once generic words are set aside, from 0 to 1. Ranks candidates. */
export function nameSimilarity(a: string, b: string): number {
  return jaroWinkler(core(a), core(b));
}

const wordLengthGap = 2;
const fuzzyMinLength = 8;
const wordSimilarity = 0.9;

/**
 * One word spelled alike: the same, or a typo apart (both 8 letters or more, at most 2 letters
 * apart in length, Jaro-Winkler at least 0.9): "hokkaido" and "hokkaldo". Shorter words must be
 * equal, since a shared prefix lifts short pairs past 0.9 ("mario" and "maria", "tasty" and
 * "taste").
 */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  return (
    Math.min(a.length, b.length) >= fuzzyMinLength &&
    Math.abs(a.length - b.length) <= wordLengthGap &&
    jaroWinkler(a, b) >= wordSimilarity
  );
}

/**
 * Whether two names plausibly belong to one business (DATA 3.7), any of:
 * - the same once spaces are set aside ("Gong Cha" and "Gongcha");
 * - one name's words all in the other, whose extra words are generic ("Thai Place" and "Thai
 *   Place Restaurant");
 * - every distinctive word of the name with fewer of them spelled alike by a word of the other.
 */
export function sameBusiness(a: string, b: string): boolean {
  const [plainA, plainB] = [normalizeName(a), normalizeName(b)];
  if (plainA.replaceAll(" ", "") === plainB.replaceAll(" ", "")) return true;
  const [shorter, longer] = [plainA.split(" "), plainB.split(" ")].sort(
    (x, y) => x.length - y.length,
  );
  if (
    shorter.every((word) => longer.includes(word)) &&
    longer.every((word) => shorter.includes(word) || genericWords.has(word))
  ) {
    return true;
  }
  const [fewer, more] = [distinctiveWords(a), distinctiveWords(b)].sort(
    (x, y) => x.length - y.length,
  );
  return fewer.length > 0 && fewer.every((word) => more.some((other) => sameWord(word, other)));
}

// Every spelling of a street suffix, on either side, maps to one form. The city writes BL, HW,
// PW, PZ, WY, WH and PK; OpenStreetMap writes the full words.
const streetSuffixes: Record<string, string> = {
  street: "st",
  avenue: "ave",
  av: "ave",
  road: "rd",
  boulevard: "blvd",
  bl: "blvd",
  place: "pl",
  square: "sq",
  drive: "dr",
  lane: "ln",
  terrace: "ter",
  te: "ter",
  highway: "hwy",
  hw: "hwy",
  parkway: "pkwy",
  pw: "pkwy",
  plaza: "plz",
  pz: "plz",
  way: "wy",
  wharf: "wh",
  whf: "wh",
  park: "pk",
  court: "ct",
  circle: "cir",
};

const directions: Record<string, string> = { north: "n", south: "s", east: "e", west: "w" };

/**
 * A street name in one spelling: lowercase, no punctuation, a leading direction and the last
 * word's suffix abbreviated ("West Broadway" and "W BROADWAY").
 */
export function normalizeStreet(street: string): string {
  const words = street
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const last = words.length - 1;
  if (last > 0 && words[0] in directions) words[0] = directions[words[0]];
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

const nearbyM = 50;
const addressMaxM = 2000;

/**
 * DATA 3.7: an establishment at the same house number and street with the same business name,
 * else one within 50 m with the same business name. An address match must be within 2 km: the
 * city's geocodes can be off by a kilometer, and the same address in Cambridge, Somerville or
 * Brookline is farther away. The most similar name wins; a tie between two licenses is no match.
 * Null means no inspection match (F11.4).
 */
export function matchEstablishment<T extends Establishment>(
  place: MatchTarget,
  byAddress: ReadonlyMap<string, T[]>,
  nearby: readonly T[],
): T | null {
  const best = (candidates: readonly T[]) => {
    let found: { establishment: T; score: number; tied: boolean } | null = null;
    for (const establishment of candidates) {
      if (!sameBusiness(place.name, establishment.name)) continue;
      const score = nameSimilarity(place.name, establishment.name);
      if (!found || score > found.score) found = { establishment, score, tied: false };
      else if (score === found.score && establishment.license !== found.establishment.license) {
        found.tied = true;
      }
    }
    return found && !found.tied ? found.establishment : null;
  };
  const key = place.address ? addressKey(place.address) : null;
  if (key !== null) {
    const atAddress = (byAddress.get(key) ?? []).filter(
      (e) => e.at === null || haversineM(e.at, place.at) <= addressMaxM,
    );
    const match = best(atAddress);
    if (match) return match;
  }
  const close = nearby.filter((e) => e.at !== null && haversineM(e.at, place.at) <= nearbyM);
  return best(close);
}

export function addressKey(address: { number: string; street: string }): string {
  return `${address.number.toLowerCase()} ${normalizeStreet(address.street)}`;
}
