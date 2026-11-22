import { log } from "@/lib/log";
import { addressKey, matchEstablishment } from "@/lib/grades";
import { adultCategories, gradedCategories, type Grade } from "@/lib/places/types";
import { fetchInspections, gradeOf, type InspectedEstablishment } from "./grades/inspections";
import { readPlaces, writePlaces } from "./places/file";

// pnpm data:grades: grades from Analyze Boston inspections (DATA 3.6), matched to the spots in
// data/places.json (DATA 3.7). Run data:places first.

const inspected = [...gradedCategories, ...adultCategories];
const establishments = await fetchInspections();
const byAddress = new Map<string, InspectedEstablishment[]>();
for (const e of establishments) {
  if (!e.address) continue;
  const key = addressKey(e.address);
  byAddress.set(key, [...(byAddress.get(key) ?? []), e]);
}
const located = establishments.filter((e) => e.at !== null);

const places = await readPlaces();
const graded = places.map((place) => {
  if (!inspected.includes(place.category)) return { ...place, grade: null };
  const target = { name: place.name, address: place.address, at: place };
  const match = matchEstablishment(target, byAddress, located);
  return { ...place, grade: match ? gradeOf(match) : null };
});
await writePlaces(graded);

const count = (letters: (Grade | undefined)[]) => ({
  A: letters.filter((l) => l === "A").length,
  B: letters.filter((l) => l === "B").length,
  C: letters.filter((l) => l === "C").length,
});
const citywide = count(establishments.map((e) => gradeOf(e).letter));
const matched = count(graded.map((p) => p.grade?.letter));
log.info("data:grades wrote grades into data/places.json", {
  establishments: establishments.length,
  citywideA: citywide.A,
  citywideB: citywide.B,
  citywideC: citywide.C,
  inspectedPlaces: graded.filter((p) => inspected.includes(p.category)).length,
  matched: matched.A + matched.B + matched.C,
  matchedA: matched.A,
  matchedB: matched.B,
  matchedC: matched.C,
});
